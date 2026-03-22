import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLocale1844700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN locale VARCHAR(5) DEFAULT NULL;
      ALTER TABLE users ADD CONSTRAINT chk_user_locale
        CHECK (locale IS NULL OR locale IN ('en', 'fr', 'de', 'es'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_user_locale;
      ALTER TABLE users DROP COLUMN IF EXISTS locale;
    `);
  }
}
