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
  HELP_DESK_TICKETING_AGENT_KEY,
  humanize,
  LEGACY_GLPI_TICKETING_PROVIDER_KEY,
  lifecycleStatusKey,
  MetricBlock,
  ReasonDialog,
  Section,
  statusLabel,
  StatusText,
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
  agentType: 'helpdesk';
  providerKey: typeof LEGACY_GLPI_TICKETING_PROVIDER_KEY;
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

function newAgentPolicies(form: NewAgentWizardForm) {
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
  const activePause = data.settingsQuery.data?.emergency_pause ?? null;
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState(0);
  const [wizardForm, setWizardForm] = React.useState<NewAgentWizardForm>(() => defaultWizardForm(t));
  const canAdmin = hasLevel('ai_agents', 'admin') || hasLevel('ai_settings', 'admin');
  const wizardSteps = React.useMemo(() => [
    t('overview.wizard.steps.type'),
    t('overview.wizard.steps.connection'),
    t('overview.wizard.steps.watching'),
    t('overview.wizard.steps.limits'),
    t('overview.wizard.steps.review'),
  ], [t]);
  const updateWizard = <K extends keyof NewAgentWizardForm>(field: K, value: NewAgentWizardForm[K]) => {
    setWizardForm((current) => ({ ...current, [field]: value }));
  };
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
      <PageHeader title={t('overview.title')} />
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
          <MetricBlock label={t('overview.costPerTicket')} value={fleetEvaluation?.costPerTicketEur == null ? t('common.notEnoughData') : `${fleetEvaluation.costPerTicketEur.toFixed(4)} EUR`} />
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
          ) : definitions.length === 0 ? (
            <EmptyState>{t('overview.empty')}</EmptyState>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, p: 1.5, alignItems: 'start' }}>
              {definitions.map((definition) => {
                const agentHelpdeskSummary = helpdeskSummaryByAgent.get(definition.id) ?? null;
                const watching = !!agentHelpdeskSummary?.ingestion.enabled;
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
                              <StatusText status={t(`lifecycle.${label}`)} />
                              {canAdmin && definition.agent_key !== HELP_DESK_TICKETING_AGENT_KEY && (
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
              {canAdmin && (
                <Card variant="outlined" sx={{ borderRadius: 1 }}>
                  <CardActionArea onClick={openWizard} disabled={data.createAgentMutation.isPending}>
                    <CardContent>
                    <Stack spacing={1}>
                      <AddIcon color="disabled" />
                      <Typography variant="subtitle2">{t('overview.newAgent')}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('overview.newAgentEnabled')}</Typography>
                    </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              )}
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

          {wizardStep === 0 && (
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
                  onChange={(event) => updateWizard('agentType', event.target.value as NewAgentWizardForm['agentType'])}
                  sx={drawerSelectSx}
                >
                  <MenuItem value="helpdesk" sx={drawerMenuItemSx}>{t('overview.wizard.helpdesk')}</MenuItem>
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

          {wizardStep === 1 && (
            <Stack spacing={1.5}>
              <PropertyRow label={t('overview.wizard.connection')}>
                <Select
                  variant="standard"
                  value={wizardForm.providerKey}
                  onChange={(event) => updateWizard('providerKey', event.target.value as NewAgentWizardForm['providerKey'])}
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

          {wizardStep === 2 && (
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

          {wizardStep === 3 && (
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
                <PropertyRow label={t('settings.maxTickets')}>
                  <TextField size="small" variant="standard" value={wizardForm.maxTickets} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('maxTickets', event.target.value)} />
                </PropertyRow>
                <PropertyRow label={t('settings.maxRequests')}>
                  <TextField size="small" variant="standard" value={wizardForm.maxRequests} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('maxRequests', event.target.value)} />
                </PropertyRow>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                <PropertyRow label={t('settings.approvalTtl')}>
                  <TextField size="small" variant="standard" value={wizardForm.approvalTtlHours} InputProps={{ disableUnderline: true }} sx={[dialogBorderedFieldSx, { width: '100%' }]} onChange={(event) => updateWizard('approvalTtlHours', event.target.value)} />
                </PropertyRow>
                <PropertyRow label={t('settings.onStale')}>
                  <Select variant="standard" value={wizardForm.onStale} onChange={(event) => updateWizard('onStale', event.target.value)} sx={drawerSelectSx}>
                    <MenuItem value="re_review" sx={drawerMenuItemSx}>{t('settings.stalePolicies.re_review')}</MenuItem>
                    <MenuItem value="cancel" sx={drawerMenuItemSx}>{t('settings.stalePolicies.cancel')}</MenuItem>
                    <MenuItem value="apply_anyway" sx={drawerMenuItemSx}>{t('settings.stalePolicies.apply_anyway')}</MenuItem>
                  </Select>
                </PropertyRow>
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

          {wizardStep === 4 && (
            <Stack spacing={1.5}>
              <Typography sx={(theme) => ({ fontSize: 16, fontWeight: 500, color: theme.palette.kanap.text.primary })}>
                {wizardForm.name || t('overview.wizard.unnamed')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                <WizardSummaryRow label={t('overview.wizard.type')} value={t('overview.wizard.helpdesk')} />
                <WizardSummaryRow label={t('overview.wizard.connection')} value="GLPI" />
                <WizardSummaryRow label={t('monitor.watching')} value={wizardForm.watchEnabled ? t('overview.wizard.watchEnabled') : t('overview.wizard.watchDisabled')} />
                <WizardSummaryRow label={t('settings.scopeMode')} value={t(`settings.scopeModes.${wizardScopeMode}`)} />
                <WizardSummaryRow label={t('settings.targetingBuilder.filters')} value={t('overview.wizard.filterCount', { count: wizardForm.filters.length })} />
                <WizardSummaryRow label={t('settings.maxTickets')} value={wizardForm.maxTickets} />
                <WizardSummaryRow label={t('settings.reviewCooldown')} value={wizardForm.reviewCooldownHours} />
                <WizardSummaryRow label={t('settings.dailyRuns')} value={wizardForm.dailyRuns} />
                <WizardSummaryRow label={t('settings.dailyCost')} value={`${wizardForm.dailyCost} EUR`} />
              </Box>
              <Typography variant="body2" color="text.secondary">{t('overview.wizard.reviewBody')}</Typography>
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
