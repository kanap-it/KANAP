import {
  AdapterResult,
  MonitoredObjectRecord,
  MonitoringAlert,
  MonitoringAlertListScope,
  MonitoringCurrentState,
  MonitoringProvider,
  MonitoringReferenceCatalogKind,
  MonitoringReferenceEnums,
  MonitoringSensorHistory,
  ProviderContext,
  RefItem,
} from '../provider.types';
import {
  MONITORING_ACK_STATES,
  MONITORING_ALERT_STATUS_VALUES,
  MONITORING_SEVERITY_VALUES,
} from '../provider-constants';
import {
  errorForScenario,
  evidenceSeed,
  MALICIOUS_EXTERNAL_TEXT,
  mockApplicability,
  MOCK_COLLECTED_AT,
  mockHealth,
  ok,
  providerError,
} from './mock-provider.helpers';

// Deterministic monitored tree: probe > 2 groups > 3 devices > checks.
// MOCK_COLLECTED_AT is "now" for every age computation so scope filtering
// stays reproducible in tests.
const MOCK_PROBE_PATH = ['Probe DC1'];
const MOCK_PROD_PATH = ['Probe DC1', 'Production'];
const MOCK_LAB_PATH = ['Probe DC1', 'Lab'];

function mockSourceUri(objectId: string): string {
  return `https://monitoring.mock.local/object/${objectId}`;
}

function buildMockAlert(input: Omit<MonitoringAlert, 'dedupKey' | 'sourceUri'>): MonitoringAlert {
  return {
    ...input,
    sourceUri: mockSourceUri(input.id),
    // Occurrence-scoped dedup key: provider key + object id + normalized
    // status + occurrence start (D4).
    dedupKey: `mock:${input.id}:${input.status}:${input.occurrenceStartedAt ?? 'none'}`,
  };
}

type MockMonitoredCheck = {
  alert: MonitoringAlert;
  groupId: string;
  deviceId: string;
  checkTypeId: string;
};

// Alert lifecycle scenarios covered (in dataset order): fresh down (unacked),
// long-down acked, warning, unusual, paused, flapping (very recent
// occurrence), cleared-then-refired (new occurrenceStartedAt vs the cleared
// one), prompt-injection message, and one healthy `up` check so status
// filtering is observable.
// The provider-ref ids also ride on the alert itself (optional MonitoringAlert
// metadata, adapter parity with PRTG): the control-plane targeting matcher
// verifies group/device/check_type predicates against them — id-authored
// predicates would never match the name-based alert fields.
function mockMonitoredChecks(): MockMonitoredCheck[] {
  return mockMonitoredChecksRaw().map((check) => ({
    ...check,
    alert: {
      ...check.alert,
      groupId: check.groupId,
      deviceId: check.deviceId,
      checkTypeId: check.checkTypeId,
    },
  }));
}

function mockMonitoredChecksRaw(): MockMonitoredCheck[] {
  return [
    {
      // Fresh down, unacknowledged — 8 minutes old, passes a 5-minute flap guard.
      groupId: 'mock-group-prod',
      deviceId: 'mock-device-db-01',
      checkTypeId: 'mock-checktype-ping',
      alert: buildMockAlert({
        id: 'mock-check-db01-ping',
        status: 'down',
        severity: 'critical',
        ackState: 'unacknowledged',
        message: 'Ping timed out (100% packet loss).',
        sensorId: 'mock-check-db01-ping',
        vmId: null,
        relatedTicketId: null,
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: '2026-05-26T10:07:00.000Z',
        lastCheckedAt: MOCK_COLLECTED_AT,
        lastValue: null,
        objectKind: 'check',
        deviceName: 'srv-fr-db01',
        checkName: 'Ping',
        groupPath: MOCK_PROD_PATH,
      }),
    },
    {
      // Long-down, acknowledged ~36 hours ago.
      groupId: 'mock-group-lab',
      deviceId: 'mock-device-lab-fw-01',
      checkTypeId: 'mock-checktype-http',
      alert: buildMockAlert({
        id: 'mock-check-labfw-http',
        status: 'down',
        severity: 'high',
        ackState: 'acknowledged',
        message: 'Connection refused on port 443.',
        sensorId: 'mock-check-labfw-http',
        vmId: null,
        relatedTicketId: null,
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: '2026-05-24T22:40:00.000Z',
        lastCheckedAt: '2026-05-26T10:14:00.000Z',
        lastValue: null,
        objectKind: 'check',
        deviceName: 'fw-lab-edge01',
        checkName: 'HTTPS',
        groupPath: MOCK_LAB_PATH,
      }),
    },
    {
      // Warning — keeps the legacy well-known ids used across specs and the
      // read-only diagnostic workflow.
      groupId: 'mock-group-prod',
      deviceId: 'mock-device-sap-app-03',
      checkTypeId: 'mock-checktype-cpu',
      alert: buildMockAlert({
        id: 'mock-sensor-cpu-001',
        status: 'warning',
        severity: 'medium',
        ackState: 'unacknowledged',
        message: 'CPU sustained > 85% on srv-fr-sap-app03',
        sensorId: 'mock-sensor-cpu-001',
        vmId: 'mock-vm-sap-app-03',
        relatedTicketId: 'mock-ticket-1001',
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: '2026-05-26T09:45:00.000Z',
        lastCheckedAt: MOCK_COLLECTED_AT,
        lastValue: '89 %',
        objectKind: 'check',
        deviceName: 'srv-fr-sap-app03',
        checkName: 'CPU load',
        groupPath: MOCK_PROD_PATH,
      }),
    },
    {
      // Unusual — anomaly detection state.
      groupId: 'mock-group-prod',
      deviceId: 'mock-device-sap-app-03',
      checkTypeId: 'mock-checktype-traffic',
      alert: buildMockAlert({
        id: 'mock-check-sap-traffic',
        status: 'unusual',
        severity: 'low',
        ackState: 'unacknowledged',
        message: 'Traffic volume unusual for this weekday.',
        sensorId: 'mock-check-sap-traffic',
        vmId: 'mock-vm-sap-app-03',
        relatedTicketId: null,
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: '2026-05-26T10:00:00.000Z',
        lastCheckedAt: MOCK_COLLECTED_AT,
        lastValue: '412 Mbit/s',
        objectKind: 'check',
        deviceName: 'srv-fr-sap-app03',
        checkName: 'Network traffic',
        groupPath: MOCK_PROD_PATH,
      }),
    },
    {
      // Paused by maintenance — no occurrence, no fresh check timestamp.
      groupId: 'mock-group-prod',
      deviceId: 'mock-device-db-01',
      checkTypeId: 'mock-checktype-backup',
      alert: buildMockAlert({
        id: 'mock-check-db01-backup',
        status: 'paused',
        severity: 'very_low',
        ackState: 'unacknowledged',
        message: 'Paused by maintenance window.',
        sensorId: 'mock-check-db01-backup',
        vmId: null,
        relatedTicketId: null,
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: null,
        lastCheckedAt: null,
        lastValue: null,
        objectKind: 'check',
        deviceName: 'srv-fr-db01',
        checkName: 'Backup job',
        groupPath: MOCK_PROD_PATH,
      }),
    },
    {
      // Flapping — occurrence started 1 minute ago, must be excluded by any
      // minAgeMinutes >= 2 flap guard.
      groupId: 'mock-group-prod',
      deviceId: 'mock-device-sap-app-03',
      checkTypeId: 'mock-checktype-disk',
      alert: buildMockAlert({
        id: 'mock-check-sap-disk-flap',
        status: 'down',
        severity: 'high',
        ackState: 'unacknowledged',
        message: 'Disk free below 5% threshold (flapping).',
        sensorId: 'mock-check-sap-disk-flap',
        vmId: 'mock-vm-sap-app-03',
        relatedTicketId: null,
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: '2026-05-26T10:14:00.000Z',
        lastCheckedAt: MOCK_COLLECTED_AT,
        lastValue: '4 %',
        objectKind: 'check',
        deviceName: 'srv-fr-sap-app03',
        checkName: 'Disk free',
        groupPath: MOCK_PROD_PATH,
      }),
    },
    {
      // Cleared then refired: a previous occurrence (09:20, cleared 09:40) is
      // gone; this is a NEW occurrence with a distinct occurrenceStartedAt, so
      // dedup keyed on (id, status, occurrenceStartedAt) yields a new work item.
      groupId: 'mock-group-prod',
      deviceId: 'mock-device-db-01',
      checkTypeId: 'mock-checktype-http',
      alert: buildMockAlert({
        id: 'mock-check-db01-http-refired',
        status: 'down',
        severity: 'high',
        ackState: 'unacknowledged',
        message: 'HTTP check failed again after recovering at 09:40.',
        sensorId: 'mock-check-db01-http-refired',
        vmId: null,
        relatedTicketId: null,
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: '2026-05-26T10:05:00.000Z',
        lastCheckedAt: MOCK_COLLECTED_AT,
        lastValue: null,
        objectKind: 'check',
        deviceName: 'srv-fr-db01',
        checkName: 'HTTP',
        groupPath: MOCK_PROD_PATH,
      }),
    },
    {
      // Prompt-injection message — the alert text is untrusted external
      // evidence and must stay inert (same convention as the ticketing mock).
      groupId: 'mock-group-lab',
      deviceId: 'mock-device-lab-fw-01',
      checkTypeId: 'mock-checktype-ping',
      alert: buildMockAlert({
        id: 'mock-check-labfw-ping-malicious',
        status: 'down',
        severity: 'medium',
        ackState: 'unacknowledged',
        message: `Ping alert note: ${MALICIOUS_EXTERNAL_TEXT}`,
        sensorId: 'mock-check-labfw-ping-malicious',
        vmId: null,
        relatedTicketId: null,
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: '2026-05-26T09:30:00.000Z',
        lastCheckedAt: MOCK_COLLECTED_AT,
        lastValue: null,
        objectKind: 'check',
        deviceName: 'fw-lab-edge01',
        checkName: 'Ping',
        groupPath: MOCK_LAB_PATH,
      }),
    },
    {
      // Healthy check — only visible when statusValues explicitly includes 'up'.
      groupId: 'mock-group-prod',
      deviceId: 'mock-device-sap-app-03',
      checkTypeId: 'mock-checktype-ping',
      alert: buildMockAlert({
        id: 'mock-check-sap-ping',
        status: 'up',
        severity: 'very_low',
        ackState: 'unacknowledged',
        message: 'OK.',
        sensorId: 'mock-check-sap-ping',
        vmId: 'mock-vm-sap-app-03',
        relatedTicketId: null,
        observedAt: MOCK_COLLECTED_AT,
        occurrenceStartedAt: null,
        lastCheckedAt: MOCK_COLLECTED_AT,
        lastValue: '12 ms',
        objectKind: 'check',
        deviceName: 'srv-fr-sap-app03',
        checkName: 'Ping',
        groupPath: MOCK_PROD_PATH,
      }),
    },
  ];
}

const MOCK_MONITORED_OBJECTS: MonitoredObjectRecord[] = [
  { objectId: 'mock-probe-dc1', objectKind: 'group', name: 'Probe DC1', hostAddress: null, groupPath: [], tags: ['probe'], sourceUri: mockSourceUri('mock-probe-dc1') },
  { objectId: 'mock-group-prod', objectKind: 'group', name: 'Production', hostAddress: null, groupPath: MOCK_PROBE_PATH, tags: ['prod'], sourceUri: mockSourceUri('mock-group-prod') },
  { objectId: 'mock-group-lab', objectKind: 'group', name: 'Lab', hostAddress: null, groupPath: MOCK_PROBE_PATH, tags: ['lab'], sourceUri: mockSourceUri('mock-group-lab') },
  { objectId: 'mock-device-sap-app-03', objectKind: 'device', name: 'srv-fr-sap-app03', hostAddress: '10.20.0.13', groupPath: MOCK_PROD_PATH, tags: ['sap', 'linux'], sourceUri: mockSourceUri('mock-device-sap-app-03') },
  { objectId: 'mock-device-db-01', objectKind: 'device', name: 'srv-fr-db01', hostAddress: '10.20.0.21', groupPath: MOCK_PROD_PATH, tags: ['database', 'linux'], sourceUri: mockSourceUri('mock-device-db-01') },
  { objectId: 'mock-device-lab-fw-01', objectKind: 'device', name: 'fw-lab-edge01', hostAddress: '172.16.5.1', groupPath: MOCK_LAB_PATH, tags: ['firewall'], sourceUri: mockSourceUri('mock-device-lab-fw-01') },
];

const MOCK_MONITORING_CATALOGS: Record<MonitoringReferenceCatalogKind, RefItem[]> = {
  group: [
    { value: 'mock-probe-dc1', label: 'Probe DC1' },
    { value: 'mock-group-prod', label: 'Production', metadata: { parentId: 'mock-probe-dc1' } },
    { value: 'mock-group-lab', label: 'Lab', metadata: { parentId: 'mock-probe-dc1' } },
  ],
  device: [
    { value: 'mock-device-sap-app-03', label: 'srv-fr-sap-app03', metadata: { groupId: 'mock-group-prod' } },
    { value: 'mock-device-db-01', label: 'srv-fr-db01', metadata: { groupId: 'mock-group-prod' } },
    { value: 'mock-device-lab-fw-01', label: 'fw-lab-edge01', metadata: { groupId: 'mock-group-lab' } },
  ],
  check_type: [
    { value: 'mock-checktype-ping', label: 'Ping' },
    { value: 'mock-checktype-cpu', label: 'CPU Load' },
    { value: 'mock-checktype-disk', label: 'Disk Free' },
    { value: 'mock-checktype-http', label: 'HTTP' },
    { value: 'mock-checktype-traffic', label: 'Traffic' },
    { value: 'mock-checktype-backup', label: 'Backup Job' },
  ],
};

function referenceLabel(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export class MockMonitoringProvider implements MonitoringProvider {
  readonly kind = 'monitoring' as const;
  readonly providerKey = 'mock';

  async health(context: ProviderContext) {
    void context;
    return mockHealth(this.kind, this.providerKey);
  }

  async applicability(context: ProviderContext) {
    void context;
    return mockApplicability();
  }

  async getAlert(context: ProviderContext, input: { alertId: string }): Promise<AdapterResult<MonitoringAlert>> {
    void context;
    const scenario = errorForScenario<MonitoringAlert>(input.alertId);
    if (scenario) {
      return scenario;
    }
    const known = mockMonitoredChecks().find((check) => check.alert.id === input.alertId);
    const malicious = input.alertId.includes('malicious');
    const data: MonitoringAlert = known
      ? known.alert
      : buildMockAlert({
          id: input.alertId,
          status: input.alertId.includes('critical') ? 'down' : 'warning',
          severity: input.alertId.includes('critical') ? 'critical' : 'medium',
          ackState: 'unacknowledged',
          message: malicious ? `CPU alert note: ${MALICIOUS_EXTERNAL_TEXT}` : 'CPU sustained > 85% on srv-fr-sap-app03',
          sensorId: 'mock-sensor-cpu-001',
          vmId: 'mock-vm-sap-app-03',
          relatedTicketId: 'mock-ticket-1001',
          observedAt: MOCK_COLLECTED_AT,
          occurrenceStartedAt: '2026-05-26T09:45:00.000Z',
          lastCheckedAt: MOCK_COLLECTED_AT,
          lastValue: '89 %',
          objectKind: 'check',
          deviceName: 'srv-fr-sap-app03',
          groupPath: MOCK_PROD_PATH,
        });
    return ok(data, [
      evidenceSeed('monitoring:mock', 'alert', data.id, `Monitoring alert ${data.id}: ${data.message}`, data),
    ]);
  }

  async getSensorHistory(
    context: ProviderContext,
    input: { sensorId: string; windowMinutes?: number | null },
  ): Promise<AdapterResult<MonitoringSensorHistory>> {
    void context;
    const scenario = errorForScenario<MonitoringSensorHistory>(input.sensorId);
    if (scenario) {
      return scenario;
    }
    const windowMinutes = Math.max(5, Math.min(input.windowMinutes ?? 60, 1440));
    const points = [
      { timestamp: '2026-05-26T09:15:00.000Z', value: 62 },
      { timestamp: '2026-05-26T09:30:00.000Z', value: 78 },
      { timestamp: '2026-05-26T09:45:00.000Z', value: 87 },
      { timestamp: '2026-05-26T10:00:00.000Z', value: 91 },
      { timestamp: '2026-05-26T10:15:00.000Z', value: 89 },
    ];
    const data: MonitoringSensorHistory = {
      sensorId: input.sensorId,
      metric: 'cpu_usage',
      unit: 'percent',
      windowMinutes,
      points,
      summary: 'CPU usage crossed 85% for three consecutive samples.',
    };
    return ok(data, [
      evidenceSeed('monitoring:mock', 'sensor_history', input.sensorId, data.summary, data),
    ]);
  }

  async getCurrentState(context: ProviderContext, input: { sensorId: string }): Promise<AdapterResult<MonitoringCurrentState>> {
    void context;
    const scenario = errorForScenario<MonitoringCurrentState>(input.sensorId);
    if (scenario) {
      return scenario;
    }
    const data: MonitoringCurrentState = {
      sensorId: input.sensorId,
      status: 'warning',
      value: 89,
      unit: 'percent',
      observedAt: MOCK_COLLECTED_AT,
    };
    return ok(data, [
      evidenceSeed('monitoring:mock', 'sensor_state', input.sensorId, 'Current CPU sensor state is warning at 89%.', data),
    ]);
  }

  async listRelatedAlerts(
    context: ProviderContext,
    input: { sensorId: string; limit?: number | null },
  ): Promise<AdapterResult<{ alerts: MonitoringAlert[] }>> {
    void context;
    const scenario = errorForScenario<{ alerts: MonitoringAlert[] }>(input.sensorId);
    if (scenario) {
      return scenario;
    }
    const limit = Math.max(1, Math.min(input.limit ?? 2, 10));
    const checks = mockMonitoredChecks();
    const anchor = checks.find((check) => check.alert.id === input.sensorId);
    const allAlerts: MonitoringAlert[] = anchor
      ? checks
          .filter((check) => check.deviceId === anchor.deviceId && check.alert.id !== anchor.alert.id && check.alert.status !== 'up')
          .map((check) => check.alert)
      : [
          buildMockAlert({
            id: 'mock-alert-001',
            status: 'warning',
            severity: 'medium',
            ackState: 'unacknowledged',
            message: 'CPU sustained > 85% on srv-fr-sap-app03',
            sensorId: input.sensorId,
            vmId: 'mock-vm-sap-app-03',
            relatedTicketId: 'mock-ticket-1001',
            observedAt: MOCK_COLLECTED_AT,
            occurrenceStartedAt: '2026-05-26T09:45:00.000Z',
            lastCheckedAt: MOCK_COLLECTED_AT,
            lastValue: '89 %',
            objectKind: 'check',
            deviceName: 'srv-fr-sap-app03',
            groupPath: MOCK_PROD_PATH,
          }),
        ];
    const alerts = allAlerts.slice(0, limit);
    return ok({ alerts }, [
      evidenceSeed('monitoring:mock', 'related_alerts', input.sensorId, `Found ${alerts.length} related alert(s).`, { alerts }),
    ]);
  }

  async listAlertsForScope(
    context: ProviderContext,
    input: { scope: MonitoringAlertListScope },
  ): Promise<AdapterResult<{ alerts: MonitoringAlert[] }>> {
    void context;
    const scope = input.scope;
    // Fault injection rides on the reference ids inside the scope (same
    // substring conventions as every other mock read).
    const scenarioId = [...(scope.groupIds ?? []), ...(scope.deviceIds ?? []), ...(scope.checkTypeIds ?? [])].join(' ');
    const scenario = errorForScenario<{ alerts: MonitoringAlert[] }>(scenarioId);
    if (scenario) {
      return scenario;
    }
    const severityFloorIndex = scope.severityFloor
      ? (MONITORING_SEVERITY_VALUES as readonly string[]).indexOf(String(scope.severityFloor).trim().toLowerCase())
      : 0;
    if (severityFloorIndex < 0) {
      return providerError<{ alerts: MonitoringAlert[] }>('malformed_config', 'Scope severityFloor must be a normalized severity value.', false);
    }
    const maxResults = Math.max(1, Math.min(Math.floor(scope.maxResults), 50));
    // Default scope = every non-up state.
    const statusValues = new Set((scope.statusValues && scope.statusValues.length > 0
      ? scope.statusValues
      : MONITORING_ALERT_STATUS_VALUES.filter((value) => value !== 'up'))
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean));
    const groupIdSet = scope.groupIds && scope.groupIds.length > 0 ? new Set(scope.groupIds) : null;
    const deviceIdSet = scope.deviceIds && scope.deviceIds.length > 0 ? new Set(scope.deviceIds) : null;
    const checkTypeIdSet = scope.checkTypeIds && scope.checkTypeIds.length > 0 ? new Set(scope.checkTypeIds) : null;
    const nowMs = Date.parse(MOCK_COLLECTED_AT);
    const alerts = mockMonitoredChecks()
      .filter((check) => statusValues.has(check.alert.status))
      .filter((check) => (MONITORING_SEVERITY_VALUES as readonly string[]).indexOf(check.alert.severity) >= severityFloorIndex)
      .filter((check) => !scope.ackState || check.alert.ackState === scope.ackState)
      .filter((check) => !groupIdSet || groupIdSet.has(check.groupId))
      .filter((check) => !deviceIdSet || deviceIdSet.has(check.deviceId))
      .filter((check) => !checkTypeIdSet || checkTypeIdSet.has(check.checkTypeId))
      .filter((check) => {
        if (typeof scope.minAgeMinutes !== 'number' || scope.minAgeMinutes <= 0) {
          return true;
        }
        // Flap guard fails closed: alerts without a known occurrence start
        // cannot prove their age and are excluded.
        const startedAt = check.alert.occurrenceStartedAt ? Date.parse(check.alert.occurrenceStartedAt) : NaN;
        return Number.isFinite(startedAt) && (nowMs - startedAt) / 60_000 >= scope.minAgeMinutes;
      })
      .map((check) => check.alert)
      .slice(0, maxResults);
    return ok({ alerts }, [
      evidenceSeed('monitoring:mock', 'alert_scope_list', 'scope', `Mock listed ${alerts.length} alert(s) for bounded scope.`, {
        scope,
        alertIds: alerts.map((alert) => alert.id),
      }),
    ]);
  }

  async getMonitoredObject(context: ProviderContext, input: { objectId: string }): Promise<AdapterResult<MonitoredObjectRecord>> {
    void context;
    const scenario = errorForScenario<MonitoredObjectRecord>(input.objectId);
    if (scenario) {
      return scenario;
    }
    const known = MOCK_MONITORED_OBJECTS.find((object) => object.objectId === input.objectId)
      ?? mockMonitoredChecks()
        .filter((check) => check.alert.id === input.objectId)
        .map((check): MonitoredObjectRecord => ({
          objectId: check.alert.id,
          objectKind: 'check',
          name: check.alert.message,
          hostAddress: null,
          groupPath: check.alert.groupPath,
          tags: null,
          sourceUri: mockSourceUri(check.alert.id),
        }))[0];
    const data: MonitoredObjectRecord = known ?? {
      objectId: input.objectId,
      objectKind: 'device',
      name: 'srv-fr-sap-app03',
      hostAddress: '10.20.0.13',
      groupPath: MOCK_PROD_PATH,
      tags: ['sap'],
      sourceUri: mockSourceUri(input.objectId),
    };
    return ok(data, [
      evidenceSeed('monitoring:mock', 'monitored_object', data.objectId, `Monitored ${data.objectKind} ${data.name}.`, data),
    ]);
  }

  async describeReferenceEnums(context: ProviderContext): Promise<AdapterResult<MonitoringReferenceEnums>> {
    void context;
    const data: MonitoringReferenceEnums = {
      statuses: MONITORING_ALERT_STATUS_VALUES.map((value) => ({ value, label: referenceLabel(value) })),
      severities: MONITORING_SEVERITY_VALUES.map((value) => ({ value, label: referenceLabel(value) })),
      ackStates: MONITORING_ACK_STATES.map((value) => ({ value, label: referenceLabel(value) })),
    };
    return ok(data, [
      evidenceSeed('monitoring:mock', 'reference_enums', 'mock', 'Mock listed monitoring enum reference values.', data),
    ]);
  }

  async searchReferenceCatalog(
    context: ProviderContext,
    input: { kind: MonitoringReferenceCatalogKind; query: string; limit?: number | null },
  ): Promise<AdapterResult<{ items: RefItem[] }>> {
    void context;
    const scenario = errorForScenario<{ items: RefItem[] }>(input.query);
    if (scenario) {
      return scenario;
    }
    const limit = Math.max(1, Math.min(Math.floor(input.limit ?? 20), 50));
    const query = String(input.query ?? '').trim().toLowerCase();
    const source = MOCK_MONITORING_CATALOGS[input.kind] ?? [];
    const items = source
      .filter((item) => !query || item.label.toLowerCase().includes(query) || item.value.toLowerCase().includes(query))
      .slice(0, limit)
      .map((item) => ({ ...item, metadata: { ...(item.metadata ?? {}) } }));
    return ok({ items }, [
      evidenceSeed('monitoring:mock', `${input.kind}_list`, query || input.kind, `Mock listed ${items.length} ${input.kind} option(s).`, {
        kind: input.kind,
        query: input.query ?? null,
        limit,
        items,
      }),
    ]);
  }
}
