import { Injectable } from '@nestjs/common';
import { AiExecutionContextWithManager } from '../../ai.types';
import { AiSecretCipherService } from '../../ai-secret-cipher.service';
import { AiSettingsService } from '../../ai-settings.service';
import { PlatformAiConfigService } from '../../platform/platform-ai-config.service';
import { AiProviderRegistry } from '../../providers/ai-provider-registry.service';
import { AiProviderAdapter, AiProviderId, AiStreamEvent } from '../../providers/ai-provider.types';

export type AgentLlmRuntime = {
  source: 'builtin' | 'custom';
  provider: AiProviderAdapter;
  providerId: string;
  model: string;
  apiKey: string | null;
  endpointUrl: string | null;
};

export type AgentJsonModelResult = {
  text: string;
  runtime: AgentLlmRuntime;
  usage: { input_tokens: number; output_tokens: number } | null;
  latencyMs: number;
};

export function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class AiAgentLlmClient {
  constructor(
    private readonly settings: AiSettingsService,
    private readonly cipher: AiSecretCipherService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly platformAiConfig: PlatformAiConfigService,
  ) {}

  async resolveRuntime(context: AiExecutionContextWithManager): Promise<AgentLlmRuntime | null> {
    const settings = await this.settings.get(context.tenantId, { manager: context.manager });
    const source = this.settings.getEffectiveProviderSource(settings);
    if (source === 'builtin') {
      const runtime = await this.platformAiConfig.getRuntimeConfig();
      const provider = this.providerRegistry.get(runtime.provider);
      if (!provider) return null;
      return {
        source,
        provider,
        providerId: runtime.provider,
        model: runtime.model,
        apiKey: runtime.apiKey,
        endpointUrl: runtime.endpoint_url,
      };
    }

    if (!settings.llm_provider || !settings.llm_model || !settings.llm_api_key_encrypted) {
      return null;
    }
    const provider = this.providerRegistry.get(settings.llm_provider);
    if (!provider) return null;
    return {
      source,
      provider,
      providerId: settings.llm_provider,
      model: settings.llm_model,
      apiKey: this.cipher.decrypt(settings.llm_api_key_encrypted),
      endpointUrl: settings.llm_endpoint_url,
    };
  }

  async callJsonModel(
    context: AiExecutionContextWithManager,
    input: {
      systemPrompt: string;
      userPayload: Record<string, unknown>;
      maxTokens: number;
      timeoutEnvName: string;
      defaultTimeoutMs: number;
    },
  ): Promise<AgentJsonModelResult | null> {
    const runtime = await this.resolveRuntime(context);
    if (!runtime) return null;

    const timeoutMs = parsePositiveIntEnv(process.env[input.timeoutEnvName], input.defaultTimeoutMs);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    let text = '';
    let usage: AgentJsonModelResult['usage'] = null;
    try {
      const stream = runtime.provider.createStream({
        providerId: runtime.providerId as AiProviderId,
        model: runtime.model,
        apiKey: runtime.apiKey,
        endpointUrl: runtime.endpointUrl,
        systemPrompt: input.systemPrompt,
        messages: [{
          role: 'user',
          content: JSON.stringify(input.userPayload),
        }],
        tools: [],
        maxTokens: input.maxTokens,
        timeoutMs,
        maxRetries: 1,
        signal: controller.signal,
      });

      for await (const event of stream) {
        switch (event.type) {
          case 'text_delta':
            text += event.text;
            break;
          case 'done':
            usage = event.usage ?? usage;
            break;
          case 'error':
            throw new Error(event.message || 'Model stream returned an error.');
          default:
            break;
        }
      }
    } finally {
      clearTimeout(timer);
    }
    const normalized = text.trim();
    if (!normalized) {
      throw new Error('Model returned empty JSON.');
    }
    return {
      text: normalized,
      runtime,
      usage,
      latencyMs: Date.now() - started,
    };
  }
}
