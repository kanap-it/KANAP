import { Injectable } from '@nestjs/common';
import { AiSettings } from '../ai-settings.entity';
import { CustomAiProviderAdapter } from './custom-ai-provider.adapter';
import { AnthropicAiProviderAdapter } from './anthropic-ai-provider.adapter';
import { OllamaAiProviderAdapter } from './ollama-ai-provider.adapter';
import { OpenAiProviderAdapter } from './openai-ai-provider.adapter';
import {
  AiProviderAdapter,
  AiProviderDescriptor,
  AiProviderId,
  AiProviderSettingsSnapshot,
} from './ai-provider.types';

@Injectable()
export class AiProviderRegistry {
  private readonly adapters = new Map<AiProviderId, AiProviderAdapter>();

  constructor(
    anthropic: AnthropicAiProviderAdapter,
    openai: OpenAiProviderAdapter,
    ollama: OllamaAiProviderAdapter,
    custom: CustomAiProviderAdapter,
  ) {
    for (const adapter of [anthropic, openai, ollama, custom]) {
      this.adapters.set(adapter.descriptor.id, adapter);
    }
  }

  list(): AiProviderDescriptor[] {
    return [...this.adapters.values()].map((adapter) => adapter.descriptor);
  }

  get(providerId: string | null | undefined): AiProviderAdapter | null {
    if (!providerId) return null;
    return this.adapters.get(providerId as AiProviderId) ?? null;
  }

  toSnapshot(settings: Pick<AiSettings, 'llm_provider' | 'llm_model' | 'llm_endpoint_url'> & {
    has_llm_api_key: boolean;
  }): AiProviderSettingsSnapshot {
    return {
      llm_provider: settings.llm_provider,
      llm_model: settings.llm_model,
      llm_endpoint_url: settings.llm_endpoint_url,
      has_llm_api_key: settings.has_llm_api_key,
    };
  }

  validate(settings: Pick<AiSettings, 'llm_provider' | 'llm_model' | 'llm_endpoint_url'> & {
    has_llm_api_key: boolean;
  }): string[] {
    const adapter = this.get(settings.llm_provider);
    if (!adapter) {
      return settings.llm_provider ? ['Unknown provider.'] : ['Provider is required.'];
    }
    return adapter.validateConfiguration(this.toSnapshot(settings));
  }

  isChatReady(settings: Pick<AiSettings, 'llm_provider' | 'llm_model' | 'llm_endpoint_url'> & {
    has_llm_api_key: boolean;
  }): boolean {
    return this.validate(settings).length === 0;
  }
}
