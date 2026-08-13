import {
  TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
  TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
} from '../capability/capability-contract';

export const AGENT_AUTONOMY_POLICY_SOURCE = 'agent_autonomy_grant';

export type AgentAutonomyMode = 'ask_first' | 'automatic';
export type AgentAutonomyActionClass =
  | 'internal_note'
  | 'classification'
  | 'status'
  | 'public_reply'
  | 'assignment'
  | 'participant';

/**
 * Automation risk tier per action class.
 *
 * Every action class can now be automated — the tier decides how the grant is
 * ceremonially obtained, not whether the runtime may execute it:
 *
 *  - `low`  (internal note, classification, status): unchanged behaviour. The
 *    eval gates are soft recommendations; the existing light override covers a
 *    grant made before the thresholds are met.
 *  - `high` (requester reply, assignment, participants): the agent would act in
 *    front of the requester or move work between people without a human in the
 *    loop, so the acknowledgement + written reason are ALWAYS required — even
 *    when every eval gate already passes. Enforced server-side in
 *    `setAgentAutonomy`; the client dialog only mirrors it.
 *
 * Hard blocks are unaffected by the tier: a capability the agent is not allowed
 * to use, and an open incident, still refuse the grant outright.
 */
export type AgentAutonomyRiskTier = 'low' | 'high';

export const AUTONOMY_RISK_TIER_BY_ACTION_CLASS: Record<AgentAutonomyActionClass, AgentAutonomyRiskTier> = {
  internal_note: 'low',
  classification: 'low',
  status: 'low',
  public_reply: 'high',
  assignment: 'high',
  participant: 'high',
};

const APPROVED_CAPABILITY_BY_ACTION_CLASS: Record<string, string> = {
  internal_note: TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  classification: TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  status: TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
  public_reply: TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
  assignment: TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  participant: TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
};

export function actionClassForCapabilityName(capabilityName: string): AgentAutonomyActionClass | string {
  if (capabilityName.includes('internal_note')) return 'internal_note';
  if (capabilityName.includes('public_reply')) return 'public_reply';
  if (capabilityName.includes('classification_update')) return 'classification';
  if (capabilityName.includes('status_update')) return 'status';
  if (capabilityName.includes('assignment_update')) return 'assignment';
  if (capabilityName.includes('participant_update')) return 'participant';
  return capabilityName;
}

export function approvedCapabilityForAutonomyActionClass(actionClass: string): string | null {
  return APPROVED_CAPABILITY_BY_ACTION_CLASS[actionClass] ?? null;
}

/** Risk tier of an action class, or null when the class is not automatable at all. */
export function autonomyRiskTier(value: string | null | undefined): AgentAutonomyRiskTier | null {
  if (typeof value !== 'string') return null;
  return AUTONOMY_RISK_TIER_BY_ACTION_CLASS[value as AgentAutonomyActionClass] ?? null;
}

/** True for every action class covered by the risk-tier map (all six today). */
export function isAutomatableAutonomyActionClass(value: string | null | undefined): value is AgentAutonomyActionClass {
  return autonomyRiskTier(value) !== null;
}

/**
 * High tier ⇒ the grant always needs an explicit acknowledgement and a written
 * reason, whatever the eligibility says.
 */
export function autonomyGrantRequiresAcknowledgement(value: string | null | undefined): boolean {
  return autonomyRiskTier(value) === 'high';
}

export function isAgentAutonomyPolicyMetadata(metadata: unknown): metadata is {
  created_by: typeof AGENT_AUTONOMY_POLICY_SOURCE;
  agent_definition_id: string;
  action_class: string;
} {
  return !!metadata
    && typeof metadata === 'object'
    && !Array.isArray(metadata)
    && (metadata as Record<string, unknown>).created_by === AGENT_AUTONOMY_POLICY_SOURCE
    && typeof (metadata as Record<string, unknown>).agent_definition_id === 'string'
    && typeof (metadata as Record<string, unknown>).action_class === 'string';
}

export function agentAutonomyPolicyKey(agentDefinitionId: string, actionClass: string): string {
  return `agent-autonomy:${agentDefinitionId}:${actionClass}`;
}
