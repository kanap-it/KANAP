import { MigrationInterface, QueryRunner } from 'typeorm';

const AI_ROLE_DEFINITIONS = [
  {
    name: 'AI Chat User',
    description: 'Can use read-only AI chat tools that respect existing business permissions',
    permissions: [{ resource: 'ai_chat', level: 'reader' }],
  },
  {
    name: 'AI Chat Operator',
    description: 'Can use AI chat features that prepare future confirmed AI actions',
    permissions: [{ resource: 'ai_chat', level: 'member' }],
  },
  {
    name: 'AI MCP User',
    description: 'Can use personal MCP API keys for read-only AI tools',
    permissions: [{ resource: 'ai_mcp', level: 'reader' }],
  },
  {
    name: 'AI Administrator',
    description: 'Can manage tenant AI settings and use both native chat and MCP read tools',
    permissions: [
      { resource: 'ai_chat', level: 'member' },
      { resource: 'ai_mcp', level: 'reader' },
      { resource: 'ai_settings', level: 'admin' },
    ],
  },
] as const;

export class AiPhase0Foundation1843500000000 implements MigrationInterface {
  name = 'AiPhase0Foundation1843500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        chat_enabled boolean NOT NULL DEFAULT false,
        mcp_enabled boolean NOT NULL DEFAULT false,
        llm_provider varchar(50),
        llm_api_key_encrypted text,
        llm_endpoint_url text,
        llm_model varchar(100),
        mcp_key_max_lifetime_days integer,
        conversation_retention_days integer,
        web_enrichment_enabled boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash text NOT NULL,
        key_prefix varchar(16) NOT NULL,
        label varchar(100) NOT NULL,
        expires_at timestamptz,
        last_used_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_api_keys_tenant_user ON ai_api_keys(tenant_id, user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_api_keys_tenant_revoked ON ai_api_keys(tenant_id, revoked_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_api_keys_key_prefix ON ai_api_keys(key_prefix)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_api_keys_tenant_prefix ON ai_api_keys(tenant_id, key_prefix)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text,
        provider varchar(50),
        model varchar(100),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        archived_at timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_user ON ai_conversations(tenant_id, user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_updated_at ON ai_conversations(tenant_id, updated_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        role varchar(20) NOT NULL,
        content text NOT NULL,
        tool_calls jsonb,
        usage_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created_at ON ai_messages(conversation_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_messages_tenant_created_at ON ai_messages(tenant_id, created_at)`);

    for (const table of ['ai_settings', 'ai_api_keys', 'ai_conversations', 'ai_messages']) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant())
      `);
    }

    const rlsTables = ['roles', 'role_permissions'];
    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }

    for (const role of AI_ROLE_DEFINITIONS) {
      await queryRunner.query(
        `
          INSERT INTO roles (tenant_id, role_name, role_description, is_built_in)
          SELECT t.id, $1, $2, true
          FROM tenants t
          WHERE NOT EXISTS (
            SELECT 1
            FROM roles existing
            WHERE existing.tenant_id = t.id
              AND existing.role_name = $1
          )
        `,
        [role.name, role.description],
      );

      await queryRunner.query(
        `
          UPDATE roles
          SET role_description = $2
          WHERE role_name = $1
            AND is_built_in = true
        `,
        [role.name, role.description],
      );

      for (const permission of role.permissions) {
        await queryRunner.query(
          `
            INSERT INTO role_permissions (tenant_id, role_id, resource, level)
            SELECT r.tenant_id, r.id, $2, $3
            FROM roles r
            WHERE r.role_name = $1
              AND r.is_built_in = true
              AND r.role_description = $4
            ON CONFLICT (role_id, resource)
            DO UPDATE
              SET level = EXCLUDED.level,
                  tenant_id = EXCLUDED.tenant_id
          `,
          [role.name, permission.resource, permission.level, role.description],
        );
      }
    }

    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const role of AI_ROLE_DEFINITIONS) {
      await queryRunner.query(
        `DELETE FROM role_permissions rp
         USING roles r
         WHERE rp.role_id = r.id
           AND r.role_name = $1
           AND r.is_built_in = true
           AND r.role_description = $2`,
        [role.name, role.description],
      );
      await queryRunner.query(
        `DELETE FROM roles
         WHERE role_name = $1
           AND is_built_in = true
           AND role_description = $2`,
        [role.name, role.description],
      );
    }

    for (const table of ['ai_messages', 'ai_conversations', 'ai_api_keys', 'ai_settings']) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS ai_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_conversations`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_settings`);
  }
}
