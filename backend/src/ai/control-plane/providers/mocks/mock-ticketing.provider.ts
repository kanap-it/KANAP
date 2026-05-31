import {
  AdapterResult,
  ProviderContext,
  SimilarTicket,
  TicketClassificationContext,
  TicketInternalNoteActionPayload,
  TicketInternalNotePrepared,
  TicketInternalNoteWriteResult,
  TicketingProvider,
  TicketNote,
  TicketRecord,
} from '../provider.types';
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

  async health(context: ProviderContext) {
    void context;
    return mockHealth(this.kind, this.providerKey);
  }

  async applicability(context: ProviderContext) {
    void context;
    return mockApplicability();
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
        author: 'Operations',
        body: input.ticketId.includes('malicious') ? MALICIOUS_EXTERNAL_TEXT : 'Checked Nutanix: VM healthy, CPU elevated only during batch.',
        createdAt: '2026-05-24T08:45:00.000Z',
      },
    ];
    return ok({ notes }, [
      evidenceSeed('ticketing:mock', 'ticket_notes', input.ticketId, `Ticket ${input.ticketId} notes.`, { notes }),
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
      impact: 'application_performance',
      urgency: 'medium',
    };
    return ok(data, [
      evidenceSeed('ticketing:mock', 'ticket_classification', input.ticketId, `Ticket ${input.ticketId} classification context.`, data),
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
}
