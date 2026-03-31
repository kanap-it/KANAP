import { MigrationInterface, QueryRunner } from 'typeorm';

function tenantPolicySql(table: string) {
  return `
    CREATE POLICY ${table}_tenant_isolation ON ${table}
    USING (tenant_id = app_current_tenant())
    WITH CHECK (tenant_id = app_current_tenant())
  `;
}

export class BuiltinAiProvider1845200000000 implements MigrationInterface {
  name = 'BuiltinAiProvider1845200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_ai_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton = true),
        provider varchar(50) NOT NULL,
        model varchar(100) NOT NULL,
        api_key_encrypted text NOT NULL,
        endpoint_url text,
        rate_limit_tenant_per_minute integer NOT NULL DEFAULT 30,
        rate_limit_user_per_hour integer NOT NULL DEFAULT 60,
        updated_at timestamptz NOT NULL DEFAULT now(),
        updated_by uuid
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_ai_plan_limits (
        plan_name text PRIMARY KEY,
        monthly_message_limit integer NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO platform_ai_plan_limits (plan_name, monthly_message_limit)
      VALUES
        ('small', 500),
        ('standard', 1500),
        ('max', 2500)
      ON CONFLICT (plan_name) DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_builtin_usage (
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        year_month varchar(7) NOT NULL,
        user_message_count integer NOT NULL DEFAULT 0,
        last_updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (tenant_id, year_month)
      )
    `);
    await queryRunner.query(`ALTER TABLE ai_builtin_usage ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_builtin_usage FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS ai_builtin_usage_tenant_isolation ON ai_builtin_usage`);
    await queryRunner.query(tenantPolicySql('ai_builtin_usage'));

    await queryRunner.query(`
      ALTER TABLE ai_settings
      ADD COLUMN IF NOT EXISTS provider_source varchar(10) NOT NULL DEFAULT 'builtin'
    `);
    await queryRunner.query(`
      UPDATE ai_settings
      SET provider_source = 'custom'
      WHERE llm_provider IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE ai_conversations
      ADD COLUMN IF NOT EXISTS provider_source varchar(10)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ai_conversations DROP COLUMN IF EXISTS provider_source`);
    await queryRunner.query(`ALTER TABLE ai_settings DROP COLUMN IF EXISTS provider_source`);
    await queryRunner.query(`DROP POLICY IF EXISTS ai_builtin_usage_tenant_isolation ON ai_builtin_usage`);
    await queryRunner.query(`ALTER TABLE ai_builtin_usage NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_builtin_usage DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_builtin_usage`);
    await queryRunner.query(`DROP TABLE IF EXISTS platform_ai_plan_limits`);
    await queryRunner.query(`DROP TABLE IF EXISTS platform_ai_config`);
  }
}
