import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { AiSettingsService } from '../../ai-settings.service';
import { GlpiService } from '../../glpi/glpi.service';
import { GlpiTicket, GlpiTicketFollowup, GlpiTicketUserAssociation } from '../../glpi/glpi.types';
import {
  AdapterErrorCode,
  AdapterEvidenceSeed,
  AdapterResult,
  ProviderContext,
  SimilarTicket,
  TicketClassificationContext,
  TicketAssignmentUpdateActionPayload,
  TicketClassificationUpdateActionPayload,
  TicketClassificationUpdateProposal,
  TicketInternalNoteActionPayload,
  TicketInternalNotePrepared,
  TicketInternalNoteWriteResult,
  TicketLifecycleContext,
  TicketParticipantContext,
  TicketParticipantUpdateActionPayload,
  TicketParticipantUpdateOperation,
  TicketProviderActionPrepared,
  TicketProviderActionWriteResult,
  TicketPublicReplyActionPayload,
  TicketPublicReplyPrepared,
  TicketPublicReplyWriteResult,
  TicketRoutingContext,
  TicketRoutingTarget,
  TicketStatusUpdateActionPayload,
  TicketingProvider,
  TicketNote,
  TicketRecord,
  TicketListScope,
} from './provider.types';

const MAX_INTERNAL_NOTE_CHARS = 4000;
const MAX_PUBLIC_REPLY_CHARS = 12000;

function nowIso(): string {
  return new Date().toISOString();
}

function stripHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
  return text || null;
}

function normalizeTicketId(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function noteBodyIsUnsafe(value: string): boolean {
  return /<[^>]+>/.test(value) || /javascript:/i.test(value);
}

function stableTextHash(value: string): string {
  return createHash('sha256').update(value.replace(/\r\n/g, '\n').trim()).digest('hex');
}

function glpiStatusLabel(value: string | null): string {
  return value ?? 'unknown';
}

function glpiPriorityLabel(value: number | null): string | null {
  if (value == null) return null;
  return String(value);
}

function glpiStatusContextLabel(value: string | null): string | null {
  switch (String(value ?? '').trim()) {
    case '1':
      return 'New';
    case '2':
      return 'Processing assigned';
    case '3':
      return 'Processing planned';
    case '4':
      return 'Pending';
    case '5':
      return 'Solved';
    case '6':
      return 'Closed';
    default:
      return value;
  }
}

function glpiPriorityContextLabel(value: number | null): string | null {
  switch (value) {
    case 1:
      return 'Very low';
    case 2:
      return 'Low';
    case 3:
      return 'Medium';
    case 4:
      return 'High';
    case 5:
      return 'Very high';
    case 6:
      return 'Major';
    default:
      return value == null ? null : String(value);
  }
}

function glpiTypeContextLabel(value: number | null): string | null {
  switch (value) {
    case 1:
      return 'Incident';
    case 2:
      return 'Request';
    default:
      return value == null ? null : String(value);
  }
}

function glpiTypeKey(value: number | null): string | null {
  switch (value) {
    case 1:
      return 'incident';
    case 2:
      return 'request';
    default:
      return null;
  }
}

function glpiPriorityKey(value: number | null): string | null {
  switch (value) {
    case 1:
      return 'very_low';
    case 2:
      return 'low';
    case 3:
      return 'medium';
    case 4:
      return 'high';
    case 5:
      return 'very_high';
    case 6:
      return 'major';
    default:
      return null;
  }
}

function glpiStatusKey(value: string | null): string | null {
  switch (String(value ?? '').trim()) {
    case '1':
      return 'new';
    case '2':
      return 'processing_assigned';
    case '3':
      return 'processing_planned';
    case '4':
      return 'pending';
    case '5':
      return 'solved';
    case '6':
      return 'closed';
    default:
      return null;
  }
}

function glpiStatusCodeForTransition(value: string): number | null {
  switch (value.trim()) {
    case 'processing_assigned':
      return 2;
    case 'processing_planned':
      return 3;
    case 'pending':
      return 4;
    case 'solved':
      return 5;
    case 'closed':
      return 6;
    default:
      return null;
  }
}

// Terminal transitions (solve/close) are destructive cleanup actions: always
// human-approved (never auto-executed — see executeAutomaticPreparedActions
// terminal backstop) and surfaced distinctly in approvals/audit.
function glpiTransitionIsTerminal(value: string): boolean {
  const key = value.trim();
  return key === 'solved' || key === 'closed';
}

function glpiStatusTransitionLabel(value: string): string {
  switch (value) {
    case 'processing_assigned':
      return 'Processing assigned';
    case 'processing_planned':
      return 'Processing planned';
    case 'pending':
      return 'Pending';
    case 'solved':
      return 'Solved';
    case 'closed':
      return 'Closed';
    default:
      return value;
  }
}

function glpiSafeStatusTransitions(currentStatus: string | null): Array<{
  key: string;
  label: string;
  requiresApproval: true;
  destructive: boolean;
}> {
  const current = glpiStatusKey(currentStatus);
  // Already-terminal tickets are left alone.
  if (current === 'solved' || current === 'closed') {
    return [];
  }
  const transition = (key: string, destructive: boolean) => ({
    key,
    label: glpiStatusTransitionLabel(key),
    requiresApproval: true as const,
    destructive,
  });
  // Non-terminal moves are safe; solve/close are destructive terminal cleanup
  // actions, offered for proposal but always human-approved.
  return [
    ...['processing_assigned', 'processing_planned', 'pending']
      .filter((key) => key !== current)
      .map((key) => transition(key, false)),
    transition('solved', true),
    transition('closed', true),
  ];
}

function glpiTypeCode(value: string | null | undefined): number | null {
  switch (String(value ?? '').trim().toLowerCase()) {
    case 'incident':
      return 1;
    case 'request':
      return 2;
    default:
      return null;
  }
}

function glpiPriorityCode(value: string | null | undefined): number | null {
  switch (String(value ?? '').trim().toLowerCase()) {
    case 'very_low':
      return 1;
    case 'low':
      return 2;
    case 'medium':
      return 3;
    case 'high':
      return 4;
    case 'very_high':
      return 5;
    case 'major':
      return 6;
    default:
      return null;
  }
}

function normalizeReason(value: string): string | null {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim();
  return normalized.length > 0 && normalized.length <= 1000 && !noteBodyIsUnsafe(normalized) ? normalized : null;
}

function numericDropdownValue(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function evidenceSeed(
  sourceType: string,
  sourceId: string,
  summary: string,
  redactedPayload: unknown,
  sourceUri?: string | null,
): AdapterEvidenceSeed {
  return {
    sourceProvider: 'ticketing:glpi',
    sourceType,
    sourceId,
    sourceUri: sourceUri ?? null,
    collectedAt: nowIso(),
    trustLevel: 'customer_system',
    summary,
    redactedPayload,
    rawPayloadRetention: 'redacted',
  };
}

function ok<T>(data: T, evidence: AdapterEvidenceSeed[], warnings?: string[]): AdapterResult<T> {
  return {
    ok: true,
    data,
    evidence,
    providerRequestId: `glpi-${Date.now()}`,
    warnings,
  };
}

function providerError<T>(
  errorCode: AdapterErrorCode,
  message: string,
  retryable = false,
): AdapterResult<T> {
  return {
    ok: false,
    errorCode,
    message,
    retryable,
    providerRequestId: `glpi-error-${Date.now()}`,
  };
}

function mapError<T>(error: unknown): AdapterResult<T> {
  const message = error instanceof Error ? error.message : String(error || 'GLPI provider request failed.');
  const normalized = message.toLowerCase();
  if (normalized.includes('not found')) {
    return providerError<T>('not_found', message, false);
  }
  if (normalized.includes('token') || normalized.includes('unauthorized') || normalized.includes('login')) {
    return providerError<T>('unauthorized', message, false);
  }
  if (normalized.includes('forbidden')) {
    return providerError<T>('forbidden', message, false);
  }
  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return providerError<T>('timeout', message, true);
  }
  if (normalized.includes('non-json') || normalized.includes('malformed') || normalized.includes('html instead')) {
    return providerError<T>('invalid_response', message, false);
  }
  return providerError<T>('provider_unavailable', message, true);
}

function toTicketRecord(ticket: GlpiTicket): TicketRecord {
  // No nowIso() fallback: an undated ticket must fail the ingestion horizon
  // check (parseDateMs('') -> null -> out of scope) instead of appearing new.
  const createdAt = ticket.date ?? ticket.updated_date ?? '';
  const updatedAt = ticket.updated_date ?? ticket.date ?? '';
  return {
    id: String(ticket.id),
    title: ticket.name ?? `GLPI ticket #${ticket.id}`,
    status: glpiStatusLabel(ticket.status),
    priority: glpiPriorityLabel(ticket.priority),
    requester: null,
    description: stripHtml(ticket.content_html),
    createdAt,
    updatedAt,
    tags: ['glpi'],
    scope: {
      entityId: ticket.entity_id == null ? null : String(ticket.entity_id),
      categoryId: ticket.category_id == null ? null : String(ticket.category_id),
    },
  };
}

function glpiNoteAuthorRole(
  note: GlpiTicketFollowup,
  requesterUserIds: Set<number>,
): TicketNote['authorRole'] {
  if (note.author_id != null && requesterUserIds.has(note.author_id)) {
    return 'requester';
  }
  if (note.is_private) {
    return 'support';
  }
  const label = String(note.author_label ?? '').toLowerCase();
  if (label.includes('kanap')) {
    return 'kanap_agent';
  }
  return 'unknown';
}

function toTicketNote(note: GlpiTicketFollowup, requesterUserIds: Set<number>): TicketNote {
  const body = stripHtml(note.content_html) ?? '';
  const updatedAt = note.updated_date ?? note.date ?? nowIso();
  return {
    id: String(note.id),
    visibility: note.is_private ? 'internal' : 'public',
    authorId: note.author_id == null ? null : String(note.author_id),
    author: note.author_label,
    authorRole: glpiNoteAuthorRole(note, requesterUserIds),
    body,
    createdAt: note.date ?? nowIso(),
    updatedAt,
    updateFingerprint: [
      'glpi-followup',
      note.id,
      note.is_private ? 'internal' : 'public',
      note.author_id ?? 'unknown',
      note.date ?? 'unknown-created',
      updatedAt,
      stableTextHash(body),
    ].join(':'),
  };
}

function associationLabel(value: GlpiTicketUserAssociation): string {
  return value.user_label ?? `GLPI user ${value.user_id}`;
}

@Injectable()
export class GlpiTicketingProvider implements TicketingProvider {
  readonly kind = 'ticketing' as const;
  readonly providerKey = 'glpi';

  constructor(
    private readonly settings: AiSettingsService,
    private readonly glpi: GlpiService,
  ) {}

  async health(context: ProviderContext) {
    const applicability = await this.applicability(context);
    return {
      ok: applicability.available,
      providerKind: this.kind,
      providerKey: this.providerKey,
      implementation: 'glpi',
      environment: 'sandbox',
      checkedAt: nowIso(),
      errorCode: applicability.available ? undefined : 'not_configured' as const,
      message: applicability.message,
      retryable: false,
    };
  }

  async applicability(context: ProviderContext) {
    const settings = await this.settings.get(context.tenantId, { manager: context.manager });
    if (!settings.glpi_enabled) {
      return {
        available: false,
        reasonCode: 'provider_disabled' as const,
        message: 'Tenant GLPI integration is disabled.',
      };
    }
    if (!settings.glpi_url) {
      return {
        available: false,
        reasonCode: 'provider_not_configured' as const,
        message: 'Tenant GLPI URL is not configured.',
      };
    }
    if (!settings.glpi_user_token_encrypted) {
      return {
        available: false,
        reasonCode: 'missing_credentials' as const,
        message: 'Tenant GLPI user token is not configured.',
      };
    }
    return { available: true };
  }

  private async withSession<T>(
    context: ProviderContext,
    fn: (session: Awaited<ReturnType<GlpiService['initSession']>>) => Promise<AdapterResult<T>>,
  ): Promise<AdapterResult<T>> {
    let session: Awaited<ReturnType<GlpiService['initSession']>> | null = null;
    try {
      session = await this.glpi.initSession(context.tenantId, context.manager);
      return await fn(session);
    } catch (error) {
      return mapError<T>(error);
    } finally {
      if (session) {
        await this.glpi.killSession(session);
      }
    }
  }

  async getTicket(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<TicketRecord>> {
    const ticketId = normalizeTicketId(input.ticketId);
    if (!ticketId) {
      return providerError<TicketRecord>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    return this.withSession(context, async (session) => {
      const ticket = await this.glpi.getTicket(session, ticketId);
      const data = toTicketRecord(ticket);
      return ok(data, [
        evidenceSeed('ticket', data.id, `GLPI ticket ${data.id}: ${data.title}`, {
          id: data.id,
          title: data.title,
          status: data.status,
          priority: data.priority,
          description: data.description,
        }, ticket.glpi_url),
      ]);
    });
  }

  async searchSimilarTickets(
    context: ProviderContext,
    input: { query: string; ticketId?: string | null; limit?: number | null },
  ): Promise<AdapterResult<{ tickets: SimilarTicket[] }>> {
    const ticketId = input.ticketId ? normalizeTicketId(input.ticketId) : null;
    if (!ticketId) {
      return ok({ tickets: [] }, [
        evidenceSeed('ticket_search', 'glpi-query', 'GLPI similar-ticket search is not available without a ticket id.', {
          query: input.query,
          tickets: [],
        }),
      ], ['glpi_search_requires_ticket_id']);
    }
    return this.withSession(context, async (session) => {
      const followups = await this.glpi.getTicketFollowups(session, ticketId);
      const tickets: SimilarTicket[] = followups.slice(0, Math.max(1, Math.min(input.limit ?? 3, 10))).map((followup, index) => ({
        id: String(ticketId),
        title: stripHtml(followup.content_html)?.slice(0, 120) || `GLPI ticket #${ticketId} follow-up ${followup.id}`,
        status: followup.is_private ? 'internal_note' : 'public_note',
        similarity: Math.max(0.2, 0.6 - index * 0.05),
        resolutionSummary: stripHtml(followup.content_html)?.slice(0, 500) ?? null,
      }));
      return ok({ tickets }, [
        evidenceSeed('ticket_search', String(ticketId), `GLPI ticket ${ticketId} follow-up context.`, {
          ticketId,
          resultCount: tickets.length,
          tickets,
        }),
      ], ['glpi_followup_context_used_for_similarity']);
    });
  }

  async listTicketNotes(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<{ notes: TicketNote[] }>> {
    const ticketId = normalizeTicketId(input.ticketId);
    if (!ticketId) {
      return providerError<{ notes: TicketNote[] }>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    return this.withSession(context, async (session) => {
      const [followups, users] = await Promise.all([
        this.glpi.getTicketFollowups(session, ticketId),
        this.glpi.getTicketUsers(session, ticketId),
      ]);
      const requesterUserIds = new Set(
        users
          .filter((user) => user.role === 'requester')
          .map((user) => user.user_id),
      );
      const notes = followups.map((note) => toTicketNote(note, requesterUserIds));
      return ok({ notes }, [
        evidenceSeed('ticket_notes', String(ticketId), `GLPI ticket ${ticketId} notes.`, {
          ticketId,
          noteCount: notes.length,
          requesterUserCount: requesterUserIds.size,
          notes: notes.map((note) => ({
            id: note.id,
            visibility: note.visibility,
            authorId: note.authorId,
            author: note.author,
            authorRole: note.authorRole,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            updateFingerprint: note.updateFingerprint,
            bodyPreview: note.body.slice(0, 240),
          })),
        }),
      ], requesterUserIds.size > 0 ? undefined : ['glpi_requester_user_not_available_for_note_classification']);
    });
  }

  async listTicketsForScope(
    context: ProviderContext,
    input: { scope: TicketListScope },
  ): Promise<AdapterResult<{ tickets: TicketRecord[] }>> {
    const scope = input.scope;
    const entityId = scope.entityId == null ? null : normalizeTicketId(scope.entityId);
    const categoryId = scope.categoryId == null ? null : normalizeTicketId(scope.categoryId);
    if (scope.mode === 'new_tickets_only') {
      if (!scope.createdAfter || !Number.isFinite(Date.parse(scope.createdAfter))) {
        return providerError<{ tickets: TicketRecord[] }>('unsafe_operation', 'GLPI new-ticket listing requires a valid created-after horizon.', false);
      }
      return this.withSession(context, async (session) => {
        const tickets = await this.glpi.searchTicketsForScope(session, {
          mode: 'new_tickets_only',
          createdAfter: scope.createdAfter,
          maxResults: scope.maxResults,
          entityId,
          categoryId,
        });
        const data = { tickets: tickets.map(toTicketRecord) };
        return ok(data, [
          evidenceSeed('ticket_scope_list', `${scope.mode}:${scope.createdAfter}`, `GLPI listed ${data.tickets.length} ticket(s) for bounded Helpdesk scope.`, {
            mode: scope.mode,
            createdAfter: scope.createdAfter,
            maxResults: scope.maxResults,
            entityId: scope.entityId ?? null,
            categoryId: scope.categoryId ?? null,
            ticketIds: data.tickets.map((ticket) => ticket.id),
          }),
        ]);
      });
    }
    if (scope.mode === 'all_open') {
      return this.withSession(context, async (session) => {
        const tickets = await this.glpi.searchTicketsForScope(session, {
          mode: 'all_open',
          maxResults: scope.maxResults,
          entityId,
          categoryId,
          lastChangedBefore: scope.lastChangedBefore ?? null,
          lastChangedAfter: scope.lastChangedAfter ?? null,
        });
        const data = { tickets: tickets.map(toTicketRecord) };
        return ok(data, [
          evidenceSeed('ticket_scope_list', `${scope.mode}:${scope.lastChangedBefore ?? 'any'}`, `GLPI listed ${data.tickets.length} open ticket(s) for bounded Helpdesk scope.`, {
            mode: scope.mode,
            lastChangedBefore: scope.lastChangedBefore ?? null,
            lastChangedAfter: scope.lastChangedAfter ?? null,
            maxResults: scope.maxResults,
            entityId: scope.entityId ?? null,
            categoryId: scope.categoryId ?? null,
            ticketIds: data.tickets.map((ticket) => ticket.id),
          }),
        ]);
      });
    }
    return providerError<{ tickets: TicketRecord[] }>('unsafe_operation', 'Unsupported GLPI scope listing mode.', false);
  }

  async getTicketClassificationContext(
    context: ProviderContext,
    input: { ticketId: string },
  ): Promise<AdapterResult<TicketClassificationContext>> {
    const ticketId = normalizeTicketId(input.ticketId);
    if (!ticketId) {
      return providerError<TicketClassificationContext>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    return this.withSession(context, async (session) => {
      const ticket = await this.glpi.getTicket(session, ticketId);
      const data: TicketClassificationContext = {
        ticketId: String(ticket.id),
        category: null,
        service: null,
        type: glpiTypeContextLabel(ticket.type),
        priority: glpiPriorityContextLabel(ticket.priority),
        impact: null,
        urgency: glpiPriorityContextLabel(numericDropdownValue(ticket.urgency)),
        supported: true,
        warnings: ['glpi_category_context_not_available_in_current_adapter'],
      };
      return ok(data, [
        evidenceSeed('ticket_classification', data.ticketId, `GLPI ticket ${data.ticketId} classification context.`, data, ticket.glpi_url),
      ], ['glpi_category_context_not_available_in_current_adapter']);
    });
  }

  async getTicketLifecycleContext(
    context: ProviderContext,
    input: { ticketId: string },
  ): Promise<AdapterResult<TicketLifecycleContext>> {
    const ticketId = normalizeTicketId(input.ticketId);
    if (!ticketId) {
      return providerError<TicketLifecycleContext>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    return this.withSession(context, async (session) => {
      const ticket = await this.glpi.getTicket(session, ticketId);
      const statusLabel = glpiStatusContextLabel(ticket.status);
      const statusKey = glpiStatusKey(ticket.status);
      const terminal = statusKey === 'solved' || statusKey === 'closed';
      const data: TicketLifecycleContext = {
        ticketId: String(ticket.id),
        status: statusLabel,
        statusLabel,
        terminal,
        allowedTransitions: glpiSafeStatusTransitions(ticket.status),
        updatedAt: ticket.updated_date ?? ticket.date ?? null,
        supported: true,
        warnings: terminal ? ['glpi_terminal_ticket_status_writes_disabled'] : undefined,
      };
      return ok(data, [
        evidenceSeed('ticket_lifecycle', data.ticketId, `GLPI ticket ${data.ticketId} lifecycle context.`, data, ticket.glpi_url),
      ], data.warnings);
    });
  }

  async getTicketRoutingContext(
    context: ProviderContext,
    input: { ticketId: string },
  ): Promise<AdapterResult<TicketRoutingContext>> {
    const ticketId = normalizeTicketId(input.ticketId);
    if (!ticketId) {
      return providerError<TicketRoutingContext>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    return this.withSession(context, async (session) => {
      const users = await this.glpi.getTicketUsers(session, ticketId);
      const requesters = users.filter((user) => user.role === 'requester').map(associationLabel);
      const assignees = users.filter((user) => user.role === 'assigned').map(associationLabel);
      const data: TicketRoutingContext = {
        ticketId: String(ticketId),
        requester: requesters[0] ?? null,
        assignee: assignees[0] ?? null,
        group: null,
        supportedAssignmentTargets: [],
        assignmentSupported: false,
        supported: true,
        warnings: ['glpi_assignment_writes_not_enabled', 'glpi_group_routing_context_not_available_in_current_adapter'],
      };
      return ok(data, [
        evidenceSeed('ticket_routing', data.ticketId, `GLPI ticket ${data.ticketId} routing context.`, data),
      ], data.warnings);
    });
  }

  async getTicketParticipantContext(
    context: ProviderContext,
    input: { ticketId: string },
  ): Promise<AdapterResult<TicketParticipantContext>> {
    const ticketId = normalizeTicketId(input.ticketId);
    if (!ticketId) {
      return providerError<TicketParticipantContext>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    return this.withSession(context, async (session) => {
      const users = await this.glpi.getTicketUsers(session, ticketId);
      const requesters = users.filter((user) => user.role === 'requester').map(associationLabel);
      const observers = users.filter((user) => user.role === 'observer').map(associationLabel);
      const data: TicketParticipantContext = {
        ticketId: String(ticketId),
        requester: requesters[0] ?? null,
        observers,
        watchers: [],
        viewers: [],
        participantUpdatesSupported: false,
        supported: true,
        warnings: ['glpi_participant_writes_not_enabled', 'glpi_watchers_viewers_not_available_in_current_adapter'],
      };
      return ok(data, [
        evidenceSeed('ticket_participants', data.ticketId, `GLPI ticket ${data.ticketId} participant context.`, data),
      ], data.warnings);
    });
  }

  async prepareTicketClassificationUpdate(
    context: ProviderContext,
    input: { ticketId: string; proposed: TicketClassificationUpdateProposal; reason: string },
  ): Promise<AdapterResult<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>> {
    const ticketId = normalizeTicketId(input.ticketId);
    const reason = normalizeReason(input.reason);
    if (!ticketId) {
      return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    if (!reason) {
      return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>('unsafe_operation', 'GLPI provider rejected an unsafe or empty classification update reason.', false);
    }
    const providerFields: Record<string, number> = {};
    const proposed: TicketClassificationUpdateProposal = {};
    const typeCode = input.proposed.type == null ? null : glpiTypeCode(input.proposed.type);
    const priorityCode = input.proposed.priority == null ? null : glpiPriorityCode(input.proposed.priority);
    const urgencyCode = input.proposed.urgency == null ? null : glpiPriorityCode(input.proposed.urgency);
    if (input.proposed.type != null) {
      if (typeCode == null) {
        return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>('unsafe_operation', 'Unsupported GLPI ticket type proposal.', false);
      }
      providerFields.type = typeCode;
      proposed.type = input.proposed.type;
    }
    if (input.proposed.priority != null) {
      if (priorityCode == null) {
        return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>('unsafe_operation', 'Unsupported GLPI ticket priority proposal.', false);
      }
      providerFields.priority = priorityCode;
      proposed.priority = input.proposed.priority;
    }
    if (input.proposed.urgency != null) {
      if (urgencyCode == null) {
        return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>('unsafe_operation', 'Unsupported GLPI ticket urgency proposal.', false);
      }
      providerFields.urgency = urgencyCode;
      proposed.urgency = input.proposed.urgency;
    }
    if (input.proposed.category || input.proposed.service || input.proposed.impact) {
      return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>(
        'unsafe_operation',
        'GLPI category/service/impact writes are not enabled in the current adapter.',
        false,
      );
    }
    if (Object.keys(providerFields).length === 0) {
      return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>('unsafe_operation', 'No supported GLPI classification fields were proposed.', false);
    }
    const current = await this.getTicketClassificationContext(context, { ticketId: String(ticketId) });
    if (current.ok === false) {
      return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>(
        current.errorCode,
        current.message,
        current.retryable,
      );
    }
    const actionPayload: TicketClassificationUpdateActionPayload = {
      ticketId: String(ticketId),
      action: 'classification_update',
      current: current.data,
      proposed,
      providerFields,
      reason,
    };
    const data = {
      actionPayload,
      summary: `Prepared GLPI classification update for ticket ${ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticket_classification_update_prepared', String(ticketId), data.summary, {
        ticketId,
        proposed,
      }),
    ]);
  }

  async updateTicketClassification(
    context: ProviderContext,
    input: { actionPayload: TicketClassificationUpdateActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketProviderActionWriteResult>> {
    const ticketId = normalizeTicketId(input.actionPayload.ticketId);
    if (!ticketId || input.actionPayload.action !== 'classification_update' || !input.actionPayload.providerFields) {
      return providerError<TicketProviderActionWriteResult>('malformed_config', 'Invalid GLPI classification update payload.', false);
    }
    return this.withSession(context, async (session) => {
      const result = await this.glpi.updateTicketFields(session, ticketId, input.actionPayload.providerFields as any);
      const data: TicketProviderActionWriteResult = {
        ticketId: String(result.ticket_id),
        summary: `GLPI ticket ${result.ticket_id} classification updated.`,
        idempotencyKey: input.idempotencyKey,
        updatedFields: result.updated_fields,
        alreadyApplied: false,
      };
      return ok(data, [
        evidenceSeed('ticket_classification_updated', String(result.ticket_id), data.summary, {
          ticketId: data.ticketId,
          updatedFields: data.updatedFields,
          idempotencyKey: input.idempotencyKey,
        }),
      ]);
    });
  }

  async prepareTicketStatusUpdate(
    context: ProviderContext,
    input: { ticketId: string; transitionKey: string; reason: string },
  ): Promise<AdapterResult<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>> {
    const ticketId = normalizeTicketId(input.ticketId);
    const reason = normalizeReason(input.reason);
    const targetStatusCode = glpiStatusCodeForTransition(input.transitionKey);
    if (!ticketId) {
      return providerError<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    if (!reason || targetStatusCode == null) {
      return providerError<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>('unsafe_operation', 'Unsupported or unsafe GLPI status transition proposal.', false);
    }
    const current = await this.getTicketLifecycleContext(context, { ticketId: String(ticketId) });
    if (current.ok === false) {
      return providerError<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>(
        current.errorCode,
        current.message,
        current.retryable,
      );
    }
    const transition = current.data.allowedTransitions.find((candidate) => candidate.key === input.transitionKey);
    // Destructive (terminal solve/close) transitions CAN be prepared/proposed —
    // they are gated by human approval and the auto-exec terminal backstop — but a
    // ticket that is already terminal cannot transition further.
    if (!transition || current.data.terminal) {
      return providerError<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>('unsafe_operation', 'GLPI status transition is not allowed for this ticket.', false);
    }
    const actionPayload: TicketStatusUpdateActionPayload = {
      ticketId: String(ticketId),
      action: 'status_update',
      current: current.data,
      transitionKey: input.transitionKey,
      targetStatus: input.transitionKey,
      targetStatusLabel: transition.label,
      terminal: glpiTransitionIsTerminal(input.transitionKey),
      providerFields: { status: targetStatusCode },
      reason,
    };
    const data = {
      actionPayload,
      summary: `Prepared GLPI status update to ${transition.label} for ticket ${ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticket_status_update_prepared', String(ticketId), data.summary, {
        ticketId,
        transition: input.transitionKey,
      }),
    ]);
  }

  async updateTicketStatus(
    context: ProviderContext,
    input: { actionPayload: TicketStatusUpdateActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketProviderActionWriteResult>> {
    const ticketId = normalizeTicketId(input.actionPayload.ticketId);
    const status = input.actionPayload.providerFields?.status;
    if (!ticketId || input.actionPayload.action !== 'status_update' || typeof status !== 'number') {
      return providerError<TicketProviderActionWriteResult>('malformed_config', 'Invalid GLPI status update payload.', false);
    }
    if (status === 1) {
      return providerError<TicketProviderActionWriteResult>('unsafe_operation', 'GLPI status writes back to New are disabled.', false);
    }
    return this.withSession(context, async (session) => {
      const result = await this.glpi.updateTicketFields(session, ticketId, { status });
      const data: TicketProviderActionWriteResult = {
        ticketId: String(result.ticket_id),
        summary: `GLPI ticket ${result.ticket_id} status updated.`,
        idempotencyKey: input.idempotencyKey,
        updatedFields: result.updated_fields,
        alreadyApplied: false,
      };
      return ok(data, [
        evidenceSeed('ticket_status_updated', String(result.ticket_id), data.summary, {
          ticketId: data.ticketId,
          updatedFields: data.updatedFields,
          idempotencyKey: input.idempotencyKey,
        }),
      ]);
    });
  }

  async prepareTicketAssignmentUpdate(
    context: ProviderContext,
    input: { ticketId: string; target: TicketRoutingTarget; reason: string },
  ): Promise<AdapterResult<TicketProviderActionPrepared<TicketAssignmentUpdateActionPayload>>> {
    void context;
    void input;
    return providerError<TicketProviderActionPrepared<TicketAssignmentUpdateActionPayload>>(
      'unsafe_operation',
      'GLPI assignment writes require tenant-safe user/group mappings and are not enabled in the current adapter.',
      false,
    );
  }

  async updateTicketAssignment(
    context: ProviderContext,
    input: { actionPayload: TicketAssignmentUpdateActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketProviderActionWriteResult>> {
    void context;
    void input;
    return providerError<TicketProviderActionWriteResult>(
      'unsafe_operation',
      'GLPI assignment writes are not enabled in the current adapter.',
      false,
    );
  }

  async prepareTicketParticipantUpdate(
    context: ProviderContext,
    input: { ticketId: string; operation: TicketParticipantUpdateOperation; participants: TicketRoutingTarget[]; reason: string },
  ): Promise<AdapterResult<TicketProviderActionPrepared<TicketParticipantUpdateActionPayload>>> {
    void context;
    void input;
    return providerError<TicketProviderActionPrepared<TicketParticipantUpdateActionPayload>>(
      'unsafe_operation',
      'GLPI participant writes require tenant-safe participant mappings and are not enabled in the current adapter.',
      false,
    );
  }

  async updateTicketParticipants(
    context: ProviderContext,
    input: { actionPayload: TicketParticipantUpdateActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketProviderActionWriteResult>> {
    void context;
    void input;
    return providerError<TicketProviderActionWriteResult>(
      'unsafe_operation',
      'GLPI participant writes are not enabled in the current adapter.',
      false,
    );
  }

  async prepareInternalNote(
    context: ProviderContext,
    input: { ticketId: string; noteBody: string },
  ): Promise<AdapterResult<TicketInternalNotePrepared>> {
    void context;
    const ticketId = normalizeTicketId(input.ticketId);
    const body = String(input.noteBody || '').replace(/\r\n/g, '\n').trim();
    if (!ticketId) {
      return providerError<TicketInternalNotePrepared>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    if (!body || body.length > MAX_INTERNAL_NOTE_CHARS || noteBodyIsUnsafe(body)) {
      return providerError<TicketInternalNotePrepared>('unsafe_operation', 'GLPI provider rejected an unsafe internal note body.', false);
    }
    const actionPayload: TicketInternalNoteActionPayload = {
      ticketId: String(ticketId),
      visibility: 'internal',
      body,
      bodyFormat: 'plain_text',
    };
    const data: TicketInternalNotePrepared = {
      actionPayload,
      summary: `Prepared internal note for GLPI ticket ${ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticket_internal_note_prepared', String(ticketId), data.summary, {
        ticketId,
        visibility: actionPayload.visibility,
        bodyPreview: body.slice(0, 240),
      }),
    ]);
  }

  async addInternalNote(
    context: ProviderContext,
    input: { actionPayload: TicketInternalNoteActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketInternalNoteWriteResult>> {
    const ticketId = normalizeTicketId(input.actionPayload.ticketId);
    if (!ticketId) {
      return providerError<TicketInternalNoteWriteResult>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    if (
      input.actionPayload.visibility !== 'internal'
      || input.actionPayload.bodyFormat !== 'plain_text'
      || !input.actionPayload.body
      || noteBodyIsUnsafe(input.actionPayload.body)
    ) {
      return providerError<TicketInternalNoteWriteResult>('unsafe_operation', 'GLPI provider refused a non-internal or unsafe note write.', false);
    }
    return this.withSession(context, async (session) => {
      const result = await this.glpi.addTicketFollowup(session, ticketId, input.actionPayload.body, { isPrivate: true });
      // The agent registers itself as an OBSERVER on internal notes (non-fatal side effect).
      const actor = await this.addAgentActor(session, ticketId, 3);
      const data: TicketInternalNoteWriteResult = {
        noteId: String(result.id),
        ticketId: String(result.ticket_id),
        summary: `Internal note added to GLPI ticket ${result.ticket_id}.`,
        idempotencyKey: input.idempotencyKey,
        alreadyApplied: false,
      };
      return ok(data, [
        evidenceSeed('ticket_internal_note_added', String(result.ticket_id), data.summary, {
          noteId: data.noteId,
          ticketId: data.ticketId,
          isPrivate: result.is_private,
          idempotencyKey: input.idempotencyKey,
          agentObserverAdded: actor.added,
          ...(actor.skippedReason ? { agentObserverSkippedReason: actor.skippedReason } : {}),
        }),
      ]);
    });
  }

  // Adds the agent's own GLPI user as a ticket actor as a side effect of posting. Strictly
  // own-user-only (enforced in GlpiService.addTicketUser), idempotent, additive, and
  // non-fatal: a failure is reported as evidence but never fails the note/reply that
  // already succeeded, and never routes through the disabled arbitrary-participant path.
  private async addAgentActor(
    session: Awaited<ReturnType<GlpiService['initSession']>>,
    ticketId: number,
    type: 2 | 3,
  ): Promise<{ added: boolean; skippedReason?: string }> {
    if (!session.agentUserId) {
      return { added: false, skippedReason: 'agent_glpi_user_unresolved' };
    }
    try {
      const result = await this.glpi.addTicketUser(session, ticketId, session.agentUserId, type);
      return { added: result.added, skippedReason: result.alreadyPresent ? 'already_present' : undefined };
    } catch (error) {
      return { added: false, skippedReason: error instanceof Error ? error.message : 'actor_add_failed' };
    }
  }

  async preparePublicReply(
    context: ProviderContext,
    input: { ticketId: string; replyBody: string },
  ): Promise<AdapterResult<TicketPublicReplyPrepared>> {
    void context;
    const ticketId = normalizeTicketId(input.ticketId);
    const body = String(input.replyBody || '').replace(/\r\n/g, '\n').trim();
    if (!ticketId) {
      return providerError<TicketPublicReplyPrepared>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    if (!body || body.length > MAX_PUBLIC_REPLY_CHARS || noteBodyIsUnsafe(body)) {
      return providerError<TicketPublicReplyPrepared>('unsafe_operation', 'GLPI provider rejected an unsafe public reply body.', false);
    }
    const actionPayload: TicketPublicReplyActionPayload = {
      ticketId: String(ticketId),
      visibility: 'public',
      body,
      bodyFormat: 'plain_text',
    };
    const data: TicketPublicReplyPrepared = {
      actionPayload,
      summary: `Prepared public reply for GLPI ticket ${ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticket_public_reply_prepared', String(ticketId), data.summary, {
        ticketId,
        visibility: actionPayload.visibility,
        bodyPreview: body.slice(0, 240),
      }),
    ]);
  }

  async addPublicReply(
    context: ProviderContext,
    input: { actionPayload: TicketPublicReplyActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketPublicReplyWriteResult>> {
    const ticketId = normalizeTicketId(input.actionPayload.ticketId);
    if (!ticketId) {
      return providerError<TicketPublicReplyWriteResult>('malformed_config', 'GLPI ticket id must be a positive integer.', false);
    }
    if (
      input.actionPayload.visibility !== 'public'
      || input.actionPayload.bodyFormat !== 'plain_text'
      || !input.actionPayload.body
      || noteBodyIsUnsafe(input.actionPayload.body)
    ) {
      return providerError<TicketPublicReplyWriteResult>('unsafe_operation', 'GLPI provider refused a non-public or unsafe reply write.', false);
    }
    return this.withSession(context, async (session) => {
      const result = await this.glpi.addTicketFollowup(session, ticketId, input.actionPayload.body, {
        isPrivate: false,
        allowPublic: true,
      });
      // The agent registers itself as an ASSIGNEE on public replies (additive, non-fatal).
      const actor = await this.addAgentActor(session, ticketId, 2);
      const data: TicketPublicReplyWriteResult = {
        noteId: String(result.id),
        ticketId: String(result.ticket_id),
        summary: `Public reply added to GLPI ticket ${result.ticket_id}.`,
        idempotencyKey: input.idempotencyKey,
        alreadyApplied: false,
      };
      return ok(data, [
        evidenceSeed('ticket_public_reply_added', String(result.ticket_id), data.summary, {
          noteId: data.noteId,
          ticketId: data.ticketId,
          isPrivate: result.is_private,
          idempotencyKey: input.idempotencyKey,
          agentAssigneeAdded: actor.added,
          ...(actor.skippedReason ? { agentAssigneeSkippedReason: actor.skippedReason } : {}),
        }),
      ]);
    });
  }
}
