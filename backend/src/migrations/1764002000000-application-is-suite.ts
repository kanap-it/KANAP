import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplicationIsSuite1764002000000 implements MigrationInterface {
  name = 'ApplicationIsSuite1764002000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_suite boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_applications_is_suite ON applications(is_suite)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_applications_is_suite`);
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS is_suite`);
  }
}

