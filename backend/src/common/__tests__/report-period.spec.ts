import * as assert from 'node:assert/strict';
import { isCalendarDate, normalizeReportTimeZone } from '../report-period';

function run() {
  // A zone the runtime knows is kept, anything else reads as UTC instead of failing the report.
  assert.equal(normalizeReportTimeZone('Europe/Paris'), 'Europe/Paris');
  assert.equal(normalizeReportTimeZone('  America/New_York '), 'America/New_York');
  assert.equal(normalizeReportTimeZone(undefined), 'UTC');
  assert.equal(normalizeReportTimeZone(''), 'UTC');
  assert.equal(normalizeReportTimeZone('Not/AZone'), 'UTC');
  assert.equal(normalizeReportTimeZone("UTC'; DROP TABLE audit_log; --"), 'UTC');

  // Shape alone is not enough: the day has to exist, or Postgres rejects the ::date cast.
  assert.equal(isCalendarDate('2026-09-21'), true);
  assert.equal(isCalendarDate('2028-02-29'), true);
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2026-02-31'), false);
  assert.equal(isCalendarDate('2026-13-01'), false);
  assert.equal(isCalendarDate('2026-9-21'), false);
  assert.equal(isCalendarDate(''), false);

  console.log('report-period.spec.ts: ok');
}

run();
