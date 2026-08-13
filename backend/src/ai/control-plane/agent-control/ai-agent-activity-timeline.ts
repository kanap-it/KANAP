/**
 * Pure helpers behind the agent activity timeline: the audit-event classifier,
 * its SQL mirror, and the keyset (cursor) pagination merge.
 *
 * They live outside the control service so both the endpoint and the unit tests
 * can use them, and — more importantly — so the classifier used to *label* a row
 * and the predicate used to *select* rows in SQL can never drift apart. A drift
 * there silently drops rows from a filtered page.
 */

export type AgentActivityType =
  | 'proposal'
  | 'decision'
  | 'execution'
  | 'configuration'
  | 'check'
  | 'pause'
  | 'error';

export const AGENT_ACTIVITY_TYPES: readonly AgentActivityType[] = [
  'proposal',
  'decision',
  'execution',
  'configuration',
  'check',
  'pause',
  'error',
];

/** Activity types an audit event can be classified as. */
export const AGENT_ACTIVITY_AUDIT_TYPES: readonly AgentActivityType[] = ['pause', 'error', 'check', 'decision', 'configuration'];

export type AuditEventLike = { event_type: string; severity?: string | null };

/**
 * Classify one audit event. Order matters and is mirrored 1:1 by
 * `auditActivityTypeSql` below: pause wins over error, error over check
 * (a failed poll cycle is an error, not a check), check over decision,
 * decision over configuration.
 *
 * Acknowledging a needs-attention row is an operator ruling on a piece of the
 * agent's work — the same family as approve/reject/dismiss — so it belongs with
 * the decisions, not with the configuration changes.
 */
export function auditActivityType(event: AuditEventLike): AgentActivityType {
  const eventType = (event.event_type ?? '').toLocaleLowerCase();
  if (eventType.includes('pause')) return 'pause';
  if (event.severity === 'error' || eventType.includes('fail') || eventType.includes('error')) return 'error';
  if (eventType.startsWith('poller_cycle')) return 'check';
  if (eventType.includes('attention_acknowledged')) return 'decision';
  return 'configuration';
}

/**
 * SQL mirror of `auditActivityType`, restricted to the wanted types. Returns a
 * boolean expression over `<alias>.event_type` / `<alias>.severity` with no
 * bound parameters (every literal is a constant here), or null when every audit
 * type is wanted (no filtering needed).
 */
export function auditActivityTypeClauseSql(alias: string, type: AgentActivityType): string {
  const isPause = `lower(${alias}.event_type) LIKE '%pause%'`;
  const isError = `(${alias}.severity = 'error' OR lower(${alias}.event_type) LIKE '%fail%' OR lower(${alias}.event_type) LIKE '%error%')`;
  const isCheck = `lower(${alias}.event_type) LIKE 'poller_cycle%'`;
  const isDecision = `lower(${alias}.event_type) LIKE '%attention_acknowledged%'`;
  switch (type) {
    case 'pause':
      return `(${isPause})`;
    case 'error':
      return `(NOT ${isPause} AND ${isError})`;
    case 'check':
      return `(NOT ${isPause} AND NOT ${isError} AND ${isCheck})`;
    case 'decision':
      return `(NOT ${isPause} AND NOT ${isError} AND NOT ${isCheck} AND ${isDecision})`;
    default:
      return `(NOT ${isPause} AND NOT ${isError} AND NOT ${isCheck} AND NOT ${isDecision})`;
  }
}

export function auditActivityTypeSql(alias: string, wanted: ReadonlySet<AgentActivityType>): string | null {
  const wantedAuditTypes = AGENT_ACTIVITY_AUDIT_TYPES.filter((type) => wanted.has(type));
  if (wantedAuditTypes.length === 0) return 'false';
  if (wantedAuditTypes.length === AGENT_ACTIVITY_AUDIT_TYPES.length) return null;
  return `(${wantedAuditTypes.map((type) => auditActivityTypeClauseSql(alias, type)).join(' OR ')})`;
}

export type ActivityCursor = { at: string; id: string };

export type ActivitySortable = { at: string; id: string };

/** Newest first, id ascending as the tiebreaker so the order is total and stable. */
export function compareActivityEntries(left: ActivitySortable, right: ActivitySortable): number {
  const leftTime = Date.parse(left.at);
  const rightTime = Date.parse(right.at);
  if (leftTime !== rightTime) return rightTime - leftTime;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function encodeActivityCursor(entry: ActivitySortable): string {
  return Buffer.from(`${entry.at}|${entry.id}`, 'utf8').toString('base64url');
}

export function decodeActivityCursor(value: string | null | undefined): ActivityCursor | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(value.trim(), 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const separator = decoded.indexOf('|');
  if (separator <= 0) return null;
  const at = decoded.slice(0, separator);
  const id = decoded.slice(separator + 1);
  if (!id || !Number.isFinite(Date.parse(at))) return null;
  return { at, id };
}

/**
 * Merge the per-source streams into one page.
 *
 * Every source is fetched in the same (time desc) order with `limit + 1` rows
 * starting at the cursor, so the merged head of `limit` entries is exactly the
 * globally next page — the classic merge-of-sorted-streams argument. That is
 * what makes this paging honest where the previous "fetch 400, slice by offset"
 * silently degraded past the first pages.
 */
export function mergeActivityPage<T extends ActivitySortable>(
  entries: T[],
  limit: number,
  cursor: ActivityCursor | null,
): { items: T[]; nextCursor: string | null } {
  const bounded = cursor
    ? entries.filter((entry) => compareActivityEntries(cursor, entry) < 0)
    : entries;
  const sorted = [...bounded].sort(compareActivityEntries);
  const items = sorted.slice(0, limit);
  const nextCursor = sorted.length > limit && items.length > 0
    ? encodeActivityCursor(items[items.length - 1])
    : null;
  return { items, nextCursor };
}
