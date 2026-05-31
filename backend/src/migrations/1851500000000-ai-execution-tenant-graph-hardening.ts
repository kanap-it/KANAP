import { MigrationInterface, QueryRunner } from 'typeorm';

const GRAPH_TABLES = [
  'ai_run_steps',
  'ai_action_requests',
  'ai_tool_executions',
  'ai_evidence',
  'ai_approvals',
] as const;

export class AiExecutionTenantGraphHardening1851500000000 implements MigrationInterface {
  name = 'AiExecutionTenantGraphHardening1851500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_action_requests_tenant_capability_idempotency`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_action_requests_provider_idempotency
      ON ai_action_requests(tenant_id, capability_name, capability_version, idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_ai_execution_tenant_graph()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF TG_TABLE_NAME = 'ai_run_steps' THEN
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

    for (const table of GRAPH_TABLES) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_${table}_execution_tenant_graph ON ${table}`);
      await queryRunner.query(`
        CREATE TRIGGER trg_${table}_execution_tenant_graph
        BEFORE INSERT OR UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION enforce_ai_execution_tenant_graph()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...GRAPH_TABLES].reverse()) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_${table}_execution_tenant_graph ON ${table}`);
    }
    await queryRunner.query(`DROP FUNCTION IF EXISTS enforce_ai_execution_tenant_graph()`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_ai_action_requests_provider_idempotency`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_action_requests_tenant_capability_idempotency
      ON ai_action_requests(tenant_id, capability_name, idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `);
  }
}
