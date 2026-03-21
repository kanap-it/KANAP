import * as assert from 'node:assert/strict';
import { AuthController } from '../auth.controller';
import { REFRESH_TOKEN_COOKIE_NAME } from '../auth-cookie.util';

function createController(authOverrides?: Partial<Record<'refreshAccessToken' | 'revokeToken', any>>) {
  const auth = {
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
    {} as any,
    {} as any,
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
  const { controller } = createController({
    refreshAccessToken: async (...args: any[]) => {
      capturedArgs = args;
      return {
        access_token: 'new-access-token',
        expires_in: 900,
        refresh_expires_in: 14_400,
      };
    },
  });
  const { response, calls } = createResponseRecorder();
  const manager = { id: 'manager-1' };

  const result = await controller.refreshToken(
    { refresh_token: 'refresh-token-1' },
    {
      tenant: { id: 'tenant-1' },
      queryRunner: { manager },
      secure: false,
      headers: {},
    },
    response,
  );

  assert.deepEqual(capturedArgs, ['refresh-token-1', 'tenant-1', manager]);
  assert.equal(result.access_token, 'new-access-token');
  assert.equal(calls[0]?.name, REFRESH_TOKEN_COOKIE_NAME);
  assert.equal(calls[0]?.value, 'refresh-token-1');
}

async function testLogoutPassesTenantIdToAuthService() {
  let capturedArgs: any[] | null = null;
  const { controller } = createController({
    revokeToken: async (...args: any[]) => {
      capturedArgs = args;
    },
  });
  const { response, calls } = createResponseRecorder();
  const manager = { id: 'manager-1' };

  const result = await controller.logout(
    { refresh_token: 'refresh-token-1' },
    {
      tenant: { id: 'tenant-1' },
      queryRunner: { manager },
      headers: {},
    },
    response,
  );

  assert.deepEqual(capturedArgs, ['refresh-token-1', 'tenant-1', manager]);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0]?.name, REFRESH_TOKEN_COOKIE_NAME);
  assert.equal(calls[0]?.options?.maxAge, 0);
}

async function run() {
  await testRefreshPassesTenantIdToAuthService();
  await testLogoutPassesTenantIdToAuthService();
}

void run();
