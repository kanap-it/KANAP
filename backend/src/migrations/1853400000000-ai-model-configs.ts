import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE = 'ai_model_configs';

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

/**
 * Per-tenant AI model registry (plan: planning/ai-model-registry).
 *
 * 1. Creates ai_model_configs + RLS.
 * 2. Adds the two consumer assignment FKs (ai_settings.chat_model_config_id,
 *    ai_agent_definitions.llm_model_config_id).
 * 3. Backfills: every tenant on a custom provider gets one registry entry cloned
 *    from its ai_settings LLM fields, marked as tenant default and assigned to
 *    chat. Builtin tenants get nothing (null assignment resolves to builtin).
 *    Zero behavior change at deploy.
 *
 * The backfill runs before RLS is enabled on the new table, and briefly disables
 * RLS on ai_settings for the cross-tenant read/update (same pattern as the
 * agent-roles seed migration).
 */
export class AiModelConfigs1853400000000 implements MigrationInterface {
  name = 'AiModelConfigs1853400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        provider varchar(50) NOT NULL,
        model varchar(100) NOT NULL,
        endpoint_url text,
        api_key_encrypted text,
        supports_vision boolean NOT NULL DEFAULT true,
        price_input_eur_per_mtok numeric(12,4),
        price_output_eur_per_mtok numeric(12,4),
        llm_timeout_ms integer,
        status varchar(10) NOT NULL DEFAULT 'active',
        is_default boolean NOT NULL DEFAULT false,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_model_configs_tenant_name UNIQUE (tenant_id, name),
        CONSTRAINT chk_ai_model_configs_name_not_empty CHECK (btrim(name) <> ''),
        CONSTRAINT chk_ai_model_configs_model_not_empty CHECK (btrim(model) <> ''),
        CONSTRAINT chk_ai_model_configs_provider CHECK (provider IN ('anthropic', 'openai', 'ollama', 'custom')),
        CONSTRAINT chk_ai_model_configs_status CHECK (status IN ('active', 'archived')),
        CONSTRAINT chk_ai_model_configs_prices_non_negative CHECK (
          (price_input_eur_per_mtok IS NULL OR price_input_eur_per_mtok >= 0)
          AND (price_output_eur_per_mtok IS NULL OR price_output_eur_per_mtok >= 0)
        ),
        CONSTRAINT chk_ai_model_configs_timeout_positive CHECK (llm_timeout_ms IS NULL OR llm_timeout_ms > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_model_configs_tenant_status
      ON ${TABLE}(tenant_id, status, updated_at DESC)
    `);
    // One active default per tenant.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_model_configs_tenant_default
      ON ${TABLE}(tenant_id)
      WHERE is_default AND status = 'active'
    `);

    await queryRunner.query(`
      ALTER TABLE ai_settings
      ADD COLUMN IF NOT EXISTS chat_model_config_id uuid REFERENCES ${TABLE}(id)
    `);
    await queryRunner.query(`
      ALTER TABLE ai_agent_definitions
      ADD COLUMN IF NOT EXISTS llm_model_config_id uuid REFERENCES ${TABLE}(id)
    `);

    // Backfill: RLS is not yet enabled on ai_model_configs; ai_settings needs a
    // temporary RLS bypass for the cross-tenant read/update.
    await queryRunner.query(`ALTER TABLE ai_settings DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      WITH migrated AS (
        INSERT INTO ${TABLE} (
          tenant_id, name, provider, model, endpoint_url, api_key_encrypted,
          supports_vision, is_default, created_at, updated_at
        )
        SELECT
          s.tenant_id,
          COALESCE(NULLIF(btrim(s.llm_model), ''), 'Configuration migrée'),
          s.llm_provider,
          COALESCE(NULLIF(btrim(s.llm_model), ''), 'unknown'),
          s.llm_endpoint_url,
          s.llm_api_key_encrypted,
          s.llm_supports_vision,
          true,
          now(),
          now()
        FROM ai_settings s
        WHERE s.provider_source = 'custom'
          AND s.llm_provider IS NOT NULL
        RETURNING id, tenant_id
      )
      UPDATE ai_settings s
      SET chat_model_config_id = m.id, updated_at = now()
      FROM migrated m
      WHERE s.tenant_id = m.tenant_id
    `);
    await queryRunner.query(`ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_settings FORCE ROW LEVEL SECURITY`);

    await enableTenantRls(queryRunner, TABLE);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ai_agent_definitions DROP COLUMN IF EXISTS llm_model_config_id`);
    await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS chat_model_config_id`);
    await queryRunner.query(`DROP POLICY IF EXISTS ${TABLE}_tenant_isolation ON ${TABLE}`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_ai_model_configs_tenant_default`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_model_configs_tenant_status`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${TABLE}`);
  }
}
