import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, MenuItem, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import KanapDialog from '../../components/design/KanapDialog';
import {
  aiAgentControlApi,
  type AiAgentControlAgentDefinition,
  type AiAgentControlAgentDefinitionInput,
  type AiAgentControlHelpdeskIngestionSettingsInput,
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
  SettingsField,
  statusLabel,
} from '../../components/agents/agentControlPrimitives';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
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

const DEFAULT_STALE_HOURS = 72;
const SCOPE_MODES = ['new_tickets_only', 'all_open', 'agent_involved'] as const;

type HelpdeskSettingsForm = {
  enabled: boolean;
  scopeMode: string;
  entityId: string;
  categoryId: string;
  maxTickets: string;
  maxRequests: string;
  horizonHours: string;
  staleEnabled: boolean;
  staleAction: string;
  staleHours: string;
  staleDays: string;
  staleMessage: string;
  perRunTokens: string;
  perRunCost: string;
  dailyRuns: string;
  dailyTokens: string;
  dailyCost: string;
};

function settingsFormFromDefinition(definition: AiAgentControlAgentDefinition): HelpdeskSettingsForm {
  const trigger = policyObject(definition.trigger_policy_json);
  const scope = policyObject(definition.scope_policy_json);
  const rawMode = stringValue(scope.mode);
  const mode = (SCOPE_MODES as readonly string[]).includes(rawMode) ? rawMode : 'new_tickets_only';
  const ingestion = nestedPolicy(scope, 'new_tickets_only');
  const activeBlock = nestedPolicy(scope, mode);
  const stale = policyObject(scope.stale_closure);
  const guardrails = nestedPolicy(definition.queue_policy_json, 'economic_guardrails');
  const perRun = policyObject(guardrails.per_run);
  const daily = policyObject(guardrails.daily);
  return {
    enabled: policyObject(trigger.scheduled_poll).enabled === true && activeBlock.enabled === true,
    scopeMode: mode,
    entityId: stringValue(activeBlock.entity_id ?? activeBlock.entityId ?? ingestion.entity_id),
    categoryId: stringValue(activeBlock.category_id ?? activeBlock.categoryId ?? ingestion.category_id),
    maxTickets: numberString(activeBlock.max_tickets_per_cycle ?? ingestion.max_tickets_per_cycle, DEFAULT_MAX_TICKETS),
    maxRequests: numberString(activeBlock.max_provider_requests_per_cycle ?? ingestion.max_provider_requests_per_cycle, DEFAULT_MAX_REQUESTS),
    horizonHours: numberString(ingestion.hard_backfill_horizon_hours, DEFAULT_HORIZON_HOURS),
    staleEnabled: stale.enabled === true,
    staleAction: stale.action === 'solved' ? 'solved' : 'closed',
    staleHours: numberString(stale.staleness_hours, DEFAULT_STALE_HOURS),
    staleDays: numberString(stale.staleness_days, 0),
    staleMessage: stringValue(stale.message),
    perRunTokens: numberString(perRun.max_estimated_tokens, DEFAULT_PER_RUN_TOKENS),
    perRunCost: numberString(perRun.max_estimated_cost_eur, DEFAULT_PER_RUN_COST),
    dailyRuns: numberString(daily.max_agent_runs, DEFAULT_DAILY_RUNS),
    dailyTokens: numberString(daily.max_estimated_tokens, DEFAULT_DAILY_TOKENS),
    dailyCost: numberString(daily.max_estimated_cost_eur, DEFAULT_DAILY_COST),
  };
}

function helpdeskDefinitionSettingsPayload(
  definition: AiAgentControlAgentDefinition,
  form: HelpdeskSettingsForm,
): AiAgentControlAgentDefinitionInput {
  const trigger = policyObject(definition.trigger_policy_json);
  const scope = policyObject(definition.scope_policy_json);
  const queue = policyObject(definition.queue_policy_json);
  const ingestion = nestedPolicy(scope, 'new_tickets_only');
  const mode = (SCOPE_MODES as readonly string[]).includes(form.scopeMode) ? form.scopeMode : 'new_tickets_only';
  const enabledAt = form.enabled
    ? stringValue(ingestion.enabled_at) || new Date().toISOString()
    : stringValue(ingestion.enabled_at) || null;
  // Shared per-mode selection block (entity/category filters + per-cycle caps).
  const blockConfig = {
    enabled: form.enabled,
    enabled_at: enabledAt,
    entity_id: form.entityId.trim() || null,
    category_id: form.categoryId.trim() || null,
    max_tickets_per_cycle: positiveNumber(form.maxTickets, DEFAULT_MAX_TICKETS),
    max_provider_requests_per_cycle: positiveNumber(form.maxRequests, DEFAULT_MAX_REQUESTS),
  };
  return {
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
      new_tickets_only: mode === 'new_tickets_only'
        ? { ...blockConfig, hard_backfill_horizon_hours: positiveNumber(form.horizonHours, DEFAULT_HORIZON_HOURS) }
        : { enabled: false },
      all_open: mode === 'all_open' ? blockConfig : { enabled: false },
      agent_involved: mode === 'agent_involved' ? blockConfig : { enabled: false },
      new_plus_agent_touched: { enabled: false },
      saved_filter: { enabled: false },
      all_matching: { enabled: false },
      freeform_live_object_ids: false,
      stale_closure: {
        enabled: form.staleEnabled,
        action: form.staleAction === 'solved' ? 'solved' : 'closed',
        staleness_hours: numberField(form.staleHours) ?? 0,
        staleness_days: numberField(form.staleDays) ?? 0,
        message: form.staleMessage,
      },
    },
    queue_policy_json: {
      ...queue,
      enabled: true,
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
            <TextField select size="small" value={targetKey} onChange={(event) => setTargetKey(event.target.value)} sx={{ minWidth: 260 }}>
              {(data.targetsQuery.data?.items ?? []).map((target) => (
                <MenuItem key={target.target_key} value={target.target_key}>{target.safety_label} / {target.external_ref}</MenuItem>
              ))}
            </TextField>
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
  const [autonomyTarget, setAutonomyTarget] = React.useState<{ actionClass: string; decided: number; rate: string; days: number } | null>(null);
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
  const webSearchAvailable = useFeatures().config.features.aiWebSearch;
  const librariesQuery = useQuery({
    queryKey: ['knowledge-libraries'],
    queryFn: () => aiAgentControlApi.listKnowledgeLibraries(),
    enabled: knowledgeForm.enabled,
    staleTime: 60_000,
  });

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

  // Refs mirror the latest form state so debounced flush thunks read current
  // values at execution time, not stale schedule-time values.
  const agentFormRef = React.useRef(agentForm);
  agentFormRef.current = agentForm;
  const formRef = React.useRef(form);
  formRef.current = form;
  const knowledgeFormRef = React.useRef(knowledgeForm);
  knowledgeFormRef.current = knowledgeForm;
  const savedStatusRef = React.useRef(definition.status);

  // Seed the helpdesk settings form once its source first loads (built-in: the
  // settings query; custom: the definition policy JSON), then leave local edits
  // authoritative so autosave round-trips never clobber in-flight typing.
  const settingsSeededRef = React.useRef(false);
  React.useEffect(() => {
    if (settingsSeededRef.current) return;
    if (isBuiltInHelpdesk) {
      if (!settings) return;
      setForm({
        enabled: settings.ingestion.enabled,
        scopeMode: 'new_tickets_only',
        entityId: settings.ingestion.entityId ?? '',
        categoryId: settings.ingestion.categoryId ?? '',
        maxTickets: settings.ingestion.maxTicketsPerCycle != null ? String(settings.ingestion.maxTicketsPerCycle) : String(DEFAULT_MAX_TICKETS),
        maxRequests: settings.ingestion.maxProviderRequestsPerCycle != null ? String(settings.ingestion.maxProviderRequestsPerCycle) : String(DEFAULT_MAX_REQUESTS),
        horizonHours: String(settings.ingestion.hardBackfillHorizonHours ?? DEFAULT_HORIZON_HOURS),
        staleEnabled: false,
        staleAction: 'closed',
        staleHours: String(DEFAULT_STALE_HOURS),
        staleDays: '0',
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
    if (isBuiltInHelpdesk) {
      await aiAgentControlApi.updateHelpdeskIngestionSettings(payload);
    } else {
      await aiAgentControlApi.updateAgent(definition.id, helpdeskDefinitionSettingsPayload(definition, current));
    }
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

  const updateAgent = (field: keyof typeof agentForm, value: string) => {
    setAgentForm((current) => ({ ...current, [field]: value }));
    identityAutosave.schedule(persistIdentity);
  };
  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    settingsAutosave.schedule(persistSettings);
  };
  const updateKnowledge = (patch: Partial<typeof knowledgeForm>) => {
    setKnowledgeForm((current) => ({ ...current, ...patch }));
    knowledgeAutosave.schedule(persistKnowledge);
  };

  return (
    <Stack spacing={2}>
      {data.error && <Alert severity="error" onClose={() => data.setError(null)}>{data.error}</Alert>}
      {data.message && <Alert severity="success" onClose={() => data.setMessage(null)}>{data.message}</Alert>}
      <Section title={t('settings.identity')} actions={<SaveIndicator status={identityAutosave.status} />}>
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 180px' }, gap: 1.5 }}>
            <SettingsField label={t('settings.name')}><TextField size="small" value={agentForm.name} onChange={(event) => updateAgent('name', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.status')}><TextField select size="small" value={agentForm.status} onChange={(event) => updateAgent('status', event.target.value)}>
              {['draft', 'enabled', 'disabled', 'archived'].map((status) => <MenuItem key={status} value={status}>{t(`settings.statuses.${status}`)}</MenuItem>)}
            </TextField></SettingsField>
          </Box>
          <SettingsField label={t('settings.description')}><TextField size="small" value={agentForm.description} onChange={(event) => updateAgent('description', event.target.value)} /></SettingsField>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField label={t('settings.mission')}><TextField size="small" multiline minRows={3} value={agentForm.mission} onChange={(event) => updateAgent('mission', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.tone')}><TextField size="small" multiline minRows={3} value={agentForm.tone} onChange={(event) => updateAgent('tone', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.instructions')} hint={t('settings.instructionsHint')}><TextField size="small" multiline minRows={4} value={agentForm.instructions} onChange={(event) => updateAgent('instructions', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.escalation')}><TextField size="small" multiline minRows={4} value={agentForm.escalation} onChange={(event) => updateAgent('escalation', event.target.value)} /></SettingsField>
          </Box>
        </Stack>
      </Section>

      {isHelpdesk && (
        <Section title={t('settings.watching')} actions={<SaveIndicator status={settingsAutosave.status} />}>
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          <FormControlLabel control={<Switch checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} />} label={isBuiltInHelpdesk ? t('settings.watchNewTickets') : t('settings.watchTickets')} />
          {!isBuiltInHelpdesk && (
            <SettingsField label={t('settings.scopeMode')} hint={t(`settings.scopeModeHints.${form.scopeMode}`, { defaultValue: '' })}>
              <TextField select size="small" value={form.scopeMode} onChange={(event) => update('scopeMode', event.target.value)}>
                {SCOPE_MODES.map((m) => <MenuItem key={m} value={m}>{t(`settings.scopeModes.${m}`)}</MenuItem>)}
              </TextField>
            </SettingsField>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField label={t('settings.entity')} hint={t('settings.entityHint')}><TextField size="small" value={form.entityId} onChange={(event) => update('entityId', event.target.value)} /></SettingsField>
            <SettingsField label={t('settings.category')} hint={t('settings.categoryHint')}><TextField size="small" value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} /></SettingsField>
          </Box>
        </Stack>
        </Section>
      )}
      {isHelpdesk && <Section title={t('settings.pace')} actions={<SaveIndicator status={settingsAutosave.status} />}>
        <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
          <SettingsField label={t('settings.maxTickets')}><TextField size="small" value={form.maxTickets} onChange={(event) => update('maxTickets', event.target.value)} /></SettingsField>
          <SettingsField label={t('settings.maxRequests')}><TextField size="small" value={form.maxRequests} onChange={(event) => update('maxRequests', event.target.value)} /></SettingsField>
          {form.scopeMode === 'new_tickets_only' && (
            <SettingsField label={t('settings.horizon')}><TextField size="small" value={form.horizonHours} onChange={(event) => update('horizonHours', event.target.value)} /></SettingsField>
          )}
        </Box>
      </Section>}
      {isHelpdesk && !isBuiltInHelpdesk && <Section title={t('settings.staleClosure')} actions={<SaveIndicator status={settingsAutosave.status} />}>
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          <FormControlLabel control={<Switch checked={form.staleEnabled} onChange={(event) => update('staleEnabled', event.target.checked)} />} label={t('settings.staleClosureEnable')} />
          <Typography variant="caption" color="text.secondary">{t('settings.staleClosureHint')}</Typography>
          {form.staleEnabled && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                <SettingsField label={t('settings.staleHours')}><TextField size="small" value={form.staleHours} onChange={(event) => update('staleHours', event.target.value)} /></SettingsField>
                <SettingsField label={t('settings.staleDays')}><TextField size="small" value={form.staleDays} onChange={(event) => update('staleDays', event.target.value)} /></SettingsField>
                <SettingsField label={t('settings.staleAction')}>
                  <TextField select size="small" value={form.staleAction} onChange={(event) => update('staleAction', event.target.value)}>
                    <MenuItem value="closed">{t('settings.staleActions.closed')}</MenuItem>
                    <MenuItem value="solved">{t('settings.staleActions.solved')}</MenuItem>
                  </TextField>
                </SettingsField>
              </Box>
              <SettingsField label={t('settings.staleMessage')} hint={t('settings.staleMessageHint')}>
                <TextField size="small" multiline minRows={2} value={form.staleMessage} onChange={(event) => update('staleMessage', event.target.value)} />
              </SettingsField>
            </>
          )}
        </Stack>
      </Section>}
      {isHelpdesk && <Section title={t('settings.spending')} actions={<SaveIndicator status={settingsAutosave.status} />}>
        <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5 }}>
          <SettingsField label={t('settings.perRunTokens')}><TextField size="small" value={form.perRunTokens} onChange={(event) => update('perRunTokens', event.target.value)} /></SettingsField>
          <SettingsField label={t('settings.perRunCost')}><TextField size="small" value={form.perRunCost} onChange={(event) => update('perRunCost', event.target.value)} /></SettingsField>
          <SettingsField label={t('settings.dailyRuns')}><TextField size="small" value={form.dailyRuns} onChange={(event) => update('dailyRuns', event.target.value)} /></SettingsField>
          <SettingsField label={t('settings.dailyTokens')}><TextField size="small" value={form.dailyTokens} onChange={(event) => update('dailyTokens', event.target.value)} /></SettingsField>
          <SettingsField label={t('settings.dailyCost')}><TextField size="small" value={form.dailyCost} onChange={(event) => update('dailyCost', event.target.value)} /></SettingsField>
        </Box>
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
                  <TextField
                    select
                    size="small"
                    fullWidth
                    sx={{ maxWidth: 420 }}
                    value={knowledgeForm.libraryIds}
                    SelectProps={{
                      multiple: true,
                      displayEmpty: true,
                      renderValue: (selected) => {
                        const ids = selected as string[];
                        if (ids.length === 0) {
                          return <Typography component="span" variant="body2" color="text.secondary">{t('settings.librariesPlaceholder')}</Typography>;
                        }
                        return ids
                          .map((id) => (librariesQuery.data ?? []).find((lib) => lib.id === id)?.name ?? id)
                          .join(', ');
                      },
                    }}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateKnowledge({ libraryIds: typeof value === 'string' ? value.split(',') : (value as unknown as string[]) });
                    }}
                  >
                    {(librariesQuery.data ?? []).map((lib) => <MenuItem key={lib.id} value={lib.id}>{lib.name}</MenuItem>)}
                  </TextField>
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
                    <Button size="small" variant="contained" onClick={enable} disabled={!item.eligible || data.setAutonomyMutation.isPending}>{t('settings.turnOnAutomatic')}</Button>
                  )}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Section>

      {autonomyTarget && (
        <KanapDialog
          open={!!autonomyTarget}
          title={t('settings.autonomyDialog.title', {
            actionClass: t(`settings.actionClasses.${autonomyTarget.actionClass}`, { defaultValue: humanize(autonomyTarget.actionClass) }),
          })}
          onClose={() => setAutonomyTarget(null)}
          onSave={() => data.setAutonomyMutation.mutate(
            { id: definition.id, actionClass: autonomyTarget.actionClass, mode: 'automatic', confirm: true },
            { onSuccess: () => setAutonomyTarget(null) },
          )}
          saveLabel={t('settings.autonomyDialog.confirm')}
          saveLoading={data.setAutonomyMutation.isPending}
        >
          <Stack spacing={1.5}>
            <Typography variant="body2">
              {t('settings.autonomyDialog.evidence', { decided: autonomyTarget.decided, rate: autonomyTarget.rate, days: autonomyTarget.days })}
            </Typography>
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
