import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Asset } from './asset.entity';
import {
  CsvExportService,
  CsvImportService,
  CsvImportParams,
  CsvExportResult,
  CsvImportResult,
  CsvFieldInfo,
} from '../common/csv';
import { assetCsvConfig } from './asset-csv.config';

/**
 * Service for importing and exporting Assets via CSV
 */
@Injectable()
export class AssetsCsvService {
  constructor(
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    private readonly exportSvc: CsvExportService,
    private readonly importSvc: CsvImportService,
  ) {}

  /**
   * Export assets to CSV format.
   */
  async export(opts: {
    manager: EntityManager;
    tenantId: string;
    scope?: 'template' | 'data';
    fields?: string[];
    preset?: string;
    environment?: string;
    kind?: string;
    status?: string;
  }): Promise<CsvExportResult> {
    const { manager, tenantId, scope, fields, preset, environment, kind, status } = opts;

    // Build query for assets
    let queryBuilder = manager
      .getRepository(Asset)
      .createQueryBuilder('asset')
      .where('asset.tenant_id = :tenantId', { tenantId });

    // Apply filters
    if (environment) {
      queryBuilder = queryBuilder.andWhere('asset.environment = :environment', { environment });
    }
    if (kind) {
      queryBuilder = queryBuilder.andWhere('asset.kind = :kind', { kind });
    }
    if (status) {
      queryBuilder = queryBuilder.andWhere('asset.status = :status', { status });
    }

    queryBuilder = queryBuilder.orderBy('asset.name', 'ASC');

    // Get assets (empty for template export)
    const assets = scope === 'template' ? [] : await queryBuilder.getMany();

    return this.exportSvc.export(assetCsvConfig, assets, {
      manager,
      tenantId,
      scope,
      fields,
      preset,
    });
  }

  /**
   * Import assets from CSV file.
   */
  async import(
    file: Express.Multer.File,
    params: CsvImportParams,
    opts: {
      manager: EntityManager;
      tenantId: string;
      userId?: string | null;
    },
  ): Promise<CsvImportResult> {
    return this.importSvc.import(assetCsvConfig, file, params, opts);
  }

  /**
   * Get field metadata and presets for frontend display.
   */
  getFieldInfo(): { fields: CsvFieldInfo[]; presets: Array<{ name: string; label: string; fields: string[] }> } {
    const fields = assetCsvConfig.fields
      .filter((f) => f.exportable !== false || f.importable !== false)
      .map((f) => ({
        csvColumn: f.csvColumn,
        label: f.label ?? f.csvColumn,
        type: f.type,
        exportable: f.exportable !== false,
        importable: f.importable !== false,
        required: f.required ?? false,
        group: f.group,
        enumValues: f.enumValues,
      }));

    const presets = (assetCsvConfig.exportPresets ?? []).map((p) => ({
      name: p.name,
      label: p.label,
      fields: p.fields,
    }));

    return { fields, presets };
  }
}
