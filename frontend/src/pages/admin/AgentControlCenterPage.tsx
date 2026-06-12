import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import KanapDialog from '../../components/design/KanapDialog';
import {
  aiAgentControlApi,
  type AiAgentControlActionRequest,
  type AiAgentControlAgentDefinition,
  type AiAgentControlAuditEvent,
  type AiAgentControlEmergencyPause,
  type AiAgentControlGlpiReadTargetsResult,
  type AiAgentControlHelpdeskContextResult,
  type AiAgentControlHelpdeskIngestionSettings,
  type AiAgentControlHelpdeskIngestionSettingsInput,
  type AiAgentControlHelpdeskSummary,
  type AiAgentControlLiveTarget,
  type AiAgentControlQueueOverview,
  type AiAgentControlRunDetail,
  type AiAgentControlRunItem,
  type AiAgentControlTargetState,
  type AiAgentControlWorkItem,
} from '../../ai/aiApi';
import { useLocale } from '../../i18n/useLocale';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { getDotColor } from '../../utils/statusColors';

const HELP_DESK_AGENT_KEY = 'helpdesk.glpi.triage';
const INTERNAL_NOTE_CAPABILITY = 'ticketing.ticket.internal_note.add_approved';
const PUBLIC_REPLY_CAPABILITY = 'ticketing.ticket.public_reply.add_approved';
const CLASSIFICATION_UPDATE_CAPABILITY = 'ticketing.ticket.classification_update.approved';
const STATUS_UPDATE_CAPABILITY = 'ticketing.ticket.status_update.approved';
const ASSIGNMENT_UPDATE_CAPABILITY = 'ticketing.ticket.assignment_update.approved';
const PARTICIPANT_UPDATE_CAPABILITY = 'ticketing.ticket.participant_update.approved';
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

type TicketWorkGroup = {
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

type TicketGroupBuildResult = {
  groups: TicketWorkGroup[];
  orphanActions: AiAgentControlActionRequest[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Not set';
  return value.replace(/_/g, ' ');
}

function shortId(value: string | null | undefined): string {
  if (!value) return 'Not set';
  return value.length > 8 ? value.slice(0, 8) : value;
}

function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not enough data';
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not set';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

function statusColor(status: string | null | undefined): string {
  return STATUS_COLORS[status ?? ''] ?? 'default';
}

function actionLabel(action: AiAgentControlActionRequest): string {
  if (action.capability_name === INTERNAL_NOTE_CAPABILITY) return 'Internal note';
  if (action.capability_name === PUBLIC_REPLY_CAPABILITY) return 'Requester reply';
  if (action.capability_name === CLASSIFICATION_UPDATE_CAPABILITY) return 'Classification';
  if (action.capability_name === STATUS_UPDATE_CAPABILITY) return 'Status';
  if (action.capability_name === ASSIGNMENT_UPDATE_CAPABILITY) return 'Assignment';
  if (action.capability_name === PARTICIPANT_UPDATE_CAPABILITY) return 'Participants';
  return humanize(action.capability_name.split('.').slice(-2).join(' '));
}

function actionBody(action: AiAgentControlActionRequest | null | undefined): string | null {
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

function actionUpdateSummary(action: AiAgentControlActionRequest): string | null {
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
      .map(([key, value]) => `- ${humanize(key)}: ${humanize(String(current?.[key] ?? 'not set'))} -> ${humanize(String(value))}`);
    return lines.length > 0
      ? [`Classification update`, ...lines, reason ? `Reason: ${reason}` : null].filter(Boolean).join('\n')
      : null;
  }
  if (action.capability_name === STATUS_UPDATE_CAPABILITY) {
    const currentStatus = String(current?.statusLabel ?? current?.status ?? 'not set');
    const target = String(payload.targetStatusLabel ?? payload.targetStatus ?? payload.transitionKey ?? 'not set');
    return [`Status update`, `- Status: ${humanize(currentStatus)} -> ${humanize(target)}`, reason ? `Reason: ${reason}` : null].filter(Boolean).join('\n');
  }
  if (action.capability_name === ASSIGNMENT_UPDATE_CAPABILITY) {
    const target = isRecord(payload.target) ? payload.target : null;
    const currentAssignee = String(current?.assignee ?? current?.group ?? 'unassigned');
    const targetLabel = String(target?.label ?? target?.key ?? 'not set');
    return [`Assignment update`, `- Assignment: ${currentAssignee} -> ${targetLabel}`, reason ? `Reason: ${reason}` : null].filter(Boolean).join('\n');
  }
  if (action.capability_name === PARTICIPANT_UPDATE_CAPABILITY) {
    const operation = String(payload.operation ?? 'participant update');
    const participants = Array.isArray(payload.participants)
      ? payload.participants.filter(isRecord).map((entry) => String(entry.label ?? entry.key ?? '')).filter(Boolean)
      : [];
    return [`Participants update`, `- Operation: ${humanize(operation)}`, participants.length > 0 ? `- Participants: ${participants.join(', ')}` : null, reason ? `Reason: ${reason}` : null].filter(Boolean).join('\n');
  }
  return null;
}

function actionUpdatesBody(actions: AiAgentControlActionRequest[]): string | null {
  const body = actions
    .map(actionUpdateSummary)
    .filter((entry): entry is string => !!entry)
    .join('\n\n');
  return body.length > 0 ? body : null;
}

function adapterData(value: unknown): Record<string, unknown> | null {
  return isRecord(value) && value.ok === true && isRecord(value.data) ? value.data : null;
}

function adapterWarnings(value: unknown): string[] {
  if (!isRecord(value)) return [];
  if (Array.isArray(value.warnings)) {
    return value.warnings.filter((entry): entry is string => typeof entry === 'string');
  }
  const data = isRecord(value.data) ? value.data : null;
  return Array.isArray(data?.warnings)
    ? data.warnings.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function adapterError(value: unknown): string | null {
  if (!isRecord(value) || value.ok !== false) return null;
  return typeof value.message === 'string' ? value.message : 'Provider context read failed.';
}

function stringValue(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function stringArray(record: Record<string, unknown> | null, key: string): string[] {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function numberValue(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function recordValue(record: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  const value = record?.[key];
  return isRecord(value) ? value : null;
}

function recordArray(record: Record<string, unknown> | null, key: string): Record<string, unknown>[] {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function conversationGateForGroup(group: TicketWorkGroup): Record<string, unknown> | null {
  const workMetadata = isRecord(group.workItem?.metadata_json) ? group.workItem.metadata_json : null;
  const state = isRecord(group.targetState?.state_json) ? group.targetState.state_json : null;
  return recordValue(workMetadata, 'conversation_gate') ?? recordValue(state, 'conversation_gate');
}

function knowledgeMetadataForGroup(
  group: TicketWorkGroup,
  detail: AiAgentControlRunDetail | undefined,
): Record<string, unknown> | null {
  const state = isRecord(group.targetState?.state_json) ? group.targetState.state_json : null;
  const workMetadata = isRecord(group.workItem?.metadata_json) ? group.workItem.metadata_json : null;
  const recommendationMetadata = detail?.recommendations
    ?.map((recommendation) => recommendation.metadata_json)
    .find(isRecord) ?? null;
  return {
    ...(state ?? {}),
    ...(workMetadata ?? {}),
    ...(recommendationMetadata ?? {}),
  };
}

function actionEvidenceCount(actions: AiAgentControlActionRequest[]): number {
  const ids = new Set<string>();
  for (const action of actions) {
    for (const id of action.evidence_ids ?? []) {
      ids.add(id);
    }
  }
  return ids.size;
}

function actionCanReject(action: AiAgentControlActionRequest): boolean {
  return action.execution_readiness?.can_reject ?? (action.status === 'pending' || action.status === 'approved');
}

function actionCanExecute(action: AiAgentControlActionRequest): boolean {
  return action.execution_readiness?.can_execute ?? (action.status === 'pending' || action.status === 'approved');
}

function actionBlockedReason(action: AiAgentControlActionRequest): string | null {
  return action.execution_readiness?.blocked_reason ?? null;
}

function activeWorkItemStatus(status: string | null | undefined): boolean {
  return ['queued', 'leased', 'running', 'waiting_approval', 'failed', 'dead_letter'].includes(status ?? '');
}

function isHelpdeskProposalAction(action: AiAgentControlActionRequest): boolean {
  return HELPDESK_PROPOSAL_CAPABILITIES.has(action.capability_name);
}

function actionMatchesTicketReview(
  action: AiAgentControlActionRequest,
  input: {
    targetRef: string;
    workItemId: string | null;
    runId: string | null;
  },
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

function buildTicketGroups(
  overview: AiAgentControlQueueOverview | null,
  actionRequests: AiAgentControlActionRequest[],
): TicketGroupBuildResult {
  const targetStates = overview?.target_states ?? [];
  const stateByTarget = new Map<string, AiAgentControlTargetState>();
  for (const state of targetStates) {
    stateByTarget.set(`${state.provider_kind}:${state.provider_key}:${state.target_type}:${state.target_ref}`, state);
  }

  const actionById = new Map(actionRequests.map((action) => [action.id, action]));
  const usedActionIds = new Set<string>();
  const workItemsByTarget = new Map<string, AiAgentControlWorkItem[]>();
  for (const workItem of overview?.work_items ?? []) {
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
    for (const action of actionRequests) {
      if (actionIds.has(action.id)) continue;
      if (actionMatchesTicketReview(action, {
        targetRef,
        workItemId: workItem?.id ?? null,
        runId: latestRunId,
      })) {
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
      active: activeWorkItemStatus(workItem?.status) || actions.some((action) => actionCanReject(action)),
    });
  }

  const sortedGroups = groups.sort((left, right) => {
    const statusDiff = workItemSortWeight(left.queueStatus) - workItemSortWeight(right.queueStatus);
    if (statusDiff !== 0) return statusDiff;
    const leftTime = Date.parse(left.updatedAt ?? '');
    const rightTime = Date.parse(right.updatedAt ?? '');
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
  const orphanActions = actionRequests.filter((action) => !usedActionIds.has(action.id));
  return { groups: sortedGroups, orphanActions };
}

function StatusText({ status }: { status: string }) {
  const theme = useTheme();
  const dotColor = getDotColor(statusColor(status), theme.palette.mode);
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        aria-hidden
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: dotColor,
          flex: '0 0 auto',
        }}
      />
      <Typography variant="body2" sx={{ color: dotColor, minWidth: 0 }}>
        {humanize(status)}
      </Typography>
    </Stack>
  );
}

function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        minWidth: 0,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          gap: 1,
        }}
      >
        <Typography variant="subtitle2" fontWeight={500}>
          {title}
        </Typography>
        {actions}
      </Stack>
      <Box sx={{ minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}

function MetricBlock({ label, value, status }: { label: string; value: React.ReactNode; status?: string }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        px: 1.25,
        py: 0.9,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        {status ? <StatusText status={status} /> : null}
      </Stack>
      <Typography variant="h6" sx={{ mt: 0.25, lineHeight: 1.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  if (!value) {
    return <Typography variant="body2" color="text.secondary">Not set</Typography>;
  }
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        maxHeight: 220,
        overflow: 'auto',
        p: 1,
        borderRadius: 1,
        bgcolor: 'kanap.bg.composer',
        border: '1px solid',
        borderColor: 'divider',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
      {children}
    </Typography>
  );
}

function ActionButtons({
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
  const canExecute = actionCanExecute(action);
  const canReject = actionCanReject(action);
  const blockedReason = actionBlockedReason(action);
  const executeLabel = action.status === 'approved' ? 'Execute' : 'Approve & execute';
  return (
    <Stack direction="row" justifyContent="flex-end" spacing={0.75} flexWrap="wrap" useFlexGap>
      <Tooltip title={blockedReason ?? executeLabel}>
        <span>
          <Button
            size="small"
            variant="contained"
            disabled={busy || !canExecute}
            onClick={(event) => {
              event.stopPropagation();
              onApprove(action);
            }}
          >
            {executeLabel}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Reject">
        <span>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            disabled={busy || !canReject}
            onClick={(event) => {
              event.stopPropagation();
              onReject(action);
            }}
          >
            Reject
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
}

function ProposalBody({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string | null;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
        {icon}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Stack>
      <Box
        sx={{
          minHeight: 116,
          maxHeight: 180,
          overflow: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'kanap.bg.composer',
          px: 1,
          py: 0.85,
        }}
      >
        {body ? (
          <Typography
            component="pre"
            sx={{
              m: 0,
              fontFamily: 'inherit',
              fontSize: '0.8125rem',
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {body}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">No active proposal.</Typography>
        )}
      </Box>
    </Box>
  );
}

function SettingsField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      {children}
      {hint && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25, opacity: 0.85 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

type HelpdeskSettingsFormState = {
  enabled: boolean;
  entityId: string;
  categoryId: string;
  maxTicketsPerCycle: string;
  maxProviderRequestsPerCycle: string;
  hardBackfillHorizonHours: string;
  perRunTokens: string;
  perRunCostEur: string;
  dailyRuns: string;
  dailyTokens: string;
  dailyCostEur: string;
};

function settingsToFormState(settings: AiAgentControlHelpdeskIngestionSettings | null): HelpdeskSettingsFormState {
  return {
    enabled: settings?.ingestion.enabled ?? false,
    entityId: settings?.ingestion.entityId ?? '',
    categoryId: settings?.ingestion.categoryId ?? '',
    maxTicketsPerCycle: settings?.ingestion.maxTicketsPerCycle != null ? String(settings.ingestion.maxTicketsPerCycle) : '',
    maxProviderRequestsPerCycle: settings?.ingestion.maxProviderRequestsPerCycle != null ? String(settings.ingestion.maxProviderRequestsPerCycle) : '',
    hardBackfillHorizonHours: settings?.ingestion.hardBackfillHorizonHours != null ? String(settings.ingestion.hardBackfillHorizonHours) : '',
    perRunTokens: settings?.guardrails.perRun.maxEstimatedTokens != null ? String(settings.guardrails.perRun.maxEstimatedTokens) : '',
    perRunCostEur: settings?.guardrails.perRun.maxEstimatedCostEur != null ? String(settings.guardrails.perRun.maxEstimatedCostEur) : '',
    dailyRuns: settings?.guardrails.daily.maxAgentRuns != null ? String(settings.guardrails.daily.maxAgentRuns) : '',
    dailyTokens: settings?.guardrails.daily.maxEstimatedTokens != null ? String(settings.guardrails.daily.maxEstimatedTokens) : '',
    dailyCostEur: settings?.guardrails.daily.maxEstimatedCostEur != null ? String(settings.guardrails.daily.maxEstimatedCostEur) : '',
  };
}

function parseOptionalNumber(value: string, label: string, errors: string[]): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push(`${label} must be a positive number.`);
    return null;
  }
  return parsed;
}

function HelpdeskAgentSettingsDialog({
  open,
  settings,
  saving,
  saveError,
  locale,
  onClose,
  onSave,
}: {
  open: boolean;
  settings: AiAgentControlHelpdeskIngestionSettings | null;
  saving: boolean;
  saveError: string | null;
  locale: string;
  onClose: () => void;
  onSave: (payload: AiAgentControlHelpdeskIngestionSettingsInput) => void;
}) {
  const [form, setForm] = React.useState<HelpdeskSettingsFormState>(() => settingsToFormState(settings));
  const [formError, setFormError] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  // Seed the form when the dialog opens, and keep following server state only
  // until the user edits something. Background refetches (window refocus,
  // query invalidation) must never silently reset in-progress edits.
  React.useEffect(() => {
    if (!open) {
      setDirty(false);
      return;
    }
    if (!dirty) {
      setForm(settingsToFormState(settings));
      setFormError(null);
    }
  }, [open, settings, dirty]);

  const setField = (field: keyof HelpdeskSettingsFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setDirty(true);
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSave = () => {
    const errors: string[] = [];
    const payload: AiAgentControlHelpdeskIngestionSettingsInput = {
      ingestion: {
        enabled: form.enabled,
        entityId: form.entityId.trim() || null,
        categoryId: form.categoryId.trim() || null,
        maxTicketsPerCycle: parseOptionalNumber(form.maxTicketsPerCycle, 'Max tickets per cycle', errors),
        maxProviderRequestsPerCycle: parseOptionalNumber(form.maxProviderRequestsPerCycle, 'Max provider requests per cycle', errors),
        hardBackfillHorizonHours: parseOptionalNumber(form.hardBackfillHorizonHours, 'Backfill horizon hours', errors),
      },
      guardrails: {
        perRun: {
          maxEstimatedTokens: parseOptionalNumber(form.perRunTokens, 'Per-run token cap', errors),
          maxEstimatedCostEur: parseOptionalNumber(form.perRunCostEur, 'Per-run cost cap', errors),
        },
        daily: {
          maxAgentRuns: parseOptionalNumber(form.dailyRuns, 'Daily run cap', errors),
          maxEstimatedTokens: parseOptionalNumber(form.dailyTokens, 'Daily token cap', errors),
          maxEstimatedCostEur: parseOptionalNumber(form.dailyCostEur, 'Daily cost cap', errors),
        },
      },
    };
    if (errors.length > 0) {
      setFormError(errors.join(' '));
      return;
    }
    setFormError(null);
    onSave(payload);
  };

  const fieldSx = { '& .MuiInputBase-input': { fontSize: 13, py: 0.75 } } as const;

  return (
    <KanapDialog
      open={open}
      title="Helpdesk GLPI agent settings"
      onClose={onClose}
      onSave={handleSave}
      saveLabel={form.enabled ? 'Save and start watching' : 'Save'}
      saveLoading={saving}
    >
      <Stack spacing={2.25}>
        {(formError || saveError) && <Alert severity="error">{formError || saveError}</Alert>}
        {settings && !settings.ingestion.ready && settings.ingestion.enabled && (
          <Alert severity="warning">{settings.ingestion.readyReason}</Alert>
        )}

        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch
            size="small"
            checked={form.enabled}
            onChange={(event) => {
              setDirty(true);
              const enabled = event.target.checked;
              setForm((current) => ({ ...current, enabled }));
            }}
          />
          <Box>
            <Typography variant="body2">Watch GLPI for new tickets automatically</Typography>
            <Typography variant="caption" color="text.secondary">
              The agent checks GLPI every 5 minutes for newly created tickets in the scope below, triages them,
              and prepares draft replies and updates. Nothing is sent or changed in GLPI without your approval.
            </Typography>
          </Box>
        </Stack>

        <Box>
          <Typography variant="body2" sx={{ mb: 0.25 }}>Which tickets the agent watches</Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
            Both filters are optional. Leave them empty to watch all new tickets; if you fill in both,
            a ticket must match both. The agent only looks back as far as the catch-up window below —
            older tickets are never picked up.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField
              label="GLPI entity (numeric id)"
              hint="Limits the agent to one GLPI entity (organization unit). Find the id in GLPI under Administration → Entities — it is the number shown in the entity's URL."
            >
              <TextField fullWidth size="small" value={form.entityId} onChange={setField('entityId')} placeholder="e.g., 12" sx={fieldSx} />
            </SettingsField>
            <SettingsField
              label="GLPI category (numeric id)"
              hint="Limits the agent to one ITIL category. Find the id in GLPI under Setup → Dropdowns → ITIL categories — the number in the category's URL."
            >
              <TextField fullWidth size="small" value={form.categoryId} onChange={setField('categoryId')} placeholder="e.g., 31" sx={fieldSx} />
            </SettingsField>
          </Box>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ mb: 0.25 }}>Pace</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField
              label="New tickets handled per check (1-20)"
              hint="Each 5-minute check picks up at most this many new tickets. Anything beyond waits for the next check."
            >
              <TextField fullWidth size="small" value={form.maxTicketsPerCycle} onChange={setField('maxTicketsPerCycle')} placeholder="5" sx={fieldSx} />
            </SettingsField>
            <SettingsField
              label="GLPI API calls per check (1-100)"
              hint="Safety limit on how many requests one check may send to your GLPI server. The default is fine for most setups."
            >
              <TextField fullWidth size="small" value={form.maxProviderRequestsPerCycle} onChange={setField('maxProviderRequestsPerCycle')} placeholder="10" sx={fieldSx} />
            </SettingsField>
            <SettingsField
              label="Catch-up window (hours)"
              hint="How far back the agent looks for tickets to pick up — e.g., 72 means tickets from the last 3 days. Older tickets are never touched, and each ticket is only processed once."
            >
              <TextField fullWidth size="small" value={form.hardBackfillHorizonHours} onChange={setField('hardBackfillHorizonHours')} placeholder="24" sx={fieldSx} />
            </SettingsField>
          </Box>
        </Box>
        {settings?.ingestion.enabled && settings.ingestion.effectiveCreatedAfter && (
          <Typography variant="caption" color="text.secondary">
            Currently picking up tickets created after {formatDateTime(settings.ingestion.effectiveCreatedAfter, locale)} (rolling window).
          </Typography>
        )}

        <Divider />

        <Box>
          <Typography variant="body2" sx={{ mb: 0.25 }}>Spending limits</Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
            Hard limits on AI usage. A triage that exceeds its per-ticket limit is stopped and marked failed.
            When a daily limit is reached, the agent pauses until the next day (UTC) — pending tickets stay queued
            and resume automatically. Token amounts are conservative estimates, not exact provider counts.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <SettingsField label="Max tokens per ticket triage">
              <TextField fullWidth size="small" value={form.perRunTokens} onChange={setField('perRunTokens')} placeholder="40000" sx={fieldSx} />
            </SettingsField>
            <SettingsField label="Max cost per ticket triage (EUR)">
              <TextField fullWidth size="small" value={form.perRunCostEur} onChange={setField('perRunCostEur')} placeholder="1" sx={fieldSx} />
            </SettingsField>
            <SettingsField label="Max triage runs per day">
              <TextField fullWidth size="small" value={form.dailyRuns} onChange={setField('dailyRuns')} placeholder="25" sx={fieldSx} />
            </SettingsField>
            <SettingsField label="Max tokens per day">
              <TextField fullWidth size="small" value={form.dailyTokens} onChange={setField('dailyTokens')} placeholder="500000" sx={fieldSx} />
            </SettingsField>
            <SettingsField label="Max cost per day (EUR)">
              <TextField fullWidth size="small" value={form.dailyCostEur} onChange={setField('dailyCostEur')} placeholder="10" sx={fieldSx} />
            </SettingsField>
          </Box>
        </Box>
      </Stack>
    </KanapDialog>
  );
}

function EmergencyPauseDialog({
  open,
  saving,
  saveError,
  onClose,
  onActivate,
}: {
  open: boolean;
  saving: boolean;
  saveError: string | null;
  onClose: () => void;
  onActivate: (payload: { reason: string; expires_in_minutes: number | null }) => void;
}) {
  const [reason, setReason] = React.useState('');
  const [expiresInMinutes, setExpiresInMinutes] = React.useState('');
  React.useEffect(() => {
    if (open) {
      setReason('');
      setExpiresInMinutes('');
    }
  }, [open]);

  const parsedExpiry = Number(expiresInMinutes.trim());
  const expiry = expiresInMinutes.trim() && Number.isFinite(parsedExpiry) && parsedExpiry > 0
    ? Math.floor(parsedExpiry)
    : null;

  return (
    <KanapDialog
      open={open}
      title="Activate emergency pause"
      onClose={onClose}
      onSave={() => onActivate({ reason: reason.trim(), expires_in_minutes: expiry })}
      saveLabel="Activate pause"
      saveColor="error"
      saveDisabled={!reason.trim()}
      saveLoading={saving}
    >
      <Stack spacing={2}>
        {saveError && <Alert severity="error">{saveError}</Alert>}
        <Typography variant="body2" color="text.secondary">
          Pausing suspends all agent activity for this tenant: scheduled polling stops and capability execution is blocked
          until the pause is lifted. Queued work items and pending proposals are kept.
        </Typography>
        <SettingsField label="Reason (required, audited)">
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g., GLPI maintenance window"
          />
        </SettingsField>
        <SettingsField label="Auto-expire after (minutes, optional)">
          <TextField
            fullWidth
            size="small"
            value={expiresInMinutes}
            onChange={(event) => setExpiresInMinutes(event.target.value)}
            placeholder="e.g., 120"
          />
        </SettingsField>
      </Stack>
    </KanapDialog>
  );
}

function AgentSummary({
  definition,
  summary,
  auditEvents,
  loading,
  locale,
  pollBusy,
  onPoll,
  activePause,
  pauseBusy,
  onOpenSettings,
  onActivatePause,
  onLiftPause,
}: {
  definition: AiAgentControlAgentDefinition | null;
  summary: AiAgentControlHelpdeskSummary | null;
  auditEvents: AiAgentControlAuditEvent[];
  loading: boolean;
  locale: string;
  pollBusy: boolean;
  onPoll: () => void;
  activePause: AiAgentControlEmergencyPause | null;
  pauseBusy: boolean;
  onOpenSettings: () => void;
  onActivatePause: () => void;
  onLiftPause: () => void;
}) {
  if (loading) {
    return (
      <Section title="Helpdesk GLPI triage agent">
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      </Section>
    );
  }
  return (
    <Section
      title="Helpdesk GLPI triage agent"
      actions={definition ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <StatusText status={definition.status} />
          {activePause ? (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={pauseBusy ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
              onClick={onLiftPause}
              disabled={pauseBusy}
            >
              Lift pause
            </Button>
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<PauseCircleOutlineIcon />}
              onClick={onActivatePause}
              disabled={pauseBusy}
            >
              Pause
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<SettingsOutlinedIcon />}
            onClick={onOpenSettings}
          >
            Settings
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={pollBusy ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={onPoll}
            disabled={pollBusy || !!activePause}
          >
            Poll
          </Button>
        </Stack>
      ) : undefined}
    >
      {definition ? (
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          {activePause && (
            <Alert severity="warning">
              Emergency pause active since {formatDateTime(activePause.created_at ?? '', locale)}: {activePause.reason}
              {activePause.expires_at ? ` (auto-expires ${formatDateTime(activePause.expires_at, locale)})` : ''}
            </Alert>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.4fr repeat(4, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600}>{definition.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {definition.agent_key}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">Mode</Typography>
              <Typography variant="body2">
                {summary?.ingestion.enabled ? 'Watching new GLPI tickets' : 'Manual tickets only'}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">Automatic watch</Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Chip
                  size="small"
                  label={summary?.ingestion.paused ? 'Paused' : summary?.ingestion.enabled ? 'Active' : 'Off'}
                  color={summary?.ingestion.paused ? 'warning' : summary?.ingestion.enabled ? 'success' : 'default'}
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  {summary?.ingestion.lastPollAt ? formatDateTime(summary.ingestion.lastPollAt, locale) : 'Never'}
                </Typography>
              </Stack>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">Daily cap</Typography>
              <Typography variant="body2">
                {summary?.guardrails.daily
                  ? `${summary.guardrails.daily.runs}/${summary.guardrails.daily.cap.maxRuns} runs`
                  : 'Not configured'}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">Spend</Typography>
              <Typography variant="body2">
                {summary?.guardrails.daily
                  ? `${formatNumber(summary.guardrails.daily.estimatedTokens)} tokens / EUR ${formatNumber(summary.guardrails.daily.estimatedCostEur, 4)}`
                  : 'Not configured'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
              gap: 1,
            }}
          >
            <MetricBlock label="Acceptance rate" value={formatPercent(summary?.evaluation.acceptanceRate)} status="completed" />
            <MetricBlock label="Median approval" value={summary?.evaluation.medianApprovalLatencySeconds != null ? `${summary.evaluation.medianApprovalLatencySeconds}s` : 'Not enough data'} status="completed" />
            <MetricBlock label="KB hit rate" value={formatPercent(summary?.evaluation.kbHitRate)} status="completed" />
            <MetricBlock label="Runs/ticket" value={summary?.evaluation.runsPerTicket != null ? formatNumber(summary.evaluation.runsPerTicket, 2) : 'Not enough data'} status="completed" />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">Watched GLPI scope</Typography>
              <Typography variant="body2">
                Entity {summary?.ingestion.entityId ?? 'any'} · Category {summary?.ingestion.categoryId ?? 'any'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {summary?.ingestion.createdAfter
                  ? `Tickets created after ${formatDateTime(summary.ingestion.createdAfter, locale)}`
                  : 'Not watching automatically'}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">Proposal outcomes</Typography>
              <Typography variant="body2">
                {Object.entries(summary?.evaluation.terminalByStatus ?? {})
                  .map(([status, count]) => `${humanize(status)} ${count}`)
                  .join(' · ') || 'No terminal outcomes yet'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Object.entries(summary?.evaluation.proposalsByActionClass ?? {})
                  .map(([actionClass, count]) => `${humanize(actionClass)} ${count}`)
                  .join(' · ') || 'No proposals in the window'}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">Recent poll audit</Typography>
              {auditEvents.length > 0 ? (
                <Stack spacing={0.5}>
                  {auditEvents.slice(0, 2).map((event) => (
                    <Typography key={event.id} variant="body2" color={event.severity === 'error' ? 'error.main' : 'text.secondary'}>
                      {formatDateTime(event.created_at, locale)} · {humanize(event.event_type)}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No audit events yet.</Typography>
              )}
            </Box>
          </Box>
        </Stack>
      ) : (
        <EmptyState>No Helpdesk GLPI triage definition yet.</EmptyState>
      )}
    </Section>
  );
}

function EvidenceSummary({
  group,
  detail,
}: {
  group: TicketWorkGroup;
  detail: AiAgentControlRunDetail | undefined;
}) {
  const metadata = knowledgeMetadataForGroup(group, detail);
  const knowledgeCount = typeof metadata?.knowledge_result_count === 'number' ? metadata.knowledge_result_count : null;
  const candidateCount = typeof metadata?.knowledge_candidate_count === 'number' ? metadata.knowledge_candidate_count : null;
  const knowledgeQuery = stringValue(metadata, 'knowledge_query');
  const plan = recordValue(metadata, 'knowledge_search_plan');
  const interpretation = recordValue(metadata, 'knowledge_result_interpretation');
  const attempts = recordArray(metadata, 'knowledge_query_attempts');
  const candidates = recordArray(metadata, 'knowledge_candidates');
  const intent = stringValue(plan, 'intent');
  const planSource = stringValue(plan, 'source');
  const selectedRefs = stringArray(interpretation, 'selected_refs');
  const rejected = recordArray(interpretation, 'rejected');
  const evidenceCount = actionEvidenceCount(group.pendingActions);
  const evidence = detail?.evidence?.slice(0, 3) ?? [];

  return (
    <Stack spacing={0.85}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <SourceOutlinedIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          KB / evidence
        </Typography>
        {planSource ? <Chip size="small" variant="outlined" label={humanize(planSource)} /> : null}
      </Stack>
      <Typography variant="body2">
        {knowledgeCount == null
          ? 'Knowledge result count not recorded.'
          : `${knowledgeCount} selected / ${candidateCount ?? 'n/a'} candidate(s).`}
      </Typography>
      {intent ? (
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
          Intent: {intent}
        </Typography>
      ) : null}
      {selectedRefs.length > 0 || rejected.length > 0 ? (
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          {selectedRefs.map((ref) => (
            <Chip key={`selected-${ref}`} size="small" color="success" variant="outlined" label={`Selected ${ref}`} />
          ))}
          {rejected.slice(0, 2).map((entry, index) => {
            const ref = stringValue(entry, 'ref') ?? `#${index + 1}`;
            return <Chip key={`rejected-${ref}-${index}`} size="small" color="warning" variant="outlined" label={`Rejected ${ref}`} />;
          })}
        </Stack>
      ) : null}
      <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
        Selected query: {knowledgeQuery ?? 'Not set'} / Evidence refs: {evidenceCount}
      </Typography>
      {attempts.length > 0 ? (
        <Stack spacing={0.35}>
          {attempts.slice(0, 5).map((attempt, index) => {
            const query = stringValue(attempt, 'query') ?? 'unknown';
            const resultCount = numberValue(attempt, 'result_count') ?? 0;
            return (
              <Typography key={`${query}-${index}`} variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {resultCount} hit{resultCount === 1 ? '' : 's'} / {query}
              </Typography>
            );
          })}
          {attempts.length > 5 ? (
            <Typography variant="caption" color="text.secondary">
              +{attempts.length - 5} more search attempt{attempts.length - 5 === 1 ? '' : 's'} in audit.
            </Typography>
          ) : null}
        </Stack>
      ) : candidates.length > 0 ? (
        <Stack spacing={0.35}>
          {candidates.slice(0, 3).map((candidate, index) => (
            <Typography key={`${stringValue(candidate, 'ref') ?? index}`} variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
              {stringValue(candidate, 'ref') ?? 'Document'} / {stringValue(candidate, 'title') ?? 'Untitled'}
            </Typography>
          ))}
        </Stack>
      ) : null}
      {evidence.length > 0 ? (
        <Stack spacing={0.4}>
          {evidence.map((item) => (
            <Typography key={item.id} variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
              {item.source_provider} / {item.source_object_type}: {item.summary}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

function TicketWorkItemCockpit({
  title,
  emptyState,
  groups,
  selectedKey,
  selectedDetail,
  locale,
  loading,
  busyActionId,
  busyTicketKey,
  onSelect,
  onOpenRun,
  onApprove,
  onReject,
  onRejectAll,
  onApproveAll,
}: {
  title: string;
  emptyState: string;
  groups: TicketWorkGroup[];
  selectedKey: string | null;
  selectedDetail: AiAgentControlRunDetail | undefined;
  locale: string;
  loading: boolean;
  busyActionId: string | null;
  busyTicketKey: string | null;
  onSelect: (group: TicketWorkGroup) => void;
  onOpenRun: (id: string) => void;
  onApprove: (action: AiAgentControlActionRequest) => void;
  onReject: (action: AiAgentControlActionRequest) => void;
  onRejectAll: (group: TicketWorkGroup) => void;
  onApproveAll: (group: TicketWorkGroup) => void;
}) {
  if (loading) {
    return (
      <Section title={title}>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={24} />
        </Box>
      </Section>
    );
  }

  return (
    <Section title={title}>
      {groups.length === 0 ? (
        <EmptyState>{emptyState}</EmptyState>
      ) : (
        <Stack divider={<Divider flexItem />}>
          {groups.map((group) => {
            const isSelected = selectedKey === group.key;
            const internalAction = group.pendingActions.find((action) => action.capability_name === INTERNAL_NOTE_CAPABILITY) ?? null;
            const publicAction = group.pendingActions.find((action) => action.capability_name === PUBLIC_REPLY_CAPABILITY) ?? null;
            const ticketUpdateActions = group.pendingActions.filter((action) =>
              action.capability_name === CLASSIFICATION_UPDATE_CAPABILITY
              || action.capability_name === STATUS_UPDATE_CAPABILITY
              || action.capability_name === ASSIGNMENT_UPDATE_CAPABILITY
              || action.capability_name === PARTICIPANT_UPDATE_CAPABILITY,
            );
            const rejectableActions = group.pendingActions.filter(actionCanReject);
            const executableActions = group.pendingActions.filter(actionCanExecute);
            const blockers = group.pendingActions
              .map((action) => ({ action, reason: actionBlockedReason(action) }))
              .filter((entry): entry is { action: AiAgentControlActionRequest; reason: string } => !!entry.reason);
            const queueError = typeof group.workItem?.last_error === 'string' && group.workItem.last_error.trim().length > 0
              ? group.workItem.last_error.trim()
              : null;
            const conversationGate = conversationGateForGroup(group);
            const requesterAt = stringValue(conversationGate, 'latest_requester_message_at');
            const requesterSource = stringValue(conversationGate, 'requester_classification_confidence');
            const historyCount = numberValue(conversationGate, 'ticket_history_entry_count');
            const preparedAt = stringValue(conversationGate, 'prepared_at');
            return (
              <Box
                key={group.key}
                sx={(theme) => ({
                  p: 1.5,
                  bgcolor: isSelected ? theme.palette.kanap.bg.composer : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: theme.palette.kanap.bg.composer },
                })}
                onClick={() => onSelect(group)}
              >
                <Stack spacing={1.25}>
                  <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} alignItems={{ xs: 'flex-start', lg: 'center' }} justifyContent="space-between">
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                          GLPI #{group.targetRef}
                        </Typography>
                        <StatusText status={group.queueStatus} />
                        <Chip size="small" variant="outlined" label={humanize(group.workItem?.work_kind ?? 'ticket_triage')} />
                        <Chip size="small" variant="outlined" label={`${group.workItems.length} work item${group.workItems.length === 1 ? '' : 's'}`} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Latest run {shortId(group.latestRunId)} / Updated {formatDateTime(group.updatedAt, locale)}
                      </Typography>
                      {conversationGate ? (
                        <Typography variant="caption" color="text.secondary">
                          Requester signal {requesterAt ? formatDateTime(requesterAt, locale) : 'not found'}
                          {' '} / Source {humanize(requesterSource ?? 'unknown')}
                          {' '} / History {historyCount ?? 'n/a'}
                          {preparedAt ? ` / Prepared ${formatDateTime(preparedAt, locale)}` : ''}
                        </Typography>
                      ) : null}
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                      {group.pendingActions.map((action) => (
                        <Stack key={action.id} direction={{ xs: 'column', sm: 'row' }} spacing={0.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                          <Chip size="small" label={`${actionLabel(action)} / ${humanize(action.status)}`} />
                          <ActionButtons
                            action={action}
                            busy={busyActionId === action.id}
                            onApprove={onApprove}
                            onReject={onReject}
                          />
                        </Stack>
                      ))}
                      {executableActions.length > 1 ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          disabled={busyTicketKey === group.key}
                          onClick={(event) => {
                            event.stopPropagation();
                            onApproveAll(group);
                          }}
                        >
                          Approve all
                        </Button>
                      ) : null}
                      {rejectableActions.length > 1 ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          disabled={busyTicketKey === group.key}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRejectAll(group);
                          }}
                        >
                          Reject all
                        </Button>
                      ) : null}
                      <Tooltip title="Open latest run audit">
                        <span>
                          <IconButton
                            size="small"
                            disabled={!group.latestRunId}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (group.latestRunId) onOpenRun(group.latestRunId);
                            }}
                            aria-label="Open latest run audit"
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  {blockers.length > 0 ? (
                    <Alert severity="warning" sx={{ py: 0.5 }}>
                      {blockers.map(({ action, reason }) => `${actionLabel(action)}: ${reason}`).join(' ')}
                    </Alert>
                  ) : null}

                  {['failed', 'dead_letter'].includes(group.queueStatus) ? (
                    <Alert severity="error" sx={{ py: 0.5 }}>
                      {queueError ?? 'Triage failed before creating a reviewable action request.'}
                    </Alert>
                  ) : null}

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(260px, 0.75fr)' },
                      gap: 1.25,
                    }}
                  >
                    <ProposalBody
                      icon={<ForumOutlinedIcon fontSize="small" color="action" />}
                      title="Public requester reply proposal"
                      body={actionBody(publicAction)}
                    />
                    <ProposalBody
                      icon={<NotesOutlinedIcon fontSize="small" color="action" />}
                      title="Internal note proposal"
                      body={actionBody(internalAction)}
                    />
                    <ProposalBody
                      icon={<ManageSearchOutlinedIcon fontSize="small" color="action" />}
                      title="Ticket update proposals"
                      body={actionUpdatesBody(ticketUpdateActions)}
                    />
                    <EvidenceSummary group={group} detail={isSelected ? selectedDetail : undefined} />
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Section>
  );
}

function TicketHistoryPanel({
  groups,
  showHistory,
  locale,
  onToggle,
  onSelect,
  onOpenRun,
}: {
  groups: TicketWorkGroup[];
  showHistory: boolean;
  locale: string;
  onToggle: () => void;
  onSelect: (group: TicketWorkGroup) => void;
  onOpenRun: (id: string) => void;
}) {
  const rows = groups.flatMap((group) => group.workItems
    .filter((item) => !group.active || item.id !== group.workItem?.id)
    .map((workItem) => ({ group, workItem })));

  return (
    <Section
      title="Review history"
      actions={(
        <Button size="small" variant="outlined" onClick={onToggle}>
          {showHistory ? 'Hide history' : 'Show history'}
        </Button>
      )}
    >
      {!showHistory ? (
        <EmptyState>{rows.length} resolved or superseded work item{rows.length === 1 ? '' : 's'} hidden.</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>No resolved or superseded work items.</EmptyState>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ticket</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Work item</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Audit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ group, workItem }) => (
              <TableRow
                key={workItem.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onSelect(group)}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>GLPI #{group.targetRef}</Typography>
                </TableCell>
                <TableCell><StatusText status={workItem.status} /></TableCell>
                <TableCell>
                  <Typography variant="body2">{humanize(workItem.work_kind)}</Typography>
                  <Typography variant="caption" color="text.secondary">{shortId(workItem.id)}</Typography>
                </TableCell>
                <TableCell>{formatDateTime(workItem.updated_at, locale)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Open run audit">
                    <span>
                      <IconButton
                        size="small"
                        disabled={!workItem.last_run_id}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (workItem.last_run_id) onOpenRun(workItem.last_run_id);
                        }}
                        aria-label="Open run audit"
                      >
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function OrphanActionRequestsPanel({
  actions,
  locale,
  busyActionId,
  onApprove,
  onReject,
}: {
  actions: AiAgentControlActionRequest[];
  locale: string;
  busyActionId: string | null;
  onApprove: (action: AiAgentControlActionRequest) => void;
  onReject: (action: AiAgentControlActionRequest) => void;
}) {
  if (actions.length === 0) {
    return null;
  }
  return (
    <Accordion defaultExpanded={false}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Unlinked action requests ({actions.length})</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Decision</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {actions.map((action) => (
              <TableRow key={action.id} hover>
                <TableCell>
                  <Typography variant="body2">{actionLabel(action)}</Typography>
                  <Typography variant="caption" color="text.secondary">{shortId(action.run_id)}</Typography>
                </TableCell>
                <TableCell>{action.target_ref ?? action.target_id ?? 'unknown'}</TableCell>
                <TableCell>
                  <StatusText status={action.status} />
                  {actionBlockedReason(action) ? (
                    <Typography variant="caption" color="text.secondary">{actionBlockedReason(action)}</Typography>
                  ) : null}
                </TableCell>
                <TableCell>{formatDateTime(action.updated_at ?? action.created_at, locale)}</TableCell>
                <TableCell align="right">
                  <ActionButtons
                    action={action}
                    busy={busyActionId === action.id}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AccordionDetails>
    </Accordion>
  );
}

function ContextRow({ label, value }: { label: string; value: React.ReactNode }) {
  const displayValue = value == null || value === '' ? 'Not set' : value;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{displayValue}</Typography>
    </Box>
  );
}

function ContextBlock({
  title,
  output,
  children,
}: {
  title: string;
  output: unknown;
  children: (data: Record<string, unknown>) => React.ReactNode;
}) {
  const data = adapterData(output);
  const error = adapterError(output);
  const warnings = adapterWarnings(output);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Box sx={{ mt: 0.75 }}>
        {data ? children(data) : (
          <Typography variant="body2" color={error ? 'error.main' : 'text.secondary'}>
            {error ?? 'Context not loaded.'}
          </Typography>
        )}
      </Box>
      {warnings.length > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {warnings.map(humanize).join(', ')}
        </Typography>
      ) : null}
    </Box>
  );
}

function SelectedHelpdeskContext({
  group,
  contextResult,
  loading,
  errorMessage,
  locale,
}: {
  group: TicketWorkGroup | null;
  contextResult: AiAgentControlHelpdeskContextResult | undefined;
  loading: boolean;
  errorMessage: string | null;
  locale: string;
}) {
  return (
    <Section
      title="Selected ticket context"
      actions={group ? <Typography variant="caption" color="text.secondary">GLPI #{group.targetRef}</Typography> : undefined}
    >
      <Box sx={{ p: 1.5 }}>
        {!group ? (
          <EmptyState>Select a work item.</EmptyState>
        ) : loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        ) : errorMessage ? (
          <Alert severity="warning">{errorMessage}</Alert>
        ) : contextResult ? (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <StatusText status={contextResult.work_item.status} />
              <Typography variant="caption" color="text.secondary">
                Context run {shortId(contextResult.run_id)} / Last processed {formatDateTime(contextResult.target_state?.last_processed_external_updated_at, locale)}
              </Typography>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              <ContextBlock title="Classification" output={contextResult.classification.output}>
                {(data) => (
                  <Stack spacing={0.75}>
                    <ContextRow label="Category" value={stringValue(data, 'category')} />
                    <ContextRow label="Type" value={stringValue(data, 'type')} />
                    <ContextRow label="Priority / urgency" value={[stringValue(data, 'priority'), stringValue(data, 'urgency')].filter(Boolean).join(' / ')} />
                  </Stack>
                )}
              </ContextBlock>
              <ContextBlock title="Lifecycle" output={contextResult.lifecycle.output}>
                {(data) => {
                  const transitions = Array.isArray(data.allowedTransitions) ? data.allowedTransitions : [];
                  return (
                    <Stack spacing={0.75}>
                      <ContextRow label="Status" value={stringValue(data, 'statusLabel') ?? stringValue(data, 'status')} />
                      <ContextRow label="Terminal" value={data.terminal === true ? 'Yes' : 'No'} />
                      <ContextRow label="Proposable transitions" value={transitions.length} />
                    </Stack>
                  );
                }}
              </ContextBlock>
              <ContextBlock title="Routing" output={contextResult.routing.output}>
                {(data) => {
                  const targets = Array.isArray(data.supportedAssignmentTargets) ? data.supportedAssignmentTargets : [];
                  return (
                    <Stack spacing={0.75}>
                      <ContextRow label="Requester" value={stringValue(data, 'requester')} />
                      <ContextRow label="Current group" value={stringValue(data, 'group')} />
                      <ContextRow label="Assignment targets" value={targets.length} />
                    </Stack>
                  );
                }}
              </ContextBlock>
              <ContextBlock title="Participants" output={contextResult.participants.output}>
                {(data) => (
                  <Stack spacing={0.75}>
                    <ContextRow label="Requester" value={stringValue(data, 'requester')} />
                    <ContextRow label="Observers" value={stringArray(data, 'observers').join(', ')} />
                    <ContextRow label="Watchers" value={stringArray(data, 'watchers').join(', ')} />
                  </Stack>
                )}
              </ContextBlock>
            </Box>
          </Stack>
        ) : (
          <EmptyState>No context loaded for this work item.</EmptyState>
        )}
      </Box>
    </Section>
  );
}

function GlpiSafeTargetPanel({
  targetsResult,
  selectedTargetKey,
  activeTargetRefs,
  loading,
  readBusy,
  triageBusy,
  locale,
  onSelect,
  onRun,
  onTriage,
}: {
  targetsResult: AiAgentControlGlpiReadTargetsResult | null;
  selectedTargetKey: string | null;
  activeTargetRefs: string[];
  loading: boolean;
  readBusy: boolean;
  triageBusy: boolean;
  locale: string;
  onSelect: (targetKey: string) => void;
  onRun: (target: AiAgentControlLiveTarget) => void;
  onTriage: (target: AiAgentControlLiveTarget) => void;
}) {
  const targets = targetsResult?.items ?? [];
  const providerAvailable = targetsResult?.provider.available === true;
  const providerMessage = targetsResult?.provider.message || targetsResult?.provider.reason_code || null;
  const activeTargetRefSet = new Set(activeTargetRefs);

  return (
    <Section
      title="Manual safe-target GLPI triage"
      actions={<StatusText status={providerAvailable ? 'ready' : 'unavailable'} />}
    >
      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box sx={{ p: 1.5 }}>
          <Stack spacing={1.5}>
            {!providerAvailable && (
              <Alert severity="warning">
                {providerMessage || 'GLPI provider is not ready.'}
              </Alert>
            )}
            {targets.length === 0 ? (
              <EmptyState>No read-only GLPI target.</EmptyState>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Target</TableCell>
                    <TableCell>Ticket</TableCell>
                    <TableCell>Scope</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell align="right">Run</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {targets.map((target) => {
                    const hasActiveReview = activeTargetRefSet.has(target.external_ref);
                    return (
                      <TableRow
                        key={target.id}
                        hover
                        selected={target.target_key === selectedTargetKey}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => onSelect(target.target_key)}
                      >
                        <TableCell>
                          <Typography variant="body2">{target.target_key}</Typography>
                          <Typography variant="caption" color="text.secondary">{target.provider_key}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="body2">{target.external_ref}</Typography>
                            {hasActiveReview ? <Chip size="small" label="Active review" /> : null}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{humanize(target.target_kind)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{humanize(target.environment)}</Typography>
                          <Typography variant="caption" color="text.secondary">{humanize(target.safety_label)}</Typography>
                        </TableCell>
                        <TableCell>{formatDateTime(target.expires_at, locale)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={readBusy && target.target_key === selectedTargetKey ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                              disabled={readBusy || triageBusy || !providerAvailable}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelect(target.target_key);
                                onRun(target);
                              }}
                            >
                              Read
                            </Button>
                            <Tooltip title={hasActiveReview ? 'Resolve the active review before running triage again.' : 'Run triage'}>
                              <span>
                                <Button
                                  size="small"
                                  variant={target.target_key === selectedTargetKey ? 'contained' : 'outlined'}
                                  startIcon={triageBusy && target.target_key === selectedTargetKey ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                                  disabled={readBusy || triageBusy || !providerAvailable || hasActiveReview}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onSelect(target.target_key);
                                    onTriage(target);
                                  }}
                                >
                                  Triage
                                </Button>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Box>
      )}
    </Section>
  );
}

function RunsTable({
  runs,
  selectedRunId,
  locale,
  onSelect,
}: {
  runs: AiAgentControlRunItem[];
  selectedRunId: string | null;
  locale: string;
  onSelect: (id: string) => void;
}) {
  if (runs.length === 0) {
    return <EmptyState>No runs yet.</EmptyState>;
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Status</TableCell>
          <TableCell>Run</TableCell>
          <TableCell>Trigger</TableCell>
          <TableCell align="right">Actions</TableCell>
          <TableCell align="right">Open</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {runs.map((run) => (
          <TableRow
            key={run.id}
            hover
            selected={run.id === selectedRunId}
            sx={{ cursor: 'pointer' }}
            onClick={() => onSelect(run.id)}
          >
            <TableCell><StatusText status={run.status} /></TableCell>
            <TableCell>
              <Stack spacing={0.25}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{shortId(run.id)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(run.created_at, locale)}
                </Typography>
              </Stack>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{humanize(run.trigger_kind)}</Typography>
              <Typography variant="caption" color="text.secondary">{humanize(run.invocation_channel)}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2">
                {run.counts?.action_requests ?? 0}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Open run">
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(run.id);
                  }}
                  aria-label="Open run"
                >
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RunAuditDetail({
  detail,
  locale,
  busyActionId,
  onApprove,
  onReject,
}: {
  detail: AiAgentControlRunDetail;
  locale: string;
  busyActionId: string | null;
  onApprove: (action: AiAgentControlActionRequest) => void;
  onReject: (action: AiAgentControlActionRequest) => void;
}) {
  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <MetricBlock label="Run" value={<Typography sx={{ fontFamily: 'monospace' }}>{shortId(detail.run.id)}</Typography>} status={detail.run.status} />
        <MetricBlock label="Tool executions" value={detail.tool_executions.length} />
        <MetricBlock label="Evidence" value={detail.evidence.length} />
        <MetricBlock label="Actions" value={detail.action_requests.length} />
      </Stack>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Run summaries and action payloads</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <JsonPreview value={detail.run.input_summary ?? detail.run.output_summary} />
            <JsonPreview value={detail.action_requests.map((action) => ({
              id: action.id,
              capability_name: action.capability_name,
              status: action.status,
              target_ref: action.target_ref,
              action_payload_json: action.action_payload_json,
              metadata_json: action.metadata_json,
            }))} />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Tool executions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {detail.tool_executions.length === 0 ? (
            <EmptyState>No tool executions for this run.</EmptyState>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Capability</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.tool_executions.map((tool) => (
                  <TableRow key={tool.id} hover>
                    <TableCell><StatusText status={tool.status} /></TableCell>
                    <TableCell>
                      <Typography variant="body2">{tool.capability_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{tool.surface} / {tool.effect}</Typography>
                    </TableCell>
                    <TableCell>{tool.duration_ms == null ? 'Not set' : `${tool.duration_ms} ms`}</TableCell>
                    <TableCell>{tool.error_message ?? 'None'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Evidence records</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {detail.evidence.length === 0 ? (
            <EmptyState>No evidence for this run.</EmptyState>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell>Summary</TableCell>
                  <TableCell>Trust</TableCell>
                  <TableCell>Collected</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.evidence.map((evidence) => (
                  <TableRow key={evidence.id} hover>
                    <TableCell>
                      <Typography variant="body2">{evidence.source_provider}</Typography>
                      <Typography variant="caption" color="text.secondary">{evidence.source_object_type}</Typography>
                    </TableCell>
                    <TableCell>{evidence.summary}</TableCell>
                    <TableCell>{humanize(evidence.trust_level)}</TableCell>
                    <TableCell>{formatDateTime(evidence.collected_at, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}

export default function AgentControlCenterPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [selectedWorkGroupKey, setSelectedWorkGroupKey] = React.useState<string | null>(null);
  const [includeDirectory, setIncludeDirectory] = React.useState(true);
  const [selectedGlpiTargetKey, setSelectedGlpiTargetKey] = React.useState<string | null>(null);
  const [busyActionId, setBusyActionId] = React.useState<string | null>(null);
  const [busyTicketKey, setBusyTicketKey] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [mutationInfo, setMutationInfo] = React.useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ['ai-agent-control-runs'],
    queryFn: () => aiAgentControlApi.listRuns({ limit: 25 }),
    refetchInterval: 30_000,
  });

  const actionsQuery = useQuery({
    queryKey: ['ai-agent-control-actions', 'pending'],
    queryFn: () => aiAgentControlApi.listActions({ limit: 50, status: 'pending' }),
    refetchInterval: 30_000,
  });

  const queueQuery = useQuery({
    queryKey: ['ai-agent-control-queue'],
    queryFn: () => aiAgentControlApi.getQueueOverview({ limit: 75 }),
    refetchInterval: 30_000,
  });

  const glpiTargetsQuery = useQuery({
    queryKey: ['ai-agent-control-glpi-read-targets'],
    queryFn: () => aiAgentControlApi.listGlpiReadTargets(),
    refetchInterval: 30_000,
  });

  const helpdeskDefinition = React.useMemo(() => {
    const definitions = queueQuery.data?.definitions ?? [];
    return definitions.find((definition) => definition.agent_key === HELP_DESK_AGENT_KEY) ?? definitions[0] ?? null;
  }, [queueQuery.data]);

  const pendingActions = actionsQuery.data?.items ?? [];
  const queueActions = queueQuery.data?.action_requests ?? [];
  const actionPool = React.useMemo(() => {
    const byId = new Map<string, AiAgentControlActionRequest>();
    for (const action of queueActions) {
      byId.set(action.id, action);
    }
    for (const action of pendingActions) {
      byId.set(action.id, action);
    }
    return Array.from(byId.values());
  }, [pendingActions, queueActions]);
  const workGroups = React.useMemo(
    () => buildTicketGroups(queueQuery.data ?? null, actionPool),
    [actionPool, queueQuery.data],
  );
  const ticketGroups = workGroups.groups;
  const activeTicketGroups = React.useMemo(
    () => ticketGroups.filter((group) => group.active),
    [ticketGroups],
  );
  const selectableWorkGroups = activeTicketGroups.length > 0 ? activeTicketGroups : ticketGroups;
  const orphanActions = workGroups.orphanActions;

  React.useEffect(() => {
    if (selectableWorkGroups.length === 0) {
      if (selectedWorkGroupKey) setSelectedWorkGroupKey(null);
      return;
    }
    if (!selectedWorkGroupKey || !selectableWorkGroups.some((group) => group.key === selectedWorkGroupKey)) {
      setSelectedWorkGroupKey(selectableWorkGroups[0].key);
    }
  }, [selectedWorkGroupKey, selectableWorkGroups]);

  const selectedGroup = ticketGroups.find((group) => group.key === selectedWorkGroupKey) ?? null;

  React.useEffect(() => {
    if (!selectedRunId && selectedGroup?.latestRunId) {
      setSelectedRunId(selectedGroup.latestRunId);
    }
  }, [selectedGroup, selectedRunId]);

  React.useEffect(() => {
    const targetKeys = glpiTargetsQuery.data?.items?.map((target) => target.target_key) ?? [];
    if (targetKeys.length === 0) {
      if (selectedGlpiTargetKey) {
        setSelectedGlpiTargetKey(null);
      }
      return;
    }
    if (!selectedGlpiTargetKey || !targetKeys.includes(selectedGlpiTargetKey)) {
      setSelectedGlpiTargetKey(targetKeys[0]);
    }
  }, [glpiTargetsQuery.data, selectedGlpiTargetKey]);

  const detailQuery = useQuery({
    queryKey: ['ai-agent-control-run', selectedRunId],
    queryFn: () => aiAgentControlApi.getRun(selectedRunId as string),
    enabled: !!selectedRunId,
  });

  const selectedWorkItemId = selectedGroup?.workItem?.id ?? null;
  const helpdeskContextQuery = useQuery({
    queryKey: ['ai-agent-control-helpdesk-context', selectedWorkItemId],
    queryFn: () => aiAgentControlApi.getHelpdeskWorkItemContext(selectedWorkItemId as string),
    enabled: !!selectedWorkItemId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (helpdeskContextQuery.data?.run_id && !selectedRunId) {
      setSelectedRunId(helpdeskContextQuery.data.run_id);
    }
  }, [helpdeskContextQuery.data, selectedRunId]);

  const invalidateControlQueries = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-runs'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-actions'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-run'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-glpi-read-targets'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-helpdesk-context'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-helpdesk-settings'] }),
    ]);
  }, [queryClient]);

  const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = React.useState(false);

  const helpdeskSettingsQuery = useQuery({
    queryKey: ['ai-agent-helpdesk-settings'],
    queryFn: () => aiAgentControlApi.getHelpdeskIngestionSettings(),
  });
  const helpdeskSettings = helpdeskSettingsQuery.data ?? null;

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: AiAgentControlHelpdeskIngestionSettingsInput) =>
      aiAgentControlApi.updateHelpdeskIngestionSettings(payload),
    onSuccess: async (result) => {
      queryClient.setQueryData(['ai-agent-helpdesk-settings'], result);
      setSettingsDialogOpen(false);
      setMutationInfo(result.ingestion.enabled
        ? (result.ingestion.ready
          ? 'Settings saved. The agent is now watching for new GLPI tickets.'
          : `Settings saved, but the watcher is not ready: ${result.ingestion.readyReason}`)
        : 'Settings saved. Automatic ticket watching is OFF — use the switch at the top of the settings dialog to enable it.');
      await invalidateControlQueries();
    },
  });

  const createPauseMutation = useMutation({
    mutationFn: (payload: { reason: string; expires_in_minutes: number | null }) =>
      aiAgentControlApi.createHelpdeskEmergencyPause(payload),
    onSuccess: async () => {
      setPauseDialogOpen(false);
      setMutationInfo('Emergency pause activated. All agent activity for this tenant is suspended.');
      await invalidateControlQueries();
    },
  });

  const revokePauseMutation = useMutation({
    mutationFn: (id: string) => aiAgentControlApi.revokeHelpdeskEmergencyPause(id),
    onMutate: () => {
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async () => {
      setMutationInfo('Emergency pause lifted. Agent activity can resume.');
      await invalidateControlQueries();
    },
    onError: (error: any) => {
      setMutationError(getApiErrorMessage(error, t, 'The emergency pause could not be lifted.'));
    },
  });

  const runMockTriageMutation = useMutation({
    mutationFn: () => aiAgentControlApi.runMockTriage({
      alert_id: 'mock-alert-001',
      ticket_id: 'mock-ticket-1001',
      include_directory: includeDirectory,
    }),
    onMutate: () => {
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async (result) => {
      setSelectedRunId(result.detail.run.id);
      queryClient.setQueryData(['ai-agent-control-run', result.detail.run.id], result.detail);
      await invalidateControlQueries();
    },
    onError: (error: any) => {
      setMutationError(getApiErrorMessage(error, t, 'Mock triage failed.'));
    },
  });

  const approveMutation = useMutation({
    mutationFn: (action: AiAgentControlActionRequest) => aiAgentControlApi.approveAction(action.id, { execute: true }),
    onMutate: (action) => {
      setBusyActionId(action.id);
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async (result) => {
      if (result.detail?.run.id) {
        setSelectedRunId(result.detail.run.id);
        queryClient.setQueryData(['ai-agent-control-run', result.detail.run.id], result.detail);
      }
      await invalidateControlQueries();
    },
    onError: (error: any) => {
      setMutationError(getApiErrorMessage(error, t, 'Approval failed.'));
    },
    onSettled: () => {
      setBusyActionId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (action: AiAgentControlActionRequest) => aiAgentControlApi.rejectAction(action.id, {
      reason: 'Rejected from Agent Control Center.',
    }),
    onMutate: (action) => {
      setBusyActionId(action.id);
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async (result) => {
      if (result.detail?.run.id) {
        setSelectedRunId(result.detail.run.id);
        queryClient.setQueryData(['ai-agent-control-run', result.detail.run.id], result.detail);
      }
      await invalidateControlQueries();
    },
    onError: (error: any) => {
      setMutationError(getApiErrorMessage(error, t, 'Rejection failed.'));
    },
    onSettled: () => {
      setBusyActionId(null);
    },
  });

  const approveTicketMutation = useMutation({
    mutationFn: async (group: TicketWorkGroup) => {
      const actions = group.pendingActions.filter(actionCanExecute);
      if (actions.length === 0) {
        throw new Error(`No executable proposals for GLPI ticket ${group.targetRef}.`);
      }
      const results = [];
      let failed: { action: AiAgentControlActionRequest; error: unknown } | null = null;
      for (const action of actions) {
        try {
          results.push(await aiAgentControlApi.approveAction(action.id, { execute: true }));
        } catch (error) {
          failed = { action, error };
          break;
        }
      }
      return { group, results, total: actions.length, failed };
    },
    onMutate: (group) => {
      setBusyTicketKey(group.key);
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async (result) => {
      const detail = result.results.find((entry) => !!entry.detail)?.detail;
      if (detail?.run.id) {
        setSelectedRunId(detail.run.id);
        queryClient.setQueryData(['ai-agent-control-run', detail.run.id], detail);
      }
      if (result.failed) {
        setMutationError(
          `Approved ${result.results.length} of ${result.total} proposals for GLPI ticket ${result.group.targetRef}; `
          + `"${actionLabel(result.failed.action)}" failed: ${getApiErrorMessage(result.failed.error, t, 'execution failed.')}`,
        );
      } else {
        setMutationInfo(`Approved and executed ${result.results.length} proposal${result.results.length === 1 ? '' : 's'} for GLPI ticket ${result.group.targetRef}.`);
      }
      await invalidateControlQueries();
    },
    onError: async (error: any) => {
      setMutationError(getApiErrorMessage(error, t, 'Ticket proposal approval failed.'));
      await invalidateControlQueries();
    },
    onSettled: () => {
      setBusyTicketKey(null);
    },
  });

  const rejectTicketMutation = useMutation({
    mutationFn: async (group: TicketWorkGroup) => {
      const actions = group.pendingActions.filter(actionCanReject);
      if (actions.length === 0) {
        throw new Error(`No rejectable proposals for GLPI ticket ${group.targetRef}.`);
      }
      const results = [];
      for (const action of actions) {
        results.push(await aiAgentControlApi.rejectAction(action.id, {
          reason: `Rejected all proposals for GLPI ticket ${group.targetRef} from Agent Control Center.`,
        }));
      }
      return { group, results };
    },
    onMutate: (group) => {
      setBusyTicketKey(group.key);
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async (result) => {
      const detail = result.results.find((entry) => !!entry.detail)?.detail;
      if (detail?.run.id) {
        setSelectedRunId(detail.run.id);
        queryClient.setQueryData(['ai-agent-control-run', detail.run.id], detail);
      }
      await invalidateControlQueries();
    },
    onError: (error: any) => {
      setMutationError(getApiErrorMessage(error, t, 'Ticket proposal rejection failed.'));
    },
    onSettled: () => {
      setBusyTicketKey(null);
    },
  });

  const runGlpiReadMutation = useMutation({
    mutationFn: (targetKey: string | null) => aiAgentControlApi.runGlpiRead(targetKey ? { target_key: targetKey } : {}),
    onMutate: () => {
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async (result) => {
      setSelectedRunId(result.detail.run.id);
      queryClient.setQueryData(['ai-agent-control-run', result.detail.run.id], result.detail);
      await invalidateControlQueries();
    },
    onError: (error: any) => {
      setMutationError(getApiErrorMessage(error, t, 'GLPI read failed.'));
    },
  });

  const runGlpiTriageMutation = useMutation({
    mutationFn: (targetKey: string | null) => aiAgentControlApi.runGlpiTriage(targetKey ? { target_key: targetKey } : {}),
    onMutate: () => {
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async (result) => {
      setSelectedRunId(result.detail.run.id);
      if (result.work_item?.id) {
        setSelectedWorkGroupKey(`${result.work_item.source_provider_kind}:${result.work_item.source_provider_key}:${result.work_item.source_object_type}:${result.work_item.source_object_ref}`);
      }
      const actionCount = result.diagnostic.action_request_ids?.length ?? 0;
      const skipped = result.diagnostic.skipped_actions;
      if (actionCount === 0 && (skipped?.internal_note || skipped?.public_reply)) {
        const gate = result.diagnostic.conversation_gate;
        const reasons = [
          skipped.internal_note ? `internal note: ${humanize(skipped.internal_note)}` : null,
          skipped.public_reply ? `requester reply: ${humanize(skipped.public_reply)}` : null,
        ].filter((entry): entry is string => !!entry);
        const requesterSignal = gate?.latest_requester_message_at
          ? ` Latest requester signal: ${formatDateTime(gate.latest_requester_message_at, locale)} via ${humanize(gate.requester_classification_confidence ?? 'unknown')}.`
          : ' No requester signal was found after the last KANAP action.';
        setMutationInfo(`No review action was created. Waiting for a newer requester message (${reasons.join('; ')}).${requesterSignal}`);
      }
      queryClient.setQueryData(['ai-agent-control-run', result.detail.run.id], result.detail);
      await invalidateControlQueries();
    },
    onError: (error: any) => {
      setMutationInfo(null);
      setMutationError(getApiErrorMessage(error, t, 'GLPI triage failed.'));
    },
  });

  const pollHelpdeskIngestionMutation = useMutation({
    mutationFn: () => aiAgentControlApi.pollHelpdeskGlpiIngestion(),
    onMutate: () => {
      setMutationError(null);
      setMutationInfo(null);
    },
    onSuccess: async (result) => {
      const counts = `listed ${result.listed}, enqueued ${result.enqueued}, processed ${result.processed}`;
      setMutationInfo(result.reason
        ? `Poll ${humanize(result.status)}: ${result.reason} (${counts}.)`
        : `Poll ${humanize(result.status)}: ${counts}.`);
      await invalidateControlQueries();
    },
    onError: (error: any) => {
      setMutationError(getApiErrorMessage(error, t, 'GLPI ingestion poll failed.'));
    },
  });

  const runs = runsQuery.data?.items ?? [];
  const activeReviewActions = activeTicketGroups.flatMap((group) => group.pendingActions);
  const executableActionCount = activeReviewActions.filter(actionCanExecute).length;
  const blockedActionCount = activeReviewActions.filter((action) => actionCanReject(action) && !actionCanExecute(action)).length;
  const failedQueueCount = activeTicketGroups.filter((group) => group.queueStatus === 'failed' || group.queueStatus === 'dead_letter').length;
  const detail = detailQuery.data;
  const loadError = runsQuery.error || actionsQuery.error || queueQuery.error || glpiTargetsQuery.error || detailQuery.error;
  const contextError = helpdeskContextQuery.error
    ? getApiErrorMessage(helpdeskContextQuery.error, t, 'Selected ticket context could not be loaded.')
    : null;

  return (
    <>
      <PageHeader
        title="Helpdesk GLPI triage cockpit"
        actions={(
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => invalidateControlQueries()}
              disabled={runsQuery.isFetching || actionsQuery.isFetching || queueQuery.isFetching}
            >
              Refresh
            </Button>
          </Stack>
        )}
      />

      <Stack spacing={2}>
        {(loadError || mutationError) && (
          <Alert severity="error">
            {mutationError || getApiErrorMessage(loadError, t, 'Agent control data could not be loaded.')}
          </Alert>
        )}
        {mutationInfo ? (
          <Alert severity="info">
            {mutationInfo}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
            gap: 1.25,
          }}
        >
          <MetricBlock label="Active ticket reviews" value={activeTicketGroups.length} status={activeTicketGroups.length > 0 ? 'waiting_approval' : 'completed'} />
          <MetricBlock label="Executable actions" value={executableActionCount} status={executableActionCount > 0 ? 'pending' : 'completed'} />
          <MetricBlock label="Blocked actions" value={blockedActionCount} status={blockedActionCount > 0 ? 'warning' : 'completed'} />
          <MetricBlock label="Failed/dead letter" value={failedQueueCount} status={failedQueueCount > 0 ? 'failed' : 'completed'} />
        </Box>

        <GlpiSafeTargetPanel
          targetsResult={glpiTargetsQuery.data ?? null}
          selectedTargetKey={selectedGlpiTargetKey}
          activeTargetRefs={activeTicketGroups.map((group) => group.targetRef)}
          loading={glpiTargetsQuery.isLoading}
          readBusy={runGlpiReadMutation.isPending}
          triageBusy={runGlpiTriageMutation.isPending}
          locale={locale}
          onSelect={setSelectedGlpiTargetKey}
          onRun={(target) => runGlpiReadMutation.mutate(target.target_key)}
          onTriage={(target) => runGlpiTriageMutation.mutate(target.target_key)}
        />

        <TicketWorkItemCockpit
          title="Needs review"
          emptyState="No active GLPI ticket reviews."
          groups={activeTicketGroups}
          selectedKey={selectedWorkGroupKey}
          selectedDetail={selectedGroup?.latestRunId === detail?.run.id ? detail : undefined}
          locale={locale}
          loading={queueQuery.isLoading || actionsQuery.isLoading}
          busyActionId={busyActionId}
          busyTicketKey={busyTicketKey}
          onSelect={(group) => {
            setSelectedWorkGroupKey(group.key);
            if (group.latestRunId) setSelectedRunId(group.latestRunId);
          }}
          onOpenRun={setSelectedRunId}
          onApprove={(action) => approveMutation.mutate(action)}
          onReject={(action) => rejectMutation.mutate(action)}
          onRejectAll={(group) => rejectTicketMutation.mutate(group)}
          onApproveAll={(group) => approveTicketMutation.mutate(group)}
        />

        <SelectedHelpdeskContext
          group={selectedGroup}
          contextResult={helpdeskContextQuery.data}
          loading={helpdeskContextQuery.isFetching}
          errorMessage={contextError}
          locale={locale}
        />

        <TicketHistoryPanel
          groups={ticketGroups}
          showHistory={showHistory}
          locale={locale}
          onToggle={() => setShowHistory((value) => !value)}
          onSelect={(group) => {
            setSelectedWorkGroupKey(group.key);
            if (group.latestRunId) setSelectedRunId(group.latestRunId);
          }}
          onOpenRun={setSelectedRunId}
        />

        <AgentSummary
          definition={helpdeskDefinition}
          summary={queueQuery.data?.helpdesk?.summary ?? null}
          auditEvents={queueQuery.data?.helpdesk?.audit_events ?? []}
          loading={queueQuery.isLoading}
          locale={locale}
          pollBusy={pollHelpdeskIngestionMutation.isPending}
          onPoll={() => pollHelpdeskIngestionMutation.mutate()}
          activePause={helpdeskSettings?.emergency_pause ?? null}
          pauseBusy={createPauseMutation.isPending || revokePauseMutation.isPending}
          onOpenSettings={() => setSettingsDialogOpen(true)}
          onActivatePause={() => setPauseDialogOpen(true)}
          onLiftPause={() => {
            const pauseId = helpdeskSettings?.emergency_pause?.id;
            if (pauseId) revokePauseMutation.mutate(pauseId);
          }}
        />

        <Section title="Audit drill-down">
          <Box sx={{ p: 1.5 }}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">Directory</Typography>
                  <Switch
                    size="small"
                    checked={includeDirectory}
                    onChange={(event) => setIncludeDirectory(event.target.checked)}
                    inputProps={{ 'aria-label': 'Include directory context' }}
                  />
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={runMockTriageMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <ManageSearchOutlinedIcon />}
                  onClick={() => runMockTriageMutation.mutate()}
                  disabled={runMockTriageMutation.isPending}
                >
                  Mock triage
                </Button>
              </Stack>
              <OrphanActionRequestsPanel
                actions={orphanActions}
                locale={locale}
                busyActionId={busyActionId}
                onApprove={(action) => approveMutation.mutate(action)}
                onReject={(action) => rejectMutation.mutate(action)}
              />
              <RunsTable
                runs={runs}
                selectedRunId={selectedRunId}
                locale={locale}
                onSelect={setSelectedRunId}
              />
              {selectedRunId ? (
                detailQuery.isLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={24} />
                  </Box>
                ) : detail ? (
                  <RunAuditDetail
                    detail={detail}
                    locale={locale}
                    busyActionId={busyActionId}
                    onApprove={(action) => approveMutation.mutate(action)}
                    onReject={(action) => rejectMutation.mutate(action)}
                  />
                ) : (
                  <EmptyState>Select a run.</EmptyState>
                )
              ) : null}
            </Stack>
          </Box>
        </Section>
      </Stack>

      <HelpdeskAgentSettingsDialog
        open={settingsDialogOpen}
        settings={helpdeskSettings}
        locale={locale}
        saving={updateSettingsMutation.isPending}
        saveError={updateSettingsMutation.error
          ? getApiErrorMessage(updateSettingsMutation.error, t, 'The settings could not be saved.')
          : null}
        onClose={() => setSettingsDialogOpen(false)}
        onSave={(payload) => updateSettingsMutation.mutate(payload)}
      />
      <EmergencyPauseDialog
        open={pauseDialogOpen}
        saving={createPauseMutation.isPending}
        saveError={createPauseMutation.error
          ? getApiErrorMessage(createPauseMutation.error, t, 'The emergency pause could not be activated.')
          : null}
        onClose={() => setPauseDialogOpen(false)}
        onActivate={(payload) => createPauseMutation.mutate(payload)}
      />
    </>
  );
}
