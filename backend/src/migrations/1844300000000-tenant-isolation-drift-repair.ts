import { MigrationInterface, QueryRunner } from 'typeorm';

const FORCE_RLS_TABLES = [
  'currency_rate_sets',
  'portfolio_request_business_processes',
  'portfolio_request_capex',
  'portfolio_request_opex',
  'portfolio_skills',
  'refresh_tokens',
  'user_notification_preferences',
] as const;

const OBSOLETE_SPEND_TASK_POLICIES = [
  'tenant_isolation_select_policy',
  'tenant_isolation_insert_policy',
  'tenant_isolation_update_policy',
  'tenant_isolation_delete_policy',
] as const;

function canonicalTenantPolicySql(table: string) {
  return `
    CREATE POLICY ${table}_tenant_isolation ON ${table}
    USING (tenant_id = app_current_tenant())
    WITH CHECK (tenant_id = app_current_tenant())
  `;
}

export class TenantIsolationDriftRepair1844300000000 implements MigrationInterface {
  name = 'TenantIsolationDriftRepair1844300000000';

  private async enableAndForceRls(queryRunner: QueryRunner, table: string) {
    await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of FORCE_RLS_TABLES) {
      await this.enableAndForceRls(queryRunner, table);
    }

    await this.enableAndForceRls(queryRunner, 'portfolio_task_types');
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON portfolio_task_types`);
    await queryRunner.query(`DROP POLICY IF EXISTS portfolio_task_types_tenant_isolation ON portfolio_task_types`);
    await queryRunner.query(canonicalTenantPolicySql('portfolio_task_types'));

    await this.enableAndForceRls(queryRunner, 'spend_tasks');
    for (const policy of OBSOLETE_SPEND_TASK_POLICIES) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${policy} ON spend_tasks`);
    }

    // allocation_rules is intentionally unchanged in this repair migration.
    // Current code and live data still treat it as a global/null-tenant table:
    // - the entity keeps tenant_id nullable
    // - the public controller/service read and write tenant_id = null
    // - allocation calculators resolve defaults from tenant_id = null rows
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Repair-only migration: intentionally left in place.
  }
}
