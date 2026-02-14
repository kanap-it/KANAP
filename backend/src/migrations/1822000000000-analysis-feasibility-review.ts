import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalysisFeasibilityReview1822000000000 implements MigrationInterface {
  name = 'AnalysisFeasibilityReview1822000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      ADD COLUMN IF NOT EXISTS feasibility_review jsonb NOT NULL DEFAULT '{}'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      DROP COLUMN IF EXISTS feasibility_review;
    `);
  }
}
