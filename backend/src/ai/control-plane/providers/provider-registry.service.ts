import { Injectable } from '@nestjs/common';
import { AiExecutionContextWithManager } from '../../ai.types';
import { AiAdapterConfigService } from './adapter-config.service';
import { MockAutomationProvider } from './mocks/mock-automation.provider';
import { MockCommunicationProvider } from './mocks/mock-communication.provider';
import { MockDirectoryProvider } from './mocks/mock-directory.provider';
import { MockKanapDomainProvider } from './mocks/mock-kanap-domain.provider';
import { MockMonitoringProvider } from './mocks/mock-monitoring.provider';
import { MockTicketingProvider } from './mocks/mock-ticketing.provider';
import { MockVirtualizationProvider } from './mocks/mock-virtualization.provider';
import {
  AdapterHealthResult,
  AdapterResult,
  AdapterErrorCode,
  AutomationProvider,
  CapabilityApplicability,
  CommunicationProvider,
  DirectoryProvider,
  KanapDomainProvider,
  MonitoringProvider,
  ProviderBase,
  ProviderContext,
  ProviderKind,
  TicketingProvider,
  VirtualizationProvider,
} from './provider.types';
import { AiTenantSecretResolverService } from './tenant-secret-resolver.service';

class UnavailableProvider implements ProviderBase {
  constructor(
    readonly kind: ProviderKind,
    readonly providerKey: string,
    private readonly applicabilityResult: CapabilityApplicability,
  ) {}

  async health(context: ProviderContext): Promise<AdapterHealthResult> {
    void context;
    return {
      ok: false,
      providerKind: this.kind,
      providerKey: this.providerKey,
      checkedAt: new Date().toISOString(),
      errorCode: this.toErrorCode(),
      message: this.applicabilityResult.message ?? 'Provider is unavailable.',
      retryable: false,
    };
  }

  async applicability(context: ProviderContext): Promise<CapabilityApplicability> {
    void context;
    return this.applicabilityResult;
  }

  protected unavailable<T>(): AdapterResult<T> {
    return {
      ok: false,
      errorCode: this.toErrorCode(),
      message: this.applicabilityResult.message ?? 'Provider is unavailable.',
      retryable: false,
    };
  }

  private toErrorCode(): AdapterErrorCode {
    switch (this.applicabilityResult.reasonCode) {
      case 'provider_not_configured':
        return 'not_configured';
      case 'provider_disabled':
        return 'disabled';
      case 'missing_credentials':
        return 'missing_credentials';
      case 'unsupported_provider_version':
        return 'unsupported_provider_version';
      case 'malformed_config':
        return 'malformed_config';
      case 'missing_permission':
        return 'forbidden';
      case 'unsafe_environment':
        return 'unsafe_operation';
      default:
        return 'unknown';
    }
  }
}

class UnavailableTicketingProvider extends UnavailableProvider implements TicketingProvider {
  async getTicket() { return this.unavailable<any>(); }
  async searchSimilarTickets() { return this.unavailable<any>(); }
  async listTicketNotes() { return this.unavailable<any>(); }
  async getTicketClassificationContext() { return this.unavailable<any>(); }
  async prepareInternalNote() { return this.unavailable<any>(); }
  async addInternalNote() { return this.unavailable<any>(); }
}

class UnavailableMonitoringProvider extends UnavailableProvider implements MonitoringProvider {
  async getAlert() { return this.unavailable<any>(); }
  async getSensorHistory() { return this.unavailable<any>(); }
  async getCurrentState() { return this.unavailable<any>(); }
  async listRelatedAlerts() { return this.unavailable<any>(); }
}

class UnavailableVirtualizationProvider extends UnavailableProvider implements VirtualizationProvider {
  async getVmHealth() { return this.unavailable<any>(); }
  async getHostHealth() { return this.unavailable<any>(); }
  async getClusterHealth() { return this.unavailable<any>(); }
  async getRecentEvents() { return this.unavailable<any>(); }
  async getResourceUsageSummary() { return this.unavailable<any>(); }
}

class UnavailableDirectoryProvider extends UnavailableProvider implements DirectoryProvider {
  async getUserContext() { return this.unavailable<any>(); }
  async getGroupContext() { return this.unavailable<any>(); }
  async validateIdentityRelation() { return this.unavailable<any>(); }
}

class UnavailableCommunicationProvider extends UnavailableProvider implements CommunicationProvider {
  async postApprovalRequest() { return this.unavailable<any>(); }
  async postStatusUpdate() { return this.unavailable<any>(); }
}

class UnavailableAutomationProvider extends UnavailableProvider implements AutomationProvider {
  async listAllowedJobs() { return this.unavailable<any>(); }
  async getJobSchema() { return this.unavailable<any>(); }
  async getJobStatus() { return this.unavailable<any>(); }
  async getJobOutput() { return this.unavailable<any>(); }
  async dryRunJob() { return this.unavailable<any>(); }
  async launchApprovedJob() { return this.unavailable<any>(); }
  async cancelJob() { return this.unavailable<any>(); }
}

class UnavailableKanapDomainProvider extends UnavailableProvider implements KanapDomainProvider {
  async resolveOperationalContext() { return this.unavailable<any>(); }
}

@Injectable()
export class AiProviderRegistryService {
  private readonly mockTicketing = new MockTicketingProvider();
  private readonly mockMonitoring = new MockMonitoringProvider();
  private readonly mockVirtualization = new MockVirtualizationProvider();
  private readonly mockDirectory = new MockDirectoryProvider();
  private readonly mockCommunication = new MockCommunicationProvider();
  private readonly mockAutomation = new MockAutomationProvider();
  private readonly mockKanapDomain = new MockKanapDomainProvider();

  constructor(
    private readonly adapterConfigs: AiAdapterConfigService,
    private readonly secretResolver?: AiTenantSecretResolverService,
  ) {}

  async getApplicability(
    context: AiExecutionContextWithManager,
    providerKind: ProviderKind,
    providerKey = 'mock',
  ): Promise<CapabilityApplicability> {
    if (providerKey === 'mock') {
      return { available: true };
    }
    const config = await this.adapterConfigs.getConfig(context, providerKind, providerKey);
    if (!config) {
      return {
        available: false,
        reasonCode: 'provider_not_configured',
        message: 'Adapter configuration was not found for this tenant.',
      };
    }
    const applicability = this.adapterConfigs.validateConfig(config);
    if (!applicability.available) {
      return applicability;
    }
    if (config.implementation !== 'mock' && this.secretResolver) {
      try {
        this.secretResolver.resolve(context, config.credential_ref_json);
      } catch (error: any) {
        return {
          available: false,
          reasonCode: typeof error?.getStatus === 'function' && error.getStatus() === 400
            ? 'malformed_config'
            : 'missing_credentials',
          message: error?.message ?? 'Adapter credential reference could not be resolved.',
        };
      }
    }
    if (config.implementation !== 'mock') {
      return {
        available: false,
        reasonCode: 'unsupported_provider_version',
        message: `Adapter implementation "${config.implementation}" is not available in this control-plane build.`,
      };
    }
    return { available: true };
  }

  async getHealth(
    context: AiExecutionContextWithManager,
    providerKind: ProviderKind,
    providerKey = 'mock',
  ): Promise<AdapterHealthResult> {
    if (providerKey === 'mock') {
      return this.mockForKind(providerKind).health(context);
    }
    const health = await this.adapterConfigs.getHealth(context, providerKind, providerKey);
    if (!health.ok || health.implementation !== 'mock') {
      return health.ok
        ? {
            ...health,
            ok: false,
            errorCode: 'unsupported_provider_version',
            message: `Adapter implementation "${health.implementation}" is not available in this control-plane build.`,
            retryable: false,
          }
        : health;
    }
    return this.mockForKind(providerKind).health(context);
  }

  async ticketing(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<TicketingProvider> {
    const applicability = await this.getApplicability(context, 'ticketing', providerKey);
    return applicability.available
      ? this.mockTicketing
      : new UnavailableTicketingProvider('ticketing', providerKey, applicability);
  }

  async monitoring(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<MonitoringProvider> {
    const applicability = await this.getApplicability(context, 'monitoring', providerKey);
    return applicability.available
      ? this.mockMonitoring
      : new UnavailableMonitoringProvider('monitoring', providerKey, applicability);
  }

  async virtualization(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<VirtualizationProvider> {
    const applicability = await this.getApplicability(context, 'virtualization', providerKey);
    return applicability.available
      ? this.mockVirtualization
      : new UnavailableVirtualizationProvider('virtualization', providerKey, applicability);
  }

  async directory(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<DirectoryProvider> {
    const applicability = await this.getApplicability(context, 'directory', providerKey);
    return applicability.available
      ? this.mockDirectory
      : new UnavailableDirectoryProvider('directory', providerKey, applicability);
  }

  async communication(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<CommunicationProvider> {
    const applicability = await this.getApplicability(context, 'communication', providerKey);
    return applicability.available
      ? this.mockCommunication
      : new UnavailableCommunicationProvider('communication', providerKey, applicability);
  }

  async automation(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<AutomationProvider> {
    const applicability = await this.getApplicability(context, 'automation', providerKey);
    return applicability.available
      ? this.mockAutomation
      : new UnavailableAutomationProvider('automation', providerKey, applicability);
  }

  async kanapDomain(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<KanapDomainProvider> {
    const applicability = await this.getApplicability(context, 'kanap_domain', providerKey);
    return applicability.available
      ? this.mockKanapDomain
      : new UnavailableKanapDomainProvider('kanap_domain', providerKey, applicability);
  }

  private mockForKind(providerKind: ProviderKind): ProviderBase {
    switch (providerKind) {
      case 'ticketing':
        return this.mockTicketing;
      case 'monitoring':
        return this.mockMonitoring;
      case 'virtualization':
        return this.mockVirtualization;
      case 'directory':
        return this.mockDirectory;
      case 'communication':
        return this.mockCommunication;
      case 'automation':
        return this.mockAutomation;
      case 'kanap_domain':
        return this.mockKanapDomain;
    }
  }
}
