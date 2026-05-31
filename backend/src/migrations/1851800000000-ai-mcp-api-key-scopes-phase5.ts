import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiMcpApiKeyScopesPhase51851800000000 implements MigrationInterface {
  name = 'AiMcpApiKeyScopesPhase51851800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD COLUMN IF NOT EXISTS mcp_scopes_json jsonb NOT NULL DEFAULT '["mcp:tools:list","mcp:tools:execute"]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD COLUMN IF NOT EXISTS mcp_capability_allowlist_json jsonb NOT NULL DEFAULT '["kanap.read.core"]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD COLUMN IF NOT EXISTS mcp_capability_denylist_json jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD COLUMN IF NOT EXISTS mcp_max_effect text NOT NULL DEFAULT 'read'
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD COLUMN IF NOT EXISTS mcp_rate_limit_per_minute integer NOT NULL DEFAULT 60
    `);

    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_scopes_json_array
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD CONSTRAINT chk_ai_api_keys_mcp_scopes_json_array
      CHECK (jsonb_typeof(mcp_scopes_json) = 'array')
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_allowlist_json_array
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD CONSTRAINT chk_ai_api_keys_mcp_allowlist_json_array
      CHECK (jsonb_typeof(mcp_capability_allowlist_json) = 'array')
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_denylist_json_array
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD CONSTRAINT chk_ai_api_keys_mcp_denylist_json_array
      CHECK (jsonb_typeof(mcp_capability_denylist_json) = 'array')
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_max_effect_read
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD CONSTRAINT chk_ai_api_keys_mcp_max_effect_read
      CHECK (mcp_max_effect = 'read')
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_rate_limit
    `);
    await queryRunner.query(`
      ALTER TABLE ai_api_keys
      ADD CONSTRAINT chk_ai_api_keys_mcp_rate_limit
      CHECK (mcp_rate_limit_per_minute BETWEEN 1 AND 1000)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_runs_tenant_api_key_created
      ON ai_runs(tenant_id, ai_api_key_id, created_at)
      WHERE ai_api_key_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_tenant_surface_created
      ON ai_tool_executions(tenant_id, surface, created_at)
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_ai_execution_tenant_graph()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF TG_TABLE_NAME = 'ai_runs' THEN
          IF NEW.ai_api_key_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_api_keys WHERE id = NEW.ai_api_key_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_runs ai_api_key_id must belong to the same tenant';
          END IF;
        ELSIF TG_TABLE_NAME = 'ai_run_steps' THEN
          IF NOT EXISTS (
            SELECT 1 FROM ai_runs WHERE id = NEW.run_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_run_steps run_id must belong to the same tenant';
          END IF;
        ELSIF TG_TABLE_NAME = 'ai_action_requests' THEN
          IF NEW.run_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_runs WHERE id = NEW.run_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_action_requests run_id must belong to the same tenant';
          END IF;
          IF NEW.tool_execution_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_tool_executions WHERE id = NEW.tool_execution_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_action_requests tool_execution_id must belong to the same tenant';
          END IF;
          IF NEW.preview_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_mutation_previews WHERE id = NEW.preview_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_action_requests preview_id must belong to the same tenant';
          END IF;
        ELSIF TG_TABLE_NAME = 'ai_tool_executions' THEN
          IF NOT EXISTS (
            SELECT 1 FROM ai_runs WHERE id = NEW.run_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_tool_executions run_id must belong to the same tenant';
          END IF;
          IF NEW.step_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_run_steps WHERE id = NEW.step_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_tool_executions step_id must belong to the same tenant';
          END IF;
          IF NEW.action_request_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_action_requests WHERE id = NEW.action_request_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_tool_executions action_request_id must belong to the same tenant';
          END IF;
          IF NEW.approval_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_approvals WHERE id = NEW.approval_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_tool_executions approval_id must belong to the same tenant';
          END IF;
        ELSIF TG_TABLE_NAME = 'ai_evidence' THEN
          IF NEW.run_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_runs WHERE id = NEW.run_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_evidence run_id must belong to the same tenant';
          END IF;
          IF NEW.tool_execution_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_tool_executions WHERE id = NEW.tool_execution_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_evidence tool_execution_id must belong to the same tenant';
          END IF;
          IF NEW.action_request_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ai_action_requests WHERE id = NEW.action_request_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_evidence action_request_id must belong to the same tenant';
          END IF;
        ELSIF TG_TABLE_NAME = 'ai_approvals' THEN
          IF NOT EXISTS (
            SELECT 1 FROM ai_action_requests WHERE id = NEW.action_request_id AND tenant_id = NEW.tenant_id
          ) THEN
            RAISE EXCEPTION 'ai_approvals action_request_id must belong to the same tenant';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_runs_execution_tenant_graph ON ai_runs`);
    await queryRunner.query(`
      CREATE TRIGGER trg_ai_runs_execution_tenant_graph
      BEFORE INSERT OR UPDATE ON ai_runs
      FOR EACH ROW
      EXECUTE FUNCTION enforce_ai_execution_tenant_graph()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_runs_execution_tenant_graph ON ai_runs`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_tool_executions_tenant_surface_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_runs_tenant_api_key_created`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_rate_limit`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_max_effect_read`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_denylist_json_array`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_allowlist_json_array`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP CONSTRAINT IF EXISTS chk_ai_api_keys_mcp_scopes_json_array`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP COLUMN IF EXISTS mcp_rate_limit_per_minute`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP COLUMN IF EXISTS mcp_max_effect`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP COLUMN IF EXISTS mcp_capability_denylist_json`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP COLUMN IF EXISTS mcp_capability_allowlist_json`);
    await queryRunner.query(`ALTER TABLE ai_api_keys DROP COLUMN IF EXISTS mcp_scopes_json`);
  }
}
