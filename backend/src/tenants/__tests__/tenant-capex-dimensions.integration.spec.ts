import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dataSource from '../../data-source';
import { ensureCapexDimensions } from '../../analytics/capex-dimensions.seed';
import {
  buildServices,
  cleanupTenants,
  createActivatedTenant,
  inTenant,
  runSpecs,
} from '../../admin/tenants/__tests__/tenant-reset-test-helpers';

// The three CAPEX dimensions every tenant starts with (lot C1a, `seedTenantDefaults`): a new
// tenant gets them after its default dimension, used for CAPEX lines, required, with their 13
// values in their order; seeding again creates nothing; a tenant that already has a dimension of
// one of the codes keeps it as it is and gets only the values it lacks, a name another dimension
// holds gets " (CAPEX)"; a reset gives them back as on a new tenant. The tenants are committed
// (the services open their own transactions) and removed at the end.

const VALUES = {
  ppe_type: ['1 Hardware', '2 Software'],
  investment_type: ['1 Replacement', '2 Capacity', '3 Productivity', '4 Security', '5 Conformity', '6 Business growth', '7 Other'],
  priority: ['1 Mandatory', '2 High', '3 Medium', '4 Low'],
};

async function dimensionsOf(tenantId: string) {
  const rows = await inTenant(tenantId, (manager) => manager.query(
    `SELECT a.code, a.name, a.sort_order, a.applies_to, a.required, a.status::text AS status, a.is_default,
            coalesce((SELECT array_agg(c.sort_order || ' ' || c.name ORDER BY c.sort_order, c.name)
                        FROM analytics_categories c WHERE c.tenant_id = $1 AND c.axis_id = a.id), '{}') AS vals
       FROM analytics_axes a WHERE a.tenant_id = $1 ORDER BY a.sort_order, a.code`,
    [tenantId],
  ));
  return rows.map((row: any) => ({ ...row, vals: [...row.vals] }));
}

async function idsOf(tenantId: string): Promise<string[]> {
  const rows = await inTenant(tenantId, (manager) => manager.query(
    `SELECT id::text AS id FROM analytics_axes WHERE tenant_id = $1
     UNION ALL SELECT id::text FROM analytics_categories WHERE tenant_id = $1 ORDER BY 1`,
    [tenantId],
  ));
  return rows.map((row: any) => row.id);
}

const STARTING = [
  { code: 'default', name: null, sort_order: 0, applies_to: null, required: false, status: 'enabled', is_default: true, vals: [] },
  { code: 'ppe_type', name: 'PP&E type', sort_order: 1, applies_to: 'capex', required: true, status: 'enabled', is_default: false, vals: VALUES.ppe_type },
  { code: 'investment_type', name: 'Investment type', sort_order: 2, applies_to: 'capex', required: true, status: 'enabled', is_default: false, vals: VALUES.investment_type },
  { code: 'priority', name: 'Priority', sort_order: 3, applies_to: 'capex', required: true, status: 'enabled', is_default: false, vals: VALUES.priority },
];

async function testNewTenant() {
  const svc = buildServices();
  let tenantId: string | undefined;
  try {
    tenantId = (await svc.tenants.createTenant({ slug: `rs-capexdim-${randomUUID().slice(0, 8)}`, name: 'CAPEX dimensions Org' })).id;
    assert.deepEqual(await dimensionsOf(tenantId), STARTING, 'a new tenant: the default dimension, then the three CAPEX dimensions');
    const ids = await idsOf(tenantId);
    assert.equal(ids.length, 4 + 13);
    await inTenant(tenantId, (manager) => svc.tenants.seedTenantDefaults(manager, tenantId!));
    assert.deepEqual(await idsOf(tenantId), ids, 'seeding again creates nothing');
    assert.deepEqual(await dimensionsOf(tenantId), STARTING);
  } finally {
    await cleanupTenants([tenantId]);
  }
}

async function testExistingCodeAndTakenName() {
  const tenantId = randomUUID();
  try {
    await dataSource.query(
      `INSERT INTO tenants (id, slug, name, status, metadata, branding, created_at, updated_at)
       VALUES ($1, $2, 'CAPEX dimensions taken', 'active', '{}'::jsonb, '{"logo_version":0,"use_logo_in_dark":true}'::jsonb, now(), now())`,
      [tenantId, `rs-capexdim-taken-${tenantId.slice(0, 8)}`],
    );
    const outcomes = await inTenant(tenantId, async (manager) => {
      const [own] = await manager.query(
        `INSERT INTO analytics_axes (tenant_id, code, name, sort_order) VALUES ($1, 'priority', 'Urgency', 4) RETURNING id`, [tenantId]);
      await manager.query(`INSERT INTO analytics_categories (tenant_id, axis_id, name, sort_order) VALUES ($1, $2, 'Urgent', 1), ($1, $2, 'high', 2)`,
        [tenantId, own.id]);
      await manager.query(`INSERT INTO analytics_axes (tenant_id, code, name, sort_order) VALUES ($1, 'kind', 'PP&E type', 9)`, [tenantId]);
      return ensureCapexDimensions(manager, tenantId);
    });
    assert.deepEqual(outcomes.map(({ code, created, name, valuesCreated }) => ({ code, created, name, valuesCreated })), [
      { code: 'ppe_type', created: true, name: 'PP&E type (CAPEX)', valuesCreated: 2 },
      { code: 'investment_type', created: true, name: 'Investment type', valuesCreated: 7 },
      { code: 'priority', created: false, name: 'Urgency', valuesCreated: 3 },
    ]);
    assert.deepEqual((await dimensionsOf(tenantId)).map((row: any) => [row.code, row.name, row.sort_order, row.applies_to, row.required, row.vals]), [
      ['priority', 'Urgency', 4, null, false, ['1 Urgent', '2 high', '3 Mandatory', '4 Medium', '5 Low']],
      ['kind', 'PP&E type', 9, null, false, []],
      ['ppe_type', 'PP&E type (CAPEX)', 10, 'capex', true, VALUES.ppe_type],
      ['investment_type', 'Investment type', 11, 'capex', true, VALUES.investment_type],
    ], 'a dimension of the code kept as it is (its settings, its values first); a taken name suffixed; new ones last');
    const again = await inTenant(tenantId, (manager) => ensureCapexDimensions(manager, tenantId));
    assert.deepEqual(again.map((outcome) => [outcome.created, outcome.valuesCreated]), [[false, 0], [false, 0], [false, 0]], 'idempotent');
  } finally {
    await cleanupTenants([tenantId]);
  }
}

async function testResetGivesThemBack() {
  const svc = buildServices();
  let tenant: Awaited<ReturnType<typeof createActivatedTenant>> | undefined;
  try {
    tenant = await createActivatedTenant(svc, { tag: 'capexdim-reset', orgName: 'CAPEX dimensions Reset' });
    assert.deepEqual(await dimensionsOf(tenant.tenantId), STARTING, 'an activated tenant');
    // The administrator renamed one, removed a value, disabled another.
    await inTenant(tenant.tenantId, async (manager) => {
      await manager.query(`UPDATE analytics_axes SET name = 'Type d''immobilisation' WHERE tenant_id = $1 AND code = 'ppe_type'`, [tenant!.tenantId]);
      await manager.query(
        `DELETE FROM analytics_categories c USING analytics_axes a
          WHERE c.tenant_id = $1 AND a.id = c.axis_id AND a.code = 'priority' AND c.name = 'Low'`,
        [tenant!.tenantId],
      );
      await manager.query(`UPDATE analytics_axes SET status = 'disabled', disabled_at = now() WHERE tenant_id = $1 AND code = 'investment_type'`, [tenant!.tenantId]);
    });
    await svc.reset.reset(tenant.tenantId, tenant.ownerId);
    assert.deepEqual(await dimensionsOf(tenant.tenantId), STARTING, 'after a reset: as on a new tenant');
  } finally {
    await cleanupTenants([tenant?.tenantId]);
  }
}

runSpecs('tenant-capex-dimensions.integration.spec', [testNewTenant, testExistingCodeAndTakenName, testResetGivesThemBack]);
