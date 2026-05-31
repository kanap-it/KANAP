export type PolicyDecisionOutcome = 'human_required' | 'policy_approved' | 'system_rejected';

export type PolicyDecisionReason = {
  code: string;
  detail: string;
  severity?: 'info' | 'warning' | 'deny';
};

export type PolicyDecisionRecord = {
  outcome: PolicyDecisionOutcome;
  approved: boolean;
  reasons: PolicyDecisionReason[];
  matched_policy_id?: string | null;
  matched_policy_key?: string | null;
  matched_policy_version?: number | null;
  effective_autonomy_level?: string | null;
  required_autonomy_level?: string | null;
  autonomy_components?: Record<string, string | null>;
  evidence_ids?: string[];
  surface?: string | null;
  trigger_kind?: string | null;
};
