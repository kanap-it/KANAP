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
  total_count?: number | null;
  metadata?: Record<string, string | number | null> | null;
};

type RankedSearchResult = {
  items: Array<AiEntitySummaryDto & { _score: number }>;
  total: number;
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

function buildUserNameSql(alias: string): string {
  return `COALESCE(NULLIF(TRIM(CONCAT(${alias}.first_name, ' ', ${alias}.last_name)), ''), ${alias}.email)`;
}

function buildContributorNamesSql(
  entityAlias: string,
  teamTable: 'portfolio_project_team' | 'portfolio_request_team',
  teamAlias: string,
  entityColumn: 'project_id' | 'request_id',
): string {
  return `COALESCE((
    SELECT string_agg(contributor.name, ', ' ORDER BY contributor.name)
    FROM (
      SELECT DISTINCT ${buildUserNameSql('u_tm')} AS name
      FROM ${teamTable} ${teamAlias}
      JOIN users u_tm ON u_tm.id = ${teamAlias}.user_id AND u_tm.tenant_id = ${entityAlias}.tenant_id
      WHERE ${teamAlias}.${entityColumn} = ${entityAlias}.id
        AND ${teamAlias}.tenant_id = ${entityAlias}.tenant_id
    ) contributor
  ), '')`;
}

function buildApplicationOwnerNamesSql(alias: string, ownerType: 'business' | 'it'): string {
  return `COALESCE((
    SELECT string_agg(owner.name, ', ' ORDER BY owner.name)
    FROM (
      SELECT DISTINCT ${buildUserNameSql('u_owner')} AS name
      FROM application_owners ao
      JOIN users u_owner ON u_owner.id = ao.user_id AND u_owner.tenant_id = ${alias}.tenant_id
      WHERE ao.application_id = ${alias}.id
        AND ao.tenant_id = ${alias}.tenant_id
        AND ao.owner_type = '${ownerType}'
    ) owner
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
    metadata: row.metadata ?? null,
  };
}

function toContextEntityBase(
  type: AiContextEntityType,
  row: SearchRow,
  matchContext?: string | null,
): Omit<AiEntitySummaryDto, 'metadata'> {
  const { metadata: _metadata, ...entity } = toSummary(type, row, matchContext);
  return entity;
}

function personDisplayName(row: any): string | null {
  if (!row) return null;
  if (typeof row === 'string') {
    const trimmed = row.trim();
    return trimmed || null;
  }
  const combined = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return combined || row.name || row.email || null;
}

function toPersonMetadata(row: any): { id: string | null; name: string | null; email: string | null } {
  return {
    id: row?.id ?? row?.user_id ?? null,
    name: personDisplayName(row),
    email: row?.email ?? null,
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
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const itOwnerNamesSql = buildApplicationOwnerNamesSql('a', 'it');
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT a.id,
              a.name AS label,
              a.description AS summary,
              a.status,
              a.updated_at,
              a.lifecycle,
              a.criticality,
              a.category,
              a.hosting_model,
              a.data_class,
              a.version,
              s.name AS supplier_name,
              ${itOwnerNamesSql} AS it_owner_names,
              COUNT(*) OVER()::int AS total_count,
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
           OR ${itOwnerNamesSql} ILIKE $1
         )
       ORDER BY score DESC, a.updated_at DESC, a.name ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('applications', {
          ...row,
          metadata: {
            lifecycle: row.lifecycle ?? null,
            criticality: row.criticality ?? null,
            category: row.category ?? null,
            hosting_model: row.hosting_model ?? null,
            data_class: row.data_class ?? null,
            version: row.version ?? null,
            supplier: row.supplier_name ?? null,
            it_owner: row.it_owner_names || null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchAssets(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT a.id,
              a.name AS label,
              COALESCE(a.fqdn, a.hostname, a.notes) AS summary,
              a.status,
              a.updated_at,
              COUNT(*) OVER()::int AS total_count,
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

    return {
      items: rows.map((row) => ({ ...toSummary('assets', row, row.summary), _score: row.score ?? 1 })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchLocations(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT ranked.id,
              ranked.label,
              ranked.summary,
              ranked.status,
              ranked.updated_at,
              ranked.score,
              COUNT(*) OVER()::int AS total_count
       FROM (
         SELECT DISTINCT ON (l.id) l.id,
                l.code || ' — ' || l.name AS label,
                COALESCE(NULLIF(l.city, ''), l.country_iso) AS summary,
                NULL::text AS status,
                l.updated_at,
                CASE
                  WHEN l.name ILIKE $1 THEN 3
                  WHEN l.code ILIKE $1 THEN 3
                  WHEN COALESCE(l.city, '') ILIKE $1 THEN 2
                  WHEN sl.name IS NOT NULL THEN 2
                  ELSE 1
                END AS score
         FROM locations l
         LEFT JOIN location_sub_items sl
           ON sl.location_id = l.id AND sl.tenant_id = l.tenant_id
           AND (sl.name ILIKE $1 OR COALESCE(sl.description, '') ILIKE $1)
         WHERE l.tenant_id = $2
           AND (
             l.code ILIKE $1
             OR l.name ILIKE $1
             OR COALESCE(l.city, '') ILIKE $1
             OR COALESCE(l.country_iso, '') ILIKE $1
             OR COALESCE(l.provider, '') ILIKE $1
             OR COALESCE(l.hosting_type, '') ILIKE $1
             OR sl.id IS NOT NULL
           )
         ORDER BY l.id, score DESC
       ) ranked
       ORDER BY ranked.score DESC, ranked.updated_at DESC, ranked.label ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return {
      items: rows.map((row) => ({ ...toSummary('locations', row, row.summary), _score: row.score ?? 1 })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchProjects(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const ref = this.parseNumericRef(query);
    const summarySql = buildProjectSummarySql('p');
    const contributorNamesSql = buildContributorNamesSql('p', 'portfolio_project_team', 'pt', 'project_id');
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT p.id,
              p.item_number,
              p.name AS label,
              ${summarySql} AS summary,
              p.status,
              p.updated_at,
              ${buildUserNameSql('u_bl')} AS business_lead_name,
              ${buildUserNameSql('u_il')} AS it_lead_name,
              ${contributorNamesSql} AS contributor_names,
              COUNT(*) OVER()::int AS total_count,
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
       LEFT JOIN users u_bs ON u_bs.id = p.business_sponsor_id AND u_bs.tenant_id = p.tenant_id
       LEFT JOIN users u_bl ON u_bl.id = p.business_lead_id AND u_bl.tenant_id = p.tenant_id
       LEFT JOIN users u_is ON u_is.id = p.it_sponsor_id AND u_is.tenant_id = p.tenant_id
       LEFT JOIN users u_il ON u_il.id = p.it_lead_id AND u_il.tenant_id = p.tenant_id
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
           OR ${buildUserNameSql('u_bs')} ILIKE $2
           OR ${buildUserNameSql('u_bl')} ILIKE $2
           OR ${buildUserNameSql('u_is')} ILIKE $2
           OR ${buildUserNameSql('u_il')} ILIKE $2
           OR EXISTS (
             SELECT 1
             FROM portfolio_project_team pt
             JOIN users u_tm ON u_tm.id = pt.user_id AND u_tm.tenant_id = p.tenant_id
             WHERE pt.project_id = p.id
               AND pt.tenant_id = p.tenant_id
               AND ${buildUserNameSql('u_tm')} ILIKE $2
           )
         )
       ORDER BY score DESC, p.updated_at DESC, p.name ASC
       LIMIT $4`,
      [ref, like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('projects', {
          ...row,
          metadata: {
            business_lead: row.business_lead_name || null,
            it_lead: row.it_lead_name || null,
            contributors: row.contributor_names || null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchRequests(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const ref = this.parseNumericRef(query);
    const summarySql = buildRequestSummarySql('r');
    const contributorNamesSql = buildContributorNamesSql('r', 'portfolio_request_team', 'rt', 'request_id');
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT r.id,
              r.item_number,
              r.name AS label,
              ${summarySql} AS summary,
              r.status,
              r.updated_at,
              ${buildUserNameSql('u_req')} AS requestor_name,
              ${buildUserNameSql('u_bl')} AS business_lead_name,
              ${buildUserNameSql('u_il')} AS it_lead_name,
              ${contributorNamesSql} AS contributor_names,
              COUNT(*) OVER()::int AS total_count,
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
       LEFT JOIN users u_req ON u_req.id = r.requestor_id AND u_req.tenant_id = r.tenant_id
       LEFT JOIN users u_bs ON u_bs.id = r.business_sponsor_id AND u_bs.tenant_id = r.tenant_id
       LEFT JOIN users u_bl ON u_bl.id = r.business_lead_id AND u_bl.tenant_id = r.tenant_id
       LEFT JOIN users u_is ON u_is.id = r.it_sponsor_id AND u_is.tenant_id = r.tenant_id
       LEFT JOIN users u_il ON u_il.id = r.it_lead_id AND u_il.tenant_id = r.tenant_id
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
           OR ${buildUserNameSql('u_req')} ILIKE $2
           OR ${buildUserNameSql('u_bs')} ILIKE $2
           OR ${buildUserNameSql('u_bl')} ILIKE $2
           OR ${buildUserNameSql('u_is')} ILIKE $2
           OR ${buildUserNameSql('u_il')} ILIKE $2
           OR EXISTS (
             SELECT 1
             FROM portfolio_request_team rt
             JOIN users u_tm ON u_tm.id = rt.user_id AND u_tm.tenant_id = r.tenant_id
             WHERE rt.request_id = r.id
               AND rt.tenant_id = r.tenant_id
               AND ${buildUserNameSql('u_tm')} ILIKE $2
           )
         )
       ORDER BY score DESC, r.updated_at DESC, r.name ASC
       LIMIT $4`,
      [ref, like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('requests', {
          ...row,
          metadata: {
            requestor: row.requestor_name || null,
            business_lead: row.business_lead_name || null,
            it_lead: row.it_lead_name || null,
            contributors: row.contributor_names || null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchTasks(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const ref = this.parseNumericRef(query);
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT t.id,
              t.item_number,
              COALESCE(t.title, 'Untitled task') AS label,
              t.description AS summary,
              t.status,
              t.updated_at,
              ${buildUserNameSql('u_assign')} AS assignee_name,
              ${buildUserNameSql('u_creator')} AS creator_name,
              COUNT(*) OVER()::int AS total_count,
              CASE
                WHEN $1::int IS NOT NULL AND t.item_number = $1 THEN 4
                WHEN COALESCE(t.title, '') ILIKE $2 THEN 3
                ELSE 1
              END AS score
       FROM tasks t
       LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id AND u_assign.tenant_id = t.tenant_id
       LEFT JOIN users u_creator ON u_creator.id = t.creator_id AND u_creator.tenant_id = t.tenant_id
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
           OR ${buildUserNameSql('u_assign')} ILIKE $2
           OR ${buildUserNameSql('u_creator')} ILIKE $2
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

    return {
      items: rows.map((row: any) => ({
        ...toSummary('tasks', {
          ...row,
          metadata: {
            assignee: row.assignee_name || null,
            creator: row.creator_name || null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async listApplications(context: AiExecutionContextWithManager) {
    const itOwnerNamesSql = buildApplicationOwnerNamesSql('a', 'it');
    const rows = await context.manager.query<any[]>(
      `SELECT a.id, NULL::int AS item_number, a.name AS label, a.description AS summary, a.status, a.updated_at,
              a.lifecycle, a.criticality, a.category, a.hosting_model, a.data_class, a.version,
              s.name AS supplier_name,
              ${itOwnerNamesSql} AS it_owner_names
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
        data_class: row.data_class ?? null,
        version: row.version ?? null,
        supplier: row.supplier_name ?? null,
        it_owner: row.it_owner_names ?? null,
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
       LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id AND u_assign.tenant_id = t.tenant_id
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
      offset?: number;
    },
  ) {
    const requested = input.entity_types && input.entity_types.length > 0
      ? input.entity_types
      : ['applications', 'assets', 'locations', 'projects', 'requests', 'tasks', 'documents'] as AiSearchEntityType[];
    const allowed = await this.policy.listReadableEntityTypes(context, requested, context.manager) as AiSearchEntityType[];
    if (allowed.length === 0) {
      return { items: [], total: 0, entity_types: [] as AiSearchEntityType[] };
    }

    const limit = Math.min(Math.max(Number(input.limit) || 100, 1), 100);
    const offset = Math.min(Math.max(Number(input.offset) || 0, 0), 5000);
    const fetchLimit = Math.min(limit + offset, 5000);
    const results = await Promise.all(
      allowed.map(async (type) => {
        if (type === 'applications') return this.searchApplications(context, input.query, fetchLimit);
        if (type === 'assets') return this.searchAssets(context, input.query, fetchLimit);
        if (type === 'locations') return this.searchLocations(context, input.query, fetchLimit);
        if (type === 'projects') return this.searchProjects(context, input.query, fetchLimit);
        if (type === 'requests') return this.searchRequests(context, input.query, fetchLimit);
        if (type === 'tasks') return this.searchTasks(context, input.query, fetchLimit);

        const search = await this.knowledge.search({ q: input.query, limit: fetchLimit, offset: 0 }, { manager: context.manager });
        return {
          items: (search.items || []).map((item: any, index: number) => ({
            ...toSummary('documents', {
              id: item.id,
              item_number: item.item_number,
              label: item.title,
              summary: item.summary ?? null,
              status: item.status,
              updated_at: item.updated_at,
            }, item.snippet ?? item.summary ?? null),
            _score: fetchLimit - index,
          })),
          total: search.total ?? 0,
        } satisfies RankedSearchResult;
      }),
    );

    const total = results.reduce((sum, result) => sum + (result.total || 0), 0);
    const items = results
      .flatMap((result) => result.items)
      .sort((left: any, right: any) => {
        if ((right._score ?? 0) !== (left._score ?? 0)) {
          return (right._score ?? 0) - (left._score ?? 0);
        }
        const leftTime = new Date(left.updated_at || 0).getTime();
        const rightTime = new Date(right.updated_at || 0).getTime();
        return rightTime - leftTime;
      })
      .slice(offset, offset + limit)
      .map(({ _score, ...item }: any) => item);

    return {
      items,
      total,
      offset,
      limit,
      returned: items.length,
      truncated: offset + items.length < total,
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
      `SELECT a.id, a.name, a.description, a.status, a.updated_at, a.lifecycle, a.environment, a.editor, a.criticality, a.hosting_model, a.data_class, a.version
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

    const [requestRows, projectRows, relatedApplicationRows, assetRows, ownerRows] = await Promise.all([
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
      manager.query<any[]>(
        `SELECT ao.owner_type, ao.user_id, u.email, u.first_name, u.last_name
         FROM application_owners ao
         JOIN users u ON u.id = ao.user_id AND u.tenant_id = ao.tenant_id
         WHERE ao.application_id = $1
           AND ao.tenant_id = $2
         ORDER BY ao.owner_type ASC, u.last_name ASC NULLS LAST, u.first_name ASC NULLS LAST, u.email ASC NULLS LAST`,
        [applicationId, tenantId],
      ),
    ]);

    const businessOwners = ownerRows.filter((row) => row.owner_type === 'business').map((row) => toPersonMetadata(row));
    const itOwners = ownerRows.filter((row) => row.owner_type === 'it').map((row) => toPersonMetadata(row));

    return {
      entity: {
        ...toContextEntityBase('applications', {
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
          data_class: application.data_class,
          version: application.version,
          business_owners: businessOwners,
          it_owners: itOwners,
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
              r.requestor_id,
              ${buildUserNameSql('u_req')} AS requestor_name,
              r.business_lead_id,
              ${buildUserNameSql('u_bl')} AS business_lead_name,
              r.it_lead_id,
              ${buildUserNameSql('u_il')} AS it_lead_name,
              CASE WHEN ot.id IS NOT NULL THEN CONCAT('T-', ot.item_number, ' ', COALESCE(ot.title, 'Untitled task')) ELSE NULL END AS origin_task_ref
       FROM portfolio_requests r
       LEFT JOIN tasks ot ON ot.id = r.origin_task_id AND ot.tenant_id = $2
       LEFT JOIN users u_req ON u_req.id = r.requestor_id AND u_req.tenant_id = r.tenant_id
       LEFT JOIN users u_bl ON u_bl.id = r.business_lead_id AND u_bl.tenant_id = r.tenant_id
       LEFT JOIN users u_il ON u_il.id = r.it_lead_id AND u_il.tenant_id = r.tenant_id
       WHERE r.id = $1
         AND r.tenant_id = $2
       LIMIT 1`,
      [requestId, tenantId],
    );
    const request = requests[0];
    if (!request) {
      throw new NotFoundException('Request not found.');
    }

    const [projectRows, dependencyRows, applicationRows, assetRows, contributorRows] = await Promise.all([
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
      manager.query<any[]>(
        `SELECT rt.user_id, u.email, u.first_name, u.last_name
         FROM portfolio_request_team rt
         JOIN users u ON u.id = rt.user_id AND u.tenant_id = rt.tenant_id
         WHERE rt.request_id = $1
           AND rt.tenant_id = $2
         ORDER BY u.last_name ASC NULLS LAST, u.first_name ASC NULLS LAST, u.email ASC NULLS LAST`,
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
        ...toContextEntityBase('requests', {
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
          requestor: request.requestor_id ? toPersonMetadata({ id: request.requestor_id, name: request.requestor_name }) : null,
          business_lead: request.business_lead_id ? toPersonMetadata({ id: request.business_lead_id, name: request.business_lead_name }) : null,
          it_lead: request.it_lead_id ? toPersonMetadata({ id: request.it_lead_id, name: request.it_lead_name }) : null,
          contributors: contributorRows.map((row) => toPersonMetadata(row)),
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
              p.actual_end,
              p.business_lead_id,
              ${buildUserNameSql('u_bl')} AS business_lead_name,
              p.it_lead_id,
              ${buildUserNameSql('u_il')} AS it_lead_name
       FROM portfolio_projects p
       LEFT JOIN users u_bl ON u_bl.id = p.business_lead_id AND u_bl.tenant_id = p.tenant_id
       LEFT JOIN users u_il ON u_il.id = p.it_lead_id AND u_il.tenant_id = p.tenant_id
       WHERE p.id = $1
         AND p.tenant_id = $2
       LIMIT 1`,
      [projectId, tenantId],
    );
    const project = projects[0];
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const [requestRows, dependencyRows, applicationRows, assetRows, contributorRows] = await Promise.all([
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
      manager.query<any[]>(
        `SELECT pt.user_id, u.email, u.first_name, u.last_name
         FROM portfolio_project_team pt
         JOIN users u ON u.id = pt.user_id AND u.tenant_id = pt.tenant_id
         WHERE pt.project_id = $1
           AND pt.tenant_id = $2
         ORDER BY u.last_name ASC NULLS LAST, u.first_name ASC NULLS LAST, u.email ASC NULLS LAST`,
        [projectId, tenantId],
      ),
    ]);

    return {
      entity: {
        ...toContextEntityBase('projects', {
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
          business_lead: project.business_lead_id ? toPersonMetadata({ id: project.business_lead_id, name: project.business_lead_name }) : null,
          it_lead: project.it_lead_id ? toPersonMetadata({ id: project.it_lead_id, name: project.it_lead_name }) : null,
          contributors: contributorRows.map((row) => toPersonMetadata(row)),
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
              ${buildUserNameSql('u_assign')} AS assignee_name,
              t.creator_id,
              ${buildUserNameSql('u_creator')} AS creator_name,
              u_creator.email AS creator_email,
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
       LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id AND u_assign.tenant_id = t.tenant_id
       LEFT JOIN users u_creator ON u_creator.id = t.creator_id AND u_creator.tenant_id = t.tenant_id
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
        ...toContextEntityBase('tasks', {
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
          creator: task.creator_id ? toPersonMetadata({ id: task.creator_id, name: task.creator_name, email: task.creator_email }) : null,
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
