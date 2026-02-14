import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { PortfolioProject } from './portfolio-project.entity';
import {
  CsvExportService,
  CsvImportService,
  CsvImportParams,
  CsvExportResult,
  CsvImportResult,
  CsvFieldInfo,
} from '../common/csv';
import { portfolioProjectCsvConfig } from './portfolio-project-csv.config';

/**
 * Service for importing and exporting Portfolio Projects via CSV
 */
@Injectable()
export class PortfolioProjectsCsvService {
  constructor(
    @InjectRepository(PortfolioProject) private readonly projects: Repository<PortfolioProject>,
    private readonly exportSvc: CsvExportService,
    private readonly importSvc: CsvImportService,
  ) {}

  /**
   * Export portfolio projects to CSV format.
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

    // Build query for projects
    let queryBuilder = manager
      .getRepository(PortfolioProject)
      .createQueryBuilder('project')
      .where('project.tenant_id = :tenantId', { tenantId });

    // Filter by status if specified
    if (status) {
      queryBuilder = queryBuilder.andWhere('project.status = :status', { status });
    }

    queryBuilder = queryBuilder.orderBy('project.created_at', 'DESC');

    // Get projects (empty for template export)
    const projects = scope === 'template' ? [] : await queryBuilder.getMany();

    return this.exportSvc.export(portfolioProjectCsvConfig, projects, {
      manager,
      tenantId,
      scope,
      fields,
      preset,
    });
  }

  /**
   * Import portfolio projects from CSV file.
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
    return this.importSvc.import(portfolioProjectCsvConfig, file, params, opts);
  }

  /**
   * Get field metadata and presets for frontend display.
   */
  getFieldInfo(): { fields: CsvFieldInfo[]; presets: Array<{ name: string; label: string; fields: string[] }> } {
    const fields = portfolioProjectCsvConfig.fields
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

    const presets = (portfolioProjectCsvConfig.exportPresets ?? []).map((p) => ({
      name: p.name,
      label: p.label,
      fields: p.fields,
    }));

    return { fields, presets };
  }
}
