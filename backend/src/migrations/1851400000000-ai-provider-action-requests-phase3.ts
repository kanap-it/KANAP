import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiProviderActionRequestsPhase31851400000000 implements MigrationInterface {
  name = 'AiProviderActionRequestsPhase31851400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ai_action_requests ADD COLUMN IF NOT EXISTS target_ref text`);
    await queryRunner.query(`ALTER TABLE ai_action_requests ADD COLUMN IF NOT EXISTS idempotency_key text`);
    await queryRunner.query(`ALTER TABLE ai_action_requests ADD COLUMN IF NOT EXISTS action_payload_json jsonb`);
    await queryRunner.query(`ALTER TABLE ai_action_requests ADD COLUMN IF NOT EXISTS provider_kind text`);
    await queryRunner.query(`ALTER TABLE ai_action_requests ADD COLUMN IF NOT EXISTS provider_key text`);
    await queryRunner.query(`ALTER TABLE ai_action_requests ADD COLUMN IF NOT EXISTS metadata_json jsonb`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_action_requests_tenant_capability_idempotency
      ON ai_action_requests(tenant_id, capability_name, idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_action_requests_tenant_capability_idempotency`);
    await queryRunner.query(`ALTER TABLE ai_action_requests DROP COLUMN IF EXISTS metadata_json`);
    await queryRunner.query(`ALTER TABLE ai_action_requests DROP COLUMN IF EXISTS provider_key`);
    await queryRunner.query(`ALTER TABLE ai_action_requests DROP COLUMN IF EXISTS provider_kind`);
    await queryRunner.query(`ALTER TABLE ai_action_requests DROP COLUMN IF EXISTS action_payload_json`);
    await queryRunner.query(`ALTER TABLE ai_action_requests DROP COLUMN IF EXISTS idempotency_key`);
    await queryRunner.query(`ALTER TABLE ai_action_requests DROP COLUMN IF EXISTS target_ref`);
  }
}
