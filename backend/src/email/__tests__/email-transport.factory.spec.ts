import * as assert from 'node:assert/strict';
import { Logger } from '@nestjs/common';
import {
  hasConfiguredEmailTransport,
  readSmtpConfig,
} from '../email-config';
import { createEmailTransport } from '../transports/email-transport.factory';

const ENV_KEYS = [
  'DEPLOYMENT_MODE',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_PASS',
  'SMTP_FROM',
];

function createLogger(): Logger {
  return {
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    verbose: () => undefined,
    fatal: () => undefined,
    setLogLevels: () => undefined,
  } as unknown as Logger;
}

async function withEnv(
  values: Record<string, string | undefined>,
  run: () => void | Promise<void>,
): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) {
    previous.set(key, process.env[key]);
  }

  try {
    for (const key of ENV_KEYS) {
      const next = values[key];
      if (next === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = next;
      }
    }
    await run();
  } finally {
    for (const key of ENV_KEYS) {
      const original = previous.get(key);
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  }
}

async function testSingleTenantUsesSmtpWhenConfigured() {
  await withEnv({
    DEPLOYMENT_MODE: 'single-tenant',
    SMTP_HOST: 'smtp.example.com',
    SMTP_FROM: 'KANAP <noreply@example.com>',
  }, async () => {
    assert.equal(hasConfiguredEmailTransport(), true);
    assert.equal(createEmailTransport(createLogger()).name, 'smtp');
  });
}

async function testMultiTenantIgnoresSmtpWithoutResend() {
  await withEnv({
    DEPLOYMENT_MODE: 'multi-tenant',
    SMTP_HOST: 'smtp.example.com',
    SMTP_FROM: 'KANAP <noreply@example.com>',
  }, async () => {
    assert.equal(hasConfiguredEmailTransport(), false);
    const transport = createEmailTransport(createLogger());
    assert.equal(transport.name, 'disabled');

    await assert.rejects(
      () => transport.send({
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Hello</p>',
      }),
      (error: any) => error?.code === 'FEATURE_DISABLED',
    );
  });
}

async function testMultiTenantPrefersResend() {
  await withEnv({
    DEPLOYMENT_MODE: 'multi-tenant',
    SMTP_HOST: 'smtp.example.com',
    SMTP_FROM: 'KANAP <noreply@example.com>',
    RESEND_API_KEY: 're_test',
  }, async () => {
    assert.equal(hasConfiguredEmailTransport(), true);
    assert.equal(createEmailTransport(createLogger()).name, 'resend');
  });
}

async function testLegacySmtpPassIsAccepted() {
  await withEnv({
    DEPLOYMENT_MODE: 'single-tenant',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '465',
    SMTP_FROM: 'KANAP <noreply@example.com>',
    SMTP_USER: 'mailer',
    SMTP_PASS: 'secret',
  }, async () => {
    const config = readSmtpConfig();
    assert.ok(config);
    assert.equal(config?.passwordEnvName, 'SMTP_PASS');
    assert.equal(config?.secure, true);
  });
}

async function run() {
  await testSingleTenantUsesSmtpWhenConfigured();
  await testMultiTenantIgnoresSmtpWithoutResend();
  await testMultiTenantPrefersResend();
  await testLegacySmtpPassIsAccepted();
}

void run();
