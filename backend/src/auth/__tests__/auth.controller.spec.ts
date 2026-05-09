import * as assert from 'node:assert/strict';
import { AuthController } from '../auth.controller';
import { REFRESH_TOKEN_COOKIE_NAME } from '../auth-cookie.util';

function createTenantDataSource(manager: any = { id: 'tenant-manager-1' }) {
  const queries: Array<{ sql: string; params?: any[] }> = [];
  const runner = {
    manager,
    isTransactionActive: false,
    connect: async () => undefined,
    startTransaction: async () => {
      runner.isTransactionActive = true;
    },
    query: async (sql: string, params?: any[]) => {
      queries.push({ sql, params });
    },
    commitTransaction: async () => {
      runner.isTransactionActive = false;
    },
    rollbackTransaction: async () => {
      runner.isTransactionActive = false;
    },
    release: async () => undefined,
  };
  return {
    manager,
    queries,
    dataSource: {
      createQueryRunner: () => runner,
    } as any,
  };
}

function createController(
  authOverrides?: Partial<Record<'validateUser' | 'signTokens' | 'refreshAccessToken' | 'revokeToken', any>>,
  dataSource?: any,
) {
  const auth = {
    validateUser: async () => ({
      id: 'user-1',
      email: 'user@example.com',
      role: 'member',
      tenant_id: 'tenant-1',
    }),
    signTokens: async () => ({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 900,
      refresh_expires_in: 14_400,
    }),
    refreshAccessToken: async () => ({
      access_token: 'access-token',
      expires_in: 900,
      refresh_expires_in: 14_400,
    }),
    revokeToken: async () => undefined,
    ...authOverrides,
  };

  const controller = new AuthController(
    auth as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { maybeRefreshOnLogin: async () => undefined } as any,
    dataSource ?? createTenantDataSource().dataSource,
    {} as any,
  );

  return { controller, auth };
}

function createResponseRecorder() {
  const calls: Array<{ name: string; value: string; options: Record<string, any> }> = [];
  return {
    calls,
    response: {
      cookie: (name: string, value: string, options: Record<string, any>) => {
        calls.push({ name, value, options });
      },
    } as any,
  };
}

async function testRefreshPassesTenantIdToAuthService() {
  let capturedArgs: any[] | null = null;
  const tenantDb = createTenantDataSource();
  const { controller } = createController({
    refreshAccessToken: async (...args: any[]) => {
      capturedArgs = args;
      return {
        access_token: 'new-access-token',
        expires_in: 900,
        refresh_expires_in: 14_400,
      };
    },
  }, tenantDb.dataSource);
  const { response, calls } = createResponseRecorder();

  const result = await controller.refreshToken(
    { refresh_token: 'refresh-token-1' },
    {
      tenant: { id: 'tenant-1' },
      queryRunner: { manager: { id: 'request-manager-1' } },
      secure: false,
      headers: {},
    },
    response,
  );

  assert.deepEqual(capturedArgs, ['refresh-token-1', 'tenant-1', tenantDb.manager]);
  assert.deepEqual(tenantDb.queries[0]?.params, ['tenant-1']);
  assert.equal(result.access_token, 'new-access-token');
  assert.equal(calls[0]?.name, REFRESH_TOKEN_COOKIE_NAME);
  assert.equal(calls[0]?.value, 'refresh-token-1');
}

async function testLogoutPassesTenantIdToAuthService() {
  let capturedArgs: any[] | null = null;
  const tenantDb = createTenantDataSource();
  const { controller } = createController({
    revokeToken: async (...args: any[]) => {
      capturedArgs = args;
    },
  }, tenantDb.dataSource);
  const { response, calls } = createResponseRecorder();

  const result = await controller.logout(
    { refresh_token: 'refresh-token-1' },
    {
      tenant: { id: 'tenant-1' },
      queryRunner: { manager: { id: 'request-manager-1' } },
      headers: {},
    },
    response,
  );

  assert.deepEqual(capturedArgs, ['refresh-token-1', 'tenant-1', tenantDb.manager]);
  assert.deepEqual(tenantDb.queries[0]?.params, ['tenant-1']);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0]?.name, REFRESH_TOKEN_COOKIE_NAME);
  assert.equal(calls[0]?.options?.maxAge, 0);
}

async function testLoginUsesTenantRunnerEvenWhenRequestRunnerIsReleased() {
  const tenantDb = createTenantDataSource();
  let validateManager: any = null;
  let signManager: any = null;
  const { controller } = createController({
    validateUser: async (_email: string, _password: string, manager: any) => {
      validateManager = manager;
      return {
        id: 'user-1',
        email: 'user@example.com',
        role: 'member',
        tenant_id: 'tenant-1',
      };
    },
    signTokens: async (_payload: any, manager: any) => {
      signManager = manager;
      return {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 900,
        refresh_expires_in: 14_400,
      };
    },
  }, tenantDb.dataSource);
  const { response, calls } = createResponseRecorder();

  const result = await controller.login(
    { email: 'user@example.com', password: 'Password!2026' },
    {
      tenant: { id: 'tenant-1' },
      queryRunner: { isReleased: true, manager: { id: 'released-manager' } },
      secure: false,
    },
    response,
  );

  assert.equal(validateManager, tenantDb.manager);
  assert.equal(signManager, tenantDb.manager);
  assert.deepEqual(tenantDb.queries[0]?.params, ['tenant-1']);
  assert.equal(result.refresh_token, 'refresh-token');
  assert.equal(calls[0]?.name, REFRESH_TOKEN_COOKIE_NAME);
}

async function run() {
  await testRefreshPassesTenantIdToAuthService();
  await testLogoutPassesTenantIdToAuthService();
  await testLoginUsesTenantRunnerEvenWhenRequestRunnerIsReleased();
}

void run();
