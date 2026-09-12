import * as assert from 'node:assert/strict';
import {
  buildDefaultMethodByYear,
  buildDefaultMethodLookup,
  defaultMethodKey,
  normalizeAllocationMethod,
} from '../allocation-rule-resolver';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

type Row = { tenant_id: string | null; fiscal_year: number; method: string };

function testStandardRowDrivesEveryTenant() {
  const rows: Row[] = [{ tenant_id: null, fiscal_year: 2026, method: 'it_users' }];
  assert.equal(buildDefaultMethodByYear(rows as any, TENANT_A).get(2026), 'it_users');
  assert.equal(buildDefaultMethodByYear(rows as any, TENANT_B).get(2026), 'it_users');
  assert.equal(buildDefaultMethodByYear(rows as any, null).get(2026), 'it_users');
}

function testMissingRowFallsBackToHeadcount() {
  // No row for the year: the caller's fallback ('headcount') applies.
  const lookup = buildDefaultMethodByYear([] as any, TENANT_A);
  assert.equal(lookup.has(2026), false);
  assert.equal(defaultMethodKey(TENANT_A, 2026), `${TENANT_A}:2026`);
  assert.equal(defaultMethodKey(null, 2026), 'standard:2026');
}

function testTenantOverrideWinsOverStandard() {
  const rows: Row[] = [
    { tenant_id: null, fiscal_year: 2026, method: 'it_users' },
    { tenant_id: TENANT_A, fiscal_year: 2026, method: 'turnover' },
  ];
  assert.equal(buildDefaultMethodByYear(rows as any, TENANT_A).get(2026), 'turnover');
  // Another tenant is not affected by A's override.
  assert.equal(buildDefaultMethodByYear(rows as any, TENANT_B).get(2026), 'it_users');
}

function testOverrideIsScopedToItsFiscalYear() {
  const rows: Row[] = [
    { tenant_id: null, fiscal_year: 2026, method: 'headcount' },
    { tenant_id: null, fiscal_year: 2027, method: 'headcount' },
    { tenant_id: TENANT_A, fiscal_year: 2027, method: 'turnover' },
  ];
  const lookup = buildDefaultMethodByYear(rows as any, TENANT_A);
  assert.equal(lookup.get(2026), 'headcount');
  assert.equal(lookup.get(2027), 'turnover');
}

function testForeignKeyedLookupCoversEveryTenantInScope() {
  const rows: Row[] = [
    { tenant_id: null, fiscal_year: 2026, method: 'headcount' },
    { tenant_id: TENANT_A, fiscal_year: 2026, method: 'it_users' },
    { tenant_id: TENANT_B, fiscal_year: 2026, method: 'turnover' },
  ];
  const lookup = buildDefaultMethodLookup(rows as any, [TENANT_A, TENANT_B]);
  assert.equal(lookup.get(defaultMethodKey(TENANT_A, 2026)), 'it_users');
  assert.equal(lookup.get(defaultMethodKey(TENANT_B, 2026)), 'turnover');
  assert.equal(lookup.has(defaultMethodKey(null, 2026)), false);
}

function testLegacyMethodValuesNormalizeToHeadcount() {
  assert.equal(normalizeAllocationMethod('headcount'), 'headcount');
  assert.equal(normalizeAllocationMethod('turnover'), 'turnover');
  assert.equal(normalizeAllocationMethod(''), 'headcount');
  assert.equal(normalizeAllocationMethod(undefined), 'headcount');
  assert.equal(normalizeAllocationMethod('garbage'), 'headcount');

  const rows: Row[] = [{ tenant_id: TENANT_A, fiscal_year: 2026, method: 'garbage' }];
  assert.equal(buildDefaultMethodByYear(rows as any, TENANT_A).get(2026), 'headcount');
}

function run() {
  testStandardRowDrivesEveryTenant();
  testMissingRowFallsBackToHeadcount();
  testTenantOverrideWinsOverStandard();
  testOverrideIsScopedToItsFiscalYear();
  testForeignKeyedLookupCoversEveryTenantInScope();
  testLegacyMethodValuesNormalizeToHeadcount();
  console.log('allocation-rule-resolver: ok');
}

run();
