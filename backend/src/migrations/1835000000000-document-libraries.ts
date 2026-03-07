import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentLibraries1835000000000 implements MigrationInterface {
  name = 'DocumentLibraries1835000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE document_libraries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        slug text NOT NULL,
        is_system boolean NOT NULL DEFAULT false,
        display_order int NOT NULL DEFAULT 0,
        created_by uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_libraries_created_by
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_document_libraries_tenant_slug
      ON document_libraries (tenant_id, slug)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_document_libraries_tenant_display_order
      ON document_libraries (tenant_id, display_order)
    `);

    await queryRunner.query(`ALTER TABLE document_libraries ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE document_libraries FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY document_libraries_tenant_isolation ON document_libraries
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant())
    `);

    await queryRunner.query(`ALTER TABLE documents ADD COLUMN library_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE document_folders ADD COLUMN library_id uuid NULL`);

    await queryRunner.query(`
      ALTER TABLE documents
      ADD CONSTRAINT fk_documents_library
      FOREIGN KEY (library_id) REFERENCES document_libraries(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE document_folders
      ADD CONSTRAINT fk_document_folders_library
      FOREIGN KEY (library_id) REFERENCES document_libraries(id) ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        t record;
        docs_library_id uuid;
      BEGIN
        FOR t IN SELECT id FROM tenants LOOP
          PERFORM set_config('app.current_tenant', t.id::text, true);

          INSERT INTO document_libraries (tenant_id, name, slug, is_system, display_order)
          VALUES
            (t.id, 'Documents', 'documents', false, 0),
            (t.id, 'Templates', 'templates', true, 1)
          ON CONFLICT (tenant_id, slug) DO NOTHING;

          SELECT id
            INTO docs_library_id
          FROM document_libraries
          WHERE tenant_id = t.id
            AND slug = 'documents'
          LIMIT 1;

          UPDATE documents
          SET library_id = docs_library_id
          WHERE tenant_id = t.id
            AND library_id IS NULL;

          UPDATE document_folders
          SET library_id = docs_library_id
          WHERE tenant_id = t.id
            AND library_id IS NULL;
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE documents ALTER COLUMN library_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE document_folders ALTER COLUMN library_id SET NOT NULL`);

    await queryRunner.query(`CREATE INDEX idx_documents_tenant_library ON documents (tenant_id, library_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_folders_tenant_library ON document_folders (tenant_id, library_id)`);

    await queryRunner.query(`ALTER TABLE documents ADD COLUMN template_document_id uuid NULL`);
    await queryRunner.query(`
      ALTER TABLE documents
      ADD CONSTRAINT fk_documents_template_document
      FOREIGN KEY (template_document_id) REFERENCES documents(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_document_folders_parent_name`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_document_folders_library_parent_name
      ON document_folders (
        tenant_id,
        library_id,
        coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
        lower(name)
      )
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN documents.document_type_id IS 'DEPRECATED: replaced by template_document_id + library system'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`COMMENT ON COLUMN documents.document_type_id IS NULL`);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_document_folders_library_parent_name`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_document_folders_parent_name
      ON document_folders (
        tenant_id,
        coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
        lower(name)
      )
    `);

    await queryRunner.query(`ALTER TABLE documents DROP CONSTRAINT IF EXISTS fk_documents_template_document`);
    await queryRunner.query(`ALTER TABLE documents DROP COLUMN IF EXISTS template_document_id`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_documents_tenant_library`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_folders_tenant_library`);

    await queryRunner.query(`ALTER TABLE documents DROP CONSTRAINT IF EXISTS fk_documents_library`);
    await queryRunner.query(`ALTER TABLE document_folders DROP CONSTRAINT IF EXISTS fk_document_folders_library`);

    await queryRunner.query(`ALTER TABLE documents DROP COLUMN IF EXISTS library_id`);
    await queryRunner.query(`ALTER TABLE document_folders DROP COLUMN IF EXISTS library_id`);

    await queryRunner.query(`DROP POLICY IF EXISTS document_libraries_tenant_isolation ON document_libraries`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_libraries`);
  }
}
