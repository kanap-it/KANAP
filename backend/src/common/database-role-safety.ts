import { DataSource, EntityManager, QueryRunner } from 'typeorm';

export type DatabaseRoleSafetyState = {
  currentUser: string;
  isSuperuser: boolean;
  canBypassRls: boolean;
};

type QueryExecutor = Pick<DataSource | EntityManager | QueryRunner, 'query'>;

function toBoolean(value: boolean | 't' | 'f' | null | undefined): boolean {
  return value === true || value === 't';
}

function formatRoleFlags(state: DatabaseRoleSafetyState): string {
  const flags: string[] = [];
  if (state.isSuperuser) flags.push('SUPERUSER');
  if (state.canBypassRls) flags.push('BYPASSRLS');
  return flags.length > 0 ? flags.join(', ') : 'native RLS enforcement';
}

export function isProtectedDatabaseRole(roleName: string): boolean {
  return roleName === 'postgres' || roleName.startsWith('pg_');
}

export async function getDatabaseRoleSafetyState(
  executor: QueryExecutor,
): Promise<DatabaseRoleSafetyState> {
  const rows = await executor.query(`
    SELECT current_user AS current_user,
           COALESCE(r.rolsuper, false) AS is_superuser,
           COALESCE(r.rolbypassrls, false) AS can_bypass_rls
    FROM pg_roles r
    WHERE r.rolname = current_user
  `);

  const row = rows?.[0];
  if (!row?.current_user) {
    throw new Error('Unable to determine PostgreSQL role safety for current_user');
  }

  return {
    currentUser: String(row.current_user),
    isSuperuser: toBoolean(row.is_superuser),
    canBypassRls: toBoolean(row.can_bypass_rls),
  };
}

export async function assertSafeDatabaseRole(
  executor: QueryExecutor,
  context = 'startup',
): Promise<DatabaseRoleSafetyState> {
  const state = await getDatabaseRoleSafetyState(executor);
  if (!state.isSuperuser && !state.canBypassRls) {
    return state;
  }

  const prefix = `[${context}]`;
  const flags = formatRoleFlags(state);
  if (isProtectedDatabaseRole(state.currentUser)) {
    throw new Error(
      `${prefix} DATABASE_URL resolves to protected PostgreSQL role "${state.currentUser}" with ${flags}. `
      + 'KANAP refuses to run with cluster-admin roles because they bypass row-level security. '
      + 'Use a dedicated application role without SUPERUSER or BYPASSRLS.',
    );
  }

  throw new Error(
    `${prefix} DATABASE_URL resolves to PostgreSQL role "${state.currentUser}" with ${flags}. `
    + 'This bypasses tenant isolation. Re-run migrations so the role is hardened to '
    + 'NOSUPERUSER NOBYPASSRLS, or update DATABASE_URL to a dedicated application role.',
  );
}

