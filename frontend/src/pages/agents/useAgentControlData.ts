import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  aiAgentControlApi,
  type AiAgentControlActionRequest,
  type AiAgentControlAgentDefinitionInput,
  type AiAgentControlHelpdeskIngestionSettingsInput,
  type AiAgentControlQueueOverview,
} from '../../ai/aiApi';
import {
  actionCanReject,
  actionHasQueuedExecution,
  isRecord,
  statusLabel,
  ticketingProviderKeyForDefinition,
} from '../../components/agents/agentControlPrimitives';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

const QUEUE_QUERY_KEY = ['ai-agent-control-queue'] as const;
const ACTIONS_QUERY_KEY = ['ai-agent-control-actions', 'all'] as const;
export const SHARED_CONTEXT_PROFILES_QUERY_KEY = ['ai-shared-context-profiles'] as const;
const FAST_POLL_INTERVAL_MS = 5_000;
const IDLE_POLL_INTERVAL_MS = 30_000;
const KNOWN_EXECUTION_MODES = new Set(['queued', 'background', 'approve_only', 'synchronous']);

export type OptimisticActionDecision = 'approved' | 'rejected';
type ActionDecisionInput = { action: AiAgentControlActionRequest; reason?: string | null };
type BulkDecisionInput = { key: string; actions: AiAgentControlActionRequest[]; reason?: string | null };

function serverConfirmsOptimisticDecision(action: AiAgentControlActionRequest): boolean {
  if (['approved', 'rejected', 'executing', 'executed', 'expired'].includes(action.status)) return true;
  return !!action.approved_at || !!action.rejected_at || !!action.executed_at;
}

export function hasAgentControlInFlight(input: {
  overview?: AiAgentControlQueueOverview | null;
  actions?: readonly AiAgentControlActionRequest[] | null;
}): boolean {
  const actions = [
    ...(input.actions ?? []),
    ...(input.overview?.action_requests ?? []),
  ];
  if (actions.some((action) => action.status === 'executing' || actionHasQueuedExecution(action))) return true;
  return (input.overview?.work_items ?? []).some((workItem) => ['leased', 'running'].includes(workItem.status));
}

export function applyOptimisticDecisionOverlay(
  actions: readonly AiAgentControlActionRequest[],
  decisions: ReadonlyMap<string, OptimisticActionDecision>,
): AiAgentControlActionRequest[] {
  if (decisions.size === 0) return [...actions];
  return actions.map((action) => {
    const decision = decisions.get(action.id);
    if (!decision) return action;
    if (decision === 'rejected') {
      return { ...action, status: 'rejected' };
    }
    const metadata = isRecord(action.metadata_json) ? action.metadata_json : {};
    const batch = isRecord(metadata.approved_batch_context) ? metadata.approved_batch_context : {};
    return {
      ...action,
      status: 'approved',
      metadata_json: {
        ...metadata,
        approved_batch_context: {
          ...batch,
          execution_queued: true,
        },
      },
    };
  });
}

export function withOptimisticDecisionIds(
  decisions: ReadonlyMap<string, OptimisticActionDecision>,
  actionIds: readonly string[],
  decision: OptimisticActionDecision,
): Map<string, OptimisticActionDecision> {
  const next = new Map(decisions);
  for (const actionId of actionIds) next.set(actionId, decision);
  return next;
}

export function withoutOptimisticDecisionIds(
  decisions: ReadonlyMap<string, OptimisticActionDecision>,
  actionIds: readonly string[],
): Map<string, OptimisticActionDecision> {
  const next = new Map(decisions);
  for (const actionId of actionIds) next.delete(actionId);
  return next;
}

export function pruneConfirmedOptimisticDecisions(
  decisions: ReadonlyMap<string, OptimisticActionDecision>,
  serverActions: readonly AiAgentControlActionRequest[],
): Map<string, OptimisticActionDecision> {
  const next = new Map(decisions);
  for (const action of serverActions) {
    if (next.has(action.id) && serverConfirmsOptimisticDecision(action)) {
      next.delete(action.id);
    }
  }
  return next;
}

function sameDecisionMap(
  left: ReadonlyMap<string, OptimisticActionDecision>,
  right: ReadonlyMap<string, OptimisticActionDecision>,
): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left.entries()) {
    if (right.get(key) !== value) return false;
  }
  return true;
}

function knownExecutionMode(mode: string | undefined): boolean {
  return !!mode && KNOWN_EXECUTION_MODES.has(mode);
}

function optionalDecisionReason(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 500) : undefined;
}

export function useAgentControlData(input: { targetAgentKey?: string | null } = {}) {
  const { t } = useTranslation(['agents']);
  const queryClient = useQueryClient();
  const [busyActionId, setBusyActionId] = React.useState<string | null>(null);
  const [busyTicketKey, setBusyTicketKey] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [optimisticDecisions, setOptimisticDecisions] = React.useState<Map<string, OptimisticActionDecision>>(() => new Map());

  const addOptimisticDecisions = React.useCallback((actionIds: readonly string[], decision: OptimisticActionDecision) => {
    setOptimisticDecisions((current) => withOptimisticDecisionIds(current, actionIds, decision));
  }, []);

  const removeOptimisticDecisions = React.useCallback((actionIds: readonly string[]) => {
    setOptimisticDecisions((current) => withoutOptimisticDecisionIds(current, actionIds));
  }, []);

  const refetchInterval = React.useCallback(() => {
    const overview = queryClient.getQueryData<AiAgentControlQueueOverview>(QUEUE_QUERY_KEY) ?? null;
    const actions = queryClient.getQueryData<{ items: AiAgentControlActionRequest[] }>(ACTIONS_QUERY_KEY)?.items ?? [];
    const overlaidOverview = overview
      ? { ...overview, action_requests: applyOptimisticDecisionOverlay(overview.action_requests ?? [], optimisticDecisions) }
      : null;
    const overlaidActions = applyOptimisticDecisionOverlay(actions, optimisticDecisions);
    if (hasAgentControlInFlight({ overview: overlaidOverview, actions: overlaidActions })) return FAST_POLL_INTERVAL_MS;
    if (Array.from(optimisticDecisions.values()).some((decision) => decision === 'approved')) return FAST_POLL_INTERVAL_MS;
    return IDLE_POLL_INTERVAL_MS;
  }, [optimisticDecisions, queryClient]);

  const queueQuery = useQuery({
    queryKey: QUEUE_QUERY_KEY,
    queryFn: () => aiAgentControlApi.getQueueOverview({ limit: 100 }),
    refetchInterval,
  });
  const targetAgentKey = input.targetAgentKey?.trim() || null;
  const targetDefinition = targetAgentKey
    ? queueQuery.data?.definitions.find((definition) => definition.agent_key === targetAgentKey) ?? null
    : null;
  const ticketingProviderKey = ticketingProviderKeyForDefinition(targetDefinition);
  const actionsQuery = useQuery({
    queryKey: ACTIONS_QUERY_KEY,
    queryFn: () => aiAgentControlApi.listActions({ limit: 100, status: 'all' }),
    refetchInterval,
  });
  const badgesQuery = useQuery({
    queryKey: ['ai-agent-control-badges'],
    queryFn: () => aiAgentControlApi.getBadges(),
    refetchInterval: 60_000,
  });
  const settingsQuery = useQuery({
    queryKey: ['ai-agent-helpdesk-settings'],
    queryFn: () => aiAgentControlApi.getHelpdeskIngestionSettings(),
  });
  const invalidate = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-actions'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-badges'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-activity'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-autonomy'] }),
      queryClient.invalidateQueries({ queryKey: SHARED_CONTEXT_PROFILES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-helpdesk-evaluation-daily'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-helpdesk-settings'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-run'] }),
    ]);
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: (input: ActionDecisionInput) => aiAgentControlApi.approveAction(input.action.id, {
      execute: true,
      reason: optionalDecisionReason(input.reason),
    }),
    onMutate: (input) => {
      const { action } = input;
      setBusyActionId(action.id);
      setError(null);
      setMessage(null);
      addOptimisticDecisions([action.id], 'approved');
      return { actionIds: [action.id] };
    },
    onSuccess: async (result) => {
      if (!knownExecutionMode(result.execution_mode)) {
        await invalidate();
        return;
      }
      setMessage(t('messages.approved'));
      await invalidate();
    },
    onError: (err, _action, context) => {
      removeOptimisticDecisions(context?.actionIds ?? []);
      setError(getApiErrorMessage(err, t, t('messages.approveFailed')));
    },
    onSettled: () => setBusyActionId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: (input: ActionDecisionInput) => aiAgentControlApi.rejectAction(input.action.id, {
      reason: optionalDecisionReason(input.reason) ?? t('messages.rejectedFromAgents'),
    }),
    onMutate: (input) => {
      const { action } = input;
      setBusyActionId(action.id);
      setError(null);
      setMessage(null);
      addOptimisticDecisions([action.id], 'rejected');
      return { actionIds: [action.id] };
    },
    onSuccess: async () => {
      setMessage(t('messages.rejected'));
      await invalidate();
    },
    onError: (err, _action, context) => {
      removeOptimisticDecisions(context?.actionIds ?? []);
      setError(getApiErrorMessage(err, t, t('messages.rejectFailed')));
    },
    onSettled: () => setBusyActionId(null),
  });

  const approveAllMutation = useMutation({
    mutationFn: async (input: BulkDecisionInput) => {
      const executable = input.actions.filter((action) => action.execution_readiness?.can_execute ?? ['pending', 'approved'].includes(action.status));
      if (executable.length === 0) {
        return { mode: 'none' as const, executed: 0, queued: 0, needsReview: 0, failedActionIds: [] };
      }
      const result = await aiAgentControlApi.approveActionsBulk({
        action_request_ids: executable.map((action) => action.id),
        execute: true,
        reason: optionalDecisionReason(input.reason),
      });
      if (result.execution_mode === 'queued' || result.execution_mode === 'background') {
        const queued = result.summary.queued ?? result.results.filter((item) => ['approved', 'executing'].includes(item.action.status)).length;
        return {
          mode: result.execution_mode,
          executed: result.summary.executed,
          queued,
          needsReview: result.summary.needs_review,
          failedActionIds: result.results.filter((item) => !item.ok && !serverConfirmsOptimisticDecision(item.action)).map((item) => item.action.id),
        };
      }
      if (result.execution_mode === 'approve_only') {
        const approved = result.summary.approved ?? result.results.filter((item) => ['approved', 'executed'].includes(item.action.status)).length;
        return {
          mode: 'approve_only' as const,
          executed: approved,
          queued: 0,
          needsReview: result.summary.needs_review,
          failedActionIds: result.results.filter((item) => !item.ok && !serverConfirmsOptimisticDecision(item.action)).map((item) => item.action.id),
        };
      }
      if (result.execution_mode !== 'synchronous') {
        return {
          mode: 'unknown' as const,
          executed: result.summary.executed,
          queued: result.summary.queued ?? 0,
          needsReview: result.summary.needs_review,
          failedActionIds: result.results.filter((item) => !item.ok && !serverConfirmsOptimisticDecision(item.action)).map((item) => item.action.id),
        };
      }
      const executed = result.results.filter((item) => item.action.status === 'executed' || item.ok).length;
      return {
        mode: 'synchronous' as const,
        executed,
        queued: 0,
        needsReview: result.results.length - executed,
        failedActionIds: result.results.filter((item) => !item.ok && !serverConfirmsOptimisticDecision(item.action)).map((item) => item.action.id),
      };
    },
    onMutate: (input) => {
      setBusyTicketKey(input.key);
      setError(null);
      setMessage(null);
      const executable = input.actions.filter((action) => action.execution_readiness?.can_execute ?? ['pending', 'approved'].includes(action.status));
      const actionIds = executable.map((action) => action.id);
      addOptimisticDecisions(actionIds, 'approved');
      return { actionIds };
    },
    onSuccess: (result) => {
      if (result.failedActionIds.length > 0) {
        removeOptimisticDecisions(result.failedActionIds);
      }
      if (result.mode === 'unknown') {
        void invalidate();
        return;
      }
      setMessage(result.mode === 'queued'
        || result.mode === 'background'
        ? t('messages.approvedManyQueued', { count: result.queued, review: result.needsReview })
        : t('messages.approvedMany', { count: result.executed, review: result.needsReview }));
      // Refresh in the background — never block the button/modal dismissal on the
      // refetch, so a stalled queue-overview GET cannot freeze the UI.
      void invalidate();
    },
    onError: (err, _input, context) => {
      removeOptimisticDecisions(context?.actionIds ?? []);
      setError(getApiErrorMessage(err, t, t('messages.approveManyFailed')));
    },
    onSettled: () => setBusyTicketKey(null),
  });

  const rejectAllMutation = useMutation({
    mutationFn: async (input: BulkDecisionInput) => {
      const rejectable = input.actions.filter(actionCanReject);
      const reason = optionalDecisionReason(input.reason) ?? t('messages.rejectedFromAgents');
      const results = await Promise.allSettled(rejectable.map((action) => aiAgentControlApi.rejectAction(action.id, {
        reason,
      })));
      const rejected = results.filter((result) => result.status === 'fulfilled').length;
      const failedActionIds = rejectable
        .filter((_, index) => results[index]?.status === 'rejected')
        .map((action) => action.id);
      return { rejected, failed: results.length - rejected, failedActionIds };
    },
    onMutate: (input) => {
      setBusyTicketKey(input.key);
      setError(null);
      setMessage(null);
      const actionIds = input.actions.filter(actionCanReject).map((action) => action.id);
      addOptimisticDecisions(actionIds, 'rejected');
      return { actionIds };
    },
    onSuccess: (result) => {
      if (result.failedActionIds.length > 0) {
        removeOptimisticDecisions(result.failedActionIds);
      }
      if (result.failed > 0) {
        setError(t('messages.rejectManyFailed', { count: result.rejected, failed: result.failed }));
      } else {
        setMessage(t('messages.rejectedMany', { count: result.rejected }));
      }
      // Fire-and-forget: the modal close + busy reset must not wait on the refetch,
      // otherwise a slow/stalled GET keeps the confirmation dialog spinner frozen.
      void invalidate();
    },
    onError: (err, _input, context) => {
      removeOptimisticDecisions(context?.actionIds ?? []);
      setError(getApiErrorMessage(err, t, t('messages.rejectManyFailed')));
    },
    onSettled: () => setBusyTicketKey(null),
  });

  const pollMutation = useMutation({
    mutationFn: () => aiAgentControlApi.pollHelpdeskTicketingIngestion(),
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async (result) => {
      const messageKey = result.reason ? 'messages.pollCompleteWithReason' : 'messages.pollComplete';
      setMessage(t(messageKey, {
        status: statusLabel(result.status),
        enqueued: result.enqueued,
        processed: result.processed,
        reason: result.reason,
      }));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.pollFailed'))),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: AiAgentControlHelpdeskIngestionSettingsInput) => aiAgentControlApi.updateHelpdeskIngestionSettings(payload),
    onSuccess: async () => {
      setMessage(t('messages.settingsSaved'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.settingsFailed'))),
  });

  const createAgentMutation = useMutation({
    mutationFn: (payload: AiAgentControlAgentDefinitionInput) => aiAgentControlApi.createAgent(payload),
    onSuccess: async () => {
      setMessage(t('messages.agentCreated'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.agentCreateFailed'))),
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (id: string) => aiAgentControlApi.deleteAgent(id),
    onSuccess: async () => {
      setMessage(t('messages.agentDeleted'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.agentDeleteFailed'))),
  });

  const updateAgentMutation = useMutation({
    mutationFn: (input: { id: string; payload: AiAgentControlAgentDefinitionInput }) =>
      aiAgentControlApi.updateAgent(input.id, input.payload),
    onSuccess: async () => {
      setMessage(t('messages.agentSaved'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.agentSaveFailed'))),
  });

  const updateAgentStatusMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => aiAgentControlApi.updateAgentStatus(input.id, { status: input.status }),
    onSuccess: async () => {
      setMessage(t('messages.agentSaved'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.agentSaveFailed'))),
  });

  const setAutonomyMutation = useMutation({
    mutationFn: (input: { id: string; actionClass: string; mode: 'ask_first' | 'automatic'; confirm?: boolean; overrideAcknowledged?: boolean; overrideReason?: string | null }) =>
      aiAgentControlApi.setAgentAutonomy(input.id, {
        actionClass: input.actionClass,
        mode: input.mode,
        confirm: input.confirm,
        overrideAcknowledged: input.overrideAcknowledged,
        overrideReason: input.overrideReason,
      }),
    onSuccess: async () => {
      setMessage(t('messages.autonomySaved'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.autonomyFailed'))),
  });

  const createPauseMutation = useMutation({
    mutationFn: (payload: { scope: 'tenant' | 'agent'; agent_definition_id?: string | null; reason: string; expires_in_minutes?: number | null }) =>
      aiAgentControlApi.createEmergencyPause(payload),
    onSuccess: async () => {
      setMessage(t('messages.pauseCreated'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.pauseFailed'))),
  });

  const revokePauseMutation = useMutation({
    mutationFn: (id: string) => aiAgentControlApi.revokeEmergencyPause(id),
    onSuccess: async () => {
      setMessage(t('messages.pauseRevoked'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.pauseRevokeFailed'))),
  });

  const serverActionPool = React.useMemo(() => {
    const byId = new Map<string, AiAgentControlActionRequest>();
    for (const action of queueQuery.data?.action_requests ?? []) byId.set(action.id, action);
    for (const action of actionsQuery.data?.items ?? []) byId.set(action.id, action);
    return Array.from(byId.values());
  }, [actionsQuery.data, queueQuery.data]);

  React.useEffect(() => {
    setOptimisticDecisions((current) => {
      const next = pruneConfirmedOptimisticDecisions(current, serverActionPool);
      return sameDecisionMap(current, next) ? current : next;
    });
  }, [serverActionPool]);

  const actionPool = React.useMemo(
    () => applyOptimisticDecisionOverlay(serverActionPool, optimisticDecisions),
    [optimisticDecisions, serverActionPool],
  );

  return {
    actionPool,
    actionsQuery,
    approveAllMutation,
    approveMutation,
    badgesQuery,
    busyActionId,
    busyTicketKey,
    createAgentMutation,
    deleteAgentMutation,
    createPauseMutation,
    error,
    invalidate,
    message,
    pollMutation,
    queueQuery,
    rejectAllMutation,
    rejectMutation,
    revokePauseMutation,
    setError,
    setMessage,
    setAutonomyMutation,
    settingsQuery,
    ticketingProviderKey,
    updateAgentMutation,
    updateAgentStatusMutation,
    updateSettingsMutation,
  };
}
