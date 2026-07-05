import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AiBuiltinUsage } from './ai-builtin-usage.entity';
import { PlatformAiPlanLimit } from './platform-ai-plan-limit.entity';

export type BuiltinUsageView = {
  count: number;
  limit: number;
  year_month: string;
  reset_date: string;
};

export type BuiltinUsageAdminRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  used: number;
  limit: number;
  usage_ratio: number | null;
  year_month: string;
};

// Every cloud tenant gets the same free monthly message volume (single-plan pricing).
// The value is stored as the one 'default' row of platform_ai_plan_limits and editable
// on the platform admin page; a missing row falls back to this constant so a fresh
// deployment is never accidentally quota-locked at 0.
export const FREE_MESSAGE_LIMIT_KEY = 'default';
export const DEFAULT_FREE_MONTHLY_MESSAGE_LIMIT = 1500;

function getYearMonth(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getResetDate(yearMonth: string): string {
  const [yearRaw, monthRaw] = yearMonth.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const resetAt = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return resetAt.toISOString();
}

@Injectable()
export class AiBuiltinUsageService {
  constructor(private readonly dataSource: DataSource) {}

  private getUsageRepo(manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).getRepository(AiBuiltinUsage);
  }

  private getPlanLimitRepo(manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).getRepository(PlatformAiPlanLimit);
  }

  async getMonthlyLimit(manager?: EntityManager): Promise<number> {
    const row = await this.getPlanLimitRepo(manager).findOne({
      where: { plan_name: FREE_MESSAGE_LIMIT_KEY },
    });
    return row?.monthly_message_limit ?? DEFAULT_FREE_MONTHLY_MESSAGE_LIMIT;
  }

  async getCurrentUsage(tenantId: string, manager: EntityManager): Promise<BuiltinUsageView> {
    const yearMonth = getYearMonth();
    const limit = await this.getMonthlyLimit(manager);
    const row = await this.getUsageRepo(manager).findOne({
      where: {
        tenant_id: tenantId,
        year_month: yearMonth,
      },
    });
    return {
      count: row?.user_message_count ?? 0,
      limit,
      year_month: yearMonth,
      reset_date: getResetDate(yearMonth),
    };
  }

  async reserveMessage(tenantId: string, limit: number, manager: EntityManager): Promise<number> {
    const yearMonth = getYearMonth();
    const rows = await manager.query(
      `
        INSERT INTO ai_builtin_usage (tenant_id, year_month, user_message_count, last_updated_at)
        VALUES ($1, $2, 1, now())
        ON CONFLICT (tenant_id, year_month)
        DO UPDATE SET
          user_message_count = ai_builtin_usage.user_message_count + 1,
          last_updated_at = now()
        WHERE ai_builtin_usage.user_message_count < $3
        RETURNING user_message_count
      `,
      [tenantId, yearMonth, limit],
    );

    const nextCount = Number(rows?.[0]?.user_message_count);
    if (!Number.isFinite(nextCount)) {
      const usage = await this.getCurrentUsage(tenantId, manager);
      throw new HttpException({
        code: 'BUILTIN_QUOTA_EXHAUSTED',
        message: 'Built-in AI monthly message limit reached.',
        builtin_usage: usage,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return nextCount;
  }

  async getUsageForAllTenants(yearMonth = getYearMonth()): Promise<BuiltinUsageAdminRow[]> {
    const limit = await this.getMonthlyLimit();
    const rows = await this.dataSource.query(
      `
        SELECT
          t.id AS tenant_id,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          COALESCE(u.user_message_count, 0)::int AS used,
          $2::int AS "limit",
          CASE
            WHEN $2::int = 0 THEN NULL
            ELSE ROUND((COALESCE(u.user_message_count, 0)::numeric / $2::numeric), 4)
          END AS usage_ratio,
          $1::text AS year_month
        FROM tenants t
        LEFT JOIN ai_builtin_usage u
          ON u.tenant_id = t.id
         AND u.year_month = $1
        WHERE t.deleted_at IS NULL
        ORDER BY COALESCE(u.user_message_count, 0) DESC, t.name ASC
      `,
      [yearMonth, limit],
    );

    return rows.map((row: any) => ({
      tenant_id: row.tenant_id,
      tenant_name: row.tenant_name,
      tenant_slug: row.tenant_slug,
      used: Number(row.used) || 0,
      limit: Number(row.limit) || 0,
      usage_ratio: row.usage_ratio == null ? null : Number(row.usage_ratio),
      year_month: row.year_month,
    }));
  }
}
