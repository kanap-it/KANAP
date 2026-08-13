import React from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatNumber, LifecycleText, statusLabel } from './agentControlPrimitives';
import { useAgentRunState } from './agentRunState';

/**
 * Inline label·value fact (charter workspace metric strip: one lightweight line
 * of facts, not a grid of metric cards).
 */
export function StatusStripItem({ label, value }: { label: string; value: React.ReactNode }) {
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
 * The agent's read-only facts: what it watches, when it last looked and when it
 * looks next, what is queued, and today's usage against the daily caps.
 *
 * These used to sit in the transverse control bar next to the buttons, which
 * made the bar two things at once. The bar is now actions only and the facts
 * live at the top of the Monitor tab.
 */
export default function AgentStatusStrip({ agentKey }: { agentKey: string }) {
  const { t } = useTranslation(['agents']);
  const state = useAgentRunState(agentKey);

  return (
    <Stack direction="row" spacing={2.5} useFlexGap flexWrap="wrap" alignItems="center" sx={{ px: 1.5, py: 1.25, minWidth: 0 }}>
      {state.lifecycleKey && <LifecycleText lifecycleKey={state.lifecycleKey} />}
      <StatusStripItem
        label={t('monitor.watching')}
        value={state.isSre
          ? (state.sreWatching
            ? (state.sreTargetingPredicateCount > 0 ? t('monitor.filtered') : t('monitor.allAlerts'))
            : t('monitor.off'))
          : (state.summary?.ingestion.enabled
            ? (state.summary.ingestion.entityId || state.summary.ingestion.categoryId ? t('monitor.filtered') : t('monitor.allTickets'))
            : t('monitor.off'))}
      />
      <StatusStripItem
        label={t('monitor.lastCheck')}
        value={state.isSre
          ? (state.sreLastPollStatus ? statusLabel(state.sreLastPollStatus) : t('common.notSet'))
          : (state.summary?.ingestion.lastPollStatus ? statusLabel(state.summary.ingestion.lastPollStatus) : t('common.notSet'))}
      />
      <StatusStripItem
        label={t('monitor.nextCheck')}
        value={state.watching ? t('monitor.everyMinutes', { count: state.checkIntervalMinutes }) : t('common.notSet')}
      />
      <StatusStripItem
        label={t('monitor.queue')}
        value={t('monitor.queueSummary', { waiting: state.waitingCount, inProgress: state.inProgressCount })}
      />
      {state.failedCount > 0 && (
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'error.main', whiteSpace: 'nowrap' }}>
          {t('overview.failedCount', { count: state.failedCount })}
        </Typography>
      )}
      {/* Daily usage vs the configured caps. The totals only exist for helpdesk
          agents today, so they are hidden rather than shown as misleading zeros
          for SRE agents. */}
      {!state.isSre && state.daily && (
        <>
          <StatusStripItem label={t('monitor.runsToday')} value={`${state.daily.runs ?? 0} / ${state.daily.cap.maxRuns ?? '-'}`} />
          <StatusStripItem
            label={t('monitor.tokensToday')}
            value={`${formatNumber(state.daily.estimatedTokens ?? 0)} / ${formatNumber(state.daily.cap.maxTokens)}`}
          />
          <StatusStripItem
            label={t('monitor.costToday')}
            value={`${(state.daily.estimatedCostEur ?? 0).toFixed(4)} / ${state.daily.cap.maxCostEur ?? '-'} EUR`}
          />
        </>
      )}
    </Stack>
  );
}
