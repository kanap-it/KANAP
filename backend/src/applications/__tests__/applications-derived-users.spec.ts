import * as assert from 'node:assert/strict';
import { ApplicationsListService } from '../services/applications-list.service';

/**
 * Regression guard for the applications list N+1.
 *
 * Deriving `derived_total_users` used to issue 2-5 queries per application, so a 20-row
 * page cost 60-100 round trips. `buildDerivedUsersByApp` must derive the same totals with
 * a number of queries that does not depend on the page size.
 *
 * The fixture below is deliberately shaped so every read happens: each application links a
 * company and a department, and the department belongs to a different company so it is
 * counted on top of the company metric.
 */
const APP_ID = (i: number) => `app-${i}`;

function createCountingManager(appCount: number) {
  const reads: Record<string, number> = {};
  const rowsFor: Record<string, any[]> = {
    ApplicationCompany: Array.from({ length: appCount }, (_, i) => ({
      application_id: APP_ID(i),
      company_id: 'c1',
    })),
    ApplicationDepartment: Array.from({ length: appCount }, (_, i) => ({
      application_id: APP_ID(i),
      department_id: 'd1',
    })),
    Department: [{ id: 'd1', company_id: 'c2' }],
    CompanyMetric: [{ company_id: 'c1', fiscal_year: 2026, it_users: 10, headcount: 12 }],
    DepartmentMetric: [{ department_id: 'd1', fiscal_year: 2026, headcount: 5 }],
  };

  const manager = {
    getRepository: (entity: { name: string }) => ({
      find: async () => {
        reads[entity.name] = (reads[entity.name] || 0) + 1;
        return rowsFor[entity.name] ?? [];
      },
    }),
  };

  return { reads, manager, total: () => Object.values(reads).reduce((a, b) => a + b, 0) };
}

function makeApps(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: APP_ID(i),
    name: `App ${i}`,
    users_mode: 'it_users' as const,
    users_year: 2026,
    users_override: null,
  }));
}

async function testQueryCountDoesNotGrowWithPageSize() {
  const run = (ApplicationsListService.prototype as any).buildDerivedUsersByApp;

  const small = createCountingManager(3);
  await run.call(null, makeApps(3), small.manager);
  const large = createCountingManager(40);
  await run.call(null, makeApps(40), large.manager);

  // The point of the fix: 40 rows must not cost more queries than 3 rows.
  assert.equal(
    large.total(),
    small.total(),
    `query count must not depend on page size (3 rows: ${small.total()}, 40 rows: ${large.total()})`,
  );
  // One read per relation family, for the whole page.
  assert.ok(large.total() <= 5, `expected at most 5 reads for a page, got ${large.total()}`);
  assert.ok(
    large.reads.ApplicationCompany === 1 && large.reads.ApplicationDepartment === 1,
    'application links are read once for the whole page',
  );
}

async function testDerivesTheSameTotalsAsThePerRowRule() {
  const run = (ApplicationsListService.prototype as any).buildDerivedUsersByApp;
  const { manager } = createCountingManager(2);

  const itUsers = await run.call(null, makeApps(2), manager);
  // company it_users 10 + outside department headcount 5
  assert.deepEqual(itUsers, { 'app-0': 15, 'app-1': 15 });

  const headcount = await run.call(
    null,
    makeApps(2).map((a) => ({ ...a, users_mode: 'headcount' as const })),
    manager,
  );
  // company headcount 12 + outside department headcount 5
  assert.deepEqual(headcount, { 'app-0': 17, 'app-1': 17 });
}

async function testSkipsTheDepartmentAlreadyCoveredByACompany() {
  const run = (ApplicationsListService.prototype as any).buildDerivedUsersByApp;

  // d1 belongs to c1 here: the company metric already includes it, so it must not be added.
  const ownManager = {
    getRepository: (entity: { name: string }) => ({
      find: async () => {
        if (entity.name === 'ApplicationCompany') return [{ application_id: APP_ID(0), company_id: 'c1' }];
        if (entity.name === 'ApplicationDepartment') return [{ application_id: APP_ID(0), department_id: 'd1' }];
        if (entity.name === 'Department') return [{ id: 'd1', company_id: 'c1' }];
        if (entity.name === 'CompanyMetric') return [{ company_id: 'c1', fiscal_year: 2026, it_users: 10, headcount: 12 }];
        if (entity.name === 'DepartmentMetric') return [{ department_id: 'd1', fiscal_year: 2026, headcount: 5 }];
        return [];
      },
    }),
  };

  const out = await run.call(null, makeApps(1), ownManager);
  assert.deepEqual(out, { 'app-0': 10 }, 'the in-company department is not double counted');
}

async function testManualModeUsesTheRowWithoutAnyQuery() {
  const run = (ApplicationsListService.prototype as any).buildDerivedUsersByApp;
  const { manager, total } = createCountingManager(0);

  const out = await run.call(
    null,
    [{ id: 'app-x', users_mode: 'manual', users_year: null, users_override: 42 }],
    manager,
  );

  assert.deepEqual(out, { 'app-x': 42 });
  assert.equal(total(), 0, 'manual mode needs no database read at all');
}

async function testEmptyPageIsFree() {
  const run = (ApplicationsListService.prototype as any).buildDerivedUsersByApp;
  const { manager, total } = createCountingManager(0);

  assert.deepEqual(await run.call(null, [], manager), {});
  assert.equal(total(), 0);
}

async function run() {
  await testQueryCountDoesNotGrowWithPageSize();
  await testDerivesTheSameTotalsAsThePerRowRule();
  await testSkipsTheDepartmentAlreadyCoveredByACompany();
  await testManualModeUsesTheRowWithoutAnyQuery();
  await testEmptyPageIsFree();
}

void run();
