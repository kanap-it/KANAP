import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduledTasks1844100000000 implements MigrationInterface {
  name = 'ScheduledTasks1844100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE scheduled_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text UNIQUE NOT NULL,
        description text,
        cron_expression text NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        last_run_at timestamptz,
        last_status text,
        last_duration_ms integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE scheduled_task_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_name text NOT NULL REFERENCES scheduled_tasks(name) ON DELETE CASCADE,
        status text NOT NULL,
        started_at timestamptz NOT NULL,
        finished_at timestamptz,
        duration_ms integer,
        summary jsonb,
        error text
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_str_task_started ON scheduled_task_runs(task_name, started_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS scheduled_task_runs`);
    await queryRunner.query(`DROP TABLE IF EXISTS scheduled_tasks`);
  }
}
