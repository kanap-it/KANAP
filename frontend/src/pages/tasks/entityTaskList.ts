import { formatItemRef } from '../../utils/item-ref';
import type { RelatedKind } from './taskWorkspaceOrigin';
import type { TaskStatus } from './task.constants';
import { TASK_STATUS_OPTIONS } from './task.constants';

export type EntityTaskStatusFilter = 'all' | 'active' | TaskStatus;
export type EntityTaskPhaseFilter = 'all' | 'project-level' | string;

export type EntityTaskListFilters = {
  status: EntityTaskStatusFilter;
  phase: EntityTaskPhaseFilter;
};

export type EntityTaskListItem = {
  id: string;
  item_number?: number | null;
  status: string;
  phase_id?: string | null;
};

export type EntityTaskListNav = {
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  prevId: string | null;
  nextId: string | null;
};

export const ENTITY_TASK_LIST_QUERY_KEYS = ['taskStatus', 'taskPhase'] as const;

export const DEFAULT_ENTITY_TASK_LIST_FILTERS: EntityTaskListFilters = {
  status: 'all',
  phase: 'all',
};

const TASK_STATUS_VALUES = new Set<string>(TASK_STATUS_OPTIONS.map((option) => option.value));
const STATUS_FILTER_VALUES = new Set<string>(['all', 'active', ...TASK_STATUS_VALUES]);

const ENTITY_TASKS_ENDPOINTS: Record<RelatedKind, (id: string) => string> = {
  project: (id) => `/portfolio/projects/${id}/tasks`,
  spend_item: (id) => `/spend-items/${id}/tasks`,
  capex_item: (id) => `/capex-items/${id}/tasks`,
  contract: (id) => `/contracts/${id}/tasks`,
  incident: (id) => `/incidents/${id}/tasks`,
};

export function entityTasksQueryKey(kind: RelatedKind, id: string): [string, string] {
  return [`${kind}-tasks`, id];
}

export function entityTasksEndpoint(kind: RelatedKind, id: string): string {
  return ENTITY_TASKS_ENDPOINTS[kind](id);
}

export function sanitizeEntityTaskStatus(value: string | null | undefined): EntityTaskStatusFilter {
  const trimmed = (value || '').trim();
  if (STATUS_FILTER_VALUES.has(trimmed)) return trimmed as EntityTaskStatusFilter;
  return 'all';
}

export function sanitizeEntityTaskPhase(value: string | null | undefined): EntityTaskPhaseFilter {
  const trimmed = (value || '').trim();
  return trimmed || 'all';
}

export function parseEntityTaskListFilters(search: URLSearchParams): EntityTaskListFilters {
  return {
    status: sanitizeEntityTaskStatus(search.get('taskStatus')),
    phase: sanitizeEntityTaskPhase(search.get('taskPhase')),
  };
}

export function applyEntityTaskListFilters(
  search: URLSearchParams,
  filters: EntityTaskListFilters,
): URLSearchParams {
  const next = new URLSearchParams(search);
  if (!filters.status || filters.status === 'all') next.delete('taskStatus');
  else next.set('taskStatus', filters.status);
  if (!filters.phase || filters.phase === 'all') next.delete('taskPhase');
  else next.set('taskPhase', filters.phase);
  return next;
}

export function copyEntityTaskListFilters(from: URLSearchParams, to: URLSearchParams): void {
  const filters = parseEntityTaskListFilters(from);
  if (filters.status !== 'all') to.set('taskStatus', filters.status);
  else to.delete('taskStatus');
  if (filters.phase !== 'all') to.set('taskPhase', filters.phase);
  else to.delete('taskPhase');
}

export function entityTaskListFiltersSearch(search: URLSearchParams): string {
  const next = new URLSearchParams();
  copyEntityTaskListFilters(search, next);
  return next.toString();
}

export function filterEntityTasks<T extends EntityTaskListItem>(
  tasks: T[],
  filters: EntityTaskListFilters,
): T[] {
  return tasks.filter((task) => {
    if (filters.status === 'active') {
      if (task.status === 'done' || task.status === 'cancelled') return false;
    } else if (filters.status !== 'all' && task.status !== filters.status) {
      return false;
    }

    if (filters.phase === 'project-level') {
      if (task.phase_id != null) return false;
    } else if (filters.phase !== 'all' && task.phase_id !== filters.phase) {
      return false;
    }

    return true;
  });
}

function taskNavId(task: EntityTaskListItem): string {
  if (task.item_number != null) return formatItemRef('task', task.item_number);
  return task.id;
}

const SINGLETON_NAV: EntityTaskListNav = {
  index: 0,
  total: 1,
  hasPrev: false,
  hasNext: false,
  prevId: null,
  nextId: null,
};

export function navFromTaskList(
  currentId: string,
  tasks: EntityTaskListItem[],
  options?: { isLoading?: boolean },
): EntityTaskListNav {
  if (options?.isLoading || !currentId) return SINGLETON_NAV;

  const rawIdx = tasks.findIndex((task) => (
    task.id === currentId
    || (task.item_number != null && formatItemRef('task', task.item_number) === currentId)
  ));
  if (rawIdx < 0) return SINGLETON_NAV;

  return {
    index: rawIdx,
    total: tasks.length,
    hasPrev: rawIdx > 0,
    hasNext: rawIdx < tasks.length - 1,
    prevId: rawIdx > 0 ? taskNavId(tasks[rawIdx - 1]) : null,
    nextId: rawIdx < tasks.length - 1 ? taskNavId(tasks[rawIdx + 1]) : null,
  };
}
