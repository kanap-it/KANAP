import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, MenuItem, Select, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import KanapDialog from '../../components/design/KanapDialog';
import { PropertyRow } from '../../components/design';
import { drawerMenuItemSx, drawerSelectSx, editableFieldValueSx, longFormSurfaceFieldSx } from '../../theme/formSx';
import {
  aiAgentControlApi,
  type AiAgentControlAgentDefinition,
  type AiAgentControlAgentDefinitionInput,
  type AiAgentControlHelpdeskIngestionSettingsInput,
  type AiAgentControlQueueOverview,
  type AiSharedContextProfile,
} from '../../ai/aiApi';
import { useAuth } from '../../auth/AuthContext';
import { useFeatures } from '../../config/FeaturesContext';
import useAutosave from '../../hooks/useAutosave';
import {
  buildTicketGroups,
  EmptyState,
  formatNumber,
  formatPercent,
  HELP_DESK_TICKETING_AGENT_KEY,
  humanize,
  lifecycleStatusKey,
  MetricBlock,
  ReasonDialog,
  resolveAgentSummary,
  SaveIndicator,
  Section,
  statusLabel,
  ticketingProviderKeyForDefinition,
} from '../../components/agents/agentControlPrimitives';
import {
  actionLinkButtonSx,
  buildFilter,
  categoryFromFilters,
  createdHorizonHoursFromFilters,
  DEFAULT_APPROVAL_TTL_HOURS,
  DEFAULT_DAILY_COST,
  DEFAULT_DAILY_RUNS,
  DEFAULT_DAILY_TOKENS,
  DEFAULT_HORIZON_HOURS,
  DEFAULT_MAX_REQUESTS,
  DEFAULT_MAX_TICKETS,
  DEFAULT_PER_RUN_COST,
  DEFAULT_PER_RUN_TOKENS,
  DEFAULT_REVIEW_COOLDOWN_HOURS,
  entityFromFilters,
  filtersFromScope,
  HelpdeskTargetingFilterBuilder,
  modeFromFilters,
  openStatusValues,
  statusFilterValues,
  TARGETING_OPTIONS_STALE_TIME_MS,
  targetingPredicatesFromFilters,
  targetingPresetFilters,
  type TargetingFilter,
  type TargetingPresetKey,
} from '../../components/agents/helpdeskTargeting';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import AgentsApprovalsPage from './AgentsApprovalsPage';
import AgentsActivityPage from './AgentsActivityPage';
import { useAgentControlData } from './useAgentControlData';

type WorkspaceTab = 'monitor' | 'approvals' | 'performance' | 'settings';
const TABS: WorkspaceTab[] = ['monitor', 'approvals', 'performance', 'settings'];
type EffectivePromptTaskKey = 'action_planner' | 'planner' | 'interpreter' | 'synthesis';
const EFFECTIVE_PROMPT_TASKS: EffectivePromptTaskKey[] = ['action_planner', 'planner', 'interpreter', 'synthesis'];

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

function SettingsField({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return <PropertyRow label={label} helperText={hint}>{children}</PropertyRow>;
}

const agentDescriptionFieldSx = [
  longFormSurfaceFieldSx,
  {
    maxWidth: 'none',
    '& .MuiInputBase-root': {
      minHeight: 96,
    },
  },
] as const;

const agentPersonaFieldSx = [
  longFormSurfaceFieldSx,
  {
    maxWidth: 'none',
    '& .MuiInputBase-root': {
      minHeight: 84,
    },
  },
] as const;

const SCOPE_MODES = ['new_tickets_only', 'all_open', 'agent_involved'] as const;

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
  perRunTokens: string;
  perRunCost: string;
  dailyRuns: string;
  dailyTokens: string;
  dailyCost: string;
  approvalTtlHours: string;
  onStale: string;
};

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
  const queue = policyObject(definition.queue_policy_json);
  const onStale = policyObject(queue.on_stale_by_action_class);
  // Single approval window. Falls back to the longest entry of the legacy per-action-class map
  // so an existing agent's window is never shortened on migration, else the default.
  const directApprovalTtl = Number(queue.approval_ttl_seconds);
  const legacyApprovalTtls = Object.values(policyObject(queue.approval_ttl_seconds_by_action_class))
    .map(Number)
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0);
  const approvalTtlSeconds = Number.isFinite(directApprovalTtl) && directApprovalTtl > 0
    ? directApprovalTtl
    : legacyApprovalTtls.length > 0
      ? Math.max(...legacyApprovalTtls)
      : DEFAULT_APPROVAL_TTL_HOURS * 3600;
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
    perRunTokens: numberString(perRun.max_estimated_tokens, DEFAULT_PER_RUN_TOKENS),
    perRunCost: numberString(perRun.max_estimated_cost_eur, DEFAULT_PER_RUN_COST),
    dailyRuns: numberString(daily.max_agent_runs, DEFAULT_DAILY_RUNS),
    dailyTokens: numberString(daily.max_estimated_tokens, DEFAULT_DAILY_TOKENS),
    dailyCost: numberString(daily.max_estimated_cost_eur, DEFAULT_DAILY_COST),
    approvalTtlHours: hoursString(approvalTtlSeconds, DEFAULT_APPROVAL_TTL_HOURS),
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
  const predicates = targetingPredicatesFromFilters(form.filters);
  const mode = modeFromFilters(form.filters);
  const categoryId = categoryFromFilters(form.filters) || form.categoryId.trim();
  const entityId = entityFromFilters(form.filters) || form.entityId.trim();
  const horizonHours = createdHorizonHoursFromFilters(form.filters, form.horizonHours);
  const providerKey = ticketingProviderKeyForDefinition(definition);
  if (!providerKey) {
    throw new Error('This agent has no ticketing provider binding.');
  }
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
    allowed_capabilities_json: capabilityEntries(definition.allowed_capabilities_json),
    response_policy_json: {
      ...response,
      prepare_stale_closure: undefined,
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
      provider_key: providerKey,
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
      stale_closure: undefined,
    },
    queue_policy_json: {
      ...queue,
      enabled: true,
      review_cooldown_seconds: positiveNumber(form.reviewCooldownHours, DEFAULT_REVIEW_COOLDOWN_HOURS) * 3600,
      on_conflict: form.onConflict === 'supersede' ? 'supersede' : 'defer',
      approval_ttl_seconds: positiveNumber(form.approvalTtlHours, DEFAULT_APPROVAL_TTL_HOURS) * 3600,
      approval_ttl_seconds_by_action_class: undefined,
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
  const data = useAgentControlData({ targetAgentKey: agentKey });
  const [targetKey, setTargetKey] = React.useState('');
  const definition = data.queueQuery.data?.definitions.find((item) => item.agent_key === agentKey) ?? null;
  const summary = resolveAgentSummary(data.queueQuery.data, agentKey);
  const canAdmin = hasLevel('ai_agents', 'admin') || hasLevel('ai_settings', 'admin');
  const isBuiltInHelpdesk = definition?.agent_key === HELP_DESK_TICKETING_AGENT_KEY;
  // Run state vs emergency pause are distinct axes. An agent-scoped pause can be
  // lifted from here; a tenant/global pause is managed from the fleet overview.
  const agentPause = summary?.emergencyPause ?? null;
  const tenantPause = data.settingsQuery.data?.emergency_pause ?? null;
  const activePause = agentPause ?? tenantPause;
  // The agent does not run while it is draft/disabled — offer a Start that flips
  // it to enabled. Archived agents are restored deliberately from settings.
  const canStart = !!definition && definition.status !== 'enabled' && definition.status !== 'archived';
  const grouped = React.useMemo(() => buildTicketGroups(data.queueQuery.data ?? null, data.actionPool, definition?.id ?? null, Date.now()), [data.actionPool, data.queueQuery.data, definition?.id]);
  const agentGroups = grouped.groups;
  const pendingApprovalCount = agentGroups.reduce((sum, group) => sum + group.pendingActions.filter((action) => action.status === 'pending').length, 0);

  React.useEffect(() => {
    const first = data.targetsQuery.data?.items?.[0]?.target_key ?? '';
    if (!targetKey && first) setTargetKey(first);
  }, [data.targetsQuery.data, targetKey]);

  const triageMutation = useMutation({
    mutationFn: () => {
      if (!data.ticketingProviderKey) {
        throw new Error(t('monitor.providerMissing'));
      }
      return aiAgentControlApi.runTicketingTriage({ provider_key: data.ticketingProviderKey, target_key: targetKey });
    },
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
            <Button size="small" variant="contained" startIcon={triageMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <ScienceOutlinedIcon />} disabled={!data.ticketingProviderKey || !targetKey || triageMutation.isPending} onClick={() => triageMutation.mutate()}>
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

function personaNestedText(definition: AiAgentControlAgentDefinition, objectKey: string, key: string): string {
  const value = definition.persona_json?.[objectKey];
  if (!isRecord(value)) return '';
  return stringValue(value[key]);
}

function personaEscalationGuidance(definition: AiAgentControlAgentDefinition): string {
  return personaText(definition, 'escalation_guidance') || personaText(definition, 'escalation_text');
}

function personaSharedContext(definition: AiAgentControlAgentDefinition): { enabled: boolean; profileId: string | null } {
  const value = definition.persona_json?.shared_context;
  const shared = isRecord(value) ? value : {};
  const profileId = stringValue(shared.profile_id).trim();
  return {
    enabled: shared.enabled === true,
    profileId: profileId || null,
  };
}

function sharedContextProfileLines(profile: AiSharedContextProfile | null | undefined): string[] {
  const content = profile?.content_json;
  if (isRecord(content) && Array.isArray(content.lines)) {
    return content.lines.filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
  }
  return [];
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

function SettingsTab({ definition }: { definition: AiAgentControlAgentDefinition }) {
  const { t } = useTranslation(['agents']);
  const data = useAgentControlData();
  const queryClient = useQueryClient();
  // Autosave persists each change, then patches the cached agent definition in place
  // instead of invalidating the whole workspace query set. This keeps the definition
  // (and the config-version-keyed effective-prompt preview) fresh without refetching
  // the queue/settings queries that drive the page, so a save no longer redraws it.
  const applySavedDefinition = React.useCallback((saved: AiAgentControlAgentDefinition) => {
    queryClient.setQueryData<AiAgentControlQueueOverview>(['ai-agent-control-queue'], (old) => {
      if (!old?.definitions) return old;
      return { ...old, definitions: old.definitions.map((item) => (item.id === saved.id ? saved : item)) };
    });
  }, [queryClient]);
  const settings = data.settingsQuery.data;
  const isBuiltInHelpdesk = definition.agent_key === HELP_DESK_TICKETING_AGENT_KEY;
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
  const sharedContext = personaSharedContext(definition);
  const [agentForm, setAgentForm] = React.useState({
    name: definition.name,
    description: definition.description ?? '',
    status: definition.status,
    mission: personaText(definition, 'mission'),
    outputStyleTone: personaNestedText(definition, 'output_style', 'tone') || personaText(definition, 'tone'),
    outputStyleLanguage: personaNestedText(definition, 'output_style', 'language') || 'auto',
    instructions: personaText(definition, 'instructions'),
    escalationGuidance: personaEscalationGuidance(definition),
    sharedContextEnabled: sharedContext.enabled,
    sharedContextProfileId: sharedContext.profileId,
  });
  const [sharedContextDialogOpen, setSharedContextDialogOpen] = React.useState(false);
  const [sharedContextDraftName, setSharedContextDraftName] = React.useState('');
  const [sharedContextDraftLines, setSharedContextDraftLines] = React.useState('');
  const [effectivePromptTask, setEffectivePromptTask] = React.useState<EffectivePromptTaskKey>('action_planner');
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
  const sharedContextProfilesQuery = useQuery({
    queryKey: ['ai-agent-shared-context-profiles'],
    queryFn: () => aiAgentControlApi.listSharedContextProfiles(),
    staleTime: 60_000,
  });
  const effectivePromptQuery = useQuery({
    queryKey: ['ai-agent-effective-prompt', definition.id, definition.config_version],
    queryFn: () => aiAgentControlApi.getEffectivePrompt(definition.id),
    staleTime: 30_000,
    // Keep showing the previous compiled prompt while the next version loads, so the
    // preview updates seamlessly after a save instead of flashing a loading state.
    placeholderData: (previousData) => previousData,
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
    const res = await aiAgentControlApi.updateAgent(definition.id, {
      name: current.name,
      description: current.description || null,
      persona_json: {
        mission: current.mission,
        instructions: current.instructions.split('\n').map((line) => line.trim()).filter(Boolean),
        output_style: {
          tone: current.outputStyleTone,
          language: current.outputStyleLanguage,
        },
        escalation_guidance: current.escalationGuidance,
        shared_context: {
          enabled: current.sharedContextEnabled,
          profile_id: current.sharedContextProfileId,
        },
      },
    });
    let saved = res.agent_definition;
    if (current.status !== savedStatusRef.current) {
      const statusRes = await aiAgentControlApi.updateAgentStatus(definition.id, { status: current.status });
      saved = statusRes.agent_definition;
      savedStatusRef.current = current.status;
    }
    applySavedDefinition(saved);
  }, [definition.id, applySavedDefinition]);

  const createSharedContextProfileMutation = useMutation({
    mutationFn: (payload: { name: string; lines: string[] }) => aiAgentControlApi.createSharedContextProfile({
      name: payload.name,
      lines: payload.lines,
    }),
    onSuccess: async (result) => {
      await sharedContextProfilesQuery.refetch();
      const profileId = result.profile.id;
      setAgentForm((current) => {
        const next = {
          ...current,
          sharedContextEnabled: true,
          sharedContextProfileId: profileId,
        };
        agentFormRef.current = next;
        return next;
      });
      setSharedContextDialogOpen(false);
      setSharedContextDraftName('');
      setSharedContextDraftLines('');
      identityAutosave.schedule(persistIdentity);
    },
    onError: onSaveError,
  });

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
      await queryClient.invalidateQueries({ queryKey: ['ai-agent-helpdesk-settings'] });
    }
    const res = await aiAgentControlApi.updateAgent(definition.id, definitionPayload);
    applySavedDefinition(res.agent_definition);
  }, [definition, isBuiltInHelpdesk, applySavedDefinition, queryClient]);

  const persistKnowledge = React.useCallback(async () => {
    const current = knowledgeFormRef.current;
    const res = await aiAgentControlApi.updateAgent(definition.id, {
      knowledge_sources: {
        knowledge: {
          enabled: current.enabled,
          all_libraries: current.allLibraries,
          library_ids: current.allLibraries ? [] : current.libraryIds,
        },
        web: { enabled: current.webEnabled },
      },
    });
    applySavedDefinition(res.agent_definition);
  }, [definition.id, applySavedDefinition]);

  const persistCapabilities = React.useCallback(async () => {
    let allowed: unknown[] = capabilityEntries(definition.allowed_capabilities_json);
    for (const [groupKey, enabled] of Object.entries(capabilityFormRef.current)) {
      allowed = allowedCapabilitiesWithGroup({ ...definition, allowed_capabilities_json: allowed }, groupKey, enabled);
    }
    const res = await aiAgentControlApi.updateAgent(definition.id, {
      allowed_capabilities_json: allowed,
    });
    applySavedDefinition(res.agent_definition);
    await queryClient.invalidateQueries({ queryKey: ['ai-agent-control-autonomy', definition.id] });
  }, [definition, applySavedDefinition, queryClient]);

  const updateAgent = <K extends keyof typeof agentForm>(field: K, value: typeof agentForm[K]) => {
    setAgentForm((current) => ({ ...current, [field]: value }));
    identityAutosave.schedule(persistIdentity);
  };
  const updateAgentPatch = (patch: Partial<typeof agentForm>) => {
    setAgentForm((current) => ({ ...current, ...patch }));
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
  const sharedContextProfiles = (sharedContextProfilesQuery.data?.items ?? []).filter((profile) => profile.status === 'active');
  const selectedSharedContextProfile = sharedContextProfiles.find((profile) => profile.id === agentForm.sharedContextProfileId) ?? null;
  const selectedSharedContextLines = sharedContextProfileLines(selectedSharedContextProfile);
  const effectivePromptText = effectivePromptQuery.data?.tasks?.[effectivePromptTask]?.system_prompt ?? '';
  const handleCreateSharedContextProfile = () => {
    const name = sharedContextDraftName.trim();
    const lines = sharedContextDraftLines.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!name || lines.length === 0) return;
    createSharedContextProfileMutation.mutate({ name, lines });
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
          <SettingsField label={t('settings.description')}>
            <TextField
              size="small"
              variant="standard"
              multiline
              minRows={3}
              value={agentForm.description}
              InputProps={{ disableUnderline: true }}
              sx={agentDescriptionFieldSx}
              onChange={(event) => updateAgent('description', event.target.value)}
            />
          </SettingsField>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
              gap: { xs: 2, lg: 3 },
              alignItems: 'start',
            }}
          >
            <Stack spacing={2}>
            <SettingsField label={t('settings.mission')}>
              <TextField
                size="small"
                variant="standard"
                multiline
                minRows={2}
                maxRows={8}
                value={agentForm.mission}
                InputProps={{ disableUnderline: true }}
                sx={agentPersonaFieldSx}
                onChange={(event) => updateAgent('mission', event.target.value)}
              />
            </SettingsField>
            <SettingsField label={t('settings.instructions')}>
              <TextField
                size="small"
                variant="standard"
                multiline
                minRows={3}
                maxRows={20}
                value={agentForm.instructions}
                InputProps={{ disableUnderline: true }}
                sx={agentPersonaFieldSx}
                onChange={(event) => updateAgent('instructions', event.target.value)}
              />
            </SettingsField>
            <SettingsField label={t('settings.outputStyle')}>
              <TextField
                size="small"
                variant="standard"
                value={agentForm.outputStyleTone}
                placeholder={t('settings.outputStyleTonePlaceholder')}
                InputProps={{ disableUnderline: true }}
                sx={editableFieldValueSx}
                onChange={(event) => updateAgent('outputStyleTone', event.target.value)}
              />
            </SettingsField>
            <SettingsField label={t('settings.replyLanguage')}>
              <Select
                variant="standard"
                disableUnderline
                value={agentForm.outputStyleLanguage}
                sx={drawerSelectSx}
                onChange={(event) => updateAgent('outputStyleLanguage', event.target.value)}
              >
                {['auto', 'fr', 'en', 'de', 'es'].map((value) => (
                  <MenuItem key={value} value={value} sx={drawerMenuItemSx}>{t(`settings.outputStyleLanguageOptions.${value}`)}</MenuItem>
                ))}
              </Select>
            </SettingsField>
            <SettingsField label={t('settings.escalationGuidance')}>
              <TextField
                size="small"
                variant="standard"
                multiline
                minRows={2}
                maxRows={10}
                value={agentForm.escalationGuidance}
                InputProps={{ disableUnderline: true }}
                sx={agentPersonaFieldSx}
                onChange={(event) => updateAgent('escalationGuidance', event.target.value)}
              />
            </SettingsField>
            <SettingsField label={t('settings.sharedContext')} hint={t('settings.sharedContextHint')}>
              <Stack spacing={1}>
                <FormControlLabel
                  control={(
                    <Switch
                      checked={agentForm.sharedContextEnabled}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        updateAgentPatch({
                          sharedContextEnabled: checked,
                          sharedContextProfileId: checked && !agentForm.sharedContextProfileId && sharedContextProfiles[0]
                            ? sharedContextProfiles[0].id
                            : agentForm.sharedContextProfileId,
                        });
                      }}
                    />
                  )}
                  label={t('settings.sharedContextEnabled')}
                />
                <Select
                  variant="standard"
                  disableUnderline
                  value={agentForm.sharedContextProfileId ?? ''}
                  displayEmpty
                  disabled={!agentForm.sharedContextEnabled || sharedContextProfiles.length === 0}
                  sx={drawerSelectSx}
                  onChange={(event) => updateAgent('sharedContextProfileId', event.target.value || null)}
                >
                  <MenuItem value="" sx={drawerMenuItemSx}>{t('settings.sharedContextNoProfile')}</MenuItem>
                  {sharedContextProfiles.map((profile) => (
                    <MenuItem key={profile.id} value={profile.id} sx={drawerMenuItemSx}>{profile.name}</MenuItem>
                  ))}
                </Select>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Button size="small" variant="text" sx={actionLinkButtonSx} onClick={() => setSharedContextDialogOpen(true)}>
                    {`+ ${t('settings.sharedContextCreate')}`}
                  </Button>
                </Box>
                <Box
                  sx={(theme) => ({
                    minHeight: 72,
                    maxHeight: 150,
                    overflow: 'auto',
                    border: `1px solid ${theme.palette.kanap.border.default}`,
                    borderRadius: 1,
                    bgcolor: theme.palette.kanap.bg.composer,
                    px: 1,
                    py: 0.75,
                    fontSize: 13,
                    color: theme.palette.kanap.text.primary,
                    whiteSpace: 'pre-wrap',
                  })}
                >
                  {selectedSharedContextLines.length > 0
                    ? selectedSharedContextLines.join('\n')
                    : t('settings.sharedContextEmptyPreview')}
                </Box>
              </Stack>
            </SettingsField>
            </Stack>
            <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 }, alignSelf: 'start' }}>
            <SettingsField
              label={(
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">{t('settings.effectivePrompt')}</Typography>
                  <Select
                    variant="standard"
                    disableUnderline
                    value={effectivePromptTask}
                    onChange={(event) => setEffectivePromptTask(event.target.value as EffectivePromptTaskKey)}
                    sx={[drawerSelectSx, { minWidth: 150 }]}
                  >
                    {EFFECTIVE_PROMPT_TASKS.map((task) => (
                      <MenuItem key={task} value={task} sx={drawerMenuItemSx}>{t(`settings.effectivePromptTasks.${task}`)}</MenuItem>
                    ))}
                  </Select>
                </Stack>
              )}
              hint={t('settings.effectivePromptHint')}
            >
              <Box
                component="pre"
                sx={(theme) => ({
                  m: 0,
                  minHeight: 320,
                  maxHeight: { xs: 360, lg: 'calc(100vh - 200px)' },
                  overflow: 'auto',
                  border: `1px solid ${theme.palette.kanap.border.default}`,
                  borderRadius: 1,
                  bgcolor: theme.palette.kanap.bg.composer,
                  color: theme.palette.kanap.text.primary,
                  fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 12,
                  lineHeight: 1.55,
                  p: 1,
                  whiteSpace: 'pre-wrap',
                })}
              >
                {effectivePromptQuery.isLoading
                  ? t('settings.effectivePromptLoading')
                  : effectivePromptText || t('settings.effectivePromptEmpty')}
              </Box>
            </SettingsField>
            </Box>
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
            <HelpdeskTargetingFilterBuilder agentId={definition.id} filters={form.filters} onChange={updateFilters} />
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField label={t('settings.approvalTtl')} hint={t('settings.approvalTtlHint')}><TextField size="small" value={form.approvalTtlHours} onChange={(event) => update('approvalTtlHours', event.target.value)} /></SettingsField>
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

      {sharedContextDialogOpen && (
        <KanapDialog
          open={sharedContextDialogOpen}
          title={t('settings.sharedContextDialog.title')}
          onClose={() => setSharedContextDialogOpen(false)}
          onSave={handleCreateSharedContextProfile}
          saveLabel={t('settings.sharedContextDialog.create')}
          saveDisabled={sharedContextDraftName.trim().length === 0 || sharedContextDraftLines.split('\n').map((line) => line.trim()).filter(Boolean).length === 0}
          saveLoading={createSharedContextProfileMutation.isPending}
        >
          <Stack spacing={1.5}>
            <SettingsField label={t('settings.sharedContextDialog.name')}>
              <TextField
                size="small"
                variant="standard"
                value={sharedContextDraftName}
                placeholder={t('settings.sharedContextDialog.namePlaceholder')}
                InputProps={{ disableUnderline: true }}
                sx={editableFieldValueSx}
                onChange={(event) => setSharedContextDraftName(event.target.value)}
              />
            </SettingsField>
            <SettingsField label={t('settings.sharedContextDialog.lines')} hint={t('settings.sharedContextDialog.linesHint')}>
              <TextField
                size="small"
                variant="standard"
                multiline
                minRows={6}
                value={sharedContextDraftLines}
                placeholder={t('settings.sharedContextDialog.linesPlaceholder')}
                InputProps={{ disableUnderline: true }}
                sx={agentPersonaFieldSx}
                onChange={(event) => setSharedContextDraftLines(event.target.value)}
              />
            </SettingsField>
          </Stack>
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
  const { agentKey = HELP_DESK_TICKETING_AGENT_KEY } = useParams();
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
