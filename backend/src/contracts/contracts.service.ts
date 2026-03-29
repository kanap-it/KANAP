import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DeepPartial, EntityManager, In, Repository, Raw } from 'typeorm';
import { Contract } from './contract.entity';
import { ContractSpendItem } from './contract-spend-item.entity';
import { ContractLink } from './contract-link.entity';
import { ContractAttachment } from './contract-attachment.entity';
import { AuditService } from '../audit/audit.service';
import { parsePagination } from '../common/pagination';
import { format } from '@fast-csv/format';
import { parseString } from '@fast-csv/parse';
import { decodeCsvBufferUtf8OrThrow } from '../common/encoding';
import * as path from 'path';
import * as fs from 'fs';
import { StatusState, resolveLifecycleState } from '../common/status';
import { extractStatusFilterFromAgModel } from '../common/status-filter';
import { ContractUpsertDto } from './dto/contract.dto';
import { TasksUnifiedService } from '../tasks/tasks-unified.service';
import { ContractCapexItem } from './contract-capex-item.entity';
import { StorageService } from '../common/storage/storage.service';
import { randomUUID } from 'crypto';
import { ContractContactsService } from './contract-contacts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { validateUploadedFile } from '../common/upload-validation';
import { fixMulterFilename } from '../common/upload';
import {
  buildQuickSearchConditions,
  compileAgFilterCondition,
  CompiledCondition,
  createParamNameGenerator,
  FilterTargetConfig,
} from '../common/ag-grid-filtering';

type ListItem = Contract & {
  supplier?: { id: string; name: string } | null;
  company?: { id: string; name: string } | null;
  end_date?: string;
  cancellation_deadline?: string;
  linked_opex_count?: number;
  latest_task?: { id: string; status?: string; description?: string; created_at?: Date } | null;
};

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private readonly repo: Repository<Contract>,
    @InjectRepository(ContractSpendItem) private readonly linksRepo: Repository<ContractSpendItem>,
    @InjectRepository(ContractLink) private readonly urlsRepo: Repository<ContractLink>,
    @InjectRepository(ContractAttachment) private readonly attachRepo: Repository<ContractAttachment>,
    private readonly audit: AuditService,
    private readonly unifiedTasks: TasksUnifiedService,
    private readonly storage: StorageService,
    private readonly itemContacts: ContractContactsService,
    private readonly notifications: NotificationsService,
  ) {}

  private computeEndDate(start: string, durationMonths: number): string {
    const d = new Date(start + 'T00:00:00Z');
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (durationMonths || 0), d.getUTCDate()));
    end.setUTCDate(end.getUTCDate() - 1); // minus 1 day
    return end.toISOString().slice(0, 10);
    }

  private addMonthsIso(dateIso: string, delta: number): string {
    const d = new Date(dateIso + 'T00:00:00Z');
    const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, d.getUTCDate()));
    return out.toISOString().slice(0, 10);
  }

  private computeCancellationDeadline(endDateIso: string, noticeMonths: number): string {
    const raw = this.addMonthsIso(endDateIso, -noticeMonths);
    return raw;
  }

  private contractFilterTargets(): Record<string, FilterTargetConfig> {
    return {
      id: { expression: 'c.id', dataType: 'string' },
      name: { expression: 'c.name', dataType: 'string' },
      status: { expression: 'c.status', textExpression: 'CAST(c.status AS TEXT)', dataType: 'string' },
      company_id: { expression: 'c.company_id', dataType: 'string' },
      supplier_id: { expression: 'c.supplier_id', dataType: 'string' },
      owner_user_id: { expression: 'c.owner_user_id', dataType: 'string' },
      start_date: { expression: 'c.start_date', dataType: 'string' },
      end_date: {
        expression: `(c.start_date + COALESCE(c.duration_months, 0) * INTERVAL '1 month' - INTERVAL '1 day')::date`,
        dataType: 'string',
      },
      cancellation_deadline: {
        expression: `(c.start_date + (COALESCE(c.duration_months, 0) - COALESCE(c.notice_period_months, 0)) * INTERVAL '1 month')::date`,
        dataType: 'string',
      },
      duration_months: {
        expression: 'c.duration_months',
        numericExpression: 'c.duration_months',
        textExpression: 'CAST(c.duration_months AS TEXT)',
        dataType: 'number',
      },
      auto_renewal: { expression: 'c.auto_renewal', dataType: 'boolean' },
      notice_period_months: {
        expression: 'c.notice_period_months',
        numericExpression: 'c.notice_period_months',
        textExpression: 'CAST(c.notice_period_months AS TEXT)',
        dataType: 'number',
      },
      yearly_amount_at_signature: {
        expression: 'c.yearly_amount_at_signature',
        numericExpression: 'c.yearly_amount_at_signature',
        textExpression: 'CAST(c.yearly_amount_at_signature AS TEXT)',
        dataType: 'number',
      },
      currency: { expression: 'c.currency', dataType: 'string' },
      billing_frequency: { expression: 'c.billing_frequency', dataType: 'string' },
      notes: { expression: 'c.notes', dataType: 'string' },
      created_at: { expression: 'c.created_at', textExpression: 'CAST(c.created_at AS TEXT)', dataType: 'string' },
      updated_at: { expression: 'c.updated_at', textExpression: 'CAST(c.updated_at AS TEXT)', dataType: 'string' },
      company_name: { expression: 'comp.name', dataType: 'string' },
      supplier_name: { expression: 'sup.name', dataType: 'string' },
    };
  }

  async list(query: any, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(Contract);
    const { page, limit, skip, sort, status, q, filters } = parsePagination(query, { field: 'created_at', direction: 'DESC' });
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const filtersToApply = sanitizedFilters ?? filters;
    const filterTargets = this.contractFilterTargets();
    const nextParam = createParamNameGenerator('c');
    const compiledFilters: CompiledCondition[] = [];
    if (filtersToApply && typeof filtersToApply === 'object') {
      for (const [field, model] of Object.entries(filtersToApply)) {
        const target = filterTargets[field];
        if (!target) continue;
        const condition = compileAgFilterCondition(model, target, nextParam);
        if (condition) compiledFilters.push(condition);
      }
    }

    const quickSearchConditions = q
      ? buildQuickSearchConditions(q, ['c.name', 'comp.name', 'sup.name', 'c.notes'], nextParam)
      : [];
    const includeDisabled =
      String(query.includeDisabled ?? '').toLowerCase() === '1' ||
      String(query.includeDisabled ?? '').toLowerCase() === 'true';
    const lifecycleStatus = status ?? statusFromAg ?? StatusState.ENABLED;

    const applyCompiledFilters = (builder: ReturnType<typeof repo.createQueryBuilder>) => {
      compiledFilters.forEach((cond) => builder.andWhere(cond.sql, cond.params));
    };
    const applyQuickSearch = (builder: ReturnType<typeof repo.createQueryBuilder>) => {
      if (quickSearchConditions.length === 0) return;
      builder.andWhere(
        new Brackets((sub) => {
          quickSearchConditions.forEach((cond, idx) => {
            if (idx === 0) sub.where(cond.sql, cond.params);
            else sub.orWhere(cond.sql, cond.params);
          });
        }),
      );
    };

    const qbBase = repo
      .createQueryBuilder('c')
      .leftJoin('companies', 'comp', 'comp.id = c.company_id AND comp.tenant_id = c.tenant_id')
      .leftJoin('suppliers', 'sup', 'sup.id = c.supplier_id AND sup.tenant_id = c.tenant_id');
    if (!includeDisabled) {
      if (lifecycleStatus === StatusState.DISABLED) {
        qbBase.andWhere('c.disabled_at IS NOT NULL AND c.disabled_at <= NOW()');
      } else {
        qbBase.andWhere('(c.disabled_at IS NULL OR c.disabled_at > NOW())');
      }
    } else if (status || statusFromAg) {
      qbBase.andWhere('c.status = :contractStatus', { contractStatus: lifecycleStatus });
    }
    applyCompiledFilters(qbBase);
    applyQuickSearch(qbBase);

    const total = await qbBase.clone().getCount();
    const sortExpressions: Record<string, string> = {
      name: 'c.name',
      status: 'c.status',
      company_name: 'comp.name',
      supplier_name: 'sup.name',
      start_date: 'c.start_date',
      end_date: `(c.start_date + COALESCE(c.duration_months, 0) * INTERVAL '1 month' - INTERVAL '1 day')::date`,
      cancellation_deadline: `(c.start_date + (COALESCE(c.duration_months, 0) - COALESCE(c.notice_period_months, 0)) * INTERVAL '1 month')::date`,
      duration_months: 'c.duration_months',
      auto_renewal: 'c.auto_renewal',
      notice_period_months: 'c.notice_period_months',
      yearly_amount_at_signature: 'c.yearly_amount_at_signature',
      currency: 'c.currency',
      billing_frequency: 'c.billing_frequency',
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
    };
    const sortField = sortExpressions[sort.field] ? sort.field : 'created_at';
    const sortExpr = sortExpressions[sortField];
    const qb = qbBase.clone();
    if (sortField === 'end_date') {
      qb.addSelect(sortExpr, 'sort_end_date');
      qb.orderBy('sort_end_date', sort.direction as any);
    } else if (sortField === 'cancellation_deadline') {
      qb.addSelect(sortExpr, 'sort_cancellation_deadline');
      qb.orderBy('sort_cancellation_deadline', sort.direction as any);
    } else {
      qb.orderBy(sortExpr, sort.direction as any);
    }
    if (sortExpr !== 'c.created_at') qb.addOrderBy('c.created_at', 'DESC');
    qb.skip(skip).take(limit);
    const items = await qb.getMany();

    // augment supplier/company names, linked count, and derived dates
    const supplierIds = Array.from(new Set(items.map(i => i.supplier_id).filter(Boolean))) as string[];
    const companyIds = Array.from(new Set(items.map(i => i.company_id).filter(Boolean))) as string[];
    const [suppliers, companies] = await Promise.all([
      supplierIds.length ? mg.query(`SELECT id, name FROM suppliers WHERE id = ANY($1)`, [supplierIds]) : [],
      companyIds.length ? mg.query(`SELECT id, name FROM companies WHERE id = ANY($1)`, [companyIds]) : [],
    ]);
    const sById = new Map<string, any>(suppliers.map((r: any) => [r.id, r]));
    const cById = new Map<string, any>(companies.map((r: any) => [r.id, r]));

    const contractIds = items.map(i => i.id);
    const counts: Array<{ contract_id: string; c: string }> = contractIds.length
      ? await mg.query(`SELECT contract_id, COUNT(*)::text as c FROM contract_spend_items WHERE contract_id = ANY($1) GROUP BY contract_id`, [contractIds])
      : [];
    const countById = new Map<string, number>(counts.map((r) => [r.contract_id, Number(r.c)]));

    const latestTasks: Array<{ id: string; related_object_id: string; title: string | null; description: string | null; status: string; created_at: Date }> = contractIds.length
      ? await mg.query(
          `SELECT DISTINCT ON (related_object_id) id, related_object_id, title, description, status, created_at
           FROM tasks WHERE related_object_type = 'contract' AND related_object_id = ANY($1)
           ORDER BY related_object_id, created_at DESC`, [contractIds])
      : [];
    const latestById = new Map(latestTasks.map(t => [t.related_object_id, t]));

    const enriched: ListItem[] = items.map((i) => {
      const end = this.computeEndDate(i.start_date, i.duration_months || 0);
      const cancel = this.computeCancellationDeadline(end, i.notice_period_months || 0);
      return {
        ...i,
        supplier: i.supplier_id ? { id: i.supplier_id, name: sById.get(i.supplier_id)?.name ?? '' } : null,
        company: i.company_id ? { id: i.company_id, name: cById.get(i.company_id)?.name ?? '' } : null,
        end_date: end,
        cancellation_deadline: cancel,
        linked_opex_count: countById.get(i.id) ?? 0,
        latest_task: latestById.get(i.id) ? {
          id: latestById.get(i.id)!.id,
          status: latestById.get(i.id)!.status,
          description: latestById.get(i.id)!.description || undefined,
          created_at: latestById.get(i.id)!.created_at,
        } : null,
      };
    });

    return { items: enriched, total, page, limit };
  }

  async get(id: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(Contract);
    const linksRepo = mg.getRepository(ContractSpendItem);
    const urlsRepo = mg.getRepository(ContractLink);
    const attachRepo = mg.getRepository(ContractAttachment);
    const found = await repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Contract not found');
    const end = this.computeEndDate(found.start_date, found.duration_months || 0);
    const cancel = this.computeCancellationDeadline(end, found.notice_period_months || 0);
    const linked = await linksRepo.find({ where: { contract_id: id } });
    const spendIds = linked.map(l => l.spend_item_id);
    const spendItems = spendIds.length ? await mg.query(`SELECT id, product_name FROM spend_items WHERE id = ANY($1)`, [spendIds]) : [];
    const links = await urlsRepo.find({ where: { contract_id: id } });
    const attachments = await attachRepo.find({ where: { contract_id: id } });
    const latestTaskRows: Array<{ id: string; title: string | null; description: string | null; status: string; created_at: Date; due_date?: string | null; assignee_user_id?: string | null }>
      = await mg.query(
        `SELECT id, title, description, status, created_at, due_date, assignee_user_id FROM tasks
         WHERE related_object_type = 'contract' AND related_object_id = $1
         ORDER BY created_at DESC LIMIT 1`, [id]);
    const latest_task = latestTaskRows?.[0] ?? null;
    return { ...found, end_date: end, cancellation_deadline: cancel, linked_spend_items: spendItems, links, attachments, latest_task };
  }

  private validateInput(body: {
    start_date?: string;
    billing_frequency?: string | null;
    currency?: string | null;
    company_id?: string | null;
    supplier_id?: string | null;
  }) {
    const freq = (body.billing_frequency || 'annual').toString();
    const allowed = ['monthly','quarterly','annual','other'];
    if (!allowed.includes(freq)) throw new BadRequestException('billing_frequency must be monthly|quarterly|annual|other');
    if (!body.start_date) throw new BadRequestException('start_date is required');
    if (body.currency && body.currency.length !== 3) throw new BadRequestException('currency must be 3 letters');
    if (!body.company_id) throw new BadRequestException('company_id is required');
    if (!body.supplier_id) throw new BadRequestException('supplier_id is required');
  }

  async create(body: ContractUpsertDto, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(Contract);
    if (!body.name) throw new BadRequestException('name is required');
    this.validateInput(body);
    const { status: statusInput, disabled_at, ...rest } = body ?? {};
    const lifecycle = resolveLifecycleState({ nextStatus: statusInput, nextDisabledAt: disabled_at });
    const toCreate: DeepPartial<Contract> = {
      ...rest,
      status: lifecycle.status,
      disabled_at: lifecycle.disabled_at,
      duration_months: body.duration_months ?? 12,
      auto_renewal: body.auto_renewal ?? true,
      notice_period_months: body.notice_period_months ?? 1,
      yearly_amount_at_signature: body.yearly_amount_at_signature ?? 0,
      currency: (body.currency || 'EUR').toUpperCase(),
      billing_frequency: body.billing_frequency || 'annual',
    };
    const entity = repo.create(toCreate);
    const saved = await repo.save(entity);
    await this.audit.log({ table: 'contracts', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: mg });
    return saved;
  }

  async update(id: string, body: ContractUpsertDto, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(Contract);
    const existing = await repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Contract not found');
    this.validateInput({ ...existing, ...body });
    const before = { ...existing };
    const { status: statusInput, disabled_at, ...rest } = body ?? {};
    Object.assign(existing, rest);
    const lifecycle = resolveLifecycleState({
      currentDisabledAt: before.disabled_at,
      nextStatus: statusInput,
      nextDisabledAt: disabled_at,
    });
    existing.status = lifecycle.status;
    existing.disabled_at = lifecycle.disabled_at;

    // Detect supplier change for contact sync
    const oldSupplierId = before.supplier_id;
    const newSupplierId = existing.supplier_id;

    const saved = await repo.save(existing);
    await this.audit.log({ table: 'contracts', recordId: saved.id, action: 'update', before, after: saved, userId }, { manager: mg });

    // Sync contacts from supplier if supplier changed
    if (oldSupplierId !== newSupplierId) {
      await this.itemContacts.syncFromSupplier(id, newSupplierId, userId ?? null, { manager: mg });
    }

    // Notify owner on status change
    if (before.status !== saved.status && saved.owner_user_id) {
      const tenantId = (saved as any).tenant_id;
      const user = await mg.query('SELECT id, email, locale FROM users WHERE id = $1 AND status = \'enabled\'', [saved.owner_user_id]);
      if (user.length > 0) {
        this.notifications.notifyStatusChange({
          itemType: 'contract',
          itemId: saved.id,
          itemName: saved.name,
          oldStatus: before.status,
          newStatus: saved.status,
          recipients: [{ userId: user[0].id, email: user[0].email, locale: user[0].locale }],
          tenantId,
          excludeUserId: userId,
          manager: mg,
        });
      }
    }

    return saved;
  }

  // Links
  async listLinkedSpendItems(contractId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const linksRepo = mg.getRepository(ContractSpendItem);
    const rows = await linksRepo.find({ where: { contract_id: contractId } });
    const ids = rows.map(r => r.spend_item_id);
    const items = ids.length ? await mg.query(`SELECT id, product_name FROM spend_items WHERE id = ANY($1)`, [ids]) : [];
    return { items };
  }

  async bulkReplaceLinkedSpendItems(contractId: string, spendItemIds: string[], opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(ContractSpendItem);
    const uniqueIds = Array.from(new Set((spendItemIds || []).filter(Boolean)));
    const existing = await repo.find({ where: { contract_id: contractId } });
    const toDelete = existing.filter(e => !uniqueIds.includes(e.spend_item_id));
    const existingSet = new Set(existing.map(e => e.spend_item_id));
    const toInsert = uniqueIds.filter(id => !existingSet.has(id)).map(id => repo.create({ contract_id: contractId, spend_item_id: id }));
    if (toDelete.length > 0) await repo.remove(toDelete);
    if (toInsert.length > 0) await repo.save(toInsert);
    return { ok: true, added: toInsert.length, removed: toDelete.length };
  }

  // Tasks (latest update pattern)
  async listTasks(contractId: string, opts?: { manager?: EntityManager }) {
    return this.unifiedTasks.listForTarget({ type: 'contract', id: contractId }, opts);
  }
  async createTask(contractId: string, body: any, userId?: string, opts?: { manager?: EntityManager; tenantId?: string }) {
    const saved = await this.unifiedTasks.createForTarget({ type: 'contract', id: contractId, payload: body as any }, userId, opts);
    await this.audit.log({ table: 'contract_tasks', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: opts?.manager ?? this.repo.manager });
    return saved;
  }
  async updateTask(contractId: string, body: any & { id: string }, userId?: string, opts?: { manager?: EntityManager; tenantId?: string }) {
    const saved = await this.unifiedTasks.updateForTarget({ type: 'contract', id: contractId, payload: body as any }, userId, opts);
    await this.audit.log({ table: 'contract_tasks', recordId: saved.id, action: 'update', before: null, after: saved, userId }, { manager: opts?.manager ?? this.repo.manager });
    return saved;
  }

  // URLs
  listUrls(contractId: string, opts?: { manager?: EntityManager }) { 
    const mg = opts?.manager ?? this.repo.manager;
    return mg.getRepository(ContractLink).find({ where: { contract_id: contractId }, order: { created_at: 'DESC' as any } });
  }
  async createUrl(contractId: string, body: Partial<ContractLink>, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const urlsRepo = mg.getRepository(ContractLink);
    if (!body.url) throw new BadRequestException('url is required');
    const entity = urlsRepo.create({ contract_id: contractId, url: body.url, description: body.description ?? null });
    const saved = await urlsRepo.save(entity);
    await this.audit.log({ table: 'contract_links', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: mg });
    return saved;
  }
  async updateUrl(contractId: string, linkId: string, body: Partial<ContractLink>, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const urlsRepo = mg.getRepository(ContractLink);
    const existing = await urlsRepo.findOne({ where: { id: linkId } });
    if (!existing || existing.contract_id !== contractId) throw new NotFoundException('Link not found');
    const next = { ...existing, ...body } as ContractLink;
    const saved = await urlsRepo.save(next);
    await this.audit.log({ table: 'contract_links', recordId: saved.id, action: 'update', before: existing, after: saved, userId }, { manager: mg });
    return saved;
  }
  async deleteUrl(contractId: string, linkId: string, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const urlsRepo = mg.getRepository(ContractLink);
    const existing = await urlsRepo.findOne({ where: { id: linkId } });
    if (!existing || existing.contract_id !== contractId) throw new NotFoundException('Link not found');
    await urlsRepo.remove(existing);
    await this.audit.log({ table: 'contract_links', recordId: existing.id, action: 'update', before: existing, after: null, userId }, { manager: mg });
    return { ok: true };
  }

  async listIds(query: any, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(Contract);
    const { limit: rawLimit, skip, sort, status, q, filters } = parsePagination(query, { field: 'created_at', direction: 'DESC' });
    const limit = Math.min(Math.max(rawLimit || 1000, 1), 10000);
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const filtersToApply = sanitizedFilters ?? filters;
    const filterTargets = this.contractFilterTargets();
    const nextParam = createParamNameGenerator('c');
    const compiledFilters: CompiledCondition[] = [];
    if (filtersToApply && typeof filtersToApply === 'object') {
      for (const [field, model] of Object.entries(filtersToApply)) {
        const target = filterTargets[field];
        if (!target) continue;
        const condition = compileAgFilterCondition(model, target, nextParam);
        if (condition) compiledFilters.push(condition);
      }
    }

    const quickSearchConditions = q
      ? buildQuickSearchConditions(q, ['c.name', 'comp.name', 'sup.name', 'c.notes'], nextParam)
      : [];
    const includeDisabled =
      String(query.includeDisabled ?? '').toLowerCase() === '1' ||
      String(query.includeDisabled ?? '').toLowerCase() === 'true';
    const lifecycleStatus = status ?? statusFromAg ?? StatusState.ENABLED;

    const qb = repo
      .createQueryBuilder('c')
      .select(['c.id'])
      .leftJoin('companies', 'comp', 'comp.id = c.company_id AND comp.tenant_id = c.tenant_id')
      .leftJoin('suppliers', 'sup', 'sup.id = c.supplier_id AND sup.tenant_id = c.tenant_id');
    if (!includeDisabled) {
      if (lifecycleStatus === StatusState.DISABLED) {
        qb.andWhere('c.disabled_at IS NOT NULL AND c.disabled_at <= NOW()');
      } else {
        qb.andWhere('(c.disabled_at IS NULL OR c.disabled_at > NOW())');
      }
    } else if (status || statusFromAg) {
      qb.andWhere('c.status = :contractStatus', { contractStatus: lifecycleStatus });
    }
    compiledFilters.forEach((cond) => qb.andWhere(cond.sql, cond.params));
    if (quickSearchConditions.length > 0) {
      qb.andWhere(
        new Brackets((sub) => {
          quickSearchConditions.forEach((cond, idx) => {
            if (idx === 0) sub.where(cond.sql, cond.params);
            else sub.orWhere(cond.sql, cond.params);
          });
        }),
      );
    }

    const sortExpressions: Record<string, string> = {
      name: 'c.name',
      status: 'c.status',
      company_name: 'comp.name',
      supplier_name: 'sup.name',
      start_date: 'c.start_date',
      end_date: `(c.start_date + COALESCE(c.duration_months, 0) * INTERVAL '1 month' - INTERVAL '1 day')::date`,
      cancellation_deadline: `(c.start_date + (COALESCE(c.duration_months, 0) - COALESCE(c.notice_period_months, 0)) * INTERVAL '1 month')::date`,
      duration_months: 'c.duration_months',
      auto_renewal: 'c.auto_renewal',
      notice_period_months: 'c.notice_period_months',
      yearly_amount_at_signature: 'c.yearly_amount_at_signature',
      currency: 'c.currency',
      billing_frequency: 'c.billing_frequency',
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
    };
    const sortField = sortExpressions[sort.field] ? sort.field : 'created_at';
    const sortExpr = sortExpressions[sortField];
    if (sortField === 'end_date') {
      qb.addSelect(sortExpr, 'sort_end_date');
      qb.orderBy('sort_end_date', sort.direction as any);
    } else if (sortField === 'cancellation_deadline') {
      qb.addSelect(sortExpr, 'sort_cancellation_deadline');
      qb.orderBy('sort_cancellation_deadline', sort.direction as any);
    } else {
      qb.orderBy(sortExpr, sort.direction as any);
    }
    if (sortExpr !== 'c.created_at') qb.addOrderBy('c.created_at', 'DESC');
    qb.offset(skip).limit(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { ids: rows.map(r => (r as any).id as string), total };
  }

  async listFilterValues(query: any, opts?: { manager?: EntityManager }): Promise<Record<string, Array<string | null>>> {
    const rawFields = String(query?.fields || query?.field || '')
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
    const allowed = new Set(['currency', 'company_name', 'supplier_name']);
    const fields = rawFields.filter((field) => allowed.has(field));
    if (fields.length === 0) return {};

    const parseFilters = (value: any): Record<string, any> => {
      if (!value) return {};
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }
      return typeof value === 'object' ? { ...value } : {};
    };

    const baseFilters = parseFilters(query?.filters);
    const results: Record<string, Array<string | null>> = {};

    for (const field of fields) {
      const filtersForField = { ...baseFilters };
      delete filtersForField[field];
      const result = await this.list(
        { ...query, page: 1, limit: 10000, filters: filtersForField, sort: 'name:ASC' },
        opts,
      );
      const values = new Set<string | null>();
      for (const item of result.items || []) {
        const rawValue = field === 'company_name'
          ? ((item as any)?.company?.name ?? null)
          : field === 'supplier_name'
            ? ((item as any)?.supplier?.name ?? null)
            : (item as any)?.[field];
        values.add(rawValue == null || rawValue === '' ? null : String(rawValue));
      }
      results[field] = Array.from(values).sort((a, b) => {
        if (a == null) return 1;
        if (b == null) return -1;
        return a.localeCompare(b);
      });
    }

    return results;
  }

  // Attachments stored via StorageService (S3)
  async listAttachments(contractId: string, opts?: { manager?: EntityManager }) { 
    const mg = opts?.manager ?? this.repo.manager;
    return mg.getRepository(ContractAttachment).find({ where: { contract_id: contractId }, order: { uploaded_at: 'DESC' as any } });
  }
  async uploadAttachment(contractId: string, file: Express.Multer.File, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const attachRepo = mg.getRepository(ContractAttachment);
    if (!file) throw new BadRequestException('No file uploaded');
    const [{ tenant_id }] = await mg.query(`SELECT app_current_tenant() AS tenant_id`);
    const id = randomUUID();
    const now = new Date();
    const decodedName = fixMulterFilename(file.originalname);
    const ext = path.extname(decodedName || '') || '';
    const rand = Math.random().toString(36).slice(2, 8);
    const key = [
      'files', tenant_id, 'contracts', contractId,
      now.getUTCFullYear().toString(), String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${id}_${rand}${ext}`,
    ].join('/');
    const buf = file.buffer ?? ((file as any).path ? fs.readFileSync((file as any).path) : null);
    if (!buf) throw new BadRequestException('Empty upload');
    const validated = validateUploadedFile({
      originalName: decodedName,
      mimeType: file.mimetype,
      buffer: buf as Buffer,
      size: (file as any).size,
    });
    await this.storage.putObject({ key, body: buf, contentType: validated.mimeType, contentLength: validated.size, sse: 'AES256' });
    const meta = attachRepo.create({
      id,
      contract_id: contractId,
      original_filename: decodedName || `${id}${ext}`,
      stored_filename: path.basename(key),
      mime_type: (validated.mimeType || null) as any,
      size: validated.size,
      storage_path: key,
    });
    const saved = await attachRepo.save(meta as any);
    await this.audit.log({ table: 'contract_attachments', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: mg });
    return saved;
  }
  async downloadAttachment(attachmentId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const attachRepo = mg.getRepository(ContractAttachment);
    const found = await attachRepo.findOne({ where: { id: attachmentId } });
    if (!found) throw new NotFoundException('Attachment not found');
    return found;
  }
  async deleteAttachment(attachmentId: string, userId?: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const attachRepo = mg.getRepository(ContractAttachment);
    const found = await attachRepo.findOne({ where: { id: attachmentId } });
    if (!found) throw new NotFoundException('Attachment not found');
    try { await this.storage.deleteObject(found.storage_path); } catch {}
    await attachRepo.remove(found);
    await this.audit.log({ table: 'contract_attachments', recordId: found.id, action: 'update', before: found, after: null, userId }, { manager: mg });
    return { ok: true };
  }

  // CSV
  private csvHeaders(): string[] {
    return [
      'name','company_name','supplier_name','start_date','duration_months','auto_renewal','notice_period_months','yearly_amount_at_signature','currency','billing_frequency','status','owner_email','notes'
    ];
  }
  async exportCsv(scope: 'template' | 'data' = 'data', opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(Contract);
    const headers = this.csvHeaders();
    const delimiter = ';';
    const rows: any[] = [];
    if (scope === 'data') {
      const items = await repo.find({ order: { created_at: 'DESC' as any } });
      if (items.length) {
        const sIds = Array.from(new Set(items.map(i => i.supplier_id)));
        const cIds = Array.from(new Set(items.map(i => i.company_id)));
        const [sRows, cRows] = await Promise.all([
          mg.query(`SELECT id, name FROM suppliers WHERE id = ANY($1)`, [sIds]),
          mg.query(`SELECT id, name FROM companies WHERE id = ANY($1)`, [cIds]),
        ]);
        const sMap = new Map<string, any>(sRows.map((r: any) => [r.id, r]));
        const cMap = new Map<string, any>(cRows.map((r: any) => [r.id, r]));
        for (const it of items) {
          rows.push({
            name: it.name,
            company_name: cMap.get(it.company_id)?.name ?? '',
            supplier_name: sMap.get(it.supplier_id)?.name ?? '',
            start_date: it.start_date,
            duration_months: it.duration_months,
            auto_renewal: it.auto_renewal ? 'yes' : 'no',
            notice_period_months: it.notice_period_months,
            yearly_amount_at_signature: it.yearly_amount_at_signature ?? 0,
            currency: it.currency,
            billing_frequency: it.billing_frequency,
            status: it.status,
            owner_email: '',
            notes: it.notes ?? '',
          });
        }
      }
    }
    const filename = scope === 'template' ? 'contracts_template.csv' : 'contracts.csv';
    const chunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = format({ headers, delimiter });
      stream.on('data', (chunk) => chunks.push(chunk.toString('utf8')));
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
      for (const row of rows) stream.write(row);
      stream.end();
    });
    const BOM = '\uFEFF';
    return { filename, content: BOM + chunks.join('') };
  }

  async importCsv({ file, dryRun, userId }: { file: Express.Multer.File; dryRun: boolean; userId?: string | null }, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(Contract);
    if (!file) throw new BadRequestException('No file uploaded');
    const buf = file.buffer || null;
    if (!buf) throw new BadRequestException('Empty upload');
    const text = decodeCsvBufferUtf8OrThrow(buf);
    const rows = await new Promise<any[]>((resolve, reject) => {
      const out: any[] = [];
      parseString(text, { headers: true, delimiter: ';', ignoreEmpty: true })
        .on('error', (e) => reject(e))
        .on('data', (r) => out.push(r))
        .on('end', () => resolve(out));
    });
    const headers = this.csvHeaders();
    const errors: { row: number; message: string }[] = [];
    if (rows.length === 0) return { ok: false, dryRun, total: 0, inserted: 0, updated: 0, errors: [{ row: 0, message: 'Empty CSV' }] };

    // Preload reference maps by name/email for resolution
    const allCompanies = await mg.query(`SELECT id, name FROM companies`);
    const allSuppliers = await mg.query(`SELECT id, name FROM suppliers`);
    const allUsers = await mg.query(`SELECT id, email FROM users`);
    const cByName = new Map<string, any>(allCompanies.map((r: any) => [r.name, r]));
    const sByName = new Map<string, any>(allSuppliers.map((r: any) => [r.name, r]));
    const uByEmail = new Map<string, any>(allUsers.map((r: any) => [r.email.toLowerCase(), r]));

    const norm: Array<ContractUpsertDto & { supplier_name: string; company_name: string; owner_email?: string | null }> = [];
    let line = 1;
    for (const r of rows) {
      line += 1;
      const name = (r['name'] ?? '').toString().trim();
      const company_name = (r['company_name'] ?? '').toString().trim();
      const supplier_name = (r['supplier_name'] ?? '').toString().trim();
      const start_date = (r['start_date'] ?? '').toString().trim();
      const duration_months = parseInt((r['duration_months'] ?? '12').toString(), 10) || 12;
      const auto_raw = (r['auto_renewal'] ?? '').toString().trim().toLowerCase();
      const auto_renewal = ['yes','true','1','y','t'].includes(auto_raw);
      const notice_period_months = parseInt((r['notice_period_months'] ?? '1').toString(), 10) || 1;
      const yearly_amount_at_signature = Number((r['yearly_amount_at_signature'] ?? '0').toString().replace(/\s/g, '').replace(',', '.')) || 0;
      const currency = ((r['currency'] ?? 'EUR').toString().trim() || 'EUR').toUpperCase();
      const billing_frequency = (r['billing_frequency'] ?? 'annual').toString().trim();
      const status = ((r['status'] ?? 'enabled').toString().trim().toLowerCase() === 'disabled') ? 'disabled' : 'enabled';
      const owner_email = ((r['owner_email'] ?? '').toString().trim()) || null;
      const notes = ((r['notes'] ?? '').toString().trim()) || null;
      if (!name) errors.push({ row: line, message: 'name is required' });
      if (!company_name) errors.push({ row: line, message: 'company_name is required' });
      if (!supplier_name) errors.push({ row: line, message: 'supplier_name is required' });
      if (!start_date) errors.push({ row: line, message: 'start_date is required' });
      if (currency && currency.length !== 3) errors.push({ row: line, message: 'currency must be 3 letters' });
      if (!['monthly','quarterly','annual','other'].includes(billing_frequency)) errors.push({ row: line, message: 'billing_frequency invalid' });
      norm.push({ name, company_name, supplier_name, start_date, duration_months, auto_renewal, notice_period_months, yearly_amount_at_signature, currency, billing_frequency, status, owner_email, notes } as any);
    }
    if (errors.length > 0) return { ok: false, dryRun, total: rows.length, inserted: 0, updated: 0, errors };

    // Deduplicate by composite key name+supplier_name (first wins)
    const uniqMap = new Map<string, typeof norm[number]>();
    for (const item of norm) {
      const key = `${item.name}||${item.supplier_name}`.toLowerCase();
      if (!uniqMap.has(key)) uniqMap.set(key, item);
    }
    const unique = Array.from(uniqMap.values());

    // Determine inserts/updates by composite (name + supplier)
    let inserted = 0; let updated = 0;
    for (const item of unique) {
      const s = sByName.get(item.supplier_name);
      if (!s) { updated += 0; continue; }
      const exists = await repo.findOne({ where: { name: item.name as any, supplier_id: s.id as any } });
      if (exists) updated += 1; else inserted += 1;
    }
    if (dryRun) return { ok: true, dryRun: true, total: rows.length, inserted, updated, errors: [] };

    // Commit
    let processed = 0;
    for (const item of unique) {
      const company = cByName.get(item.company_name);
      const supplier = sByName.get(item.supplier_name);
      const owner = item.owner_email ? uByEmail.get(item.owner_email.toLowerCase()) : null;
      if (!company || !supplier) continue; // skip unresolved refs silently
      const exists = await repo.findOne({ where: { name: item.name as any, supplier_id: supplier.id as any } });
      const payload: ContractUpsertDto = {
        name: item.name as any,
        company_id: company.id,
        supplier_id: supplier.id,
        owner_user_id: owner?.id ?? null,
        start_date: item.start_date as any,
        duration_months: item.duration_months as any,
        auto_renewal: item.auto_renewal as any,
        notice_period_months: item.notice_period_months as any,
        yearly_amount_at_signature: item.yearly_amount_at_signature as any,
        currency: item.currency as any,
        billing_frequency: item.billing_frequency as any,
        status: item.status as any,
        notes: (item.notes as any) ?? null,
      };
      if (exists) { await this.update(exists.id, payload, userId ?? undefined, { manager: mg }); processed += 1; }
      else { await this.create(payload, userId ?? undefined, { manager: mg }); processed += 1; }
    }
    return { ok: true, dryRun: false, total: rows.length, inserted, updated, processed, errors: [] };
  }

  // Symmetric linking from OPEX side
  async listContractsForSpendItem(spendItemId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const linksRepo = mg.getRepository(ContractSpendItem);
    const contractRepo = mg.getRepository(Contract);
    const rows = await linksRepo.find({ where: { spend_item_id: spendItemId } });
    const ids = rows.map(r => r.contract_id);
    const items = ids.length ? await contractRepo.findBy({ id: In(ids) }) : [];
    // Only return essentials
    return { items: items.map(i => ({ id: i.id, name: i.name })) };
  }

  async bulkReplaceContractsForSpendItem(spendItemId: string, contractIds: string[], opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(ContractSpendItem);
    const uniqueIds = Array.from(new Set((contractIds || []).filter(Boolean)));
    const existing = await repo.find({ where: { spend_item_id: spendItemId } });
    const toDelete = existing.filter(e => !uniqueIds.includes(e.contract_id));
    const existingSet = new Set(existing.map(e => e.contract_id));
    const toInsert = uniqueIds.filter(id => !existingSet.has(id)).map(id => repo.create({ contract_id: id, spend_item_id: spendItemId }));
    if (toDelete.length > 0) await repo.remove(toDelete);
    if (toInsert.length > 0) await repo.save(toInsert);
    return { ok: true, added: toInsert.length, removed: toDelete.length };
  }

  // Symmetric linking from CAPEX side
  async listContractsForCapexItem(capexItemId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    // Use dedicated repo for CAPEX join
    const capexLinksRepo = mg.getRepository(ContractCapexItem);
    const contractRepo = mg.getRepository(Contract);
    const rows = await capexLinksRepo.find({ where: { capex_item_id: capexItemId } as any });
    const ids = rows.map((r: any) => r.contract_id);
    const items = ids.length ? await contractRepo.findBy({ id: In(ids) as any }) : [];
    return { items: items.map((i) => ({ id: i.id, name: i.name })) };
  }

  async bulkReplaceContractsForCapexItem(capexItemId: string, contractIds: string[], opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const capexLinksRepo = mg.getRepository(ContractCapexItem);
    const uniqueIds = Array.from(new Set((contractIds || []).filter(Boolean)));
    const existing = await capexLinksRepo.find({ where: { capex_item_id: capexItemId } as any });
    const toDelete = existing.filter((e: any) => !uniqueIds.includes(e.contract_id));
    const existingSet = new Set(existing.map((e: any) => e.contract_id));
    const toInsert = uniqueIds
      .filter((id) => !existingSet.has(id))
      .map((id) => capexLinksRepo.create({ contract_id: id, capex_item_id: capexItemId } as any));
    if (toDelete.length > 0) await capexLinksRepo.remove(toDelete as any);
    if (toInsert.length > 0) await capexLinksRepo.save(toInsert as any);
    return { ok: true, added: toInsert.length, removed: toDelete.length };
  }

  // Inverse links from Contract side
  async listLinkedCapexItems(contractId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(ContractCapexItem);
    const capexRepo = mg.getRepository((await import('../capex/capex-item.entity')).CapexItem);
    const rows = await repo.find({ where: { contract_id: contractId } as any });
    const ids = rows.map((r) => (r as any).capex_item_id);
    const items = ids.length ? await capexRepo.findBy({ id: In(ids) as any } as any) : [];
    return { items: items.map((i: any) => ({ id: i.id, description: i.description })) };
  }

  async bulkReplaceLinkedCapexItems(contractId: string, capexItemIds: string[], opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(ContractCapexItem);
    const uniqueIds = Array.from(new Set((capexItemIds || []).filter(Boolean)));
    const existing = await repo.find({ where: { contract_id: contractId } as any });
    const toDelete = existing.filter((e: any) => !uniqueIds.includes(e.capex_item_id));
    const existingSet = new Set(existing.map((e: any) => e.capex_item_id));
    const toInsert = uniqueIds.filter((id) => !existingSet.has(id)).map((id) => repo.create({ contract_id: contractId, capex_item_id: id } as any));
    if (toDelete.length > 0) await repo.remove(toDelete as any);
    if (toInsert.length > 0) await repo.save(toInsert as any);
    return { ok: true, added: toInsert.length, removed: toDelete.length };
  }
}
