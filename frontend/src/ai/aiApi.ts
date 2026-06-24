import { getAccessToken } from '../auth/accessTokenStore';
import api from '../api';
import {
  ChatStreamEvent,
  AiApiKeyRecord,
  AiMutationPreview,
  BuiltinUsage,
  ChatConversation,
  ConversationMessagesResponse,
} from './aiTypes';
import i18n from '../i18n';

const MAX_STREAM_BUFFER_CHARS = 1_048_576;

export type ProviderDescriptor = {
  id: string;
  label: string;
  description: string;
  capabilities: {
    supportsStreaming: boolean;
    supportsToolCalling: boolean;
    requiresApiKey: boolean;
    allowsCustomEndpoint: boolean;
  };
};

export type AiWebSearchTestResult = {
  ok: boolean;
  message: string;
  latency_ms: number | null;
};

export type AiGlpiTestResult = {
  ok: boolean;
  message: string;
  latency_ms: number | null;
};

export type AiSettingsPayload = {
  instance_features: { ai_chat: boolean; ai_mcp: boolean; ai_settings: boolean; ai_web_search: boolean };
  settings: {
    chat_enabled: boolean;
    mcp_enabled: boolean;
    provider_source: 'builtin' | 'custom';
    llm_provider: string | null;
    llm_endpoint_url: string | null;
    llm_model: string | null;
    mcp_key_max_lifetime_days: number | null;
    conversation_retention_days: number | null;
    web_search_enabled: boolean;
    glpi_enabled: boolean;
    glpi_url: string | null;
    has_glpi_user_token: boolean;
    has_glpi_app_token: boolean;
    has_llm_api_key: boolean;
    provider_secret_writable: boolean;
    provider_validation_errors: string[];
    chat_ready: boolean;
    created_at: string;
    updated_at: string;
  };
  available_providers: ProviderDescriptor[];
};

export type AiProviderTestResult = {
  ok: boolean;
  provider: string | null;
  model: string | null;
  latency_ms: number | null;
  message: string;
  validation_errors: string[];
};

export type AiUsageWindow = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  message_count: number;
};

export type AiAdminOverview = {
  totals: {
    conversations_all: number;
    conversations_7d: number;
    conversations_30d: number;
    active_users_30d: number;
  };
  usage: {
    current_month: AiUsageWindow;
    last_30_days: AiUsageWindow;
  };
  recent_activity: Array<{
    conversation_id: string;
    title: string | null;
    user_id: string | null;
    provider: string | null;
    model: string | null;
    updated_at: string;
  }>;
};

export type AiAgentControlRunItem = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  conversation_id: string | null;
  request_id: string | null;
  ai_api_key_id: string | null;
  invocation_channel: string;
  trigger_kind: string;
  status: string;
  input_summary: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  usage_json: Record<string, unknown> | null;
  cost_json: Record<string, unknown> | null;
  metadata_json: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  counts?: {
    tool_executions: number;
    evidence: number;
    action_requests: number;
    pending_actions: number;
  };
};

export type AiAgentControlToolExecution = {
  id: string;
  run_id: string;
  action_request_id: string | null;
  approval_id: string | null;
  capability_name: string;
  capability_version: string;
  surface: string;
  effect: string;
  status: string;
  input_summary: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  metadata_json: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
};

export type AiAgentControlEvidence = {
  id: string;
  run_id: string | null;
  tool_execution_id: string | null;
  action_request_id: string | null;
  source_provider: string;
  source_object_type: string;
  source_object_id: string | null;
  trust_level: string;
  redaction_status: string;
  summary: string;
  payload_json: Record<string, unknown> | unknown[] | null;
  collected_at: string | null;
  created_at: string | null;
};

export type AiAgentControlObservation = {
  id: string;
  run_id: string | null;
  observation_type: string;
  status: string;
  source_provider: string;
  source_object_type: string;
  severity: string | null;
  summary: string;
  evidence_ids: string[] | null;
  created_at: string | null;
};

export type AiAgentControlRecommendation = {
  id: string;
  run_id: string | null;
  observation_id: string | null;
  recommendation_type: string;
  status: string;
  summary: string;
  rationale: string | null;
  confidence: number | null;
  proposed_action_class: string | null;
  max_autonomy_level: string;
  evidence_ids: string[] | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string | null;
};

export type AiAgentControlDecision = {
  id: string;
  run_id: string | null;
  recommendation_id: string | null;
  decision: string;
  status: string;
  reason: string;
  created_at: string | null;
};

export type AiAgentControlEvaluation = {
  id: string;
  run_id: string | null;
  recommendation_id: string | null;
  decision_id: string | null;
  status: string;
  outcome: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string | null;
};

export type AiAgentControlActionRequest = {
  id: string;
  run_id: string | null;
  tool_execution_id: string | null;
  capability_name: string;
  capability_version: string;
  effect: string;
  status: string;
  target_type: string | null;
  target_id: string | null;
  target_ref: string | null;
  action_payload_json: Record<string, unknown> | null;
  provider_kind: string | null;
  provider_key: string | null;
  input_summary: Record<string, unknown> | null;
  evidence_ids: string[] | null;
  expires_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  executed_at: string | null;
  error_message: string | null;
  metadata_json: Record<string, unknown> | null;
  execution_readiness: {
    can_execute: boolean;
    can_reject: boolean;
    blocked_reason: string | null;
    requires_sandbox_write_target: boolean;
    sandbox_write_target_ref: string | null;
  } | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AiAgentControlAgentDefinition = {
  id: string;
  agent_key: string;
  name: string;
  description: string | null;
  agent_type: string;
  status: string;
  environment: string;
  provider_bindings_json: Record<string, unknown> | null;
  allowed_capabilities_json: Record<string, unknown> | unknown[] | null;
  forbidden_capabilities_json: Record<string, unknown> | unknown[] | null;
  max_autonomy_level: string;
  default_approval_requirement: string;
  agent_priority: number;
  trigger_policy_json: Record<string, unknown> | null;
  scope_policy_json: Record<string, unknown> | null;
  queue_policy_json: Record<string, unknown> | null;
  response_policy_json: Record<string, unknown> | null;
  evaluation_policy_json: Record<string, unknown> | null;
  persona_json: Record<string, unknown> | null;
  config_version: number;
  updated_by_user_id: string | null;
  metadata_json: Record<string, unknown> | null;
  // Action classes currently running automatically (enabled autonomy policies).
  automatic_action_classes?: string[];
  created_at: string | null;
  updated_at: string | null;
};

export type AiAgentControlAgentDefinitionInput = {
  agent_key?: string | null;
  name?: string | null;
  description?: string | null;
  agent_type?: string | null;
  environment?: string | null;
  agent_priority?: number | null;
  provider_bindings_json?: Record<string, unknown> | null;
  allowed_capabilities_json?: Record<string, unknown> | unknown[] | null;
  persona_json?: Record<string, unknown> | null;
  trigger_policy_json?: Record<string, unknown> | null;
  scope_policy_json?: Record<string, unknown> | null;
  knowledge_sources?: Record<string, unknown> | null;
  queue_policy_json?: Record<string, unknown> | null;
  response_policy_json?: Record<string, unknown> | null;
  evaluation_policy_json?: Record<string, unknown> | null;
};

export type AiAgentControlRefItem = {
  value: string;
  label: string;
  metadata?: Record<string, unknown>;
};

export type AiKnowledgeLibrary = {
  id: string;
  name: string;
  slug?: string | null;
};

export type AiAgentControlAutonomyItem = {
  actionClass: string;
  capabilityName: string | null;
  mode: 'ask_first' | 'automatic';
  allowlisted: boolean;
  eligible: boolean;
  recommendationOverrideAvailable?: boolean;
  hardReasons?: string[];
  reasons: string[];
  progress: {
    decided: number;
    required: number;
    acceptanceRate: number | null;
    requiredRate: number;
    daysActive: number;
    requiredDays: number;
  };
  effectiveCeiling: string | null;
  demotion: { at: string; reason: string } | null;
  policy: {
    id: string;
    policy_key: string;
    policy_version: number;
    enabled: boolean;
    status: string;
    live_test_safety: string;
  } | null;
};

export type AiAgentControlAutonomyResult = {
  agent_definition: AiAgentControlAgentDefinition;
  lowRiskAutomationAllowlist: string[];
  items: AiAgentControlAutonomyItem[];
};

export type AiAgentControlWorkItem = {
  id: string;
  agent_definition_id: string;
  trigger_id: string | null;
  source_provider_kind: string;
  source_provider_key: string;
  source_object_type: string;
  source_object_ref: string;
  source_object_updated_at: string | null;
  work_kind: string;
  status: string;
  priority: number;
  dedup_key: string;
  lease_owner: string | null;
  leased_until: string | null;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string | null;
  last_run_id: string | null;
  last_action_request_ids: string[] | null;
  last_error: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AiAgentControlTargetState = {
  id: string;
  agent_definition_id: string;
  provider_kind: string;
  provider_key: string;
  target_type: string;
  target_ref: string;
  last_seen_external_updated_at: string | null;
  last_processed_external_updated_at: string | null;
  next_review_at: string | null;
  last_run_id: string | null;
  last_public_reply_hash: string | null;
  last_internal_note_hash: string | null;
  last_classification_hash: string | null;
  last_assignment_hash: string | null;
  agent_touched: boolean;
  needs_followup: boolean;
  claim_status: string;
  claim_expires_at: string | null;
  claim_acquired_at: string | null;
  claim_owner_work_item_id: string | null;
  claim_owner_run_id: string | null;
  claim_owner_priority: number | null;
  claim_owner_action_request_ids: string[] | null;
  claim_metadata_json: Record<string, unknown> | null;
  state_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AiAgentControlTargetingPreview = {
  matchEstimate: number;
  sampleSize: number;
  capped: boolean;
  overlapEstimate: number;
  runsPerDayEstimate: number;
  resolution: Array<{
    predicate: { field: string; operator: string; value: unknown };
    resolution: 'pushed_down' | 'locally_filtered_bounded_fetch' | 'control_plane_resolved' | 'unsupported';
    reason: string;
  }>;
};

export type AiAgentControlAuditEvent = {
  id: string;
  tenant_id: string;
  agent_definition_id: string | null;
  work_item_id: string | null;
  event_type: string;
  severity: string;
  message: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string | null;
};

export type AiAgentControlHelpdeskSummary = {
  agentDefinitionId: string;
  ingestion: {
    enabled: boolean;
    mode: string;
    paused: boolean;
    pauseReason: string | null;
    enabledAt: string | null;
    createdAfter: string | null;
    entityId: string | null;
    categoryId: string | null;
    maxTicketsPerCycle: number | null;
    maxProviderRequestsPerCycle: number | null;
    lastPollAt: string | null;
    lastPollStatus: string | null;
    lastAuditEventId: string | null;
  };
  guardrails: {
    configured: boolean;
    perRun: {
      maxEstimatedTokens: number;
      maxEstimatedCostEur: number;
    } | null;
    daily: {
      windowStart: string;
      windowEnd: string;
      runs: number;
      estimatedTokens: number;
      estimatedCostEur: number;
      cap: {
        maxRuns: number;
        maxTokens: number;
        maxCostEur: number;
      };
      reached: boolean;
      reachedReasons: string[];
    } | null;
  };
  emergencyPause: AiAgentControlEmergencyPause | null;
  evaluation: {
    windowStart: string;
    windowEnd: string;
    proposalsByActionClass: Record<string, number>;
    terminalByStatus: Record<string, number>;
    acceptanceRate: number | null;
    rejectionReasons: Record<string, number>;
    medianApprovalLatencySeconds: number | null;
    runsPerTicket: number | null;
    tokensPerTicket: number | null;
    costPerTicketEur: number | null;
    kbHitRate: number | null;
  };
};

export type AiAgentControlQueueOverview = {
  definitions: AiAgentControlAgentDefinition[];
  work_items: AiAgentControlWorkItem[];
  target_states: AiAgentControlTargetState[];
  action_requests: AiAgentControlActionRequest[];
  counts: Record<string, number>;
  helpdesk?: {
    summary: AiAgentControlHelpdeskSummary | null;
    summaries?: AiAgentControlHelpdeskSummary[];
    fleet?: AiAgentControlHelpdeskSummary['evaluation'] | null;
    audit_events: AiAgentControlAuditEvent[];
  };
};

export type AiAgentControlHelpdeskContextRead = {
  run_id: string;
  step_id: string;
  tool_execution_id: string;
  evidence_ids: string[];
  output: unknown;
};

export type AiAgentControlHelpdeskContextResult = {
  work_item: AiAgentControlWorkItem;
  target_state: AiAgentControlTargetState | null;
  run_id: string;
  classification: AiAgentControlHelpdeskContextRead;
  lifecycle: AiAgentControlHelpdeskContextRead;
  routing: AiAgentControlHelpdeskContextRead;
  participants: AiAgentControlHelpdeskContextRead;
};

export type AiAgentControlApproval = {
  id: string;
  action_request_id: string;
  capability_name: string;
  capability_version: string;
  source: string;
  status: string;
  actor_user_id: string | null;
  actor_label: string | null;
  reason: string | null;
  expires_at: string | null;
  decided_at: string | null;
  created_at: string | null;
};

export type AiAgentControlRunStep = {
  id: string;
  run_id: string;
  step_index: number;
  kind: string;
  status: string;
  capability_name: string | null;
  capability_version: string | null;
  input_summary: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
};

export type AiAgentControlRunDetail = {
  run: AiAgentControlRunItem;
  run_steps: AiAgentControlRunStep[];
  tool_executions: AiAgentControlToolExecution[];
  evidence: AiAgentControlEvidence[];
  observations: AiAgentControlObservation[];
  recommendations: AiAgentControlRecommendation[];
  decisions: AiAgentControlDecision[];
  evaluations: AiAgentControlEvaluation[];
  action_requests: AiAgentControlActionRequest[];
  approvals: AiAgentControlApproval[];
};

export type AiAgentControlMockTriageResult = {
  diagnostic: {
    run_id: string | null;
    evidence_ids: string[];
    observation_ids: string[];
    recommendation_id: string;
    decision_id: string;
    evaluation_id: string;
  };
  proposal: {
    run_id: string | null;
    action_request_id: string;
    decision_id: string;
    evaluation_id: string;
  };
  detail: AiAgentControlRunDetail;
};

export type AiAgentControlLiveTarget = {
  id: string;
  tenant_id: string;
  provider_kind: string;
  provider_key: string;
  environment: string;
  target_kind: string;
  target_key: string;
  external_ref: string;
  allowed_effect: string;
  safety_label: string;
  enabled: boolean;
  expires_at: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AiAgentControlGlpiReadTargetsResult = {
  provider: {
    provider_kind: string;
    provider_key: string;
    available: boolean;
    reason_code: string | null;
    message: string | null;
  };
  items: AiAgentControlLiveTarget[];
  ready: boolean;
};

export type AiAgentControlGlpiReadResult = {
  target: AiAgentControlLiveTarget;
  result: {
    run_id: string;
    step_id: string;
    tool_execution_id: string;
    output: unknown;
  };
  detail: AiAgentControlRunDetail;
};

export type AiAgentControlGlpiTriageResult = {
  target: AiAgentControlLiveTarget;
  agent_definition: AiAgentControlAgentDefinition | null;
  work_item: AiAgentControlWorkItem | null;
  target_state: AiAgentControlTargetState | null;
  diagnostic: {
    run_id: string;
    ticket_tool_execution_id: string;
    ticket_notes_tool_execution_id?: string;
    knowledge_tool_execution_id: string;
    knowledge_tool_execution_ids?: string[];
    knowledge_query?: string;
    knowledge_query_candidates?: string[];
    knowledge_search_plan?: Record<string, unknown>;
    knowledge_query_attempts?: Array<{
      query: string;
      result_count: number;
      tool_execution_id: string;
    }>;
    knowledge_candidates?: Array<{
      ref?: string | null;
      title?: string | null;
      search_queries?: string[];
    }>;
    knowledge_result_interpretation?: Record<string, unknown>;
    internal_note_tool_execution_id?: string | null;
    public_reply_tool_execution_id?: string | null;
    evidence_ids: string[];
    observation_id: string;
    recommendation_id: string;
    decision_id: string;
    evaluation_id: string;
    action_request_ids?: string[];
    automatic_executions?: Array<{
      action_request_id: string;
      action_class: string;
      status: 'executed' | 'skipped' | 'failed';
      tool_execution_id: string | null;
      error_message: string | null;
    }>;
    conversation_gate?: {
      can_prepare_internal_note?: boolean;
      can_prepare_public_reply?: boolean;
      internal_note_reason?: string;
      public_reply_reason?: string;
      latest_requester_message_at?: string | null;
      latest_requester_message_id?: string | null;
      last_agent_internal_note_at?: string | null;
      last_agent_internal_note_action_id?: string | null;
      last_agent_public_reply_at?: string | null;
      last_agent_public_reply_action_id?: string | null;
      requester_classification_confidence?: string;
      ticket_history_entry_count?: number;
      latest_ticket_note_id?: string | null;
      latest_ticket_note_at?: string | null;
      latest_ticket_note_fingerprint?: string | null;
      latest_requester_message_fingerprint?: string | null;
      prepared_at?: string | null;
    };
    skipped_actions?: {
      internal_note?: string | null;
      public_reply?: string | null;
    };
    ticket_history_entry_count?: number;
    knowledge_results: Array<{
      id?: string;
      ref?: string | null;
      title?: string | null;
      summary?: string | null;
      snippet?: string | null;
      status?: string | null;
      updated_at?: string | null;
    }>;
  };
  proposal: {
    run_id: string;
    step_id: string;
    tool_execution_id: string;
    output: unknown;
  } | null;
  public_reply_proposal?: {
    run_id: string;
    step_id: string;
    tool_execution_id: string;
    output: unknown;
  };
  detail: AiAgentControlRunDetail;
};

export type AiAgentControlHelpdeskIngestionPollResult = {
  tenantId: string;
  status: string;
  reason?: string | null;
  listed: number;
  enqueued: number;
  deduped: number;
  processed: number;
  errors: string[];
};

export type AiAgentControlEmergencyPause = {
  id: string;
  active: boolean;
  scope: string | null;
  agent_definition_id: string | null;
  reason: string;
  created_at: string | null;
  expires_at: string | null;
};

export type AiAgentControlBadgeSummary = {
  pendingApprovals: number;
};

export type AiAgentControlActivityType = 'proposal' | 'decision' | 'execution' | 'configuration' | 'pause' | 'error';

export type AiAgentControlActivityDetail = {
  capabilityName: string | null;
  body: string | null;
  changes: Array<{ field: string; from: string | null; to: string | null }> | null;
  reason: string | null;
  rationale: string | null;
  evidenceCount: number | null;
};

export type AiAgentControlActivityEntry = {
  id: string;
  at: string;
  type: AiAgentControlActivityType;
  agentDefinitionId: string | null;
  agentKey: string | null;
  targetType: string | null;
  targetRef: string | null;
  titleKey: string;
  status: string | null;
  actorUserId: string | null;
  actionRequestId: string | null;
  approvalId: string | null;
  runId: string | null;
  auditEventId: string | null;
  capabilityName: string | null;
  actionClass: string | null;
  eventType: string | null;
  severity: string | null;
  errorMessage: string | null;
  detail: AiAgentControlActivityDetail | null;
};

export type AiAgentControlActivityResult = {
  items: AiAgentControlActivityEntry[];
  total: number;
  limit: number;
  offset: number;
};

export type AiAgentControlEvaluationDailyResult = {
  days: Array<{
    day: string;
    proposals: number;
    decided: number;
    acceptanceRate: number | null;
    executed: number;
    costEur: number;
    tokens: number;
  }>;
};

export type AiAgentControlHelpdeskIngestionSettings = {
  agentDefinitionId: string;
  ingestion: {
    enabled: boolean;
    enabledAt: string | null;
    entityId: string | null;
    categoryId: string | null;
    maxTicketsPerCycle: number | null;
    maxProviderRequestsPerCycle: number | null;
    hardBackfillHorizonHours: number;
    ready: boolean;
    readyReason: string | null;
    effectiveCreatedAfter: string | null;
  };
  guardrails: {
    configured: boolean;
    perRun: { maxEstimatedTokens: number | null; maxEstimatedCostEur: number | null };
    daily: { maxAgentRuns: number | null; maxEstimatedTokens: number | null; maxEstimatedCostEur: number | null };
  };
  emergency_pause: AiAgentControlEmergencyPause | null;
};

export type AiAgentControlHelpdeskIngestionSettingsInput = {
  ingestion: {
    enabled: boolean;
    entityId?: string | null;
    categoryId?: string | null;
    maxTicketsPerCycle?: number | null;
    maxProviderRequestsPerCycle?: number | null;
    hardBackfillHorizonHours?: number | null;
  };
  guardrails?: {
    perRun?: { maxEstimatedTokens?: number | null; maxEstimatedCostEur?: number | null };
    daily?: { maxAgentRuns?: number | null; maxEstimatedTokens?: number | null; maxEstimatedCostEur?: number | null };
  };
};

export class ChatStreamRequestError extends Error {
  status: number;
  code: string | null;
  builtin_usage?: BuiltinUsage;

  constructor(
    message: string,
    opts: {
      status: number;
      code?: string | null;
      builtin_usage?: BuiltinUsage;
    },
  ) {
    super(message);
    this.name = 'ChatStreamRequestError';
    this.status = opts.status;
    this.code = opts.code ?? null;
    this.builtin_usage = opts.builtin_usage;
  }
}

function getBaseURL(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (!env) return 'http://localhost:8080';
  // If relative path (e.g. "/api"), resolve against current origin
  if (env.startsWith('/')) return window.location.origin + env;
  return env;
}

export async function* streamChat(params: {
  message: string;
  conversation_id?: string;
  attachment_ids?: string[];
  truncate_from_message_id?: string | null;
  signal?: AbortSignal;
}): AsyncGenerator<ChatStreamEvent> {
  const { signal, ...body } = params;
  const token = getAccessToken();
  const response = await fetch(`${getBaseURL()}/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }
    throw new ChatStreamRequestError(
      payload?.message || raw || i18n.t('ai:errors.streamRequestFailed'),
      {
        status: response.status,
        code: payload?.code ?? null,
        builtin_usage: payload?.builtin_usage,
      },
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error(i18n.t('ai:errors.noResponseBody'));

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > MAX_STREAM_BUFFER_CHARS) {
        throw new Error(i18n.t('ai:errors.streamBufferExceeded'));
      }

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      if (buffer.length > MAX_STREAM_BUFFER_CHARS) {
        throw new Error(i18n.t('ai:errors.streamBufferExceeded'));
      }

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          yield JSON.parse(trimmed) as ChatStreamEvent;
        } catch {
          // skip malformed lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer.trim()) as ChatStreamEvent;
      } catch {
        // skip
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore reader cleanup errors
    }
  }
}

export const aiConversationsApi = {
  async list(params?: { page?: number; limit?: number }): Promise<ChatConversation[]> {
    const res = await api.get('/ai/conversations', { params });
    return res.data;
  },
  async create(): Promise<ChatConversation> {
    const res = await api.post('/ai/conversations');
    return res.data;
  },
  async getMessages(id: string): Promise<ConversationMessagesResponse> {
    const res = await api.get(`/ai/conversations/${id}/messages`);
    const { messages, conversation_usage } = res.data;
    return { messages, conversation_usage };
  },
  async getPreviews(id: string): Promise<AiMutationPreview[]> {
    const res = await api.get(`/ai/conversations/${id}/previews`);
    return res.data;
  },
  async archive(id: string) {
    const res = await api.delete(`/ai/conversations/${id}`);
    return res.data;
  },
  async rename(id: string, title: string): Promise<ChatConversation> {
    const res = await api.patch(`/ai/conversations/${id}`, { title });
    return res.data;
  },
  async uploadInlineAttachment(conversationId: string, file: File): Promise<{
    id: string;
    conversation_id: string;
    mime_type: string;
    size: number;
    kind: string;
    original_filename: string;
  }> {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/ai/conversations/${conversationId}/attachments/inline`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  buildAttachmentUrl(conversationId: string, attachmentId: string): string {
    return `/ai/conversations/${conversationId}/attachments/${attachmentId}/inline`;
  },
};

export const aiAdminApi = {
  async getSettings(): Promise<AiSettingsPayload> {
    const res = await api.get('/ai/settings');
    return res.data;
  },
  async updateSettings(payload: Record<string, unknown>): Promise<{ settings: AiSettingsPayload['settings'] }> {
    const res = await api.patch('/ai/settings', payload);
    return res.data;
  },
  async testProvider(payload: Record<string, unknown>): Promise<AiProviderTestResult> {
    const res = await api.post('/ai/settings/test-provider', payload);
    return res.data;
  },
  async testWebSearch(): Promise<AiWebSearchTestResult> {
    const res = await api.post('/ai/settings/test-web-search');
    return res.data;
  },
  async testGlpi(payload: Record<string, unknown>): Promise<AiGlpiTestResult> {
    const res = await api.post('/ai/settings/test-glpi', payload);
    return res.data;
  },
  async getOverview(): Promise<AiAdminOverview> {
    const res = await api.get('/ai/admin/overview');
    return res.data;
  },
  async getBuiltinUsage(): Promise<BuiltinUsage> {
    const res = await api.get('/ai/settings/builtin-usage');
    return res.data;
  },
};

export const aiAgentControlApi = {
  async listAgents(): Promise<{ items: AiAgentControlAgentDefinition[] }> {
    const res = await api.get('/ai/admin/control-plane/agents');
    return res.data;
  },
  async createAgent(payload: AiAgentControlAgentDefinitionInput): Promise<{ agent_definition: AiAgentControlAgentDefinition }> {
    const res = await api.post('/ai/admin/control-plane/agents', payload);
    return res.data;
  },
  async getAgent(id: string): Promise<{ agent_definition: AiAgentControlAgentDefinition }> {
    const res = await api.get(`/ai/admin/control-plane/agents/${id}`);
    return res.data;
  },
  async updateAgent(id: string, payload: AiAgentControlAgentDefinitionInput): Promise<{
    agent_definition: AiAgentControlAgentDefinition;
    diff: Record<string, unknown>;
  }> {
    const res = await api.post(`/ai/admin/control-plane/agents/${id}`, payload);
    return res.data;
  },
  async updateAgentStatus(id: string, payload: { status: string }): Promise<{
    agent_definition: AiAgentControlAgentDefinition;
    diff: Record<string, unknown>;
  }> {
    const res = await api.post(`/ai/admin/control-plane/agents/${id}/status`, payload);
    return res.data;
  },
  async previewAgentTargeting(id: string, payload: { scope_policy_json?: Record<string, unknown> | null }): Promise<{ preview: AiAgentControlTargetingPreview }> {
    const res = await api.post(`/ai/admin/control-plane/agents/${id}/targeting-preview`, payload);
    return res.data;
  },
  async getAgentTargetingOptions(
    id: string,
    field: 'status' | 'priority' | 'type' | 'category' | 'entity',
    params: { query?: string; limit?: number } = {},
  ): Promise<{ options: AiAgentControlRefItem[] }> {
    const res = await api.get(`/ai/admin/control-plane/agents/${id}/targeting-options/${field}`, { params });
    return res.data;
  },
  async deleteAgent(id: string): Promise<{ deleted: boolean; id: string }> {
    const res = await api.delete(`/ai/admin/control-plane/agents/${id}`);
    return res.data;
  },
  async listKnowledgeLibraries(): Promise<AiKnowledgeLibrary[]> {
    const res = await api.get('/knowledge-libraries');
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },
  async getAgentAutonomy(id: string): Promise<AiAgentControlAutonomyResult> {
    const res = await api.get(`/ai/admin/control-plane/agents/${id}/autonomy`);
    return res.data;
  },
  async setAgentAutonomy(id: string, payload: {
    actionClass: string;
    mode: 'ask_first' | 'automatic';
    confirm?: boolean;
    overrideAcknowledged?: boolean;
    overrideReason?: string | null;
  }): Promise<AiAgentControlAutonomyResult> {
    const res = await api.post(`/ai/admin/control-plane/agents/${id}/autonomy`, payload);
    return res.data;
  },
  async listRuns(params?: { limit?: number; status?: string }): Promise<{ items: AiAgentControlRunItem[] }> {
    const res = await api.get('/ai/admin/control-plane/runs', { params });
    return res.data;
  },
  async getRun(id: string): Promise<AiAgentControlRunDetail> {
    const res = await api.get(`/ai/admin/control-plane/runs/${id}`);
    return res.data;
  },
  async listActions(params?: { limit?: number; status?: string }): Promise<{ items: AiAgentControlActionRequest[] }> {
    const res = await api.get('/ai/admin/control-plane/actions', { params });
    return res.data;
  },
  async getBadges(): Promise<AiAgentControlBadgeSummary> {
    const res = await api.get('/ai/admin/control-plane/badges');
    return res.data;
  },
  async listActivity(params?: {
    agentDefinitionId?: string | null;
    from?: string | null;
    to?: string | null;
    targetRef?: string | null;
    types?: AiAgentControlActivityType[] | null;
    actorUserId?: string | null;
    status?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<AiAgentControlActivityResult> {
    const res = await api.get('/ai/admin/control-plane/activity', {
      params: {
        ...params,
        types: params?.types?.join(','),
      },
    });
    return res.data;
  },
  async getHelpdeskEvaluationDaily(params?: { days?: number; agentDefinitionId?: string }): Promise<AiAgentControlEvaluationDailyResult> {
    const res = await api.get('/ai/admin/control-plane/helpdesk/evaluation/daily', { params });
    return res.data;
  },
  async getQueueOverview(params?: { limit?: number }): Promise<AiAgentControlQueueOverview> {
    const res = await api.get('/ai/admin/control-plane/queue', { params });
    return res.data;
  },
  async getHelpdeskWorkItemContext(id: string): Promise<AiAgentControlHelpdeskContextResult> {
    const res = await api.get(`/ai/admin/control-plane/queue/work-items/${id}/helpdesk-context`);
    return res.data;
  },
  async runMockTriage(payload?: {
    alert_id?: string;
    ticket_id?: string;
    include_directory?: boolean;
  }): Promise<AiAgentControlMockTriageResult> {
    const res = await api.post('/ai/admin/control-plane/uat/mock-triage', payload ?? {});
    return res.data;
  },
  async listGlpiReadTargets(): Promise<AiAgentControlGlpiReadTargetsResult> {
    const res = await api.get('/ai/admin/control-plane/uat/glpi-read/targets');
    return res.data;
  },
  async runGlpiRead(payload?: { target_key?: string }): Promise<AiAgentControlGlpiReadResult> {
    const res = await api.post('/ai/admin/control-plane/uat/glpi-read', payload ?? {});
    return res.data;
  },
  async runGlpiTriage(payload?: { target_key?: string }): Promise<AiAgentControlGlpiTriageResult> {
    const res = await api.post('/ai/admin/control-plane/uat/glpi-triage', payload ?? {});
    return res.data;
  },
  async pollHelpdeskGlpiIngestion(): Promise<AiAgentControlHelpdeskIngestionPollResult> {
    const res = await api.post('/ai/admin/control-plane/helpdesk/glpi-ingestion/poll', {});
    return res.data;
  },
  async getHelpdeskIngestionSettings(): Promise<AiAgentControlHelpdeskIngestionSettings> {
    const res = await api.get('/ai/admin/control-plane/helpdesk/glpi-ingestion/settings');
    return res.data;
  },
  async updateHelpdeskIngestionSettings(
    payload: AiAgentControlHelpdeskIngestionSettingsInput,
  ): Promise<AiAgentControlHelpdeskIngestionSettings> {
    const res = await api.post('/ai/admin/control-plane/helpdesk/glpi-ingestion/settings', payload);
    return res.data;
  },
  async createHelpdeskEmergencyPause(payload: { reason: string; expires_in_minutes?: number | null }): Promise<AiAgentControlEmergencyPause> {
    const res = await api.post('/ai/admin/control-plane/helpdesk/emergency-pause', payload);
    return res.data;
  },
  async revokeHelpdeskEmergencyPause(id: string): Promise<AiAgentControlEmergencyPause> {
    const res = await api.post(`/ai/admin/control-plane/helpdesk/emergency-pause/${id}/revoke`, {});
    return res.data;
  },
  async createEmergencyPause(payload: {
    scope: 'tenant' | 'agent';
    agent_definition_id?: string | null;
    reason: string;
    expires_in_minutes?: number | null;
  }): Promise<AiAgentControlEmergencyPause> {
    const res = await api.post('/ai/admin/control-plane/emergency-pause', payload);
    return res.data;
  },
  async revokeEmergencyPause(id: string): Promise<AiAgentControlEmergencyPause> {
    const res = await api.post(`/ai/admin/control-plane/emergency-pause/${id}/revoke`, {});
    return res.data;
  },
  async approveAction(id: string, payload?: { execute?: boolean }): Promise<{
    action: AiAgentControlActionRequest;
    approval: AiAgentControlApproval;
    execution: unknown;
    detail: AiAgentControlRunDetail | null;
  }> {
    const res = await api.post(`/ai/admin/control-plane/actions/${id}/approve`, payload ?? { execute: true });
    return res.data;
  },
  async rejectAction(id: string, payload?: { reason?: string }): Promise<{
    action: AiAgentControlActionRequest;
    approval: AiAgentControlApproval;
    detail: AiAgentControlRunDetail | null;
  }> {
    const res = await api.post(`/ai/admin/control-plane/actions/${id}/reject`, payload ?? {});
    return res.data;
  },
};

export type EntitySearchResult = {
  entity_type: string;
  id: string;
  ref: string | null;
  label: string | null;
};

export const aiSearchApi = {
  async searchEntities(
    q: string,
    opts?: { entityTypes?: string[]; signal?: AbortSignal },
  ): Promise<EntitySearchResult[]> {
    const trimmed = q.trim();
    const entityTypes = opts?.entityTypes ?? [];
    const hasEntityTypeNarrow = entityTypes.length > 0;
    if (!trimmed && !hasEntityTypeNarrow) return [];
    const params: Record<string, string> = { q: trimmed };
    if (hasEntityTypeNarrow) {
      params.entity_types = entityTypes.join(',');
    }
    const res = await api.get('/ai/search/entities', { params, signal: opts?.signal });
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },
};

export const aiKeysApi = {
  async create(params: { label: string; expires_at?: string }): Promise<{ key: string; record: AiApiKeyRecord }> {
    const res = await api.post('/ai/keys', params);
    return res.data;
  },
  async list(): Promise<AiApiKeyRecord[]> {
    const res = await api.get('/ai/keys');
    return res.data;
  },
  async revoke(id: string): Promise<AiApiKeyRecord> {
    const res = await api.delete(`/ai/keys/${id}`);
    return res.data;
  },
  async adminList(): Promise<AiApiKeyRecord[]> {
    const res = await api.get('/ai/admin/keys');
    return res.data;
  },
  async adminRevoke(id: string): Promise<AiApiKeyRecord> {
    const res = await api.delete(`/ai/admin/keys/${id}`);
    return res.data;
  },
};
