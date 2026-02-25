import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repair backfill for project task classification fields.
 *
 * Why this exists:
 * - tasks and portfolio_projects are under FORCE RLS in this codebase
 * - migration-time statements do not run with app.current_tenant set
 * - tenant-scoped UPDATE statements can therefore affect zero rows
 *
 * This migration temporarily disables RLS for the two tables, performs an
 * idempotent COALESCE backfill, then restores RLS.
 */
export class RepairProjectTaskClassificationBackfill1828000000000 implements MigrationInterface {
  name = 'RepairProjectTaskClassificationBackfill1828000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure migration can see and update all tenants.
    await queryRunner.query(`ALTER TABLE tasks NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE tasks DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_projects NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DISABLE ROW LEVEL SECURITY`);

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
        AND (
          t.source_id IS NULL OR
          t.category_id IS NULL OR
          t.stream_id IS NULL OR
          t.company_id IS NULL
        )
    `);

    // Restore RLS posture.
    await queryRunner.query(`ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_projects FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE tasks FORCE ROW LEVEL SECURITY`);
  }

  public async down(): Promise<void> {
    // No-op: data backfill should not be reversed.
  }
}
