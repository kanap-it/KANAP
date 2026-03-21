import { MigrationInterface, QueryRunner } from 'typeorm';

const AI_GRAPH_TABLES = [
  'applications',
  'assets',
  'app_instances',
  'app_asset_assignments',
  'portfolio_projects',
  'portfolio_requests',
  'tasks',
  'application_suites',
  'asset_relations',
  'portfolio_request_projects',
  'portfolio_request_dependencies',
  'portfolio_project_dependencies',
  'application_projects',
  'asset_projects',
  'portfolio_request_applications',
  'portfolio_request_assets',
] as const;

const AI_STATE_TABLES = [
  'ai_settings',
  'ai_api_keys',
  'ai_conversations',
  'ai_messages',
] as const;

function tenantPolicySql(table: string) {
  return `
    CREATE POLICY ${table}_tenant_isolation ON ${table}
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  `;
}

export class AiPhase1RlsRepair1844200000000 implements MigrationInterface {
  name = 'AiPhase1RlsRepair1844200000000';

  private async ensureTenantIsolation(queryRunner: QueryRunner, table: string) {
    await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
    await queryRunner.query(tenantPolicySql(table));
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...AI_GRAPH_TABLES, ...AI_STATE_TABLES]) {
      await this.ensureTenantIsolation(queryRunner, table);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Repair-only migration: intentionally left in place.
  }
}
