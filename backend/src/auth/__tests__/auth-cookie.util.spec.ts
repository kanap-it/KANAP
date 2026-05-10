import * as assert from 'node:assert/strict';
import { isSecureRequest } from '../auth-cookie.util';

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const previous = {
    APP_ENV: process.env.APP_ENV,
    NODE_ENV: process.env.NODE_ENV,
  };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function testProductionIsAlwaysSecure() {
  withEnv({ APP_ENV: 'production', NODE_ENV: undefined }, () => {
    assert.equal(isSecureRequest({ secure: false, protocol: 'http', headers: {} }), true);
  });
}

function testForwardedProtoMarksRequestSecure() {
  withEnv({ APP_ENV: 'development', NODE_ENV: undefined }, () => {
    assert.equal(isSecureRequest({ secure: false, protocol: 'http', headers: { 'x-forwarded-proto': 'https' } }), true);
    assert.equal(isSecureRequest({ secure: false, protocol: 'http', headers: { 'x-forwarded-proto': 'https,http' } }), true);
  });
}

function testDirectHttpsSignalsMarkRequestSecure() {
  withEnv({ APP_ENV: 'development', NODE_ENV: undefined }, () => {
    assert.equal(isSecureRequest({ secure: true, protocol: 'http', headers: {} }), true);
    assert.equal(isSecureRequest({ secure: false, protocol: 'https', headers: {} }), true);
    assert.equal(isSecureRequest({ secure: false, protocol: 'http', headers: { 'x-forwarded-ssl': 'on' } }), true);
    assert.equal(isSecureRequest({ secure: false, protocol: 'http', headers: { 'front-end-https': 'on' } }), true);
  });
}

function testPlainDevHttpIsNotSecure() {
  withEnv({ APP_ENV: 'development', NODE_ENV: undefined }, () => {
    assert.equal(isSecureRequest({ secure: false, protocol: 'http', headers: {} }), false);
  });
}

function run() {
  testProductionIsAlwaysSecure();
  testForwardedProtoMarksRequestSecure();
  testDirectHttpsSignalsMarkRequestSecure();
  testPlainDevHttpIsNotSecure();
}

run();
