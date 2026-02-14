import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRlsPoliciesUuidCasting1756689000000 implements MigrationInterface {
  name = 'FixRlsPoliciesUuidCasting1756689000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix RLS policies to use app_current_tenant() function instead of direct UUID casting
    // This prevents "invalid input syntax for type uuid" errors when current_setting returns empty string
    
    const tables = [
      // Master data tables
      'users', 'companies', 'departments', 'suppliers', 'accounts',
      // Spend tables
      'spend_items', 'spend_versions', 'spend_amounts', 'spend_allocations', 'spend_tasks',
      // Contract tables
      'contracts', 'contract_tasks', 'contract_spend_items', 'contract_attachments', 'contract_links',
      // CAPEX tables
      'capex_items', 'capex_versions', 'capex_amounts',
      // RBAC tables
      'roles', 'role_permissions', 'subscriptions',
      // Audit table
      'audit_log',
      // User page roles
      'user_page_roles'
    ];

    for (const table of tables) {
      // Drop existing policy if it exists
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      
      // Create new policy using the safe app_current_tenant() function
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant())
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the original direct casting approach
    const tables = [
      'users', 'companies', 'departments', 'suppliers', 'accounts',
      'spend_items', 'spend_versions', 'spend_amounts', 'spend_allocations', 'spend_tasks',
      'contracts', 'contract_tasks', 'contract_spend_items', 'contract_attachments', 'contract_links',
      'capex_items', 'capex_versions', 'capex_amounts',
      'roles', 'role_permissions', 'subscriptions',
      'audit_log',
      'user_page_roles'
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
      `);
    }
  }
}
