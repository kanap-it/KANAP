import * as assert from 'node:assert/strict';
import { EXPIRY_REMINDER_DAYS, calendarDaysUntil, isExpiryReminderDay, utcDateYmd } from '../expiry-reminder-schedule';

// Expiry reminders go out when a deadline is 30, 14, 7 or 1 calendar day(s) away, counted
// between UTC calendar dates whatever the time of day.

const at = (iso: string) => new Date(iso);

assert.deepEqual([...EXPIRY_REMINDER_DAYS], [30, 14, 7, 1], 'the fixed schedule');

assert.equal(calendarDaysUntil('2026-09-26', at('2026-09-26T00:00:00Z')), 0, 'same UTC day, midnight');
assert.equal(calendarDaysUntil('2026-09-26', at('2026-09-26T23:59:59Z')), 0, 'same UTC day, last second');
assert.equal(calendarDaysUntil('2026-09-27', at('2026-09-26T08:00:00Z')), 1, 'tomorrow at 08:00 UTC is 1, not 0');
assert.equal(calendarDaysUntil('2026-09-25', at('2026-09-26T08:00:00Z')), -1, 'yesterday');

assert.equal(calendarDaysUntil('2026-10-01', at('2026-09-30T08:00:00Z')), 1, 'across a month boundary');
assert.equal(calendarDaysUntil('2026-10-26', at('2026-09-26T08:00:00Z')), 30, '30 days across a month boundary');
assert.equal(calendarDaysUntil('2027-01-01', at('2026-12-31T08:00:00Z')), 1, 'across a year boundary');
assert.equal(calendarDaysUntil('2027-01-14', at('2026-12-31T08:00:00Z')), 14, '14 days across a year boundary');
assert.equal(calendarDaysUntil('2028-03-01', at('2028-02-28T08:00:00Z')), 2, 'leap day counted');
assert.equal(calendarDaysUntil('2026-11-02', at('2026-10-24T08:00:00Z')), 9, 'across the European DST change');

// An OPEX end of validity is a timestamp: its UTC calendar date counts, not its time.
const today = at('2026-09-26T08:00:00Z');
const endLate = utcDateYmd(at('2026-10-03T21:59:00Z'));
const endNoon = utcDateYmd(at('2026-10-03T12:00:00Z'));
assert.equal(endLate, '2026-10-03');
assert.equal(endNoon, '2026-10-03');
assert.equal(calendarDaysUntil(endLate, today), 7, 'end at 21:59Z');
assert.equal(calendarDaysUntil(endNoon, today), 7, 'end at 12:00Z, same UTC date, same count');

assert.throws(() => calendarDaysUntil('2026-9-3', today), /Invalid calendar date/);

for (const days of [-1, 0, 2, 13, 15, 29, 31]) {
  assert.equal(isExpiryReminderDay(days), false, `${days} is not a reminder day`);
}
for (const days of [30, 14, 7, 1]) {
  assert.equal(isExpiryReminderDay(days), true, `${days} is a reminder day`);
}

console.log('expiry-reminder-schedule: all cases passed');
