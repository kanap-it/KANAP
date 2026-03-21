import * as assert from 'node:assert/strict';
import { withTenant, withTenantExecution } from '../tenant-runner';

function createMockDataSource() {
  const state = {
    connected: false,
    started: 0,
    committed: 0,
    rolledBack: 0,
    released: 0,
    queries: [] as Array<{ sql: string; params?: any[] }>,
  };

  const runner = {
    isTransactionActive: false,
    manager: { tag: 'manager' },
    connect: async () => {
      state.connected = true;
    },
    startTransaction: async () => {
      state.started += 1;
      runner.isTransactionActive = true;
    },
    commitTransaction: async () => {
      state.committed += 1;
      runner.isTransactionActive = false;
    },
    rollbackTransaction: async () => {
      state.rolledBack += 1;
      runner.isTransactionActive = false;
    },
    release: async () => {
      state.released += 1;
    },
    query: async (sql: string, params?: any[]) => {
      state.queries.push({ sql, params });
      return [];
    },
  };

  return {
    state,
    dataSource: {
      createQueryRunner: () => runner,
    },
  };
}

async function testWithTenantExecutionStartsTransactionByDefault() {
  const { state, dataSource } = createMockDataSource();
  const result = await withTenantExecution(
    dataSource as any,
    'tenant-1',
    async (manager) => manager as any,
  );

  assert.equal((result as any).tag, 'manager');
  assert.equal(state.started, 1);
  assert.equal(state.committed, 1);
  assert.equal(state.rolledBack, 0);
  assert.equal(state.released, 1);
  assert.equal(state.queries.length, 1);
  assert.equal(
    state.queries[0]?.sql,
    `SELECT set_config('app.current_tenant', $1, true)`,
  );
  assert.equal(state.queries[0]?.params?.[0], 'tenant-1');
}

async function testWithTenantExecutionAllowsExplicitTransactionOptOut() {
  const { state, dataSource } = createMockDataSource();
  const result = await withTenantExecution(
    dataSource as any,
    'tenant-opt-out',
    async (manager) => manager as any,
    { transaction: false },
  );

  assert.equal((result as any).tag, 'manager');
  assert.equal(state.started, 0);
  assert.equal(state.committed, 0);
  assert.equal(state.rolledBack, 0);
  assert.equal(state.released, 1);
  assert.equal(state.queries.length, 2);
  assert.equal(
    state.queries[0]?.sql,
    `SELECT set_config('app.current_tenant', $1, false)`,
  );
  assert.equal(state.queries[0]?.params?.[0], 'tenant-opt-out');
  assert.equal(
    state.queries[1]?.sql,
    `SELECT set_config('app.current_tenant', '', false)`,
  );
}

async function testWithTenantStartsTransaction() {
  const { state, dataSource } = createMockDataSource();
  await withTenant(
    dataSource as any,
    'tenant-2',
    async () => 'ok',
  );

  assert.equal(state.started, 1);
  assert.equal(state.committed, 1);
  assert.equal(state.rolledBack, 0);
  assert.equal(state.released, 1);
}

async function testWithTenantExecutionRollsBackTransactionErrors() {
  const { state, dataSource } = createMockDataSource();
  await assert.rejects(
    () => withTenantExecution(
      dataSource as any,
      'tenant-3',
      async () => {
        throw new Error('boom');
      },
    ),
    /boom/,
  );

  assert.equal(state.started, 1);
  assert.equal(state.committed, 0);
  assert.equal(state.rolledBack, 1);
  assert.equal(state.released, 1);
}

async function run() {
  await testWithTenantExecutionStartsTransactionByDefault();
  await testWithTenantExecutionAllowsExplicitTransactionOptOut();
  await testWithTenantStartsTransaction();
  await testWithTenantExecutionRollsBackTransactionErrors();
}

void run();
