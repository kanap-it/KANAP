import { MigrationInterface, QueryRunner } from "typeorm";

export class CapexRenameCompanyToPaying1758807300000 implements MigrationInterface {
  name = 'CapexRenameCompanyToPaying1758807300000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename column if old company_id exists
    const colExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns WHERE table_name = 'capex_items' AND column_name = 'company_id'
    `);
    if (Array.isArray(colExists) && colExists.length > 0) {
      await queryRunner.query(`ALTER TABLE capex_items RENAME COLUMN company_id TO paying_company_id`);
    } else {
      // Ensure column exists
      await queryRunner.query(`ALTER TABLE capex_items ADD COLUMN IF NOT EXISTS paying_company_id uuid NULL`);
    }
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_items_paying_company_id ON capex_items(paying_company_id)`);
    // Optional FK
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'capex_items' AND constraint_name = 'fk_capex_items_paying_company'
      ) THEN
        ALTER TABLE capex_items ADD CONSTRAINT fk_capex_items_paying_company FOREIGN KEY (paying_company_id) REFERENCES companies(id) ON DELETE SET NULL;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE capex_items DROP CONSTRAINT IF EXISTS fk_capex_items_paying_company`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_paying_company_id`);
    // Try to rename back if paying_company_id exists and company_id not present
    const hasPaying = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns WHERE table_name = 'capex_items' AND column_name = 'paying_company_id'
    `);
    const hasCompany = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns WHERE table_name = 'capex_items' AND column_name = 'company_id'
    `);
    if (Array.isArray(hasPaying) && hasPaying.length > 0 && Array.isArray(hasCompany) && hasCompany.length === 0) {
      await queryRunner.query(`ALTER TABLE capex_items RENAME COLUMN paying_company_id TO company_id`);
    } else {
      await queryRunner.query(`ALTER TABLE capex_items DROP COLUMN IF EXISTS paying_company_id`);
    }
  }
}

