import type { AiProviderMessage, AiProviderToolDef } from './providers/ai-provider.types';

export type AiContextBudgetResult = {
  messages: AiProviderMessage[];
  estimatedRequestSize: number;
  budget: number | null;
  compacted: boolean;
  compactedToolResults: number;
  compactedAssistantMessages: number;
  overBudgetAfterCompaction: boolean;
  breakdown: AiContextBudgetBreakdown;
};

export type AiContextBudgetSectionBreakdown = {
  key: string;
  label: string;
  size: number;
};

export type AiContextBudgetBreakdown = {
  unit: 'estimated_tokens';
  total: number;
  system_prompt: number;
  system_prompt_sections?: AiContextBudgetSectionBreakdown[];
  messages: number;
  message_roles: {
    user: number;
    assistant: number;
    tool: number;
    other: number;
  };
  tool_call_metadata: number;
  protocol_overhead: number;
  tool_schemas?: AiContextToolSchemaBreakdown;
  total_with_tools?: number;
};

export type AiContextToolSchemaBreakdown = {
  total: number;
  count: number;
  tools: Array<{
    name: string;
    size: number;
  }>;
};

const DEFAULT_KEEP_RECENT_MESSAGES = 8;
const SAFETY_FACTOR = 0.8;
const REQUEST_PROTOCOL_OVERHEAD = 32;

export function estimateTokenCount(text: string): number {
  if (!text) {
    return 0;
  }
  const roughByChars = Math.ceil(text.length / 4);
  const lexicalUnits = text.match(/[\p{L}\p{N}_'-]+|[^\s\p{L}\p{N}_]/gu)?.length ?? 0;
  const roughByLexicalUnits = Math.ceil(lexicalUnits * 0.85);
  return Math.max(1, Math.max(roughByChars, roughByLexicalUnits));
}

function estimateMessageSize(message: AiProviderMessage): number {
  let size = estimateTokenCount(message.role) + estimateTokenCount(message.content) + 4;
  if (message.tool_call_id) {
    size += estimateTokenCount(message.tool_call_id);
  }
  if (message.tool_calls?.length) {
    size += estimateTokenCount(JSON.stringify(message.tool_calls));
  }
  return size;
}

function estimateToolCallMetadataSize(message: AiProviderMessage): number {
  let size = 0;
  if (message.tool_call_id) {
    size += estimateTokenCount(message.tool_call_id);
  }
  if (message.tool_calls?.length) {
    size += estimateTokenCount(JSON.stringify(message.tool_calls));
  }
  return size;
}

function estimateRequestBreakdown(
  systemPrompt: string,
  messages: AiProviderMessage[],
  systemPromptSections?: AiContextBudgetSectionBreakdown[],
): AiContextBudgetBreakdown {
  const messageRoles = {
    user: 0,
    assistant: 0,
    tool: 0,
    other: 0,
  };
  let messagesSize = 0;
  let toolCallMetadata = 0;

  for (const message of messages) {
    const size = estimateMessageSize(message);
    messagesSize += size;
    if (message.role === 'user' || message.role === 'assistant' || message.role === 'tool') {
      messageRoles[message.role] += size;
    } else {
      messageRoles.other += size;
    }
    toolCallMetadata += estimateToolCallMetadataSize(message);
  }

  return {
    unit: 'estimated_tokens',
    total: estimateTokenCount(systemPrompt) + REQUEST_PROTOCOL_OVERHEAD + messagesSize,
    system_prompt: estimateTokenCount(systemPrompt),
    ...(systemPromptSections?.length ? { system_prompt_sections: systemPromptSections } : {}),
    messages: messagesSize,
    message_roles: messageRoles,
    tool_call_metadata: toolCallMetadata,
    protocol_overhead: REQUEST_PROTOCOL_OVERHEAD,
  };
}

export function estimateToolSchemaBreakdown(tools: AiProviderToolDef[]): AiContextToolSchemaBreakdown {
  const rows = tools.map((tool) => ({
    name: tool.name,
    size: estimateTokenCount(JSON.stringify(tool)),
  }));
  return {
    total: rows.reduce((sum, row) => sum + row.size, 0),
    count: rows.length,
    tools: rows.sort((a, b) => b.size - a.size),
  };
}

export function withToolSchemaBreakdown(
  breakdown: AiContextBudgetBreakdown,
  toolSchemas: AiContextToolSchemaBreakdown,
): AiContextBudgetBreakdown {
  return {
    ...breakdown,
    tool_schemas: toolSchemas,
    total_with_tools: breakdown.total + toolSchemas.total,
  };
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

  if (typeof typedResult.status === 'string') {
    summaryParts.push(`status=${typedResult.status}`);
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

  for (const key of ['filters_ignored', 'fields_ignored'] as const) {
    const value = typedResult[key];
    if (Array.isArray(value) && value.length > 0) {
      summaryParts.push(`${key}=${value.join(',')}`);
    }
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
    content: `[assistant message truncated: ${estimateTokenCount(message.content)} estimated tokens]`,
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
  systemPromptSections?: AiContextBudgetSectionBreakdown[];
  messages: AiProviderMessage[];
  contextWindow?: number | null;
  keepRecentMessages?: number;
}): AiContextBudgetResult {
  const keepRecentMessages = params.keepRecentMessages ?? DEFAULT_KEEP_RECENT_MESSAGES;
  const initialBreakdown = estimateRequestBreakdown(
    params.systemPrompt,
    params.messages,
    params.systemPromptSections,
  );
  const estimatedRequestSize = initialBreakdown.total;
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
      breakdown: initialBreakdown,
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
      breakdown: initialBreakdown,
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
    breakdown: estimateRequestBreakdown(
      params.systemPrompt,
      secondPass.messages,
      params.systemPromptSections,
    ),
  };
}
