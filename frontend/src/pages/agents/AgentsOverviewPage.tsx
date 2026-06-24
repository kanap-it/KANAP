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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import PageHeader from '../../components/PageHeader';
import KanapDialog from '../../components/design/KanapDialog';
import {
  EmptyState,
  formatNumber,
  formatPercent,
  HELP_DESK_AGENT_KEY,
  humanize,
  lifecycleStatusKey,
  MetricBlock,
  ReasonDialog,
  Section,
  statusLabel,
  StatusText,
} from '../../components/agents/agentControlPrimitives';
import { useLocale } from '../../i18n/useLocale';
import { useAgentControlData } from './useAgentControlData';

const DEFAULT_MAX_TICKETS = 5;
const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_HORIZON_HOURS = 24;
const DEFAULT_PER_RUN_TOKENS = 40000;
const DEFAULT_PER_RUN_COST = 1;
const DEFAULT_DAILY_RUNS = 25;
const DEFAULT_DAILY_TOKENS = 500000;
const DEFAULT_DAILY_COST = 10;

type NewAgentWizardForm = {
  name: string;
  description: string;
  agentType: 'helpdesk';
  providerKey: 'glpi';
  watchEnabled: boolean;
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
};

function defaultWizardForm(t: (key: string) => string): NewAgentWizardForm {
  return {
    name: t('overview.newAgentDefaultName'),
    description: t('overview.newAgentDescription'),
    agentType: 'helpdesk',
    providerKey: 'glpi',
    watchEnabled: false,
    entityId: '',
    categoryId: '',
    maxTickets: String(DEFAULT_MAX_TICKETS),
    maxRequests: String(DEFAULT_MAX_REQUESTS),
    horizonHours: String(DEFAULT_HORIZON_HOURS),
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
  return {
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
      mode: form.watchEnabled ? 'new_tickets_only' : 'manual_safe_target',
      allowed_modes: ['manual_safe_target', 'new_tickets_only', 'new_plus_agent_touched', 'saved_filter'],
      provider_kind: 'ticketing',
      provider_key: form.providerKey,
      target_kind: 'ticket',
      required_safe_target_effect: 'read',
      new_tickets_only: {
        enabled: form.watchEnabled,
        enabled_at: enabledAt,
        entity_id: form.entityId.trim() || null,
        category_id: form.categoryId.trim() || null,
        max_tickets_per_cycle: positiveNumber(form.maxTickets, DEFAULT_MAX_TICKETS),
        max_provider_requests_per_cycle: positiveNumber(form.maxRequests, DEFAULT_MAX_REQUESTS),
        hard_backfill_horizon_hours: positiveNumber(form.horizonHours, DEFAULT_HORIZON_HOURS),
      },
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
      retry_backoff_seconds: [60, 300, 900],
      terminal_statuses: ['completed', 'skipped', 'dead_letter'],
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
  const updateWizard = (field: keyof NewAgentWizardForm, value: string | boolean) => {
    setWizardForm((current) => ({ ...current, [field]: value }));
  };

  const [pauseDialogOpen, setPauseDialogOpen] = React.useState(false);
  const [agentToDelete, setAgentToDelete] = React.useState<{ id: string; name: string } | null>(null);
  const submitTenantPause = React.useCallback((reason: string) => {
    data.createPauseMutation.mutate(
      { scope: 'tenant', reason, expires_in_minutes: null },
      { onSuccess: () => setPauseDialogOpen(false) },
    );
  }, [data.createPauseMutation]);

  const openWizard = React.useCallback(() => {
    setWizardForm(defaultWizardForm(t));
    setWizardStep(0);
    setWizardOpen(true);
  }, [t]);

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
                const isHelpdesk = definition.agent_key === HELP_DESK_AGENT_KEY;
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
                              {canAdmin && definition.agent_key !== HELP_DESK_AGENT_KEY && (
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
      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t('overview.wizard.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stepper activeStep={wizardStep} alternativeLabel>
              {wizardSteps.map((label) => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>
            {wizardStep === 0 && (
              <Stack spacing={1.5}>
                <TextField label={t('overview.wizard.name')} size="small" value={wizardForm.name} onChange={(event) => updateWizard('name', event.target.value)} />
                <TextField label={t('overview.wizard.type')} select size="small" value={wizardForm.agentType} onChange={(event) => updateWizard('agentType', event.target.value)}>
                  <MenuItem value="helpdesk">{t('overview.wizard.helpdesk')}</MenuItem>
                </TextField>
                <TextField label={t('overview.wizard.description')} size="small" multiline minRows={3} value={wizardForm.description} onChange={(event) => updateWizard('description', event.target.value)} />
              </Stack>
            )}
            {wizardStep === 1 && (
              <Stack spacing={1.5}>
                <TextField label={t('overview.wizard.connection')} select size="small" value={wizardForm.providerKey} onChange={(event) => updateWizard('providerKey', event.target.value)}>
                  <MenuItem value="glpi">GLPI</MenuItem>
                </TextField>
                <Button size="small" variant="outlined" onClick={() => navigate('/admin/integrations')}>{t('overview.wizard.manageConnections')}</Button>
              </Stack>
            )}
            {wizardStep === 2 && (
              <Stack spacing={1.5}>
                <FormControlLabel control={<Switch checked={wizardForm.watchEnabled} onChange={(event) => updateWizard('watchEnabled', event.target.checked)} />} label={t('overview.wizard.watchNewTickets')} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                  <TextField label={t('settings.entity')} size="small" value={wizardForm.entityId} onChange={(event) => updateWizard('entityId', event.target.value)} />
                  <TextField label={t('settings.category')} size="small" value={wizardForm.categoryId} onChange={(event) => updateWizard('categoryId', event.target.value)} />
                </Box>
              </Stack>
            )}
            {wizardStep === 3 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                <TextField label={t('settings.maxTickets')} size="small" value={wizardForm.maxTickets} onChange={(event) => updateWizard('maxTickets', event.target.value)} />
                <TextField label={t('settings.maxRequests')} size="small" value={wizardForm.maxRequests} onChange={(event) => updateWizard('maxRequests', event.target.value)} />
                <TextField label={t('settings.horizon')} size="small" value={wizardForm.horizonHours} onChange={(event) => updateWizard('horizonHours', event.target.value)} />
                <TextField label={t('settings.perRunTokens')} size="small" value={wizardForm.perRunTokens} onChange={(event) => updateWizard('perRunTokens', event.target.value)} />
                <TextField label={t('settings.perRunCost')} size="small" value={wizardForm.perRunCost} onChange={(event) => updateWizard('perRunCost', event.target.value)} />
                <TextField label={t('settings.dailyRuns')} size="small" value={wizardForm.dailyRuns} onChange={(event) => updateWizard('dailyRuns', event.target.value)} />
                <TextField label={t('settings.dailyTokens')} size="small" value={wizardForm.dailyTokens} onChange={(event) => updateWizard('dailyTokens', event.target.value)} />
                <TextField label={t('settings.dailyCost')} size="small" value={wizardForm.dailyCost} onChange={(event) => updateWizard('dailyCost', event.target.value)} />
              </Box>
            )}
            {wizardStep === 4 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">{wizardForm.name || t('overview.wizard.unnamed')}</Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={t('overview.wizard.helpdesk')} />
                  <Chip size="small" label="GLPI" />
                  <Chip size="small" label={wizardForm.watchEnabled ? t('overview.wizard.watchEnabled') : t('overview.wizard.watchDisabled')} />
                  <Chip size="small" label={wizardForm.entityId || wizardForm.categoryId ? t('overview.filteredScope') : t('overview.allTickets')} />
                </Stack>
                <Typography variant="body2" color="text.secondary">{t('overview.wizard.reviewBody')}</Typography>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWizardOpen(false)}>{t('overview.wizard.cancel')}</Button>
          <Button disabled={wizardStep === 0} onClick={() => setWizardStep((step) => Math.max(0, step - 1))}>{t('overview.wizard.back')}</Button>
          {wizardStep < wizardSteps.length - 1 ? (
            <Button variant="contained" onClick={() => setWizardStep((step) => Math.min(wizardSteps.length - 1, step + 1))} disabled={!wizardForm.name.trim()}>{t('overview.wizard.next')}</Button>
          ) : (
            <Button variant="contained" onClick={createAgent} disabled={!wizardForm.name.trim() || data.createAgentMutation.isPending}>{t('overview.wizard.create')}</Button>
          )}
        </DialogActions>
      </Dialog>

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
