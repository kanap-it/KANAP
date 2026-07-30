import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import {
  alertMatchesMonitoringTargeting,
  DEFAULT_MONITORING_ALERT_STATUS_VALUES,
  deriveMonitoringTargetingFetchConfig,
  MONITORING_TARGETING_PRESETS,
  MONITORING_TARGETING_SCHEMA_VERSION,
  MonitoringTargetingModel,
  MonitoringTargetPredicate,
  normalizeMonitoringScopePolicy,
  normalizeMonitoringTargeting,
  resolveMonitoringTargetingPredicates,
} from '../control-plane/agent/monitoring-targeting';
import { MonitoringAlert } from '../control-plane/providers/provider.types';

// Deterministic "now" anchored to the mock monitoring dataset epoch.
const NOW = new Date('2026-05-26T10:15:00.000Z');

function buildAlert(overrides: Partial<MonitoringAlert> & Record<string, unknown> = {}): MonitoringAlert {
  return {
    id: 'check-db01-ping',
    status: 'down',
    severity: 'high',
    ackState: 'unacknowledged',
    message: 'Ping timed out (100% packet loss).',
    sensorId: 'check-db01-ping',
    vmId: null,
    relatedTicketId: null,
    observedAt: NOW.toISOString(),
    // 8 minutes before NOW.
    occurrenceStartedAt: '2026-05-26T10:07:00.000Z',
    lastCheckedAt: NOW.toISOString(),
    lastValue: null,
    objectKind: 'check',
    deviceName: 'srv-fr-db01',
    groupPath: ['Probe DC1', 'Production'],
    sourceUri: null,
    dedupKey: 'mock:check-db01-ping:down:2026-05-26T10:07:00.000Z',
    ...overrides,
  } as MonitoringAlert;
}

function model(predicates: MonitoringTargetPredicate[]): MonitoringTargetingModel {
  return normalizeMonitoringTargeting({
    targeting: { schema_version: 1, combinator: 'and', predicates },
  });
}

function rawModel(predicates: MonitoringTargetPredicate[]): MonitoringTargetingModel {
  // Bypasses normalization on purpose (defense-in-depth checks on models that
  // could not have been produced by normalizeMonitoringTargeting).
  return {
    schema_version: MONITORING_TARGETING_SCHEMA_VERSION,
    combinator: 'and',
    predicates,
    resolution: [],
  };
}

async function testNormalizeRoundTripsSeedPlaceholder() {
  // The SRE seed writes this exact inert placeholder into scope_policy_json.
  const seeded = { targeting: { schema_version: 1, combinator: 'and', predicates: [] } };
  const normalized = normalizeMonitoringTargeting(seeded);
  assert.deepEqual(normalized, {
    schema_version: 1,
    combinator: 'and',
    predicates: [],
    resolution: [],
  });

  // Absent targeting block => same empty greenfield model (no legacy path).
  assert.deepEqual(normalizeMonitoringTargeting({}), normalized);
  assert.deepEqual(normalizeMonitoringTargeting(null), normalized);

  // Idempotent: normalizing the normalized output is stable.
  assert.deepEqual(normalizeMonitoringTargeting({ targeting: normalized }), normalized);

  // Scope-policy wrapper preserves sibling keys and rewrites targeting.
  const scope = normalizeMonitoringScopePolicy({ knowledge_sources: { web: { enabled: false } }, ...seeded });
  assert.deepEqual(scope, { knowledge_sources: { web: { enabled: false } }, targeting: normalized });
  assert.equal(normalizeMonitoringScopePolicy(null), null);
}

async function testNormalizeRejectsUnknownFieldOperatorValue() {
  const reject = (predicate: unknown, pattern: RegExp) => {
    assert.throws(
      () => normalizeMonitoringTargeting({ targeting: { schema_version: 1, combinator: 'and', predicates: [predicate] } }),
      (error: unknown) => error instanceof BadRequestException && pattern.test((error as Error).message),
      `expected rejection for ${JSON.stringify(predicate)}`,
    );
  };

  // Unknown field.
  reject({ field: 'sensor_type', operator: 'eq', value: 'ping' }, /Unsupported targeting predicate: sensor_type\./);
  // Operator token outside the monitoring set (no lte).
  reject({ field: 'status', operator: 'lte', value: 'down' }, /operator is unsupported for status/);
  // Valid token, wrong field: status gte, age_minutes eq, severity not.
  reject({ field: 'status', operator: 'gte', value: 'down' }, /Unsupported targeting predicate: status\./);
  reject({ field: 'age_minutes', operator: 'eq', value: 10 }, /Unsupported targeting predicate: age_minutes\./);
  reject({ field: 'severity', operator: 'not', value: ['low'] }, /Unsupported targeting predicate: severity\./);
  // Unknown vocabulary values.
  reject({ field: 'status', operator: 'in', value: ['down', 'bogus'] }, /Unsupported targeting predicate: status\./);
  reject({ field: 'severity', operator: 'gte', value: 'urgent' }, /Unsupported targeting predicate: severity\./);
  reject({ field: 'severity', operator: 'in', value: ['critical', 'urgent'] }, /Unsupported targeting predicate: severity\./);
  reject({ field: 'ack_state', operator: 'eq', value: 'maybe' }, /Unsupported targeting predicate: ack_state\./);
  reject({ field: 'touched_by', operator: 'eq', value: 'other' }, /Unsupported targeting predicate: touched_by\./);
  // touched_by accepts eq/not with 'self' only — other operators/values fail.
  reject({ field: 'touched_by', operator: 'not', value: 'other' }, /Unsupported targeting predicate: touched_by\./);
  reject({ field: 'touched_by', operator: 'gte', value: 'self' }, /Unsupported targeting predicate: touched_by\./);
  // Flap guard needs a positive minute count.
  reject({ field: 'age_minutes', operator: 'gte', value: 0 }, /Unsupported targeting predicate: age_minutes\./);
  reject({ field: 'age_minutes', operator: 'gte', value: -5 }, /Unsupported targeting predicate: age_minutes\./);
  // Empty reference lists fail closed instead of silently matching nothing.
  reject({ field: 'group', operator: 'in', value: [] }, /Unsupported targeting predicate: group\./);
  reject({ field: 'group', operator: 'in', value: ['ok', ''] }, /Unsupported targeting predicate: group\./);
  // Structural rejections mirror the service-desk normalizer.
  reject({ field: 'status', operator: 'in', value: 'down' }, /requires an array value for "in"/);
  reject({ field: 'status', operator: 'in', value: ['down'], or: [] }, /AND predicates only/);
  reject('not-an-object', /must be objects/);
  reject({ field: '9bad', operator: 'eq', value: 'x' }, /field is invalid/);

  // Classification surfaces unsupported entries with a reason (UI contract).
  const resolutions = resolveMonitoringTargetingPredicates([
    { field: 'sensor_type', operator: 'eq', value: 'ping' },
    { field: 'status', operator: 'in', value: ['down'] },
    { field: 'severity', operator: 'in', value: ['critical'] },
    { field: 'touched_by', operator: 'eq', value: 'self' },
    { field: 'touched_by', operator: 'not', value: 'self' },
  ]);
  assert.equal(resolutions[0].resolution, 'unsupported');
  assert.ok(resolutions[0].reason.length > 0);
  assert.equal(resolutions[1].resolution, 'pushed_down');
  assert.equal(resolutions[2].resolution, 'locally_filtered_bounded_fetch');
  assert.equal(resolutions[3].resolution, 'control_plane_resolved');
  assert.equal(resolutions[4].resolution, 'control_plane_resolved');
}

async function testUnsupportedPredicatesExcludedFromDerivation() {
  // A model carrying an unknown field cannot come out of normalize; if one is
  // ever constructed anyway, derivation contributes nothing for it.
  const scope = deriveMonitoringTargetingFetchConfig(
    rawModel([{ field: 'sensor_type', operator: 'eq', value: 'ping' }]),
    { maxResults: 25 },
  );
  assert.deepEqual(scope, {
    statusValues: [...DEFAULT_MONITORING_ALERT_STATUS_VALUES],
    severityFloor: null,
    ackState: null,
    groupIds: null,
    deviceIds: null,
    checkTypeIds: null,
    minAgeMinutes: null,
    maxResults: 25,
  });
  // ...and the matcher fails closed on it.
  assert.equal(alertMatchesMonitoringTargeting(buildAlert(), rawModel([{ field: 'sensor_type', operator: 'eq', value: 'ping' }]), { now: NOW }), false);
}

async function testDerivationMatrix() {
  const derive = (predicates: MonitoringTargetPredicate[], maxResults = 20) =>
    deriveMonitoringTargetingFetchConfig(model(predicates), { maxResults });

  // Empty predicates => default non-up statuses, nothing else constrained.
  // paused/unknown/up are deliberately NOT fetched by default: up has no alert
  // condition, paused is operator-chosen suppression, unknown is not
  // actionable. Explicit status predicates can still target them.
  const empty = derive([], 40);
  assert.deepEqual(empty.statusValues, ['down', 'down_partial', 'warning', 'unusual']);
  assert.equal(empty.severityFloor, null);
  assert.equal(empty.ackState, null);
  assert.equal(empty.groupIds, null);
  assert.equal(empty.deviceIds, null);
  assert.equal(empty.checkTypeIds, null);
  assert.equal(empty.minAgeMinutes, null);
  assert.equal(empty.maxResults, 40);

  // status eq/in select; multiple positive predicates intersect.
  assert.deepEqual(derive([{ field: 'status', operator: 'in', value: ['down', 'warning'] }]).statusValues, ['down', 'warning']);
  assert.deepEqual(derive([{ field: 'status', operator: 'eq', value: 'Paused' }]).statusValues, ['paused']);
  assert.deepEqual(
    derive([
      { field: 'status', operator: 'in', value: ['down', 'warning'] },
      { field: 'status', operator: 'in', value: ['warning', 'unusual'] },
    ]).statusValues,
    ['warning'],
  );
  // status not subtracts from the working set (never widens past the default).
  assert.deepEqual(derive([{ field: 'status', operator: 'not', value: ['down'] }]).statusValues, ['down_partial', 'warning', 'unusual']);

  // severity gte => floor (highest floor wins); in/eq lists stay local-only.
  assert.equal(derive([{ field: 'severity', operator: 'gte', value: 'high' }]).severityFloor, 'high');
  assert.equal(
    derive([
      { field: 'severity', operator: 'gte', value: 'high' },
      { field: 'severity', operator: 'gte', value: 'critical' },
    ]).severityFloor,
    'critical',
  );
  assert.equal(derive([{ field: 'severity', operator: 'in', value: ['critical'] }]).severityFloor, null);

  // ack_state eq.
  assert.equal(derive([{ field: 'ack_state', operator: 'eq', value: 'unacknowledged' }]).ackState, 'unacknowledged');

  // group/device/check_type reference ids; eq+in intersect.
  assert.deepEqual(derive([{ field: 'group', operator: 'in', value: ['mock-group-prod', 'mock-group-lab'] }]).groupIds, ['mock-group-prod', 'mock-group-lab']);
  assert.deepEqual(
    derive([
      { field: 'group', operator: 'in', value: ['mock-group-prod', 'mock-group-lab'] },
      { field: 'group', operator: 'eq', value: 'mock-group-prod' },
    ]).groupIds,
    ['mock-group-prod'],
  );
  assert.deepEqual(derive([{ field: 'device', operator: 'eq', value: 'mock-device-db-01' }]).deviceIds, ['mock-device-db-01']);
  assert.deepEqual(derive([{ field: 'check_type', operator: 'in', value: ['mock-checktype-ping'] }]).checkTypeIds, ['mock-checktype-ping']);

  // age gte => flap guard floor (max wins).
  assert.equal(derive([{ field: 'age_minutes', operator: 'gte', value: 10 }]).minAgeMinutes, 10);
  assert.equal(
    derive([
      { field: 'age_minutes', operator: 'gte', value: 5 },
      { field: 'age_minutes', operator: 'gte', value: 15 },
    ]).minAgeMinutes,
    15,
  );

  // touched_by never reaches the provider scope (either operator).
  assert.deepEqual(derive([{ field: 'touched_by', operator: 'eq', value: 'self' }]), derive([]));
  assert.deepEqual(derive([{ field: 'touched_by', operator: 'not', value: 'self' }]), derive([]));
}

async function testMatcherMatrix() {
  const matches = (alert: MonitoringAlert, predicates: MonitoringTargetPredicate[], context: { touchedBySelf?: boolean } = {}) =>
    alertMatchesMonitoringTargeting(alert, model(predicates), { ...context, now: NOW });

  // Empty model matches everything.
  assert.equal(matches(buildAlert(), []), true);

  // Status membership + not.
  assert.equal(matches(buildAlert({ status: 'down' }), [{ field: 'status', operator: 'in', value: ['down', 'down_partial'] }]), true);
  assert.equal(matches(buildAlert({ status: 'warning' }), [{ field: 'status', operator: 'in', value: ['down', 'down_partial'] }]), false);
  assert.equal(matches(buildAlert({ status: 'down' }), [{ field: 'status', operator: 'not', value: ['down'] }]), false);
  assert.equal(matches(buildAlert({ status: 'warning' }), [{ field: 'status', operator: 'not', value: ['down'] }]), true);

  // Severity ladder edges: gte floor is inclusive.
  assert.equal(matches(buildAlert({ severity: 'high' }), [{ field: 'severity', operator: 'gte', value: 'high' }]), true);
  assert.equal(matches(buildAlert({ severity: 'critical' }), [{ field: 'severity', operator: 'gte', value: 'high' }]), true);
  assert.equal(matches(buildAlert({ severity: 'medium' }), [{ field: 'severity', operator: 'gte', value: 'high' }]), false);
  assert.equal(matches(buildAlert({ severity: 'very_low' }), [{ field: 'severity', operator: 'gte', value: 'very_low' }]), true);
  assert.equal(matches(buildAlert({ severity: 'high' }), [{ field: 'severity', operator: 'in', value: ['critical'] }]), false);
  assert.equal(matches(buildAlert({ severity: 'medium' }), [{ field: 'severity', operator: 'eq', value: 'medium' }]), true);

  // Ack state.
  assert.equal(matches(buildAlert({ ackState: 'unacknowledged' }), [{ field: 'ack_state', operator: 'eq', value: 'unacknowledged' }]), true);
  assert.equal(matches(buildAlert({ ackState: 'acknowledged' }), [{ field: 'ack_state', operator: 'eq', value: 'unacknowledged' }]), false);

  // Group: exact ref id when the adapter exposes one, else groupPath fallback
  // (case-insensitive) — id-scoped pushdown, path covers name-based refs.
  assert.equal(matches(buildAlert(), [{ field: 'group', operator: 'in', value: ['Production'] }]), true);
  assert.equal(matches(buildAlert(), [{ field: 'group', operator: 'eq', value: 'production' }]), true);
  assert.equal(matches(buildAlert({ groupId: 'mock-group-prod' }), [{ field: 'group', operator: 'eq', value: 'mock-group-prod' }]), true);
  assert.equal(matches(buildAlert(), [{ field: 'group', operator: 'eq', value: 'mock-group-prod' }]), false);
  assert.equal(matches(buildAlert({ groupPath: null }), [{ field: 'group', operator: 'eq', value: 'production' }]), false);

  // Device: ref id when present, else deviceName (case-insensitive).
  assert.equal(matches(buildAlert(), [{ field: 'device', operator: 'eq', value: 'SRV-FR-DB01' }]), true);
  assert.equal(matches(buildAlert({ deviceId: 'mock-device-db-01' }), [{ field: 'device', operator: 'eq', value: 'mock-device-db-01' }]), true);
  assert.equal(matches(buildAlert(), [{ field: 'device', operator: 'eq', value: 'mock-device-db-01' }]), false);
  assert.equal(matches(buildAlert({ deviceName: null }), [{ field: 'device', operator: 'eq', value: 'srv-fr-db01' }]), false);

  // Check type: fails closed without adapter metadata, never a silent pass.
  assert.equal(matches(buildAlert(), [{ field: 'check_type', operator: 'in', value: ['mock-checktype-ping'] }]), false);
  assert.equal(matches(buildAlert({ checkTypeId: 'mock-checktype-ping' }), [{ field: 'check_type', operator: 'in', value: ['mock-checktype-ping'] }]), true);
  assert.equal(matches(buildAlert({ checkTypeId: 'mock-checktype-cpu' }), [{ field: 'check_type', operator: 'in', value: ['mock-checktype-ping'] }]), false);

  // Age: occurrence is 8 minutes old at NOW; null occurrence fails the guard.
  assert.equal(matches(buildAlert(), [{ field: 'age_minutes', operator: 'gte', value: 5 }]), true);
  assert.equal(matches(buildAlert(), [{ field: 'age_minutes', operator: 'gte', value: 8 }]), true);
  assert.equal(matches(buildAlert(), [{ field: 'age_minutes', operator: 'gte', value: 10 }]), false);
  assert.equal(matches(buildAlert({ occurrenceStartedAt: null }), [{ field: 'age_minutes', operator: 'gte', value: 5 }]), false);

  // touched_by=self resolves from control-plane context only.
  assert.equal(matches(buildAlert(), [{ field: 'touched_by', operator: 'eq', value: 'self' }], { touchedBySelf: true }), true);
  assert.equal(matches(buildAlert(), [{ field: 'touched_by', operator: 'eq', value: 'self' }], { touchedBySelf: false }), false);
  assert.equal(matches(buildAlert(), [{ field: 'touched_by', operator: 'eq', value: 'self' }]), false);
  // touched_by not self = skip alerts this agent already handled.
  assert.equal(matches(buildAlert(), [{ field: 'touched_by', operator: 'not', value: 'self' }], { touchedBySelf: true }), false);
  assert.equal(matches(buildAlert(), [{ field: 'touched_by', operator: 'not', value: 'self' }], { touchedBySelf: false }), true);
  assert.equal(matches(buildAlert(), [{ field: 'touched_by', operator: 'not', value: 'self' }]), true);
}

async function testPresets() {
  assert.deepEqual(
    MONITORING_TARGETING_PRESETS.map((preset) => preset.key),
    ['unacknowledged_down', 'critical_and_high', 'stable_down_10min'],
  );

  for (const preset of MONITORING_TARGETING_PRESETS) {
    // Factories return fresh arrays and every preset normalizes cleanly.
    assert.notEqual(preset.predicates(), preset.predicates());
    const normalized = model(preset.predicates());
    assert.equal(normalized.predicates.length, preset.predicates().length);
    assert.ok(normalized.resolution.every((entry) => entry.resolution !== 'unsupported'));
  }

  const scopeFor = (key: string) => {
    const preset = MONITORING_TARGETING_PRESETS.find((entry) => entry.key === key);
    assert.ok(preset, `missing preset ${key}`);
    return deriveMonitoringTargetingFetchConfig(model(preset.predicates()), { maxResults: 20 });
  };

  const unackedDown = scopeFor('unacknowledged_down');
  assert.deepEqual(unackedDown.statusValues, ['down', 'down_partial']);
  assert.equal(unackedDown.ackState, 'unacknowledged');

  const criticalHigh = scopeFor('critical_and_high');
  assert.equal(criticalHigh.severityFloor, 'high');
  assert.deepEqual(criticalHigh.statusValues, [...DEFAULT_MONITORING_ALERT_STATUS_VALUES]);

  const stableDown = scopeFor('stable_down_10min');
  assert.deepEqual(stableDown.statusValues, ['down', 'down_partial']);
  assert.equal(stableDown.minAgeMinutes, 10);
}

async function run() {
  await testNormalizeRoundTripsSeedPlaceholder();
  await testNormalizeRejectsUnknownFieldOperatorValue();
  await testUnsupportedPredicatesExcludedFromDerivation();
  await testDerivationMatrix();
  await testMatcherMatrix();
  await testPresets();
}

void run();
