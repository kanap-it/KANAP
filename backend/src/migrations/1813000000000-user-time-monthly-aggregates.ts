import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserTimeMonthlyAggregates1813000000000 implements MigrationInterface {
  name = 'UserTimeMonthlyAggregates1813000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_time_monthly_aggregates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        user_id uuid NOT NULL,
        year_month date NOT NULL,
        project_hours numeric(10,2) NOT NULL DEFAULT 0,
        other_hours numeric(10,2) NOT NULL DEFAULT 0,
        total_hours numeric(10,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_utma_total CHECK (total_hours = project_hours + other_hours)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_utma_tenant_user_month
      ON user_time_monthly_aggregates(tenant_id, user_id, year_month)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_utma_tenant_user
      ON user_time_monthly_aggregates(tenant_id, user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_utma_tenant_month
      ON user_time_monthly_aggregates(tenant_id, year_month)
    `);

    await queryRunner.query(`ALTER TABLE user_time_monthly_aggregates ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE user_time_monthly_aggregates FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      CREATE POLICY user_time_monthly_aggregates_tenant_isolation
      ON user_time_monthly_aggregates
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_time_monthly_aggregates`);
  }
}
