import { MigrationInterface, QueryRunner } from "typeorm";

export class applicationCategoryField1805000000000 implements MigrationInterface {
  name = 'applicationCategoryField1805000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop the old index first (before renaming the column)
    // The original index was created in 1765006200000-applications-catalog-type.ts
    await queryRunner.query(`DROP INDEX IF EXISTS idx_applications_tenant_catalog_type`);

    // Step 2: Rename the column from catalog_type to category
    await queryRunner.query(`ALTER TABLE applications RENAME COLUMN catalog_type TO category`);

    // Step 3: Migrate existing values (case-insensitive matching for safety)
    // 'application' -> 'line_of_business'
    // 'service' -> 'infrastructure'
    await queryRunner.query(`UPDATE applications SET category = 'line_of_business' WHERE LOWER(category) = 'application'`);
    await queryRunner.query(`UPDATE applications SET category = 'infrastructure' WHERE LOWER(category) = 'service'`);

    // Step 4: Update the default value
    await queryRunner.query(`ALTER TABLE applications ALTER COLUMN category SET DEFAULT 'line_of_business'`);

    // Step 5: Create new index with the new column name
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_applications_tenant_category ON applications(tenant_id, category)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_applications_tenant_category`);

    // Revert data migration
    await queryRunner.query(`UPDATE applications SET category = 'application' WHERE category = 'line_of_business'`);
    await queryRunner.query(`UPDATE applications SET category = 'service' WHERE category = 'infrastructure'`);

    // Revert default value
    await queryRunner.query(`ALTER TABLE applications ALTER COLUMN category SET DEFAULT 'application'`);

    // Rename column back
    await queryRunner.query(`ALTER TABLE applications RENAME COLUMN category TO catalog_type`);

    // Recreate original index
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_applications_tenant_catalog_type ON applications(tenant_id, catalog_type)`);
  }
}
