import { MigrationInterface, QueryRunner } from 'typeorm';

export class CapexProjectId1758907500000 implements MigrationInterface {
  name = 'CapexProjectId1758907500000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE capex_items ADD COLUMN IF NOT EXISTS project_id uuid NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE capex_items DROP COLUMN IF EXISTS project_id`);
  }
}

