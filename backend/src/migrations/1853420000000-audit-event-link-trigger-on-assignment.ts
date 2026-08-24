import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tenant-link triggers on agent audit events (phase 11) and work-queue tables
 * (phase 10) are the isolation guard for UUID FKs, which are RLS-exempt.
 *
 * They used to re-validate every non-null link on every UPDATE. That races with
 * ON DELETE SET NULL of a sibling column during the same-command CASCADE of an
 * agent definition: the referenced row is already gone, SELECT returns NULL,
 * and the trigger raises a false "cross-tenant" error. Same-tenant delete of a
 * used agent then fails.
 *
 * Validate a link only when that column is newly assigned (INSERT, or UPDATE
 * that changes it to a non-null UUID). Unchanged links and SET NULL are skipped.
 * Fail-closed on assignment is unchanged: missing or other-tenant rows still raise.
 *
 * Keep SECURITY INVOKER. Do not SET row_security = off.
 */
export class AuditEventLinkTriggerOnAssignment1853420000000 implements MigrationInterface {
  name = 'AuditEventLinkTriggerOnAssignment1853420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ai_phase11_assert_agent_audit_event_links()
      RETURNS trigger AS $$
      DECLARE
        linked_tenant uuid;
      BEGIN
        -- FKs are RLS-exempt; this trigger is the tenant-isolation guard.
        -- Re-checking an unchanged link during ON DELETE SET NULL of a sibling
        -- column races with CASCADE of the referenced row in the same command.
        IF NEW.agent_definition_id IS NOT NULL
           AND (TG_OP = 'INSERT' OR NEW.agent_definition_id IS DISTINCT FROM OLD.agent_definition_id) THEN
          SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
          IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
            RAISE EXCEPTION 'cross-tenant ai_agent_audit_events.agent_definition_id link';
          END IF;
        END IF;

        IF NEW.work_item_id IS NOT NULL
           AND (TG_OP = 'INSERT' OR NEW.work_item_id IS DISTINCT FROM OLD.work_item_id) THEN
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
      CREATE OR REPLACE FUNCTION ai_phase10_assert_tenant_links()
      RETURNS trigger AS $$
      DECLARE
        linked_tenant uuid;
      BEGIN
        -- FKs are RLS-exempt; this trigger is the tenant-isolation guard.
        -- Re-checking an unchanged link during ON DELETE SET NULL of a sibling
        -- column races with CASCADE of the referenced row in the same command.
        IF TG_TABLE_NAME = 'ai_agent_triggers' THEN
          IF NEW.agent_definition_id IS NOT NULL
             AND (TG_OP = 'INSERT' OR NEW.agent_definition_id IS DISTINCT FROM OLD.agent_definition_id) THEN
            SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
            IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
              RAISE EXCEPTION 'cross-tenant ai_agent_triggers.agent_definition_id link';
            END IF;
          END IF;
          RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'ai_agent_work_items' THEN
          IF NEW.agent_definition_id IS NOT NULL
             AND (TG_OP = 'INSERT' OR NEW.agent_definition_id IS DISTINCT FROM OLD.agent_definition_id) THEN
            SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
            IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
              RAISE EXCEPTION 'cross-tenant ai_agent_work_items.agent_definition_id link';
            END IF;
          END IF;

          IF NEW.trigger_id IS NOT NULL
             AND (TG_OP = 'INSERT' OR NEW.trigger_id IS DISTINCT FROM OLD.trigger_id) THEN
            SELECT tenant_id INTO linked_tenant FROM ai_agent_triggers WHERE id = NEW.trigger_id;
            IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
              RAISE EXCEPTION 'cross-tenant ai_agent_work_items.trigger_id link';
            END IF;
          END IF;

          IF NEW.last_run_id IS NOT NULL
             AND (TG_OP = 'INSERT' OR NEW.last_run_id IS DISTINCT FROM OLD.last_run_id) THEN
            SELECT tenant_id INTO linked_tenant FROM ai_runs WHERE id = NEW.last_run_id;
            IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
              RAISE EXCEPTION 'cross-tenant ai_agent_work_items.last_run_id link';
            END IF;
          END IF;

          RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'ai_agent_target_states' THEN
          IF NEW.agent_definition_id IS NOT NULL
             AND (TG_OP = 'INSERT' OR NEW.agent_definition_id IS DISTINCT FROM OLD.agent_definition_id) THEN
            SELECT tenant_id INTO linked_tenant FROM ai_agent_definitions WHERE id = NEW.agent_definition_id;
            IF linked_tenant IS NULL OR linked_tenant <> NEW.tenant_id THEN
              RAISE EXCEPTION 'cross-tenant ai_agent_target_states.agent_definition_id link';
            END IF;
          END IF;

          IF NEW.last_run_id IS NOT NULL
             AND (TG_OP = 'INSERT' OR NEW.last_run_id IS DISTINCT FROM OLD.last_run_id) THEN
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
  }
}
