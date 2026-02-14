import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskTimeEntryCategory1797000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add category column to task_time_entries table
    await queryRunner.query(`
      ALTER TABLE task_time_entries
      ADD COLUMN category text NOT NULL DEFAULT 'it'
    `);

    // Backfill existing entries based on user's team membership on the related project
    // If the user is on the business_team for that project, set category to 'business'
    // Otherwise default to 'it'
    await queryRunner.query(`
      UPDATE task_time_entries tte
      SET category = CASE
        WHEN EXISTS (
          SELECT 1 FROM portfolio_project_team ppt
          JOIN tasks t ON t.related_object_id = ppt.project_id
            AND t.related_object_type = 'project'
          WHERE t.id = tte.task_id
          AND ppt.user_id = tte.user_id
          AND ppt.role = 'business_team'
        ) THEN 'business'
        ELSE 'it'
      END
    `);

    // Add index for efficient category-based queries
    await queryRunner.query(`
      CREATE INDEX idx_task_time_entries_category ON task_time_entries (category)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_task_time_entries_category`);
    await queryRunner.query(`ALTER TABLE task_time_entries DROP COLUMN IF EXISTS category`);
  }
}
