import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { AiExecutionContextWithManager } from '../../ai.types';
import {
  TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_ASSIGNMENT_UPDATE_PREPARE_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_PREPARE_CAPABILITY,
  TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY,
  TICKETING_CLASSIFICATION_CONTEXT_CAPABILITY,
  TICKETING_LIFECYCLE_CONTEXT_CAPABILITY,
  TICKETING_PARTICIPANT_CONTEXT_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_PREPARE_CAPABILITY,
  TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
  TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY,
  TICKETING_ROUTING_CONTEXT_CAPABILITY,
  TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
  TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY,
} from '../capability/capability-contract';
import { AiActionRequest } from '../entities/ai-action-request.entity';
import { AiAgentAuditEvent } from '../entities/ai-agent-audit-event.entity';
import { AiAgentDefinition } from '../entities/ai-agent-definition.entity';
import { AiAgentTargetState } from '../entities/ai-agent-target-state.entity';
import { AiAgentTrigger } from '../entities/ai-agent-trigger.entity';
import { AiAgentWorkItem } from '../entities/ai-agent-work-item.entity';
import { AiEmergencyPause } from '../entities/ai-emergency-pause.entity';
import { AiRun } from '../entities/ai-run.entity';
import { hashStableJson } from '../evidence/ai-evidence.service';

export const HELP_DESK_GLPI_TRIAGE_AGENT_KEY = 'helpdesk.glpi.triage';
export const HELP_DESK_GLPI_TRIAGE_MANUAL_TRIGGER_KEY = 'manual.safe_target';
export const HELP_DESK_GLPI_TRIAGE_NEW_TICKETS_TRIGGER_KEY = 'scheduled.new_tickets_only';
export const HELP_DESK_GLPI_TRIAGE_WORK_KIND = 'ticket_triage';

const ACTIVE_WORK_ITEM_STATUSES = new Set(['queued', 'leased', 'running', 'waiting_approval', 'failed']);
const TERMINAL_WORK_ITEM_STATUSES = new Set(['completed', 'skipped', 'dead_letter']);
const RETRYABLE_WORK_ITEM_STATUSES = new Set(['queued', 'leased', 'running', 'failed']);
const DEFAULT_LEASE_TTL_SECONDS = 5 * 60;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_COOLDOWN_SECONDS = 60;
const DEFAULT_NEW_TICKET_MAX_PER_CYCLE = 5;
const DEFAULT_NEW_TICKET_RATE_LIMIT_PER_CYCLE = 10;
const DEFAULT_BACKFILL_HORIZON_HOURS = 24;
const DEFAULT_PER_RUN_TOKEN_CAP = 40_000;
const DEFAULT_PER_RUN_COST_CAP_EUR = 1;
const DEFAULT_DAILY_RUN_CAP = 25;
const DEFAULT_DAILY_TOKEN_CAP = 500_000;
const DEFAULT_DAILY_COST_CAP_EUR = 10;

const REQUIRED_HELPDESK_TRIAGE_CAPABILITIES = [
  'ticketing.ticket.get',
  'search_knowledge',
  'get_document',
  TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY,
  TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_PREPARE_CAPABILITY,
  TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY,
  TICKETING_ASSIGNMENT_UPDATE_PREPARE_CAPABILITY,
] as const;

const HELP_DESK_ALLOWED_CAPABILITIES = [
  { name: 'ticketing.ticket.get', version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' },
  { name: TICKETING_CLASSIFICATION_CONTEXT_CAPABILITY, version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' },
  { name: TICKETING_LIFECYCLE_CONTEXT_CAPABILITY, version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' },
  { name: TICKETING_ROUTING_CONTEXT_CAPABILITY, version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' },
  { name: TICKETING_PARTICIPANT_CONTEXT_CAPABILITY, version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' },
  { name: 'search_knowledge', version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' },
  { name: 'get_document', version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' },
  { name: TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY, version: '1.0.0', effect: 'propose', max_autonomy_level: 'A2' },
  { name: TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY, version: '1.0.0', effect: 'propose', max_autonomy_level: 'A2' },
  { name: TICKETING_CLASSIFICATION_UPDATE_PREPARE_CAPABILITY, version: '1.0.0', effect: 'propose', max_autonomy_level: 'A2' },
  { name: TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY, version: '1.0.0', effect: 'propose', max_autonomy_level: 'A2' },
  { name: TICKETING_ASSIGNMENT_UPDATE_PREPARE_CAPABILITY, version: '1.0.0', effect: 'propose', max_autonomy_level: 'A2' },
  { name: TICKETING_PARTICIPANT_UPDATE_PREPARE_CAPABILITY, version: '1.0.0', effect: 'propose', max_autonomy_level: 'A2' },
  {
    name: TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
    requires_safe_target_effect: 'sandbox_write',
  },
  {
    name: TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
    requires_safe_target_effect: 'sandbox_write',
  },
  {
    name: TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
    requires_safe_target_effect: 'sandbox_write',
  },
  {
    name: TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
    requires_safe_target_effect: 'sandbox_write',
  },
  {
    name: TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
    requires_safe_target_effect: 'sandbox_write',
  },
  {
    name: TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
    requires_safe_target_effect: 'sandbox_write',
  },
];

const HELP_DESK_FORBIDDEN_CAPABILITIES = [
  'ticketing.ticket.close',
  'ticketing.ticket.delete',
  'ticketing.ticket.bulk_update',
  'ticketing.ticket.public_reply.auto_execute',
  'automation.job.launch_approved',
  'external_mcp.*',
  'production_a4',
];

const HELPDESK_REVIEW_ACTION_CAPABILITIES = [
  TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
  TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
];

const HELP_DESK_PHASE_11_UPGRADE_CAPABILITY_NAMES = new Set([
  TICKETING_CLASSIFICATION_CONTEXT_CAPABILITY,
  TICKETING_LIFECYCLE_CONTEXT_CAPABILITY,
  TICKETING_ROUTING_CONTEXT_CAPABILITY,
  TICKETING_PARTICIPANT_CONTEXT_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_PREPARE_CAPABILITY,
  TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY,
  TICKETING_ASSIGNMENT_UPDATE_PREPARE_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_PREPARE_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
  TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
]);

export type AgentQueueLiveTargetLike = {
  id: string;
  provider_kind: string;
  provider_key: string;
  environment: string;
  target_kind: string;
  target_key: string;
  external_ref: string;
  allowed_effect: string;
  safety_label: string;
  enabled: boolean;
};

export type HelpdeskGlpiDefinitionBundle = {
  definition: AiAgentDefinition;
  trigger: AiAgentTrigger;
};

export type EnqueueManualGlpiSafeTargetResult = HelpdeskGlpiDefinitionBundle & {
  workItem: AiAgentWorkItem;
  created: boolean;
};

export type AgentQueueOverview = {
  definitions: AiAgentDefinition[];
  workItems: AiAgentWorkItem[];
  targetStates: AiAgentTargetState[];
  counts: Record<string, number>;
  helpdesk: {
    summary: HelpdeskGlpiAgentSummary | null;
    auditEvents: AiAgentAuditEvent[];
  };
};

export type HelpdeskNewTicketsIngestionConfig = {
  enabled: true;
  enabledAt: string;
  createdAfter: string;
  entityId?: string | null;
  categoryId?: string | null;
  maxTicketsPerCycle: number;
  maxProviderRequestsPerCycle: number;
};

export type HelpdeskGlpiIngestionSettingsInput = {
  ingestion: {
    enabled: boolean;
    entityId?: string | null;
    categoryId?: string | null;
    maxTicketsPerCycle?: number | null;
    maxProviderRequestsPerCycle?: number | null;
    hardBackfillHorizonHours?: number | null;
  };
  guardrails?: {
    perRun?: { maxEstimatedTokens?: number | null; maxEstimatedCostEur?: number | null };
    daily?: { maxAgentRuns?: number | null; maxEstimatedTokens?: number | null; maxEstimatedCostEur?: number | null };
  };
};

export type HelpdeskGlpiIngestionSettingsView = {
  agentDefinitionId: string;
  ingestion: {
    enabled: boolean;
    enabledAt: string | null;
    entityId: string | null;
    categoryId: string | null;
    maxTicketsPerCycle: number | null;
    maxProviderRequestsPerCycle: number | null;
    hardBackfillHorizonHours: number;
    ready: boolean;
    readyReason: string | null;
    effectiveCreatedAfter: string | null;
  };
  guardrails: {
    configured: boolean;
    perRun: { maxEstimatedTokens: number | null; maxEstimatedCostEur: number | null };
    daily: { maxAgentRuns: number | null; maxEstimatedTokens: number | null; maxEstimatedCostEur: number | null };
  };
};

export type HelpdeskDailyUsageSummary = {
  windowStart: string;
  windowEnd: string;
  runs: number;
  estimatedTokens: number;
  estimatedCostEur: number;
  cap: {
    maxRuns: number;
    maxTokens: number;
    maxCostEur: number;
  };
  reached: boolean;
  reachedReasons: string[];
};

export type HelpdeskRunGuardrailSummary = {
  maxEstimatedTokens: number;
  maxEstimatedCostEur: number;
};

export type HelpdeskGlpiAgentSummary = {
  agentDefinitionId: string;
  ingestion: {
    enabled: boolean;
    mode: 'disabled' | 'new_tickets_only';
    paused: boolean;
    pauseReason: string | null;
    enabledAt: string | null;
    createdAfter: string | null;
    entityId: string | null;
    categoryId: string | null;
    maxTicketsPerCycle: number | null;
    maxProviderRequestsPerCycle: number | null;
    lastPollAt: string | null;
    lastPollStatus: string | null;
    lastAuditEventId: string | null;
  };
  guardrails: {
    configured: boolean;
    perRun: HelpdeskRunGuardrailSummary | null;
    daily: HelpdeskDailyUsageSummary | null;
  };
  evaluation: {
    windowStart: string;
    windowEnd: string;
    proposalsByActionClass: Record<string, number>;
    terminalByStatus: Record<string, number>;
    acceptanceRate: number | null;
    rejectionReasons: Record<string, number>;
    medianApprovalLatencySeconds: number | null;
    runsPerTicket: number | null;
    tokensPerTicket: number | null;
    costPerTicketEur: number | null;
    kbHitRate: number | null;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function numberFromPolicy(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function capabilityEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (isRecord(value) && Array.isArray(value.capabilities)) {
    return value.capabilities;
  }
  return [];
}

function capabilityEntryName(entry: unknown): string | null {
  if (typeof entry === 'string' && entry.trim()) {
    return entry.trim();
  }
  if (isRecord(entry) && typeof entry.name === 'string' && entry.name.trim()) {
    return entry.name.trim();
  }
  return null;
}

function capabilityNames(value: unknown): Set<string> {
  const names = new Set<string>();
  const entries = capabilityEntries(value);
  for (const entry of entries) {
    const name = capabilityEntryName(entry);
    if (name) {
      names.add(name);
    }
  }
  return names;
}

function mergeProductOwnedAllowedCapabilities(current: unknown): unknown[] {
  const merged = capabilityEntries(current)
    .filter((entry) => capabilityEntryName(entry) !== null || isRecord(entry))
    .map((entry) => isRecord(entry) ? { ...entry } : entry);
  const names = capabilityNames(merged);
  for (const capability of HELP_DESK_ALLOWED_CAPABILITIES) {
    if (!names.has(capability.name)) {
      merged.push(capability);
      names.add(capability.name);
    }
  }
  return merged;
}

function pruneProductOwnedForbiddenCapabilityConflicts(current: unknown): unknown[] {
  return capabilityEntries(current).filter((entry) => {
    const name = capabilityEntryName(entry);
    return !name || !HELP_DESK_PHASE_11_UPGRADE_CAPABILITY_NAMES.has(name);
  });
}

function policyObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function nestedPolicy(value: unknown, key: string): Record<string, unknown> {
  const record = policyObject(value);
  return policyObject(record[key]);
}

function hasEnabledFlag(value: unknown, key: string): boolean {
  const record = policyObject(value);
  const direct = record[key];
  if (isRecord(direct)) {
    return direct.enabled === true;
  }
  return direct === true;
}

function stringFromPolicy(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isoFromPolicy(value: unknown): string | null {
  const text = stringFromPolicy(value);
  if (!text) {
    return null;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function numberPolicyOrNull(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function positivePolicyNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function trimmedSettingOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function settingNumberInRange(value: unknown, min: number, max: number, fallback: number, label: string): number {
  if (value == null) {
    return fallback;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new BadRequestException(`${label} must be a number between ${min} and ${max}.`);
  }
  return Math.floor(value);
}

function settingPositiveNumber(value: unknown, current: unknown, fallback: number, label: string): number {
  if (value == null) {
    return positivePolicyNumber(current) ?? fallback;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BadRequestException(`${label} must be a positive number.`);
  }
  return value;
}

function defaultEconomicGuardrails(): Record<string, unknown> {
  return {
    configured: true,
    per_run: {
      max_estimated_tokens: DEFAULT_PER_RUN_TOKEN_CAP,
      max_estimated_cost_eur: DEFAULT_PER_RUN_COST_CAP_EUR,
    },
    daily: {
      max_agent_runs: DEFAULT_DAILY_RUN_CAP,
      max_estimated_tokens: DEFAULT_DAILY_TOKEN_CAP,
      max_estimated_cost_eur: DEFAULT_DAILY_COST_CAP_EUR,
    },
  };
}

function mergeEconomicGuardrails(current: unknown): Record<string, unknown> {
  const currentRecord = policyObject(current);
  const defaults = defaultEconomicGuardrails();
  return {
    ...defaults,
    ...currentRecord,
    per_run: {
      ...policyObject(defaults.per_run),
      ...policyObject(currentRecord.per_run),
    },
    daily: {
      ...policyObject(defaults.daily),
      ...policyObject(currentRecord.daily),
    },
  };
}

function runGuardrailsFromDefinition(definition: AiAgentDefinition): HelpdeskRunGuardrailSummary | null {
  const guardrails = nestedPolicy(definition.queue_policy_json, 'economic_guardrails');
  const perRun = policyObject(guardrails.per_run);
  if (guardrails.configured !== true) {
    return null;
  }
  const maxEstimatedTokens = positivePolicyNumber(perRun.max_estimated_tokens);
  const maxEstimatedCostEur = positivePolicyNumber(perRun.max_estimated_cost_eur);
  if (!maxEstimatedTokens || !maxEstimatedCostEur) {
    return null;
  }
  return { maxEstimatedTokens, maxEstimatedCostEur };
}

function dailyGuardrailCapsFromDefinition(definition: AiAgentDefinition): HelpdeskDailyUsageSummary['cap'] | null {
  const guardrails = nestedPolicy(definition.queue_policy_json, 'economic_guardrails');
  const daily = policyObject(guardrails.daily);
  if (guardrails.configured !== true) {
    return null;
  }
  const maxRuns = positivePolicyNumber(daily.max_agent_runs);
  const maxTokens = positivePolicyNumber(daily.max_estimated_tokens);
  const maxCostEur = positivePolicyNumber(daily.max_estimated_cost_eur);
  if (!maxRuns || !maxTokens || !maxCostEur) {
    return null;
  }
  return { maxRuns, maxTokens, maxCostEur };
}

function numericMetadata(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function addEstimatedUsage(acc: { tokens: number; cost: number }, run: AiRun): void {
  const usage = policyObject(run.usage_json);
  const cost = policyObject(run.cost_json);
  acc.tokens += numericMetadata(usage.estimated_tokens ?? usage.total_tokens);
  acc.cost += numericMetadata(cost.estimated_cost_eur ?? cost.total_cost_eur ?? cost.total_cost);
}

function actionClass(action: AiActionRequest): string {
  if (action.capability_name.includes('internal_note')) return 'internal_note';
  if (action.capability_name.includes('public_reply')) return 'public_reply';
  if (action.capability_name.includes('classification_update')) return 'classification';
  if (action.capability_name.includes('status_update')) return 'status';
  if (action.capability_name.includes('assignment_update')) return 'assignment';
  if (action.capability_name.includes('participant_update')) return 'participant';
  return action.capability_name;
}

function incrementCounter(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function secondsBetween(start: unknown, end: unknown): number | null {
  const startDate = dateFromUnknown(start);
  const endDate = dateFromUnknown(end);
  if (!startDate || !endDate) {
    return null;
  }
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
}

function midnightUtc(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function isWithinWindow(date: unknown, start: Date, end: Date): boolean {
  const candidate = date instanceof Date ? date : typeof date === 'string' ? new Date(date) : null;
  if (!candidate || !Number.isFinite(candidate.getTime())) {
    return false;
  }
  return candidate.getTime() >= start.getTime() && candidate.getTime() < end.getTime();
}

function definitionIdFromMetadata(value: unknown): string | null {
  const metadata = policyObject(value);
  return stringFromPolicy(metadata.agent_definition_id);
}

function estimateTokens(value: unknown): number {
  const text = JSON.stringify(value ?? {});
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateAgentRunUsage(value: unknown): { estimatedTokens: number; estimatedCostEur: number } {
  const estimatedTokens = estimateTokens(value);
  return {
    estimatedTokens,
    estimatedCostEur: Number((estimatedTokens * 0.000002).toFixed(6)),
  };
}

function normalizedTargetRef(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.includes('*')) {
    throw new BadRequestException('Safe target external reference is invalid.');
  }
  if (['all', 'any', 'everyone', 'unrestricted', 'all_tickets', 'all-tickets'].includes(normalized.toLowerCase())) {
    throw new BadRequestException('Broad safe target references are not allowed for agent work items.');
  }
  return normalized;
}

function activePendingAction(action: AiActionRequest, now = Date.now()): boolean {
  if (action.status !== 'pending' && action.status !== 'approved') {
    return false;
  }
  if (!action.expires_at) {
    return true;
  }
  const expiresAt = action.expires_at instanceof Date ? action.expires_at.getTime() : Date.parse(String(action.expires_at));
  return Number.isFinite(expiresAt) && expiresAt > now;
}

function dateFromUnknown(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function actionBodyHash(action: AiActionRequest | null): string | null {
  const payload = isRecord(action?.action_payload_json) ? action.action_payload_json : null;
  const body = typeof payload?.body === 'string' ? payload.body.replace(/\r\n/g, '\n').trim() : null;
  return body ? hashStableJson({ body }) : null;
}

@Injectable()
export class AiAgentWorkQueueService {
  private definitionRepo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiAgentDefinition);
  }

  private triggerRepo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiAgentTrigger);
  }

  private workItemRepo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiAgentWorkItem);
  }

  private targetStateRepo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiAgentTargetState);
  }

  private actionRepo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiActionRequest);
  }

  private runRepo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiRun);
  }

  private auditRepo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiAgentAuditEvent);
  }

  private pauseRepo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiEmergencyPause);
  }

  async ensureHelpdeskGlpiTriageDefinition(
    context: AiExecutionContextWithManager,
  ): Promise<HelpdeskGlpiDefinitionBundle> {
    if (!context.tenantId) {
      throw new ForbiddenException('Tenant context is required for agent definitions.');
    }

    const definitionRepo = this.definitionRepo(context);
    const triggerRepo = this.triggerRepo(context);
    let definition = await definitionRepo.findOne({
      where: {
        tenant_id: context.tenantId,
        agent_key: HELP_DESK_GLPI_TRIAGE_AGENT_KEY,
      },
    });
    if (!definition) {
      definition = await definitionRepo.save(definitionRepo.create({
        tenant_id: context.tenantId,
        agent_key: HELP_DESK_GLPI_TRIAGE_AGENT_KEY,
        name: 'Helpdesk GLPI triage agent',
        description: 'Reads a configured GLPI safe target, searches KANAP knowledge, and prepares approval-gated helpdesk follow-up proposals.',
        agent_type: 'helpdesk',
        status: 'enabled',
        environment: 'sandbox',
        provider_bindings_json: {
          ticketing: {
            provider_kind: 'ticketing',
            provider_key: 'glpi',
          },
        },
        allowed_capabilities_json: HELP_DESK_ALLOWED_CAPABILITIES,
        forbidden_capabilities_json: HELP_DESK_FORBIDDEN_CAPABILITIES,
        max_autonomy_level: 'A3',
        default_approval_requirement: 'human_for_writes',
        trigger_policy_json: {
          manual_safe_target: { enabled: true },
          scheduled_poll: { enabled: false },
          saved_filter: { enabled: false },
          provider_webhook: { enabled: false },
          ticket_update: { enabled: false },
          production_polling_enabled: false,
          automatic_writes_enabled: false,
        },
        scope_policy_json: {
          mode: 'manual_safe_target',
          allowed_modes: ['manual_safe_target', 'new_tickets_only', 'new_plus_agent_touched', 'saved_filter'],
          provider_kind: 'ticketing',
          provider_key: 'glpi',
          target_kind: 'ticket',
          required_safe_target_effect: 'read',
          write_requires_safe_target_effect: 'sandbox_write',
          new_tickets_only: { enabled: false },
          new_plus_agent_touched: { enabled: false },
          saved_filter: { enabled: false },
          all_matching: { enabled: false },
          freeform_live_object_ids: false,
        },
        queue_policy_json: {
          enabled: true,
          dedup_mode: 'active_work_item',
          lease_ttl_seconds: DEFAULT_LEASE_TTL_SECONDS,
          max_attempts: DEFAULT_MAX_ATTEMPTS,
          cooldown_seconds: DEFAULT_COOLDOWN_SECONDS,
          retry_backoff_seconds: [60, 300, 900],
          terminal_statuses: ['completed', 'skipped', 'dead_letter'],
          economic_guardrails: defaultEconomicGuardrails(),
        },
        response_policy_json: {
          prepare_internal_note: true,
          prepare_public_reply: true,
          prepare_classification_update: true,
          prepare_status_update: true,
          prepare_assignment_update: true,
          prepare_participant_update: false,
          automatic_public_reply: false,
          automatic_ticket_updates: false,
          require_human_approval_for_writes: true,
        },
        evaluation_policy_json: {
          create_pending_evaluation: true,
          feedback_required_for_autonomy_promotion: true,
        },
        metadata_json: {
          product_owned: true,
          phase: 11,
          production_polling_enabled: false,
          production_a4_enabled: false,
        },
        created_at: new Date(),
        updated_at: new Date(),
      }));
    } else {
      const currentTriggerPolicy = policyObject(definition.trigger_policy_json);
      const currentScopePolicy = policyObject(definition.scope_policy_json);
      const currentQueuePolicy = policyObject(definition.queue_policy_json);
      const boundedPollingExplicitlyEnabled = hasEnabledFlag(currentTriggerPolicy, 'scheduled_poll')
        && hasEnabledFlag(currentScopePolicy, 'new_tickets_only');
      const desiredResponsePolicy = {
        ...(isRecord(definition.response_policy_json) ? definition.response_policy_json : {}),
        prepare_internal_note: true,
        prepare_public_reply: true,
        prepare_classification_update: true,
        prepare_status_update: true,
        prepare_assignment_update: true,
        prepare_participant_update: false,
        automatic_public_reply: false,
        automatic_ticket_updates: false,
        require_human_approval_for_writes: true,
      };
      const desiredMetadata = {
        ...(isRecord(definition.metadata_json) ? definition.metadata_json : {}),
        product_owned: true,
        phase: 11,
        production_polling_enabled: boundedPollingExplicitlyEnabled,
        production_a4_enabled: false,
      };
      const desiredTriggerPolicy = {
        ...currentTriggerPolicy,
        manual_safe_target: { enabled: true },
        scheduled_poll: isRecord(currentTriggerPolicy.scheduled_poll) ? currentTriggerPolicy.scheduled_poll : { enabled: false },
        saved_filter: isRecord(currentTriggerPolicy.saved_filter) ? currentTriggerPolicy.saved_filter : { enabled: false },
        provider_webhook: { enabled: false },
        ticket_update: { enabled: false },
        production_polling_enabled: currentTriggerPolicy.production_polling_enabled === true && hasEnabledFlag(currentTriggerPolicy, 'scheduled_poll'),
        automatic_writes_enabled: false,
      };
      const desiredScopePolicy = {
        ...currentScopePolicy,
        mode: stringFromPolicy(currentScopePolicy.mode) ?? 'manual_safe_target',
        allowed_modes: ['manual_safe_target', 'new_tickets_only', 'new_plus_agent_touched', 'saved_filter'],
        provider_kind: 'ticketing',
        provider_key: 'glpi',
        target_kind: 'ticket',
        required_safe_target_effect: 'read',
        write_requires_safe_target_effect: 'sandbox_write',
        new_tickets_only: isRecord(currentScopePolicy.new_tickets_only) ? currentScopePolicy.new_tickets_only : { enabled: false },
        new_plus_agent_touched: { enabled: false },
        saved_filter: isRecord(currentScopePolicy.saved_filter) ? currentScopePolicy.saved_filter : { enabled: false },
        all_matching: { enabled: false },
        freeform_live_object_ids: false,
      };
      const desiredQueuePolicy = {
        ...currentQueuePolicy,
        enabled: currentQueuePolicy.enabled === false ? false : true,
        dedup_mode: currentQueuePolicy.dedup_mode ?? 'active_work_item',
        lease_ttl_seconds: numberFromPolicy(currentQueuePolicy.lease_ttl_seconds, DEFAULT_LEASE_TTL_SECONDS, 30, 86_400),
        max_attempts: numberFromPolicy(currentQueuePolicy.max_attempts, DEFAULT_MAX_ATTEMPTS, 1, 20),
        cooldown_seconds: numberFromPolicy(currentQueuePolicy.cooldown_seconds, DEFAULT_COOLDOWN_SECONDS, 1, 86_400),
        retry_backoff_seconds: Array.isArray(currentQueuePolicy.retry_backoff_seconds)
          ? currentQueuePolicy.retry_backoff_seconds
          : [60, 300, 900],
        terminal_statuses: Array.isArray(currentQueuePolicy.terminal_statuses)
          ? currentQueuePolicy.terminal_statuses
          : ['completed', 'skipped', 'dead_letter'],
        economic_guardrails: mergeEconomicGuardrails(currentQueuePolicy.economic_guardrails),
      };
      const desiredAllowedCapabilities = mergeProductOwnedAllowedCapabilities(definition.allowed_capabilities_json);
      const desiredForbiddenCapabilities = pruneProductOwnedForbiddenCapabilityConflicts(definition.forbidden_capabilities_json);
      const next = {
        allowed_capabilities_json: desiredAllowedCapabilities,
        forbidden_capabilities_json: desiredForbiddenCapabilities,
        response_policy_json: desiredResponsePolicy,
        trigger_policy_json: desiredTriggerPolicy,
        scope_policy_json: desiredScopePolicy,
        queue_policy_json: desiredQueuePolicy,
        metadata_json: desiredMetadata,
      };
      if (
        hashStableJson(definition.allowed_capabilities_json) !== hashStableJson(next.allowed_capabilities_json)
        || hashStableJson(definition.forbidden_capabilities_json) !== hashStableJson(next.forbidden_capabilities_json)
        || hashStableJson(definition.response_policy_json) !== hashStableJson(next.response_policy_json)
        || hashStableJson(definition.trigger_policy_json) !== hashStableJson(next.trigger_policy_json)
        || hashStableJson(definition.scope_policy_json) !== hashStableJson(next.scope_policy_json)
        || hashStableJson(definition.queue_policy_json) !== hashStableJson(next.queue_policy_json)
        || hashStableJson(definition.metadata_json) !== hashStableJson(next.metadata_json)
      ) {
        definition.allowed_capabilities_json = next.allowed_capabilities_json;
        definition.forbidden_capabilities_json = next.forbidden_capabilities_json;
        definition.response_policy_json = next.response_policy_json;
        definition.trigger_policy_json = next.trigger_policy_json;
        definition.scope_policy_json = next.scope_policy_json;
        definition.queue_policy_json = next.queue_policy_json;
        definition.metadata_json = next.metadata_json;
        definition.updated_at = new Date();
        definition = await definitionRepo.save(definition);
      }
    }

    let trigger = await triggerRepo.findOne({
      where: {
        tenant_id: context.tenantId,
        agent_definition_id: definition.id,
        trigger_key: HELP_DESK_GLPI_TRIAGE_MANUAL_TRIGGER_KEY,
      },
    });
    if (!trigger) {
      trigger = await triggerRepo.save(triggerRepo.create({
        tenant_id: context.tenantId,
        agent_definition_id: definition.id,
        trigger_key: HELP_DESK_GLPI_TRIAGE_MANUAL_TRIGGER_KEY,
        trigger_kind: 'manual',
        status: 'enabled',
        enabled: true,
        trigger_policy_json: {
          safe_target_required: true,
          freeform_live_object_ids: false,
        },
        scope_policy_json: {
          mode: 'manual_safe_target',
          provider_kind: 'ticketing',
          provider_key: 'glpi',
          target_kind: 'ticket',
          allowed_effect: 'read',
        },
        metadata_json: {
          source: 'agent_control_center',
          phase: 11,
        },
        created_at: new Date(),
        updated_at: new Date(),
      }));
    }

    return { definition, trigger };
  }

  assertHelpdeskGlpiDefinitionRunnable(definition: AiAgentDefinition, trigger?: AiAgentTrigger | null): void {
    if (definition.status !== 'enabled') {
      throw new ForbiddenException('Helpdesk GLPI triage agent definition is not enabled.');
    }
    if (definition.agent_type !== 'helpdesk') {
      throw new ForbiddenException('Helpdesk GLPI triage agent definition has an invalid type.');
    }
    if (!['sandbox', 'lab', 'mock', 'staging'].includes(definition.environment)) {
      throw new ForbiddenException('Helpdesk GLPI triage is limited to non-production environments in Phase 11.');
    }
    if (definition.max_autonomy_level !== 'A2' && definition.max_autonomy_level !== 'A3') {
      throw new ForbiddenException('Helpdesk GLPI triage cannot widen autonomy beyond A3 in Phase 11.');
    }

    const bindings = policyObject(definition.provider_bindings_json);
    const ticketing = policyObject(bindings.ticketing);
    if (ticketing.provider_key !== 'glpi' || ticketing.provider_kind !== 'ticketing') {
      throw new ForbiddenException('Helpdesk GLPI triage requires the ticketing:glpi provider binding.');
    }

    const triggerPolicy = policyObject(definition.trigger_policy_json);
    const scopePolicy = policyObject(definition.scope_policy_json);
    const queuePolicy = policyObject(definition.queue_policy_json);
    if (queuePolicy.enabled === false) {
      throw new ForbiddenException('Helpdesk GLPI triage queue policy is disabled.');
    }
    if (!hasEnabledFlag(triggerPolicy, 'manual_safe_target')) {
      throw new ForbiddenException('Helpdesk GLPI triage requires the manual safe-target trigger.');
    }
    if (hasEnabledFlag(triggerPolicy, 'provider_webhook') || hasEnabledFlag(triggerPolicy, 'ticket_update')) {
      throw new ForbiddenException('Provider webhook and ticket-update triggers are not enabled in Phase 11.');
    }
    if (triggerPolicy.automatic_writes_enabled === true) {
      throw new ForbiddenException('Automatic writes are out of scope for Phase 11.');
    }
    if (hasEnabledFlag(scopePolicy, 'all_matching') || scopePolicy.freeform_live_object_ids === true) {
      throw new ForbiddenException('Broad or free-form live object scopes are not allowed in Phase 11.');
    }
    if (scopePolicy.mode !== 'manual_safe_target' && !jsonArray(scopePolicy.allowed_modes).includes('manual_safe_target')) {
      throw new ForbiddenException('Helpdesk GLPI triage scope must allow manual safe targets.');
    }
    if (scopePolicy.provider_kind !== 'ticketing' || scopePolicy.provider_key !== 'glpi' || scopePolicy.target_kind !== 'ticket') {
      throw new ForbiddenException('Helpdesk GLPI triage scope must target GLPI tickets.');
    }
    if (hasEnabledFlag(triggerPolicy, 'scheduled_poll')) {
      this.resolveNewTicketsIngestionConfig(definition);
    } else if (triggerPolicy.production_polling_enabled === true) {
      throw new ForbiddenException('Production polling requires the bounded new_tickets_only scheduled poll trigger.');
    }

    const allowed = capabilityNames(definition.allowed_capabilities_json);
    const forbidden = capabilityNames(definition.forbidden_capabilities_json);
    for (const required of REQUIRED_HELPDESK_TRIAGE_CAPABILITIES) {
      if (!allowed.has(required)) {
        throw new ForbiddenException(`Helpdesk GLPI triage definition does not allow required capability ${required}.`);
      }
      if (forbidden.has(required) || forbidden.has('*')) {
        throw new ForbiddenException(`Helpdesk GLPI triage definition forbids required capability ${required}.`);
      }
    }

    if (trigger) {
      if (trigger.trigger_kind !== 'manual' || trigger.enabled !== true || trigger.status !== 'enabled') {
        throw new ForbiddenException('Helpdesk GLPI triage manual trigger is not enabled.');
      }
      const triggerScope = policyObject(trigger.scope_policy_json);
      if (triggerScope.provider_kind !== 'ticketing' || triggerScope.provider_key !== 'glpi' || triggerScope.target_kind !== 'ticket') {
        throw new ForbiddenException('Helpdesk GLPI triage manual trigger scope is invalid.');
      }
    }
  }

  resolveNewTicketsIngestionConfig(definition: AiAgentDefinition): HelpdeskNewTicketsIngestionConfig {
    const triggerPolicy = policyObject(definition.trigger_policy_json);
    const scopePolicy = policyObject(definition.scope_policy_json);
    if (!hasEnabledFlag(triggerPolicy, 'scheduled_poll')) {
      throw new ForbiddenException('Automatic GLPI ticket watching is turned off. Enable it in the agent settings.');
    }
    if (triggerPolicy.automatic_writes_enabled === true) {
      throw new ForbiddenException('Helpdesk GLPI new-ticket ingestion cannot run with automatic writes enabled.');
    }
    if (hasEnabledFlag(scopePolicy, 'all_matching') || scopePolicy.freeform_live_object_ids === true) {
      throw new ForbiddenException('Helpdesk GLPI new-ticket ingestion requires a bounded scope.');
    }

    const newTicketsOnly = nestedPolicy(scopePolicy, 'new_tickets_only');
    if (newTicketsOnly.enabled !== true) {
      throw new ForbiddenException('Automatic GLPI ticket watching is not configured. Enable it in the agent settings.');
    }
    const enabledAt = isoFromPolicy(newTicketsOnly.enabled_at);
    if (!enabledAt) {
      throw new ForbiddenException('Helpdesk GLPI new-ticket ingestion requires a valid enablement timestamp.');
    }
    const entityId = stringFromPolicy(newTicketsOnly.entity_id ?? newTicketsOnly.entityId);
    const categoryId = stringFromPolicy(newTicketsOnly.category_id ?? newTicketsOnly.categoryId);
    if (!entityId && !categoryId) {
      throw new ForbiddenException('Add a GLPI entity or category filter in the agent settings: the agent only watches a bounded ticket scope.');
    }
    const maxTicketsPerCycle = numberPolicyOrNull(
      newTicketsOnly.max_tickets_per_cycle,
      1,
      20,
    );
    const maxProviderRequestsPerCycle = numberPolicyOrNull(
      newTicketsOnly.max_provider_requests_per_cycle,
      1,
      100,
    );
    if (!maxTicketsPerCycle || !maxProviderRequestsPerCycle) {
      throw new ForbiddenException('Helpdesk GLPI new-ticket ingestion requires explicit per-cycle ticket and provider-request limits.');
    }
    const horizonHours = numberPolicyOrNull(
      newTicketsOnly.hard_backfill_horizon_hours,
      1,
      24 * 30,
    ) ?? DEFAULT_BACKFILL_HORIZON_HOURS;
    const enabledAtMs = Date.parse(enabledAt);
    const horizonMs = Date.now() - horizonHours * 60 * 60 * 1000;
    const createdAfter = new Date(Math.max(enabledAtMs, horizonMs)).toISOString();
    if (!runGuardrailsFromDefinition(definition) || !dailyGuardrailCapsFromDefinition(definition)) {
      throw new ForbiddenException('Helpdesk GLPI new-ticket ingestion requires configured economic guardrails.');
    }

    return {
      enabled: true,
      enabledAt,
      createdAfter,
      entityId,
      categoryId,
      maxTicketsPerCycle,
      maxProviderRequestsPerCycle,
    };
  }

  runGuardrails(definition: AiAgentDefinition): HelpdeskRunGuardrailSummary {
    const guardrails = runGuardrailsFromDefinition(definition);
    if (!guardrails) {
      throw new ForbiddenException('Helpdesk GLPI triage run guardrails are not configured.');
    }
    return guardrails;
  }

  async getHelpdeskGlpiIngestionSettings(
    context: AiExecutionContextWithManager,
  ): Promise<HelpdeskGlpiIngestionSettingsView> {
    const { definition } = await this.ensureHelpdeskGlpiTriageDefinition(context);
    return this.buildIngestionSettingsView(definition);
  }

  async updateHelpdeskGlpiIngestionSettings(
    context: AiExecutionContextWithManager,
    input: HelpdeskGlpiIngestionSettingsInput,
  ): Promise<HelpdeskGlpiIngestionSettingsView> {
    const { definition } = await this.ensureHelpdeskGlpiTriageDefinition(context);
    const triggerPolicy = policyObject(definition.trigger_policy_json);
    const scopePolicy = policyObject(definition.scope_policy_json);
    const queuePolicy = policyObject(definition.queue_policy_json);
    const currentIngestion = nestedPolicy(scopePolicy, 'new_tickets_only');
    const wasEnabled = hasEnabledFlag(triggerPolicy, 'scheduled_poll') && currentIngestion.enabled === true;

    const ingestionInput = input?.ingestion;
    if (!isRecord(ingestionInput) || typeof ingestionInput.enabled !== 'boolean') {
      throw new BadRequestException('Ingestion settings require an explicit enabled flag.');
    }
    const enabled = ingestionInput.enabled === true;
    const entityId = trimmedSettingOrNull(ingestionInput.entityId);
    const categoryId = trimmedSettingOrNull(ingestionInput.categoryId);
    if (enabled && !entityId && !categoryId) {
      throw new BadRequestException('To watch GLPI tickets automatically, fill in at least one filter: a GLPI entity id or a category id.');
    }
    const maxTicketsPerCycle = settingNumberInRange(
      ingestionInput.maxTicketsPerCycle, 1, 20, DEFAULT_NEW_TICKET_MAX_PER_CYCLE, 'Max tickets per cycle');
    const maxProviderRequestsPerCycle = settingNumberInRange(
      ingestionInput.maxProviderRequestsPerCycle, 1, 100, DEFAULT_NEW_TICKET_RATE_LIMIT_PER_CYCLE, 'Max provider requests per cycle');
    const hardBackfillHorizonHours = settingNumberInRange(
      ingestionInput.hardBackfillHorizonHours, 1, 24 * 30, DEFAULT_BACKFILL_HORIZON_HOURS, 'Backfill horizon hours');

    const currentGuardrails = nestedPolicy(queuePolicy, 'economic_guardrails');
    const currentPerRun = policyObject(currentGuardrails.per_run);
    const currentDaily = policyObject(currentGuardrails.daily);
    const guardrailsInput = isRecord(input?.guardrails) ? input.guardrails : {};
    const perRunInput = policyObject((guardrailsInput as Record<string, unknown>).perRun);
    const dailyInput = policyObject((guardrailsInput as Record<string, unknown>).daily);
    const nextGuardrails = {
      configured: true,
      per_run: {
        max_estimated_tokens: settingPositiveNumber(
          perRunInput.maxEstimatedTokens, currentPerRun.max_estimated_tokens, DEFAULT_PER_RUN_TOKEN_CAP, 'Per-run token cap'),
        max_estimated_cost_eur: settingPositiveNumber(
          perRunInput.maxEstimatedCostEur, currentPerRun.max_estimated_cost_eur, DEFAULT_PER_RUN_COST_CAP_EUR, 'Per-run cost cap'),
      },
      daily: {
        max_agent_runs: settingPositiveNumber(
          dailyInput.maxAgentRuns, currentDaily.max_agent_runs, DEFAULT_DAILY_RUN_CAP, 'Daily run cap'),
        max_estimated_tokens: settingPositiveNumber(
          dailyInput.maxEstimatedTokens, currentDaily.max_estimated_tokens, DEFAULT_DAILY_TOKEN_CAP, 'Daily token cap'),
        max_estimated_cost_eur: settingPositiveNumber(
          dailyInput.maxEstimatedCostEur, currentDaily.max_estimated_cost_eur, DEFAULT_DAILY_COST_CAP_EUR, 'Daily cost cap'),
      },
    };

    // Re-enablement refreshes the horizon anchor so the disabled gap is never
    // backfilled. An already-enabled scope keeps its original anchor.
    const enabledAt = enabled
      ? (wasEnabled ? isoFromPolicy(currentIngestion.enabled_at) ?? new Date().toISOString() : new Date().toISOString())
      : isoFromPolicy(currentIngestion.enabled_at);

    definition.trigger_policy_json = {
      ...triggerPolicy,
      scheduled_poll: {
        ...(isRecord(triggerPolicy.scheduled_poll) ? triggerPolicy.scheduled_poll : {}),
        enabled,
      },
      production_polling_enabled: enabled,
      // Never operator-editable from this path.
      automatic_writes_enabled: false,
    };
    definition.scope_policy_json = {
      ...scopePolicy,
      new_tickets_only: {
        enabled,
        enabled_at: enabledAt,
        entity_id: entityId,
        category_id: categoryId,
        max_tickets_per_cycle: maxTicketsPerCycle,
        max_provider_requests_per_cycle: maxProviderRequestsPerCycle,
        hard_backfill_horizon_hours: hardBackfillHorizonHours,
      },
    };
    definition.queue_policy_json = {
      ...queuePolicy,
      economic_guardrails: nextGuardrails,
    };
    definition.updated_at = new Date();
    const saved = await this.definitionRepo(context).save(definition);

    await this.recordAuditEvent(context, {
      agentDefinitionId: saved.id,
      eventType: 'ingestion_settings_updated',
      severity: 'info',
      message: enabled
        ? 'Helpdesk GLPI ingestion settings updated; bounded new-ticket ingestion is enabled.'
        : 'Helpdesk GLPI ingestion settings updated; ingestion is disabled.',
      metadata: {
        enabled,
        entity_id: entityId,
        category_id: categoryId,
        max_tickets_per_cycle: maxTicketsPerCycle,
        max_provider_requests_per_cycle: maxProviderRequestsPerCycle,
        hard_backfill_horizon_hours: hardBackfillHorizonHours,
        economic_guardrails: nextGuardrails,
      },
    });

    return this.buildIngestionSettingsView(saved);
  }

  private buildIngestionSettingsView(definition: AiAgentDefinition): HelpdeskGlpiIngestionSettingsView {
    const triggerPolicy = policyObject(definition.trigger_policy_json);
    const scopePolicy = policyObject(definition.scope_policy_json);
    const queuePolicy = policyObject(definition.queue_policy_json);
    const ingestion = nestedPolicy(scopePolicy, 'new_tickets_only');
    const guardrails = nestedPolicy(queuePolicy, 'economic_guardrails');
    const perRun = policyObject(guardrails.per_run);
    const daily = policyObject(guardrails.daily);

    let ready = true;
    let readyReason: string | null = null;
    let effectiveCreatedAfter: string | null = null;
    try {
      this.assertHelpdeskGlpiDefinitionRunnable(definition, null);
      const config = this.resolveNewTicketsIngestionConfig(definition);
      effectiveCreatedAfter = config.createdAfter;
    } catch (error) {
      ready = false;
      readyReason = error instanceof Error ? error.message : String(error);
    }

    return {
      agentDefinitionId: definition.id,
      ingestion: {
        enabled: hasEnabledFlag(triggerPolicy, 'scheduled_poll') && ingestion.enabled === true,
        enabledAt: isoFromPolicy(ingestion.enabled_at),
        entityId: stringFromPolicy(ingestion.entity_id ?? ingestion.entityId),
        categoryId: stringFromPolicy(ingestion.category_id ?? ingestion.categoryId),
        maxTicketsPerCycle: numberPolicyOrNull(ingestion.max_tickets_per_cycle, 1, 20),
        maxProviderRequestsPerCycle: numberPolicyOrNull(ingestion.max_provider_requests_per_cycle, 1, 100),
        hardBackfillHorizonHours: numberPolicyOrNull(ingestion.hard_backfill_horizon_hours, 1, 24 * 30)
          ?? DEFAULT_BACKFILL_HORIZON_HOURS,
        ready,
        readyReason,
        effectiveCreatedAfter,
      },
      guardrails: {
        configured: guardrails.configured === true,
        perRun: {
          maxEstimatedTokens: positivePolicyNumber(perRun.max_estimated_tokens),
          maxEstimatedCostEur: positivePolicyNumber(perRun.max_estimated_cost_eur),
        },
        daily: {
          maxAgentRuns: positivePolicyNumber(daily.max_agent_runs),
          maxEstimatedTokens: positivePolicyNumber(daily.max_estimated_tokens),
          maxEstimatedCostEur: positivePolicyNumber(daily.max_estimated_cost_eur),
        },
      },
    };
  }

  workItemDedupKey(input: {
    agentDefinitionId: string;
    providerKind: string;
    providerKey: string;
    objectType: string;
    objectRef: string;
    workKind: string;
  }): string {
    return hashStableJson({
      agent_definition_id: input.agentDefinitionId,
      provider_kind: input.providerKind,
      provider_key: input.providerKey,
      object_type: input.objectType,
      object_ref: input.objectRef,
      work_kind: input.workKind,
    });
  }

  private queuePolicyNumber(definition: AiAgentDefinition, key: string, fallback: number, min: number, max: number): number {
    return numberFromPolicy(policyObject(definition.queue_policy_json)[key], fallback, min, max);
  }

  private retryCooldownSeconds(definition: AiAgentDefinition, attemptCount: number): number {
    const policy = policyObject(definition.queue_policy_json);
    const backoff = jsonArray(policy.retry_backoff_seconds)
      .map((entry) => typeof entry === 'number' && Number.isFinite(entry) ? Math.max(1, Math.floor(entry)) : null)
      .filter((entry): entry is number => entry !== null);
    return backoff[Math.max(0, attemptCount - 1)]
      ?? numberFromPolicy(policy.cooldown_seconds, DEFAULT_COOLDOWN_SECONDS, 1, 86_400);
  }

  private async refreshResolvedWaitingApproval(
    context: AiExecutionContextWithManager,
    workItem: AiAgentWorkItem,
  ): Promise<AiAgentWorkItem | null> {
    if (workItem.status !== 'waiting_approval') {
      return workItem;
    }
    const actionIds = (workItem.last_action_request_ids ?? []).filter((id) => typeof id === 'string' && id.length > 0);
    if (actionIds.length === 0) {
      workItem.status = 'completed';
      workItem.lease_owner = null;
      workItem.leased_until = null;
      workItem.updated_at = new Date();
      await this.workItemRepo(context).save(workItem);
      return null;
    }
    const linked = await this.actionRepo(context).find({
      where: {
        tenant_id: context.tenantId,
        id: In(actionIds),
      },
    });
    if (linked.length === actionIds.length && linked.every((action) => !activePendingAction(action))) {
      workItem.status = 'completed';
      workItem.lease_owner = null;
      workItem.leased_until = null;
      workItem.updated_at = new Date();
      await this.workItemRepo(context).save(workItem);
      return null;
    }
    return workItem;
  }

  private async findActiveWorkItem(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
    dedupKey: string,
  ): Promise<AiAgentWorkItem | null> {
    const rows = await this.workItemRepo(context).find({
      where: {
        tenant_id: context.tenantId,
        agent_definition_id: definition.id,
      },
    });
    const existing = rows
      .filter((row) => row.dedup_key === dedupKey && ACTIVE_WORK_ITEM_STATUSES.has(row.status))
      .sort((left, right) => {
        const leftTime = left.updated_at instanceof Date ? left.updated_at.getTime() : Date.parse(String(left.updated_at ?? ''));
        const rightTime = right.updated_at instanceof Date ? right.updated_at.getTime() : Date.parse(String(right.updated_at ?? ''));
        return rightTime - leftTime;
      })[0] ?? null;
    return existing ? this.refreshResolvedWaitingApproval(context, existing) : null;
  }

  async enqueueManualGlpiSafeTarget(
    context: AiExecutionContextWithManager,
    target: AgentQueueLiveTargetLike,
    metadata: Record<string, unknown> = {},
  ): Promise<EnqueueManualGlpiSafeTargetResult> {
    const bundle = await this.ensureHelpdeskGlpiTriageDefinition(context);
    this.assertHelpdeskGlpiDefinitionRunnable(bundle.definition, bundle.trigger);

    if (
      target.provider_kind !== 'ticketing'
      || target.provider_key !== 'glpi'
      || target.target_kind !== 'ticket'
      || target.allowed_effect !== 'read'
      || target.enabled !== true
    ) {
      throw new ForbiddenException('Manual Helpdesk GLPI triage requires an enabled read-only GLPI ticket safe target.');
    }

    const targetRef = normalizedTargetRef(target.external_ref);
    const dedupKey = this.workItemDedupKey({
      agentDefinitionId: bundle.definition.id,
      providerKind: target.provider_kind,
      providerKey: target.provider_key,
      objectType: target.target_kind,
      objectRef: targetRef,
      workKind: HELP_DESK_GLPI_TRIAGE_WORK_KIND,
    });
    const existing = await this.findActiveWorkItem(context, bundle.definition, dedupKey);
    if (existing) {
      return { ...bundle, workItem: existing, created: false };
    }

    const repo = this.workItemRepo(context);
    const now = new Date();
    const workItem = await repo.save(repo.create({
      tenant_id: context.tenantId,
      agent_definition_id: bundle.definition.id,
      trigger_id: bundle.trigger.id,
      source_provider_kind: target.provider_kind,
      source_provider_key: target.provider_key,
      source_object_type: target.target_kind,
      source_object_ref: targetRef,
      source_object_updated_at: null,
      work_kind: HELP_DESK_GLPI_TRIAGE_WORK_KIND,
      status: 'queued',
      priority: 100,
      dedup_key: dedupKey,
      lease_owner: null,
      leased_until: null,
      attempt_count: 0,
      max_attempts: this.queuePolicyNumber(bundle.definition, 'max_attempts', DEFAULT_MAX_ATTEMPTS, 1, 20),
      next_attempt_at: now,
      last_run_id: null,
      last_action_request_ids: null,
      last_error: null,
      metadata_json: {
        source: 'manual_safe_target',
        target_id: target.id,
        target_key: target.target_key,
        target_environment: target.environment,
        target_safety_label: target.safety_label,
        ...metadata,
      },
      created_at: now,
      updated_at: now,
    }));

    return { ...bundle, workItem, created: true };
  }

  async enqueueHelpdeskGlpiScopedTicket(
    context: AiExecutionContextWithManager,
    input: {
      definition: AiAgentDefinition;
      ticket: {
        id: string;
        updatedAt?: string | null;
        updated_at?: string | null;
        createdAt?: string | null;
        scope?: {
          entityId?: string | null;
          categoryId?: string | null;
        } | null;
      };
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<{ workItem: AiAgentWorkItem; created: boolean }> {
    this.assertHelpdeskGlpiDefinitionRunnable(input.definition, null);
    this.resolveNewTicketsIngestionConfig(input.definition);
    const targetRef = normalizedTargetRef(input.ticket.id);
    const dedupKey = this.workItemDedupKey({
      agentDefinitionId: input.definition.id,
      providerKind: 'ticketing',
      providerKey: 'glpi',
      objectType: 'ticket',
      objectRef: targetRef,
      workKind: HELP_DESK_GLPI_TRIAGE_WORK_KIND,
    });
    const existing = await this.findActiveWorkItem(context, input.definition, dedupKey);
    if (existing) {
      return { workItem: existing, created: false };
    }

    const repo = this.workItemRepo(context);
    const now = new Date();
    const workItem = await repo.save(repo.create({
      tenant_id: context.tenantId,
      agent_definition_id: input.definition.id,
      trigger_id: null,
      source_provider_kind: 'ticketing',
      source_provider_key: 'glpi',
      source_object_type: 'ticket',
      source_object_ref: targetRef,
      source_object_updated_at: dateFromUnknown(input.ticket.updatedAt ?? input.ticket.updated_at ?? input.ticket.createdAt),
      work_kind: HELP_DESK_GLPI_TRIAGE_WORK_KIND,
      status: 'queued',
      priority: 100,
      dedup_key: dedupKey,
      lease_owner: null,
      leased_until: null,
      attempt_count: 0,
      max_attempts: this.queuePolicyNumber(input.definition, 'max_attempts', DEFAULT_MAX_ATTEMPTS, 1, 20),
      next_attempt_at: now,
      last_run_id: null,
      last_action_request_ids: null,
      last_error: null,
      metadata_json: {
        source: 'scheduled_new_tickets_only',
        poller_scope: {
          entity_id: input.ticket.scope?.entityId ?? null,
          category_id: input.ticket.scope?.categoryId ?? null,
        },
        ticket_created_at: input.ticket.createdAt ?? null,
        ticket_updated_at: input.ticket.updatedAt ?? input.ticket.updated_at ?? null,
        ...(input.metadata ?? {}),
      },
      created_at: now,
      updated_at: now,
    }));

    return { workItem, created: true };
  }

  async acquireWorkItem(
    context: AiExecutionContextWithManager,
    workItemId: string,
    options: { leaseOwner: string; now?: Date } = { leaseOwner: 'agent-control-center' },
  ): Promise<AiAgentWorkItem> {
    const repo = this.workItemRepo(context);
    const workItem = await repo.findOne({ where: { id: workItemId, tenant_id: context.tenantId } });
    if (!workItem) {
      throw new NotFoundException('Agent work item not found.');
    }
    if (TERMINAL_WORK_ITEM_STATUSES.has(workItem.status) || workItem.status === 'waiting_approval') {
      throw new ForbiddenException('Agent work item is not runnable.');
    }
    if (!RETRYABLE_WORK_ITEM_STATUSES.has(workItem.status)) {
      throw new ForbiddenException('Agent work item is not in a leaseable state.');
    }

    const now = options.now ?? new Date();
    const leaseExpiry = dateFromUnknown(workItem.leased_until);
    if ((workItem.status === 'leased' || workItem.status === 'running') && leaseExpiry && leaseExpiry.getTime() > now.getTime()) {
      throw new ForbiddenException('Agent work item is already leased.');
    }
    const nextAttempt = dateFromUnknown(workItem.next_attempt_at);
    if (nextAttempt && nextAttempt.getTime() > now.getTime()) {
      throw new ForbiddenException('Agent work item is cooling down before retry.');
    }
    if (workItem.attempt_count >= workItem.max_attempts) {
      workItem.status = 'dead_letter';
      workItem.lease_owner = null;
      workItem.leased_until = null;
      workItem.last_error = workItem.last_error ?? 'Maximum attempts reached.';
      workItem.updated_at = now;
      await repo.save(workItem);
      throw new ForbiddenException('Agent work item exceeded its maximum attempts.');
    }

    const definition = await this.definitionRepo(context).findOne({
      where: {
        id: workItem.agent_definition_id,
        tenant_id: context.tenantId,
      },
    });
    if (!definition) {
      throw new ForbiddenException('Agent work item has no tenant-scoped definition.');
    }

    const ttlSeconds = this.queuePolicyNumber(definition, 'lease_ttl_seconds', DEFAULT_LEASE_TTL_SECONDS, 30, 86_400);
    workItem.status = 'leased';
    workItem.lease_owner = options.leaseOwner;
    workItem.leased_until = new Date(now.getTime() + ttlSeconds * 1000);
    workItem.attempt_count += 1;
    workItem.updated_at = now;
    return repo.save(workItem);
  }

  async markRunning(
    context: AiExecutionContextWithManager,
    workItem: AiAgentWorkItem,
    runId?: string | null,
  ): Promise<AiAgentWorkItem> {
    workItem.status = 'running';
    if (runId) {
      workItem.last_run_id = runId;
    }
    workItem.updated_at = new Date();
    return this.workItemRepo(context).save(workItem);
  }

  async markWaitingApproval(
    context: AiExecutionContextWithManager,
    workItem: AiAgentWorkItem,
    input: {
      runId: string;
      actionRequestIds: string[];
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<AiAgentWorkItem> {
    workItem.status = 'waiting_approval';
    workItem.last_run_id = input.runId;
    workItem.last_action_request_ids = Array.from(new Set(input.actionRequestIds));
    workItem.lease_owner = null;
    workItem.leased_until = null;
    workItem.last_error = null;
    workItem.metadata_json = {
      ...(isRecord(workItem.metadata_json) ? workItem.metadata_json : {}),
      ...(input.metadata ?? {}),
    };
    workItem.updated_at = new Date();
    return this.workItemRepo(context).save(workItem);
  }

  async completeWorkItem(
    context: AiExecutionContextWithManager,
    workItem: AiAgentWorkItem,
    input: {
      runId?: string | null;
      actionRequestIds?: string[] | null;
      metadata?: Record<string, unknown> | null;
    } = {},
  ): Promise<AiAgentWorkItem> {
    workItem.status = 'completed';
    workItem.last_run_id = input.runId ?? workItem.last_run_id ?? null;
    workItem.last_action_request_ids = input.actionRequestIds ?? workItem.last_action_request_ids ?? null;
    workItem.lease_owner = null;
    workItem.leased_until = null;
    workItem.last_error = null;
    workItem.metadata_json = {
      ...(isRecord(workItem.metadata_json) ? workItem.metadata_json : {}),
      ...(input.metadata ?? {}),
    };
    workItem.updated_at = new Date();
    return this.workItemRepo(context).save(workItem);
  }

  async failWorkItem(
    context: AiExecutionContextWithManager,
    workItem: AiAgentWorkItem,
    error: unknown,
  ): Promise<AiAgentWorkItem> {
    const repo = this.workItemRepo(context);
    const definition = await this.definitionRepo(context).findOne({
      where: { id: workItem.agent_definition_id, tenant_id: context.tenantId },
    });
    const now = new Date();
    const message = error instanceof Error ? error.message : String(error || 'Agent work item failed.');
    workItem.lease_owner = null;
    workItem.leased_until = null;
    workItem.last_error = message.slice(0, 2000);
    if (workItem.attempt_count >= workItem.max_attempts) {
      workItem.status = 'dead_letter';
      workItem.next_attempt_at = now;
    } else {
      workItem.status = 'failed';
      const cooldownSeconds = definition
        ? this.retryCooldownSeconds(definition, workItem.attempt_count)
        : DEFAULT_COOLDOWN_SECONDS;
      workItem.next_attempt_at = new Date(now.getTime() + cooldownSeconds * 1000);
    }
    workItem.updated_at = now;
    return repo.save(workItem);
  }

  async upsertTargetState(
    context: AiExecutionContextWithManager,
    input: {
      agentDefinitionId: string;
      providerKind: string;
      providerKey: string;
      targetType: string;
      targetRef: string;
      lastSeenExternalUpdatedAt?: Date | string | null;
      lastProcessedExternalUpdatedAt?: Date | string | null;
      lastRunId?: string | null;
      internalNoteHash?: string | null;
      publicReplyHash?: string | null;
      agentTouched?: boolean;
      needsFollowup?: boolean;
      state?: Record<string, unknown> | null;
    },
  ): Promise<AiAgentTargetState> {
    const repo = this.targetStateRepo(context);
    const targetRef = normalizedTargetRef(input.targetRef);
    let state = await repo.findOne({
      where: {
        tenant_id: context.tenantId,
        agent_definition_id: input.agentDefinitionId,
        provider_kind: input.providerKind,
        provider_key: input.providerKey,
        target_type: input.targetType,
        target_ref: targetRef,
      },
    });
    const now = new Date();
    if (!state) {
      state = repo.create({
        tenant_id: context.tenantId,
        agent_definition_id: input.agentDefinitionId,
        provider_kind: input.providerKind,
        provider_key: input.providerKey,
        target_type: input.targetType,
        target_ref: targetRef,
        last_seen_external_updated_at: null,
        last_processed_external_updated_at: null,
        last_run_id: null,
        last_public_reply_hash: null,
        last_internal_note_hash: null,
        last_classification_hash: null,
        last_assignment_hash: null,
        agent_touched: false,
        needs_followup: false,
        state_json: null,
        created_at: now,
        updated_at: now,
      });
    }

    state.last_seen_external_updated_at = dateFromUnknown(input.lastSeenExternalUpdatedAt) ?? state.last_seen_external_updated_at;
    state.last_processed_external_updated_at = dateFromUnknown(input.lastProcessedExternalUpdatedAt) ?? state.last_processed_external_updated_at;
    state.last_run_id = input.lastRunId ?? state.last_run_id ?? null;
    state.last_internal_note_hash = input.internalNoteHash ?? state.last_internal_note_hash ?? null;
    state.last_public_reply_hash = input.publicReplyHash ?? state.last_public_reply_hash ?? null;
    state.agent_touched = input.agentTouched ?? state.agent_touched;
    state.needs_followup = input.needsFollowup ?? state.needs_followup;
    state.state_json = {
      ...(isRecord(state.state_json) ? state.state_json : {}),
      ...(input.state ?? {}),
    };
    state.updated_at = now;
    return repo.save(state);
  }

  async recordManualGlpiTriageOutcome(
    context: AiExecutionContextWithManager,
    input: {
      definition: AiAgentDefinition;
      workItem: AiAgentWorkItem;
      runId: string;
      actionRequestIds: string[];
      ticket: {
        id: string;
        updatedAt?: string | null;
        updated_at?: string | null;
      };
      knowledgeResultCount: number;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<{ workItem: AiAgentWorkItem; targetState: AiAgentTargetState }> {
    const uniqueActionIds = Array.from(new Set(input.actionRequestIds));
    const actions = uniqueActionIds.length > 0
      ? await this.actionRepo(context).find({
        where: {
          tenant_id: context.tenantId,
          id: In(uniqueActionIds),
        },
      })
      : [];
    const internalAction = actions.find((action) => action.capability_name === TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY) ?? null;
    const publicAction = actions.find((action) => action.capability_name === TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY) ?? null;
    const externalUpdatedAt = input.ticket.updatedAt ?? input.ticket.updated_at ?? null;

    const targetState = await this.upsertTargetState(context, {
      agentDefinitionId: input.definition.id,
      providerKind: 'ticketing',
      providerKey: 'glpi',
      targetType: 'ticket',
      targetRef: input.ticket.id,
      lastSeenExternalUpdatedAt: externalUpdatedAt,
      lastProcessedExternalUpdatedAt: externalUpdatedAt,
      lastRunId: input.runId,
      internalNoteHash: actionBodyHash(internalAction),
      publicReplyHash: actionBodyHash(publicAction),
      agentTouched: actions.length > 0 ? true : undefined,
      needsFollowup: actions.some(activePendingAction),
      state: {
        latest_work_item_id: input.workItem.id,
        latest_action_request_ids: uniqueActionIds,
        knowledge_result_count: input.knowledgeResultCount,
        last_triage_at: new Date().toISOString(),
        ...(input.metadata ?? {}),
      },
    });

    const workItem = uniqueActionIds.length > 0
      ? await this.markWaitingApproval(context, input.workItem, {
        runId: input.runId,
        actionRequestIds: uniqueActionIds,
        metadata: {
          latest_target_state_id: targetState.id,
          knowledge_result_count: input.knowledgeResultCount,
          ...(input.metadata ?? {}),
        },
      })
      : await this.completeWorkItem(context, input.workItem, {
        runId: input.runId,
        actionRequestIds: [],
        metadata: {
          latest_target_state_id: targetState.id,
          knowledge_result_count: input.knowledgeResultCount,
          ...(input.metadata ?? {}),
        },
      });

    return { workItem, targetState };
  }

  async recordAuditEvent(
    context: AiExecutionContextWithManager,
    input: {
      agentDefinitionId?: string | null;
      workItemId?: string | null;
      eventType: string;
      severity?: string | null;
      message: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<AiAgentAuditEvent> {
    const repo = this.auditRepo(context);
    return repo.save(repo.create({
      tenant_id: context.tenantId,
      agent_definition_id: input.agentDefinitionId ?? null,
      work_item_id: input.workItemId ?? null,
      event_type: input.eventType,
      severity: input.severity ?? 'info',
      message: input.message,
      metadata_json: input.metadata ?? null,
      created_at: new Date(),
    }));
  }

  async hasActiveEmergencyPause(context: AiExecutionContextWithManager): Promise<AiEmergencyPause | null> {
    const pauses = await this.pauseRepo(context).find({
      where: {
        tenant_id: context.tenantId,
        active: true,
      },
    });
    const now = Date.now();
    return pauses.find((pause) => {
      const expiresAt = dateFromUnknown(pause.expires_at);
      return !expiresAt || expiresAt.getTime() > now;
    }) ?? null;
  }

  async dailyUsageSummary(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
    now = new Date(),
  ): Promise<HelpdeskDailyUsageSummary> {
    const caps = dailyGuardrailCapsFromDefinition(definition);
    if (!caps) {
      throw new ForbiddenException('Helpdesk GLPI daily guardrails are not configured.');
    }
    const windowStart = midnightUtc(now);
    const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
    const rows = await this.runRepo(context).find({
      where: {
        tenant_id: context.tenantId,
      },
    });
    const usage = { tokens: 0, cost: 0 };
    const runs = rows.filter((run) =>
      definitionIdFromMetadata(run.metadata_json) === definition.id
      && isWithinWindow(run.created_at ?? run.started_at, windowStart, windowEnd),
    );
    for (const run of runs) {
      addEstimatedUsage(usage, run);
    }
    const reachedReasons: string[] = [];
    if (runs.length >= caps.maxRuns) {
      reachedReasons.push('daily_run_cap');
    }
    if (usage.tokens >= caps.maxTokens) {
      reachedReasons.push('daily_token_cap');
    }
    if (usage.cost >= caps.maxCostEur) {
      reachedReasons.push('daily_cost_cap');
    }
    return {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      runs: runs.length,
      estimatedTokens: usage.tokens,
      estimatedCostEur: Number(usage.cost.toFixed(6)),
      cap: caps,
      reached: reachedReasons.length > 0,
      reachedReasons,
    };
  }

  async assertDailyCapAvailable(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
  ): Promise<HelpdeskDailyUsageSummary> {
    const summary = await this.dailyUsageSummary(context, definition);
    if (summary.reached) {
      await this.recordAuditEvent(context, {
        agentDefinitionId: definition.id,
        eventType: 'daily_cap_reached',
        severity: 'warning',
        message: 'Helpdesk GLPI ingestion paused because the tenant daily agent run cap was reached.',
        metadata: {
          daily_usage: summary,
        },
      });
      await this.updateHelpdeskIngestionState(context, definition, {
        status: 'paused',
        reason: summary.reachedReasons.join(','),
        daily_usage: summary,
      });
      throw new ForbiddenException('Helpdesk GLPI ingestion is paused because the tenant daily cap has been reached.');
    }
    return summary;
  }

  async updateHelpdeskIngestionState(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
    state: Record<string, unknown>,
  ): Promise<AiAgentDefinition> {
    definition.metadata_json = {
      ...(isRecord(definition.metadata_json) ? definition.metadata_json : {}),
      helpdesk_ingestion_state: {
        ...(isRecord(definition.metadata_json?.helpdesk_ingestion_state) ? definition.metadata_json.helpdesk_ingestion_state : {}),
        ...state,
        updated_at: new Date().toISOString(),
      },
    };
    definition.updated_at = new Date();
    return this.definitionRepo(context).save(definition);
  }

  private async helpdeskEvaluationSummary(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
    now = new Date(),
  ): Promise<HelpdeskGlpiAgentSummary['evaluation']> {
    const windowEnd = now;
    const windowStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const [actions, runs, targetStates] = await Promise.all([
      this.actionRepo(context).find({
        where: {
          tenant_id: context.tenantId,
          provider_kind: 'ticketing',
          provider_key: 'glpi',
        },
      }),
      this.runRepo(context).find({
        where: {
          tenant_id: context.tenantId,
        },
      }),
      this.targetStateRepo(context).find({
        where: {
          tenant_id: context.tenantId,
          agent_definition_id: definition.id,
        },
      }),
    ]);
    const relevantActions = actions.filter((action) =>
      HELPDESK_REVIEW_ACTION_CAPABILITIES.includes(action.capability_name)
      && definitionIdFromMetadata(action.metadata_json) === definition.id
      && isWithinWindow(action.created_at, windowStart, windowEnd),
    );
    const proposalsByActionClass: Record<string, number> = {};
    const terminalByStatus: Record<string, number> = {};
    const rejectionReasons: Record<string, number> = {};
    const approvalLatencies: number[] = [];
    let accepted = 0;
    let terminalReviewed = 0;

    for (const action of relevantActions) {
      incrementCounter(proposalsByActionClass, actionClass(action));
      if (['executed', 'rejected', 'expired', 'failed'].includes(action.status)) {
        incrementCounter(terminalByStatus, action.status);
      }
      if (action.status === 'executed') {
        accepted += 1;
        terminalReviewed += 1;
        const latency = secondsBetween(action.created_at, action.approved_at ?? action.executed_at);
        if (latency !== null) {
          approvalLatencies.push(latency);
        }
      } else if (action.status === 'rejected') {
        terminalReviewed += 1;
        incrementCounter(rejectionReasons, action.error_message?.trim() || 'rejected_without_reason');
      }
    }

    const relevantRuns = runs.filter((run) =>
      definitionIdFromMetadata(run.metadata_json) === definition.id
      && isWithinWindow(run.created_at ?? run.started_at, windowStart, windowEnd),
    );
    const usage = { tokens: 0, cost: 0 };
    for (const run of relevantRuns) {
      addEstimatedUsage(usage, run);
    }
    const ticketRefs = new Set(targetStates
      .filter((state) => isWithinWindow(state.updated_at, windowStart, windowEnd))
      .map((state) => state.target_ref));
    const ticketCount = Math.max(1, ticketRefs.size);
    const kbHits = targetStates.filter((state) => {
      if (!isWithinWindow(state.updated_at, windowStart, windowEnd)) {
        return false;
      }
      const stateJson = policyObject(state.state_json);
      return numericMetadata(stateJson.knowledge_result_count) > 0;
    }).length;

    return {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      proposalsByActionClass,
      terminalByStatus,
      acceptanceRate: terminalReviewed > 0 ? Number((accepted / terminalReviewed).toFixed(4)) : null,
      rejectionReasons,
      medianApprovalLatencySeconds: median(approvalLatencies),
      runsPerTicket: ticketRefs.size > 0 ? Number((relevantRuns.length / ticketCount).toFixed(4)) : null,
      tokensPerTicket: ticketRefs.size > 0 ? Number((usage.tokens / ticketCount).toFixed(2)) : null,
      costPerTicketEur: ticketRefs.size > 0 ? Number((usage.cost / ticketCount).toFixed(6)) : null,
      kbHitRate: ticketRefs.size > 0 ? Number((kbHits / ticketCount).toFixed(4)) : null,
    };
  }

  private async helpdeskSummary(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
  ): Promise<HelpdeskGlpiAgentSummary> {
    let ingestionConfig: HelpdeskNewTicketsIngestionConfig | null = null;
    try {
      ingestionConfig = this.resolveNewTicketsIngestionConfig(definition);
    } catch {
      ingestionConfig = null;
    }
    const ingestionState = policyObject(policyObject(definition.metadata_json).helpdesk_ingestion_state);
    const daily = dailyGuardrailCapsFromDefinition(definition)
      ? await this.dailyUsageSummary(context, definition)
      : null;
    return {
      agentDefinitionId: definition.id,
      ingestion: {
        enabled: !!ingestionConfig,
        mode: ingestionConfig ? 'new_tickets_only' : 'disabled',
        paused: stringFromPolicy(ingestionState.status) === 'paused',
        pauseReason: stringFromPolicy(ingestionState.reason),
        enabledAt: ingestionConfig?.enabledAt ?? null,
        createdAfter: ingestionConfig?.createdAfter ?? null,
        entityId: ingestionConfig?.entityId ?? null,
        categoryId: ingestionConfig?.categoryId ?? null,
        maxTicketsPerCycle: ingestionConfig?.maxTicketsPerCycle ?? null,
        maxProviderRequestsPerCycle: ingestionConfig?.maxProviderRequestsPerCycle ?? null,
        lastPollAt: isoFromPolicy(ingestionState.last_poll_at),
        lastPollStatus: stringFromPolicy(ingestionState.last_poll_status),
        lastAuditEventId: stringFromPolicy(ingestionState.last_audit_event_id),
      },
      guardrails: {
        configured: !!runGuardrailsFromDefinition(definition) && !!dailyGuardrailCapsFromDefinition(definition),
        perRun: runGuardrailsFromDefinition(definition),
        daily,
      },
      evaluation: await this.helpdeskEvaluationSummary(context, definition),
    };
  }

  async listOverview(
    context: AiExecutionContextWithManager,
    options: { limit?: number } = {},
  ): Promise<AgentQueueOverview> {
    await this.ensureHelpdeskGlpiTriageDefinition(context);
    const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 50)));
    const definitions = (await this.definitionRepo(context).find({ where: { tenant_id: context.tenantId } }))
      .sort((left, right) => left.agent_key.localeCompare(right.agent_key));
    const refreshedWorkItems: AiAgentWorkItem[] = [];
    for (const workItem of await this.workItemRepo(context).find({ where: { tenant_id: context.tenantId } })) {
      refreshedWorkItems.push(await this.refreshResolvedWaitingApproval(context, workItem) ?? workItem);
    }
    const workItems = refreshedWorkItems
      .sort((left, right) => {
        const leftTime = left.updated_at instanceof Date ? left.updated_at.getTime() : Date.parse(String(left.updated_at ?? ''));
        const rightTime = right.updated_at instanceof Date ? right.updated_at.getTime() : Date.parse(String(right.updated_at ?? ''));
        return rightTime - leftTime;
      })
      .slice(0, limit);
    const targetStates = (await this.targetStateRepo(context).find({ where: { tenant_id: context.tenantId } }))
      .sort((left, right) => {
        const leftTime = left.updated_at instanceof Date ? left.updated_at.getTime() : Date.parse(String(left.updated_at ?? ''));
        const rightTime = right.updated_at instanceof Date ? right.updated_at.getTime() : Date.parse(String(right.updated_at ?? ''));
        return rightTime - leftTime;
      })
      .slice(0, limit);
    const counts = workItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
    const helpdeskDefinition = definitions.find((definition) => definition.agent_key === HELP_DESK_GLPI_TRIAGE_AGENT_KEY) ?? null;
    const auditEvents = helpdeskDefinition
      ? (await this.auditRepo(context).find({
        where: {
          tenant_id: context.tenantId,
          agent_definition_id: helpdeskDefinition.id,
        },
      }))
        .sort((left, right) => {
          const leftTime = left.created_at instanceof Date ? left.created_at.getTime() : Date.parse(String(left.created_at ?? ''));
          const rightTime = right.created_at instanceof Date ? right.created_at.getTime() : Date.parse(String(right.created_at ?? ''));
          return rightTime - leftTime;
        })
        .slice(0, 10)
      : [];
    return {
      definitions,
      workItems,
      targetStates,
      counts,
      helpdesk: {
        summary: helpdeskDefinition ? await this.helpdeskSummary(context, helpdeskDefinition) : null,
        auditEvents,
      },
    };
  }

  agentExecutionMetadata(definition: AiAgentDefinition, workItem: AiAgentWorkItem): Record<string, unknown> {
    return {
      agent_definition_id: definition.id,
      agent_key: definition.agent_key,
      agent_type: definition.agent_type,
      agent_environment: definition.environment,
      agent_work_item_id: workItem.id,
      agent_work_kind: workItem.work_kind,
      agent_work_status: workItem.status,
      agent_dedup_key: workItem.dedup_key,
    };
  }
}
