import * as assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AiAdminOverviewController } from '../ai-admin-overview.controller';
import { AiApiKeysController } from '../ai-api-keys.controller';
import { AiCapabilitiesController } from '../ai-capabilities.controller';
import { AiChatController } from '../ai-chat.controller';
import { AiConversationsController } from '../ai-conversations.controller';
import { AiMcpController } from '../ai-mcp.controller';
import { AiSettingsController } from '../ai-settings.controller';

function createRequest(overrides?: Record<string, unknown>) {
  return {
    tenant: { id: '11111111-1111-4111-8111-111111111111' },
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

async function waitFor(predicate: () => boolean, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition.');
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

function assertBaseContext(context: any, expected: { surface: 'chat' | 'mcp'; authMethod: 'jwt' | 'api_key'; aiApiKeyId: string | null }) {
  assert.equal(context.tenantId, '11111111-1111-4111-8111-111111111111');
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

  const settings = new AiSettingsController({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
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

async function testControllersRejectMissingTenantContext() {
  const req = createRequest({ tenant: undefined });
  const settings = new AiSettingsController({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const mcp = new AiMcpController({} as any, {} as any);

  assert.throws(
    () => (settings as any).buildContext(req),
    (error: unknown) => error instanceof UnauthorizedException,
  );
  assert.throws(
    () => (mcp as any).buildContext(req),
    (error: unknown) => error instanceof UnauthorizedException,
  );
}

async function testControllersRejectInvalidTenantContext() {
  const req = createRequest({ tenant: { id: 'tenant-1' } });
  const settings = new AiSettingsController({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const overview = new AiAdminOverviewController({} as any, {} as any, {} as any);
  const mcp = new AiMcpController({} as any, {} as any);

  assert.throws(
    () => (settings as any).buildContext(req),
    (error: unknown) => error instanceof UnauthorizedException,
  );
  assert.throws(
    () => (overview as any).buildContext(req),
    (error: unknown) => error instanceof ForbiddenException,
  );
  assert.throws(
    () => (mcp as any).buildContext(req),
    (error: unknown) => error instanceof UnauthorizedException,
  );
}

async function testSettingsControllerDelegatesProviderTest() {
  let captured: any = null;
  const controller = new AiSettingsController(
    {
      run: async (_tenantId: string, fn: Function) => fn({ tag: 'manager' }),
    } as any,
    {
      assertSettingsAccess: async () => undefined,
    } as any,
    {
      toView: () => ({ ok: true }),
    } as any,
    {
      testProvider: async (tenantId: string, body: any, opts: any) => {
        captured = { tenantId, body, opts };
        return {
          ok: true,
          provider: 'openai',
          model: 'gpt-4o-mini',
          latency_ms: 12,
          message: 'Provider test succeeded.',
          validation_errors: [],
        };
      },
    } as any,
    {} as any,
    {} as any,
  );

  const result = await controller.testProvider(
    {
      llm_provider: 'openai',
      llm_model: 'gpt-4o-mini',
      llm_api_key: '',
    },
    createRequest() as any,
  );

  assert.equal(result.ok, true);
  assert.equal(captured.tenantId, '11111111-1111-4111-8111-111111111111');
  assert.equal(captured.body.llm_provider, 'openai');
  assert.equal(captured.opts.manager.tag, 'manager');
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
  const req = Object.assign(new EventEmitter(), createRequest({ isPlatformHost: false }));

  await controller.stream(
    { message: 'hello' },
    req as any,
    response,
  );

  assert.equal(capturedContext?.isPlatformHost, false);
  assert.equal(state.flushed, true);
  assert.equal(state.ended, true);
  assert.equal(state.writes.length, 2);
}

async function testChatControllerAbortsOnDisconnect() {
  let capturedSignal: AbortSignal | null = null;
  const controller = new AiChatController(
    {
      stream: async function* (params: any) {
        capturedSignal = params.signal ?? null;
        yield { type: 'text_delta', text: 'chunk-1' };
        while (!(params.signal?.aborted)) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      },
    } as any,
    {
      runWithContext: async (context: any, fn: Function) => fn({ ...context, manager: { tag: 'manager' } }),
    } as any,
    {
      assertSurfaceAccess: async () => undefined,
    } as any,
  );
  const { response, state } = createResponseRecorder();
  const req = Object.assign(new EventEmitter(), createRequest({ isPlatformHost: false }));

  const streamPromise = controller.stream(
    { message: 'hello' },
    req as any,
    response,
  );

  await waitFor(() => state.writes.length > 0);
  req.emit('close');

  await streamPromise;

  assert.equal(capturedSignal?.aborted, true);
  assert.equal(state.writes.length, 1);
  assert.equal(state.ended, false);
}

async function testAdminOverviewControllerBuildsContextAndCallsService() {
  let capturedContext: any = null;
  let capturedTenantId: string | null = null;

  const controller = new AiAdminOverviewController(
    {
      run: async (tenantId: string, fn: Function) => {
        capturedTenantId = tenantId;
        return fn({ tag: 'manager' });
      },
    } as any,
    {
      assertSettingsAccess: async (context: any) => {
        capturedContext = context;
      },
    } as any,
    {
      getOverview: async (tenantId: string, manager: any) => ({
        tenant_id: tenantId,
        manager_tag: manager.tag,
      }),
    } as any,
  );

  const result: any = await controller.getOverview(createRequest() as any);

  assert.equal(capturedTenantId, '11111111-1111-4111-8111-111111111111');
  assert.equal(capturedContext?.surface, 'chat');
  assert.equal(capturedContext?.authMethod, 'jwt');
  assert.equal(result.tenant_id, '11111111-1111-4111-8111-111111111111');
  assert.equal(result.manager_tag, 'manager');
}

async function testAdminOverviewControllerRejectsMissingTenantContext() {
  const controller = new AiAdminOverviewController({} as any, {} as any, {} as any);

  await assert.rejects(
    () => controller.getOverview(createRequest({ tenant: null }) as any),
    (error: unknown) => error instanceof ForbiddenException,
  );
}

async function run() {
  await testControllersBuildPlatformAwareContexts();
  await testControllersRejectMissingTenantContext();
  await testControllersRejectInvalidTenantContext();
  await testSettingsControllerDelegatesProviderTest();
  await testChatControllerRejectsPlatformHostBeforeStreaming();
  await testChatControllerStreamsForTenantHost();
  await testChatControllerAbortsOnDisconnect();
  await testAdminOverviewControllerBuildsContextAndCallsService();
  await testAdminOverviewControllerRejectsMissingTenantContext();
}

void run();
