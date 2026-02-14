import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { PortfolioRequest } from './portfolio-request.entity';
import {
  CsvExportService,
  CsvImportService,
  CsvImportParams,
  CsvExportResult,
  CsvImportResult,
  CsvFieldInfo,
} from '../common/csv';
import { portfolioRequestCsvConfig } from './portfolio-request-csv.config';

/**
 * Service for importing and exporting Portfolio Requests via CSV
 */
@Injectable()
export class PortfolioRequestsCsvService {
  constructor(
    @InjectRepository(PortfolioRequest) private readonly requests: Repository<PortfolioRequest>,
    private readonly exportSvc: CsvExportService,
    private readonly importSvc: CsvImportService,
  ) {}

  /**
   * Export portfolio requests to CSV format.
   */
  async export(opts: {
    manager: EntityManager;
    tenantId: string;
    scope?: 'template' | 'data';
    fields?: string[];
    preset?: string;
    status?: string;
  }): Promise<CsvExportResult> {
    const { manager, tenantId, scope, fields, preset, status } = opts;

    // Build query for requests
    let queryBuilder = manager
      .getRepository(PortfolioRequest)
      .createQueryBuilder('request')
      .where('request.tenant_id = :tenantId', { tenantId });

    // Filter by status if specified
    if (status) {
      queryBuilder = queryBuilder.andWhere('request.status = :status', { status });
    }

    queryBuilder = queryBuilder.orderBy('request.created_at', 'DESC');

    // Get requests (empty for template export)
    const requests = scope === 'template' ? [] : await queryBuilder.getMany();

    return this.exportSvc.export(portfolioRequestCsvConfig, requests, {
      manager,
      tenantId,
      scope,
      fields,
      preset,
    });
  }

  /**
   * Import portfolio requests from CSV file.
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
    return this.importSvc.import(portfolioRequestCsvConfig, file, params, opts);
  }

  /**
   * Get field metadata and presets for frontend display.
   */
  getFieldInfo(): { fields: CsvFieldInfo[]; presets: Array<{ name: string; label: string; fields: string[] }> } {
    const fields = portfolioRequestCsvConfig.fields
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

    const presets = (portfolioRequestCsvConfig.exportPresets ?? []).map((p) => ({
      name: p.name,
      label: p.label,
      fields: p.fields,
    }));

    return { fields, presets };
  }
}
