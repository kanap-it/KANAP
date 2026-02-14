import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssetLifecycleDates1811000000000 implements MigrationInterface {
  name = 'AddAssetLifecycleDates1811000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE assets
        ADD COLUMN IF NOT EXISTS go_live_date date NULL,
        ADD COLUMN IF NOT EXISTS end_of_life_date date NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE assets
        DROP COLUMN IF EXISTS end_of_life_date,
        DROP COLUMN IF EXISTS go_live_date;
    `);
  }
}
