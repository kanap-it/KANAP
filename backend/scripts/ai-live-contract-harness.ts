import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { DataSource, EntityManager } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  AiLiveContractHarnessService,
  LIVE_CONTRACT_SCENARIOS,
  LiveContractScenarioKey,
} from '../src/ai/control-plane/live-readiness/ai-live-contract-harness.service';

type TenantRow = {
  id: string;
  slug: string;
};

type UserRow = {
  id: string;
};

function usage(): string {
  const scenarios = Object.keys(LIVE_CONTRACT_SCENARIOS).join('|');
  return [
    `Usage: npm run live-readiness:contract -- <${scenarios}> [--run]`,
    '',
    'Required environment:',
    '  DATABASE_URL=postgres://...',
    '  KANAP_LIVE_CONTRACT_TESTS=1',
    '  KANAP_LIVE_TENANT_SLUG=<tenant-slug>',
    '  KANAP_LIVE_USER_ID=<enabled tenant user uuid> (optional; auto-resolves for --run)',
    '  provider gate for the scenario, for example KANAP_GLPI_LIVE_READ=1',
  ].join('\n');
}

function parseScenario(argv: string[]): LiveContractScenarioKey {
  const scenario = argv.find((arg) => !arg.startsWith('--'));
  if (!scenario || !(scenario in LIVE_CONTRACT_SCENARIOS)) {
    throw new Error(usage());
  }
  return scenario as LiveContractScenarioKey;
}

function requireTenantSlug(): string {
  const slug = process.env.KANAP_LIVE_TENANT_SLUG?.trim();
  if (!slug) {
    throw new Error('KANAP_LIVE_TENANT_SLUG is required.');
  }
  return slug;
}

async function resolveTenant(dataSource: DataSource, slug: string): Promise<TenantRow> {
  const rows = await dataSource.query(
    `SELECT id::text AS id, slug::text AS slug
     FROM tenants
     WHERE lower(slug::text) = lower($1)
       AND deleted_at IS NULL
     LIMIT 1`,
    [slug],
  ) as TenantRow[];
  const tenant = rows[0];
  if (!tenant?.id || !tenant.slug) {
    throw new Error(`No active tenant found for KANAP_LIVE_TENANT_SLUG=${slug}.`);
  }
  const expectedTenantId = process.env.KANAP_LIVE_TENANT_ID?.trim();
  if (expectedTenantId && expectedTenantId !== tenant.id) {
    throw new Error('KANAP_LIVE_TENANT_ID does not match KANAP_LIVE_TENANT_SLUG.');
  }
  return tenant;
}

async function resolveHarnessUserId(
  manager: EntityManager,
  tenantId: string,
  opts: { required: boolean },
): Promise<string> {
  const configuredUserId = process.env.KANAP_LIVE_USER_ID?.trim();
  if (configuredUserId) {
    const rows = await manager.query(
      `SELECT id::text AS id
       FROM users
       WHERE id = $1
         AND tenant_id = $2
         AND status = 'enabled'
       LIMIT 1`,
      [configuredUserId, tenantId],
    ) as UserRow[];
    const user = rows[0];
    if (!user?.id) {
      throw new Error('KANAP_LIVE_USER_ID must reference an enabled user in KANAP_LIVE_TENANT_SLUG.');
    }
    return user.id;
  }

  const rows = await manager.query(
    `SELECT id::text AS id
     FROM users
     WHERE tenant_id = $1
       AND status = 'enabled'
     ORDER BY created_at ASC
     LIMIT 1`,
    [tenantId],
  ) as UserRow[];
  const user = rows[0];
  if (!user?.id) {
    if (opts.required) {
      throw new Error('No enabled tenant user found. Set KANAP_LIVE_USER_ID for --run.');
    }
    return '';
  }
  return user.id;
}

function printStatus(status: Awaited<ReturnType<AiLiveContractHarnessService['readiness']>>): void {
  if (status.status !== 'ready') {
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  console.log(JSON.stringify({
    status: status.status,
    scenario: status.scenario,
    target: {
      id: status.target.id,
      provider_kind: status.target.provider_kind,
      provider_key: status.target.provider_key,
      environment: status.target.environment,
      target_kind: status.target.target_kind,
      target_key: status.target.target_key,
      allowed_effect: status.target.allowed_effect,
      safety_label: status.target.safety_label,
      expires_at: status.target.expires_at,
    },
  }, null, 2));
}

async function main(): Promise<void> {
  const scenario = parseScenario(process.argv.slice(2));
  const shouldRun = process.argv.includes('--run');
  const tenantSlug = requireTenantSlug();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const dataSource = app.get(DataSource);
    const harness = app.get(AiLiveContractHarnessService);
    const tenant = await resolveTenant(dataSource, tenantSlug);
    await dataSource.transaction(async (manager) => {
      await manager.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);
      const userId = await resolveHarnessUserId(manager, tenant.id, { required: shouldRun });
      const context = {
        tenantId: tenant.id,
        userId,
        isPlatformHost: false,
        surface: 'chat' as const,
        authMethod: 'jwt' as const,
        requestId: `phase8-live-${randomUUID()}`,
        manager,
      };
      const status = await harness.readiness(context, scenario, process.env);
      if (status.status !== 'ready') {
        printStatus(status);
        if (status.status === 'failed') {
          process.exitCode = 2;
        }
        return;
      }
      printStatus(status);
      if (!shouldRun) {
        return;
      }
      await harness.run(context, scenario, process.env);
      console.log(JSON.stringify({ status: 'completed', scenario }, null, 2));
    });
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
