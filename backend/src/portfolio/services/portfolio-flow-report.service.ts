import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { normalizeReportTimeZone } from '../../common/report-period';
import {
  AgeBucket,
  AgeRow,
  FLOW_DEFAULT_MONTHS,
  FLOW_DEFAULT_WEEKS,
  FLOW_MONTHS,
  FLOW_WEEKS,
  FlowPeriod,
  FlowReportResponse,
  FlowSeries,
  LeadTime,
  LeadTimeByType,
  MONTH_BUCKETS,
  MonthBucket,
  ProjectDoneLeadTime,
  StageAgeItem,
  StageAgeRow,
  StageAgeTable,
} from '../dto/flow-report.dto';
import { CLOSED_STATUSES } from './portfolio-weekly-report.service';

/**
 * Tasks only count when they are standalone or hang off a project, exactly like the steering
 * strip and the weekly report: tasks attached to a contract, a spend item, a capex item or an
 * incident belong to those workflows and would distort every portfolio figure.
 */
const TASK_SCOPE_SQL = `(t.related_object_type IS NULL OR t.related_object_type = 'project')`;

/**
 * The statuses each entity counts as open. They mirror `portfolioListLinks.ts` on the front,
 * because every figure that links to a list has to count the same population the list shows.
 * For requests and projects the order is the order of the journey, and it is also the order
 * the stage age table reads in.
 */
const OPEN_STATUSES = {
  tasks: ['open', 'in_progress', 'pending', 'in_testing'],
  requests: ['pending_review', 'candidate', 'approved', 'on_hold'],
  projects: ['waiting_list', 'planned', 'in_progress', 'in_testing', 'on_hold'],
} as const;

/** Age brackets of an open task, in whole days. The last one has no upper bound. */
const AGE_BUCKETS: Array<{ key: AgeBucket; from: number; to: number | null }> = [
  { key: 'upTo7', from: 0, to: 7 },
  { key: 'from8To30', from: 8, to: 30 },
  { key: 'from31To90', from: 31, to: 90 },
  { key: 'over90', from: 91, to: null },
];

type EntityKey = 'tasks' | 'requests' | 'projects';

type EntitySpec = {
  /** Live table and `audit_log.table_name`, which are the same string for the three. */
  table: string;
  closedStatuses: readonly string[];
  openStatuses: readonly string[];
  /**
   * The live rows in scope, aliased `l`, exposing `id`, `created_at`, `status`, `task_type_id`,
   * `planned_end`, `item_number` and `name`.
   */
  liveSql: string;
  /** Business reference prefix and workspace route, for the stage age items. */
  refPrefix: string;
  routeBase: string;
};

const ENTITIES: Record<EntityKey, EntitySpec> = {
  tasks: {
    table: 'tasks',
    closedStatuses: CLOSED_STATUSES.tasks,
    openStatuses: OPEN_STATUSES.tasks,
    liveSql: `
      SELECT t.id, t.created_at, t.status, t.task_type_id,
             NULL::date AS planned_end, t.item_number, t.title AS name
      FROM tasks t
      WHERE t.tenant_id = $1 AND ${TASK_SCOPE_SQL}
    `,
    refPrefix: 'T',
    routeBase: '/portfolio/tasks',
  },
  requests: {
    table: 'portfolio_requests',
    closedStatuses: CLOSED_STATUSES.requests,
    openStatuses: OPEN_STATUSES.requests,
    liveSql: `
      SELECT r.id, r.created_at, r.status, NULL::uuid AS task_type_id,
             NULL::date AS planned_end, r.item_number, r.name
      FROM portfolio_requests r
      WHERE r.tenant_id = $1
    `,
    refPrefix: 'REQ',
    routeBase: '/portfolio/requests',
  },
  projects: {
    table: 'portfolio_projects',
    closedStatuses: CLOSED_STATUSES.projects,
    openStatuses: OPEN_STATUSES.projects,
    liveSql: `
      SELECT p.id, p.created_at, p.status, NULL::uuid AS task_type_id,
             p.planned_end, p.item_number, p.name
      FROM portfolio_projects p
      WHERE p.tenant_id = $1
    `,
    refPrefix: 'PRJ',
    routeBase: '/portfolio/projects',
  },
};

const num = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const numOrNull = (value: unknown): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 10) / 10 : null;
};

/** The requested period in weeks, or the default when it is missing or not one of the offered ones. */
export function normalizeFlowWeeks(value: unknown): number {
  const parsed = Number(String(value ?? '').trim());
  return (FLOW_WEEKS as readonly number[]).includes(parsed) ? parsed : FLOW_DEFAULT_WEEKS;
}

/** Same, for the requests-and-projects horizon, expressed in months. */
export function normalizeFlowMonths(value: unknown): number {
  const parsed = Number(String(value ?? '').trim());
  return (FLOW_MONTHS as readonly number[]).includes(parsed) ? parsed : FLOW_DEFAULT_MONTHS;
}

/** Today in the viewer's zone, as `YYYY-MM-DD`. */
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** `day` shifted by a whole number of calendar days, both sides `YYYY-MM-DD`. */
export function shiftDay(day: string, offset: number): string {
  const shifted = new Date(`${day}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + offset);
  return shifted.toISOString().slice(0, 10);
}

/**
 * The local weeks the report covers, oldest first. Weeks run Monday to Sunday; the last one is
 * the week in progress, so its `periodEnd` is today rather than the coming Sunday.
 */
export function buildWeeks(today: string, weeks: number): Array<{ periodStart: string; periodEnd: string }> {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const currentMonday = shiftDay(today, -((weekday + 6) % 7));
  const out: Array<{ periodStart: string; periodEnd: string }> = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const periodStart = shiftDay(currentMonday, -7 * index);
    const sunday = shiftDay(periodStart, 6);
    out.push({ periodStart, periodEnd: sunday > today ? today : sunday });
  }
  return out;
}

/**
 * The local calendar months the report covers, oldest first. The last one is the month in
 * progress, so it stops on today instead of on its own last day.
 */
export function buildMonths(today: string, months: number): Array<{ periodStart: string; periodEnd: string }> {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const out: Array<{ periodStart: string; periodEnd: string }> = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    // `Date.UTC` rolls a negative month index back into the previous years on its own.
    const first = new Date(Date.UTC(year, month - 1 - index, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
    const periodStart = first.toISOString().slice(0, 10);
    const periodEnd = last.toISOString().slice(0, 10);
    out.push({ periodStart, periodEnd: periodEnd > today ? today : periodEnd });
  }
  return out;
}

type PeriodRow = { idx: number | string; created: number | string; closed: number | string; open_at_end: number | string };
type TotalsRow = {
  open_now: number | string;
  closed_count: number | string;
  median_days: number | string | null;
  by_type: Array<{ taskTypeId: string | null; taskTypeName: string | null; closedCount: number; medianDays: number | null }> | null;
  by_outcome: Record<string, { closedCount: number; medianDays: number | null }> | null;
  done: { closedCount: number; medianDays: number | null; withPlannedEnd: number; medianOverrunDays: number | null } | null;
};
type AgeSqlRow = {
  task_type_id: string | null;
  task_type_name: string | null;
  up_to_7: number | string;
  from_8_to_30: number | string;
  from_31_to_90: number | string;
  over_90: number | string;
  total: number | string;
};
type StageAgeSqlRow = {
  id: string;
  item_number: number | string | null;
  name: string | null;
  status: string;
  status_since: string;
  age_days: number | string;
  planned_end: string | null;
  planned_end_passed: boolean;
};

const emptyLeadTime = (): LeadTime => ({ closedCount: 0, medianDays: null });

/** The bracket a whole number of days falls in. */
export function monthBucketOf(ageDays: number): MonthBucket {
  const found = MONTH_BUCKETS.find((bucket) => ageDays >= bucket.from && (bucket.to == null || ageDays <= bucket.to));
  return (found ?? MONTH_BUCKETS[MONTH_BUCKETS.length - 1]).key;
}

const zeroMonthBuckets = (): Record<MonthBucket, number> =>
  MONTH_BUCKETS.reduce((acc, bucket) => ({ ...acc, [bucket.key]: 0 }), {} as Record<MonthBucket, number>);

/**
 * Flow and age of the portfolio: how many items come in and go out period after period, how
 * long the open work has been sitting where it sits, and how long it takes to close something.
 *
 * Tasks read week by week, requests and projects month by month — a request or a project moves
 * on a scale where a weekly column says nothing. Every figure comes from `audit_log` joined to
 * the live table, so a deleted item never counts. "Closed in a period" follows the weekly
 * report's rule — the last status event of the period lands on a closed status — because each
 * column of the chart opens that period's weekly report, and the two totals have to agree.
 * Every query filters on `tenant_id`, and the zone is a bound parameter, never interpolated.
 */
@Injectable()
export class PortfolioFlowReportService {
  async getReport(
    tenantId: string,
    query: { weeks?: unknown; months?: unknown; timeZone?: string | null },
    opts: { manager?: EntityManager },
  ): Promise<FlowReportResponse> {
    const manager = opts.manager;
    if (!manager) throw new Error('A tenant-bound EntityManager is required');

    const timeZone = normalizeReportTimeZone(query.timeZone);
    const weeks = normalizeFlowWeeks(query.weeks);
    const months = normalizeFlowMonths(query.months);
    const endDate = todayIn(timeZone);

    const weekBounds = buildWeeks(endDate, weeks);
    const monthBounds = buildMonths(endDate, months);
    const startDate = weekBounds[0].periodStart;
    const monthsStartDate = monthBounds[0].periodStart;

    const [tasks, requests, projects, taskAge, requestAge, projectAge] = await Promise.all([
      this.entity(manager, 'tasks', {
        tenantId,
        timeZone,
        granularity: 'week',
        bounds: weekBounds,
        windowStart: startDate,
        endDate,
      }),
      this.entity(manager, 'requests', {
        tenantId,
        timeZone,
        granularity: 'month',
        bounds: monthBounds,
        windowStart: monthsStartDate,
        endDate,
      }),
      this.entity(manager, 'projects', {
        tenantId,
        timeZone,
        granularity: 'month',
        bounds: monthBounds,
        windowStart: monthsStartDate,
        endDate,
      }),
      this.taskAge(manager, tenantId, timeZone, endDate),
      this.stageAge(manager, 'requests', tenantId, timeZone, endDate),
      this.stageAge(manager, 'projects', tenantId, timeZone, endDate),
    ]);

    return {
      weeks,
      months,
      startDate,
      monthsStartDate,
      endDate,
      timeZone,
      asOf: new Date().toISOString(),
      flow: { tasks: tasks.series, requests: requests.series, projects: projects.series },
      age: { tasks: taskAge, requests: requestAge, projects: projectAge },
      leadTime: {
        tasks: tasks.leadTime,
        tasksByType: tasks.byType,
        requests: {
          ...requests.leadTime,
          converted: requests.byOutcome.converted ?? emptyLeadTime(),
          rejected: requests.byOutcome.rejected ?? emptyLeadTime(),
        },
        projects: { ...projects.leadTime, done: projects.done },
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Shared audit CTEs                                               */
  /* ---------------------------------------------------------------- */

  /**
   * Status history of the entity, built once and reused by every bound of the window.
   *
   * `ev` is the status timeline: the creation row plus every update that actually moved the
   * status. Events without a status are dropped, so a record whose audit says nothing about
   * status falls back to its live status through `item`, which is what "no event yet" means.
   *
   * Parameters are fixed: $1 tenant, $2 audit table, $3 closed statuses, $4 zone,
   * $5 period starts, $6 period ends, $7 open statuses, $8 first day, $9 last day.
   */
  private historyCtes(spec: EntitySpec): string {
    return `
      live AS (${spec.liveSql}),
      audit AS (
        SELECT al.record_id AS id, al.created_at, al.id AS aid, al.action,
               al.before_json->>'status' AS before_status,
               al.after_json->>'status' AS after_status
        FROM audit_log al
        JOIN live l ON l.id = al.record_id
        WHERE al.tenant_id = $1
          AND al.table_name = $2
          AND al.record_id IS NOT NULL
          AND al.action IN ('create', 'update')
      ),
      ev AS (
        SELECT a.id, a.created_at, a.aid, a.after_status AS status
        FROM audit a
        WHERE a.after_status IS NOT NULL
          AND (a.action = 'create' OR a.before_status IS DISTINCT FROM a.after_status)
      ),
      create_ev AS (
        SELECT DISTINCT ON (a.id) a.id, a.created_at
        FROM audit a
        WHERE a.action = 'create'
        ORDER BY a.id, a.created_at ASC, a.aid ASC
      ),
      item AS (
        SELECT l.id, l.status AS live_status, l.task_type_id, l.planned_end,
               COALESCE(ce.created_at, l.created_at) AS created_instant
        FROM live l
        LEFT JOIN create_ev ce ON ce.id = l.id
      ),
      bound AS (
        SELECT w.idx::int AS idx, w.ws AS period_start, w.we AS period_end,
               (w.ws::timestamp AT TIME ZONE $4) AS from_at,
               ((w.we + 1)::timestamp AT TIME ZONE $4) AS to_at
        FROM unnest($5::date[], $6::date[]) WITH ORDINALITY AS w(ws, we, idx)
      )
    `;
  }

  /** The three figures of the grain, one row per period of the window. */
  private async periodRows(
    manager: EntityManager,
    spec: EntitySpec,
    params: any[],
  ): Promise<PeriodRow[]> {
    return (await manager.query(
      `
      WITH ${this.historyCtes(spec)},
      created AS (
        SELECT b.idx, COUNT(*)::int AS n
        FROM bound b
        JOIN create_ev ce ON ce.created_at >= b.from_at AND ce.created_at < b.to_at
        GROUP BY b.idx
      ),
      period_last AS (
        SELECT DISTINCT ON (b.idx, e.id) b.idx, e.id, e.status
        FROM bound b
        JOIN ev e ON e.created_at >= b.from_at AND e.created_at < b.to_at
        ORDER BY b.idx, e.id, e.created_at DESC, e.aid DESC
      ),
      closed AS (
        SELECT pl.idx, COUNT(*)::int AS n
        FROM period_last pl
        WHERE pl.status = ANY($3::text[])
        GROUP BY pl.idx
      ),
      open_at_end AS (
        SELECT b.idx, COUNT(*)::int AS n
        FROM bound b
        JOIN item i ON i.created_instant < b.to_at
        LEFT JOIN LATERAL (
          SELECT e.status
          FROM ev e
          WHERE e.id = i.id AND e.created_at < b.to_at
          ORDER BY e.created_at DESC, e.aid DESC
          LIMIT 1
        ) le ON TRUE
        WHERE COALESCE(le.status, i.live_status) <> ALL($3::text[])
        GROUP BY b.idx
      )
      SELECT b.idx,
             COALESCE(c.n, 0) AS created,
             COALESCE(cl.n, 0) AS closed,
             COALESCE(o.n, 0) AS open_at_end
      FROM bound b
      LEFT JOIN created c ON c.idx = b.idx
      LEFT JOIN closed cl ON cl.idx = b.idx
      LEFT JOIN open_at_end o ON o.idx = b.idx
      ORDER BY b.idx
      `,
      params,
    )) as PeriodRow[];
  }

  /**
   * What is open at this instant and how long the window's closings took. The closings use the
   * same "last status event of the period" rule as the weekly report, over the whole window, so
   * the figure matches the weekly report's closed list for the window's first and last day.
   */
  private async totalsRow(
    manager: EntityManager,
    key: EntityKey,
    spec: EntitySpec,
    params: any[],
  ): Promise<TotalsRow | undefined> {
    const medianOf = (condition: string) =>
      `ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY lt.days) FILTER (WHERE ${condition})::numeric, 1)::float8`;

    const byType =
      key === 'tasks'
        ? `
        (
          SELECT json_agg(
            json_build_object(
              'taskTypeId', x.type_id,
              'taskTypeName', x.type_name,
              'closedCount', x.closed_count,
              'medianDays', x.median_days
            )
            ORDER BY x.no_type, x.display_order, x.type_name
          )
          FROM (
            SELECT tt.id::text AS type_id,
                   tt.name AS type_name,
                   tt.display_order,
                   (tt.id IS NULL) AS no_type,
                   COUNT(*)::int AS closed_count,
                   ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY lt.days)::numeric, 1)::float8 AS median_days
            FROM lead_time lt
            LEFT JOIN portfolio_task_types tt ON tt.id = lt.task_type_id AND tt.tenant_id = $1
            GROUP BY tt.id, tt.name, tt.display_order
          ) x
        )
      `
        : `NULL::json`;

    // Requests leave the funnel one of two ways, and the two are worth separating: a converted
    // request is a success story, a rejected one is a triage decision.
    const byOutcome =
      key === 'requests'
        ? `
        (
          SELECT json_build_object(
            'converted', json_build_object(
              'closedCount', COUNT(*) FILTER (WHERE lt.close_status = 'converted'),
              'medianDays', ${medianOf(`lt.close_status = 'converted'`)}
            ),
            'rejected', json_build_object(
              'closedCount', COUNT(*) FILTER (WHERE lt.close_status = 'rejected'),
              'medianDays', ${medianOf(`lt.close_status = 'rejected'`)}
            )
          )
          FROM lead_time lt
        )
      `
        : `NULL::json`;

    // A cancelled project never ran, so it says nothing about how long a project takes: the
    // duration and the gap to the planned end are read on the finished ones only.
    const done =
      key === 'projects'
        ? `
        (
          SELECT json_build_object(
            'closedCount', COUNT(*) FILTER (WHERE lt.close_status = 'done'),
            'medianDays', ${medianOf(`lt.close_status = 'done'`)},
            'withPlannedEnd', COUNT(*) FILTER (WHERE lt.close_status = 'done' AND lt.planned_end IS NOT NULL),
            'medianOverrunDays', ROUND(
              percentile_cont(0.5) WITHIN GROUP (ORDER BY lt.overrun_days)
                FILTER (WHERE lt.close_status = 'done' AND lt.planned_end IS NOT NULL)::numeric,
              1
            )::float8
          )
          FROM lead_time lt
        )
      `
        : `NULL::json`;

    const [row] = (await manager.query(
      `
      WITH ${this.historyCtes(spec)},
      window_last AS (
        SELECT DISTINCT ON (e.id) e.id, e.status, e.created_at
        FROM ev e
        WHERE e.created_at >= ($8::date::timestamp AT TIME ZONE $4)
          AND e.created_at < (($9::date + 1)::timestamp AT TIME ZONE $4)
        ORDER BY e.id, e.created_at DESC, e.aid DESC
      ),
      lead_time AS (
        SELECT i.id, i.task_type_id, i.planned_end, wl.status AS close_status,
               EXTRACT(EPOCH FROM (wl.created_at - i.created_instant)) / 86400.0 AS days,
               ((wl.created_at AT TIME ZONE $4)::date - i.planned_end) AS overrun_days
        FROM window_last wl
        JOIN item i ON i.id = wl.id
        WHERE wl.status = ANY($3::text[])
      )
      SELECT
        (SELECT COUNT(*)::int FROM live l WHERE l.status = ANY($7::text[])) AS open_now,
        (SELECT COUNT(*)::int FROM lead_time) AS closed_count,
        (SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY lt.days)::numeric, 1)::float8 FROM lead_time lt) AS median_days,
        ${byType} AS by_type,
        ${byOutcome} AS by_outcome,
        ${done} AS done
      `,
      params,
    )) as TotalsRow[];

    return row;
  }

  private async entity(
    manager: EntityManager,
    key: EntityKey,
    ctx: {
      tenantId: string;
      timeZone: string;
      granularity: 'week' | 'month';
      bounds: Array<{ periodStart: string; periodEnd: string }>;
      windowStart: string;
      endDate: string;
    },
  ): Promise<{
    series: FlowSeries;
    leadTime: LeadTime;
    byType: LeadTimeByType[];
    byOutcome: Record<string, LeadTime>;
    done: ProjectDoneLeadTime;
  }> {
    const spec = ENTITIES[key];
    const params = [
      ctx.tenantId,
      spec.table,
      [...spec.closedStatuses],
      ctx.timeZone,
      ctx.bounds.map((b) => b.periodStart),
      ctx.bounds.map((b) => b.periodEnd),
      [...spec.openStatuses],
      ctx.windowStart,
      ctx.endDate,
    ];

    // A statement must use every parameter it is handed, or Postgres cannot infer the type of
    // the spare ones: the period query stops at $6, the totals query takes the whole list.
    const [rows, totals] = await Promise.all([
      this.periodRows(manager, spec, params.slice(0, 6)),
      this.totalsRow(manager, key, spec, params),
    ]);

    const byIndex = new Map(rows.map((row) => [num(row.idx), row]));
    const periods: FlowPeriod[] = ctx.bounds.map((bound, index) => {
      const row = byIndex.get(index + 1);
      return {
        periodStart: bound.periodStart,
        periodEnd: bound.periodEnd,
        created: num(row?.created),
        closed: num(row?.closed),
        openAtEnd: num(row?.open_at_end),
      };
    });

    const closedCount = num(totals?.closed_count);
    const shapeLead = (entry: { closedCount?: unknown; medianDays?: unknown } | null | undefined): LeadTime => {
      const count = num(entry?.closedCount);
      return { closedCount: count, medianDays: count === 0 ? null : numOrNull(entry?.medianDays) };
    };

    const doneRaw = totals?.done ?? null;
    const doneCount = num(doneRaw?.closedCount);
    const withPlannedEnd = num(doneRaw?.withPlannedEnd);

    return {
      series: { granularity: ctx.granularity, periods, openNow: num(totals?.open_now) },
      leadTime: { closedCount, medianDays: closedCount === 0 ? null : numOrNull(totals?.median_days) },
      byType: (totals?.by_type ?? []).map((entry) => ({
        taskTypeId: entry.taskTypeId ?? null,
        taskTypeName: entry.taskTypeName ?? null,
        closedCount: num(entry.closedCount),
        medianDays: entry.closedCount === 0 ? null : numOrNull(entry.medianDays),
      })),
      byOutcome: Object.fromEntries(
        Object.entries(totals?.by_outcome ?? {}).map(([status, entry]) => [status, shapeLead(entry)]),
      ),
      done: {
        closedCount: doneCount,
        medianDays: doneCount === 0 ? null : numOrNull(doneRaw?.medianDays),
        withPlannedEnd,
        medianOverrunDays: withPlannedEnd === 0 ? null : numOrNull(doneRaw?.medianOverrunDays),
      },
    };
  }

  /**
   * How long the open tasks have been waiting, one row per task type. Age is a whole number of
   * local days between the creation day and today, so a task created this morning reads as 0.
   */
  private async taskAge(
    manager: EntityManager,
    tenantId: string,
    timeZone: string,
    today: string,
  ): Promise<{ rows: AgeRow[]; total: AgeRow }> {
    const rows = (await manager.query(
      `
      WITH open_tasks AS (
        SELECT t.task_type_id,
               ($4::date - (t.created_at AT TIME ZONE $2)::date) AS age_days
        FROM tasks t
        WHERE t.tenant_id = $1
          AND ${TASK_SCOPE_SQL}
          AND t.status = ANY($3::text[])
      )
      SELECT tt.id::text AS task_type_id,
             tt.name AS task_type_name,
             COUNT(*) FILTER (WHERE o.age_days <= 7)::int AS up_to_7,
             COUNT(*) FILTER (WHERE o.age_days BETWEEN 8 AND 30)::int AS from_8_to_30,
             COUNT(*) FILTER (WHERE o.age_days BETWEEN 31 AND 90)::int AS from_31_to_90,
             COUNT(*) FILTER (WHERE o.age_days >= 91)::int AS over_90,
             COUNT(*)::int AS total
      FROM open_tasks o
      LEFT JOIN portfolio_task_types tt ON tt.id = o.task_type_id AND tt.tenant_id = $1
      GROUP BY tt.id, tt.name, tt.display_order
      ORDER BY (tt.id IS NULL), tt.display_order, tt.name
      `,
      [tenantId, timeZone, [...OPEN_STATUSES.tasks], today],
    )) as AgeSqlRow[];

    const shaped: AgeRow[] = rows.map((row) => ({
      taskTypeId: row.task_type_id ?? null,
      taskTypeName: row.task_type_name ?? null,
      buckets: {
        upTo7: num(row.up_to_7),
        from8To30: num(row.from_8_to_30),
        from31To90: num(row.from_31_to_90),
        over90: num(row.over_90),
      },
      total: num(row.total),
    }));

    const total: AgeRow = {
      taskTypeId: null,
      taskTypeName: null,
      buckets: AGE_BUCKETS.reduce(
        (acc, bucket) => ({
          ...acc,
          [bucket.key]: shaped.reduce((sum, row) => sum + row.buckets[bucket.key], 0),
        }),
        {} as Record<AgeBucket, number>,
      ),
      total: shaped.reduce((sum, row) => sum + row.total, 0),
    };

    return { rows: shaped, total };
  }

  /**
   * How long every open request or project has been sitting in the stage it is in now.
   *
   * The clock starts on the last audit event that brought the item to its current status — a
   * project that went back to "on hold" last week counts a week, not the two years since it was
   * created. An item whose audit says nothing about status falls back to its creation day.
   *
   * The query returns the open items themselves, one row each; the stage rows are folded from
   * them here, so the totals and the lists the report opens can never disagree.
   */
  private async stageAge(
    manager: EntityManager,
    key: 'requests' | 'projects',
    tenantId: string,
    timeZone: string,
    today: string,
  ): Promise<StageAgeTable> {
    const spec = ENTITIES[key];
    const withPlannedEnd = key === 'projects';

    const rows = (await manager.query(
      `
      WITH live AS (${spec.liveSql}),
      audit AS (
        SELECT al.record_id AS id, al.created_at, al.id AS aid, al.action,
               al.before_json->>'status' AS before_status,
               al.after_json->>'status' AS after_status
        FROM audit_log al
        JOIN live l ON l.id = al.record_id
        WHERE al.tenant_id = $1
          AND al.table_name = $2
          AND al.record_id IS NOT NULL
          AND al.action IN ('create', 'update')
      ),
      ev AS (
        SELECT a.id, a.created_at, a.aid, a.after_status AS status
        FROM audit a
        WHERE a.after_status IS NOT NULL
          AND (a.action = 'create' OR a.before_status IS DISTINCT FROM a.after_status)
      ),
      open_items AS (
        SELECT l.id, l.item_number, l.name, l.status, l.planned_end, l.created_at
        FROM live l
        WHERE l.status = ANY($3::text[])
      ),
      entered AS (
        SELECT DISTINCT ON (e.id) e.id, e.created_at
        FROM ev e
        JOIN open_items o ON o.id = e.id AND e.status = o.status
        ORDER BY e.id, e.created_at DESC, e.aid DESC
      )
      SELECT o.id::text AS id,
             o.item_number,
             o.name,
             o.status,
             (COALESCE(en.created_at, o.created_at) AT TIME ZONE $4)::date::text AS status_since,
             ($5::date - (COALESCE(en.created_at, o.created_at) AT TIME ZONE $4)::date) AS age_days,
             o.planned_end::text AS planned_end,
             (o.planned_end IS NOT NULL AND o.planned_end < $5::date) AS planned_end_passed
      FROM open_items o
      LEFT JOIN entered en ON en.id = o.id
      ORDER BY o.item_number
      `,
      [tenantId, spec.table, [...spec.openStatuses], timeZone, today],
    )) as StageAgeSqlRow[];

    const items: StageAgeItem[] = rows.map((row) => {
      const ref = row.item_number == null ? '' : `${spec.refPrefix}-${row.item_number}`;
      const item: StageAgeItem = {
        id: row.id,
        ref,
        itemPath: `${spec.routeBase}/${ref || row.id}/summary`,
        name: row.name ?? '',
        status: row.status,
        statusSince: row.status_since,
        bucket: monthBucketOf(num(row.age_days)),
      };
      if (withPlannedEnd) {
        item.plannedEnd = row.planned_end ?? null;
        item.plannedEndPassed = row.planned_end_passed === true;
      }
      return item;
    });

    const blankRow = (status: string): StageAgeRow => {
      const row: StageAgeRow = { status, buckets: zeroMonthBuckets(), total: 0 };
      if (withPlannedEnd) row.plannedEndPassed = 0;
      return row;
    };

    // Fixed rows, in the order of the journey, even at zero: a stage nobody is sitting in is
    // itself a reading of the portfolio.
    const byStatus = new Map(spec.openStatuses.map((status) => [status, blankRow(status)]));
    const total = blankRow('total');

    for (const item of items) {
      const row = byStatus.get(item.status);
      if (!row) continue;
      row.buckets[item.bucket] += 1;
      row.total += 1;
      total.buckets[item.bucket] += 1;
      total.total += 1;
      if (withPlannedEnd && item.plannedEndPassed) {
        row.plannedEndPassed = (row.plannedEndPassed ?? 0) + 1;
        total.plannedEndPassed = (total.plannedEndPassed ?? 0) + 1;
      }
    }

    return { rows: [...byStatus.values()], total, items };
  }
}
