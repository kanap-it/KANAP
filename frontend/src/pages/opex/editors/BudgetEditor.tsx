import React, { forwardRef, useImperativeHandle } from 'react';
import { Box, Stack, Alert, Typography, Divider, RadioGroup, FormControlLabel, Radio, IconButton, TextField } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import YearTabs from '../../../components/navigation/YearTabs';
import FormattedNumberField from '../../../components/inputs/FormattedNumberField';
import api from '../../../api';
import { useFreezeState } from '../../../hooks/useFreezeState';

export type BudgetEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string;
  year: number;
  availableYears?: number[];
  onYearChange: (y: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

type Version = {
  id: string;
  input_grain: 'annual' | 'quarterly' | 'monthly';
  budget_year?: number;
};

type AmountRow = {
  period: string; // YYYY-MM-01
  planned?: number | string;
  forecast?: number | string;
  committed?: number | string;
  actual?: number | string;
  expected_landing?: number | string;
};

type YearAmountsResponse = {
  items: AmountRow[];
  totals: {
    planned: number;
    forecast: number;
    committed: number;
    actual: number;
    expected_landing: number;
  };
  year: number;
};

function monthPeriod(year: number, m: number) {
  const mm = String(m).padStart(2, '0');
  return `${year}-${mm}-01`;
}

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'short' });
}

export default forwardRef<BudgetEditorHandle, Props>(function BudgetEditor({ id, year, availableYears, onYearChange, onDirtyChange }, ref) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [version, setVersion] = React.useState<Version | null>(null);
  const [mode, setMode] = React.useState<'flat' | 'manual'>('flat');

  const [flatBudget, setFlatBudget] = React.useState<number | ''>('');
  const [flatFollowUp, setFlatFollowUp] = React.useState<number | ''>('');
  const [flatLanding, setFlatLanding] = React.useState<number | ''>('');
  const [flatRevision, setFlatRevision] = React.useState<number | ''>('');

  const [months, setMonths] = React.useState<Array<AmountRow>>(
    Array.from({ length: 12 }, (_, i) => ({
      period: monthPeriod(year, i + 1),
      planned: 0,
      actual: 0,
      expected_landing: 0,
      committed: 0,
      forecast: 0,
    }))
  );

  const [lockedCells, setLockedCells] = React.useState<Set<string>>(new Set());
  const cellKey = React.useCallback((idx: number, key: keyof AmountRow) => `${idx}:${key}`, []);
  const [notes, setNotes] = React.useState<string>('');

  const { data: freezeData, isLoading: freezeLoading } = useFreezeState(year);
  const freezeSummary = freezeData?.summary?.scopes.opex;
  const budgetFrozen = freezeSummary?.budget?.frozen ?? false;
  const revisionFrozen = freezeSummary?.revision?.frozen ?? false;
  const actualFrozen = freezeSummary?.actual?.frozen ?? false;
  const landingFrozen = freezeSummary?.landing?.frozen ?? false;

  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  React.useEffect(() => { onDirtyChange?.(hasUnsavedChanges); }, [hasUnsavedChanges, onDirtyChange]);

  const budgetPresent = React.useMemo(() => {
    if (mode === 'flat') {
      const v = Number(flatBudget || 0);
      return v > 0;
    }
    return months.some((m) => Number(m.planned || 0) > 0);
  }, [mode, flatBudget, months]);

  const hasAnyAmounts = React.useMemo(() => {
    if (mode === 'flat') {
      const values = [flatBudget, flatRevision, flatFollowUp, flatLanding];
      return values.some((value) => {
        if (value === '' || value === null || value === undefined) return false;
        const n = Number(value);
        return Number.isFinite(n) && n !== 0;
      });
    }
    return months.some((m) =>
      ['planned', 'committed', 'actual', 'expected_landing', 'forecast'].some((key) => {
        const raw = (m as any)[key];
        if (raw === '' || raw === null || raw === undefined) return false;
        const n = Number(raw);
        return Number.isFinite(n) && n !== 0;
      })
    );
  }, [mode, flatBudget, flatRevision, flatFollowUp, flatLanding, months]);

  const saveEnabled = hasAnyAmounts || notes.trim().length > 0 || !!version;

  const ensureVersion = React.useCallback(async (): Promise<Version> => {
    const res = await api.get<Version[]>(`/spend-items/${id}/versions`);
    const byYear = (res.data || []).find((v: any) => Number((v as any).budget_year) === year);
    if (byYear) return byYear as Version;
    const version_name = `Y${year}`;
    const createBody = {
      version_name,
      budget_year: year,
      as_of_date: `${year}-01-01`,
      input_grain: mode === 'flat' ? 'annual' : 'monthly',
      notes: null,
    };
    const created = await api.post<Version>(`/spend-items/${id}/versions`, createBody);
    return created.data as Version;
  }, [id, year, mode]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Version[]>(`/spend-items/${id}/versions`);
      const v = (res.data || []).find((vv: any) => Number((vv as any).budget_year) === year) as Version | undefined;
      if (v) {
        setVersion(v);
        setMode(v.input_grain === 'annual' ? 'flat' : 'manual');
        setNotes(((v as any).notes ?? '') as string);
        const amt = await api.get<YearAmountsResponse>(`/spend-versions/${v.id}/amounts`, { params: { year } });
        const totals = amt.data?.totals || { planned: 0, actual: 0, expected_landing: 0, committed: 0, forecast: 0 };
        setFlatBudget(Number(totals.planned || 0));
        setFlatFollowUp(Number(totals.actual || 0));
        setFlatLanding(Number(totals.expected_landing || 0));
        setFlatRevision(Number(totals.committed || 0));
        const items = amt.data?.items || [];
        if (items.length > 0) {
          const byPeriod = new Map(items.map((r) => [r.period, r]));
          setMonths(
            Array.from({ length: 12 }, (_, i) => {
              const p = monthPeriod(year, i + 1);
              const found = byPeriod.get(p);
              return found
                ? {
                    period: p,
                    planned: Number(found.planned || 0),
                    actual: Number(found.actual || 0),
                    expected_landing: Number(found.expected_landing || 0),
                    committed: Number(found.committed || 0),
                    forecast: Number(found.forecast || 0),
                  }
                : { period: p, planned: 0, actual: 0, expected_landing: 0, committed: 0, forecast: 0 };
            })
          );
        } else {
          setMonths(
            Array.from({ length: 12 }, (_, i) => ({
              period: monthPeriod(year, i + 1),
              planned: 0,
              actual: 0,
              expected_landing: 0,
              committed: 0,
              forecast: 0,
            }))
          );
        }
      } else {
        setVersion(null);
        setMode('flat');
        setNotes('');
        setFlatBudget('');
        setFlatFollowUp('');
        setFlatLanding('');
        setFlatRevision('');
        setMonths(
          Array.from({ length: 12 }, (_, i) => ({
            period: monthPeriod(year, i + 1),
            planned: 0,
            actual: 0,
            expected_landing: 0,
            committed: 0,
            forecast: 0,
          }))
        );
      }
      setHasUnsavedChanges(false);
      setLockedCells(new Set());
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load version data');
    } finally {
      setLoading(false);
    }
  }, [id, year]);

  React.useEffect(() => { void load(); }, [load]);

  const handleFlatChange = (setter: (v: number | '') => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e?.target?.value;
    const val = typeof rawValue === 'number' ? String(rawValue) : rawValue ?? '';
    setHasUnsavedChanges(true);
    if (val === '') return setter('');
    const n = Number(val);
    setter(Number.isFinite(n) ? n : 0);
  };

  const handleMonthChange = (idx: number, key: keyof AmountRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e?.target?.value;
    const val = typeof rawValue === 'number' ? String(rawValue) : rawValue ?? '';
    setHasUnsavedChanges(true);
    setLockedCells(prev => new Set(prev).add(cellKey(idx, key)));
    setMonths((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      const n = val === '' ? 0 : Number(val);
      (row as any)[key] = Number.isFinite(n) ? n : 0;
      next[idx] = row;
      return next;
    });
  };

  const clearMonthCell = (idx: number, key: keyof AmountRow) => {
    setHasUnsavedChanges(true);
    setLockedCells(prev => new Set([...prev].filter(k => k !== cellKey(idx, key))));
    setMonths(prev => {
      const next = [...prev];
      (next[idx] as any)[key] = 0;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const v = version ?? (await ensureVersion());
      setVersion(v);
      const nextGrain = mode === 'flat' ? 'annual' : 'monthly';
      await api.patch(`/spend-items/${id}/versions`, { id: v.id, input_grain: nextGrain, notes: notes ?? null });
      if (mode === 'flat') {
        const totals: any = {};
        if (!budgetFrozen) totals.planned = Number(flatBudget || 0);
        if (!actualFrozen) totals.actual = Number(flatFollowUp || 0);
        if (!landingFrozen) totals.expected_landing = Number(flatLanding || 0);
        if (!revisionFrozen) totals.committed = Number(flatRevision || 0);
        await api.post(`/spend-versions/${v.id}/amounts/bulk-upsert`, { kind: 'annual', year, totals });
      } else {
        await api.post(`/spend-versions/${v.id}/amounts/bulk-upsert`, {
          kind: 'monthly',
          year,
          months: months.map((m) => ({
            period: m.period,
            ...(budgetFrozen ? {} : { planned: Number(m.planned || 0) }),
            ...(actualFrozen ? {} : { actual: Number(m.actual || 0) }),
            ...(landingFrozen ? {} : { expected_landing: Number(m.expected_landing || 0) }),
            ...(revisionFrozen ? {} : { committed: Number(m.committed || 0) }),
            forecast: Number(m.forecast || 0),
          })),
        });
      }
      setHasUnsavedChanges(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save version');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    isDirty: () => hasUnsavedChanges,
    save,
    reset: () => { void load(); },
  }), [hasUnsavedChanges, save, load]);

  const onYearChangeGuard = (newYear: number) => {
    if (newYear === year) return;
    if (hasUnsavedChanges) {
      const proceed = window.confirm('You have unsaved changes. Save before switching years?');
      if (proceed) {
        void save().then(() => onYearChange(newYear)).catch(() => {});
        return;
      }
    }
    onYearChange(newYear);
  };

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      <Typography variant="subtitle2">Budget</Typography>
      <YearTabs currentYear={year} availableYears={availableYears} onYearChange={onYearChangeGuard} disabled={saving || loading} />
      <Divider />
      <Stack direction="row" spacing={3} alignItems="center">
        <Typography variant="subtitle2">Mode</Typography>
        <RadioGroup
          row
          value={mode}
          onChange={(e) => {
            setHasUnsavedChanges(true);
            setMode((e.target as HTMLInputElement).value as 'flat' | 'manual');
          }}
        >
          <FormControlLabel value="flat" control={<Radio />} label="Flat (annual totals)" />
          <FormControlLabel value="manual" control={<Radio />} label="Manual (monthly)" />
        </RadioGroup>
      </Stack>
      <Divider />
      {mode === 'flat' ? (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Annual totals ({year})</Typography>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            <FormattedNumberField label={`Budget (planned)${budgetFrozen ? ' – frozen' : ''}`} value={flatBudget} onChange={handleFlatChange(setFlatBudget)} disabled={budgetFrozen || loading || saving} InputProps={budgetFrozen ? { readOnly: true } : undefined} />
            <FormattedNumberField label={`Revision (committed)${revisionFrozen ? ' – frozen' : ''}`} value={flatRevision} onChange={handleFlatChange(setFlatRevision)} disabled={revisionFrozen || loading || saving} InputProps={revisionFrozen ? { readOnly: true } : undefined} />
            <FormattedNumberField label={`Follow-up (actual)${actualFrozen ? ' – frozen' : ''}`} value={flatFollowUp} onChange={handleFlatChange(setFlatFollowUp)} disabled={actualFrozen || loading || saving} InputProps={actualFrozen ? { readOnly: true } : undefined} />
            <FormattedNumberField label={`Landing (expected_landing)${landingFrozen ? ' – frozen' : ''}`} value={flatLanding} onChange={handleFlatChange(setFlatLanding)} disabled={landingFrozen || loading || saving} InputProps={landingFrozen ? { readOnly: true } : undefined} />
          </Stack>
        </Box>
      ) : (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Monthly entry ({year})</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))', gap: 1, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Month</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Budget</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Revision</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Follow-up</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Landing</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8 }}>Forecast</Typography>
            {months.map((row, idx) => (
              <React.Fragment key={row.period}>
                <Typography variant="body2">{monthLabel(idx + 1)}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormattedNumberField value={row.planned ?? 0} onChange={handleMonthChange(idx, 'planned')} size="small" disabled={budgetFrozen || loading || saving} InputProps={budgetFrozen ? { readOnly: true } : undefined} />
                  <IconButton aria-label="Clear" size="small" onClick={() => clearMonthCell(idx, 'planned')} disabled={budgetFrozen || loading || saving}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormattedNumberField value={row.committed ?? 0} onChange={handleMonthChange(idx, 'committed')} size="small" disabled={revisionFrozen || loading || saving} InputProps={revisionFrozen ? { readOnly: true } : undefined} />
                  <IconButton aria-label="Clear" size="small" onClick={() => clearMonthCell(idx, 'committed')} disabled={revisionFrozen || loading || saving}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormattedNumberField value={row.actual ?? 0} onChange={handleMonthChange(idx, 'actual')} size="small" disabled={actualFrozen || loading || saving} InputProps={actualFrozen ? { readOnly: true } : undefined} />
                  <IconButton aria-label="Clear" size="small" onClick={() => clearMonthCell(idx, 'actual')} disabled={actualFrozen || loading || saving}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormattedNumberField value={row.expected_landing ?? 0} onChange={handleMonthChange(idx, 'expected_landing')} size="small" disabled={landingFrozen || loading || saving} InputProps={landingFrozen ? { readOnly: true } : undefined} />
                  <IconButton aria-label="Clear" size="small" onClick={() => clearMonthCell(idx, 'expected_landing')} disabled={landingFrozen || loading || saving}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormattedNumberField value={row.forecast ?? 0} onChange={handleMonthChange(idx, 'forecast')} size="small" disabled={loading || saving} />
                  <IconButton aria-label="Clear" size="small" onClick={() => clearMonthCell(idx, 'forecast')} disabled={loading || saving}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </React.Fragment>
            ))}
          </Box>
        </Box>
      )}
      <Divider />
      <TextField label="Notes" value={notes} onChange={(e) => { setNotes(e.target.value); setHasUnsavedChanges(true); }} fullWidth multiline minRows={2} disabled={loading || saving} InputLabelProps={{ shrink: true }} />
      <Typography variant="caption" color="text.secondary">
        {freezeLoading ? 'Checking freeze state…' : (budgetFrozen || revisionFrozen || actualFrozen || landingFrozen) ? 'Some columns are frozen and read-only.' : 'All columns are editable.'}
      </Typography>
    </Stack>
  );
});
