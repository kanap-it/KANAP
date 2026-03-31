import { BadRequestException, Injectable } from '@nestjs/common';
import { ApplicationsService } from '../../applications/services';
import { AssetsService } from '../../assets/services';
import { CompaniesService } from '../../companies/companies.service';
import { ContractsService } from '../../contracts/contracts.service';
import { DepartmentsService } from '../../departments/departments.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { LocationsService } from '../../locations/locations.service';
import { PortfolioRequestsService } from '../../portfolio/portfolio-requests.service';
import { PortfolioProjectsService } from '../../portfolio/services';
import { SpendItemsService } from '../../spend/spend-items.service';
import { TasksService } from '../../spend/tasks.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { UsersService } from '../../users/users.service';
import {
  AiEntityMetadata,
  AiEntitySummaryDto,
  AiExecutionContextWithManager,
  AiQueryEntityType,
  AiQueryScope,
} from '../ai.types';
import { adaptFilters } from './ai-filter.adapter';
import { applyScopeToAiQuery } from './ai-query-scope.util';
import {
  AiFilterValue,
  AiFilterValuesResult,
  AiQueryResult,
} from './ai-filter.types';
import { assertPlainTextQuickSearch } from './ai-quick-search-validation.util';
import { getAiEntityRegistry } from './registries';

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildRef(
  entityType: AiQueryEntityType,
  itemNumber?: number | null,
): string | null {
  if (!itemNumber) return null;
  if (entityType === 'projects') return `PRJ-${itemNumber}`;
  if (entityType === 'requests') return `REQ-${itemNumber}`;
  if (entityType === 'tasks') return `T-${itemNumber}`;
  if (entityType === 'documents') return `DOC-${itemNumber}`;
  return null;
}

function scalar(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return toIso(value);
  return String(value);
}

function numericScalar(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function displayName(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value !== 'object') return null;

  const row = value as {
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
  if (typeof row.name === 'string' && row.name.trim()) return row.name.trim();
  const combined = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return combined || row.email || null;
}

function joinDisplayNames(values: unknown[]): string | null {
  const names = Array.from(new Set(values.map((value) => displayName(value)).filter((value): value is string => !!value)));
  return names.length > 0 ? names.join(', ') : null;
}

function extractContributorNames(row: any): string | null {
  return joinDisplayNames([
    ...(Array.isArray(row?.business_team) ? row.business_team : []),
    ...(Array.isArray(row?.it_team) ? row.it_team : []),
  ]);
}

function getSpendVersionSlot(row: any, offset: number, anchorYear: number): any {
  const versions = row?.versions;
  if (!versions || typeof versions !== 'object') return null;
  const targetYear = anchorYear + offset;
  if (offset === -1) return versions.yMinus1 ?? versions[`y${targetYear}`] ?? null;
  if (offset === 0) return versions.y ?? versions[`y${targetYear}`] ?? null;
  if (offset === 1) return versions.yPlus1 ?? versions[`y${targetYear}`] ?? null;
  return versions[`y${targetYear}`] ?? null;
}

function getSpendVersionMetric(
  row: any,
  offset: number,
  anchorYear: number,
  metric: 'budget' | 'revision' | 'follow_up' | 'landing',
): number | null {
  const slot = getSpendVersionSlot(row, offset, anchorYear);
  if (!slot || typeof slot !== 'object') return null;
  const reportingValue = numericScalar(slot.reporting?.[metric]);
  if (reportingValue != null) return reportingValue;
  return numericScalar(slot.totals?.[metric]);
}

function formatRelativeYearLabel(offset: number): string {
  if (offset === 0) return 'Y';
  return offset > 0 ? `Y+${offset}` : `Y${offset}`;
}

function buildSpendYearlyTotals(row: any, anchorYear: number): Array<Record<string, string | number | null>> {
  return [-2, -1, 0, 1, 2].map((offset) => ({
    label: formatRelativeYearLabel(offset),
    year: anchorYear + offset,
    budget: getSpendVersionMetric(row, offset, anchorYear, 'budget'),
    review: getSpendVersionMetric(row, offset, anchorYear, 'revision'),
    actual: getSpendVersionMetric(row, offset, anchorYear, 'follow_up'),
    landing: getSpendVersionMetric(row, offset, anchorYear, 'landing'),
  }));
}

function toEntitySummary(
  entityType: AiQueryEntityType,
  row: {
    id: string;
    item_number?: number | null;
    label: string;
    status: string | null;
    summary?: string | null;
    updated_at?: Date | string | null;
    metadata?: AiEntityMetadata;
  },
): AiEntitySummaryDto {
  return {
    type: entityType,
    id: row.id,
    ref: buildRef(entityType, row.item_number ?? null),
    label: row.label,
    status: row.status ?? null,
    summary: row.summary ?? null,
    updated_at: toIso(row.updated_at),
    metadata: row.metadata ?? null,
  };
}

@Injectable()
export class AiQueryExecutor {
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
    private readonly locations: LocationsService,
    private readonly users: UsersService,
  ) {}

  private resolveSort(
    entityType: AiQueryEntityType,
    sort?: { field: string; direction: 'asc' | 'desc' },
  ): string {
    const registry = getAiEntityRegistry(entityType);
    if (!sort?.field) {
      return `${registry.defaultSort.field}:${registry.defaultSort.direction.toUpperCase()}`;
    }
    const mappedField = registry.sortFields[sort.field];
    const direction = sort.direction === 'asc' ? 'ASC' : 'DESC';
    if (!mappedField) {
      return `${registry.defaultSort.field}:${registry.defaultSort.direction.toUpperCase()}`;
    }
    return `${mappedField}:${direction}`;
  }

  private buildBaseQuery(
    entityType: AiQueryEntityType,
    input: {
      filters?: Record<string, AiFilterValue>;
      q?: string;
      sort?: { field: string; direction: 'asc' | 'desc' };
      page?: number;
      limit?: number;
    },
  ): { query: Record<string, any>; filtersApplied: string[]; filtersIgnored: string[] } {
    const registry = getAiEntityRegistry(entityType);
    const adapted = adaptFilters(registry, input.filters);
    const page = Math.min(Math.max(Number(input.page) || 1, 1), 100);
    const limit = Math.min(Math.max(Number(input.limit) || 200, 1), 200);
    assertPlainTextQuickSearch(entityType, input.q);
    const query: Record<string, any> = {
      page,
      limit,
      sort: this.resolveSort(entityType, input.sort),
    };
    if (input.q?.trim()) query.q = input.q.trim();
    if (Object.keys(adapted.filters).length > 0) query.filters = adapted.filters;

    if (entityType === 'projects') {
      query.include = 'classification,company,sponsors,team';
      if (!Object.prototype.hasOwnProperty.call(adapted.filters, 'status')) {
        query.status = 'all';
      }
    } else if (entityType === 'requests') {
      query.include = 'classification,company,requestor,sponsors,team';
      if (!Object.prototype.hasOwnProperty.call(adapted.filters, 'status')) {
        query.status = 'all';
      }
    } else if (entityType === 'applications') {
      query.include = 'supplier,owners';
      query.include_inactive = true;
    } else if (
      entityType === 'spend_items'
      || entityType === 'contracts'
      || entityType === 'companies'
      || entityType === 'suppliers'
      || entityType === 'departments'
    ) {
      query.includeDisabled = true;
    }

    return {
      query,
      filtersApplied: adapted.applied,
      filtersIgnored: adapted.ignored,
    };
  }

  private serializeFiltersForTasks(query: Record<string, any>): Record<string, any> {
    if (!query.filters || typeof query.filters !== 'object') {
      return query;
    }
    return {
      ...query,
      filters: JSON.stringify(query.filters),
    };
  }

  private mapTask(row: any): AiEntitySummaryDto {
    return toEntitySummary('tasks', {
      id: row.id,
      item_number: row.item_number ?? null,
      label: row.title || 'Untitled task',
      status: row.status ?? null,
      summary: row.description ?? null,
      updated_at: row.updated_at ?? null,
      metadata: {
        assignee: scalar(row.assignee_name),
        creator: scalar(row.creator_name),
        priority: scalar(row.priority_level),
        type: scalar(row.task_type_name),
        due_date: scalar(row.due_date),
        phase: scalar(row.phase_name),
        labels: scalar(Array.isArray(row.labels) ? row.labels.join(', ') : null),
        related: scalar(row.related_object_type),
        related_label: scalar(row.related_object_name),
        category: scalar(row.category_name),
        stream: scalar(row.stream_name),
        company: scalar(row.company_name),
        source: scalar(row.source_name),
        project_name: scalar(row.project_name),
        project_stream: scalar(row.project_stream_name),
        project_category: scalar(row.project_category_name),
      },
    });
  }

  private mapProject(row: any): AiEntitySummaryDto {
    return toEntitySummary('projects', {
      id: row.id,
      item_number: row.item_number ?? null,
      label: row.name,
      status: row.status ?? null,
      summary: row.purpose ?? null,
      updated_at: row.updated_at ?? null,
      metadata: {
        origin: scalar(row.origin),
        category: scalar(row.category_name),
        stream: scalar(row.stream_name),
        company: scalar(row.company?.name ?? row.company_name),
        department: scalar(row.department?.name ?? row.department_name),
        business_lead: scalar(displayName(row.business_lead) ?? row.business_lead_name),
        it_lead: scalar(displayName(row.it_lead) ?? row.it_lead_name),
        contributors: scalar(extractContributorNames(row)),
        priority_score: numericScalar(row.priority_score),
        execution_progress: numericScalar(row.execution_progress),
        planned_start: scalar(row.planned_start),
        planned_end: scalar(row.planned_end),
      },
    });
  }

  private mapRequest(row: any): AiEntitySummaryDto {
    return toEntitySummary('requests', {
      id: row.id,
      item_number: row.item_number ?? null,
      label: row.name,
      status: row.status ?? null,
      summary: row.current_situation ?? row.expected_benefits ?? null,
      updated_at: row.updated_at ?? null,
      metadata: {
        requestor: scalar(displayName(row.requestor) ?? row.requestor_name),
        category: scalar(row.category_name),
        stream: scalar(row.stream_name),
        company: scalar(row.company?.name ?? row.company_name),
        department: scalar(row.department?.name ?? row.department_name),
        business_lead: scalar(displayName(row.business_lead) ?? row.business_lead_name),
        it_lead: scalar(displayName(row.it_lead) ?? row.it_lead_name),
        contributors: scalar(extractContributorNames(row)),
        priority_score: numericScalar(row.priority_score),
        target_date: scalar(row.target_delivery_date),
      },
    });
  }

  private mapApplication(row: any): AiEntitySummaryDto {
    return toEntitySummary('applications', {
      id: row.id,
      label: row.name,
      status: row.status ?? null,
      summary: row.description ?? null,
      updated_at: row.updated_at ?? null,
      metadata: {
        lifecycle: scalar(row.lifecycle),
        criticality: scalar(row.criticality),
        category: scalar(row.category),
        hosting_model: scalar(row.hosting_model),
        data_class: scalar(row.data_class),
        version: scalar(row.version),
        supplier: scalar(row.supplier_name),
        business_owner: scalar(joinDisplayNames(Array.isArray(row.owners_business) ? row.owners_business : [])),
        it_owner: scalar(joinDisplayNames(Array.isArray(row.owners_it) ? row.owners_it : [])),
      },
    });
  }

  private mapSpendItem(row: any): AiEntitySummaryDto {
    const anchorYear = new Date().getFullYear();
    const summary = row.description
      ?? ([row.supplier_name, row.paying_company_name, row.account_display].filter(Boolean).join(' | ') || null);
    return toEntitySummary('spend_items', {
      id: row.id,
      label: row.product_name || 'Untitled spend item',
      status: row.status ?? null,
      summary,
      updated_at: row.updated_at ?? null,
      metadata: {
        supplier: scalar(row.supplier_name),
        paying_company: scalar(row.paying_company_name),
        account: scalar(row.account_display),
        owner_it: scalar(row.owner_it_name),
        owner_business: scalar(row.owner_business_name),
        analytics_category: scalar(row.analytics_category_name),
        allocation_method: scalar(row.allocation_method_label),
        contract: scalar(row.latest_contract_name),
        currency: scalar(row.currency),
        effective_start: scalar(row.effective_start),
        effective_end: scalar(row.effective_end),
        project_name: scalar(row.project_name),
        project_stream: scalar(row.project_stream_name),
        project_category: scalar(row.project_category_name),
        budget_anchor_year: anchorYear,
        y_minus2_budget: getSpendVersionMetric(row, -2, anchorYear, 'budget'),
        y_minus2_review: getSpendVersionMetric(row, -2, anchorYear, 'revision'),
        y_minus2_actual: getSpendVersionMetric(row, -2, anchorYear, 'follow_up'),
        y_minus2_landing: getSpendVersionMetric(row, -2, anchorYear, 'landing'),
        y_minus1_budget: getSpendVersionMetric(row, -1, anchorYear, 'budget'),
        y_minus1_review: getSpendVersionMetric(row, -1, anchorYear, 'revision'),
        y_minus1_actual: getSpendVersionMetric(row, -1, anchorYear, 'follow_up'),
        y_minus1_landing: getSpendVersionMetric(row, -1, anchorYear, 'landing'),
        y_budget: getSpendVersionMetric(row, 0, anchorYear, 'budget'),
        y_review: getSpendVersionMetric(row, 0, anchorYear, 'revision'),
        y_actual: getSpendVersionMetric(row, 0, anchorYear, 'follow_up'),
        y_landing: getSpendVersionMetric(row, 0, anchorYear, 'landing'),
        y_plus1_budget: getSpendVersionMetric(row, 1, anchorYear, 'budget'),
        y_plus1_review: getSpendVersionMetric(row, 1, anchorYear, 'revision'),
        y_plus1_actual: getSpendVersionMetric(row, 1, anchorYear, 'follow_up'),
        y_plus1_landing: getSpendVersionMetric(row, 1, anchorYear, 'landing'),
        y_plus2_budget: getSpendVersionMetric(row, 2, anchorYear, 'budget'),
        y_plus2_review: getSpendVersionMetric(row, 2, anchorYear, 'revision'),
        y_plus2_actual: getSpendVersionMetric(row, 2, anchorYear, 'follow_up'),
        y_plus2_landing: getSpendVersionMetric(row, 2, anchorYear, 'landing'),
        yearly_totals: buildSpendYearlyTotals(row, anchorYear),
      },
    });
  }

  private mapContract(row: any): AiEntitySummaryDto {
    const companyName = row.company?.name ?? row.company_name ?? null;
    const supplierName = row.supplier?.name ?? row.supplier_name ?? null;
    const summary = row.notes ?? ([companyName, supplierName].filter(Boolean).join(' | ') || null);
    return toEntitySummary('contracts', {
      id: row.id,
      label: row.name,
      status: row.status ?? null,
      summary,
      updated_at: row.updated_at ?? null,
      metadata: {
        company: scalar(companyName),
        supplier: scalar(supplierName),
        currency: scalar(row.currency),
        billing_frequency: scalar(row.billing_frequency),
        start_date: scalar(row.start_date),
        duration_months: numericScalar(row.duration_months),
        auto_renewal: row.auto_renewal == null ? null : Boolean(row.auto_renewal),
        notice_period_months: numericScalar(row.notice_period_months),
        end_date: scalar(row.end_date),
        cancellation_deadline: scalar(row.cancellation_deadline),
        yearly_amount: numericScalar(row.yearly_amount_at_signature),
        yearly_amount_at_signature: numericScalar(row.yearly_amount_at_signature),
      },
    });
  }

  private mapCompany(row: any): AiEntitySummaryDto {
    return toEntitySummary('companies', {
      id: row.id,
      label: row.name,
      status: row.status ?? null,
      summary: [row.city, row.country_iso].filter(Boolean).join(', ') || null,
      updated_at: row.updated_at ?? null,
      metadata: {
        country: scalar(row.country_iso),
        country_iso: scalar(row.country_iso),
        city: scalar(row.city),
        state: scalar(row.state),
        base_currency: scalar(row.base_currency),
      },
    });
  }

  private mapSupplier(row: any): AiEntitySummaryDto {
    return toEntitySummary('suppliers', {
      id: row.id,
      label: row.name,
      status: row.status ?? null,
      summary: row.notes ?? row.erp_supplier_id ?? null,
      updated_at: row.updated_at ?? null,
      metadata: {
        erp_supplier_id: scalar(row.erp_supplier_id),
      },
    });
  }

  private mapDepartment(row: any): AiEntitySummaryDto {
    return toEntitySummary('departments', {
      id: row.id,
      label: row.name,
      status: row.status ?? null,
      summary: row.description ?? row.company_name ?? null,
      updated_at: row.updated_at ?? null,
      metadata: {
        company: scalar(row.company_name),
      },
    });
  }

  private mapAsset(row: any): AiEntitySummaryDto {
    return toEntitySummary('assets', {
      id: row.id,
      label: row.name,
      status: row.status ?? null,
      summary: row.fqdn ?? row.hostname ?? row.notes ?? null,
      updated_at: row.updated_at ?? null,
      metadata: {
        kind: scalar(row.kind),
        provider: scalar(row.provider),
        environment: scalar(row.environment),
        os: scalar(row.operating_system),
        hostname: scalar(row.hostname),
        fqdn: scalar(row.fqdn),
        location: scalar(row.location_name),
        sub_location: scalar(row.sub_location_name),
      },
    });
  }

  private mapLocation(row: any): AiEntitySummaryDto {
    const subLocations = Array.isArray(row.sub_locations) && row.sub_locations.length > 0
      ? row.sub_locations.join(', ')
      : null;
    return toEntitySummary('locations', {
      id: row.id,
      label: `${row.code} — ${row.name}`,
      status: null,
      summary: [row.city, row.country_iso].filter(Boolean).join(', ') || null,
      updated_at: row.updated_at ?? null,
      metadata: {
        hosting_type: scalar(row.hosting_type),
        provider: scalar(row.provider) ?? scalar(row.operating_company_name),
        country: scalar(row.country_iso),
        city: scalar(row.city),
        assets: row.servers_count ?? 0,
        sub_locations: subLocations,
      },
    });
  }

  private mapUser(row: any): AiEntitySummaryDto {
    const label = displayName(row) ?? row.email ?? 'Unknown user';
    const summary = label === row.email
      ? ([row.job_title, row.team_name, row.company_name].filter(Boolean).join(' | ') || null)
      : ([row.email, row.job_title, row.team_name, row.company_name].filter(Boolean).join(' | ') || null);
    return toEntitySummary('users', {
      id: row.id,
      label,
      status: row.status ?? null,
      summary,
      updated_at: row.updated_at ?? null,
      metadata: {
        email: scalar(row.email),
        first_name: scalar(row.first_name),
        last_name: scalar(row.last_name),
        job_title: scalar(row.job_title),
        company: scalar(row.company_name),
        department: scalar(row.department_name),
        primary_role: scalar(row.primary_role_name),
        locale: scalar(row.locale),
        team: scalar(row.team_name),
        contributor_profile: scalar(row.contributor_profile),
        project_availability: numericScalar(row.project_availability),
        areas_of_expertise: scalar(row.areas_of_expertise),
      },
    });
  }

  private mapDocument(row: any): AiEntitySummaryDto {
    return toEntitySummary('documents', {
      id: row.id,
      item_number: row.item_number ?? null,
      label: row.title,
      status: row.status ?? null,
      summary: row.summary ?? null,
      updated_at: row.updated_at ?? null,
      metadata: {
        library: scalar(row.library_name),
        folder: scalar(row.folder_name),
        type: scalar(row.document_type_name),
        owner: scalar(row.primary_owner_name),
        review_due: scalar(row.review_due_at),
      },
    });
  }

  async execute(
    context: AiExecutionContextWithManager,
    input: {
      entity_type: AiQueryEntityType;
      filters?: Record<string, AiFilterValue>;
      q?: string;
      sort?: { field: string; direction: 'asc' | 'desc' };
      page?: number;
      limit?: number;
      scope?: AiQueryScope;
    },
  ): Promise<AiQueryResult> {
    const { query, filtersApplied, filtersIgnored } = this.buildBaseQuery(input.entity_type, input);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const scoped = await applyScopeToAiQuery(context, input.entity_type, query, input.scope);
    if (scoped.scope && scoped.scope.resolved === false) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        returned: 0,
        truncated: false,
        complete: false,
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: scoped.scope,
      };
    }

    const isCompleteQueryResult = (resultPage: number, truncated: boolean): boolean =>
      resultPage === 1
      && !truncated
      && filtersIgnored.length === 0
      && (scoped.scope?.resolved !== false);

    if (input.entity_type === 'tasks') {
      const result = await this.tasks.listAllTasks(this.serializeFiltersForTasks(scoped.query), {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapTask(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: scoped.scope,
      };
    }

    if (input.entity_type === 'projects') {
      const result = await this.projects.list(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapProject(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: scoped.scope,
      };
    }

    if (input.entity_type === 'requests') {
      const result = await this.requests.list(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapRequest(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: scoped.scope,
      };
    }

    if (input.entity_type === 'applications') {
      const result = await this.applications.list(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapApplication(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: scoped.scope,
      };
    }

    if (input.entity_type === 'spend_items') {
      const anchorYear = new Date().getFullYear();
      const result = await this.spendItems.summary(
        {
          ...scoped.query,
          years: [anchorYear - 2, anchorYear - 1, anchorYear, anchorYear + 1, anchorYear + 2].join(','),
        },
        { manager: context.manager },
      );
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapSpendItem(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: null,
      };
    }

    if (input.entity_type === 'contracts') {
      const result = await this.contracts.list(scoped.query, { manager: context.manager });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapContract(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: null,
      };
    }

    if (input.entity_type === 'companies') {
      const result = await this.companies.list(scoped.query, { manager: context.manager });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapCompany(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: null,
      };
    }

    if (input.entity_type === 'suppliers') {
      const result = await this.suppliers.list(scoped.query, { manager: context.manager });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapSupplier(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: null,
      };
    }

    if (input.entity_type === 'departments') {
      const result = await this.departments.list(scoped.query, { manager: context.manager });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapDepartment(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: null,
      };
    }

    if (input.entity_type === 'assets') {
      const result = await this.assets.list(scoped.query, { manager: context.manager, tenantId: context.tenantId });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapAsset(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: scoped.scope,
      };
    }

    if (input.entity_type === 'documents') {
      const result = await this.knowledge.list(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapDocument(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: scoped.scope,
      };
    }

    if (input.entity_type === 'locations') {
      const result = await this.locations.list(scoped.query, { manager: context.manager, tenantId: context.tenantId });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapLocation(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: null,
      };
    }

    if (input.entity_type === 'users') {
      const result = await this.users.listForAi(scoped.query, {
        manager: context.manager,
        tenantId: context.tenantId,
      });
      const resultPage = result.page ?? page;
      const resultLimit = result.limit ?? limit;
      const returned = Array.isArray(result.items) ? result.items.length : 0;
      const truncated = (result.total ?? 0) > ((resultPage - 1) * resultLimit + returned);
      return {
        items: (result.items || []).map((row: any) => this.mapUser(row)),
        total: result.total ?? 0,
        page: resultPage,
        limit: resultLimit,
        returned,
        truncated,
        complete: isCompleteQueryResult(resultPage, truncated),
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
        scope: null,
      };
    }

    throw new BadRequestException('Unsupported entity type.');
  }

  async executeFilterValues(
    context: AiExecutionContextWithManager,
    input: {
      entity_type: AiQueryEntityType;
      fields: string[];
    },
  ): Promise<AiFilterValuesResult> {
    const registry = getAiEntityRegistry(input.entity_type);
    const values: Record<string, Array<string | boolean | null>> = {};
    const fieldsIgnored = new Set<string>();
    const dynamicFieldMap = new Map<string, string[]>();

    for (const fieldName of input.fields) {
      const field = registry.fields[fieldName];
      if (!field || field.discoverable !== true) {
        fieldsIgnored.add(fieldName);
        continue;
      }
      if (Array.isArray(field.values)) {
        values[fieldName] = [...field.values];
        continue;
      }
      if (field.dynamic) {
        const mapped = dynamicFieldMap.get(field.grid) ?? [];
        mapped.push(fieldName);
        dynamicFieldMap.set(field.grid, mapped);
        continue;
      }
      fieldsIgnored.add(fieldName);
    }

    if (dynamicFieldMap.size === 0) {
      const ignoredFields = Array.from(fieldsIgnored);
      return {
        values,
        fields_ignored: ignoredFields,
        complete: ignoredFields.length === 0,
      };
    }

    const query: Record<string, any> = {
      fields: Array.from(dynamicFieldMap.keys()).join(','),
    };
    if (input.entity_type === 'projects') {
      query.status = 'all';
    } else if (input.entity_type === 'requests') {
      query.status = 'all';
    } else if (input.entity_type === 'applications') {
      query.include_inactive = true;
    } else if (
      input.entity_type === 'spend_items'
      || input.entity_type === 'contracts'
      || input.entity_type === 'companies'
      || input.entity_type === 'suppliers'
      || input.entity_type === 'departments'
    ) {
      query.includeDisabled = true;
    }

    let raw: Record<string, Array<string | boolean | null>> = {};
    if (input.entity_type === 'tasks') {
      raw = await this.tasks.listFilterValues(query, {
        manager: context.manager,
        tenantId: context.tenantId,
      }) as any;
    } else if (input.entity_type === 'projects') {
      raw = await this.projects.listFilterValues(query, {
        manager: context.manager,
        tenantId: context.tenantId,
      }) as any;
    } else if (input.entity_type === 'requests') {
      raw = await this.requests.listFilterValues(query, {
        manager: context.manager,
        tenantId: context.tenantId,
      }) as any;
    } else if (input.entity_type === 'applications') {
      raw = await this.applications.listFilterValues(query, {
        manager: context.manager,
        tenantId: context.tenantId,
      }) as any;
    } else if (input.entity_type === 'spend_items') {
      raw = await this.spendItems.summaryFilterValues(query, {
        manager: context.manager,
      }) as any;
    } else if (input.entity_type === 'contracts') {
      raw = await this.contracts.listFilterValues(query, {
        manager: context.manager,
      }) as any;
    } else if (input.entity_type === 'companies') {
      raw = await this.companies.listFilterValues(query, {
        manager: context.manager,
      }) as any;
    } else if (input.entity_type === 'suppliers') {
      raw = await this.suppliers.listFilterValues(query, {
        manager: context.manager,
      }) as any;
    } else if (input.entity_type === 'departments') {
      raw = await this.departments.listFilterValues(query, {
        manager: context.manager,
      }) as any;
    } else if (input.entity_type === 'assets') {
      raw = await this.assets.listFilterValues(query, { manager: context.manager, tenantId: context.tenantId }) as any;
    } else if (input.entity_type === 'documents') {
      raw = await this.knowledge.listFilterValues(query, {
        manager: context.manager,
        tenantId: context.tenantId,
      }) as any;
    } else if (input.entity_type === 'locations') {
      raw = await this.locations.listFilterValues(query, { manager: context.manager, tenantId: context.tenantId }) as any;
    } else if (input.entity_type === 'users') {
      raw = await this.users.listFilterValuesForAi(query, {
        manager: context.manager,
        tenantId: context.tenantId,
      }) as any;
    }

    for (const [gridField, aiFields] of dynamicFieldMap.entries()) {
      const rawValues = raw?.[gridField] ?? [];
      for (const aiField of aiFields) {
        values[aiField] = rawValues;
      }
    }

    const ignoredFields = Array.from(fieldsIgnored);
    return {
      values,
      fields_ignored: ignoredFields,
      complete: ignoredFields.length === 0,
    };
  }
}
