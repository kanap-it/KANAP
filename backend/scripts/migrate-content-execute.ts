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

const BATCH_SIZE = 100;

async function resolveTenants(runner: ReturnType<DataSource['createQueryRunner']>): Promise<TenantRow[]> {
  const tenantSlugFilter = String(process.env.MIGRATION_EXECUTE_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.MIGRATION_EXECUTE_TENANT_ID || '').trim();

  if (tenantIdFilter) {
    return await runner.query(
      `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
       FROM tenants
       WHERE id = $1
       ORDER BY slug`,
      [tenantIdFilter],
    ) as TenantRow[];
  }

  if (tenantSlugFilter) {
    return await runner.query(
      `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
       FROM tenants
       WHERE slug = $1
       ORDER BY slug`,
      [tenantSlugFilter],
    ) as TenantRow[];
  }

  return await runner.query(
    `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
     FROM tenants
     ORDER BY slug`,
  ) as TenantRow[];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: false,
  } as any);

  await ds.initialize();
  const runner = ds.createQueryRunner();
  await runner.connect();

  try {
    const tenants = await resolveTenants(runner);
    if (tenants.length === 0) {
      throw new Error('No tenants found for execution scope');
    }

    console.log(`Executing HTML -> Markdown migration for tenants: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}`);

    let totalUpdatedRows = 0;
    let totalScannedRows = 0;

    for (const tenant of tenants) {
      await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
      await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

      console.log(`\nTenant: ${tenant.slug || tenant.id}`);

      for (const spec of TABLES) {
        let cursorId: string | null = null;
        let tableUpdatedRows = 0;
        let tableScannedRows = 0;

        while (true) {
          const selectColumns = spec.columns.map((col) => `"${col}"`).join(', ');
          const whereAnyContent = spec.columns
            .map((col) => `("${col}" IS NOT NULL AND "${col}" <> '')`)
            .join(' OR ');
          const paginationClause = cursorId ? 'AND id::text > $3' : '';
          const params = cursorId
            ? [tenant.id, BATCH_SIZE, cursorId]
            : [tenant.id, BATCH_SIZE];

          const rows = await runner.query(
            `SELECT id::text AS id, ${selectColumns}
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
            tableScannedRows += 1;
            totalScannedRows += 1;

            const updates: Array<{ column: string; value: string }> = [];
            for (const col of spec.columns) {
              const value = row[col];
              if (value == null) continue;
              const raw = String(value);
              if (!raw.trim()) continue;
              if (!isHtmlContent(raw)) continue;

              const converted = htmlToMarkdown(raw);
              if (converted !== raw) {
                updates.push({ column: col, value: converted });
              }
            }

            if (updates.length > 0) {
              const setClauses = updates
                .map((update, idx) => `"${update.column}" = $${idx + 1}`)
                .join(', ');
              const idParam = updates.length + 1;
              const tenantParam = updates.length + 2;
              await runner.query(
                `UPDATE "${spec.table}"
                 SET ${setClauses}
                 WHERE id = $${idParam}
                   AND tenant_id = $${tenantParam}`,
                [...updates.map((update) => update.value), row.id, tenant.id],
              );
              tableUpdatedRows += 1;
              totalUpdatedRows += 1;
            }
          }

          cursorId = String(rows[rows.length - 1].id || '');
        }

        console.log(`  ${spec.table}: scanned=${tableScannedRows}, updated=${tableUpdatedRows}`);
      }
    }

    console.log('\nExecution complete.');
    console.log(`Total scanned rows: ${totalScannedRows}`);
    console.log(`Total updated rows: ${totalUpdatedRows}`);
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`Execute failed: ${message}`);
  process.exit(1);
});

