import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiMessageProviderMetadata1850500000000 implements MigrationInterface {
  name = 'AiMessageProviderMetadata1850500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_messages
      ADD COLUMN IF NOT EXISTS provider_metadata_json jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_messages
      DROP COLUMN IF EXISTS provider_metadata_json
    `);
  }
}
