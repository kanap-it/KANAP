import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Asset Panel Updates
 *
 * 1. Add notes column to asset_hardware_info
 * 2. Drop escalation_contact from asset_support_info (replaced by asset_support_contacts table)
 *
 * Note: asset_support_contacts table is created in:
 * - 1779000000000 (fresh databases)
 * - 1781000000000 (existing databases where this migration already ran)
 */
export class AssetPanelUpdates1779000000002 implements MigrationInterface {
  name = 'AssetPanelUpdates1779000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add notes column to asset_hardware_info
    await queryRunner.query(`
      ALTER TABLE asset_hardware_info
      ADD COLUMN IF NOT EXISTS notes text
    `);

    // Drop escalation_contact from asset_support_info
    await queryRunner.query(`
      ALTER TABLE asset_support_info
      DROP COLUMN IF EXISTS escalation_contact
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the old column
    await queryRunner.query(`
      ALTER TABLE asset_support_info
      ADD COLUMN IF NOT EXISTS escalation_contact text
    `);

    // Drop notes column from asset_hardware_info
    await queryRunner.query(`
      ALTER TABLE asset_hardware_info
      DROP COLUMN IF EXISTS notes
    `);
  }
}
