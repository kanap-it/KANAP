import { MigrationInterface, QueryRunner } from "typeorm";

export class CapexAccountColumn1758807400001 implements MigrationInterface {
  name = 'CapexAccountColumn1758807400001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'capex_items' AND column_name = 'account_id'
        ) THEN
          ALTER TABLE capex_items ADD COLUMN account_id uuid NULL;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_items_account_id ON capex_items(account_id)`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'capex_items' AND constraint_name = 'fk_capex_items_account_id'
        ) THEN
          ALTER TABLE capex_items ADD CONSTRAINT fk_capex_items_account_id FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE capex_items DROP CONSTRAINT IF EXISTS fk_capex_items_account_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_account_id`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'capex_items' AND column_name = 'account_id'
        ) THEN
          ALTER TABLE capex_items DROP COLUMN account_id;
        END IF;
      END
      $$;
    `);
  }
}

