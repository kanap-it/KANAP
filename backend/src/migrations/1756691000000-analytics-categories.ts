import { MigrationInterface, QueryRunner } from "typeorm";

export class AnalyticsCategories1756691000000 implements MigrationInterface {
  name = 'AnalyticsCategories1756691000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS analytics_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        description text,
        status text NOT NULL DEFAULT 'enabled',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      ALTER TABLE analytics_categories
      ADD CONSTRAINT analytics_categories_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_analytics_categories_tenant ON analytics_categories(tenant_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_categories_unique_name ON analytics_categories(tenant_id, lower(name));`);
    await queryRunner.query(`ALTER TABLE analytics_categories ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE analytics_categories FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analytics_categories' AND policyname = 'analytics_categories_tenant_isolation'
      ) THEN
        CREATE POLICY analytics_categories_tenant_isolation ON analytics_categories
          USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
          WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
      END IF;
    END $$;`);

    await queryRunner.query(`ALTER TABLE spend_items ADD COLUMN IF NOT EXISTS analytics_category_id uuid NULL;`);
    await queryRunner.query(`
      ALTER TABLE spend_items
      ADD CONSTRAINT spend_items_analytics_category_fk
      FOREIGN KEY (analytics_category_id) REFERENCES analytics_categories(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      WITH distinct_categories AS (
        SELECT DISTINCT tenant_id, trim(mgmt_classification) AS name
        FROM spend_items
        WHERE mgmt_classification IS NOT NULL AND trim(mgmt_classification) <> ''
      )
      INSERT INTO analytics_categories (tenant_id, name, status)
      SELECT tenant_id, name, 'enabled'
      FROM distinct_categories
      WHERE name IS NOT NULL AND name <> ''
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      UPDATE spend_items s
      SET analytics_category_id = cat.id
      FROM analytics_categories cat
      WHERE s.mgmt_classification IS NOT NULL
        AND trim(s.mgmt_classification) <> ''
        AND cat.tenant_id = s.tenant_id
        AND lower(cat.name) = lower(trim(s.mgmt_classification));
    `);

    await queryRunner.query(`ALTER TABLE spend_items DROP COLUMN IF EXISTS mgmt_classification;`);

    await queryRunner.query(`
      INSERT INTO role_permissions(tenant_id, role_id, resource, level)
      SELECT r.tenant_id, r.id, 'analytics', 'admin'
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.resource = 'analytics'
      WHERE r.role_name = 'Administrator' AND rp.id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE spend_items ADD COLUMN IF NOT EXISTS mgmt_classification text;`);
    await queryRunner.query(`
      UPDATE spend_items s
      SET mgmt_classification = cat.name
      FROM analytics_categories cat
      WHERE s.analytics_category_id = cat.id;
    `);
    await queryRunner.query(`ALTER TABLE spend_items DROP CONSTRAINT IF EXISTS spend_items_analytics_category_fk;`);
    await queryRunner.query(`ALTER TABLE spend_items DROP COLUMN IF EXISTS analytics_category_id;`);

    await queryRunner.query(`DROP POLICY IF EXISTS analytics_categories_tenant_isolation ON analytics_categories;`);
    await queryRunner.query(`ALTER TABLE analytics_categories DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_categories_unique_name;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_categories_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_categories;`);

    await queryRunner.query(`DELETE FROM role_permissions WHERE resource = 'analytics';`);
  }
}
