import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  CsvExportResult,
  CsvExportService,
  CsvFieldInfo,
  CsvImportParams,
  CsvImportResult,
  CsvImportService,
} from '../common/csv';
import { incidentCsvConfig } from './incident-csv.config';

/** Timestamps travel as unambiguous UTC ISO so an export re-imports without losing the time. */
const isoUtc = (column: string) => `to_char(i.${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ${column}`;

const EXPORT_COLUMNS = `
  'INC-' || i.item_number::text AS item_number,
  i.title, i.category, i.severity, i.status,
  ${isoUtc('started_at')}, ${isoUtc('detected_at')}, ${isoUtc('resolved_at')}, ${isoUtc('closed_at')},
  i.reporter_user_id, i.owner_user_id,
  i.description, i.impact, i.root_cause, i.corrective_actions, i.lessons_learned,
  i.source_ref,
  i.personal_data_affected, i.authority_notification_required,
  ${isoUtc('authority_notified_at')}, i.notified_parties`;

/**
 * CSV import/export for the incident register.
 *
 * Export writes the register in reference order (INC-1, INC-2, …); import
 * upserts on that reference (see incident-csv.config.ts).
 */
@Injectable()
export class IncidentsCsvService {
  constructor(
    private readonly exportSvc: CsvExportService,
    private readonly importSvc: CsvImportService,
  ) {}

  async export(opts: {
    manager: EntityManager;
    tenantId: string;
    scope?: 'template' | 'data';
    fields?: string[];
  }): Promise<CsvExportResult> {
    const { manager, tenantId, scope, fields } = opts;

    const rows = scope === 'template'
      ? []
      : await manager.query(
        `SELECT ${EXPORT_COLUMNS} FROM incidents i WHERE i.tenant_id = $1 ORDER BY i.item_number ASC`,
        [tenantId],
      );

    return this.exportSvc.export(incidentCsvConfig, rows, { manager, tenantId, scope, fields });
  }

  async import(
    file: Express.Multer.File,
    params: CsvImportParams,
    opts: {
      manager: EntityManager;
      tenantId: string;
      userId?: string | null;
    },
  ): Promise<CsvImportResult> {
    return this.importSvc.import(incidentCsvConfig, file, params, opts);
  }

  /**
   * Field metadata for the export/import dialogs.
   */
  getFieldInfo(): { fields: CsvFieldInfo[]; presets: Array<{ name: string; label: string; fields: string[] }> } {
    const fields = incidentCsvConfig.fields
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

    return { fields, presets: [] };
  }
}
