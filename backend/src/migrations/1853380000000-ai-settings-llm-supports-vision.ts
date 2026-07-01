import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiSettingsLlmSupportsVision1853380000000 implements MigrationInterface {
  name = 'AiSettingsLlmSupportsVision1853380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // "Multimodal LLM" tenant setting: whether the default LLM (shared with Plaid chat) may be
    // sent ticket screenshots for evidence extraction. Default TRUE ("multimodal by default");
    // operators turn it off in the admin GUI for a known text-only model. DEFAULT true backfills
    // every existing row, so no separate UPDATE is required.
    await queryRunner.query(`
      ALTER TABLE ai_settings
      ADD COLUMN IF NOT EXISTS llm_supports_vision boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_settings DROP COLUMN IF EXISTS llm_supports_vision
    `);
  }
}
