import OpenAI from 'openai';
import { AiStreamEvent, AiStreamParams } from './ai-provider.types';

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

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: params.systemPrompt },
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

  const stream = await client.chat.completions.create({
    model: params.model,
    messages,
    ...(tools.length > 0 ? { tools } : {}),
    max_completion_tokens: params.maxTokens,
    stream: true,
  });

  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>();
  let emittedDone = false;

  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    if (!choice) continue;

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
        if (tc.function?.arguments) {
          const pending = pendingToolCalls.get(idx);
          if (pending) {
            pending.args += tc.function.arguments;
            yield { type: 'tool_call_delta', id: pending.id, arguments: tc.function.arguments };
          }
        }
      }
    }

    if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
      for (const [, pending] of pendingToolCalls) {
        yield { type: 'tool_call_end', id: pending.id };
      }
      pendingToolCalls.clear();

      const usage = chunk.usage;
      yield {
        type: 'done',
        usage: usage
          ? { input_tokens: usage.prompt_tokens ?? 0, output_tokens: usage.completion_tokens ?? 0 }
          : undefined,
      };
      emittedDone = true;
    }
  }

  // Ensure done is always emitted even if no finish_reason was seen
  if (!emittedDone) {
    for (const [, pending] of pendingToolCalls) {
      yield { type: 'tool_call_end', id: pending.id };
    }
    yield { type: 'done' };
  }
}
