import 'dotenv/config';
import { DataSource } from 'typeorm';

type TenantRow = {
  id: string;
  slug: string;
};

type PreviewRow = {
  id: string;
  tenant_id: string;
  tool_name: string;
  status: string;
  mutation_input: Record<string, unknown>;
  current_values: Record<string, unknown> | null;
};

type BackfillResult = {
  mutation: Record<string, unknown>;
  current: Record<string, unknown> | null;
  mutationAdded: string[];
  currentAdded: string[];
};

const DEFAULT_BATCH_SIZE = 100;
const SAMPLE_LIMIT = 10;
const APPLY_CONFIRMATION = 'import-preview-generic-metadata';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  const text = typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
  return text.length > 0 ? text : null;
}

function valueOrNull(value: unknown): unknown | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }
  return value;
}

function copyIfMissing(
  target: Record<string, unknown>,
  targetKey: string,
  value: unknown,
  added: string[],
) {
  if (valueOrNull(target[targetKey]) != null) {
    return;
  }
  const nextValue = valueOrNull(value);
  if (nextValue == null) {
    return;
  }
  target[targetKey] = nextValue;
  added.push(targetKey);
}

function backfillPreview(row: PreviewRow): BackfillResult {
  const mutation = isRecord(row.mutation_input) ? { ...row.mutation_input } : {};
  const current = row.current_values == null
    ? null
    : isRecord(row.current_values)
      ? { ...row.current_values }
      : {};
  const mutationAdded: string[] = [];
  const currentAdded: string[] = [];

  const providerKind = textOrNull(mutation.ticket_provider_kind)
    ?? textOrNull(current?.ticket_provider_kind)
    ?? 'ticketing';
  const providerKey = textOrNull(mutation.ticket_provider_key)
    ?? textOrNull(current?.ticket_provider_key)
    ?? 'glpi';
  const ticketId = textOrNull(mutation.ticket_id)
    ?? textOrNull(current?.ticket_id)
    ?? textOrNull(mutation.glpi_ticket_id)
    ?? textOrNull(current?.glpi_ticket_id);

  copyIfMissing(mutation, 'ticket_provider_kind', providerKind, mutationAdded);
  copyIfMissing(mutation, 'ticket_provider_key', providerKey, mutationAdded);
  copyIfMissing(mutation, 'ticket_id', ticketId, mutationAdded);
  copyIfMissing(mutation, 'ticket_source_url', mutation.glpi_source_url ?? current?.glpi_source_url, mutationAdded);
  copyIfMissing(mutation, 'ticket_image_targets', mutation.glpi_image_targets, mutationAdded);
  copyIfMissing(mutation, 'ticket_followups', mutation.glpi_followups, mutationAdded);
  copyIfMissing(mutation, 'ticket_followup_public_count', mutation.glpi_followup_public_count, mutationAdded);
  copyIfMissing(mutation, 'ticket_followup_private_skipped_count', mutation.glpi_followup_private_skipped_count, mutationAdded);
  copyIfMissing(mutation, 'ticket_followup_image_total_count', mutation.glpi_followup_image_total_count, mutationAdded);

  if (current) {
    copyIfMissing(current, 'ticket_provider_kind', providerKind, currentAdded);
    copyIfMissing(current, 'ticket_provider_key', providerKey, currentAdded);
    copyIfMissing(current, 'ticket_id', ticketId, currentAdded);
    copyIfMissing(current, 'ticket_source_url', current.glpi_source_url ?? mutation.glpi_source_url, currentAdded);
    copyIfMissing(current, 'ticket_image_total_count', current.glpi_image_total_count, currentAdded);
    copyIfMissing(current, 'ticket_image_imported_count', current.glpi_image_imported_count, currentAdded);
    copyIfMissing(current, 'ticket_image_warnings', current.glpi_image_warnings, currentAdded);
    copyIfMissing(current, 'ticket_followup_public_count', current.glpi_followup_public_count, currentAdded);
    copyIfMissing(current, 'ticket_followup_imported_count', current.glpi_followup_imported_count, currentAdded);
    copyIfMissing(current, 'ticket_followup_private_skipped_count', current.glpi_followup_private_skipped_count, currentAdded);
    copyIfMissing(current, 'ticket_followup_image_total_count', current.glpi_followup_image_total_count, currentAdded);
    copyIfMissing(current, 'ticket_followup_image_imported_count', current.glpi_followup_image_imported_count, currentAdded);
  }

  return { mutation, current, mutationAdded, currentAdded };
}

async function resolveTenants(runner: ReturnType<DataSource['createQueryRunner']>): Promise<TenantRow[]> {
  const tenantSlugFilter = String(process.env.GLPI_IMPORT_PREVIEW_BACKFILL_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.GLPI_IMPORT_PREVIEW_BACKFILL_TENANT_ID || '').trim();

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

  const apply = String(process.env.GLPI_IMPORT_PREVIEW_BACKFILL_APPLY || '').trim() === '1';
  const confirmation = String(process.env.GLPI_IMPORT_PREVIEW_BACKFILL_CONFIRM || '').trim();
  if (apply && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(
      `Apply mode requires GLPI_IMPORT_PREVIEW_BACKFILL_CONFIRM=${APPLY_CONFIRMATION}`,
    );
  }
  const batchSizeRaw = Number(process.env.GLPI_IMPORT_PREVIEW_BACKFILL_BATCH_SIZE || DEFAULT_BATCH_SIZE);
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

    console.log(`GLPI import preview generic metadata backfill (${apply ? 'apply' : 'dry-run'})`);
    console.log(`Tenants in scope: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}`);
    console.log(`Batch size: ${batchSize}`);
    if (!apply) {
      console.log('No rows will be updated. Set GLPI_IMPORT_PREVIEW_BACKFILL_APPLY=1 and the confirmation env var to apply.');
    }
    console.log('');

    let totalScanned = 0;
    let totalChanged = 0;
    let totalUpdated = 0;
    const samples: Array<{ tenant: string; previewId: string; status: string; mutationAdded: string[]; currentAdded: string[] }> = [];

    for (const tenant of tenants) {
      await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
      await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

      let cursorId: string | null = null;
      let tenantScanned = 0;
      let tenantChanged = 0;
      let tenantUpdated = 0;

      while (true) {
        const params = cursorId
          ? [tenant.id, batchSize, cursorId]
          : [tenant.id, batchSize];
        const cursorClause = cursorId ? 'AND id::text > $3' : '';
        const rows = await runner.query(
          `SELECT id::text AS id,
                  tenant_id::text AS tenant_id,
                  tool_name,
                  status,
                  mutation_input,
                  current_values
           FROM ai_mutation_previews
           WHERE tenant_id = $1
             AND tool_name = 'import_glpi_ticket'
             ${cursorClause}
           ORDER BY id::text ASC
           LIMIT $2`,
          params,
        ) as PreviewRow[];

        if (rows.length === 0) {
          break;
        }

        for (const row of rows) {
          tenantScanned += 1;
          totalScanned += 1;
          cursorId = row.id;

          const backfilled = backfillPreview(row);
          const changed = backfilled.mutationAdded.length > 0 || backfilled.currentAdded.length > 0;
          if (!changed) {
            continue;
          }

          tenantChanged += 1;
          totalChanged += 1;
          if (samples.length < SAMPLE_LIMIT) {
            samples.push({
              tenant: tenant.slug || tenant.id,
              previewId: row.id,
              status: row.status,
              mutationAdded: backfilled.mutationAdded,
              currentAdded: backfilled.currentAdded,
            });
          }

          if (apply) {
            await runner.query(
              `UPDATE ai_mutation_previews
               SET mutation_input = $1::jsonb,
                   current_values = $2::jsonb
               WHERE tenant_id = $3
                 AND id = $4
                 AND tool_name = 'import_glpi_ticket'`,
              [
                JSON.stringify(backfilled.mutation),
                backfilled.current == null ? null : JSON.stringify(backfilled.current),
                tenant.id,
                row.id,
              ],
            );
            tenantUpdated += 1;
            totalUpdated += 1;
          }
        }
      }

      console.log(`Tenant ${tenant.slug || tenant.id}: scanned=${tenantScanned}, wouldChange=${tenantChanged}, updated=${tenantUpdated}`);
    }

    if (samples.length > 0) {
      console.log('\nSample changed previews:');
      for (const sample of samples) {
        console.log(
          `- tenant=${sample.tenant} preview=${sample.previewId} status=${sample.status} `
          + `mutationAdded=[${sample.mutationAdded.join(', ')}] currentAdded=[${sample.currentAdded.join(', ')}]`,
        );
      }
    }

    console.log('\nSummary');
    console.log(`  scanned legacy import previews: ${totalScanned}`);
    console.log(`  previews needing generic metadata: ${totalChanged}`);
    console.log(`  previews updated: ${totalUpdated}`);
    console.log(apply ? 'Backfill apply completed.' : 'Backfill dry-run completed.');
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`GLPI import preview backfill failed: ${message}`);
  process.exit(1);
});
