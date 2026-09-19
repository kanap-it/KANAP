import * as assert from 'node:assert/strict';
import { AiBuiltinUsageService } from '../ai-builtin-usage.service';

/**
 * Regression guard for the platform admin usage page.
 *
 * `ai_builtin_usage` is under FORCE ROW LEVEL SECURITY and the tenant context is set
 * transaction-locally on the request's own QueryRunner. The original implementation read
 * the table with a single `dataSource.query` LEFT JOIN, which runs on another pooled
 * connection: RLS filtered every row away and the page reported `used = 0` for every
 * tenant, forever. The service must therefore read the table once per tenant, inside a
 * tenant-scoped transaction.
 *
 * The mock below reproduces that RLS semantic: rows only exist when the reading manager
 * sits on a runner whose `app.current_tenant` has been set.
 */
function createRlsMockDataSource(
  tenants: Array<{ id: string; name: string; slug: string }>,
  usageByTenant: Record<string, number>,
) {
  const stats = { contextlessReads: 0, tenantContexts: [] as string[] };

  const createQueryRunner = () => {
    let context: string | null = null;
    return {
      isTransactionActive: false,
      connect: async () => undefined,
      startTransaction: async () => undefined,
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
      release: async () => undefined,
      // withTenantExecution sets the context through the runner itself.
      query: async (sql: string, params?: any[]) => {
        if (/set_config\('app\.current_tenant'/.test(sql)) {
          context = params?.[0] ?? null;
          if (context) stats.tenantContexts.push(context);
        }
        return [];
      },
      manager: {
        query: async (sql: string) => {
          if (/FROM ai_builtin_usage/.test(sql)) {
            if (!context) return []; // RLS: no context, no rows
            const used = usageByTenant[context];
            return used == null ? [] : [{ user_message_count: used }];
          }
          return [];
        },
      },
    };
  };

  const dataSource = {
    createQueryRunner,
    // getMonthlyLimit() falls back to the default when no plan row exists.
    manager: { getRepository: () => ({ findOne: async () => null }) },
    query: async (sql: string) => {
      stats.contextlessReads += 1;
      if (/FROM tenants/.test(sql)) return tenants;
      // A context-less read of the RLS table sees nothing, whatever the query shape.
      return [];
    },
  };

  return { stats, dataSource };
}

const TENANTS = [
  { id: 'tenant-a', name: 'Alpha', slug: 'alpha' },
  { id: 'tenant-b', name: 'Beta', slug: 'beta' },
];

async function testReadsUsagePerTenantInsteadOfThroughOneContextlessQuery() {
  const { stats, dataSource } = createRlsMockDataSource(TENANTS, { 'tenant-a': 19 });
  const svc = new AiBuiltinUsageService(dataSource as any);

  const rows = await svc.getUsageForAllTenants('2026-08');

  // The roster is read once, without context (the tenants table is outside RLS).
  assert.equal(stats.contextlessReads, 1, 'the tenant roster is read exactly once');

  // Every tenant is read inside its own tenant-scoped transaction.
  assert.deepEqual(
    [...stats.tenantContexts].sort(),
    ['tenant-a', 'tenant-b'],
    'each tenant is read with its own app.current_tenant context',
  );

  const alpha = rows.find((r) => r.tenant_id === 'tenant-a');
  const beta = rows.find((r) => r.tenant_id === 'tenant-b');

  // The regression: with a single context-less query this was 0 for everyone.
  assert.equal(alpha?.used, 19, 'the tenant that has usage reports it');
  assert.equal(beta?.used, 0, 'a tenant with no row reports 0');

  assert.equal(alpha?.limit, 1500, 'the monthly limit comes from the default');
  assert.equal(alpha?.year_month, '2026-08');
  assert.equal(alpha?.usage_ratio, 0.0127, '19 / 1500 rounded to 4 decimals');
  assert.equal(beta?.usage_ratio, 0);

  // Ordering: highest usage first, then by name.
  assert.deepEqual(
    rows.map((r) => r.tenant_slug),
    ['alpha', 'beta'],
  );
}

async function testOrdersTenantsByUsageThenName() {
  const { dataSource } = createRlsMockDataSource(
    [
      { id: 'z', name: 'Zeta', slug: 'zeta' },
      { id: 'a', name: 'Alpha', slug: 'alpha' },
      { id: 'b', name: 'Beta', slug: 'beta' },
    ],
    { z: 5, b: 5 },
  );
  const svc = new AiBuiltinUsageService(dataSource as any);

  const rows = await svc.getUsageForAllTenants('2026-08');

  // Equal usage -> alphabetical; then the zero-usage tenant last.
  assert.deepEqual(
    rows.map((r) => [r.tenant_slug, r.used]),
    [
      ['beta', 5],
      ['zeta', 5],
      ['alpha', 0],
    ],
  );
}

async function run() {
  await testReadsUsagePerTenantInsteadOfThroughOneContextlessQuery();
  await testOrdersTenantsByUsageThenName();
}

void run();
