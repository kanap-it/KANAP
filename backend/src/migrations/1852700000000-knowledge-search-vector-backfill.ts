import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeSearchVectorBackfill1852700000000 implements MigrationInterface {
  name = 'KnowledgeSearchVectorBackfill1852700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      WHERE search_vector IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION documents_search_vector_sync()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
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
      BEFORE INSERT OR UPDATE OF title, content_plain
      ON documents
      FOR EACH ROW
      EXECUTE FUNCTION documents_search_vector_sync()
    `);
  }
}
