import * as assert from 'node:assert/strict';
import { CsvImportService } from '../csv-import.service';
import { CsvResolverService } from '../csv-resolver.service';
import { CsvJsonValidators } from '../csv-json-validators';
import {
  ArrayStrategy,
  CsvEntityConfig,
  CsvFieldType,
  CsvImportParams,
} from '../csv-field.types';

/**
 * Create a mock file from CSV content
 */
function createMockFile(content: string): Express.Multer.File {
  // Add BOM if not present
  const contentWithBom = content.startsWith('\uFEFF') ? content : '\uFEFF' + content;
  return {
    buffer: Buffer.from(contentWithBom, 'utf8'),
    fieldname: 'file',
    originalname: 'test.csv',
    encoding: 'utf8',
    mimetype: 'text/csv',
    size: contentWithBom.length,
  } as Express.Multer.File;
}

/**
 * Mock EntityManager for testing
 */
function createMockManager(data: Record<string, any[]>) {
  const saved: any[] = [];
  return {
    query: async (sql: string, params: any[]) => {
      const tableMatch = sql.match(/FROM (\w+)/i);
      const tableName = tableMatch?.[1] || '';
      const tenantId = params[0];
      return data[tableName]?.filter((row) => row.tenant_id === tenantId) || [];
    },
    getRepository: () => ({
      save: async (entities: any | any[]) => {
        const arr = Array.isArray(entities) ? entities : [entities];
        saved.push(...arr);
        return arr;
      },
    }),
    getSaved: () => saved,
  } as any;
}

/**
 * Create a simple test config
 */
function createTestConfig(): CsvEntityConfig {
  return {
    entityName: 'task',
    tableName: 'tasks',
    displayName: 'Tasks',
    upsertKey: ['title'],
    fields: [
      { csvColumn: 'id', entityProperty: 'id', type: CsvFieldType.STRING, isIdentityColumn: true, importable: true },
      { csvColumn: 'title', entityProperty: 'title', type: CsvFieldType.STRING, required: true },
      { csvColumn: 'description', entityProperty: 'description', type: CsvFieldType.STRING },
      { csvColumn: 'status', entityProperty: 'status', type: CsvFieldType.ENUM, enumValues: ['open', 'in_progress', 'done'] },
      { csvColumn: 'due_date', entityProperty: 'due_date', type: CsvFieldType.DATE },
      { csvColumn: 'priority', entityProperty: 'priority', type: CsvFieldType.NUMBER },
    ],
  };
}

/**
 * Default import params
 */
const defaultParams: CsvImportParams = {
  dryRun: true,
  mode: 'replace',
  operation: 'upsert',
};

// ===== Tests =====

async function testDryRunDoesNotCommit() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const csv = `id;title;description;status;due_date;priority
;New Task;A description;open;2024-01-15;1`;

  const manager = createMockManager({ tasks: [] });

  const result = await service.import(config, createMockFile(csv), { ...defaultParams, dryRun: true }, {
    manager,
    tenantId: 't1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 0);
  assert.equal(manager.getSaved().length, 0); // Nothing saved in dry run
}

async function testMissingRequiredFieldError() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const csv = `id;title;description;status;due_date;priority
;;A description;open;2024-01-15;1`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: [] }),
    tenantId: 't1',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.ok(result.errors[0].message.includes('required'));
}

async function testInvalidEnumError() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const csv = `id;title;description;status;due_date;priority
;Task;Desc;invalid_status;2024-01-15;1`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: [] }),
    tenantId: 't1',
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.message.includes('Invalid status')));
}

async function testDateParsing() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  // Test different date formats
  const csv = `id;title;description;status;due_date;priority
;Task 1;;open;2024-01-15;1
;Task 2;;open;15/01/2024;2
;Task 3;;open;15.01.2024;3`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: [] }),
    tenantId: 't1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.inserted, 3);
}

async function testNumberParsing() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  // Test different number formats
  const csv = `id;title;description;status;due_date;priority
;Task 1;;open;;1
;Task 2;;open;;1.5
;Task 3;;open;;1,5`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: [] }),
    tenantId: 't1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.inserted, 3);
}

async function testIdentityResolutionById() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const existingTasks = [
    { id: 'existing-id', title: 'Existing Task', tenant_id: 't1' },
  ];

  const csv = `id;title;description;status;due_date;priority
existing-id;Updated Task;New description;done;;`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: existingTasks }),
    tenantId: 't1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 1);
}

async function testIdentityResolutionByUpsertKey() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const existingTasks = [
    { id: 'some-id', title: 'existing task', tenant_id: 't1' }, // lowercase
  ];

  // Match by title (case-insensitive)
  const csv = `id;title;description;status;due_date;priority
;Existing Task;New description;done;;`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: existingTasks }),
    tenantId: 't1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.updated, 1);
}

async function testDuplicateKeysInFileError() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const csv = `id;title;description;status;due_date;priority
;Duplicate Task;Desc 1;open;;1
;Duplicate Task;Desc 2;done;;2`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: [] }),
    tenantId: 't1',
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.message.includes('Duplicate key')));
}

async function testEnrichModePreservesExisting() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const existingTasks = [
    { id: 'task-1', title: 'Task', description: 'Original description', status: 'open', tenant_id: 't1' },
  ];

  // Empty description should preserve existing in enrich mode
  const csv = `id;title;description;status;due_date;priority
task-1;Task;;done;;`;

  const result = await service.import(
    config,
    createMockFile(csv),
    { ...defaultParams, mode: 'enrich' },
    {
      manager: createMockManager({ tasks: existingTasks }),
      tenantId: 't1',
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.updated, 1);
}

async function testReplaceModeNullifiesEmpty() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const existingTasks = [
    { id: 'task-1', title: 'Task', description: 'Original description', status: 'open', tenant_id: 't1' },
  ];

  // Empty description should become null in replace mode
  const csv = `id;title;description;status;due_date;priority
task-1;Task;;done;;`;

  const result = await service.import(
    config,
    createMockFile(csv),
    { ...defaultParams, mode: 'replace' },
    {
      manager: createMockManager({ tasks: existingTasks }),
      tenantId: 't1',
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.updated, 1);
}

async function testUpdateOnlyOperationSkipsInserts() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const existingTasks = [
    { id: 'existing', title: 'Existing', tenant_id: 't1' },
  ];

  const csv = `id;title;description;status;due_date;priority
existing;Existing;Updated;open;;
;New Task;New;open;;`;

  const result = await service.import(
    config,
    createMockFile(csv),
    { ...defaultParams, operation: 'update_only' },
    {
      manager: createMockManager({ tasks: existingTasks }),
      tenantId: 't1',
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.updated, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.inserted, 0);
}

async function testInsertOnlyOperationSkipsUpdates() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const existingTasks = [
    { id: 'existing', title: 'Existing', tenant_id: 't1' },
  ];

  const csv = `id;title;description;status;due_date;priority
existing;Existing;Updated;open;;
;New Task;New;open;;`;

  const result = await service.import(
    config,
    createMockFile(csv),
    { ...defaultParams, operation: 'insert_only' },
    {
      manager: createMockManager({ tasks: existingTasks }),
      tenantId: 't1',
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.inserted, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.updated, 0);
}

async function testMissingHeaderError() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  // Missing required 'title' column
  const csv = `id;description;status
;A description;open`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: [] }),
    tenantId: 't1',
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.message.includes('Missing')));
}

async function testCaseInsensitiveEnumMatching() {
  const resolver = new CsvResolverService();
  const validators = new CsvJsonValidators();
  const service = new CsvImportService(resolver, validators);
  const config = createTestConfig();

  const csv = `id;title;description;status;due_date;priority
;Task 1;;OPEN;;
;Task 2;;Open;;
;Task 3;;In_Progress;;`;

  const result = await service.import(config, createMockFile(csv), defaultParams, {
    manager: createMockManager({ tasks: [] }),
    tenantId: 't1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.inserted, 3);
}

// ===== Run tests =====

(async () => {
  await testDryRunDoesNotCommit();
  await testMissingRequiredFieldError();
  await testInvalidEnumError();
  await testDateParsing();
  await testNumberParsing();
  await testIdentityResolutionById();
  await testIdentityResolutionByUpsertKey();
  await testDuplicateKeysInFileError();
  await testEnrichModePreservesExisting();
  await testReplaceModeNullifiesEmpty();
  await testUpdateOnlyOperationSkipsInserts();
  await testInsertOnlyOperationSkipsUpdates();
  await testMissingHeaderError();
  await testCaseInsensitiveEnumMatching();

  console.log('CSV import service tests passed.');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
