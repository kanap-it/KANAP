import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  seedManagedDocsKnowledgeAssets,
  type ManagedDocsSeedDefinitions,
} from '../knowledge/integrated-document-seed';
import { provisionIncidentReviewDocuments } from '../knowledge/incident-review-provisioning';

/**
 * The incident review becomes an integrated document (plan:
 * planning/incident-review-document.md, §3.1).
 *
 * `incidents.description` stays a short summary column. `impact`, `root_cause`,
 * `corrective_actions` and `lessons_learned` are folded into one managed document per
 * incident, slot `incidents:review`, and then dropped. The incident search entry keeps
 * its own weights (B = description, C = source_ref + review body) and is refreshed
 * through the review document by two new propagation triggers.
 *
 * Irreversible on purpose: see `down()`.
 */

const ENTITY_TYPES_BEFORE = `'requests', 'projects', 'interfaces', 'applications', 'assets', 'locations', 'connections'`;
const ENTITY_TYPES_AFTER = `${ENTITY_TYPES_BEFORE}, 'incidents'`;

/**
 * Frozen copy of the incident slot definition as of this migration. Deliberately not
 * read from `integrated-document.constants.ts`: a later edit there must not change
 * what this migration seeded on a database it already ran on. New tenants keep using
 * the current constants (tenants.service.ts).
 */
const FROZEN_INCIDENT_SEED_DEFINITIONS: ManagedDocsSeedDefinitions = {
  folderDefinitions: [
    {
      sourceEntityType: 'incidents',
      systemKey: 'integrated_incidents',
      name: 'Incidents',
      displayOrder: 5,
    },
  ],
  slotDefinitions: [
    {
      sourceEntityType: 'incidents',
      slotKey: 'review',
      displayName: 'Incident review',
      folderSystemKey: 'integrated_incidents',
      documentTypeName: 'Incident review',
      documentTypeSystemKey: 'integrated_incident_review',
      documentTypeDescription: 'Managed document type for incident review integrated docs',
      documentTypeDisplayOrder: 105,
      templateTitle: 'Incident Review Template',
      templateSummary: 'Managed template for incident review integrated documents',
      templateContentMarkdown: [
        '## Description',
        '',
        '## Impact',
        '',
        '## Root cause',
        '',
        '## Corrective actions',
        '',
        '## Lessons learned',
        '',
      ].join('\n'),
    },
  ],
};

/**
 * Weight B is the short description; weight C is the external reference plus the
 * review body, joined through the binding with both tenants pinned explicitly.
 */
const INCIDENTS_REFRESH_WITH_REVIEW = `
  CREATE OR REPLACE FUNCTION search_index_refresh_incidents(p_tenant uuid, p_ids uuid[] DEFAULT NULL)
  RETURNS void AS $fn$
    DELETE FROM search_index si_del
    WHERE si_del.tenant_id = p_tenant
      AND si_del.entity_type = 'incidents'
      AND (p_ids IS NULL OR si_del.entity_id = ANY(p_ids))
      AND NOT EXISTS (
        SELECT 1 FROM incidents src
        WHERE src.id = si_del.entity_id AND src.tenant_id = p_tenant
      );
    INSERT INTO search_index (
      tenant_id, entity_type, entity_id, ref_prefix, ref_number,
      label, summary, status, extra_json, search_vector, source_updated_at, indexed_at
    )
    SELECT i.tenant_id,
           'incidents',
           i.id,
           'INC',
           i.item_number,
           i.title,
           i.description,
           i.status,
           jsonb_build_object('severity', i.severity, 'category', i.category),
           search_index_tsv('A', CONCAT_WS(' ', 'INC-' || i.item_number::text, i.title))
             || search_index_tsv('B', CONCAT_WS(' ', i.description))
             || search_index_tsv('C', CONCAT_WS(' ', i.source_ref, d.content_plain)),
           i.updated_at,
           now()
    FROM incidents i
    LEFT JOIN integrated_document_bindings b
      ON b.tenant_id = i.tenant_id
     AND b.source_entity_type = 'incidents'
     AND b.source_entity_id = i.id
     AND b.slot_key = 'review'
    LEFT JOIN documents d
      ON d.id = b.document_id
     AND d.tenant_id = b.tenant_id
    WHERE i.tenant_id = p_tenant
      AND (p_ids IS NULL OR i.id = ANY(p_ids))
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

/**
 * Review edits (autosave, import, revert, repair) land on `documents`; a document
 * dropped by cascade removes its binding first, and the binding trigger below then
 * clears the text from the incident entry.
 */
const DOCUMENT_PROPAGATION_TRIGGER = `
  CREATE OR REPLACE FUNCTION search_index_sync_incident_review_document()
  RETURNS trigger AS $fn$
  DECLARE
    v_incident_id uuid;
  BEGIN
    SELECT b.source_entity_id
      INTO v_incident_id
    FROM integrated_document_bindings b
    WHERE b.document_id = NEW.id
      AND b.tenant_id = NEW.tenant_id
      AND b.source_entity_type = 'incidents'
      AND b.slot_key = 'review'
    LIMIT 1;

    IF v_incident_id IS NOT NULL THEN
      PERFORM search_index_refresh_incidents(NEW.tenant_id, ARRAY[v_incident_id]);
    END IF;
    RETURN NULL;
  END
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_search_index_incident_review_document ON documents;
  CREATE TRIGGER trg_search_index_incident_review_document
  AFTER INSERT OR UPDATE OF content_plain, title ON documents
  FOR EACH ROW
  EXECUTE FUNCTION search_index_sync_incident_review_document();
`;

/** Both sides are refreshed: an update can move the binding to another incident. */
const BINDING_PROPAGATION_TRIGGER = `
  CREATE OR REPLACE FUNCTION search_index_sync_incident_review_binding()
  RETURNS trigger AS $fn$
  BEGIN
    IF TG_OP <> 'INSERT'
       AND OLD.source_entity_type = 'incidents'
       AND OLD.slot_key = 'review' THEN
      PERFORM search_index_refresh_incidents(OLD.tenant_id, ARRAY[OLD.source_entity_id]);
    END IF;

    IF TG_OP <> 'DELETE'
       AND NEW.source_entity_type = 'incidents'
       AND NEW.slot_key = 'review' THEN
      PERFORM search_index_refresh_incidents(NEW.tenant_id, ARRAY[NEW.source_entity_id]);
    END IF;

    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NULL;
  END
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_search_index_incident_review_binding ON integrated_document_bindings;
  CREATE TRIGGER trg_search_index_incident_review_binding
  AFTER INSERT OR UPDATE OR DELETE ON integrated_document_bindings
  FOR EACH ROW
  EXECUTE FUNCTION search_index_sync_incident_review_binding();
`;

const REINDEX_ALL_TENANTS = `
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

/**
 * RLS is forced on these tables even for the owning role, so every assertion runs
 * inside the per-tenant loop; a global count would silently see zero rows.
 */
const ASSERT_PROVISIONING_COMPLETE = `
  DO $do$
  DECLARE
    t RECORD;
    v_missing int;
    v_broken int;
  BEGIN
    FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
      PERFORM set_config('app.current_tenant', t.id::text, true);

      SELECT COUNT(*) INTO v_missing
      FROM incidents i
      WHERE i.tenant_id = t.id
        AND NOT EXISTS (
          SELECT 1 FROM integrated_document_bindings b
          WHERE b.tenant_id = i.tenant_id
            AND b.source_entity_type = 'incidents'
            AND b.source_entity_id = i.id
            AND b.slot_key = 'review'
        );
      IF v_missing > 0 THEN
        RAISE EXCEPTION 'incident review provisioning incomplete: % incident(s) without a review binding in tenant %', v_missing, t.id;
      END IF;

      SELECT COUNT(*) INTO v_broken
      FROM integrated_document_bindings b
      LEFT JOIN documents d ON d.id = b.document_id AND d.tenant_id = b.tenant_id
      WHERE b.tenant_id = t.id
        AND b.source_entity_type = 'incidents'
        AND b.slot_key = 'review'
        AND (
          d.id IS NULL
          OR b.hidden_from_entity_knowledge IS NOT TRUE
          OR d.status <> 'published'
          OR NOT EXISTS (
            SELECT 1 FROM document_versions v
            WHERE v.document_id = d.id AND v.tenant_id = d.tenant_id
          )
          OR NOT EXISTS (
            SELECT 1 FROM document_incidents di
            WHERE di.document_id = d.id
              AND di.incident_id = b.source_entity_id
              AND di.tenant_id = b.tenant_id
          )
        );
      IF v_broken > 0 THEN
        RAISE EXCEPTION 'incident review provisioning incomplete: % broken review binding(s) in tenant %', v_broken, t.id;
      END IF;
    END LOOP;
  END
  $do$
`;

/**
 * `LANGUAGE sql` bodies carry no dependency on the columns they read, so dropping
 * them would leave a function that only fails at call time. The reindex above is the
 * live proof; this check catches a stored routine that was never called.
 */
const ASSERT_NO_LEGACY_COLUMN_DEPENDENCY = `
  DO $do$
  DECLARE
    v_names text;
  BEGIN
    SELECT string_agg(p.proname, ', ')
      INTO v_names
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc ~ '\\m(root_cause|corrective_actions|lessons_learned)\\M';
    IF v_names IS NOT NULL THEN
      RAISE EXCEPTION 'stored routine(s) still reference dropped incident columns: %', v_names;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'incidents'
        AND column_name IN ('impact', 'root_cause', 'corrective_actions', 'lessons_learned')
    ) THEN
      RAISE EXCEPTION 'legacy incident narrative columns are still present';
    END IF;
  END
  $do$
`;

export class IncidentReviewDocument1853480000000 implements MigrationInterface {
  name = 'IncidentReviewDocument1853480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. CHECK constraints accept the new source entity type.
    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_bindings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_bindings
      ADD CONSTRAINT chk_integrated_document_bindings_entity_type
      CHECK (source_entity_type IN (${ENTITY_TYPES_AFTER}))
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      DROP CONSTRAINT IF EXISTS chk_integrated_document_slot_settings_entity_type
    `);
    await queryRunner.query(`
      ALTER TABLE integrated_document_slot_settings
      ADD CONSTRAINT chk_integrated_document_slot_settings_entity_type
      CHECK (source_entity_type IN (${ENTITY_TYPES_AFTER}))
    `);

    const tenants: Array<{ id: string }> = await queryRunner.query(`
      SELECT id
      FROM tenants
      ORDER BY id
    `);

    // 2. Seed the Incidents folder, document type, template and slot settings —
    //    incidents only, so an existing custom template of another slot is untouched.
    for (const tenant of tenants) {
      await seedManagedDocsKnowledgeAssets(queryRunner, tenant.id, {
        definitions: FROZEN_INCIDENT_SEED_DEFINITIONS,
      });
    }

    // 3. One review document per existing incident, still reading the legacy columns.
    for (const tenant of tenants) {
      await provisionIncidentReviewDocuments(queryRunner, tenant.id);
    }
    await queryRunner.query(ASSERT_PROVISIONING_COMPLETE);

    // 4. Index function reads the review body instead of the four columns.
    await queryRunner.query(INCIDENTS_REFRESH_WITH_REVIEW);

    // 5. Columns are gone once the documents are proven complete.
    await queryRunner.query(`
      ALTER TABLE incidents
      DROP COLUMN IF EXISTS impact,
      DROP COLUMN IF EXISTS root_cause,
      DROP COLUMN IF EXISTS corrective_actions,
      DROP COLUMN IF EXISTS lessons_learned
    `);

    // 6. Propagation from the document and the binding back to the incident entry.
    await queryRunner.query(DOCUMENT_PROPAGATION_TRIGGER);
    await queryRunner.query(BINDING_PROPAGATION_TRIGGER);

    // 7. Reindex and final integrity assertions.
    await queryRunner.query(REINDEX_ALL_TENANTS);
    await queryRunner.query(ASSERT_NO_LEGACY_COLUMN_DEPENDENCY);
  }

  /**
   * Irreversible by design. Reverting would either drop the review documents with
   * their versions and images, or leave them unbound — and an unbound review keeps no
   * confidentiality control at all. Fix forward with a new migration; do not redeploy
   * the previous backend against this schema.
   */
  public async down(): Promise<void> {
    throw new Error(
      'IncidentReviewDocument1853480000000 is irreversible: the four incident narrative columns '
      + 'were folded into managed review documents. Fix forward with a new migration instead of '
      + 'reverting (see planning/incident-review-document.md §3.1).',
    );
  }
}
