import { MigrationInterface, QueryRunner } from "typeorm";

export class addApplicationEnvironmentAndRetiredDate1756710000000 implements MigrationInterface {
  name = 'addApplicationEnvironmentAndRetiredDate1756710000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = await queryRunner.query(
      `SELECT to_regclass('public.applications') IS NOT NULL AS exists`,
    ) as Array<{ exists: boolean | 't' | 'f' }>;

    if (exists !== true && exists !== 't') {
      return;
    }

    await queryRunner.query(`ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "retired_date" date NULL`);
    await queryRunner.query(`ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "environment" text NOT NULL DEFAULT 'prod'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = await queryRunner.query(
      `SELECT to_regclass('public.applications') IS NOT NULL AS exists`,
    ) as Array<{ exists: boolean | 't' | 'f' }>;

    if (exists !== true && exists !== 't') {
      return;
    }

    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN IF EXISTS "environment"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN IF EXISTS "retired_date"`);
  }
}
