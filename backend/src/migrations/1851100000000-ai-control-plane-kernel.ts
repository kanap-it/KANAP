import { MigrationInterface, QueryRunner } from 'typeorm';

const TENANT_TABLES = [
  'ai_runs',
  'ai_run_steps',
  'ai_tool_executions',
  'ai_evidence',
  'ai_action_requests',
  'ai_approvals',
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

export class AiControlPlaneKernel1851100000000 implements MigrationInterface {
  name = 'AiControlPlaneKernel1851100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        conversation_id uuid REFERENCES ai_conversations(id) ON DELETE SET NULL,
        request_id text,
        ai_api_key_id uuid REFERENCES ai_api_keys(id) ON DELETE SET NULL,
        invocation_channel text NOT NULL,
        trigger_kind text NOT NULL,
        status text NOT NULL DEFAULT 'running',
        input_summary jsonb,
        output_summary jsonb,
        usage_json jsonb,
        cost_json jsonb,
        metadata_json jsonb,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_runs_tenant_status_created ON ai_runs(tenant_id, status, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_runs_tenant_conversation_created ON ai_runs(tenant_id, conversation_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_runs_tenant_invocation_created ON ai_runs(tenant_id, invocation_channel, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_run_steps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        run_id uuid NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
        step_index integer NOT NULL,
        kind text NOT NULL,
        status text NOT NULL DEFAULT 'running',
        capability_name text,
        capability_version text,
        input_summary jsonb,
        output_summary jsonb,
        error_message text,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_run_steps_tenant_run_step ON ai_run_steps(tenant_id, run_id, step_index)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_run_steps_tenant_status_created ON ai_run_steps(tenant_id, status, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_action_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
        tool_execution_id uuid,
        conversation_id uuid REFERENCES ai_conversations(id) ON DELETE SET NULL,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        preview_id uuid REFERENCES ai_mutation_previews(id) ON DELETE SET NULL,
        capability_name text NOT NULL,
        capability_version text NOT NULL,
        effect text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        target_type text,
        target_id uuid,
        input_hash text NOT NULL,
        input_summary jsonb,
        evidence_ids jsonb,
        expires_at timestamptz,
        approved_at timestamptz,
        rejected_at timestamptz,
        executed_at timestamptz,
        error_message text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_action_requests_tenant_status_created ON ai_action_requests(tenant_id, status, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_action_requests_tenant_run_created ON ai_action_requests(tenant_id, run_id, created_at)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_action_requests_tenant_preview ON ai_action_requests(tenant_id, preview_id) WHERE preview_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_action_requests_tenant_capability_created ON ai_action_requests(tenant_id, capability_name, capability_version, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_tool_executions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        run_id uuid NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
        step_id uuid REFERENCES ai_run_steps(id) ON DELETE SET NULL,
        action_request_id uuid REFERENCES ai_action_requests(id) ON DELETE SET NULL,
        approval_id uuid,
        capability_name text NOT NULL,
        capability_version text NOT NULL,
        surface text NOT NULL,
        effect text NOT NULL,
        status text NOT NULL DEFAULT 'running',
        input_hash text,
        input_summary jsonb,
        output_summary jsonb,
        error_message text,
        duration_ms integer,
        usage_json jsonb,
        cost_json jsonb,
        metadata_json jsonb,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_tenant_run_created ON ai_tool_executions(tenant_id, run_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_tenant_capability_created ON ai_tool_executions(tenant_id, capability_name, capability_version, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_tenant_status_created ON ai_tool_executions(tenant_id, status, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_tenant_action ON ai_tool_executions(tenant_id, action_request_id)`);
    await queryRunner.query(`
      ALTER TABLE ai_action_requests
      ADD CONSTRAINT fk_ai_action_requests_tool_execution
      FOREIGN KEY (tool_execution_id) REFERENCES ai_tool_executions(id) ON DELETE SET NULL
      NOT VALID
    `);
    await queryRunner.query(`
      ALTER TABLE ai_action_requests
      VALIDATE CONSTRAINT fk_ai_action_requests_tool_execution
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_evidence (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
        tool_execution_id uuid REFERENCES ai_tool_executions(id) ON DELETE SET NULL,
        action_request_id uuid REFERENCES ai_action_requests(id) ON DELETE SET NULL,
        source_provider text NOT NULL,
        source_object_type text NOT NULL,
        source_object_id text,
        source_uri text,
        trust_level text NOT NULL,
        redaction_status text NOT NULL,
        content_hash text NOT NULL,
        summary text NOT NULL,
        payload_json jsonb,
        retention_class text NOT NULL,
        collected_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_evidence_tenant_run_created ON ai_evidence(tenant_id, run_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_evidence_tenant_tool ON ai_evidence(tenant_id, tool_execution_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_evidence_tenant_action ON ai_evidence(tenant_id, action_request_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_evidence_tenant_source_created ON ai_evidence(tenant_id, source_provider, source_object_type, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_approvals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        action_request_id uuid NOT NULL REFERENCES ai_action_requests(id) ON DELETE CASCADE,
        capability_name text NOT NULL,
        capability_version text NOT NULL,
        source text NOT NULL,
        status text NOT NULL,
        actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        actor_label text,
        input_hash text NOT NULL,
        evidence_ids jsonb,
        reason text,
        expires_at timestamptz NOT NULL,
        decided_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_approvals_tenant_action_status ON ai_approvals(tenant_id, action_request_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_approvals_tenant_capability_created ON ai_approvals(tenant_id, capability_name, capability_version, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_approvals_tenant_expires ON ai_approvals(tenant_id, expires_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_tenant_approval ON ai_tool_executions(tenant_id, approval_id)`);
    await queryRunner.query(`
      ALTER TABLE ai_tool_executions
      ADD CONSTRAINT fk_ai_tool_executions_approval
      FOREIGN KEY (approval_id) REFERENCES ai_approvals(id) ON DELETE SET NULL
      NOT VALID
    `);
    await queryRunner.query(`
      ALTER TABLE ai_tool_executions
      VALIDATE CONSTRAINT fk_ai_tool_executions_approval
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_emergency_pauses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
        scope text NOT NULL DEFAULT 'tenant',
        capability_name text,
        category text,
        effect text,
        active boolean NOT NULL DEFAULT true,
        reason text NOT NULL,
        actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        actor_label text,
        expires_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_emergency_pauses_tenant_active_created ON ai_emergency_pauses(tenant_id, active, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_emergency_pauses_tenant_capability_active ON ai_emergency_pauses(tenant_id, capability_name, active)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_emergency_pauses_tenant_category_active ON ai_emergency_pauses(tenant_id, category, active)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_emergency_pauses_tenant_effect_active ON ai_emergency_pauses(tenant_id, effect, active)`);

    for (const table of TENANT_TABLES) {
      await enableTenantRls(queryRunner, table);
    }

    await queryRunner.query(`ALTER TABLE ai_emergency_pauses ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_emergency_pauses FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS ai_emergency_pauses_tenant_isolation ON ai_emergency_pauses`);
    await queryRunner.query(`
      CREATE POLICY ai_emergency_pauses_tenant_isolation ON ai_emergency_pauses
      USING (tenant_id = app_current_tenant() OR tenant_id IS NULL)
      WITH CHECK (tenant_id = app_current_tenant() OR tenant_id IS NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS ai_emergency_pauses_tenant_isolation ON ai_emergency_pauses`);
    await queryRunner.query(`ALTER TABLE ai_emergency_pauses NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_emergency_pauses DISABLE ROW LEVEL SECURITY`);
    for (const table of [...TENANT_TABLES].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }
    await queryRunner.query(`ALTER TABLE ai_tool_executions DROP CONSTRAINT IF EXISTS fk_ai_tool_executions_approval`);
    await queryRunner.query(`ALTER TABLE ai_action_requests DROP CONSTRAINT IF EXISTS fk_ai_action_requests_tool_execution`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_emergency_pauses`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_approvals`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_evidence`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_tool_executions`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_action_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_run_steps`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_runs`);
  }
}
