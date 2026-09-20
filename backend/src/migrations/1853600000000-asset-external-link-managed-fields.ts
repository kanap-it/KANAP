import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The fields Netbox provides, per linked object.
 *
 * An asset fed by Netbox locks the fields the inventory owns. Which fields
 * those are is not the same for every object: Netbox has no domain notion, a
 * device often has no platform and sometimes no primary address. Locking the
 * whole list left those fields empty AND read-only, so nobody could fill them
 * in. Nothing on the link row or on the asset can carry that per-object
 * information today, hence one nullable column.
 *
 * NULL means "not known yet": a row written by an older build, or one not
 * synchronised since. The reader falls back to the previous behaviour for it,
 * and the next run fills the list in, so no backfill is needed. With no
 * backfill nothing has to lift RLS around this migration, and no new policy is
 * required: asset_external_links is already ENABLE + FORCE row level security.
 */
export class AssetExternalLinkManagedFields1853600000000 implements MigrationInterface {
  name = 'AssetExternalLinkManagedFields1853600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE asset_external_links ADD COLUMN IF NOT EXISTS managed_fields text[]`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE asset_external_links DROP COLUMN IF EXISTS managed_fields`);
  }
}
