import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioTimeEntries1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create time entries table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_time_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        category text NOT NULL CHECK (category IN ('it', 'business')),
        user_id uuid,
        hours int NOT NULL CHECK (hours > 0),
        notes text,
        logged_by_id uuid,
        logged_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_time_entries_project
      ON portfolio_project_time_entries(project_id, logged_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_portfolio_time_entries_tenant
      ON portfolio_project_time_entries(tenant_id, project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_portfolio_time_entries_logged_by
      ON portfolio_project_time_entries(logged_by_id)
    `);

    // Enable RLS
    await queryRunner.query(`
      ALTER TABLE portfolio_project_time_entries ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_project_time_entries FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      CREATE POLICY portfolio_project_time_entries_tenant_isolation
      ON portfolio_project_time_entries
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_project_time_entries CASCADE`);
  }
}
