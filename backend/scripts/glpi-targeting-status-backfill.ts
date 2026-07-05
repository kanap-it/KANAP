import 'dotenv/config';
import { DataSource } from 'typeorm';
import { normalizeServiceDeskScopePolicy } from '../src/ai/control-plane/agent/service-desk-targeting';

type TenantRow = {
  id: string;
  slug: string;
};

type DefinitionRow = {
  id: string;
  tenant_id: string;
  agent_key: string;
  status: string;
  scope_policy_json: Record<string, unknown> | null;
  metadata_json: Record<string, unknown> | null;
};

const DEFAULT_BATCH_SIZE = 100;
const SAMPLE_LIMIT = 10;
const APPLY_CONFIRMATION = 'targeting-status-canonicalization';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) =>
    `${JSON.stringify(key)}:${stableStringify(object[key])}`,
  ).join(',')}}`;
}

function numericStatusValues(scopePolicy: Record<string, unknown> | null): string[] {
  const targeting = isRecord(scopePolicy?.targeting) ? scopePolicy.targeting : null;
  const predicates = Array.isArray(targeting?.predicates) ? targeting.predicates : [];
  const values: string[] = [];
  for (const predicate of predicates) {
    if (!isRecord(predicate) || predicate.field !== 'status') {
      continue;
    }
    const rawValues = Array.isArray(predicate.value) ? predicate.value : [predicate.value];
    for (const value of rawValues) {
      const text = String(value ?? '').trim();
      if (/^[0-9]+$/.test(text)) {
        values.push(text);
      }
    }
  }
  return Array.from(new Set(values));
}

async function resolveTenants(runner: ReturnType<DataSource['createQueryRunner']>): Promise<TenantRow[]> {
  const tenantSlugFilter = String(process.env.GLPI_TARGETING_STATUS_BACKFILL_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.GLPI_TARGETING_STATUS_BACKFILL_TENANT_ID || '').trim();

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

  const apply = String(process.env.GLPI_TARGETING_STATUS_BACKFILL_APPLY || '').trim() === '1';
  const confirmation = String(process.env.GLPI_TARGETING_STATUS_BACKFILL_CONFIRM || '').trim();
  if (apply && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(
      `Apply mode requires GLPI_TARGETING_STATUS_BACKFILL_CONFIRM=${APPLY_CONFIRMATION}`,
    );
  }
  const includeUserModified = String(process.env.GLPI_TARGETING_STATUS_BACKFILL_INCLUDE_USER_MODIFIED || '').trim() === '1';
  const batchSizeRaw = Number(process.env.GLPI_TARGETING_STATUS_BACKFILL_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  const batchSize = Number.isFinite(batchSizeRaw) && batchSizeRaw > 0
    ? Math.floor(batchSizeRaw)
    : DEFAULT_BATCH_SIZE;

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
      throw new Error('No tenants found for backfill scope');
    }

    console.log(`GLPI targeting status canonicalization backfill (${apply ? 'apply' : 'dry-run'})`);
    console.log(`Tenants in scope: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}`);
    console.log(`Batch size: ${batchSize}`);
    console.log(`Include user-modified definitions: ${includeUserModified ? 'yes' : 'no'}`);
    if (!apply) {
      console.log('No rows will be updated. Set GLPI_TARGETING_STATUS_BACKFILL_APPLY=1 and the confirmation env var to apply.');
    }
    console.log('');

    let totalScanned = 0;
    let totalChanged = 0;
    let totalUpdated = 0;
    let totalSkippedUserModified = 0;
    const samples: Array<{ tenant: string; definitionId: string; agentKey: string; before: string[]; after: string[] }> = [];

    for (const tenant of tenants) {
      await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
      await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

      let cursorId: string | null = null;
      let tenantScanned = 0;
      let tenantChanged = 0;
      let tenantUpdated = 0;
      let tenantSkippedUserModified = 0;

      while (true) {
        const params = cursorId
          ? [tenant.id, batchSize, cursorId]
          : [tenant.id, batchSize];
        const cursorClause = cursorId ? 'AND id::text > $3' : '';
        const rows = await runner.query(
          `SELECT id::text AS id,
                  tenant_id::text AS tenant_id,
                  agent_key,
                  status,
                  scope_policy_json,
                  metadata_json
           FROM ai_agent_definitions
           WHERE tenant_id = $1
             AND scope_policy_json IS NOT NULL
             ${cursorClause}
           ORDER BY id::text ASC
           LIMIT $2`,
          params,
        ) as DefinitionRow[];

        if (rows.length === 0) {
          break;
        }

        for (const row of rows) {
          cursorId = row.id;
          tenantScanned += 1;
          totalScanned += 1;

          const metadata = isRecord(row.metadata_json) ? row.metadata_json : {};
          if (!includeUserModified && metadata.user_modified === true) {
            tenantSkippedUserModified += 1;
            totalSkippedUserModified += 1;
            continue;
          }
          if (metadata.product_owned !== true && !includeUserModified) {
            continue;
          }

          const beforeNumeric = numericStatusValues(row.scope_policy_json);
          if (beforeNumeric.length === 0) {
            continue;
          }

          let normalized: Record<string, unknown> | null;
          try {
            normalized = normalizeServiceDeskScopePolicy(row.scope_policy_json);
          } catch (error: any) {
            console.log(
              `Skipping ${tenant.slug || tenant.id}/${row.agent_key}: normalization failed: ${String(error?.message || error || 'unknown error')}`,
            );
            continue;
          }
          const afterNumeric = numericStatusValues(normalized);
          if (!normalized || stableStringify(normalized) === stableStringify(row.scope_policy_json)) {
            continue;
          }

          tenantChanged += 1;
          totalChanged += 1;
          if (samples.length < SAMPLE_LIMIT) {
            samples.push({
              tenant: tenant.slug || tenant.id,
              definitionId: row.id,
              agentKey: row.agent_key,
              before: beforeNumeric,
              after: afterNumeric,
            });
          }

          if (apply) {
            await runner.query(
              `UPDATE ai_agent_definitions
               SET scope_policy_json = $1::jsonb,
                   updated_at = now()
               WHERE tenant_id = $2
                 AND id = $3`,
              [JSON.stringify(normalized), tenant.id, row.id],
            );
            tenantUpdated += 1;
            totalUpdated += 1;
          }
        }
      }

      console.log(
        `Tenant ${tenant.slug || tenant.id}: scanned=${tenantScanned}, `
        + `wouldChange=${tenantChanged}, updated=${tenantUpdated}, skippedUserModified=${tenantSkippedUserModified}`,
      );
    }

    if (samples.length > 0) {
      console.log('\nSample changed definitions:');
      for (const sample of samples) {
        console.log(
          `- tenant=${sample.tenant} definition=${sample.definitionId} agent=${sample.agentKey} `
          + `numericBefore=[${sample.before.join(', ')}] numericAfter=[${sample.after.join(', ')}]`,
        );
      }
    }

    console.log('\nSummary');
    console.log(`  scanned definitions: ${totalScanned}`);
    console.log(`  definitions needing canonicalization: ${totalChanged}`);
    console.log(`  definitions updated: ${totalUpdated}`);
    console.log(`  user-modified definitions skipped: ${totalSkippedUserModified}`);
    console.log(apply ? 'Backfill apply completed.' : 'Backfill dry-run completed.');
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`GLPI targeting status backfill failed: ${message}`);
  process.exit(1);
});
