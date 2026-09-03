import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tasks search index: include the related incident title in weight C.
 *
 * Same follow-up shape as 1853220000000-capex-search-index-ref.ts. The original
 * TYPE_SPECS in 1853000000000 is left untouched. Related-entity renames are
 * still not trigger-cascaded; freshness comes from this reindex (and the daily job).
 */

const TASKS_REFRESH_WITH_INCIDENT = `
  CREATE OR REPLACE FUNCTION search_index_refresh_tasks(p_tenant uuid, p_ids uuid[] DEFAULT NULL)
  RETURNS void AS $fn$
    DELETE FROM search_index si_del
    WHERE si_del.tenant_id = p_tenant
      AND si_del.entity_type = 'tasks'
      AND (p_ids IS NULL OR si_del.entity_id = ANY(p_ids))
      AND NOT EXISTS (
        SELECT 1 FROM tasks src
        WHERE src.id = si_del.entity_id AND src.tenant_id = p_tenant
      );
    INSERT INTO search_index (
      tenant_id, entity_type, entity_id, ref_prefix, ref_number,
      label, summary, status, extra_json, search_vector, source_updated_at, indexed_at
    )
    SELECT t.tenant_id,
           'tasks',
           t.id,
           'T',
           t.item_number,
           COALESCE(t.title, 'Untitled task'),
           t.description,
           t.status::text,
           jsonb_build_object(
      'assignee', NULLIF(COALESCE(NULLIF(TRIM(CONCAT(u_assign.first_name, ' ', u_assign.last_name)), ''), u_assign.email), ''),
      'creator', NULLIF(COALESCE(NULLIF(TRIM(CONCAT(u_creator.first_name, ' ', u_creator.last_name)), ''), u_creator.email), '')
    ),
           search_index_tsv('A', CONCAT_WS(' ', 'T-' || t.item_number::text, t.title))
             || search_index_tsv('B', CONCAT_WS(' ', t.status::text, t.priority_level, t.related_object_type, tt.name, pc.name, ps.name))
             || search_index_tsv('C', CONCAT_WS(' ', t.description, COALESCE(NULLIF(TRIM(CONCAT(u_assign.first_name, ' ', u_assign.last_name)), ''), u_assign.email), COALESCE(NULLIF(TRIM(CONCAT(u_creator.first_name, ' ', u_creator.last_name)), ''), u_creator.email), co.name, rel_proj.name, rel_si.product_name, rel_ct.name, rel_cx.description, rel_inc.title, (
        SELECT string_agg(lbl, ' ')
        FROM jsonb_array_elements_text(COALESCE(t.labels, '[]'::jsonb)) lbl
      ))),
           t.updated_at,
           now()
    FROM tasks t
    LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id AND u_assign.tenant_id = t.tenant_id
     LEFT JOIN users u_creator ON u_creator.id = t.creator_id AND u_creator.tenant_id = t.tenant_id
     LEFT JOIN portfolio_task_types tt ON tt.id = t.task_type_id AND tt.tenant_id = t.tenant_id
     LEFT JOIN companies co ON co.id = t.company_id AND co.tenant_id = t.tenant_id
     LEFT JOIN portfolio_categories pc ON pc.id = t.category_id AND pc.tenant_id = t.tenant_id
     LEFT JOIN portfolio_streams ps ON ps.id = t.stream_id AND ps.tenant_id = t.tenant_id
     LEFT JOIN portfolio_projects rel_proj ON rel_proj.id = t.related_object_id AND t.related_object_type = 'project' AND rel_proj.tenant_id = t.tenant_id
     LEFT JOIN spend_items rel_si ON rel_si.id = t.related_object_id AND t.related_object_type = 'spend_item' AND rel_si.tenant_id = t.tenant_id
     LEFT JOIN contracts rel_ct ON rel_ct.id = t.related_object_id AND t.related_object_type = 'contract' AND rel_ct.tenant_id = t.tenant_id
     LEFT JOIN capex_items rel_cx ON rel_cx.id = t.related_object_id AND t.related_object_type = 'capex_item' AND rel_cx.tenant_id = t.tenant_id
     LEFT JOIN incidents rel_inc ON rel_inc.id = t.related_object_id AND t.related_object_type = 'incident' AND rel_inc.tenant_id = t.tenant_id
    WHERE t.tenant_id = p_tenant
      AND (p_ids IS NULL OR t.id = ANY(p_ids))
    ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE SET
      ref_prefix = EXCLUDED.ref_prefix,
      ref_number = EXCLUDED.ref_number,
      label = EXCLUDED.label,
      summary = EXCLUDED.summary,
      status = EXCLUDED.status,
      extra_json = EXCLUDED.extra_json,
      search_vector = EXCLUDED.search_vector,
      source_updated_at = EXCLUDED.source_updated_at,
      indexed_at = EXCLUDED.indexed_at;
  $fn$ LANGUAGE sql;
`;

// Body retrieved via pg_get_functiondef on the dev DB (2026-09-03), before this migration.
const TASKS_REFRESH_WITHOUT_INCIDENT = `
  CREATE OR REPLACE FUNCTION search_index_refresh_tasks(p_tenant uuid, p_ids uuid[] DEFAULT NULL)
  RETURNS void AS $fn$
    DELETE FROM search_index si_del
    WHERE si_del.tenant_id = p_tenant
      AND si_del.entity_type = 'tasks'
      AND (p_ids IS NULL OR si_del.entity_id = ANY(p_ids))
      AND NOT EXISTS (
        SELECT 1 FROM tasks src
        WHERE src.id = si_del.entity_id AND src.tenant_id = p_tenant
      );
    INSERT INTO search_index (
      tenant_id, entity_type, entity_id, ref_prefix, ref_number,
      label, summary, status, extra_json, search_vector, source_updated_at, indexed_at
    )
    SELECT t.tenant_id,
           'tasks',
           t.id,
           'T',
           t.item_number,
           COALESCE(t.title, 'Untitled task'),
           t.description,
           t.status::text,
           jsonb_build_object(
      'assignee', NULLIF(COALESCE(NULLIF(TRIM(CONCAT(u_assign.first_name, ' ', u_assign.last_name)), ''), u_assign.email), ''),
      'creator', NULLIF(COALESCE(NULLIF(TRIM(CONCAT(u_creator.first_name, ' ', u_creator.last_name)), ''), u_creator.email), '')
    ),
           search_index_tsv('A', CONCAT_WS(' ', 'T-' || t.item_number::text, t.title))
             || search_index_tsv('B', CONCAT_WS(' ', t.status::text, t.priority_level, t.related_object_type, tt.name, pc.name, ps.name))
             || search_index_tsv('C', CONCAT_WS(' ', t.description, COALESCE(NULLIF(TRIM(CONCAT(u_assign.first_name, ' ', u_assign.last_name)), ''), u_assign.email), COALESCE(NULLIF(TRIM(CONCAT(u_creator.first_name, ' ', u_creator.last_name)), ''), u_creator.email), co.name, rel_proj.name, rel_si.product_name, rel_ct.name, rel_cx.description, (
        SELECT string_agg(lbl, ' ')
        FROM jsonb_array_elements_text(COALESCE(t.labels, '[]'::jsonb)) lbl
      ))),
           t.updated_at,
           now()
    FROM tasks t
    LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id AND u_assign.tenant_id = t.tenant_id
     LEFT JOIN users u_creator ON u_creator.id = t.creator_id AND u_creator.tenant_id = t.tenant_id
     LEFT JOIN portfolio_task_types tt ON tt.id = t.task_type_id AND tt.tenant_id = t.tenant_id
     LEFT JOIN companies co ON co.id = t.company_id AND co.tenant_id = t.tenant_id
     LEFT JOIN portfolio_categories pc ON pc.id = t.category_id AND pc.tenant_id = t.tenant_id
     LEFT JOIN portfolio_streams ps ON ps.id = t.stream_id AND ps.tenant_id = t.tenant_id
     LEFT JOIN portfolio_projects rel_proj ON rel_proj.id = t.related_object_id AND t.related_object_type = 'project' AND rel_proj.tenant_id = t.tenant_id
     LEFT JOIN spend_items rel_si ON rel_si.id = t.related_object_id AND t.related_object_type = 'spend_item' AND rel_si.tenant_id = t.tenant_id
     LEFT JOIN contracts rel_ct ON rel_ct.id = t.related_object_id AND t.related_object_type = 'contract' AND rel_ct.tenant_id = t.tenant_id
     LEFT JOIN capex_items rel_cx ON rel_cx.id = t.related_object_id AND t.related_object_type = 'capex_item' AND rel_cx.tenant_id = t.tenant_id
    WHERE t.tenant_id = p_tenant
      AND (p_ids IS NULL OR t.id = ANY(p_ids))
    ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE SET
      ref_prefix = EXCLUDED.ref_prefix,
      ref_number = EXCLUDED.ref_number,
      label = EXCLUDED.label,
      summary = EXCLUDED.summary,
      status = EXCLUDED.status,
      extra_json = EXCLUDED.extra_json,
      search_vector = EXCLUDED.search_vector,
      source_updated_at = EXCLUDED.source_updated_at,
      indexed_at = EXCLUDED.indexed_at;
  $fn$ LANGUAGE sql;
`;

const TASKS_SYNC_TRIGGER = `
  CREATE OR REPLACE FUNCTION search_index_sync_tasks()
  RETURNS trigger AS $fn$
  BEGIN
    IF TG_OP = 'DELETE' THEN
      PERFORM search_index_delete(OLD.tenant_id, 'tasks', OLD.id);
      RETURN OLD;
    END IF;
    PERFORM search_index_refresh_tasks(NEW.tenant_id, ARRAY[NEW.id]);
    RETURN NEW;
  END
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_search_index_tasks ON tasks;
  CREATE TRIGGER trg_search_index_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION search_index_sync_tasks();
`;

const REFRESH_ALL_TASKS_TENANTS = `
  DO $do$
  DECLARE
    t RECORD;
  BEGIN
    FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
      PERFORM set_config('app.current_tenant', t.id::text, true);
      PERFORM search_index_refresh_tasks(t.id);
    END LOOP;
  END
  $do$
`;

export class TaskSearchIndexIncidentRef1853460000000 implements MigrationInterface {
  name = 'TaskSearchIndexIncidentRef1853460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(TASKS_REFRESH_WITH_INCIDENT);
    await queryRunner.query(TASKS_SYNC_TRIGGER);
    await queryRunner.query(REFRESH_ALL_TASKS_TENANTS);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(TASKS_REFRESH_WITHOUT_INCIDENT);
    await queryRunner.query(TASKS_SYNC_TRIGGER);
    await queryRunner.query(REFRESH_ALL_TASKS_TENANTS);
  }
}
