import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { ScheduledTasksService } from '../../../admin/scheduled-tasks/scheduled-tasks.service';
import { withTenantExecution } from '../../../common/tenant-runner';
import { AiExecutionContextWithManager } from '../../ai.types';
import { AiActionRequestService } from '../action-request/ai-action-request.service';
import { AiAgentControlService } from '../agent-control/ai-agent-control.service';
import { AiActionRequest } from '../entities/ai-action-request.entity';
import { AiAgentWorkQueueService } from './ai-agent-work-queue.service';

export type AgentApprovalLifecycleSweepSummary = {
  tenantId: string;
  expiredActions: number;
  claimsScanned: number;
  claimsReleased: number;
  claimActionsExpired: number;
  waitingApprovalScanned: number;
  waitingApprovalResolved: number;
  queuedExecutionsScanned: number;
  queuedExecutionsExecuted: number;
  queuedExecutionsNeedsReview: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function queuedExecutionBatch(action: AiActionRequest): { batchId: string; actionRequestIds: string[] } | null {
  const metadata = isRecord(action.metadata_json) ? action.metadata_json : null;
  const batch = isRecord(metadata?.approved_batch_context) ? metadata.approved_batch_context : null;
  if (!batch || batch.execution_queued !== true) {
    return null;
  }
  const ids = Array.isArray(batch.action_request_ids)
    ? batch.action_request_ids
      .map((id) => typeof id === 'string' ? id.trim() : '')
      .filter((id): id is string => id.length > 0)
    : [];
  const batchId = typeof batch.batch_id === 'string' && batch.batch_id.trim().length > 0
    ? batch.batch_id.trim()
    : action.id;
  return {
    batchId,
    actionRequestIds: ids.length > 0 ? Array.from(new Set(ids)).slice(0, 20) : [action.id],
  };
}

@Injectable()
export class AiAgentApprovalLifecycleSweeperService implements OnModuleInit {
  private readonly logger = new Logger(AiAgentApprovalLifecycleSweeperService.name);

  constructor(
    @Optional() private readonly dataSource: DataSource | null,
    @Optional() private readonly scheduledTasks: ScheduledTasksService | null,
    private readonly queue: AiAgentWorkQueueService,
    private readonly actions: AiActionRequestService,
    @Optional() private readonly control: AiAgentControlService | null = null,
  ) {}

  onModuleInit() {
    if (!this.scheduledTasks) {
      return;
    }
    this.scheduledTasks.register({
      name: 'ai-agent-approval-lifecycle-sweeper',
      description: 'Expires lapsed agent proposals, reconciles service-desk target claims, and resumes queued approved executions',
      defaultCron: '*/10 * * * *',
      handler: () => this.run(),
    });
  }

  async run(opts: { manager?: EntityManager; limit?: number; now?: Date } = {}) {
    const summary = {
      tenantsProcessed: 0,
      expiredActions: 0,
      claimsReleased: 0,
      waitingApprovalResolved: 0,
      queuedExecutionsExecuted: 0,
      queuedExecutionsNeedsReview: 0,
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
        summary.waitingApprovalResolved += result.waitingApprovalResolved;
        summary.queuedExecutionsExecuted += result.queuedExecutionsExecuted;
        summary.queuedExecutionsNeedsReview += result.queuedExecutionsNeedsReview;
        summary.errors.push(...result.errors.map((entry) => `Tenant ${tenant.id}: ${entry}`));
      } catch (error) {
        summary.errors.push(`Tenant ${tenant.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.logger.log(
      `[ai-agent-approval-lifecycle-sweeper] Done: ${summary.tenantsProcessed} tenants, ${summary.expiredActions} expired, ${summary.claimsReleased} claims released, ${summary.waitingApprovalResolved} waiting approvals resolved, ${summary.queuedExecutionsExecuted} queued executions completed`,
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
      waitingApprovalScanned: 0,
      waitingApprovalResolved: 0,
      queuedExecutionsScanned: 0,
      queuedExecutionsExecuted: 0,
      queuedExecutionsNeedsReview: 0,
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

    try {
      const waitingApproval = await this.queue.reconcileWaitingApprovalWorkItems(context, { limit });
      summary.waitingApprovalScanned = waitingApproval.scanned;
      summary.waitingApprovalResolved = waitingApproval.resolved;
    } catch (error) {
      summary.errors.push(`Waiting approval: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      const queuedExecutions = await this.executeQueuedApprovedActions(context, { limit });
      summary.queuedExecutionsScanned = queuedExecutions.scanned;
      summary.queuedExecutionsExecuted = queuedExecutions.executed;
      summary.queuedExecutionsNeedsReview = queuedExecutions.needsReview;
    } catch (error) {
      summary.errors.push(`Queued executions: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (
      summary.expiredActions > 0
      || summary.claimsReleased > 0
      || summary.claimActionsExpired > 0
      || summary.waitingApprovalResolved > 0
      || summary.queuedExecutionsExecuted > 0
      || summary.queuedExecutionsNeedsReview > 0
    ) {
      await this.queue.recordAuditEvent(context, {
        eventType: 'approval_lifecycle_swept',
        severity: summary.errors.length > 0 ? 'warning' : 'info',
        message: 'Agent approval lifecycle sweeper expired lapsed proposals, reconciled claims, resolved completed approval waits, and resumed queued executions.',
        metadata: {
          expired_actions: summary.expiredActions,
          claims_scanned: summary.claimsScanned,
          claims_released: summary.claimsReleased,
          claim_actions_expired: summary.claimActionsExpired,
          waiting_approval_scanned: summary.waitingApprovalScanned,
          waiting_approval_resolved: summary.waitingApprovalResolved,
          queued_executions_scanned: summary.queuedExecutionsScanned,
          queued_executions_executed: summary.queuedExecutionsExecuted,
          queued_executions_needs_review: summary.queuedExecutionsNeedsReview,
          errors: summary.errors,
        },
      });
    }
    return summary;
  }

  private async executeQueuedApprovedActions(
    context: AiExecutionContextWithManager,
    opts: { limit: number },
  ): Promise<{ scanned: number; executed: number; needsReview: number }> {
    if (!this.control) {
      return { scanned: 0, executed: 0, needsReview: 0 };
    }
    const candidates = await context.manager.getRepository(AiActionRequest).find({
      where: {
        tenant_id: context.tenantId,
        status: 'approved',
      },
      order: { updated_at: 'ASC', created_at: 'ASC' },
      take: Math.max(opts.limit, Math.min(opts.limit * 5, 500)),
    });
    const batches = new Map<string, string[]>();
    for (const candidate of candidates) {
      const batch = queuedExecutionBatch(candidate);
      if (!batch || batches.has(batch.batchId)) {
        continue;
      }
      batches.set(batch.batchId, batch.actionRequestIds);
      if (batches.size >= opts.limit) {
        break;
      }
    }

    let executed = 0;
    let needsReview = 0;
    for (const actionRequestIds of batches.values()) {
      const result = await this.control.executeApprovedActionRequestsBulk(context, { action_request_ids: actionRequestIds });
      executed += result.summary.executed;
      needsReview += result.summary.needs_review;
    }
    return {
      scanned: candidates.length,
      executed,
      needsReview,
    };
  }
}
