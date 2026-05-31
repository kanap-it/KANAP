import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE = 'ai_automation_job_catalog';

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

export class AiAutomationJobCatalogPhase41851600000000 implements MigrationInterface {
  name = 'AiAutomationJobCatalogPhase41851600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_automation_job_catalog (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        provider_key text NOT NULL,
        job_key text NOT NULL,
        catalog_version text NOT NULL DEFAULT '1.0.0',
        display_name text NOT NULL,
        description text,
        environment text NOT NULL,
        external_job_template_ref text NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        launch_allowed boolean NOT NULL DEFAULT false,
        dry_run_supported boolean NOT NULL DEFAULT true,
        dry_run_required boolean NOT NULL DEFAULT true,
        variable_schema_json jsonb NOT NULL,
        target_policy_json jsonb NOT NULL,
        blast_radius_limit integer NOT NULL,
        cooldown_seconds integer NOT NULL DEFAULT 300,
        timeout_seconds integer NOT NULL DEFAULT 600,
        redaction_policy_json jsonb,
        live_test_safety text NOT NULL DEFAULT 'mock_only',
        cancel_allowed boolean NOT NULL DEFAULT false,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_automation_job_catalog_tenant_provider_job UNIQUE (tenant_id, provider_key, job_key),
        CONSTRAINT chk_ai_automation_job_catalog_blast_radius CHECK (blast_radius_limit > 0),
        CONSTRAINT chk_ai_automation_job_catalog_cooldown CHECK (cooldown_seconds >= 0),
        CONSTRAINT chk_ai_automation_job_catalog_timeout CHECK (timeout_seconds >= 1 AND timeout_seconds <= 1800),
        CONSTRAINT chk_ai_automation_job_catalog_environment CHECK (environment = lower(btrim(environment)) AND environment IN ('mock', 'lab', 'sandbox', 'staging', 'production')),
        CONSTRAINT chk_ai_automation_job_catalog_schema_object CHECK (jsonb_typeof(variable_schema_json) = 'object'),
        CONSTRAINT chk_ai_automation_job_catalog_target_policy_object CHECK (jsonb_typeof(target_policy_json) = 'object')
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_automation_job_catalog_tenant_provider_env_enabled ON ai_automation_job_catalog(tenant_id, provider_key, environment, enabled)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_automation_job_catalog_tenant_launch_enabled ON ai_automation_job_catalog(tenant_id, launch_allowed, enabled)`);
    await enableTenantRls(queryRunner, TABLE);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS ${TABLE}_tenant_isolation ON ${TABLE}`);
    await queryRunner.query(`ALTER TABLE ${TABLE} NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ${TABLE} DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${TABLE}`);
  }
}
