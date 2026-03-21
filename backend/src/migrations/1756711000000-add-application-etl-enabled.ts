import { MigrationInterface, QueryRunner } from "typeorm";

export class addApplicationEtlEnabled1756711000000 implements MigrationInterface {
  name = 'addApplicationEtlEnabled1756711000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = await queryRunner.query(
      `SELECT to_regclass('public.applications') IS NOT NULL AS exists`,
    ) as Array<{ exists: boolean | 't' | 'f' }>;

    if (exists !== true && exists !== 't') {
      return;
    }

    await queryRunner.query(`ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "etl_enabled" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = await queryRunner.query(
      `SELECT to_regclass('public.applications') IS NOT NULL AS exists`,
    ) as Array<{ exists: boolean | 't' | 'f' }>;

    if (exists !== true && exists !== 't') {
      return;
    }

    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN IF EXISTS "etl_enabled"`);
  }
}
