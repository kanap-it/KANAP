import { ACTIVE_TASK_STATUSES } from '../../tasks/task.constants';

export type SetFilter = { filterType: 'set'; values: Array<string | null> };
export type DateFilter = { filterType: 'date'; type: string; dateFrom: string };
export type FilterModel = Record<string, SetFilter | DateFilter>;

/** A set filter on the empty value: the list shows the rows where the column has nothing. */
export const BLANK: SetFilter = { filterType: 'set', values: [null] };

/**
 * The statuses the report figures count as open, mirroring the backend. They are spelled out
 * rather than derived: the list pages restore the exact model they are given, so a link only
 * matches its figure while these lists stay identical to the ones in the SQL.
 */
export const OPEN_REQUEST_STATUSES = ['pending_review', 'candidate', 'approved', 'on_hold'];
export const OPEN_PROJECT_STATUSES = ['waiting_list', 'planned', 'in_progress', 'in_testing', 'on_hold'];

/**
 * Portfolio reporting counts standalone tasks and project tasks only. The tasks hanging off a
 * contract, a spend item, a capex item or an incident belong to those workflows, so every task
 * link narrows the list to the same two kinds.
 */
export const TASK_SCOPE: FilterModel = {
  status: { filterType: 'set', values: ACTIVE_TASK_STATUSES },
  related_object_type: { filterType: 'set', values: [null, 'project'] },
};

const listPath = (base: string, scopeParam: string, filters: FilterModel): string => {
  const params = new URLSearchParams({ [scopeParam]: 'all', filters: JSON.stringify(filters) });
  return `${base}?${params.toString()}`;
};

export const tasksPath = (extra: FilterModel = {}) =>
  listPath('/portfolio/tasks', 'taskScope', { ...TASK_SCOPE, ...extra });

export const requestsPath = (extra: FilterModel = {}) =>
  listPath('/portfolio/requests', 'requestScope', {
    status: { filterType: 'set', values: OPEN_REQUEST_STATUSES },
    ...extra,
  });

export const projectsPath = (extra: FilterModel = {}) =>
  listPath('/portfolio/projects', 'projectScope', {
    status: { filterType: 'set', values: OPEN_PROJECT_STATUSES },
    ...extra,
  });
