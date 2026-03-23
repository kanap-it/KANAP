import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiWebSearch1845000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_settings
      ADD COLUMN web_search_enabled boolean NOT NULL DEFAULT false
    `);

    // Backfill: existing rows with web_enrichment_enabled=true must also have web_search_enabled=true
    // to maintain the dependency invariant (enrichment requires search).
    await queryRunner.query(`
      UPDATE ai_settings SET web_search_enabled = web_enrichment_enabled
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_settings DROP COLUMN web_search_enabled
    `);
  }
}
