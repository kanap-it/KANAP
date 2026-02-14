import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveDepartmentCodeAndHierarchy1756684900000 implements MigrationInterface {
  name = 'RemoveDepartmentCodeAndHierarchy1756684900000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint on (company_id, code)
    await queryRunner.query(`ALTER TABLE departments DROP CONSTRAINT IF EXISTS "UQ_departments_company_id_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_departments_company_id_code"`);
    
    // Remove the foreign key constraint for parent_department_id
    await queryRunner.query(`ALTER TABLE departments DROP CONSTRAINT IF EXISTS "FK_departments_parent_department_id"`);
    
    // Drop the columns
    await queryRunner.query(`ALTER TABLE departments DROP COLUMN IF EXISTS code`);
    await queryRunner.query(`ALTER TABLE departments DROP COLUMN IF EXISTS parent_department_id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the columns
    await queryRunner.query(`ALTER TABLE departments ADD COLUMN code text`);
    await queryRunner.query(`ALTER TABLE departments ADD COLUMN parent_department_id uuid`);
    
    // Add back the foreign key constraint
    await queryRunner.query(`ALTER TABLE departments ADD CONSTRAINT "FK_departments_parent_department_id" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    
    // Add back the unique constraint (but this will fail if there are duplicate codes)
    // Note: This rollback may fail if data doesn't meet the constraint requirements
    await queryRunner.query(`ALTER TABLE departments ADD CONSTRAINT "UQ_departments_company_id_code" UNIQUE ("company_id", "code")`);
  }
}
