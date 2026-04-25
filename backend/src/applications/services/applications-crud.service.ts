import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { format } from '@fast-csv/format';
import { parseString } from '@fast-csv/parse';
import { decodeCsvBufferUtf8OrThrow } from '../../common/encoding';
import { Application } from '../application.entity';
import { ApplicationOwner } from '../application-owner.entity';
import { ApplicationCompany } from '../application-company.entity';
import { ApplicationDepartment } from '../application-department.entity';
import { ApplicationLink } from '../application-link.entity';
import { ApplicationAttachment } from '../application-attachment.entity';
import { ApplicationDataResidency } from '../application-data-residency.entity';
import { AuditService } from '../../audit/audit.service';
import { ItOpsSettingsService } from '../../it-ops-settings/it-ops-settings.service';
import { StorageService } from '../../common/storage/storage.service';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { ApplicationsBaseService, ServiceOpts } from './applications-base.service';
import { validateUploadedFile } from '../../common/upload-validation';
import { fixMulterFilename } from '../../common/upload';

type OwnerQueryRow = ApplicationOwner & {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
};

/**
 * Service for core CRUD operations on applications.
 */
@Injectable()
export class ApplicationsCrudService extends ApplicationsBaseService {
  constructor(
    @InjectRepository(Application) appRepo: Repository<Application>,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly itOpsSettings: ItOpsSettingsService,
  ) {
    super(appRepo);
  }

  /**
   * Get a single application by ID with optional expansions.
   */
  async get(id: string, opts?: ServiceOpts & { include?: string | string[] }) {
    const mg = this.getManager(opts);
    const appId = await this.resolveApplicationIdentifier(id, mg);
    const includeRaw = Array.isArray(opts?.include) ? opts?.include.join(',') : String(opts?.include ?? '').trim();
    const include = new Set(includeRaw.split(',').map((s) => s.trim()).filter(Boolean));
    const app = await mg.getRepository(Application).findOne({ where: { id: appId } });
    if (!app) throw new NotFoundException('Application not found');
    const owners = await mg.query(
      `SELECT o.id,
              o.tenant_id,
              o.application_id,
              o.user_id,
              o.owner_type,
              o.created_at,
              u.email,
              u.first_name,
              u.last_name,
              NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), '') AS full_name
       FROM application_owners o
       LEFT JOIN users u ON u.id = o.user_id AND u.tenant_id = o.tenant_id
       WHERE o.application_id = $1 AND o.tenant_id = $2
       ORDER BY o.owner_type ASC, full_name ASC NULLS LAST, u.email ASC NULLS LAST, o.created_at ASC`,
      [appId, app.tenant_id],
    ).then((rows: OwnerQueryRow[]) => rows.map((row) => ({ ...row, full_name: row.full_name || row.email || row.user_id })));
    const companies = await mg.getRepository(ApplicationCompany).find({ where: { application_id: appId } as any });
    const departments = await mg.getRepository(ApplicationDepartment).find({ where: { application_id: appId } as any });
    const links = await mg.getRepository(ApplicationLink).find({ where: { application_id: appId } as any });
    const attachments = await mg.getRepository(ApplicationAttachment).find({ where: { application_id: appId } as any, order: { uploaded_at: 'DESC' as any } });
    const data_residency = await mg.getRepository(ApplicationDataResidency).find({ where: { application_id: appId } as any });
    const includeSupport = include.has('support') || include.has('support_contacts') || include.has('supportContacts');
    let support_contacts: Array<{ id: string; contact_id: string; role: string | null; contact?: any }> = [];
    if (includeSupport) {
      support_contacts = await this.listSupportContactsInternal(appId, mg);
    }
    const derived_total_users = await this.computeDerivedUsers(app.id, app.users_year, app.users_mode, { manager: mg });
    let instances: Array<any> = [];
    if (include.has('instances') || include.has('deployments')) {
      instances = await mg.query(
        `SELECT id, application_id, environment, lifecycle, status, base_url, region, zone, notes, sso_enabled, mfa_supported, disabled_at, created_at, updated_at
         FROM app_instances
         WHERE application_id = $1
         ORDER BY environment ASC, created_at ASC`,
        [appId],
      );
    }
    const result: any = { ...app, owners, companies, departments, links, attachments, data_residency, derived_total_users };
    if (includeSupport) {
      result.support_contacts = support_contacts;
    }
    if (include.has('instances')) {
      result.instances = instances;
    }
    if (include.has('deployments')) {
      result.deployments = instances;
    }
    return result;
  }

  /**
   * Create a new application.
   */
  async create(body: Partial<Application>, userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(Application);
    const tenantId = await this.getCurrentTenantId(mg);
    const nowYear = new Date().getFullYear();
    const lifecycle = await this.normalizeLifecycle(body.lifecycle, tenantId, mg, 'active');
    const category = this.normalizeCategory((body as any).category, 'line_of_business');
    const entity = repo.create({
      name: (body.name || '').toString().trim(),
      supplier_id: body.supplier_id ?? null,
      description: body.description ?? null,
      editor: (body.editor ?? null) as any,
      environment: ((body as any).environment || 'prod') as any,
      category,
      lifecycle,
      criticality: (body.criticality || 'medium') as any,
      data_class: (body.data_class ?? null) as any,
      hosting_model: (body.hosting_model ?? null) as any,
      external_facing: !!body.external_facing,
      is_suite: !!(body as any).is_suite,
      retired_date: (body as any).retired_date ? new Date((body as any).retired_date as any) : null,
      version: body.version ?? null,
      end_of_support_date: body.end_of_support_date ? new Date(body.end_of_support_date as any) : null,
      go_live_date: body.go_live_date ? new Date(body.go_live_date as any) : null,
      predecessor_id: body.predecessor_id ?? null,
      last_dr_test: body.last_dr_test ? new Date(body.last_dr_test as any) : null,
      sso_enabled: !!body.sso_enabled,
      mfa_supported: !!body.mfa_supported,
      etl_enabled: !!(body as any).etl_enabled,
      contains_pii: !!body.contains_pii,
      licensing: body.licensing ?? null,
      notes: body.notes ?? null,
      support_notes: (body as any).support_notes ?? null,
      users_mode: (body.users_mode || 'it_users') as any,
      users_year: typeof body.users_year === 'number' ? body.users_year : nowYear,
      users_override: body.users_override ?? null,
      status: 'enabled',
      disabled_at: null,
    });
    if (!entity.name) throw new BadRequestException('name is required');
    const saved = (await repo.save(entity as any)) as Application;
    await this.audit.log({ table: 'applications', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: mg });
    return saved;
  }

  /**
   * Update an existing application.
   */
  async update(id: string, body: Partial<Application>, userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(Application);
    const appId = await this.resolveApplicationIdentifier(id, mg);
    const existing = await this.get(appId, { manager: mg });
    const before = { ...existing };
    const patch: any = { ...body };
    if (patch.last_dr_test !== undefined) patch.last_dr_test = patch.last_dr_test ? new Date(patch.last_dr_test as any) : null;
    if (patch.retired_date !== undefined) patch.retired_date = patch.retired_date ? new Date(patch.retired_date as any) : null;
    if (patch.end_of_support_date !== undefined) patch.end_of_support_date = patch.end_of_support_date ? new Date(patch.end_of_support_date as any) : null;
    if (patch.go_live_date !== undefined) patch.go_live_date = patch.go_live_date ? new Date(patch.go_live_date as any) : null;
    if (patch.lifecycle !== undefined) {
      patch.lifecycle = await this.normalizeLifecycle(patch.lifecycle, existing.tenant_id, mg, existing.lifecycle);
    }
    if (patch.category !== undefined) {
      patch.category = this.normalizeCategory(patch.category, existing.category);
    }
    Object.assign(existing, patch);
    const saved = (await repo.save(existing as any)) as Application;
    await this.audit.log({ table: 'applications', recordId: saved.id, action: 'update', before, after: saved, userId }, { manager: mg });
    return saved;
  }

  /**
   * Delete an application (used internally, primary deletion via ApplicationsDeleteService).
   */
  async delete(id: string, userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(Application);
    const appId = await this.resolveApplicationIdentifier(id, mg);
    const existing = await repo.findOne({ where: { id: appId } });
    if (!existing) return { ok: true };
    await repo.delete({ id: appId } as any);
    await this.audit.log({ table: 'applications', recordId: appId, action: 'delete', before: existing, after: null, userId }, { manager: mg });
    return { ok: true };
  }

  // Links
  async listLinks(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    return mg.getRepository(ApplicationLink).find({ where: { application_id: resolvedAppId } as any, order: { created_at: 'DESC' as any } });
  }

  async createLink(appId: string, body: Partial<ApplicationLink>, userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationLink);
    const entity = repo.create({ application_id: resolvedAppId, description: body.description ?? null, url: String(body.url || '').trim() });
    if (!entity.url) throw new BadRequestException('url is required');
    const saved = await repo.save(entity);
    await this.audit.log({ table: 'application_links', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: mg });
    return saved;
  }

  async updateLink(appId: string, linkId: string, body: Partial<ApplicationLink>, userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationLink);
    const existing = await repo.findOne({ where: { id: linkId } });
    if (!existing || existing.application_id !== resolvedAppId) throw new NotFoundException('Link not found');
    const before = { ...existing };
    if (body.description !== undefined) existing.description = body.description as any;
    if (body.url !== undefined) existing.url = String(body.url || '').trim();
    const saved = await repo.save(existing);
    await this.audit.log({ table: 'application_links', recordId: saved.id, action: 'update', before, after: saved, userId }, { manager: mg });
    return saved;
  }

  async deleteLink(appId: string, linkId: string, userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationLink);
    const existing = await repo.findOne({ where: { id: linkId } });
    if (!existing || existing.application_id !== resolvedAppId) return { ok: true };
    await repo.delete({ id: linkId } as any);
    await this.audit.log({ table: 'application_links', recordId: linkId, action: 'delete', before: existing, after: null, userId }, { manager: mg });
    return { ok: true };
  }

  // Attachments
  async listAttachments(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    return mg.getRepository(ApplicationAttachment).find({ where: { application_id: resolvedAppId } as any, order: { uploaded_at: 'DESC' as any } });
  }

  async uploadAttachment(appId: string, file: Express.Multer.File, userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    if (!file) throw new BadRequestException('No file uploaded');
    const tenant_id = await this.resolveTenantId(mg);
    const buf = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer as any);
    if (!buf) throw new BadRequestException('Empty upload');
    const decodedName = fixMulterFilename(file.originalname);
    const validated = validateUploadedFile({
      originalName: decodedName,
      mimeType: (file as any).mimetype,
      buffer: buf as Buffer,
      size: (file as any).size,
    });
    const originalName = decodedName || `attachment${validated.extension}`;
    const stored = `${randomUUID()}_${originalName}`;
    const key = path.posix.join('files', tenant_id, 'applications', resolvedAppId, stored);
    await this.storage.putObject({ key, body: buf as Buffer, contentType: validated.mimeType, contentLength: validated.size, sse: 'AES256' });
    const repo = mg.getRepository(ApplicationAttachment);
    const saved = await repo.save(repo.create({ application_id: resolvedAppId, original_filename: originalName, stored_filename: stored, mime_type: validated.mimeType || null, size: validated.size, storage_path: key }));
    await this.audit.log({ table: 'application_attachments', recordId: (saved as any).id, action: 'create', before: null, after: saved, userId }, { manager: mg });
    return saved;
  }

  async downloadAttachment(attachmentId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(ApplicationAttachment);
    const found = await repo.findOne({ where: { id: attachmentId } });
    if (!found) throw new NotFoundException('Attachment not found');
    return found;
  }

  async deleteAttachment(attachmentId: string, userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(ApplicationAttachment);
    const found = await repo.findOne({ where: { id: attachmentId } });
    if (!found) return { ok: true };
    await repo.delete({ id: attachmentId } as any);
    try { await this.storage.deleteObject((found as any).storage_path); } catch {}
    await this.audit.log({ table: 'application_attachments', recordId: found.id, action: 'update', before: found, after: null, userId }, { manager: mg });
    return { ok: true };
  }

  // CSV Export/Import
  private csvHeaders(): string[] {
    return [
      'id', 'name', 'supplier_id', 'supplier_name', 'category', 'editor', 'lifecycle', 'criticality',
      'data_class', 'hosting_model', 'external_facing', 'last_dr_test', 'sso_enabled', 'mfa_supported',
      'contains_pii', 'licensing', 'notes', 'users_mode', 'users_year', 'users_override', 'status',
      'disabled_at', 'created_at', 'updated_at', 'business_owner_emails', 'it_owner_emails', 'data_residency',
    ];
  }

  async exportCsv(scope: 'template' | 'data' = 'data', opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const headers = this.csvHeaders();
    const delimiter = ';';
    const rows: any[] = [];
    if (scope === 'data') {
      const apps = await mg.getRepository(Application).find({ order: { created_at: 'DESC' as any } });
      if (apps.length) {
        const supplierIds = Array.from(new Set(apps.map((a) => a.supplier_id).filter(Boolean))) as string[];
        const sRows = supplierIds.length ? await mg.query(`SELECT id, name FROM suppliers WHERE id = ANY($1)`, [supplierIds]) : [];
        const sMap = new Map<string, any>(sRows.map((r: any) => [r.id, r]));
        const appIds = apps.map((a) => a.id);
        const ownerRows = appIds.length ? await mg.query(
          `SELECT o.application_id, u.email, o.owner_type FROM application_owners o LEFT JOIN users u ON u.id = o.user_id WHERE o.application_id = ANY($1)`, [appIds],
        ) : [];
        const ownersMap = new Map<string, { business: string[]; it: string[] }>();
        for (const r of ownerRows) {
          const key = r.application_id;
          if (!ownersMap.has(key)) ownersMap.set(key, { business: [], it: [] });
          if (r.owner_type === 'business') ownersMap.get(key)!.business.push(r.email || '');
          else ownersMap.get(key)!.it.push(r.email || '');
        }
        const resRows = appIds.length ? await mg.query(`SELECT application_id, country_iso FROM application_data_residency WHERE application_id = ANY($1)`, [appIds]) : [];
        const resMap = new Map<string, string[]>();
        for (const r of resRows) {
          const key = r.application_id;
          if (!resMap.has(key)) resMap.set(key, []);
          resMap.get(key)!.push((r.country_iso || '').toUpperCase());
        }
        for (const a of apps) {
          const owners = ownersMap.get(a.id) || { business: [], it: [] };
          const residency = resMap.get(a.id) || [];
          rows.push({
            id: a.id, name: a.name, supplier_id: a.supplier_id ?? '', supplier_name: a.supplier_id ? (sMap.get(a.supplier_id)?.name ?? '') : '',
            category: a.category, editor: a.editor ?? '', lifecycle: a.lifecycle, criticality: a.criticality, data_class: a.data_class,
            hosting_model: a.hosting_model, external_facing: a.external_facing ? 'yes' : 'no', last_dr_test: a.last_dr_test ?? '',
            sso_enabled: a.sso_enabled ? 'yes' : 'no', mfa_supported: a.mfa_supported ? 'yes' : 'no', contains_pii: a.contains_pii ? 'yes' : 'no',
            licensing: a.licensing ?? '', notes: a.notes ?? '', users_mode: a.users_mode, users_year: a.users_year, users_override: a.users_override ?? '',
            status: a.status, disabled_at: a.disabled_at ?? '', created_at: a.created_at ?? '', updated_at: a.updated_at ?? '',
            business_owner_emails: owners.business.join(','), it_owner_emails: owners.it.join(','), data_residency: residency.join(','),
          });
        }
      }
    }
    const filename = scope === 'template' ? 'applications_template.csv' : 'applications.csv';
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

  async importCsv(
    { file, dryRun, userId }: { file: Express.Multer.File; dryRun: boolean; userId?: string | null },
    opts?: ServiceOpts,
  ) {
    const mg = this.getManager(opts);
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
    const errors: { row: number; message: string }[] = [];
    if (rows.length === 0) return { ok: false, dryRun, total: 0, inserted: 0, updated: 0, errors: [{ row: 0, message: 'Empty CSV' }] };

    const allSuppliers = await mg.query(`SELECT id, name FROM suppliers`);
    const sByName = new Map<string, any>(allSuppliers.map((r: any) => [String(r.name || ''), r]));
    const sById = new Map<string, any>(allSuppliers.map((r: any) => [String(r.id || ''), r]));
    const allUsers = await mg.query(`SELECT id, email FROM users`);
    const uByEmail = new Map<string, any>(allUsers.map((r: any) => [String(r.email || '').toLowerCase(), r]));

    let line = 1;
    type Parsed = Partial<Application> & { id?: string | null; business_owner_emails?: string[]; it_owner_emails?: string[]; data_residency?: string[]; supplier_name?: string; supplier_id?: string | null; __row: number };
    const parsed: Parsed[] = [];
    for (const r of rows) {
      line += 1;
      const id = ((r['id'] ?? '').toString().trim() || null);
      const name = (r['name'] ?? '').toString().trim();
      if (!name) errors.push({ row: line, message: 'name is required' });
      const supplier_name = (r['supplier_name'] ?? '').toString().trim() || undefined;
      const supplier_id_raw = (r['supplier_id'] ?? '').toString().trim() || undefined;
      const supplier_id_input = supplier_id_raw && sById.has(supplier_id_raw) ? supplier_id_raw : undefined;
      const category = (r['category'] ?? 'line_of_business').toString().trim().toLowerCase();
      const editor = (r['editor'] ?? '').toString().trim() || null;
      const lifecycle = (r['lifecycle'] ?? 'active').toString().trim() as any;
      const criticality = (r['criticality'] ?? 'medium').toString().trim() as any;
      const data_class = ((r['data_class'] ?? '').toString().trim() || null) as any;
      const hosting_model = ((r['hosting_model'] ?? '').toString().trim() || null) as any;
      const last_dr_test = ((r['last_dr_test'] ?? '').toString().trim() || null) as any;
      const licensing = ((r['licensing'] ?? '').toString().trim() || null) as any;
      const notes = ((r['notes'] ?? '').toString().trim() || null) as any;
      const external_facing = this.parseBool(r['external_facing']);
      const sso_enabled = this.parseBool(r['sso_enabled']);
      const mfa_supported = this.parseBool(r['mfa_supported']);
      const contains_pii = this.parseBool(r['contains_pii']);
      const users_mode = ((r['users_mode'] ?? '').toString().trim() || undefined) as any;
      const users_year = (() => { const n = Number((r['users_year'] ?? '').toString()); return Number.isFinite(n) ? n : undefined; })();
      const users_override = (() => { const n = Number((r['users_override'] ?? '').toString()); return Number.isFinite(n) ? n : undefined; })();
      const status = ((r['status'] ?? '').toString().trim().toLowerCase() === 'disabled') ? 'disabled' : 'enabled';
      const disabled_at = ((r['disabled_at'] ?? '').toString().trim() || null) as any;
      const business_owner_emails = (r['business_owner_emails'] ?? '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
      const it_owner_emails = (r['it_owner_emails'] ?? '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
      const data_residency = (r['data_residency'] ?? '').toString().split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
      parsed.push({
        id, name, supplier_name, supplier_id: supplier_id_input ?? null, category, editor, lifecycle, criticality, data_class, hosting_model, last_dr_test, licensing, notes,
        external_facing, sso_enabled, mfa_supported, contains_pii, users_mode, users_year, users_override, status, disabled_at,
        business_owner_emails, it_owner_emails, data_residency, __row: line,
      } as any);
    }
    const tenantId = await this.getCurrentTenantId(mg);
    for (const entry of parsed) {
      try {
        entry.lifecycle = await this.normalizeLifecycle(entry.lifecycle, tenantId, mg, 'active') as any;
      } catch (e: any) {
        const message = e?.message || 'Invalid lifecycle value';
        errors.push({ row: entry.__row, message });
      }
    }
    if (errors.length > 0) return { ok: false, dryRun, total: rows.length, inserted: 0, updated: 0, errors };

    let inserted = 0; let updated = 0; let processed = 0;
    if (!dryRun) {
      for (const p of parsed) {
        processed += 1;
        let supplier_id: string | null = p.supplier_id ?? null;
        if (!supplier_id && p.supplier_name) {
          const s = sByName.get(p.supplier_name);
          if (!s) { errors.push({ row: processed + 1, message: `supplier not found: '${p.supplier_name}'` }); continue; }
          supplier_id = s.id;
        }
        const repo = mg.getRepository(Application);
        let existing: Application | null = null;
        if (p.id) existing = await repo.findOne({ where: { id: p.id } });
        if (!existing) existing = await repo.findOne({ where: { name: p.name! } });
        if (!existing) {
          const nowYear = new Date().getFullYear();
          const entity = repo.create({
            name: p.name!, supplier_id, category: (p as any).category ?? 'line_of_business', editor: p.editor ?? null, lifecycle: (p.lifecycle as any) ?? 'active', criticality: (p.criticality as any) ?? 'medium',
            data_class: (p.data_class as any) ?? null, hosting_model: (p.hosting_model as any) ?? null, external_facing: !!p.external_facing,
            last_dr_test: (p.last_dr_test as any) ?? null, sso_enabled: !!p.sso_enabled, mfa_supported: !!p.mfa_supported, contains_pii: !!p.contains_pii,
            licensing: p.licensing ?? null, notes: p.notes ?? null,
            users_mode: (p.users_mode as any) ?? 'it_users', users_year: p.users_year ?? nowYear, users_override: (p.users_override as any) ?? null,
            status: (p.status as any) ?? 'enabled', disabled_at: (p.disabled_at as any) ?? null,
          } as Partial<Application>);
          const saved = await repo.save(entity);
          existing = saved;
          inserted += 1;
        } else {
          Object.assign(existing, {
            supplier_id: supplier_id ?? existing.supplier_id, category: (p as any).category ?? existing.category,
            editor: p.editor ?? existing.editor, lifecycle: (p.lifecycle as any) ?? existing.lifecycle,
            criticality: (p.criticality as any) ?? existing.criticality, data_class: (p.data_class as any) ?? existing.data_class,
            hosting_model: (p.hosting_model as any) ?? existing.hosting_model, external_facing: p.external_facing ?? existing.external_facing,
            last_dr_test: (p.last_dr_test as any) ?? existing.last_dr_test, sso_enabled: p.sso_enabled ?? existing.sso_enabled, mfa_supported: p.mfa_supported ?? existing.mfa_supported,
            contains_pii: p.contains_pii ?? existing.contains_pii,
            licensing: (p.licensing !== undefined ? p.licensing : existing.licensing), notes: (p.notes !== undefined ? p.notes : existing.notes),
            users_mode: (p.users_mode as any) ?? existing.users_mode, users_year: p.users_year ?? existing.users_year, users_override: (p.users_override as any) ?? existing.users_override,
            status: (p.status as any) ?? existing.status, disabled_at: (p.disabled_at as any) ?? existing.disabled_at,
          } as any);
          await repo.save(existing);
          updated += 1;
        }
        const appId = existing.id;
        const ownerRepo = mg.getRepository(ApplicationOwner);
        const existingOwners = await ownerRepo.find({ where: { application_id: appId } as any });
        if (existingOwners.length) await ownerRepo.delete({ id: In(existingOwners.map((x) => x.id)) as any });
        const biz = (p as any).business_owner_emails as string[];
        const it = (p as any).it_owner_emails as string[];
        const ownerRows: Array<Partial<ApplicationOwner>> = [];
        const ownerKeys = new Set<string>();
        for (const email of biz) {
          const u = uByEmail.get(String(email || '').toLowerCase()); if (!u) continue;
          const key = `business:${u.id}`;
          if (ownerKeys.has(key)) continue;
          ownerKeys.add(key);
          ownerRows.push(ownerRepo.create({ application_id: appId, user_id: u.id, owner_type: 'business' } as Partial<ApplicationOwner>));
        }
        for (const email of it) {
          const u = uByEmail.get(String(email || '').toLowerCase()); if (!u) continue;
          const key = `it:${u.id}`;
          if (ownerKeys.has(key)) continue;
          ownerKeys.add(key);
          ownerRows.push(ownerRepo.create({ application_id: appId, user_id: u.id, owner_type: 'it' } as Partial<ApplicationOwner>));
        }
        if (ownerRows.length) await ownerRepo.save(ownerRows as any);
        const resRepo = mg.getRepository(ApplicationDataResidency);
        const existingRes = await resRepo.find({ where: { application_id: appId } as any });
        if (existingRes.length) await resRepo.delete({ id: In(existingRes.map((x) => x.id)) as any });
        const codes = ((p as any).data_residency as string[]).map((c) => String(c || '').toUpperCase()).filter((c) => !!c && c.length === 2);
        const unique = Array.from(new Set(codes));
        if (unique.length) await resRepo.save(unique.map((iso) => ({ application_id: appId, country_iso: iso } as Partial<ApplicationDataResidency>)) as any);
      }
    }
    return { ok: errors.length === 0, dryRun, total: rows.length, inserted, updated, processed, errors };
  }

  // Helper methods
  async normalizeLifecycle(
    value: unknown,
    tenantId: string,
    manager?: any,
    fallback?: string,
  ): Promise<string> {
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = (settings.lifecycleStates || []).map((item: any) => item.code);
    const fallbackCode = this.pickLifecycleFallback(fallback ?? 'active', allowed);
    if (value === undefined || value === null || String(value).trim() === '') {
      return fallbackCode;
    }
    const normalized = String(value).trim().toLowerCase();
    if (!allowed.includes(normalized)) {
      throw new BadRequestException(`Invalid lifecycle "${value}"`);
    }
    return normalized;
  }

  private pickLifecycleFallback(candidate: string, allowed: string[]): string {
    const normalized = String(candidate || '').trim().toLowerCase();
    if (normalized && allowed.includes(normalized)) {
      return normalized;
    }
    if (allowed.includes('active')) {
      return 'active';
    }
    return allowed[0] || 'active';
  }

  normalizeCategory(value: unknown, fallback: string = 'line_of_business'): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return fallback;
    return normalized;
  }

  // Derived users
  async computeDerivedUsers(appId: string, year: number, mode: 'manual' | 'it_users' | 'headcount', opts?: ServiceOpts): Promise<number> {
    const mg = this.getManager(opts);
    if (mode === 'manual') {
      const app = await mg.getRepository(Application).findOne({ where: { id: appId } });
      return Math.max(0, Number(app?.users_override || 0));
    }
    const compRepo = mg.getRepository(ApplicationCompany);
    const deptRepo = mg.getRepository(ApplicationDepartment);
    const { Department } = await import('../../departments/department.entity');
    const { CompanyMetric } = await import('../../companies/company-metric.entity');
    const { DepartmentMetric } = await import('../../departments/department-metric.entity');

    const [companies, departments] = await Promise.all([
      compRepo.find({ where: { application_id: appId } as any }),
      deptRepo.find({ where: { application_id: appId } as any }),
    ]);
    const companyIds = new Set(companies.map((c) => c.company_id));
    const departmentIds = departments.map((d) => d.department_id);
    let filteredDeptIds: string[] = departmentIds;
    if (departmentIds.length > 0 && companyIds.size > 0) {
      const deptEntities = await mg.getRepository(Department).find({ where: { id: In(departmentIds) as any } as any });
      filteredDeptIds = deptEntities.filter((d: any) => !companyIds.has(d.company_id)).map((d: any) => d.id);
    }
    let total = 0;
    if (companyIds.size > 0) {
      const metrics = await mg.getRepository(CompanyMetric).find({ where: { company_id: In([...companyIds]) as any, fiscal_year: year } as any });
      for (const m of metrics) {
        const it = (m as any).it_users as number | null | undefined;
        const hc = Number(m.headcount || 0);
        total += mode === 'it_users' ? (typeof it === 'number' && it != null ? it : hc) : hc;
      }
    }
    if (filteredDeptIds.length > 0) {
      const metrics = await mg.getRepository(DepartmentMetric).find({ where: { department_id: In(filteredDeptIds) as any, fiscal_year: year } as any });
      for (const m of metrics) {
        const hc = Number(m.headcount || 0);
        total += hc;
      }
    }
    return total;
  }

  async getTotalUsers(appId: string, yearOverride?: number, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const app = await mg.getRepository(Application).findOne({ where: { id: appId } });
    if (!app) throw new NotFoundException('Application not found');
    const year = typeof yearOverride === 'number' && !isNaN(yearOverride) ? yearOverride : app.users_year;
    const total = await this.computeDerivedUsers(appId, year, app.users_mode, { manager: mg });
    return { total, year };
  }

  // Support contacts internal helper (for get method)
  private async listSupportContactsInternal(appId: string, mg: any) {
    const rows = await mg.query(
      `SELECT sc.id, sc.contact_id, sc.role, c.first_name, c.last_name, c.email, c.phone, c.mobile
       FROM application_support_contacts sc
       JOIN contacts c ON c.id = sc.contact_id
       WHERE sc.application_id = $1
       ORDER BY sc.created_at ASC, sc.id ASC`,
      [appId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      contact_id: r.contact_id,
      role: r.role,
      contact: {
        id: r.contact_id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        phone: r.phone,
        mobile: r.mobile,
      },
    }));
  }
}
