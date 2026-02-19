import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, ILike, In, Raw, Repository } from 'typeorm';
import { CapexItem } from './capex-item.entity';
import { CapexVersion } from './capex-version.entity';
import { CapexAmount } from './capex-amount.entity';
import { CapexAllocationCalculatorService, CapexAllocationComputation } from './capex-allocation-calculator.service';
import { Company } from '../companies/company.entity';
import { Account } from '../accounts/account.entity';
import { parsePagination, buildWhereFromAgFilters } from '../common/pagination';
import { AuditService } from '../audit/audit.service';
import { spreadAnnualToMonths } from '../spend/spread.util';
import { format } from '@fast-csv/format';
import { parseString } from '@fast-csv/parse';
import * as fs from 'fs';
import * as path from 'path';
import { CapexLink } from './capex-link.entity';
import { CapexAttachment } from './capex-attachment.entity';
import { decodeCsvBufferUtf8OrThrow } from '../common/encoding';
import { addCents, formatCents, toCents } from '../common/amount';
import { FreezeColumn, FreezeService } from '../freeze/freeze.service';
import { formatAllocationMethodLabel } from '../spend/allocation-utils';
import { FxRateService, FxLookupKey, FxResolvedRate } from '../currency/fx-rate.service';
import { resolveLifecycleState, StatusState } from '../common/status';
import { extractStatusFilterFromAgModel } from '../common/status-filter';
import { normalizeAgFilterModel } from '../common/ag-grid-filtering';
import { CapexItemUpsertDto } from './dto/capex-item.dto';
import { StorageService } from '../common/storage/storage.service';
import { randomUUID } from 'crypto';
import { CapexItemContactsService } from './capex-item-contacts.service';
import { PortfolioProjectCapex } from '../portfolio/portfolio-project-capex.entity';
import { PortfolioProject } from '../portfolio/portfolio-project.entity';
import { validateUploadedFile } from '../common/upload-validation';
import { fixMulterFilename } from '../common/upload';

const activeDisabledAtCondition = () => Raw((alias) => `${alias} IS NULL OR ${alias} > NOW()`);
const inactiveDisabledAtCondition = () => Raw((alias) => `${alias} IS NOT NULL AND ${alias} <= NOW()`);
const activeSinceCondition = (date: Date) =>
  Raw((alias) => `${alias} IS NULL OR ${alias} >= :period_start`, { period_start: date });

function getCapexSummaryFieldValue(row: any, field: string): any {
  if (!row) return null;
  if (field === 'company_name') return row.company_name ?? null;
  return (row as any)[field];
}

function valueToString(val: any): string {
  if (val == null) return '';
  return String(val).toLowerCase();
}

function applyCapexFiltersInMemory(rows: any[], filterModel: any): any[] {
  if (!filterModel || typeof filterModel !== 'object') return rows;
  const entries = Object.entries(filterModel);
  if (!entries.length) return rows;

  return rows.filter((row) => {
    for (const [field, rawModel] of entries) {
      const model = normalizeAgFilterModel(rawModel);
      if (!model || typeof model !== 'object') continue;
      const type = String(model.type ?? model.filterType ?? 'contains');
      const rowVal = getCapexSummaryFieldValue(row, field);

      if (type === 'set' && Array.isArray(model.values)) {
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

      const valRaw = model.filter ?? model.value ?? (Array.isArray(model.values) ? model.values[0] : undefined);
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

@Injectable()
export class CapexItemsService {
  constructor(
    @InjectRepository(CapexItem) private readonly repo: Repository<CapexItem>,
    @InjectRepository(CapexVersion) private readonly versions: Repository<CapexVersion>,
    @InjectRepository(CapexAmount) private readonly amounts: Repository<CapexAmount>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    private readonly allocationCalculator: CapexAllocationCalculatorService,
    private readonly audit: AuditService,
    private readonly freeze: FreezeService,
    private readonly fxRates: FxRateService,
    private readonly storage: StorageService,
    private readonly itemContacts: CapexItemContactsService,
  ) {}
  private readonly logger = new Logger(CapexItemsService.name);

  private mapFrontendColumnToFreeze(column: 'budget' | 'revision' | 'follow_up' | 'landing'): FreezeColumn {
    switch (column) {
      case 'budget':
        return 'budget';
      case 'revision':
        return 'revision';
      case 'follow_up':
        return 'actual';
      case 'landing':
        return 'landing';
      default:
        throw new Error(`Unsupported CAPEX column '${column}'`);
    }
  }

  private mapTotalsKeyToFreeze(key: string | undefined): FreezeColumn | null {
    switch (key) {
      case 'planned':
        return 'budget';
      case 'committed':
        return 'revision';
      case 'actual':
        return 'actual';
      case 'expected_landing':
        return 'landing';
      default:
        return null;
    }
  }

  private async ensureCapexColumnsEditable(year: number, columns: Iterable<FreezeColumn>, mg: EntityManager) {
    const seen = new Set<FreezeColumn>();
    for (const column of columns) {
      if (seen.has(column)) continue;
      seen.add(column);
      await this.freeze.assertNotFrozen({ scope: 'capex', column, year }, { manager: mg });
    }
  }

  async list(query: any, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(CapexItem);
    const { page, limit, skip, sort, status, q, filters } = parsePagination(query);
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const filtersToApply = sanitizedFilters ?? filters;
    const allowedFields = [
      'id', 'description', 'ppe_type', 'investment_type', 'priority', 'currency', 'effective_start', 'effective_end', 'status', 'notes', 'created_at', 'updated_at',
    ];
    const where: any = {};
    if (filtersToApply && Object.keys(filtersToApply).length > 0) {
      Object.assign(where, buildWhereFromAgFilters(filtersToApply, allowedFields));
    }
    // Keep list behavior simple: explicit enabled or disabled; default to enabled gating.
    const lifecycleStatus = status ?? statusFromAg ?? StatusState.ENABLED;
    const includeDisabled =
      String(query.includeDisabled ?? '').toLowerCase() === '1' ||
      String(query.includeDisabled ?? '').toLowerCase() === 'true';
    if (!includeDisabled) {
      where.disabled_at =
        lifecycleStatus === StatusState.DISABLED ? inactiveDisabledAtCondition() : activeDisabledAtCondition();
    }
    if (q) where.description = ILike(`%${q}%`);
    const safeSortField = allowedFields.includes(sort.field) ? sort.field : 'created_at';
    const [items, total] = await repo.findAndCount({ where, order: { [safeSortField]: sort.direction as any }, skip, take: limit });
    return { items, total, page, limit };
  }

  async get(id: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(CapexItem);
    const found = await repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('CAPEX item not found');
    return found;
  }

  async create(body: CapexItemUpsertDto, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    // Map legacy field if present
    const paying_company_id = body.paying_company_id ?? body.company_id ?? null;
    this.logger.log(`[create] incoming company=${paying_company_id} account=${body.account_id ?? null}`);
    if (body.company_id && !body.paying_company_id) {
      console.warn('[capex] company_id is deprecated; use paying_company_id');
    }
    // Require paying company if provided (soft requirement -> enforce)
    if (!paying_company_id) {
      throw new BadRequestException('paying_company_id is required');
    }
    // Validate company if provided
    if (paying_company_id) {
      const company = await mg.getRepository(Company).findOne({ where: { id: paying_company_id } });
      if (!company) throw new BadRequestException('Paying company not found');
      if (body.account_id) {
        const account = await mg.getRepository(Account).findOne({ where: { id: body.account_id } });
        if (!account) throw new BadRequestException('Account not found');
        if ((account as any).coa_id && company.coa_id && (account as any).coa_id !== company.coa_id) {
          throw new BadRequestException('Selected account does not belong to the paying company\'s Chart of Accounts');
        }
      }
    }
    
    const repo = mg.getRepository(CapexItem);
    const { status: statusInput, disabled_at, ...rest } = body ?? {};
    const lifecycle = resolveLifecycleState({ nextStatus: statusInput, nextDisabledAt: disabled_at });
    const entity = repo.create({
      ...rest,
      account_id: body.account_id ?? null,
      paying_company_id,
      status: lifecycle.status,
      disabled_at: lifecycle.disabled_at,
    });
    const saved = await repo.save(entity as any) as CapexAttachment as any;
    // Defensive: ensure account_id persisted even if ORM payload missed it
    if ('account_id' in body) {
      try {
        await mg.query(`UPDATE capex_items SET account_id = $1 WHERE id = $2`, [body.account_id ?? null, saved.id]);
        (saved as any).account_id = body.account_id ?? null;
      } catch (e) {
        // no-op; rely on ORM value if direct SQL fails
      }
    }
    const persisted = await repo.findOne({ where: { id: saved.id } });
    this.logger.log(`[create] persisted id=${saved.id} company=${(persisted as any)?.paying_company_id ?? null} account=${(persisted as any)?.account_id ?? null}`);
    await this.audit.log({ table: 'capex_items', recordId: saved.id, action: 'create', before: null, after: persisted ?? saved, userId }, { manager: mg });
    return persisted ?? saved;
  }

  async update(id: string, body: CapexItemUpsertDto, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    // Map legacy field if present
    const existing = await this.get(id, { manager: mg });
    const nextPayingCompanyId = body.paying_company_id ?? body.company_id ?? ((existing as any).paying_company_id ?? null);
    if (body.company_id && !body.paying_company_id) {
      console.warn('[capex] company_id is deprecated; use paying_company_id');
    }
    if (!nextPayingCompanyId) {
      throw new BadRequestException('paying_company_id is required');
    }
    // Validate company if provided
    if (nextPayingCompanyId) {
      const company = await mg.getRepository(Company).findOne({ where: { id: nextPayingCompanyId } });
      if (!company) throw new BadRequestException('Paying company not found');
      if (body.account_id) {
        const account = await mg.getRepository(Account).findOne({ where: { id: body.account_id } });
        if (!account) throw new BadRequestException('Account not found');
        if ((account as any).coa_id && company.coa_id && (account as any).coa_id !== company.coa_id) {
          throw new BadRequestException('Selected account does not belong to the paying company\'s Chart of Accounts');
        }
      }
    }

    const repo = mg.getRepository(CapexItem);
    const before = { ...existing };
    const { status: statusInput, disabled_at, ...rest } = body ?? {};
    Object.assign(existing, rest);
    if (body.account_id !== undefined) {
      (existing as any).account_id = body.account_id;
    }
    (existing as any).paying_company_id = nextPayingCompanyId;
    const lifecycle = resolveLifecycleState({
      currentDisabledAt: before.disabled_at,
      nextStatus: statusInput,
      nextDisabledAt: disabled_at,
    });
    existing.status = lifecycle.status;
    existing.disabled_at = lifecycle.disabled_at;
    this.logger.log(`[update] id=${id} incoming company=${nextPayingCompanyId} account=${body.account_id ?? null}`);
    const saved = await repo.save(existing);
    if ('account_id' in body) {
      try {
        await mg.query(`UPDATE capex_items SET account_id = $1 WHERE id = $2`, [body.account_id ?? null, saved.id]);
        (saved as any).account_id = body.account_id ?? null;
      } catch {}
    }
    if ('project_id' in body) {
      try {
        await mg.query(`UPDATE capex_items SET project_id = $1 WHERE id = $2`, [body.project_id ?? null, saved.id]);
        (saved as any).project_id = body.project_id ?? null;
      } catch {}
    }
    const persisted = await repo.findOne({ where: { id } });
    this.logger.log(`[update] persisted id=${id} company=${(persisted as any)?.paying_company_id ?? null} account=${(persisted as any)?.account_id ?? null}`);
    await this.audit.log({ table: 'capex_items', recordId: saved.id, action: 'update', before, after: persisted ?? saved, userId }, { manager: mg });

    // Detect supplier change for contact sync
    const oldSupplierId = (before as any).supplier_id ?? null;
    const newSupplierId = (persisted as any)?.supplier_id ?? (saved as any).supplier_id ?? null;
    if (oldSupplierId !== newSupplierId) {
      await this.itemContacts.syncFromSupplier(id, newSupplierId, userId ?? null, { manager: mg });
    }

    return persisted ?? saved;
  }

  // CAPEX summary endpoint: derived yearly totals and spread mode
  async summary(query: any, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const now = new Date();
    const Y = now.getFullYear();
    const years = [Y - 1, Y, Y + 1];

    const { page, limit, skip, sort, status, q, filters } = parsePagination(query);
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const filtersToApply = sanitizedFilters ?? filters;
    const allowedDbFields = [
      'id', 'description', 'ppe_type', 'investment_type', 'priority', 'currency', 'effective_start', 'effective_end', 'status', 'notes', 'created_at', 'updated_at',
    ];
    const where: any = {};
    if (filtersToApply && Object.keys(filtersToApply).length > 0) {
      Object.assign(where, buildWhereFromAgFilters(filtersToApply, allowedDbFields));
    }
    // Period-aware gating: if lifecycle status is neutral, include items enabled
    // since the earliest year in scope, mirroring OPEX summary behavior.
    const lifecycleStatus = status ?? statusFromAg ?? null;
    const minYear = Math.min(...years);
    const periodStart = new Date(`${String(minYear).padStart(4, '0')}-01-01T00:00:00.000Z`);
    const includeDisabled =
      String(query.includeDisabled ?? '').toLowerCase() === '1' ||
      String(query.includeDisabled ?? '').toLowerCase() === 'true';
    if (!includeDisabled) {
      if (lifecycleStatus === StatusState.DISABLED) {
        where.disabled_at = inactiveDisabledAtCondition();
      } else if (lifecycleStatus === StatusState.ENABLED) {
        where.disabled_at = activeDisabledAtCondition();
      } else {
        where.disabled_at = activeSinceCondition(periodStart);
      }
    }

    // Fetch base items (limit to 10k to avoid runaway)
    const baseItems = await mg.getRepository(CapexItem).find({
      where,
      order: { created_at: 'DESC' as any },
      take: 10000,
    });
    const companyIds = baseItems.map((i: any) => i.paying_company_id).filter(Boolean);
    const companyRecords =
      companyIds.length > 0
        ? await mg.getRepository(Company).find({ where: { id: In(companyIds) as any } as any })
        : [];
    const companyNameById = new Map(companyRecords.map((c) => [c.id, c.name ?? null]));
    const items = baseItems.map((item: any) => ({
      ...item,
      company_name: item.paying_company_id ? companyNameById.get(item.paying_company_id) ?? null : null,
    }));
    const total = items.length;
    const derivedFilters = Object.fromEntries(
      Object.entries(filtersToApply || {}).filter(([key]) => !allowedDbFields.includes(key)),
    );
    const hasDerivedFilters = Object.keys(derivedFilters).length > 0;

    const itemIds = items.map((i) => i.id);
    // Latest open/in_progress task per CAPEX item (match OPEX behavior)
    const latestTasks: Array<{ id: string; related_object_id: string; title: string | null; description: string | null; status: string; created_at: Date }> = itemIds.length
      ? await mg.query(
          `SELECT DISTINCT ON (related_object_id) id, related_object_id, title, description, status, created_at
           FROM tasks
           WHERE related_object_type = 'capex_item'
             AND related_object_id = ANY($1)
             AND status = ANY($2)
           ORDER BY related_object_id, created_at DESC`,
          [itemIds, ['open', 'in_progress']],
        )
      : [];
    const latestTaskByItem = new Map<string, { id: string; title: string | null; description: string | null; status: string; created_at: Date }>();
    for (const t of latestTasks) {
      if (!latestTaskByItem.has(t.related_object_id)) latestTaskByItem.set(t.related_object_id, t);
    }
    const versions = itemIds.length > 0
      ? await (opts?.manager ?? this.repo.manager).getRepository(CapexVersion).find({ where: { capex_item_id: In(itemIds) as any } as any })
      : [];

    const versionsById = new Map(versions.map((v) => [v.id, v]));
    const versionsByItemYear = new Map<string, Map<number, CapexVersion>>();
    for (const v of versions) {
      const y = (v as any).budget_year as number;
      if (!years.includes(y)) continue;
      let m = versionsByItemYear.get(v.capex_item_id);
      if (!m) { m = new Map<number, CapexVersion>(); versionsByItemYear.set(v.capex_item_id, m); }
      m.set(y, v);
    }

    const versionIds = versions.map((v) => v.id);
    let allAmounts: CapexAmount[] = [];
    if (versionIds.length > 0) {
      allAmounts = await (opts?.manager ?? this.repo.manager).getRepository(CapexAmount).find({ where: { version_id: In(versionIds) as any } as any });
    }
    const amountsByVersion: Record<string, { planned: bigint; actual: bigint; expected_landing: bigint; committed: bigint }> = {};
    for (const a of allAmounts) {
      const v = versionsById.get((a as any).version_id as string);
      if (!v) continue;
      const periodYear = new Date((a as any).period as string).getFullYear();
      const vYear = (v as any).budget_year as number;
      if (periodYear !== vYear) continue;
      const key = (a as any).version_id as string;
      const acc = (amountsByVersion[key] ||= { planned: 0n, actual: 0n, expected_landing: 0n, committed: 0n });
      acc.planned = addCents(acc.planned, (a as any).planned);
      acc.actual = addCents(acc.actual, (a as any).actual);
      acc.expected_landing = addCents(acc.expected_landing, (a as any).expected_landing);
      acc.committed = addCents(acc.committed, (a as any).committed);
    }

    const reportingTotalsByVersion = new Map<string, {
      budget: number;
      follow_up: number;
      landing: number;
      revision: number;
      currency: string;
      reporting_currency: string;
      fx_rate: number;
      fx_source: FxResolvedRate['source'];
      fx_rate_set_id: string | null;
    }>();

    const itemById = new Map(items.map((it) => [it.id, it]));
    const lookupKeys: FxLookupKey[] = [];
    for (const version of versions) {
      const item = itemById.get(version.capex_item_id);
      if (!item) continue;
      const sourceCurrency = (item as any).currency || 'EUR';
      lookupKeys.push({ key: '', rateSetId: (version as any).fx_rate_set_id ?? null, fiscalYear: (version as any).budget_year as number, sourceCurrency });
    }

    const tenantId = items[0] ? (items[0] as any).tenant_id ?? null : null;
    const fxResult = tenantId
      ? await this.fxRates.resolveRates(tenantId, lookupKeys, { manager: mg })
      : { map: new Map<string, FxResolvedRate>(), settings: { reportingCurrency: 'EUR' } as any };
    const fxMap = fxResult.map;

    const getFx = (version: CapexVersion, currency: string): FxResolvedRate => {
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
      const sums = amountsByVersion[version.id];
      if (!sums) continue;
      const item = itemById.get(version.capex_item_id);
      const currency = ((item as any)?.currency || 'EUR').toString().toUpperCase();
      const fx = getFx(version, currency);
      const budget = Number(formatCents(sums.planned));
      const followUp = Number(formatCents(sums.actual));
      const landing = Number(formatCents(sums.expected_landing));
      const revision = Number(formatCents(sums.committed));
      reportingTotalsByVersion.set(version.id, {
        budget: this.fxRates.convertValue(budget, fx.rate),
        follow_up: this.fxRates.convertValue(followUp, fx.rate),
        landing: this.fxRates.convertValue(landing, fx.rate),
        revision: this.fxRates.convertValue(revision, fx.rate),
        currency,
        reporting_currency: fx.reportingCurrency,
        fx_rate: fx.rate,
        fx_source: fx.source,
        fx_rate_set_id: (version as any).fx_rate_set_id ?? null,
      });
    }

    function toTotals(version?: CapexVersion) {
      if (!version) {
        return { year: undefined, totals: { budget: 0, follow_up: 0, landing: 0, revision: 0 }, version_id: undefined, reporting: undefined };
      }
      const sum = amountsByVersion[version.id] || { planned: 0n, actual: 0n, expected_landing: 0n, committed: 0n };
      const reporting = reportingTotalsByVersion.get(version.id) || null;
      return {
        year: (version as any).budget_year as number,
        totals: {
          budget: Number(formatCents(sum.planned)),
          follow_up: Number(formatCents(sum.actual)),
          landing: Number(formatCents(sum.expected_landing)),
          revision: Number(formatCents(sum.committed)),
        },
        version_id: (version as any).id,
        reporting: reporting ? { ...reporting } : undefined,
      };
    }

    const allocationDataByYear = new Map<number, Map<string, CapexAllocationComputation>>();
    for (const targetYear of [Y, Y + 1]) {
      const versionsForYear = versions.filter((v) => (v as any).budget_year === targetYear);
      if (!versionsForYear.length) continue;
      const computations = await this.allocationCalculator.computeForVersions(versionsForYear, { manager: mg, suppressErrors: true });
      allocationDataByYear.set(targetYear, computations);
    }

    const result = items.map((it) => {
      const perYear = versionsByItemYear.get(it.id) || new Map<number, CapexVersion>();
      const vMinus1 = perYear.get(Y - 1);
      const vCurr = perYear.get(Y);
      const vPlus1 = perYear.get(Y + 1);
      const spread_mode_for_y = vCurr ? (vCurr.input_grain === 'annual' ? 'flat' : 'manual') : null;
      const allocationForY = vCurr ? allocationDataByYear.get(Y)?.get(vCurr.id) : undefined;
      const allocationForYPlus1 = vPlus1 ? allocationDataByYear.get(Y + 1)?.get(vPlus1.id) : undefined;
      const methodSource = allocationForY?.resolvedMethod ?? ((vCurr as any)?.allocation_method ?? null);
      const allocationMethodLabel = formatAllocationMethodLabel(methodSource);
      const allocationWarning = allocationForY?.error ?? null;
      const nextMethodSource = allocationForYPlus1?.resolvedMethod ?? ((vPlus1 as any)?.allocation_method ?? null);
      const nextAllocationMethodLabel = formatAllocationMethodLabel(nextMethodSource);
      return {
        ...it,
        latest_task: latestTaskByItem.get(it.id) || null,
        versions: {
          yMinus1: toTotals(vMinus1),
          y: toTotals(vCurr),
          yPlus1: toTotals(vPlus1),
        },
        spread_mode_for_y,
        allocation_method_label: allocationMethodLabel,
        allocation_warning: allocationWarning,
        next_year_allocation_method_label: nextAllocationMethodLabel,
      } as any;
    });

    let data: any[] = result;
    if (hasDerivedFilters) {
      data = applyCapexFiltersInMemory(data, derivedFilters);
    }

    // Optional in-memory quick search
    if (q) {
      const needle = String(q).toLowerCase();
      const take = (v: any) => (v == null ? '' : String(v)).toLowerCase();
      const matches = (row: any): boolean => {
        const bag: string[] = [];
        bag.push(take(row.description));
        bag.push(take(row.notes));
        bag.push(take(row.ppe_type));
        bag.push(take(row.investment_type));
        bag.push(take(row.priority));
        bag.push(take(row.currency));
        bag.push(take(row.status));
        return bag.some((s) => s.includes(needle));
      };
      data = data.filter(matches);
    }

    const sortField = sort.field;
    const dir = sort.direction === 'ASC' ? 1 : -1;
    const versionMetric = (row: any, slotKey: string, metric: 'budget' | 'revision' | 'follow_up' | 'landing'): number => {
      const slot = row?.versions?.[slotKey];
      if (!slot) return 0;
      const reporting = slot?.reporting;
      if (reporting && typeof reporting[metric] === 'number') {
        return reporting[metric] ?? 0;
      }
      const totals = slot?.totals;
      if (totals && typeof totals[metric] === 'number') {
        return totals[metric] ?? 0;
      }
      return 0;
    };
    const get = (row: any): any => {
      switch (sortField) {
        case 'yMinus1Landing': return versionMetric(row, 'yMinus1', 'landing');
        case 'yBudget': return versionMetric(row, 'y', 'budget');
        case 'yRevision': return versionMetric(row, 'y', 'revision');
        case 'yFollowUp': return versionMetric(row, 'y', 'follow_up');
        case 'yLanding': return versionMetric(row, 'y', 'landing');
        case 'yPlus1Budget': return versionMetric(row, 'yPlus1', 'budget');
        case 'yPlus1Landing': return versionMetric(row, 'yPlus1', 'landing');
        default: return row?.[sortField];
      }
    };
    data.sort((a: any, b: any) => {
      const av = get(a); const bv = get(b);
      const aU = av == null; const bU = bv == null;
      if (aU && bU) return 0; if (aU) return 1 * dir; if (bU) return -1 * dir;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    const start = skip;
    const end = Math.min(skip + limit, data.length);
    const effectiveTotal = (q || hasDerivedFilters) ? data.length : total;
    return { items: data.slice(start, end), total: effectiveTotal, page, limit };
  }

  async summaryFilterValues(query: any, opts?: { manager?: EntityManager }): Promise<Record<string, Array<string | null>>> {
    const mg = opts?.manager ?? this.repo.manager;
    const rawFields = typeof query.fields === 'string'
      ? query.fields.split(',').map((f: string) => f.trim()).filter(Boolean)
      : [];
    const allowedFields = new Set(['company_name', 'ppe_type', 'investment_type', 'priority', 'currency']);
    const fields = rawFields.filter((field) => allowedFields.has(field));
    if (fields.length === 0) return {};

    const now = new Date();
    const Y = now.getFullYear();
    const years = [Y - 1, Y, Y + 1];
    const { status, q, filters } = parsePagination(query);
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const filtersToApply = sanitizedFilters ?? filters ?? {};
    const allowedDbFields = [
      'id', 'description', 'ppe_type', 'investment_type', 'priority', 'currency', 'effective_start', 'effective_end', 'status', 'notes', 'created_at', 'updated_at',
    ];

    const includeDisabled =
      String(query.includeDisabled ?? '').toLowerCase() === '1' ||
      String(query.includeDisabled ?? '').toLowerCase() === 'true';
    const lifecycleStatus = status ?? statusFromAg ?? null;
    const minYear = Math.min(...years);
    const periodStart = new Date(`${String(minYear).padStart(4, '0')}-01-01T00:00:00.000Z`);

    const loadRows = async (fieldFilters: any) => {
      const where: Record<string, any> = {};
      if (fieldFilters && Object.keys(fieldFilters).length > 0) {
        Object.assign(where, buildWhereFromAgFilters(fieldFilters, allowedDbFields));
      }
      if (!includeDisabled) {
        if (lifecycleStatus === StatusState.DISABLED) {
          where.disabled_at = inactiveDisabledAtCondition();
        } else if (lifecycleStatus === StatusState.ENABLED) {
          where.disabled_at = activeDisabledAtCondition();
        } else {
          where.disabled_at = activeSinceCondition(periodStart);
        }
      }
      const baseItems = await mg.getRepository(CapexItem).find({
        where,
        order: { created_at: 'DESC' as any },
        take: 10000,
      });
      if (!baseItems.length) return [];
      const companyIds = baseItems.map((i: any) => i.paying_company_id).filter(Boolean);
      const companyRecords =
        companyIds.length > 0
          ? await mg.getRepository(Company).find({ where: { id: In(companyIds) as any } as any })
          : [];
      const companyNameById = new Map(companyRecords.map((c) => [c.id, c.name ?? null]));
      let data: any[] = baseItems.map((item: any) => ({
        ...item,
        company_name: item.paying_company_id ? companyNameById.get(item.paying_company_id) ?? null : null,
      }));

      const derivedFilters = Object.fromEntries(
        Object.entries(fieldFilters || {}).filter(([key]) => !allowedDbFields.includes(key)),
      );
      if (Object.keys(derivedFilters).length > 0) {
        data = applyCapexFiltersInMemory(data, derivedFilters);
      }

      if (q) {
        const needle = String(q).toLowerCase();
        const take = (v: any) => (v == null ? '' : String(v)).toLowerCase();
        const matches = (row: any): boolean => {
          const bag: string[] = [];
          bag.push(take(row.description));
          bag.push(take(row.notes));
          bag.push(take(row.ppe_type));
          bag.push(take(row.investment_type));
          bag.push(take(row.priority));
          bag.push(take(row.currency));
          bag.push(take(row.status));
          return bag.some((s) => s.includes(needle));
        };
        data = data.filter(matches);
      }
      return data;
    };

    const results: Record<string, Array<string | null>> = {};
    for (const field of fields) {
      const fieldFilters = { ...(filtersToApply || {}) };
      delete fieldFilters[field];
      const rows = await loadRows(fieldFilters);
      const values = new Set<string | null>();
      rows.forEach((row) => {
        let value: any = getCapexSummaryFieldValue(row, field);
        if (value == null || value === '') {
          value = null;
        } else if (typeof value !== 'string') {
          value = String(value);
        }
        values.add(value);
      });
      const ordered = Array.from(values);
      ordered.sort((a, b) => {
        if (a == null) return 1;
        if (b == null) return -1;
        return String(a).localeCompare(String(b));
      });
      results[field] = ordered;
    }

    return results;
  }

  /**
   * Optimized aggregation of capex amounts by version using SQL GROUP BY.
   * This is 90%+ faster than loading all individual amounts and aggregating in JavaScript.
   */
  private async aggregateCapexAmountsByVersionIds(
    versionIds: string[],
    mg: EntityManager,
  ): Promise<Map<string, { planned: bigint; actual: bigint; expected_landing: bigint; committed: bigint }>> {
    if (!versionIds || versionIds.length === 0) {
      return new Map();
    }

    // Aggregate amounts by version_id in a single SQL query
    // Filter by year to only sum amounts within the version's budget year
    const results: Array<{
      version_id: string;
      planned: string;
      actual: string;
      expected_landing: string;
      committed: string;
    }> = await mg.query(
      `
      SELECT
        ca.version_id,
        COALESCE(SUM(ca.planned), 0) as planned,
        COALESCE(SUM(ca.actual), 0) as actual,
        COALESCE(SUM(ca.expected_landing), 0) as expected_landing,
        COALESCE(SUM(ca.committed), 0) as committed
      FROM capex_amounts ca
      JOIN capex_versions cv ON ca.version_id = cv.id
      WHERE ca.version_id = ANY($1::uuid[])
        AND EXTRACT(YEAR FROM ca.period) = cv.budget_year
      GROUP BY ca.version_id
      `,
      [versionIds],
    );

    // Convert to Map for O(1) lookup, using bigint for precision
    // Use toCents() to convert decimal strings (e.g., "0.00", "1234.56") to bigint cents
    const totalsMap = new Map<string, { planned: bigint; actual: bigint; expected_landing: bigint; committed: bigint }>();
    for (const row of results) {
      totalsMap.set(row.version_id, {
        planned: toCents(row.planned),
        actual: toCents(row.actual),
        expected_landing: toCents(row.expected_landing),
        committed: toCents(row.committed),
      });
    }

    return totalsMap;
  }

  async summaryTotals(query: any, opts?: { manager?: EntityManager }): Promise<{ yMinus1Landing: number; yBudget: number; yLanding: number; yPlus1Budget: number; reportingCurrency: string }> {
    const mg = opts?.manager ?? this.repo.manager;
    const now = new Date();
    const Y = now.getFullYear();
    const years = [Y - 1, Y, Y + 1];

    const { ids: itemIds } = await this.summaryIds(query, { manager: mg });
    const defaultSummary = {
      yMinus1Landing: 0,
      yBudget: 0,
      yLanding: 0,
      yPlus1Budget: 0,
      reportingCurrency: 'EUR',
    };

    if (!itemIds || itemIds.length === 0) {
      return { ...defaultSummary };
    }

    // Load items (needed for currency info and disabled_at logic)
    const items = await mg.getRepository(CapexItem).find({ where: { id: In(itemIds) as any } as any });
    if (!items.length) {
      return { ...defaultSummary };
    }

    const tenantId = (items[0] as any).tenant_id ?? null;
    const { settings } = tenantId
      ? await this.fxRates.resolveRates(tenantId, [], { manager: mg })
      : { settings: { reportingCurrency: 'EUR' } as any };

    // Load versions for the filtered items
    const versions = await mg.getRepository(CapexVersion).find({
      where: { capex_item_id: In(itemIds) as any, budget_year: In(years) as any } as any,
    });

    if (!versions.length) {
      return { ...defaultSummary, reportingCurrency: settings.reportingCurrency ?? 'EUR' };
    }

    // OPTIMIZATION: Aggregate amounts by version_id using SQL (90%+ faster)
    const versionIds = versions.map((v) => v.id);
    const versionTotalsById = await this.aggregateCapexAmountsByVersionIds(versionIds, mg);

    // Build lookup maps
    const itemById = new Map(items.map((it) => [it.id, it]));
    const versionsById = new Map(versions.map((v) => [v.id, v]));

    // Prepare FX lookup keys for each version
    const lookupKeys: FxLookupKey[] = [];
    for (const version of versions) {
      const item = itemById.get((version as any).capex_item_id);
      if (!item) continue;
      const sourceCurrency = (item as any).currency || 'EUR';
      lookupKeys.push({
        key: '',
        rateSetId: (version as any).fx_rate_set_id ?? null,
        fiscalYear: (version as any).budget_year as number,
        sourceCurrency,
      });
    }

    // Resolve FX rates for all versions
    const fxResult = tenantId
      ? await this.fxRates.resolveRates(tenantId, lookupKeys, { manager: mg })
      : { map: new Map<string, FxResolvedRate>(), settings: { reportingCurrency: 'EUR' } as any };
    const fxMap = fxResult.map;

    // Convert each version's totals to reporting currency
    const versionReportingTotalsById = new Map<
      string,
      { budget: number; landing: number }
    >();

    for (const version of versions) {
      const totals = versionTotalsById.get(version.id);
      if (!totals) {
        // Version has no amounts - set to zero
        versionReportingTotalsById.set(version.id, { budget: 0, landing: 0 });
        continue;
      }

      const item = itemById.get((version as any).capex_item_id);
      const currency = ((item as any)?.currency || 'EUR').toString().toUpperCase();
      const fxRateSetId = (version as any).fx_rate_set_id ?? null;
      const budgetYear = (version as any).budget_year as number;
      const key = `${fxRateSetId || 'live'}:${budgetYear}:${currency}`;
      const fx = fxMap.get(key) || {
        rate: currency === settings.reportingCurrency ? 1 : 1,
        reportingCurrency: settings.reportingCurrency,
        source: 'identity',
        capturedAt: null,
      };

      // Convert bigint amounts to numbers and apply FX conversion
      const budget = Number(formatCents(totals.planned));
      const landing = Number(formatCents(totals.expected_landing));

      versionReportingTotalsById.set(version.id, {
        budget: this.fxRates.convertValue(budget, fx.rate),
        landing: this.fxRates.convertValue(landing, fx.rate),
      });
    }

    // Build versionsByItemYear map for efficient lookup
    const versionsByItemYear = new Map<string, Map<number, CapexVersion>>();
    for (const version of versions) {
      const itemId = (version as any).capex_item_id as string;
      const budgetYear = (version as any).budget_year as number;
      let perItem = versionsByItemYear.get(itemId);
      if (!perItem) {
        perItem = new Map<number, CapexVersion>();
        versionsByItemYear.set(itemId, perItem);
      }
      perItem.set(budgetYear, version);
    }

    // Sum up totals across all items, respecting disabled_at logic
    const zeroTotals = { budget: 0, landing: 0 };
    const totals = {
      yMinus1Landing: 0,
      yBudget: 0,
      yLanding: 0,
      yPlus1Budget: 0,
    };

    const getTotals = (versionId?: string | null) => {
      if (!versionId) return zeroTotals;
      const totals = versionReportingTotalsById.get(versionId);
      if (!totals) return zeroTotals;
      return {
        budget: totals.budget,
        landing: totals.landing,
      };
    };

    for (const itemId of itemIds) {
      const perYear = versionsByItemYear.get(itemId) || new Map<number, CapexVersion>();
      const item = items.find((it) => it.id === itemId);
      const disabledYear = item && (item as any).disabled_at ? new Date((item as any).disabled_at).getFullYear() : null;
      const vMinus1Raw = perYear.get(Y - 1);
      const vCurrRaw = perYear.get(Y);
      const vPlus1Raw = perYear.get(Y + 1);
      const vMinus1 = disabledYear != null && (Y - 1) > disabledYear ? undefined : vMinus1Raw;
      const vCurr = disabledYear != null && Y > disabledYear ? undefined : vCurrRaw;
      const vPlus1 = disabledYear != null && (Y + 1) > disabledYear ? undefined : vPlus1Raw;

      const minus1 = getTotals(vMinus1?.id);
      const current = getTotals(vCurr?.id);
      const plus1 = getTotals(vPlus1?.id);

      totals.yMinus1Landing += minus1.landing;
      totals.yBudget += current.budget;
      totals.yLanding += current.landing;
      totals.yPlus1Budget += plus1.budget;
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
      yMinus1Landing: round2(totals.yMinus1Landing),
      yBudget: round2(totals.yBudget),
      yLanding: round2(totals.yLanding),
      yPlus1Budget: round2(totals.yPlus1Budget),
      reportingCurrency: settings.reportingCurrency ?? 'EUR',
    };
  }

  csvHeaders() {
    return [
      'description','ppe_type','investment_type','priority','currency','effective_start','effective_end','status','disabled_at','notes','company_name',
      'y_minus1_budget','y_minus1_landing','y_budget','y_follow_up','y_landing','y_revision','y_plus1_budget'
    ];
  }

  async exportCsv(scope: 'template' | 'data' = 'data', opts?: { manager?: EntityManager }): Promise<{ filename: string; content: string }> {
    const delimiter = ';';
    const headers = this.csvHeaders();
    const chunks: string[] = [];
    if (scope === 'template') {
      const headerRow = headers.join(delimiter);
      return { filename: 'capex_template.csv', content: '\ufeff' + headerRow + '\n' };
    }

    // Data export
    const now = new Date();
    const Y = now.getFullYear();
    const { items } = await this.summary({ page: 1, limit: 100000, sort: 'created_at:DESC' }, opts);

    // Get company names for items that have company_id
    const companyIds = items.map((it: any) => it.paying_company_id).filter(Boolean);
    const companies = companyIds.length > 0 
      ? await opts?.manager?.getRepository(Company).find({ where: { id: In(companyIds) } }) ?? []
      : [];
    const companiesById = new Map(companies.map(c => [c.id, c.name]));

    const { format } = await import('@fast-csv/format');
    const toIsoDate = (value: unknown): string => {
      if (value == null || value === '') return '';
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }
      const str = value.toString().trim();
      if (str === '') return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const parsed = new Date(str);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return '';
    };
    await new Promise<void>((resolve, reject) => {
      const stream = format({ headers, delimiter });
      stream.on('data', (chunk) => chunks.push(chunk.toString('utf8')));
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
      function getTotals(row: any, key: 'yMinus1' | 'y' | 'yPlus1') {
        const v = row?.versions?.[key]?.totals || { budget: 0, follow_up: 0, landing: 0, revision: 0 };
        return v;
      }
      for (const it of items as any[]) {
        const tMinus1 = getTotals(it, 'yMinus1');
        const tY = getTotals(it, 'y');
        const tPlus1 = getTotals(it, 'yPlus1');
        stream.write({
          description: (it as any).description ?? '',
          ppe_type: (it as any).ppe_type ?? '',
          investment_type: (it as any).investment_type ?? '',
          priority: (it as any).priority ?? '',
          currency: (it as any).currency ?? '',
          effective_start: toIsoDate((it as any).effective_start),
          effective_end: toIsoDate((it as any).effective_end),
          status: (it as any).status ?? 'enabled',
          disabled_at: (it as any).disabled_at ? toIsoDate((it as any).disabled_at) : '',
          notes: (it as any).notes ?? '',
          company_name: (it as any).paying_company_id ? (companiesById.get((it as any).paying_company_id) ?? '') : '',
          y_minus1_budget: tMinus1.budget,
          y_minus1_landing: tMinus1.landing,
          y_budget: tY.budget,
          y_follow_up: tY.follow_up,
          y_landing: tY.landing,
          y_revision: tY.revision,
          y_plus1_budget: tPlus1.budget,
        });
      }
      stream.end();
    });
    return { filename: 'capex.csv', content: '\ufeff' + chunks.join('') };
  }

  async importCsv({ file, dryRun, userId }: { file: Express.Multer.File; dryRun: boolean; userId?: string | null }, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    if (!file) throw new Error('No file uploaded');
    const delimiter = ';';
    const expectedHeaders = this.csvHeaders();
    type Row = Record<string, string>;
    const rows: Row[] = [];
    const errors: { row: number; message: string }[] = [];
    let headerOk = false;

    await new Promise<void>((resolve, reject) => {
      const buf = file.buffer ?? ((file as any).path ? fs.readFileSync((file as any).path) : undefined);
      if (!buf) { reject(new Error('Empty upload')); return; }
      let content: string;
      try { content = decodeCsvBufferUtf8OrThrow(buf as Buffer); }
      catch { reject(new Error('Invalid file encoding. Please export or save the CSV as UTF-8 (CSV UTF-8) and use semicolons as separators.')); return; }
      parseString(content, { headers: true, delimiter, ignoreEmpty: true, trim: true })
        .on('headers', (headers: string[]) => {
          const missing = expectedHeaders.filter((h) => !headers.includes(h));
          const extras = headers.filter((h) => !expectedHeaders.includes(h));
          headerOk = missing.length === 0 && extras.length === 0;
          if (!headerOk) errors.push({ row: 0, message: `Header mismatch. Missing: ${missing.join(', ') || '-'}, Extra: ${extras.join(', ') || '-'}` });
        })
        .on('error', (err) => reject(err))
        .on('data', (row: Row) => rows.push(row))
        .on('end', () => resolve());
    });
    if (!headerOk) return { ok: false, dryRun, total: 0, inserted: 0, updated: 0, errors };

    const now = new Date();
    const Y = now.getFullYear();
    // number parsing tolerant to thousand separators and comma decimals
    const parseAmount = (raw: string): number | undefined => {
      let s = (raw || '').trim(); if (s === '') return undefined; s = s.replace(/\s+/g, '');
      const hasComma = s.includes(','); const hasDot = s.includes('.');
      if (hasComma && hasDot) { s = s.replace(/\./g, ''); s = s.replace(/,/g, '.'); }
      else if (hasComma && !hasDot) { s = s.replace(/,/g, '.'); }
      s = s.replace(/[^0-9.-]/g, '');
      if (s === '' || s === '-' || s === '.' || s === '-.' || s === '-0') return undefined;
      const cents = toCents(s);
      return Number(formatCents(cents));
    };

    // Get all companies for name resolution
    const allCompanies = await mg.getRepository(Company).find();
    const companiesByName = new Map(allCompanies.map(c => [c.name.toLowerCase(), c.id]));

    const normalizeDateField = <T extends string | null>(
      raw: unknown,
      { fallback, field, line }: { fallback: T; field: string; line: number },
    ): T => {
      const str = raw == null ? '' : raw.toString().trim();
      if (str === '') return fallback;
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str as T;
      const parsed = new Date(str);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10) as T;
      errors.push({ row: line, message: `${field} must be a valid date in YYYY-MM-DD format` });
      return fallback;
    };

    const normalized: Array<{
      description: string; ppe_type: string; investment_type: string; priority: string; currency: string; effective_start: string; effective_end: string | null; status: StatusState; disabled_at: Date | null; notes: string | null;
      paying_company_id: string | null;
      totals: { [year: number]: { planned?: number; actual?: number; expected_landing?: number; committed?: number } };
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]; const line = i + 2;
      const description = (r['description'] ?? '').toString().trim();
      const ppe_type = (r['ppe_type'] ?? '').toString().trim().toLowerCase();
      const investment_type = (r['investment_type'] ?? '').toString().trim().toLowerCase();
      const priority = (r['priority'] ?? '').toString().trim().toLowerCase();
      const currency = (r['currency'] ?? '').toString().trim().toUpperCase();
      const effective_start = normalizeDateField(r['effective_start'], { fallback: `${Y}-01-01`, field: 'effective_start', line });
      const effective_end = normalizeDateField(r['effective_end'], { fallback: null, field: 'effective_end', line });
      const statusRaw = (r['status'] ?? 'enabled').toString().trim().toLowerCase();
      if (statusRaw && statusRaw !== 'enabled' && statusRaw !== 'disabled') {
        errors.push({ row: line, message: `Invalid status '${statusRaw}'. Use 'enabled' or 'disabled'.` });
      }
      const status = statusRaw === 'disabled' ? StatusState.DISABLED : StatusState.ENABLED;
      const disabledAtRaw = (r['disabled_at'] ?? '').toString().trim();
      let disabled_at: Date | null = null;
      if (disabledAtRaw) {
        const parsed = new Date(disabledAtRaw);
        if (Number.isNaN(parsed.getTime())) {
          errors.push({ row: line, message: `Invalid disabled_at '${disabledAtRaw}'. Use ISO date format.` });
        } else {
          disabled_at = parsed;
        }
      }
      const notes = ((r['notes'] ?? '').toString().trim()) || null;
      const company_name = (r['company_name'] ?? '').toString().trim();
      
      // Resolve company name to ID
      let paying_company_id: string | null = null;
      if (company_name) {
        paying_company_id = companiesByName.get(company_name.toLowerCase()) || null;
        if (!paying_company_id) {
          errors.push({ row: line, message: `Company '${company_name}' not found` });
        }
      }

      if (!description) errors.push({ row: line, message: 'description is required' });
      if (currency && currency.length !== 3) errors.push({ row: line, message: 'currency must be 3 letters' });
      if (!['hardware','software'].includes(ppe_type)) errors.push({ row: line, message: 'ppe_type must be hardware|software' });
      const invOk = ['replacement','capacity','productivity','security','conformity','business_growth','other'].includes(investment_type);
      if (!invOk) errors.push({ row: line, message: 'investment_type invalid' });
      if (!['mandatory','high','medium','low'].includes(priority)) errors.push({ row: line, message: 'priority invalid' });

      const tMinus1 = { planned: parseAmount((r['y_minus1_budget'] ?? '').toString()), expected_landing: parseAmount((r['y_minus1_landing'] ?? '').toString()) };
      const tY = {
        planned: parseAmount((r['y_budget'] ?? '').toString()),
        actual: parseAmount((r['y_follow_up'] ?? '').toString()),
        expected_landing: parseAmount((r['y_landing'] ?? '').toString()),
        committed: parseAmount((r['y_revision'] ?? '').toString()),
      };
      const tPlus1 = { planned: parseAmount((r['y_plus1_budget'] ?? '').toString()) };
      const totals: any = {}; totals[Y - 1] = tMinus1; totals[Y] = tY; totals[Y + 1] = tPlus1;
      normalized.push({ description, ppe_type, investment_type, priority, currency, effective_start, effective_end, status, disabled_at, notes, paying_company_id, totals });
    }
    if (errors.length > 0) return { ok: false, dryRun, total: rows.length, inserted: 0, updated: 0, errors };

    // Deduplicate by description (first wins)
    const uniqueMap = new Map<string, typeof normalized[number]>();
    for (const item of normalized) { const key = item.description.toLowerCase(); if (!uniqueMap.has(key)) uniqueMap.set(key, item); }
    const unique = Array.from(uniqueMap.values());

    // Count inserts; skip existing items with same description
    let inserted = 0; let updated = 0;
    for (const item of unique) {
      const exists = await mg.getRepository(CapexItem).findOne({ where: { description: item.description } });
      if (exists) continue; else inserted += 1;
    }
    if (dryRun) return { ok: true, dryRun: true, total: rows.length, inserted, updated, errors: [] };

    let processed = 0;
    for (const item of unique) {
      const exists = await mg.getRepository(CapexItem).findOne({ where: { description: item.description } });
      if (exists) continue;
      const created = await this.create({
        description: item.description,
        ppe_type: item.ppe_type as any,
        investment_type: item.investment_type as any,
        priority: item.priority as any,
        currency: item.currency,
        effective_start: item.effective_start,
        effective_end: item.effective_end ?? null,
        status: item.status,
        disabled_at: item.disabled_at,
        notes: item.notes ?? null,
        paying_company_id: item.paying_company_id,
      } as any, userId ?? undefined, { manager: mg });

      const years = [Y - 1, Y, Y + 1];
      for (const yr of years) {
        const totals = (item.totals as any)[yr] || {};
        const hasAny = Object.values(totals).some((v: any) => v != null && !isNaN(Number(v)));
        if (!hasAny) continue;
        let version = await mg.getRepository(CapexVersion).findOne({ where: { capex_item_id: created.id, budget_year: yr as any } as any });
        if (!version) {
          const versionPartial: DeepPartial<CapexVersion> = {
            capex_item_id: created.id,
            budget_year: yr as any,
            version_name: `Auto ${yr}`,
            input_grain: 'annual' as any,
            is_approved: false,
            as_of_date: `${yr}-01-01`,
            tenant_id: created.tenant_id,
            allocation_method: 'default' as any,
          };
          version = mg.getRepository(CapexVersion).create(versionPartial);
          version = await mg.getRepository(CapexVersion).save(version);
          await this.audit.log({ table: 'capex_versions', recordId: version.id, action: 'create', before: null, after: version, userId }, { manager: mg });
        }
        const tenantId = version.tenant_id;
        const annualTotals: Record<string, number> = {};
        const touchedColumns = new Set<FreezeColumn>();
        if (totals.planned != null && !isNaN(Number(totals.planned))) {
          annualTotals.planned = Number(totals.planned);
          touchedColumns.add('budget');
        }
        if (totals.actual != null && !isNaN(Number(totals.actual))) {
          annualTotals.actual = Number(totals.actual);
          touchedColumns.add('actual');
        }
        if (totals.expected_landing != null && !isNaN(Number(totals.expected_landing))) {
          annualTotals.expected_landing = Number(totals.expected_landing);
          touchedColumns.add('landing');
        }
        if (totals.committed != null && !isNaN(Number(totals.committed))) {
          annualTotals.committed = Number(totals.committed);
          touchedColumns.add('revision');
        }
        if (touchedColumns.size > 0) {
          await this.ensureCapexColumnsEditable(yr, touchedColumns, mg);
        }
        const weights = Array.from({ length: 12 }, () => 1 / 12);
        const monthly = spreadAnnualToMonths({ year: yr, totals: annualTotals, profileWeights: weights });
        const rows = monthly.map((m: any) => ({
          version_id: version!.id,
          period: m.period,
          planned: m.planned,
          forecast: m.forecast,
          committed: m.committed,
          actual: m.actual,
          expected_landing: m.expected_landing,
          tenant_id: tenantId,
        }));
        await mg.getRepository(CapexAmount).upsert(rows as any, { conflictPaths: ['version_id', 'period'] });
      }
      processed += 1;
    }
    return { ok: true, dryRun: false, total: rows.length, inserted, updated, processed, errors: [] };
  }

  // Return ordered list of matching CAPEX item IDs for navigation (reflects sort/filter/q)
  async summaryIds(query: any, opts?: { manager?: EntityManager }): Promise<{ ids: string[]; total: number }> {
    const mg = opts?.manager ?? this.repo.manager;
    const now = new Date();
    const Y = now.getFullYear();
    const years = [Y - 1, Y, Y + 1];

    const { sort, status, q, filters } = parsePagination(query);
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const filtersToApply = sanitizedFilters ?? filters;
    const allowedDbFields = [
      'id', 'description', 'ppe_type', 'investment_type', 'priority', 'currency', 'effective_start', 'effective_end', 'status', 'notes', 'created_at', 'updated_at',
    ];

    const where: Record<string, any> = {};
    if (filtersToApply && Object.keys(filtersToApply).length > 0) {
      Object.assign(where, buildWhereFromAgFilters(filtersToApply, allowedDbFields));
    }
    const lifecycleStatus = status ?? statusFromAg ?? StatusState.ENABLED;
    const includeDisabled =
      String(query.includeDisabled ?? '').toLowerCase() === '1' ||
      String(query.includeDisabled ?? '').toLowerCase() === 'true';
    if (!includeDisabled) {
      where.disabled_at =
        lifecycleStatus === StatusState.DISABLED ? inactiveDisabledAtCondition() : activeDisabledAtCondition();
    }

    const baseItems = await mg.getRepository(CapexItem).find({
      where,
      order: { created_at: 'DESC' as any },
      take: 10000,
    });
    if (!baseItems.length) return { ids: [], total: 0 };

    const companyIds = baseItems.map((i: any) => i.paying_company_id).filter(Boolean);
    const companyRecords =
      companyIds.length > 0
        ? await mg.getRepository(Company).find({ where: { id: In(companyIds) as any } as any })
        : [];
    const companyNameById = new Map(companyRecords.map((c) => [c.id, c.name ?? null]));
    let data: any[] = baseItems.map((item: any) => ({
      ...item,
      company_name: item.paying_company_id ? companyNameById.get(item.paying_company_id) ?? null : null,
    }));

    const derivedFilters = Object.fromEntries(
      Object.entries(filtersToApply || {}).filter(([key]) => !allowedDbFields.includes(key)),
    );
    const hasDerivedFilters = Object.keys(derivedFilters).length > 0;
    if (hasDerivedFilters) {
      data = applyCapexFiltersInMemory(data, derivedFilters);
    }

    // Optional quick search across a few textual fields
    if (q) {
      const needle = String(q).toLowerCase();
      const take = (v: any) => (v == null ? '' : String(v)).toLowerCase();
      const matches = (row: any): boolean => {
        const bag: string[] = [];
        bag.push(take(row.description));
        bag.push(take(row.notes));
        bag.push(take(row.ppe_type));
        bag.push(take(row.investment_type));
        bag.push(take(row.priority));
        bag.push(take(row.currency));
        bag.push(take(row.status));
        return bag.some((s) => s.includes(needle));
      };
      data = data.filter(matches);
    }

    if (!data.length) return { ids: [], total: 0 };

    // Load versions for required years and compute rollups used for sorting by derived fields
    const itemIds = data.map((i) => i.id);
    const versions = await mg.getRepository(CapexVersion).find({ where: { capex_item_id: In(itemIds) as any, budget_year: In(years) as any } as any });
    const versionsById = new Map<string, CapexVersion>();
    const versionsByItemYear = new Map<string, Map<number, CapexVersion>>();
    for (const v of versions) {
      versionsById.set(v.id, v);
      let perItem = versionsByItemYear.get(v.capex_item_id);
      if (!perItem) { perItem = new Map<number, CapexVersion>(); versionsByItemYear.set(v.capex_item_id, perItem); }
      perItem.set((v as any).budget_year as number, v);
    }

    const versionIds = versions.map((v) => v.id);
    let allAmounts: CapexAmount[] = [];
    if (versionIds.length > 0) {
      allAmounts = await mg.getRepository(CapexAmount).find({ where: { version_id: In(versionIds) as any } as any });
    }
    const amountsByVersion: Record<string, { planned: bigint; actual: bigint; expected_landing: bigint; committed: bigint }> = {};
    for (const a of allAmounts) {
      const v = versionsById.get((a as any).version_id as string);
      if (!v) continue;
      const periodYear = new Date((a as any).period as string).getFullYear();
      const vYear = (v as any).budget_year as number;
      if (periodYear !== vYear) continue;
      const key = (a as any).version_id as string;
      const acc = (amountsByVersion[key] ||= { planned: 0n, actual: 0n, expected_landing: 0n, committed: 0n });
      acc.planned = addCents(acc.planned, (a as any).planned);
      acc.actual = addCents(acc.actual, (a as any).actual);
      acc.expected_landing = addCents(acc.expected_landing, (a as any).expected_landing);
      acc.committed = addCents(acc.committed, (a as any).committed);
    }

    function sumFor(itemId: string, year: number, key: 'planned' | 'expected_landing' | 'committed') {
      const v = versionsByItemYear.get(itemId)?.get(year);
      if (!v) return 0;
      const sum = amountsByVersion[v.id] || { planned: 0n, expected_landing: 0n, committed: 0n } as any;
      return Number(formatCents(sum[key]));
    }

    // Sort by requested field
    const dir = sort.direction === 'ASC' ? 1 : -1;
    const getValue = (row: any): any => {
      switch (sort.field) {
        case 'yMinus1Landing': return sumFor(row.id, Y - 1, 'expected_landing');
        case 'yBudget': return sumFor(row.id, Y, 'planned');
        case 'yLanding': return sumFor(row.id, Y, 'expected_landing');
        case 'yPlus1Budget': return sumFor(row.id, Y + 1, 'planned');
        default: return row?.[sort.field];
      }
    };

    data.sort((a: any, b: any) => {
      const av = getValue(a); const bv = getValue(b);
      const aU = av == null; const bU = bv == null;
      if (aU && bU) return 0; if (aU) return 1 * dir; if (bU) return -1 * dir;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    const ids = data.map((r: any) => r.id);
    return { ids, total: ids.length };
  }

  // Links
  async listLinks(capexItemId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    return mg.getRepository(CapexLink).find({ where: { capex_item_id: capexItemId } as any, order: { created_at: 'ASC' as any } });
  }

  async createLink(capexItemId: string, body: any, userId?: string | null, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(CapexLink);
    const entity = repo.create({ capex_item_id: capexItemId, description: (body?.description ?? null) as any, url: String(body?.url || '').trim() });
    const saved = await repo.save(entity);
    await this.audit.log({ table: 'capex_links', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: mg });
    return saved;
  }

  async updateLink(capexItemId: string, linkId: string, body: any, userId?: string | null, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(CapexLink);
    const existing = await repo.findOne({ where: { id: linkId } });
    if (!existing || (existing as any).capex_item_id !== capexItemId) throw new NotFoundException('Link not found');
    const before = { ...existing } as any;
    (existing as any).description = (body?.description ?? null) as any;
    (existing as any).url = String(body?.url || '').trim();
    const saved = await repo.save(existing);
    await this.audit.log({ table: 'capex_links', recordId: saved.id, action: 'update', before, after: saved, userId }, { manager: mg });
    return saved;
  }

  async deleteLink(capexItemId: string, linkId: string, userId?: string | null, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(CapexLink);
    const existing = await repo.findOne({ where: { id: linkId } });
    if (!existing || (existing as any).capex_item_id !== capexItemId) return { ok: true };
    await repo.delete({ id: linkId } as any);
    await this.audit.log({ table: 'capex_links', recordId: linkId, action: 'delete', before: existing, after: null, userId }, { manager: mg });
    return { ok: true };
  }

  // Attachments
  async listAttachments(capexItemId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    return mg.getRepository(CapexAttachment).find({ where: { capex_item_id: capexItemId } as any, order: { uploaded_at: 'DESC' as any } });
  }

  async uploadAttachment(capexItemId: string, file: Express.Multer.File, userId?: string | null, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(CapexAttachment);
    if (!file) throw new BadRequestException('No file uploaded');
    const [{ tenant_id }] = await mg.query(`SELECT app_current_tenant() AS tenant_id`);
    const id = randomUUID();
    const now = new Date();
    const decodedName = fixMulterFilename(file.originalname);
    const ext = path.extname(decodedName || '') || '';
    const rand = Math.random().toString(36).slice(2, 8);
    const key = [
      'files', tenant_id, 'capex', capexItemId,
      now.getUTCFullYear().toString(), String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${id}_${rand}${ext}`,
    ].join('/');
    const buf = file.buffer ?? ((file as any).path ? fs.readFileSync((file as any).path) : null);
    if (!buf) throw new BadRequestException('Empty upload');
    const validated = validateUploadedFile({
      originalName: decodedName,
      mimeType: (file as any).mimetype,
      buffer: buf as Buffer,
      size: (file as any).size,
    });
    await this.storage.putObject({ key, body: buf as Buffer, contentType: validated.mimeType, contentLength: validated.size, sse: 'AES256' });
    const entity = repo.create({
      id,
      capex_item_id: capexItemId,
      original_filename: decodedName || `${id}${ext}`,
      stored_filename: path.basename(key),
      mime_type: validated.mimeType || null,
      size: validated.size,
      storage_path: key,
    } as any);
    const saved = await repo.save(entity as any) as CapexAttachment as any;
    await this.audit.log({ table: 'capex_attachments', recordId: (saved as any).id, action: 'create', before: null, after: saved, userId }, { manager: mg });
    return saved as any;
  }

  async downloadAttachment(attachmentId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(CapexAttachment);
    const found = await repo.findOne({ where: { id: attachmentId } });
    if (!found) throw new NotFoundException('Attachment not found');
    return found;
  }

  async deleteAttachment(attachmentId: string, userId?: string | null, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(CapexAttachment);
    const found = await repo.findOne({ where: { id: attachmentId } });
    if (!found) return { ok: true };
    await repo.delete({ id: attachmentId } as any);
    try { await this.storage.deleteObject((found as any).storage_path); } catch {}
    await this.audit.log({ table: 'capex_attachments', recordId: found.id, action: 'update', before: found, after: null, userId }, { manager: mg });
    return { ok: true };
  }

  // Projects
  async listProjects(capexItemId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    await this.get(capexItemId, { manager: mg }); // ensure item exists
    const rows = await mg.query(
      `SELECT l.project_id as id, p.name
       FROM portfolio_project_capex l
       JOIN portfolio_projects p ON p.id = l.project_id
       WHERE l.capex_id = $1
       ORDER BY p.name ASC`,
      [capexItemId],
    );
    return { items: rows };
  }

  async bulkReplaceProjects(capexItemId: string, projectIds: string[], opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const capex = await this.get(capexItemId, { manager: mg });
    const cleanIds = Array.from(new Set((projectIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (cleanIds.length) {
      const projects = await mg.getRepository(PortfolioProject).find({ where: { id: In(cleanIds) } as any });
      if (projects.length !== cleanIds.length) throw new BadRequestException('One or more projects not found');
      const invalid = projects.find((p) => (p as any).tenant_id !== (capex as any).tenant_id);
      if (invalid) throw new BadRequestException('Project does not belong to tenant');
    }
    const repo = mg.getRepository(PortfolioProjectCapex);
    const existing = await repo.find({ where: { capex_id: capexItemId } as any });
    if (existing.length) await repo.delete({ id: In(existing.map((x) => x.id)) as any });
    if (cleanIds.length) {
      const rows = cleanIds.map((projId) => repo.create({ tenant_id: (capex as any).tenant_id, project_id: projId, capex_id: capexItemId }));
      await repo.save(rows);
    }
    return this.listProjects(capexItemId, { manager: mg });
  }
}
