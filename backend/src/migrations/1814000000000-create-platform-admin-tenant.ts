import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePlatformAdminTenant1814000000000 implements MigrationInterface {
  name = 'CreatePlatformAdminTenant1814000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_system_tenant boolean DEFAULT FALSE`);
    await queryRunner.query(`
      INSERT INTO tenants (slug, name, status, is_system_tenant)
      SELECT 'platform-admin', 'Platform Administration', 'active', TRUE
      WHERE NOT EXISTS (
        SELECT 1 FROM tenants WHERE slug = 'platform-admin'
      )
    `);
    await queryRunner.query(`UPDATE tenants SET is_system_tenant = TRUE WHERE slug = 'platform-admin'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE tenants SET is_system_tenant = FALSE WHERE slug = 'platform-admin'`);
  }
}
