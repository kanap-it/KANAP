import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiAgentProductionEvalPhase111852800000000 implements MigrationInterface {
  name = 'AiAgentProductionEvalPhase111852800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_agent_audit_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        agent_definition_id uuid REFERENCES ai_agent_definitions(id) ON DELETE SET NULL,
        work_item_id uuid REFERENCES ai_agent_work_items(id) ON DELETE SET NULL,
        event_type text NOT NULL,
        severity text NOT NULL,
        message text NOT NULL,
        metadata_json jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_ai_agent_audit_events_type_not_empty CHECK (btrim(event_type) <> ''),
        CONSTRAINT chk_ai_agent_audit_events_severity CHECK (severity IN ('info', 'warning', 'error')),
        CONSTRAINT chk_ai_agent_audit_events_message_not_empty CHECK (btrim(message) <> '')
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_events_tenant_agent_created
      ON ai_agent_audit_events(tenant_id, agent_definition_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_events_tenant_type_created
      ON ai_agent_audit_events(tenant_id, event_type, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_events_tenant_severity_created
      ON ai_agent_audit_events(tenant_id, severity, created_at)
    `);
    await queryRunner.query(`ALTER TABLE ai_agent_audit_events ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ai_agent_audit_events FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS ai_agent_audit_events_tenant_isolation ON ai_agent_audit_events`);
    await queryRunner.query(`
      CREATE POLICY ai_agent_audit_events_tenant_isolation ON ai_agent_audit_events
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ai_phase11_assert_agent_audit_event_links()
      RETURNS trigger AS $$
      DECLARE
        linked_tenant uuid;
      BEGIN
        IF NEW.agent_definition_id IS NOT NULL THEN
          SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
          IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
            RAISE EXCEPTION 'cross-tenant ai_agent_audit_events.agent_definition_id link';
          END IF;
        END IF;

        IF NEW.work_item_id IS NOT NULL THEN
          SELECT tenant_id INTO linked_tenant FROM ai_agent_work_items WHERE id = NEW.work_item_id;
          IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
            RAISE EXCEPTION 'cross-tenant ai_agent_audit_events.work_item_id link';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ai_agent_audit_events_tenant_links ON ai_agent_audit_events;
      CREATE TRIGGER trg_ai_agent_audit_events_tenant_links
      BEFORE INSERT OR UPDATE ON ai_agent_audit_events
      FOR EACH ROW EXECUTE FUNCTION ai_phase11_assert_agent_audit_event_links()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_ai_agent_audit_events_tenant_links ON ai_agent_audit_events`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS ai_phase11_assert_agent_audit_event_links()`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_agent_audit_events`);
  }
}
