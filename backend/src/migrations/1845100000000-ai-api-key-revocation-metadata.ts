import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiApiKeyRevocationMetadata1845100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD COLUMN IF NOT EXISTS revoked_by_user_id uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD COLUMN IF NOT EXISTS revocation_reason text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      DROP COLUMN IF EXISTS revocation_reason
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      DROP COLUMN IF EXISTS revoked_by_user_id
    `);
  }
}
