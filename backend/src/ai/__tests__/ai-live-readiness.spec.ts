import * as assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiActionRequestService } from '../control-plane/action-request/ai-action-request.service';
import { AiCapabilityRegistry, providerCapabilityContracts } from '../control-plane/capability/ai-capability.registry';
import { AiActionRequest } from '../control-plane/entities/ai-action-request.entity';
import { AiAdapterConfig } from '../control-plane/providers/adapter-config.entity';
import { AiAdapterConfigService } from '../control-plane/providers/adapter-config.service';
import { AiEvidence } from '../control-plane/entities/ai-evidence.entity';
import { AiEvidenceService } from '../control-plane/evidence/ai-evidence.service';
import { AiLiveTestTarget } from '../control-plane/entities/ai-live-test-target.entity';
import { AiLiveContractHarnessService, LIVE_CONTRACT_SCENARIOS } from '../control-plane/live-readiness/ai-live-contract-harness.service';
import { AiLiveTestTargetService } from '../control-plane/live-readiness/ai-live-test-target.service';
import { AiProviderRegistryService } from '../control-plane/providers/provider-registry.service';
import {
  AiTenantSecretResolverService,
  tenantEnvironmentSecretEnvName,
  tenantSecretRefEnvName,
} from '../control-plane/providers/tenant-secret-resolver.service';

function createMemoryManager(tenants: Array<{ id: string; slug: string; deleted_at?: Date | null }> = [
  { id: 'tenant-1', slug: 'tenant-one' },
]) {
  const stores = new Map<string, any[]>();
  const matchesWhere = (row: any, where: any) =>
    Object.entries(where ?? {}).every(([key, value]) => row[key] === value);
  const repoFor = (entity: any) => {
    const name = typeof entity === 'function' ? entity.name : String(entity);
    const rows = stores.get(name) ?? [];
    stores.set(name, rows);
    return {
      create: (payload: any) => ({ id: payload.id ?? `${name}-${rows.length + 1}`, ...payload }),
      save: async (record: any) => {
        const existingIndex = rows.findIndex((row) => row.id === record.id);
        if (existingIndex >= 0) {
          rows[existingIndex] = record;
        } else {
          rows.push(record);
        }
        return record;
      },
      findOne: async (opts: any) => {
        const where = Array.isArray(opts?.where) ? opts.where[0] : opts?.where;
        return rows.find((row) => matchesWhere(row, where)) ?? null;
      },
      find: async (opts: any) => {
        const where = Array.isArray(opts?.where) ? opts.where[0] : opts?.where;
        return where ? rows.filter((row) => matchesWhere(row, where)) : [...rows];
      },
    };
  };
  return {
    stores,
    manager: {
      getRepository: repoFor,
      query: async (_sql: string, params: unknown[]) => {
        const tenantId = String(params[0] ?? '');
        return tenants
          .filter((tenant) => tenant.id === tenantId && tenant.deleted_at == null)
          .map((tenant) => ({ id: tenant.id, slug: tenant.slug }));
      },
    } as any,
  };
}

function createContext(manager: any, tenantId = 'tenant-1') {
  return {
    tenantId,
    userId: 'user-1',
    isPlatformHost: false,
    surface: 'chat' as const,
    authMethod: 'jwt' as const,
    manager,
  };
}

async function testTenantSecretResolverFailureModesAndDescriptors() {
  const { manager } = createMemoryManager();
  const context = createContext(manager);
  const resolver = new AiTenantSecretResolverService();
  const envName = tenantEnvironmentSecretEnvName({ tenantId: context.tenantId, key: 'glpi_unit_secret' });
  const otherTenantEnvName = tenantEnvironmentSecretEnvName({ tenantId: 'tenant-2', key: 'glpi_unit_secret' });

  assert.equal(resolver.resolve(context, { kind: 'none' }).hasSecret(), false);
  assert.throws(
    () => resolver.resolve({ ...context, tenantId: '' }, { kind: 'none' }),
    (error: unknown) => error instanceof ForbiddenException,
  );
  assert.throws(
    () => resolver.resolve(context, null),
    (error: unknown) => error instanceof BadRequestException,
  );
  assert.throws(
    () => resolver.resolve(context, { kind: 'inline', ref: 'x' }),
    (error: unknown) => error instanceof BadRequestException,
  );
  assert.throws(
    () => resolver.resolve(context, { kind: 'environment', ref: 'not a var' }),
    (error: unknown) => error instanceof BadRequestException,
  );
  assert.throws(
    () => resolver.resolve(context, { kind: 'environment', ref: envName, tenant_id: context.tenantId }, {}),
    (error: unknown) => error instanceof ForbiddenException,
  );
  assert.throws(
    () => resolver.resolve(context, { kind: 'environment', ref: 'DATABASE_URL', tenant_id: context.tenantId }, {
      DATABASE_URL: 'postgres://global-secret',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );
  assert.throws(
    () => resolver.resolve(context, { kind: 'environment', ref: envName }, {
      [envName]: 'secret-value',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );
  assert.throws(
    () => resolver.resolve(context, { kind: 'environment', ref: envName, tenant_id: 'tenant-2' }, {
      [envName]: 'secret-value',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );
  assert.throws(
    () => resolver.resolve(context, { kind: 'environment', ref: otherTenantEnvName, tenant_id: context.tenantId }, {
      [otherTenantEnvName]: 'secret-value',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );
  assert.throws(
    () => resolver.resolve(context, { kind: 'environment', ref: envName, tenant_id: context.tenantId, password: 'plain-secret' }, {
      [envName]: 'secret-value',
    }),
    (error: unknown) => error instanceof BadRequestException,
  );

  const envResolved = resolver.resolve(context, { kind: 'environment', ref: envName, tenant_id: context.tenantId }, {
    [envName]: 'super-secret-value',
  });
  assert.equal(envResolved.reveal(), 'super-secret-value');
  assert.doesNotMatch(JSON.stringify(envResolved), /super-secret-value/);
  assert.match(JSON.stringify(envResolved), /environment/);

  const secretEnvName = tenantSecretRefEnvName({
    tenantId: context.tenantId,
    ref: `tenant/${context.tenantId}/glpi`,
  });
  const secretResolved = resolver.resolve(context, {
    kind: 'secret_ref',
    ref: `tenant/${context.tenantId}/glpi`,
  }, {
    [secretEnvName]: 'glpi-secret-value',
  });
  assert.equal(secretResolved.reveal(), 'glpi-secret-value');
  assert.doesNotMatch(JSON.stringify(secretResolved), /glpi-secret-value/);
  assert.throws(
    () => resolver.resolve(context, { kind: 'secret_ref', ref: 'tenant/tenant-2/glpi' }, {
      [secretEnvName]: 'glpi-secret-value',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );
}

async function testNoResolvedSecretPersistenceByDefault() {
  const { manager } = createMemoryManager();
  const context = createContext(manager);
  const resolver = new AiTenantSecretResolverService();
  const envName = tenantEnvironmentSecretEnvName({ tenantId: context.tenantId, key: 'secret_for_test' });
  const resolved = resolver.resolve(context, { kind: 'environment', ref: envName, tenant_id: context.tenantId }, {
    [envName]: 'persist-me-not',
  });
  const evidence = new AiEvidenceService({} as any);
  const row = await evidence.recordEvidence(context, {
    sourceProvider: 'ticketing',
    sourceObjectType: 'credential_diagnostic',
    trustLevel: 'system',
    summary: 'resolver descriptor only',
    payload: { credential: resolved },
    retentionClass: 'audit',
  });
  assert.doesNotMatch(JSON.stringify(row), /persist-me-not/);

  const actions = new AiActionRequestService({} as any, {} as any);
  const action = await actions.createOrEnsureProviderAction(context, {
    capabilityName: 'ticketing.ticket.internal_note.add_approved',
    capabilityVersion: '1.0.0',
    effect: 'write',
    providerKind: 'ticketing',
    providerKey: 'glpi-sandbox',
    targetType: 'ticket',
    targetRef: 'GLPI-1',
    actionPayload: {
      ticketId: 'GLPI-1',
      visibility: 'internal',
      body: 'private note',
      bodyFormat: 'plain_text',
      credential: resolved as any,
    },
    idempotencyKey: 'no-secret-action',
  });
  assert.doesNotMatch(JSON.stringify(action.action_payload_json), /persist-me-not/);
  assert.match(JSON.stringify(action.action_payload_json), /environment/);
}

async function testSafeLiveTargetValidationAndLookup() {
  const { manager } = createMemoryManager();
  const context = createContext(manager);
  const service = new AiLiveTestTargetService({} as any);

  await assert.rejects(
    () => service.saveTarget(context, {
      providerKind: 'ticketing',
      providerKey: '*',
      environment: 'sandbox',
      targetKind: 'ticket',
      targetKey: 'glpi-ticket',
      externalRef: 'GLPI-1',
      allowedEffect: 'read',
      safetyLabel: 'read_only',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );
  await assert.rejects(
    () => service.saveTarget(context, {
      providerKind: 'ticketing',
      providerKey: 'glpi',
      environment: 'production',
      targetKind: 'ticket',
      targetKey: 'glpi-ticket',
      externalRef: 'GLPI-1',
      allowedEffect: 'sandbox_write',
      safetyLabel: 'sandbox_only',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );
  await assert.rejects(
    () => service.saveTarget(context, {
      providerKind: 'ticketing',
      providerKey: 'glpi',
      environment: 'sandbox',
      targetKind: 'ticket',
      targetKey: 'secret-target',
      externalRef: 'GLPI-1',
      allowedEffect: 'read',
      safetyLabel: 'read_only',
      metadata: { api_token: 'secret' },
    }),
    (error: unknown) => error instanceof BadRequestException,
  );
  for (const targetValues of [['all'], ['host-*'], ['password=plain-secret']]) {
    await assert.rejects(
      () => service.saveTarget(context, {
        providerKind: 'automation',
        providerKey: 'awx-sandbox',
        environment: 'sandbox',
        targetKind: 'awx_job',
        targetKey: 'restart-service',
        externalRef: 'awx-template-1',
        allowedEffect: 'dry_run',
        safetyLabel: 'dry_run_only',
        metadata: { target: { type: 'host', values: targetValues } },
      }),
      (error: unknown) => error instanceof ForbiddenException || error instanceof BadRequestException,
    );
  }

  const disabled = await service.saveTarget(context, {
    providerKind: 'ticketing',
    providerKey: 'glpi-sandbox',
    environment: 'sandbox',
    targetKind: 'ticket',
    targetKey: 'glpi-ticket-read',
    externalRef: 'GLPI-1',
    allowedEffect: 'read',
    safetyLabel: 'read_only',
  });
  assert.equal(disabled.enabled, false);
  await assert.rejects(
    () => service.requireSingleEnabledTarget(context, {
      providerKind: 'ticketing',
      allowedEffect: 'read',
      targetKind: 'ticket',
    }),
    (error: unknown) => error instanceof NotFoundException,
  );

  const enabled = await service.saveTarget(context, {
    providerKind: 'ticketing',
    providerKey: 'glpi-sandbox',
    environment: 'sandbox',
    targetKind: 'ticket',
    targetKey: 'glpi-ticket-read',
    externalRef: 'GLPI-1',
    allowedEffect: 'read',
    safetyLabel: 'read_only',
    enabled: true,
  });
  const found = await service.requireSingleEnabledTarget(context, {
    providerKind: 'ticketing',
    allowedEffect: 'read',
    targetKind: 'ticket',
  });
  assert.equal(found.id, enabled.id);

  await service.saveTarget(context, {
    providerKind: 'ticketing',
    providerKey: 'glpi-sandbox',
    environment: 'sandbox',
    targetKind: 'ticket',
    targetKey: 'expired-ticket',
    externalRef: 'GLPI-2',
    allowedEffect: 'read',
    safetyLabel: 'read_only',
    enabled: true,
    expiresAt: new Date(Date.now() - 1000),
  });
  const matches = await service.findEnabledTargets(context, {
    providerKind: 'ticketing',
    allowedEffect: 'read',
    targetKind: 'ticket',
  });
  assert.equal(matches.length, 1);
}

async function testProviderRegistryResolvesCredentialsBeforeAdapterReadiness() {
  const { manager } = createMemoryManager();
  const context = createContext(manager);
  const adapterConfigs = new AiAdapterConfigService({} as any);
  const registry = new AiProviderRegistryService(adapterConfigs, new AiTenantSecretResolverService());
  const repo = manager.getRepository(AiAdapterConfig);
  const missingEnvName = tenantEnvironmentSecretEnvName({ tenantId: context.tenantId, key: 'glpi_missing_secret' });
  const configuredEnvName = tenantEnvironmentSecretEnvName({ tenantId: context.tenantId, key: 'glpi_unit_secret' });

  await repo.save(repo.create({
    tenant_id: context.tenantId,
    provider_kind: 'ticketing',
    provider_key: 'glpi-missing-secret',
    implementation: 'glpi',
    environment: 'sandbox',
    enabled: true,
    credential_ref_json: { kind: 'environment', ref: missingEnvName, tenant_id: context.tenantId },
    live_test_safety: 'live_read',
  }));
  const missing = await registry.getApplicability(context, 'ticketing', 'glpi-missing-secret');
  assert.equal(missing.available, false);
  assert.equal(missing.reasonCode, 'missing_credentials');

  const previous = process.env[configuredEnvName];
  process.env[configuredEnvName] = 'configured-secret';
  try {
    await repo.save(repo.create({
      tenant_id: context.tenantId,
      provider_kind: 'ticketing',
      provider_key: 'glpi-configured-secret',
      implementation: 'glpi',
      environment: 'sandbox',
      enabled: true,
      credential_ref_json: { kind: 'environment', ref: configuredEnvName, tenant_id: context.tenantId },
      live_test_safety: 'live_read',
    }));
    const unsupported = await registry.getApplicability(context, 'ticketing', 'glpi-configured-secret');
    assert.equal(unsupported.available, false);
    assert.equal(unsupported.reasonCode, 'unsupported_provider_version');
    assert.doesNotMatch(JSON.stringify(unsupported), /configured-secret/);
  } finally {
    if (previous == null) {
      delete process.env[configuredEnvName];
    } else {
      process.env[configuredEnvName] = previous;
    }
  }
}

async function testLiveContractHarnessSkipsAndFailsClosed() {
  const { manager } = createMemoryManager();
  const context = createContext(manager);
  const targets = new AiLiveTestTargetService({} as any);
  const adapterConfigs = new AiAdapterConfigService({} as any);
  const providers = new AiProviderRegistryService(adapterConfigs, new AiTenantSecretResolverService());
  const harness = new AiLiveContractHarnessService(
    targets,
    providers,
    { execute: async () => { throw new Error('dispatcher should not run'); } } as any,
    {} as any,
  );

  const skipped = await harness.readiness(context, 'glpi_read', {});
  assert.equal(skipped.status, 'skipped');

  const missingTenant = await harness.readiness(context, 'glpi_read', {
    KANAP_LIVE_CONTRACT_TESTS: '1',
    KANAP_GLPI_LIVE_READ: '1',
  });
  assert.equal(missingTenant.status, 'failed');
  assert.match(missingTenant.reason, /KANAP_LIVE_TENANT_SLUG/);
  const wrongTenant = await harness.readiness(context, 'glpi_read', {
    KANAP_LIVE_CONTRACT_TESTS: '1',
    KANAP_LIVE_TENANT_SLUG: 'tenant-two',
    KANAP_GLPI_LIVE_READ: '1',
  });
  assert.equal(wrongTenant.status, 'failed');
  assert.match(wrongTenant.reason, /does not match/);

  const missingTarget = await harness.readiness(context, 'glpi_read', {
    KANAP_LIVE_CONTRACT_TESTS: '1',
    KANAP_LIVE_TENANT_SLUG: 'tenant-one',
    KANAP_GLPI_LIVE_READ: '1',
  });
  assert.equal(missingTarget.status, 'failed');
  assert.match(missingTarget.reason, /safe live-test target/);

  await targets.saveTarget(context, {
    providerKind: 'ticketing',
    providerKey: 'mock',
    environment: 'sandbox',
    targetKind: 'ticket',
    targetKey: 'glpi-ticket-read',
    externalRef: 'GLPI-1',
    allowedEffect: 'read',
    safetyLabel: 'read_only',
    enabled: true,
  });
  const ready = await harness.readiness(context, 'glpi_read', {
    KANAP_LIVE_CONTRACT_TESTS: '1',
    KANAP_LIVE_TENANT_SLUG: 'tenant-one',
    KANAP_GLPI_LIVE_READ: '1',
  });
  assert.equal(ready.status, 'ready');
  await assert.rejects(
    () => harness.run(context, 'glpi_read', {
      KANAP_LIVE_CONTRACT_TESTS: '1',
      KANAP_LIVE_TENANT_SLUG: 'tenant-one',
      KANAP_GLPI_LIVE_READ: '1',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );
}

function testLiveReadinessDoesNotCreateMcpCapabilities() {
  const names = providerCapabilityContracts().map((contract) => contract.name);
  for (const scenario of Object.values(LIVE_CONTRACT_SCENARIOS)) {
    assert.equal(names.includes(`live_readiness.${scenario.key}`), false);
  }
  const registry = new AiCapabilityRegistry(
    {
      listAvailableTools: async () => [],
      toToolJsonSchemas: () => [],
      execute: async () => ({ ok: true }),
    } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    undefined,
  );
  assert.equal(registry instanceof AiCapabilityRegistry, true);
}

async function run() {
  await testTenantSecretResolverFailureModesAndDescriptors();
  await testNoResolvedSecretPersistenceByDefault();
  await testSafeLiveTargetValidationAndLookup();
  await testProviderRegistryResolvesCredentialsBeforeAdapterReadiness();
  await testLiveContractHarnessSkipsAndFailsClosed();
  testLiveReadinessDoesNotCreateMcpCapabilities();
}

void run();
