import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConnectionKnowledgeIntegration1850200000000 implements MigrationInterface {
  name = 'ConnectionKnowledgeIntegration1850200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_bindings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      ADD CONSTRAINT chk_integrated_document_bindings_entity_type
      CHECK (source_entity_type IN ('requests', 'projects', 'interfaces', 'applications', 'assets', 'locations', 'connections'))
    `);

    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_slot_settings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      ADD CONSTRAINT chk_integrated_document_slot_settings_entity_type
      CHECK (source_entity_type IN ('requests', 'projects', 'interfaces', 'applications', 'assets', 'locations', 'connections'))
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_connections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        connection_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_connections_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_connections_connection FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_document_connections_pair
      ON document_connections (tenant_id, document_id, connection_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_connections_document
      ON document_connections (tenant_id, document_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_connections_connection
      ON document_connections (tenant_id, connection_id)
    `);
    await queryRunner.query(`ALTER TABLE document_connections ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE document_connections FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'document_connections'
            AND policyname = 'document_connections_tenant_isolation'
        ) THEN
          CREATE POLICY document_connections_tenant_isolation
            ON document_connections
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS document_connections_tenant_isolation ON document_connections`);
    await queryRunner.query(`ALTER TABLE document_connections DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_connections_connection`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_connections_document`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_document_connections_pair`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_connections`);

    await queryRunner.query(`
      DELETE FROM integrated_document_bindings
      WHERE source_entity_type = 'connections'
    `);
    await queryRunner.query(`
      DELETE FROM integrated_document_slot_settings
      WHERE source_entity_type = 'connections'
    `);

    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_bindings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      ADD CONSTRAINT chk_integrated_document_bindings_entity_type
      CHECK (source_entity_type IN ('requests', 'projects', 'interfaces', 'applications', 'assets', 'locations'))
    `);

    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_slot_settings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      ADD CONSTRAINT chk_integrated_document_slot_settings_entity_type
      CHECK (source_entity_type IN ('requests', 'projects', 'interfaces', 'applications', 'assets', 'locations'))
    `);
  }
}
