import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationKnowledgeIntegration1846210000000 implements MigrationInterface {
  name = 'LocationKnowledgeIntegration1846210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        document_id uuid NOT NULL,
        location_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_locations_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_locations_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_document_locations_pair
      ON document_locations (tenant_id, document_id, location_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_locations_document
      ON document_locations (tenant_id, document_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_locations_location
      ON document_locations (tenant_id, location_id)
    `);
    await queryRunner.query(`ALTER TABLE document_locations ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE document_locations FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'document_locations'
            AND policyname = 'document_locations_tenant_isolation'
        ) THEN
          CREATE POLICY document_locations_tenant_isolation
            ON document_locations
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS document_locations_tenant_isolation ON document_locations`);
    await queryRunner.query(`ALTER TABLE document_locations DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_locations_location`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_locations_document`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_document_locations_pair`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_locations`);

    await queryRunner.query(`
      DELETE FROM integrated_document_bindings
      WHERE source_entity_type = 'locations'
    `);
    await queryRunner.query(`
      DELETE FROM integrated_document_slot_settings
      WHERE source_entity_type = 'locations'
    `);

    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_bindings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      ADD CONSTRAINT chk_integrated_document_bindings_entity_type
      CHECK (source_entity_type IN ('requests', 'projects', 'interfaces', 'applications', 'assets'))
    `);

    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_slot_settings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      ADD CONSTRAINT chk_integrated_document_slot_settings_entity_type
      CHECK (source_entity_type IN ('requests', 'projects', 'interfaces', 'applications', 'assets'))
    `);
  }
}
