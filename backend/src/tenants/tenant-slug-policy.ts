const RESERVED_TENANT_SLUG_LIST = [
  'www',
  'api',
  'admin',
  'billing',
  'account',
  'platform-admin',
  'app',
  'nextcloud',
  'migration',
  'example',
] as const;

const RESERVED_TENANT_SLUGS = new Set<string>(RESERVED_TENANT_SLUG_LIST);

export function normalizeTenantSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function isReservedTenantSlug(slug: string): boolean {
  return RESERVED_TENANT_SLUGS.has(normalizeTenantSlug(slug));
}

export function listReservedTenantSlugs(): readonly string[] {
  return RESERVED_TENANT_SLUG_LIST;
}
