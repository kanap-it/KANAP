import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Box, Button, Checkbox, CircularProgress, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { IFilterParams } from 'ag-grid-community';

export type CheckboxSetFilterOption = {
  value: string | null;
  label?: string;
};

export type CheckboxSetFilterContext = {
  api: any;
  column: any;
  context: any;
  filterParams: CheckboxSetFilterParams;
};

export type CheckboxSetFilterParams = {
  values?: CheckboxSetFilterOption[];
  getValues?: (ctx: CheckboxSetFilterContext) => Promise<CheckboxSetFilterOption[]>;
  emptyLabel?: string;
  searchable?: boolean;
  labelFormatter?: (value: string | null) => string;
  sortComparator?: (a: CheckboxSetFilterOption, b: CheckboxSetFilterOption) => number;
  treatAllAsUnfiltered?: boolean;
};

type SetFilterModel = {
  filterType: 'set';
  values: Array<string | null>;
};

type CheckboxSetFilterProps = IFilterParams & CheckboxSetFilterParams;

const CheckboxSetFilter = React.forwardRef<any, CheckboxSetFilterProps>((props, ref) => {
  const { t } = useTranslation('common');
  const emptyLabel = props.emptyLabel ?? t('filters.blank');
  const searchable = props.searchable ?? true;
  const labelFormatter = props.labelFormatter;
  const treatAllAsUnfiltered = props.treatAllAsUnfiltered ?? true;

  const [options, setOptions] = useState<CheckboxSetFilterOption[]>([]);
  const [selectedValues, setSelectedValues] = useState<Set<string | null>>(new Set());
  const selectedRef = useRef<Set<string | null>>(new Set());
  const explicitEmptyRef = useRef(false);
  const implicitAllRef = useRef(true);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const buildLabel = useCallback((option: CheckboxSetFilterOption) => {
    if (option.label != null && option.label !== '') return option.label;
    if (labelFormatter) return labelFormatter(option.value ?? null);
    if (option.value == null) return emptyLabel;
    return String(option.value);
  }, [emptyLabel, labelFormatter]);

  const normalizeOptions = useCallback((incoming: CheckboxSetFilterOption[]) => {
    const map = new Map<string | null, CheckboxSetFilterOption>();
    for (const opt of incoming) {
      const normalized = { value: opt.value ?? null, label: buildLabel(opt) };
      if (!map.has(normalized.value)) map.set(normalized.value, normalized);
    }
    return Array.from(map.values());
  }, [buildLabel]);

  const loadOptions = useCallback(async () => {
    if (!props.getValues && !props.values) return;
    setLoading(true);
    try {
      let incoming: CheckboxSetFilterOption[] = [];
      if (props.getValues) {
        incoming = await props.getValues({
          api: props.api,
          column: props.column,
          context: props.context,
          filterParams: props,
        });
      } else if (props.values) {
        incoming = props.values;
      }
      setOptions(normalizeOptions(incoming));
    } catch (e) {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeOptions, props]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const mergedOptions = useMemo(() => {
    const map = new Map<string | null, CheckboxSetFilterOption>();
    for (const opt of options) {
      map.set(opt.value ?? null, { value: opt.value ?? null, label: buildLabel(opt) });
    }
    for (const value of selectedValues) {
      if (!map.has(value)) {
        map.set(value, { value, label: buildLabel({ value }) });
      }
    }
    const merged = Array.from(map.values());
    if (props.sortComparator) {
      merged.sort(props.sortComparator);
    }
    return merged;
  }, [options, selectedValues, buildLabel, props.sortComparator]);

  const optionValueSet = useMemo(() => {
    return new Set(options.map((opt) => opt.value ?? null));
  }, [options]);

  const isAllSelected = useCallback((next: Set<string | null>) => {
    if (optionValueSet.size === 0) return false;
    for (const value of optionValueSet) {
      if (!next.has(value)) return false;
    }
    return true;
  }, [optionValueSet]);

  const filteredOptions = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return mergedOptions;
    return mergedOptions.filter((opt) => buildLabel(opt).toLowerCase().includes(trimmed));
  }, [mergedOptions, search, buildLabel]);

  const updateFilterModel = useCallback((next: Set<string | null> | null) => {
    const api = props.api;
    const colId = props.column?.getColId?.() ?? props.colDef?.field;
    if (!api || !colId) return;
    const current = api.getFilterModel?.() ?? {};
    const nextModel: any = { ...current };
    if (!next) {
      delete nextModel[colId];
      explicitEmptyRef.current = false;
    } else {
      if (next.size === 0) {
        nextModel[colId] = {
          filterType: 'set',
          values: [],
        };
        explicitEmptyRef.current = true;
      } else {
        nextModel[colId] = {
          filterType: 'set',
          values: Array.from(next),
        };
        explicitEmptyRef.current = false;
      }
    }
    if (typeof api.setFilterModel === 'function') {
      api.setFilterModel(nextModel);
    } else {
      const fallback = (props as any).filterChangedCallback;
      if (typeof fallback === 'function') fallback();
    }
  }, [props.api, props.column, props.colDef]);

  const setSelection = useCallback((next: Set<string | null>, opts?: { skipModelUpdate?: boolean }) => {
    selectedRef.current = next;
    setSelectedValues(next);
    if (opts?.skipModelUpdate) return;
    if (next.size === 0) {
      implicitAllRef.current = false;
      updateFilterModel(next);
      return;
    }
    if (treatAllAsUnfiltered && isAllSelected(next)) {
      implicitAllRef.current = true;
      updateFilterModel(null);
      return;
    }
    implicitAllRef.current = false;
    updateFilterModel(next);
  }, [isAllSelected, updateFilterModel, treatAllAsUnfiltered]);

  const toggleValue = useCallback((value: string | null) => {
    const base = implicitAllRef.current && selectedValues.size === 0
      ? new Set(optionValueSet)
      : new Set(selectedValues);
    const next = new Set(base);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelection(next);
  }, [selectedValues, setSelection, optionValueSet]);

  const handleSelectAll = useCallback(() => {
    const next = new Set<string | null>();
    mergedOptions.forEach((opt) => next.add(opt.value ?? null));
    if (treatAllAsUnfiltered) {
      implicitAllRef.current = true;
      setSelection(next, { skipModelUpdate: true });
      updateFilterModel(null);
      return;
    }
    implicitAllRef.current = false;
    setSelection(next);
  }, [mergedOptions, setSelection, updateFilterModel, treatAllAsUnfiltered]);

  const handleClear = useCallback(() => {
    implicitAllRef.current = false;
    setSelection(new Set());
  }, [setSelection]);

  useEffect(() => {
    const api = props.api;
    const colId = props.column?.getColId?.() ?? props.colDef?.field;
    if (api && colId) {
      const current = api.getFilterModel?.() ?? {};
      const model = current[colId] as SetFilterModel | undefined;
      if (model && Array.isArray(model.values)) {
        explicitEmptyRef.current = model.values.length === 0;
        implicitAllRef.current = false;
        const next = new Set((model.values ?? []).map((value) => value ?? null));
        selectedRef.current = next;
        setSelectedValues(next);
        return;
      }
    }
    if (!implicitAllRef.current) return;
    const next = new Set<string | null>();
    options.forEach((opt) => next.add(opt.value ?? null));
    selectedRef.current = next;
    setSelectedValues(next);
  }, [options, props.api, props.column, props.colDef]);

  useImperativeHandle(ref, () => ({
    isFilterActive() {
      if (implicitAllRef.current) return false;
      return explicitEmptyRef.current || selectedRef.current.size > 0;
    },
    doesFilterPass() {
      return true;
    },
    getModel(): SetFilterModel | null {
      if (implicitAllRef.current) return null;
      if (!explicitEmptyRef.current && selectedRef.current.size === 0) return null;
      return {
        filterType: 'set',
        values: explicitEmptyRef.current ? [] : Array.from(selectedRef.current),
      };
    },
    setModel(model: SetFilterModel | null) {
      if (!model || !Array.isArray(model.values)) {
        explicitEmptyRef.current = false;
        implicitAllRef.current = true;
        const next = new Set<string | null>();
        options.forEach((opt) => next.add(opt.value ?? null));
        selectedRef.current = next;
        setSelectedValues(next);
        return;
      }
      explicitEmptyRef.current = model.values.length === 0;
      implicitAllRef.current = false;
      const next = new Set((model.values ?? []).map((value) => value ?? null));
      selectedRef.current = next;
      setSelectedValues(next);
    },
    afterGuiAttached() {
      loadOptions();
    },
  }), [loadOptions, options]);

  return (
    <Box sx={{ p: 1, minWidth: 220 }}>
      {searchable && (
        <TextField
          size="small"
          fullWidth
          placeholder={t('filters.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ mb: 1 }}
        />
      )}
      <Box sx={{ maxHeight: 240, overflowY: 'auto', pr: 0.5 }}>
        {loading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">{t('status.loading')}</Typography>
          </Stack>
        )}
        {!loading && filteredOptions.length === 0 && (
          <Typography variant="body2" color="text.secondary">{t('filters.noOptions')}</Typography>
        )}
        {!loading && filteredOptions.map((opt) => {
          const value = opt.value ?? null;
          const label = buildLabel(opt);
          return (
            <FormControlLabel
              key={`${String(value)}-${label}`}
              control={(
                <Checkbox
                  size="small"
                  checked={selectedValues.has(value)}
                  onChange={() => toggleValue(value)}
                />
              )}
              label={<Typography variant="body2">{label}</Typography>}
              sx={{ display: 'flex', alignItems: 'center', ml: 0 }}
            />
          );
        })}
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }} justifyContent="space-between">
        <Button size="small" onClick={handleSelectAll}>
          {t('labels.all')}
        </Button>
        <Button size="small" onClick={handleClear}>
          {t('buttons.clear')}
        </Button>
      </Stack>
    </Box>
  );
});

CheckboxSetFilter.displayName = 'CheckboxSetFilter';

export default CheckboxSetFilter;
