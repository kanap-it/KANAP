import { MigrationInterface, QueryRunner } from 'typeorm';

export class OpexLinksAttachments1758911000000 implements MigrationInterface {
  name = 'OpexLinksAttachments1758911000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spend_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        spend_item_id uuid NOT NULL,
        description text NULL,
        url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_links_item ON spend_links(spend_item_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_links_tenant ON spend_links(tenant_id)`);
    await queryRunner.query(`ALTER TABLE spend_links ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE spend_links FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' AND tablename = 'spend_links' AND policyname = 'spend_links_tenant_isolation'
        ) THEN
          DROP POLICY spend_links_tenant_isolation ON spend_links;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      CREATE POLICY spend_links_tenant_isolation ON spend_links
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant());
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spend_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        spend_item_id uuid NOT NULL,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text NULL,
        size int NOT NULL DEFAULT 0,
        storage_path text NOT NULL,
        uploaded_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_attachments_item ON spend_attachments(spend_item_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_spend_attachments_tenant ON spend_attachments(tenant_id)`);
    await queryRunner.query(`ALTER TABLE spend_attachments ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE spend_attachments FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' AND tablename = 'spend_attachments' AND policyname = 'spend_attachments_tenant_isolation'
        ) THEN
          DROP POLICY spend_attachments_tenant_isolation ON spend_attachments;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      CREATE POLICY spend_attachments_tenant_isolation ON spend_attachments
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant());
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS spend_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS spend_links`);
  }
}

