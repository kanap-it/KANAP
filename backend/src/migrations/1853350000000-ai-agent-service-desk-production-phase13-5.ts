import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiAgentServiceDeskProductionPhase1351853350000000 implements MigrationInterface {
  name = 'AiAgentServiceDeskProductionPhase1351853350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      ADD COLUMN IF NOT EXISTS agent_priority int NOT NULL DEFAULT 100
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      DROP CONSTRAINT IF EXISTS chk_ai_agent_definitions_agent_priority
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      ADD CONSTRAINT chk_ai_agent_definitions_agent_priority CHECK (agent_priority >= 0 AND agent_priority <= 1000)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_definitions_tenant_priority
      ON ai_agent_definitions(tenant_id, agent_priority DESC, agent_key)
    `);

    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS next_review_at timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS claim_status text NOT NULL DEFAULT 'none'
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS claim_acquired_at timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS claim_owner_work_item_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS claim_owner_run_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS claim_owner_priority int
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS claim_owner_action_request_ids jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD COLUMN IF NOT EXISTS claim_metadata_json jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      DROP CONSTRAINT IF EXISTS chk_ai_agent_target_states_claim_status
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD CONSTRAINT chk_ai_agent_target_states_claim_status CHECK (claim_status IN ('none', 'claimed'))
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      DROP CONSTRAINT IF EXISTS chk_ai_agent_target_states_claim_owner_priority
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD CONSTRAINT chk_ai_agent_target_states_claim_owner_priority CHECK (
        claim_owner_priority IS NULL OR (claim_owner_priority >= 0 AND claim_owner_priority <= 1000)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      DROP CONSTRAINT IF EXISTS chk_ai_agent_target_states_claim_action_ids_array
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_target_states
      ADD CONSTRAINT chk_ai_agent_target_states_claim_action_ids_array CHECK (
        claim_owner_action_request_ids IS NULL OR jsonb_typeof(claim_owner_action_request_ids) = 'array'
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_target_states_tenant_agent_next_review
      ON ai_agent_target_states(tenant_id, agent_definition_id, next_review_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_target_states_tenant_claim_expiry
      ON ai_agent_target_states(tenant_id, claim_status, claim_expires_at)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_agent_target_states_active_claim
      ON ai_agent_target_states(tenant_id, provider_kind, provider_key, target_type, target_ref)
      WHERE claim_status = 'claimed'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_ai_agent_target_states_active_claim`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_agent_target_states_tenant_claim_expiry`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_agent_target_states_tenant_agent_next_review`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP CONSTRAINT IF EXISTS chk_ai_agent_target_states_claim_action_ids_array`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP CONSTRAINT IF EXISTS chk_ai_agent_target_states_claim_owner_priority`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP CONSTRAINT IF EXISTS chk_ai_agent_target_states_claim_status`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS claim_metadata_json`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS claim_owner_action_request_ids`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS claim_owner_priority`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS claim_owner_run_id`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS claim_owner_work_item_id`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS claim_acquired_at`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS claim_expires_at`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS claim_status`);
    await queryRunner.query(`ALTER TABLE ai_agent_target_states DROP COLUMN IF EXISTS next_review_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_agent_definitions_tenant_priority`);
    await queryRunner.query(`ALTER TABLE ai_agent_definitions DROP CONSTRAINT IF EXISTS chk_ai_agent_definitions_agent_priority`);
    await queryRunner.query(`ALTER TABLE ai_agent_definitions DROP COLUMN IF EXISTS agent_priority`);
  }
}
