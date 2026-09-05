import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  CsvEntityConfig,
  CsvExportResult,
  CsvExportService,
  CsvFieldInfo,
  CsvImportContext,
  CsvImportParams,
  CsvImportResult,
  CsvImportService,
} from '../common/csv';
import { IntegratedDocumentsService } from '../knowledge/integrated-documents.service';
import {
  hasPendingIncidentReview,
  incidentCsvConfig,
  takePendingIncidentReview,
  takePreviousIncidentStatus,
} from './incident-csv.config';
import { IncidentViewer, incidentVisibilitySql } from './incident-visibility';

/** Timestamps travel as unambiguous UTC ISO so an export re-imports without losing the time. */
const isoUtc = (column: string) => `to_char(i.${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ${column}`;

const EXPORT_COLUMNS = `
  i.id::text AS id,
  'INC-' || i.item_number::text AS item_number,
  i.title, i.category, i.severity, i.status,
  ${isoUtc('started_at')}, ${isoUtc('detected_at')}, ${isoUtc('resolved_at')}, ${isoUtc('closed_at')},
  i.reporter_user_id, i.owner_user_id,
  i.description,
  i.source_ref,
  i.confidential,
  i.personal_data_affected, i.authority_notification_required,
  ${isoUtc('authority_notified_at')}, i.notified_parties`;

const REVIEW_COLUMN = 'review';
const SAVEPOINT = 'incident_csv_import';

/** Statuses that freeze the record; a transition into one snapshots the review. */
const FROZEN_STATUSES = new Set(['closed', 'cancelled']);

const IMPORT_REVIEW_CHANGE_NOTE = 'Imported from CSV';
const IMPORT_REVIEW_ENTRY_CONTENT = 'Incident review imported from CSV';
const CLOSURE_CHANGE_NOTES: Record<string, string> = {
  closed: 'Incident closed',
  cancelled: 'Incident cancelled',
};

/**
 * CSV import/export for the incident register.
 *
 * Export writes the register in reference order (INC-1, INC-2, …); import
 * upserts on that reference (see incident-csv.config.ts).
 *
 * The `review` column is virtual: it lives in the `incidents:review` integrated
 * document. Export hydrates it in one batched query under the visibility SQL
 * already applied to the rows; import writes it through the dedicated
 * `writeIncidentReviewForImport` primitive, inside the very transaction that
 * commits the upsert (planning/incident-review-document.md §3.8).
 */
@Injectable()
export class IncidentsCsvService {
  constructor(
    private readonly exportSvc: CsvExportService,
    private readonly importSvc: CsvImportService,
    private readonly integratedDocs: IntegratedDocumentsService,
  ) {}

  async export(opts: {
    manager: EntityManager;
    tenantId: string;
    viewer?: IncidentViewer;
    scope?: 'template' | 'data';
    fields?: string[];
  }): Promise<CsvExportResult> {
    const { manager, tenantId, viewer, scope, fields } = opts;
    const params: unknown[] = [tenantId];
    const visibility = incidentVisibilitySql('i', viewer, params);

    const rows: Array<Record<string, any>> = scope === 'template'
      ? []
      : await manager.query(
        `SELECT ${EXPORT_COLUMNS} FROM incidents i WHERE i.tenant_id = $1${visibility} ORDER BY i.item_number ASC`,
        params,
      );

    if (rows.length > 0 && (!fields || fields.includes(REVIEW_COLUMN))) {
      await this.hydrateReviews(rows, manager, tenantId);
    }

    return this.exportSvc.export(incidentCsvConfig, rows, { manager, tenantId, scope, fields });
  }

  /**
   * One batched `= ANY($ids)` lookup of the bound review documents. The rows
   * were already filtered by `incidentVisibilitySql`, so no invisible review
   * can be reached through this join.
   */
  private async hydrateReviews(
    rows: Array<Record<string, any>>,
    manager: EntityManager,
    tenantId: string,
  ): Promise<void> {
    const ids = rows.map((row) => row.id).filter(Boolean);
    if (ids.length === 0) return;

    const bodies: Array<{ source_entity_id: string; content_markdown: string | null }> = await manager.query(
      `SELECT b.source_entity_id::text AS source_entity_id, d.content_markdown
       FROM integrated_document_bindings b
       JOIN documents d ON d.id = b.document_id AND d.tenant_id = b.tenant_id
       WHERE b.tenant_id = $1
         AND b.source_entity_type = 'incidents'
         AND b.source_entity_id = ANY($2::uuid[])
         AND b.slot_key = 'review'`,
      [tenantId, ids],
    );

    const byIncidentId = new Map(bodies.map((row) => [row.source_entity_id, row.content_markdown ?? '']));
    for (const row of rows) {
      row[REVIEW_COLUMN] = byIncidentId.get(String(row.id)) ?? '';
    }
  }

  /**
   * The base config plus the review write, both hooks running inside the
   * transaction that saves the incidents (see the savepoint in `import`).
   *
   * `beforeCommit` writes the review of **existing** rows: the base hook has
   * just taken their row lock and validated visibility and the confidentiality
   * transition on that locked initial state, and the row itself is not written
   * yet — so a line that also changes the owner, the reporter or the
   * confidential flag is authorised on its pre-image, never on the state it is
   * about to produce (§3.8).
   *
   * `afterCommit` handles inserted rows (their id only exists then) and the
   * closure snapshot, which must come **after** the review write.
   */
  private buildCsvConfig(): CsvEntityConfig {
    const base = incidentCsvConfig;
    return {
      ...base,
      beforeCommit: async (entities: any[], context: CsvImportContext) => {
        await base.beforeCommit?.(entities, context);
        for (const entity of entities) {
          if (!entity?.id) continue;
          await this.writeReviewForRow(entity, context);
        }
      },
      afterCommit: async (entities: any[], context: CsvImportContext) => {
        for (const entity of entities) {
          if (!entity?.id) continue;
          await this.writeReviewForRow(entity, context);
          await this.snapshotClosureForRow(entity, context);
        }
        await base.afterCommit?.(entities, context);
      },
    };
  }

  /**
   * Writes one row's `review` cell, once (the pending value is consumed).
   * A blank or missing cell leaves the review untouched, in both enrich and
   * replace mode.
   */
  private async writeReviewForRow(entity: any, context: CsvImportContext): Promise<void> {
    if (!hasPendingIncidentReview(entity)) return;
    const review = takePendingIncidentReview(entity);
    if (review == null || review.trim() === '') return;

    const manager: EntityManager = context.manager;
    // Enforces the tenant, incidents:contributor, the incident's row visibility
    // (404) and another user's edit lock (423). It is the only path allowed to
    // write the review of a closed or cancelled incident, and it provisions the
    // binding when it is missing (an imported row may arrive already closed).
    const written = await this.integratedDocs.writeIncidentReviewForImport(
      entity.id,
      review,
      context.userId ?? null,
      { manager, changeNote: IMPORT_REVIEW_CHANGE_NOTE, activityContent: IMPORT_REVIEW_CHANGE_NOTE },
    );
    if (!written.changed) return;

    await this.addSystemEntry(manager, context, entity.id, IMPORT_REVIEW_ENTRY_CONTENT, {
      review_version: {
        from: null,
        to: {
          document_id: written.document_id,
          version_number: written.version_number,
          revision: written.revision,
        },
      },
    });
  }

  private async snapshotClosureForRow(entity: any, context: CsvImportContext): Promise<void> {
    const manager: EntityManager = context.manager;
    const previousStatus = takePreviousIncidentStatus(entity);
    const isInsert = previousStatus === null;

    if (isInsert) {
      // An inserted row never went through IncidentsService.create, so the
      // review document is provisioned here, from the template (§3.2).
      // Idempotent: a no-op when `writeReviewForRow` already created it.
      await this.integratedDocs.provisionForIncident(entity.id, context.userId ?? null, { manager });
    }

    const nextStatus = String(entity.status ?? '');
    if (!FROZEN_STATUSES.has(nextStatus) || FROZEN_STATUSES.has(String(previousStatus ?? ''))) return;

    await manager.query(
      'SELECT id FROM incidents WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [entity.id, context.tenantId],
    );
    const snapshot = await this.integratedDocs.snapshotReviewForIncidentTransition(entity.id, context.userId ?? null, {
      manager,
      changeNote: CLOSURE_CHANGE_NOTES[nextStatus] ?? 'Incident closed',
    });
    await this.addSystemEntry(manager, context, entity.id, null, {
      status: { from: previousStatus, to: nextStatus },
      review_version: { from: null, to: snapshot },
    });
  }

  private async addSystemEntry(
    manager: EntityManager,
    context: CsvImportContext,
    incidentId: string,
    content: string | null,
    changedFields: Record<string, { from: unknown; to: unknown }>,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO incident_entries (tenant_id, incident_id, kind, content, changed_fields, author_id)
       VALUES ($1, $2, 'system', $3, $4::jsonb, $5)`,
      [context.tenantId, incidentId, content, JSON.stringify(changedFields), context.userId ?? null],
    );
  }

  async import(
    file: Express.Multer.File,
    params: CsvImportParams,
    opts: {
      manager: EntityManager;
      tenantId: string;
      userId?: string | null;
      isAdmin?: boolean;
      viewer?: IncidentViewer;
    },
  ): Promise<CsvImportResult> {
    // The import service turns a commit failure into `ok: false` instead of
    // rethrowing, which would leave the request transaction committing a
    // partial import. A savepoint makes the upsert and the review writes one
    // unit: either both land, or neither does (§3.8).
    const runner = opts.manager.queryRunner;
    const transactional = !!runner?.isTransactionActive;
    if (!transactional) {
      return this.importSvc.import(this.buildCsvConfig(), file, params, opts);
    }

    await opts.manager.query(`SAVEPOINT ${SAVEPOINT}`);
    let result: CsvImportResult;
    try {
      result = await this.importSvc.import(this.buildCsvConfig(), file, params, opts);
    } catch (error) {
      await opts.manager.query(`ROLLBACK TO SAVEPOINT ${SAVEPOINT}`);
      await opts.manager.query(`RELEASE SAVEPOINT ${SAVEPOINT}`);
      throw error;
    }
    if (!result.ok && !result.dryRun) {
      await opts.manager.query(`ROLLBACK TO SAVEPOINT ${SAVEPOINT}`);
    }
    await opts.manager.query(`RELEASE SAVEPOINT ${SAVEPOINT}`);
    return result;
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
