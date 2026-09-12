import { AllocationRule, AllocationRuleMode } from './allocation-rule.entity';

export type AllocationMethod = 'headcount' | 'it_users' | 'turnover';

/**
 * What a version left on `allocation_method='default'` resolves to:
 * - `auto` spreads the driver over every company enabled for the year;
 * - `manual_company` restricts the split to the listed companies, still weighted by the
 *   driver.
 */
export type DefaultResolution =
  | { kind: 'auto'; method: AllocationMethod }
  | { kind: 'manual_company'; method: AllocationMethod; companyIds: string[] };

export const STANDARD_DEFAULT: DefaultResolution = { kind: 'auto', method: 'headcount' };

export function isAllocationMethod(value: unknown): value is AllocationMethod {
  return value === 'headcount' || value === 'it_users' || value === 'turnover';
}

export function isAllocationRuleMode(value: unknown): value is AllocationRuleMode {
  return value === 'auto' || value === 'manual_company';
}

/**
 * Normalizes the persisted `method` column; unknown/legacy values resolve to `headcount`,
 * which is the standard method.
 */
export function normalizeAllocationMethod(value: unknown): AllocationMethod {
  return isAllocationMethod(value) ? value : 'headcount';
}

type ResolutionRow = Pick<AllocationRule, 'tenant_id' | 'fiscal_year' | 'method' | 'mode' | 'company_ids'>;

/** Turns a persisted rule row into its resolution (see `DefaultResolution`). */
export function toDefaultResolution(row: ResolutionRow | null | undefined): DefaultResolution {
  if (!row) return STANDARD_DEFAULT;
  const method = normalizeAllocationMethod(row.method);
  const companyIds = Array.isArray(row.company_ids) ? row.company_ids.filter((id): id is string => !!id) : [];
  // A global row can never carry a company selection (DB CHECK), and honouring one would
  // leak a single tenant's companies to everyone: treat it as auto.
  if (row.tenant_id != null && row.mode === 'manual_company' && companyIds.length > 0) {
    return { kind: 'manual_company', method, companyIds };
  }
  return { kind: 'auto', method };
}

/**
 * Builds the `fiscal_year -> resolution` default lookup for one tenant.
 *
 * The table holds a global standard row (`tenant_id IS NULL`) plus optional per-tenant
 * overrides. A tenant override always wins over the global row; without a row for the
 * year the caller falls back to the standard (`headcount` over every company).
 */
export function buildDefaultByYear(
  rows: ResolutionRow[],
  tenantId: string | null,
): Map<number, DefaultResolution> {
  const byYear = new Map<number, DefaultResolution>();

  // Global standard rows first, then per-tenant overrides so they take precedence.
  for (const row of rows) {
    if (row.tenant_id != null) continue;
    byYear.set(row.fiscal_year, toDefaultResolution(row));
  }
  for (const row of rows) {
    if (row.tenant_id == null || row.tenant_id !== tenantId) continue;
    byYear.set(row.fiscal_year, toDefaultResolution(row));
  }

  return byYear;
}

/** Lookup key for the tenant-aware `fiscal_year -> resolution` maps. */
export function defaultMethodKey(tenantId: string | null, year: number): string {
  return `${tenantId ?? 'standard'}:${year}`;
}

/**
 * Merges the per-tenant lookups of every tenant in scope into a single map keyed by
 * `defaultMethodKey`. Versions handled in one call normally share a tenant, but batch
 * callers (reports, jobs) can mix several.
 */
export function buildDefaultLookup(
  rows: ResolutionRow[],
  tenantIds: Array<string | null>,
): Map<string, DefaultResolution> {
  const lookup = new Map<string, DefaultResolution>();
  const scope = tenantIds.length > 0 ? tenantIds : [null];
  for (const tenantId of scope) {
    const byYear = buildDefaultByYear(rows, tenantId);
    for (const [year, resolution] of byYear) {
      lookup.set(defaultMethodKey(tenantId, year), resolution);
    }
  }
  return lookup;
}
