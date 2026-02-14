import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Fix connection_legs column renames
 *
 * The original servers-to-assets migration (1779000000000) forgot to rename
 * the source_server_id and destination_server_id columns in connection_legs table.
 *
 * This migration completes that work by:
 * 1. Renaming source_server_id → source_asset_id
 * 2. Renaming destination_server_id → destination_asset_id
 * 3. Renaming foreign key constraints accordingly
 */
export class FixConnectionLegsColumns1782000000000 implements MigrationInterface {
  name = 'FixConnectionLegsColumns1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing foreign key constraints (they reference old column names)
    await queryRunner.query(`
      ALTER TABLE connection_legs
      DROP CONSTRAINT IF EXISTS fk_connection_legs_source_server
    `);
    await queryRunner.query(`
      ALTER TABLE connection_legs
      DROP CONSTRAINT IF EXISTS fk_connection_legs_destination_server
    `);

    // Rename columns
    await queryRunner.query(`
      ALTER TABLE connection_legs
      RENAME COLUMN source_server_id TO source_asset_id
    `);
    await queryRunner.query(`
      ALTER TABLE connection_legs
      RENAME COLUMN destination_server_id TO destination_asset_id
    `);

    // Clean up orphaned references before adding FK constraints
    // (set to NULL since these columns are nullable per ON DELETE SET NULL)
    await queryRunner.query(`
      UPDATE connection_legs
      SET source_asset_id = NULL
      WHERE source_asset_id IS NOT NULL
        AND source_asset_id NOT IN (SELECT id FROM assets)
    `);
    await queryRunner.query(`
      UPDATE connection_legs
      SET destination_asset_id = NULL
      WHERE destination_asset_id IS NOT NULL
        AND destination_asset_id NOT IN (SELECT id FROM assets)
    `);

    // Recreate foreign key constraints with new names
    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT fk_connection_legs_source_asset
      FOREIGN KEY (source_asset_id) REFERENCES assets(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT fk_connection_legs_destination_asset
      FOREIGN KEY (destination_asset_id) REFERENCES assets(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new foreign key constraints
    await queryRunner.query(`
      ALTER TABLE connection_legs
      DROP CONSTRAINT IF EXISTS fk_connection_legs_source_asset
    `);
    await queryRunner.query(`
      ALTER TABLE connection_legs
      DROP CONSTRAINT IF EXISTS fk_connection_legs_destination_asset
    `);

    // Rename columns back
    await queryRunner.query(`
      ALTER TABLE connection_legs
      RENAME COLUMN source_asset_id TO source_server_id
    `);
    await queryRunner.query(`
      ALTER TABLE connection_legs
      RENAME COLUMN destination_asset_id TO destination_server_id
    `);

    // Recreate original foreign key constraints
    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT fk_connection_legs_source_server
      FOREIGN KEY (source_server_id) REFERENCES assets(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT fk_connection_legs_destination_server
      FOREIGN KEY (destination_server_id) REFERENCES assets(id) ON DELETE SET NULL
    `);
  }
}
