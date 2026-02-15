import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import YearTabs from '../../../components/navigation/YearTabs';
import { useFreezeState } from '../../../hooks/useFreezeState';
import { deepEqual } from '../../../lib/deepEqual';

export type DepartmentDetailsEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type MetricsValues = {
  headcount: number | '';
};

type Props = {
  id: string;
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
};

const DEFAULT_VALUES: MetricsValues = { headcount: 0 };

export default forwardRef<DepartmentDetailsEditorHandle, Props>(function DepartmentDetailsEditor(
  { id, year, availableYears, onYearChange, onDirtyChange, readOnly = false },
  ref,
) {
  const queryClient = useQueryClient();
  const [values, setValues] = React.useState<MetricsValues>({ ...DEFAULT_VALUES });
  const [baseline, setBaseline] = React.useState<MetricsValues>({ ...DEFAULT_VALUES });
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { data: freezeData, isLoading: freezeLoading } = useFreezeState(year);
  const metricsFrozen = freezeData?.summary?.scopes?.departments?.frozen ?? false;
  const fieldsDisabled = readOnly || metricsFrozen || freezeLoading || loading || saving;

  const dirty = useMemo(() => !deepEqual(values, baseline), [values, baseline]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setServerError(null);
      try {
        const res = await api.get(`/department-metrics/${id}`, { params: { year } });
        if (!active) return;
        const data = res.data || null;
        const loaded: MetricsValues = {
          headcount: data?.headcount != null ? Number(data.headcount) : 0,
        };
        setValues(loaded);
        setBaseline({ ...loaded });
        onDirtyChange?.(false);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.response?.data?.message || e?.message || 'Failed to load metrics';
        setServerError(msg);
        const fallback = { headcount: 0 };
        setValues(fallback);
        setBaseline({ ...fallback });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id, year, onDirtyChange]);

  const headcountError = values.headcount === '' || Number(values.headcount) < 0 || !Number.isInteger(Number(values.headcount));

  const handleHeadcountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setValues((prev) => ({ ...prev, headcount: '' }));
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return;
    setValues((prev) => ({ ...prev, headcount: Math.trunc(num) }));
  };

  const save = React.useCallback(async () => {
    if (!dirty || readOnly) return;
    if (metricsFrozen) {
      setServerError('Metrics are frozen for this year. Unfreeze them from Administration to edit.');
      throw new Error('Metrics frozen');
    }
    if (headcountError || values.headcount === '') {
      setServerError('Please fix validation issues before saving.');
      throw new Error('Validation error');
    }
    setSaving(true);
    setServerError(null);
    try {
      await api.patch(`/department-metrics/${id}`, {
        headcount: Number(values.headcount),
      }, { params: { year } });
      setBaseline({ ...values });
      onDirtyChange?.(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments', id] });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to save metrics';
      setServerError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [dirty, readOnly, metricsFrozen, headcountError, values, id, year, onDirtyChange, queryClient]);

  const resetEditor = React.useCallback(() => {
    setValues({ ...baseline });
    setServerError(null);
    onDirtyChange?.(false);
  }, [baseline, onDirtyChange]);

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => dirty,
      save: async () => { await save(); },
      reset: () => { resetEditor(); },
    }),
    [dirty, save, resetEditor],
  );

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Year</Typography>
        <YearTabs
          currentYear={year}
          availableYears={availableYears}
          onYearChange={onYearChange}
          disabled={saving || loading}
        />
      </Box>

      {!!serverError && <Alert severity="error">{serverError}</Alert>}
      {readOnly && (
        <Alert severity="info">
          You need manager access to edit department metrics.
        </Alert>
      )}
      {metricsFrozen && (
        <Alert severity="info">
          Metrics for {year} are frozen. Unfreeze them from Administration to make changes.
        </Alert>
      )}

      <TextField
        label="Headcount"
        required
        type="number"
        value={values.headcount}
        onChange={handleHeadcountChange}
        disabled={fieldsDisabled}
        error={headcountError}
        helperText={headcountError ? 'Enter a non-negative integer' : ''}
        inputProps={{ min: 0, step: 1 }}
        InputLabelProps={{ shrink: true }}
      />

      <Typography variant="caption" color="text.secondary">
        Save applies to the selected year. Switch years to review historical data.
      </Typography>
    </Stack>
  );
});
