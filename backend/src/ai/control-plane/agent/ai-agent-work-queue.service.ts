import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { In, Not } from 'typeorm';
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
import {
  deriveServiceDeskTargetingFetchConfig,
  normalizeServiceDeskScopePolicy,
  normalizeServiceDeskTargeting,
  OPEN_TICKET_STATUS_VALUES,
  TargetingPreviewSummary,
  ticketMatchesServiceDeskTargeting,
} from './service-desk-targeting';

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
const DEFAULT_REVIEW_COOLDOWN_SECONDS = 24 * 60 * 60;
const DEFAULT_TARGET_CLAIM_LEASE_SECONDS = 10 * 60;
// A single approval window applies to every proposal an agent prepares, so all proposals for
// one ticket (prepared in the same run) become applicable together and expire together. There
// is no per-action-class TTL: a status change to closed/solved is ordinary routine work and
// shares the same window as any reply or note.
export const DEFAULT_APPROVAL_TTL_SECONDS = 24 * 60 * 60;
export const MIN_APPROVAL_TTL_SECONDS = 60;
export const MAX_APPROVAL_TTL_SECONDS = 30 * 24 * 60 * 60;

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
  { name: 'web_search', version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' },
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
  },
  {
    name: TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
  },
  {
    name: TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
  },
  {
    name: TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
  },
  {
    name: TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
  },
  {
    name: TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
    version: '1.0.0',
    effect: 'write',
    max_autonomy_level: 'A3',
    approval: 'human',
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

export type TargetReviewReadiness = {
  state: AiAgentTargetState;
  ready: boolean;
  changed: boolean;
  due: boolean;
  reason: 'first_review' | 'changed' | 'scheduled' | 'not_due';
};

export type TargetClaimAcquireResult = {
  acquired: boolean;
  status: 'claimed' | 'deferred' | 'superseded';
  state: AiAgentTargetState | null;
  ownerAgentDefinitionId?: string | null;
  ownerPriority?: number | null;
  ownerWorkItemId?: string | null;
  claimExpiresAt?: string | null;
  reason?: string | null;
};

export type AgentQueueOverview = {
  definitions: AiAgentDefinition[];
  workItems: AiAgentWorkItem[];
  targetStates: AiAgentTargetState[];
  counts: Record<string, number>;
  helpdesk: {
    summary: HelpdeskGlpiAgentSummary | null;
    summaries: HelpdeskGlpiAgentSummary[];
    fleet: HelpdeskGlpiAgentSummary['evaluation'] | null;
    auditEvents: AiAgentAuditEvent[];
  };
};

export type HelpdeskScopeMode = 'new_tickets_only' | 'all_open' | 'agent_involved';

export type HelpdeskNewTicketsIngestionConfig = {
  enabled: true;
  mode: HelpdeskScopeMode;
  enabledAt: string;
  // new_tickets_only: created-after horizon. null for the other modes.
  createdAfter: string | null;
  // all_open / agent_involved: only tickets unchanged since this cutoff (stale).
  lastChangedBefore?: string | null;
  statusValues: string[];
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

export type HelpdeskEmergencyPauseSummary = {
  id: string;
  active: boolean;
  scope: string | null;
  agent_definition_id: string | null;
  reason: string;
  created_at: string | null;
  expires_at: string | null;
};

export type HelpdeskGlpiAgentSummary = {
  agentDefinitionId: string;
  ingestion: {
    enabled: boolean;
    mode: 'disabled' | HelpdeskScopeMode;
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
  emergencyPause: HelpdeskEmergencyPauseSummary | null;
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

function sameNullableTime(left: unknown, right: unknown): boolean {
  const leftDate = dateFromUnknown(left);
  const rightDate = dateFromUnknown(right);
  if (!leftDate && !rightDate) {
    return true;
  }
  return !!leftDate && !!rightDate && leftDate.getTime() === rightDate.getTime();
}

function sameStringSet(left: unknown, right: unknown): boolean {
  const normalize = (value: unknown) => Array.isArray(value)
    ? value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0).sort()
    : [];
  const leftValues = normalize(left);
  const rightValues = normalize(right);
  return leftValues.length === rightValues.length
    && leftValues.every((value, index) => value === rightValues[index]);
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

function toIsoDate(value: unknown): string | null {
  const date = dateFromUnknown(value);
  return date ? date.toISOString() : null;
}

function clampApprovalTtlSeconds(value: number): number {
  return Math.max(MIN_APPROVAL_TTL_SECONDS, Math.min(MAX_APPROVAL_TTL_SECONDS, Math.floor(value)));
}

// Resolve the agent's single approval window from queue policy. Prefers the new
// approval_ttl_seconds; falls back to the longest entry of the legacy per-action-class map
// (so migrating an existing agent never shortens any proposal's window); else the default.
function normalizeApprovalTtlSeconds(queuePolicy: unknown): number {
  const policy = isRecord(queuePolicy) ? queuePolicy : {};
  const direct = typeof policy.approval_ttl_seconds === 'number'
    ? policy.approval_ttl_seconds
    : Number(policy.approval_ttl_seconds);
  if (Number.isFinite(direct) && direct > 0) {
    return clampApprovalTtlSeconds(direct);
  }
  const legacy = policy.approval_ttl_seconds_by_action_class;
  if (isRecord(legacy)) {
    const seconds = Object.values(legacy)
      .map((raw) => (typeof raw === 'number' ? raw : Number(raw)))
      .filter((raw): raw is number => Number.isFinite(raw) && raw > 0);
    if (seconds.length > 0) {
      return clampApprovalTtlSeconds(Math.max(...seconds));
    }
  }
  return DEFAULT_APPROVAL_TTL_SECONDS;
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
        agent_priority: 100,
        trigger_policy_json: {
          manual_safe_target: { enabled: true },
          scheduled_poll: { enabled: false },
          saved_filter: { enabled: false },
          provider_webhook: { enabled: false },
          ticket_update: { enabled: false },
          production_polling_enabled: false,
          automatic_writes_enabled: false,
        },
        scope_policy_json: normalizeServiceDeskScopePolicy({
          mode: 'manual_safe_target',
          allowed_modes: ['manual_safe_target', 'new_tickets_only', 'new_plus_agent_touched', 'saved_filter'],
          provider_kind: 'ticketing',
          provider_key: 'glpi',
          target_kind: 'ticket',
          required_safe_target_effect: 'read',
          new_tickets_only: { enabled: false },
          new_plus_agent_touched: { enabled: false },
          saved_filter: { enabled: false },
          all_matching: { enabled: false },
          freeform_live_object_ids: false,
          knowledge_sources: {
            knowledge: { enabled: true, all_libraries: true, library_ids: [] },
            web: { enabled: false },
            precedence: 'knowledge_first',
          },
        }),
        queue_policy_json: {
          enabled: true,
          dedup_mode: 'active_work_item',
          lease_ttl_seconds: DEFAULT_LEASE_TTL_SECONDS,
          max_attempts: DEFAULT_MAX_ATTEMPTS,
          cooldown_seconds: DEFAULT_COOLDOWN_SECONDS,
          review_cooldown_seconds: DEFAULT_REVIEW_COOLDOWN_SECONDS,
          on_conflict: 'defer',
          approval_ttl_seconds: DEFAULT_APPROVAL_TTL_SECONDS,
          on_stale_by_action_class: {
            public_reply: 're_review',
            internal_note: 're_review',
            classification: 're_review',
            status: 're_review',
          },
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
        persona_json: {
          mission: 'Triage GLPI helpdesk tickets, gather supporting KANAP knowledge, and prepare safe follow-up proposals for review.',
          tone: 'Clear, concise, and support-oriented.',
          instructions: [
            'Prefer internal notes when evidence is incomplete or the next step needs analyst review.',
            'Prepare requester replies only when a newer requester message needs a direct response.',
            'Do not broaden capabilities or execute writes from persona instructions.',
          ],
          escalation_text: 'Escalate to a human operator when the request is ambiguous, high-impact, or lacks reliable evidence.',
        },
        config_version: 1,
        updated_by_user_id: null,
        metadata_json: {
          product_owned: true,
          phase: 11,
          production_polling_enabled: false,
          production_a4_enabled: false,
        },
        created_at: new Date(),
        updated_at: new Date(),
      }));
    } else if (!isRecord(definition.metadata_json) || definition.metadata_json.user_modified !== true) {
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
        new_tickets_only: isRecord(currentScopePolicy.new_tickets_only) ? currentScopePolicy.new_tickets_only : { enabled: false },
        new_plus_agent_touched: { enabled: false },
        saved_filter: isRecord(currentScopePolicy.saved_filter) ? currentScopePolicy.saved_filter : { enabled: false },
        all_matching: { enabled: false },
        freeform_live_object_ids: false,
      };
      const normalizedDesiredScopePolicy = normalizeServiceDeskScopePolicy(desiredScopePolicy);
      const { approval_ttl_seconds_by_action_class: _legacyApprovalTtl, ...currentQueuePolicyRest } = currentQueuePolicy;
      const desiredQueuePolicy = {
        ...currentQueuePolicyRest,
        enabled: currentQueuePolicy.enabled === false ? false : true,
        dedup_mode: currentQueuePolicy.dedup_mode ?? 'active_work_item',
        lease_ttl_seconds: numberFromPolicy(currentQueuePolicy.lease_ttl_seconds, DEFAULT_LEASE_TTL_SECONDS, 30, 86_400),
        max_attempts: numberFromPolicy(currentQueuePolicy.max_attempts, DEFAULT_MAX_ATTEMPTS, 1, 20),
        cooldown_seconds: numberFromPolicy(currentQueuePolicy.cooldown_seconds, DEFAULT_COOLDOWN_SECONDS, 1, 86_400),
        review_cooldown_seconds: numberFromPolicy(currentQueuePolicy.review_cooldown_seconds, DEFAULT_REVIEW_COOLDOWN_SECONDS, 60, 30 * 24 * 60 * 60),
        on_conflict: currentQueuePolicy.on_conflict === 'supersede' ? 'supersede' : 'defer',
        approval_ttl_seconds: normalizeApprovalTtlSeconds(currentQueuePolicy),
        on_stale_by_action_class: isRecord(currentQueuePolicy.on_stale_by_action_class)
          ? currentQueuePolicy.on_stale_by_action_class
          : {
            public_reply: 're_review',
            internal_note: 're_review',
            classification: 're_review',
            status: 're_review',
          },
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
        scope_policy_json: normalizedDesiredScopePolicy,
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
      this.resolveScopeIngestionConfig(definition);
    } else if (triggerPolicy.production_polling_enabled === true) {
      throw new ForbiddenException('Production polling requires a bounded scheduled-poll scope.');
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
    const config = this.resolveScopeIngestionConfig(definition);
    if (config.mode !== 'new_tickets_only') {
      throw new ForbiddenException('Helpdesk GLPI new-ticket ingestion requires a created-at targeting predicate.');
    }
    return config;
  }

  // Resolve the configured ticket-selection scope for an agent. Canonical
  // targeting predicates are the source of truth; legacy mode blocks remain as
  // compatibility storage for enablement timestamps, per-cycle caps, and older
  // agents. The provider fetch is still bounded and every candidate is locally
  // rechecked against the complete predicate set after listing.
  resolveScopeIngestionConfig(definition: AiAgentDefinition): HelpdeskNewTicketsIngestionConfig {
    const triggerPolicy = policyObject(definition.trigger_policy_json);
    const rawScopePolicy = policyObject(definition.scope_policy_json);
    const scopePolicy = policyObject(normalizeServiceDeskScopePolicy(rawScopePolicy));
    const targeting = normalizeServiceDeskTargeting(scopePolicy);
    const derivedScope = deriveServiceDeskTargetingFetchConfig(targeting);
    const rawHasTargeting = isRecord(rawScopePolicy.targeting) && Array.isArray(rawScopePolicy.targeting.predicates);

    if (!hasEnabledFlag(triggerPolicy, 'scheduled_poll')) {
      throw new ForbiddenException('Automatic GLPI ticket watching is turned off. Enable it in the agent settings.');
    }
    if (triggerPolicy.automatic_writes_enabled === true) {
      throw new ForbiddenException('Helpdesk GLPI ingestion cannot run with automatic writes enabled.');
    }
    if (hasEnabledFlag(scopePolicy, 'all_matching') || scopePolicy.freeform_live_object_ids === true) {
      throw new ForbiddenException('Helpdesk GLPI ingestion requires a bounded scope.');
    }

    const mode = derivedScope.mode;
    const modeBlock = nestedPolicy(scopePolicy, mode);
    const legacyMode = stringFromPolicy(scopePolicy.mode);
    const legacyBlock = legacyMode ? nestedPolicy(scopePolicy, legacyMode) : {};
    const newTicketsOnly = nestedPolicy(scopePolicy, 'new_tickets_only');
    const allOpen = nestedPolicy(scopePolicy, 'all_open');
    const agentInvolved = nestedPolicy(scopePolicy, 'agent_involved');
    const candidateBlocks = [modeBlock, legacyBlock, newTicketsOnly, allOpen, agentInvolved];
    const configBlock = candidateBlocks.find((block) =>
      block.enabled === true
      || block.max_tickets_per_cycle != null
      || block.max_provider_requests_per_cycle != null,
    ) ?? {};
    const explicitActiveBlock = [modeBlock, legacyBlock].find((block) => block.enabled === true);
    if (
      explicitActiveBlock
      && (
        !numberPolicyOrNull(explicitActiveBlock.max_tickets_per_cycle, 1, 20)
        || !numberPolicyOrNull(explicitActiveBlock.max_provider_requests_per_cycle, 1, 100)
      )
    ) {
      throw new ForbiddenException('This ticket-selection mode requires explicit per-cycle ticket and provider-request limits.');
    }
    const enabledAt = isoFromPolicy(configBlock.enabled_at)
      ?? isoFromPolicy(newTicketsOnly.enabled_at)
      ?? isoFromPolicy(allOpen.enabled_at)
      ?? isoFromPolicy(agentInvolved.enabled_at)
      ?? new Date().toISOString();
    const maxTicketsPerCycle = numberPolicyOrNull(configBlock.max_tickets_per_cycle, 1, 20)
      ?? DEFAULT_NEW_TICKET_MAX_PER_CYCLE;
    const maxProviderRequestsPerCycle = numberPolicyOrNull(configBlock.max_provider_requests_per_cycle, 1, 100)
      ?? DEFAULT_NEW_TICKET_RATE_LIMIT_PER_CYCLE;
    if (!runGuardrailsFromDefinition(definition) || !dailyGuardrailCapsFromDefinition(definition)) {
      throw new ForbiddenException('Helpdesk GLPI ingestion requires configured economic guardrails.');
    }

    const horizonHours = derivedScope.createdAfterRelativeHours
      ?? numberPolicyOrNull(newTicketsOnly.hard_backfill_horizon_hours, 1, 24 * 30)
      ?? DEFAULT_BACKFILL_HORIZON_HOURS;
    const createdAfter = mode === 'new_tickets_only'
      ? derivedScope.createdAfter ?? new Date(Date.now() - horizonHours * 60 * 60 * 1000).toISOString()
      : null;
    const lastChangedBefore = derivedScope.lastChangedBefore;
    const entityId = derivedScope.entityId
      ?? (!rawHasTargeting ? stringFromPolicy(configBlock.entity_id ?? configBlock.entityId) : null);
    const categoryId = derivedScope.categoryId
      ?? (!rawHasTargeting ? stringFromPolicy(configBlock.category_id ?? configBlock.categoryId) : null);

    return {
      enabled: true,
      mode,
      enabledAt,
      createdAfter,
      lastChangedBefore,
      statusValues: derivedScope.statusValues,
      entityId,
      categoryId,
      maxTicketsPerCycle,
      maxProviderRequestsPerCycle,
    };
  }

  // Ticket refs this agent previously acted on (agent_touched target states),
  // oldest-updated first. Backs the `agent_involved` scope mode — control-plane
  // state, kept out of the GLPI provider.
  async listAgentTouchedTicketRefs(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
    limit: number,
  ): Promise<string[]> {
    const rows = await this.targetStateRepo(context).find({
      where: {
        tenant_id: context.tenantId,
        agent_definition_id: definition.id,
        provider_kind: 'ticketing',
        provider_key: 'glpi',
        target_type: 'ticket',
        agent_touched: true,
      },
      order: { updated_at: 'ASC' },
      take: Math.max(1, Math.min(Math.floor(limit), 20)),
    });
    return rows
      .map((row) => row.target_ref)
      .filter((ref): ref is string => typeof ref === 'string' && ref.trim().length > 0);
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

    // enabled_at is informational (audit/UI) since the catch-up window became
    // an absolute lookback; re-enabling still refreshes it for traceability.
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
    const targetingPredicates: Array<{ field: string; operator: 'eq' | 'in' | 'gte'; value: unknown }> = [
      { field: 'created_at', operator: 'gte', value: { relative_hours: hardBackfillHorizonHours } },
      { field: 'status', operator: 'in', value: OPEN_TICKET_STATUS_VALUES },
    ];
    if (entityId) {
      targetingPredicates.push({ field: 'entity', operator: 'eq', value: entityId });
    }
    if (categoryId) {
      targetingPredicates.push({ field: 'category', operator: 'eq', value: categoryId });
    }

    definition.scope_policy_json = normalizeServiceDeskScopePolicy({
      ...scopePolicy,
      mode: 'new_tickets_only',
      targeting: {
        schema_version: 1,
        combinator: 'and',
        predicates: targetingPredicates,
      },
      new_tickets_only: {
        enabled,
        enabled_at: enabledAt,
        entity_id: entityId,
        category_id: categoryId,
        max_tickets_per_cycle: maxTicketsPerCycle,
        max_provider_requests_per_cycle: maxProviderRequestsPerCycle,
        hard_backfill_horizon_hours: hardBackfillHorizonHours,
      },
    });
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
    const scopePolicy = policyObject(normalizeServiceDeskScopePolicy(definition.scope_policy_json));
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
      const config = this.resolveScopeIngestionConfig(definition);
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

  agentPriority(definition: AiAgentDefinition): number {
    return numberFromPolicy(definition.agent_priority, 100, 0, 1000);
  }

  reviewCooldownSeconds(definition: AiAgentDefinition): number {
    return this.queuePolicyNumber(definition, 'review_cooldown_seconds', DEFAULT_REVIEW_COOLDOWN_SECONDS, 60, 30 * 24 * 60 * 60);
  }

  private targetClaimLeaseSeconds(definition: AiAgentDefinition): number {
    return this.queuePolicyNumber(definition, 'claim_lease_seconds', DEFAULT_TARGET_CLAIM_LEASE_SECONDS, 30, 24 * 60 * 60);
  }

  private onConflict(definition: AiAgentDefinition): 'defer' | 'supersede' {
    return policyObject(definition.queue_policy_json).on_conflict === 'supersede' ? 'supersede' : 'defer';
  }

  scheduleNextReviewAt(definition: AiAgentDefinition, now = new Date()): Date {
    return new Date(now.getTime() + this.reviewCooldownSeconds(definition) * 1000);
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
      await this.releaseWorkItemTargetClaim(context, workItem, 'waiting_approval_without_actions_resolved');
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
      await this.releaseWorkItemTargetClaim(context, workItem, 'waiting_approval_actions_terminal');
      return null;
    }
    return workItem;
  }

  async resolveWaitingApprovalForActionRequest(
    context: AiExecutionContextWithManager,
    actionRequestId: string,
  ): Promise<AiAgentWorkItem | null> {
    const action = await this.actionRepo(context).findOne({
      where: {
        tenant_id: context.tenantId,
        id: actionRequestId,
      },
    });
    const metadata = action && isRecord(action.metadata_json) ? action.metadata_json : {};
    const workItemId = typeof metadata.agent_work_item_id === 'string' ? metadata.agent_work_item_id : null;
    if (!workItemId) {
      return null;
    }
    const workItem = await this.workItemRepo(context).findOne({
      where: {
        tenant_id: context.tenantId,
        id: workItemId,
      },
    });
    if (!workItem) {
      return null;
    }
    return this.refreshResolvedWaitingApproval(context, workItem);
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
    this.resolveScopeIngestionConfig(input.definition);
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
    if (
      workItem.source_provider_kind === 'ticketing'
      && workItem.source_provider_key === 'glpi'
      && workItem.source_object_type === 'ticket'
      && workItem.source_object_ref
    ) {
      const claim = await this.acquireTargetClaim(context, {
        definition,
        targetRef: workItem.source_object_ref,
        workItemId: workItem.id,
        metadata: {
          source: 'work_item_acquire',
          lease_owner: options.leaseOwner,
        },
        now,
      });
      if (!claim.acquired) {
        workItem.status = 'failed';
        workItem.last_error = `Target deferred by active claim: ${claim.reason ?? 'claim_conflict'}`;
        workItem.next_attempt_at = claim.claimExpiresAt ? dateFromUnknown(claim.claimExpiresAt) : new Date(now.getTime() + DEFAULT_COOLDOWN_SECONDS * 1000);
        workItem.updated_at = now;
        await repo.save(workItem);
        throw new ForbiddenException('Agent work item target is currently claimed by another agent.');
      }
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
      nextReviewAt?: Date | string | null;
      lastRunId?: string | null;
      internalNoteHash?: string | null;
      publicReplyHash?: string | null;
      agentTouched?: boolean;
      needsFollowup?: boolean;
      claimStatus?: 'none' | 'claimed' | null;
      claimExpiresAt?: Date | string | null;
      claimAcquiredAt?: Date | string | null;
      claimOwnerWorkItemId?: string | null;
      claimOwnerRunId?: string | null;
      claimOwnerPriority?: number | null;
      claimOwnerActionRequestIds?: string[] | null;
      claimMetadata?: Record<string, unknown> | null;
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
        next_review_at: null,
        last_run_id: null,
        last_public_reply_hash: null,
        last_internal_note_hash: null,
        last_classification_hash: null,
        last_assignment_hash: null,
        agent_touched: false,
        needs_followup: false,
        claim_status: 'none',
        claim_expires_at: null,
        claim_acquired_at: null,
        claim_owner_work_item_id: null,
        claim_owner_run_id: null,
        claim_owner_priority: null,
        claim_owner_action_request_ids: null,
        claim_metadata_json: null,
        state_json: null,
        created_at: now,
        updated_at: now,
      });
    }

    state.last_seen_external_updated_at = dateFromUnknown(input.lastSeenExternalUpdatedAt) ?? state.last_seen_external_updated_at;
    state.last_processed_external_updated_at = dateFromUnknown(input.lastProcessedExternalUpdatedAt) ?? state.last_processed_external_updated_at;
    if (Object.prototype.hasOwnProperty.call(input, 'nextReviewAt')) {
      state.next_review_at = dateFromUnknown(input.nextReviewAt) ?? null;
    }
    state.last_run_id = input.lastRunId ?? state.last_run_id ?? null;
    state.last_internal_note_hash = input.internalNoteHash ?? state.last_internal_note_hash ?? null;
    state.last_public_reply_hash = input.publicReplyHash ?? state.last_public_reply_hash ?? null;
    state.agent_touched = input.agentTouched ?? state.agent_touched;
    state.needs_followup = input.needsFollowup ?? state.needs_followup;
    if (input.claimStatus === 'none') {
      state.claim_status = 'none';
      state.claim_expires_at = null;
      state.claim_acquired_at = null;
      state.claim_owner_work_item_id = null;
      state.claim_owner_run_id = null;
      state.claim_owner_priority = null;
      state.claim_owner_action_request_ids = null;
      state.claim_metadata_json = input.claimMetadata ?? null;
    } else if (input.claimStatus === 'claimed') {
      state.claim_status = 'claimed';
      state.claim_expires_at = dateFromUnknown(input.claimExpiresAt) ?? state.claim_expires_at;
      state.claim_acquired_at = dateFromUnknown(input.claimAcquiredAt) ?? state.claim_acquired_at ?? now;
      state.claim_owner_work_item_id = input.claimOwnerWorkItemId ?? state.claim_owner_work_item_id ?? null;
      state.claim_owner_run_id = input.claimOwnerRunId ?? state.claim_owner_run_id ?? null;
      state.claim_owner_priority = typeof input.claimOwnerPriority === 'number'
        ? numberFromPolicy(input.claimOwnerPriority, 100, 0, 1000)
        : state.claim_owner_priority;
      if (Array.isArray(input.claimOwnerActionRequestIds)) {
        state.claim_owner_action_request_ids = Array.from(new Set(input.claimOwnerActionRequestIds.filter((id) => typeof id === 'string' && id.trim().length > 0)));
      }
      state.claim_metadata_json = {
        ...(isRecord(state.claim_metadata_json) ? state.claim_metadata_json : {}),
        ...(input.claimMetadata ?? {}),
      };
    }
    state.state_json = {
      ...(isRecord(state.state_json) ? state.state_json : {}),
      ...(input.state ?? {}),
    };
    state.updated_at = now;
    return repo.save(state);
  }

  async targetReviewReadiness(
    context: AiExecutionContextWithManager,
    input: {
      definition: AiAgentDefinition;
      ticket: { id: string; updatedAt?: string | null; updated_at?: string | null; createdAt?: string | null };
      now?: Date;
    },
  ): Promise<TargetReviewReadiness> {
    const now = input.now ?? new Date();
    const targetRef = normalizedTargetRef(input.ticket.id);
    const repo = this.targetStateRepo(context);
    const existing = await repo.findOne({
      where: {
        tenant_id: context.tenantId,
        agent_definition_id: input.definition.id,
        provider_kind: 'ticketing',
        provider_key: 'glpi',
        target_type: 'ticket',
        target_ref: targetRef,
      },
    });
    const externalUpdatedAt = dateFromUnknown(input.ticket.updatedAt ?? input.ticket.updated_at ?? input.ticket.createdAt);
    const processedAt = dateFromUnknown(existing?.last_processed_external_updated_at);
    const nextReviewAt = dateFromUnknown(existing?.next_review_at);
    const changed = !!externalUpdatedAt && (!processedAt || externalUpdatedAt.getTime() > processedAt.getTime());
    const due = !nextReviewAt || nextReviewAt.getTime() <= now.getTime();
    const ready = !existing || changed || due;
    const state = await this.upsertTargetState(context, {
      agentDefinitionId: input.definition.id,
      providerKind: 'ticketing',
      providerKey: 'glpi',
      targetType: 'ticket',
      targetRef,
      lastSeenExternalUpdatedAt: externalUpdatedAt,
      state: {
        latest_readiness_checked_at: now.toISOString(),
        latest_readiness_reason: !existing ? 'first_review' : changed ? 'changed' : due ? 'scheduled' : 'not_due',
      },
    });
    return {
      state,
      ready,
      changed,
      due,
      reason: !existing ? 'first_review' : changed ? 'changed' : due ? 'scheduled' : 'not_due',
    };
  }

  private claimActive(state: AiAgentTargetState, now = new Date()): boolean {
    if (state.claim_status !== 'claimed') {
      return false;
    }
    const expiresAt = dateFromUnknown(state.claim_expires_at);
    return !expiresAt || expiresAt.getTime() > now.getTime();
  }

  private async activeClaimsForTarget(
    context: AiExecutionContextWithManager,
    input: {
      providerKind: string;
      providerKey: string;
      targetType: string;
      targetRef: string;
      now?: Date;
    },
  ): Promise<AiAgentTargetState[]> {
    const now = input.now ?? new Date();
    const rows = await this.targetStateRepo(context).find({
      where: {
        tenant_id: context.tenantId,
        provider_kind: input.providerKind,
        provider_key: input.providerKey,
        target_type: input.targetType,
        target_ref: normalizedTargetRef(input.targetRef),
        claim_status: 'claimed',
      },
    });
    return rows.filter((row) => this.claimActive(row, now));
  }

  private async expireClaimOwnerActions(
    context: AiExecutionContextWithManager,
    state: AiAgentTargetState,
    reason: string,
    now = new Date(),
    knownActions?: AiActionRequest[],
  ): Promise<number> {
    const ids = Array.isArray(state.claim_owner_action_request_ids)
      ? state.claim_owner_action_request_ids.filter((id) => typeof id === 'string' && id.trim().length > 0)
      : [];
    if (ids.length === 0) {
      return 0;
    }
    const actions = knownActions ?? await this.actionRepo(context).find({
      where: {
        tenant_id: context.tenantId,
        id: In(Array.from(new Set(ids))),
      },
    });
    const toSave: AiActionRequest[] = [];
    for (const action of actions) {
      if (!activePendingAction(action, now.getTime())) {
        continue;
      }
      action.status = 'expired';
      action.error_message = reason;
      action.updated_at = now;
      action.metadata_json = {
        ...(isRecord(action.metadata_json) ? action.metadata_json : {}),
        expired_reason: reason,
        expired_at: now.toISOString(),
        claim_state_id: state.id,
      };
      toSave.push(action);
    }
    if (toSave.length > 0) {
      await this.actionRepo(context).save(toSave);
    }
    return toSave.length;
  }

  async releaseTargetClaim(
    context: AiExecutionContextWithManager,
    input: {
      agentDefinitionId: string;
      providerKind: string;
      providerKey: string;
      targetType: string;
      targetRef: string;
      reason: string;
      onlyWorkItemId?: string | null;
      expectedClaimExpiresAt?: Date | string | null;
      expectedClaimOwnerActionRequestIds?: string[] | null;
      now?: Date;
    },
  ): Promise<AiAgentTargetState | null> {
    const repo = this.targetStateRepo(context);
    const targetRef = normalizedTargetRef(input.targetRef);
    const state = await repo.findOne({
      where: {
        tenant_id: context.tenantId,
        agent_definition_id: input.agentDefinitionId,
        provider_kind: input.providerKind,
        provider_key: input.providerKey,
        target_type: input.targetType,
        target_ref: targetRef,
      },
    });
    if (!state || state.claim_status !== 'claimed') {
      return state;
    }
    if (input.onlyWorkItemId && state.claim_owner_work_item_id && state.claim_owner_work_item_id !== input.onlyWorkItemId) {
      return state;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'expectedClaimExpiresAt')
      && !sameNullableTime(state.claim_expires_at, input.expectedClaimExpiresAt)) {
      return state;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'expectedClaimOwnerActionRequestIds')
      && !sameStringSet(state.claim_owner_action_request_ids, input.expectedClaimOwnerActionRequestIds)) {
      return state;
    }
    state.claim_status = 'none';
    state.claim_expires_at = null;
    state.claim_acquired_at = null;
    state.claim_owner_work_item_id = null;
    state.claim_owner_run_id = null;
    state.claim_owner_priority = null;
    state.claim_owner_action_request_ids = null;
    state.claim_metadata_json = {
      ...(isRecord(state.claim_metadata_json) ? state.claim_metadata_json : {}),
      released_reason: input.reason,
      released_at: (input.now ?? new Date()).toISOString(),
    };
    state.updated_at = input.now ?? new Date();
    return repo.save(state);
  }

  async releaseWorkItemTargetClaim(
    context: AiExecutionContextWithManager,
    workItem: AiAgentWorkItem,
    reason: string,
  ): Promise<AiAgentTargetState | null> {
    if (!workItem.source_provider_kind || !workItem.source_provider_key || !workItem.source_object_type || !workItem.source_object_ref) {
      return null;
    }
    return this.releaseTargetClaim(context, {
      agentDefinitionId: workItem.agent_definition_id,
      providerKind: workItem.source_provider_kind,
      providerKey: workItem.source_provider_key,
      targetType: workItem.source_object_type,
      targetRef: workItem.source_object_ref,
      reason,
      onlyWorkItemId: workItem.id,
    });
  }

  async reconcileTargetClaims(
    context: AiExecutionContextWithManager,
    input: {
      limit?: number;
      now?: Date;
      providerKind?: string;
      providerKey?: string;
      targetType?: string;
      targetRef?: string;
    } = {},
  ): Promise<{ scanned: number; released: number; expiredActions: number }> {
    const now = input.now ?? new Date();
    const repo = this.targetStateRepo(context);
    const rows = (await repo.find({
      where: {
        tenant_id: context.tenantId,
        ...(input.providerKind ? { provider_kind: input.providerKind } : {}),
        ...(input.providerKey ? { provider_key: input.providerKey } : {}),
        ...(input.targetType ? { target_type: input.targetType } : {}),
        ...(input.targetRef ? { target_ref: normalizedTargetRef(input.targetRef) } : {}),
        claim_status: 'claimed',
      },
      order: { updated_at: 'ASC' },
      take: Math.max(1, Math.min(Math.floor(input.limit ?? 100), 500)),
    }));
    const blockedAgentDefinitionIds = await this.lifecycleBlockedAgentDefinitionIds(
      context,
      rows.map((state) => state.agent_definition_id),
      { now },
    );
    const allActionIds = Array.from(new Set(rows.flatMap((state) => Array.isArray(state.claim_owner_action_request_ids)
      ? state.claim_owner_action_request_ids.filter((id) => typeof id === 'string' && id.trim().length > 0)
      : [])));
    const actionsById = new Map<string, AiActionRequest>();
    if (allActionIds.length > 0) {
      const actions = await this.actionRepo(context).find({
        where: { tenant_id: context.tenantId, id: In(allActionIds) },
      });
      for (const action of actions) {
        actionsById.set(action.id, action);
      }
    }
    const workItemIds = Array.from(new Set(rows
      .map((state) => state.claim_owner_work_item_id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));
    const workItemsById = new Map<string, AiAgentWorkItem>();
    if (workItemIds.length > 0) {
      const workItems = await this.workItemRepo(context).find({
        where: { tenant_id: context.tenantId, id: In(workItemIds) },
      });
      for (const workItem of workItems) {
        workItemsById.set(workItem.id, workItem);
      }
    }
    let released = 0;
    let expiredActions = 0;
    for (const state of rows) {
      if (blockedAgentDefinitionIds.has(state.agent_definition_id)) {
        continue;
      }
      let releaseReason: string | null = null;
      const expiresAt = dateFromUnknown(state.claim_expires_at);
      if (expiresAt && expiresAt.getTime() <= now.getTime()) {
        releaseReason = 'claim_lease_expired';
      }

      const actionIds = Array.isArray(state.claim_owner_action_request_ids)
        ? state.claim_owner_action_request_ids.filter((id) => typeof id === 'string' && id.trim().length > 0)
        : [];
      const ownerActions = actionIds.map((id) => actionsById.get(id)).filter((action): action is AiActionRequest => !!action);
      if (!releaseReason && actionIds.length > 0) {
        if (ownerActions.length === 0 || ownerActions.every((action) => !activePendingAction(action, now.getTime()))) {
          releaseReason = 'claim_owner_actions_terminal';
        }
      }

      if (!releaseReason && state.claim_owner_work_item_id) {
        const workItem = workItemsById.get(state.claim_owner_work_item_id) ?? null;
        if (workItem && TERMINAL_WORK_ITEM_STATUSES.has(workItem.status)) {
          releaseReason = 'claim_owner_work_item_terminal';
        }
      }

      if (!releaseReason) {
        continue;
      }
      if (releaseReason === 'claim_lease_expired') {
        expiredActions += await this.expireClaimOwnerActions(context, state, 'Claim lease expired before the proposal was reviewed.', now, ownerActions);
      }
      const releasedState = await this.releaseTargetClaim(context, {
        agentDefinitionId: state.agent_definition_id,
        providerKind: state.provider_kind,
        providerKey: state.provider_key,
        targetType: state.target_type,
        targetRef: state.target_ref,
        reason: releaseReason,
        expectedClaimExpiresAt: state.claim_expires_at,
        expectedClaimOwnerActionRequestIds: state.claim_owner_action_request_ids,
        now,
      });
      if (releasedState?.claim_status === 'none') {
        released += 1;
      }
    }
    return { scanned: rows.length, released, expiredActions };
  }

  async acquireTargetClaim(
    context: AiExecutionContextWithManager,
    input: {
      definition: AiAgentDefinition;
      providerKind?: string;
      providerKey?: string;
      targetType?: string;
      targetRef: string;
      workItemId?: string | null;
      runId?: string | null;
      metadata?: Record<string, unknown> | null;
      now?: Date;
    },
  ): Promise<TargetClaimAcquireResult> {
    const now = input.now ?? new Date();
    const providerKind = input.providerKind ?? 'ticketing';
    const providerKey = input.providerKey ?? 'glpi';
    const targetType = input.targetType ?? 'ticket';
    const targetRef = normalizedTargetRef(input.targetRef);
    await this.reconcileTargetClaims(context, {
      providerKind,
      providerKey,
      targetType,
      targetRef,
      now,
      limit: 50,
    });

    const newPriority = this.agentPriority(input.definition);
    const activeClaims = await this.activeClaimsForTarget(context, {
      providerKind,
      providerKey,
      targetType,
      targetRef,
      now,
    });
    const foreignClaims = activeClaims.filter((claim) => claim.agent_definition_id !== input.definition.id);
    if (foreignClaims.length > 0) {
      const strongest = [...foreignClaims].sort((left, right) => (right.claim_owner_priority ?? 100) - (left.claim_owner_priority ?? 100))[0];
      const ownerPriority = strongest.claim_owner_priority ?? 100;
      const shouldSupersede = newPriority > ownerPriority || (newPriority === ownerPriority && this.onConflict(input.definition) === 'supersede');
      if (!shouldSupersede) {
        return {
          acquired: false,
          status: 'deferred',
          state: strongest,
          ownerAgentDefinitionId: strongest.agent_definition_id,
          ownerPriority,
          ownerWorkItemId: strongest.claim_owner_work_item_id,
          claimExpiresAt: toIsoDate(strongest.claim_expires_at),
          reason: newPriority < ownerPriority ? 'lower_priority_claim_active' : 'equal_priority_claim_active',
        };
      }
      for (const claim of foreignClaims) {
        await this.expireClaimOwnerActions(context, claim, 'Claim was superseded by a higher-priority or superseding agent.', now);
        await this.releaseTargetClaim(context, {
          agentDefinitionId: claim.agent_definition_id,
          providerKind,
          providerKey,
          targetType,
          targetRef,
          reason: 'claim_superseded',
          now,
        });
      }
    }

    try {
      const state = await this.upsertTargetState(context, {
        agentDefinitionId: input.definition.id,
        providerKind,
        providerKey,
        targetType,
        targetRef,
        claimStatus: 'claimed',
        claimExpiresAt: new Date(now.getTime() + this.targetClaimLeaseSeconds(input.definition) * 1000),
        claimAcquiredAt: now,
        claimOwnerWorkItemId: input.workItemId ?? null,
        claimOwnerRunId: input.runId ?? null,
        claimOwnerPriority: newPriority,
        claimMetadata: {
          ...(input.metadata ?? {}),
          acquired_at: now.toISOString(),
        },
      });
      return {
        acquired: true,
        status: foreignClaims.length > 0 ? 'superseded' : 'claimed',
        state,
        ownerAgentDefinitionId: input.definition.id,
        ownerPriority: newPriority,
        ownerWorkItemId: input.workItemId ?? null,
        claimExpiresAt: toIsoDate(state.claim_expires_at),
      };
    } catch (error) {
      const code = (error as { code?: string; driverError?: { code?: string } })?.code
        ?? (error as { driverError?: { code?: string } })?.driverError?.code;
      if (code !== '23505') {
        throw error;
      }
      const claims = await this.activeClaimsForTarget(context, {
        providerKind,
        providerKey,
        targetType,
        targetRef,
        now,
      });
      const owner = claims.find((claim) => claim.agent_definition_id !== input.definition.id) ?? claims[0] ?? null;
      return {
        acquired: false,
        status: 'deferred',
        state: owner,
        ownerAgentDefinitionId: owner?.agent_definition_id ?? null,
        ownerPriority: owner?.claim_owner_priority ?? null,
        ownerWorkItemId: owner?.claim_owner_work_item_id ?? null,
        claimExpiresAt: owner ? toIsoDate(owner.claim_expires_at) : null,
        reason: 'concurrent_claim_conflict',
      };
    }
  }

  async holdTargetClaimForPendingProposals(
    context: AiExecutionContextWithManager,
    input: {
      definition: AiAgentDefinition;
      workItem: AiAgentWorkItem;
      actionRequestIds: string[];
      runId?: string | null;
      now?: Date;
    },
  ): Promise<AiAgentTargetState | null> {
    const ids = Array.from(new Set(input.actionRequestIds.filter((id) => typeof id === 'string' && id.trim().length > 0)));
    if (!input.workItem.source_object_ref) {
      return null;
    }
    const now = input.now ?? new Date();
    const actions = ids.length > 0
      ? await this.actionRepo(context).find({
        where: {
          tenant_id: context.tenantId,
          id: In(ids),
        },
      })
      : [];
    const active = actions.filter((action) => activePendingAction(action, now.getTime()));
    const maxExpiry = active
      .map((action) => dateFromUnknown(action.expires_at))
      .filter((date): date is Date => !!date)
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
    const claimExpiry = maxExpiry ?? new Date(now.getTime() + this.reviewCooldownSeconds(input.definition) * 1000);
    return this.upsertTargetState(context, {
      agentDefinitionId: input.definition.id,
      providerKind: input.workItem.source_provider_kind,
      providerKey: input.workItem.source_provider_key,
      targetType: input.workItem.source_object_type,
      targetRef: input.workItem.source_object_ref,
      claimStatus: 'claimed',
      claimExpiresAt: claimExpiry,
      claimOwnerWorkItemId: input.workItem.id,
      claimOwnerRunId: input.runId ?? input.workItem.last_run_id ?? null,
      claimOwnerPriority: this.agentPriority(input.definition),
      claimOwnerActionRequestIds: active.map((action) => action.id),
      claimMetadata: {
        held_for_pending_proposals_at: now.toISOString(),
        pending_action_count: active.length,
      },
    });
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
      nextReviewAt: this.scheduleNextReviewAt(input.definition),
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

    const hasActivePendingActions = actions.some(activePendingAction);
    const workItem = hasActivePendingActions
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

    if (hasActivePendingActions) {
      await this.holdTargetClaimForPendingProposals(context, {
        definition: input.definition,
        workItem,
        actionRequestIds: uniqueActionIds,
        runId: input.runId,
      });
    } else {
      await this.releaseWorkItemTargetClaim(context, workItem, 'review_completed_without_pending_proposals');
    }

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

  async hasActiveEmergencyPause(
    context: AiExecutionContextWithManager,
    agentDefinitionId: string | null = null,
  ): Promise<AiEmergencyPause | null> {
    const query = this.pauseRepo(context).createQueryBuilder('pause')
      .where('(pause.tenant_id = :tenantId OR pause.tenant_id IS NULL)', { tenantId: context.tenantId })
      .andWhere('pause.active = true')
      .orderBy('pause.created_at', 'DESC');
    if (agentDefinitionId) {
      query.andWhere('(pause.agent_definition_id IS NULL OR pause.agent_definition_id = :agentDefinitionId)', { agentDefinitionId });
    } else {
      query.andWhere('pause.agent_definition_id IS NULL');
    }
    const pauses = await query.getMany();
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

  async lifecycleBlockedAgentDefinitionIds(
    context: AiExecutionContextWithManager,
    agentDefinitionIds: string[],
    opts: { now?: Date } = {},
  ): Promise<Set<string>> {
    const ids = Array.from(new Set(agentDefinitionIds.filter((id) => typeof id === 'string' && id.trim().length > 0)));
    const blocked = new Set<string>();
    if (ids.length === 0) {
      return blocked;
    }
    const definitions = await this.definitionRepo(context).find({
      where: { tenant_id: context.tenantId, id: In(ids) },
    });
    for (const definition of definitions) {
      const pause = await this.hasActiveEmergencyPause(context, definition.id);
      if (pause) {
        blocked.add(definition.id);
        continue;
      }
      try {
        const daily = await this.dailyUsageSummary(context, definition, opts.now ?? new Date());
        if (daily.reached) {
          blocked.add(definition.id);
        }
      } catch {
        // Missing guardrails means there is no configured daily cap to honor for
        // no-provider lifecycle cleanup; ingestion still enforces guardrails.
      }
    }
    return blocked;
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
    return this.computeHelpdeskEvaluation(context, [definition.id], now);
  }

  // Pooled evaluation metrics across one or more agent definitions. Per-agent
  // callers pass a single id; the fleet header passes every helpdesk agent id so
  // acceptance and cost-per-ticket are pooled from raw data, not averaged ratios.
  private async computeHelpdeskEvaluation(
    context: AiExecutionContextWithManager,
    definitionIds: string[],
    now = new Date(),
  ): Promise<HelpdeskGlpiAgentSummary['evaluation']> {
    const idSet = new Set(definitionIds);
    const inScope = (id: string | null): boolean => id != null && idSet.has(id);
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
      definitionIds.length > 0
        ? this.targetStateRepo(context).find({
          where: {
            tenant_id: context.tenantId,
            agent_definition_id: In(definitionIds),
          },
        })
        : Promise.resolve([]),
    ]);
    const relevantActions = actions.filter((action) =>
      HELPDESK_REVIEW_ACTION_CAPABILITIES.includes(action.capability_name)
      && inScope(definitionIdFromMetadata(action.metadata_json))
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
      inScope(definitionIdFromMetadata(run.metadata_json))
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
      ingestionConfig = this.resolveScopeIngestionConfig(definition);
    } catch {
      ingestionConfig = null;
    }
    const ingestionState = policyObject(policyObject(definition.metadata_json).helpdesk_ingestion_state);
    const metadataPauseReason = stringFromPolicy(ingestionState.reason);
    const activePause = await this.hasActiveEmergencyPause(context, definition.id);
    const daily = dailyGuardrailCapsFromDefinition(definition)
      ? await this.dailyUsageSummary(context, definition)
      : null;
    const emergencyPause = activePause ? {
      id: activePause.id,
      active: activePause.active,
      scope: activePause.scope ?? null,
      agent_definition_id: activePause.agent_definition_id ?? null,
      reason: activePause.reason,
      created_at: activePause.created_at ? new Date(activePause.created_at).toISOString() : null,
      expires_at: activePause.expires_at ? new Date(activePause.expires_at).toISOString() : null,
    } : null;
    return {
      agentDefinitionId: definition.id,
      ingestion: {
        enabled: !!ingestionConfig,
        mode: ingestionConfig ? ingestionConfig.mode : 'disabled',
        paused: stringFromPolicy(ingestionState.status) === 'paused' || !!emergencyPause,
        pauseReason: emergencyPause?.reason ?? metadataPauseReason,
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
      emergencyPause,
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
    const helpdeskDefinitions = definitions.filter((definition) => definition.agent_type === 'helpdesk');
    const helpdeskDefinition = helpdeskDefinitions.find((definition) => definition.agent_key === HELP_DESK_GLPI_TRIAGE_AGENT_KEY)
      ?? helpdeskDefinitions[0]
      ?? null;
    const helpdeskDefinitionIds = helpdeskDefinitions.map((definition) => definition.id);
    // Scope, order, and limit in SQL instead of loading every tenant audit event and
    // filtering/sorting in memory (which scaled with total history, not the 20 returned).
    const auditEvents = helpdeskDefinitionIds.length === 0
      ? []
      : await this.auditRepo(context).find({
        where: { tenant_id: context.tenantId, agent_definition_id: In(helpdeskDefinitionIds) },
        order: { created_at: 'DESC' },
        take: 20,
      });
    const helpdeskSummaries = await Promise.all(helpdeskDefinitions.map((definition) => this.helpdeskSummary(context, definition)));
    // Fleet header aggregate: pooled across every helpdesk agent so it represents
    // the whole fleet, not the built-in agent's summary used as a proxy.
    const fleet = helpdeskDefinitionIds.length > 0
      ? await this.computeHelpdeskEvaluation(context, helpdeskDefinitionIds)
      : null;
    return {
      definitions,
      workItems,
      targetStates,
      counts,
      helpdesk: {
        summary: helpdeskDefinition
          ? helpdeskSummaries.find((summary) => summary.agentDefinitionId === helpdeskDefinition.id) ?? null
          : null,
        summaries: helpdeskSummaries,
        fleet,
        auditEvents,
      },
    };
  }

  agentExecutionMetadata(definition: AiAgentDefinition, workItem: AiAgentWorkItem): Record<string, unknown> {
    const queuePolicy = policyObject(definition.queue_policy_json);
    return {
      agent_definition_id: definition.id,
      agent_key: definition.agent_key,
      agent_type: definition.agent_type,
      agent_environment: definition.environment,
      agent_config_version: definition.config_version ?? 1,
      agent_updated_by_user_id: definition.updated_by_user_id ?? null,
      agent_priority: this.agentPriority(definition),
      review_cooldown_seconds: this.reviewCooldownSeconds(definition),
      on_conflict: this.onConflict(definition),
      approval_ttl_seconds: normalizeApprovalTtlSeconds(queuePolicy),
      on_stale_by_action_class: isRecord(queuePolicy.on_stale_by_action_class)
        ? queuePolicy.on_stale_by_action_class
        : null,
      agent_work_item_id: workItem.id,
      agent_work_kind: workItem.work_kind,
      agent_work_status: workItem.status,
      agent_dedup_key: workItem.dedup_key,
    };
  }
}
