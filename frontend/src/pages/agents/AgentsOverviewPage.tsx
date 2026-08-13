import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import PageHeader from '../../components/PageHeader';
import KanapDialog from '../../components/design/KanapDialog';
import { PropertyRow } from '../../components/design';
import {
  EmptyState,
  formatNumber,
  formatPercent,
  BUILT_IN_AGENT_KEYS,
  HELP_DESK_TICKETING_AGENT_KEY,
  humanize,
  LEGACY_GLPI_TICKETING_PROVIDER_KEY,
  LifecycleText,
  lifecycleStatusKey,
  MetricBlock,
  providerBindingForDefinition,
  ReasonDialog,
  Section,
  statusLabel,
} from '../../components/agents/agentControlPrimitives';
import {
  actionLinkButtonSx,
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
  HelpdeskTargetingFilterBuilder,
  modeFromFilters,
  openStatusValues,
  statusFilterValues,
  targetingPredicatesFromFilters,
  targetingPresetFilters,
  type TargetingFilter,
  type TargetingPresetKey,
} from '../../components/agents/helpdeskTargeting';
import { aiAgentControlApi } from '../../ai/aiApi';
import { MONO_FONT_FAMILY } from '../../config/ThemeContext';
import { dialogBorderedFieldSx, drawerMenuItemSx, drawerSelectSx, longFormSurfaceFieldSx } from '../../theme/formSx';
import { useLocale } from '../../i18n/useLocale';
import { useAgentControlData } from './useAgentControlData';

type NewAgentWizardForm = {
  name: string;
  description: string;
  agentType: 'helpdesk' | 'sre';
  // Helpdesk: ticketing provider key. SRE: monitoring provider key, or '' when
  // no monitoring connection is known — the agent is then created unbound
  // (fail closed), mirroring the backend seed's behavior.
  providerKey: string;
  watchEnabled: boolean;
  filters: TargetingFilter[];
  agentPriority: string;
  reviewCooldownHours: string;
  onConflict: string;
  maxTickets: string;
  maxRequests: string;
  horizonHours: string;
  approvalTtlHours: string;
  onStale: string;
  perRunTokens: string;
  perRunCost: string;
  dailyRuns: string;
  dailyTokens: string;
  dailyCost: string;
};

function defaultWizardForm(t: (key: string) => string, statusValues: string[] = []): NewAgentWizardForm {
  return {
    name: t('overview.newAgentDefaultName'),
    description: t('overview.newAgentDescription'),
    agentType: 'helpdesk',
    providerKey: LEGACY_GLPI_TICKETING_PROVIDER_KEY,
    watchEnabled: false,
    filters: targetingPresetFilters('new_tickets', DEFAULT_HORIZON_HOURS, statusValues),
    agentPriority: '100',
    reviewCooldownHours: String(DEFAULT_REVIEW_COOLDOWN_HOURS),
    onConflict: 'defer',
    maxTickets: String(DEFAULT_MAX_TICKETS),
    maxRequests: String(DEFAULT_MAX_REQUESTS),
    horizonHours: String(DEFAULT_HORIZON_HOURS),
    approvalTtlHours: String(DEFAULT_APPROVAL_TTL_HOURS),
    onStale: 're_review',
    perRunTokens: String(DEFAULT_PER_RUN_TOKENS),
    perRunCost: String(DEFAULT_PER_RUN_COST),
    dailyRuns: String(DEFAULT_DAILY_RUNS),
    dailyTokens: String(DEFAULT_DAILY_TOKENS),
    dailyCost: String(DEFAULT_DAILY_COST),
  };
}

function positiveNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Is the built-in desk agent still exactly as the server seeded it?
 *
 * Every tenant gets `helpdesk.glpi.triage` auto-seeded, so a tenant that never
 * touched it (or that only runs its own agents) sees a stranger in the fleet.
 * It stays in the database — it is the template `createAgentDefinition` copies
 * bindings from, and the anchor of the fleet statistics — but it is filtered out
 * of the grid until it has actually been used. Deep links keep working.
 *
 * Chosen predicate, cheapest reliable signal available client-side with no
 * extra request:
 *  - `metadata_json.user_modified !== true` — the backend stamps this flag on
 *    EVERY definition write (updateAgent, updateAgentStatus, create), and the
 *    seeder itself never sets it. Any settings save, run-mode change, archive or
 *    restore therefore reveals the agent for good.
 *  - no `helpdesk_ingestion_state` in `metadata_json` — the poller writes that
 *    block on its first cycle, so an agent that has ever checked stays visible.
 *  - no work item or target state for it in the overview payload — a test run on
 *    a ticket creates both, so a tested-but-unedited agent stays visible too.
 *
 * `config_version` was the alternative; `user_modified` is strictly better here
 * because it is a boolean intent flag rather than a counter whose initial value
 * the frontend would have to hardcode. The SRE built-in is deliberately NOT
 * covered: it is the real SRE agent, not a template.
 */
function isPristineBuiltinDeskAgent(
  definition: { id: string; agent_key: string; metadata_json?: Record<string, unknown> | null },
  overview: { work_items?: Array<{ agent_definition_id: string | null }>; target_states?: Array<{ agent_definition_id: string | null }> } | null,
): boolean {
  if (definition.agent_key !== HELP_DESK_TICKETING_AGENT_KEY) return false;
  const metadata = definition.metadata_json && typeof definition.metadata_json === 'object'
    ? definition.metadata_json as Record<string, unknown>
    : {};
  if (metadata.user_modified === true) return false;
  if (metadata.helpdesk_ingestion_state) return false;
  if ((overview?.work_items ?? []).some((item) => item.agent_definition_id === definition.id)) return false;
  if ((overview?.target_states ?? []).some((state) => state.agent_definition_id === definition.id)) return false;
  return true;
}

// SRE "watching" source of truth (mirror of the workspace Monitor header's
// sreWatching): scheduled_poll.enabled on the definition's trigger policy —
// SRE agents have no helpdesk ingestion summary to read it from.
function sreScheduledPollEnabled(triggerPolicy: unknown): boolean {
  const trigger = triggerPolicy && typeof triggerPolicy === 'object' && !Array.isArray(triggerPolicy)
    ? triggerPolicy as Record<string, unknown> : {};
  const scheduledPoll = trigger.scheduled_poll && typeof trigger.scheduled_poll === 'object' && !Array.isArray(trigger.scheduled_poll)
    ? trigger.scheduled_poll as Record<string, unknown> : {};
  return scheduledPoll.enabled === true;
}

// Wizard step sequence per agent type. SRE has no "watching" step: monitoring
// alert selection is configured in the agent's settings after creation (the
// wizard sends the seed's inert empty targeting placeholder — see
// newSreAgentPolicies).
const WIZARD_STEP_KEYS: Record<NewAgentWizardForm['agentType'], Array<'type' | 'connection' | 'watching' | 'limits' | 'review'>> = {
  helpdesk: ['type', 'connection', 'watching', 'limits', 'review'],
  sre: ['type', 'connection', 'limits', 'review'],
};

function economicGuardrailsFromForm(form: NewAgentWizardForm) {
  return {
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
  };
}

// Create-input mirror of the backend SRE seed (ensureSreMonitoringDefinition in
// backend/src/ai/control-plane/agent/ai-agent-work-queue.service.ts — keep in
// sync). UI-created SRE agents have no template (the create template is
// helpdesk-only), so every policy the seed sets must be passed explicitly.

// Mirror of SRE_MONITORING_ALLOWED_CAPABILITIES (backend seed — keep in sync):
// read-only A1 capabilities validated against the backend's SRE cap table
// (SRE_POSSIBLE_CAPABILITY_CAPS). Without this list a new SRE agent would start
// with an empty capability set and fail closed as not runnable.
const SRE_AGENT_ALLOWED_CAPABILITIES = [
  'monitoring.alert.get',
  'monitoring.sensor.history',
  'monitoring.state.get',
  'monitoring.alert.related.list',
  'monitoring.object.get',
  'search_knowledge',
  'get_document',
  'web_search',
].map((name) => ({ name, version: '1.0.0', effect: 'read', max_autonomy_level: 'A1' }));

function newSreAgentPolicies(form: NewAgentWizardForm) {
  return {
    agent_priority: positiveNumber(form.agentPriority, 100),
    allowed_capabilities_json: SRE_AGENT_ALLOWED_CAPABILITIES,
    provider_bindings_json: form.providerKey
      ? {
        monitoring: {
          provider_kind: 'monitoring',
          provider_key: form.providerKey,
        },
      }
      : {},
    trigger_policy_json: {
      scheduled_poll: { enabled: false },
      provider_webhook: { enabled: false },
      production_polling_enabled: false,
      automatic_writes_enabled: false,
    },
    scope_policy_json: {
      knowledge_sources: {
        knowledge: { enabled: true, all_libraries: true, library_ids: [] },
        web: { enabled: false },
        precedence: 'knowledge_first',
        kanap_data: {
          enabled: true,
          domains: {
            applications: true,
            assets: true,
            interfaces: true,
            connections: true,
            locations: true,
          },
        },
      },
      // Inert placeholder, same as the seed: an empty predicate list round-trips
      // unchanged through the scope-policy normalizers on the create path.
      targeting: { schema_version: 1, combinator: 'and', predicates: [] },
    },
    queue_policy_json: {
      enabled: true,
      dedup_mode: 'active_work_item',
      lease_ttl_seconds: 300,
      max_attempts: 3,
      cooldown_seconds: 60,
      review_cooldown_seconds: positiveNumber(form.reviewCooldownHours, DEFAULT_REVIEW_COOLDOWN_HOURS) * 3600,
      on_conflict: form.onConflict === 'supersede' ? 'supersede' : 'defer',
      approval_ttl_seconds: positiveNumber(form.approvalTtlHours, DEFAULT_APPROVAL_TTL_HOURS) * 3600,
      retry_backoff_seconds: [60, 300, 900],
      terminal_statuses: ['completed', 'dead_letter'],
      economic_guardrails: economicGuardrailsFromForm(form),
    },
    response_policy_json: {
      require_human_approval_for_writes: true,
    },
    evaluation_policy_json: {
      create_pending_evaluation: true,
      feedback_required_for_autonomy_promotion: true,
    },
  };
}

function newAgentPolicies(form: NewAgentWizardForm) {
  if (form.agentType === 'sre') {
    return newSreAgentPolicies(form);
  }
  const enabledAt = form.watchEnabled ? new Date().toISOString() : null;
  const mode = modeFromFilters(form.filters);
  const predicates = targetingPredicatesFromFilters(form.filters);
  const categoryId = categoryFromFilters(form.filters);
  const entityId = entityFromFilters(form.filters);
  const horizonHours = createdHorizonHoursFromFilters(form.filters, form.horizonHours);
  const blockConfig = {
    enabled: form.watchEnabled,
    enabled_at: enabledAt,
    entity_id: entityId || null,
    category_id: categoryId || null,
    max_tickets_per_cycle: positiveNumber(form.maxTickets, DEFAULT_MAX_TICKETS),
    max_provider_requests_per_cycle: positiveNumber(form.maxRequests, DEFAULT_MAX_REQUESTS),
  };
  const onStale = ['re_review', 'cancel', 'apply_anyway'].includes(form.onStale) ? form.onStale : 're_review';
  return {
    agent_priority: positiveNumber(form.agentPriority, 100),
    provider_bindings_json: {
      ticketing: {
        provider_kind: 'ticketing',
        provider_key: form.providerKey,
      },
    },
    trigger_policy_json: {
      manual_safe_target: { enabled: true },
      scheduled_poll: { enabled: form.watchEnabled },
      saved_filter: { enabled: false },
      provider_webhook: { enabled: false },
      ticket_update: { enabled: false },
      production_polling_enabled: form.watchEnabled,
      automatic_writes_enabled: false,
    },
    scope_policy_json: {
      mode,
      allowed_modes: ['manual_safe_target', 'new_tickets_only', 'all_open', 'agent_involved'],
      provider_kind: 'ticketing',
      provider_key: form.providerKey,
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
    },
    queue_policy_json: {
      enabled: true,
      dedup_mode: 'active_work_item',
      lease_ttl_seconds: 300,
      max_attempts: 3,
      cooldown_seconds: 60,
      review_cooldown_seconds: positiveNumber(form.reviewCooldownHours, DEFAULT_REVIEW_COOLDOWN_HOURS) * 3600,
      on_conflict: form.onConflict === 'supersede' ? 'supersede' : 'defer',
      retry_backoff_seconds: [60, 300, 900],
      terminal_statuses: ['completed', 'dead_letter'],
      approval_ttl_seconds: positiveNumber(form.approvalTtlHours, DEFAULT_APPROVAL_TTL_HOURS) * 3600,
      on_stale_by_action_class: {
        public_reply: onStale,
        internal_note: onStale,
        classification: onStale,
        status: onStale,
        assignment: onStale,
        participant: onStale,
      },
      economic_guardrails: economicGuardrailsFromForm(form),
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
  };
}

function WizardProgress({ activeStep, steps }: { activeStep: number; steps: string[] }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `repeat(${steps.length}, minmax(0, 1fr))` }, gap: 0.75 }}>
      {steps.map((label, index) => (
        <Box
          key={label}
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            minHeight: 34,
            px: 1,
            borderRadius: '6px',
            border: `1px solid ${index === activeStep ? theme.palette.kanap.border.default : theme.palette.kanap.border.soft}`,
            bgcolor: index === activeStep ? theme.palette.kanap.bg.drawer : 'transparent',
          })}
        >
          <Typography
            component="span"
            sx={(theme) => ({
              fontFamily: MONO_FONT_FAMILY,
              fontSize: 11,
              color: theme.palette.kanap.text.tertiary,
              fontVariantNumeric: 'tabular-nums',
            })}
          >
            {index + 1}
          </Typography>
          <Typography
            component="span"
            sx={(theme) => ({
              minWidth: 0,
              fontSize: 12,
              fontWeight: index === activeStep ? 500 : 400,
              color: index === activeStep ? theme.palette.kanap.text.primary : theme.palette.kanap.text.secondary,
              lineHeight: 1.25,
            })}
          >
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function WizardSwitchRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        minHeight: 38,
        px: 1.25,
        py: 0.75,
        borderRadius: '6px',
        bgcolor: theme.palette.kanap.bg.drawer,
      })}
    >
      <Typography sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.primary })}>{label}</Typography>
      <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </Box>
  );
}

function WizardSummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={(theme) => ({ fontSize: 12, lineHeight: 1.3, color: theme.palette.kanap.text.tertiary })}>{label}</Typography>
      <Typography sx={(theme) => ({ mt: 0.25, fontSize: 13, lineHeight: 1.4, color: theme.palette.kanap.text.primary })}>{value}</Typography>
    </Box>
  );
}

export default function AgentsOverviewPage() {
  const { t } = useTranslation(['agents']);
  const locale = useLocale();
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const data = useAgentControlData();
  const overview = data.queueQuery.data ?? null;
  const definitions = overview?.definitions ?? [];
  const helpdeskSummary = overview?.helpdesk?.summary ?? null;
  // Fleet header metrics are pooled across every helpdesk agent (backend aggregate),
  // not the built-in agent's summary used as a proxy.
  const fleetEvaluation = overview?.helpdesk?.fleet ?? null;
  const helpdeskSummaryByAgent = React.useMemo(() => {
    const map = new Map<string, typeof helpdeskSummary>();
    for (const summary of overview?.helpdesk?.summaries ?? []) {
      map.set(summary.agentDefinitionId, summary);
    }
    if (overview?.helpdesk?.summary) {
      map.set(overview.helpdesk.summary.agentDefinitionId, overview.helpdesk.summary);
    }
    return map;
  }, [overview?.helpdesk?.summaries, overview?.helpdesk?.summary]);
  // The seeded desk template is hidden until it is actually used — see
  // isPristineBuiltinDeskAgent. It stays in `definitions` for everything else
  // (creation template, stats anchor, deep links).
  const visibleDefinitions = React.useMemo(
    () => definitions.filter((definition) => !isPristineBuiltinDeskAgent(definition, overview)),
    [definitions, overview],
  );
  const activePause = data.settingsQuery.data?.emergency_pause ?? null;
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState(0);
  const [wizardForm, setWizardForm] = React.useState<NewAgentWizardForm>(() => defaultWizardForm(t));
  const canAdmin = hasLevel('ai_agents', 'admin') || hasLevel('ai_settings', 'admin');
  const wizardStepKeys = WIZARD_STEP_KEYS[wizardForm.agentType];
  const wizardSteps = React.useMemo(
    () => wizardStepKeys.map((step) => t(`overview.wizard.steps.${step}`)),
    [t, wizardStepKeys],
  );
  const wizardStepKey = wizardStepKeys[Math.min(wizardStep, wizardStepKeys.length - 1)];
  const updateWizard = <K extends keyof NewAgentWizardForm>(field: K, value: NewAgentWizardForm[K]) => {
    setWizardForm((current) => ({ ...current, [field]: value }));
  };
  // Monitoring connections the wizard can bind to. There is no adapter-config
  // list endpoint, so this mirrors what the backend seed exposes indirectly:
  // the monitoring bindings already present on the fleet's SRE definitions
  // (the seed binds automatically when exactly one enabled monitoring adapter
  // config exists). Empty means "none known" — the agent is created unbound.
  const monitoringProviderKeys = React.useMemo(() => {
    const keys = new Set<string>();
    for (const definition of definitions) {
      const binding = providerBindingForDefinition(definition, 'monitoring');
      if (binding) keys.add(binding.providerKey);
    }
    return Array.from(keys);
  }, [definitions]);
  // Switching agent type swaps the provider slot and, when the user has not
  // customized them, the default name/description.
  const changeWizardType = React.useCallback((next: NewAgentWizardForm['agentType']) => {
    const defaultNames = {
      helpdesk: t('overview.newAgentDefaultName'),
      sre: t('overview.newAgentSreDefaultName'),
    };
    const defaultDescriptions = {
      helpdesk: t('overview.newAgentDescription'),
      sre: t('overview.newAgentSreDescription'),
    };
    setWizardForm((current) => ({
      ...current,
      agentType: next,
      providerKey: next === 'sre'
        ? (monitoringProviderKeys[0] ?? '')
        : LEGACY_GLPI_TICKETING_PROVIDER_KEY,
      name: current.name === defaultNames.helpdesk || current.name === defaultNames.sre
        ? defaultNames[next]
        : current.name,
      description: current.description === defaultDescriptions.helpdesk || current.description === defaultDescriptions.sre
        ? defaultDescriptions[next]
        : current.description,
    }));
  }, [monitoringProviderKeys, t]);
  const helpdeskTemplateDefinition = React.useMemo(
    () => definitions.find((definition) => definition.agent_key === HELP_DESK_TICKETING_AGENT_KEY)
      ?? definitions.find((definition) => definition.agent_type === 'helpdesk')
      ?? null,
    [definitions],
  );
  const targetingOptionsAgentId = helpdeskTemplateDefinition?.id ?? null;
  const targetingStatusOptionsQuery = useQuery({
    queryKey: ['ai-agent-targeting-options', targetingOptionsAgentId, 'status', 'wizard'],
    queryFn: () => aiAgentControlApi.getAgentTargetingOptions(targetingOptionsAgentId || '', 'status', { limit: 50 }),
    enabled: wizardOpen && !!targetingOptionsAgentId,
    staleTime: 30_000,
  });
  const presetStatusValues = React.useMemo(
    () => openStatusValues(targetingStatusOptionsQuery.data?.options ?? []),
    [targetingStatusOptionsQuery.data?.options],
  );
  const presetStatusValuesKey = presetStatusValues.join('|');
  React.useEffect(() => {
    if (!wizardOpen || presetStatusValues.length === 0) return;
    setWizardForm((current) => {
      let changed = false;
      const filters = current.filters.map((filter) => {
        if (filter.field !== 'status' || statusFilterValues(filter.value).length > 0) return filter;
        changed = true;
        return { ...filter, value: presetStatusValues };
      });
      return changed ? { ...current, filters } : current;
    });
  }, [presetStatusValuesKey, presetStatusValues, wizardOpen]);

  const [pauseDialogOpen, setPauseDialogOpen] = React.useState(false);
  const [agentToDelete, setAgentToDelete] = React.useState<{ id: string; name: string } | null>(null);
  const submitTenantPause = React.useCallback((reason: string) => {
    data.createPauseMutation.mutate(
      { scope: 'tenant', reason, expires_in_minutes: null },
      { onSuccess: () => setPauseDialogOpen(false) },
    );
  }, [data.createPauseMutation]);

  const openWizard = React.useCallback(() => {
    setWizardForm(defaultWizardForm(t, presetStatusValues));
    setWizardStep(0);
    setWizardOpen(true);
  }, [presetStatusValues, t]);

  const updateWizardFilters = React.useCallback((filters: TargetingFilter[]) => {
    setWizardForm((current) => ({
      ...current,
      filters,
      horizonHours: String(createdHorizonHoursFromFilters(filters, current.horizonHours)),
    }));
  }, []);

  const applyWizardTargetingPreset = React.useCallback((preset: TargetingPresetKey) => {
    setWizardForm((current) => ({
      ...current,
      filters: targetingPresetFilters(preset, positiveNumber(current.horizonHours, DEFAULT_HORIZON_HOURS), presetStatusValues),
    }));
  }, [presetStatusValues]);

  const createAgent = React.useCallback(async () => {
    if (!wizardForm.name.trim()) return;
    try {
      const result = await data.createAgentMutation.mutateAsync({
        name: wizardForm.name.trim(),
        agent_type: wizardForm.agentType,
        description: wizardForm.description.trim() || null,
        ...newAgentPolicies(wizardForm),
      });
      setWizardOpen(false);
      navigate(`/agents/${result.agent_definition.agent_key}?tab=settings`);
    } catch {
      // Mutation handler surfaces the API error.
    }
  }, [data.createAgentMutation, navigate, wizardForm]);

  const wizardScopeMode = modeFromFilters(wizardForm.filters);
  const wizardPrimaryLabel = wizardStep < wizardSteps.length - 1 ? t('overview.wizard.next') : t('overview.wizard.create');
  const wizardPrimaryAction = React.useCallback(() => {
    if (wizardStep < wizardSteps.length - 1) {
      setWizardStep((step) => Math.min(wizardSteps.length - 1, step + 1));
      return;
    }
    void createAgent();
  }, [createAgent, wizardStep, wizardSteps.length]);

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader
        title={t('overview.title')}
        actions={canAdmin ? (
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={data.createAgentMutation.isPending}
            onClick={openWizard}
          >
            {t('overview.newAgent')}
          </Button>
        ) : undefined}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('overview.subtitle')}</Typography>
      <Stack spacing={2}>
        {data.error && <Alert severity="error" onClose={() => data.setError(null)}>{data.error}</Alert>}
        {data.message && <Alert severity="success" onClose={() => data.setMessage(null)}>{data.message}</Alert>}
        {activePause && (
          <Alert
            severity="warning"
            action={canAdmin ? (
              <Button
                size="small"
                color="inherit"
                startIcon={<PlayArrowIcon />}
                disabled={data.revokePauseMutation.isPending}
                onClick={() => data.revokePauseMutation.mutate(activePause.id)}
              >
                {t('pause.lift')}
              </Button>
            ) : null}
          >
            {t('pause.active', { reason: activePause.reason })}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <MetricBlock label={t('overview.pendingApprovals')} value={data.badgesQuery.data?.pendingApprovals ?? 0} />
          <MetricBlock label={t('overview.todayActions')} value={formatNumber(fleetEvaluation?.terminalByStatus.executed ?? 0)} />
          <MetricBlock label={t('overview.acceptance')} value={formatPercent(fleetEvaluation?.acceptanceRate)} />
          <MetricBlock label={t('overview.dismissed')} value={formatPercent(fleetEvaluation?.dismissRate)} />
          <MetricBlock
            label={t('overview.cost')}
            value={`${(overview?.cost?.today_eur ?? 0).toFixed(2)} / ${(overview?.cost?.last_7_days_eur ?? 0).toFixed(2)} EUR`}
          />
        </Stack>

        <Section
          title={t('overview.fleet')}
          actions={canAdmin ? (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<PauseCircleOutlineIcon />}
              disabled={!!activePause || data.createPauseMutation.isPending}
              onClick={() => setPauseDialogOpen(true)}
            >
              {t('pause.tenant')}
            </Button>
          ) : undefined}
        >
          {data.queueQuery.isLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>
          ) : visibleDefinitions.length === 0 ? (
            <EmptyState>{t('overview.empty')}</EmptyState>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, p: 1.5, alignItems: 'start' }}>
              {visibleDefinitions.map((definition) => {
                const agentHelpdeskSummary = helpdeskSummaryByAgent.get(definition.id) ?? null;
                // Helpdesk agents watch through the ingestion summary; SRE
                // agents watch through trigger_policy_json.scheduled_poll —
                // same source the workspace Monitor header reads, so the
                // fleet card can never say "Testing" while the workspace
                // says "Watching".
                const watching = definition.agent_type === 'sre'
                  ? sreScheduledPollEnabled(definition.trigger_policy_json)
                  : !!agentHelpdeskSummary?.ingestion.enabled;
                const pending = data.actionPool.filter((action) => {
                  const metadata = action.metadata_json ?? {};
                  // Count only actionable pending proposals — exclude expired/terminal ones the
                  // backend already drops from the badge and the approvals inbox (can_reject=false),
                  // so the card matches what the user can actually act on.
                  return metadata.agent_definition_id === definition.id
                    && action.status === 'pending'
                    && (action.execution_readiness?.can_reject ?? true);
                }).length;
                const failed = (overview?.work_items ?? []).filter((item) =>
                  item.agent_definition_id === definition.id && ['failed', 'dead_letter'].includes(item.status)
                ).length;
                const automaticCount = definition.automatic_action_classes?.length ?? 0;
                const label = lifecycleStatusKey(definition.status, watching, automaticCount, !!activePause || !!agentHelpdeskSummary?.ingestion.paused);
                return (
                  <Card key={definition.id} variant="outlined" sx={{ borderRadius: 1 }}>
                    <CardActionArea onClick={() => navigate(`/agents/${definition.agent_key}`)}>
                      <CardContent>
                        <Stack spacing={1.25}>
                          <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="h5" sx={{ lineHeight: 1.2 }}>{definition.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{definition.description ?? t('overview.noDescription')}</Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                              <LifecycleText lifecycleKey={label} />
                              {canAdmin && !BUILT_IN_AGENT_KEYS.includes(definition.agent_key) && (
                                <Tooltip title={t('overview.deleteAgent')}>
                                  <IconButton
                                    size="small"
                                    sx={{ color: 'text.secondary' }}
                                    onClick={(event) => { event.stopPropagation(); event.preventDefault(); setAgentToDelete({ id: definition.id, name: definition.name }); }}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Stack>
                          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={t(`agentType.${definition.agent_type}`, { defaultValue: humanize(definition.agent_type) })} />
                            <Chip size="small" label={t(`environment.${definition.environment}`, { defaultValue: definition.environment })} />
                            <Chip size="small" color={pending > 0 ? 'warning' : 'default'} label={t('overview.pendingCount', { count: pending })} />
                            <Chip size="small" color={failed > 0 ? 'error' : 'default'} label={t('overview.failedCount', { count: failed })} />
                            <Chip
                              size="small"
                              color={automaticCount > 0 ? 'success' : 'default'}
                              label={automaticCount > 0 ? t('overview.automaticCount', { count: automaticCount }) : t('overview.askFirst')}
                            />
                          </Stack>
                          {agentHelpdeskSummary ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
                              <MetricBlock label={t('overview.lastCheck')} value={agentHelpdeskSummary.ingestion.lastPollStatus ? statusLabel(agentHelpdeskSummary.ingestion.lastPollStatus) : t('common.notSet')} />
                              <MetricBlock label={t('overview.scope')} value={agentHelpdeskSummary.ingestion.entityId || agentHelpdeskSummary.ingestion.categoryId ? t('overview.filteredScope') : t('overview.allTickets')} />
                              <MetricBlock label={t('overview.runsToday')} value={agentHelpdeskSummary.guardrails.daily?.runs ?? 0} />
                              <MetricBlock label={t('overview.updated')} value={agentHelpdeskSummary.ingestion.lastPollAt ? new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(agentHelpdeskSummary.ingestion.lastPollAt)) : t('common.notSet')} />
                            </Box>
                          ) : null}
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          )}
        </Section>
      </Stack>
      <KanapDialog
        open={wizardOpen}
        title={t('overview.wizard.title')}
        onClose={() => setWizardOpen(false)}
        onSave={wizardPrimaryAction}
        saveLabel={wizardPrimaryLabel}
        saveDisabled={!wizardForm.name.trim() || data.createAgentMutation.isPending}
        saveLoading={wizardStep === wizardSteps.length - 1 && data.createAgentMutation.isPending}
        cancelLabel={t('overview.wizard.cancel')}
        sx={{ maxWidth: 860 }}
        footerLeft={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={(theme) => ({ fontSize: 12, color: theme.palette.kanap.text.tertiary })}>
              {t('overview.wizard.stepCounter', { current: wizardStep + 1, total: wizardSteps.length })}
            </Typography>
            {wizardStep > 0 && (
              <Button variant="action" onClick={() => setWizardStep((step) => Math.max(0, step - 1))}>
                {t('overview.wizard.back')}
              </Button>
            )}
          </Stack>
        )}
      >
        <Stack spacing={2}>
          <WizardProgress activeStep={wizardStep} steps={wizardSteps} />

          {wizardStepKey === 'type' && (
            <Stack spacing={1.5}>
              <PropertyRow label={t('overview.wizard.name')} required>
                <TextField
                  size="small"
                  variant="standard"
                  value={wizardForm.name}
                  InputProps={{ disableUnderline: true }}
                  sx={[dialogBorderedFieldSx, { width: '100%' }]}
                  onChange={(event) => updateWizard('name', event.target.value)}
                />
              </PropertyRow>
              <PropertyRow label={t('overview.wizard.type')}>
                <Select
                  variant="standard"
                  value={wizardForm.agentType}
                  onChange={(event) => changeWizardType(event.target.value as NewAgentWizardForm['agentType'])}
                  sx={drawerSelectSx}
                >
                  <MenuItem value="helpdesk" sx={drawerMenuItemSx}>{t('overview.wizard.helpdesk')}</MenuItem>
                  <MenuItem value="sre" sx={drawerMenuItemSx}>{t('overview.wizard.sre')}</MenuItem>
                </Select>
              </PropertyRow>
              <PropertyRow label={t('overview.wizard.description')}>
                <TextField
                  size="small"
                  variant="standard"
                  multiline
                  minRows={3}
                  value={wizardForm.description}
                  InputProps={{ disableUnderline: true }}
                  sx={longFormSurfaceFieldSx}
                  onChange={(event) => updateWizard('description', event.target.value)}
                />
              </PropertyRow>
            </Stack>
          )}

          {wizardStepKey === 'connection' && wizardForm.agentType === 'helpdesk' && (
            <Stack spacing={1.5}>
              <PropertyRow label={t('overview.wizard.connection')}>
                <Select
                  variant="standard"
                  value={wizardForm.providerKey}
                  onChange={(event) => updateWizard('providerKey', event.target.value)}
                  sx={drawerSelectSx}
                >
                  <MenuItem value={LEGACY_GLPI_TICKETING_PROVIDER_KEY} sx={drawerMenuItemSx}>GLPI</MenuItem>
                </Select>
              </PropertyRow>
              <Button type="button" size="small" variant="action" onClick={() => navigate('/admin/integrations')} sx={{ alignSelf: 'flex-start' }}>
                {t('overview.wizard.manageConnections')}
              </Button>
            </Stack>
          )}

          {wizardStepKey === 'connection' && wizardForm.agentType === 'sre' && (
            <Stack spacing={1.5}>
              {monitoringProviderKeys.length > 0 ? (
                <PropertyRow label={t('overview.wizard.monitoringConnection')}>
                  <Select
                    variant="standard"
                    value={wizardForm.providerKey}
                    onChange={(event) => updateWizard('providerKey', event.target.value)}
                    sx={drawerSelectSx}
                  >
                    {monitoringProviderKeys.map((key) => (
                      <MenuItem key={key} value={key} sx={drawerMenuItemSx}>{key.toUpperCase()}</MenuItem>
                    ))}
                  </Select>
                </PropertyRow>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('overview.wizard.monitoringConnectionHint')}
                </Typography>
              )}
              <Typography sx={(theme) => ({ fontSize: 12, color: theme.palette.kanap.text.tertiary, lineHeight: 1.4 })}>
                {t('overview.wizard.sreWatchingLater')}
              </Typography>
            </Stack>
          )}

          {wizardStepKey === 'watching' && (
            <Stack spacing={1.5}>
              <WizardSwitchRow
                checked={wizardForm.watchEnabled}
                label={t('overview.wizard.watchNewTickets')}
                onChange={(checked) => updateWizard('watchEnabled', checked)}
              />
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {(['new_tickets', 'all_open', 'handled'] as TargetingPresetKey[]).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="small"
                    variant="text"
                    onClick={() => applyWizardTargetingPreset(preset)}
                    disabled={presetStatusValues.length === 0}
                    sx={actionLinkButtonSx}
                  >
                    {t(`settings.targetingPresets.${preset}`)}
                  </Button>
                ))}
              </Stack>
              <PropertyRow label={t('settings.targetingBuilder.filters')} helperText={t('settings.targetingBuilder.hint')}>
                <HelpdeskTargetingFilterBuilder
                  agentId={targetingOptionsAgentId}
                  filters={wizardForm.filters}
                  onChange={updateWizardFilters}
                />
              </PropertyRow>
            </Stack>
          )}

          {wizardStepKey === 'limits' && (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                <PropertyRow label={t('settings.agentPriority')}>
                  <TextField size="small" variant="standard" value={wizardForm.agentPriority} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('agentPriority', event.target.value)} />
                </PropertyRow>
                <PropertyRow label={t('settings.reviewCooldown')}>
                  <TextField size="small" variant="standard" value={wizardForm.reviewCooldownHours} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('reviewCooldownHours', event.target.value)} />
                </PropertyRow>
                <PropertyRow label={t('settings.onConflict')}>
                  <Select variant="standard" value={wizardForm.onConflict} onChange={(event) => updateWizard('onConflict', event.target.value)} sx={drawerSelectSx}>
                    <MenuItem value="defer" sx={drawerMenuItemSx}>{t('settings.conflictPolicies.defer')}</MenuItem>
                    <MenuItem value="supersede" sx={drawerMenuItemSx}>{t('settings.conflictPolicies.supersede')}</MenuItem>
                  </Select>
                </PropertyRow>
                {wizardForm.agentType === 'helpdesk' && (
                  <PropertyRow label={t('settings.maxTickets')}>
                    <TextField size="small" variant="standard" value={wizardForm.maxTickets} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('maxTickets', event.target.value)} />
                  </PropertyRow>
                )}
                {wizardForm.agentType === 'helpdesk' && (
                  <PropertyRow label={t('settings.maxRequests')}>
                    <TextField size="small" variant="standard" value={wizardForm.maxRequests} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('maxRequests', event.target.value)} />
                  </PropertyRow>
                )}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                <PropertyRow label={t('settings.approvalTtl')}>
                  <TextField size="small" variant="standard" value={wizardForm.approvalTtlHours} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('approvalTtlHours', event.target.value)} />
                </PropertyRow>
                {wizardForm.agentType === 'helpdesk' && (
                  <PropertyRow label={t('settings.onStale')}>
                    <Select variant="standard" value={wizardForm.onStale} onChange={(event) => updateWizard('onStale', event.target.value)} sx={drawerSelectSx}>
                      <MenuItem value="re_review" sx={drawerMenuItemSx}>{t('settings.stalePolicies.re_review')}</MenuItem>
                      <MenuItem value="cancel" sx={drawerMenuItemSx}>{t('settings.stalePolicies.cancel')}</MenuItem>
                      <MenuItem value="apply_anyway" sx={drawerMenuItemSx}>{t('settings.stalePolicies.apply_anyway')}</MenuItem>
                    </Select>
                  </PropertyRow>
                )}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                <PropertyRow label={t('settings.perRunTokens')}>
                  <TextField size="small" variant="standard" value={wizardForm.perRunTokens} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('perRunTokens', event.target.value)} />
                </PropertyRow>
                <PropertyRow label={t('settings.perRunCost')}>
                  <TextField size="small" variant="standard" value={wizardForm.perRunCost} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('perRunCost', event.target.value)} />
                </PropertyRow>
                <PropertyRow label={t('settings.dailyRuns')}>
                  <TextField size="small" variant="standard" value={wizardForm.dailyRuns} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('dailyRuns', event.target.value)} />
                </PropertyRow>
                <PropertyRow label={t('settings.dailyTokens')}>
                  <TextField size="small" variant="standard" value={wizardForm.dailyTokens} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('dailyTokens', event.target.value)} />
                </PropertyRow>
                <PropertyRow label={t('settings.dailyCost')}>
                  <TextField size="small" variant="standard" value={wizardForm.dailyCost} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('dailyCost', event.target.value)} />
                </PropertyRow>
              </Box>
            </Stack>
          )}

          {wizardStepKey === 'review' && (
            <Stack spacing={1.5}>
              <Typography sx={(theme) => ({ fontSize: 16, fontWeight: 500, color: theme.palette.kanap.text.primary })}>
                {wizardForm.name || t('overview.wizard.unnamed')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                <WizardSummaryRow
                  label={t('overview.wizard.type')}
                  value={t(wizardForm.agentType === 'sre' ? 'overview.wizard.sre' : 'overview.wizard.helpdesk')}
                />
                <WizardSummaryRow
                  label={t('overview.wizard.connection')}
                  value={wizardForm.agentType === 'sre'
                    ? (wizardForm.providerKey ? wizardForm.providerKey.toUpperCase() : t('overview.wizard.notConnected'))
                    : 'GLPI'}
                />
                {wizardForm.agentType === 'helpdesk' && (
                  <WizardSummaryRow label={t('monitor.watching')} value={wizardForm.watchEnabled ? t('overview.wizard.watchEnabled') : t('overview.wizard.watchDisabled')} />
                )}
                {wizardForm.agentType === 'helpdesk' && (
                  <WizardSummaryRow label={t('settings.scopeMode')} value={t(`settings.scopeModes.${wizardScopeMode}`)} />
                )}
                {wizardForm.agentType === 'helpdesk' && (
                  <WizardSummaryRow label={t('settings.targetingBuilder.filters')} value={t('overview.wizard.filterCount', { count: wizardForm.filters.length })} />
                )}
                {wizardForm.agentType === 'helpdesk' && (
                  <WizardSummaryRow label={t('settings.maxTickets')} value={wizardForm.maxTickets} />
                )}
                <WizardSummaryRow label={t('settings.reviewCooldown')} value={wizardForm.reviewCooldownHours} />
                <WizardSummaryRow label={t('settings.dailyRuns')} value={wizardForm.dailyRuns} />
                <WizardSummaryRow label={t('settings.dailyCost')} value={`${wizardForm.dailyCost} EUR`} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t(wizardForm.agentType === 'sre' ? 'overview.wizard.reviewBodySre' : 'overview.wizard.reviewBody')}
              </Typography>
            </Stack>
          )}
        </Stack>
      </KanapDialog>

      <ReasonDialog
        open={pauseDialogOpen}
        title={t('pause.dialogTitleTenant')}
        description={t('pause.dialogDescriptionTenant')}
        label={t('pause.reasonLabel')}
        placeholder={t('pause.reasonPlaceholder')}
        busy={data.createPauseMutation.isPending}
        saveLabel={t('pause.tenant')}
        onClose={() => setPauseDialogOpen(false)}
        onSubmit={submitTenantPause}
      />

      {agentToDelete && (
        <KanapDialog
          open={!!agentToDelete}
          title={t('overview.deleteConfirmTitle', { name: agentToDelete.name })}
          onClose={() => setAgentToDelete(null)}
          onSave={() => data.deleteAgentMutation.mutate(agentToDelete.id, { onSuccess: () => setAgentToDelete(null) })}
          saveLabel={t('overview.deleteConfirm')}
          saveColor="error"
          saveLoading={data.deleteAgentMutation.isPending}
        >
          <Typography variant="body2" color="text.secondary">{t('overview.deleteConfirmBody')}</Typography>
        </KanapDialog>
      )}
    </Box>
  );
}
