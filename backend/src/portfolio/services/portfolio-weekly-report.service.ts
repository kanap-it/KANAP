import { Injectable } from '@nestjs/common';
import AdmZip = require('adm-zip');
import { EntityManager } from 'typeorm';
import { neutralizeCsvFormulaValue } from '../../common/csv/csv-export.service';
import { normalizeReportTimeZone } from '../../common/report-period';

export type WeeklyReportQuery = {
  tenantId: string;
  startDate: string;
  endDate: string;
  /** IANA zone of the viewer: the period and every event day are read in it. */
  timeZone?: string;
  sourceIds?: string[];
  categoryIds?: string[];
  streamIds?: string[];
  taskTypeIds?: string[];
};

/** What changed on an item during the period, for the "modified" lists. */
export type WeeklyChangeSummary = {
  /** Status the item held before the first status move of the period. */
  statusFrom: string | null;
  /** Status the item held after the last status move of the period. */
  statusTo: string | null;
  /** Distinct column keys that actually changed, noise excluded. */
  changedFields: string[];
};

/** Where a project came from: the request it was converted from, when there is one. */
export type WeeklyProjectOrigin = {
  ref: string;
  name: string;
  itemPath: string;
};

type WeeklyRowCommon = {
  /** Business reference as the lists show it (REQ-12, PRJ-3, T-4). */
  ref: string;
  itemPath: string;
  name: string;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  /** Current status of the live row. */
  status: string;
  /** Day the item was created, whether or not that day falls in the period. */
  createdAt: string | null;
  /** Creation, last modification or closing day, depending on the list. */
  eventAt: string | null;
  /** Filled on the "modified" list only. */
  changes: WeeklyChangeSummary | null;
};

export type WeeklyProjectRow = WeeklyRowCommon & {
  projectId: string;
  priority: number | null;
  progress: number | null;
  /** The request the project was converted from, when there is one. */
  origin: WeeklyProjectOrigin | null;
  /** Raw `portfolio_projects.origin`: standard, fast_track or legacy. */
  originValue: string | null;
};

export type WeeklyTaskRow = WeeklyRowCommon & {
  taskId: string;
  taskTypeId: string | null;
  taskTypeName: string | null;
  priority: number | null;
};

export type WeeklyRequestRow = WeeklyRowCommon & {
  requestId: string;
};

export type WeeklyLists<TRow> = {
  created: TRow[];
  modified: TRow[];
  closed: TRow[];
};

export type WeeklyReportResult = {
  requests: WeeklyLists<WeeklyRequestRow>;
  projects: WeeklyLists<WeeklyProjectRow>;
  tasks: WeeklyLists<WeeklyTaskRow>;
};

export type WeeklyFilterValues = {
  sources: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  streams: Array<{ id: string; name: string; categoryId: string | null }>;
  taskTypes: Array<{ id: string; name: string }>;
};

type ServiceOpts = { manager?: EntityManager };

type ExportResult<TContent> = {
  filename: string;
  content: TContent;
};

type SheetCellValue = string | number | null;

type XlsxSheetConfig = {
  name: string;
  headers: string[];
  rows: Array<{ cells: SheetCellValue[]; linkPath: string | null }>;
};

/**
 * Statuses that count as "closed" per entity. Requests have no cancelled state:
 * a request leaves the funnel either converted into a project or rejected.
 */
const CLOSED_STATUSES = {
  requests: ['converted', 'rejected'],
  projects: ['done', 'cancelled'],
  tasks: ['done', 'cancelled'],
} as const;

/**
 * Keys ignored when listing what changed on an item. `updated_at` is rewritten on
 * every save, `status` gets its own from/to summary, and the remaining keys identify
 * the row rather than describe it.
 */
const CHANGE_NOISE_KEYS = ['updated_at', 'created_at', 'id', 'tenant_id', 'item_number', 'status'];

/**
 * KANAP vocabulary for `portfolio_projects.origin`. The exports have no i18n, so they
 * carry the English labels the UI shows for the same values.
 */
const ORIGIN_EXPORT_LABELS: Record<string, string> = {
  standard: 'Request',
  fast_track: 'Fast-track',
  legacy: 'Legacy',
};

/**
 * Column shape of an export block. The three list keys mirror the on-screen lists;
 * `all` is the single sheet the XLSX writes, where every event kind shares one table.
 */
type ExportShape = 'created' | 'modified' | 'closed' | 'all';

/** Date columns of an export block, in order. */
const dateHeaders = (shape: ExportShape): string[] => {
  if (shape === 'created') return ['Created on'];
  if (shape === 'modified') return ['Modified on'];
  if (shape === 'closed') return ['Created on', 'Closed on'];
  return ['Created on', 'Date'];
};

const dateCells = (row: WeeklyRowCommon, shape: ExportShape): SheetCellValue[] => {
  if (shape === 'created') return [row.eventAt];
  if (shape === 'modified') return [row.eventAt];
  return [row.createdAt, row.eventAt];
};

const changeHeaders = (shape: ExportShape): string[] =>
  shape === 'modified' || shape === 'all' ? ['Changes'] : [];

const changeCells = (row: WeeklyRowCommon, shape: ExportShape): SheetCellValue[] =>
  shape === 'modified' || shape === 'all' ? [formatChanges(row.changes)] : [];

const BOM = '﻿';

const xmlEscape = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Escape a CSV field. Formula neutralisation comes first: this writer hand-rolls its CSV
 * instead of going through CsvExportService, so nothing else would protect a value that a
 * spreadsheet would otherwise evaluate (a leading =, +, - or @).
 */
const csvEscape = (value: unknown): string => {
  const raw = neutralizeCsvFormulaValue(String(value ?? ''));
  if (!raw.includes(';') && !raw.includes('"') && !raw.includes('\n') && !raw.includes('\r')) {
    return raw;
  }
  return `"${raw.replace(/"/g, '""')}"`;
};

const columnNumberToName = (columnNumber: number): string => {
  let num = columnNumber;
  let name = '';
  while (num > 0) {
    const remainder = (num - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    num = Math.floor((num - 1) / 26);
  }
  return name;
};

const toNumber = (value: number | string | null): number | null => {
  if (value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const humanizeKey = (key: string): string =>
  key
    .replace(/_id$/, '')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

const humanizeStatus = (status: string): string =>
  status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Human readable "Changes" cell for the exports. */
const formatChanges = (changes: WeeklyChangeSummary | null): string => {
  if (!changes) return '';
  const parts: string[] = [];
  if (changes.statusFrom && changes.statusTo) {
    parts.push(`${humanizeStatus(changes.statusFrom)} -> ${humanizeStatus(changes.statusTo)}`);
  }
  changes.changedFields.forEach((key) => parts.push(humanizeKey(key)));
  return parts.join(', ');
};

/** Raw shape shared by the three queries, before the entity specific columns. */
type RawEventRow = {
  record_id: string;
  name: string | null;
  item_number: number | string | null;
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  status: string | null;
  live_created_day: string | null;
  created_day: string | null;
  modified_day: string | null;
  closed_day: string | null;
  update_count: number | string;
  status_from: string | null;
  status_to: string | null;
  changed_fields: string[] | null;
};

type RawProjectEventRow = RawEventRow & {
  priority: number | string | null;
  progress: number | string | null;
  origin_number: number | string | null;
  origin_name: string | null;
  origin_value: string | null;
};

type RawTaskEventRow = RawEventRow & {
  priority: number | string | null;
  task_type_id: string | null;
  task_type_name: string | null;
};

@Injectable()
export class PortfolioWeeklyReportService {
  async list(query: WeeklyReportQuery, opts?: ServiceOpts): Promise<WeeklyReportResult> {
    const requests = await this.fetchRequestLists(query, opts);
    const projects = await this.fetchProjectLists(query, opts);
    const tasks = await this.fetchTaskLists(query, opts);
    return { requests, projects, tasks };
  }

  async listFilterValues(tenantId: string, opts?: ServiceOpts): Promise<WeeklyFilterValues> {
    const mg = opts?.manager;
    if (!mg) {
      return {
        sources: [],
        categories: [],
        streams: [],
        taskTypes: [],
      };
    }

    const [sourcesRaw, categoriesRaw, streamsRaw, taskTypesRaw] = await Promise.all([
      mg.query(
        `
        SELECT id, name
        FROM portfolio_sources
        WHERE tenant_id = $1
          AND is_active = true
        ORDER BY display_order ASC, name ASC
        `,
        [tenantId],
      ),
      mg.query(
        `
        SELECT id, name
        FROM portfolio_categories
        WHERE tenant_id = $1
          AND is_active = true
        ORDER BY display_order ASC, name ASC
        `,
        [tenantId],
      ),
      mg.query(
        `
        SELECT id, name, category_id
        FROM portfolio_streams
        WHERE tenant_id = $1
          AND is_active = true
        ORDER BY display_order ASC, name ASC
        `,
        [tenantId],
      ),
      mg.query(
        `
        SELECT id, name
        FROM portfolio_task_types
        WHERE tenant_id = $1
          AND is_active = true
        ORDER BY display_order ASC, name ASC
        `,
        [tenantId],
      ),
    ]);

    return {
      sources: (sourcesRaw as Array<{ id: string; name: string }>).map((row) => ({
        id: row.id,
        name: row.name,
      })),
      categories: (categoriesRaw as Array<{ id: string; name: string }>).map((row) => ({
        id: row.id,
        name: row.name,
      })),
      streams: (streamsRaw as Array<{ id: string; name: string; category_id: string | null }>).map((row) => ({
        id: row.id,
        name: row.name,
        categoryId: row.category_id ?? null,
      })),
      taskTypes: (taskTypesRaw as Array<{ id: string; name: string }>).map((row) => ({
        id: row.id,
        name: row.name,
      })),
    };
  }

  async exportCsv(query: WeeklyReportQuery, opts?: ServiceOpts): Promise<ExportResult<string>> {
    const { requests, projects, tasks } = await this.list(query, opts);

    const lines: string[] = [];
    const addRow = (values: unknown[]) => {
      lines.push(values.map((value) => csvEscape(value)).join(';'));
    };

    const addBlock = (heading: string, headers: string[], rows: SheetCellValue[][]) => {
      if (lines.length > 0) lines.push('');
      addRow([heading]);
      addRow(headers);
      rows.forEach((cells) => addRow(cells));
    };

    (['created', 'modified', 'closed'] as const).forEach((listKey) => {
      addBlock(
        `Requests ${listKey}`,
        this.requestHeaders(listKey),
        requests[listKey].map((row) => this.requestCells(row, listKey)),
      );
    });

    (['created', 'modified', 'closed'] as const).forEach((listKey) => {
      addBlock(
        `Projects ${listKey}`,
        this.projectHeaders(listKey),
        projects[listKey].map((row) => this.projectCells(row, listKey)),
      );
    });

    (['created', 'modified', 'closed'] as const).forEach((listKey) => {
      addBlock(
        `Tasks ${listKey}`,
        this.taskHeaders(listKey),
        tasks[listKey].map((row) => this.taskCells(row, listKey)),
      );
    });

    return {
      filename: this.buildFilename(query, 'csv'),
      content: BOM + lines.join('\n'),
    };
  }

  async exportXlsx(
    query: WeeklyReportQuery,
    appBaseUrl: string | null,
    opts?: ServiceOpts,
  ): Promise<ExportResult<Buffer>> {
    const { requests, projects, tasks } = await this.list(query, opts);

    const eventLabel = { created: 'Created', modified: 'Modified', closed: 'Closed' } as const;
    const listKeys = ['created', 'modified', 'closed'] as const;

    const content = this.buildXlsx(
      [
        {
          name: 'Requests',
          headers: ['Event', ...this.requestHeaders('all')],
          rows: listKeys.flatMap((listKey) =>
            requests[listKey].map((row) => ({
              cells: [eventLabel[listKey], ...this.requestCells(row, 'all')] as SheetCellValue[],
              linkPath: row.itemPath,
            })),
          ),
        },
        {
          name: 'Projects',
          headers: ['Event', ...this.projectHeaders('all')],
          rows: listKeys.flatMap((listKey) =>
            projects[listKey].map((row) => ({
              cells: [eventLabel[listKey], ...this.projectCells(row, 'all')] as SheetCellValue[],
              linkPath: row.itemPath,
            })),
          ),
        },
        {
          name: 'Tasks',
          headers: ['Event', ...this.taskHeaders('all')],
          rows: listKeys.flatMap((listKey) =>
            tasks[listKey].map((row) => ({
              cells: [eventLabel[listKey], ...this.taskCells(row, 'all')] as SheetCellValue[],
              linkPath: row.itemPath,
            })),
          ),
        },
      ],
      appBaseUrl,
    );

    return {
      filename: this.buildFilename(query, 'xlsx'),
      content,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Export cell shapes                                              */
  /* ---------------------------------------------------------------- */

  private requestHeaders(shape: ExportShape): string[] {
    return [
      'Reference',
      'Request name',
      'Source',
      'Category',
      'Stream',
      'Status',
      ...dateHeaders(shape),
      ...changeHeaders(shape),
    ];
  }

  private requestCells(row: WeeklyRequestRow, shape: ExportShape): SheetCellValue[] {
    return [
      row.ref,
      row.name,
      row.sourceName,
      row.categoryName,
      row.streamName,
      row.status,
      ...dateCells(row, shape),
      ...changeCells(row, shape),
    ];
  }

  private projectHeaders(shape: ExportShape): string[] {
    return [
      'Reference',
      'Project name',
      'Origin',
      'Priority',
      'Source',
      'Category',
      'Stream',
      'Effort',
      'Status',
      ...dateHeaders(shape),
      ...changeHeaders(shape),
    ];
  }

  private projectCells(row: WeeklyProjectRow, shape: ExportShape): SheetCellValue[] {
    return [
      row.ref,
      row.name,
      this.projectOriginLabel(row),
      row.priority,
      row.sourceName,
      row.categoryName,
      row.streamName,
      row.progress == null ? null : `${Math.round(row.progress)}%`,
      row.status,
      ...dateCells(row, shape),
      ...changeCells(row, shape),
    ];
  }

  /** The request a project came from, or the KANAP label of its own origin value. */
  private projectOriginLabel(row: WeeklyProjectRow): string {
    if (row.origin) return `${row.origin.ref} ${row.origin.name}`.trim();
    if (!row.originValue) return '';
    return ORIGIN_EXPORT_LABELS[row.originValue] ?? humanizeStatus(row.originValue);
  }

  private taskHeaders(shape: ExportShape): string[] {
    return [
      'Reference',
      'Task name',
      'Task type',
      'Priority',
      'Source',
      'Category',
      'Stream',
      'Status',
      ...dateHeaders(shape),
      ...changeHeaders(shape),
    ];
  }

  private taskCells(row: WeeklyTaskRow, shape: ExportShape): SheetCellValue[] {
    return [
      row.ref,
      row.name,
      row.taskTypeName,
      row.priority,
      row.sourceName,
      row.categoryName,
      row.streamName,
      row.status,
      ...dateCells(row, shape),
      ...changeCells(row, shape),
    ];
  }

  /* ---------------------------------------------------------------- */
  /*  Queries                                                         */
  /* ---------------------------------------------------------------- */

  /**
   * Audit CTEs shared by the three entity queries. Parameters are fixed:
   * $1 tenant, $2 start day, $3 end day, $4 time zone, $5 closed statuses, $6 noise keys.
   *
   * An item counts as closed when the last status event of the period leaves it in a
   * closed status. The creation event counts: a CSV import or an agent can create a task
   * already done or a request already rejected, and such an item never gets an update to
   * detect. Reading the last event also keeps an item reopened later out of the list.
   */
  private eventCtes(auditTable: string): string {
    return `
      period_events AS (
        SELECT al.record_id, al.action, al.before_json, al.after_json, al.created_at, al.id
        FROM audit_log al
        WHERE al.tenant_id = $1
          AND al.table_name = '${auditTable}'
          AND al.record_id IS NOT NULL
          AND al.action IN ('create', 'update')
          AND al.created_at >= ($2::date::timestamp AT TIME ZONE $4)
          AND al.created_at < (($3::date + 1)::timestamp AT TIME ZONE $4)
      ),
      status_moves AS (
        SELECT
          pe.record_id,
          pe.created_at,
          pe.id,
          pe.before_json->>'status' AS before_status,
          pe.after_json->>'status' AS after_status
        FROM period_events pe
        WHERE pe.action = 'update'
          AND pe.before_json->>'status' IS DISTINCT FROM pe.after_json->>'status'
      ),
      status_events AS (
        SELECT pe.record_id, pe.created_at, pe.id, pe.after_json->>'status' AS after_status
        FROM period_events pe
        WHERE pe.action = 'create'
           OR pe.before_json->>'status' IS DISTINCT FROM pe.after_json->>'status'
      ),
      status_event_last AS (
        SELECT DISTINCT ON (se.record_id) se.record_id, se.created_at, se.after_status
        FROM status_events se
        ORDER BY se.record_id, se.created_at DESC, se.id DESC
      ),
      closing AS (
        SELECT sel.record_id, sel.created_at AS closed_at
        FROM status_event_last sel
        WHERE sel.after_status = ANY($5::text[])
      ),
      status_first AS (
        SELECT DISTINCT ON (sm.record_id) sm.record_id, sm.before_status
        FROM status_moves sm
        ORDER BY sm.record_id, sm.created_at ASC, sm.id ASC
      ),
      status_last AS (
        SELECT DISTINCT ON (sm.record_id) sm.record_id, sm.after_status
        FROM status_moves sm
        ORDER BY sm.record_id, sm.created_at DESC, sm.id DESC
      ),
      changed_keys AS (
        SELECT DISTINCT pe.record_id, keys.k
        FROM period_events pe
        CROSS JOIN LATERAL (
          SELECT jsonb_object_keys(COALESCE(pe.before_json, '{}'::jsonb)) AS k
          UNION
          SELECT jsonb_object_keys(COALESCE(pe.after_json, '{}'::jsonb))
        ) keys
        WHERE pe.action = 'update'
          AND (pe.before_json -> keys.k) IS DISTINCT FROM (pe.after_json -> keys.k)
          AND NOT (keys.k = ANY($6::text[]))
      ),
      changed_keys_agg AS (
        SELECT ck.record_id, array_agg(ck.k ORDER BY ck.k) AS changed_fields
        FROM changed_keys ck
        GROUP BY ck.record_id
      ),
      agg AS (
        SELECT
          pe.record_id,
          MIN(pe.created_at) FILTER (WHERE pe.action = 'create') AS created_at,
          MAX(pe.created_at) FILTER (WHERE pe.action = 'update') AS modified_at,
          COUNT(*) FILTER (WHERE pe.action = 'update') AS update_count
        FROM period_events pe
        GROUP BY pe.record_id
      )
    `;
  }

  /** The event columns every entity query selects, given the live-row alias. */
  private eventColumns(): string {
    return `
      (a.created_at AT TIME ZONE $4)::date::text AS created_day,
      (a.modified_at AT TIME ZONE $4)::date::text AS modified_day,
      (c.closed_at AT TIME ZONE $4)::date::text AS closed_day,
      a.update_count,
      sf.before_status AS status_from,
      sl.after_status AS status_to,
      COALESCE(cka.changed_fields, ARRAY[]::text[]) AS changed_fields
    `;
  }

  private eventJoins(): string {
    return `
      LEFT JOIN closing c ON c.record_id = a.record_id
      LEFT JOIN status_first sf ON sf.record_id = a.record_id
      LEFT JOIN status_last sl ON sl.record_id = a.record_id
      LEFT JOIN changed_keys_agg cka ON cka.record_id = a.record_id
    `;
  }

  private baseParams(query: WeeklyReportQuery, closedStatuses: readonly string[]): any[] {
    return [
      query.tenantId,
      query.startDate,
      query.endDate,
      normalizeReportTimeZone(query.timeZone),
      [...closedStatuses],
      CHANGE_NOISE_KEYS,
    ];
  }

  private async fetchRequestLists(
    query: WeeklyReportQuery,
    opts?: ServiceOpts,
  ): Promise<WeeklyLists<WeeklyRequestRow>> {
    const mg = opts?.manager;
    if (!mg) return { created: [], modified: [], closed: [] };

    const sqlParams = this.baseParams(query, CLOSED_STATUSES.requests);
    const whereSql = this.buildFilterSql(sqlParams, 'r', query, { taskTypes: false });

    const rows: RawEventRow[] = await mg.query(
      `
      WITH ${this.eventCtes('portfolio_requests')}
      SELECT
        r.id AS record_id,
        r.name,
        r.item_number,
        r.source_id,
        ps.name AS source_name,
        r.category_id,
        pc.name AS category_name,
        r.stream_id,
        pst.name AS stream_name,
        r.status,
        (r.created_at AT TIME ZONE $4)::date::text AS live_created_day,
        ${this.eventColumns()}
      FROM agg a
      JOIN portfolio_requests r ON r.id = a.record_id AND r.tenant_id = $1
      ${this.eventJoins()}
      LEFT JOIN portfolio_sources ps ON ps.id = r.source_id AND ps.tenant_id = r.tenant_id
      LEFT JOIN portfolio_categories pc ON pc.id = r.category_id AND pc.tenant_id = r.tenant_id
      LEFT JOIN portfolio_streams pst ON pst.id = r.stream_id AND pst.tenant_id = r.tenant_id
      ${whereSql}
      ORDER BY r.priority_score DESC NULLS LAST, r.name ASC
      `,
      sqlParams,
    );

    return this.bucket(rows, (row, listKey) => ({
      requestId: row.record_id,
      ...this.commonFields(row, listKey, 'REQ', '/portfolio/requests', 'summary'),
    }));
  }

  private async fetchProjectLists(
    query: WeeklyReportQuery,
    opts?: ServiceOpts,
  ): Promise<WeeklyLists<WeeklyProjectRow>> {
    const mg = opts?.manager;
    if (!mg) return { created: [], modified: [], closed: [] };

    const sqlParams = this.baseParams(query, CLOSED_STATUSES.projects);
    const whereSql = this.buildFilterSql(sqlParams, 'p', query, { taskTypes: false });

    const rows: RawProjectEventRow[] = await mg.query(
      `
      WITH ${this.eventCtes('portfolio_projects')}
      SELECT
        p.id AS record_id,
        p.name,
        p.item_number,
        p.priority_score::numeric AS priority,
        p.source_id,
        ps.name AS source_name,
        p.category_id,
        pc.name AS category_name,
        p.stream_id,
        pst.name AS stream_name,
        p.execution_progress::numeric AS progress,
        p.status,
        og.origin_number,
        og.origin_name,
        p.origin AS origin_value,
        (p.created_at AT TIME ZONE $4)::date::text AS live_created_day,
        ${this.eventColumns()}
      FROM agg a
      JOIN portfolio_projects p ON p.id = a.record_id AND p.tenant_id = $1
      ${this.eventJoins()}
      LEFT JOIN portfolio_sources ps ON ps.id = p.source_id AND ps.tenant_id = p.tenant_id
      LEFT JOIN portfolio_categories pc ON pc.id = p.category_id AND pc.tenant_id = p.tenant_id
      LEFT JOIN portfolio_streams pst ON pst.id = p.stream_id AND pst.tenant_id = p.tenant_id
      LEFT JOIN LATERAL (
        SELECT req.item_number AS origin_number, req.name AS origin_name
        FROM portfolio_request_projects rp
        JOIN portfolio_requests req ON req.id = rp.request_id AND req.tenant_id = $1
        WHERE rp.project_id = p.id AND rp.tenant_id = $1
        ORDER BY rp.created_at ASC
        LIMIT 1
      ) og ON TRUE
      ${whereSql}
      ORDER BY p.priority_score DESC NULLS LAST, p.name ASC
      `,
      sqlParams,
    );

    return this.bucket(rows, (row, listKey) => ({
      projectId: row.record_id,
      ...this.commonFields(row, listKey, 'PRJ', '/portfolio/projects', 'summary'),
      priority: toNumber(row.priority),
      progress: toNumber(row.progress),
      origin:
        row.origin_number == null
          ? null
          : {
              ref: `REQ-${row.origin_number}`,
              name: row.origin_name ?? '',
              itemPath: `/portfolio/requests/REQ-${row.origin_number}/summary`,
            },
      originValue: row.origin_value ?? null,
    }));
  }

  private async fetchTaskLists(
    query: WeeklyReportQuery,
    opts?: ServiceOpts,
  ): Promise<WeeklyLists<WeeklyTaskRow>> {
    const mg = opts?.manager;
    if (!mg) return { created: [], modified: [], closed: [] };

    const sqlParams = this.baseParams(query, CLOSED_STATUSES.tasks);
    const whereSql = this.buildFilterSql(sqlParams, 't', query, { taskTypes: true }, [
      `(t.related_object_type IS NULL OR t.related_object_type = 'project')`,
    ]);

    const rows: RawTaskEventRow[] = await mg.query(
      `
      WITH ${this.eventCtes('tasks')}
      SELECT
        t.id AS record_id,
        t.title AS name,
        t.item_number,
        pt.id AS task_type_id,
        pt.name AS task_type_name,
        CASE t.priority_level
          WHEN 'blocker' THEN 110
          WHEN 'high' THEN 90
          WHEN 'normal' THEN 70
          WHEN 'low' THEN 50
          WHEN 'optional' THEN 30
          ELSE NULL
        END::numeric AS priority,
        t.source_id,
        ps.name AS source_name,
        t.category_id,
        pc.name AS category_name,
        t.stream_id,
        pst.name AS stream_name,
        t.status,
        (t.created_at AT TIME ZONE $4)::date::text AS live_created_day,
        ${this.eventColumns()}
      FROM agg a
      JOIN tasks t ON t.id = a.record_id AND t.tenant_id = $1
      ${this.eventJoins()}
      LEFT JOIN portfolio_task_types pt ON pt.id = t.task_type_id AND pt.tenant_id = t.tenant_id
      LEFT JOIN portfolio_sources ps ON ps.id = t.source_id AND ps.tenant_id = t.tenant_id
      LEFT JOIN portfolio_categories pc ON pc.id = t.category_id AND pc.tenant_id = t.tenant_id
      LEFT JOIN portfolio_streams pst ON pst.id = t.stream_id AND pst.tenant_id = t.tenant_id
      ${whereSql}
      ORDER BY priority DESC NULLS LAST, t.title ASC
      `,
      sqlParams,
    );

    return this.bucket(rows, (row, listKey) => ({
      taskId: row.record_id,
      ...this.commonFields(row, listKey, 'T', '/portfolio/tasks', 'overview'),
      taskTypeId: row.task_type_id ?? null,
      taskTypeName: row.task_type_name ?? null,
      priority: toNumber(row.priority),
    }));
  }

  /* ---------------------------------------------------------------- */
  /*  Row shaping                                                     */
  /* ---------------------------------------------------------------- */

  private commonFields(
    row: RawEventRow,
    listKey: 'created' | 'modified' | 'closed',
    prefix: string,
    routeBase: string,
    tab: string,
  ): WeeklyRowCommon {
    const ref = row.item_number == null ? '' : `${prefix}-${row.item_number}`;
    const eventAt =
      listKey === 'created' ? row.created_day : listKey === 'closed' ? row.closed_day : row.modified_day;

    return {
      ref,
      itemPath: `${routeBase}/${ref || row.record_id}/${tab}`,
      name: row.name ?? '',
      sourceId: row.source_id ?? null,
      sourceName: row.source_name ?? null,
      categoryId: row.category_id ?? null,
      categoryName: row.category_name ?? null,
      streamId: row.stream_id ?? null,
      streamName: row.stream_name ?? null,
      status: row.status ?? '',
      createdAt: row.live_created_day,
      eventAt,
      changes:
        listKey === 'modified'
          ? {
              statusFrom: row.status_from ?? null,
              statusTo: row.status_to ?? null,
              changedFields: row.changed_fields ?? [],
            }
          : null,
    };
  }

  /**
   * Split the queried rows into the three lists. An item created and closed inside the
   * same period appears in both, and never in modified: modified is what is left.
   */
  private bucket<TRaw extends RawEventRow, TRow>(
    rows: TRaw[],
    build: (row: TRaw, listKey: 'created' | 'modified' | 'closed') => TRow,
  ): WeeklyLists<TRow> {
    const lists: WeeklyLists<TRow> = { created: [], modified: [], closed: [] };

    rows.forEach((row) => {
      const isCreated = Boolean(row.created_day);
      const isClosed = Boolean(row.closed_day);
      if (isCreated) lists.created.push(build(row, 'created'));
      if (isClosed) lists.closed.push(build(row, 'closed'));
      if (!isCreated && !isClosed && Number(row.update_count) > 0) {
        lists.modified.push(build(row, 'modified'));
      }
    });

    return lists;
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  private buildFilterSql(
    sqlParams: any[],
    alias: string,
    query: WeeklyReportQuery,
    opts: { taskTypes: boolean },
    extraFilters: string[] = [],
  ): string {
    const filters = [...extraFilters];

    const push = (values: string[] | undefined, column: string) => {
      const normalized = this.normalizeStringArray(values);
      if (normalized.length === 0) return;
      sqlParams.push(normalized);
      filters.push(`${alias}.${column}::text = ANY($${sqlParams.length}::text[])`);
    };

    if (opts.taskTypes) push(query.taskTypeIds, 'task_type_id');
    push(query.sourceIds, 'source_id');
    push(query.categoryIds, 'category_id');
    push(query.streamIds, 'stream_id');

    return filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  }

  private normalizeStringArray(values?: string[]): string[] {
    if (!values) return [];
    const normalized = values
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);
    return Array.from(new Set(normalized));
  }

  private buildFilename(query: WeeklyReportQuery, ext: 'csv' | 'xlsx'): string {
    return `weekly-report-${query.startDate}_to_${query.endDate}.${ext}`;
  }

  private buildXlsx(sheets: XlsxSheetConfig[], appBaseUrl: string | null): Buffer {
    const normalizedBase = String(appBaseUrl || '').trim().replace(/\/$/, '');

    const sheetXmlByIndex = new Map<number, string>();
    const sheetRelsXmlByIndex = new Map<number, string>();

    sheets.forEach((sheet, sheetIndexZeroBased) => {
      const sheetIndex = sheetIndexZeroBased + 1;
      const sheetRows: string[] = [];
      const hyperlinks: string[] = [];
      const hyperlinkRels: string[] = [];
      let hyperlinkIndex = 0;

      const buildInlineStringCell = (cellRef: string, value: string) =>
        `<c r="${cellRef}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;

      const buildNumberCell = (cellRef: string, value: number) => `<c r="${cellRef}"><v>${value}</v></c>`;

      const addCell = (cells: string[], rowNumber: number, columnNumber: number, value: SheetCellValue) => {
        if (value === null || value === undefined || value === '') return;
        const cellRef = `${columnNumberToName(columnNumber)}${rowNumber}`;
        if (typeof value === 'number' && Number.isFinite(value)) {
          cells.push(buildNumberCell(cellRef, value));
          return;
        }
        cells.push(buildInlineStringCell(cellRef, String(value)));
      };

      const headerCells: string[] = [];
      sheet.headers.forEach((header, headerIndex) => {
        addCell(headerCells, 1, headerIndex + 1, header);
      });
      sheetRows.push(`<row r="1">${headerCells.join('')}</row>`);

      sheet.rows.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 2;
        const cells: string[] = [];

        row.cells.forEach((cellValue, cellIndex) => {
          addCell(cells, rowNumber, cellIndex + 1, cellValue);
        });

        const target = row.linkPath
          ? (normalizedBase ? `${normalizedBase}${row.linkPath}` : row.linkPath)
          : '';
        if (target) {
          hyperlinkIndex += 1;
          const relId = `rId${hyperlinkIndex}`;
          const nameCellRef = `B${rowNumber}`;
          hyperlinks.push(`<hyperlink ref="${nameCellRef}" r:id="${relId}"/>`);
          hyperlinkRels.push(
            `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xmlEscape(target)}" TargetMode="External"/>`,
          );
        }

        sheetRows.push(`<row r="${rowNumber}">${cells.join('')}</row>`);
      });

      const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>
    ${sheetRows.join('\n    ')}
  </sheetData>
  ${hyperlinks.length > 0 ? `<hyperlinks>${hyperlinks.join('')}</hyperlinks>` : ''}
</worksheet>`;

      sheetXmlByIndex.set(sheetIndex, sheetXml);

      if (hyperlinkRels.length > 0) {
        const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${hyperlinkRels.join('\n  ')}
</Relationships>`;
        sheetRelsXmlByIndex.set(sheetIndex, relsXml);
      }
    });

    const sheetOverrides = sheets
      .map(
        (_, sheetIndexZeroBased) =>
          `<Override PartName="/xl/worksheets/sheet${sheetIndexZeroBased + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('\n  ');

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetOverrides}
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbookSheetsXml = sheets
      .map(
        (sheet, sheetIndexZeroBased) =>
          `<sheet name="${xmlEscape(sheet.name)}" sheetId="${sheetIndexZeroBased + 1}" r:id="rId${sheetIndexZeroBased + 1}"/>`,
      )
      .join('\n    ');

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${workbookSheetsXml}
  </sheets>
</workbook>`;

    const workbookRelationshipsXml = sheets
      .map(
        (_, sheetIndexZeroBased) =>
          `<Relationship Id="rId${sheetIndexZeroBased + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetIndexZeroBased + 1}.xml"/>`,
      )
      .join('\n  ');

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRelationshipsXml}
</Relationships>`;

    const zip = new AdmZip();
    zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml, 'utf8'));
    zip.addFile('_rels/.rels', Buffer.from(rootRelsXml, 'utf8'));
    zip.addFile('xl/workbook.xml', Buffer.from(workbookXml, 'utf8'));
    zip.addFile('xl/_rels/workbook.xml.rels', Buffer.from(workbookRelsXml, 'utf8'));

    sheetXmlByIndex.forEach((sheetXml, sheetIndex) => {
      zip.addFile(`xl/worksheets/sheet${sheetIndex}.xml`, Buffer.from(sheetXml, 'utf8'));
    });

    sheetRelsXmlByIndex.forEach((sheetRelsXml, sheetIndex) => {
      zip.addFile(`xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`, Buffer.from(sheetRelsXml, 'utf8'));
    });

    return zip.toBuffer();
  }
}
