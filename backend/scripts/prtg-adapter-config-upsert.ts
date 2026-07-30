// PRTG monitoring adapter-config upsert (Phase 15.A provisioning).
//
// Mirrors scripts/glpi-adapter-config-upsert.ts in safety UX: dry-run by
// default, apply requires BOTH PRTG_ADAPTER_CONFIG_APPLY=1 and the typed
// confirmation env var, and secret VALUES are never printed — only the
// computed tenant secret-ref env-var name and the material presence/shape.
//
// There is no package.json script for this tool (frozen file). Run it from
// backend/ with:
//
//   DATABASE_URL=postgres://... \
//   PRTG_ADAPTER_CONFIG_TENANT_SLUG=<tenant-slug> \
//   PRTG_ADAPTER_CONFIG_BASE_URL=https://<prtg-host> \
//   npx ts-node scripts/prtg-adapter-config-upsert.ts
//
// Apply mode (after the dry run reports "ready"):
//
//   PRTG_ADAPTER_CONFIG_APPLY=1 \
//   PRTG_ADAPTER_CONFIG_CONFIRM=prtg-adapter-config-secret-ref \
//   ... npx ts-node scripts/prtg-adapter-config-upsert.ts
//
// Environment:
//   PRTG_ADAPTER_CONFIG_TENANT_SLUG | PRTG_ADAPTER_CONFIG_TENANT_ID
//       Tenant scope — one of the two is REQUIRED (this script creates new
//       rows; it never fans out to every tenant).
//   PRTG_ADAPTER_CONFIG_BASE_URL
//       PRTG web server base URL, e.g. https://prtg.example.com
//   PRTG_ADAPTER_CONFIG_ENVIRONMENT
//       Adapter environment, default 'sandbox' (test instance first).
//   KANAP_SECRET_REF_<digest>
//       Credential material for secret ref tenant/<tenant-uuid>/monitoring/prtg
//       (env name is computed and printed by the dry run). Accepted shapes:
//       plain string = PRTG API token; JSON {"api_token":"..."} or
//       JSON {"username":"...","passhash":"..."} fallback.
//
// Resulting row: provider_kind='monitoring', provider_key='prtg',
// implementation='prtg', live_test_safety='live_read', credential_ref_json =
// { kind:'secret_ref', ref:'tenant/<tenant-uuid>/monitoring/prtg' }.

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { tenantSecretRefEnvName } from '../src/ai/control-plane/providers/tenant-secret-resolver.service';

type TenantRow = {
  id: string;
  slug: string;
};

type AdapterConfigRow = {
  id: string;
  enabled: boolean;
  implementation: string;
  environment: string;
  base_url: string | null;
  credential_ref_json: Record<string, unknown> | null;
};

type SecretReadiness = {
  available: boolean;
  materialShape: 'json' | 'plain_string' | 'missing' | 'malformed';
  hasApiToken: boolean;
  hasPasshashPair: boolean;
  message: string;
};

type TenantUpsertPlan = {
  tenant: TenantRow;
  adapter: AdapterConfigRow | null;
  baseUrl: string | null;
  proposedSecretRef: string;
  proposedSecretEnvName: string;
  secret: SecretReadiness;
  upsertReady: boolean;
  blockers: string[];
};

const APPLY_CONFIRMATION = 'prtg-adapter-config-secret-ref';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  const text = typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
  return text.length > 0 ? text : null;
}

function readSecretMaterial(envName: string): SecretReadiness {
  const raw = process.env[envName];
  if (typeof raw !== 'string' || raw.length === 0) {
    return {
      available: false,
      materialShape: 'missing',
      hasApiToken: false,
      hasPasshashPair: false,
      message: 'Proposed secret environment variable is not set.',
    };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return {
      available: true,
      materialShape: 'plain_string',
      hasApiToken: true,
      hasPasshashPair: false,
      message: 'Plain API-token material is present and compatible.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      available: false,
      materialShape: 'malformed',
      hasApiToken: false,
      hasPasshashPair: false,
      message: 'Secret material starts like JSON but does not parse.',
    };
  }
  if (!isRecord(parsed)) {
    return {
      available: false,
      materialShape: 'malformed',
      hasApiToken: false,
      hasPasshashPair: false,
      message: 'Secret JSON material must be an object.',
    };
  }

  const hasApiToken = !!textOrNull(parsed.api_token);
  const hasPasshashPair = !!textOrNull(parsed.username) && !!textOrNull(parsed.passhash);
  return {
    available: hasApiToken || hasPasshashPair,
    materialShape: 'json',
    hasApiToken,
    hasPasshashPair,
    message: hasApiToken || hasPasshashPair
      ? 'JSON secret material is present and matches an accepted PRTG credential shape.'
      : 'JSON secret material must include api_token, or username and passhash.',
  };
}

function readBaseUrl(): { baseUrl: string | null; blocker: string | null } {
  const raw = String(process.env.PRTG_ADAPTER_CONFIG_BASE_URL || '').trim();
  if (!raw) {
    return { baseUrl: null, blocker: 'base_url_missing' };
  }
  if (!/^https?:\/\//i.test(raw)) {
    return { baseUrl: null, blocker: 'base_url_invalid' };
  }
  return { baseUrl: raw.replace(/\/+$/, ''), blocker: null };
}

async function resolveTenants(runner: ReturnType<DataSource['createQueryRunner']>): Promise<TenantRow[]> {
  const tenantSlugFilter = String(process.env.PRTG_ADAPTER_CONFIG_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.PRTG_ADAPTER_CONFIG_TENANT_ID || '').trim();

  if (!tenantSlugFilter && !tenantIdFilter) {
    throw new Error('Set PRTG_ADAPTER_CONFIG_TENANT_SLUG or PRTG_ADAPTER_CONFIG_TENANT_ID: this script always runs tenant-scoped.');
  }

  if (tenantIdFilter) {
    return await runner.query(
      `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
       FROM tenants
       WHERE id = $1
       ORDER BY slug`,
      [tenantIdFilter],
    ) as TenantRow[];
  }

  return await runner.query(
    `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
     FROM tenants
     WHERE slug = $1
     ORDER BY slug`,
    [tenantSlugFilter],
  ) as TenantRow[];
}

async function inspectTenant(
  runner: ReturnType<DataSource['createQueryRunner']>,
  tenant: TenantRow,
): Promise<TenantUpsertPlan> {
  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

  const adapterRows = await runner.query(
    `SELECT id::text AS id,
            enabled,
            implementation,
            environment,
            base_url,
            credential_ref_json
     FROM ai_adapter_configs
     WHERE tenant_id = $1
       AND provider_kind = 'monitoring'
       AND provider_key = 'prtg'
     LIMIT 1`,
    [tenant.id],
  ) as AdapterConfigRow[];
  const adapter = adapterRows[0] ?? null;

  const proposedSecretRef = `tenant/${tenant.id}/monitoring/prtg`;
  const proposedSecretEnvName = tenantSecretRefEnvName({
    tenantId: tenant.id,
    ref: proposedSecretRef,
  });
  const secret = readSecretMaterial(proposedSecretEnvName);
  const { baseUrl, blocker: baseUrlBlocker } = readBaseUrl();

  const blockers: string[] = [];
  if (baseUrlBlocker) {
    blockers.push(baseUrlBlocker);
  }
  if (adapter) {
    blockers.push('adapter_config_already_exists');
  }
  if (!secret.available) {
    blockers.push('proposed_secret_not_ready');
  }

  return {
    tenant,
    adapter,
    baseUrl,
    proposedSecretRef,
    proposedSecretEnvName,
    secret,
    upsertReady: blockers.length === 0,
    blockers,
  };
}

async function upsertTenant(
  runner: ReturnType<DataSource['createQueryRunner']>,
  plan: TenantUpsertPlan,
  environment: string,
): Promise<number> {
  if (!plan.baseUrl) {
    throw new Error(`Tenant ${plan.tenant.slug || plan.tenant.id} has no PRTG base URL (PRTG_ADAPTER_CONFIG_BASE_URL)`);
  }

  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [plan.tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [plan.tenant.slug || '']);

  const credentialRef = {
    kind: 'secret_ref',
    ref: plan.proposedSecretRef,
    tenant_id: plan.tenant.id,
  };
  const metadata = {
    created_by: 'prtg_adapter_config_upsert',
    integration: 'phase15_monitoring',
  };
  const rows = await runner.query(
    `WITH inserted AS (
       INSERT INTO ai_adapter_configs (
         tenant_id,
         provider_kind,
         provider_key,
         implementation,
         environment,
         enabled,
         display_name,
         base_url,
         credential_ref_json,
         capability_allowlist_json,
         live_test_safety,
         timeout_seconds,
         rate_limit_json,
         metadata_json,
         created_at,
         updated_at
       )
       SELECT
         $1,
         'monitoring',
         'prtg',
         'prtg',
         $2,
         true,
         'PRTG Monitoring',
         $3,
         $4::jsonb,
         NULL,
         'live_read',
         NULL,
         NULL,
         $5::jsonb,
         now(),
         now()
       WHERE NOT EXISTS (
         SELECT 1
         FROM ai_adapter_configs
         WHERE tenant_id = $1
           AND provider_kind = 'monitoring'
           AND provider_key = 'prtg'
       )
       RETURNING 1
     )
     SELECT count(*)::int AS count FROM inserted`,
    [
      plan.tenant.id,
      environment,
      plan.baseUrl,
      JSON.stringify(credentialRef),
      JSON.stringify(metadata),
    ],
  ) as Array<{ count: string | number }>;
  const inserted = Number(rows[0]?.count ?? 0);
  return Number.isFinite(inserted) ? inserted : 0;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const apply = String(process.env.PRTG_ADAPTER_CONFIG_APPLY || '').trim() === '1';
  const confirmation = String(process.env.PRTG_ADAPTER_CONFIG_CONFIRM || '').trim();
  if (apply && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`Apply mode requires PRTG_ADAPTER_CONFIG_CONFIRM=${APPLY_CONFIRMATION}`);
  }
  const environment = String(process.env.PRTG_ADAPTER_CONFIG_ENVIRONMENT || 'sandbox').trim() || 'sandbox';

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
      throw new Error('No tenants found for upsert scope');
    }

    console.log(`PRTG adapter-config secret-ref upsert (${apply ? 'apply' : 'dry-run'})`);
    console.log(`Tenants in scope: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}`);
    console.log(`Adapter environment: ${environment}`);
    console.log('Secret values are never printed; only the computed env-var name and material presence are.');
    if (!apply) {
      console.log('No rows will be inserted. Set PRTG_ADAPTER_CONFIG_APPLY=1 and the confirmation env var to apply.');
    }
    console.log('');

    const plans: TenantUpsertPlan[] = [];
    for (const tenant of tenants) {
      plans.push(await inspectTenant(runner, tenant));
    }

    for (const plan of plans) {
      console.log(`Tenant ${plan.tenant.slug || plan.tenant.id}`);
      console.log(`  base_url_present=${!!plan.baseUrl}`);
      console.log(`  existing_adapter_config=${plan.adapter ? `${plan.adapter.implementation}/${plan.adapter.environment}` : 'none'}`);
      console.log(`  proposed_secret_ref=${plan.proposedSecretRef}`);
      console.log(`  proposed_secret_env=${plan.proposedSecretEnvName}`);
      console.log(`  proposed_secret_shape=${plan.secret.materialShape}`);
      console.log(`  proposed_secret_has_api_token=${plan.secret.hasApiToken}`);
      console.log(`  proposed_secret_has_passhash_pair=${plan.secret.hasPasshashPair}`);
      console.log(`  readiness=${plan.upsertReady ? 'ready' : `blocked:${plan.blockers.join(',')}`}`);
      console.log(`  secret_message=${plan.secret.message}`);
    }

    const blockedPlans = plans.filter((plan) => !plan.upsertReady);
    if (apply && blockedPlans.length > 0) {
      throw new Error(
        `Adapter-config upsert refused: ${blockedPlans.length} tenant(s) are not ready. `
        + 'Provide the proposed secret material and base URL, remove existing shadowing adapter configs, or scope to a ready tenant.',
      );
    }

    let inserted = 0;
    if (apply) {
      for (const plan of plans) {
        await runner.startTransaction();
        try {
          inserted += await upsertTenant(runner, plan, environment);
          await runner.commitTransaction();
        } catch (error) {
          await runner.rollbackTransaction();
          throw error;
        }
      }
    }

    console.log('\nSummary');
    console.log(`  inspected tenant rows: ${plans.length}`);
    console.log(`  upsert-ready tenants: ${plans.filter((plan) => plan.upsertReady).length}`);
    console.log(`  blocked tenants: ${blockedPlans.length}`);
    console.log(`  adapter configs inserted: ${inserted}`);
    console.log(apply ? 'Adapter-config upsert completed.' : 'Adapter-config upsert dry-run completed.');
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`PRTG adapter-config upsert failed: ${message}`);
  process.exit(1);
});
