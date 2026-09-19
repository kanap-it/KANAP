import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { QueryRunner } from 'typeorm';
import dataSource from '../../data-source';
import { AssetHardwareInfo } from '../../assets/asset-hardware-info.entity';
import { Asset } from '../../assets/asset.entity';
import { AssetsHardwareService } from '../../assets/services/assets-hardware.service';
import { AuditLog } from '../../audit/audit.entity';
import { AuditService } from '../../audit/audit.service';

// asset_external_links against a real database: the table carries the standard
// tenant isolation (RLS enabled, forced, one policy with USING and WITH CHECK),
// the tenant_id default fills itself from the request context, the identity is
// unique per tenant and an asset deletion unlinks the row instead of removing
// it.
//
// Also checks the other half of the Netbox contract on the write side: an
// asset write carrying source 'system' / source reference 'netbox' produces an
// audit entry that says so.

async function setCurrentTenant(runner: QueryRunner, tenantId: string) {
  await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
}

async function seedTenant(runner: QueryRunner, tag: string): Promise<string> {
  const tenantId = randomUUID();
  await runner.query(
    `INSERT INTO tenants (id, slug, name, status, metadata, branding, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', '{}'::jsonb, '{"logo_version":0,"use_logo_in_dark":true}'::jsonb, now(), now())`,
    [tenantId, `netbox-${tag}-${tenantId.slice(0, 8)}`, `Netbox test ${tag}`],
  );
  return tenantId;
}

async function seedAsset(runner: QueryRunner, tenantId: string, name: string): Promise<string> {
  const assetId = randomUUID();
  await runner.query(
    `INSERT INTO assets (id, tenant_id, name, kind, provider, environment, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'physical_server', 'on_premise', 'prod', 'active', now(), now())`,
    [assetId, tenantId, name],
  );
  return assetId;
}

async function insertLink(
  runner: QueryRunner,
  values: { externalId: string; assetId?: string | null; tenantId?: string | null; state?: string },
): Promise<string> {
  const rows = await runner.query(
    `INSERT INTO asset_external_links
       (tenant_id, source, external_type, external_id, external_name, asset_id, state, external_status)
     VALUES (COALESCE($1::uuid, app_current_tenant()), 'netbox', 'device', $2, $3, $4, $5, 'failed')
     RETURNING id, tenant_id`,
    [
      values.tenantId ?? null,
      values.externalId,
      `device-${values.externalId}`,
      values.assetId ?? null,
      values.state ?? 'linked',
    ],
  );
  return rows[0].id;
}

let savepointCounter = 0;

/** Runs a statement that must be refused, without poisoning the transaction. */
async function expectRefused(runner: QueryRunner, pattern: RegExp, run: () => Promise<unknown>) {
  const savepoint = `netbox_sp_${savepointCounter += 1}`;
  await runner.query(`SAVEPOINT ${savepoint}`);
  try {
    await run();
    assert.fail(`the statement should have been refused with ${pattern}`);
  } catch (error: any) {
    await runner.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    assert.match(String(error?.message || error), pattern);
  }
}

// ---------------------------------------------------------------- schema ----

async function testTableIsTenantIsolated() {
  const tableRows = await dataSource.query(
    `SELECT c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'asset_external_links'`,
  );
  assert.equal(tableRows.length, 1, 'asset_external_links is missing — run the migrations first');
  assert.equal(tableRows[0].relrowsecurity, true, 'RLS is not enabled');
  assert.equal(tableRows[0].relforcerowsecurity, true, 'FORCE RLS is not enabled');

  const policyRows = await dataSource.query(
    `SELECT policyname, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_with_check
     FROM pg_policies WHERE schemaname = 'public' AND tablename = 'asset_external_links'`,
  );
  assert.equal(policyRows.length, 1);
  assert.equal(policyRows[0].policyname, 'asset_external_links_tenant_isolation');
  assert.equal(policyRows[0].has_using, true);
  assert.equal(policyRows[0].has_with_check, true);

  // The message is a code plus parameters, never a sentence: the pages are
  // shown in four languages.
  const messageColumns = await dataSource.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'asset_external_links' AND column_name IN ('message', 'message_code', 'message_params')
     ORDER BY column_name`,
  );
  assert.deepEqual(
    messageColumns.map((row: any) => [row.column_name, row.data_type]),
    [['message_code', 'text'], ['message_params', 'jsonb']],
    'the record message must be a code plus parameters, and the old text column must be gone',
  );

  // The raw inventory status rides on the record, nullable: an object Netbox
  // reports as failed stays an active asset with a note on it.
  const statusColumn = await dataSource.query(
    `SELECT data_type, is_nullable FROM information_schema.columns
     WHERE table_name = 'asset_external_links' AND column_name = 'external_status'`,
  );
  assert.equal(statusColumn.length, 1, 'external_status is missing');
  assert.equal(statusColumn[0].data_type, 'text');
  assert.equal(statusColumn[0].is_nullable, 'YES');

  const stateCheck = await dataSource.query(
    `SELECT pg_get_constraintdef(oid) AS definition
     FROM pg_constraint WHERE conname = 'asset_external_links_state_check'`,
  );
  assert.equal(stateCheck.length, 1, 'the state check constraint is missing');
  for (const state of ['linked', 'ambiguous', 'missing', 'ignored', 'error']) {
    assert.match(stateCheck[0].definition, new RegExp(`'${state}'`));
  }
}

// ------------------------------------------------------------ isolation ----

async function testRowsAreInvisibleToOtherTenants() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  let tenantA = '';
  let tenantB = '';
  try {
    tenantA = await seedTenant(runner, 'a');
    tenantB = await seedTenant(runner, 'b');

    await setCurrentTenant(runner, tenantA);
    const assetA = await seedAsset(runner, tenantA, 'netbox-rls-a');
    const linkA = await insertLink(runner, { externalId: '101', assetId: assetA });
    // The tenant_id default reads the request context, so it is never passed.
    const ownership = await runner.query(
      `SELECT tenant_id, external_status FROM asset_external_links WHERE id = $1`,
      [linkA],
    );
    assert.equal(ownership[0].tenant_id, tenantA, 'tenant_id must default to the current tenant');
    assert.equal(ownership[0].external_status, 'failed');

    // Same external id, other tenant: allowed, the identity is per tenant.
    await setCurrentTenant(runner, tenantB);
    await insertLink(runner, { externalId: '101' });
    const visibleToB = await runner.query(`SELECT id FROM asset_external_links`);
    assert.equal(visibleToB.length, 1, 'tenant B must not see tenant A rows');
    assert.notEqual(visibleToB[0].id, linkA);

    // Writing a row for another tenant is refused by the policy. A refused
    // statement poisons the transaction, so every one of them runs inside its
    // own savepoint.
    await expectRefused(runner, /row-level security/i, () =>
      insertLink(runner, { externalId: '999', tenantId: tenantA }));

    await setCurrentTenant(runner, tenantA);
    assert.equal((await runner.query(`SELECT id FROM asset_external_links`)).length, 1);

    // A second row with the same identity in the same tenant is refused.
    await expectRefused(runner, /duplicate key/i, () => insertLink(runner, { externalId: '101' }));
    // A different object family with the same id is a different object.
    await runner.query(
      `INSERT INTO asset_external_links (source, external_type, external_id) VALUES ('netbox', 'vm', '101')`,
    );

    // One asset is owned by at most one LIVE record; a record that is missing,
    // ignored, ambiguous or in error does not own its asset.
    const secondAsset = await seedAsset(runner, tenantA, 'netbox-rls-a2');
    const liveOnSecond = await insertLink(runner, { externalId: '201', assetId: secondAsset });
    await expectRefused(runner, /duplicate key/i, () =>
      insertLink(runner, { externalId: '202', assetId: secondAsset }));
    for (const state of ['missing', 'ignored', 'ambiguous', 'error']) {
      await runner.query(
        `INSERT INTO asset_external_links (source, external_type, external_id, asset_id, state)
         VALUES ('netbox', 'device', $1, $2, $3)`,
        [`20-${state}`, secondAsset, state],
      );
    }
    // Promoting one of those to live while the first is still live is refused.
    await expectRefused(runner, /duplicate key/i, () => runner.query(
      `UPDATE asset_external_links SET state = 'linked'
       WHERE tenant_id = $1 AND external_id = $2`,
      [tenantA, '20-missing'],
    ));
    // Once the live one steps aside, the takeover goes through.
    await runner.query(`DELETE FROM asset_external_links WHERE id = $1`, [liveOnSecond]);
    await runner.query(
      `UPDATE asset_external_links SET state = 'linked' WHERE tenant_id = $1 AND external_id = $2`,
      [tenantA, '20-missing'],
    );

    // Deleting the asset unlinks the row instead of removing it.
    await runner.query(`DELETE FROM assets WHERE id = $1`, [assetA]);
    const orphan = await runner.query(`SELECT asset_id, state FROM asset_external_links WHERE id = $1`, [linkA]);
    assert.equal(orphan.length, 1, 'the inventory row must survive the asset');
    assert.equal(orphan[0].asset_id, null);
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

// ---------------------------------------------------------------- audit ----

async function testSystemAuditSourceIsRecorded() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const tenantId = await seedTenant(runner, 'audit');
    await setCurrentTenant(runner, tenantId);
    const assetId = await seedAsset(runner, tenantId, 'netbox-audit');

    const audit = new AuditService(runner.manager.getRepository(AuditLog));
    const hardware = new AssetsHardwareService(
      runner.manager.getRepository(Asset),
      runner.manager.getRepository(AssetHardwareInfo),
      audit,
    );

    await hardware.upsertHardwareInfo(
      assetId,
      { serial_number: 'SN-NETBOX-1' },
      tenantId,
      null,
      { manager: runner.manager, tenantId, source: 'system', sourceRef: 'netbox' },
    );
    // A caller that says nothing keeps the previous behaviour exactly.
    await hardware.upsertHardwareInfo(
      assetId,
      { serial_number: 'SN-BY-HAND' },
      tenantId,
      null,
      { manager: runner.manager, tenantId },
    );

    // now() is frozen inside a transaction, so the two entries are told apart
    // by what they recorded rather than by their timestamp.
    const entries: Array<{ serial: string; source: string; source_ref: string | null; user_id: string | null }> =
      await runner.query(
        `SELECT after_json->>'serial_number' AS serial, source, source_ref, user_id FROM audit_log
         WHERE tenant_id = $1 AND table_name = 'asset_hardware_info'`,
        [tenantId],
      );
    const bySerial = new Map(entries.map((entry) => [entry.serial, entry]));
    assert.equal(entries.length, 2);

    const synced = bySerial.get('SN-NETBOX-1');
    assert.ok(synced);
    assert.equal(synced.source, 'system');
    assert.equal(synced.source_ref, 'netbox');
    assert.equal(synced.user_id, null);

    const manual = bySerial.get('SN-BY-HAND');
    assert.ok(manual);
    assert.equal(manual.source, 'system', 'no user id still means a system entry');
    assert.equal(manual.source_ref, null, 'a caller that says nothing must not inherit a source reference');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function run() {
  await dataSource.initialize();
  try {
    await testTableIsTenantIsolated();
    await testRowsAreInvisibleToOtherTenants();
    await testSystemAuditSourceIsRecorded();
  } finally {
    await dataSource.destroy();
  }
}

void run().then(() => console.log('netbox-external-links.integration.spec.ts OK'));
