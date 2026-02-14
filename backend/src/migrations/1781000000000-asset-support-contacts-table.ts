import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create asset_support_contacts table
 *
 * Creates the junction table for multiple support contacts per asset.
 * Uses IF NOT EXISTS for idempotency in case it was created by an earlier migration.
 */
export class AssetSupportContactsTable1781000000000 implements MigrationInterface {
  name = 'AssetSupportContactsTable1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS asset_support_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        role text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_asset_support_contacts_tenant ON asset_support_contacts(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_asset_support_contacts_asset ON asset_support_contacts(tenant_id, asset_id)`);

    await queryRunner.query(`ALTER TABLE asset_support_contacts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_support_contacts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'asset_support_contacts' AND policyname = 'asset_support_contacts_tenant_isolation'
        ) THEN
          CREATE POLICY asset_support_contacts_tenant_isolation ON asset_support_contacts
          USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
          WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS asset_support_contacts`);
  }
}
