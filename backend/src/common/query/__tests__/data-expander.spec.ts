import * as assert from 'node:assert/strict';
import {
  DataExpander,
  ExpandConfig,
  createForeignKeyExpansion,
  createOneToManyExpansion,
  createAggregateExpansion,
} from '../data-expander';

// Test types
interface TestItem {
  id: string;
  name: string;
  supplier_id: string | null;
}

interface TestSupplier {
  id: string;
  name: string;
}

interface TestOwner {
  id: string;
  item_id: string;
  user_name: string;
}

async function testDataExpanderCreation() {
  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => new Map(),
      attach: (item, data) => {},
    },
  ];

  const expander = new DataExpander(configs);
  assert.ok(expander instanceof DataExpander, 'Should create DataExpander instance');
}

async function testHasExpansion() {
  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => new Map(),
      attach: (item, data) => {},
    },
  ];

  const expander = new DataExpander(configs);
  assert.ok(expander.hasExpansion('supplier'), 'Should have supplier expansion');
  assert.ok(!expander.hasExpansion('unknown'), 'Should not have unknown expansion');
}

async function testGetExpansionKeys() {
  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => [],
      loader: async (ids) => new Map(),
      attach: (item, data) => {},
    },
    {
      key: 'owners',
      getIds: (items) => [],
      loader: async (ids) => new Map(),
      attach: (item, data) => {},
    },
  ];

  const expander = new DataExpander(configs);
  const keys = expander.getExpansionKeys();
  assert.deepEqual(keys, ['supplier', 'owners'], 'Should return all expansion keys');
}

async function testExpandEmptyItems() {
  let loaderCalled = false;
  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => {
        loaderCalled = true;
        return new Map();
      },
      attach: (item, data) => {},
    },
  ];

  const expander = new DataExpander(configs);
  const result = await expander.expand([], ['supplier']);

  assert.deepEqual(result, [], 'Should return empty array for empty input');
  assert.ok(!loaderCalled, 'Should not call loader for empty items');
}

async function testExpandEmptyIncludes() {
  let loaderCalled = false;
  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => {
        loaderCalled = true;
        return new Map();
      },
      attach: (item, data) => {},
    },
  ];

  const items: TestItem[] = [{ id: '1', name: 'Test', supplier_id: 's1' }];
  const expander = new DataExpander(configs);
  const result = await expander.expand(items, []);

  assert.equal(result.length, 1, 'Should return same items');
  assert.ok(!loaderCalled, 'Should not call loader for empty includes');
}

async function testExpandForeignKey() {
  const suppliers = new Map<string, TestSupplier>([
    ['s1', { id: 's1', name: 'Supplier 1' }],
    ['s2', { id: 's2', name: 'Supplier 2' }],
  ]);

  const configs: ExpandConfig<TestItem, TestSupplier>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => {
        const result = new Map<string, TestSupplier>();
        for (const id of ids) {
          const supplier = suppliers.get(id);
          if (supplier) result.set(id, supplier);
        }
        return result;
      },
      attach: (item, dataMap) => {
        (item as any).supplier = dataMap?.get(item.supplier_id!) || null;
      },
    },
  ];

  const items: TestItem[] = [
    { id: '1', name: 'Item 1', supplier_id: 's1' },
    { id: '2', name: 'Item 2', supplier_id: 's2' },
    { id: '3', name: 'Item 3', supplier_id: null },
  ];

  const expander = new DataExpander(configs);
  const result = await expander.expand(items, ['supplier']);

  assert.equal((result[0] as any).supplier?.name, 'Supplier 1', 'Should attach supplier to item 1');
  assert.equal((result[1] as any).supplier?.name, 'Supplier 2', 'Should attach supplier to item 2');
  assert.equal((result[2] as any).supplier, null, 'Should set null for item without supplier');
}

async function testExpandOneToMany() {
  const owners = new Map<string, TestOwner[]>([
    ['1', [{ id: 'o1', item_id: '1', user_name: 'Owner 1' }, { id: 'o2', item_id: '1', user_name: 'Owner 2' }]],
    ['2', [{ id: 'o3', item_id: '2', user_name: 'Owner 3' }]],
  ]);

  const configs: ExpandConfig<TestItem, TestOwner[]>[] = [
    {
      key: 'owners',
      getIds: (items) => items.map(i => i.id),
      loader: async (ids) => {
        const result = new Map<string, TestOwner[]>();
        for (const id of ids) {
          const ownerList = owners.get(id);
          if (ownerList) result.set(id, ownerList);
        }
        return result;
      },
      attach: (item, dataMap) => {
        (item as any).owners = dataMap?.get(item.id) || [];
      },
    },
  ];

  const items: TestItem[] = [
    { id: '1', name: 'Item 1', supplier_id: null },
    { id: '2', name: 'Item 2', supplier_id: null },
    { id: '3', name: 'Item 3', supplier_id: null },
  ];

  const expander = new DataExpander(configs);
  const result = await expander.expand(items, ['owners']);

  assert.equal((result[0] as any).owners.length, 2, 'Item 1 should have 2 owners');
  assert.equal((result[1] as any).owners.length, 1, 'Item 2 should have 1 owner');
  assert.deepEqual((result[2] as any).owners, [], 'Item 3 should have empty owners array');
}

async function testExpandMultiple() {
  let supplierLoaderCalled = false;
  let ownersLoaderCalled = false;

  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => {
        supplierLoaderCalled = true;
        return new Map([['s1', { id: 's1', name: 'Supplier' }]]);
      },
      attach: (item, dataMap) => {
        (item as any).supplier = dataMap?.get(item.supplier_id!) || null;
      },
    },
    {
      key: 'owners',
      getIds: (items) => items.map(i => i.id),
      loader: async (ids) => {
        ownersLoaderCalled = true;
        return new Map([['1', [{ id: 'o1', item_id: '1', user_name: 'Owner' }]]]);
      },
      attach: (item, dataMap) => {
        (item as any).owners = dataMap?.get(item.id) || [];
      },
    },
  ];

  const items: TestItem[] = [{ id: '1', name: 'Item 1', supplier_id: 's1' }];

  const expander = new DataExpander(configs);
  const result = await expander.expand(items, ['supplier', 'owners']);

  assert.ok(supplierLoaderCalled, 'Should call supplier loader');
  assert.ok(ownersLoaderCalled, 'Should call owners loader');
  assert.equal((result[0] as any).supplier?.name, 'Supplier', 'Should attach supplier');
  assert.equal((result[0] as any).owners.length, 1, 'Should attach owners');
}

async function testExpandOnlyRequestedIncludes() {
  let supplierLoaderCalled = false;
  let ownersLoaderCalled = false;

  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => {
        supplierLoaderCalled = true;
        return new Map();
      },
      attach: (item, dataMap) => {},
    },
    {
      key: 'owners',
      getIds: (items) => items.map(i => i.id),
      loader: async (ids) => {
        ownersLoaderCalled = true;
        return new Map();
      },
      attach: (item, dataMap) => {},
    },
  ];

  const items: TestItem[] = [{ id: '1', name: 'Item 1', supplier_id: 's1' }];

  const expander = new DataExpander(configs);
  await expander.expand(items, ['supplier']);

  assert.ok(supplierLoaderCalled, 'Should call requested supplier loader');
  assert.ok(!ownersLoaderCalled, 'Should not call owners loader when not requested');
}

async function testExpandIgnoresUnknownIncludes() {
  let loaderCalled = false;

  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => {
        loaderCalled = true;
        return new Map();
      },
      attach: (item, dataMap) => {},
    },
  ];

  const items: TestItem[] = [{ id: '1', name: 'Item 1', supplier_id: 's1' }];

  const expander = new DataExpander(configs);
  await expander.expand(items, ['unknown', 'other_unknown']);

  assert.ok(!loaderCalled, 'Should not call any loader for unknown includes');
}

async function testExpandDeduplicatesIds() {
  let loadedIds: string[] = [];

  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => {
        loadedIds = ids;
        return new Map();
      },
      attach: (item, dataMap) => {},
    },
  ];

  const items: TestItem[] = [
    { id: '1', name: 'Item 1', supplier_id: 's1' },
    { id: '2', name: 'Item 2', supplier_id: 's1' },
    { id: '3', name: 'Item 3', supplier_id: 's1' },
  ];

  const expander = new DataExpander(configs);
  await expander.expand(items, ['supplier']);

  assert.equal(loadedIds.length, 1, 'Should deduplicate IDs');
  assert.equal(loadedIds[0], 's1', 'Should have correct deduplicated ID');
}

// Test helper functions

async function testCreateForeignKeyExpansion() {
  const expansion = createForeignKeyExpansion<TestItem, TestSupplier>({
    key: 'supplier',
    foreignKey: 'supplier_id',
    loader: async (ids) => new Map([['s1', { id: 's1', name: 'Supplier' }]]),
    targetProperty: 'supplier',
  });

  assert.equal(expansion.key, 'supplier', 'Should set key');

  const items: TestItem[] = [{ id: '1', name: 'Test', supplier_id: 's1' }];
  const ids = expansion.getIds(items);
  assert.deepEqual(ids, ['s1'], 'Should extract foreign key IDs');

  const dataMap = await expansion.loader(['s1']);
  expansion.attach(items[0], dataMap);
  assert.equal((items[0] as any).supplier?.name, 'Supplier', 'Should attach data');
}

async function testCreateForeignKeyExpansionWithDefault() {
  const expansion = createForeignKeyExpansion<TestItem, TestSupplier>({
    key: 'supplier',
    foreignKey: 'supplier_id',
    loader: async (ids) => new Map(),
    targetProperty: 'supplier',
    defaultValue: { id: 'default', name: 'Default' },
  });

  const items: TestItem[] = [{ id: '1', name: 'Test', supplier_id: 's1' }];
  const dataMap = await expansion.loader(['s1']);
  expansion.attach(items[0], dataMap);
  assert.equal((items[0] as any).supplier?.name, 'Default', 'Should use default value when not found');
}

async function testCreateOneToManyExpansion() {
  const expansion = createOneToManyExpansion<TestItem, TestOwner>({
    key: 'owners',
    primaryKey: 'id',
    loader: async (ids) => new Map([['1', [{ id: 'o1', item_id: '1', user_name: 'Owner' }]]]),
    targetProperty: 'owners',
  });

  assert.equal(expansion.key, 'owners', 'Should set key');

  const items: TestItem[] = [{ id: '1', name: 'Test', supplier_id: null }];
  const ids = expansion.getIds(items);
  assert.deepEqual(ids, ['1'], 'Should extract primary key IDs');

  const dataMap = await expansion.loader(['1']);
  expansion.attach(items[0], dataMap);
  assert.equal((items[0] as any).owners.length, 1, 'Should attach array data');
}

async function testCreateOneToManyExpansionWithDefault() {
  const expansion = createOneToManyExpansion<TestItem, TestOwner>({
    key: 'owners',
    primaryKey: 'id',
    loader: async (ids) => new Map(),
    targetProperty: 'owners',
    defaultValue: [],
  });

  const items: TestItem[] = [{ id: '1', name: 'Test', supplier_id: null }];
  const dataMap = await expansion.loader(['1']);
  expansion.attach(items[0], dataMap);
  assert.deepEqual((items[0] as any).owners, [], 'Should use default empty array');
}

async function testCreateAggregateExpansion() {
  const expansion = createAggregateExpansion<TestItem, { count: number }>({
    key: 'counts',
    primaryKey: 'id',
    loader: async (ids) => new Map([['1', { count: 5 }]]),
    attach: (item, data) => {
      (item as any).owner_count = data?.count ?? 0;
    },
  });

  assert.equal(expansion.key, 'counts', 'Should set key');

  const items: TestItem[] = [{ id: '1', name: 'Test', supplier_id: null }];
  const dataMap = await expansion.loader(['1']);
  expansion.attach(items[0], dataMap);
  assert.equal((items[0] as any).owner_count, 5, 'Should attach aggregated data');
}

async function testExpandParallelExecution() {
  const callOrder: string[] = [];
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'slow',
      getIds: (items) => items.map(i => i.id),
      loader: async (ids) => {
        callOrder.push('slow-start');
        await delay(50);
        callOrder.push('slow-end');
        return new Map();
      },
      attach: (item, dataMap) => {},
    },
    {
      key: 'fast',
      getIds: (items) => items.map(i => i.id),
      loader: async (ids) => {
        callOrder.push('fast-start');
        await delay(10);
        callOrder.push('fast-end');
        return new Map();
      },
      attach: (item, dataMap) => {},
    },
  ];

  const items: TestItem[] = [{ id: '1', name: 'Test', supplier_id: null }];

  const expander = new DataExpander(configs);
  await expander.expand(items, ['slow', 'fast']);

  // Both should start before either finishes (parallel execution)
  assert.ok(callOrder.indexOf('slow-start') < callOrder.indexOf('slow-end'), 'Slow should start before end');
  assert.ok(callOrder.indexOf('fast-start') < callOrder.indexOf('fast-end'), 'Fast should start before end');
  assert.ok(callOrder.indexOf('fast-end') < callOrder.indexOf('slow-end'), 'Fast should end before slow');
}

async function testExpandNoIdsSkipsLoader() {
  let loaderCalled = false;
  let attachCalled = false;

  const configs: ExpandConfig<TestItem, any>[] = [
    {
      key: 'supplier',
      getIds: (items) => items.map(i => i.supplier_id).filter(Boolean) as string[],
      loader: async (ids) => {
        loaderCalled = true;
        return new Map();
      },
      attach: (item, dataMap) => {
        attachCalled = true;
        (item as any).supplier = undefined;
      },
    },
  ];

  const items: TestItem[] = [
    { id: '1', name: 'Item 1', supplier_id: null },
    { id: '2', name: 'Item 2', supplier_id: null },
  ];

  const expander = new DataExpander(configs);
  await expander.expand(items, ['supplier']);

  assert.ok(!loaderCalled, 'Should not call loader when no IDs');
  assert.ok(attachCalled, 'Should still call attach with undefined');
}

// Run all tests
(async () => {
  await testDataExpanderCreation();
  await testHasExpansion();
  await testGetExpansionKeys();
  await testExpandEmptyItems();
  await testExpandEmptyIncludes();
  await testExpandForeignKey();
  await testExpandOneToMany();
  await testExpandMultiple();
  await testExpandOnlyRequestedIncludes();
  await testExpandIgnoresUnknownIncludes();
  await testExpandDeduplicatesIds();
  await testCreateForeignKeyExpansion();
  await testCreateForeignKeyExpansionWithDefault();
  await testCreateOneToManyExpansion();
  await testCreateOneToManyExpansionWithDefault();
  await testCreateAggregateExpansion();
  await testExpandParallelExecution();
  await testExpandNoIdsSkipsLoader();
  console.log('DataExpander tests passed.');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
