import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeLibraryAccess1845400000000 implements MigrationInterface {
  name = 'KnowledgeLibraryAccess1845400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE document_libraries
      ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'default'
    `);
    await queryRunner.query(`
      ALTER TABLE document_libraries
      ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL
    `);
    await queryRunner.query(`
      UPDATE document_libraries
      SET owner_user_id = created_by
      WHERE owner_user_id IS NULL
        AND created_by IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_libraries_tenant_owner
      ON document_libraries (tenant_id, owner_user_id)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_library_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        library_id uuid NOT NULL REFERENCES document_libraries(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_level text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_document_library_members_access_level
          CHECK (access_level IN ('reader', 'writer'))
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_document_library_members_tenant_library_user
      ON document_library_members (tenant_id, library_id, user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_library_members_tenant_library
      ON document_library_members (tenant_id, library_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_library_members_tenant_user
      ON document_library_members (tenant_id, user_id)
    `);

    await queryRunner.query(`ALTER TABLE document_library_members ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE document_library_members FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'document_library_members'
            AND policyname = 'document_library_members_tenant_isolation'
        ) THEN
          CREATE POLICY document_library_members_tenant_isolation ON document_library_members
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS document_library_members_tenant_isolation ON document_library_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_library_members`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_libraries_tenant_owner`);
    await queryRunner.query(`ALTER TABLE document_libraries DROP COLUMN IF EXISTS owner_user_id`);
    await queryRunner.query(`ALTER TABLE document_libraries DROP COLUMN IF EXISTS access_mode`);
  }
}
