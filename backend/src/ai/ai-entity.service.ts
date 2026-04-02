import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { resolveToUuid } from '../common/resolve-item-id';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  AiEntityCommentDto,
  AiEntityCommentsDto,
  AiContextEntityType,
  AiEntityContextDto,
  AiEntityContextPayloadDto,
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
  metadata?: Record<string, string | number | boolean | null> | null;
};

type RankedSearchResult = {
  items: Array<AiEntitySummaryDto & { _score: number }>;
  total: number;
};

type ContextActivityRow = {
  type: string | null;
  content: string | null;
  context: string | null;
  decision_outcome: string | null;
  changed_fields: Record<string, [unknown, unknown]> | null;
  author_name: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_count?: number | null;
};

type EntityCommentRow = {
  author_name: string | null;
  content: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

type EntityCommentTargetType = Extract<AiContextEntityType, 'projects' | 'tasks'>;

type EntityCommentTargetRow = {
  id: string;
  item_number: number | null;
  label: string;
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
      THEN CONCAT('Effort: ', ROUND(${alias}.execution_progress)::int, '%')
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

function toMetadataScalar(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) {
    return toIso(value);
  }
  return String(value);
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

function getIntegratedDocumentSlotLabel(slotKey: string | null | undefined): string | null {
  switch (slotKey) {
    case 'purpose':
      return 'Purpose';
    case 'risks_mitigations':
      return 'Risks & Mitigations';
    default:
      return slotKey ? slotKey.replace(/_/g, ' ') : null;
  }
}

function formatActivityFieldName(field: string): string {
  return field
    .replace(/_ids?$/i, '')
    .replace(/_/g, ' ')
    .trim();
}

function summarizeActivityChangedFields(changedFields: unknown): string | null {
  if (!changedFields || typeof changedFields !== 'object' || Array.isArray(changedFields)) {
    return null;
  }

  const record = changedFields as Record<string, unknown>;
  const statusChange = record.status;
  if (Array.isArray(statusChange) && statusChange.length >= 2) {
    const nextStatus = toMetadataScalar(statusChange[1]);
    if (nextStatus != null) {
      return `Status changed to ${nextStatus}`;
    }
  }

  const fieldNames = Object.keys(record)
    .map((field) => formatActivityFieldName(field))
    .filter((field) => field.length > 0);
  if (fieldNames.length === 0) {
    return null;
  }

  const visibleFields = fieldNames.slice(0, 3).join(', ');
  return fieldNames.length > 3
    ? `Changed ${visibleFields}, and more`
    : `Changed ${visibleFields}`;
}

function buildActivitySummary(row: ContextActivityRow): string | null {
  if (row.type === 'comment') {
    return row.content ? 'Comment added' : 'Comment activity';
  }
  if (row.type === 'decision') {
    const outcome = row.decision_outcome ? `Decision: ${String(row.decision_outcome).replace(/_/g, ' ')}` : 'Decision recorded';
    const changeSummary = summarizeActivityChangedFields(row.changed_fields);
    return changeSummary ? `${outcome}. ${changeSummary}` : outcome;
  }
  return summarizeActivityChangedFields(row.changed_fields);
}

function toRecentActivityMetadata(row: ContextActivityRow): Record<string, string | number | boolean | null> {
  return {
    type: toMetadataScalar(row.type),
    author: toMetadataScalar(row.author_name),
    content: toMetadataScalar(row.content),
    context: toMetadataScalar(row.context),
    decision_outcome: toMetadataScalar(row.decision_outcome),
    summary: toMetadataScalar(buildActivitySummary(row)),
    created_at: toMetadataScalar(toIso(row.created_at)),
    updated_at: toMetadataScalar(toIso(row.updated_at)),
  };
}

function toEntityCommentDto(row: EntityCommentRow): AiEntityCommentDto {
  const updatedAt = toIso(row.updated_at);
  const createdAt = toIso(row.created_at);
  return {
    author: row.author_name ?? null,
    content: row.content ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    edited: updatedAt != null && createdAt !== updatedAt,
  };
}

function toProjectPhaseMetadata(row: any): Record<string, string | number | boolean | null> {
  return {
    name: toMetadataScalar(row.name),
    status: toMetadataScalar(row.status),
    sequence: toNullableNumber(row.sequence),
    planned_start: toMetadataScalar(toIso(row.planned_start)),
    planned_end: toMetadataScalar(toIso(row.planned_end)),
    task_count: toNullableNumber(row.task_count),
  };
}

function toTaskPhaseMetadata(row: any): Record<string, string | number | boolean | null> | null {
  if (!row?.phase_name) {
    return null;
  }

  return {
    name: toMetadataScalar(row.phase_name),
    status: toMetadataScalar(row.phase_status),
    sequence: toNullableNumber(row.phase_sequence),
    planned_start: toMetadataScalar(toIso(row.phase_planned_start)),
    planned_end: toMetadataScalar(toIso(row.phase_planned_end)),
  };
}

function toProjectTaskSummary(row: any): AiEntitySummaryDto {
  return toSummary('tasks', {
    id: row.id,
    item_number: row.item_number,
    label: row.label,
    summary: row.summary ?? null,
    status: row.status ?? null,
    updated_at: row.updated_at ?? null,
    metadata: {
      assignee: toMetadataScalar(row.assignee_name),
      priority: toMetadataScalar(row.priority_level),
      phase: toMetadataScalar(row.phase_name),
    },
  });
}

function toIntegratedDocumentSummary(row: any): AiEntitySummaryDto {
  const slotLabel = getIntegratedDocumentSlotLabel(row.slot_key);
  return toSummary('documents', {
    id: row.id,
    item_number: row.item_number,
    label: row.label,
    summary: row.summary ?? null,
    status: row.status ?? null,
    updated_at: row.updated_at ?? null,
    metadata: {
      integrated: true,
      special_status: 'integrated_document',
      slot_key: toMetadataScalar(row.slot_key),
      slot_label: toMetadataScalar(slotLabel),
      hidden_from_entity_knowledge: row.hidden_from_entity_knowledge === true,
      library: toMetadataScalar(row.library_name),
      type: toMetadataScalar(row.document_type_name),
    },
  });
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

  private async listRecentActivity(
    manager: AiExecutionContextWithManager['manager'],
    params: {
      tenantId: string;
      projectId?: string;
      taskId?: string;
    },
  ): Promise<{ items: Array<Record<string, string | number | boolean | null>>; total: number }> {
    const targetColumn = params.projectId ? 'project_id' : 'task_id';
    const targetId = params.projectId ?? params.taskId;
    if (!targetId) {
      return { items: [], total: 0 };
    }

    const rows = await manager.query<ContextActivityRow[]>(
      `SELECT a.type,
              a.content,
              a.context,
              a.decision_outcome,
              a.changed_fields,
              ${buildUserNameSql('u_author')} AS author_name,
              a.created_at,
              a.updated_at,
              COUNT(*) OVER()::int AS total_count
       FROM portfolio_activities a
       LEFT JOIN users u_author ON u_author.id = a.author_id AND u_author.tenant_id = a.tenant_id
       WHERE a.${targetColumn} = $1
         AND a.tenant_id = $2
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [targetId, params.tenantId],
    );

    const total = rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0;
    return {
      items: rows.map((row) => toRecentActivityMetadata(row)),
      total,
    };
  }

  private async listIntegratedDocuments(
    manager: AiExecutionContextWithManager['manager'],
    params: {
      tenantId: string;
      sourceEntityType: 'projects';
      sourceEntityId: string;
    },
  ): Promise<AiEntitySummaryDto[]> {
    const rows = await manager.query<SearchRow[]>(
      `SELECT d.id,
              d.item_number,
              d.title AS label,
              d.summary,
              d.status,
              d.updated_at,
              b.slot_key,
              b.hidden_from_entity_knowledge,
              dl.name AS library_name,
              dt.name AS document_type_name
       FROM integrated_document_bindings b
       JOIN documents d ON d.id = b.document_id AND d.tenant_id = b.tenant_id
       LEFT JOIN document_libraries dl ON dl.id = d.library_id AND dl.tenant_id = d.tenant_id
       LEFT JOIN document_types dt ON dt.id = d.document_type_id AND dt.tenant_id = d.tenant_id
       WHERE b.source_entity_type = $1
         AND b.source_entity_id = $2
         AND b.tenant_id = $3
       ORDER BY b.slot_key ASC, d.updated_at DESC`,
      [params.sourceEntityType, params.sourceEntityId, params.tenantId],
    );

    return rows.map((row) => toIntegratedDocumentSummary(row));
  }

  private async searchApplications(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const businessOwnerNamesSql = buildApplicationOwnerNamesSql('a', 'business');
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
              ${businessOwnerNamesSql} AS business_owner_names,
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
           OR ${businessOwnerNamesSql} ILIKE $1
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
            business_owner: row.business_owner_names || null,
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

  private async searchSpendItems(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT si.id,
              NULL::int AS item_number,
              si.product_name AS label,
              COALESCE(
                NULLIF(si.description, ''),
                NULLIF(CONCAT_WS(' | ', sup.name, comp.name, NULLIF(TRIM(CONCAT_WS(' ', acc.account_number, acc.account_name)), '')), '')
              ) AS summary,
              si.status,
              si.updated_at,
              sup.name AS supplier_name,
              comp.name AS company_name,
              NULLIF(TRIM(CONCAT_WS(' ', acc.account_number, acc.account_name)), '') AS account_display,
              lc.contract_name,
              COUNT(*) OVER()::int AS total_count,
              CASE
                WHEN si.product_name ILIKE $1 THEN 3
                WHEN COALESCE(sup.name, '') ILIKE $1 OR COALESCE(comp.name, '') ILIKE $1 THEN 2
                ELSE 1
              END AS score
       FROM spend_items si
       LEFT JOIN suppliers sup ON sup.id = si.supplier_id AND sup.tenant_id = si.tenant_id
       LEFT JOIN companies comp ON comp.id = si.paying_company_id AND comp.tenant_id = si.tenant_id
       LEFT JOIN accounts acc ON acc.id = si.account_id AND acc.tenant_id = si.tenant_id
       LEFT JOIN LATERAL (
         SELECT c.name AS contract_name
         FROM contract_spend_items csi
         JOIN contracts c ON c.id = csi.contract_id AND c.tenant_id = si.tenant_id
         WHERE csi.spend_item_id = si.id
         ORDER BY csi.created_at DESC
         LIMIT 1
       ) lc ON TRUE
       WHERE si.tenant_id = $2
         AND (
           si.product_name ILIKE $1
           OR COALESCE(si.description, '') ILIKE $1
           OR COALESCE(sup.name, '') ILIKE $1
           OR COALESCE(comp.name, '') ILIKE $1
           OR COALESCE(acc.account_name, '') ILIKE $1
           OR COALESCE(acc.account_number, '') ILIKE $1
           OR COALESCE(lc.contract_name, '') ILIKE $1
           OR COALESCE(si.currency, '') ILIKE $1
           OR COALESCE(si.notes, '') ILIKE $1
         )
       ORDER BY score DESC, si.updated_at DESC, si.product_name ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('spend_items', {
          ...row,
          metadata: {
            supplier: row.supplier_name ?? null,
            paying_company: row.company_name ?? null,
            account: row.account_display ?? null,
            contract: row.contract_name ?? null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchContracts(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT c.id,
              NULL::int AS item_number,
              c.name AS label,
              COALESCE(NULLIF(c.notes, ''), NULLIF(CONCAT_WS(' | ', comp.name, sup.name), '')) AS summary,
              c.status,
              c.updated_at,
              comp.name AS company_name,
              sup.name AS supplier_name,
              COUNT(*) OVER()::int AS total_count,
              CASE
                WHEN c.name ILIKE $1 THEN 3
                WHEN COALESCE(comp.name, '') ILIKE $1 OR COALESCE(sup.name, '') ILIKE $1 THEN 2
                ELSE 1
              END AS score
       FROM contracts c
       LEFT JOIN companies comp ON comp.id = c.company_id AND comp.tenant_id = c.tenant_id
       LEFT JOIN suppliers sup ON sup.id = c.supplier_id AND sup.tenant_id = c.tenant_id
       WHERE c.tenant_id = $2
         AND (
           c.name ILIKE $1
           OR COALESCE(c.notes, '') ILIKE $1
           OR COALESCE(comp.name, '') ILIKE $1
           OR COALESCE(sup.name, '') ILIKE $1
           OR COALESCE(c.currency, '') ILIKE $1
           OR COALESCE(c.billing_frequency, '') ILIKE $1
         )
       ORDER BY score DESC, c.updated_at DESC, c.name ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('contracts', {
          ...row,
          metadata: {
            company: row.company_name ?? null,
            supplier: row.supplier_name ?? null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchCompanies(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT c.id,
              NULL::int AS item_number,
              c.name AS label,
              NULLIF(CONCAT_WS(', ', c.city, c.country_iso), '') AS summary,
              c.status,
              c.updated_at,
              c.base_currency,
              COUNT(*) OVER()::int AS total_count,
              CASE
                WHEN c.name ILIKE $1 THEN 3
                WHEN COALESCE(c.city, '') ILIKE $1 OR COALESCE(c.country_iso, '') ILIKE $1 THEN 2
                ELSE 1
              END AS score
       FROM companies c
       WHERE c.tenant_id = $2
         AND (
           c.name ILIKE $1
           OR COALESCE(c.country_iso, '') ILIKE $1
           OR COALESCE(c.city, '') ILIKE $1
           OR COALESCE(c.address1, '') ILIKE $1
           OR COALESCE(c.address2, '') ILIKE $1
           OR COALESCE(c.postal_code, '') ILIKE $1
           OR COALESCE(c.reg_number, '') ILIKE $1
           OR COALESCE(c.vat_number, '') ILIKE $1
           OR COALESCE(c.base_currency, '') ILIKE $1
           OR COALESCE(c.notes, '') ILIKE $1
         )
       ORDER BY score DESC, c.updated_at DESC, c.name ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('companies', {
          ...row,
          metadata: {
            base_currency: row.base_currency ?? null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchSuppliers(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT s.id,
              NULL::int AS item_number,
              s.name AS label,
              COALESCE(NULLIF(s.notes, ''), s.erp_supplier_id) AS summary,
              s.status,
              s.updated_at,
              s.erp_supplier_id,
              COUNT(*) OVER()::int AS total_count,
              CASE
                WHEN s.name ILIKE $1 THEN 3
                WHEN COALESCE(s.erp_supplier_id, '') ILIKE $1 THEN 2
                ELSE 1
              END AS score
       FROM suppliers s
       WHERE s.tenant_id = $2
         AND (
           s.name ILIKE $1
           OR COALESCE(s.erp_supplier_id, '') ILIKE $1
           OR COALESCE(s.notes, '') ILIKE $1
         )
       ORDER BY score DESC, s.updated_at DESC, s.name ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('suppliers', {
          ...row,
          metadata: {
            erp_supplier_id: row.erp_supplier_id ?? null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
      total: rows.length > 0 ? Math.max(Number(rows[0].total_count) || 0, rows.length) : 0,
    };
  }

  private async searchDepartments(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const like = `%${query}%`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT d.id,
              NULL::int AS item_number,
              d.name AS label,
              COALESCE(NULLIF(d.description, ''), comp.name) AS summary,
              d.status,
              d.updated_at,
              comp.name AS company_name,
              COUNT(*) OVER()::int AS total_count,
              CASE
                WHEN d.name ILIKE $1 THEN 3
                WHEN COALESCE(comp.name, '') ILIKE $1 THEN 2
                ELSE 1
              END AS score
       FROM departments d
       LEFT JOIN companies comp ON comp.id = d.company_id AND comp.tenant_id = d.tenant_id
       WHERE d.tenant_id = $2
         AND (
           d.name ILIKE $1
           OR COALESCE(d.description, '') ILIKE $1
           OR COALESCE(comp.name, '') ILIKE $1
           OR COALESCE(d.status, '') ILIKE $1
         )
       ORDER BY score DESC, d.updated_at DESC, d.name ASC
       LIMIT $3`,
      [like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('departments', {
          ...row,
          metadata: {
            company: row.company_name ?? null,
          },
        }, row.summary),
        _score: row.score ?? 1,
      })),
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

  private async searchUsers(
    context: AiExecutionContextWithManager,
    query: string,
    limit: number,
  ): Promise<RankedSearchResult> {
    const exact = String(query || '').trim();
    const like = `%${exact}%`;
    const displayNameSql = buildUserNameSql('u');
    const expertiseSql = `COALESCE((
      SELECT string_agg(DISTINCT area.value, ', ' ORDER BY area.value)
      FROM jsonb_array_elements_text(COALESCE(tmc.areas_of_expertise, '[]'::jsonb)) area(value)
    ), '')`;
    const summarySql = `NULLIF(CONCAT_WS(' | ',
      CASE WHEN ${displayNameSql} <> u.email THEN u.email ELSE NULL END,
      NULLIF(u.job_title, ''),
      NULLIF(pt.name, ''),
      NULLIF(c.name, '')
    ), '')`;
    const rows = await context.manager.query<SearchRow[]>(
      `SELECT u.id,
              NULL::int AS item_number,
              ${displayNameSql} AS label,
              ${summarySql} AS summary,
              u.status,
              u.updated_at,
              u.email,
              u.job_title,
              u.locale,
              r.role_name AS primary_role_name,
              c.name AS company_name,
              d.name AS department_name,
              pt.name AS team_name,
              CASE WHEN tmc.id IS NULL THEN 'not_configured' ELSE 'configured' END AS contributor_profile,
              tmc.project_availability,
              ${expertiseSql} AS areas_of_expertise,
              COUNT(*) OVER()::int AS total_count,
              CASE
                WHEN LOWER(u.email) = LOWER($1) THEN 5
                WHEN ${displayNameSql} ILIKE $2 THEN 4
                WHEN u.email ILIKE $2 THEN 3
                ELSE 1
              END AS score
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
       LEFT JOIN companies c ON c.id = u.company_id AND c.tenant_id = u.tenant_id
       LEFT JOIN departments d ON d.id = u.department_id AND d.tenant_id = u.tenant_id
       LEFT JOIN portfolio_team_member_configs tmc ON tmc.user_id = u.id AND tmc.tenant_id = u.tenant_id
       LEFT JOIN portfolio_teams pt ON pt.id = tmc.team_id AND pt.tenant_id = u.tenant_id
       WHERE u.tenant_id = $3
         AND (
           ${displayNameSql} ILIKE $2
           OR u.email ILIKE $2
           OR COALESCE(u.job_title, '') ILIKE $2
           OR COALESCE(r.role_name, '') ILIKE $2
           OR COALESCE(c.name, '') ILIKE $2
           OR COALESCE(d.name, '') ILIKE $2
           OR COALESCE(pt.name, '') ILIKE $2
           OR ${expertiseSql} ILIKE $2
         )
       ORDER BY score DESC, u.last_name ASC NULLS LAST, u.first_name ASC NULLS LAST, u.email ASC
       LIMIT $4`,
      [exact, like, context.tenantId, limit],
    );

    return {
      items: rows.map((row: any) => ({
        ...toSummary('users', {
          ...row,
          metadata: {
            email: row.email ?? null,
            job_title: row.job_title ?? null,
            primary_role: row.primary_role_name ?? null,
            company: row.company_name ?? null,
            department: row.department_name ?? null,
            locale: row.locale ?? null,
            team: row.team_name ?? null,
            contributor_profile: row.contributor_profile ?? null,
            project_availability: toNullableNumber(row.project_availability),
            areas_of_expertise: row.areas_of_expertise || null,
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
      : ['applications', 'assets', 'companies', 'contracts', 'departments', 'documents', 'locations', 'projects', 'requests', 'spend_items', 'suppliers', 'tasks', 'users'] as AiSearchEntityType[];
    const allowed = await this.policy.listReadableEntityTypes(context, requested, context.manager) as AiSearchEntityType[];
    if (allowed.length === 0) {
      return { items: [], total: 0, complete: false, entity_types: [] as AiSearchEntityType[] };
    }

    const limit = Math.min(Math.max(Number(input.limit) || 100, 1), 100);
    const offset = Math.min(Math.max(Number(input.offset) || 0, 0), 5000);
    const fetchLimit = Math.min(limit + offset, 5000);
    const results = await Promise.all(
      allowed.map(async (type) => {
        if (type === 'applications') return this.searchApplications(context, input.query, fetchLimit);
        if (type === 'assets') return this.searchAssets(context, input.query, fetchLimit);
        if (type === 'companies') return this.searchCompanies(context, input.query, fetchLimit);
        if (type === 'contracts') return this.searchContracts(context, input.query, fetchLimit);
        if (type === 'departments') return this.searchDepartments(context, input.query, fetchLimit);
        if (type === 'locations') return this.searchLocations(context, input.query, fetchLimit);
        if (type === 'projects') return this.searchProjects(context, input.query, fetchLimit);
        if (type === 'requests') return this.searchRequests(context, input.query, fetchLimit);
        if (type === 'spend_items') return this.searchSpendItems(context, input.query, fetchLimit);
        if (type === 'suppliers') return this.searchSuppliers(context, input.query, fetchLimit);
        if (type === 'tasks') return this.searchTasks(context, input.query, fetchLimit);
        if (type === 'users') return this.searchUsers(context, input.query, fetchLimit);

        const search = await this.knowledge.search(
          { q: input.query, limit: fetchLimit, offset: 0 },
          { manager: context.manager, userId: context.userId },
        );
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
      complete: false,
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

  private async buildApplicationContext(context: AiExecutionContext, applicationId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextPayloadDto> {
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

  private async buildAssetContext(context: AiExecutionContext, assetId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextPayloadDto> {
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

  private async buildRequestContext(context: AiExecutionContext, requestId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextPayloadDto> {
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

  private async buildProjectContext(context: AiExecutionContext, projectId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextPayloadDto> {
    const requestSummarySql = buildRequestSummarySql('r');
    const projectSummarySql = buildProjectSummarySql('p');
    const { tenantId } = context;
    const canReadKnowledge = await this.policy.canReadKnowledge(context, manager);
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

    const [
      requestRows,
      dependencyRows,
      applicationRows,
      assetRows,
      contributorRows,
      phaseRows,
      projectTaskRows,
      integratedDocumentRows,
      recentActivity,
    ] = await Promise.all([
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
      manager.query<any[]>(
        `SELECT phase.name,
                phase.status,
                phase.sequence,
                phase.planned_start,
                phase.planned_end,
                COUNT(t.id)::int AS task_count
         FROM portfolio_project_phases phase
         LEFT JOIN tasks t ON t.phase_id = phase.id AND t.tenant_id = phase.tenant_id
         WHERE phase.project_id = $1
           AND phase.tenant_id = $2
         GROUP BY phase.id, phase.name, phase.status, phase.sequence, phase.planned_start, phase.planned_end
         ORDER BY phase.sequence ASC, phase.name ASC`,
        [projectId, tenantId],
      ),
      manager.query<any[]>(
        `SELECT t.id,
                t.item_number,
                COALESCE(t.title, 'Untitled task') AS label,
                t.description AS summary,
                t.status,
                t.updated_at,
                ${buildUserNameSql('u_assign')} AS assignee_name,
                t.priority_level,
                phase.name AS phase_name,
                phase.sequence AS phase_sequence
         FROM tasks t
         LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id AND u_assign.tenant_id = t.tenant_id
         LEFT JOIN portfolio_project_phases phase ON phase.id = t.phase_id AND phase.tenant_id = t.tenant_id
         WHERE t.related_object_type = 'project'
           AND t.related_object_id = $1
           AND t.tenant_id = $2
         ORDER BY COALESCE(phase.sequence, 2147483647) ASC, t.updated_at DESC, t.item_number DESC`,
        [projectId, tenantId],
      ),
      canReadKnowledge
        ? this.listIntegratedDocuments(manager, {
          tenantId,
          sourceEntityType: 'projects',
          sourceEntityId: projectId,
        })
        : Promise.resolve([]),
      this.listRecentActivity(manager, { tenantId, projectId }),
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
          phases: phaseRows.map((row) => toProjectPhaseMetadata(row)),
          recent_activity: recentActivity.items,
          recent_activity_total: recentActivity.total,
          recent_activity_returned: recentActivity.items.length,
          recent_activity_truncated: recentActivity.total > recentActivity.items.length,
        },
      },
      related: [
        { relation: 'source_requests', label: 'Source Requests', items: requestRows.map((row) => toSummary('requests', row)) },
        { relation: 'dependencies', label: 'Dependencies', items: dependencyRows.map((row) => toSummary('projects', row)) },
        { relation: 'linked_applications', label: 'Linked Applications', items: applicationRows.map((row) => toSummary('applications', row)) },
        { relation: 'linked_assets', label: 'Linked Assets', items: assetRows.map((row) => toSummary('assets', row)) },
        { relation: 'project_tasks', label: 'Project Tasks', items: projectTaskRows.map((row) => toProjectTaskSummary(row)) },
        { relation: 'integrated_documents', label: 'Integrated Documents', items: integratedDocumentRows },
      ].filter((group) => group.items.length > 0),
      knowledge: await this.getKnowledgeContext(context, 'projects', projectId, manager),
    };
  }

  private async buildTaskContext(context: AiExecutionContext, taskId: string, manager: AiExecutionContextWithManager['manager']): Promise<AiEntityContextPayloadDto> {
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
              phase.name AS phase_name,
              phase.status AS phase_status,
              phase.planned_start AS phase_planned_start,
              phase.planned_end AS phase_planned_end,
              phase.sequence AS phase_sequence,
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
       LEFT JOIN portfolio_project_phases phase ON phase.id = t.phase_id AND phase.tenant_id = t.tenant_id
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

    const recentActivity = await this.listRecentActivity(manager, { tenantId, taskId });

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
          phase: toTaskPhaseMetadata(task),
          recent_activity: recentActivity.items,
          recent_activity_total: recentActivity.total,
          recent_activity_returned: recentActivity.items.length,
          recent_activity_truncated: recentActivity.total > recentActivity.items.length,
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

    let result: AiEntityContextPayloadDto;
    if (input.entity_type === 'applications') {
      result = await this.buildApplicationContext(context, input.entity_id, context.manager);
    } else if (input.entity_type === 'assets') {
      result = await this.buildAssetContext(context, input.entity_id, context.manager);
    } else if (input.entity_type === 'requests') {
      result = await this.buildRequestContext(context, input.entity_id, context.manager);
    } else if (input.entity_type === 'projects') {
      result = await this.buildProjectContext(context, input.entity_id, context.manager);
    } else if (input.entity_type === 'tasks') {
      result = await this.buildTaskContext(context, input.entity_id, context.manager);
    } else {
      throw new BadRequestException('Unsupported entity type.');
    }

    return {
      ...result,
      complete: result.entity.metadata?.recent_activity_truncated !== true,
    };
  }

  private async resolveCommentTarget(
    context: AiExecutionContextWithManager,
    entityType: EntityCommentTargetType,
    entityIdOrRef: string,
  ): Promise<AiEntityCommentsDto['entity']> {
    const resolvedId = await resolveToUuid(
      entityIdOrRef,
      entityType === 'projects' ? 'project' : 'task',
      context.manager,
    );

    const rows = entityType === 'projects'
      ? await context.manager.query<EntityCommentTargetRow[]>(
        `SELECT p.id,
                p.item_number,
                p.name AS label
         FROM portfolio_projects p
         WHERE p.id = $1
           AND p.tenant_id = $2
         LIMIT 1`,
        [resolvedId, context.tenantId],
      )
      : await context.manager.query<EntityCommentTargetRow[]>(
        `SELECT t.id,
                t.item_number,
                COALESCE(t.title, 'Untitled task') AS label
         FROM tasks t
         WHERE t.id = $1
           AND t.tenant_id = $2
         LIMIT 1`,
        [resolvedId, context.tenantId],
      );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException(entityType === 'projects' ? 'Project not found.' : 'Task not found.');
    }

    return {
      type: entityType,
      id: row.id,
      ref: buildRef(entityType, row.item_number ?? null),
      label: row.label,
    };
  }

  private async listEntityCommentsPage(
    context: AiExecutionContextWithManager,
    target: AiEntityCommentsDto['entity'],
    offset: number,
    limit: number,
  ): Promise<{ items: AiEntityCommentDto[]; total: number }> {
    const countRows = target.type === 'projects'
      ? await context.manager.query<Array<{ total: number }>>(
        `SELECT COUNT(*)::int AS total
         FROM portfolio_activities a
         WHERE a.project_id = $1
           AND a.tenant_id = $2
           AND a.type = 'comment'`,
        [target.id, context.tenantId],
      )
      : await context.manager.query<Array<{ total: number }>>(
        `SELECT COUNT(*)::int AS total
         FROM portfolio_activities a
         WHERE a.task_id = $1
           AND a.tenant_id = $2
           AND a.type = 'comment'`,
        [target.id, context.tenantId],
      );

    const rows = target.type === 'projects'
      ? await context.manager.query<EntityCommentRow[]>(
        `SELECT ${buildUserNameSql('u_author')} AS author_name,
                a.content,
                a.created_at,
                a.updated_at
         FROM portfolio_activities a
         LEFT JOIN users u_author ON u_author.id = a.author_id AND u_author.tenant_id = a.tenant_id
         WHERE a.project_id = $1
           AND a.tenant_id = $2
           AND a.type = 'comment'
         ORDER BY a.created_at DESC
         OFFSET $3
         LIMIT $4`,
        [target.id, context.tenantId, offset, limit],
      )
      : await context.manager.query<EntityCommentRow[]>(
        `SELECT ${buildUserNameSql('u_author')} AS author_name,
                a.content,
                a.created_at,
                a.updated_at
         FROM portfolio_activities a
         LEFT JOIN users u_author ON u_author.id = a.author_id AND u_author.tenant_id = a.tenant_id
         WHERE a.task_id = $1
           AND a.tenant_id = $2
           AND a.type = 'comment'
         ORDER BY a.created_at DESC
         OFFSET $3
         LIMIT $4`,
        [target.id, context.tenantId, offset, limit],
      );

    return {
      items: rows.map((row) => toEntityCommentDto(row)),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async getEntityComments(
    context: AiExecutionContextWithManager,
    input: {
      entity_type: EntityCommentTargetType;
      entity_id: string;
      offset?: number;
      limit?: number;
    },
  ): Promise<AiEntityCommentsDto> {
    await this.policy.assertEntityTypeReadAccess(context, input.entity_type, context.manager);

    const offset = Math.max(0, input.offset ?? 0);
    const limit = Math.max(1, input.limit ?? 20);
    const target = await this.resolveCommentTarget(context, input.entity_type, input.entity_id);
    const { items, total } = await this.listEntityCommentsPage(context, target, offset, limit);

    const truncated = offset + items.length < total;
    return {
      entity: target,
      items,
      total,
      offset,
      limit,
      returned: items.length,
      truncated,
      complete: offset === 0 && !truncated,
    };
  }
}
