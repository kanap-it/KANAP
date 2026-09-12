import * as assert from 'node:assert/strict';
import {
  buildDefaultByYear,
  buildDefaultLookup,
  defaultMethodKey,
  normalizeAllocationMethod,
} from '../allocation-rule-resolver';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const COMPANY_1 = 'aaaaaaaa-1111-1111-1111-111111111111';
const COMPANY_2 = 'bbbbbbbb-2222-2222-2222-222222222222';

type Row = {
  tenant_id: string | null;
  fiscal_year: number;
  method: string;
  mode?: string;
  company_ids?: string[] | null;
};

function testStandardRowDrivesEveryTenant() {
  const rows: Row[] = [{ tenant_id: null, fiscal_year: 2026, method: 'it_users', mode: 'auto' }];
  assert.deepEqual(buildDefaultByYear(rows as any, TENANT_A).get(2026), { kind: 'auto', method: 'it_users' });
  assert.deepEqual(buildDefaultByYear(rows as any, TENANT_B).get(2026), { kind: 'auto', method: 'it_users' });
  assert.deepEqual(buildDefaultByYear(rows as any, null).get(2026), { kind: 'auto', method: 'it_users' });
}

function testMissingRowFallsBackToTheCallerStandard() {
  const lookup = buildDefaultByYear([] as any, TENANT_A);
  assert.equal(lookup.has(2026), false);
  assert.equal(defaultMethodKey(TENANT_A, 2026), `${TENANT_A}:2026`);
  assert.equal(defaultMethodKey(null, 2026), 'standard:2026');
}

function testTenantOverrideWinsOverStandard() {
  const rows: Row[] = [
    { tenant_id: null, fiscal_year: 2026, method: 'it_users', mode: 'auto' },
    { tenant_id: TENANT_A, fiscal_year: 2026, method: 'turnover', mode: 'auto' },
  ];
  assert.deepEqual(buildDefaultByYear(rows as any, TENANT_A).get(2026), { kind: 'auto', method: 'turnover' });
  // Another tenant is not affected by A's override.
  assert.deepEqual(buildDefaultByYear(rows as any, TENANT_B).get(2026), { kind: 'auto', method: 'it_users' });
}

function testOverrideIsScopedToItsFiscalYear() {
  const rows: Row[] = [
    { tenant_id: null, fiscal_year: 2026, method: 'headcount', mode: 'auto' },
    { tenant_id: null, fiscal_year: 2027, method: 'headcount', mode: 'auto' },
    { tenant_id: TENANT_A, fiscal_year: 2027, method: 'turnover', mode: 'auto' },
  ];
  const lookup = buildDefaultByYear(rows as any, TENANT_A);
  assert.deepEqual(lookup.get(2026), { kind: 'auto', method: 'headcount' });
  assert.deepEqual(lookup.get(2027), { kind: 'auto', method: 'turnover' });
}

function testManualCompanySelectionIsResolved() {
  const rows: Row[] = [
    { tenant_id: null, fiscal_year: 2026, method: 'headcount', mode: 'auto' },
    {
      tenant_id: TENANT_A,
      fiscal_year: 2026,
      method: 'turnover',
      mode: 'manual_company',
      company_ids: [COMPANY_1, COMPANY_2],
    },
  ];
  assert.deepEqual(buildDefaultByYear(rows as any, TENANT_A).get(2026), {
    kind: 'manual_company',
    method: 'turnover',
    companyIds: [COMPANY_1, COMPANY_2],
  });
  // The other tenant keeps the standard auto behaviour.
  assert.deepEqual(buildDefaultByYear(rows as any, TENANT_B).get(2026), { kind: 'auto', method: 'headcount' });
}

function testManualModeWithoutCompaniesFallsBackToAuto() {
  const rows: Row[] = [
    { tenant_id: TENANT_A, fiscal_year: 2026, method: 'it_users', mode: 'manual_company', company_ids: [] },
    { tenant_id: TENANT_A, fiscal_year: 2027, method: 'it_users', mode: 'manual_company', company_ids: null },
  ];
  const lookup = buildDefaultByYear(rows as any, TENANT_A);
  assert.deepEqual(lookup.get(2026), { kind: 'auto', method: 'it_users' });
  assert.deepEqual(lookup.get(2027), { kind: 'auto', method: 'it_users' });
}

function testGlobalRowNeverCarriesACompanySelection() {
  // The DB CHECK forbids it; if such a row ever existed it must not leak to every tenant.
  const rows: Row[] = [
    { tenant_id: null, fiscal_year: 2026, method: 'headcount', mode: 'manual_company', company_ids: [COMPANY_1] },
  ];
  assert.deepEqual(buildDefaultByYear(rows as any, TENANT_A).get(2026), { kind: 'auto', method: 'headcount' });
}

function testUnknownValuesFallBackToTheStandard() {
  assert.equal(normalizeAllocationMethod('headcount'), 'headcount');
  assert.equal(normalizeAllocationMethod('garbage'), 'headcount');
  assert.equal(normalizeAllocationMethod(undefined), 'headcount');

  const rows: Row[] = [
    { tenant_id: TENANT_A, fiscal_year: 2026, method: 'garbage', mode: 'garbage', company_ids: [COMPANY_1] },
  ];
  assert.deepEqual(buildDefaultByYear(rows as any, TENANT_A).get(2026), { kind: 'auto', method: 'headcount' });
}

function testLookupCoversEveryTenantInScope() {
  const rows: Row[] = [
    { tenant_id: null, fiscal_year: 2026, method: 'headcount', mode: 'auto' },
    { tenant_id: TENANT_A, fiscal_year: 2026, method: 'it_users', mode: 'auto' },
    { tenant_id: TENANT_B, fiscal_year: 2026, method: 'turnover', mode: 'manual_company', company_ids: [COMPANY_1] },
  ];
  const lookup = buildDefaultLookup(rows as any, [TENANT_A, TENANT_B]);
  assert.deepEqual(lookup.get(defaultMethodKey(TENANT_A, 2026)), { kind: 'auto', method: 'it_users' });
  assert.deepEqual(lookup.get(defaultMethodKey(TENANT_B, 2026)), {
    kind: 'manual_company',
    method: 'turnover',
    companyIds: [COMPANY_1],
  });
  assert.equal(lookup.has(defaultMethodKey(null, 2026)), false);
}

function run() {
  testStandardRowDrivesEveryTenant();
  testMissingRowFallsBackToTheCallerStandard();
  testTenantOverrideWinsOverStandard();
  testOverrideIsScopedToItsFiscalYear();
  testManualCompanySelectionIsResolved();
  testManualModeWithoutCompaniesFallsBackToAuto();
  testGlobalRowNeverCarriesACompanySelection();
  testUnknownValuesFallBackToTheStandard();
  testLookupCoversEveryTenantInScope();
  console.log('allocation-rule-resolver: ok');
}

run();
