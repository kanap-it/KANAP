import api from '../api';

export type AllocationMethod = 'headcount' | 'it_users' | 'turnover';

export type AllocationRuleResolution = {
  fiscal_year: number;
  /** Effective method: the tenant override when configured, the standard method otherwise. */
  method: AllocationMethod;
  source: 'standard' | 'tenant';
  standard_method: AllocationMethod;
  tenant_method: AllocationMethod | null;
};

export async function fetchAllocationRule(year: number): Promise<AllocationRuleResolution> {
  const { data } = await api.get<AllocationRuleResolution>('/allocation-rules/active', {
    params: { year },
  });
  return data;
}

export async function saveAllocationRule(
  year: number,
  method: AllocationMethod,
): Promise<AllocationRuleResolution> {
  const { data } = await api.patch<AllocationRuleResolution>(
    '/allocation-rules/active',
    { method },
    { params: { year } },
  );
  return data;
}

/** Drops the tenant override so the fiscal year falls back to the standard method. */
export async function resetAllocationRule(year: number): Promise<AllocationRuleResolution> {
  const { data } = await api.delete<AllocationRuleResolution>('/allocation-rules/active', {
    params: { year },
  });
  return data;
}
