import {
  TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
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

export const LOW_RISK_AUTOMATION_ALLOWLIST = ['internal_note', 'classification', 'status'] as const;

const APPROVED_CAPABILITY_BY_ACTION_CLASS: Record<string, string> = {
  internal_note: TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  classification: TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  status: TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
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

export function isLowRiskAutomationActionClass(value: string | null | undefined): value is typeof LOW_RISK_AUTOMATION_ALLOWLIST[number] {
  return LOW_RISK_AUTOMATION_ALLOWLIST.includes(value as typeof LOW_RISK_AUTOMATION_ALLOWLIST[number]);
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
