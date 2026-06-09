import { MigrationInterface, QueryRunner } from 'typeorm';

const TENANT_TABLES = [
  'ai_agent_definitions',
  'ai_agent_triggers',
  'ai_agent_work_items',
  'ai_agent_target_states',
];

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

export class AiAgentDefinitionsWorkQueuesPhase101852600000000 implements MigrationInterface {
  name = 'AiAgentDefinitionsWorkQueuesPhase101852600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_agent_definitions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        agent_key text NOT NULL,
        name text NOT NULL,
        description text,
        agent_type text NOT NULL,
        status text NOT NULL,
        environment text NOT NULL,
        provider_bindings_json jsonb,
        allowed_capabilities_json jsonb,
        forbidden_capabilities_json jsonb,
        max_autonomy_level text NOT NULL,
        default_approval_requirement text NOT NULL,
        trigger_policy_json jsonb,
        scope_policy_json jsonb,
        queue_policy_json jsonb,
        response_policy_json jsonb,
        evaluation_policy_json jsonb,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_agent_definitions_tenant_key UNIQUE (tenant_id, agent_key),
        CONSTRAINT chk_ai_agent_definitions_key_not_empty CHECK (btrim(agent_key) <> '' AND agent_key NOT LIKE '%*%'),
        CONSTRAINT chk_ai_agent_definitions_name_not_empty CHECK (btrim(name) <> ''),
        CONSTRAINT chk_ai_agent_definitions_type CHECK (agent_type IN ('helpdesk', 'sre', 'software_dev', 'code_review', 'custom')),
        CONSTRAINT chk_ai_agent_definitions_status CHECK (status IN ('draft', 'enabled', 'disabled', 'archived')),
        CONSTRAINT chk_ai_agent_definitions_environment CHECK (
          environment = lower(btrim(environment))
          AND environment IN ('production', 'staging', 'sandbox', 'lab', 'mock')
        ),
        CONSTRAINT chk_ai_agent_definitions_autonomy CHECK (max_autonomy_level IN ('A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6')),
        CONSTRAINT chk_ai_agent_definitions_approval CHECK (
          default_approval_requirement IN ('none', 'human_for_writes', 'human', 'policy')
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_definitions_tenant_status_type
      ON ai_agent_definitions(tenant_id, status, agent_type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_definitions_tenant_environment_status
      ON ai_agent_definitions(tenant_id, environment, status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_agent_triggers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        agent_definition_id uuid NOT NULL REFERENCES ai_agent_definitions(id) ON DELETE CASCADE,
        trigger_key text NOT NULL,
        trigger_kind text NOT NULL,
        status text NOT NULL,
        enabled boolean NOT NULL DEFAULT false,
        trigger_policy_json jsonb,
        scope_policy_json jsonb,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_agent_triggers_tenant_agent_key UNIQUE (tenant_id, agent_definition_id, trigger_key),
        CONSTRAINT chk_ai_agent_triggers_key_not_empty CHECK (btrim(trigger_key) <> '' AND trigger_key NOT LIKE '%*%'),
        CONSTRAINT chk_ai_agent_triggers_kind CHECK (
          trigger_kind IN ('manual', 'scheduled_poll', 'provider_webhook', 'monitoring_alert', 'ticket_update', 'mcp_request')
        ),
        CONSTRAINT chk_ai_agent_triggers_status CHECK (status IN ('draft', 'enabled', 'disabled', 'archived')),
        CONSTRAINT chk_ai_agent_triggers_enabled_status CHECK (
          enabled = false OR status = 'enabled'
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_triggers_tenant_kind_enabled
      ON ai_agent_triggers(tenant_id, trigger_kind, enabled)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_agent_work_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        agent_definition_id uuid NOT NULL REFERENCES ai_agent_definitions(id) ON DELETE CASCADE,
        trigger_id uuid REFERENCES ai_agent_triggers(id) ON DELETE SET NULL,
        source_provider_kind text NOT NULL,
        source_provider_key text NOT NULL,
        source_object_type text NOT NULL,
        source_object_ref text NOT NULL,
        source_object_updated_at timestamptz,
        work_kind text NOT NULL,
        status text NOT NULL,
        priority int NOT NULL DEFAULT 100,
        dedup_key text NOT NULL,
        lease_owner text,
        leased_until timestamptz,
        attempt_count int NOT NULL DEFAULT 0,
        max_attempts int NOT NULL DEFAULT 3,
        next_attempt_at timestamptz NOT NULL DEFAULT now(),
        last_run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
        last_action_request_ids jsonb,
        last_error text,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_ai_agent_work_items_provider_kind CHECK (
          source_provider_kind IN ('ticketing', 'monitoring', 'virtualization', 'directory', 'automation', 'kanap_domain')
        ),
        CONSTRAINT chk_ai_agent_work_items_status CHECK (
          status IN ('queued', 'leased', 'running', 'waiting_approval', 'completed', 'failed', 'skipped', 'dead_letter')
        ),
        CONSTRAINT chk_ai_agent_work_items_work_kind CHECK (
          work_kind IN ('ticket_triage', 'ticket_followup', 'monitoring_alert_diagnostic', 'manual_task')
        ),
        CONSTRAINT chk_ai_agent_work_items_priority CHECK (priority >= 0 AND priority <= 1000),
        CONSTRAINT chk_ai_agent_work_items_attempts CHECK (attempt_count >= 0 AND max_attempts >= 1 AND max_attempts <= 20),
        CONSTRAINT chk_ai_agent_work_items_refs_not_empty CHECK (
          btrim(source_provider_key) <> ''
          AND btrim(source_object_type) <> ''
          AND btrim(source_object_ref) <> ''
          AND btrim(dedup_key) <> ''
        ),
        CONSTRAINT chk_ai_agent_work_items_no_wildcards CHECK (
          source_provider_key NOT LIKE '%*%'
          AND source_object_type NOT LIKE '%*%'
          AND source_object_ref NOT LIKE '%*%'
          AND dedup_key NOT LIKE '%*%'
        ),
        CONSTRAINT chk_ai_agent_work_items_no_broad_refs CHECK (
          lower(btrim(source_provider_key)) NOT IN ('all', 'any', 'everyone', 'unrestricted')
          AND lower(btrim(source_object_ref)) NOT IN ('all', 'any', 'everyone', 'unrestricted', 'all_tickets', 'all-tickets')
        ),
        CONSTRAINT chk_ai_agent_work_items_last_action_ids_array CHECK (
          last_action_request_ids IS NULL OR jsonb_typeof(last_action_request_ids) = 'array'
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_work_items_tenant_agent_status_priority
      ON ai_agent_work_items(tenant_id, agent_definition_id, status, priority, next_attempt_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_work_items_tenant_source
      ON ai_agent_work_items(tenant_id, source_provider_kind, source_provider_key, source_object_type, source_object_ref)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_work_items_tenant_last_run
      ON ai_agent_work_items(tenant_id, last_run_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_agent_work_items_active_dedup
      ON ai_agent_work_items(tenant_id, agent_definition_id, dedup_key)
      WHERE status IN ('queued', 'leased', 'running', 'waiting_approval', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_agent_target_states (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        agent_definition_id uuid NOT NULL REFERENCES ai_agent_definitions(id) ON DELETE CASCADE,
        provider_kind text NOT NULL,
        provider_key text NOT NULL,
        target_type text NOT NULL,
        target_ref text NOT NULL,
        last_seen_external_updated_at timestamptz,
        last_processed_external_updated_at timestamptz,
        last_run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
        last_public_reply_hash text,
        last_internal_note_hash text,
        last_classification_hash text,
        last_assignment_hash text,
        agent_touched boolean NOT NULL DEFAULT false,
        needs_followup boolean NOT NULL DEFAULT false,
        state_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ai_agent_target_states_target UNIQUE (
          tenant_id, agent_definition_id, provider_kind, provider_key, target_type, target_ref
        ),
        CONSTRAINT chk_ai_agent_target_states_provider_kind CHECK (
          provider_kind IN ('ticketing', 'monitoring', 'virtualization', 'directory', 'automation', 'kanap_domain')
        ),
        CONSTRAINT chk_ai_agent_target_states_refs_not_empty CHECK (
          btrim(provider_key) <> ''
          AND btrim(target_type) <> ''
          AND btrim(target_ref) <> ''
        ),
        CONSTRAINT chk_ai_agent_target_states_no_wildcards CHECK (
          provider_key NOT LIKE '%*%'
          AND target_type NOT LIKE '%*%'
          AND target_ref NOT LIKE '%*%'
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_target_states_tenant_followup
      ON ai_agent_target_states(tenant_id, needs_followup, updated_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_target_states_tenant_last_run
      ON ai_agent_target_states(tenant_id, last_run_id)
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ai_phase10_assert_tenant_links()
      RETURNS trigger AS $$
      DECLARE
        linked_tenant uuid;
      BEGIN
        IF TG_TABLE_NAME = 'ai_agent_triggers' THEN
          SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
          IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
            RAISE EXCEPTION 'cross-tenant ai_agent_triggers.agent_definition_id link';
          END IF;
          RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'ai_agent_work_items' THEN
          SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
          IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
            RAISE EXCEPTION 'cross-tenant ai_agent_work_items.agent_definition_id link';
          END IF;

          IF NEW.trigger_id IS NOT NULL THEN
            SELECT tenant_id INTO linked_tenant FROM ai_agent_triggers WHERE id = NEW.trigger_id;
            IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
              RAISE EXCEPTION 'cross-tenant ai_agent_work_items.trigger_id link';
            END IF;
          END IF;

          IF NEW.last_run_id IS NOT NULL THEN
            SELECT tenant_id INTO linked_tenant FROM ai_runs WHERE id = NEW.last_run_id;
            IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
              RAISE EXCEPTION 'cross-tenant ai_agent_work_items.last_run_id link';
            END IF;
          END IF;

          RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'ai_agent_target_states' THEN
          SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
          IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
            RAISE EXCEPTION 'cross-tenant ai_agent_target_states.agent_definition_id link';
          END IF;

          IF NEW.last_run_id IS NOT NULL THEN
            SELECT tenant_id INTO linked_tenant FROM ai_runs WHERE id = NEW.last_run_id;
            IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
              RAISE EXCEPTION 'cross-tenant ai_agent_target_states.last_run_id link';
            END IF;
          END IF;

          RETURN NEW;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ai_agent_triggers_tenant_links ON ai_agent_triggers;
      CREATE TRIGGER trg_ai_agent_triggers_tenant_links
      BEFORE INSERT OR UPDATE ON ai_agent_triggers
      FOR EACH ROW EXECUTE FUNCTION ai_phase10_assert_tenant_links()
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ai_agent_work_items_tenant_links ON ai_agent_work_items;
      CREATE TRIGGER trg_ai_agent_work_items_tenant_links
      BEFORE INSERT OR UPDATE ON ai_agent_work_items
      FOR EACH ROW EXECUTE FUNCTION ai_phase10_assert_tenant_links()
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ai_agent_target_states_tenant_links ON ai_agent_target_states;
      CREATE TRIGGER trg_ai_agent_target_states_tenant_links
      BEFORE INSERT OR UPDATE ON ai_agent_target_states
      FOR EACH ROW EXECUTE FUNCTION ai_phase10_assert_tenant_links()
    `);

    for (const table of TENANT_TABLES) {
      await enableTenantRls(queryRunner, table);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_agent_target_states_tenant_links ON ai_agent_target_states`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_agent_work_items_tenant_links ON ai_agent_work_items`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_agent_triggers_tenant_links ON ai_agent_triggers`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS ai_phase10_assert_tenant_links()`);

    for (const table of [...TENANT_TABLES].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS ai_agent_target_states`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_ai_agent_work_items_active_dedup`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_agent_work_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_agent_triggers`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_agent_definitions`);
  }
}
