import { MigrationInterface, QueryRunner } from "typeorm";

export class addApplicationEtlEnabled1756711000000 implements MigrationInterface {
  name = 'addApplicationEtlEnabled1756711000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" ADD COLUMN "etl_enabled" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "etl_enabled"`);
  }
}

