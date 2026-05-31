import {
  AdapterResult,
  MonitoringAlert,
  MonitoringCurrentState,
  MonitoringProvider,
  MonitoringSensorHistory,
  ProviderContext,
} from '../provider.types';
import {
  errorForScenario,
  evidenceSeed,
  MALICIOUS_EXTERNAL_TEXT,
  mockApplicability,
  MOCK_COLLECTED_AT,
  mockHealth,
  ok,
} from './mock-provider.helpers';

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
    const malicious = input.alertId.includes('malicious');
    const data: MonitoringAlert = {
      id: input.alertId,
      status: 'active',
      severity: input.alertId.includes('critical') ? 'critical' : 'warning',
      message: malicious ? `CPU alert note: ${MALICIOUS_EXTERNAL_TEXT}` : 'CPU sustained > 85% on srv-fr-sap-app03',
      sensorId: 'mock-sensor-cpu-001',
      vmId: 'mock-vm-sap-app-03',
      relatedTicketId: 'mock-ticket-1001',
      observedAt: MOCK_COLLECTED_AT,
    };
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
    const allAlerts: MonitoringAlert[] = [
      {
        id: 'mock-alert-001',
        status: 'active',
        severity: 'warning',
        message: 'CPU sustained > 85% on srv-fr-sap-app03',
        sensorId: input.sensorId,
        vmId: 'mock-vm-sap-app-03',
        relatedTicketId: 'mock-ticket-1001',
        observedAt: MOCK_COLLECTED_AT,
      },
    ];
    const alerts = allAlerts.slice(0, limit);
    return ok({ alerts }, [
      evidenceSeed('monitoring:mock', 'related_alerts', input.sensorId, `Found ${alerts.length} related alert(s).`, { alerts }),
    ]);
  }
}
