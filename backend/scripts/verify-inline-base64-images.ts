import 'dotenv/config';
import { DataSource } from 'typeorm';
import { containsInlineDataImage } from '../src/common/html-to-markdown';

type TableSpec = {
  table: string;
  columns: string[];
};

type TenantRow = {
  id: string;
  slug: string;
};

type ColumnStats = {
  scanned: number;
  offenders: number;
  samples: Array<{ id: string; tenantId: string; value: string }>;
};

const TABLES: TableSpec[] = [
  { table: 'documents', columns: ['content_markdown'] },
  { table: 'document_activities', columns: ['content'] },
  { table: 'tasks', columns: ['description'] },
  { table: 'portfolio_requests', columns: ['purpose', 'current_situation', 'expected_benefits', 'risks'] },
  { table: 'portfolio_projects', columns: ['purpose'] },
  { table: 'portfolio_activities', columns: ['content'] },
];

const SAMPLE_LIMIT_PER_COLUMN = 5;

function preview(text: string, max = 180): string {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

async function resolveTenants(runner: ReturnType<DataSource['createQueryRunner']>): Promise<TenantRow[]> {
  const tenantSlugFilter = String(process.env.MIGRATION_VERIFY_INLINE_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.MIGRATION_VERIFY_INLINE_TENANT_ID || '').trim();

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
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

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
    if (tenants.length === 0) throw new Error('No tenants found for verification scope');

    console.log(`Verifying inline base64 image policy for tenants: ${tenants.map((t) => t.slug || t.id).join(', ')}\n`);

    let totalScanned = 0;
    let totalOffenders = 0;

    for (const tenant of tenants) {
      await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
      await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

      console.log(`Tenant: ${tenant.slug || tenant.id}`);

      for (const spec of TABLES) {
        const stats = new Map<string, ColumnStats>();
        for (const col of spec.columns) {
          stats.set(col, { scanned: 0, offenders: 0, samples: [] });
        }

        const selectColumns = spec.columns.map((col) => `"${col}"`).join(', ');
        const whereAnyCandidate = spec.columns
          .map((col) => `("${col}" IS NOT NULL AND "${col}" ILIKE '%data:image/%')`)
          .join(' OR ');

        const rows = await runner.query(
          `SELECT id::text AS id, tenant_id::text AS tenant_id, ${selectColumns}
           FROM "${spec.table}"
           WHERE tenant_id = $1
             AND (${whereAnyCandidate})
           ORDER BY id::text ASC`,
          [tenant.id],
        ) as Array<Record<string, string | null>>;

        for (const row of rows) {
          const rowId = String(row.id || '');
          const tenantId = String(row.tenant_id || '');

          for (const col of spec.columns) {
            const raw = row[col];
            if (raw == null) continue;
            const value = String(raw);
            if (!value.trim()) continue;
            if (!value.toLowerCase().includes('data:image/')) continue;

            const colStats = stats.get(col)!;
            colStats.scanned += 1;
            totalScanned += 1;

            if (!containsInlineDataImage(value)) continue;

            colStats.offenders += 1;
            totalOffenders += 1;
            if (colStats.samples.length < SAMPLE_LIMIT_PER_COLUMN) {
              colStats.samples.push({
                id: rowId,
                tenantId,
                value: preview(value),
              });
            }
          }
        }

        console.log(`  Table: ${spec.table}`);
        for (const col of spec.columns) {
          const colStats = stats.get(col)!;
          console.log(`    ${col}: candidates=${colStats.scanned}, offenders=${colStats.offenders}`);
          if (colStats.samples.length > 0) {
            console.log('      sample offending rows:');
            for (const sample of colStats.samples) {
              console.log(`      - id=${sample.id} tenant=${sample.tenantId}`);
              console.log(`        value: ${sample.value}`);
            }
          }
        }
      }

      console.log('');
    }

    console.log('Summary');
    console.log(`  scanned candidates: ${totalScanned}`);
    console.log(`  inline base64 offenders: ${totalOffenders}`);

    if (totalOffenders > 0) {
      console.error('\nVerification failed: inline base64 images are still present in persisted rich-text fields.');
      process.exitCode = 1;
      return;
    }

    console.log('\nVerification passed: no persisted inline base64 images detected.');
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
