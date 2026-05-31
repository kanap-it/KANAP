import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE = 'ai_live_test_targets';

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

export class AiLiveReadinessPhase81852200000000 implements MigrationInterface {
  name = 'AiLiveReadinessPhase81852200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_live_test_targets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        provider_kind text NOT NULL,
        provider_key text NOT NULL,
        environment text NOT NULL,
        target_kind text NOT NULL,
        target_key text NOT NULL,
        external_ref text NOT NULL,
        allowed_effect text NOT NULL,
        safety_label text NOT NULL,
        enabled boolean NOT NULL DEFAULT false,
        expires_at timestamptz,
        metadata_json jsonb,
        redaction_policy_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_live_test_targets_scope UNIQUE (
          tenant_id, provider_kind, provider_key, environment, target_kind, target_key
        ),
        CONSTRAINT chk_ai_live_test_targets_provider_kind CHECK (
          provider_kind IN ('ticketing', 'monitoring', 'virtualization', 'directory', 'automation')
        ),
        CONSTRAINT chk_ai_live_test_targets_environment CHECK (
          environment = lower(btrim(environment))
          AND environment IN ('mock', 'lab', 'sandbox', 'staging', 'production')
        ),
        CONSTRAINT chk_ai_live_test_targets_effect CHECK (
          allowed_effect IN ('read', 'dry_run', 'sandbox_write')
        ),
        CONSTRAINT chk_ai_live_test_targets_safety_label CHECK (
          safety_label IN ('read_only', 'dry_run_only', 'sandbox_only')
        ),
        CONSTRAINT chk_ai_live_test_targets_effect_safety CHECK (
          (allowed_effect = 'read' AND safety_label IN ('read_only', 'sandbox_only'))
          OR (allowed_effect = 'dry_run' AND safety_label IN ('dry_run_only', 'sandbox_only'))
          OR (allowed_effect = 'sandbox_write' AND safety_label = 'sandbox_only')
        ),
        CONSTRAINT chk_ai_live_test_targets_no_production_effect CHECK (
          allowed_effect = 'read' OR environment <> 'production'
        ),
        CONSTRAINT chk_ai_live_test_targets_target_kind CHECK (
          target_kind IN ('ticket', 'alert', 'sensor', 'vm', 'host', 'user', 'group', 'awx_job', 'awx_target')
        ),
        CONSTRAINT chk_ai_live_test_targets_refs_not_empty CHECK (
          btrim(provider_key) <> ''
          AND btrim(target_key) <> ''
          AND btrim(external_ref) <> ''
        ),
        CONSTRAINT chk_ai_live_test_targets_no_wildcards CHECK (
          provider_key NOT LIKE '%*%'
          AND target_key NOT LIKE '%*%'
          AND external_ref NOT LIKE '%*%'
        ),
        CONSTRAINT chk_ai_live_test_targets_no_broad_refs CHECK (
          lower(btrim(provider_key)) NOT IN ('all', 'any', 'everyone', 'unrestricted')
          AND lower(btrim(target_key)) NOT IN ('all', 'any', 'everyone', 'unrestricted', 'domain users', 'all users', 'all_hosts', 'all-hosts', 'all_devices', 'all-devices', 'all_vms', 'all-vms')
          AND lower(btrim(external_ref)) NOT IN ('all', 'any', 'everyone', 'unrestricted', 'domain users', 'all users', 'all_hosts', 'all-hosts', 'all_devices', 'all-devices', 'all_vms', 'all-vms')
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_live_test_targets_tenant_provider_effect_enabled
      ON ai_live_test_targets(tenant_id, provider_kind, allowed_effect, enabled)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_live_test_targets_tenant_expiry
      ON ai_live_test_targets(tenant_id, expires_at)
    `);
    await enableTenantRls(queryRunner, TABLE);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS ${TABLE}_tenant_isolation ON ${TABLE}`);
    await queryRunner.query(`ALTER TABLE ${TABLE} NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ${TABLE} DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${TABLE}`);
  }
}
