import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deletes product-owned built-in agent rows that were lazily seeded and never
 * put to work. Used leftovers (any work item, target state, ingestion stamp,
 * operator edit, or soft-linked approval/policy) stay and become ordinary
 * deletable agents.
 *
 * The migration role is not BYPASSRLS and these tables are FORCE ROW LEVEL
 * SECURITY on tenant_id = app_current_tenant(). A bare DELETE is a silent
 * no-op. Loop tenants with a transaction-local set_config — the same shape
 * as 1853100000000. Do not DISABLE ROW LEVEL SECURITY.
 *
 * down() is a documented no-op: these rows were runtime-seeded, never
 * migration-created.
 */
export class DropBuiltinAgentDefinitions1853410000000 implements MigrationInterface {
  name = 'DropBuiltinAgentDefinitions1853410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $do$
      DECLARE t RECORD; n INTEGER;
      BEGIN
        FOR t IN SELECT id FROM tenants LOOP
          PERFORM set_config('app.current_tenant', t.id::text, true);

          DELETE FROM ai_agent_definitions d
          WHERE d.tenant_id = t.id
            AND d.agent_key IN ('helpdesk.glpi.triage', 'sre.monitoring.diagnosis')
            -- only rows the seeder wrote
            AND COALESCE(d.metadata_json ->> 'product_owned', '') = 'true'
            -- never touch an agent an operator edited
            AND COALESCE(d.metadata_json ->> 'user_modified', '') <> 'true'
            -- never touch one that has ever polled
            AND NOT COALESCE(d.metadata_json ? 'helpdesk_ingestion_state',   false)
            AND NOT COALESCE(d.metadata_json ? 'monitoring_ingestion_state', false)
            -- never touch one that is watching — both shapes hasEnabledFlag accepts
            AND COALESCE(d.trigger_policy_json ->> 'scheduled_poll', '') <> 'true'
            AND COALESCE(d.trigger_policy_json -> 'scheduled_poll' ->> 'enabled', '') <> 'true'
            -- the one scope block the retired settings endpoint could enable without a stamp
            AND COALESCE(d.scope_policy_json -> 'new_tickets_only' ->> 'enabled', '') <> 'true'
            -- never touch one with any queue history
            AND NOT EXISTS (SELECT 1 FROM ai_agent_work_items w
                            WHERE w.tenant_id = t.id AND w.agent_definition_id = d.id)
            AND NOT EXISTS (SELECT 1 FROM ai_agent_target_states s
                            WHERE s.tenant_id = t.id AND s.agent_definition_id = d.id)
            -- never orphan an approval, of any status
            AND NOT EXISTS (SELECT 1 FROM ai_action_requests a
                            WHERE a.tenant_id = t.id
                              AND a.metadata_json ->> 'agent_definition_id' = d.id::text)
            -- never orphan a learned autonomy grant (soft ref, no FK)
            AND NOT EXISTS (SELECT 1 FROM ai_approval_policies p
                            WHERE p.tenant_id = t.id
                              AND p.metadata_json ->> 'agent_definition_id' = d.id::text);

          GET DIAGNOSTICS n = ROW_COUNT;
          IF n > 0 THEN RAISE NOTICE 'tenant %: removed % pristine built-in agent(s)', t.id, n; END IF;
        END LOOP;
      END
      $do$;
    `);
  }

  public async down(): Promise<void> {
    // Runtime-seeded rows; nothing to restore.
  }
}
