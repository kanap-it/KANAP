import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Application } from '../application.entity';
import { parsePagination } from '../../common/pagination';
import {
  buildQuickSearchConditions,
  compileAgFilterCondition,
  createParamNameGenerator,
  FilterTargetConfig,
  CompiledCondition,
  normalizeAgFilterModel,
} from '../../common/ag-grid-filtering';
import { ApplicationsBaseService, ServiceOpts } from './applications-base.service';

type ParamNameFactory = () => string;
type SetFilterModel = { filterType: 'set'; values: any[] };
type OwnerScope = { ownerUserId?: string; ownerTeamId?: string };

const normalizeScopeValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const parseOwnerScope = (query: any): OwnerScope => ({
  ownerUserId: normalizeScopeValue(query?.ownerUserId),
  ownerTeamId: normalizeScopeValue(query?.ownerTeamId),
});

const parseIncludeInactive = (query: any): boolean => {
  const raw = query?.include_inactive;
  if (raw === true || raw === 'true' || raw === '1') return true;
  return false;
};

const applyOwnerScopeCondition = (qb: SelectQueryBuilder<Application>, scope: OwnerScope) => {
  const ownerUserId = scope.ownerUserId;
  const ownerTeamId = scope.ownerTeamId;
  if (!ownerUserId && !ownerTeamId) return;

  if (ownerUserId && ownerTeamId) {
    qb.andWhere(
      `EXISTS (
        SELECT 1
        FROM application_owners ao
        WHERE ao.application_id = a.id
          AND (
            ao.user_id = :ownerUserId
            OR ao.user_id IN (
              SELECT tmc.user_id
              FROM portfolio_team_member_configs tmc
              WHERE tmc.team_id = :ownerTeamId
            )
          )
      )`,
      { ownerUserId, ownerTeamId },
    );
    return;
  }

  if (ownerUserId) {
    qb.andWhere(
      `EXISTS (
        SELECT 1
        FROM application_owners ao
        WHERE ao.application_id = a.id
          AND ao.user_id = :ownerUserId
      )`,
      { ownerUserId },
    );
    return;
  }

  qb.andWhere(
    `EXISTS (
      SELECT 1
      FROM application_owners ao
      WHERE ao.application_id = a.id
        AND ao.user_id IN (
          SELECT tmc.user_id
          FROM portfolio_team_member_configs tmc
          WHERE tmc.team_id = :ownerTeamId
        )
    )`,
    { ownerTeamId },
  );
};

const applyExplicitTenantConstraint = (
  qb: SelectQueryBuilder<Application>,
  tenantId?: string,
) => {
  if (!tenantId) return;
  qb.andWhere('a.tenant_id = :tenantId', { tenantId });
};

const normalizeSetFilterModel = (model: any): SetFilterModel | null => {
  const normalized = normalizeAgFilterModel(model);
  if (normalized && normalized.filterType === 'set' && Array.isArray(normalized.values)) {
    return normalized as SetFilterModel;
  }
  return null;
};

const buildActiveInstanceCondition = (alias = 'ai') => {
  const lifecycle = `NULLIF(${alias}.lifecycle, '')`;
  const status = `NULLIF(${alias}.status, '')`;
  return `(
    (${lifecycle} IS NOT NULL AND ${lifecycle} = 'active')
    OR (${lifecycle} IS NULL AND ${status} IS NOT NULL AND ${status} = 'enabled')
    OR (${lifecycle} IS NULL AND ${status} IS NULL AND (${alias}.disabled_at IS NULL OR ${alias}.disabled_at > NOW()))
  )`;
};

const buildApplicationOwnerNamesSql = (ownerType: 'business' | 'it', alias = 'a'): string => `COALESCE((
  SELECT string_agg(owner.name, ', ' ORDER BY owner.name)
  FROM (
    SELECT DISTINCT COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS name
    FROM application_owners o
    LEFT JOIN users u ON u.id = o.user_id AND u.tenant_id = ${alias}.tenant_id
    WHERE o.application_id = ${alias}.id
      AND o.tenant_id = ${alias}.tenant_id
      AND o.owner_type = '${ownerType}'
  ) owner
), '')`;

const compileEnvironmentsSetFilter = (model: any, nextParam: ParamNameFactory): CompiledCondition | null => {
  const normalized = normalizeSetFilterModel(model);
  if (!normalized) return null;
  const values = normalized.values.filter((v: any) => v !== null && v !== undefined && v !== '');
  if (values.length === 0) return { sql: '1=0', params: {} };
  const param = nextParam();
  const activeCondition = buildActiveInstanceCondition('ai');
  return {
    sql: `EXISTS (
      SELECT 1 FROM app_instances ai
      WHERE ai.application_id = a.id
        AND ${activeCondition}
        AND ai.environment IN (:...${param})
    )`,
    params: { [param]: values },
  };
};

const compileHostingTypesSetFilter = (model: any, nextParam: ParamNameFactory): CompiledCondition | null => {
  const normalized = normalizeSetFilterModel(model);
  if (!normalized) return null;
  const values = normalized.values.filter((v: any) => v !== null && v !== undefined && v !== '');
  if (values.length === 0) return { sql: '1=0', params: {} };
  const param = nextParam();
  return {
    sql: `EXISTS (
      SELECT 1
      FROM app_instances ai
      JOIN app_asset_assignments aaa ON aaa.app_instance_id = ai.id
      JOIN assets ast ON ast.id = aaa.asset_id
      LEFT JOIN locations l ON l.id = ast.location_id
      WHERE ai.application_id = a.id
        AND l.hosting_type IN (:...${param})
    )`,
    params: { [param]: values },
  };
};

const compileLinkedProjectTextFilter = (model: any, nextParam: ParamNameFactory): CompiledCondition | null => {
  const normalized = normalizeAgFilterModel(model);
  if (!normalized || typeof normalized !== 'object') return null;
  const filterText = String(normalized.filter ?? normalized.value ?? '').trim();
  if (!filterText) return null;

  const type = String(normalized.type || 'contains');
  const param = nextParam();
  const refExpr = `('PRJ-' || p_link.item_number::text)`;
  let predicate = '';
  let value = filterText;

  switch (type) {
    case 'equals':
      predicate = `(p_link.name = :${param} OR ${refExpr} = :${param})`;
      break;
    case 'startsWith':
      value = `${filterText}%`;
      predicate = `(p_link.name ILIKE :${param} OR ${refExpr} ILIKE :${param})`;
      break;
    case 'endsWith':
      value = `%${filterText}`;
      predicate = `(p_link.name ILIKE :${param} OR ${refExpr} ILIKE :${param})`;
      break;
    case 'contains':
    default:
      value = `%${filterText}%`;
      predicate = `(p_link.name ILIKE :${param} OR ${refExpr} ILIKE :${param})`;
      break;
  }

  return {
    sql: `EXISTS (
      SELECT 1
      FROM application_projects ap
      JOIN portfolio_projects p_link ON p_link.id = ap.project_id AND p_link.tenant_id = a.tenant_id
      WHERE ap.application_id = a.id
        AND ap.tenant_id = a.tenant_id
        AND ${predicate}
    )`,
    params: { [param]: value },
  };
};

const compileOwnerNameFilter = (
  ownerType: 'business' | 'it',
  model: any,
  nextParam: ParamNameFactory,
): CompiledCondition | null => {
  const setModel = normalizeSetFilterModel(model);
  const displayExpr = `COALESCE(NULLIF(TRIM(CONCAT(u_owner.first_name, ' ', u_owner.last_name)), ''), u_owner.email)`;

  if (setModel) {
    const values = setModel.values.filter((value: any) => value !== null && value !== undefined && value !== '');
    if (values.length === 0) {
      return { sql: '1=0', params: {} };
    }
    const param = nextParam();
    return {
      sql: `EXISTS (
        SELECT 1
        FROM application_owners ao
        JOIN users u_owner ON u_owner.id = ao.user_id AND u_owner.tenant_id = a.tenant_id
        WHERE ao.application_id = a.id
          AND ao.tenant_id = a.tenant_id
          AND ao.owner_type = '${ownerType}'
          AND ${displayExpr} IN (:...${param})
      )`,
      params: { [param]: values },
    };
  }

  const normalized = normalizeAgFilterModel(model);
  if (!normalized || typeof normalized !== 'object') return null;
  const filterText = String(normalized.filter ?? normalized.value ?? '').trim();
  if (!filterText) return null;

  const param = nextParam();
  const type = String(normalized.type || 'contains');
  let predicate = '';
  let value = filterText;

  switch (type) {
    case 'equals':
      predicate = `${displayExpr} = :${param}`;
      break;
    case 'startsWith':
      value = `${filterText}%`;
      predicate = `${displayExpr} ILIKE :${param}`;
      break;
    case 'endsWith':
      value = `%${filterText}`;
      predicate = `${displayExpr} ILIKE :${param}`;
      break;
    case 'notContains':
      value = `%${filterText}%`;
      predicate = `${displayExpr} NOT ILIKE :${param}`;
      break;
    case 'contains':
    default:
      value = `%${filterText}%`;
      predicate = `${displayExpr} ILIKE :${param}`;
      break;
  }

  return {
    sql: `EXISTS (
      SELECT 1
      FROM application_owners ao
      JOIN users u_owner ON u_owner.id = ao.user_id AND u_owner.tenant_id = a.tenant_id
      WHERE ao.application_id = a.id
        AND ao.tenant_id = a.tenant_id
        AND ao.owner_type = '${ownerType}'
        AND ${predicate}
    )`,
    params: { [param]: value },
  };
};

/**
 * Service for listing and filtering applications.
 */
@Injectable()
export class ApplicationsListService extends ApplicationsBaseService {
  constructor(
    @InjectRepository(Application) appRepo: Repository<Application>,
  ) {
    super(appRepo);
  }

  /**
   * List applications with filtering, sorting, and pagination.
   */
  async list(query: any, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(Application);
    const tenantId = String(opts?.tenantId || '').trim();
    const { page, limit, skip, sort, q, filters } = parsePagination(query, { field: 'created_at', direction: 'DESC' });
    const ownerScope = parseOwnerScope(query);
    const includeInactive = parseIncludeInactive(query);
    const includeRaw = String(query?.include || '').trim();
    const include = new Set(includeRaw.split(',').map((s) => s.trim()).filter(Boolean));
    const fm = (filters && typeof filters === 'object') ? filters : undefined;

    // Define filter targets for AG Grid model -> SQL translation
    type Target = FilterTargetConfig;
    const targets: Record<string, Target> = {
      id: { expression: 'a.id', dataType: 'string' },
      name: { expression: 'a.name', dataType: 'string' },
      supplier_id: { expression: 'a.supplier_id', dataType: 'string' },
      category: { expression: 'a.category', dataType: 'string' },
      editor: { expression: 'a.editor', dataType: 'string' },
      environment: { expression: 'a.environment', dataType: 'string' },
      lifecycle: { expression: 'a.lifecycle', dataType: 'string' },
      criticality: { expression: 'a.criticality', dataType: 'string' },
      data_class: { expression: 'a.data_class', dataType: 'string' },
      hosting_model: { expression: 'a.hosting_model', dataType: 'string' },
      external_facing: { expression: 'a.external_facing', numericExpression: 'COALESCE(a.external_facing, false)', dataType: 'boolean' },
      is_suite: { expression: 'a.is_suite', dataType: 'boolean' },
      retired_date: { expression: 'a.retired_date', textExpression: 'CAST(a.retired_date AS TEXT)', dataType: 'string' },
      last_dr_test: { expression: 'a.last_dr_test', textExpression: 'CAST(a.last_dr_test AS TEXT)', dataType: 'string' },
      sso_enabled: { expression: 'a.sso_enabled', numericExpression: 'COALESCE(a.sso_enabled, false)', dataType: 'boolean' },
      mfa_supported: { expression: 'a.mfa_supported', numericExpression: 'COALESCE(a.mfa_supported, false)', dataType: 'boolean' },
      etl_enabled: { expression: 'a.etl_enabled', numericExpression: 'COALESCE(a.etl_enabled, false)', dataType: 'boolean' },
      contains_pii: { expression: 'a.contains_pii', numericExpression: 'COALESCE(a.contains_pii, false)', dataType: 'boolean' },
      users_mode: { expression: 'a.users_mode', dataType: 'string' },
      users_year: { expression: 'a.users_year', numericExpression: 'a.users_year', dataType: 'number' },
      users_override: { expression: 'a.users_override', numericExpression: 'a.users_override', dataType: 'number' },
      status: { expression: 'a.status', textExpression: 'CAST(a.status AS TEXT)', dataType: 'string' },
      disabled_at: { expression: 'a.disabled_at', textExpression: 'CAST(a.disabled_at AS TEXT)', dataType: 'string' },
      created_at: { expression: 'a.created_at', textExpression: 'CAST(a.created_at AS TEXT)', dataType: 'string' },
      updated_at: { expression: 'a.updated_at', textExpression: 'CAST(a.updated_at AS TEXT)', dataType: 'string' },
    };

    // Environment summary based on instances
    targets['environments'] = {
      expression: 'a.id',
      textExpression:
        `COALESCE((SELECT string_agg(ai.environment, ',') ` +
        `FROM app_instances ai ` +
        `WHERE ai.application_id = a.id), '')`,
      dataType: 'string',
    };

    if (include.has('supplier') || (fm && Object.prototype.hasOwnProperty.call(fm, 'supplier_name')) || sort.field === 'supplier_name') {
      targets['supplier_name'] = { expression: 's.name', dataType: 'string' };
    }

    // Derived filter targets
    targets['spend_count'] = { expression: 'a.id', numericExpression: `(SELECT COUNT(*) FROM application_spend_items l WHERE l.application_id = a.id)`, dataType: 'number' };
    targets['capex_count'] = { expression: 'a.id', numericExpression: `(SELECT COUNT(*) FROM application_capex_items l WHERE l.application_id = a.id)`, dataType: 'number' };
    targets['contracts_count'] = { expression: 'a.id', numericExpression: `(SELECT COUNT(*) FROM application_contracts l WHERE l.application_id = a.id)`, dataType: 'number' };
    targets['suites_count'] = { expression: 'a.id', numericExpression: `(SELECT COUNT(*) FROM application_suites l WHERE l.application_id = a.id)`, dataType: 'number' };
    targets['components_count'] = { expression: 'a.id', numericExpression: `(SELECT COUNT(*) FROM application_suites l WHERE l.suite_id = a.id)`, dataType: 'number' };
    targets['owners_business'] = { expression: 'a.id', textExpression: buildApplicationOwnerNamesSql('business'), dataType: 'string' };
    targets['owners_it'] = { expression: 'a.id', textExpression: buildApplicationOwnerNamesSql('it'), dataType: 'string' };
    targets['data_residency'] = { expression: 'a.id', textExpression: `COALESCE((SELECT string_agg(dr.country_iso, ',') FROM application_data_residency dr WHERE dr.application_id = a.id), '')`, dataType: 'string' };
    targets['hosting_types'] = {
      expression: 'a.id',
      textExpression: `COALESCE((SELECT string_agg(DISTINCT l.hosting_type, ',')
        FROM app_instances ai
        JOIN app_asset_assignments aaa ON aaa.app_instance_id = ai.id
        JOIN assets ast ON ast.id = aaa.asset_id
        LEFT JOIN locations l ON l.id = ast.location_id
        WHERE ai.application_id = a.id AND l.hosting_type IS NOT NULL), '')`,
      dataType: 'string',
    };
    const lifecycleFilterPresent = !!(fm && Object.prototype.hasOwnProperty.call(fm, 'lifecycle'));

    const nextParam = createParamNameGenerator('p');
    const compiledFilters: CompiledCondition[] = [];
    if (fm) {
      for (const [field, model] of Object.entries(fm)) {
        if (field === 'environments') {
          const custom = compileEnvironmentsSetFilter(model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        if (field === 'hosting_types') {
          const custom = compileHostingTypesSetFilter(model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        if (field === 'linked_project_name') {
          const custom = compileLinkedProjectTextFilter(model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        if (field === 'owners_business') {
          const custom = compileOwnerNameFilter('business', model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        if (field === 'owners_it') {
          const custom = compileOwnerNameFilter('it', model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        const target = targets[field];
        if (!target) continue;
        const cond = compileAgFilterCondition(model, target, nextParam);
        if (cond) compiledFilters.push(cond);
      }
    }
    const quickSearch = q ? buildQuickSearchConditions(q, ['a.name', buildApplicationOwnerNamesSql('it')], nextParam) : [];

    const applyCompiledFilters = (builder: ReturnType<typeof repo.createQueryBuilder>) => {
      compiledFilters.forEach((c) => {
        builder.andWhere(new Brackets((qb) => qb.where(c.sql, c.params)));
      });
    };

    const applyQuickSearch = (builder: ReturnType<typeof repo.createQueryBuilder>) => {
      if (quickSearch.length === 0) return;
      builder.andWhere(
        new Brackets((sub) => {
          quickSearch.forEach((cond, idx) => {
            if (idx === 0) sub.where(cond.sql, cond.params);
            else sub.orWhere(cond.sql, cond.params);
          });
        }),
      );
    };

    const needsSupplierJoin = include.has('supplier') || (fm && Object.prototype.hasOwnProperty.call(fm, 'supplier_name')) || sort.field === 'supplier_name';

    // Count query
    const qbBase = repo.createQueryBuilder('a');
    applyExplicitTenantConstraint(qbBase, tenantId);
    if (needsSupplierJoin) qbBase.leftJoin('suppliers', 's', 's.id = a.supplier_id AND s.tenant_id = a.tenant_id');
    if (!includeInactive) {
      qbBase.andWhere('(a.disabled_at IS NULL OR a.disabled_at > NOW())');
    }
    applyOwnerScopeCondition(qbBase, ownerScope);
    if (!includeInactive && !lifecycleFilterPresent) qbBase.andWhere(`a.lifecycle <> 'retired'`);
    applyCompiledFilters(qbBase);
    applyQuickSearch(qbBase);
    const total = await qbBase.getCount();

    // Page query
    const qb = repo.createQueryBuilder('a');
    applyExplicitTenantConstraint(qb, tenantId);
    if (needsSupplierJoin) {
      qb.leftJoin('suppliers', 's', 's.id = a.supplier_id AND s.tenant_id = a.tenant_id');
      qb.addSelect('s.name', 's_name');
    }
    if (!includeInactive) {
      qb.andWhere('(a.disabled_at IS NULL OR a.disabled_at > NOW())');
    }
    applyOwnerScopeCondition(qb, ownerScope);
    if (!includeInactive && !lifecycleFilterPresent) qb.andWhere(`a.lifecycle <> 'retired'`);
    applyCompiledFilters(qb);
    applyQuickSearch(qb);

    // Sorting
    const appFields = new Set([
      'id', 'name', 'supplier_id', 'category', 'editor', 'lifecycle', 'criticality', 'data_class', 'hosting_model', 'external_facing', 'is_suite', 'last_dr_test', 'sso_enabled', 'mfa_supported', 'contains_pii', 'users_mode', 'users_year', 'users_override', 'status', 'disabled_at', 'created_at', 'updated_at'
    ]);
    const direction: 'ASC' | 'DESC' = (String(sort.direction).toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
    if (sort.field === 'supplier_name' && needsSupplierJoin) {
      qb.addOrderBy('s.name', direction);
    } else if (include.has('counts') && sort.field === 'spend_count') {
      qb.addOrderBy(`(SELECT COUNT(*) FROM application_spend_items l WHERE l.application_id = a.id)`, direction, direction === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST');
    } else if (include.has('counts') && sort.field === 'capex_count') {
      qb.addOrderBy(`(SELECT COUNT(*) FROM application_capex_items l WHERE l.application_id = a.id)`, direction, direction === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST');
    } else if (include.has('counts') && sort.field === 'contracts_count') {
      qb.addOrderBy(`(SELECT COUNT(*) FROM application_contracts l WHERE l.application_id = a.id)`, direction, direction === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST');
    } else if (include.has('structure') && sort.field === 'suites_count') {
      qb.addOrderBy(`(SELECT COUNT(*) FROM application_suites l WHERE l.application_id = a.id)`, direction, direction === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST');
    } else if (include.has('structure') && sort.field === 'components_count') {
      qb.addOrderBy(`(SELECT COUNT(*) FROM application_suites l WHERE l.suite_id = a.id)`, direction, direction === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST');
    } else if (appFields.has(sort.field)) {
      qb.orderBy(`a.${sort.field}`, direction);
    } else {
      qb.orderBy('a.created_at', 'DESC');
    }
    qb.skip(skip).take(limit);

    const { raw, entities } = await qb.getRawAndEntities();
    const pageIds = entities.map((e) => e.id);

    // Prepare expansions
    const expansions = await this.buildExpansions(pageIds, include, mg);

    // Compute derived users per row and attach expansions
    const items = await Promise.all(
      entities.map(async (app, idx) => {
        const base: any = { ...app };
        if (include.has('supplier')) {
          const r = (raw[idx] || {}) as any;
          base.supplier_name = r.s_name || null;
        }
        if (include.has('owners')) {
          const ow = expansions.ownersByApp[app.id] || { business: [], it: [] };
          base.owners_business = ow.business;
          base.owners_it = ow.it;
        }
        if (include.has('residency')) {
          base.data_residency = expansions.residencyByApp[app.id] || [];
        }
        if (include.has('hosting')) {
          base.hosting_types = expansions.hostingByApp[app.id] || [];
        }
        if (include.has('counts')) {
          const s = expansions.spendAgg[app.id];
          const cpx = expansions.capexAgg[app.id];
          const ct = expansions.contractAgg[app.id];
          base.spend_count = s?.c || 0;
          base.spend_first_name = s?.first_name || null;
          base.capex_count = cpx?.c || 0;
          base.capex_first_description = cpx?.first_description || null;
          base.contracts_count = ct?.c || 0;
          base.contracts_first_name = ct?.first_name || null;
        }
        if (include.has('structure')) {
          const su = expansions.suitesAgg[app.id];
          const co = expansions.componentsAgg[app.id];
          base.suites_count = su?.c || 0;
          base.first_suite_name = su?.first_name || null;
          base.components_count = co?.c || 0;
          base.first_component_name = co?.first_name || null;
        }
        if (include.has('instances')) {
          base.instances = expansions.instancesByApp[app.id] || [];
        }
        const derived_total_users = await this.computeDerivedUsersInternal(app.id, app.users_year, app.users_mode, mg);
        base.derived_total_users = derived_total_users;
        return base;
      }),
    );

    return { items, total, page, limit };
  }

  /**
   * Return ordered list of matching application IDs for navigation.
   */
  async listIds(query: any, opts?: ServiceOpts): Promise<{ ids: string[]; total: number }> {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(Application);
    const tenantId = String(opts?.tenantId || '').trim();
    const { sort, q, filters } = parsePagination(query, { field: 'created_at', direction: 'DESC' });
    const ownerScope = parseOwnerScope(query);
    const includeInactive = parseIncludeInactive(query);
    const fm = (filters && typeof filters === 'object') ? filters : undefined;

    // Define filter targets for AG Grid model -> SQL translation
    type Target = FilterTargetConfig;
    const targets: Record<string, Target> = {
      id: { expression: 'a.id', dataType: 'string' },
      name: { expression: 'a.name', dataType: 'string' },
      supplier_id: { expression: 'a.supplier_id', dataType: 'string' },
      category: { expression: 'a.category', dataType: 'string' },
      editor: { expression: 'a.editor', dataType: 'string' },
      lifecycle: { expression: 'a.lifecycle', dataType: 'string' },
      criticality: { expression: 'a.criticality', dataType: 'string' },
      data_class: { expression: 'a.data_class', dataType: 'string' },
      hosting_model: { expression: 'a.hosting_model', dataType: 'string' },
      external_facing: { expression: 'a.external_facing', numericExpression: 'COALESCE(a.external_facing, false)', dataType: 'boolean' },
      is_suite: { expression: 'a.is_suite', dataType: 'boolean' },
      sso_enabled: { expression: 'a.sso_enabled', numericExpression: 'COALESCE(a.sso_enabled, false)', dataType: 'boolean' },
      mfa_supported: { expression: 'a.mfa_supported', numericExpression: 'COALESCE(a.mfa_supported, false)', dataType: 'boolean' },
      contains_pii: { expression: 'a.contains_pii', numericExpression: 'COALESCE(a.contains_pii, false)', dataType: 'boolean' },
      status: { expression: 'a.status', textExpression: 'CAST(a.status AS TEXT)', dataType: 'string' },
      created_at: { expression: 'a.created_at', textExpression: 'CAST(a.created_at AS TEXT)', dataType: 'string' },
    };

    targets['environments'] = {
      expression: 'a.id',
      textExpression:
        `COALESCE((SELECT string_agg(ai.environment, ',') ` +
        `FROM app_instances ai ` +
        `WHERE ai.application_id = a.id), '')`,
      dataType: 'string',
    };
    targets['hosting_types'] = {
      expression: 'a.id',
      textExpression: `COALESCE((SELECT string_agg(DISTINCT l.hosting_type, ',')
        FROM app_instances ai
        JOIN app_asset_assignments aaa ON aaa.app_instance_id = ai.id
        JOIN assets ast ON ast.id = aaa.asset_id
        LEFT JOIN locations l ON l.id = ast.location_id
        WHERE ai.application_id = a.id AND l.hosting_type IS NOT NULL), '')`,
      dataType: 'string',
    };

    const lifecycleFilterPresent = !!(fm && Object.prototype.hasOwnProperty.call(fm, 'lifecycle'));

    const nextParam = createParamNameGenerator('p');
    const compiledFilters: CompiledCondition[] = [];
    if (fm) {
      for (const [field, model] of Object.entries(fm)) {
        if (field === 'environments') {
          const custom = compileEnvironmentsSetFilter(model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        if (field === 'hosting_types') {
          const custom = compileHostingTypesSetFilter(model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        if (field === 'linked_project_name') {
          const custom = compileLinkedProjectTextFilter(model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        if (field === 'owners_business') {
          const custom = compileOwnerNameFilter('business', model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        if (field === 'owners_it') {
          const custom = compileOwnerNameFilter('it', model, nextParam);
          if (custom) {
            compiledFilters.push(custom);
            continue;
          }
        }
        const target = targets[field];
        if (!target) continue;
        const cond = compileAgFilterCondition(model, target, nextParam);
        if (cond) compiledFilters.push(cond);
      }
    }
    const quickSearch = q ? buildQuickSearchConditions(q, ['a.name', buildApplicationOwnerNamesSql('it')], nextParam) : [];

    // Build query
    const qb = repo.createQueryBuilder('a').select('a.id');
    if (tenantId) {
      qb.andWhere('a.tenant_id = :tenantId', { tenantId });
    }
    if (!includeInactive) {
      qb.andWhere('(a.disabled_at IS NULL OR a.disabled_at > NOW())');
    }
    applyOwnerScopeCondition(qb, ownerScope);
    if (!includeInactive && !lifecycleFilterPresent) qb.andWhere(`a.lifecycle <> 'retired'`);

    // Apply compiled filter conditions
    compiledFilters.forEach((c) => {
      qb.andWhere(new Brackets((sub) => sub.where(c.sql, c.params)));
    });

    // Apply quick search
    if (quickSearch.length > 0) {
      qb.andWhere(
        new Brackets((sub) => {
          quickSearch.forEach((cond, idx) => {
            if (idx === 0) sub.where(cond.sql, cond.params);
            else sub.orWhere(cond.sql, cond.params);
          });
        }),
      );
    }

    // Sorting
    const appFields = new Set([
      'id', 'name', 'supplier_id', 'category', 'editor', 'lifecycle', 'criticality',
      'data_class', 'hosting_model', 'status', 'created_at', 'updated_at',
    ]);
    const direction: 'ASC' | 'DESC' = (String(sort.direction).toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
    if (appFields.has(sort.field)) {
      qb.orderBy(`a.${sort.field}`, direction);
    } else {
      qb.orderBy('a.created_at', 'DESC');
    }

    const rows = await qb.getRawMany();
    const ids = rows.map((r) => r.a_id);

    return { ids, total: ids.length };
  }

  /**
   * Return scoped filter values for checkbox set filters.
   */
  async listFilterValues(query: any, opts?: ServiceOpts): Promise<Record<string, Array<string | boolean | null>>> {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(Application);
    const tenantId = String(opts?.tenantId || '').trim();
    const { q, filters } = parsePagination(query, { field: 'created_at', direction: 'DESC' });
    const ownerScope = parseOwnerScope(query);
    const includeInactive = parseIncludeInactive(query);
    const fm = (filters && typeof filters === 'object') ? filters : undefined;

    const rawFields = String(query?.fields || query?.field || '').split(',').map((f) => f.trim()).filter(Boolean);
    const allowed = new Set([
      'category',
      'status',
      'environments',
      'lifecycle',
      'criticality',
      'hosting_model',
      'hosting_types',
      'supplier_name',
      'owners_business',
      'owners_it',
      'external_facing',
      'sso_enabled',
      'mfa_supported',
      'data_class',
      'contains_pii',
    ]);
    const fields = rawFields.filter((field) => allowed.has(field));
    if (fields.length === 0) return {};

    const results: Record<string, Array<string | boolean | null>> = {};

    const baseTargets: Record<string, FilterTargetConfig> = {
      id: { expression: 'a.id', dataType: 'string' },
      name: { expression: 'a.name', dataType: 'string' },
      supplier_id: { expression: 'a.supplier_id', dataType: 'string' },
      category: { expression: 'a.category', dataType: 'string' },
      editor: { expression: 'a.editor', dataType: 'string' },
      environment: { expression: 'a.environment', dataType: 'string' },
      lifecycle: { expression: 'a.lifecycle', dataType: 'string' },
      criticality: { expression: 'a.criticality', dataType: 'string' },
      data_class: { expression: 'a.data_class', dataType: 'string' },
      hosting_model: { expression: 'a.hosting_model', dataType: 'string' },
      external_facing: { expression: 'a.external_facing', numericExpression: 'COALESCE(a.external_facing, false)', dataType: 'boolean' },
      is_suite: { expression: 'a.is_suite', dataType: 'boolean' },
      retired_date: { expression: 'a.retired_date', textExpression: 'CAST(a.retired_date AS TEXT)', dataType: 'string' },
      last_dr_test: { expression: 'a.last_dr_test', textExpression: 'CAST(a.last_dr_test AS TEXT)', dataType: 'string' },
      sso_enabled: { expression: 'a.sso_enabled', numericExpression: 'COALESCE(a.sso_enabled, false)', dataType: 'boolean' },
      mfa_supported: { expression: 'a.mfa_supported', numericExpression: 'COALESCE(a.mfa_supported, false)', dataType: 'boolean' },
      etl_enabled: { expression: 'a.etl_enabled', numericExpression: 'COALESCE(a.etl_enabled, false)', dataType: 'boolean' },
      contains_pii: { expression: 'a.contains_pii', numericExpression: 'COALESCE(a.contains_pii, false)', dataType: 'boolean' },
      status: { expression: 'a.status', textExpression: 'CAST(a.status AS TEXT)', dataType: 'string' },
      disabled_at: { expression: 'a.disabled_at', textExpression: 'CAST(a.disabled_at AS TEXT)', dataType: 'string' },
      created_at: { expression: 'a.created_at', textExpression: 'CAST(a.created_at AS TEXT)', dataType: 'string' },
      updated_at: { expression: 'a.updated_at', textExpression: 'CAST(a.updated_at AS TEXT)', dataType: 'string' },
      supplier_name: { expression: 's.name', dataType: 'string' },
      owners_business: {
        expression: 'a.id',
        textExpression: buildApplicationOwnerNamesSql('business'),
        dataType: 'string',
      },
      owners_it: {
        expression: 'a.id',
        textExpression: buildApplicationOwnerNamesSql('it'),
        dataType: 'string',
      },
      environments: {
        expression: 'a.id',
        textExpression:
          `COALESCE((SELECT string_agg(ai.environment, ',') ` +
          `FROM app_instances ai ` +
          `WHERE ai.application_id = a.id), '')`,
        dataType: 'string',
      },
      hosting_types: {
        expression: 'a.id',
        textExpression: `COALESCE((SELECT string_agg(DISTINCT l.hosting_type, ',')
          FROM app_instances ai
          JOIN app_asset_assignments aaa ON aaa.app_instance_id = ai.id
          JOIN assets ast ON ast.id = aaa.asset_id
          LEFT JOIN locations l ON l.id = ast.location_id
          WHERE ai.application_id = a.id AND l.hosting_type IS NOT NULL), '')`,
        dataType: 'string',
      },
    };

    const applyCompiledFilters = (builder: ReturnType<typeof repo.createQueryBuilder>, compiled: CompiledCondition[]) => {
      compiled.forEach((c) => {
        builder.andWhere(new Brackets((qb) => qb.where(c.sql, c.params)));
      });
    };

    const applyQuickSearch = (builder: ReturnType<typeof repo.createQueryBuilder>, quickSearch: CompiledCondition[]) => {
      if (quickSearch.length === 0) return;
      builder.andWhere(
        new Brackets((sub) => {
          quickSearch.forEach((cond, idx) => {
            if (idx === 0) sub.where(cond.sql, cond.params);
            else sub.orWhere(cond.sql, cond.params);
          });
        }),
      );
    };

    const buildBaseQuery = (
      filtersForField: any,
      lifecycleFilterPresent: boolean,
      skipLifecycleDefault: boolean,
      needsSupplierJoin: boolean,
    ) => {
      const qb = repo.createQueryBuilder('a');
      if (tenantId) {
        qb.andWhere('a.tenant_id = :tenantId', { tenantId });
      }
      if (needsSupplierJoin) {
        qb.leftJoin('suppliers', 's', 's.id = a.supplier_id AND s.tenant_id = a.tenant_id');
      }
      if (!includeInactive) {
        qb.andWhere('(a.disabled_at IS NULL OR a.disabled_at > NOW())');
      }
      applyOwnerScopeCondition(qb, ownerScope);
      if (!includeInactive && !lifecycleFilterPresent && !skipLifecycleDefault) qb.andWhere(`a.lifecycle <> 'retired'`);
      return qb;
    };

    for (const field of fields) {
      const filtersForField = fm ? { ...fm } : {};
      if (filtersForField && Object.prototype.hasOwnProperty.call(filtersForField, field)) {
        delete filtersForField[field];
      }

      const lifecycleFilterPresent = !!(filtersForField && Object.prototype.hasOwnProperty.call(filtersForField, 'lifecycle'));
      const needsSupplierJoin = field === 'supplier_name' || (filtersForField && Object.prototype.hasOwnProperty.call(filtersForField, 'supplier_name'));
      const nextParam = createParamNameGenerator('p');
      const compiledFilters: CompiledCondition[] = [];

      if (filtersForField) {
        for (const [filterField, model] of Object.entries(filtersForField)) {
          if (filterField === 'environments') {
            const custom = compileEnvironmentsSetFilter(model, nextParam);
            if (custom) {
              compiledFilters.push(custom);
              continue;
            }
          }
          if (filterField === 'hosting_types') {
            const custom = compileHostingTypesSetFilter(model, nextParam);
            if (custom) {
              compiledFilters.push(custom);
              continue;
            }
          }
          if (filterField === 'owners_business') {
            const custom = compileOwnerNameFilter('business', model, nextParam);
            if (custom) {
              compiledFilters.push(custom);
              continue;
            }
          }
          if (filterField === 'owners_it') {
            const custom = compileOwnerNameFilter('it', model, nextParam);
            if (custom) {
              compiledFilters.push(custom);
              continue;
            }
          }
          const target = baseTargets[filterField];
          if (!target) continue;
          const cond = compileAgFilterCondition(model, target, nextParam);
          if (cond) compiledFilters.push(cond);
        }
      }

      const quickSearch = q ? buildQuickSearchConditions(q, ['a.name', buildApplicationOwnerNamesSql('it')], nextParam) : [];
      const baseQb = buildBaseQuery(filtersForField, lifecycleFilterPresent, field === 'lifecycle', needsSupplierJoin);
      applyCompiledFilters(baseQb, compiledFilters);
      applyQuickSearch(baseQb, quickSearch);

      if (field === 'environments') {
        const qb = baseQb.clone();
        qb.innerJoin('app_instances', 'ai', 'ai.application_id = a.id');
        qb.andWhere(buildActiveInstanceCondition('ai'));
        qb.select('DISTINCT ai.environment', 'value');
        qb.orderBy('value', 'ASC');
        const rows = await qb.getRawMany();
        results[field] = rows.map((r: any) => r.value);
        continue;
      }

      if (field === 'hosting_types') {
        const qb = baseQb.clone();
        qb.innerJoin('app_instances', 'ai', 'ai.application_id = a.id');
        qb.innerJoin('app_asset_assignments', 'aaa', 'aaa.app_instance_id = ai.id');
        qb.innerJoin('assets', 'ast', 'ast.id = aaa.asset_id');
        qb.leftJoin('locations', 'l', 'l.id = ast.location_id');
        qb.andWhere('l.hosting_type IS NOT NULL');
        qb.select('DISTINCT l.hosting_type', 'value');
        qb.orderBy('value', 'ASC');
        const rows = await qb.getRawMany();
        results[field] = rows.map((r: any) => r.value);
        continue;
      }

      if (field === 'owners_it') {
        const qb = baseQb.clone();
        qb.innerJoin('application_owners', 'ao', `ao.application_id = a.id AND ao.tenant_id = a.tenant_id AND ao.owner_type = 'it'`);
        qb.innerJoin('users', 'u_owner', 'u_owner.id = ao.user_id AND u_owner.tenant_id = a.tenant_id');
        qb.select(`DISTINCT COALESCE(NULLIF(TRIM(CONCAT(u_owner.first_name, ' ', u_owner.last_name)), ''), u_owner.email)`, 'value');
        qb.orderBy('value', 'ASC');
        const rows = await qb.getRawMany();
        results[field] = rows.map((r: any) => r.value);
        continue;
      }

      if (field === 'owners_business') {
        const qb = baseQb.clone();
        qb.innerJoin('application_owners', 'ao', `ao.application_id = a.id AND ao.tenant_id = a.tenant_id AND ao.owner_type = 'business'`);
        qb.innerJoin('users', 'u_owner', 'u_owner.id = ao.user_id AND u_owner.tenant_id = a.tenant_id');
        qb.select(`DISTINCT COALESCE(NULLIF(TRIM(CONCAT(u_owner.first_name, ' ', u_owner.last_name)), ''), u_owner.email)`, 'value');
        qb.orderBy('value', 'ASC');
        const rows = await qb.getRawMany();
        results[field] = rows.map((r: any) => r.value);
        continue;
      }

      let expression = '';
      switch (field) {
        case 'category':
          expression = 'a.category';
          break;
        case 'status':
          expression = 'a.status';
          break;
        case 'lifecycle':
          expression = 'a.lifecycle';
          break;
        case 'criticality':
          expression = 'a.criticality';
          break;
        case 'hosting_model':
          expression = 'a.hosting_model';
          break;
        case 'data_class':
          expression = 'a.data_class';
          break;
        case 'supplier_name':
          expression = 's.name';
          break;
        case 'external_facing':
          expression = 'COALESCE(a.external_facing, false)';
          break;
        case 'sso_enabled':
          expression = 'COALESCE(a.sso_enabled, false)';
          break;
        case 'mfa_supported':
          expression = 'COALESCE(a.mfa_supported, false)';
          break;
        case 'contains_pii':
          expression = 'COALESCE(a.contains_pii, false)';
          break;
        default:
          expression = '';
      }

      if (!expression) {
        results[field] = [];
        continue;
      }

      const qb = baseQb.clone();
      qb.select(`DISTINCT ${expression}`, 'value');
      qb.orderBy('value', 'ASC');
      const rows = await qb.getRawMany();
      results[field] = rows.map((r: any) => r.value);
    }

    return results;
  }

  /**
   * Build expansions for list items.
   */
  private async buildExpansions(pageIds: string[], include: Set<string>, mg: any) {
    let ownersByApp: Record<string, { business: string[]; it: string[] }> = {};
    if (include.has('owners') && pageIds.length > 0) {
      const rows: Array<{ application_id: string; first_name: string | null; last_name: string | null; email: string; owner_type: 'business' | 'it' }> =
        await mg.query(
          `SELECT o.application_id, u.first_name, u.last_name, u.email, o.owner_type
           FROM application_owners o
           LEFT JOIN users u ON u.id = o.user_id AND u.tenant_id = o.tenant_id
           WHERE o.application_id = ANY($1)
           ORDER BY o.owner_type ASC, u.last_name ASC NULLS LAST, u.first_name ASC NULLS LAST, u.email ASC NULLS LAST`,
          [pageIds],
        );
      const map: Record<string, { business: string[]; it: string[] }> = {};
      for (const r of rows) {
        const key = r.application_id;
        if (!map[key]) map[key] = { business: [], it: [] };
        const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email;
        if (r.owner_type === 'business') map[key].business.push(name);
        else map[key].it.push(name);
      }
      ownersByApp = map;
    }

    let residencyByApp: Record<string, string[]> = {};
    if (include.has('residency') && pageIds.length > 0) {
      const rows: Array<{ application_id: string; country_iso: string }> = await mg.query(
        `SELECT application_id, country_iso FROM application_data_residency WHERE application_id = ANY($1)`,
        [pageIds],
      );
      const map: Record<string, string[]> = {};
      for (const r of rows) {
        if (!map[r.application_id]) map[r.application_id] = [];
        map[r.application_id].push((r.country_iso || '').toUpperCase());
      }
      residencyByApp = map;
    }

    let hostingByApp: Record<string, string[]> = {};
    if (include.has('hosting') && pageIds.length > 0) {
      const hostingRows: Array<{ application_id: string; hosting_type: string }> = await mg.query(
        `SELECT DISTINCT ai.application_id, l.hosting_type
         FROM app_instances ai
         JOIN app_asset_assignments aaa ON aaa.app_instance_id = ai.id
         JOIN assets ast ON ast.id = aaa.asset_id
         LEFT JOIN locations l ON l.id = ast.location_id
         WHERE ai.application_id = ANY($1) AND l.hosting_type IS NOT NULL
         ORDER BY l.hosting_type ASC`,
        [pageIds],
      );
      const map: Record<string, string[]> = {};
      for (const r of hostingRows) {
        if (!map[r.application_id]) map[r.application_id] = [];
        if (!map[r.application_id].includes(r.hosting_type)) {
          map[r.application_id].push(r.hosting_type);
        }
      }
      hostingByApp = map;
    }

    let instancesByApp: Record<string, Array<any>> = {};
    if (include.has('instances') && pageIds.length > 0) {
      const rows = await mg.query(
        `SELECT id, application_id, environment, lifecycle, status, base_url, region, zone, notes, sso_enabled, mfa_supported, disabled_at, created_at, updated_at
         FROM app_instances
         WHERE application_id = ANY($1)
         ORDER BY environment ASC, created_at ASC`,
        [pageIds],
      );
      const grouped: typeof instancesByApp = {};
      for (const row of rows) {
        const list = grouped[row.application_id] || [];
        list.push({
          id: row.id,
          environment: row.environment,
          lifecycle: row.lifecycle,
          status: row.status,
          base_url: row.base_url,
          region: row.region,
          zone: row.zone,
          notes: row.notes,
          sso_enabled: row.sso_enabled,
          mfa_supported: row.mfa_supported,
          disabled_at: row.disabled_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
        grouped[row.application_id] = list;
      }
      instancesByApp = grouped;
    }

    let spendAgg: Record<string, { c: number; first_name: string | null }> = {};
    let capexAgg: Record<string, { c: number; first_description: string | null }> = {};
    let contractAgg: Record<string, { c: number; first_name: string | null }> = {};
    let suitesAgg: Record<string, { c: number; first_name: string | null }> = {};
    let componentsAgg: Record<string, { c: number; first_name: string | null }> = {};

    if (include.has('counts') && pageIds.length > 0) {
      const spendRows: Array<{ application_id: string; c: string; first_name: string | null }> = await mg.query(
        `SELECT l.application_id, COUNT(*)::text as c, MIN(si.product_name) as first_name
         FROM application_spend_items l
         JOIN spend_items si ON si.id = l.spend_item_id
         WHERE l.application_id = ANY($1)
         GROUP BY l.application_id`,
        [pageIds],
      );
      const capexRows: Array<{ application_id: string; c: string; first_description: string | null }> = await mg.query(
        `SELECT l.application_id, COUNT(*)::text as c, MIN(cx.description) as first_description
         FROM application_capex_items l
         JOIN capex_items cx ON cx.id = l.capex_item_id
         WHERE l.application_id = ANY($1)
         GROUP BY l.application_id`,
        [pageIds],
      );
      const contractRows: Array<{ application_id: string; c: string; first_name: string | null }> = await mg.query(
        `SELECT l.application_id, COUNT(*)::text as c, MIN(ct.name) as first_name
         FROM application_contracts l
         JOIN contracts ct ON ct.id = l.contract_id
         WHERE l.application_id = ANY($1)
         GROUP BY l.application_id`,
        [pageIds],
      );
      spendAgg = Object.fromEntries(spendRows.map((r) => [r.application_id, { c: Number(r.c), first_name: r.first_name }]));
      capexAgg = Object.fromEntries(capexRows.map((r) => [r.application_id, { c: Number(r.c), first_description: r.first_description }]));
      contractAgg = Object.fromEntries(contractRows.map((r) => [r.application_id, { c: Number(r.c), first_name: r.first_name }]));
    }

    if (include.has('structure') && pageIds.length > 0) {
      const suiteRows: Array<{ application_id: string; c: string; first_name: string | null }> = await mg.query(
        `SELECT l.application_id, COUNT(*)::text as c, MIN(sa.name) as first_name
         FROM application_suites l
         JOIN applications sa ON sa.id = l.suite_id
         WHERE l.application_id = ANY($1)
         GROUP BY l.application_id`,
        [pageIds],
      );
      const componentRows: Array<{ application_id: string; c: string; first_name: string | null }> = await mg.query(
        `SELECT l.suite_id as application_id, COUNT(*)::text as c, MIN(ca.name) as first_name
         FROM application_suites l
         JOIN applications ca ON ca.id = l.application_id
         WHERE l.suite_id = ANY($1)
         GROUP BY l.suite_id`,
        [pageIds],
      );
      suitesAgg = Object.fromEntries(suiteRows.map((r) => [r.application_id, { c: Number(r.c), first_name: r.first_name }]));
      componentsAgg = Object.fromEntries(componentRows.map((r) => [r.application_id, { c: Number(r.c), first_name: r.first_name }]));
    }

    return { ownersByApp, residencyByApp, hostingByApp, instancesByApp, spendAgg, capexAgg, contractAgg, suitesAgg, componentsAgg };
  }

  /**
   * Compute derived users based on mode.
   */
  private async computeDerivedUsersInternal(appId: string, year: number, mode: 'manual' | 'it_users' | 'headcount', mg: any): Promise<number> {
    if (mode === 'manual') {
      const app = await mg.getRepository(Application).findOne({ where: { id: appId } });
      return Math.max(0, Number(app?.users_override || 0));
    }
    const { ApplicationCompany } = await import('../application-company.entity');
    const { ApplicationDepartment } = await import('../application-department.entity');
    const { Department } = await import('../../departments/department.entity');
    const { CompanyMetric } = await import('../../companies/company-metric.entity');
    const { DepartmentMetric } = await import('../../departments/department-metric.entity');

    const compRepo = mg.getRepository(ApplicationCompany);
    const deptRepo = mg.getRepository(ApplicationDepartment);
    const [companies, departments] = await Promise.all([
      compRepo.find({ where: { application_id: appId } as any }),
      deptRepo.find({ where: { application_id: appId } as any }),
    ]);
    const companyIds = new Set(companies.map((c: any) => c.company_id));
    const departmentIds = departments.map((d: any) => d.department_id);
    let filteredDeptIds: string[] = departmentIds;
    if (departmentIds.length > 0 && companyIds.size > 0) {
      const deptEntities = await mg.getRepository(Department).find({ where: { id: In(departmentIds) } });
      filteredDeptIds = deptEntities.filter((d: any) => !companyIds.has(d.company_id)).map((d: any) => d.id);
    }
    let total = 0;
    if (companyIds.size > 0) {
      const metrics = await mg.getRepository(CompanyMetric).find({ where: { company_id: In([...companyIds]), fiscal_year: year } });
      for (const m of metrics) {
        const it = (m as any).it_users as number | null | undefined;
        const hc = Number(m.headcount || 0);
        total += mode === 'it_users' ? (typeof it === 'number' && it != null ? it : hc) : hc;
      }
    }
    if (filteredDeptIds.length > 0) {
      const metrics = await mg.getRepository(DepartmentMetric).find({ where: { department_id: In(filteredDeptIds), fiscal_year: year } });
      for (const m of metrics) {
        const hc = Number(m.headcount || 0);
        total += hc;
      }
    }
    return total;
  }

  /**
   * Lightweight projection for map side panels.
   */
  async mapSummary(id: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const app = await mg.getRepository(Application).findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    const ownerRows: Array<{ owner_type: string; user_id: string; first_name: string | null; last_name: string | null; email: string | null }> =
      await mg.query(
        `SELECT ao.owner_type, ao.user_id, u.first_name, u.last_name, u.email
         FROM application_owners ao
         JOIN users u ON u.id = ao.user_id AND u.tenant_id = ao.tenant_id
         WHERE ao.application_id = $1
         ORDER BY ao.owner_type ASC, u.last_name ASC NULLS LAST, u.first_name ASC NULLS LAST`,
        [id],
      );

    const owners = ownerRows.map((row) => ({
      owner_type: row.owner_type,
      user_id: row.user_id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.email || row.user_id,
      email: row.email,
    }));

    // Import support contacts helper
    const { ApplicationSupportContact } = await import('../application-support-contact.entity');
    const { ExternalContact } = await import('../../contacts/external-contact.entity');
    const scRows = await mg.query(
      `SELECT sc.id, sc.contact_id, sc.role, c.first_name, c.last_name, c.email, c.phone, c.mobile
       FROM application_support_contacts sc
       JOIN contacts c ON c.id = sc.contact_id
       WHERE sc.application_id = $1
       ORDER BY sc.created_at ASC, sc.id ASC`,
      [id],
    );
    const support_contacts = scRows.map((r: any) => ({
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

    const assetRows: Array<{ asset_id: string; asset_name: string; environment: string }> = await mg.query(
      `SELECT s.id AS asset_id, s.name AS asset_name, ai.environment
       FROM app_asset_assignments asa
       JOIN app_instances ai ON ai.id = asa.app_instance_id
       JOIN assets s ON s.id = asa.asset_id
       WHERE ai.application_id = $1
         AND s.status <> 'retired'
       ORDER BY array_position(ARRAY['prod','pre_prod','qa','test','dev','sandbox'], ai.environment), s.name ASC`,
      [id],
    );

    const assigned_servers = assetRows.map((row) => ({
      id: row.asset_id,
      name: row.asset_name,
      environment: row.environment,
    }));

    return {
      id: app.id,
      name: app.name,
      description: app.description,
      editor: app.editor,
      criticality: app.criticality,
      assigned_servers,
      business_owners: owners.filter((o) => o.owner_type === 'business'),
      it_owners: owners.filter((o) => o.owner_type === 'it'),
      support_contacts,
    };
  }

  /**
   * List applications with server assignments for Connection Map filtering.
   */
  async listWithServerAssignments(opts?: ServiceOpts) {
    const mg = this.getManager(opts);

    const rows: Array<{
      id: string;
      name: string;
      lifecycle: string;
      environment: string;
    }> = await mg.query(`
      SELECT DISTINCT
        a.id,
        a.name,
        a.lifecycle,
        ai.environment
      FROM applications a
      INNER JOIN app_instances ai ON ai.application_id = a.id
      INNER JOIN app_asset_assignments asa ON asa.app_instance_id = ai.id
      WHERE (a.disabled_at IS NULL OR a.disabled_at > NOW())
        AND a.lifecycle <> 'retired'
      ORDER BY a.name ASC, ai.environment ASC
    `);

    const appMap = new Map<string, { id: string; name: string; lifecycle: string; environments: string[] }>();
    for (const row of rows) {
      if (!appMap.has(row.id)) {
        appMap.set(row.id, {
          id: row.id,
          name: row.name,
          lifecycle: row.lifecycle,
          environments: [],
        });
      }
      const app = appMap.get(row.id)!;
      if (!app.environments.includes(row.environment)) {
        app.environments.push(row.environment);
      }
    }

    return { items: Array.from(appMap.values()) };
  }
}
