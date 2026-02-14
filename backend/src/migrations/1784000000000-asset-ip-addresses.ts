import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssetIpAddresses1784000000000 implements MigrationInterface {
  name = 'AssetIpAddresses1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new ip_addresses JSONB column
    await queryRunner.query(`ALTER TABLE assets ADD COLUMN ip_addresses jsonb`);

    // Migrate existing ip + subnet_cidr data to new format
    // Use 'host' as the default type code
    await queryRunner.query(`
      UPDATE assets
      SET ip_addresses = jsonb_build_array(
        jsonb_build_object(
          'type', 'host',
          'ip', ip,
          'subnet_cidr', subnet_cidr
        )
      )
      WHERE ip IS NOT NULL AND ip <> ''
    `);

    // Create GIN index for efficient JSONB searching
    await queryRunner.query(`CREATE INDEX idx_assets_ip_addresses ON assets USING GIN (ip_addresses)`);

    // Drop the old columns
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN ip`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN subnet_cidr`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN network_segment`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the old columns
    await queryRunner.query(`ALTER TABLE assets ADD COLUMN ip text`);
    await queryRunner.query(`ALTER TABLE assets ADD COLUMN subnet_cidr text`);
    await queryRunner.query(`ALTER TABLE assets ADD COLUMN network_segment text`);

    // Migrate data back (take first IP from array)
    await queryRunner.query(`
      UPDATE assets
      SET
        ip = (ip_addresses->0->>'ip'),
        subnet_cidr = (ip_addresses->0->>'subnet_cidr')
      WHERE ip_addresses IS NOT NULL AND jsonb_array_length(ip_addresses) > 0
    `);

    // Drop index and new column
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_ip_addresses`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN ip_addresses`);
  }
}
