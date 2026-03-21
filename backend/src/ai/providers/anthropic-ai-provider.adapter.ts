import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  AiProviderAdapter,
  AiProviderDescriptor,
  AiProviderSettingsSnapshot,
  AiStreamEvent,
  AiStreamParams,
} from './ai-provider.types';

@Injectable()
export class AnthropicAiProviderAdapter implements AiProviderAdapter {
  readonly descriptor: AiProviderDescriptor = {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Anthropic Messages API with streaming and tool calling.',
    capabilities: {
      supportsStreaming: true,
      supportsToolCalling: true,
      requiresApiKey: true,
      allowsCustomEndpoint: false,
      contextWindow: 200000,
    },
  };

  validateConfiguration(settings: AiProviderSettingsSnapshot): string[] {
    const errors: string[] = [];
    if (!settings.has_llm_api_key) errors.push('API key is required.');
    if (!settings.llm_model) errors.push('Model is required.');
    return errors;
  }

  async *createStream(params: AiStreamParams): AsyncGenerator<AiStreamEvent> {
    const client = new Anthropic({ apiKey: params.apiKey || '' });

    const messages: Anthropic.MessageParam[] = [];
    for (const msg of params.messages) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        if (msg.tool_calls?.length) {
          for (const tc of msg.tool_calls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: JSON.parse(tc.arguments),
            });
          }
        }
        messages.push({ role: 'assistant', content });
      } else if (msg.role === 'tool') {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.tool_call_id || '',
              content: msg.content,
            },
          ],
        });
      }
    }

    const tools: Anthropic.Tool[] = params.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }));

    const stream = client.messages.stream({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.systemPrompt,
      messages,
      ...(tools.length > 0 ? { tools } : {}),
    });

    let currentToolId: string | null = null;

    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_start': {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            currentToolId = block.id;
            yield { type: 'tool_call_start', id: block.id, name: block.name };
          }
          break;
        }
        case 'content_block_delta': {
          const delta = event.delta;
          if (delta.type === 'text_delta') {
            yield { type: 'text_delta', text: delta.text };
          } else if (delta.type === 'input_json_delta' && currentToolId) {
            yield { type: 'tool_call_delta', id: currentToolId, arguments: delta.partial_json };
          }
          break;
        }
        case 'content_block_stop': {
          if (currentToolId) {
            yield { type: 'tool_call_end', id: currentToolId };
            currentToolId = null;
          }
          break;
        }
        case 'message_delta': {
          const usage = (event as any).usage;
          if (event.delta?.stop_reason === 'end_turn' || event.delta?.stop_reason === 'tool_use') {
            // Usage comes from message_delta
          }
          break;
        }
        default:
          break;
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      type: 'done',
      usage: {
        input_tokens: finalMessage.usage?.input_tokens ?? 0,
        output_tokens: finalMessage.usage?.output_tokens ?? 0,
      },
    };
  }
}
