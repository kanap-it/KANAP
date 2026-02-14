import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioProjectScoring1770800000000 implements MigrationInterface {
  name = 'PortfolioProjectScoring1770800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add scoring columns to portfolio_projects
    // These columns enable project scoring similar to requests
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
        ADD COLUMN IF NOT EXISTS criteria_values jsonb DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS priority_override boolean DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS override_value numeric(5,2) NULL,
        ADD COLUMN IF NOT EXISTS override_justification text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
        DROP COLUMN IF EXISTS override_justification,
        DROP COLUMN IF EXISTS override_value,
        DROP COLUMN IF EXISTS priority_override,
        DROP COLUMN IF EXISTS criteria_values
    `);
  }
}
