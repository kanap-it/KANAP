import { MigrationInterface, QueryRunner } from 'typeorm';

const TENANT_TABLES = [
  'ai_adapter_configs',
  'ai_observations',
  'ai_recommendations',
  'ai_decisions',
  'ai_evaluations',
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

export class AiAdapterDiagnosticPhase21851200000000 implements MigrationInterface {
  name = 'AiAdapterDiagnosticPhase21851200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_adapter_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        provider_kind text NOT NULL,
        provider_key text NOT NULL,
        implementation text NOT NULL,
        environment text NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        display_name text,
        base_url text,
        credential_ref_json jsonb,
        capability_allowlist_json jsonb,
        live_test_safety text NOT NULL DEFAULT 'mock_only',
        timeout_seconds integer,
        rate_limit_json jsonb,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_adapter_configs_tenant_kind_key UNIQUE (tenant_id, provider_kind, provider_key)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_adapter_configs_tenant_enabled_created ON ai_adapter_configs(tenant_id, enabled, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_observations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
        observation_type text NOT NULL,
        status text NOT NULL,
        source_provider text NOT NULL,
        source_object_type text NOT NULL,
        source_object_id text,
        severity text,
        summary text NOT NULL,
        evidence_ids jsonb,
        metadata_json jsonb,
        observed_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_observations_tenant_run_created ON ai_observations(tenant_id, run_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_observations_tenant_source_created ON ai_observations(tenant_id, source_provider, source_object_type, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_observations_tenant_status_created ON ai_observations(tenant_id, status, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
        observation_id uuid REFERENCES ai_observations(id) ON DELETE SET NULL,
        recommendation_type text NOT NULL,
        status text NOT NULL,
        summary text NOT NULL,
        rationale text,
        confidence double precision,
        proposed_action_class text,
        max_autonomy_level text NOT NULL,
        evidence_ids jsonb,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_recommendations_tenant_run_created ON ai_recommendations(tenant_id, run_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_recommendations_tenant_observation_created ON ai_recommendations(tenant_id, observation_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_recommendations_tenant_status_created ON ai_recommendations(tenant_id, status, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_decisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
        recommendation_id uuid REFERENCES ai_recommendations(id) ON DELETE SET NULL,
        decision text NOT NULL,
        status text NOT NULL,
        reason text NOT NULL,
        evidence_ids jsonb,
        policy_result_json jsonb,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_decisions_tenant_run_created ON ai_decisions(tenant_id, run_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_decisions_tenant_recommendation_created ON ai_decisions(tenant_id, recommendation_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_decisions_tenant_decision_created ON ai_decisions(tenant_id, decision, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_evaluations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
        recommendation_id uuid REFERENCES ai_recommendations(id) ON DELETE SET NULL,
        decision_id uuid REFERENCES ai_decisions(id) ON DELETE SET NULL,
        status text NOT NULL,
        outcome text,
        scores_json jsonb,
        feedback_json jsonb,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_evaluations_tenant_run_created ON ai_evaluations(tenant_id, run_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_evaluations_tenant_recommendation_created ON ai_evaluations(tenant_id, recommendation_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_evaluations_tenant_status_created ON ai_evaluations(tenant_id, status, created_at)`);

    for (const table of TENANT_TABLES) {
      await enableTenantRls(queryRunner, table);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...TENANT_TABLES].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS ai_evaluations`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_decisions`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_recommendations`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_observations`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_adapter_configs`);
  }
}
