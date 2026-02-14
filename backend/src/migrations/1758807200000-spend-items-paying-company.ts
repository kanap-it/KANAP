import { MigrationInterface, QueryRunner } from "typeorm";

export class SpendItemsPayingCompany1758807200000 implements MigrationInterface {
  name = 'SpendItemsPayingCompany1758807200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE spend_items ADD COLUMN IF NOT EXISTS paying_company_id uuid NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_items_paying_company_id ON spend_items(paying_company_id)`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'spend_items' AND constraint_name = 'fk_spend_items_paying_company'
      ) THEN
        ALTER TABLE spend_items ADD CONSTRAINT fk_spend_items_paying_company FOREIGN KEY (paying_company_id) REFERENCES companies(id) ON DELETE SET NULL;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE spend_items DROP CONSTRAINT IF EXISTS fk_spend_items_paying_company`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_items_paying_company_id`);
    await queryRunner.query(`ALTER TABLE spend_items DROP COLUMN IF EXISTS paying_company_id`);
  }
}

