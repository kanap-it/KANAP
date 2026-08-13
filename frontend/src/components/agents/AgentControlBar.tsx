import React from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Select, Stack, Tooltip, Typography } from '@mui/material';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { drawerMenuItemSx, drawerSelectSx } from '../../theme/formSx';
import { useAgentControlData } from '../../pages/agents/useAgentControlData';
import {
  buildTicketGroups,
  formatNumber,
  LifecycleText,
  lifecycleStatusKey,
  ReasonDialog,
  resolveAgentSummary,
  statusLabel,
} from './agentControlPrimitives';

// Run-mode control values, collapsing the two backend axes (definition.status +
// trigger_policy.scheduled_poll.enabled) into one plain-language choice:
// Off = nothing runs; Manual = the agent only runs when you ask (Check now,
// tests); Watching = Manual plus the scheduled check.
export type RunModeKey = 'off' | 'manual' | 'watching';
const RUN_MODES: RunModeKey[] = ['off', 'manual', 'watching'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function policyObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

// Inline label·value fact for the status strip (charter workspace metric strip:
// one lightweight line of facts, not a grid of metric cards).
function StripFact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Typography sx={(theme) => ({ fontSize: 12, color: theme.palette.kanap.text.tertiary, whiteSpace: 'nowrap' })}>
      {label}
      {' '}
      <Typography component="span" sx={(theme) => ({ fontSize: 12, fontWeight: 500, color: theme.palette.kanap.text.primary })}>
        {value}
      </Typography>
    </Typography>
  );
}

/**
 * Transverse control + status bar for an agent workspace: it sits between the
 * page header and the tab strip and stays visible on every tab, so the agent's
 * state and its controls are never a tab away.
 *
 * Two distinct axes on purpose:
 *  - run mode (Off / Manual / Watching) is the everyday setting;
 *  - the emergency pause is the red brake — it overrides the run mode and, while
 *    active, replaces the controls with "Lift pause".
 */
export default function AgentControlBar({ agentKey, onTest }: { agentKey: string; onTest: () => void }) {
  const { t } = useTranslation(['agents']);
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const data = useAgentControlData({ targetAgentKey: agentKey });
  const canAdmin = hasLevel('ai_agents', 'admin') || hasLevel('ai_settings', 'admin');
  const definition = data.queueQuery.data?.definitions.find((item) => item.agent_key === agentKey) ?? null;
  const summary = resolveAgentSummary(data.queueQuery.data, agentKey);
  const isSre = definition?.agent_type === 'sre';

  // SRE agents have no helpdesk ingestion summary, so watching / last-check come
  // from the definition itself (trigger policy + the poller's stored state).
  const sreWatching = policyObject(policyObject(definition?.trigger_policy_json).scheduled_poll).enabled === true;
  const sreTargetingPredicateCount = (() => {
    const predicates = policyObject(policyObject(definition?.scope_policy_json).targeting).predicates;
    return Array.isArray(predicates) ? predicates.length : 0;
  })();
  // "Next check" follows the agent's own check frequency (trigger policy), not
  // the platform cron tick. Mirror of the backend clamp in
  // ai-agent-check-interval.ts — an absent key means the 5-minute default.
  const storedCheckInterval = policyObject(policyObject(definition?.trigger_policy_json).scheduled_poll).interval_minutes;
  const checkIntervalMinutes = typeof storedCheckInterval === 'number' && Number.isFinite(storedCheckInterval)
    ? Math.max(5, Math.min(1440, Math.floor(storedCheckInterval)))
    : 5;
  const sreIngestionState = policyObject(policyObject(definition?.metadata_json).monitoring_ingestion_state);
  const sreLastPollStatus = typeof sreIngestionState.last_poll_status === 'string' ? sreIngestionState.last_poll_status : '';
  const watching = isSre ? sreWatching : !!summary?.ingestion.enabled;

  const agentPause = summary?.emergencyPause ?? null;
  const tenantPause = data.settingsQuery.data?.emergency_pause ?? null;
  const activePause = agentPause ?? tenantPause;

  // Draft agents have no run-mode selection yet (a fact, not a choice) and
  // archived agents hide the control entirely — restoring is a deliberate action
  // taken from the Settings tab.
  const runMode: RunModeKey | null = definition?.status === 'enabled'
    ? (watching ? 'watching' : 'manual')
    : definition?.status === 'disabled'
      ? 'off'
      : null;
  const isArchived = definition?.status === 'archived';
  const setRunMode = (mode: RunModeKey) => {
    if (!definition || mode === runMode) return;
    data.updateAgentStatusMutation.mutate({
      id: definition.id,
      status: mode === 'off' ? 'disabled' : 'enabled',
      watching: mode === 'watching',
    });
  };

  const grouped = React.useMemo(
    () => buildTicketGroups(data.queueQuery.data ?? null, data.actionPool, definition?.id ?? null, Date.now()),
    [data.actionPool, data.queueQuery.data, definition?.id],
  );
  const waitingCount = grouped.groups.filter((group) => group.queueStatus === 'waiting_approval').length;
  const inProgressCount = grouped.groups.filter((group) => ['queued', 'leased', 'running'].includes(group.queueStatus)).length;
  const failedCount = grouped.groups.filter((group) => ['failed', 'dead_letter'].includes(group.queueStatus)).length;

  const pollMutation = isSre ? data.pollMonitoringMutation : data.pollMutation;
  const [pauseDialogOpen, setPauseDialogOpen] = React.useState(false);
  const submitPause = (reason: string) => {
    if (!definition) return;
    data.createPauseMutation.mutate(
      { scope: 'agent', agent_definition_id: definition.id, reason, expires_in_minutes: null },
      { onSuccess: () => setPauseDialogOpen(false) },
    );
  };

  const daily = summary?.guardrails.daily ?? null;
  const checkLabel = isSre ? t('monitor.checkForAlerts') : t('monitor.checkNow');
  const testLabel = isSre ? t('monitor.testAlert') : t('monitor.testTicket');
  const checkBlockedReason = runMode === 'off'
    ? t('monitor.checkNowOffHint')
    : activePause
      ? t('monitor.checkNowPausedHint')
      : null;

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {data.error && <Alert severity="error" onClose={() => data.setError(null)}>{data.error}</Alert>}
      {data.message && <Alert severity="success" onClose={() => data.setMessage(null)}>{data.message}</Alert>}
      {activePause && <Alert severity="warning">{t('pause.active', { reason: activePause.reason })}</Alert>}

      <Box
        sx={(theme) => ({
          border: `1px solid ${theme.palette.kanap.border.soft}`,
          borderRadius: 1,
          bgcolor: theme.palette.kanap.bg.drawer,
          px: 1.5,
          py: 1,
        })}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          justifyContent="space-between"
        >
          {/* Read-only status strip */}
          <Stack direction="row" spacing={2.5} useFlexGap flexWrap="wrap" alignItems="center" sx={{ minWidth: 0 }}>
            {definition && (
              <LifecycleText
                lifecycleKey={lifecycleStatusKey(
                  definition.status,
                  watching,
                  definition.automatic_action_classes?.length ?? 0,
                  !!activePause || !!summary?.ingestion.paused,
                )}
              />
            )}
            <StripFact
              label={t('monitor.watching')}
              value={isSre
                ? (sreWatching ? (sreTargetingPredicateCount > 0 ? t('monitor.filtered') : t('monitor.allAlerts')) : t('monitor.off'))
                : (summary?.ingestion.enabled ? (summary.ingestion.entityId || summary.ingestion.categoryId ? t('monitor.filtered') : t('monitor.allTickets')) : t('monitor.off'))}
            />
            <StripFact
              label={t('monitor.lastCheck')}
              value={isSre
                ? (sreLastPollStatus ? statusLabel(sreLastPollStatus) : t('common.notSet'))
                : (summary?.ingestion.lastPollStatus ? statusLabel(summary.ingestion.lastPollStatus) : t('common.notSet'))}
            />
            <StripFact
              label={t('monitor.nextCheck')}
              value={watching ? t('monitor.everyMinutes', { count: checkIntervalMinutes }) : t('common.notSet')}
            />
            <StripFact
              label={t('monitor.queue')}
              value={t('monitor.queueSummary', { waiting: waitingCount, inProgress: inProgressCount })}
            />
            {failedCount > 0 && (
              <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'error.main', whiteSpace: 'nowrap' }}>
                {t('overview.failedCount', { count: failedCount })}
              </Typography>
            )}
            {/* Daily usage vs the configured caps. The totals only exist for
                helpdesk agents today, so they are hidden rather than shown as
                misleading zeros for SRE agents. */}
            {!isSre && daily && (
              <>
                <StripFact label={t('monitor.runsToday')} value={`${daily.runs ?? 0} / ${daily.cap.maxRuns ?? '-'}`} />
                <StripFact
                  label={t('monitor.tokensToday')}
                  value={`${formatNumber(daily.estimatedTokens ?? 0)} / ${formatNumber(daily.cap.maxTokens)}`}
                />
                <StripFact
                  label={t('monitor.costToday')}
                  value={`${(daily.estimatedCostEur ?? 0).toFixed(4)} / ${daily.cap.maxCostEur ?? '-'} EUR`}
                />
              </>
            )}
          </Stack>

          {/* Controls */}
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {agentPause ? (
              <Button
                size="small"
                variant="action"
                startIcon={<PlayArrowIcon />}
                disabled={!canAdmin || data.revokePauseMutation.isPending}
                onClick={() => data.revokePauseMutation.mutate(agentPause.id)}
              >
                {t('pause.lift')}
              </Button>
            ) : tenantPause ? (
              <Button size="small" variant="action" onClick={() => navigate('/agents')}>{t('pause.managedForAll')}</Button>
            ) : isArchived ? (
              <Typography sx={(theme) => ({ fontSize: 12, color: theme.palette.kanap.text.tertiary })}>
                {t('monitor.archivedNote')}
              </Typography>
            ) : canAdmin ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography sx={(theme) => ({ fontSize: 12, color: theme.palette.kanap.text.tertiary, whiteSpace: 'nowrap' })}>
                  {t('monitor.runMode')}
                </Typography>
                <Select
                  variant="standard"
                  disableUnderline
                  displayEmpty
                  value={runMode ?? ''}
                  disabled={data.updateAgentStatusMutation.isPending}
                  sx={[drawerSelectSx, { minWidth: 108, width: 'auto' }]}
                  onChange={(event) => setRunMode(event.target.value as RunModeKey)}
                  inputProps={{ 'aria-label': t('monitor.runMode') }}
                >
                  {runMode == null && (
                    <MenuItem value="" sx={drawerMenuItemSx} disabled>{t('lifecycle.notStarted')}</MenuItem>
                  )}
                  {RUN_MODES.map((mode) => (
                    <MenuItem key={mode} value={mode} sx={drawerMenuItemSx}>{t(`monitor.modes.${mode}`)}</MenuItem>
                  ))}
                </Select>
              </Stack>
            ) : null}

            {!isArchived && (
              <Tooltip title={checkBlockedReason ?? checkLabel}>
                <span>
                  <Button
                    size="small"
                    variant="action"
                    startIcon={pollMutation.isPending ? <CircularProgress size={13} /> : <RefreshIcon />}
                    disabled={pollMutation.isPending || !!checkBlockedReason || !definition}
                    onClick={() => pollMutation.mutate()}
                  >
                    {checkLabel}
                  </Button>
                </span>
              </Tooltip>
            )}

            <Button size="small" variant="action" startIcon={<ScienceOutlinedIcon />} onClick={onTest}>
              {testLabel}
            </Button>

            {canAdmin && !agentPause && !tenantPause && !isArchived && (
              <Button
                size="small"
                variant="action-danger"
                startIcon={<PauseCircleOutlineIcon />}
                onClick={() => setPauseDialogOpen(true)}
              >
                {t('pause.agent')}
              </Button>
            )}
          </Stack>
        </Stack>
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
