import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { QueryRunner } from 'typeorm';
import dataSource from '../../data-source';
import { TeamMemberConfigService } from '../team-member-config.service';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/user.entity';
import { PortfolioEmploymentTypesService } from '../portfolio-employment-types.service';

// Contract of the manager and employment-type references against a real
// database: tenant isolation, the Entra lock, the usage guard on delete, the
// ON DELETE SET NULL foreign key, and the cycle guard under concurrent writes.

function contributorService(runner: QueryRunner, users?: Partial<UsersService>) {
  return new TeamMemberConfigService(
    { manager: runner.manager } as any,
    { log: async () => undefined } as any,
    { nextItemNumber: async () => Math.floor(Math.random() * 1_000_000) + 1 } as any,
    (users ?? { updateUser: async () => ({}) }) as any,
  );
}

/** The real service, minus the audit writer, against the same transaction. */
function realUsersService(runner: QueryRunner) {
  return new UsersService(
    runner.manager.getRepository(User) as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
  );
}

function employmentTypeService(runner: QueryRunner) {
  return new PortfolioEmploymentTypesService({ manager: runner.manager } as any);
}

async function setCurrentTenant(runner: QueryRunner, tenantId: string) {
  await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
}

async function seedTenant(runner: QueryRunner, tenantId: string, tag: string) {
  await runner.query(
    `INSERT INTO tenants (id, slug, name, status, metadata, branding, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', '{}'::jsonb, '{"logo_version":0,"use_logo_in_dark":true}'::jsonb, now(), now())`,
    [tenantId, `ctr-${tag}-${tenantId.slice(0, 8)}`, `Contributor test ${tag}`],
  );
  // Every tenant-scoped insert below needs the RLS context of its own tenant.
  await setCurrentTenant(runner, tenantId);
  const roleId = randomUUID();
  await runner.query(
    `INSERT INTO roles (id, tenant_id, role_name, role_description, is_system, is_built_in, created_at, updated_at)
     VALUES ($1, $2, 'Contributor test role', 'test', false, false, now(), now())`,
    [roleId, tenantId],
  );
  return roleId;
}

async function seedUser(runner: QueryRunner, tenantId: string, roleId: string, name: string) {
  const userId = randomUUID();
  await runner.query(
    `INSERT INTO users (id, tenant_id, first_name, last_name, email, role_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Tester', $4, $5, 'enabled', now(), now())`,
    [userId, tenantId, name, `${name.toLowerCase()}.${userId.slice(0, 8)}@example.test`, roleId],
  );
  return userId;
}

async function seedContributor(runner: QueryRunner, tenantId: string, userId: string) {
  const id = randomUUID();
  await runner.query(
    `INSERT INTO portfolio_team_member_configs (
       id, tenant_id, user_id, areas_of_expertise, skills, project_availability, item_number, created_at, updated_at
     )
     VALUES ($1, $2, $3, '[]'::jsonb, '[]'::jsonb, 5,
       COALESCE((SELECT MAX(item_number) FROM portfolio_team_member_configs WHERE tenant_id = $2), 0) + 1,
       now(), now())`,
    [id, tenantId, userId],
  );
  return id;
}

async function seedEmploymentType(
  runner: QueryRunner,
  tenantId: string,
  name: string,
  opts?: { isActive?: boolean; isSystem?: boolean },
) {
  const id = randomUUID();
  await runner.query(
    `INSERT INTO portfolio_employment_types (id, tenant_id, name, is_active, display_order, is_system, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 0, $5, now(), now())`,
    [id, tenantId, name, opts?.isActive ?? true, opts?.isSystem ?? false],
  );
  return id;
}

// ---------------------------------------------------------------- schema ----

async function testTableIsTenantIsolated() {
  const tableRows = await dataSource.query(
    `SELECT rowsecurity, relforcerowsecurity
     FROM pg_tables t
     JOIN pg_class c ON c.relname = t.tablename
     WHERE t.schemaname = 'public' AND t.tablename = 'portfolio_employment_types'`,
  );
  assert.equal(tableRows.length, 1, 'portfolio_employment_types is missing');
  assert.equal(tableRows[0].rowsecurity, true, 'RLS is not enabled');
  assert.equal(tableRows[0].relforcerowsecurity, true, 'FORCE RLS is not enabled');

  const policyRows = await dataSource.query(
    `SELECT policyname, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_with_check
     FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'portfolio_employment_types'`,
  );
  assert.equal(policyRows.length, 1);
  assert.equal(policyRows[0].policyname, 'portfolio_employment_types_tenant_isolation');
  assert.equal(policyRows[0].has_using, true);
  assert.equal(policyRows[0].has_with_check, true);

  const columns = await dataSource.query(
    `SELECT column_name, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'portfolio_team_member_configs'
       AND column_name IN ('manager_user_id', 'manager_source', 'employment_type_id')
     ORDER BY column_name`,
  );
  assert.deepEqual(
    columns.map((row: any) => [row.column_name, row.is_nullable]),
    [['employment_type_id', 'YES'], ['manager_source', 'YES'], ['manager_user_id', 'YES']],
    'the three contributor columns must stay nullable: the raw fixtures insert an explicit column list',
  );
}

// ------------------------------------------------------------ isolation ----

async function testForeignTenantReferencesAreRefused() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const roleA = await seedTenant(runner, tenantA, 'a');
    const roleB = await seedTenant(runner, tenantB, 'b');

    await setCurrentTenant(runner, tenantA);
    const userA = await seedUser(runner, tenantA, roleA, 'Ada');
    const configA = await seedContributor(runner, tenantA, userA);

    await setCurrentTenant(runner, tenantB);
    const userB = await seedUser(runner, tenantB, roleB, 'Bob');
    const typeB = await seedEmploymentType(runner, tenantB, 'Contractor');

    await setCurrentTenant(runner, tenantA);
    const svc = contributorService(runner);

    await assert.rejects(
      () => svc.update(configA, { manager_user_id: userB }, null),
      /Manager not found/,
      'a user of another tenant must not become a manager',
    );
    await assert.rejects(
      () => svc.update(configA, { employment_type_id: typeB }, null),
      /Contract type not found/,
      'an employment type of another tenant must not be assignable',
    );
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function testInactiveTypeRefusedButAssignedOneSurvives() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const tenantId = randomUUID();
    const roleId = await seedTenant(runner, tenantId, 'inactive');
    await setCurrentTenant(runner, tenantId);
    const userId = await seedUser(runner, tenantId, roleId, 'Cleo');
    const configId = await seedContributor(runner, tenantId, userId);
    const typeId = await seedEmploymentType(runner, tenantId, 'Seasonal');
    const svc = contributorService(runner);

    await svc.update(configId, { employment_type_id: typeId }, null);
    await employmentTypeService(runner).update(typeId, tenantId, { is_active: false });

    // Deactivating later must not strip the value from the contributors on it.
    await svc.update(configId, { notes: 'unrelated edit' }, null);
    const rows = await runner.query(
      `SELECT employment_type_id FROM portfolio_team_member_configs WHERE id = $1`,
      [configId],
    );
    assert.equal(rows[0].employment_type_id, typeId);

    // Assigning a deactivated type afresh is refused.
    const other = await seedEmploymentType(runner, tenantId, 'Retired', { isActive: false });
    await assert.rejects(
      () => svc.update(configId, { employment_type_id: other }, null),
      /Contract type not found/,
    );
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function testEntraManagerLockAndOrphanException() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const tenantId = randomUUID();
    const roleId = await seedTenant(runner, tenantId, 'entra');
    await setCurrentTenant(runner, tenantId);
    const userId = await seedUser(runner, tenantId, roleId, 'Dana');
    const managerId = await seedUser(runner, tenantId, roleId, 'Erin');
    const otherId = await seedUser(runner, tenantId, roleId, 'Finn');
    const configId = await seedContributor(runner, tenantId, userId);
    const svc = contributorService(runner);

    // PR C will write this pair through the sync; the API path never can.
    await svc.update(configId, { manager_user_id: managerId }, null, { managerSource: 'entra' });
    await assert.rejects(
      () => svc.update(configId, { manager_user_id: otherId }, null),
      /Microsoft Entra/,
    );

    // The sync itself keeps ownership of the value it wrote.
    await svc.update(configId, { manager_user_id: otherId }, null, { managerSource: 'entra' });
    await svc.update(configId, { manager_user_id: managerId }, null, { managerSource: 'entra' });

    // Deleting the manager's account nulls the column through the foreign key
    // and leaves the source behind: that orphan is editable again.
    await runner.query(`DELETE FROM users WHERE id = $1`, [managerId]);
    const orphan = await runner.query(
      `SELECT manager_user_id, manager_source FROM portfolio_team_member_configs WHERE id = $1`,
      [configId],
    );
    assert.equal(orphan[0].manager_user_id, null);
    assert.equal(orphan[0].manager_source, 'entra');

    await svc.update(configId, { manager_user_id: otherId }, null);
    const repaired = await runner.query(
      `SELECT manager_user_id, manager_source FROM portfolio_team_member_configs WHERE id = $1`,
      [configId],
    );
    assert.equal(repaired[0].manager_user_id, otherId);
    assert.equal(repaired[0].manager_source, 'manual');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

// ------------------------------------------------------- employment types ---

async function testEmploymentTypeLifecycle() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const tenantId = randomUUID();
    const roleId = await seedTenant(runner, tenantId, 'lifecycle');
    await setCurrentTenant(runner, tenantId);
    const userId = await seedUser(runner, tenantId, roleId, 'Gale');
    const userId2 = await seedUser(runner, tenantId, roleId, 'Hugo');
    const configId = await seedContributor(runner, tenantId, userId);
    const types = employmentTypeService(runner);

    const seeded = await types.seedDefaults(tenantId, runner.manager);
    assert.equal(seeded.created, 4);
    assert.equal((await types.seedDefaults(tenantId, runner.manager)).created, 0, 'seeding twice must be a no-op');

    let listed = await types.list(tenantId);
    assert.deepEqual(listed.map((row) => row.name), ['Internal', 'External', 'Apprentice', 'Other']);
    assert.equal(listed.every((row) => row.is_system), true);
    assert.equal(listed[0].usage_count, 0);

    await assert.rejects(() => types.delete(listed[0].id, tenantId), /built-in/);

    // A contributor created without a type lands on the first built-in one.
    const newcomer = await contributorService(runner).create({ user_id: userId2 }, tenantId, null);
    assert.equal(newcomer.employment_type_id, listed[0].id);

    const custom = await types.create(tenantId, { name: 'Contractor' });
    assert.equal(custom.is_system, false);
    await assert.rejects(() => types.create(tenantId, { name: 'Contractor' }), /already exists/);

    await contributorService(runner).update(configId, { employment_type_id: custom.id }, null);
    listed = await types.list(tenantId);
    assert.equal(listed.find((row) => row.id === custom.id)?.usage_count, 1);
    await assert.rejects(() => types.delete(custom.id, tenantId), /assigned to contributors/);

    // Forcing the row out anyway must not orphan the contributor.
    await runner.query(`DELETE FROM portfolio_employment_types WHERE id = $1`, [custom.id]);
    const cleared = await runner.query(
      `SELECT employment_type_id FROM portfolio_team_member_configs WHERE id = $1`,
      [configId],
    );
    assert.equal(cleared[0].employment_type_id, null);

    // Documented behaviour, identical to teams: the seeder matches on name, so
    // a renamed default is recreated. Only reachable from an empty list.
    await types.update(listed[0].id, tenantId, { name: 'Staff' });
    assert.equal((await types.seedDefaults(tenantId, runner.manager)).created, 1);
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

// ----------------------------------------------------------- org chart ----

/**
 * The org chart filters disabled accounts client-side, so the account status
 * has to travel with the contributor rows. Both reads are twins; they must
 * carry the same columns.
 */
async function testContributorReadsCarryTheAccountStatus() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const tenantId = randomUUID();
    const roleId = await seedTenant(runner, tenantId, 'status');
    await setCurrentTenant(runner, tenantId);

    const activeUser = await seedUser(runner, tenantId, roleId, 'Nora');
    const leaverUser = await seedUser(runner, tenantId, roleId, 'Otto');
    await runner.query(`UPDATE users SET status = 'disabled' WHERE id = $1`, [leaverUser]);
    const activeConfig = await seedContributor(runner, tenantId, activeUser);
    await seedContributor(runner, tenantId, leaverUser);

    const contributors = contributorService(runner);
    const { items } = await contributors.list(tenantId);
    const byUser = new Map<string, any>(items.map((row: any) => [row.user_id, row]));
    assert.equal(byUser.get(activeUser).user_status, 'enabled');
    assert.equal(byUser.get(leaverUser).user_status, 'disabled');

    // The chart also needs the manager link and the display name off the same read.
    assert.equal(byUser.get(activeUser).manager_user_id, null);
    assert.equal(byUser.get(activeUser).user_display_name, 'Nora Tester');

    assert.equal((await contributors.get(activeConfig)).user_status, 'enabled');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

// -------------------------------------------------------------- job title ----

/**
 * `job_title` is a column of `users`, so the contributor panel writes it through
 * `UsersService.updateUser`. Three things must hold: the directory-managed
 * account is refused, a caller without `users:admin` is refused on someone
 * else, and the person themselves may always write their own.
 */
async function testJobTitleWritesThroughTheUsersService() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const tenantId = randomUUID();
    const roleId = await seedTenant(runner, tenantId, 'jobtitle');
    await setCurrentTenant(runner, tenantId);

    const localUser = await seedUser(runner, tenantId, roleId, 'Paul');
    const entraUser = await seedUser(runner, tenantId, roleId, 'Quentin');
    const adminUser = await seedUser(runner, tenantId, roleId, 'Rita');
    await runner.query(
      `UPDATE users SET external_auth_provider = 'entra', external_subject = $2 WHERE id = $1`,
      [entraUser, randomUUID()],
    );
    const localConfig = await seedContributor(runner, tenantId, localUser);
    const entraConfig = await seedContributor(runner, tenantId, entraUser);

    const contributors = contributorService(runner, realUsersService(runner));
    const asAdmin = { actorUserId: adminUser, canManageUsers: true };

    // Both twin reads must carry the signal the drawer locks on.
    const { items } = await contributors.list(tenantId);
    const byUser = new Map<string, any>(items.map((row: any) => [row.user_id, row]));
    assert.equal(byUser.get(entraUser).external_auth_provider, 'entra');
    assert.equal(byUser.get(localUser).external_auth_provider, null);
    assert.equal((await contributors.get(entraConfig)).external_auth_provider, 'entra');

    // A `users:admin` writes it on someone else.
    await contributors.update(localConfig, { job_title: 'Cheese buyer' }, adminUser, {
      manager: runner.manager,
      profileActor: asAdmin,
    });
    assert.equal(
      (await contributors.get(localConfig)).job_title,
      'Cheese buyer',
      'the joined read must show the new title',
    );

    // A portfolio maintainer without `users:admin` may not touch the directory.
    const outsider = { actorUserId: adminUser, canManageUsers: false };
    await assert.rejects(
      () => contributors.update(localConfig, { job_title: 'Hijacked' }, adminUser, {
        manager: runner.manager,
        profileActor: outsider,
      }),
      (e: any) => e?.response?.code === 'FORBIDDEN_PROFILE_UPDATE',
    );

    // No actor at all is the dangerous case: `updateUser` would read it as an
    // internal update and open every admin field without a check.
    await assert.rejects(
      () => contributors.update(localConfig, { job_title: 'Hijacked' }, null, {
        manager: runner.manager,
      }),
      (e: any) => e?.response?.code === 'FORBIDDEN_PROFILE_UPDATE',
    );

    // The contributor writes their own, with no directory permission.
    await contributors.update(localConfig, { job_title: 'Head of cheese' }, localUser, {
      manager: runner.manager,
      profileActor: { actorUserId: localUser, canManageUsers: false },
    });
    assert.equal((await contributors.get(localConfig)).job_title, 'Head of cheese');

    // An Entra account on an Entra tenant is read-only: the nightly sync
    // overwrites the column, so a hand-typed value would vanish.
    await runner.query(
      `UPDATE tenants SET sso_provider = 'entra', sso_enabled = true WHERE id = $1`,
      [tenantId],
    );
    await assert.rejects(
      () => contributors.update(entraConfig, { job_title: 'Typed by hand' }, adminUser, {
        manager: runner.manager,
        profileActor: asAdmin,
      }),
      (e: any) => e?.response?.code === 'PROFILE_FIELD_FROM_ENTRA',
    );
    // Even on themselves.
    await assert.rejects(
      () => contributors.update(entraConfig, { job_title: 'Typed by hand' }, entraUser, {
        manager: runner.manager,
        profileActor: { actorUserId: entraUser, canManageUsers: false },
      }),
      (e: any) => e?.response?.code === 'PROFILE_FIELD_FROM_ENTRA',
    );

    // Turning SSO off hands the field back: nothing syncs it any more.
    await runner.query(`UPDATE tenants SET sso_enabled = false WHERE id = $1`, [tenantId]);
    await contributors.update(entraConfig, { job_title: 'Now editable' }, adminUser, {
      manager: runner.manager,
      profileActor: asAdmin,
    });
    assert.equal((await contributors.get(entraConfig)).job_title, 'Now editable');

    // The self route reads through the same SELECT as `:id`, which is what
    // carries `job_title` and `external_auth_provider` to the drawer.
    const mine = await contributors.getMe(localUser, tenantId, { manager: runner.manager });
    assert.equal(mine.job_title, 'Head of cheese');
    assert.equal(mine.external_auth_provider, null);
    assert.equal(mine.id, localConfig);
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

// ----------------------------------------------------------- concurrency ----

/**
 * Two requests closing a loop from both ends at once. The cycle check reads
 * before it writes, so without the per-tenant advisory lock both would pass.
 * This one commits for real, so it cleans up after itself.
 */
async function testConcurrentManagerWritesCannotCloseACycle() {
  const setup = dataSource.createQueryRunner();
  await setup.connect();

  const tenantId = randomUUID();
  try {
    await setup.startTransaction();
    const roleId = await seedTenant(setup, tenantId, 'race');
    await setCurrentTenant(setup, tenantId);
    const userA = await seedUser(setup, tenantId, roleId, 'Hana');
    const userB = await seedUser(setup, tenantId, roleId, 'Iris');
    const configA = await seedContributor(setup, tenantId, userA);
    const configB = await seedContributor(setup, tenantId, userB);
    await setup.commitTransaction();

    const first = dataSource.createQueryRunner();
    const second = dataSource.createQueryRunner();
    await first.connect();
    await second.connect();
    try {
      await first.startTransaction();
      await second.startTransaction();
      await setCurrentTenant(first, tenantId);
      await setCurrentTenant(second, tenantId);

      // A reports to B, not yet committed.
      await contributorService(first).update(configA, { manager_user_id: userB }, null);

      // B reports to A: blocks on the advisory lock until the first commits,
      // then sees the committed chain and refuses.
      const contested = contributorService(second).update(configB, { manager_user_id: userA }, null);
      const settled = await Promise.race([
        contested.then(() => 'resolved').catch(() => 'rejected'),
        new Promise((resolve) => setTimeout(() => resolve('blocked'), 300)),
      ]);
      assert.equal(settled, 'blocked', 'the second write must wait for the first transaction');

      await first.commitTransaction();
      await assert.rejects(() => contested, /already reports to/);
      await second.rollbackTransaction();
    } finally {
      if (first.isTransactionActive) await first.rollbackTransaction();
      if (second.isTransactionActive) await second.rollbackTransaction();
      await first.release();
      await second.release();
    }

    // Reading back needs its own tenant context: the rows are RLS-protected.
    const verify = dataSource.createQueryRunner();
    await verify.connect();
    try {
      await verify.startTransaction();
      await setCurrentTenant(verify, tenantId);
      const check = await verify.query(
        `SELECT user_id, manager_user_id FROM portfolio_team_member_configs WHERE tenant_id = $1`,
        [tenantId],
      );
      await verify.rollbackTransaction();
      const withManager = check.filter((row: any) => row.manager_user_id);
      assert.equal(withManager.length, 1, 'exactly one of the two writes may land');
      assert.equal(withManager[0].user_id, userA);
      assert.equal(withManager[0].manager_user_id, userB);
    } finally {
      await verify.release();
    }
  } finally {
    // Committed rows: clear them explicitly. RLS is bypassed by the tenant
    // predicate here because these deletes run as the owning tenant.
    const cleanup = dataSource.createQueryRunner();
    await cleanup.connect();
    try {
      await cleanup.startTransaction();
      await setCurrentTenant(cleanup, tenantId);
      await cleanup.query(`DELETE FROM portfolio_team_member_configs WHERE tenant_id = $1`, [tenantId]);
      await cleanup.query(`DELETE FROM users WHERE tenant_id = $1`, [tenantId]);
      await cleanup.query(`DELETE FROM roles WHERE tenant_id = $1`, [tenantId]);
      await cleanup.query(`DELETE FROM portfolio_employment_types WHERE tenant_id = $1`, [tenantId]);
      await cleanup.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
      await cleanup.commitTransaction();
    } finally {
      await cleanup.release();
    }
    await setup.release();
  }
}

async function run() {
  await dataSource.initialize();
  try {
    await testTableIsTenantIsolated();
    await testForeignTenantReferencesAreRefused();
    await testInactiveTypeRefusedButAssignedOneSurvives();
    await testEntraManagerLockAndOrphanException();
    await testEmploymentTypeLifecycle();
    await testContributorReadsCarryTheAccountStatus();
    await testJobTitleWritesThroughTheUsersService();
    await testConcurrentManagerWritesCannotCloseACycle();
  } finally {
    await dataSource.destroy();
  }
}

void run();
