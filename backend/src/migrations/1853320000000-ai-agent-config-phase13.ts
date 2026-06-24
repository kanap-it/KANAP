import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiAgentConfigPhase131853320000000 implements MigrationInterface {
  name = 'AiAgentConfigPhase131853320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      ADD COLUMN IF NOT EXISTS persona_json jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      ADD COLUMN IF NOT EXISTS config_version int NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      ADD COLUMN IF NOT EXISTS updated_by_user_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      DROP CONSTRAINT IF EXISTS chk_ai_agent_definitions_config_version
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      ADD CONSTRAINT chk_ai_agent_definitions_config_version CHECK (config_version >= 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ai_agent_definitions DROP CONSTRAINT IF EXISTS chk_ai_agent_definitions_config_version`);
    await queryRunner.query(`ALTER TABLE ai_agent_definitions DROP COLUMN IF EXISTS updated_by_user_id`);
    await queryRunner.query(`ALTER TABLE ai_agent_definitions DROP COLUMN IF EXISTS config_version`);
    await queryRunner.query(`ALTER TABLE ai_agent_definitions DROP COLUMN IF EXISTS persona_json`);
  }
}
