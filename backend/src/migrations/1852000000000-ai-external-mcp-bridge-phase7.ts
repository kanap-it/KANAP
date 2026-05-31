import { MigrationInterface, QueryRunner } from 'typeorm';

const TENANT_TABLES = [
  'ai_external_mcp_servers',
  'ai_external_mcp_tool_snapshots',
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

export class AiExternalMcpBridgePhase71852000000000 implements MigrationInterface {
  name = 'AiExternalMcpBridgePhase71852000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_external_mcp_servers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        server_key text NOT NULL,
        display_name text,
        transport_kind text NOT NULL DEFAULT 'mock',
        endpoint_config_json jsonb,
        credential_ref_json jsonb,
        enabled boolean NOT NULL DEFAULT false,
        max_effect text NOT NULL DEFAULT 'read',
        redaction_policy_json jsonb,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_external_mcp_servers_tenant_key UNIQUE (tenant_id, server_key),
        CONSTRAINT chk_ai_external_mcp_servers_key CHECK (server_key = lower(btrim(server_key)) AND server_key ~ '^[a-z0-9][a-z0-9_.-]{1,126}$'),
        CONSTRAINT chk_ai_external_mcp_servers_transport CHECK (transport_kind IN ('mock', 'stdio', 'sse', 'streamable_http')),
        CONSTRAINT chk_ai_external_mcp_servers_enabled_mock CHECK (enabled = false OR transport_kind = 'mock'),
        CONSTRAINT chk_ai_external_mcp_servers_max_effect_read CHECK (max_effect = 'read'),
        CONSTRAINT chk_ai_external_mcp_servers_endpoint_object CHECK (endpoint_config_json IS NULL OR jsonb_typeof(endpoint_config_json) = 'object'),
        CONSTRAINT chk_ai_external_mcp_servers_credential_object CHECK (credential_ref_json IS NULL OR jsonb_typeof(credential_ref_json) = 'object'),
        CONSTRAINT chk_ai_external_mcp_servers_credential_kind CHECK (
          credential_ref_json IS NULL
          OR credential_ref_json->>'kind' IN ('none', 'secret_ref', 'environment')
        ),
        CONSTRAINT chk_ai_external_mcp_servers_redaction_object CHECK (redaction_policy_json IS NULL OR jsonb_typeof(redaction_policy_json) = 'object'),
        CONSTRAINT chk_ai_external_mcp_servers_metadata_object CHECK (metadata_json IS NULL OR jsonb_typeof(metadata_json) = 'object')
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_external_mcp_servers_tenant_enabled_created ON ai_external_mcp_servers(tenant_id, enabled, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_external_mcp_servers_tenant_transport_enabled ON ai_external_mcp_servers(tenant_id, transport_kind, enabled)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_external_mcp_tool_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        server_id uuid NOT NULL REFERENCES ai_external_mcp_servers(id) ON DELETE CASCADE,
        server_key text NOT NULL,
        external_tool_name text NOT NULL,
        capability_name text NOT NULL,
        capability_version text NOT NULL,
        tool_description text,
        input_schema_json jsonb NOT NULL,
        input_schema_hash text NOT NULL,
        schema_version text NOT NULL,
        effect text NOT NULL DEFAULT 'read',
        enabled boolean NOT NULL DEFAULT false,
        mcp_exposure_enabled boolean NOT NULL DEFAULT false,
        redaction_policy_json jsonb,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_external_mcp_tools_tenant_server_tool UNIQUE (tenant_id, server_id, external_tool_name),
        CONSTRAINT uq_ai_external_mcp_tools_tenant_capability UNIQUE (tenant_id, capability_name, capability_version),
        CONSTRAINT chk_ai_external_mcp_tools_server_key CHECK (server_key = lower(btrim(server_key)) AND server_key ~ '^[a-z0-9][a-z0-9_.-]{1,126}$'),
        CONSTRAINT chk_ai_external_mcp_tools_external_name CHECK (external_tool_name = btrim(external_tool_name) AND length(external_tool_name) BETWEEN 1 AND 128),
        CONSTRAINT chk_ai_external_mcp_tools_capability_name CHECK (capability_name LIKE 'external_mcp.%' AND length(capability_name) BETWEEN 16 AND 256),
        CONSTRAINT chk_ai_external_mcp_tools_capability_version CHECK (length(btrim(capability_version)) BETWEEN 1 AND 64),
        CONSTRAINT chk_ai_external_mcp_tools_schema_version CHECK (length(btrim(schema_version)) BETWEEN 1 AND 64),
        CONSTRAINT chk_ai_external_mcp_tools_schema_object CHECK (jsonb_typeof(input_schema_json) = 'object'),
        CONSTRAINT chk_ai_external_mcp_tools_hash CHECK (input_schema_hash ~ '^[a-f0-9]{64}$'),
        CONSTRAINT chk_ai_external_mcp_tools_effect_read CHECK (effect = 'read'),
        CONSTRAINT chk_ai_external_mcp_tools_mcp_exposure_disabled CHECK (mcp_exposure_enabled = false),
        CONSTRAINT chk_ai_external_mcp_tools_redaction_object CHECK (redaction_policy_json IS NULL OR jsonb_typeof(redaction_policy_json) = 'object'),
        CONSTRAINT chk_ai_external_mcp_tools_metadata_object CHECK (metadata_json IS NULL OR jsonb_typeof(metadata_json) = 'object')
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_external_mcp_tools_tenant_server_enabled ON ai_external_mcp_tool_snapshots(tenant_id, server_key, enabled)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_external_mcp_tools_tenant_capability ON ai_external_mcp_tool_snapshots(tenant_id, capability_name, capability_version)`);

    for (const table of TENANT_TABLES) {
      await enableTenantRls(queryRunner, table);
    }

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_ai_external_mcp_tenant_graph()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM ai_external_mcp_servers server
          WHERE server.id = NEW.server_id
            AND server.tenant_id = NEW.tenant_id
            AND server.server_key = NEW.server_key
        ) THEN
          RAISE EXCEPTION 'ai_external_mcp_tool_snapshots server_id must belong to the same tenant and server key';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_external_mcp_tools_tenant_graph ON ai_external_mcp_tool_snapshots`);
    await queryRunner.query(`
      CREATE TRIGGER trg_ai_external_mcp_tools_tenant_graph
      BEFORE INSERT OR UPDATE ON ai_external_mcp_tool_snapshots
      FOR EACH ROW
      EXECUTE FUNCTION enforce_ai_external_mcp_tenant_graph()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_external_mcp_tools_tenant_graph ON ai_external_mcp_tool_snapshots`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS enforce_ai_external_mcp_tenant_graph()`);
    for (const table of [...TENANT_TABLES].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
