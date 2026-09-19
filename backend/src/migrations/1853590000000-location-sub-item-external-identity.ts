import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * External identity on location_sub_items.
 *
 * A Netbox Location imported as a KANAP sub-location needs an identity that
 * survives a rename on either side, which name matching cannot give. Three
 * nullable columns carry it; every sub-location created by hand keeps them
 * NULL and behaves exactly as before.
 *
 * The unique index includes location_id on purpose. The identity belongs to
 * the sub-location *inside a KANAP location*: when a Netbox site is remapped to
 * another KANAP location, a new sub-location is created under the new one and
 * the old one stays where it is, still used by the assets that already carry
 * it. Moving it would silently move those assets too.
 *
 * No backfill, so nothing needs RLS lifted around this migration, and no new
 * policy: location_sub_items is already ENABLE + FORCE row level security.
 */
export class LocationSubItemExternalIdentity1853590000000 implements MigrationInterface {
  name = 'LocationSubItemExternalIdentity1853590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE location_sub_items ADD COLUMN IF NOT EXISTS external_source text`);
    await queryRunner.query(`ALTER TABLE location_sub_items ADD COLUMN IF NOT EXISTS external_id text`);
    await queryRunner.query(`ALTER TABLE location_sub_items ADD COLUMN IF NOT EXISTS external_url text`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_location_sub_items_external
      ON location_sub_items (tenant_id, location_id, external_source, external_id)
      WHERE external_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_sub_items_external`);
    await queryRunner.query(`ALTER TABLE location_sub_items DROP COLUMN IF EXISTS external_url`);
    await queryRunner.query(`ALTER TABLE location_sub_items DROP COLUMN IF EXISTS external_id`);
    await queryRunner.query(`ALTER TABLE location_sub_items DROP COLUMN IF EXISTS external_source`);
  }
}
