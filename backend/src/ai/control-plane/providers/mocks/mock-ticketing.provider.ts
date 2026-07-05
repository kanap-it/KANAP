import {
  AdapterResult,
  ProviderContext,
  ProviderActionExecutionReadiness,
  ProviderActionExecutionReadinessAction,
  ProviderActionPlannerProfile,
  RefItem,
  SimilarTicket,
  TicketClassificationContext,
  TicketClassificationUpdateActionPayload,
  TicketClassificationUpdateProposal,
  TicketAssignmentUpdateActionPayload,
  TicketInternalNoteActionPayload,
  TicketInternalNotePrepared,
  TicketInternalNoteWriteResult,
  TicketLifecycleContext,
  TicketParticipantUpdateActionPayload,
  TicketParticipantUpdateOperation,
  TicketParticipantContext,
  TicketProviderActionPrepared,
  TicketProviderActionWriteResult,
  TicketPublicReplyActionPayload,
  TicketPublicReplyPrepared,
  TicketPublicReplyWriteResult,
  TicketRoutingTarget,
  TicketStatusUpdateActionPayload,
  TicketRoutingContext,
  TicketingProvider,
  TicketAttachmentReadResult,
  TicketNote,
  TicketRecord,
  TicketListScope,
  TicketReferenceCatalogKind,
  TicketReferenceEnums,
} from '../provider.types';
import { OPEN_TICKET_STATUS_VALUES } from '../provider-constants';
import {
  errorForScenario,
  evidenceSeed,
  MALICIOUS_EXTERNAL_TEXT,
  mockApplicability,
  mockHealth,
  ok,
  providerError,
} from './mock-provider.helpers';

const MAX_INTERNAL_NOTE_CHARS = 4000;
const MAX_PUBLIC_REPLY_CHARS = 12000;
const MOCK_ACTION_PLANNER_PROFILE: ProviderActionPlannerProfile = {
  domain_preamble: 'Select bounded approval-gated mock ticketing actions.',
  action_vocabulary: [
    'mock_internal_note',
    'mock_requester_reply',
    'mock_status_update',
  ],
  validation_notes: [
    'Use mock_internal_note for operator-only audit notes.',
    'Use mock_requester_reply only when a bounded requester-facing answer is appropriate.',
    'Use mock_status_update only when the mock lifecycle context exposes an allowed transition.',
  ],
};

const MOCK_REFERENCE_ENUMS: TicketReferenceEnums = {
  statuses: [
    { value: 'new', label: 'New', metadata: { key: 'new', code: 1 } },
    { value: 'assigned', label: 'Assigned', metadata: { key: 'assigned', code: 2 } },
    { value: 'pending', label: 'Pending', metadata: { key: 'pending', code: 4 } },
    { value: 'resolved', label: 'Resolved', metadata: { key: 'resolved', code: 5 } },
  ],
  priorities: [
    { value: 'low', label: 'Low', metadata: { level: 2 } },
    { value: 'medium', label: 'Medium', metadata: { level: 3 } },
    { value: 'high', label: 'High', metadata: { level: 4 } },
    { value: 'major', label: 'Major', metadata: { level: 6 } },
  ],
  types: [
    { value: 'incident', label: 'Incident', metadata: { code: 1 } },
    { value: 'request', label: 'Request', metadata: { code: 2 } },
  ],
};

const MOCK_CATALOGS: Record<TicketReferenceCatalogKind, RefItem[]> = {
  category: [
    { value: 'access', label: 'IT > Access', metadata: { completename: 'IT > Access', parentId: 'it' } },
    { value: 'vpn', label: 'IT > Access > VPN', metadata: { completename: 'IT > Access > VPN', parentId: 'access' } },
    { value: 'finance', label: 'Finance > Requests', metadata: { completename: 'Finance > Requests', parentId: 'finance-root' } },
  ],
  entity: [
    { value: 'lohr-helpdesk', label: 'LOHR > Helpdesk', metadata: { completename: 'LOHR > Helpdesk', parentId: 'lohr' } },
    { value: 'finance', label: 'LOHR > Finance', metadata: { completename: 'LOHR > Finance', parentId: 'lohr' } },
  ],
};

function normalizeReason(value: string): string | null {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim();
  return normalized.length > 0 && normalized.length <= 1000 ? normalized : null;
}

function normalizeNoteBody(value: string): string | null {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim();
  return normalized.length > 0 ? normalized : null;
}

function noteBodyIsUnsafe(value: string): boolean {
  return /<[^>]+>/.test(value) || /javascript:/i.test(value);
}

export class MockTicketingProvider implements TicketingProvider {
  readonly kind = 'ticketing' as const;
  readonly providerKey = 'mock';
  readonly actionPlannerProfile = MOCK_ACTION_PLANNER_PROFILE;

  async health(context: ProviderContext) {
    void context;
    return mockHealth(this.kind, this.providerKey);
  }

  async applicability(context: ProviderContext) {
    void context;
    return mockApplicability();
  }

  async executionReadinessForActions(
    context: ProviderContext,
    input: { actions: ProviderActionExecutionReadinessAction[] },
  ): Promise<ProviderActionExecutionReadiness[]> {
    void context;
    return input.actions.map((action) => ({
      action_request_id: action.id,
      blocked_reason: null,
    }));
  }

  async getTicket(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<TicketRecord>> {
    void context;
    const scenario = errorForScenario<TicketRecord>(input.ticketId);
    if (scenario) {
      return scenario;
    }
    const malicious = input.ticketId.includes('malicious');
    const data: TicketRecord = {
      id: input.ticketId,
      title: malicious ? `Suspicious ticket ${MALICIOUS_EXTERNAL_TEXT}` : 'CPU pressure on SAP application server',
      status: 'resolved',
      priority: 'high',
      type: 'incident',
      requesterId: 'mock-user-operations',
      requester: 'Operations',
      description: malicious ? MALICIOUS_EXTERNAL_TEXT : 'Previous incident showed sustained CPU load during batch overlap.',
      createdAt: '2026-05-24T08:20:00.000Z',
      updatedAt: '2026-05-24T09:05:00.000Z',
      tags: ['sap', 'cpu', 'batch-window'],
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket', data.id, `Ticket ${data.id}: ${data.title}`, data),
    ]);
  }

  async searchSimilarTickets(
    context: ProviderContext,
    input: { query: string; ticketId?: string | null; limit?: number | null },
  ): Promise<AdapterResult<{ tickets: SimilarTicket[] }>> {
    void context;
    const scenario = errorForScenario<{ tickets: SimilarTicket[] }>(input.ticketId ?? input.query);
    if (scenario) {
      return scenario;
    }
    const limit = Math.max(1, Math.min(input.limit ?? 3, 10));
    const tickets: SimilarTicket[] = [
      {
        id: 'mock-ticket-1001',
        title: 'SAP app server CPU high during nightly batch',
        status: 'resolved',
        similarity: 0.91,
        resolutionSummary: 'Batch schedule overlap was reduced and CPU returned to normal.',
      },
      {
        id: 'mock-ticket-0991',
        title: 'PRTG CPU warning on srv-fr-sap-app02',
        status: 'resolved',
        similarity: 0.83,
        resolutionSummary: 'Confirmed transient CPU pressure; no restart required.',
      },
      {
        id: 'mock-ticket-malicious',
        title: `Operator note includes unsafe text ${MALICIOUS_EXTERNAL_TEXT}`,
        status: 'closed',
        similarity: 0.42,
        resolutionSummary: MALICIOUS_EXTERNAL_TEXT,
      },
    ].slice(0, limit);
    return ok({ tickets }, [
      evidenceSeed('ticketing:mock', 'ticket_search', input.ticketId ?? 'query', `Found ${tickets.length} similar ticket(s).`, { query: input.query, tickets }),
    ]);
  }

  async listTicketNotes(context: ProviderContext, input: { ticketId: string }): Promise<AdapterResult<{ notes: TicketNote[] }>> {
    void context;
    const scenario = errorForScenario<{ notes: TicketNote[] }>(input.ticketId);
    if (scenario) {
      return scenario;
    }
    const notes: TicketNote[] = [
      {
        id: 'mock-note-1',
        visibility: 'internal',
        authorId: 'mock-user-helpdesk',
        author: 'Operations',
        authorRole: 'support',
        body: input.ticketId.includes('malicious') ? MALICIOUS_EXTERNAL_TEXT : 'Checked Nutanix: VM healthy, CPU elevated only during batch.',
        createdAt: '2026-05-24T08:45:00.000Z',
        updatedAt: '2026-05-24T08:45:00.000Z',
        updateFingerprint: `mock-note-1:${input.ticketId}:2026-05-24T08:45:00.000Z`,
      },
    ];
    return ok({ notes }, [
      evidenceSeed('ticketing:mock', 'ticket_notes', input.ticketId, `Ticket ${input.ticketId} notes.`, { notes }),
    ]);
  }

  async readTicketAttachment(
    context: ProviderContext,
    input: { ticketId: string; target: string },
  ): Promise<AdapterResult<TicketAttachmentReadResult>> {
    void context;
    const scenario = errorForScenario<TicketAttachmentReadResult>(input.ticketId);
    if (scenario) {
      return scenario;
    }
    const data: TicketAttachmentReadResult = {
      attachment: {
        id: 'mock-attachment-1',
        kind: 'image',
        source: 'ticket_description',
        target: input.target,
        sourceUri: null,
        filename: 'mock-ticket-image.png',
        mimeType: 'image/png',
        sizeBytes: 10,
        altText: null,
      },
      filename: 'mock-ticket-image.png',
      mimeType: 'image/png',
      sizeBytes: 10,
      base64Data: Buffer.from('mock-image').toString('base64'),
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_attachment', input.ticketId, `Ticket ${input.ticketId} attachment.`, {
        attachment: { ...data.attachment, sizeBytes: data.sizeBytes, mimeType: data.mimeType },
      }),
    ]);
  }

  async listTicketsForScope(
    context: ProviderContext,
    input: { scope: TicketListScope },
  ): Promise<AdapterResult<{ tickets: TicketRecord[] }>> {
    void context;
    const scope = input.scope;
    if (scope.mode !== 'new_tickets_only') {
      return providerError<{ tickets: TicketRecord[] }>('unsafe_operation', 'Mock provider only supports new_tickets_only scope listing.', false);
    }
    const createdAfter = Date.parse(scope.createdAfter);
    if (!Number.isFinite(createdAfter)) {
      return providerError<{ tickets: TicketRecord[] }>('malformed_config', 'Scope createdAfter must be a valid timestamp.', false);
    }
    const maxResults = Math.max(1, Math.min(Math.floor(scope.maxResults), 20));
    const candidates: TicketRecord[] = [
      {
        id: 'mock-new-ticket-in-scope',
        title: 'New requester VPN access question',
        status: 'new',
        priority: 'medium',
        type: 'request',
        requesterId: 'mock-user-requester',
        requester: 'Requester',
        description: 'Need help with VPN access.',
        createdAt: '2026-06-09T08:10:00.000Z',
        updatedAt: '2026-06-09T08:10:00.000Z',
        tags: ['vpn'],
        scope: { entityId: 'lohr-helpdesk', categoryId: 'access' },
      },
      {
        id: 'mock-new-ticket-out-of-scope',
        title: 'Out-of-scope finance question',
        status: 'new',
        priority: 'low',
        type: 'request',
        requesterId: 'mock-user-finance',
        requester: 'Finance',
        description: 'Finance-only support request.',
        createdAt: '2026-06-09T08:20:00.000Z',
        updatedAt: '2026-06-09T08:20:00.000Z',
        tags: ['finance'],
        scope: { entityId: 'finance', categoryId: 'finance' },
      },
      {
        id: 'mock-old-ticket-in-scope',
        title: 'Historical ticket that must not backfill',
        status: 'new',
        priority: 'medium',
        type: 'request',
        requesterId: 'mock-user-requester',
        requester: 'Requester',
        description: 'Old scoped request.',
        createdAt: '2026-06-01T08:10:00.000Z',
        updatedAt: '2026-06-01T08:10:00.000Z',
        tags: ['vpn'],
        scope: { entityId: 'lohr-helpdesk', categoryId: 'access' },
      },
    ];
    const statusValues = new Set((scope.statusValues && scope.statusValues.length > 0 ? scope.statusValues : OPEN_TICKET_STATUS_VALUES)
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean));
    const tickets = candidates
      .filter((ticket) => Date.parse(ticket.createdAt) >= createdAfter)
      .filter((ticket) => statusValues.has(String(ticket.status ?? '').trim().toLowerCase()))
      .filter((ticket) => !scope.entityId || ticket.scope?.entityId === scope.entityId)
      .filter((ticket) => !scope.categoryId || ticket.scope?.categoryId === scope.categoryId)
      .slice(0, maxResults);
    return ok({ tickets }, [
      evidenceSeed('ticketing:mock', 'ticket_scope_list', `${scope.mode}:${scope.createdAfter}`, `Mock listed ${tickets.length} ticket(s) for bounded scope.`, {
        scope,
        ticketIds: tickets.map((ticket) => ticket.id),
      }),
    ]);
  }

  async describeReferenceEnums(context: ProviderContext): Promise<AdapterResult<TicketReferenceEnums>> {
    void context;
    const data = {
      statuses: MOCK_REFERENCE_ENUMS.statuses.map((item) => ({ ...item, metadata: { ...(item.metadata ?? {}) } })),
      priorities: MOCK_REFERENCE_ENUMS.priorities.map((item) => ({ ...item, metadata: { ...(item.metadata ?? {}) } })),
      types: MOCK_REFERENCE_ENUMS.types.map((item) => ({ ...item, metadata: { ...(item.metadata ?? {}) } })),
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'reference_enums', 'mock', 'Mock listed ticket enum reference values.', data),
    ]);
  }

  async searchReferenceCatalog(
    context: ProviderContext,
    input: { kind: TicketReferenceCatalogKind; query?: string | null; limit: number },
  ): Promise<AdapterResult<{ items: RefItem[] }>> {
    void context;
    const limit = Math.max(1, Math.min(Math.floor(input.limit), 50));
    const query = String(input.query ?? '').trim().toLowerCase();
    const source = MOCK_CATALOGS[input.kind] ?? [];
    const items = source
      .filter((item) => !query || item.label.toLowerCase().includes(query) || item.value.toLowerCase().includes(query))
      .slice(0, limit)
      .map((item) => ({ ...item, metadata: { ...(item.metadata ?? {}) } }));
    return ok({ items }, [
      evidenceSeed('ticketing:mock', `${input.kind}_list`, query || input.kind, `Mock listed ${items.length} ${input.kind} option(s).`, {
        kind: input.kind,
        query: input.query ?? null,
        limit,
        items,
      }),
    ]);
  }

  async getTicketClassificationContext(
    context: ProviderContext,
    input: { ticketId: string },
  ): Promise<AdapterResult<TicketClassificationContext>> {
    void context;
    const scenario = errorForScenario<TicketClassificationContext>(input.ticketId);
    if (scenario) {
      return scenario;
    }
    const data: TicketClassificationContext = {
      ticketId: input.ticketId,
      category: 'Infrastructure / Monitoring',
      service: 'SAP S/4HANA',
      type: 'Incident',
      priority: 'high',
      impact: 'application_performance',
      urgency: 'medium',
      supported: true,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_classification', input.ticketId, `Ticket ${input.ticketId} classification context.`, data),
    ]);
  }

  async getTicketLifecycleContext(
    context: ProviderContext,
    input: { ticketId: string },
  ): Promise<AdapterResult<TicketLifecycleContext>> {
    void context;
    const scenario = errorForScenario<TicketLifecycleContext>(input.ticketId);
    if (scenario) {
      return scenario;
    }
    const data: TicketLifecycleContext = {
      ticketId: input.ticketId,
      status: 'open',
      statusLabel: 'Open',
      terminal: false,
      allowedTransitions: [
        { key: 'pending_user', label: 'Waiting for requester', requiresApproval: true, destructive: false, terminal: false },
        { key: 'escalated_l2', label: 'Escalate to L2', requiresApproval: true, destructive: false, terminal: false },
      ],
      updatedAt: '2026-05-24T09:05:00.000Z',
      supported: true,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_lifecycle', input.ticketId, `Ticket ${input.ticketId} lifecycle context.`, data),
    ]);
  }

  async getTicketRoutingContext(
    context: ProviderContext,
    input: { ticketId: string },
  ): Promise<AdapterResult<TicketRoutingContext>> {
    void context;
    const scenario = errorForScenario<TicketRoutingContext>(input.ticketId);
    if (scenario) {
      return scenario;
    }
    const data: TicketRoutingContext = {
      ticketId: input.ticketId,
      requester: 'Operations',
      assignee: null,
      group: 'Helpdesk L1',
      supportedAssignmentTargets: [
        { kind: 'group', key: 'helpdesk_l1', label: 'Helpdesk L1' },
        { kind: 'group', key: 'sap_operations', label: 'SAP Operations' },
      ],
      assignmentSupported: true,
      supported: true,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_routing', input.ticketId, `Ticket ${input.ticketId} routing context.`, data),
    ]);
  }

  async getTicketParticipantContext(
    context: ProviderContext,
    input: { ticketId: string },
  ): Promise<AdapterResult<TicketParticipantContext>> {
    void context;
    const scenario = errorForScenario<TicketParticipantContext>(input.ticketId);
    if (scenario) {
      return scenario;
    }
    const data: TicketParticipantContext = {
      ticketId: input.ticketId,
      requester: 'Operations',
      observers: ['SAP Operations'],
      watchers: ['Helpdesk Duty Manager'],
      viewers: [],
      participantUpdatesSupported: true,
      supported: true,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_participants', input.ticketId, `Ticket ${input.ticketId} participant context.`, data),
    ]);
  }

  async prepareTicketClassificationUpdate(
    context: ProviderContext,
    input: { ticketId: string; proposed: TicketClassificationUpdateProposal; reason: string },
  ): Promise<AdapterResult<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>> {
    void context;
    const scenario = errorForScenario<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>(input.ticketId);
    if (scenario) {
      return scenario;
    }
    const reason = normalizeReason(input.reason);
    const proposed = Object.fromEntries(
      Object.entries(input.proposed)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
        .map(([key, value]) => [key, String(value).trim()]),
    ) as TicketClassificationUpdateProposal;
    if (!reason || Object.keys(proposed).length === 0) {
      return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>(
        'unsafe_operation',
        'Mock provider rejected an empty classification update proposal.',
        false,
      );
    }
    const current = (await this.getTicketClassificationContext(context, { ticketId: input.ticketId }));
    if (current.ok === false) {
      return providerError<TicketProviderActionPrepared<TicketClassificationUpdateActionPayload>>(
        current.errorCode,
        current.message,
        current.retryable,
      );
    }
    const actionPayload: TicketClassificationUpdateActionPayload = {
      ticketId: input.ticketId,
      action: 'classification_update',
      current: current.data,
      proposed,
      reason,
    };
    const data = {
      actionPayload,
      summary: `Prepared classification update for ticket ${input.ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_classification_update_prepared', input.ticketId, data.summary, {
        ticketId: input.ticketId,
        proposed,
      }),
    ]);
  }

  async updateTicketClassification(
    context: ProviderContext,
    input: { actionPayload: TicketClassificationUpdateActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketProviderActionWriteResult>> {
    void context;
    const { actionPayload } = input;
    const scenario = errorForScenario<TicketProviderActionWriteResult>(`${actionPayload.ticketId} ${JSON.stringify(actionPayload.proposed)}`);
    if (scenario) {
      return scenario;
    }
    const updatedFields = Object.keys(actionPayload.proposed).filter((key) => actionPayload.proposed[key as keyof TicketClassificationUpdateProposal] != null);
    if (actionPayload.action !== 'classification_update' || updatedFields.length === 0) {
      return providerError<TicketProviderActionWriteResult>('unsafe_operation', 'Mock provider refused an invalid classification update.', false);
    }
    const data: TicketProviderActionWriteResult = {
      ticketId: actionPayload.ticketId,
      summary: `Classification updated for ticket ${actionPayload.ticketId}.`,
      idempotencyKey: input.idempotencyKey,
      updatedFields,
      alreadyApplied: false,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_classification_updated', actionPayload.ticketId, data.summary, data),
    ]);
  }

  async prepareTicketStatusUpdate(
    context: ProviderContext,
    input: { ticketId: string; transitionKey: string; reason: string },
  ): Promise<AdapterResult<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>> {
    void context;
    const reason = normalizeReason(input.reason);
    const lifecycle = await this.getTicketLifecycleContext(context, { ticketId: input.ticketId });
    if (lifecycle.ok === false) {
      return providerError<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>(
        lifecycle.errorCode,
        lifecycle.message,
        lifecycle.retryable,
      );
    }
    const transition = lifecycle.data.allowedTransitions.find((candidate) => candidate.key === input.transitionKey);
    if (!reason || !transition || transition.destructive) {
      return providerError<TicketProviderActionPrepared<TicketStatusUpdateActionPayload>>('unsafe_operation', 'Mock provider rejected an unsupported status transition.', false);
    }
    const actionPayload: TicketStatusUpdateActionPayload = {
      ticketId: input.ticketId,
      action: 'status_update',
      current: lifecycle.data,
      transitionKey: transition.key,
      targetStatus: transition.key,
      targetStatusLabel: transition.label,
      terminal: transition.terminal,
      reason,
    };
    const data = {
      actionPayload,
      summary: `Prepared status transition ${transition.label} for ticket ${input.ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_status_update_prepared', input.ticketId, data.summary, {
        ticketId: input.ticketId,
        transition: transition.key,
      }),
    ]);
  }

  async updateTicketStatus(
    context: ProviderContext,
    input: { actionPayload: TicketStatusUpdateActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketProviderActionWriteResult>> {
    void context;
    const { actionPayload } = input;
    if (actionPayload.action !== 'status_update' || !actionPayload.targetStatus) {
      return providerError<TicketProviderActionWriteResult>('unsafe_operation', 'Mock provider refused an invalid status update.', false);
    }
    const data: TicketProviderActionWriteResult = {
      ticketId: actionPayload.ticketId,
      summary: `Status updated to ${actionPayload.targetStatusLabel ?? actionPayload.targetStatus} for ticket ${actionPayload.ticketId}.`,
      idempotencyKey: input.idempotencyKey,
      updatedFields: ['status'],
      alreadyApplied: false,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_status_updated', actionPayload.ticketId, data.summary, data),
    ]);
  }

  async prepareTicketAssignmentUpdate(
    context: ProviderContext,
    input: { ticketId: string; target: TicketRoutingTarget; reason: string },
  ): Promise<AdapterResult<TicketProviderActionPrepared<TicketAssignmentUpdateActionPayload>>> {
    void context;
    const reason = normalizeReason(input.reason);
    const routing = await this.getTicketRoutingContext(context, { ticketId: input.ticketId });
    if (routing.ok === false) {
      return providerError<TicketProviderActionPrepared<TicketAssignmentUpdateActionPayload>>(
        routing.errorCode,
        routing.message,
        routing.retryable,
      );
    }
    const target = routing.data.supportedAssignmentTargets.find((candidate) =>
      candidate.kind === input.target.kind && candidate.key === input.target.key,
    );
    if (!reason || !routing.data.assignmentSupported || !target) {
      return providerError<TicketProviderActionPrepared<TicketAssignmentUpdateActionPayload>>('unsafe_operation', 'Mock provider rejected an unsupported assignment target.', false);
    }
    const actionPayload: TicketAssignmentUpdateActionPayload = {
      ticketId: input.ticketId,
      action: 'assignment_update',
      current: routing.data,
      target,
      reason,
    };
    const data = {
      actionPayload,
      summary: `Prepared assignment to ${target.label} for ticket ${input.ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_assignment_update_prepared', input.ticketId, data.summary, {
        ticketId: input.ticketId,
        target,
      }),
    ]);
  }

  async updateTicketAssignment(
    context: ProviderContext,
    input: { actionPayload: TicketAssignmentUpdateActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketProviderActionWriteResult>> {
    void context;
    const { actionPayload } = input;
    if (actionPayload.action !== 'assignment_update' || !actionPayload.target?.key) {
      return providerError<TicketProviderActionWriteResult>('unsafe_operation', 'Mock provider refused an invalid assignment update.', false);
    }
    const data: TicketProviderActionWriteResult = {
      ticketId: actionPayload.ticketId,
      summary: `Ticket ${actionPayload.ticketId} assigned to ${actionPayload.target.label}.`,
      idempotencyKey: input.idempotencyKey,
      updatedFields: ['assignment'],
      alreadyApplied: false,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_assignment_updated', actionPayload.ticketId, data.summary, data),
    ]);
  }

  async prepareTicketParticipantUpdate(
    context: ProviderContext,
    input: { ticketId: string; operation: TicketParticipantUpdateOperation; participants: TicketRoutingTarget[]; reason: string },
  ): Promise<AdapterResult<TicketProviderActionPrepared<TicketParticipantUpdateActionPayload>>> {
    void context;
    const reason = normalizeReason(input.reason);
    const participantContext = await this.getTicketParticipantContext(context, { ticketId: input.ticketId });
    if (participantContext.ok === false) {
      return providerError<TicketProviderActionPrepared<TicketParticipantUpdateActionPayload>>(
        participantContext.errorCode,
        participantContext.message,
        participantContext.retryable,
      );
    }
    if (!reason || !participantContext.data.participantUpdatesSupported || input.participants.length === 0) {
      return providerError<TicketProviderActionPrepared<TicketParticipantUpdateActionPayload>>('unsafe_operation', 'Mock provider rejected an unsupported participant update.', false);
    }
    const actionPayload: TicketParticipantUpdateActionPayload = {
      ticketId: input.ticketId,
      action: 'participant_update',
      current: participantContext.data,
      operation: input.operation,
      participants: input.participants,
      reason,
    };
    const data = {
      actionPayload,
      summary: `Prepared participant update for ticket ${input.ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_participant_update_prepared', input.ticketId, data.summary, {
        ticketId: input.ticketId,
        operation: input.operation,
        participants: input.participants,
      }),
    ]);
  }

  async updateTicketParticipants(
    context: ProviderContext,
    input: { actionPayload: TicketParticipantUpdateActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketProviderActionWriteResult>> {
    void context;
    const { actionPayload } = input;
    if (actionPayload.action !== 'participant_update' || actionPayload.participants.length === 0) {
      return providerError<TicketProviderActionWriteResult>('unsafe_operation', 'Mock provider refused an invalid participant update.', false);
    }
    const data: TicketProviderActionWriteResult = {
      ticketId: actionPayload.ticketId,
      summary: `Participants updated for ticket ${actionPayload.ticketId}.`,
      idempotencyKey: input.idempotencyKey,
      updatedFields: ['participants'],
      alreadyApplied: false,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_participants_updated', actionPayload.ticketId, data.summary, data),
    ]);
  }

  async prepareInternalNote(
    context: ProviderContext,
    input: { ticketId: string; noteBody: string },
  ): Promise<AdapterResult<TicketInternalNotePrepared>> {
    void context;
    const scenario = errorForScenario<TicketInternalNotePrepared>(`${input.ticketId} ${input.noteBody}`);
    if (scenario) {
      return scenario;
    }
    const body = normalizeNoteBody(input.noteBody);
    if (!body || body.length > MAX_INTERNAL_NOTE_CHARS || noteBodyIsUnsafe(body)) {
      return providerError<TicketInternalNotePrepared>('unsafe_operation', 'Mock provider rejected an unsafe internal note body.', false);
    }
    const actionPayload: TicketInternalNoteActionPayload = {
      ticketId: input.ticketId,
      visibility: 'internal',
      body,
      bodyFormat: 'plain_text',
    };
    const data: TicketInternalNotePrepared = {
      actionPayload,
      summary: `Prepared internal note for ticket ${input.ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_internal_note_prepared', input.ticketId, data.summary, {
        ticketId: input.ticketId,
        visibility: actionPayload.visibility,
        bodyPreview: body.slice(0, 240),
      }),
    ]);
  }

  async addInternalNote(
    context: ProviderContext,
    input: { actionPayload: TicketInternalNoteActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketInternalNoteWriteResult>> {
    void context;
    const { actionPayload } = input;
    const scenario = errorForScenario<TicketInternalNoteWriteResult>(`${actionPayload.ticketId} ${actionPayload.body}`);
    if (scenario) {
      return scenario;
    }
    const body = normalizeNoteBody(actionPayload.body);
    if (
      actionPayload.visibility !== 'internal'
      || actionPayload.bodyFormat !== 'plain_text'
      || !body
      || body.length > MAX_INTERNAL_NOTE_CHARS
      || noteBodyIsUnsafe(body)
    ) {
      return providerError<TicketInternalNoteWriteResult>('unsafe_operation', 'Mock provider refused a non-internal or unsafe note write.', false);
    }
    const alreadyApplied = body.includes('already-applied') || input.idempotencyKey.includes('already-applied');
    const data: TicketInternalNoteWriteResult = {
      noteId: alreadyApplied ? 'mock-note-existing' : `mock-note-${input.idempotencyKey.slice(0, 12)}`,
      ticketId: actionPayload.ticketId,
      summary: alreadyApplied
        ? `Internal note for ticket ${actionPayload.ticketId} was already applied.`
        : `Internal note added to ticket ${actionPayload.ticketId}.`,
      idempotencyKey: input.idempotencyKey,
      alreadyApplied,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_internal_note_added', actionPayload.ticketId, data.summary, {
        noteId: data.noteId,
        ticketId: data.ticketId,
        alreadyApplied,
        idempotencyKey: input.idempotencyKey,
      }),
    ], alreadyApplied ? ['already_applied'] : undefined);
  }

  async preparePublicReply(
    context: ProviderContext,
    input: { ticketId: string; replyBody: string },
  ): Promise<AdapterResult<TicketPublicReplyPrepared>> {
    void context;
    const scenario = errorForScenario<TicketPublicReplyPrepared>(`${input.ticketId} ${input.replyBody}`);
    if (scenario) {
      return scenario;
    }
    const body = normalizeNoteBody(input.replyBody);
    if (!body || body.length > MAX_PUBLIC_REPLY_CHARS || noteBodyIsUnsafe(body)) {
      return providerError<TicketPublicReplyPrepared>('unsafe_operation', 'Mock provider rejected an unsafe public reply body.', false);
    }
    const actionPayload: TicketPublicReplyActionPayload = {
      ticketId: input.ticketId,
      visibility: 'public',
      body,
      bodyFormat: 'plain_text',
    };
    const data: TicketPublicReplyPrepared = {
      actionPayload,
      summary: `Prepared public reply for ticket ${input.ticketId}.`,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_public_reply_prepared', input.ticketId, data.summary, {
        ticketId: input.ticketId,
        visibility: actionPayload.visibility,
        bodyPreview: body.slice(0, 240),
      }),
    ]);
  }

  async addPublicReply(
    context: ProviderContext,
    input: { actionPayload: TicketPublicReplyActionPayload; idempotencyKey: string },
  ): Promise<AdapterResult<TicketPublicReplyWriteResult>> {
    void context;
    const { actionPayload } = input;
    const scenario = errorForScenario<TicketPublicReplyWriteResult>(`${actionPayload.ticketId} ${actionPayload.body}`);
    if (scenario) {
      return scenario;
    }
    const body = normalizeNoteBody(actionPayload.body);
    if (
      actionPayload.visibility !== 'public'
      || actionPayload.bodyFormat !== 'plain_text'
      || !body
      || body.length > MAX_PUBLIC_REPLY_CHARS
      || noteBodyIsUnsafe(body)
    ) {
      return providerError<TicketPublicReplyWriteResult>('unsafe_operation', 'Mock provider refused a non-public or unsafe reply write.', false);
    }
    const alreadyApplied = body.includes('already-applied') || input.idempotencyKey.includes('already-applied');
    const data: TicketPublicReplyWriteResult = {
      noteId: alreadyApplied ? 'mock-public-reply-existing' : `mock-public-reply-${input.idempotencyKey.slice(0, 12)}`,
      ticketId: actionPayload.ticketId,
      summary: alreadyApplied
        ? `Public reply for ticket ${actionPayload.ticketId} was already applied.`
        : `Public reply added to ticket ${actionPayload.ticketId}.`,
      idempotencyKey: input.idempotencyKey,
      alreadyApplied,
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_public_reply_added', actionPayload.ticketId, data.summary, {
        noteId: data.noteId,
        ticketId: data.ticketId,
        alreadyApplied,
        idempotencyKey: input.idempotencyKey,
      }),
    ], alreadyApplied ? ['already_applied'] : undefined);
  }
}
