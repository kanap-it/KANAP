/**
 * CSV Types and Interfaces for Frontend Components
 */

/** Import mode: how to handle empty cells */
export type ImportMode = 'replace' | 'enrich';

/** Import operation: what actions to perform */
export type ImportOperation = 'upsert' | 'update_only' | 'insert_only';

/** Workflow preset combining mode and operation */
export interface WorkflowPreset {
  id: string;
  label: string;
  description: string;
  mode: ImportMode;
  operation: ImportOperation;
  recommended?: boolean;
}

/** Pre-defined workflow presets */
export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: 'merge',
    label: 'Merge external data',
    description: 'Add new records and update existing ones. Empty cells preserve current values.',
    mode: 'enrich',
    operation: 'upsert',
    recommended: true,
  },
  {
    id: 'update_only',
    label: 'Update existing only',
    description: 'Only update records that already exist. New records are skipped.',
    mode: 'enrich',
    operation: 'update_only',
  },
  {
    id: 'insert_only',
    label: 'Add new only',
    description: 'Only add new records. Existing records are skipped.',
    mode: 'enrich',
    operation: 'insert_only',
  },
  {
    id: 'full_replace',
    label: 'Full replace',
    description: 'Replace all values including empty cells. Empty cells will clear existing data.',
    mode: 'replace',
    operation: 'upsert',
  },
];

/** Import result from backend */
export interface CsvImportResult {
  ok: boolean;
  dryRun: boolean;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; column?: string; message: string }>;
  warnings: Array<{ row: number; column?: string; message: string }>;
}

/** Field info from backend */
export interface CsvFieldInfo {
  csvColumn: string;
  label: string;
  type: string;
  exportable: boolean;
  importable: boolean;
  required: boolean;
  group?: string;
  enumValues?: string[];
  description?: string;
}

/** Export preset */
export interface CsvExportPreset {
  name: string;
  label: string;
  /** Field list - optional if preset is handled by backend */
  fields?: string[];
}

/** Import phase */
export type ImportPhase = 'upload' | 'validate' | 'result';
