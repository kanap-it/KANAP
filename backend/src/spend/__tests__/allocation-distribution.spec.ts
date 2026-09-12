import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Company } from '../../companies/company.entity';
import { CompanyMetric } from '../../companies/company-metric.entity';
import {
  buildCompanyWeights,
  computeCompanyShares,
  fiscalYearStart,
  normalizeWeights,
} from '../allocation-distribution';

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function testEqualWeightsRoundToExactlyOneHundred() {
  const result = normalizeWeights([
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 },
  ]);
  assert.deepEqual(result.map((r) => r.pct), [33.3333, 33.3333, 33.3334]);
  assert.equal(Math.abs(sum(result.map((r) => r.pct)) - 100) < 1e-9, true);
}

function testLastEntryAbsorbsTheRoundingRemainder() {
  const sixths = normalizeWeights(
    Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, weight: 1 })),
  );
  assert.deepEqual(sixths.map((r) => r.pct), [16.6667, 16.6667, 16.6667, 16.6667, 16.6667, 16.6665]);
  // The exported percentages always add up to 100, whatever the rounding.
  const others = sum(sixths.slice(0, -1).map((r) => r.pct));
  assert.equal(Number((100 - others).toFixed(4)), sixths[sixths.length - 1].pct);
}

function testSingleEntryTakesEverything() {
  assert.deepEqual(normalizeWeights([{ id: 'only', weight: 42 }]), [{ id: 'only', pct: 100 }]);
  assert.deepEqual(normalizeWeights([{ id: 'only', weight: 0.0001 }]), [{ id: 'only', pct: 100 }]);
}

function testProportionalWeights() {
  const result = normalizeWeights([
    { id: 'a', weight: 3 },
    { id: 'b', weight: 7 },
  ]);
  assert.deepEqual(result, [
    { id: 'a', pct: 30 },
    { id: 'b', pct: 70 },
  ]);
}

function testDecimalWeights() {
  const result = normalizeWeights([
    { id: 'big', weight: 1234.56 },
    { id: 'small', weight: 0.44 },
  ]);
  assert.deepEqual(result.map((r) => r.pct), [99.9644, 0.0356]);
}

function testNonPositiveTotalIsRejected() {
  assert.throws(
    () => normalizeWeights([{ id: 'a', weight: 0 }, { id: 'b', weight: 0 }]),
    (err: unknown) => err instanceof BadRequestException,
  );
  assert.throws(
    () => normalizeWeights([{ id: 'a', weight: Number.NaN }]),
    (err: unknown) => err instanceof BadRequestException,
  );
}

function testCompanyWeightsFollowTheDriverValues() {
  const weights = buildCompanyWeights(
    ['a', 'b'],
    new Map<string, number | string | null>([
      ['a', 300],
      ['b', 100],
    ]),
    'headcount',
  );
  assert.deepEqual(weights, [
    { id: 'a', weight: 300 },
    { id: 'b', weight: 100 },
  ]);
}

function testCompanyWeightsRejectMissingOrZeroValues() {
  for (const values of [
    new Map<string, number | string | null>([['a', 10], ['b', null]]),
    new Map<string, number | string | null>([['a', 10], ['b', 0]]),
    new Map<string, number | string | null>([['a', 10]]),
    new Map<string, number | string | null>([['a', 10], ['b', Number.NaN]]),
  ]) {
    assert.throws(
      () => buildCompanyWeights(['a', 'b'], values, 'it_users'),
      (err: unknown) => err instanceof BadRequestException && /it users/.test((err as Error).message),
    );
  }
}

function testFiscalYearStart() {
  assert.equal(fiscalYearStart(2026).toISOString(), '2026-01-01T00:00:00.000Z');
}

/** EntityManager stub: company/metric reads are served from the given rows. */
function fakeManager(rows: { companies: any[]; metrics: any[] }) {
  const captured: any[] = [];
  const manager = {
    getRepository: (entity: unknown) => ({
      find: async (options: any) => {
        captured.push({ entity, options });
        return entity === Company ? rows.companies : rows.metrics;
      },
    }),
    captured,
  };
  return manager as unknown as EntityManager & { captured: any[] };
}

async function testSharesUseDriverValues() {
  const manager = fakeManager({
    companies: [{ id: 'a' }, { id: 'b' }],
    metrics: [
      { company_id: 'a', headcount: 1200 },
      { company_id: 'b', headcount: 400 },
    ],
  });
  const shares = await computeCompanyShares({
    manager, tenantId: 't1', fiscalYear: 2026, companyIds: ['a', 'b'], driver: 'headcount',
  });
  assert.deepEqual(Array.from(shares.entries()), [['a', 75], ['b', 25]]);

  // The company lookup stays tenant-scoped and year-aware.
  const companyQuery = manager.captured.find((c) => c.entity === Company)!.options.where;
  assert.equal(companyQuery.tenant_id, 't1');
  assert.ok(companyQuery.disabled_at);
  const metricsQuery = manager.captured.find((c) => c.entity === CompanyMetric)!.options.where;
  assert.equal(metricsQuery.tenant_id, 't1');
  assert.equal(metricsQuery.fiscal_year, 2026);
}

async function testTurnoverColumnIsUsedForTheTurnoverDriver() {
  const manager = fakeManager({
    companies: [{ id: 'a' }, { id: 'b' }],
    metrics: [
      { company_id: 'a', headcount: 10, turnover: '180' },
      { company_id: 'b', headcount: 990, turnover: '60' },
    ],
  });
  const shares = await computeCompanyShares({
    manager, tenantId: 't1', fiscalYear: 2026, companyIds: ['a', 'b'], driver: 'turnover',
  });
  assert.deepEqual(Array.from(shares.entries()), [['a', 75], ['b', 25]]);
}

async function testCompanyDisabledForTheYearIsRejected() {
  // The query only returns enabled companies, so a shorter result set means a rejected one.
  const manager = fakeManager({
    companies: [{ id: 'a' }],
    metrics: [{ company_id: 'a', headcount: 10 }],
  });
  await assert.rejects(
    () => computeCompanyShares({
      manager, tenantId: 't1', fiscalYear: 2026, companyIds: ['a', 'b'], driver: 'headcount',
    }),
    (err: unknown) =>
      err instanceof BadRequestException && /not available for manual allocation/.test((err as Error).message),
  );
}

async function testCompanyWithoutMetricIsRejected() {
  const manager = fakeManager({
    companies: [{ id: 'a' }, { id: 'b' }],
    metrics: [{ company_id: 'a', headcount: 1200 }],
  });
  await assert.rejects(
    () => computeCompanyShares({
      manager, tenantId: 't1', fiscalYear: 2026, companyIds: ['a', 'b'], driver: 'headcount',
    }),
    (err: unknown) =>
      err instanceof BadRequestException && /Provide headcount values/.test((err as Error).message),
  );
}

function run() {
  testEqualWeightsRoundToExactlyOneHundred();
  testLastEntryAbsorbsTheRoundingRemainder();
  testSingleEntryTakesEverything();
  testProportionalWeights();
  testDecimalWeights();
  testNonPositiveTotalIsRejected();
  testCompanyWeightsFollowTheDriverValues();
  testCompanyWeightsRejectMissingOrZeroValues();
  testFiscalYearStart();
  return Promise.resolve()
    .then(testSharesUseDriverValues)
    .then(testTurnoverColumnIsUsedForTheTurnoverDriver)
    .then(testCompanyDisabledForTheYearIsRejected)
    .then(testCompanyWithoutMetricIsRejected)
    .then(() => console.log('allocation-distribution: ok'));
}

void run();
