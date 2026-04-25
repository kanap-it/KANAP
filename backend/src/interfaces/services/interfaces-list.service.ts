import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { InterfaceEntity } from '../interface.entity';
import { InterfaceLeg } from '../interface-leg.entity';
import { InterfaceMiddlewareApplication } from '../interface-middleware-application.entity';
import { InterfaceBinding } from '../../interface-bindings/interface-binding.entity';
import { Application } from '../../applications/application.entity';
import { ItOpsSettingsService } from '../../it-ops-settings/it-ops-settings.service';
import { parsePagination } from '../../common/pagination';
import { normalizeBindingLifecycle } from '../../interface-bindings/interface-bindings.service';
import {
  InterfacesBaseService,
  ServiceOpts,
  RouteType,
} from './interfaces-base.service';

/**
 * Service for listing, filtering, and querying interfaces.
 */
@Injectable()
export class InterfacesListService extends InterfacesBaseService {
  constructor(
    @InjectRepository(InterfaceEntity) repo: Repository<InterfaceEntity>,
    @InjectRepository(InterfaceLeg) legs: Repository<InterfaceLeg>,
    @InjectRepository(InterfaceMiddlewareApplication) middlewareApps: Repository<InterfaceMiddlewareApplication>,
    @InjectRepository(Application) apps: Repository<Application>,
    @InjectRepository(InterfaceBinding) bindings: Repository<InterfaceBinding>,
    itOpsSettings: ItOpsSettingsService,
  ) {
    super(repo, legs, middlewareApps, apps, bindings, itOpsSettings);
  }

  /**
   * List interfaces with filtering, sorting, and pagination.
   */
  async list(query: any, opts?: ServiceOpts) {
    const repo = this.getRepo(opts?.manager);
    const { page, limit, skip, sort, q, filters } = parsePagination(query);
    const qb = repo.createQueryBuilder('i');
    qb.leftJoin('applications', 'sa', 'sa.id = i.source_application_id');
    qb.leftJoin('applications', 'ta', 'ta.id = i.target_application_id');
    qb.leftJoin('business_processes', 'bp', 'bp.id = i.business_process_id');
    qb.addSelect('sa.name', 'source_name');
    qb.addSelect('ta.name', 'target_name');
    qb.addSelect('bp.name', 'business_process_name');

    if (q) {
      qb.andWhere(
        new Brackets((expr) => {
          expr.where('i.name ILIKE :q OR i.interface_id ILIKE :q OR i.business_purpose ILIKE :q', {
            q: `%${q}%`,
          });
        }),
      );
    }

    const interfaceIdFilter = this.resolveFilterInput(query.interface_id, filters?.interface_id);
    if (interfaceIdFilter) {
      qb.andWhere('i.interface_id ILIKE :interfaceIdFilter', { interfaceIdFilter: `%${interfaceIdFilter}%` });
    }

    const nameFilter = this.resolveFilterInput(query.name, filters?.name);
    if (nameFilter) {
      qb.andWhere('i.name ILIKE :nameFilter', { nameFilter: `%${nameFilter}%` });
    }

    const sourceAppFilter = this.resolveFilterInput(query.source_application_name, filters?.source_application_name);
    if (sourceAppFilter) {
      qb.andWhere('sa.name ILIKE :sourceAppFilter', { sourceAppFilter: `%${sourceAppFilter}%` });
    }

    const targetAppFilter = this.resolveFilterInput(query.target_application_name, filters?.target_application_name);
    if (targetAppFilter) {
      qb.andWhere('ta.name ILIKE :targetAppFilter', { targetAppFilter: `%${targetAppFilter}%` });
    }

    const lifecycleFilter = this.resolveFilterInput(query.lifecycle, filters?.lifecycle);
    if (lifecycleFilter) {
      qb.andWhere('i.lifecycle ILIKE :lifecycle', { lifecycle: `%${lifecycleFilter}%` });
    }

    const criticalityFilter = this.resolveFilterInput(query.criticality, filters?.criticality);
    if (criticalityFilter) {
      qb.andWhere('i.criticality ILIKE :criticality', { criticality: `%${criticalityFilter}%` });
    }

    const dataCategoryFilter = this.resolveFilterInput(query.data_category, filters?.data_category);
    if (dataCategoryFilter) qb.andWhere('i.data_category = :dataCategory', { dataCategory: dataCategoryFilter });

    const dataClassFilter = this.resolveFilterInput(query.data_class, filters?.data_class);
    if (dataClassFilter) qb.andWhere('i.data_class = :dataClass', { dataClass: dataClassFilter });

    const routeFilter = this.resolveFilterInput(query.integration_route_type, filters?.integration_route_type);
    if (routeFilter) qb.andWhere('i.integration_route_type = :route', { route: routeFilter });

    const businessProcessFilter = this.resolveFilterInput(query.business_process_id, filters?.business_process_id);
    if (businessProcessFilter) qb.andWhere('i.business_process_id = :bpId', { bpId: businessProcessFilter });

    const containsPiiFilter =
      query.contains_pii !== undefined ? this.parseBoolean(query.contains_pii) : this.extractBooleanFilter(filters?.contains_pii);
    if (containsPiiFilter !== null && containsPiiFilter !== undefined) {
      qb.andWhere('i.contains_pii = :pii', { pii: containsPiiFilter });
    }

    const envFilterModel = filters?.environment ?? filters?.binding_environments;
    const envFilterRaw = this.extractFilterValue(envFilterModel);
    if (envFilterRaw) {
      const envFilterLike = `%${String(envFilterRaw).toLowerCase()}%`;
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM interface_bindings b
          WHERE b.interface_id = i.id
            AND LOWER(b.environment) LIKE :envFilterLike
        )`,
        { envFilterLike },
      );
    }

    const allowedSort = ['interface_id', 'name', 'lifecycle', 'criticality', 'created_at', 'updated_at'];
    const sortField = allowedSort.includes(sort.field) ? sort.field : 'created_at';
    const sortDirection = sort.direction === 'ASC' ? 'ASC' : 'DESC';
    const qbCount = qb.clone();
    const total = await qbCount.getCount();
    qb.orderBy(`i.${sortField}`, sortDirection as any).skip(skip).take(limit);

    const { raw, entities } = await qb.getRawAndEntities();
    const pageIds = entities.map((e) => e.id);
    let bindingsAgg: Record<string, { total: number; environments: number; envs: string[] }> = {};
    if (pageIds.length > 0) {
      const rows: Array<{ interface_id: string; total: string; environments: string; envs: string | null }> =
        await (opts?.manager ?? repo.manager).query(
          `SELECT b.interface_id,
                  COUNT(*)::text as total,
                  COUNT(DISTINCT b.environment)::text as environments,
                  STRING_AGG(DISTINCT b.environment, ',') as envs
           FROM interface_bindings b
           WHERE b.interface_id = ANY($1)
           GROUP BY b.interface_id`,
          [pageIds],
        );
      bindingsAgg = Object.fromEntries(
        rows.map((r) => {
          const envList =
            (r.envs || '')
              .split(',')
              .map((e) => e.trim())
              .filter((e) => e.length > 0) || [];
          return [
            r.interface_id,
            {
              total: Number(r.total),
              environments: Number(r.environments),
              envs: envList,
            },
          ];
        }),
      );
    }

    const items = entities.map((entity, idx) => {
      const base: any = { ...entity };
      const r = (raw[idx] || {}) as any;
      base.source_application_name = r.source_name || null;
      base.target_application_name = r.target_name || null;
      base.business_process_name = r.business_process_name || null;
      const agg = bindingsAgg[entity.id];
      base.bindings_count = agg?.total ?? 0;
      base.environment_coverage = agg?.environments ?? 0;
      base.binding_environments = agg?.envs ?? [];
      return base;
    });

    return { items, total, page, limit };
  }

  /**
   * List interfaces by application.
   */
  async listByApplication(applicationId: string, tenantId: string, opts?: ServiceOpts) {
    if (!tenantId) throw new Error('Tenant context is required');
    const appId = this.normalizeRequiredText(applicationId, 'applicationId');
    const mg = opts?.manager ?? this.repo.manager;

    // Ensure the application exists (re-uses existing helper)
    await this.ensureApplication(appId, mg);

    const rows: Array<{
      interface_id: string;
      interface_code: string;
      interface_name: string;
      environment: string;
      integration_route_type: string;
      source_application_id: string | null;
      source_application_name: string | null;
      target_application_id: string | null;
      target_application_name: string | null;
      middleware_application_ids: string[] | null;
      middleware_application_names: string[] | null;
      via_middleware: boolean;
      is_middleware: boolean;
      is_integration_tool: boolean;
    }> = await mg.query(
      `SELECT DISTINCT ON (i.id, b.environment)
         i.id AS interface_id,
         i.interface_id AS interface_code,
         i.name AS interface_name,
         b.environment,
         i.integration_route_type,
         sa.id AS source_application_id,
         sa.name AS source_application_name,
         ta.id AS target_application_id,
         ta.name AS target_application_name,
         ARRAY(
           SELECT mw.application_id::text
           FROM interface_middleware_applications mw
           JOIN applications mwa ON mwa.id = mw.application_id AND mwa.tenant_id = mw.tenant_id
           WHERE mw.interface_id = i.id
             AND mw.tenant_id = i.tenant_id
           ORDER BY mwa.name ASC
         ) AS middleware_application_ids,
         ARRAY(
           SELECT mwa.name
           FROM interface_middleware_applications mw
           JOIN applications mwa ON mwa.id = mw.application_id AND mwa.tenant_id = mw.tenant_id
           WHERE mw.interface_id = i.id
             AND mw.tenant_id = i.tenant_id
           ORDER BY mwa.name ASC
         ) AS middleware_application_names,
         (i.integration_route_type = 'via_middleware') AS via_middleware,
         EXISTS (
           SELECT 1
           FROM interface_middleware_applications mw
           WHERE mw.interface_id = i.id
             AND mw.application_id = $2
         ) AS is_middleware,
         EXISTS (
           SELECT 1
           FROM interface_bindings b2
           WHERE b2.interface_id = i.id
             AND b2.integration_tool_application_id = $2
         ) AS is_integration_tool
       FROM interface_bindings b
       JOIN interfaces i ON i.id = b.interface_id
       JOIN interface_legs l ON l.id = b.interface_leg_id
       JOIN app_instances si ON si.id = b.source_instance_id
       JOIN app_instances ti ON ti.id = b.target_instance_id
       LEFT JOIN applications sa ON sa.id = i.source_application_id
       LEFT JOIN applications ta ON ta.id = i.target_application_id
       WHERE i.tenant_id = $1
         AND (
           i.source_application_id = $2
           OR i.target_application_id = $2
           OR EXISTS (
             SELECT 1
             FROM interface_middleware_applications mw2
             WHERE mw2.interface_id = i.id
               AND mw2.application_id = $2
           )
           OR b.integration_tool_application_id = $2
         )
       ORDER BY i.id, b.environment, b.created_at ASC`,
      [tenantId, appId],
    );

    const items = rows.map((row) => ({
      id: row.interface_id,
      interface_id: row.interface_code,
      name: row.interface_name,
      environment: row.environment,
      source_application_id: row.source_application_id,
      source_application_name: row.source_application_name,
      target_application_id: row.target_application_id,
      target_application_name: row.target_application_name,
      middleware_application_ids: row.middleware_application_ids || [],
      middleware_application_names: row.middleware_application_names || [],
      via_middleware: !!(row.via_middleware || row.is_middleware || row.is_integration_tool),
    }));

    return { items };
  }

  /**
   * Get map data for interface visualization.
   */
  async getMap(query: any, tenantId: string, opts?: ServiceOpts) {
    if (!tenantId) {
      throw new Error('Tenant context is required');
    }
    const manager = opts?.manager ?? this.repo.manager;
    const environment = this.normalizeEnvironment(query?.environment);
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowedLifecycles = (settings.lifecycleStates || []).map((item) => item.code);
    const lifecycleFilters = this.normalizeLifecycleFilters(query?.lifecycles, allowedLifecycles);
    const includeBindings = String(query?.includeBindings ?? 'true').toLowerCase() !== 'false';

    const bindingRows: Array<any> = await manager.query(
      `SELECT
         b.id AS binding_id,
         b.interface_id,
         b.interface_leg_id,
         l.leg_type,
         l.from_role,
         l.to_role,
         b.environment,
         b.source_instance_id,
         b.target_instance_id,
         si.application_id AS binding_source_application_id,
         ti.application_id AS binding_target_application_id,
         b.integration_tool_application_id,
         b.status AS binding_status,
         b.source_endpoint,
         b.target_endpoint,
         b.trigger_details,
         b.env_job_name,
         b.authentication_mode,
         b.monitoring_url,
         b.env_notes,
         i.interface_id AS interface_code,
         i.name AS interface_name,
         i.lifecycle AS interface_lifecycle,
         i.criticality AS interface_criticality,
         i.data_category,
         i.contains_pii,
         i.integration_route_type,
         i.source_application_id AS logical_source_application_id,
         i.target_application_id AS logical_target_application_id
       FROM interface_bindings b
       JOIN interfaces i ON i.id = b.interface_id
       JOIN interface_legs l ON l.id = b.interface_leg_id
       JOIN app_instances si ON si.id = b.source_instance_id
       JOIN app_instances ti ON ti.id = b.target_instance_id
       WHERE i.tenant_id = $1
         AND b.environment = $2
         AND i.lifecycle = ANY($3::text[])`,
      [tenantId, environment, lifecycleFilters],
    );

    if (bindingRows.length === 0) {
      return {
        environment,
        lifecycles: lifecycleFilters,
        nodes: [],
        interfaces: [],
        bindings: includeBindings ? [] : undefined,
      };
    }

    type InterfaceAccumulator = {
      id: string;
      interface_code: string;
      name: string;
      lifecycle: string;
      criticality: string;
      data_category: string;
      contains_pii: boolean;
      integration_route_type: RouteType;
      source_application_id: string;
      target_application_id: string;
      bindingsCount: number;
      middlewareIds: Set<string>;
    };

    const interfacesById = new Map<string, InterfaceAccumulator>();
    const bindingsForResponse: any[] = [];
    const applicationIds = new Set<string>();

    for (const row of bindingRows) {
      const existing = interfacesById.get(row.interface_id);
      if (!existing) {
        interfacesById.set(row.interface_id, {
          id: row.interface_id,
          interface_code: row.interface_code,
          name: row.interface_name,
          lifecycle: row.interface_lifecycle,
          criticality: row.interface_criticality,
          data_category: row.data_category,
          contains_pii: !!row.contains_pii,
          integration_route_type: row.integration_route_type as RouteType,
          source_application_id: row.logical_source_application_id,
          target_application_id: row.logical_target_application_id,
          bindingsCount: 0,
          middlewareIds: new Set<string>(),
        });
      }
      const acc = interfacesById.get(row.interface_id)!;
      acc.bindingsCount += 1;
      if (row.integration_tool_application_id) {
        acc.middlewareIds.add(row.integration_tool_application_id);
      }

      if (row.logical_source_application_id) {
        applicationIds.add(row.logical_source_application_id);
      }
      if (row.logical_target_application_id) {
        applicationIds.add(row.logical_target_application_id);
      }
      if (row.integration_tool_application_id) {
        applicationIds.add(row.integration_tool_application_id);
      }

      if (includeBindings) {
        bindingsForResponse.push({
          id: row.binding_id,
          interface_id: row.interface_id,
          leg_id: row.interface_leg_id,
          leg_type: row.leg_type,
          from_role: row.from_role,
          to_role: row.to_role,
          environment: row.environment,
          source_instance_id: row.source_instance_id,
          target_instance_id: row.target_instance_id,
          source_application_id: row.binding_source_application_id,
          target_application_id: row.binding_target_application_id,
          integration_tool_application_id: row.integration_tool_application_id,
          status: normalizeBindingLifecycle(row.binding_status),
          source_endpoint: row.source_endpoint,
          target_endpoint: row.target_endpoint,
          trigger_details: row.trigger_details,
          env_job_name: row.env_job_name,
          authentication_mode: row.authentication_mode,
          monitoring_url: row.monitoring_url,
          env_notes: row.env_notes,
        });
      }
    }

    const interfaceIds = Array.from(interfacesById.keys());
    if (interfaceIds.length > 0) {
      const middlewareRows: Array<{ interface_id: string; application_id: string }> = await manager.query(
        `SELECT interface_id, application_id
         FROM interface_middleware_applications
         WHERE tenant_id = $1
           AND interface_id = ANY($2::uuid[])`,
        [tenantId, interfaceIds],
      );
      for (const mw of middlewareRows) {
        const acc = interfacesById.get(mw.interface_id);
        if (!acc) continue;
        if (mw.application_id) {
          acc.middlewareIds.add(mw.application_id);
          applicationIds.add(mw.application_id);
        }
      }
    }

    const middlewareNodeIds = new Set<string>();
    for (const acc of interfacesById.values()) {
      for (const mid of acc.middlewareIds) {
        middlewareNodeIds.add(mid);
      }
    }

    const interfacePayload = Array.from(interfacesById.values()).map((acc) => ({
      id: acc.id,
      interface_id: acc.interface_code,
      name: acc.name,
      source_application_id: acc.source_application_id,
      target_application_id: acc.target_application_id,
      lifecycle: acc.lifecycle,
      criticality: acc.criticality,
      data_category: acc.data_category,
      contains_pii: acc.contains_pii,
      integration_route_type: acc.integration_route_type,
      bindings_count: acc.bindingsCount,
      has_middleware: acc.middlewareIds.size > 0,
      middleware_application_ids: Array.from(acc.middlewareIds),
    }));

    const degreeByApp = new Map<string, { in: number; out: number }>();
    for (const acc of interfacePayload) {
      const sourceStats = degreeByApp.get(acc.source_application_id) ?? { in: 0, out: 0 };
      sourceStats.out += 1;
      degreeByApp.set(acc.source_application_id, sourceStats);
      const targetStats = degreeByApp.get(acc.target_application_id) ?? { in: 0, out: 0 };
      targetStats.in += 1;
      degreeByApp.set(acc.target_application_id, targetStats);
    }

    type MapNodeResponse = {
      id: string;
      name: string;
      lifecycle: string;
      criticality: string;
      external_facing: boolean;
      is_middleware: boolean;
      in_degree: number;
      out_degree: number;
      total_interfaces: number;
    };

    const appIds = Array.from(applicationIds).filter(Boolean);
    const nodes: MapNodeResponse[] = [];
    if (appIds.length > 0) {
      const appRepo = this.getAppRepo(manager);
      const apps = await appRepo.findBy({ id: In(appIds) });
      const appsById = new Map(apps.map((app) => [app.id, app]));
      for (const id of appIds) {
        const app = appsById.get(id);
        if (!app) continue;
        const degree = degreeByApp.get(id) ?? { in: 0, out: 0 };
        nodes.push({
          id: app.id,
          name: app.name,
          lifecycle: app.lifecycle,
          criticality: app.criticality,
          external_facing: !!app.external_facing,
          is_middleware: middlewareNodeIds.has(app.id),
          in_degree: degree.in,
          out_degree: degree.out,
          total_interfaces: degree.in + degree.out,
        });
      }
    }

    return {
      environment,
      lifecycles: lifecycleFilters,
      nodes,
      interfaces: interfacePayload,
      bindings: includeBindings ? bindingsForResponse : undefined,
    };
  }
}
