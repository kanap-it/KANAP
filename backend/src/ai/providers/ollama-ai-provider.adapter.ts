import { Injectable } from '@nestjs/common';
import {
  AiProviderAdapter,
  AiProviderDescriptor,
  AiProviderSettingsSnapshot,
  AiStreamEvent,
  AiStreamParams,
} from './ai-provider.types';
import { openaiCompatibleStream } from './openai-stream.util';

@Injectable()
export class OllamaAiProviderAdapter implements AiProviderAdapter {
  readonly descriptor: AiProviderDescriptor = {
    id: 'ollama',
    label: 'Ollama',
    description: 'Self-hosted Ollama with OpenAI-compatible streaming and tool calling.',
    capabilities: {
      supportsStreaming: true,
      supportsToolCalling: true,
      requiresApiKey: false,
      allowsCustomEndpoint: true,
      contextWindow: null,
    },
  };

  validateConfiguration(settings: AiProviderSettingsSnapshot): string[] {
    const errors: string[] = [];
    if (!settings.llm_model) errors.push('Model is required.');
    if (!settings.llm_endpoint_url) errors.push('Endpoint URL is required.');
    return errors;
  }

  async *createStream(params: AiStreamParams): AsyncGenerator<AiStreamEvent> {
    yield* openaiCompatibleStream({
      ...params,
      endpointUrl: params.endpointUrl,
      apiKey: params.apiKey || 'ollama',
    });
  }
}
