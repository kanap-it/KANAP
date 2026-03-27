import * as assert from 'node:assert/strict';
import { Features } from '../../config/features';
import { AiToolRegistry } from '../ai-tool.registry';

function createContext() {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    isPlatformHost: false,
    surface: 'mcp' as const,
    authMethod: 'api_key' as const,
    manager: { tag: 'manager' } as any,
  };
}

function createRegistry(overrides?: {
  entityTools?: any;
  knowledge?: any;
  policy?: any;
  queryExecutor?: any;
  aggregateExecutor?: any;
  settingsService?: any;
  braveSearch?: any;
}) {
  return new AiToolRegistry(
    {
      searchAll: async () => ({ items: [], total: 0, entity_types: ['applications'] }),
      getEntityContext: async () => ({ entity: { id: 'app-1' }, related: [], knowledge: null }),
      ...(overrides?.entityTools || {}),
    } as any,
    {
      search: async () => ({ total: 0, items: [] }),
      get: async () => null,
      ...(overrides?.knowledge || {}),
    } as any,
    {
      assertSurfaceAccess: async () => undefined,
      listReadableEntityTypes: async () => ['applications', 'documents'],
      canReadKnowledge: async () => true,
      assertKnowledgeReadAccess: async () => undefined,
      assertEntityTypeReadAccess: async () => undefined,
      ...(overrides?.policy || {}),
    } as any,
    {
      execute: async () => ({ items: [], total: 0, filters_applied: [], filters_ignored: [] }),
      executeFilterValues: async () => ({ values: {}, fields_ignored: [] }),
      ...(overrides?.queryExecutor || {}),
    } as any,
    {
      execute: async () => ({ group_by: 'status', groups: [], total: 0, filters_applied: [], filters_ignored: [] }),
      ...(overrides?.aggregateExecutor || {}),
    } as any,
    {
      find: async () => ({ web_search_enabled: true }),
      ...(overrides?.settingsService || {}),
    } as any,
    {
      search: async () => ([{ title: 'Test', url: 'https://example.com', description: 'Test result' }]),
      ...(overrides?.braveSearch || {}),
    } as any,
  );
}

async function testListAvailableTools() {
  const registry = createRegistry();

  const tools = await registry.listAvailableTools(createContext());
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ['search_all', 'query_entities', 'aggregate_entities', 'get_filter_values', 'get_entity_context', 'search_knowledge', 'get_document'],
  );
}

async function testListRegisteredToolsExposesRuntimeRegistry() {
  const registry = createRegistry();

  assert.deepEqual(
    registry.listRegisteredTools().map((tool) => tool.name),
    ['search_all', 'query_entities', 'aggregate_entities', 'get_filter_values', 'get_entity_context', 'search_knowledge', 'get_document', 'web_search'],
  );
}

async function testSearchAllDelegatesToEntityTools() {
  const calls: unknown[] = [];
  const registry = createRegistry({
    entityTools: {
      searchAll: async (_context: unknown, input: unknown) => {
        calls.push(input);
        return { items: [{ id: 'app-1' }], total: 1, entity_types: ['applications'] };
      },
    },
    policy: {
      listReadableEntityTypes: async () => ['applications'],
    },
  });

  const result = await registry.execute(createContext(), 'search_all', {
    query: 'billing',
    entity_types: ['applications'],
    limit: 5,
  }) as any;

  assert.equal(result.total, 1);
  assert.deepEqual(calls, [{
    query: 'billing',
    entity_types: ['applications'],
    limit: 5,
  }]);
}

async function testSearchAllAppliesGenerousDefaultLimit() {
  const calls: unknown[] = [];
  const registry = createRegistry({
    entityTools: {
      searchAll: async (_context: unknown, input: unknown) => {
        calls.push(input);
        return { items: [], total: 0, entity_types: ['applications'] };
      },
    },
  });

  await registry.execute(createContext(), 'search_all', {
    query: 'billing',
  });

  assert.deepEqual(calls, [{
    query: 'billing',
    limit: 100,
  }]);
}

async function testGetEntityContextDelegatesToEntityTools() {
  const calls: unknown[] = [];
  const registry = createRegistry({
    entityTools: {
      getEntityContext: async (_context: unknown, input: unknown) => {
        calls.push(input);
        return { entity: { id: 'app-1' }, related: [], knowledge: null };
      },
    },
    policy: {
      listReadableEntityTypes: async () => ['applications'],
    },
  });

  const result = await registry.execute(createContext(), 'get_entity_context', {
    entity_type: 'applications',
    entity_id: 'app-1',
  }) as any;

  assert.equal(result.entity.id, 'app-1');
  assert.deepEqual(calls, [{
    entity_type: 'applications',
    entity_id: 'app-1',
  }]);
}

async function testSearchKnowledgeMapsStableDto() {
  const registry = createRegistry({
    knowledge: {
      search: async () => ({
        total: 1,
        items: [{
          id: 'doc-1',
          item_number: 14,
          title: 'AI Guide',
          summary: 'Tenant-safe knowledge',
          status: 'published',
          snippet: 'Stable DTO snippet',
          library_id: 'lib-1',
          library_name: 'Operations',
          updated_at: '2026-03-16T08:00:00.000Z',
        }],
      }),
    },
    policy: {
      listReadableEntityTypes: async () => ['documents'],
    },
  });

  const result = await registry.execute(createContext(), 'search_knowledge', {
    query: 'stable dto',
    limit: 10,
  }) as any;

  assert.equal(result.total, 1);
  assert.equal(result.items[0].ref, 'DOC-14');
  assert.equal(result.items[0].library.name, 'Operations');
}

async function testSearchKnowledgeAppliesDefaultLimit() {
  const calls: unknown[] = [];
  const registry = createRegistry({
    knowledge: {
      search: async (query: unknown) => {
        calls.push(query);
        return { total: 0, items: [] };
      },
    },
  });

  await registry.execute(createContext(), 'search_knowledge', {
    query: 'runbook',
  });

  assert.deepEqual(calls, [{
    q: 'runbook',
    offset: 0,
    limit: 100,
  }]);
}

async function testGetDocumentMapsStableDto() {
  const registry = createRegistry({
    knowledge: {
      get: async () => ({
        id: 'doc-1',
        item_number: 7,
        item_ref: 'DOC-7',
        title: 'Runbook',
        summary: 'Draft runbook',
        status: 'draft',
        content_markdown: '# Title',
        updated_at: '2026-03-16T08:00:00.000Z',
        library_id: 'lib-1',
        library_name: 'Knowledge',
        library_slug: 'knowledge',
        folder_id: 'folder-1',
        folder_name: 'Operations',
        document_type_id: 'type-1',
        document_type_name: 'Runbook',
        relations: {
          applications: [{ id: 'app-1', name: 'Billing App' }],
          assets: [],
          projects: [],
          requests: [],
          tasks: [],
        },
        contributors: [{ user_id: 'user-1', user_name: 'A. User', role: 'owner', is_primary: true }],
      }),
    },
    policy: {
      listReadableEntityTypes: async () => ['documents'],
    },
  });

  const result = await registry.execute(createContext(), 'get_document', {
    document_id: 'DOC-7',
  }) as any;

  assert.equal(result.ref, 'DOC-7');
  assert.equal(result.relations.applications[0].label, 'Billing App');
  assert.equal(result.contributors[0].name, 'A. User');
}

async function testQueryEntitiesDelegatesToQueryExecutor() {
  const calls: unknown[] = [];
  const registry = createRegistry({
    queryExecutor: {
      execute: async (_context: unknown, input: unknown) => {
        calls.push(input);
        return { items: [{ id: 'task-1' }], total: 1, filters_applied: ['status'], filters_ignored: [] };
      },
    },
  });

  const result = await registry.execute(createContext(), 'query_entities', {
    entity_type: 'tasks',
    filters: { status: ['open'] },
    limit: 10,
  }) as any;

  assert.equal(result.total, 1);
  assert.deepEqual(calls, [{
    entity_type: 'tasks',
    filters: { status: ['open'] },
    page: 1,
    limit: 10,
  }]);
}

async function testQueryEntitiesAppliesGenerousDefaultLimit() {
  const calls: unknown[] = [];
  const registry = createRegistry({
    queryExecutor: {
      execute: async (_context: unknown, input: unknown) => {
        calls.push(input);
        return { items: [], total: 0, filters_applied: [], filters_ignored: [] };
      },
    },
  });

  await registry.execute(createContext(), 'query_entities', {
    entity_type: 'tasks',
  });

  assert.deepEqual(calls, [{
    entity_type: 'tasks',
    page: 1,
    limit: 200,
  }]);
}

async function testSchemasExposeDefaultLimits() {
  const registry = createRegistry();
  const schemas = await registry.getToolJsonSchemas(createContext()) as any[];

  const searchAll = schemas.find((schema) => schema.name === 'search_all');
  const queryEntities = schemas.find((schema) => schema.name === 'query_entities');
  const searchKnowledge = schemas.find((schema) => schema.name === 'search_knowledge');

  assert.equal(searchAll.parameters.properties.limit.default, 100);
  assert.equal(queryEntities.parameters.properties.page.default, 1);
  assert.equal(queryEntities.parameters.properties.limit.default, 200);
  assert.equal(searchKnowledge.parameters.properties.offset.default, 0);
  assert.equal(searchKnowledge.parameters.properties.limit.default, 100);
}

async function testAggregateEntitiesDelegatesToAggregateExecutor() {
  const calls: unknown[] = [];
  const registry = createRegistry({
    aggregateExecutor: {
      execute: async (_context: unknown, input: unknown) => {
        calls.push(input);
        return { group_by: 'status', metric: 'priority_score', function: 'sum', groups: [{ key: 'open', value: 2 }], total: 2, filters_applied: [], filters_ignored: [] };
      },
    },
  });

  const result = await registry.execute(createContext(), 'aggregate_entities', {
    entity_type: 'tasks',
    group_by: 'status',
    metric: 'priority_score',
    function: 'sum',
  }) as any;

  assert.equal(result.total, 2);
  assert.deepEqual(calls, [{
    entity_type: 'tasks',
    group_by: 'status',
    metric: 'priority_score',
    function: 'sum',
  }]);
}

async function testAggregateEntitiesSchemaExposesMetricAndFunction() {
  const registry = createRegistry();
  const schemas = await registry.getToolJsonSchemas(createContext()) as any[];
  const aggregate = schemas.find((schema) => schema.name === 'aggregate_entities');

  assert.equal(aggregate.parameters.properties.metric.type, 'string');
  assert.deepEqual(aggregate.parameters.properties.function.enum, ['count', 'sum', 'avg', 'min', 'max']);
}

async function testGetFilterValuesDelegatesToQueryExecutor() {
  const calls: unknown[] = [];
  const registry = createRegistry({
    queryExecutor: {
      executeFilterValues: async (_context: unknown, input: unknown) => {
        calls.push(input);
        return { values: { status: ['open', 'done'] }, fields_ignored: [] };
      },
    },
  });

  const result = await registry.execute(createContext(), 'get_filter_values', {
    entity_type: 'tasks',
    fields: ['status'],
  }) as any;

  assert.deepEqual(result.values.status, ['open', 'done']);
  assert.deepEqual(calls, [{
    entity_type: 'tasks',
    fields: ['status'],
  }]);
}

async function testWebSearchRejectsOversizedQueries() {
  const original = Features.AI_WEB_SEARCH_READY;
  try {
    (Features as any).AI_WEB_SEARCH_READY = true;
    const registry = createRegistry();

    await assert.rejects(
      () => registry.execute(createContext(), 'web_search', {
        query: 'x'.repeat(257),
      }),
      () => true,
    );
  } finally {
    (Features as any).AI_WEB_SEARCH_READY = original;
  }
}

async function run() {
  await testListAvailableTools();
  await testListRegisteredToolsExposesRuntimeRegistry();
  await testSearchAllDelegatesToEntityTools();
  await testSearchAllAppliesGenerousDefaultLimit();
  await testQueryEntitiesDelegatesToQueryExecutor();
  await testQueryEntitiesAppliesGenerousDefaultLimit();
  await testAggregateEntitiesDelegatesToAggregateExecutor();
  await testAggregateEntitiesSchemaExposesMetricAndFunction();
  await testGetFilterValuesDelegatesToQueryExecutor();
  await testGetEntityContextDelegatesToEntityTools();
  await testSearchKnowledgeMapsStableDto();
  await testSearchKnowledgeAppliesDefaultLimit();
  await testSchemasExposeDefaultLimits();
  await testGetDocumentMapsStableDto();
  await testWebSearchRejectsOversizedQueries();
}

void run();
