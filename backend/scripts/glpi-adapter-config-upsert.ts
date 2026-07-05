import 'dotenv/config';
import { DataSource } from 'typeorm';
import { tenantSecretRefEnvName } from '../src/ai/control-plane/providers/tenant-secret-resolver.service';

type TenantRow = {
  id: string;
  slug: string;
};

type LegacySettingsRow = {
  tenant_id: string;
  glpi_enabled: boolean | null;
  glpi_url: string | null;
  glpi_user_token_encrypted: string | null;
  glpi_app_token_encrypted: string | null;
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
  hasUserToken: boolean;
  hasAppToken: boolean;
  message: string;
};

type TenantUpsertPlan = {
  tenant: TenantRow;
  legacy: LegacySettingsRow | null;
  adapter: AdapterConfigRow | null;
  proposedSecretRef: string;
  proposedSecretEnvName: string;
  secret: SecretReadiness;
  upsertReady: boolean;
  blockers: string[];
};

const APPLY_CONFIRMATION = 'adapter-config-secret-ref';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  const text = typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
  return text.length > 0 ? text : null;
}

function readSecretMaterial(envName: string, legacyHasAppToken: boolean): SecretReadiness {
  const raw = process.env[envName];
  if (typeof raw !== 'string' || raw.length === 0) {
    return {
      available: false,
      materialShape: 'missing',
      hasUserToken: false,
      hasAppToken: false,
      message: 'Proposed secret environment variable is not set.',
    };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return {
      available: !legacyHasAppToken,
      materialShape: 'plain_string',
      hasUserToken: trimmed.length > 0,
      hasAppToken: false,
      message: legacyHasAppToken
        ? 'Plain user-token material is present, but legacy settings also include an app token; use JSON material to preserve it.'
        : 'Plain user-token material is present and compatible.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      available: false,
      materialShape: 'malformed',
      hasUserToken: false,
      hasAppToken: false,
      message: 'Secret material starts like JSON but does not parse.',
    };
  }
  if (!isRecord(parsed)) {
    return {
      available: false,
      materialShape: 'malformed',
      hasUserToken: false,
      hasAppToken: false,
      message: 'Secret JSON material must be an object.',
    };
  }

  const hasUserToken = !!(textOrNull(parsed.glpi_user_token) ?? textOrNull(parsed.user_token));
  const hasAppToken = !!(textOrNull(parsed.glpi_app_token) ?? textOrNull(parsed.app_token));
  return {
    available: hasUserToken && (!legacyHasAppToken || hasAppToken),
    materialShape: 'json',
    hasUserToken,
    hasAppToken,
    message: hasUserToken && (!legacyHasAppToken || hasAppToken)
      ? 'JSON secret material is present and matches the legacy token requirements.'
      : legacyHasAppToken
        ? 'JSON secret material must include glpi_user_token/user_token and glpi_app_token/app_token.'
        : 'JSON secret material must include glpi_user_token or user_token.',
  };
}

async function resolveTenants(runner: ReturnType<DataSource['createQueryRunner']>): Promise<TenantRow[]> {
  const tenantSlugFilter = String(process.env.GLPI_ADAPTER_CONFIG_UPSERT_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.GLPI_ADAPTER_CONFIG_UPSERT_TENANT_ID || '').trim();

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

async function inspectTenant(
  runner: ReturnType<DataSource['createQueryRunner']>,
  tenant: TenantRow,
): Promise<TenantUpsertPlan | null> {
  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

  const legacyRows = await runner.query(
    `SELECT tenant_id::text AS tenant_id,
            glpi_enabled,
            glpi_url,
            glpi_user_token_encrypted,
            glpi_app_token_encrypted
     FROM ai_settings
     WHERE tenant_id = $1
       AND (
         COALESCE(glpi_enabled, false) = true
         OR glpi_url IS NOT NULL
         OR glpi_user_token_encrypted IS NOT NULL
         OR glpi_app_token_encrypted IS NOT NULL
       )
     LIMIT 1`,
    [tenant.id],
  ) as LegacySettingsRow[];
  const legacy = legacyRows[0] ?? null;

  const adapterRows = await runner.query(
    `SELECT id::text AS id,
            enabled,
            implementation,
            environment,
            base_url,
            credential_ref_json
     FROM ai_adapter_configs
     WHERE tenant_id = $1
       AND provider_kind = 'ticketing'
       AND provider_key = 'glpi'
     LIMIT 1`,
    [tenant.id],
  ) as AdapterConfigRow[];
  const adapter = adapterRows[0] ?? null;

  if (!legacy && !adapter) {
    return null;
  }

  const proposedSecretRef = `tenant/${tenant.id}/ticketing/glpi`;
  const proposedSecretEnvName = tenantSecretRefEnvName({
    tenantId: tenant.id,
    ref: proposedSecretRef,
  });
  const secret = readSecretMaterial(proposedSecretEnvName, !!legacy?.glpi_app_token_encrypted);
  const blockers: string[] = [];
  if (!legacy) {
    blockers.push('legacy_glpi_settings_missing');
  } else {
    if (legacy.glpi_enabled !== true) {
      blockers.push('legacy_glpi_disabled');
    }
    if (!legacy.glpi_url) {
      blockers.push('legacy_glpi_url_missing');
    }
    if (!legacy.glpi_user_token_encrypted) {
      blockers.push('legacy_glpi_user_token_missing');
    }
  }
  if (adapter) {
    blockers.push('adapter_config_already_exists');
  }
  if (!secret.available) {
    blockers.push('proposed_secret_not_ready');
  }

  return {
    tenant,
    legacy,
    adapter,
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
  if (!plan.legacy?.glpi_url) {
    throw new Error(`Tenant ${plan.tenant.slug || plan.tenant.id} is missing a legacy GLPI URL`);
  }

  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [plan.tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [plan.tenant.slug || '']);

  const credentialRef = {
    kind: 'secret_ref',
    ref: plan.proposedSecretRef,
    tenant_id: plan.tenant.id,
  };
  const metadata = {
    created_by: 'glpi_adapter_config_upsert',
    legacy_source: 'ai_settings',
    migration: 'glpi_decoupling',
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
         'ticketing',
         'glpi',
         'glpi',
         $2,
         true,
         'GLPI Ticketing',
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
           AND provider_kind = 'ticketing'
           AND provider_key = 'glpi'
       )
       RETURNING 1
     )
     SELECT count(*)::int AS count FROM inserted`,
    [
      plan.tenant.id,
      environment,
      plan.legacy.glpi_url,
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

  const apply = String(process.env.GLPI_ADAPTER_CONFIG_UPSERT_APPLY || '').trim() === '1';
  const confirmation = String(process.env.GLPI_ADAPTER_CONFIG_UPSERT_CONFIRM || '').trim();
  if (apply && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`Apply mode requires GLPI_ADAPTER_CONFIG_UPSERT_CONFIRM=${APPLY_CONFIRMATION}`);
  }
  const environment = String(process.env.GLPI_ADAPTER_CONFIG_UPSERT_ENVIRONMENT || 'production').trim() || 'production';

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

    console.log(`GLPI adapter-config secret-ref upsert (${apply ? 'apply' : 'dry-run'})`);
    console.log(`Tenants in scope: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}`);
    console.log(`Adapter environment: ${environment}`);
    console.log('Secret values are never printed and legacy token columns are never selected.');
    if (!apply) {
      console.log('No rows will be inserted. Set GLPI_ADAPTER_CONFIG_UPSERT_APPLY=1 and the confirmation env var to apply.');
    }
    console.log('');

    const plans: TenantUpsertPlan[] = [];
    for (const tenant of tenants) {
      const plan = await inspectTenant(runner, tenant);
      if (plan) {
        plans.push(plan);
      }
    }

    if (plans.length === 0) {
      console.log('No legacy GLPI settings or ticketing/glpi adapter configs found in scope.');
    }

    for (const plan of plans) {
      console.log(`Tenant ${plan.tenant.slug || plan.tenant.id}`);
      console.log(`  legacy_enabled=${plan.legacy?.glpi_enabled === true}`);
      console.log(`  legacy_url_present=${!!plan.legacy?.glpi_url}`);
      console.log(`  legacy_user_token_present=${!!plan.legacy?.glpi_user_token_encrypted}`);
      console.log(`  legacy_app_token_present=${!!plan.legacy?.glpi_app_token_encrypted}`);
      console.log(`  existing_adapter_config=${plan.adapter ? `${plan.adapter.implementation}/${plan.adapter.environment}` : 'none'}`);
      console.log(`  proposed_secret_ref=${plan.proposedSecretRef}`);
      console.log(`  proposed_secret_env=${plan.proposedSecretEnvName}`);
      console.log(`  proposed_secret_shape=${plan.secret.materialShape}`);
      console.log(`  proposed_secret_has_user_token=${plan.secret.hasUserToken}`);
      console.log(`  proposed_secret_has_app_token=${plan.secret.hasAppToken}`);
      console.log(`  readiness=${plan.upsertReady ? 'ready' : `blocked:${plan.blockers.join(',')}`}`);
      console.log(`  secret_message=${plan.secret.message}`);
    }

    const blockedPlans = plans.filter((plan) => !plan.upsertReady);
    if (apply && blockedPlans.length > 0) {
      throw new Error(
        `Adapter-config upsert refused: ${blockedPlans.length} tenant(s) are not ready. `
        + 'Provide the proposed secret material, remove existing shadowing adapter configs, or scope to a ready tenant.',
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
  console.error(`GLPI adapter-config upsert failed: ${message}`);
  process.exit(1);
});
