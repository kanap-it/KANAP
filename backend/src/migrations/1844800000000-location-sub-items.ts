import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationSubItems1844800000000 implements MigrationInterface {
  name = 'LocationSubItems1844800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS location_sub_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        location_id uuid NOT NULL,
        name text NOT NULL,
        display_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_location_sub_items_unique ON location_sub_items(tenant_id, location_id, lower(name))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_location_sub_items_location ON location_sub_items(tenant_id, location_id)`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_location_sub_items_location'
        ) THEN
          ALTER TABLE location_sub_items
            ADD CONSTRAINT fk_location_sub_items_location
            FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE location_sub_items ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE location_sub_items FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'location_sub_items' AND policyname = 'location_sub_items_tenant_isolation'
        ) THEN
          CREATE POLICY location_sub_items_tenant_isolation ON location_sub_items
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS sub_location_id uuid NULL;`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_assets_sub_location ON assets(tenant_id, sub_location_id)`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_assets_sub_location'
        ) THEN
          ALTER TABLE assets
            ADD CONSTRAINT fk_assets_sub_location
            FOREIGN KEY (sub_location_id) REFERENCES location_sub_items(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE assets DROP CONSTRAINT IF EXISTS fk_assets_sub_location;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_sub_location;`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN IF EXISTS sub_location_id;`);

    await queryRunner.query(`DROP POLICY IF EXISTS location_sub_items_tenant_isolation ON location_sub_items;`);
    await queryRunner.query(`ALTER TABLE location_sub_items DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_sub_items_location;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_sub_items_unique;`);
    await queryRunner.query(`DROP TABLE IF EXISTS location_sub_items;`);
  }
}
