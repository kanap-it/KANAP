import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The tenant default allocation can now target a subset of companies ("manual by
 * company") instead of always spreading over every enabled company.
 *
 * `method` keeps its meaning in both modes: it is the driver (headcount | it_users |
 * turnover) weighting the companies. `mode` selects the company set:
 * - 'auto'           -> every company enabled for the year (existing behaviour, default)
 * - 'manual_company' -> the companies listed in `company_ids`
 *
 * Additive only: existing rows keep mode='auto' with company_ids NULL, so nothing changes
 * until a tenant configures a selection.
 */
export class AllocationRulesManualCompanyDefault1853540000000 implements MigrationInterface {
  name = 'AllocationRulesManualCompanyDefault1853540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "allocation_rules" ADD COLUMN IF NOT EXISTS "mode" text NOT NULL DEFAULT 'auto'`);
    await queryRunner.query(`ALTER TABLE "allocation_rules" ADD COLUMN IF NOT EXISTS "company_ids" uuid[] NULL`);

    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'allocation_rules_mode_valid') THEN
        ALTER TABLE allocation_rules
          ADD CONSTRAINT allocation_rules_mode_valid CHECK (mode IN ('auto', 'manual_company'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'allocation_rules_company_selection') THEN
        ALTER TABLE allocation_rules
          ADD CONSTRAINT allocation_rules_company_selection CHECK (
            (mode = 'manual_company' AND company_ids IS NOT NULL AND cardinality(company_ids) > 0)
            OR (mode = 'auto' AND company_ids IS NULL)
          );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'allocation_rules_global_has_no_companies') THEN
        -- The shared global standard row must never target one tenant's companies.
        ALTER TABLE allocation_rules
          ADD CONSTRAINT allocation_rules_global_has_no_companies CHECK (tenant_id IS NOT NULL OR company_ids IS NULL);
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "allocation_rules" DROP CONSTRAINT IF EXISTS allocation_rules_global_has_no_companies`);
    await queryRunner.query(`ALTER TABLE "allocation_rules" DROP CONSTRAINT IF EXISTS allocation_rules_company_selection`);
    await queryRunner.query(`ALTER TABLE "allocation_rules" DROP CONSTRAINT IF EXISTS allocation_rules_mode_valid`);
    await queryRunner.query(`ALTER TABLE "allocation_rules" DROP COLUMN IF EXISTS "company_ids"`);
    await queryRunner.query(`ALTER TABLE "allocation_rules" DROP COLUMN IF EXISTS "mode"`);
  }
}
