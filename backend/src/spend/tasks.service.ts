import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';

export interface TaskListItem {
  id: string;
  tenant_id: string;
  item_number: number;
  title: string | null;
  description: string;
  status: string;
  due_date: string | null;
  start_date: string | null;
  created_at: Date;
  updated_at: Date;
  assignee_user_id: string | null;
  assignee_name: string | null;
  related_object_type: string | null;
  related_object_id: string | null;
  related_object_name: string | null;
  // Task type (FK to portfolio_task_types)
  task_type_id: string | null;
  task_type_name: string | null;
  // Project-specific fields
  phase_id: string | null;
  phase_name: string | null;
  priority_level: string;
  priority_score: number;
  labels: string[];
  // Classification fields (stored directly on the task)
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  company_id: string | null;
  company_name: string | null;
  creator_id: string | null;
  creator_name: string | null;
  owner_ids: string[];
  viewer_ids: string[];
  converted_request_id?: string | null;
  converted_request_item_number?: number | null;
}

function parsePagination(query: any) {
  const page = parseInt(query.page as string, 10) || 1;
  const limit = parseInt(query.limit as string, 10) || 50;
  const skip = (page - 1) * limit;
  const sortRaw = (query.sort as string) || 'created_at:DESC';
  const [field, direction] = sortRaw.split(':');
  const sort = { field: field || 'created_at', direction: (direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC' };
  const q = (query.q as string) || '';
  let filters: AgFilterModel = {};
  if (query.filters) {
    if (typeof query.filters === 'string') {
      try {
        filters = JSON.parse(query.filters);
      } catch {
        filters = {};
      }
    } else if (typeof query.filters === 'object') {
      filters = query.filters;
    }
  }
  return { page, limit, skip, sort, q, filters };
}

type AgFilterModel = Record<string, any>;

function isSetFilter(model: any): model is { filterType: 'set'; values: any[] } {
  return !!model && model.filterType === 'set' && Array.isArray(model.values);
}

function buildWhereConditions(query: any, rawFilters: any, q: string, skipField?: string, tenantId?: string) {
  let whereConditions = '1=1';
  const params: any[] = [];
  const filters: AgFilterModel = rawFilters && typeof rawFilters === 'object' ? rawFilters : {};

  const shouldSkip = (field: string) => field === skipField;
  const normalizedTenantId = String(tenantId || '').trim();
  let tenantParamRef: string | null = null;

  if (normalizedTenantId) {
    params.push(normalizedTenantId);
    tenantParamRef = `$${params.length}`;
    whereConditions += ` AND t.tenant_id = ${tenantParamRef}`;
  }

  const applySetFilter = (model: any, expression: string) => {
    if (!isSetFilter(model)) return false;
    if (model.values.length === 0) {
      whereConditions += ' AND 1=0';
      return true;
    }
    const nonNullValues = model.values.filter((value: any) => value !== null && value !== undefined);
    const hasNull = model.values.some((value: any) => value === null || value === undefined);
    const clauses: string[] = [];
    if (nonNullValues.length > 0) {
      const placeholders = nonNullValues.map((value: any) => {
        params.push(value);
        return `$${params.length}`;
      });
      clauses.push(`${expression} IN (${placeholders.join(', ')})`);
    }
    if (hasNull) clauses.push(`${expression} IS NULL`);
    if (clauses.length > 0) {
      whereConditions += ` AND (${clauses.join(' OR ')})`;
    }
    return true;
  };

  // Apply scope filters (assigneeUserId or teamId)
  if (query.assigneeUserId) {
    params.push(query.assigneeUserId);
    whereConditions += ` AND t.assignee_user_id = $${params.length}`;
  }

  if (query.teamId) {
    params.push(query.teamId);
    whereConditions += ` AND t.assignee_user_id IN (
      SELECT user_id FROM portfolio_team_member_configs WHERE team_id = $${params.length}${
        tenantParamRef ? ` AND tenant_id = ${tenantParamRef}` : ''
      }
    )`;
  }

  // Apply filters from AG Grid
  if (!shouldSkip('status') && filters.status) {
    if (!applySetFilter(filters.status, 't.status') && filters.status?.filter) {
      const filterType = filters.status.type || 'contains';
      if (filterType === 'equals') {
        params.push(filters.status.filter);
        whereConditions += ` AND t.status = $${params.length}`;
      } else if (filterType === 'notEqual') {
        params.push(filters.status.filter);
        whereConditions += ` AND t.status != $${params.length}`;
      } else if (filterType === 'notContains') {
        params.push(`%${filters.status.filter}%`);
        whereConditions += ` AND t.status NOT ILIKE $${params.length}`;
      } else {
        // contains (default)
        params.push(`%${filters.status.filter}%`);
        whereConditions += ` AND t.status ILIKE $${params.length}`;
      }
    }
  }

  if (!shouldSkip('title') && filters.title?.filter) {
    params.push(`%${filters.title.filter}%`);
    whereConditions += ` AND t.title ILIKE $${params.length}`;
  }

  if (!shouldSkip('related_object_name') && filters.related_object_name?.filter) {
    params.push(`%${filters.related_object_name.filter}%`);
    whereConditions += ` AND (
      (t.related_object_type = 'spend_item' AND si.product_name ILIKE $${params.length}) OR
      (t.related_object_type = 'contract' AND c.name ILIKE $${params.length}) OR
      (t.related_object_type = 'project' AND pp.name ILIKE $${params.length})
    )`;
  }

  if (!shouldSkip('task_type_name') && filters.task_type_name) {
    if (!applySetFilter(filters.task_type_name, 'tt.name') && filters.task_type_name?.filter) {
      const filterType = filters.task_type_name.type || 'contains';
      if (filterType === 'equals') {
        params.push(filters.task_type_name.filter);
        whereConditions += ` AND tt.name = $${params.length}`;
      } else if (filterType === 'notEqual') {
        params.push(filters.task_type_name.filter);
        whereConditions += ` AND tt.name != $${params.length}`;
      } else if (filterType === 'notContains') {
        params.push(`%${filters.task_type_name.filter}%`);
        whereConditions += ` AND tt.name NOT ILIKE $${params.length}`;
      } else {
        params.push(`%${filters.task_type_name.filter}%`);
        whereConditions += ` AND tt.name ILIKE $${params.length}`;
      }
    }
  }

  if (!shouldSkip('related_object_type') && filters.related_object_type) {
    if (!applySetFilter(filters.related_object_type, 't.related_object_type') && filters.related_object_type?.filter) {
      const filterType = filters.related_object_type.type || 'contains';
      if (filterType === 'equals') {
        params.push(filters.related_object_type.filter);
        whereConditions += ` AND t.related_object_type = $${params.length}`;
      } else if (filterType === 'notEqual') {
        params.push(filters.related_object_type.filter);
        whereConditions += ` AND t.related_object_type != $${params.length}`;
      } else if (filterType === 'notContains') {
        params.push(`%${filters.related_object_type.filter}%`);
        whereConditions += ` AND t.related_object_type NOT ILIKE $${params.length}`;
      } else {
        params.push(`%${filters.related_object_type.filter}%`);
        whereConditions += ` AND t.related_object_type ILIKE $${params.length}`;
      }
    }
  }

  if (!shouldSkip('phase_name') && filters.phase_name?.filter) {
    params.push(`%${filters.phase_name.filter}%`);
    whereConditions += ` AND phase.name ILIKE $${params.length}`;
  }

  if (!shouldSkip('source_name') && filters.source_name) {
    if (!applySetFilter(filters.source_name, 'ps.name') && filters.source_name?.filter) {
      params.push(`%${filters.source_name.filter}%`);
      whereConditions += ` AND ps.name ILIKE $${params.length}`;
    }
  }

  if (!shouldSkip('category_name') && filters.category_name) {
    if (!applySetFilter(filters.category_name, 'pc.name') && filters.category_name?.filter) {
      params.push(`%${filters.category_name.filter}%`);
      whereConditions += ` AND pc.name ILIKE $${params.length}`;
    }
  }

  if (!shouldSkip('stream_name') && filters.stream_name) {
    if (!applySetFilter(filters.stream_name, 'pst.name') && filters.stream_name?.filter) {
      params.push(`%${filters.stream_name.filter}%`);
      whereConditions += ` AND pst.name ILIKE $${params.length}`;
    }
  }

  if (!shouldSkip('company_name') && filters.company_name) {
    if (!applySetFilter(filters.company_name, 'comp.name') && filters.company_name?.filter) {
      params.push(`%${filters.company_name.filter}%`);
      whereConditions += ` AND comp.name ILIKE $${params.length}`;
    }
  }

  if (!shouldSkip('priority_level') && filters.priority_level) {
    if (!applySetFilter(filters.priority_level, 't.priority_level') && filters.priority_level?.filter) {
      const filterType = filters.priority_level.type || 'equals';
      if (filterType === 'equals') {
        params.push(filters.priority_level.filter);
        whereConditions += ` AND t.priority_level = $${params.length}`;
      } else {
        params.push(`%${filters.priority_level.filter}%`);
        whereConditions += ` AND t.priority_level ILIKE $${params.length}`;
      }
    }
  }

  if (!shouldSkip('assignee_name') && filters.assignee_name) {
    if (!applySetFilter(filters.assignee_name, `COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email)`) && filters.assignee_name?.filter) {
      params.push(`%${filters.assignee_name.filter}%`);
      whereConditions += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
  }

  if (!shouldSkip('creator_name') && filters.creator_name) {
    if (!applySetFilter(filters.creator_name, `COALESCE(NULLIF(TRIM(CONCAT(uc.first_name, ' ', uc.last_name)), ''), uc.email)`) && filters.creator_name?.filter) {
      params.push(`%${filters.creator_name.filter}%`);
      whereConditions += ` AND (uc.first_name ILIKE $${params.length} OR uc.last_name ILIKE $${params.length} OR uc.email ILIKE $${params.length})`;
    }
  }

  if (!shouldSkip('description') && filters.description?.filter) {
    params.push(`%${filters.description.filter}%`);
    whereConditions += ` AND t.description ILIKE $${params.length}`;
  }

  // Apply quick search across multiple fields
  if (q) {
    // Check if query matches item ref pattern (T-123 or plain number)
    const refMatch = q.match(/^(?:T-)?(\d+)$/i);
    if (refMatch) {
      params.push(parseInt(refMatch[1], 10));
      params.push(`%${q}%`);
      whereConditions += ` AND (
        t.item_number = $${params.length - 1} OR
        t.title ILIKE $${params.length} OR
        t.description ILIKE $${params.length} OR
        si.product_name ILIKE $${params.length} OR
        c.name ILIKE $${params.length} OR
        pp.name ILIKE $${params.length} OR
        u.first_name ILIKE $${params.length} OR
        u.last_name ILIKE $${params.length} OR
        u.email ILIKE $${params.length} OR
        uc.first_name ILIKE $${params.length} OR
        uc.last_name ILIKE $${params.length} OR
        uc.email ILIKE $${params.length}
      )`;
    } else {
      params.push(`%${q}%`);
      whereConditions += ` AND (
        t.title ILIKE $${params.length} OR
        t.description ILIKE $${params.length} OR
        si.product_name ILIKE $${params.length} OR
        c.name ILIKE $${params.length} OR
        pp.name ILIKE $${params.length} OR
        u.first_name ILIKE $${params.length} OR
        u.last_name ILIKE $${params.length} OR
        u.email ILIKE $${params.length} OR
        uc.first_name ILIKE $${params.length} OR
        uc.last_name ILIKE $${params.length} OR
        uc.email ILIKE $${params.length}
      )`;
    }
  }

  return { whereConditions, params };
}

const TASK_FILTER_VALUE_FIELDS: Record<string, string> = {
  assignee_name: `COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email)`,
  creator_name: `COALESCE(NULLIF(TRIM(CONCAT(uc.first_name, ' ', uc.last_name)), ''), uc.email)`,
  task_type_name: 'tt.name',
  status: 't.status',
  priority_level: 't.priority_level',
  related_object_type: 't.related_object_type',
  source_name: 'ps.name',
  category_name: 'pc.name',
  stream_name: 'pst.name',
  company_name: 'comp.name',
};

@Injectable()
export class TasksService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(query: any, opts?: { manager?: EntityManager; tenantId?: string }) {
    return this.listAllTasks(query, opts);
  }

  async listAllTasks(query: any, opts?: { manager?: EntityManager; tenantId?: string }): Promise<{ items: TaskListItem[]; total: number; page: number; limit: number }> {
    const manager = opts?.manager ?? this.dataSource.manager;
    const tenantId = String(opts?.tenantId || '').trim();
    const { page, limit, skip, sort, q, filters } = parsePagination(query);
    const { whereConditions, params } = buildWhereConditions(query, filters, q, undefined, tenantId);

    // Count total
    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_user_id = u.id AND u.tenant_id = t.tenant_id
      LEFT JOIN users uc ON t.creator_id = uc.id AND uc.tenant_id = t.tenant_id
      LEFT JOIN spend_items si ON (t.related_object_type = 'spend_item' AND t.related_object_id = si.id)
      LEFT JOIN contracts c ON (t.related_object_type = 'contract' AND t.related_object_id = c.id)
      LEFT JOIN capex_items ci ON (t.related_object_type = 'capex_item' AND t.related_object_id = ci.id)
      LEFT JOIN portfolio_projects pp ON (t.related_object_type = 'project' AND t.related_object_id = pp.id)
      LEFT JOIN portfolio_requests pr_origin ON pr_origin.origin_task_id = t.id
      LEFT JOIN portfolio_project_phases phase ON t.phase_id = phase.id
      LEFT JOIN portfolio_task_types tt ON t.task_type_id = tt.id
      -- Classification JOINs (COALESCE: task value wins, falls back to project)
      LEFT JOIN portfolio_sources ps ON COALESCE(t.source_id, pp.source_id) = ps.id
      LEFT JOIN portfolio_categories pc ON COALESCE(t.category_id, pp.category_id) = pc.id
      LEFT JOIN portfolio_streams pst ON COALESCE(t.stream_id, pp.stream_id) = pst.id
      LEFT JOIN companies comp ON COALESCE(t.company_id, pp.company_id) = comp.id
      WHERE ${whereConditions}
    `;
    const countResult = await manager.query(countQuery, params);
    const total = countResult[0]?.count || 0;

    // Map sort field
    const sortFieldMap: Record<string, string> = {
      title: 't.title',
      description: 't.description',
      status: 't.status',
      created_at: 't.created_at',
      updated_at: 't.updated_at',
      due_date: 't.due_date',
      start_date: 't.start_date',
      assignee_name: 'assignee_name',
      creator_name: 'creator_name',
      related_object_name: 'related_object_name',
      related_object_type: 't.related_object_type',
      task_type_name: 'task_type_name',
      phase_name: 'phase_name',
      priority_level: 't.priority_level',
      priority_score: 'priority_score',
      source_name: 'source_name',
      category_name: 'category_name',
      stream_name: 'stream_name',
      company_name: 'company_name',
    };
    const sortField = sortFieldMap[sort.field] || 't.created_at';

    // Fetch paginated data
    const dataQuery = `
      SELECT
        t.id,
        t.tenant_id,
        t.item_number,
        t.title,
        t.description,
        t.status,
        t.due_date,
        t.start_date,
        t.created_at,
        t.updated_at,
        t.assignee_user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as assignee_name,
        COALESCE(uc.first_name || ' ' || uc.last_name, uc.email) as creator_name,
        t.related_object_type,
        t.related_object_id,
        CASE
          WHEN t.related_object_type IS NULL THEN NULL
          WHEN t.related_object_type = 'spend_item' THEN si.product_name
          WHEN t.related_object_type = 'contract' THEN c.name
          WHEN t.related_object_type = 'capex_item' THEN ci.description
          WHEN t.related_object_type = 'project' THEN pp.name
          ELSE ''
        END as related_object_name,
        t.task_type_id,
        tt.name as task_type_name,
        t.phase_id,
        phase.name as phase_name,
        t.priority_level,
        CASE
          WHEN t.related_object_type = 'project' AND pp.priority_score IS NOT NULL THEN
            ROUND(LEAST(GREATEST(
              pp.priority_score +
              CASE t.priority_level
                WHEN 'blocker' THEN 10
                WHEN 'high' THEN 5
                WHEN 'normal' THEN 0
                WHEN 'low' THEN -5
                WHEN 'optional' THEN -10
                ELSE 0
              END, 0), 100))
          ELSE
            CASE t.priority_level
              WHEN 'blocker' THEN 110
              WHEN 'high' THEN 90
              WHEN 'normal' THEN 70
              WHEN 'low' THEN 50
              WHEN 'optional' THEN 30
              ELSE 70
            END
        END as priority_score,
        t.labels,
        -- Classification (task value wins, falls back to project)
        COALESCE(t.source_id, pp.source_id) as source_id,
        COALESCE(t.category_id, pp.category_id) as category_id,
        COALESCE(t.stream_id, pp.stream_id) as stream_id,
        COALESCE(t.company_id, pp.company_id) as company_id,
        -- Resolved classification names
        ps.name as source_name,
        pc.name as category_name,
        pst.name as stream_name,
        comp.name as company_name,
        t.creator_id,
        t.owner_ids,
        t.viewer_ids,
        pr_origin.id as converted_request_id,
        pr_origin.item_number as converted_request_item_number
      FROM tasks t
      LEFT JOIN users u ON t.assignee_user_id = u.id AND u.tenant_id = t.tenant_id
      LEFT JOIN users uc ON t.creator_id = uc.id AND uc.tenant_id = t.tenant_id
      LEFT JOIN spend_items si ON (t.related_object_type = 'spend_item' AND t.related_object_id = si.id)
      LEFT JOIN contracts c ON (t.related_object_type = 'contract' AND t.related_object_id = c.id)
      LEFT JOIN capex_items ci ON (t.related_object_type = 'capex_item' AND t.related_object_id = ci.id)
      LEFT JOIN portfolio_projects pp ON (t.related_object_type = 'project' AND t.related_object_id = pp.id)
      LEFT JOIN portfolio_requests pr_origin ON pr_origin.origin_task_id = t.id
      LEFT JOIN portfolio_project_phases phase ON t.phase_id = phase.id
      LEFT JOIN portfolio_task_types tt ON t.task_type_id = tt.id
      -- Classification JOINs (COALESCE: task value wins, falls back to project)
      LEFT JOIN portfolio_sources ps ON COALESCE(t.source_id, pp.source_id) = ps.id
      LEFT JOIN portfolio_categories pc ON COALESCE(t.category_id, pp.category_id) = pc.id
      LEFT JOIN portfolio_streams pst ON COALESCE(t.stream_id, pp.stream_id) = pst.id
      LEFT JOIN companies comp ON COALESCE(t.company_id, pp.company_id) = comp.id
      WHERE ${whereConditions}
      ORDER BY ${sortField} ${sort.direction}
      LIMIT ${limit} OFFSET ${skip}
    `;

    const items = await manager.query(dataQuery, params);

    return { items, total, page, limit };
  }

  async listIds(query: any, opts?: { manager?: EntityManager; tenantId?: string }): Promise<{ ids: string[]; total: number }> {
    const manager = opts?.manager ?? this.dataSource.manager;
    const tenantId = String(opts?.tenantId || '').trim();
    const { sort, q, filters } = parsePagination({ ...query, page: 1, limit: query?.limit ?? 10000 });
    const { whereConditions, params } = buildWhereConditions(query, filters, q, undefined, tenantId);

    const sortFieldMap: Record<string, string> = {
      title: 't.title',
      description: 't.description',
      status: 't.status',
      created_at: 't.created_at',
      updated_at: 't.updated_at',
      due_date: 't.due_date',
      start_date: 't.start_date',
      assignee_name: 'assignee_name',
      creator_name: 'creator_name',
      related_object_name: 'related_object_name',
      related_object_type: 't.related_object_type',
      task_type_name: 'tt.name',
      phase_name: 'phase_name',
      priority_level: 't.priority_level',
      priority_score: 'priority_score',
      source_name: 'ps.name',
      category_name: 'pc.name',
      stream_name: 'pst.name',
      company_name: 'comp.name',
    };
    const sortField = sortFieldMap[sort.field] || 't.created_at';

    const idsQuery = `
      SELECT t.id,
        CASE
          WHEN t.related_object_type = 'project' AND pp.priority_score IS NOT NULL THEN
            ROUND(LEAST(GREATEST(
              pp.priority_score +
              CASE t.priority_level
                WHEN 'blocker' THEN 10
                WHEN 'high' THEN 5
                WHEN 'normal' THEN 0
                WHEN 'low' THEN -5
                WHEN 'optional' THEN -10
                ELSE 0
              END, 0), 100))
          ELSE
            CASE t.priority_level
              WHEN 'blocker' THEN 110
              WHEN 'high' THEN 90
              WHEN 'normal' THEN 70
              WHEN 'low' THEN 50
              WHEN 'optional' THEN 30
              ELSE 70
            END
        END as priority_score
      FROM tasks t
      LEFT JOIN users u ON t.assignee_user_id = u.id AND u.tenant_id = t.tenant_id
      LEFT JOIN users uc ON t.creator_id = uc.id AND uc.tenant_id = t.tenant_id
      LEFT JOIN spend_items si ON (t.related_object_type = 'spend_item' AND t.related_object_id = si.id)
      LEFT JOIN contracts c ON (t.related_object_type = 'contract' AND t.related_object_id = c.id)
      LEFT JOIN capex_items ci ON (t.related_object_type = 'capex_item' AND t.related_object_id = ci.id)
      LEFT JOIN portfolio_projects pp ON (t.related_object_type = 'project' AND t.related_object_id = pp.id)
      LEFT JOIN portfolio_project_phases phase ON t.phase_id = phase.id
      LEFT JOIN portfolio_task_types tt ON t.task_type_id = tt.id
      -- Classification JOINs (COALESCE: task value wins, falls back to project)
      LEFT JOIN portfolio_sources ps ON COALESCE(t.source_id, pp.source_id) = ps.id
      LEFT JOIN portfolio_categories pc ON COALESCE(t.category_id, pp.category_id) = pc.id
      LEFT JOIN portfolio_streams pst ON COALESCE(t.stream_id, pp.stream_id) = pst.id
      LEFT JOIN companies comp ON COALESCE(t.company_id, pp.company_id) = comp.id
      WHERE ${whereConditions}
      ORDER BY ${sortField} ${sort.direction}
      LIMIT 10000
    `;
    const rows: Array<{ id: string }> = await manager.query(idsQuery, params);
    const ids = rows.map((r) => r.id);
    return { ids, total: ids.length };
  }

  async listFilterValues(query: any, opts?: { manager?: EntityManager; tenantId?: string }): Promise<Record<string, Array<string | null>>> {
    const manager = opts?.manager ?? this.dataSource.manager;
    const tenantId = String(opts?.tenantId || '').trim();
    const q = (query.q as string) || '';
    let filters: AgFilterModel = {};
    if (query.filters) {
      if (typeof query.filters === 'string') {
        try {
          filters = JSON.parse(query.filters);
        } catch {
          filters = {};
        }
      } else if (typeof query.filters === 'object') {
        filters = query.filters;
      }
    }

    const rawFields = String(query.fields || query.field || '').split(',').map((f) => f.trim()).filter(Boolean);
    const fields = rawFields.filter((field) => Object.prototype.hasOwnProperty.call(TASK_FILTER_VALUE_FIELDS, field));
    if (fields.length === 0) return {};

    const results: Record<string, Array<string | null>> = {};

    for (const field of fields) {
      const expression = TASK_FILTER_VALUE_FIELDS[field];
      const { whereConditions, params } = buildWhereConditions(query, filters, q, field, tenantId);
      const distinctQuery = `
        SELECT DISTINCT ${expression} as value
        FROM tasks t
        LEFT JOIN users u ON t.assignee_user_id = u.id AND u.tenant_id = t.tenant_id
        LEFT JOIN users uc ON t.creator_id = uc.id AND uc.tenant_id = t.tenant_id
        LEFT JOIN spend_items si ON (t.related_object_type = 'spend_item' AND t.related_object_id = si.id)
        LEFT JOIN contracts c ON (t.related_object_type = 'contract' AND t.related_object_id = c.id)
        LEFT JOIN capex_items ci ON (t.related_object_type = 'capex_item' AND t.related_object_id = ci.id)
        LEFT JOIN portfolio_projects pp ON (t.related_object_type = 'project' AND t.related_object_id = pp.id)
        LEFT JOIN portfolio_project_phases phase ON t.phase_id = phase.id
        LEFT JOIN portfolio_task_types tt ON t.task_type_id = tt.id
        -- Classification JOINs (COALESCE: task value wins, falls back to project)
        LEFT JOIN portfolio_sources ps ON COALESCE(t.source_id, pp.source_id) = ps.id
        LEFT JOIN portfolio_categories pc ON COALESCE(t.category_id, pp.category_id) = pc.id
        LEFT JOIN portfolio_streams pst ON COALESCE(t.stream_id, pp.stream_id) = pst.id
        LEFT JOIN companies comp ON COALESCE(t.company_id, pp.company_id) = comp.id
        WHERE ${whereConditions}
        ORDER BY value ASC
      `;
      const rows: Array<{ value: string | null }> = await manager.query(distinctQuery, params);
      results[field] = rows.map((row) => row.value);
    }

    return results;
  }

  async getOne(id: string, opts?: { manager?: EntityManager }): Promise<TaskListItem | null> {
    const manager = opts?.manager ?? this.dataSource.manager;
    const params: any[] = [id];
    const dataQuery = `
      SELECT
        t.id,
        t.tenant_id,
        t.item_number,
        t.title,
        t.description,
        t.status,
        t.due_date,
        t.start_date,
        t.created_at,
        t.assignee_user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as assignee_name,
        COALESCE(uc.first_name || ' ' || uc.last_name, uc.email) as creator_name,
        t.related_object_type,
        t.related_object_id,
        CASE
          WHEN t.related_object_type IS NULL THEN NULL
          WHEN t.related_object_type = 'spend_item' THEN si.product_name
          WHEN t.related_object_type = 'contract' THEN c.name
          WHEN t.related_object_type = 'capex_item' THEN ci.description
          WHEN t.related_object_type = 'project' THEN pp.name
          ELSE ''
        END as related_object_name,
        t.task_type_id,
        tt.name as task_type_name,
        t.phase_id,
        phase.name as phase_name,
        t.priority_level,
        CASE
          WHEN t.related_object_type = 'project' AND pp.priority_score IS NOT NULL THEN
            ROUND(LEAST(GREATEST(
              pp.priority_score +
              CASE t.priority_level
                WHEN 'blocker' THEN 10
                WHEN 'high' THEN 5
                WHEN 'normal' THEN 0
                WHEN 'low' THEN -5
                WHEN 'optional' THEN -10
                ELSE 0
              END, 0), 100))
          ELSE
            CASE t.priority_level
              WHEN 'blocker' THEN 110
              WHEN 'high' THEN 90
              WHEN 'normal' THEN 70
              WHEN 'low' THEN 50
              WHEN 'optional' THEN 30
              ELSE 70
            END
        END as priority_score,
        t.labels,
        -- Classification (task value wins, falls back to project)
        COALESCE(t.source_id, pp.source_id) as source_id,
        COALESCE(t.category_id, pp.category_id) as category_id,
        COALESCE(t.stream_id, pp.stream_id) as stream_id,
        COALESCE(t.company_id, pp.company_id) as company_id,
        -- Resolved classification names
        ps.name as source_name,
        pc.name as category_name,
        pst.name as stream_name,
        comp.name as company_name,
        t.creator_id,
        t.owner_ids,
        t.viewer_ids,
        pr_origin.id as converted_request_id,
        pr_origin.item_number as converted_request_item_number
      FROM tasks t
      LEFT JOIN users u ON t.assignee_user_id = u.id AND u.tenant_id = t.tenant_id
      LEFT JOIN users uc ON t.creator_id = uc.id AND uc.tenant_id = t.tenant_id
      LEFT JOIN spend_items si ON (t.related_object_type = 'spend_item' AND t.related_object_id = si.id)
      LEFT JOIN contracts c ON (t.related_object_type = 'contract' AND t.related_object_id = c.id)
      LEFT JOIN capex_items ci ON (t.related_object_type = 'capex_item' AND t.related_object_id = ci.id)
      LEFT JOIN portfolio_projects pp ON (t.related_object_type = 'project' AND t.related_object_id = pp.id)
      LEFT JOIN portfolio_requests pr_origin ON pr_origin.origin_task_id = t.id
      LEFT JOIN portfolio_project_phases phase ON t.phase_id = phase.id
      LEFT JOIN portfolio_task_types tt ON t.task_type_id = tt.id
      -- Classification JOINs (COALESCE: task value wins, falls back to project)
      LEFT JOIN portfolio_sources ps ON COALESCE(t.source_id, pp.source_id) = ps.id
      LEFT JOIN portfolio_categories pc ON COALESCE(t.category_id, pp.category_id) = pc.id
      LEFT JOIN portfolio_streams pst ON COALESCE(t.stream_id, pp.stream_id) = pst.id
      LEFT JOIN companies comp ON COALESCE(t.company_id, pp.company_id) = comp.id
      WHERE t.id = $1
      LIMIT 1
    `;
    const rows: TaskListItem[] = await manager.query(dataQuery, params);
    return rows[0] || null;
  }
}
