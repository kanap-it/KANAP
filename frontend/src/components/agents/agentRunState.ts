import React from 'react';
import { useAgentControlData } from '../../pages/agents/useAgentControlData';
import {
  buildTicketGroups,
  lifecycleStatusKey,
  resolveAgentSummary,
} from './agentControlPrimitives';

// Run-mode control values, collapsing the two backend axes (definition.status +
// trigger_policy.scheduled_poll.enabled) into one plain-language choice:
// Off = nothing runs; Manual = the agent only runs when you ask (Check now,
// tests); Watching = Manual plus the scheduled check.
export type RunModeKey = 'off' | 'manual' | 'watching';
export const RUN_MODES: RunModeKey[] = ['off', 'manual', 'watching'];

export const DEFAULT_CHECK_INTERVAL_MINUTES = 5;
const MIN_CHECK_INTERVAL_MINUTES = 5;
const MAX_CHECK_INTERVAL_MINUTES = 1440;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function policyObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function targetingPredicateCount(
  definition: { scope_policy_json?: unknown } | null | undefined,
): number {
  const predicates = policyObject(policyObject(definition?.scope_policy_json).targeting).predicates;
  return Array.isArray(predicates) ? predicates.length : 0;
}

// Legacy helpdesk agents can be scoped purely through the ingestion
// entity/category config (pre-targeting-builder state, still enforced by the
// backend) with zero scope-policy predicates — both must read as "Filtered".
export function helpdeskScopeFiltered(
  definition: { scope_policy_json?: unknown } | null | undefined,
  ingestion: { entityId?: string | null; categoryId?: string | null } | null | undefined,
): boolean {
  return targetingPredicateCount(definition) > 0 || !!(ingestion?.entityId || ingestion?.categoryId);
}

/**
 * Everything the control bar and the Monitor "Status" section need to describe
 * one agent's live state, derived once so the two surfaces can never disagree
 * about whether an agent is watching, paused, or merely on standby.
 *
 * Both callers instantiate their own `useAgentControlData`; they share the
 * react-query cache, so this is a read of the same data, not a second fetch.
 */
export function useAgentRunState(agentKey: string) {
  const data = useAgentControlData({ targetAgentKey: agentKey });
  const definition = data.queueQuery.data?.definitions.find((item) => item.agent_key === agentKey) ?? null;
  const summary = resolveAgentSummary(data.queueQuery.data, agentKey);
  const isSre = definition?.agent_type === 'sre';

  // SRE agents have no helpdesk ingestion summary, so watching / last-check come
  // from the definition itself (trigger policy + the poller's stored state).
  const scheduledPoll = policyObject(policyObject(definition?.trigger_policy_json).scheduled_poll);
  const sreWatching = scheduledPoll.enabled === true;
  const targetingPredicates = targetingPredicateCount(definition);
  const sreTargetingPredicateCount = targetingPredicates;
  const scopeFiltered = isSre
    ? targetingPredicates > 0
    : helpdeskScopeFiltered(definition, summary?.ingestion ?? null);
  // "Next check" follows the agent's own check frequency (trigger policy), not
  // the platform cron tick. Mirror of the backend clamp in
  // ai-agent-check-interval.ts — an absent key means the 5-minute default.
  const storedCheckInterval = scheduledPoll.interval_minutes;
  const checkIntervalMinutes = typeof storedCheckInterval === 'number' && Number.isFinite(storedCheckInterval)
    ? Math.max(MIN_CHECK_INTERVAL_MINUTES, Math.min(MAX_CHECK_INTERVAL_MINUTES, Math.floor(storedCheckInterval)))
    : DEFAULT_CHECK_INTERVAL_MINUTES;
  const sreIngestionState = policyObject(policyObject(definition?.metadata_json).monitoring_ingestion_state);
  const sreLastPollStatus = typeof sreIngestionState.last_poll_status === 'string' ? sreIngestionState.last_poll_status : '';
  const sreLastPollAt = typeof sreIngestionState.last_poll_at === 'string' ? sreIngestionState.last_poll_at : '';
  const watching = isSre ? sreWatching : !!summary?.ingestion.enabled;

  const agentPause = summary?.emergencyPause ?? null;
  const tenantPause = data.queueQuery.data?.emergency_pause ?? null;
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

  const lifecycleKey = definition
    ? lifecycleStatusKey(
      definition.status,
      watching,
      definition.automatic_action_classes?.length ?? 0,
      !!activePause || !!summary?.ingestion.paused,
    )
    : null;

  const grouped = React.useMemo(
    () => buildTicketGroups(data.queueQuery.data ?? null, data.actionPool, definition?.id ?? null, Date.now()),
    [data.actionPool, data.queueQuery.data, definition?.id],
  );
  const waitingCount = grouped.groups.filter((group) => group.queueStatus === 'waiting_approval').length;
  const inProgressCount = grouped.groups.filter((group) => ['queued', 'leased', 'running'].includes(group.queueStatus)).length;
  const failedCount = grouped.groups.filter((group) => ['failed', 'dead_letter'].includes(group.queueStatus)).length;

  return {
    data,
    definition,
    summary,
    isSre,
    watching,
    sreWatching,
    sreTargetingPredicateCount,
    targetingPredicates,
    scopeFiltered,
    sreLastPollStatus,
    sreLastPollAt,
    checkIntervalMinutes,
    agentPause,
    tenantPause,
    activePause,
    runMode,
    isArchived,
    lifecycleKey,
    waitingCount,
    inProgressCount,
    failedCount,
    daily: summary?.guardrails.daily ?? null,
  };
}
