import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  AiContextEntityType,
  AiEntityContextDto,
  AiEntityRelationshipGroupDto,
  AiEntitySummaryDto,
  AiExecutionContext,
  AiExecutionContextWithManager,
  AiKnowledgeContextDto,
  AiSearchEntityType,
} from './ai.types';
import { AiPolicyService } from './ai-policy.service';

type SearchRow = {
  id: string;
  item_number?: number | null;
  label: string;
  summary: string | null;
  status: string | null;
  updated_at: Date | string | null;
  score?: number;
};

function buildRequestSummarySql(alias: string): string {
  return `COALESCE(NULLIF(${alias}.current_situation, ''), NULLIF(${alias}.expected_benefits, ''))`;
}

function buildProjectSummarySql(alias: string): string {
  return `NULLIF(CONCAT_WS(' | ',
    CASE
      WHEN ${alias}.origin IS NOT NULL AND ${alias}.origin <> 'standard'
      THEN CONCAT('Origin: ', ${alias}.origin)
      ELSE NULL
    END,
    CASE
      WHEN COALESCE(${alias}.execution_progress, 0) > 0
      THEN CONCAT('Progress: ', ROUND(${alias}.execution_progress)::int, '%')
      ELSE NULL
    END,
    CASE
      WHEN ${alias}.planned_end IS NOT NULL
      THEN CONCAT('Target end: ', ${alias}.planned_end::text)
      ELSE NULL
    END
  ), '')`;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildRef(type: AiSearchEntityType | AiContextEntityType, itemNumber?: number | null): string | null {
  if (!itemNumber) return null;
  if (type === 'projects') return `PRJ-${itemNumber}`;
  if (type === 'requests') return `REQ-${itemNumber}`;
  if (type === 'tasks') return `T-${itemNumber}`;
  if (type === 'documents') return `DOC-${itemNumber}`;
  return null;
}

function toSummary(
  type: AiSearchEntityType | AiContextEntityType,
  row: SearchRow,
  matchContext?: string | null,
): AiEntitySummaryDto {
  return {
    type,
    id: row.id,
    ref: buildRef(type, row.item_number ?? null),
    label: row.label,
    status: row.status ?? null,
    summary: row.summary ?? null,
    updated_at: toIso(row.updated_at),
    match_context: matchContext ?? null,
  };
}

@Injectable()
export class AiEntityService {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly policy: AiPolicyService,
  ) {}

  private parseNumericRef(query: string): number | null {
    const match = String(query || '').trim().match(/^(?:PRJ|REQ|T|DOC)-?(\d+)$/i)
      ?? String(query || '').trim().match(/^(\d+)$/);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  private async searchApplications(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ) {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT a.id,
              a.name AS label,
              a.description AS summary,
              a.status,
              a.updated_at,
              CASE
                WHEN a.name ILIKE $1 THEN 3
                WHEN COALESCE(a.description, '') ILIKE $1 THEN 2
                ELSE 1
              END AS score
       FROM applications a
       LEFT JOIN suppliers s ON s.id = a.supplier_id AND s.tenant_id = $2
       WHERE a.tenant_id = $2
         AND (
           a.name ILIKE $1
           OR COALESCE(a.description, '') ILIKE $1
           OR COALESCE(a.editor, '') ILIKE $1
           OR COALESCE(a.notes, '') ILIKE $1
           OR COALESCE(a.support_notes, '') ILIKE $1
           OR COALESCE(a.licensing, '') ILIKE $1
           OR COALESCE(a.version, '') ILIKE $1
           OR COALESCE(a.category, '') ILIKE $1
           OR COALESCE(a.lifecycle, '') ILIKE $1
           OR COALESCE(a.criticality, '') ILIKE $1
           OR COALESCE(a.status, '') ILIKE $1
           OR COALESCE(a.data_class, '') ILIKE $1
           OR COALESCE(a.hosting_model, '') ILIKE $1
           OR COALESCE(s.name, '') ILIKE $1
         )
       ORDER BY score DESC, a.updated_at DESC, a.name ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return rows.map((row) => ({ ...toSummary('applications', row, row.summary), _score: row.score ?? 1 }));
  }

  private async searchAssets(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ) {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT a.id,
              a.name AS label,
              COALESCE(a.fqdn, a.hostname, a.notes) AS summary,
              a.status,
              a.updated_at,
              CASE
                WHEN a.name ILIKE $1 THEN 3
                WHEN COALESCE(a.fqdn, '') ILIKE $1 OR COALESCE(a.hostname, '') ILIKE $1 THEN 2
                ELSE 1
              END AS score
       FROM assets a
       WHERE a.tenant_id = $2
         AND (
           a.name ILIKE $1
           OR COALESCE(a.fqdn, '') ILIKE $1
           OR COALESCE(a.hostname, '') ILIKE $1
           OR COALESCE(a.notes, '') ILIKE $1
           OR COALESCE(a.domain, '') ILIKE $1
           OR COALESCE(a.cluster, '') ILIKE $1
           OR COALESCE(a.operating_system, '') ILIKE $1
           OR COALESCE(a.kind, '') ILIKE $1
           OR COALESCE(a.provider, '') ILIKE $1
           OR COALESCE(a.environment, '') ILIKE $1
           OR COALESCE(a.region, '') ILIKE $1
           OR COALESCE(a.zone, '') ILIKE $1
           OR COALESCE(a.status, '') ILIKE $1
           OR EXISTS (SELECT 1 FROM unnest(a.aliases) AS alias WHERE alias ILIKE $1)
         )
       ORDER BY score DESC, a.updated_at DESC, a.name ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return rows.map((row) => ({ ...toSummary('assets', row, row.summary), _score: row.score ?? 1 }));
  }

  private async searchProjects(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ) {
    const like = `%${query}%`;
    const ref = this.parseNumericRef(query);
    const summarySql = buildProjectSummarySql('p');
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT p.id,
              p.item_number,
              p.name AS label,
              ${summarySql} AS summary,
              p.status,
              p.updated_at,
              CASE
                WHEN $1::int IS NOT NULL AND p.item_number = $1 THEN 4
                WHEN p.name ILIKE $2 THEN 3
                ELSE 1
              END AS score
       FROM portfolio_projects p
       LEFT JOIN portfolio_categories pc ON pc.id = p.category_id AND pc.tenant_id = $3
       LEFT JOIN portfolio_streams ps ON ps.id = p.stream_id AND ps.tenant_id = $3
       LEFT JOIN companies co ON co.id = p.company_id AND co.tenant_id = $3
       LEFT JOIN departments dep ON dep.id = p.department_id AND dep.tenant_id = $3
       LEFT JOIN users u_bs ON u_bs.id = p.business_sponsor_id
       LEFT JOIN users u_bl ON u_bl.id = p.business_lead_id
       LEFT JOIN users u_is ON u_is.id = p.it_sponsor_id
       LEFT JOIN users u_il ON u_il.id = p.it_lead_id
       WHERE p.tenant_id = $3
         AND (
           ($1::int IS NOT NULL AND p.item_number = $1)
           OR p.name ILIKE $2
           OR COALESCE(p.origin, '') ILIKE $2
           OR COALESCE(p.status, '') ILIKE $2
           OR COALESCE(p.override_justification, '') ILIKE $2
           OR COALESCE(pc.name, '') ILIKE $2
           OR COALESCE(ps.name, '') ILIKE $2
           OR COALESCE(co.name, '') ILIKE $2
           OR COALESCE(dep.name, '') ILIKE $2
           OR CONCAT_WS(' ', u_bs.first_name, u_bs.last_name) ILIKE $2
           OR CONCAT_WS(' ', u_bl.first_name, u_bl.last_name) ILIKE $2
           OR CONCAT_WS(' ', u_is.first_name, u_is.last_name) ILIKE $2
           OR CONCAT_WS(' ', u_il.first_name, u_il.last_name) ILIKE $2
           OR EXISTS (
             SELECT 1 FROM portfolio_project_team pt
             JOIN users u_tm ON u_tm.id = pt.user_id
             WHERE pt.project_id = p.id AND pt.tenant_id = $3
               AND CONCAT_WS(' ', u_tm.first_name, u_tm.last_name) ILIKE $2
           )
         )
       ORDER BY score DESC, p.updated_at DESC, p.name ASC
       LIMIT $4`,
      [ref, like, context.tenantId, limit],
    );

    return rows.map((row) => ({ ...toSummary('projects', row, row.summary), _score: row.score ?? 1 }));
  }

  private async searchRequests(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ) {
    const like = `%${query}%`;
    const ref = this.parseNumericRef(query);
    const summarySql = buildRequestSummarySql('r');
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT r.id,
              r.item_number,
              r.name AS label,
              ${summarySql} AS summary,
              r.status,
              r.updated_at,
              CASE
                WHEN $1::int IS NOT NULL AND r.item_number = $1 THEN 4
                WHEN r.name ILIKE $2 THEN 3
                ELSE 1
              END AS score
       FROM portfolio_requests r
       LEFT JOIN portfolio_categories pc ON pc.id = r.category_id AND pc.tenant_id = $3
       LEFT JOIN portfolio_streams ps ON ps.id = r.stream_id AND ps.tenant_id = $3
       LEFT JOIN companies co ON co.id = r.company_id AND co.tenant_id = $3
       LEFT JOIN departments dep ON dep.id = r.department_id AND dep.tenant_id = $3
       LEFT JOIN users u_req ON u_req.id = r.requestor_id
       LEFT JOIN users u_bs ON u_bs.id = r.business_sponsor_id
       LEFT JOIN users u_bl ON u_bl.id = r.business_lead_id
       LEFT JOIN users u_is ON u_is.id = r.it_sponsor_id
       LEFT JOIN users u_il ON u_il.id = r.it_lead_id
       WHERE r.tenant_id = $3
         AND (
           ($1::int IS NOT NULL AND r.item_number = $1)
           OR r.name ILIKE $2
           OR COALESCE(r.current_situation, '') ILIKE $2
           OR COALESCE(r.expected_benefits, '') ILIKE $2
           OR COALESCE(r.status, '') ILIKE $2
           OR COALESCE(r.override_justification, '') ILIKE $2
           OR COALESCE(pc.name, '') ILIKE $2
           OR COALESCE(ps.name, '') ILIKE $2
           OR COALESCE(co.name, '') ILIKE $2
           OR COALESCE(dep.name, '') ILIKE $2
           OR CONCAT_WS(' ', u_req.first_name, u_req.last_name) ILIKE $2
           OR CONCAT_WS(' ', u_bs.first_name, u_bs.last_name) ILIKE $2
           OR CONCAT_WS(' ', u_bl.first_name, u_bl.last_name) ILIKE $2
           OR CONCAT_WS(' ', u_is.first_name, u_is.last_name) ILIKE $2
           OR CONCAT_WS(' ', u_il.first_name, u_il.last_name) ILIKE $2
           OR EXISTS (
             SELECT 1 FROM portfolio_request_team rt
             JOIN users u_tm ON u_tm.id = rt.user_id
             WHERE rt.request_id = r.id AND rt.tenant_id = $3
               AND CONCAT_WS(' ', u_tm.first_name, u_tm.last_name) ILIKE $2
           )
         )
       ORDER BY score DESC, r.updated_at DESC, r.name ASC
       LIMIT $4`,
      [ref, like, context.tenantId, limit],
    );

    return rows.map((row) => ({ ...toSummary('requests', row, row.summary), _score: row.score ?? 1 }));
  }

  private async searchTasks(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ) {
    const like = `%${query}%`;
    const ref = this.parseNumericRef(query);
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT t.id,
              t.item_number,
              COALESCE(t.title, 'Untitled task') AS label,
              t.description AS summary,
              t.status,
              t.updated_at,
              CASE
                WHEN $1::int IS NOT NULL AND t.item_number = $1 THEN 4
                WHEN COALESCE(t.title, '') ILIKE $2 THEN 3
                ELSE 1
              END AS score
       FROM tasks t
       LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id
       LEFT JOIN portfolio_task_types tt ON tt.id = t.task_type_id AND tt.tenant_id = $3
       LEFT JOIN companies co ON co.id = t.company_id AND co.tenant_id = $3
       LEFT JOIN portfolio_categories pc ON pc.id = t.category_id AND pc.tenant_id = $3
       LEFT JOIN portfolio_streams ps ON ps.id = t.stream_id AND ps.tenant_id = $3
       LEFT JOIN portfolio_projects rel_proj ON rel_proj.id = t.related_object_id AND t.related_object_type = 'project' AND rel_proj.tenant_id = $3
       LEFT JOIN spend_items rel_si ON rel_si.id = t.related_object_id AND t.related_object_type = 'spend_item' AND rel_si.tenant_id = $3
       LEFT JOIN contracts rel_ct ON rel_ct.id = t.related_object_id AND t.related_object_type = 'contract' AND rel_ct.tenant_id = $3
       LEFT JOIN capex_items rel_cx ON rel_cx.id = t.related_object_id AND t.related_object_type = 'capex_item' AND rel_cx.tenant_id = $3
       WHERE t.tenant_id = $3
         AND (
           ($1::int IS NOT NULL AND t.item_number = $1)
           OR COALESCE(t.title, '') ILIKE $2
           OR COALESCE(t.description, '') ILIKE $2
           OR COALESCE(t.status, '') ILIKE $2
           OR COALESCE(t.priority_level, '') ILIKE $2
           OR COALESCE(t.related_object_type, '') ILIKE $2
           OR CONCAT_WS(' ', u_assign.first_name, u_assign.last_name) ILIKE $2
           OR COALESCE(tt.name, '') ILIKE $2
           OR COALESCE(co.name, '') ILIKE $2
           OR COALESCE(pc.name, '') ILIKE $2
           OR COALESCE(ps.name, '') ILIKE $2
           OR COALESCE(rel_proj.name, '') ILIKE $2
           OR COALESCE(rel_si.product_name, '') ILIKE $2
           OR COALESCE(rel_ct.name, '') ILIKE $2
           OR COALESCE(rel_cx.description, '') ILIKE $2
           OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(t.labels) AS lbl WHERE lbl ILIKE $2)
         )
       ORDER BY score DESC, t.updated_at DESC, t.created_at DESC
       LIMIT $4`,
      [ref, like, context.tenantId, limit],
    );

    return rows.map((row) => ({ ...toSummary('tasks', row, row.summary), _score: row.score ?? 1 }));
  }

  private async listApplications(context: AiExecutionContextWithManager) {
    const rows = await context.manager.query<any[]>(
      `SELECT a.id, NULL::int AS item_number, a.name AS label, a.description AS summary, a.status, a.updated_at,
              a.lifecycle, a.criticality, a.category, a.hosting_model,
              s.name AS supplier_name
       FROM applications a
       LEFT JOIN suppliers s ON s.id = a.supplier_id AND s.tenant_id = $1
       WHERE a.tenant_id = $1
       ORDER BY a.name ASC`,
      [context.tenantId],
    );
    return rows.map((row) => ({
      ...toSummary('applications', row),
      metadata: {
        lifecycle: row.lifecycle ?? null,
        criticality: row.criticality ?? null,
        category: row.category ?? null,
        hosting_model: row.hosting_model ?? null,
        supplier: row.supplier_name ?? null,
      },
    }));
  }

  private async listAssets(context: AiExecutionContextWithManager) {
    const rows = await context.manager.query<any[]>(
      `SELECT a.id, NULL::int AS item_number, a.name AS label, COALESCE(a.fqdn, a.hostname, a.notes) AS summary, a.status, a.updated_at,
              a.kind, a.provider, a.environment, a.operating_system
       FROM assets a
       WHERE a.tenant_id = $1
       ORDER BY a.name ASC`,
      [context.tenantId],
    );
    return rows.map((row) => ({
      ...toSummary('assets', row),
      metadata: {
        kind: row.kind ?? null,
        provider: row.provider ?? null,
        environment: row.environment ?? null,
        os: row.operating_system ?? null,
      },
    }));
  }

  private async listProjects(context: AiExecutionContextWithManager) {
    const summarySql = buildProjectSummarySql('p');
    const rows = await context.manager.query<any[]>(
      `SELECT p.id, p.item_number, p.name AS label, ${summarySql} AS summary, p.status, p.updated_at,
              pc.name AS category_name, ps.name AS stream_name, co.name AS company_name
       FROM portfolio_projects p
       LEFT JOIN portfolio_categories pc ON pc.id = p.category_id AND pc.tenant_id = $1
       LEFT JOIN portfolio_streams ps ON ps.id = p.stream_id AND ps.tenant_id = $1
       LEFT JOIN companies co ON co.id = p.company_id AND co.tenant_id = $1
       WHERE p.tenant_id = $1
       ORDER BY p.updated_at DESC, p.name ASC`,
      [context.tenantId],
    );
    return rows.map((row) => ({
      ...toSummary('projects', row),
      metadata: {
        category: row.category_name ?? null,
        stream: row.stream_name ?? null,
        company: row.company_name ?? null,
      },
    }));
  }

  private async listRequests(context: AiExecutionContextWithManager) {
    const summarySql = buildRequestSummarySql('r');
    const rows = await context.manager.query<any[]>(
      `SELECT r.id, r.item_number, r.name AS label, ${summarySql} AS summary, r.status, r.updated_at,
              pc.name AS category_name, ps.name AS stream_name, co.name AS company_name
       FROM portfolio_requests r
       LEFT JOIN portfolio_categories pc ON pc.id = r.category_id AND pc.tenant_id = $1
       LEFT JOIN portfolio_streams ps ON ps.id = r.stream_id AND ps.tenant_id = $1
       LEFT JOIN companies co ON co.id = r.company_id AND co.tenant_id = $1
       WHERE r.tenant_id = $1
       ORDER BY r.updated_at DESC, r.name ASC`,
      [context.tenantId],
    );
    return rows.map((row) => ({
      ...toSummary('requests', row),
      metadata: {
        category: row.category_name ?? null,
        stream: row.stream_name ?? null,
        company: row.company_name ?? null,
      },
    }));
  }

  private async listTasks(context: AiExecutionContextWithManager) {
    const rows = await context.manager.query<any[]>(
      `SELECT t.id, t.item_number, COALESCE(t.title, 'Untitled task') AS label, t.description AS summary, t.status, t.updated_at,
              tt.name AS task_type_name,
              t.related_object_type,
              COALESCE(rel_proj.name, rel_si.product_name, rel_ct.name, rel_cx.description) AS related_object_name,
              CONCAT_WS(' ', u_assign.first_name, u_assign.last_name) AS assignee_name,
              t.priority_level
       FROM tasks t
       LEFT JOIN portfolio_task_types tt ON tt.id = t.task_type_id AND tt.tenant_id = $1
       LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id
       LEFT JOIN portfolio_projects rel_proj ON rel_proj.id = t.related_object_id AND t.related_object_type = 'project' AND rel_proj.tenant_id = $1
       LEFT JOIN spend_items rel_si ON rel_si.id = t.related_object_id AND t.related_object_type = 'spend_item' AND rel_si.tenant_id = $1
       LEFT JOIN contracts rel_ct ON rel_ct.id = t.related_object_id AND t.related_object_type = 'contract' AND rel_ct.tenant_id = $1
       LEFT JOIN capex_items rel_cx ON rel_cx.id = t.related_object_id AND t.related_object_type = 'capex_item' AND rel_cx.tenant_id = $1
       WHERE t.tenant_id = $1
       ORDER BY t.updated_at DESC, t.created_at DESC`,
      [context.tenantId],
    );
    return rows.map((row) => ({
      ...toSummary('tasks', row),
      metadata: {
        task_type: row.task_type_name ?? null,
        related_to: row.related_object_type ?? null,
        related_object_name: row.related_object_name ?? null,
        assignee: row.assignee_name || null,
        priority: row.priority_level ?? null,
      },
    }));
  }

  async listEntities(
    context: AiExecutionContextWithManager,
    input: { entity_type: AiContextEntityType },
  ) {
    await this.policy.assertEntityTypeReadAccess(context, input.entity_type, context.manager);

    let items: AiEntitySummaryDto[];
    if (input.entity_type === 'applications') items = await this.listApplications(context);
    else if (input.entity_type === 'assets') items = await this.listAssets(context);
    else if (input.entity_type === 'projects') items = await this.listProjects(context);
    else if (input.entity_type === 'requests') items = await this.listRequests(context);
    else if (input.entity_type === 'tasks') items = await this.listTasks(context);
    else throw new BadRequestException('Unsupported entity type.');

    return { items, total: items.length };
  }

  async searchAll(
    context: AiExecutionContextWithManager,
    input: {
      query: string;
      entity_types?: AiSearchEntityType[];
      limit?: number;
    },
  ) {
    const requested = input.entity_types && input.entity_types.length > 0
      ? input.entity_types
      : ['applications', 'assets', 'projects', 'requests', 'tasks', 'documents'] as AiSearchEntityType[];
    const allowed = await this.policy.listReadableEntityTypes(context, requested, context.manager) as AiSearchEntityType[];
    if (allowed.length === 0) {
      return { items: [], total: 0, entity_types: [] as AiSearchEntityType[] };
    }

    const limit = Math.min(Math.max(Number(input.limit) || 50, 1), 100);
    const results = await Promise.all(
      allowed.map(async (type) => {
        if (type === 'applications') return this.searchApplications(context, input.query, limit);
        if (type === 'assets') return this.searchAssets(context, input.query, limit);
        if (type === 'projects') return this.searchProjects(context, input.query, limit);
        if (type === 'requests') return this.searchRequests(context, input.query, limit);
        if (type === 'tasks') return this.searchTasks(context, input.query, limit);

        const search = await this.knowledge.search({ q: input.query, limit }, { manager: context.manager });
        return (search.items || []).map((item: any, index: number) => ({
          ...toSummary('documents', {
            id: item.id,
            item_number: item.item_number,
            label: item.title,
            summary: item.summary ?? null,
            status: item.status,
            updated_at: item.updated_at,
          }, item.snippet ?? item.summary ?? null),
          _score: limit - index,
        }));
      }),
    );

    const items = results
      .flat()
      .sort((left: any, right: any) => {
        if ((right._score ?? 0) !== (left._score ?? 0)) {
          return (right._score ?? 0) - (left._score ?? 0);
        }
        const leftTime = new Date(left.updated_at || 0).getTime();
        const rightTime = new Date(right.updated_at || 0).getTime();
        return rightTime - leftTime;
      })
      .slice(0, limit)
      .map(({ _score, ...item }: any) => item);

    return {
      items,
      total: items.length,
      entity_types: allowed,
    };
  }

  private async getKnowledgeContext(
    context: AiExecutionContext,
    entityType: AiContextEntityType,
    entityId: string,
    manager: AiExecutionContextWithManager['manager'],
  ): Promise<AiKnowledgeContextDto> {
    const result = await this.knowledge.getKnowledgeContextForEntity(entityType as any, entityId, {
      manager,
      userId: context.userId,
    });

    return {
      access: result.access,
      total: result.total,
      groups: result.groups.map((group) => ({
        key: group.key,
        label: group.label,
        linked_via_label: group.linked_via_label,
        total: group.total,
        items: group.items.map((item) => ({
          id: item.id,
          ref: buildRef('documents', item.item_number),
          title: item.title,
          summary: item.summary ?? null,
          status: item.status,
          updated_at: toIso(item.updated_at),
          created_at: toIso(item.created_at),
          provenance: item.provenance.map((source) => ({
            entity_type: source.entity_type,
            entity_id: source.entity_id,
            ref: buildRef(source.entity_type as any, source.item_number),
            label: source.name,
            status: source.status ?? null,
          })),
        })),
      })),
    };
  }

  private dedupe(items: AiEntitySummaryDto[]): AiEntitySummaryDto[] {
    const seen = new Set<string>();
    const output: AiEntitySummaryDto[] = [];
    for (const item of items) {
      const key = `${item.type}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(item);
    }
    return output;
  }

  private async buildApplicationContext(context: AiExecutionContext, applicationId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextDto> {
    const requestSummarySql = buildRequestSummarySql('r');
    const projectSummarySql = buildProjectSummarySql('p');
    const { tenantId } = context;
    const applications = await manager.query<any[]>(
      `SELECT a.id, a.name, a.description, a.status, a.updated_at, a.lifecycle, a.environment, a.editor, a.criticality, a.hosting_model
       FROM applications a
       WHERE a.id = $1
         AND a.tenant_id = $2
       LIMIT 1`,
      [applicationId, tenantId],
    );
    const application = applications[0];
    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    const [requestRows, projectRows, relatedApplicationRows, assetRows] = await Promise.all([
      manager.query<SearchRow[]>(
        `SELECT r.id, r.item_number, r.name AS label, ${requestSummarySql} AS summary, r.status, r.updated_at
         FROM portfolio_request_applications l
         JOIN portfolio_requests r ON r.id = l.request_id AND r.tenant_id = $2 AND r.tenant_id = l.tenant_id
         WHERE l.application_id = $1
           AND l.tenant_id = $2
         ORDER BY r.updated_at DESC`,
        [applicationId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT p.id, p.item_number, p.name AS label, ${projectSummarySql} AS summary, p.status, p.updated_at
         FROM application_projects l
         JOIN portfolio_projects p ON p.id = l.project_id AND p.tenant_id = $2 AND p.tenant_id = l.tenant_id
         WHERE l.application_id = $1
           AND l.tenant_id = $2
         ORDER BY p.updated_at DESC`,
        [applicationId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT a.id, NULL::int AS item_number, a.name AS label, a.description AS summary, a.status, a.updated_at
         FROM application_suites l
         JOIN applications a ON a.id = l.suite_id AND a.tenant_id = $2 AND a.tenant_id = l.tenant_id
         WHERE l.application_id = $1
           AND l.tenant_id = $2
         UNION
         SELECT a.id, NULL::int AS item_number, a.name AS label, a.description AS summary, a.status, a.updated_at
         FROM application_suites l
         JOIN applications a ON a.id = l.application_id AND a.tenant_id = $2 AND a.tenant_id = l.tenant_id
         WHERE l.suite_id = $1
           AND l.tenant_id = $2`,
        [applicationId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT a.id, NULL::int AS item_number, a.name AS label, COALESCE(a.fqdn, a.hostname, a.notes) AS summary, a.status, a.updated_at
         FROM app_instances ai
         JOIN app_asset_assignments aaa ON aaa.app_instance_id = ai.id AND aaa.tenant_id = $2 AND aaa.tenant_id = ai.tenant_id
         JOIN assets a ON a.id = aaa.asset_id AND a.tenant_id = $2 AND a.tenant_id = aaa.tenant_id
         WHERE ai.application_id = $1
           AND ai.tenant_id = $2
         ORDER BY a.updated_at DESC`,
        [applicationId, tenantId],
      ),
    ]);

    return {
      entity: {
        ...toSummary('applications', {
          id: application.id,
          label: application.name,
          summary: application.description,
          status: application.status,
          updated_at: application.updated_at,
        }),
        metadata: {
          lifecycle: application.lifecycle,
          environment: application.environment,
          editor: application.editor,
          criticality: application.criticality,
          hosting_model: application.hosting_model,
        },
      },
      related: [
        { relation: 'linked_requests', label: 'Linked Requests', items: requestRows.map((row) => toSummary('requests', row)) },
        { relation: 'linked_projects', label: 'Linked Projects', items: projectRows.map((row) => toSummary('projects', row)) },
        { relation: 'related_applications', label: 'Related Applications', items: this.dedupe(relatedApplicationRows.map((row) => toSummary('applications', row))) },
        { relation: 'linked_assets', label: 'Linked Assets', items: this.dedupe(assetRows.map((row) => toSummary('assets', row))) },
      ].filter((group) => group.items.length > 0),
      knowledge: await this.getKnowledgeContext(context, 'applications', applicationId, manager),
    };
  }

  private async buildAssetContext(context: AiExecutionContext, assetId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextDto> {
    const requestSummarySql = buildRequestSummarySql('r');
    const projectSummarySql = buildProjectSummarySql('p');
    const { tenantId } = context;
    const assets = await manager.query<any[]>(
      `SELECT a.id, a.name, a.status, a.updated_at, a.kind, a.provider, a.environment, a.fqdn, a.region, a.zone, a.notes
       FROM assets a
       WHERE a.id = $1
         AND a.tenant_id = $2
       LIMIT 1`,
      [assetId, tenantId],
    );
    const asset = assets[0];
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }

    const [requestRows, projectRows, relatedAssetRows, applicationRows] = await Promise.all([
      manager.query<SearchRow[]>(
        `SELECT r.id, r.item_number, r.name AS label, ${requestSummarySql} AS summary, r.status, r.updated_at
         FROM portfolio_request_assets l
         JOIN portfolio_requests r ON r.id = l.request_id AND r.tenant_id = $2 AND r.tenant_id = l.tenant_id
         WHERE l.asset_id = $1
           AND l.tenant_id = $2
         ORDER BY r.updated_at DESC`,
        [assetId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT p.id, p.item_number, p.name AS label, ${projectSummarySql} AS summary, p.status, p.updated_at
         FROM asset_projects l
         JOIN portfolio_projects p ON p.id = l.project_id AND p.tenant_id = $2 AND p.tenant_id = l.tenant_id
         WHERE l.asset_id = $1
           AND l.tenant_id = $2
         ORDER BY p.updated_at DESC`,
        [assetId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT a.id, NULL::int AS item_number, a.name AS label, COALESCE(a.fqdn, a.hostname, a.notes) AS summary, a.status, a.updated_at
         FROM asset_relations rel
         JOIN assets a ON a.id = rel.related_asset_id AND a.tenant_id = $2 AND a.tenant_id = rel.tenant_id
         WHERE rel.asset_id = $1
           AND rel.tenant_id = $2
         UNION
         SELECT a.id, NULL::int AS item_number, a.name AS label, COALESCE(a.fqdn, a.hostname, a.notes) AS summary, a.status, a.updated_at
         FROM asset_relations rel
         JOIN assets a ON a.id = rel.asset_id AND a.tenant_id = $2 AND a.tenant_id = rel.tenant_id
         WHERE rel.related_asset_id = $1
           AND rel.tenant_id = $2`,
        [assetId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT a.id, NULL::int AS item_number, a.name AS label, a.description AS summary, a.status, a.updated_at
         FROM app_asset_assignments aaa
         JOIN app_instances ai ON ai.id = aaa.app_instance_id AND ai.tenant_id = $2 AND ai.tenant_id = aaa.tenant_id
         JOIN applications a ON a.id = ai.application_id AND a.tenant_id = $2 AND a.tenant_id = ai.tenant_id
         WHERE aaa.asset_id = $1
           AND aaa.tenant_id = $2
         ORDER BY a.updated_at DESC`,
        [assetId, tenantId],
      ),
    ]);

    return {
      entity: {
        ...toSummary('assets', {
          id: asset.id,
          label: asset.name,
          summary: asset.fqdn ?? asset.notes ?? null,
          status: asset.status,
          updated_at: asset.updated_at,
        }),
        metadata: {
          kind: asset.kind,
          provider: asset.provider,
          environment: asset.environment,
          fqdn: asset.fqdn,
          region: asset.region,
          zone: asset.zone,
        },
      },
      related: [
        { relation: 'linked_requests', label: 'Linked Requests', items: requestRows.map((row) => toSummary('requests', row)) },
        { relation: 'linked_projects', label: 'Linked Projects', items: projectRows.map((row) => toSummary('projects', row)) },
        { relation: 'related_assets', label: 'Related Assets', items: this.dedupe(relatedAssetRows.map((row) => toSummary('assets', row))) },
        { relation: 'linked_applications', label: 'Linked Applications', items: this.dedupe(applicationRows.map((row) => toSummary('applications', row))) },
      ].filter((group) => group.items.length > 0),
      knowledge: await this.getKnowledgeContext(context, 'assets', assetId, manager),
    };
  }

  private async buildRequestContext(context: AiExecutionContext, requestId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextDto> {
    const requestSummarySql = buildRequestSummarySql('r');
    const projectSummarySql = buildProjectSummarySql('p');
    const { tenantId } = context;
    const requests = await manager.query<any[]>(
      `SELECT r.id,
              r.item_number,
              r.name,
              ${requestSummarySql} AS summary,
              r.current_situation,
              r.expected_benefits,
              r.status,
              r.updated_at,
              r.target_delivery_date,
              CASE WHEN ot.id IS NOT NULL THEN CONCAT('T-', ot.item_number, ' ', COALESCE(ot.title, 'Untitled task')) ELSE NULL END AS origin_task_ref
       FROM portfolio_requests r
       LEFT JOIN tasks ot ON ot.id = r.origin_task_id AND ot.tenant_id = $2
       WHERE r.id = $1
         AND r.tenant_id = $2
       LIMIT 1`,
      [requestId, tenantId],
    );
    const request = requests[0];
    if (!request) {
      throw new NotFoundException('Request not found.');
    }

    const [projectRows, dependencyRows, applicationRows, assetRows] = await Promise.all([
      manager.query<SearchRow[]>(
        `SELECT p.id, p.item_number, p.name AS label, ${projectSummarySql} AS summary, p.status, p.updated_at
         FROM portfolio_request_projects rp
         JOIN portfolio_projects p ON p.id = rp.project_id AND p.tenant_id = $2 AND p.tenant_id = rp.tenant_id
         WHERE rp.request_id = $1
           AND rp.tenant_id = $2
         ORDER BY p.updated_at DESC`,
        [requestId, tenantId],
      ),
      manager.query<any[]>(
        `SELECT r.id AS request_id,
                r.item_number AS request_item_number,
                r.name AS request_label,
                ${requestSummarySql} AS request_summary,
                r.status AS request_status,
                r.updated_at AS request_updated_at,
                p.id AS project_id,
                p.item_number AS project_item_number,
                p.name AS project_label,
                ${projectSummarySql} AS project_summary,
                p.status AS project_status,
                p.updated_at AS project_updated_at
         FROM portfolio_request_dependencies d
         LEFT JOIN portfolio_requests r ON r.id = d.depends_on_request_id AND r.tenant_id = $2 AND r.tenant_id = d.tenant_id
         LEFT JOIN portfolio_projects p ON p.id = d.depends_on_project_id AND p.tenant_id = $2 AND p.tenant_id = d.tenant_id
         WHERE d.request_id = $1
           AND d.tenant_id = $2`,
        [requestId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT a.id, NULL::int AS item_number, a.name AS label, a.description AS summary, a.status, a.updated_at
         FROM portfolio_request_applications l
         JOIN applications a ON a.id = l.application_id AND a.tenant_id = $2 AND a.tenant_id = l.tenant_id
         WHERE l.request_id = $1
           AND l.tenant_id = $2
         ORDER BY a.updated_at DESC`,
        [requestId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT a.id, NULL::int AS item_number, a.name AS label, COALESCE(a.fqdn, a.hostname, a.notes) AS summary, a.status, a.updated_at
         FROM portfolio_request_assets l
         JOIN assets a ON a.id = l.asset_id AND a.tenant_id = $2 AND a.tenant_id = l.tenant_id
         WHERE l.request_id = $1
           AND l.tenant_id = $2
         ORDER BY a.updated_at DESC`,
        [requestId, tenantId],
      ),
    ]);

    const dependencyItems = dependencyRows.flatMap((row) => {
      const items: AiEntitySummaryDto[] = [];
      if (row.request_id) {
        items.push(toSummary('requests', {
          id: row.request_id,
          item_number: row.request_item_number,
          label: row.request_label,
          summary: row.request_summary,
          status: row.request_status,
          updated_at: row.request_updated_at,
        }));
      }
      if (row.project_id) {
        items.push(toSummary('projects', {
          id: row.project_id,
          item_number: row.project_item_number,
          label: row.project_label,
          summary: row.project_summary,
          status: row.project_status,
          updated_at: row.project_updated_at,
        }));
      }
      return items;
    });

    return {
      entity: {
        ...toSummary('requests', {
          id: request.id,
          item_number: request.item_number,
          label: request.name,
          summary: request.summary,
          status: request.status,
          updated_at: request.updated_at,
        }),
        metadata: {
          current_situation: request.current_situation ?? null,
          expected_benefits: request.expected_benefits ?? null,
          target_delivery_date: request.target_delivery_date ?? null,
          origin_task: request.origin_task_ref ?? null,
        },
      },
      related: [
        { relation: 'resulting_projects', label: 'Resulting Projects', items: projectRows.map((row) => toSummary('projects', row)) },
        { relation: 'dependencies', label: 'Dependencies', items: this.dedupe(dependencyItems) },
        { relation: 'linked_applications', label: 'Linked Applications', items: applicationRows.map((row) => toSummary('applications', row)) },
        { relation: 'linked_assets', label: 'Linked Assets', items: assetRows.map((row) => toSummary('assets', row)) },
      ].filter((group) => group.items.length > 0),
      knowledge: await this.getKnowledgeContext(context, 'requests', requestId, manager),
    };
  }

  private async buildProjectContext(context: AiExecutionContext, projectId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextDto> {
    const requestSummarySql = buildRequestSummarySql('r');
    const projectSummarySql = buildProjectSummarySql('p');
    const { tenantId } = context;
    const projects = await manager.query<any[]>(
      `SELECT p.id,
              p.item_number,
              p.name,
              ${projectSummarySql} AS summary,
              p.status,
              p.updated_at,
              p.origin,
              p.execution_progress,
              p.planned_start,
              p.planned_end,
              p.actual_start,
              p.actual_end
       FROM portfolio_projects p
       WHERE p.id = $1
         AND p.tenant_id = $2
       LIMIT 1`,
      [projectId, tenantId],
    );
    const project = projects[0];
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const [requestRows, dependencyRows, applicationRows, assetRows] = await Promise.all([
      manager.query<SearchRow[]>(
        `SELECT r.id, r.item_number, r.name AS label, ${requestSummarySql} AS summary, r.status, r.updated_at
         FROM portfolio_request_projects rp
         JOIN portfolio_requests r ON r.id = rp.request_id AND r.tenant_id = $2 AND r.tenant_id = rp.tenant_id
         WHERE rp.project_id = $1
           AND rp.tenant_id = $2
         ORDER BY r.updated_at DESC`,
        [projectId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT p.id, p.item_number, p.name AS label, ${projectSummarySql} AS summary, p.status, p.updated_at
         FROM portfolio_project_dependencies d
         JOIN portfolio_projects p ON p.id = d.depends_on_project_id AND p.tenant_id = $2 AND p.tenant_id = d.tenant_id
         WHERE d.project_id = $1
           AND d.tenant_id = $2
         ORDER BY p.updated_at DESC`,
        [projectId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT a.id, NULL::int AS item_number, a.name AS label, a.description AS summary, a.status, a.updated_at
         FROM application_projects l
         JOIN applications a ON a.id = l.application_id AND a.tenant_id = $2 AND a.tenant_id = l.tenant_id
         WHERE l.project_id = $1
           AND l.tenant_id = $2
         ORDER BY a.updated_at DESC`,
        [projectId, tenantId],
      ),
      manager.query<SearchRow[]>(
        `SELECT a.id, NULL::int AS item_number, a.name AS label, COALESCE(a.fqdn, a.hostname, a.notes) AS summary, a.status, a.updated_at
         FROM asset_projects l
         JOIN assets a ON a.id = l.asset_id AND a.tenant_id = $2 AND a.tenant_id = l.tenant_id
         WHERE l.project_id = $1
           AND l.tenant_id = $2
         ORDER BY a.updated_at DESC`,
        [projectId, tenantId],
      ),
    ]);

    return {
      entity: {
        ...toSummary('projects', {
          id: project.id,
          item_number: project.item_number,
          label: project.name,
          summary: project.summary,
          status: project.status,
          updated_at: project.updated_at,
        }),
        metadata: {
          origin: project.origin ?? null,
          execution_progress: toNullableNumber(project.execution_progress),
          planned_start: project.planned_start ?? null,
          planned_end: project.planned_end ?? null,
          actual_start: project.actual_start ?? null,
          actual_end: project.actual_end ?? null,
        },
      },
      related: [
        { relation: 'source_requests', label: 'Source Requests', items: requestRows.map((row) => toSummary('requests', row)) },
        { relation: 'dependencies', label: 'Dependencies', items: dependencyRows.map((row) => toSummary('projects', row)) },
        { relation: 'linked_applications', label: 'Linked Applications', items: applicationRows.map((row) => toSummary('applications', row)) },
        { relation: 'linked_assets', label: 'Linked Assets', items: assetRows.map((row) => toSummary('assets', row)) },
      ].filter((group) => group.items.length > 0),
      knowledge: await this.getKnowledgeContext(context, 'projects', projectId, manager),
    };
  }

  private async buildTaskContext(context: AiExecutionContext, taskId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextDto> {
    const { tenantId } = context;
    const tasks = await manager.query<any[]>(
      `SELECT t.id,
              t.item_number,
              COALESCE(t.title, 'Untitled task') AS title,
              t.description,
              t.status,
              t.updated_at,
              t.related_object_type,
              t.related_object_id,
              t.assignee_user_id,
              CONCAT_WS(' ', u_assign.first_name, u_assign.last_name) AS assignee_name,
              t.priority_level,
              tt.name AS task_type_name,
              COALESCE(rel_proj.name, rel_si.product_name, rel_ct.name, rel_cx.description) AS related_object_name,
              pr.id AS converted_request_id,
              pr.item_number AS converted_request_item_number,
              pr.name AS converted_request_name,
              ${buildRequestSummarySql('pr')} AS converted_request_summary,
              pr.status AS converted_request_status,
              pr.updated_at AS converted_request_updated_at
       FROM tasks t
       LEFT JOIN portfolio_task_types tt ON tt.id = t.task_type_id AND tt.tenant_id = $2
       LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id
       LEFT JOIN portfolio_projects rel_proj ON rel_proj.id = t.related_object_id AND t.related_object_type = 'project' AND rel_proj.tenant_id = $2
       LEFT JOIN spend_items rel_si ON rel_si.id = t.related_object_id AND t.related_object_type = 'spend_item' AND rel_si.tenant_id = $2
       LEFT JOIN contracts rel_ct ON rel_ct.id = t.related_object_id AND t.related_object_type = 'contract' AND rel_ct.tenant_id = $2
       LEFT JOIN capex_items rel_cx ON rel_cx.id = t.related_object_id AND t.related_object_type = 'capex_item' AND rel_cx.tenant_id = $2
       LEFT JOIN portfolio_requests pr ON pr.origin_task_id = t.id AND pr.tenant_id = $2
       WHERE t.id = $1
         AND t.tenant_id = $2
       LIMIT 1`,
      [taskId, tenantId],
    );
    const task = tasks[0];
    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    const relatedGroups: AiEntityRelationshipGroupDto[] = [];
    if (task.related_object_type === 'project' && task.related_object_id) {
      const projectRows = await manager.query<SearchRow[]>(
        `SELECT p.id, p.item_number, p.name AS label, ${buildProjectSummarySql('p')} AS summary, p.status, p.updated_at
         FROM portfolio_projects p
         WHERE p.id = $1
           AND p.tenant_id = $2
         LIMIT 1`,
        [task.related_object_id, tenantId],
      );
      if (projectRows[0]) {
        relatedGroups.push({
          relation: 'related_project',
          label: 'Related Project',
          items: [toSummary('projects', projectRows[0])],
        });
      }
    }

    if (task.converted_request_id) {
      relatedGroups.push({
        relation: 'converted_request',
        label: 'Converted Request',
        items: [toSummary('requests', {
          id: task.converted_request_id,
          item_number: task.converted_request_item_number,
          label: task.converted_request_name,
          summary: task.converted_request_summary ?? null,
          status: task.converted_request_status,
          updated_at: task.converted_request_updated_at,
        })],
      });
    }

    return {
      entity: {
        ...toSummary('tasks', {
          id: task.id,
          item_number: task.item_number,
          label: task.title,
          summary: task.description,
          status: task.status,
          updated_at: task.updated_at,
        }),
        metadata: {
          task_type: task.task_type_name ?? null,
          related_to: task.related_object_type ?? null,
          related_object_name: task.related_object_name ?? null,
          assignee: task.assignee_name || null,
          priority_level: task.priority_level ?? null,
        },
      },
      related: relatedGroups,
      knowledge: await this.getKnowledgeContext(context, 'tasks', taskId, manager),
    };
  }

  async getEntityContext(
    context: AiExecutionContextWithManager,
    input: {
      entity_type: AiContextEntityType;
      entity_id: string;
    },
  ): Promise<AiEntityContextDto> {
    await this.policy.assertEntityTypeReadAccess(context, input.entity_type, context.manager);

    if (input.entity_type === 'applications') {
      return this.buildApplicationContext(context, input.entity_id, context.manager);
    }
    if (input.entity_type === 'assets') {
      return this.buildAssetContext(context, input.entity_id, context.manager);
    }
    if (input.entity_type === 'requests') {
      return this.buildRequestContext(context, input.entity_id, context.manager);
    }
    if (input.entity_type === 'projects') {
      return this.buildProjectContext(context, input.entity_id, context.manager);
    }
    if (input.entity_type === 'tasks') {
      return this.buildTaskContext(context, input.entity_id, context.manager);
    }

    throw new BadRequestException('Unsupported entity type.');
  }
}
