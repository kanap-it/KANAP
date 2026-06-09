import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AiEntityService } from '../ai-entity.service';

function createService() {
  return new AiEntityService(
    {
      searchMentionOptions: async () => ({ items: [], total: 0 }),
      getKnowledgeContextForEntity: async () => ({
        access: 'granted',
        total: 0,
        groups: [],
      }),
    } as any,
    {
      listReadableEntityTypes: async (_context: unknown, requested: string[]) => requested,
      canReadKnowledge: async () => true,
      assertEntityTypeReadAccess: async () => undefined,
    } as any,
  );
}

function createContext(query: (sql: string, params?: unknown[]) => Promise<unknown[]>) {
  return {
    tenantId: randomUUID(),
    userId: randomUUID(),
    isPlatformHost: false,
    surface: 'chat' as const,
    authMethod: 'jwt' as const,
    manager: { query },
  };
}

async function testSearchAllCastsNonTextFieldsBeforeLike() {
  const sqlStatements: string[] = [];
  const service = createService();
  const context = createContext(async (sql) => {
    sqlStatements.push(sql);
    return [];
  });

  const result = await service.searchAll(context as any, {
    query: 'Eva Fried task',
    entity_types: ['spend_items', 'capex_items'],
    limit: 10,
  });

  assert.equal(result.complete, true);
  assert.equal(result.truncated, false);
  assert.deepEqual((result as any).failed_entity_types, []);
  assert.equal(sqlStatements.some((sql) => sql.includes('acc.account_number::text')), true);
  assert.equal(sqlStatements.some((sql) => sql.includes('ci.ppe_type::text')), true);
  assert.equal(sqlStatements.some((sql) => sql.includes("COALESCE(acc.account_number, '')")), false);
  assert.equal(sqlStatements.some((sql) => sql.includes("COALESCE(ci.ppe_type, '')")), false);
}

async function testSearchAllReportsPartialEntityFailures() {
  const service = createService();
  const context = createContext(async (sql) => {
    if (sql.includes('FROM capex_items')) {
      throw new Error('invalid input value for enum ppe_type: ""');
    }
    return [];
  });

  const result = await service.searchAll(context as any, {
    query: 'project',
    entity_types: ['spend_items', 'capex_items'],
    limit: 10,
  });

  assert.equal(result.complete, false);
  assert.equal(result.truncated, false);
  assert.deepEqual((result as any).failed_entity_types, ['capex_items']);
  assert.equal((result as any).warnings[0].entity_type, 'capex_items');
}

async function run() {
  await testSearchAllCastsNonTextFieldsBeforeLike();
  await testSearchAllReportsPartialEntityFailures();
}

void run();
