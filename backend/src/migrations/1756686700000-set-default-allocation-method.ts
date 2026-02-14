import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultAllocationMethod1756686700000 implements MigrationInterface {
  name = 'SetDefaultAllocationMethod1756686700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spend_versions" ALTER COLUMN "allocation_method" SET DEFAULT 'default'`);
    // Safety: backfill any NULLs if present (shouldn't be after previous migration)
    await queryRunner.query(`UPDATE "spend_versions" SET "allocation_method" = 'default' WHERE "allocation_method" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spend_versions" ALTER COLUMN "allocation_method" DROP DEFAULT`);
  }
}

