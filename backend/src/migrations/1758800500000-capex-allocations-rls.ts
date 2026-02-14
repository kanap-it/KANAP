import { MigrationInterface, QueryRunner } from "typeorm";

export class CapexAllocationsRls1758800500000 implements MigrationInterface {
  name = 'CapexAllocationsRls1758800500000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'capex_allocations'
            AND policyname = 'capex_allocations_tenant_isolation'
        ) THEN
          DROP POLICY capex_allocations_tenant_isolation ON capex_allocations;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE POLICY capex_allocations_tenant_isolation ON capex_allocations
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS capex_allocations_tenant_isolation ON capex_allocations;
    `);

    await queryRunner.query(`
      CREATE POLICY capex_allocations_tenant_isolation ON capex_allocations
        USING (tenant_id = (current_setting('app.current_tenant', true))::uuid)
        WITH CHECK (tenant_id = (current_setting('app.current_tenant', true))::uuid)
    `);
  }
}
