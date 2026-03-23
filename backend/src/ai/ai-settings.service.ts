import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AiSettings } from './ai-settings.entity';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { Features } from '../config/features';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';

export type AiSettingsView = {
  id: string;
  tenant_id: string;
  chat_enabled: boolean;
  mcp_enabled: boolean;
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

  async find(tenantId: string, opts?: { manager?: EntityManager }): Promise<AiSettings | null> {
    return this.findWithSecrets(tenantId, opts?.manager);
  }

  async get(tenantId: string, opts?: { manager?: EntityManager }): Promise<AiSettings> {
    const repo = this.getRepo(opts?.manager);
    let settings = await this.find(tenantId, opts);

    if (!settings) {
      settings = await repo.save(repo.create({
        tenant_id: tenantId,
        chat_enabled: false,
        mcp_enabled: false,
        web_search_enabled: false,
        web_enrichment_enabled: false,
      }));
      settings.llm_api_key_encrypted = null;
    }

    return settings;
  }

  async update(
    tenantId: string,
    input: UpdateAiSettingsInput,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<AiSettings> {
    const repo = this.getRepo(opts?.manager);
    const existing = await this.find(tenantId, opts);
    const settings = existing ?? await this.get(tenantId, opts);
    const beforeView = existing ? this.toView(settings) : null;

    if (Object.prototype.hasOwnProperty.call(input, 'chat_enabled')) {
      settings.chat_enabled = input.chat_enabled === true;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'mcp_enabled')) {
      settings.mcp_enabled = input.mcp_enabled === true;
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
      // Cascade: disabling web search also disables web enrichment
      if (!wantEnabled) {
        settings.web_enrichment_enabled = false;
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, 'web_enrichment_enabled')) {
      settings.web_enrichment_enabled = input.web_enrichment_enabled === true;
    }

    // Dependency: web enrichment requires web search
    if (settings.web_enrichment_enabled && !settings.web_search_enabled) {
      throw new BadRequestException('Web enrichment requires web search to be enabled.');
    }

    if (settings.chat_enabled) {
      const providerErrors = this.providerRegistry.validate(this.toProviderSnapshot(settings));
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
          after: this.toView(saved),
          userId: opts?.userId ?? null,
          sourceRef: opts?.sourceRef ?? null,
        },
        { manager: opts?.manager },
      );
    }
    return saved;
  }

  toProviderSnapshot(settings: Pick<AiSettings, 'llm_provider' | 'llm_model' | 'llm_endpoint_url' | 'llm_api_key_encrypted'>) {
    return {
      llm_provider: settings.llm_provider,
      llm_model: settings.llm_model,
      llm_endpoint_url: settings.llm_endpoint_url,
      has_llm_api_key: !!settings.llm_api_key_encrypted,
    };
  }

  toView(settings: AiSettings): AiSettingsView {
    const snapshot = this.toProviderSnapshot(settings);
    const providerErrors = this.providerRegistry.validate(snapshot);

    return {
      id: settings.id,
      tenant_id: settings.tenant_id,
      chat_enabled: settings.chat_enabled,
      mcp_enabled: settings.mcp_enabled,
      llm_provider: settings.llm_provider,
      llm_endpoint_url: settings.llm_endpoint_url,
      llm_model: settings.llm_model,
      mcp_key_max_lifetime_days: settings.mcp_key_max_lifetime_days,
      conversation_retention_days: settings.conversation_retention_days,
      web_search_enabled: settings.web_search_enabled,
      web_enrichment_enabled: settings.web_enrichment_enabled,
      has_llm_api_key: snapshot.has_llm_api_key,
      provider_secret_writable: this.cipher.canEncrypt(),
      provider_validation_errors: providerErrors,
      chat_ready: providerErrors.length === 0,
      created_at: settings.created_at.toISOString(),
      updated_at: settings.updated_at.toISOString(),
    };
  }
}
