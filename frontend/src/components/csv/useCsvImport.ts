import { useState, useCallback } from 'react';
import {
  ImportMode,
  ImportOperation,
  ImportPhase,
  CsvImportResult,
  WORKFLOW_PRESETS,
} from './csv.types';

/**
 * Hook for managing CSV import state and flow
 */
export function useCsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<ImportPhase>('upload');
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState('merge');
  const [mode, setMode] = useState<ImportMode>('enrich');
  const [operation, setOperation] = useState<ImportOperation>('upsert');

  // Update mode/operation when preset changes
  const selectPreset = useCallback((id: string) => {
    setPresetId(id);
    const preset = WORKFLOW_PRESETS.find((p) => p.id === id);
    if (preset) {
      setMode(preset.mode);
      setOperation(preset.operation);
    }
  }, []);

  // Reset state for new import
  const reset = useCallback(() => {
    setFile(null);
    setPhase('upload');
    setResult(null);
    setLoading(false);
    setError(null);
    setPresetId('merge');
    setMode('enrich');
    setOperation('upsert');
  }, []);

  // Go back to upload phase
  const goBack = useCallback(() => {
    setPhase('upload');
    setResult(null);
    setError(null);
  }, []);

  return {
    // State
    file,
    phase,
    result,
    loading,
    error,
    presetId,
    mode,
    operation,

    // Setters
    setFile,
    setPhase,
    setResult,
    setLoading,
    setError,
    setMode,
    setOperation,

    // Actions
    selectPreset,
    reset,
    goBack,
  };
}

export type UseCsvImportReturn = ReturnType<typeof useCsvImport>;
