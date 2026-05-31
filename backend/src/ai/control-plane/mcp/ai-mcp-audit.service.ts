import { BadRequestException, Injectable } from '@nestjs/common';
import { validate as isUuid } from 'uuid';
import { AiExecutionContextWithManager } from '../../ai.types';

export type AiMcpAuditFilters = {
  apiKeyId?: string | null;
  runId?: string | null;
  toolExecutionId?: string | null;
  capabilityName?: string | null;
  status?: string | null;
  limit?: number | null;
};

export type AiMcpAuditItem = {
  run_id: string;
  tool_execution_id: string;
  tenant_id: string;
  ai_api_key_id: string | null;
  user_id: string | null;
  capability_name: string;
  capability_version: string;
  status: string;
  effect: string;
  duration_ms: number | null;
  run_created_at: string;
  tool_created_at: string;
  completed_at: string | null;
  input_summary: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  evidence_ids: string[];
};

@Injectable()
export class AiMcpAuditService {
  async list(
    context: AiExecutionContextWithManager,
    filters?: AiMcpAuditFilters,
  ): Promise<{ items: AiMcpAuditItem[]; limit: number }> {
    const normalized = this.normalizeFilters(filters ?? {});
    const params: unknown[] = [context.tenantId];
    const clauses = [
      'tool.tenant_id = $1',
      "tool.surface = 'mcp'",
      "run.invocation_channel = 'mcp'",
    ];

    if (normalized.apiKeyId) {
      params.push(normalized.apiKeyId);
      clauses.push(`run.ai_api_key_id = $${params.length}`);
    }
    if (normalized.runId) {
      params.push(normalized.runId);
      clauses.push(`run.id = $${params.length}`);
    }
    if (normalized.toolExecutionId) {
      params.push(normalized.toolExecutionId);
      clauses.push(`tool.id = $${params.length}`);
    }
    if (normalized.capabilityName) {
      params.push(normalized.capabilityName);
      clauses.push(`tool.capability_name = $${params.length}`);
    }
    if (normalized.status) {
      params.push(normalized.status);
      clauses.push(`tool.status = $${params.length}`);
    }
    params.push(normalized.limit);

    const rows = await context.manager.query(
      `
        SELECT
          run.id::text AS run_id,
          tool.id::text AS tool_execution_id,
          tool.tenant_id::text AS tenant_id,
          run.ai_api_key_id::text AS ai_api_key_id,
          run.user_id::text AS user_id,
          tool.capability_name,
          tool.capability_version,
          tool.status,
          tool.effect,
          tool.duration_ms,
          run.created_at AS run_created_at,
          tool.created_at AS tool_created_at,
          tool.completed_at,
          tool.input_summary,
          tool.output_summary,
          COALESCE(
            array_agg(evidence.id::text ORDER BY evidence.created_at)
              FILTER (WHERE evidence.id IS NOT NULL),
            ARRAY[]::text[]
          ) AS evidence_ids
        FROM ai_tool_executions tool
        JOIN ai_runs run
          ON run.id = tool.run_id
         AND run.tenant_id = tool.tenant_id
        LEFT JOIN ai_evidence evidence
          ON evidence.tool_execution_id = tool.id
         AND evidence.tenant_id = tool.tenant_id
        WHERE ${clauses.join(' AND ')}
        GROUP BY run.id, tool.id
        ORDER BY tool.created_at DESC
        LIMIT $${params.length}
      `,
      params,
    );

    return {
      items: rows.map((row: any) => ({
        run_id: String(row.run_id),
        tool_execution_id: String(row.tool_execution_id),
        tenant_id: String(row.tenant_id),
        ai_api_key_id: row.ai_api_key_id ? String(row.ai_api_key_id) : null,
        user_id: row.user_id ? String(row.user_id) : null,
        capability_name: String(row.capability_name),
        capability_version: String(row.capability_version),
        status: String(row.status),
        effect: String(row.effect),
        duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
        run_created_at: new Date(row.run_created_at).toISOString(),
        tool_created_at: new Date(row.tool_created_at).toISOString(),
        completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
        input_summary: row.input_summary ?? null,
        output_summary: row.output_summary ?? null,
        evidence_ids: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
      })),
      limit: normalized.limit,
    };
  }

  private normalizeFilters(filters: AiMcpAuditFilters): Required<AiMcpAuditFilters> {
    const limit = filters.limit == null ? 50 : Number(filters.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new BadRequestException('limit must be an integer from 1 to 200.');
    }
    return {
      apiKeyId: this.optionalUuid(filters.apiKeyId, 'api_key_id'),
      runId: this.optionalUuid(filters.runId, 'run_id'),
      toolExecutionId: this.optionalUuid(filters.toolExecutionId, 'tool_execution_id'),
      capabilityName: this.optionalToken(filters.capabilityName, 'capability_name'),
      status: this.optionalToken(filters.status, 'status'),
      limit,
    };
  }

  private optionalUuid(value: unknown, field: string): string | null {
    if (value == null || value === '') {
      return null;
    }
    const normalized = String(value).trim();
    if (!isUuid(normalized)) {
      throw new BadRequestException(`${field} must be a UUID.`);
    }
    return normalized;
  }

  private optionalToken(value: unknown, field: string): string | null {
    if (value == null || value === '') {
      return null;
    }
    const normalized = String(value).trim();
    if (!/^[A-Za-z0-9_.:-]{1,160}$/.test(normalized)) {
      throw new BadRequestException(`${field} contains unsupported characters.`);
    }
    return normalized;
  }
}
