import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Connection } from '../connection.entity';
import { ConnectionServer } from '../connection-server.entity';
import { ConnectionProtocol } from '../connection-protocol.entity';
import { ConnectionLeg } from '../connection-leg.entity';
import { Asset } from '../../assets/asset.entity';
import { AuditService } from '../../audit/audit.service';
import { ItOpsSettingsService } from '../../it-ops-settings/it-ops-settings.service';
import { ConnectionsBaseService, ServiceOpts, LegInput } from './connections-base.service';

/**
 * Service for managing connection legs.
 */
@Injectable()
export class ConnectionsLegsService extends ConnectionsBaseService {
  constructor(
    @InjectRepository(Connection) connRepo: Repository<Connection>,
    @InjectRepository(ConnectionServer) connServers: Repository<ConnectionServer>,
    @InjectRepository(ConnectionProtocol) connProtocols: Repository<ConnectionProtocol>,
    @InjectRepository(ConnectionLeg) connLegs: Repository<ConnectionLeg>,
    @InjectRepository(Asset) assets: Repository<Asset>,
    itOpsSettings: ItOpsSettingsService,
    private readonly audit: AuditService,
  ) {
    super(connRepo, connServers, connProtocols, connLegs, assets, itOpsSettings);
  }

  /**
   * List legs for a connection.
   */
  async listLegs(connectionId: string, tenantId: string, opts?: ServiceOpts) {
    const tenant = this.ensureTenantId(tenantId);
    const mg = opts?.manager ?? this.connRepo.manager;

    await this.ensureConnection(connectionId, mg);

    const legRepo = this.getLegRepo(mg);
    return legRepo.find({
      where: { connection_id: connectionId, tenant_id: tenant } as any,
      order: { order_index: 'ASC', created_at: 'ASC' },
    });
  }

  /**
   * Replace all legs for a connection.
   */
  async replaceLegs(
    connectionId: string,
    tenantId: string,
    legsPayload: any[],
    userId: string | null,
    opts?: ServiceOpts,
  ) {
    const tenant = this.ensureTenantId(tenantId);
    const mg = opts?.manager ?? this.connRepo.manager;

    await this.ensureConnection(connectionId, mg);

    if (!Array.isArray(legsPayload)) {
      throw new BadRequestException('Body must be an array of legs');
    }
    if (legsPayload.length > 3) {
      throw new BadRequestException('At most 3 legs are supported');
    }

    const existingLegs = await this.getLegRepo(mg).find({
      where: { connection_id: connectionId, tenant_id: tenant } as any,
      order: { order_index: 'ASC', created_at: 'ASC' },
    });

    const orderSet = new Set<number>();
    const normalized: LegInput[] = [];
    for (const raw of legsPayload) {
      const order_index = this.normalizeLegOrderIndex(raw?.order_index ?? normalized.length + 1);
      if (orderSet.has(order_index)) {
        throw new BadRequestException('order_index must be unique per leg');
      }
      orderSet.add(order_index);
      const layer_type = this.normalizeLegLayerType(raw?.layer_type);
      const protocol_codes = await this.normalizeLegProtocols(raw?.protocol_codes ?? raw?.protocol_code, tenant, mg);
      const endpoints = await this.normalizeLegEndpoints(
        {
          source_asset_id: raw?.source_asset_id ?? raw?.source_server_id,
          source_entity_code: raw?.source_entity_code,
          destination_asset_id: raw?.destination_asset_id ?? raw?.destination_server_id,
          destination_entity_code: raw?.destination_entity_code,
        },
        tenant,
        mg,
      );
      const port_override = this.normalizeNullable(raw?.port_override);
      const notes = this.normalizeNullable(raw?.notes);
      normalized.push({
        order_index,
        layer_type,
        protocol_codes,
        port_override,
        notes,
        ...endpoints,
      });
    }

    const run = async (manager: EntityManager) => {
      const legRepo = this.getLegRepo(manager);
      await legRepo.delete({ connection_id: connectionId } as any);
      const saved: ConnectionLeg[] = [];
      for (const leg of normalized) {
        const row = legRepo.create({
          tenant_id: tenant,
          connection_id: connectionId,
          ...leg,
        });
        const persisted = await legRepo.save(row);
        saved.push(persisted);
      }

      await this.audit.log(
        {
          table: 'connections',
          recordId: connectionId,
          action: 'update',
          before: { legs: existingLegs },
          after: { legs: saved },
          userId,
        },
        { manager },
      );
      return saved;
    };

    const savedLegs = opts?.manager ? await run(mg) : await mg.transaction(run);

    return savedLegs.sort(
      (a, b) => a.order_index - b.order_index || (a.created_at?.getTime?.() || 0) - (b.created_at?.getTime?.() || 0),
    );
  }

  /**
   * Delete all legs for a connection (used during connection deletion).
   */
  async deleteLegsForConnection(connectionId: string, opts?: ServiceOpts) {
    const legRepo = this.getLegRepo(opts?.manager);
    await legRepo.delete({ connection_id: connectionId } as any);
  }
}
