/*
 RLS Self-Test Script
 - Connects to DATABASE_URL
 - Creates two temporary tenants inside one transaction
 - Verifies critical tables are RLS-enabled and forced
 - Verifies real cross-tenant reads and writes are blocked on the Phase 1 AI graph
 - Prints a summary and exits non-zero on failure
*/
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { assertSafeDatabaseRole } from '../src/common/database-role-safety';

type TestResult = { name: string; ok: boolean; info?: string };

const TABLES_TO_CHECK_RLS = Array.from(new Set([
  'users', 'companies', 'departments', 'suppliers', 'accounts',
  'spend_items', 'spend_versions', 'spend_amounts', 'spend_allocations', 'spend_tasks',
  'contracts', 'contract_tasks', 'contract_spend_items', 'contract_attachments', 'contract_links',
  'capex_items', 'capex_versions', 'capex_amounts',
  'tasks', 'currency_rate_sets', 'item_sequences',
  'document_libraries', 'document_folders', 'document_types', 'documents', 'document_versions',
  'document_edit_locks', 'document_attachments', 'document_activities', 'document_contributors',
  'document_classifications', 'document_references', 'document_applications', 'document_assets',
  'document_projects', 'document_requests', 'document_tasks',
  'integrated_document_bindings', 'integrated_document_slot_settings',
  'roles', 'role_permissions', 'subscriptions',
  'audit_log', 'company_metrics', 'department_metrics', 'user_page_roles',
  'applications', 'assets', 'app_instances', 'app_asset_assignments',
  'application_suites', 'asset_relations',
  'portfolio_projects', 'portfolio_requests',
  'portfolio_request_projects', 'portfolio_request_dependencies', 'portfolio_project_dependencies',
  'application_projects', 'asset_projects',
  'portfolio_request_applications', 'portfolio_request_assets',
  'ai_settings', 'ai_api_keys', 'ai_conversations', 'ai_messages',
]));

const TABLES_TO_CHECK_POLICY = new Set([
  'applications',
  'assets',
  'app_instances',
  'app_asset_assignments',
  'application_suites',
  'asset_relations',
  'portfolio_projects',
  'portfolio_requests',
  'portfolio_request_projects',
  'portfolio_request_dependencies',
  'portfolio_project_dependencies',
  'application_projects',
  'asset_projects',
  'portfolio_request_applications',
  'portfolio_request_assets',
  'ai_settings',
  'ai_api_keys',
  'ai_conversations',
  'ai_messages',
]);

const TABLES_TO_CHECK_FORCE = new Set([
  'companies',
  'spend_items',
  'contracts',
  'roles',
  'capex_items',
  'document_libraries',
  'documents',
  'item_sequences',
  ...TABLES_TO_CHECK_POLICY,
]);

type RlsState = {
  enabled: boolean;
  forced: boolean;
};

type AiGraphSeed = {
  applicationId: string;
  suiteApplicationId: string;
  assetId: string;
  relatedAssetId: string;
  appInstanceId: string;
  appAssetAssignmentId: string;
  projectId: string;
  dependencyProjectId: string;
  requestId: string;
  applicationProjectId: string;
  assetProjectId: string;
  requestApplicationId: string;
  requestAssetId: string;
  requestProjectId: string;
  requestDependencyId: string;
  projectDependencyId: string;
  applicationSuiteId: string;
  assetRelationId: string;
};

function randTag() {
  return Math.random().toString(36).slice(2, 8);
}

async function setTenant(r: QueryRunner, tenantId: string) {
  await r.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
}

async function getRlsState(r: QueryRunner, table: string): Promise<RlsState> {
  const rows = await r.query(
    `SELECT c.relrowsecurity AS enabled,
            c.relforcerowsecurity AS forced
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = $1`,
    [table],
  );

  return {
    enabled: !!rows?.[0]?.enabled,
    forced: !!rows?.[0]?.forced,
  };
}

async function hasTenantIsolationPolicy(r: QueryRunner, table: string): Promise<boolean> {
  const rows = await r.query(
    `SELECT 1
     FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = $1
       AND policyname = $2`,
    [table, `${table}_tenant_isolation`],
  );
  return rows.length > 0;
}

async function expectCrossTenantReadBlocked(
  r: QueryRunner,
  results: TestResult[],
  name: string,
  sql: string,
  params: unknown[],
) {
  const rows = await r.query(sql, params);
  results.push({ name, ok: rows.length === 0, info: rows.length > 0 ? `returned ${rows.length} row(s)` : undefined });
}

async function expectCrossTenantInsertBlocked(
  r: QueryRunner,
  results: TestResult[],
  name: string,
  sql: string,
  params: unknown[],
) {
  let blocked = false;
  await r.query('SAVEPOINT rls_cross_tenant_write');
  try {
    await r.query(sql, params);
  } catch {
    blocked = true;
  } finally {
    await r.query('ROLLBACK TO SAVEPOINT rls_cross_tenant_write');
  }
  results.push({ name, ok: blocked });
}

async function seedTenant(runner: QueryRunner, tenantId: string, slug: string, name: string) {
  await runner.query(
    `INSERT INTO tenants (id, slug, name, status, metadata, branding, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', '{}'::jsonb, '{"logo_version":0,"use_logo_in_dark":true}'::jsonb, now(), now())`,
    [tenantId, slug, name],
  );
}

async function seedAiGraph(r: QueryRunner, tenantId: string, tag: string): Promise<AiGraphSeed> {
  await setTenant(r, tenantId);

  const ids: AiGraphSeed = {
    applicationId: randomUUID(),
    suiteApplicationId: randomUUID(),
    assetId: randomUUID(),
    relatedAssetId: randomUUID(),
    appInstanceId: randomUUID(),
    appAssetAssignmentId: randomUUID(),
    projectId: randomUUID(),
    dependencyProjectId: randomUUID(),
    requestId: randomUUID(),
    applicationProjectId: randomUUID(),
    assetProjectId: randomUUID(),
    requestApplicationId: randomUUID(),
    requestAssetId: randomUUID(),
    requestProjectId: randomUUID(),
    requestDependencyId: randomUUID(),
    projectDependencyId: randomUUID(),
    applicationSuiteId: randomUUID(),
    assetRelationId: randomUUID(),
  };

  await r.query(
    `INSERT INTO applications (
       id, tenant_id, name, category, description, criticality, data_class,
       hosting_model, users_mode, users_year, environment, lifecycle, status,
       created_at, updated_at
     )
     VALUES
       ($1, $2, $3, 'line_of_business', $4, 'high', 'internal', 'saas', 'manual', 250, 'prod', 'active', 'enabled', now(), now()),
       ($5, $2, $6, 'line_of_business', $7, 'medium', 'internal', 'saas', 'manual', 120, 'prod', 'active', 'enabled', now(), now())`,
    [
      ids.applicationId,
      tenantId,
      `RLS App ${tag}`,
      `Primary application ${tag}`,
      ids.suiteApplicationId,
      `RLS Suite ${tag}`,
      `Suite application ${tag}`,
    ],
  );

  await r.query(
    `INSERT INTO assets (
       id, tenant_id, name, kind, provider, environment, hostname, fqdn, status, notes, created_at, updated_at
     )
     VALUES
       ($1, $2, $3, 'vm', 'aws', 'prod', $4, $5, 'active', $6, now(), now()),
       ($7, $2, $8, 'vm', 'aws', 'prod', $9, $10, 'active', $11, now(), now())`,
    [
      ids.assetId,
      tenantId,
      `RLS Asset ${tag}`,
      `asset-${tag}`,
      `asset-${tag}.example.com`,
      `Primary asset ${tag}`,
      ids.relatedAssetId,
      `RLS Related Asset ${tag}`,
      `asset-related-${tag}`,
      `asset-related-${tag}.example.com`,
      `Related asset ${tag}`,
    ],
  );

  await r.query(
    `INSERT INTO app_instances (
       id, tenant_id, application_id, environment, lifecycle, sso_enabled, mfa_supported,
       status, base_url, notes, created_at, updated_at
     )
     VALUES ($1, $2, $3, 'prod', 'active', true, true, 'enabled', $4, $5, now(), now())`,
    [
      ids.appInstanceId,
      tenantId,
      ids.applicationId,
      `https://app-${tag}.example.com`,
      `Primary instance ${tag}`,
    ],
  );

  await r.query(
    `INSERT INTO app_asset_assignments (
       id, tenant_id, app_instance_id, asset_id, role, notes, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, 'primary', $5, now(), now())`,
    [ids.appAssetAssignmentId, tenantId, ids.appInstanceId, ids.assetId, `Primary assignment ${tag}`],
  );

  await r.query(
    `INSERT INTO portfolio_projects (
       id, tenant_id, item_number, name, origin, status, execution_progress, planned_end, created_at, updated_at
     )
     VALUES
       ($1, $2, 9301, $3, 'fast_track', 'planned', 25, DATE '2026-12-31', now(), now()),
       ($4, $2, 9302, $5, 'legacy', 'in_progress', 75, DATE '2026-11-30', now(), now())`,
    [
      ids.projectId,
      tenantId,
      `RLS Project ${tag}`,
      ids.dependencyProjectId,
      `RLS Dependency Project ${tag}`,
    ],
  );

  await r.query(
    `INSERT INTO portfolio_requests (
       id, tenant_id, item_number, name, status, current_situation, expected_benefits,
       criteria_values, feasibility_review, priority_override, created_at, updated_at
     )
     VALUES (
       $1, $2, 9201, $3, 'pending_review', $4, $5,
       '{}'::jsonb, '{}'::jsonb, false, now(), now()
     )`,
    [
      ids.requestId,
      tenantId,
      `RLS Request ${tag}`,
      `Current situation ${tag}`,
      `Expected benefits ${tag}`,
    ],
  );

  await r.query(
    `INSERT INTO application_projects (id, tenant_id, application_id, project_id, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [ids.applicationProjectId, tenantId, ids.applicationId, ids.projectId],
  );
  await r.query(
    `INSERT INTO asset_projects (id, tenant_id, asset_id, project_id, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [ids.assetProjectId, tenantId, ids.assetId, ids.projectId],
  );
  await r.query(
    `INSERT INTO portfolio_request_applications (id, tenant_id, request_id, application_id, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [ids.requestApplicationId, tenantId, ids.requestId, ids.applicationId],
  );
  await r.query(
    `INSERT INTO portfolio_request_assets (id, tenant_id, request_id, asset_id, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [ids.requestAssetId, tenantId, ids.requestId, ids.assetId],
  );
  await r.query(
    `INSERT INTO portfolio_request_projects (id, tenant_id, request_id, project_id, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [ids.requestProjectId, tenantId, ids.requestId, ids.projectId],
  );
  await r.query(
    `INSERT INTO portfolio_request_dependencies (
       id, tenant_id, request_id, depends_on_project_id, dependency_type, created_at
     )
     VALUES ($1, $2, $3, $4, 'blocks', now())`,
    [ids.requestDependencyId, tenantId, ids.requestId, ids.dependencyProjectId],
  );
  await r.query(
    `INSERT INTO portfolio_project_dependencies (
       id, tenant_id, project_id, depends_on_project_id, dependency_type, created_at
     )
     VALUES ($1, $2, $3, $4, 'blocks', now())`,
    [ids.projectDependencyId, tenantId, ids.projectId, ids.dependencyProjectId],
  );
  await r.query(
    `INSERT INTO application_suites (id, tenant_id, application_id, suite_id, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [ids.applicationSuiteId, tenantId, ids.applicationId, ids.suiteApplicationId],
  );
  await r.query(
    `INSERT INTO asset_relations (id, tenant_id, asset_id, related_asset_id, relation_type, notes, created_at)
     VALUES ($1, $2, $3, $4, 'depends_on', $5, now())`,
    [ids.assetRelationId, tenantId, ids.assetId, ids.relatedAssetId, `Asset relation ${tag}`],
  );

  return ids;
}

async function runAiGraphChecks(
  r: QueryRunner,
  results: TestResult[],
  tenantOneId: string,
  tenantTwoId: string,
  seed: AiGraphSeed,
  tag: string,
) {
  await setTenant(r, tenantOneId);
  const selfApplication = await r.query(`SELECT 1 FROM applications WHERE id = $1`, [seed.applicationId]);
  results.push({ name: 'applications: self-tenant read', ok: selfApplication.length === 1 });

  await setTenant(r, tenantTwoId);

  await expectCrossTenantReadBlocked(r, results, 'applications: cross-tenant read blocked', `SELECT 1 FROM applications WHERE id = $1`, [seed.applicationId]);
  await expectCrossTenantReadBlocked(r, results, 'assets: cross-tenant read blocked', `SELECT 1 FROM assets WHERE id = $1`, [seed.assetId]);
  await expectCrossTenantReadBlocked(r, results, 'app_instances: cross-tenant read blocked', `SELECT 1 FROM app_instances WHERE id = $1`, [seed.appInstanceId]);
  await expectCrossTenantReadBlocked(r, results, 'app_asset_assignments: cross-tenant read blocked', `SELECT 1 FROM app_asset_assignments WHERE id = $1`, [seed.appAssetAssignmentId]);
  await expectCrossTenantReadBlocked(r, results, 'application_suites: cross-tenant read blocked', `SELECT 1 FROM application_suites WHERE id = $1`, [seed.applicationSuiteId]);
  await expectCrossTenantReadBlocked(r, results, 'asset_relations: cross-tenant read blocked', `SELECT 1 FROM asset_relations WHERE id = $1`, [seed.assetRelationId]);
  await expectCrossTenantReadBlocked(r, results, 'portfolio_request_projects: cross-tenant read blocked', `SELECT 1 FROM portfolio_request_projects WHERE id = $1`, [seed.requestProjectId]);
  await expectCrossTenantReadBlocked(r, results, 'portfolio_request_dependencies: cross-tenant read blocked', `SELECT 1 FROM portfolio_request_dependencies WHERE id = $1`, [seed.requestDependencyId]);
  await expectCrossTenantReadBlocked(r, results, 'portfolio_project_dependencies: cross-tenant read blocked', `SELECT 1 FROM portfolio_project_dependencies WHERE id = $1`, [seed.projectDependencyId]);
  await expectCrossTenantReadBlocked(r, results, 'application_projects: cross-tenant read blocked', `SELECT 1 FROM application_projects WHERE id = $1`, [seed.applicationProjectId]);
  await expectCrossTenantReadBlocked(r, results, 'asset_projects: cross-tenant read blocked', `SELECT 1 FROM asset_projects WHERE id = $1`, [seed.assetProjectId]);
  await expectCrossTenantReadBlocked(r, results, 'portfolio_request_applications: cross-tenant read blocked', `SELECT 1 FROM portfolio_request_applications WHERE id = $1`, [seed.requestApplicationId]);
  await expectCrossTenantReadBlocked(r, results, 'portfolio_request_assets: cross-tenant read blocked', `SELECT 1 FROM portfolio_request_assets WHERE id = $1`, [seed.requestAssetId]);

  await expectCrossTenantInsertBlocked(
    r,
    results,
    'applications: cross-tenant insert blocked',
    `INSERT INTO applications (
       tenant_id, name, category, description, criticality, data_class,
       hosting_model, users_mode, users_year, environment, lifecycle, status
     )
     VALUES ($1, $2, 'line_of_business', 'cross tenant application', 'high', 'internal', 'saas', 'manual', 10, 'prod', 'active', 'enabled')`,
    [tenantOneId, `Cross App ${tag}`],
  );
  await expectCrossTenantInsertBlocked(
    r,
    results,
    'assets: cross-tenant insert blocked',
    `INSERT INTO assets (
       tenant_id, name, kind, provider, environment, hostname, fqdn, status, notes
     )
     VALUES ($1, $2, 'vm', 'aws', 'prod', $3, $4, 'active', 'cross tenant asset')`,
    [tenantOneId, `Cross Asset ${tag}`, `cross-${tag}`, `cross-${tag}.example.com`],
  );
  await expectCrossTenantInsertBlocked(
    r,
    results,
    'app_instances: cross-tenant insert blocked',
    `INSERT INTO app_instances (
       tenant_id, application_id, environment, lifecycle, sso_enabled, mfa_supported, status, base_url
     )
     VALUES ($1, $2, 'qa', 'active', false, false, 'enabled', $3)`,
    [tenantOneId, seed.applicationId, `https://cross-instance-${tag}.example.com`],
  );
  await expectCrossTenantInsertBlocked(
    r,
    results,
    'app_asset_assignments: cross-tenant insert blocked',
    `INSERT INTO app_asset_assignments (
       tenant_id, app_instance_id, asset_id, role, notes
     )
     VALUES ($1, $2, $3, 'secondary', 'cross tenant assignment')`,
    [tenantOneId, seed.appInstanceId, seed.assetId],
  );
  await expectCrossTenantInsertBlocked(
    r,
    results,
    'application_projects: cross-tenant insert blocked',
    `INSERT INTO application_projects (tenant_id, application_id, project_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantOneId, seed.applicationId, seed.dependencyProjectId],
  );
  await expectCrossTenantInsertBlocked(
    r,
    results,
    'asset_projects: cross-tenant insert blocked',
    `INSERT INTO asset_projects (tenant_id, asset_id, project_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantOneId, seed.assetId, seed.dependencyProjectId],
  );
  await expectCrossTenantInsertBlocked(
    r,
    results,
    'portfolio_request_applications: cross-tenant insert blocked',
    `INSERT INTO portfolio_request_applications (tenant_id, request_id, application_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantOneId, seed.requestId, seed.suiteApplicationId],
  );
  await expectCrossTenantInsertBlocked(
    r,
    results,
    'portfolio_request_assets: cross-tenant insert blocked',
    `INSERT INTO portfolio_request_assets (tenant_id, request_id, asset_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantOneId, seed.requestId, seed.relatedAssetId],
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }

  const ds = new DataSource({ type: 'postgres', url, ssl: false } as any);
  await ds.initialize();
  const roleState = await assertSafeDatabaseRole(ds, 'RLS self-test');
  console.log(`[RLS Self-Test] Connected as PostgreSQL role "${roleState.currentUser}" with native RLS enforcement`);

  const r = ds.createQueryRunner();
  await r.connect();
  await r.startTransaction();

  const results: TestResult[] = [];

  try {
    const tag = `rls_${Date.now()}_${randTag()}`;
    const tenantOneId = randomUUID();
    const tenantTwoId = randomUUID();

    await seedTenant(r, tenantOneId, `${tag}_a`, `${tag} A`);
    await seedTenant(r, tenantTwoId, `${tag}_b`, `${tag} B`);

    for (const table of TABLES_TO_CHECK_RLS) {
      const state = await getRlsState(r, table);
      results.push({ name: `RLS enabled: ${table}`, ok: state.enabled });
      if (TABLES_TO_CHECK_FORCE.has(table)) {
        results.push({ name: `RLS forced: ${table}`, ok: state.forced });
      }
      if (TABLES_TO_CHECK_POLICY.has(table)) {
        results.push({
          name: `Tenant policy present: ${table}`,
          ok: await hasTenantIsolationPolicy(r, table),
        });
      }
    }

    await setTenant(r, tenantOneId);
    const companyRows = await r.query(
      `INSERT INTO companies(name, country_iso, city, status) VALUES ($1, $2, $3, 'enabled') RETURNING id`,
      [`TestCo ${tag}`, 'US', 'New York'],
    );
    const companyId = companyRows[0].id as string;
    const companySelf = await r.query(`SELECT 1 FROM companies WHERE id = $1`, [companyId]);
    results.push({ name: 'companies: self-tenant read', ok: companySelf.length === 1 });

    await setTenant(r, tenantTwoId);
    await expectCrossTenantReadBlocked(r, results, 'companies: cross-tenant read blocked', `SELECT 1 FROM companies WHERE id = $1`, [companyId]);
    await expectCrossTenantInsertBlocked(
      r,
      results,
      'companies: cross-tenant insert blocked',
      `INSERT INTO companies(tenant_id, name, country_iso, city, status) VALUES ($1, $2, $3, $4, 'enabled')`,
      [tenantOneId, `X ${tag}`, 'US', 'Boston'],
    );

    await setTenant(r, tenantOneId);
    const spendRows = await r.query(
      `INSERT INTO spend_items(product_name, currency, effective_start, status) VALUES ($1, 'EUR', '2025-01-01', 'enabled') RETURNING id`,
      [`S ${tag}`],
    );
    const spendId = spendRows[0].id as string;
    await setTenant(r, tenantTwoId);
    await expectCrossTenantReadBlocked(r, results, 'spend_items: cross-tenant read blocked', `SELECT 1 FROM spend_items WHERE id = $1`, [spendId]);

    await setTenant(r, tenantOneId);
    const supplierRows = await r.query(
      `INSERT INTO suppliers(name, status) VALUES ($1, 'enabled') RETURNING id`,
      [`SUP ${tag}`],
    );
    const contractCompanyRows = await r.query(
      `INSERT INTO companies(name, country_iso, city, status) VALUES ($1, $2, $3, 'enabled') RETURNING id`,
      [`CO2 ${tag}`, 'US', 'Chicago'],
    );
    const contractRows = await r.query(
      `INSERT INTO contracts(name, company_id, supplier_id, start_date) VALUES ($1, $2, $3, '2025-01-01') RETURNING id`,
      [`CON ${tag}`, contractCompanyRows[0].id, supplierRows[0].id],
    );
    const contractId = contractRows[0].id as string;
    await setTenant(r, tenantTwoId);
    await expectCrossTenantReadBlocked(r, results, 'contracts: cross-tenant read blocked', `SELECT 1 FROM contracts WHERE id = $1`, [contractId]);

    await setTenant(r, tenantOneId);
    const roleRows = await r.query(
      `INSERT INTO roles(role_name, role_description) VALUES ($1, $2) RETURNING id`,
      [`RLS_${tag}`, 'Test role'],
    );
    const roleId = roleRows[0].id as string;
    await setTenant(r, tenantTwoId);
    await expectCrossTenantReadBlocked(r, results, 'roles: cross-tenant read blocked', `SELECT 1 FROM roles WHERE id = $1`, [roleId]);

    await setTenant(r, tenantOneId);
    const capexRows = await r.query(
      `INSERT INTO capex_items(description, ppe_type, investment_type, priority, currency, effective_start, status)
       VALUES ($1, 'hardware', 'replacement', 'medium', 'EUR', '2025-01-01', 'enabled')
       RETURNING id`,
      [`CAPEX ${tag}`],
    );
    const capexId = capexRows[0].id as string;
    await setTenant(r, tenantTwoId);
    await expectCrossTenantReadBlocked(r, results, 'capex_items: cross-tenant read blocked', `SELECT 1 FROM capex_items WHERE id = $1`, [capexId]);

    await setTenant(r, tenantOneId);
    const libraryRows = await r.query(
      `INSERT INTO document_libraries(name, slug, is_system, display_order)
       VALUES ($1, $2, false, 0)
       RETURNING id`,
      [`Knowledge ${tag}`, `knowledge-${tag}`],
    );
    const libraryId = libraryRows[0].id as string;
    const documentRows = await r.query(
      `INSERT INTO documents(item_number, title, content_markdown, content_plain, library_id)
       VALUES (999001, $1, 'Body', 'Body', $2)
       RETURNING id`,
      [`DOC ${tag}`, libraryId],
    );
    const documentId = documentRows[0].id as string;
    await r.query(
      `INSERT INTO item_sequences(tenant_id, entity_type, next_val)
       VALUES ($1, 'document', 42)
       ON CONFLICT (tenant_id, entity_type)
       DO UPDATE SET next_val = EXCLUDED.next_val`,
      [tenantOneId],
    );

    await setTenant(r, tenantTwoId);
    await expectCrossTenantReadBlocked(r, results, 'document_libraries: cross-tenant read blocked', `SELECT 1 FROM document_libraries WHERE id = $1`, [libraryId]);
    await expectCrossTenantReadBlocked(r, results, 'documents: cross-tenant read blocked', `SELECT 1 FROM documents WHERE id = $1`, [documentId]);
    await expectCrossTenantReadBlocked(
      r,
      results,
      'item_sequences(document): cross-tenant read blocked',
      `SELECT 1 FROM item_sequences WHERE tenant_id = $1 AND entity_type = 'document'`,
      [tenantOneId],
    );
    await expectCrossTenantInsertBlocked(
      r,
      results,
      'document_libraries: cross-tenant insert blocked',
      `INSERT INTO document_libraries(tenant_id, name, slug, is_system, display_order)
       VALUES ($1, $2, $3, false, 1)`,
      [tenantOneId, `Cross ${tag}`, `cross-${tag}`],
    );

    const aiGraphSeed = await seedAiGraph(r, tenantOneId, tag);
    await runAiGraphChecks(r, results, tenantOneId, tenantTwoId, aiGraphSeed, tag);

    const failed = results.filter((result) => !result.ok);
    for (const result of results) {
      console.log(`${result.ok ? 'PASS' : 'FAIL'} - ${result.name}${result.info ? ` (${result.info})` : ''}`);
    }

    if (failed.length > 0) {
      throw new Error(`${failed.length} RLS checks failed.`);
    }

    await r.rollbackTransaction();
  } catch (error) {
    try {
      if (r.isTransactionActive) {
        await r.rollbackTransaction();
      }
    } catch {
      // ignore rollback errors
    }
    console.error('RLS self-test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    try {
      await r.release();
    } catch {
      // ignore release errors
    }
    try {
      await ds.destroy();
    } catch {
      // ignore destroy errors
    }
  }
}

main();
