import { MigrationInterface, QueryRunner } from "typeorm";

export class RLSPoliciesUnifyAppCurrentTenant1758903000000 implements MigrationInterface {
  name = 'RLSPoliciesUnifyAppCurrentTenant1758903000000'

  private tables: string[] = [
    // Core master data
    'users','companies','departments','suppliers','accounts',
    // Spend
    'spend_items','spend_versions','spend_amounts','spend_allocations','spend_tasks',
    // Contracts
    'contracts','contract_tasks','contract_spend_items','contract_attachments','contract_links',
    // CAPEX
    'capex_items','capex_versions','capex_amounts','capex_allocations',
    // RBAC + audit
    'roles','role_permissions','subscriptions','audit_log','user_page_roles',
    // Newer tables
    'tasks','currency_rate_sets','contacts','supplier_contacts',
    'company_metrics','department_metrics','chart_of_accounts','analytics_categories','freeze_states',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '${table}'
          ) THEN
            -- Drop existing tenant isolation policy if present
            IF EXISTS (
              SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = '${table}' AND policyname = '${table}_tenant_isolation'
            ) THEN
              DROP POLICY ${table}_tenant_isolation ON ${table};
            END IF;
            -- Recreate policy using safe app_current_tenant() helper
            CREATE POLICY ${table}_tenant_isolation ON ${table}
              USING (tenant_id = app_current_tenant())
              WITH CHECK (tenant_id = app_current_tenant());
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '${table}'
          ) THEN
            IF EXISTS (
              SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = '${table}' AND policyname = '${table}_tenant_isolation'
            ) THEN
              DROP POLICY ${table}_tenant_isolation ON ${table};
            END IF;
            CREATE POLICY ${table}_tenant_isolation ON ${table}
              USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
              WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
          END IF;
        END $$;
      `);
    }
  }
}

