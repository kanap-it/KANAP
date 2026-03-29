import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ScheduledTasksService } from '../admin/scheduled-tasks/scheduled-tasks.service';
import { withTenantExecution } from '../common/tenant-runner';
import { AiMutationPreviewService } from '../ai/ai-mutation-preview.service';

export type AiMutationPreviewExpirationSummary = {
  tenantsProcessed: number;
  previewsExpired: number;
  errors: string[];
};

@Injectable()
export class AiMutationPreviewExpirationService implements OnModuleInit {
  private readonly logger = new Logger(AiMutationPreviewExpirationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly scheduledTasks: ScheduledTasksService,
    private readonly previews: AiMutationPreviewService,
  ) {}

  onModuleInit() {
    this.scheduledTasks.register({
      name: 'ai-mutation-preview-expiration',
      description: 'Expires stale AI mutation previews that were not approved in time',
      defaultCron: '*/5 * * * *',
      handler: () => this.run(),
    });
  }

  async run(opts?: { manager?: EntityManager }): Promise<AiMutationPreviewExpirationSummary> {
    const summary: AiMutationPreviewExpirationSummary = {
      tenantsProcessed: 0,
      previewsExpired: 0,
      errors: [],
    };

    const tenants: Array<{ id: string }> = opts?.manager
      ? await opts.manager.query(
        `
        SELECT id
        FROM tenants
        ORDER BY id ASC
        `,
      )
      : await this.dataSource.query(
        `
        SELECT id
        FROM tenants
        ORDER BY id ASC
        `,
      );

    for (const tenant of tenants) {
      try {
        const expired = opts?.manager
          ? await this.runForTenant(opts.manager, tenant.id)
          : await withTenantExecution(this.dataSource, tenant.id, async (tenantManager) => {
            return this.runForTenant(tenantManager, tenant.id);
          });
        summary.tenantsProcessed += 1;
        summary.previewsExpired += expired;
      } catch (error: any) {
        summary.errors.push(`Tenant ${tenant.id}: ${error?.message || String(error)}`);
      }
    }

    this.logger.log(
      `[ai-mutation-preview-expiration] Done: ${summary.tenantsProcessed} tenants, ${summary.previewsExpired} previews expired`,
    );

    return summary;
  }

  private async runForTenant(manager: EntityManager, tenantId: string): Promise<number> {
    await manager.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
    return this.previews.expireStalePreviews(manager, tenantId);
  }
}
