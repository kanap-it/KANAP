import { MigrationInterface, QueryRunner } from "typeorm";

export class AllocationDriver1758800000000 implements MigrationInterface {
  name = 'AllocationDriver1758800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add allocation_driver columns with defaults
    await queryRunner.query(`ALTER TABLE "spend_versions" ADD COLUMN IF NOT EXISTS "allocation_driver" text`);
    await queryRunner.query(`ALTER TABLE "capex_versions" ADD COLUMN IF NOT EXISTS "allocation_driver" text`);

    // Temporarily disable RLS to backfill all tenants
    await queryRunner.query(`ALTER TABLE spend_versions NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE spend_versions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_versions NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_versions DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`ALTER TABLE spend_versions ALTER COLUMN allocation_driver SET DEFAULT 'headcount'`);
    await queryRunner.query(`ALTER TABLE capex_versions ALTER COLUMN allocation_driver SET DEFAULT 'headcount'`);

    await queryRunner.query(`
      UPDATE "spend_versions"
      SET allocation_driver = CASE
        WHEN allocation_method IN ('it_users', 'turnover') THEN allocation_method
        WHEN allocation_method = 'manual_company' THEN COALESCE(allocation_driver, 'headcount')
        ELSE 'headcount'
      END
      WHERE allocation_driver IS NULL
    `);

    await queryRunner.query(`
      UPDATE "capex_versions"
      SET allocation_driver = CASE
        WHEN allocation_method IN ('it_users', 'turnover') THEN allocation_method
        WHEN allocation_method = 'manual_company' THEN COALESCE(allocation_driver, 'headcount')
        ELSE 'headcount'
      END
      WHERE allocation_driver IS NULL
    `);

    await queryRunner.query(`ALTER TABLE spend_versions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE spend_versions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_versions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_versions FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`ALTER TABLE spend_versions ALTER COLUMN allocation_driver SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE capex_versions ALTER COLUMN allocation_driver SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE spend_versions ALTER COLUMN allocation_driver DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE capex_versions ALTER COLUMN allocation_driver DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE spend_versions ALTER COLUMN allocation_driver DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE capex_versions ALTER COLUMN allocation_driver DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "spend_versions" DROP COLUMN IF EXISTS "allocation_driver"`);
    await queryRunner.query(`ALTER TABLE "capex_versions" DROP COLUMN IF EXISTS "allocation_driver"`);
  }
}
