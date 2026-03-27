import { Injectable } from '@nestjs/common';
import AdmZip = require('adm-zip');
import { EntityManager } from 'typeorm';

export type WeeklyReportQuery = {
  tenantId: string;
  startDate: string;
  endDate: string;
  sourceIds?: string[];
  categoryIds?: string[];
  streamIds?: string[];
  taskTypeIds?: string[];
};

export type WeeklyProjectRow = {
  projectId: string;
  itemPath: string;
  name: string;
  priority: number | null;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  progress: number | null;
  status: string;
  lastChangedAt: string | null;
};

export type WeeklyTaskRow = {
  taskId: string;
  itemPath: string;
  name: string;
  taskTypeId: string | null;
  taskTypeName: string | null;
  priority: number | null;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  status: string;
  lastChangedAt: string | null;
};

export type WeeklyRequestRow = {
  requestId: string;
  itemPath: string;
  name: string;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  status: string;
  lastChangedAt: string | null;
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

type RawProjectRow = {
  project_id: string;
  name: string;
  priority: number | string | null;
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  progress: number | string | null;
  status: string | null;
  last_changed_at: string | Date | null;
};

type RawTaskRow = {
  task_id: string;
  name: string;
  task_type_id: string | null;
  task_type_name: string | null;
  priority: number | string | null;
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  status: string | null;
  last_changed_at: string | Date | null;
};

type RawRequestRow = {
  request_id: string;
  name: string;
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  status: string | null;
  last_changed_at: string | Date | null;
};

type SheetCellValue = string | number | null;

type XlsxSheetConfig = {
  name: string;
  headers: string[];
  rows: Array<{ cells: SheetCellValue[]; linkPath: string | null }>;
};

const BOM = '\uFEFF';

const xmlEscape = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const csvEscape = (value: unknown): string => {
  const raw = String(value ?? '');
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

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null;
  const raw = value instanceof Date ? value.toISOString() : String(value);
  return raw.slice(0, 10);
};

const toNumber = (value: number | string | null): number | null => {
  if (value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

@Injectable()
export class PortfolioWeeklyReportService {
  async list(
    query: WeeklyReportQuery,
    opts?: ServiceOpts,
  ): Promise<{ projects: WeeklyProjectRow[]; tasks: WeeklyTaskRow[]; requests: WeeklyRequestRow[] }> {
    const projects = await this.fetchProjectRows(query, opts);
    const tasks = await this.fetchTaskRows(query, opts);
    const requests = await this.fetchRequestRows(query, opts);
    return { projects, tasks, requests };
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

  async exportCsv(
    query: WeeklyReportQuery,
    opts?: ServiceOpts,
  ): Promise<ExportResult<string>> {
    const { projects, tasks, requests } = await this.list(query, opts);

    const lines: string[] = [];

    const addRow = (values: unknown[]) => {
      lines.push(values.map((value) => csvEscape(value)).join(';'));
    };

    addRow(['Project Updates']);
    addRow(['Project Name', 'Priority', 'Source', 'Category', 'Stream', 'Effort', 'Status', 'Last Changed']);
    projects.forEach((row) => {
      addRow([
        row.name,
        row.priority ?? '',
        row.sourceName ?? '',
        row.categoryName ?? '',
        row.streamName ?? '',
        row.progress == null ? '' : `${Math.round(row.progress)}%`,
        row.status,
        row.lastChangedAt ?? '',
      ]);
    });

    lines.push('');

    addRow(['Closed Tasks']);
    addRow(['Task Name', 'Task Type', 'Priority', 'Source', 'Category', 'Stream', 'Status', 'Last Changed']);
    tasks.forEach((row) => {
      addRow([
        row.name,
        row.taskTypeName ?? '',
        row.priority ?? '',
        row.sourceName ?? '',
        row.categoryName ?? '',
        row.streamName ?? '',
        row.status,
        row.lastChangedAt ?? '',
      ]);
    });

    lines.push('');

    addRow(['Request Updates']);
    addRow(['Request Name', 'Source', 'Category', 'Stream', 'Status', 'Last Changed']);
    requests.forEach((row) => {
      addRow([
        row.name,
        row.sourceName ?? '',
        row.categoryName ?? '',
        row.streamName ?? '',
        row.status,
        row.lastChangedAt ?? '',
      ]);
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
    const { projects, tasks, requests } = await this.list(query, opts);

    const content = this.buildXlsx(
      [
        {
          name: 'Projects',
          headers: ['Project Name', 'Priority', 'Source', 'Category', 'Stream', 'Effort', 'Status', 'Last Changed'],
          rows: projects.map((row) => ({
            cells: [
              row.name,
              row.priority,
              row.sourceName,
              row.categoryName,
              row.streamName,
              row.progress == null ? null : `${Math.round(row.progress)}%`,
              row.status,
              row.lastChangedAt,
            ],
            linkPath: row.itemPath,
          })),
        },
        {
          name: 'Tasks',
          headers: ['Task Name', 'Task Type', 'Priority', 'Source', 'Category', 'Stream', 'Status', 'Last Changed'],
          rows: tasks.map((row) => ({
            cells: [
              row.name,
              row.taskTypeName,
              row.priority,
              row.sourceName,
              row.categoryName,
              row.streamName,
              row.status,
              row.lastChangedAt,
            ],
            linkPath: row.itemPath,
          })),
        },
        {
          name: 'Requests',
          headers: ['Request Name', 'Source', 'Category', 'Stream', 'Status', 'Last Changed'],
          rows: requests.map((row) => ({
            cells: [row.name, row.sourceName, row.categoryName, row.streamName, row.status, row.lastChangedAt],
            linkPath: row.itemPath,
          })),
        },
      ],
      appBaseUrl,
    );

    return {
      filename: this.buildFilename(query, 'xlsx'),
      content,
    };
  }

  private async fetchProjectRows(
    query: WeeklyReportQuery,
    opts?: ServiceOpts,
  ): Promise<WeeklyProjectRow[]> {
    const mg = opts?.manager;
    if (!mg) return [];

    const sourceIds = this.normalizeStringArray(query.sourceIds);
    const categoryIds = this.normalizeStringArray(query.categoryIds);
    const streamIds = this.normalizeStringArray(query.streamIds);

    const sqlParams: any[] = [query.tenantId, query.startDate, query.endDate];
    const filters: string[] = [];

    if (sourceIds.length > 0) {
      sqlParams.push(sourceIds);
      filters.push(`p.source_id::text = ANY($${sqlParams.length}::text[])`);
    }
    if (categoryIds.length > 0) {
      sqlParams.push(categoryIds);
      filters.push(`p.category_id::text = ANY($${sqlParams.length}::text[])`);
    }
    if (streamIds.length > 0) {
      sqlParams.push(streamIds);
      filters.push(`p.stream_id::text = ANY($${sqlParams.length}::text[])`);
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await mg.query(
      `
      WITH project_events AS (
        SELECT
          al.record_id AS project_id,
          al.after_json->>'status' AS status,
          al.created_at,
          al.id
        FROM audit_log al
        WHERE al.tenant_id = $1
          AND al.table_name = 'portfolio_projects'
          AND al.record_id IS NOT NULL
          AND al.created_at >= $2::date
          AND al.created_at < ($3::date + INTERVAL '1 day')
          AND (
            (
              al.action = 'update'
              AND al.before_json->>'status' IS NOT NULL
              AND al.after_json->>'status' IS NOT NULL
              AND al.before_json->>'status' IS DISTINCT FROM al.after_json->>'status'
            )
            OR al.action = 'create'
          )
      ),
      latest_events AS (
        SELECT e.project_id, e.status, e.created_at AS last_changed_at
        FROM (
          SELECT
            pe.*,
            ROW_NUMBER() OVER (
              PARTITION BY pe.project_id
              ORDER BY pe.created_at DESC, pe.id DESC
            ) AS rn
          FROM project_events pe
        ) e
        WHERE e.rn = 1
      )
      SELECT
        p.id AS project_id,
        p.name,
        p.priority_score::numeric AS priority,
        p.source_id,
        ps.name AS source_name,
        p.category_id,
        pc.name AS category_name,
        p.stream_id,
        pst.name AS stream_name,
        p.execution_progress::numeric AS progress,
        COALESCE(le.status, p.status) AS status,
        le.last_changed_at
      FROM latest_events le
      JOIN portfolio_projects p ON p.id = le.project_id AND p.tenant_id = $1
      LEFT JOIN portfolio_sources ps ON ps.id = p.source_id AND ps.tenant_id = p.tenant_id
      LEFT JOIN portfolio_categories pc ON pc.id = p.category_id AND pc.tenant_id = p.tenant_id
      LEFT JOIN portfolio_streams pst ON pst.id = p.stream_id AND pst.tenant_id = p.tenant_id
      ${whereSql}
      ORDER BY p.priority_score DESC NULLS LAST, p.name ASC
      `,
      sqlParams,
    );

    return (rows as RawProjectRow[]).map((row) => ({
      projectId: row.project_id,
      itemPath: `/portfolio/projects/${row.project_id}/overview`,
      name: row.name ?? '',
      priority: toNumber(row.priority),
      sourceId: row.source_id ?? null,
      sourceName: row.source_name ?? null,
      categoryId: row.category_id ?? null,
      categoryName: row.category_name ?? null,
      streamId: row.stream_id ?? null,
      streamName: row.stream_name ?? null,
      progress: toNumber(row.progress),
      status: row.status ?? '',
      lastChangedAt: toIsoDate(row.last_changed_at),
    }));
  }

  private async fetchTaskRows(
    query: WeeklyReportQuery,
    opts?: ServiceOpts,
  ): Promise<WeeklyTaskRow[]> {
    const mg = opts?.manager;
    if (!mg) return [];

    const sourceIds = this.normalizeStringArray(query.sourceIds);
    const categoryIds = this.normalizeStringArray(query.categoryIds);
    const streamIds = this.normalizeStringArray(query.streamIds);
    const taskTypeIds = this.normalizeStringArray(query.taskTypeIds);

    const sqlParams: any[] = [query.tenantId, query.startDate, query.endDate];
    const filters: string[] = [];

    if (taskTypeIds.length > 0) {
      sqlParams.push(taskTypeIds);
      filters.push(`t.task_type_id::text = ANY($${sqlParams.length}::text[])`);
    }
    if (sourceIds.length > 0) {
      sqlParams.push(sourceIds);
      filters.push(`t.source_id::text = ANY($${sqlParams.length}::text[])`);
    }
    if (categoryIds.length > 0) {
      sqlParams.push(categoryIds);
      filters.push(`t.category_id::text = ANY($${sqlParams.length}::text[])`);
    }
    if (streamIds.length > 0) {
      sqlParams.push(streamIds);
      filters.push(`t.stream_id::text = ANY($${sqlParams.length}::text[])`);
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await mg.query(
      `
      WITH task_events AS (
        SELECT
          al.record_id AS task_id,
          al.after_json->>'status' AS status,
          al.created_at,
          al.id
        FROM audit_log al
        WHERE al.tenant_id = $1
          AND al.table_name = 'tasks'
          AND al.action = 'update'
          AND al.record_id IS NOT NULL
          AND al.after_json->>'status' IN ('done', 'cancelled')
          AND al.before_json->>'status' IS NOT NULL
          AND al.after_json->>'status' IS NOT NULL
          AND al.before_json->>'status' IS DISTINCT FROM al.after_json->>'status'
          AND al.created_at >= $2::date
          AND al.created_at < ($3::date + INTERVAL '1 day')
      ),
      latest_events AS (
        SELECT e.task_id, e.status, e.created_at AS last_changed_at
        FROM (
          SELECT
            te.*,
            ROW_NUMBER() OVER (
              PARTITION BY te.task_id
              ORDER BY te.created_at DESC, te.id DESC
            ) AS rn
          FROM task_events te
        ) e
        WHERE e.rn = 1
      )
      SELECT
        t.id AS task_id,
        t.title AS name,
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
        le.status,
        le.last_changed_at
      FROM latest_events le
      JOIN tasks t ON t.id = le.task_id AND t.tenant_id = $1
      LEFT JOIN portfolio_task_types pt ON pt.id = t.task_type_id AND pt.tenant_id = t.tenant_id
      LEFT JOIN portfolio_sources ps ON ps.id = t.source_id AND ps.tenant_id = t.tenant_id
      LEFT JOIN portfolio_categories pc ON pc.id = t.category_id AND pc.tenant_id = t.tenant_id
      LEFT JOIN portfolio_streams pst ON pst.id = t.stream_id AND pst.tenant_id = t.tenant_id
      ${whereSql}
      ORDER BY priority DESC NULLS LAST, t.title ASC
      `,
      sqlParams,
    );

    return (rows as RawTaskRow[]).map((row) => ({
      taskId: row.task_id,
      itemPath: `/portfolio/tasks/${row.task_id}/overview`,
      name: row.name ?? '',
      taskTypeId: row.task_type_id ?? null,
      taskTypeName: row.task_type_name ?? null,
      priority: toNumber(row.priority),
      sourceId: row.source_id ?? null,
      sourceName: row.source_name ?? null,
      categoryId: row.category_id ?? null,
      categoryName: row.category_name ?? null,
      streamId: row.stream_id ?? null,
      streamName: row.stream_name ?? null,
      status: row.status ?? '',
      lastChangedAt: toIsoDate(row.last_changed_at),
    }));
  }

  private async fetchRequestRows(
    query: WeeklyReportQuery,
    opts?: ServiceOpts,
  ): Promise<WeeklyRequestRow[]> {
    const mg = opts?.manager;
    if (!mg) return [];

    const sourceIds = this.normalizeStringArray(query.sourceIds);
    const categoryIds = this.normalizeStringArray(query.categoryIds);
    const streamIds = this.normalizeStringArray(query.streamIds);

    const sqlParams: any[] = [query.tenantId, query.startDate, query.endDate];
    const filters: string[] = [];

    if (sourceIds.length > 0) {
      sqlParams.push(sourceIds);
      filters.push(`r.source_id::text = ANY($${sqlParams.length}::text[])`);
    }
    if (categoryIds.length > 0) {
      sqlParams.push(categoryIds);
      filters.push(`r.category_id::text = ANY($${sqlParams.length}::text[])`);
    }
    if (streamIds.length > 0) {
      sqlParams.push(streamIds);
      filters.push(`r.stream_id::text = ANY($${sqlParams.length}::text[])`);
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await mg.query(
      `
      WITH request_events AS (
        SELECT
          al.record_id AS request_id,
          al.after_json->>'status' AS status,
          al.created_at,
          al.id
        FROM audit_log al
        WHERE al.tenant_id = $1
          AND al.table_name = 'portfolio_requests'
          AND al.record_id IS NOT NULL
          AND al.created_at >= $2::date
          AND al.created_at < ($3::date + INTERVAL '1 day')
          AND (
            (
              al.action = 'update'
              AND al.before_json->>'status' IS NOT NULL
              AND al.after_json->>'status' IS NOT NULL
              AND al.before_json->>'status' IS DISTINCT FROM al.after_json->>'status'
            )
            OR al.action = 'create'
          )
      ),
      latest_events AS (
        SELECT e.request_id, e.status, e.created_at AS last_changed_at
        FROM (
          SELECT
            re.*,
            ROW_NUMBER() OVER (
              PARTITION BY re.request_id
              ORDER BY re.created_at DESC, re.id DESC
            ) AS rn
          FROM request_events re
        ) e
        WHERE e.rn = 1
      )
      SELECT
        r.id AS request_id,
        r.name,
        r.source_id,
        ps.name AS source_name,
        r.category_id,
        pc.name AS category_name,
        r.stream_id,
        pst.name AS stream_name,
        COALESCE(le.status, r.status) AS status,
        le.last_changed_at
      FROM latest_events le
      JOIN portfolio_requests r ON r.id = le.request_id AND r.tenant_id = $1
      LEFT JOIN portfolio_sources ps ON ps.id = r.source_id AND ps.tenant_id = r.tenant_id
      LEFT JOIN portfolio_categories pc ON pc.id = r.category_id AND pc.tenant_id = r.tenant_id
      LEFT JOIN portfolio_streams pst ON pst.id = r.stream_id AND pst.tenant_id = r.tenant_id
      ${whereSql}
      ORDER BY r.priority_score DESC NULLS LAST, r.name ASC
      `,
      sqlParams,
    );

    return (rows as RawRequestRow[]).map((row) => ({
      requestId: row.request_id,
      itemPath: `/portfolio/requests/${row.request_id}/summary`,
      name: row.name ?? '',
      sourceId: row.source_id ?? null,
      sourceName: row.source_name ?? null,
      categoryId: row.category_id ?? null,
      categoryName: row.category_name ?? null,
      streamId: row.stream_id ?? null,
      streamName: row.stream_name ?? null,
      status: row.status ?? '',
      lastChangedAt: toIsoDate(row.last_changed_at),
    }));
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
          const nameCellRef = `A${rowNumber}`;
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
