import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

interface TimeEntryLike {
  user_id?: string | null;
  logged_at?: Date | string | null;
}

@Injectable()
export class UserTimeAggregateService {
  private normalizeDate(input?: Date | string | null): Date | null {
    if (!input) return null;
    const d = input instanceof Date ? input : new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private getYearMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private getMonthRange(yearMonth: Date): { start: Date; end: Date } {
    const start = new Date(Date.UTC(yearMonth.getUTCFullYear(), yearMonth.getUTCMonth(), 1));
    const end = new Date(Date.UTC(yearMonth.getUTCFullYear(), yearMonth.getUTCMonth() + 1, 1));
    return { start, end };
  }

  private getKey(entry?: TimeEntryLike | null): { userId: string; yearMonth: Date } | null {
    if (!entry?.user_id) return null;
    const loggedAt = this.normalizeDate(entry.logged_at ?? null);
    if (!loggedAt) return null;
    return { userId: entry.user_id, yearMonth: this.getYearMonth(loggedAt) };
  }

  async recalculateUserMonth(
    userId: string,
    yearMonth: Date,
    mg: EntityManager,
  ): Promise<void> {
    if (!userId) return;
    const { start, end } = this.getMonthRange(yearMonth);

    const projectEntries = await mg.query(
      `SELECT COALESCE(SUM(hours), 0)::numeric AS project_hours
       FROM portfolio_project_time_entries
       WHERE user_id = $1
         AND logged_at >= $2
         AND logged_at < $3
         AND tenant_id = app_current_tenant()`,
      [userId, start, end],
    );

    const projectTasks = await mg.query(
      `SELECT COALESCE(SUM(tte.hours), 0)::numeric AS project_hours
       FROM task_time_entries tte
       JOIN tasks t ON t.id = tte.task_id
       WHERE tte.user_id = $1
         AND tte.logged_at >= $2
         AND tte.logged_at < $3
         AND t.related_object_type = 'project'
         AND t.tenant_id = app_current_tenant()`,
      [userId, start, end],
    );

    const otherTasks = await mg.query(
      `SELECT COALESCE(SUM(tte.hours), 0)::numeric AS other_hours
       FROM task_time_entries tte
       JOIN tasks t ON t.id = tte.task_id
       WHERE tte.user_id = $1
         AND tte.logged_at >= $2
         AND tte.logged_at < $3
         AND (t.related_object_type IS NULL OR t.related_object_type <> 'project')
         AND t.tenant_id = app_current_tenant()`,
      [userId, start, end],
    );

    const projectHours = Number(projectEntries?.[0]?.project_hours) || 0;
    const projectTaskHours = Number(projectTasks?.[0]?.project_hours) || 0;
    const otherHours = Number(otherTasks?.[0]?.other_hours) || 0;

    const totalProject = projectHours + projectTaskHours;
    const total = totalProject + otherHours;

    if (total === 0) {
      await mg.query(
        `DELETE FROM user_time_monthly_aggregates
         WHERE tenant_id = app_current_tenant()
           AND user_id = $1
           AND year_month = $2::date`,
        [userId, this.getYearMonth(yearMonth)],
      );
      return;
    }

    await mg.query(
      `INSERT INTO user_time_monthly_aggregates (
         tenant_id, user_id, year_month, project_hours, other_hours, total_hours
       ) VALUES (
         app_current_tenant(), $1, $2::date, $3, $4, $5
       )
       ON CONFLICT (tenant_id, user_id, year_month)
       DO UPDATE SET
         project_hours = EXCLUDED.project_hours,
         other_hours = EXCLUDED.other_hours,
         total_hours = EXCLUDED.total_hours,
         updated_at = now()`,
      [userId, this.getYearMonth(yearMonth), totalProject, otherHours, total],
    );
  }

  async recalculateForEntryChange(
    before: TimeEntryLike | null | undefined,
    after: TimeEntryLike | null | undefined,
    mg: EntityManager,
  ): Promise<void> {
    const beforeKey = this.getKey(before);
    const afterKey = this.getKey(after);

    if (beforeKey) {
      await this.recalculateUserMonth(beforeKey.userId, beforeKey.yearMonth, mg);
    }

    if (afterKey) {
      const isSame =
        beforeKey &&
        beforeKey.userId === afterKey.userId &&
        beforeKey.yearMonth.getTime() === afterKey.yearMonth.getTime();
      if (!isSame) {
        await this.recalculateUserMonth(afterKey.userId, afterKey.yearMonth, mg);
      }
    }
  }

  async recalculateForTask(taskId: string, mg: EntityManager): Promise<void> {
    const rows = await mg.query(
      `SELECT DISTINCT user_id,
              date_trunc('month', logged_at AT TIME ZONE 'UTC')::date AS year_month
       FROM task_time_entries
       WHERE task_id = $1
         AND user_id IS NOT NULL`,
      [taskId],
    );

    for (const row of rows) {
      const userId = row.user_id as string;
      const yearMonth = this.normalizeDate(row.year_month) ?? new Date(row.year_month);
      await this.recalculateUserMonth(userId, this.getYearMonth(yearMonth), mg);
    }
  }
}
