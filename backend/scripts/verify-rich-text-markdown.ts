import 'dotenv/config';
import { DataSource } from 'typeorm';
import { isHtmlContent } from '../src/common/html-to-markdown';

type TableSpec = {
  table: string;
  columns: string[];
};

type ColumnStats = {
  scanned: number;
  htmlRows: number;
  samples: Array<{ id: string; tenantId: string; value: string }>;
};

const TABLES: TableSpec[] = [
  { table: 'tasks', columns: ['description'] },
  { table: 'portfolio_requests', columns: ['purpose', 'current_situation', 'expected_benefits', 'risks'] },
  { table: 'portfolio_projects', columns: ['purpose'] },
  { table: 'portfolio_activities', columns: ['content'] },
];

const DEFAULT_BATCH_SIZE = 500;
const SAMPLE_LIMIT_PER_COLUMN = 5;

type TenantRow = {
  id: string;
  slug: string;
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

  const batchSizeRaw = Number(process.env.MIGRATION_VERIFY_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  const batchSize = Number.isFinite(batchSizeRaw) && batchSizeRaw > 0
    ? Math.floor(batchSizeRaw)
    : DEFAULT_BATCH_SIZE;

  const maxRowsPerTableRaw = Number(process.env.MIGRATION_VERIFY_MAX_ROWS_PER_TABLE || 0);
  const maxRowsPerTable = Number.isFinite(maxRowsPerTableRaw) && maxRowsPerTableRaw > 0
    ? Math.floor(maxRowsPerTableRaw)
    : 0;

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: false,
  } as any);

  await ds.initialize();

  const runner = ds.createQueryRunner();
  await runner.connect();

  try {
    console.log('Verifying rich-text migration: HTML should be fully replaced by Markdown.\n');

    const tenantSlugFilter = String(process.env.MIGRATION_VERIFY_TENANT_SLUG || '').trim();
    const tenantIdFilter = String(process.env.MIGRATION_VERIFY_TENANT_ID || '').trim();

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
    let totalHtmlRows = 0;

    for (const tenant of tenants) {
      await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
      await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

      console.log(`Tenant: ${tenant.slug || tenant.id}`);

      for (const spec of TABLES) {
        const stats = new Map<string, ColumnStats>();
        for (const col of spec.columns) {
          stats.set(col, {
            scanned: 0,
            htmlRows: 0,
            samples: [],
          });
        }

        let scannedRowsForTable = 0;
        let cursorId: string | null = null;

        while (true) {
          if (maxRowsPerTable > 0 && scannedRowsForTable >= maxRowsPerTable) {
            break;
          }

          const selectColumns = spec.columns.map((col) => `"${col}"`).join(', ');
          const whereAnyContent = spec.columns
            .map((col) => `("${col}" IS NOT NULL AND "${col}" <> '')`)
            .join(' OR ');

          const queryLimit = maxRowsPerTable > 0
            ? Math.min(batchSize, maxRowsPerTable - scannedRowsForTable)
            : batchSize;
          if (queryLimit <= 0) break;

          const paginationClause = cursorId ? 'AND id::text > $3' : '';
          const params = cursorId
            ? [tenant.id, queryLimit, cursorId]
            : [tenant.id, queryLimit];

          const rows = await runner.query(
            `SELECT id::text AS id, tenant_id::text AS tenant_id, ${selectColumns}
             FROM "${spec.table}"
             WHERE tenant_id = $1
               AND (${whereAnyContent})
               ${paginationClause}
             ORDER BY id::text ASC
             LIMIT $2`,
            params,
          ) as Array<Record<string, string | null>>;

          if (rows.length === 0) break;

          for (const row of rows) {
            scannedRowsForTable += 1;
            cursorId = String(row.id || '');
            const rowId = cursorId;
            const tenantId = String(row.tenant_id || '');

            for (const col of spec.columns) {
              const value = row[col];
              if (value == null) continue;
              const raw = String(value);
              if (!raw.trim()) continue;

              const colStats = stats.get(col)!;
              colStats.scanned += 1;
              totalScanned += 1;

              if (isHtmlContent(raw)) {
                colStats.htmlRows += 1;
                totalHtmlRows += 1;
                if (colStats.samples.length < SAMPLE_LIMIT_PER_COLUMN) {
                  colStats.samples.push({
                    id: rowId,
                    tenantId,
                    value: preview(raw),
                  });
                }
              }
            }
          }
        }

        console.log(`  Table: ${spec.table}`);
        console.log(`    Rows scanned: ${scannedRowsForTable}`);
        for (const col of spec.columns) {
          const colStats = stats.get(col)!;
          console.log(`    ${col}: scanned=${colStats.scanned}, htmlRemaining=${colStats.htmlRows}`);
          if (colStats.samples.length > 0) {
            console.log('      sample HTML rows:');
            for (const sample of colStats.samples) {
              console.log(
                `      - id=${sample.id} tenant=${sample.tenantId}\n` +
                `        value: ${sample.value}`,
              );
            }
          }
        }
        if (maxRowsPerTable > 0) {
          console.log(`    NOTE: per-table scan cap is set to ${maxRowsPerTable}`);
        }
      }

      console.log('');
    }

    console.log('Summary');
    console.log(`  scanned values: ${totalScanned}`);
    console.log(`  html remaining: ${totalHtmlRows}`);

    if (totalHtmlRows > 0) {
      console.error('\nVerification failed: HTML content still exists in migrated rich-text columns.');
      process.exitCode = 1;
      return;
    }

    console.log('\nVerification passed: all scanned rich-text values are Markdown/non-HTML.');
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`Verification failed: ${message}`);
  process.exit(1);
});
