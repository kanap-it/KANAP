import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ConnectionsListService } from './connections-list.service';
import { ConnectionsCrudService } from './connections-crud.service';
import { ConnectionsLegsService } from './connections-legs.service';

/**
 * Options for service methods.
 */
export interface ServiceOpts {
  manager?: EntityManager;
}

/**
 * Main facade service for connections that delegates to specialized sub-services.
 * This maintains backward compatibility with the existing controller API.
 */
@Injectable()
export class ConnectionsService {
  constructor(
    private readonly listService: ConnectionsListService,
    private readonly crudService: ConnectionsCrudService,
    private readonly legsService: ConnectionsLegsService,
  ) {}

  // =========================================================================
  // List Operations (delegated to ConnectionsListService)
  // =========================================================================

  list(tenantId: string, query: any, opts?: ServiceOpts) {
    return this.listService.list(tenantId, query, opts);
  }

  listByAsset(assetId: string, tenantId: string, opts?: ServiceOpts) {
    return this.listService.listByAsset(assetId, tenantId, opts);
  }

  listByServer(serverId: string, tenantId: string, opts?: ServiceOpts) {
    return this.listService.listByServer(serverId, tenantId, opts);
  }

  listInterfaceLinks(connectionId: string, tenantId: string, opts?: ServiceOpts) {
    return this.listService.listInterfaceLinks(connectionId, tenantId, opts);
  }

  map(tenantId: string, query: any, opts?: ServiceOpts) {
    return this.listService.map(tenantId, query, opts);
  }

  // =========================================================================
  // CRUD Operations (delegated to ConnectionsCrudService)
  // =========================================================================

  get(id: string, tenantId: string, opts?: ServiceOpts & { includeLegs?: boolean }) {
    return this.crudService.get(id, tenantId, opts);
  }

  create(body: any, tenantId: string, userId: string | null, opts?: ServiceOpts) {
    return this.crudService.create(body, tenantId, userId, opts);
  }

  update(id: string, body: any, tenantId: string, userId: string | null, opts?: ServiceOpts) {
    return this.crudService.update(id, body, tenantId, userId, opts);
  }

  delete(id: string, userId: string | null, opts?: ServiceOpts) {
    return this.crudService.delete(id, userId, opts);
  }

  bulkDelete(ids: string[], userId: string | null, opts?: ServiceOpts) {
    return this.crudService.bulkDelete(ids, userId, opts);
  }

  // =========================================================================
  // Leg Operations (delegated to ConnectionsLegsService)
  // =========================================================================

  listLegs(connectionId: string, tenantId: string, opts?: ServiceOpts) {
    return this.legsService.listLegs(connectionId, tenantId, opts);
  }

  replaceLegs(
    connectionId: string,
    tenantId: string,
    legsPayload: any[],
    userId: string | null,
    opts?: ServiceOpts,
  ) {
    return this.legsService.replaceLegs(connectionId, tenantId, legsPayload, userId, opts);
  }

  deleteLegsForConnection(connectionId: string, opts?: ServiceOpts) {
    return this.legsService.deleteLegsForConnection(connectionId, opts);
  }
}
