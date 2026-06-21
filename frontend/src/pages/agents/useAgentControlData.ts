import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  aiAgentControlApi,
  type AiAgentControlActionRequest,
  type AiAgentControlAgentDefinitionInput,
  type AiAgentControlHelpdeskIngestionSettingsInput,
} from '../../ai/aiApi';
import { statusLabel } from '../../components/agents/agentControlPrimitives';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

export function useAgentControlData() {
  const { t } = useTranslation(['agents']);
  const queryClient = useQueryClient();
  const [busyActionId, setBusyActionId] = React.useState<string | null>(null);
  const [busyTicketKey, setBusyTicketKey] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ['ai-agent-control-queue'],
    queryFn: () => aiAgentControlApi.getQueueOverview({ limit: 100 }),
    refetchInterval: 30_000,
  });
  const actionsQuery = useQuery({
    queryKey: ['ai-agent-control-actions', 'pending'],
    queryFn: () => aiAgentControlApi.listActions({ limit: 100, status: 'pending' }),
    refetchInterval: 30_000,
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
  const targetsQuery = useQuery({
    queryKey: ['ai-agent-control-glpi-read-targets'],
    queryFn: () => aiAgentControlApi.listGlpiReadTargets(),
    refetchInterval: 60_000,
  });

  const invalidate = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-actions'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-badges'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-activity'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-agents'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-autonomy'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-helpdesk-evaluation-daily'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-helpdesk-settings'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agent-control-run'] }),
    ]);
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: (action: AiAgentControlActionRequest) => aiAgentControlApi.approveAction(action.id, { execute: true }),
    onMutate: (action) => {
      setBusyActionId(action.id);
      setError(null);
      setMessage(null);
    },
    onSuccess: async () => {
      setMessage(t('messages.approved'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.approveFailed'))),
    onSettled: () => setBusyActionId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: (action: AiAgentControlActionRequest) => aiAgentControlApi.rejectAction(action.id, {
      reason: t('messages.rejectedFromAgents'),
    }),
    onMutate: (action) => {
      setBusyActionId(action.id);
      setError(null);
      setMessage(null);
    },
    onSuccess: async () => {
      setMessage(t('messages.rejected'));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.rejectFailed'))),
    onSettled: () => setBusyActionId(null),
  });

  const approveAllMutation = useMutation({
    mutationFn: async (input: { key: string; actions: AiAgentControlActionRequest[] }) => {
      const executable = input.actions.filter((action) => action.execution_readiness?.can_execute ?? ['pending', 'approved'].includes(action.status));
      for (const action of executable) {
        await aiAgentControlApi.approveAction(action.id, { execute: true });
      }
      return executable.length;
    },
    onMutate: (input) => {
      setBusyTicketKey(input.key);
      setError(null);
      setMessage(null);
    },
    onSuccess: async (count) => {
      setMessage(t('messages.approvedMany', { count }));
      await invalidate();
    },
    onError: (err) => setError(getApiErrorMessage(err, t, t('messages.approveManyFailed'))),
    onSettled: () => setBusyTicketKey(null),
  });

  const pollMutation = useMutation({
    mutationFn: () => aiAgentControlApi.pollHelpdeskGlpiIngestion(),
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async (result) => {
      setMessage(t('messages.pollComplete', { status: statusLabel(result.status), enqueued: result.enqueued, processed: result.processed }));
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
    mutationFn: (input: { id: string; actionClass: string; mode: 'ask_first' | 'automatic'; confirm?: boolean }) =>
      aiAgentControlApi.setAgentAutonomy(input.id, {
        actionClass: input.actionClass,
        mode: input.mode,
        confirm: input.confirm,
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

  const actionPool = React.useMemo(() => {
    const byId = new Map<string, AiAgentControlActionRequest>();
    for (const action of queueQuery.data?.action_requests ?? []) byId.set(action.id, action);
    for (const action of actionsQuery.data?.items ?? []) byId.set(action.id, action);
    return Array.from(byId.values());
  }, [actionsQuery.data, queueQuery.data]);

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
    rejectMutation,
    revokePauseMutation,
    setError,
    setMessage,
    setAutonomyMutation,
    settingsQuery,
    targetsQuery,
    updateAgentMutation,
    updateAgentStatusMutation,
    updateSettingsMutation,
  };
}
