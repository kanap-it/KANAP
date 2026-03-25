import { Features } from '../config/features';

export function resolveInlineTenantSlug(urlSlug: string): string {
  if (Features.SINGLE_TENANT) {
    return (process.env.DEFAULT_TENANT_SLUG || 'default').trim();
  }
  return urlSlug;
}
