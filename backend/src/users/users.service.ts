import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, ILike, Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { RolesService } from '../roles/roles.service';
import * as argon2 from 'argon2';
import { buildWhereFromAgFilters, parsePagination } from '../common/pagination';
import {
  buildQuickSearchConditions,
  compileAgFilterCondition,
  createParamNameGenerator,
  FilterTargetConfig,
} from '../common/ag-grid-filtering';
import { AuditService } from '../audit/audit.service';
import { BillingService } from '../billing/billing.service';
// import { PermissionsService, PermissionLevel } from '../permissions/permissions.service';
import { Company } from '../companies/company.entity';
import { Department } from '../departments/department.entity';
import { format } from '@fast-csv/format';
import { parseString } from '@fast-csv/parse';
import * as fs from 'fs';
import { decodeCsvBufferUtf8OrThrow } from '../common/encoding';
import { EmailService } from '../email/email.service';
import { createPasswordResetToken as buildPasswordResetToken, getPasswordResetExpirationMinutes } from '../auth/password-reset.util';

const SUPPORTED_USER_LOCALES = ['en', 'fr', 'de', 'es'] as const;
const SELF_SERVICE_FIELDS = ['first_name', 'last_name', 'job_title', 'business_phone', 'mobile_phone', 'locale'] as const;
const ADMIN_FIELDS = [...SELF_SERVICE_FIELDS, 'email', 'status', 'company_id', 'department_id', 'role_id'] as const;

type UpdateUserField = (typeof ADMIN_FIELDS)[number];
type UpdateUserActor =
  | {
      actorUserId?: string | null;
      canManageUsers?: boolean;
    }
  | string
  | null
  | undefined;

type AiUserQueryOpts = {
  manager?: EntityManager;
  tenantId?: string;
};

const buildAiUserDisplayNameSql = (alias: string): string =>
  `COALESCE(NULLIF(TRIM(CONCAT(${alias}.first_name, ' ', ${alias}.last_name)), ''), ${alias}.email)`;

const buildAiUserExpertiseSql = (configAlias: string): string =>
  `COALESCE((
    SELECT string_agg(DISTINCT area.value, ', ' ORDER BY area.value)
    FROM jsonb_array_elements_text(COALESCE(${configAlias}.areas_of_expertise, '[]'::jsonb)) area(value)
  ), '')`;

const AI_USER_CONTRIBUTOR_PROFILE_SQL = `CASE WHEN tmc.id IS NULL THEN 'not_configured' ELSE 'configured' END`;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(Company)
    private readonly companies: Repository<Company>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    private readonly rolesService: RolesService,
    private readonly billingService: BillingService,
    // private readonly permsService: PermissionsService,
    private readonly emailService: EmailService,
    private readonly audit?: AuditService,
  ) {}

  private getRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(User) : this.repo;
  }

  private buildAiUserBaseQuery(query: any, opts?: AiUserQueryOpts) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(User);
    const tenantId = String(opts?.tenantId || '').trim();
    const { page, limit, skip, sort, status, q, filters } = parsePagination(query, {
      field: 'last_name',
      direction: 'ASC',
    });
    const fm = filters && typeof filters === 'object' ? filters : undefined;
    const nextParam = createParamNameGenerator('u');

    type Target = FilterTargetConfig;
    const displayNameSql = buildAiUserDisplayNameSql('u');
    const expertiseSql = buildAiUserExpertiseSql('tmc');
    const targets: Record<string, Target> = {
      email: { expression: 'u.email', dataType: 'string' },
      first_name: { expression: 'u.first_name', dataType: 'string' },
      last_name: { expression: 'u.last_name', dataType: 'string' },
      status: { expression: 'u.status', dataType: 'string' },
      job_title: { expression: 'u.job_title', dataType: 'string' },
      locale: { expression: 'u.locale', dataType: 'string' },
      company_name: {
        expression: 'u.company_id',
        textExpression: `COALESCE(c.name, '')`,
        dataType: 'string',
      },
      department_name: {
        expression: 'u.department_id',
        textExpression: `COALESCE(d.name, '')`,
        dataType: 'string',
      },
      primary_role_name: {
        expression: 'u.role_id',
        textExpression: `COALESCE(r.role_name, '')`,
        dataType: 'string',
      },
      team_name: {
        expression: 'tmc.team_id',
        textExpression: `COALESCE(pt.name, '')`,
        dataType: 'string',
      },
      contributor_profile: {
        expression: AI_USER_CONTRIBUTOR_PROFILE_SQL,
        textExpression: AI_USER_CONTRIBUTOR_PROFILE_SQL,
        dataType: 'string',
      },
      project_availability: {
        expression: 'tmc.project_availability',
        numericExpression: 'tmc.project_availability',
        dataType: 'number',
      },
      areas_of_expertise: {
        expression: 'u.id',
        textExpression: expertiseSql,
        dataType: 'string',
      },
    };

    const qb = repo.createQueryBuilder('u')
      .leftJoin('roles', 'r', 'r.id = u.role_id AND r.tenant_id = u.tenant_id')
      .leftJoin('companies', 'c', 'c.id = u.company_id AND c.tenant_id = u.tenant_id')
      .leftJoin('departments', 'd', 'd.id = u.department_id AND d.tenant_id = u.tenant_id')
      .leftJoin('portfolio_team_member_configs', 'tmc', 'tmc.user_id = u.id AND tmc.tenant_id = u.tenant_id')
      .leftJoin('portfolio_teams', 'pt', 'pt.id = tmc.team_id AND pt.tenant_id = u.tenant_id');

    if (tenantId) {
      qb.andWhere('u.tenant_id = :tenantId', { tenantId });
    }

    if (status) {
      qb.andWhere('u.status = :status', { status });
    }

    if (fm) {
      for (const [field, model] of Object.entries(fm)) {
        const target = targets[field];
        if (!target) continue;
        const condition = compileAgFilterCondition(model, target, nextParam);
        if (!condition) continue;
        qb.andWhere(new Brackets((sub) => sub.where(condition.sql, condition.params)));
      }
    }

    const quickSearchExpressions = [
      displayNameSql,
      'u.email',
      `COALESCE(u.job_title, '')`,
      `COALESCE(r.role_name, '')`,
      `COALESCE(c.name, '')`,
      `COALESCE(d.name, '')`,
      `COALESCE(pt.name, '')`,
      expertiseSql,
    ];
    const quickSearch = q ? buildQuickSearchConditions(q, quickSearchExpressions, nextParam) : [];
    if (quickSearch.length > 0) {
      qb.andWhere(new Brackets((sub) => {
        quickSearch.forEach((condition, index) => {
          if (index === 0) sub.where(condition.sql, condition.params);
          else sub.orWhere(condition.sql, condition.params);
        });
      }));
    }

    return { qb, page, limit, skip, sort };
  }

  async listForAi(query: any, opts?: AiUserQueryOpts) {
    const { qb, page, limit, skip, sort } = this.buildAiUserBaseQuery(query, opts);
    const total = await qb.clone().getCount();

    const displayNameSql = buildAiUserDisplayNameSql('u');
    const expertiseSql = buildAiUserExpertiseSql('tmc');
    const sortFieldMap: Record<string, string> = {
      display_name: displayNameSql,
      email: 'u.email',
      first_name: 'u.first_name',
      last_name: 'u.last_name',
      status: 'u.status',
      job_title: 'u.job_title',
      company_name: 'c.name',
      department_name: 'd.name',
      primary_role_name: 'r.role_name',
      locale: 'u.locale',
      team_name: 'pt.name',
      contributor_profile: AI_USER_CONTRIBUTOR_PROFILE_SQL,
      project_availability: 'tmc.project_availability',
      created_at: 'u.created_at',
      updated_at: 'u.updated_at',
    };
    const sortField = sortFieldMap[sort.field] ?? 'u.last_name';

    const items = await qb
      .clone()
      .select('u.id', 'id')
      .addSelect('u.first_name', 'first_name')
      .addSelect('u.last_name', 'last_name')
      .addSelect('u.email', 'email')
      .addSelect('u.job_title', 'job_title')
      .addSelect('u.locale', 'locale')
      .addSelect('u.status', 'status')
      .addSelect('u.created_at', 'created_at')
      .addSelect('u.updated_at', 'updated_at')
      .addSelect('c.name', 'company_name')
      .addSelect('d.name', 'department_name')
      .addSelect('r.role_name', 'primary_role_name')
      .addSelect('pt.name', 'team_name')
      .addSelect('tmc.project_availability', 'project_availability')
      .addSelect(AI_USER_CONTRIBUTOR_PROFILE_SQL, 'contributor_profile')
      .addSelect(expertiseSql, 'areas_of_expertise')
      .addSelect(displayNameSql, 'display_name')
      .orderBy(sortField, sort.direction, 'NULLS LAST')
      .addOrderBy('u.email', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { items, total, page, limit };
  }

  async listIdsForAi(query: any, opts?: AiUserQueryOpts): Promise<{ ids: string[]; total: number }> {
    const { qb } = this.buildAiUserBaseQuery(query, opts);
    const rows = await qb
      .clone()
      .select('u.id', 'id')
      .orderBy('u.id', 'ASC')
      .getRawMany();
    const ids = rows.map((row: any) => row.id);
    return { ids, total: ids.length };
  }

  async listFilterValuesForAi(query: any, opts?: AiUserQueryOpts): Promise<Record<string, Array<string | null>>> {
    const mg = opts?.manager ?? this.repo.manager;
    const tenantId = String(opts?.tenantId || '').trim() || null;
    const rawFields = String(query?.fields || query?.field || '').split(',').map((field) => field.trim()).filter(Boolean);
    const result: Record<string, Array<string | null>> = {};

    for (const field of rawFields) {
      if (field === 'company_name') {
        const rows = await mg.query(
          `SELECT DISTINCT c.name AS value
           FROM users u
           LEFT JOIN companies c ON c.id = u.company_id AND c.tenant_id = u.tenant_id
           WHERE u.tenant_id = COALESCE($1, app_current_tenant())
           ORDER BY value ASC NULLS LAST`,
          [tenantId],
        );
        result[field] = rows.map((row: any) => row.value ?? null);
        continue;
      }
      if (field === 'department_name') {
        const rows = await mg.query(
          `SELECT DISTINCT d.name AS value
           FROM users u
           LEFT JOIN departments d ON d.id = u.department_id AND d.tenant_id = u.tenant_id
           WHERE u.tenant_id = COALESCE($1, app_current_tenant())
           ORDER BY value ASC NULLS LAST`,
          [tenantId],
        );
        result[field] = rows.map((row: any) => row.value ?? null);
        continue;
      }
      if (field === 'primary_role_name') {
        const rows = await mg.query(
          `SELECT DISTINCT r.role_name AS value
           FROM users u
           LEFT JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
           WHERE u.tenant_id = COALESCE($1, app_current_tenant())
           ORDER BY value ASC NULLS LAST`,
          [tenantId],
        );
        result[field] = rows.map((row: any) => row.value ?? null);
        continue;
      }
      if (field === 'locale') {
        const rows = await mg.query(
          `SELECT DISTINCT u.locale AS value
           FROM users u
           WHERE u.tenant_id = COALESCE($1, app_current_tenant())
           ORDER BY value ASC NULLS LAST`,
          [tenantId],
        );
        result[field] = rows.map((row: any) => row.value ?? null);
        continue;
      }
      if (field === 'team_name') {
        const rows = await mg.query(
          `SELECT DISTINCT pt.name AS value
           FROM users u
           LEFT JOIN portfolio_team_member_configs tmc ON tmc.user_id = u.id AND tmc.tenant_id = u.tenant_id
           LEFT JOIN portfolio_teams pt ON pt.id = tmc.team_id AND pt.tenant_id = u.tenant_id
           WHERE u.tenant_id = COALESCE($1, app_current_tenant())
           ORDER BY value ASC NULLS LAST`,
          [tenantId],
        );
        result[field] = rows.map((row: any) => row.value ?? null);
        continue;
      }
      if (field === 'areas_of_expertise') {
        const rows = await mg.query(
          `SELECT DISTINCT area.value AS value
           FROM users u
           JOIN portfolio_team_member_configs tmc ON tmc.user_id = u.id AND tmc.tenant_id = u.tenant_id
           CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(tmc.areas_of_expertise, '[]'::jsonb)) area(value)
           WHERE u.tenant_id = COALESCE($1, app_current_tenant())
           ORDER BY value ASC NULLS LAST`,
          [tenantId],
        );
        result[field] = rows.map((row: any) => row.value ?? null);
        continue;
      }
      result[field] = [];
    }

    return result;
  }

  async list(query: any, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const { page, limit, skip, sort, status, q, filters } = parsePagination(query);
    const allowedSortFields = [
      'email', 'first_name', 'last_name', 'job_title', 'status', 'created_at', 'updated_at'
    ];
    const where: any = {};
    if (status) where.status = status;
    let whereArr: any[] | undefined;
    if (filters && Object.keys(filters).length > 0) {
      Object.assign(where, buildWhereFromAgFilters(filters));
    }
    if (q) {
      const like = ILike(`%${q}%`);
      whereArr = [
        { ...where, email: like },
        { ...where, first_name: like },
        { ...where, last_name: like },
      ];
    }
    const [items, total] = await repo.findAndCount({
      where: whereArr ?? where,
      order: { [(allowedSortFields.includes(sort.field) ? sort.field : 'created_at')]: sort.direction as any },
      skip,
      take: limit,
      relations: ['role', 'company', 'department']
    });
    const safe = items.map(u => ({ ...u, password_hash: undefined }));
    return { items: safe, total, page, limit };
  }

  findByEmail(email: string, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    return repo.findOne({ where: { email }, relations: ['role'] });
  }

  async findById(id: string, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    return repo.findOne({
      where: { id },
      relations: ['role', 'company', 'department']
    });
  }

  async createUser(params: {
    email: string;
    password?: string | null;
    role_name?: string | null;
    role_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    job_title?: string | null;
    business_phone?: string | null;
    mobile_phone?: string | null;
    company_id?: string | null;
    department_id?: string | null;
    status?: string | null;
    tenant_id?: string;
  }, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const existing = await repo.findOne({ where: { email: params.email } });
    if (existing) return existing;

    // Find or create role
    let role: Role | null = null;
    if (params.role_id) {
      role = await this.rolesService.findById(params.role_id, { manager: opts?.manager });
    }
    const roleName = params.role_name ?? 'Contact';
    if (!role) {
      role = await this.rolesService.findByName(roleName, { manager: opts?.manager });
    }
    if (!role) {
      role = await this.rolesService.createRole({
        role_name: roleName,
        role_description: `${roleName} role`,
      }, { manager: opts?.manager });
    }

    const passwordProvided = params.password && params.password.trim().length > 0;
    const password_hash = passwordProvided
      ? await argon2.hash(params.password, { type: argon2.argon2id })
      : null;
    const status = (params.status && typeof params.status === 'string'
      ? params.status
      : 'enabled') as any;
    const user = repo.create({
      email: params.email,
      password_hash,
      role_id: role.id,
      tenant_id: params.tenant_id as any,
      first_name: params.first_name ?? null,
      last_name: params.last_name ?? null,
      job_title: params.job_title ?? null,
      business_phone: params.business_phone ?? null,
      mobile_phone: params.mobile_phone ?? null,
      company_id: params.company_id ?? null,
      department_id: params.department_id ?? null,
      status,
    });
    const saved = await repo.save(user);
    if (this.audit) {
      await this.audit.log(
        {
          table: 'users',
          recordId: saved.id,
          action: 'create',
          before: null,
          after: { ...saved, password_hash: undefined },
          userId: saved.id,
        },
        { manager: opts?.manager ?? repo.manager },
      );
    }
    return { ...saved, password_hash: undefined } as any;
  }

  async updateUser(
    id: string,
    body: Partial<User> & { password?: string },
    actor?: UpdateUserActor,
    opts?: { manager?: EntityManager },
  ) {
    const repo = this.getRepo(opts?.manager);
    const existing = await repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const isInternalUpdate = actor == null;
    const actorUserId = typeof actor === 'string' ? actor : actor?.actorUserId ?? null;
    const canManageUsers = typeof actor === 'string' ? false : actor?.canManageUsers === true;
    const isSelfService = actorUserId === id;

    if (!isInternalUpdate && !isSelfService && !canManageUsers) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PROFILE_UPDATE',
        message: 'You can only update your own profile.',
      });
    }

    const allowedFields = (isInternalUpdate || canManageUsers ? ADMIN_FIELDS : SELF_SERVICE_FIELDS) as readonly UpdateUserField[];
    const safeFields: Partial<User> = {};
    for (const field of allowedFields) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
      const value = body[field];
      if (field === 'locale') {
        if (value === null) {
          safeFields.locale = null;
          continue;
        }
        if (typeof value !== 'string') {
          throw new BadRequestException({
            code: 'INVALID_LOCALE',
            message: `Invalid locale. Allowed: ${SUPPORTED_USER_LOCALES.join(', ')}`,
          });
        }
        const normalizedLocale = value.trim().toLowerCase();
        if (!SUPPORTED_USER_LOCALES.includes(normalizedLocale as (typeof SUPPORTED_USER_LOCALES)[number])) {
          throw new BadRequestException({
            code: 'INVALID_LOCALE',
            message: `Invalid locale. Allowed: ${SUPPORTED_USER_LOCALES.join(', ')}`,
          });
        }
        safeFields.locale = normalizedLocale;
        continue;
      }
      (safeFields as Record<string, unknown>)[field] = value;
    }

    const next = { ...existing, ...safeFields } as User;
    if (body.password) {
      if (!isInternalUpdate) {
        throw new BadRequestException({
          code: 'PASSWORD_UPDATE_NOT_ALLOWED',
          message: 'Password updates are not supported on this endpoint.',
        });
      }
      next.password_hash = await argon2.hash(body.password, { type: argon2.argon2id });
    }
    const saved = await repo.save(next);
    if (this.audit) {
      await this.audit.log(
        {
          table: 'users',
          recordId: saved.id,
          action: 'update',
          before: { ...existing, password_hash: undefined },
          after: { ...saved, password_hash: undefined },
          userId: actorUserId,
        },
        { manager: opts?.manager ?? repo.manager },
      );
    }
    return { ...saved, password_hash: undefined } as any;
  }

  // CSV helpers for Users
  private csvHeaders(): string[] {
    return [
      'email',
      'first_name',
      'last_name',
      'role',
      'company_name',
      'department_name',
      'status',
    ];
  }

  async exportCsv(scope: 'template' | 'data' = 'data', opts?: { manager?: EntityManager }): Promise<{ filename: string; content: string }> {
    const headers = this.csvHeaders();
    const delimiter = ';';
    const rows: any[] = [];
    if (scope === 'data') {
      const repo = this.getRepo(opts?.manager);
      const items = await repo.find({ order: { created_at: 'DESC' as any }, relations: ['role', 'company', 'department'] });
      for (const u of items) {
        rows.push({
          email: u.email ?? '',
          first_name: u.first_name ?? '',
          last_name: u.last_name ?? '',
          role: u.role?.role_name ?? '',
          company_name: u.company?.name ?? '',
          department_name: u.department?.name ?? '',
          status: u.status ?? 'enabled',
        });
      }
    }
    const filename = scope === 'template' ? 'users_template.csv' : 'users.csv';
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
    { file, dryRun, userId }: { file: Express.Multer.File; dryRun: boolean; userId?: string | null },
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
    const companiesRepo = opts?.manager ? opts.manager.getRepository(Company) : this.companies;
    const departmentsRepo = opts?.manager ? opts.manager.getRepository(Department) : this.departments;

    // Role lookup/create cache
    const roleCache = new Map<string, Role | null>();
    const getRoleByName = async (name: string): Promise<Role | null> => {
      const key = name.toLowerCase();
      if (roleCache.has(key)) return roleCache.get(key) ?? null;
      let r = await this.rolesService.findByName(name, { manager: opts?.manager });
      if (!r && name) {
        r = await this.rolesService.createRole({ role_name: name, role_description: `${name} role` }, { manager: opts?.manager });
      }
      roleCache.set(key, r ?? null);
      return r ?? null;
    };
    // Company lookup cache
    const companyCache = new Map<string, Company | null>();
    const getCompanyByName = async (name: string): Promise<Company | null> => {
      const key = name.toLowerCase();
      if (companyCache.has(key)) return companyCache.get(key) ?? null;
      const c = await companiesRepo.findOne({ where: { name } });
      companyCache.set(key, c ?? null);
      return c ?? null;
    };
    // Department lookup cache (by company_id + name)
    const deptCache = new Map<string, Department | null>();
    const getDepartmentByName = async (companyId: string, name: string): Promise<Department | null> => {
      const key = `${companyId}|${name.toLowerCase()}`;
      if (deptCache.has(key)) return deptCache.get(key) ?? null;
      const d = await departmentsRepo.findOne({ where: { company_id: companyId, name } });
      deptCache.set(key, d ?? null);
      return d ?? null;
    };

    // Validate and normalize rows
    type Normalized = Partial<User> & { email: string; role_id: string; company_id: string | null; department_id: string | null };
    const normalized: Normalized[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const line = i + 2;
      const email = (r['email'] ?? '').toString().trim();
      const first_name = ((r['first_name'] ?? '').toString().trim()) || null;
      const last_name = ((r['last_name'] ?? '').toString().trim()) || null;
      let roleName = (r['role'] ?? '').toString().trim();
      const companyName = (r['company_name'] ?? '').toString().trim();
      const departmentName = (r['department_name'] ?? '').toString().trim();
      const statusRaw = (r['status'] ?? 'contact').toString().trim().toLowerCase();

      if (!email) errors.push({ row: line, message: 'email is required' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ row: line, message: 'email must be valid' });
      if (statusRaw && !['enabled','disabled','contact','invited'].includes(statusRaw)) {
        errors.push({ row: line, message: `Invalid status '${statusRaw}'. Use 'contact', 'invited', 'enabled' or 'disabled'.` });
      }

      let role: Role | null = null;
      if (!roleName) roleName = 'Contact';
      if (roleName) role = await getRoleByName(roleName);
      if (!role) errors.push({ row: line, message: `Unknown role '${roleName}'` });

      let company: Company | null = null;
      if (companyName) {
        company = await getCompanyByName(companyName);
        if (!company) errors.push({ row: line, message: `Unknown company '${companyName}'` });
      }

      let department: Department | null = null;
      if (departmentName) {
        if (!company) {
          errors.push({ row: line, message: 'department_name provided but company_name is missing or invalid' });
        } else {
          department = await getDepartmentByName(company.id, departmentName);
          if (!department) errors.push({ row: line, message: `Unknown department '${departmentName}' for company '${company.name}'` });
        }
      }

      if (role) {
        normalized.push({
          email,
          first_name,
          last_name,
          role_id: role.id,
          company_id: company ? company.id : null,
          department_id: department ? department.id : null,
          status: (['enabled','disabled','contact','invited'].includes(statusRaw) ? (statusRaw as any) : 'contact'),
        });
      }
    }

    if (errors.length > 0) {
      return { ok: false, dryRun, total: rows.length, inserted: 0, updated: 0, errors };
    }

    // Deduplicate by email (lowercased)
    const uniqueByEmail = new Map<string, Normalized>();
    for (const item of normalized) {
      const key = (item.email as string).toLowerCase();
      if (!uniqueByEmail.has(key)) uniqueByEmail.set(key, item);
    }
    const unique = Array.from(uniqueByEmail.values());

    // Count inserts/updates
    let inserted = 0;
    let updated = 0;
    for (const item of unique) {
      const existing = await repo.findOne({ where: { email: item.email } });
      if (existing) updated += 1; else inserted += 1;
    }
    if (dryRun) {
      return { ok: true, dryRun: true, total: rows.length, inserted, updated, errors: [] };
    }

    // Commit: upsert by email
    let processed = 0;
    for (const item of unique) {
      const existing = await repo.findOne({ where: { email: item.email } });
      if (existing) {
        const before = { ...existing };
        const next = { ...existing, ...item } as User;
        const saved = await repo.save(next);
        processed += 1;
        if (this.audit) {
          await this.audit.log(
            {
              table: 'users',
              recordId: saved.id,
              action: 'update',
              before: { ...before, password_hash: undefined },
              after: { ...saved, password_hash: undefined },
              userId: userId ?? null,
            },
            { manager: opts?.manager ?? repo.manager },
          );
        }
      } else {
        const created = repo.create({ ...item, password_hash: null, mfa_enabled: false });
        const saved = await repo.save(created);
        processed += 1;
        if (this.audit) {
          await this.audit.log(
            {
              table: 'users',
              recordId: saved.id,
              action: 'create',
              before: null,
              after: { ...saved, password_hash: undefined },
              userId: userId ?? null,
            },
            { manager: opts?.manager ?? repo.manager },
          );
        }
      }
    }
    return { ok: true, dryRun: false, total: rows.length, inserted, updated, processed, errors: [] };
  }

  async enableUser(id: string, actorId?: string | null, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const user = await repo.findOne({ where: { id } });
    if (!user) throw new BadRequestException('User not found');
    if (user.status === 'enabled') return user;
    const summary = await this.billingService.getSubscriptionSummary({ manager: opts?.manager });
    if (summary.seat_limit !== null && summary.seats_used >= summary.seat_limit) {
      throw new BadRequestException('No seats available. Your plan allows up to ' + summary.seat_limit + ' contributors.');
    }
    const before = { ...user };
    user.status = 'enabled' as any;
    const saved = await repo.save(user);
    if (this.audit) {
      await this.audit.log(
        { table: 'users', recordId: saved.id, action: 'update', before, after: saved, userId: actorId ?? null },
        { manager: opts?.manager ?? repo.manager },
      );
    }
    return { ...saved, password_hash: undefined } as any;
  }

  async disableUser(id: string, actorId?: string | null, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const user = await repo.findOne({ where: { id } });
    if (!user) throw new BadRequestException('User not found');
    if (user.status === 'disabled') return user;
    const before = { ...user };
    user.status = 'disabled' as any;
    const saved = await repo.save(user);
    if (this.audit) {
      await this.audit.log(
        { table: 'users', recordId: saved.id, action: 'update', before, after: saved, userId: actorId ?? null },
        { manager: opts?.manager ?? repo.manager },
      );
    }
    return { ...saved, password_hash: undefined } as any;
  }

  async inviteUser(id: string, actorId?: string | null, baseUrl?: string, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const user = await repo.findOne({ where: { id }, relations: ['role'] });
    if (!user) throw new BadRequestException('User not found');
    if (!user.email) throw new BadRequestException('User email is missing');

    let resolvedBaseUrl = baseUrl?.trim();
    if (!resolvedBaseUrl) {
      resolvedBaseUrl = (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || '').trim();
    }
    if (!resolvedBaseUrl) {
      throw new BadRequestException('application url is not configured');
    }
    const normalizedBase = resolvedBaseUrl.replace(/\/$/, '');

    const token = buildPasswordResetToken({ id: user.id, email: user.email, tenant_id: user.tenant_id });
    const expires = getPasswordResetExpirationMinutes();
    const inviteUrl = `${normalizedBase}/accept-invite#token=${encodeURIComponent(token)}`;

    await this.emailService.sendUserInviteEmail({
      to: user.email,
      inviteUrl,
      expiresInMinutes: expires,
      roleName: user.role?.role_name ?? null,
      locale: user.locale,
    });

    if (user.status === 'invited') {
      return { ...user, password_hash: undefined } as any;
    }

    const before = { ...user };
    user.status = 'invited' as any;
    const saved = await repo.save(user);
    if (this.audit) {
      await this.audit.log(
        { table: 'users', recordId: saved.id, action: 'update', before, after: saved, userId: actorId ?? null },
        { manager: opts?.manager ?? repo.manager },
      );
    }
    return { ...saved, password_hash: undefined } as any;
  }

  // Per-user permission editing removed in RBAC model
}
