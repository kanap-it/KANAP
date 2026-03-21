import * as assert from 'node:assert/strict';
import { TenancyManager, TenantContext } from '../tenancy.manager';

async function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key]);
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

// Mock DataSource
function createMockDataSource() {
  const mockQueryRunner = {
    isReleased: false,
    isTransactionActive: false,
    manager: { find: async () => [], save: async (e: any) => e },
    connect: async () => {},
    startTransaction: async () => {
      mockQueryRunner.isTransactionActive = true;
    },
    commitTransaction: async () => {
      mockQueryRunner.isTransactionActive = false;
    },
    rollbackTransaction: async () => {
      mockQueryRunner.isTransactionActive = false;
    },
    release: async () => {
      mockQueryRunner.isReleased = true;
    },
    query: async (_sql: string, _params?: any[]) => {},
  };

  return {
    mockQueryRunner,
    dataSource: {
      query: async (_sql: string, params?: any[]): Promise<any[]> => {
        // Simulate tenant lookup
        const slug = params?.[0];
        if (slug === 'acme') {
          return [{ id: 'tenant-uuid-123', slug: 'acme', name: 'Acme Corp' }];
        }
        if (slug === 'default') {
          return [{ id: 'tenant-uuid-default', slug: 'default', name: 'Default Tenant' }];
        }
        if (slug === 'platform-admin') {
          return [{ id: 'tenant-uuid-platform', slug: 'platform-admin', name: 'Platform Administration' }];
        }
        return [];
      },
      createQueryRunner: () => mockQueryRunner,
    },
  };
}

// Helper to create TenancyManager with mocks
function createTenancyManager() {
  const { dataSource, mockQueryRunner } = createMockDataSource();
  const mockRequest = {} as any;
  const manager = new TenancyManager(dataSource as any, mockRequest);
  return { manager, mockQueryRunner };
}

async function testExtractSubdomainFromLvhMe() {
  const { manager } = createTenancyManager();

  // Test valid subdomain
  const context = await manager.resolveFromHost('acme.lvh.me:3000');
  assert.ok(context, 'Should resolve tenant for acme.lvh.me');
  assert.equal(context!.subdomain, 'acme');
  assert.equal(context!.tenantId, 'tenant-uuid-123');
  assert.equal(context!.tenantName, 'Acme Corp');
}

async function testExtractSubdomainReturnsNullForApex() {
  const { manager } = createTenancyManager();

  // Test apex domain (no subdomain)
  const noSubdomain = await manager.resolveFromHost('kanap.net');
  assert.equal(noSubdomain, null, 'Should return null for apex domain');

  // Test www subdomain
  const wwwSubdomain = await manager.resolveFromHost('www.kanap.net');
  assert.equal(wwwSubdomain, null, 'Should return null for www subdomain');
}

async function testExtractSubdomainFromLocalDev() {
  const { manager } = createTenancyManager();

  const context = await manager.resolveFromHost('acme.dev.kanap.net:3000');
  assert.ok(context, 'Should resolve tenant for local dev');
  assert.equal(context!.subdomain, 'acme');
}

async function testExtractSubdomainFromDevQa() {
  const { manager } = createTenancyManager();

  const context = await manager.resolveFromHost('acme.qa.kanap.net');
  assert.ok(context, 'Should resolve tenant for dev QA');
  assert.equal(context!.subdomain, 'acme');
}

async function testExtractSubdomainFromProd() {
  const { manager } = createTenancyManager();

  const context = await manager.resolveFromHost('acme.kanap.net');
  assert.ok(context, 'Should resolve tenant for production');
  assert.equal(context!.subdomain, 'acme');
}

async function testResolveFromHostReturnsNullForUnknownTenant() {
  const { manager } = createTenancyManager();

  const context = await manager.resolveFromHost('unknown.lvh.me');
  assert.equal(context, null, 'Should return null for unknown tenant');
}

async function testResolveFromHostUsesDefaultTenantInSingleTenantMode() {
  await withEnv(
    {
      DEPLOYMENT_MODE: 'single-tenant',
      DEFAULT_TENANT_SLUG: 'default',
      PLATFORM_ADMIN_HOST: undefined,
    },
    async () => {
      const { manager } = createTenancyManager();
      const context = await manager.resolveFromHost('192.168.1.83');
      assert.ok(context, 'Should resolve default tenant in single-tenant mode');
      assert.equal(context!.subdomain, 'default');
      assert.equal(context!.tenantId, 'tenant-uuid-default');
    },
  );
}

async function testResolveFromHostReturnsNullForIpInMultiTenantMode() {
  await withEnv(
    {
      DEPLOYMENT_MODE: undefined,
      DEFAULT_TENANT_SLUG: undefined,
      PLATFORM_ADMIN_HOST: undefined,
    },
    async () => {
      const { manager } = createTenancyManager();
      const context = await manager.resolveFromHost('192.168.1.83');
      assert.equal(context, null, 'Should not resolve IP hosts in multi-tenant mode');
    },
  );
}

async function testResolveFromPlatformAdminHost() {
  await withEnv(
    {
      DEPLOYMENT_MODE: undefined,
      PLATFORM_ADMIN_HOST: 'admin.kanap.net',
    },
    async () => {
      const { manager } = createTenancyManager();
      const context = await manager.resolveFromHost('admin.kanap.net:443');
      assert.ok(context, 'Should resolve platform admin host');
      assert.equal(context!.subdomain, 'platform-admin');
      assert.equal(context!.tenantId, 'tenant-uuid-platform');
    },
  );
}

async function testSetAndGetContext() {
  const { manager } = createTenancyManager();

  // Initially null
  assert.equal(manager.getContext(), null);
  assert.equal(manager.getTenantId(), null);

  // Set context
  const context: TenantContext = {
    tenantId: 'test-id',
    tenantName: 'Test Tenant',
    subdomain: 'test',
  };
  manager.setContext(context);

  // Verify getters
  assert.deepEqual(manager.getContext(), context);
  assert.equal(manager.getTenantId(), 'test-id');
}

async function testGetQueryRunnerCreatesConnection() {
  const { manager, mockQueryRunner } = createTenancyManager();

  // Set context first
  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  const runner = await manager.getQueryRunner();
  assert.ok(runner, 'Should return query runner');
  assert.equal(mockQueryRunner.isTransactionActive, true, 'Transaction should be started');
}

async function testGetQueryRunnerThrowsWithoutContext() {
  const { manager } = createTenancyManager();

  // No context set
  await assert.rejects(
    async () => manager.getQueryRunner(),
    /no tenant context set/,
    'Should throw when no context is set',
  );
}

async function testGetQueryRunnerReusesExistingRunner() {
  const { manager } = createTenancyManager();

  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  const runner1 = await manager.getQueryRunner();
  const runner2 = await manager.getQueryRunner();
  assert.equal(runner1, runner2, 'Should reuse the same query runner');
}

async function testGetManagerReturnsEntityManager() {
  const { manager, mockQueryRunner } = createTenancyManager();

  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  const entityManager = await manager.getManager();
  assert.equal(entityManager, mockQueryRunner.manager, 'Should return entity manager from query runner');
}

async function testCommitTransaction() {
  const { manager, mockQueryRunner } = createTenancyManager();

  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  await manager.getQueryRunner(); // Start transaction
  assert.equal(mockQueryRunner.isTransactionActive, true);

  await manager.commit();
  assert.equal(mockQueryRunner.isTransactionActive, false, 'Transaction should be committed');
}

async function testRollbackTransaction() {
  const { manager, mockQueryRunner } = createTenancyManager();

  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  await manager.getQueryRunner(); // Start transaction
  assert.equal(mockQueryRunner.isTransactionActive, true);

  await manager.rollback();
  assert.equal(mockQueryRunner.isTransactionActive, false, 'Transaction should be rolled back');
}

async function testReleaseConnection() {
  const { manager, mockQueryRunner } = createTenancyManager();

  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  await manager.getQueryRunner();
  assert.equal(manager.hasActiveRunner(), true);

  await manager.release();
  assert.equal(mockQueryRunner.isReleased, true, 'Connection should be released');
  assert.equal(manager.hasActiveRunner(), false);
}

async function testExecuteInTransactionSuccess() {
  const { manager, mockQueryRunner } = createTenancyManager();

  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  let callbackCalled = false;
  const result = await manager.executeInTransaction(async (em) => {
    callbackCalled = true;
    assert.equal(em, mockQueryRunner.manager);
    return 'success';
  });

  assert.equal(callbackCalled, true);
  assert.equal(result, 'success');
  assert.equal(mockQueryRunner.isTransactionActive, false, 'Transaction should be committed');
}

async function testExecuteInTransactionRollsBackOnError() {
  const { manager, mockQueryRunner } = createTenancyManager();

  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  await assert.rejects(
    async () => {
      await manager.executeInTransaction(async () => {
        throw new Error('Test error');
      });
    },
    /Test error/,
  );

  assert.equal(mockQueryRunner.isTransactionActive, false, 'Transaction should be rolled back');
}

async function testHasActiveRunnerAndIsTransactionActive() {
  const { manager } = createTenancyManager();

  // Before creating runner
  assert.equal(manager.hasActiveRunner(), false);
  assert.equal(manager.isTransactionActive(), false);

  manager.setContext({
    tenantId: 'test-id',
    tenantName: 'Test',
    subdomain: 'test',
  });

  await manager.getQueryRunner();

  // After creating runner
  assert.equal(manager.hasActiveRunner(), true);
  assert.equal(manager.isTransactionActive(), true);

  await manager.commit();
  assert.equal(manager.isTransactionActive(), false);
  assert.equal(manager.hasActiveRunner(), true);

  await manager.release();
  assert.equal(manager.hasActiveRunner(), false);
}

async function testExtractSubdomainEdgeCases() {
  const { manager } = createTenancyManager();

  // Empty host
  const empty = await manager.resolveFromHost('');
  assert.equal(empty, null);

  // Just port
  const justPort = await manager.resolveFromHost(':3000');
  assert.equal(justPort, null);

  // Apex qa.kanap.net
  const qaApex = await manager.resolveFromHost('qa.kanap.net');
  assert.equal(qaApex, null);

  // Apex dev.kanap.net
  const devApex = await manager.resolveFromHost('dev.kanap.net');
  assert.equal(devApex, null);
}

// Run all tests
(async () => {
  await testExtractSubdomainFromLvhMe();
  await testExtractSubdomainReturnsNullForApex();
  await testExtractSubdomainFromLocalDev();
  await testExtractSubdomainFromDevQa();
  await testExtractSubdomainFromProd();
  await testResolveFromHostReturnsNullForUnknownTenant();
  await testResolveFromHostUsesDefaultTenantInSingleTenantMode();
  await testResolveFromHostReturnsNullForIpInMultiTenantMode();
  await testResolveFromPlatformAdminHost();
  await testSetAndGetContext();
  await testGetQueryRunnerCreatesConnection();
  await testGetQueryRunnerThrowsWithoutContext();
  await testGetQueryRunnerReusesExistingRunner();
  await testGetManagerReturnsEntityManager();
  await testCommitTransaction();
  await testRollbackTransaction();
  await testReleaseConnection();
  await testExecuteInTransactionSuccess();
  await testExecuteInTransactionRollsBackOnError();
  await testHasActiveRunnerAndIsTransactionActive();
  await testExtractSubdomainEdgeCases();
  console.log('TenancyManager tests passed.');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
