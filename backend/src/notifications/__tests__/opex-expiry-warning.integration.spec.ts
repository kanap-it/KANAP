import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { QueryRunner } from 'typeorm';
import dataSource from '../../data-source';
import { ScheduledNotificationsService } from '../scheduled-notifications.service';

// The 30-day expiry warnings. OPEX items read the end of validity
// (disabled_at): an item ending within 30 days is announced with its last
// day and the days left; later and past ends are not. The daily run covers
// contracts and OPEX items of every tenant, each tenant only its own.

function noonUtcInDays(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 12));
}

async function seedTenant(runner: QueryRunner, tag: string) {
  const tenantId = randomUUID();
  await runner.query(
    `INSERT INTO tenants (id, slug, name, status, metadata, branding, created_at, updated_at)
     VALUES ($1, $2, 'Expiry warning test', 'active', '{}'::jsonb, '{"logo_version":0,"use_logo_in_dark":true}'::jsonb, now(), now())`,
    [tenantId, `expiry-${tag}-${tenantId.slice(0, 8)}`],
  );
  await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
  const [role] = await runner.query(
    `INSERT INTO roles (tenant_id, role_name, role_description, is_system, is_built_in, created_at, updated_at)
     VALUES ($1, 'Expiry test role', 'Expiry test role', false, false, now(), now()) RETURNING id`,
    [tenantId],
  );
  const [owner] = await runner.query(
    `INSERT INTO users (tenant_id, role_id, email, first_name, last_name, status, locale)
     VALUES ($1, $2, $3, 'Owner', 'Test', 'enabled', 'en') RETURNING id`,
    [tenantId, role.id, `owner-${tag}-${tenantId.slice(0, 8)}@example.com`],
  );
  return { tenantId, ownerId: owner.id as string };
}

async function seedOpex(runner: QueryRunner, tenantId: string, ownerId: string, items: Array<[string, Date | null]>) {
  let n = 0;
  for (const [name, disabledAt] of items) {
    n += 1;
    await runner.query(
      `INSERT INTO spend_items (tenant_id, product_name, currency, effective_start, item_number, disabled_at, status, owner_it_id)
       VALUES ($1, $2, 'EUR', '2020-01-01', $3, $4, $5, $6)`,
      [tenantId, name, n, disabledAt, disabledAt && disabledAt.getTime() <= Date.now() ? 'disabled' : 'enabled', ownerId],
    );
  }
}

/** A contract ending about ten days from now (notice long past), one ending in a year, and one ending soon but disabled. */
async function seedContracts(runner: QueryRunner, tenantId: string, ownerId: string, tag: string) {
  const [company] = await runner.query(
    `INSERT INTO companies (tenant_id, name, country_iso, city) VALUES ($1, 'Expiry company', 'FR', 'Lyon') RETURNING id`,
    [tenantId],
  );
  const [supplier] = await runner.query(`INSERT INTO suppliers (tenant_id, name) VALUES ($1, 'Expiry supplier') RETURNING id`, [tenantId]);
  const contracts: Array<[string, string, number, number, string | null]> = [
    [`Contract ${tag} ends soon`, `CURRENT_DATE - 20`, 1, 3, null],
    [`Contract ${tag} ends next year`, `CURRENT_DATE`, 12, 1, null],
    [`Contract ${tag} disabled`, `CURRENT_DATE - 20`, 1, 3, new Date(Date.now() - 86_400_000).toISOString()],
  ];
  for (const [name, start, months, notice, disabledAt] of contracts) {
    await runner.query(
      `INSERT INTO contracts (tenant_id, name, company_id, supplier_id, start_date, duration_months, notice_period_months, owner_user_id, disabled_at, status)
       VALUES ($1, $2, $3, $4, ${start}, $5, $6, $7, $8, $9)`,
      [tenantId, name, company.id, supplier.id, months, notice, ownerId, disabledAt, disabledAt ? 'disabled' : 'enabled'],
    );
  }
}

/**
 * The daily run's own per-tenant transactions become savepoints of the test
 * transaction, on one connection: the statements are the service's own and
 * nothing is left behind in the shared database.
 */
function savepointDataSource(outer: QueryRunner) {
  let n = 0;
  return {
    query: (sql: string, params?: unknown[]) => outer.query(sql, params),
    createQueryRunner: () => {
      const name = `expiry_tenant_${++n}`;
      return {
        manager: outer.manager,
        connect: async () => undefined,
        startTransaction: () => outer.query(`SAVEPOINT ${name}`),
        commitTransaction: () => outer.query(`RELEASE SAVEPOINT ${name}`),
        rollbackTransaction: () => outer.query(`ROLLBACK TO SAVEPOINT ${name}`),
        release: async () => undefined,
        query: (sql: string, params?: unknown[]) => outer.query(sql, params),
      };
    },
  };
}

function withRunner(fn: (runner: QueryRunner) => Promise<void>) {
  return async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await fn(runner);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  };
}

const testOpexWindow = withRunner(async (runner) => {
  const { tenantId, ownerId } = await seedTenant(runner, 'opex');
  await seedOpex(runner, tenantId, ownerId, [
    ['Ends in 10 days', noonUtcInDays(10)],
    ['Ends in 40 days', noonUtcInDays(40)],
    ['Ended 5 days ago', noonUtcInDays(-5)],
    ['No end', null],
  ]);

  const received: any[] = [];
  const notifications = { notifyExpirationWarning: async (payload: any) => { received.push(payload); } };
  const svc = new ScheduledNotificationsService(
    undefined as any, undefined as any, undefined as any, notifications as any, undefined as any, undefined as any,
  );
  const count = await (svc as any).checkOpexExpirationsForTenant(runner.manager, tenantId);

  assert.equal(count, 1, 'one OPEX item ends within 30 days');
  assert.equal(received.length, 1, 'one warning sent');
  const [warning] = received;
  assert.equal(warning.itemType, 'opex');
  assert.equal(warning.itemName, 'Ends in 10 days');
  assert.equal(warning.expirationDate, noonUtcInDays(10).toISOString().slice(0, 10), 'the last service day');
  assert.equal(warning.daysRemaining, 10, 'days left counted in calendar days');
  assert.equal(warning.warningType, 'expiration');
  assert.equal(warning.tenantId, tenantId);
  assert.deepEqual(warning.recipients.map((r: any) => r.userId), [ownerId], 'the IT owner is warned');
});

const testDailyRunTwoTenants = withRunner(async (runner) => {
  const tenants = [];
  for (const tag of ['a', 'b']) {
    const { tenantId, ownerId } = await seedTenant(runner, tag);
    await seedOpex(runner, tenantId, ownerId, [
      [`Opex ${tag} ends soon`, noonUtcInDays(10)],
      [`Opex ${tag} ends later`, noonUtcInDays(40)],
    ]);
    await seedContracts(runner, tenantId, ownerId, tag);
    tenants.push({ tag, tenantId, ownerId });
  }

  const received: any[] = [];
  const notifications = { notifyExpirationWarning: async (payload: any) => { received.push({ ...payload, manager: undefined }); } };
  const svc = new ScheduledNotificationsService(
    savepointDataSource(runner) as any, undefined as any, undefined as any, notifications as any, undefined as any, undefined as any,
  );
  const summary = await svc.checkExpirations();

  assert.deepEqual(summary.errors, [], 'no tenant fails');
  for (const { tag, tenantId, ownerId } of tenants) {
    const own = received.filter((w) => w.tenantId === tenantId);
    const warned = own.map((w) => `${w.itemType}:${w.warningType}:${w.itemName}`).sort();
    assert.deepEqual(
      warned,
      [`contract:expiration:Contract ${tag} ends soon`, `opex:expiration:Opex ${tag} ends soon`],
      `tenant ${tag}: its contract and its OPEX item ending within 30 days`,
    );
    for (const warning of own) {
      assert.deepEqual(warning.recipients.map((r: any) => r.userId), [ownerId], `tenant ${tag}: only its own owner is warned`);
    }
    const other = tenants.find((t) => t.tenantId !== tenantId)!;
    assert.ok(own.every((w) => !String(w.itemName).includes(` ${other.tag} `)), `tenant ${tag}: none of the other tenant's items`);
  }
});

async function main() {
  await dataSource.initialize();
  const failures: string[] = [];
  try {
    for (const [name, test] of [['opex window', testOpexWindow], ['daily run, two tenants', testDailyRunTwoTenants]] as const) {
      try {
        await test();
      } catch (err) {
        failures.push(`${name}: ${(err as Error).message.split('\n')[0]}`);
      }
    }
  } finally {
    await dataSource.destroy();
  }
  if (failures.length) {
    throw new Error(`opex-expiry-warning.integration.spec: ${failures.length} failing\n  ${failures.join('\n  ')}`);
  }
  console.log('opex-expiry-warning.integration.spec: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
