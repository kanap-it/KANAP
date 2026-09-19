import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ScheduledTasksService } from '../admin/scheduled-tasks/scheduled-tasks.service';
import { Subscription } from '../billing/subscription.entity';
import { StripeConfigService } from '../billing/stripe/stripe.config';
import { evaluateSubscriptionAccess } from '../billing/subscription-freeze.util';
import { withTenantExecution } from '../common/tenant-runner';
import { NetboxConfigService } from './netbox-config.service';
import { NetboxSyncService } from './netbox-sync.service';

export const NETBOX_INVENTORY_SYNC_TASK_NAME = 'netbox-inventory-sync';

export type NetboxScheduledRunSummary = {
  tenantsProcessed: number;
  tenantsSkipped: number;
  errors: string[];
};

/**
 * Hourly sweep for the tenants that turned automatic synchronisation on. It
 * shares the per-tenant advisory lock with the manual run, so a scheduled tick
 * during a manual run simply does nothing for that tenant.
 */
@Injectable()
export class NetboxScheduledSyncService implements OnModuleInit {
  private readonly logger = new Logger(NetboxScheduledSyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly scheduledTasks: ScheduledTasksService,
    private readonly config: NetboxConfigService,
    private readonly sync: NetboxSyncService,
    @Optional() private readonly stripeConfig?: StripeConfigService,
  ) {}

  onModuleInit() {
    this.scheduledTasks.register({
      name: NETBOX_INVENTORY_SYNC_TASK_NAME,
      description: 'Keeps assets in step with the connected Netbox inventory',
      defaultCron: '0 * * * *',
      handler: () => this.run(),
    });
  }

  async run(): Promise<NetboxScheduledRunSummary> {
    const summary: NetboxScheduledRunSummary = { tenantsProcessed: 0, tenantsSkipped: 0, errors: [] };
    const tenants: Array<{ id: string }> = await this.dataSource.query('SELECT id FROM tenants ORDER BY id ASC');

    for (const tenant of tenants) {
      try {
        // Row lookups need the tenant context: the adapter configs and the
        // subscription are both behind row-level security.
        const eligible = await withTenantExecution(
          this.dataSource,
          tenant.id,
          (manager) => this.eligibility(manager, tenant.id),
          { transaction: false },
        );
        if (!eligible.ok) {
          summary.tenantsSkipped += 1;
          continue;
        }
        const result = await this.sync.runInBackground(tenant.id, 'scheduled');
        if (result.status === 'skipped') {
          summary.tenantsSkipped += 1;
        } else {
          summary.tenantsProcessed += 1;
        }
        if (result.error) {
          summary.errors.push(`Tenant ${tenant.id}: ${result.error}`);
        }
      } catch (error: any) {
        summary.errors.push(`Tenant ${tenant.id}: ${error?.message || String(error)}`);
      }
    }

    this.logger.log(
      `[${NETBOX_INVENTORY_SYNC_TASK_NAME}] Done: ${summary.tenantsProcessed} tenants synchronised, ${summary.tenantsSkipped} skipped`,
    );
    return summary;
  }

  private async eligibility(manager: EntityManager, tenantId: string): Promise<{ ok: boolean }> {
    const config = await this.config.getConfig(manager, tenantId);
    const view = this.config.toView(config);
    if (!view.configured || !view.enabled || !view.auto_sync) {
      return { ok: false };
    }
    // Never the first import: hundreds of assets created or overwritten with
    // nobody having read the preview is what the manual run exists to avoid.
    if (!view.manual_sync_done) {
      return { ok: false };
    }
    if (await this.subscriptionSkipReason(manager, tenantId)) {
      return { ok: false };
    }
    return { ok: true };
  }

  /**
   * Frozen (non-payment) or trial-expired tenants get no background runs. A
   * no-op when billing is not configured, which is every on-premise install.
   */
  private async subscriptionSkipReason(manager: EntityManager, tenantId: string): Promise<string | null> {
    if (!this.stripeConfig?.isConfigured()) return null;
    const subscription = await manager
      .getRepository(Subscription)
      .findOne({ where: { tenant_id: tenantId }, order: { created_at: 'DESC' } });
    const decision = evaluateSubscriptionAccess(subscription, Date.now(), true);
    if (decision.allowed) return null;
    return decision.reason === 'TRIAL_EXPIRED'
      ? 'Subscription trial expired; automatic synchronisation is paused until a plan is chosen.'
      : 'Subscription frozen for non-payment; automatic synchronisation is paused until it is resolved.';
  }
}
