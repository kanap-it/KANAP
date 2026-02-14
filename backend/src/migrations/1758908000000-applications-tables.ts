import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplicationsTables1758908000000 implements MigrationInterface {
  name = 'ApplicationsTables1758908000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Base applications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        supplier_id uuid NULL,
        editor text NULL,
        lifecycle text NOT NULL DEFAULT 'active',
        criticality text NOT NULL,
        data_class text NOT NULL,
        hosting_model text NOT NULL,
        external_facing boolean NOT NULL DEFAULT false,
        last_dr_test date NULL,
        sso_enabled boolean NOT NULL DEFAULT false,
        mfa_supported boolean NOT NULL DEFAULT false,
        contains_pii boolean NOT NULL DEFAULT false,
        users_mode text NOT NULL DEFAULT 'it_users',
        users_year integer NOT NULL,
        users_override int NULL,
        licensing text NULL,
        notes text NULL,
        status text NOT NULL DEFAULT 'enabled',
        disabled_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_applications_tenant_name ON applications(tenant_id, name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_applications_tenant_lifecycle ON applications(tenant_id, lifecycle)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_applications_tenant_criticality ON applications(tenant_id, criticality)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_applications_tenant ON applications(tenant_id)`);
    // FKs
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_applications_supplier'
    ) THEN
      ALTER TABLE applications ADD CONSTRAINT fk_applications_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
    END IF; END $$;`);

    // Owners
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_owners (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        user_id uuid NOT NULL,
        owner_type text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_owner UNIQUE (tenant_id, application_id, user_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_owners_tenant ON application_owners(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_owners_app ON application_owners(tenant_id, application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_owners_user ON application_owners(tenant_id, user_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_owners_app'
    ) THEN
      ALTER TABLE application_owners ADD CONSTRAINT fk_app_owners_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_owners_user'
    ) THEN
      ALTER TABLE application_owners ADD CONSTRAINT fk_app_owners_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Audience: companies
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_companies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        company_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_company UNIQUE (tenant_id, application_id, company_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_companies_tenant ON application_companies(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_companies_app ON application_companies(tenant_id, application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_companies_company ON application_companies(tenant_id, company_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_companies_app'
    ) THEN
      ALTER TABLE application_companies ADD CONSTRAINT fk_app_companies_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_companies_company'
    ) THEN
      ALTER TABLE application_companies ADD CONSTRAINT fk_app_companies_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Audience: departments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_departments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        department_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_department UNIQUE (tenant_id, application_id, department_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_departments_tenant ON application_departments(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_departments_app ON application_departments(tenant_id, application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_departments_department ON application_departments(tenant_id, department_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_departments_app'
    ) THEN
      ALTER TABLE application_departments ADD CONSTRAINT fk_app_departments_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_departments_department'
    ) THEN
      ALTER TABLE application_departments ADD CONSTRAINT fk_app_departments_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Relations to spend/capex/contracts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_spend_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        spend_item_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_spend UNIQUE (tenant_id, application_id, spend_item_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_spend_tenant ON application_spend_items(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_spend_app ON application_spend_items(tenant_id, application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_spend_item ON application_spend_items(tenant_id, spend_item_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_spend_app'
    ) THEN
      ALTER TABLE application_spend_items ADD CONSTRAINT fk_app_spend_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_spend_item'
    ) THEN
      ALTER TABLE application_spend_items ADD CONSTRAINT fk_app_spend_item FOREIGN KEY (spend_item_id) REFERENCES spend_items(id) ON DELETE CASCADE;
    END IF; END $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_capex_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        capex_item_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_capex_tenant ON application_capex_items(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_capex_app ON application_capex_items(tenant_id, application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_capex_item ON application_capex_items(tenant_id, capex_item_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_capex_app'
    ) THEN
      ALTER TABLE application_capex_items ADD CONSTRAINT fk_app_capex_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_capex_item'
    ) THEN
      ALTER TABLE application_capex_items ADD CONSTRAINT fk_app_capex_item FOREIGN KEY (capex_item_id) REFERENCES capex_items(id) ON DELETE CASCADE;
    END IF; END $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_contracts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        contract_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_contract UNIQUE (tenant_id, application_id, contract_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_contracts_tenant ON application_contracts(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_contracts_app ON application_contracts(tenant_id, application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_contracts_contract ON application_contracts(tenant_id, contract_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_contracts_app'
    ) THEN
      ALTER TABLE application_contracts ADD CONSTRAINT fk_app_contracts_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_contracts_contract'
    ) THEN
      ALTER TABLE application_contracts ADD CONSTRAINT fk_app_contracts_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Links and attachments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        description text NULL,
        url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_links_tenant ON application_links(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_links_app ON application_links(tenant_id, application_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_links_app'
    ) THEN
      ALTER TABLE application_links ADD CONSTRAINT fk_app_links_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text NULL,
        size int NOT NULL DEFAULT 0,
        storage_path text NOT NULL,
        uploaded_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_attachments_tenant ON application_attachments(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_attachments_app ON application_attachments(tenant_id, application_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_attachments_app'
    ) THEN
      ALTER TABLE application_attachments ADD CONSTRAINT fk_app_attachments_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Data residency
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_data_residency (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        country_iso char(2) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_residency UNIQUE (tenant_id, application_id, country_iso)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_residency_tenant ON application_data_residency(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_residency_app ON application_data_residency(tenant_id, application_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_residency_app'
    ) THEN
      ALTER TABLE application_data_residency ADD CONSTRAINT fk_app_residency_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Enable RLS and policy for all new tables
    const tables = [
      'applications',
      'application_owners',
      'application_companies',
      'application_departments',
      'application_spend_items',
      'application_capex_items',
      'application_contracts',
      'application_links',
      'application_attachments',
      'application_data_residency',
    ];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${t}' AND policyname = '${t}_tenant_isolation'
        ) THEN
          DROP POLICY ${t}_tenant_isolation ON ${t};
        END IF;
      END $$;`);
      await queryRunner.query(`CREATE POLICY ${t}_tenant_isolation ON ${t}
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'application_data_residency',
      'application_attachments',
      'application_links',
      'application_contracts',
      'application_capex_items',
      'application_spend_items',
      'application_departments',
      'application_companies',
      'application_owners',
      'applications',
    ];
    for (const t of tables) {
      await queryRunner.query(`DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${t}' AND policyname = '${t}_tenant_isolation'
        ) THEN
          DROP POLICY ${t}_tenant_isolation ON ${t};
        END IF;
      END $$;`);
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${t};`);
    }
  }
}
