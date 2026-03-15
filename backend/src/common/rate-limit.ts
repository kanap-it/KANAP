import { parseBoolean } from './env';

function parseEnvBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  return parseBoolean(raw);
}

export function isRateLimitEnabled(): boolean {
  return parseEnvBoolean(process.env.RATE_LIMIT_ENABLED, true);
}

export function shouldTrustProxyForRateLimit(): boolean {
  return parseEnvBoolean(process.env.RATE_LIMIT_TRUST_PROXY, false);
}

// TTL values are in milliseconds.
export const RATE_LIMITS = {
  authLogin: { limit: 5, ttl: 60_000 },
  authPasswordResetRequest: { limit: 3, ttl: 15 * 60_000 },
  authPasswordResetComplete: { limit: 5, ttl: 10 * 60_000 },
  publicStartTrial: { limit: 5, ttl: 10 * 60_000 },
  publicContact: { limit: 5, ttl: 10 * 60_000 },
  publicRequestSupportInvoice: { limit: 3, ttl: 10 * 60_000 },
  documentExport: { limit: 5, ttl: 60_000 },
  documentImport: { limit: 5, ttl: 60_000 },
};
