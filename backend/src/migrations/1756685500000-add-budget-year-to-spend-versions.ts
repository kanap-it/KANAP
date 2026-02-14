import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBudgetYearToSpendVersions1756685500000 implements MigrationInterface {
  name = 'AddBudgetYearToSpendVersions1756685500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column
    await queryRunner.query(`ALTER TABLE "spend_versions" ADD COLUMN "budget_year" integer`);
    // Backfill from as_of_date's year
    await queryRunner.query(`UPDATE "spend_versions" SET "budget_year" = EXTRACT(YEAR FROM "as_of_date")::int WHERE "budget_year" IS NULL`);
    // Enforce NOT NULL
    await queryRunner.query(`ALTER TABLE "spend_versions" ALTER COLUMN "budget_year" SET NOT NULL`);
    // Enforce uniqueness per (item, year)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uniq_spend_item_budget_year" ON "spend_versions" ("spend_item_id","budget_year")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_spend_item_budget_year"`);
    await queryRunner.query(`ALTER TABLE "spend_versions" DROP COLUMN "budget_year"`);
  }
}
