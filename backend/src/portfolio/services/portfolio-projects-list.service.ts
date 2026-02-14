import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { PortfolioProject } from '../portfolio-project.entity';
import { parsePagination } from '../../common/pagination';
import {
  compileAgFilterCondition,
  createParamNameGenerator,
  FilterTargetConfig,
  CompiledCondition,
  buildQuickSearchConditions,
} from '../../common/ag-grid-filtering';
import { PortfolioProjectsBaseService, ServiceOpts } from './portfolio-projects-base.service';

type InvolvementScope = { involvedUserId?: string; involvedTeamId?: string };

const normalizeScopeValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const parseInvolvementScope = (query: any): InvolvementScope => ({
  involvedUserId: normalizeScopeValue(query?.involvedUserId),
  involvedTeamId: normalizeScopeValue(query?.involvedTeamId),
});

const applyProjectInvolvementScope = (
  qb: SelectQueryBuilder<PortfolioProject>,
  scope: InvolvementScope,
  alias = 'p',
) => {
  const involvedUserId = scope.involvedUserId;
  const involvedTeamId = scope.involvedTeamId;
  if (!involvedUserId && !involvedTeamId) return;

  const userCondition = `(
    ${alias}.business_sponsor_id = :involvedUserId
    OR ${alias}.business_lead_id = :involvedUserId
    OR ${alias}.it_sponsor_id = :involvedUserId
    OR ${alias}.it_lead_id = :involvedUserId
    OR EXISTS (
      SELECT 1
      FROM portfolio_project_team pt
      WHERE pt.project_id = ${alias}.id
        AND pt.user_id = :involvedUserId
    )
  )`;

  const teamUsersSql = `(
    SELECT tmc.user_id
    FROM portfolio_team_member_configs tmc
    WHERE tmc.team_id = :involvedTeamId
  )`;

  const teamCondition = `(
    ${alias}.business_sponsor_id IN ${teamUsersSql}
    OR ${alias}.business_lead_id IN ${teamUsersSql}
    OR ${alias}.it_sponsor_id IN ${teamUsersSql}
    OR ${alias}.it_lead_id IN ${teamUsersSql}
    OR EXISTS (
      SELECT 1
      FROM portfolio_project_team pt
      WHERE pt.project_id = ${alias}.id
        AND pt.user_id IN ${teamUsersSql}
    )
  )`;

  if (involvedUserId && involvedTeamId) {
    qb.andWhere(`(${userCondition} OR ${teamCondition})`, { involvedUserId, involvedTeamId });
    return;
  }

  if (involvedUserId) {
    qb.andWhere(userCondition, { involvedUserId });
    return;
  }

  qb.andWhere(teamCondition, { involvedTeamId });
};

/**
 * Service for listing and filtering portfolio projects.
 */
@Injectable()
export class PortfolioProjectsListService extends PortfolioProjectsBaseService {
  constructor(
    @InjectRepository(PortfolioProject) projectRepo: Repository<PortfolioProject>,
  ) {
    super(projectRepo);
  }

  /**
   * List projects with filtering, sorting, and pagination.
   */
  async list(query: any, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(PortfolioProject);
    const involvementScope = parseInvolvementScope(query);

    const { page, limit, skip, sort, q, filters } = parsePagination(query, {
      field: 'created_at',
      direction: 'DESC',
    });

    const include = new Set(
      (query?.include || '').split(',').map((s: string) => s.trim()).filter(Boolean)
    );

    const fm = filters && typeof filters === 'object' ? filters : undefined;
    const hasStatusFilter = fm && Object.prototype.hasOwnProperty.call(fm, 'status');

    // Define filter targets for AG Grid model -> SQL translation
    type Target = FilterTargetConfig;
    const targets: Record<string, Target> = {
      name: { expression: 'p.name', dataType: 'string' },
      status: { expression: 'p.status', dataType: 'string' },
      origin: { expression: 'p.origin', dataType: 'string' },
      source_id: { expression: 'p.source_id', dataType: 'string' },
      category_id: { expression: 'p.category_id', dataType: 'string' },
      stream_id: { expression: 'p.stream_id', dataType: 'string' },
      company_id: { expression: 'p.company_id', dataType: 'string' },
      department_id: { expression: 'p.department_id', dataType: 'string' },
      priority_score: { expression: 'p.priority_score', dataType: 'number' },
      execution_progress: { expression: 'p.execution_progress', dataType: 'number' },
      planned_start: { expression: 'p.planned_start', textExpression: 'CAST(p.planned_start AS TEXT)', dataType: 'string' },
      planned_end: { expression: 'p.planned_end', textExpression: 'CAST(p.planned_end AS TEXT)', dataType: 'string' },
      created_at: { expression: 'p.created_at', textExpression: 'CAST(p.created_at AS TEXT)', dataType: 'string' },
      // Derived filter targets for joined/computed columns
      source_name: {
        expression: 'p.source_id',
        textExpression: `COALESCE((SELECT t.name FROM portfolio_sources t WHERE t.id = p.source_id), '')`,
        dataType: 'string',
      },
      category_name: {
        expression: 'p.category_id',
        textExpression: `COALESCE((SELECT cat.name FROM portfolio_categories cat WHERE cat.id = p.category_id), '')`,
        dataType: 'string',
      },
      stream_name: {
        expression: 'p.stream_id',
        textExpression: `COALESCE((SELECT s.name FROM portfolio_streams s WHERE s.id = p.stream_id), '')`,
        dataType: 'string',
      },
      company_name: {
        expression: 'p.company_id',
        textExpression: `COALESCE((SELECT c.name FROM companies c WHERE c.id = p.company_id), '')`,
        dataType: 'string',
      },
    };

    // Compile AG Grid filters
    const nextParam = createParamNameGenerator('p');
    const compiledFilters: CompiledCondition[] = [];
    if (fm) {
      for (const [field, model] of Object.entries(fm)) {
        const target = targets[field];
        if (!target) continue;
        const cond = compileAgFilterCondition(model, target, nextParam);
        if (cond) compiledFilters.push(cond);
      }
    }

    // Quick search across all visible grid columns
    const quickSearchExpressions = [
      'p.name',
      'p.status',
      'p.origin',
      `(SELECT t.name FROM portfolio_sources t WHERE t.id = p.source_id)`,
      `(SELECT cat.name FROM portfolio_categories cat WHERE cat.id = p.category_id)`,
      `(SELECT s.name FROM portfolio_streams s WHERE s.id = p.stream_id)`,
      `(SELECT c.name FROM companies c WHERE c.id = p.company_id)`,
    ];
    const quickSearch = q ? buildQuickSearchConditions(q, quickSearchExpressions, nextParam) : [];

    // Build query
    const qb = repo.createQueryBuilder('p');
    applyProjectInvolvementScope(qb, involvementScope, 'p');

    // Apply compiled filter conditions
    compiledFilters.forEach((c) => {
      qb.andWhere(new Brackets((sub) => sub.where(c.sql, c.params)));
    });

    // Apply quick search (OR across searched fields)
    if (quickSearch.length > 0) {
      qb.andWhere(new Brackets((sub) => {
        quickSearch.forEach((c, i) => {
          if (i === 0) sub.where(c.sql, c.params);
          else sub.orWhere(c.sql, c.params);
        });
      }));
    }

    // Default status filter: exclude 'done' unless explicitly filtering
    if (!hasStatusFilter && query?.status !== 'all') {
      qb.andWhere(`p.status <> :excludedStatus`, { excludedStatus: 'done' });
    }

    // Sorting
    const validFields = new Set([
      'name', 'status', 'origin', 'source_id', 'category_id', 'stream_id', 'priority_score',
      'planned_start', 'planned_end', 'execution_progress', 'created_at', 'updated_at',
    ]);
    const sortField = validFields.has(sort.field) ? sort.field : 'created_at';
    // For priority_score, put NULLs last so projects without scores appear at the end
    const nullsOption = sortField === 'priority_score' ? 'NULLS LAST' : undefined;
    qb.orderBy(`p.${sortField}`, sort.direction, nullsOption);

    // Count
    const total = await qb.getCount();

    // Page
    qb.skip(skip).take(limit);
    const items = await qb.getMany();

    // Enrich with related data if requested
    if (items.length > 0 && (include.has('company') || include.has('source_requests') || include.has('classification'))) {
      await this.enrichItems(items, include as Set<string>, mg);
    }

    return { items, total, page, limit };
  }

  /**
   * Enrich list items with related data.
   */
  private async enrichItems(
    items: PortfolioProject[],
    include: Set<string>,
    mg: EntityManager,
  ): Promise<void> {
    const ids = items.map((i) => i.id);
    if (ids.length === 0) return;

    // Load company names
    if (include.has('company')) {
      const companyIds = [...new Set(items.map((i) => i.company_id).filter(Boolean))] as string[];
      if (companyIds.length > 0) {
        const companies = await mg.query(
          `SELECT id, name FROM companies WHERE id = ANY($1)`,
          [companyIds]
        );
        const map = Object.fromEntries(companies.map((c: any) => [c.id, c]));
        items.forEach((i: any) => {
          i.company = i.company_id ? map[i.company_id] : null;
        });
      }
    }

    // Load source requests
    if (include.has('source_requests')) {
      const links = await mg.query(
        `SELECT rp.project_id, r.id, r.name, r.status
         FROM portfolio_request_projects rp
         JOIN portfolio_requests r ON r.id = rp.request_id
         WHERE rp.project_id = ANY($1)`,
        [ids]
      );
      const map: Record<string, any[]> = {};
      links.forEach((l: any) => {
        if (!map[l.project_id]) map[l.project_id] = [];
        map[l.project_id].push({ id: l.id, name: l.name, status: l.status });
      });
      items.forEach((i: any) => {
        i.source_requests = map[i.id] || [];
      });
    }

    // Load classification names (source, category, stream)
    if (include.has('classification')) {
      // Load sources
      const sourceIds = [...new Set(items.map((i) => i.source_id).filter(Boolean))] as string[];
      if (sourceIds.length > 0) {
        const sources = await mg.query(
          `SELECT id, name FROM portfolio_sources WHERE id = ANY($1)`,
          [sourceIds]
        );
        const sourceMap = Object.fromEntries(sources.map((t: any) => [t.id, t.name]));
        items.forEach((i: any) => {
          i.source_name = i.source_id ? sourceMap[i.source_id] || null : null;
        });
      }

      // Load categories
      const categoryIds = [...new Set(items.map((i) => i.category_id).filter(Boolean))] as string[];
      if (categoryIds.length > 0) {
        const categories = await mg.query(
          `SELECT id, name FROM portfolio_categories WHERE id = ANY($1)`,
          [categoryIds]
        );
        const categoryMap = Object.fromEntries(categories.map((c: any) => [c.id, c.name]));
        items.forEach((i: any) => {
          i.category_name = i.category_id ? categoryMap[i.category_id] || null : null;
        });
      }

      // Load streams
      const streamIds = [...new Set(items.map((i) => i.stream_id).filter(Boolean))] as string[];
      if (streamIds.length > 0) {
        const streams = await mg.query(
          `SELECT id, name FROM portfolio_streams WHERE id = ANY($1)`,
          [streamIds]
        );
        const streamMap = Object.fromEntries(streams.map((s: any) => [s.id, s.name]));
        items.forEach((i: any) => {
          i.stream_name = i.stream_id ? streamMap[i.stream_id] || null : null;
        });
      }
    }
  }

  /**
   * Return ordered list of matching project IDs for navigation.
   */
  async listIds(query: any, opts?: ServiceOpts): Promise<{ ids: string[] }> {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(PortfolioProject);
    const involvementScope = parseInvolvementScope(query);

    const { sort, q, filters } = parsePagination(query, {
      field: 'created_at',
      direction: 'DESC',
    });

    const fm = filters && typeof filters === 'object' ? filters : undefined;
    const hasStatusFilter = fm && Object.prototype.hasOwnProperty.call(fm, 'status');

    // Define filter targets for AG Grid model -> SQL translation
    type Target = FilterTargetConfig;
    const targets: Record<string, Target> = {
      name: { expression: 'p.name', dataType: 'string' },
      status: { expression: 'p.status', dataType: 'string' },
      origin: { expression: 'p.origin', dataType: 'string' },
      source_id: { expression: 'p.source_id', dataType: 'string' },
      category_id: { expression: 'p.category_id', dataType: 'string' },
      stream_id: { expression: 'p.stream_id', dataType: 'string' },
      company_id: { expression: 'p.company_id', dataType: 'string' },
      department_id: { expression: 'p.department_id', dataType: 'string' },
      priority_score: { expression: 'p.priority_score', dataType: 'number' },
      execution_progress: { expression: 'p.execution_progress', dataType: 'number' },
      planned_start: { expression: 'p.planned_start', textExpression: 'CAST(p.planned_start AS TEXT)', dataType: 'string' },
      planned_end: { expression: 'p.planned_end', textExpression: 'CAST(p.planned_end AS TEXT)', dataType: 'string' },
      created_at: { expression: 'p.created_at', textExpression: 'CAST(p.created_at AS TEXT)', dataType: 'string' },
      // Derived filter targets for joined/computed columns (used by grid filters)
      source_name: {
        expression: 'p.source_id',
        textExpression: `COALESCE((SELECT t.name FROM portfolio_sources t WHERE t.id = p.source_id), '')`,
        dataType: 'string',
      },
      category_name: {
        expression: 'p.category_id',
        textExpression: `COALESCE((SELECT cat.name FROM portfolio_categories cat WHERE cat.id = p.category_id), '')`,
        dataType: 'string',
      },
      stream_name: {
        expression: 'p.stream_id',
        textExpression: `COALESCE((SELECT s.name FROM portfolio_streams s WHERE s.id = p.stream_id), '')`,
        dataType: 'string',
      },
      company_name: {
        expression: 'p.company_id',
        textExpression: `COALESCE((SELECT c.name FROM companies c WHERE c.id = p.company_id), '')`,
        dataType: 'string',
      },
    };

    // Compile AG Grid filters
    const nextParam = createParamNameGenerator('p');
    const compiledFilters: CompiledCondition[] = [];
    if (fm) {
      for (const [field, model] of Object.entries(fm)) {
        const target = targets[field];
        if (!target) continue;
        const cond = compileAgFilterCondition(model, target, nextParam);
        if (cond) compiledFilters.push(cond);
      }
    }

    // Quick search across all visible grid columns
    const quickSearchExpressions = [
      'p.name',
      'p.status',
      'p.origin',
    ];
    const quickSearch = q ? buildQuickSearchConditions(q, quickSearchExpressions, nextParam) : [];

    // Build query
    const qb = repo.createQueryBuilder('p').select('p.id');
    applyProjectInvolvementScope(qb, involvementScope, 'p');

    // Apply compiled filter conditions
    compiledFilters.forEach((c) => {
      qb.andWhere(new Brackets((sub) => sub.where(c.sql, c.params)));
    });

    // Apply quick search (OR across searched fields)
    if (quickSearch.length > 0) {
      qb.andWhere(new Brackets((sub) => {
        quickSearch.forEach((c, i) => {
          if (i === 0) sub.where(c.sql, c.params);
          else sub.orWhere(c.sql, c.params);
        });
      }));
    }

    // Default status filter: exclude 'done' unless explicitly filtering
    if (!hasStatusFilter && query?.status !== 'all') {
      qb.andWhere(`p.status <> :excludedStatus`, { excludedStatus: 'done' });
    }

    // Sorting
    const validFields = new Set([
      'name', 'status', 'origin', 'source_id', 'category_id', 'stream_id', 'priority_score',
      'planned_start', 'planned_end', 'execution_progress', 'created_at', 'updated_at',
    ]);
    const sortField = validFields.has(sort.field) ? sort.field : 'created_at';
    const nullsOption = sortField === 'priority_score' ? 'NULLS LAST' : undefined;
    qb.orderBy(`p.${sortField}`, sort.direction, nullsOption);

    const rows = await qb.getRawMany();
    const ids = rows.map((r) => r.p_id);

    return { ids };
  }

  /**
   * Return scoped filter values for checkbox set filters.
   */
  async listFilterValues(query: any, opts?: ServiceOpts): Promise<Record<string, Array<string | null>>> {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(PortfolioProject);
    const involvementScope = parseInvolvementScope(query);
    const { q, filters } = parsePagination(query, {
      field: 'created_at',
      direction: 'DESC',
    });
    const fm = filters && typeof filters === 'object' ? filters : undefined;

    const rawFields = String(query?.fields || query?.field || '').split(',').map((f) => f.trim()).filter(Boolean);
    const allowed = new Set(['status', 'origin', 'source_name', 'category_name', 'stream_name', 'company_name']);
    const fields = rawFields.filter((field) => allowed.has(field));
    if (fields.length === 0) return {};

    const results: Record<string, Array<string | null>> = {};

    type Target = FilterTargetConfig;
    const targets: Record<string, Target> = {
      name: { expression: 'p.name', dataType: 'string' },
      status: { expression: 'p.status', dataType: 'string' },
      origin: { expression: 'p.origin', dataType: 'string' },
      source_id: { expression: 'p.source_id', dataType: 'string' },
      category_id: { expression: 'p.category_id', dataType: 'string' },
      stream_id: { expression: 'p.stream_id', dataType: 'string' },
      company_id: { expression: 'p.company_id', dataType: 'string' },
      department_id: { expression: 'p.department_id', dataType: 'string' },
      priority_score: { expression: 'p.priority_score', dataType: 'number' },
      execution_progress: { expression: 'p.execution_progress', dataType: 'number' },
      planned_start: { expression: 'p.planned_start', textExpression: 'CAST(p.planned_start AS TEXT)', dataType: 'string' },
      planned_end: { expression: 'p.planned_end', textExpression: 'CAST(p.planned_end AS TEXT)', dataType: 'string' },
      created_at: { expression: 'p.created_at', textExpression: 'CAST(p.created_at AS TEXT)', dataType: 'string' },
      source_name: {
        expression: 'p.source_id',
        textExpression: `COALESCE((SELECT t.name FROM portfolio_sources t WHERE t.id = p.source_id), '')`,
        dataType: 'string',
      },
      category_name: {
        expression: 'p.category_id',
        textExpression: `COALESCE((SELECT cat.name FROM portfolio_categories cat WHERE cat.id = p.category_id), '')`,
        dataType: 'string',
      },
      stream_name: {
        expression: 'p.stream_id',
        textExpression: `COALESCE((SELECT s.name FROM portfolio_streams s WHERE s.id = p.stream_id), '')`,
        dataType: 'string',
      },
      company_name: {
        expression: 'p.company_id',
        textExpression: `COALESCE((SELECT c.name FROM companies c WHERE c.id = p.company_id), '')`,
        dataType: 'string',
      },
    };

    const valueExpressions: Record<string, string> = {
      status: 'p.status',
      origin: 'p.origin',
      source_name: `(SELECT t.name FROM portfolio_sources t WHERE t.id = p.source_id)`,
      category_name: `(SELECT cat.name FROM portfolio_categories cat WHERE cat.id = p.category_id)`,
      stream_name: `(SELECT s.name FROM portfolio_streams s WHERE s.id = p.stream_id)`,
      company_name: `(SELECT c.name FROM companies c WHERE c.id = p.company_id)`,
    };

    const quickSearchExpressions = [
      'p.name',
      'p.status',
      'p.origin',
      `(SELECT t.name FROM portfolio_sources t WHERE t.id = p.source_id)`,
      `(SELECT cat.name FROM portfolio_categories cat WHERE cat.id = p.category_id)`,
      `(SELECT s.name FROM portfolio_streams s WHERE s.id = p.stream_id)`,
      `(SELECT c.name FROM companies c WHERE c.id = p.company_id)`,
    ];

    for (const field of fields) {
      const filtersForField = fm ? { ...fm } : {};
      if (filtersForField && Object.prototype.hasOwnProperty.call(filtersForField, field)) {
        delete filtersForField[field];
      }
      const hasStatusFilter = !!(filtersForField && Object.prototype.hasOwnProperty.call(filtersForField, 'status'));

      const nextParam = createParamNameGenerator('p');
      const compiledFilters: CompiledCondition[] = [];
      if (filtersForField) {
        for (const [filterField, model] of Object.entries(filtersForField)) {
          const target = targets[filterField];
          if (!target) continue;
          const cond = compileAgFilterCondition(model, target, nextParam);
          if (cond) compiledFilters.push(cond);
        }
      }

      const quickSearch = q ? buildQuickSearchConditions(q, quickSearchExpressions, nextParam) : [];

      const qb = repo.createQueryBuilder('p');
      applyProjectInvolvementScope(qb, involvementScope, 'p');
      compiledFilters.forEach((c) => {
        qb.andWhere(new Brackets((sub) => sub.where(c.sql, c.params)));
      });

      if (quickSearch.length > 0) {
        qb.andWhere(new Brackets((sub) => {
          quickSearch.forEach((c, i) => {
            if (i === 0) sub.where(c.sql, c.params);
            else sub.orWhere(c.sql, c.params);
          });
        }));
      }

      if (!hasStatusFilter && query?.status !== 'all' && field !== 'status') {
        qb.andWhere(`p.status <> :excludedStatus`, { excludedStatus: 'done' });
      }

      const expr = valueExpressions[field];
      if (!expr) {
        results[field] = [];
        continue;
      }
      qb.select(`DISTINCT ${expr}`, 'value');
      qb.orderBy('value', 'ASC');
      const rows = await qb.getRawMany();
      results[field] = rows.map((row: any) => row.value);
    }

    return results;
  }

  /**
   * Get timeline/Gantt data for projects.
   */
  async getTimelineData(
    query: { months?: number; category?: string; status?: string[] },
    opts?: ServiceOpts,
  ) {
    const mg = this.getManager(opts);
    const monthsBack = query.months || 3;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Note: RLS via app_current_tenant() automatically filters by tenant.
    let sql = `
      SELECT p.id, p.name, p.status, p.category_id,
             p.planned_start, p.planned_end, p.actual_start, p.actual_end,
             p.execution_progress
      FROM portfolio_projects p
      WHERE p.status NOT IN ('cancelled')
      AND (
        (p.planned_start IS NOT NULL AND p.planned_end IS NOT NULL)
        OR p.actual_end IS NOT NULL
      )
      AND (
        p.planned_end >= $1 OR p.actual_end >= $1
      )
    `;
    const params: any[] = [startDate];

    if (query.category) {
      params.push(query.category);
      sql += ` AND p.category_id = $${params.length}`;
    }

    if (query.status?.length) {
      params.push(query.status);
      sql += ` AND p.status = ANY($${params.length})`;
    }

    sql += ` ORDER BY COALESCE(p.planned_start, p.actual_start) ASC`;

    const projects = await mg.query(sql, params);
    const projectIds = projects.map((p: any) => p.id);

    // Fetch dependencies between projects in the timeline
    const dependencies = projectIds.length > 0
      ? await mg.query(
          `SELECT id, project_id, depends_on_project_id, dependency_type
           FROM portfolio_project_dependencies
           WHERE project_id = ANY($1)
           AND depends_on_project_id = ANY($1)`,
          [projectIds],
        )
      : [];

    // Fetch milestones for projects in the timeline
    const milestones = projectIds.length > 0
      ? await mg.query(
          `SELECT m.id, m.project_id, m.name, m.target_date, m.status, p.name as project_name
           FROM portfolio_project_milestones m
           JOIN portfolio_projects p ON p.id = m.project_id
           WHERE m.project_id = ANY($1)
           AND m.target_date IS NOT NULL
           AND m.target_date >= $2
           ORDER BY m.target_date ASC`,
          [projectIds, startDate],
        )
      : [];

    return {
      projects,
      dependencies,
      milestones,
      viewStart: startDate.toISOString().split('T')[0],
    };
  }
}
