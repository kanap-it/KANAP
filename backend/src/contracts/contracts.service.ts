import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, In, Repository, ILike, Raw } from 'typeorm';
import { Contract } from './contract.entity';
import { ContractSpendItem } from './contract-spend-item.entity';
import { ContractLink } from './contract-link.entity';
import { ContractAttachment } from './contract-attachment.entity';
import { AuditService } from '../audit/audit.service';
import { parsePagination, buildWhereFromAgFilters } from '../common/pagination';
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

  async list(query: any, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(Contract);
    const { page, limit, skip, sort, status, q, filters } = parsePagination(query, { field: 'created_at', direction: 'DESC' });
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const allowed = [
      'id','name','status','company_id','supplier_id','owner_user_id','start_date','duration_months','auto_renewal','notice_period_months','yearly_amount_at_signature','currency','billing_frequency','notes','created_at','updated_at'
    ];
    const filtersToApply = sanitizedFilters ?? filters;
    const where: any = {};
    if (filtersToApply && Object.keys(filtersToApply).length > 0) {
      Object.assign(where, buildWhereFromAgFilters(filtersToApply, allowed));
    }
    // Use status-based gating to avoid depending on disabled_at column availability
    const lifecycleStatus = status ?? statusFromAg ?? StatusState.ENABLED;
    where.status = lifecycleStatus;
    if (q) {
      // quick search on name
      where.name = (where.name ?? ILike(`%${q}%`));
    }
    let items: Contract[] = [];
    let total = 0;
    const sortField = (sort?.field || '').toString();
    const sortDir = (sort?.direction || 'DESC') as 'ASC'|'DESC';
    const needsDerivedSort = sortField === 'end_date' || sortField === 'cancellation_deadline';
    if (needsDerivedSort) {
      // Use QueryBuilder to order by expressions
      const qb = repo.createQueryBuilder('c');
      // Apply simple object where (supports Raw/ILike)
      qb.where(where);
      if (q) qb.andWhere('c.name ILIKE :q', { q: `%${q}%` });
      // end_date ~ start_date + interval '1 month' * duration_months
      if (sortField === 'end_date') {
        qb.addOrderBy("(c.start_date + COALESCE(c.duration_months, 0) * INTERVAL '1 month')", sortDir as any);
      } else {
        // cancellation_deadline ~ end_date - notice_months
        qb.addOrderBy(
          "(c.start_date + (COALESCE(c.duration_months, 0) - COALESCE(c.notice_period_months, 0)) * INTERVAL '1 month')",
          sortDir as any,
        );
      }
      qb.skip(skip).take(limit);
      const [rows, cnt] = await qb.getManyAndCount();
      items = rows; total = cnt;
    } else {
      const safeSortField = allowed.includes(sort.field) ? sort.field : 'created_at';
      const [rows, cnt] = await repo.findAndCount({ where, order: { [safeSortField]: sort.direction as any }, skip, take: limit });
      items = rows; total = cnt;
    }

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
      const user = await mg.query('SELECT id, email FROM users WHERE id = $1 AND status = \'enabled\'', [saved.owner_user_id]);
      if (user.length > 0) {
        this.notifications.notifyStatusChange({
          itemType: 'contract',
          itemId: saved.id,
          itemName: saved.name,
          oldStatus: before.status,
          newStatus: saved.status,
          recipients: [{ userId: user[0].id, email: user[0].email }],
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
  async createTask(contractId: string, body: any, userId?: string, opts?: { manager?: EntityManager }) {
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
    const allowed = [
      'id','name','status','company_id','supplier_id','owner_user_id','start_date','duration_months','auto_renewal','notice_period_months','yearly_amount_at_signature','currency','billing_frequency','notes','created_at','updated_at'
    ];
    const where: any = {};
    if (sanitizedFilters && Object.keys(sanitizedFilters).length > 0) {
      Object.assign(where, buildWhereFromAgFilters(sanitizedFilters, allowed));
    }
    const lifecycleStatus = status ?? statusFromAg ?? StatusState.ENABLED;
    if (lifecycleStatus === StatusState.DISABLED) {
      where.disabled_at = Raw((alias) => `${alias} IS NOT NULL AND ${alias} <= NOW()`);
    } else {
      where.disabled_at = Raw((alias) => `${alias} IS NULL OR ${alias} > NOW()`);
    }
    const sortField = (sort?.field || '').toString();
    const sortDir = (sort?.direction || 'DESC') as 'ASC'|'DESC';
    const needsDerivedSort = sortField === 'end_date' || sortField === 'cancellation_deadline';
    if (!needsDerivedSort) {
      const safeSortField = allowed.includes(sort.field) ? sort.field : 'created_at';
      const [rows, total] = await repo.findAndCount({ where, order: { [safeSortField]: sortDir as any }, skip, take: limit, select: ['id'] as any });
      return { ids: rows.map(r => (r as any).id as string), total };
    } else {
      const qb = repo.createQueryBuilder('c').select(['c.id']).where(where);
      if (q) qb.andWhere('c.name ILIKE :q', { q: `%${q}%` });
      if (sortField === 'end_date') {
        qb.addOrderBy("(c.start_date + COALESCE(c.duration_months, 0) * INTERVAL '1 month')", sortDir as any);
      } else {
        qb.addOrderBy(
          "(c.start_date + (COALESCE(c.duration_months, 0) - COALESCE(c.notice_period_months, 0)) * INTERVAL '1 month')",
          sortDir as any,
        );
      }
      qb.offset(skip).limit(limit);
      const [rows, total] = await qb.getManyAndCount();
      return { ids: rows.map(r => (r as any).id as string), total };
    }
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
