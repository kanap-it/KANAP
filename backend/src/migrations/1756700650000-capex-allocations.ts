import { MigrationInterface, QueryRunner } from "typeorm";

export class CapexAllocations1756700650000 implements MigrationInterface {
  name = 'CapexAllocations1756700650000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add allocation_method to capex_versions
    await queryRunner.query(`ALTER TABLE "capex_versions" ADD COLUMN IF NOT EXISTS "allocation_method" text`);
    // Backfill under RLS: temporarily disable RLS to update all rows across tenants
    await queryRunner.query(`ALTER TABLE capex_versions NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_versions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`UPDATE "capex_versions" SET "allocation_method" = 'default' WHERE "allocation_method" IS NULL`);
    await queryRunner.query(`ALTER TABLE "capex_versions" ALTER COLUMN "allocation_method" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE capex_versions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_versions FORCE ROW LEVEL SECURITY`);

    // Create capex_allocations table (with tenant_id directly)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS capex_allocations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        version_id uuid NOT NULL REFERENCES capex_versions(id) ON DELETE CASCADE,
        company_id uuid NOT NULL,
        department_id uuid NULL,
        allocation_pct numeric(7,4) NOT NULL,
        is_system_generated boolean NOT NULL DEFAULT false,
        rule_id uuid NULL,
        materialized_from text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_allocations_version ON capex_allocations(version_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_allocations_tenant ON capex_allocations(tenant_id)`);

    // Enable RLS for the new table with tenant-based isolation policy
    await queryRunner.query(`ALTER TABLE capex_allocations ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_allocations FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'capex_allocations' AND policyname = 'capex_allocations_tenant_isolation'
      ) THEN
        DROP POLICY capex_allocations_tenant_isolation ON capex_allocations;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY capex_allocations_tenant_isolation ON capex_allocations
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'capex_allocations' AND policyname = 'capex_allocations_tenant_isolation'
      ) THEN
        DROP POLICY capex_allocations_tenant_isolation ON capex_allocations;
      END IF;
    END $$;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_allocations_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_allocations_version`);
    await queryRunner.query(`DROP TABLE IF EXISTS capex_allocations`);
    await queryRunner.query(`ALTER TABLE "capex_versions" DROP COLUMN IF EXISTS "allocation_method"`);
  }
}
