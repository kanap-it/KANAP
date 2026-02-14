import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Raw, Repository } from 'typeorm';
import { SpendAllocation } from './spend-allocation.entity';
import { SpendVersion } from './spend-version.entity';
import { AllocationRule } from './allocation-rule.entity';
import { Company } from '../companies/company.entity';
import { CompanyMetric } from '../companies/company-metric.entity';
import { Department } from '../departments/department.entity';
import { DepartmentMetric } from '../departments/department-metric.entity';

export type AllocationSource = 'manual' | 'auto';

export type AllocationShare = {
  allocation_id?: string;
  company_id: string;
  department_id: string | null;
  allocation_pct: number;
  source: AllocationSource;
};

export type AllocationComputation = {
  versionId: string;
  resolvedMethod: 'headcount' | 'it_users' | 'turnover' | 'manual_company' | 'manual_department';
  shares: AllocationShare[];
  error?: string | null;
};

@Injectable()
export class AllocationCalculatorService {
  private readonly logger = new Logger(AllocationCalculatorService.name);
  constructor(
    @InjectRepository(SpendAllocation) private readonly allocations: Repository<SpendAllocation>,
    @InjectRepository(AllocationRule) private readonly rules: Repository<AllocationRule>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(CompanyMetric) private readonly metrics: Repository<CompanyMetric>,
  ) {}

  async computeForVersions(
    versions: SpendVersion[],
    opts?: { manager?: EntityManager; suppressErrors?: boolean },
  ): Promise<Map<string, AllocationComputation>> {
    const result = new Map<string, AllocationComputation>();
    if (!versions || versions.length === 0) {
      return result;
    }

    const manager = opts?.manager ?? this.allocations.manager;
    const suppressErrors = opts?.suppressErrors ?? false;
    const versionIds = versions.map((v) => v.id);

    const rawAllocations = await manager.getRepository(SpendAllocation).find({
      where: { version_id: In(versionIds) as any } as any,
    });
    const manualRowsByVersion = new Map<string, SpendAllocation[]>();
    const persistedRowsByVersion = new Map<string, SpendAllocation[]>();
    for (const row of rawAllocations) {
      const allArr = persistedRowsByVersion.get(row.version_id) ?? [];
      allArr.push(row);
      persistedRowsByVersion.set(row.version_id, allArr);
      if (row.is_system_generated) continue;
      const manualArr = manualRowsByVersion.get(row.version_id) ?? [];
      manualArr.push(row);
      manualRowsByVersion.set(row.version_id, manualArr);
    }

    const autoVersions = versions.filter((v) => !['manual_company', 'manual_department'].includes((v as any).allocation_method ?? 'default'));
    // Consider all versions to build the set of distinct years in scope.
    const years = Array.from(new Set(versions.map((v) => v.budget_year))).sort();

    const defaultMethodByYear = new Map<number, 'headcount' | 'it_users' | 'turnover'>();
    if (years.length > 0) {
      const rules = await manager.getRepository(AllocationRule).find({ where: { fiscal_year: In(years) as any, tenant_id: null } as any });
      for (const rule of rules) {
        const method = (rule.method as any) ?? 'headcount';
        if (method === 'headcount' || method === 'it_users' || method === 'turnover') {
          defaultMethodByYear.set(rule.fiscal_year, method);
        }
      }
    }

    // Year-aware enabled filters: include companies through their disabled_at year.
    // For each year in scope, build the set of enabled companies using
    // (disabled_at IS NULL OR disabled_at >= :period_start), where period_start = YYYY-01-01.
    const enabledCompaniesByYear = new Map<number, Company[]>();
    if (years.length > 0) {
      for (const y of years) {
        const periodStart = new Date(`${String(y).padStart(4, '0')}-01-01T00:00:00.000Z`);
        const companies = await manager.getRepository(Company).find({
          where: {
            disabled_at: Raw((alias) => `${alias} IS NULL OR ${alias} >= :period_start`, { period_start: periodStart }),
          },
        } as any);
        enabledCompaniesByYear.set(y, companies);
      }
    }

    const allCompanyIds = new Set<string>();
    enabledCompaniesByYear.forEach((list) => list.forEach((c) => allCompanyIds.add(c.id)));
    const companyIds = Array.from(allCompanyIds);
    const metricsByYear = new Map<number, Map<string, CompanyMetric>>();
    if (years.length > 0 && companyIds.length > 0) {
      const metricRows = await manager.getRepository(CompanyMetric).find({
        where: {
          fiscal_year: In(years) as any,
          company_id: In(companyIds) as any,
        } as any,
      });
      for (const row of metricRows) {
        let byCompany = metricsByYear.get(row.fiscal_year);
        if (!byCompany) {
          byCompany = new Map<string, CompanyMetric>();
          metricsByYear.set(row.fiscal_year, byCompany);
        }
        byCompany.set(row.company_id, row);
      }
    }

    for (const version of versions) {
      const method = ((version as any).allocation_method ?? 'default') as string;
      if (method === 'manual_company' || method === 'manual_department') {
        const rows = manualRowsByVersion.get(version.id) ?? [];
        const fallbackShares = rows.map((row) => ({
          allocation_id: row.id,
          company_id: row.company_id,
          department_id: row.department_id ?? null,
          allocation_pct: Number(row.allocation_pct || 0),
          source: 'manual' as AllocationSource,
        }));

        try {
          if (method === 'manual_company') {
            const companyIds = Array.from(new Set(rows.map((row) => row.company_id).filter((id): id is string => !!id)));
            if (companyIds.length === 0) {
              result.set(version.id, {
                versionId: version.id,
                resolvedMethod: method as any,
                shares: [],
                error: 'Select at least one company for manual allocation.',
              });
              continue;
            }

            const distribution = await this.computeManualCompanyShares({
              manager,
              tenantId: version.tenant_id,
              fiscalYear: version.budget_year,
              companyIds,
              driver: ((version as any).allocation_driver ?? 'headcount') as 'headcount' | 'it_users' | 'turnover',
            });

            const shares = rows.map((row) => ({
              allocation_id: row.id,
              company_id: row.company_id,
              department_id: null,
              allocation_pct: distribution.get(row.company_id) ?? 0,
              source: 'manual' as AllocationSource,
            }));

            result.set(version.id, {
              versionId: version.id,
              resolvedMethod: method as any,
              shares,
              error: null,
            });
            continue;
          }

          if (method === 'manual_department') {
            const deptIds = Array.from(new Set(rows.map((row) => row.department_id).filter((id): id is string => !!id)));
            if (deptIds.length === 0) {
              result.set(version.id, {
                versionId: version.id,
                resolvedMethod: method as any,
                shares: [],
                error: 'Select at least one department for manual allocation.',
              });
              continue;
            }

            const distribution = await this.computeManualDepartmentShares({
              manager,
              tenantId: version.tenant_id,
              fiscalYear: version.budget_year,
              departmentIds: deptIds,
            });

            const shares = rows.map((row) => {
              const entry = distribution.get(row.department_id ?? '') ?? { company_id: row.company_id, allocation_pct: 0 };
              return {
                allocation_id: row.id,
                company_id: entry.company_id,
                department_id: row.department_id ?? null,
                allocation_pct: entry.allocation_pct,
                source: 'manual' as AllocationSource,
              };
            });

            result.set(version.id, {
              versionId: version.id,
              resolvedMethod: method as any,
              shares,
              error: null,
            });
            continue;
          }
        } catch (err) {
          if (suppressErrors && fallbackShares.length > 0 && err instanceof BadRequestException) {
            this.logger.warn(`Manual allocation computation warning for version ${version.id}: ${err.message}. Using stored allocation.`);
            result.set(version.id, {
              versionId: version.id,
              resolvedMethod: method as any,
              shares: fallbackShares,
              error: err.message,
            });
            continue;
          }
          throw err;
        }
      }

      const resolved = this.resolveMethod(method, version.budget_year, defaultMethodByYear);
      const persistedShares = (persistedRowsByVersion.get(version.id) ?? [])
        .map((row) => ({
          allocation_id: row.id,
          company_id: row.company_id,
          department_id: row.department_id ?? null,
          allocation_pct: Number(row.allocation_pct || 0),
          source: 'auto' as AllocationSource,
        }))
        .filter((share) => Number.isFinite(share.allocation_pct) && Math.abs(share.allocation_pct) > 0);
      const persistedFallback = () => persistedShares.length > 0 ? persistedShares : null;

      const companiesForYear = enabledCompaniesByYear.get(version.budget_year) ?? [];
      if (companiesForYear.length === 0) {
        if (!suppressErrors) {
          throw new BadRequestException('No enabled companies for allocation distribution');
        }
        this.logger.warn(`Allocation computation skipped for version ${version.id}: No enabled companies for allocation distribution`);
        const fallback = persistedFallback();
        if (fallback) {
          result.set(version.id, {
            versionId: version.id,
            resolvedMethod: resolved,
            shares: fallback,
            error: 'No enabled companies for allocation distribution. Using last stored allocation.',
          });
        } else {
          result.set(version.id, {
            versionId: version.id,
            resolvedMethod: resolved,
            shares: [],
            error: 'No enabled companies for allocation distribution',
          });
        }
        continue;
      }

      const metricsForYear = metricsByYear.get(version.budget_year) ?? new Map<string, CompanyMetric>();
      try {
        const shares = this.computeAutoShares({
          version,
          companies: companiesForYear,
          metricsForYear,
          method: resolved,
        });
        result.set(version.id, {
          versionId: version.id,
          resolvedMethod: resolved,
          shares,
          error: null,
        });
      } catch (err) {
        if (suppressErrors && err instanceof BadRequestException) {
          const fallback = persistedFallback();
          if (fallback) {
            this.logger.warn(`Allocation computation warning for version ${version.id}: ${err.message}. Falling back to stored allocations.`);
            result.set(version.id, {
              versionId: version.id,
              resolvedMethod: resolved,
              shares: fallback,
              error: `${err.message} (used stored allocation)`,
            });
            continue;
          }
          this.logger.warn(`Allocation computation warning for version ${version.id}: ${err.message}. No stored allocation available.`);
          result.set(version.id, {
            versionId: version.id,
            resolvedMethod: resolved,
            shares: [],
            error: err.message,
          });
          continue;
        }
        throw err;
      }
    }

    return result;
  }

  private resolveMethod(
    method: string,
    year: number,
    defaultMethodByYear: Map<number, 'headcount' | 'it_users' | 'turnover'>,
  ): 'headcount' | 'it_users' | 'turnover' {
    if (method === 'headcount' || method === 'it_users' || method === 'turnover') {
      return method;
    }
    const ruleMethod = defaultMethodByYear.get(year);
    if (ruleMethod) return ruleMethod;
    return 'headcount';
  }

  private computeAutoShares(args: {
    version: SpendVersion;
    companies: Company[];
    metricsForYear: Map<string, CompanyMetric>;
    method: 'headcount' | 'it_users' | 'turnover';
  }): AllocationShare[] {
    const { companies, metricsForYear, method, version } = args;
    if (!companies || companies.length === 0) {
      throw new BadRequestException('No enabled companies for distribution');
    }

    const extracted: Array<{ company: Company; weight: number }> = [];
    for (const company of companies) {
      const metric = metricsForYear.get(company.id);
      let raw: number | null = null;
      if (method === 'headcount') raw = metric != null && metric.headcount != null ? Number(metric.headcount) : null;
      else if (method === 'it_users') raw = metric != null && metric.it_users != null ? Number(metric.it_users) : null;
      else if (method === 'turnover') raw = metric != null && metric.turnover != null ? Number(metric.turnover) : null;
      if (raw == null || !Number.isFinite(raw) || raw <= 0) {
        continue; // silently exclude companies without usable data
      }
      extracted.push({ company, weight: raw });
    }

    let shares: AllocationShare[] = [];

    const sum = extracted.reduce((acc, it) => acc + Number(it.weight || 0), 0);
    if (sum > 0 && extracted.length > 0) {
      let accumulated = 0;
      for (let i = 0; i < extracted.length; i++) {
        const { company, weight } = extracted[i];
        let pct = (100 * weight) / sum;
        pct = Math.max(0, Math.round(pct * 10000) / 10000);
        if (i === extracted.length - 1) {
          pct = Math.max(0, Math.round((100 - accumulated) * 10000) / 10000);
        } else {
          accumulated += pct;
        }
        if (pct <= 0) continue;
        shares.push({
          company_id: company.id,
          department_id: null,
          allocation_pct: pct,
          source: 'auto',
        });
      }
    } else {
      // No usable metrics -> split evenly across all enabled companies
      const targets = companies.slice();
      if (targets.length === 0) {
        return [];
      }
      let accumulated = 0;
      for (let i = 0; i < targets.length; i++) {
        let pct = 100 / targets.length;
        pct = Math.round(pct * 10000) / 10000;
        if (i === targets.length - 1) {
          pct = Math.max(0, Math.round((100 - accumulated) * 10000) / 10000);
        } else {
          accumulated += pct;
        }
        if (pct <= 0) continue;
        shares.push({
          company_id: targets[i].id,
          department_id: null,
          allocation_pct: pct,
          source: 'auto',
        });
      }
    }

    shares.sort((a, b) => b.allocation_pct - a.allocation_pct || a.company_id.localeCompare(b.company_id));
    return shares;
  }

  private async computeManualCompanyShares(args: {
    manager: EntityManager;
    tenantId: string;
    fiscalYear: number;
    companyIds: string[];
    driver: 'headcount' | 'it_users' | 'turnover';
  }): Promise<Map<string, number>> {
    const { manager, tenantId, fiscalYear, companyIds, driver } = args;
    const companyRepo = manager.getRepository(Company);
    // Year-aware disabled filter: companies are considered enabled for a given fiscalYear
    // if disabled_at is NULL or disabled_at >= Jan 1 of that fiscal year.
    const periodStart = new Date(`${String(fiscalYear).padStart(4, '0')}-01-01T00:00:00.000Z`);
    const companies = await companyRepo.find({
      where: {
        tenant_id: tenantId,
        id: In(companyIds) as any,
        disabled_at: Raw((alias) => `${alias} IS NULL OR ${alias} >= :period_start`, { period_start: periodStart }),
      } as any,
    });
    if (companies.length !== companyIds.length) {
      throw new BadRequestException('Some companies are not available for manual allocation.');
    }

    const metricRepo = manager.getRepository(CompanyMetric);
    const metrics = await metricRepo.find({
      where: {
        tenant_id: tenantId,
        fiscal_year: fiscalYear,
        company_id: In(companyIds) as any,
      } as any,
    });

    const weights = companyIds.map((companyId) => {
      const metric = metrics.find((m) => m.company_id === companyId);
      let weight = 0;
      if (driver === 'headcount') weight = Number(metric?.headcount ?? 0);
      else if (driver === 'it_users') weight = Number(metric?.it_users ?? 0);
      else weight = Number(metric?.turnover ?? 0);
      return { id: companyId, weight };
    });

    if (weights.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) {
      throw new BadRequestException(`Provide ${driver.replace('_', ' ')} values for the selected companies.`);
    }

    const distribution = this.normalizeWeights(weights);
    const map = new Map<string, number>();
    distribution.forEach(({ id, pct }) => map.set(id, pct));
    return map;
  }

  private async computeManualDepartmentShares(args: {
    manager: EntityManager;
    tenantId: string;
    fiscalYear: number;
    departmentIds: string[];
  }): Promise<Map<string, { company_id: string; allocation_pct: number }>> {
    const { manager, tenantId, fiscalYear, departmentIds } = args;
    // Year-aware disabled filter: departments are considered enabled for a given fiscalYear
    // if disabled_at is NULL or disabled_at >= Jan 1 of that fiscal year.
    const periodStart = new Date(`${String(fiscalYear).padStart(4, '0')}-01-01T00:00:00.000Z`);
    const departments = await manager.getRepository(Department).find({
      where: {
        tenant_id: tenantId,
        id: In(departmentIds) as any,
        disabled_at: Raw((alias) => `${alias} IS NULL OR ${alias} >= :period_start`, { period_start: periodStart }),
      } as any,
    });
    if (departments.length !== departmentIds.length) {
      throw new BadRequestException('Some departments could not be found for manual allocation.');
    }

    const metrics = await manager.getRepository(DepartmentMetric).find({
      where: {
        tenant_id: tenantId,
        fiscal_year: fiscalYear,
        department_id: In(departmentIds) as any,
      } as any,
    });

    const weights = departmentIds.map((deptId) => {
      const metric = metrics.find((m) => m.department_id === deptId);
      return { id: deptId, weight: Number(metric?.headcount ?? 0) };
    });

    if (weights.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) {
      throw new BadRequestException('Provide headcount values for the selected departments.');
    }

    const distribution = this.normalizeWeights(weights);
    const map = new Map<string, { company_id: string; allocation_pct: number }>();
    distribution.forEach(({ id, pct }) => {
      const department = departments.find((d) => d.id === id)!;
      map.set(id, { company_id: department.company_id, allocation_pct: pct });
    });
    return map;
  }

  private normalizeWeights(weights: Array<{ id: string; weight: number }>): Array<{ id: string; pct: number }> {
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
}
