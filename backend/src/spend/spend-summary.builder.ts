import { EntityManager, In } from 'typeorm';
import { SpendItem } from './spend-item.entity';
import { SpendVersion } from './spend-version.entity';
import { SpendAmount } from './spend-amount.entity';
import { Company } from '../companies/company.entity';
import { Department } from '../departments/department.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { Account } from '../accounts/account.entity';
import { AnalyticsCategory } from '../analytics/analytics-category.entity';
import { User } from '../users/user.entity';
import { AllocationCalculatorService, AllocationComputation } from './allocation-calculator.service';
import { FxRateService, FxLookupKey, FxResolvedRate } from '../currency/fx-rate.service';
import { ACTIVE_TASK_STATUSES } from '../tasks/task.entity';

export type SpendSummaryRow = SpendItem & {
  analytics_category_id: string | null;
  analytics_category_name: string | null;
  latest_contract_id: string | null;
  latest_contract_name: string | '';
  supplier?: { id: string; name: string };
  supplier_name?: string;
  account?: { id: string; account_number: string; account_name: string };
  account_number?: string;
  account_name?: string;
  account_display?: string;
  owner_it_name?: string;
  owner_business_name?: string;
  main_recipient?: {
    company_id: string | null;
    department_id: string | null;
    pct?: number;
    label: string;
  } | null;
  versions: Record<string, {
    year?: number;
    totals: {
      budget: number;
      follow_up: number;
      landing: number;
      revision: number;
    };
    version_id?: string;
    reporting?: {
      budget: number;
      follow_up: number;
      landing: number;
      revision: number;
      currency: string;
      reporting_currency: string;
      fx_rate: number;
      fx_source: FxResolvedRate['source'];
      fx_rate_set_id: string | null;
    };
  }>;
  latest_task?: { id: string; title?: string | null; description?: string | null; status?: string; created_at?: Date } | null;
  spread_mode_for_y?: string | null;
  allocation_method_label?: string;
  allocation_warning?: string | null;
  account_warning?: string | null;
};

export interface SpendSummaryBuildParams {
  manager: EntityManager;
  items: SpendItem[];
  years: number[];
  currentYear: number;
  allocationCalculator: AllocationCalculatorService;
  formatAllocationMethodLabel: (method?: string | null) => string;
  includeRecipientDetails?: boolean;
  includeLatestTask?: boolean;
  fxRates: FxRateService;
  tenantId?: string | null;
}

export interface SpendSummaryBuildResult {
  rows: SpendSummaryRow[];
  versionsByItemYear: Map<string, Map<number, SpendVersion>>;
  versionTotalsById: Map<string, VersionAnnualTotals>;
  versionReportingTotalsById: Map<string, VersionReportingTotals>;
}

export interface VersionAnnualTotals {
  planned: number;
  actual: number;
  expected_landing: number;
  committed: number;
}

export interface VersionReportingTotals extends VersionAnnualTotals {
  currency: string;
  reporting_currency: string;
  fx_rate: number;
  fx_source: FxResolvedRate['source'];
  fx_rate_set_id: string | null;
  captured_at: Date | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function displayName(user?: User | null): string {
  if (!user) return '';
  const fn = (user as any).first_name ? String((user as any).first_name).trim() : '';
  const ln = (user as any).last_name ? String((user as any).last_name).trim() : '';
  const name = [fn, ln].filter(Boolean).join(' ');
  return name || (user as any).email || '';
}

function toTotals(
  version: SpendVersion | undefined,
  versionTotalsById: Map<string, VersionAnnualTotals>,
  versionReportingTotalsById: Map<string, VersionReportingTotals>
) {
  if (!version) {
    return {
      year: undefined,
      totals: { budget: 0, follow_up: 0, landing: 0, revision: 0 },
      version_id: undefined,
      reporting: undefined,
    };
  }
  const sums = versionTotalsById.get(version.id) || { planned: 0, actual: 0, expected_landing: 0, committed: 0 };
  const reporting = versionReportingTotalsById.get(version.id) || null;
  return {
    year: (version as any).budget_year as number,
    totals: {
      budget: round2(Number(sums.planned || 0)),
      follow_up: round2(Number(sums.actual || 0)),
      landing: round2(Number(sums.expected_landing || 0)),
      revision: round2(Number(sums.committed || 0)),
    },
    version_id: version.id,
    reporting: reporting
      ? {
          budget: round2(Number(reporting.planned || 0)),
          follow_up: round2(Number(reporting.actual || 0)),
          landing: round2(Number(reporting.expected_landing || 0)),
          revision: round2(Number(reporting.committed || 0)),
          currency: reporting.currency,
          reporting_currency: reporting.reporting_currency,
          fx_rate: reporting.fx_rate,
          fx_source: reporting.fx_source,
          fx_rate_set_id: reporting.fx_rate_set_id,
        }
      : undefined,
  };
}

export async function buildSpendSummaryRows(params: SpendSummaryBuildParams): Promise<SpendSummaryBuildResult> {
  const {
    manager,
    items,
    years,
    currentYear,
    allocationCalculator,
    formatAllocationMethodLabel,
    includeRecipientDetails = false,
    includeLatestTask = false,
  } = params;

  if (!items.length) {
    return {
      rows: [],
      versionsByItemYear: new Map(),
      versionTotalsById: new Map(),
      versionReportingTotalsById: new Map(),
    };
  }

  const itemIds = items.map((i) => i.id);

  const categoryIds = Array.from(new Set(items.map((i: any) => i.analytics_category_id).filter(Boolean)));
  const categories = categoryIds.length
    ? await manager.getRepository(AnalyticsCategory).find({ where: { id: In(categoryIds) as any } as any })
    : [];
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const latestContracts: Array<{ spend_item_id: string; contract_id: string; contract_name: string; link_created_at: string }> = itemIds.length
    ? await manager.query(
        `SELECT DISTINCT ON (csi.spend_item_id)
           csi.spend_item_id,
           csi.created_at as link_created_at,
           c.id as contract_id,
           c.name as contract_name
         FROM contract_spend_items csi
         JOIN contracts c ON csi.contract_id = c.id
         WHERE csi.spend_item_id = ANY($1)
         ORDER BY csi.spend_item_id, csi.created_at DESC`,
        [itemIds],
      )
    : [];
  const latestContractByItem = new Map<string, { id: string; name: string }>();
  for (const row of latestContracts) {
    latestContractByItem.set(row.spend_item_id, { id: row.contract_id, name: row.contract_name });
  }

  const uniqueYears = Array.from(new Set(years));
  const versions = await manager.getRepository(SpendVersion).find({
    where: { spend_item_id: In(itemIds) as any, budget_year: In(uniqueYears) as any } as any,
  });
  const versionsByItemYear = new Map<string, Map<number, SpendVersion>>();
  const versionsById = new Map<string, SpendVersion>();
  for (const version of versions) {
    versionsById.set(version.id, version);
    const budgetYear = (version as any).budget_year as number;
    let perItem = versionsByItemYear.get(version.spend_item_id);
    if (!perItem) {
      perItem = new Map<number, SpendVersion>();
      versionsByItemYear.set(version.spend_item_id, perItem);
    }
    perItem.set(budgetYear, version);
  }

  const versionIds = versions.map((v) => v.id);
  const versionTotalsById = new Map<string, VersionAnnualTotals>();
  if (versionIds.length) {
    const allAmounts = await manager.getRepository(SpendAmount).find({ where: { version_id: In(versionIds) as any } as any });
    for (const amount of allAmounts) {
      const versionId = (amount as any).version_id as string;
      const version = versionsById.get(versionId);
      if (!version) continue;
      const periodYear = new Date((amount as any).period as string).getFullYear();
      const versionYear = (version as any).budget_year as number;
      if (periodYear !== versionYear) continue;
      const acc = versionTotalsById.get(versionId) || { planned: 0, actual: 0, expected_landing: 0, committed: 0 };
      acc.planned += Number((amount as any).planned || 0);
      acc.actual += Number((amount as any).actual || 0);
      acc.expected_landing += Number((amount as any).expected_landing || 0);
      acc.committed += Number((amount as any).committed || 0);
      versionTotalsById.set(versionId, acc);
    }
  }

  const lookupKeys: FxLookupKey[] = [];
  const itemById = new Map(items.map((it) => [it.id, it]));
  for (const version of versions) {
    const item = itemById.get(version.spend_item_id);
    if (!item) continue;
    const sourceCurrency = (item as any).currency || 'EUR';
    lookupKeys.push({
      key: '',
      rateSetId: (version as any).fx_rate_set_id ?? null,
      fiscalYear: (version as any).budget_year as number,
      sourceCurrency,
    });
  }

  const tenantId = params.tenantId || (items[0] ? (items[0] as any).tenant_id : null);
  const fxResult = tenantId ? await params.fxRates.resolveRates(tenantId, lookupKeys, { manager }) : { map: new Map<string, FxResolvedRate>(), settings: { reportingCurrency: 'EUR', defaultCapexCurrency: 'EUR', defaultSpendCurrency: 'EUR', allowedCurrencies: null } };
  const fxMap = fxResult.map;
  const versionReportingTotalsById = new Map<string, VersionReportingTotals>();

  const getFx = (version: SpendVersion, currency: string): FxResolvedRate => {
    const key = `${(version as any).fx_rate_set_id || 'live'}:${(version as any).budget_year}:${currency.toUpperCase()}`;
    return fxMap.get(key) || {
      rate: currency.toUpperCase() === fxResult.settings.reportingCurrency ? 1 : 1,
      rateSetId: null,
      fiscalYear: (version as any).budget_year as number,
      reportingCurrency: fxResult.settings.reportingCurrency,
      source: 'identity',
      capturedAt: null,
    };
  };

  for (const version of versions) {
    const totals = versionTotalsById.get(version.id);
    if (!totals) continue;
    const item = itemById.get(version.spend_item_id);
    const currency = ((item as any)?.currency || 'EUR').toString().toUpperCase();
    const fx = getFx(version, currency);
    versionReportingTotalsById.set(version.id, {
      planned: params.fxRates.convertValue(totals.planned, fx.rate),
      actual: params.fxRates.convertValue(totals.actual, fx.rate),
      expected_landing: params.fxRates.convertValue(totals.expected_landing, fx.rate),
      committed: params.fxRates.convertValue(totals.committed, fx.rate),
      currency,
      reporting_currency: fx.reportingCurrency,
      fx_rate: fx.rate,
      fx_source: fx.source,
      fx_rate_set_id: (version as any).fx_rate_set_id ?? null,
      captured_at: fx.capturedAt,
    });
  }

  const versionsForCurrentYear = versions.filter((v) => (v as any).budget_year === currentYear);
  const allocationDataForYear: Map<string, AllocationComputation> = versionsForCurrentYear.length
    ? await allocationCalculator.computeForVersions(versionsForCurrentYear, { manager, suppressErrors: true })
    : new Map<string, AllocationComputation>();

  let companyById: Map<string, Company> | undefined;
  let departmentById: Map<string, Department> | undefined;

  if (includeRecipientDetails && allocationDataForYear.size) {
    const companyIds = new Set<string>();
    const departmentIds = new Set<string>();
    allocationDataForYear.forEach((entry) => {
      for (const share of entry.shares) {
        if (share.company_id) companyIds.add(share.company_id);
        if (share.department_id) departmentIds.add(share.department_id);
      }
    });

    const companies = companyIds.size
      ? await manager.getRepository(Company).find({ where: { id: In(Array.from(companyIds)) as any } as any })
      : [];
    const departments = departmentIds.size
      ? await manager.getRepository(Department).find({ where: { id: In(Array.from(departmentIds)) as any } as any })
      : [];
    companyById = new Map(companies.map((c) => [c.id, c]));
    departmentById = new Map(departments.map((d) => [d.id, d]));
  }

  let latestTaskByItem: Map<string, { id: string; title: string | null; description: string | null; status: string; created_at: Date }> | undefined;
  if (includeLatestTask) {
    const tasks: Array<{ id: string; related_object_id: string; title: string | null; description: string | null; status: string; created_at: Date }> = itemIds.length
      ? await manager.query(
          `SELECT DISTINCT ON (related_object_id) id, related_object_id, title, description, status, created_at
           FROM tasks
           WHERE related_object_type = 'spend_item'
             AND related_object_id = ANY($1)
             AND status = ANY($2)
           ORDER BY related_object_id, created_at DESC`, [itemIds, ACTIVE_TASK_STATUSES])
      : [];
    latestTaskByItem = new Map<string, { id: string; title: string | null; description: string | null; status: string; created_at: Date }>();
    for (const task of tasks) {
      const itemId = task.related_object_id;
      if (!latestTaskByItem.has(itemId)) latestTaskByItem.set(itemId, task);
    }
  }

  const supplierIds = Array.from(new Set(items.map((i: any) => i.supplier_id).filter(Boolean)));
  const accountIds = Array.from(new Set(items.map((i: any) => i.account_id).filter(Boolean)));
  const ownerIds = Array.from(new Set(items.flatMap((i: any) => [i.owner_it_id, i.owner_business_id]).filter(Boolean)));

  const suppliers = supplierIds.length
    ? await manager.getRepository(Supplier).find({ where: { id: In(supplierIds) as any } as any })
    : [];
  const accounts = accountIds.length
    ? await manager.getRepository(Account).find({ where: { id: In(accountIds) as any } as any })
    : [];
  const owners = ownerIds.length
    ? await manager.getRepository(User).find({ where: { id: In(ownerIds) as any } as any })
    : [];

  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const ownerById = new Map(owners.map((u) => [u.id, u]));

  // Paying company lookup
  const payingCompanyIds = Array.from(new Set(items.map((i: any) => i.paying_company_id).filter(Boolean)));
  const payingCompanies = payingCompanyIds.length
    ? await manager.getRepository(Company).find({ where: { id: In(payingCompanyIds) as any } as any })
    : [];
  const payingCompanyById = new Map(payingCompanies.map((c) => [c.id, c]));

  const rows: SpendSummaryRow[] = items.map((item) => {
    const perYear = versionsByItemYear.get(item.id) || new Map<number, SpendVersion>();
    // Mask versions after the item's disabled year: include values through the fiscal
    // year of disabled_at; contribute zero for later years.
    const disabledYear = (item as any)?.disabled_at ? new Date((item as any).disabled_at).getFullYear() : null;
    const versionMinus1Raw = perYear.get(currentYear - 1);
    const versionCurrRaw = perYear.get(currentYear);
    const versionPlus1Raw = perYear.get(currentYear + 1);
    const versionMinus1 = disabledYear != null && (currentYear - 1) > disabledYear ? undefined : versionMinus1Raw;
    const versionCurr = disabledYear != null && currentYear > disabledYear ? undefined : versionCurrRaw;
    const versionPlus1 = disabledYear != null && (currentYear + 1) > disabledYear ? undefined : versionPlus1Raw;

    const dynamicVersions: Record<string, any> = {};
    for (const year of uniqueYears) {
      const vRaw = perYear.get(year);
      const v = disabledYear != null && year > disabledYear ? undefined : vRaw;
      dynamicVersions[`y${year}`] = toTotals(v, versionTotalsById, versionReportingTotalsById);
    }

    const allocationInfo = versionCurr ? allocationDataForYear.get(versionCurr.id) : undefined;
    const resolvedMethod = allocationInfo?.resolvedMethod ?? ((versionCurr as any)?.allocation_method as string | undefined);
    const methodLabel = formatAllocationMethodLabel(resolvedMethod);
    const allocationWarning = allocationInfo?.error ?? null;

    let mainRecipient: SpendSummaryRow['main_recipient'] = null;
    if (includeRecipientDetails && allocationInfo?.shares?.length && companyById) {
      const shares = allocationInfo.shares;
      const topShare = shares.reduce((acc, share) => {
        if (!acc) return share;
        return share.allocation_pct > acc.allocation_pct ? share : acc;
      }, shares[0]);
      if (topShare) {
        const company = topShare.company_id ? companyById.get(topShare.company_id) : undefined;
        const department = topShare.department_id && departmentById ? departmentById.get(topShare.department_id) : undefined;
        const pct = Number(topShare.allocation_pct || 0);
        if (company) {
          mainRecipient = department
            ? {
                company_id: topShare.company_id,
                department_id: topShare.department_id,
                pct,
                label: `${(company as any).name} - ${(department as any).name} (${pct.toFixed(2)}%)`,
              }
            : {
                company_id: topShare.company_id,
                department_id: null,
                pct,
                label: `${(company as any).name} (${pct.toFixed(2)}%)`,
              };
        }
      }
    }

    const spreadModeForYear = versionCurr ? ((versionCurr as any).input_grain === 'annual' ? 'flat' : 'manual') : null;

    const supplier = (item as any).supplier_id ? supplierById.get((item as any).supplier_id) : undefined;
    const account = (item as any).account_id ? accountById.get((item as any).account_id) : undefined;
    const analyticsCategoryId = (item as any).analytics_category_id as string | null;
    const analyticsCategory = analyticsCategoryId ? categoryById.get(analyticsCategoryId) : undefined;

    const payingCompanyId = (item as any).paying_company_id ?? null;
    const payingCompany = payingCompanyId ? payingCompanyById.get(payingCompanyId) : undefined;

    // Detect obsolete account — account's CoA differs from paying company's CoA
    let accountWarning: string | null = null;
    if (account && payingCompany) {
      const accCoa = (account as any).coa_id || null;
      const companyCoa = (payingCompany as any).coa_id || null;
      if (accCoa && companyCoa && accCoa !== companyCoa) {
        accountWarning = 'coa_mismatch';
      }
    }

    const row: SpendSummaryRow = Object.assign({}, item, {
      analytics_category_id: analyticsCategoryId ?? null,
      analytics_category_name: analyticsCategory ? (analyticsCategory as any).name : null,
      latest_contract_id: latestContractByItem.get(item.id)?.id || null,
      latest_contract_name: latestContractByItem.get(item.id)?.name || '',
      supplier: supplier ? { id: supplier.id, name: (supplier as any).name } : undefined,
      supplier_name: supplier ? (supplier as any).name : undefined,
      account: account ? { id: account.id, account_number: (account as any).account_number, account_name: (account as any).account_name } : undefined,
      account_number: account ? (account as any).account_number : undefined,
      account_name: account ? (account as any).account_name : undefined,
      account_display: account ? `${(account as any).account_number} - ${(account as any).account_name}` : undefined,
      owner_it_name: displayName(ownerById.get((item as any).owner_it_id) || null),
      owner_business_name: displayName(ownerById.get((item as any).owner_business_id) || null),
      paying_company_id: payingCompanyId,
      paying_company_name: payingCompany ? ((payingCompany as any).name ?? null) : null,
      main_recipient: mainRecipient,
      versions: {
        yMinus1: toTotals(versionMinus1, versionTotalsById, versionReportingTotalsById),
        y: toTotals(versionCurr, versionTotalsById, versionReportingTotalsById),
        yPlus1: toTotals(versionPlus1, versionTotalsById, versionReportingTotalsById),
        ...dynamicVersions,
      },
      latest_task: includeLatestTask ? latestTaskByItem?.get(item.id) || null : undefined,
      spread_mode_for_y: spreadModeForYear,
      allocation_method_label: methodLabel,
      allocation_warning: allocationWarning,
      account_warning: accountWarning,
    });
    return row;
  });

  return {
    rows,
    versionsByItemYear,
    versionTotalsById,
    versionReportingTotalsById,
  };
}

type VersionMetricKey = 'budget' | 'follow_up' | 'landing' | 'revision';

function resolveVersionField(field: string): { slotKey: string; metric: VersionMetricKey } | null {
  const staticMap: Record<string, { slotKey: string; metric: VersionMetricKey }> = {
    yMinus1Budget: { slotKey: 'yMinus1', metric: 'budget' },
    yMinus1Landing: { slotKey: 'yMinus1', metric: 'landing' },
    yBudget: { slotKey: 'y', metric: 'budget' },
    yRevision: { slotKey: 'y', metric: 'revision' },
    yFollowUp: { slotKey: 'y', metric: 'follow_up' },
    yLanding: { slotKey: 'y', metric: 'landing' },
    yPlus1Budget: { slotKey: 'yPlus1', metric: 'budget' },
    yPlus1Revision: { slotKey: 'yPlus1', metric: 'revision' },
    yPlus1Landing: { slotKey: 'yPlus1', metric: 'landing' },
    yPlus2Budget: { slotKey: 'yPlus2', metric: 'budget' },
    yPlus2Landing: { slotKey: 'yPlus2', metric: 'landing' },
  };
  if (staticMap[field]) {
    return staticMap[field];
  }
  const dynamicMatch = field.match(/^y(\d{4})(Budget|Revision|FollowUp|Landing)$/);
  if (dynamicMatch) {
    const [, year, metricPart] = dynamicMatch;
    const metricMap: Record<string, VersionMetricKey> = {
      Budget: 'budget',
      Revision: 'revision',
      FollowUp: 'follow_up',
      Landing: 'landing',
    };
    const metric = metricMap[metricPart];
    if (metric) {
      return { slotKey: `y${year}`, metric };
    }
  }
  return null;
}

function getVersionMetricValue(row: SpendSummaryRow, slotKey: string, metric: VersionMetricKey): number {
  const versions = (row as any)?.versions as Record<string, any> | undefined;
  if (!versions) return 0;
  const slot = versions[slotKey];
  if (!slot) return 0;
  const reporting = slot.reporting;
  if (reporting && typeof reporting[metric] === 'number') {
    return reporting[metric] ?? 0;
  }
  const totals = slot.totals;
  if (totals && typeof totals[metric] === 'number') {
    return totals[metric] ?? 0;
  }
  return 0;
}

export function getSpendSummaryFieldValue(row: SpendSummaryRow, field: string): any {
  const resolved = resolveVersionField(field);
  if (resolved) {
    return getVersionMetricValue(row, resolved.slotKey, resolved.metric);
  }
  switch (field) {
    case 'supplier_name':
      return row?.supplier_name ?? row?.supplier?.name ?? '';
    case 'paying_company_name':
      return (row as any)?.paying_company_name ?? '';
    case 'account_display':
      return row?.account_display ?? '';
    case 'account_name':
      return row?.account_name ?? '';
    case 'account_number':
      return row?.account_number ?? null;
    case 'owner_it_name':
      return row?.owner_it_name ?? '';
    case 'owner_business_name':
      return row?.owner_business_name ?? '';
    case 'contract_name':
      return row?.latest_contract_name ?? '';
    case 'allocation_label':
    case 'allocation_method_label':
      return row?.allocation_method_label ?? '';
    case 'latest_task_text':
      return row?.latest_task?.title ?? '';
    case 'account_warning':
      return row?.account_warning ?? '';
    case 'yMinus1Landing':
      return getVersionMetricValue(row, 'yMinus1', 'landing');
    case 'yBudget':
      return getVersionMetricValue(row, 'y', 'budget');
    case 'yLanding':
      return getVersionMetricValue(row, 'y', 'landing');
    case 'yPlus1Budget':
      return getVersionMetricValue(row, 'yPlus1', 'budget');
    default:
      return (row as any)?.[field];
  }
}

function valueToString(val: any): string {
  if (val == null) return '';
  return String(val).toLowerCase();
}

export function applyAgFiltersInMemory(rows: SpendSummaryRow[], filterModel: any): SpendSummaryRow[] {
  if (!filterModel || typeof filterModel !== 'object') return rows;
  const entries = Object.entries(filterModel);
  if (!entries.length) return rows;

  return rows.filter((row) => {
    for (const [field, rawModel] of entries) {
      let model: any = rawModel;
      if (model && model.operator && Array.isArray(model.conditions) && model.conditions.length > 0) {
        model = model.conditions[0];
      }
      const type = (model?.type ?? model?.filterType ?? 'contains') as string;
      const rowVal = getSpendSummaryFieldValue(row, field);

      if (type === 'set' && Array.isArray(model?.values)) {
        const rawValues = model.values;
        if (rawValues.length === 0) return false;
        const nonNullValues = rawValues.filter((v: any) => v !== null && v !== undefined && v !== '');
        const hasNull = rawValues.some((v: any) => v === null || v === undefined || v === '');
        const rowIsBlank = rowVal == null || rowVal === '';
        if (hasNull && rowIsBlank) continue;
        if (nonNullValues.length === 0) return false;
        const rowStr = String(rowVal ?? '');
        if (!nonNullValues.map((v: any) => String(v)).includes(rowStr)) return false;
        continue;
      }

      if (type === 'blank') {
        if (!(rowVal == null || String(rowVal) === '')) return false;
        continue;
      }

      if (type === 'notBlank') {
        if (rowVal == null || String(rowVal) === '') return false;
        continue;
      }

      const valRaw = model?.filter ?? model?.value ?? (Array.isArray(model?.values) ? model.values[0] : undefined);
      if (valRaw == null || valRaw === '') continue;
      const needle = String(valRaw);

      const bothNumeric = typeof rowVal === 'number' && !isNaN(Number(needle));

      switch (type) {
        case 'equals':
          if (bothNumeric) {
            if (Number(rowVal) !== Number(needle)) return false;
          } else if (valueToString(rowVal) !== needle.toLowerCase()) return false;
          break;
        case 'notEqual':
          if (bothNumeric) {
            if (Number(rowVal) === Number(needle)) return false;
          } else if (valueToString(rowVal) === needle.toLowerCase()) return false;
          break;
        case 'startsWith':
          if (!valueToString(rowVal).startsWith(needle.toLowerCase())) return false;
          break;
        case 'endsWith':
          if (!valueToString(rowVal).endsWith(needle.toLowerCase())) return false;
          break;
        case 'notContains':
          if (valueToString(rowVal).includes(needle.toLowerCase())) return false;
          break;
        case 'contains':
        default:
          if (!valueToString(rowVal).includes(needle.toLowerCase())) return false;
          break;
      }
    }
    return true;
  });
}

export function quickSearchSummaryRows(rows: SpendSummaryRow[], q: string): SpendSummaryRow[] {
  if (!q) return rows;
  const needle = String(q).toLowerCase();
  const take = (value: any) => (value == null ? '' : String(value)).toLowerCase();
  return rows.filter((row) => {
    const bag: string[] = [];
    bag.push(take((row as any).product_name));
    bag.push(take((row as any).description));
    bag.push(take(row.supplier_name));
    bag.push(take((row as any).paying_company_name));
    bag.push(take(row.account_display));
    bag.push(take(row.account_name));
    bag.push(take(row.account_number));
    bag.push(take(row.latest_contract_name));
    bag.push(take(row.allocation_method_label));
    bag.push(take((row as any).currency));
    bag.push(take((row as any).status));
    bag.push(take((row as any).notes));
    return bag.some((entry) => entry.includes(needle));
  });
}

export function sortSummaryRows(
  rows: SpendSummaryRow[],
  field: string,
  direction: 'ASC' | 'DESC'
): SpendSummaryRow[] {
  const dir = direction === 'ASC' ? 1 : -1;
  const getValue = (row: SpendSummaryRow) => {
    const resolved = resolveVersionField(field);
    if (resolved) {
      return getVersionMetricValue(row, resolved.slotKey, resolved.metric);
    }
    switch (field) {
      case 'supplier_name':
      case 'allocation_label':
      case 'allocation_method_label':
      case 'account_display':
      case 'account_name':
      case 'owner_it_name':
      case 'owner_business_name':
      case 'contract_name':
      case 'latest_task_text':
        return getSpendSummaryFieldValue(row, field);
      case 'account_number':
        return getSpendSummaryFieldValue(row, field);
      default:
        return (row as any)?.[field];
    }
  };

  rows.sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    const aUndefined = av == null;
    const bUndefined = bv == null;
    if (aUndefined && bUndefined) return 0;
    if (aUndefined) return 1 * dir;
    if (bUndefined) return -1 * dir;

    if (typeof av === 'number' && typeof bv === 'number') {
      return av === bv ? 0 : (av < bv ? -1 : 1) * dir;
    }

    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    return as === bs ? 0 : (as < bs ? -1 : 1) * dir;
  });

  return rows;
}
