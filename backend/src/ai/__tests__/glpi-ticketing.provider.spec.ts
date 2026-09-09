import * as assert from 'node:assert/strict';
import { GlpiTicketingProvider } from '../control-plane/providers/glpi-ticketing.provider';
import {
  DEFAULT_TICKET_ACTOR_ROLE,
  ProviderContext,
  TicketActorRole,
  ticketActorRoleFromResponsePolicy,
} from '../control-plane/providers/provider.types';

type ActorCall = { ticketId: number; usersId: number; type: number };
type GroupCall = { ticketId: number; groupsId: number };

const ASSIGNABLE_GROUPS = [
  { id: 7, name: 'Tech-desk', completename: 'Tech-desk' },
  { id: 12, name: 'SAP-team', completename: 'Support > SAP-team' },
];

function createProvider(): { provider: GlpiTicketingProvider; actorCalls: ActorCall[]; groupCalls: GroupCall[] } {
  const actorCalls: ActorCall[] = [];
  const groupCalls: GroupCall[] = [];
  const glpi = {
    listAssignableGroups: async () => ASSIGNABLE_GROUPS,
    getTicketUsers: async () => [
      { id: 1, user_id: 202, user_label: 'Bob Requester', role: 'requester' },
      { id: 2, user_id: 303, user_label: 'Alice Technician', role: 'assigned' },
    ],
    getTicketGroups: async (_session: unknown, ticketId: number) => (ticketId === 17
      ? [{ id: 5, group_id: 7, group_label: null, role: 'assigned' }]
      : []),
    addTicketGroup: async (_session: unknown, ticketId: number, groupsId: number) => {
      groupCalls.push({ ticketId, groupsId });
      const group = ASSIGNABLE_GROUPS.find((candidate) => candidate.id === groupsId);
      if (!group) throw new Error('not assignable');
      return { added: true, alreadyPresent: false, group };
    },
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
  return { provider, actorCalls, groupCalls };
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

async function testRoutingContextExposesAssignedGroupsAndCatalogue() {
  const { provider } = createProvider();
  const result = await provider.getTicketRoutingContext(context(), { ticketId: '17' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.assignmentSupported, true);
  assert.equal(result.data.assignee, 'Alice Technician');
  assert.equal(result.data.group, 'Tech-desk');
  assert.deepEqual(result.data.assignedGroups, [{ kind: 'group', key: '7', label: 'Tech-desk' }]);
  assert.deepEqual(result.data.supportedAssignmentTargets.map((target) => target.label), ['Tech-desk', 'Support > SAP-team']);
  // The catalogue is prompt input, not ticket evidence.
  const payload = result.evidence[0]?.redactedPayload as Record<string, unknown>;
  assert.equal(payload.supportedAssignmentTargets, undefined);
  assert.equal(payload.supportedAssignmentTargetCount, 2);
}

async function testPrepareAssignmentAcceptsCatalogueGroupsOnly() {
  const { provider } = createProvider();
  const prepared = await provider.prepareTicketAssignmentUpdate(context(), {
    ticketId: '17',
    target: { kind: 'group', key: '12', label: 'whatever the model wrote' },
    reason: 'Instructions route SAP questions to SAP-team.',
  });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  // Label comes from the catalogue, never from the caller; additive write on Group_Ticket type 2.
  assert.deepEqual(prepared.data.actionPayload.target, { kind: 'group', key: '12', label: 'Support > SAP-team' });
  assert.deepEqual(prepared.data.actionPayload.providerFields, { groups_id: 12, type: 2, operation: 'add' });

  const alreadyPresent = await provider.prepareTicketAssignmentUpdate(context(), {
    ticketId: '17',
    target: { kind: 'group', key: '7', label: 'Tech-desk' },
    reason: 'Default queue.',
  });
  assert.equal(alreadyPresent.ok, false);
  assert.match(alreadyPresent.ok ? '' : alreadyPresent.message, /already assigned/);

  const unknown = await provider.prepareTicketAssignmentUpdate(context(), {
    ticketId: '17',
    target: { kind: 'group', key: '99', label: 'Ghost-team' },
    reason: 'Invented.',
  });
  assert.equal(unknown.ok, false);

  const user = await provider.prepareTicketAssignmentUpdate(context(), {
    ticketId: '17',
    target: { kind: 'user', key: '303', label: 'Alice Technician' },
    reason: 'Users are out of scope.',
  });
  assert.equal(user.ok, false);
}

async function testUpdateAssignmentWritesGroupTicket() {
  const { provider, groupCalls } = createProvider();
  const result = await provider.updateTicketAssignment(context(), {
    actionPayload: {
      ticketId: '17',
      action: 'assignment_update',
      current: { ticketId: '17', supportedAssignmentTargets: [], assignmentSupported: true, supported: true },
      target: { kind: 'group', key: '12', label: 'Support > SAP-team' },
      reason: 'Route to SAP.',
    },
    idempotencyKey: 'idem-4',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(groupCalls, [{ ticketId: 17, groupsId: 12 }]);
  assert.deepEqual(result.data.updatedFields, ['assignment']);
  assert.match(result.data.summary, /assigned to Support > SAP-team/);
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
  await testRoutingContextExposesAssignedGroupsAndCatalogue();
  await testPrepareAssignmentAcceptsCatalogueGroupsOnly();
  await testUpdateAssignmentWritesGroupTicket();
  testActorRoleParsingFallsBackToDefault();
  console.log('glpi-ticketing.provider.spec: ok');
}

void run();
