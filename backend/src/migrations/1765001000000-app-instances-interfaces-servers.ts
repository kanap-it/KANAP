import { MigrationInterface, QueryRunner } from "typeorm";

export class AppInstancesInterfacesServers1765001000000 implements MigrationInterface {
  name = 'AppInstancesInterfacesServers1765001000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // App instances table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        environment text NOT NULL,
        hosting_model text NOT NULL,
        sso_enabled boolean NOT NULL DEFAULT false,
        mfa_supported boolean NOT NULL DEFAULT false,
        base_url text NULL,
        region text NULL,
        zone text NULL,
        status text NOT NULL DEFAULT 'enabled',
        disabled_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_instances_env UNIQUE (tenant_id, application_id, environment)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_instances_tenant_env ON app_instances(tenant_id, environment)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_instances_tenant_app ON app_instances(tenant_id, application_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_instances_application'
    ) THEN
      ALTER TABLE app_instances ADD CONSTRAINT fk_app_instances_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Interfaces table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS interfaces (
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interfaces_tenant_app_pair ON interfaces(tenant_id, source_application_id, target_application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interfaces_owner ON interfaces(tenant_id, owner_user_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interfaces_source_application'
    ) THEN
      ALTER TABLE interfaces ADD CONSTRAINT fk_interfaces_source_application FOREIGN KEY (source_application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interfaces_target_application'
    ) THEN
      ALTER TABLE interfaces ADD CONSTRAINT fk_interfaces_target_application FOREIGN KEY (target_application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interfaces_owner_user'
    ) THEN
      ALTER TABLE interfaces ADD CONSTRAINT fk_interfaces_owner_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF; END $$;`);

    // Interface bindings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS interface_bindings (
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
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_interface_bindings UNIQUE (tenant_id, interface_id, source_instance_id, target_instance_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_bindings_interface ON interface_bindings(tenant_id, interface_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_bindings_source ON interface_bindings(tenant_id, source_instance_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_interface_bindings_target ON interface_bindings(tenant_id, target_instance_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_interface'
    ) THEN
      ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_source_instance'
    ) THEN
      ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_source_instance FOREIGN KEY (source_instance_id) REFERENCES app_instances(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_target_instance'
    ) THEN
      ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_target_instance FOREIGN KEY (target_instance_id) REFERENCES app_instances(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_interface_bindings_tool_app'
    ) THEN
      ALTER TABLE interface_bindings ADD CONSTRAINT fk_interface_bindings_tool_app FOREIGN KEY (integration_tool_application_id) REFERENCES applications(id) ON DELETE SET NULL;
    END IF; END $$;`);

    // Servers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        kind text NOT NULL,
        provider text NOT NULL,
        environment text NOT NULL,
        region text NULL,
        zone text NULL,
        hostname text NULL,
        ip text NULL,
        cluster text NULL,
        status text NOT NULL DEFAULT 'enabled',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_servers_tenant_env ON servers(tenant_id, environment)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_servers_tenant_kind ON servers(tenant_id, kind)`);

    // App server assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_server_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        app_instance_id uuid NOT NULL,
        server_id uuid NOT NULL,
        role text NOT NULL,
        since_date date NULL,
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_server_assignment UNIQUE (tenant_id, app_instance_id, server_id, role)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_server_assignments_instance ON app_server_assignments(tenant_id, app_instance_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_server_assignments_server ON app_server_assignments(tenant_id, server_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_server_assignment_instance'
    ) THEN
      ALTER TABLE app_server_assignments ADD CONSTRAINT fk_app_server_assignment_instance FOREIGN KEY (app_instance_id) REFERENCES app_instances(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_server_assignment_server'
    ) THEN
      ALTER TABLE app_server_assignments ADD CONSTRAINT fk_app_server_assignment_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Backfill one app_instance per application using legacy fields
    await queryRunner.query(`
      INSERT INTO app_instances (id, tenant_id, application_id, environment, hosting_model, sso_enabled, mfa_supported, status, disabled_at, base_url, region, zone, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        a.tenant_id,
        a.id,
        a.environment,
        a.hosting_model,
        a.sso_enabled,
        a.mfa_supported,
        a.status,
        a.disabled_at,
        NULL,
        NULL,
        NULL,
        a.created_at,
        a.updated_at
      FROM applications a
      ON CONFLICT (tenant_id, application_id, environment) DO NOTHING;
    `);

    const rlsTables = [
      'app_instances',
      'interfaces',
      'interface_bindings',
      'servers',
      'app_server_assignments',
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
    await queryRunner.query(`DROP TABLE IF EXISTS app_server_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_bindings`);
    await queryRunner.query(`DROP TABLE IF EXISTS interfaces`);
    await queryRunner.query(`DROP TABLE IF EXISTS servers`);
    await queryRunner.query(`DROP TABLE IF EXISTS app_instances`);
  }
}
