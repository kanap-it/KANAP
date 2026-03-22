import * as assert from 'node:assert/strict';
import { AiProviderTestService } from '../ai-provider-test.service';
import { AiProviderAdapter } from '../providers/ai-provider.types';

function createService(options?: {
  settings?: any;
  validate?: (snapshot: any) => string[];
  stream?: (params: any) => AsyncGenerator<any>;
  decrypt?: (value: string) => string;
}) {
  const adapter: AiProviderAdapter = {
    descriptor: {
      id: 'openai',
      label: 'OpenAI',
      description: 'Test adapter',
      capabilities: {
        supportsStreaming: true,
        supportsToolCalling: true,
        requiresApiKey: true,
        allowsCustomEndpoint: true,
      },
    },
    validateConfiguration: options?.validate ?? (() => []),
    createStream: options?.stream ?? (async function* () {
      yield { type: 'done' };
    }),
  };

  return {
    service: new AiProviderTestService(
      {
        find: async () => options?.settings ?? null,
      } as any,
      {
        decrypt: options?.decrypt ?? ((value: string) => value),
      } as any,
      {
        validate: (snapshot: any) => adapter.validateConfiguration(snapshot),
        get: () => adapter,
      } as any,
    ),
    adapter,
  };
}

async function testUsesPersistedSecretWhenApiKeyIsOmitted() {
  let capturedParams: any = null;
  const { service } = createService({
    settings: {
      llm_provider: 'openai',
      llm_model: 'gpt-4o-mini',
      llm_endpoint_url: null,
      llm_api_key_encrypted: 'encrypted-secret',
    },
    decrypt: (value: string) => {
      assert.equal(value, 'encrypted-secret');
      return 'saved-secret';
    },
    stream: async function* (params: any) {
      capturedParams = params;
      yield { type: 'done', usage: { input_tokens: 1, output_tokens: 1 } };
    },
  });

  const result = await service.testProvider('tenant-1', {
    llm_provider: 'openai',
    llm_model: 'gpt-4o-mini',
    llm_endpoint_url: '',
    llm_api_key: '',
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'openai');
  assert.equal(result.model, 'gpt-4o-mini');
  assert.equal(result.validation_errors.length, 0);
  assert.equal(typeof result.latency_ms, 'number');
  assert.equal(capturedParams.apiKey, 'saved-secret');
  assert.equal(capturedParams.timeoutMs, 5_000);
  assert.equal(capturedParams.maxRetries, 0);
  assert.equal(capturedParams.messages.length, 1);
}

async function testReturnsValidationErrorsWithoutCallingProvider() {
  let called = false;
  const { service } = createService({
    validate: () => ['Provider is required.'],
    stream: async function* () {
      called = true;
      yield { type: 'done' };
    },
  });

  const result = await service.testProvider('tenant-1', {});

  assert.equal(result.ok, false);
  assert.equal(result.message, 'Provider settings are incomplete.');
  assert.deepEqual(result.validation_errors, ['Provider is required.']);
  assert.equal(called, false);
}

async function testReturnsRuntimeFailureMessage() {
  const { service } = createService({
    settings: {
      llm_provider: 'openai',
      llm_model: 'gpt-4o-mini',
      llm_endpoint_url: null,
      llm_api_key_encrypted: null,
    },
    validate: () => [],
    stream: async function* () {
      throw new Error('connection failed');
    },
  });

  const result = await service.testProvider('tenant-1', {
    llm_provider: 'openai',
    llm_model: 'gpt-4o-mini',
    llm_api_key: 'provided-secret',
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, 'connection failed');
  assert.equal(result.validation_errors.length, 0);
  assert.equal(typeof result.latency_ms, 'number');
}

async function run() {
  await testUsesPersistedSecretWhenApiKeyIsOmitted();
  await testReturnsValidationErrorsWithoutCallingProvider();
  await testReturnsRuntimeFailureMessage();
}

void run();
