import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyIdToCapexItems1756688900000 implements MigrationInterface {
  name = 'AddCompanyIdToCapexItems1756688900000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add company_id column to capex_items table
    await queryRunner.query(`ALTER TABLE capex_items ADD COLUMN company_id uuid`);
    
    // Add foreign key constraint
    await queryRunner.query(`ALTER TABLE capex_items ADD CONSTRAINT fk_capex_items_company_id 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL`);
    
    // Add composite index for performance
    await queryRunner.query(`CREATE INDEX idx_capex_items_tenant_company 
      ON capex_items (tenant_id, company_id) WHERE company_id IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_company`);
    
    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE capex_items DROP CONSTRAINT IF EXISTS fk_capex_items_company_id`);
    
    // Drop column
    await queryRunner.query(`ALTER TABLE capex_items DROP COLUMN IF EXISTS company_id`);
  }
}
