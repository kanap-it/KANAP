/**
 * §3.8 (CSV) and §3.3 (closure snapshot) integration coverage for the incident
 * review document — phase A3.
 *
 * Sibling of `knowledge/__tests__/incident-review-access.integration.spec.ts`
 * and wired into the same npm script (`test:incident-review-access`). Runs the
 * real SQL against `DATABASE_URL`; every test seeds inside a transaction that is
 * rolled back afterwards.
 */
import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { QueryRunner } from 'typeorm';
import dataSource from '../../data-source';
import { CsvExportService } from '../../common/csv/csv-export.service';
import { CsvImportService } from '../../common/csv/csv-import.service';
import { CsvJsonValidators } from '../../common/csv/csv-json-validators';
import { CsvResolverService } from '../../common/csv/csv-resolver.service';
import { ItemNumberService } from '../../common/item-number.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { IntegratedDocumentsService } from '../../knowledge/integrated-documents.service';
import { seedManagedDocsKnowledgeAssets } from '../../knowledge/integrated-document-seed';
import { Document } from '../../knowledge/document.entity';
import { DocumentActivity } from '../../knowledge/document-activity.entity';
import { DocumentApplication } from '../../knowledge/document-application.entity';
import { DocumentAsset } from '../../knowledge/document-asset.entity';
import { DocumentAttachment } from '../../knowledge/document-attachment.entity';
import { DocumentClassification } from '../../knowledge/document-classification.entity';
import { DocumentContributor } from '../../knowledge/document-contributor.entity';
import { DocumentEditLock } from '../../knowledge/document-edit-lock.entity';
import { DocumentFolder } from '../../knowledge/document-folder.entity';
import { DocumentLibrary } from '../../knowledge/document-library.entity';
import { DocumentProject } from '../../knowledge/document-project.entity';
import { DocumentReference } from '../../knowledge/document-reference.entity';
import { DocumentRequest } from '../../knowledge/document-request.entity';
import { DocumentTask } from '../../knowledge/document-task.entity';
import { DocumentType } from '../../knowledge/document-type.entity';
import { DocumentVersion } from '../../knowledge/document-version.entity';
import { IntegratedDocumentBinding } from '../../knowledge/integrated-document-binding.entity';
import { PermissionsService } from '../../permissions/permissions.service';
import { RolePermission } from '../../permissions/role-permission.entity';
import { UserPageRole } from '../../permissions/user-page-role.entity';
import { User } from '../../users/user.entity';
import { Incident } from '../incident.entity';
import { IncidentsCsvService } from '../incidents-csv.service';
import { IncidentsService } from '../services/incidents.service';

type Fixture = Awaited<ReturnType<typeof seedFixture>>;

const REVIEW_HEADERS = 'ref;title;severity;status;detected_at;confidential;description;review';

function createKnowledgeService(manager: any): KnowledgeService {
  const permissions = new PermissionsService(
    manager.getRepository(UserPageRole),
    manager.getRepository(RolePermission),
  );
  const users: any = {
    findById: async (id: string, opts?: any) => (opts?.manager ?? manager)
      .getRepository(User)
      .findOne({ where: { id }, relations: ['role'] }),
  };
  const audit: any = { log: async () => undefined };
  const storage: any = {
    putObject: async () => undefined,
    deleteObject: async () => undefined,
    getObjectStream: async () => ({ stream: null, contentType: null, contentLength: null }),
  };
  const notifications: any = { notifyShare: async () => undefined };
  const itemNumbers = new ItemNumberService();

  return new KnowledgeService(
    manager.getRepository(Document),
    manager.getRepository(DocumentFolder),
    manager.getRepository(IntegratedDocumentBinding),
    manager.getRepository(DocumentLibrary),
    manager.getRepository(DocumentType),
    manager.getRepository(DocumentVersion),
    manager.getRepository(DocumentEditLock),
    manager.getRepository(DocumentAttachment),
    manager.getRepository(DocumentActivity),
    manager.getRepository(DocumentContributor),
    manager.getRepository(DocumentClassification),
    manager.getRepository(DocumentReference),
    manager.getRepository(DocumentApplication),
    manager.getRepository(DocumentAsset),
    manager.getRepository(DocumentProject),
    manager.getRepository(DocumentRequest),
    manager.getRepository(DocumentTask),
    itemNumbers as any,
    audit,
    {} as any,
    {} as any,
    storage,
    {} as any,
    dataSource,
    permissions,
    users,
    {} as any,
    notifications,
  );
}

function createServices(manager: any) {
  const knowledge = createKnowledgeService(manager);
  const permissions = new PermissionsService(
    manager.getRepository(UserPageRole),
    manager.getRepository(RolePermission),
  );
  const importService: any = {
    convertToMarkdown: async () => ({ markdown: '', images: [], warnings: [], omittedTargets: [] }),
  };
  const integrated = new IntegratedDocumentsService(
    manager.getRepository(IntegratedDocumentBinding),
    knowledge,
    permissions,
    importService,
  );
  const resolver = new CsvResolverService();
  const csv = new IncidentsCsvService(
    new CsvExportService(resolver),
    new CsvImportService(resolver, new CsvJsonValidators()),
    integrated,
  );
  const incidents = new IncidentsService(
    manager.getRepository(Incident),
    { log: async () => undefined } as any,
    new ItemNumberService(),
    integrated,
  );
  return { knowledge, integrated, csv, incidents };
}

async function setCurrentTenant(runner: QueryRunner, tenantId: string) {
  await runner.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
}

async function seedRole(
  runner: QueryRunner,
  tenantId: string,
  roleName: string,
  permissions: Record<string, 'reader' | 'contributor' | 'member' | 'admin'>,
) {
  const roleId = randomUUID();
  await runner.query(
    `INSERT INTO roles (id, tenant_id, role_name, role_description, is_system, is_built_in, created_at, updated_at)
     VALUES ($1, $2, $3, $3, false, false, now(), now())`,
    [roleId, tenantId, roleName],
  );
  for (const [resource, level] of Object.entries(permissions)) {
    await runner.query(
      `INSERT INTO role_permissions (id, tenant_id, role_id, resource, level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())`,
      [randomUUID(), tenantId, roleId, resource, level],
    );
  }
  return roleId;
}

async function seedUser(runner: QueryRunner, tenantId: string, roleId: string, email: string) {
  const userId = randomUUID();
  await runner.query(
    `INSERT INTO users (
       id, tenant_id, first_name, last_name, email, password_hash, role_id,
       mfa_enabled, status, created_at, updated_at
     )
     VALUES ($1, $2, $3, 'Tester', $4, null, $5, false, 'enabled', now(), now())`,
    [userId, tenantId, email.split('@')[0], email, roleId],
  );
  return userId;
}

async function seedFixture(runner: QueryRunner) {
  const tag = randomUUID().slice(0, 8);
  const tenantId = randomUUID();
  await runner.query(
    `INSERT INTO tenants (id, slug, name, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', now(), now())`,
    [tenantId, `a3-${tag}`, `a3-${tag}`],
  );
  await setCurrentTenant(runner, tenantId);
  // Same seed the tenant bootstrap runs: it creates the Managed Docs library,
  // the Incidents folder, the review document type, the template and the slot
  // settings row `provisionForIncident` reads.
  await seedManagedDocsKnowledgeAssets(runner.manager as any, tenantId);

  const roles = {
    admin: await seedRole(runner, tenantId, `IncAdmin ${tag}`, { incidents: 'admin', knowledge: 'member' }),
    contributor: await seedRole(runner, tenantId, `IncContrib ${tag}`, { incidents: 'contributor' }),
  };
  const users = {
    admin: await seedUser(runner, tenantId, roles.admin, `a3admin-${tag}@example.com`),
    contributor: await seedUser(runner, tenantId, roles.contributor, `a3contrib-${tag}@example.com`),
    other: await seedUser(runner, tenantId, roles.contributor, `a3other-${tag}@example.com`),
  };

  return { tag, tenantId, roles, users };
}

async function withFixture(fn: (runner: QueryRunner, fixture: Fixture) => Promise<void>) {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const fixture = await seedFixture(runner);
    await setCurrentTenant(runner, fixture.tenantId);
    await fn(runner, fixture);
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

function csvFile(content: string): Express.Multer.File {
  const withBom = content.startsWith('﻿') ? content : `﻿${content}`;
  return {
    buffer: Buffer.from(withBom, 'utf8'),
    fieldname: 'file',
    originalname: 'incidents.csv',
    encoding: 'utf8',
    mimetype: 'text/csv',
    size: Buffer.byteLength(withBom),
  } as Express.Multer.File;
}

/** CSV cell quoting: doubles the quotes, so a multiline Markdown body survives. */
function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function createIncident(
  runner: QueryRunner,
  f: Fixture,
  services: ReturnType<typeof createServices>,
  overrides: Record<string, unknown> = {},
) {
  return services.incidents.create(
    {
      title: `Incident ${randomUUID().slice(0, 6)}`,
      severity: 'major',
      detected_at: new Date().toISOString(),
      ...overrides,
    },
    f.users.admin,
    { manager: runner.manager, tenantId: f.tenantId, viewer: { userId: f.users.admin, isAdmin: true } },
  );
}

async function readReview(runner: QueryRunner, f: Fixture, incidentId: string) {
  const rows = await runner.manager.query(
    `SELECT d.id::text AS document_id, d.item_number, d.content_markdown, d.current_version_number,
            (SELECT count(*)::int FROM document_versions v WHERE v.document_id = d.id) AS versions
     FROM integrated_document_bindings b
     JOIN documents d ON d.id = b.document_id AND d.tenant_id = b.tenant_id
     WHERE b.tenant_id = $1 AND b.source_entity_type = 'incidents'
       AND b.source_entity_id = $2 AND b.slot_key = 'review'`,
    [f.tenantId, incidentId],
  );
  return rows[0] ?? null;
}

async function readEntries(runner: QueryRunner, f: Fixture, incidentId: string) {
  return runner.manager.query(
    `SELECT kind, content, changed_fields FROM incident_entries
     WHERE tenant_id = $1 AND incident_id = $2 ORDER BY occurred_at ASC, created_at ASC`,
    [f.tenantId, incidentId],
  );
}

function importOpts(runner: QueryRunner, f: Fixture, userId: string, isAdmin = true) {
  return {
    manager: runner.manager,
    tenantId: f.tenantId,
    userId,
    isAdmin,
    viewer: { userId, isAdmin },
  };
}

// ---------------------------------------------------------------------------
// 1. Provisioning at creation + the review column round-trips
// ---------------------------------------------------------------------------

const MULTILINE_REVIEW = [
  '## Description',
  '',
  'Mail stopped; **Lyon** offline.',
  '',
  '## Impact',
  '',
  '- 300 mailboxes',
  '- 2 h downtime',
  '',
  '![shot](https://cdn.example/a.png)',
].join('\n');

async function testExportImportRoundTrip() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const incident = await createIncident(runner, f, services);

    // Creation provisions the review from the template.
    const provisioned = await readReview(runner, f, incident.id);
    assert.ok(provisioned, 'creation must provision the review document');
    assert.match(provisioned.content_markdown, /## Lessons learned/);

    await services.integrated.writeIncidentReviewForImport(incident.id, MULTILINE_REVIEW, f.users.admin, {
      manager: runner.manager,
    });

    const exported = await services.csv.export({
      manager: runner.manager,
      tenantId: f.tenantId,
      viewer: { userId: f.users.admin, isAdmin: true },
    });
    assert.ok(exported.content.includes('review'), 'the review column is exported by default');
    assert.ok(exported.content.includes('- 300 mailboxes'), 'the multiline body is exported');

    const before = await readReview(runner, f, incident.id);
    const result = await services.csv.import(
      csvFile(exported.content.replace(/^﻿/, '')),
      { dryRun: false, mode: 'enrich', operation: 'upsert' },
      importOpts(runner, f, f.users.admin),
    );
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);

    const after = await readReview(runner, f, incident.id);
    assert.equal(after.content_markdown, MULTILINE_REVIEW, 'the Markdown round-trips unchanged');
    assert.equal(after.versions, before.versions, 'an identical body creates no version');
  });
}

// ---------------------------------------------------------------------------
// 2. Empty cell, dry run
// ---------------------------------------------------------------------------

async function testEmptyCellAndDryRun() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const incident = await createIncident(runner, f, services);
    await services.integrated.writeIncidentReviewForImport(incident.id, MULTILINE_REVIEW, f.users.admin, {
      manager: runner.manager,
    });
    const before = await readReview(runner, f, incident.id);

    // Empty cell: unchanged, in replace mode too.
    const empty = `${REVIEW_HEADERS}\nINC-${incident.item_number};Renamed;major;open;2026-03-10T08:00:00Z;false;short;`;
    const emptyResult = await services.csv.import(
      csvFile(empty),
      { dryRun: false, mode: 'replace', operation: 'upsert' },
      importOpts(runner, f, f.users.admin),
    );
    assert.deepEqual(emptyResult.errors, []);
    const afterEmpty = await readReview(runner, f, incident.id);
    assert.equal(afterEmpty.content_markdown, before.content_markdown, 'a blank cell leaves the review alone');
    assert.equal(afterEmpty.versions, before.versions);

    // Dry run: validated, nothing written, nothing provisioned.
    const incidentCount = await runner.manager.query(
      'SELECT count(*)::int AS total FROM incidents WHERE tenant_id = $1', [f.tenantId],
    );
    const dry = `${REVIEW_HEADERS}\nINC-${incident.item_number};Renamed;major;open;2026-03-10T08:00:00Z;false;short;${cell('## Impact\n\nnew body')}\n;Brand new;minor;open;2026-03-10T08:00:00Z;false;short;${cell('## Impact\n\nanother')}`;
    const dryResult = await services.csv.import(
      csvFile(dry),
      { dryRun: true, mode: 'enrich', operation: 'upsert' },
      importOpts(runner, f, f.users.admin),
    );
    assert.equal(dryResult.dryRun, true);
    assert.deepEqual(dryResult.errors, []);
    const afterDry = await readReview(runner, f, incident.id);
    assert.equal(afterDry.content_markdown, before.content_markdown, 'a dry run writes nothing');
    assert.equal(afterDry.versions, before.versions);
    const countAfter = await runner.manager.query(
      'SELECT count(*)::int AS total FROM incidents WHERE tenant_id = $1', [f.tenantId],
    );
    assert.equal(countAfter[0].total, incidentCount[0].total, 'a dry run inserts nothing');

    // Invalid Markdown is reported at dry run, before anything is provisioned.
    const bad = `${REVIEW_HEADERS}\nINC-${incident.item_number};Renamed;major;open;2026-03-10T08:00:00Z;false;short;${cell('<script>alert(1)</script>')}`;
    const badResult = await services.csv.import(
      csvFile(bad),
      { dryRun: true, mode: 'enrich', operation: 'upsert' },
      importOpts(runner, f, f.users.admin),
    );
    assert.equal(badResult.ok, false);
    assert.match(badResult.errors[0].message, /must be Markdown/);
  });
}

// ---------------------------------------------------------------------------
// 3. Insert rows: provisioning + review body
// ---------------------------------------------------------------------------

async function testInsertedRowsAreProvisioned() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const csv = [
      REVIEW_HEADERS,
      `;From template;minor;open;2026-03-10T08:00:00Z;false;short;`,
      `;With body;major;open;2026-03-10T08:00:00Z;false;short;${cell(MULTILINE_REVIEW)}`,
      `;Closed on import;major;closed;2026-03-10T08:00:00Z;false;short;${cell('## Impact\n\nimported closed')}`,
    ].join('\n');

    const result = await services.csv.import(
      csvFile(csv),
      { dryRun: false, mode: 'enrich', operation: 'upsert' },
      importOpts(runner, f, f.users.admin),
    );
    assert.deepEqual(result.errors, []);
    assert.equal(result.inserted, 3);

    const rows = await runner.manager.query(
      `SELECT id::text AS id, title, status FROM incidents WHERE tenant_id = $1 ORDER BY item_number ASC`,
      [f.tenantId],
    );
    assert.equal(rows.length, 3);

    const fromTemplate = await readReview(runner, f, rows[0].id);
    assert.ok(fromTemplate, 'an inserted row is provisioned');
    assert.match(fromTemplate.content_markdown, /## Corrective actions/);

    const withBody = await readReview(runner, f, rows[1].id);
    assert.equal(withBody.content_markdown, MULTILINE_REVIEW);

    // Inserted directly closed: the review exists and the closure snapshot was
    // taken after the review write, so it freezes the imported body (§3.8).
    const closed = await readReview(runner, f, rows[2].id);
    assert.match(closed.content_markdown, /imported closed/);
    const entries = await readEntries(runner, f, rows[2].id);
    const closure = entries.find((e: any) => e.changed_fields?.review_version);
    assert.ok(closure, 'the closure references a review version');
    assert.equal(closure.changed_fields.review_version.to.document_id, closed.document_id);
    assert.ok(closure.changed_fields.review_version.to.version_number >= 1);
    const closureVersion = await runner.manager.query(
      `SELECT content_markdown FROM document_versions
       WHERE document_id = $1 AND version_number = $2`,
      [closed.document_id, closure.changed_fields.review_version.to.version_number],
    );
    assert.match(closureVersion[0].content_markdown, /imported closed/);
  });
}

// ---------------------------------------------------------------------------
// 4. A closed incident can still be corrected by CSV, and it is versioned
// ---------------------------------------------------------------------------

async function testClosedIncidentImportIsAllowedAndVersioned() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const incident = await createIncident(runner, f, services);
    const opts = { manager: runner.manager, tenantId: f.tenantId, viewer: { userId: f.users.admin, isAdmin: true } };

    await services.integrated.writeIncidentReviewForImport(incident.id, MULTILINE_REVIEW, f.users.admin, {
      manager: runner.manager,
    });
    await services.incidents.update(incident.id, { status: 'closed' }, f.users.admin, opts);

    const entries = await readEntries(runner, f, incident.id);
    const closure = entries.find((e: any) => e.changed_fields?.review_version);
    assert.ok(closure, 'closing stores the review version on the transition entry');
    const closureVersionNumber = closure.changed_fields.review_version.to.version_number;

    // An ordinary document write is refused now.
    await assert.rejects(
      services.integrated.updateBySource(
        'incidents', incident.id, 'review',
        { content_markdown: 'sneaky', save_mode: 'manual' },
        f.users.admin, null, { manager: runner.manager },
      ),
      /closed/i,
      'the freeze exemption must not be reachable from the ordinary document route',
    );

    // The CSV exemption may correct it, and versions the change.
    const before = await readReview(runner, f, incident.id);
    const csv = `${REVIEW_HEADERS}\nINC-${incident.item_number};${incident.title};major;closed;2026-03-10T08:00:00Z;false;short;${cell('## Impact\n\ncorrected after closure')}`;
    const result = await services.csv.import(
      csvFile(csv),
      { dryRun: false, mode: 'enrich', operation: 'upsert' },
      importOpts(runner, f, f.users.admin),
    );
    assert.deepEqual(result.errors, []);

    const after = await readReview(runner, f, incident.id);
    assert.match(after.content_markdown, /corrected after closure/);
    assert.equal(after.versions, before.versions + 1, 'the CSV change is versioned');

    // The version the closure referenced is untouched.
    const stored = await runner.manager.query(
      `SELECT content_markdown FROM document_versions WHERE document_id = $1 AND version_number = $2`,
      [after.document_id, closureVersionNumber],
    );
    assert.match(stored[0].content_markdown, /300 mailboxes/, 'the closure version must not be rewritten');

    // And the import entry references its own version.
    const afterEntries = await readEntries(runner, f, incident.id);
    const importEntry = afterEntries.find(
      (e: any) => e.content === 'Incident review imported from CSV',
    );
    assert.ok(importEntry, 'an effective CSV change journals a system entry');
    assert.equal(importEntry.changed_fields.review_version.to.document_id, after.document_id);
    assert.notEqual(importEntry.changed_fields.review_version.to.version_number, closureVersionNumber);
  });
}

// ---------------------------------------------------------------------------
// 5. An invisible incident is refused, and a lock conflict rolls the row back
// ---------------------------------------------------------------------------

async function testInvisibleIncidentRefused() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const incident = await createIncident(runner, f, services, { confidential: true });
    const before = await readReview(runner, f, incident.id);

    const csv = `${REVIEW_HEADERS}\nINC-${incident.item_number};Hijacked;major;open;2026-03-10T08:00:00Z;true;short;${cell('## Impact\n\nleak')}`;
    const result = await services.csv.import(
      csvFile(csv),
      { dryRun: false, mode: 'enrich', operation: 'upsert' },
      importOpts(runner, f, f.users.other, false),
    );
    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /Unknown incident reference/);

    const after = await readReview(runner, f, incident.id);
    assert.equal(after.content_markdown, before.content_markdown);
    const row = await runner.manager.query(
      'SELECT title FROM incidents WHERE id = $1', [incident.id],
    );
    assert.notEqual(row[0].title, 'Hijacked', 'nothing of the refused row was applied');
  });
}

async function testLockConflictRollsBackTheUpsert() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const incident = await createIncident(runner, f, services);
    const review = await readReview(runner, f, incident.id);

    // Another user is editing the review through the incident route.
    await services.integrated.acquireLockBySource('incidents', incident.id, 'review', f.users.other, {
      manager: runner.manager,
    });

    const csv = `${REVIEW_HEADERS}\nINC-${incident.item_number};Renamed by import;major;open;2026-03-10T08:00:00Z;false;imported description;${cell('## Impact\n\nfrom csv')}`;
    const result = await services.csv.import(
      csvFile(csv),
      { dryRun: false, mode: 'enrich', operation: 'upsert' },
      importOpts(runner, f, f.users.admin),
    );
    assert.equal(result.ok, false, 'a foreign edit lock refuses the review write');
    assert.match(result.errors[0].message, /Import failed/);

    // The review write of an existing row runs before the upsert, so nothing
    // was applied at all.
    const row = await runner.manager.query(
      'SELECT title, description FROM incidents WHERE id = $1', [incident.id],
    );
    assert.notEqual(row[0].title, 'Renamed by import', 'the incident row must roll back too');
    assert.notEqual(row[0].description, 'imported description');

    // Same conflict, but raised by the closure snapshot — which runs *after*
    // the rows were saved. Only the savepoint can undo the upsert here.
    const closing = `${REVIEW_HEADERS}\nINC-${incident.item_number};Closed by import;major;closed;2026-03-10T08:00:00Z;false;imported description;`;
    const closingResult = await services.csv.import(
      csvFile(closing),
      { dryRun: false, mode: 'enrich', operation: 'upsert' },
      importOpts(runner, f, f.users.admin),
    );
    assert.equal(closingResult.ok, false, 'a foreign edit lock refuses the closure snapshot');
    const afterClosing = await runner.manager.query(
      'SELECT title, status FROM incidents WHERE id = $1', [incident.id],
    );
    assert.notEqual(afterClosing[0].title, 'Closed by import', 'the saved upsert must be rolled back');
    assert.equal(afterClosing[0].status, 'open');
    const entries = await readEntries(runner, f, incident.id);
    assert.equal(
      entries.some((e: any) => e.changed_fields?.review_version),
      false,
      'no journal entry survives a rolled-back import',
    );
    const after = await readReview(runner, f, incident.id);
    assert.equal(after.content_markdown, review.content_markdown);
    assert.equal(after.versions, review.versions);
  });
}

// ---------------------------------------------------------------------------
// 6. §3.3 closure snapshot from the incident services
// ---------------------------------------------------------------------------

async function testClosureSnapshotAndReopen() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const opts = { manager: runner.manager, tenantId: f.tenantId, viewer: { userId: f.users.admin, isAdmin: true } };
    const incident = await createIncident(runner, f, services);
    await services.integrated.writeIncidentReviewForImport(incident.id, '## Impact\n\nfirst state', f.users.admin, {
      manager: runner.manager,
    });

    await services.incidents.update(incident.id, { status: 'closed' }, f.users.admin, opts);
    const firstClosure = (await readEntries(runner, f, incident.id))
      .find((e: any) => e.kind === 'status_change' && e.changed_fields?.review_version);
    assert.ok(firstClosure);
    const first = firstClosure.changed_fields.review_version;
    assert.equal(first.from, null);
    assert.ok(first.to.document_id && first.to.version_number > 0 && first.to.revision > 0);

    // Reopen keeps the reference and every stored version.
    await services.incidents.reopen(incident.id, 'more work', f.users.admin, opts);
    const afterReopen = (await readEntries(runner, f, incident.id))
      .find((e: any) => e.kind === 'status_change' && e.changed_fields?.review_version);
    assert.deepEqual(afterReopen.changed_fields.review_version, first, 'reopen keeps the closure reference');

    // A second closure references its own state.
    await services.integrated.writeIncidentReviewForImport(incident.id, '## Impact\n\nsecond state', f.users.admin, {
      manager: runner.manager,
    });
    await services.incidents.update(incident.id, { status: 'closed' }, f.users.admin, opts);
    const closures = (await readEntries(runner, f, incident.id))
      .filter((e: any) => e.kind === 'status_change' && e.changed_fields?.review_version);
    assert.equal(closures.length, 2);
    const versions = new Set(closures.map((e: any) => e.changed_fields.review_version.to.version_number));
    assert.equal(versions.size, 2, 'a second closure references its own state');
    const second = closures.find(
      (e: any) => e.changed_fields.review_version.to.version_number !== first.to.version_number,
    )!.changed_fields.review_version;

    const firstBody = await runner.manager.query(
      `SELECT content_markdown FROM document_versions WHERE document_id = $1 AND version_number = $2`,
      [first.to.document_id, first.to.version_number],
    );
    assert.match(firstBody[0].content_markdown, /first state/, 'the first closure version survives');
    const secondBody = await runner.manager.query(
      `SELECT content_markdown FROM document_versions WHERE document_id = $1 AND version_number = $2`,
      [second.to.document_id, second.to.version_number],
    );
    assert.match(secondBody[0].content_markdown, /second state/);
  });
}

async function testCancelSnapshotsAndForeignLockRefusesClosure() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const opts = { manager: runner.manager, tenantId: f.tenantId, viewer: { userId: f.users.admin, isAdmin: true } };

    const cancelled = await createIncident(runner, f, services);
    await services.incidents.cancel(cancelled.id, 'duplicate', f.users.admin, opts);
    const cancelEntry = (await readEntries(runner, f, cancelled.id))
      .find((e: any) => e.kind === 'status_change' && e.changed_fields?.review_version);
    assert.ok(cancelEntry, 'cancelling snapshots the review too');

    // A foreign edit lock blocks the closure (423).
    const locked = await createIncident(runner, f, services);
    const review = await readReview(runner, f, locked.id);
    await services.integrated.acquireLockBySource('incidents', locked.id, 'review', f.users.other, {
      manager: runner.manager,
    });
    await assert.rejects(
      services.incidents.update(locked.id, { status: 'closed' }, f.users.admin, opts),
      (error: any) => Number(error?.status ?? error?.getStatus?.()) === 423,
      'a foreign edit lock must refuse the closure with 423',
    );
    const stillOpen = await runner.manager.query('SELECT status FROM incidents WHERE id = $1', [locked.id]);
    assert.equal(stillOpen[0].status, 'open', 'the refused closure changed nothing');
  });
}

async function testCreatedClosedGetsItsReviewVersion() {
  await withFixture(async (runner, f) => {
    const services = createServices(runner.manager);
    const incident = await createIncident(runner, f, services, { status: 'closed' });
    const review = await readReview(runner, f, incident.id);
    assert.ok(review, 'a record created closed still gets its review');

    const entries = await readEntries(runner, f, incident.id);
    const creation = entries.find((e: any) => e.content === 'Incident logged');
    assert.ok(creation?.changed_fields?.review_version, 'the creation entry carries the review version');
    assert.equal(creation.changed_fields.review_version.to.document_id, review.document_id);
  });
}

async function run() {
  await dataSource.initialize();
  try {
    await testExportImportRoundTrip();
    await testEmptyCellAndDryRun();
    await testInsertedRowsAreProvisioned();
    await testClosedIncidentImportIsAllowedAndVersioned();
    await testInvisibleIncidentRefused();
    await testLockConflictRollsBackTheUpsert();
    await testClosureSnapshotAndReopen();
    await testCancelSnapshotsAndForeignLockRefusesClosure();
    await testCreatedClosedGetsItsReviewVersion();
    console.log('incident-review-csv.integration.spec: all assertions passed');
  } finally {
    await dataSource.destroy();
  }
}

void run();
