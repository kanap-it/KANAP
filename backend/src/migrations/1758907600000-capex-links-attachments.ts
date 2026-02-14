import { MigrationInterface, QueryRunner } from 'typeorm';

export class CapexLinksAttachments1758907600000 implements MigrationInterface {
  name = 'CapexLinksAttachments1758907600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS capex_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        capex_item_id uuid NOT NULL,
        description text NULL,
        url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_links_capex ON capex_links(capex_item_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_links_tenant ON capex_links(tenant_id)`);
    await queryRunner.query(`ALTER TABLE capex_links ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_links FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' AND tablename = 'capex_links' AND policyname = 'capex_links_tenant_isolation'
        ) THEN
          DROP POLICY capex_links_tenant_isolation ON capex_links;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      CREATE POLICY capex_links_tenant_isolation ON capex_links
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant());
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS capex_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        capex_item_id uuid NOT NULL,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text NULL,
        size int NOT NULL DEFAULT 0,
        storage_path text NOT NULL,
        uploaded_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_attachments_capex ON capex_attachments(capex_item_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_attachments_tenant ON capex_attachments(tenant_id)`);
    await queryRunner.query(`ALTER TABLE capex_attachments ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_attachments FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' AND tablename = 'capex_attachments' AND policyname = 'capex_attachments_tenant_isolation'
        ) THEN
          DROP POLICY capex_attachments_tenant_isolation ON capex_attachments;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      CREATE POLICY capex_attachments_tenant_isolation ON capex_attachments
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant());
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS capex_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS capex_links`);
  }
}

