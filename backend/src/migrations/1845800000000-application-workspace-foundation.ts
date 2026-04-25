import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedManagedDocsKnowledgeAssets } from '../knowledge/integrated-document-seed';

function stripMarkdownishText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ApplicationWorkspaceFoundation1845800000000 implements MigrationInterface {
  name = 'ApplicationWorkspaceFoundation1845800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS sequential_id text
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_tenant_sequential_id
      ON applications (tenant_id, sequential_id)
      WHERE sequential_id IS NOT NULL
    `);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check
    `);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assign_application_sequential_id()
      RETURNS trigger AS $$
      DECLARE
        allocated_number integer;
      BEGIN
        IF NEW.sequential_id IS NULL OR btrim(NEW.sequential_id) = '' THEN
          INSERT INTO item_sequences (tenant_id, entity_type, next_val)
          VALUES (NEW.tenant_id, 'application', 2)
          ON CONFLICT (tenant_id, entity_type)
          DO UPDATE SET next_val = item_sequences.next_val + 1
          RETURNING next_val - 1 INTO allocated_number;

          NEW.sequential_id := 'APP-' || allocated_number::text;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_applications_sequential_id ON applications`);
    await queryRunner.query(`
      CREATE TRIGGER trg_applications_sequential_id
      BEFORE INSERT ON applications
      FOR EACH ROW
      EXECUTE FUNCTION assign_application_sequential_id()
    `);

    const tenants = await queryRunner.query(`
      SELECT id
      FROM tenants
      ORDER BY id
    `) as Array<{ id: string }>;

    for (const tenant of tenants) {
      await queryRunner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);

      await queryRunner.query(`
        WITH ordered AS (
          SELECT id,
                 row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
          FROM applications
          WHERE tenant_id = app_current_tenant()
            AND (sequential_id IS NULL OR sequential_id = '')
        )
        UPDATE applications a
        SET sequential_id = 'APP-' || ordered.rn::text
        FROM ordered
        WHERE a.id = ordered.id
          AND a.tenant_id = app_current_tenant()
      `);

      await queryRunner.query(`
        INSERT INTO item_sequences (tenant_id, entity_type, next_val)
        SELECT app_current_tenant(),
               'application',
               COALESCE(MAX(NULLIF(regexp_replace(sequential_id, '^APP-', ''), '')::int), 0) + 1
        FROM applications
        WHERE tenant_id = app_current_tenant()
          AND sequential_id ~ '^APP-[0-9]+$'
        ON CONFLICT (tenant_id, entity_type)
        DO UPDATE SET next_val = GREATEST(item_sequences.next_val, EXCLUDED.next_val)
      `);

      await seedManagedDocsKnowledgeAssets(queryRunner, tenant.id, {
        supportedSourceEntityTypes: ['applications'],
      });

      await queryRunner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);

      const slotRows = await queryRunner.query(`
        SELECT s.folder_id,
               f.library_id,
               s.document_type_id,
               s.template_document_id
        FROM integrated_document_slot_settings s
        JOIN document_folders f ON f.id = s.folder_id AND f.tenant_id = s.tenant_id
        WHERE s.tenant_id = app_current_tenant()
          AND s.source_entity_type = 'applications'
          AND s.slot_key = 'overview'
        LIMIT 1
      `) as Array<{
        folder_id: string;
        library_id: string;
        document_type_id: string;
        template_document_id: string | null;
      }>;
      const slot = slotRows[0];
      if (!slot) {
        throw new Error(`Application overview managed document slot missing for tenant ${tenant.id}`);
      }

      const apps = await queryRunner.query(`
        SELECT a.id::text AS id,
               a.sequential_id,
               a.name,
               a.description
        FROM applications a
        WHERE a.tenant_id = app_current_tenant()
          AND NULLIF(btrim(COALESCE(a.description, '')), '') IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM integrated_document_bindings b
            WHERE b.tenant_id = a.tenant_id
              AND b.source_entity_type = 'applications'
              AND b.source_entity_id = a.id
              AND b.slot_key = 'overview'
          )
        ORDER BY a.created_at ASC, a.id ASC
      `) as Array<{
        id: string;
        sequential_id: string | null;
        name: string;
        description: string | null;
      }>;

      for (const app of apps) {
        const itemRows = await queryRunner.query(
          `INSERT INTO item_sequences (tenant_id, entity_type, next_val)
           VALUES ($1, 'document', 2)
           ON CONFLICT (tenant_id, entity_type)
           DO UPDATE SET next_val = item_sequences.next_val + 1
           RETURNING next_val - 1 AS item_number`,
          [tenant.id],
        ) as Array<{ item_number: number }>;
        const content = String(app.description || '');
        const title = `${app.sequential_id || app.id} - ${app.name} - Overview`;
        const plain = stripMarkdownishText(content);
        const documentRows = await queryRunner.query(
          `INSERT INTO documents (
             tenant_id,
             item_number,
             title,
             summary,
             content_markdown,
             content_plain,
             folder_id,
             library_id,
             document_type_id,
             template_document_id,
             status,
             revision,
             current_version_number,
             published_at
           )
           VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, 'published', 1, 1, now())
           RETURNING id`,
          [
            tenant.id,
            Number(itemRows[0].item_number),
            title,
            content,
            plain,
            slot.folder_id,
            slot.library_id,
            slot.document_type_id,
            slot.template_document_id,
          ],
        ) as Array<{ id: string }>;
        const documentId = documentRows[0].id;

        await queryRunner.query(
          `INSERT INTO document_versions (
             tenant_id,
             document_id,
             version_number,
             title,
             summary,
             content_markdown,
             content_plain,
             change_note
           )
           VALUES ($1, $2, 1, $3, NULL, $4, $5, 'Imported from legacy application description')
           ON CONFLICT (document_id, version_number) DO NOTHING`,
          [tenant.id, documentId, title, content, plain],
        );

        await queryRunner.query(
          `INSERT INTO integrated_document_bindings (
             tenant_id,
             source_entity_type,
             source_entity_id,
             slot_key,
             document_id,
             hidden_from_entity_knowledge
           )
           VALUES ($1, 'applications', $2, 'overview', $3, true)
           ON CONFLICT (tenant_id, source_entity_type, source_entity_id, slot_key) DO NOTHING`,
          [tenant.id, app.id, documentId],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_applications_sequential_id ON applications`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS assign_application_sequential_id`);

    await queryRunner.query(`
      WITH overview_docs AS (
        SELECT document_id
        FROM integrated_document_bindings
        WHERE source_entity_type = 'applications'
          AND slot_key = 'overview'
      ),
      deleted_versions AS (
        DELETE FROM document_versions
        WHERE document_id IN (SELECT document_id FROM overview_docs)
      ),
      deleted_bindings AS (
        DELETE FROM integrated_document_bindings
        WHERE document_id IN (SELECT document_id FROM overview_docs)
      )
      DELETE FROM documents
      WHERE id IN (SELECT document_id FROM overview_docs)
    `);
    await queryRunner.query(`
      DELETE FROM integrated_document_slot_settings
      WHERE source_entity_type = 'applications'
        AND slot_key = 'overview'
    `);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM item_sequences WHERE entity_type = 'application'`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check
    `);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_applications_tenant_sequential_id`);
    await queryRunner.query(`
      ALTER TABLE applications
      DROP COLUMN IF EXISTS sequential_id
    `);
  }
}
