import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Features } from '../config/features';
import { AiModelConfig } from './ai-model-config.entity';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { AiSettings } from './ai-settings.entity';
import { AiAgentDefinition } from './control-plane/entities/ai-agent-definition.entity';
import { PlatformAiConfigService } from './platform/platform-ai-config.service';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';

export type AiModelConsumer = { type: 'chat' } | { type: 'agent'; agentId: string };

export type ResolvedModel = {
  source: 'registry' | 'builtin';
  configId: string | null;
  configName: string | null;
  provider: string;
  model: string;
  endpointUrl: string | null;
  apiKey: string | null;
  supportsVision: boolean;
  priceInputEurPerMtok: number | null;
  priceOutputEurPerMtok: number | null;
  // Per-model LLM timeout; null falls back to the caller's per-stage env default.
  timeoutMs: number | null;
};

export type AiModelResolutionErrorCode = 'no_model_available' | 'builtin_not_configured';

export class AiModelResolutionError extends Error {
  constructor(
    readonly code: AiModelResolutionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AiModelResolutionError';
  }
}

function parsePriceEurPerMtok(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Single resolution point for "which LLM does this consumer use?".
 *
 * Chain: explicit assignment (ai_settings.chat_model_config_id or
 * ai_agent_definitions.llm_model_config_id) → tenant default registry entry →
 * platform builtin (multi-tenant only) → typed error.
 *
 * An archived or dangling assignment falls through to the next step with a
 * structured warning (ops signal, never silent). Reads only — this service is
 * not an AI entry point and performs no quota or subscription checks.
 *
 * All lookups go through the caller's tenant-scoped EntityManager: the
 * ai_model_configs table is RLS-forced, so a manager without app.current_tenant
 * would simply see no rows.
 */
@Injectable()
export class AiModelResolverService {
  private readonly logger = new Logger(AiModelResolverService.name);

  constructor(
    @InjectRepository(AiModelConfig)
    private readonly configRepo: Repository<AiModelConfig>,
    @InjectRepository(AiSettings)
    private readonly settingsRepo: Repository<AiSettings>,
    @InjectRepository(AiAgentDefinition)
    private readonly agentRepo: Repository<AiAgentDefinition>,
    private readonly platformAiConfig: PlatformAiConfigService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly cipher: AiSecretCipherService,
  ) {}

  private configRepoFor(manager?: EntityManager) {
    return (manager ?? this.configRepo.manager).getRepository(AiModelConfig);
  }

  async resolve(tenantId: string, consumer: AiModelConsumer, manager?: EntityManager): Promise<ResolvedModel> {
    const assignmentId = await this.loadAssignmentId(tenantId, consumer, manager);
    return this.resolveForAssignment(tenantId, assignmentId, manager, this.describeConsumer(consumer));
  }

  async tryResolve(tenantId: string, consumer: AiModelConsumer, manager?: EntityManager): Promise<ResolvedModel | null> {
    try {
      return await this.resolve(tenantId, consumer, manager);
    } catch (error) {
      if (error instanceof AiModelResolutionError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Resolution chain starting from an explicit assignment id (already loaded by
   * the caller — e.g. validation of a settings payload not yet saved).
   */
  async resolveForAssignment(
    tenantId: string,
    assignmentId: string | null,
    manager?: EntityManager,
    consumerLabel = 'unknown',
  ): Promise<ResolvedModel> {
    if (assignmentId) {
      const assigned = await this.loadActiveConfig(tenantId, assignmentId, manager);
      if (assigned) {
        return this.fromConfig(assigned);
      }
      this.logger.warn(
        `AI model assignment ${assignmentId} for tenant ${tenantId} (consumer=${consumerLabel}) `
        + 'is archived or missing; falling back to the tenant default model.',
      );
    }

    const fallback = await this.configRepoFor(manager).findOne({
      where: { tenant_id: tenantId, is_default: true, status: 'active' },
    });
    if (fallback) {
      const withKey = await this.loadActiveConfig(tenantId, fallback.id, manager);
      if (withKey) {
        return this.fromConfig(withKey);
      }
    }

    if (!Features.SINGLE_TENANT) {
      if (!(await this.platformAiConfig.isConfigured())) {
        throw new AiModelResolutionError('builtin_not_configured', 'Built-in AI provider is not configured.');
      }
      const runtime = await this.platformAiConfig.getRuntimeConfig();
      return {
        source: 'builtin',
        configId: null,
        configName: null,
        provider: runtime.provider,
        model: runtime.model,
        endpointUrl: runtime.endpoint_url,
        apiKey: runtime.apiKey,
        // The platform-operated model is multimodal; tenants cannot configure it.
        supportsVision: true,
        priceInputEurPerMtok: 0,
        priceOutputEurPerMtok: 0,
        timeoutMs: null,
      };
    }

    throw new AiModelResolutionError(
      'no_model_available',
      'No AI model is configured: assign a model or define a default in the AI models registry.',
    );
  }

  /**
   * Validation errors for the model a consumer would resolve to — powers
   * chat_ready / provider_validation_errors without exposing resolution
   * internals to callers.
   */
  async validationErrors(tenantId: string, assignmentId: string | null, manager?: EntityManager): Promise<string[]> {
    let resolved: ResolvedModel;
    try {
      resolved = await this.resolveForAssignment(tenantId, assignmentId, manager);
    } catch (error) {
      if (error instanceof AiModelResolutionError) {
        return [error.message];
      }
      throw error;
    }
    if (resolved.source === 'builtin') {
      return [];
    }
    return this.providerRegistry.validate({
      llm_provider: resolved.provider,
      llm_model: resolved.model,
      llm_endpoint_url: resolved.endpointUrl,
      has_llm_api_key: resolved.apiKey != null,
    });
  }

  private describeConsumer(consumer: AiModelConsumer): string {
    return consumer.type === 'agent' ? `agent:${consumer.agentId}` : 'chat';
  }

  private async loadAssignmentId(
    tenantId: string,
    consumer: AiModelConsumer,
    manager?: EntityManager,
  ): Promise<string | null> {
    if (consumer.type === 'chat') {
      const settings = await (manager ?? this.settingsRepo.manager)
        .getRepository(AiSettings)
        .findOne({ where: { tenant_id: tenantId } });
      return settings?.chat_model_config_id ?? null;
    }
    const definition = await (manager ?? this.agentRepo.manager)
      .getRepository(AiAgentDefinition)
      .findOne({ where: { id: consumer.agentId, tenant_id: tenantId } });
    return definition?.llm_model_config_id ?? null;
  }

  private async loadActiveConfig(
    tenantId: string,
    configId: string,
    manager?: EntityManager,
  ): Promise<AiModelConfig | null> {
    return this.configRepoFor(manager)
      .createQueryBuilder('config')
      .addSelect('config.api_key_encrypted')
      .where('config.id = :configId', { configId })
      .andWhere('config.tenant_id = :tenantId', { tenantId })
      .andWhere('config.status = :status', { status: 'active' })
      .getOne();
  }

  private fromConfig(config: AiModelConfig): ResolvedModel {
    return {
      source: 'registry',
      configId: config.id,
      configName: config.name,
      provider: config.provider,
      model: config.model,
      endpointUrl: config.endpoint_url,
      apiKey: config.api_key_encrypted ? this.cipher.decrypt(config.api_key_encrypted) : null,
      supportsVision: config.supports_vision !== false,
      priceInputEurPerMtok: parsePriceEurPerMtok(config.price_input_eur_per_mtok),
      priceOutputEurPerMtok: parsePriceEurPerMtok(config.price_output_eur_per_mtok),
      timeoutMs: config.llm_timeout_ms ?? null,
    };
  }
}
