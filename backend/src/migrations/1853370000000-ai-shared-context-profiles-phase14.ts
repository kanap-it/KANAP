import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE = 'ai_shared_context_profiles';

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

export class AiSharedContextProfilesPhase141853370000000 implements MigrationInterface {
  name = 'AiSharedContextProfilesPhase141853370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        profile_key text NOT NULL,
        name text NOT NULL,
        description text,
        content_json jsonb NOT NULL DEFAULT '{"lines":[]}'::jsonb,
        status text NOT NULL DEFAULT 'active',
        config_version int NOT NULL DEFAULT 1,
        updated_by_user_id uuid,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_shared_context_profiles_tenant_key UNIQUE (tenant_id, profile_key),
        CONSTRAINT chk_ai_shared_context_profiles_key_not_empty CHECK (btrim(profile_key) <> ''),
        CONSTRAINT chk_ai_shared_context_profiles_name_not_empty CHECK (btrim(name) <> ''),
        CONSTRAINT chk_ai_shared_context_profiles_status CHECK (status IN ('active', 'archived')),
        CONSTRAINT chk_ai_shared_context_profiles_version CHECK (config_version >= 1),
        CONSTRAINT chk_ai_shared_context_profiles_lines_array CHECK (
          jsonb_typeof(content_json) = 'object'
          AND (
            content_json ? 'lines' = false
            OR jsonb_typeof(content_json->'lines') = 'array'
          )
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_shared_context_profiles_tenant_status_updated
      ON ${TABLE}(tenant_id, status, updated_at DESC)
    `);
    await enableTenantRls(queryRunner, TABLE);

    await queryRunner.query(`
      UPDATE ai_agent_definitions
      SET persona_json = (
        persona_json
        - 'tone'
        - 'escalation_text'
        - 'escalationText'
        || CASE
          WHEN COALESCE(persona_json #>> '{output_style,tone}', persona_json->>'tone') IS NULL THEN '{}'::jsonb
          ELSE jsonb_build_object(
            'output_style',
            (
              CASE
                WHEN jsonb_typeof(persona_json->'output_style') = 'object' THEN persona_json->'output_style'
                ELSE '{}'::jsonb
              END
              || jsonb_build_object('tone', COALESCE(persona_json #>> '{output_style,tone}', persona_json->>'tone'))
            )
          )
        END
        || CASE
          WHEN COALESCE(persona_json->>'escalation_guidance', persona_json->>'escalation_text', persona_json->>'escalationText') IS NULL THEN '{}'::jsonb
          ELSE jsonb_build_object(
            'escalation_guidance',
            COALESCE(persona_json->>'escalation_guidance', persona_json->>'escalation_text', persona_json->>'escalationText')
          )
        END
      )
      WHERE persona_json IS NOT NULL
        AND (
          persona_json ? 'tone'
          OR persona_json ? 'escalation_text'
          OR persona_json ? 'escalationText'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS ${TABLE}_tenant_isolation ON ${TABLE}`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ai_shared_context_profiles_tenant_status_updated`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${TABLE}`);
  }
}
