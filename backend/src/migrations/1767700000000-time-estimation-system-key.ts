import { MigrationInterface, QueryRunner } from 'typeorm';

export class TimeEstimationSystemKey1767700000000 implements MigrationInterface {
  name = 'TimeEstimationSystemKey1767700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add system_key column to portfolio_criteria for identifying system criteria
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      ADD COLUMN IF NOT EXISTS system_key text
    `);

    // Create unique index for system_key per tenant (only for non-null values)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_criteria_tenant_system_key
      ON portfolio_criteria(tenant_id, system_key)
      WHERE system_key IS NOT NULL
    `);

    // Set system_key for existing Time estimation criteria
    await queryRunner.query(`
      UPDATE portfolio_criteria
      SET system_key = 'time_estimation_it'
      WHERE name = 'Time estimation IT' AND system_key IS NULL
    `);

    await queryRunner.query(`
      UPDATE portfolio_criteria
      SET system_key = 'time_estimation_business'
      WHERE name = 'Time estimation Business' AND system_key IS NULL
    `);

    // Remove effort estimation columns from portfolio_requests
    // These are now derived from the Time estimation criteria
    await queryRunner.query(`
      ALTER TABLE portfolio_requests DROP COLUMN IF EXISTS estimated_effort_it_low
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_requests DROP COLUMN IF EXISTS estimated_effort_it_high
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_requests DROP COLUMN IF EXISTS estimated_effort_business_low
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_requests DROP COLUMN IF EXISTS estimated_effort_business_high
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add effort estimation columns to portfolio_requests
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      ADD COLUMN IF NOT EXISTS estimated_effort_it_low numeric(10,2)
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      ADD COLUMN IF NOT EXISTS estimated_effort_it_high numeric(10,2)
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      ADD COLUMN IF NOT EXISTS estimated_effort_business_low numeric(10,2)
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      ADD COLUMN IF NOT EXISTS estimated_effort_business_high numeric(10,2)
    `);

    // Remove system_key from Time estimation criteria
    await queryRunner.query(`
      UPDATE portfolio_criteria SET system_key = NULL WHERE system_key IN ('time_estimation_it', 'time_estimation_business')
    `);

    // Drop the unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_portfolio_criteria_tenant_system_key
    `);

    // Remove system_key column
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria DROP COLUMN IF EXISTS system_key
    `);
  }
}
