import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectSchedulingMode1843000000000 implements MigrationInterface {
  name = 'ProjectSchedulingMode1843000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
      ADD COLUMN IF NOT EXISTS scheduling_mode text NOT NULL DEFAULT 'independent'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
      DROP COLUMN IF EXISTS scheduling_mode
    `);
  }
}
