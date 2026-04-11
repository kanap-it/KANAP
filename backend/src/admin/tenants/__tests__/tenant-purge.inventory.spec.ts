import * as assert from 'node:assert/strict';
import { validateTenantPurgeConfiguration } from '../tenant-purge.inventory';
import { TENANT_SCOPED_TABLES } from '../../../common/tenant-isolation.inventory';

const INTERFACE_MAPPING_TABLES = [
  'interface_mapping_sets',
  'interface_mapping_groups',
  'interface_mapping_rules',
] as const;

function testInterfaceMappingTablesAreClassifiedAsTenantScoped() {
  const tenantScopedTables = new Set<string>(TENANT_SCOPED_TABLES);

  for (const table of INTERFACE_MAPPING_TABLES) {
    assert.equal(tenantScopedTables.has(table), true, `${table} should be classified as tenant-scoped`);
  }
}

function testTenantPurgeConfigurationRemainsAligned() {
  assert.deepEqual(validateTenantPurgeConfiguration(), []);
}

function run() {
  testInterfaceMappingTablesAreClassifiedAsTenantScoped();
  testTenantPurgeConfigurationRemainsAligned();
}

run();
