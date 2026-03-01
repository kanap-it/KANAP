import 'dotenv/config';
import { DataSource } from 'typeorm';
import { htmlToMarkdown, isHtmlContent } from '../src/common/html-to-markdown';

type TableSpec = {
  table: string;
  columns: string[];
};

type TenantRow = {
  id: string;
  slug: string;
};

const TABLES: TableSpec[] = [
  { table: 'tasks', columns: ['description'] },
  { table: 'portfolio_requests', columns: ['purpose', 'current_situation', 'expected_benefits', 'risks'] },
  { table: 'portfolio_projects', columns: ['purpose'] },
  { table: 'portfolio_activities', columns: ['content'] },
];

const DEFAULT_SCAN_LIMIT = 20_000;
const SAMPLE_LIMIT_PER_COLUMN = 3;

type ColumnStats = {
  scanned: number;
  htmlRows: number;
  willChangeRows: number;
  samples: Array<{ id: string; tenantId: string; before: string; after: string }>;
};

function preview(text: string, max = 180): string {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const scanLimitRaw = Number(process.env.MIGRATION_DRYRUN_LIMIT || DEFAULT_SCAN_LIMIT);
  const scanLimit = Number.isFinite(scanLimitRaw) && scanLimitRaw > 0
    ? Math.floor(scanLimitRaw)
    : DEFAULT_SCAN_LIMIT;

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: false,
  } as any);

  await ds.initialize();
  const runner = ds.createQueryRunner();
  await runner.connect();
  try {
    console.log(`HTML -> Markdown dry-run (scan limit: ${scanLimit} rows per table)\n`);

    const tenantSlugFilter = String(process.env.MIGRATION_DRYRUN_TENANT_SLUG || '').trim();
    const tenantIdFilter = String(process.env.MIGRATION_DRYRUN_TENANT_ID || '').trim();

    let tenants: TenantRow[];
    if (tenantIdFilter) {
      tenants = await runner.query(
        `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
         FROM tenants
         WHERE id = $1
         ORDER BY slug`,
        [tenantIdFilter],
      ) as TenantRow[];
    } else if (tenantSlugFilter) {
      tenants = await runner.query(
        `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
         FROM tenants
         WHERE slug = $1
         ORDER BY slug`,
        [tenantSlugFilter],
      ) as TenantRow[];
    } else {
      tenants = await runner.query(
        `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
         FROM tenants
         ORDER BY slug`,
      ) as TenantRow[];
    }

    if (tenants.length === 0) {
      throw new Error(
        tenantSlugFilter
          ? `No tenant found for slug "${tenantSlugFilter}"`
          : tenantIdFilter
            ? `No tenant found for id "${tenantIdFilter}"`
            : 'No tenants found',
      );
    }

    console.log(`Tenants in scope: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}\n`);

    let totalScanned = 0;
    let totalHtml = 0;
    let totalWillChange = 0;

    for (const tenant of tenants) {
      await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
      await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

      console.log(`Tenant: ${tenant.slug || tenant.id}`);

      for (const spec of TABLES) {
        const selectColumns = spec.columns.map((col) => `"${col}"`).join(', ');
        const whereClause = spec.columns
          .map((col) => `("${col}" IS NOT NULL AND "${col}" <> '')`)
          .join(' OR ');

        const rows = await runner.query(
          `SELECT id::text AS id, tenant_id::text AS tenant_id, ${selectColumns}
           FROM "${spec.table}"
           WHERE tenant_id = $1
             AND (${whereClause})
           ORDER BY id::text
           LIMIT $2`,
          [tenant.id, scanLimit],
        ) as Array<Record<string, string | null>>;

        const stats = new Map<string, ColumnStats>();
        for (const col of spec.columns) {
          stats.set(col, {
            scanned: 0,
            htmlRows: 0,
            willChangeRows: 0,
            samples: [],
          });
        }

        for (const row of rows) {
          const rowId = String(row.id || '');
          const tenantId = String(row.tenant_id || '');
          for (const col of spec.columns) {
            const value = row[col];
            if (value == null || String(value).trim() === '') continue;
            const raw = String(value);
            const colStats = stats.get(col)!;
            colStats.scanned += 1;
            totalScanned += 1;

            if (!isHtmlContent(raw)) continue;

            colStats.htmlRows += 1;
            totalHtml += 1;

            const converted = htmlToMarkdown(raw);
            if (converted !== raw) {
              colStats.willChangeRows += 1;
              totalWillChange += 1;
              if (colStats.samples.length < SAMPLE_LIMIT_PER_COLUMN) {
                colStats.samples.push({
                  id: rowId,
                  tenantId,
                  before: preview(raw),
                  after: preview(converted),
                });
              }
            }
          }
        }

        console.log(`  Table: ${spec.table}`);
        console.log(`    Rows scanned: ${rows.length}`);
        for (const col of spec.columns) {
          const colStats = stats.get(col)!;
          console.log(
            `    ${col}: scanned=${colStats.scanned}, html=${colStats.htmlRows}, willChange=${colStats.willChangeRows}`,
          );
          if (colStats.samples.length > 0) {
            console.log('      samples:');
            for (const sample of colStats.samples) {
              console.log(
                `      - id=${sample.id} tenant=${sample.tenantId}\n` +
                `        before: ${sample.before}\n` +
                `        after : ${sample.after}`,
              );
            }
          }
        }
        if (rows.length >= scanLimit) {
          console.log(`    NOTE: table scan truncated to ${scanLimit} rows`);
        }
      }

      console.log('');
    }

    console.log('Summary');
    console.log(`  scanned values: ${totalScanned}`);
    console.log(`  html values: ${totalHtml}`);
    console.log(`  values that would change: ${totalWillChange}`);
    console.log('\nDry-run completed.');
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`Dry-run failed: ${message}`);
  process.exit(1);
});
