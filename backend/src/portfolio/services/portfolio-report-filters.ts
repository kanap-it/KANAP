/**
 * The classification filters the portfolio reports share: a report narrowed to a source or a
 * category has to narrow every one of its queries the same way, and the weekly report, the
 * flow report and the lists they link to all have to count the same population.
 *
 * The values are always identifiers coming from `GET /portfolio/reports/weekly/filter-values`
 * (classification) or `GET /portfolio/reports/filter-values` (projects and teams), and they
 * always travel as bound parameters: nothing here is interpolated into SQL.
 */

/** A query string value as Nest hands it over: `a,b`, `['a','b']` or nothing at all. */
export const parseCsvIds = (value?: unknown): string[] => {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

/** The list without blanks and without duplicates. An empty list means "no filter". */
export const normalizeIdList = (values?: string[]): string[] => {
  if (!values) return [];
  const normalized = values
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
};

/**
 * Appends one set predicate to a statement's own parameter list and returns it, or `null` when
 * the filter is empty. The index is read off the list it was just pushed onto, so the same
 * filter can be built again for a statement that takes a different number of parameters.
 *
 * The left-hand side is an expression rather than a column: a task's source and category are
 * read through its project when the task carries none, exactly like the task list.
 */
export const pushSetFilterExpr = (
  sqlParams: any[],
  expression: string,
  values: string[] | undefined,
): string | null => {
  const normalized = normalizeIdList(values);
  if (normalized.length === 0) return null;
  sqlParams.push(normalized);
  return `${expression}::text = ANY($${sqlParams.length}::text[])`;
};

/** The same, on a plain column of one alias. */
export const pushSetFilter = (
  sqlParams: any[],
  alias: string,
  column: string,
  values: string[] | undefined,
): string | null => pushSetFilterExpr(sqlParams, `${alias}.${column}`, values);

/* ------------------------------------------------------------------ */
/*  Project and team                                                  */
/* ------------------------------------------------------------------ */

/**
 * The project and team a report is narrowed to. Both lists hold identifiers; an empty list
 * means "every value", so a report with no filter reads the same SQL it always read.
 */
export type ProjectTeamFilters = { projectIds?: string[]; teamIds?: string[] };

/**
 * When a project involves someone: a sponsor, a lead, or a member of its project team. It is
 * the rule of the project list's "My team" scope, and the report filter and the hidden list
 * filter the reports link with read it too, so the three always count the same projects.
 * `usersSql` is a parenthesised subquery returning user ids.
 */
export const projectInvolvesUsersSql = (alias: string, usersSql: string): string => `(
    ${alias}.business_sponsor_id IN ${usersSql}
    OR ${alias}.business_lead_id IN ${usersSql}
    OR ${alias}.it_sponsor_id IN ${usersSql}
    OR ${alias}.it_lead_id IN ${usersSql}
    OR EXISTS (
      SELECT 1
      FROM portfolio_project_team pt
      WHERE pt.project_id = ${alias}.id
        AND pt.user_id IN ${usersSql}
    )
  )`;

/**
 * The same for a request: its requestor, its author, a sponsor, a lead, or a member of its
 * team. The rule of the request list's "My team" scope.
 */
export const requestInvolvesUsersSql = (alias: string, usersSql: string): string => `(
    ${alias}.requestor_id IN ${usersSql}
    OR ${alias}.created_by_id IN ${usersSql}
    OR ${alias}.business_sponsor_id IN ${usersSql}
    OR ${alias}.business_lead_id IN ${usersSql}
    OR ${alias}.it_sponsor_id IN ${usersSql}
    OR ${alias}.it_lead_id IN ${usersSql}
    OR EXISTS (
      SELECT 1
      FROM portfolio_request_team rt
      WHERE rt.request_id = ${alias}.id
        AND rt.user_id IN ${usersSql}
    )
  )`;

/**
 * The members of a set of teams, as a subquery. A person belongs to one team at most, through
 * their contributor profile. `teamParam` is a placeholder already bound to the team ids.
 */
export const teamMembersSql = (teamParam: string, tenantExpr: string): string =>
  `(SELECT tmc.user_id FROM portfolio_team_member_configs tmc WHERE tmc.tenant_id = ${tenantExpr} AND tmc.team_id::text = ANY(${teamParam}::text[]))`;

const pushIds = (sqlParams: any[], values: string[] | undefined): string | null => {
  const normalized = normalizeIdList(values);
  if (normalized.length === 0) return null;
  sqlParams.push(normalized);
  return `$${sqlParams.length}`;
};

/**
 * The project and team predicates of a task query, each ready to be joined with `AND`. A task
 * belongs to a project when it hangs off it, so a project filter leaves the standalone tasks
 * out; it belongs to a team when its assignee does, so a team filter leaves the unassigned
 * tasks out. Both are the filters the task list applies to the links the reports build.
 */
export const taskProjectTeamPredicates = (
  sqlParams: any[],
  alias: string,
  filters: ProjectTeamFilters,
): string[] => {
  const predicates: string[] = [];
  const projects = pushIds(sqlParams, filters.projectIds);
  if (projects) {
    predicates.push(
      `(${alias}.related_object_type = 'project' AND ${alias}.related_object_id::text = ANY(${projects}::text[]))`,
    );
  }
  const teams = pushIds(sqlParams, filters.teamIds);
  if (teams) {
    predicates.push(`${alias}.assignee_user_id IN ${teamMembersSql(teams, `${alias}.tenant_id`)}`);
  }
  return predicates;
};

/** The same for a project query: the project itself, and the team rule of the project list. */
export const projectProjectTeamPredicates = (
  sqlParams: any[],
  alias: string,
  filters: ProjectTeamFilters,
): string[] => {
  const predicates: string[] = [];
  const projects = pushIds(sqlParams, filters.projectIds);
  if (projects) predicates.push(`${alias}.id::text = ANY(${projects}::text[])`);
  const teams = pushIds(sqlParams, filters.teamIds);
  if (teams) {
    predicates.push(projectInvolvesUsersSql(alias, teamMembersSql(teams, `${alias}.tenant_id`)));
  }
  return predicates;
};

/**
 * The same for a request query: a request belongs to a project when it is linked to it
 * (`portfolio_request_projects`), and to a team through the team rule of the request list.
 */
export const requestProjectTeamPredicates = (
  sqlParams: any[],
  alias: string,
  filters: ProjectTeamFilters,
): string[] => {
  const predicates: string[] = [];
  const projects = pushIds(sqlParams, filters.projectIds);
  if (projects) predicates.push(requestLinkedToProjectsSql(alias, `${projects}::text[]`));
  const teams = pushIds(sqlParams, filters.teamIds);
  if (teams) {
    predicates.push(requestInvolvesUsersSql(alias, teamMembersSql(teams, `${alias}.tenant_id`)));
  }
  return predicates;
};

/** A request linked to one of the projects, `projectsExpr` being a bound text array. */
export const requestLinkedToProjectsSql = (alias: string, projectsExpr: string): string => `EXISTS (
    SELECT 1
    FROM portfolio_request_projects rpf
    WHERE rpf.request_id = ${alias}.id
      AND rpf.tenant_id = ${alias}.tenant_id
      AND rpf.project_id::text = ANY(${projectsExpr})
  )`;

/**
 * The project and team conditions of a logged-time query, which reads the union of the task
 * entries (`tte`, joined to their task `t`) and the entries logged on a project directly
 * (`pte`). Each half gets its own ` AND …` fragment; the ids are bound once and read by both.
 * A project keeps the entries on its tasks and the ones logged on it; a team keeps its
 * members' entries, so an entry with no person is left out.
 */
export const timeEntryProjectTeamFilters = (
  sqlParams: any[],
  filters: ProjectTeamFilters,
  tenantExpr: string,
): { taskFilter: string; projectFilter: string } => {
  let taskFilter = '';
  let projectFilter = '';
  const projects = pushIds(sqlParams, filters.projectIds);
  if (projects) {
    taskFilter += ` AND t.related_object_type = 'project' AND t.related_object_id::text = ANY(${projects}::text[])`;
    projectFilter += ` AND pte.project_id::text = ANY(${projects}::text[])`;
  }
  const teams = pushIds(sqlParams, filters.teamIds);
  if (teams) {
    const members = teamMembersSql(teams, tenantExpr);
    taskFilter += ` AND tte.user_id IN ${members}`;
    projectFilter += ` AND pte.user_id IN ${members}`;
  }
  return { taskFilter, projectFilter };
};

/** Predicates as a fragment to append to an existing `WHERE`: ` AND a AND b`, or nothing. */
export const andPredicates = (predicates: string[]): string =>
  predicates.length === 0 ? '' : ` AND ${predicates.join(' AND ')}`;
