/**
 * IANA zone a report reads its dates in. The browser sends its own zone; anything missing or
 * unknown falls back to UTC rather than failing the report.
 */
export function normalizeReportTimeZone(timeZone?: string | null): string {
  const value = String(timeZone || '').trim();
  if (!value) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format(0);
    return value;
  } catch {
    return 'UTC';
  }
}

/** True for a real `YYYY-MM-DD` day: `2026-02-31` has the right shape but does not exist. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
