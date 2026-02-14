import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioSkills1767400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create portfolio_skills table
    await queryRunner.query(`
      CREATE TABLE portfolio_skills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        display_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_skills_tenant ON portfolio_skills(tenant_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_portfolio_skills_tenant_category_name
      ON portfolio_skills(tenant_id, category, name)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_skills_display_order
      ON portfolio_skills(tenant_id, display_order)
    `);

    // Enable RLS
    await queryRunner.query(`
      ALTER TABLE portfolio_skills ENABLE ROW LEVEL SECURITY
    `);

    // RLS policy
    await queryRunner.query(`
      CREATE POLICY portfolio_skills_tenant_isolation ON portfolio_skills
        USING (tenant_id = app_current_tenant()::uuid)
        WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS portfolio_skills_tenant_isolation ON portfolio_skills`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_skills`);
  }
}
