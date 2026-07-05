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

type TenantReadiness = {
  tenant: TenantRow;
  legacy: LegacySettingsRow | null;
  adapter: AdapterConfigRow | null;
  proposedSecretRef: string;
  proposedSecretEnvName: string;
  secret: SecretReadiness;
  upsertReady: boolean;
  blockers: string[];
};

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
  const tenantSlugFilter = String(process.env.GLPI_ADAPTER_CONFIG_READINESS_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.GLPI_ADAPTER_CONFIG_READINESS_TENANT_ID || '').trim();

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
): Promise<TenantReadiness | null> {
  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

  const settingsRows = await runner.query(
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
  const legacy = settingsRows[0] ?? null;

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
      throw new Error('No tenants found for readiness scope');
    }

    console.log('GLPI adapter-config migration readiness (read-only)');
    console.log(`Tenants in scope: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}`);
    console.log('Secret values are never printed.\n');

    const results: TenantReadiness[] = [];
    for (const tenant of tenants) {
      const result = await inspectTenant(runner, tenant);
      if (result) {
        results.push(result);
      }
    }

    if (results.length === 0) {
      console.log('No legacy GLPI settings or ticketing/glpi adapter configs found in scope.');
      return;
    }

    for (const result of results) {
      console.log(`Tenant ${result.tenant.slug || result.tenant.id}`);
      console.log(`  legacy_glpi_enabled=${result.legacy?.glpi_enabled === true}`);
      console.log(`  legacy_has_url=${!!result.legacy?.glpi_url}`);
      console.log(`  legacy_has_user_token=${!!result.legacy?.glpi_user_token_encrypted}`);
      console.log(`  legacy_has_app_token=${!!result.legacy?.glpi_app_token_encrypted}`);
      console.log(`  adapter_config_exists=${!!result.adapter}`);
      if (result.adapter) {
        console.log(
          `  adapter_config=implementation:${result.adapter.implementation}, `
          + `environment:${result.adapter.environment}, enabled:${result.adapter.enabled}`,
        );
      }
      console.log(`  proposed_secret_ref=${result.proposedSecretRef}`);
      console.log(`  proposed_secret_env=${result.proposedSecretEnvName}`);
      console.log(
        `  proposed_secret_ready=${result.secret.available} `
        + `(shape=${result.secret.materialShape}, has_user_token=${result.secret.hasUserToken}, has_app_token=${result.secret.hasAppToken})`,
      );
      console.log(`  readiness=${result.upsertReady ? 'ready' : `blocked:${result.blockers.join(',')}`}`);
      console.log(`  note=${result.secret.message}`);
    }

    const ready = results.filter((result) => result.upsertReady).length;
    console.log('\nSummary');
    console.log(`  tenants with legacy/settings coverage: ${results.length}`);
    console.log(`  adapter upsert ready: ${ready}`);
    console.log(`  blocked: ${results.length - ready}`);
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`GLPI adapter-config readiness failed: ${message}`);
  process.exit(1);
});
