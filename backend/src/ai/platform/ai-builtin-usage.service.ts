import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { resolvePlanKeyFromLegacyName } from '../../billing/plans.config';
import { Subscription } from '../../billing/subscription.entity';
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
  plan_name: string | null;
  plan_key: string | null;
  used: number;
  limit: number | null;
  usage_ratio: number | null;
  year_month: string;
};

const DEFAULT_PLAN_KEY = 'small';

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

  private getSubscriptionRepo(manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).getRepository(Subscription);
  }

  private async resolvePlanKeyForTenant(tenantId: string, manager: EntityManager): Promise<string> {
    const subscription = await this.getSubscriptionRepo(manager).findOne({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
    return resolvePlanKeyFromLegacyName(subscription?.plan_name) ?? DEFAULT_PLAN_KEY;
  }

  async getMonthlyLimitForTenant(tenantId: string, manager: EntityManager): Promise<number> {
    const planKey = await this.resolvePlanKeyForTenant(tenantId, manager);
    const row = await this.getPlanLimitRepo(manager).findOne({
      where: { plan_name: planKey },
    });
    return row?.monthly_message_limit ?? 0;
  }

  async getCurrentUsage(tenantId: string, manager: EntityManager): Promise<BuiltinUsageView> {
    const yearMonth = getYearMonth();
    const limit = await this.getMonthlyLimitForTenant(tenantId, manager);
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
    const rows = await this.dataSource.query(
      `
        SELECT
          t.id AS tenant_id,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          s.plan_name,
          pll.plan_name AS plan_key,
          COALESCE(u.user_message_count, 0)::int AS used,
          pll.monthly_message_limit::int AS "limit",
          CASE
            WHEN pll.monthly_message_limit IS NULL OR pll.monthly_message_limit = 0 THEN NULL
            ELSE ROUND((COALESCE(u.user_message_count, 0)::numeric / pll.monthly_message_limit::numeric), 4)
          END AS usage_ratio,
          $1::text AS year_month
        FROM tenants t
        LEFT JOIN subscriptions s
          ON s.tenant_id = t.id
        LEFT JOIN platform_ai_plan_limits pll
          ON pll.plan_name = CASE
            WHEN LOWER(COALESCE(s.plan_name, '')) IN ('starter', 'solo', 'small') THEN 'small'
            WHEN LOWER(COALESCE(s.plan_name, '')) IN ('team', 'standard') THEN 'standard'
            WHEN LOWER(COALESCE(s.plan_name, '')) IN ('pro', 'max') THEN 'max'
            ELSE 'small'
          END
        LEFT JOIN ai_builtin_usage u
          ON u.tenant_id = t.id
         AND u.year_month = $1
        WHERE t.deleted_at IS NULL
        ORDER BY COALESCE(u.user_message_count, 0) DESC, t.name ASC
      `,
      [yearMonth],
    );

    return rows.map((row: any) => ({
      tenant_id: row.tenant_id,
      tenant_name: row.tenant_name,
      tenant_slug: row.tenant_slug,
      plan_name: row.plan_name ?? null,
      plan_key: row.plan_key ?? null,
      used: Number(row.used) || 0,
      limit: row.limit == null ? null : Number(row.limit),
      usage_ratio: row.usage_ratio == null ? null : Number(row.usage_ratio),
      year_month: row.year_month,
    }));
  }
}
