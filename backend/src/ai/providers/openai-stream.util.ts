import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AiStreamEvent, AiStreamParams, AiSystemPromptRole } from './ai-provider.types';
import { isAbortError } from './streaming.util';

const logger = new Logger('OpenAiCompatibleStream');

function toUsage(usage?: { prompt_tokens?: number | null; completion_tokens?: number | null } | null) {
  if (!usage) {
    return undefined;
  }
  return {
    input_tokens: usage.prompt_tokens ?? 0,
    output_tokens: usage.completion_tokens ?? 0,
  };
}

export function isOpenAiReasoningModel(model: string): boolean {
  const normalized = String(model || '').trim().toLowerCase();
  return normalized.startsWith('gpt-5')
    || normalized.startsWith('o1')
    || normalized.startsWith('o3')
    || normalized.startsWith('o4');
}

export function getOpenAiSystemPromptRole(model: string): AiSystemPromptRole {
  return isOpenAiReasoningModel(model) ? 'developer' : 'system';
}

export async function* openaiCompatibleStream(params: AiStreamParams): AsyncGenerator<AiStreamEvent> {
  const client = new OpenAI({
    apiKey: params.apiKey || 'unused',
    ...(params.endpointUrl ? { baseURL: params.endpointUrl } : {}),
    timeout: params.timeoutMs ?? 120_000,
    maxRetries: params.maxRetries ?? 2,
  });

  const tools: OpenAI.ChatCompletionTool[] = params.tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as any,
    },
  }));

  const systemPromptRole = params.systemPromptRole ?? 'system';
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    systemPromptRole === 'developer'
      ? { role: 'developer', content: params.systemPrompt }
      : { role: 'system', content: params.systemPrompt },
  ];

  for (const msg of params.messages) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
        role: 'assistant',
        content: msg.content || null,
      };
      if (msg.tool_calls?.length) {
        assistantMsg.tool_calls = msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        }));
      }
      messages.push(assistantMsg);
    } else if (msg.role === 'tool') {
      messages.push({
        role: 'tool',
        tool_call_id: msg.tool_call_id || '',
        content: msg.content,
      });
    }
  }

  const request: Record<string, unknown> = {
    model: params.model,
    messages,
    ...(tools.length > 0 ? { tools } : {}),
    stream: true,
  };
  request[params.maxTokensParam ?? 'max_completion_tokens'] = params.maxTokens;

  const stream = await client.chat.completions.create(
    request as unknown as OpenAI.ChatCompletionCreateParamsStreaming,
    params.signal ? { signal: params.signal } : undefined,
  );

  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>();
  let emittedDone = false;

  try {
    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) {
        continue;
      }

      const delta = choice.delta;

      if (delta?.content) {
        yield { type: 'text_delta', text: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (tc.id) {
            pendingToolCalls.set(idx, { id: tc.id, name: tc.function?.name || '', args: '' });
            yield { type: 'tool_call_start', id: tc.id, name: tc.function?.name || '' };
          }
          if (tc.function?.name) {
            const pending = pendingToolCalls.get(idx);
            if (pending && !pending.name) {
              pending.name = tc.function.name;
            }
          }
          if (tc.function?.arguments) {
            const pending = pendingToolCalls.get(idx);
            if (pending) {
              pending.args += tc.function.arguments;
              yield { type: 'tool_call_delta', id: pending.id, arguments: tc.function.arguments };
            } else {
              logger.warn(
                `provider=${params.providerId ?? 'unknown'} model=${params.model} tool_call_arguments_without_id index=${idx}`,
              );
            }
          }
        }
      }

      if (choice.finish_reason === 'length') {
        logger.warn(
          `provider=${params.providerId ?? 'unknown'} model=${params.model} finish_reason=length pending_tool_calls=${pendingToolCalls.size}`,
        );
        if (pendingToolCalls.size > 0) {
          yield {
            type: 'error',
            message: 'Model output was truncated before the tool call completed.',
          };
          return;
        }
        yield { type: 'done', usage: toUsage(chunk.usage) };
        emittedDone = true;
        continue;
      }

      if (choice.finish_reason && !['tool_calls', 'stop', 'function_call'].includes(choice.finish_reason)) {
        logger.warn(
          `provider=${params.providerId ?? 'unknown'} model=${params.model} finish_reason=${choice.finish_reason} pending_tool_calls=${pendingToolCalls.size}`,
        );
      }

      if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop' || choice.finish_reason === 'function_call') {
        for (const [, pending] of pendingToolCalls) {
          yield { type: 'tool_call_end', id: pending.id };
        }
        pendingToolCalls.clear();

        yield {
          type: 'done',
          usage: toUsage(chunk.usage),
        };
        emittedDone = true;
      }
    }
  } catch (error) {
    if (params.signal?.aborted || isAbortError(error)) {
      return;
    }
    throw error;
  }

  // Ensure done is always emitted even if no finish_reason was seen
  if (!emittedDone) {
    if (pendingToolCalls.size > 0) {
      logger.warn(
        `provider=${params.providerId ?? 'unknown'} model=${params.model} stream_ended_without_finish_reason pending_tool_calls=${pendingToolCalls.size}`,
      );
      yield {
        type: 'error',
        message: 'Model output ended before the tool call completed.',
      };
      return;
    }
    yield { type: 'done' };
  }
}
