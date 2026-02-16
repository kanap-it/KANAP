import { Injectable } from '@nestjs/common';
import { format } from '@fast-csv/format';
import AdmZip = require('adm-zip');
import { EntityManager } from 'typeorm';

export type StatusChangeItemType = 'task' | 'request' | 'project';

export type StatusChangeReportQuery = {
  tenantId: string;
  startDate: string;
  endDate: string;
  statuses?: string[];
  itemTypes?: StatusChangeItemType[];
  sourceIds?: string[];
  categoryIds?: string[];
  streamIds?: string[];
};

export type StatusChangeReportRow = {
  itemType: StatusChangeItemType;
  itemId: string;
  itemPath: string;
  name: string;
  priority: number | null;
  status: string;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  companyName: string | null;
  lastChangedAt: string | null;
};

export type StatusChangeFilterValues = {
  statuses: string[];
  itemTypes: StatusChangeItemType[];
  sources: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  streams: Array<{ id: string; name: string; categoryId: string | null }>;
};

type ServiceOpts = { manager?: EntityManager };

type ExportResult<TContent> = {
  filename: string;
  content: TContent;
};

type RawRow = {
  item_type: StatusChangeItemType;
  item_id: string;
  name: string;
  priority: number | string | null;
  status: string;
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  company_name: string | null;
  last_changed_at: string | Date | null;
};

const ALL_ITEM_TYPES: StatusChangeItemType[] = ['task', 'request', 'project'];
const ITEM_TYPE_TO_TABLE: Record<StatusChangeItemType, string> = {
  task: 'tasks',
  request: 'portfolio_requests',
  project: 'portfolio_projects',
};
const BOM = '\uFEFF';

const xmlEscape = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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

const formatItemType = (itemType: StatusChangeItemType): string => {
  if (itemType === 'task') return 'Task';
  if (itemType === 'request') return 'Request';
  return 'Project';
};

@Injectable()
export class PortfolioStatusChangeReportService {
  async list(query: StatusChangeReportQuery, opts?: ServiceOpts): Promise<{ items: StatusChangeReportRow[] }> {
    const items = await this.fetchRows(query, opts);
    return { items };
  }

  async listFilterValues(query: StatusChangeReportQuery, opts?: ServiceOpts): Promise<StatusChangeFilterValues> {
    const rows = await this.fetchRows(query, opts);

    const statuses = Array.from(new Set(rows.map((row) => row.status))).sort((a, b) => a.localeCompare(b));
    const itemTypesSet = new Set(rows.map((row) => row.itemType));
    const itemTypes = ALL_ITEM_TYPES.filter((itemType) => itemTypesSet.has(itemType));

    const sourcesById = new Map<string, { id: string; name: string }>();
    const categoriesById = new Map<string, { id: string; name: string }>();
    const streamsById = new Map<string, { id: string; name: string; categoryId: string | null }>();

    for (const row of rows) {
      if (row.sourceId && row.sourceName) {
        sourcesById.set(row.sourceId, { id: row.sourceId, name: row.sourceName });
      }
      if (row.categoryId && row.categoryName) {
        categoriesById.set(row.categoryId, { id: row.categoryId, name: row.categoryName });
      }
      if (row.streamId && row.streamName) {
        streamsById.set(row.streamId, {
          id: row.streamId,
          name: row.streamName,
          categoryId: row.categoryId,
        });
      }
    }

    const sources = Array.from(sourcesById.values()).sort((a, b) => a.name.localeCompare(b.name));
    const categories = Array.from(categoriesById.values()).sort((a, b) => a.name.localeCompare(b.name));
    const streams = Array.from(streamsById.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
      statuses,
      itemTypes,
      sources,
      categories,
      streams,
    };
  }

  async exportCsv(
    query: StatusChangeReportQuery,
    opts?: ServiceOpts,
  ): Promise<ExportResult<string>> {
    const rows = await this.fetchRows(query, opts);
    const headers = [
      'Name',
      'Item Type',
      'Priority',
      'Status',
      'Source',
      'Category',
      'Stream',
      'Company',
      'Last Changed',
    ];

    const chunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = format({ headers, delimiter: ';' });
      stream.on('data', (chunk) => chunks.push(chunk.toString('utf8')));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve());

      for (const row of rows) {
        stream.write({
          Name: row.name,
          'Item Type': formatItemType(row.itemType),
          Priority: row.priority ?? '',
          Status: row.status,
          Source: row.sourceName ?? '',
          Category: row.categoryName ?? '',
          Stream: row.streamName ?? '',
          Company: row.companyName ?? '',
          'Last Changed': row.lastChangedAt ?? '',
        });
      }

      stream.end();
    });

    return {
      filename: this.buildFilename(query, 'csv'),
      content: BOM + chunks.join(''),
    };
  }

  async exportXlsx(
    query: StatusChangeReportQuery,
    appBaseUrl: string | null,
    opts?: ServiceOpts,
  ): Promise<ExportResult<Buffer>> {
    const rows = await this.fetchRows(query, opts);
    const content = this.buildXlsx(rows, appBaseUrl);
    return {
      filename: this.buildFilename(query, 'xlsx'),
      content,
    };
  }

  private async fetchRows(
    query: StatusChangeReportQuery,
    opts?: ServiceOpts,
  ): Promise<StatusChangeReportRow[]> {
    const mg = opts?.manager;
    if (!mg) return [];

    const itemTypes = this.normalizeItemTypes(query.itemTypes);
    const tableNames = itemTypes.map((itemType) => ITEM_TYPE_TO_TABLE[itemType]);

    const statuses = this.normalizeStringArray(query.statuses);
    const sourceIds = this.normalizeStringArray(query.sourceIds);
    const categoryIds = this.normalizeStringArray(query.categoryIds);
    const streamIds = this.normalizeStringArray(query.streamIds);

    const sqlParams: any[] = [query.tenantId, tableNames, query.startDate, query.endDate];
    const filters: string[] = [];

    if (statuses.length > 0) {
      sqlParams.push(statuses);
      filters.push(`rr.status = ANY($${sqlParams.length}::text[])`);
    }

    if (sourceIds.length > 0) {
      sqlParams.push(sourceIds);
      filters.push(`rr.source_id::text = ANY($${sqlParams.length}::text[])`);
    }

    if (categoryIds.length > 0) {
      sqlParams.push(categoryIds);
      filters.push(`rr.category_id::text = ANY($${sqlParams.length}::text[])`);
    }

    if (streamIds.length > 0) {
      sqlParams.push(streamIds);
      filters.push(`rr.stream_id::text = ANY($${sqlParams.length}::text[])`);
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await mg.query(
      `
      WITH status_events AS (
        SELECT
          CASE
            WHEN al.table_name = 'tasks' THEN 'task'
            WHEN al.table_name = 'portfolio_requests' THEN 'request'
            WHEN al.table_name = 'portfolio_projects' THEN 'project'
            ELSE NULL
          END AS item_type,
          al.record_id AS item_id,
          al.after_json->>'status' AS status,
          al.created_at,
          al.id
        FROM audit_log al
        WHERE al.tenant_id = $1
          AND al.table_name = ANY($2::text[])
          AND al.action = 'update'
          AND al.record_id IS NOT NULL
          AND al.before_json->>'status' IS NOT NULL
          AND al.after_json->>'status' IS NOT NULL
          AND al.before_json->>'status' IS DISTINCT FROM al.after_json->>'status'
          AND al.created_at >= $3::date
          AND al.created_at < ($4::date + INTERVAL '1 day')
      ),
      latest_events AS (
        SELECT e.item_type, e.item_id, e.status, e.created_at AS last_changed_at
        FROM (
          SELECT
            se.*,
            ROW_NUMBER() OVER (
              PARTITION BY se.item_type, se.item_id
              ORDER BY se.created_at DESC, se.id DESC
            ) AS rn
          FROM status_events se
        ) e
        WHERE e.rn = 1
      ),
      report_rows AS (
        SELECT
          'task'::text AS item_type,
          t.id AS item_id,
          t.title AS name,
          CASE t.priority_level
            WHEN 'blocker' THEN 110
            WHEN 'high' THEN 90
            WHEN 'normal' THEN 70
            WHEN 'low' THEN 50
            WHEN 'optional' THEN 30
            ELSE NULL
          END::numeric AS priority,
          le.status AS status,
          t.source_id,
          ps.name AS source_name,
          t.category_id,
          pc.name AS category_name,
          t.stream_id,
          pst.name AS stream_name,
          comp.name AS company_name,
          le.last_changed_at
        FROM latest_events le
        JOIN tasks t ON le.item_type = 'task' AND t.id = le.item_id AND t.tenant_id = $1
        LEFT JOIN portfolio_sources ps ON ps.id = t.source_id AND ps.tenant_id = t.tenant_id
        LEFT JOIN portfolio_categories pc ON pc.id = t.category_id AND pc.tenant_id = t.tenant_id
        LEFT JOIN portfolio_streams pst ON pst.id = t.stream_id AND pst.tenant_id = t.tenant_id
        LEFT JOIN companies comp ON comp.id = t.company_id AND comp.tenant_id = t.tenant_id
        WHERE t.related_object_type IS NULL

        UNION ALL

        SELECT
          'request'::text AS item_type,
          r.id AS item_id,
          r.name AS name,
          r.priority_score::numeric AS priority,
          le.status AS status,
          r.source_id,
          ps.name AS source_name,
          r.category_id,
          pc.name AS category_name,
          r.stream_id,
          pst.name AS stream_name,
          comp.name AS company_name,
          le.last_changed_at
        FROM latest_events le
        JOIN portfolio_requests r ON le.item_type = 'request' AND r.id = le.item_id AND r.tenant_id = $1
        LEFT JOIN portfolio_sources ps ON ps.id = r.source_id AND ps.tenant_id = r.tenant_id
        LEFT JOIN portfolio_categories pc ON pc.id = r.category_id AND pc.tenant_id = r.tenant_id
        LEFT JOIN portfolio_streams pst ON pst.id = r.stream_id AND pst.tenant_id = r.tenant_id
        LEFT JOIN companies comp ON comp.id = r.company_id AND comp.tenant_id = r.tenant_id

        UNION ALL

        SELECT
          'project'::text AS item_type,
          p.id AS item_id,
          p.name AS name,
          p.priority_score::numeric AS priority,
          le.status AS status,
          p.source_id,
          ps.name AS source_name,
          p.category_id,
          pc.name AS category_name,
          p.stream_id,
          pst.name AS stream_name,
          comp.name AS company_name,
          le.last_changed_at
        FROM latest_events le
        JOIN portfolio_projects p ON le.item_type = 'project' AND p.id = le.item_id AND p.tenant_id = $1
        LEFT JOIN portfolio_sources ps ON ps.id = p.source_id AND ps.tenant_id = p.tenant_id
        LEFT JOIN portfolio_categories pc ON pc.id = p.category_id AND pc.tenant_id = p.tenant_id
        LEFT JOIN portfolio_streams pst ON pst.id = p.stream_id AND pst.tenant_id = p.tenant_id
        LEFT JOIN companies comp ON comp.id = p.company_id AND comp.tenant_id = p.tenant_id
      )
      SELECT
        rr.item_type,
        rr.item_id,
        rr.name,
        rr.priority,
        rr.status,
        rr.source_id,
        rr.source_name,
        rr.category_id,
        rr.category_name,
        rr.stream_id,
        rr.stream_name,
        rr.company_name,
        rr.last_changed_at
      FROM report_rows rr
      ${whereSql}
      ORDER BY rr.priority DESC NULLS LAST, rr.name ASC
      `,
      sqlParams,
    );

    return (rows as RawRow[]).map((row) => this.mapRow(row));
  }

  private mapRow(row: RawRow): StatusChangeReportRow {
    return {
      itemType: row.item_type,
      itemId: row.item_id,
      itemPath: this.buildItemPath(row.item_type, row.item_id),
      name: row.name ?? '',
      priority: row.priority == null || Number.isNaN(Number(row.priority)) ? null : Number(row.priority),
      status: row.status ?? '',
      sourceId: row.source_id ?? null,
      sourceName: row.source_name ?? null,
      categoryId: row.category_id ?? null,
      categoryName: row.category_name ?? null,
      streamId: row.stream_id ?? null,
      streamName: row.stream_name ?? null,
      companyName: row.company_name ?? null,
      lastChangedAt: toIsoDate(row.last_changed_at),
    };
  }

  private buildItemPath(itemType: StatusChangeItemType, itemId: string): string {
    if (itemType === 'task') return `/portfolio/tasks/${itemId}/overview`;
    if (itemType === 'request') return `/portfolio/requests/${itemId}/overview`;
    return `/portfolio/projects/${itemId}/overview`;
  }

  private normalizeItemTypes(itemTypes?: StatusChangeItemType[]): StatusChangeItemType[] {
    if (!itemTypes || itemTypes.length === 0) return ALL_ITEM_TYPES;
    const deduped = Array.from(new Set(itemTypes.filter((itemType) => ALL_ITEM_TYPES.includes(itemType))));
    return deduped.length > 0 ? deduped : ALL_ITEM_TYPES;
  }

  private normalizeStringArray(values?: string[]): string[] {
    if (!values) return [];
    const normalized = values
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);
    return Array.from(new Set(normalized));
  }

  private buildFilename(query: StatusChangeReportQuery, ext: 'csv' | 'xlsx'): string {
    return `status-change-report-${query.startDate}_to_${query.endDate}.${ext}`;
  }

  private buildXlsx(rows: StatusChangeReportRow[], appBaseUrl: string | null): Buffer {
    const headers = [
      'Name',
      'Item Type',
      'Priority',
      'Status',
      'Source',
      'Category',
      'Stream',
      'Company',
      'Last Changed',
    ];

    const sheetRows: string[] = [];
    const hyperlinks: string[] = [];
    const hyperlinkRels: string[] = [];
    let hyperlinkIndex = 0;

    const buildInlineStringCell = (cellRef: string, value: string) =>
      `<c r="${cellRef}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;

    const buildNumberCell = (cellRef: string, value: number) =>
      `<c r="${cellRef}"><v>${value}</v></c>`;

    const addCell = (cells: string[], rowNumber: number, columnNumber: number, value: string | number | null) => {
      if (value === null || value === undefined || value === '') return;
      const cellRef = `${columnNumberToName(columnNumber)}${rowNumber}`;
      if (typeof value === 'number' && Number.isFinite(value)) {
        cells.push(buildNumberCell(cellRef, value));
      } else {
        cells.push(buildInlineStringCell(cellRef, String(value)));
      }
    };

    const headerCells: string[] = [];
    headers.forEach((header, index) => addCell(headerCells, 1, index + 1, header));
    sheetRows.push(`<row r="1">${headerCells.join('')}</row>`);

    rows.forEach((row, rowIndex) => {
      const rowNumber = rowIndex + 2;
      const cells: string[] = [];

      addCell(cells, rowNumber, 1, row.name);
      addCell(cells, rowNumber, 2, formatItemType(row.itemType));
      addCell(cells, rowNumber, 3, row.priority);
      addCell(cells, rowNumber, 4, row.status);
      addCell(cells, rowNumber, 5, row.sourceName);
      addCell(cells, rowNumber, 6, row.categoryName);
      addCell(cells, rowNumber, 7, row.streamName);
      addCell(cells, rowNumber, 8, row.companyName);
      addCell(cells, rowNumber, 9, row.lastChangedAt);

      const normalizedBase = String(appBaseUrl || '').trim().replace(/\/$/, '');
      const target = normalizedBase ? `${normalizedBase}${row.itemPath}` : row.itemPath;
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

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Status Change Report" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

    const zip = new AdmZip();
    zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml, 'utf8'));
    zip.addFile('_rels/.rels', Buffer.from(rootRelsXml, 'utf8'));
    zip.addFile('xl/workbook.xml', Buffer.from(workbookXml, 'utf8'));
    zip.addFile('xl/_rels/workbook.xml.rels', Buffer.from(workbookRelsXml, 'utf8'));
    zip.addFile('xl/worksheets/sheet1.xml', Buffer.from(sheetXml, 'utf8'));

    if (hyperlinkRels.length > 0) {
      const sheetRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${hyperlinkRels.join('\n  ')}
</Relationships>`;
      zip.addFile('xl/worksheets/_rels/sheet1.xml.rels', Buffer.from(sheetRelsXml, 'utf8'));
    }

    return zip.toBuffer();
  }
}
