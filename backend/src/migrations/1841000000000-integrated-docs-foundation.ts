import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedManagedDocsKnowledgeAssets } from '../knowledge/integrated-document-seed';

export class IntegratedDocsFoundation1841000000000 implements MigrationInterface {
  name = 'IntegratedDocsFoundation1841000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE document_folders
      ADD COLUMN IF NOT EXISTS system_key text
    `);
    await queryRunner.query(`
      ALTER TABLE document_types
      ADD COLUMN IF NOT EXISTS system_key text
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_document_folders_tenant_library_system_key
      ON document_folders (tenant_id, library_id, system_key)
      WHERE system_key IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_document_types_tenant_system_key
      ON document_types (tenant_id, system_key)
      WHERE system_key IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integrated_document_bindings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        source_entity_type text NOT NULL,
        source_entity_id uuid NOT NULL,
        slot_key text NOT NULL,
        document_id uuid NOT NULL,
        hidden_from_entity_knowledge boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_integrated_document_bindings_entity_type
          CHECK (source_entity_type IN ('requests', 'projects', 'applications', 'assets')),
        CONSTRAINT fk_integrated_document_bindings_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_integrated_document_bindings_slot
      ON integrated_document_bindings (tenant_id, source_entity_type, source_entity_id, slot_key)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_integrated_document_bindings_document
      ON integrated_document_bindings (document_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrated_document_bindings_tenant_entity
      ON integrated_document_bindings (tenant_id, source_entity_type, source_entity_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrated_document_bindings_tenant_slot
      ON integrated_document_bindings (tenant_id, source_entity_type, slot_key)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integrated_document_slot_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        source_entity_type text NOT NULL,
        slot_key text NOT NULL,
        display_name text NOT NULL,
        folder_id uuid NOT NULL,
        document_type_id uuid NOT NULL,
        template_document_id uuid NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_integrated_document_slot_settings_entity_type
          CHECK (source_entity_type IN ('requests', 'projects', 'applications', 'assets')),
        CONSTRAINT fk_integrated_document_slot_settings_folder
          FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE RESTRICT,
        CONSTRAINT fk_integrated_document_slot_settings_document_type
          FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE RESTRICT,
        CONSTRAINT fk_integrated_document_slot_settings_template_document
          FOREIGN KEY (template_document_id) REFERENCES documents(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_integrated_document_slot_settings_slot
      ON integrated_document_slot_settings (tenant_id, source_entity_type, slot_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrated_document_slot_settings_tenant_entity
      ON integrated_document_slot_settings (tenant_id, source_entity_type)
    `);

    for (const table of ['integrated_document_bindings', 'integrated_document_slot_settings']) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'integrated_document_bindings'
            AND policyname = 'integrated_document_bindings_tenant_isolation'
        ) THEN
          CREATE POLICY integrated_document_bindings_tenant_isolation
          ON integrated_document_bindings
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'integrated_document_slot_settings'
            AND policyname = 'integrated_document_slot_settings_tenant_isolation'
        ) THEN
          CREATE POLICY integrated_document_slot_settings_tenant_isolation
          ON integrated_document_slot_settings
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    const tenants: Array<{ id: string }> = await queryRunner.query(`
      SELECT id
      FROM tenants
      ORDER BY id
    `);

    for (const tenant of tenants) {
      await seedManagedDocsKnowledgeAssets(queryRunner, tenant.id);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS integrated_document_bindings_tenant_isolation
      ON integrated_document_bindings
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS integrated_document_slot_settings_tenant_isolation
      ON integrated_document_slot_settings
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS integrated_document_bindings`);
    await queryRunner.query(`DROP TABLE IF EXISTS integrated_document_slot_settings`);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_document_folders_tenant_library_system_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_document_types_tenant_system_key`);

    await queryRunner.query(`
      ALTER TABLE document_folders
      DROP COLUMN IF EXISTS system_key
    `);
    await queryRunner.query(`
      ALTER TABLE document_types
      DROP COLUMN IF EXISTS system_key
    `);
  }
}
