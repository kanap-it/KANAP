import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendTasksForProjects1795000000000 implements MigrationInterface {
  name = 'ExtendTasksForProjects1795000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Task entity extensions
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN phase_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN priority_level text NOT NULL DEFAULT 'normal'`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN start_date date NULL`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN labels jsonb NOT NULL DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN category_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN stream_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN creator_id uuid NULL`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN owner_ids jsonb NOT NULL DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN viewer_ids jsonb NOT NULL DEFAULT '[]'`);

    // Indexes for project tasks
    await queryRunner.query(`CREATE INDEX idx_tasks_project ON tasks(tenant_id, related_object_id) WHERE related_object_type = 'project'`);
    await queryRunner.query(`CREATE INDEX idx_tasks_phase ON tasks(tenant_id, phase_id) WHERE phase_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX idx_tasks_priority ON tasks(tenant_id, priority_level)`);

    // TaskTimeEntry table
    await queryRunner.query(`
      CREATE TABLE task_time_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id uuid NULL,
        hours decimal(5,2) NOT NULL,
        notes text NULL,
        logged_by_id uuid NULL,
        logged_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_task_time_entries_task ON task_time_entries(tenant_id, task_id)`);
    await queryRunner.query(`CREATE INDEX idx_task_time_entries_user ON task_time_entries(tenant_id, user_id) WHERE user_id IS NOT NULL`);

    // RLS for task_time_entries
    await queryRunner.query(`ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE task_time_entries FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`CREATE POLICY task_time_entries_tenant_isolation ON task_time_entries
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)`);

    // PortfolioActivity extension for task comments
    await queryRunner.query(`ALTER TABLE portfolio_activities ADD COLUMN task_id uuid NULL`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_activities_task ON portfolio_activities(tenant_id, task_id) WHERE task_id IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop activity task column
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_activities_task`);
    await queryRunner.query(`ALTER TABLE portfolio_activities DROP COLUMN IF EXISTS task_id`);

    // Drop task_time_entries table
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_time_entries' AND policyname = 'task_time_entries_tenant_isolation'
      ) THEN
        DROP POLICY task_time_entries_tenant_isolation ON task_time_entries;
      END IF;
    END $$;`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_time_entries`);

    // Drop task extension columns
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_priority`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_phase`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_project`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS viewer_ids`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS owner_ids`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS creator_id`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS stream_id`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS category_id`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS labels`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS start_date`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS priority_level`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS phase_id`);
  }
}
