import { EntityManager } from 'typeorm';

export type CompareMode = 'default' | 'date' | 'json' | 'array' | 'number';

type FkTable =
  | 'users'
  | 'tasks'
  | 'portfolio_task_types'
  | 'portfolio_project_phases'
  | 'portfolio_sources'
  | 'portfolio_categories'
  | 'portfolio_streams'
  | 'companies'
  | 'departments';

export interface FieldConfig {
  field: string;
  fk?: {
    table: FkTable;
    expr: string;
  };
  compare?: CompareMode;
}

export interface DetectedChange {
  field: string;
  before: unknown;
  after: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FK = {
  user: {
    table: 'users' as const,
    expr: `COALESCE(NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''), email, id::text)`,
  },
  taskType: {
    table: 'portfolio_task_types' as const,
    expr: 'name',
  },
  task: {
    table: 'tasks' as const,
    expr: `CONCAT('T-', item_number::text, ': ', COALESCE(title, id::text))`,
  },
  phase: {
    table: 'portfolio_project_phases' as const,
    expr: 'name',
  },
  source: {
    table: 'portfolio_sources' as const,
    expr: 'name',
  },
  category: {
    table: 'portfolio_categories' as const,
    expr: 'name',
  },
  stream: {
    table: 'portfolio_streams' as const,
    expr: 'name',
  },
  company: {
    table: 'companies' as const,
    expr: 'name',
  },
  department: {
    table: 'departments' as const,
    expr: 'name',
  },
};

function toNullIfEmpty(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function normalizeDate(value: unknown): string | null {
  const v = toNullIfEmpty(value);
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const str = String(v).trim();
  if (!str) return null;
  if (str.includes('T')) return str.split('T')[0];
  return str;
}

function normalizeNumber(value: unknown): number | null {
  const v = toNullIfEmpty(value);
  if (v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObject(entry));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObject(obj[key]);
  }
  return sorted;
}

function normalizeJson(value: unknown): unknown {
  const v = toNullIfEmpty(value);
  if (v === null) return null;
  return sortObject(v);
}

function normalizeScalar(value: unknown): unknown {
  const v = toNullIfEmpty(value);
  if (v === null) return null;
  return v;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortObject(value));
}

function normalizeArray(value: unknown): unknown[] | null {
  const v = toNullIfEmpty(value);
  if (v === null) return null;
  if (!Array.isArray(v)) return [normalizeScalar(v)];
  const normalized = v.map((entry) => normalizeScalar(entry));
  return normalized.sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
}

function normalizeByMode(value: unknown, mode: CompareMode): unknown {
  if (mode === 'date') return normalizeDate(value);
  if (mode === 'json') return normalizeJson(value);
  if (mode === 'array') return normalizeArray(value);
  if (mode === 'number') return normalizeNumber(value);
  return normalizeScalar(value);
}

function isEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function getFieldConfigMap(fields: FieldConfig[]): Map<string, FieldConfig> {
  return new Map(fields.map((field) => [field.field, field]));
}

export function detectChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: FieldConfig[],
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  for (const cfg of fields) {
    const compare = cfg.compare ?? 'default';
    const oldValue = normalizeByMode(before?.[cfg.field], compare);
    const newValue = normalizeByMode(after?.[cfg.field], compare);
    if (!isEqual(oldValue, newValue)) {
      changes.push({
        field: cfg.field,
        before: oldValue,
        after: newValue,
      });
    }
  }
  return changes;
}

export async function resolveDisplayNames(
  changes: DetectedChange[],
  fields: FieldConfig[],
  manager: EntityManager,
): Promise<Record<string, [unknown, unknown]>> {
  const byField = getFieldConfigMap(fields);
  const idsByQueryKey = new Map<string, Set<string>>();

  for (const change of changes) {
    const cfg = byField.get(change.field);
    if (!cfg?.fk) continue;
    const key = `${cfg.fk.table}|${cfg.fk.expr}`;
    if (!idsByQueryKey.has(key)) idsByQueryKey.set(key, new Set<string>());
    const set = idsByQueryKey.get(key)!;
    if (isUuid(change.before)) set.add(change.before);
    if (isUuid(change.after)) set.add(change.after);
  }

  const displayByQueryKey = new Map<string, Map<string, string>>();
  for (const [key, idSet] of idsByQueryKey.entries()) {
    const [table, expr] = key.split('|');
    const ids = Array.from(idSet);
    const map = new Map<string, string>();
    if (ids.length > 0) {
      const rows = await manager.query<Array<{ id: string; display: string | null }>>(
        `SELECT id, ${expr} AS display FROM ${table} WHERE id = ANY($1::uuid[])`,
        [ids],
      );
      for (const row of rows) {
        map.set(row.id, row.display || row.id);
      }
    }
    displayByQueryKey.set(key, map);
  }

  const result: Record<string, [unknown, unknown]> = {};
  for (const change of changes) {
    const cfg = byField.get(change.field);
    if (!cfg?.fk) {
      result[change.field] = [change.before, change.after];
      continue;
    }
    const key = `${cfg.fk.table}|${cfg.fk.expr}`;
    const names = displayByQueryKey.get(key) ?? new Map<string, string>();
    const before = isUuid(change.before) ? (names.get(change.before) ?? change.before) : change.before;
    const after = isUuid(change.after) ? (names.get(change.after) ?? change.after) : change.after;
    result[change.field] = [before, after];
  }

  return result;
}

export const TASK_TRACKED_FIELDS: FieldConfig[] = [
  { field: 'title' },
  { field: 'description' },
  { field: 'status' },
  { field: 'task_type_id', fk: FK.taskType },
  { field: 'priority_level' },
  { field: 'creator_id', fk: FK.user },
  { field: 'assignee_user_id', fk: FK.user },
  { field: 'due_date', compare: 'date' },
  { field: 'start_date', compare: 'date' },
  { field: 'labels', compare: 'array' },
  { field: 'phase_id', fk: FK.phase },
  { field: 'source_id', fk: FK.source },
  { field: 'category_id', fk: FK.category },
  { field: 'stream_id', fk: FK.stream },
  { field: 'company_id', fk: FK.company },
];

export const REQUEST_TRACKED_FIELDS: FieldConfig[] = [
  { field: 'name' },
  { field: 'requestor_id', fk: FK.user },
  { field: 'target_delivery_date', compare: 'date' },
  { field: 'origin_task_id', fk: FK.task },
  { field: 'source_id', fk: FK.source },
  { field: 'category_id', fk: FK.category },
  { field: 'stream_id', fk: FK.stream },
  { field: 'company_id', fk: FK.company },
  { field: 'department_id', fk: FK.department },
  { field: 'business_sponsor_id', fk: FK.user },
  { field: 'business_lead_id', fk: FK.user },
  { field: 'it_sponsor_id', fk: FK.user },
  { field: 'it_lead_id', fk: FK.user },
  { field: 'current_situation' },
  { field: 'expected_benefits' },
  { field: 'feasibility_review', compare: 'json' },
];

export const PROJECT_TRACKED_FIELDS: FieldConfig[] = [
  { field: 'name' },
  { field: 'scheduling_mode' },
  { field: 'source_id', fk: FK.source },
  { field: 'category_id', fk: FK.category },
  { field: 'stream_id', fk: FK.stream },
  { field: 'company_id', fk: FK.company },
  { field: 'department_id', fk: FK.department },
  { field: 'business_sponsor_id', fk: FK.user },
  { field: 'business_lead_id', fk: FK.user },
  { field: 'it_sponsor_id', fk: FK.user },
  { field: 'it_lead_id', fk: FK.user },
  { field: 'planned_start', compare: 'date' },
  { field: 'planned_end', compare: 'date' },
  { field: 'execution_progress', compare: 'number' },
  { field: 'estimated_effort_it', compare: 'number' },
  { field: 'estimated_effort_business', compare: 'number' },
  { field: 'actual_effort_it', compare: 'number' },
  { field: 'actual_effort_business', compare: 'number' },
  { field: 'it_effort_allocation_mode' },
  { field: 'business_effort_allocation_mode' },
];
