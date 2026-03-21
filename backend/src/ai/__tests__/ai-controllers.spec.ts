import * as assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { AiApiKeysController } from '../ai-api-keys.controller';
import { AiCapabilitiesController } from '../ai-capabilities.controller';
import { AiChatController } from '../ai-chat.controller';
import { AiConversationsController } from '../ai-conversations.controller';
import { AiMcpController } from '../ai-mcp.controller';
import { AiSettingsController } from '../ai-settings.controller';

function createRequest(overrides?: Record<string, unknown>) {
  return {
    tenant: { id: 'tenant-1' },
    user: { sub: 'user-1', aiApiKeyId: 'key-1' },
    id: 'req-1',
    isPlatformHost: true,
    ...overrides,
  };
}

function createResponseRecorder() {
  const state = {
    headers: [] as Array<[string, string]>,
    flushed: false,
    writes: [] as string[],
    ended: false,
  };

  return {
    state,
    response: {
      setHeader: (name: string, value: string) => {
        state.headers.push([name, value]);
      },
      flushHeaders: () => {
        state.flushed = true;
      },
      write: (value: string) => {
        state.writes.push(value);
      },
      end: () => {
        state.ended = true;
      },
    } as any,
  };
}

function assertBaseContext(context: any, expected: { surface: 'chat' | 'mcp'; authMethod: 'jwt' | 'api_key'; aiApiKeyId: string | null }) {
  assert.equal(context.tenantId, 'tenant-1');
  assert.equal(context.userId, 'user-1');
  assert.equal(context.isPlatformHost, true);
  assert.equal(context.surface, expected.surface);
  assert.equal(context.authMethod, expected.authMethod);
  assert.equal(context.requestId, 'req-1');
  assert.equal(context.aiApiKeyId, expected.aiApiKeyId);
}

async function testControllersBuildPlatformAwareContexts() {
  const req = createRequest();

  const chat = new AiChatController({} as any, {} as any, {} as any);
  assertBaseContext((chat as any).buildContext(req), {
    surface: 'chat',
    authMethod: 'jwt',
    aiApiKeyId: null,
  });

  const capabilities = new AiCapabilitiesController({} as any, {} as any);
  assertBaseContext((capabilities as any).buildContext(req), {
    surface: 'chat',
    authMethod: 'jwt',
    aiApiKeyId: null,
  });

  const conversations = new AiConversationsController({} as any, {} as any, {} as any);
  assertBaseContext((conversations as any).buildContext(req), {
    surface: 'chat',
    authMethod: 'jwt',
    aiApiKeyId: null,
  });

  const apiKeys = new AiApiKeysController({} as any, {} as any, {} as any);
  assertBaseContext((apiKeys as any).buildContext(req), {
    surface: 'mcp',
    authMethod: 'jwt',
    aiApiKeyId: null,
  });

  const settings = new AiSettingsController({} as any, {} as any, {} as any, {} as any);
  assertBaseContext((settings as any).buildContext(req), {
    surface: 'chat',
    authMethod: 'jwt',
    aiApiKeyId: null,
  });

  const mcp = new AiMcpController({} as any, {} as any);
  assertBaseContext((mcp as any).buildContext(req), {
    surface: 'mcp',
    authMethod: 'api_key',
    aiApiKeyId: 'key-1',
  });
}

async function testChatControllerRejectsPlatformHostBeforeStreaming() {
  let capturedContext: any = null;
  const controller = new AiChatController(
    {
      stream: async function* () {
        yield { type: 'done' };
      },
    } as any,
    {
      runWithContext: async (context: any, fn: Function) => {
        capturedContext = context;
        return fn({ ...context, manager: { tag: 'manager' } });
      },
    } as any,
    {
      assertSurfaceAccess: async (context: any) => {
        if (context.isPlatformHost) {
          throw new ForbiddenException('AI is not available on the platform host.');
        }
      },
    } as any,
  );
  const { response, state } = createResponseRecorder();

  await assert.rejects(
    () => controller.stream(
      { message: 'hello' },
      createRequest({ on: () => undefined }) as any,
      response,
    ),
    (error: unknown) => error instanceof ForbiddenException,
  );

  assert.equal(capturedContext?.isPlatformHost, true);
  assert.equal(state.flushed, false);
  assert.equal(state.ended, false);
  assert.deepEqual(state.headers, []);
}

async function testChatControllerStreamsForTenantHost() {
  let capturedContext: any = null;
  const controller = new AiChatController(
    {
      stream: async function* () {
        yield { type: 'conversation', id: 'conv-1', title: 'Hello' };
        yield { type: 'done' };
      },
    } as any,
    {
      runWithContext: async (context: any, fn: Function) => {
        capturedContext = context;
        return fn({ ...context, manager: { tag: 'manager' } });
      },
    } as any,
    {
      assertSurfaceAccess: async () => undefined,
    } as any,
  );
  const { response, state } = createResponseRecorder();

  await controller.stream(
    { message: 'hello' },
    createRequest({
      isPlatformHost: false,
      on: () => undefined,
    }) as any,
    response,
  );

  assert.equal(capturedContext?.isPlatformHost, false);
  assert.equal(state.flushed, true);
  assert.equal(state.ended, true);
  assert.equal(state.writes.length, 2);
}

async function run() {
  await testControllersBuildPlatformAwareContexts();
  await testChatControllerRejectsPlatformHostBeforeStreaming();
  await testChatControllerStreamsForTenantHost();
}

void run();
