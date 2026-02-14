import { MigrationInterface, QueryRunner } from "typeorm";

export class ItemContacts1766001000000 implements MigrationInterface {
  name = 'ItemContacts1766001000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add supplier_id column to capex_items
    await queryRunner.query(`
      ALTER TABLE capex_items ADD COLUMN IF NOT EXISTS supplier_id uuid NULL;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_items_supplier ON capex_items(tenant_id, supplier_id);`);

    // spend_item_contacts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spend_item_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        spend_item_id uuid NOT NULL REFERENCES spend_items(id) ON DELETE CASCADE,
        contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        role supplier_contact_role NOT NULL,
        origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('supplier', 'manual')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uniq_spend_item_contact_role UNIQUE (tenant_id, spend_item_id, contact_id, role)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_item_contacts_tenant ON spend_item_contacts(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_item_contacts_item ON spend_item_contacts(tenant_id, spend_item_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_item_contacts_contact ON spend_item_contacts(tenant_id, contact_id);`);

    await queryRunner.query(`ALTER TABLE spend_item_contacts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE spend_item_contacts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'spend_item_contacts' AND policyname = 'spend_item_contacts_tenant_isolation'
      ) THEN
        DROP POLICY spend_item_contacts_tenant_isolation ON spend_item_contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY spend_item_contacts_tenant_isolation ON spend_item_contacts
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);

    // capex_item_contacts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS capex_item_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        capex_item_id uuid NOT NULL REFERENCES capex_items(id) ON DELETE CASCADE,
        contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        role supplier_contact_role NOT NULL,
        origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('supplier', 'manual')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uniq_capex_item_contact_role UNIQUE (tenant_id, capex_item_id, contact_id, role)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_item_contacts_tenant ON capex_item_contacts(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_item_contacts_item ON capex_item_contacts(tenant_id, capex_item_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_item_contacts_contact ON capex_item_contacts(tenant_id, contact_id);`);

    await queryRunner.query(`ALTER TABLE capex_item_contacts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_item_contacts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'capex_item_contacts' AND policyname = 'capex_item_contacts_tenant_isolation'
      ) THEN
        DROP POLICY capex_item_contacts_tenant_isolation ON capex_item_contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY capex_item_contacts_tenant_isolation ON capex_item_contacts
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);

    // contract_contacts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        role supplier_contact_role NOT NULL,
        origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('supplier', 'manual')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uniq_contract_contact_role UNIQUE (tenant_id, contract_id, contact_id, role)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_contacts_tenant ON contract_contacts(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_contacts_contract ON contract_contacts(tenant_id, contract_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_contacts_contact ON contract_contacts(tenant_id, contact_id);`);

    await queryRunner.query(`ALTER TABLE contract_contacts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE contract_contacts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contract_contacts' AND policyname = 'contract_contacts_tenant_isolation'
      ) THEN
        DROP POLICY contract_contacts_tenant_isolation ON contract_contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY contract_contacts_tenant_isolation ON contract_contacts
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop contract_contacts
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contract_contacts' AND policyname = 'contract_contacts_tenant_isolation'
      ) THEN
        DROP POLICY contract_contacts_tenant_isolation ON contract_contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`ALTER TABLE contract_contacts DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_contacts;`);

    // Drop capex_item_contacts
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'capex_item_contacts' AND policyname = 'capex_item_contacts_tenant_isolation'
      ) THEN
        DROP POLICY capex_item_contacts_tenant_isolation ON capex_item_contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`ALTER TABLE capex_item_contacts DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS capex_item_contacts;`);

    // Drop spend_item_contacts
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'spend_item_contacts' AND policyname = 'spend_item_contacts_tenant_isolation'
      ) THEN
        DROP POLICY spend_item_contacts_tenant_isolation ON spend_item_contacts;
      END IF;
    END $$;`);
    await queryRunner.query(`ALTER TABLE spend_item_contacts DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS spend_item_contacts;`);

    // Drop supplier_id from capex_items
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_supplier;`);
    await queryRunner.query(`ALTER TABLE capex_items DROP COLUMN IF EXISTS supplier_id;`);
  }
}
