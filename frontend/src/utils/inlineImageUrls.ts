function trimTrailingSlash(input: string): string {
  return input.replace(/\/+$/, '');
}

function normalizeBasePath(input: string): string {
  if (!input) return '/';
  if (input.startsWith('http://') || input.startsWith('https://')) return trimTrailingSlash(input);
  const withLeadingSlash = input.startsWith('/') ? input : `/${input}`;
  return trimTrailingSlash(withLeadingSlash);
}

export function getTenantSlugFromHostname(hostname: string): string {
  const host = String(hostname || '').split(':')[0];
  // IPv4 addresses and localhost don't carry tenant slug info (on-prem / dev)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost') {
    return 'default';
  }
  const slug = host.split('.')[0];
  return slug || host || 'default';
}

export function buildInlineImageUrl(pathAfterApiBase: string): string {
  const rawBase = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
  const base = normalizeBasePath(rawBase.trim());
  const path = pathAfterApiBase.startsWith('/') ? pathAfterApiBase : `/${pathAfterApiBase}`;
  return `${base}${path}`;
}
