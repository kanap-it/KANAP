import * as assert from 'node:assert/strict';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createService() {
  const state = {
    findOneArgs: [] as any[],
    saveArgs: [] as any[],
    deleteArgs: [] as any[],
  };

  const repo = {
    create: (value: any) => ({ ...value }),
    save: async (value: any) => {
      state.saveArgs.push(value);
      return value;
    },
    findOne: async (value: any) => {
      state.findOneArgs.push(value);
      return null;
    },
    delete: async (value: any) => {
      state.deleteArgs.push(value);
      return { affected: 1 };
    },
  };

  const service = new AuthService({} as any, repo as any);
  return { service, repo, state };
}

async function testSignTokensIncludeTenantIdInAccessAndRefreshTokens() {
  process.env.JWT_SECRET = 'auth-service-spec-secret';
  const { service, state } = createService();

  const result = await service.signTokens({
    id: 'user-1',
    email: 'user@example.com',
    role: { role_name: 'Member' },
    tenant_id: 'tenant-1',
  });

  const payload = jwt.verify(result.access_token, process.env.JWT_SECRET as string) as Record<string, any>;

  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.tenant_id, 'tenant-1');
  assert.equal(state.saveArgs.length, 1);
  assert.equal(state.saveArgs[0]?.tenant_id, 'tenant-1');
}

async function testRefreshAccessTokenRejectsTenantMismatchAndMintsTenantBoundTokens() {
  process.env.JWT_SECRET = 'auth-service-spec-secret';
  const refreshToken = 'refresh-token-raw';
  const expectedHash = hashToken(refreshToken);
  const { service, repo, state } = createService();

  repo.findOne = async (value: any) => {
    state.findOneArgs.push(value);
    if (value?.where?.token_hash === expectedHash && value?.where?.tenant_id === 'tenant-1') {
      return {
        id: 'refresh-record-1',
        tenant_id: 'tenant-1',
        expires_at: new Date(Date.now() + 60_000),
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role: { role_name: 'Member' },
        },
      };
    }
    return null;
  };

  await assert.rejects(
    () => service.refreshAccessToken(refreshToken, 'tenant-2'),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      return true;
    },
  );

  assert.deepEqual(state.findOneArgs[0]?.where, {
    token_hash: expectedHash,
    tenant_id: 'tenant-2',
  });

  const refreshed = await service.refreshAccessToken(refreshToken, 'tenant-1');
  const payload = jwt.verify(refreshed.access_token, process.env.JWT_SECRET as string) as Record<string, any>;

  assert.deepEqual(state.findOneArgs[1]?.where, {
    token_hash: expectedHash,
    tenant_id: 'tenant-1',
  });
  assert.equal(payload.tenant_id, 'tenant-1');
  assert.equal(state.saveArgs.length, 1);
}

async function testRevokeTokenDeletesByHashAndTenant() {
  const refreshToken = 'refresh-token-raw';
  const expectedHash = hashToken(refreshToken);
  const { service, state } = createService();

  await service.revokeToken(refreshToken, 'tenant-1');

  assert.deepEqual(state.deleteArgs[0], {
    token_hash: expectedHash,
    tenant_id: 'tenant-1',
  });
}

async function run() {
  await testSignTokensIncludeTenantIdInAccessAndRefreshTokens();
  await testRefreshAccessTokenRejectsTenantMismatchAndMintsTenantBoundTokens();
  await testRevokeTokenDeletesByHashAndTenant();
}

void run();
