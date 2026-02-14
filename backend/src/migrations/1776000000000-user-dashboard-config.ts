import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserDashboardConfig1776000000000 implements MigrationInterface {
  name = 'CreateUserDashboardConfig1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create table
    await queryRunner.query(`
      CREATE TABLE user_dashboard_config (
        tenant_id UUID NOT NULL DEFAULT app_current_tenant(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tiles JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (tenant_id, user_id)
      );
    `);

    // Enable RLS
    await queryRunner.query(`
      ALTER TABLE user_dashboard_config ENABLE ROW LEVEL SECURITY;
    `);
    await queryRunner.query(`
      ALTER TABLE user_dashboard_config FORCE ROW LEVEL SECURITY;
    `);

    // Single tenant isolation policy (consistent with project pattern)
    await queryRunner.query(`
      CREATE POLICY user_dashboard_config_tenant_isolation
        ON user_dashboard_config
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant());
    `);

    // Index for user lookups
    await queryRunner.query(`
      CREATE INDEX idx_user_dashboard_config_user
        ON user_dashboard_config(user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_dashboard_config;`);
  }
}
