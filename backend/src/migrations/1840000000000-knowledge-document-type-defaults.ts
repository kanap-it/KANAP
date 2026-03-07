import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeDocumentTypeDefaults1840000000000 implements MigrationInterface {
  name = 'KnowledgeDocumentTypeDefaults1840000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE document_types
      ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE document_types
      ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false
    `);

    const tenants: Array<{ id: string }> = await queryRunner.query(`
      SELECT id
      FROM tenants
      ORDER BY id
    `);

    for (const tenant of tenants) {
      await queryRunner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);

      await queryRunner.query(`
        WITH ranked AS (
          SELECT id,
                 row_number() OVER (
                   ORDER BY display_order ASC, created_at ASC, id ASC
                 ) AS rn
          FROM document_types
          WHERE lower(name) = 'document'
        )
        UPDATE document_types dt
        SET is_system = true,
            is_default = true,
            is_active = true,
            updated_at = now()
        FROM ranked r
        WHERE dt.id = r.id
          AND r.rn = 1
      `);

      await queryRunner.query(`
        INSERT INTO document_types (
          tenant_id,
          name,
          description,
          template_content,
          is_active,
          is_system,
          is_default,
          display_order,
          created_at,
          updated_at
        )
        SELECT app_current_tenant(),
               'Document',
               'Default fallback document type',
               NULL,
               true,
               true,
               true,
               0,
               now(),
               now()
        WHERE NOT EXISTS (
          SELECT 1
          FROM document_types
          WHERE is_default = true
        )
      `);

      await queryRunner.query(`
        UPDATE document_types
        SET is_system = false,
            is_default = false
        WHERE id NOT IN (
          SELECT id
          FROM document_types
          WHERE is_default = true
        )
      `);

      await queryRunner.query(`
        UPDATE documents d
        SET document_type_id = dt.id
        FROM document_types dt
        WHERE d.document_type_id IS NULL
          AND dt.tenant_id = d.tenant_id
          AND dt.is_default = true
          AND EXISTS (
            SELECT 1
            FROM document_libraries l
            WHERE l.id = d.library_id
              AND l.tenant_id = d.tenant_id
              AND l.slug = 'templates'
          )
      `);

      await queryRunner.query(`
        UPDATE documents d
        SET document_type_id = td.document_type_id
        FROM documents td
        WHERE d.document_type_id IS NULL
          AND d.template_document_id = td.id
          AND d.tenant_id = td.tenant_id
          AND td.document_type_id IS NOT NULL
      `);

      await queryRunner.query(`
        UPDATE documents d
        SET document_type_id = dt.id
        FROM document_types dt
        WHERE d.document_type_id IS NULL
          AND dt.tenant_id = d.tenant_id
          AND dt.is_default = true
      `);
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_document_types_tenant_default
      ON document_types (tenant_id)
      WHERE is_default = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_document_types_tenant_default`);
    await queryRunner.query(`ALTER TABLE document_types DROP COLUMN IF EXISTS is_default`);
    await queryRunner.query(`ALTER TABLE document_types DROP COLUMN IF EXISTS is_system`);
  }
}
