import 'dotenv/config';
import { DataSource } from 'typeorm';

type TenantRow = {
  id: string;
  slug: string;
};

type TenantRenameReadiness = {
  tenant: TenantRow;
  pendingEvaluations: number;
  activeActionRequests: number;
  legacyActionWorkflows: number;
  legacyObservations: number;
  legacyRecommendations: number;
  legacyEvaluations: number;
  glpiBrandedDefinitions: number;
  blockers: string[];
};

type SchedulerRow = {
  name: string;
  description: string | null;
  cron_expression: string;
  enabled: boolean;
  last_status: string | null;
  last_run_at: Date | string | null;
};

const TERMINAL_ACTION_STATUSES = ['executed', 'rejected', 'expired', 'failed'];
const TERMINAL_EVALUATION_STATUSES = ['completed', 'failed', 'cancelled', 'expired'];

const PROPOSED_MAPPING = [
  ['agent_control_center_glpi_triage', 'agent_control_center_ticketing_triage'],
  ['agent_control_center_glpi_read', 'agent_control_center_ticketing_read'],
  ['uat/glpi-triage', 'uat/ticketing-triage'],
  ['glpi_ticket_triage', 'ticketing_ticket_triage'],
  ['glpi_triage_actions', 'ticketing_triage_actions'],
  ['glpi_triage_uat', 'ticketing_triage_uat'],
  ['glpi_triage_proposal', 'ticketing_triage_proposal'],
];

async function resolveTenants(runner: ReturnType<DataSource['createQueryRunner']>): Promise<TenantRow[]> {
  const tenantSlugFilter = String(process.env.GLPI_TRIAGE_RENAME_READINESS_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.GLPI_TRIAGE_RENAME_READINESS_TENANT_ID || '').trim();

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

async function countRows(
  runner: ReturnType<DataSource['createQueryRunner']>,
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const rows = await runner.query(sql, params) as Array<{ count: string | number }>;
  const value = Number(rows[0]?.count ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function inspectTenant(
  runner: ReturnType<DataSource['createQueryRunner']>,
  tenant: TenantRow,
): Promise<TenantRenameReadiness> {
  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

  const pendingEvaluations = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_evaluations
     WHERE tenant_id = $1
       AND metadata_json->>'evaluation_type' IN ('glpi_triage_proposal', 'glpi_triage_uat')
       AND status <> ALL($2::text[])`,
    [tenant.id, TERMINAL_EVALUATION_STATUSES],
  );
  const activeActionRequests = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_action_requests
     WHERE tenant_id = $1
       AND (
         metadata_json->>'uat_workflow' IN ('agent_control_center_glpi_triage', 'agent_control_center_glpi_read')
         OR metadata_json->>'source_endpoint' = 'uat/glpi-triage'
       )
       AND status <> ALL($2::text[])`,
    [tenant.id, TERMINAL_ACTION_STATUSES],
  );
  const legacyActionWorkflows = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_action_requests
     WHERE tenant_id = $1
       AND (
         metadata_json->>'uat_workflow' IN ('agent_control_center_glpi_triage', 'agent_control_center_glpi_read')
         OR metadata_json->>'source_endpoint' = 'uat/glpi-triage'
       )`,
    [tenant.id],
  );
  const legacyObservations = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_observations
     WHERE tenant_id = $1
       AND observation_type = 'glpi_ticket_triage'`,
    [tenant.id],
  );
  const legacyRecommendations = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_recommendations
     WHERE tenant_id = $1
       AND recommendation_type = 'glpi_triage_actions'`,
    [tenant.id],
  );
  const legacyEvaluations = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_evaluations
     WHERE tenant_id = $1
       AND metadata_json->>'evaluation_type' IN ('glpi_triage_proposal', 'glpi_triage_uat')`,
    [tenant.id],
  );
  const glpiBrandedDefinitions = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_agent_definitions d
     LEFT JOIN ai_agent_triggers t
       ON t.tenant_id = d.tenant_id
       AND t.agent_definition_id = d.id
     WHERE d.tenant_id = $1
       AND (
         d.agent_key LIKE 'helpdesk.glpi.%'
         OR d.provider_bindings_json#>>'{ticketing,provider_key}' = 'glpi'
         OR d.scope_policy_json#>>'{provider_key}' = 'glpi'
         OR t.scope_policy_json#>>'{provider_key}' = 'glpi'
       )`,
    [tenant.id],
  );

  const blockers: string[] = [];
  if (pendingEvaluations > 0) blockers.push('pending_glpi_evaluations');
  if (activeActionRequests > 0) blockers.push('active_glpi_action_requests');
  if (glpiBrandedDefinitions > 0) blockers.push('glpi_branded_definitions_or_triggers');

  return {
    tenant,
    pendingEvaluations,
    activeActionRequests,
    legacyActionWorkflows,
    legacyObservations,
    legacyRecommendations,
    legacyEvaluations,
    glpiBrandedDefinitions,
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

    console.log('GLPI triage persisted-key rename readiness (read-only)');
    console.log(`Tenants in scope: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}`);
    console.log('\nProposed discriminator/source mappings already accepted by compatibility gates:');
    for (const [from, to] of PROPOSED_MAPPING) {
      console.log(`  ${from} -> ${to}`);
    }
    console.log('\nStored agent key and scheduler task renames are not applied by this helper; preserve operator cron/enabled state before changing them.\n');

    const schedulerRows = await runner.query(
      `SELECT name,
              description,
              cron_expression,
              enabled,
              last_status,
              last_run_at
       FROM scheduled_tasks
       WHERE name IN ('ai-helpdesk-glpi-new-ticket-ingestion')
          OR name LIKE '%glpi%'
       ORDER BY name`,
    ) as SchedulerRow[];

    if (schedulerRows.length > 0) {
      console.log('Scheduler rows requiring rename planning:');
      for (const row of schedulerRows) {
        const status = row.last_status ?? 'never';
        const running = status === 'running' ? ' BLOCKER:last_status_running' : '';
        console.log(
          `  ${row.name}: enabled=${row.enabled}, cron=${row.cron_expression}, last_status=${status}${running}`,
        );
      }
      console.log('');
    }

    let totalPendingEvaluations = 0;
    let totalActiveActions = 0;
    let totalLegacyWorkflows = 0;
    let totalLegacyObservations = 0;
    let totalLegacyRecommendations = 0;
    let totalLegacyEvaluations = 0;
    let totalGlpiDefinitions = 0;
    let blockedTenants = 0;

    for (const tenant of tenants) {
      const result = await inspectTenant(runner, tenant);
      const hasLegacyRows = result.legacyActionWorkflows > 0
        || result.legacyObservations > 0
        || result.legacyRecommendations > 0
        || result.legacyEvaluations > 0
        || result.glpiBrandedDefinitions > 0;
      if (!hasLegacyRows && result.blockers.length === 0) {
        continue;
      }
      totalPendingEvaluations += result.pendingEvaluations;
      totalActiveActions += result.activeActionRequests;
      totalLegacyWorkflows += result.legacyActionWorkflows;
      totalLegacyObservations += result.legacyObservations;
      totalLegacyRecommendations += result.legacyRecommendations;
      totalLegacyEvaluations += result.legacyEvaluations;
      totalGlpiDefinitions += result.glpiBrandedDefinitions;
      if (result.blockers.length > 0) {
        blockedTenants += 1;
      }

      console.log(`Tenant ${result.tenant.slug || result.tenant.id}`);
      console.log(`  pending_glpi_evaluations=${result.pendingEvaluations}`);
      console.log(`  active_glpi_action_requests=${result.activeActionRequests}`);
      console.log(`  legacy_action_workflow_rows=${result.legacyActionWorkflows}`);
      console.log(`  legacy_observation_rows=${result.legacyObservations}`);
      console.log(`  legacy_recommendation_rows=${result.legacyRecommendations}`);
      console.log(`  legacy_evaluation_rows=${result.legacyEvaluations}`);
      console.log(`  glpi_branded_definition_or_trigger_rows=${result.glpiBrandedDefinitions}`);
      console.log(`  readiness=${result.blockers.length === 0 ? 'ready_for_planned_rename' : `blocked:${result.blockers.join(',')}`}`);
    }

    const schedulerRunning = schedulerRows.some((row) => row.last_status === 'running');
    console.log('\nSummary');
    console.log(`  blocked tenants: ${blockedTenants}`);
    console.log(`  pending GLPI evaluations: ${totalPendingEvaluations}`);
    console.log(`  active GLPI action requests: ${totalActiveActions}`);
    console.log(`  legacy action workflow rows: ${totalLegacyWorkflows}`);
    console.log(`  legacy observation rows: ${totalLegacyObservations}`);
    console.log(`  legacy recommendation rows: ${totalLegacyRecommendations}`);
    console.log(`  legacy evaluation rows: ${totalLegacyEvaluations}`);
    console.log(`  GLPI-branded definition/trigger rows: ${totalGlpiDefinitions}`);
    console.log(`  GLPI scheduler rows: ${schedulerRows.length}`);
    console.log(`  scheduler running: ${schedulerRunning}`);
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`GLPI triage rename readiness failed: ${message}`);
  process.exit(1);
});
