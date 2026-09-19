import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { withTenant } from '../../common/tenant-runner';
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

// getUsageForAllTenants opens one tenant-scoped transaction per tenant. Reading them all at
// once would take every connection of the pool (DB_POOL_MAX, 20 by default) as soon as the
// platform has that many tenants, and stall the whole API while the admin page loads.
const USAGE_READ_CONCURRENCY = 4;

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
  private readonly logger = new Logger(AiBuiltinUsageService.name);

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

  // Reserve on a dedicated transaction that commits immediately. Callers holding a
  // long-lived transaction (agent runs span their LLM calls) must NOT reserve through
  // their own manager: the ON CONFLICT UPDATE locks the tenant's monthly usage row
  // until commit, and every chat message of that tenant reserves on the same row —
  // Plaid would hang for the whole agent run. The reservation therefore sticks even
  // if the caller's transaction rolls back, matching chat semantics (chat reserves
  // and commits before streaming).
  async reserveMessageDetached(tenantId: string, limit: number): Promise<number> {
    return withTenant(this.dataSource, tenantId, (manager) =>
      this.reserveMessage(tenantId, limit, manager),
    );
  }

  async getUsageForAllTenants(yearMonth = getYearMonth()): Promise<BuiltinUsageAdminRow[]> {
    const limit = await this.getMonthlyLimit();

    // `tenants` sits outside RLS, so the roster is readable on a context-less connection.
    const tenants: Array<{ id: string; name: string; slug: string }> = await this.dataSource.query(
      `SELECT id, name, slug FROM tenants WHERE deleted_at IS NULL ORDER BY name ASC`,
    );

    // `ai_builtin_usage` is under FORCE RLS and the tenant context is transaction-local,
    // so a single context-less query returns zero rows for every tenant — which is what
    // made the admin usage page report 0 for everyone. Read it once per tenant inside its
    // own tenant-scoped transaction, as TenantStatsService does.
    const readTenant = async (tenant: { id: string; name: string; slug: string }): Promise<BuiltinUsageAdminRow> => {
      let used = 0;
      try {
        const usage: Array<{ user_message_count: number }> = await withTenant(
          this.dataSource,
          tenant.id,
          (manager) =>
            manager.query(
              `SELECT user_message_count FROM ai_builtin_usage WHERE tenant_id = $1 AND year_month = $2`,
              [tenant.id, yearMonth],
            ),
        );
        used = Number(usage?.[0]?.user_message_count) || 0;
      } catch (error) {
        // One unreadable tenant must not take the whole page down.
        this.logger.warn(`Built-in AI usage read failed for tenant ${tenant.slug}: ${error instanceof Error ? error.message : error}`);
      }
      return {
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        tenant_slug: tenant.slug,
        used,
        limit,
        // Same 4-decimal rounding the single-query version produced in SQL.
        usage_ratio: limit === 0 ? null : Math.round((used / limit) * 10000) / 10000,
        year_month: yearMonth,
      };
    };

    const rows: BuiltinUsageAdminRow[] = [];
    for (let i = 0; i < tenants.length; i += USAGE_READ_CONCURRENCY) {
      const batch = tenants.slice(i, i + USAGE_READ_CONCURRENCY);
      rows.push(...(await Promise.all(batch.map(readTenant))));
    }

    return rows.sort(
      (a, b) => b.used - a.used || a.tenant_name.localeCompare(b.tenant_name),
    );
  }
}
