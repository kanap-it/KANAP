import * as assert from 'node:assert/strict';
import { Logger } from '@nestjs/common';
import { AiChatOrchestratorService, resolveProviderMaxTokens } from '../ai-chat-orchestrator.service';
import { AiSystemPromptService } from '../ai-system-prompt.service';
import { ChatStreamEvent } from '../ai.types';

function createOrchestrator(options?: {
  providerEvents?: any[];
  providerToolEvents?: any[];
  toolResult?: any;
  toolError?: string;
  providerContextWindow?: number | null;
  historyMessages?: any[];
  providerId?: string;
  model?: string;
}) {
  const persistedMessages: any[] = [];
  let conversationCreated = false;
  let messageIndex = 0;
  const recordedRequests: any[] = [];
  const toolExecuteCount = { value: 0 };

  const mockTenantExecutor = {
    run: async (_tenantId: string, fn: Function, _opts?: any) => fn({} as any),
    runWithContext: async (context: any, fn: Function, _opts?: any) =>
      fn({
        ...context,
        manager: {
          query: async (sql: string) => {
            if (sql.includes('FROM tenants')) {
              return [{ name: 'Test Tenant' }];
            }
            if (sql.includes('FROM users u')) {
              return [{
                email: 'alex@example.com',
                first_name: 'Alex',
                last_name: 'Operator',
                primary_role_name: 'Administrator',
              }];
            }
            if (sql.includes('FROM user_roles')) {
              return [];
            }
            if (sql.includes('FROM portfolio_team_member_configs')) {
              return [{ team_name: 'Strategy' }];
            }
            return [];
          },
          getRepository: () => ({
            find: async () => [],
            findOne: async () => null,
            save: async (record: any) => record,
            create: (payload: any) => ({ id: `msg-${++messageIndex}`, ...payload }),
          }),
        },
      }),
  };

  const mockPolicy = {
    assertSurfaceAccess: async () => {},
    listReadableEntityTypes: async () => ['applications', 'projects'],
  };

  const mockSettings = {
    get: async () => ({
      llm_provider: options?.providerId ?? 'openai',
      llm_model: options?.model ?? 'gpt-4o',
      llm_api_key_encrypted: 'encrypted-key',
      llm_endpoint_url: null,
      chat_enabled: true,
    }),
  };

  const mockCipher = {
    decrypt: () => 'real-api-key',
  };

  const providerCallCount = { value: 0 };

  const mockProviderRegistry = {
    get: () => ({
      descriptor: {
        id: options?.providerId ?? 'openai',
        label: 'OpenAI',
        capabilities: {
          supportsStreaming: true,
          supportsToolCalling: true,
          requiresApiKey: true,
          allowsCustomEndpoint: true,
          contextWindow: options?.providerContextWindow ?? 128000,
        },
      },
      createStream: async function* (params: any) {
        recordedRequests.push(params);
        providerCallCount.value++;
        // First call might return tool calls
        if (providerCallCount.value === 1 && options?.providerEvents) {
          for (const event of options.providerEvents) {
            yield event;
          }
          return;
        }
        // Second call (after tool execution) returns text
        if (providerCallCount.value === 2 && options?.providerToolEvents) {
          for (const event of options.providerToolEvents) {
            yield event;
          }
          return;
        }
        // Default: simple text response
        yield { type: 'text_delta', text: 'Hello ' };
        yield { type: 'text_delta', text: 'there!' };
        yield { type: 'done', usage: { input_tokens: 100, output_tokens: 50 } };
      },
    }),
  };

  const mockConversations = {
    createConversation: async (input: any) => {
      conversationCreated = true;
      return { id: 'conv-1', ...input };
    },
    getConversationForUser: async () => ({
      id: 'conv-1',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      title: 'Test',
    }),
    listMessagesForUser: async () => options?.historyMessages ?? [],
    appendMessage: async (input: any) => {
      persistedMessages.push(input);
      return { id: `msg-${persistedMessages.length}`, ...input };
    },
  };

  const mockToolRegistry = {
    getToolJsonSchemas: async () => [
      { name: 'search_all', description: 'Search', parameters: { type: 'object' } },
    ],
    listAvailableTools: async () => [
      { name: 'search_all', description: 'Search', input_summary: {}, read_only: true, surfaces: ['chat', 'mcp'] },
    ],
    execute: async (_ctx: any, toolName: string, _input: any) => {
      toolExecuteCount.value++;
      if (options?.toolError) throw new Error(options.toolError);
      return options?.toolResult ?? { items: [], total: 0 };
    },
  };

  const mockSystemPrompt = {
    build: () => 'You are Plaid.',
  };

  const orchestrator = new AiChatOrchestratorService(
    mockTenantExecutor as any,
    mockPolicy as any,
    mockSettings as any,
    mockCipher as any,
    mockProviderRegistry as any,
    mockConversations as any,
    mockToolRegistry as any,
    mockSystemPrompt as any,
  );

  return { orchestrator, persistedMessages, providerCallCount, recordedRequests, toolExecuteCount };
}

async function collectEvents(gen: AsyncGenerator<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

async function testSimpleTextResponse() {
  const { orchestrator, persistedMessages, recordedRequests } = createOrchestrator({
    providerContextWindow: 1000,
    historyMessages: [{ role: 'user', content: 'Hello' }],
  });
  const events = await collectEvents(
    orchestrator.stream({
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        isPlatformHost: false,
        surface: 'chat',
        authMethod: 'jwt',
      },
      userMessage: 'Hello',
    }),
  );

  // Should emit conversation, text_delta, text_delta, done
  assert.ok(events.some((e) => e.type === 'conversation'));
  assert.ok(events.some((e) => e.type === 'text_delta'));
  assert.ok(events.some((e) => e.type === 'done'));

  const textDeltas = events.filter((e) => e.type === 'text_delta') as any[];
  assert.equal(textDeltas.map((e: any) => e.text).join(''), 'Hello there!');

  const done = events.find((e) => e.type === 'done') as any;
  assert.deepEqual(done.usage, { input_tokens: 100, output_tokens: 50 });

  // Should persist user message + assistant message
  assert.ok(persistedMessages.length >= 2, `Expected at least 2 persisted messages, got ${persistedMessages.length}`);
  assert.equal(persistedMessages[0].role, 'user');
  assert.equal(persistedMessages[0].content, 'Hello');
  assert.equal(recordedRequests[0].systemPrompt, 'You are Plaid.');
  assert.deepEqual(recordedRequests[0].messages.map((message: any) => message.content), ['Hello']);
}

async function testToolCallFlow() {
  const { orchestrator, providerCallCount, toolExecuteCount } = createOrchestrator({
    providerEvents: [
      { type: 'text_delta', text: 'Let me search.' },
      { type: 'tool_call_start', id: 'tc-1', name: 'search_all' },
      { type: 'tool_call_delta', id: 'tc-1', arguments: '{"query":"test"}' },
      { type: 'tool_call_end', id: 'tc-1' },
      { type: 'done', usage: { input_tokens: 100, output_tokens: 50 } },
    ],
    providerToolEvents: [
      { type: 'text_delta', text: 'Found results.' },
      { type: 'done', usage: { input_tokens: 200, output_tokens: 100 } },
    ],
    toolResult: { items: [{ type: 'applications', id: 'app-1', label: 'CRM' }], total: 1 },
  });

  const events = await collectEvents(
    orchestrator.stream({
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        isPlatformHost: false,
        surface: 'chat',
        authMethod: 'jwt',
      },
      userMessage: 'Search for CRM',
    }),
  );

  assert.ok(events.some((e) => e.type === 'tool_call'));
  assert.ok(events.some((e) => e.type === 'tool_result'));
  assert.equal(providerCallCount.value, 2, 'Provider should be called twice (initial + after tool result)');

  const toolCall = events.find((e) => e.type === 'tool_call') as any;
  assert.equal(toolCall.name, 'search_all');

  const toolResult = events.find((e) => e.type === 'tool_result') as any;
  assert.equal(toolResult.name, 'search_all');
  assert.deepEqual(toolResult.result.items[0].label, 'CRM');
  assert.equal(toolExecuteCount.value, 1);
}

async function testProviderReceivesAbortSignal() {
  const abortController = new AbortController();
  const { orchestrator, recordedRequests } = createOrchestrator({
    providerEvents: [{ type: 'done', usage: { input_tokens: 1, output_tokens: 1 } }],
  });

  await collectEvents(
    orchestrator.stream({
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        isPlatformHost: false,
        surface: 'chat',
        authMethod: 'jwt',
      },
      userMessage: 'Hello',
      signal: abortController.signal,
    }),
  );

  assert.equal(recordedRequests[0].signal, abortController.signal);
}

async function testRepeatedToolCallsStopWithoutFurtherProgress() {
  const { orchestrator, providerCallCount, toolExecuteCount } = createOrchestrator({
    providerEvents: [
      { type: 'text_delta', text: 'Need to search again.' },
      { type: 'tool_call_start', id: 'tc-1', name: 'search_all' },
      { type: 'tool_call_delta', id: 'tc-1', arguments: '{"query":"test"}' },
      { type: 'tool_call_end', id: 'tc-1' },
      { type: 'done', usage: { input_tokens: 100, output_tokens: 20 } },
    ],
    providerToolEvents: [
      { type: 'text_delta', text: 'Need to search again.' },
      { type: 'tool_call_start', id: 'tc-2', name: 'search_all' },
      { type: 'tool_call_delta', id: 'tc-2', arguments: '{"query":"test"}' },
      { type: 'tool_call_end', id: 'tc-2' },
      { type: 'done', usage: { input_tokens: 100, output_tokens: 20 } },
    ],
    toolResult: { items: [], total: 0 },
  });

  const events = await collectEvents(
    orchestrator.stream({
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        isPlatformHost: false,
        surface: 'chat',
        authMethod: 'jwt',
      },
      userMessage: 'Search',
    }),
  );

  const errorEvent = events.find((e) => e.type === 'error') as any;
  assert.equal(errorEvent?.message, 'Maximum tool call iterations reached without progress.');
  assert.equal(providerCallCount.value, 2);
  assert.equal(toolExecuteCount.value, 1);
}

async function testSystemPromptGuidance() {
  const service = new AiSystemPromptService();
  const prompt = service.build({
    tenantName: 'Test Tenant',
    availableTools: [
      {
        name: 'query_entities',
        description: 'Query one readable entity family with server-side filters, pagination, and exact totals.',
        input_summary: {},
        read_only: true,
        surfaces: ['chat', 'mcp'],
      },
      {
        name: 'aggregate_entities',
        description: 'Break down one readable entity family by a supported field with exact server-side counts.',
        input_summary: {},
        read_only: true,
        surfaces: ['chat', 'mcp'],
      },
      {
        name: 'get_filter_values',
        description: 'Discover exact filter values for supported set-like AI query fields.',
        input_summary: {},
        read_only: true,
        surfaces: ['chat', 'mcp'],
      },
    ],
    readableEntityTypes: ['applications', 'tasks'],
    currentUser: {
      displayName: 'Alex Operator',
      email: 'alex@example.com',
      roleNames: ['Administrator'],
      teamName: 'Strategy',
    },
  });

  assert.match(prompt, /query_entities/);
  assert.match(prompt, /aggregate_entities/);
  assert.match(prompt, /get_filter_values/);
  assert.match(prompt, /Alex Operator/);
  assert.match(prompt, /scope: "me"/);
  assert.ok(!prompt.includes('list_entities'));
  assert.ok(!prompt.includes('always search first'));
}

function buildLargeToolMessage(index: number) {
  return {
    role: 'tool',
    tool_call_id: `tool-call-${index}`,
    content: JSON.stringify({
      tool_call_id: `tool-call-${index}`,
      tool_name: 'query_entities',
      result: {
        items: Array.from({ length: 24 }, (_, itemIndex) => ({
          id: `item-${index}-${itemIndex}`,
          label: `${'x'.repeat(40)}-${itemIndex}`,
        })),
        total: 240 + index,
      },
    }),
  };
}

function buildLargeAssistantMessage(index: number) {
  return {
    role: 'assistant',
    content: `Assistant history ${index} ${'y'.repeat(800)}`,
  };
}

function buildRecentMessage(index: number) {
  return index % 2 === 0
    ? { role: 'user', content: `Recent user ${index}` }
    : { role: 'assistant', content: `Recent assistant ${index}` };
}

function buildCompactionHistory() {
  const messages: any[] = [];
  for (let index = 0; index < 3; index++) {
    messages.push(buildLargeToolMessage(index));
    messages.push(buildLargeAssistantMessage(index));
  }
  for (let index = 0; index < 8; index++) {
    messages.push(buildRecentMessage(index));
  }
  return messages;
}

async function testContextCompaction() {
  const capturedLogs: string[] = [];
  const originalLoggerLog = Logger.prototype.log;
  Logger.prototype.log = function (...args: any[]) {
    capturedLogs.push(args.map((arg) => String(arg)).join(' '));
    return undefined as any;
  };

  try {
    const { orchestrator, recordedRequests } = createOrchestrator({
      providerContextWindow: 800,
      historyMessages: buildCompactionHistory(),
    });

    await collectEvents(
      orchestrator.stream({
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          isPlatformHost: false,
          surface: 'chat',
          authMethod: 'jwt',
        },
        userMessage: 'Show me the summary',
      }),
    );

    assert.equal(recordedRequests.length, 1);
    const requestMessages = recordedRequests[0].messages as any[];
    assert.equal(recordedRequests[0].systemPrompt, 'You are Plaid.');
    assert.match(requestMessages[0].content, /^\[tool result truncated: query_entities/);
    assert.match(requestMessages[1].content, /^\[assistant message truncated:/);
    assert.deepEqual(
      requestMessages.slice(-8).map((message) => message.content),
      [
        'Recent user 0',
        'Recent assistant 1',
        'Recent user 2',
        'Recent assistant 3',
        'Recent user 4',
        'Recent assistant 5',
        'Recent user 6',
        'Recent assistant 7',
      ],
    );
    assert.ok(
      capturedLogs.some((line) =>
        line.includes('provider=openai') &&
        line.includes('model=gpt-4o') &&
        line.includes('compacted=true') &&
        line.includes('tool_results_compacted='),
      ),
      `Expected compaction log entry, got: ${capturedLogs.join('\n')}`,
    );
  } finally {
    Logger.prototype.log = originalLoggerLog;
  }
}

async function testToolExecutionError() {
  const { orchestrator } = createOrchestrator({
    providerEvents: [
      { type: 'tool_call_start', id: 'tc-1', name: 'search_all' },
      { type: 'tool_call_delta', id: 'tc-1', arguments: '{"query":"test"}' },
      { type: 'tool_call_end', id: 'tc-1' },
      { type: 'done' },
    ],
    providerToolEvents: [
      { type: 'text_delta', text: 'Sorry, error occurred.' },
      { type: 'done', usage: { input_tokens: 200, output_tokens: 50 } },
    ],
    toolError: 'Permission denied',
  });

  const events = await collectEvents(
    orchestrator.stream({
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        isPlatformHost: false,
        surface: 'chat',
        authMethod: 'jwt',
      },
      userMessage: 'Search',
    }),
  );

  const toolResult = events.find((e) => e.type === 'tool_result') as any;
  assert.ok(toolResult);
  assert.equal(toolResult.result.error, 'Permission denied');
}

async function testMalformedToolArgumentsReturnSyntheticToolError() {
  const { orchestrator, toolExecuteCount } = createOrchestrator({
    providerEvents: [
      { type: 'tool_call_start', id: 'tc-1', name: 'search_all' },
      { type: 'tool_call_delta', id: 'tc-1', arguments: '{"query":"test"' },
      { type: 'tool_call_end', id: 'tc-1' },
      { type: 'done' },
    ],
    providerToolEvents: [
      { type: 'text_delta', text: 'Retrying with valid arguments.' },
      { type: 'done', usage: { input_tokens: 200, output_tokens: 50 } },
    ],
  });

  const events = await collectEvents(
    orchestrator.stream({
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        isPlatformHost: false,
        surface: 'chat',
        authMethod: 'jwt',
      },
      userMessage: 'Search',
    }),
  );

  const toolResult = events.find((e) => e.type === 'tool_result') as any;
  assert.ok(toolResult);
  assert.match(toolResult.result.error, /valid JSON arguments/i);
  assert.equal(toolExecuteCount.value, 0);
}

async function testReasoningModelsGetLargerOpenAiTokenBudget() {
  assert.equal(resolveProviderMaxTokens('openai', 'gpt-5.4'), 8192);
  assert.equal(resolveProviderMaxTokens('openai', 'gpt-4o'), 4096);
  assert.equal(resolveProviderMaxTokens('custom', 'gpt-5.4'), 4096);
}

async function run() {
  await testSimpleTextResponse();
  await testToolCallFlow();
  await testProviderReceivesAbortSignal();
  await testRepeatedToolCallsStopWithoutFurtherProgress();
  await testSystemPromptGuidance();
  await testContextCompaction();
  await testToolExecutionError();
  await testMalformedToolArgumentsReturnSyntheticToolError();
  await testReasoningModelsGetLargerOpenAiTokenBudget();
}

void run();
