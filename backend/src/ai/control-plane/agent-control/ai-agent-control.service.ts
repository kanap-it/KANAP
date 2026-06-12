import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, In } from 'typeorm';
import { AiExecutionContextWithManager } from '../../ai.types';
import { AgentQueueLiveTargetLike, AiAgentWorkQueueService, estimateAgentRunUsage } from '../agent/ai-agent-work-queue.service';
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
  TICKETING_TICKET_NOTES_LIST_CAPABILITY,
} from '../capability/capability-contract';
import { AiCapabilityDispatcherService } from '../dispatcher/ai-capability-dispatcher.service';
import { AiReadonlyDiagnosticWorkflowService } from '../diagnostics/ai-readonly-diagnostic-workflow.service';
import { AiActionRequest } from '../entities/ai-action-request.entity';
import { hashStableJson } from '../evidence/ai-evidence.service';
import { AiAgentAuditEvent } from '../entities/ai-agent-audit-event.entity';
import { AiAgentDefinition } from '../entities/ai-agent-definition.entity';
import { AiAgentTargetState } from '../entities/ai-agent-target-state.entity';
import { AiAgentWorkItem } from '../entities/ai-agent-work-item.entity';
import { AiApproval } from '../entities/ai-approval.entity';
import { AiDecision } from '../entities/ai-decision.entity';
import { AiEvaluation } from '../entities/ai-evaluation.entity';
import { AiEvidence } from '../entities/ai-evidence.entity';
import { AiLiveTestTarget } from '../entities/ai-live-test-target.entity';
import { AiObservation } from '../entities/ai-observation.entity';
import { AiRecommendation } from '../entities/ai-recommendation.entity';
import { AiRun } from '../entities/ai-run.entity';
import { AiToolExecution } from '../entities/ai-tool-execution.entity';
import { AiLiveTestTargetService } from '../live-readiness/ai-live-test-target.service';
import { AiProviderRegistryService } from '../providers/provider-registry.service';
import {
  AiKnowledgeSearchPlannerService,
  KnowledgePlannerCandidate,
  KnowledgeResultInterpretation,
  KnowledgeSearchPlan,
} from './ai-knowledge-search-planner.service';

export type AgentControlListRunsOptions = {
  limit?: number;
  status?: string | null;
};

export type AgentControlListActionsOptions = {
  limit?: number;
  status?: string | null;
};

export type AgentControlMockTriageInput = {
  alert_id?: string | null;
  ticket_id?: string | null;
  provider_key?: string | null;
  include_directory?: boolean | null;
  user_id_or_email?: string | null;
  note_body?: string | null;
};

export type AgentControlGlpiReadInput = {
  target_key?: string | null;
};

export type AgentControlGlpiTriageInput = {
  target_key?: string | null;
  work_item_id?: string | null;
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
};

type TicketTimelineEntry = {
  id: string;
  kind: 'description' | 'followup';
  visibility: 'public' | 'internal';
  actor: 'requester_candidate' | 'kanap_agent' | 'support_or_unknown';
  actorSource: 'glpi_requester_user' | 'glpi_support_user' | 'kanap_marker' | 'public_non_kanap_followup' | 'initial_ticket';
  actorId: string | null;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
  updateFingerprint: string | null;
};

type ConversationActionGate = {
  can_prepare_internal_note: boolean;
  can_prepare_public_reply: boolean;
  internal_note_reason: string;
  public_reply_reason: string;
  latest_requester_message_at: string | null;
  latest_requester_message_id: string | null;
  last_agent_internal_note_at: string | null;
  last_agent_internal_note_action_id: string | null;
  last_agent_public_reply_at: string | null;
  last_agent_public_reply_action_id: string | null;
  requester_classification_confidence: 'glpi_requester_user' | 'initial_ticket' | 'public_non_kanap_followup' | 'none';
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
};

type KnowledgeSearchAttempt = {
  query: string;
  result: CapabilityExecutionResult<Record<string, unknown>>;
  items: KnowledgeSearchItem[];
};

type MergedKnowledgeCandidate = KnowledgeSearchItem & {
  search_queries: string[];
};

type KnowledgeDocumentFetchAttempt = {
  document_id: string;
  result?: CapabilityExecutionResult<Record<string, unknown>>;
  item?: KnowledgeSearchItem | null;
  error_message?: string | null;
};

const MAX_KNOWLEDGE_QUERY_CANDIDATES = 10;
const MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY = 1;
const MAX_PUBLIC_REPLY_CHARS = 12000;
const HELPDESK_REVIEW_ACTION_CAPABILITIES = [
  TICKETING_INTERNAL_NOTE_ADD_APPROVED_CAPABILITY,
  TICKETING_PUBLIC_REPLY_ADD_APPROVED_CAPABILITY,
  TICKETING_CLASSIFICATION_UPDATE_APPROVED_CAPABILITY,
  TICKETING_STATUS_UPDATE_APPROVED_CAPABILITY,
  TICKETING_ASSIGNMENT_UPDATE_APPROVED_CAPABILITY,
  TICKETING_PARTICIPANT_UPDATE_APPROVED_CAPABILITY,
];
const SUPPRESS_UNCHANGED_PROPOSAL_STATUSES = new Set(['pending', 'approved', 'rejected', 'expired', 'executed']);

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

function extractKnowledgeTokens(value: string): string[] {
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
      if (tokens.length >= 8) {
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
    ...buildSemanticKnowledgeFallbacks(sourceText),
    tokens.slice(0, 4).join(' '),
    tokens.slice(0, 6).join(' '),
    ticket.title,
    fullQuery,
  ]);
}

function stripKnowledgeAccents(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function buildSemanticKnowledgeFallbacks(value: string): string[] {
  const normalized = stripKnowledgeAccents(normalizeKnowledgeText(value)).toLocaleLowerCase();
  const candidates: string[] = [];
  const asksRecipe = /\brecette\b/.test(normalized);
  const asksSweet = /\b(sucre|sucree|sucr|sweet)\b/.test(normalized);
  const asksDessert = /\b(dessert|gateau|cake|cheesecake)\b/.test(normalized);

  if (asksRecipe && asksSweet) {
    candidates.push('recette sucrée', 'recette sucre', 'recette dessert', 'dessert sucré', 'sucre', 'dessert');
  } else if (asksSweet) {
    candidates.push('sucre', 'dessert sucré', 'dessert');
  }
  if (asksRecipe && asksDessert) {
    candidates.push('recette dessert', 'recette gâteau', 'dessert');
  }
  if (asksRecipe) {
    candidates.push('recette');
  }
  return candidates.flatMap((candidate) => {
    const stripped = stripKnowledgeAccents(candidate);
    return stripped === candidate ? [candidate] : [candidate, stripped];
  });
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
  const normalized = stripKnowledgeAccents(latest).toLocaleLowerCase();
  const positiveTerms: string[] = [];
  const negativeTerms: string[] = [];

  if (/\b(sucre|sucree|sucr|sweet)\b/.test(normalized)) {
    positiveTerms.push('sucré', 'sucre', 'dessert', 'gâteau');
  }
  if (/\b(dessert|gateau|cake|cheesecake)\b/.test(normalized)) {
    positiveTerms.push('dessert', 'gâteau', 'cake');
  }

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
    intent: latestRequesterBody(timeline) ?? ticket.title,
    language: ticketLooksFrench(ticket) ? 'fr' : null,
    positive_terms: preferences.positiveTerms,
    negative_terms: preferences.negativeTerms,
    queries,
    rationale: 'Deterministic fallback extracted requester keywords and semantic search fallbacks.',
    confidence: null,
    model: null,
    warnings: [],
  };
}

function knowledgeItemsFromOutput(value: unknown): KnowledgeSearchItem[] {
  const record = isRecord(value) ? value : null;
  const items = Array.isArray(record?.items) ? record.items : [];
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
    }));
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
  };
}

function knowledgeDocumentRef(item: KnowledgeSearchItem): string | null {
  return trimmedString(item.ref) ?? trimmedString(item.id);
}

function knowledgeCandidateKey(item: KnowledgeSearchItem): string | null {
  const ref = knowledgeDocumentRef(item);
  return ref ? ref.toLocaleLowerCase() : null;
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
      } else {
        byKey.set(key, {
          ...item,
          search_queries: [attempt.query],
        });
      }
    }
  }
  return Array.from(byKey.values());
}

function plannerCandidatesFromKnowledge(candidates: MergedKnowledgeCandidate[]): KnowledgePlannerCandidate[] {
  return candidates.map((candidate) => ({
    ref: knowledgeDocumentRef(candidate),
    title: candidate.title ?? null,
    summary: candidate.summary ?? null,
    snippet: candidate.snippet ?? null,
    status: candidate.status ?? null,
    search_queries: candidate.search_queries,
  }));
}

function applyKnowledgeInterpretation(
  candidates: MergedKnowledgeCandidate[],
  interpretation: KnowledgeResultInterpretation,
): KnowledgeSearchItem[] {
  if (candidates.length === 0) {
    return [];
  }
  const selected = new Set(interpretation.selected_refs.map((ref) => ref.toLocaleLowerCase()));
  const rejected = new Set(interpretation.rejected.map((entry) => entry.ref.toLocaleLowerCase()));
  if (selected.size > 0) {
    const selectedItems = candidates.filter((candidate) => {
      const ref = knowledgeDocumentRef(candidate);
      return !!ref && selected.has(ref.toLocaleLowerCase());
    });
    if (selectedItems.length > 0) {
      return selectedItems;
    }
  }
  if (interpretation.needs_human_review) {
    return [];
  }
  return candidates.filter((candidate) => {
    const ref = knowledgeDocumentRef(candidate);
    return !ref || !rejected.has(ref.toLocaleLowerCase());
  });
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
    needs_human_review: selectedRefs.length === 0,
    confidence: selectedRefs.length > 0 ? 0.58 : 0.34,
    rationale: selectedRefs.length > 0
      ? 'Deterministic ranking selected candidates that matched positive search terms and avoided explicit negative terms.'
      : 'No deterministic candidate satisfied the requester constraints.',
    model: null,
    warnings: [],
  };
}

function serializeKnowledgeSearchPlan(plan: KnowledgeSearchPlan): Record<string, unknown> {
  return {
    source: plan.source,
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

function serializeKnowledgeInterpretation(interpretation: KnowledgeResultInterpretation): Record<string, unknown> {
  return {
    source: interpretation.source,
    selected_refs: interpretation.selected_refs,
    rejected: interpretation.rejected,
    needs_human_review: interpretation.needs_human_review,
    confidence: interpretation.confidence,
    rationale: interpretation.rationale,
    model: interpretation.model,
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
        ? 'glpi_requester_user'
        : note.visibility === 'internal' || note.authorRole === 'support'
          ? 'glpi_support_user'
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
    internal_note_reason: internalDecision.reason,
    public_reply_reason: publicDecision.reason,
    latest_requester_message_at: isoFromTime(latestRequester?.time ?? null),
    latest_requester_message_id: latestRequester?.entry.id ?? null,
    last_agent_internal_note_at: isoFromTime(actionConversationTimeOrNull(lastInternal, notes)),
    last_agent_internal_note_action_id: lastInternal?.id ?? null,
    last_agent_public_reply_at: isoFromTime(actionConversationTimeOrNull(lastPublic, notes)),
    last_agent_public_reply_action_id: lastPublic?.id ?? null,
    requester_classification_confidence: latestRequester
      ? latestRequester.entry.actorSource === 'glpi_requester_user' ? 'glpi_requester_user' : 'public_non_kanap_followup'
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
    return ['- No GLPI ticket history entries were available.'];
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

function buildTriageNote(ticket: TicketLike, knowledgeItems: KnowledgeSearchItem[], timeline: TicketTimelineEntry[]): string {
  const knowledgeLines = knowledgeItems.length > 0
    ? knowledgeItems.map((item, index) => {
      const ref = item.ref ?? item.id ?? `document-${index + 1}`;
      const title = item.title ?? 'Untitled document';
      const context = stripHeadlineTags(item.summary ?? item.snippet ?? '');
      return `- ${ref} - ${title}${context ? `: ${context}` : ''}`;
    })
    : ['- No matching KANAP knowledge document was found.'];

  return [
    '[KANAP triage proposal]',
    `Ticket: GLPI #${ticket.id} - ${ticket.title}`,
    ticket.status ? `Status: ${ticket.status}` : null,
    ticket.priority ? `Priority: ${ticket.priority}` : null,
    '',
    'Ticket history considered:',
    ...timelineSummaryLines(timeline),
    '',
    'Relevant KANAP knowledge:',
    ...knowledgeLines,
    '',
    'Suggested internal note:',
    knowledgeItems.length > 0
      ? 'I found potentially relevant KANAP knowledge articles for this request. Please review the references above before responding to the requester.'
      : 'I did not find a matching KANAP knowledge article for this request. Please review manually before responding to the requester.',
    '',
    'No external change has been made. This note was prepared by KANAP and requires human approval before posting.',
  ].filter((line): line is string => line !== null).join('\n').slice(0, 3900);
}

function ticketLooksFrench(ticket: TicketLike): boolean {
  const text = `${ticket.title} ${ticket.description ?? ''}`.toLocaleLowerCase();
  return /[àâçéèêëîïôùûüÿœæ]/i.test(text)
    || /\b(bonjour|besoin|merci|recette|vous|pouvez|aider|demande|incident)\b/.test(text);
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

function knowledgeAnswerDetails(item: KnowledgeSearchItem): string {
  return normalizeKnowledgeReplyText(item.content_markdown)
    || normalizeKnowledgeReplyText(item.summary)
    || normalizeKnowledgeReplyText(item.snippet);
}

function knowledgeLooksLikeComputingHelp(ticket: TicketLike, details: string): boolean {
  const text = `${ticket.title} ${ticket.description ?? ''} ${details}`.toLocaleLowerCase();
  return /\b(cpu|serveur|server|windows|linux|macos|ordinateur|computer|vpn|wifi|wi-fi|reseau|réseau|mail|email|imprimante|printer|application|logiciel|software|login|password|mot de passe|erreur|error|incident|alerte|alert|monitoring|prtg|glpi|driver|update|installation|install)\b/.test(text);
}

function buildRequesterReplyFromDetails(input: {
  isFrench: boolean;
  sourceLabel: string;
  details: string;
  includeComputingAdvice: boolean;
  latestRequesterExcerpt?: string | null;
}): string {
  const introLines = input.isFrench
    ? [
      'Bonjour,',
      '',
      'Nous avons trouvé une fiche de connaissance interne qui correspond à votre demande. Comme cette base n\'est pas directement accessible aux utilisateurs, voici les informations utiles complètes :',
    ]
    : [
      'Hello,',
      '',
      'We found an internal knowledge article that matches your request. Since that knowledge base is not directly available to users, here are the full useful details:',
    ];
  const sourceLine = input.isFrench
    ? `Source utilisée par le support : ${input.sourceLabel}.`
    : `Support source used: ${input.sourceLabel}.`;
  const requesterLine = input.latestRequesterExcerpt
    ? input.isFrench
      ? `Dernier message demandeur pris en compte : ${input.latestRequesterExcerpt}.`
      : `Latest requester update considered: ${input.latestRequesterExcerpt}.`
    : null;
  const closingLines = input.isFrench
    ? [
      input.includeComputingAdvice
        ? 'Si vous rencontrez une erreur pendant ces étapes, ajoutez le message exact, l\'heure du test et ce que vous avez déjà essayé dans le ticket afin que nous puissions reprendre rapidement.'
        : 'Si certains éléments ne correspondent pas à votre situation, indiquez-nous où cela bloque afin que nous puissions reprendre rapidement.',
      '',
      'Si cela ne répond pas complètement à votre besoin, un technicien du support reprendra le ticket et complétera la réponse.',
      '',
      'Cordialement,',
      'L\'équipe support',
    ]
    : [
      input.includeComputingAdvice
        ? 'If you hit an error while following these steps, please add the exact message, the test time, and what you already tried to the ticket so we can continue quickly.'
        : 'If some details do not match your situation, please tell us where you are blocked so we can continue quickly.',
      '',
      'If this does not fully answer your request, a helpdesk technician will continue the review and complete the response.',
      '',
      'Best regards,',
      'The support team',
    ];
  const intro = [...introLines, '', sourceLine, requesterLine].filter((line): line is string => line !== null).join('\n');
  const closing = closingLines.join('\n');
  const truncationNotice = input.isFrench
    ? '[La fiche interne est plus longue que la limite de réponse GLPI ; le début utile a été inclus et un technicien complétera si nécessaire.]'
    : '[The internal article is longer than the GLPI reply limit; the useful beginning is included and a technician will complete it if needed.]';
  const detailsBudget = Math.max(500, MAX_PUBLIC_REPLY_CHARS - intro.length - closing.length - truncationNotice.length - 8);
  const details = input.details.length > detailsBudget
    ? `${input.details.slice(0, detailsBudget).trimEnd()}\n\n${truncationNotice}`
    : input.details;
  return [intro, details, closing].join('\n\n').slice(0, MAX_PUBLIC_REPLY_CHARS);
}

function latestRequesterExcerpt(timeline: TicketTimelineEntry[]): string | null {
  const entry = [...timeline].reverse().find((candidate) => candidate.actor === 'requester_candidate');
  return entry ? clampText(entry.body, 260) : null;
}

function buildRequesterReply(ticket: TicketLike, knowledgeItems: KnowledgeSearchItem[], timeline: TicketTimelineEntry[] = []): string {
  const isFrench = ticketLooksFrench(ticket);
  const latestRequester = latestRequesterExcerpt(timeline);
  const bestKnowledge = knowledgeItems[0] ?? null;
  const details = bestKnowledge ? knowledgeAnswerDetails(bestKnowledge) : '';
  if (!bestKnowledge || !details) {
    return (isFrench
      ? [
        'Bonjour,',
        '',
        'Nous n\'avons pas trouvé suffisamment d\'éléments fiables pour vous proposer une réponse automatique utile et complète sur cette demande.',
        latestRequester ? `Dernier message demandeur pris en compte : ${latestRequester}.` : null,
        '',
        'Un technicien du support va reprendre votre ticket prochainement et reviendra vers vous.',
        '',
        'Cordialement,',
        'L\'équipe support',
      ].filter((line): line is string => line !== null)
      : [
        'Hello,',
        '',
        'We could not find enough reliable information to propose a useful and complete automated answer for this request.',
        latestRequester ? `Latest requester update considered: ${latestRequester}.` : null,
        '',
        'A helpdesk technician will review your ticket shortly and get back to you.',
        '',
        'Best regards,',
        'The support team',
      ].filter((line): line is string => line !== null)).join('\n');
  }

  const ref = bestKnowledge.ref ?? bestKnowledge.id ?? 'the related knowledge article';
  const title = bestKnowledge.title ?? (isFrench ? 'article de connaissance pertinent' : 'relevant knowledge article');
  const sourceLabel = `${ref} - ${title}`;
  return buildRequesterReplyFromDetails({
    isFrench,
    sourceLabel,
    details,
    includeComputingAdvice: knowledgeLooksLikeComputingHelp(ticket, details),
    latestRequesterExcerpt: latestRequester,
  });
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
    reason: `Normalize GLPI ticket ${ticket.id} classification fields that are missing or not mapped before helpdesk processing.`,
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

function actionMetadataString(action: AiActionRequest, field: string): string | null {
  const metadata = isRecord(action.metadata_json) ? action.metadata_json : null;
  const value = metadata?.[field];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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
    trigger_policy_json: definition.trigger_policy_json,
    scope_policy_json: definition.scope_policy_json,
    queue_policy_json: definition.queue_policy_json,
    response_policy_json: definition.response_policy_json,
    evaluation_policy_json: definition.evaluation_policy_json,
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
    last_run_id: state.last_run_id,
    last_public_reply_hash: state.last_public_reply_hash,
    last_internal_note_hash: state.last_internal_note_hash,
    last_classification_hash: state.last_classification_hash,
    last_assignment_hash: state.last_assignment_hash,
    agent_touched: state.agent_touched,
    needs_followup: state.needs_followup,
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
  constructor(
    private readonly diagnostics: AiReadonlyDiagnosticWorkflowService,
    private readonly approvals: AiApprovalService,
  private readonly dispatcher: AiCapabilityDispatcherService,
  private readonly liveTargets: AiLiveTestTargetService,
  private readonly providers: AiProviderRegistryService,
  private readonly agentQueue?: AiAgentWorkQueueService,
  private readonly knowledgePlanner?: AiKnowledgeSearchPlannerService,
  ) {}

  private async evidenceIdsForTool(context: AiExecutionContextWithManager, toolExecutionId: string): Promise<string[]> {
    const rows = await context.manager.getRepository(AiEvidence).find({
      where: {
        tenant_id: context.tenantId,
        tool_execution_id: toolExecutionId,
      },
    });
    return rows.map((row) => row.id);
  }

  private async recordAndEnforceHelpdeskRunCap(
    context: AiExecutionContextWithManager,
    input: {
      definition: AiAgentDefinition | null;
      runId: string;
      stage: string;
      snapshot: unknown;
    },
  ): Promise<{ estimatedTokens: number; estimatedCostEur: number }> {
    if (!this.agentQueue || !input.definition) {
      return estimateAgentRunUsage(input.snapshot);
    }
    const guardrails = this.agentQueue.runGuardrails(input.definition);
    const usage = estimateAgentRunUsage(input.snapshot);
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
          error: 'Helpdesk GLPI triage exceeded the configured per-run economic cap.',
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
        message: 'Helpdesk GLPI triage run failed because the per-run economic cap was exceeded.',
        metadata: {
          run_id: input.runId,
          stage: input.stage,
          usage,
          cap: guardrails,
        },
      });
      throw new ForbiddenException('Helpdesk GLPI triage exceeded the configured per-run economic cap.');
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
      targetRef: string;
      proposalHash: string;
      contextHash: string;
    },
  ): Promise<string | null> {
    const actions = await context.manager.getRepository(AiActionRequest).find({
      where: {
        tenant_id: context.tenantId,
        provider_kind: 'ticketing',
        provider_key: 'glpi',
        target_type: 'ticket',
        target_ref: input.targetRef,
        capability_name: input.capabilityName,
      },
      order: { created_at: 'DESC' },
    });
    const matching = actions.find((action) =>
      SUPPRESS_UNCHANGED_PROPOSAL_STATUSES.has(action.status)
      && actionMetadataString(action, 'proposal_hash') === input.proposalHash
      && actionMetadataString(action, 'proposal_context_hash') === input.contextHash,
    );
    if (!matching) {
      return null;
    }
    return `unchanged_${matching.status}_proposal:${matching.id}`;
  }

  private async recoverPreparedGlpiActionIds(
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
            evaluation_type: 'glpi_triage_proposal',
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

  // Helpdesk GLPI writes are gated by durable human approval plus the
  // stale-state recheck at execution time. The earlier UAT-only requirement
  // for a sandbox_write safe target per ticket was removed on 2026-06-12:
  // proposals are reviewed one by one, so the per-ticket allowlist added
  // friction without adding safety.
  private async assertActionSafeForUiExecution(
    context: AiExecutionContextWithManager,
    action: AiActionRequest,
  ): Promise<void> {
    if (
      action.provider_kind !== 'ticketing'
      || action.provider_key !== 'glpi'
      || !HELPDESK_REVIEW_ACTION_CAPABILITIES.includes(action.capability_name)
    ) {
      return;
    }
    const targetRef = trimmedString(action.target_ref);
    if (!targetRef) {
      throw new ForbiddenException('GLPI action has no ticket target.');
    }
  }

  private async executionReadinessForActions(
    context: AiExecutionContextWithManager,
    actions: AiActionRequest[],
  ): Promise<Map<string, ActionExecutionReadiness>> {
    void context;
    const now = Date.now();
    const result = new Map<string, ActionExecutionReadiness>();
    for (const action of actions) {
      const isHelpdeskGlpiWrite = action.provider_kind === 'ticketing'
        && action.provider_key === 'glpi'
        && HELPDESK_REVIEW_ACTION_CAPABILITIES.includes(action.capability_name);
      const targetRef = trimmedString(action.target_ref);
      const expiresAt = action.expires_at instanceof Date
        ? action.expires_at.getTime()
        : Date.parse(String(action.expires_at ?? ''));
      const expired = Number.isFinite(expiresAt) && expiresAt <= now;
      const activeDecisionStatus = action.status === 'pending' || action.status === 'approved';
      let blockedReason: string | null = null;
      if (!activeDecisionStatus) {
        blockedReason = `Action is ${action.status}.`;
      } else if (expired) {
        blockedReason = 'Action request is expired.';
      } else if (isHelpdeskGlpiWrite && !targetRef) {
        blockedReason = 'GLPI action has no ticket target.';
      }

      result.set(action.id, {
        can_execute: blockedReason === null,
        can_reject: activeDecisionStatus && !expired,
        blocked_reason: blockedReason,
        requires_sandbox_write_target: false,
        sandbox_write_target_ref: null,
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
      toolExecutions,
      evidence,
      observations,
      recommendations,
      decisions,
      evaluations,
      actionRequests,
    ] = await Promise.all([
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

  async getQueueOverview(context: AiExecutionContextWithManager, options: { limit?: number } = {}) {
    if (!this.agentQueue) {
      return {
        definitions: [],
        work_items: [],
        target_states: [],
        action_requests: [],
        counts: {},
        helpdesk: { summary: null, audit_events: [] },
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
    return {
      definitions: overview.definitions.map(serializeAgentDefinition),
      work_items: overview.workItems.map(serializeAgentWorkItem),
      target_states: overview.targetStates.map(serializeAgentTargetState),
      action_requests: actionRequests.map((action) => serializeActionRequest(action, readiness.get(action.id))),
      counts: overview.counts,
      helpdesk: {
        summary: overview.helpdesk.summary,
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
      || workItem.source_provider_key !== 'glpi'
      || workItem.source_object_type !== 'ticket'
    ) {
      throw new BadRequestException('Helpdesk context is only available for GLPI ticket work items.');
    }

    const definition = await context.manager.getRepository(AiAgentDefinition).findOne({
      where: {
        id: workItem.agent_definition_id,
        tenant_id: context.tenantId,
      },
    });
    if (!definition || definition.agent_key !== 'helpdesk.glpi.triage') {
      throw new BadRequestException('Helpdesk context is only available for the Helpdesk GLPI triage agent.');
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
    const [targets, applicability] = await Promise.all([
      this.liveTargets.findEnabledTargets(context, {
        providerKind: 'ticketing',
        providerKey: 'glpi',
        allowedEffect: 'read',
        targetKind: 'ticket',
      }),
      this.providers.getApplicability(context, 'ticketing', 'glpi'),
    ]);

    return {
      provider: {
        provider_kind: 'ticketing',
        provider_key: 'glpi',
        available: applicability.available,
        reason_code: applicability.reasonCode ?? null,
        message: applicability.message ?? null,
      },
      items: targets.map(serializeLiveTarget),
      ready: applicability.available && targets.length === 1,
    };
  }

  async runGlpiRead(context: AiExecutionContextWithManager, input: AgentControlGlpiReadInput = {}) {
    const target = await this.liveTargets.requireSingleEnabledTarget(context, {
      providerKind: 'ticketing',
      providerKey: 'glpi',
      allowedEffect: 'read',
      targetKind: 'ticket',
      targetKey: trimmedString(input.target_key),
    });

    const applicability = await this.providers.getApplicability(context, 'ticketing', 'glpi');
    if (!applicability.available) {
      throw new ForbiddenException(`GLPI provider is unavailable: ${applicability.message ?? applicability.reasonCode ?? 'not ready'}.`);
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
          uat_workflow: 'agent_control_center_glpi_read',
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

  async runGlpiTriage(context: AiExecutionContextWithManager, input: AgentControlGlpiTriageInput = {}) {
    const workItemId = trimmedString(input.work_item_id);
    let target: AiLiveTestTarget | AgentQueueLiveTargetLike;
    let agentDefinition: AiAgentDefinition | null = null;
    let leasedWorkItem: AiAgentWorkItem | null = null;
    let workItemCreated = false;
    let agentMetadata: Record<string, unknown> = {};
    if (workItemId) {
      if (!this.agentQueue) {
        throw new ForbiddenException('Agent work queue is required to run queued GLPI triage.');
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
        || queuedWorkItem.source_provider_key !== 'glpi'
        || queuedWorkItem.source_object_type !== 'ticket'
      ) {
        throw new BadRequestException('Queued GLPI triage work item must target a GLPI ticket.');
      }
      agentDefinition = await context.manager.getRepository(AiAgentDefinition).findOne({
        where: {
          id: queuedWorkItem.agent_definition_id,
          tenant_id: context.tenantId,
        },
      });
      if (!agentDefinition) {
        throw new ForbiddenException('Queued GLPI triage work item has no tenant-scoped agent definition.');
      }
      this.agentQueue.assertHelpdeskGlpiDefinitionRunnable(agentDefinition, null);
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
      target = await this.liveTargets.requireSingleEnabledTarget(context, {
        providerKind: 'ticketing',
        providerKey: 'glpi',
        allowedEffect: 'read',
        targetKind: 'ticket',
        targetKey: trimmedString(input.target_key),
      });
    }

    if (!workItemId && this.agentQueue) {
      const enqueued = await this.agentQueue.enqueueManualGlpiSafeTarget(context, serializeLiveTarget(target), {
        source_endpoint: 'uat/glpi-triage',
      });
      agentDefinition = enqueued.definition;
      workItemCreated = enqueued.created;
      leasedWorkItem = await this.agentQueue.acquireWorkItem(context, enqueued.workItem.id, {
        leaseOwner: `agent-control-center:${context.userId || 'system'}`,
      });
      agentMetadata = this.agentQueue.agentExecutionMetadata(agentDefinition, leasedWorkItem);
    }

    const baseMetadata = {
      uat_workflow: 'agent_control_center_glpi_triage',
      source: 'admin_ui',
      live_target_id: target.id,
      live_target_key: target.target_key,
      live_target_environment: target.environment,
      safety_label: target.safety_label,
      work_item_created: workItemCreated,
      ...agentMetadata,
    };
    try {
      const applicability = await this.providers.getApplicability(context, 'ticketing', 'glpi');
      if (!applicability.available) {
        throw new ForbiddenException(`GLPI provider is unavailable: ${applicability.message ?? applicability.reasonCode ?? 'not ready'}.`);
      }

      let stepIndex = 1;
      const allEvidenceIds: string[] = [];

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
      throw new BadRequestException(adapterFailureMessage(ticketResult.output) ?? 'GLPI ticket read did not return ticket data.');
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
      throw new BadRequestException(adapterFailureMessage(ticketNotesResult.output) ?? 'GLPI ticket history read did not return note data.');
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
        provider_kind: 'ticketing',
        provider_key: 'glpi',
        target_type: 'ticket',
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

    const deterministicKnowledgeQueries = buildKnowledgeQueryCandidates(ticketForKnowledge);
    const plannedKnowledgeSearch = this.knowledgePlanner
      ? await this.knowledgePlanner.planKnowledgeSearch(context, {
        ticket,
        timeline: ticketTimeline,
      })
      : buildFallbackKnowledgeSearchPlan(ticket, ticketTimeline, deterministicKnowledgeQueries);
    const knowledgeSearchPlan: KnowledgeSearchPlan = {
      ...plannedKnowledgeSearch,
      queries: uniqueKnowledgeCandidates([
        ...plannedKnowledgeSearch.queries,
        ...deterministicKnowledgeQueries,
      ]),
    };
    const knowledgeQueryCandidates = knowledgeSearchPlan.queries;
    const knowledgeAttempts: KnowledgeSearchAttempt[] = [];
    for (const [candidateIndex, knowledgeQuery] of knowledgeQueryCandidates.entries()) {
      const result = await this.dispatcher.execute<Record<string, unknown>>(context, {
        capabilityName: 'search_knowledge',
        input: {
          query: knowledgeQuery,
          limit: 5,
          offset: 0,
        },
        execution: {
          surface: 'internal',
          trigger_kind: 'internal',
          runId: ticketResult.run_id,
          stepIndex: stepIndex++,
          metadata: {
            ...baseMetadata,
            knowledge_query_source: 'glpi_ticket',
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
    const mergedKnowledgeCandidates = mergeKnowledgeAttempts(knowledgeAttempts);
    const knowledgeInterpretation = this.knowledgePlanner
      ? await this.knowledgePlanner.interpretKnowledgeResults(context, {
        plan: knowledgeSearchPlan,
        ticket,
        timeline: ticketTimeline,
        candidates: plannerCandidatesFromKnowledge(mergedKnowledgeCandidates),
      })
      : buildFallbackKnowledgeInterpretation(knowledgeSearchPlan, mergedKnowledgeCandidates);
    const selectedKnowledgeItems = applyKnowledgeInterpretation(mergedKnowledgeCandidates, knowledgeInterpretation);
    const selectedKnowledgeRefs = new Set(
      selectedKnowledgeItems.map((item) => knowledgeDocumentRef(item)?.toLocaleLowerCase()).filter((ref): ref is string => !!ref),
    );
    const selectedKnowledgeAttempt = knowledgeAttempts.find((attempt) =>
      attempt.items.some((item) => {
        const ref = knowledgeDocumentRef(item);
        return !!ref && selectedKnowledgeRefs.has(ref.toLocaleLowerCase());
      }),
    ) ?? knowledgeAttempts.find((attempt) => attempt.items.length > 0)
      ?? knowledgeAttempts[knowledgeAttempts.length - 1];
    if (!selectedKnowledgeAttempt) {
      throw new BadRequestException('Knowledge search did not execute.');
    }
    const knowledgeResult = selectedKnowledgeAttempt.result;
    const knowledgeItems = selectedKnowledgeItems;
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
              knowledge_document_source: 'glpi_ticket',
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

    const runUsageEstimate = await this.recordAndEnforceHelpdeskRunCap(context, {
      definition: agentDefinition,
      runId: ticketResult.run_id,
      stage: 'before_proposal_preparation',
      snapshot: {
        ticket,
        ticket_history_entry_count: ticketTimeline.length,
        ticket_notes: ticketNotesData.notes,
        classification_context: classificationContext,
        lifecycle_context: lifecycleContext,
        routing_context: routingContext,
        participant_context: participantContext,
        knowledge_query_candidates: knowledgeQueryCandidates,
        knowledge_candidate_count: mergedKnowledgeCandidates.length,
        knowledge_results: knowledgeItems,
        knowledge_documents: enrichedKnowledgeItems.slice(0, MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY),
      },
    });

    const now = new Date();
    const observationRepo = context.manager.getRepository(AiObservation);
    const observation = await observationRepo.save(observationRepo.create({
      tenant_id: context.tenantId,
      run_id: ticketResult.run_id,
      observation_type: 'glpi_ticket_triage',
      status: 'observed',
      source_provider: 'ticketing:glpi',
      source_object_type: 'ticket',
      source_object_id: ticket.id,
      severity: ticket.priority ?? null,
      summary: `GLPI ticket ${ticket.id}: ${ticket.title}. ${knowledgeItems.length} knowledge result(s) found.`,
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
        run_usage_estimate: runUsageEstimate,
        knowledge_result_count: knowledgeItems.length,
        knowledge_candidate_count: mergedKnowledgeCandidates.length,
        knowledge_query: selectedKnowledgeAttempt.query,
        knowledge_query_attempt_count: knowledgeAttempts.length,
        knowledge_document_fetch_count: knowledgeDocumentAttempts.filter((attempt) => !!attempt.result).length,
        knowledge_search_plan: serializeKnowledgeSearchPlan(knowledgeSearchPlan),
        knowledge_result_interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
      },
      observed_at: now,
      created_at: now,
      updated_at: now,
    }));

    const expectedActionLabels = [
      conversationGate.can_prepare_internal_note ? 'internal note' : null,
      conversationGate.can_prepare_public_reply ? 'requester reply' : null,
    ].filter((label): label is string => !!label);
    const anyActionEligible = expectedActionLabels.length > 0;
    const recommendationRepo = context.manager.getRepository(AiRecommendation);
    const recommendation = await recommendationRepo.save(recommendationRepo.create({
      tenant_id: context.tenantId,
      run_id: ticketResult.run_id,
      observation_id: observation.id,
      recommendation_type: 'glpi_internal_note',
      status: anyActionEligible ? 'proposed' : 'skipped',
      summary: anyActionEligible
        ? `Prepare ${expectedActionLabels.join(' and ')} with the related KANAP knowledge and ticket history context.`
        : 'Do not prepare a GLPI follow-up yet; no newer requester message was found after the last KANAP action.',
      rationale: anyActionEligible
        ? 'The workflow read the GLPI ticket history, searched the KANAP knowledge base, and prepared only conversation-eligible human-approved follow-up proposals.'
        : 'The workflow read the GLPI ticket history and found that KANAP has already acted since the latest requester message.',
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
        run_usage_estimate: runUsageEstimate,
        ticket_history: ticketTimeline.map((entry) => ({
          id: entry.id,
          visibility: entry.visibility,
          actor: entry.actor,
          created_at: entry.createdAt,
          body_preview: clampText(entry.body, 220),
        })),
        knowledge_query: selectedKnowledgeAttempt.query,
        knowledge_search_plan: serializeKnowledgeSearchPlan(knowledgeSearchPlan),
        knowledge_query_attempts: knowledgeAttempts.map((attempt) => ({
          query: attempt.query,
          result_count: attempt.items.length,
          tool_execution_id: attempt.result.tool_execution_id,
        })),
        knowledge_candidates: mergedKnowledgeCandidates.map((item) => ({
          ref: item.ref ?? item.id ?? null,
          title: item.title ?? null,
          search_queries: item.search_queries,
        })),
        knowledge_result_interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
        knowledge_document_fetches: knowledgeDocumentAttempts.map((attempt) => ({
          document_id: attempt.document_id,
          tool_execution_id: attempt.result?.tool_execution_id ?? null,
          status: attempt.result ? 'completed' : 'failed',
          error_message: attempt.error_message ?? null,
        })),
        knowledge_results: knowledgeItems.map((item) => ({
          ref: item.ref ?? item.id ?? null,
          title: item.title ?? null,
        })),
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
        : 'Skipped GLPI follow-up preparation until a newer requester message appears.',
      evidence_ids: allEvidenceIds,
      policy_result_json: {
        autonomy_level: 'A2',
        approval_required: anyActionEligible,
      },
      metadata_json: {
        ...agentMetadata,
        provider_key: target.provider_key,
        target_key: target.target_key,
        conversation_gate: conversationGate,
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
      outcome: anyActionEligible ? null : 'no_action_waiting_for_requester_update',
      scores_json: null,
      feedback_json: null,
      metadata_json: {
        ...agentMetadata,
        evaluation_type: 'glpi_triage_uat',
      },
      created_at: now,
      updated_at: now,
    }));

    const noteBody = buildTriageNote(ticket, knowledgeItems, ticketTimeline);
    const proposal = conversationGate.can_prepare_internal_note
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
            ...baseMetadata,
            triage_action: 'prepare_internal_note',
            conversation_gate: conversationGate,
          },
        },
      })
      : null;
    const requesterReplyBody = buildRequesterReply(ticket, enrichedKnowledgeItems, ticketTimeline);
    const publicReplyProposal = conversationGate.can_prepare_public_reply
      ? await this.dispatcher.execute(context, {
        capabilityName: TICKETING_PUBLIC_REPLY_PREPARE_CAPABILITY,
        input: {
          provider_key: target.provider_key,
          ticket_id: ticket.id,
          reply_body: requesterReplyBody,
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
            triage_action: 'prepare_public_reply',
            conversation_gate: conversationGate,
          },
        },
      })
      : null;
    const classificationUpdateInput = buildClassificationUpdateProposal(ticket, classificationContext);
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
        targetRef: ticket.id,
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
    const statusUpdateInput = buildStatusUpdateProposal(lifecycleContext, conversationGate.can_prepare_public_reply);
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
        targetRef: ticket.id,
        proposalHash: statusProposalHash,
        contextHash: statusContextHash,
      })
      : null;
    const statusUpdateProposal = statusUpdateInput && !statusSuppressionReason
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
    const assignmentUpdateInput = buildAssignmentUpdateProposal(routingContext);
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

    const directPreparedActionIds = Array.from(new Set([
      ...(proposal ? actionRequestIdsFromCapabilityOutput(proposal.output) : []),
      ...(publicReplyProposal ? actionRequestIdsFromCapabilityOutput(publicReplyProposal.output) : []),
      ...(classificationUpdateProposal ? actionRequestIdsFromCapabilityOutput(classificationUpdateProposal.output) : []),
      ...(statusUpdateProposal ? actionRequestIdsFromCapabilityOutput(statusUpdateProposal.output) : []),
      ...(assignmentUpdateProposal ? actionRequestIdsFromCapabilityOutput(assignmentUpdateProposal.output) : []),
    ]));
    const expectedPreparedActionCount = [
      conversationGate.can_prepare_internal_note,
      conversationGate.can_prepare_public_reply,
      !!classificationUpdateProposal && adapterData(classificationUpdateProposal.output) != null,
      !!statusUpdateProposal && adapterData(statusUpdateProposal.output) != null,
      !!assignmentUpdateProposal && adapterData(assignmentUpdateProposal.output) != null,
    ].filter(Boolean).length;
    const recoveredPreparedActionIds = directPreparedActionIds.length >= expectedPreparedActionCount
      ? []
      : await this.recoverPreparedGlpiActionIds(context, {
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
      throw new BadRequestException('GLPI triage prepared a proposal but did not create a durable action request for review.');
    }
    durablePreparedActions = await this.ensureProposalEvaluations(context, {
      runId: ticketResult.run_id,
      recommendationId: recommendation.id,
      decisionId: decision.id,
      actions: durablePreparedActions,
      agentMetadata,
    });
    const durablePreparedActionIds = durablePreparedActions.map((action) => action.id);
    let finalWorkItem: AiAgentWorkItem | null = leasedWorkItem;
    let targetState: AiAgentTargetState | null = null;
    if (this.agentQueue && agentDefinition && leasedWorkItem) {
      const outcome = await this.agentQueue.recordManualGlpiTriageOutcome(context, {
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
          knowledge_query: selectedKnowledgeAttempt.query,
          knowledge_search_plan: serializeKnowledgeSearchPlan(knowledgeSearchPlan),
          knowledge_query_attempts: knowledgeAttempts.map((attempt) => ({
            query: attempt.query,
            result_count: attempt.items.length,
            tool_execution_id: attempt.result.tool_execution_id,
          })),
          knowledge_candidate_count: mergedKnowledgeCandidates.length,
          knowledge_result_interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
          knowledge_candidates: mergedKnowledgeCandidates.map((item) => ({
            ref: item.ref ?? item.id ?? null,
            title: item.title ?? null,
            search_queries: item.search_queries,
          })),
          conversation_gate: conversationGate,
          classification_context: classificationContext,
          lifecycle_context: lifecycleContext,
          routing_context: routingContext,
          participant_context: participantContext,
          run_usage_estimate: runUsageEstimate,
          ticket_history_entry_count: ticketTimeline.length,
          phase11_proposals: {
            classification: classificationUpdateInput ? {
              ...classificationUpdateInput,
              proposal_hash: classificationProposalHash,
              proposal_context_hash: classificationContextHash,
              suppression_reason: classificationSuppressionReason,
            } : null,
            status: statusUpdateInput ? {
              ...statusUpdateInput,
              proposal_hash: statusProposalHash,
              proposal_context_hash: statusContextHash,
              suppression_reason: statusSuppressionReason,
            } : null,
            assignment: assignmentUpdateInput,
          },
          skipped_actions: {
            internal_note: conversationGate.can_prepare_internal_note ? null : conversationGate.internal_note_reason,
            public_reply: conversationGate.can_prepare_public_reply ? null : conversationGate.public_reply_reason,
            classification: classificationSuppressionReason ?? (classificationUpdateInput ? null : 'no_safe_classification_change'),
            status: statusSuppressionReason ?? (statusUpdateInput ? null : 'no_safe_status_transition'),
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
        knowledge_tool_execution_id: knowledgeResult.tool_execution_id,
        knowledge_tool_execution_ids: knowledgeAttempts.map((attempt) => attempt.result.tool_execution_id),
        knowledge_document_tool_execution_ids: knowledgeDocumentAttempts
          .map((attempt) => attempt.result?.tool_execution_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
        knowledge_query: selectedKnowledgeAttempt.query,
        knowledge_query_candidates: knowledgeQueryCandidates,
        knowledge_search_plan: serializeKnowledgeSearchPlan(knowledgeSearchPlan),
        knowledge_query_attempts: knowledgeAttempts.map((attempt) => ({
          query: attempt.query,
          result_count: attempt.items.length,
          tool_execution_id: attempt.result.tool_execution_id,
        })),
        knowledge_candidates: mergedKnowledgeCandidates.map((item) => ({
          ref: item.ref ?? item.id ?? null,
          title: item.title ?? null,
          search_queries: item.search_queries,
        })),
        knowledge_result_interpretation: serializeKnowledgeInterpretation(knowledgeInterpretation),
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
        skipped_actions: {
          internal_note: conversationGate.can_prepare_internal_note ? null : conversationGate.internal_note_reason,
          public_reply: conversationGate.can_prepare_public_reply ? null : conversationGate.public_reply_reason,
          classification: classificationSuppressionReason ?? (classificationUpdateInput ? null : 'no_safe_classification_change'),
          status: statusSuppressionReason ?? (statusUpdateInput ? null : 'no_safe_status_transition'),
          assignment: assignmentUpdateInput ? null : 'no_supported_assignment_target',
          participants: 'provider_participant_update_not_prepared',
        },
        ticket_history_entry_count: ticketTimeline.length,
        knowledge_results: knowledgeItems,
        knowledge_documents: enrichedKnowledgeItems.slice(0, MAX_KNOWLEDGE_DOCUMENTS_FOR_REPLY).map((item) => ({
          ref: item.ref ?? item.id ?? null,
          title: item.title ?? null,
          content_length: item.content_markdown?.length ?? 0,
        })),
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
    options: { execute?: boolean | null } = {},
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
      reason: 'Approved from Agent Control Center.',
      actorLabel: null,
    });

    let execution: unknown = null;
    if (options.execute !== false) {
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
          },
        },
      });
    }

    const freshAction = await context.manager.getRepository(AiActionRequest).findOne({
      where: { id: actionRequestId, tenant_id: context.tenantId },
    });
    const detailRunId = freshAction?.run_id ?? approved.action.run_id;
    const responseAction = freshAction ?? approved.action;
    const readiness = await this.executionReadinessForActions(context, [responseAction]);

    return {
      action: serializeActionRequest(responseAction, readiness.get(responseAction.id)),
      approval: serializeApproval(approved.approval),
      execution,
      detail: detailRunId ? await this.getRunDetail(context, detailRunId) : null,
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
      trimmedString(reason) ?? 'Rejected from Agent Control Center.',
    );
    const freshAction = await context.manager.getRepository(AiActionRequest).findOne({
      where: { id: actionRequestId, tenant_id: context.tenantId },
    });
    const detailRunId = freshAction?.run_id ?? rejected.action.run_id;
    const responseAction = freshAction ?? rejected.action;
    const readiness = await this.executionReadinessForActions(context, [responseAction]);

    return {
      action: serializeActionRequest(responseAction, readiness.get(responseAction.id)),
      approval: serializeApproval(rejected.approval),
      detail: detailRunId ? await this.getRunDetail(context, detailRunId) : null,
    };
  }
}
