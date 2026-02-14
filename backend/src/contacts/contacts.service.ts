import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, In, Repository } from 'typeorm';
import { ExternalContact } from './external-contact.entity';
import { SupplierContactLink, SupplierContactRole } from './supplier-contact.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { SupplierContactsService } from '../suppliers/supplier-contacts.service';
import { buildWhereFromAgFilters, parsePagination } from '../common/pagination';
import { format } from '@fast-csv/format';
import { parseString } from '@fast-csv/parse';
import * as fs from 'fs';
import { decodeCsvBufferUtf8OrThrow } from '../common/encoding';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(ExternalContact)
    private readonly repo: Repository<ExternalContact>,
    @InjectRepository(SupplierContactLink)
    private readonly linkRepo: Repository<SupplierContactLink>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @Inject(forwardRef(() => SupplierContactsService))
    private readonly supplierContactsService: SupplierContactsService,
  ) {}

  private getRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(ExternalContact) : this.repo;
  }

  private getLinkRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(SupplierContactLink) : this.linkRepo;
  }

  private getSupplierRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(Supplier) : this.supplierRepo;
  }

  private normalizeSupplierRole(role: any): SupplierContactRole | null {
    if (role === '' || role == null) return null;
    const val = String(role) as SupplierContactRole;
    return (Object.values(SupplierContactRole) as string[]).includes(val) ? val : null;
  }

  private async syncPrimarySupplierLink(
    contactId: string,
    supplierId: string | null,
    role: SupplierContactRole | null,
    opts?: { manager?: EntityManager },
  ) {
    const linkRepo = this.getLinkRepo(opts?.manager);
    // Ensure only one primary link per contact; remove previous ones first
    await linkRepo.delete({ contact_id: contactId, is_primary: true } as any);
    if (!supplierId || !role) return null;
    const existing = await linkRepo.findOne({ where: { contact_id: contactId, supplier_id: supplierId, role, is_primary: true } });
    if (existing) return existing;
    const link = linkRepo.create({ contact_id: contactId, supplier_id: supplierId, role, is_primary: true });
    return linkRepo.save(link);
  }

  private async findSupplierRole(
    contactId: string,
    supplierId: string | null,
    manager?: EntityManager,
  ): Promise<SupplierContactRole | null> {
    if (!supplierId) return null;
    const linkRepo = this.getLinkRepo(manager);
    const primary = await linkRepo.findOne({ where: { contact_id: contactId, supplier_id: supplierId, is_primary: true } });
    if (primary) return primary.role;
    const anyLink = await linkRepo.findOne({ where: { contact_id: contactId, supplier_id: supplierId } });
    return anyLink?.role ?? null;
  }

  async list(query: any, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const { page, limit, skip, sort, q, filters } = parsePagination(query);
    const allowedSortFields = [
      'last_name', 'first_name', 'email', 'active', 'created_at', 'updated_at', 'supplier_name'
    ];
    const qb = repo.createQueryBuilder('c').leftJoinAndSelect('c.supplier', 's');

    const filterWhere = buildWhereFromAgFilters(filters, ['last_name', 'first_name', 'email', 'phone', 'mobile', 'country', 'active', 'supplier_id']);
    if (Object.keys(filterWhere).length > 0) qb.where(filterWhere);

    const supplierNameFilter = filters?.supplier_name;
    if (supplierNameFilter) {
      let model: any = supplierNameFilter;
      if (model && model.operator && Array.isArray(model.conditions) && model.conditions.length > 0) {
        model = model.conditions[0];
      }
      const type = (model?.type ?? model?.filterType ?? 'contains') as string;
      const valRaw = model?.filter ?? model?.value ?? (Array.isArray(model?.values) ? model.values[0] : undefined);
      const requiresValue = !(type === 'blank' || type === 'notBlank');
      if (!requiresValue || (valRaw != null && valRaw !== '')) {
        const val = valRaw != null ? String(valRaw) : '';
        switch (type) {
          case 'equals':
            qb.andWhere('s.name ILIKE :supplierFilterEq', { supplierFilterEq: val });
            break;
          case 'notEqual':
            qb.andWhere('s.name NOT ILIKE :supplierFilterNe', { supplierFilterNe: val });
            break;
          case 'startsWith':
            qb.andWhere('s.name ILIKE :supplierFilterSw', { supplierFilterSw: `${val}%` });
            break;
          case 'endsWith':
            qb.andWhere('s.name ILIKE :supplierFilterEw', { supplierFilterEw: `%${val}` });
            break;
          case 'notContains':
            qb.andWhere('s.name NOT ILIKE :supplierFilterNc', { supplierFilterNc: `%${val}%` });
            break;
          case 'blank':
            qb.andWhere("s.name IS NULL OR NULLIF(s.name, '') IS NULL");
            break;
          case 'notBlank':
            qb.andWhere("s.name IS NOT NULL AND NULLIF(s.name, '') IS NOT NULL");
            break;
          case 'contains':
          default:
            qb.andWhere('s.name ILIKE :supplierFilter', { supplierFilter: `%${val}%` });
            break;
        }
      }
    }

    if (typeof query?.active === 'string') {
      const v = String(query.active).toLowerCase();
      if (v === 'true' || v === 'false') qb.andWhere({ active: v === 'true' });
    }

    if (q) {
      const like = `%${q}%`;
      qb.andWhere(new Brackets((qb2) => qb2
        .where('c.email ILIKE :like', { like })
        .orWhere('c.first_name ILIKE :like', { like })
        .orWhere('c.last_name ILIKE :like', { like })
        .orWhere('c.phone ILIKE :like', { like })
        .orWhere('c.mobile ILIKE :like', { like })
        .orWhere('s.name ILIKE :like', { like })
      ));
    }

    const orderField = allowedSortFields.includes(sort.field) ? sort.field : 'created_at';
    if (orderField === 'supplier_name') qb.orderBy('s.name', sort.direction as any);
    else qb.orderBy(`c.${orderField}`, sort.direction as any);

    qb.skip(skip).take(limit);
    const [items, total] = await qb.getManyAndCount();
    const withSupplier = items.map(({ supplier, ...rest }) => ({ ...rest, supplier_name: supplier?.name ?? null }));
    return { items: withSupplier, total, page, limit };
  }

  async get(id: string, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const item = await repo.findOne({ where: { id }, relations: ['supplier'] });
    if (!item) throw new NotFoundException('Contact not found');
    const supplierRole = await this.findSupplierRole(id, item.supplier_id, opts?.manager);
    const { supplier, ...rest } = item as any;
    return { ...rest, supplier_role: supplierRole ?? null, supplier_name: supplier?.name ?? null };
  }

  async create(body: Partial<ExternalContact>, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const supplierRepo = this.getSupplierRepo(opts?.manager);
    if (!body?.email) throw new BadRequestException('email is required');
    const email = String(body.email).trim().toLowerCase();
    const existing = await repo.findOne({ where: { email } });
    if (existing) throw new BadRequestException('A contact with this email already exists');
    const supplierId = body?.supplier_id ? String(body.supplier_id) : null;
    const supplierRole = this.normalizeSupplierRole((body as any)?.supplier_role);
    if ((body as any)?.supplier_role != null && !supplierRole) {
      throw new BadRequestException('Invalid supplier role');
    }
    if (supplierRole && !supplierId) {
      throw new BadRequestException('supplier_role requires supplier_id');
    }
    if (supplierId) {
      const supplier = await supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) throw new BadRequestException('Supplier not found');
    }
    const entity = repo.create({
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,
      job_title: body.job_title ?? null,
      email,
      phone: body.phone ?? null,
      mobile: body.mobile ?? null,
      country: body.country ?? null,
      notes: body.notes ?? null,
      active: body.active ?? true,
      supplier_id: supplierId,
    });
    const saved = await repo.save(entity);
    await this.syncPrimarySupplierLink(saved.id, supplierId, supplierRole, opts);

    // Propagate contact to linked items when created with supplier+role
    if (supplierId && supplierRole) {
      await this.supplierContactsService.propagateContactToItemsPublic(supplierId, saved.id, supplierRole, opts);
    }

    const supplier_role = await this.findSupplierRole(saved.id, supplierId, opts?.manager);
    return { ...saved, supplier_role };
  }

  async update(id: string, body: Partial<ExternalContact>, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const supplierRepo = this.getSupplierRepo(opts?.manager);
    const existing = await repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Contact not found');
    const supplierRoleProvided = Object.prototype.hasOwnProperty.call(body, 'supplier_role');
    const supplierRole = supplierRoleProvided ? this.normalizeSupplierRole((body as any).supplier_role) : null;
    if (supplierRoleProvided && (body as any).supplier_role != null && !supplierRole) {
      throw new BadRequestException('Invalid supplier role');
    }
    if (body.email) {
      const email = String(body.email).trim().toLowerCase();
      if (email !== existing.email) {
        const dup = await repo.findOne({ where: { email } });
        if (dup) throw new BadRequestException('A contact with this email already exists');
        existing.email = email;
      }
    }
    // Assign only when properties are present in the payload.
    // This allows setting fields to null (clearing values) without being skipped by '??'.
    const has = (k: keyof ExternalContact | string) => Object.prototype.hasOwnProperty.call(body, k);
    if (has('first_name')) existing.first_name = (body as any).first_name ?? null;
    if (has('last_name')) existing.last_name = (body as any).last_name ?? null;
    if (has('job_title')) existing.job_title = (body as any).job_title ?? null;
    if (has('phone')) existing.phone = (body as any).phone ?? null;
    if (has('mobile')) existing.mobile = (body as any).mobile ?? null;
    if (has('country')) existing.country = (body as any).country ?? null;
    if (has('notes')) existing.notes = (body as any).notes ?? null;
    if (has('supplier_id')) {
      const rawSupplierId = (body as any).supplier_id;
      const supplierId = rawSupplierId ? String(rawSupplierId) : null;
      if (supplierId) {
        const supplier = await supplierRepo.findOne({ where: { id: supplierId } });
        if (!supplier) throw new BadRequestException('Supplier not found');
      }
      existing.supplier_id = supplierId;
    }
    if (supplierRoleProvided && supplierRole && !existing.supplier_id) {
      throw new BadRequestException('supplier_role requires supplier_id');
    }
    if (typeof body.active === 'boolean') existing.active = body.active;
    const saved = await repo.save(existing);
    if (supplierRoleProvided || has('supplier_id')) {
      const roleForSync = supplierRoleProvided ? supplierRole ?? null : await this.findSupplierRole(saved.id, saved.supplier_id, opts?.manager);
      await this.syncPrimarySupplierLink(saved.id, saved.supplier_id, roleForSync, opts);

      // Propagate contact to linked items (spend, capex, contracts) when supplier+role is set
      if (saved.supplier_id && roleForSync) {
        await this.supplierContactsService.propagateContactToItemsPublic(saved.supplier_id, saved.id, roleForSync, opts);
      }
    }
    const supplier_role = await this.findSupplierRole(saved.id, saved.supplier_id, opts?.manager);
    return { ...saved, supplier_role };
  }

  async delete(id: string, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const linkRepo = this.getLinkRepo(opts?.manager);
    // Ensure links are removed first
    const links = await linkRepo.find({ where: { contact_id: id } });
    if (links.length > 0) {
      await linkRepo.delete({ id: In(links.map((l) => l.id)) as any });
    }
    await repo.delete({ id });
    return { ok: true };
  }

  // CSV helpers for contacts
  private csvHeaders(): string[] {
    return [
      'first_name', 'last_name', 'job_title', 'email', 'phone', 'mobile', 'country', 'notes', 'active'
    ];
  }

  async exportCsv(scope: 'template' | 'data' = 'data', opts?: { manager?: EntityManager }): Promise<{ filename: string; content: string }> {
    const repo = this.getRepo(opts?.manager);
    const headers = this.csvHeaders();
    const delimiter = ';';
    const rows: any[] = [];
    if (scope === 'data') {
      const items = await repo.find({ order: { created_at: 'DESC' as any } });
      for (const c of items) {
        rows.push({
          first_name: c.first_name ?? '',
          last_name: c.last_name ?? '',
          job_title: c.job_title ?? '',
          email: c.email ?? '',
          phone: c.phone ?? '',
          mobile: c.mobile ?? '',
          country: c.country ?? '',
          notes: c.notes ?? '',
          active: c.active ? 'true' : 'false',
        });
      }
    }
    const filename = scope === 'template' ? 'contacts_template.csv' : 'contacts.csv';
    const chunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = format({ headers, delimiter });
      stream.on('data', (chunk) => chunks.push(chunk.toString('utf8')));
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
      if (scope === 'template') {
        const headerLine = headers.join(delimiter) + '\n';
        chunks.push(headerLine);
        stream.end();
      } else {
        for (const row of rows) stream.write(row);
        stream.end();
      }
    });
    const content = '\ufeff' + chunks.join('');
    return { filename, content };
  }

  async importCsv(
    { file, dryRun }: { file: Express.Multer.File; dryRun: boolean },
    opts?: { manager?: EntityManager },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const delimiter = ';';
    const expectedHeaders = this.csvHeaders();
    type Row = Record<string, string>;
    const rows: Row[] = [];
    const errors: { row: number; message: string }[] = [];
    let headerOk = false;
    await new Promise<void>((resolve, reject) => {
      const buf = file.buffer ?? ((file as any).path ? fs.readFileSync((file as any).path) : undefined);
      if (!buf) {
        reject(new BadRequestException('Empty upload'));
        return;
      }
      let content: string;
      try {
        content = decodeCsvBufferUtf8OrThrow(buf as Buffer);
      } catch {
        reject(new BadRequestException('Invalid file encoding. Please export or save the CSV as UTF-8 (CSV UTF-8) and use semicolons as separators.'));
        return;
      }
      parseString(content, { headers: true, delimiter, ignoreEmpty: true, trim: true })
        .on('headers', (headers: string[]) => {
          const missing = expectedHeaders.filter((h) => !headers.includes(h));
          const extras = headers.filter((h) => !expectedHeaders.includes(h));
          headerOk = missing.length === 0 && extras.length === 0;
          if (!headerOk) {
            errors.push({ row: 0, message: `Header mismatch. Missing: ${missing.join(', ') || '-'}, Extra: ${extras.join(', ') || '-'}` });
          }
        })
        .on('error', (err) => reject(err))
        .on('data', (row: Row) => rows.push(row))
        .on('end', () => resolve());
    });
    if (!headerOk) {
      return { ok: false, dryRun, total: 0, inserted: 0, updated: 0, errors };
    }
    const repo = this.getRepo(opts?.manager);

    // Validate + normalize
    type Norm = Partial<ExternalContact> & { email: string };
    const normalized: Norm[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const line = i + 2;
      const email = (r['email'] ?? '').toString().trim().toLowerCase();
      if (!email) { errors.push({ row: line, message: 'email is required' }); continue; }
      const activeRaw = (r['active'] ?? '').toString().trim().toLowerCase();
      let active: boolean | undefined;
      if (activeRaw) {
        if (['true','1','yes','y'].includes(activeRaw)) active = true;
        else if (['false','0','no','n'].includes(activeRaw)) active = false;
        else { errors.push({ row: line, message: 'invalid active value' }); continue; }
      }
      const country = (r['country'] ?? '').toString().trim();
      if (country && country.length !== 2) { errors.push({ row: line, message: 'country must be 2-letter ISO code' }); continue; }
      normalized.push({
        email,
        first_name: (r['first_name'] ?? '').toString().trim() || null,
        last_name: (r['last_name'] ?? '').toString().trim() || null,
        job_title: (r['job_title'] ?? '').toString().trim() || null,
        phone: (r['phone'] ?? '').toString().trim() || null,
        mobile: (r['mobile'] ?? '').toString().trim() || null,
        country: country || null,
        notes: (r['notes'] ?? '').toString().trim() || null,
        active: active ?? true,
      });
    }
    if (errors.length > 0) return { ok: false, dryRun, total: rows.length, inserted: 0, updated: 0, errors };

    // Deduplicate by email
    const uniqueMap = new Map<string, Norm>();
    for (const n of normalized) uniqueMap.set(n.email, n);
    const unique = [...uniqueMap.values()];
    if (dryRun) return { ok: true, dryRun: true, total: rows.length, inserted: 0, updated: 0, errors: [] };

    let inserted = 0, updated = 0;
    for (const item of unique) {
      const existing = await repo.findOne({ where: { email: item.email } });
      if (existing) {
        Object.assign(existing, item);
        await repo.save(existing);
        updated += 1;
      } else {
        const created = repo.create(item);
        await repo.save(created);
        inserted += 1;
      }
    }
    return { ok: true, dryRun: false, total: rows.length, inserted, updated, errors: [] };
  }
}
