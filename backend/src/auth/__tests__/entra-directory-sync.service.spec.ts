import * as assert from 'node:assert/strict';
import { EntraDirectorySyncService } from '../entra-directory-sync.service';

// Contract of the reporting line imported from Microsoft Entra: manager object
// ids are resolved to KANAP users in batches, written only on contributor rows,
// always through TeamMemberConfigService with `managerSource: 'entra'`, and one
// refusal never stops the others.

const TENANT = 'tenant-1';

type ContributorRow = {
  id: string;
  user_id: string;
  manager_user_id: string | null;
  manager_source: string | null;
};

function createService(rows: {
  users?: Array<{ id: string; external_subject: string }>;
  contributors?: ContributorRow[];
  refuse?: string[];
}) {
  const queries: Array<{ sql: string; params: any[] }> = [];
  const updates: Array<{ id: string; body: any; actorUserId: any; opts: any }> = [];

  const manager = {
    query: async (sql: string, params: any[] = []) => {
      queries.push({ sql, params });
      if (sql.includes('FROM users')) return rows.users ?? [];
      if (sql.includes('FROM portfolio_team_member_configs')) return rows.contributors ?? [];
      return [];
    },
  };

  const contributors = {
    update: async (id: string, body: any, actorUserId: any, opts: any) => {
      updates.push({ id, body, actorUserId, opts });
      if ((rows.refuse ?? []).includes(id)) {
        throw new Error('That person already reports to this contributor');
      }
      return { id };
    },
  };

  const service = new EntraDirectorySyncService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    contributors as any,
  );
  // The scheduled sync logs refusals; keep the test output clean.
  (service as any).logger = { warn: () => undefined, log: () => undefined };

  return { service, manager, queries, updates };
}

async function testResolvesAndWritesInBatches() {
  const { service, manager, queries, updates } = createService({
    users: [
      { id: 'user-boss', external_subject: 'entra-boss' },
      { id: 'user-boss-2', external_subject: 'entra-boss-2' },
    ],
    contributors: [
      { id: 'cfg-1', user_id: 'user-1', manager_user_id: null, manager_source: null },
      { id: 'cfg-2', user_id: 'user-2', manager_user_id: 'user-old', manager_source: 'manual' },
    ],
  });

  const result = await service.syncDirectoryManagers(
    TENANT,
    [
      { userId: 'user-1', managerExternalId: 'entra-boss' },
      { userId: 'user-2', managerExternalId: 'entra-boss-2' },
      // Same manager twice: the lookup must not repeat the id.
      { userId: 'user-3', managerExternalId: 'entra-boss' },
    ],
    manager as any,
  );

  assert.deepEqual(result, { updated: 2, unresolved: 0 });
  assert.equal(queries.length, 2, 'one users lookup and one contributor lookup, never per person');
  assert.match(queries[0].sql, /FROM users/);
  assert.equal(queries[0].params[0], TENANT, 'tenant predicate on the users lookup');
  assert.deepEqual(queries[0].params[1], ['entra-boss', 'entra-boss-2'], 'manager ids deduplicated');
  assert.match(queries[1].sql, /FROM portfolio_team_member_configs/);
  assert.equal(queries[1].params[0], TENANT, 'tenant predicate on the contributor lookup');
  assert.deepEqual(queries[1].params[1], ['user-1', 'user-2', 'user-3']);

  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0], {
    id: 'cfg-1',
    body: { manager_user_id: 'user-boss' },
    actorUserId: null,
    opts: { manager, managerSource: 'entra' },
  });
  assert.equal(updates[1].id, 'cfg-2');
  assert.equal(updates[1].body.manager_user_id, 'user-boss-2');
  assert.equal(updates[1].opts.managerSource, 'entra', 'the directory may rewrite what it owns');
}

async function testManualValueIsOverwrittenForADirectoryAccount() {
  const { service, manager, updates } = createService({
    users: [{ id: 'user-boss', external_subject: 'entra-boss' }],
    contributors: [{ id: 'cfg-1', user_id: 'user-1', manager_user_id: 'user-typed', manager_source: 'manual' }],
  });

  const result = await service.syncDirectoryManagers(
    TENANT,
    [{ userId: 'user-1', managerExternalId: 'entra-boss' }],
    manager as any,
  );

  assert.deepEqual(result, { updated: 1, unresolved: 0 });
  assert.equal(updates[0].body.manager_user_id, 'user-boss', 'the directory is authoritative for its own accounts');
}

async function testOrphanedEntraValueIsRewritten() {
  // The manager's account was deleted: the foreign key nulled the id and left
  // the source behind.
  const { service, manager, updates } = createService({
    users: [{ id: 'user-boss', external_subject: 'entra-boss' }],
    contributors: [{ id: 'cfg-1', user_id: 'user-1', manager_user_id: null, manager_source: 'entra' }],
  });

  const result = await service.syncDirectoryManagers(
    TENANT,
    [{ userId: 'user-1', managerExternalId: 'entra-boss' }],
    manager as any,
  );

  assert.deepEqual(result, { updated: 1, unresolved: 0 });
  assert.equal(updates[0].body.manager_user_id, 'user-boss');
}

async function testUnchangedValueIsNotRewritten() {
  const { service, manager, updates } = createService({
    users: [{ id: 'user-boss', external_subject: 'entra-boss' }],
    contributors: [{ id: 'cfg-1', user_id: 'user-1', manager_user_id: 'user-boss', manager_source: 'entra' }],
  });

  const result = await service.syncDirectoryManagers(
    TENANT,
    [{ userId: 'user-1', managerExternalId: 'entra-boss' }],
    manager as any,
  );

  assert.deepEqual(result, { updated: 0, unresolved: 0 }, 'steady state writes nothing');
  assert.equal(updates.length, 0, 'no audit entry for a change nobody made');
}

async function testManagerWithoutAKanapAccountIsLeftAlone() {
  const { service, manager, updates } = createService({
    users: [],
    contributors: [{ id: 'cfg-1', user_id: 'user-1', manager_user_id: 'user-old', manager_source: 'entra' }],
  });

  const result = await service.syncDirectoryManagers(
    TENANT,
    [{ userId: 'user-1', managerExternalId: 'entra-stranger' }],
    manager as any,
  );

  assert.deepEqual(result, { updated: 0, unresolved: 1 });
  assert.equal(updates.length, 0, 'an unresolved manager never clears what is stored');
}

async function testUserWithoutAContributorRowIsIgnored() {
  const { service, manager, queries, updates } = createService({
    users: [{ id: 'user-boss', external_subject: 'entra-boss' }],
    contributors: [],
  });

  const result = await service.syncDirectoryManagers(
    TENANT,
    [{ userId: 'user-1', managerExternalId: 'entra-boss' }],
    manager as any,
  );

  assert.deepEqual(result, { updated: 0, unresolved: 0 }, 'non-contributors carry no reporting line');
  assert.equal(updates.length, 0);
  assert.equal(queries.length, 2);
}

async function testRefusedAssignmentDoesNotStopTheBatch() {
  const { service, manager, updates } = createService({
    users: [{ id: 'user-boss', external_subject: 'entra-boss' }],
    contributors: [
      { id: 'cfg-1', user_id: 'user-1', manager_user_id: null, manager_source: null },
      { id: 'cfg-2', user_id: 'user-2', manager_user_id: null, manager_source: null },
    ],
    refuse: ['cfg-1'],
  });

  const result = await service.syncDirectoryManagers(
    TENANT,
    [
      { userId: 'user-1', managerExternalId: 'entra-boss' },
      { userId: 'user-2', managerExternalId: 'entra-boss' },
    ],
    manager as any,
  );

  assert.deepEqual(result, { updated: 1, unresolved: 1 });
  assert.equal(updates.length, 2, 'the refusal is per contributor, the batch carries on');
}

async function testNothingToResolveTouchesTheDatabase() {
  const { service, manager, queries } = createService({});

  const result = await service.syncDirectoryManagers(
    TENANT,
    [{ userId: 'user-1', managerExternalId: null }],
    manager as any,
  );

  assert.deepEqual(result, { updated: 0, unresolved: 0 });
  assert.equal(queries.length, 0, 'a sign-in without a directory manager costs no query');
}

async function run() {
  await testResolvesAndWritesInBatches();
  await testManualValueIsOverwrittenForADirectoryAccount();
  await testOrphanedEntraValueIsRewritten();
  await testUnchangedValueIsNotRewritten();
  await testManagerWithoutAKanapAccountIsLeftAlone();
  await testUserWithoutAContributorRowIsIgnored();
  await testRefusedAssignmentDoesNotStopTheBatch();
  await testNothingToResolveTouchesTheDatabase();
  console.log('entra-directory-sync.service.spec: all assertions passed');
}

void run();
