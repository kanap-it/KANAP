import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, In, Repository } from 'typeorm';
import { Connection } from '../connection.entity';
import { ConnectionServer } from '../connection-server.entity';
import { ConnectionProtocol } from '../connection-protocol.entity';
import { ConnectionLeg } from '../connection-leg.entity';
import { Asset } from '../../assets/asset.entity';
import { ItOpsSettingsService } from '../../it-ops-settings/it-ops-settings.service';
import { buildWhereFromAgFilters, parsePagination } from '../../common/pagination';
import { ConnectionsBaseService, ServiceOpts, Topology } from './connections-base.service';
import { normalizeBindingLifecycle } from '../../interface-bindings/interface-bindings.service';

/**
 * Extended Connection type for list items with additional computed fields.
 */
type ListItem = Connection & {
  source_label?: string | null;
  destination_label?: string | null;
  protocols?: string[];
  protocol_labels?: string[];
  multi_server_count?: number;
  source_asset_name?: string | null;
  destination_asset_name?: string | null;
  effective_criticality?: string;
  effective_data_class?: string;
  effective_contains_pii?: boolean;
  derived_interface_count?: number;
};

/**
 * Service for listing, filtering, and querying connections.
 */
@Injectable()
export class ConnectionsListService extends ConnectionsBaseService {
  constructor(
    @InjectRepository(Connection) connRepo: Repository<Connection>,
    @InjectRepository(ConnectionServer) connServers: Repository<ConnectionServer>,
    @InjectRepository(ConnectionProtocol) connProtocols: Repository<ConnectionProtocol>,
    @InjectRepository(ConnectionLeg) connLegs: Repository<ConnectionLeg>,
    @InjectRepository(Asset) assets: Repository<Asset>,
    itOpsSettings: ItOpsSettingsService,
  ) {
    super(connRepo, connServers, connProtocols, connLegs, assets, itOpsSettings);
  }

  /**
   * Enrich list items with protocols, counts, asset names, and labels.
   */
  private async enrichListItems(
    itemsRaw: Connection[],
    tenant: string,
    mg: EntityManager,
    effectiveRiskMap?: Map<
      string,
      {
        effective_criticality: string;
        effective_data_class: string;
        effective_contains_pii: boolean;
        derived_interface_count: number;
      }
    >,
  ): Promise<ListItem[]> {
    if (itemsRaw.length === 0) return [];

    const ids = itemsRaw.map((i) => i.id);

    // Fetch protocols for the connections
    const protoRows: Array<{ connection_id: string; connection_type_code: string }> = await mg.query(
      `SELECT connection_id, connection_type_code FROM connection_protocols WHERE connection_id = ANY($1)`,
      [ids],
    );
    const protoMap = new Map<string, string[]>();
    for (const row of protoRows) {
      const list = protoMap.get(row.connection_id) || [];
      list.push(row.connection_type_code);
      protoMap.set(row.connection_id, list);
    }

    // Fetch multi-server counts
    const countRows: Array<{ connection_id: string; c: string }> = await mg.query(
      `SELECT connection_id, COUNT(*)::text as c FROM connection_servers WHERE connection_id = ANY($1) GROUP BY connection_id`,
      [ids],
    );
    const countMap = new Map<string, number>(countRows.map((r) => [r.connection_id, Number(r.c)]));

    // Collect asset IDs to resolve names for source/destination
    const assetIds = Array.from(
      new Set(
        itemsRaw
          .flatMap((c) => [c.source_asset_id, c.destination_asset_id])
          .filter(Boolean) as string[],
      ),
    );
    let assetMap = new Map<string, { name: string; environment: string; kind: string; provider: string }>();
    if (assetIds.length > 0) {
      const rows: Array<{ id: string; name: string; environment: string; kind: string; provider: string }> =
        await mg.query(
          `SELECT id, name, environment, kind, provider FROM assets WHERE id = ANY($1)`,
          [assetIds],
        );
      assetMap = new Map(rows.map((r) => [r.id, r]));
    }

    const settings = await this.itOpsSettings.getSettings(tenant, { manager: mg });
    const entitiesMap = new Map((settings.entities || []).map((e: any) => [String(e.code), e.label || e.code]));
    const connTypeMap = new Map(
      (settings.connectionTypes || []).map((ct: any) => [String(ct.code), `${ct.label}`]),
    );

    return itemsRaw.map((c) => {
      const protocols = protoMap.get(c.id) || [];
      const protocol_labels = protocols.map((code) => connTypeMap.get(code) || code);
      const source_asset_name = c.source_asset_id ? assetMap.get(c.source_asset_id || '')?.name || null : null;
      const destination_asset_name = c.destination_asset_id
        ? assetMap.get(c.destination_asset_id || '')?.name || null
        : null;
      const source_label = c.source_asset_id
        ? source_asset_name
        : c.source_entity_code
          ? entitiesMap.get(c.source_entity_code) || c.source_entity_code
          : null;
      const destination_label = c.destination_asset_id
        ? destination_asset_name
        : c.destination_entity_code
          ? entitiesMap.get(c.destination_entity_code) || c.destination_entity_code
          : null;
      const effective = effectiveRiskMap?.get(c.id);
      return {
        ...c,
        // Backwards compatibility aliases
        source_server_id: c.source_asset_id,
        destination_server_id: c.destination_asset_id,
        protocols,
        protocol_labels,
        source_label,
        destination_label,
        source_asset_name,
        destination_asset_name,
        multi_server_count: countMap.get(c.id) || 0,
        effective_criticality: effective?.effective_criticality ?? c.criticality,
        effective_data_class: effective?.effective_data_class ?? c.data_class,
        effective_contains_pii: effective?.effective_contains_pii ?? c.contains_pii,
        derived_interface_count: effective?.derived_interface_count ?? 0,
      };
    });
  }

  /**
   * List connections with filtering, sorting, and pagination.
   */
  async list(tenantId: string, query: any, opts?: ServiceOpts) {
    const tenant = this.ensureTenantId(tenantId);
    const repo = this.getRepo(opts?.manager);
    const mg = opts?.manager ?? repo.manager;
    const { page, limit, skip, sort, q, filters } = parsePagination(query);
    const allowedFilters = ['connection_id', 'name', 'topology', 'lifecycle', 'criticality', 'data_class', 'contains_pii'];
    const where: Record<string, any> = buildWhereFromAgFilters(filters, allowedFilters);
    if (query.topology) {
      where.topology = this.normalizeTopology(query.topology);
    }
    if (query.lifecycle) {
      where.lifecycle = String(query.lifecycle || '').trim().toLowerCase();
    }
    if (query.criticality) {
      where.criticality = this.normalizeCriticality(query.criticality);
    }
    if (query.data_class) {
      where.data_class = await this.normalizeDataClass(query.data_class, tenant, mg);
    }
    if (query.contains_pii !== undefined) {
      where.contains_pii = this.normalizeContainsPii(query.contains_pii);
    }

    let whereArr: any[] | undefined;
    if (q) {
      const like = ILike(`%${q}%`);
      whereArr = [{ ...where, connection_id: like }, { ...where, name: like }];
    }

    const allowedSortFields = [
      'connection_id',
      'name',
      'topology',
      'lifecycle',
      'criticality',
      'data_class',
      'contains_pii',
      'created_at',
      'updated_at',
    ];
    const sortField = allowedSortFields.includes(sort.field) ? sort.field : 'created_at';
    const order = { [sortField]: sort.direction as any };

    const [itemsRaw, total] = await repo.findAndCount({
      where: whereArr ?? where,
      order,
      skip,
      take: limit,
    });

    if (itemsRaw.length === 0) {
      return { items: [], total, page, limit };
    }

    const riskBases = itemsRaw.map((c) => ({
      id: c.id,
      risk_mode: ((c.risk_mode as any) || 'manual') as 'manual' | 'derived',
      criticality: c.criticality,
      data_class: c.data_class,
      contains_pii: c.contains_pii,
    }));
    const effectiveRiskMap = await this.computeEffectiveRiskForConnections(tenant, riskBases, mg);
    const items = await this.enrichListItems(itemsRaw, tenant, mg, effectiveRiskMap);

    return { items, total, page, limit };
  }

  /**
   * List connections associated with a specific asset.
   */
  async listByAsset(assetId: string, tenantId: string, opts?: ServiceOpts) {
    const tenant = this.ensureTenantId(tenantId);
    const aid = this.normalizeRequiredText(assetId, 'assetId');
    const mg = opts?.manager ?? this.connRepo.manager;

    const rows: Array<{ id: string }> = await mg.query(
      `SELECT DISTINCT c.id
       FROM connections c
       LEFT JOIN connection_servers cs ON cs.connection_id = c.id
       WHERE c.tenant_id = $1
         AND (c.source_asset_id = $2 OR c.destination_asset_id = $2 OR cs.asset_id = $2)`,
      [tenant, aid],
    );

    if (!rows || rows.length === 0) {
      return { items: [], total: 0 };
    }

    const ids = Array.from(new Set(rows.map((r) => r.id)));
    const repo = this.getRepo(opts?.manager);
    const itemsRaw = await repo.find({
      where: { id: In(ids), tenant_id: tenant } as any,
      order: { created_at: 'DESC' },
    });
    if (itemsRaw.length === 0) {
      return { items: [], total: 0 };
    }
    const riskBases = itemsRaw.map((c) => ({
      id: c.id,
      risk_mode: ((c.risk_mode as any) || 'manual') as 'manual' | 'derived',
      criticality: c.criticality,
      data_class: c.data_class,
      contains_pii: c.contains_pii,
    }));
    const effectiveRiskMap = await this.computeEffectiveRiskForConnections(tenant, riskBases, mg);
    const items = await this.enrichListItems(itemsRaw, tenant, mg, effectiveRiskMap);
    return { items, total: items.length };
  }

  /**
   * Backwards compatibility alias for listByAsset.
   */
  async listByServer(serverId: string, tenantId: string, opts?: ServiceOpts) {
    return this.listByAsset(serverId, tenantId, opts);
  }

  /**
   * List interface links for a connection.
   */
  async listInterfaceLinks(
    connectionId: string,
    tenantId: string,
    opts?: ServiceOpts,
  ) {
    this.ensureTenantId(tenantId);
    const mg = opts?.manager ?? this.connRepo.manager;

    await this.ensureConnection(connectionId, mg);

    const rows: Array<{
      link_id: string;
      binding_id: string;
      environment: string;
      binding_status: string;
      leg_type: string;
      order_index: number;
      source_endpoint: string | null;
      target_endpoint: string | null;
      integration_pattern: string;
      interface_id: string;
      interface_code: string;
      interface_name: string;
      interface_lifecycle: string;
      interface_criticality: string;
      interface_data_class: string;
      interface_contains_pii: boolean;
      source_application_id: string;
      target_application_id: string;
    }> = await mg.query(
      `SELECT
         l.id AS link_id,
         l.interface_binding_id AS binding_id,
         b.environment,
         b.status AS binding_status,
         b.source_endpoint,
         b.target_endpoint,
         leg.leg_type,
         leg.integration_pattern,
         leg.order_index,
         i.id AS interface_id,
         i.interface_id AS interface_code,
         i.name AS interface_name,
         i.lifecycle AS interface_lifecycle,
         i.criticality AS interface_criticality,
         i.data_class AS interface_data_class,
         i.contains_pii AS interface_contains_pii,
         i.source_application_id,
         i.target_application_id
       FROM interface_connection_links l
       JOIN interface_bindings b ON b.id = l.interface_binding_id
       JOIN interface_legs leg ON leg.id = b.interface_leg_id
       JOIN interfaces i ON i.id = b.interface_id
       WHERE l.connection_id = $1
       ORDER BY i.name ASC, b.environment ASC, leg.order_index ASC`,
      [connectionId],
    );

    return {
      items: rows.map((r) => ({
        id: r.link_id,
        binding_id: r.binding_id,
        interface_id: r.interface_id,
        interface_code: r.interface_code,
        interface_name: r.interface_name,
        environment: r.environment,
        leg_type: r.leg_type,
        source_endpoint: r.source_endpoint,
        target_endpoint: r.target_endpoint,
        pattern: r.integration_pattern,
        binding_status: normalizeBindingLifecycle(r.binding_status),
        interface_lifecycle: r.interface_lifecycle,
        interface_criticality: r.interface_criticality,
        interface_data_class: r.interface_data_class,
        interface_contains_pii: r.interface_contains_pii,
        source_application_id: r.source_application_id,
        target_application_id: r.target_application_id,
      })),
    };
  }

  /**
   * Get map data for connections visualization.
   */
  async map(tenantId: string, query: any, opts?: ServiceOpts) {
    const tenant = this.ensureTenantId(tenantId);
    const mg = opts?.manager ?? this.connRepo.manager;
    const environment = this.normalizeEnvironment(query?.environment);
    const settings = await this.itOpsSettings.getSettings(tenant, { manager: mg });
    const allowedLifecycles = (settings.lifecycleStates || []).map((item) => item.code);
    const lifecycles = this.normalizeLifecycleFilters(query?.lifecycles, allowedLifecycles);
    const TIER_PRIORITY: Record<string, number> = { top: 0, upper: 1, center: 2, lower: 3, bottom: 4 };
    const roleTierMap = new Map<string, string>(
      (settings.serverRoles || []).map((r: any) => [
        String(r.code || '').trim().toLowerCase(),
        String(r.graph_tier || 'center').trim().toLowerCase() || 'center',
      ]),
    );
    const entityTierMap = new Map<string, string>(
      (settings.entities || []).map((e: any) => [
        String(e.code || '').trim().toLowerCase(),
        String(e.graph_tier || 'top').trim().toLowerCase() || 'top',
      ]),
    );

    const rows: Array<any> = await mg.query(
      `SELECT
         c.*,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT cp.connection_type_code), NULL) AS protocol_codes,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT cs.asset_id), NULL) AS asset_ids
       FROM connections c
       LEFT JOIN connection_protocols cp ON cp.connection_id = c.id
       LEFT JOIN connection_servers cs ON cs.connection_id = c.id
       WHERE c.tenant_id = $1
         AND c.lifecycle = ANY($2::text[])
         AND (
           (c.topology = 'server_to_server' AND (
             EXISTS (SELECT 1 FROM assets a WHERE a.id = c.source_asset_id AND a.environment = $3)
             OR EXISTS (SELECT 1 FROM assets a WHERE a.id = c.destination_asset_id AND a.environment = $3)
           ))
           OR
           (c.topology = 'multi_server' AND EXISTS (
             SELECT 1
             FROM connection_servers cs2
             JOIN assets a2 ON a2.id = cs2.asset_id
             WHERE cs2.connection_id = c.id
               AND a2.environment = $3
           ))
           OR EXISTS (
             SELECT 1
             FROM connection_legs cl
             LEFT JOIN assets a3 ON a3.id = cl.source_asset_id
             LEFT JOIN assets a4 ON a4.id = cl.destination_asset_id
             WHERE cl.connection_id = c.id
               AND (
                 (a3.environment = $3)
                 OR (a4.environment = $3)
                 OR (cl.source_asset_id IS NULL AND cl.destination_asset_id IS NULL)
               )
           )
         )
       GROUP BY c.id`,
      [tenant, lifecycles, environment],
    );

    if (!rows || rows.length === 0) {
      return { environment, lifecycles, nodes: [], connections: [] };
    }

    const connectionIds = rows.map((r) => r.id as string);
    const legRows: Array<any> =
      connectionIds.length > 0
        ? await mg.query(
            `SELECT *
             FROM connection_legs
             WHERE connection_id = ANY($1::uuid[])
               AND tenant_id = $2
             ORDER BY order_index ASC, created_at ASC`,
            [connectionIds, tenant],
          )
        : [];

    const legsByConnection = new Map<string, any[]>();
    for (const leg of legRows) {
      const list = legsByConnection.get(leg.connection_id) || [];
      list.push(leg);
      legsByConnection.set(leg.connection_id, list);
    }

    const protocolLabelMap = new Map(
      (settings.connectionTypes || []).map((ct: any) => [
        String(ct.code || '').trim().toLowerCase(),
        String(ct.label || ct.code),
      ]),
    );
    const entityLabelMap = new Map(
      (settings.entities || []).map((e: any) => [String(e.code || '').trim().toLowerCase(), e.label || e.code]),
    );
    const hostingTypeCategoryMap = new Map(
      (settings.hostingTypes || []).map((ht: any) => [
        String(ht.code || '').trim().toLowerCase(),
        (ht.category === 'cloud' || ht.category === 'on_prem') ? ht.category : undefined,
      ]),
    );
    const cloudProviders = new Set(['aws', 'azure', 'gcp']);

    const assetIds = new Set<string>();
    const entityCodes = new Set<string>();

    for (const row of rows) {
      if (row.source_asset_id) assetIds.add(row.source_asset_id);
      if (row.destination_asset_id) assetIds.add(row.destination_asset_id);
      if (Array.isArray(row.asset_ids)) {
        for (const aid of row.asset_ids) {
          if (aid) assetIds.add(aid);
        }
      }
      if (row.source_entity_code) entityCodes.add(String(row.source_entity_code).trim().toLowerCase());
      if (row.destination_entity_code) entityCodes.add(String(row.destination_entity_code).trim().toLowerCase());
    }
    for (const leg of legRows) {
      if (leg.source_asset_id) assetIds.add(leg.source_asset_id);
      if (leg.destination_asset_id) assetIds.add(leg.destination_asset_id);
      if (leg.source_entity_code) entityCodes.add(String(leg.source_entity_code).trim().toLowerCase());
      if (leg.destination_entity_code) entityCodes.add(String(leg.destination_entity_code).trim().toLowerCase());
    }

    const assetRows: Array<{
      id: string;
      name: string;
      environment: string;
      location_id: string | null;
      provider: string;
      is_cluster: boolean;
    }> =
      assetIds.size > 0
        ? await mg.query(
            `SELECT id, name, environment, location_id, provider, is_cluster
             FROM assets
             WHERE id = ANY($1::uuid[])`,
            [Array.from(assetIds)],
          )
        : [];

    const locationIds = Array.from(
      new Set(assetRows.map((a) => a.location_id).filter((v): v is string => !!v)),
    );
    const locationMap: Map<string, { id: string; hosting_type: string | null; provider: string | null }> = new Map();
    if (locationIds.length > 0) {
      const locRows: Array<{ id: string; hosting_type: string | null; provider: string | null }> = await mg.query(
        `SELECT id, hosting_type, provider FROM locations WHERE id = ANY($1::uuid[])`,
        [locationIds],
      );
      locRows.forEach((loc) => locationMap.set(loc.id, loc));
    }

    const deriveHostingCategory = (asset: { location_id: string | null; provider: string | null }): 'on_prem' | 'cloud' | null => {
      if (asset.location_id) {
        const loc = locationMap.get(asset.location_id);
        const hostingType = String(loc?.hosting_type || '').trim().toLowerCase();
        const cat = hostingTypeCategoryMap.get(hostingType);
        if (cat === 'cloud' || cat === 'on_prem') return cat;
      }
      const provider = String(asset.provider || '').trim().toLowerCase();
      if (cloudProviders.has(provider)) return 'cloud';
      if (provider) return 'on_prem';
      return null;
    };

    // Fetch cluster memberships for assets in this graph
    const clusterMemberRows: Array<{ cluster_id: string; asset_id: string }> =
      assetIds.size > 0
        ? await mg.query(
            `SELECT cluster_id, asset_id
             FROM asset_cluster_members
             WHERE tenant_id = $1
               AND (cluster_id = ANY($2::uuid[]) OR asset_id = ANY($2::uuid[]))`,
            [tenant, Array.from(assetIds)],
          )
        : [];

    const assetRoleRows: Array<{ asset_id: string; role: string }> =
      assetIds.size > 0
        ? await mg.query(
            `SELECT DISTINCT aaa.asset_id, aaa.role
             FROM app_asset_assignments aaa
             JOIN app_instances ai ON ai.id = aaa.app_instance_id
             WHERE aaa.tenant_id = $1
               AND aaa.asset_id = ANY($2::uuid[])
               AND ai.environment = $3`,
            [tenant, Array.from(assetIds), environment],
          )
        : [];

    const assetTierMap = new Map<string, string>();
    for (const row of assetRoleRows) {
      const roleCode = String(row.role || '').trim().toLowerCase();
      const tier = roleTierMap.get(roleCode) || 'center';
      const existing = assetTierMap.get(row.asset_id);
      if (!existing || (TIER_PRIORITY[tier] ?? 2) < (TIER_PRIORITY[existing] ?? 2)) {
        assetTierMap.set(row.asset_id, tier);
      }
    }

    // Build a map of cluster_id -> member asset IDs
    const clusterMembersMap = new Map<string, string[]>();
    for (const row of clusterMemberRows) {
      const members = clusterMembersMap.get(row.cluster_id) || [];
      members.push(row.asset_id);
      clusterMembersMap.set(row.cluster_id, members);
    }

    // Clusters cannot be assigned roles directly, so inherit the highest tier from members.
    for (const [clusterId, memberIds] of clusterMembersMap) {
      let bestTier = 'center';
      for (const memberId of memberIds) {
        const memberTier = assetTierMap.get(memberId);
        if (memberTier && (TIER_PRIORITY[memberTier] ?? 2) < (TIER_PRIORITY[bestTier] ?? 2)) {
          bestTier = memberTier;
        }
      }
      assetTierMap.set(clusterId, bestTier);
    }

    const assetNodes = assetRows.map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.is_cluster ? ('cluster' as const) : ('server' as const),
      is_cluster: !!row.is_cluster,
      environment: row.environment || null,
      hosting_category: deriveHostingCategory(row),
      graph_tier: assetTierMap.get(row.id) || null,
      member_server_ids: row.is_cluster ? (clusterMembersMap.get(row.id) || []) : undefined,
    }));

    // Build flat array of cluster memberships for frontend graph force
    const clusterMemberships = clusterMemberRows
      .filter((r) => assetIds.has(r.cluster_id) && assetIds.has(r.asset_id))
      .map((r) => ({ cluster_id: r.cluster_id, server_id: r.asset_id }));

    const entityNodes = Array.from(entityCodes).map((code) => ({
      id: `entity:${code}`,
      name: entityLabelMap.get(code) || code,
      kind: 'entity' as const,
      environment: null,
      hosting_category: null,
      graph_tier: entityTierMap.get(code) || 'top',
    }));

    const riskBases = rows.map((row) => ({
      id: row.id as string,
      risk_mode: ((row.risk_mode as any) || 'manual') as 'manual' | 'derived',
      criticality: String(row.criticality || '').trim().toLowerCase(),
      data_class: String(row.data_class || '').trim().toLowerCase(),
      contains_pii: !!row.contains_pii,
    }));
    const effectiveRiskMap = await this.computeEffectiveRiskForConnections(tenant, riskBases, mg);

    const connections = rows.map((row) => {
      const protocol_codes: string[] = Array.isArray(row.protocol_codes)
        ? (row.protocol_codes as any[]).map((c) => String(c || '').trim().toLowerCase()).filter(Boolean)
        : [];
      const protocol_labels = protocol_codes.map((c) => protocolLabelMap.get(c) || c);
      const asset_ids_arr: string[] = Array.isArray(row.asset_ids)
        ? Array.from(new Set((row.asset_ids as any[]).map((aid) => String(aid || '')).filter(Boolean)))
        : [];
      const effective = effectiveRiskMap.get(row.id as string);
      const legDtos =
        legsByConnection.get(row.id as string)?.map((leg: any) => ({
          id: leg.id,
          order_index: Number(leg.order_index),
          layer_type: leg.layer_type,
          source_asset_id: leg.source_asset_id,
          source_entity_code: leg.source_entity_code,
          destination_asset_id: leg.destination_asset_id,
          destination_entity_code: leg.destination_entity_code,
          // Backwards compatibility aliases
          source_server_id: leg.source_asset_id,
          destination_server_id: leg.destination_asset_id,
          protocol_codes: Array.isArray(leg.protocol_codes)
            ? (leg.protocol_codes as any[]).map((c) => String(c || '').trim().toLowerCase()).filter(Boolean)
            : [],
          protocol_labels: Array.isArray(leg.protocol_codes)
            ? (leg.protocol_codes as any[]).map((c) => {
                const norm = String(c || '').trim().toLowerCase();
                return protocolLabelMap.get(norm) || norm;
              })
            : [],
          port_override: leg.port_override,
          notes: leg.notes,
        })) || [];
      return {
        id: row.id,
        connection_id: row.connection_id,
        name: row.name,
        topology: row.topology as Topology,
        lifecycle: row.lifecycle,
        criticality: effective?.effective_criticality ?? row.criticality,
        data_class: effective?.effective_data_class ?? row.data_class,
        contains_pii: effective?.effective_contains_pii ?? !!row.contains_pii,
        purpose: row.purpose,
        protocol_codes,
        protocol_labels,
        source_asset_id: row.source_asset_id,
        source_entity_code: row.source_entity_code,
        destination_asset_id: row.destination_asset_id,
        destination_entity_code: row.destination_entity_code,
        // Backwards compatibility aliases
        source_server_id: row.source_asset_id,
        destination_server_id: row.destination_asset_id,
        server_ids: asset_ids_arr,
        legs: legDtos,
      };
    });

    return {
      environment,
      lifecycles,
      nodes: [...assetNodes, ...entityNodes],
      connections,
      clusterMemberships,
    };
  }
}
