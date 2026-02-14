import { MigrationInterface, QueryRunner } from 'typeorm';

export class Locations1765006000000 implements MigrationInterface {
  name = 'Locations1765006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        code text NOT NULL,
        name text NOT NULL,
        hosting_type text NOT NULL,
        operating_company_id uuid NULL,
        country_iso char(2) NULL,
        city text NULL,
        datacenter text NULL,
        provider text NULL,
        region text NULL,
        additional_info text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_tenant_code_ci ON locations(tenant_id, lower(code))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_tenant_name_ci ON locations(tenant_id, lower(name))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_locations_tenant_hosting_type ON locations(tenant_id, hosting_type)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_locations_tenant_provider ON locations(tenant_id, provider)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_locations_tenant_country_city ON locations(tenant_id, country_iso, city)`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_locations_operating_company'
        ) THEN
          ALTER TABLE locations
            ADD CONSTRAINT fk_locations_operating_company
            FOREIGN KEY (operating_company_id) REFERENCES companies(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE locations ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE locations FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'locations' AND policyname = 'locations_tenant_isolation'
        ) THEN
          CREATE POLICY locations_tenant_isolation ON locations
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS location_user_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        location_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_location_user_contacts_unique ON location_user_contacts(tenant_id, location_id, user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_location_user_contacts_location ON location_user_contacts(tenant_id, location_id)`,
    );
    await queryRunner.query(`
      ALTER TABLE location_user_contacts
        ADD CONSTRAINT fk_location_user_contacts_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      ALTER TABLE location_user_contacts
        ADD CONSTRAINT fk_location_user_contacts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`ALTER TABLE location_user_contacts ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE location_user_contacts FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'location_user_contacts' AND policyname = 'location_user_contacts_tenant_isolation'
        ) THEN
          CREATE POLICY location_user_contacts_tenant_isolation ON location_user_contacts
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS location_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        location_id uuid NOT NULL,
        contact_id uuid NOT NULL,
        role text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_location_contacts_unique ON location_contacts(tenant_id, location_id, contact_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_location_contacts_location ON location_contacts(tenant_id, location_id)`,
    );
    await queryRunner.query(`
      ALTER TABLE location_contacts
        ADD CONSTRAINT fk_location_contacts_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      ALTER TABLE location_contacts
        ADD CONSTRAINT fk_location_contacts_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`ALTER TABLE location_contacts ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE location_contacts FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'location_contacts' AND policyname = 'location_contacts_tenant_isolation'
        ) THEN
          CREATE POLICY location_contacts_tenant_isolation ON location_contacts
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS location_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        location_id uuid NOT NULL,
        description text NULL,
        url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_location_links_location ON location_links(tenant_id, location_id)`,
    );
    await queryRunner.query(`
      ALTER TABLE location_links
        ADD CONSTRAINT fk_location_links_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`ALTER TABLE location_links ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE location_links FORCE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'location_links' AND policyname = 'location_links_tenant_isolation'
        ) THEN
          CREATE POLICY location_links_tenant_isolation ON location_links
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE servers ADD COLUMN IF NOT EXISTS location_id uuid NULL;`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_servers_tenant_location ON servers(tenant_id, location_id)`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_servers_location'
        ) THEN
          ALTER TABLE servers
            ADD CONSTRAINT fk_servers_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`
      INSERT INTO role_permissions(tenant_id, role_id, resource, level)
      SELECT r.tenant_id, r.id, 'locations', 'admin'
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.resource = 'locations'
      WHERE r.role_name = 'Administrator' AND rp.id IS NULL;
    `);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DELETE FROM role_permissions WHERE resource = 'locations';`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;`);

    await queryRunner.query(`ALTER TABLE servers DROP CONSTRAINT IF EXISTS fk_servers_location;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_servers_tenant_location;`);
    await queryRunner.query(`ALTER TABLE servers DROP COLUMN IF EXISTS location_id;`);

    await queryRunner.query(`DROP POLICY IF EXISTS location_links_tenant_isolation ON location_links;`);
    await queryRunner.query(`ALTER TABLE location_links DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_links_location;`);
    await queryRunner.query(`DROP TABLE IF EXISTS location_links;`);

    await queryRunner.query(`DROP POLICY IF EXISTS location_contacts_tenant_isolation ON location_contacts;`);
    await queryRunner.query(`ALTER TABLE location_contacts DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_contacts_location;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_contacts_unique;`);
    await queryRunner.query(`DROP TABLE IF EXISTS location_contacts;`);

    await queryRunner.query(`DROP POLICY IF EXISTS location_user_contacts_tenant_isolation ON location_user_contacts;`);
    await queryRunner.query(`ALTER TABLE location_user_contacts DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_user_contacts_location;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_user_contacts_unique;`);
    await queryRunner.query(`DROP TABLE IF EXISTS location_user_contacts;`);

    await queryRunner.query(`DROP POLICY IF EXISTS locations_tenant_isolation ON locations;`);
    await queryRunner.query(`ALTER TABLE locations DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_locations_tenant_country_city;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_locations_tenant_provider;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_locations_tenant_hosting_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_locations_tenant_name_ci;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_locations_tenant_code_ci;`);
    await queryRunner.query(`DROP TABLE IF EXISTS locations;`);
  }
}

