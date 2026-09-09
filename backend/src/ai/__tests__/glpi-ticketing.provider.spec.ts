import * as assert from 'node:assert/strict';
import { GlpiTicketingProvider } from '../control-plane/providers/glpi-ticketing.provider';
import {
  DEFAULT_TICKET_ACTOR_ROLE,
  ProviderContext,
  TicketActorRole,
  ticketActorRoleFromResponsePolicy,
} from '../control-plane/providers/provider.types';

type ActorCall = { ticketId: number; usersId: number; type: number };

function createProvider(): { provider: GlpiTicketingProvider; actorCalls: ActorCall[] } {
  const actorCalls: ActorCall[] = [];
  const glpi = {
    initSession: async () => ({ sessionToken: 'session-1', baseUrl: 'https://glpi.internal', agentUserId: 42 }),
    killSession: async () => undefined,
    addTicketFollowup: async (_session: unknown, ticketId: number, content: string, opts?: { isPrivate?: boolean }) => ({
      id: 900,
      ticket_id: ticketId,
      content,
      is_private: opts?.isPrivate === true,
    }),
    addTicketUser: async (_session: unknown, ticketId: number, usersId: number, type: number) => {
      actorCalls.push({ ticketId, usersId, type });
      return { added: true, alreadyPresent: false };
    },
  };
  const provider = new GlpiTicketingProvider({} as any, glpi as any);
  return { provider, actorCalls };
}

function context(): ProviderContext {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    isPlatformHost: false,
    surface: 'internal',
    authMethod: 'jwt',
    manager: {} as any,
  } as unknown as ProviderContext;
}

async function publicReplyWith(role: TicketActorRole | undefined): Promise<ActorCall[]> {
  const { provider, actorCalls } = createProvider();
  const result = await provider.addPublicReply(context(), {
    actionPayload: { ticketId: '17', visibility: 'public', body: 'Hello, please restart the printer.', bodyFormat: 'plain_text' },
    idempotencyKey: 'idem-1',
    ...(role ? { agentActorRole: role } : {}),
  });
  assert.equal(result.ok, true, 'public reply write should succeed');
  return actorCalls;
}

async function internalNoteWith(role: TicketActorRole | undefined): Promise<ActorCall[]> {
  const { provider, actorCalls } = createProvider();
  const result = await provider.addInternalNote(context(), {
    actionPayload: { ticketId: '17', visibility: 'internal', body: 'Triage note.', bodyFormat: 'plain_text' },
    idempotencyKey: 'idem-2',
    ...(role ? { agentActorRole: role } : {}),
  });
  assert.equal(result.ok, true, 'internal note write should succeed');
  return actorCalls;
}

async function testPublicReplyDefaultsToAssignee() {
  const calls = await publicReplyWith(undefined);
  assert.deepEqual(calls, [{ ticketId: 17, usersId: 42, type: 2 }]);
}

async function testPublicReplyObserverRoleFollowsOnly() {
  const calls = await publicReplyWith('observer');
  assert.deepEqual(calls, [{ ticketId: 17, usersId: 42, type: 3 }]);
}

async function testPublicReplyNoneRoleNeverTouchesActors() {
  const calls = await publicReplyWith('none');
  assert.deepEqual(calls, []);
}

async function testPublicReplyNoneRoleReportsSkipReasonInEvidence() {
  const { provider } = createProvider();
  const result = await provider.addPublicReply(context(), {
    actionPayload: { ticketId: '17', visibility: 'public', body: 'Hello.', bodyFormat: 'plain_text' },
    idempotencyKey: 'idem-3',
    agentActorRole: 'none',
  });
  assert.equal(result.ok, true);
  const payload = (result.ok ? result.evidence[0]?.redactedPayload : null) as Record<string, unknown>;
  assert.equal(payload.agentAssigneeAdded, false);
  assert.equal(payload.agentAssigneeSkippedReason, 'disabled_by_agent_policy');
}

async function testInternalNoteIsObserverUnlessNone() {
  assert.deepEqual(await internalNoteWith(undefined), [{ ticketId: 17, usersId: 42, type: 3 }]);
  assert.deepEqual(await internalNoteWith('assignee'), [{ ticketId: 17, usersId: 42, type: 3 }]);
  assert.deepEqual(await internalNoteWith('observer'), [{ ticketId: 17, usersId: 42, type: 3 }]);
  assert.deepEqual(await internalNoteWith('none'), []);
}

function testActorRoleParsingFallsBackToDefault() {
  assert.equal(DEFAULT_TICKET_ACTOR_ROLE, 'assignee');
  assert.equal(ticketActorRoleFromResponsePolicy(null), 'assignee');
  assert.equal(ticketActorRoleFromResponsePolicy({}), 'assignee');
  assert.equal(ticketActorRoleFromResponsePolicy({ ticket_actor_role: 'bogus' }), 'assignee');
  assert.equal(ticketActorRoleFromResponsePolicy({ ticket_actor_role: 'observer' }), 'observer');
  assert.equal(ticketActorRoleFromResponsePolicy({ ticket_actor_role: 'none' }), 'none');
}

async function run() {
  await testPublicReplyDefaultsToAssignee();
  await testPublicReplyObserverRoleFollowsOnly();
  await testPublicReplyNoneRoleNeverTouchesActors();
  await testPublicReplyNoneRoleReportsSkipReasonInEvidence();
  await testInternalNoteIsObserverUnlessNone();
  testActorRoleParsingFallsBackToDefault();
  console.log('glpi-ticketing.provider.spec: ok');
}

void run();
