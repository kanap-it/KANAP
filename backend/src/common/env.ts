export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`FATAL: ${name} environment variable is required`);
  }
  return value;
}

export function requireJwtSecret(): string {
  return requireEnv('JWT_SECRET');
}

export function requireAppBaseUrl(): string {
  const value = process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL;
  if (!value || value.trim() === '') {
    throw new Error('FATAL: APP_BASE_URL environment variable is required');
  }
  return value;
}

export function parseBoolean(raw: string | undefined): boolean {
  const value = (raw || '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'y' || value === 'on';
}

/**
 * CORS pattern entry. Can be:
 * - Exact origin: "https://app.kanap.net"
 * - Wildcard subdomain: "https://*.kanap.net" (matches any subdomain)
 * - Wildcard port: "http://localhost:*" (matches any port)
 */
export interface CorsPattern {
  protocol: string;
  host: string; // may contain leading "*." for wildcard subdomain
  port: string; // may be "*" for wildcard port, or empty for default
}

function parseCorsPattern(value: string): CorsPattern | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Handle wildcard patterns that aren't valid URLs
  // e.g., "https://*.kanap.net" or "http://localhost:*"
  const wildcardMatch = trimmed.match(/^(https?):\/\/(\*\.[^:/]+|\*|[^:/]+)(?::(\*|\d+))?$/);
  if (wildcardMatch) {
    const [, protocol, host, port] = wildcardMatch;
    return { protocol: protocol + ':', host, port: port || '' };
  }

  // Try parsing as a standard URL for exact origins
  try {
    const url = new URL(trimmed);
    // Extract port, accounting for default ports
    let port = url.port;
    if (!port) {
      port = ''; // Use empty string for default port
    }
    return { protocol: url.protocol, host: url.hostname, port };
  } catch {
    return null;
  }
}

export function parseCorsPatterns(): CorsPattern[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return [];
  const patterns: CorsPattern[] = [];
  const seen = new Set<string>();
  for (const entry of raw.split(',')) {
    const pattern = parseCorsPattern(entry);
    if (pattern) {
      const key = `${pattern.protocol}//${pattern.host}:${pattern.port}`;
      if (!seen.has(key)) {
        seen.add(key);
        patterns.push(pattern);
      }
    }
  }
  return patterns;
}

/**
 * Check if an origin matches any of the configured CORS patterns.
 * Supports:
 * - Exact match: "https://app.kanap.net"
 * - Wildcard subdomain: "https://*.kanap.net" matches "https://tenant.kanap.net"
 * - Wildcard port: "http://localhost:*" matches "http://localhost:5173"
 */
export function matchesCorsOrigin(origin: string, patterns: CorsPattern[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const originProtocol = parsed.protocol;
  const originHost = parsed.hostname.toLowerCase();
  const originPort = parsed.port; // empty string if default port

  for (const pattern of patterns) {
    // Protocol must match exactly
    if (pattern.protocol !== originProtocol) continue;

    // Check port
    if (pattern.port !== '*' && pattern.port !== originPort) continue;

    // Check host
    if (pattern.host.startsWith('*.')) {
      // Wildcard subdomain: *.kanap.net matches foo.kanap.net and bar.kanap.net
      const domain = pattern.host.slice(2).toLowerCase();
      if (originHost === domain || originHost.endsWith('.' + domain)) {
        return true;
      }
    } else if (pattern.host === '*') {
      // Full wildcard host (rare, but supported)
      return true;
    } else {
      // Exact host match
      if (pattern.host.toLowerCase() === originHost) {
        return true;
      }
    }
  }

  return false;
}

// Legacy function for backward compatibility (deprecated)
export function parseCorsOrigins(): string[] {
  const patterns = parseCorsPatterns();
  // Return only exact origins (no wildcards) for backward compat
  return patterns
    .filter(p => !p.host.includes('*') && p.port !== '*')
    .map(p => {
      const portSuffix = p.port ? `:${p.port}` : '';
      return `${p.protocol}//${p.host}${portSuffix}`;
    });
}

export function getEnvMode(): string {
  return (process.env.APP_ENV || process.env.NODE_ENV || '').trim().toLowerCase();
}

export function isProductionEnv(): boolean {
  const env = getEnvMode();
  return env === 'production' || env === 'prod';
}
