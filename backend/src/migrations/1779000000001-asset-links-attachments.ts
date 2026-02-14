import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add asset_links and asset_attachments tables
 *
 * NOTE: This migration is now a NO-OP.
 *
 * The asset_links and asset_attachments tables (along with their RLS policies)
 * are already created by the main migration 1779000000000-servers-to-assets.ts
 * (see Phase 3, sections 3.7 and 3.8).
 *
 * This migration file is kept to maintain migration history consistency across
 * environments where it may have already been recorded as pending.
 */
export class AssetLinksAttachments1779000000001 implements MigrationInterface {
  name = 'AssetLinksAttachments1779000000001';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: asset_links and asset_attachments are created by 1779000000000-servers-to-assets.ts
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: cleanup handled by 1779000000000-servers-to-assets.ts rollback
  }
}
