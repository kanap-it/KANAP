import { MigrationInterface, QueryRunner } from 'typeorm';

const CAPEX_REFRESH_WITH_REF = `
  CREATE OR REPLACE FUNCTION search_index_refresh_capex_items(p_tenant uuid, p_ids uuid[] DEFAULT NULL)
  RETURNS void AS $fn$
    DELETE FROM search_index si_del
    WHERE si_del.tenant_id = p_tenant
      AND si_del.entity_type = 'capex_items'
      AND (p_ids IS NULL OR si_del.entity_id = ANY(p_ids))
      AND NOT EXISTS (
        SELECT 1 FROM capex_items src
        WHERE src.id = si_del.entity_id AND src.tenant_id = p_tenant
      );
    INSERT INTO search_index (
      tenant_id, entity_type, entity_id, ref_prefix, ref_number,
      label, summary, status, extra_json, search_vector, source_updated_at, indexed_at
    )
    SELECT ci.tenant_id,
           'capex_items',
           ci.id,
           'CPX',
           ci.item_number,
           ci.description,
           NULLIF(CONCAT_WS(' | ', comp.name, sup.name, ci.ppe_type::text, ci.investment_type), ''),
           ci.status::text,
           jsonb_build_object('paying_company', comp.name, 'supplier', sup.name),
           search_index_tsv('A', CONCAT_WS(' ', 'CPX-' || ci.item_number::text, ci.description))
             || search_index_tsv('B', CONCAT_WS(' ', ci.ppe_type::text, ci.investment_type, ci.priority, ci.currency))
             || search_index_tsv('C', CONCAT_WS(' ', ci.notes, comp.name, sup.name)),
           ci.updated_at,
           now()
    FROM capex_items ci
    LEFT JOIN companies comp ON comp.id = ci.paying_company_id AND comp.tenant_id = ci.tenant_id
    LEFT JOIN suppliers sup ON sup.id = ci.supplier_id AND sup.tenant_id = ci.tenant_id
    WHERE ci.tenant_id = p_tenant
      AND (p_ids IS NULL OR ci.id = ANY(p_ids))
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

const CAPEX_REFRESH_WITHOUT_REF = `
  CREATE OR REPLACE FUNCTION search_index_refresh_capex_items(p_tenant uuid, p_ids uuid[] DEFAULT NULL)
  RETURNS void AS $fn$
    DELETE FROM search_index si_del
    WHERE si_del.tenant_id = p_tenant
      AND si_del.entity_type = 'capex_items'
      AND (p_ids IS NULL OR si_del.entity_id = ANY(p_ids))
      AND NOT EXISTS (
        SELECT 1 FROM capex_items src
        WHERE src.id = si_del.entity_id AND src.tenant_id = p_tenant
      );
    INSERT INTO search_index (
      tenant_id, entity_type, entity_id, ref_prefix, ref_number,
      label, summary, status, extra_json, search_vector, source_updated_at, indexed_at
    )
    SELECT ci.tenant_id,
           'capex_items',
           ci.id,
           NULL,
           NULL,
           ci.description,
           NULLIF(CONCAT_WS(' | ', comp.name, sup.name, ci.ppe_type::text, ci.investment_type), ''),
           ci.status::text,
           jsonb_build_object('paying_company', comp.name, 'supplier', sup.name),
           search_index_tsv('A', ci.description)
             || search_index_tsv('B', CONCAT_WS(' ', ci.ppe_type::text, ci.investment_type, ci.priority, ci.currency))
             || search_index_tsv('C', CONCAT_WS(' ', ci.notes, comp.name, sup.name)),
           ci.updated_at,
           now()
    FROM capex_items ci
    LEFT JOIN companies comp ON comp.id = ci.paying_company_id AND comp.tenant_id = ci.tenant_id
    LEFT JOIN suppliers sup ON sup.id = ci.supplier_id AND sup.tenant_id = ci.tenant_id
    WHERE ci.tenant_id = p_tenant
      AND (p_ids IS NULL OR ci.id = ANY(p_ids))
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

const CAPEX_SYNC_TRIGGER = `
  CREATE OR REPLACE FUNCTION search_index_sync_capex_items()
  RETURNS trigger AS $fn$
  BEGIN
    IF TG_OP = 'DELETE' THEN
      PERFORM search_index_delete(OLD.tenant_id, 'capex_items', OLD.id);
      RETURN OLD;
    END IF;
    PERFORM search_index_refresh_capex_items(NEW.tenant_id, ARRAY[NEW.id]);
    RETURN NEW;
  END
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_search_index_capex_items ON capex_items;
  CREATE TRIGGER trg_search_index_capex_items
  AFTER INSERT OR UPDATE OR DELETE ON capex_items
  FOR EACH ROW
  EXECUTE FUNCTION search_index_sync_capex_items();
`;

const REFRESH_ALL_CAPEX_TENANTS = `
  DO $do$
  DECLARE
    t RECORD;
  BEGIN
    FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
      PERFORM set_config('app.current_tenant', t.id::text, true);
      PERFORM search_index_refresh_capex_items(t.id);
    END LOOP;
  END
  $do$
`;

export class CapexSearchIndexRef1853220000000 implements MigrationInterface {
  name = 'CapexSearchIndexRef1853220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CAPEX_REFRESH_WITH_REF);
    await queryRunner.query(CAPEX_SYNC_TRIGGER);
    await queryRunner.query(REFRESH_ALL_CAPEX_TENANTS);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CAPEX_REFRESH_WITHOUT_REF);
    await queryRunner.query(CAPEX_SYNC_TRIGGER);
    await queryRunner.query(REFRESH_ALL_CAPEX_TENANTS);
  }
}
