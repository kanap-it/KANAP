import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-runs the bilingual document search vector backfill from migration
 * 1852900000000, this time looping tenants with a transaction-local
 * `app.current_tenant`.
 *
 * The original backfill ran a plain `UPDATE documents ...` with no tenant
 * context. The migration role is not BYPASSRLS and `documents` is under
 * FORCE ROW LEVEL SECURITY, so the policy filtered out every row and the
 * UPDATE silently rewrote nothing: existing documents kept their old
 * `simple`-config vectors (and `search_index` snapshotted those stale
 * vectors during its own backfill). Fresh databases were unaffected (no
 * rows to backfill), which is why CI and from-scratch test runs never
 * caught it.
 *
 * This is the data-migration convention documented in
 * 1853000000000-ai-search-index.ts: any statement touching RLS-protected
 * rows must run inside a per-tenant `set_config('app.current_tenant', ...,
 * true)` loop.
 *
 * Idempotent: recomputing an already-bilingual vector yields the same value,
 * and the search_index refresh is an upsert.
 */
export class KnowledgeSearchVectorBackfillTenantLoop1853100000000 implements MigrationInterface {
  name = 'KnowledgeSearchVectorBackfillTenantLoop1853100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $do$
      DECLARE
        t RECORD;
      BEGIN
        FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
          PERFORM set_config('app.current_tenant', t.id::text, true);
          UPDATE documents
          SET search_vector =
            setweight(to_tsvector('kanap_fr', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('kanap_en', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('kanap_fr', coalesce(summary, '')), 'A') ||
            setweight(to_tsvector('kanap_en', coalesce(summary, '')), 'A') ||
            setweight(to_tsvector('kanap_fr', coalesce(content_plain, '')), 'B') ||
            setweight(to_tsvector('kanap_en', coalesce(content_plain, '')), 'B');
          -- search_index document rows snapshot documents.search_vector.
          PERFORM search_index_refresh_documents(t.id);
        END LOOP;
      END
      $do$
    `);
  }

  public async down(): Promise<void> {
    // Data-only repair of the 1852900000000 backfill; nothing to revert.
    // Reverting 1852900000000 itself restores the simple-config vectors.
  }
}
