import { BadRequestException, ForbiddenException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { ScheduledTasksService } from '../../../admin/scheduled-tasks/scheduled-tasks.service';
import { AiExecutionContextWithManager } from '../../ai.types';
import { withTenantExecution } from '../../../common/tenant-runner';
import { AiAgentControlService } from '../agent-control/ai-agent-control.service';
import { AiAgentDefinition } from '../entities/ai-agent-definition.entity';
import { AiAgentWorkItem } from '../entities/ai-agent-work-item.entity';
import { AiProviderRegistryService } from '../providers/provider-registry.service';
import { TicketRecord } from '../providers/provider.types';
import {
  AiAgentWorkQueueService,
  HELP_DESK_GLPI_TRIAGE_AGENT_KEY,
  HELP_DESK_GLPI_TRIAGE_WORK_KIND,
  HelpdeskNewTicketsIngestionConfig,
} from './ai-agent-work-queue.service';

export type HelpdeskGlpiIngestionPollSummary = {
  tenantId: string;
  status: 'disabled' | 'paused' | 'completed' | 'failed' | 'skipped';
  listed: number;
  enqueued: number;
  deduped: number;
  processed: number;
  errors: string[];
};

export type HelpdeskGlpiIngestionRunSummary = {
  tenantsProcessed: number;
  tenantsSkipped: number;
  ticketsListed: number;
  ticketsEnqueued: number;
  ticketsProcessed: number;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseDateMs(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inScope(ticket: TicketRecord, config: HelpdeskNewTicketsIngestionConfig): boolean {
  const createdAt = parseDateMs(ticket.createdAt);
  const horizon = parseDateMs(config.createdAfter);
  if (createdAt == null || horizon == null || createdAt < horizon) {
    return false;
  }
  if (config.entityId && ticket.scope?.entityId !== config.entityId) {
    return false;
  }
  if (config.categoryId && ticket.scope?.categoryId !== config.categoryId) {
    return false;
  }
  return true;
}

function workItemReady(item: AiAgentWorkItem, now: Date): boolean {
  if (!item.next_attempt_at) {
    return true;
  }
  const nextAttempt = item.next_attempt_at instanceof Date ? item.next_attempt_at : new Date(item.next_attempt_at);
  return !Number.isFinite(nextAttempt.getTime()) || nextAttempt.getTime() <= now.getTime();
}

const SCHEDULED_POLL_BACKOFF_BASE_MINUTES = 5;
const SCHEDULED_POLL_BACKOFF_MAX_MINUTES = 360;

function ingestionState(definition: AiAgentDefinition): Record<string, unknown> | null {
  const metadata = definition.metadata_json;
  return isRecord(metadata) && isRecord(metadata.helpdesk_ingestion_state)
    ? metadata.helpdesk_ingestion_state
    : null;
}

function failureStreak(definition: AiAgentDefinition): number {
  const state = ingestionState(definition);
  const streak = state?.failure_streak;
  return typeof streak === 'number' && Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
}

function scheduledPollCooldownUntil(definition: AiAgentDefinition): number | null {
  const state = ingestionState(definition);
  if (!state || state.last_poll_status !== 'failed') {
    return null;
  }
  const lastPollMs = parseDateMs(state.last_poll_at);
  if (lastPollMs == null) {
    return null;
  }
  const streak = Math.max(failureStreak(definition), 1);
  const backoffMinutes = Math.min(
    SCHEDULED_POLL_BACKOFF_BASE_MINUTES * 2 ** (streak - 1),
    SCHEDULED_POLL_BACKOFF_MAX_MINUTES,
  );
  return lastPollMs + backoffMinutes * 60_000;
}

@Injectable()
export class AiAgentHelpdeskGlpiIngestionService implements OnModuleInit {
  private readonly logger = new Logger(AiAgentHelpdeskGlpiIngestionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly scheduledTasks: ScheduledTasksService,
    private readonly providers: AiProviderRegistryService,
    private readonly queue: AiAgentWorkQueueService,
    private readonly control: AiAgentControlService,
  ) {}

  onModuleInit() {
    this.scheduledTasks.register({
      name: 'ai-helpdesk-glpi-new-ticket-ingestion',
      description: 'Polls explicitly scoped GLPI new-ticket queues for the Helpdesk shadow-mode agent',
      defaultCron: '*/5 * * * *',
      handler: () => this.run(),
    });
  }

  async run(opts?: { manager?: EntityManager }): Promise<HelpdeskGlpiIngestionRunSummary> {
    const summary: HelpdeskGlpiIngestionRunSummary = {
      tenantsProcessed: 0,
      tenantsSkipped: 0,
      ticketsListed: 0,
      ticketsEnqueued: 0,
      ticketsProcessed: 0,
      errors: [],
    };
    const tenants: Array<{ id: string }> = opts?.manager
      ? await opts.manager.query('SELECT id FROM tenants ORDER BY id ASC')
      : await this.dataSource.query('SELECT id FROM tenants ORDER BY id ASC');

    for (const tenant of tenants) {
      try {
        const result = opts?.manager
          ? await this.runForTenantManager(opts.manager, tenant.id, { ensureDefinition: false })
          : await withTenantExecution(this.dataSource, tenant.id, (manager) =>
            this.runForTenantManager(manager, tenant.id, { ensureDefinition: false }),
          );
        if (result.status === 'disabled' || result.status === 'skipped') {
          summary.tenantsSkipped += 1;
        } else {
          summary.tenantsProcessed += 1;
        }
        summary.ticketsListed += result.listed;
        summary.ticketsEnqueued += result.enqueued;
        summary.ticketsProcessed += result.processed;
        summary.errors.push(...result.errors.map((entry) => `Tenant ${tenant.id}: ${entry}`));
      } catch (error: any) {
        summary.errors.push(`Tenant ${tenant.id}: ${error?.message || String(error)}`);
      }
    }

    this.logger.log(
      `[ai-helpdesk-glpi-new-ticket-ingestion] Done: ${summary.tenantsProcessed} tenants, ${summary.ticketsEnqueued} enqueued, ${summary.ticketsProcessed} processed`,
    );
    return summary;
  }

  async pollTenant(context: AiExecutionContextWithManager): Promise<HelpdeskGlpiIngestionPollSummary> {
    return this.pollTenantContext(context, { ensureDefinition: true });
  }

  private async runForTenantManager(
    manager: EntityManager,
    tenantId: string,
    opts: { ensureDefinition: boolean },
  ): Promise<HelpdeskGlpiIngestionPollSummary> {
    await manager.query('SELECT set_config(\'app.current_tenant\', $1, true)', [tenantId]);
    return this.pollTenantContext({
      tenantId,
      userId: '',
      isPlatformHost: false,
      surface: 'chat',
      authMethod: 'jwt',
      manager,
    } as AiExecutionContextWithManager, opts);
  }

  private async pollTenantContext(
    context: AiExecutionContextWithManager,
    opts: { ensureDefinition: boolean },
  ): Promise<HelpdeskGlpiIngestionPollSummary> {
    const summary: HelpdeskGlpiIngestionPollSummary = {
      tenantId: context.tenantId,
      status: 'completed',
      listed: 0,
      enqueued: 0,
      deduped: 0,
      processed: 0,
      errors: [],
    };
    // Serialize polling per tenant: the scheduled cron and a manual cockpit
    // trigger (or a second backend instance) must not poll concurrently.
    // Transaction-scoped, so it releases automatically with the tenant tx.
    // In-memory test managers expose no raw query; real tenant managers do.
    const managerQuery = (context.manager as { query?: (sql: string, params?: unknown[]) => Promise<Array<{ locked: boolean }>> }).query;
    if (typeof managerQuery === 'function') {
      const lockRows = await managerQuery.call(
        context.manager,
        'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked',
        [`ai-helpdesk-glpi-ingestion:${context.tenantId}`],
      );
      if (!lockRows[0]?.locked) {
        summary.status = 'skipped';
        summary.errors.push('Another Helpdesk GLPI ingestion poll is already running for this tenant.');
        return summary;
      }
    }

    const definition = await this.loadDefinition(context, opts.ensureDefinition);
    if (!definition) {
      summary.status = 'disabled';
      return summary;
    }

    let config: HelpdeskNewTicketsIngestionConfig;
    try {
      this.queue.assertHelpdeskGlpiDefinitionRunnable(definition, null);
      config = this.queue.resolveNewTicketsIngestionConfig(definition);
    } catch (error) {
      summary.status = 'disabled';
      return summary;
    }

    // Scheduled polls back off after failed cycles (5 min doubling, capped at
    // 6 h) so a down GLPI is not hammered every cron tick. Manual cockpit
    // polls (ensureDefinition=true) bypass the cooldown on purpose: an
    // operator retry is an explicit decision.
    if (!opts.ensureDefinition) {
      const cooldownUntil = scheduledPollCooldownUntil(definition);
      if (cooldownUntil != null && Date.now() < cooldownUntil) {
        summary.status = 'skipped';
        return summary;
      }
    }

    const pause = await this.queue.hasActiveEmergencyPause(context);
    if (pause) {
      summary.status = 'paused';
      const event = await this.queue.recordAuditEvent(context, {
        agentDefinitionId: definition.id,
        eventType: 'poller_paused_by_emergency_pause',
        severity: 'warning',
        message: `Helpdesk GLPI ingestion skipped because an emergency pause is active: ${pause.reason}`,
        metadata: { pause_id: pause.id },
      });
      await this.queue.updateHelpdeskIngestionState(context, definition, {
        status: 'paused',
        reason: 'emergency_pause',
        last_poll_at: new Date().toISOString(),
        last_poll_status: 'paused',
        last_audit_event_id: event.id,
      });
      return summary;
    }

    try {
      await this.queue.assertDailyCapAvailable(context, definition);
    } catch (error) {
      summary.status = 'paused';
      summary.errors.push(error instanceof Error ? error.message : String(error));
      return summary;
    }

    try {
      const applicability = await this.providers.getApplicability(context, 'ticketing', 'glpi');
      if (!applicability.available) {
        throw new ForbiddenException(`GLPI provider is unavailable: ${applicability.message ?? applicability.reasonCode ?? 'not ready'}.`);
      }
      const provider = await this.providers.ticketing(context, 'glpi');
      const listed = await provider.listTicketsForScope(context, {
        scope: {
          mode: 'new_tickets_only',
          createdAfter: config.createdAfter,
          maxResults: Math.min(config.maxTicketsPerCycle, config.maxProviderRequestsPerCycle),
          entityId: config.entityId ?? null,
          categoryId: config.categoryId ?? null,
        },
      });
      if (listed.ok === false) {
        throw new BadRequestException(listed.message);
      }
      if (!isRecord(listed.data) || !Array.isArray(listed.data.tickets)) {
        throw new BadRequestException('GLPI ticket list provider response was malformed.');
      }
      const scopedTickets = listed.data.tickets.filter((ticket) => inScope(ticket, config));
      summary.listed = listed.data.tickets.length;
      for (const ticket of scopedTickets.slice(0, config.maxTicketsPerCycle)) {
        const result = await this.queue.enqueueHelpdeskGlpiScopedTicket(context, {
          definition,
          ticket,
          metadata: {
            poller_created_after: config.createdAfter,
            poller_enabled_at: config.enabledAt,
          },
        });
        if (result.created) {
          summary.enqueued += 1;
        } else {
          summary.deduped += 1;
        }
      }

      // Narrowed to the active statuses so the fetch stays bounded by the
      // live queue depth instead of every work item ever processed.
      const now = new Date();
      const readyItems = (await context.manager.getRepository(AiAgentWorkItem).find({
        where: {
          tenant_id: context.tenantId,
          agent_definition_id: definition.id,
          status: In(['queued', 'failed']),
          source_provider_kind: 'ticketing',
          source_provider_key: 'glpi',
          source_object_type: 'ticket',
          work_kind: HELP_DESK_GLPI_TRIAGE_WORK_KIND,
        },
      }))
        .filter((item) => workItemReady(item, now))
        .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
        .slice(0, config.maxTicketsPerCycle);

      for (const item of readyItems) {
        await this.queue.assertDailyCapAvailable(context, definition);
        try {
          await this.control.runGlpiTriage(context, { work_item_id: item.id });
          summary.processed += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          summary.errors.push(`Work item ${item.id}: ${message}`);
          await this.queue.recordAuditEvent(context, {
            agentDefinitionId: definition.id,
            workItemId: item.id,
            eventType: 'work_item_processing_failed',
            severity: 'error',
            message: 'Helpdesk GLPI queued ticket triage failed.',
            metadata: { error: message },
          });
        }
      }

      const event = await this.queue.recordAuditEvent(context, {
        agentDefinitionId: definition.id,
        eventType: 'poller_cycle_completed',
        severity: 'info',
        message: 'Helpdesk GLPI new-ticket ingestion cycle completed.',
        metadata: summary,
      });
      await this.queue.updateHelpdeskIngestionState(context, definition, {
        status: 'active',
        reason: null,
        failure_streak: 0,
        last_poll_at: new Date().toISOString(),
        last_poll_status: 'completed',
        last_audit_event_id: event.id,
        last_poll_summary: summary,
      });
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.status = 'failed';
      summary.errors.push(message);
      const event = await this.queue.recordAuditEvent(context, {
        agentDefinitionId: definition.id,
        eventType: 'poller_cycle_failed',
        severity: 'error',
        message: 'Helpdesk GLPI new-ticket ingestion failed closed.',
        metadata: { error: message },
      });
      await this.queue.updateHelpdeskIngestionState(context, definition, {
        status: 'paused',
        reason: 'poller_failure',
        failure_streak: failureStreak(definition) + 1,
        last_poll_at: new Date().toISOString(),
        last_poll_status: 'failed',
        last_audit_event_id: event.id,
        last_error: message,
      });
      return summary;
    }
  }

  private async loadDefinition(
    context: AiExecutionContextWithManager,
    ensureDefinition: boolean,
  ): Promise<AiAgentDefinition | null> {
    if (ensureDefinition) {
      return (await this.queue.ensureHelpdeskGlpiTriageDefinition(context)).definition;
    }
    return context.manager.getRepository(AiAgentDefinition).findOne({
      where: {
        tenant_id: context.tenantId,
        agent_key: HELP_DESK_GLPI_TRIAGE_AGENT_KEY,
      },
    });
  }
}
