import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropAppInstanceHostingModel1765006000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE app_instances DROP COLUMN IF EXISTS hosting_model`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE app_instances ADD COLUMN IF NOT EXISTS hosting_model text NOT NULL DEFAULT 'saas'`,
    );
    await queryRunner.query(`ALTER TABLE app_instances ALTER COLUMN hosting_model DROP DEFAULT`);
  }
}
