import { MigrationInterface, QueryRunner } from "typeorm";

export class applicationAccessMethods1804000000000 implements MigrationInterface {
  name = 'applicationAccessMethods1804000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications ADD COLUMN access_methods text[] NOT NULL DEFAULT '{}'::text[]`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN access_methods`);
  }
}
