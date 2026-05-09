import * as assert from 'node:assert/strict';
import { isPlatformAdmin } from '../platform-admin.util';

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
  withEnv({ DEPLOYMENT_MODE: 'multi-tenant', PLATFORM_ADMIN_EMAILS: undefined, NODE_ENV: 'test', APP_ENV: 'test' }, () => {
    assert.equal(isPlatformAdmin({
      email: 'admin@tenant.example',
      role: { role_name: 'Administrator' },
    }), false);
  });

  withEnv({ DEPLOYMENT_MODE: 'multi-tenant', PLATFORM_ADMIN_EMAILS: 'ops@example.com', NODE_ENV: 'production', APP_ENV: 'production' }, () => {
    assert.equal(isPlatformAdmin({ email: 'ops@example.com', role: { role_name: 'Contact' } }), true);
    assert.equal(isPlatformAdmin({ email: 'admin@tenant.example', role: { role_name: 'Administrator' } }), false);
  });

  withEnv({ DEPLOYMENT_MODE: 'multi-tenant', PLATFORM_ADMIN_EMAILS: '*', NODE_ENV: 'production', APP_ENV: 'production' }, () => {
    assert.equal(isPlatformAdmin({ email: 'ops@example.com' }), false);
  });
}

run();
