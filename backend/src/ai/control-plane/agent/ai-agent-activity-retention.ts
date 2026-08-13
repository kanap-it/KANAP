/**
 * Activity-history retention: how long an agent keeps its own timeline.
 *
 * The value is an agent-level operating setting stored in the existing
 * `queue_policy_json` column (key `activity_retention_days`) — no migration.
 * queue_policy_json is where the other lifecycle/economic operating knobs
 * already live (approval window, cooldowns, safety caps), and the built-in
 * reconciler spreads unknown keys through, so the value survives.
 *
 * The default (30 days) is deliberately longer than the 28-day autonomy
 * observation window and the 14-day evaluation window, so purging never makes
 * the performance metrics incoherent.
 */

export const ACTIVITY_RETENTION_DEFAULT_DAYS = 30;
export const ACTIVITY_RETENTION_MIN_DAYS = 7;
export const ACTIVITY_RETENTION_MAX_DAYS = 90;

export const ACTIVITY_RETENTION_POLICY_KEY = 'activity_retention_days';

/**
 * Action-request statuses that are done with: their proposal will never be
 * decided or executed again, so their history is purgeable. Everything else
 * (`pending`, `approved` awaiting execution, and any future status) is live
 * work and is never touched — nor are the runs it points at.
 */
export const TERMINAL_ACTION_STATUSES: readonly string[] = [
  'executed',
  'rejected',
  'dismissed',
  'expired',
  'failed',
  'provider_error',
];

export function isTerminalActionStatus(status: string | null | undefined): boolean {
  return typeof status === 'string' && TERMINAL_ACTION_STATUSES.includes(status);
}

/** Clamp to [7, 90] whole days; anything unusable falls back to the default. */
export function clampActivityRetentionDays(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return ACTIVITY_RETENTION_DEFAULT_DAYS;
  const whole = Math.floor(parsed);
  if (whole < ACTIVITY_RETENTION_MIN_DAYS) return ACTIVITY_RETENTION_MIN_DAYS;
  if (whole > ACTIVITY_RETENTION_MAX_DAYS) return ACTIVITY_RETENTION_MAX_DAYS;
  return whole;
}

function policyRecord(value: unknown): Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * Retention configured on an agent. An absent key means "never configured" and
 * resolves to the default — not to the clamp of `undefined`.
 */
export function activityRetentionDaysForDefinition(
  definition: { queue_policy_json?: Record<string, unknown> | null } | null | undefined,
): number {
  const raw = policyRecord(definition?.queue_policy_json)[ACTIVITY_RETENTION_POLICY_KEY];
  if (raw == null || raw === '') return ACTIVITY_RETENTION_DEFAULT_DAYS;
  return clampActivityRetentionDays(raw);
}

/**
 * Normalize the retention key inside a queue policy about to be persisted:
 * clamped server-side so a crafted payload can never shrink history below the
 * floor or hoard it above the ceiling. Absent stays absent (= default).
 */
export function normalizeQueuePolicyRetention(
  queuePolicy: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!queuePolicy || typeof queuePolicy !== 'object' || Array.isArray(queuePolicy)) return queuePolicy;
  if (!Object.prototype.hasOwnProperty.call(queuePolicy, ACTIVITY_RETENTION_POLICY_KEY)) return queuePolicy;
  const raw = queuePolicy[ACTIVITY_RETENTION_POLICY_KEY];
  if (raw == null || raw === '') {
    const { [ACTIVITY_RETENTION_POLICY_KEY]: _dropped, ...rest } = queuePolicy;
    return rest;
  }
  return {
    ...queuePolicy,
    [ACTIVITY_RETENTION_POLICY_KEY]: clampActivityRetentionDays(raw),
  };
}

export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - clampActivityRetentionDays(days) * 24 * 60 * 60 * 1000);
}

/**
 * Guardrail: a run stays even when it is older than the retention if any action
 * request still pointing at it is not terminal. Pending approvals must keep
 * their trace — `ai_action_requests.run_id` is ON DELETE SET NULL, so purging
 * such a run would silently orphan a proposal the operator can still act on.
 */
export function runIdsSafeToPurge(
  candidateRunIds: readonly string[],
  referencingActions: ReadonlyArray<{ run_id: string | null; status: string | null }>,
): string[] {
  const blocked = new Set<string>();
  for (const action of referencingActions) {
    if (!action.run_id) continue;
    if (!isTerminalActionStatus(action.status)) blocked.add(action.run_id);
  }
  return candidateRunIds.filter((id) => !blocked.has(id));
}
