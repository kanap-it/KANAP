import { MigrationInterface, QueryRunner } from 'typeorm';

export class CapexParityFields1853210000000 implements MigrationInterface {
  name = 'CapexParityFields1853210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE capex_items ADD COLUMN IF NOT EXISTS owner_it_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE capex_items ADD COLUMN IF NOT EXISTS owner_business_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE capex_items ADD COLUMN IF NOT EXISTS analytics_category_id uuid NULL`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'capex_items' AND constraint_name = 'capex_items_owner_it_fk'
        ) THEN
          ALTER TABLE capex_items
          ADD CONSTRAINT capex_items_owner_it_fk
          FOREIGN KEY (owner_it_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'capex_items' AND constraint_name = 'capex_items_owner_business_fk'
        ) THEN
          ALTER TABLE capex_items
          ADD CONSTRAINT capex_items_owner_business_fk
          FOREIGN KEY (owner_business_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'capex_items' AND constraint_name = 'capex_items_analytics_category_fk'
        ) THEN
          ALTER TABLE capex_items
          ADD CONSTRAINT capex_items_analytics_category_fk
          FOREIGN KEY (analytics_category_id) REFERENCES analytics_categories(id) ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_items_tenant_owner_it
      ON capex_items(tenant_id, owner_it_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_items_tenant_owner_business
      ON capex_items(tenant_id, owner_business_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_items_tenant_category
      ON capex_items(tenant_id, analytics_category_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_owner_business`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_owner_it`);
    await queryRunner.query(`ALTER TABLE capex_items DROP CONSTRAINT IF EXISTS capex_items_analytics_category_fk`);
    await queryRunner.query(`ALTER TABLE capex_items DROP CONSTRAINT IF EXISTS capex_items_owner_business_fk`);
    await queryRunner.query(`ALTER TABLE capex_items DROP CONSTRAINT IF EXISTS capex_items_owner_it_fk`);
    await queryRunner.query(`ALTER TABLE capex_items DROP COLUMN IF EXISTS analytics_category_id`);
    await queryRunner.query(`ALTER TABLE capex_items DROP COLUMN IF EXISTS owner_business_id`);
    await queryRunner.query(`ALTER TABLE capex_items DROP COLUMN IF EXISTS owner_it_id`);
  }
}
