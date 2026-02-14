import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillUserTimeAggregates1813000000001 implements MigrationInterface {
  name = 'BackfillUserTimeAggregates1813000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE user_time_monthly_aggregates NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE user_time_monthly_aggregates DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_project_time_entries NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_project_time_entries DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE task_time_entries NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE task_time_entries DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE tasks NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE tasks DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      WITH project_entries AS (
        SELECT tenant_id, user_id,
               date_trunc('month', logged_at AT TIME ZONE 'UTC')::date AS year_month,
               SUM(hours)::numeric(10,2) AS project_hours
        FROM portfolio_project_time_entries
        WHERE user_id IS NOT NULL
        GROUP BY 1,2,3
      ),
      project_task_entries AS (
        SELECT tte.tenant_id, tte.user_id,
               date_trunc('month', tte.logged_at AT TIME ZONE 'UTC')::date AS year_month,
               SUM(tte.hours)::numeric(10,2) AS project_hours
        FROM task_time_entries tte
        JOIN tasks t ON t.id = tte.task_id
        WHERE t.related_object_type = 'project'
          AND tte.user_id IS NOT NULL
        GROUP BY 1,2,3
      ),
      other_task_entries AS (
        SELECT tte.tenant_id, tte.user_id,
               date_trunc('month', tte.logged_at AT TIME ZONE 'UTC')::date AS year_month,
               SUM(tte.hours)::numeric(10,2) AS other_hours
        FROM task_time_entries tte
        JOIN tasks t ON t.id = tte.task_id
        WHERE (t.related_object_type IS NULL OR t.related_object_type <> 'project')
          AND tte.user_id IS NOT NULL
        GROUP BY 1,2,3
      ),
      combined AS (
        SELECT tenant_id, user_id, year_month, project_hours, 0::numeric AS other_hours FROM project_entries
        UNION ALL
        SELECT tenant_id, user_id, year_month, project_hours, 0::numeric FROM project_task_entries
        UNION ALL
        SELECT tenant_id, user_id, year_month, 0::numeric, other_hours FROM other_task_entries
      ),
      rolled AS (
        SELECT tenant_id, user_id, year_month,
               SUM(project_hours)::numeric(10,2) AS project_hours,
               SUM(other_hours)::numeric(10,2) AS other_hours
        FROM combined
        GROUP BY 1,2,3
      )
      INSERT INTO user_time_monthly_aggregates (
        tenant_id, user_id, year_month, project_hours, other_hours, total_hours
      )
      SELECT tenant_id, user_id, year_month, project_hours, other_hours, project_hours + other_hours
      FROM rolled
      ON CONFLICT (tenant_id, user_id, year_month)
      DO UPDATE SET
        project_hours = EXCLUDED.project_hours,
        other_hours = EXCLUDED.other_hours,
        total_hours = EXCLUDED.total_hours,
        updated_at = now();
    `);

    await queryRunner.query(`ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE tasks FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE task_time_entries FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_project_time_entries ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_project_time_entries FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE user_time_monthly_aggregates ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE user_time_monthly_aggregates FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM user_time_monthly_aggregates`);
  }
}
