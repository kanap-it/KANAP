import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { AiSettingsService } from './ai-settings.service';
import {
  PROVIDER_TEST_MAX_RETRIES,
  PROVIDER_TEST_MAX_TOKENS,
  PROVIDER_TEST_TIMEOUT_MS,
} from './provider-test.constants';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';
import {
  AiProviderSettingsSnapshot,
  AiProviderTestResult,
  AiStreamEvent,
} from './providers/ai-provider.types';

export type AiProviderTestInput = {
  llm_provider?: string | null;
  llm_model?: string | null;
  llm_endpoint_url?: string | null;
  llm_api_key?: string | null;
};

function normalizeNullableString(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

@Injectable()
export class AiProviderTestService {
  constructor(
    private readonly settingsService: AiSettingsService,
    private readonly cipher: AiSecretCipherService,
    private readonly providerRegistry: AiProviderRegistry,
  ) {}

  async testProvider(
    tenantId: string,
    input: AiProviderTestInput,
    opts?: { manager?: EntityManager },
  ): Promise<AiProviderTestResult> {
    const startedAt = Date.now();
    const currentSettings = await this.settingsService.find(tenantId, { manager: opts?.manager });
    const provider = normalizeNullableString(input.llm_provider) ?? currentSettings?.llm_provider ?? null;
    const model = normalizeNullableString(input.llm_model) ?? currentSettings?.llm_model ?? null;
    const endpointUrl = normalizeNullableString(input.llm_endpoint_url) ?? currentSettings?.llm_endpoint_url ?? null;

    let apiKey = normalizeNullableString(input.llm_api_key);
    if (!apiKey && currentSettings?.llm_api_key_encrypted) {
      try {
        apiKey = this.cipher.decrypt(currentSettings.llm_api_key_encrypted);
      } catch (error) {
        return this.fail({
          provider,
          model,
          startedAt,
          message: this.getErrorMessage(error),
          validationErrors: [this.getErrorMessage(error)],
        });
      }
    }

    const snapshot: AiProviderSettingsSnapshot = {
      llm_provider: provider,
      llm_model: model,
      llm_endpoint_url: endpointUrl,
      has_llm_api_key: !!apiKey,
    };

    const validationErrors = this.providerRegistry.validate(snapshot);
    if (validationErrors.length > 0) {
      return {
        ok: false,
        provider,
        model,
        latency_ms: null,
        message: 'Provider settings are incomplete.',
        validation_errors: validationErrors,
      };
    }

    const adapter = this.providerRegistry.get(provider);
    if (!adapter) {
      return {
        ok: false,
        provider,
        model,
        latency_ms: null,
        message: 'Provider is not configured.',
        validation_errors: ['Provider is required.'],
      };
    }

    try {
      const stream = adapter.createStream({
        model: model!,
        apiKey,
        endpointUrl,
        systemPrompt: 'Respond with a single word: ok.',
        messages: [{ role: 'user', content: 'Reply with ok.' }],
        tools: [],
        maxTokens: PROVIDER_TEST_MAX_TOKENS,
        timeoutMs: PROVIDER_TEST_TIMEOUT_MS,
        maxRetries: PROVIDER_TEST_MAX_RETRIES,
      });

      const iterator = stream[Symbol.asyncIterator]();
      const first = await iterator.next();
      if (!first.done && (first.value as AiStreamEvent | undefined)?.type === 'error') {
        return this.fail({
          provider,
          model,
          startedAt,
          message: (first.value as { message?: string }).message || 'Provider test failed.',
          validationErrors: [],
        });
      }

      return {
        ok: true,
        provider,
        model,
        latency_ms: Date.now() - startedAt,
        message: 'Provider test succeeded.',
        validation_errors: [],
      };
    } catch (error) {
      return this.fail({
        provider,
        model,
        startedAt,
        message: this.getErrorMessage(error),
        validationErrors: [],
      });
    }
  }

  private fail(input: {
    provider: string | null;
    model: string | null;
    startedAt: number;
    message: string;
    validationErrors: string[];
  }): AiProviderTestResult {
    return {
      ok: false,
      provider: input.provider,
      model: input.model,
      latency_ms: Date.now() - input.startedAt,
      message: input.message,
      validation_errors: input.validationErrors,
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return 'Provider test failed.';
  }
}
