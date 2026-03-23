import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import YearTabs from '../../../components/navigation/YearTabs';
import { useFreezeState } from '../../../hooks/useFreezeState';
import { deepEqual } from '../../../lib/deepEqual';

export type CompanyDetailsEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type MetricsValues = {
  headcount: number | '';
  it_users: number | '';
  turnover: number | '';
};

type Props = {
  id: string;
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
};

const DEFAULT_VALUES: MetricsValues = { headcount: 0, it_users: 0, turnover: 0 };

export default forwardRef<CompanyDetailsEditorHandle, Props>(function CompanyDetailsEditor(
  { id, year, availableYears, onYearChange, onDirtyChange, readOnly = false },
  ref,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['master-data', 'common']);
  const [values, setValues] = React.useState<MetricsValues>({ ...DEFAULT_VALUES });
  const [baseline, setBaseline] = React.useState<MetricsValues>({ ...DEFAULT_VALUES });
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { data: freezeData, isLoading: freezeLoading } = useFreezeState(year);
  const metricsFrozen = freezeData?.summary?.scopes?.companies?.frozen ?? false;
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
        const res = await api.get(`/company-metrics/${id}`, { params: { year } });
        if (!active) return;
        const data = res.data || null;
        const loaded: MetricsValues = {
          headcount: data?.headcount != null ? Number(data.headcount) : 0,
          it_users: data?.it_users != null ? Number(data.it_users) : 0,
          turnover: data?.turnover != null ? Number(data.turnover) : 0,
        };
        setValues(loaded);
        setBaseline({ ...loaded });
        onDirtyChange?.(false);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToLoadMetrics');
        setServerError(msg);
        const fallback = { headcount: 0, it_users: 0, turnover: 0 };
        setValues(fallback);
        setBaseline({ ...fallback });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id, year, onDirtyChange]);

  const headcountError = values.headcount === '' || Number(values.headcount) < 0 || !Number.isInteger(Number(values.headcount));
  const itUsersError = values.it_users !== '' && (Number(values.it_users) < 0 || !Number.isInteger(Number(values.it_users)));
  const turnoverError = values.turnover !== '' && (() => {
    const tv = Number(values.turnover);
    if (!Number.isFinite(tv) || tv < 0) return true;
    const decimals = (String(values.turnover).split('.')[1] || '').length;
    return decimals > 3;
  })();

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

  const handleItUsersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setValues((prev) => ({ ...prev, it_users: '' }));
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return;
    setValues((prev) => ({ ...prev, it_users: Math.trunc(num) }));
  };

  const handleTurnoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setValues((prev) => ({ ...prev, turnover: '' }));
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return;
    setValues((prev) => ({ ...prev, turnover: Number(num.toFixed(3)) }));
  };

  const save = React.useCallback(async () => {
    if (!dirty || readOnly) return;
    if (metricsFrozen) {
      setServerError(t('shared.messages.metricsFrozenEdit'));
      throw new Error('Metrics frozen');
    }
    if (headcountError || itUsersError || turnoverError || values.headcount === '') {
      setServerError(t('shared.messages.fixValidationIssues'));
      throw new Error('Validation error');
    }
    setSaving(true);
    setServerError(null);
    try {
      await api.patch(`/company-metrics/${id}`, {
        headcount: Number(values.headcount),
        it_users: values.it_users === '' ? null : Number(values.it_users),
        turnover: values.turnover === '' ? null : Number(values.turnover),
      }, { params: { year } });
      setBaseline({ ...values });
      onDirtyChange?.(false);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToSaveMetrics');
      setServerError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [dirty, readOnly, metricsFrozen, headcountError, itUsersError, turnoverError, values, id, year, onDirtyChange, queryClient]);

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
          {t('shared.messages.readOnlyAccess', { entity: t('companies.entity') + ' metrics' })}
        </Alert>
      )}
      {metricsFrozen && (
        <Alert severity="info">
          {t('shared.messages.metricsFrozen', { year })}
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
        helperText={headcountError ? t('shared.validation.nonNegativeInteger') : ''}
        inputProps={{ min: 0, step: 1 }}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="IT Users"
        type="number"
        value={values.it_users}
        onChange={handleItUsersChange}
        disabled={fieldsDisabled}
        error={itUsersError}
        helperText={itUsersError ? t('shared.validation.nonNegativeInteger') : ''}
        inputProps={{ min: 0, step: 1 }}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="Turnover (M€)"
        type="number"
        value={values.turnover}
        onChange={handleTurnoverChange}
        disabled={fieldsDisabled}
        error={turnoverError}
        helperText={turnoverError ? t('shared.validation.max3Decimals') : ''}
        inputProps={{ min: 0, step: 0.001 }}
        InputLabelProps={{ shrink: true }}
      />

      <Typography variant="caption" color="text.secondary">
        {t('shared.messages.metricsYearHint')}
      </Typography>
    </Stack>
  );
});
