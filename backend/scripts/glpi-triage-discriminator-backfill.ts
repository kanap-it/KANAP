import 'dotenv/config';
import { DataSource } from 'typeorm';

type TenantRow = {
  id: string;
  slug: string;
};

type TenantBackfillPlan = {
  tenant: TenantRow;
  pendingEvaluations: number;
  activeActionRequests: number;
  actionWorkflowFields: number;
  actionSourceEndpointFields: number;
  observations: number;
  recommendations: number;
  evaluations: number;
  glpiBrandedDefinitions: number;
  blockers: string[];
  warnings: string[];
};

type TenantBackfillResult = {
  tenant: TenantRow;
  actionWorkflowFields: number;
  actionSourceEndpointFields: number;
  observations: number;
  recommendations: number;
  evaluations: number;
};

type SampleRow = {
  tenant_slug: string | null;
  row_kind: string;
  row_id: string;
  old_value: string;
  status: string | null;
  created_at: Date | string | null;
};

const TERMINAL_ACTION_STATUSES = ['executed', 'rejected', 'expired', 'failed'];
const TERMINAL_EVALUATION_STATUSES = ['completed', 'failed', 'cancelled', 'expired'];
const APPLY_CONFIRMATION = 'ticketing-discriminator-backfill';

async function resolveTenants(runner: ReturnType<DataSource['createQueryRunner']>): Promise<TenantRow[]> {
  const tenantSlugFilter = String(process.env.GLPI_TRIAGE_DISCRIMINATOR_BACKFILL_TENANT_SLUG || '').trim();
  const tenantIdFilter = String(process.env.GLPI_TRIAGE_DISCRIMINATOR_BACKFILL_TENANT_ID || '').trim();

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
): Promise<TenantBackfillPlan> {
  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

  const pendingEvaluations = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_evaluations
     WHERE tenant_id = $1
       AND metadata_json->>'evaluation_type' IN ('glpi_triage_proposal', 'glpi_triage_uat')
       AND NOT (status = ANY($2::text[]))`,
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
       AND NOT (status = ANY($2::text[]))`,
    [tenant.id, TERMINAL_ACTION_STATUSES],
  );
  const actionWorkflowFields = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_action_requests
     WHERE tenant_id = $1
       AND metadata_json->>'uat_workflow' IN ('agent_control_center_glpi_triage', 'agent_control_center_glpi_read')`,
    [tenant.id],
  );
  const actionSourceEndpointFields = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_action_requests
     WHERE tenant_id = $1
       AND metadata_json->>'source_endpoint' = 'uat/glpi-triage'`,
    [tenant.id],
  );
  const observations = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_observations
     WHERE tenant_id = $1
       AND observation_type = 'glpi_ticket_triage'`,
    [tenant.id],
  );
  const recommendations = await countRows(
    runner,
    `SELECT count(*)::int AS count
     FROM ai_recommendations
     WHERE tenant_id = $1
       AND recommendation_type = 'glpi_triage_actions'`,
    [tenant.id],
  );
  const evaluations = await countRows(
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

  const warnings: string[] = [];
  if (glpiBrandedDefinitions > 0) warnings.push('glpi_branded_definitions_or_triggers_still_present');

  return {
    tenant,
    pendingEvaluations,
    activeActionRequests,
    actionWorkflowFields,
    actionSourceEndpointFields,
    observations,
    recommendations,
    evaluations,
    glpiBrandedDefinitions,
    blockers,
    warnings,
  };
}

async function collectSamples(
  runner: ReturnType<DataSource['createQueryRunner']>,
  tenant: TenantRow,
  limit: number,
): Promise<SampleRow[]> {
  if (limit <= 0) {
    return [];
  }
  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

  return await runner.query(
    `WITH discriminator_rows AS (
       SELECT
         $2::text AS tenant_slug,
         'action_workflow' AS row_kind,
         ar.id::text AS row_id,
         ar.metadata_json->>'uat_workflow' AS old_value,
         ar.status,
         ar.created_at
       FROM ai_action_requests ar
       WHERE ar.tenant_id = $1
         AND ar.metadata_json->>'uat_workflow' IN ('agent_control_center_glpi_triage', 'agent_control_center_glpi_read')

       UNION ALL

       SELECT
         $2::text AS tenant_slug,
         'action_source_endpoint' AS row_kind,
         ar.id::text AS row_id,
         ar.metadata_json->>'source_endpoint' AS old_value,
         ar.status,
         ar.created_at
       FROM ai_action_requests ar
       WHERE ar.tenant_id = $1
         AND ar.metadata_json->>'source_endpoint' = 'uat/glpi-triage'

       UNION ALL

       SELECT
         $2::text AS tenant_slug,
         'observation' AS row_kind,
         o.id::text AS row_id,
         o.observation_type AS old_value,
         o.status,
         o.created_at
       FROM ai_observations o
       WHERE o.tenant_id = $1
         AND o.observation_type = 'glpi_ticket_triage'

       UNION ALL

       SELECT
         $2::text AS tenant_slug,
         'recommendation' AS row_kind,
         r.id::text AS row_id,
         r.recommendation_type AS old_value,
         r.status,
         r.created_at
       FROM ai_recommendations r
       WHERE r.tenant_id = $1
         AND r.recommendation_type = 'glpi_triage_actions'

       UNION ALL

       SELECT
         $2::text AS tenant_slug,
         'evaluation' AS row_kind,
         e.id::text AS row_id,
         e.metadata_json->>'evaluation_type' AS old_value,
         e.status,
         e.created_at
       FROM ai_evaluations e
       WHERE e.tenant_id = $1
         AND e.metadata_json->>'evaluation_type' IN ('glpi_triage_proposal', 'glpi_triage_uat')
     )
     SELECT tenant_slug, row_kind, row_id, old_value, status, created_at
     FROM discriminator_rows
     ORDER BY created_at DESC
     LIMIT $3`,
    [tenant.id, tenant.slug || tenant.id, limit],
  ) as SampleRow[];
}

async function runCountingUpdate(
  runner: ReturnType<DataSource['createQueryRunner']>,
  sql: string,
  params: unknown[],
): Promise<number> {
  return await countRows(runner, sql, params);
}

async function applyTenant(
  runner: ReturnType<DataSource['createQueryRunner']>,
  tenant: TenantRow,
): Promise<TenantBackfillResult> {
  await runner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenant.id]);
  await runner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

  const actionWorkflowFields = await runCountingUpdate(
    runner,
    `WITH updated AS (
       UPDATE ai_action_requests
       SET metadata_json = jsonb_set(
             metadata_json,
             '{uat_workflow}',
             to_jsonb(CASE metadata_json->>'uat_workflow'
               WHEN 'agent_control_center_glpi_triage' THEN 'agent_control_center_ticketing_triage'
               WHEN 'agent_control_center_glpi_read' THEN 'agent_control_center_ticketing_read'
               ELSE metadata_json->>'uat_workflow'
             END),
             false
           ),
           updated_at = now()
       WHERE tenant_id = $1
         AND metadata_json->>'uat_workflow' IN ('agent_control_center_glpi_triage', 'agent_control_center_glpi_read')
       RETURNING 1
     )
     SELECT count(*)::int AS count FROM updated`,
    [tenant.id],
  );
  const actionSourceEndpointFields = await runCountingUpdate(
    runner,
    `WITH updated AS (
       UPDATE ai_action_requests
       SET metadata_json = jsonb_set(
             metadata_json,
             '{source_endpoint}',
             to_jsonb('uat/ticketing-triage'::text),
             false
           ),
           updated_at = now()
       WHERE tenant_id = $1
         AND metadata_json->>'source_endpoint' = 'uat/glpi-triage'
       RETURNING 1
     )
     SELECT count(*)::int AS count FROM updated`,
    [tenant.id],
  );
  const observations = await runCountingUpdate(
    runner,
    `WITH updated AS (
       UPDATE ai_observations
       SET observation_type = 'ticketing_ticket_triage',
           updated_at = now()
       WHERE tenant_id = $1
         AND observation_type = 'glpi_ticket_triage'
       RETURNING 1
     )
     SELECT count(*)::int AS count FROM updated`,
    [tenant.id],
  );
  const recommendations = await runCountingUpdate(
    runner,
    `WITH updated AS (
       UPDATE ai_recommendations
       SET recommendation_type = 'ticketing_triage_actions',
           updated_at = now()
       WHERE tenant_id = $1
         AND recommendation_type = 'glpi_triage_actions'
       RETURNING 1
     )
     SELECT count(*)::int AS count FROM updated`,
    [tenant.id],
  );
  const evaluations = await runCountingUpdate(
    runner,
    `WITH updated AS (
       UPDATE ai_evaluations
       SET metadata_json = jsonb_set(
             metadata_json,
             '{evaluation_type}',
             to_jsonb(CASE metadata_json->>'evaluation_type'
               WHEN 'glpi_triage_proposal' THEN 'ticketing_triage_proposal'
               WHEN 'glpi_triage_uat' THEN 'ticketing_triage_uat'
               ELSE metadata_json->>'evaluation_type'
             END),
             false
           ),
           updated_at = now()
       WHERE tenant_id = $1
         AND metadata_json->>'evaluation_type' IN ('glpi_triage_proposal', 'glpi_triage_uat')
       RETURNING 1
     )
     SELECT count(*)::int AS count FROM updated`,
    [tenant.id],
  );

  return {
    tenant,
    actionWorkflowFields,
    actionSourceEndpointFields,
    observations,
    recommendations,
    evaluations,
  };
}

function totalCandidateFields(plan: TenantBackfillPlan): number {
  return plan.actionWorkflowFields
    + plan.actionSourceEndpointFields
    + plan.observations
    + plan.recommendations
    + plan.evaluations;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const apply = String(process.env.GLPI_TRIAGE_DISCRIMINATOR_BACKFILL_APPLY || '').trim() === '1';
  const confirmation = String(process.env.GLPI_TRIAGE_DISCRIMINATOR_BACKFILL_CONFIRM || '').trim();
  if (apply && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(
      `Apply mode requires GLPI_TRIAGE_DISCRIMINATOR_BACKFILL_CONFIRM=${APPLY_CONFIRMATION}`,
    );
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
      throw new Error('No tenants found for backfill scope');
    }

    console.log(`GLPI triage discriminator backfill (${apply ? 'apply' : 'dry-run'})`);
    console.log(`Tenants in scope: ${tenants.map((tenant) => tenant.slug || tenant.id).join(', ')}`);
    if (!apply) {
      console.log('No rows will be updated. Set GLPI_TRIAGE_DISCRIMINATOR_BACKFILL_APPLY=1 and the confirmation env var to apply.');
    }
    console.log('Scheduler task names, lock keys, agent keys, and route names are intentionally out of scope.\n');

    const plans: TenantBackfillPlan[] = [];
    const samples: SampleRow[] = [];
    for (const tenant of tenants) {
      plans.push(await inspectTenant(runner, tenant));
      if (samples.length < 10) {
        samples.push(...await collectSamples(runner, tenant, 10 - samples.length));
      }
    }

    for (const plan of plans) {
      const hasCandidates = totalCandidateFields(plan) > 0
        || plan.pendingEvaluations > 0
        || plan.activeActionRequests > 0
        || plan.glpiBrandedDefinitions > 0;
      if (!hasCandidates) {
        continue;
      }
      console.log(`Tenant ${plan.tenant.slug || plan.tenant.id}`);
      console.log(`  pending_glpi_evaluations=${plan.pendingEvaluations}`);
      console.log(`  active_glpi_action_requests=${plan.activeActionRequests}`);
      console.log(`  action_workflow_fields=${plan.actionWorkflowFields}`);
      console.log(`  action_source_endpoint_fields=${plan.actionSourceEndpointFields}`);
      console.log(`  observation_rows=${plan.observations}`);
      console.log(`  recommendation_rows=${plan.recommendations}`);
      console.log(`  evaluation_rows=${plan.evaluations}`);
      console.log(`  glpi_branded_definition_or_trigger_rows=${plan.glpiBrandedDefinitions}`);
      console.log(`  apply_readiness=${plan.blockers.length === 0 ? 'ready' : `blocked:${plan.blockers.join(',')}`}`);
      if (plan.warnings.length > 0) {
        console.log(`  warnings=${plan.warnings.join(',')}`);
      }
    }

    if (samples.length > 0) {
      console.log('\nSample legacy discriminator fields:');
      for (const sample of samples) {
        console.log(
          `- tenant=${sample.tenant_slug || 'unknown'} kind=${sample.row_kind} id=${sample.row_id} `
          + `status=${sample.status ?? 'unknown'} value=${sample.old_value}`,
        );
      }
    }

    const blockedPlans = plans.filter((plan) => plan.blockers.length > 0);
    if (apply && blockedPlans.length > 0) {
      throw new Error(
        `Backfill apply refused: ${blockedPlans.length} tenant(s) have pending evaluations or active action requests. `
        + 'Run the readiness script after they finish, or scope to a ready tenant.',
      );
    }

    const updateResults: TenantBackfillResult[] = [];
    if (apply) {
      for (const plan of plans.filter((candidate) => totalCandidateFields(candidate) > 0)) {
        await runner.startTransaction();
        try {
          const result = await applyTenant(runner, plan.tenant);
          await runner.commitTransaction();
          updateResults.push(result);
        } catch (error) {
          await runner.rollbackTransaction();
          throw error;
        }
      }
    }

    const totals = plans.reduce((acc, plan) => {
      acc.pendingEvaluations += plan.pendingEvaluations;
      acc.activeActionRequests += plan.activeActionRequests;
      acc.actionWorkflowFields += plan.actionWorkflowFields;
      acc.actionSourceEndpointFields += plan.actionSourceEndpointFields;
      acc.observations += plan.observations;
      acc.recommendations += plan.recommendations;
      acc.evaluations += plan.evaluations;
      acc.glpiBrandedDefinitions += plan.glpiBrandedDefinitions;
      return acc;
    }, {
      pendingEvaluations: 0,
      activeActionRequests: 0,
      actionWorkflowFields: 0,
      actionSourceEndpointFields: 0,
      observations: 0,
      recommendations: 0,
      evaluations: 0,
      glpiBrandedDefinitions: 0,
    });
    const updatedTotals = updateResults.reduce((acc, result) => {
      acc.actionWorkflowFields += result.actionWorkflowFields;
      acc.actionSourceEndpointFields += result.actionSourceEndpointFields;
      acc.observations += result.observations;
      acc.recommendations += result.recommendations;
      acc.evaluations += result.evaluations;
      return acc;
    }, {
      actionWorkflowFields: 0,
      actionSourceEndpointFields: 0,
      observations: 0,
      recommendations: 0,
      evaluations: 0,
    });

    console.log('\nSummary');
    console.log(`  blocked tenants: ${blockedPlans.length}`);
    console.log(`  pending GLPI evaluations: ${totals.pendingEvaluations}`);
    console.log(`  active GLPI action requests: ${totals.activeActionRequests}`);
    console.log(`  action workflow fields needing rename: ${totals.actionWorkflowFields}`);
    console.log(`  action source endpoint fields needing rename: ${totals.actionSourceEndpointFields}`);
    console.log(`  observation rows needing rename: ${totals.observations}`);
    console.log(`  recommendation rows needing rename: ${totals.recommendations}`);
    console.log(`  evaluation rows needing rename: ${totals.evaluations}`);
    console.log(`  GLPI-branded definition/trigger rows: ${totals.glpiBrandedDefinitions}`);
    console.log(`  action workflow fields updated: ${updatedTotals.actionWorkflowFields}`);
    console.log(`  action source endpoint fields updated: ${updatedTotals.actionSourceEndpointFields}`);
    console.log(`  observation rows updated: ${updatedTotals.observations}`);
    console.log(`  recommendation rows updated: ${updatedTotals.recommendations}`);
    console.log(`  evaluation rows updated: ${updatedTotals.evaluations}`);
    console.log(apply ? 'Backfill apply completed.' : 'Backfill dry-run completed.');
  } finally {
    await runner.release();
    await ds.destroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`GLPI triage discriminator backfill failed: ${message}`);
  process.exit(1);
});
