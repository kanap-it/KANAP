import { EntityManager } from 'typeorm';

/** Tables whose creation author is resolved from the audit trail. */
export type RecordCreatorTable = 'portfolio_projects' | 'portfolio_requests' | 'tasks';

export interface RecordCreatorRow {
  record_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/**
 * Display label of the user who created a record: full name, then email, then
 * null when there is no author to show (no audit row, or a system action).
 */
export function formatRecordCreatorName(
  row: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined,
): string | null {
  if (!row) return null;
  const name = [row.first_name, row.last_name]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return name || String(row.email ?? '').trim() || null;
}

/**
 * Resolve the creation author for a batch of records from the audit trail.
 *
 * The audit trail is the only durable source: `portfolio_projects` has no
 * creator column, and `tasks.creator_id` holds the requestor (a mutable field
 * labelled "Requestor"), not the user who created the row.
 *
 * Records without a `create` audit row — or whose author has neither a name
 * nor an email — are simply absent from the returned map.
 */
export async function resolveRecordCreators(
  manager: EntityManager,
  table: RecordCreatorTable,
  recordIds: string[],
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(recordIds.filter(Boolean)));
  const creators = new Map<string, string>();
  if (ids.length === 0) return creators;

  const rows = await manager.query<RecordCreatorRow[]>(
    `SELECT DISTINCT ON (al.record_id)
            al.record_id,
            u.first_name,
            u.last_name,
            u.email
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id AND u.tenant_id = al.tenant_id
     WHERE al.table_name = $1
       AND al.record_id = ANY($2::uuid[])
       AND al.action = 'create'
       AND al.tenant_id = app_current_tenant()
     ORDER BY al.record_id, al.created_at ASC`,
    [table, ids],
  );

  for (const row of rows) {
    const name = formatRecordCreatorName(row);
    if (name) creators.set(row.record_id, name);
  }
  return creators;
}
