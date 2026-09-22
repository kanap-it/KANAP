import * as assert from 'node:assert/strict';
import {
  PortfolioFlowReportService,
  buildWeeks,
  normalizeFlowWeeks,
  shiftDay,
  todayIn,
} from '../services/portfolio-flow-report.service';

type Call = { sql: string; params: any[] };

/**
 * A stand-in for the tenant-bound manager. It recognises each statement by a fragment of its
 * text, so the assembly can be tested without a database while still proving that every query
 * filters on the tenant and passes the zone as a bound parameter.
 */
function stubManager(answers: {
  weeks: Record<string, Array<Record<string, unknown>>>;
  totals: Record<string, Array<Record<string, unknown>>>;
  age: Array<Record<string, unknown>>;
}) {
  const calls: Call[] = [];
  const manager = {
    query: async (sql: string, params: any[]) => {
      calls.push({ sql, params });
      if (sql.includes('open_tasks AS')) return answers.age;
      const table = String(params[1]);
      if (sql.includes('open_at_end AS')) return answers.weeks[table] ?? [];
      return answers.totals[table] ?? [];
    },
  } as any;
  return { manager, calls };
}

const emptyTotals = [{ open_now: 0, closed_count: 0, median_days: null, by_type: null }];

async function run() {
  /* ----------------------------------------------------------------- */
  /*  Period normalisation                                             */
  /* ----------------------------------------------------------------- */

  assert.equal(normalizeFlowWeeks(8), 8);
  assert.equal(normalizeFlowWeeks('13'), 13);
  assert.equal(normalizeFlowWeeks(' 26 '), 26);
  assert.equal(normalizeFlowWeeks(12), 13);
  assert.equal(normalizeFlowWeeks(0), 13);
  assert.equal(normalizeFlowWeeks(-26), 13);
  assert.equal(normalizeFlowWeeks(undefined), 13);
  assert.equal(normalizeFlowWeeks('all'), 13);
  assert.equal(normalizeFlowWeeks('13; DROP TABLE audit_log'), 13);

  /* ----------------------------------------------------------------- */
  /*  Week bounds                                                      */
  /* ----------------------------------------------------------------- */

  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');

  // A Wednesday: the last week starts on the Monday and stops today, earlier weeks are full.
  const midWeek = buildWeeks('2026-09-23', 13);
  assert.equal(midWeek.length, 13);
  assert.deepEqual(midWeek[12], { weekStart: '2026-09-21', weekEnd: '2026-09-23' });
  assert.deepEqual(midWeek[11], { weekStart: '2026-09-14', weekEnd: '2026-09-20' });
  assert.deepEqual(midWeek[0], { weekStart: '2026-06-29', weekEnd: '2026-07-05' });

  // A Sunday closes its own week; a Monday opens a one-day week.
  assert.deepEqual(buildWeeks('2026-09-20', 8)[7], { weekStart: '2026-09-14', weekEnd: '2026-09-20' });
  assert.deepEqual(buildWeeks('2026-09-21', 8)[7], { weekStart: '2026-09-21', weekEnd: '2026-09-21' });

  // 8, 13 and 26 all end on the same day and only differ by how far back they start.
  for (const weeks of [8, 13, 26]) {
    const bounds = buildWeeks('2026-09-23', weeks);
    assert.equal(bounds.length, weeks);
    assert.equal(bounds[bounds.length - 1].weekEnd, '2026-09-23');
    assert.equal(bounds[0].weekStart, shiftDay('2026-09-21', -7 * (weeks - 1)));
    for (let index = 1; index < bounds.length; index += 1) {
      assert.equal(bounds[index].weekStart, shiftDay(bounds[index - 1].weekStart, 7));
    }
  }

  // A zone west of UTC is still on the previous day when Paris has already moved on.
  const OriginalDate = Date;
  const freeze = (iso: string) => {
    const fixed = new OriginalDate(iso).getTime();
    (global as any).Date = class extends OriginalDate {
      constructor(...args: any[]) {
        // @ts-expect-error the real constructor takes the forwarded arguments
        super(...(args.length ? args : [fixed]));
      }
      static now() {
        return fixed;
      }
    };
  };

  try {
    // 2026-09-21 07:30 UTC is 2026-09-21 00:30 in Los Angeles: a Monday, so a one-day week.
    freeze('2026-09-21T07:30:00Z');
    assert.equal(todayIn('America/Los_Angeles'), '2026-09-21');
    assert.equal(todayIn('Europe/Paris'), '2026-09-21');
    const monday = buildWeeks(todayIn('America/Los_Angeles'), 8);
    assert.deepEqual(monday[7], { weekStart: '2026-09-21', weekEnd: '2026-09-21' });
    assert.deepEqual(monday[0], { weekStart: '2026-08-03', weekEnd: '2026-08-09' });

    // An hour earlier it is still Sunday in Los Angeles while Paris is already on Monday.
    freeze('2026-09-21T06:30:00Z');
    assert.equal(todayIn('America/Los_Angeles'), '2026-09-20');
    assert.equal(todayIn('Europe/Paris'), '2026-09-21');
    assert.deepEqual(buildWeeks(todayIn('America/Los_Angeles'), 13)[12], {
      weekStart: '2026-09-14',
      weekEnd: '2026-09-20',
    });
    assert.deepEqual(buildWeeks(todayIn('America/Los_Angeles'), 26)[0], {
      weekStart: '2026-03-23',
      weekEnd: '2026-03-29',
    });
  } finally {
    (global as any).Date = OriginalDate;
  }

  /* ----------------------------------------------------------------- */
  /*  Response assembly                                                */
  /* ----------------------------------------------------------------- */

  const svc = new PortfolioFlowReportService();
  const tenantId = '44dd2037-a4a7-4943-8b63-5b2c95cff52b';

  const { manager, calls } = stubManager({
    weeks: {
      tasks: [
        { idx: 1, created: 4, closed: 1, open_at_end: 3 },
        { idx: 2, created: 2, closed: 5, open_at_end: 9 },
        { idx: 13, created: 3, closed: 2, open_at_end: 7 },
      ],
      portfolio_requests: [{ idx: 2, created: 1, closed: 0, open_at_end: 2 }],
      portfolio_projects: [],
    },
    totals: {
      tasks: [
        {
          open_now: 7,
          closed_count: 6,
          median_days: 12.44,
          by_type: [
            { taskTypeId: 't1', taskTypeName: 'Bug', closedCount: 4, medianDays: 8.2 },
            { taskTypeId: null, taskTypeName: null, closedCount: 2, medianDays: 21 },
          ],
        },
      ],
      portfolio_requests: [{ open_now: 2, closed_count: 0, median_days: null, by_type: null }],
      portfolio_projects: emptyTotals,
    },
    age: [
      {
        task_type_id: 't1',
        task_type_name: 'Bug',
        up_to_7: 2,
        from_8_to_30: 1,
        from_31_to_90: 0,
        over_90: 3,
        total: 6,
      },
      {
        task_type_id: null,
        task_type_name: null,
        up_to_7: 1,
        from_8_to_30: 0,
        from_31_to_90: 0,
        over_90: 0,
        total: 1,
      },
    ],
  });

  const report = await svc.getReport(tenantId, { weeks: 'nonsense', timeZone: 'Europe/Paris' }, { manager });

  assert.equal(report.weeks, 13);
  assert.equal(report.timeZone, 'Europe/Paris');
  assert.equal(report.flow.tasks.weeks.length, 13);
  assert.equal(report.startDate, report.flow.tasks.weeks[0].weekStart);
  assert.equal(report.endDate, report.flow.tasks.weeks[12].weekEnd);

  // Ordinality maps onto the window: row idx 1 is the oldest week, a missing row reads as zero.
  assert.deepEqual(
    { ...report.flow.tasks.weeks[0], weekStart: 'x', weekEnd: 'x' },
    { weekStart: 'x', weekEnd: 'x', created: 4, closed: 1, openAtEnd: 3 },
  );
  assert.equal(report.flow.tasks.weeks[1].created, 2);
  assert.equal(report.flow.tasks.weeks[1].openAtEnd, 9);
  assert.equal(report.flow.tasks.weeks[5].created, 0);
  assert.equal(report.flow.tasks.weeks[5].openAtEnd, 0);
  assert.equal(report.flow.requests.weeks[1].created, 1);
  assert.equal(report.flow.projects.weeks[0].created, 0);

  // The current week's open stock equals what is open right now when the audit is complete.
  assert.equal(report.flow.tasks.openNow, 7);
  assert.equal(report.flow.tasks.weeks[12].openAtEnd, report.flow.tasks.openNow);
  assert.equal(report.flow.requests.openNow, 2);
  assert.equal(report.flow.projects.openNow, 0);

  // The median is rounded to one decimal, and nothing closed means no median at all.
  assert.deepEqual(report.leadTime.tasks, { closedCount: 6, medianDays: 12.4 });
  assert.deepEqual(report.leadTime.requests, { closedCount: 0, medianDays: null });
  assert.deepEqual(report.leadTime.projects, { closedCount: 0, medianDays: null });
  assert.deepEqual(report.leadTime.tasksByType, [
    { taskTypeId: 't1', taskTypeName: 'Bug', closedCount: 4, medianDays: 8.2 },
    { taskTypeId: null, taskTypeName: null, closedCount: 2, medianDays: 21 },
  ]);

  // The age total is the sum of the rows, bracket by bracket.
  assert.deepEqual(report.age.rows[1], {
    taskTypeId: null,
    taskTypeName: null,
    buckets: { upTo7: 1, from8To30: 0, from31To90: 0, over90: 0 },
    total: 1,
  });
  assert.deepEqual(report.age.total, {
    taskTypeId: null,
    taskTypeName: null,
    buckets: { upTo7: 3, from8To30: 1, from31To90: 0, over90: 3 },
    total: 7,
  });

  /* ----------------------------------------------------------------- */
  /*  Tenant safety                                                    */
  /* ----------------------------------------------------------------- */

  assert.equal(calls.length, 7);
  for (const call of calls) {
    assert.equal(call.params[0], tenantId, 'every statement is filtered on the tenant');
    assert.ok(call.sql.includes('tenant_id = $1'), 'the tenant predicate is in the SQL');
    assert.ok(!call.sql.includes('Europe/Paris'), 'the zone is never interpolated into the SQL');
    assert.ok(call.params.includes('Europe/Paris'), 'the zone travels as a bound parameter');
  }

  const weekCall = calls.find((call) => call.sql.includes('open_at_end AS'))!;
  assert.equal(weekCall.params.length, 6, 'the week query uses every parameter it is handed');
  assert.deepEqual(weekCall.params[2], ['done', 'cancelled']);
  assert.equal(weekCall.params[4].length, 13);
  assert.equal(weekCall.params[5].length, 13);

  const totalsCall = calls.find((call) => call.sql.includes('lead_time AS') && String(call.params[1]) === 'tasks')!;
  assert.deepEqual(totalsCall.params[6], ['open', 'in_progress', 'pending', 'in_testing']);
  assert.equal(totalsCall.params[7], report.startDate);
  assert.equal(totalsCall.params[8], report.endDate);

  const requestTotals = calls.find(
    (call) => call.sql.includes('lead_time AS') && String(call.params[1]) === 'portfolio_requests',
  )!;
  assert.deepEqual(requestTotals.params[2], ['converted', 'rejected']);
  assert.deepEqual(requestTotals.params[6], ['pending_review', 'candidate', 'approved', 'on_hold']);

  // A manager is mandatory: the report has no way to reach a tenant-scoped connection without it.
  await assert.rejects(() => svc.getReport(tenantId, {}, {}));

  console.log('portfolio-flow-report.spec.ts: ok');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
