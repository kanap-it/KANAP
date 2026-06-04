import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Connection } from '../connection.entity';
import { ConnectionServer } from '../connection-server.entity';
import { ConnectionProtocol } from '../connection-protocol.entity';
import { ConnectionLeg } from '../connection-leg.entity';
import { Asset } from '../../assets/asset.entity';
import { ItOpsSettingsService } from '../../it-ops-settings/it-ops-settings.service';

/**
 * Topology types for connections.
 */
export type Topology = 'server_to_server' | 'multi_server';

/**
 * Connection criticality levels.
 */
export const CONNECTION_CRITICALITIES = ['business_critical', 'high', 'medium', 'low'] as const;

/**
 * Environment values for connections.
 */
export const ENVIRONMENTS = ['prod', 'pre_prod', 'qa', 'test', 'dev', 'sandbox'] as const;
export type EnvironmentValue = (typeof ENVIRONMENTS)[number];

/**
 * Hop input type for connection path hops (network intermediaries).
 */
export type LegInput = {
  order_index: number;
  function_code: string | null;
  equipment_asset_id: string | null;
  equipment_entity_code: string | null;
  protocol_codes: string[];
  port_override: string | null;
  notes: string | null;
};

/**
 * Common options for service methods.
 */
export interface ServiceOpts {
  manager?: EntityManager;
}

/**
 * Base class with shared utilities for connection services.
 */
export abstract class ConnectionsBaseService {
  constructor(
    protected readonly connRepo: Repository<Connection>,
    protected readonly connServers: Repository<ConnectionServer>,
    protected readonly connProtocols: Repository<ConnectionProtocol>,
    protected readonly connLegs: Repository<ConnectionLeg>,
    protected readonly assets: Repository<Asset>,
    protected readonly itOpsSettings: ItOpsSettingsService,
  ) {}

  protected getRepo(manager?: EntityManager): Repository<Connection> {
    return manager ? manager.getRepository(Connection) : this.connRepo;
  }

  protected getAssetRepo(manager?: EntityManager): Repository<Asset> {
    return manager ? manager.getRepository(Asset) : this.assets;
  }

  protected getConnServerRepo(manager?: EntityManager): Repository<ConnectionServer> {
    return manager ? manager.getRepository(ConnectionServer) : this.connServers;
  }

  protected getConnProtocolRepo(manager?: EntityManager): Repository<ConnectionProtocol> {
    return manager ? manager.getRepository(ConnectionProtocol) : this.connProtocols;
  }

  protected getLegRepo(manager?: EntityManager): Repository<ConnectionLeg> {
    return manager ? manager.getRepository(ConnectionLeg) : this.connLegs;
  }

  protected getManager(opts?: ServiceOpts): EntityManager {
    return opts?.manager ?? this.connRepo.manager;
  }

  protected ensureTenantId(tenantId?: string): string {
    const normalized = String(tenantId || '').trim();
    if (!normalized) throw new BadRequestException('Tenant context is required');
    return normalized;
  }

  protected normalizeTopology(value: unknown): Topology {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'server_to_server' || v === 'server-to-server') return 'server_to_server';
    if (v === 'multi_server' || v === 'multi-server') return 'multi_server';
    throw new BadRequestException('Invalid topology');
  }

  protected normalizeRequiredText(value: unknown, label: string): string {
    const v = String(value ?? '').trim();
    if (!v) throw new BadRequestException(`${label} is required`);
    return v;
  }

  protected normalizeNullable(value: unknown): string | null {
    if (value == null) return null;
    const v = String(value).trim();
    return v.length === 0 ? null : v;
  }

  protected async resolveConnectionIdentifier(
    identifier: string,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const tenant = this.ensureTenantId(tenantId);
    const normalized = String(identifier || '').trim();
    if (!normalized) throw new NotFoundException('Connection not found');

    const uuidMatch = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);
    const referenceMatch = normalized.match(/^(CONN-\d+)(?:-.+)?$/i);
    if (!uuidMatch && !referenceMatch) {
      throw new NotFoundException('Connection not found');
    }

    const mg = manager ?? this.connRepo.manager;
    const lookupValue = uuidMatch ? normalized : referenceMatch?.[1] || normalized;
    const rows: Array<{ id: string }> = await mg.query(
      `SELECT id::text AS id
       FROM connections
       WHERE ${uuidMatch ? 'id = $1' : 'upper(connection_reference) = upper($1)'}
         AND tenant_id = $2
       LIMIT 1`,
      [lookupValue, tenant],
    );
    const id = rows[0]?.id;
    if (!id) throw new NotFoundException('Connection not found');
    return id;
  }

  protected async normalizeLifecycle(
    value: unknown,
    tenantId: string,
    manager?: EntityManager,
    fallback: string = 'active',
  ): Promise<string> {
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = (settings.lifecycleStates || []).map((item) => item.code);
    const normalized = String(value ?? '').trim().toLowerCase();
    const fallbackCode = allowed.includes(fallback) ? fallback : allowed[0] || 'active';
    if (!normalized) return fallbackCode;
    if (!allowed.includes(normalized)) {
      throw new BadRequestException(`Invalid lifecycle "${value}"`);
    }
    return normalized;
  }

  protected normalizeEnvironment(value: unknown): EnvironmentValue {
    const normalized = String(value ?? '').trim().toLowerCase() || 'prod';
    if (!ENVIRONMENTS.includes(normalized as EnvironmentValue)) {
      throw new BadRequestException(`Invalid environment "${value}"`);
    }
    return normalized as EnvironmentValue;
  }

  protected normalizeLifecycleFilters(value: unknown, allowed: string[]): string[] {
    const items: string[] = Array.isArray(value)
      ? (value as any[]).map((v) => String(v ?? ''))
      : typeof value === 'string'
        ? String(value)
            .split(',')
            .map((v) => v.trim())
        : [];
    const normalized = items
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => allowed.includes(item));
    if (normalized.length > 0) return Array.from(new Set(normalized));
    if (allowed.includes('active')) return ['active'];
    return allowed.length > 0 ? [allowed[0]] : ['active'];
  }

  protected normalizeCriticality(value: unknown): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return 'medium';
    if (!(CONNECTION_CRITICALITIES as readonly string[]).includes(normalized)) {
      throw new BadRequestException(`Invalid criticality "${value}"`);
    }
    return normalized;
  }

  protected async normalizeDataClass(value: unknown, tenantId: string, manager?: EntityManager): Promise<string> {
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.dataClasses || []).map((o: any) => String(o.code || '').trim().toLowerCase()));
    const fallback = allowed.has('internal') ? 'internal' : Array.from(allowed)[0] || 'internal';
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return fallback;
    if (!allowed.has(normalized)) {
      throw new BadRequestException(`Invalid data_class "${value}"`);
    }
    return normalized;
  }

  protected normalizeContainsPii(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === null || String(value).trim() === '') return false;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return Boolean(value);
  }

  protected normalizeRiskMode(value: unknown): 'manual' | 'derived' {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return 'manual';
    if (normalized === 'manual' || normalized === 'derived') return normalized;
    throw new BadRequestException(`Invalid risk_mode "${value}"`);
  }

  protected async ensureAsset(id: string, tenantId: string, manager?: EntityManager) {
    const repo = this.getAssetRepo(manager);
    const asset = await repo.findOne({ where: { id } });
    if (!asset) throw new BadRequestException('Asset not found');
    return asset;
  }

  protected async ensureConnection(id: string, manager?: EntityManager): Promise<Connection> {
    const repo = this.getRepo(manager);
    const conn = await repo.findOne({ where: { id } });
    if (!conn) throw new NotFoundException('Connection not found');
    return conn;
  }

  protected async validateEntityCode(code: string, tenantId: string, manager?: EntityManager) {
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.entities || []).map((e) => e.code));
    if (!allowed.has(code)) {
      throw new BadRequestException(`Invalid entity "${code}"`);
    }
  }

  protected async normalizeProtocolCodes(
    codes: unknown,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const arr = Array.isArray(codes) ? codes : [];
    const list = arr.map((c) => String(c || '').trim().toLowerCase()).filter(Boolean);
    if (list.length === 0) {
      throw new BadRequestException('At least one protocol is required');
    }
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.connectionTypes || []).map((o) => o.code));
    for (const code of list) {
      if (!allowed.has(code)) {
        throw new BadRequestException(`Invalid protocol "${code}"`);
      }
    }
    return Array.from(new Set(list));
  }

  /**
   * Normalize connection-level protocols with their optional per-protocol port
   * override. Accepts either the rich form (`[{ code, port_override }]`) or the
   * legacy code-only form (`['https', 'ssh']`, override defaults to null).
   * Deduplicates by code (last occurrence wins for the override) and validates
   * each code against the tenant's configured connection types.
   */
  protected async normalizeProtocols(
    input: unknown,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<Array<{ code: string; port_override: string | null }>> {
    const arr = Array.isArray(input) ? input : [];
    const byCode = new Map<string, string | null>();
    for (const item of arr) {
      let code: string;
      let portOverride: string | null;
      if (item && typeof item === 'object') {
        code = String((item as any).code ?? (item as any).connection_type_code ?? '')
          .trim()
          .toLowerCase();
        portOverride = this.normalizeNullable((item as any).port_override);
      } else {
        code = String(item ?? '').trim().toLowerCase();
        portOverride = null;
      }
      if (!code) continue;
      byCode.set(code, portOverride);
    }
    if (byCode.size === 0) {
      throw new BadRequestException('At least one protocol is required');
    }
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.connectionTypes || []).map((o) => o.code));
    for (const code of byCode.keys()) {
      if (!allowed.has(code)) {
        throw new BadRequestException(`Invalid protocol "${code}"`);
      }
    }
    return Array.from(byCode.entries()).map(([code, port_override]) => ({ code, port_override }));
  }

  /**
   * Validate a hop's network function code against the tenant's configured
   * path-hop functions. Accepts null (unclassified hop).
   */
  protected async normalizeHopFunctionCode(
    value: unknown,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    if (value == null) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.pathHopFunctions || []).map((o: any) => String(o.code).toLowerCase()));
    if (!allowed.has(normalized)) {
      throw new BadRequestException(`Invalid path-hop function "${value}"`);
    }
    return normalized;
  }

  protected normalizeLegOrderIndex(value: unknown): number {
    const n = Number(value);
    if (!Number.isInteger(n)) throw new BadRequestException('order_index must be an integer');
    if (n < 1) throw new BadRequestException('order_index must be >= 1');
    return n;
  }

  protected async normalizeLegProtocols(codes: unknown, tenantId: string, manager?: EntityManager): Promise<string[]> {
    const list = Array.isArray(codes) ? codes : codes == null ? [] : [codes];
    const normalized = list
      .map((c) => String(c ?? '').trim().toLowerCase())
      .filter((c) => c.length > 0);
    if (normalized.length === 0) {
      throw new BadRequestException('At least one protocol is required for each leg');
    }
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.connectionTypes || []).map((o: any) => o.code));
    for (const code of normalized) {
      if (!allowed.has(code)) {
        throw new BadRequestException(`Invalid protocol "${code}"`);
      }
    }
    return Array.from(new Set(normalized));
  }

  /**
   * Normalize the equipment for a single hop (asset XOR entity_code, both null OK).
   * The hop's equipment is the intermediary the flow passes through. Source/destination
   * of the surrounding flow are implicit from the hop's position in the path.
   */
  protected async normalizeHopEquipment(
    payload: Partial<{
      equipment_asset_id: unknown;
      equipment_entity_code: unknown;
    }>,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<Pick<LegInput, 'equipment_asset_id' | 'equipment_entity_code'>> {
    const aid = this.normalizeNullable(payload.equipment_asset_id);
    const eidRaw = this.normalizeNullable(payload.equipment_entity_code);
    const eid = eidRaw ? eidRaw.toLowerCase() : null;
    if (aid && eid) {
      throw new BadRequestException('hop equipment: choose either an asset or an entity, not both');
    }
    if (!aid && !eid) {
      return { equipment_asset_id: null, equipment_entity_code: null };
    }
    if (aid) {
      await this.ensureAsset(aid, tenantId, manager);
      return { equipment_asset_id: aid, equipment_entity_code: null };
    }
    await this.validateEntityCode(eid as string, tenantId, manager);
    return { equipment_asset_id: null, equipment_entity_code: eid };
  }

  /**
   * Compute effective risk values for connections based on linked interfaces.
   */
  protected async computeEffectiveRiskForConnections(
    tenantId: string,
    bases: Array<{
      id: string;
      risk_mode: 'manual' | 'derived';
      criticality: string;
      data_class: string;
      contains_pii: boolean;
    }>,
    mg: EntityManager,
  ): Promise<
    Map<
      string,
      {
        effective_criticality: string;
        effective_data_class: string;
        effective_contains_pii: boolean;
        derived_interface_count: number;
      }
    >
  > {
    if (!bases || bases.length === 0) {
      return new Map();
    }
    const ids = Array.from(new Set(bases.map((b) => b.id))).filter(Boolean);
    if (ids.length === 0) {
      return new Map();
    }

    const settings = await this.itOpsSettings.getSettings(tenantId, { manager: mg });
    const dataClassOrder = new Map<string, number>();
    (settings.dataClasses || []).forEach((dc, index) => {
      const code = String(dc.code || '').trim().toLowerCase();
      if (code) dataClassOrder.set(code, index);
    });

    const criticalityOrder = new Map<string, number>();
    CONNECTION_CRITICALITIES.forEach((code, index) => {
      criticalityOrder.set(code, CONNECTION_CRITICALITIES.length - index);
    });

    const rows: Array<{
      connection_id: string;
      interface_id: string;
      criticality: string;
      data_class: string;
      contains_pii: boolean;
    }> = await mg.query(
      `SELECT
         l.connection_id,
         i.id AS interface_id,
         i.criticality,
         i.data_class,
         i.contains_pii
       FROM interface_connection_links l
       JOIN interface_bindings b ON b.id = l.interface_binding_id
       JOIN interfaces i ON i.id = b.interface_id
       WHERE l.connection_id = ANY($1::uuid[])`,
      [ids],
    );

    type Accumulator = {
      worstCritScore: number | null;
      worstCritCode: string | null;
      worstDataScore: number | null;
      worstDataCode: string | null;
      containsPii: boolean;
      interfaceIds: Set<string>;
    };

    const aggregated = new Map<string, Accumulator>();
    for (const row of rows) {
      const cid = row.connection_id;
      if (!cid) continue;
      let acc = aggregated.get(cid);
      if (!acc) {
        acc = {
          worstCritScore: null,
          worstCritCode: null,
          worstDataScore: null,
          worstDataCode: null,
          containsPii: false,
          interfaceIds: new Set<string>(),
        };
        aggregated.set(cid, acc);
      }
      const critCode = String(row.criticality || '').trim().toLowerCase();
      const critScore = criticalityOrder.get(critCode);
      if (critScore !== undefined && (acc.worstCritScore === null || critScore > acc.worstCritScore)) {
        acc.worstCritScore = critScore;
        acc.worstCritCode = critCode;
      }

      const dataCode = String(row.data_class || '').trim().toLowerCase();
      const dataScore = dataClassOrder.get(dataCode);
      if (dataScore !== undefined && (acc.worstDataScore === null || dataScore > acc.worstDataScore)) {
        acc.worstDataScore = dataScore;
        acc.worstDataCode = dataCode;
      }

      if (row.contains_pii) {
        acc.containsPii = true;
      }
      const iid = String(row.interface_id || '').trim();
      if (iid) acc.interfaceIds.add(iid);
    }

    const result = new Map<
      string,
      {
        effective_criticality: string;
        effective_data_class: string;
        effective_contains_pii: boolean;
        derived_interface_count: number;
      }
    >();

    for (const base of bases) {
      const acc = aggregated.get(base.id);
      const derivedCount = acc ? acc.interfaceIds.size : 0;
      let effective_criticality = base.criticality;
      let effective_data_class = base.data_class;
      let effective_contains_pii = base.contains_pii;

      if (base.risk_mode === 'derived' && acc && derivedCount > 0) {
        if (acc.worstCritCode) {
          effective_criticality = acc.worstCritCode;
        }
        if (acc.worstDataCode) {
          effective_data_class = acc.worstDataCode;
        }
        effective_contains_pii = acc.containsPii;
      }

      result.set(base.id, {
        effective_criticality,
        effective_data_class,
        effective_contains_pii,
        derived_interface_count: derivedCount,
      });
    }

    return result;
  }
}
