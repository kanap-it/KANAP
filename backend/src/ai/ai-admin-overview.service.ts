import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export type AiAdminOverviewRecentActivityItem = {
  conversation_id: string;
  title: string | null;
  user_id: string | null;
  provider: string | null;
  model: string | null;
  updated_at: string;
};

export type AiAdminOverviewResponse = {
  totals: {
    conversations_all: number;
    conversations_7d: number;
    conversations_30d: number;
    active_users_30d: number;
  };
  usage: {
    current_month: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      message_count: number;
    };
    last_30_days: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      message_count: number;
    };
  };
  recent_activity: AiAdminOverviewRecentActivityItem[];
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  return date.toISOString();
}

@Injectable()
export class AiAdminOverviewService {
  async getOverview(
    tenantId: string,
    manager: EntityManager,
  ): Promise<AiAdminOverviewResponse> {
    const totalsRows = await manager.query(
      `
      SELECT
        COUNT(*)::bigint AS conversations_all,
        COUNT(*) FILTER (WHERE updated_at >= now() - interval '7 days')::bigint AS conversations_7d,
        COUNT(*) FILTER (WHERE updated_at >= now() - interval '30 days')::bigint AS conversations_30d,
        COUNT(DISTINCT user_id) FILTER (WHERE updated_at >= now() - interval '30 days')::bigint AS active_users_30d
      FROM ai_conversations
      WHERE tenant_id = $1
      `,
      [tenantId],
    );

    const currentMonthRows = await manager.query(
      `
      SELECT
        COALESCE(SUM(COALESCE((usage_json->>'input_tokens')::bigint, 0)), 0)::bigint AS input_tokens,
        COALESCE(SUM(COALESCE((usage_json->>'output_tokens')::bigint, 0)), 0)::bigint AS output_tokens,
        COUNT(*)::bigint AS message_count
      FROM ai_messages
      WHERE tenant_id = $1
        AND created_at >= date_trunc('month', now())
      `,
      [tenantId],
    );

    const last30DaysRows = await manager.query(
      `
      SELECT
        COALESCE(SUM(COALESCE((usage_json->>'input_tokens')::bigint, 0)), 0)::bigint AS input_tokens,
        COALESCE(SUM(COALESCE((usage_json->>'output_tokens')::bigint, 0)), 0)::bigint AS output_tokens,
        COUNT(*)::bigint AS message_count
      FROM ai_messages
      WHERE tenant_id = $1
        AND created_at >= now() - interval '30 days'
      `,
      [tenantId],
    );

    const recentActivityRows = await manager.query(
      `
      SELECT
        id AS conversation_id,
        title,
        user_id,
        provider,
        model,
        updated_at
      FROM ai_conversations
      WHERE tenant_id = $1
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 10
      `,
      [tenantId],
    );

    const totals = totalsRows[0] ?? {};
    const currentMonth = currentMonthRows[0] ?? {};
    const last30Days = last30DaysRows[0] ?? {};

    return {
      totals: {
        conversations_all: toNumber(totals.conversations_all),
        conversations_7d: toNumber(totals.conversations_7d),
        conversations_30d: toNumber(totals.conversations_30d),
        active_users_30d: toNumber(totals.active_users_30d),
      },
      usage: {
        current_month: {
          input_tokens: toNumber(currentMonth.input_tokens),
          output_tokens: toNumber(currentMonth.output_tokens),
          total_tokens: toNumber(currentMonth.input_tokens) + toNumber(currentMonth.output_tokens),
          message_count: toNumber(currentMonth.message_count),
        },
        last_30_days: {
          input_tokens: toNumber(last30Days.input_tokens),
          output_tokens: toNumber(last30Days.output_tokens),
          total_tokens: toNumber(last30Days.input_tokens) + toNumber(last30Days.output_tokens),
          message_count: toNumber(last30Days.message_count),
        },
      },
      recent_activity: recentActivityRows.map((row: Record<string, unknown>) => ({
        conversation_id: String(row.conversation_id),
        title: row.title == null ? null : String(row.title),
        user_id: row.user_id == null ? null : String(row.user_id),
        provider: row.provider == null ? null : String(row.provider),
        model: row.model == null ? null : String(row.model),
        updated_at: toIsoDate(row.updated_at),
      })),
    };
  }
}
