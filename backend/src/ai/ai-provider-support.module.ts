import { Module } from '@nestjs/common';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { AnthropicAiProviderAdapter } from './providers/anthropic-ai-provider.adapter';
import { CustomAiProviderAdapter } from './providers/custom-ai-provider.adapter';
import { OllamaAiProviderAdapter } from './providers/ollama-ai-provider.adapter';
import { OpenAiProviderAdapter } from './providers/openai-ai-provider.adapter';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';

@Module({
  providers: [
    AiSecretCipherService,
    AnthropicAiProviderAdapter,
    OpenAiProviderAdapter,
    OllamaAiProviderAdapter,
    CustomAiProviderAdapter,
    AiProviderRegistry,
  ],
  exports: [
    AiSecretCipherService,
    AnthropicAiProviderAdapter,
    OpenAiProviderAdapter,
    OllamaAiProviderAdapter,
    CustomAiProviderAdapter,
    AiProviderRegistry,
  ],
})
export class AiProviderSupportModule {}
