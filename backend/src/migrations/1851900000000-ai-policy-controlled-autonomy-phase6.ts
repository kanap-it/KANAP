import { MigrationInterface, QueryRunner } from 'typeorm';

const TENANT_TABLES = [
  'ai_approval_policies',
  'ai_autonomy_ceilings',
  'ai_autonomy_routines',
] as const;

async function enableTenantRls(queryRunner: QueryRunner, table: string): Promise<void> {
  await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
  await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
  await queryRunner.query(`
    CREATE POLICY ${table}_tenant_isolation ON ${table}
    USING (tenant_id = app_current_tenant())
    WITH CHECK (tenant_id = app_current_tenant())
  `);
}

async function createExecutionGraphFunction(queryRunner: QueryRunner, includePolicyLink: boolean): Promise<void> {
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
        ${includePolicyLink ? `
        IF NEW.matched_policy_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM ai_approval_policies WHERE id = NEW.matched_policy_id AND tenant_id = NEW.tenant_id
        ) THEN
          RAISE EXCEPTION 'ai_approvals matched_policy_id must belong to the same tenant';
        END IF;
        ` : ''}
      END IF;
      RETURN NEW;
    END;
    $$;
  `);
}

export class AiPolicyControlledAutonomyPhase61851900000000 implements MigrationInterface {
  name = 'AiPolicyControlledAutonomyPhase61851900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_approval_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        policy_key text NOT NULL,
        policy_version integer NOT NULL,
        name text NOT NULL,
        description text,
        status text NOT NULL DEFAULT 'draft',
        enabled boolean NOT NULL DEFAULT false,
        capability_name text NOT NULL,
        capability_version text NOT NULL,
        effect text NOT NULL,
        provider_kind text,
        provider_key text,
        environment text,
        trigger_surface text,
        trigger_kind text,
        max_autonomy_level text NOT NULL DEFAULT 'A3',
        target_type text,
        target_constraints_json jsonb,
        evidence_requirements_json jsonb,
        evaluation_requirements_json jsonb,
        min_confidence double precision,
        cooldown_seconds integer NOT NULL DEFAULT 0,
        budget_constraints_json jsonb,
        live_test_safety text NOT NULL DEFAULT 'mock_only',
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_approval_policies_tenant_key_version UNIQUE (tenant_id, policy_key, policy_version),
        CONSTRAINT chk_ai_approval_policies_status CHECK (status IN ('draft', 'disabled', 'enabled')),
        CONSTRAINT chk_ai_approval_policies_effect CHECK (effect IN ('read', 'propose', 'notify', 'write', 'remediate')),
        CONSTRAINT chk_ai_approval_policies_surface CHECK (trigger_surface IS NULL OR trigger_surface IN ('chat', 'mcp', 'scheduler', 'alert', 'internal')),
        CONSTRAINT chk_ai_approval_policies_trigger CHECK (trigger_kind IS NULL OR trigger_kind IN ('human_user', 'mcp_client', 'alert_trigger', 'scheduled_trigger', 'internal')),
        CONSTRAINT chk_ai_approval_policies_autonomy CHECK (max_autonomy_level IN ('A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6')),
        CONSTRAINT chk_ai_approval_policies_cooldown CHECK (cooldown_seconds >= 0),
        CONSTRAINT chk_ai_approval_policies_confidence CHECK (min_confidence IS NULL OR (min_confidence >= 0 AND min_confidence <= 1)),
        CONSTRAINT chk_ai_approval_policies_target_json CHECK (target_constraints_json IS NULL OR jsonb_typeof(target_constraints_json) = 'object'),
        CONSTRAINT chk_ai_approval_policies_evidence_json CHECK (evidence_requirements_json IS NULL OR jsonb_typeof(evidence_requirements_json) = 'object'),
        CONSTRAINT chk_ai_approval_policies_eval_json CHECK (evaluation_requirements_json IS NULL OR jsonb_typeof(evaluation_requirements_json) = 'object'),
        CONSTRAINT chk_ai_approval_policies_budget_json CHECK (budget_constraints_json IS NULL OR jsonb_typeof(budget_constraints_json) = 'object')
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_approval_policies_tenant_enabled_status ON ai_approval_policies(tenant_id, enabled, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_approval_policies_tenant_capability ON ai_approval_policies(tenant_id, capability_name, capability_version, effect)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_approval_policies_tenant_provider_env ON ai_approval_policies(tenant_id, provider_kind, provider_key, environment)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_autonomy_ceilings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        scope text NOT NULL,
        environment text,
        capability_name text,
        capability_version text,
        provider_kind text,
        provider_key text,
        max_autonomy_level text NOT NULL DEFAULT 'A3',
        enabled boolean NOT NULL DEFAULT false,
        reason text,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_ai_autonomy_ceilings_scope CHECK (scope IN ('tenant', 'environment', 'capability')),
        CONSTRAINT chk_ai_autonomy_ceilings_autonomy CHECK (max_autonomy_level IN ('A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6')),
        CONSTRAINT chk_ai_autonomy_ceilings_tenant_scope CHECK (scope <> 'tenant' OR (environment IS NULL AND capability_name IS NULL)),
        CONSTRAINT chk_ai_autonomy_ceilings_environment_scope CHECK (scope <> 'environment' OR environment IS NOT NULL),
        CONSTRAINT chk_ai_autonomy_ceilings_capability_scope CHECK (scope <> 'capability' OR capability_name IS NOT NULL)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_autonomy_ceilings_tenant_scope_enabled ON ai_autonomy_ceilings(tenant_id, scope, enabled)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_autonomy_ceilings_tenant_environment ON ai_autonomy_ceilings(tenant_id, environment)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_autonomy_ceilings_tenant_capability ON ai_autonomy_ceilings(tenant_id, capability_name, capability_version)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_autonomy_routines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        routine_key text NOT NULL,
        name text NOT NULL,
        trigger_kind text NOT NULL,
        workflow_type text NOT NULL,
        enabled boolean NOT NULL DEFAULT false,
        provider_key text NOT NULL DEFAULT 'mock',
        schedule_json jsonb,
        alert_filter_json jsonb,
        input_json jsonb,
        max_runs_per_window integer NOT NULL DEFAULT 1,
        cooldown_seconds integer NOT NULL DEFAULT 300,
        metadata_json jsonb,
        last_triggered_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_autonomy_routines_tenant_key UNIQUE (tenant_id, routine_key),
        CONSTRAINT chk_ai_autonomy_routines_trigger CHECK (trigger_kind IN ('scheduled', 'alert')),
        CONSTRAINT chk_ai_autonomy_routines_workflow CHECK (workflow_type IN ('readonly_diagnostic')),
        CONSTRAINT chk_ai_autonomy_routines_max_runs CHECK (max_runs_per_window BETWEEN 1 AND 10),
        CONSTRAINT chk_ai_autonomy_routines_cooldown CHECK (cooldown_seconds >= 0),
        CONSTRAINT chk_ai_autonomy_routines_schedule_json CHECK (schedule_json IS NULL OR jsonb_typeof(schedule_json) = 'object'),
        CONSTRAINT chk_ai_autonomy_routines_alert_json CHECK (alert_filter_json IS NULL OR jsonb_typeof(alert_filter_json) = 'object'),
        CONSTRAINT chk_ai_autonomy_routines_input_json CHECK (input_json IS NULL OR jsonb_typeof(input_json) = 'object')
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_autonomy_routines_tenant_trigger_enabled ON ai_autonomy_routines(tenant_id, trigger_kind, enabled)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_autonomy_routines_tenant_workflow_enabled ON ai_autonomy_routines(tenant_id, workflow_type, enabled)`);

    for (const table of TENANT_TABLES) {
      await enableTenantRls(queryRunner, table);
    }

    await queryRunner.query(`ALTER TABLE ai_approvals ADD COLUMN IF NOT EXISTS matched_policy_id uuid`);
    await queryRunner.query(`ALTER TABLE ai_approvals ADD COLUMN IF NOT EXISTS matched_policy_version integer`);
    await queryRunner.query(`ALTER TABLE ai_approvals ADD COLUMN IF NOT EXISTS decision_json jsonb`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_approvals_tenant_policy`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_approvals_tenant_policy ON ai_approvals(tenant_id, matched_policy_id) WHERE matched_policy_id IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE ai_approvals DROP CONSTRAINT IF EXISTS fk_ai_approvals_matched_policy`);
    await queryRunner.query(`
      ALTER TABLE ai_approvals
      ADD CONSTRAINT fk_ai_approvals_matched_policy
      FOREIGN KEY (matched_policy_id) REFERENCES ai_approval_policies(id) ON DELETE SET NULL
    `);

    await createExecutionGraphFunction(queryRunner, true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await createExecutionGraphFunction(queryRunner, false);
    await queryRunner.query(`ALTER TABLE ai_approvals DROP CONSTRAINT IF EXISTS fk_ai_approvals_matched_policy`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_approvals_tenant_policy`);
    await queryRunner.query(`ALTER TABLE ai_approvals DROP COLUMN IF EXISTS decision_json`);
    await queryRunner.query(`ALTER TABLE ai_approvals DROP COLUMN IF EXISTS matched_policy_version`);
    await queryRunner.query(`ALTER TABLE ai_approvals DROP COLUMN IF EXISTS matched_policy_id`);

    for (const table of [...TENANT_TABLES].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
