import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../asset.entity';
import { AssetHardwareInfo } from '../asset-hardware-info.entity';
import { AuditService } from '../../audit/audit.service';
import { AssetsBaseService, ServiceOpts } from './assets-base.service';

/**
 * Service for managing asset hardware information.
 */
@Injectable()
export class AssetsHardwareService extends AssetsBaseService {
  constructor(
    @InjectRepository(Asset) assetRepo: Repository<Asset>,
    @InjectRepository(AssetHardwareInfo) private readonly hardwareInfoRepo: Repository<AssetHardwareInfo>,
    private readonly audit: AuditService,
  ) {
    super(assetRepo);
  }

  private getHardwareInfoRepo(opts?: ServiceOpts) {
    return opts?.manager ? opts.manager.getRepository(AssetHardwareInfo) : this.hardwareInfoRepo;
  }

  /**
   * Get hardware information for an asset.
   */
  async getHardwareInfo(assetId: string, opts?: ServiceOpts) {
    const tenantId = this.ensureTenantId(opts?.tenantId);
    await this.ensureAsset(assetId, opts?.manager, tenantId);
    const repo = this.getHardwareInfoRepo(opts);
    const info = await repo.findOne({ where: { asset_id: assetId, tenant_id: tenantId } as any });
    return info || null;
  }

  /**
   * Create or update hardware information for an asset.
   */
  async upsertHardwareInfo(
    assetId: string,
    data: Partial<AssetHardwareInfo>,
    tenantId: string,
    userId: string | null,
    opts?: ServiceOpts,
  ) {
    const tenant = this.ensureTenantId(tenantId);
    const asset = await this.ensureAsset(assetId, opts?.manager, tenant);
    const repo = this.getHardwareInfoRepo(opts);

    let existing = await repo.findOne({ where: { asset_id: assetId, tenant_id: tenant } as any });
    const before = existing ? { ...existing } : null;

    if (existing) {
      if (data.serial_number !== undefined) existing.serial_number = this.normalizeNullable(data.serial_number);
      if (data.manufacturer !== undefined) existing.manufacturer = this.normalizeNullable(data.manufacturer);
      if (data.model !== undefined) existing.model = this.normalizeNullable(data.model);
      if (data.purchase_date !== undefined) existing.purchase_date = data.purchase_date;
      if (data.rack_location !== undefined) existing.rack_location = this.normalizeNullable(data.rack_location);
      if (data.rack_unit !== undefined) existing.rack_unit = this.normalizeNullable(data.rack_unit);
      if (data.notes !== undefined) existing.notes = this.normalizeNullable(data.notes);
      existing.updated_at = new Date();
    } else {
      existing = repo.create({
        tenant_id: asset.tenant_id,
        asset_id: assetId,
        serial_number: this.normalizeNullable(data.serial_number),
        manufacturer: this.normalizeNullable(data.manufacturer),
        model: this.normalizeNullable(data.model),
        purchase_date: data.purchase_date ?? null,
        rack_location: this.normalizeNullable(data.rack_location),
        rack_unit: this.normalizeNullable(data.rack_unit),
        notes: this.normalizeNullable(data.notes),
      });
    }

    const saved = await repo.save(existing);
    await this.audit.log(
      { table: 'asset_hardware_info', recordId: saved.id, action: before ? 'update' : 'create', before, after: saved, userId },
      { manager: opts?.manager },
    );
    return saved;
  }

  /**
   * Delete hardware information for an asset.
   */
  async deleteHardwareInfo(assetId: string, userId: string | null, opts?: ServiceOpts) {
    const repo = this.getHardwareInfoRepo(opts);
    const tenantId = this.ensureTenantId(opts?.tenantId);
    await this.ensureAsset(assetId, opts?.manager, tenantId);
    const existing = await repo.findOne({ where: { asset_id: assetId, tenant_id: tenantId } as any });
    if (existing) {
      await repo.delete({ asset_id: assetId, tenant_id: tenantId } as any);
      await this.audit.log(
        { table: 'asset_hardware_info', recordId: existing.id, action: 'delete', before: existing, after: null, userId },
        { manager: opts?.manager },
      );
    }
  }
}
