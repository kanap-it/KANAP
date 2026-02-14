import { useState, useCallback, useEffect, useRef } from 'react';
import { CsvFieldInfo } from './csv.types';

/**
 * Hook for managing CSV export state
 */
export function useCsvExport(fieldsInfo: CsvFieldInfo[] = []) {
  const [preset, setPreset] = useState<string>('full');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  // Initialize selected fields from fieldsInfo (only once)
  useEffect(() => {
    if (fieldsInfo.length > 0 && !initialized.current) {
      initialized.current = true;
      const exportableFields = fieldsInfo
        .filter((f) => f.exportable)
        .map((f) => f.csvColumn);
      setSelectedFields(new Set(exportableFields));
    }
  }, [fieldsInfo]);

  // Toggle a field selection
  const toggleField = useCallback((fieldName: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
    // Switch to custom preset when manually toggling
    setPreset('custom');
  }, []);

  // Select all fields
  const selectAll = useCallback(() => {
    const exportableFields = fieldsInfo
      .filter((f) => f.exportable)
      .map((f) => f.csvColumn);
    setSelectedFields(new Set(exportableFields));
    setPreset('full');
  }, [fieldsInfo]);

  // Deselect all fields
  const deselectAll = useCallback(() => {
    setSelectedFields(new Set());
    setPreset('custom');
  }, []);

  // Apply a preset
  const applyPreset = useCallback((presetName: string, presetFields?: string[]) => {
    setPreset(presetName);
    if (presetFields) {
      setSelectedFields(new Set(presetFields));
    } else if (presetName === 'full') {
      selectAll();
    }
  }, [selectAll]);

  // Get fields as comma-separated string for API
  const getFieldsParam = useCallback(() => {
    return Array.from(selectedFields).join(',');
  }, [selectedFields]);

  // Group fields by their group property
  const groupedFields = useCallback(() => {
    const groups: Record<string, CsvFieldInfo[]> = {};
    for (const field of fieldsInfo) {
      if (!field.exportable) continue;
      const group = field.group || 'Other';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(field);
    }
    return groups;
  }, [fieldsInfo]);

  return {
    // State
    preset,
    selectedFields,
    loading,
    fieldCount: selectedFields.size,
    totalFields: fieldsInfo.filter((f) => f.exportable).length,

    // Setters
    setPreset,
    setLoading,

    // Actions
    toggleField,
    selectAll,
    deselectAll,
    applyPreset,
    getFieldsParam,
    groupedFields,
  };
}

export type UseCsvExportReturn = ReturnType<typeof useCsvExport>;
