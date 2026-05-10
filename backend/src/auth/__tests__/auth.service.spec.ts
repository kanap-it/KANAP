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

  const service = new AuthService({} as any, repo as any, repo as any);
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

async function testPasswordResetConsumesTokenAndRevokesSessions() {
  process.env.JWT_SECRET = 'auth-service-spec-secret';
  const resetTokenRepoState = {
    saved: [] as any[],
    updates: [] as any[],
  };
  const resetTokenRepo = {
    create: (value: any) => ({ id: 'reset-token-1', ...value }),
    save: async (value: any) => {
      resetTokenRepoState.saved.push(value);
      return value;
    },
    findOne: async (query: any) => {
      const hash = query?.where?.token_hash;
      const saved = resetTokenRepoState.saved.find((entry) => entry.token_hash === hash);
      if (!saved || saved.used_at) return null;
      return saved;
    },
    update: async (where: any, value: any) => {
      resetTokenRepoState.updates.push({ where, value });
      const saved = resetTokenRepoState.saved.find((entry) => entry.id === where.id && entry.used_at === null);
      if (!saved) return { affected: 0 };
      saved.used_at = value.used_at;
      return { affected: 1 };
    },
  };
  const refreshRepo = {
    delete: async (value: any) => {
      assert.deepEqual(value, { user_id: 'user-1' });
      return { affected: 2 };
    },
  };
  const users = {
    findById: async () => ({
      id: 'user-1',
      email: 'user@example.com',
      tenant_id: 'tenant-1',
      status: 'enabled',
      role: { role_name: 'Member' },
    }),
    updateUser: async () => ({ id: 'user-1' }),
  };
  const service = new AuthService(users as any, refreshRepo as any, resetTokenRepo as any);

  const token = await service.createPasswordResetToken({
    id: 'user-1',
    email: 'user@example.com',
    tenant_id: 'tenant-1',
  });

  await service.resetPasswordWithToken(token, 'NextPassword!2026');

  assert.equal(resetTokenRepoState.updates.length, 1);
  await assert.rejects(() => service.resetPasswordWithToken(token, 'OtherPassword!2026'));
}

async function run() {
  await testSignTokensIncludeTenantIdInAccessAndRefreshTokens();
  await testRefreshAccessTokenRejectsTenantMismatchAndMintsTenantBoundTokens();
  await testRevokeTokenDeletesByHashAndTenant();
  await testPasswordResetConsumesTokenAndRevokesSessions();
}

void run();
