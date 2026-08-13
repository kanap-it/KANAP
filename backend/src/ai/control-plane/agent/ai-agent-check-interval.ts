/**
 * Check frequency: how often a watching agent looks for new work.
 *
 * Storage (no migration): `trigger_policy_json.scheduled_poll.interval_minutes`.
 * The scheduled poll is exactly what this paces, and every writer that touches
 * the trigger policy — the built-in reconcilers in the work-queue service, the
 * run-mode control (`updateAgentStatus`), and both frontend settings payload
 * builders — spreads the existing `scheduled_poll` object instead of replacing
 * it, so an unknown key survives untouched.
 *
 * The platform cron keeps ticking every 5 minutes; it is the clock, not the
 * schedule. A definition whose interval has not elapsed since its last completed
 * check is simply skipped for that tick (skip-until-due), silently: no audit
 * event, no timeline noise.
 *
 * Manual checks ("Check now") ignore the interval entirely — an operator asking
 * for a check is an explicit decision, exactly like the failure-backoff bypass.
 */

export const CHECK_INTERVAL_DEFAULT_MINUTES = 5;
export const CHECK_INTERVAL_MIN_MINUTES = 5;
/** One day. Time-of-day windows are a separate, later feature. */
export const CHECK_INTERVAL_MAX_MINUTES = 1440;

export const CHECK_INTERVAL_POLICY_KEY = 'interval_minutes';

/**
 * The platform tick the pollers are registered on. Due-ness is evaluated with
 * half a tick of grace, otherwise a 5-minute interval would never fire on a
 * 5-minute cron: the previous cycle's completion timestamp always lands a few
 * seconds INTO the tick, leaving the next tick a few seconds short and pushing
 * every check to 10 minutes.
 */
export const SCHEDULED_CHECK_TICK_SECONDS = 300;

function policyRecord(value: unknown): Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/** Clamp to [5, 1440] whole minutes; anything unusable falls back to the default. */
export function clampCheckIntervalMinutes(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return CHECK_INTERVAL_DEFAULT_MINUTES;
  const whole = Math.floor(parsed);
  if (whole < CHECK_INTERVAL_MIN_MINUTES) return CHECK_INTERVAL_MIN_MINUTES;
  if (whole > CHECK_INTERVAL_MAX_MINUTES) return CHECK_INTERVAL_MAX_MINUTES;
  return whole;
}

/**
 * Interval configured on an agent. An absent key means "never configured" and
 * resolves to the default — not to the clamp of `undefined`.
 */
export function checkIntervalMinutesForDefinition(
  definition: { trigger_policy_json?: Record<string, unknown> | null } | null | undefined,
): number {
  const scheduledPoll = policyRecord(policyRecord(definition?.trigger_policy_json).scheduled_poll);
  const raw = scheduledPoll[CHECK_INTERVAL_POLICY_KEY];
  if (raw == null || raw === '') return CHECK_INTERVAL_DEFAULT_MINUTES;
  return clampCheckIntervalMinutes(raw);
}

/**
 * Normalize the interval inside a trigger policy about to be persisted: clamped
 * server-side so a crafted payload can never poll faster than the platform tick
 * (nor park an agent beyond a day). Absent stays absent (= default).
 */
export function normalizeTriggerPolicyCheckInterval(
  triggerPolicy: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!triggerPolicy || typeof triggerPolicy !== 'object' || Array.isArray(triggerPolicy)) return triggerPolicy;
  if (!Object.prototype.hasOwnProperty.call(triggerPolicy, 'scheduled_poll')) return triggerPolicy;
  const scheduledPoll = triggerPolicy.scheduled_poll;
  if (!scheduledPoll || typeof scheduledPoll !== 'object' || Array.isArray(scheduledPoll)) return triggerPolicy;
  const block = scheduledPoll as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(block, CHECK_INTERVAL_POLICY_KEY)) return triggerPolicy;
  const raw = block[CHECK_INTERVAL_POLICY_KEY];
  if (raw == null || raw === '') {
    const { [CHECK_INTERVAL_POLICY_KEY]: _dropped, ...rest } = block;
    return { ...triggerPolicy, scheduled_poll: rest };
  }
  return {
    ...triggerPolicy,
    scheduled_poll: { ...block, [CHECK_INTERVAL_POLICY_KEY]: clampCheckIntervalMinutes(raw) },
  };
}

function parseDateMs(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Is a scheduled check due for this agent?
 *
 * `lastPollAt` is the poller's own `last_poll_at` marker (written into
 * `metadata_json.<flavor>_ingestion_state` when a cycle completes, fails, or is
 * paused) — the cheapest reliable "last check" signal, already maintained by
 * both pollers and already surfaced in the UI.
 *
 * An agent that has never polled is always due.
 */
export function scheduledCheckDue(opts: {
  lastPollAt: unknown;
  intervalMinutes: number;
  now: number;
}): { due: boolean; nextDueAt: number | null } {
  const intervalMs = clampCheckIntervalMinutes(opts.intervalMinutes) * 60_000;
  const lastMs = parseDateMs(opts.lastPollAt);
  if (lastMs == null) return { due: true, nextDueAt: null };
  // Half a platform tick of grace, never more than half the interval itself.
  const graceMs = Math.min(SCHEDULED_CHECK_TICK_SECONDS * 1000 / 2, intervalMs / 2);
  const nextDueAt = lastMs + intervalMs;
  return { due: opts.now >= nextDueAt - graceMs, nextDueAt };
}

/**
 * Upper bound on how many scheduled checks an interval allows per day. Used to
 * keep the targeting "runs per day" estimate honest — it can never exceed what
 * the schedule itself permits.
 */
export function checksPerDay(intervalMinutes: number): number {
  return Math.max(1, Math.floor(1440 / clampCheckIntervalMinutes(intervalMinutes)));
}
