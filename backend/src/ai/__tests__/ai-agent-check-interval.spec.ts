import * as assert from 'node:assert/strict';
import {
  CHECK_INTERVAL_DEFAULT_MINUTES,
  CHECK_INTERVAL_MAX_MINUTES,
  CHECK_INTERVAL_MIN_MINUTES,
  checkIntervalMinutesForDefinition,
  checksPerDay,
  clampCheckIntervalMinutes,
  normalizeTriggerPolicyCheckInterval,
  scheduledCheckDue,
} from '../control-plane/agent/ai-agent-check-interval';
import {
  AUTONOMY_RISK_TIER_BY_ACTION_CLASS,
  autonomyGrantRequiresAcknowledgement,
  autonomyRiskTier,
  approvedCapabilityForAutonomyActionClass,
  isAutomatableAutonomyActionClass,
} from '../control-plane/agent/ai-agent-autonomy';

// ---------------------------------------------------------------------------
// 1. Check-frequency clamping.
// ---------------------------------------------------------------------------

function testIntervalClamping() {
  assert.equal(clampCheckIntervalMinutes(15), 15);
  // Below the platform tick: clamped up, never allowed to outpace the cron.
  assert.equal(clampCheckIntervalMinutes(1), CHECK_INTERVAL_MIN_MINUTES);
  assert.equal(clampCheckIntervalMinutes(0), CHECK_INTERVAL_MIN_MINUTES);
  assert.equal(clampCheckIntervalMinutes(-30), CHECK_INTERVAL_MIN_MINUTES);
  // Beyond a day: clamped down.
  assert.equal(clampCheckIntervalMinutes(100_000), CHECK_INTERVAL_MAX_MINUTES);
  // Unusable input falls back to the default, not to a clamped NaN.
  assert.equal(clampCheckIntervalMinutes('nonsense'), CHECK_INTERVAL_DEFAULT_MINUTES);
  assert.equal(clampCheckIntervalMinutes(null), CHECK_INTERVAL_DEFAULT_MINUTES);
  assert.equal(clampCheckIntervalMinutes(undefined), CHECK_INTERVAL_DEFAULT_MINUTES);
  // Whole minutes only.
  assert.equal(clampCheckIntervalMinutes(12.9), 12);
  // Numeric strings from a form field are accepted.
  assert.equal(clampCheckIntervalMinutes('30'), 30);
}

function testIntervalReadFromDefinition() {
  assert.equal(checkIntervalMinutesForDefinition(null), CHECK_INTERVAL_DEFAULT_MINUTES);
  assert.equal(checkIntervalMinutesForDefinition({}), CHECK_INTERVAL_DEFAULT_MINUTES);
  // Never configured: the default, not the clamp of undefined.
  assert.equal(
    checkIntervalMinutesForDefinition({ trigger_policy_json: { scheduled_poll: { enabled: true } } }),
    CHECK_INTERVAL_DEFAULT_MINUTES,
  );
  assert.equal(
    checkIntervalMinutesForDefinition({ trigger_policy_json: { scheduled_poll: { enabled: true, interval_minutes: 60 } } }),
    60,
  );
  // A value written straight into the column (older row, crafted payload) is
  // still clamped on read.
  assert.equal(
    checkIntervalMinutesForDefinition({ trigger_policy_json: { scheduled_poll: { interval_minutes: 1 } } }),
    CHECK_INTERVAL_MIN_MINUTES,
  );
}

function testTriggerPolicyNormalization() {
  // Absent key stays absent — an untouched policy round-trips identically.
  const untouched = { scheduled_poll: { enabled: true }, provider_webhook: { enabled: false } };
  assert.deepEqual(normalizeTriggerPolicyCheckInterval(untouched), untouched);
  assert.equal(normalizeTriggerPolicyCheckInterval(null), null);
  // No scheduled_poll block at all: nothing to normalize.
  assert.deepEqual(normalizeTriggerPolicyCheckInterval({ manual_safe_target: { enabled: true } }),
    { manual_safe_target: { enabled: true } });

  // Out-of-bounds values are clamped server-side, never trusted from the client.
  assert.deepEqual(
    normalizeTriggerPolicyCheckInterval({ scheduled_poll: { enabled: true, interval_minutes: 1 } }),
    { scheduled_poll: { enabled: true, interval_minutes: CHECK_INTERVAL_MIN_MINUTES } },
  );
  assert.deepEqual(
    normalizeTriggerPolicyCheckInterval({ scheduled_poll: { enabled: true, interval_minutes: 99_999 } }),
    { scheduled_poll: { enabled: true, interval_minutes: CHECK_INTERVAL_MAX_MINUTES } },
  );
  // Clearing the field drops the key (= back to the default), it does not store 0.
  assert.deepEqual(
    normalizeTriggerPolicyCheckInterval({ scheduled_poll: { enabled: true, interval_minutes: '' } }),
    { scheduled_poll: { enabled: true } },
  );
  // Sibling keys of both objects survive.
  assert.deepEqual(
    normalizeTriggerPolicyCheckInterval({
      manual_safe_target: { enabled: true },
      scheduled_poll: { enabled: true, interval_minutes: 45, some_future_key: 'kept' },
    }),
    {
      manual_safe_target: { enabled: true },
      scheduled_poll: { enabled: true, interval_minutes: 45, some_future_key: 'kept' },
    },
  );
}

// ---------------------------------------------------------------------------
// 2. Skip-until-due scheduling.
// ---------------------------------------------------------------------------

const MINUTE = 60_000;

function testSkipUntilDue() {
  const now = Date.parse('2026-08-11T12:00:00.000Z');

  // Never polled: always due.
  assert.deepEqual(scheduledCheckDue({ lastPollAt: null, intervalMinutes: 60, now }), { due: true, nextDueAt: null });
  assert.equal(scheduledCheckDue({ lastPollAt: 'not-a-date', intervalMinutes: 60, now }).due, true);

  // Hourly agent, checked 10 minutes ago: not due.
  const tenMinutesAgo = new Date(now - 10 * MINUTE).toISOString();
  const notDue = scheduledCheckDue({ lastPollAt: tenMinutesAgo, intervalMinutes: 60, now });
  assert.equal(notDue.due, false);
  assert.equal(notDue.nextDueAt, now + 50 * MINUTE);

  // Same agent, checked 61 minutes ago: due.
  const anHourAgo = new Date(now - 61 * MINUTE).toISOString();
  assert.equal(scheduledCheckDue({ lastPollAt: anHourAgo, intervalMinutes: 60, now }).due, true);

  // The default 5-minute interval must still fire on the 5-minute cron. The
  // previous cycle's completion timestamp always lands INTO the tick, so a
  // strict comparison would silently halve the frequency. Half a tick of grace
  // keeps it honest.
  const fourMinutesThirtyAgo = new Date(now - 4.5 * MINUTE).toISOString();
  assert.equal(
    scheduledCheckDue({ lastPollAt: fourMinutesThirtyAgo, intervalMinutes: 5, now }).due,
    true,
    'a 5-minute agent must be due on the next 5-minute tick',
  );
  // The grace never turns a long interval into a short one: 10 minutes cannot
  // fire after 5.
  assert.equal(
    scheduledCheckDue({ lastPollAt: new Date(now - 5 * MINUTE).toISOString(), intervalMinutes: 10, now }).due,
    false,
  );
  assert.equal(
    scheduledCheckDue({ lastPollAt: new Date(now - 8 * MINUTE).toISOString(), intervalMinutes: 10, now }).due,
    true,
  );
  // A day-long interval is not softened by 2.5 minutes of grace either.
  assert.equal(
    scheduledCheckDue({ lastPollAt: new Date(now - 1400 * MINUTE).toISOString(), intervalMinutes: 1440, now }).due,
    false,
  );

  // An unusable stored interval falls back to the default, it never blocks forever.
  assert.equal(
    scheduledCheckDue({ lastPollAt: new Date(now - 6 * MINUTE).toISOString(), intervalMinutes: Number.NaN, now }).due,
    true,
  );
}

function testManualChecksBypassTheInterval() {
  // The pollers only evaluate due-ness on the scheduled path (`if (!opts.manual)`),
  // so a manual "Check now" runs whatever the interval says. This asserts the
  // shape the pollers rely on: a fresh poll IS not-due, which is precisely what
  // the manual path must not consult.
  const now = Date.parse('2026-08-11T12:00:00.000Z');
  const justPolled = new Date(now - 30_000).toISOString();
  assert.equal(scheduledCheckDue({ lastPollAt: justPolled, intervalMinutes: 1440, now }).due, false);
}

function testChecksPerDayCeiling() {
  assert.equal(checksPerDay(5), 288);
  assert.equal(checksPerDay(60), 24);
  assert.equal(checksPerDay(1440), 1);
  // Clamped input, and never zero.
  assert.equal(checksPerDay(1), 288);
  assert.equal(checksPerDay(100_000), 1);
}

// ---------------------------------------------------------------------------
// 3. Autonomy risk tiers.
// ---------------------------------------------------------------------------

function testRiskTierMap() {
  assert.deepEqual(AUTONOMY_RISK_TIER_BY_ACTION_CLASS, {
    internal_note: 'low',
    classification: 'low',
    status: 'low',
    public_reply: 'high',
    assignment: 'high',
    participant: 'high',
  });
  for (const actionClass of ['internal_note', 'classification', 'status'] as const) {
    assert.equal(autonomyRiskTier(actionClass), 'low');
    assert.equal(isAutomatableAutonomyActionClass(actionClass), true);
    assert.equal(autonomyGrantRequiresAcknowledgement(actionClass), false);
    assert.ok(approvedCapabilityForAutonomyActionClass(actionClass), `${actionClass} needs an approved capability`);
  }
  for (const actionClass of ['public_reply', 'assignment', 'participant'] as const) {
    assert.equal(autonomyRiskTier(actionClass), 'high');
    assert.equal(isAutomatableAutonomyActionClass(actionClass), true);
    assert.equal(autonomyGrantRequiresAcknowledgement(actionClass), true);
    // High-tier classes are automatable now, so they need an approved
    // capability mapping — without one the grant would fail closed.
    assert.ok(approvedCapabilityForAutonomyActionClass(actionClass), `${actionClass} needs an approved capability`);
  }
  // Anything outside the map stays non-automatable.
  assert.equal(autonomyRiskTier('ticket_delete'), null);
  assert.equal(isAutomatableAutonomyActionClass('ticket_delete'), false);
  assert.equal(isAutomatableAutonomyActionClass(null), false);
  assert.equal(autonomyGrantRequiresAcknowledgement('ticket_delete'), false);
}

function run() {
  testIntervalClamping();
  testIntervalReadFromDefinition();
  testTriggerPolicyNormalization();
  testSkipUntilDue();
  testManualChecksBypassTheInterval();
  testChecksPerDayCeiling();
  testRiskTierMap();
  console.log('ai-agent-check-interval.spec: all tests passed');
}

run();
