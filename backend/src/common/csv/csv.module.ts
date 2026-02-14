import { Module } from '@nestjs/common';
import { CsvResolverService } from './csv-resolver.service';
import { CsvExportService } from './csv-export.service';
import { CsvImportService } from './csv-import.service';
import { CsvJsonValidators } from './csv-json-validators';

/**
 * CSV Module
 *
 * Provides reusable, declarative CSV import/export functionality.
 *
 * Usage:
 * 1. Import CsvModule in your feature module
 * 2. Create a CSV config file defining fields for your entity
 * 3. Create a wrapper service using CsvExportService and CsvImportService
 * 4. Add controller endpoints for export/import
 *
 * Example:
 * ```typescript
 * // task-csv.config.ts
 * export const taskCsvConfig: CsvEntityConfig = {
 *   entityName: 'task',
 *   tableName: 'tasks',
 *   displayName: 'Tasks',
 *   upsertKey: ['title', 'related_object_id'],
 *   fields: [
 *     { csvColumn: 'id', entityProperty: 'id', type: CsvFieldType.STRING, isIdentityColumn: true },
 *     { csvColumn: 'title', entityProperty: 'title', type: CsvFieldType.STRING, required: true },
 *     // ... more fields
 *   ],
 * };
 *
 * // tasks-csv.service.ts
 * @Injectable()
 * export class TasksCsvService {
 *   constructor(
 *     private readonly exportSvc: CsvExportService,
 *     private readonly importSvc: CsvImportService,
 *   ) {}
 *
 *   async export(tasks: Task[], opts: CsvExportOptions) {
 *     return this.exportSvc.export(taskCsvConfig, tasks, opts);
 *   }
 *
 *   async import(file: Express.Multer.File, params: CsvImportParams, opts: CsvImportOptions) {
 *     return this.importSvc.import(taskCsvConfig, file, params, opts);
 *   }
 * }
 * ```
 */
@Module({
  providers: [
    CsvResolverService,
    CsvExportService,
    CsvImportService,
    CsvJsonValidators,
  ],
  exports: [
    CsvResolverService,
    CsvExportService,
    CsvImportService,
    CsvJsonValidators,
  ],
})
export class CsvModule {}
