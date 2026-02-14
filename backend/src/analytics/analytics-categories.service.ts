import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AnalyticsCategory } from './analytics-category.entity';
import { parsePagination } from '../common/pagination';
import { AuditService } from '../audit/audit.service';
import { applyStatusFilter, extractStatusFilterFromAgModel } from '../common/status-filter';
import { StatusState, resolveLifecycleState } from '../common/status';

@Injectable()
export class AnalyticsCategoriesService {
  constructor(
    @InjectRepository(AnalyticsCategory)
    private readonly repo: Repository<AnalyticsCategory>,
    private readonly audit: AuditService,
  ) {}

  private getRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(AnalyticsCategory) : this.repo;
  }

  async list(query: any, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const { page, limit, skip, sort, status, q, filters } = parsePagination(query);
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const filtersToApply = sanitizedFilters ?? filters;
    const effectiveStatus = status ?? statusFromAg;
    const allowedSort = new Set(['name', 'status', 'created_at', 'updated_at']);
    const safeSortField = allowedSort.has(sort.field) ? sort.field : 'name';

    const qb = repo.createQueryBuilder('cat');
    if (effectiveStatus) {
      applyStatusFilter(qb, { alias: 'cat', explicitStatus: effectiveStatus as StatusState });
    } else {
      applyStatusFilter(qb, { alias: 'cat' });
    }
    if (q) {
      qb.andWhere('(cat.name ILIKE :term OR cat.description ILIKE :term)', { term: `%${q}%` });
    }
    if (filtersToApply && typeof filtersToApply === 'object') {
      const nameFilter = (filtersToApply as any).name;
      if (nameFilter && typeof nameFilter === 'object') {
        const value = nameFilter.filter ?? nameFilter.value ?? nameFilter;
        if (typeof value === 'string' && value.trim()) {
          qb.andWhere('cat.name ILIKE :filterName', { filterName: `%${value.trim()}%` });
        }
      }
    }

    const total = await qb.getCount();
    const items = await qb
      .orderBy(`cat.${safeSortField}`, sort.direction as 'ASC' | 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return { items, total, page, limit };
  }

  async get(id: string, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Analytics category not found');
    return entity;
  }

  async listIds(query: any, opts?: { manager?: EntityManager }): Promise<{ ids: string[]; total: number }> {
    const repo = this.getRepo(opts?.manager);
    const parsed = parsePagination({ ...query, page: 1, limit: query?.limit ?? 10000 });
    const { sort, status, q, filters } = parsed;
    const { status: statusFromAg, sanitizedFilters } = extractStatusFilterFromAgModel(filters);
    const effectiveStatus = status ?? statusFromAg;
    const allowedSort = new Set(['name', 'status', 'created_at', 'updated_at']);
    const safeSortField = allowedSort.has(sort.field) ? sort.field : 'name';

    const qb = repo.createQueryBuilder('cat').select('cat.id', 'id');
    if (effectiveStatus) {
      applyStatusFilter(qb, { alias: 'cat', explicitStatus: effectiveStatus as StatusState });
    } else {
      applyStatusFilter(qb, { alias: 'cat' });
    }
    if (q) {
      qb.andWhere('(cat.name ILIKE :term OR cat.description ILIKE :term)', { term: `%${q}%` });
    }
    if (sanitizedFilters && typeof sanitizedFilters === 'object') {
      const nameFilter = (sanitizedFilters as any).name;
      if (nameFilter && typeof nameFilter === 'object') {
        const value = nameFilter.filter ?? nameFilter.value ?? nameFilter;
        if (typeof value === 'string' && value.trim()) {
          qb.andWhere('cat.name ILIKE :filterName', { filterName: `%${value.trim()}%` });
        }
      }
    }

    qb.orderBy(`cat.${safeSortField}`, sort.direction as 'ASC' | 'DESC');
    const limit = Math.min(Number(query?.limit) || 10000, 10000);
    qb.take(limit);
    const rows = await qb.getRawMany();
    const ids = rows.map((r: any) => r.id as string).filter((v) => !!v);
    return { ids, total: ids.length };
  }

  async create(body: Partial<AnalyticsCategory>, userId?: string | null, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const name = (body.name ?? '').toString().trim();
    if (!name) throw new BadRequestException('Name is required');
    const duplicate = await repo
      .createQueryBuilder('cat')
      .where('LOWER(cat.name) = LOWER(:name)', { name })
      .getOne();
    if (duplicate) {
      throw new BadRequestException('An analytics category with this name already exists');
    }

    const lifecycle = resolveLifecycleState({ nextStatus: body.status, nextDisabledAt: body.disabled_at });
    const entity = repo.create({
      name,
      description: (body.description ?? '').toString().trim() || null,
      status: lifecycle.status,
      disabled_at: lifecycle.disabled_at,
    });
    const saved = await repo.save(entity);
    await this.audit.log({ table: 'analytics_categories', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: opts?.manager ?? repo.manager });
    return saved;
  }

  async update(id: string, body: Partial<AnalyticsCategory>, userId?: string | null, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const existing = await this.get(id, opts);
    const before = { ...existing };
    if (body.name !== undefined) {
      const trimmed = body.name.toString().trim();
      if (!trimmed) throw new BadRequestException('Name cannot be empty');
      const duplicate = await repo
        .createQueryBuilder('cat')
        .where('LOWER(cat.name) = LOWER(:name)', { name: trimmed })
        .andWhere('cat.id <> :id', { id })
        .getOne();
      if (duplicate) throw new BadRequestException('Another analytics category already uses this name');
      existing.name = trimmed;
    }
    if (body.description !== undefined) {
      const desc = body.description == null ? null : body.description.toString().trim();
      existing.description = desc || null;
    }
    const lifecycle = resolveLifecycleState({
      currentDisabledAt: before.disabled_at,
      nextStatus: body.status,
      nextDisabledAt: body.disabled_at,
    });
    existing.status = lifecycle.status;
    existing.disabled_at = lifecycle.disabled_at;
    const saved = await repo.save(existing);
    await this.audit.log({ table: 'analytics_categories', recordId: saved.id, action: 'update', before, after: saved, userId }, { manager: opts?.manager ?? repo.manager });
    return saved;
  }
}
