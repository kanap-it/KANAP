import { EntityManager } from 'typeorm';

/**
 * Who is looking at the incident register. `isAdmin` means incidents:admin
 * (Administrator already short-circuits to that).
 */
export type IncidentViewer = {
  userId: string | null;
  isAdmin: boolean;
};

export type IncidentVisibilityRow = {
  confidential?: boolean | null;
  reporter_user_id?: string | null;
  owner_user_id?: string | null;
};

export function incidentViewerFromContext(ctx: {
  userId?: string | null;
  isAdmin?: boolean;
  permissions?: Record<string, string | undefined> | null;
}): IncidentViewer {
  const permissions = ctx.permissions || {};
  return {
    userId: ctx.userId ? String(ctx.userId) : null,
    isAdmin: ctx.isAdmin === true || permissions.incidents === 'admin',
  };
}

/**
 * A1: confidential rows are visible to incidents:admin, the reporter and the owner.
 * Missing viewer fails closed.
 */
export function incidentVisibleToViewer(
  incident: IncidentVisibilityRow,
  viewer?: IncidentViewer | null,
): boolean {
  if (!incident.confidential) return true;
  if (viewer?.isAdmin) return true;
  const userId = String(viewer?.userId || '').trim();
  if (!userId) return false;
  return incident.reporter_user_id === userId || incident.owner_user_id === userId;
}

/**
 * SQL fragment with a leading AND. Admins get an empty string (see every row).
 */
export function incidentVisibilitySql(
  alias: string,
  viewer: IncidentViewer | null | undefined,
  params: unknown[],
): string {
  if (viewer?.isAdmin) return '';
  const confidential = `${alias}.confidential`;
  const userId = String(viewer?.userId || '').trim();
  if (!userId) {
    return ` AND ${confidential} = false`;
  }
  params.push(userId);
  const placeholder = `$${params.length}`;
  return ` AND (${confidential} = false OR ${alias}.reporter_user_id = ${placeholder} OR ${alias}.owner_user_id = ${placeholder})`;
}

/** Related-object label on tasks: INC-N only when the incident is confidential. */
export function incidentRelatedLabelSql(alias: string): string {
  return `CASE WHEN ${alias}.id IS NULL THEN NULL WHEN ${alias}.confidential THEN 'INC-' || ${alias}.item_number::text ELSE 'INC-' || ${alias}.item_number::text || ' · ' || ${alias}.title END`;
}

/** Title for task search / index: omitted when confidential. */
export function incidentRelatedTitleSql(alias: string): string {
  return `CASE WHEN ${alias}.confidential THEN NULL ELSE ${alias}.title END`;
}

/**
 * Resolve incidents:admin (or Administrator) for callers that are not already
 * behind PermissionGuard on the incidents resource (chat, task sub-routes).
 */
export async function resolveIncidentViewer(
  manager: EntityManager,
  userId: string | null | undefined,
  tenantId: string | null | undefined,
): Promise<IncidentViewer> {
  const normalized = String(userId || '').trim();
  const tenant = String(tenantId || '').trim();
  if (!normalized || !tenant) return { userId: normalized || null, isAdmin: false };
  const rows: Array<{ is_admin: boolean | string }> = await manager.query(
    `SELECT (
        EXISTS (
          SELECT 1 FROM users u
          JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
          WHERE u.id = $1 AND u.tenant_id = $2 AND lower(r.role_name) = 'administrator'
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id AND r.tenant_id = ur.tenant_id
          WHERE ur.user_id = $1 AND ur.tenant_id = $2 AND lower(r.role_name) = 'administrator'
        )
        OR EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.resource = 'incidents' AND rp.level = 'admin' AND rp.tenant_id = $2
            AND (
              rp.role_id = (SELECT u.role_id FROM users u WHERE u.id = $1 AND u.tenant_id = $2)
              OR rp.role_id IN (SELECT ur.role_id FROM user_roles ur WHERE ur.user_id = $1 AND ur.tenant_id = $2)
            )
        )
      ) AS is_admin`,
    [normalized, tenant],
  );
  const raw = rows[0]?.is_admin;
  return { userId: normalized, isAdmin: raw === true || raw === 't' || raw === 'true' };
}
