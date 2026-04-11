import { MigrationInterface, QueryRunner } from 'typeorm';

export class InterfaceMappings1845700000000 implements MigrationInterface {
  name = 'InterfaceMappings1845700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS interface_mapping_sets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        name text NOT NULL,
        description text NULL,
        is_default boolean NOT NULL DEFAULT false,
        revision_number int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_sets_interface
      ON interface_mapping_sets(tenant_id, interface_id, created_at)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_interface_mapping_sets_name
      ON interface_mapping_sets(tenant_id, interface_id, name)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_interface_mapping_sets_default
      ON interface_mapping_sets(tenant_id, interface_id)
      WHERE is_default = true
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_interface_mapping_sets_interface'
        ) THEN
          ALTER TABLE interface_mapping_sets
          ADD CONSTRAINT fk_interface_mapping_sets_interface
          FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS interface_mapping_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        mapping_set_id uuid NOT NULL,
        title text NOT NULL,
        description text NULL,
        order_index int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_groups_interface
      ON interface_mapping_groups(tenant_id, interface_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_groups_set_order
      ON interface_mapping_groups(tenant_id, mapping_set_id, order_index, created_at)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_interface_mapping_groups_interface'
        ) THEN
          ALTER TABLE interface_mapping_groups
          ADD CONSTRAINT fk_interface_mapping_groups_interface
          FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_interface_mapping_groups_set'
        ) THEN
          ALTER TABLE interface_mapping_groups
          ADD CONSTRAINT fk_interface_mapping_groups_set
          FOREIGN KEY (mapping_set_id) REFERENCES interface_mapping_sets(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS interface_mapping_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        interface_id uuid NOT NULL,
        mapping_set_id uuid NOT NULL,
        group_id uuid NULL,
        rule_key text NULL,
        title text NOT NULL,
        order_index int NOT NULL DEFAULT 0,
        applies_to_leg_id uuid NULL,
        operation_kind text NOT NULL DEFAULT 'direct',
        source_bindings jsonb NOT NULL DEFAULT '[]'::jsonb,
        target_bindings jsonb NOT NULL DEFAULT '[]'::jsonb,
        condition_text text NULL,
        business_rule_text text NULL,
        middleware_rule_text text NULL,
        remarks text NULL,
        example_input text NULL,
        example_output text NULL,
        implementation_status text NULL,
        test_status text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_rules_interface
      ON interface_mapping_rules(tenant_id, interface_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_rules_set_order
      ON interface_mapping_rules(tenant_id, mapping_set_id, order_index, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_rules_group_order
      ON interface_mapping_rules(tenant_id, group_id, order_index, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_rules_leg
      ON interface_mapping_rules(tenant_id, applies_to_leg_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_interface_mapping_rules_rule_key
      ON interface_mapping_rules(tenant_id, mapping_set_id, rule_key)
      WHERE rule_key IS NOT NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_interface_mapping_rules_interface'
        ) THEN
          ALTER TABLE interface_mapping_rules
          ADD CONSTRAINT fk_interface_mapping_rules_interface
          FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_interface_mapping_rules_set'
        ) THEN
          ALTER TABLE interface_mapping_rules
          ADD CONSTRAINT fk_interface_mapping_rules_set
          FOREIGN KEY (mapping_set_id) REFERENCES interface_mapping_sets(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_interface_mapping_rules_group'
        ) THEN
          ALTER TABLE interface_mapping_rules
          ADD CONSTRAINT fk_interface_mapping_rules_group
          FOREIGN KEY (group_id) REFERENCES interface_mapping_groups(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_interface_mapping_rules_leg'
        ) THEN
          ALTER TABLE interface_mapping_rules
          ADD CONSTRAINT fk_interface_mapping_rules_leg
          FOREIGN KEY (applies_to_leg_id) REFERENCES interface_legs(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      INSERT INTO interface_mapping_sets (tenant_id, interface_id, name, description, is_default, revision_number)
      SELECT i.tenant_id, i.id, 'Default', NULL, true, 1
      FROM interfaces i
      WHERE NOT EXISTS (
        SELECT 1
        FROM interface_mapping_sets sets
        WHERE sets.interface_id = i.id
      )
    `);

    const rlsTables = [
      'interface_mapping_sets',
      'interface_mapping_groups',
      'interface_mapping_rules',
    ];
    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = '${table}'
              AND policyname = '${table}_tenant_isolation'
          ) THEN
            DROP POLICY ${table}_tenant_isolation ON ${table};
          END IF;
        END $$;
      `);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS interface_mapping_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_mapping_groups`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_mapping_sets`);
  }
}
