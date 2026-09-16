import { DEFAULT_ACCESS_TOKEN_TTL, parseDurationSec } from './token-ttl.util';
import { TOKEN_SECRET_LABEL } from './token-secret.util';

/**
 * Access-token purpose marker and the transition window that keeps already-issued tokens valid.
 *
 * RFC 8725 §3.12, "Use Explicit Typing": a JWT must be checked not only as a valid token, but as
 * a valid token OF THE EXPECTED KIND. Every other family signed by this application (password
 * reset, provisioning, SSO state, SSO handoff) declares its own purpose and is refused here;
 * this is what stops a password-reset link from being replayed as a `Bearer` credential.
 * https://www.rfc-editor.org/rfc/rfc8725.html#section-3.12
 */

export const ACCESS_TOKEN_PURPOSE = 'access';

/**
 * Purpose markers of the other families. Two double as the versioned HMAC labels that derive their
 * signing keys, so a marker rename cannot silently desynchronise a family from its key derivation.
 * Provisioning keeps its historical marker, because its issuer is a service outside this
 * repository; the handoff is discriminated by `ENTRA_LOGIN_HANDOFF_TYPE`, its own legacy marker.
 * All four are listed here so the access-token predicate refuses the whole set.
 */
export const PASSWORD_RESET_PURPOSE = TOKEN_SECRET_LABEL['password-reset'];
export const PROVISIONING_PURPOSE = 'provision';
export const ENTRA_STATE_PURPOSE = TOKEN_SECRET_LABEL['entra-state'];
export const ENTRA_LOGIN_HANDOFF_TYPE = 'entra_login_handoff';

/**
 * Every marker that identifies a token family other than an access token. Listed in one place so
 * the access-token predicate refuses the whole set, declared under `purpose` or — for the handoff
 * — under its own legacy `type`.
 */
export const FOREIGN_TOKEN_MARKERS: readonly string[] = [
  PASSWORD_RESET_PURPOSE,
  PROVISIONING_PURPOSE,
  ENTRA_STATE_PURPOSE,
  ENTRA_LOGIN_HANDOFF_TYPE,
];

/**
 * Access tokens declare nothing but `purpose: 'access'`. Everything else that shares the legacy
 * layout is refused: the SSO state is `{ mode, tenantId, nonce }` and the login handoff is
 * `{ type, tenantId, userId }` — both signed with `JWT_SECRET` by an instance that predates this
 * fix, and neither carrying a usable subject. The subject is required even on the accepted path,
 * so a token can never be both "an access token" and something else.
 */
function hasAccessTokenSubject(payload: Record<string, unknown>): boolean {
  return typeof payload.sub === 'string' && payload.sub !== '';
}

export type AccessTokenPurposeCheck = {
  ok: boolean;
  /** Present when `ok` is false. */
  reason?: 'purpose-declared' | 'purpose-malformed' | 'legacy-window-closed';
  /** True for a marker-less token accepted during the transition window. */
  legacy: boolean;
};

export type AccessTokenPolicy = {
  /** Instant from which a token without `purpose: 'access'` is refused. */
  strictPurposeAt: number;
  /** Derived from `JWT_ACCESS_TOKEN_TTL` when no explicit deadline is configured. */
  derivedFromTtl: boolean;
  /** `JWT_LEGACY_ACCESS_TOKEN_DEADLINE` was set but is not a parseable instant. */
  deadlineInvalid: boolean;
};

/** The configured cut-over instant, trimmed; `null` when unset or blank. */
export function configuredLegacyDeadline(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = (env[LEGACY_DEADLINE_ENV] ?? '').trim();
  return raw === '' ? null : raw;
}

/** Clock-skew tolerance added to the computed window (default 5 minutes). */
export const DEFAULT_CLOCK_SKEW_SECONDS = 300;

const LEGACY_DEADLINE_ENV = 'JWT_LEGACY_ACCESS_TOKEN_DEADLINE';
const CLOCK_SKEW_ENV = 'JWT_CLOCK_SKEW_TOLERANCE_SEC';

function parseNonNegativeSeconds(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Decide when the compatibility window closes.
 *
 * The window must cover the longest access token an instance running the previous code could
 * still have issued: the highest `JWT_ACCESS_TOKEN_TTL` of the transition, counted from the
 * moment the last marker-less issuer stops, plus clock-skew tolerance. `JWT_LEGACY_ACCESS_TOKEN_DEADLINE`
 * (ISO-8601) pins that moment explicitly — required when instances are replaced progressively
 * rather than restarted together. Without it the window starts at process start, which is the
 * earliest instant the operator can know the cut-over began.
 */
export function resolveAccessTokenPolicy(
  env: NodeJS.ProcessEnv = process.env,
  now: number = Date.now(),
  processStartedAt: number = now,
): AccessTokenPolicy {
  const rawDeadline = configuredLegacyDeadline(env);
  if (rawDeadline !== null) {
    const parsed = Date.parse(rawDeadline);
    if (!Number.isNaN(parsed)) {
      return { strictPurposeAt: parsed, derivedFromTtl: false, deadlineInvalid: false };
    }
    return { ...derivePolicy(env, processStartedAt), deadlineInvalid: true };
  }
  return derivePolicy(env, processStartedAt);
}

function derivePolicy(env: NodeJS.ProcessEnv, processStartedAt: number): AccessTokenPolicy {
  const accessTtlSec = parseDurationSec(env.JWT_ACCESS_TOKEN_TTL?.trim() || DEFAULT_ACCESS_TOKEN_TTL);
  const skewSec = parseNonNegativeSeconds(env[CLOCK_SKEW_ENV]) ?? DEFAULT_CLOCK_SKEW_SECONDS;
  return {
    strictPurposeAt: processStartedAt + (accessTtlSec + skewSec) * 1000,
    derivedFromTtl: true,
    deadlineInvalid: false,
  };
}

/** Env variables that decide the access-token compatibility window (cache key). */
const POLICY_ENV_KEYS = [LEGACY_DEADLINE_ENV, CLOCK_SKEW_ENV, 'JWT_ACCESS_TOKEN_TTL'] as const;

function policyEnvSignature(env: NodeJS.ProcessEnv): string {
  return POLICY_ENV_KEYS.map((key) => env[key] ?? '').join('\u0000');
}

/** Parse the window once per environment, not once per request. */
export function createAccessTokenPolicyResolver(
  env: NodeJS.ProcessEnv = process.env,
  processStartedAt: number = Date.now(),
): (now: number) => AccessTokenPolicy {
  let cache: { signature: string; policy: AccessTokenPolicy } | null = null;
  return (now: number) => {
    const signature = policyEnvSignature(env);
    if (!cache || cache.signature !== signature) {
      cache = { signature, policy: resolveAccessTokenPolicy(env, now, processStartedAt) };
    }
    return cache.policy;
  };
}

/**
 * Human-readable state of the compatibility window, for the start-up line.
 * `transition` = marker-less tokens still accepted until `deadline`.
 */
export function describeLegacyAccessWindow(
  policy: AccessTokenPolicy,
  now: number = Date.now(),
): { state: 'transition' | 'strict'; deadline: string; derived: boolean } {
  return {
    state: now < policy.strictPurposeAt ? 'transition' : 'strict',
    deadline: new Date(policy.strictPurposeAt).toISOString(),
    derived: policy.derivedFromTtl,
  };
}

/**
 * Start-up line for the token-purpose policy. Informational when the cut-over is explicitly
 * pinned; warnings are reserved for configurations that need an operator decision — an
 * unparseable or already-past deadline, or the derived window that silently renews on every
 * restart and therefore never becomes strict on its own.
 */
export function describeTokenPurposePolicy(
  env: NodeJS.ProcessEnv = process.env,
  processStartedAt: number = Date.now(),
  now: number = Date.now(),
): { level: 'info' | 'warn'; message: string } {
  const policy = resolveAccessTokenPolicy(env, now, processStartedAt);
  const window = describeLegacyAccessWindow(policy, now);
  const configured = configuredLegacyDeadline(env);
  const legacyNote = policy.deadlineInvalid
    ? `${LEGACY_DEADLINE_ENV} is not a parseable instant; using the TTL-derived deadline instead`
    : configured === null
      ? 'holding only until the longest access token TTL elapses; '
        + `pin the cut-over with ${LEGACY_DEADLINE_ENV}=${window.deadline}`
      : !window.derived && policy.strictPurposeAt <= now
        ? `${LEGACY_DEADLINE_ENV} is already past; untyped access tokens are refused immediately`
        : null;
  const base = 'Access tokens must carry purpose="access"'
    + ` (legacy untyped access tokens: ${window.state === 'transition' ? 'accepted until' : 'refused since'} ${window.deadline})`;
  if (legacyNote) return { level: 'warn', message: `${base} (${legacyNote})` };
  return { level: 'info', message: base };
}

/**
 * Purpose test for an access token.
 *
 * Shape is checked first and applies to every acceptance path, so a token can never be accepted as
 * an access token while also being something else:
 *
 * - an unrecognised `type` claim, or a missing/empty `sub`, is refused — with or without
 *   `purpose: 'access'`;
 * - `purpose: 'access'` → accepted;
 * - no `purpose` claim at all → accepted only while the transition window is open, for the
 *   marker-less access tokens the previous build issued;
 * - anything else — another family's marker, `null`, `''`, a number, an object — refused, error or
 *   not. "Absent" is tested explicitly (`hasOwnProperty`), never by truthiness.
 */
export function checkAccessTokenPurpose(
  payload: Record<string, unknown>,
  policy: AccessTokenPolicy,
  now: number = Date.now(),
): AccessTokenPurposeCheck {
  if (declaresForeignType(payload) || !hasAccessTokenSubject(payload)) {
    return { ok: false, legacy: false, reason: 'purpose-declared' };
  }

  const declaresPurpose = Object.prototype.hasOwnProperty.call(payload, 'purpose');
  if (declaresPurpose) {
    const purpose = payload.purpose;
    if (typeof purpose !== 'string' || purpose === '') return { ok: false, legacy: false, reason: 'purpose-malformed' };
    if (purpose === ACCESS_TOKEN_PURPOSE) return { ok: true, legacy: false };
    return { ok: false, legacy: false, reason: 'purpose-declared' };
  }
  if (declaresForeignFamily(payload)) return { ok: false, legacy: false, reason: 'purpose-declared' };
  if (now >= policy.strictPurposeAt) return { ok: false, legacy: false, reason: 'legacy-window-closed' };
  return { ok: true, legacy: true };
}

/** A family marker, declared under `purpose` or under the handoff's legacy `type`. */
function declaresForeignFamily(payload: Record<string, unknown>): boolean {
  return FOREIGN_TOKEN_MARKERS.some(
    (marker) => payload.purpose === marker || payload.type === marker,
  );
}

/** Any `type` claim other than `undefined` marks a payload this predicate does not issue. */
function declaresForeignType(payload: Record<string, unknown>): boolean {
  return payload.type !== undefined;
}

export function isAccessTokenPayload(
  payload: Record<string, unknown>,
  policy: AccessTokenPolicy,
  now: number = Date.now(),
): boolean {
  return checkAccessTokenPurpose(payload, policy, now).ok;
}
