import * as assert from 'node:assert/strict';

const Module = require('node:module');
const originalLoad = Module._load;

const state: {
  requests: any[];
  chunks: any[];
} = {
  requests: [],
  chunks: [],
};

Module._load = function patchedLoad(request: string, parent: unknown, isMain: boolean) {
  if (request === 'openai') {
    return {
      default: class FakeOpenAI {
        constructor() {
          return {
            chat: {
              completions: {
                create: async (payload: any) => {
                  state.requests.push(payload);
                  return {
                    async *[Symbol.asyncIterator]() {
                      for (const chunk of state.chunks) {
                        yield chunk;
                      }
                    },
                  };
                },
              },
            },
          };
        }
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  getOpenAiSystemPromptRole,
  isOpenAiReasoningModel,
  openaiCompatibleStream,
} = require('../providers/openai-stream.util');

Module._load = originalLoad;

async function collectEvents(gen: AsyncGenerator<any>) {
  const events: any[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

function resetState(chunks: any[]) {
  state.requests.length = 0;
  state.chunks = chunks;
}

async function testReasoningModelsPreferDeveloperRole() {
  resetState([
    {
      choices: [{ delta: { content: 'ok' }, finish_reason: 'stop' }],
    },
  ]);

  const events = await collectEvents(openaiCompatibleStream({
    providerId: 'openai',
    model: 'gpt-5.4',
    apiKey: 'test-key',
    endpointUrl: null,
    systemPrompt: 'Be precise.',
    systemPromptRole: 'developer',
    messages: [{ role: 'user', content: 'Hello' }],
    tools: [],
    maxTokens: 128,
  }));

  assert.equal(state.requests[0].messages[0].role, 'developer');
  assert.equal(state.requests[0].max_completion_tokens, 128);
  assert.equal(events.at(-1)?.type, 'done');
}

async function testLengthFinishReasonWithPendingToolCallEmitsError() {
  resetState([
    {
      choices: [{
        delta: {
          tool_calls: [{ index: 0, id: 'tc-1', function: { name: 'search_all' } }],
        },
        finish_reason: null,
      }],
    },
    {
      choices: [{
        delta: {
          tool_calls: [{ index: 0, function: { arguments: '{"query":"crm"' } }],
        },
        finish_reason: 'length',
      }],
    },
  ]);

  const events = await collectEvents(openaiCompatibleStream({
    providerId: 'openai',
    model: 'gpt-5.4',
    apiKey: 'test-key',
    endpointUrl: null,
    systemPrompt: 'Use tools.',
    systemPromptRole: 'developer',
    messages: [{ role: 'user', content: 'Search for CRM' }],
    tools: [{ name: 'search_all', description: 'Search', parameters: { type: 'object' } }],
    maxTokens: 128,
  }));

  assert.deepEqual(events, [
    { type: 'tool_call_start', id: 'tc-1', name: 'search_all' },
    { type: 'tool_call_delta', id: 'tc-1', arguments: '{"query":"crm"' },
    { type: 'error', message: 'Model output was truncated before the tool call completed.' },
  ]);
}

async function testReasoningModelHelpers() {
  assert.equal(isOpenAiReasoningModel('gpt-5.4'), true);
  assert.equal(isOpenAiReasoningModel('o3'), true);
  assert.equal(isOpenAiReasoningModel('gpt-4o'), false);
  assert.equal(getOpenAiSystemPromptRole('gpt-5.4'), 'developer');
  assert.equal(getOpenAiSystemPromptRole('gpt-4o'), 'system');
}

async function run() {
  await testReasoningModelsPreferDeveloperRole();
  await testLengthFinishReasonWithPendingToolCallEmitsError();
  await testReasoningModelHelpers();
}

void run();
