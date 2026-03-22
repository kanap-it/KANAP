import { BadRequestException, Injectable } from '@nestjs/common';
import { normalizeAgFilterModel } from '../../common/ag-grid-filtering';
import { ApplicationsService } from '../../applications/services';
import { AssetsService } from '../../assets/services';
import { Document } from '../../knowledge/document.entity';
import { isDocumentStatus } from '../../knowledge/document-status';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { PortfolioRequestsService } from '../../portfolio/portfolio-requests.service';
import { PortfolioProjectsService } from '../../portfolio/services';
import { TasksService } from '../../spend/tasks.service';
import { AiExecutionContextWithManager, AiQueryScope } from '../ai.types';
import { adaptFilters } from './ai-filter.adapter';
import {
  AiAggregateResult,
  AiDateFilterValue,
  AiFilterValue,
} from './ai-filter.types';
import { getAiEntityRegistry } from './registries';

type DocumentSearchState = { term: string; itemNumber: number | null };

function parseDocumentItemNumberQuery(input: string): number | null {
  const value = String(input || '').trim();
  if (!value) return null;
  const match = value.match(/(?:^[A-Z]+-)?(\d+)$/i);
  if (!match) return null;
  const itemNumber = Number(match[1]);
  return Number.isFinite(itemNumber) && itemNumber > 0 ? itemNumber : null;
}

function getDocumentSearchState(input?: string): DocumentSearchState | null {
  const term = String(input || '').trim();
  if (!term) return null;
  return {
    term,
    itemNumber: parseDocumentItemNumberQuery(term),
  };
}

function buildDocumentSearchSql(
  alias: string,
  paramOffset: number,
  search: DocumentSearchState,
): { clause: string; params: Array<string | number> } {
  const params: Array<string | number> = [search.term];
  const searchTermIndex = paramOffset + 1;
  const clauses = [`${alias}.search_vector @@ websearch_to_tsquery('simple', $${searchTermIndex})`];
  if (search.itemNumber != null) {
    params.push(search.itemNumber);
    clauses.unshift(`${alias}.item_number = $${paramOffset + params.length}`);
  }
  return {
    clause: `(${clauses.join(' OR ')})`,
    params,
  };
}

function compileDateFilterCondition(
  rawModel: any,
  expression: string,
  nextParam: () => string,
): { sql: string; params: Record<string, any> } | null {
  const model = normalizeAgFilterModel(rawModel);
  if (!model || typeof model !== 'object') return null;

  const filterCategory = String(model.filterType ?? 'date');
  const type = String(model.type ?? 'equals');
  const fromRaw = model.dateFrom ?? model.filter ?? model.value;
  const toRaw = model.dateTo ?? model.filterTo ?? model.valueTo;

  if (filterCategory !== 'date' && filterCategory !== 'text') return null;

  if (type === 'blank') return { sql: `${expression} IS NULL`, params: {} };
  if (type === 'notBlank') return { sql: `${expression} IS NOT NULL`, params: {} };

  const castParam = (param: string): string => `:${param}::date`;
  if (type === 'inRange') {
    if (!fromRaw || !toRaw) return null;
    const fromParam = nextParam();
    const toParam = nextParam();
    return {
      sql: `${expression} BETWEEN ${castParam(fromParam)} AND ${castParam(toParam)}`,
      params: { [fromParam]: fromRaw, [toParam]: toRaw },
    };
  }

  if (!fromRaw) return null;
  const param = nextParam();
  switch (type) {
    case 'equals':
      return { sql: `${expression} = ${castParam(param)}`, params: { [param]: fromRaw } };
    case 'lessThan':
      return { sql: `${expression} < ${castParam(param)}`, params: { [param]: fromRaw } };
    case 'lessThanOrEqual':
      return { sql: `${expression} <= ${castParam(param)}`, params: { [param]: fromRaw } };
    case 'greaterThan':
      return { sql: `${expression} > ${castParam(param)}`, params: { [param]: fromRaw } };
    case 'greaterThanOrEqual':
      return { sql: `${expression} >= ${castParam(param)}`, params: { [param]: fromRaw } };
    case 'notEqual':
      return { sql: `${expression} <> ${castParam(param)}`, params: { [param]: fromRaw } };
    default:
      return null;
  }
}

type ResolvedAiScope = {
  requested: AiQueryScope;
  resolved: boolean;
  team_name?: string | null;
};

@Injectable()
export class AiAggregateExecutor {
  constructor(
    private readonly tasks: TasksService,
    private readonly projects: PortfolioProjectsService,
    private readonly requests: PortfolioRequestsService,
    private readonly applications: ApplicationsService,
    private readonly assets: AssetsService,
    private readonly knowledge: KnowledgeService,
  ) {}

  private async resolveCurrentUserTeam(
    context: AiExecutionContextWithManager,
  ): Promise<{ teamId: string | null; teamName: string | null }> {
    const rows = await context.manager.query(
      `SELECT tmc.team_id,
              pt.name AS team_name
       FROM portfolio_team_member_configs tmc
       LEFT JOIN portfolio_teams pt
         ON pt.id = tmc.team_id
        AND pt.tenant_id = tmc.tenant_id
       WHERE tmc.tenant_id = $1
         AND tmc.user_id = $2
       LIMIT 1`,
      [context.tenantId, context.userId],
    );
    return {
      teamId: rows[0]?.team_id ?? null,
      teamName: rows[0]?.team_name ?? null,
    };
  }

  private async applyScopeToListQuery(
    context: AiExecutionContextWithManager,
    entityType: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents',
    query: Record<string, any>,
    scope?: AiQueryScope,
  ): Promise<{ query: Record<string, any>; scope: ResolvedAiScope | null }> {
    if (!scope) {
      return { query, scope: null };
    }

    if (scope === 'me') {
      if (entityType === 'tasks') {
        return {
          query: { ...query, assigneeUserId: context.userId },
          scope: { requested: scope, resolved: true },
        };
      }
      if (entityType === 'projects' || entityType === 'requests') {
        return {
          query: { ...query, involvedUserId: context.userId },
          scope: { requested: scope, resolved: true },
        };
      }
      throw new BadRequestException(`scope "${scope}" is not supported for ${entityType}.`);
    }

    if (scope === 'my_team') {
      const { teamId, teamName } = await this.resolveCurrentUserTeam(context);
      if (!teamId) {
        return {
          query,
          scope: { requested: scope, resolved: false, team_name: teamName },
        };
      }
      if (entityType === 'tasks') {
        return {
          query: { ...query, teamId },
          scope: { requested: scope, resolved: true, team_name: teamName },
        };
      }
      if (entityType === 'projects' || entityType === 'requests') {
        return {
          query: { ...query, involvedTeamId: teamId },
          scope: { requested: scope, resolved: true, team_name: teamName },
        };
      }
      throw new BadRequestException(`scope "${scope}" is not supported for ${entityType}.`);
    }

    return { query, scope: null };
  }

  private serializeFiltersForTasks(filters: Record<string, any>): string | undefined {
    return Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined;
  }

  private async listIdsForEntity(
    context: AiExecutionContextWithManager,
    entityType: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents',
    q: string | undefined,
    adaptedFilters: Record<string, any>,
    scope?: AiQueryScope,
  ): Promise<{ ids: string[]; scope: ResolvedAiScope | null }> {
    if (entityType === 'tasks') {
      const scoped = await this.applyScopeToListQuery(
        context,
        entityType,
        {
          q,
          limit: 1000000,
          filters: this.serializeFiltersForTasks(adaptedFilters),
        },
        scope,
      );
      if (scoped.scope && scoped.scope.resolved === false) {
        return { ids: [], scope: scoped.scope };
      }
      const result = await this.tasks.listIds(scoped.query, { manager: context.manager });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'projects') {
      const scoped = await this.applyScopeToListQuery(
        context,
        entityType,
        {
          q,
          filters: adaptedFilters,
          status: Object.prototype.hasOwnProperty.call(adaptedFilters, 'status') ? undefined : 'all',
        },
        scope,
      );
      if (scoped.scope && scoped.scope.resolved === false) {
        return { ids: [], scope: scoped.scope };
      }
      const result = await this.projects.listIds(scoped.query, { manager: context.manager });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'requests') {
      const scoped = await this.applyScopeToListQuery(
        context,
        entityType,
        {
          q,
          filters: adaptedFilters,
          status: Object.prototype.hasOwnProperty.call(adaptedFilters, 'status') ? undefined : 'all',
        },
        scope,
      );
      if (scoped.scope && scoped.scope.resolved === false) {
        return { ids: [], scope: scoped.scope };
      }
      const result = await this.requests.listIds(scoped.query, { manager: context.manager });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'applications') {
      const scoped = await this.applyScopeToListQuery(
        context,
        entityType,
        {
          q,
          filters: adaptedFilters,
          include_inactive: true,
        },
        scope,
      );
      if (scoped.scope && scoped.scope.resolved === false) {
        return { ids: [], scope: scoped.scope };
      }
      const result = await this.applications.listIds(scoped.query, { manager: context.manager });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'assets') {
      const scoped = await this.applyScopeToListQuery(
        context,
        entityType,
        {
          q,
          filters: adaptedFilters,
        },
        scope,
      );
      if (scoped.scope && scoped.scope.resolved === false) {
        return { ids: [], scope: scoped.scope };
      }
      const result = await this.assets.listIds(scoped.query, { manager: context.manager, tenantId: context.tenantId });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'documents') {
      const scoped = await this.applyScopeToListQuery(
        context,
        entityType,
        { q, filters: adaptedFilters },
        scope,
      );
      if (scoped.scope && scoped.scope.resolved === false) {
        return { ids: [], scope: scoped.scope };
      }
      return {
        ids: await this.listDocumentIds(context, q, adaptedFilters),
        scope: scoped.scope,
      };
    }

    throw new BadRequestException('Unsupported entity type.');
  }

  private async listDocumentIds(
    context: AiExecutionContextWithManager,
    q: string | undefined,
    filters: Record<string, any>,
  ): Promise<string[]> {
    const qb = context.manager
      .getRepository(Document)
      .createQueryBuilder('d')
      .select('d.id', 'id')
      .leftJoin('document_folders', 'f', 'f.id = d.folder_id AND f.tenant_id = d.tenant_id')
      .leftJoin('document_libraries', 'dl', 'dl.id = d.library_id AND dl.tenant_id = d.tenant_id')
      .leftJoin('document_types', 'dtype', 'dtype.id = d.document_type_id AND dtype.tenant_id = d.tenant_id');

    const search = getDocumentSearchState(q);
    if (search) {
      const searchFilter = buildDocumentSearchSql('d', 0, search);
      qb.andWhere(searchFilter.clause, searchFilter.params);
    }

    const statusFilter = filters.status;
    if (statusFilter?.filterType === 'set' && Array.isArray(statusFilter.values) && statusFilter.values.length > 0) {
      const validStatuses = statusFilter.values.filter((value: string) => isDocumentStatus(String(value)));
      if (validStatuses.length > 0) {
        qb.andWhere('d.status = ANY(:statusValues)', { statusValues: validStatuses });
      }
    }

    const applyNamedSetFilter = (filter: any, expression: string, paramName: string) => {
      if (!filter?.filterType || filter.filterType !== 'set' || !Array.isArray(filter.values) || filter.values.length === 0) {
        return;
      }
      const hasNull = filter.values.includes(null);
      const nonNull = filter.values.filter((value: any) => value !== null);
      if (hasNull && nonNull.length > 0) {
        qb.andWhere(`(${expression} = ANY(:${paramName}) OR ${expression} IS NULL)`, { [paramName]: nonNull });
      } else if (hasNull) {
        qb.andWhere(`${expression} IS NULL`);
      } else if (nonNull.length > 0) {
        qb.andWhere(`${expression} = ANY(:${paramName})`, { [paramName]: nonNull });
      }
    };

    applyNamedSetFilter(filters.library_name, 'dl.name', 'libraryNames');
    applyNamedSetFilter(filters.folder_name, 'f.name', 'folderNames');
    applyNamedSetFilter(filters.document_type_name, 'dtype.name', 'documentTypeNames');

    const ownerSubquery = `(SELECT COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email, c.user_id::text)
      FROM document_contributors c
      LEFT JOIN users u ON u.id = c.user_id AND u.tenant_id = d.tenant_id
      WHERE c.document_id = d.id AND c.role = 'owner' AND c.is_primary = true
      LIMIT 1)`;
    applyNamedSetFilter(filters.primary_owner_name, ownerSubquery, 'ownerNames');

    const reviewDueFilter = filters.review_due_at;
    if (reviewDueFilter) {
      let paramIndex = 0;
      const nextParam = () => `reviewDue${paramIndex++}`;
      if (typeof reviewDueFilter === 'string' && reviewDueFilter.trim()) {
        qb.andWhere('d.review_due_at = :reviewDueDate', { reviewDueDate: reviewDueFilter.trim() });
      } else {
        const condition = compileDateFilterCondition(reviewDueFilter, 'd.review_due_at', nextParam);
        if (condition) qb.andWhere(condition.sql, condition.params);
      }
    }

    const rows = await qb
      .orderBy('d.updated_at', 'DESC')
      .addOrderBy('d.item_number', 'DESC')
      .getRawMany();

    return rows.map((row: any) => String(row.id)).filter(Boolean);
  }

  private async aggregateByIds(
    context: AiExecutionContextWithManager,
    entityType: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents',
    groupBy: string,
    ids: string[],
  ): Promise<Array<{ key: string | null; count: number }>> {
    const registry = getAiEntityRegistry(entityType);
    const groupField = registry.aggregate.groupFields[groupBy];
    if (!groupField) {
      throw new BadRequestException('Unsupported group_by field.');
    }

    const joins = (groupField.joins || []).join('\n');
    const alias = registry.aggregate.alias;
    const idColumn = registry.aggregate.idColumn ?? 'id';
    const rows = await context.manager.query(
      `SELECT ${groupField.expression} AS key, COUNT(*)::int AS count
       FROM ${registry.aggregate.baseTable} ${alias}
       ${joins}
       WHERE ${alias}.tenant_id = $1
         AND ${alias}.${idColumn} = ANY($2::uuid[])
       GROUP BY ${groupField.expression}
       ORDER BY count DESC, key ASC NULLS LAST`,
      [context.tenantId, ids],
    );

    return (rows || []).map((row: any) => ({
      key: row.key == null ? null : String(row.key),
      count: Number(row.count) || 0,
    }));
  }

  async execute(
    context: AiExecutionContextWithManager,
    input: {
      entity_type: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents';
      group_by: string;
      filters?: Record<string, AiFilterValue>;
      q?: string;
      scope?: AiQueryScope;
    },
  ): Promise<AiAggregateResult> {
    const registry = getAiEntityRegistry(input.entity_type);
    const field = registry.fields[input.group_by];
    if (!field || field.groupable !== true) {
      throw new BadRequestException('Unsupported group_by field.');
    }

    const adapted = adaptFilters(registry, input.filters);
    const scoped = await this.listIdsForEntity(
      context,
      input.entity_type,
      input.q?.trim(),
      adapted.filters,
      input.scope,
    );
    const ids = scoped.ids;
    if (ids.length === 0) {
      return {
        group_by: input.group_by,
        groups: [],
        total: 0,
        filters_applied: adapted.applied,
        filters_ignored: adapted.ignored,
        scope: scoped.scope,
      };
    }

    const groups = await this.aggregateByIds(context, input.entity_type, input.group_by, ids);
    return {
      group_by: input.group_by,
      groups,
      total: ids.length,
      filters_applied: adapted.applied,
      filters_ignored: adapted.ignored,
      scope: scoped.scope,
    };
  }
}
