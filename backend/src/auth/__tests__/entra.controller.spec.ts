import * as assert from 'node:assert/strict';
import { EntraController } from '../entra.controller';

function createMockDataSource(repo: any) {
  const state = {
    started: 0,
    committed: 0,
    rolledBack: 0,
    released: 0,
    tenantQueries: [] as Array<{ sql: string; params?: any[] }>,
  };

  const manager = {
    getRepository: () => repo,
  };

  const runner = {
    isTransactionActive: false,
    manager,
    connect: async () => {},
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
      state.tenantQueries.push({ sql, params });
      return [];
    },
  };

  return {
    state,
    manager,
    dataSource: {
      createQueryRunner: () => runner,
    },
  };
}

async function testHandleLoginCallbackSignsTokensWithTenantBoundManager() {
  const existingUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: { role_name: 'Contact' },
    first_name: '',
    last_name: '',
    job_title: null,
    business_phone: null,
    mobile_phone: null,
  };

  const repo = {
    findOne: async () => existingUser,
    save: async (value: any) => value,
    createQueryBuilder: () => ({
      leftJoinAndSelect: () => repo.createQueryBuilder(),
      where: async () => existingUser,
      getOne: async () => existingUser,
    }),
  };

  const { dataSource, manager, state } = createMockDataSource(repo);
  const signTokenCalls: any[][] = [];
  let redirectTarget = '';
  const cookieCalls: Array<{ name: string; value: string; options: Record<string, any> }> = [];

  const controller = new EntraController(
    {} as any,
    {} as any,
    {
      signTokens: async (...args: any[]) => {
        signTokenCalls.push(args);
        return {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 900,
          refresh_expires_in: 14_400,
        };
      },
    } as any,
    {} as any,
    dataSource as any,
  );

  await (controller as any).handleLoginCallback(
    'tenant-1',
    'alpha',
    '/dashboard',
    {
      oid: 'entra-oid-1',
      email: 'user@example.com',
    },
    null,
    {
      headers: {
        host: 'alpha.lvh.me',
      },
      protocol: 'http',
    },
    {
      cookie: (name: string, value: string, options: Record<string, any>) => {
        cookieCalls.push({ name, value, options });
      },
      redirect: (value: string) => {
        redirectTarget = value;
      },
    } as any,
  );

  assert.equal(signTokenCalls.length, 1);
  assert.deepEqual(signTokenCalls[0]?.[0], {
    id: 'user-1',
    email: 'user@example.com',
    role: { role_name: 'Contact' },
    tenant_id: 'tenant-1',
  });
  assert.equal(signTokenCalls[0]?.[1], manager);
  assert.equal(state.started, 1);
  assert.equal(state.committed, 1);
  assert.equal(state.rolledBack, 0);
  assert.equal(state.released, 1);
  assert.equal(state.tenantQueries[0]?.params?.[0], 'tenant-1');
  assert.equal(cookieCalls[0]?.name, 'refresh_token');
  assert.match(redirectTarget, /^http:\/\/alpha\.lvh\.me\/login\/callback#/);
}

async function run() {
  await testHandleLoginCallbackSignsTokensWithTenantBoundManager();
}

void run();
