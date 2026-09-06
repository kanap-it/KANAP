import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import dataSource from '../../data-source';

const DATABASE_URL = process.env.DATABASE_URL ?? '';
const API_URL = process.env.CLASSIFICATION_TEST_API_URL ?? '';
const JWT_SECRET = process.env.JWT_SECRET ?? '';

type Identity = { roleId: string; userId: string; email: string };

async function main() {
  if (!DATABASE_URL.endsWith('/kanap_classification_v1_test')) throw new Error('Only isolated kanap_classification_v1_test is allowed');
  if (API_URL !== 'http://localhost:8086') throw new Error('CLASSIFICATION_TEST_API_URL must be exactly http://localhost:8086');
  if (JWT_SECRET !== 'classification-local-test-only-secret') throw new Error('Unexpected JWT_SECRET for isolated HTTP smoke');

  await dataSource.initialize();
  const manager = dataSource.manager;
  const tenants = await manager.query(`SELECT id FROM tenants WHERE slug = 'classification-test' LIMIT 1`);
  assert.equal(tenants.length, 1, 'isolated classification-test tenant must exist');
  const tenantId: string = tenants[0].id;
  const identities: Identity[] = [];
  const applicationIds: string[] = [];

  const createIdentity = async (label: string, permissions: Record<string, string>): Promise<Identity> => {
    const identity = { roleId: randomUUID(), userId: randomUUID(), email: `${label}-${randomUUID()}@test.invalid` };
    await manager.transaction(async (tx) => {
      await tx.query(`SELECT set_config('app.current_tenant',$1,true)`, [tenantId]);
      await tx.query(`INSERT INTO roles(id,tenant_id,role_name,role_description,is_system,is_built_in) VALUES ($1,$2,$3,'Temporary HTTP permissions smoke',false,false)`, [identity.roleId, tenantId, `HTTP smoke ${label} ${identity.roleId}`]);
      await tx.query(`INSERT INTO users(id,tenant_id,email,first_name,last_name,role_id,status) VALUES ($1,$2,$3,'HTTP','Smoke',$4,'enabled')`, [identity.userId, tenantId, identity.email, identity.roleId]);
      for (const [resource, level] of Object.entries(permissions)) {
        await tx.query(`INSERT INTO role_permissions(tenant_id,role_id,resource,level) VALUES ($1,$2,$3,$4)`, [tenantId, identity.roleId, resource, level]);
      }
    });
    identities.push(identity);
    return identity;
  };

  const request = async (identity: Identity, path: string, init: RequestInit = {}) => {
    const token = jwt.sign({ sub: identity.userId, email: identity.email, role: 'temporary', tenant_id: tenantId }, JWT_SECRET, { expiresIn: '5m' });
    return fetch(`${API_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
  };

  try {
    const reader = await createIdentity('applications-reader', { applications: 'reader' });
    const member = await createIdentity('applications-member', { applications: 'member' });
    const unrelated = await createIdentity('settings-reader', { settings: 'reader' });

    const catalogResponse = await request(reader, '/applications/classification-catalog');
    assert.equal(catalogResponse.status, 200);
    const catalog: any = await catalogResponse.json();
    assert.ok(Array.isArray(catalog.businessMtdPresets) && catalog.businessMtdPresets.length > 0);

    assert.equal((await request(reader, '/it-ops/settings/classification-preview', { method: 'POST', body: '{}' })).status, 403);
    assert.equal((await request(reader, '/it-ops/settings', { method: 'PATCH', body: '{}' })).status, 403);
    assert.equal((await request(reader, '/applications', { method: 'POST', body: JSON.stringify({ name: 'reader denied' }) })).status, 403);
    assert.equal((await request(reader, `/applications/${randomUUID()}/classification-review`, { method: 'POST', body: JSON.stringify({ expected_revision: 0 }) })).status, 403);
    assert.equal((await request(unrelated, '/applications/classification-catalog')).status, 403);

    const createResponse = await request(member, '/applications', {
      method: 'POST',
      body: JSON.stringify({
        name: `HTTP classification ${randomUUID()}`,
        business_mtd_minutes: catalog.businessMtdPresets[0],
        cyber_criticality: catalog.cyberCriticalityLevels.find((row: any) => !row.deprecated)?.code,
        data_class: catalog.dataClasses.find((row: any) => !row.deprecated)?.code,
        recovery_wave: catalog.recoveryWaves.find((row: any) => !row.deprecated)?.code,
        rpo_minutes: 0,
        classification_justification: 'HTTP permissions regression',
      }),
    });
    if (createResponse.status !== 201) throw new Error(`member create returned ${createResponse.status}: ${await createResponse.text()}`);
    const application: any = await createResponse.json();
    applicationIds.push(application.id);

    const reviewResponse = await request(member, `/applications/${application.id}/classification-review`, {
      method: 'POST',
      body: JSON.stringify({ expected_revision: application.classification_revision, expected_classification_versions: catalog.classificationVersions }),
    });
    if (reviewResponse.status !== 201) throw new Error(`member review returned ${reviewResponse.status}: ${await reviewResponse.text()}`);
    const reviewed: any = await reviewResponse.json();
    assert.equal(reviewed.classification_review_state, 'reviewed');

    console.log('PASS: HTTP classification permissions catalog/settings/create/review guards');
  } finally {
    await manager.transaction(async (tx) => {
      await tx.query(`SELECT set_config('app.current_tenant',$1,true)`, [tenantId]);
      if (applicationIds.length) await tx.query(`DELETE FROM applications WHERE tenant_id=$1 AND id = ANY($2::uuid[])`, [tenantId, applicationIds]);
      const userIds = identities.map((identity) => identity.userId);
      const roleIds = identities.map((identity) => identity.roleId);
      if (userIds.length) {
        await tx.query(`DELETE FROM audit_log WHERE tenant_id=$1 AND user_id = ANY($2::uuid[])`, [tenantId, userIds]);
        await tx.query(`DELETE FROM users WHERE tenant_id=$1 AND id = ANY($2::uuid[])`, [tenantId, userIds]);
      }
      if (roleIds.length) {
        await tx.query(`DELETE FROM role_permissions WHERE tenant_id=$1 AND role_id = ANY($2::uuid[])`, [tenantId, roleIds]);
        await tx.query(`DELETE FROM roles WHERE tenant_id=$1 AND id = ANY($2::uuid[])`, [tenantId, roleIds]);
      }
    });
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
