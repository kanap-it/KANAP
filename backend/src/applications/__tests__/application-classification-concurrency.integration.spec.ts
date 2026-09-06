import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import dataSource from '../../data-source';
import { Application } from '../application.entity';
import { ApplicationsCrudService } from '../services/applications-crud.service';
import { ApplicationsCsvService } from '../applications-csv.service';
import { ItOpsSettingsService } from '../../it-ops-settings/it-ops-settings.service';
import { Tenant } from '../../tenants/tenant.entity';
import { Location } from '../../locations/location.entity';
import { catalogToMetadata, DEFAULT_CLASSIFICATION_CATALOG } from '../../it-ops-settings/classification-catalog';

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function setTenant(runner: any, tenantId: string) {
  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenantId]);
}

async function main() {
  if (!process.env.DATABASE_URL?.endsWith('/kanap_classification_v1_test')) {
    throw new Error('Only isolated kanap_classification_v1_test is allowed');
  }

  await dataSource.initialize();
  const tenantId = randomUUID();
  const applicationId = randomUUID();
  const setup = dataSource.createQueryRunner();
  const publisher = dataSource.createQueryRunner();
  const writer = dataSource.createQueryRunner();
  const csvRunner = dataSource.createQueryRunner();
  const cleanup = dataSource.createQueryRunner();
  for (const runner of [setup, publisher, writer, csvRunner, cleanup]) await runner.connect();

  try {
    const identity = await setup.query(`SELECT current_user AS name, rolsuper FROM pg_roles WHERE rolname = current_user`);
    assert.equal(identity[0]?.rolsuper, false, `test must use the non-superuser app connection, got ${identity[0]?.name}`);

    await setup.startTransaction();
    await setup.query(
      `INSERT INTO tenants(id, slug, name, metadata) VALUES ($1, $2, $3, $4::jsonb)`,
      [tenantId, `classification-concurrency-${tenantId}`, 'Classification concurrency test', JSON.stringify({ it_ops: catalogToMetadata({ ...DEFAULT_CLASSIFICATION_CATALOG, businessMtdPresets: [...DEFAULT_CLASSIFICATION_CATALOG.businessMtdPresets, 500, 550] }) })],
    );
    await setTenant(setup, tenantId);
    await setup.query(
      `INSERT INTO applications(id, tenant_id, name, criticality, business_mtd_minutes, business_criticality_origin, classification_revision)
       VALUES ($1, $2, 'Concurrent Atlas', 'high', 500, 'derived', 1)`,
      [applicationId, tenantId],
    );
    await setup.commitTransaction();

    await Promise.all([setTenant(publisher, tenantId), setTenant(writer, tenantId), setTenant(csvRunner, tenantId)]);

    const publicationReachedAudit = deferred();
    const allowPublicationCommit = deferred();
    const publicationAudit = {
      log: async (entry: any) => {
        if (entry.table !== 'tenants') return;
        publicationReachedAudit.resolve();
        await allowPublicationCommit.promise;
      },
    };
    const publisherSettings = new ItOpsSettingsService(
      publisher.manager.getRepository(Tenant), publisher.manager.getRepository(Location), publicationAudit as any,
    );
    const oldCatalog = await publisherSettings.getClassificationCatalog(tenantId, { manager: publisher.manager });
    const changedLevels = structuredClone(oldCatalog.businessCriticalityLevels);
    changedLevels[0].maxMtdMinutes = 600;
    const publication = publisherSettings.updateSettings(tenantId, {
      businessCriticalityLevels: changedLevels,
      expectedClassificationSettingsRevision: oldCatalog.classificationSettingsRevision,
    }, { manager: publisher.manager });
    await publicationReachedAudit.promise;

    const writerSettings = new ItOpsSettingsService(
      writer.manager.getRepository(Tenant), writer.manager.getRepository(Location), { log: async () => undefined } as any,
    );
    const crud = new ApplicationsCrudService(
      writer.manager.getRepository(Application), { log: async () => undefined } as any,
      null as any, writerSettings, null as any, null as any,
    );
    let staleFinished = false;
    const staleUpdate = crud.update(applicationId, {
      business_mtd_minutes: 550,
      expected_classification_revision: 2,
      expected_classification_versions: oldCatalog.classificationVersions,
    } as any, null, { manager: writer.manager }).finally(() => { staleFinished = true; });
    await delay(100);
    assert.equal(staleFinished, false, 'application update must wait for the tenant catalog publication lock');
    allowPublicationCommit.resolve();
    await publication;
    await assert.rejects(staleUpdate, /methodology changed/i);

    const latestCatalog = await writerSettings.getClassificationCatalog(tenantId, { manager: writer.manager });
    const current = await writer.manager.getRepository(Application).findOneByOrFail({ id: applicationId, tenant_id: tenantId });
    assert.equal(current.criticality, 'business_critical', 'publication must reclassify with the latest thresholds');
    const updated = await crud.update(applicationId, {
      business_mtd_minutes: 550,
      expected_classification_revision: current.classification_revision,
      expected_classification_versions: latestCatalog.classificationVersions,
    } as any, null, { manager: writer.manager });
    assert.equal(updated.criticality, 'business_critical', 'retry must calculate with the published catalog');

    const csvEntered = deferred();
    const allowCsvFailure = deferred();
    const failingImport = {
      import: async (_config: any, _file: any, _params: any, opts: any) => {
        await opts.manager.query(`UPDATE applications SET name = 'MUST ROLLBACK' WHERE id = $1 AND tenant_id = $2`, [applicationId, tenantId]);
        csvEntered.resolve();
        await allowCsvFailure.promise;
        return { ok: false, dryRun: false, total: 1, inserted: 0, updated: 0, skipped: 1, errors: [{ row: 0, message: 'injected post-write failure' }], warnings: [] };
      },
    };
    const csv = new ApplicationsCsvService(
      csvRunner.manager.getRepository(Application), null as any, null as any, null as any,
      failingImport as any, null as any, null as any, null as any,
    );
    const csvFailure = csv.import(
      { buffer: Buffer.from('name\nConcurrent Atlas\n'), originalname: 'rollback.csv' } as Express.Multer.File,
      { dryRun: false, mode: 'enrich', operation: 'upsert' },
      { manager: csvRunner.manager, tenantId },
    );
    await csvEntered.promise;

    const catalogBeforeSecondPublication = await publisherSettings.getClassificationCatalog(tenantId, { manager: publisher.manager });
    const renamedCyber = structuredClone(catalogBeforeSecondPublication.cyberCriticalityLevels);
    renamedCyber[0].label = 'Low renamed after CSV';
    let secondPublicationFinished = false;
    const secondPublication = publisherSettings.updateSettings(tenantId, {
      cyberCriticalityLevels: renamedCyber,
      expectedClassificationSettingsRevision: catalogBeforeSecondPublication.classificationSettingsRevision,
    }, { manager: publisher.manager }).finally(() => { secondPublicationFinished = true; });
    await delay(100);
    assert.equal(secondPublicationFinished, false, 'settings publication must wait for the CSV tenant lock');
    allowCsvFailure.resolve();
    await assert.rejects(csvFailure, BadRequestException);
    await secondPublication;

    const afterFailedCsv = await writer.manager.getRepository(Application).findOneByOrFail({ id: applicationId, tenant_id: tenantId });
    assert.equal(afterFailedCsv.name, 'Concurrent Atlas', 'a row-0 CSV failure must roll back writes made by the importer');
    const afterSecondPublication = await writerSettings.getClassificationCatalog(tenantId, { manager: writer.manager });
    assert.equal(afterSecondPublication.cyberCriticalityLevels[0].label, 'Low renamed after CSV');

    console.log('PASS: isolated non-superuser catalog/application/CSV lock ordering, stale versions, latest derivation and CSV rollback');
  } finally {
    for (const runner of [setup, publisher, writer, csvRunner]) {
      if (runner.isTransactionActive) await runner.rollbackTransaction().catch(() => undefined);
    }
    await setTenant(cleanup, tenantId).catch(() => undefined);
    await cleanup.query(`DELETE FROM audit_log WHERE record_id IN ($1, $2)`, [tenantId, applicationId]).catch(() => undefined);
    await cleanup.query(`DELETE FROM applications WHERE tenant_id = $1`, [tenantId]).catch(() => undefined);
    await cleanup.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]).catch(() => undefined);
    for (const runner of [setup, publisher, writer, csvRunner, cleanup]) await runner.release().catch(() => undefined);
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
