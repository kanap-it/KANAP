import { MigrationInterface, QueryRunner } from 'typeorm';

export class InterfaceKnowledgeRelations1851000000000 implements MigrationInterface {
  name = 'InterfaceKnowledgeRelations1851000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_interfaces (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        interface_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_interfaces_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_interfaces_interface FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_document_interfaces_pair
      ON document_interfaces (tenant_id, document_id, interface_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_interfaces_document
      ON document_interfaces (tenant_id, document_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_interfaces_interface
      ON document_interfaces (tenant_id, interface_id)
    `);
    await queryRunner.query(`ALTER TABLE document_interfaces ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE document_interfaces FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'document_interfaces'
            AND policyname = 'document_interfaces_tenant_isolation'
        ) THEN
          CREATE POLICY document_interfaces_tenant_isolation
            ON document_interfaces
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS document_interfaces_tenant_isolation ON document_interfaces`);
    await queryRunner.query(`ALTER TABLE document_interfaces DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_interfaces_interface`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_interfaces_document`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_document_interfaces_pair`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_interfaces`);
  }
}
