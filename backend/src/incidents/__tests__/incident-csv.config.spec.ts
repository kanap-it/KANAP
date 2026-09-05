import * as assert from 'node:assert/strict';
import { CsvImportContext, CsvImportRow } from '../../common/csv';
import {
  hasPendingIncidentReview,
  incidentCsvConfig,
  takePendingIncidentReview,
  takePreviousIncidentStatus,
} from '../incident-csv.config';

const TENANT = '11111111-1111-1111-1111-111111111111';
const HIDDEN_ID = '22222222-2222-2222-2222-222222222222';
const VISIBLE_ID = '33333333-3333-3333-3333-333333333333';
const READER = '44444444-4444-4444-4444-444444444444';
const OWNER = '55555555-5555-5555-5555-555555555555';

const hiddenRow = {
  id: HIDDEN_ID,
  item_number: 12,
  confidential: true,
  reporter_user_id: OWNER,
  owner_user_id: OWNER,
};

const visibleRestrictedRow = {
  id: VISIBLE_ID,
  item_number: 13,
  confidential: true,
  reporter_user_id: READER,
  owner_user_id: null,
};

function mockContext(
  existing: Array<typeof hiddenRow>,
  viewer?: CsvImportContext['viewer'],
  sqlLog?: string[],
): CsvImportContext {
  return {
    tenantId: TENANT,
    manager: {
      query: async (sql: string, params: unknown[]) => {
        sqlLog?.push(sql);
        if (sql.includes('FROM tenants')) return [{ metadata: {} }];
        if (sql.includes('item_number = ANY')) {
          const wanted = params[1] as number[];
          return existing.filter((row) => wanted.includes(row.item_number));
        }
        if (sql.includes('id = ANY')) {
          const wanted = params[0] as string[];
          return existing.filter((row) => wanted.includes(row.id));
        }
        return [];
      },
    },
    params: { dryRun: true, mode: 'replace', operation: 'upsert' },
    resolverCache: new Map(),
    userId: READER,
    isAdmin: false,
    viewer: viewer ?? { userId: READER, isAdmin: false },
  };
}

function importRow(ref: string): CsvImportRow {
  return {
    rowNumber: 2,
    raw: { ref },
    parsed: {},
    isInsert: true,
    errors: [],
    warnings: [],
  };
}

async function testHiddenRefIsUnknownOnValidate(): Promise<void> {
  const row = importRow('INC-12');
  await incidentCsvConfig.beforeValidate!([row], mockContext([hiddenRow]));
  assert.equal(row.raw.ref, '12');
  assert.equal(row.errors.length, 1);
  assert.match(row.errors[0].message, /Unknown incident reference\(s\): INC-12/);
}

async function testVisibleRestrictedRefIsAllowed(): Promise<void> {
  const row = importRow('INC-13');
  await incidentCsvConfig.beforeValidate!([row], mockContext([visibleRestrictedRow]));
  assert.equal(row.errors.length, 0);
}

async function testEmptyConfidentialCellIsUnchangedOnUpdate(): Promise<void> {
  const entity = {
    id: VISIBLE_ID,
    item_number: 13,
    title: 'Mail outage',
    confidential: null,
    status: 'open',
    detected_at: new Date(),
  };
  await incidentCsvConfig.beforeCommit!([entity], mockContext([visibleRestrictedRow]));
  assert.equal(entity.confidential, true, 'empty confidential cell must not lift the restriction');
}

async function testHiddenUpdateIsRefusedOnCommit(): Promise<void> {
  const entity = {
    id: HIDDEN_ID,
    item_number: 12,
    title: 'Secret',
    confidential: true,
    status: 'open',
    detected_at: new Date(),
  };
  await assert.rejects(
    () => incidentCsvConfig.beforeCommit!([entity], mockContext([hiddenRow])),
    /Unknown incident reference\(s\): INC-12/,
  );
}

/**
 * §3.8: the existing rows are locked before any right is evaluated, and the
 * pre-image status is kept so the closure snapshot knows this is a transition.
 */
async function testUpdateRowsAreLockedAndPreImageKept(): Promise<void> {
  const sqlLog: string[] = [];
  const entity: any = {
    id: VISIBLE_ID,
    item_number: 13,
    title: 'Mail outage',
    status: 'open',
    detected_at: new Date(),
  };
  await incidentCsvConfig.beforeCommit!(
    [entity],
    mockContext([{ ...visibleRestrictedRow, status: 'in_progress' } as any], undefined, sqlLog),
  );
  const lockQuery = sqlLog.find((sql) => sql.includes('id = ANY'));
  assert.ok(lockQuery, 'the existing rows must be loaded');
  assert.match(lockQuery!, /FOR UPDATE/, 'the initial state must be read under a row lock');
  assert.match(lockQuery!, /status/, 'the pre-image status must be selected');
  assert.equal(takePreviousIncidentStatus(entity), 'in_progress');
}

/** A blank cell is recorded as pending-but-empty: the service leaves the review untouched. */
async function testBlankReviewCellIsRecordedAsEmpty(): Promise<void> {
  const entity: any = {
    id: VISIBLE_ID,
    item_number: 13,
    title: 'Mail outage',
    status: 'open',
    detected_at: new Date(),
    review: null,
  };
  await incidentCsvConfig.beforeCommit!([entity], mockContext([visibleRestrictedRow]));
  assert.equal('review' in entity, false);
  assert.equal(hasPendingIncidentReview(entity), true);
  assert.equal(takePendingIncidentReview(entity), null);
}

async function run(): Promise<void> {
  assert.ok(incidentCsvConfig.beforeValidate);
  assert.ok(incidentCsvConfig.beforeCommit);
  await testHiddenRefIsUnknownOnValidate();
  await testVisibleRestrictedRefIsAllowed();
  await testEmptyConfidentialCellIsUnchangedOnUpdate();
  await testHiddenUpdateIsRefusedOnCommit();
  await testUpdateRowsAreLockedAndPreImageKept();
  await testBlankReviewCellIsRecordedAsEmpty();
  console.log('incident-csv.config.spec.ts: ok');
}

void run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
