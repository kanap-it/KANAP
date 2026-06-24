import React from 'react';
import { Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, IconButton, ListItemText, MenuItem, Select, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import KanapDialog from '../../components/design/KanapDialog';
import { PropertyRow } from '../../components/design';
import { drawerMenuItemSx, drawerSelectSx, editableFieldValueSx } from '../../theme/formSx';
import {
  aiAgentControlApi,
  type AiAgentControlAgentDefinition,
  type AiAgentControlAgentDefinitionInput,
  type AiAgentControlHelpdeskIngestionSettingsInput,
  type AiAgentControlRefItem,
} from '../../ai/aiApi';
import { useAuth } from '../../auth/AuthContext';
import { useFeatures } from '../../config/FeaturesContext';
import useAutosave from '../../hooks/useAutosave';
import {
  buildTicketGroups,
  EmptyState,
  formatNumber,
  formatPercent,
  HELP_DESK_AGENT_KEY,
  humanize,
  lifecycleStatusKey,
  MetricBlock,
  ReasonDialog,
  resolveAgentSummary,
  SaveIndicator,
  Section,
  statusLabel,
} from '../../components/agents/agentControlPrimitives';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { getDotColor } from '../../utils/statusColors';
import AgentsApprovalsPage from './AgentsApprovalsPage';
import AgentsActivityPage from './AgentsActivityPage';
import { useAgentControlData } from './useAgentControlData';

type WorkspaceTab = 'monitor' | 'approvals' | 'performance' | 'settings';
const TABS: WorkspaceTab[] = ['monitor', 'approvals', 'performance', 'settings'];
const DEFAULT_MAX_TICKETS = 5;
const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_HORIZON_HOURS = 24;
const DEFAULT_PER_RUN_TOKENS = 40000;
const DEFAULT_PER_RUN_COST = 1;
const DEFAULT_DAILY_RUNS = 25;
const DEFAULT_DAILY_TOKENS = 500000;
const DEFAULT_DAILY_COST = 10;
const DEFAULT_REVIEW_COOLDOWN_HOURS = 24;
const DEFAULT_PUBLIC_REPLY_TTL_HOURS = 8;
const DEFAULT_APPROVAL_TTL_HOURS = 24;
const DEFAULT_STALE_CLOSURE_TTL_DAYS = 7;
const actionLinkButtonSx = {
  minWidth: 0,
  px: 0,
  py: 0.25,
  color: 'kanap.teal',
  fontSize: 12,
  fontWeight: 400,
  textTransform: 'none',
  '&:hover': {
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
};

function numberField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function positiveNumber(value: string, fallback: number): number {
  return numberField(value) ?? fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function policyObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function nestedPolicy(value: unknown, key: string): Record<string, unknown> {
  return policyObject(policyObject(value)[key]);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberString(value: unknown, fallback: number | null = null): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : fallback == null ? '' : String(fallback);
}

function hoursString(seconds: unknown, fallbackHours: number): string {
  return typeof seconds === 'number' && Number.isFinite(seconds)
    ? String(Math.max(1, Math.round(seconds / 3600)))
    : String(fallbackHours);
}

function daysString(seconds: unknown, fallbackDays: number): string {
  return typeof seconds === 'number' && Number.isFinite(seconds)
    ? String(Math.max(1, Math.round(seconds / 86400)))
    : String(fallbackDays);
}

function capabilityEntryName(entry: unknown): string | null {
  if (typeof entry === 'string') return entry;
  if (isRecord(entry) && typeof entry.name === 'string') return entry.name;
  return null;
}

function capabilityEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.capabilities)) return value.capabilities;
  return [];
}

function capabilityNameSet(value: unknown): Set<string> {
  return new Set(capabilityEntries(value).map(capabilityEntryName).filter((name): name is string => !!name));
}

function capabilityEnabledState(definition: AiAgentControlAgentDefinition): Record<string, boolean> {
  const names = capabilityNameSet(definition.allowed_capabilities_json);
  return Object.fromEntries(HELPDESK_CAPABILITY_GROUPS.map((group) => [group.key, group.names.every((name) => names.has(name))]));
}

function allowedCapabilitiesWithGroup(definition: AiAgentControlAgentDefinition, groupKey: string, enabled: boolean): unknown[] {
  const group = HELPDESK_CAPABILITY_GROUPS.find((candidate) => candidate.key === groupKey);
  if (!group) return capabilityEntries(definition.allowed_capabilities_json);
  const groupNames = new Set<string>(group.names);
  const existing = capabilityEntries(definition.allowed_capabilities_json)
    .filter((entry) => {
      const name = capabilityEntryName(entry);
      return !name || !groupNames.has(name);
    });
  if (!enabled) return existing;
  const currentByName = new Map(capabilityEntries(definition.allowed_capabilities_json).map((entry) => [capabilityEntryName(entry), entry]));
  return [
    ...existing,
    ...group.names.map((name) => currentByName.get(name) ?? {
      name,
      version: '1.0.0',
      effect: name.includes('.approved') || name.includes('.add_approved') ? 'write' : name.includes('.get') ? 'read' : 'propose',
      max_autonomy_level: name.includes('.approved') || name.includes('.add_approved') ? 'A3' : name.includes('.get') ? 'A1' : 'A2',
      ...(name.includes('.approved') || name.includes('.add_approved') ? { approval: 'human' } : {}),
    }),
  ];
}

function staleClosureResponseEnabled(definition: AiAgentControlAgentDefinition): boolean {
  const response = policyObject(definition.response_policy_json);
  if (typeof response.prepare_stale_closure === 'boolean') {
    return response.prepare_stale_closure;
  }
  return policyObject(policyObject(definition.scope_policy_json).stale_closure).enabled === true;
}

function allowedCapabilitiesWithStaleClosurePrereqs(definition: AiAgentControlAgentDefinition, enabled: boolean): unknown[] {
  const existing = capabilityEntries(definition.allowed_capabilities_json);
  if (!enabled) {
    return existing;
  }
  let allowed = existing;
  for (const groupKey of ['public_reply', 'status']) {
    allowed = allowedCapabilitiesWithGroup({ ...definition, allowed_capabilities_json: allowed }, groupKey, true);
  }
  return allowed;
}

function SettingsField({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return <PropertyRow label={label} helperText={hint}>{children}</PropertyRow>;
}

const DEFAULT_STALE_HOURS = 72;
const SCOPE_MODES = ['new_tickets_only', 'all_open', 'agent_involved'] as const;

type TargetingPresetKey = 'new_tickets' | 'all_open' | 'handled';
type TargetingFilterField = 'status' | 'priority' | 'type' | 'category' | 'entity' | 'created_at' | 'updated_at' | 'inactivity_age' | 'touched_by';
type TargetingFilterUnit = 'hours' | 'days';
type TargetingPredicateOperator = 'eq' | 'in' | 'gte' | 'lte' | 'not';
type TargetingPredicate = { field: string; operator: TargetingPredicateOperator; value: unknown };

type TargetingFilter = {
  id: string;
  field: TargetingFilterField;
  value: string | string[];
  label?: string;
  amount: string;
  unit: TargetingFilterUnit;
};

type HelpdeskSettingsForm = {
  enabled: boolean;
  scopeMode: string;
  filters: TargetingFilter[];
  agentPriority: string;
  reviewCooldownHours: string;
  onConflict: string;
  entityId: string;
  categoryId: string;
  maxTickets: string;
  maxRequests: string;
  horizonHours: string;
  staleEnabled: boolean;
  staleAction: string;
  staleMessage: string;
  perRunTokens: string;
  perRunCost: string;
  dailyRuns: string;
  dailyTokens: string;
  dailyCost: string;
  publicReplyTtlHours: string;
  internalNoteTtlHours: string;
  metadataTtlHours: string;
  staleClosureTtlDays: string;
  onStale: string;
};

function targetingFilterId(field: string): string {
  return `${field}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildFilter(
  field: TargetingFilterField,
  value: string | string[] = '',
  amount = '24',
  unit: TargetingFilterUnit = 'hours',
  label?: string,
): TargetingFilter {
  return { id: targetingFilterId(field), field, value, label, amount, unit };
}

function relativeAmountFromHours(hours: number): { amount: string; unit: TargetingFilterUnit } {
  if (hours >= 24 && hours % 24 === 0) {
    return { amount: String(hours / 24), unit: 'days' };
  }
  return { amount: String(Math.max(1, Math.round(hours))), unit: 'hours' };
}

function secondsFromFilter(filter: TargetingFilter): number | null {
  const amount = numberField(filter.amount);
  if (!amount) return null;
  return Math.floor(amount * (filter.unit === 'days' ? 86400 : 3600));
}

function relativeHoursFromFilter(filter: TargetingFilter): number | null {
  const seconds = secondsFromFilter(filter);
  return seconds == null ? null : Math.max(1, Math.round(seconds / 3600));
}

function statusFilterValues(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  return Array.from(new Set(rawValues.map((entry) => String(entry ?? '').trim()).filter(Boolean)));
}

function targetingPresetFilters(
  preset: TargetingPresetKey,
  horizonHours = DEFAULT_HORIZON_HOURS,
  statusValues: string[] = [],
): TargetingFilter[] {
  const status = buildFilter('status', statusValues);
  if (preset === 'new_tickets') {
    const relative = relativeAmountFromHours(horizonHours);
    return [buildFilter('created_at', '', relative.amount, relative.unit), status];
  }
  if (preset === 'handled') {
    return [buildFilter('touched_by', 'self'), status];
  }
  return [status];
}

function modeFromFilters(filters: TargetingFilter[]): string {
  if (filters.some((filter) => filter.field === 'touched_by')) {
    return 'agent_involved';
  }
  if (filters.some((filter) => filter.field === 'created_at')) {
    return 'new_tickets_only';
  }
  return 'all_open';
}

function categoryFromFilters(filters: TargetingFilter[]): string {
  const filter = filters.find((candidate) => candidate.field === 'category');
  return typeof filter?.value === 'string' ? filter.value.trim() : '';
}

function entityFromFilters(filters: TargetingFilter[]): string {
  const filter = filters.find((candidate) => candidate.field === 'entity');
  return typeof filter?.value === 'string' ? filter.value.trim() : '';
}

function createdHorizonHoursFromFilters(filters: TargetingFilter[], fallback: string): number {
  const created = filters.find((filter) => filter.field === 'created_at');
  return created ? relativeHoursFromFilter(created) ?? positiveNumber(fallback, DEFAULT_HORIZON_HOURS) : positiveNumber(fallback, DEFAULT_HORIZON_HOURS);
}

function targetingPredicatesFromForm(form: HelpdeskSettingsForm): TargetingPredicate[] {
  const predicates: TargetingPredicate[] = [];
  for (const filter of form.filters) {
    if (filter.field === 'status') {
      const values = statusFilterValues(filter.value);
      if (values.length > 0) predicates.push({ field: 'status', operator: 'in', value: values });
      continue;
    }
    if (filter.field === 'priority') {
      const value = typeof filter.value === 'string' ? filter.value.trim() : '';
      if (value) predicates.push({ field: 'priority', operator: 'gte', value });
      continue;
    }
    if (filter.field === 'category') {
      const value = typeof filter.value === 'string' ? filter.value.trim() : '';
      if (value) predicates.push({ field: 'category', operator: 'eq', value });
      continue;
    }
    if (filter.field === 'entity') {
      const value = typeof filter.value === 'string' ? filter.value.trim() : '';
      if (value) predicates.push({ field: 'entity', operator: 'eq', value });
      continue;
    }
    if (filter.field === 'type') {
      const value = typeof filter.value === 'string' ? filter.value.trim() : '';
      if (value) predicates.push({ field: 'type', operator: 'eq', value });
      continue;
    }
    if (filter.field === 'created_at') {
      const relativeHours = relativeHoursFromFilter(filter);
      if (relativeHours != null) predicates.push({ field: 'created_at', operator: 'gte', value: { relative_hours: relativeHours } });
      continue;
    }
    if (filter.field === 'updated_at') {
      const relativeHours = relativeHoursFromFilter(filter);
      if (relativeHours != null) predicates.push({ field: 'updated_at', operator: 'lte', value: { relative_hours: relativeHours } });
      continue;
    }
    if (filter.field === 'inactivity_age') {
      const seconds = secondsFromFilter(filter);
      if (seconds != null) predicates.push({ field: 'inactivity_age', operator: 'gte', value: { seconds } });
      continue;
    }
    if (filter.field === 'touched_by') {
      predicates.push({ field: 'touched_by', operator: 'eq', value: 'self' });
    }
  }
  const seen = new Set<string>();
  return predicates.filter((predicate) => {
    const key = JSON.stringify(predicate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filtersFromScope(scope: Record<string, unknown>, mode: string): {
  filters: TargetingFilter[];
  entityId: string;
  categoryId: string;
  horizonHours: string;
} {
  const filters: TargetingFilter[] = [];
  let entityId = '';
  let categoryId = '';
  let horizonHours = DEFAULT_HORIZON_HOURS;
  const targeting = policyObject(scope.targeting);
  const predicates = Array.isArray(targeting.predicates) ? targeting.predicates.filter(isRecord) : [];
  for (const predicate of predicates) {
    const field = stringValue(predicate.field);
    const operator = stringValue(predicate.operator);
    if (field === 'status' && (operator === 'in' || operator === 'eq')) {
      const values = statusFilterValues(predicate.value);
      if (values.length > 0) filters.push(buildFilter('status', values));
      continue;
    }
    if (field === 'priority' && (operator === 'gte' || operator === 'eq')) {
      filters.push(buildFilter('priority', stringValue(predicate.value) || 'high'));
      continue;
    }
    if (field === 'type' && operator === 'eq') {
      const type = stringValue(predicate.value);
      if (type) filters.push(buildFilter('type', type));
      continue;
    }
    if (field === 'category' && operator === 'eq') {
      categoryId = stringValue(predicate.value);
      if (categoryId) filters.push(buildFilter('category', categoryId));
      continue;
    }
    if (field === 'entity' && operator === 'eq') {
      entityId = stringValue(predicate.value);
      if (entityId) filters.push(buildFilter('entity', entityId));
      continue;
    }
    if (field === 'created_at' && operator === 'gte') {
      const value = policyObject(predicate.value);
      const hours = typeof value.relative_hours === 'number' ? value.relative_hours : DEFAULT_HORIZON_HOURS;
      const relative = relativeAmountFromHours(hours);
      horizonHours = hours;
      filters.push(buildFilter('created_at', '', relative.amount, relative.unit));
      continue;
    }
    if (field === 'updated_at' && operator === 'lte') {
      const value = policyObject(predicate.value);
      const hours = typeof value.relative_hours === 'number' ? value.relative_hours : 24;
      const relative = relativeAmountFromHours(hours);
      filters.push(buildFilter('updated_at', '', relative.amount, relative.unit));
      continue;
    }
    if (field === 'inactivity_age' && operator === 'gte') {
      const seconds = typeof policyObject(predicate.value).seconds === 'number'
        ? policyObject(predicate.value).seconds as number
        : typeof predicate.value === 'number' ? predicate.value : DEFAULT_STALE_HOURS * 3600;
      const relative = relativeAmountFromHours(Math.max(1, Math.round(seconds / 3600)));
      filters.push(buildFilter('inactivity_age', '', relative.amount, relative.unit));
      continue;
    }
    if (field === 'touched_by' && operator === 'eq' && stringValue(predicate.value) === 'self') {
      filters.push(buildFilter('touched_by', 'self'));
    }
  }
  if (filters.length === 0) {
    if (mode === 'all_open') {
      filters.push(...targetingPresetFilters('all_open'));
    } else if (mode === 'agent_involved') {
      filters.push(...targetingPresetFilters('handled'));
    } else {
      const ingestion = nestedPolicy(scope, 'new_tickets_only');
      horizonHours = typeof ingestion.hard_backfill_horizon_hours === 'number'
        ? ingestion.hard_backfill_horizon_hours
        : DEFAULT_HORIZON_HOURS;
      filters.push(...targetingPresetFilters('new_tickets', horizonHours));
    }
  }
  return {
    filters,
    entityId,
    categoryId,
    horizonHours: String(horizonHours),
  };
}

const HELPDESK_CAPABILITY_GROUPS = [
  { key: 'internal_note', names: ['ticketing.ticket.internal_note.prepare', 'ticketing.ticket.internal_note.add_approved'] },
  { key: 'public_reply', names: ['ticketing.ticket.public_reply.prepare', 'ticketing.ticket.public_reply.add_approved'] },
  { key: 'classification', names: ['ticketing.ticket.classification_context.get', 'ticketing.ticket.classification_update.prepare', 'ticketing.ticket.classification_update.approved'] },
  { key: 'status', names: ['ticketing.ticket.lifecycle_context.get', 'ticketing.ticket.status_update.prepare', 'ticketing.ticket.status_update.approved'] },
  { key: 'assignment', names: ['ticketing.ticket.routing_context.get', 'ticketing.ticket.assignment_update.prepare', 'ticketing.ticket.assignment_update.approved'] },
  { key: 'participant', names: ['ticketing.ticket.participant_context.get', 'ticketing.ticket.participant_update.prepare', 'ticketing.ticket.participant_update.approved'] },
] as const;

function settingsFormFromDefinition(definition: AiAgentControlAgentDefinition): HelpdeskSettingsForm {
  const trigger = policyObject(definition.trigger_policy_json);
  const scope = policyObject(definition.scope_policy_json);
  const rawMode = stringValue(scope.mode);
  const mode = (SCOPE_MODES as readonly string[]).includes(rawMode) ? rawMode : 'new_tickets_only';
  const ingestion = nestedPolicy(scope, 'new_tickets_only');
  const activeBlock = nestedPolicy(scope, mode);
  const targetingState = filtersFromScope(scope, mode);
  const stale = policyObject(scope.stale_closure);
  const queue = policyObject(definition.queue_policy_json);
  const approvalTtls = policyObject(queue.approval_ttl_seconds_by_action_class);
  const onStale = policyObject(queue.on_stale_by_action_class);
  const guardrails = nestedPolicy(definition.queue_policy_json, 'economic_guardrails');
  const perRun = policyObject(guardrails.per_run);
  const daily = policyObject(guardrails.daily);
  return {
    enabled: policyObject(trigger.scheduled_poll).enabled === true,
    scopeMode: modeFromFilters(targetingState.filters),
    filters: targetingState.filters,
    agentPriority: numberString(definition.agent_priority, 100),
    reviewCooldownHours: hoursString(queue.review_cooldown_seconds, DEFAULT_REVIEW_COOLDOWN_HOURS),
    onConflict: stringValue(queue.on_conflict) === 'supersede' ? 'supersede' : 'defer',
    entityId: targetingState.entityId || stringValue(activeBlock.entity_id ?? activeBlock.entityId ?? ingestion.entity_id),
    categoryId: targetingState.categoryId || stringValue(activeBlock.category_id ?? activeBlock.categoryId ?? ingestion.category_id),
    maxTickets: numberString(activeBlock.max_tickets_per_cycle ?? ingestion.max_tickets_per_cycle, DEFAULT_MAX_TICKETS),
    maxRequests: numberString(activeBlock.max_provider_requests_per_cycle ?? ingestion.max_provider_requests_per_cycle, DEFAULT_MAX_REQUESTS),
    horizonHours: targetingState.horizonHours || numberString(ingestion.hard_backfill_horizon_hours, DEFAULT_HORIZON_HOURS),
    staleEnabled: staleClosureResponseEnabled(definition),
    staleAction: stale.action === 'solved' ? 'solved' : 'closed',
    staleMessage: stringValue(stale.message),
    perRunTokens: numberString(perRun.max_estimated_tokens, DEFAULT_PER_RUN_TOKENS),
    perRunCost: numberString(perRun.max_estimated_cost_eur, DEFAULT_PER_RUN_COST),
    dailyRuns: numberString(daily.max_agent_runs, DEFAULT_DAILY_RUNS),
    dailyTokens: numberString(daily.max_estimated_tokens, DEFAULT_DAILY_TOKENS),
    dailyCost: numberString(daily.max_estimated_cost_eur, DEFAULT_DAILY_COST),
    publicReplyTtlHours: hoursString(approvalTtls.public_reply, DEFAULT_PUBLIC_REPLY_TTL_HOURS),
    internalNoteTtlHours: hoursString(approvalTtls.internal_note, DEFAULT_APPROVAL_TTL_HOURS),
    metadataTtlHours: hoursString(approvalTtls.classification ?? approvalTtls.status, DEFAULT_APPROVAL_TTL_HOURS),
    staleClosureTtlDays: daysString(approvalTtls.stale_closure, DEFAULT_STALE_CLOSURE_TTL_DAYS),
    onStale: ['re_review', 'cancel', 'apply_anyway'].includes(stringValue(onStale.internal_note)) ? stringValue(onStale.internal_note) : 're_review',
  };
}

function helpdeskDefinitionSettingsPayload(
  definition: AiAgentControlAgentDefinition,
  form: HelpdeskSettingsForm,
): AiAgentControlAgentDefinitionInput {
  const trigger = policyObject(definition.trigger_policy_json);
  const scope = policyObject(definition.scope_policy_json);
  const queue = policyObject(definition.queue_policy_json);
  const response = policyObject(definition.response_policy_json);
  const ingestion = nestedPolicy(scope, 'new_tickets_only');
  const predicates = targetingPredicatesFromForm(form);
  const mode = modeFromFilters(form.filters);
  const categoryId = categoryFromFilters(form.filters) || form.categoryId.trim();
  const entityId = entityFromFilters(form.filters) || form.entityId.trim();
  const horizonHours = createdHorizonHoursFromFilters(form.filters, form.horizonHours);
  const enabledAt = form.enabled
    ? stringValue(ingestion.enabled_at) || new Date().toISOString()
    : stringValue(ingestion.enabled_at) || null;
  // Shared per-mode selection block (entity/category filters + per-cycle caps).
  const blockConfig = {
    enabled: form.enabled,
    enabled_at: enabledAt,
    entity_id: entityId || null,
    category_id: categoryId || null,
    max_tickets_per_cycle: positiveNumber(form.maxTickets, DEFAULT_MAX_TICKETS),
    max_provider_requests_per_cycle: positiveNumber(form.maxRequests, DEFAULT_MAX_REQUESTS),
  };
  return {
    agent_priority: positiveNumber(form.agentPriority, 100),
    allowed_capabilities_json: allowedCapabilitiesWithStaleClosurePrereqs(definition, form.staleEnabled),
    response_policy_json: {
      ...response,
      prepare_stale_closure: form.staleEnabled,
      automatic_public_reply: false,
      automatic_ticket_updates: false,
      require_human_approval_for_writes: true,
    },
    trigger_policy_json: {
      ...trigger,
      manual_safe_target: { enabled: true },
      scheduled_poll: {
        ...policyObject(trigger.scheduled_poll),
        enabled: form.enabled,
      },
      saved_filter: policyObject(trigger.saved_filter).enabled == null ? { enabled: false } : trigger.saved_filter,
      provider_webhook: { enabled: false },
      ticket_update: { enabled: false },
      production_polling_enabled: form.enabled,
      automatic_writes_enabled: false,
    },
    scope_policy_json: {
      ...scope,
      mode: form.enabled ? mode : stringValue(scope.mode) || 'manual_safe_target',
      allowed_modes: ['manual_safe_target', 'new_tickets_only', 'all_open', 'agent_involved'],
      provider_kind: 'ticketing',
      provider_key: 'glpi',
      target_kind: 'ticket',
      required_safe_target_effect: 'read',
      targeting: {
        schema_version: 1,
        combinator: 'and',
        predicates,
      },
      new_tickets_only: mode === 'new_tickets_only'
        ? { ...blockConfig, hard_backfill_horizon_hours: horizonHours }
        : { enabled: false },
      all_open: mode === 'all_open' ? blockConfig : { enabled: false },
      agent_involved: mode === 'agent_involved' ? blockConfig : { enabled: false },
      new_plus_agent_touched: { enabled: false },
      saved_filter: { enabled: false },
      all_matching: { enabled: false },
      freeform_live_object_ids: false,
      stale_closure: {
        action: form.staleAction === 'solved' ? 'solved' : 'closed',
        message: form.staleMessage,
      },
    },
    queue_policy_json: {
      ...queue,
      enabled: true,
      review_cooldown_seconds: positiveNumber(form.reviewCooldownHours, DEFAULT_REVIEW_COOLDOWN_HOURS) * 3600,
      on_conflict: form.onConflict === 'supersede' ? 'supersede' : 'defer',
      approval_ttl_seconds_by_action_class: {
        public_reply: positiveNumber(form.publicReplyTtlHours, DEFAULT_PUBLIC_REPLY_TTL_HOURS) * 3600,
        internal_note: positiveNumber(form.internalNoteTtlHours, DEFAULT_APPROVAL_TTL_HOURS) * 3600,
        classification: positiveNumber(form.metadataTtlHours, DEFAULT_APPROVAL_TTL_HOURS) * 3600,
        status: positiveNumber(form.metadataTtlHours, DEFAULT_APPROVAL_TTL_HOURS) * 3600,
        assignment: positiveNumber(form.metadataTtlHours, DEFAULT_APPROVAL_TTL_HOURS) * 3600,
        participant: positiveNumber(form.metadataTtlHours, DEFAULT_APPROVAL_TTL_HOURS) * 3600,
        stale_closure: positiveNumber(form.staleClosureTtlDays, DEFAULT_STALE_CLOSURE_TTL_DAYS) * 86400,
      },
      on_stale_by_action_class: {
        public_reply: form.onStale === 'cancel' ? 'cancel' : 're_review',
        internal_note: ['re_review', 'cancel', 'apply_anyway'].includes(form.onStale) ? form.onStale : 're_review',
        classification: ['re_review', 'cancel', 'apply_anyway'].includes(form.onStale) ? form.onStale : 're_review',
        status: ['re_review', 'cancel', 'apply_anyway'].includes(form.onStale) ? form.onStale : 're_review',
        assignment: ['re_review', 'cancel', 'apply_anyway'].includes(form.onStale) ? form.onStale : 're_review',
        participant: ['re_review', 'cancel', 'apply_anyway'].includes(form.onStale) ? form.onStale : 're_review',
      },
      economic_guardrails: {
        configured: true,
        per_run: {
          max_estimated_tokens: positiveNumber(form.perRunTokens, DEFAULT_PER_RUN_TOKENS),
          max_estimated_cost_eur: positiveNumber(form.perRunCost, DEFAULT_PER_RUN_COST),
        },
        daily: {
          max_agent_runs: positiveNumber(form.dailyRuns, DEFAULT_DAILY_RUNS),
          max_estimated_tokens: positiveNumber(form.dailyTokens, DEFAULT_DAILY_TOKENS),
          max_estimated_cost_eur: positiveNumber(form.dailyCost, DEFAULT_DAILY_COST),
        },
      },
    },
  };
}

function MonitorTab({ agentKey }: { agentKey: string }) {
  const { t } = useTranslation(['agents']);
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const data = useAgentControlData();
  const [targetKey, setTargetKey] = React.useState('');
  const definition = data.queueQuery.data?.definitions.find((item) => item.agent_key === agentKey) ?? null;
  const summary = resolveAgentSummary(data.queueQuery.data, agentKey);
  const canAdmin = hasLevel('ai_agents', 'admin') || hasLevel('ai_settings', 'admin');
  const isBuiltInHelpdesk = definition?.agent_key === HELP_DESK_AGENT_KEY;
  // Run state vs emergency pause are distinct axes. An agent-scoped pause can be
  // lifted from here; a tenant/global pause is managed from the fleet overview.
  const agentPause = summary?.emergencyPause ?? null;
  const tenantPause = data.settingsQuery.data?.emergency_pause ?? null;
  const activePause = agentPause ?? tenantPause;
  // The agent does not run while it is draft/disabled — offer a Start that flips
  // it to enabled. Archived agents are restored deliberately from settings.
  const canStart = !!definition && definition.status !== 'enabled' && definition.status !== 'archived';
  const grouped = React.useMemo(() => buildTicketGroups(data.queueQuery.data ?? null, data.actionPool, definition?.id ?? null), [data.actionPool, data.queueQuery.data, definition?.id]);
  const agentGroups = grouped.groups;
  const pendingApprovalCount = agentGroups.reduce((sum, group) => sum + group.pendingActions.filter((action) => action.status === 'pending').length, 0);

  React.useEffect(() => {
    const first = data.targetsQuery.data?.items?.[0]?.target_key ?? '';
    if (!targetKey && first) setTargetKey(first);
  }, [data.targetsQuery.data, targetKey]);

  const triageMutation = useMutation({
    mutationFn: () => aiAgentControlApi.runGlpiTriage({ target_key: targetKey }),
    onSuccess: async () => {
      data.setMessage(t('monitor.testStarted'));
      await data.invalidate();
    },
    onError: (err) => data.setError(getApiErrorMessage(err, t, t('monitor.testFailed'))),
  });

  const [pauseDialogOpen, setPauseDialogOpen] = React.useState(false);
  const submitPause = (reason: string) => {
    if (!definition) return;
    data.createPauseMutation.mutate(
      { scope: 'agent', agent_definition_id: definition.id, reason, expires_in_minutes: null },
      { onSuccess: () => setPauseDialogOpen(false) },
    );
  };

  return (
    <Stack spacing={2}>
      {data.error && <Alert severity="error" onClose={() => data.setError(null)}>{data.error}</Alert>}
      {data.message && <Alert severity="success" onClose={() => data.setMessage(null)}>{data.message}</Alert>}
      {activePause && <Alert severity="warning">{t('pause.active', { reason: activePause.reason })}</Alert>}
      <Section
        title={t('monitor.status')}
        actions={(
          <Stack direction="row" spacing={1} alignItems="center">
            {agentPause ? (
              <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />} onClick={() => data.revokePauseMutation.mutate(agentPause.id)} disabled={data.revokePauseMutation.isPending}>{t('pause.lift')}</Button>
            ) : tenantPause ? (
              <Button size="small" variant="text" onClick={() => navigate('/agents')}>{t('pause.managedForAll')}</Button>
            ) : (
              <>
                {canAdmin && canStart && (
                  <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => definition && data.updateAgentStatusMutation.mutate({ id: definition.id, status: 'enabled' })} disabled={data.updateAgentStatusMutation.isPending}>{t('monitor.start')}</Button>
                )}
                <Button size="small" color="error" variant="outlined" startIcon={<PauseCircleOutlineIcon />} onClick={() => setPauseDialogOpen(true)}>{t('pause.agent')}</Button>
              </>
            )}
            <Button size="small" variant="outlined" startIcon={data.pollMutation.isPending ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={() => data.pollMutation.mutate()} disabled={data.pollMutation.isPending || !!activePause}>
              {t('monitor.checkNow')}
            </Button>
          </Stack>
        )}
      >
        <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
          <MetricBlock label={t('monitor.lifecycle')} value={definition ? t(`lifecycle.${lifecycleStatusKey(definition.status, !!summary?.ingestion.enabled, definition.automatic_action_classes?.length ?? 0, !!activePause || !!summary?.ingestion.paused)}`) : t('common.notSet')} />
          <MetricBlock label={t('monitor.watching')} value={summary?.ingestion.enabled ? (summary.ingestion.entityId || summary.ingestion.categoryId ? t('monitor.filtered') : t('monitor.allTickets')) : t('monitor.off')} />
          <MetricBlock label={t('monitor.lastCheck')} value={summary?.ingestion.lastPollStatus ? statusLabel(summary.ingestion.lastPollStatus) : t('common.notSet')} />
          <MetricBlock label={t('monitor.nextCheck')} value={summary?.ingestion.enabled ? t('monitor.everyFiveMinutes') : t('common.notSet')} />
        </Box>
      </Section>

      <Section title={t('monitor.queue')}>
        <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
          <MetricBlock label={t('monitor.waiting')} value={agentGroups.filter((group) => group.queueStatus === 'waiting_approval').length} />
          <MetricBlock label={t('monitor.inProgress')} value={agentGroups.filter((group) => ['queued', 'leased', 'running'].includes(group.queueStatus)).length} />
          <MetricBlock label={t('monitor.failed')} value={agentGroups.filter((group) => ['failed', 'dead_letter'].includes(group.queueStatus)).length} />
          <MetricBlock label={t('monitor.pendingApprovals')} value={pendingApprovalCount} />
        </Box>
      </Section>

      <Section title={t('monitor.limits')}>
        <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1 }}>
          <MetricBlock label={t('monitor.runsToday')} value={`${summary?.guardrails.daily?.runs ?? 0} / ${summary?.guardrails.daily?.cap.maxRuns ?? '-'}`} />
          <MetricBlock label={t('monitor.tokensToday')} value={`${formatNumber(summary?.guardrails.daily?.estimatedTokens ?? 0)} / ${formatNumber(summary?.guardrails.daily?.cap.maxTokens)}`} />
          <MetricBlock label={t('monitor.costToday')} value={`${(summary?.guardrails.daily?.estimatedCostEur ?? 0).toFixed(4)} / ${summary?.guardrails.daily?.cap.maxCostEur ?? '-'} EUR`} />
        </Box>
      </Section>

      {isBuiltInHelpdesk && (
        <Section title={t('monitor.testTicket')}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ p: 1.5 }} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Select variant="standard" value={targetKey} onChange={(event) => setTargetKey(event.target.value)} sx={[drawerSelectSx, { minWidth: 260 }]}>
              {(data.targetsQuery.data?.items ?? []).map((target) => (
                <MenuItem key={target.target_key} value={target.target_key} sx={drawerMenuItemSx}>{target.safety_label} / {target.external_ref}</MenuItem>
              ))}
            </Select>
            <Button size="small" variant="contained" startIcon={triageMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <ScienceOutlinedIcon />} disabled={!targetKey || triageMutation.isPending} onClick={() => triageMutation.mutate()}>
              {t('monitor.runTest')}
            </Button>
          </Stack>
        </Section>
      )}

      <Box>
        <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1 }}>{t('monitor.recentActivity')}</Typography>
        <AgentsActivityPage agentKey={agentKey} />
      </Box>

      <ReasonDialog
        open={pauseDialogOpen}
        title={t('pause.dialogTitle')}
        description={t('pause.dialogDescription')}
        label={t('pause.reasonLabel')}
        placeholder={t('pause.reasonPlaceholder')}
        busy={data.createPauseMutation.isPending}
        saveLabel={t('pause.agent')}
        onClose={() => setPauseDialogOpen(false)}
        onSubmit={submitPause}
      />
    </Stack>
  );
}

function PerformanceTab({ agentKey }: { agentKey: string }) {
  const { t } = useTranslation(['agents']);
  const data = useAgentControlData();
  const navigate = useNavigate();
  const definition = data.queueQuery.data?.definitions.find((item) => item.agent_key === agentKey) ?? null;
  const summary = resolveAgentSummary(data.queueQuery.data, agentKey);
  const dailyQuery = useQuery({
    queryKey: ['ai-agent-control-helpdesk-evaluation-daily', definition?.id ?? null, 30],
    queryFn: () => aiAgentControlApi.getHelpdeskEvaluationDaily({ days: 30, agentDefinitionId: definition?.id }),
    enabled: !!definition,
  });
  const daily = dailyQuery.data?.days ?? [];
  const actionClasses = Object.entries(summary?.evaluation.proposalsByActionClass ?? {});
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1 }}>
        <MetricBlock label={t('performance.acceptance')} value={formatPercent(summary?.evaluation.acceptanceRate)} />
        <MetricBlock label={t('performance.latency')} value={summary?.evaluation.medianApprovalLatencySeconds == null ? t('common.notSet') : `${Math.round(summary.evaluation.medianApprovalLatencySeconds / 60)} min`} />
        <MetricBlock label={t('performance.kbHitRate')} value={formatPercent(summary?.evaluation.kbHitRate)} />
        <MetricBlock label={t('performance.costPerTicket')} value={summary?.evaluation.costPerTicketEur == null ? t('common.notSet') : `${summary.evaluation.costPerTicketEur.toFixed(4)} EUR`} />
        <MetricBlock label={t('performance.runsPerTicket')} value={formatNumber(summary?.evaluation.runsPerTicket, 2)} />
      </Box>
      <Section title={t('performance.trends')}>
        <Stack spacing={0.75} sx={{ p: 1.5 }}>
          {daily.slice(-14).map((day) => (
            <Stack key={day.day} direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 82 }}>{day.day}</Typography>
              <Box sx={{ flex: 1, height: 8, borderRadius: 1, bgcolor: 'divider', overflow: 'hidden' }}>
                <Box sx={{ width: `${Math.min(100, day.proposals * 5)}%`, height: '100%', bgcolor: 'primary.main' }} />
              </Box>
              <Typography variant="caption">{t('performance.daySummary', { proposals: day.proposals, accepted: day.executed })}</Typography>
            </Stack>
          ))}
        </Stack>
      </Section>
      <Section title={t('performance.autonomy')}>
        <Stack spacing={1} sx={{ p: 1.5 }}>
          {actionClasses.length === 0 ? <EmptyState>{t('performance.noActionClasses')}</EmptyState> : actionClasses.map(([actionClass, count]) => (
            <Stack key={actionClass} direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Box>
                <Typography variant="body2">{t(`settings.actionClasses.${actionClass}`, { defaultValue: humanize(actionClass) })}</Typography>
                <Typography variant="caption" color="text.secondary">{t('performance.eligibility', { decided: count, required: 20 })}</Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => navigate(`/agents/${agentKey}?tab=settings`)}>
                {t('performance.reviewAutonomy')}
              </Button>
            </Stack>
          ))}
        </Stack>
      </Section>
    </Stack>
  );
}

function personaText(definition: AiAgentControlAgentDefinition, key: string): string {
  const value = definition.persona_json?.[key];
  if (Array.isArray(value)) return value.join('\n');
  return typeof value === 'string' ? value : '';
}

function knowledgeFormFromDefinition(definition: AiAgentControlAgentDefinition): {
  enabled: boolean; allLibraries: boolean; libraryIds: string[]; webEnabled: boolean;
} {
  const scope = definition.scope_policy_json && typeof definition.scope_policy_json === 'object'
    ? definition.scope_policy_json as Record<string, unknown> : {};
  const ks = scope.knowledge_sources && typeof scope.knowledge_sources === 'object'
    ? scope.knowledge_sources as Record<string, unknown> : {};
  const k = ks.knowledge && typeof ks.knowledge === 'object' ? ks.knowledge as Record<string, unknown> : {};
  const web = ks.web && typeof ks.web === 'object' ? ks.web as Record<string, unknown> : {};
  return {
    enabled: k.enabled !== false,
    allLibraries: k.all_libraries !== false,
    libraryIds: Array.isArray(k.library_ids) ? k.library_ids.filter((id): id is string => typeof id === 'string') : [],
    webEnabled: web.enabled === true,
  };
}

const TARGETING_OPTIONS_STALE_TIME_MS = 30_000;
const AVAILABLE_TARGETING_FIELDS: TargetingFilterField[] = ['status', 'priority', 'type', 'category', 'entity', 'created_at', 'updated_at', 'inactivity_age'];

function optionMetadataString(option: AiAgentControlRefItem, key: string): string {
  const value = option.metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function optionMetadataNumber(option: AiAgentControlRefItem, key: string): number | null {
  const value = option.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function optionLabel(options: AiAgentControlRefItem[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function statusOptionSemanticColor(option: AiAgentControlRefItem): string {
  const key = optionMetadataString(option, 'key').toLowerCase();
  const code = optionMetadataNumber(option, 'code');
  if (key.includes('pending') || code === 4) return 'warning';
  if (key.includes('processing') || key.includes('assigned') || code === 2 || code === 3) return 'info';
  if (key.includes('solved') || key.includes('resolved') || code === 5) return 'success';
  return 'default';
}

function statusOptionIsOpen(option: AiAgentControlRefItem): boolean {
  const key = optionMetadataString(option, 'key').toLowerCase();
  const label = option.label.toLowerCase();
  const code = optionMetadataNumber(option, 'code') ?? Number(option.value);
  if (Number.isFinite(code) && code >= 5) return false;
  return !(key.includes('solved') || key.includes('closed') || key.includes('resolved') || label.includes('solved') || label.includes('closed') || label.includes('resolved'));
}

function openStatusValues(options: AiAgentControlRefItem[]): string[] {
  return options.filter(statusOptionIsOpen).map((option) => option.value);
}

function prioritySemanticColor(option: AiAgentControlRefItem): string {
  const level = optionMetadataNumber(option, 'level') ?? optionMetadataNumber(option, 'code');
  if (level != null && level >= 5) return 'error';
  if (level != null && level >= 4) return 'warning';
  return 'default';
}

function DotOptionLabel({ color, label }: { color: string; label: React.ReactNode }) {
  const theme = useTheme();
  const dotColor = getDotColor(color, theme.palette.mode);
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dotColor, flex: '0 0 auto' }} />
      <Typography variant="body2" sx={{ color: dotColor, minWidth: 0 }}>{label}</Typography>
    </Stack>
  );
}

function defaultFilterForField(
  field: TargetingFilterField,
  options: { statuses?: AiAgentControlRefItem[]; priorities?: AiAgentControlRefItem[]; types?: AiAgentControlRefItem[] } = {},
): TargetingFilter {
  if (field === 'status') return buildFilter('status', openStatusValues(options.statuses ?? []));
  if (field === 'priority') {
    const priority = options.priorities?.find((option) => (optionMetadataNumber(option, 'level') ?? 0) >= 4) ?? options.priorities?.[0];
    return buildFilter('priority', priority?.value ?? '');
  }
  if (field === 'type') return buildFilter('type', options.types?.[0]?.value ?? '');
  if (field === 'created_at') return buildFilter('created_at', '', '3', 'days');
  if (field === 'updated_at') return buildFilter('updated_at', '', '1', 'days');
  if (field === 'inactivity_age') return buildFilter('inactivity_age', '', '3', 'days');
  if (field === 'touched_by') return buildFilter('touched_by', 'self');
  return buildFilter(field, '');
}

function ReferenceCatalogAutocomplete({
  agentId,
  field,
  value,
  label,
  onChange,
}: {
  agentId: string;
  field: 'category' | 'entity';
  value: string;
  label?: string;
  onChange: (next: { value: string; label?: string }) => void;
}) {
  const { t } = useTranslation(['agents']);
  const [inputValue, setInputValue] = React.useState(label || value);
  React.useEffect(() => {
    setInputValue(label || value);
  }, [label, value]);
  const lookupQuery = inputValue.trim() || value.trim();
  const optionsQuery = useQuery({
    queryKey: ['ai-agent-targeting-options', agentId, field, lookupQuery],
    queryFn: () => aiAgentControlApi.getAgentTargetingOptions(agentId, field, { query: lookupQuery || undefined, limit: 20 }),
    enabled: !!agentId,
    staleTime: TARGETING_OPTIONS_STALE_TIME_MS,
  });
  const options = optionsQuery.data?.options ?? [];
  const selected = value
    ? options.find((option) => option.value === value) ?? { value, label: label || value }
    : null;
  return (
    <Autocomplete<AiAgentControlRefItem, false, false, false>
      size="small"
      options={options}
      value={selected}
      inputValue={inputValue}
      loading={optionsQuery.isFetching}
      filterOptions={(items) => items}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, candidate) => option.value === candidate.value}
      noOptionsText={t('settings.targetingBuilder.noOptions')}
      onInputChange={(_event, next) => setInputValue(next)}
      onChange={(_event, option) => {
        onChange(option ? { value: option.value, label: option.label } : { value: '', label: '' });
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          variant="standard"
          placeholder={t(`settings.targetingFields.${field}`)}
          InputProps={{ ...params.InputProps, disableUnderline: true }}
          sx={editableFieldValueSx}
        />
      )}
    />
  );
}

function TargetingFilterBuilder({
  agentId,
  filters,
  onChange,
}: {
  agentId: string;
  filters: TargetingFilter[];
  onChange: (filters: TargetingFilter[]) => void;
}) {
  const { t } = useTranslation(['agents']);
  const statusOptionsQuery = useQuery({
    queryKey: ['ai-agent-targeting-options', agentId, 'status', ''],
    queryFn: () => aiAgentControlApi.getAgentTargetingOptions(agentId, 'status', { limit: 50 }),
    enabled: !!agentId,
    staleTime: TARGETING_OPTIONS_STALE_TIME_MS,
  });
  const priorityOptionsQuery = useQuery({
    queryKey: ['ai-agent-targeting-options', agentId, 'priority', ''],
    queryFn: () => aiAgentControlApi.getAgentTargetingOptions(agentId, 'priority', { limit: 50 }),
    enabled: !!agentId,
    staleTime: TARGETING_OPTIONS_STALE_TIME_MS,
  });
  const typeOptionsQuery = useQuery({
    queryKey: ['ai-agent-targeting-options', agentId, 'type', ''],
    queryFn: () => aiAgentControlApi.getAgentTargetingOptions(agentId, 'type', { limit: 50 }),
    enabled: !!agentId,
    staleTime: TARGETING_OPTIONS_STALE_TIME_MS,
  });
  const statusOptions = statusOptionsQuery.data?.options ?? [];
  const priorityOptions = priorityOptionsQuery.data?.options ?? [];
  const typeOptions = typeOptionsQuery.data?.options ?? [];
  const optionSets = React.useMemo(() => ({
    statuses: statusOptions,
    priorities: priorityOptions,
    types: typeOptions,
  }), [priorityOptions, statusOptions, typeOptions]);
  const updateFilter = (id: string, patch: Partial<TargetingFilter>) => {
    onChange(filters.map((filter) => (filter.id === id ? { ...filter, ...patch } : filter)));
  };
  const replaceField = (id: string, field: TargetingFilterField) => {
    onChange(filters.map((filter) => (filter.id === id ? defaultFilterForField(field, optionSets) : filter)));
  };
  const removeFilter = (id: string) => onChange(filters.filter((filter) => filter.id !== id));
  const addFilter = () => onChange([...filters, defaultFilterForField('status', optionSets)]);

  return (
    <Stack spacing={1}>
      {filters.map((filter) => (
        <Box
          key={filter.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr auto', md: '220px minmax(0, 1fr) auto' },
            gap: 1,
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            pb: 1,
          }}
        >
          <Select
            variant="standard"
            value={filter.field}
            onChange={(event) => replaceField(filter.id, event.target.value as TargetingFilterField)}
            sx={drawerSelectSx}
          >
            {AVAILABLE_TARGETING_FIELDS.map((field) => (
              <MenuItem key={field} value={field} sx={drawerMenuItemSx}>
                {t(`settings.targetingFields.${field}`)}
              </MenuItem>
            ))}
            <MenuItem value="touched_by" sx={drawerMenuItemSx}>
              {t('settings.targetingFields.touched_by')}
            </MenuItem>
          </Select>

          {filter.field === 'status' && (
            <Select
              multiple
              variant="standard"
              value={Array.isArray(filter.value) ? filter.value : []}
              renderValue={(selected) => (selected as string[]).map((value) => optionLabel(statusOptions, value)).join(', ')}
              onChange={(event) => {
                const value = event.target.value;
                updateFilter(filter.id, { value: typeof value === 'string' ? value.split(',') : value as string[] });
              }}
              sx={drawerSelectSx}
            >
              {statusOptions.map((status) => (
                <MenuItem key={status.value} value={status.value} sx={drawerMenuItemSx}>
                  <Checkbox size="small" checked={Array.isArray(filter.value) && filter.value.includes(status.value)} />
                  <ListItemText primary={<DotOptionLabel color={statusOptionSemanticColor(status)} label={status.label} />} />
                </MenuItem>
              ))}
            </Select>
          )}

          {filter.field === 'priority' && (
            <Select
              variant="standard"
              value={typeof filter.value === 'string' ? filter.value : ''}
              onChange={(event) => updateFilter(filter.id, { value: event.target.value })}
              sx={drawerSelectSx}
            >
              {priorityOptions.map((priority) => (
                <MenuItem key={priority.value} value={priority.value} sx={drawerMenuItemSx}>
                  <DotOptionLabel color={prioritySemanticColor(priority)} label={priority.label} />
                </MenuItem>
              ))}
            </Select>
          )}

          {filter.field === 'type' && (
            <Select
              variant="standard"
              value={typeof filter.value === 'string' ? filter.value : ''}
              onChange={(event) => updateFilter(filter.id, { value: event.target.value })}
              sx={drawerSelectSx}
            >
              {typeOptions.map((type) => (
                <MenuItem key={type.value} value={type.value} sx={drawerMenuItemSx}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          )}

          {filter.field === 'category' && (
            <ReferenceCatalogAutocomplete
              agentId={agentId}
              field="category"
              value={typeof filter.value === 'string' ? filter.value : ''}
              label={filter.label}
              onChange={(next) => updateFilter(filter.id, next)}
            />
          )}

          {filter.field === 'entity' && (
            <ReferenceCatalogAutocomplete
              agentId={agentId}
              field="entity"
              value={typeof filter.value === 'string' ? filter.value : ''}
              label={filter.label}
              onChange={(next) => updateFilter(filter.id, next)}
            />
          )}

          {(filter.field === 'created_at' || filter.field === 'updated_at' || filter.field === 'inactivity_age') && (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                variant="standard"
                type="number"
                value={filter.amount}
                InputProps={{ disableUnderline: true, inputProps: { min: 1 } }}
                sx={[editableFieldValueSx, { maxWidth: 92 }]}
                onChange={(event) => updateFilter(filter.id, { amount: event.target.value })}
              />
              <Select
                variant="standard"
                value={filter.unit}
                onChange={(event) => updateFilter(filter.id, { unit: event.target.value as TargetingFilterUnit })}
                sx={[drawerSelectSx, { maxWidth: 120 }]}
              >
                <MenuItem value="hours" sx={drawerMenuItemSx}>{t('settings.targetingBuilder.hours')}</MenuItem>
                <MenuItem value="days" sx={drawerMenuItemSx}>{t('settings.targetingBuilder.days')}</MenuItem>
              </Select>
            </Stack>
          )}

          {filter.field === 'touched_by' && (
            <Typography variant="body2" color="text.secondary">{t('settings.targetingBuilder.thisAgent')}</Typography>
          )}

          <Tooltip title={t('settings.targetingBuilder.remove')}>
            <IconButton size="small" onClick={() => removeFilter(filter.id)} aria-label={t('settings.targetingBuilder.remove')}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
      <Button size="small" variant="text" startIcon={<AddIcon />} onClick={addFilter} sx={[actionLinkButtonSx, { alignSelf: 'flex-start' }]}>
        {t('settings.targetingBuilder.add')}
      </Button>
    </Stack>
  );
}

function SettingsTab({ definition }: { definition: AiAgentControlAgentDefinition }) {
  const { t } = useTranslation(['agents']);
  const data = useAgentControlData();
  const settings = data.settingsQuery.data;
  const isBuiltInHelpdesk = definition.agent_key === HELP_DESK_AGENT_KEY;
  const isHelpdesk = definition.agent_type === 'helpdesk';
  const autonomyQuery = useQuery({
    queryKey: ['ai-agent-control-autonomy', definition.id],
    queryFn: () => aiAgentControlApi.getAgentAutonomy(definition.id),
  });
  const [autonomyTarget, setAutonomyTarget] = React.useState<{
    actionClass: string;
    decided: number;
    rate: string;
    days: number;
    eligible: boolean;
    overrideAvailable: boolean;
    reasons: string[];
  } | null>(null);
  const [overrideReason, setOverrideReason] = React.useState('');
  const [pendingPreset, setPendingPreset] = React.useState<TargetingPresetKey | null>(null);
  const [agentForm, setAgentForm] = React.useState({
    name: definition.name,
    description: definition.description ?? '',
    status: definition.status,
    mission: personaText(definition, 'mission'),
    tone: personaText(definition, 'tone'),
    instructions: personaText(definition, 'instructions'),
    escalation: personaText(definition, 'escalation_text'),
  });
  const [form, setForm] = React.useState<HelpdeskSettingsForm>(() => settingsFormFromDefinition(definition));
  const [knowledgeForm, setKnowledgeForm] = React.useState(() => knowledgeFormFromDefinition(definition));
  const [capabilityForm, setCapabilityForm] = React.useState<Record<string, boolean>>(() => capabilityEnabledState(definition));
  const webSearchAvailable = useFeatures().config.features.aiWebSearch;
  const librariesQuery = useQuery({
    queryKey: ['knowledge-libraries'],
    queryFn: () => aiAgentControlApi.listKnowledgeLibraries(),
    enabled: knowledgeForm.enabled,
    staleTime: 60_000,
  });
  const previewScopeJson = React.useMemo(() => {
    if (!isHelpdesk) return '';
    return JSON.stringify(helpdeskDefinitionSettingsPayload(definition, form).scope_policy_json ?? {});
  }, [definition, form, isHelpdesk]);
  const targetingPreviewQuery = useQuery({
    queryKey: ['ai-agent-targeting-preview', definition.id, previewScopeJson],
    queryFn: () => aiAgentControlApi.previewAgentTargeting(definition.id, {
      scope_policy_json: JSON.parse(previewScopeJson || '{}') as Record<string, unknown>,
    }),
    enabled: isHelpdesk && form.enabled && !!previewScopeJson,
    staleTime: 30_000,
  });
  const targetingStatusOptionsQuery = useQuery({
    queryKey: ['ai-agent-targeting-options', definition.id, 'status', ''],
    queryFn: () => aiAgentControlApi.getAgentTargetingOptions(definition.id, 'status', { limit: 50 }),
    enabled: isHelpdesk,
    staleTime: TARGETING_OPTIONS_STALE_TIME_MS,
  });
  const presetStatusValues = React.useMemo(
    () => openStatusValues(targetingStatusOptionsQuery.data?.options ?? []),
    [targetingStatusOptionsQuery.data?.options],
  );
  const presetStatusValuesKey = presetStatusValues.join('|');

  // Autosave: one controller per section, surfacing a subtle "Saving…/Saved"
  // indicator in each section header. No Save buttons — KANAP autosaves in-place
  // edits of existing entities (design charter, anti-pattern #15).
  const onSaveError = React.useCallback(
    (err: unknown) => data.setError(getApiErrorMessage(err, t, t('messages.agentSaveFailed'))),
    [data, t],
  );
  const identityAutosave = useAutosave({ onError: onSaveError });
  const settingsAutosave = useAutosave({ onError: onSaveError });
  const knowledgeAutosave = useAutosave({ onError: onSaveError });
  const capabilitiesAutosave = useAutosave({ onError: onSaveError });

  // Refs mirror the latest form state so debounced flush thunks read current
  // values at execution time, not stale schedule-time values.
  const agentFormRef = React.useRef(agentForm);
  agentFormRef.current = agentForm;
  const formRef = React.useRef(form);
  formRef.current = form;
  const knowledgeFormRef = React.useRef(knowledgeForm);
  knowledgeFormRef.current = knowledgeForm;
  const capabilityFormRef = React.useRef(capabilityForm);
  capabilityFormRef.current = capabilityForm;
  const savedStatusRef = React.useRef(definition.status);

  // Seed the helpdesk settings form once its source first loads (built-in: the
  // settings query; custom: the definition policy JSON), then leave local edits
  // authoritative so autosave round-trips never clobber in-flight typing.
  const settingsSeededRef = React.useRef(false);
  React.useEffect(() => {
    if (settingsSeededRef.current) return;
    if (isBuiltInHelpdesk) {
      if (!settings) return;
      const definitionForm = settingsFormFromDefinition(definition);
      const builtInHorizon = settings.ingestion.hardBackfillHorizonHours ?? DEFAULT_HORIZON_HOURS;
      const builtInFilters = targetingPresetFilters('new_tickets', builtInHorizon);
      if (settings.ingestion.entityId) {
        builtInFilters.push(buildFilter('entity', settings.ingestion.entityId));
      }
      if (settings.ingestion.categoryId) {
        builtInFilters.push(buildFilter('category', settings.ingestion.categoryId));
      }
      setForm({
        ...definitionForm,
        enabled: settings.ingestion.enabled,
        scopeMode: 'new_tickets_only',
        filters: builtInFilters,
        entityId: settings.ingestion.entityId ?? '',
        categoryId: settings.ingestion.categoryId ?? '',
        maxTickets: settings.ingestion.maxTicketsPerCycle != null ? String(settings.ingestion.maxTicketsPerCycle) : String(DEFAULT_MAX_TICKETS),
        maxRequests: settings.ingestion.maxProviderRequestsPerCycle != null ? String(settings.ingestion.maxProviderRequestsPerCycle) : String(DEFAULT_MAX_REQUESTS),
        horizonHours: String(builtInHorizon),
        staleEnabled: false,
        staleAction: 'closed',
        staleMessage: '',
        perRunTokens: settings.guardrails.perRun.maxEstimatedTokens != null ? String(settings.guardrails.perRun.maxEstimatedTokens) : String(DEFAULT_PER_RUN_TOKENS),
        perRunCost: settings.guardrails.perRun.maxEstimatedCostEur != null ? String(settings.guardrails.perRun.maxEstimatedCostEur) : String(DEFAULT_PER_RUN_COST),
        dailyRuns: settings.guardrails.daily.maxAgentRuns != null ? String(settings.guardrails.daily.maxAgentRuns) : String(DEFAULT_DAILY_RUNS),
        dailyTokens: settings.guardrails.daily.maxEstimatedTokens != null ? String(settings.guardrails.daily.maxEstimatedTokens) : String(DEFAULT_DAILY_TOKENS),
        dailyCost: settings.guardrails.daily.maxEstimatedCostEur != null ? String(settings.guardrails.daily.maxEstimatedCostEur) : String(DEFAULT_DAILY_COST),
      });
    }
    settingsSeededRef.current = true;
  }, [isBuiltInHelpdesk, settings]);

  React.useEffect(() => {
    if (presetStatusValues.length === 0) return;
    setForm((current) => {
      let changed = false;
      const filters = current.filters.map((filter) => {
        if (filter.field !== 'status' || statusFilterValues(filter.value).length > 0) return filter;
        changed = true;
        return { ...filter, value: presetStatusValues };
      });
      return changed ? { ...current, filters } : current;
    });
  }, [presetStatusValuesKey]);

  const persistIdentity = React.useCallback(async () => {
    const current = agentFormRef.current;
    await aiAgentControlApi.updateAgent(definition.id, {
      name: current.name,
      description: current.description || null,
      persona_json: {
        mission: current.mission,
        tone: current.tone,
        instructions: current.instructions.split('\n').map((line) => line.trim()).filter(Boolean),
        escalation_text: current.escalation,
      },
    });
    if (current.status !== savedStatusRef.current) {
      await aiAgentControlApi.updateAgentStatus(definition.id, { status: current.status });
      savedStatusRef.current = current.status;
    }
    await data.invalidate();
  }, [definition.id, data]);

  const persistSettings = React.useCallback(async () => {
    const current = formRef.current;
    const payload: AiAgentControlHelpdeskIngestionSettingsInput = {
      ingestion: {
        enabled: current.enabled,
        entityId: current.entityId.trim() || null,
        categoryId: current.categoryId.trim() || null,
        maxTicketsPerCycle: numberField(current.maxTickets),
        maxProviderRequestsPerCycle: numberField(current.maxRequests),
        hardBackfillHorizonHours: numberField(current.horizonHours),
      },
      guardrails: {
        perRun: {
          maxEstimatedTokens: numberField(current.perRunTokens),
          maxEstimatedCostEur: numberField(current.perRunCost),
        },
        daily: {
          maxAgentRuns: numberField(current.dailyRuns),
          maxEstimatedTokens: numberField(current.dailyTokens),
          maxEstimatedCostEur: numberField(current.dailyCost),
        },
      },
    };
    const definitionPayload = helpdeskDefinitionSettingsPayload(definition, current);
    if (isBuiltInHelpdesk) {
      await aiAgentControlApi.updateHelpdeskIngestionSettings(payload);
    }
    await aiAgentControlApi.updateAgent(definition.id, definitionPayload);
    await data.invalidate();
  }, [definition, isBuiltInHelpdesk, data]);

  const persistKnowledge = React.useCallback(async () => {
    const current = knowledgeFormRef.current;
    await aiAgentControlApi.updateAgent(definition.id, {
      knowledge_sources: {
        knowledge: {
          enabled: current.enabled,
          all_libraries: current.allLibraries,
          library_ids: current.allLibraries ? [] : current.libraryIds,
        },
        web: { enabled: current.webEnabled },
      },
    });
    await data.invalidate();
  }, [definition.id, data]);

  const persistCapabilities = React.useCallback(async () => {
    let allowed: unknown[] = capabilityEntries(definition.allowed_capabilities_json);
    for (const [groupKey, enabled] of Object.entries(capabilityFormRef.current)) {
      allowed = allowedCapabilitiesWithGroup({ ...definition, allowed_capabilities_json: allowed }, groupKey, enabled);
    }
    await aiAgentControlApi.updateAgent(definition.id, {
      allowed_capabilities_json: allowed,
    });
    await data.invalidate();
  }, [definition, data]);

  const updateAgent = (field: keyof typeof agentForm, value: string) => {
    setAgentForm((current) => ({ ...current, [field]: value }));
    identityAutosave.schedule(persistIdentity);
  };
  const update = <K extends keyof HelpdeskSettingsForm>(field: K, value: HelpdeskSettingsForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    settingsAutosave.schedule(persistSettings);
  };
  const updateFilters = (filters: TargetingFilter[]) => {
    setForm((current) => ({
      ...current,
      filters,
      scopeMode: modeFromFilters(filters),
      categoryId: categoryFromFilters(filters),
      entityId: entityFromFilters(filters),
      horizonHours: String(createdHorizonHoursFromFilters(filters, current.horizonHours)),
    }));
    settingsAutosave.schedule(persistSettings);
  };
  const applyTargetingPreset = (preset: TargetingPresetKey) => {
    updateFilters(targetingPresetFilters(preset, positiveNumber(form.horizonHours, DEFAULT_HORIZON_HOURS), presetStatusValues));
  };
  const requestTargetingPreset = (preset: TargetingPresetKey) => {
    if (form.filters.length > 0) {
      setPendingPreset(preset);
      return;
    }
    applyTargetingPreset(preset);
  };
  const updateKnowledge = (patch: Partial<typeof knowledgeForm>) => {
    setKnowledgeForm((current) => ({ ...current, ...patch }));
    knowledgeAutosave.schedule(persistKnowledge);
  };
  const updateCapability = (groupKey: string, enabled: boolean) => {
    setCapabilityForm((current) => ({ ...current, [groupKey]: enabled }));
    capabilitiesAutosave.schedule(persistCapabilities);
  };

  return (
    <Stack spacing={2}>
      {data.error && <Alert severity="error" onClose={() => data.setError(null)}>{data.error}</Alert>}
      {data.message && <Alert severity="success" onClose={() => data.setMessage(null)}>{data.message}</Alert>}
      <Section title={t('settings.objectiveCapabilities')} actions={<SaveIndicator status={identityAutosave.status} />}>
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 180px' }, gap: 1.5 }}>
            <SettingsField label={t('settings.name')}><TextField size="small" value={agentForm.name} onChange={(event) => updateAgent('name', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.status')}>
              <Select variant="standard" value={agentForm.status} onChange={(event) => updateAgent('status', event.target.value)} sx={drawerSelectSx}>
                {['draft', 'enabled', 'disabled', 'archived'].map((status) => <MenuItem key={status} value={status} sx={drawerMenuItemSx}>{t(`settings.statuses.${status}`)}</MenuItem>)}
              </Select>
            </SettingsField>
          </Box>
          <SettingsField label={t('settings.description')}><TextField size="small" value={agentForm.description} onChange={(event) => updateAgent('description', event.target.value)} /></SettingsField>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField label={t('settings.mission')}><TextField size="small" multiline minRows={3} value={agentForm.mission} onChange={(event) => updateAgent('mission', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.tone')}><TextField size="small" multiline minRows={3} value={agentForm.tone} onChange={(event) => updateAgent('tone', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.instructions')} hint={t('settings.instructionsHint')}><TextField size="small" multiline minRows={4} value={agentForm.instructions} onChange={(event) => updateAgent('instructions', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.escalation')}><TextField size="small" multiline minRows={4} value={agentForm.escalation} onChange={(event) => updateAgent('escalation', event.target.value)} /></SettingsField>
          </Box>
          {isHelpdesk && (
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={500}>{t('settings.capabilities')}</Typography>
                <SaveIndicator status={capabilitiesAutosave.status} />
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 1 }}>
                {HELPDESK_CAPABILITY_GROUPS.map((group) => (
                  <FormControlLabel
                    key={group.key}
                    control={<Switch checked={capabilityForm[group.key] === true} onChange={(event) => updateCapability(group.key, event.target.checked)} />}
                    label={t(`settings.capabilityGroups.${group.key}`, { defaultValue: humanize(group.key) })}
                  />
                ))}
              </Box>
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                  <FormControlLabel
                    control={<Switch checked={form.staleEnabled} onChange={(event) => update('staleEnabled', event.target.checked)} />}
                    label={t('settings.staleClosureEnable')}
                  />
                  {form.staleEnabled && (
                    <Select
                      variant="standard"
                      value={form.staleAction}
                      onChange={(event) => update('staleAction', event.target.value)}
                      sx={[drawerSelectSx, { maxWidth: 220 }]}
                    >
                      <MenuItem value="closed" sx={drawerMenuItemSx}>{t('settings.staleActions.closed')}</MenuItem>
                      <MenuItem value="solved" sx={drawerMenuItemSx}>{t('settings.staleActions.solved')}</MenuItem>
                    </Select>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">{t('settings.staleClosureObjectiveHint')}</Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </Section>

      {isHelpdesk && (
        <Section title={t('settings.targeting')} actions={<SaveIndicator status={settingsAutosave.status} />}>
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          <FormControlLabel control={<Switch checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} />} label={isBuiltInHelpdesk ? t('settings.watchNewTickets') : t('settings.watchTickets')} />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {(['new_tickets', 'all_open', 'handled'] as TargetingPresetKey[]).map((preset) => (
              <Button key={preset} size="small" variant="text" onClick={() => requestTargetingPreset(preset)} disabled={presetStatusValues.length === 0} sx={actionLinkButtonSx}>
                {t(`settings.targetingPresets.${preset}`)}
              </Button>
            ))}
          </Stack>
          <SettingsField label={t('settings.targetingBuilder.filters')} hint={t('settings.targetingBuilder.hint')}>
            <TargetingFilterBuilder agentId={definition.id} filters={form.filters} onChange={updateFilters} />
          </SettingsField>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
            <MetricBlock label={t('settings.preview.matches')} value={targetingPreviewQuery.isFetching ? '…' : formatNumber(targetingPreviewQuery.data?.preview.matchEstimate ?? 0)} />
            <MetricBlock label={t('settings.preview.sample')} value={targetingPreviewQuery.isFetching ? '…' : formatNumber(targetingPreviewQuery.data?.preview.sampleSize ?? 0)} />
            <MetricBlock label={t('settings.preview.overlap')} value={targetingPreviewQuery.isFetching ? '…' : formatNumber(targetingPreviewQuery.data?.preview.overlapEstimate ?? 0)} />
            <MetricBlock label={t('settings.preview.runsPerDay')} value={targetingPreviewQuery.isFetching ? '…' : formatNumber(targetingPreviewQuery.data?.preview.runsPerDayEstimate ?? 0)} />
          </Box>
          {targetingPreviewQuery.data?.preview.capped && <Typography variant="caption" color="text.secondary">{t('settings.preview.capped')}</Typography>}
          {targetingPreviewQuery.data?.preview.resolution?.length ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {targetingPreviewQuery.data.preview.resolution.map((entry, index) => (
                <Chip key={`${entry.predicate.field}-${index}`} size="small" label={`${entry.predicate.field}: ${t(`settings.predicateResolution.${entry.resolution}`)}`} />
              ))}
            </Stack>
          ) : null}
        </Stack>
        </Section>
      )}
      {isHelpdesk && <Section title={t('settings.operatingSettings')} actions={<SaveIndicator status={settingsAutosave.status} />}>
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField label={t('settings.agentPriority')}><TextField size="small" value={form.agentPriority} onChange={(event) => update('agentPriority', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.reviewCooldown')}><TextField size="small" value={form.reviewCooldownHours} onChange={(event) => update('reviewCooldownHours', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.onConflict')}>
              <Select variant="standard" value={form.onConflict} onChange={(event) => update('onConflict', event.target.value)} sx={drawerSelectSx}>
                <MenuItem value="defer" sx={drawerMenuItemSx}>{t('settings.conflictPolicies.defer')}</MenuItem>
                <MenuItem value="supersede" sx={drawerMenuItemSx}>{t('settings.conflictPolicies.supersede')}</MenuItem>
              </Select>
            </SettingsField>
            <SettingsField label={t('settings.maxTickets')}><TextField size="small" value={form.maxTickets} onChange={(event) => update('maxTickets', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.maxRequests')}><TextField size="small" value={form.maxRequests} onChange={(event) => update('maxRequests', event.target.value)} /></SettingsField>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField label={t('settings.publicReplyTtl')}><TextField size="small" value={form.publicReplyTtlHours} onChange={(event) => update('publicReplyTtlHours', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.internalNoteTtl')}><TextField size="small" value={form.internalNoteTtlHours} onChange={(event) => update('internalNoteTtlHours', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.metadataTtl')}><TextField size="small" value={form.metadataTtlHours} onChange={(event) => update('metadataTtlHours', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.staleClosureTtl')}><TextField size="small" value={form.staleClosureTtlDays} onChange={(event) => update('staleClosureTtlDays', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.onStale')}>
              <Select variant="standard" value={form.onStale} onChange={(event) => update('onStale', event.target.value)} sx={drawerSelectSx}>
                <MenuItem value="re_review" sx={drawerMenuItemSx}>{t('settings.stalePolicies.re_review')}</MenuItem>
                <MenuItem value="cancel" sx={drawerMenuItemSx}>{t('settings.stalePolicies.cancel')}</MenuItem>
                <MenuItem value="apply_anyway" sx={drawerMenuItemSx}>{t('settings.stalePolicies.apply_anyway')}</MenuItem>
              </Select>
            </SettingsField>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField label={t('settings.perRunTokens')}><TextField size="small" value={form.perRunTokens} onChange={(event) => update('perRunTokens', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.perRunCost')}><TextField size="small" value={form.perRunCost} onChange={(event) => update('perRunCost', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.dailyRuns')}><TextField size="small" value={form.dailyRuns} onChange={(event) => update('dailyRuns', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.dailyTokens')}><TextField size="small" value={form.dailyTokens} onChange={(event) => update('dailyTokens', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.dailyCost')}><TextField size="small" value={form.dailyCost} onChange={(event) => update('dailyCost', event.target.value)} /></SettingsField>
          </Box>
        </Stack>
      </Section>}

      <Section title={t('settings.knowledgeSources')} actions={<SaveIndicator status={knowledgeAutosave.status} />}>
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          <FormControlLabel
            control={<Switch checked={knowledgeForm.enabled} onChange={(event) => updateKnowledge({ enabled: event.target.checked })} />}
            label={t('settings.knowledgeEnabled')}
          />
          <Typography variant="caption" color="text.secondary">{t('settings.knowledgeHint')}</Typography>
          {knowledgeForm.enabled && (
            <>
              <FormControlLabel
                control={<Switch checked={knowledgeForm.allLibraries} onChange={(event) => updateKnowledge({ allLibraries: event.target.checked })} />}
                label={t('settings.allLibraries')}
              />
              {!knowledgeForm.allLibraries && (
                <SettingsField label={t('settings.specificLibraries')} hint={t('settings.librariesHint')}>
                  <Select
                    multiple
                    variant="standard"
                    sx={[drawerSelectSx, { maxWidth: 420 }]}
                    value={knowledgeForm.libraryIds}
                    displayEmpty
                    renderValue={(selected) => {
                      const ids = selected as string[];
                      if (ids.length === 0) {
                        return <Typography component="span" variant="body2" color="text.secondary">{t('settings.librariesPlaceholder')}</Typography>;
                      }
                      return ids
                        .map((id) => (librariesQuery.data ?? []).find((lib) => lib.id === id)?.name ?? id)
                        .join(', ');
                    }}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateKnowledge({ libraryIds: typeof value === 'string' ? value.split(',') : (value as unknown as string[]) });
                    }}
                  >
                    {(librariesQuery.data ?? []).map((lib) => <MenuItem key={lib.id} value={lib.id} sx={drawerMenuItemSx}>{lib.name}</MenuItem>)}
                  </Select>
                </SettingsField>
              )}
            </>
          )}
          <FormControlLabel
            control={(
              <Switch
                checked={knowledgeForm.webEnabled && webSearchAvailable}
                disabled={!webSearchAvailable}
                onChange={(event) => updateKnowledge({ webEnabled: event.target.checked })}
              />
            )}
            label={t('settings.webEnabled')}
          />
          <Typography variant="caption" color="text.secondary">
            {webSearchAvailable ? t('settings.webHint') : t('settings.webUnavailableHint')}
          </Typography>
        </Stack>
      </Section>

      <Section title={t('settings.autonomy')} id="autonomy">
        <Stack spacing={1} sx={{ p: 1.5 }}>
          {autonomyQuery.isLoading ? <CircularProgress size={20} /> : (autonomyQuery.data?.items ?? []).map((item) => {
            const enable = () => setAutonomyTarget({
              actionClass: item.actionClass,
              decided: item.progress.decided,
              rate: formatPercent(item.progress.acceptanceRate),
              days: item.progress.daysActive,
              eligible: item.eligible,
              overrideAvailable: item.recommendationOverrideAvailable === true,
              reasons: item.reasons,
            });
            const disable = () => data.setAutonomyMutation.mutate({ id: definition.id, actionClass: item.actionClass, mode: 'ask_first' });
            return (
              <Stack key={item.actionClass} direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500}>{t(`settings.actionClasses.${item.actionClass}`, { defaultValue: humanize(item.actionClass) })}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('settings.autonomyProgress', {
                      decided: item.progress.decided,
                      required: item.progress.required,
                      rate: formatPercent(item.progress.acceptanceRate),
                      requiredRate: formatPercent(item.progress.requiredRate),
                      days: item.progress.daysActive,
                      requiredDays: item.progress.requiredDays,
                    })}
                  </Typography>
                  {!item.eligible && <Typography variant="caption" color="text.secondary" display="block">{item.reasons.map((reason) => t(`settings.autonomyReasons.${reason}`, { defaultValue: humanize(reason) })).join(', ')}</Typography>}
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" color={item.mode === 'automatic' ? 'success' : 'default'} label={item.mode === 'automatic' ? t('settings.automatic') : t('settings.askFirst')} />
                  {item.mode === 'automatic' ? (
                    <Button size="small" variant="outlined" onClick={disable} disabled={data.setAutonomyMutation.isPending}>{t('settings.turnOffAutomatic')}</Button>
                  ) : (
                    <Button size="small" variant="contained" onClick={enable} disabled={(!item.eligible && item.recommendationOverrideAvailable !== true) || data.setAutonomyMutation.isPending}>{item.eligible ? t('settings.turnOnAutomatic') : t('settings.overrideAutomatic')}</Button>
                  )}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Section>

      {pendingPreset && (
        <KanapDialog
          open={!!pendingPreset}
          title={t('settings.targetingBuilder.replaceTitle')}
          onClose={() => setPendingPreset(null)}
          onSave={() => {
            applyTargetingPreset(pendingPreset);
            setPendingPreset(null);
          }}
          saveLabel={t('settings.targetingBuilder.replace')}
        >
          <Typography variant="body2" color="text.secondary">
            {t('settings.targetingBuilder.replaceDescription', {
              preset: t(`settings.targetingPresets.${pendingPreset}`),
            })}
          </Typography>
        </KanapDialog>
      )}

      {autonomyTarget && (
        <KanapDialog
          open={!!autonomyTarget}
          title={t('settings.autonomyDialog.title', {
            actionClass: t(`settings.actionClasses.${autonomyTarget.actionClass}`, { defaultValue: humanize(autonomyTarget.actionClass) }),
          })}
          onClose={() => {
            setAutonomyTarget(null);
            setOverrideReason('');
          }}
          onSave={() => data.setAutonomyMutation.mutate(
            {
              id: definition.id,
              actionClass: autonomyTarget.actionClass,
              mode: 'automatic',
              confirm: true,
              overrideAcknowledged: !autonomyTarget.eligible,
              overrideReason: !autonomyTarget.eligible ? overrideReason : null,
            },
            {
              onSuccess: () => {
                setAutonomyTarget(null);
                setOverrideReason('');
              },
            },
          )}
          saveLabel={t('settings.autonomyDialog.confirm')}
          saveDisabled={!autonomyTarget.eligible && overrideReason.trim().length < 8}
          saveLoading={data.setAutonomyMutation.isPending}
        >
          <Stack spacing={1.5}>
            <Typography variant="body2">
              {t('settings.autonomyDialog.evidence', { decided: autonomyTarget.decided, rate: autonomyTarget.rate, days: autonomyTarget.days })}
            </Typography>
            {!autonomyTarget.eligible && (
              <>
                <Alert severity="warning">{t('settings.autonomyDialog.overrideFrame')}</Alert>
                <Typography variant="body2" color="text.secondary">
                  {autonomyTarget.reasons.map((reason) => t(`settings.autonomyReasons.${reason}`, { defaultValue: humanize(reason) })).join(', ')}
                </Typography>
                <SettingsField label={t('settings.autonomyDialog.reason')}>
                  <TextField size="small" multiline minRows={2} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} />
                </SettingsField>
              </>
            )}
            <Typography variant="body2" color="text.secondary">{t('settings.autonomyDialog.frame')}</Typography>
          </Stack>
        </KanapDialog>
      )}
    </Stack>
  );
}

export default function AgentWorkspacePage() {
  const { t } = useTranslation(['agents']);
  const { agentKey = HELP_DESK_AGENT_KEY } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const data = useAgentControlData();
  const activeTab = (searchParams.get('tab') as WorkspaceTab | null) && TABS.includes(searchParams.get('tab') as WorkspaceTab)
    ? searchParams.get('tab') as WorkspaceTab
    : 'monitor';
  const definition = data.queueQuery.data?.definitions.find((item) => item.agent_key === agentKey) ?? null;
  const canAdmin = hasLevel('ai_agents', 'admin') || hasLevel('ai_settings', 'admin');
  const tabs = TABS.filter((tab) => tab !== 'settings' || canAdmin);

  const setTab = (_: React.SyntheticEvent, next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params);
  };

  if (data.queueQuery.isLoading && !definition) {
    return <Box display="flex" justifyContent="center" py={5}><CircularProgress size={24} /></Box>;
  }

  if (!definition) {
    return (
      <Box sx={{ p: 2 }}>
        <PageHeader
          title={t('workspace.notFound')}
          actions={<Button size="small" variant="outlined" onClick={() => navigate('/agents')}>{t('workspace.back')}</Button>}
        />
        <Alert severity="warning">{t('workspace.notFoundBody')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader
        title={definition.name}
        breadcrumbTitle={definition.name}
        actions={<Button size="small" variant="outlined" onClick={() => navigate('/agents')}>{t('workspace.back')}</Button>}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{definition.description ?? definition.agent_key}</Typography>
      <Stack spacing={2}>
        <Tabs value={tabs.includes(activeTab) ? activeTab : 'monitor'} onChange={setTab} variant="scrollable" scrollButtons="auto">
          {tabs.map((tab) => <Tab key={tab} value={tab} label={t(`workspace.tabs.${tab}`)} />)}
        </Tabs>
        {activeTab === 'monitor' && <MonitorTab agentKey={definition.agent_key} />}
        {activeTab === 'approvals' && <AgentsApprovalsPage agentKey={definition.agent_key} />}
        {activeTab === 'performance' && <PerformanceTab agentKey={definition.agent_key} />}
        {activeTab === 'settings' && canAdmin && <SettingsTab definition={definition} />}
      </Stack>
    </Box>
  );
}
