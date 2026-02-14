import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioProjectsSchemaFix1767600000000 implements MigrationInterface {
  name = 'PortfolioProjectsSchemaFix1767600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Align portfolio_projects table with the entity definition

    // Rename 'description' to 'purpose'
    await queryRunner.query(`
      ALTER TABLE portfolio_projects RENAME COLUMN description TO purpose
    `);

    // Add 'origin' column (standard, fast_track, legacy)
    await queryRunner.query(`
      ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'standard'
    `);

    // Add 'execution_progress' column
    await queryRunner.query(`
      ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS execution_progress numeric(5,2) NOT NULL DEFAULT 0
    `);

    // Add 'target_delivery_date' column
    await queryRunner.query(`
      ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS target_delivery_date date
    `);

    // Add 'actual_effort_it' column
    await queryRunner.query(`
      ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS actual_effort_it numeric(10,2)
    `);

    // Add 'actual_effort_business' column
    await queryRunner.query(`
      ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS actual_effort_business numeric(10,2)
    `);

    // Rename baseline columns to match entity naming
    await queryRunner.query(`
      ALTER TABLE portfolio_projects RENAME COLUMN baseline_start TO baseline_start_date
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_projects RENAME COLUMN baseline_end TO baseline_end_date
    `);

    // Drop columns that are not in the entity (projects don't have their own scoring)
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS type`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS priority_override`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS override_justification`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS override_value`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS criteria_values`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS created_by_id`);

    // Update status values to match new enum
    // Old: 'initiation' (default), new: 'waiting_list' (default)
    await queryRunner.query(`
      UPDATE portfolio_projects SET status = 'waiting_list' WHERE status = 'initiation'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse status changes
    await queryRunner.query(`
      UPDATE portfolio_projects SET status = 'initiation' WHERE status = 'waiting_list'
    `);

    // Re-add dropped columns
    await queryRunner.query(`ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'business'`);
    await queryRunner.query(`ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS priority_override boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS override_justification text`);
    await queryRunner.query(`ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS override_value numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS criteria_values jsonb NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS created_by_id uuid`);

    // Rename baseline columns back
    await queryRunner.query(`ALTER TABLE portfolio_projects RENAME COLUMN baseline_start_date TO baseline_start`);
    await queryRunner.query(`ALTER TABLE portfolio_projects RENAME COLUMN baseline_end_date TO baseline_end`);

    // Drop added columns
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS actual_effort_business`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS actual_effort_it`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS target_delivery_date`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS execution_progress`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS origin`);

    // Rename 'purpose' back to 'description'
    await queryRunner.query(`ALTER TABLE portfolio_projects RENAME COLUMN purpose TO description`);
  }
}
