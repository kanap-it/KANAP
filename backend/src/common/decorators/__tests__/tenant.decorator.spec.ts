import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Tenant, TenantRequest } from '../tenant.decorator';

/**
 * @Tenant() used to hand back an empty tenantId when the host named no tenant, and the
 * request went on against no tenant at all. It now refuses, and the refusal is a client
 * error: the usual cause is the Host header (apex, localhost), not a server fault.
 */

function factoryOf(decorator: () => ParameterDecorator) {
  class Probe {
    handler(@decorator() _ctx: TenantRequest) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler');
  return args[Object.keys(args)[0]].factory as (data: unknown, ctx: ExecutionContext) => TenantRequest;
}

const contextFor = (request: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

function testRefusesARequestWithoutTenantAsAClientError() {
  const factory = factoryOf(Tenant);
  for (const request of [{ tenant: null, user: { sub: 'u1' } }, { user: { sub: 'u1' } }, {}]) {
    assert.throws(
      () => factory(undefined, contextFor(request)),
      (error: unknown) => {
        assert.ok(error instanceof BadRequestException, 'a 400, not a 500');
        assert.equal((error.getResponse() as { error: string }).error, 'TENANT_CONTEXT_MISSING');
        return true;
      },
    );
  }
}

function testReturnsTheResolvedContext() {
  const factory = factoryOf(Tenant);
  const manager = {};
  const ctx = factory(undefined, contextFor({
    tenant: { id: 'tenant-1' },
    user: { sub: 'user-1', roles: ['Administrator'] },
    queryRunner: { manager },
  }));
  assert.equal(ctx.tenantId, 'tenant-1');
  assert.equal(ctx.userId, 'user-1');
  assert.deepEqual(ctx.userRoles, ['Administrator']);
  assert.equal(ctx.manager, manager);
}

testRefusesARequestWithoutTenantAsAClientError();
testReturnsTheResolvedContext();
