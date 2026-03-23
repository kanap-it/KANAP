import { BadRequestException } from '@nestjs/common';
import { AiExecutionContextWithManager, AiQueryScope } from '../ai.types';

export type ScopedAiEntityType =
  | 'applications'
  | 'assets'
  | 'locations'
  | 'projects'
  | 'requests'
  | 'tasks'
  | 'documents';

export type ResolvedAiScope = {
  requested: AiQueryScope;
  resolved: boolean;
  team_name?: string | null;
};

export async function resolveCurrentUserTeam(
  context: AiExecutionContextWithManager,
): Promise<{ teamId: string | null; teamName: string | null }> {
  const rows = await context.manager.query(
    `SELECT tmc.team_id,
            pt.name AS team_name
     FROM portfolio_team_member_configs tmc
     LEFT JOIN portfolio_teams pt
       ON pt.id = tmc.team_id
      AND pt.tenant_id = tmc.tenant_id
     WHERE tmc.tenant_id = $1
       AND tmc.user_id = $2
     LIMIT 1`,
    [context.tenantId, context.userId],
  );
  return {
    teamId: rows[0]?.team_id ?? null,
    teamName: rows[0]?.team_name ?? null,
  };
}

export async function applyScopeToAiQuery(
  context: AiExecutionContextWithManager,
  entityType: ScopedAiEntityType,
  query: Record<string, any>,
  scope?: AiQueryScope,
): Promise<{ query: Record<string, any>; scope: ResolvedAiScope | null }> {
  if (!scope) {
    return { query, scope: null };
  }

  if (scope === 'me') {
    if (entityType === 'tasks') {
      return {
        query: { ...query, assigneeUserId: context.userId },
        scope: { requested: scope, resolved: true },
      };
    }
    if (entityType === 'projects' || entityType === 'requests') {
      return {
        query: { ...query, involvedUserId: context.userId },
        scope: { requested: scope, resolved: true },
      };
    }
    throw new BadRequestException(`scope "${scope}" is not supported for ${entityType}.`);
  }

  if (scope === 'my_team') {
    const { teamId, teamName } = await resolveCurrentUserTeam(context);
    if (!teamId) {
      return {
        query,
        scope: { requested: scope, resolved: false, team_name: teamName },
      };
    }
    if (entityType === 'tasks') {
      return {
        query: { ...query, teamId },
        scope: { requested: scope, resolved: true, team_name: teamName },
      };
    }
    if (entityType === 'projects' || entityType === 'requests') {
      return {
        query: { ...query, involvedTeamId: teamId },
        scope: { requested: scope, resolved: true, team_name: teamName },
      };
    }
    throw new BadRequestException(`scope "${scope}" is not supported for ${entityType}.`);
  }

  return { query, scope: null };
}
