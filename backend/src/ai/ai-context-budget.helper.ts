import { AiProviderMessage } from './providers/ai-provider.types';

export type AiContextBudgetResult = {
  messages: AiProviderMessage[];
  estimatedRequestSize: number;
  budget: number | null;
  compacted: boolean;
  compactedToolResults: number;
  compactedAssistantMessages: number;
  overBudgetAfterCompaction: boolean;
};

const DEFAULT_KEEP_RECENT_MESSAGES = 8;
const SAFETY_FACTOR = 0.8;

function estimateMessageSize(message: AiProviderMessage): number {
  let size = message.role.length + message.content.length + 16;
  if (message.tool_call_id) {
    size += message.tool_call_id.length;
  }
  if (message.tool_calls?.length) {
    size += JSON.stringify(message.tool_calls).length;
  }
  return size;
}

function estimateRequestSize(systemPrompt: string, messages: AiProviderMessage[]): number {
  return systemPrompt.length + 32 + messages.reduce((total, message) => total + estimateMessageSize(message), 0);
}

function summarizeArrayValue(value: unknown): string | null {
  return Array.isArray(value) ? `items=${value.length}` : null;
}

function summarizeToolResult(result: unknown): string {
  if (Array.isArray(result)) {
    return `items=${result.length}`;
  }

  if (!result || typeof result !== 'object') {
    return '';
  }

  const summaryParts: string[] = [];
  const typedResult = result as Record<string, unknown>;

  const countKeys = ['items', 'groups', 'results', 'rows', 'records'] as const;
  for (const key of countKeys) {
    const summary = summarizeArrayValue(typedResult[key]);
    if (summary) {
      summaryParts.push(summary);
    }
  }

  if (typedResult.values && typeof typedResult.values === 'object' && !Array.isArray(typedResult.values)) {
    summaryParts.push(`fields=${Object.keys(typedResult.values as Record<string, unknown>).length}`);
  }

  for (const key of ['total', 'returned', 'count', 'matched'] as const) {
    const value = typedResult[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      summaryParts.push(`${key}=${value}`);
    }
  }

  if (typeof typedResult.truncated === 'boolean') {
    summaryParts.push(`truncated=${typedResult.truncated}`);
  }

  if (typeof typedResult.complete === 'boolean') {
    summaryParts.push(`complete=${typedResult.complete}`);
  }

  return summaryParts.join(' ');
}

function compactToolMessage(message: AiProviderMessage): AiProviderMessage {
  let toolName = 'tool';
  let summary = '';

  try {
    const parsed = JSON.parse(message.content) as {
      tool_name?: unknown;
      result?: unknown;
    };
    if (typeof parsed.tool_name === 'string' && parsed.tool_name.trim()) {
      toolName = parsed.tool_name.trim();
    }
    summary = summarizeToolResult(parsed.result);
  } catch {
    summary = '';
  }

  return {
    ...message,
    content: `[tool result truncated: ${toolName}${summary ? ` ${summary}` : ''}]`,
  };
}

function compactAssistantMessage(message: AiProviderMessage): AiProviderMessage {
  return {
    ...message,
    content: `[assistant message truncated: ${message.content.length} chars]`,
  };
}

function compactPrefix(
  messages: AiProviderMessage[],
  isEligible: (message: AiProviderMessage, index: number) => boolean,
  budget: number,
  currentSize: number,
  compactFn: (message: AiProviderMessage) => AiProviderMessage,
): {
  messages: AiProviderMessage[];
  size: number;
  compactedCount: number;
} {
  const nextMessages = messages.map((message) => ({ ...message }));
  let size = currentSize;
  let compactedCount = 0;

  for (let index = 0; index < nextMessages.length; index++) {
    if (size <= budget) {
      break;
    }

    const message = nextMessages[index];
    if (!isEligible(message, index)) {
      continue;
    }

    const before = estimateMessageSize(message);
    const compacted = compactFn(message);
    const after = estimateMessageSize(compacted);

    if (after >= before) {
      continue;
    }

    nextMessages[index] = compacted;
    size -= before - after;
    compactedCount++;
  }

  return {
    messages: nextMessages,
    size,
    compactedCount,
  };
}

export function prepareAiProviderMessages(params: {
  systemPrompt: string;
  messages: AiProviderMessage[];
  contextWindow?: number | null;
  keepRecentMessages?: number;
}): AiContextBudgetResult {
  const keepRecentMessages = params.keepRecentMessages ?? DEFAULT_KEEP_RECENT_MESSAGES;
  const estimatedRequestSize = estimateRequestSize(params.systemPrompt, params.messages);
  const contextWindow = params.contextWindow && params.contextWindow > 0 ? params.contextWindow : null;

  if (!contextWindow) {
    return {
      messages: params.messages.map((message) => ({ ...message })),
      estimatedRequestSize,
      budget: null,
      compacted: false,
      compactedToolResults: 0,
      compactedAssistantMessages: 0,
      overBudgetAfterCompaction: false,
    };
  }

  const budget = Math.floor(contextWindow * SAFETY_FACTOR);
  if (estimatedRequestSize <= budget) {
    return {
      messages: params.messages.map((message) => ({ ...message })),
      estimatedRequestSize,
      budget,
      compacted: false,
      compactedToolResults: 0,
      compactedAssistantMessages: 0,
      overBudgetAfterCompaction: false,
    };
  }

  const protectedStart = Math.max(0, params.messages.length - keepRecentMessages);
  const initialMessages = params.messages.map((message) => ({ ...message }));

  const firstPass = compactPrefix(
    initialMessages,
    (message, index) => index < protectedStart && message.role === 'tool',
    budget,
    estimatedRequestSize,
    compactToolMessage,
  );

  const secondPass = compactPrefix(
    firstPass.messages,
    (message, index) => index < protectedStart && message.role === 'assistant',
    budget,
    firstPass.size,
    compactAssistantMessage,
  );

  return {
    messages: secondPass.messages,
    estimatedRequestSize,
    budget,
    compacted: firstPass.compactedCount > 0 || secondPass.compactedCount > 0,
    compactedToolResults: firstPass.compactedCount,
    compactedAssistantMessages: secondPass.compactedCount,
    overBudgetAfterCompaction: secondPass.size > budget,
  };
}
