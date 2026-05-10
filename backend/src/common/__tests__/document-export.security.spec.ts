import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { DocumentExportService } from '../document-export.service';

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key]);
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function run() {
  withEnv({
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

  withEnv({
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
}

run();
