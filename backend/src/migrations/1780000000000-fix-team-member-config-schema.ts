import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTeamMemberConfigSchema1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns that the entity expects
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS areas_of_expertise JSONB NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS project_availability NUMERIC(3,1) NOT NULL DEFAULT 5
    `);

    // Drop obsolete columns from original schema (no longer used by entity)
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      DROP COLUMN IF EXISTS available_hours_per_week
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      DROP COLUMN IF EXISTS effective_from
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      DROP COLUMN IF EXISTS effective_to
    `);

    // Add unique index on tenant_id + user_id if not exists
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_team_member_configs_tenant_user_unique
      ON portfolio_team_member_configs(tenant_id, user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore original columns
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS available_hours_per_week NUMERIC(5,2) NOT NULL DEFAULT 40.00
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS effective_to DATE
    `);

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      DROP COLUMN IF EXISTS areas_of_expertise
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      DROP COLUMN IF EXISTS project_availability
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_portfolio_team_member_configs_tenant_user_unique
    `);
  }
}
