import { ACTIVE_TASK_STATUSES } from '../../tasks/task.constants';

export type SetFilter = { filterType: 'set'; values: Array<string | null> };
export type DateFilter = { filterType: 'date'; type: string; dateFrom: string; dateTo?: string };
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

/**
 * A `created_at` filter for one age bracket. `from` is inclusive, `to` is inclusive as well,
 * and a bracket open on the left reads as "created before that day", the day itself excluded.
 * Both sides are plain days, the format the list restores from the URL.
 */
export const createdBetween = (from: string | null, to: string | null): DateFilter => {
  if (from && to) return { filterType: 'date', type: 'inRange', dateFrom: from, dateTo: to };
  if (from) return { filterType: 'date', type: 'greaterThanOrEqual', dateFrom: from };
  return { filterType: 'date', type: 'lessThan', dateFrom: String(to) };
};

/** A date filter from one plain day to another, both included (the lists read it as `BETWEEN`). */
export const dateInRange = (from: string, to: string): DateFilter => ({
  filterType: 'date',
  type: 'inRange',
  dateFrom: from,
  dateTo: to,
});

const listPath = (base: string, scopeParam: string, filters: FilterModel): string => {
  const params = new URLSearchParams({ [scopeParam]: 'all', filters: JSON.stringify(filters) });
  return `${base}?${params.toString()}`;
};

/**
 * The projects and teams a report is narrowed to. Each list reads them through hidden filters
 * that apply exactly the report's rules: a task by the project it hangs off and its assignee's
 * team, a project by itself and the people involved in it, a request by its linked projects and
 * the people involved in it. Empty or missing lists mean "every value".
 */
export type ProjectTeamScope = { projectIds?: string[]; teamIds?: string[] };

const idSet = (ids: string[]): SetFilter => ({ filterType: 'set', values: ids });

export const projectTeamFilters = (
  entity: 'tasks' | 'requests' | 'projects',
  scope: ProjectTeamScope = {},
): FilterModel => {
  const projectIds = scope.projectIds ?? [];
  const teamIds = scope.teamIds ?? [];
  const model: FilterModel = {};
  if (entity === 'tasks') {
    if (projectIds.length > 0) {
      // A project filter leaves the standalone tasks out, like the report does.
      model.related_object_type = { filterType: 'set', values: ['project'] };
      model.related_object_id = idSet(projectIds);
    }
    if (teamIds.length > 0) model.assignee_team_id = idSet(teamIds);
    return model;
  }
  if (projectIds.length > 0) model[entity === 'projects' ? 'id' : 'linked_project_id'] = idSet(projectIds);
  if (teamIds.length > 0) model.involved_team_id = idSet(teamIds);
  return model;
};

export const tasksPath = (extra: FilterModel = {}, scope: ProjectTeamScope = {}) =>
  listPath('/portfolio/tasks', 'taskScope', { ...TASK_SCOPE, ...extra, ...projectTeamFilters('tasks', scope) });

export const requestsPath = (extra: FilterModel = {}, scope: ProjectTeamScope = {}) =>
  listPath('/portfolio/requests', 'requestScope', {
    status: { filterType: 'set', values: OPEN_REQUEST_STATUSES },
    ...extra,
    ...projectTeamFilters('requests', scope),
  });

export const projectsPath = (extra: FilterModel = {}, scope: ProjectTeamScope = {}) =>
  listPath('/portfolio/projects', 'projectScope', {
    status: { filterType: 'set', values: OPEN_PROJECT_STATUSES },
    ...extra,
    ...projectTeamFilters('projects', scope),
  });
