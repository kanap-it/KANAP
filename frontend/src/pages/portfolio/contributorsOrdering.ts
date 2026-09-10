/**
 * Ordering shared by the contributors list and the workspace prev/next
 * navigation, so walking a contributor's neighbours follows the list exactly:
 * teams alphabetically, "Unassigned" last, API order inside a group.
 */

export const UNASSIGNED_GROUP = 'unassigned';

export type ContributorGroupable = { id: string; item_number?: number; team_id?: string | null };
export type TeamLike = { id: string; name: string };

export function groupContributorsByTeam<T extends ContributorGroupable>(
  contributors: T[],
  teams: TeamLike[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const team of teams) groups[team.id] = [];
  groups[UNASSIGNED_GROUP] = [];
  for (const contributor of contributors) {
    const key = contributor.team_id && groups[contributor.team_id] ? contributor.team_id : UNASSIGNED_GROUP;
    groups[key].push(contributor);
  }
  return groups;
}

export function sortGroupIds(groupIds: string[], teamName: (groupId: string) => string): string[] {
  return [...groupIds].sort((a, b) => {
    if (a === UNASSIGNED_GROUP) return 1;
    if (b === UNASSIGNED_GROUP) return -1;
    return teamName(a).localeCompare(teamName(b));
  });
}

/** Flat list in display order (what the list page renders top to bottom). */
export function orderContributors<T extends ContributorGroupable>(
  contributors: T[],
  teams: TeamLike[],
  unassignedLabel: string,
): T[] {
  const groups = groupContributorsByTeam(contributors, teams);
  const teamName = (groupId: string) => (
    groupId === UNASSIGNED_GROUP ? unassignedLabel : teams.find((team) => team.id === groupId)?.name || ''
  );
  return sortGroupIds(Object.keys(groups), teamName).flatMap((groupId) => groups[groupId]);
}
