import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { EntraAuthService } from './entra-auth.service';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/tenant.entity';
import { ScheduledTasksService } from '../admin/scheduled-tasks/scheduled-tasks.service';
import { Features } from '../config/features';
import { withTenant } from '../common/tenant-runner';
import { User } from '../users/user.entity';
import { Company } from '../companies/company.entity';
import { Department } from '../departments/department.entity';
import {
  DirectoryProfile,
  decideDirectoryAction,
  mergeScalarFields,
  resolveDirectoryNames,
} from './entra-directory-sync.util';

export const ENTRA_DIRECTORY_SYNC_TASK = 'entra-directory-sync';

/** Graph `$filter=id in (...)` stays well below URL/operator limits at this size. */
const GRAPH_ID_BATCH = 15;

export type DirectorySyncStatus = 'ok' | 'consent_required' | 'error';

export type TenantSyncResult = {
  status: DirectorySyncStatus;
  message?: string | null;
  synced: number;
  disabled: number;
  removed: number;
};

/**
 * Daily Microsoft Entra directory sync.
 *
 * Runs with application permissions (client credentials), so it only works for
 * tenants whose Entra admin granted consent; others are reported as
 * `consent_required` and keep login-time enrichment only. Both deployment
 * modes: no-op without ENTRA_* env config, per-tenant under RLS otherwise.
 */
@Injectable()
export class EntraDirectorySyncService implements OnModuleInit {
  private readonly logger = new Logger(EntraDirectorySyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly entra: EntraAuthService,
    private readonly users: UsersService,
    private readonly tenants: TenantsService,
    private readonly scheduledTasks: ScheduledTasksService,
  ) {}

  onModuleInit() {
    this.scheduledTasks.register({
      name: ENTRA_DIRECTORY_SYNC_TASK,
      description:
        'Refreshes Microsoft Entra user attributes and disables accounts removed or deactivated in the directory (tenants with Entra SSO and admin consent only)',
      defaultCron: '0 3 * * *',
      handler: () => this.runAll(),
    });
  }

  async runAll(): Promise<Record<string, any>> {
    if (!Features.ENTRA_SSO) return { skipped: 'entra_not_configured', tenantsProcessed: 0 };

    const tenants: Array<{ id: string; slug: string }> = await this.dataSource.query(
      `SELECT id, slug FROM tenants
       WHERE status = 'active' AND sso_provider = 'entra' AND sso_enabled = true AND entra_tenant_id IS NOT NULL`,
    );

    const summary = {
      tenantsProcessed: 0,
      synced: 0,
      disabled: 0,
      removed: 0,
      consentRequired: 0,
      errors: [] as string[],
    };
    for (const tenant of tenants) {
      try {
        const result = await this.syncTenant(tenant.id);
        summary.tenantsProcessed++;
        summary.synced += result.synced;
        summary.disabled += result.disabled;
        summary.removed += result.removed;
        if (result.status === 'consent_required') summary.consentRequired++;
        else if (result.status === 'error') summary.errors.push(`${tenant.slug}: ${result.message}`);
      } catch (err: any) {
        summary.errors.push(`${tenant.slug}: ${err?.message || err}`);
        this.logger.warn(`[${ENTRA_DIRECTORY_SYNC_TASK}] tenant ${tenant.slug} failed: ${err?.message || err}`);
      }
    }
    return summary;
  }

  async syncTenant(tenantId: string): Promise<TenantSyncResult> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant || tenant.sso_provider !== 'entra' || !tenant.entra_tenant_id) {
      return { status: 'error', message: 'SSO_NOT_CONFIGURED', synced: 0, disabled: 0, removed: 0 };
    }

    const result: TenantSyncResult = { status: 'ok', message: null, synced: 0, disabled: 0, removed: 0 };

    let token: string;
    try {
      token = await this.entra.acquireAppToken(tenant.entra_tenant_id);
      // A token is issued even without admin consent; only Graph tells the truth.
      // Probe once so tenants with no linked users still report consent_required.
      await this.entra.probeDirectoryAccess(token);
    } catch (err: any) {
      // Never keep a token that Graph refused: the next run must re-acquire.
      this.entra.invalidateAppToken(tenant.entra_tenant_id);
      result.status = this.entra.isConsentError(err) ? 'consent_required' : 'error';
      result.message = err?.message || String(err);
      await this.recordStatus(tenant, result);
      return result;
    }

    try {
      await withTenant(this.dataSource, tenantId, async (manager) => {
        const repo = manager.getRepository(User);
        const users = (
          await repo.find({
            where: { external_auth_provider: 'entra', status: In(['enabled', 'invited', 'contact']) } as any,
          })
        ).filter((u) => !!u.external_subject);

        for (let i = 0; i < users.length; i += GRAPH_ID_BATCH) {
          const chunk = users.slice(i, i + GRAPH_ID_BATCH);
          const profiles = await this.entra.fetchDirectoryUsers(
            token,
            chunk.map((u) => u.external_subject as string),
          );
          const byId = new Map(profiles.filter((p) => p.id).map((p) => [p.id as string, p]));

          for (const user of chunk) {
            const profile = byId.get(user.external_subject as string);
            const action = decideDirectoryAction(profile);
            if (action !== 'sync') {
              const reason = action === 'disable_removed' ? 'removed' : 'deactivated';
              await this.users.disableUser(user.id, null, { manager, sourceRef: `entra-sync:${reason}` });
              if (action === 'disable_removed') result.removed++;
              else result.disabled++;
              continue;
            }
            await this.applyDirectoryProfile(user, profile as DirectoryProfile, manager);
            await repo.save(user);
            result.synced++;
          }
        }
      });
    } catch (err: any) {
      this.entra.invalidateAppToken(tenant.entra_tenant_id);
      result.status = this.entra.isConsentError(err) ? 'consent_required' : 'error';
      result.message = err?.message || String(err);
    }

    await this.recordStatus(tenant, result);
    return result;
  }

  /**
   * Write directory-owned fields onto a user: names/title/phones (non-empty
   * wins, empty never clears), department and company matched by name against
   * existing KANAP records (never auto-created), locale only if unset, and the
   * external_synced_at stamp. Shared by the login path and the scheduled sync.
   * Caller saves the entity.
   */
  async applyDirectoryProfile(
    user: User,
    profile: DirectoryProfile,
    manager: EntityManager,
    claims?: { given_name?: string; family_name?: string; name?: string } | null,
  ): Promise<void> {
    mergeScalarFields(user, profile, resolveDirectoryNames(profile, claims));

    const companyName = (profile.companyName ?? '').trim();
    if (companyName) {
      const company = await manager
        .getRepository(Company)
        .createQueryBuilder('c')
        .where('LOWER(c.name) = LOWER(:name)', { name: companyName })
        .getOne();
      if (company) user.company_id = company.id;
    }

    const departmentName = (profile.department ?? '').trim();
    if (departmentName) {
      const candidates = await manager
        .getRepository(Department)
        .createQueryBuilder('d')
        .where('LOWER(d.name) = LOWER(:name)', { name: departmentName })
        .getMany();
      const match =
        candidates.find((d) => !!user.company_id && (d as any).company_id === user.company_id) ?? candidates[0];
      if (match) user.department_id = match.id;
    }

    user.external_synced_at = new Date();
  }

  private async recordStatus(tenant: Tenant, result: TenantSyncResult): Promise<void> {
    const previous = ((tenant.entra_metadata as any)?.directory_sync ?? {}) as Record<string, any>;
    const now = new Date().toISOString();
    const directory_sync = {
      status: result.status,
      message: result.message ?? null,
      last_attempt_at: now,
      last_success_at: result.status === 'ok' ? now : previous.last_success_at ?? null,
      ...(result.status === 'ok'
        ? { synced: result.synced, disabled: result.disabled, removed: result.removed }
        : {}),
    };
    try {
      await this.tenants.updateTenant(tenant.id, {
        entra_metadata: { ...((tenant.entra_metadata as any) ?? {}), directory_sync } as any,
      });
    } catch (err: any) {
      this.logger.warn(`[${ENTRA_DIRECTORY_SYNC_TASK}] could not record status for tenant ${tenant.id}: ${err?.message || err}`);
    }
  }
}
