import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { ScheduledTasksService } from '../../../admin/scheduled-tasks/scheduled-tasks.service';
import { withTenantExecution } from '../../../common/tenant-runner';
import { AiExecutionContextWithManager } from '../../ai.types';
import { AiActionRequestService } from '../action-request/ai-action-request.service';
import { AiActionRequest } from '../entities/ai-action-request.entity';
import { AiAgentWorkQueueService } from './ai-agent-work-queue.service';

export type AgentApprovalLifecycleSweepSummary = {
  tenantId: string;
  expiredActions: number;
  claimsScanned: number;
  claimsReleased: number;
  claimActionsExpired: number;
  errors: string[];
};

function expiredAt(value: unknown, now: Date): boolean {
  if (!value) {
    return false;
  }
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(time) && time <= now.getTime();
}

function actionAgentDefinitionId(action: AiActionRequest): string | null {
  const metadata = action.metadata_json;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).agent_definition_id;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

@Injectable()
export class AiAgentApprovalLifecycleSweeperService implements OnModuleInit {
  private readonly logger = new Logger(AiAgentApprovalLifecycleSweeperService.name);

  constructor(
    @Optional() private readonly dataSource: DataSource | null,
    @Optional() private readonly scheduledTasks: ScheduledTasksService | null,
    private readonly queue: AiAgentWorkQueueService,
    private readonly actions: AiActionRequestService,
  ) {}

  onModuleInit() {
    if (!this.scheduledTasks) {
      return;
    }
    this.scheduledTasks.register({
      name: 'ai-agent-approval-lifecycle-sweeper',
      description: 'Expires lapsed agent proposals and reconciles service-desk target claims',
      defaultCron: '*/10 * * * *',
      handler: () => this.run(),
    });
  }

  async run(opts: { manager?: EntityManager; limit?: number; now?: Date } = {}) {
    const summary = {
      tenantsProcessed: 0,
      expiredActions: 0,
      claimsReleased: 0,
      errors: [] as string[],
    };
    if (!this.dataSource && !opts.manager) {
      summary.errors.push('No data source is available for lifecycle sweeping.');
      return summary;
    }
    const tenants: Array<{ id: string }> = opts.manager
      ? await opts.manager.query('SELECT id FROM tenants ORDER BY id ASC')
      : await this.dataSource!.query('SELECT id FROM tenants ORDER BY id ASC');
    for (const tenant of tenants) {
      try {
        const result = opts.manager
          ? await this.sweepTenant({
            tenantId: tenant.id,
            userId: '',
            isPlatformHost: false,
            surface: 'chat',
            authMethod: 'jwt',
            manager: opts.manager,
          } as AiExecutionContextWithManager, { limit: opts.limit, now: opts.now })
          : await withTenantExecution(this.dataSource!, tenant.id, (manager) =>
            this.sweepTenant({
              tenantId: tenant.id,
              userId: '',
              isPlatformHost: false,
              surface: 'chat',
              authMethod: 'jwt',
              manager,
            } as AiExecutionContextWithManager, { limit: opts.limit, now: opts.now }),
          );
        summary.tenantsProcessed += 1;
        summary.expiredActions += result.expiredActions;
        summary.claimsReleased += result.claimsReleased;
        summary.errors.push(...result.errors.map((entry) => `Tenant ${tenant.id}: ${entry}`));
      } catch (error) {
        summary.errors.push(`Tenant ${tenant.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.logger.log(
      `[ai-agent-approval-lifecycle-sweeper] Done: ${summary.tenantsProcessed} tenants, ${summary.expiredActions} expired, ${summary.claimsReleased} claims released`,
    );
    return summary;
  }

  async sweepTenant(
    context: AiExecutionContextWithManager,
    opts: { limit?: number; now?: Date } = {},
  ): Promise<AgentApprovalLifecycleSweepSummary> {
    const now = opts.now ?? new Date();
    const limit = Math.max(1, Math.min(Math.floor(opts.limit ?? 100), 500));
    const summary: AgentApprovalLifecycleSweepSummary = {
      tenantId: context.tenantId,
      expiredActions: 0,
      claimsScanned: 0,
      claimsReleased: 0,
      claimActionsExpired: 0,
      errors: [],
    };
    const tenantPause = await this.queue.hasActiveEmergencyPause(context, null);
    if (tenantPause) {
      return summary;
    }
    const actionRepo = context.manager.getRepository(AiActionRequest);
    const reviewable = await actionRepo.find({
      where: {
        tenant_id: context.tenantId,
        status: In(['pending', 'approved']),
      },
      order: { expires_at: 'ASC' },
      take: limit,
    });
    const expiredCandidates = reviewable.filter((candidate) => expiredAt(candidate.expires_at, now));
    const blockedAgentDefinitionIds = await this.queue.lifecycleBlockedAgentDefinitionIds(
      context,
      expiredCandidates.map((action) => actionAgentDefinitionId(action)).filter((id): id is string => !!id),
      { now },
    );
    for (const action of expiredCandidates) {
      const agentDefinitionId = actionAgentDefinitionId(action);
      if (agentDefinitionId && blockedAgentDefinitionIds.has(agentDefinitionId)) {
        continue;
      }
      try {
        await this.actions.markExpired(
          context,
          action,
          action.status === 'approved'
            ? 'Approved action request expired before execution.'
            : 'Action request expired before review.',
        );
        summary.expiredActions += 1;
      } catch (error) {
        summary.errors.push(`Action ${action.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      const claims = await this.queue.reconcileTargetClaims(context, { limit, now });
      summary.claimsScanned = claims.scanned;
      summary.claimsReleased = claims.released;
      summary.claimActionsExpired = claims.expiredActions;
    } catch (error) {
      summary.errors.push(`Claims: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (summary.expiredActions > 0 || summary.claimsReleased > 0 || summary.claimActionsExpired > 0) {
      await this.queue.recordAuditEvent(context, {
        eventType: 'approval_lifecycle_swept',
        severity: summary.errors.length > 0 ? 'warning' : 'info',
        message: 'Agent approval lifecycle sweeper expired lapsed proposals and reconciled claims.',
        metadata: {
          expired_actions: summary.expiredActions,
          claims_scanned: summary.claimsScanned,
          claims_released: summary.claimsReleased,
          claim_actions_expired: summary.claimActionsExpired,
          errors: summary.errors,
        },
      });
    }
    return summary;
  }
}
