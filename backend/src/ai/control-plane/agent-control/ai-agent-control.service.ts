import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, In } from 'typeorm';
import { Features } from '../../../config/features';
import { AiExecutionContextWithManager } from '../../ai.types';
import {
  AGENT_AUTONOMY_POLICY_SOURCE,
  AgentAutonomyMode,
  actionClassForCapabilityName,
  agentAutonomyPolicyKey,
  approvedCapabilityForAutonomyActionClass,
  isAgentAutonomyPolicyMetadata,
  isLowRiskAutomationActionClass,
  LOW_RISK_AUTOMATION_ALLOWLIST,
} from '../agent/ai-agent-autonomy';
import {
  AgentQueueLiveTargetLike,
  AiAgentWorkQueueService,
  DEFAULT_APPROVAL_TTL_SECONDS,
  HELP_DESK_TICKETING_TRIAGE_AGENT_KEY,
} from '../agent/ai-agent-work-queue.service';
import { LEGACY_GLPI_TICKETING_PROVIDER_KEY } from '../providers/provider-constants';
import { requireTicketingBinding } from '../agent/ticketing-binding';
import {
  normalizeServiceDeskScopePolicy,
  normalizeServiceDeskTargeting,
  TargetingPreviewSummary,
  ticketMatchesServiceDeskTargeting,
} from '../agent/service-desk-targeting';
import { AiApprovalService } from '../approval/ai-approval.service';
import {
  CapabilityExecutionResult,
  TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_ASSIGNMENT_UPDATE_PREPARE_CAPABILITY,
  TICKETING_CLASSIFICATION_CONTEXT_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_PREPARE_CAPABILITY,
  TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY,
  TICKETING_LIFECYCLE_CONTEXT_CAPABILITY,
  TICKETING_PARTICIPANT_CONTEXT_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_PREPARE_CAPABILITY,
  TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
  TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY,
  TICKETING_ROUTING_CONTEXT_CAPABILITY,
  TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
  TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY,
  TICKETING_TICKET_ATTACHMENT_READ_CAPABILITY,
  TICKETING_TICKET_NOTES_LIST_CAPABILITY,
} from '../capability/capability-contract';
import { AiCapabilityRegistry, providerCapabilityContracts } from '../capability/ai-capability.registry';
import { AiCapabilityDispatcherService } from '../dispatcher/ai-capability-dispatcher.service';
import { AiReadonlyDiagnosticWorkflowService } from '../diagnostics/ai-readonly-diagnostic-workflow.service';
import { AiActionRequest } from '../entities/ai-action-request.entity';
import { hashStableJson } from '../evidence/ai-evidence.service';
import { AiAgentAuditEvent } from '../entities/ai-agent-audit-event.entity';
import { AiAgentDefinition } from '../entities/ai-agent-definition.entity';
import { AiAgentTargetState } from '../entities/ai-agent-target-state.entity';
import { AiAgentWorkItem } from '../entities/ai-agent-work-item.entity';
import { AiApproval } from '../entities/ai-approval.entity';
import { AiApprovalPolicy } from '../entities/ai-approval-policy.entity';
import { AiDecision } from '../entities/ai-decision.entity';
import { AiEvaluation } from '../entities/ai-evaluation.entity';
import { AiEvidence } from '../entities/ai-evidence.entity';
import { AiLiveTestTarget } from '../entities/ai-live-test-target.entity';
import { AiObservation } from '../entities/ai-observation.entity';
import { AiRecommendation } from '../entities/ai-recommendation.entity';
import { AiRun } from '../entities/ai-run.entity';
import { AiRunStep } from '../entities/ai-run-step.entity';
import { AiToolExecution } from '../entities/ai-tool-execution.entity';
import { AiLiveTestTargetService } from '../live-readiness/ai-live-test-target.service';
import { AiProviderRegistryService } from '../providers/provider-registry.service';
import {
  ProviderActionExecutionReadiness,
  ProviderActionPlannerProfile,
  RefItem,
  TicketAttachmentReadResult,
  TicketAttachmentRef,
  TicketRecord,
  TicketReferenceCatalogKind,
} from '../providers/provider.types';
import {
  AiAgentPromptCompilerService,
  CompiledAgentProfile,
  CompiledGuidance,
  compileSystemPrompt,
  guidanceHash,
  RUNTIME_SAFETY_FLOOR_ACTION_PLANNER,
  RUNTIME_SAFETY_FLOOR_INTERPRETER,
  RUNTIME_SAFETY_FLOOR_PLANNER,
  RUNTIME_SAFETY_FLOOR_SYNTHESIS,
  VerbatimCandidate,
} from './ai-agent-prompt-compiler.service';
import {
  ActionPlannerResult,
  ActionPlannerPromptInput,
  AiAgentActionPlannerService,
  estimateActionPlannerUsage,
  PlannerAction,
  PlannerActionType,
} from './ai-agent-action-planner.service';
import {
  AiKnowledgeSearchPlannerService,
  KnowledgePlannerCandidate,
  KnowledgeResultInterpretation,
  KnowledgeSearchPlan,
} from './ai-knowledge-search-planner.service';
import {
  AiReplySynthesisService,
  estimateReplySynthesisUsage,
  ReplySynthesisRejectedSource,
  ReplySynthesisResult,
  ReplySynthesisSource,
} from './ai-reply-synthesis.service';
import {
  AiSharedContextProfileService,
  SharedContextProfileInput,
  SharedContextResolution,
} from './ai-shared-context-profile.service';
import {
  AiTicketEvidenceExtractionService,
  estimateTicketEvidenceExtractionUsage,
  TicketEvidenceExtractionResult,
} from './ai-ticket-evidence-extraction.service';
import {
  AiTicketNeedRepresentationService,
  estimateTicketNeedRepresentationUsage,
  TicketNeedRepresentationBuildResult,
} from './ai-ticket-need-representation.service';
import { KnowledgeQueryDerivation } from './ai-ticket-need-representation.types';

export type AgentControlListRunsOptions = {
  limit?: number;
  status?: string | null;
};

export type AgentControlListActionsOptions = {
  limit?: number;
  status?: string | null;
};

export type AgentControlActivityType = 'proposal' | 'decision' | 'execution' | 'configuration' | 'pause' | 'error';

export type AgentControlActivityOptions = {
  agentDefinitionId?: string | null;
  from?: string | null;
  to?: string | null;
  targetRef?: string | null;
  types?: AgentControlActivityType[] | null;
  actorUserId?: string | null;
  status?: string | null;
  limit?: number;
  offset?: number;
};

export type AgentControlMockTriageInput = {
  alert_id?: string | null;
  ticket_id?: string | null;
  provider_key?: string | null;
  include_directory?: boolean | null;
  user_id_or_email?: string | null;
  note_body?: string | null;
};

export type AgentControlTicketingReadInput = {
  provider_key?: string | null;
  target_key?: string | null;
};

export type AgentControlTicketingTriageInput = {
  work_item_id?: string | null;
  provider_key?: string | null;
  target_key?: string | null;
  // Which agent a manual "test on a ticket" run should exercise. Without it the
  // built-in Helpdesk agent runs (legacy behavior).
  agent_definition_id?: string | null;
};

type RunLlmUsageEstimate = {
  estimatedTokens: number;
  estimatedCostEur: number;
};

type HelpdeskTicketingTriageRunOptions = {
  workflow?: string;
  sourceEndpoint?: string;
  manualEnqueueMode?: 'glpi' | 'ticketing';
  observationType?: string;
  recommendationType?: string;
  evaluationType?: string;
  proposalEvaluationType?: string;
};

const TICKETING_TRIAGE_RUN_OPTIONS: Required<HelpdeskTicketingTriageRunOptions> = {
  workflow: 'agent_control_center_ticketing_triage',
  sourceEndpoint: 'uat/ticketing-triage',
  manualEnqueueMode: 'ticketing',
  observationType: 'ticketing_ticket_triage',
  recommendationType: 'ticketing_triage_actions',
  evaluationType: 'ticketing_triage_uat',
  proposalEvaluationType: 'ticketing_triage_proposal',
};

const LEGACY_GLPI_TRIAGE_RUN_OPTIONS: Required<HelpdeskTicketingTriageRunOptions> = {
  workflow: 'agent_control_center_glpi_triage',
  sourceEndpoint: 'uat/glpi-triage',
  manualEnqueueMode: 'glpi',
  observationType: 'glpi_ticket_triage',
  recommendationType: 'glpi_triage_actions',
  evaluationType: 'glpi_triage_uat',
  proposalEvaluationType: 'glpi_triage_proposal',
};

export type AgentControlTargetingOptionField = 'status' | 'priority' | 'type' | 'category' | 'entity';

export type AgentControlAgentDefinitionInput = {
  agent_key?: string | null;
  name?: string | null;
  description?: string | null;
  agent_type?: string | null;
  environment?: string | null;
  agent_priority?: number | null;
  provider_bindings_json?: Record<string, unknown> | null;
  allowed_capabilities_json?: Record<string, unknown> | unknown[] | null;
  forbidden_capabilities_json?: Record<string, unknown> | unknown[] | null;
  persona_json?: Record<string, unknown> | null;
  trigger_policy_json?: Record<string, unknown> | null;
  scope_policy_json?: Record<string, unknown> | null;
  knowledge_sources?: Record<string, unknown> | null;
  queue_policy_json?: Record<string, unknown> | null;
  response_policy_json?: Record<string, unknown> | null;
  evaluation_policy_json?: Record<string, unknown> | null;
};

export type AgentControlAgentStatusInput = {
  status?: string | null;
};

export type AgentControlAutonomyInput = {
  actionClass?: string | null;
  mode?: AgentAutonomyMode | null;
  confirm?: boolean | null;
  overrideAcknowledged?: boolean | null;
  overrideReason?: string | null;
};

export type AgentControlTargetingPreviewInput = {
  scope_policy_json?: Record<string, unknown> | null;
};

export type AgentControlBulkApproveInput = {
  action_request_ids?: string[] | null;
  execute?: boolean | null;
  reason?: string | null;
};

type AgentControlBulkApproveOptions = {
  queueExecution?: boolean;
};

type AdapterResultLike<T> =
  | { ok: true; data: T; evidence?: unknown[]; warnings?: string[] }
  | { ok: false; errorCode: string; message: string; retryable: boolean; evidence?: unknown[] };

type TicketLike = {
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  description?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  attachments?: TicketAttachmentRef[];
};

type TicketNoteLike = {
  id: string;
  visibility: 'public' | 'internal';
  authorId?: string | null;
  author?: string | null;
  authorRole?: 'requester' | 'support' | 'kanap_agent' | 'unknown';
  body: string;
  createdAt: string;
  updatedAt?: string | null;
  updateFingerprint?: string | null;
  attachments?: TicketAttachmentRef[];
};

type TicketTimelineEntry = {
  id: string;
  kind: 'description' | 'followup';
  visibility: 'public' | 'internal';
  actor: 'requester_candidate' | 'kanap_agent' | 'support_or_unknown';
  actorSource: 'provider_requester_user' | 'provider_support_user' | 'kanap_marker' | 'public_non_kanap_followup' | 'initial_ticket';
  actorId: string | null;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
  updateFingerprint: string | null;
};

type ConversationActionGate = {
  can_prepare_internal_note: boolean;
  can_prepare_public_reply: boolean;
  can_prepare_sourced_answer: boolean;
  can_prepare_administrative_close_reply: boolean;
  internal_note_reason: string;
  public_reply_reason: string;
  sourced_answer_reason: string;
  administrative_close_reply_reason: string;
  latest_requester_message_at: string | null;
  latest_requester_message_id: string | null;
  last_agent_internal_note_at: string | null;
  last_agent_internal_note_action_id: string | null;
  last_agent_public_reply_at: string | null;
  last_agent_public_reply_action_id: string | null;
  requester_classification_confidence: 'provider_requester_user' | 'initial_ticket' | 'public_non_kanap_followup' | 'none';
  ticket_history_entry_count: number;
  latest_ticket_note_id: string | null;
  latest_ticket_note_at: string | null;
  latest_ticket_note_fingerprint: string | null;
  latest_requester_message_fingerprint: string | null;
  prepared_at: string;
};

type KnowledgeSearchItem = {
  id?: string;
  ref?: string | null;
  title?: string | null;
  summary?: string | null;
  snippet?: string | null;
  content_markdown?: string | null;
  status?: string | null;
  updated_at?: string | null;
  score?: number | null;
  // 'selected' = validated by the LLM interpreter; 'unvalidated' = retrieved but not validated
  // (LLM-fallback path), handed to synthesis as a candidate to judge. Set when presenting items
  // for the reply; absent for raw search/merge candidates. See applyKnowledgeInterpretation (#3).
  validation_status?: 'selected' | 'unvalidated' | null;
};

type KnowledgeSearchAttempt = {
  query: string;
  result: CapabilityExecutionResult<Record<string, unknown>>;
  items: KnowledgeSearchItem[];
};

type WebSearchResultItem = {
  title: string;
  url: string;
  description: string;
};

type MergedKnowledgeCandidate = KnowledgeSearchItem & {
  search_queries: string[];
  match_count?: number;
};

type KnowledgeDocumentFetchAttempt = {
  document_id: string;
  result?: CapabilityExecutionResult<Record<string, unknown>>;
  item?: KnowledgeSearchItem | null;
  error_message?: string | null;
};

const MAX_KNOWLEDGE_QUERY_CANDIDATES = 10;
const MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY = 3;
const MAX_PUBLIC_REPLY_CHARS = 12000;
const MAX_INTERNAL_NOTE_CHARS = 4000;
const MAX_SYNTHESIZED_REQUESTER_BODY_CHARS = 10500;
const MAX_INTERNAL_SYNTHESIS_BRIEF_CHARS = 1000;
const MAX_INTERNAL_RECOMMENDED_REPLY_CHARS = 900;
const MAX_SYNTHESIS_NOTE_SOURCES = 6;
const MAX_SYNTHESIS_NOTE_REJECTIONS = 6;
const APPROVED_ACTION_EXECUTING_STATUS = 'executing';
const HELPDESK_REVIEW_ACTION_CAPABILITIES = [
  TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
  TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
];
const DEFAULT_BULK_EXECUTION_PHASE = 999;
const STATIC_CAPABILITY_EXECUTION_PHASES = new Map(
  providerCapabilityContracts().map((contract) => [
    `${contract.name}:${contract.version}`,
    contract.execution_phase ?? DEFAULT_BULK_EXECUTION_PHASE,
  ]),
);
const AUTONOMY_ACTION_CLASSES = ['internal_note', 'classification', 'status', 'public_reply', 'assignment', 'participant'] as const;
const AUTONOMY_RECOMMENDATION_REASON_CODES = new Set([
  'INSUFFICIENT_DECIDED_PROPOSALS',
  'ACCEPTANCE_RATE_TOO_LOW',
  'OBSERVATION_WINDOW_TOO_SHORT',
]);
const HELPDESK_POSSIBLE_CAPABILITY_CAPS = new Map<string, string>([
  ['ticketing.ticket.get', 'A1'],
  [TICKETING_TICKET_NOTES_LIST_CAPABILITY, 'A1'],
  [TICKETING_CLASSIFICATION_CONTEXT_CAPABILITY, 'A1'],
  [TICKETING_LIFECYCLE_CONTEXT_CAPABILITY, 'A1'],
  [TICKETING_ROUTING_CONTEXT_CAPABILITY, 'A1'],
  [TICKETING_PARTICIPANT_CONTEXT_CAPABILITY, 'A1'],
  ['search_knowledge', 'A1'],
  ['get_document', 'A1'],
  // Provisioned onto every helpdesk agent by HELP_DESK_ALLOWED_CAPABILITIES (work-queue service).
  // Must be listed here or config saves round-tripping the capability are rejected. Read-only/A1;
  // the run loop no-ops it unless both the per-agent toggle and platform web search are enabled.
  ['web_search', 'A1'],
  [TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY, 'A2'],
  [TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY, 'A2'],
  [TICKETING_CLASSIFICATION_UPDATE_PREPARE_CAPABILITY, 'A2'],
  [TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY, 'A2'],
  [TICKETING_ASSIGNMENT_UPDATE_PREPARE_CAPABILITY, 'A2'],
  [TICKETING_PARTICIPANT_UPDATE_PREPARE_CAPABILITY, 'A2'],
  [TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY, 'A3'],
  [TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY, 'A3'],
  [TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY, 'A3'],
  [TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY, 'A3'],
  [TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY, 'A3'],
  [TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY, 'A3'],
]);
const SUPPRESS_UNCHANGED_PROPOSAL_STATUSES = new Set(['pending', 'approved', 'rejected', 'executed']);
const CLOSE_TRIAGE_ACTIONS = new Set(['prepare_close', 'prepare_close_reply']);
const PHASE_1_PLANNER_OWNED_ACTION_TYPES = [
  'internal_note',
  'requester_reply',
  'status_update',
] as const satisfies readonly PlannerActionType[];
const PLANNER_OWNED_ACTION_TYPES = new Set<PlannerActionType>(PHASE_1_PLANNER_OWNED_ACTION_TYPES);
const PLANNER_TERMINAL_TRANSITIONS = new Set(['solved', 'closed', 'resolved']);
const MIN_KNOWLEDGE_RELEVANCE_SCORE = 0.00001;
const MIN_KNOWLEDGE_LEXICAL_OVERLAP = 1;
const ACTION_TYPE_CAPABILITY_TABLE: Record<string, { prepare: string; approved: string } | undefined> = {
  internal_note: {
    prepare: TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY,
    approved: TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  },
  requester_reply: {
    prepare: TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY,
    approved: TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
  },
  status_update: {
    prepare: TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY,
    approved: TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
  },
  classification_update: {
    prepare: TICKETING_CLASSIFICATION_UPDATE_PREPARE_CAPABILITY,
    approved: TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  },
  assignment_update: {
    prepare: TICKETING_ASSIGNMENT_UPDATE_PREPARE_CAPABILITY,
    approved: TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  },
  participant_update: {
    prepare: TICKETING_PARTICIPANT_UPDATE_PREPARE_CAPABILITY,
    approved: TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
  },
};
const TARGETING_OPTION_FIELDS = new Set(['status', 'priority', 'type', 'category', 'entity']);
const TARGETING_ENUM_OPTIONS_TTL_MS = 60 * 60 * 1000;
const TARGETING_CATALOG_OPTIONS_TTL_MS = 2 * 60 * 1000;
const TARGETING_OPTIONS_MAX_LIMIT = 50;

// An identical earlier proposal only suppresses regeneration while it is still a live or
// settled decision. A proposal/action that lapsed (pending or approved past its expiry, or
// swept to 'expired') is gone from the operator's queue or no longer executable, so it must
// NOT keep blocking a fresh proposal — otherwise a stale ticket, whose context hash never
// changes, becomes permanently un-proposable after its first proposal expired.
export function proposalStillBlocksRegeneration(action: AiActionRequest, now: number): boolean {
  if (action.status === 'expired') {
    return false;
  }
  if (!SUPPRESS_UNCHANGED_PROPOSAL_STATUSES.has(action.status)) {
    return false;
  }
  if ((action.status === 'pending' || action.status === 'approved') && action.expires_at) {
    const expiresAt = action.expires_at instanceof Date
      ? action.expires_at.getTime()
      : Date.parse(String(action.expires_at));
    if (Number.isFinite(expiresAt) && expiresAt <= now) {
      return false;
    }
  }
  return true;
}

const KNOWLEDGE_QUERY_STOP_WORDS = new Set([
  'a',
  'about',
  'ai',
  'aide',
  'aider',
  'an',
  'and',
  'avec',
  'besoin',
  'can',
  'ce',
  'ces',
  'cette',
  'choix',
  'de',
  'des',
  'du',
  'en',
  'est',
  'et',
  'for',
  'faut',
  'help',
  'i',
  'in',
  'is',
  'j',
  'je',
  'la',
  'le',
  'les',
  'm',
  'me',
  'mon',
  'need',
  'notre',
  'nous',
  'of',
  'on',
  'ou',
  'our',
  'please',
  'pour',
  'pouvez',
  's',
  'sur',
  'the',
  'this',
  'ticket',
  'ton',
  'un',
  'une',
  'urgent',
  'urgemment',
  'vous',
  'with',
]);

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function trimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function approvalDecisionReason(value: unknown, fallback: string): string {
  const trimmed = trimmedString(value);
  if (!trimmed) return fallback;
  return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;
}

function cleanTargetingOptionField(value: unknown): AgentControlTargetingOptionField {
  const field = trimmedString(value)?.toLowerCase();
  if (!field || !TARGETING_OPTION_FIELDS.has(field)) {
    throw new BadRequestException('Unsupported targeting option field.');
  }
  return field as AgentControlTargetingOptionField;
}

function cleanTargetingOptionLimit(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return 20;
  }
  return Math.max(1, Math.min(Math.floor(parsed), TARGETING_OPTIONS_MAX_LIMIT));
}

function cleanTargetingOptionQuery(value: unknown): string {
  const raw = trimmedString(value);
  return raw ? raw.slice(0, 120) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function adapterData<T>(value: unknown): T | null {
  if (!isRecord(value) || value.ok !== true || !('data' in value)) {
    return null;
  }
  return value.data as T;
}

function adapterFailureMessage(value: unknown): string | null {
  if (!isRecord(value) || value.ok !== false) {
    return null;
  }
  return typeof value.message === 'string' && value.message.trim().length > 0
    ? value.message.trim()
    : 'Provider request failed.';
}

function safeLimit(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value ?? NaN)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value as number)));
}

function clampText(value: string | null | undefined, max: number): string {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
}

function stripHeadlineTags(value: string | null | undefined): string {
  return clampText(String(value ?? '').replace(/<\/?b>/g, ''), 280);
}

function normalizeKnowledgeText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[’`]/g, '\'')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanKnowledgeCandidate(value: string | null | undefined): string {
  const normalized = normalizeKnowledgeText(value)
    .replace(/^[\s"'([{]+/g, '')
    .replace(/[\s"')}\].,:;!?]+$/g, '')
    .trim();
  return clampText(normalized, 160);
}

function uniqueKnowledgeCandidates(values: string[]): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const value of values) {
    const candidate = cleanKnowledgeCandidate(value);
    if (!candidate) continue;
    if (extractKnowledgeTokens(candidate).length === 0) continue;
    const key = candidate.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
    if (candidates.length >= MAX_KNOWLEDGE_QUERY_CANDIDATES) break;
  }
  return candidates;
}

function extractKnowledgePhrases(value: string): string[] {
  const text = normalizeKnowledgeText(value);
  if (!text) return [];

  const phrases: string[] = [];
  const patterns = [
    /\b(?:recette|procedure|documentation|document|doc|article|kb)\s+(?:de|du|des|d[' ]?un|d[' ]?une|d'|pour|sur|about|for|on)\s+([^.!?;:\n]{3,100})/giu,
    /\b(?:need|besoin|cherche|recherche|looking\s+for)\s+(?:a|an|the|de|du|des|d[' ]?un|d[' ]?une|d'|pour)?\s*([^.!?;:\n]{3,100})/giu,
    /\b(?:erreur|error|incident|alerte|alert|probleme|problem|issue|panne)\s+([^.!?;:\n]{3,100})/giu,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        phrases.push(match[1]);
      }
    }
  }
  return phrases;
}

function extractKnowledgeTokens(value: string, maxTokens = 8): string[] {
  const normalized = normalizeKnowledgeText(value)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ');
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const rawToken of normalized.split(/\s+/)) {
    for (const token of rawToken.split(/['-]/)) {
      const cleaned = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (
        cleaned.length < 3
        || KNOWLEDGE_QUERY_STOP_WORDS.has(cleaned)
        || seen.has(cleaned)
      ) {
        continue;
      }
      seen.add(cleaned);
      tokens.push(cleaned);
      if (tokens.length >= maxTokens) {
        return tokens;
      }
    }
  }
  return tokens;
}

function buildKnowledgeQuery(ticket: TicketLike): string {
  return clampText([
    ticket.title,
    ticket.description,
  ].filter((entry) => !!entry).join(' '), 480);
}

function buildKnowledgeQueryCandidates(ticket: TicketLike): string[] {
  const fullQuery = buildKnowledgeQuery(ticket);
  const sourceText = [
    ticket.title,
    ticket.description,
  ].filter((entry) => !!entry).join(' ');
  const tokens = extractKnowledgeTokens(sourceText);
  return uniqueKnowledgeCandidates([
    ...extractKnowledgePhrases(sourceText),
    tokens.slice(0, 4).join(' '),
    tokens.slice(0, 6).join(' '),
    ticket.title,
    fullQuery,
  ]);
}

function buildShortKnowledgeQueryCandidates(ticket: TicketLike): string[] {
  const sourceText = [
    ticket.title,
    ticket.description,
  ].filter((entry) => !!entry).join(' ');
  const tokens = extractKnowledgeTokens(sourceText, 24);
  return uniqueKnowledgeCandidates([
    ...extractKnowledgePhrases(sourceText),
    tokens.slice(0, 4).join(' '),
    tokens.slice(0, 6).join(' '),
    tokens.slice(-4).join(' '),
    tokens.slice(-6).join(' '),
    extractKnowledgeTokens(ticket.title ?? '').slice(0, 5).join(' '),
  ]);
}

function buildWebSearchQueryCandidates(
  ticket: TicketLike,
  timeline: TicketTimelineEntry[],
  knowledgeCandidates: string[],
): string[] {
  return uniqueKnowledgeCandidates([
    latestRequesterBody(timeline) ?? '',
    ticket.description ?? '',
    buildKnowledgeQuery(ticket),
    ...knowledgeCandidates,
    ...buildKnowledgeQueryCandidates(ticket),
    ticket.title ?? '',
  ]);
}

function stripKnowledgeAccents(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function latestRequesterBody(timeline: TicketTimelineEntry[]): string | null {
  const entry = [...timeline].reverse().find((candidate) => candidate.actor === 'requester_candidate' && candidate.body.trim());
  return entry?.body ?? null;
}

function extractKnowledgePreferenceTerms(timeline: TicketTimelineEntry[]): {
  positiveTerms: string[];
  negativeTerms: string[];
} {
  const latest = latestRequesterBody(timeline) ?? '';
  const positiveTerms: string[] = [];
  const negativeTerms: string[] = [];

  positiveTerms.push(...extractKnowledgeTokens(latest, 16));

  const negativePattern = /\b(?:je\s+n[' ]?aime\s+pas|j[' ]?aime\s+pas|pas|sans|eviter|éviter|avoid|not)\s+(?:le|la|les|du|de|des|un|une|the|a|an)?\s*([\p{L}\p{N}' -]{3,50})/giu;
  let match: RegExpExecArray | null;
  while ((match = negativePattern.exec(latest)) != null) {
    const term = normalizeKnowledgeText(match[1]).replace(/[.!?;:,].*$/g, '').trim();
    if (term) {
      negativeTerms.push(term);
    }
  }

  return {
    positiveTerms: uniqueKnowledgeCandidates(positiveTerms),
    negativeTerms: uniqueKnowledgeCandidates(negativeTerms),
  };
}

function buildFallbackKnowledgeSearchPlan(
  ticket: TicketLike,
  timeline: TicketTimelineEntry[],
  queries: string[],
): KnowledgeSearchPlan {
  const preferences = extractKnowledgePreferenceTerms(timeline);
  return {
    source: 'deterministic',
    need: null,
    intent: latestRequesterBody(timeline) ?? ticket.title,
    language: ticketLooksFrench(ticket) ? 'fr' : null,
    positive_terms: preferences.positiveTerms,
    negative_terms: preferences.negativeTerms,
    queries,
    rationale: 'Deterministic fallback extracted requester lexical keywords.',
    confidence: null,
    model: null,
    warnings: [],
  };
}

function knowledgeItemsFromOutput(value: unknown): KnowledgeSearchItem[] {
  const record = isRecord(value) ? value : null;
  const items = Array.isArray(record?.items) ? record.items : [];
  const numericScore = (item: Record<string, unknown>): number | null => {
    const numeric = Number(item.score ?? item.rank);
    return Number.isFinite(numeric) ? numeric : null;
  };
  return items
    .filter(isRecord)
    .slice(0, 5)
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : undefined,
      ref: typeof item.ref === 'string' ? item.ref : null,
      title: typeof item.title === 'string' ? item.title : null,
      summary: typeof item.summary === 'string' ? item.summary : null,
      snippet: typeof item.snippet === 'string' ? item.snippet : null,
      content_markdown: typeof item.content_markdown === 'string' ? item.content_markdown : null,
      status: typeof item.status === 'string' ? item.status : null,
      updated_at: typeof item.updated_at === 'string' ? item.updated_at : null,
      score: numericScore(item),
    }));
}

function stripWebText(value: string): string {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function webSearchItemsFromOutput(value: unknown): WebSearchResultItem[] {
  const record = isRecord(value) ? value : null;
  const items = Array.isArray(record?.items) ? record.items : [];
  const seen = new Set<string>();
  const results: WebSearchResultItem[] = [];
  for (const item of items.filter(isRecord)) {
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    const title = stripWebText(typeof item.title === 'string' ? item.title : '');
    const description = stripWebText(typeof item.description === 'string' ? item.description : '');
    if (!url || (!title && !description)) {
      continue;
    }
    const key = url.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push({ title, url, description });
    if (results.length >= 5) {
      break;
    }
  }
  return results;
}

function knowledgeDocumentFromOutput(searchItem: KnowledgeSearchItem, value: unknown): KnowledgeSearchItem | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    ...searchItem,
    id: typeof value.id === 'string' ? value.id : searchItem.id,
    ref: typeof value.ref === 'string' ? value.ref : searchItem.ref ?? null,
    title: typeof value.title === 'string' ? value.title : searchItem.title ?? null,
    summary: typeof value.summary === 'string' ? value.summary : searchItem.summary ?? null,
    status: typeof value.status === 'string' ? value.status : searchItem.status ?? null,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : searchItem.updated_at ?? null,
    content_markdown: typeof value.content_markdown === 'string' ? value.content_markdown : searchItem.content_markdown ?? null,
    score: searchItem.score ?? null,
  };
}

function knowledgeDocumentRef(item: KnowledgeSearchItem): string | null {
  return trimmedString(item.ref) ?? trimmedString(item.id);
}

function knowledgeCandidateKey(item: KnowledgeSearchItem): string | null {
  const ref = knowledgeDocumentRef(item);
  return ref ? ref.toLocaleLowerCase() : null;
}

function knowledgeScoreSortValue(value: number | null | undefined): number {
  return Number.isFinite(Number(value)) ? Number(value) : Number.NEGATIVE_INFINITY;
}

function mergeKnowledgeAttempts(attempts: KnowledgeSearchAttempt[]): MergedKnowledgeCandidate[] {
  const byKey = new Map<string, MergedKnowledgeCandidate>();
  for (const attempt of attempts) {
    for (const item of attempt.items) {
      const key = knowledgeCandidateKey(item);
      if (!key) continue;
      const existing = byKey.get(key);
      if (existing) {
        existing.search_queries = Array.from(new Set([...existing.search_queries, attempt.query]));
        existing.summary = existing.summary ?? item.summary ?? null;
        existing.snippet = existing.snippet ?? item.snippet ?? null;
        existing.content_markdown = existing.content_markdown ?? item.content_markdown ?? null;
        existing.status = existing.status ?? item.status ?? null;
        existing.updated_at = existing.updated_at ?? item.updated_at ?? null;
        const nextScore = Math.max(knowledgeScoreSortValue(existing.score), knowledgeScoreSortValue(item.score));
        existing.score = nextScore === Number.NEGATIVE_INFINITY ? null : nextScore;
      } else {
        byKey.set(key, {
          ...item,
          search_queries: [attempt.query],
        });
      }
    }
  }
  return Array.from(byKey.values())
    .map((candidate) => ({
      ...candidate,
      match_count: candidate.search_queries.length,
    }))
    .sort((left, right) => {
      const scoreDelta = knowledgeScoreSortValue(right.score) - knowledgeScoreSortValue(left.score);
      if (scoreDelta !== 0) return scoreDelta;
      const matchDelta = (right.match_count ?? right.search_queries.length) - (left.match_count ?? left.search_queries.length);
      if (matchDelta !== 0) return matchDelta;
      return String(left.title ?? left.ref ?? left.id ?? '').localeCompare(String(right.title ?? right.ref ?? right.id ?? ''));
    });
}

function plannerCandidatesFromKnowledge(candidates: MergedKnowledgeCandidate[]): KnowledgePlannerCandidate[] {
  return candidates.map((candidate) => ({
    ref: knowledgeDocumentRef(candidate),
    title: candidate.title ?? null,
    summary: candidate.summary ?? null,
    snippet: candidate.snippet ?? null,
    status: candidate.status ?? null,
    search_queries: candidate.search_queries,
    match_count: candidate.match_count ?? candidate.search_queries.length,
    score: candidate.score ?? null,
  }));
}

// #3 — non-destructive interpreter. `selected` means VALIDATED BY THE LLM INTERPRETER; a lexical
// heuristic is never a validation. When the interpreter cannot validate (LLM fallback, or LLM
// returned no usable selection), the retrieved, non-rejected candidates are returned as
// `unvalidated` — never zeroed (regression #47, where DOC-165 was retrieved but discarded). They
// are handed to synthesis as candidates to judge and surfaced for human review; they never count
// as selected sources, and #4 keeps any public reply behind a usable synthesis. `rejected`
// (interpretation rejections / negative-term conflicts) is always excluded from both.
function applyKnowledgeInterpretation(
  candidates: MergedKnowledgeCandidate[],
  interpretation: KnowledgeResultInterpretation,
): { selected: KnowledgeSearchItem[]; unvalidated: KnowledgeSearchItem[] } {
  if (candidates.length === 0) {
    return { selected: [], unvalidated: [] };
  }
  const rejected = new Set(interpretation.rejected.map((entry) => entry.ref.toLocaleLowerCase()));
  const notRejected = candidates.filter((candidate) => {
    const ref = knowledgeDocumentRef(candidate);
    return !ref || !rejected.has(ref.toLocaleLowerCase());
  });
  if (interpretation.source === 'llm') {
    const selectedRefs = new Set(interpretation.selected_refs.map((ref) => ref.toLocaleLowerCase()));
    if (selectedRefs.size > 0) {
      const selectedItems = notRejected.filter((candidate) => {
        const ref = knowledgeDocumentRef(candidate);
        return !!ref && selectedRefs.has(ref.toLocaleLowerCase());
      });
      if (selectedItems.length > 0) {
        return { selected: selectedItems, unvalidated: [] };
      }
    }
  }
  // No LLM validation: keep the retrieved candidates as unvalidated (already score-sorted by
  // mergeKnowledgeAttempts). Never return [] when candidates exist.
  return { selected: [], unvalidated: notRejected };
}

function knowledgeRelevanceTerms(ticket: TicketLike): string[] {
  return extractKnowledgeTokens(buildKnowledgeQuery(ticket))
    .filter((token) => token.length >= 4);
}

function knowledgeItemLexicalOverlap(item: KnowledgeSearchItem, terms: string[]): number {
  if (terms.length === 0) return 0;
  const text = stripKnowledgeAccents(normalizeKnowledgeText([
    item.title,
    item.summary,
    item.snippet,
    item.content_markdown,
  ].filter(Boolean).join(' '))).toLocaleLowerCase();
  return terms.filter((term) => text.includes(stripKnowledgeAccents(term).toLocaleLowerCase())).length;
}

function filterKnowledgeItemsByRelevance(
  ticket: TicketLike,
  items: KnowledgeSearchItem[],
): {
  items: KnowledgeSearchItem[];
  dropped: Array<{ ref: string | null; title: string | null; score: number | null; lexical_overlap: number; reason: string }>;
} {
  if (items.length === 0) {
    return { items, dropped: [] };
  }
  const terms = knowledgeRelevanceTerms(ticket);
  if (terms.length === 0) {
    return { items, dropped: [] };
  }
  const kept: KnowledgeSearchItem[] = [];
  const dropped: Array<{ ref: string | null; title: string | null; score: number | null; lexical_overlap: number; reason: string }> = [];
  for (const item of items) {
    const score = typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : null;
    const lexicalOverlap = knowledgeItemLexicalOverlap(item, terms);
    if ((score != null && score >= MIN_KNOWLEDGE_RELEVANCE_SCORE) || lexicalOverlap >= MIN_KNOWLEDGE_LEXICAL_OVERLAP) {
      kept.push(item);
      continue;
    }
    dropped.push({
      ref: knowledgeDocumentRef(item),
      title: item.title ?? null,
      score,
      lexical_overlap: lexicalOverlap,
      reason: 'below_relevance_threshold',
    });
  }
  return { items: kept, dropped };
}

function plannerKnowledgeSummary(
  items: KnowledgeSearchItem[],
  lowRelevanceCount: number,
  interpretation: KnowledgeResultInterpretation,
  plan: KnowledgeSearchPlan,
  queryDerivation: KnowledgeQueryDerivation,
): NonNullable<ActionPlannerPromptInput['knowledge_summary']> {
  return {
    // count = validated (interpreter-selected) sources; unvalidated_count = retrieved-but-
    // unvalidated candidates the planner may still attempt a sourced answer on (synthesis judges).
    count: items.filter((item) => item.validation_status !== 'unvalidated').length,
    unvalidated_count: items.filter((item) => item.validation_status === 'unvalidated').length,
    low_relevance_count: lowRelevanceCount,
    items: items.slice(0, MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY).map((item) => ({
      ref: knowledgeDocumentRef(item),
      title: item.title ?? null,
      score: item.score ?? null,
      validation_status: item.validation_status ?? 'selected',
      search_queries: Array.isArray((item as MergedKnowledgeCandidate).search_queries)
        ? (item as MergedKnowledgeCandidate).search_queries.slice(0, 4)
        : [],
    })),
    interpretation: serializeKnowledgeInterpretation(interpretation),
    need: plan.need ? { ...plan.need } : null,
    query_derivation: serializeKnowledgeQueryDerivation(queryDerivation),
  };
}

function plannerWebSummary(
  items: WebSearchResultItem[],
  status: string,
  query: string | null,
): NonNullable<ActionPlannerPromptInput['web_summary']> {
  return {
    count: items.length,
    status,
    query,
    items: items.slice(0, 5).map((item) => ({
      title: item.title || item.url,
      url: item.url,
    })),
  };
}

function buildFallbackKnowledgeInterpretation(
  plan: KnowledgeSearchPlan,
  candidates: MergedKnowledgeCandidate[],
): KnowledgeResultInterpretation {
  const negativeTerms = plan.negative_terms
    .map((term) => stripKnowledgeAccents(term).toLocaleLowerCase())
    .filter((term) => term.length >= 3);
  const positiveTerms = plan.positive_terms
    .map((term) => stripKnowledgeAccents(term).toLocaleLowerCase())
    .filter((term) => term.length >= 3);
  const scored = candidates.map((candidate, index) => {
    const text = stripKnowledgeAccents([
      candidate.title,
      candidate.summary,
      candidate.snippet,
    ].filter(Boolean).join(' ')).toLocaleLowerCase();
    const conflicts = negativeTerms.filter((term) => text.includes(term));
    const positiveHits = positiveTerms.filter((term) => text.includes(term)).length;
    const score = (positiveHits * 4) + (candidate.search_queries.length * 2) - (conflicts.length * 8) - index * 0.01;
    return { candidate, conflicts, score };
  }).sort((left, right) => right.score - left.score);
  const rejected = scored
    .filter((entry) => entry.conflicts.length > 0)
    .map((entry) => ({
      ref: knowledgeDocumentRef(entry.candidate) ?? 'unknown',
      reason: `Conflicts with requester preference: ${entry.conflicts.join(', ')}`,
    }))
    .filter((entry) => entry.ref !== 'unknown');
  const selectedRefs = scored
    .filter((entry) => entry.conflicts.length === 0)
    .slice(0, 3)
    .map((entry) => knowledgeDocumentRef(entry.candidate))
    .filter((ref): ref is string => !!ref);
  return {
    source: 'deterministic',
    selected_refs: selectedRefs,
    rejected,
    facet_match: null,
    needs_human_review: selectedRefs.length === 0,
    confidence: selectedRefs.length > 0 ? 0.58 : 0.34,
    rationale: selectedRefs.length > 0
      ? 'Deterministic ranking selected candidates that matched positive search terms and avoided explicit negative terms.'
      : 'No deterministic candidate satisfied the requester constraints.',
    model: null,
    usage: null,
    estimated_tokens: 0,
    estimated_cost_eur: 0,
    latency_ms: null,
    warnings: [],
  };
}

function serializeKnowledgeSearchPlan(plan: KnowledgeSearchPlan): Record<string, unknown> {
  return {
    source: plan.source,
    need: plan.need,
    intent: plan.intent,
    language: plan.language,
    positive_terms: plan.positive_terms,
    negative_terms: plan.negative_terms,
    queries: plan.queries,
    rationale: plan.rationale,
    confidence: plan.confidence,
    model: plan.model,
    warnings: plan.warnings,
  };
}

function serializeKnowledgeNeedRepresentation(result: TicketNeedRepresentationBuildResult | null): Record<string, unknown> | null {
  if (!result) return null;
  return {
    source: result.source,
    model: result.model,
    usage: result.usage,
    estimated_tokens: result.estimated_tokens,
    estimated_cost_eur: result.estimated_cost_eur,
    latency_ms: result.latency_ms,
    warnings: result.warnings,
    need: result.need,
  };
}

function serializeKnowledgeQueryDerivation(derivation: KnowledgeQueryDerivation): Record<string, unknown> {
  return {
    source: derivation.source,
    queries: derivation.queries,
    exact_queries: derivation.exact_queries,
    facet_queries: derivation.facet_queries,
    fallback_queries: derivation.fallback_queries,
    dropped_queries: derivation.dropped_queries,
    warnings: derivation.warnings,
  };
}

function serializeTicketImageExtraction(result: TicketEvidenceExtractionResult): Record<string, unknown> {
  return {
    attachment_refs: result.attachmentRefs,
    evidence: result.evidence,
    warnings: result.warnings,
    skipped_reason: result.skippedReason,
    model: result.model,
    usage: result.usage,
    estimated_tokens: result.estimated_tokens,
    estimated_cost_eur: result.estimated_cost_eur,
    latency_ms: result.latency_ms,
  };
}

function serializeKnowledgeInterpretation(interpretation: KnowledgeResultInterpretation): Record<string, unknown> {
  return {
    source: interpretation.source,
    selected_refs: interpretation.selected_refs,
    rejected: interpretation.rejected,
    facet_match: interpretation.facet_match ?? null,
    needs_human_review: interpretation.needs_human_review,
    confidence: interpretation.confidence,
    rationale: interpretation.rationale,
    model: interpretation.model,
    usage: interpretation.usage,
    estimated_tokens: interpretation.estimated_tokens,
    estimated_cost_eur: interpretation.estimated_cost_eur,
    latency_ms: interpretation.latency_ms,
    warnings: interpretation.warnings,
  };
}

function actionSortTime(action: AiActionRequest): number {
  const updated = action.updated_at instanceof Date ? action.updated_at.getTime() : Date.parse(String(action.updated_at ?? ''));
  if (Number.isFinite(updated)) return updated;
  const created = action.created_at instanceof Date ? action.created_at.getTime() : Date.parse(String(action.created_at ?? ''));
  return Number.isFinite(created) ? created : 0;
}

function actionIsActivePending(action: AiActionRequest, now = Date.now()): boolean {
  if (action.status !== 'pending') return false;
  if (!action.expires_at) return true;
  const expiresAt = action.expires_at instanceof Date ? action.expires_at.getTime() : Date.parse(String(action.expires_at));
  return Number.isFinite(expiresAt) && expiresAt > now;
}

function stringFromMetadata(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function metadataObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function definitionIdFromMetadata(value: unknown): string | null {
  return stringFromMetadata(metadataObject(value).agent_definition_id);
}

function numberFromMetadata(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function withApprovedBatchContext(
  metadata: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const existing = metadataObject(metadata);
  const batch = metadataObject(existing.approved_batch_context);
  return {
    ...existing,
    approved_batch_context: {
      ...batch,
      ...patch,
    },
  };
}

function approvedBatchExecutionAttempts(action: AiActionRequest): number {
  const metadata = metadataObject(action.metadata_json);
  const batch = metadataObject(metadata.approved_batch_context);
  return numberFromMetadata(batch.execution_attempts);
}

function actionExecutionSkipReason(action: AiActionRequest | null): string | null {
  if (!action) {
    return 'Action request was not claimed for execution.';
  }
  if (action.status === 'executed') {
    return null;
  }
  if (action.status === APPROVED_ACTION_EXECUTING_STATUS) {
    return 'Action request is already being executed.';
  }
  if (action.error_message) {
    return action.error_message;
  }
  if (action.status === 'approved') {
    return 'Action request was not claimed for execution.';
  }
  return `Action is ${action.status}.`;
}

function actionClass(action: Pick<AiActionRequest, 'metadata_json' | 'capability_name'>): string {
  return actionClassForCapabilityName(
    stringFromMetadata(metadataObject(action.metadata_json).action_class) ?? action.capability_name,
  );
}

function numericMetadata(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function cleanAgentPriority(value: unknown, fallback = 100): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1000, Math.floor(numeric)));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Per-agent retrieval-source policy, read from scope_policy_json.knowledge_sources.
// Defaults preserve current behaviour: knowledge ON over all accessible libraries, web OFF.
function readAgentKnowledgeSources(definition: AiAgentDefinition | null): {
  knowledgeEnabled: boolean;
  knowledgeLibraryIds: string[] | null; // null = all accessible libraries
  webEnabled: boolean;
} {
  const scope = isRecord(definition?.scope_policy_json) ? definition.scope_policy_json : {};
  const sources = isRecord(scope.knowledge_sources) ? scope.knowledge_sources : {};
  const knowledge = isRecord(sources.knowledge) ? sources.knowledge : {};
  const web = isRecord(sources.web) ? sources.web : {};
  const allLibraries = knowledge.all_libraries !== false;
  const libraryIds = Array.isArray(knowledge.library_ids)
    ? knowledge.library_ids.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id))
    : [];
  return {
    knowledgeEnabled: knowledge.enabled !== false,
    knowledgeLibraryIds: allLibraries || libraryIds.length === 0 ? null : libraryIds,
    webEnabled: web.enabled === true,
  };
}

// Validate/clamp a knowledge_sources patch at write time. Library ids are UUID-checked and
// de-duplicated here; tenant/ACL safety is additionally enforced at read time by
// KnowledgeService.search (the configured ids are intersected with the agent user's
// accessible libraries, never substituted for them).
function normalizeKnowledgeSources(value: unknown): Record<string, unknown> {
  const source = isRecord(value) ? value : {};
  const knowledge = isRecord(source.knowledge) ? source.knowledge : {};
  const web = isRecord(source.web) ? source.web : {};
  const allLibraries = knowledge.all_libraries !== false;
  const libraryIds = Array.isArray(knowledge.library_ids)
    ? Array.from(new Set(knowledge.library_ids.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id))))
    : [];
  return {
    knowledge: {
      enabled: knowledge.enabled !== false,
      all_libraries: allLibraries,
      library_ids: allLibraries ? [] : libraryIds,
    },
    web: { enabled: web.enabled === true },
    precedence: 'knowledge_first',
  };
}

function addEstimatedUsage(acc: { tokens: number; cost: number }, run: AiRun): void {
  const usage = metadataObject(run.usage_json);
  const cost = metadataObject(run.cost_json);
  acc.tokens += numericMetadata(usage.estimated_tokens ?? usage.total_tokens);
  acc.cost += numericMetadata(cost.estimated_cost_eur ?? cost.total_cost_eur ?? cost.total_cost);
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function withinDateRange(value: Date | string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false;
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(time) && time >= start.getTime() && time <= end.getTime();
}

function cleanSingleLine(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.length > max ? normalized.slice(0, max) : normalized;
}

function cleanAgentKey(value: unknown): string {
  const key = cleanSingleLine(value, 120);
  if (!key || !/^[a-z0-9][a-z0-9._:-]*$/.test(key) || key.includes('*')) {
    throw new BadRequestException('Agent key must be lowercase letters, numbers, dots, underscores, colons, or hyphens.');
  }
  return key;
}

function slugAgentKey(value: string): string {
  const slug = value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 80);
  return slug || 'agent';
}

function cleanAgentType(value: unknown): string {
  const candidate = cleanSingleLine(value, 40) ?? 'custom';
  if (!['helpdesk', 'sre', 'software_dev', 'code_review', 'custom'].includes(candidate)) {
    throw new BadRequestException('Unsupported agent type.');
  }
  return candidate;
}

function cleanAgentEnvironment(value: unknown): string {
  const candidate = cleanSingleLine(value, 40) ?? 'sandbox';
  if (!['production', 'staging', 'sandbox', 'lab', 'mock'].includes(candidate)) {
    throw new BadRequestException('Unsupported agent environment.');
  }
  return candidate;
}

function cleanAgentStatus(value: unknown): string {
  const candidate = cleanSingleLine(value, 40);
  if (!candidate || !['draft', 'enabled', 'disabled', 'archived'].includes(candidate)) {
    throw new BadRequestException('Unsupported agent status.');
  }
  return candidate;
}

function normalizedPolicyObject(value: unknown, label: string): Record<string, unknown> | null {
  if (value == null) return null;
  if (!isRecord(value)) {
    throw new BadRequestException(`${label} must be an object.`);
  }
  return value;
}

function normalizePersona(value: unknown, fallback: Record<string, unknown> | null = null): Record<string, unknown> | null {
  if (value == null) return fallback;
  if (!isRecord(value)) {
    throw new BadRequestException('Persona must be a structured object.');
  }
  const base = isRecord(fallback) ? { ...fallback } : {};
  delete base.tone;
  delete base.escalation_text;
  delete base.escalationText;
  const mission = cleanSingleLine(value.mission, 500);
  const outputStyleInput = isRecord(value.output_style) ? value.output_style : {};
  const fallbackOutputStyle = isRecord(base.output_style) ? base.output_style : {};
  const tone = cleanSingleLine(outputStyleInput.tone ?? value.tone ?? fallbackOutputStyle.tone, 300);
  const language = cleanSingleLine(outputStyleInput.language ?? fallbackOutputStyle.language, 24);
  if (language && language !== 'auto' && !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(language)) {
    throw new BadRequestException('Unsupported output style language.');
  }
  const outputStyle = {
    ...(tone ? { tone } : {}),
    ...(language ? { language } : {}),
  };
  const escalationGuidance = cleanSingleLine(value.escalation_guidance ?? value.escalation_text ?? value.escalationText ?? base.escalation_guidance, 500);
  const instructionsSource = Object.prototype.hasOwnProperty.call(value, 'instructions')
    ? value.instructions
    : base.instructions;
  const instructions = Array.isArray(instructionsSource)
    ? instructionsSource
      .map((entry) => cleanSingleLine(entry, 500))
      .filter((entry): entry is string => !!entry)
      .slice(0, 12)
    : [];
  const sharedContextInput = Object.prototype.hasOwnProperty.call(value, 'shared_context')
    ? value.shared_context
    : base.shared_context;
  const sharedContextRecord = isRecord(sharedContextInput) ? sharedContextInput : {};
  const sharedContextEnabled = sharedContextRecord.enabled === true;
  const sharedContextProfileId = cleanSingleLine(sharedContextRecord.profile_id, 80);
  if (sharedContextProfileId && !UUID_RE.test(sharedContextProfileId)) {
    throw new BadRequestException('Shared context profile id must be a UUID.');
  }
  const sharedContext = sharedContextEnabled || sharedContextProfileId
    ? {
      enabled: sharedContextEnabled,
      profile_id: sharedContextProfileId ?? null,
    }
    : null;
  const persona = {
    ...base,
    ...(mission ? { mission } : {}),
    instructions,
    ...(Object.keys(outputStyle).length > 0 ? { output_style: outputStyle } : {}),
    ...(escalationGuidance ? { escalation_guidance: escalationGuidance } : {}),
    ...(sharedContext ? { shared_context: sharedContext } : {}),
  };
  if (Object.keys(outputStyle).length === 0) delete persona.output_style;
  if (!sharedContext) delete persona.shared_context;
  return Object.keys(persona).length > 0 ? persona : null;
}

function normalizeResponsePolicyForConfig(
  value: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!value) return null;
  return {
    ...value,
    automatic_public_reply: false,
    automatic_ticket_updates: false,
    require_human_approval_for_writes: true,
  };
}

function autonomyLevelRank(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^A([0-6])$/);
  return match ? Number(match[1]) : null;
}

function capabilityNameFromEntry(entry: unknown): string | null {
  if (typeof entry === 'string') return trimmedString(entry);
  if (isRecord(entry)) return trimmedString(entry.name);
  return null;
}

function normalizeAllowedCapabilitiesForConfig(value: unknown): Record<string, unknown>[] | null {
  if (value == null) return null;
  const entries = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.capabilities)
      ? value.capabilities
      : null;
  if (!entries) {
    throw new BadRequestException('Allowed capabilities must be an array or object with a capabilities array.');
  }
  const normalized: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const name = capabilityNameFromEntry(entry);
    if (!name) {
      throw new BadRequestException('Every capability entry requires a name.');
    }
    const maxCap = HELPDESK_POSSIBLE_CAPABILITY_CAPS.get(name);
    if (!maxCap) {
      throw new ForbiddenException(`Capability ${name} is not available for this agent type.`);
    }
    const requestedLevel = isRecord(entry) && typeof entry.max_autonomy_level === 'string'
      ? entry.max_autonomy_level
      : maxCap;
    const requestedRank = autonomyLevelRank(requestedLevel);
    const maxRank = autonomyLevelRank(maxCap);
    if (requestedRank === null || maxRank === null || requestedRank > maxRank) {
      throw new ForbiddenException(`Capability ${name} cannot exceed ${maxCap}.`);
    }
    if (!seen.has(name)) {
      seen.add(name);
      normalized.push({
        ...(isRecord(entry) ? entry : {}),
        name,
        version: isRecord(entry) && typeof entry.version === 'string' ? entry.version : '1.0.0',
        max_autonomy_level: requestedLevel,
      });
    }
  }
  return normalized;
}

function definitionAllowsCapability(definition: AiAgentDefinition, capabilityName: string): boolean {
  const capabilities = Array.isArray(definition.allowed_capabilities_json)
    ? definition.allowed_capabilities_json
    : isRecord(definition.allowed_capabilities_json) && Array.isArray(definition.allowed_capabilities_json.capabilities)
      ? definition.allowed_capabilities_json.capabilities
      : [];
  return capabilities.some((entry) => {
    if (typeof entry === 'string') return entry === capabilityName;
    return isRecord(entry) && entry.name === capabilityName;
  });
}

function allowedCapabilityNames(definition: AiAgentDefinition | null): string[] {
  if (!definition) return [];
  const capabilities = Array.isArray(definition.allowed_capabilities_json)
    ? definition.allowed_capabilities_json
    : isRecord(definition.allowed_capabilities_json) && Array.isArray(definition.allowed_capabilities_json.capabilities)
      ? definition.allowed_capabilities_json.capabilities
      : [];
  return capabilities
    .map(capabilityNameFromEntry)
    .filter((entry): entry is string => !!entry);
}

function lifecycleAllowedTransitions(lifecycle: Record<string, unknown> | null): Record<string, unknown>[] {
  return Array.isArray(lifecycle?.allowedTransitions)
    ? lifecycle.allowedTransitions.filter(isRecord)
    : [];
}

function lifecycleTransitionKey(transition: Record<string, unknown> | null | undefined): string | null {
  return typeof transition?.key === 'string' && transition.key.trim().length > 0
    ? transition.key.trim()
    : null;
}

function normalizePlannerStatusTransitionKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const compact = stripKnowledgeAccents(raw)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const aliases: Record<string, string> = {
    close: 'closed',
    closing: 'closed',
    closed: 'closed',
    closeticket: 'closed',
    ferme: 'closed',
    fermer: 'closed',
    cloture: 'closed',
    cloturer: 'closed',
    clotureticket: 'closed',
    solve: 'solved',
    solved: 'solved',
    resolve: 'resolved',
    resolved: 'resolved',
    resoudre: 'resolved',
    resolu: 'resolved',
    pending: 'pending',
    wait: 'pending',
    waiting: 'pending',
    attente: 'pending',
    pendinguser: 'pending_user',
    processingassigned: 'processing_assigned',
    processingplanned: 'processing_planned',
    escalatedl2: 'escalated_l2',
  };
  return aliases[compact] ?? raw.toLocaleLowerCase().replace(/\s+/g, '_');
}

function lifecycleTransitionByKey(lifecycle: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  const normalizedKey = normalizePlannerStatusTransitionKey(key);
  if (!normalizedKey) return null;
  return lifecycleAllowedTransitions(lifecycle).find((transition) => lifecycleTransitionKey(transition) === normalizedKey) ?? null;
}

function lifecycleTransitionIsTerminal(transition: Record<string, unknown> | null | undefined): boolean {
  return transition?.terminal === true;
}

function preferredTerminalLifecycleTransition(lifecycle: Record<string, unknown> | null): Record<string, unknown> | null {
  const transitions = lifecycleAllowedTransitions(lifecycle);
  return transitions.find(lifecycleTransitionIsTerminal)
    ?? transitions.find((transition) => lifecycleTransitionKey(transition) === 'solved')
    ?? transitions.find((transition) => lifecycleTransitionKey(transition) === 'closed')
    ?? transitions.find((transition) => lifecycleTransitionKey(transition) === 'resolved')
    ?? transitions.find((transition) => {
      const key = lifecycleTransitionKey(transition);
      return !!key && PLANNER_TERMINAL_TRANSITIONS.has(key);
    })
    ?? null;
}

function plannerStatusTransitionIsTerminal(key: string | null): boolean {
  return !!key && PLANNER_TERMINAL_TRANSITIONS.has(key);
}

function resolvePlannerStatusTransition(
  lifecycle: Record<string, unknown> | null,
  action: PlannerAction,
  closeEligible: boolean,
): { transition: Record<string, unknown> | null; key: string | null; resolution: string | null } {
  const normalizedKey = normalizePlannerStatusTransitionKey(action.transition_key);
  if (!normalizedKey) {
    return { transition: null, key: null, resolution: null };
  }
  const directTransition = lifecycleTransitionByKey(lifecycle, normalizedKey);
  const directKey = lifecycleTransitionKey(directTransition);
  if (directTransition && directKey) {
    return {
      transition: directTransition,
      key: directKey,
      resolution: directKey === action.transition_key ? null : 'transition_key_normalized',
    };
  }
  if (closeEligible && plannerStatusTransitionIsTerminal(normalizedKey)) {
    const terminalTransition = preferredTerminalLifecycleTransition(lifecycle);
    const terminalKey = lifecycleTransitionKey(terminalTransition);
    if (terminalTransition && terminalKey) {
      return {
        transition: terminalTransition,
        key: terminalKey,
        resolution: 'terminal_transition_substituted',
      };
    }
  }
  return { transition: null, key: normalizedKey, resolution: null };
}

function plannerActionKindKey(action: PlannerAction): string {
  if (action.action_type === 'requester_reply') {
    return `${action.action_type}:${action.reply_kind ?? 'unspecified'}:${action.administrative_intent ?? 'none'}:${action.verbatim_ref ?? 'draft'}`;
  }
  if (action.action_type === 'status_update') {
    return `${action.action_type}:${action.transition_key ?? 'unspecified'}`;
  }
  return action.action_type;
}

// Resolve the planner's verbatim_ref against the trusted candidate set. Tolerant of an
// LLM that fumbles the ref token: falls back to a case-insensitive ref match, then to
// normalized-text equality (the natural failure mode is the model echoing the message
// text instead of the ref). Still strictly bounded to configured candidates — no ticket
// text can leak in, so the verbatim guarantee holds.
function resolveVerbatimCandidate(candidates: VerbatimCandidate[], ref: string): VerbatimCandidate | null {
  const exact = candidates.find((candidate) => candidate.ref === ref);
  if (exact) return exact;
  const wanted = ref.trim().toLocaleLowerCase();
  const byRefInsensitive = candidates.find((candidate) => candidate.ref.toLocaleLowerCase() === wanted);
  if (byRefInsensitive) return byRefInsensitive;
  // Tolerate a corrupted ref token (e.g. "verbatim_1-xyz" or a stale hash suffix): match by
  // the leading verbatim index. This is still strictly an index into the trusted candidate
  // set, so no ticket text can resolve here.
  const indexMatch = wanted.match(/^verbatim[_-]?(\d+)/);
  if (indexMatch) {
    const candidate = candidates[Number(indexMatch[1]) - 1];
    if (candidate) return candidate;
  }
  // Last resort: the model echoed the message text instead of the ref.
  const wantedText = ref.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  return candidates.find((candidate) => candidate.normalized.toLocaleLowerCase() === wantedText) ?? null;
}

function plannerActionKey(action: PlannerAction, guidanceHashValue: string): string {
  return proposalHash({
    action_type: action.action_type,
    kind: plannerActionKindKey(action),
    guidance_hash: guidanceHashValue,
  });
}

function configSnapshot(definition: AiAgentDefinition): Record<string, unknown> {
  return {
    name: definition.name,
    description: definition.description,
    status: definition.status,
    environment: definition.environment,
    agent_priority: cleanAgentPriority(definition.agent_priority),
    persona_json: definition.persona_json ?? null,
    trigger_policy_json: definition.trigger_policy_json,
    scope_policy_json: definition.scope_policy_json,
    queue_policy_json: definition.queue_policy_json,
    response_policy_json: definition.response_policy_json,
    evaluation_policy_json: definition.evaluation_policy_json,
    config_version: definition.config_version ?? 1,
  };
}

function changedConfigDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))) {
    if (hashStableJson(before[key]) !== hashStableJson(after[key])) {
      diff[key] = { before: before[key] ?? null, after: after[key] ?? null };
    }
  }
  return diff;
}

function autonomyThresholds(definition: AiAgentDefinition) {
  const evaluation = metadataObject(definition.evaluation_policy_json);
  const earned = metadataObject(evaluation.earned_autonomy);
  return {
    minimumDecided: Math.max(1, numericMetadata(earned.minimum_decided_count) || 20),
    minimumAcceptanceRate: Math.max(0, Math.min(1, numericMetadata(earned.minimum_acceptance_rate) || 0.7)),
    minimumObservationDays: Math.max(0, numericMetadata(earned.minimum_observation_days) || 28),
  };
}

function actionRequestIdsFromCapabilityOutput(value: unknown): string[] {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) {
    return [];
  }
  const ids = new Set<string>();
  const direct = value.data.action_request_id;
  if (typeof direct === 'string' && direct.trim().length > 0) {
    ids.add(direct.trim());
  }
  const nested = value.data.actionRequest;
  if (isRecord(nested) && typeof nested.id === 'string' && nested.id.trim().length > 0) {
    ids.add(nested.id.trim());
  }
  return Array.from(ids);
}

function ticketNotesFromOutput(value: unknown): TicketNoteLike[] {
  const data = adapterData<{ notes?: unknown[] }>(value);
  const notes = Array.isArray(data?.notes) ? data.notes : [];
  return notes
    .filter(isRecord)
    .map((note): TicketNoteLike => {
      const visibility: TicketNoteLike['visibility'] = note.visibility === 'internal' ? 'internal' : 'public';
      return {
        id: typeof note.id === 'string' ? note.id : String(note.id ?? ''),
        visibility,
        authorId: typeof note.authorId === 'string' ? note.authorId : null,
        author: typeof note.author === 'string' ? note.author : null,
        authorRole: note.authorRole === 'requester' || note.authorRole === 'support' || note.authorRole === 'kanap_agent'
          ? note.authorRole
          : 'unknown',
        body: typeof note.body === 'string' ? note.body : '',
        createdAt: typeof note.createdAt === 'string' ? note.createdAt : '',
        updatedAt: typeof note.updatedAt === 'string' ? note.updatedAt : null,
        updateFingerprint: typeof note.updateFingerprint === 'string' ? note.updateFingerprint : null,
      };
    })
    .filter((note) => note.id.length > 0);
}

function parseTime(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function isoFromTime(value: number | null): string | null {
  return value == null ? null : new Date(value).toISOString();
}

function actionPayloadBody(action: AiActionRequest): string | null {
  const payload = isRecord(action.action_payload_json) ? action.action_payload_json : null;
  const body = payload?.body ?? payload?.note_body ?? payload?.reply_body;
  return typeof body === 'string' && body.trim().length > 0 ? normalizeKnowledgeReplyText(body) : null;
}

function actionPayloadVisibility(action: AiActionRequest): 'internal' | 'public' | null {
  const payload = isRecord(action.action_payload_json) ? action.action_payload_json : null;
  const visibility = payload?.visibility;
  if (visibility === 'internal' || visibility === 'public') {
    return visibility;
  }
  if (action.capability_name === TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY) {
    return 'internal';
  }
  if (action.capability_name === TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY) {
    return 'public';
  }
  return null;
}

function actionProviderResultNoteId(action: AiActionRequest): string | null {
  const metadata = isRecord(action.metadata_json) ? action.metadata_json : null;
  const providerResult = isRecord(metadata?.provider_result) ? metadata.provider_result : null;
  const noteId = providerResult?.note_id ?? providerResult?.id;
  if (typeof noteId === 'string' && noteId.trim().length > 0) {
    return noteId.trim();
  }
  if (typeof noteId === 'number' && Number.isFinite(noteId)) {
    return String(noteId);
  }
  return null;
}

function actionExecutedTime(action: AiActionRequest): number | null {
  return parseTime(action.executed_at) ?? parseTime(action.updated_at);
}

function normalizeTimelineBody(value: string | null | undefined): string {
  return normalizeKnowledgeReplyText(value).replace(/\s+/g, ' ').trim();
}

function ticketNoteTime(note: TicketNoteLike): number | null {
  return parseTime(note.updatedAt) ?? parseTime(note.createdAt);
}

function ticketNoteFingerprint(note: TicketNoteLike): string {
  if (note.updateFingerprint && note.updateFingerprint.trim().length > 0) {
    return note.updateFingerprint.trim();
  }
  return JSON.stringify({
    id: note.id,
    visibility: note.visibility,
    author_id: note.authorId ?? null,
    author_role: note.authorRole ?? 'unknown',
    created_at: note.createdAt || null,
    updated_at: note.updatedAt ?? null,
    body: normalizeTimelineBody(note.body),
  });
}

function latestTicketNote(notes: TicketNoteLike[]): TicketNoteLike | null {
  return [...notes]
    .sort((left, right) => {
      const rightTime = ticketNoteTime(right) ?? 0;
      const leftTime = ticketNoteTime(left) ?? 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
      return String(right.id).localeCompare(String(left.id));
    })[0] ?? null;
}

function resolveActionProviderNote(action: AiActionRequest, notes: TicketNoteLike[]): TicketNoteLike | null {
  const providerNoteId = actionProviderResultNoteId(action);
  if (providerNoteId) {
    const exact = notes.find((note) => String(note.id) === providerNoteId);
    if (exact) {
      return exact;
    }
  }

  const visibility = actionPayloadVisibility(action);
  const body = actionPayloadBody(action);
  if (!visibility || !body) {
    return null;
  }
  const normalizedBody = normalizeTimelineBody(body);
  return notes
    .filter((note) => note.visibility === visibility && normalizeTimelineBody(note.body) === normalizedBody)
    .sort((left, right) => (ticketNoteTime(right) ?? 0) - (ticketNoteTime(left) ?? 0))[0] ?? null;
}

function actionConversationTime(action: AiActionRequest, notes: TicketNoteLike[]): number | null {
  const providerNote = resolveActionProviderNote(action, notes);
  return providerNote ? ticketNoteTime(providerNote) : actionExecutedTime(action);
}

function actionConversationTimeOrNull(action: AiActionRequest | null, notes: TicketNoteLike[]): number | null {
  return action ? actionConversationTime(action, notes) : null;
}

function latestExecutedAction(actions: AiActionRequest[], capabilityName: string, notes: TicketNoteLike[]): AiActionRequest | null {
  return actions
    .filter((action) => action.capability_name === capabilityName && action.status === 'executed')
    .sort((left, right) => (actionConversationTime(right, notes) ?? 0) - (actionConversationTime(left, notes) ?? 0))[0] ?? null;
}

function isKanapMarkedBody(value: string): boolean {
  const normalized = normalizeTimelineBody(value).toLocaleLowerCase();
  return normalized.includes('[kanap triage proposal]')
    || normalized.includes('this note was prepared by kanap')
    || normalized.includes('prepared by the agent control center');
}

function buildTicketTimeline(
  ticket: TicketLike,
  notes: TicketNoteLike[],
  kanapPublicBodies: Set<string>,
): TicketTimelineEntry[] {
  const entries: TicketTimelineEntry[] = [];
  const description = normalizeKnowledgeReplyText(ticket.description);
  if (description) {
    entries.push({
      id: `ticket:${ticket.id}:description`,
      kind: 'description',
      visibility: 'public',
      actor: 'requester_candidate',
      actorSource: 'initial_ticket',
      actorId: null,
      body: description,
      createdAt: null,
      updatedAt: null,
      updateFingerprint: null,
    });
  }

  for (const note of notes) {
    const body = normalizeKnowledgeReplyText(note.body);
    const normalizedBody = normalizeTimelineBody(body);
    const markedKanap = kanapPublicBodies.has(normalizedBody) || isKanapMarkedBody(body) || note.authorRole === 'kanap_agent';
    const actor = markedKanap
      ? 'kanap_agent'
      : note.authorRole === 'requester'
        ? 'requester_candidate'
        : note.visibility === 'internal' || note.authorRole === 'support'
          ? 'support_or_unknown'
          : 'requester_candidate';
    const actorSource: TicketTimelineEntry['actorSource'] = markedKanap
      ? 'kanap_marker'
      : note.authorRole === 'requester'
        ? 'provider_requester_user'
        : note.visibility === 'internal' || note.authorRole === 'support'
          ? 'provider_support_user'
          : 'public_non_kanap_followup';
    const createdTime = parseTime(note.createdAt);
    const updatedTime = ticketNoteTime(note);
    entries.push({
      id: `followup:${note.id}`,
      kind: 'followup',
      visibility: note.visibility,
      actor,
      actorSource,
      actorId: note.authorId ?? null,
      body,
      createdAt: createdTime == null ? null : new Date(createdTime).toISOString(),
      updatedAt: updatedTime == null ? null : new Date(updatedTime).toISOString(),
      updateFingerprint: ticketNoteFingerprint(note),
    });
  }

  return entries.sort((left, right) => {
    const leftTime = parseTime(left.createdAt) ?? 0;
    const rightTime = parseTime(right.createdAt) ?? 0;
    return leftTime - rightTime;
  });
}

function evaluateConversationGate(
  actions: AiActionRequest[],
  timeline: TicketTimelineEntry[],
  notes: TicketNoteLike[],
): ConversationActionGate {
  const lastInternal = latestExecutedAction(actions, TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY, notes);
  const lastPublic = latestExecutedAction(actions, TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY, notes);
  const latestNote = latestTicketNote(notes);
  const preparedAt = new Date().toISOString();
  const requesterSignals = timeline
    .filter((entry) => entry.actor === 'requester_candidate')
    .map((entry) => ({ entry, time: parseTime(entry.createdAt) }))
    .filter((signal): signal is { entry: TicketTimelineEntry; time: number } => signal.time != null)
    .sort((left, right) => right.time - left.time);
  const latestRequester = requesterSignals[0] ?? null;

  const decide = (lastAction: AiActionRequest | null, initialReason: string): { allowed: boolean; reason: string } => {
    if (!lastAction) {
      return { allowed: true, reason: initialReason };
    }
    const lastActionTime = actionConversationTime(lastAction, notes);
    if (!latestRequester || lastActionTime == null || latestRequester.time <= lastActionTime) {
      return { allowed: false, reason: 'waiting_for_new_requester_message' };
    }
    return { allowed: true, reason: 'new_requester_message_after_last_agent_action' };
  };

  const internalDecision = decide(lastInternal, 'no_prior_agent_internal_note');
  const publicDecision = decide(lastPublic, 'no_prior_agent_public_reply');
  return {
    can_prepare_internal_note: internalDecision.allowed,
    can_prepare_public_reply: publicDecision.allowed,
    can_prepare_sourced_answer: publicDecision.allowed,
    can_prepare_administrative_close_reply: true,
    internal_note_reason: internalDecision.reason,
    public_reply_reason: publicDecision.reason,
    sourced_answer_reason: publicDecision.reason,
    administrative_close_reply_reason: 'administrative_close_reply_dedup_guarded',
    latest_requester_message_at: isoFromTime(latestRequester?.time ?? null),
    latest_requester_message_id: latestRequester?.entry.id ?? null,
    last_agent_internal_note_at: isoFromTime(actionConversationTimeOrNull(lastInternal, notes)),
    last_agent_internal_note_action_id: lastInternal?.id ?? null,
    last_agent_public_reply_at: isoFromTime(actionConversationTimeOrNull(lastPublic, notes)),
    last_agent_public_reply_action_id: lastPublic?.id ?? null,
    requester_classification_confidence: latestRequester
      ? latestRequester.entry.actorSource === 'provider_requester_user' ? 'provider_requester_user' : 'public_non_kanap_followup'
      : (lastInternal || lastPublic) ? 'none' : 'initial_ticket',
    ticket_history_entry_count: notes.length,
    latest_ticket_note_id: latestNote?.id ?? null,
    latest_ticket_note_at: isoFromTime(latestNote ? ticketNoteTime(latestNote) : null),
    latest_ticket_note_fingerprint: latestNote ? ticketNoteFingerprint(latestNote) : null,
    latest_requester_message_fingerprint: latestRequester?.entry.updateFingerprint ?? null,
    prepared_at: preparedAt,
  };
}

function timelineSummaryLines(timeline: TicketTimelineEntry[]): string[] {
  if (timeline.length === 0) {
    return ['- No ticket history entries were available.'];
  }
  return timeline.slice(-8).map((entry) => {
    const at = entry.createdAt ? entry.createdAt.slice(0, 19).replace('T', ' ') : 'initial ticket';
    const actor = entry.actor === 'kanap_agent'
      ? 'KANAP agent'
      : entry.actor === 'requester_candidate'
        ? 'requester/public user'
        : 'support/internal';
    return `- ${at} / ${actor} / ${entry.visibility}: ${clampText(entry.body, 220)}`;
  });
}

function buildTriageNote(
  ticket: TicketLike,
  knowledgeItems: KnowledgeSearchItem[],
  timeline: TicketTimelineEntry[],
  webResults: WebSearchResultItem[] = [],
  // When the planner deliberately handled the ticket itself — an internal escalation (no
  // requester reply prepared) or a planner-authored administrative reply — the note states the
  // agent's rationale. The "synthesis unavailable, complete manually" boilerplate is only honest
  // when a knowledge-sourced answer was actually expected and failed. An escalation does not
  // present the (insufficient) candidate sources as "found"; an administrative reply keeps them
  // as context but labels them as unused.
  plannerOutcome: { kind: 'escalation' | 'administrative_reply'; reason: string | null } | null = null,
): string {
  const technicianBrief = plannerOutcome
    ? (plannerOutcome.reason?.trim()
      || (plannerOutcome.kind === 'administrative_reply'
        ? 'The agent answered with an administrative reply (see the proposed requester reply on this ticket); no knowledge-sourced answer was required.'
        : 'The agent escalated this ticket internally; no requester reply was prepared.'))
    : 'AI reply synthesis was unavailable or skipped. Review the possible sources above and complete the requester answer manually before approving.';
  return renderProviderBody([
    '[KANAP triage proposal]',
    `Ticket #${ticket.id} - ${ticket.title}`,
    ticket.status ? `Status: ${ticket.status}` : null,
    ticket.priority ? `Priority: ${ticket.priority}` : null,
    '',
    'Ticket history considered:',
    ...timelineSummaryLines(timeline),
    '',
    ...(plannerOutcome?.kind === 'escalation'
      ? []
      : [
        plannerOutcome?.kind === 'administrative_reply'
          ? 'Candidate sources reviewed (not used by the administrative reply; no article body copied):'
          : 'Possible sources found (fallback mode; no article body copied):',
        ...fallbackSourceLines(knowledgeItems, webResults, 8),
        '',
      ]),
    'Technician brief:',
    technicianBrief,
    '',
    'No external change has been made. This note was prepared by KANAP and requires human approval before posting.',
  ], MAX_INTERNAL_NOTE_CHARS);
}

function ticketLooksFrench(ticket: TicketLike): boolean {
  const text = `${ticket.title} ${ticket.description ?? ''}`.toLocaleLowerCase();
  return /[àâçéèêëîïôùûüÿœæ]/i.test(text)
    || /\b(bonjour|besoin|merci|recette|vous|pouvez|aider|demande|incident)\b/.test(text);
}

function configuredReplyLanguage(definition: AiAgentDefinition | null): string | null {
  const persona = isRecord(definition?.persona_json) ? definition.persona_json : {};
  const outputStyle = isRecord(persona.output_style) ? persona.output_style : {};
  const language = typeof outputStyle.language === 'string' ? outputStyle.language.trim().toLowerCase() : '';
  return ['fr', 'en', 'de', 'es'].includes(language) ? language : null;
}

function resolveReplyLanguage(
  definition: AiAgentDefinition | null,
  ticket: TicketLike,
  knowledgeLanguage: string | null | undefined,
): string {
  return configuredReplyLanguage(definition)
    ?? knowledgeLanguage
    ?? (ticketLooksFrench(ticket) ? 'fr' : 'en');
}

function normalizeKnowledgeReplyText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '[')
    .replace(/&gt;/gi, ']')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (_match, alt) => String(alt || '').trim() ? `[image: ${String(alt).trim()}]` : '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/[<>]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeForProvider(value: string | null | undefined, maxChars: number): string {
  const sanitized = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, 'javascript[:]')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  if (!sanitized) return '';
  return sanitized.length > maxChars ? `${sanitized.slice(0, maxChars - 3).trimEnd()}...` : sanitized;
}

function sanitizeInlineForProvider(value: string | null | undefined, maxChars: number): string {
  return clampText(sanitizeForProvider(value, maxChars).replace(/\s+/g, ' '), maxChars);
}

function renderProviderBody(lines: Array<string | null>, maxChars: number): string {
  return sanitizeForProvider(lines.filter((line): line is string => line !== null).join('\n'), maxChars);
}

function latestRequesterExcerpt(timeline: TicketTimelineEntry[]): string | null {
  const entry = [...timeline].reverse().find((candidate) => candidate.actor === 'requester_candidate');
  return entry ? clampText(entry.body, 260) : null;
}

function replyLocale(language: string | null | undefined, ticket: TicketLike): {
  greeting: string;
  sources: string;
  closing: string[];
  technicianWillConfirm: string;
  noReliableAnswer: string;
  possibleReferences: string;
  possibleReferencesIntro: string;
  latestRequester: (excerpt: string) => string;
} {
  const normalized = String(language ?? '').trim().toLocaleLowerCase();
  const useFrench = normalized.startsWith('fr') || (!normalized && ticketLooksFrench(ticket));
  if (useFrench) {
    return {
      greeting: 'Bonjour,',
      sources: 'Sources :',
      technicianWillConfirm: 'Un technicien du support vérifiera et complétera la réponse si nécessaire.',
      noReliableAnswer: 'Nous n\'avons pas trouvé d\'éléments suffisamment fiables pour vous proposer une réponse automatique complète sur cette demande.',
      possibleReferences: 'Références possibles :',
      possibleReferencesIntro: 'Nous avons trouvé des références possibles, mais un technicien doit confirmer lesquelles correspondent à votre situation avant de vous donner une réponse complète.',
      latestRequester: (excerpt) => `Dernier message demandeur pris en compte : ${excerpt}.`,
      closing: ['Cordialement,', 'L\'équipe support'],
    };
  }
  return {
    greeting: 'Hello,',
    sources: 'Sources:',
    technicianWillConfirm: 'A helpdesk technician will verify and complete the answer if needed.',
    noReliableAnswer: 'We could not find enough reliable information to propose a complete automated answer for this request.',
    possibleReferences: 'Possible references:',
    possibleReferencesIntro: 'We found possible references, but a technician needs to confirm which ones match your situation before giving you a complete answer.',
    latestRequester: (excerpt) => `Latest requester update considered: ${excerpt}.`,
    closing: ['Best regards,', 'The support team'],
  };
}

function sourceLineFromKnowledge(item: KnowledgeSearchItem, index: number): string {
  const ref = sanitizeInlineForProvider(item.ref ?? item.id ?? `document-${index + 1}`, 80);
  const title = sanitizeInlineForProvider(item.title ?? 'Untitled document', 180);
  // Be explicit when a candidate was retrieved but not validated by the interpreter, so the
  // technician knows it still needs a relevance check (it never grounded an automated reply).
  const suffix = item.validation_status === 'unvalidated' ? ' [unvalidated candidate]' : '';
  return `- ${ref} - ${title}${suffix}`;
}

function sourceLineFromWeb(item: WebSearchResultItem): string {
  const title = sanitizeInlineForProvider(item.title || item.url, 180);
  const url = sanitizeInlineForProvider(item.url, 500);
  return `- ${title} (${url})`;
}

function fallbackSourceLines(
  knowledgeItems: KnowledgeSearchItem[],
  webResults: WebSearchResultItem[],
  limit: number,
): string[] {
  const lines = [
    ...knowledgeItems.map(sourceLineFromKnowledge),
    ...webResults.map(sourceLineFromWeb),
  ].slice(0, limit);
  return lines.length > 0 ? lines : ['- No source candidate was retrieved.'];
}

function synthesisSourceLine(source: ReplySynthesisSource): string {
  const title = sanitizeInlineForProvider(source.title, 180) || 'Untitled source';
  if (source.kind === 'knowledge') {
    const ref = sanitizeInlineForProvider(source.ref ?? 'knowledge', 80) || 'knowledge';
    return `- ${ref} - ${title}`;
  }
  const url = source.url ? sanitizeInlineForProvider(source.url, 500) : '';
  return `- ${title}${url ? ` (${url})` : ''}`;
}

function rejectedSynthesisSourceLine(source: ReplySynthesisRejectedSource): string {
  return `${synthesisSourceLine(source)}: ${sanitizeInlineForProvider(source.reason, 220)}`;
}

function limitedSourceLines(lines: string[], maxLines: number, omittedLabel: string): string[] {
  if (lines.length <= maxLines) {
    return lines;
  }
  return [
    ...lines.slice(0, maxLines),
    `- ${lines.length - maxLines} more ${omittedLabel} omitted from this compact note.`,
  ];
}

function renderSynthesizedRequesterReply(
  ticket: TicketLike,
  synthesis: ReplySynthesisResult,
): string {
  const locale = replyLocale(synthesis.language, ticket);
  if (!synthesis.usable) {
    return renderProviderBody([
      locale.greeting,
      '',
      locale.noReliableAnswer,
      '',
      locale.technicianWillConfirm,
      '',
      ...locale.closing,
    ], MAX_PUBLIC_REPLY_CHARS);
  }
  const sourceLines = synthesis.used_sources.map(synthesisSourceLine);
  const requesterBody = sanitizeForProvider(synthesis.requester_reply, MAX_SYNTHESIZED_REQUESTER_BODY_CHARS);
  return renderProviderBody([
    locale.greeting,
    '',
    requesterBody,
    '',
    ...(sourceLines.length > 0 ? [locale.sources, ...sourceLines, ''] : []),
    synthesis.needs_human_review ? locale.technicianWillConfirm : null,
    synthesis.needs_human_review ? '' : null,
    ...locale.closing,
  ], MAX_PUBLIC_REPLY_CHARS);
}

function renderSynthesizedTriageNote(
  ticket: TicketLike,
  timeline: TicketTimelineEntry[],
  synthesis: ReplySynthesisResult,
): string {
  const used = limitedSourceLines(synthesis.used_sources.map(synthesisSourceLine), MAX_SYNTHESIS_NOTE_SOURCES, 'used source(s)');
  const rejected = limitedSourceLines(
    synthesis.rejected_sources.map(rejectedSynthesisSourceLine),
    MAX_SYNTHESIS_NOTE_REJECTIONS,
    'rejected source(s)',
  );
  const technicianBrief = sanitizeForProvider(
    synthesis.technician_brief || 'No synthesis brief was produced.',
    MAX_INTERNAL_SYNTHESIS_BRIEF_CHARS,
  );
  const recommendedReply = synthesis.usable
    ? sanitizeForProvider(synthesis.requester_reply, MAX_INTERNAL_RECOMMENDED_REPLY_CHARS)
    : 'No reliable source-grounded answer was produced; the requester reply will ask a technician to follow up.';
  return renderProviderBody([
    '[KANAP triage proposal]',
    `Ticket #${ticket.id} - ${ticket.title}`,
    ticket.status ? `Status: ${ticket.status}` : null,
    ticket.priority ? `Priority: ${ticket.priority}` : null,
    '',
    'Ticket history considered:',
    ...timelineSummaryLines(timeline).slice(-4),
    '',
    'Technician brief:',
    technicianBrief,
    '',
    'Used sources:',
    ...(used.length > 0 ? used : ['- None']),
    '',
    'Rejected/off-topic sources:',
    ...(rejected.length > 0 ? rejected : ['- None recorded']),
    '',
    'Recommended reply to requester:',
    recommendedReply,
    '',
    synthesis.needs_human_review ? 'Uncertainty: technician confirmation is recommended before approval.' : null,
    synthesis.fallback_reason ? `Synthesis validation note: ${synthesis.fallback_reason}.` : null,
    '',
    'No external change has been made. This note was prepared by KANAP and requires human approval before posting.',
  ], MAX_INTERNAL_NOTE_CHARS);
}

function buildRequesterReply(
  ticket: TicketLike,
  knowledgeItems: KnowledgeSearchItem[],
  timeline: TicketTimelineEntry[] = [],
  webResults: WebSearchResultItem[] = [],
): string {
  const locale = replyLocale(null, ticket);
  const latestRequester = latestRequesterExcerpt(timeline);
  return renderProviderBody([
    locale.greeting,
    '',
    locale.noReliableAnswer,
    latestRequester ? locale.latestRequester(latestRequester) : null,
    '',
    locale.technicianWillConfirm,
    '',
    ...locale.closing,
  ], MAX_PUBLIC_REPLY_CHARS);
}

function normalizedContextString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : null;
}

function buildClassificationUpdateProposal(
  ticket: TicketLike,
  classification: Record<string, unknown> | null,
): { proposed: Record<string, string>; reason: string } | null {
  const proposed: Record<string, string> = {};
  const type = normalizedContextString(classification, 'type');
  const priority = normalizedContextString(classification, 'priority');
  const urgency = normalizedContextString(classification, 'urgency');
  if (type !== 'incident' && type !== 'request') {
    proposed.type = 'request';
  }
  if (!['very_low', 'low', 'medium', 'high', 'very_high', 'major'].includes(priority ?? '')) {
    proposed.priority = 'medium';
  }
  if (!['very_low', 'low', 'medium', 'high', 'very_high', 'major'].includes(urgency ?? '')) {
    proposed.urgency = 'medium';
  }
  if (Object.keys(proposed).length === 0) {
    return null;
  }
  return {
    proposed,
    reason: `Normalize ticket ${ticket.id} classification fields that are missing or not mapped before helpdesk processing.`,
  };
}

function buildStatusUpdateProposal(
  lifecycle: Record<string, unknown> | null,
  shouldWaitForRequester: boolean,
): { transitionKey: string; reason: string } | null {
  if (!shouldWaitForRequester || lifecycle?.terminal === true) {
    return null;
  }
  const transitions = Array.isArray(lifecycle?.allowedTransitions)
    ? lifecycle.allowedTransitions.filter(isRecord)
    : [];
  const pending = transitions.find((transition) => transition.key === 'pending' && transition.destructive !== true);
  if (!pending) {
    return null;
  }
  return {
    transitionKey: 'pending',
    reason: 'A requester-facing answer is being prepared; move the ticket to pending/waiting state after approval so support waits for requester feedback.',
  };
}

function proposalHash(value: unknown): string {
  return hashStableJson(value);
}

// Terminal ticket transitions (solve/close) are destructive cleanup actions. Even
// though they reuse the status_update capability (action class 'status', which is
// in the low-risk automation allowlist), they must NEVER auto-execute. New
// provider payloads stamp the neutral terminal flag; transitionKey remains a
// legacy persisted-row backstop.
function isTerminalStatusAction(action: AiActionRequest): boolean {
  if (!action.capability_name.includes('status_update')) return false;
  const payload = isRecord(action.action_payload_json) ? action.action_payload_json : null;
  if (!payload) return false;
  if (payload.terminal === true) return true;
  const transitionKey = typeof payload.transitionKey === 'string' ? payload.transitionKey : null;
  return transitionKey != null && PLANNER_TERMINAL_TRANSITIONS.has(transitionKey);
}

function actionMetadataString(action: AiActionRequest, field: string): string | null {
  const metadata = isRecord(action.metadata_json) ? action.metadata_json : null;
  const value = metadata?.[field];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function capabilityPhaseKey(action: Pick<AiActionRequest, 'capability_name' | 'capability_version'>): string {
  return `${action.capability_name}:${action.capability_version}`;
}

function bulkApproveOrder(action: AiActionRequest, executionPhases?: Map<string, number>): number {
  return executionPhases?.get(action.id)
    ?? STATIC_CAPABILITY_EXECUTION_PHASES.get(capabilityPhaseKey(action))
    ?? DEFAULT_BULK_EXECUTION_PHASE;
}

function bulkApproveActionSort(
  left: AiActionRequest,
  right: AiActionRequest,
  executionPhases?: Map<string, number>,
): number {
  const orderDiff = bulkApproveOrder(left, executionPhases) - bulkApproveOrder(right, executionPhases);
  if (orderDiff !== 0) return orderDiff;
  const leftTime = actionSortTime(left);
  const rightTime = actionSortTime(right);
  if (leftTime !== rightTime) return leftTime - rightTime;
  return left.id.localeCompare(right.id);
}

function buildAssignmentUpdateProposal(
  routing: Record<string, unknown> | null,
): { target: Record<string, string>; reason: string } | null {
  if (!routing || routing.assignmentSupported !== true) {
    return null;
  }
  if (typeof routing.assignee === 'string' && routing.assignee.trim().length > 0) {
    return null;
  }
  const targets = Array.isArray(routing.supportedAssignmentTargets)
    ? routing.supportedAssignmentTargets.filter(isRecord)
    : [];
  const target = targets.find((candidate) =>
    (candidate.kind === 'group' || candidate.kind === 'user')
    && typeof candidate.key === 'string'
    && typeof candidate.label === 'string',
  );
  if (!target) {
    return null;
  }
  return {
    target: {
      kind: String(target.kind),
      key: String(target.key),
      label: String(target.label),
    },
    reason: `Assign the ticket to ${String(target.label)} because the ticket is currently unassigned and the provider exposes this target as supported.`,
  };
}

function serializeRun(run: AiRun) {
  return {
    id: run.id,
    tenant_id: run.tenant_id,
    user_id: run.user_id,
    conversation_id: run.conversation_id,
    request_id: run.request_id,
    ai_api_key_id: run.ai_api_key_id,
    invocation_channel: run.invocation_channel,
    trigger_kind: run.trigger_kind,
    status: run.status,
    input_summary: run.input_summary,
    output_summary: run.output_summary,
    usage_json: run.usage_json,
    cost_json: run.cost_json,
    metadata_json: run.metadata_json,
    started_at: toIso(run.started_at),
    completed_at: toIso(run.completed_at),
    created_at: toIso(run.created_at),
    updated_at: toIso(run.updated_at),
  };
}

function serializeToolExecution(tool: AiToolExecution) {
  return {
    id: tool.id,
    tenant_id: tool.tenant_id,
    run_id: tool.run_id,
    step_id: tool.step_id,
    action_request_id: tool.action_request_id,
    approval_id: tool.approval_id,
    capability_name: tool.capability_name,
    capability_version: tool.capability_version,
    surface: tool.surface,
    effect: tool.effect,
    status: tool.status,
    input_hash: tool.input_hash,
    input_summary: tool.input_summary,
    output_summary: tool.output_summary,
    error_message: tool.error_message,
    duration_ms: tool.duration_ms,
    usage_json: tool.usage_json,
    cost_json: tool.cost_json,
    metadata_json: tool.metadata_json,
    started_at: toIso(tool.started_at),
    completed_at: toIso(tool.completed_at),
    created_at: toIso(tool.created_at),
  };
}

function serializeRunStep(step: AiRunStep) {
  return {
    id: step.id,
    run_id: step.run_id,
    step_index: step.step_index,
    kind: step.kind,
    status: step.status,
    capability_name: step.capability_name,
    capability_version: step.capability_version,
    input_summary: step.input_summary,
    output_summary: step.output_summary,
    error_message: step.error_message,
    started_at: toIso(step.started_at),
    completed_at: toIso(step.completed_at),
    created_at: toIso(step.created_at),
  };
}

// Human-readable per-task detail derived from an action's proposed payload, used
// to surface "what the agent actually proposed/did" inline in the Activity
// timeline (KANAP IA spec 23 §4.3) instead of only a generic label. Bounded:
// long text is truncated; only the proposed content and diffs are exposed.
const ACTIVITY_DETAIL_BODY_MAX = 1200;
type ActivityActionDetail = {
  capabilityName: string | null;
  body: string | null;
  changes: Array<{ field: string; from: string | null; to: string | null }> | null;
  reason: string | null;
  rationale: string | null;
  evidenceCount: number | null;
};

function activityActionDetail(action: AiActionRequest): ActivityActionDetail | null {
  const payload = isRecord(action.action_payload_json) ? action.action_payload_json : null;
  const evidenceCount = Array.isArray(action.evidence_ids) ? action.evidence_ids.length : null;
  const truncate = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length > ACTIVITY_DETAIL_BODY_MAX ? `${trimmed.slice(0, ACTIVITY_DETAIL_BODY_MAX)}…` : trimmed;
  };
  if (!payload) {
    return evidenceCount
      ? { capabilityName: action.capability_name, body: null, changes: null, reason: null, rationale: null, evidenceCount }
      : null;
  }
  const body = truncate(payload.note_body) ?? truncate(payload.reply_body) ?? truncate(payload.body);
  const reason = truncate(payload.reason);
  const changes: Array<{ field: string; from: string | null; to: string | null }> = [];
  const current = isRecord(payload.current) ? payload.current : null;
  const proposed = isRecord(payload.proposed) ? payload.proposed : null;
  if (proposed) {
    for (const [field, value] of Object.entries(proposed)) {
      if (value == null || value === '') continue;
      changes.push({
        field,
        from: current && current[field] != null && current[field] !== '' ? String(current[field]) : null,
        to: String(value),
      });
    }
  } else {
    const target = payload.targetStatusLabel ?? payload.targetStatus ?? payload.transitionKey;
    if (target != null && target !== '') {
      const from = current ? (current.statusLabel ?? current.status ?? null) : null;
      changes.push({ field: 'status', from: from != null && from !== '' ? String(from) : null, to: String(target) });
    }
  }
  const assignmentTarget = isRecord(payload.target) ? payload.target : null;
  if (assignmentTarget && assignmentTarget.label != null && assignmentTarget.label !== '') {
    changes.push({ field: 'assignee', from: null, to: String(assignmentTarget.label) });
  }
  if (!body && !reason && changes.length === 0 && !evidenceCount) return null;
  return {
    capabilityName: action.capability_name,
    body,
    changes: changes.length > 0 ? changes : null,
    reason,
    rationale: null,
    evidenceCount,
  };
}

function serializeEvidence(evidence: AiEvidence) {
  return {
    id: evidence.id,
    tenant_id: evidence.tenant_id,
    run_id: evidence.run_id,
    tool_execution_id: evidence.tool_execution_id,
    action_request_id: evidence.action_request_id,
    source_provider: evidence.source_provider,
    source_object_type: evidence.source_object_type,
    source_object_id: evidence.source_object_id,
    source_uri: evidence.source_uri,
    trust_level: evidence.trust_level,
    redaction_status: evidence.redaction_status,
    content_hash: evidence.content_hash,
    summary: evidence.summary,
    payload_json: evidence.payload_json,
    retention_class: evidence.retention_class,
    collected_at: toIso(evidence.collected_at),
    created_at: toIso(evidence.created_at),
  };
}

function serializeObservation(observation: AiObservation) {
  return {
    id: observation.id,
    tenant_id: observation.tenant_id,
    run_id: observation.run_id,
    observation_type: observation.observation_type,
    status: observation.status,
    source_provider: observation.source_provider,
    source_object_type: observation.source_object_type,
    source_object_id: observation.source_object_id,
    severity: observation.severity,
    summary: observation.summary,
    evidence_ids: observation.evidence_ids,
    metadata_json: observation.metadata_json,
    observed_at: toIso(observation.observed_at),
    created_at: toIso(observation.created_at),
    updated_at: toIso(observation.updated_at),
  };
}

function serializeRecommendation(recommendation: AiRecommendation) {
  return {
    id: recommendation.id,
    tenant_id: recommendation.tenant_id,
    run_id: recommendation.run_id,
    observation_id: recommendation.observation_id,
    recommendation_type: recommendation.recommendation_type,
    status: recommendation.status,
    summary: recommendation.summary,
    rationale: recommendation.rationale,
    confidence: recommendation.confidence,
    proposed_action_class: recommendation.proposed_action_class,
    max_autonomy_level: recommendation.max_autonomy_level,
    evidence_ids: recommendation.evidence_ids,
    metadata_json: recommendation.metadata_json,
    created_at: toIso(recommendation.created_at),
    updated_at: toIso(recommendation.updated_at),
  };
}

function serializeDecision(decision: AiDecision) {
  return {
    id: decision.id,
    tenant_id: decision.tenant_id,
    run_id: decision.run_id,
    recommendation_id: decision.recommendation_id,
    decision: decision.decision,
    status: decision.status,
    reason: decision.reason,
    evidence_ids: decision.evidence_ids,
    policy_result_json: decision.policy_result_json,
    metadata_json: decision.metadata_json,
    created_at: toIso(decision.created_at),
    updated_at: toIso(decision.updated_at),
  };
}

function serializeEvaluation(evaluation: AiEvaluation) {
  return {
    id: evaluation.id,
    tenant_id: evaluation.tenant_id,
    run_id: evaluation.run_id,
    recommendation_id: evaluation.recommendation_id,
    decision_id: evaluation.decision_id,
    status: evaluation.status,
    outcome: evaluation.outcome,
    scores_json: evaluation.scores_json,
    feedback_json: evaluation.feedback_json,
    metadata_json: evaluation.metadata_json,
    created_at: toIso(evaluation.created_at),
    updated_at: toIso(evaluation.updated_at),
  };
}

type ActionExecutionReadiness = {
  can_execute: boolean;
  can_reject: boolean;
  blocked_reason: string | null;
  requires_sandbox_write_target: boolean;
  sandbox_write_target_ref: string | null;
};

function serializeActionRequest(action: AiActionRequest, executionReadiness?: ActionExecutionReadiness | null) {
  return {
    id: action.id,
    tenant_id: action.tenant_id,
    run_id: action.run_id,
    tool_execution_id: action.tool_execution_id,
    conversation_id: action.conversation_id,
    user_id: action.user_id,
    preview_id: action.preview_id,
    capability_name: action.capability_name,
    capability_version: action.capability_version,
    effect: action.effect,
    status: action.status,
    target_type: action.target_type,
    target_id: action.target_id,
    target_ref: action.target_ref,
    idempotency_key: action.idempotency_key,
    action_payload_json: action.action_payload_json,
    provider_kind: action.provider_kind,
    provider_key: action.provider_key,
    input_hash: action.input_hash,
    input_summary: action.input_summary,
    evidence_ids: action.evidence_ids,
    expires_at: toIso(action.expires_at),
    approved_at: toIso(action.approved_at),
    rejected_at: toIso(action.rejected_at),
    executed_at: toIso(action.executed_at),
    error_message: action.error_message,
    metadata_json: action.metadata_json,
    execution_readiness: executionReadiness ?? null,
    created_at: toIso(action.created_at),
    updated_at: toIso(action.updated_at),
  };
}

function serializeApproval(approval: AiApproval) {
  return {
    id: approval.id,
    tenant_id: approval.tenant_id,
    action_request_id: approval.action_request_id,
    capability_name: approval.capability_name,
    capability_version: approval.capability_version,
    source: approval.source,
    status: approval.status,
    actor_user_id: approval.actor_user_id,
    actor_label: approval.actor_label,
    input_hash: approval.input_hash,
    evidence_ids: approval.evidence_ids,
    reason: approval.reason,
    matched_policy_id: approval.matched_policy_id,
    matched_policy_version: approval.matched_policy_version,
    decision_json: approval.decision_json,
    expires_at: toIso(approval.expires_at),
    decided_at: toIso(approval.decided_at),
    created_at: toIso(approval.created_at),
  };
}

function serializeLiveTarget(target: AiLiveTestTarget | AgentQueueLiveTargetLike) {
  return {
    id: target.id,
    tenant_id: 'tenant_id' in target ? target.tenant_id : null,
    provider_kind: target.provider_kind,
    provider_key: target.provider_key,
    environment: target.environment,
    target_kind: target.target_kind,
    target_key: target.target_key,
    external_ref: target.external_ref,
    allowed_effect: target.allowed_effect,
    safety_label: target.safety_label,
    enabled: target.enabled,
    expires_at: 'expires_at' in target ? toIso(target.expires_at) : null,
    metadata_json: 'metadata_json' in target ? target.metadata_json : null,
    created_at: 'created_at' in target ? toIso(target.created_at) : null,
    updated_at: 'updated_at' in target ? toIso(target.updated_at) : null,
  };
}

function serializeAgentDefinition(definition: AiAgentDefinition) {
  return {
    id: definition.id,
    tenant_id: definition.tenant_id,
    agent_key: definition.agent_key,
    name: definition.name,
    description: definition.description,
    agent_type: definition.agent_type,
    status: definition.status,
    environment: definition.environment,
    provider_bindings_json: definition.provider_bindings_json,
    allowed_capabilities_json: definition.allowed_capabilities_json,
    forbidden_capabilities_json: definition.forbidden_capabilities_json,
    max_autonomy_level: definition.max_autonomy_level,
    default_approval_requirement: definition.default_approval_requirement,
    agent_priority: cleanAgentPriority(definition.agent_priority),
    trigger_policy_json: definition.trigger_policy_json,
    scope_policy_json: definition.scope_policy_json,
    queue_policy_json: definition.queue_policy_json,
    response_policy_json: definition.response_policy_json,
    evaluation_policy_json: definition.evaluation_policy_json,
    persona_json: definition.persona_json ?? null,
    config_version: definition.config_version ?? 1,
    updated_by_user_id: definition.updated_by_user_id ?? null,
    metadata_json: definition.metadata_json,
    created_at: toIso(definition.created_at),
    updated_at: toIso(definition.updated_at),
  };
}

function serializeAgentWorkItem(workItem: AiAgentWorkItem) {
  return {
    id: workItem.id,
    tenant_id: workItem.tenant_id,
    agent_definition_id: workItem.agent_definition_id,
    trigger_id: workItem.trigger_id,
    source_provider_kind: workItem.source_provider_kind,
    source_provider_key: workItem.source_provider_key,
    source_object_type: workItem.source_object_type,
    source_object_ref: workItem.source_object_ref,
    source_object_updated_at: toIso(workItem.source_object_updated_at),
    work_kind: workItem.work_kind,
    status: workItem.status,
    priority: workItem.priority,
    dedup_key: workItem.dedup_key,
    lease_owner: workItem.lease_owner,
    leased_until: toIso(workItem.leased_until),
    attempt_count: workItem.attempt_count,
    max_attempts: workItem.max_attempts,
    next_attempt_at: toIso(workItem.next_attempt_at),
    last_run_id: workItem.last_run_id,
    last_action_request_ids: workItem.last_action_request_ids,
    last_error: workItem.last_error,
    metadata_json: workItem.metadata_json,
    created_at: toIso(workItem.created_at),
    updated_at: toIso(workItem.updated_at),
  };
}

function serializeAgentTargetState(state: AiAgentTargetState) {
  return {
    id: state.id,
    tenant_id: state.tenant_id,
    agent_definition_id: state.agent_definition_id,
    provider_kind: state.provider_kind,
    provider_key: state.provider_key,
    target_type: state.target_type,
    target_ref: state.target_ref,
    last_seen_external_updated_at: toIso(state.last_seen_external_updated_at),
    last_processed_external_updated_at: toIso(state.last_processed_external_updated_at),
    next_review_at: toIso(state.next_review_at),
    last_run_id: state.last_run_id,
    last_public_reply_hash: state.last_public_reply_hash,
    last_internal_note_hash: state.last_internal_note_hash,
    last_classification_hash: state.last_classification_hash,
    last_assignment_hash: state.last_assignment_hash,
    agent_touched: state.agent_touched,
    needs_followup: state.needs_followup,
    claim_status: state.claim_status,
    claim_expires_at: toIso(state.claim_expires_at),
    claim_acquired_at: toIso(state.claim_acquired_at),
    claim_owner_work_item_id: state.claim_owner_work_item_id,
    claim_owner_run_id: state.claim_owner_run_id,
    claim_owner_priority: state.claim_owner_priority,
    claim_owner_action_request_ids: state.claim_owner_action_request_ids,
    claim_metadata_json: state.claim_metadata_json,
    state_json: state.state_json,
    created_at: toIso(state.created_at),
    updated_at: toIso(state.updated_at),
  };
}

function serializeAgentAuditEvent(event: AiAgentAuditEvent) {
  return {
    id: event.id,
    tenant_id: event.tenant_id,
    agent_definition_id: event.agent_definition_id,
    work_item_id: event.work_item_id,
    event_type: event.event_type,
    severity: event.severity,
    message: event.message,
    metadata_json: event.metadata_json,
    created_at: toIso(event.created_at),
  };
}

@Injectable()
export class AiAgentControlService {
  private readonly logger = new Logger(AiAgentControlService.name);
  private readonly targetingOptionsCache = new Map<string, { expiresAt: number; options: RefItem[] }>();

  constructor(
    private readonly diagnostics: AiReadonlyDiagnosticWorkflowService,
    private readonly approvals: AiApprovalService,
    private readonly dispatcher: AiCapabilityDispatcherService,
    private readonly liveTargets: AiLiveTestTargetService,
    private readonly providers: AiProviderRegistryService,
    private readonly agentQueue?: AiAgentWorkQueueService,
    private readonly knowledgePlanner?: AiKnowledgeSearchPlannerService,
    private readonly replySynthesis?: AiReplySynthesisService,
    private readonly promptCompiler?: AiAgentPromptCompilerService,
    private readonly sharedContextProfiles?: AiSharedContextProfileService,
    private readonly actionPlanner?: AiAgentActionPlannerService,
    private readonly ticketNeedBuilder?: AiTicketNeedRepresentationService,
    private readonly ticketEvidenceExtractor?: AiTicketEvidenceExtractionService,
    private readonly capabilities?: AiCapabilityRegistry,
  ) {}

  private async actionPlannerProfileForProvider(
    context: AiExecutionContextWithManager,
    providerKind: string,
    providerKey: string,
  ): Promise<ProviderActionPlannerProfile | null> {
    const providerLookup = (this.providers as unknown as {
      provider?: (ctx: AiExecutionContextWithManager, kind: any, key: string) => Promise<{ actionPlannerProfile?: ProviderActionPlannerProfile }>;
    }).provider;
    if (typeof providerLookup !== 'function') {
      return null;
    }
    try {
      const provider = await providerLookup.call(this.providers, context, providerKind, providerKey);
      return provider?.actionPlannerProfile ?? null;
    } catch {
      return null;
    }
  }

  private agentPromptCompiler(): AiAgentPromptCompilerService {
    return this.promptCompiler ?? new AiAgentPromptCompilerService();
  }

  private async compileAgentPromptRuntime(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition | null,
  ): Promise<{
    profile: CompiledAgentProfile;
    sharedContextResolution: SharedContextResolution;
    plannerGuidance: CompiledGuidance;
    interpreterGuidance: CompiledGuidance;
    synthesisGuidance: CompiledGuidance;
    actionPlannerGuidance: CompiledGuidance;
    promptProfileSummary: Record<string, unknown>;
  }> {
    const sharedContextResolution = this.sharedContextProfiles
      ? await this.sharedContextProfiles.resolveForAgent(context, definition)
      : { resolved: false, reason: 'not_configured' as const, requested_profile_id: null, context: null };
    const compiler = this.agentPromptCompiler();
    const profile = compiler.compile(definition?.persona_json ?? null, sharedContextResolution.context);
    const plannerGuidance = compiler.sliceFor(profile, 'planner');
    const interpreterGuidance = compiler.sliceFor(profile, 'interpreter');
    const synthesisGuidance = compiler.sliceFor(profile, 'synthesis');
    const actionPlannerGuidance = compiler.sliceFor(profile, 'action_planner');
    const promptProfileSummary = {
      prompt_profile_version: definition?.config_version ?? null,
      shared_context_profile_id: sharedContextResolution.context?.profile_id ?? sharedContextResolution.requested_profile_id,
      shared_context_version: sharedContextResolution.context?.version ?? null,
      shared_context_resolved: sharedContextResolution.resolved,
      shared_context_resolution_reason: sharedContextResolution.reason,
      guidance_hash: guidanceHash(synthesisGuidance),
      action_planner_guidance_hash: guidanceHash(actionPlannerGuidance),
      bounds_applied: synthesisGuidance.bounds_applied,
    };
    return {
      profile,
      sharedContextResolution,
      plannerGuidance,
      interpreterGuidance,
      synthesisGuidance,
      actionPlannerGuidance,
      promptProfileSummary,
    };
  }

  private async recordAgentAuditEvent(
    context: AiExecutionContextWithManager,
    input: {
      agentDefinitionId?: string | null;
      eventType: string;
      severity?: string | null;
      message: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    if (this.agentQueue) {
      await this.agentQueue.recordAuditEvent(context, input);
      return;
    }
    const repo = context.manager.getRepository(AiAgentAuditEvent);
    await repo.save(repo.create({
      tenant_id: context.tenantId,
      agent_definition_id: input.agentDefinitionId ?? null,
      work_item_id: null,
      event_type: input.eventType,
      severity: input.severity ?? 'info',
      message: input.message,
      metadata_json: input.metadata ?? null,
      created_at: new Date(),
    }));
  }

  private async evidenceIdsForTool(context: AiExecutionContextWithManager, toolExecutionId: string): Promise<string[]> {
    const rows = await context.manager.getRepository(AiEvidence).find({
      where: {
        tenant_id: context.tenantId,
        tool_execution_id: toolExecutionId,
      },
    });
    return rows.map((row) => row.id);
  }

  private async recordSynthesisRunStep(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      stepIndex: number;
      status: 'completed' | 'skipped' | 'failed';
      inputSummary: Record<string, unknown>;
      outputSummary: Record<string, unknown>;
      errorMessage?: string | null;
    },
  ): Promise<void> {
    const now = new Date();
    await context.manager.getRepository(AiRunStep).save(context.manager.getRepository(AiRunStep).create({
      tenant_id: context.tenantId,
      run_id: input.runId,
      step_index: input.stepIndex,
      kind: 'synthesis',
      status: input.status,
      capability_name: 'answer_synthesis',
      capability_version: '1.0.0',
      input_summary: input.inputSummary,
      output_summary: input.outputSummary,
      error_message: input.errorMessage ?? null,
      started_at: now,
      completed_at: now,
      created_at: now,
    }));
  }

  private async recordNeedRepresentationRunStep(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      stepIndex: number;
      status: 'completed' | 'skipped' | 'failed';
      inputSummary: Record<string, unknown>;
      outputSummary: Record<string, unknown>;
      errorMessage?: string | null;
    },
  ): Promise<void> {
    const now = new Date();
    await context.manager.getRepository(AiRunStep).save(context.manager.getRepository(AiRunStep).create({
      tenant_id: context.tenantId,
      run_id: input.runId,
      step_index: input.stepIndex,
      kind: 'need_representation',
      status: input.status,
      capability_name: 'ticket_need_representation',
      capability_version: '1.0.0',
      input_summary: input.inputSummary,
      output_summary: input.outputSummary,
      error_message: input.errorMessage ?? null,
      started_at: now,
      completed_at: now,
      created_at: now,
    }));
  }

  private async recordEvidenceExtractionRunStep(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      stepIndex: number;
      status: 'completed' | 'skipped' | 'failed';
      inputSummary: Record<string, unknown>;
      outputSummary: Record<string, unknown>;
      errorMessage?: string | null;
    },
  ): Promise<void> {
    const now = new Date();
    await context.manager.getRepository(AiRunStep).save(context.manager.getRepository(AiRunStep).create({
      tenant_id: context.tenantId,
      run_id: input.runId,
      step_index: input.stepIndex,
      kind: 'evidence_extraction',
      status: input.status,
      capability_name: 'ticket_image_evidence_extraction',
      capability_version: '1.0.0',
      input_summary: input.inputSummary,
      output_summary: input.outputSummary,
      error_message: input.errorMessage ?? null,
      started_at: now,
      completed_at: now,
      created_at: now,
    }));
  }

  private async recordSynthesisUsage(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      synthesis: ReplySynthesisResult;
    },
  ): Promise<void> {
    const repo = context.manager.getRepository(AiRun);
    const run = await repo.findOne({
      where: {
        id: input.runId,
        tenant_id: context.tenantId,
      },
    });
    if (!run) return;
    run.usage_json = {
      ...(isRecord(run.usage_json) ? run.usage_json : {}),
      synthesis: {
        input_tokens: input.synthesis.usage?.input_tokens ?? null,
        output_tokens: input.synthesis.usage?.output_tokens ?? null,
        estimated_tokens: input.synthesis.estimated_tokens,
      },
    };
    run.cost_json = {
      ...(isRecord(run.cost_json) ? run.cost_json : {}),
      synthesis: {
        estimated_cost_eur: input.synthesis.estimated_cost_eur,
      },
    };
    run.updated_at = new Date();
    await repo.save(run);
  }

  private async recordNeedRepresentationUsage(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      needRepresentation: TicketNeedRepresentationBuildResult;
    },
  ): Promise<void> {
    const repo = context.manager.getRepository(AiRun);
    const run = await repo.findOne({
      where: {
        id: input.runId,
        tenant_id: context.tenantId,
      },
    });
    if (!run) return;
    run.usage_json = {
      ...(isRecord(run.usage_json) ? run.usage_json : {}),
      need_representation: {
        input_tokens: input.needRepresentation.usage?.input_tokens ?? null,
        output_tokens: input.needRepresentation.usage?.output_tokens ?? null,
        estimated_tokens: input.needRepresentation.estimated_tokens,
      },
    };
    run.cost_json = {
      ...(isRecord(run.cost_json) ? run.cost_json : {}),
      need_representation: {
        estimated_cost_eur: input.needRepresentation.estimated_cost_eur,
      },
    };
    run.updated_at = new Date();
    await repo.save(run);
  }

  private async recordKnowledgeInterpretationUsage(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      interpretation: KnowledgeResultInterpretation;
    },
  ): Promise<void> {
    const repo = context.manager.getRepository(AiRun);
    const run = await repo.findOne({
      where: {
        id: input.runId,
        tenant_id: context.tenantId,
      },
    });
    if (!run) return;
    run.usage_json = {
      ...(isRecord(run.usage_json) ? run.usage_json : {}),
      knowledge_interpretation: {
        input_tokens: input.interpretation.usage?.input_tokens ?? null,
        output_tokens: input.interpretation.usage?.output_tokens ?? null,
        estimated_tokens: input.interpretation.estimated_tokens,
      },
    };
    run.cost_json = {
      ...(isRecord(run.cost_json) ? run.cost_json : {}),
      knowledge_interpretation: {
        estimated_cost_eur: input.interpretation.estimated_cost_eur,
      },
    };
    run.updated_at = new Date();
    await repo.save(run);
  }

  private async recordEvidenceExtractionUsage(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      evidenceExtraction: TicketEvidenceExtractionResult;
    },
  ): Promise<void> {
    const repo = context.manager.getRepository(AiRun);
    const run = await repo.findOne({
      where: {
        id: input.runId,
        tenant_id: context.tenantId,
      },
    });
    if (!run) return;
    run.usage_json = {
      ...(isRecord(run.usage_json) ? run.usage_json : {}),
      evidence_extraction: {
        input_tokens: input.evidenceExtraction.usage?.input_tokens ?? null,
        output_tokens: input.evidenceExtraction.usage?.output_tokens ?? null,
        estimated_tokens: input.evidenceExtraction.estimated_tokens,
      },
    };
    run.cost_json = {
      ...(isRecord(run.cost_json) ? run.cost_json : {}),
      evidence_extraction: {
        estimated_cost_eur: input.evidenceExtraction.estimated_cost_eur,
      },
    };
    run.updated_at = new Date();
    await repo.save(run);
  }

  private async recordActionPlannerUsage(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      planner: ActionPlannerResult;
    },
  ): Promise<void> {
    const repo = context.manager.getRepository(AiRun);
    const run = await repo.findOne({
      where: {
        id: input.runId,
        tenant_id: context.tenantId,
      },
    });
    if (!run) return;
    run.usage_json = {
      ...(isRecord(run.usage_json) ? run.usage_json : {}),
      action_planner: {
        input_tokens: input.planner.usage?.input_tokens ?? null,
        output_tokens: input.planner.usage?.output_tokens ?? null,
        estimated_tokens: input.planner.estimated_tokens,
      },
    };
    run.cost_json = {
      ...(isRecord(run.cost_json) ? run.cost_json : {}),
      action_planner: {
        estimated_cost_eur: input.planner.estimated_cost_eur,
      },
    };
    run.updated_at = new Date();
    await repo.save(run);
  }

  private async ticketTargetingEligibility(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
    ticket: TicketRecord,
    providerKey: string,
  ): Promise<{ matched: boolean; hasInactivityAge: boolean }> {
    const targeting = normalizeServiceDeskTargeting(definition.scope_policy_json);
    const hasInactivityAge = targeting.predicates.some((predicate) =>
      predicate.field === 'inactivity_age' && predicate.operator === 'gte',
    );
    const needsAgentTouched = targeting.predicates.some((predicate) => predicate.field === 'touched_by');
    let agentTouched = false;
    if (needsAgentTouched) {
      const state = await context.manager.getRepository(AiAgentTargetState).findOne({
        where: {
          tenant_id: context.tenantId,
          agent_definition_id: definition.id,
          provider_kind: 'ticketing',
          provider_key: providerKey,
          target_type: 'ticket',
          target_ref: ticket.id,
        },
      });
      agentTouched = state?.agent_touched === true;
    }
    return {
      matched: ticketMatchesServiceDeskTargeting(ticket, targeting, { agentTouched }),
      hasInactivityAge,
    };
  }

  private async recordAndEnforceHelpdeskRunCap(
    context: AiExecutionContextWithManager,
    input: {
      definition: AiAgentDefinition | null;
      runId: string;
      stage: string;
      usage: RunLlmUsageEstimate;
    },
  ): Promise<RunLlmUsageEstimate> {
    const usage = {
      estimatedTokens: Math.max(0, Math.round(Number(input.usage.estimatedTokens) || 0)),
      estimatedCostEur: Number(Math.max(0, Number(input.usage.estimatedCostEur) || 0).toFixed(6)),
    };
    if (!this.agentQueue || !input.definition) {
      return usage;
    }
    const guardrails = this.agentQueue.runGuardrails(input.definition);
    const repo = context.manager.getRepository(AiRun);
    const run = await repo.findOne({
      where: {
        id: input.runId,
        tenant_id: context.tenantId,
      },
    });
    if (run) {
      run.usage_json = {
        ...(isRecord(run.usage_json) ? run.usage_json : {}),
        estimated_tokens: usage.estimatedTokens,
        estimation_stage: input.stage,
      };
      run.cost_json = {
        ...(isRecord(run.cost_json) ? run.cost_json : {}),
        estimated_cost_eur: usage.estimatedCostEur,
      };
      run.metadata_json = {
        ...(isRecord(run.metadata_json) ? run.metadata_json : {}),
        agent_definition_id: input.definition.id,
        agent_key: input.definition.agent_key,
      };
      run.updated_at = new Date();
    }
    if (
      usage.estimatedTokens > guardrails.maxEstimatedTokens
      || usage.estimatedCostEur > guardrails.maxEstimatedCostEur
    ) {
      if (run) {
        run.status = 'failed';
        run.output_summary = {
          error: 'Agent run exceeded the configured per-run economic cap.',
          reason: 'per_run_guardrail_exceeded',
          estimated_tokens: usage.estimatedTokens,
          estimated_cost_eur: usage.estimatedCostEur,
          cap: guardrails,
          stage: input.stage,
        };
        run.completed_at = new Date();
        await repo.save(run);
      }
      await this.agentQueue.recordAuditEvent(context, {
        agentDefinitionId: input.definition.id,
        eventType: 'per_run_cap_exceeded',
        severity: 'warning',
        message: 'Agent run failed because the per-run economic cap was exceeded.',
        metadata: {
          run_id: input.runId,
          stage: input.stage,
          usage,
          cap: guardrails,
        },
      });
      throw new ForbiddenException('Agent run exceeded the configured per-run economic cap.');
    }
    if (run) {
      await repo.save(run);
    }
    return usage;
  }

  private async unchangedProposalSuppressionReason(
    context: AiExecutionContextWithManager,
    input: {
      capabilityName: string;
      providerKind: string;
      providerKey: string;
      targetType: string;
      targetRef: string;
      proposalHash: string;
      contextHash: string;
    },
  ): Promise<string | null> {
    const actions = await context.manager.getRepository(AiActionRequest).find({
      where: {
        tenant_id: context.tenantId,
        provider_kind: input.providerKind,
        provider_key: input.providerKey,
        target_type: input.targetType,
        target_ref: input.targetRef,
        capability_name: input.capabilityName,
      },
      order: { created_at: 'DESC' },
    });
    const now = Date.now();
    const matching = actions.find((action) =>
      proposalStillBlocksRegeneration(action, now)
      && actionMetadataString(action, 'proposal_hash') === input.proposalHash
      && actionMetadataString(action, 'proposal_context_hash') === input.contextHash,
    );
    if (!matching) {
      return null;
    }
    return `unchanged_${matching.status}_proposal:${matching.id}`;
  }

  // Safety: planner proposals must not survive a newer plan/profile or a ticket that is no longer
  // eligible for the planned close. Scoped to this agent's proposals for this ticket; returns the
  // number withdrawn.
  private async withdrawSupersededPlannerProposals(
    context: AiExecutionContextWithManager,
    input: {
      providerKind: string;
      providerKey: string;
      targetType: string;
      targetRef: string;
      agentDefinitionId: string | null;
      currentPlannerActionKeys?: Set<string> | null;
      currentGuidanceHash?: string | null;
      closeNoLongerEligible?: boolean;
    },
  ): Promise<number> {
    const candidates = await context.manager.getRepository(AiActionRequest).find({
      where: {
        tenant_id: context.tenantId,
        provider_kind: input.providerKind,
        provider_key: input.providerKey,
        target_type: input.targetType,
        target_ref: input.targetRef,
        status: 'pending',
        capability_name: In([
          TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
          TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
          TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
        ]),
      },
    });
    const now = new Date();
    let withdrawn = 0;
    for (const action of candidates) {
      const metadata = isRecord(action.metadata_json) ? action.metadata_json : {};
      const triageAction = actionMetadataString(action, 'triage_action');
      const plannerAction = metadata.source === 'action_planner' || metadata.planner_action === true;
      const legacyCloseAction = !!triageAction && CLOSE_TRIAGE_ACTIONS.has(triageAction);
      if (!plannerAction && !legacyCloseAction) {
        continue;
      }
      if (input.agentDefinitionId
        && actionMetadataString(action, 'agent_definition_id') !== input.agentDefinitionId) {
        continue;
      }
      const plannerKey = actionMetadataString(action, 'planner_action_key');
      const guidanceHashValue = actionMetadataString(action, 'action_planner_guidance_hash');
      let withdrawnReason: string | null = null;
      if (input.closeNoLongerEligible && (
        legacyCloseAction
        || triageAction === 'planner_prepare_administrative_close_reply'
        || triageAction === 'planner_prepare_terminal_status'
      )) {
        withdrawnReason = 'no_longer_eligible';
      } else if (
        input.currentGuidanceHash
        && guidanceHashValue
        && guidanceHashValue !== input.currentGuidanceHash
      ) {
        withdrawnReason = 'superseded_by_new_guidance';
      } else if (
        input.currentPlannerActionKeys
        && plannerKey
        && !input.currentPlannerActionKeys.has(plannerKey)
      ) {
        withdrawnReason = 'superseded_by_new_plan';
      }
      if (!withdrawnReason) {
        continue;
      }
      action.status = 'expired';
      action.updated_at = now;
      action.metadata_json = {
        ...metadata,
        withdrawn_reason: withdrawnReason,
        withdrawn_at: now.toISOString(),
      };
      await context.manager.getRepository(AiActionRequest).save(action);
      withdrawn += 1;
    }
    return withdrawn;
  }

  private async recoverPreparedTicketingActionIds(
    context: AiExecutionContextWithManager,
    input: { runId: string; targetRef: string },
  ): Promise<string[]> {
    const actions = await context.manager.getRepository(AiActionRequest).find({
      where: {
        tenant_id: context.tenantId,
        run_id: input.runId,
        target_type: 'ticket',
        target_ref: input.targetRef,
        capability_name: In(HELPDESK_REVIEW_ACTION_CAPABILITIES),
      },
    });
    return actions.map((action) => action.id);
  }

  private async ensureProposalEvaluations(
    context: AiExecutionContextWithManager,
    input: {
      runId: string;
      recommendationId: string;
      decisionId: string;
      actions: AiActionRequest[];
      agentMetadata: Record<string, unknown>;
      evaluationType?: string;
    },
  ): Promise<AiActionRequest[]> {
    const actionRepo = context.manager.getRepository(AiActionRequest);
    const evaluationRepo = context.manager.getRepository(AiEvaluation);
    const updated: AiActionRequest[] = [];
    for (const action of input.actions) {
      const metadata = isRecord(action.metadata_json) ? action.metadata_json : {};
      const existingEvaluationId = typeof metadata.evaluation_id === 'string' ? metadata.evaluation_id : null;
      const existingEvaluation = existingEvaluationId
        ? await evaluationRepo.findOne({ where: { id: existingEvaluationId, tenant_id: context.tenantId } })
        : null;
      const evaluation = existingEvaluation && isRecord(existingEvaluation.metadata_json) && existingEvaluation.metadata_json.action_request_id === action.id
        ? existingEvaluation
        : await evaluationRepo.save(evaluationRepo.create({
          tenant_id: context.tenantId,
          run_id: input.runId,
          recommendation_id: input.recommendationId,
          decision_id: input.decisionId,
          status: ['executed', 'rejected', 'expired', 'failed'].includes(action.status) ? 'completed' : 'pending',
          outcome: action.status === 'executed'
            ? 'provider_action_executed'
            : action.status === 'rejected'
              ? 'provider_action_rejected'
              : action.status === 'expired'
                ? 'provider_action_expired_unreviewed'
                : action.status === 'failed'
                  ? 'provider_action_failed'
                  : null,
          scores_json: null,
          feedback_json: null,
          metadata_json: {
            ...input.agentMetadata,
            evaluation_type: input.evaluationType ?? TICKETING_TRIAGE_RUN_OPTIONS.proposalEvaluationType,
            action_request_id: action.id,
            action_class: action.capability_name,
            target_ref: action.target_ref ?? null,
          },
          created_at: new Date(),
          updated_at: new Date(),
        }));
      action.metadata_json = {
        ...metadata,
        evaluation_id: evaluation.id,
        proposal_evaluation_id: evaluation.id,
      };
      action.updated_at = new Date();
      updated.push(await actionRepo.save(action));
    }
    return updated;
  }

  private async providerExecutionReadinessForActions(
    context: AiExecutionContextWithManager,
    actions: AiActionRequest[],
  ): Promise<Map<string, ProviderActionExecutionReadiness>> {
    const result = new Map<string, ProviderActionExecutionReadiness>();
    const providerLookup = (this.providers as unknown as {
      provider?: (ctx: AiExecutionContextWithManager, kind: any, key: string) => Promise<{
        executionReadinessForActions?: (
          ctx: AiExecutionContextWithManager,
          input: { actions: any[] },
        ) => Promise<ProviderActionExecutionReadiness[]>;
      }>;
    }).provider;
    if (typeof providerLookup !== 'function') {
      return result;
    }
    const groups = new Map<string, AiActionRequest[]>();
    for (const action of actions) {
      const providerKind = trimmedString(action.provider_kind);
      const providerKey = trimmedString(action.provider_key);
      if (!providerKind || !providerKey) {
        continue;
      }
      const key = `${providerKind}:${providerKey}`;
      groups.set(key, [...(groups.get(key) ?? []), action]);
    }
    for (const group of groups.values()) {
      const first = group[0];
      const providerKind = trimmedString(first.provider_kind);
      const providerKey = trimmedString(first.provider_key);
      if (!providerKind || !providerKey) {
        continue;
      }
      try {
        const provider = await providerLookup.call(this.providers, context, providerKind, providerKey);
        if (typeof provider.executionReadinessForActions !== 'function') {
          continue;
        }
        const readiness = await provider.executionReadinessForActions(context, {
          actions: group.map((action) => ({
            id: action.id,
            tenant_id: action.tenant_id,
            provider_kind: action.provider_kind,
            provider_key: action.provider_key,
            target_type: action.target_type,
            target_id: action.target_id,
            target_ref: action.target_ref,
            capability_name: action.capability_name,
            capability_version: action.capability_version,
            status: action.status,
            action_payload_json: action.action_payload_json,
            metadata_json: action.metadata_json,
          })),
        });
        for (const item of readiness) {
          result.set(item.action_request_id, item);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || 'Provider readiness check failed.');
        for (const action of group) {
          result.set(action.id, {
            action_request_id: action.id,
            blocked_reason: `Provider readiness check failed: ${message}`,
          });
        }
      }
    }
    return result;
  }

  private async assertActionSafeForUiExecution(
    context: AiExecutionContextWithManager,
    action: AiActionRequest,
  ): Promise<void> {
    if (action.tenant_id !== context.tenantId) {
      throw new ForbiddenException('Action request does not belong to this tenant.');
    }
    if (!['pending', 'approved', APPROVED_ACTION_EXECUTING_STATUS, 'executed'].includes(action.status)) {
      throw new ForbiddenException(`Action is ${action.status}.`);
    }
    if (action.expires_at && action.expires_at <= new Date()) {
      throw new ForbiddenException('Action request is expired.');
    }
    if ((action.provider_kind && !action.provider_key) || (!action.provider_kind && action.provider_key)) {
      throw new ForbiddenException('Action request provider identity is incomplete.');
    }
    const providerReadiness = await this.providerExecutionReadinessForActions(context, [action]);
    const blockedReason = providerReadiness.get(action.id)?.blocked_reason ?? null;
    if (blockedReason) {
      throw new ForbiddenException(blockedReason);
    }
  }

  private async executionReadinessForActions(
    context: AiExecutionContextWithManager,
    actions: AiActionRequest[],
  ): Promise<Map<string, ActionExecutionReadiness>> {
    const now = Date.now();
    const providerReadiness = await this.providerExecutionReadinessForActions(context, actions);
    const result = new Map<string, ActionExecutionReadiness>();
    for (const action of actions) {
      const expiresAt = action.expires_at instanceof Date
        ? action.expires_at.getTime()
        : Date.parse(String(action.expires_at ?? ''));
      const expired = Number.isFinite(expiresAt) && expiresAt <= now;
      const activeDecisionStatus = action.status === 'pending' || action.status === 'approved';
      const providerBlockedReason = providerReadiness.get(action.id)?.blocked_reason ?? null;
      let blockedReason: string | null = null;
      if (action.tenant_id !== context.tenantId) {
        blockedReason = 'Action request does not belong to this tenant.';
      } else if (!activeDecisionStatus) {
        blockedReason = `Action is ${action.status}.`;
      } else if (expired) {
        blockedReason = 'Action request is expired.';
      } else if ((action.provider_kind && !action.provider_key) || (!action.provider_kind && action.provider_key)) {
        blockedReason = 'Action request provider identity is incomplete.';
      } else if (providerBlockedReason) {
        blockedReason = providerBlockedReason;
      }
      const providerSpecific = providerReadiness.get(action.id);

      result.set(action.id, {
        can_execute: blockedReason === null,
        can_reject: activeDecisionStatus && !expired,
        blocked_reason: blockedReason,
        requires_sandbox_write_target: providerSpecific?.requires_sandbox_write_target ?? false,
        sandbox_write_target_ref: providerSpecific?.sandbox_write_target_ref ?? null,
      });
    }
    return result;
  }

  async listRuns(context: AiExecutionContextWithManager, options: AgentControlListRunsOptions = {}) {
    const limit = safeLimit(options.limit, 25, 100);
    const where: FindOptionsWhere<AiRun> = { tenant_id: context.tenantId };
    if (options.status && options.status !== 'all') {
      where.status = options.status;
    }

    const runRepo = context.manager.getRepository(AiRun);
    const toolRepo = context.manager.getRepository(AiToolExecution);
    const evidenceRepo = context.manager.getRepository(AiEvidence);
    const actionRepo = context.manager.getRepository(AiActionRequest);
    const runs = await runRepo.find({
      where,
      order: { created_at: 'DESC' },
      take: limit,
    });

    const items = await Promise.all(runs.map(async (run) => {
      const [
        runToolExecutions,
        runEvidence,
        directActionRequests,
      ] = await Promise.all([
        toolRepo.find({ where: { tenant_id: context.tenantId, run_id: run.id } }),
        evidenceRepo.find({ where: { tenant_id: context.tenantId, run_id: run.id } }),
        actionRepo.find({ where: { tenant_id: context.tenantId, run_id: run.id } }),
      ]);
      const linkedActionIds = Array.from(new Set([
        ...directActionRequests.map((action) => action.id),
        ...runToolExecutions
          .map((tool) => tool.action_request_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ...runEvidence
          .map((row) => row.action_request_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ]));
      const linkedActions = linkedActionIds.length > directActionRequests.length
        ? await actionRepo.find({
          where: {
            tenant_id: context.tenantId,
            id: In(linkedActionIds),
          },
        })
        : directActionRequests;
      const pendingActionCount = linkedActions.filter((action) => actionIsActivePending(action)).length;
      return {
        ...serializeRun(run),
        counts: {
          tool_executions: runToolExecutions.length,
          evidence: runEvidence.length,
          action_requests: linkedActionIds.length,
          pending_actions: pendingActionCount,
        },
      };
    }));

    return { items };
  }

  async getRunDetail(context: AiExecutionContextWithManager, runId: string) {
    const runRepo = context.manager.getRepository(AiRun);
    const run = await runRepo.findOne({
      where: { id: runId, tenant_id: context.tenantId },
    });
    if (!run) {
      throw new NotFoundException('AI run not found.');
    }

    const [
      runSteps,
      toolExecutions,
      evidence,
      observations,
      recommendations,
      decisions,
      evaluations,
      actionRequests,
    ] = await Promise.all([
      context.manager.getRepository(AiRunStep).find({
        where: { tenant_id: context.tenantId, run_id: run.id },
        order: { step_index: 'ASC', created_at: 'ASC' },
      }),
      context.manager.getRepository(AiToolExecution).find({
        where: { tenant_id: context.tenantId, run_id: run.id },
        order: { created_at: 'ASC' },
      }),
      context.manager.getRepository(AiEvidence).find({
        where: { tenant_id: context.tenantId, run_id: run.id },
        order: { created_at: 'ASC' },
      }),
      context.manager.getRepository(AiObservation).find({
        where: { tenant_id: context.tenantId, run_id: run.id },
        order: { created_at: 'ASC' },
      }),
      context.manager.getRepository(AiRecommendation).find({
        where: { tenant_id: context.tenantId, run_id: run.id },
        order: { created_at: 'ASC' },
      }),
      context.manager.getRepository(AiDecision).find({
        where: { tenant_id: context.tenantId, run_id: run.id },
        order: { created_at: 'ASC' },
      }),
      context.manager.getRepository(AiEvaluation).find({
        where: { tenant_id: context.tenantId, run_id: run.id },
        order: { created_at: 'ASC' },
      }),
      context.manager.getRepository(AiActionRequest).find({
        where: { tenant_id: context.tenantId, run_id: run.id },
        order: { updated_at: 'ASC', created_at: 'ASC' },
      }),
    ]);

    const linkedActionIds = Array.from(new Set([
      ...actionRequests.map((action) => action.id),
      ...toolExecutions
        .map((tool) => tool.action_request_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ...evidence
        .map((row) => row.action_request_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ]));
    const linkedActions = linkedActionIds.length > actionRequests.length
      ? await context.manager.getRepository(AiActionRequest).find({
        where: {
          tenant_id: context.tenantId,
          id: In(linkedActionIds),
        },
      })
      : [];
    const mergedActionRequests = Array.from(new Map([
      ...actionRequests,
      ...linkedActions,
    ].map((action) => [action.id, action])).values())
      .sort((left, right) => actionSortTime(left) - actionSortTime(right));

    const actionIds = mergedActionRequests.map((action) => action.id);
    const approvals = actionIds.length > 0
      ? await context.manager.getRepository(AiApproval).find({
        where: {
          tenant_id: context.tenantId,
          action_request_id: In(actionIds),
        },
        order: { created_at: 'DESC' },
      })
      : [];

    const readiness = await this.executionReadinessForActions(context, mergedActionRequests);
    return {
      run: serializeRun(run),
      run_steps: runSteps.map(serializeRunStep),
      tool_executions: toolExecutions.map(serializeToolExecution),
      evidence: evidence.map(serializeEvidence),
      observations: observations.map(serializeObservation),
      recommendations: recommendations.map(serializeRecommendation),
      decisions: decisions.map(serializeDecision),
      evaluations: evaluations.map(serializeEvaluation),
      action_requests: mergedActionRequests.map((action) => serializeActionRequest(action, readiness.get(action.id))),
      approvals: approvals.map(serializeApproval),
    };
  }

  async listActionRequests(context: AiExecutionContextWithManager, options: AgentControlListActionsOptions = {}) {
    const limit = safeLimit(options.limit, 50, 100);
    const where: FindOptionsWhere<AiActionRequest> = { tenant_id: context.tenantId };
    if (options.status && options.status !== 'all') {
      where.status = options.status;
    }
    const items = await context.manager.getRepository(AiActionRequest).find({
      where,
      order: { created_at: 'DESC' },
      take: options.status === 'pending' ? Math.max(limit * 4, 100) : limit,
    });
    const visibleItems = options.status === 'pending'
      ? items.filter((action) => actionIsActivePending(action)).slice(0, limit)
      : items;
    const readiness = await this.executionReadinessForActions(context, visibleItems);
    return { items: visibleItems.map((action) => serializeActionRequest(action, readiness.get(action.id))) };
  }

  private async uniqueAgentKey(
    context: AiExecutionContextWithManager,
    requestedKey: string | null,
    name: string,
  ): Promise<string> {
    const repo = context.manager.getRepository(AiAgentDefinition);
    const base = requestedKey ? cleanAgentKey(requestedKey) : slugAgentKey(name);
    let candidate = base;
    let suffix = 2;
    while (await repo.findOne({ where: { tenant_id: context.tenantId, agent_key: candidate } })) {
      candidate = `${base}.${suffix++}`;
      if (candidate.length > 120) {
        candidate = `${base.slice(0, 110)}.${suffix}`;
      }
    }
    return candidate;
  }

  async listAgentDefinitions(context: AiExecutionContextWithManager) {
    if (this.agentQueue) {
      await this.agentQueue.ensureHelpdeskTicketingTriageDefinition(context);
    }
    const items = await context.manager.getRepository(AiAgentDefinition).find({
      where: { tenant_id: context.tenantId },
      order: { agent_key: 'ASC' },
    });
    return { items: items.map(serializeAgentDefinition) };
  }

  async getAgentDefinition(context: AiExecutionContextWithManager, id: string) {
    if (this.agentQueue) {
      await this.agentQueue.ensureHelpdeskTicketingTriageDefinition(context);
    }
    const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
      where: { id, tenant_id: context.tenantId },
    });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    return { agent_definition: serializeAgentDefinition(definition) };
  }

  async listSharedContextProfiles(context: AiExecutionContextWithManager) {
    if (!this.sharedContextProfiles) {
      throw new ForbiddenException('Shared context profiles are not available.');
    }
    return this.sharedContextProfiles.list(context);
  }

  async createSharedContextProfile(context: AiExecutionContextWithManager, input: SharedContextProfileInput = {}) {
    if (!this.sharedContextProfiles) {
      throw new ForbiddenException('Shared context profiles are not available.');
    }
    return this.sharedContextProfiles.create(context, input);
  }

  async updateSharedContextProfile(context: AiExecutionContextWithManager, id: string, input: SharedContextProfileInput = {}) {
    if (!this.sharedContextProfiles) {
      throw new ForbiddenException('Shared context profiles are not available.');
    }
    return this.sharedContextProfiles.update(context, id, input);
  }

  async archiveSharedContextProfile(context: AiExecutionContextWithManager, id: string) {
    if (!this.sharedContextProfiles) {
      throw new ForbiddenException('Shared context profiles are not available.');
    }
    return this.sharedContextProfiles.archive(context, id);
  }

  async getAgentEffectivePrompt(context: AiExecutionContextWithManager, id: string) {
    const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
      where: { id, tenant_id: context.tenantId },
    });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    const runtime = await this.compileAgentPromptRuntime(context, definition);
    const compiler = this.agentPromptCompiler();
    return {
      agent_definition_id: definition.id,
      prompt_profile: runtime.promptProfileSummary,
      shared_context_resolved: runtime.sharedContextResolution.resolved,
      shared_context_resolution_reason: runtime.sharedContextResolution.reason,
      tasks: {
        action_planner: {
          system_prompt: compileSystemPrompt(RUNTIME_SAFETY_FLOOR_ACTION_PLANNER, runtime.actionPlannerGuidance),
          guidance_json: compiler.guidancePayload(runtime.actionPlannerGuidance),
        },
        planner: {
          system_prompt: compileSystemPrompt(RUNTIME_SAFETY_FLOOR_PLANNER, runtime.plannerGuidance),
          guidance_json: compiler.guidancePayload(runtime.plannerGuidance),
        },
        interpreter: {
          system_prompt: compileSystemPrompt(RUNTIME_SAFETY_FLOOR_INTERPRETER, runtime.interpreterGuidance),
          guidance_json: compiler.guidancePayload(runtime.interpreterGuidance),
        },
        synthesis: {
          system_prompt: compileSystemPrompt(RUNTIME_SAFETY_FLOOR_SYNTHESIS, runtime.synthesisGuidance),
          guidance_json: compiler.guidancePayload(runtime.synthesisGuidance),
        },
      },
    };
  }

  async previewAgentTargeting(
    context: AiExecutionContextWithManager,
    id: string,
    input: AgentControlTargetingPreviewInput = {},
  ): Promise<{ preview: TargetingPreviewSummary }> {
    if (!this.agentQueue) {
      throw new ForbiddenException('Agent work queue is not available.');
    }
    const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
      where: { id, tenant_id: context.tenantId },
    });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    const scopePolicy = Object.prototype.hasOwnProperty.call(input, 'scope_policy_json')
      ? normalizeServiceDeskScopePolicy(input.scope_policy_json)
      : normalizeServiceDeskScopePolicy(definition.scope_policy_json);
    const previewDefinition = {
      ...definition,
      scope_policy_json: scopePolicy,
    } as AiAgentDefinition;
    const targeting = normalizeServiceDeskTargeting(scopePolicy);
    const config = this.agentQueue.resolveScopeIngestionConfig(previewDefinition);
    const maxResults = Math.max(1, Math.min(config.maxTicketsPerCycle, config.maxProviderRequestsPerCycle, 20));
    const ticketingBinding = requireTicketingBinding(definition);
    const provider = await this.providers.ticketing(context, ticketingBinding.providerKey);
    const tickets: TicketRecord[] = [];
    if (config.mode === 'agent_involved') {
      const refs = await this.agentQueue.listAgentTouchedTicketRefs(context, previewDefinition, maxResults);
      for (const ref of refs.slice(0, maxResults)) {
        const fetched = await provider.getTicket(context, { ticketId: ref });
        if (fetched.ok !== false) {
          tickets.push(fetched.data);
        }
      }
    } else {
      const scope = config.mode === 'all_open'
        ? {
          mode: 'all_open' as const,
          maxResults,
          statusValues: config.statusValues,
          entityId: config.entityId ?? null,
          categoryId: config.categoryId ?? null,
          lastChangedBefore: config.lastChangedBefore ?? null,
        }
        : {
          mode: 'new_tickets_only' as const,
          createdAfter: config.createdAfter ?? '',
          maxResults,
          statusValues: config.statusValues,
          entityId: config.entityId ?? null,
          categoryId: config.categoryId ?? null,
        };
      const listed = await provider.listTicketsForScope(context, { scope });
      if (listed.ok === false) {
        throw new BadRequestException(listed.message);
      }
      const rows = isRecord(listed.data) && Array.isArray(listed.data.tickets) ? listed.data.tickets : [];
      tickets.push(...rows.slice(0, maxResults));
    }
    const matches = tickets.filter((ticket) => ticketMatchesServiceDeskTargeting(ticket, targeting, {
      agentTouched: config.mode === 'agent_involved',
    }));
    const matchRefs = Array.from(new Set(matches.map((ticket) => ticket.id).filter(Boolean)));
    const overlapStates = matchRefs.length > 0
      ? await context.manager.getRepository(AiAgentTargetState).find({
        where: {
          tenant_id: context.tenantId,
          provider_kind: ticketingBinding.providerKind,
          provider_key: ticketingBinding.providerKey,
          target_type: 'ticket',
          target_ref: In(matchRefs),
        },
      })
      : [];
    const overlapRefs = new Set(overlapStates
      .filter((state) => state.agent_definition_id !== definition.id)
      .map((state) => state.target_ref));
    return {
      preview: {
        matchEstimate: matches.length,
        sampleSize: tickets.length,
        capped: tickets.length >= maxResults,
        overlapEstimate: overlapRefs.size,
        runsPerDayEstimate: Number(((matches.length * 86_400) / this.agentQueue.reviewCooldownSeconds(previewDefinition)).toFixed(2)),
        resolution: targeting.resolution,
      },
    };
  }

  async getAgentTargetingOptions(
    context: AiExecutionContextWithManager,
    id: string,
    fieldInput: string,
    input: { query?: string | null; limit?: number | string | null } = {},
  ): Promise<{ options: RefItem[] }> {
    const field = cleanTargetingOptionField(fieldInput);
    const limit = cleanTargetingOptionLimit(input.limit);
    const query = cleanTargetingOptionQuery(input.query);
    const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
      where: {
        id,
        tenant_id: context.tenantId,
      },
    });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    const ticketingBinding = requireTicketingBinding(definition);
    const providerKey = ticketingBinding.providerKey;
    const connectionKey = ticketingBinding.connectionKey;
    const isEnumField = field === 'status' || field === 'priority' || field === 'type';
    const ttlMs = isEnumField ? TARGETING_ENUM_OPTIONS_TTL_MS : TARGETING_CATALOG_OPTIONS_TTL_MS;
    const cacheQuery = isEnumField ? query.toLocaleLowerCase() : query.toLocaleLowerCase();
    const cacheKey = [
      context.tenantId,
      connectionKey,
      providerKey,
      field,
      cacheQuery,
      limit,
    ].join('|');
    const now = Date.now();
    const cached = this.targetingOptionsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        options: cached.options.map((item) => ({
          value: item.value,
          label: item.label,
          ...(item.metadata ? { metadata: { ...item.metadata } } : {}),
        })),
      };
    }

    const provider = await this.providers.ticketing(context, providerKey);
    let options: RefItem[];
    if (isEnumField) {
      const result = await provider.describeReferenceEnums(context);
      if (result.ok === false) {
        throw new BadRequestException(result.message);
      }
      const source = field === 'status'
        ? result.data.statuses
        : field === 'priority'
          ? result.data.priorities
          : result.data.types;
      const normalizedQuery = query.toLocaleLowerCase();
      options = source
        .filter((item) => !normalizedQuery
          || item.label.toLocaleLowerCase().includes(normalizedQuery)
          || item.value.toLocaleLowerCase().includes(normalizedQuery))
        .slice(0, limit);
    } else {
      const result = await provider.searchReferenceCatalog(context, {
        kind: field as TicketReferenceCatalogKind,
        query,
        limit,
      });
      if (result.ok === false) {
        throw new BadRequestException(result.message);
      }
      options = result.data.items.slice(0, limit);
    }
    const safeOptions = options.map((item) => ({
      value: String(item.value),
      label: String(item.label),
      ...(item.metadata ? { metadata: { ...item.metadata } } : {}),
    }));
    this.targetingOptionsCache.set(cacheKey, {
      expiresAt: now + ttlMs,
      options: safeOptions,
    });
    return {
      options: safeOptions.map((item) => ({
        value: item.value,
        label: item.label,
        ...(item.metadata ? { metadata: { ...item.metadata } } : {}),
      })),
    };
  }

  async createAgentDefinition(
    context: AiExecutionContextWithManager,
    input: AgentControlAgentDefinitionInput = {},
  ) {
    if (this.agentQueue) {
      await this.agentQueue.ensureHelpdeskTicketingTriageDefinition(context);
    }
    const repo = context.manager.getRepository(AiAgentDefinition);
    const name = cleanSingleLine(input.name, 160);
    if (!name) {
      throw new BadRequestException('Agent name is required.');
    }
    const agentType = cleanAgentType(input.agent_type ?? 'helpdesk');
    // Only Helpdesk has a capability/possible-set model today. The shared caps map is
    // helpdesk-specific, so creating another type would yield a non-functional shell or
    // mis-validated capabilities. Fail closed until each type ships its own model.
    if (agentType !== 'helpdesk') {
      throw new BadRequestException('Only Helpdesk agents can be created today. Other agent types are not available yet.');
    }
    const template = agentType === 'helpdesk'
      ? await repo.findOne({ where: { tenant_id: context.tenantId, agent_key: HELP_DESK_TICKETING_TRIAGE_AGENT_KEY } })
      : null;
    const agentKey = await this.uniqueAgentKey(context, input.agent_key ? cleanAgentKey(input.agent_key) : null, name);
    const providerBindings = normalizedPolicyObject(input.provider_bindings_json, 'Provider bindings')
      ?? template?.provider_bindings_json
      ?? null;
    const allowedCapabilities = input.allowed_capabilities_json !== undefined
      ? normalizeAllowedCapabilitiesForConfig(input.allowed_capabilities_json)
      : template?.allowed_capabilities_json ?? [];
    const forbiddenCapabilities = input.forbidden_capabilities_json !== undefined
      ? (() => { throw new ForbiddenException('Forbidden capabilities are immutable from this endpoint.'); })()
      : template?.forbidden_capabilities_json ?? [];
    const scopePolicy = normalizedPolicyObject(input.scope_policy_json, 'Scope policy') ?? template?.scope_policy_json ?? null;
    const normalizedScopePolicy = normalizeServiceDeskScopePolicy(scopePolicy);
    const now = new Date();
    const definition = await repo.save(repo.create({
      tenant_id: context.tenantId,
      agent_key: agentKey,
      name,
      description: cleanSingleLine(input.description, 500),
      agent_type: agentType,
      status: 'draft',
      environment: cleanAgentEnvironment(input.environment ?? template?.environment ?? 'sandbox'),
      provider_bindings_json: providerBindings,
      allowed_capabilities_json: allowedCapabilities,
      forbidden_capabilities_json: forbiddenCapabilities,
      max_autonomy_level: template?.max_autonomy_level ?? 'A3',
      default_approval_requirement: template?.default_approval_requirement ?? 'human_for_writes',
      agent_priority: cleanAgentPriority(input.agent_priority, cleanAgentPriority(template?.agent_priority, 100)),
      trigger_policy_json: normalizedPolicyObject(input.trigger_policy_json, 'Trigger policy') ?? template?.trigger_policy_json ?? null,
      scope_policy_json: normalizedScopePolicy,
      queue_policy_json: normalizedPolicyObject(input.queue_policy_json, 'Queue policy') ?? template?.queue_policy_json ?? null,
      response_policy_json: normalizeResponsePolicyForConfig(
        normalizedPolicyObject(input.response_policy_json, 'Response policy') ?? template?.response_policy_json ?? null,
      ),
      evaluation_policy_json: normalizedPolicyObject(input.evaluation_policy_json, 'Evaluation policy')
        ?? template?.evaluation_policy_json
        ?? { create_pending_evaluation: true, feedback_required_for_autonomy_promotion: true },
      // A new agent starts with its own (blank) persona — it does NOT inherit the
      // template/built-in agent's mission/tone/instructions, which are identity-specific.
      persona_json: normalizePersona(input.persona_json, null),
      config_version: 1,
      updated_by_user_id: context.userId || null,
      metadata_json: {
        created_from_ui: true,
        user_modified: true,
        template_agent_definition_id: template?.id ?? null,
      },
      created_at: now,
      updated_at: now,
    }));
    await this.recordAgentAuditEvent(context, {
      agentDefinitionId: definition.id,
      eventType: 'agent_config_updated',
      severity: 'info',
      message: `Agent ${definition.name} was created.`,
      metadata: {
        actor_user_id: context.userId || null,
        config_version: definition.config_version,
        diff: { created: { before: null, after: configSnapshot(definition) } },
      },
    });
    return { agent_definition: serializeAgentDefinition(definition) };
  }

  async updateAgentDefinition(
    context: AiExecutionContextWithManager,
    id: string,
    input: AgentControlAgentDefinitionInput = {},
  ) {
    const repo = context.manager.getRepository(AiAgentDefinition);
    const definition = await repo.findOne({ where: { id, tenant_id: context.tenantId } });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    if (Object.prototype.hasOwnProperty.call(input, 'forbidden_capabilities_json')) {
      throw new ForbiddenException('Forbidden capabilities are immutable from this endpoint.');
    }
    const before = configSnapshot(definition);
    if (Object.prototype.hasOwnProperty.call(input, 'name')) {
      const name = cleanSingleLine(input.name, 160);
      if (!name) throw new BadRequestException('Agent name is required.');
      definition.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'description')) {
      definition.description = cleanSingleLine(input.description, 500);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'environment')) {
      definition.environment = cleanAgentEnvironment(input.environment);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'agent_priority')) {
      definition.agent_priority = cleanAgentPriority(input.agent_priority, cleanAgentPriority(definition.agent_priority, 100));
    }
    if (Object.prototype.hasOwnProperty.call(input, 'provider_bindings_json')) {
      definition.provider_bindings_json = normalizedPolicyObject(input.provider_bindings_json, 'Provider bindings');
    }
    if (Object.prototype.hasOwnProperty.call(input, 'allowed_capabilities_json')) {
      definition.allowed_capabilities_json = normalizeAllowedCapabilitiesForConfig(input.allowed_capabilities_json);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'persona_json')) {
      definition.persona_json = normalizePersona(input.persona_json, definition.persona_json);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'trigger_policy_json')) {
      definition.trigger_policy_json = normalizedPolicyObject(input.trigger_policy_json, 'Trigger policy');
    }
    if (Object.prototype.hasOwnProperty.call(input, 'scope_policy_json')) {
      definition.scope_policy_json = normalizeServiceDeskScopePolicy(normalizedPolicyObject(input.scope_policy_json, 'Scope policy'));
    }
    if (Object.prototype.hasOwnProperty.call(input, 'knowledge_sources')) {
      // Patch only the knowledge_sources sub-block, preserving the rest of scope_policy_json.
      definition.scope_policy_json = normalizeServiceDeskScopePolicy({
        ...(isRecord(definition.scope_policy_json) ? definition.scope_policy_json : {}),
        knowledge_sources: normalizeKnowledgeSources(input.knowledge_sources),
      });
    }
    if (Object.prototype.hasOwnProperty.call(input, 'queue_policy_json')) {
      definition.queue_policy_json = normalizedPolicyObject(input.queue_policy_json, 'Queue policy');
    }
    if (Object.prototype.hasOwnProperty.call(input, 'response_policy_json')) {
      definition.response_policy_json = normalizeResponsePolicyForConfig(
        normalizedPolicyObject(input.response_policy_json, 'Response policy'),
      );
    }
    if (Object.prototype.hasOwnProperty.call(input, 'evaluation_policy_json')) {
      definition.evaluation_policy_json = normalizedPolicyObject(input.evaluation_policy_json, 'Evaluation policy');
    }
    definition.metadata_json = {
      ...metadataObject(definition.metadata_json),
      user_modified: true,
    };
    definition.config_version = Math.max(1, numericMetadata(definition.config_version) || 1) + 1;
    definition.updated_by_user_id = context.userId || null;
    definition.updated_at = new Date();
    const saved = await repo.save(definition);
    const after = configSnapshot(saved);
    const diff = changedConfigDiff(before, after);
    await this.recordAgentAuditEvent(context, {
      agentDefinitionId: saved.id,
      eventType: 'agent_config_updated',
      severity: 'info',
      message: `Agent ${saved.name} configuration was updated.`,
      metadata: {
        actor_user_id: context.userId || null,
        config_version: saved.config_version,
        diff,
      },
    });
    return { agent_definition: serializeAgentDefinition(saved), diff };
  }

  async updateAgentStatus(
    context: AiExecutionContextWithManager,
    id: string,
    input: AgentControlAgentStatusInput = {},
  ) {
    const repo = context.manager.getRepository(AiAgentDefinition);
    const definition = await repo.findOne({ where: { id, tenant_id: context.tenantId } });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    const before = configSnapshot(definition);
    const status = cleanAgentStatus(input.status);
    definition.status = status;
    definition.metadata_json = {
      ...metadataObject(definition.metadata_json),
      user_modified: true,
    };
    definition.config_version = Math.max(1, numericMetadata(definition.config_version) || 1) + 1;
    definition.updated_by_user_id = context.userId || null;
    definition.updated_at = new Date();
    const saved = await repo.save(definition);
    const diff = changedConfigDiff(before, configSnapshot(saved));
    await this.recordAgentAuditEvent(context, {
      agentDefinitionId: saved.id,
      eventType: 'agent_config_updated',
      severity: 'info',
      message: `Agent ${saved.name} status changed to ${status}.`,
      metadata: {
        actor_user_id: context.userId || null,
        config_version: saved.config_version,
        diff,
      },
    });
    return { agent_definition: serializeAgentDefinition(saved), diff };
  }

  async deleteAgentDefinition(context: AiExecutionContextWithManager, id: string) {
    const repo = context.manager.getRepository(AiAgentDefinition);
    const definition = await repo.findOne({ where: { id, tenant_id: context.tenantId } });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    // The built-in Helpdesk agent is auto-seeded on poll/settings load, so deleting it just
    // re-creates it. Block deletion and steer the user to disable/archive instead.
    if (definition.agent_key === HELP_DESK_TICKETING_TRIAGE_AGENT_KEY) {
      throw new BadRequestException('The built-in Helpdesk agent cannot be deleted. Disable it instead.');
    }
    // Remove this agent's earned-autonomy policies (metadata-linked, no FK) so no orphan
    // auto-approval policy survives the agent.
    const policyRepo = context.manager.getRepository(AiApprovalPolicy);
    const orphanPolicyIds = (await policyRepo.find({ where: { tenant_id: context.tenantId } }))
      .filter((policy) => isAgentAutonomyPolicyMetadata(policy.metadata_json) && policy.metadata_json.agent_definition_id === definition.id)
      .map((policy) => policy.id);
    if (orphanPolicyIds.length > 0) {
      await policyRepo.delete({ id: In(orphanPolicyIds), tenant_id: context.tenantId });
    }
    await this.recordAgentAuditEvent(context, {
      agentDefinitionId: definition.id,
      eventType: 'agent_deleted',
      severity: 'info',
      message: `Agent ${definition.name} was deleted.`,
      metadata: { actor_user_id: context.userId || null, agent_key: definition.agent_key },
    });
    // FK cascades remove triggers, work items, target states, and agent-scoped pauses;
    // audit events are SET NULL so the deletion record is preserved.
    await repo.delete({ id: definition.id, tenant_id: context.tenantId });
    return { deleted: true, id: definition.id };
  }

  private async autonomyRowsForDefinition(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
  ) {
    const thresholds = autonomyThresholds(definition);
    const actions = await context.manager.getRepository(AiActionRequest).find({
      where: { tenant_id: context.tenantId },
      order: { created_at: 'ASC' },
    });
    const policies = await context.manager.getRepository(AiApprovalPolicy).find({
      where: { tenant_id: context.tenantId },
      order: { policy_version: 'DESC' },
    });
    const openIncident = metadataObject(definition.evaluation_policy_json).open_incident === true;
    return AUTONOMY_ACTION_CLASSES.map((actionClassName) => {
      const capabilityName = approvedCapabilityForAutonomyActionClass(actionClassName);
      const classActions = actions.filter((action) =>
        definitionIdFromMetadata(action.metadata_json) === definition.id
        && actionClass(action) === actionClassName);
      const firstProposalAt = classActions.length > 0
        ? classActions.reduce((earliest, action) => Math.min(earliest, actionSortTime(action)), Number.POSITIVE_INFINITY)
        : null;
      const decidedActions = classActions.filter((action) =>
        !!action.approved_at
        || !!action.rejected_at
        || ['approved', 'executed', 'rejected'].includes(action.status));
      const accepted = decidedActions.filter((action) =>
        !!action.approved_at
        || action.status === 'approved'
        || action.status === 'executed').length;
      const decided = decidedActions.length;
      const acceptanceRate = decided > 0 ? accepted / decided : null;
      const daysActive = firstProposalAt && Number.isFinite(firstProposalAt)
        ? Math.floor((Date.now() - firstProposalAt) / (24 * 60 * 60 * 1000))
        : 0;
      const matchingPolicy = policies.find((policy) =>
        isAgentAutonomyPolicyMetadata(policy.metadata_json)
        && policy.metadata_json.agent_definition_id === definition.id
        && policy.metadata_json.action_class === actionClassName) ?? null;
      const reasons: string[] = [];
      if (!isLowRiskAutomationActionClass(actionClassName)) {
        reasons.push('ACTION_CLASS_NOT_ALLOWLISTED');
      }
      if (!capabilityName || !definitionAllowsCapability(definition, capabilityName)) {
        reasons.push('CAPABILITY_NOT_ALLOWED');
      }
      if (decided < thresholds.minimumDecided) {
        reasons.push('INSUFFICIENT_DECIDED_PROPOSALS');
      }
      if (acceptanceRate === null || acceptanceRate < thresholds.minimumAcceptanceRate) {
        reasons.push('ACCEPTANCE_RATE_TOO_LOW');
      }
      if (daysActive < thresholds.minimumObservationDays) {
        reasons.push('OBSERVATION_WINDOW_TOO_SHORT');
      }
      if (openIncident) {
        reasons.push('OPEN_INCIDENT_FLAG');
      }
      const hardReasons = reasons.filter((reason) => !AUTONOMY_RECOMMENDATION_REASON_CODES.has(reason));
      return {
        actionClass: actionClassName,
        capabilityName,
        mode: matchingPolicy && matchingPolicy.enabled && matchingPolicy.status === 'enabled' ? 'automatic' : 'ask_first',
        allowlisted: isLowRiskAutomationActionClass(actionClassName),
        eligible: reasons.length === 0,
        recommendationOverrideAvailable: reasons.length > 0 && hardReasons.length === 0,
        hardReasons,
        reasons,
        progress: {
          decided,
          required: thresholds.minimumDecided,
          acceptanceRate: acceptanceRate === null ? null : Number(acceptanceRate.toFixed(4)),
          requiredRate: thresholds.minimumAcceptanceRate,
          daysActive,
          requiredDays: thresholds.minimumObservationDays,
        },
        effectiveCeiling: null,
        demotion: null,
        policy: matchingPolicy ? {
          id: matchingPolicy.id,
          policy_key: matchingPolicy.policy_key,
          policy_version: matchingPolicy.policy_version,
          enabled: matchingPolicy.enabled,
          status: matchingPolicy.status,
          live_test_safety: matchingPolicy.live_test_safety,
        } : null,
      };
    });
  }

  private async demoteUnsafeAutomaticRows(
    context: AiExecutionContextWithManager,
    definition: AiAgentDefinition,
    rows: Array<{
      actionClass: string;
      mode: string;
      progress: { decided: number; acceptanceRate: number | null };
      policy: { id: string; policy_version: number } | null;
    }>,
  ): Promise<boolean> {
    let changed = false;
    const policyRepo = context.manager.getRepository(AiApprovalPolicy);
    for (const row of rows) {
      if (
        row.mode !== 'automatic'
        || !row.policy
        || row.progress.decided <= 0
        || row.progress.acceptanceRate === null
        || row.progress.acceptanceRate >= 0.5
      ) {
        continue;
      }
      const policy = await policyRepo.findOne({
        where: {
          id: row.policy.id,
          tenant_id: context.tenantId,
        },
      });
      if (!policy || !policy.enabled) {
        continue;
      }
      policy.enabled = false;
      policy.status = 'disabled';
      policy.policy_version += 1;
      policy.updated_at = new Date();
      const saved = await policyRepo.save(policy);
      await this.recordAgentAuditEvent(context, {
        agentDefinitionId: definition.id,
        eventType: 'agent_autonomy_demoted',
        severity: 'warning',
        message: `Automatic mode was turned off for ${row.actionClass} because acceptance dropped below 50%.`,
        metadata: {
          actor_user_id: null,
          action_class: row.actionClass,
          reason: 'rolling_acceptance_below_50_percent',
          acceptance_rate: row.progress.acceptanceRate,
          decided: row.progress.decided,
          policy_id: saved.id,
          policy_version: saved.policy_version,
        },
      });
      changed = true;
    }
    return changed;
  }

  async getAgentAutonomy(context: AiExecutionContextWithManager, id: string) {
    const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
      where: { id, tenant_id: context.tenantId },
    });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    let items = await this.autonomyRowsForDefinition(context, definition);
    if (await this.demoteUnsafeAutomaticRows(context, definition, items)) {
      items = await this.autonomyRowsForDefinition(context, definition);
    }
    return {
      agent_definition: serializeAgentDefinition(definition),
      lowRiskAutomationAllowlist: LOW_RISK_AUTOMATION_ALLOWLIST,
      items,
    };
  }

  async setAgentAutonomy(
    context: AiExecutionContextWithManager,
    id: string,
    input: AgentControlAutonomyInput = {},
  ) {
    const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
      where: { id, tenant_id: context.tenantId },
    });
    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }
    const actionClassName = cleanSingleLine(input.actionClass, 80);
    if (!actionClassName || !AUTONOMY_ACTION_CLASSES.includes(actionClassName as typeof AUTONOMY_ACTION_CLASSES[number])) {
      throw new BadRequestException('Unsupported action class.');
    }
    const mode = input.mode === 'automatic' || input.mode === 'ask_first' ? input.mode : null;
    if (!mode) {
      throw new BadRequestException('Autonomy mode must be ask_first or automatic.');
    }
    const policyRepo = context.manager.getRepository(AiApprovalPolicy);
    const policyKey = agentAutonomyPolicyKey(definition.id, actionClassName);
    const existingPolicies = (await policyRepo.find({ where: { tenant_id: context.tenantId, policy_key: policyKey } }))
      .sort((left, right) => right.policy_version - left.policy_version);
    const existingPolicy = existingPolicies[0] ?? null;

    if (mode === 'ask_first') {
      let policy = existingPolicy;
      if (policy) {
        policy.enabled = false;
        policy.status = 'disabled';
        policy.policy_version += 1;
        policy.updated_at = new Date();
        policy = await policyRepo.save(policy);
      }
      await this.recordAgentAuditEvent(context, {
        agentDefinitionId: definition.id,
        eventType: 'agent_autonomy_revoked',
        severity: 'info',
        message: `Automatic mode was turned off for ${actionClassName}.`,
        metadata: {
          actor_user_id: context.userId || null,
          action_class: actionClassName,
          policy_id: policy?.id ?? null,
          policy_version: policy?.policy_version ?? null,
        },
      });
      return this.getAgentAutonomy(context, definition.id);
    }

    if (input.confirm !== true) {
      throw new ForbiddenException('Automatic mode requires explicit confirmation.');
    }
    const rows = await this.autonomyRowsForDefinition(context, definition);
    const row = rows.find((candidate) => candidate.actionClass === actionClassName);
    const hardReasons = row?.reasons.filter((reason) => !AUTONOMY_RECOMMENDATION_REASON_CODES.has(reason)) ?? ['ACTION_CLASS_NOT_FOUND'];
    const overrideReason = cleanSingleLine(input.overrideReason, 500);
    const overrideGranted = !!row
      && !row.eligible
      && hardReasons.length === 0
      && input.overrideAcknowledged === true
      && !!overrideReason;
    if (!row || (!row.eligible && !overrideGranted)) {
      throw new ForbiddenException({
        message: 'Automatic mode is not eligible for this action class.',
        reasons: row?.reasons ?? ['ACTION_CLASS_NOT_FOUND'],
        hardReasons,
        recommendationOverrideAvailable: !!row && !row.eligible && hardReasons.length === 0,
        progress: row?.progress ?? null,
      });
    }
    const capabilityName = approvedCapabilityForAutonomyActionClass(actionClassName);
    if (!capabilityName || !isLowRiskAutomationActionClass(actionClassName)) {
      throw new ForbiddenException('This action class is not allowlisted for automatic execution.');
    }
    if (!definitionAllowsCapability(definition, capabilityName)) {
      throw new ForbiddenException('The agent definition does not allow this capability.');
    }
    const ticketingBinding = requireTicketingBinding(definition);
    const providerKey = ticketingBinding.providerKey;
    const providerKind = ticketingBinding.providerKind;
    const now = new Date();
    const nextPolicyVersion = existingPolicy ? existingPolicy.policy_version + 1 : 1;
    const policy = await policyRepo.save(policyRepo.create({
      ...(existingPolicy ?? {}),
      tenant_id: context.tenantId,
      policy_key: policyKey,
      policy_version: nextPolicyVersion,
      name: `${definition.name}: automatic ${actionClassName}`,
      description: 'Eval-gated agent autonomy grant for a low-risk helpdesk action class.',
      status: 'enabled',
      enabled: true,
      capability_name: capabilityName,
      capability_version: '1.0.0',
      effect: 'write',
      provider_kind: providerKind,
      provider_key: providerKey,
      environment: definition.environment,
      trigger_surface: 'internal',
      trigger_kind: 'internal',
      max_autonomy_level: 'A3',
      target_type: 'ticket',
      target_constraints_json: { allowed_patterns: ['^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$'] },
      evidence_requirements_json: { min_count: 1 },
      evaluation_requirements_json: null,
      min_confidence: 0.5,
      cooldown_seconds: 0,
      budget_constraints_json: {
        window_minutes: 60,
        max_failed_actions: 0,
        max_operator_rejections: 0,
        max_provider_errors: 0,
        max_recent_cost: 100,
        cost_json_key: 'estimated_cost_eur',
      },
      live_test_safety: 'live_write_gated',
      metadata_json: {
        created_by: AGENT_AUTONOMY_POLICY_SOURCE,
        agent_definition_id: definition.id,
        agent_key: definition.agent_key,
        action_class: actionClassName,
        allowlist: LOW_RISK_AUTOMATION_ALLOWLIST,
        granted_by_user_id: context.userId || null,
        granted_at: now.toISOString(),
        eligibility: row.progress,
        override: overrideGranted ? {
          acknowledged: true,
          reason: overrideReason,
          granted_by_user_id: context.userId || null,
          granted_at: now.toISOString(),
          bypassed_recommendation_reasons: row.reasons.filter((reason) => AUTONOMY_RECOMMENDATION_REASON_CODES.has(reason)),
          hard_reasons: hardReasons,
          eligibility_snapshot: row.progress,
        } : null,
      },
      created_at: existingPolicy?.created_at ?? now,
      updated_at: now,
    }));
    await this.recordAgentAuditEvent(context, {
      agentDefinitionId: definition.id,
      eventType: 'agent_autonomy_granted',
      severity: 'info',
      message: `Automatic mode was enabled for ${actionClassName}.`,
      metadata: {
        actor_user_id: context.userId || null,
        action_class: actionClassName,
        policy_id: policy.id,
        policy_version: policy.policy_version,
        eligibility: row.progress,
        override: overrideGranted ? {
          reason: overrideReason,
          bypassed_recommendation_reasons: row.reasons.filter((reason) => AUTONOMY_RECOMMENDATION_REASON_CODES.has(reason)),
        } : null,
      },
    });
    return this.getAgentAutonomy(context, definition.id);
  }

  async getBadges(context: AiExecutionContextWithManager) {
    const pendingApprovals = await context.manager.getRepository(AiActionRequest)
      .createQueryBuilder('action')
      .where('action.tenant_id = :tenantId', { tenantId: context.tenantId })
      .andWhere('action.status = :status', { status: 'pending' })
      .andWhere('(action.expires_at IS NULL OR action.expires_at > now())')
      .getCount();
    return { pendingApprovals };
  }

  async listActivity(context: AiExecutionContextWithManager, options: AgentControlActivityOptions = {}) {
    const limit = safeLimit(options.limit, 50, 100);
    const offset = Math.max(0, Math.floor(options.offset ?? 0));
    const fetchLimit = Math.min(400, Math.max(100, (limit + offset) * 4));
    const allTypes: AgentControlActivityType[] = ['proposal', 'decision', 'execution', 'configuration', 'pause', 'error'];
    const wantedTypes = new Set(options.types?.length ? options.types : allTypes);
    const from = options.from ? new Date(options.from) : null;
    const to = options.to ? new Date(options.to) : null;
    const fromTime = from && Number.isFinite(from.getTime()) ? from.getTime() : null;
    const toTime = to && Number.isFinite(to.getTime()) ? to.getTime() : null;
    const targetRef = options.targetRef?.trim() || null;
    const status = options.status?.trim() || null;
    const agentDefinitionId = options.agentDefinitionId?.trim() || null;
    const actorUserId = options.actorUserId?.trim() || null;

    type ActivityEntry = {
      id: string;
      at: string;
      type: AgentControlActivityType;
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
      detail: ActivityActionDetail | null;
    };

    const entries: ActivityEntry[] = [];
    const withinWindow = (value: Date | string | null | undefined): value is Date | string => {
      if (!value) return false;
      const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
      if (!Number.isFinite(time)) return false;
      if (fromTime !== null && time < fromTime) return false;
      if (toTime !== null && time > toTime) return false;
      return true;
    };
    const iso = (value: Date | string): string => value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    const auditType = (event: AiAgentAuditEvent): AgentControlActivityType => {
      if (event.event_type.includes('pause')) return 'pause';
      if (event.severity === 'error' || event.event_type.includes('fail') || event.event_type.includes('error')) return 'error';
      return 'configuration';
    };

    let actionRows: AiActionRequest[] = [];
    if (wantedTypes.has('proposal') || wantedTypes.has('execution') || wantedTypes.has('error')) {
      const qb = context.manager.getRepository(AiActionRequest).createQueryBuilder('action')
        .where('action.tenant_id = :tenantId', { tenantId: context.tenantId });
      if (agentDefinitionId) {
        qb.andWhere("action.metadata_json ->> 'agent_definition_id' = :agentDefinitionId", { agentDefinitionId });
      }
      if (targetRef) {
        qb.andWhere('action.target_ref ILIKE :targetRef', { targetRef: `%${targetRef}%` });
      }
      if (status) {
        qb.andWhere('action.status = :status', { status });
      }
      if (actorUserId) {
        qb.andWhere('action.user_id = :actorUserId', { actorUserId });
      }
      actionRows = await qb.orderBy('action.created_at', 'DESC').take(fetchLimit).getMany();
      for (const action of actionRows) {
        const actionAgentDefinitionId = definitionIdFromMetadata(action.metadata_json);
        const base = {
          agentDefinitionId: actionAgentDefinitionId,
          agentKey: null,
          targetType: action.target_type,
          targetRef: action.target_ref,
          actorUserId: action.user_id,
          actionRequestId: action.id,
          approvalId: null,
          runId: action.run_id,
          auditEventId: null,
          capabilityName: action.capability_name,
          actionClass: actionClass(action),
          eventType: null,
          severity: null,
          errorMessage: action.error_message,
          detail: activityActionDetail(action),
        };
        if (wantedTypes.has('proposal') && withinWindow(action.created_at)) {
          entries.push({
            ...base,
            id: `action:${action.id}:proposal`,
            at: iso(action.created_at),
            type: 'proposal',
            titleKey: 'proposal_created',
            status: action.status,
          });
        }
        if (wantedTypes.has('execution') && action.executed_at && withinWindow(action.executed_at)) {
          entries.push({
            ...base,
            id: `action:${action.id}:execution`,
            at: iso(action.executed_at),
            type: 'execution',
            titleKey: 'action_executed',
            status: action.status,
          });
        }
        if (wantedTypes.has('error') && ['failed', 'provider_error'].includes(action.status) && withinWindow(action.updated_at ?? action.created_at)) {
          entries.push({
            ...base,
            id: `action:${action.id}:error`,
            at: iso(action.updated_at ?? action.created_at),
            type: 'error',
            titleKey: 'action_failed',
            status: action.status,
          });
        }
      }
    }

    const actionById = new Map(actionRows.map((action) => [action.id, action]));
    if (wantedTypes.has('decision')) {
      const qb = context.manager.getRepository(AiApproval).createQueryBuilder('approval')
        .where('approval.tenant_id = :tenantId', { tenantId: context.tenantId });
      if (status) {
        qb.andWhere('approval.status = :status', { status });
      }
      if (actorUserId) {
        qb.andWhere('approval.actor_user_id = :actorUserId', { actorUserId });
      }
      if (fromTime !== null) {
        qb.andWhere('approval.created_at >= :fromDate', { fromDate: new Date(fromTime) });
      }
      if (toTime !== null) {
        qb.andWhere('approval.created_at <= :toDate', { toDate: new Date(toTime) });
      }
      const approvals = await qb.orderBy('approval.created_at', 'DESC').take(fetchLimit).getMany();
      const missingActionIds = approvals
        .map((approval) => approval.action_request_id)
        .filter((id) => !actionById.has(id));
      if (missingActionIds.length > 0) {
        const linkedActions = await context.manager.getRepository(AiActionRequest).find({
          where: {
            tenant_id: context.tenantId,
            id: In(Array.from(new Set(missingActionIds))),
          },
        });
        for (const action of linkedActions) {
          actionById.set(action.id, action);
        }
      }
      for (const approval of approvals) {
        const action = actionById.get(approval.action_request_id) ?? null;
        if (!withinWindow(approval.decided_at ?? approval.created_at)) continue;
        const actionAgentDefinitionId = action ? definitionIdFromMetadata(action.metadata_json) : null;
        if (agentDefinitionId && actionAgentDefinitionId !== agentDefinitionId) continue;
        if (targetRef && !(action?.target_ref ?? '').toLocaleLowerCase().includes(targetRef.toLocaleLowerCase())) continue;
        const actionDetail = action ? activityActionDetail(action) : null;
        const decisionDetail = (actionDetail || approval.reason)
          ? {
            capabilityName: actionDetail?.capabilityName ?? approval.capability_name,
            body: actionDetail?.body ?? null,
            changes: actionDetail?.changes ?? null,
            reason: actionDetail?.reason ?? null,
            rationale: approval.reason ?? null,
            evidenceCount: actionDetail?.evidenceCount ?? null,
          }
          : null;
        entries.push({
          id: `approval:${approval.id}`,
          at: iso(approval.decided_at ?? approval.created_at),
          type: 'decision',
          agentDefinitionId: actionAgentDefinitionId,
          agentKey: null,
          targetType: action?.target_type ?? null,
          targetRef: action?.target_ref ?? null,
          titleKey: approval.status === 'approved' ? 'decision_approved' : 'decision_rejected',
          status: approval.status,
          actorUserId: approval.actor_user_id,
          actionRequestId: approval.action_request_id,
          approvalId: approval.id,
          runId: action?.run_id ?? null,
          auditEventId: null,
          capabilityName: approval.capability_name,
          actionClass: action ? actionClass(action) : approval.capability_name,
          eventType: null,
          severity: null,
          errorMessage: null,
          detail: decisionDetail,
        });
      }
    }

    if (wantedTypes.has('configuration') || wantedTypes.has('pause') || wantedTypes.has('error')) {
      const qb = context.manager.getRepository(AiAgentAuditEvent).createQueryBuilder('event')
        .where('event.tenant_id = :tenantId', { tenantId: context.tenantId });
      if (agentDefinitionId) {
        qb.andWhere('event.agent_definition_id = :agentDefinitionId', { agentDefinitionId });
      }
      if (status) {
        qb.andWhere('(event.severity = :status OR event.event_type = :status)', { status });
      }
      if (actorUserId) {
        qb.andWhere("event.metadata_json ->> 'actor_user_id' = :actorUserId", { actorUserId });
      }
      if (fromTime !== null) {
        qb.andWhere('event.created_at >= :fromDate', { fromDate: new Date(fromTime) });
      }
      if (toTime !== null) {
        qb.andWhere('event.created_at <= :toDate', { toDate: new Date(toTime) });
      }
      const auditEvents = await qb.orderBy('event.created_at', 'DESC').take(fetchLimit).getMany();
      for (const event of auditEvents) {
        const type = auditType(event);
        if (!wantedTypes.has(type)) continue;
        entries.push({
          id: `audit:${event.id}`,
          at: iso(event.created_at),
          type,
          agentDefinitionId: event.agent_definition_id,
          agentKey: null,
          targetType: stringFromMetadata(metadataObject(event.metadata_json).target_type),
          targetRef: stringFromMetadata(metadataObject(event.metadata_json).target_ref),
          titleKey: event.event_type,
          status: event.severity,
          actorUserId: stringFromMetadata(metadataObject(event.metadata_json).actor_user_id),
          actionRequestId: stringFromMetadata(metadataObject(event.metadata_json).action_request_id),
          approvalId: null,
          runId: stringFromMetadata(metadataObject(event.metadata_json).run_id),
          auditEventId: event.id,
          capabilityName: null,
          actionClass: stringFromMetadata(metadataObject(event.metadata_json).action_class),
          eventType: event.event_type,
          severity: event.severity,
          errorMessage: event.severity === 'error'
            ? (stringFromMetadata(metadataObject(event.metadata_json).error) ?? event.message)
            : null,
          detail: null,
        });
      }
    }

    if (wantedTypes.has('error')) {
      const qb = context.manager.getRepository(AiRun).createQueryBuilder('run')
        .where('run.tenant_id = :tenantId', { tenantId: context.tenantId })
        .andWhere("run.status IN ('failed', 'provider_error')");
      if (agentDefinitionId) {
        qb.andWhere("run.metadata_json ->> 'agent_definition_id' = :agentDefinitionId", { agentDefinitionId });
      }
      if (actorUserId) {
        qb.andWhere('run.user_id = :actorUserId', { actorUserId });
      }
      if (status) {
        qb.andWhere('run.status = :status', { status });
      }
      if (fromTime !== null) {
        qb.andWhere('run.created_at >= :fromDate', { fromDate: new Date(fromTime) });
      }
      if (toTime !== null) {
        qb.andWhere('run.created_at <= :toDate', { toDate: new Date(toTime) });
      }
      const runs = await qb.orderBy('run.created_at', 'DESC').take(fetchLimit).getMany();
      for (const run of runs) {
        const metadata = metadataObject(run.metadata_json);
        const runTargetRef = stringFromMetadata(metadata.target_ref ?? metadata.targetRef);
        if (targetRef && !(runTargetRef ?? '').toLocaleLowerCase().includes(targetRef.toLocaleLowerCase())) continue;
        entries.push({
          id: `run:${run.id}:error`,
          at: iso(run.created_at),
          type: 'error',
          agentDefinitionId: definitionIdFromMetadata(run.metadata_json),
          agentKey: null,
          targetType: stringFromMetadata(metadata.target_type ?? metadata.targetType),
          targetRef: runTargetRef,
          titleKey: 'run_failed',
          status: run.status,
          actorUserId: run.user_id,
          actionRequestId: null,
          approvalId: null,
          runId: run.id,
          auditEventId: null,
          capabilityName: null,
          actionClass: null,
          eventType: null,
          severity: 'error',
          errorMessage: stringFromMetadata(metadata.error_message ?? metadata.errorMessage),
          detail: null,
        });
      }
    }

    const definitionIds = Array.from(new Set(entries
      .map((entry) => entry.agentDefinitionId)
      .filter((id): id is string => !!id)));
    const definitions = definitionIds.length > 0
      ? await context.manager.getRepository(AiAgentDefinition).find({
        where: { tenant_id: context.tenantId, id: In(definitionIds) },
      })
      : [];
    const definitionKeyById = new Map(definitions.map((definition) => [definition.id, definition.agent_key]));
    const sorted = entries
      .map((entry) => ({
        ...entry,
        agentKey: entry.agentDefinitionId ? definitionKeyById.get(entry.agentDefinitionId) ?? null : null,
      }))
      .sort((left, right) => Date.parse(right.at) - Date.parse(left.at));

    return {
      items: sorted.slice(offset, offset + limit),
      total: sorted.length,
      limit,
      offset,
    };
  }

  async getHelpdeskEvaluationDaily(
    context: AiExecutionContextWithManager,
    options: { days?: number; agentDefinitionId?: string } = {},
  ) {
    const days = Math.max(1, Math.min(180, Math.floor(options.days ?? 30)));
    const end = new Date();
    const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    const start = new Date(endDay);
    start.setUTCDate(start.getUTCDate() - days + 1);
    // When scoped to one agent, the trend must reflect only that agent's own
    // activity and must never show days before it existed: floor the window at
    // the agent's creation day so a freshly created agent starts with an empty
    // (not back-filled) history. See agentic-control-plane issue #1.
    const agentDefinitionId = options.agentDefinitionId?.trim() || null;
    if (agentDefinitionId) {
      const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
        where: { id: agentDefinitionId, tenant_id: context.tenantId },
      });
      if (!definition) {
        throw new NotFoundException('Agent definition not found.');
      }
      const created = definition.created_at instanceof Date
        ? definition.created_at
        : new Date(definition.created_at);
      if (Number.isFinite(created.getTime())) {
        const createdDay = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
        if (createdDay.getTime() > start.getTime()) {
          start.setTime(createdDay.getTime());
        }
      }
    }
    type Daily = {
      day: string;
      proposals: number;
      decided: number;
      acceptanceRate: number | null;
      executed: number;
      costEur: number;
      tokens: number;
    };
    const byDay = new Map<string, Daily>();
    for (let day = new Date(start); day.getTime() <= endDay.getTime(); day.setUTCDate(day.getUTCDate() + 1)) {
      const key = dateKey(day);
      byDay.set(key, {
        day: key,
        proposals: 0,
        decided: 0,
        acceptanceRate: null,
        executed: 0,
        costEur: 0,
        tokens: 0,
      });
    }

    if (typeof (context.manager as unknown as { query?: unknown }).query === 'function') {
      const [actionRows, runRows] = await Promise.all([
        context.manager.query(
          `
            SELECT
              date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day,
              COUNT(*)::int AS proposals,
              COUNT(*) FILTER (WHERE status IN ('executed', 'rejected'))::int AS decided,
              COUNT(*) FILTER (WHERE status = 'executed')::int AS executed
            FROM ai_action_requests
            WHERE tenant_id = $1
              AND provider_kind = 'ticketing'
              AND capability_name = ANY($2)
              AND created_at >= $3
              AND created_at <= $4
              -- Agent-attributed rows only: definitionless diagnostic/mock-triage
              -- actions must not pollute the unscoped evaluation trend.
              AND metadata_json ->> 'agent_definition_id' IS NOT NULL
              AND ($5::text IS NULL OR metadata_json ->> 'agent_definition_id' = $5::text)
            GROUP BY 1
          `,
          [context.tenantId, HELPDESK_REVIEW_ACTION_CAPABILITIES, start, end, agentDefinitionId],
        ),
        context.manager.query(
          `
            SELECT
              date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day,
              COALESCE(SUM(COALESCE((usage_json ->> 'estimated_tokens')::numeric, (usage_json ->> 'total_tokens')::numeric, 0)), 0)::float AS tokens,
              COALESCE(SUM(COALESCE((cost_json ->> 'estimated_cost_eur')::numeric, (cost_json ->> 'total_cost_eur')::numeric, (cost_json ->> 'total_cost')::numeric, 0)), 0)::float AS cost_eur
            FROM ai_runs
            WHERE tenant_id = $1
              AND created_at >= $2
              AND created_at <= $3
              AND ($4::text IS NULL OR metadata_json ->> 'agent_definition_id' = $4::text)
            GROUP BY 1
          `,
          [context.tenantId, start, end, agentDefinitionId],
        ),
      ]);
      for (const row of actionRows as Array<Record<string, unknown>>) {
        const key = row.day instanceof Date ? dateKey(row.day) : String(row.day ?? '').slice(0, 10);
        const target = byDay.get(key);
        if (!target) continue;
        target.proposals = numericMetadata(row.proposals);
        target.decided = numericMetadata(row.decided);
        target.executed = numericMetadata(row.executed);
      }
      for (const row of runRows as Array<Record<string, unknown>>) {
        const key = row.day instanceof Date ? dateKey(row.day) : String(row.day ?? '').slice(0, 10);
        const target = byDay.get(key);
        if (!target) continue;
        target.tokens = Math.round(numericMetadata(row.tokens));
        target.costEur = Number(numericMetadata(row.cost_eur).toFixed(6));
      }
      for (const row of byDay.values()) {
        row.acceptanceRate = row.decided > 0
          ? Number((row.executed / row.decided).toFixed(4))
          : null;
      }
      return { days: Array.from(byDay.values()) };
    }

    const [actions, runs] = await Promise.all([
      context.manager.getRepository(AiActionRequest).find({
        where: {
          tenant_id: context.tenantId,
          provider_kind: 'ticketing',
        },
      }),
      context.manager.getRepository(AiRun).createQueryBuilder('run')
        .where('run.tenant_id = :tenantId', { tenantId: context.tenantId })
        .andWhere('run.created_at >= :start', { start })
        .getMany(),
    ]);

    const acceptedByDay = new Map<string, number>();
    for (const action of actions) {
      if (!HELPDESK_REVIEW_ACTION_CAPABILITIES.includes(action.capability_name)) continue;
      // Agent-attributed rows only, mirroring the SQL path: definitionless
      // diagnostic/mock-triage actions must not pollute the evaluation trend.
      const actionDefinitionId = stringFromMetadata(metadataObject(action.metadata_json).agent_definition_id);
      if (!actionDefinitionId) continue;
      if (agentDefinitionId && actionDefinitionId !== agentDefinitionId) continue;
      if (!withinDateRange(action.created_at, start, end)) continue;
      const key = dateKey(action.created_at instanceof Date ? action.created_at : new Date(action.created_at));
      const row = byDay.get(key);
      if (!row) continue;
      row.proposals += 1;
      if (action.status === 'executed') {
        row.decided += 1;
        row.executed += 1;
        acceptedByDay.set(key, (acceptedByDay.get(key) ?? 0) + 1);
      } else if (action.status === 'rejected') {
        row.decided += 1;
      }
    }
    for (const run of runs) {
      if (agentDefinitionId && stringFromMetadata(metadataObject(run.metadata_json).agent_definition_id) !== agentDefinitionId) continue;
      if (!withinDateRange(run.created_at, start, end)) continue;
      const key = dateKey(run.created_at instanceof Date ? run.created_at : new Date(run.created_at));
      const row = byDay.get(key);
      if (!row) continue;
      const usage = { tokens: 0, cost: 0 };
      addEstimatedUsage(usage, run);
      row.tokens += usage.tokens;
      row.costEur += usage.cost;
    }
    for (const [key, row] of byDay) {
      row.tokens = Math.round(row.tokens);
      row.costEur = Number(row.costEur.toFixed(6));
      row.acceptanceRate = row.decided > 0
        ? Number(((acceptedByDay.get(key) ?? 0) / row.decided).toFixed(4))
        : null;
    }
    return { days: Array.from(byDay.values()) };
  }

  async getQueueOverview(context: AiExecutionContextWithManager, options: { limit?: number } = {}) {
    if (!this.agentQueue) {
      return {
        definitions: [],
        work_items: [],
        target_states: [],
        action_requests: [],
        counts: {},
        helpdesk: { summary: null, summaries: [], fleet: null, audit_events: [] },
      };
    }
    const overview = await this.agentQueue.listOverview(context, { limit: safeLimit(options.limit, 50, 100) });
    const actionIds = new Set<string>();
    const runIds = new Set<string>();
    for (const workItem of overview.workItems) {
      for (const id of workItem.last_action_request_ids ?? []) {
        if (typeof id === 'string' && id.length > 0) {
          actionIds.add(id);
        }
      }
      if (typeof workItem.last_run_id === 'string' && workItem.last_run_id.length > 0) {
        runIds.add(workItem.last_run_id);
      }
    }
    for (const state of overview.targetStates) {
      const stateJson = isRecord(state.state_json) ? state.state_json : null;
      const latestIds = Array.isArray(stateJson?.latest_action_request_ids) ? stateJson.latest_action_request_ids : [];
      for (const id of latestIds) {
        if (typeof id === 'string' && id.length > 0) {
          actionIds.add(id);
        }
      }
      if (typeof state.last_run_id === 'string' && state.last_run_id.length > 0) {
        runIds.add(state.last_run_id);
      }
    }
    const [linkedActionRequests, runActionRequests] = await Promise.all([
      actionIds.size > 0
        ? context.manager.getRepository(AiActionRequest).find({
          where: {
            tenant_id: context.tenantId,
            id: In(Array.from(actionIds)),
          },
        })
        : Promise.resolve([]),
      runIds.size > 0
        ? context.manager.getRepository(AiActionRequest).find({
          where: {
            tenant_id: context.tenantId,
            run_id: In(Array.from(runIds)),
          },
        })
        : Promise.resolve([]),
    ]);
    const actionRequests = Array.from(new Map([
      ...linkedActionRequests,
      ...runActionRequests,
    ].map((action) => [action.id, action])).values());
    const readiness = await this.executionReadinessForActions(context, actionRequests);
    // Per-agent earned-autonomy summary for the fleet view: which action classes run
    // automatically (an enabled agent-autonomy policy). One query, grouped by agent.
    const automaticByDefinition = new Map<string, string[]>();
    if (overview.definitions.length > 0) {
      const autonomyPolicies = await context.manager.getRepository(AiApprovalPolicy).find({
        where: { tenant_id: context.tenantId, enabled: true, status: 'enabled' },
      });
      for (const policy of autonomyPolicies) {
        if (isAgentAutonomyPolicyMetadata(policy.metadata_json)) {
          const list = automaticByDefinition.get(policy.metadata_json.agent_definition_id) ?? [];
          if (!list.includes(policy.metadata_json.action_class)) {
            list.push(policy.metadata_json.action_class);
          }
          automaticByDefinition.set(policy.metadata_json.agent_definition_id, list);
        }
      }
    }
    return {
      definitions: overview.definitions.map((definition) => ({
        ...serializeAgentDefinition(definition),
        automatic_action_classes: automaticByDefinition.get(definition.id) ?? [],
      })),
      work_items: overview.workItems.map(serializeAgentWorkItem),
      target_states: overview.targetStates.map(serializeAgentTargetState),
      action_requests: actionRequests.map((action) => serializeActionRequest(action, readiness.get(action.id))),
      counts: overview.counts,
      helpdesk: {
        summary: overview.helpdesk.summary,
        summaries: overview.helpdesk.summaries,
        fleet: overview.helpdesk.fleet,
        audit_events: overview.helpdesk.auditEvents.map(serializeAgentAuditEvent),
      },
    };
  }

  async getHelpdeskWorkItemContext(context: AiExecutionContextWithManager, workItemId: string) {
    const workItem = await context.manager.getRepository(AiAgentWorkItem).findOne({
      where: {
        id: workItemId,
        tenant_id: context.tenantId,
      },
    });
    if (!workItem) {
      throw new NotFoundException('Agent work item not found.');
    }
    if (
      workItem.source_provider_kind !== 'ticketing'
      || workItem.source_object_type !== 'ticket'
    ) {
      throw new BadRequestException('Helpdesk context is only available for ticketing work items.');
    }

    const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
      where: {
        id: workItem.agent_definition_id,
        tenant_id: context.tenantId,
      },
    });
    if (!definition || definition.agent_key !== HELP_DESK_TICKETING_TRIAGE_AGENT_KEY) {
      throw new BadRequestException('Helpdesk context is only available for the helpdesk ticket triage agent.');
    }
    const binding = requireTicketingBinding(definition, 'Helpdesk context requires a ticketing provider binding.');
    if (
      workItem.source_provider_kind !== binding.providerKind
      || workItem.source_provider_key !== binding.providerKey
    ) {
      throw new BadRequestException('Helpdesk context work item provider does not match the agent ticketing binding.');
    }

    const targetState = await context.manager.getRepository(AiAgentTargetState).findOne({
      where: {
        tenant_id: context.tenantId,
        agent_definition_id: workItem.agent_definition_id,
        provider_kind: workItem.source_provider_kind,
        provider_key: workItem.source_provider_key,
        target_type: workItem.source_object_type,
        target_ref: workItem.source_object_ref,
      },
    });

    const metadata = {
      workflow: 'helpdesk_context_read',
      source: 'admin_ui',
      agent_definition_id: definition.id,
      agent_key: definition.agent_key,
      agent_work_item_id: workItem.id,
      agent_work_kind: workItem.work_kind,
      target_ref: workItem.source_object_ref,
      phase: 11,
    };
    let stepIndex = 1;
    let runId: string | undefined;
    const executeContextRead = async (capabilityName: string) => {
      const result = await this.dispatcher.execute(context, {
        capabilityName,
        input: {
          provider_key: workItem.source_provider_key,
          ticket_id: workItem.source_object_ref,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId,
          stepIndex: stepIndex++,
          metadata,
        },
      });
      runId = result.run_id;
      return {
        run_id: result.run_id,
        step_id: result.step_id,
        tool_execution_id: result.tool_execution_id,
        evidence_ids: await this.evidenceIdsForTool(context, result.tool_execution_id),
        output: result.output,
      };
    };

    const classification = await executeContextRead(TICKETING_CLASSIFICATION_CONTEXT_CAPABILITY);
    const lifecycle = await executeContextRead(TICKETING_LIFECYCLE_CONTEXT_CAPABILITY);
    const routing = await executeContextRead(TICKETING_ROUTING_CONTEXT_CAPABILITY);
    const participants = await executeContextRead(TICKETING_PARTICIPANT_CONTEXT_CAPABILITY);

    return {
      work_item: serializeAgentWorkItem(workItem),
      target_state: targetState ? serializeAgentTargetState(targetState) : null,
      run_id: runId ?? classification.run_id,
      classification,
      lifecycle,
      routing,
      participants,
    };
  }

  async runMockTriage(context: AiExecutionContextWithManager, input: AgentControlMockTriageInput = {}) {
    const providerKey = trimmedString(input.provider_key) ?? 'mock';
    if (providerKey !== 'mock') {
      throw new BadRequestException('The Agent Control Center mock triage endpoint is mock-only.');
    }
    const alertId = trimmedString(input.alert_id) ?? 'mock-alert-001';
    const ticketId = trimmedString(input.ticket_id) ?? 'mock-ticket-1001';
    const includeDirectory = input.include_directory !== false;

    const diagnostic = await this.diagnostics.runMockDiagnostic(context, {
      alert_id: alertId,
      provider_key: providerKey,
      include_directory: includeDirectory,
      user_id_or_email: trimmedString(input.user_id_or_email) ?? 'sap.operator@example.invalid',
      continue_on_provider_error: false,
    }, {
      surface: 'internal',
      trigger_kind: 'internal',
      metadata: {
        uat_workflow: 'agent_control_center_mock_triage',
        source: 'admin_ui',
      },
    });

    const runId = diagnostic.run_id;
    if (!runId) {
      throw new BadRequestException('Mock diagnostic did not create an AI run.');
    }
    const noteBody = trimmedString(input.note_body) ?? [
      '[KANAP mock triage]',
      `Alert: ${alertId}`,
      `Ticket: ${ticketId}`,
      `Run: ${runId}`,
      `Recommendation: ${diagnostic.recommendation_id}`,
      `Prepared at: ${new Date().toISOString()}`,
      'This internal note was prepared by the Agent Control Center and requires human approval before posting.',
    ].join('\n');

    const proposal = await this.diagnostics.proposeInternalNoteForRecommendation(context, {
      recommendation_id: diagnostic.recommendation_id,
      ticket_id: ticketId,
      provider_key: providerKey,
      note_body: noteBody,
    });

    return {
      diagnostic,
      proposal,
      detail: await this.getRunDetail(context, proposal.run_id ?? runId),
    };
  }

  async listGlpiReadTargets(context: AiExecutionContextWithManager) {
    return this.listTicketingReadTargets(context, { provider_key: LEGACY_GLPI_TICKETING_PROVIDER_KEY });
  }

  async listTicketingReadTargets(
    context: AiExecutionContextWithManager,
    input: Pick<AgentControlTicketingReadInput, 'provider_key'> = {},
  ) {
    const providerKey = trimmedString(input.provider_key);
    if (!providerKey) {
      throw new BadRequestException('provider_key is required for ticketing read targets.');
    }
    const [targets, applicability] = await Promise.all([
      this.liveTargets.findEnabledTargets(context, {
        providerKind: 'ticketing',
        providerKey,
        allowedEffect: 'read',
        targetKind: 'ticket',
      }),
      this.providers.getApplicability(context, 'ticketing', providerKey),
    ]);

    return {
      provider: {
        provider_kind: 'ticketing',
        provider_key: providerKey,
        available: applicability.available,
        reason_code: applicability.reasonCode ?? null,
        message: applicability.message ?? null,
      },
      items: targets.map(serializeLiveTarget),
      ready: applicability.available && targets.length === 1,
    };
  }

  private async executeAutomaticPreparedActions(
    context: AiExecutionContextWithManager,
    input: {
      definition: AiAgentDefinition | null;
      actions: AiActionRequest[];
      baseMetadata: Record<string, unknown>;
      runId: string;
      stepIndex: number;
    },
  ): Promise<{
    executions: Array<{
      action_request_id: string;
      action_class: string;
      status: 'executed' | 'skipped' | 'failed';
      tool_execution_id: string | null;
      error_message: string | null;
    }>;
    nextStepIndex: number;
  }> {
    if (!input.definition || input.actions.length === 0) {
      return { executions: [], nextStepIndex: input.stepIndex };
    }
    const autonomyRows = await this.autonomyRowsForDefinition(context, input.definition);
    await this.demoteUnsafeAutomaticRows(context, input.definition, autonomyRows);
    const policies = await context.manager.getRepository(AiApprovalPolicy).find({
      where: { tenant_id: context.tenantId },
      order: { policy_version: 'DESC' },
    });
    const policyEnabledForClass = (className: string) => policies.some((policy) =>
      policy.enabled
      && policy.status === 'enabled'
      && isAgentAutonomyPolicyMetadata(policy.metadata_json)
      && policy.metadata_json.agent_definition_id === input.definition?.id
      && policy.metadata_json.action_class === className);
    const executions: Array<{
      action_request_id: string;
      action_class: string;
      status: 'executed' | 'skipped' | 'failed';
      tool_execution_id: string | null;
      error_message: string | null;
    }> = [];
    let stepIndex = input.stepIndex;
    for (const action of input.actions) {
      const className = actionClass(action);
      // Hard safety boundary: terminal solve/close is destructive and stays
      // human-approved even when 'status' autonomy is automatic.
      const terminalStatus = isTerminalStatusAction(action);
      if (terminalStatus || !isLowRiskAutomationActionClass(className) || !policyEnabledForClass(className)) {
        executions.push({
          action_request_id: action.id,
          action_class: className,
          status: 'skipped',
          tool_execution_id: null,
          error_message: terminalStatus ? 'terminal_status_requires_approval' : null,
        });
        continue;
      }
      try {
        const result = await this.dispatcher.execute(context, {
          capabilityName: action.capability_name,
          input: { action_request_id: action.id },
          execution: {
            surface: 'internal',
            trigger_kind: 'internal',
            runId: input.runId,
            stepIndex: stepIndex++,
            metadata: {
              ...input.baseMetadata,
              triage_action: 'automatic_execution',
              agent_autonomy_automatic: true,
              action_request_id: action.id,
              action_class: className,
            },
          },
        });
        executions.push({
          action_request_id: action.id,
          action_class: className,
          status: 'executed',
          tool_execution_id: result.tool_execution_id,
          error_message: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || 'Automatic execution failed.');
        await this.recordAgentAuditEvent(context, {
          agentDefinitionId: input.definition.id,
          eventType: 'agent_autonomy_execution_failed',
          severity: 'warning',
          message: `Automatic execution failed for ${className}.`,
          metadata: {
            action_request_id: action.id,
            action_class: className,
            run_id: input.runId,
            error_message: message,
          },
        });
        executions.push({
          action_request_id: action.id,
          action_class: className,
          status: 'failed',
          tool_execution_id: null,
          error_message: message,
        });
      }
    }
    return { executions, nextStepIndex: stepIndex };
  }

  async runGlpiRead(context: AiExecutionContextWithManager, input: Pick<AgentControlTicketingReadInput, 'target_key'> = {}) {
    return this.runTicketingRead(context, {
      provider_key: LEGACY_GLPI_TICKETING_PROVIDER_KEY,
      target_key: input.target_key,
    }, {
      workflow: 'agent_control_center_glpi_read',
      unavailableMessage: 'GLPI provider is unavailable',
    });
  }

  async runTicketingRead(
    context: AiExecutionContextWithManager,
    input: AgentControlTicketingReadInput = {},
    options: { workflow?: string; unavailableMessage?: string } = {},
  ) {
    const providerKey = trimmedString(input.provider_key);
    if (!providerKey) {
      throw new BadRequestException('provider_key is required for ticketing read.');
    }
    const target = await this.liveTargets.requireSingleEnabledTarget(context, {
      providerKind: 'ticketing',
      providerKey,
      allowedEffect: 'read',
      targetKind: 'ticket',
      targetKey: trimmedString(input.target_key),
    });

    const applicability = await this.providers.getApplicability(context, 'ticketing', providerKey);
    if (!applicability.available) {
      throw new ForbiddenException(`${options.unavailableMessage ?? 'Ticketing provider is unavailable'}: ${applicability.message ?? applicability.reasonCode ?? 'not ready'}.`);
    }

    const result = await this.dispatcher.execute(context, {
      capabilityName: 'ticketing.ticket.get',
      input: {
        provider_key: target.provider_key,
        ticket_id: target.external_ref,
      },
      execution: {
        surface: 'internal',
        trigger_kind: 'internal',
        metadata: {
          uat_workflow: options.workflow ?? 'agent_control_center_ticketing_read',
          source: 'admin_ui',
          live_target_id: target.id,
          live_target_key: target.target_key,
          live_target_environment: target.environment,
          safety_label: target.safety_label,
        },
      },
    });

    return {
      target: serializeLiveTarget(target),
      result,
      detail: await this.getRunDetail(context, result.run_id),
    };
  }

  async runTicketingTriage(context: AiExecutionContextWithManager, input: AgentControlTicketingTriageInput = {}) {
    const workItemId = trimmedString(input.work_item_id);
    if (workItemId) {
      return this.runHelpdeskTicketingTriage(context, { work_item_id: workItemId }, TICKETING_TRIAGE_RUN_OPTIONS);
    }
    const providerKey = trimmedString(input.provider_key);
    if (!providerKey) {
      throw new BadRequestException('provider_key is required for manual ticketing triage.');
    }
    return this.runHelpdeskTicketingTriage(context, {
      provider_key: providerKey,
      target_key: input.target_key,
      agent_definition_id: input.agent_definition_id,
    }, TICKETING_TRIAGE_RUN_OPTIONS);
  }

  async runGlpiTriage(
    context: AiExecutionContextWithManager,
    input: Pick<AgentControlTicketingTriageInput, 'target_key' | 'work_item_id'> = {},
  ) {
    return this.runHelpdeskTicketingTriage(context, {
      ...input,
      provider_key: LEGACY_GLPI_TICKETING_PROVIDER_KEY,
    }, LEGACY_GLPI_TRIAGE_RUN_OPTIONS);
  }

  private async runHelpdeskTicketingTriage(
    context: AiExecutionContextWithManager,
    input: AgentControlTicketingTriageInput = {},
    options: HelpdeskTicketingTriageRunOptions = {},
  ) {
    const workItemId = trimmedString(input.work_item_id);
    let target: AiLiveTestTarget | AgentQueueLiveTargetLike;
    let agentDefinition: AiAgentDefinition | null = null;
    let leasedWorkItem: AiAgentWorkItem | null = null;
    let workItemCreated = false;
    let agentMetadata: Record<string, unknown> = {};
    if (workItemId) {
      if (!this.agentQueue) {
        throw new ForbiddenException('Agent work queue is required to run queued ticketing triage.');
      }
      const queuedWorkItem = await context.manager.getRepository(AiAgentWorkItem).findOne({
        where: {
          id: workItemId,
          tenant_id: context.tenantId,
        },
      });
      if (!queuedWorkItem) {
        throw new NotFoundException('Agent work item not found.');
      }
      if (
        queuedWorkItem.source_provider_kind !== 'ticketing'
        || queuedWorkItem.source_object_type !== 'ticket'
      ) {
        throw new BadRequestException('Queued ticket triage work item must target a ticketing ticket.');
      }
      agentDefinition = await context.manager.getRepository(AiAgentDefinition).findOne({
        where: {
          id: queuedWorkItem.agent_definition_id,
          tenant_id: context.tenantId,
        },
      });
      if (!agentDefinition) {
        throw new ForbiddenException('Queued ticketing triage work item has no tenant-scoped agent definition.');
      }
      this.agentQueue.assertHelpdeskTicketingDefinitionRunnable(agentDefinition, null);
      const binding = requireTicketingBinding(agentDefinition, 'Queued ticket triage requires a ticketing provider binding.');
      if (
        queuedWorkItem.source_provider_kind !== binding.providerKind
        || queuedWorkItem.source_provider_key !== binding.providerKey
      ) {
        throw new BadRequestException('Queued ticket triage work item provider does not match the agent ticketing binding.');
      }
      leasedWorkItem = await this.agentQueue.acquireWorkItem(context, queuedWorkItem.id, {
        leaseOwner: `helpdesk-new-ticket-poller:${context.userId || 'system'}`,
      });
      agentMetadata = this.agentQueue.agentExecutionMetadata(agentDefinition, leasedWorkItem);
      target = {
        id: `work-item:${leasedWorkItem.id}`,
        provider_kind: queuedWorkItem.source_provider_kind,
        provider_key: queuedWorkItem.source_provider_key,
        environment: agentDefinition.environment,
        target_kind: queuedWorkItem.source_object_type,
        target_key: `ticket:${queuedWorkItem.source_object_ref}`,
        external_ref: queuedWorkItem.source_object_ref,
        allowed_effect: 'read',
        safety_label: 'scheduled_new_tickets_only',
        enabled: true,
      };
    } else {
      const providerKey = trimmedString(input.provider_key);
      if (!providerKey) {
        throw new BadRequestException('provider_key is required for manual ticketing triage.');
      }
      target = await this.liveTargets.requireSingleEnabledTarget(context, {
        providerKind: 'ticketing',
        providerKey,
        allowedEffect: 'read',
        targetKind: 'ticket',
        targetKey: trimmedString(input.target_key),
      });
    }

    if (!workItemId && this.agentQueue) {
      const requestedDefinitionId = trimmedString(input.agent_definition_id);
      let requestedDefinition: AiAgentDefinition | null = null;
      if (requestedDefinitionId) {
        requestedDefinition = await context.manager.getRepository(AiAgentDefinition).findOne({
          where: { id: requestedDefinitionId, tenant_id: context.tenantId },
        });
        if (!requestedDefinition) {
          throw new NotFoundException('Agent definition not found.');
        }
      }
      if (requestedDefinition && requestedDefinition.agent_key !== HELP_DESK_TICKETING_TRIAGE_AGENT_KEY) {
        // Manual test of a specific (custom) agent: enqueue against that agent's own
        // binding so the run exercises its configuration, not the built-in's. If an
        // active work item already exists for this ticket, it is reused and re-run.
        const binding = requireTicketingBinding(requestedDefinition, 'Manual ticket triage requires a ticketing provider binding.');
        if (binding.providerKind !== target.provider_kind || binding.providerKey !== target.provider_key) {
          throw new BadRequestException('Manual ticket triage target provider does not match the agent ticketing binding.');
        }
        const enqueued = await this.agentQueue.enqueueTicketingScopedTicket(context, {
          definition: requestedDefinition,
          ticket: { id: String(target.external_ref) },
          metadata: {
            source: 'manual_safe_target',
            target_id: target.id,
            target_key: target.target_key,
            target_environment: target.environment,
            target_safety_label: target.safety_label,
            source_endpoint: options.sourceEndpoint ?? TICKETING_TRIAGE_RUN_OPTIONS.sourceEndpoint,
          },
        });
        agentDefinition = requestedDefinition;
        workItemCreated = enqueued.created;
        leasedWorkItem = await this.agentQueue.acquireWorkItem(context, enqueued.workItem.id, {
          leaseOwner: `agent-control-center:${context.userId || 'system'}`,
        });
        agentMetadata = this.agentQueue.agentExecutionMetadata(agentDefinition, leasedWorkItem);
      } else {
        const enqueue = options.manualEnqueueMode === 'glpi'
          ? this.agentQueue.enqueueManualGlpiSafeTarget.bind(this.agentQueue)
          : this.agentQueue.enqueueManualTicketingSafeTarget.bind(this.agentQueue);
        const enqueued = await enqueue(context, serializeLiveTarget(target), {
          source_endpoint: options.sourceEndpoint ?? TICKETING_TRIAGE_RUN_OPTIONS.sourceEndpoint,
        });
        agentDefinition = enqueued.definition;
        workItemCreated = enqueued.created;
        leasedWorkItem = await this.agentQueue.acquireWorkItem(context, enqueued.workItem.id, {
          leaseOwner: `agent-control-center:${context.userId || 'system'}`,
        });
        agentMetadata = this.agentQueue.agentExecutionMetadata(agentDefinition, leasedWorkItem);
      }
    }
    const promptRuntime = await this.compileAgentPromptRuntime(context, agentDefinition);

    // One approval window for the whole run: compute a single expiry anchor here and stamp it on
    // every proposal this run prepares, so all proposals for the ticket expire together rather
    // than each action class lapsing on its own clock.
    const runApprovalTtlSeconds = typeof agentMetadata.approval_ttl_seconds === 'number'
      && Number.isFinite(agentMetadata.approval_ttl_seconds)
      && agentMetadata.approval_ttl_seconds > 0
      ? agentMetadata.approval_ttl_seconds
      : DEFAULT_APPROVAL_TTL_SECONDS;
    const proposalExpiresAt = new Date(Date.now() + runApprovalTtlSeconds * 1000).toISOString();
    const baseMetadata = {
      uat_workflow: options.workflow ?? TICKETING_TRIAGE_RUN_OPTIONS.workflow,
      source: 'admin_ui',
      live_target_id: target.id,
      live_target_key: target.target_key,
      live_target_environment: target.environment,
      safety_label: target.safety_label,
      work_item_created: workItemCreated,
      ...agentMetadata,
      proposal_expires_at: proposalExpiresAt,
    };
    try {
      const applicability = await this.providers.getApplicability(context, 'ticketing', target.provider_key);
      if (!applicability.available) {
        throw new ForbiddenException(`Ticketing provider is unavailable: ${applicability.message ?? applicability.reasonCode ?? 'not ready'}.`);
      }

      let stepIndex = 1;
      const allEvidenceIds: string[] = [];
      const runLlmUsageLedger: RunLlmUsageEstimate = {
        estimatedTokens: 0,
        estimatedCostEur: 0,
      };
      const currentRunLlmUsage = (): RunLlmUsageEstimate => ({
        estimatedTokens: runLlmUsageLedger.estimatedTokens,
        estimatedCostEur: runLlmUsageLedger.estimatedCostEur,
      });
      const chargeRunLlmUsage = (usage: { estimated_tokens?: number | null; estimated_cost_eur?: number | null } | null | undefined) => {
        const estimatedTokens = Number(usage?.estimated_tokens ?? 0);
        const estimatedCostEur = Number(usage?.estimated_cost_eur ?? 0);
        if (Number.isFinite(estimatedTokens) && estimatedTokens > 0) {
          runLlmUsageLedger.estimatedTokens += Math.round(estimatedTokens);
        }
        if (Number.isFinite(estimatedCostEur) && estimatedCostEur > 0) {
          runLlmUsageLedger.estimatedCostEur = Number((runLlmUsageLedger.estimatedCostEur + estimatedCostEur).toFixed(6));
        }
      };

      const ticketResult = await this.dispatcher.execute<AdapterResultLike<TicketLike>>(context, {
        capabilityName: 'ticketing.ticket.get',
        input: {
          provider_key: target.provider_key,
          ticket_id: target.external_ref,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          stepIndex: stepIndex++,
          metadata: baseMetadata,
        },
      });
      if (leasedWorkItem && this.agentQueue) {
        leasedWorkItem = await this.agentQueue.markRunning(context, leasedWorkItem, ticketResult.run_id);
      }
      allEvidenceIds.push(...await this.evidenceIdsForTool(context, ticketResult.tool_execution_id));

      const ticket = adapterData<TicketLike>(ticketResult.output);
    if (!ticket) {
      throw new BadRequestException(adapterFailureMessage(ticketResult.output) ?? 'Ticket read did not return ticket data.');
    }

    const ticketNotesResult = await this.dispatcher.execute<AdapterResultLike<{ notes: TicketNoteLike[] }>>(context, {
      capabilityName: TICKETING_TICKET_NOTES_LIST_CAPABILITY,
      input: {
        provider_key: target.provider_key,
        ticket_id: target.external_ref,
      },
      execution: {
        surface: 'internal',
        trigger_kind: 'internal',
        runId: ticketResult.run_id,
        stepIndex: stepIndex++,
        metadata: {
          ...baseMetadata,
          triage_action: 'read_ticket_history',
        },
      },
    });
    allEvidenceIds.push(...await this.evidenceIdsForTool(context, ticketNotesResult.tool_execution_id));
    const ticketNotesData = adapterData<{ notes: TicketNoteLike[] }>(ticketNotesResult.output);
    if (!ticketNotesData) {
      throw new BadRequestException(adapterFailureMessage(ticketNotesResult.output) ?? 'Ticket history read did not return note data.');
    }
    const classificationContextResult = await this.dispatcher.execute<AdapterResultLike<Record<string, unknown>>>(context, {
      capabilityName: TICKETING_CLASSIFICATION_CONTEXT_CAPABILITY,
      input: {
        provider_key: target.provider_key,
        ticket_id: target.external_ref,
      },
      execution: {
        surface: 'internal',
        trigger_kind: 'internal',
        runId: ticketResult.run_id,
        stepIndex: stepIndex++,
        metadata: {
          ...baseMetadata,
          triage_action: 'read_classification_context',
        },
      },
    });
    allEvidenceIds.push(...await this.evidenceIdsForTool(context, classificationContextResult.tool_execution_id));
    const classificationContext = adapterData<Record<string, unknown>>(classificationContextResult.output);

    const lifecycleContextResult = await this.dispatcher.execute<AdapterResultLike<Record<string, unknown>>>(context, {
      capabilityName: TICKETING_LIFECYCLE_CONTEXT_CAPABILITY,
      input: {
        provider_key: target.provider_key,
        ticket_id: target.external_ref,
      },
      execution: {
        surface: 'internal',
        trigger_kind: 'internal',
        runId: ticketResult.run_id,
        stepIndex: stepIndex++,
        metadata: {
          ...baseMetadata,
          triage_action: 'read_lifecycle_context',
        },
      },
    });
    allEvidenceIds.push(...await this.evidenceIdsForTool(context, lifecycleContextResult.tool_execution_id));
    const lifecycleContext = adapterData<Record<string, unknown>>(lifecycleContextResult.output);

    const routingContextResult = await this.dispatcher.execute<AdapterResultLike<Record<string, unknown>>>(context, {
      capabilityName: TICKETING_ROUTING_CONTEXT_CAPABILITY,
      input: {
        provider_key: target.provider_key,
        ticket_id: target.external_ref,
      },
      execution: {
        surface: 'internal',
        trigger_kind: 'internal',
        runId: ticketResult.run_id,
        stepIndex: stepIndex++,
        metadata: {
          ...baseMetadata,
          triage_action: 'read_routing_context',
        },
      },
    });
    allEvidenceIds.push(...await this.evidenceIdsForTool(context, routingContextResult.tool_execution_id));
    const routingContext = adapterData<Record<string, unknown>>(routingContextResult.output);

    const participantContextResult = await this.dispatcher.execute<AdapterResultLike<Record<string, unknown>>>(context, {
      capabilityName: TICKETING_PARTICIPANT_CONTEXT_CAPABILITY,
      input: {
        provider_key: target.provider_key,
        ticket_id: target.external_ref,
      },
      execution: {
        surface: 'internal',
        trigger_kind: 'internal',
        runId: ticketResult.run_id,
        stepIndex: stepIndex++,
        metadata: {
          ...baseMetadata,
          triage_action: 'read_participant_context',
        },
      },
    });
    allEvidenceIds.push(...await this.evidenceIdsForTool(context, participantContextResult.tool_execution_id));
    const participantContext = adapterData<Record<string, unknown>>(participantContextResult.output);

    const priorTargetActions = await context.manager.getRepository(AiActionRequest).find({
      where: {
        tenant_id: context.tenantId,
        provider_kind: target.provider_kind,
        provider_key: target.provider_key,
        target_type: target.target_kind,
        target_ref: ticket.id,
        capability_name: In([
          TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
          TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
        ]),
      },
    });
    const kanapPublicBodies = new Set(
      priorTargetActions
        .filter((action) => action.capability_name === TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY)
        .map(actionPayloadBody)
        .filter((body): body is string => !!body)
        .map(normalizeTimelineBody),
    );
    const ticketTimeline = buildTicketTimeline(ticket, ticketNotesData.notes, kanapPublicBodies);
    const conversationGate = evaluateConversationGate(priorTargetActions, ticketTimeline, ticketNotesData.notes);
    const ticketForKnowledge = {
      ...ticket,
      description: [
        ticket.description,
        ...ticketTimeline
          .filter((entry) => entry.actor === 'requester_candidate')
          .slice(-4)
          .map((entry) => entry.body),
      ].filter((entry) => typeof entry === 'string' && entry.trim().length > 0).join('\n\n'),
    };

    const preKnowledgeGuardrails = this.agentQueue && agentDefinition ? this.agentQueue.runGuardrails(agentDefinition) : null;
    const plannerSystemPrompt = compileSystemPrompt(RUNTIME_SAFETY_FLOOR_PLANNER, promptRuntime.plannerGuidance);
    let ticketImageExtraction: TicketEvidenceExtractionResult = {
      attachmentRefs: [
        ...(ticket.attachments ?? []),
        ...ticketNotesData.notes.flatMap((note) => note.attachments ?? []),
      ],
      evidence: [],
      warnings: [],
      skippedReason: null,
      model: null,
      usage: null,
      estimated_tokens: 0,
      estimated_cost_eur: 0,
      latency_ms: 0,
    };
    if (this.ticketEvidenceExtractor) {
      const evidenceProjection = estimateTicketEvidenceExtractionUsage({
        systemPrompt: plannerSystemPrompt,
        ticket,
        notes: ticketNotesData.notes,
        maxImages: this.ticketEvidenceExtractor.maxImageCount(),
      }, this.ticketEvidenceExtractor.maxOutputTokens());
      const evidenceInputSummary = {
        attachment_count: evidenceProjection.attachmentCount,
        projected_image_call_count: evidenceProjection.imageCallCount,
        projected_tokens: evidenceProjection.estimatedTokens,
        projected_cost_eur: evidenceProjection.estimatedCostEur,
        prompt_profile: promptRuntime.promptProfileSummary,
      };
      const evidenceBaseUsageEstimate = currentRunLlmUsage();
      if (
        evidenceProjection.imageCallCount > 0
        && preKnowledgeGuardrails
        && (
          evidenceBaseUsageEstimate.estimatedTokens + evidenceProjection.estimatedTokens > preKnowledgeGuardrails.maxEstimatedTokens
          || evidenceBaseUsageEstimate.estimatedCostEur + evidenceProjection.estimatedCostEur > preKnowledgeGuardrails.maxEstimatedCostEur
        )
      ) {
        ticketImageExtraction = {
          ...ticketImageExtraction,
          warnings: [`${evidenceProjection.attachmentCount} screenshot(s) not analyzed: projected over the per-run LLM usage cap.`],
          skippedReason: 'vision_projected_over_per_run_cap',
        };
        await this.recordEvidenceExtractionRunStep(context, {
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          status: 'skipped',
          inputSummary: evidenceInputSummary,
          outputSummary: {
            skipped_reason: ticketImageExtraction.skippedReason,
            base_estimated_tokens: evidenceBaseUsageEstimate.estimatedTokens,
            base_estimated_cost_eur: evidenceBaseUsageEstimate.estimatedCostEur,
            cap: preKnowledgeGuardrails,
          },
        });
      } else {
        const evidenceStepIndex = evidenceProjection.attachmentCount > 0 ? stepIndex++ : null;
        try {
          ticketImageExtraction = await this.ticketEvidenceExtractor.extractImageEvidence(context, {
            ticket,
            notes: ticketNotesData.notes,
            profile: promptRuntime.plannerGuidance,
            readAttachment: async (ref) => {
              const result = await this.dispatcher.execute<AdapterResultLike<TicketAttachmentReadResult>>(context, {
                capabilityName: TICKETING_TICKET_ATTACHMENT_READ_CAPABILITY,
                input: {
                  provider_key: target.provider_key,
                  ticket_id: target.external_ref,
                  target: ref.target,
                  source: ref.source,
                  ...(ref.sourceNoteId ? { source_note_id: ref.sourceNoteId } : {}),
                },
                execution: {
                  surface: 'internal',
                  trigger_kind: 'internal',
                  runId: ticketResult.run_id,
                  stepIndex: stepIndex++,
                  metadata: {
                    ...baseMetadata,
                    triage_action: 'read_ticket_attachment',
                    attachment_id: ref.id,
                    attachment_source: ref.source,
                    attachment_source_note_id: ref.sourceNoteId ?? null,
                  },
                },
              });
              allEvidenceIds.push(...await this.evidenceIdsForTool(context, result.tool_execution_id));
              return adapterData<TicketAttachmentReadResult>(result.output);
            },
          });
          if (ticketImageExtraction.estimated_tokens > 0) {
            await this.recordEvidenceExtractionUsage(context, {
              runId: ticketResult.run_id,
              evidenceExtraction: ticketImageExtraction,
            });
            chargeRunLlmUsage(ticketImageExtraction);
          }
          if (evidenceStepIndex != null) {
            await this.recordEvidenceExtractionRunStep(context, {
              runId: ticketResult.run_id,
              stepIndex: evidenceStepIndex,
              status: ticketImageExtraction.skippedReason && ticketImageExtraction.estimated_tokens === 0 ? 'skipped' : 'completed',
              inputSummary: evidenceInputSummary,
              outputSummary: {
                evidence_count: ticketImageExtraction.evidence.length,
                warning_count: ticketImageExtraction.warnings.length,
                skipped_reason: ticketImageExtraction.skippedReason,
                model: ticketImageExtraction.model,
                tokens: ticketImageExtraction.estimated_tokens,
                cost_eur: ticketImageExtraction.estimated_cost_eur,
                latency_ms: ticketImageExtraction.latency_ms,
              },
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error || 'vision extraction failed');
          ticketImageExtraction = {
            ...ticketImageExtraction,
            warnings: [`${ticketImageExtraction.attachmentRefs.length} screenshot(s) not analyzed: ${message.slice(0, 180)}.`],
            skippedReason: 'vision_call_error',
          };
          if (evidenceStepIndex != null) {
            await this.recordEvidenceExtractionRunStep(context, {
              runId: ticketResult.run_id,
              stepIndex: evidenceStepIndex,
              status: 'failed',
              inputSummary: evidenceInputSummary,
              outputSummary: { skipped_reason: ticketImageExtraction.skippedReason },
              errorMessage: message,
            });
          }
        }
      }
    }

    let knowledgeNeedRepresentation: TicketNeedRepresentationBuildResult | null = null;
    const fallbackPreferenceTerms = extractKnowledgePreferenceTerms(ticketTimeline).positiveTerms;
    const shortFallbackKnowledgeQueries = uniqueKnowledgeCandidates([
      ...fallbackPreferenceTerms,
      fallbackPreferenceTerms.slice(0, 4).join(' '),
      ...buildShortKnowledgeQueryCandidates(ticketForKnowledge),
    ]);
    let knowledgeQueryDerivation: KnowledgeQueryDerivation = {
      source: 'deterministic_fallback',
      queries: shortFallbackKnowledgeQueries,
      exact_queries: [],
      facet_queries: [],
      fallback_queries: shortFallbackKnowledgeQueries,
      dropped_queries: [],
      warnings: ['Legacy lexical query derivation used because the ticket need builder is not available.'],
    };
    if (this.ticketNeedBuilder) {
      const needInput = {
        ticket,
        timeline: ticketTimeline,
        imageEvidence: ticketImageExtraction.evidence,
        profile: promptRuntime.plannerGuidance,
      };
      const needPayload = this.ticketNeedBuilder.buildPromptPayload(needInput);
      const needProjection = estimateTicketNeedRepresentationUsage({
        systemPrompt: plannerSystemPrompt,
        userPayload: needPayload,
      }, this.ticketNeedBuilder.maxOutputTokens());
      const needInputSummary = {
        image_evidence_count: ticketImageExtraction.evidence.length,
        projected_tokens: needProjection.estimatedTokens,
        projected_cost_eur: needProjection.estimatedCostEur,
        prompt_profile: promptRuntime.promptProfileSummary,
      };
      const needBaseUsageEstimate = currentRunLlmUsage();
      if (
        process.env.AI_AGENT_NEED_BUILDER_LLM !== '0'
        && preKnowledgeGuardrails
        && (
          needBaseUsageEstimate.estimatedTokens + needProjection.estimatedTokens > preKnowledgeGuardrails.maxEstimatedTokens
          || needBaseUsageEstimate.estimatedCostEur + needProjection.estimatedCostEur > preKnowledgeGuardrails.maxEstimatedCostEur
        )
      ) {
        knowledgeNeedRepresentation = this.ticketNeedBuilder.buildDeterministicNeedRepresentation(needInput, [
          'Need builder skipped: projected over the per-run LLM usage cap.',
        ]);
        await this.recordNeedRepresentationRunStep(context, {
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          status: 'skipped',
          inputSummary: needInputSummary,
          outputSummary: {
            fallback_reason: 'need_representation_projected_over_per_run_cap',
            base_estimated_tokens: needBaseUsageEstimate.estimatedTokens,
            base_estimated_cost_eur: needBaseUsageEstimate.estimatedCostEur,
            cap: preKnowledgeGuardrails,
          },
        });
      } else {
        const needStepIndex = process.env.AI_AGENT_NEED_BUILDER_LLM === '0' ? null : stepIndex++;
        try {
          knowledgeNeedRepresentation = await this.ticketNeedBuilder.buildNeedRepresentation(context, needInput);
          if (knowledgeNeedRepresentation.estimated_tokens > 0) {
            await this.recordNeedRepresentationUsage(context, {
              runId: ticketResult.run_id,
              needRepresentation: knowledgeNeedRepresentation,
            });
            chargeRunLlmUsage(knowledgeNeedRepresentation);
          }
          if (needStepIndex != null) {
            await this.recordNeedRepresentationRunStep(context, {
              runId: ticketResult.run_id,
              stepIndex: needStepIndex,
              status: knowledgeNeedRepresentation.estimated_tokens > 0 ? 'completed' : 'skipped',
              inputSummary: needInputSummary,
              outputSummary: {
                source: knowledgeNeedRepresentation.source,
                warning_count: knowledgeNeedRepresentation.warnings.length,
                model: knowledgeNeedRepresentation.model,
                tokens: knowledgeNeedRepresentation.estimated_tokens,
                cost_eur: knowledgeNeedRepresentation.estimated_cost_eur,
                latency_ms: knowledgeNeedRepresentation.latency_ms,
              },
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error || 'Need representation failed.');
          knowledgeNeedRepresentation = this.ticketNeedBuilder.buildDeterministicNeedRepresentation(needInput, [
            `Need builder unavailable: ${message.slice(0, 220)}`,
          ]);
          if (needStepIndex != null) {
            await this.recordNeedRepresentationRunStep(context, {
              runId: ticketResult.run_id,
              stepIndex: needStepIndex,
              status: 'failed',
              inputSummary: needInputSummary,
              outputSummary: { fallback_reason: 'need_representation_error' },
              errorMessage: message,
            });
          }
        }
      }
      knowledgeQueryDerivation = this.ticketNeedBuilder.deriveKnowledgeQueries({
        need: knowledgeNeedRepresentation.need,
        fallbackTitle: ticket.title,
        fallbackDescription: ticket.description,
      });
    }
    const deterministicKnowledgeQueries = knowledgeQueryDerivation.queries;
    const knowledgeSources = readAgentKnowledgeSources(agentDefinition);
    let knowledgeSearchPlan: KnowledgeSearchPlan;
    let knowledgeQueryCandidates: string[];
    const knowledgeAttempts: KnowledgeSearchAttempt[] = [];
    let mergedKnowledgeCandidates: MergedKnowledgeCandidate[] = [];
    let knowledgeInterpretation: KnowledgeResultInterpretation;
    let selectedKnowledgeItems: KnowledgeSearchItem[] = [];
    let unvalidatedKnowledgeItems: KnowledgeSearchItem[] = [];
    let knowledgeLowRelevance: Array<{ ref: string | null; title: string | null; score: number | null; lexical_overlap: number; reason: string }> = [];
    if (!knowledgeSources.knowledgeEnabled) {
      // Knowledge search is disabled for this agent — gather no KANAP knowledge so the
      // triage relies on the LLM (and web, when enabled). The plan/interpretation are kept
      // as valid empty structures for the downstream audit metadata.
      knowledgeSearchPlan = buildFallbackKnowledgeSearchPlan(ticket, ticketTimeline, []);
      knowledgeQueryCandidates = [];
      knowledgeInterpretation = buildFallbackKnowledgeInterpretation(knowledgeSearchPlan, []);
    } else {
      const plannedKnowledgeSearch = this.ticketNeedBuilder && knowledgeNeedRepresentation
        ? {
          source: knowledgeNeedRepresentation.source,
          need: knowledgeNeedRepresentation.need,
          intent: knowledgeNeedRepresentation.need.intent,
          language: knowledgeNeedRepresentation.need.language,
          positive_terms: uniqueKnowledgeCandidates([
            ...knowledgeNeedRepresentation.need.symptoms,
            ...knowledgeNeedRepresentation.need.constraints.positive,
            ...knowledgeNeedRepresentation.need.entities.applications,
            ...knowledgeNeedRepresentation.need.entities.modules,
          ]),
          negative_terms: uniqueKnowledgeCandidates(knowledgeNeedRepresentation.need.constraints.negative),
          queries: deterministicKnowledgeQueries,
          rationale: 'Derived from TicketNeedRepresentation facets.',
          confidence: knowledgeNeedRepresentation.need.confidence,
          model: knowledgeNeedRepresentation.model,
          warnings: uniqueKnowledgeCandidates([
            ...knowledgeNeedRepresentation.need.warnings,
            ...knowledgeNeedRepresentation.warnings,
            ...knowledgeQueryDerivation.warnings,
          ]),
        } satisfies KnowledgeSearchPlan
        : this.knowledgePlanner
        ? await this.knowledgePlanner.planKnowledgeSearch(context, {
          ticket,
          timeline: ticketTimeline,
          profile: promptRuntime.plannerGuidance,
        })
        : buildFallbackKnowledgeSearchPlan(ticket, ticketTimeline, deterministicKnowledgeQueries);
      knowledgeSearchPlan = {
        ...plannedKnowledgeSearch,
        queries: this.ticketNeedBuilder
          ? uniqueKnowledgeCandidates(plannedKnowledgeSearch.queries)
          : uniqueKnowledgeCandidates([
            ...plannedKnowledgeSearch.queries,
            ...deterministicKnowledgeQueries,
          ]),
      };
      knowledgeQueryCandidates = knowledgeSearchPlan.queries;
      for (const [candidateIndex, knowledgeQuery] of knowledgeQueryCandidates.entries()) {
        const result = await this.dispatcher.execute<Record<string, unknown>>(context, {
          capabilityName: 'search_knowledge',
          input: {
            query: knowledgeQuery,
            limit: 10,
            offset: 0,
            // Restrict to the agent's configured libraries (intersected with the agent
            // user's accessible libraries by the search service); omit = all accessible.
            ...(knowledgeSources.knowledgeLibraryIds ? { library_ids: knowledgeSources.knowledgeLibraryIds } : {}),
          },
          execution: {
            surface: 'internal',
            trigger_kind: 'internal',
            runId: ticketResult.run_id,
            stepIndex: stepIndex++,
            metadata: {
              ...baseMetadata,
              knowledge_query_source: 'ticket',
              knowledge_query_index: candidateIndex + 1,
              knowledge_query_count: knowledgeQueryCandidates.length,
            },
          },
        });
        allEvidenceIds.push(...await this.evidenceIdsForTool(context, result.tool_execution_id));
        const items = knowledgeItemsFromOutput(result.output);
        knowledgeAttempts.push({
          query: knowledgeQuery,
          result,
          items,
        });
      }
      mergedKnowledgeCandidates = mergeKnowledgeAttempts(knowledgeAttempts);
      knowledgeInterpretation = this.knowledgePlanner
        ? await this.knowledgePlanner.interpretKnowledgeResults(context, {
          plan: knowledgeSearchPlan,
          ticket,
          timeline: ticketTimeline,
          candidates: plannerCandidatesFromKnowledge(mergedKnowledgeCandidates),
          profile: promptRuntime.interpreterGuidance,
        })
        : buildFallbackKnowledgeInterpretation(knowledgeSearchPlan, mergedKnowledgeCandidates);
      if (knowledgeInterpretation.estimated_tokens > 0) {
        await this.recordKnowledgeInterpretationUsage(context, {
          runId: ticketResult.run_id,
          interpretation: knowledgeInterpretation,
        });
        chargeRunLlmUsage(knowledgeInterpretation);
      }
      const appliedInterpretation = applyKnowledgeInterpretation(mergedKnowledgeCandidates, knowledgeInterpretation);
      selectedKnowledgeItems = appliedInterpretation.selected;
      unvalidatedKnowledgeItems = appliedInterpretation.unvalidated;
      // Relevance is judged by the LLM interpreter (which docs to select) and by synthesis
      // (explicit off-topic rejection), NOT by a crude score/lexical heuristic: a relevant
      // internal doc (e.g. a recipe) and an off-topic one can both have ts_rank 0 and zero
      // lexical overlap, so the heuristic cannot tell them apart. We therefore only FLAG
      // low-relevance items for observability — we never drop presented docs before synthesis,
      // otherwise a genuinely relevant internal source gets discarded (regression #33).
      knowledgeLowRelevance = filterKnowledgeItemsByRelevance(
        ticketForKnowledge,
        [...selectedKnowledgeItems, ...unvalidatedKnowledgeItems],
      ).dropped;
      if (knowledgeLowRelevance.length > 0) {
        this.logger.debug(`Flagged ${knowledgeLowRelevance.length} low-relevance knowledge candidate(s) (kept for synthesis) for ticket ${ticket.id}.`);
      }
    }
    // Present LLM-validated selections first, then unvalidated candidates, tagged so synthesis
    // and the triage note can distinguish them. selected/unvalidated are mutually exclusive
    // (applyKnowledgeInterpretation returns one or the other), so a simple concat + cap is safe.
    const knowledgeItems: KnowledgeSearchItem[] = [
      ...selectedKnowledgeItems.map((item) => ({ ...item, validation_status: 'selected' as const })),
      ...unvalidatedKnowledgeItems.map((item) => ({ ...item, validation_status: 'unvalidated' as const })),
    ].slice(0, MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY);
    const presentedKnowledgeRefs = new Set(
      knowledgeItems.map((item) => knowledgeDocumentRef(item)?.toLocaleLowerCase()).filter((ref): ref is string => !!ref),
    );
    const selectedKnowledgeAttempt = knowledgeAttempts.find((attempt) =>
      attempt.items.some((item) => {
        const ref = knowledgeDocumentRef(item);
        return !!ref && presentedKnowledgeRefs.has(ref.toLocaleLowerCase());
      }),
    ) ?? knowledgeAttempts.find((attempt) => attempt.items.length > 0)
      ?? knowledgeAttempts[knowledgeAttempts.length - 1];
    // Knowledge search is optional: an agent may run with KANAP knowledge disabled
    // (relying on the LLM and, when enabled, web search — see the disabled branch
    // above), and a ticket may produce no query candidates. In either case there is
    // simply no knowledge tool result to reference, so triage must still proceed
    // rather than fail the whole work item.
    const knowledgeResult = selectedKnowledgeAttempt?.result ?? null;
    const enrichedKnowledgeItems = [...knowledgeItems];
    const knowledgeDocumentAttempts: KnowledgeDocumentFetchAttempt[] = [];
    for (const [documentIndex, item] of knowledgeItems.slice(0, MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY).entries()) {
      const documentId = knowledgeDocumentRef(item);
      if (!documentId) {
        continue;
      }
      try {
        const result = await this.dispatcher.execute<Record<string, unknown>>(context, {
          capabilityName: 'get_document',
          input: {
            document_id: documentId,
          },
          execution: {
            surface: 'internal',
            trigger_kind: 'internal',
            runId: ticketResult.run_id,
            stepIndex: stepIndex++,
            metadata: {
              ...baseMetadata,
              knowledge_document_source: 'ticket',
              knowledge_document_index: documentIndex + 1,
              knowledge_document_ref: documentId,
            },
          },
        });
        allEvidenceIds.push(...await this.evidenceIdsForTool(context, result.tool_execution_id));
        const fullDocument = knowledgeDocumentFromOutput(item, result.output);
        if (fullDocument) {
          enrichedKnowledgeItems[documentIndex] = fullDocument;
        }
        knowledgeDocumentAttempts.push({
          document_id: documentId,
          result,
          item: fullDocument,
        });
      } catch (error) {
        knowledgeDocumentAttempts.push({
          document_id: documentId,
          error_message: error instanceof Error ? error.message : String(error || 'Document fetch failed.'),
        });
      }
    }

    // Web search (best-effort): only when this agent has web search enabled AND a Brave Search
    // key is configured platform-side. Web findings are recorded as external (lower) trust and
    // never outrank KANAP knowledge — they augment the internal note and only fill a gap in the
    // requester reply when no knowledge matched. The capability sanitises the query to public-only
    // terms (internal refs stripped) and throws if nothing public-meaningful remains; we treat any
    // failure as "no web results" so triage still proceeds on knowledge + the LLM.
    let webSearchResults: WebSearchResultItem[] = [];
    let webSearchStatus: string = knowledgeSources.webEnabled ? 'disabled_by_platform' : 'disabled_by_agent';
    let webSearchQuery: string | null = null;
    let webSearchError: string | null = null;
    const webQueryCandidates = knowledgeSources.webEnabled && Features.AI_WEB_SEARCH_READY
      ? buildWebSearchQueryCandidates(ticketForKnowledge, ticketTimeline, knowledgeQueryCandidates)
      : [];
    if (knowledgeSources.webEnabled && Features.AI_WEB_SEARCH_READY) {
      const webQuery = webQueryCandidates[0] ?? trimmedString(ticket.title) ?? '';
      webSearchQuery = webQuery || null;
      if (webQuery) {
        try {
          const webResult = await this.dispatcher.execute<Record<string, unknown>>(context, {
            capabilityName: 'web_search',
            input: { query: webQuery, count: 5 },
            execution: {
              surface: 'internal',
              trigger_kind: 'internal',
              runId: ticketResult.run_id,
              stepIndex: stepIndex++,
              metadata: {
                ...baseMetadata,
                web_query_source: 'ticket',
              },
            },
          });
          allEvidenceIds.push(...await this.evidenceIdsForTool(context, webResult.tool_execution_id));
          webSearchResults = webSearchItemsFromOutput(webResult.output);
          webSearchStatus = 'executed';
        } catch (error) {
          webSearchStatus = 'failed';
          webSearchError = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Web search skipped for ticket ${ticket.id}: ${webSearchError}`);
        }
      } else {
        webSearchStatus = 'skipped_empty_query';
      }
    }

    const synthesisLanguage = resolveReplyLanguage(agentDefinition, ticket, knowledgeSearchPlan.language);
    let replySynthesisResult: ReplySynthesisResult | null = null;
    let synthesisFallbackReason: string | null = null;
    let synthesisProjection: { estimatedTokens: number; estimatedCostEur: number } | null = null;
    const synthesisInputSummary = {
      language: synthesisLanguage,
      knowledge_source_count: enrichedKnowledgeItems.length,
      web_source_count: webSearchResults.length,
      model: null,
      prompt_profile: promptRuntime.promptProfileSummary,
    };
    const runReplySynthesis = async (): Promise<void> => {
      if (replySynthesisResult || synthesisFallbackReason) {
        return;
      }
      if (!this.replySynthesis) {
        synthesisFallbackReason = 'synthesis_service_unavailable';
        await this.recordSynthesisRunStep(context, {
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          status: 'skipped',
          inputSummary: synthesisInputSummary,
          outputSummary: { fallback_reason: synthesisFallbackReason },
        });
        return;
      }
      if (process.env.AI_AGENT_REPLY_SYNTHESIS === '0') {
        synthesisFallbackReason = 'synthesis_disabled_by_env';
        await this.recordSynthesisRunStep(context, {
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          status: 'skipped',
          inputSummary: synthesisInputSummary,
          outputSummary: { fallback_reason: synthesisFallbackReason },
        });
        return;
      }
      const synthesisPayload = this.replySynthesis.buildPromptPayload({
        ticket,
        timeline: ticketTimeline,
        language: synthesisLanguage,
        knowledgeDocs: enrichedKnowledgeItems.slice(0, MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY),
        webResults: webSearchResults,
        imageEvidence: ticketImageExtraction.evidence,
        interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
        profile: promptRuntime.synthesisGuidance,
      });
      synthesisProjection = estimateReplySynthesisUsage({
        systemPrompt: compileSystemPrompt(RUNTIME_SAFETY_FLOOR_SYNTHESIS, promptRuntime.synthesisGuidance),
        userPayload: synthesisPayload,
      }, this.replySynthesis.maxOutputTokens());
      const baseUsageEstimate = currentRunLlmUsage();
      const guardrails = this.agentQueue && agentDefinition ? this.agentQueue.runGuardrails(agentDefinition) : null;
      if (
        guardrails
        && (
          baseUsageEstimate.estimatedTokens + synthesisProjection.estimatedTokens > guardrails.maxEstimatedTokens
          || baseUsageEstimate.estimatedCostEur + synthesisProjection.estimatedCostEur > guardrails.maxEstimatedCostEur
        )
      ) {
        synthesisFallbackReason = 'synthesis_projected_over_per_run_cap';
        await this.recordSynthesisRunStep(context, {
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          status: 'skipped',
          inputSummary: {
            ...synthesisInputSummary,
            projected_tokens: synthesisProjection.estimatedTokens,
            projected_cost_eur: synthesisProjection.estimatedCostEur,
          },
          outputSummary: {
            fallback_reason: synthesisFallbackReason,
            base_estimated_tokens: baseUsageEstimate.estimatedTokens,
            base_estimated_cost_eur: baseUsageEstimate.estimatedCostEur,
            cap: guardrails,
          },
        });
      } else {
        const synthesisStepIndex = stepIndex++;
        try {
          replySynthesisResult = await this.replySynthesis.synthesizeTicketReply(context, {
            ticket,
            timeline: ticketTimeline,
            language: synthesisLanguage,
            knowledgeDocs: enrichedKnowledgeItems.slice(0, MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY),
            webResults: webSearchResults,
            imageEvidence: ticketImageExtraction.evidence,
            interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
            profile: promptRuntime.synthesisGuidance,
          });
          if (replySynthesisResult.fallback_reason) {
            synthesisFallbackReason = replySynthesisResult.fallback_reason;
          }
          await this.recordSynthesisUsage(context, {
            runId: ticketResult.run_id,
            synthesis: replySynthesisResult,
          });
          chargeRunLlmUsage(replySynthesisResult);
          await this.recordSynthesisRunStep(context, {
            runId: ticketResult.run_id,
            stepIndex: synthesisStepIndex,
            status: 'completed',
            inputSummary: {
              ...synthesisInputSummary,
              model: replySynthesisResult.model,
              projected_tokens: synthesisProjection?.estimatedTokens ?? null,
              projected_cost_eur: synthesisProjection?.estimatedCostEur ?? null,
            },
            outputSummary: {
              usable: replySynthesisResult.usable,
              needs_human_review: replySynthesisResult.needs_human_review,
              reply_length: replySynthesisResult.requester_reply.length,
              used_source_count: replySynthesisResult.used_sources.length,
              rejected_source_count: replySynthesisResult.rejected_sources.length,
              tokens: replySynthesisResult.estimated_tokens,
              cost_eur: replySynthesisResult.estimated_cost_eur,
              latency_ms: replySynthesisResult.latency_ms,
              fallback_reason: replySynthesisResult.fallback_reason,
            },
          });
        } catch (error) {
          synthesisFallbackReason = error instanceof Error ? `synthesis_error:${error.message.slice(0, 180)}` : 'synthesis_error';
          await this.recordSynthesisRunStep(context, {
            runId: ticketResult.run_id,
            stepIndex: synthesisStepIndex,
            status: 'failed',
            inputSummary: {
              ...synthesisInputSummary,
              projected_tokens: synthesisProjection?.estimatedTokens ?? null,
              projected_cost_eur: synthesisProjection?.estimatedCostEur ?? null,
            },
            outputSummary: { fallback_reason: synthesisFallbackReason },
            errorMessage: synthesisFallbackReason,
          });
        }
      }
    };
    const buildSynthesisMetadata = () => replySynthesisResult ? {
      synthesis_model: replySynthesisResult.model,
      synthesis_tokens: replySynthesisResult.estimated_tokens,
      synthesis_usage: replySynthesisResult.usage,
      synthesis_cost_eur: replySynthesisResult.estimated_cost_eur,
      synthesis_usable: replySynthesisResult.usable,
      synthesis_needs_human_review: replySynthesisResult.needs_human_review,
      synthesis_used_sources: replySynthesisResult.used_sources,
      synthesis_rejected_sources: replySynthesisResult.rejected_sources,
      synthesis_confidence: replySynthesisResult.confidence,
      synthesis_language: replySynthesisResult.language,
      synthesis_fallback_reason: synthesisFallbackReason,
      synthesis_latency_ms: replySynthesisResult.latency_ms,
    } : {
      synthesis_model: null,
      synthesis_tokens: null,
      synthesis_usage: null,
      synthesis_cost_eur: null,
      synthesis_usable: false,
      synthesis_needs_human_review: true,
      synthesis_used_sources: [],
      synthesis_rejected_sources: [],
      synthesis_confidence: null,
      synthesis_language: synthesisLanguage,
      synthesis_fallback_reason: synthesisFallbackReason ?? 'synthesis_not_attempted',
      synthesis_latency_ms: null,
    };

    const actionPlannerGuidanceHash = guidanceHash(promptRuntime.actionPlannerGuidance);
    const closeWriteCapable = !!agentDefinition
      && definitionAllowsCapability(agentDefinition, TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY)
      && definitionAllowsCapability(agentDefinition, TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY)
      && definitionAllowsCapability(agentDefinition, TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY)
      && definitionAllowsCapability(agentDefinition, TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY);
    const targetingEligibility = closeWriteCapable
      ? await this.ticketTargetingEligibility(context, agentDefinition, ticket as TicketRecord, target.provider_key)
      : { matched: false, hasInactivityAge: false };
    const closeEligible = closeWriteCapable
      && lifecycleContext?.terminal !== true
      && targetingEligibility.hasInactivityAge
      && targetingEligibility.matched;

    let actionPlannerResult: ActionPlannerResult | null = null;
    let actionPlannerFallbackReason: string | null = null;
    let actionPlannerProjection: { estimatedTokens: number; estimatedCostEur: number } | null = null;
    const providerActionPlannerProfile = await this.actionPlannerProfileForProvider(
      context,
      target.provider_kind,
      target.provider_key,
    );
    const actionPlannerInput = {
      ticket,
      timeline: ticketTimeline,
      contexts: {
        classification: classificationContext,
        lifecycle: lifecycleContext,
        routing: routingContext,
        participants: participantContext,
      },
      gates: conversationGate as unknown as Record<string, unknown>,
      close_eligibility: {
        matched: closeEligible,
        has_inactivity_age: targetingEligibility.hasInactivityAge,
        terminal: lifecycleContext?.terminal === true,
      },
      reply_language: synthesisLanguage,
      knowledge_summary: plannerKnowledgeSummary(knowledgeItems, knowledgeLowRelevance.length, knowledgeInterpretation, knowledgeSearchPlan, knowledgeQueryDerivation),
      web_summary: plannerWebSummary(webSearchResults, webSearchStatus, webSearchQuery),
      image_evidence: ticketImageExtraction.evidence,
      granted_capabilities: allowedCapabilityNames(agentDefinition),
      owned_action_types: [...PHASE_1_PLANNER_OWNED_ACTION_TYPES],
      provider_profile: providerActionPlannerProfile,
      verbatim_candidates: promptRuntime.profile.verbatim_candidates,
      profile: promptRuntime.actionPlannerGuidance,
    };
    if (!this.actionPlanner) {
      actionPlannerFallbackReason = 'action_planner_service_unavailable';
    } else if (!agentDefinition) {
      actionPlannerFallbackReason = 'action_planner_no_agent_definition';
    } else if (process.env.AI_AGENT_ACTION_PLANNER === '0') {
      actionPlannerFallbackReason = 'action_planner_disabled_by_env';
    } else {
      const actionPlannerPayload = this.actionPlanner.buildPromptPayload(actionPlannerInput);
      actionPlannerProjection = estimateActionPlannerUsage({
        systemPrompt: compileSystemPrompt(RUNTIME_SAFETY_FLOOR_ACTION_PLANNER, promptRuntime.actionPlannerGuidance),
        userPayload: actionPlannerPayload,
      }, this.actionPlanner.maxOutputTokens());
      const actionPlannerBaseUsageEstimate = currentRunLlmUsage();
      const guardrails = this.agentQueue && agentDefinition ? this.agentQueue.runGuardrails(agentDefinition) : null;
      if (
        guardrails
        && (
          actionPlannerBaseUsageEstimate.estimatedTokens + actionPlannerProjection.estimatedTokens > guardrails.maxEstimatedTokens
          || actionPlannerBaseUsageEstimate.estimatedCostEur + actionPlannerProjection.estimatedCostEur > guardrails.maxEstimatedCostEur
        )
      ) {
        actionPlannerFallbackReason = 'action_planner_projected_over_per_run_cap';
      } else {
        actionPlannerResult = await this.actionPlanner.planActions(context, actionPlannerInput);
        if (actionPlannerResult) {
          await this.recordActionPlannerUsage(context, {
            runId: ticketResult.run_id,
            planner: actionPlannerResult,
          });
          chargeRunLlmUsage(actionPlannerResult);
        } else {
          actionPlannerFallbackReason = 'action_planner_unavailable_or_invalid';
        }
      }
    }

    const plannerFallbackActive = actionPlannerResult == null;
    const verbatimCandidates = promptRuntime.profile.verbatim_candidates;
    const plannerAuthorizedActions: Array<{
      action: PlannerAction;
      plannerActionKey: string;
      replyBody: string | null;
      terminal: boolean;
    }> = [];
    const plannerSkippedActions: Record<string, string> = {};
    const markPlannerSkipped = (actionType: PlannerActionType, reason: string) => {
      if (!plannerSkippedActions[actionType]) {
        plannerSkippedActions[actionType] = reason;
      }
    };
    if (actionPlannerResult) {
      const seenPlannerActions = new Set<string>();
      for (const action of actionPlannerResult.actions) {
        const actionType = action.action_type;
        const actionKey = plannerActionKindKey(action);
        if (!PLANNER_OWNED_ACTION_TYPES.has(actionType)) {
          markPlannerSkipped(actionType, 'action_type_not_owned_in_phase_1');
          continue;
        }
        if (seenPlannerActions.has(actionKey)) {
          markPlannerSkipped(actionType, 'duplicate_planner_action');
          continue;
        }
        seenPlannerActions.add(actionKey);
        const capabilityNames = ACTION_TYPE_CAPABILITY_TABLE[actionType];
        if (!capabilityNames) {
          markPlannerSkipped(actionType, 'action_type_not_mapped_to_capability');
          continue;
        }
        if (!agentDefinition || !definitionAllowsCapability(agentDefinition, capabilityNames.prepare)) {
          markPlannerSkipped(actionType, 'prepare_capability_not_granted');
          continue;
        }
        if (!definitionAllowsCapability(agentDefinition, capabilityNames.approved)) {
          markPlannerSkipped(actionType, 'approved_capability_not_granted');
          continue;
        }
        let authorizedAction = action;
        let replyBody: string | null = null;
        let terminal = false;
        if (actionType === 'internal_note') {
          if (!conversationGate.can_prepare_internal_note) {
            markPlannerSkipped(actionType, conversationGate.internal_note_reason);
            continue;
          }
        } else if (actionType === 'requester_reply') {
          const replyKind = action.reply_kind;
          if (replyKind !== 'sourced_answer' && replyKind !== 'administrative') {
            markPlannerSkipped(actionType, 'missing_or_invalid_reply_kind');
            continue;
          }
          if (replyKind === 'sourced_answer' && !conversationGate.can_prepare_sourced_answer) {
            markPlannerSkipped(actionType, conversationGate.sourced_answer_reason);
            continue;
          }
          if (replyKind === 'administrative') {
            const isCloseReply = action.administrative_intent === 'close_reply';
            if (isCloseReply) {
              if (!conversationGate.can_prepare_administrative_close_reply) {
                markPlannerSkipped(actionType, conversationGate.administrative_close_reply_reason);
                continue;
              }
              if (!closeEligible) {
                markPlannerSkipped(actionType, 'ticket_not_eligible_for_administrative_close_reply');
                continue;
              }
            } else if (!conversationGate.can_prepare_public_reply) {
              markPlannerSkipped(actionType, conversationGate.public_reply_reason);
              continue;
            }
            if (action.verbatim_ref) {
              const candidate = resolveVerbatimCandidate(verbatimCandidates, action.verbatim_ref);
              if (!candidate) {
                markPlannerSkipped(actionType, 'verbatim_ref_not_found_in_trusted_config');
                continue;
              }
              replyBody = candidate.text.replace(/\r\n/g, '\n').trim();
            } else {
              // No ref, but the model may have written the configured exact message
              // straight into body: snap to the trusted candidate so the verbatim
              // guarantee still holds. Otherwise treat body as a free administrative draft.
              const bodyAsCandidate = action.body
                ? resolveVerbatimCandidate(verbatimCandidates, action.body)
                : null;
              replyBody = bodyAsCandidate
                ? bodyAsCandidate.text.replace(/\r\n/g, '\n').trim()
                : sanitizeForProvider(action.body, MAX_SYNTHESIZED_REQUESTER_BODY_CHARS);
            }
            if (!replyBody) {
              markPlannerSkipped(actionType, 'administrative_reply_body_missing');
              continue;
            }
          }
        } else if (actionType === 'status_update') {
          const resolvedTransition = resolvePlannerStatusTransition(lifecycleContext, action, closeEligible);
          if (!resolvedTransition.key) {
            markPlannerSkipped(actionType, 'missing_transition_key');
            continue;
          }
          if (!resolvedTransition.transition || lifecycleContext?.terminal === true) {
            markPlannerSkipped(actionType, 'transition_not_allowed');
            continue;
          }
          terminal = lifecycleTransitionIsTerminal(resolvedTransition.transition);
          if (terminal && !closeEligible) {
            markPlannerSkipped(actionType, 'terminal_transition_requires_close_eligibility');
            continue;
          }
          authorizedAction = {
            ...action,
            transition_key: resolvedTransition.key,
            ...(resolvedTransition.resolution ? { transition_resolution: resolvedTransition.resolution } : {}),
          } as PlannerAction;
        }
        plannerAuthorizedActions.push({
          action: authorizedAction,
          plannerActionKey: plannerActionKey(authorizedAction, actionPlannerGuidanceHash),
          replyBody,
          terminal,
        });
      }
    }
    for (const actionType of PHASE_1_PLANNER_OWNED_ACTION_TYPES) {
      if (
        actionPlannerResult
        && !plannerAuthorizedActions.some((entry) => entry.action.action_type === actionType)
        && !plannerSkippedActions[actionType]
      ) {
        plannerSkippedActions[actionType] = 'not_selected_by_action_planner';
      }
    }
    const plannerActionSummaries = plannerAuthorizedActions.map((entry) => ({
      action_type: entry.action.action_type,
      key: entry.plannerActionKey,
      reply_kind: entry.action.reply_kind ?? null,
      administrative_intent: entry.action.administrative_intent ?? null,
      transition_key: entry.action.transition_key ?? null,
      transition_resolution: isRecord(entry.action) && typeof entry.action.transition_resolution === 'string'
        ? entry.action.transition_resolution
        : null,
      terminal: entry.terminal,
      reason: entry.action.reason,
    }));
    const plannerPlannedActionSummaries = (actionPlannerResult?.actions ?? []).map((action) => ({
      action_type: action.action_type,
      reply_kind: action.reply_kind ?? null,
      administrative_intent: action.administrative_intent ?? null,
      transition_key: action.transition_key ?? null,
      verbatim_ref: action.verbatim_ref ?? null,
      body_present: typeof action.body === 'string' && action.body.trim().length > 0,
      reason: action.reason,
    }));
    const actionPlannerMetadata = {
      enabled: process.env.AI_AGENT_ACTION_PLANNER !== '0',
      owned_action_types: [...PHASE_1_PLANNER_OWNED_ACTION_TYPES],
      used: actionPlannerResult != null,
      fallback_reason: actionPlannerFallbackReason,
      model: actionPlannerResult?.model ?? null,
      projected_tokens: actionPlannerProjection?.estimatedTokens ?? null,
      projected_cost_eur: actionPlannerProjection?.estimatedCostEur ?? null,
      tokens: actionPlannerResult?.estimated_tokens ?? null,
      cost_eur: actionPlannerResult?.estimated_cost_eur ?? null,
      latency_ms: actionPlannerResult?.latency_ms ?? null,
      guidance_hash: actionPlannerGuidanceHash,
      rationale: actionPlannerResult?.rationale ?? null,
      confidence: actionPlannerResult?.confidence ?? null,
      planned_actions: plannerPlannedActionSummaries,
      authorized_actions: plannerActionSummaries,
      skipped_actions: plannerSkippedActions,
    };
    const fallbackPrepareInternalNote = plannerFallbackActive && conversationGate.can_prepare_internal_note;
    // Drives whether we ATTEMPT synthesis below — the actual external prepare is gated on a usable
    // result (fallbackPublicReplyUsable), computed once synthesis has run.
    const fallbackPreparePublicReply = plannerFallbackActive && conversationGate.can_prepare_public_reply;
    const fallbackStatusUpdateProposal = plannerFallbackActive
      ? buildStatusUpdateProposal(lifecycleContext, conversationGate.can_prepare_public_reply)
      : null;
    const classificationUpdateInput = buildClassificationUpdateProposal(ticket, classificationContext);
    const assignmentUpdateInput = buildAssignmentUpdateProposal(routingContext);

    const plannerNeedsSourcedSynthesis = plannerAuthorizedActions.some((entry) =>
      entry.action.action_type === 'requester_reply' && entry.action.reply_kind === 'sourced_answer',
    );
    if (plannerNeedsSourcedSynthesis || fallbackPreparePublicReply) {
      await runReplySynthesis();
    }
    const runUsageEstimate = await this.recordAndEnforceHelpdeskRunCap(context, {
      definition: agentDefinition,
      runId: ticketResult.run_id,
      stage: 'before_proposal_preparation',
      usage: currentRunLlmUsage(),
    });
    const synthesisMetadata = buildSynthesisMetadata();
    // Fail closed (#47): in the legacy fallback (action planner unavailable), only prepare the
    // EXTERNAL requester reply and the pending transition when synthesis actually produced a
    // usable, grounded answer. A failed / skipped / truncated synthesis must never ship a generic
    // "no reliable answer" public reply, nor move the ticket to pending as if we were waiting on
    // the requester — the internal note alone carries the escalation for a technician to complete.
    const fallbackPublicReplyUsable = fallbackPreparePublicReply && replySynthesisResult?.usable === true;
    const fallbackStatusUpdateInput = fallbackPublicReplyUsable ? fallbackStatusUpdateProposal : null;

    let effectivePlannerActions = [...plannerAuthorizedActions];
    const plannerDowngradedActions: Record<string, string> = {};
    const sourcedReplyAction = effectivePlannerActions.find((entry) =>
      entry.action.action_type === 'requester_reply' && entry.action.reply_kind === 'sourced_answer',
    ) ?? null;
    if (sourcedReplyAction && (!replySynthesisResult || !replySynthesisResult.usable)) {
      const downgradeReason = synthesisFallbackReason
        ?? replySynthesisResult?.fallback_reason
        ?? 'synthesis_unavailable_or_unusable';
      plannerDowngradedActions.requester_reply = downgradeReason;
      plannerSkippedActions.requester_reply = downgradeReason;
      effectivePlannerActions = effectivePlannerActions.filter((entry) => entry !== sourcedReplyAction);
      effectivePlannerActions = effectivePlannerActions.filter((entry) => {
        if (entry.action.action_type !== 'status_update') {
          return true;
        }
        const transitionKey = normalizePlannerStatusTransitionKey(entry.action.transition_key);
        if (transitionKey !== 'pending') {
          return true;
        }
        const statusDowngradeReason = `pending_requires_usable_requester_reply: ${downgradeReason}`;
        plannerDowngradedActions.status_update = statusDowngradeReason;
        plannerSkippedActions.status_update = statusDowngradeReason;
        return false;
      });
      const hasInternalNote = effectivePlannerActions.some((entry) => entry.action.action_type === 'internal_note');
      const canPrepareDowngradeInternalNote = !!agentDefinition
        && conversationGate.can_prepare_internal_note
        && definitionAllowsCapability(agentDefinition, TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY)
        && definitionAllowsCapability(agentDefinition, TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY);
      if (!hasInternalNote && canPrepareDowngradeInternalNote) {
        delete plannerSkippedActions.internal_note;
        const downgradeAction: PlannerAction = {
          action_type: 'internal_note',
          reason: `Escalate internally because sourced reply synthesis was not usable: ${downgradeReason}.`,
        };
        effectivePlannerActions.push({
          action: downgradeAction,
          plannerActionKey: `downgrade:${sourcedReplyAction.plannerActionKey}:internal_note`,
          replyBody: null,
          terminal: false,
        });
      }
    }
    // Internal-note body: a usable synthesis renders the full triage note; otherwise, if the
    // planner deliberately handled the ticket itself — an internal escalation (no requester reply
    // prepared) or a planner-authored administrative reply (synthesis skipped by design) — the note
    // carries the agent's rationale instead of the "synthesis unavailable, complete manually"
    // boilerplate (which is only honest when a sourced answer was expected and failed).
    // Snake_case gate tokens are filtered out.
    const effectiveInternalNoteAction = effectivePlannerActions.find((entry) => entry.action.action_type === 'internal_note') ?? null;
    const hasEffectiveRequesterReply = effectivePlannerActions.some((entry) => entry.action.action_type === 'requester_reply');
    const effectiveAdministrativeReplyAction = effectivePlannerActions.find((entry) =>
      entry.action.action_type === 'requester_reply' && entry.action.reply_kind === 'administrative') ?? null;
    // An internal escalation = the planner ran, prepared an internal note, and NO requester reply
    // is being prepared (either never selected, #35, or downgraded after unusable synthesis, #37).
    const isPlannerEscalation = !!actionPlannerResult && !!effectiveInternalNoteAction && !hasEffectiveRequesterReply;
    const isPlannerAdministrativeReply = !!actionPlannerResult && !!effectiveInternalNoteAction && !!effectiveAdministrativeReplyAction;
    const isProseReason = (value: string): boolean => value.length > 0 && !/^[a-z0-9_]+$/.test(value);
    const plannerReasonProse = (reasons: Array<string | null | undefined>): string | null =>
      reasons
        .map((reason) => (reason ?? '').trim())
        .filter(isProseReason)
        .filter((reason, index, all) => all.indexOf(reason) === index)
        .join(' — ') || null;
    const escalationReason = isPlannerEscalation
      ? plannerReasonProse([actionPlannerResult.rationale, effectiveInternalNoteAction.action.reason])
      : null;
    const administrativeReason = isPlannerAdministrativeReply
      ? plannerReasonProse([
        actionPlannerResult.rationale,
        effectiveAdministrativeReplyAction.action.reason,
        effectiveInternalNoteAction.action.reason,
      ])
      : null;
    const noteBody = isPlannerEscalation
      ? buildTriageNote(ticket, knowledgeItems, ticketTimeline, webSearchResults, { kind: 'escalation', reason: escalationReason })
      : (replySynthesisResult
        ? renderSynthesizedTriageNote(ticket, ticketTimeline, replySynthesisResult)
        : (isPlannerAdministrativeReply
          ? buildTriageNote(ticket, knowledgeItems, ticketTimeline, webSearchResults, { kind: 'administrative_reply', reason: administrativeReason })
          : buildTriageNote(ticket, knowledgeItems, ticketTimeline, webSearchResults, null)));

    const effectivePlannerActionSummaries = effectivePlannerActions.map((entry) => ({
      action_type: entry.action.action_type,
      key: entry.plannerActionKey,
      reply_kind: entry.action.reply_kind ?? null,
      administrative_intent: entry.action.administrative_intent ?? null,
      transition_key: entry.action.transition_key ?? null,
      transition_resolution: isRecord(entry.action) && typeof entry.action.transition_resolution === 'string'
        ? entry.action.transition_resolution
        : null,
      terminal: entry.terminal,
      reason: entry.action.reason,
    }));
    const actionPlannerMetadataForAudit = {
      ...actionPlannerMetadata,
      effective_actions: effectivePlannerActionSummaries,
      downgraded_actions: plannerDowngradedActions,
      skipped_actions: plannerSkippedActions,
    };
    const proposalScope = {
      providerKind: target.provider_kind,
      providerKey: target.provider_key,
      targetType: target.target_kind,
      targetRef: ticket.id,
    };
    const effectivePlannerActionKeys = new Set(effectivePlannerActions.map((entry) => entry.plannerActionKey));
    await this.withdrawSupersededPlannerProposals(context, {
      ...proposalScope,
      agentDefinitionId: stringFromMetadata(metadataObject(baseMetadata).agent_definition_id),
      currentPlannerActionKeys: actionPlannerResult ? effectivePlannerActionKeys : null,
      currentGuidanceHash: actionPlannerGuidanceHash,
      closeNoLongerEligible: !closeEligible,
    });

    const now = new Date();
    const observationRepo = context.manager.getRepository(AiObservation);
    const observation = await observationRepo.save(observationRepo.create({
      tenant_id: context.tenantId,
      run_id: ticketResult.run_id,
      observation_type: options.observationType ?? TICKETING_TRIAGE_RUN_OPTIONS.observationType,
      status: 'observed',
      source_provider: `${target.provider_kind}:${target.provider_key}`,
      source_object_type: 'ticket',
      source_object_id: ticket.id,
      severity: ticket.priority ?? null,
      summary: `Ticket ${ticket.id}: ${ticket.title}. ${knowledgeItems.length} knowledge result(s) found.`,
      evidence_ids: allEvidenceIds,
      metadata_json: {
        ...agentMetadata,
        provider_key: target.provider_key,
        target_key: target.target_key,
        ticket_history_entry_count: ticketTimeline.length,
        latest_requester_message_at: conversationGate.latest_requester_message_at,
        classification_context: classificationContext,
        lifecycle_context: lifecycleContext,
        routing_context: routingContext,
        participant_context: participantContext,
        knowledge_need_representation: serializeKnowledgeNeedRepresentation(knowledgeNeedRepresentation),
        knowledge_query_derivation: serializeKnowledgeQueryDerivation(knowledgeQueryDerivation),
        ticket_image_evidence: ticketImageExtraction.evidence,
        ticket_image_evidence_warnings: ticketImageExtraction.warnings,
        ticket_image_evidence_skipped_reason: ticketImageExtraction.skippedReason,
        ticket_attachment_refs: ticketImageExtraction.attachmentRefs,
        run_usage_estimate: runUsageEstimate,
        knowledge_result_count: knowledgeItems.length,
        knowledge_low_relevance_count: knowledgeLowRelevance.length,
        knowledge_low_relevance: knowledgeLowRelevance,
        web_search_enabled: knowledgeSources.webEnabled === true,
        web_search_ready: Features.AI_WEB_SEARCH_READY,
        web_search_status: webSearchStatus,
        web_search_query: webSearchQuery,
        web_search_query_candidates: webQueryCandidates,
        web_search_error: webSearchError,
        web_result_count: webSearchResults.length,
        knowledge_candidate_count: mergedKnowledgeCandidates.length,
        knowledge_query: selectedKnowledgeAttempt?.query ?? null,
        knowledge_query_attempt_count: knowledgeAttempts.length,
        knowledge_document_fetch_count: knowledgeDocumentAttempts.filter((attempt) => !!attempt.result).length,
        knowledge_search_plan: serializeKnowledgeSearchPlan(knowledgeSearchPlan),
        knowledge_result_interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
        action_planner: actionPlannerMetadataForAudit,
        ...synthesisMetadata,
      },
      observed_at: now,
      created_at: now,
      updated_at: now,
    }));

    const expectedActionLabels = [
      fallbackPrepareInternalNote || effectivePlannerActions.some((entry) => entry.action.action_type === 'internal_note') ? 'internal note' : null,
      fallbackPublicReplyUsable || effectivePlannerActions.some((entry) => entry.action.action_type === 'requester_reply') ? 'requester reply' : null,
      fallbackStatusUpdateInput || effectivePlannerActions.some((entry) => entry.action.action_type === 'status_update') ? 'status update' : null,
      classificationUpdateInput ? 'classification update' : null,
      assignmentUpdateInput ? 'assignment update' : null,
    ].filter((label): label is string => !!label);
    const anyActionEligible = expectedActionLabels.length > 0;
    const recommendationRepo = context.manager.getRepository(AiRecommendation);
    const recommendation = await recommendationRepo.save(recommendationRepo.create({
      tenant_id: context.tenantId,
      run_id: ticketResult.run_id,
      observation_id: observation.id,
      recommendation_type: options.recommendationType ?? TICKETING_TRIAGE_RUN_OPTIONS.recommendationType,
      status: anyActionEligible ? 'proposed' : 'skipped',
      summary: anyActionEligible
        ? `Prepare ${expectedActionLabels.join(' and ')} with the related KANAP knowledge and ticket history context.`
        : 'Do not prepare a ticketing action; the action planner/builders found no eligible action for this run.',
      rationale: anyActionEligible
        ? 'The workflow read the ticket history, searched the KANAP knowledge base, authorized the instruction-driven plan for owned actions, and kept non-owned deterministic builders unchanged.'
        : 'The workflow read the ticket history and no owned planner action or non-owned deterministic builder produced an eligible proposal.',
      confidence: knowledgeItems.length > 0 ? 0.72 : 0.46,
      proposed_action_class: 'ticket_triage_followups',
      max_autonomy_level: 'A2',
      evidence_ids: allEvidenceIds,
      metadata_json: {
        ...agentMetadata,
        provider_key: target.provider_key,
        target_key: target.target_key,
        conversation_gate: conversationGate,
        classification_context: classificationContext,
        lifecycle_context: lifecycleContext,
        routing_context: routingContext,
        participant_context: participantContext,
        knowledge_need_representation: serializeKnowledgeNeedRepresentation(knowledgeNeedRepresentation),
        knowledge_query_derivation: serializeKnowledgeQueryDerivation(knowledgeQueryDerivation),
        ticket_image_evidence: ticketImageExtraction.evidence,
        ticket_image_evidence_warnings: ticketImageExtraction.warnings,
        ticket_image_evidence_skipped_reason: ticketImageExtraction.skippedReason,
        ticket_attachment_refs: ticketImageExtraction.attachmentRefs,
        run_usage_estimate: runUsageEstimate,
        ticket_history: ticketTimeline.map((entry) => ({
          id: entry.id,
          visibility: entry.visibility,
          actor: entry.actor,
          created_at: entry.createdAt,
          body_preview: clampText(entry.body, 220),
        })),
        knowledge_query: selectedKnowledgeAttempt?.query ?? null,
        knowledge_search_plan: serializeKnowledgeSearchPlan(knowledgeSearchPlan),
        knowledge_query_attempts: knowledgeAttempts.map((attempt) => ({
          query: attempt.query,
          result_count: attempt.items.length,
          tool_execution_id: attempt.result.tool_execution_id,
        })),
        knowledge_candidates: mergedKnowledgeCandidates.map((item) => ({
          ref: item.ref ?? item.id ?? null,
          title: item.title ?? null,
          score: item.score ?? null,
          search_queries: item.search_queries,
        })),
        knowledge_result_interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
        knowledge_low_relevance: knowledgeLowRelevance,
        knowledge_document_fetches: knowledgeDocumentAttempts.map((attempt) => ({
          document_id: attempt.document_id,
          tool_execution_id: attempt.result?.tool_execution_id ?? null,
          status: attempt.result ? 'completed' : 'failed',
          error_message: attempt.error_message ?? null,
        })),
        knowledge_results: knowledgeItems.map((item) => ({
          ref: item.ref ?? item.id ?? null,
          title: item.title ?? null,
          score: item.score ?? null,
        })),
        action_planner: actionPlannerMetadataForAudit,
        ...synthesisMetadata,
      },
      created_at: now,
      updated_at: now,
    }));

    const decisionRepo = context.manager.getRepository(AiDecision);
    const decision = await decisionRepo.save(decisionRepo.create({
      tenant_id: context.tenantId,
      run_id: ticketResult.run_id,
      recommendation_id: recommendation.id,
      decision: anyActionEligible ? 'prepare_action' : 'no_action',
      status: anyActionEligible ? 'pending_human_approval' : 'skipped',
      reason: anyActionEligible
        ? `Prepared ${expectedActionLabels.join(' and ')} action request(s); no write will occur without explicit approval.`
        : 'Skipped ticketing action preparation because no eligible planner or builder action was selected.',
      evidence_ids: allEvidenceIds,
      policy_result_json: {
        autonomy_level: 'A2',
        approval_required: anyActionEligible,
        action_planner_used: actionPlannerResult != null,
      },
      metadata_json: {
        ...agentMetadata,
        provider_key: target.provider_key,
        target_key: target.target_key,
        conversation_gate: conversationGate,
        action_planner: actionPlannerMetadataForAudit,
      },
      created_at: now,
      updated_at: now,
    }));

    const evaluationRepo = context.manager.getRepository(AiEvaluation);
    const evaluation = await evaluationRepo.save(evaluationRepo.create({
      tenant_id: context.tenantId,
      run_id: ticketResult.run_id,
      recommendation_id: recommendation.id,
      decision_id: decision.id,
      status: anyActionEligible ? 'pending' : 'completed',
      outcome: anyActionEligible ? null : 'no_eligible_action_selected',
      scores_json: null,
      feedback_json: null,
      metadata_json: {
        ...agentMetadata,
        evaluation_type: options.evaluationType ?? TICKETING_TRIAGE_RUN_OPTIONS.evaluationType,
      },
      created_at: now,
      updated_at: now,
    }));

    const plannerInternalNote = effectivePlannerActions.find((entry) => entry.action.action_type === 'internal_note') ?? null;
    const plannerRequesterReply = effectivePlannerActions.find((entry) => entry.action.action_type === 'requester_reply') ?? null;
    const plannerStatusUpdate = effectivePlannerActions.find((entry) => entry.action.action_type === 'status_update') ?? null;
    const plannerStatusTransitionKey = plannerStatusUpdate && typeof plannerStatusUpdate.action.transition_key === 'string'
      ? plannerStatusUpdate.action.transition_key
      : null;
    const plannerSuppressionReasons: Record<string, string> = {};
    const plannerProposalContextHash = (entry: { action: PlannerAction; terminal: boolean }): string => proposalHash({
      action_type: entry.action.action_type,
      ticket: ticket.id,
      updated_at: ticket.updatedAt ?? ticket.updated_at ?? null,
      latest_requester_message_fingerprint: conversationGate.latest_requester_message_fingerprint,
      latest_ticket_note_fingerprint: conversationGate.latest_ticket_note_fingerprint,
      close_bucket: entry.terminal || entry.action.administrative_intent === 'close_reply'
        ? (ticket.updatedAt ?? ticket.updated_at ?? null)
        : null,
    });
    const plannerProposalHashFor = (entry: { action: PlannerAction; plannerActionKey: string; replyBody: string | null; terminal: boolean }): string => proposalHash({
      action_type: entry.action.action_type,
      planner_action_key: entry.plannerActionKey,
      guidance_hash: actionPlannerGuidanceHash,
      reply_kind: entry.action.reply_kind ?? null,
      administrative_intent: entry.action.administrative_intent ?? null,
      verbatim_ref: entry.action.verbatim_ref ?? null,
      body_fingerprint: entry.replyBody ? proposalHash({ body: entry.replyBody }) : null,
      transition_key: entry.action.transition_key ?? null,
      terminal: entry.terminal,
    });
    const plannerMetadata = (
      entry: { action: PlannerAction; plannerActionKey: string; terminal: boolean },
      proposalHashValue: string | null,
      contextHashValue: string | null,
      triageAction: string,
    ): Record<string, unknown> => ({
      ...baseMetadata,
      source: 'action_planner',
      planner_action: true,
      planner_action_key: entry.plannerActionKey,
      action_planner_guidance_hash: actionPlannerGuidanceHash,
      planner_reason: entry.action.reason,
      planner_reply_kind: entry.action.reply_kind ?? null,
      planner_administrative_intent: entry.action.administrative_intent ?? null,
      triage_action: triageAction,
      conversation_gate: conversationGate,
      proposal_hash: proposalHashValue,
      proposal_context_hash: contextHashValue,
      ...(entry.terminal ? { terminal: true, destructive: true, risk: 'high' } : {}),
    });
    const plannerInternalNoteProposalHash = plannerInternalNote
      ? plannerProposalHashFor({ ...plannerInternalNote, replyBody: noteBody })
      : null;
    const plannerInternalNoteContextHash = plannerInternalNote
      ? plannerProposalContextHash(plannerInternalNote)
      : null;
    const plannerInternalNoteSuppression = plannerInternalNote && plannerInternalNoteProposalHash && plannerInternalNoteContextHash
      ? await this.unchangedProposalSuppressionReason(context, {
        capabilityName: TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
        ...proposalScope,
        proposalHash: plannerInternalNoteProposalHash,
        contextHash: plannerInternalNoteContextHash,
      })
      : null;
    if (plannerInternalNoteSuppression) {
      plannerSuppressionReasons.internal_note = plannerInternalNoteSuppression;
    }
    const synthesisActionMetadata = {
      synthesis_usable: synthesisMetadata.synthesis_usable === true,
      synthesis_fallback_reason: stringFromMetadata(synthesisMetadata.synthesis_fallback_reason),
    };
    const proposal = ((fallbackPrepareInternalNote || plannerInternalNote) && !plannerInternalNoteSuppression)
      ? await this.dispatcher.execute(context, {
        capabilityName: TICKETING_INTERNAL_NOTE_PREPARE_CAPABILITY,
        input: {
          provider_key: target.provider_key,
          ticket_id: ticket.id,
          note_body: noteBody,
          evidence_ids: allEvidenceIds,
          observation_id: observation.id,
          recommendation_id: recommendation.id,
          decision_id: decision.id,
          evaluation_id: evaluation.id,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          metadata: {
            ...synthesisActionMetadata,
            ...(plannerInternalNote
              ? plannerMetadata(
                plannerInternalNote,
                plannerInternalNoteProposalHash,
                plannerInternalNoteContextHash,
                'planner_prepare_internal_note',
              )
              : {
                ...baseMetadata,
                triage_action: 'prepare_internal_note',
                conversation_gate: conversationGate,
              }),
          },
        },
      })
      : null;
    const requesterReplyBody = replySynthesisResult
      ? renderSynthesizedRequesterReply(ticket, replySynthesisResult)
      : buildRequesterReply(ticket, enrichedKnowledgeItems, ticketTimeline, webSearchResults);
    const plannerRequesterReplyBody = plannerRequesterReply
      ? plannerRequesterReply.replyBody ?? requesterReplyBody
      : null;
    const plannerRequesterReplyProposalHash = plannerRequesterReply && plannerRequesterReplyBody
      ? plannerProposalHashFor({ ...plannerRequesterReply, replyBody: plannerRequesterReplyBody })
      : null;
    const plannerRequesterReplyContextHash = plannerRequesterReply
      ? plannerProposalContextHash(plannerRequesterReply)
      : null;
    const plannerRequesterReplySuppression = plannerRequesterReply && plannerRequesterReplyProposalHash && plannerRequesterReplyContextHash
      ? await this.unchangedProposalSuppressionReason(context, {
        capabilityName: TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
        ...proposalScope,
        proposalHash: plannerRequesterReplyProposalHash,
        contextHash: plannerRequesterReplyContextHash,
      })
      : null;
    if (plannerRequesterReplySuppression) {
      plannerSuppressionReasons.requester_reply = plannerRequesterReplySuppression;
    }
    const publicReplyProposal = ((fallbackPublicReplyUsable || plannerRequesterReply) && !plannerRequesterReplySuppression)
      ? await this.dispatcher.execute(context, {
        capabilityName: TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY,
        input: {
          provider_key: target.provider_key,
          ticket_id: ticket.id,
          reply_body: plannerRequesterReplyBody ?? requesterReplyBody,
          evidence_ids: allEvidenceIds,
          observation_id: observation.id,
          recommendation_id: recommendation.id,
          decision_id: decision.id,
          evaluation_id: evaluation.id,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          metadata: {
            ...synthesisActionMetadata,
            ...(plannerRequesterReply
              ? plannerMetadata(
                plannerRequesterReply,
                plannerRequesterReplyProposalHash,
                plannerRequesterReplyContextHash,
                plannerRequesterReply.action.administrative_intent === 'close_reply'
                  ? 'planner_prepare_administrative_close_reply'
                  : 'planner_prepare_public_reply',
              )
              : {
                ...baseMetadata,
                triage_action: 'prepare_public_reply',
                conversation_gate: conversationGate,
              }),
          },
        },
      })
      : null;
    const classificationProposalHash = classificationUpdateInput
      ? proposalHash({
        action: 'classification_update',
        proposed: classificationUpdateInput.proposed,
      })
      : null;
    const classificationContextHash = classificationUpdateInput
      ? proposalHash({
        current: classificationContext,
        proposed: classificationUpdateInput.proposed,
      })
      : null;
    const classificationSuppressionReason = classificationUpdateInput && classificationProposalHash && classificationContextHash
      ? await this.unchangedProposalSuppressionReason(context, {
        capabilityName: TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
        ...proposalScope,
        proposalHash: classificationProposalHash,
        contextHash: classificationContextHash,
      })
      : null;
    const classificationUpdateProposal = classificationUpdateInput && !classificationSuppressionReason
      ? await this.dispatcher.execute(context, {
        capabilityName: TICKETING_CLASSIFICATION_UPDATE_PREPARE_CAPABILITY,
        input: {
          provider_key: target.provider_key,
          ticket_id: ticket.id,
          proposed: classificationUpdateInput.proposed,
          reason: classificationUpdateInput.reason,
          evidence_ids: allEvidenceIds,
          observation_id: observation.id,
          recommendation_id: recommendation.id,
          decision_id: decision.id,
          evaluation_id: evaluation.id,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          metadata: {
            ...baseMetadata,
            triage_action: 'prepare_classification_update',
            proposal_hash: classificationProposalHash,
            proposal_context_hash: classificationContextHash,
          },
        },
      })
      : null;
    const statusUpdateInput = fallbackStatusUpdateInput;
    const plannerStatusProposalHash = plannerStatusUpdate
      ? plannerProposalHashFor({ ...plannerStatusUpdate, replyBody: null })
      : null;
    const plannerStatusContextHash = plannerStatusUpdate
      ? plannerProposalContextHash(plannerStatusUpdate)
      : null;
    const plannerStatusSuppression = plannerStatusUpdate && plannerStatusProposalHash && plannerStatusContextHash
      ? await this.unchangedProposalSuppressionReason(context, {
        capabilityName: TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
        ...proposalScope,
        proposalHash: plannerStatusProposalHash,
        contextHash: plannerStatusContextHash,
      })
      : null;
    if (plannerStatusSuppression) {
      plannerSuppressionReasons.status_update = plannerStatusSuppression;
    }
    const statusProposalHash = statusUpdateInput
      ? proposalHash({
        action: 'status_update',
        transition_key: statusUpdateInput.transitionKey,
      })
      : null;
    const statusContextHash = statusUpdateInput
      ? proposalHash({
        current: lifecycleContext,
        transition_key: statusUpdateInput.transitionKey,
      })
      : null;
    const statusSuppressionReason = statusUpdateInput && statusProposalHash && statusContextHash
      ? await this.unchangedProposalSuppressionReason(context, {
        capabilityName: TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
        ...proposalScope,
        proposalHash: statusProposalHash,
        contextHash: statusContextHash,
      })
      : null;
    const statusUpdateProposal = plannerStatusUpdate && plannerStatusTransitionKey && !plannerStatusSuppression
      ? await this.dispatcher.execute(context, {
        capabilityName: TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY,
        input: {
          provider_key: target.provider_key,
          ticket_id: ticket.id,
          transition_key: plannerStatusTransitionKey,
          reason: plannerStatusUpdate.action.reason,
          evidence_ids: allEvidenceIds,
          observation_id: observation.id,
          recommendation_id: recommendation.id,
          decision_id: decision.id,
          evaluation_id: evaluation.id,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          metadata: plannerMetadata(
            plannerStatusUpdate,
            plannerStatusProposalHash,
            plannerStatusContextHash,
            plannerStatusUpdate.terminal ? 'planner_prepare_terminal_status' : 'planner_prepare_status_update',
          ),
        },
      })
      : statusUpdateInput && !statusSuppressionReason
      ? await this.dispatcher.execute(context, {
        capabilityName: TICKETING_STATUS_UPDATE_PREPARE_CAPABILITY,
        input: {
          provider_key: target.provider_key,
          ticket_id: ticket.id,
          transition_key: statusUpdateInput.transitionKey,
          reason: statusUpdateInput.reason,
          evidence_ids: allEvidenceIds,
          observation_id: observation.id,
          recommendation_id: recommendation.id,
          decision_id: decision.id,
          evaluation_id: evaluation.id,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          metadata: {
            ...baseMetadata,
            triage_action: 'prepare_status_update',
            proposal_hash: statusProposalHash,
            proposal_context_hash: statusContextHash,
          },
        },
      })
      : null;
    const assignmentUpdateProposal = assignmentUpdateInput
      ? await this.dispatcher.execute(context, {
        capabilityName: TICKETING_ASSIGNMENT_UPDATE_PREPARE_CAPABILITY,
        input: {
          provider_key: target.provider_key,
          ticket_id: ticket.id,
          target: assignmentUpdateInput.target,
          reason: assignmentUpdateInput.reason,
          evidence_ids: allEvidenceIds,
          observation_id: observation.id,
          recommendation_id: recommendation.id,
          decision_id: decision.id,
          evaluation_id: evaluation.id,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          metadata: {
            ...baseMetadata,
            triage_action: 'prepare_assignment_update',
          },
        },
      })
      : null;

    const plannerSkippedActionsWithSuppression = {
      ...plannerSkippedActions,
      ...plannerSuppressionReasons,
    };
    const actionPlannerOutcomeMetadata = {
      ...actionPlannerMetadataForAudit,
      skipped_actions: plannerSkippedActionsWithSuppression,
      suppression_reasons: plannerSuppressionReasons,
    };

    const directPreparedActionIds = Array.from(new Set([
      ...(proposal ? actionRequestIdsFromCapabilityOutput(proposal.output) : []),
      ...(publicReplyProposal ? actionRequestIdsFromCapabilityOutput(publicReplyProposal.output) : []),
      ...(classificationUpdateProposal ? actionRequestIdsFromCapabilityOutput(classificationUpdateProposal.output) : []),
      ...(statusUpdateProposal ? actionRequestIdsFromCapabilityOutput(statusUpdateProposal.output) : []),
      ...(assignmentUpdateProposal ? actionRequestIdsFromCapabilityOutput(assignmentUpdateProposal.output) : []),
    ]));
    const expectedPreparedActionCount = [
      !!proposal && adapterData(proposal.output) != null,
      !!publicReplyProposal && adapterData(publicReplyProposal.output) != null,
      !!classificationUpdateProposal && adapterData(classificationUpdateProposal.output) != null,
      !!statusUpdateProposal && adapterData(statusUpdateProposal.output) != null,
      !!assignmentUpdateProposal && adapterData(assignmentUpdateProposal.output) != null,
    ].filter(Boolean).length;
    const recoveredPreparedActionIds = directPreparedActionIds.length >= expectedPreparedActionCount
      ? []
      : await this.recoverPreparedTicketingActionIds(context, {
        runId: ticketResult.run_id,
        targetRef: ticket.id,
      });
    const preparedActionIds = Array.from(new Set([
      ...directPreparedActionIds,
      ...recoveredPreparedActionIds,
    ]));
    let durablePreparedActions = preparedActionIds.length > 0
      ? await context.manager.getRepository(AiActionRequest).find({
        where: {
          tenant_id: context.tenantId,
          id: In(preparedActionIds),
        },
      })
      : [];
    if (expectedPreparedActionCount > 0 && durablePreparedActions.length === 0) {
      throw new BadRequestException('Ticket triage prepared a proposal but did not create a durable action request for review.');
    }
    durablePreparedActions = await this.ensureProposalEvaluations(context, {
      runId: ticketResult.run_id,
      recommendationId: recommendation.id,
      decisionId: decision.id,
      actions: durablePreparedActions,
      agentMetadata,
      evaluationType: options.proposalEvaluationType,
    });
    const automaticExecution = await this.executeAutomaticPreparedActions(context, {
      definition: agentDefinition,
      actions: durablePreparedActions,
      baseMetadata,
      runId: ticketResult.run_id,
      stepIndex,
    });
    stepIndex = automaticExecution.nextStepIndex;
    const executedAutomaticActionIds = new Set(
      automaticExecution.executions
        .filter((execution) => execution.status === 'executed')
        .map((execution) => execution.action_request_id),
    );
    if (executedAutomaticActionIds.size > 0) {
      durablePreparedActions = await context.manager.getRepository(AiActionRequest).find({
        where: {
          tenant_id: context.tenantId,
          id: In(durablePreparedActions.map((action) => action.id)),
        },
      });
    }
    const durablePreparedActionIds = durablePreparedActions.map((action) => action.id);
    let finalWorkItem: AiAgentWorkItem | null = leasedWorkItem;
    let targetState: AiAgentTargetState | null = null;
    if (this.agentQueue && agentDefinition && leasedWorkItem) {
      const outcome = await this.agentQueue.recordManualTicketingTriageOutcome(context, {
        definition: agentDefinition,
        workItem: leasedWorkItem,
        runId: ticketResult.run_id,
        actionRequestIds: durablePreparedActionIds,
        ticket,
        knowledgeResultCount: knowledgeItems.length,
        metadata: {
          observation_id: observation.id,
          recommendation_id: recommendation.id,
          decision_id: decision.id,
          evaluation_id: evaluation.id,
          knowledge_query: selectedKnowledgeAttempt?.query ?? null,
          knowledge_search_plan: serializeKnowledgeSearchPlan(knowledgeSearchPlan),
          knowledge_query_attempts: knowledgeAttempts.map((attempt) => ({
            query: attempt.query,
            result_count: attempt.items.length,
            tool_execution_id: attempt.result.tool_execution_id,
          })),
          knowledge_candidate_count: mergedKnowledgeCandidates.length,
          knowledge_low_relevance_count: knowledgeLowRelevance.length,
          knowledge_result_interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
          knowledge_candidates: mergedKnowledgeCandidates.map((item) => ({
            ref: item.ref ?? item.id ?? null,
            title: item.title ?? null,
            score: item.score ?? null,
            search_queries: item.search_queries,
          })),
          knowledge_low_relevance: knowledgeLowRelevance,
          conversation_gate: conversationGate,
          classification_context: classificationContext,
          lifecycle_context: lifecycleContext,
          routing_context: routingContext,
          participant_context: participantContext,
          knowledge_need_representation: serializeKnowledgeNeedRepresentation(knowledgeNeedRepresentation),
          knowledge_query_derivation: serializeKnowledgeQueryDerivation(knowledgeQueryDerivation),
          ticket_image_evidence: ticketImageExtraction.evidence,
          ticket_image_evidence_warnings: ticketImageExtraction.warnings,
          ticket_image_evidence_skipped_reason: ticketImageExtraction.skippedReason,
          ticket_attachment_refs: ticketImageExtraction.attachmentRefs,
          run_usage_estimate: runUsageEstimate,
          automatic_executions: automaticExecution.executions,
          ticket_history_entry_count: ticketTimeline.length,
          action_planner: actionPlannerOutcomeMetadata,
          phase11_proposals: {
            planner_owned: {
              internal_note: plannerInternalNote ? {
                proposal_hash: plannerInternalNoteProposalHash,
                proposal_context_hash: plannerInternalNoteContextHash,
                suppression_reason: plannerInternalNoteSuppression,
              } : null,
              requester_reply: plannerRequesterReply ? {
                reply_kind: plannerRequesterReply.action.reply_kind ?? null,
                administrative_intent: plannerRequesterReply.action.administrative_intent ?? null,
                proposal_hash: plannerRequesterReplyProposalHash,
                proposal_context_hash: plannerRequesterReplyContextHash,
                suppression_reason: plannerRequesterReplySuppression,
              } : null,
              status_update: plannerStatusUpdate ? {
                transition_key: plannerStatusTransitionKey,
                terminal: plannerStatusUpdate.terminal,
                proposal_hash: plannerStatusProposalHash,
                proposal_context_hash: plannerStatusContextHash,
                suppression_reason: plannerStatusSuppression,
              } : null,
            },
            classification: classificationUpdateInput ? {
              ...classificationUpdateInput,
              proposal_hash: classificationProposalHash,
              proposal_context_hash: classificationContextHash,
              suppression_reason: classificationSuppressionReason,
            } : null,
            status: plannerStatusUpdate ? {
              source: 'action_planner',
              transitionKey: plannerStatusTransitionKey,
              reason: plannerStatusUpdate.action.reason,
              terminal: plannerStatusUpdate.terminal,
              proposal_hash: plannerStatusProposalHash,
              proposal_context_hash: plannerStatusContextHash,
              suppression_reason: plannerStatusSuppression,
            } : statusUpdateInput ? {
              ...statusUpdateInput,
              proposal_hash: statusProposalHash,
              proposal_context_hash: statusContextHash,
              suppression_reason: statusSuppressionReason,
            } : null,
            assignment: assignmentUpdateInput,
          },
          skipped_actions: {
            internal_note: plannerSkippedActionsWithSuppression.internal_note
              ?? (conversationGate.can_prepare_internal_note ? null : conversationGate.internal_note_reason),
            public_reply: plannerSkippedActionsWithSuppression.requester_reply
              ?? (conversationGate.can_prepare_public_reply ? null : conversationGate.public_reply_reason),
            classification: classificationSuppressionReason ?? (classificationUpdateInput ? null : 'no_safe_classification_change'),
            status: plannerSkippedActionsWithSuppression.status_update
              ?? statusSuppressionReason
              ?? (statusUpdateInput ? null : 'no_safe_status_transition'),
            assignment: assignmentUpdateInput ? null : 'no_supported_assignment_target',
            participants: 'provider_participant_update_not_prepared',
          },
        },
      });
      finalWorkItem = outcome.workItem;
      targetState = outcome.targetState;
    }

    return {
      target: serializeLiveTarget(target),
      agent_definition: agentDefinition ? serializeAgentDefinition(agentDefinition) : null,
      work_item: finalWorkItem ? serializeAgentWorkItem(finalWorkItem) : null,
      target_state: targetState ? serializeAgentTargetState(targetState) : null,
      diagnostic: {
        run_id: ticketResult.run_id,
        ticket_tool_execution_id: ticketResult.tool_execution_id,
        ticket_notes_tool_execution_id: ticketNotesResult.tool_execution_id,
        classification_context_tool_execution_id: classificationContextResult.tool_execution_id,
        lifecycle_context_tool_execution_id: lifecycleContextResult.tool_execution_id,
        routing_context_tool_execution_id: routingContextResult.tool_execution_id,
        participant_context_tool_execution_id: participantContextResult.tool_execution_id,
        knowledge_tool_execution_id: knowledgeResult?.tool_execution_id ?? null,
        knowledge_tool_execution_ids: knowledgeAttempts.map((attempt) => attempt.result.tool_execution_id),
        knowledge_document_tool_execution_ids: knowledgeDocumentAttempts
          .map((attempt) => attempt.result?.tool_execution_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
        knowledge_query: selectedKnowledgeAttempt?.query ?? null,
        knowledge_query_candidates: knowledgeQueryCandidates,
        knowledge_search_plan: serializeKnowledgeSearchPlan(knowledgeSearchPlan),
        knowledge_need_representation: serializeKnowledgeNeedRepresentation(knowledgeNeedRepresentation),
        knowledge_query_derivation: serializeKnowledgeQueryDerivation(knowledgeQueryDerivation),
        ticket_image_extraction: serializeTicketImageExtraction(ticketImageExtraction),
        ticket_image_evidence: ticketImageExtraction.evidence,
        ticket_image_evidence_warnings: ticketImageExtraction.warnings,
        ticket_image_evidence_skipped_reason: ticketImageExtraction.skippedReason,
        ticket_attachment_refs: ticketImageExtraction.attachmentRefs,
        knowledge_query_attempts: knowledgeAttempts.map((attempt) => ({
          query: attempt.query,
          result_count: attempt.items.length,
          tool_execution_id: attempt.result.tool_execution_id,
        })),
        knowledge_candidates: mergedKnowledgeCandidates.map((item) => ({
          ref: item.ref ?? item.id ?? null,
          title: item.title ?? null,
          score: item.score ?? null,
          search_queries: item.search_queries,
        })),
        knowledge_result_interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
        knowledge_low_relevance: knowledgeLowRelevance,
        evidence_ids: allEvidenceIds,
        observation_id: observation.id,
        recommendation_id: recommendation.id,
        decision_id: decision.id,
        evaluation_id: evaluation.id,
        action_request_ids: durablePreparedActionIds,
        conversation_gate: conversationGate,
        classification_context: classificationContext,
        lifecycle_context: lifecycleContext,
        routing_context: routingContext,
        participant_context: participantContext,
        run_usage_estimate: runUsageEstimate,
        automatic_executions: automaticExecution.executions,
        action_planner: actionPlannerOutcomeMetadata,
        skipped_actions: {
          internal_note: plannerSkippedActionsWithSuppression.internal_note
            ?? (conversationGate.can_prepare_internal_note ? null : conversationGate.internal_note_reason),
          public_reply: plannerSkippedActionsWithSuppression.requester_reply
            ?? (conversationGate.can_prepare_public_reply ? null : conversationGate.public_reply_reason),
          classification: classificationSuppressionReason ?? (classificationUpdateInput ? null : 'no_safe_classification_change'),
          status: plannerSkippedActionsWithSuppression.status_update
            ?? statusSuppressionReason
            ?? (statusUpdateInput ? null : 'no_safe_status_transition'),
          assignment: assignmentUpdateInput ? null : 'no_supported_assignment_target',
          participants: 'provider_participant_update_not_prepared',
        },
        ticket_history_entry_count: ticketTimeline.length,
        knowledge_results: knowledgeItems,
        knowledge_low_relevance_count: knowledgeLowRelevance.length,
        knowledge_documents: enrichedKnowledgeItems.slice(0, MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY).map((item) => ({
          ref: item.ref ?? item.id ?? null,
          title: item.title ?? null,
          score: item.score ?? null,
          content_length: item.content_markdown?.length ?? 0,
        })),
        synthesis: synthesisMetadata,
        internal_note_tool_execution_id: proposal?.tool_execution_id ?? null,
        public_reply_tool_execution_id: publicReplyProposal?.tool_execution_id ?? null,
        classification_update_tool_execution_id: classificationUpdateProposal?.tool_execution_id ?? null,
        status_update_tool_execution_id: statusUpdateProposal?.tool_execution_id ?? null,
        assignment_update_tool_execution_id: assignmentUpdateProposal?.tool_execution_id ?? null,
      },
      proposal,
      public_reply_proposal: publicReplyProposal,
      classification_update_proposal: classificationUpdateProposal,
      status_update_proposal: statusUpdateProposal,
      assignment_update_proposal: assignmentUpdateProposal,
      detail: await this.getRunDetail(context, ticketResult.run_id),
    };
    } catch (error) {
      if (this.agentQueue && leasedWorkItem) {
        await this.agentQueue.failWorkItem(context, leasedWorkItem, error);
      }
      throw error;
    }
  }

  async approveActionRequest(
    context: AiExecutionContextWithManager,
    actionRequestId: string,
    options: { execute?: boolean | null; reason?: string | null } = {},
  ) {
    if (options.execute !== false) {
      const pendingAction = await context.manager.getRepository(AiActionRequest).findOne({
        where: { id: actionRequestId, tenant_id: context.tenantId },
      });
      if (!pendingAction) {
        throw new NotFoundException('Action request not found.');
      }
      await this.assertActionSafeForUiExecution(context, pendingAction);
    }

    const approved = await this.approvals.approveActionRequest(context, actionRequestId, {
      source: 'human_ui',
      reason: approvalDecisionReason(options.reason, 'Approved from Agent Control Center.'),
      actorLabel: null,
    });

    let execution: unknown = null;
    if (options.execute !== false) {
      // Carry the agent id so an agent-scoped emergency pause blocks this write too.
      // Without it the dispatcher only sees tenant-wide pauses and an agent-scoped
      // "pause this agent" would not hold its already-pending human-approved writes.
      // Invariant: agent-produced write proposals MUST stamp agent_definition_id into
      // metadata_json at preparation time (agentExecutionMetadata / triage baseMetadata)
      // for this guard to apply.
      const agentDefinitionId = definitionIdFromMetadata(approved.action.metadata_json);
      execution = await this.dispatcher.execute(context, {
        capabilityName: approved.action.capability_name,
        capabilityVersion: approved.action.capability_version,
        input: { action_request_id: approved.action.id },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: approved.action.run_id,
          stepIndex: 200,
          metadata: {
            uat_workflow: 'agent_control_center_approved_execution',
            source: 'admin_ui',
            action_request_id: approved.action.id,
            ...(agentDefinitionId ? { agent_definition_id: agentDefinitionId } : {}),
          },
        },
      });
    }

    const freshAction = await context.manager.getRepository(AiActionRequest).findOne({
      where: { id: actionRequestId, tenant_id: context.tenantId },
    });
    const detailRunId = freshAction?.run_id ?? approved.action.run_id;
    const responseAction = freshAction ?? approved.action;
    await this.agentQueue?.resolveWaitingApprovalForActionRequest(context, responseAction.id);
    const readiness = await this.executionReadinessForActions(context, [responseAction]);

    return {
      action: serializeActionRequest(responseAction, readiness.get(responseAction.id)),
      approval: serializeApproval(approved.approval),
      execution,
      detail: detailRunId ? await this.getRunDetail(context, detailRunId) : null,
    };
  }

  private async stampBulkApprovalContext(
    context: AiExecutionContextWithManager,
    actions: AiActionRequest[],
    options: AgentControlBulkApproveOptions = {},
  ): Promise<AiActionRequest[]> {
    const actionRequestIds = actions.map((action) => action.id);
    const batchId = hashStableJson({
      tenant_id: context.tenantId,
      action_request_ids: actionRequestIds,
    });
    const now = new Date();
    const repo = context.manager.getRepository(AiActionRequest);
    const stamped: AiActionRequest[] = [];
    for (const action of actions) {
      const existingMetadata = isRecord(action.metadata_json) ? action.metadata_json : {};
      const existingBatch = isRecord(existingMetadata.approved_batch_context)
        ? existingMetadata.approved_batch_context
        : {};
      action.metadata_json = {
        ...existingMetadata,
        approved_batch_context: {
          ...existingBatch,
          batch_id: batchId,
          action_request_ids: actionRequestIds,
          target_type: action.target_type ?? null,
          target_ref: action.target_ref ?? null,
          stamped_at: typeof existingBatch.stamped_at === 'string' ? existingBatch.stamped_at : now.toISOString(),
          ...(options.queueExecution
            ? {
              execution_queued: true,
              execution_queued_at: now.toISOString(),
            }
            : {}),
        },
      };
      action.updated_at = now;
      stamped.push(await repo.save(action));
    }
    return stamped;
  }

  private async bulkExecutionPhases(
    context: AiExecutionContextWithManager,
    actions: AiActionRequest[],
  ): Promise<Map<string, number>> {
    const byCapability = new Map<string, number>();
    const byAction = new Map<string, number>();
    for (const action of actions) {
      const key = capabilityPhaseKey(action);
      if (!byCapability.has(key)) {
        let phase = STATIC_CAPABILITY_EXECUTION_PHASES.get(key) ?? DEFAULT_BULK_EXECUTION_PHASE;
        if (this.capabilities) {
          try {
            const resolved = await this.capabilities.resolve(context, action.capability_name, action.capability_version);
            if (typeof resolved.contract.execution_phase === 'number' && Number.isFinite(resolved.contract.execution_phase)) {
              phase = resolved.contract.execution_phase;
            }
          } catch {
            // Unknown dynamic capabilities keep the default phase and then sort by created_at.
          }
        }
        byCapability.set(key, phase);
      }
      byAction.set(action.id, byCapability.get(key) ?? DEFAULT_BULK_EXECUTION_PHASE);
    }
    return byAction;
  }

  private bulkApproveReason(action: AiActionRequest, execution: unknown, fallback: string | null): string | null {
    if (action.error_message) {
      return action.error_message;
    }
    const output = isRecord(execution) ? execution.output : null;
    if (isRecord(output) && output.ok === false && typeof output.message === 'string') {
      return output.message;
    }
    return fallback;
  }

  // Resolve the validated, batch-stamped, ordered execution plan for an approved
  // bulk. Stamping (approved_batch_context) is committed here so each action can
  // later execute in its own transaction and still see its siblings' baselines.
  async planApprovedBulkExecution(
    context: AiExecutionContextWithManager,
    input: AgentControlBulkApproveInput,
  ): Promise<{ orderedIds: string[]; requested: number }> {
    const requestedIds = Array.from(new Set((input.action_request_ids ?? [])
      .map((id) => trimmedString(id))
      .filter((id): id is string => !!id)));
    if (requestedIds.length === 0) {
      throw new BadRequestException('At least one action request id is required.');
    }
    if (requestedIds.length > 20) {
      throw new BadRequestException('Bulk approval is limited to 20 action requests.');
    }

    const repo = context.manager.getRepository(AiActionRequest);
    const found = await repo.find({
      where: {
        id: In(requestedIds),
        tenant_id: context.tenantId,
      },
    });
    const byId = new Map(found.map((action) => [action.id, action]));
    const missingIds = requestedIds.filter((id) => !byId.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException('One or more action requests were not found.');
    }

    const first = found[0];
    const sameTarget = found.every((action) =>
      action.provider_kind === first.provider_kind
      && action.provider_key === first.provider_key
      && action.target_type === first.target_type
      && action.target_ref === first.target_ref);
    if (!sameTarget) {
      throw new BadRequestException('Bulk approval only supports actions for one target.');
    }

    const executionPhases = await this.bulkExecutionPhases(context, found);
    const runnable = found
      .filter((action) => ['approved', 'executed'].includes(action.status))
      .sort((left, right) => bulkApproveActionSort(left, right, executionPhases));
    if (runnable.length === 0) {
      return { orderedIds: [], requested: requestedIds.length };
    }

    const stamped = await this.stampBulkApprovalContext(context, runnable);
    const stampedById = new Map(stamped.map((action) => [action.id, action]));
    const ordered = runnable
      .map((action) => stampedById.get(action.id) ?? action)
      .sort((left, right) => bulkApproveActionSort(left, right, executionPhases));
    return { orderedIds: ordered.map((action) => action.id), requested: requestedIds.length };
  }

  // Execute a single approved action. Designed to run inside its OWN transaction
  // (one per action) so row locks on the ticket work item / target state release
  // between slow ticketing writes and never block the queue-overview reconciliation.
  private async actionExecutionResult(
    context: AiExecutionContextWithManager,
    action: AiActionRequest,
    execution: unknown,
    failure: string | null,
  ): Promise<{
    action_request_id: string;
    ok: boolean;
    status: string;
    reason: string | null;
    action: ReturnType<typeof serializeActionRequest>;
    execution: unknown;
  }> {
    await this.agentQueue?.resolveWaitingApprovalForActionRequest(context, action.id);
    const readiness = await this.executionReadinessForActions(context, [action]);
    const ok = action.status === 'executed';
    return {
      action_request_id: action.id,
      ok,
      status: action.status,
      reason: ok ? null : this.bulkApproveReason(action, execution, failure),
      action: serializeActionRequest(action, readiness.get(action.id)),
      execution,
    };
  }

  private async skippedActionExecutionResult(
    context: AiExecutionContextWithManager,
    action: AiActionRequest,
  ): Promise<{
    action_request_id: string;
    ok: boolean;
    status: string;
    reason: string | null;
    action: ReturnType<typeof serializeActionRequest>;
    execution: unknown;
  }> {
    await this.agentQueue?.resolveWaitingApprovalForActionRequest(context, action.id);
    const readiness = await this.executionReadinessForActions(context, [action]);
    const ok = action.status === 'executed';
    return {
      action_request_id: action.id,
      ok,
      status: action.status,
      reason: ok ? null : actionExecutionSkipReason(action),
      action: serializeActionRequest(action, readiness.get(action.id)),
      execution: null,
    };
  }

  private async claimApprovedActionForExecution(
    context: AiExecutionContextWithManager,
    action: AiActionRequest,
  ): Promise<{ action: AiActionRequest; claimId: string } | null> {
    if (action.status !== 'approved') {
      return null;
    }
    const repo = context.manager.getRepository(AiActionRequest);
    const now = new Date();
    const claimId = randomUUID();
    const result = await repo.update({
      id: action.id,
      tenant_id: context.tenantId,
      status: 'approved',
    }, {
      status: APPROVED_ACTION_EXECUTING_STATUS,
      error_message: null,
      metadata_json: withApprovedBatchContext(action.metadata_json, {
        execution_claim_id: claimId,
        execution_claimed_at: now.toISOString(),
      }),
      updated_at: now,
    });
    if ((result.affected ?? 0) !== 1) {
      return null;
    }
    const claimed = await repo.findOne({
      where: { id: action.id, tenant_id: context.tenantId },
    });
    if (!claimed || claimed.status !== APPROVED_ACTION_EXECUTING_STATUS) {
      return null;
    }
    return { action: claimed, claimId };
  }

  private async persistApprovedActionExecutionFailure(
    context: AiExecutionContextWithManager,
    actionRequestId: string,
    message: string,
  ): Promise<AiActionRequest | null> {
    const repo = context.manager.getRepository(AiActionRequest);
    const action = await repo.findOne({
      where: { id: actionRequestId, tenant_id: context.tenantId },
    });
    if (!action || ['executed', 'expired', 'rejected'].includes(action.status)) {
      return action;
    }
    const now = new Date();
    const errorMessage = message.slice(0, 4000);
    action.status = 'approved';
    action.error_message = errorMessage;
    action.metadata_json = withApprovedBatchContext(action.metadata_json, {
      execution_attempts: approvedBatchExecutionAttempts(action) + 1,
      last_attempt_at: now.toISOString(),
      last_execution_error: errorMessage,
      execution_claim_id: null,
      execution_claimed_at: null,
    });
    action.updated_at = now;
    return repo.save(action);
  }

  async executeSingleApprovedAction(
    context: AiExecutionContextWithManager,
    actionRequestId: string,
    options: { batchIds?: string[]; stepIndex?: number } = {},
  ): Promise<{
    action_request_id: string;
    ok: boolean;
    status: string;
    reason: string | null;
    action: ReturnType<typeof serializeActionRequest>;
    execution: unknown;
  }> {
    const repo = context.manager.getRepository(AiActionRequest);
    const action = await repo.findOne({
      where: { id: actionRequestId, tenant_id: context.tenantId },
    });
    if (!action) {
      throw new NotFoundException('Action request not found.');
    }
    if (action.status !== 'approved') {
      return this.skippedActionExecutionResult(context, action);
    }

    const claimed = await this.claimApprovedActionForExecution(context, action);
    if (!claimed) {
      const fresh = await repo.findOne({
        where: { id: action.id, tenant_id: context.tenantId },
      });
      return this.skippedActionExecutionResult(context, fresh ?? action);
    }

    let execution: unknown = null;
    let failure: string | null = null;
    try {
      await this.assertActionSafeForUiExecution(context, claimed.action);
      const agentDefinitionId = definitionIdFromMetadata(claimed.action.metadata_json);
      const batchIds = options.batchIds && options.batchIds.length > 0 ? options.batchIds : [claimed.action.id];
      execution = await this.dispatcher.execute(context, {
        capabilityName: claimed.action.capability_name,
        capabilityVersion: claimed.action.capability_version,
        input: { action_request_id: claimed.action.id },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: claimed.action.run_id,
          stepIndex: 200 + (options.stepIndex ?? 0),
          metadata: {
            uat_workflow: 'agent_control_center_bulk_async_execution',
            source: 'admin_ui',
            action_request_id: claimed.action.id,
            bulk_action_request_ids: batchIds,
            action_execution_claim_id: claimed.claimId,
            ...(agentDefinitionId ? { agent_definition_id: agentDefinitionId } : {}),
          },
        },
      });
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }

    const freshAction = await repo.findOne({
      where: { id: claimed.action.id, tenant_id: context.tenantId },
    });
    let responseAction = freshAction ?? claimed.action;
    if (!failure && ['failed', APPROVED_ACTION_EXECUTING_STATUS].includes(responseAction.status)) {
      failure = this.bulkApproveReason(responseAction, execution, null)
        ?? 'Action execution did not complete successfully.';
    }
    if (failure) {
      responseAction = await this.persistApprovedActionExecutionFailure(context, claimed.action.id, failure)
        ?? responseAction;
    }
    return this.actionExecutionResult(context, responseAction, execution, failure);
  }

  async executeApprovedActionRequestsBulk(
    context: AiExecutionContextWithManager,
    input: AgentControlBulkApproveInput,
  ) {
    const { orderedIds, requested } = await this.planApprovedBulkExecution(context, input);
    const results: Array<{
      action_request_id: string;
      ok: boolean;
      status: string;
      reason: string | null;
      action: ReturnType<typeof serializeActionRequest>;
      execution: unknown;
    }> = [];

    for (let index = 0; index < orderedIds.length; index += 1) {
      results.push(await this.executeSingleApprovedAction(context, orderedIds[index], {
        batchIds: orderedIds,
        stepIndex: index,
      }));
    }

    const executed = results.filter((result) => result.ok).length;
    return {
      results,
      approvals: [],
      execution_mode: 'background',
      summary: {
        requested,
        processed: results.length,
        approved: results.filter((result) => result.status === 'approved' || result.status === 'executed').length,
        queued: 0,
        executed,
        needs_review: results.length === 0 ? requested : results.length - executed,
      },
    };
  }

  async approveActionRequestsBulk(
    context: AiExecutionContextWithManager,
    input: AgentControlBulkApproveInput,
    options: AgentControlBulkApproveOptions = {},
  ) {
    const requestedIds = Array.from(new Set((input.action_request_ids ?? [])
      .map((id) => trimmedString(id))
      .filter((id): id is string => !!id)));
    if (requestedIds.length === 0) {
      throw new BadRequestException('At least one action request id is required.');
    }
    if (requestedIds.length > 20) {
      throw new BadRequestException('Bulk approval is limited to 20 action requests.');
    }

    const repo = context.manager.getRepository(AiActionRequest);
    const found = await repo.find({
      where: {
        id: In(requestedIds),
        tenant_id: context.tenantId,
      },
    });
    const byId = new Map(found.map((action) => [action.id, action]));
    const missingIds = requestedIds.filter((id) => !byId.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException('One or more action requests were not found.');
    }

    const first = found[0];
    const sameTarget = found.every((action) =>
      action.provider_kind === first.provider_kind
      && action.provider_key === first.provider_key
      && action.target_type === first.target_type
      && action.target_ref === first.target_ref);
    if (!sameTarget) {
      throw new BadRequestException('Bulk approval only supports actions for one target.');
    }

    const executionPhases = await this.bulkExecutionPhases(context, found);
    const runnable = found
      .filter((action) => ['pending', 'approved', 'executed'].includes(action.status))
      .sort((left, right) => bulkApproveActionSort(left, right, executionPhases));
    if (runnable.length === 0) {
      throw new BadRequestException('No executable action requests were provided.');
    }

    const stamped = await this.stampBulkApprovalContext(context, runnable, options);
    const stampedById = new Map(stamped.map((action) => [action.id, action]));
    const ordered = runnable
      .map((action) => stampedById.get(action.id) ?? action)
      .sort((left, right) => bulkApproveActionSort(left, right, executionPhases));
    const results: Array<{
      action_request_id: string;
      ok: boolean;
      status: string;
      reason: string | null;
      action: ReturnType<typeof serializeActionRequest>;
      execution: unknown;
    }> = [];
    const approvals: Array<ReturnType<typeof serializeApproval>> = [];

    for (const action of ordered) {
      let execution: unknown = null;
      let failure: string | null = null;
      let responseAction = action;
      try {
        await this.assertActionSafeForUiExecution(context, action);
        let approvedAction = action;
        if (action.status !== 'executed') {
          const approved = await this.approvals.approveActionRequest(context, action.id, {
            source: 'human_ui',
            reason: approvalDecisionReason(input.reason, 'Approved from Agent Control Center bulk approval.'),
            actorLabel: null,
          });
          approvals.push(serializeApproval(approved.approval));
          approvedAction = approved.action;
        }

        if (input.execute !== false && approvedAction.status !== 'executed') {
          const agentDefinitionId = definitionIdFromMetadata(approvedAction.metadata_json);
          execution = await this.dispatcher.execute(context, {
            capabilityName: approvedAction.capability_name,
            capabilityVersion: approvedAction.capability_version,
            input: { action_request_id: approvedAction.id },
            execution: {
              surface: 'internal',
              trigger_kind: 'internal',
              runId: approvedAction.run_id,
              stepIndex: 200 + results.length,
              metadata: {
                uat_workflow: 'agent_control_center_bulk_approved_execution',
                source: 'admin_ui',
                action_request_id: approvedAction.id,
                bulk_action_request_ids: ordered.map((candidate) => candidate.id),
                ...(agentDefinitionId ? { agent_definition_id: agentDefinitionId } : {}),
              },
            },
          });
        }
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
      }

      const freshAction = await repo.findOne({
        where: { id: action.id, tenant_id: context.tenantId },
      });
      responseAction = freshAction ?? responseAction;
      await this.agentQueue?.resolveWaitingApprovalForActionRequest(context, responseAction.id);
      const readiness = await this.executionReadinessForActions(context, [responseAction]);
      const ok = input.execute === false
        ? responseAction.status === 'approved' || responseAction.status === 'executed'
        : responseAction.status === 'executed';
      results.push({
        action_request_id: responseAction.id,
        ok,
        status: responseAction.status,
        reason: ok ? null : this.bulkApproveReason(responseAction, execution, failure),
        action: serializeActionRequest(responseAction, readiness.get(responseAction.id)),
        execution,
      });
    }

    const approved = results.filter((result) => result.status === 'approved' || result.status === 'executed').length;
    const queued = options.queueExecution
      ? results.filter((result) => result.status === 'approved').length
      : 0;
    const executed = results.filter((result) => result.status === 'executed' && result.ok).length;
    const successful = results.filter((result) => result.ok).length;
    const needsReview = results.length - successful;
    return {
      results,
      approvals,
      execution_mode: options.queueExecution ? 'queued' : input.execute === false ? 'approve_only' : 'synchronous',
      summary: {
        requested: requestedIds.length,
        processed: results.length,
        approved,
        queued,
        executed,
        needs_review: needsReview,
      },
    };
  }

  async rejectActionRequest(
    context: AiExecutionContextWithManager,
    actionRequestId: string,
    reason?: string | null,
  ) {
    const rejected = await this.approvals.rejectActionRequest(
      context,
      actionRequestId,
      approvalDecisionReason(reason, 'Rejected from Agent Control Center.'),
    );
    const freshAction = await context.manager.getRepository(AiActionRequest).findOne({
      where: { id: actionRequestId, tenant_id: context.tenantId },
    });
    const detailRunId = freshAction?.run_id ?? rejected.action.run_id;
    const responseAction = freshAction ?? rejected.action;
    await this.agentQueue?.resolveWaitingApprovalForActionRequest(context, responseAction.id);
    const readiness = await this.executionReadinessForActions(context, [responseAction]);

    return {
      action: serializeActionRequest(responseAction, readiness.get(responseAction.id)),
      approval: serializeApproval(rejected.approval),
      detail: detailRunId ? await this.getRunDetail(context, detailRunId) : null,
    };
  }
}
