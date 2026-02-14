import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyMetricsAllocationRulesAndMethods1756686100000 implements MigrationInterface {
  name = 'CompanyMetricsAllocationRulesAndMethods1756686100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Companies: add it_users, turnover; make headcount NOT NULL by backfilling zeros first
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "it_users" integer`);
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "turnover" numeric(18,2)`);
    await queryRunner.query(`UPDATE "companies" SET "headcount" = 0 WHERE "headcount" IS NULL`);
    await queryRunner.query(`ALTER TABLE "companies" ALTER COLUMN "headcount" SET NOT NULL`);

    // Spend allocations: allow company-level rows by making department_id nullable
    await queryRunner.query(`ALTER TABLE "spend_allocations" ALTER COLUMN "department_id" DROP NOT NULL`);

    // Spend versions: add allocation_method
    await queryRunner.query(`ALTER TABLE "spend_versions" ADD COLUMN IF NOT EXISTS "allocation_method" text`);
    await queryRunner.query(`UPDATE "spend_versions" SET "allocation_method" = 'default' WHERE "allocation_method" IS NULL`);
    await queryRunner.query(`ALTER TABLE "spend_versions" ALTER COLUMN "allocation_method" SET NOT NULL`);

    // Spend allocations: audit of system-generated/materialized rows
    await queryRunner.query(`ALTER TABLE "spend_allocations" ADD COLUMN IF NOT EXISTS "is_system_generated" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "spend_allocations" ADD COLUMN IF NOT EXISTS "rule_id" uuid NULL`);
    await queryRunner.query(`ALTER TABLE "spend_allocations" ADD COLUMN IF NOT EXISTS "materialized_from" text NULL`);

    // Company metrics table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_metrics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        fiscal_year integer NOT NULL,
        headcount integer NOT NULL,
        it_users integer NULL,
        turnover numeric(18,2) NULL,
        is_frozen boolean NOT NULL DEFAULT false,
        frozen_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(company_id, fiscal_year)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_company_metrics_company_year ON company_metrics(company_id, fiscal_year)`);

    // Allocation rules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS allocation_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,
        fiscal_year integer NOT NULL,
        method text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(tenant_id, fiscal_year)
      );
    `);

    // Seed default rule for current year if none exists (headcount)
    await queryRunner.query(`
      INSERT INTO allocation_rules(tenant_id, fiscal_year, method, status)
      SELECT NULL, EXTRACT(YEAR FROM CURRENT_DATE)::int, 'headcount', 'active'
      WHERE NOT EXISTS (
        SELECT 1 FROM allocation_rules WHERE tenant_id IS NULL AND fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS allocation_rules`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_company_metrics_company_year`);
    await queryRunner.query(`DROP TABLE IF EXISTS company_metrics`);
    await queryRunner.query(`ALTER TABLE "spend_allocations" DROP COLUMN IF EXISTS "materialized_from"`);
    await queryRunner.query(`ALTER TABLE "spend_allocations" DROP COLUMN IF EXISTS "rule_id"`);
    await queryRunner.query(`ALTER TABLE "spend_allocations" DROP COLUMN IF EXISTS "is_system_generated"`);
    await queryRunner.query(`ALTER TABLE "spend_versions" DROP COLUMN IF EXISTS "allocation_method"`);
    // Revert department_id to NOT NULL (best-effort; may fail if nulls exist)
    // await queryRunner.query(`ALTER TABLE "spend_allocations" ALTER COLUMN "department_id" SET NOT NULL`);
    // Keep companies.headcount NOT NULL and new columns; don't drop
  }
}

