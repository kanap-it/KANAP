import { MigrationInterface, QueryRunner } from "typeorm";

export class ContactsAndLinks1758806000000 implements MigrationInterface {
  name = 'ContactsAndLinks1758806000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // contacts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        first_name text NULL,
        last_name text NULL,
        job_title text NULL,
        email text NOT NULL,
        phone text NULL,
        mobile text NULL,
        country char(2) NULL,
        notes text NULL,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_contacts_email_per_tenant ON contacts(tenant_id, lower(email));`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(tenant_id, lower(last_name), lower(first_name));`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(tenant_id, active);`);

    await queryRunner.query(`ALTER TABLE contacts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE contacts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_tenant_isolation'
      ) THEN
        DROP POLICY contacts_tenant_isolation ON contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY contacts_tenant_isolation ON contacts
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);

    // supplier_contacts table + enum
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_contact_role') THEN
          CREATE TYPE supplier_contact_role AS ENUM ('commercial','technical','support','other');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        supplier_id uuid NOT NULL,
        contact_id uuid NOT NULL,
        role supplier_contact_role NOT NULL,
        is_primary boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uniq_supplier_contact_role UNIQUE (tenant_id, supplier_id, contact_id, role)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_supplier_contacts_tenant ON supplier_contacts(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(tenant_id, supplier_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_supplier_contacts_contact ON supplier_contacts(tenant_id, contact_id);`);

    await queryRunner.query(`ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE supplier_contacts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'supplier_contacts' AND policyname = 'supplier_contacts_tenant_isolation'
      ) THEN
        DROP POLICY supplier_contacts_tenant_isolation ON supplier_contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY supplier_contacts_tenant_isolation ON supplier_contacts
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'supplier_contacts' AND policyname = 'supplier_contacts_tenant_isolation'
      ) THEN
        DROP POLICY supplier_contacts_tenant_isolation ON supplier_contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`ALTER TABLE supplier_contacts DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS supplier_contacts;`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_contact_role') THEN
        DROP TYPE supplier_contact_role;
      END IF;
    END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_tenant_isolation'
      ) THEN
        DROP POLICY contacts_tenant_isolation ON contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`ALTER TABLE contacts DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS contacts;`);
  }
}

