import * as assert from 'node:assert/strict';
import {
  incidentRelatedLabelSql,
  incidentRelatedTitleSql,
  incidentVisibilitySql,
  incidentVisibleToViewer,
  incidentViewerFromContext,
  type IncidentViewer,
} from '../incident-visibility';

const ROW = {
  confidential: true,
  reporter_user_id: 'reporter-1',
  owner_user_id: 'owner-1',
};

const reader: IncidentViewer = { userId: 'reader-1', isAdmin: false };
const reporter: IncidentViewer = { userId: 'reporter-1', isAdmin: false };
const owner: IncidentViewer = { userId: 'owner-1', isAdmin: false };
const admin: IncidentViewer = { userId: 'admin-1', isAdmin: true };

function testVisibleToViewer(): void {
  assert.equal(incidentVisibleToViewer({ confidential: false }, reader), true);
  assert.equal(incidentVisibleToViewer(ROW, reader), false, 'a reader does not see a confidential row');
  assert.equal(incidentVisibleToViewer(ROW, reporter), true, 'the reporter still sees it');
  assert.equal(incidentVisibleToViewer(ROW, owner), true, 'the owner still sees it');
  assert.equal(incidentVisibleToViewer(ROW, admin), true, 'incidents:admin sees it');
  assert.equal(incidentVisibleToViewer(ROW, { userId: null, isAdmin: false }), false);
  assert.equal(incidentVisibleToViewer(ROW, undefined), false, 'missing viewer fails closed');
}

function testVisibilitySql(): void {
  const adminParams: unknown[] = ['tenant'];
  assert.equal(incidentVisibilitySql('i', admin, adminParams), '');
  assert.deepEqual(adminParams, ['tenant']);

  const noUser: unknown[] = ['tenant'];
  assert.equal(incidentVisibilitySql('i', { userId: null, isAdmin: false }, noUser), ' AND i.confidential = false');
  assert.deepEqual(noUser, ['tenant']);

  const readerParams: unknown[] = ['tenant'];
  assert.equal(
    incidentVisibilitySql('i', reader, readerParams),
    ' AND (i.confidential = false OR i.reporter_user_id = $2 OR i.owner_user_id = $2)',
  );
  assert.deepEqual(readerParams, ['tenant', 'reader-1']);
}

function testViewerFromContext(): void {
  assert.deepEqual(
    incidentViewerFromContext({ userId: 'u1', isAdmin: true, permissions: {} }),
    { userId: 'u1', isAdmin: true },
  );
  assert.deepEqual(
    incidentViewerFromContext({ userId: 'u1', isAdmin: false, permissions: { incidents: 'admin' } }),
    { userId: 'u1', isAdmin: true },
    'incidents:admin is treated as admin, not only the Administrator role',
  );
  assert.deepEqual(
    incidentViewerFromContext({ userId: 'u1', isAdmin: false, permissions: { incidents: 'contributor' } }),
    { userId: 'u1', isAdmin: false },
  );
}

function testRelatedLabelSql(): void {
  assert.match(incidentRelatedLabelSql('inc'), /inc\.confidential/);
  assert.match(incidentRelatedLabelSql('inc'), /INC-.*item_number/);
  assert.equal(
    incidentRelatedTitleSql('rel_inc'),
    'CASE WHEN rel_inc.confidential THEN NULL ELSE rel_inc.title END',
  );
}

function run(): void {
  testVisibleToViewer();
  testVisibilitySql();
  testViewerFromContext();
  testRelatedLabelSql();
  console.log('incident-visibility.spec.ts: ok');
}

run();
