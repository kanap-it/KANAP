import { BadRequestException, Injectable } from '@nestjs/common';
import { normalizeAgFilterModel } from '../../common/ag-grid-filtering';
import { ApplicationsService } from '../../applications/services';
import { AssetsService } from '../../assets/services';
import { CompaniesService } from '../../companies/companies.service';
import { ContractsService } from '../../contracts/contracts.service';
import { DepartmentsService } from '../../departments/departments.service';
import { Document } from '../../knowledge/document.entity';
import { isDocumentStatus } from '../../knowledge/document-status';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { PortfolioRequestsService } from '../../portfolio/portfolio-requests.service';
import { PortfolioProjectsService } from '../../portfolio/services';
import { SpendItemsService } from '../../spend/spend-items.service';
import { TasksService } from '../../spend/tasks.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { AiExecutionContextWithManager, AiQueryEntityType, AiQueryScope } from '../ai.types';
import { adaptFilters } from './ai-filter.adapter';
import { applyScopeToAiQuery, ResolvedAiScope } from './ai-query-scope.util';
import {
  AiAggregateMetricDef,
  AiAggregateMetricType,
  AiAggregateResult,
  AiDateFilterValue,
  AiFilterValue,
} from './ai-filter.types';
import { getAiEntityRegistry } from './registries';

type DocumentSearchState = { term: string; itemNumber: number | null };
type AiAggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';
type DocumentLinkedEntityField =
  | 'linked_application'
  | 'linked_asset'
  | 'linked_project'
  | 'linked_request'
  | 'linked_task';
type DocumentLinkedEntitySurface =
  | {
      kind: 'legacy';
      table: string;
      relationAlias: string;
      relationIdColumn: string;
      targetTable: string;
      targetAlias: string;
      targetMatchExpressions: string[];
    }
  | {
      kind: 'integrated';
      relationAlias: string;
      sourceEntityType: 'applications' | 'assets' | 'projects' | 'requests';
      targetTable: string;
      targetAlias: string;
      targetMatchExpressions: string[];
    };
type SupportedAggregateEntityType =
  'applications'
  | 'assets'
  | 'companies'
  | 'contracts'
  | 'departments'
  | 'locations'
  | 'projects'
  | 'requests'
  | 'spend_items'
  | 'suppliers'
  | 'tasks'
  | 'documents';

const DOCUMENT_LINKED_ENTITY_FILTERS: Record<DocumentLinkedEntityField, DocumentLinkedEntitySurface[]> = {
  linked_application: [
    {
      kind: 'legacy',
      table: 'document_applications',
      relationAlias: 'da_link',
      relationIdColumn: 'application_id',
      targetTable: 'applications',
      targetAlias: 'a_link',
      targetMatchExpressions: ['a_link.name'],
    },
  ],
  linked_asset: [
    {
      kind: 'legacy',
      table: 'document_assets',
      relationAlias: 'da_link',
      relationIdColumn: 'asset_id',
      targetTable: 'assets',
      targetAlias: 'ast_link',
      targetMatchExpressions: ['ast_link.name', 'ast_link.hostname', 'ast_link.fqdn'],
    },
  ],
  linked_project: [
    {
      kind: 'legacy',
      table: 'document_projects',
      relationAlias: 'dp_link',
      relationIdColumn: 'project_id',
      targetTable: 'portfolio_projects',
      targetAlias: 'p_link',
      targetMatchExpressions: ['p_link.name', `('PRJ-' || p_link.item_number::text)`],
    },
    {
      kind: 'integrated',
      relationAlias: 'idb_project_link',
      sourceEntityType: 'projects',
      targetTable: 'portfolio_projects',
      targetAlias: 'p_link',
      targetMatchExpressions: ['p_link.name', `('PRJ-' || p_link.item_number::text)`],
    },
  ],
  linked_request: [
    {
      kind: 'legacy',
      table: 'document_requests',
      relationAlias: 'dr_link',
      relationIdColumn: 'request_id',
      targetTable: 'portfolio_requests',
      targetAlias: 'r_link',
      targetMatchExpressions: ['r_link.name', `('REQ-' || r_link.item_number::text)`],
    },
    {
      kind: 'integrated',
      relationAlias: 'idb_request_link',
      sourceEntityType: 'requests',
      targetTable: 'portfolio_requests',
      targetAlias: 'r_link',
      targetMatchExpressions: ['r_link.name', `('REQ-' || r_link.item_number::text)`],
    },
  ],
  linked_task: [
    {
      kind: 'legacy',
      table: 'document_tasks',
      relationAlias: 'dt_link',
      relationIdColumn: 'task_id',
      targetTable: 'tasks',
      targetAlias: 't_link',
      targetMatchExpressions: ['t_link.title', `('T-' || t_link.item_number::text)`],
    },
  ],
};

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

function buildDocumentLinkedEntityExistsClause(
  surface: DocumentLinkedEntitySurface,
  documentAlias: string,
  predicateSql?: string,
): string {
  if (surface.kind === 'legacy') {
    return `EXISTS (
      SELECT 1
      FROM ${surface.table} ${surface.relationAlias}
      JOIN ${surface.targetTable} ${surface.targetAlias}
        ON ${surface.targetAlias}.id = ${surface.relationAlias}.${surface.relationIdColumn}
       AND ${surface.targetAlias}.tenant_id = ${documentAlias}.tenant_id
      WHERE ${surface.relationAlias}.document_id = ${documentAlias}.id
        AND ${surface.relationAlias}.tenant_id = ${documentAlias}.tenant_id
        ${predicateSql ? `AND (${predicateSql})` : ''}
    )`;
  }

  return `EXISTS (
    SELECT 1
    FROM integrated_document_bindings ${surface.relationAlias}
    JOIN ${surface.targetTable} ${surface.targetAlias}
      ON ${surface.targetAlias}.id = ${surface.relationAlias}.source_entity_id
     AND ${surface.targetAlias}.tenant_id = ${documentAlias}.tenant_id
    WHERE ${surface.relationAlias}.document_id = ${documentAlias}.id
      AND ${surface.relationAlias}.tenant_id = ${documentAlias}.tenant_id
      AND ${surface.relationAlias}.source_entity_type = '${surface.sourceEntityType}'
      ${predicateSql ? `AND (${predicateSql})` : ''}
  )`;
}

function buildDocumentLinkedEntityExistsGroup(
  field: DocumentLinkedEntityField,
  documentAlias: string,
  predicateFactory?: (surface: DocumentLinkedEntitySurface) => string,
): string {
  const clauses = DOCUMENT_LINKED_ENTITY_FILTERS[field].map((surface) =>
    buildDocumentLinkedEntityExistsClause(
      surface,
      documentAlias,
      predicateFactory ? predicateFactory(surface) : undefined,
    ),
  );
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
}

function compileDocumentLinkedEntityFilterCondition(
  field: DocumentLinkedEntityField,
  rawModel: any,
  documentAlias: string,
  paramRef: string,
): { sql: string; value?: string } | null {
  const model = normalizeAgFilterModel(rawModel);
  if (!model || typeof model !== 'object') return null;

  const type = String(model.type ?? 'contains');
  const anyLinkedSql = buildDocumentLinkedEntityExistsGroup(field, documentAlias);

  if (type === 'blank') return { sql: `NOT ${anyLinkedSql}` };
  if (type === 'notBlank') return { sql: anyLinkedSql };

  const filterText = String(model.filter ?? model.value ?? '').trim();
  if (!filterText) return null;

  let value = filterText;
  let predicateKind: 'equals' | 'contains' = 'contains';
  let negate = false;

  switch (type) {
    case 'equals':
      predicateKind = 'equals';
      break;
    case 'notEqual':
      predicateKind = 'equals';
      negate = true;
      break;
    case 'startsWith':
      value = `${filterText}%`;
      break;
    case 'endsWith':
      value = `%${filterText}`;
      break;
    case 'notContains':
      value = `%${filterText}%`;
      negate = true;
      break;
    case 'contains':
    default:
      value = `%${filterText}%`;
      break;
  }

  const matchSql = buildDocumentLinkedEntityExistsGroup(field, documentAlias, (surface) => {
    const comparisons = surface.targetMatchExpressions.map((expression) =>
      predicateKind === 'equals'
        ? `${expression} = ${paramRef}`
        : `${expression} ILIKE ${paramRef}`,
    );
    return comparisons.length === 1 ? comparisons[0] : `(${comparisons.join(' OR ')})`;
  });

  return {
    sql: negate ? `NOT ${matchSql}` : matchSql,
    value,
  };
}

function normalizeAggregateFunction(value?: string | null): AiAggregateFunction {
  return value === 'sum' || value === 'avg' || value === 'min' || value === 'max'
    ? value
    : 'count';
}

function getMetricOrderDirection(fn: AiAggregateFunction): 'ASC' | 'DESC' {
  return fn === 'min' ? 'ASC' : 'DESC';
}

function buildMetricAggregateExpression(fn: AiAggregateFunction, expression: string): string {
  switch (fn) {
    case 'sum':
      return `SUM(${expression})`;
    case 'avg':
      return `AVG(${expression})`;
    case 'min':
      return `MIN(${expression})`;
    case 'max':
      return `MAX(${expression})`;
    default:
      return 'COUNT(*)::int';
  }
}

function normalizeAggregateValue(value: any, metricType: AiAggregateMetricType): number | string | null {
  if (value == null) return null;
  if (metricType === 'number') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return String(value);
}

@Injectable()
export class AiAggregateExecutor {
  constructor(
    private readonly tasks: TasksService,
    private readonly projects: PortfolioProjectsService,
    private readonly requests: PortfolioRequestsService,
    private readonly applications: ApplicationsService,
    private readonly assets: AssetsService,
    private readonly spendItems: SpendItemsService,
    private readonly contracts: ContractsService,
    private readonly companies: CompaniesService,
    private readonly suppliers: SuppliersService,
    private readonly departments: DepartmentsService,
    private readonly knowledge: KnowledgeService,
  ) {}

  private serializeFiltersForTasks(filters: Record<string, any>): string | undefined {
    return Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined;
  }

  private async listIdsForEntity(
    context: AiExecutionContextWithManager,
    entityType: SupportedAggregateEntityType,
    q: string | undefined,
    adaptedFilters: Record<string, any>,
    scope?: AiQueryScope,
  ): Promise<{ ids: string[]; scope: ResolvedAiScope | null }> {
    if (entityType === 'tasks') {
      const scoped = await applyScopeToAiQuery(
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
      const result = await this.tasks.listIds(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'projects') {
      const scoped = await applyScopeToAiQuery(
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
      const result = await this.projects.listIds(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'requests') {
      const scoped = await applyScopeToAiQuery(
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
      const result = await this.requests.listIds(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'applications') {
      const scoped = await applyScopeToAiQuery(
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
      const result = await this.applications.listIds(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      return { ids: result.ids || [], scope: scoped.scope };
    }

    if (entityType === 'spend_items') {
      const result = await this.spendItems.summaryIds(
        {
          q,
          filters: adaptedFilters,
          includeDisabled: true,
        },
        { manager: context.manager },
      );
      return { ids: result.ids || [], scope: null };
    }

    if (entityType === 'contracts') {
      const result = await this.contracts.listIds(
        {
          q,
          filters: adaptedFilters,
          includeDisabled: true,
        },
        { manager: context.manager },
      );
      return { ids: result.ids || [], scope: null };
    }

    if (entityType === 'companies') {
      const result = await this.companies.listIds(
        {
          q,
          filters: adaptedFilters,
          includeDisabled: true,
        },
        { manager: context.manager },
      );
      return { ids: result.ids || [], scope: null };
    }

    if (entityType === 'suppliers') {
      const result = await this.suppliers.listIds(
        {
          q,
          filters: adaptedFilters,
          includeDisabled: true,
        },
        { manager: context.manager },
      );
      return { ids: result.ids || [], scope: null };
    }

    if (entityType === 'departments') {
      const result = await this.departments.listIds(
        {
          q,
          filters: adaptedFilters,
          includeDisabled: true,
        },
        { manager: context.manager },
      );
      return { ids: result.ids || [], scope: null };
    }

    if (entityType === 'assets') {
      const scoped = await applyScopeToAiQuery(
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

    if (entityType === 'locations') {
      // Locations don't support scope — just list IDs with tenant filter
      const rows: Array<{ id: string }> = await context.manager.query(
        `SELECT id FROM locations WHERE tenant_id = $1`,
        [context.tenantId],
      );
      return { ids: rows.map((r) => r.id), scope: null };
    }

    throw new BadRequestException('Unsupported entity type.');
  }

  private resolveMetric(
    entityType: SupportedAggregateEntityType,
    metric: string | undefined,
    fn: AiAggregateFunction,
  ): { key: string; def: AiAggregateMetricDef } | null {
    if (fn === 'count') return null;
    if (!metric) {
      throw new BadRequestException('metric is required for non-count aggregation.');
    }

    const registry = getAiEntityRegistry(entityType);
    const explicit = registry.aggregate.metricFields?.[metric];
    if (explicit) {
      if ((fn === 'sum' || fn === 'avg') && explicit.type !== 'number') {
        throw new BadRequestException('sum and avg require a numeric metric.');
      }
      return { key: metric, def: explicit };
    }

    const field = registry.fields[metric];
    if (!field || field.aggregable !== true) {
      throw new BadRequestException('Unsupported metric field.');
    }

    if (field.type !== 'number' && field.type !== 'date') {
      throw new BadRequestException('Unsupported metric field.');
    }
    if ((fn === 'sum' || fn === 'avg') && field.type !== 'number') {
      throw new BadRequestException('sum and avg require a numeric metric.');
    }

    return {
      key: metric,
      def: {
        expression: `${registry.aggregate.alias}.${field.grid}`,
        type: field.type,
      },
    };
  }

  private buildDocumentAggregateQuery(
    context: AiExecutionContextWithManager,
    groupBy: string,
    q: string | undefined,
    filters: Record<string, any>,
  ) {
    const registry = getAiEntityRegistry('documents');
    const groupField = registry.aggregate.groupFields[groupBy];
    if (!groupField) {
      throw new BadRequestException('Unsupported group_by field.');
    }

    const qb = context.manager
      .getRepository(Document)
      .createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId: context.tenantId })
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
      WHERE c.document_id = d.id AND c.tenant_id = d.tenant_id AND c.role = 'owner' AND c.is_primary = true
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

    let linkedEntityParamIndex = 0;
    const nextLinkedEntityParam = () => `linkedEntity${linkedEntityParamIndex++}`;
    for (const fieldName of Object.keys(DOCUMENT_LINKED_ENTITY_FILTERS) as DocumentLinkedEntityField[]) {
      const filter = filters[fieldName];
      if (!filter) continue;
      const param = nextLinkedEntityParam();
      const condition = compileDocumentLinkedEntityFilterCondition(fieldName, filter, 'd', `:${param}`);
      if (!condition) continue;
      qb.andWhere(condition.sql, condition.value === undefined ? {} : { [param]: condition.value });
    }

    return {
      qb,
      groupExpression: groupField.expression,
    };
  }

  private async aggregateByIds(
    context: AiExecutionContextWithManager,
    entityType: SupportedAggregateEntityType,
    groupBy: string,
    ids: string[],
    fn: AiAggregateFunction,
    metric: { key: string; def: AiAggregateMetricDef } | null,
  ): Promise<Array<{ key: string | null; count: number } | { key: string | null; value: number | string | null }>> {
    const registry = getAiEntityRegistry(entityType);
    const groupField = registry.aggregate.groupFields[groupBy];
    if (!groupField) {
      throw new BadRequestException('Unsupported group_by field.');
    }

    const joins = Array.from(new Set([...(groupField.joins || []), ...(metric?.def.joins || [])])).join('\n');
    const alias = registry.aggregate.alias;
    const idColumn = registry.aggregate.idColumn ?? 'id';
    if (fn === 'count' || !metric) {
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

    const aggregateExpression = buildMetricAggregateExpression(fn, metric.def.expression);
    const orderDirection = getMetricOrderDirection(fn);
    const rows = await context.manager.query(
      `SELECT ${groupField.expression} AS key, ${aggregateExpression} AS value
       FROM ${registry.aggregate.baseTable} ${alias}
       ${joins}
       WHERE ${alias}.tenant_id = $1
         AND ${alias}.${idColumn} = ANY($2::uuid[])
       GROUP BY ${groupField.expression}
       ORDER BY value ${orderDirection} NULLS LAST, key ASC NULLS LAST`,
      [context.tenantId, ids],
    );

    return (rows || []).map((row: any) => ({
      key: row.key == null ? null : String(row.key),
      value: normalizeAggregateValue(row.value, metric.def.type),
    }));
  }

  async execute(
    context: AiExecutionContextWithManager,
    input: {
      entity_type: AiQueryEntityType;
      group_by: string;
      metric?: string;
      function?: AiAggregateFunction;
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

    const fn = normalizeAggregateFunction(input.function);
    const metric = this.resolveMetric(input.entity_type, input.metric?.trim(), fn);
    const adapted = adaptFilters(registry, input.filters);
    if (input.entity_type === 'documents') {
      const scoped = await applyScopeToAiQuery(
        context,
        input.entity_type,
        { q: input.q?.trim(), filters: adapted.filters },
        input.scope,
      );
      if (scoped.scope && scoped.scope.resolved === false) {
        return {
          group_by: input.group_by,
          metric: metric?.key ?? null,
          function: fn,
          groups: [],
          total: 0,
          filters_applied: adapted.applied,
          filters_ignored: adapted.ignored,
          scope: scoped.scope,
        };
      }

      const { qb, groupExpression } = this.buildDocumentAggregateQuery(
        context,
        input.group_by,
        input.q?.trim(),
        adapted.filters,
      );
      const total = await qb.clone().getCount();
      if (total === 0) {
        return {
          group_by: input.group_by,
          metric: metric?.key ?? null,
          function: fn,
          groups: [],
          total: 0,
          filters_applied: adapted.applied,
          filters_ignored: adapted.ignored,
          scope: scoped.scope,
        };
      }

      let rows: Array<{ key: string | null; count: number } | { key: string | null; value: number | string | null }>;
      if (fn === 'count' || !metric) {
        const countRows = await qb
          .clone()
          .select(groupExpression, 'key')
          .addSelect('COUNT(*)::int', 'count')
          .groupBy(groupExpression)
          .orderBy('count', 'DESC')
          .addOrderBy('key', 'ASC', 'NULLS LAST')
          .getRawMany();
        rows = (countRows || []).map((row: any) => ({
          key: row.key == null ? null : String(row.key),
          count: Number(row.count) || 0,
        }));
      } else {
        const aggregateExpression = buildMetricAggregateExpression(fn, metric.def.expression);
        const valueRows = await qb
          .clone()
          .select(groupExpression, 'key')
          .addSelect(aggregateExpression, 'value')
          .groupBy(groupExpression)
          .orderBy('value', getMetricOrderDirection(fn), 'NULLS LAST')
          .addOrderBy('key', 'ASC', 'NULLS LAST')
          .getRawMany();
        rows = (valueRows || []).map((row: any) => ({
          key: row.key == null ? null : String(row.key),
          value: normalizeAggregateValue(row.value, metric.def.type),
        }));
      }

      return {
        group_by: input.group_by,
        metric: metric?.key ?? null,
        function: fn,
        groups: rows,
        total,
        filters_applied: adapted.applied,
        filters_ignored: adapted.ignored,
        scope: scoped.scope,
      };
    }

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
        metric: metric?.key ?? null,
        function: fn,
        groups: [],
        total: 0,
        filters_applied: adapted.applied,
        filters_ignored: adapted.ignored,
        scope: scoped.scope,
      };
    }

    const groups = await this.aggregateByIds(context, input.entity_type, input.group_by, ids, fn, metric);
    return {
      group_by: input.group_by,
      metric: metric?.key ?? null,
      function: fn,
      groups,
      total: ids.length,
      filters_applied: adapted.applied,
      filters_ignored: adapted.ignored,
      scope: scoped.scope,
    };
  }
}
