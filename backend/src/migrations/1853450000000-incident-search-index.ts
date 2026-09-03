import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Search index for the incident register (plan: planning/incident-register.md, §1).
 *
 * Adds the `incidents` type to the unified `search_index` (1853000000000): same
 * refresh-function + AFTER ROW trigger shape, so INC-N and the incident narrative
 * are reachable from the global search and the chat. No link trigger: membership
 * in incident_assets / incident_applications does not change the indexed text.
 */

type SearchIndexTypeSpec = {
  type: string;
  table: string;
  alias: string;
  refPrefix: string;
  refNumber: string;
  label: string;
  summary: string;
  status: string;
  extraJson: string;
  vector: string;
  updatedAt: string;
};

function tsv(weight: 'A' | 'B' | 'C', expr: string): string {
  return `search_index_tsv('${weight}', ${expr})`;
}

const INCIDENTS_SPEC: SearchIndexTypeSpec = {
  type: 'incidents',
  table: 'incidents',
  alias: 'i',
  refPrefix: `'INC'`,
  refNumber: 'i.item_number',
  label: 'i.title',
  summary: 'i.description',
  status: 'i.status',
  extraJson: `jsonb_build_object('severity', i.severity, 'category', i.category)`,
  vector: [
    tsv('A', `CONCAT_WS(' ', 'INC-' || i.item_number::text, i.title)`),
    tsv('B', `CONCAT_WS(' ', i.description, i.impact, i.root_cause)`),
    tsv('C', `CONCAT_WS(' ', i.corrective_actions, i.lessons_learned, i.source_ref)`),
  ].join(' || '),
  updatedAt: 'i.updated_at',
};

function refreshFunctionSql(spec: SearchIndexTypeSpec): string {
  const a = spec.alias;
  return `
    CREATE OR REPLACE FUNCTION search_index_refresh_${spec.type}(p_tenant uuid, p_ids uuid[] DEFAULT NULL)
    RETURNS void AS $fn$
      DELETE FROM search_index si_del
      WHERE si_del.tenant_id = p_tenant
        AND si_del.entity_type = '${spec.type}'
        AND (p_ids IS NULL OR si_del.entity_id = ANY(p_ids))
        AND NOT EXISTS (
          SELECT 1 FROM ${spec.table} src
          WHERE src.id = si_del.entity_id AND src.tenant_id = p_tenant
        );
      INSERT INTO search_index (
        tenant_id, entity_type, entity_id, ref_prefix, ref_number,
        label, summary, status, extra_json, search_vector, source_updated_at, indexed_at
      )
      SELECT ${a}.tenant_id,
             '${spec.type}',
             ${a}.id,
             ${spec.refPrefix},
             ${spec.refNumber},
             ${spec.label},
             ${spec.summary},
             ${spec.status},
             ${spec.extraJson},
             ${spec.vector},
             ${spec.updatedAt},
             now()
      FROM ${spec.table} ${a}
      WHERE ${a}.tenant_id = p_tenant
        AND (p_ids IS NULL OR ${a}.id = ANY(p_ids))
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
}

function syncTriggerSql(spec: SearchIndexTypeSpec): string {
  return `
    CREATE OR REPLACE FUNCTION search_index_sync_${spec.table}()
    RETURNS trigger AS $fn$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM search_index_delete(OLD.tenant_id, '${spec.type}', OLD.id);
        RETURN OLD;
      END IF;
      PERFORM search_index_refresh_${spec.type}(NEW.tenant_id, ARRAY[NEW.id]);
      RETURN NEW;
    END
    $fn$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_search_index_${spec.table} ON ${spec.table};
    CREATE TRIGGER trg_search_index_${spec.table}
    AFTER INSERT OR UPDATE OR DELETE ON ${spec.table}
    FOR EACH ROW
    EXECUTE FUNCTION search_index_sync_${spec.table}();
  `;
}

// Per-tenant loop: set_config(..., true) is transaction-local and keeps the
// search_index RLS WITH CHECK satisfied for each tenant in turn.
const BACKFILL_ALL_TENANTS = `
  DO $do$
  DECLARE
    t RECORD;
  BEGIN
    FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
      PERFORM set_config('app.current_tenant', t.id::text, true);
      PERFORM search_index_refresh_incidents(t.id);
    END LOOP;
  END
  $do$
`;

const DELETE_ALL_TENANTS = `
  DO $do$
  DECLARE
    t RECORD;
  BEGIN
    FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
      PERFORM set_config('app.current_tenant', t.id::text, true);
      DELETE FROM search_index WHERE tenant_id = t.id AND entity_type = 'incidents';
    END LOOP;
  END
  $do$
`;

export class IncidentSearchIndex1853450000000 implements MigrationInterface {
  name = 'IncidentSearchIndex1853450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(refreshFunctionSql(INCIDENTS_SPEC));
    await queryRunner.query(syncTriggerSql(INCIDENTS_SPEC));
    await queryRunner.query(BACKFILL_ALL_TENANTS);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(DELETE_ALL_TENANTS);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_search_index_incidents ON incidents`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS search_index_sync_incidents()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS search_index_refresh_incidents(uuid, uuid[])`);
  }
}
