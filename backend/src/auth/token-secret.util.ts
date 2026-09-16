import { createHmac } from 'crypto';
import { requireJwtSecret } from '../common/env';

/**
 * Per-family signing keys.
 *
 * Every token family (access, password reset, provisioning, SSO state) used to fall back to
 * `JWT_SECRET` when its own variable was unset — and no deployment ever set them, so a single
 * key signed and verified all four families. The only thing separating them was an unverified
 * `purpose` claim, which is exactly the confusion reported as constat n°2.
 *
 * A key configured for a family is now the ONLY key used for that family (no fallback attempt
 * with `JWT_SECRET` after a failure), and a family without its own key derives one from
 * `JWT_SECRET` through HMAC with a stable, versioned label. Rotating a label version rotates the
 * key material without touching `JWT_SECRET` itself.
 */

export const TOKEN_SECRET_LABEL_PREFIX = 'kanap:v1:';

export const TOKEN_SECRET_LABEL = {
  'password-reset': `${TOKEN_SECRET_LABEL_PREFIX}password-reset`,
  provisioning: `${TOKEN_SECRET_LABEL_PREFIX}provisioning`,
  'entra-state': `${TOKEN_SECRET_LABEL_PREFIX}entra-state`,
} as const;

export type TokenFamily = keyof typeof TOKEN_SECRET_LABEL;

/** Environment variable holding a family's dedicated key, when the operator sets one. */
export const TOKEN_FAMILY_ENV: Record<TokenFamily, string> = {
  'password-reset': 'PASSWORD_RESET_SECRET',
  provisioning: 'PROVISIONING_TOKEN_SECRET',
  'entra-state': 'ENTRA_STATE_SECRET',
};

export type TokenSecretSource = 'dedicated-key' | 'derived-key';

/**
 * Derive a family key from `JWT_SECRET` with a distinct, stable HMAC label (RFC 2104 PRF).
 * Same base secret + same label ⇒ same key on every instance and environment.
 */
export function deriveSecret(jwtSecret: string, family: TokenFamily): string {
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error('FATAL: cannot derive a token family key without JWT_SECRET');
  }
  return createHmac('sha256', jwtSecret)
    .update(TOKEN_SECRET_LABEL[family], 'utf8')
    .digest('hex');
}

export function resolveFamilySecret(
  family: TokenFamily,
  env: NodeJS.ProcessEnv = process.env,
): { secret: string; source: TokenSecretSource; envVar: string } {
  const envVar = TOKEN_FAMILY_ENV[family];
  const dedicated = (env[envVar] || '').trim();
  if (dedicated !== '') {
    return { secret: dedicated, source: 'dedicated-key', envVar };
  }
  return { secret: deriveSecret(requireJwtSecret(env), family), source: 'derived-key', envVar };
}

/** Password-reset link signing key. */
export function getPasswordResetSecret(env: NodeJS.ProcessEnv = process.env): string {
  return resolveFamilySecret('password-reset', env).secret;
}

/** Provisioning exchange token signing key. */
export function getProvisioningSecret(env: NodeJS.ProcessEnv = process.env): string {
  return resolveFamilySecret('provisioning', env).secret;
}

/** Entra SSO state / login handoff signing key. */
export function getEntraStateSecret(env: NodeJS.ProcessEnv = process.env): string {
  return resolveFamilySecret('entra-state', env).secret;
}

export type TokenSecretPolicyEntry = {
  family: TokenFamily;
  envVar: string;
  source: TokenSecretSource;
};

/**
 * Effective key policy, for the start-up line. Reads no secret value: only where each family
 * key comes from, so it is safe to log.
 */
export function describeSecretPolicy(env: NodeJS.ProcessEnv = process.env): TokenSecretPolicyEntry[] {
  return (Object.keys(TOKEN_SECRET_LABEL) as TokenFamily[]).map((family) => {
    const { source, envVar } = resolveFamilySecret(family, env);
    return { family, envVar, source };
  });
}
