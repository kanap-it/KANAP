import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedManagedDocsKnowledgeAssets } from '../knowledge/integrated-document-seed';

export class InterfaceIntegratedDocs1845600000000 implements MigrationInterface {
  name = 'InterfaceIntegratedDocs1845600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      DELETE FROM integrated_document_bindings
      WHERE source_entity_type = 'interfaces'
    `);
    await queryRunner.query(`
      DELETE FROM integrated_document_slot_settings
      WHERE source_entity_type = 'interfaces'
    `);

    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_bindings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      ADD CONSTRAINT chk_integrated_document_bindings_entity_type
      CHECK (source_entity_type IN ('requests', 'projects', 'applications', 'assets'))
    `);

    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_slot_settings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      ADD CONSTRAINT chk_integrated_document_slot_settings_entity_type
      CHECK (source_entity_type IN ('requests', 'projects', 'applications', 'assets'))
    `);
  }
}
