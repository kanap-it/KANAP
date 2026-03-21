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
export class OpenAiProviderAdapter implements AiProviderAdapter {
  readonly descriptor: AiProviderDescriptor = {
    id: 'openai',
    label: 'OpenAI',
    description: 'OpenAI API with streaming and tool calling.',
    capabilities: {
      supportsStreaming: true,
      supportsToolCalling: true,
      requiresApiKey: true,
      allowsCustomEndpoint: true,
      contextWindow: 128000,
    },
  };

  validateConfiguration(settings: AiProviderSettingsSnapshot): string[] {
    const errors: string[] = [];
    if (!settings.has_llm_api_key) errors.push('API key is required.');
    if (!settings.llm_model) errors.push('Model is required.');
    return errors;
  }

  async *createStream(params: AiStreamParams): AsyncGenerator<AiStreamEvent> {
    yield* openaiCompatibleStream(params);
  }
}
