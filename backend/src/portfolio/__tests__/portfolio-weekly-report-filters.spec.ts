import * as assert from 'node:assert/strict';
import { PortfolioWeeklyReportService } from '../services/portfolio-weekly-report.service';

/**
 * The weekly report's classification filters, read on the statements themselves: a task's
 * source and category are the inherited ones, the way the task list resolves them, so the
 * report and the list a reader opens next count the same population.
 */
async function run() {
  const tenantId = '44dd2037-a4a7-4943-8b63-5b2c95cff52b';
  const calls: Array<{ sql: string; params: any[] }> = [];
  const manager: any = {
    query: async (sql: string, params: any[]) => {
      calls.push({ sql, params });
      return [];
    },
  };

  const svc = new PortfolioWeeklyReportService();
  await svc.list(
    {
      tenantId,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      timeZone: 'Europe/Paris',
      sourceIds: ['s1', ' s2 ', 's1'],
      categoryIds: ['c1'],
      streamIds: [],
      taskTypeIds: [],
    },
    { manager },
  );

  assert.equal(calls.length, 3, 'one statement per entity, no query per item');
  const [requests, projects, tasks] = calls;

  // Requests and projects carry their own value: no fallback, no project join.
  for (const call of [requests, projects]) {
    assert.ok(!call.sql.includes('COALESCE(') || !call.sql.includes('source_id, pp.source_id'));
    assert.ok(!call.sql.includes('portfolio_projects pp'));
  }
  assert.ok(requests.sql.includes('r.source_id::text = ANY('));
  assert.ok(requests.sql.includes('r.category_id::text = ANY('));
  assert.ok(projects.sql.includes('p.source_id::text = ANY('));
  assert.ok(projects.sql.includes('p.category_id::text = ANY('));

  // Tasks read the inherited value, through a tenant-bound join on the project they hang off.
  assert.ok(tasks.sql.includes('COALESCE(t.source_id, pp.source_id)::text = ANY('));
  assert.ok(tasks.sql.includes('COALESCE(t.category_id, pp.category_id)::text = ANY('));
  assert.ok(tasks.sql.includes('LEFT JOIN portfolio_projects pp'));
  assert.ok(tasks.sql.includes("t.related_object_type = 'project'"));
  assert.ok(tasks.sql.includes('pp.tenant_id = t.tenant_id'));
  assert.ok(!/[^(]t\.source_id::text = ANY/.test(tasks.sql), 'the task value alone is never the filter');
  // The scope of the report is untouched by the filter.
  assert.ok(tasks.sql.includes("(t.related_object_type IS NULL OR t.related_object_type = 'project')"));

  // Blanks and duplicates are dropped, and every value travels as a bound parameter.
  for (const call of calls) {
    assert.equal(call.params[0], tenantId, 'every statement is filtered on the tenant');
    assert.ok(call.sql.includes('tenant_id = $1'));
    assert.ok(!call.sql.includes("'s1'"), 'a value is never interpolated into the SQL');
    assert.deepEqual(call.params[call.params.length - 1], ['c1']);
    assert.deepEqual(call.params[call.params.length - 2], ['s1', 's2']);
  }

  // With no filter the statements read exactly what they always read.
  const plain: Array<{ sql: string; params: any[] }> = [];
  const plainManager: any = {
    query: async (sql: string, params: any[]) => {
      plain.push({ sql, params });
      return [];
    },
  };
  await svc.list(
    { tenantId, startDate: '2026-08-01', endDate: '2026-08-31', timeZone: 'Europe/Paris' },
    { manager: plainManager },
  );
  for (const call of plain) {
    assert.ok(!call.sql.includes('source_id::text = ANY('));
    assert.ok(!call.sql.includes('category_id::text = ANY('));
  }

  console.log('portfolio-weekly-report-filters.spec.ts: ok');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
