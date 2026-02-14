import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AppAssetAssignment } from './app-asset-assignment.entity';
import { AppInstance } from '../app-instances/app-instance.entity';
import { Asset } from '../assets/asset.entity';
import { AuditService } from '../audit/audit.service';
import { ItOpsSettingsService } from '../it-ops-settings/it-ops-settings.service';

@Injectable()
export class AppAssetAssignmentsService {
  constructor(
    @InjectRepository(AppAssetAssignment) private readonly repo: Repository<AppAssetAssignment>,
    @InjectRepository(AppInstance) private readonly instances: Repository<AppInstance>,
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    private readonly audit: AuditService,
    private readonly itOpsSettings: ItOpsSettingsService,
  ) {}

  private getRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(AppAssetAssignment) : this.repo;
  }

  private getInstanceRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(AppInstance) : this.instances;
  }

  private getAssetRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(Asset) : this.assets;
  }

  private deriveHosting(
    row: { location_hosting_type?: string | null; asset_provider?: string | null },
    hostingTypes: Array<{ code: string; label: string; category?: string; deprecated?: boolean }>,
  ): { code: string | null; label: string | null; source: 'location' | 'provider' | null } {
    const map = new Map(hostingTypes.map((h) => [h.code, h]));
    const pick = (code?: string | null) => {
      if (!code) return null;
      const opt = map.get(code);
      return {
        code,
        label: opt?.label ?? code,
      };
    };
    const fromLocation = pick(row.location_hosting_type);
    if (fromLocation) {
      return { ...fromLocation, source: 'location' };
    }
    const cloudDefault =
      map.get('public_cloud') ||
      hostingTypes.find((h) => h.category === 'cloud') ||
      hostingTypes[0];
    if (cloudDefault) {
      return { code: cloudDefault.code, label: cloudDefault.label, source: 'provider' };
    }
    return { code: null, label: null, source: null };
  }

  private async ensureInstance(instanceId: string, manager?: EntityManager) {
    const repo = this.getInstanceRepo(manager);
    const instance = await repo.findOne({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('App instance not found');
    return instance;
  }

  private async ensureAsset(assetId: string, manager?: EntityManager) {
    const repo = this.getAssetRepo(manager);
    const asset = await repo.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  private async normalizeRole(value: unknown, tenantId: string, manager?: EntityManager): Promise<string> {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('role is required');
    }
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.serverRoles || []).map((item) => item.code));
    if (!allowed.has(normalized)) {
      throw new BadRequestException(`Invalid role "${value}"`);
    }
    return normalized;
  }

  private parseDate(value: unknown): Date | null {
    if (value == null || value === '') return null;
    const date = new Date(value as any);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeNotes(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length === 0 ? null : text;
  }

  async list(instanceId: string, opts?: { manager?: EntityManager }) {
    const instance = await this.ensureInstance(instanceId, opts?.manager);
    const mg = opts?.manager ?? this.repo.manager;
    const rows: Array<{
      id: string;
      app_instance_id: string;
      asset_id: string;
      role: string;
      since_date: Date | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      asset_name: string;
      asset_kind: string;
      asset_provider: string;
      asset_environment: string;
      asset_region: string | null;
      asset_zone: string | null;
      asset_status: string;
      location_hosting_type: string | null;
    }> = await mg.query(
      `SELECT aaa.*, a.name AS asset_name, a.kind AS asset_kind, a.provider AS asset_provider,
              a.environment AS asset_environment, a.region AS asset_region, a.zone AS asset_zone, a.status AS asset_status,
              l.hosting_type AS location_hosting_type
       FROM app_asset_assignments aaa
       JOIN assets a ON a.id = aaa.asset_id
       LEFT JOIN locations l ON l.id = a.location_id
       WHERE aaa.app_instance_id = $1
       ORDER BY a.name ASC`,
      [instanceId],
    );
    const settings = await this.itOpsSettings.getSettings(instance.tenant_id, { manager: mg });
    return {
      items: rows.map((row) => ({
        id: row.id,
        app_instance_id: row.app_instance_id,
        asset_id: row.asset_id,
        role: row.role,
        since_date: row.since_date,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        hosting: this.deriveHosting(
          { location_hosting_type: row.location_hosting_type, asset_provider: row.asset_provider },
          settings.hostingTypes || [],
        ),
        asset: {
          id: row.asset_id,
          name: row.asset_name,
          kind: row.asset_kind,
          provider: row.asset_provider,
          environment: row.asset_environment,
          region: row.asset_region,
          zone: row.asset_zone,
          status: row.asset_status,
        },
        // Backwards compatibility: include server alias
        server: {
          id: row.asset_id,
          name: row.asset_name,
          kind: row.asset_kind,
          provider: row.asset_provider,
          environment: row.asset_environment,
          region: row.asset_region,
          zone: row.asset_zone,
          status: row.asset_status,
        },
        server_id: row.asset_id,
      })),
    };
  }

  async create(instanceId: string, payload: any, userId: string | null, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = this.getRepo(mg);
    const instance = await this.ensureInstance(instanceId, mg);
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Body is required');
    }
    // Accept both asset_id and server_id for backwards compatibility
    const assetId = this.normalizeNullableId(payload.asset_id ?? payload.assetId ?? payload.server_id ?? payload.serverId);
    if (!assetId) throw new BadRequestException('asset_id is required');
    const asset = await this.ensureAsset(assetId, mg);
    if (asset.is_cluster) {
      throw new BadRequestException('Cannot assign application instances to a cluster asset; select a specific host');
    }
    if (payload.role == null) throw new BadRequestException('role is required');
    const role = await this.normalizeRole(payload.role, instance.tenant_id, mg);
    const existing = await repo.findOne({ where: { app_instance_id: instanceId, asset_id: assetId, role } as any });
    if (existing) {
      throw new BadRequestException('Asset already assigned with this role');
    }
    const assignment = repo.create({
      app_instance_id: instanceId,
      asset_id: assetId,
      role,
      since_date: this.parseDate(payload.since_date),
      notes: this.normalizeNotes(payload.notes),
    });
    const saved = await repo.save(assignment);
    await this.audit.log(
      { table: 'app_asset_assignments', recordId: saved.id, action: 'create', before: null, after: saved, userId },
      { manager: mg },
    );
    return saved;
  }

  async update(
    instanceId: string,
    assignmentId: string,
    payload: any,
    userId: string | null,
    opts?: { manager?: EntityManager },
  ) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = this.getRepo(mg);
    const assignment = await repo.findOne({ where: { id: assignmentId } });
    if (!assignment || assignment.app_instance_id !== instanceId) {
      throw new NotFoundException('Assignment not found');
    }
    const instance = await this.ensureInstance(instanceId, mg);
    const patch: Partial<AppAssetAssignment> = {};
    // Accept both asset_id and server_id for backwards compatibility
    if (payload.asset_id !== undefined || payload.server_id !== undefined) {
      const assetId = this.normalizeNullableId(payload.asset_id ?? payload.server_id);
      if (!assetId) {
        throw new BadRequestException('asset_id is required');
      }
      const asset = await this.ensureAsset(assetId, mg);
      if (asset.is_cluster) {
        throw new BadRequestException('Cannot assign application instances to a cluster asset; select a specific host');
      }
      patch.asset_id = assetId;
    }
    if (payload.role !== undefined) {
      patch.role = await this.normalizeRole(payload.role, instance.tenant_id, mg);
    }
    if (payload.since_date !== undefined) {
      patch.since_date = this.parseDate(payload.since_date);
    }
    if (payload.notes !== undefined) {
      patch.notes = this.normalizeNotes(payload.notes);
    }
    const nextAssetId = patch.asset_id ?? assignment.asset_id;
    const nextRole = patch.role ?? assignment.role;
    if (nextAssetId !== assignment.asset_id || nextRole !== assignment.role) {
      const duplicate = await repo.findOne({
        where: { app_instance_id: instanceId, asset_id: nextAssetId, role: nextRole } as any,
      });
      if (duplicate && duplicate.id !== assignment.id) {
        throw new BadRequestException('Asset already assigned with this role');
      }
    }
    const before = { ...assignment };
    Object.assign(assignment, patch);
    const saved = await repo.save(assignment);
    await this.audit.log(
      { table: 'app_asset_assignments', recordId: saved.id, action: 'update', before, after: saved, userId },
      { manager: mg },
    );
    return saved;
  }

  async listByAsset(assetId: string, opts?: { manager?: EntityManager }) {
    await this.ensureAsset(assetId, opts?.manager);
    const mg = opts?.manager ?? this.repo.manager;
    const rows: Array<{
      id: string;
      app_instance_id: string;
      asset_id: string;
      role: string;
      since_date: Date | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      app_id: string;
      app_name: string;
      environment: string;
    }> = await mg.query(
      `SELECT aaa.*, ai.application_id AS app_id, ai.environment, a.name AS app_name
       FROM app_asset_assignments aaa
       JOIN app_instances ai ON ai.id = aaa.app_instance_id
       JOIN applications a ON a.id = ai.application_id
       WHERE aaa.asset_id = $1
       ORDER BY ai.environment ASC, a.name ASC`,
      [assetId],
    );
    return rows.map((row) => ({
      id: row.id,
      app_instance_id: row.app_instance_id,
      asset_id: row.asset_id,
      server_id: row.asset_id, // backwards compatibility
      role: row.role,
      since_date: row.since_date,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      application: { id: row.app_id, name: row.app_name },
      environment: row.environment,
    }));
  }

  // Backwards compatibility alias
  async listByServer(serverId: string, opts?: { manager?: EntityManager }) {
    return this.listByAsset(serverId, opts);
  }

  async delete(instanceId: string, assignmentId: string, userId: string | null, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = this.getRepo(mg);
    const assignment = await repo.findOne({ where: { id: assignmentId } });
    if (!assignment || assignment.app_instance_id !== instanceId) {
      throw new NotFoundException('Assignment not found');
    }
    await repo.delete({ id: assignmentId } as any);
    await this.audit.log(
      { table: 'app_asset_assignments', recordId: assignmentId, action: 'delete', before: assignment, after: null, userId },
      { manager: mg },
    );
    return { deleted: true };
  }

  /**
   * Returns unique assets assigned to app instances for the given applications and environments.
   * Used by the Connection Map to pre-select assets based on application selection.
   */
  async listAssetsByApps(
    applicationIds: string[],
    environments: string[],
    opts?: { manager?: EntityManager },
  ) {
    if (!applicationIds || applicationIds.length === 0 || !environments || environments.length === 0) {
      return { items: [] };
    }

    const mg = opts?.manager ?? this.repo.manager;

    const rows: Array<{
      id: string;
      name: string;
      environment: string;
      kind: string;
      provider: string;
      is_cluster: boolean;
    }> = await mg.query(
      `
      SELECT DISTINCT
        a.id,
        a.name,
        a.environment,
        a.kind,
        a.provider,
        a.is_cluster
      FROM assets a
      INNER JOIN app_asset_assignments aaa ON aaa.asset_id = a.id
      INNER JOIN app_instances ai ON ai.id = aaa.app_instance_id
      WHERE ai.application_id = ANY($1)
        AND ai.environment = ANY($2)
        AND a.status <> 'retired'
      ORDER BY a.name ASC
      `,
      [applicationIds, environments],
    );

    return { items: rows };
  }

  // Backwards compatibility alias
  async listServersByApps(
    applicationIds: string[],
    environments: string[],
    opts?: { manager?: EntityManager },
  ) {
    return this.listAssetsByApps(applicationIds, environments, opts);
  }

  private normalizeNullableId(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length === 0 ? null : text;
  }
}
