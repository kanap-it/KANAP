import { MigrationInterface, QueryRunner } from "typeorm";

export class addApplicationEnvironmentAndRetiredDate1756710000000 implements MigrationInterface {
  name = 'addApplicationEnvironmentAndRetiredDate1756710000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" ADD COLUMN "retired_date" date NULL`);
    await queryRunner.query(`ALTER TABLE "applications" ADD COLUMN "environment" text NOT NULL DEFAULT 'prod'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "environment"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "retired_date"`);
  }
}

