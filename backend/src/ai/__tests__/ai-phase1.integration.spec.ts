import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Application } from '../../applications/application.entity';
import { ApplicationsListService } from '../../applications/services/applications-list.service';
import { Asset } from '../../assets/asset.entity';
import { AssetsListService } from '../../assets/services/assets-list.service';
import dataSource from '../../data-source';
import { AiPhase1RlsRepair1844200000000 } from '../../migrations/1844200000000-ai-phase1-rls-repair';
import { PortfolioRequest } from '../../portfolio/portfolio-request.entity';
import { PortfolioRequestsService } from '../../portfolio/portfolio-requests.service';
import { PortfolioProject } from '../../portfolio/portfolio-project.entity';
import { PortfolioProjectsListService } from '../../portfolio/services/portfolio-projects-list.service';
import { TasksService } from '../../spend/tasks.service';
import { AiEntityService } from '../ai-entity.service';
import { AiToolRegistry } from '../ai-tool.registry';
import { AiToolName } from '../ai.types';
import { AiAggregateExecutor } from '../query/ai-aggregate.executor';
import { AiQueryExecutor } from '../query/ai-query.executor';

type SeededGraph = {
  applicationId: string;
  suiteApplicationId: string;
  assetId: string;
  relatedAssetId: string;
  appInstanceId: string;
  projectId: string;
  requestId: string;
  taskId: string;
};

type SeededKnowledge = {
  libraryId: string;
  documentTypeId: string;
  documentId: string;
};

async function seedTenant(runner: any, tenantId: string, slug: string, name: string) {
  await runner.query(
    `INSERT INTO tenants (id, slug, name, status, metadata, branding, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', '{}'::jsonb, '{"logo_version":0,"use_logo_in_dark":true}'::jsonb, now(), now())`,
    [tenantId, slug, name],
  );
}

async function setCurrentTenant(runner: any, tenantId: string) {
  await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
}

async function getRlsState(runner: any, table: string) {
  const rows = await runner.query(
    `SELECT c.relrowsecurity AS enabled,
            c.relforcerowsecurity AS forced
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = $1`,
    [table],
  );
  return rows[0] ?? { enabled: false, forced: false };
}

async function hasTenantIsolationPolicy(runner: any, table: string) {
  const rows = await runner.query(
    `SELECT 1
     FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = $1
       AND policyname = $2`,
    [table, `${table}_tenant_isolation`],
  );
  return rows.length === 1;
}

async function seedApplicationAssetGraph(
  runner: any,
  tenantId: string,
  tag: string,
  opts?: {
    applicationName?: string;
    assetName?: string;
    requestName?: string;
    projectName?: string;
    taskTitle?: string;
  },
): Promise<SeededGraph> {
  await setCurrentTenant(runner, tenantId);

  const ids: SeededGraph = {
    applicationId: randomUUID(),
    suiteApplicationId: randomUUID(),
    assetId: randomUUID(),
    relatedAssetId: randomUUID(),
    appInstanceId: randomUUID(),
    projectId: randomUUID(),
    requestId: randomUUID(),
    taskId: randomUUID(),
  };

  await runner.query(
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
      opts?.applicationName ?? `Shared Boundary Application ${tag}`,
      `Primary application ${tag}`,
      ids.suiteApplicationId,
      `Suite Application ${tag}`,
      `Suite application ${tag}`,
    ],
  );

  await runner.query(
    `INSERT INTO assets (
       id, tenant_id, name, kind, provider, environment, hostname, fqdn, status, notes, created_at, updated_at
     )
     VALUES
       ($1, $2, $3, 'vm', 'aws', 'prod', $4, $5, 'active', $6, now(), now()),
       ($7, $2, $8, 'vm', 'aws', 'prod', $9, $10, 'active', $11, now(), now())`,
    [
      ids.assetId,
      tenantId,
      opts?.assetName ?? `Shared Boundary Asset ${tag}`,
      `asset-${tag}`,
      `asset-${tag}.example.com`,
      `Primary asset ${tag}`,
      ids.relatedAssetId,
      `Related Asset ${tag}`,
      `asset-related-${tag}`,
      `asset-related-${tag}.example.com`,
      `Related asset ${tag}`,
    ],
  );

  await runner.query(
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

  await runner.query(
    `INSERT INTO app_asset_assignments (
       tenant_id, app_instance_id, asset_id, role, notes, created_at, updated_at
     )
     VALUES ($1, $2, $3, 'primary', $4, now(), now())`,
    [tenantId, ids.appInstanceId, ids.assetId, `Primary assignment ${tag}`],
  );

  await runner.query(
    `INSERT INTO portfolio_projects (
       id, tenant_id, item_number, name, origin, status, execution_progress, planned_end, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, 'fast_track', 'planned', 25, DATE '2026-12-31', now(), now())`,
    [
      ids.projectId,
      tenantId,
      Number(tag.replace(/\D/g, '').slice(0, 4) || '9301'),
      opts?.projectName ?? `Shared Boundary Project ${tag}`,
    ],
  );

  await runner.query(
    `INSERT INTO tasks (
       id, tenant_id, item_number, title, description, status, related_object_type, related_object_id,
       labels, owner_ids, viewer_ids, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, 'open', 'project', $6,
       '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, now(), now()
     )`,
    [
      ids.taskId,
      tenantId,
      Number(tag.replace(/\D/g, '').slice(0, 4) || '9101'),
      opts?.taskTitle ?? `Shared Boundary Task ${tag}`,
      `Shared boundary task ${tag}`,
      ids.projectId,
    ],
  );

  await runner.query(
    `INSERT INTO portfolio_requests (
       id, tenant_id, item_number, name, status, current_situation, expected_benefits,
       origin_task_id, criteria_values, feasibility_review, priority_override, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, 'pending_review', $5, $6, $7,
       '{}'::jsonb, '{}'::jsonb, false, now(), now()
     )`,
    [
      ids.requestId,
      tenantId,
      Number(tag.replace(/\D/g, '').slice(0, 4) || '9201'),
      opts?.requestName ?? `Shared Boundary Request ${tag}`,
      `Current situation ${tag}`,
      `Expected benefits ${tag}`,
      ids.taskId,
    ],
  );

  await runner.query(
    `INSERT INTO application_projects (tenant_id, application_id, project_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, ids.applicationId, ids.projectId],
  );
  await runner.query(
    `INSERT INTO asset_projects (tenant_id, asset_id, project_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, ids.assetId, ids.projectId],
  );
  await runner.query(
    `INSERT INTO portfolio_request_applications (tenant_id, request_id, application_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, ids.requestId, ids.applicationId],
  );
  await runner.query(
    `INSERT INTO portfolio_request_assets (tenant_id, request_id, asset_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, ids.requestId, ids.assetId],
  );
  await runner.query(
    `INSERT INTO application_suites (tenant_id, application_id, suite_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, ids.applicationId, ids.suiteApplicationId],
  );
  await runner.query(
    `INSERT INTO asset_relations (tenant_id, asset_id, related_asset_id, relation_type, notes, created_at)
     VALUES ($1, $2, $3, 'depends_on', $4, now())`,
    [tenantId, ids.assetId, ids.relatedAssetId, `Asset relation ${tag}`],
  );

  return ids;
}

async function seedKnowledgeGraph(
  runner: any,
  tenantId: string,
  graph: SeededGraph,
  tag: string,
  opts?: {
    documentTitle?: string;
    documentSummary?: string;
  },
): Promise<SeededKnowledge> {
  await setCurrentTenant(runner, tenantId);

  const knowledge: SeededKnowledge = {
    libraryId: randomUUID(),
    documentTypeId: randomUUID(),
    documentId: randomUUID(),
  };

  await runner.query(
    `INSERT INTO document_libraries (
       id, tenant_id, name, slug, is_system, display_order, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, false, 0, now(), now())`,
    [knowledge.libraryId, tenantId, `Knowledge ${tag}`, `knowledge-${tag}`],
  );

  await runner.query(
    `INSERT INTO document_types (
       id, tenant_id, name, description, template_content, is_active, is_system, is_default, system_key, display_order, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, null, true, false, false, null, 0, now(), now())`,
    [knowledge.documentTypeId, tenantId, `Runbook ${tag}`, `Runbook ${tag}`],
  );

  await runner.query(
    `INSERT INTO documents (
       id, tenant_id, item_number, title, summary, content_markdown, content_plain,
       library_id, document_type_id, status, revision, current_version_number, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, 'published', 1, 0, now(), now()
     )`,
    [
      knowledge.documentId,
      tenantId,
      Number(tag.replace(/\D/g, '').slice(0, 4) || '7101'),
      opts?.documentTitle ?? `Shared Boundary Knowledge ${tag}`,
      opts?.documentSummary ?? `Knowledge summary ${tag}`,
      `# ${opts?.documentTitle ?? `Shared Boundary Knowledge ${tag}`}`,
      `${opts?.documentTitle ?? `Shared Boundary Knowledge ${tag}`} ${opts?.documentSummary ?? `Knowledge summary ${tag}`}`,
      knowledge.libraryId,
      knowledge.documentTypeId,
    ],
  );

  await runner.query(
    `INSERT INTO document_applications (tenant_id, document_id, application_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, knowledge.documentId, graph.applicationId],
  );
  await runner.query(
    `INSERT INTO document_assets (tenant_id, document_id, asset_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, knowledge.documentId, graph.assetId],
  );
  await runner.query(
    `INSERT INTO document_projects (tenant_id, document_id, project_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, knowledge.documentId, graph.projectId],
  );
  await runner.query(
    `INSERT INTO document_requests (tenant_id, document_id, request_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, knowledge.documentId, graph.requestId],
  );
  await runner.query(
    `INSERT INTO document_tasks (tenant_id, document_id, task_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantId, knowledge.documentId, graph.taskId],
  );

  return knowledge;
}

async function insertCrossTenantLeakShapes(
  runner: any,
  tenantA: string,
  tenantB: string,
  graphA: SeededGraph,
  graphB: SeededGraph,
) {
  await setCurrentTenant(runner, tenantB);

  const bridgeInstanceId = randomUUID();
  await runner.query(
    `INSERT INTO app_instances (
       id, tenant_id, application_id, environment, lifecycle, sso_enabled, mfa_supported,
       status, base_url, notes, created_at, updated_at
     )
     VALUES ($1, $2, $3, 'qa', 'active', false, false, 'enabled', $4, $5, now(), now())`,
    [
      bridgeInstanceId,
      tenantB,
      graphA.applicationId,
      'https://bridge-tenant-b.example.com',
      'Bridge instance from tenant B into tenant A application',
    ],
  );

  await runner.query(
    `INSERT INTO application_projects (tenant_id, application_id, project_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantB, graphA.applicationId, graphB.projectId],
  );
  await runner.query(
    `INSERT INTO application_suites (tenant_id, application_id, suite_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantB, graphA.applicationId, graphB.suiteApplicationId],
  );
  await runner.query(
    `INSERT INTO portfolio_request_applications (tenant_id, request_id, application_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantB, graphB.requestId, graphA.applicationId],
  );
  await runner.query(
    `INSERT INTO app_asset_assignments (
       tenant_id, app_instance_id, asset_id, role, notes, created_at, updated_at
     )
     VALUES ($1, $2, $3, 'primary', 'Cross-tenant bridge to tenant B asset', now(), now())`,
    [tenantB, bridgeInstanceId, graphB.assetId],
  );

  await runner.query(
    `INSERT INTO app_asset_assignments (
       tenant_id, app_instance_id, asset_id, role, notes, created_at, updated_at
     )
     VALUES ($1, $2, $3, 'secondary', 'Cross-tenant bridge to tenant A asset', now(), now())`,
    [tenantB, graphB.appInstanceId, graphA.assetId],
  );
  await runner.query(
    `INSERT INTO asset_projects (tenant_id, asset_id, project_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantB, graphA.assetId, graphB.projectId],
  );
  await runner.query(
    `INSERT INTO portfolio_request_assets (tenant_id, request_id, asset_id, created_at)
     VALUES ($1, $2, $3, now())`,
    [tenantB, graphB.requestId, graphA.assetId],
  );
  await runner.query(
    `INSERT INTO asset_relations (tenant_id, asset_id, related_asset_id, relation_type, notes, created_at)
     VALUES ($1, $2, $3, 'depends_on', 'Cross-tenant relation into tenant B asset', now())`,
    [tenantB, graphA.assetId, graphB.relatedAssetId],
  );
}

async function seedLifecycleProbeApplications(
  runner: any,
  tenantId: string,
  prefix: string,
) {
  await setCurrentTenant(runner, tenantId);

  const activeId = randomUUID();
  const retiredId = randomUUID();

  await runner.query(
    `INSERT INTO applications (
       id, tenant_id, name, category, description, criticality, data_class,
       hosting_model, users_mode, users_year, environment, lifecycle, status,
       disabled_at, created_at, updated_at
     )
     VALUES
       ($1, $2, $3, 'line_of_business', $4, 'high', 'internal', 'saas', 'manual', 25, 'prod', 'active', 'enabled', null, now(), now()),
       ($5, $2, $6, 'line_of_business', $7, 'medium', 'internal', 'saas', 'manual', 10, 'prod', 'retired', 'disabled', now() - interval '1 day', now(), now())`,
    [
      activeId,
      tenantId,
      `${prefix} Active`,
      `${prefix} active description`,
      retiredId,
      `${prefix} Retired`,
      `${prefix} retired description`,
    ],
  );

  return { activeId, retiredId };
}

async function disableRls(runner: any, tables: string[]) {
  for (const table of tables) {
    await runner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
    await runner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
  }
}

function getRelatedIdsByRelation(context: any, relation: string) {
  const group = context.related.find((entry: any) => entry.relation === relation);
  return group ? group.items.map((item: any) => item.id).sort() : [];
}

async function resolveDocumentId(manager: any, idOrRef: string): Promise<string | null> {
  const raw = String(idOrRef || '').trim();
  if (/^[0-9a-f-]{36}$/i.test(raw)) {
    return raw;
  }

  const match = raw.match(/^(?:DOC-)?(\d+)$/i);
  if (!match) {
    return null;
  }

  const rows = await manager.query(
    `SELECT id
     FROM documents
     WHERE item_number = $1
     LIMIT 1`,
    [Number(match[1])],
  );
  return rows[0]?.id ?? null;
}

function createKnowledgeToolAdapter(manager: any) {
  return {
    async search(query: any, opts?: { manager?: any }) {
      const activeManager = opts?.manager ?? manager;
      const term = String(query?.q || '').trim();
      const limit = Math.min(Math.max(Number(query?.limit) || 20, 1), 100);
      const like = `%${term}%`;
      const rows = await activeManager.query(
        `SELECT d.id,
                d.item_number,
                d.title,
                d.summary,
                d.status,
                d.updated_at,
                d.library_id,
                dl.name AS library_name
         FROM documents d
         LEFT JOIN document_libraries dl ON dl.id = d.library_id AND dl.tenant_id = d.tenant_id
         WHERE d.title ILIKE $1
            OR COALESCE(d.summary, '') ILIKE $1
            OR COALESCE(d.content_plain, '') ILIKE $1
         ORDER BY d.updated_at DESC, d.title ASC
         LIMIT $2`,
        [like, limit],
      );

      return {
        items: rows.map((row: any) => ({
          ...row,
          item_ref: `DOC-${row.item_number}`,
          snippet: row.summary ?? null,
        })),
        total: rows.length,
      };
    },

    async get(idOrRef: string, opts?: { manager?: any }) {
      const activeManager = opts?.manager ?? manager;
      const id = await resolveDocumentId(activeManager, idOrRef);
      if (!id) {
        return null;
      }

      const rows = await activeManager.query(
        `SELECT d.id,
                d.item_number,
                d.title,
                d.summary,
                d.status,
                d.content_markdown,
                d.updated_at,
                d.library_id,
                dl.name AS library_name,
                dl.slug AS library_slug,
                d.folder_id,
                f.name AS folder_name,
                d.document_type_id,
                dt.name AS document_type_name
         FROM documents d
         LEFT JOIN document_libraries dl ON dl.id = d.library_id AND dl.tenant_id = d.tenant_id
         LEFT JOIN document_folders f ON f.id = d.folder_id AND f.tenant_id = d.tenant_id
         LEFT JOIN document_types dt ON dt.id = d.document_type_id AND dt.tenant_id = d.tenant_id
         WHERE d.id = $1
         LIMIT 1`,
        [id],
      );
      if (!rows.length) {
        return null;
      }

      const document = rows[0];
      const [
        applicationRows,
        assetRows,
        projectRows,
        requestRows,
        taskRows,
      ] = await Promise.all([
        activeManager.query(
          `SELECT da.application_id, a.name
           FROM document_applications da
           JOIN applications a ON a.id = da.application_id AND a.tenant_id = da.tenant_id
           WHERE da.document_id = $1
           ORDER BY da.created_at ASC`,
          [id],
        ),
        activeManager.query(
          `SELECT da.asset_id, a.name
           FROM document_assets da
           JOIN assets a ON a.id = da.asset_id AND a.tenant_id = da.tenant_id
           WHERE da.document_id = $1
           ORDER BY da.created_at ASC`,
          [id],
        ),
        activeManager.query(
          `SELECT dp.project_id, p.name, p.item_number
           FROM document_projects dp
           JOIN portfolio_projects p ON p.id = dp.project_id AND p.tenant_id = dp.tenant_id
           WHERE dp.document_id = $1
           ORDER BY dp.created_at ASC`,
          [id],
        ),
        activeManager.query(
          `SELECT dr.request_id, r.name, r.item_number
           FROM document_requests dr
           JOIN portfolio_requests r ON r.id = dr.request_id AND r.tenant_id = dr.tenant_id
           WHERE dr.document_id = $1
           ORDER BY dr.created_at ASC`,
          [id],
        ),
        activeManager.query(
          `SELECT dt.task_id, t.title, t.item_number
           FROM document_tasks dt
           JOIN tasks t ON t.id = dt.task_id AND t.tenant_id = dt.tenant_id
           WHERE dt.document_id = $1
           ORDER BY dt.created_at ASC`,
          [id],
        ),
      ]);

      return {
        ...document,
        item_ref: `DOC-${document.item_number}`,
        contributors: [],
        relations: {
          applications: applicationRows.map((row: any) => ({ id: row.application_id, name: row.name })),
          assets: assetRows.map((row: any) => ({ id: row.asset_id, name: row.name })),
          projects: projectRows.map((row: any) => ({ id: row.project_id, name: row.item_number ? `PRJ-${row.item_number} - ${row.name}` : row.name })),
          requests: requestRows.map((row: any) => ({ id: row.request_id, name: row.item_number ? `REQ-${row.item_number} - ${row.name}` : row.name })),
          tasks: taskRows.map((row: any) => ({ id: row.task_id, name: row.item_number ? `T-${row.item_number} - ${row.title || 'Untitled task'}` : (row.title || 'Untitled task') })),
        },
      };
    },

    async getKnowledgeContextForEntity() {
      return {
        access: 'granted',
        total: 0,
        groups: [],
      };
    },
  };
}

function createAiQueryHarness(manager: any) {
  const knowledge = createKnowledgeToolAdapter(manager);
  const tasks = new TasksService(dataSource);
  const projects = new PortfolioProjectsListService(manager.getRepository(PortfolioProject));
  const requests = new PortfolioRequestsService(
    manager.getRepository(PortfolioRequest),
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  const applications = new ApplicationsListService(manager.getRepository(Application));
  const assets = new AssetsListService(manager.getRepository(Asset));
  const queryExecutor = new AiQueryExecutor(
    tasks as any,
    projects as any,
    requests as any,
    applications as any,
    assets as any,
    knowledge as any,
  );
  const aggregateExecutor = new AiAggregateExecutor(
    tasks as any,
    projects as any,
    requests as any,
    applications as any,
    assets as any,
    knowledge as any,
  );

  return { knowledge, queryExecutor, aggregateExecutor };
}

function createPermissivePolicyStub() {
  return {
    assertSurfaceAccess: async () => undefined,
    listReadableEntityTypes: async (_context: unknown, requested: string[]) => requested,
    canReadKnowledge: async () => true,
    assertKnowledgeReadAccess: async () => undefined,
    assertEntityTypeReadAccess: async () => undefined,
  } as any;
}

function assertNoTenantLeak(
  toolName: string,
  caseLabel: string,
  result: unknown,
  forbiddenIds: string[],
) {
  const serialized = JSON.stringify(result);
  for (const id of forbiddenIds) {
    assert.equal(
      serialized.includes(id),
      false,
      `${toolName}/${caseLabel} leaked tenant-B id ${id}`,
    );
  }
}

function buildToolIsolationCases(
  toolName: AiToolName,
  fixtures: {
    graphA: SeededGraph;
    graphB: SeededGraph;
    knowledgeA: SeededKnowledge;
  },
) {
  switch (toolName) {
    case 'search_all':
      return [{
        label: 'search-all',
        input: {
          query: 'Shared Boundary',
          entity_types: ['applications', 'assets', 'projects', 'requests', 'tasks', 'documents'],
          limit: 20,
        },
        assertResult: (result: any) => {
          assert.equal(
            result.items.some((item: any) => item.id === fixtures.graphA.applicationId),
            true,
          );
          assert.equal(
            result.items.some((item: any) => item.id === fixtures.graphA.assetId),
            true,
          );
          assert.equal(
            result.items.some((item: any) => item.id === fixtures.graphA.projectId),
            true,
          );
          assert.equal(
            result.items.some((item: any) => item.id === fixtures.graphA.requestId),
            true,
          );
          assert.equal(
            result.items.some((item: any) => item.id === fixtures.graphA.taskId),
            true,
          );
          assert.equal(
            result.items.some((item: any) => item.id === fixtures.knowledgeA.documentId),
            true,
          );
        },
      }];

    case 'get_entity_context':
      return [
        {
          label: 'applications',
          input: { entity_type: 'applications', entity_id: fixtures.graphA.applicationId },
          assertResult: (result: any) => {
            assert.equal(result.entity.id, fixtures.graphA.applicationId);
            assert.deepEqual(getRelatedIdsByRelation(result, 'linked_requests'), [fixtures.graphA.requestId]);
            assert.deepEqual(getRelatedIdsByRelation(result, 'linked_projects'), [fixtures.graphA.projectId]);
          },
        },
        {
          label: 'assets',
          input: { entity_type: 'assets', entity_id: fixtures.graphA.assetId },
          assertResult: (result: any) => {
            assert.equal(result.entity.id, fixtures.graphA.assetId);
            assert.deepEqual(getRelatedIdsByRelation(result, 'linked_applications'), [fixtures.graphA.applicationId]);
            assert.deepEqual(getRelatedIdsByRelation(result, 'linked_projects'), [fixtures.graphA.projectId]);
          },
        },
        {
          label: 'projects',
          input: { entity_type: 'projects', entity_id: fixtures.graphA.projectId },
          assertResult: (result: any) => {
            assert.equal(result.entity.id, fixtures.graphA.projectId);
            assert.deepEqual(getRelatedIdsByRelation(result, 'linked_applications'), [fixtures.graphA.applicationId]);
            assert.deepEqual(getRelatedIdsByRelation(result, 'linked_assets'), [fixtures.graphA.assetId]);
          },
        },
        {
          label: 'requests',
          input: { entity_type: 'requests', entity_id: fixtures.graphA.requestId },
          assertResult: (result: any) => {
            assert.equal(result.entity.id, fixtures.graphA.requestId);
            assert.deepEqual(getRelatedIdsByRelation(result, 'linked_applications'), [fixtures.graphA.applicationId]);
            assert.deepEqual(getRelatedIdsByRelation(result, 'linked_assets'), [fixtures.graphA.assetId]);
          },
        },
        {
          label: 'tasks',
          input: { entity_type: 'tasks', entity_id: fixtures.graphA.taskId },
          assertResult: (result: any) => {
            assert.equal(result.entity.id, fixtures.graphA.taskId);
            assert.deepEqual(getRelatedIdsByRelation(result, 'related_project'), [fixtures.graphA.projectId]);
            assert.deepEqual(getRelatedIdsByRelation(result, 'converted_request'), [fixtures.graphA.requestId]);
          },
        },
      ];

    case 'query_entities':
      return [
        {
          label: 'tasks-status',
          input: {
            entity_type: 'tasks',
            q: 'Shared Boundary Task',
            filters: { status: ['open'] },
            limit: 10,
          },
          assertResult: (result: any) => {
            assert.equal(result.total, 1);
            assert.deepEqual(result.filters_applied, ['status']);
            assert.deepEqual(result.filters_ignored, []);
            assert.deepEqual(result.items.map((item: any) => item.id), [fixtures.graphA.taskId]);
          },
        },
        {
          label: 'projects-date',
          input: {
            entity_type: 'projects',
            filters: {
              planned_end: { op: 'before', value: '2027-01-01' },
            },
            limit: 10,
          },
          assertResult: (result: any) => {
            assert.equal(result.total, 1);
            assert.deepEqual(result.filters_applied, ['planned_end']);
            assert.equal(
              result.items.some((item: any) => item.id === fixtures.graphA.projectId),
              true,
            );
          },
        },
      ];

    case 'aggregate_entities':
      return [{
        label: 'tasks-by-status',
        input: {
          entity_type: 'tasks',
          group_by: 'status',
          q: 'Shared Boundary Task',
        },
        assertResult: (result: any) => {
          assert.equal(result.total, 1);
          assert.deepEqual(result.groups, [{ key: 'open', count: 1 }]);
          assert.deepEqual(result.filters_applied, []);
          assert.deepEqual(result.filters_ignored, []);
        },
      }];

    case 'get_filter_values':
      return [{
        label: 'applications-values',
        input: {
          entity_type: 'applications',
          fields: ['status', 'lifecycle'],
        },
        assertResult: (result: any) => {
          assert.equal(result.values.status.includes('enabled'), true);
          assert.equal(result.values.lifecycle.includes('active'), true);
          assert.deepEqual(result.fields_ignored, []);
        },
      }];

    case 'search_knowledge':
      return [{
        label: 'search-knowledge',
        input: {
          query: 'Shared Boundary Knowledge',
          limit: 10,
        },
        assertResult: (result: any) => {
          assert.deepEqual(
            result.items.map((item: any) => item.id),
            [fixtures.knowledgeA.documentId],
          );
        },
      }];

    case 'get_document':
      return [{
        label: 'get-document',
        input: {
          document_id: 'DOC-5101',
        },
        assertResult: (result: any) => {
          assert.equal(result.id, fixtures.knowledgeA.documentId);
          assert.deepEqual(result.relations.applications.map((item: any) => item.id), [fixtures.graphA.applicationId]);
          assert.deepEqual(result.relations.assets.map((item: any) => item.id), [fixtures.graphA.assetId]);
          assert.deepEqual(result.relations.projects.map((item: any) => item.id), [fixtures.graphA.projectId]);
          assert.deepEqual(result.relations.requests.map((item: any) => item.id), [fixtures.graphA.requestId]);
          assert.deepEqual(result.relations.tasks.map((item: any) => item.id), [fixtures.graphA.taskId]);
        },
      }];

    default: {
      const exhaustive: never = toolName;
      throw new Error(`Unhandled AI tool isolation case: ${exhaustive}`);
    }
  }
}

async function testAiPhase1RepairMigrationReassertsCriticalRls() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  const tables = [
    'assets',
    'app_instances',
    'app_asset_assignments',
    'application_projects',
    'asset_projects',
    'portfolio_request_applications',
    'portfolio_request_assets',
  ];

  try {
    for (const table of tables) {
      await runner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await runner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await runner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }

    const migration = new AiPhase1RlsRepair1844200000000();
    await migration.up(runner);

    for (const table of tables) {
      const state = await getRlsState(runner, table);
      assert.equal(state.enabled, true, `${table} should have RLS enabled`);
      assert.equal(state.forced, true, `${table} should have RLS forced`);
      assert.equal(await hasTenantIsolationPolicy(runner, table), true, `${table} should have a tenant isolation policy`);
    }
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function testAiEntityServicePhase1TenantDefenseInDepth() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  const tenantA = randomUUID();
  const tenantB = randomUUID();

  try {
    await seedTenant(runner, tenantA, `ai-phase1-a-${tenantA.slice(0, 8)}`, 'AI Phase 1 Tenant A');
    await seedTenant(runner, tenantB, `ai-phase1-b-${tenantB.slice(0, 8)}`, 'AI Phase 1 Tenant B');

    const graphA = await seedApplicationAssetGraph(runner, tenantA, '3101', {
      applicationName: 'Shared Boundary Application',
      assetName: 'Shared Boundary Asset',
      requestName: 'Tenant A Request',
      projectName: 'Tenant A Project',
    });
    const graphB = await seedApplicationAssetGraph(runner, tenantB, '4101', {
      applicationName: 'Shared Boundary Application',
      assetName: 'Shared Boundary Asset',
      requestName: 'Tenant B Request',
      projectName: 'Tenant B Project',
    });

    await disableRls(runner, [
      'applications',
      'assets',
      'app_instances',
      'app_asset_assignments',
      'portfolio_projects',
      'portfolio_requests',
      'application_suites',
      'asset_relations',
      'application_projects',
      'asset_projects',
      'portfolio_request_applications',
      'portfolio_request_assets',
    ]);

    await insertCrossTenantLeakShapes(runner, tenantA, tenantB, graphA, graphB);

    const entityService = new AiEntityService(
      {
        search: async () => ({ items: [], total: 0 }),
        getKnowledgeContextForEntity: async () => ({
          access: 'granted',
          total: 0,
          groups: [],
        }),
      } as any,
      {
        listReadableEntityTypes: async (_context: unknown, requested: string[]) => requested,
        assertEntityTypeReadAccess: async () => undefined,
      } as any,
    );

    await setCurrentTenant(runner, tenantA);
    const tenantAContext = {
      tenantId: tenantA,
      userId: randomUUID(),
      isPlatformHost: false,
      surface: 'chat' as const,
      authMethod: 'jwt' as const,
      manager: runner.manager,
    };

    const applicationSearch = await entityService.searchAll(tenantAContext, {
      query: 'Shared Boundary Application',
      entity_types: ['applications'],
      limit: 10,
    });
    assert.deepEqual(applicationSearch.items.map((item: any) => item.id), [graphA.applicationId]);

    const assetSearch = await entityService.searchAll(tenantAContext, {
      query: 'Shared Boundary Asset',
      entity_types: ['assets'],
      limit: 10,
    });
    assert.deepEqual(assetSearch.items.map((item: any) => item.id), [graphA.assetId]);

    const applicationContext = await entityService.getEntityContext(tenantAContext, {
      entity_type: 'applications',
      entity_id: graphA.applicationId,
    });
    assert.equal(applicationContext.entity.id, graphA.applicationId);
    assert.deepEqual(getRelatedIdsByRelation(applicationContext, 'linked_requests'), [graphA.requestId]);
    assert.deepEqual(getRelatedIdsByRelation(applicationContext, 'linked_projects'), [graphA.projectId]);
    assert.deepEqual(getRelatedIdsByRelation(applicationContext, 'related_applications'), [graphA.suiteApplicationId]);
    assert.deepEqual(getRelatedIdsByRelation(applicationContext, 'linked_assets'), [graphA.assetId]);
    assert.equal(
      applicationContext.related.some((group: any) => group.items.some((item: any) =>
        [graphB.requestId, graphB.projectId, graphB.suiteApplicationId, graphB.assetId].includes(item.id))),
      false,
    );

    const assetContext = await entityService.getEntityContext(tenantAContext, {
      entity_type: 'assets',
      entity_id: graphA.assetId,
    });
    assert.equal(assetContext.entity.id, graphA.assetId);
    assert.deepEqual(getRelatedIdsByRelation(assetContext, 'linked_requests'), [graphA.requestId]);
    assert.deepEqual(getRelatedIdsByRelation(assetContext, 'linked_projects'), [graphA.projectId]);
    assert.deepEqual(getRelatedIdsByRelation(assetContext, 'related_assets'), [graphA.relatedAssetId]);
    assert.deepEqual(getRelatedIdsByRelation(assetContext, 'linked_applications'), [graphA.applicationId]);
    assert.equal(
      assetContext.related.some((group: any) => group.items.some((item: any) =>
        [graphB.requestId, graphB.projectId, graphB.relatedAssetId, graphB.applicationId].includes(item.id))),
      false,
    );
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function testAiToolRegistryIsolationCoverageTracksRegisteredTools() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  const tenantA = randomUUID();
  const tenantB = randomUUID();

  try {
    await seedTenant(runner, tenantA, `ai-tools-a-${tenantA.slice(0, 8)}`, 'AI Tools Tenant A');
    await seedTenant(runner, tenantB, `ai-tools-b-${tenantB.slice(0, 8)}`, 'AI Tools Tenant B');

    const graphA = await seedApplicationAssetGraph(runner, tenantA, '5101', {
      applicationName: 'Shared Boundary Application',
      assetName: 'Shared Boundary Asset',
      requestName: 'Shared Boundary Request',
      projectName: 'Shared Boundary Project',
      taskTitle: 'Shared Boundary Task',
    });
    const graphB = await seedApplicationAssetGraph(runner, tenantB, '6101', {
      applicationName: 'Shared Boundary Application',
      assetName: 'Shared Boundary Asset',
      requestName: 'Shared Boundary Request',
      projectName: 'Shared Boundary Project',
      taskTitle: 'Shared Boundary Task',
    });

    const knowledgeA = await seedKnowledgeGraph(runner, tenantA, graphA, '5101', {
      documentTitle: 'Shared Boundary Knowledge',
      documentSummary: 'Tenant A knowledge summary',
    });
    const knowledgeB = await seedKnowledgeGraph(runner, tenantB, graphB, '6101', {
      documentTitle: 'Shared Boundary Knowledge',
      documentSummary: 'Tenant B knowledge summary',
    });

    const policy = createPermissivePolicyStub();
    const { knowledge, queryExecutor, aggregateExecutor } = createAiQueryHarness(runner.manager);
    const entityService = new AiEntityService(knowledge as any, policy);
    const registry = new AiToolRegistry(
      entityService,
      knowledge as any,
      policy,
      queryExecutor,
      aggregateExecutor,
    );

    const tenantAContext = {
      tenantId: tenantA,
      userId: 'ai-tool-admin',
      isPlatformHost: false,
      surface: 'chat' as const,
      authMethod: 'jwt' as const,
      manager: runner.manager,
    };

    const forbiddenIds = [
      graphB.applicationId,
      graphB.suiteApplicationId,
      graphB.assetId,
      graphB.relatedAssetId,
      graphB.appInstanceId,
      graphB.projectId,
      graphB.requestId,
      graphB.taskId,
      knowledgeB.libraryId,
      knowledgeB.documentTypeId,
      knowledgeB.documentId,
    ];

    for (const tool of registry.listRegisteredTools()) {
      assert.equal(tool.surfaces.includes('chat'), true, `${tool.name} should be callable on chat for coverage`);
      for (const testCase of buildToolIsolationCases(tool.name, { graphA, graphB, knowledgeA })) {
        await setCurrentTenant(runner, tenantA);
        const result = await registry.execute(tenantAContext, tool.name, testCase.input);
        assertNoTenantLeak(tool.name, testCase.label, result, forbiddenIds);
        testCase.assertResult(result);
      }
    }
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function testAiQueryLayerToolsHandleInactiveApplicationsAndStayTenantScoped() {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  const tenantA = randomUUID();
  const tenantB = randomUUID();

  try {
    await seedTenant(runner, tenantA, `ai-query-a-${tenantA.slice(0, 8)}`, 'AI Query Tenant A');
    await seedTenant(runner, tenantB, `ai-query-b-${tenantB.slice(0, 8)}`, 'AI Query Tenant B');

    const tenantAApps = await seedLifecycleProbeApplications(runner, tenantA, 'Lifecycle Probe');
    const tenantBApps = await seedLifecycleProbeApplications(runner, tenantB, 'Lifecycle Probe');

    const policy = createPermissivePolicyStub();
    const { knowledge, queryExecutor, aggregateExecutor } = createAiQueryHarness(runner.manager);
    const entityService = new AiEntityService(knowledge as any, policy);
    const registry = new AiToolRegistry(
      entityService,
      knowledge as any,
      policy,
      queryExecutor,
      aggregateExecutor,
    );

    await setCurrentTenant(runner, tenantA);
    const tenantAContext = {
      tenantId: tenantA,
      userId: 'ai-query-admin',
      isPlatformHost: false,
      surface: 'chat' as const,
      authMethod: 'jwt' as const,
      manager: runner.manager,
    };

    const queryResult = await registry.execute(tenantAContext, 'query_entities', {
      entity_type: 'applications',
      q: 'Lifecycle Probe',
      limit: 10,
    }) as any;
    assert.equal(queryResult.total, 2);
    assert.deepEqual(
      queryResult.items.map((item: any) => item.id).sort(),
      [tenantAApps.activeId, tenantAApps.retiredId].sort(),
    );
    assertNoTenantLeak('query_entities', 'applications-include-inactive', queryResult, [tenantBApps.activeId, tenantBApps.retiredId]);

    const aggregateResult = await registry.execute(tenantAContext, 'aggregate_entities', {
      entity_type: 'applications',
      group_by: 'lifecycle',
      q: 'Lifecycle Probe',
    }) as any;
    assert.equal(aggregateResult.total, 2);
    assert.deepEqual(aggregateResult.groups, [
      { key: 'active', count: 1 },
      { key: 'retired', count: 1 },
    ]);
    assertNoTenantLeak('aggregate_entities', 'applications-include-inactive', aggregateResult, [tenantBApps.activeId, tenantBApps.retiredId]);

    const filterValuesResult = await registry.execute(tenantAContext, 'get_filter_values', {
      entity_type: 'applications',
      fields: ['status', 'lifecycle'],
    }) as any;
    assert.equal(filterValuesResult.values.status.includes('enabled'), true);
    assert.equal(filterValuesResult.values.status.includes('disabled'), true);
    assert.equal(filterValuesResult.values.lifecycle.includes('active'), true);
    assert.equal(filterValuesResult.values.lifecycle.includes('retired'), true);
    assert.deepEqual(filterValuesResult.fields_ignored, []);
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function run() {
  await dataSource.initialize();
  try {
    await testAiPhase1RepairMigrationReassertsCriticalRls();
    await testAiEntityServicePhase1TenantDefenseInDepth();
    await testAiQueryLayerToolsHandleInactiveApplicationsAndStayTenantScoped();
    await testAiToolRegistryIsolationCoverageTracksRegisteredTools();
  } finally {
    await dataSource.destroy();
  }
}

void run();
