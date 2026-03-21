import { BadRequestException, Injectable } from '@nestjs/common';
import { ApplicationsService } from '../../applications/services';
import { AssetsService } from '../../assets/services';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { PortfolioRequestsService } from '../../portfolio/portfolio-requests.service';
import { PortfolioProjectsService } from '../../portfolio/services';
import { TasksService } from '../../spend/tasks.service';
import { AiEntitySummaryDto, AiExecutionContextWithManager } from '../ai.types';
import { adaptFilters } from './ai-filter.adapter';
import {
  AiFilterValue,
  AiFilterValuesResult,
  AiQueryResult,
} from './ai-filter.types';
import { getAiEntityRegistry } from './registries';

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildRef(
  entityType: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents',
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

function toEntitySummary(
  entityType: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents',
  row: {
    id: string;
    item_number?: number | null;
    label: string;
    status: string | null;
    summary?: string | null;
    updated_at?: Date | string | null;
    metadata?: Record<string, string | number | null>;
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
    private readonly knowledge: KnowledgeService,
  ) {}

  private resolveSort(
    entityType: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents',
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
    entityType: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents',
    input: {
      filters?: Record<string, AiFilterValue>;
      q?: string;
      sort?: { field: string; direction: 'asc' | 'desc' };
      limit?: number;
    },
  ): { query: Record<string, any>; filtersApplied: string[]; filtersIgnored: string[] } {
    const registry = getAiEntityRegistry(entityType);
    const adapted = adaptFilters(registry, input.filters);
    const query: Record<string, any> = {
      page: 1,
      limit: Math.min(Math.max(Number(input.limit) || 50, 1), 200),
      sort: this.resolveSort(entityType, input.sort),
    };
    if (input.q?.trim()) query.q = input.q.trim();
    if (Object.keys(adapted.filters).length > 0) query.filters = adapted.filters;

    if (entityType === 'projects') {
      query.include = 'classification,company';
      if (!Object.prototype.hasOwnProperty.call(adapted.filters, 'status')) {
        query.status = 'all';
      }
    } else if (entityType === 'requests') {
      query.include = 'classification,company,requestor';
      if (!Object.prototype.hasOwnProperty.call(adapted.filters, 'status')) {
        query.status = 'all';
      }
    } else if (entityType === 'applications') {
      query.include = 'supplier';
      query.include_inactive = true;
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
        priority: scalar(row.priority_level),
        type: scalar(row.task_type_name),
        related: scalar(row.related_object_type),
        related_label: scalar(row.related_object_name),
        category: scalar(row.category_name),
        stream: scalar(row.stream_name),
        company: scalar(row.company_name),
        source: scalar(row.source_name),
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
        execution_progress: scalar(row.execution_progress),
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
        requestor: scalar(row.requestor_name),
        category: scalar(row.category_name),
        stream: scalar(row.stream_name),
        company: scalar(row.company?.name ?? row.company_name),
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
        supplier: scalar(row.supplier_name),
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
        location: scalar(row.location_name),
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
      entity_type: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents';
      filters?: Record<string, AiFilterValue>;
      q?: string;
      sort?: { field: string; direction: 'asc' | 'desc' };
      limit?: number;
    },
  ): Promise<AiQueryResult> {
    const { query, filtersApplied, filtersIgnored } = this.buildBaseQuery(input.entity_type, input);

    if (input.entity_type === 'tasks') {
      const result = await this.tasks.listAllTasks(this.serializeFiltersForTasks(query), { manager: context.manager });
      return {
        items: (result.items || []).map((row: any) => this.mapTask(row)),
        total: result.total ?? 0,
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
      };
    }

    if (input.entity_type === 'projects') {
      const result = await this.projects.list(query, { manager: context.manager });
      return {
        items: (result.items || []).map((row: any) => this.mapProject(row)),
        total: result.total ?? 0,
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
      };
    }

    if (input.entity_type === 'requests') {
      const result = await this.requests.list(query, { manager: context.manager });
      return {
        items: (result.items || []).map((row: any) => this.mapRequest(row)),
        total: result.total ?? 0,
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
      };
    }

    if (input.entity_type === 'applications') {
      const result = await this.applications.list(query, { manager: context.manager });
      return {
        items: (result.items || []).map((row: any) => this.mapApplication(row)),
        total: result.total ?? 0,
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
      };
    }

    if (input.entity_type === 'assets') {
      const result = await this.assets.list(query, { manager: context.manager, tenantId: context.tenantId });
      return {
        items: (result.items || []).map((row: any) => this.mapAsset(row)),
        total: result.total ?? 0,
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
      };
    }

    if (input.entity_type === 'documents') {
      const result = await this.knowledge.list(query, { manager: context.manager });
      return {
        items: (result.items || []).map((row: any) => this.mapDocument(row)),
        total: result.total ?? 0,
        filters_applied: filtersApplied,
        filters_ignored: filtersIgnored,
      };
    }

    throw new BadRequestException('Unsupported entity type.');
  }

  async executeFilterValues(
    context: AiExecutionContextWithManager,
    input: {
      entity_type: 'applications' | 'assets' | 'projects' | 'requests' | 'tasks' | 'documents';
      fields: string[];
    },
  ): Promise<AiFilterValuesResult> {
    const registry = getAiEntityRegistry(input.entity_type);
    const values: Record<string, Array<string | boolean | null>> = {};
    const fieldsIgnored = new Set<string>();
    const dynamicFieldMap = new Map<string, string>();

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
        dynamicFieldMap.set(field.grid, fieldName);
        continue;
      }
      fieldsIgnored.add(fieldName);
    }

    if (dynamicFieldMap.size === 0) {
      return {
        values,
        fields_ignored: Array.from(fieldsIgnored),
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
    }

    let raw: Record<string, Array<string | boolean | null>> = {};
    if (input.entity_type === 'tasks') {
      raw = await this.tasks.listFilterValues(query, { manager: context.manager }) as any;
    } else if (input.entity_type === 'projects') {
      raw = await this.projects.listFilterValues(query, { manager: context.manager }) as any;
    } else if (input.entity_type === 'requests') {
      raw = await this.requests.listFilterValues(query, { manager: context.manager }) as any;
    } else if (input.entity_type === 'applications') {
      raw = await this.applications.listFilterValues(query, { manager: context.manager }) as any;
    } else if (input.entity_type === 'assets') {
      raw = await this.assets.listFilterValues(query, { manager: context.manager, tenantId: context.tenantId }) as any;
    } else if (input.entity_type === 'documents') {
      raw = await this.knowledge.listFilterValues(query, { manager: context.manager }) as any;
    }

    for (const [gridField, aiField] of dynamicFieldMap.entries()) {
      values[aiField] = raw?.[gridField] ?? [];
    }

    return {
      values,
      fields_ignored: Array.from(fieldsIgnored),
    };
  }
}
