import { MigrationInterface, QueryRunner } from 'typeorm';

export class EffortAllocations1812000000000 implements MigrationInterface {
  name = 'EffortAllocations1812000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create effort allocations table
    await queryRunner.query(`
      CREATE TABLE portfolio_project_effort_allocations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        effort_type text NOT NULL CHECK (effort_type IN ('it', 'business')),
        allocation_pct integer NOT NULL CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_effort_allocation UNIQUE (tenant_id, project_id, user_id, effort_type)
      )
    `);

    // Create index for efficient project lookups
    await queryRunner.query(`
      CREATE INDEX idx_effort_alloc_project ON portfolio_project_effort_allocations(tenant_id, project_id)
    `);

    // Enable RLS
    await queryRunner.query(`
      ALTER TABLE portfolio_project_effort_allocations ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_project_effort_allocations FORCE ROW LEVEL SECURITY
    `);

    // Create RLS policy for tenant isolation
    await queryRunner.query(`
      CREATE POLICY portfolio_project_effort_allocations_tenant_isolation
        ON portfolio_project_effort_allocations
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant())
    `);

    // Add allocation mode columns to portfolio_projects
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
        ADD COLUMN it_effort_allocation_mode text NOT NULL DEFAULT 'auto'
          CHECK (it_effort_allocation_mode IN ('auto', 'manual'))
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
        ADD COLUMN business_effort_allocation_mode text NOT NULL DEFAULT 'auto'
          CHECK (business_effort_allocation_mode IN ('auto', 'manual'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from portfolio_projects
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS business_effort_allocation_mode`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS it_effort_allocation_mode`);

    // Drop the table (this will also drop the index, policy, and RLS settings)
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_project_effort_allocations`);
  }
}
