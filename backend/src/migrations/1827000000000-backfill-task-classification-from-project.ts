import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill classification fields on project tasks from their parent project.
 *
 * Previously, project tasks did not store classification (source, category, stream, company)
 * directly — these were resolved at query time via SQL CASE/JOIN from the parent project.
 * This migration copies the project's classification onto each task so that tasks can have
 * independent classification going forward.
 *
 * Uses COALESCE to preserve any existing task-level values (e.g., set via CSV import)
 * and only fills in NULLs from the parent project.
 *
 * Down migration is a no-op: the old CASE-based queries still work correctly with
 * populated values, and nulling the columns would be data-destructive.
 */
export class BackfillTaskClassificationFromProject1827000000000 implements MigrationInterface {
  name = 'BackfillTaskClassificationFromProject1827000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE tasks t
      SET
        source_id   = COALESCE(t.source_id,   pp.source_id),
        category_id = COALESCE(t.category_id, pp.category_id),
        stream_id   = COALESCE(t.stream_id,   pp.stream_id),
        company_id  = COALESCE(t.company_id,  pp.company_id)
      FROM portfolio_projects pp
      WHERE t.related_object_type = 'project'
        AND t.related_object_id = pp.id
        AND (t.source_id IS NULL OR t.category_id IS NULL OR t.stream_id IS NULL OR t.company_id IS NULL)
    `);
  }

  public async down(): Promise<void> {
    // No-op: nulling the columns would be data-destructive and unnecessary.
    // The old CASE-based queries still work correctly with populated values.
  }
}
