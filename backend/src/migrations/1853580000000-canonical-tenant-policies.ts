import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Canonical tenant policies.
 *
 * 38 tables were still reading the tenant setting with a bare cast while the other 174 use
 * `app_current_tenant()`. The two differ in three ways that matter:
 *
 *   - `app_current_tenant()` NULLIFs the empty string, so an empty `app.current_tenant`
 *     filters every row out. The bare cast raises
 *     `invalid input syntax for type uuid: ""` instead -- an error where the rest of the
 *     schema fails closed.
 *   - it catches the cast exception and returns NULL, so a garbage setting behaves like an
 *     unset one rather than aborting the query.
 *   - it never falls back to another tenant: the safety migration 1810000000000 removed the
 *     "first tenant" fallback and this keeps that guarantee.
 *
 * `task_attachments` was the worst case: it omitted the `true` (missing_ok) flag, so even an
 * unset setting raised instead of returning NULL.
 *
 * `allocation_rules` keeps its `tenant_id IS NULL OR ...` branch on purpose: those rows are
 * deliberately tenant-less global rules and must stay visible to every tenant.
 */
const TABLES = [
  'allocation_rules',
  'application_attachments',
  'application_capex_items',
  'application_companies',
  'application_contracts',
  'application_data_residency',
  'application_departments',
  'application_links',
  'application_owners',
  'application_spend_items',
  'asset_attachments',
  'asset_capex_items',
  'asset_contracts',
  'asset_hardware_info',
  'asset_links',
  'asset_spend_items',
  'asset_support_contacts',
  'asset_support_info',
  'capex_item_contacts',
  'contract_contacts',
  'interface_attachments',
  'interface_bindings',
  'interface_companies',
  'interface_data_residency',
  'interface_dependencies',
  'interface_key_identifiers',
  'interface_legs',
  'interface_links',
  'interface_mapping_groups',
  'interface_mapping_rules',
  'interface_mapping_sets',
  'interface_middleware_applications',
  'interface_owners',
  'interfaces',
  'item_sequences',
  'spend_item_contacts',
  'task_attachments',
  'task_time_entries',
];

/** Rows with no tenant are global rules and must remain visible. */
const TENANT_LESS_ROWS_ALLOWED = new Set(['allocation_rules']);

/** This one never passed the missing_ok flag, so it needs the argument back on rollback. */
const MISSING_OK_ABSENT = new Set(['task_attachments']);

const policyName = (table: string) => `${table}_tenant_isolation`;

function canonicalExpression(table: string): string {
  return TENANT_LESS_ROWS_ALLOWED.has(table)
    ? '((tenant_id IS NULL) OR (tenant_id = app_current_tenant()))'
    : '(tenant_id = app_current_tenant())';
}

/** The expression each table carried before this migration, so `down` is faithful. */
function legacyExpression(table: string): string {
  const setting = MISSING_OK_ABSENT.has(table)
    ? "current_setting('app.current_tenant'::text)"
    : "current_setting('app.current_tenant'::text, true)";
  const cast = `(tenant_id = (${setting})::uuid)`;
  return TENANT_LESS_ROWS_ALLOWED.has(table) ? `((tenant_id IS NULL) OR ${cast})` : cast;
}

export class CanonicalTenantPolicies1853580000000 implements MigrationInterface {
  name = 'CanonicalTenantPolicies1853580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      const expression = canonicalExpression(table);
      await queryRunner.query(`DROP POLICY IF EXISTS ${policyName(table)} ON ${table}`);
      await queryRunner.query(
        `CREATE POLICY ${policyName(table)} ON ${table} FOR ALL
           USING (${expression})
           WITH CHECK (${expression})`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      const expression = legacyExpression(table);
      await queryRunner.query(`DROP POLICY IF EXISTS ${policyName(table)} ON ${table}`);
      await queryRunner.query(
        `CREATE POLICY ${policyName(table)} ON ${table} FOR ALL
           USING (${expression})
           WITH CHECK (${expression})`,
      );
    }
  }
}
