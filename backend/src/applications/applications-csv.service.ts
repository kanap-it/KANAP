import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { Application } from './application.entity';
import { ApplicationOwner } from './application-owner.entity';
import { ApplicationDataResidency } from './application-data-residency.entity';
import {
  CsvExportService,
  CsvImportService,
  CsvImportParams,
  CsvExportResult,
  CsvImportResult,
  CsvFieldInfo,
  CsvResolverService,
} from '../common/csv';
import { applicationCsvConfig } from './application-csv.config';

/**
 * Service for importing and exporting Applications via CSV (V2)
 *
 * Uses the standardized CSV infrastructure with:
 * - Numbered owner columns (business_owner_email_1..4, it_owner_email_1..4)
 * - Proper FK resolution
 * - Two-phase import with validation
 */
@Injectable()
export class ApplicationsCsvService {
  constructor(
    @InjectRepository(Application) private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationOwner) private readonly owners: Repository<ApplicationOwner>,
    @InjectRepository(ApplicationDataResidency) private readonly residency: Repository<ApplicationDataResidency>,
    private readonly exportSvc: CsvExportService,
    private readonly importSvc: CsvImportService,
    private readonly resolver: CsvResolverService,
  ) {}

  /**
   * Export applications to CSV format (V2).
   */
  async export(opts: {
    manager: EntityManager;
    tenantId: string;
    scope?: 'template' | 'data';
    fields?: string[];
    preset?: string;
    lifecycle?: string;
    criticality?: string;
    status?: string;
  }): Promise<CsvExportResult> {
    const { manager, tenantId, scope, fields, preset, lifecycle, criticality, status } = opts;

    // For template export, just return headers (all importable fields)
    if (scope === 'template') {
      const headers = this.buildExportHeaders(fields, preset, 'template');
      const BOM = '\uFEFF';
      return {
        filename: 'application_template.csv',
        content: BOM + headers.join(';') + '\n',
        rowCount: 0,
        warnings: [],
      };
    }

    // Build query for applications with related data
    let queryBuilder = manager
      .getRepository(Application)
      .createQueryBuilder('app')
      .where('app.tenant_id = :tenantId', { tenantId });

    // Apply filters
    if (lifecycle) {
      queryBuilder = queryBuilder.andWhere('app.lifecycle = :lifecycle', { lifecycle });
    }
    if (criticality) {
      queryBuilder = queryBuilder.andWhere('app.criticality = :criticality', { criticality });
    }
    if (status) {
      queryBuilder = queryBuilder.andWhere('app.status = :status', { status });
    }

    queryBuilder = queryBuilder.orderBy('app.name', 'ASC');

    const applications = await queryBuilder.getMany();

    // Load related data for export
    if (applications.length > 0) {
      const appIds = applications.map((a) => a.id);

      // Load owners with user data
      const ownersWithUsers = await manager.query(`
        SELECT o.application_id, o.user_id, o.owner_type, u.email
        FROM application_owners o
        JOIN users u ON u.id = o.user_id
        WHERE o.application_id = ANY($1)
        ORDER BY o.created_at ASC
      `, [appIds]);

      const ownersByApp = new Map<string, any[]>();
      for (const owner of ownersWithUsers) {
        if (!ownersByApp.has(owner.application_id)) {
          ownersByApp.set(owner.application_id, []);
        }
        ownersByApp.get(owner.application_id)!.push({
          owner_type: owner.owner_type,
          user: { email: owner.email },
        });
      }

      // Load data residency
      const residencyRows = await manager.query(`
        SELECT application_id, country_iso
        FROM application_data_residency
        WHERE application_id = ANY($1)
        ORDER BY created_at ASC
      `, [appIds]);

      const residencyByApp = new Map<string, any[]>();
      for (const row of residencyRows) {
        if (!residencyByApp.has(row.application_id)) {
          residencyByApp.set(row.application_id, []);
        }
        residencyByApp.get(row.application_id)!.push({ country_iso: row.country_iso });
      }

      // Attach to applications
      for (const app of applications) {
        (app as any)._owners = ownersByApp.get(app.id) || [];
        (app as any)._dataResidency = residencyByApp.get(app.id) || [];
      }
    }

    // Build CSV content - owner columns are now handled via COMPUTED fields in config
    return this.exportSvc.export(applicationCsvConfig, applications, {
      manager,
      tenantId,
      scope,
      fields,
      preset,
    });
  }

  /**
   * Build export headers based on fields/preset/scope.
   */
  private buildExportHeaders(fields?: string[], preset?: string, scope?: 'template' | 'data'): string[] {
    // For template scope, use all importable fields (so users see what they can import)
    if (scope === 'template') {
      const importableFields = applicationCsvConfig.fields.filter((f) => f.importable !== false);
      return importableFields.map((f) => f.csvColumn);
    }

    // For data export, filter by exportable
    let selectedFields = applicationCsvConfig.fields.filter((f) => f.exportable !== false);

    if (preset && applicationCsvConfig.exportPresets) {
      const presetConfig = applicationCsvConfig.exportPresets.find((p) => p.name === preset);
      if (presetConfig) {
        const presetSet = new Set(presetConfig.fields);
        selectedFields = selectedFields.filter((f) => presetSet.has(f.csvColumn));
      }
    } else if (fields && fields.length > 0) {
      const fieldSet = new Set(fields);
      selectedFields = selectedFields.filter((f) => fieldSet.has(f.csvColumn));
    }
    // No preset and no explicit fields: return all exportable fields (Full Export)

    return selectedFields.map((f) => f.csvColumn);
  }

  /**
   * Import applications from CSV file (V2).
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
    // First run the base import
    const result = await this.importSvc.import(applicationCsvConfig, file, params, opts);

    // If successful and not dry run, handle owners and data residency
    if (result.ok && !params.dryRun) {
      await this.handleOwnerImport(file, opts);
      await this.handleDataResidencyImport(file, opts);
    }

    return result;
  }

  /**
   * Handle owner import from CSV after main import.
   */
  private async handleOwnerImport(file: Express.Multer.File, opts: { manager: EntityManager; tenantId: string }) {
    const { manager, tenantId } = opts;

    // Re-parse the file to get owner columns
    const { parseString } = await import('@fast-csv/parse');
    const { decodeCsvBufferUtf8OrThrow } = await import('../common/encoding');

    const text = decodeCsvBufferUtf8OrThrow(file.buffer);
    const rows: Record<string, string>[] = [];

    await new Promise<void>((resolve, reject) => {
      parseString(text, { headers: true, delimiter: ';', ignoreEmpty: true })
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    // Load user lookup
    const users = await manager.query(`SELECT id, email FROM users WHERE tenant_id = $1`, [tenantId]);
    const userByEmail = new Map<string, string>();
    for (const u of users) {
      userByEmail.set(String(u.email).toLowerCase(), u.id);
    }

    // Process each row
    for (const row of rows) {
      const appName = (row['name'] || '').trim();
      if (!appName) continue;

      // Find application
      const appRows = await manager.query(
        `SELECT id FROM applications WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
        [tenantId, appName],
      );
      if (appRows.length === 0) continue;
      const appId = appRows[0].id;

      // Clear existing owners
      await manager.query(`DELETE FROM application_owners WHERE application_id = $1`, [appId]);

      // Collect new owners (dedupe by owner type + user to avoid unique violations)
      const newOwners: Array<{ user_id: string; owner_type: 'business' | 'it' }> = [];
      const ownerKeys = new Set<string>();
      const addOwner = (email: string, ownerType: 'business' | 'it') => {
        if (!email) return;
        const userId = userByEmail.get(email);
        if (!userId) return;
        const key = `${ownerType}:${userId}`;
        if (ownerKeys.has(key)) return;
        ownerKeys.add(key);
        newOwners.push({ user_id: userId, owner_type: ownerType });
      };

      // Business owners
      for (let i = 1; i <= 4; i++) {
        const email = (row[`business_owner_email_${i}`] || '').trim().toLowerCase();
        addOwner(email, 'business');
      }

      // IT owners
      for (let i = 1; i <= 4; i++) {
        const email = (row[`it_owner_email_${i}`] || '').trim().toLowerCase();
        addOwner(email, 'it');
      }

      // Insert new owners
      if (newOwners.length > 0) {
        const ownerRepo = manager.getRepository(ApplicationOwner);
        await ownerRepo.save(
          newOwners.map((o) => ownerRepo.create({
            application_id: appId,
            user_id: o.user_id,
            owner_type: o.owner_type,
          })),
        );
      }
    }
  }

  /**
   * Handle data residency import from CSV after main import.
   */
  private async handleDataResidencyImport(file: Express.Multer.File, opts: { manager: EntityManager; tenantId: string }) {
    const { manager, tenantId } = opts;

    // Re-parse the file
    const { parseString } = await import('@fast-csv/parse');
    const { decodeCsvBufferUtf8OrThrow } = await import('../common/encoding');

    const text = decodeCsvBufferUtf8OrThrow(file.buffer);
    const rows: Record<string, string>[] = [];

    await new Promise<void>((resolve, reject) => {
      parseString(text, { headers: true, delimiter: ';', ignoreEmpty: true })
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    // Process each row
    for (const row of rows) {
      const appName = (row['name'] || '').trim();
      const residencyRaw = row['data_residency'] || '';
      if (!appName) continue;

      // Find application
      const appRows = await manager.query(
        `SELECT id FROM applications WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
        [tenantId, appName],
      );
      if (appRows.length === 0) continue;
      const appId = appRows[0].id;

      // Parse residency codes
      const codes = residencyRaw
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length === 2);

      if (codes.length === 0) continue;

      // Clear existing residency
      await manager.query(`DELETE FROM application_data_residency WHERE application_id = $1`, [appId]);

      // Insert new residency
      const residencyRepo = manager.getRepository(ApplicationDataResidency);
      await residencyRepo.save(
        [...new Set(codes)].map((iso) => residencyRepo.create({
          application_id: appId,
          country_iso: iso,
        })),
      );
    }
  }

  /**
   * Get field metadata and presets for frontend display.
   */
  getFieldInfo(): { fields: CsvFieldInfo[]; presets: Array<{ name: string; label: string; fields: string[] }> } {
    const fields = applicationCsvConfig.fields
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

    const presets = (applicationCsvConfig.exportPresets ?? []).map((p) => ({
      name: p.name,
      label: p.label,
      fields: p.fields,
    }));

    return { fields, presets };
  }
}
