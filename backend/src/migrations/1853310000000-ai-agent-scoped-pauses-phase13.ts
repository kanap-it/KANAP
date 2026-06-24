import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiAgentScopedPausesPhase131853310000000 implements MigrationInterface {
  name = 'AiAgentScopedPausesPhase131853310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_emergency_pauses
      ADD COLUMN IF NOT EXISTS agent_definition_id uuid REFERENCES ai_agent_definitions(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_emergency_pauses_tenant_agent_active
      ON ai_emergency_pauses(tenant_id, agent_definition_id, active)
    `);
    await queryRunner.query(`
      ALTER TABLE ai_emergency_pauses
      DROP CONSTRAINT IF EXISTS chk_ai_emergency_pauses_agent_scope
    `);
    await queryRunner.query(`
      ALTER TABLE ai_emergency_pauses
      ADD CONSTRAINT chk_ai_emergency_pauses_agent_scope
      CHECK (
        (scope = 'agent' AND agent_definition_id IS NOT NULL)
        OR (scope <> 'agent' AND agent_definition_id IS NULL)
      )
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ai_phase13_assert_emergency_pause_agent_links()
      RETURNS trigger AS $$
      DECLARE
        linked_tenant uuid;
      BEGIN
        IF NEW.agent_definition_id IS NOT NULL THEN
          SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
          IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
            RAISE EXCEPTION 'cross-tenant ai_emergency_pauses.agent_definition_id link';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ai_emergency_pauses_agent_tenant_links ON ai_emergency_pauses;
      CREATE TRIGGER trg_ai_emergency_pauses_agent_tenant_links
      BEFORE INSERT OR UPDATE ON ai_emergency_pauses
      FOR EACH ROW EXECUTE FUNCTION ai_phase13_assert_emergency_pause_agent_links()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_emergency_pauses_agent_tenant_links ON ai_emergency_pauses`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS ai_phase13_assert_emergency_pause_agent_links()`);
    await queryRunner.query(`ALTER TABLE ai_emergency_pauses DROP CONSTRAINT IF EXISTS chk_ai_emergency_pauses_agent_scope`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_emergency_pauses_tenant_agent_active`);
    await queryRunner.query(`ALTER TABLE ai_emergency_pauses DROP COLUMN IF EXISTS agent_definition_id`);
  }
}
