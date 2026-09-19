import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import dataSource from '../../data-source';
import { AuditLog } from '../../audit/audit.entity';
import { AuditService } from '../../audit/audit.service';
import { Asset } from '../asset.entity';
import { AssetsDeleteService } from '../assets-delete.service';

// Asset deletion against a real database. The guard that looks for connections
// using the asset is raw SQL over the connection tables, so a column renamed by
// a migration only shows up here: it broke every asset deletion with a 500
// once connection legs moved to a single equipment column.

async function setCurrentTenant(runner: QueryRunner, tenantId: string) {
  await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
}

async function seedTenant(runner: QueryRunner): Promise<string> {
  const tenantId = randomUUID();
  await runner.query(
    `INSERT INTO tenants (id, slug, name, status, metadata, branding, created_at, updated_at)
     VALUES ($1, $2, 'Asset delete test', 'active', '{}'::jsonb, '{"logo_version":0,"use_logo_in_dark":true}'::jsonb, now(), now())`,
    [tenantId, `asset-delete-${tenantId.slice(0, 8)}`],
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

async function seedConnectionThrough(runner: QueryRunner, tenantId: string, hopAssetId: string) {
  const connectionId = randomUUID();
  await runner.query(
    `INSERT INTO connections (id, tenant_id, connection_reference, name, topology)
     VALUES ($1, $2, $3, 'Paris to Gouda', 'server_to_server')`,
    [connectionId, tenantId, `CON-${connectionId.slice(0, 6)}`],
  );
  await runner.query(
    `INSERT INTO connection_legs (tenant_id, connection_id, order_index, equipment_asset_id)
     VALUES ($1, $2, 1, $3)`,
    [tenantId, connectionId, hopAssetId],
  );
}

async function run() {
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const tenantId = await seedTenant(runner);
    await setCurrentTenant(runner, tenantId);
    const service = new AssetsDeleteService(
      runner.manager.getRepository(Asset),
      new AuditService(runner.manager.getRepository(AuditLog)),
    );

    const plain = await seedAsset(runner, tenantId, 'par-spare-01');
    const hop = await seedAsset(runner, tenantId, 'par-fw-01');
    await seedConnectionThrough(runner, tenantId, hop);

    // An asset nothing depends on goes away.
    assert.deepEqual(await service.deleteAsset(plain, tenantId, null, { manager: runner.manager }), { deleted: true });
    const left = await runner.query(`SELECT id FROM assets WHERE tenant_id = $1 AND id = $2`, [tenantId, plain]);
    assert.equal(left.length, 0);

    // An asset a connection passes through is refused, with the connection named.
    await runner.query('SAVEPOINT hop_delete');
    await assert.rejects(
      () => service.deleteAsset(hop, tenantId, null, { manager: runner.manager }),
      (error: unknown) => error instanceof ConflictException && /Paris to Gouda/.test(String((error as Error).message)),
    );
    await runner.query('ROLLBACK TO SAVEPOINT hop_delete');
    const kept = await runner.query(`SELECT id FROM assets WHERE tenant_id = $1 AND id = $2`, [tenantId, hop]);
    assert.equal(kept.length, 1);
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await dataSource.destroy();
  }
}

run()
  .then(() => console.log('assets-delete.integration.spec.ts OK'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
