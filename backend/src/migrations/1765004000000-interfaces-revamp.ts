import { MigrationInterface, QueryRunner } from "typeorm";

export class InterfacesRevamp1765004000000 implements MigrationInterface {
  name = 'InterfacesRevamp1765004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing data; we do not preserve legacy interface records.
    await queryRunner.query(`TRUNCATE TABLE interface_bindings CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE interfaces CASCADE`);

    // Recreate interfaces table with the new schema
    await queryRunner.query(`DROP TABLE IF EXISTS interfaces CASCADE`);
    await queryRunner.query(`
      CREATE TABLE interfaces (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id text NOT NULL,
        name text NOT NULL,
        business_process_id uuid NULL,
        business_purpose text NOT NULL,
        source_application_id uuid NOT NULL,
        target_application_id uuid NOT NULL,
        data_category text NOT NULL,
        integration_route_type text NOT NULL,
        lifecycle text NOT NULL DEFAULT 'proposed',
        overview_notes text NULL,
        criticality text NOT NULL DEFAULT 'medium',
        impact_of_failure text NULL,
        business_objects jsonb NULL,
        main_use_cases text NULL,
        functional_rules text NULL,
        core_transformations_summary text NULL,
        error_handling_summary text NULL,
        data_class text NOT NULL DEFAULT 'internal',
        contains_pii boolean NOT NULL DEFAULT false,
        pii_description text NULL,
        typical_data text NULL,
        audit_logging text NULL,
        security_controls_summary text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_interfaces_interface_id UNIQUE (tenant_id, interface_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interfaces_tenant_app_pair ON interfaces(tenant_id, source_application_id, target_application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interfaces_business_process ON interfaces(tenant_id, business_process_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interfaces_source_application_new'
        ) THEN
          ALTER TABLE interfaces ADD CONSTRAINT fk_interfaces_source_application_new FOREIGN KEY (source_application_id) REFERENCES applications(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interfaces_target_application_new'
        ) THEN
          ALTER TABLE interfaces ADD CONSTRAINT fk_interfaces_target_application_new FOREIGN KEY (target_application_id) REFERENCES applications(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interfaces_business_process_new'
        ) THEN
          ALTER TABLE interfaces ADD CONSTRAINT fk_interfaces_business_process_new FOREIGN KEY (business_process_id) REFERENCES business_processes(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Middleware applications
    await queryRunner.query(`
      CREATE TABLE interface_middleware_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        application_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_interface_middleware UNIQUE (tenant_id, interface_id, application_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_middleware_interface ON interface_middleware_applications(tenant_id, interface_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_middleware_interface'
        ) THEN
          ALTER TABLE interface_middleware_applications ADD CONSTRAINT fk_interface_middleware_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_middleware_application'
        ) THEN
          ALTER TABLE interface_middleware_applications ADD CONSTRAINT fk_interface_middleware_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Owners
    await queryRunner.query(`
      CREATE TABLE interface_owners (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        user_id uuid NOT NULL,
        owner_type text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_interface_owner UNIQUE (tenant_id, interface_id, user_id, owner_type)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_owners_interface ON interface_owners(tenant_id, interface_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_owners_interface'
        ) THEN
          ALTER TABLE interface_owners ADD CONSTRAINT fk_interface_owners_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_owners_user'
        ) THEN
          ALTER TABLE interface_owners ADD CONSTRAINT fk_interface_owners_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Impacted companies
    await queryRunner.query(`
      CREATE TABLE interface_companies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        company_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_interface_company UNIQUE (tenant_id, interface_id, company_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_companies_interface ON interface_companies(tenant_id, interface_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_companies_interface'
        ) THEN
          ALTER TABLE interface_companies ADD CONSTRAINT fk_interface_companies_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_companies_company'
        ) THEN
          ALTER TABLE interface_companies ADD CONSTRAINT fk_interface_companies_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Dependencies
    await queryRunner.query(`
      CREATE TABLE interface_dependencies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        related_interface_id uuid NOT NULL,
        direction text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_dependencies_interface ON interface_dependencies(tenant_id, interface_id, direction)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_dependencies_interface'
        ) THEN
          ALTER TABLE interface_dependencies ADD CONSTRAINT fk_interface_dependencies_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_dependencies_related'
        ) THEN
          ALTER TABLE interface_dependencies ADD CONSTRAINT fk_interface_dependencies_related FOREIGN KEY (related_interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Key identifiers
    await queryRunner.query(`
      CREATE TABLE interface_key_identifiers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        source_identifier text NOT NULL,
        destination_identifier text NOT NULL,
        identifier_notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_key_identifiers_interface ON interface_key_identifiers(tenant_id, interface_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_key_identifiers_interface'
        ) THEN
          ALTER TABLE interface_key_identifiers ADD CONSTRAINT fk_interface_key_identifiers_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Links
    await queryRunner.query(`
      CREATE TABLE interface_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        kind text NOT NULL,
        description text NULL,
        url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_links_interface ON interface_links(tenant_id, interface_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_links_interface'
        ) THEN
          ALTER TABLE interface_links ADD CONSTRAINT fk_interface_links_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Attachments
    await queryRunner.query(`
      CREATE TABLE interface_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        kind text NOT NULL,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text NULL,
        size int NOT NULL,
        storage_path text NOT NULL,
        uploaded_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_attachments_interface ON interface_attachments(tenant_id, interface_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_attachments_interface'
        ) THEN
          ALTER TABLE interface_attachments ADD CONSTRAINT fk_interface_attachments_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Data residency
    await queryRunner.query(`
      CREATE TABLE interface_data_residency (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        country_iso char(2) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_interface_data_residency UNIQUE (interface_id, country_iso)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_data_residency_interface ON interface_data_residency(tenant_id, interface_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_data_residency_interface'
        ) THEN
          ALTER TABLE interface_data_residency ADD CONSTRAINT fk_interface_data_residency_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Legs
    await queryRunner.query(`
      CREATE TABLE interface_legs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        leg_type text NOT NULL,
        from_role text NOT NULL,
        to_role text NOT NULL,
        trigger_type text NOT NULL,
        integration_pattern text NOT NULL,
        data_format text NOT NULL,
        job_name text NULL,
        order_index int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_legs_interface ON interface_legs(tenant_id, interface_id)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_legs_interface'
        ) THEN
          ALTER TABLE interface_legs ADD CONSTRAINT fk_interface_legs_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Recreate interface_bindings as env leg bindings
    await queryRunner.query(`DROP TABLE IF EXISTS interface_bindings CASCADE`);
    await queryRunner.query(`
      CREATE TABLE interface_bindings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        interface_leg_id uuid NOT NULL,
        environment text NOT NULL,
        source_instance_id uuid NOT NULL,
        target_instance_id uuid NOT NULL,
        source_endpoint text NULL,
        target_endpoint text NULL,
        trigger_details text NULL,
        env_job_name text NULL,
        authentication_mode text NULL,
        monitoring_url text NULL,
        env_notes text NULL,
        status text NOT NULL DEFAULT 'proposed',
        integration_tool_application_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_interface_binding_env_leg UNIQUE (tenant_id, interface_leg_id, environment)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_bindings_interface ON interface_bindings(tenant_id, interface_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_bindings_leg_env ON interface_bindings(tenant_id, interface_leg_id, environment)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_interface_new'
        ) THEN
          ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_interface_new FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_leg'
        ) THEN
          ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_leg FOREIGN KEY (interface_leg_id) REFERENCES interface_legs(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_source_instance_new'
        ) THEN
          ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_source_instance_new FOREIGN KEY (source_instance_id) REFERENCES app_instances(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_target_instance_new'
        ) THEN
          ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_target_instance_new FOREIGN KEY (target_instance_id) REFERENCES app_instances(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_tool_app_new'
        ) THEN
          ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_tool_app_new FOREIGN KEY (integration_tool_application_id) REFERENCES applications(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Enable RLS on all new / recreated tables
    const rlsTables = [
      'interfaces',
      'interface_middleware_applications',
      'interface_owners',
      'interface_companies',
      'interface_dependencies',
      'interface_key_identifiers',
      'interface_links',
      'interface_attachments',
      'interface_data_residency',
      'interface_legs',
      'interface_bindings',
    ];
    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${table}' AND policyname = '${table}_tenant_isolation'
        ) THEN
          DROP POLICY ${table}_tenant_isolation ON ${table};
        END IF;
      END $$;`);
      await queryRunner.query(`CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort rollback: drop new interface-related tables and recreate original minimal schema.
    await queryRunner.query(`DROP TABLE IF EXISTS interface_bindings`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_legs`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_data_residency`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_links`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_key_identifiers`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_dependencies`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_companies`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_owners`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_middleware_applications`);
    await queryRunner.query(`DROP TABLE IF EXISTS interfaces`);

    // Recreate original minimal interfaces and interface_bindings tables for compatibility with older code.
    await queryRunner.query(`
      CREATE TABLE interfaces (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        description text NULL,
        type text NOT NULL,
        source_application_id uuid NOT NULL,
        target_application_id uuid NOT NULL,
        lifecycle text NOT NULL DEFAULT 'proposed',
        criticality text NOT NULL DEFAULT 'medium',
        data_class text NOT NULL DEFAULT 'internal',
        contains_pii boolean NOT NULL DEFAULT false,
        contract_url text NULL,
        repo_url text NULL,
        runbook_url text NULL,
        monitoring_url text NULL,
        owner_user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE interface_bindings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        source_instance_id uuid NOT NULL,
        target_instance_id uuid NOT NULL,
        protocol text NOT NULL,
        endpoint text NOT NULL,
        schedule text NOT NULL,
        sla_latency_ms integer NULL,
        availability_target_bps integer NULL,
        status text NOT NULL DEFAULT 'enabled',
        contract_url_override text NULL,
        integration_tool_application_id uuid NULL,
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }
}

