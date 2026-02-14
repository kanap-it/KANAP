import * as assert from 'node:assert/strict';
import { buildStatusWhereFragment, applyStatusFilter } from '../status-filter';
import { StatusState } from '../status';

async function testExplicitStatusFragment() {
  const fragment = buildStatusWhereFragment({
    alias: 'c',
    explicitStatus: StatusState.DISABLED,
  });
  assert.ok(fragment);
  assert.equal(fragment?.sql, '(c.disabled_at IS NOT NULL AND c.disabled_at <= :c_as_of)');
  assert.ok(fragment?.params.c_as_of instanceof Date);
}

async function testDefaultActiveFragment() {
  const fragment = buildStatusWhereFragment({ alias: 'companies' });
  assert.ok(fragment);
  assert.equal(
    fragment?.sql,
    '(companies.disabled_at IS NULL OR companies.disabled_at > :companies_as_of)',
  );
  assert.ok(fragment?.params.companies_as_of instanceof Date);
}

async function testPeriodWindowFragment() {
  const fragment = buildStatusWhereFragment({
    alias: 'd',
    period: { start: '2024-01-01', end: '2024-12-31' },
  });
  assert.ok(fragment);
  assert.equal(fragment?.sql, '(d.disabled_at IS NULL OR d.disabled_at >= :d_period_start)');
  assert.ok(fragment?.params.d_period_start instanceof Date);
}

async function testPeriodStartBoundaryInclusive() {
  // When only a period.start is provided and status is neutral, we gate using
  // disabled_at >= :period_start (inclusive of the start boundary).
  const fragment = buildStatusWhereFragment({ alias: 't', period: { start: '2025-01-01' } });
  assert.ok(fragment);
  assert.equal(fragment?.sql, '(t.disabled_at IS NULL OR t.disabled_at >= :t_period_start)');
  const start = fragment?.params?.t_period_start as Date;
  assert.ok(start instanceof Date);
  assert.equal(start.toISOString().slice(0, 10), '2025-01-01');
}

async function testPeriodStartPreferredOverAsOfWhenNeutral() {
  // If both asOf and period.start are provided without explicit status,
  // the period.start comparison should be used (not as_of), to match period window intent.
  const fragment = buildStatusWhereFragment({ alias: 'x', asOf: '2027-01-01', period: { start: '2026-01-01' } });
  assert.ok(fragment);
  assert.equal(fragment?.sql, '(x.disabled_at IS NULL OR x.disabled_at >= :x_period_start)');
  // Ensure we did not set x_as_of when period.start drives the condition
  assert.ok(!('x_as_of' in (fragment?.params || {})));
}

async function testApplyStatusFilterAddsClause() {
  const clauses: Array<{ sql: string; params: Record<string, unknown> }> = [];
  const qb = {
    andWhere(sql: string, params: Record<string, unknown>) {
      clauses.push({ sql, params });
      return this;
    },
  };

  const result = applyStatusFilter(qb as any, { alias: 'x' });
  assert.equal(result, qb);
  assert.equal(clauses.length, 1);
  assert.match(clauses[0].sql, /x\.disabled_at IS NULL OR x\.disabled_at > :x_as_of/);
}

async function testApplyStatusFilterSkipsWhenIncludingDisabled() {
  let called = false;
  const qb = {
    andWhere() {
      called = true;
      return this;
    },
  };
  const result = applyStatusFilter(qb as any, { alias: 'x', includeDisabled: true });
  assert.equal(result, qb);
  assert.equal(called, false);
}

(async () => {
  await testExplicitStatusFragment();
  await testDefaultActiveFragment();
  await testPeriodWindowFragment();
  await testPeriodStartBoundaryInclusive();
  await testPeriodStartPreferredOverAsOfWhenNeutral();
  await testApplyStatusFilterAddsClause();
  await testApplyStatusFilterSkipsWhenIncludingDisabled();
  console.log('Status filter helper tests passed.');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
