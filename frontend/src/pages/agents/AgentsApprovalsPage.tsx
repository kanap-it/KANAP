import React from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Stack, TextField, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import KanapDialog from '../../components/design/KanapDialog';
import { PropertyRow } from '../../components/design';
import { dialogBorderedFieldSx } from '../../theme/formSx';
import {
  ActionButtons,
  actionAttentionMessage,
  actionBody,
  actionCanExecute,
  actionCanReject,
  actionHasQueuedExecution,
  actionInProgress,
  actionIsTerminalStatus,
  actionLabel,
  actionNeedsAttention,
  actionUpdateSummary,
  buildTicketGroups,
  EmptyState,
  formatDateTime,
  humanize,
  INTERNAL_NOTE_CAPABILITY,
  isRecord,
  PUBLIC_REPLY_CAPABILITY,
  Section,
  StatusText,
  stringValue,
  TargetLabel,
  targetLabelText,
  type TicketWorkGroup,
  workItemAttentionMessage,
  workItemInProgress,
  workItemNeedsAttention,
} from '../../components/agents/agentControlPrimitives';
import {
  type AiAgentControlActionRequest,
  type AiAgentControlWorkItem,
} from '../../ai/aiApi';
import { useLocale } from '../../i18n/useLocale';
import { useAgentControlData } from './useAgentControlData';

const FINISHED_OPEN_STORAGE_KEY = 'kanap.agentsApprovals.finishedOpen';
const FINISHED_ROW_LIMIT = 30;
const FALLBACK_REASON_KEYS = new Set([
  'synthesis_error',
  'synthesis_disabled_by_env',
  'synthesis_projected_over_per_run_cap',
  'operating_context_leak',
  'invalid_or_ungrounded_synthesis',
]);

type TerminalApprovalRequest = {
  group: TicketWorkGroup;
  actions: AiAgentControlActionRequest[];
  mode: 'single' | 'bulk';
} | null;

type CompactRow = {
  id: string;
  status: string;
  capabilityLabel: string;
  targetType: string | null;
  targetRef: string | null;
  targetUrl: string | null;
  detail: string | null;
  time: string | null;
  caption?: string | null;
  traceRunId?: string | null;
};

function proposalIcon(capabilityName: string) {
  if (capabilityName === PUBLIC_REPLY_CAPABILITY) return <ForumOutlinedIcon fontSize="small" color="action" />;
  if (capabilityName === INTERNAL_NOTE_CAPABILITY) return <NotesOutlinedIcon fontSize="small" color="action" />;
  return <ManageSearchOutlinedIcon fontSize="small" color="action" />;
}

function proposalBody(action: AiAgentControlActionRequest): string | null {
  if (action.capability_name === INTERNAL_NOTE_CAPABILITY || action.capability_name === PUBLIC_REPLY_CAPABILITY) {
    return actionBody(action);
  }
  return actionUpdateSummary(action);
}

function actionFinishedTime(action: AiAgentControlActionRequest): string | null {
  return action.executed_at
    ?? action.rejected_at
    ?? action.approved_at
    ?? action.updated_at
    ?? action.created_at
    ?? null;
}

function formatRelativeTime(value: string | null | undefined, locale: string, justNow: string): string {
  if (!value) return justNow;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return justNow;
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 45) return justNow;
  if (abs < 45 * 60) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 36 * 60 * 60) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 30 * 24 * 60 * 60) return rtf.format(Math.round(seconds / 86400), 'day');
  return formatDateTime(value, locale);
}

function splitFallbackReason(raw: string | null): { key: string; detail: string | null } {
  if (!raw) return { key: 'unknown', detail: null };
  const separatorIndex = raw.indexOf(':');
  if (separatorIndex === -1) return { key: raw, detail: null };
  return {
    key: raw.slice(0, separatorIndex),
    detail: raw.slice(separatorIndex + 1).trim() || null,
  };
}

function synthesisFallbackInfo(action: AiAgentControlActionRequest, t: ReturnType<typeof useTranslation>['t']): { label: string; detail: string | null } | null {
  if (action.capability_name !== INTERNAL_NOTE_CAPABILITY && action.capability_name !== PUBLIC_REPLY_CAPABILITY) return null;
  const metadata = isRecord(action.metadata_json) ? action.metadata_json : null;
  if (metadata?.synthesis_usable !== false) return null;
  const { key, detail } = splitFallbackReason(stringValue(metadata.synthesis_fallback_reason));
  // 'synthesis_not_attempted' means the planner deliberately did not commission a sourced
  // answer (administrative reply or internal escalation) — nothing failed, so no warning.
  // Genuine failures carry their own reasons (synthesis_error:…, *_over_per_run_cap, …).
  if (key === 'synthesis_not_attempted') return null;
  const known = FALLBACK_REASON_KEYS.has(key);
  return {
    label: t(`approvals.fallbackReasons.${known ? key : 'unknown'}`, {
      reason: humanize(key),
      defaultValue: known ? humanize(key) : t('approvals.fallbackReasons.unknown', { reason: humanize(key) }),
    }),
    detail,
  };
}

function ProposalRow({
  action,
  busy,
  onApprove,
  onReject,
  emptyLabel,
}: {
  action: AiAgentControlActionRequest;
  busy: boolean;
  onApprove: (action: AiAgentControlActionRequest) => void;
  onReject: (action: AiAgentControlActionRequest) => void;
  emptyLabel: string;
}) {
  const body = proposalBody(action);
  const { t } = useTranslation(['agents']);
  const terminal = actionIsTerminalStatus(action);
  const fallback = synthesisFallbackInfo(action, t);
  return (
    <Box sx={{ border: '1px solid', borderColor: terminal ? 'kanap.danger' : 'kanap.border.default', borderRadius: 1, p: 1.25 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          {proposalIcon(action.capability_name)}
          <Typography sx={(theme) => ({ color: terminal ? theme.palette.kanap.danger : theme.palette.kanap.text.primary, fontSize: 13, fontWeight: 500 })}>
            {actionLabel(action)}
          </Typography>
          {terminal && (
            <Typography sx={(theme) => ({ color: theme.palette.kanap.danger, fontSize: 12, fontWeight: 500 })}>
              {t('approvals.terminalAction')}
            </Typography>
          )}
          <StatusText status={action.status} />
        </Stack>
        <ActionButtons action={action} busy={busy} onApprove={onApprove} onReject={onReject} />
      </Stack>
      <Box sx={{ maxHeight: 170, overflow: 'auto', border: '1px solid', borderColor: 'kanap.border.soft', borderRadius: 1, bgcolor: 'kanap.bg.composer', px: 1, py: 0.85 }}>
        {body ? (
          <Typography component="pre" sx={{ m: 0, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</Typography>
        ) : (
          <Typography sx={(theme) => ({ color: theme.palette.kanap.text.secondary, fontSize: 13 })}>{emptyLabel}</Typography>
        )}
      </Box>
      {fallback && (
        <Typography sx={(theme) => ({ color: theme.palette.kanap.orange, fontSize: 12, fontWeight: 400, lineHeight: 1.45, mt: 0.75 })}>
          {t('approvals.fallbackNote')}: {fallback.label}
          {fallback.detail && (
            <Box component="span" sx={(theme) => ({ color: theme.palette.kanap.text.tertiary })}>
              {' - '}{fallback.detail}
            </Box>
          )}
        </Typography>
      )}
    </Box>
  );
}

function CompactStatusLine({
  action,
  locale,
}: {
  action: AiAgentControlActionRequest;
  locale: string;
}) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
      <StatusText status={action.status} />
      <Typography sx={(theme) => ({ color: theme.palette.kanap.text.primary, fontSize: 13, fontWeight: 400 })}>
        {actionLabel(action)}
      </Typography>
      <Typography sx={(theme) => ({ color: theme.palette.kanap.text.tertiary, fontSize: 12, fontWeight: 400 })}>
        {formatDateTime(actionFinishedTime(action), locale)}
      </Typography>
    </Stack>
  );
}

function CompactLifecycleRow({
  row,
  locale,
  timeMode = 'relative',
}: {
  row: CompactRow;
  locale: string;
  timeMode?: 'relative' | 'absolute';
}) {
  const { t } = useTranslation(['agents']);
  const displayedTime = timeMode === 'absolute'
    ? formatDateTime(row.time, locale)
    : formatRelativeTime(row.time, locale, t('approvals.justNow'));
  return (
    <Box sx={{ px: 1.5, py: 0.55, minWidth: 0 }}>
      <Stack direction="row" spacing={0.85} alignItems="center" flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
        <StatusText status={row.status} />
        <Typography sx={(theme) => ({ color: theme.palette.kanap.text.primary, fontSize: 13, fontWeight: 400 })}>
          {row.capabilityLabel}
        </Typography>
        <TargetLabel targetType={row.targetType} targetRef={row.targetRef} size="dense" href={row.targetUrl} />
        {row.detail && (
          <Typography sx={(theme) => ({ color: theme.palette.kanap.text.secondary, fontSize: 13, fontWeight: 400 })}>
            {row.detail}
          </Typography>
        )}
        <Typography sx={(theme) => ({ color: theme.palette.kanap.text.tertiary, fontSize: 12, fontWeight: 400 })}>
          {displayedTime}
        </Typography>
        {row.traceRunId && (
          <Button size="small" variant="text" startIcon={<VisibilityOutlinedIcon />} href={`/agents/activity?runId=${row.traceRunId}`} sx={{ minHeight: 24, py: 0 }}>
            {t('approvals.trace')}
          </Button>
        )}
      </Stack>
      {row.caption && (
        <Typography sx={(theme) => ({ color: theme.palette.kanap.danger, fontSize: 12, fontWeight: 400, lineHeight: 1.35, mt: 0.2 })}>
          {row.caption}
        </Typography>
      )}
    </Box>
  );
}

function groupTargetText(group: TicketWorkGroup): string {
  return targetLabelText(group.targetType, group.targetRef);
}

function ApprovalReasonField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation(['agents']);
  return (
    <PropertyRow label={t('approvals.reasonLabel')}>
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        size="small"
        variant="standard"
        value={value}
        placeholder={t('approvals.reasonPlaceholder')}
        InputProps={{ disableUnderline: true }}
        inputProps={{ maxLength: 500 }}
        sx={[
          dialogBorderedFieldSx,
          {
            width: '100%',
            '& .MuiInputBase-input': {
              fontSize: 13,
              lineHeight: 1.45,
            },
          },
        ]}
        onChange={(event) => onChange(event.target.value)}
      />
    </PropertyRow>
  );
}

function DecisionGroup({
  group,
  locale,
  busyTicketKey,
  busyActionId,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
}: {
  group: TicketWorkGroup;
  locale: string;
  busyTicketKey: string | null;
  busyActionId: string | null;
  onApprove: (action: AiAgentControlActionRequest, group: TicketWorkGroup) => void;
  onReject: (action: AiAgentControlActionRequest) => void;
  onApproveAll: (group: TicketWorkGroup) => void;
  onRejectAll: (group: TicketWorkGroup) => void;
}) {
  const { t } = useTranslation(['agents']);
  const pendingActions = group.pendingActions.filter((action) => action.status === 'pending');
  const decidedActions = group.pendingActions.filter((action) => action.status !== 'pending');
  const executableCount = group.pendingActions.filter(actionCanExecute).length;
  const rejectableCount = group.pendingActions.filter(actionCanReject).length;
  return (
    <Box sx={{ p: 1.5 }}>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ md: 'center' }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <TargetLabel targetType={group.targetType} targetRef={group.targetRef} href={group.targetUrl} />
              <StatusText status={group.queueStatus} />
              <Typography sx={(theme) => ({ color: theme.palette.kanap.text.tertiary, fontSize: 12, fontWeight: 500 })}>
                {t('approvals.proposalCount', { count: pendingActions.length })}
              </Typography>
            </Stack>
            <Typography sx={(theme) => ({ color: theme.palette.kanap.text.secondary, fontSize: 12, fontWeight: 400, mt: 0.25 })}>
              {t('approvals.updated', { value: formatDateTime(group.updatedAt, locale) })}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            {executableCount > 1 && (
              <Button size="small" variant="outlined" disabled={busyTicketKey === group.key} onClick={() => onApproveAll(group)}>
                {t('approvals.approveAll')}
              </Button>
            )}
            {rejectableCount > 1 && (
              <Button size="small" variant="outlined" color="error" disabled={busyTicketKey === group.key} onClick={() => onRejectAll(group)}>
                {t('approvals.rejectAll')}
              </Button>
            )}
            {group.latestRunId && (
              <Button size="small" variant="text" startIcon={<VisibilityOutlinedIcon />} href={`/agents/activity?runId=${group.latestRunId}`}>
                {t('approvals.trace')}
              </Button>
            )}
          </Stack>
        </Stack>
        <Stack spacing={1}>
          {pendingActions.map((action) => (
            <ProposalRow
              key={action.id}
              action={action}
              busy={busyActionId === action.id}
              onApprove={(next) => onApprove(next, group)}
              onReject={onReject}
              emptyLabel={t('approvals.noActiveProposal')}
            />
          ))}
          {decidedActions.length > 0 && (
            <Stack spacing={0.35}>
              {decidedActions.map((action) => (
                <CompactStatusLine key={action.id} action={action} locale={locale} />
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function buildInProgressRows(groups: TicketWorkGroup[], t: ReturnType<typeof useTranslation>['t']): CompactRow[] {
  return groups.flatMap((group) => {
    const actionRows = group.pendingActions
      .filter(actionInProgress)
      .map((action) => ({
        id: action.id,
        status: actionHasQueuedExecution(action) ? 'queued' : action.status,
        capabilityLabel: actionLabel(action),
        targetType: action.target_type ?? group.targetType,
        targetRef: action.target_ref ?? group.targetRef,
        targetUrl: group.targetUrl,
        detail: t('approvals.executing'),
        time: action.updated_at ?? action.approved_at ?? action.created_at,
      }));
    const workRows = group.workItems
      .filter(workItemInProgress)
      .map((workItem) => ({
        id: workItem.id,
        status: workItem.status,
        capabilityLabel: t('approvals.agentCheck'),
        targetType: workItem.source_object_type ?? group.targetType,
        targetRef: workItem.source_object_ref ?? group.targetRef,
        targetUrl: group.targetUrl,
        // "Agent working…" only when the agent actually holds the item; a queued item's
        // status chip already reads "Waiting to start" and must not be contradicted.
        detail: ['leased', 'running'].includes(workItem.status) ? t('approvals.agentWorking') : null,
        time: workItem.updated_at ?? workItem.created_at,
      }));
    return [...actionRows, ...workRows];
  });
}

function buildAttentionRows(groups: TicketWorkGroup[], t: ReturnType<typeof useTranslation>['t']): CompactRow[] {
  return groups.flatMap((group) => {
    const actionRows = group.pendingActions
      .filter(actionNeedsAttention)
      .map((action) => ({
        id: action.id,
        status: action.status,
        capabilityLabel: actionLabel(action),
        targetType: action.target_type ?? group.targetType,
        targetRef: action.target_ref ?? group.targetRef,
        targetUrl: group.targetUrl,
        detail: null,
        time: action.updated_at ?? action.created_at,
        caption: actionAttentionMessage(action),
        traceRunId: action.run_id ?? group.latestRunId,
      }));
    const workRows = group.workItems
      .filter(workItemNeedsAttention)
      .map((workItem) => ({
        id: workItem.id,
        status: workItem.status,
        capabilityLabel: t('approvals.agentCheck'),
        targetType: workItem.source_object_type ?? group.targetType,
        targetRef: workItem.source_object_ref ?? group.targetRef,
        targetUrl: group.targetUrl,
        detail: null,
        time: workItem.updated_at ?? workItem.created_at,
        caption: workItemAttentionMessage(workItem),
        traceRunId: workItem.last_run_id ?? group.latestRunId,
      }));
    return [...actionRows, ...workRows];
  });
}

function buildFinishedRows(groups: TicketWorkGroup[], t: ReturnType<typeof useTranslation>['t']): CompactRow[] {
  const rows = groups.flatMap((group) => {
    const actionRows = group.pendingActions.map((action) => ({
      id: action.id,
      status: action.status,
      capabilityLabel: actionLabel(action),
      targetType: action.target_type ?? group.targetType,
      targetRef: action.target_ref ?? group.targetRef,
      targetUrl: group.targetUrl,
      detail: null,
      time: actionFinishedTime(action),
    }));
    if (actionRows.length > 0) return actionRows;
    return group.workItems
      .filter((workItem) => ['completed', 'skipped'].includes(workItem.status))
      .map((workItem) => ({
        id: workItem.id,
        status: workItem.status,
        capabilityLabel: t('approvals.agentCheck'),
        targetType: workItem.source_object_type ?? group.targetType,
        targetRef: workItem.source_object_ref ?? group.targetRef,
        targetUrl: group.targetUrl,
        detail: null,
        time: workItem.updated_at ?? workItem.created_at,
      }));
  });
  return rows.sort((left, right) => {
    const leftTime = Date.parse(left.time ?? '');
    const rightTime = Date.parse(right.time ?? '');
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

export default function AgentsApprovalsPage({ agentKey }: { agentKey?: string }) {
  const { t } = useTranslation(['agents']);
  const locale = useLocale();
  const data = useAgentControlData();
  const [rejectGroup, setRejectGroup] = React.useState<TicketWorkGroup | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [terminalApproval, setTerminalApproval] = React.useState<TerminalApprovalRequest>(null);
  const [terminalApprovalReason, setTerminalApprovalReason] = React.useState('');
  const [finishedOpen, setFinishedOpen] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(FINISHED_OPEN_STORAGE_KEY) === 'true';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FINISHED_OPEN_STORAGE_KEY, String(finishedOpen));
    }
  }, [finishedOpen]);
  React.useEffect(() => {
    if (rejectGroup) setRejectReason('');
  }, [rejectGroup]);
  React.useEffect(() => {
    if (terminalApproval) setTerminalApprovalReason('');
  }, [terminalApproval]);

  const agentDefinition = React.useMemo(() => (
    agentKey ? data.queueQuery.data?.definitions.find((definition) => definition.agent_key === agentKey) ?? null : null
  ), [agentKey, data.queueQuery.data]);
  const grouped = React.useMemo(
    () => buildTicketGroups(data.queueQuery.data ?? null, data.actionPool, agentDefinition?.id ?? null, Date.now()),
    [agentDefinition?.id, data.actionPool, data.queueQuery.data],
  );

  const needsDecisionGroups = React.useMemo(() => grouped.groups.filter((group) => group.lifecycle === 'needs_decision'), [grouped.groups]);
  const inProgressRows = React.useMemo(() => buildInProgressRows(grouped.groups.filter((group) => group.lifecycle === 'in_progress'), t), [grouped.groups, t]);
  const attentionRows = React.useMemo(() => buildAttentionRows(grouped.groups.filter((group) => group.lifecycle === 'needs_attention'), t), [grouped.groups, t]);
  const finishedRows = React.useMemo(() => buildFinishedRows(grouped.groups.filter((group) => group.lifecycle === 'finished'), t), [grouped.groups, t]);
  const visibleFinishedRows = finishedRows.slice(0, FINISHED_ROW_LIMIT);
  const hiddenFinishedCount = Math.max(0, finishedRows.length - visibleFinishedRows.length);
  const loading = data.queueQuery.isLoading || data.actionsQuery.isLoading;

  const approveAll = (group: TicketWorkGroup, reason?: string | null) => {
    data.approveAllMutation.mutate({ key: group.key, actions: group.pendingActions, reason });
  };
  const rejectAll = (group: TicketWorkGroup, reason?: string | null) => {
    data.rejectAllMutation.mutate({ key: group.key, actions: group.pendingActions, reason }, {
      onSettled: () => setRejectGroup(null),
    });
  };
  const handleApprove = (action: AiAgentControlActionRequest, group: TicketWorkGroup) => {
    if (actionIsTerminalStatus(action)) {
      setTerminalApproval({ group, actions: [action], mode: 'single' });
      return;
    }
    data.approveMutation.mutate({ action });
  };
  const handleApproveAll = (group: TicketWorkGroup) => {
    const executableActions = group.pendingActions.filter(actionCanExecute);
    if (executableActions.some(actionIsTerminalStatus)) {
      setTerminalApproval({ group, actions: group.pendingActions, mode: 'bulk' });
      return;
    }
    approveAll(group);
  };
  const confirmTerminalApproval = () => {
    if (!terminalApproval) return;
    if (terminalApproval.mode === 'single') {
      const [action] = terminalApproval.actions;
      if (action) {
        data.approveMutation.mutate({ action, reason: terminalApprovalReason }, { onSettled: () => setTerminalApproval(null) });
      }
      return;
    }
    data.approveAllMutation.mutate({ key: terminalApproval.group.key, actions: terminalApproval.actions, reason: terminalApprovalReason }, {
      onSettled: () => setTerminalApproval(null),
    });
  };

  const terminalActions = terminalApproval?.actions.filter(actionIsTerminalStatus) ?? [];
  const terminalBusy = terminalApproval?.mode === 'bulk'
    ? data.busyTicketKey === terminalApproval.group.key
    : !!terminalApproval?.actions[0] && data.busyActionId === terminalApproval.actions[0].id;

  return (
    <Box sx={{ p: agentKey ? 0 : 2 }}>
      {!agentKey && (
        <>
          <PageHeader title={t('approvals.title')} />
          <Typography sx={(theme) => ({ color: theme.palette.kanap.text.secondary, fontSize: 13, fontWeight: 400, mb: 2 })}>{t('approvals.subtitle')}</Typography>
        </>
      )}
      <Stack spacing={2}>
        {data.error && <Alert severity="error" onClose={() => data.setError(null)}>{data.error}</Alert>}
        {data.message && <Alert severity="success" onClose={() => data.setMessage(null)}>{data.message}</Alert>}

        <Section title={t('approvals.needsDecision')} count={needsDecisionGroups.length}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>
          ) : needsDecisionGroups.length === 0 ? (
            <EmptyState>{t('approvals.emptyDecision')}</EmptyState>
          ) : (
            <Stack divider={<Divider flexItem sx={{ borderColor: 'kanap.border.soft' }} />}>
              {needsDecisionGroups.map((group) => (
                <DecisionGroup
                  key={group.key}
                  group={group}
                  locale={locale}
                  busyTicketKey={data.busyTicketKey}
                  busyActionId={data.busyActionId}
                  onApprove={handleApprove}
                  onReject={(action) => data.rejectMutation.mutate({ action })}
                  onApproveAll={handleApproveAll}
                  onRejectAll={setRejectGroup}
                />
              ))}
            </Stack>
          )}
        </Section>

        <Section title={t('approvals.inProgress')} count={inProgressRows.length}>
          {loading ? (
            <EmptyState>{t('approvals.loading')}</EmptyState>
          ) : inProgressRows.length === 0 ? (
            <EmptyState>{t('approvals.emptyInProgress')}</EmptyState>
          ) : (
            <Stack>
              {inProgressRows.map((row) => <CompactLifecycleRow key={row.id} row={row} locale={locale} />)}
            </Stack>
          )}
        </Section>

        <Section title={t('approvals.needsAttention')} count={attentionRows.length}>
          {loading ? (
            <EmptyState>{t('approvals.loading')}</EmptyState>
          ) : attentionRows.length === 0 ? (
            <EmptyState>{t('approvals.emptyAttention')}</EmptyState>
          ) : (
            <Stack>
              {attentionRows.map((row) => <CompactLifecycleRow key={row.id} row={row} locale={locale} />)}
            </Stack>
          )}
        </Section>

        <Section
          title={t('approvals.recentlyFinished')}
          count={finishedRows.length}
          collapsible
          open={finishedOpen}
          onToggle={() => setFinishedOpen((current) => !current)}
        >
          {visibleFinishedRows.length === 0 ? (
            <EmptyState>{t('approvals.emptyFinished')}</EmptyState>
          ) : (
            <Stack>
              {visibleFinishedRows.map((row) => <CompactLifecycleRow key={row.id} row={row} locale={locale} timeMode="absolute" />)}
              {hiddenFinishedCount > 0 && (
                <Typography sx={(theme) => ({ color: theme.palette.kanap.text.tertiary, fontSize: 12, fontWeight: 400, px: 1.5, py: 0.75 })}>
                  {t('approvals.moreFinished', { count: hiddenFinishedCount })}
                </Typography>
              )}
            </Stack>
          )}
        </Section>

        <KanapDialog
          open={!!rejectGroup}
          title={t('approvals.rejectAllTitle')}
          onClose={() => setRejectGroup(null)}
          onSave={() => { if (rejectGroup) rejectAll(rejectGroup, rejectReason); }}
          saveLabel={t('approvals.rejectAll')}
          saveColor="error"
          saveLoading={!!rejectGroup && data.busyTicketKey === rejectGroup.key}
        >
          <Stack spacing={1.25}>
            <Typography sx={(theme) => ({ color: theme.palette.kanap.text.secondary, fontSize: 13, fontWeight: 400 })}>
              {t('approvals.rejectAllConfirm', {
                count: rejectGroup?.pendingActions.filter(actionCanReject).length ?? 0,
                target: rejectGroup ? groupTargetText(rejectGroup) : '',
              })}
            </Typography>
            <ApprovalReasonField value={rejectReason} onChange={setRejectReason} />
          </Stack>
        </KanapDialog>

        <KanapDialog
          open={!!terminalApproval}
          title={terminalApproval?.mode === 'bulk' ? t('approvals.terminalConfirmTitleMany') : t('approvals.terminalConfirmTitle')}
          onClose={() => setTerminalApproval(null)}
          onSave={confirmTerminalApproval}
          saveLabel={t('approvals.applyAnyway')}
          saveColor="error"
          saveLoading={terminalBusy}
        >
          <Stack spacing={1.25}>
            <Typography sx={(theme) => ({ color: theme.palette.kanap.text.secondary, fontSize: 13, fontWeight: 400 })}>
              {terminalApproval?.mode === 'bulk'
                ? t('approvals.terminalConfirmBodyMany', {
                  count: terminalActions.length,
                  target: terminalApproval ? groupTargetText(terminalApproval.group) : '',
                })
                : t('approvals.terminalConfirmBody', {
                  action: terminalActions[0] ? actionLabel(terminalActions[0]) : '',
                  target: terminalApproval ? groupTargetText(terminalApproval.group) : '',
                })}
            </Typography>
            {terminalActions.length > 0 && (
              <Stack spacing={0.5}>
                <Typography sx={(theme) => ({ color: theme.palette.kanap.text.tertiary, fontSize: 12, fontWeight: 500 })}>
                  {t('approvals.terminalActionList')}
                </Typography>
                {terminalActions.map((action) => (
                  <Typography key={action.id} sx={(theme) => ({ color: theme.palette.kanap.text.primary, fontSize: 13, fontWeight: 400 })}>
                    {actionLabel(action)}
                  </Typography>
                ))}
              </Stack>
            )}
            <ApprovalReasonField value={terminalApprovalReason} onChange={setTerminalApprovalReason} />
          </Stack>
        </KanapDialog>
      </Stack>
    </Box>
  );
}
