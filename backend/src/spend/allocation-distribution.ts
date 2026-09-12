import { BadRequestException } from '@nestjs/common';
import { EntityManager, In, Raw } from 'typeorm';
import { Company } from '../companies/company.entity';
import { CompanyMetric } from '../companies/company-metric.entity';

export type AllocationDriver = 'headcount' | 'it_users' | 'turnover';

export type WeightedEntry = { id: string; weight: number };

/**
 * January 1st of a fiscal year. A company counts as enabled for a year when `disabled_at`
 * is NULL or falls on/after that date.
 */
export function fiscalYearStart(fiscalYear: number): Date {
  return new Date(`${String(fiscalYear).padStart(4, '0')}-01-01T00:00:00.000Z`);
}

/**
 * Normalizes weights into percentages summing to exactly 100.
 *
 * Every entry is rounded to four decimals and the last one absorbs the rounding
 * remainder, so the exported percentages always add up to 100.
 */
export function normalizeWeights(weights: WeightedEntry[]): Array<{ id: string; pct: number }> {
  const total = weights.reduce((acc, entry) => acc + entry.weight, 0);
  if (!Number.isFinite(total) || total <= 0) {
    throw new BadRequestException('Allocation source values must sum to a positive amount.');
  }

  let running = 0;
  return weights.map((entry, idx) => {
    let pct = Number(((entry.weight * 100) / total).toFixed(4));
    if (idx === weights.length - 1) {
      const diff = Number((100 - (running + pct)).toFixed(4));
      pct = Number((pct + diff).toFixed(4));
    }
    running += pct;
    return { id: entry.id, pct };
  });
}

/**
 * Builds the weighting of a manual company selection from the driver value of each
 * selected company.
 *
 * Every selected company must carry a strictly positive value for the year; the check
 * stays here so both the save path and the read path reject the same selections.
 */
export function buildCompanyWeights(
  companyIds: string[],
  driverValueByCompany: ReadonlyMap<string, number | string | null | undefined>,
  driver: AllocationDriver,
): WeightedEntry[] {
  const weights: WeightedEntry[] = companyIds.map((companyId) => {
    const raw = driverValueByCompany.get(companyId);
    const weight = raw == null ? 0 : Number(raw);
    return { id: companyId, weight: Number.isFinite(weight) ? weight : 0 };
  });

  if (weights.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) {
    throw new BadRequestException(`Provide ${driver.replace('_', ' ')} values for the selected companies.`);
  }

  return weights;
}

/**
 * Company split for a manual company selection, shared by the OPEX/CAPEX calculators
 * (read path) and the allocation services (save path).
 *
 * Companies must belong to the tenant and be enabled for the fiscal year: a company is
 * considered enabled when `disabled_at` is NULL or falls on/after January 1st of that
 * year. Percentages come from each company's driver value for the same year.
 */
export async function computeCompanyShares(args: {
  manager: EntityManager;
  tenantId: string;
  fiscalYear: number;
  companyIds: string[];
  driver: AllocationDriver;
}): Promise<Map<string, number>> {
  const { manager, tenantId, fiscalYear, companyIds, driver } = args;

  const periodStart = fiscalYearStart(fiscalYear);
  const companies = await manager.getRepository(Company).find({
    where: {
      tenant_id: tenantId,
      id: In(companyIds) as any,
      disabled_at: Raw((alias) => `${alias} IS NULL OR ${alias} >= :period_start`, { period_start: periodStart }),
    } as any,
  });
  if (companies.length !== companyIds.length) {
    throw new BadRequestException('Some companies are not available for manual allocation.');
  }

  const metrics = await manager.getRepository(CompanyMetric).find({
    where: {
      tenant_id: tenantId,
      fiscal_year: fiscalYear,
      company_id: In(companyIds) as any,
    } as any,
  });

  const driverValueByCompany = new Map<string, number | string | null>();
  for (const companyId of companyIds) {
    const metric = metrics.find((m) => m.company_id === companyId);
    if (driver === 'headcount') driverValueByCompany.set(companyId, metric?.headcount ?? null);
    else if (driver === 'it_users') driverValueByCompany.set(companyId, metric?.it_users ?? null);
    else driverValueByCompany.set(companyId, metric?.turnover ?? null);
  }

  const distribution = normalizeWeights(buildCompanyWeights(companyIds, driverValueByCompany, driver));
  const shares = new Map<string, number>();
  distribution.forEach(({ id, pct }) => shares.set(id, pct));
  return shares;
}
