import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Make assets.provider column nullable
 *
 * The provider field was originally required, but since it's auto-derived
 * from location data during CSV import, it should be nullable to allow
 * imports without a known provider.
 */
export class MakeAssetProviderNullable1806000000000 implements MigrationInterface {
  name = 'MakeAssetProviderNullable1806000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make provider column nullable
    await queryRunner.query(`ALTER TABLE assets ALTER COLUMN provider DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // First, set any NULL values to 'unknown' so the constraint can be applied
    await queryRunner.query(`UPDATE assets SET provider = 'unknown' WHERE provider IS NULL`);

    // Restore NOT NULL constraint
    await queryRunner.query(`ALTER TABLE assets ALTER COLUMN provider SET NOT NULL`);
  }
}
