import { AllocationRule } from './allocation-rule.entity';

export type AllocationMethod = 'headcount' | 'it_users' | 'turnover';

export function isAllocationMethod(value: unknown): value is AllocationMethod {
  return value === 'headcount' || value === 'it_users' || value === 'turnover';
}

/**
 * Normalizes the persisted `method` column; unknown/legacy values resolve to `headcount`,
 * which is the standard method.
 */
export function normalizeAllocationMethod(value: unknown): AllocationMethod {
  return isAllocationMethod(value) ? value : 'headcount';
}

/**
 * Builds the `fiscal_year -> method` default lookup for one tenant.
 *
 * The table holds a global standard row (`tenant_id IS NULL`) plus optional per-tenant
 * overrides. A tenant override always wins over the global row; without a row for the
 * year the caller falls back to `headcount`.
 */
export function buildDefaultMethodByYear(
  rows: Array<Pick<AllocationRule, 'tenant_id' | 'fiscal_year' | 'method'>>,
  tenantId: string | null,
): Map<number, AllocationMethod> {
  const byYear = new Map<number, AllocationMethod>();

  // Global standard rows first, then per-tenant overrides so they take precedence.
  for (const row of rows) {
    if (row.tenant_id != null) continue;
    byYear.set(row.fiscal_year, normalizeAllocationMethod(row.method));
  }
  for (const row of rows) {
    if (row.tenant_id == null || row.tenant_id !== tenantId) continue;
    byYear.set(row.fiscal_year, normalizeAllocationMethod(row.method));
  }

  return byYear;
}

/** Lookup key for the tenant-aware `fiscal_year -> method` maps. */
export function defaultMethodKey(tenantId: string | null, year: number): string {
  return `${tenantId ?? 'standard'}:${year}`;
}

/**
 * Merges the per-tenant lookups of every tenant in scope into a single map keyed by
 * `defaultMethodKey`. Versions handled in one call normally share a tenant, but batch
 * callers (reports, jobs) can mix several.
 */
export function buildDefaultMethodLookup(
  rows: Array<Pick<AllocationRule, 'tenant_id' | 'fiscal_year' | 'method'>>,
  tenantIds: Array<string | null>,
): Map<string, AllocationMethod> {
  const lookup = new Map<string, AllocationMethod>();
  const scope = tenantIds.length > 0 ? tenantIds : [null];
  for (const tenantId of scope) {
    const byYear = buildDefaultMethodByYear(rows, tenantId);
    for (const [year, method] of byYear) {
      lookup.set(defaultMethodKey(tenantId, year), method);
    }
  }
  return lookup;
}
