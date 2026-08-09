import { Inject, Injectable, Optional } from '@nestjs/common';
import { AiExecutionContextWithManager } from '../../ai.types';
import { AiAdapterConfigService } from './adapter-config.service';
import { AiAdapterConfig } from './adapter-config.entity';
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
  ProviderAdapterRuntime,
  ProviderContext,
  ProviderKind,
  TicketingProvider,
  VirtualizationProvider,
} from './provider.types';
import { GLPI_TICKETING_IMPLEMENTATION, LEGACY_GLPI_TICKETING_PROVIDER_KEY } from './provider-constants';
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
  async readTicketAttachment() { return this.unavailable<any>(); }
  async listTicketsForScope() { return this.unavailable<any>(); }
  async describeReferenceEnums() { return this.unavailable<any>(); }
  async searchReferenceCatalog() { return this.unavailable<any>(); }
  async resolveReferenceSubtree() { return this.unavailable<any>(); }
  async getTicketClassificationContext() { return this.unavailable<any>(); }
  async getTicketLifecycleContext() { return this.unavailable<any>(); }
  async getTicketRoutingContext() { return this.unavailable<any>(); }
  async getTicketParticipantContext() { return this.unavailable<any>(); }
  async prepareTicketClassificationUpdate() { return this.unavailable<any>(); }
  async updateTicketClassification() { return this.unavailable<any>(); }
  async prepareTicketStatusUpdate() { return this.unavailable<any>(); }
  async updateTicketStatus() { return this.unavailable<any>(); }
  async prepareTicketAssignmentUpdate() { return this.unavailable<any>(); }
  async updateTicketAssignment() { return this.unavailable<any>(); }
  async prepareTicketParticipantUpdate() { return this.unavailable<any>(); }
  async updateTicketParticipants() { return this.unavailable<any>(); }
  async prepareInternalNote() { return this.unavailable<any>(); }
  async addInternalNote() { return this.unavailable<any>(); }
  async preparePublicReply() { return this.unavailable<any>(); }
  async addPublicReply() { return this.unavailable<any>(); }
}

class UnavailableMonitoringProvider extends UnavailableProvider implements MonitoringProvider {
  async getAlert() { return this.unavailable<any>(); }
  async getSensorHistory() { return this.unavailable<any>(); }
  async getCurrentState() { return this.unavailable<any>(); }
  async listRelatedAlerts() { return this.unavailable<any>(); }
  async listAlertsForScope() { return this.unavailable<any>(); }
  async getMonitoredObject() { return this.unavailable<any>(); }
  async describeReferenceEnums() { return this.unavailable<any>(); }
  async searchReferenceCatalog() { return this.unavailable<any>(); }
  // The optional 15.B write pairs are intentionally not stubbed: the control
  // plane offers those actions only when `typeof provider.<method>` is a
  // function, and an unavailable provider must never offer them.
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

type ProviderResolution = {
  applicability: CapabilityApplicability;
  provider: ProviderBase | null;
  implementation?: string;
  environment?: string;
  adapterRuntime?: ProviderAdapterRuntime | null;
};

export const AI_PROVIDER_IMPLEMENTATIONS = 'AI_PROVIDER_IMPLEMENTATIONS';

export type ProviderImplementationRegistration = {
  providerKind: ProviderKind;
  implementation: string;
  provider: ProviderBase;
};

@Injectable()
export class AiProviderRegistryService {
  private readonly mockTicketing = new MockTicketingProvider();
  private readonly mockMonitoring = new MockMonitoringProvider();
  private readonly mockVirtualization = new MockVirtualizationProvider();
  private readonly mockDirectory = new MockDirectoryProvider();
  private readonly mockCommunication = new MockCommunicationProvider();
  private readonly mockAutomation = new MockAutomationProvider();
  private readonly mockKanapDomain = new MockKanapDomainProvider();
  private readonly providerImplementations = new Map<string, ProviderBase>();
  private readonly legacyProviderKeyImplementations = new Map<string, string>();

  constructor(
    private readonly adapterConfigs: AiAdapterConfigService,
    @Optional()
    private readonly secretResolver?: AiTenantSecretResolverService,
    @Optional()
    @Inject(AI_PROVIDER_IMPLEMENTATIONS)
    private readonly externalImplementations?: ProviderImplementationRegistration[],
  ) {
    this.registerProviderImplementation('ticketing', 'mock', this.mockTicketing);
    this.registerProviderImplementation('monitoring', 'mock', this.mockMonitoring);
    this.registerProviderImplementation('virtualization', 'mock', this.mockVirtualization);
    this.registerProviderImplementation('directory', 'mock', this.mockDirectory);
    this.registerProviderImplementation('communication', 'mock', this.mockCommunication);
    this.registerProviderImplementation('automation', 'mock', this.mockAutomation);
    this.registerProviderImplementation('kanap_domain', 'mock', this.mockKanapDomain);
    this.registerLegacyProviderKey('ticketing', LEGACY_GLPI_TICKETING_PROVIDER_KEY, GLPI_TICKETING_IMPLEMENTATION);
    for (const registration of this.externalImplementations ?? []) {
      this.registerProviderImplementation(registration.providerKind, registration.implementation, registration.provider);
    }
  }

  async getApplicability(
    context: AiExecutionContextWithManager,
    providerKind: ProviderKind,
    providerKey = 'mock',
  ): Promise<CapabilityApplicability> {
    return (await this.resolveProvider(context, providerKind, providerKey)).applicability;
  }

  async getHealth(
    context: AiExecutionContextWithManager,
    providerKind: ProviderKind,
    providerKey = 'mock',
  ): Promise<AdapterHealthResult> {
    const resolved = await this.resolveProvider(context, providerKind, providerKey);
    if (!resolved.provider) {
      return this.healthFromApplicability(
        providerKind,
        providerKey,
        resolved.applicability,
        resolved.implementation,
        resolved.environment,
      );
    }
    const health = await resolved.provider.health(context);
    return {
      ...health,
      providerKind,
      providerKey,
      implementation: resolved.implementation ?? health.implementation,
      environment: resolved.environment ?? health.environment,
    };
  }

  async ticketing(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<TicketingProvider> {
    const resolved = await this.resolveProvider(context, 'ticketing', providerKey);
    return resolved.provider
      ? resolved.provider as TicketingProvider
      : new UnavailableTicketingProvider('ticketing', providerKey, resolved.applicability);
  }

  async provider(
    context: AiExecutionContextWithManager,
    providerKind: ProviderKind,
    providerKey = 'mock',
  ): Promise<ProviderBase> {
    switch (providerKind) {
      case 'ticketing':
        return this.ticketing(context, providerKey);
      case 'monitoring':
        return this.monitoring(context, providerKey);
      case 'virtualization':
        return this.virtualization(context, providerKey);
      case 'directory':
        return this.directory(context, providerKey);
      case 'communication':
        return this.communication(context, providerKey);
      case 'automation':
        return this.automation(context, providerKey);
      case 'kanap_domain':
        return this.kanapDomain(context, providerKey);
    }
  }

  async monitoring(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<MonitoringProvider> {
    const resolved = await this.resolveProvider(context, 'monitoring', providerKey);
    return resolved.provider
      ? resolved.provider as MonitoringProvider
      : new UnavailableMonitoringProvider('monitoring', providerKey, resolved.applicability);
  }

  async virtualization(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<VirtualizationProvider> {
    const resolved = await this.resolveProvider(context, 'virtualization', providerKey);
    return resolved.provider
      ? resolved.provider as VirtualizationProvider
      : new UnavailableVirtualizationProvider('virtualization', providerKey, resolved.applicability);
  }

  async directory(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<DirectoryProvider> {
    const resolved = await this.resolveProvider(context, 'directory', providerKey);
    return resolved.provider
      ? resolved.provider as DirectoryProvider
      : new UnavailableDirectoryProvider('directory', providerKey, resolved.applicability);
  }

  async communication(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<CommunicationProvider> {
    const resolved = await this.resolveProvider(context, 'communication', providerKey);
    return resolved.provider
      ? resolved.provider as CommunicationProvider
      : new UnavailableCommunicationProvider('communication', providerKey, resolved.applicability);
  }

  async automation(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<AutomationProvider> {
    const resolved = await this.resolveProvider(context, 'automation', providerKey);
    return resolved.provider
      ? resolved.provider as AutomationProvider
      : new UnavailableAutomationProvider('automation', providerKey, resolved.applicability);
  }

  async kanapDomain(context: AiExecutionContextWithManager, providerKey = 'mock'): Promise<KanapDomainProvider> {
    const resolved = await this.resolveProvider(context, 'kanap_domain', providerKey);
    return resolved.provider
      ? resolved.provider as KanapDomainProvider
      : new UnavailableKanapDomainProvider('kanap_domain', providerKey, resolved.applicability);
  }

  private async resolveProvider(
    context: AiExecutionContextWithManager,
    providerKind: ProviderKind,
    providerKey: string,
  ): Promise<ProviderResolution> {
    const config = providerKey === 'mock'
      ? null
      : await this.adapterConfigs.getConfig(context, providerKind, providerKey);
    if (config) {
      const configured = await this.resolveConfiguredProvider(context, providerKind, providerKey, config);
      if (configured.provider) {
        return configured;
      }
      // A present-but-unusable adapter config (disabled, missing secret,
      // malformed) must not shadow a working legacy implementation — e.g. a
      // leftover ticketing/glpi row while ai_settings still holds valid GLPI
      // credentials. Fall back, but keep the configured error when the legacy
      // path is unavailable too: it names the actionable problem.
      const legacyFallback = await this.resolveLegacyProvider(context, providerKind, providerKey);
      return legacyFallback?.provider ? legacyFallback : configured;
    }

    const legacy = await this.resolveLegacyProvider(context, providerKind, providerKey);
    if (legacy) {
      return legacy;
    }

    return {
      applicability: this.unavailableApplicability(
        'provider_not_configured',
        'Adapter configuration was not found for this tenant.',
      ),
      provider: null,
    };
  }

  private async resolveLegacyProvider(
    context: AiExecutionContextWithManager,
    providerKind: ProviderKind,
    providerKey: string,
  ): Promise<ProviderResolution | null> {
    const legacyImplementation = this.legacyImplementationForProviderKey(providerKind, providerKey);
    if (!legacyImplementation) {
      return null;
    }
    const provider = this.providerForImplementation(providerKind, legacyImplementation);
    if (!provider) {
      return null;
    }
    const applicability = legacyImplementation === 'mock'
      ? { available: true }
      : await provider.applicability(context);
    return {
      applicability,
      provider: applicability.available ? provider : null,
      implementation: legacyImplementation,
    };
  }

  private async resolveConfiguredProvider(
    context: AiExecutionContextWithManager,
    providerKind: ProviderKind,
    providerKey: string,
    config: AiAdapterConfig,
  ): Promise<ProviderResolution> {
    const runtime = await this.runtimeForConfig(context, config);
    if (runtime.applicability.available === false) {
      return {
        applicability: runtime.applicability,
        provider: null,
        implementation: config.implementation,
        environment: config.environment,
      };
    }
    const provider = this.providerForImplementation(providerKind, config.implementation);
    if (!provider) {
      return {
        applicability: this.unavailableApplicability(
          'unsupported_provider_version',
          `Adapter implementation "${config.implementation}" is not available in this control-plane build.`,
        ),
        provider: null,
        implementation: config.implementation,
        environment: config.environment,
        adapterRuntime: runtime.runtime,
      };
    }
    const providerContext = this.contextWithAdapterRuntime(context, runtime.runtime);
    const applicability = config.implementation === 'mock'
      ? { available: true }
      : await provider.applicability(providerContext);
    return {
      applicability,
      provider: applicability.available ? this.bindProviderRuntime(provider, runtime.runtime) : null,
      implementation: config.implementation,
      environment: config.environment,
      adapterRuntime: runtime.runtime,
    };
  }

  private async runtimeForConfig(
    context: AiExecutionContextWithManager,
    config: AiAdapterConfig,
  ): Promise<{ applicability: CapabilityApplicability; runtime: ProviderAdapterRuntime }> {
    const emptyRuntime: ProviderAdapterRuntime = {
      providerKind: config.provider_kind as ProviderKind,
      providerKey: config.provider_key,
      implementation: config.implementation,
      environment: config.environment,
      baseUrl: config.base_url ?? null,
      credential: null,
      configMetadata: config.metadata_json ?? null,
      timeoutSeconds: config.timeout_seconds ?? null,
    };
    const applicability = this.adapterConfigs.validateConfig(config);
    if (!applicability.available) {
      return { applicability, runtime: emptyRuntime };
    }
    let credential: ProviderAdapterRuntime['credential'] = null;
    if (config.implementation !== 'mock' && this.secretResolver) {
      try {
        credential = this.secretResolver.resolve(context, config.credential_ref_json);
      } catch (error: any) {
        return {
          applicability: {
            available: false,
            reasonCode: typeof error?.getStatus === 'function' && error.getStatus() === 400
              ? 'malformed_config'
              : 'missing_credentials',
            message: error?.message ?? 'Adapter credential reference could not be resolved.',
          },
          runtime: emptyRuntime,
        };
      }
    }
    return {
      applicability: { available: true },
      runtime: {
        ...emptyRuntime,
        credential,
      },
    };
  }

  private contextWithAdapterRuntime(
    context: AiExecutionContextWithManager,
    runtime: ProviderAdapterRuntime,
  ): ProviderContext {
    return {
      ...context,
      adapterRuntime: runtime,
    };
  }

  private bindProviderRuntime<T extends ProviderBase>(
    provider: T,
    runtime: ProviderAdapterRuntime,
  ): T {
    return new Proxy(provider, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') {
          return value;
        }
        return (...args: unknown[]) => {
          const [first, ...rest] = args;
          if (first && typeof first === 'object' && 'tenantId' in first) {
            return value.apply(target, [this.contextWithAdapterRuntime(first as AiExecutionContextWithManager, runtime), ...rest]);
          }
          return value.apply(target, args);
        };
      },
    }) as T;
  }

  private providerForImplementation(providerKind: ProviderKind, implementation: string): ProviderBase | null {
    return this.providerImplementations.get(this.providerImplementationKey(providerKind, implementation)) ?? null;
  }

  private registerProviderImplementation(providerKind: ProviderKind, implementation: string, provider: ProviderBase): void {
    this.providerImplementations.set(this.providerImplementationKey(providerKind, implementation), provider);
  }

  private registerLegacyProviderKey(providerKind: ProviderKind, providerKey: string, implementation: string): void {
    this.legacyProviderKeyImplementations.set(this.providerImplementationKey(providerKind, providerKey), implementation);
  }

  private providerImplementationKey(providerKind: ProviderKind, implementation: string): string {
    return `${providerKind}:${implementation}`;
  }

  private legacyImplementationForProviderKey(providerKind: ProviderKind, providerKey: string): string | null {
    if (providerKey === 'mock') {
      return 'mock';
    }
    return this.legacyProviderKeyImplementations.get(this.providerImplementationKey(providerKind, providerKey)) ?? null;
  }

  private unavailableApplicability(
    reasonCode: NonNullable<CapabilityApplicability['reasonCode']>,
    message: string,
  ): CapabilityApplicability {
    return { available: false, reasonCode, message };
  }

  private healthFromApplicability(
    providerKind: ProviderKind,
    providerKey: string,
    applicability: CapabilityApplicability,
    implementation?: string,
    environment?: string,
  ): AdapterHealthResult {
    return {
      ok: false,
      providerKind,
      providerKey,
      implementation,
      environment,
      checkedAt: new Date().toISOString(),
      errorCode: this.errorCodeFromApplicability(applicability),
      message: applicability.message ?? 'Provider is unavailable.',
      retryable: false,
    };
  }

  private errorCodeFromApplicability(applicability: CapabilityApplicability): AdapterErrorCode {
    switch (applicability.reasonCode) {
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
