import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountryToTrialSignups1758900000000 implements MigrationInterface {
  name = 'AddCountryToTrialSignups1758900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE trial_signups ADD COLUMN IF NOT EXISTS country_iso char(2)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS trial_signups_country_idx ON trial_signups(country_iso)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS trial_signups_country_idx`);
    await queryRunner.query(
      `ALTER TABLE trial_signups DROP COLUMN IF EXISTS country_iso`,
    );
  }
}

