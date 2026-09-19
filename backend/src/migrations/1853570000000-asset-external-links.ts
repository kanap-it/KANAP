import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * asset_external_links: one row per object an external inventory holds in scope,
 * linked to a KANAP asset or not yet (Netbox first, PRTG / vCenter / GLPI later).
 *
 * The row survives a rename on either side, which lower(name) matching cannot,
 * and carries the review state a human still has to settle (ambiguous match,
 * object no longer in the inventory, object deliberately ignored, failed write).
 *
 * asset_id is nullable and ON DELETE SET NULL: deleting an asset in KANAP must
 * never delete the inventory row, it just unlinks it so the next run can offer
 * it again.
 *
 * The message is stored as a code plus parameters, never as a sentence: the
 * pages run in four languages and translate by code.
 */
export class AssetExternalLinks1853570000000 implements MigrationInterface {
  name = 'AssetExternalLinks1853570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS asset_external_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        source text NOT NULL,
        external_type text NOT NULL,
        external_id text NOT NULL,
        external_name text,
        external_url text,
        asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
        state text NOT NULL DEFAULT 'linked',
        candidate_asset_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
        message_code text,
        message_params jsonb,
        last_seen_at timestamptz,
        last_synced_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT asset_external_links_state_check
          CHECK (state IN ('linked', 'ambiguous', 'missing', 'ignored', 'error'))
      )
    `);

    // Netbox device ids and virtual-machine ids are separate sequences and do
    // overlap, so external_type is part of the identity.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_external_links_identity
      ON asset_external_links (tenant_id, source, external_type, external_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_external_links_tenant_asset
      ON asset_external_links (tenant_id, asset_id)
    `);
    // One asset is owned by at most one live external object. The application
    // already refuses to plan a second owner; this makes it impossible.
    // Records that are missing, ignored, ambiguous or in error do not own
    // their asset, so they are outside the index.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_external_links_one_live_per_asset
      ON asset_external_links (tenant_id, source, asset_id)
      WHERE state = 'linked' AND asset_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_external_links_tenant_source_state
      ON asset_external_links (tenant_id, source, state)
    `);

    await queryRunner.query(`ALTER TABLE asset_external_links ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_external_links FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DROP POLICY IF EXISTS asset_external_links_tenant_isolation ON asset_external_links
    `);
    await queryRunner.query(`
      CREATE POLICY asset_external_links_tenant_isolation ON asset_external_links
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS asset_external_links_tenant_isolation ON asset_external_links
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_external_links`);
  }
}
