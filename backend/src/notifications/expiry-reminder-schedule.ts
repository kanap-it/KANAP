/**
 * Expiry warnings (contract cancellation deadline and end date, OPEX end of validity) go out
 * on a fixed schedule: when the deadline is this many calendar days away. Nothing on other
 * days, on the day itself or after. The schedule is stateless, so an api restart cannot
 * cause a repeat or a gap; a day on which the task did not run is simply skipped.
 */
export const EXPIRY_REMINDER_DAYS: readonly number[] = [30, 14, 7, 1];

const DAY_MS = 24 * 60 * 60 * 1000;

/** `today` as a UTC calendar date, `YYYY-MM-DD`. */
export function utcDateYmd(today: Date): string {
  return today.toISOString().slice(0, 10);
}

/**
 * Calendar days from the UTC date of `today` to `deadlineYmd` (`YYYY-MM-DD`): 0 on the day
 * itself, 1 the day before whatever the time of day, negative once it has passed.
 */
export function calendarDaysUntil(deadlineYmd: string, today: Date): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadlineYmd);
  if (!match) throw new Error(`Invalid calendar date: ${deadlineYmd}`);
  const deadline = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((deadline - start) / DAY_MS);
}

export function isExpiryReminderDay(daysUntil: number): boolean {
  return EXPIRY_REMINDER_DAYS.includes(daysUntil);
}
