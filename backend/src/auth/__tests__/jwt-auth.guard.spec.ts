/**
 * Constat n°2 — an access token must be an access token, not merely a token this application can
 * verify. Every case below signs with the SAME key the guard uses (`JWT_SECRET`), with a valid
 * `sub` and the expected tenant: only the purpose control can reject them.
 *
 * The last test proves that control is load-bearing: with `checkAccessTokenPurpose` neutralised,
 * the suite fails.
 */
import * as assert from 'node:assert/strict';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import * as accessTokenUtil from '../access-token.util';
import {
  ACCESS_TOKEN_PURPOSE,
  ENTRA_STATE_PURPOSE,
  PROVISIONING_PURPOSE,
  PASSWORD_RESET_PURPOSE,
  describeTokenPurposePolicy,
  resolveAccessTokenPolicy,
} from '../access-token.util';
import { deriveSecret } from '../token-secret.util';

const JWT_SECRET = 'jwt-auth-guard-spec-secret';
const TENANT_ID = 'tenant-1';

process.env.JWT_SECRET = JWT_SECRET;
process.env.PASSWORD_RESET_SECRET = '';
process.env.PROVISIONING_TOKEN_SECRET = '';
process.env.ENTRA_STATE_SECRET = '';
// Far-future cut-over: the transition window is open (pre-fix tokens still accepted).
process.env.JWT_LEGACY_ACCESS_TOKEN_DEADLINE = '2099-01-01T00:00:00.000Z';

function reflectorStub() {
  return { getAllAndOverride: () => false } as any;
}

function createContext(req: any) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'controller',
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as any;
}

function requestWith(token: string, tenantId: string | null = TENANT_ID, extra: Record<string, unknown> = {}) {
  return {
    headers: { authorization: `Bearer ${token}` },
    ...(tenantId ? { tenant: { id: tenantId } } : {}),
    ...extra,
  };
}

function sign(payload: Record<string, unknown>, secret: string = JWT_SECRET, options: jwt.SignOptions = {}) {
  return jwt.sign(payload, secret, options);
}

function accessClaims(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'user-1',
    email: 'user@example.com',
    role: { role_name: 'Member' },
    tenant_id: TENANT_ID,
    ...overrides,
  };
}

function isUnauthorized(error: unknown) {
  assert.ok(error instanceof UnauthorizedException, `expected UnauthorizedException, got ${String(error)}`);
  return true;
}

function hash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function assertRejected(guard: JwtAuthGuard, req: any, label: string) {
  assert.throws(() => guard.canActivate(createContext(req)), isUnauthorized, label);
}

function assertAccepted(guard: JwtAuthGuard, req: any, label: string) {
  assert.equal(guard.canActivate(createContext(req)), true, label);
}

function newGuard(clock: { now?: () => number; processStartedAt?: number } = {}) {
  return new JwtAuthGuard(reflectorStub()).setClock(clock);
}

// --- accepted shapes -------------------------------------------------------------------------

function testAcceptsMarkedAccessToken() {
  const guard = newGuard();
  const token = sign(accessClaims({ purpose: ACCESS_TOKEN_PURPOSE }));
  const req: any = requestWith(token);
  assertAccepted(guard, req, 'marked access token');
  assert.equal(req.user.sub, 'user-1');
  assert.equal(req.user.purpose, ACCESS_TOKEN_PURPOSE);
}

function testAcceptsLegacyAccessTokenDuringWindow() {
  const guard = newGuard();
  assertAccepted(guard, requestWith(sign(accessClaims())), 'legacy (untyped) access token');
}

// --- rejected families ----------------------------------------------------------------------

function testRejectsPasswordResetToken() {
  const guard = newGuard();
  const token = sign(accessClaims({ purpose: PASSWORD_RESET_PURPOSE, jti: 'jti-1' }));
  assertRejected(guard, requestWith(token), 'password-reset token');
}

function testRejectsNewPasswordResetTokenFromDerivedKey() {
  // Same family, new signing key: refused by the purpose control, not by the signature.
  const guard = newGuard();
  const token = sign(
    accessClaims({ purpose: PASSWORD_RESET_PURPOSE, jti: 'jti-1' }),
    deriveSecret(JWT_SECRET, 'password-reset'),
  );
  assertRejected(guard, requestWith(token), 'password-reset token (derived key)');
}

function testRejectsProvisioningToken() {
  const guard = newGuard();
  const token = sign(accessClaims({ purpose: PROVISIONING_PURPOSE }));
  assertRejected(guard, requestWith(token), 'provisioning token');
}

function testRejectsEntraHandoffToken() {
  const guard = newGuard();
  const token = sign({
    type: 'entra_login_handoff',
    tenantId: TENANT_ID,
    userId: 'user-1',
    tenant_id: TENANT_ID,
    sub: 'user-1',
  });
  assertRejected(guard, requestWith(token), 'Entra login handoff');
}

function testRejectsEntraStateToken() {
  const guard = newGuard();
  const token = sign({
    purpose: ENTRA_STATE_PURPOSE,
    mode: 'login',
    tenantId: TENANT_ID,
    nonce: 'nonce-1',
    tenant_id: TENANT_ID,
    sub: 'user-1',
  });
  assertRejected(guard, requestWith(token), 'Entra state');
}

function testRejectsPrefixEntraStateTokenWithoutAnyMarker() {
  // A state minted by an instance running the previous build: signed with the shared secret and
  // carrying neither `purpose` nor `type`. It looks like a legacy access token to a naive check,
  // and on an apex host there is no request tenant to fail the comparison — the legacy branch
  // must refuse it on shape alone.
  const guard = newGuard();
  const prefixState = sign({ mode: 'login', tenantId: TENANT_ID, redirectTo: '/', nonce: 'nonce-1' });
  assertRejected(guard, requestWith(prefixState), 'pre-fix Entra state (tenant host)');
  assertRejected(guard, requestWith(prefixState, null), 'pre-fix Entra state (apex host, no tenant)');

  // Same for a handoff, which the guard refuses on its own `type` marker.
  const prefixHandoff = sign({ tenantId: TENANT_ID, userId: 'user-1', redirectTo: '/' });
  assertRejected(guard, requestWith(prefixHandoff, null), 'marker-less payload without subject');
}

// --- malformed or absent purpose --------------------------------------------------------------

function testRejectsMalformedPurpose() {
  const guard = newGuard();
  const cases: Array<[string, unknown]> = [
    ['null', null],
    ['empty string', ''],
    ['number', 42],
    ['object', { kind: 'access' }],
    ['boolean', true],
    ['array', ['access']],
    ['unknown family', 'refresh'],
  ];
  for (const [label, purpose] of cases) {
    assertRejected(guard, requestWith(sign(accessClaims({ purpose }))), `purpose=${label}`);
  }
}

// --- tenant and signature controls stay intact ------------------------------------------------

function testRejectsTenantMismatch() {
  const guard = newGuard();
  const token = sign(accessClaims({ purpose: ACCESS_TOKEN_PURPOSE }));
  assertRejected(guard, requestWith(token, 'tenant-2'), 'tenant mismatch');
}

function testRejectsPlatformHostTenantMismatch() {
  // Pre-existing behaviour, kept: the platform host does not waive the tenant comparison.
  const guard = newGuard();
  const token = sign(accessClaims({ purpose: ACCESS_TOKEN_PURPOSE }));
  assertRejected(
    guard,
    requestWith(token, 'tenant-2', { isPlatformHost: true }),
    'tenant mismatch on the platform host',
  );
}

function testRejectsInvalidSignature() {
  const guard = newGuard();
  const token = sign(accessClaims({ purpose: ACCESS_TOKEN_PURPOSE }), 'another-secret');
  assertRejected(guard, requestWith(token), 'invalid signature');
}

// --- platform-admin scenario ------------------------------------------------------------------

function testRejectsResetTokenThatWouldPassEveryOtherCheckOnPlatformHost() {
  // An administrator/system identity on the platform host: `sub` resolves, there is no request
  // tenant to compare against, and the platform-admin guard reads `req.user`. Nothing but the
  // purpose control stands between this reset link and a platform session.
  const guard = newGuard();
  const token = sign({
    purpose: PASSWORD_RESET_PURPOSE,
    jti: 'jti-platform',
    sub: 'platform-admin-user',
    email: 'admin@kanap.net',
    role: { role_name: 'Administrator' },
    tenant_id: null,
  });
  const req = requestWith(token, null, { isPlatformHost: true, headers: { authorization: `Bearer ${token}` } });
  assertRejected(guard, req, 'reset token on platform host');
}

// --- consumption does not rehabilitate a reset token ------------------------------------------

/** Reset-token store of the real flow: `used_at` is set by `AuthService.resetPasswordWithToken`. */
function createResetTokenStore() {
  const records = new Map<string, { usedAt: Date | null }>();
  return {
    records,
    insert(token: string) {
      records.set(hash(token), { usedAt: null });
    },
    findOne(token: string) {
      const record = records.get(hash(token));
      return record && record.usedAt === null ? record : null;
    },
    consume(token: string) {
      const record = records.get(hash(token));
      if (!record || record.usedAt !== null) return { affected: 0 };
      record.usedAt = new Date();
      return { affected: 1 };
    },
  };
}

function testResetTokenRejectedBeforeAndAfterConsumption() {
  // `resetPasswordWithToken` burns the record (`used_at`) but does not revoke the JWT itself;
  // only the purpose control closes that window. The store below is the authority the service
  // consults, so "after consumption" exercises a real state change, not a local flag.
  const guard = newGuard();
  const store = createResetTokenStore();
  const token = sign(
    accessClaims({ purpose: PASSWORD_RESET_PURPOSE, jti: 'jti-consumed' }),
    deriveSecret(JWT_SECRET, 'password-reset'),
  );
  store.insert(token);

  assertRejected(guard, requestWith(token), 'reset token before consumption');
  assert.equal(store.consume(token).affected, 1, 'the legitimate flow consumes the record');
  assertRejected(guard, requestWith(token), 'reset token after consumption');
  assert.equal(store.consume(token).affected, 0, 'a consumed token cannot be consumed twice');
}

// --- the transition window is bounded ---------------------------------------------------------

function testRefusesUntypedTokenOnceWindowIsClosed() {
  process.env.JWT_LEGACY_ACCESS_TOKEN_DEADLINE = '2020-01-01T00:00:00.000Z';
  try {
    const guard = newGuard();
    assertRejected(guard, requestWith(sign(accessClaims())), 'legacy token after cut-over');
    // Marked tokens are unaffected.
    assertAccepted(
      guard,
      requestWith(sign(accessClaims({ purpose: ACCESS_TOKEN_PURPOSE }))),
      'marked access token after cut-over',
    );
  } finally {
    process.env.JWT_LEGACY_ACCESS_TOKEN_DEADLINE = '2099-01-01T00:00:00.000Z';
  }
}

function testBlankDeadlineCountsAsUnset() {
  // A whitespace-only value (env file or compose) must not silently pin a window: the policy has
  // to fall back to the derived deadline AND the start-up line has to say so.
  const env = {
    JWT_SECRET,
    JWT_LEGACY_ACCESS_TOKEN_DEADLINE: '   ',
    JWT_ACCESS_TOKEN_TTL: '15m',
    JWT_CLOCK_SKEW_TOLERANCE_SEC: '300',
  } as NodeJS.ProcessEnv;
  const startedAt = Date.parse('2026-01-01T00:00:00.000Z');

  const policy = resolveAccessTokenPolicy(env, startedAt, startedAt);
  assert.equal(policy.derivedFromTtl, true, 'a blank deadline must not act as a configured one');
  assert.equal(policy.strictPurposeAt, startedAt + (15 * 60 + 300) * 1000);

  const report = describeTokenPurposePolicy(env, startedAt, startedAt);
  assert.equal(report.level, 'warn', 'the derived window must be reported at start-up');
  assert.match(report.message, /JWT_LEGACY_ACCESS_TOKEN_DEADLINE=/);
}

function testReportedWindowMatchesTheEnforcedWindow() {
  // The start-up line and the guard must never name different cut-overs.
  const env = { JWT_SECRET, JWT_ACCESS_TOKEN_TTL: '45m' } as NodeJS.ProcessEnv;
  const startedAt = Date.parse('2026-01-01T00:00:00.000Z');
  const policy = resolveAccessTokenPolicy(env, startedAt, startedAt);
  const report = describeTokenPurposePolicy(env, startedAt, startedAt);
  assert.ok(
    report.message.includes(new Date(policy.strictPurposeAt).toISOString()),
    `report does not name the enforced deadline: ${report.message}`,
  );
}

// --- mutation: the purpose control must be load-bearing ---------------------------------------

function testMutationWithoutPurposeControlAcceptsForeignTokens() {
  // The mutation is applied to the module the guard actually calls, so this proves the purpose
  // control is load-bearing rather than merely present.
  const util = accessTokenUtil as any;
  const original = util.checkAccessTokenPurpose;
  util.checkAccessTokenPurpose = () => ({ ok: true, legacy: false });
  try {
    const guard = newGuard();
    const mutated = [
      sign(accessClaims({ purpose: PASSWORD_RESET_PURPOSE, jti: 'jti-1' })),
      sign(accessClaims({ purpose: PROVISIONING_PURPOSE })),
      sign(accessClaims({ purpose: null })),
    ];
    for (const token of mutated) {
      assertAccepted(guard, requestWith(token), 'purpose control removed: foreign token accepted');
    }
  } finally {
    util.checkAccessTokenPurpose = original;
  }
}

function run() {
  testAcceptsMarkedAccessToken();
  testAcceptsLegacyAccessTokenDuringWindow();
  testRejectsPasswordResetToken();
  testRejectsNewPasswordResetTokenFromDerivedKey();
  testRejectsProvisioningToken();
  testRejectsEntraHandoffToken();
  testRejectsEntraStateToken();
  testRejectsPrefixEntraStateTokenWithoutAnyMarker();
  testRejectsMalformedPurpose();
  testRejectsTenantMismatch();
  testRejectsPlatformHostTenantMismatch();
  testRejectsInvalidSignature();
  testRejectsResetTokenThatWouldPassEveryOtherCheckOnPlatformHost();
  testResetTokenRejectedBeforeAndAfterConsumption();
  testRefusesUntypedTokenOnceWindowIsClosed();
  testBlankDeadlineCountsAsUnset();
  testReportedWindowMatchesTheEnforcedWindow();
  testMutationWithoutPurposeControlAcceptsForeignTokens();
  // eslint-disable-next-line no-console
  console.log('jwt-auth.guard.spec: OK (18 cases)');
}

run();
