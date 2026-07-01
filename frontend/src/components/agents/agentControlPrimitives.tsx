import React from 'react';
import { Box, Button, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import KanapDialog from '../design/KanapDialog';
import { type AutosaveStatus } from '../../hooks/useAutosave';
import {
  type AiAgentControlActionRequest,
  type AiAgentControlHelpdeskSummary,
  type AiAgentControlQueueOverview,
  type AiAgentControlTargetState,
  type AiAgentControlWorkItem,
} from '../../ai/aiApi';
import i18n from '../../i18n';
import { getDotColor } from '../../utils/statusColors';

export const HELP_DESK_AGENT_KEY = 'helpdesk.glpi.triage';
export const INTERNAL_NOTE_CAPABILITY = 'ticketing.ticket.internal_note.add_approved';
export const PUBLIC_REPLY_CAPABILITY = 'ticketing.ticket.public_reply.add_approved';
export const CLASSIFICATION_UPDATE_CAPABILITY = 'ticketing.ticket.classification_update.approved';
export const STATUS_UPDATE_CAPABILITY = 'ticketing.ticket.status_update.approved';
export const ASSIGNMENT_UPDATE_CAPABILITY = 'ticketing.ticket.assignment_update.approved';
export const PARTICIPANT_UPDATE_CAPABILITY = 'ticketing.ticket.participant_update.approved';

const HELPDESK_PROPOSAL_CAPABILITIES = new Set([
  INTERNAL_NOTE_CAPABILITY,
  PUBLIC_REPLY_CAPABILITY,
  CLASSIFICATION_UPDATE_CAPABILITY,
  STATUS_UPDATE_CAPABILITY,
  ASSIGNMENT_UPDATE_CAPABILITY,
  PARTICIPANT_UPDATE_CAPABILITY,
]);

const STATUS_COLORS: Record<string, string> = {
  approved: 'success',
  completed: 'success',
  dead_letter: 'error',
  executing: 'info',
  executed: 'success',
  failed: 'error',
  leased: 'info',
  pending: 'warning',
  provider_error: 'warning',
  queued: 'info',
  ready: 'success',
  rejected: 'error',
  running: 'info',
  skipped: 'default',
  unavailable: 'warning',
  warning: 'warning',
  waiting_approval: 'warning',
};

export type TicketWorkGroup = {
  key: string;
  targetRef: string;
  workItem: AiAgentControlWorkItem | null;
  workItems: AiAgentControlWorkItem[];
  historyWorkItems: AiAgentControlWorkItem[];
  targetState: AiAgentControlTargetState | null;
  pendingActions: AiAgentControlActionRequest[];
  latestRunId: string | null;
  queueStatus: string;
  updatedAt: string | null;
  active: boolean;
};

export type TicketGroupBuildResult = {
  groups: TicketWorkGroup[];
  orphanActions: AiAgentControlActionRequest[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// The agent a proposal belongs to, read from its execution metadata (same key the
// backend scopes activity/evaluation by). Null when an action carries no agent tag.
export function actionAgentDefinitionId(action: AiAgentControlActionRequest): string | null {
  const metadata = isRecord(action.metadata_json) ? action.metadata_json : null;
  const id = metadata?.agent_definition_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function agentText(key: string, defaultValue: string, options?: Record<string, unknown>): string {
  return String(i18n.t(`agents:${key}`, { defaultValue, ...(options ?? {}) }));
}

export function humanize(value: string | null | undefined): string {
  if (!value) return agentText('common.notSet', 'Not set');
  return value.replace(/_/g, ' ');
}

// Plain-language label for an internal status enum. Falls back to a de-underscored
// rendering for any status without a dedicated translation, so primary surfaces never
// show raw enums like "waiting_approval" or "dead_letter".
export function statusLabel(status: string | null | undefined): string {
  if (!status) return agentText('common.notSet', 'Not set');
  return agentText(`status.${status}`, humanize(status));
}

// Shared lifecycle-state key for an agent (fleet card + monitor header), resolved to a
// plain-language string by the caller via t(`lifecycle.${key}`).
export function lifecycleStatusKey(
  status: string,
  watching: boolean,
  automaticCount: number,
  paused: boolean,
): string {
  if (paused) return 'paused';
  if (status === 'draft') return 'notStarted';
  if (status === 'disabled') return 'off';
  if (status === 'archived') return 'archived';
  if (!watching) return 'testing';
  return automaticCount > 0 ? 'watchingAutomatic' : 'watchingAskFirst';
}

// Resolve the per-agent helpdesk evaluation summary for the agent currently in
// view. Both the Monitor and Performance tabs MUST go through this so they never
// drift onto the singular `helpdesk.summary` (which the backend always binds to
// the built-in triage agent, not the agent being viewed). See agentic-control-plane issue #1.
export function resolveAgentSummary(
  overview: AiAgentControlQueueOverview | null | undefined,
  agentKey: string | null | undefined,
): AiAgentControlHelpdeskSummary | null {
  if (!overview || !agentKey) return null;
  const definition = overview.definitions?.find((item) => item.agent_key === agentKey) ?? null;
  if (!definition) return null;
  const summaries = overview.helpdesk?.summaries ?? [];
  return summaries.find((item) => item.agentDefinitionId === definition.id)
    ?? (overview.helpdesk?.summary?.agentDefinitionId === definition.id ? overview.helpdesk.summary : null);
}

export function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return agentText('common.notSet', 'Not set');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return agentText('common.notSet', 'Not set');
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return agentText('common.notEnoughData', 'Not enough data');
  return `${Math.round(value * 100)}%`;
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return agentText('common.notSet', 'Not set');
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

export function statusColor(status: string | null | undefined): string {
  return STATUS_COLORS[status ?? ''] ?? 'default';
}

// A terminal status proposal (close/solve) — a destructive cleanup action that
// must be surfaced distinctly from an ordinary status move and always approved.
export function actionIsTerminalStatus(action: AiAgentControlActionRequest): boolean {
  if (!action.capability_name.includes('status_update')) return false;
  const payload = isRecord(action.action_payload_json) ? action.action_payload_json : null;
  const meta = isRecord(action.metadata_json) ? action.metadata_json : null;
  if (payload?.terminal === true || meta?.terminal === true) return true;
  const target = String(payload?.targetStatus ?? payload?.transitionKey ?? '').toLowerCase();
  return target === 'closed' || target === 'solved';
}

export function actionLabel(action: AiAgentControlActionRequest): string {
  if (action.capability_name === INTERNAL_NOTE_CAPABILITY) return agentText('actions.internalNote', 'Internal note');
  if (action.capability_name === PUBLIC_REPLY_CAPABILITY) return agentText('actions.requesterReply', 'Requester reply');
  if (action.capability_name === CLASSIFICATION_UPDATE_CAPABILITY) return agentText('actions.classification', 'Classification');
  if (actionIsTerminalStatus(action)) {
    const target = String((isRecord(action.action_payload_json) ? action.action_payload_json.targetStatus : '') ?? '').toLowerCase();
    return target === 'solved' ? agentText('actions.solveTicket', 'Solve ticket') : agentText('actions.closeTicket', 'Close ticket');
  }
  if (action.capability_name === STATUS_UPDATE_CAPABILITY) return agentText('actions.status', 'Status');
  if (action.capability_name === ASSIGNMENT_UPDATE_CAPABILITY) return agentText('actions.assignment', 'Assignment');
  if (action.capability_name === PARTICIPANT_UPDATE_CAPABILITY) return agentText('actions.participants', 'Participants');
  return humanize(action.capability_name.split('.').slice(-2).join(' '));
}

export function actionBody(action: AiAgentControlActionRequest | null | undefined): string | null {
  const payload = isRecord(action?.action_payload_json) ? action.action_payload_json : null;
  const fields = action?.capability_name === INTERNAL_NOTE_CAPABILITY
    ? ['note_body', 'body']
    : action?.capability_name === PUBLIC_REPLY_CAPABILITY
      ? ['reply_body', 'body']
      : ['body', 'note_body', 'reply_body'];
  const body = fields
    .map((field) => {
      const value = payload?.[field];
      return typeof value === 'string' ? value.trim() : null;
    })
    .find((candidate): candidate is string => !!candidate && candidate.length > 0) ?? null;
  return body && body.length > 0 ? body : null;
}

export function actionUpdateSummary(action: AiAgentControlActionRequest): string | null {
  const payload = isRecord(action.action_payload_json) ? action.action_payload_json : null;
  if (!payload) return null;
  const reason = typeof payload.reason === 'string' && payload.reason.trim().length > 0
    ? payload.reason.trim()
    : null;
  const current = isRecord(payload.current) ? payload.current : null;
  if (action.capability_name === CLASSIFICATION_UPDATE_CAPABILITY) {
    const proposed = isRecord(payload.proposed) ? payload.proposed : null;
    const lines = Object.entries(proposed ?? {})
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([key, value]) => `- ${humanize(key)}: ${humanize(String(current?.[key] ?? agentText('common.notSet', 'Not set')))} -> ${humanize(String(value))}`);
    return lines.length > 0
      ? [agentText('actions.classificationUpdate', 'Classification update'), ...lines, reason ? `${agentText('actions.reason', 'Reason')}: ${reason}` : null].filter(Boolean).join('\n')
      : null;
  }
  if (action.capability_name === STATUS_UPDATE_CAPABILITY) {
    const currentStatus = String(current?.statusLabel ?? current?.status ?? agentText('common.notSet', 'Not set'));
    const target = String(payload.targetStatusLabel ?? payload.targetStatus ?? payload.transitionKey ?? agentText('common.notSet', 'Not set'));
    return [agentText('actions.statusUpdate', 'Status update'), `- ${agentText('actions.status', 'Status')}: ${humanize(currentStatus)} -> ${humanize(target)}`, reason ? `${agentText('actions.reason', 'Reason')}: ${reason}` : null].filter(Boolean).join('\n');
  }
  return null;
}

export function actionUpdatesBody(actions: AiAgentControlActionRequest[]): string | null {
  const body = actions.map(actionUpdateSummary).filter((entry): entry is string => !!entry).join('\n\n');
  return body.length > 0 ? body : null;
}

export function actionCanReject(action: AiAgentControlActionRequest): boolean {
  if (action.status === 'executing') return false;
  return action.execution_readiness?.can_reject ?? (action.status === 'pending' || action.status === 'approved');
}

export function actionCanExecute(action: AiAgentControlActionRequest): boolean {
  if (action.status === 'executing') return false;
  return action.execution_readiness?.can_execute ?? (action.status === 'pending' || action.status === 'approved');
}

export function actionBlockedReason(action: AiAgentControlActionRequest): string | null {
  return action.execution_readiness?.blocked_reason ?? null;
}

function activeWorkItemStatus(status: string | null | undefined): boolean {
  return ['queued', 'leased', 'running', 'waiting_approval', 'failed', 'dead_letter'].includes(status ?? '');
}

function activeActionStatus(status: string | null | undefined): boolean {
  return ['pending', 'approved', 'executing'].includes(status ?? '');
}

function isHelpdeskProposalAction(action: AiAgentControlActionRequest): boolean {
  return HELPDESK_PROPOSAL_CAPABILITIES.has(action.capability_name);
}

function actionMatchesTicketReview(
  action: AiAgentControlActionRequest,
  input: { targetRef: string; workItemId: string | null; runId: string | null },
): boolean {
  if (!isHelpdeskProposalAction(action)) return false;
  if (action.target_ref !== input.targetRef && action.target_id !== input.targetRef) return false;
  const metadata = isRecord(action.metadata_json) ? action.metadata_json : null;
  if (input.workItemId && metadata?.agent_work_item_id === input.workItemId) return true;
  return !!input.runId && action.run_id === input.runId;
}

function workItemSortWeight(status: string | null | undefined): number {
  const weight: Record<string, number> = {
    waiting_approval: 0,
    failed: 1,
    dead_letter: 2,
    running: 3,
    leased: 4,
    queued: 5,
    completed: 6,
    skipped: 7,
  };
  return weight[status ?? ''] ?? 20;
}

function workItemSortTime(workItem: AiAgentControlWorkItem): number {
  const value = Date.parse(workItem.updated_at ?? workItem.created_at ?? '');
  return Number.isFinite(value) ? value : 0;
}

export function buildTicketGroups(
  overview: AiAgentControlQueueOverview | null,
  actionRequests: AiAgentControlActionRequest[],
  agentDefinitionId?: string | null,
): TicketGroupBuildResult {
  const targetStates = overview?.target_states ?? [];
  const stateByTarget = new Map<string, AiAgentControlTargetState>();
  for (const state of targetStates) {
    stateByTarget.set(`${state.provider_kind}:${state.provider_key}:${state.target_type}:${state.target_ref}`, state);
  }

  // Agent scoping: a ticket touched by several agents must not bleed one agent's
  // proposals into another's view. Keep only this agent's work items, and drop
  // actions explicitly tagged for a different agent (untagged actions are kept and
  // attach only via this agent's work-item/run linkage). See agentic-control-plane #1 (Approvals).
  const scopedActions = agentDefinitionId
    ? actionRequests.filter((action) => {
      const owner = actionAgentDefinitionId(action);
      return owner == null || owner === agentDefinitionId;
    })
    : actionRequests;

  const actionById = new Map(scopedActions.map((action) => [action.id, action]));
  const usedActionIds = new Set<string>();
  const workItemsByTarget = new Map<string, AiAgentControlWorkItem[]>();
  for (const workItem of overview?.work_items ?? []) {
    if (agentDefinitionId && workItem.agent_definition_id !== agentDefinitionId) continue;
    const key = `${workItem.source_provider_kind}:${workItem.source_provider_key}:${workItem.source_object_type}:${workItem.source_object_ref}`;
    const items = workItemsByTarget.get(key) ?? [];
    items.push(workItem);
    workItemsByTarget.set(key, items);
  }

  const groups: TicketWorkGroup[] = [];
  for (const [stateKey, workItems] of workItemsByTarget.entries()) {
    const sortedWorkItems = [...workItems].sort((left, right) => {
      const statusDiff = workItemSortWeight(left.status) - workItemSortWeight(right.status);
      if (statusDiff !== 0) return statusDiff;
      return workItemSortTime(right) - workItemSortTime(left);
    });
    const workItem = sortedWorkItems.find((item) => activeWorkItemStatus(item.status)) ?? sortedWorkItems[0] ?? null;
    const targetState = stateByTarget.get(stateKey) ?? null;
    const targetRef = workItem?.source_object_ref ?? targetState?.target_ref ?? 'unknown';
    const latestRunId = workItem?.last_run_id ?? targetState?.last_run_id ?? null;
    const stateJson = isRecord(targetState?.state_json) ? targetState.state_json : null;
    const stateActionIds = Array.isArray(stateJson?.latest_action_request_ids)
      ? stateJson.latest_action_request_ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
    const actionIds = new Set<string>([
      ...(workItem?.last_action_request_ids ?? []),
      ...(workItem?.last_action_request_ids?.length ? [] : stateActionIds),
    ]);
    const actions = Array.from(actionIds)
      .map((id) => actionById.get(id) ?? null)
      .filter((action): action is AiAgentControlActionRequest => !!action);
    for (const action of scopedActions) {
      if (actionIds.has(action.id)) continue;
      if (actionMatchesTicketReview(action, { targetRef, workItemId: workItem?.id ?? null, runId: latestRunId })) {
        actions.push(action);
        actionIds.add(action.id);
      }
    }
    actions.forEach((action) => usedActionIds.add(action.id));
    groups.push({
      key: stateKey,
      targetRef,
      workItem,
      workItems: sortedWorkItems,
      historyWorkItems: sortedWorkItems.filter((item) => item.id !== workItem?.id),
      targetState,
      pendingActions: actions,
      latestRunId: latestRunId ?? actions[0]?.run_id ?? null,
      queueStatus: workItem?.status ?? 'pending',
      updatedAt: workItem?.updated_at ?? targetState?.updated_at ?? actions[0]?.updated_at ?? actions[0]?.created_at ?? null,
      active: activeWorkItemStatus(workItem?.status) || actions.some((action) => activeActionStatus(action.status)),
    });
  }

  const sortedGroups = groups.sort((left, right) => {
    const statusDiff = workItemSortWeight(left.queueStatus) - workItemSortWeight(right.queueStatus);
    if (statusDiff !== 0) return statusDiff;
    const leftTime = Date.parse(left.updatedAt ?? '');
    const rightTime = Date.parse(right.updatedAt ?? '');
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
  const orphanActions = scopedActions.filter((action) => !usedActionIds.has(action.id));
  return { groups: sortedGroups, orphanActions };
}

export function StatusText({ status }: { status: string }) {
  const theme = useTheme();
  const dotColor = getDotColor(statusColor(status), theme.palette.mode);
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dotColor, flex: '0 0 auto' }} />
      <Typography variant="body2" sx={{ color: dotColor, minWidth: 0 }}>
        {statusLabel(status)}
      </Typography>
    </Stack>
  );
}

export function Section({ title, actions, children, id }: { title: string; actions?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <Box id={id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', minWidth: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={500}>{title}</Typography>
        {actions}
      </Stack>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

export function MetricBlock({ label, value, status }: { label: string; value: React.ReactNode; status?: string }) {
  return (
    <Box sx={{ minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', px: 1.25, py: 0.9 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        {status ? <StatusText status={status} /> : null}
      </Stack>
      <Typography variant="h6" sx={{ mt: 0.25, lineHeight: 1.25 }}>{value}</Typography>
    </Box>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>{children}</Typography>;
}

export function ActionButtons({
  action,
  busy,
  onApprove,
  onReject,
}: {
  action: AiAgentControlActionRequest;
  busy: boolean;
  onApprove: (action: AiAgentControlActionRequest) => void;
  onReject: (action: AiAgentControlActionRequest) => void;
}) {
  const { t } = useTranslation(['agents']);
  const canExecute = actionCanExecute(action);
  const canReject = actionCanReject(action);
  const blockedReason = actionBlockedReason(action);
  const executeLabel = action.status === 'approved' ? t('actions.execute') : t('actions.approve');
  return (
    <Stack direction="row" justifyContent="flex-end" spacing={0.75} flexWrap="wrap" useFlexGap>
      <Tooltip title={blockedReason ?? executeLabel}>
        <span>
          <Button size="small" variant="contained" disabled={busy || !canExecute} onClick={(event) => { event.stopPropagation(); onApprove(action); }}>
            {executeLabel}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={t('actions.reject')}>
        <span>
          <Button size="small" variant="outlined" color="inherit" disabled={busy || !canReject} onClick={(event) => { event.stopPropagation(); onReject(action); }}>
            {t('actions.reject')}
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
}

// Reason-capture confirmation dialog (replaces window.prompt for emergency pause).
// Uses KanapDialog so it respects tenant branding and the design system.
export function ReasonDialog({
  open,
  title,
  description,
  label,
  placeholder,
  busy,
  saveLabel,
  saveColor = 'error',
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  busy?: boolean;
  saveLabel: string;
  saveColor?: 'error' | 'primary';
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState('');
  React.useEffect(() => {
    if (open) setReason('');
  }, [open]);
  return (
    <KanapDialog
      open={open}
      title={title}
      onClose={onClose}
      onSave={() => {
        const trimmed = reason.trim();
        if (trimmed) onSubmit(trimmed);
      }}
      saveLabel={saveLabel}
      saveColor={saveColor}
      saveDisabled={!reason.trim() || !!busy}
      saveLoading={!!busy}
    >
      <Stack spacing={1.5}>
        {description ? <Typography variant="body2" color="text.secondary">{description}</Typography> : null}
        <SettingsField label={label}>
          <TextField
            multiline
            minRows={2}
            fullWidth
            size="small"
            value={reason}
            placeholder={placeholder}
            onChange={(event) => setReason(event.target.value)}
          />
        </SettingsField>
      </Stack>
    </KanapDialog>
  );
}

// Subtle per-section autosave indicator for a Section header `actions` slot:
// "Saving…" while the debounced PATCH is pending/in flight, "Saved" for ~1.5s
// after success, then hidden. Replaces explicit Save buttons (KANAP charter).
export function SaveIndicator({ status }: { status: AutosaveStatus }) {
  const { t } = useTranslation(['agents']);
  if (status === 'idle') return null;
  const label = status === 'error'
    ? t('settings.saveFailed')
    : status === 'saved'
      ? t('settings.saved')
      : t('settings.saving');
  return (
    <Typography variant="caption" color={status === 'error' ? 'error' : 'text.secondary'} aria-live="polite">
      {label}
    </Typography>
  );
}

export function SettingsField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.25 }}>{label}</Typography>
      {children}
      {hint && <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25, opacity: 0.85 }}>{hint}</Typography>}
    </Box>
  );
}
