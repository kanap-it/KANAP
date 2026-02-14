import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioTeams1798000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Step 1: Create portfolio_teams table
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_teams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        display_order int NOT NULL DEFAULT 0,
        is_system boolean NOT NULL DEFAULT false,
        parent_id uuid REFERENCES portfolio_teams(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_portfolio_teams_tenant_order
      ON portfolio_teams(tenant_id, display_order)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_portfolio_teams_parent
      ON portfolio_teams(parent_id)
    `);

    // ============================================
    // Step 2: Enable RLS on portfolio_teams
    // ============================================

    await queryRunner.query(`ALTER TABLE portfolio_teams ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_teams FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY portfolio_teams_tenant_isolation
      ON portfolio_teams
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);

    // ============================================
    // Step 3: Add team_id column to portfolio_team_member_configs
    // ============================================

    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES portfolio_teams(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_team_member_configs_team_id
      ON portfolio_team_member_configs(team_id)
    `);

    // ============================================
    // Step 4: Seed default teams for existing tenants
    // ============================================

    const defaultTeams = [
      { name: 'Infrastructure', description: 'Network, servers, and cloud infrastructure', display_order: 0 },
      { name: 'Business Applications', description: 'ERP, CRM, and business software systems', display_order: 1 },
      { name: 'Engineering Applications', description: 'Custom development and engineering tools', display_order: 2 },
      { name: 'Service Desk', description: 'End-user support and helpdesk', display_order: 3 },
      { name: 'Master Data', description: 'Master data management and governance', display_order: 4 },
      { name: 'Cybersecurity', description: 'Security operations and compliance', display_order: 5 },
    ];

    // Get all distinct tenants from team member configs
    const tenants = await queryRunner.query(`
      SELECT DISTINCT tenant_id FROM portfolio_team_member_configs
    `);

    for (const { tenant_id } of tenants) {
      for (const team of defaultTeams) {
        await queryRunner.query(`
          INSERT INTO portfolio_teams (tenant_id, name, description, display_order, is_system)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (tenant_id, name) DO NOTHING
        `, [tenant_id, team.name, team.description, team.display_order]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index on team_member_configs
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_team_member_configs_team_id`);

    // Drop team_id column from team_member_configs
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      DROP COLUMN IF EXISTS team_id
    `);

    // Drop portfolio_teams table (will cascade delete RLS policy)
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_teams CASCADE`);
  }
}
