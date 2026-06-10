import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bilingual (French + English) unaccented full-text search for knowledge documents.
 *
 * Replaces the `simple`-config document search vector with two custom text search
 * configurations (`kanap_fr`, `kanap_en`) that chain `unaccent` before the language
 * stemmers. Wrapping unaccent inside the configuration (instead of calling
 * `unaccent()` around `to_tsvector`) is the canonical pattern: it keeps
 * `ts_headline` working on accented content and keeps query/vector symmetry.
 *
 * The same text is indexed under BOTH configs (standard bilingual corpus trick);
 * lexeme duplication for words that stem identically is harmless and uniform.
 *
 * Supersedes 1852700000000-knowledge-search-vector-backfill.ts.
 */
export class KnowledgeSearchBilingualFts1852900000000 implements MigrationInterface {
  name = 'KnowledgeSearchBilingualFts1852900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    // Idempotent: integration test databases re-run migrations.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'kanap_fr') THEN
          CREATE TEXT SEARCH CONFIGURATION kanap_fr (COPY = french);
          ALTER TEXT SEARCH CONFIGURATION kanap_fr
            ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'kanap_en') THEN
          CREATE TEXT SEARCH CONFIGURATION kanap_en (COPY = english);
          ALTER TEXT SEARCH CONFIGURATION kanap_en
            ALTER MAPPING FOR hword, hword_part, word WITH unaccent, english_stem;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION documents_search_vector_sync()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('kanap_fr', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('kanap_en', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('kanap_fr', coalesce(NEW.summary, '')), 'A') ||
          setweight(to_tsvector('kanap_en', coalesce(NEW.summary, '')), 'A') ||
          setweight(to_tsvector('kanap_fr', coalesce(NEW.content_plain, '')), 'B') ||
          setweight(to_tsvector('kanap_en', coalesce(NEW.content_plain, '')), 'B');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_documents_search_vector_sync ON documents
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_documents_search_vector_sync
      BEFORE INSERT OR UPDATE OF title, summary, content_plain
      ON documents
      FOR EACH ROW
      EXECUTE FUNCTION documents_search_vector_sync()
    `);

    // Backfill ALL rows: every existing vector is in the old `simple` format.
    await queryRunner.query(`
      UPDATE documents
      SET search_vector =
        setweight(to_tsvector('kanap_fr', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('kanap_en', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('kanap_fr', coalesce(summary, '')), 'A') ||
        setweight(to_tsvector('kanap_en', coalesce(summary, '')), 'A') ||
        setweight(to_tsvector('kanap_fr', coalesce(content_plain, '')), 'B') ||
        setweight(to_tsvector('kanap_en', coalesce(content_plain, '')), 'B')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the `simple` version (mirror of 1852700000000 up()).
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION documents_search_vector_sync()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.summary, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.content_plain, '')), 'B');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_documents_search_vector_sync ON documents
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_documents_search_vector_sync
      BEFORE INSERT OR UPDATE OF title, summary, content_plain
      ON documents
      FOR EACH ROW
      EXECUTE FUNCTION documents_search_vector_sync()
    `);

    await queryRunner.query(`
      UPDATE documents
      SET search_vector =
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(summary, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(content_plain, '')), 'B')
    `);

    await queryRunner.query(`DROP TEXT SEARCH CONFIGURATION IF EXISTS kanap_fr`);
    await queryRunner.query(`DROP TEXT SEARCH CONFIGURATION IF EXISTS kanap_en`);
  }
}
