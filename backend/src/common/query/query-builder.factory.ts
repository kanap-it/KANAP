import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder, Brackets, ObjectLiteral } from 'typeorm';
import {
  compileAgFilterCondition,
  createParamNameGenerator,
  FilterTargetConfig,
  CompiledCondition,
  buildQuickSearchConditions,
} from '../ag-grid-filtering';

/**
 * Defines how an AG-Grid filter field maps to a SQL column.
 */
export interface FilterTarget {
  /** Field name from AG-Grid filter model */
  field: string;
  /** SQL column name or expression */
  column: string;
  /** Data type for proper filter compilation */
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  /** Table alias if needed (e.g., 'a' for 'a.name') */
  table?: string;
  /** Optional numeric expression for numeric comparisons */
  numericExpression?: string;
  /** Optional text expression for text comparisons (e.g., casting dates) */
  textExpression?: string;
}

/**
 * Options for query execution.
 */
export interface QueryOptions {
  /** AG-Grid filter model */
  filters?: Record<string, any>;
  /** AG-Grid sort model: [{ colId: string, sort: 'asc' | 'desc' }] or { field: string, direction: 'ASC' | 'DESC' } */
  sort?: any[] | { field: string; direction: 'ASC' | 'DESC' };
  /** Pagination options */
  pagination?: { offset: number; limit: number };
  /** Fields to include/expand (for data enrichment) */
  includes?: string[];
  /** Quick search term (searches across configured fields) */
  quickSearch?: string;
  /** Quick search field expressions (SQL expressions to search) */
  quickSearchFields?: string[];
}

/**
 * Result of a query execution.
 */
export interface QueryResult<T> {
  items: T[];
  total: number;
}

/**
 * Builder class for constructing and executing queries with AG-Grid filtering support.
 */
export class QueryBuilder<T extends ObjectLiteral> {
  private qb: SelectQueryBuilder<T>;
  private filterTargets: Map<string, FilterTarget>;
  private baseConditions: Array<{ sql: string; params?: Record<string, any> }> = [];
  private paramGenerator = createParamNameGenerator('qb');

  constructor(
    private readonly repository: Repository<T>,
    filterTargets: FilterTarget[],
    private readonly alias: string = 'e',
  ) {
    this.qb = repository.createQueryBuilder(alias);
    this.filterTargets = new Map(filterTargets.map(t => [t.field, t]));
  }

  /**
   * Add a base condition that's always applied (e.g., status != 'deleted').
   */
  addBaseCondition(sql: string, params?: Record<string, any>): this {
    this.baseConditions.push({ sql, params });
    return this;
  }

  /**
   * Add a left join to the query.
   */
  leftJoin(entity: string, alias: string, condition: string): this {
    this.qb.leftJoin(entity, alias, condition);
    return this;
  }

  /**
   * Add a select expression.
   */
  addSelect(selection: string, selectionAlias?: string): this {
    this.qb.addSelect(selection, selectionAlias);
    return this;
  }

  /**
   * Get the underlying TypeORM query builder for advanced customization.
   */
  getQueryBuilder(): SelectQueryBuilder<T> {
    return this.qb;
  }

  /**
   * Execute the query with the given options.
   */
  async execute(options: QueryOptions = {}): Promise<QueryResult<T>> {
    const { filters, sort, pagination, quickSearch, quickSearchFields } = options;

    // Apply base conditions
    this.applyBaseConditions();

    // Apply filters from AG-Grid model
    if (filters) {
      this.applyFilters(filters);
    }

    // Apply quick search
    if (quickSearch && quickSearchFields && quickSearchFields.length > 0) {
      this.applyQuickSearch(quickSearch, quickSearchFields);
    }

    // Get total count before pagination
    const total = await this.qb.getCount();

    // Apply sorting
    if (sort) {
      this.applySort(sort);
    }

    // Apply pagination
    if (pagination) {
      this.applyPagination(pagination);
    }

    // Execute query
    const items = await this.qb.getMany();

    return { items, total };
  }

  /**
   * Execute the query and return raw results with entities.
   * Useful when you need access to joined data via raw results.
   */
  async executeWithRaw(options: QueryOptions = {}): Promise<{
    items: T[];
    raw: any[];
    total: number;
  }> {
    const { filters, sort, pagination, quickSearch, quickSearchFields } = options;

    // Apply base conditions
    this.applyBaseConditions();

    // Apply filters
    if (filters) {
      this.applyFilters(filters);
    }

    // Apply quick search
    if (quickSearch && quickSearchFields && quickSearchFields.length > 0) {
      this.applyQuickSearch(quickSearch, quickSearchFields);
    }

    // Get total count before pagination
    const total = await this.qb.getCount();

    // Apply sorting
    if (sort) {
      this.applySort(sort);
    }

    // Apply pagination
    if (pagination) {
      this.applyPagination(pagination);
    }

    // Execute query with raw results
    const { raw, entities } = await this.qb.getRawAndEntities();

    return { items: entities, raw, total };
  }

  private applyBaseConditions(): void {
    for (const condition of this.baseConditions) {
      if (condition.params) {
        this.qb.andWhere(condition.sql, condition.params);
      } else {
        this.qb.andWhere(condition.sql);
      }
    }
  }

  private applyFilters(filters: Record<string, any>): void {
    const compiledFilters: CompiledCondition[] = [];

    for (const [field, model] of Object.entries(filters)) {
      const target = this.filterTargets.get(field);
      if (!target) continue;

      // Convert FilterTarget to FilterTargetConfig
      const targetConfig: FilterTargetConfig = {
        expression: target.table ? `${target.table}.${target.column}` : `${this.alias}.${target.column}`,
        dataType: this.mapTypeToDataType(target.type),
        numericExpression: target.numericExpression,
        textExpression: target.textExpression,
      };

      const compiled = compileAgFilterCondition(model, targetConfig, this.paramGenerator);
      if (compiled) {
        compiledFilters.push(compiled);
      }
    }

    // Apply compiled filters
    for (const condition of compiledFilters) {
      this.qb.andWhere(new Brackets(sub => sub.where(condition.sql, condition.params)));
    }
  }

  private applyQuickSearch(search: string, fieldExpressions: string[]): void {
    const conditions = buildQuickSearchConditions(search, fieldExpressions, this.paramGenerator);
    if (conditions.length === 0) return;

    this.qb.andWhere(
      new Brackets(sub => {
        conditions.forEach((cond, idx) => {
          if (idx === 0) {
            sub.where(cond.sql, cond.params);
          } else {
            sub.orWhere(cond.sql, cond.params);
          }
        });
      }),
    );
  }

  private applySort(sort: any[] | { field: string; direction: 'ASC' | 'DESC' }): void {
    // Handle AG-Grid sort model format: [{ colId: string, sort: 'asc' | 'desc' }]
    if (Array.isArray(sort)) {
      for (const sortItem of sort) {
        const field = sortItem.colId || sortItem.field;
        const direction = (sortItem.sort || sortItem.direction || 'ASC').toUpperCase() as 'ASC' | 'DESC';
        this.applySingleSort(field, direction);
      }
    } else {
      // Handle simple sort object: { field: string, direction: 'ASC' | 'DESC' }
      this.applySingleSort(sort.field, sort.direction);
    }
  }

  private applySingleSort(field: string, direction: 'ASC' | 'DESC'): void {
    const target = this.filterTargets.get(field);
    if (target) {
      const column = target.table ? `${target.table}.${target.column}` : `${this.alias}.${target.column}`;
      this.qb.addOrderBy(column, direction);
    } else {
      // Fallback: try to use field directly with alias
      this.qb.addOrderBy(`${this.alias}.${field}`, direction);
    }
  }

  private applyPagination(pagination: { offset: number; limit: number }): void {
    this.qb.skip(pagination.offset).take(pagination.limit);
  }

  private mapTypeToDataType(type: FilterTarget['type']): 'string' | 'number' | 'boolean' {
    switch (type) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'enum':
      case 'string':
      default:
        return 'string';
    }
  }
}

/**
 * Factory for creating QueryBuilder instances.
 */
@Injectable()
export class QueryBuilderFactory {
  /**
   * Create a new QueryBuilder for the given repository and filter targets.
   *
   * @param repository - TypeORM repository
   * @param filterTargets - Array of filter target definitions
   * @param alias - Optional table alias (defaults to 'e')
   * @returns A configured QueryBuilder instance
   *
   * @example
   * ```typescript
   * const qb = this.queryBuilderFactory.create(this.appRepo, [
   *   { field: 'name', column: 'name', type: 'string' },
   *   { field: 'status', column: 'status', type: 'enum' },
   *   { field: 'created_at', column: 'created_at', type: 'date', textExpression: 'CAST(e.created_at AS TEXT)' },
   * ], 'a');
   *
   * qb.addBaseCondition('a.disabled_at IS NULL');
   *
   * const { items, total } = await qb.execute({
   *   filters: { name: { type: 'contains', filter: 'test' } },
   *   sort: { field: 'created_at', direction: 'DESC' },
   *   pagination: { offset: 0, limit: 20 },
   * });
   * ```
   */
  create<T extends ObjectLiteral>(
    repository: Repository<T>,
    filterTargets: FilterTarget[],
    alias: string = 'e',
  ): QueryBuilder<T> {
    return new QueryBuilder(repository, filterTargets, alias);
  }
}
