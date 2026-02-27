import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantBranding1829000000000 implements MigrationInterface {
  name = 'AddTenantBranding1829000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN branding jsonb NOT NULL DEFAULT '{"logo_version":0,"use_logo_in_dark":true}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN branding`);
  }
}
