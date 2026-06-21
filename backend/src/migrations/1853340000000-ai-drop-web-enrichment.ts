import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiDropWebEnrichment1853340000000 implements MigrationInterface {
  name = 'AiDropWebEnrichment1853340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // web_enrichment_enabled was a stored/displayed toggle that nothing ever read to gate
    // behaviour — web search is gated entirely by web_search_enabled. Drop the dead column.
    await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS web_enrichment_enabled`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_settings
      ADD COLUMN IF NOT EXISTS web_enrichment_enabled boolean NOT NULL DEFAULT false
    `);
  }
}
