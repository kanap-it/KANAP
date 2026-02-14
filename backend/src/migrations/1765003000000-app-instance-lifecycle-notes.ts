import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppInstanceLifecycleNotes1765003000000 implements MigrationInterface {
  name = 'AppInstanceLifecycleNotes1765003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS description text NULL`);
    await queryRunner.query(`ALTER TABLE app_instances ADD COLUMN IF NOT EXISTS lifecycle text NOT NULL DEFAULT 'active'`);
    await queryRunner.query(`ALTER TABLE app_instances ADD COLUMN IF NOT EXISTS notes text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE app_instances DROP COLUMN IF EXISTS notes`);
    await queryRunner.query(`ALTER TABLE app_instances DROP COLUMN IF EXISTS lifecycle`);
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS description`);
  }
}
