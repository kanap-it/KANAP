import {
  AdapterResult,
  ClusterHealth,
  HostHealth,
  ProviderContext,
  VirtualizationProvider,
  VirtualMachineHealth,
} from '../provider.types';
import {
  errorForScenario,
  evidenceSeed,
  mockApplicability,
  mockHealth,
  ok,
} from './mock-provider.helpers';

export class MockVirtualizationProvider implements VirtualizationProvider {
  readonly kind = 'virtualization' as const;
  readonly providerKey = 'mock';

  async health(context: ProviderContext) {
    void context;
    return mockHealth(this.kind, this.providerKey);
  }

  async applicability(context: ProviderContext) {
    void context;
    return mockApplicability();
  }

  async getVmHealth(context: ProviderContext, input: { vmId: string }): Promise<AdapterResult<VirtualMachineHealth>> {
    void context;
    const scenario = errorForScenario<VirtualMachineHealth>(input.vmId);
    if (scenario) {
      return scenario;
    }
    const data: VirtualMachineHealth = {
      vmId: input.vmId,
      name: input.vmId === 'mock-vm-sap-app-03' ? 'srv-fr-sap-app03' : input.vmId,
      status: 'healthy',
      hostId: 'mock-host-07',
      clusterId: 'mock-cluster-prod',
      cpuUsagePercent: 88,
      memoryUsagePercent: 64,
      storageLatencyMs: 7,
      recentEvents: ['No HA event in the last 24h.', 'CPU contention warning cleared on host mock-host-07.'],
      summary: 'VM is healthy; guest CPU pressure is elevated while host and storage are normal.',
    };
    return ok(data, [
      evidenceSeed('virtualization:mock', 'vm_health', data.vmId, data.summary, data),
    ]);
  }

  async getHostHealth(context: ProviderContext, input: { hostId: string }): Promise<AdapterResult<HostHealth>> {
    void context;
    const scenario = errorForScenario<HostHealth>(input.hostId);
    if (scenario) {
      return scenario;
    }
    const data: HostHealth = {
      hostId: input.hostId,
      name: input.hostId,
      status: 'healthy',
      clusterId: 'mock-cluster-prod',
      cpuUsagePercent: 54,
      memoryUsagePercent: 71,
      summary: 'Host has capacity headroom and no active hardware alert.',
    };
    return ok(data, [
      evidenceSeed('virtualization:mock', 'host_health', data.hostId, data.summary, data),
    ]);
  }

  async getClusterHealth(context: ProviderContext, input: { clusterId: string }): Promise<AdapterResult<ClusterHealth>> {
    void context;
    const scenario = errorForScenario<ClusterHealth>(input.clusterId);
    if (scenario) {
      return scenario;
    }
    const data: ClusterHealth = {
      clusterId: input.clusterId,
      name: input.clusterId,
      status: 'healthy',
      summary: 'Cluster health is green with no storage or HA degradation.',
    };
    return ok(data, [
      evidenceSeed('virtualization:mock', 'cluster_health', data.clusterId, data.summary, data),
    ]);
  }

  async getRecentEvents(
    context: ProviderContext,
    input: { vmId?: string | null; hostId?: string | null; limit?: number | null },
  ): Promise<AdapterResult<{ events: string[] }>> {
    void context;
    const scenario = errorForScenario<{ events: string[] }>(input.vmId ?? input.hostId ?? '');
    if (scenario) {
      return scenario;
    }
    const limit = Math.max(1, Math.min(input.limit ?? 3, 10));
    const events = [
      'No VM restart detected.',
      'No storage latency event detected.',
      'Host CPU contention warning cleared before alert window.',
    ].slice(0, limit);
    return ok({ events }, [
      evidenceSeed('virtualization:mock', 'recent_events', input.vmId ?? input.hostId ?? 'unknown', `Found ${events.length} virtualization event(s).`, { events }),
    ]);
  }

  async getResourceUsageSummary(
    context: ProviderContext,
    input: { vmId?: string | null; hostId?: string | null },
  ): Promise<AdapterResult<{ summary: string }>> {
    void context;
    const scenario = errorForScenario<{ summary: string }>(input.vmId ?? input.hostId ?? '');
    if (scenario) {
      return scenario;
    }
    const data = { summary: 'Compute and storage resources are within expected operational thresholds.' };
    return ok(data, [
      evidenceSeed('virtualization:mock', 'resource_usage', input.vmId ?? input.hostId ?? 'unknown', data.summary, data),
    ]);
  }
}
