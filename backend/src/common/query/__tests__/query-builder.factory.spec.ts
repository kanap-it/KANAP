import * as assert from 'node:assert/strict';
import { QueryBuilder, QueryBuilderFactory, FilterTarget } from '../query-builder.factory';

// Mock SelectQueryBuilder
function createMockQueryBuilder() {
  const state = {
    whereClauses: [] as Array<{ sql: string; params?: Record<string, any> }>,
    orderByClauses: [] as Array<{ column: string; direction: string }>,
    joins: [] as Array<{ entity: string; alias: string; condition: string }>,
    selections: [] as Array<{ selection: string; alias?: string }>,
    skip: 0,
    take: 100,
  };

  const qb: any = {
    andWhere(sql: any, params?: any) {
      // Handle Brackets
      if (typeof sql === 'object' && sql.whereFactory) {
        // Simulate the Brackets callback
        const subQb = {
          where(innerSql: string, innerParams?: any) {
            state.whereClauses.push({ sql: innerSql, params: innerParams });
            return this;
          },
          orWhere(innerSql: string, innerParams?: any) {
            state.whereClauses.push({ sql: `OR ${innerSql}`, params: innerParams });
            return this;
          },
        };
        sql.whereFactory(subQb);
      } else {
        state.whereClauses.push({ sql, params });
      }
      return qb;
    },
    orderBy(column: string, direction: string) {
      state.orderByClauses = [{ column, direction }];
      return qb;
    },
    addOrderBy(column: string, direction: string) {
      state.orderByClauses.push({ column, direction });
      return qb;
    },
    leftJoin(entity: string, alias: string, condition: string) {
      state.joins.push({ entity, alias, condition });
      return qb;
    },
    addSelect(selection: string, alias?: string) {
      state.selections.push({ selection, alias });
      return qb;
    },
    skip(n: number) {
      state.skip = n;
      return qb;
    },
    take(n: number) {
      state.take = n;
      return qb;
    },
    async getCount() {
      return 42;
    },
    async getMany() {
      return [{ id: '1', name: 'Test' }];
    },
    async getRawAndEntities() {
      return {
        raw: [{ id: '1', name: 'Test', s_name: 'Supplier' }],
        entities: [{ id: '1', name: 'Test' }],
      };
    },
    getState() {
      return state;
    },
  };

  return qb;
}

// Mock Repository
function createMockRepository(mockQb: any) {
  return {
    createQueryBuilder(alias: string) {
      return mockQb;
    },
  } as any;
}

async function testQueryBuilderCreation() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
    { field: 'status', column: 'status', type: 'enum' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  assert.ok(builder instanceof QueryBuilder, 'Factory should create QueryBuilder instance');
}

async function testBaseConditions() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  builder.addBaseCondition('a.disabled_at IS NULL');
  builder.addBaseCondition('a.status = :status', { status: 'active' });

  await builder.execute();

  const state = mockQb.getState();
  assert.ok(
    state.whereClauses.some((c: any) => c.sql === 'a.disabled_at IS NULL'),
    'Should add base condition without params',
  );
  assert.ok(
    state.whereClauses.some((c: any) => c.sql === 'a.status = :status' && c.params?.status === 'active'),
    'Should add base condition with params',
  );
}

async function testFiltersContains() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    filters: {
      name: { type: 'contains', filter: 'test' },
    },
  });

  const state = mockQb.getState();
  const hasContainsFilter = state.whereClauses.some(
    (c: any) => c.sql.includes('ILIKE') && Object.values(c.params || {}).some((v) => v === '%test%'),
  );
  assert.ok(hasContainsFilter, 'Should apply contains filter with ILIKE');
}

async function testFiltersEquals() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'status', column: 'status', type: 'enum' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    filters: {
      status: { type: 'equals', filter: 'active' },
    },
  });

  const state = mockQb.getState();
  const hasEqualsFilter = state.whereClauses.some(
    (c: any) => c.sql.includes('=') && Object.values(c.params || {}).includes('active'),
  );
  assert.ok(hasEqualsFilter, 'Should apply equals filter');
}

async function testFiltersNumber() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'score', column: 'score', type: 'number' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    filters: {
      score: { filterType: 'number', type: 'greaterThan', filter: 50 },
    },
  });

  const state = mockQb.getState();
  const hasNumericFilter = state.whereClauses.some(
    (c: any) => c.sql.includes('>') && Object.values(c.params || {}).includes(50),
  );
  assert.ok(hasNumericFilter, 'Should apply numeric greater than filter');
}

async function testFiltersWithTableAlias() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'supplier_name', column: 'name', type: 'string', table: 's' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    filters: {
      supplier_name: { type: 'contains', filter: 'Acme' },
    },
  });

  const state = mockQb.getState();
  const hasJoinedFilter = state.whereClauses.some(
    (c: any) => c.sql.includes('s.name') && c.sql.includes('ILIKE'),
  );
  assert.ok(hasJoinedFilter, 'Should use table alias in filter');
}

async function testSortSimple() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
    { field: 'created_at', column: 'created_at', type: 'date' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    sort: { field: 'created_at', direction: 'DESC' },
  });

  const state = mockQb.getState();
  assert.ok(
    state.orderByClauses.some((o: any) => o.column === 'a.created_at' && o.direction === 'DESC'),
    'Should apply sort order',
  );
}

async function testSortAgGridFormat() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    sort: [{ colId: 'name', sort: 'asc' }],
  });

  const state = mockQb.getState();
  assert.ok(
    state.orderByClauses.some((o: any) => o.column === 'a.name' && o.direction === 'ASC'),
    'Should apply AG-Grid format sort',
  );
}

async function testPagination() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    pagination: { offset: 20, limit: 10 },
  });

  const state = mockQb.getState();
  assert.equal(state.skip, 20, 'Should set skip for pagination');
  assert.equal(state.take, 10, 'Should set take for pagination');
}

async function testExecuteReturnsResult() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  const result = await builder.execute();

  assert.equal(result.total, 42, 'Should return total count');
  assert.ok(Array.isArray(result.items), 'Should return items array');
  assert.equal(result.items.length, 1, 'Should return items');
}

async function testExecuteWithRaw() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  const result = await builder.executeWithRaw();

  assert.equal(result.total, 42, 'Should return total count');
  assert.ok(Array.isArray(result.items), 'Should return items array');
  assert.ok(Array.isArray(result.raw), 'Should return raw array');
  assert.ok(result.raw[0].s_name, 'Raw should contain joined data');
}

async function testLeftJoin() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  builder.leftJoin('suppliers', 's', 's.id = a.supplier_id');

  const state = mockQb.getState();
  assert.ok(
    state.joins.some((j: any) => j.entity === 'suppliers' && j.alias === 's'),
    'Should add left join',
  );
}

async function testAddSelect() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  builder.addSelect('s.name', 's_name');

  const state = mockQb.getState();
  assert.ok(
    state.selections.some((s: any) => s.selection === 's.name' && s.alias === 's_name'),
    'Should add select',
  );
}

async function testQuickSearch() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    quickSearch: 'test',
    quickSearchFields: ['a.name', 'a.description'],
  });

  const state = mockQb.getState();
  // Quick search should add ILIKE conditions
  const hasQuickSearch = state.whereClauses.some(
    (c: any) => c.sql.includes('ILIKE') && c.sql.includes('a.name'),
  );
  assert.ok(hasQuickSearch, 'Should apply quick search filter');
}

async function testFilterIgnoresUnknownFields() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  await builder.execute({
    filters: {
      unknown_field: { type: 'contains', filter: 'test' },
    },
  });

  const state = mockQb.getState();
  const hasUnknownFilter = state.whereClauses.some((c: any) => c.sql.includes('unknown_field'));
  assert.ok(!hasUnknownFilter, 'Should ignore unknown filter fields');
}

async function testChainedBuilderMethods() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  // Test that methods can be chained
  const result = builder
    .addBaseCondition('a.status = :s', { s: 'active' })
    .leftJoin('suppliers', 's', 's.id = a.supplier_id')
    .addSelect('s.name', 's_name');

  assert.ok(result === builder, 'Builder methods should be chainable');
}

async function testGetQueryBuilder() {
  const mockQb = createMockQueryBuilder();
  const mockRepo = createMockRepository(mockQb);

  const filterTargets: FilterTarget[] = [
    { field: 'name', column: 'name', type: 'string' },
  ];

  const factory = new QueryBuilderFactory();
  const builder = factory.create(mockRepo, filterTargets, 'a');

  const qb = builder.getQueryBuilder();
  assert.ok(qb === mockQb, 'Should return underlying query builder');
}

// Run all tests
(async () => {
  await testQueryBuilderCreation();
  await testBaseConditions();
  await testFiltersContains();
  await testFiltersEquals();
  await testFiltersNumber();
  await testFiltersWithTableAlias();
  await testSortSimple();
  await testSortAgGridFormat();
  await testPagination();
  await testExecuteReturnsResult();
  await testExecuteWithRaw();
  await testLeftJoin();
  await testAddSelect();
  await testQuickSearch();
  await testFilterIgnoresUnknownFields();
  await testChainedBuilderMethods();
  await testGetQueryBuilder();
  console.log('QueryBuilderFactory tests passed.');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
