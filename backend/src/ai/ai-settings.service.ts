import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Features } from '../config/features';
import { AiSettings } from './ai-settings.entity';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { PlatformAiConfigService } from './platform/platform-ai-config.service';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';

export type AiSettingsView = {
  id: string;
  tenant_id: string;
  chat_enabled: boolean;
  mcp_enabled: boolean;
  provider_source: 'builtin' | 'custom';
  llm_provider: string | null;
  llm_endpoint_url: string | null;
  llm_model: string | null;
  mcp_key_max_lifetime_days: number | null;
  conversation_retention_days: number | null;
  web_search_enabled: boolean;
  web_enrichment_enabled: boolean;
  has_llm_api_key: boolean;
  provider_secret_writable: boolean;
  provider_validation_errors: string[];
  chat_ready: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateAiSettingsInput = {
  chat_enabled?: boolean;
  mcp_enabled?: boolean;
  provider_source?: 'builtin' | 'custom';
  llm_provider?: string | null;
  llm_api_key?: string | null;
  llm_endpoint_url?: string | null;
  llm_model?: string | null;
  mcp_key_max_lifetime_days?: number | null;
  conversation_retention_days?: number | null;
  web_search_enabled?: boolean;
  web_enrichment_enabled?: boolean;
};

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

@Injectable()
export class AiSettingsService {
  constructor(
    @InjectRepository(AiSettings)
    private readonly repo: Repository<AiSettings>,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly cipher: AiSecretCipherService,
    private readonly platformAiConfig: PlatformAiConfigService,
    private readonly audit?: AuditService,
  ) {}

  private getRepo(manager?: EntityManager) {
    return (manager ?? this.repo.manager).getRepository(AiSettings);
  }

  private async findWithSecrets(
    tenantId: string,
    manager?: EntityManager,
  ): Promise<AiSettings | null> {
    const repo = this.getRepo(manager);
    return repo
      .createQueryBuilder('settings')
      .addSelect('settings.llm_api_key_encrypted')
      .where('settings.tenant_id = :tenantId', { tenantId })
      .getOne();
  }

  private normalizeProviderSourceValue(value: 'builtin' | 'custom' | undefined): 'builtin' | 'custom' {
    if (Features.SINGLE_TENANT) {
      return 'custom';
    }
    return value === 'custom' ? 'custom' : 'builtin';
  }

  private async normalizeProviderSource(settings: AiSettings, manager?: EntityManager): Promise<AiSettings> {
    const nextValue = this.normalizeProviderSourceValue(settings.provider_source);
    if (settings.provider_source === nextValue) {
      return settings;
    }
    settings.provider_source = nextValue;
    settings.updated_at = new Date();
    await this.getRepo(manager).save(settings);
    return settings;
  }

  async find(tenantId: string, opts?: { manager?: EntityManager }): Promise<AiSettings | null> {
    const settings = await this.findWithSecrets(tenantId, opts?.manager);
    if (!settings) {
      return null;
    }
    return this.normalizeProviderSource(settings, opts?.manager);
  }

  async get(tenantId: string, opts?: { manager?: EntityManager }): Promise<AiSettings> {
    const repo = this.getRepo(opts?.manager);
    let settings = await this.find(tenantId, opts);

    if (!settings) {
      settings = await repo.save(repo.create({
        tenant_id: tenantId,
        chat_enabled: false,
        mcp_enabled: false,
        provider_source: Features.SINGLE_TENANT ? 'custom' : 'builtin',
        web_search_enabled: false,
        web_enrichment_enabled: false,
      }));
      settings.llm_api_key_encrypted = null;
    }

    return settings;
  }

  getEffectiveProviderSource(settings: Pick<AiSettings, 'provider_source'>): 'builtin' | 'custom' {
    if (Features.SINGLE_TENANT) {
      return 'custom';
    }
    return settings.provider_source === 'custom' ? 'custom' : 'builtin';
  }

  toProviderSnapshot(settings: Pick<AiSettings, 'llm_provider' | 'llm_model' | 'llm_endpoint_url' | 'llm_api_key_encrypted'>) {
    return {
      llm_provider: settings.llm_provider,
      llm_model: settings.llm_model,
      llm_endpoint_url: settings.llm_endpoint_url,
      has_llm_api_key: !!settings.llm_api_key_encrypted,
    };
  }

  async getProviderValidationErrors(settings: AiSettings): Promise<string[]> {
    if (this.getEffectiveProviderSource(settings) === 'builtin') {
      return (await this.platformAiConfig.isConfigured())
        ? []
        : ['Built-in AI provider is not configured.'];
    }
    return this.providerRegistry.validate(this.toProviderSnapshot(settings));
  }

  async update(
    tenantId: string,
    input: UpdateAiSettingsInput,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<AiSettings> {
    const repo = this.getRepo(opts?.manager);
    const existing = await this.find(tenantId, opts);
    const settings = existing ?? await this.get(tenantId, opts);
    const beforeView = existing ? await this.toView(settings, opts) : null;

    if (Object.prototype.hasOwnProperty.call(input, 'chat_enabled')) {
      settings.chat_enabled = input.chat_enabled === true;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'mcp_enabled')) {
      settings.mcp_enabled = input.mcp_enabled === true;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'provider_source')) {
      settings.provider_source = this.normalizeProviderSourceValue(input.provider_source);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'llm_provider')) {
      const provider = normalizeNullableString(input.llm_provider);
      if (provider && !this.providerRegistry.get(provider)) {
        throw new BadRequestException('Unsupported AI provider.');
      }
      settings.llm_provider = provider;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'llm_api_key')) {
      const raw = normalizeNullableString(input.llm_api_key);
      settings.llm_api_key_encrypted = raw ? this.cipher.encrypt(raw) : null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'llm_endpoint_url')) {
      settings.llm_endpoint_url = normalizeNullableString(input.llm_endpoint_url);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'llm_model')) {
      const model = normalizeNullableString(input.llm_model);
      if (model && model.length > 100) {
        throw new BadRequestException('llm_model must not exceed 100 characters.');
      }
      settings.llm_model = model;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'mcp_key_max_lifetime_days')) {
      const value = input.mcp_key_max_lifetime_days;
      if (value != null && (!Number.isInteger(value) || value <= 0)) {
        throw new BadRequestException('mcp_key_max_lifetime_days must be a positive integer.');
      }
      settings.mcp_key_max_lifetime_days = value ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'conversation_retention_days')) {
      const value = input.conversation_retention_days;
      if (value != null && (!Number.isInteger(value) || value <= 0)) {
        throw new BadRequestException('conversation_retention_days must be a positive integer.');
      }
      settings.conversation_retention_days = value ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'web_search_enabled')) {
      const wantEnabled = input.web_search_enabled === true;
      if (wantEnabled && !Features.AI_WEB_SEARCH_READY) {
        throw new BadRequestException('Web search cannot be enabled: BRAVE_SEARCH_API_KEY is not configured.');
      }
      settings.web_search_enabled = wantEnabled;
      if (!wantEnabled) {
        settings.web_enrichment_enabled = false;
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, 'web_enrichment_enabled')) {
      settings.web_enrichment_enabled = input.web_enrichment_enabled === true;
    }

    if (settings.web_enrichment_enabled && !settings.web_search_enabled) {
      throw new BadRequestException('Web enrichment requires web search to be enabled.');
    }

    if (settings.chat_enabled) {
      const providerErrors = await this.getProviderValidationErrors(settings);
      if (providerErrors.length > 0) {
        throw new BadRequestException({
          message: 'AI chat cannot be enabled until the provider is fully configured.',
          errors: providerErrors,
        });
      }
    }

    settings.updated_at = new Date();
    const saved = await repo.save(settings);
    saved.llm_api_key_encrypted = settings.llm_api_key_encrypted;
    if (this.audit) {
      await this.audit.log(
        {
          table: 'ai_settings',
          recordId: saved.id,
          action: beforeView ? 'update' : 'create',
          before: beforeView,
          after: await this.toView(saved, opts),
          userId: opts?.userId ?? null,
          sourceRef: opts?.sourceRef ?? null,
        },
        { manager: opts?.manager },
      );
    }
    return saved;
  }

  async toView(settings: AiSettings, opts?: { manager?: EntityManager }): Promise<AiSettingsView> {
    const normalized = await this.normalizeProviderSource(settings, opts?.manager);
    const providerErrors = await this.getProviderValidationErrors(normalized);

    return {
      id: normalized.id,
      tenant_id: normalized.tenant_id,
      chat_enabled: normalized.chat_enabled,
      mcp_enabled: normalized.mcp_enabled,
      provider_source: this.getEffectiveProviderSource(normalized),
      llm_provider: normalized.llm_provider,
      llm_endpoint_url: normalized.llm_endpoint_url,
      llm_model: normalized.llm_model,
      mcp_key_max_lifetime_days: normalized.mcp_key_max_lifetime_days,
      conversation_retention_days: normalized.conversation_retention_days,
      web_search_enabled: normalized.web_search_enabled,
      web_enrichment_enabled: normalized.web_enrichment_enabled,
      has_llm_api_key: !!normalized.llm_api_key_encrypted,
      provider_secret_writable: this.cipher.canEncrypt(),
      provider_validation_errors: providerErrors,
      chat_ready: providerErrors.length === 0,
      created_at: normalized.created_at.toISOString(),
      updated_at: normalized.updated_at.toISOString(),
    };
  }
}
