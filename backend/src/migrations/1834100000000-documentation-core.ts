import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentationCore1834100000000 implements MigrationInterface {
  name = 'DocumentationCore1834100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE document_folders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        parent_id uuid NULL,
        display_order int NOT NULL DEFAULT 0,
        description text NULL,
        created_by uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_folders_parent
          FOREIGN KEY (parent_id) REFERENCES document_folders(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_folders_created_by
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_document_folders_parent_name
      ON document_folders (
        tenant_id,
        coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
        lower(name)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_document_folders_tenant_parent
      ON document_folders (tenant_id, parent_id)
    `);

    await queryRunner.query(`
      CREATE TABLE document_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        description text NULL,
        template_content text NULL,
        is_active boolean NOT NULL DEFAULT true,
        display_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_document_types_tenant_name
      ON document_types (tenant_id, lower(name))
    `);

    await queryRunner.query(`
      CREATE TABLE documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        item_number int NOT NULL,
        title text NOT NULL,
        summary text NULL,
        content_markdown text NOT NULL DEFAULT '',
        content_plain text NOT NULL DEFAULT '',
        search_vector tsvector NULL,
        folder_id uuid NULL,
        document_type_id uuid NULL,
        status text NOT NULL DEFAULT 'draft',
        revision int NOT NULL DEFAULT 1,
        current_version_number int NOT NULL DEFAULT 0,
        published_at timestamptz NULL,
        last_reviewed_at timestamptz NULL,
        review_due_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_documents_status
          CHECK (status IN ('draft', 'in_review', 'published', 'archived', 'obsolete')),
        CONSTRAINT fk_documents_folder
          FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE SET NULL,
        CONSTRAINT fk_documents_type
          FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE SET NULL,
        CONSTRAINT fk_documents_created_by
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_documents_updated_by
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_documents_tenant_item_number ON documents (tenant_id, item_number)`);
    await queryRunner.query(`CREATE INDEX idx_documents_tenant_updated_at ON documents (tenant_id, updated_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_documents_tenant_status ON documents (tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_documents_tenant_folder ON documents (tenant_id, folder_id)`);
    await queryRunner.query(`CREATE INDEX idx_documents_tenant_document_type ON documents (tenant_id, document_type_id)`);
    await queryRunner.query(`CREATE INDEX idx_documents_search_vector ON documents USING GIN (search_vector)`);

    await queryRunner.query(`
      CREATE TABLE document_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        version_number int NOT NULL,
        title text NOT NULL,
        summary text NULL,
        content_markdown text NOT NULL,
        content_plain text NOT NULL,
        change_note text NULL,
        created_by uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_versions_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_versions_created_by
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_versions_document_version ON document_versions (document_id, version_number)`);
    await queryRunner.query(`CREATE INDEX idx_document_versions_tenant_document ON document_versions (tenant_id, document_id)`);

    await queryRunner.query(`
      CREATE TABLE document_edit_locks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        holder_user_id uuid NOT NULL,
        lock_token_hash text NOT NULL,
        acquired_at timestamptz NOT NULL DEFAULT now(),
        heartbeat_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        CONSTRAINT fk_document_edit_locks_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_edit_locks_holder
          FOREIGN KEY (holder_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_document_edit_locks_tenant_document ON document_edit_locks (tenant_id, document_id)`);

    await queryRunner.query(`
      CREATE TABLE document_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text NULL,
        size bigint NOT NULL,
        storage_path text NOT NULL,
        source_field text NULL,
        uploaded_by_id uuid NULL,
        uploaded_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_attachments_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_attachments_uploaded_by
          FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_document_attachments_tenant_document ON document_attachments (tenant_id, document_id)`);

    await queryRunner.query(`
      CREATE TABLE document_activities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        author_id uuid NULL,
        type text NOT NULL,
        content text NULL,
        changed_fields jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NULL,
        CONSTRAINT fk_document_activities_document
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_activities_author
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_document_activities_tenant_document ON document_activities (tenant_id, document_id)`);
    await queryRunner.query(`CREATE INDEX idx_document_activities_tenant_created_at ON document_activities (tenant_id, created_at DESC)`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION documents_search_vector_sync()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.content_plain, '')), 'B');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_documents_search_vector_sync
      BEFORE INSERT OR UPDATE OF title, content_plain
      ON documents
      FOR EACH ROW
      EXECUTE FUNCTION documents_search_vector_sync()
    `);

    await queryRunner.query(`
      UPDATE documents
      SET search_vector =
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(content_plain, '')), 'B')
    `);

    const tables = [
      'document_folders',
      'document_types',
      'documents',
      'document_versions',
      'document_edit_locks',
      'document_attachments',
      'document_activities',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
          USING (tenant_id = app_current_tenant())
          WITH CHECK (tenant_id = app_current_tenant())
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'document_activities',
      'document_attachments',
      'document_edit_locks',
      'document_versions',
      'documents',
      'document_types',
      'document_folders',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
    }

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_documents_search_vector_sync ON documents`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS documents_search_vector_sync`);

    await queryRunner.query(`DROP TABLE IF EXISTS document_activities`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_edit_locks`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_versions`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_folders`);
  }
}
