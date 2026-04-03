import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiGlpiSettings1845500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_settings
      ADD COLUMN glpi_enabled boolean NOT NULL DEFAULT false,
      ADD COLUMN glpi_url text DEFAULT NULL,
      ADD COLUMN glpi_user_token_encrypted text DEFAULT NULL,
      ADD COLUMN glpi_app_token_encrypted text DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_settings
      DROP COLUMN IF EXISTS glpi_app_token_encrypted,
      DROP COLUMN IF EXISTS glpi_user_token_encrypted,
      DROP COLUMN IF EXISTS glpi_url,
      DROP COLUMN IF EXISTS glpi_enabled
    `);
  }
}
