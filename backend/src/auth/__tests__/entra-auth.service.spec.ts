import * as assert from 'node:assert/strict';
import * as jwt from 'jsonwebtoken';
import { EntraAuthService } from '../entra-auth.service';

async function testBuildAuthorizationUrlEmbedsNonceInSignedState() {
  const previousStateSecret = process.env.ENTRA_STATE_SECRET;
  process.env.ENTRA_STATE_SECRET = 'test-entra-state-secret';

  try {
    const service = new EntraAuthService({
      get: (key: string) => ({
        ENTRA_CLIENT_ID: 'client-id-1',
        ENTRA_CLIENT_SECRET: 'client-secret-1',
        ENTRA_REDIRECT_URI: 'https://dev.kanap.net/api/auth/entra/callback',
        ENTRA_AUTHORITY: 'https://login.microsoftonline.com/organizations',
      } as Record<string, string>)[key],
    } as any);

    (service as any).loadMetadata = async () => ({
      issuer: 'https://login.microsoftonline.com/{tenantid}/v2.0',
      authorization_endpoint: 'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize',
      token_endpoint: 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
      jwks_uri: 'https://login.microsoftonline.com/organizations/discovery/v2.0/keys',
    });

    const result = await service.buildAuthorizationUrl({
      mode: 'login',
      tenantId: 'tenant-1',
      redirectTo: '/admin/auth',
    });

    const url = new URL(result.url);
    const urlNonce = url.searchParams.get('nonce');
    const stateRaw = url.searchParams.get('state');

    assert.ok(urlNonce);
    assert.ok(stateRaw);
    assert.equal(result.nonce, urlNonce);

    const state = jwt.verify(stateRaw, 'test-entra-state-secret') as any;
    assert.equal(state.mode, 'login');
    assert.equal(state.tenantId, 'tenant-1');
    assert.equal(state.redirectTo, '/admin/auth');
    assert.equal(state.nonce, urlNonce);
  } finally {
    if (previousStateSecret === undefined) {
      delete process.env.ENTRA_STATE_SECRET;
    } else {
      process.env.ENTRA_STATE_SECRET = previousStateSecret;
    }
  }
}

async function run() {
  await testBuildAuthorizationUrlEmbedsNonceInSignedState();
}

void run();
