import * as assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { DocumentExportService } from '../document-export.service';

async function withEnv<T>(
  values: Record<string, string | undefined>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key]);
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withTempDir(fn: (tempDir: string) => Promise<void>): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kanap-export-security-'));
  try {
    await fn(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function withMockFetch(
  mockFetch: typeof fetch,
  fn: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function run() {
  await withEnv({
    APP_ENV: undefined,
    NODE_ENV: undefined,
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, () => {
    const service = new DocumentExportService();
    assert.throws(
      () => (service as any).assertAllowedImageHost('127.0.0.1'),
      (error: unknown) => error instanceof BadRequestException,
    );
    assert.doesNotThrow(() => (service as any).assertAllowedImageHost('cdn.example.com'));
  });

  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, () => {
    const service = new DocumentExportService();
    assert.throws(
      () => (service as any).assertAllowedImageHost('127.0.0.1'),
      (error: unknown) => error instanceof BadRequestException,
    );
    assert.doesNotThrow(() => (service as any).assertAllowedImageHost('cdn.example.com'));
  });

  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    await withTempDir(async (tempDir) => {
      const service = new DocumentExportService();
      const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
      await withMockFetch(async (input, init) => {
        fetchCalls.push({ input, init });
        assert.equal(init?.redirect, 'error');
        assert.deepEqual(init?.headers, { Authorization: 'Bearer export-test' });
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }, async () => {
        const localPath = await (service as any).materializeHttpImageTarget(
          'http://cdn.example.com/image.png',
          tempDir,
          1,
          { imageFetchHeaders: { Authorization: 'Bearer export-test' } },
        );
        assert.equal(localPath, 'assets/image-1.png');
        assert.deepEqual(
          [...await fs.readFile(path.join(tempDir, localPath))],
          [1, 2, 3],
        );
      });
      assert.equal(fetchCalls.length, 1);
      assert.equal(String(fetchCalls[0].input), 'http://cdn.example.com/image.png');
    });
  });

  await withEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    EXPORT_ALLOWED_IMAGE_HOSTS: 'cdn.example.com',
    EXPORT_ALLOW_LOOPBACK_IMAGE_HOSTS: undefined,
  }, async () => {
    await withTempDir(async (tempDir) => {
      const service = new DocumentExportService();
      const redirectedLoopbackUrl = 'http://127.0.0.1:8080/internal.png';
      let simulatedLoopbackHits = 0;

      await withMockFetch(async (input, init) => {
        assert.equal(String(input), 'http://cdn.example.com/redirecting-image.png');
        if (init?.redirect !== 'error') {
          simulatedLoopbackHits += 1;
          return new Response(new TextEncoder().encode('INTERNAL_SECRET'), {
            status: 200,
            headers: { 'content-type': 'image/png' },
          });
        }
        throw new TypeError(`fetch failed due to redirect to ${redirectedLoopbackUrl}`);
      }, async () => {
        await assert.rejects(
          () => (service as any).materializeHttpImageTarget(
            'http://cdn.example.com/redirecting-image.png',
            tempDir,
            1,
          ),
          (error: unknown) => error instanceof BadRequestException
            && String((error as Error).message).includes(redirectedLoopbackUrl),
        );
      });

      assert.equal(simulatedLoopbackHits, 0);
    });
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
