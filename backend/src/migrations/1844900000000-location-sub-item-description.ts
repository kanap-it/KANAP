import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationSubItemDescription1844900000000 implements MigrationInterface {
  name = 'LocationSubItemDescription1844900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE location_sub_items ADD COLUMN IF NOT EXISTS description text NULL;`);

    // Migrate datacenter → additional_info for on-prem locations
    await queryRunner.query(`
      UPDATE locations
      SET additional_info = datacenter, datacenter = NULL
      WHERE datacenter IS NOT NULL AND (additional_info IS NULL OR additional_info = '');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE location_sub_items DROP COLUMN IF EXISTS description;`);
  }
}
