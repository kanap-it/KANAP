import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Asset } from '../asset.entity';
import { AssetClusterMember } from '../asset-cluster-member.entity';
import { AuditService } from '../../audit/audit.service';
import { AssetsBaseService, ServiceOpts } from './assets-base.service';
import { AssetsValidationService } from './assets-validation.service';

/**
 * Service for core CRUD operations on assets.
 */
@Injectable()
export class AssetsCrudService extends AssetsBaseService {
  constructor(
    @InjectRepository(Asset) assetRepo: Repository<Asset>,
    @InjectRepository(AssetClusterMember) private readonly clusterMembers: Repository<AssetClusterMember>,
    private readonly audit: AuditService,
    private readonly validation: AssetsValidationService,
  ) {
    super(assetRepo);
  }

  private getClusterMemberRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(AssetClusterMember) : this.clusterMembers;
  }

  /**
   * Get a single asset by ID.
   */
  async get(id: string, opts?: ServiceOpts) {
    return this.ensureAsset(id, opts?.manager, opts?.tenantId);
  }

  /**
   * Create a new asset.
   */
  async create(
    body: Partial<Asset>,
    tenantId: string,
    userId: string | null,
    opts?: ServiceOpts,
  ) {
    const tenant = this.ensureTenantId(tenantId);
    const repo = this.getRepo(opts?.manager);

    if (!body || typeof body !== 'object') throw new BadRequestException('Body is required');

    const name = this.normalizeNullable(body.name);
    if (!name) throw new BadRequestException('name is required');
    if (body.environment == null) throw new BadRequestException('environment is required');
    if (body.kind == null) throw new BadRequestException('kind is required');
    if (body.provider == null) throw new BadRequestException('provider is required');

    const environment = this.normalizeEnvironment(body.environment);
    const kind = await this.validation.resolveKind(body.kind, tenant, opts?.manager);
    const provider = await this.validation.resolveProvider(body.provider, tenant, opts?.manager);
    const status = await this.validation.normalizeLifecycleStatus(body.status, tenant, opts?.manager, 'active');
    const location_id = await this.resolveLocationId((body as any).location_id, tenant, opts?.manager);
    const operating_system = await this.validation.resolveOperatingSystem((body as any).operating_system, tenant, opts?.manager);
    const is_cluster = body.is_cluster === undefined ? false : this.normalizeBooleanFlag((body as any).is_cluster, 'is_cluster');
    const ip_addresses = await this.validation.validateIpAddresses((body as any).ip_addresses, tenant, this.getManager(opts));
    const notes = this.normalizeNullable((body as any).notes);

    // Handle domain, hostname, and FQDN
    const domain = await this.validation.resolveDomain((body as any).domain, tenant, opts?.manager);
    const hostname = this.normalizeNullable(body.hostname);

    // Validate hostname if domain requires it
    if (domain && domain !== 'workgroup' && domain !== 'n-a') {
      if (!hostname) {
        throw new BadRequestException('Hostname is required when a domain is selected');
      }
    }
    if (hostname && !this.validation.validateHostname(hostname)) {
      throw new BadRequestException('Invalid hostname format (RFC 1123)');
    }

    // Compute FQDN
    const fqdn = await this.validation.computeFqdn(hostname, domain, tenant, opts?.manager);

    // Process aliases
    const aliases = this.validation.normalizeAliases((body as any).aliases);

    const entity = repo.create({
      name,
      environment,
      kind,
      provider,
      region: this.normalizeNullable(body.region),
      zone: this.normalizeNullable(body.zone),
      hostname,
      domain,
      fqdn,
      aliases,
      ip_addresses,
      cluster: this.normalizeNullable(body.cluster),
      operating_system,
      is_cluster,
      status,
      go_live_date: this.normalizeNullable((body as any).go_live_date),
      end_of_life_date: this.normalizeNullable((body as any).end_of_life_date),
      location_id,
      notes,
    });

    const saved = await repo.save(entity);
    await this.audit.log(
      { table: 'assets', recordId: saved.id, action: 'create', before: null, after: saved, userId },
      { manager: opts?.manager },
    );
    return saved;
  }

  /**
   * Update an existing asset.
   */
  async update(
    id: string,
    body: Partial<Asset>,
    tenantId: string,
    userId: string | null,
    opts?: ServiceOpts,
  ) {
    const tenant = this.ensureTenantId(tenantId);
    const repo = this.getRepo(opts?.manager);

    if (!body || typeof body !== 'object') throw new BadRequestException('Body is required');

    const existing = await this.ensureAsset(id, opts?.manager, tenant);

    const before = { ...existing };
    const has = (key: keyof Asset | string) => Object.prototype.hasOwnProperty.call(body, key);

    if (has('name')) {
      const name = this.normalizeNullable(body.name);
      if (!name) throw new BadRequestException('name is required');
      existing.name = name;
    }
    if (has('environment')) {
      existing.environment = this.normalizeEnvironment((body as any).environment);
    }
    if (has('kind')) {
      existing.kind = await this.validation.resolveKind((body as any).kind, tenant, opts?.manager);
    }
    if (has('provider')) {
      existing.provider = await this.validation.resolveProvider((body as any).provider, tenant, opts?.manager);
    }
    if (has('region')) {
      existing.region = this.normalizeNullable((body as any).region);
    }
    if (has('zone')) {
      existing.zone = this.normalizeNullable((body as any).zone);
    }

    // Handle domain, hostname, aliases, and FQDN together
    if (has('domain')) {
      existing.domain = await this.validation.resolveDomain((body as any).domain, tenant, opts?.manager);
    }
    if (has('hostname')) {
      existing.hostname = this.normalizeNullable((body as any).hostname);
    }
    if (has('aliases')) {
      existing.aliases = this.validation.normalizeAliases((body as any).aliases);
    }

    // If hostname or domain changed, recompute FQDN and validate
    if (has('hostname') || has('domain')) {
      const newHostname = existing.hostname;
      const newDomain = existing.domain;

      if (newDomain && newDomain !== 'workgroup' && newDomain !== 'n-a') {
        if (!newHostname) {
          throw new BadRequestException('Hostname is required when a domain is selected');
        }
      }
      if (newHostname && !this.validation.validateHostname(newHostname)) {
        throw new BadRequestException('Invalid hostname format (RFC 1123)');
      }
      existing.fqdn = await this.validation.computeFqdn(newHostname, newDomain, tenant, opts?.manager);
    }

    if (has('ip_addresses')) {
      existing.ip_addresses = await this.validation.validateIpAddresses((body as any).ip_addresses, tenant, this.getManager(opts), existing.id);
    }
    if (has('notes')) {
      existing.notes = this.normalizeNullable((body as any).notes);
    }
    if (has('cluster')) {
      existing.cluster = this.normalizeNullable((body as any).cluster);
    }
    if (has('is_cluster')) {
      existing.is_cluster = this.normalizeBooleanFlag((body as any).is_cluster, 'is_cluster');
    }
    if (has('operating_system')) {
      existing.operating_system = await this.validation.resolveOperatingSystem(
        (body as any).operating_system,
        tenant,
        opts?.manager,
      );
    }
    if (has('status')) {
      existing.status = await this.validation.normalizeLifecycleStatus(
        (body as any).status,
        tenant,
        opts?.manager,
        existing.status,
      );
    }
    if (has('location_id')) {
      existing.location_id = await this.resolveLocationId((body as any).location_id, tenant, opts?.manager);
    }
    if (has('go_live_date')) {
      existing.go_live_date = this.normalizeNullable((body as any).go_live_date);
    }
    if (has('end_of_life_date')) {
      existing.end_of_life_date = this.normalizeNullable((body as any).end_of_life_date);
    }

    existing.updated_at = new Date();
    const saved = await repo.save(existing);
    await this.audit.log(
      { table: 'assets', recordId: saved.id, action: 'update', before, after: saved, userId },
      { manager: opts?.manager },
    );
    return saved;
  }

  // =========================================================================
  // Cluster Operations
  // =========================================================================

  async listClusterMembers(clusterId: string, opts?: ServiceOpts) {
    const tenantId = this.ensureTenantId(opts?.tenantId);
    await this.ensureAssetIsCluster(clusterId, opts?.manager, tenantId);
    const mg = this.getManager(opts);

    const rows: Array<{
      asset_id: string;
      name: string;
      environment: string;
      status: string;
      kind: string;
      provider: string;
      location_id: string | null;
      location_name: string | null;
      location_code: string | null;
      operating_system: string | null;
    }> = await mg.query(
      `SELECT acm.asset_id, a.name, a.environment, a.status, a.location_id,
              a.kind, a.provider, a.operating_system,
              l.name AS location_name, l.code AS location_code
       FROM asset_cluster_members acm
       JOIN assets a ON a.id = acm.asset_id
       LEFT JOIN locations l ON l.id = a.location_id AND l.tenant_id = $2
       WHERE acm.cluster_id = $1 AND acm.tenant_id = $2 AND a.tenant_id = $2
       ORDER BY a.name ASC`,
      [clusterId, tenantId],
    );

    const items = rows.map((row) => ({
      id: row.asset_id,
      name: row.name,
      environment: row.environment,
      status: row.status,
      kind: row.kind,
      provider: row.provider,
      location_id: row.location_id,
      location: row.location_name || row.location_code || null,
      operating_system: row.operating_system || null,
    }));
    return { items };
  }

  async listClustersForAsset(assetId: string, opts?: ServiceOpts) {
    const tenantId = this.ensureTenantId(opts?.tenantId);
    await this.ensureAsset(assetId, opts?.manager, tenantId);
    const mg = this.getManager(opts);

    const rows: Array<{ id: string; name: string; environment: string; status: string }> = await mg.query(
      `SELECT acm.cluster_id AS id, c.name, c.environment, c.status
       FROM asset_cluster_members acm
       JOIN assets c ON c.id = acm.cluster_id
       WHERE acm.asset_id = $1 AND acm.tenant_id = $2 AND c.tenant_id = $2
       ORDER BY c.name ASC`,
      [assetId, tenantId],
    );
    return { items: rows };
  }

  async replaceClusterMembers(
    clusterId: string,
    assetIds: unknown,
    tenantId: string,
    userId: string | null,
    opts?: ServiceOpts,
  ) {
    const tenant = this.ensureTenantId(tenantId);
    const mg = this.getManager(opts);
    const cluster = await this.ensureAssetIsCluster(clusterId, mg, tenant);

    if (cluster.tenant_id && cluster.tenant_id !== tenant) {
      throw new BadRequestException('Cluster does not belong to this tenant');
    }
    if (!Array.isArray(assetIds)) {
      throw new BadRequestException('asset_ids must be an array');
    }

    const assetIdList = assetIds as any[];
    const normalizedIds = Array.from(
      new Set(
        assetIdList
          .map((sid) => String(sid || '').trim())
          .filter((sid) => sid.length > 0),
      ),
    );

    if (normalizedIds.includes(clusterId)) {
      throw new BadRequestException('Cluster cannot include itself as a member');
    }

    const candidates: Array<{ id: string; tenant_id: string; is_cluster: boolean }> =
      normalizedIds.length > 0
        ? await mg.query(
            `SELECT id, tenant_id, is_cluster FROM assets WHERE id = ANY($1::uuid[])`,
            [normalizedIds],
          )
        : [];

    if (candidates.length !== normalizedIds.length) {
      throw new BadRequestException('One or more assets were not found');
    }

    const otherTenant = candidates.find((c) => String(c.tenant_id || '') !== String(cluster.tenant_id || tenant));
    if (otherTenant) {
      throw new BadRequestException('All members must belong to the same tenant as the cluster');
    }

    const clusterCandidates = candidates.filter((c) => c.is_cluster);
    if (clusterCandidates.length > 0) {
      throw new BadRequestException('Cluster members must be individual assets (not clusters)');
    }

    const existing = await this.getClusterMemberRepo(mg).find({ where: { cluster_id: clusterId } as any });
    const existingMembers = existing.map((row) => row.asset_id);

    await mg.transaction(async (trx) => {
      const repo = this.getClusterMemberRepo(trx);
      await repo.delete({ cluster_id: clusterId } as any);
      if (normalizedIds.length > 0) {
        const payload = normalizedIds.map((sid) =>
          repo.create({
            cluster_id: clusterId,
            asset_id: sid,
            tenant_id: cluster.tenant_id,
            created_at: new Date(),
            updated_at: new Date(),
          }),
        );
        await repo.save(payload);
      }
      await this.getRepo(trx).update({ id: clusterId } as any, { updated_at: new Date() } as any);
    });

    await this.audit.log(
      {
        table: 'asset_cluster_members',
        recordId: clusterId,
        action: 'update',
        before: { members: existingMembers },
        after: { members: normalizedIds },
        userId,
      },
      { manager: mg },
    );

    return this.listClusterMembers(clusterId, { manager: mg, tenantId: tenant });
  }
}
