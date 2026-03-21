import * as assert from 'node:assert/strict';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';

function createContext(req: any) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'controller',
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as any;
}

function createAccessToken(tenantId: string) {
  return jwt.sign(
    {
      sub: 'user-1',
      email: 'user@example.com',
      role: { role_name: 'Member' },
      tenant_id: tenantId,
    },
    process.env.JWT_SECRET as string,
  );
}

async function testAllowsSameTenantRequests() {
  process.env.JWT_SECRET = 'jwt-auth-guard-spec-secret';
  const guard = new JwtAuthGuard({
    getAllAndOverride: () => false,
  } as any);
  const req: any = {
    headers: {
      authorization: `Bearer ${createAccessToken('tenant-1')}`,
    },
    tenant: { id: 'tenant-1' },
  };

  const allowed = guard.canActivate(createContext(req));

  assert.equal(allowed, true);
  assert.equal(req.user.tenant_id, 'tenant-1');
}

async function testRejectsMismatchedHostAndTokenTenant() {
  process.env.JWT_SECRET = 'jwt-auth-guard-spec-secret';
  const guard = new JwtAuthGuard({
    getAllAndOverride: () => false,
  } as any);
  const req: any = {
    headers: {
      authorization: `Bearer ${createAccessToken('tenant-1')}`,
    },
    tenant: { id: 'tenant-2' },
  };

  assert.throws(
    () => guard.canActivate(createContext(req)),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      return true;
    },
  );
}

async function testAllowsPlatformHostTenantMismatch() {
  process.env.JWT_SECRET = 'jwt-auth-guard-spec-secret';
  const guard = new JwtAuthGuard({
    getAllAndOverride: () => false,
  } as any);
  const req: any = {
    headers: {
      authorization: `Bearer ${createAccessToken('tenant-1')}`,
    },
    tenant: { id: 'tenant-2' },
    isPlatformHost: true,
  };

  const allowed = guard.canActivate(createContext(req));

  assert.equal(allowed, true);
  assert.equal(req.user.tenant_id, 'tenant-1');
}

async function run() {
  await testAllowsSameTenantRequests();
  await testRejectsMismatchedHostAndTokenTenant();
  await testAllowsPlatformHostTenantMismatch();
}

void run();
