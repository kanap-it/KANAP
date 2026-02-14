import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add subnet_cidr column to assets table
 *
 * Adds the subnet_cidr column to store the CIDR notation of the
 * subnet associated with an asset. This enables network/VLAN tracking.
 */
export class AddSubnetToAssets1782000000000 implements MigrationInterface {
  name = 'AddSubnetToAssets1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add subnet_cidr column to assets table
    await queryRunner.query(`
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS subnet_cidr text
    `);

    // Add index for subnet queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assets_subnet ON assets(tenant_id, subnet_cidr)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_subnet`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN IF EXISTS subnet_cidr`);
  }
}
