import React, { forwardRef, useImperativeHandle } from 'react';
import { Box, Stack, Alert, Typography, Divider, RadioGroup, FormControlLabel, Radio, IconButton, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import DeleteIcon from '@mui/icons-material/Delete';
import YearTabs from '../../../components/navigation/YearTabs';
import FormattedNumberField from '../../../components/inputs/FormattedNumberField';
import api from '../../../api';
import { useFreezeState } from '../../../hooks/useFreezeState';
import { useLocale } from '../../../i18n/useLocale';

export type BudgetEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string; // capex item id
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

function monthLabel(m: number, locale: string) {
  return new Date(2000, m - 1, 1).toLocaleString(locale, { month: 'short' });
}

export default forwardRef<BudgetEditorHandle, Props>(function BudgetEditor({ id, year, availableYears, onYearChange, onDirtyChange }, ref) {
  const { t } = useTranslation(['ops', 'common']);
  const locale = useLocale();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [version, setVersion] = React.useState<Version | null>(null);
  const [mode, setMode] = React.useState<'flat' | 'manual'>('flat');
  const [notes, setNotes] = React.useState<string>('');

  // Track exclusions (deleted/locked cells) during this session
  const [lockedCells, setLockedCells] = React.useState<Set<string>>(new Set());
  const cellKey = React.useCallback((idx: number, key: keyof AmountRow) => `${idx}:${key}`, []);

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

  const { data: freezeData, isLoading: freezeLoading } = useFreezeState(year);
  const freezeSummary = freezeData?.summary?.scopes.capex;
  const budgetFrozen = freezeSummary?.budget?.frozen ?? false;
  const revisionFrozen = freezeSummary?.revision?.frozen ?? false;
  const actualFrozen = freezeSummary?.actual?.frozen ?? false;
  const landingFrozen = freezeSummary?.landing?.frozen ?? false;

  const hasAnyAmounts = React.useMemo(() => {
    if (mode === 'flat') {
      const v = Number(flatBudget || 0); return v > 0;
    }
    return months.some((m) => Number(m.planned || 0) > 0);
  }, [mode, flatBudget, months]);

  const saveEnabled = hasAnyAmounts || notes.trim().length > 0 || !!version;

  const ensureVersion = React.useCallback(async (): Promise<Version> => {
    const res = await api.get<Version[]>(`/capex-items/${id}/versions`);
    const byYear = (res.data || []).find((v: any) => Number((v as any).budget_year) === year);
    if (byYear) return byYear as Version;
    const version_name = `Y${year}`;
    const createBody = { version_name, budget_year: year, as_of_date: `${year}-01-01`, input_grain: mode === 'flat' ? 'annual' : 'monthly', notes: null };
    const created = await api.post<Version>(`/capex-items/${id}/versions`, createBody);
    return created.data as Version;
  }, [id, year, mode]);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Version[]>(`/capex-items/${id}/versions`);
      const ver = (res.data || []).find((vv: any) => Number((vv as any).budget_year) === year) as Version | undefined;
      if (ver) {
        setVersion(ver);
        setMode(ver.input_grain === 'annual' ? 'flat' : 'manual');
        setNotes(((ver as any).notes ?? '') as string);
        const amt = await api.get<YearAmountsResponse>(`/capex-versions/${ver.id}/amounts`, { params: { year } });
        const rows = (amt.data?.items || []) as AmountRow[];
        if (rows.length > 0) setMonths(rows);
        const totals = amt.data?.totals || { planned: 0, actual: 0, expected_landing: 0, committed: 0, forecast: 0 };
        setFlatBudget(totals.planned || '');
        setFlatFollowUp(totals.actual || '');
        setFlatLanding(totals.expected_landing || '');
        setFlatRevision(totals.committed || '');
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
      setLockedCells(new Set());
      onDirtyChange?.(false);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('capex.budget.failedToLoad')));
    } finally { setLoading(false); }
  }, [id, year, onDirtyChange]);

  React.useEffect(() => { void load(); }, [load]);

  const handleFlatChange = (setter: (v: number | '') => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e?.target?.value;
    const rawStr = typeof rawValue === 'number' ? String(rawValue) : rawValue ?? '';
    const raw = rawStr.replace(/\s/g, '');
    if (raw === '') { setter(''); onDirtyChange?.(true); return; }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setter(n);
    onDirtyChange?.(true);
  };

  const handleMonthChange = (idx: number, key: keyof AmountRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e?.target?.value;
    const rawStr = typeof rawValue === 'number' ? String(rawValue) : rawValue ?? '';
    const raw = rawStr.replace(/\s/g, '');
    const n = raw === '' ? '' : Number(raw);
    setMonths(prev => {
      const next = prev.map((m) => ({ ...m }));
      (next[idx] as any)[key] = n;
      return next;
    });
    onDirtyChange?.(true);
  };

  const handleDeleteAndRedistribute = (idx: number, key: keyof AmountRow) => () => {
    setLockedCells((prev) => new Set(prev).add(cellKey(idx, key)));
    setMonths(prev => {
      const next = prev.map(m => ({ ...m }));
      const oldVal = Number((next[idx] as any)[key] || 0);
      (next[idx] as any)[key] = 0;
      if (!Number.isFinite(oldVal) || oldVal === 0) return next;
      const recipientsIdx: number[] = [];
      for (let i = 0; i < next.length; i++) {
        if (i === idx) continue;
        if (lockedCells.has(cellKey(i, key))) continue;
        recipientsIdx.push(i);
      }
      const recipients = recipientsIdx.length;
      if (recipients > 0) {
        const inc = oldVal / recipients;
        for (const i of recipientsIdx) {
          (next[i] as any)[key] = Number((next[i] as any)[key] || 0) + inc;
        }
      }
      return next;
    });
    onDirtyChange?.(true);
  };

  useImperativeHandle(ref, () => ({
    isDirty: () => true, // conservatively assume dirty handled via onDirtyChange
    save: async () => {
      setSaving(true); setError(null);
      try {
        const v = version ?? (await ensureVersion());
        setVersion(v);

        const desiredGrain = mode === 'flat' ? 'annual' : 'monthly';
        await api.patch(`/capex-items/${id}/versions`, { id: v.id, input_grain: desiredGrain, notes: notes ?? null });

        if (mode === 'flat') {
          const totals: any = {};
          if (!budgetFrozen) totals.planned = Number(flatBudget || 0);
          if (!actualFrozen) totals.actual = Number(flatFollowUp || 0);
          if (!landingFrozen) totals.expected_landing = Number(flatLanding || 0);
          if (!revisionFrozen) totals.committed = Number(flatRevision || 0);
          await api.post(`/capex-versions/${v.id}/amounts/bulk-upsert`, { kind: 'annual', year, totals });
        } else {
          const monthsPayload = months.map((m) => ({
            period: m.period,
            ...(budgetFrozen ? {} : { planned: Number(m.planned || 0) }),
            ...(actualFrozen ? {} : { actual: Number(m.actual || 0) }),
            ...(landingFrozen ? {} : { expected_landing: Number(m.expected_landing || 0) }),
            ...(revisionFrozen ? {} : { committed: Number(m.committed || 0) }),
            forecast: Number((m as any).forecast || 0),
          }));
          await api.post(`/capex-versions/${v.id}/amounts/bulk-upsert`, { kind: 'monthly', year, months: monthsPayload });
        }
        onDirtyChange?.(false);
      } catch (e: any) {
        setError(getApiErrorMessage(e, t, t('capex.budget.failedToSave')));
        throw e;
      } finally { setSaving(false); }
    },
    reset: () => { void load(); },
  }), [version, id, year, mode, notes, months, flatBudget, flatFollowUp, flatLanding, flatRevision, budgetFrozen, revisionFrozen, actualFrozen, landingFrozen, ensureVersion, load, onDirtyChange]);

  const YTabs = (
    <YearTabs
      currentYear={year}
      availableYears={availableYears}
      onYearChange={onYearChange}
    />
  );

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('capex.budget.year')}</Typography>
        {YTabs}
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('capex.budget.inputMode')}</Typography>
        <RadioGroup row value={mode} onChange={(e) => { setMode(e.target.value as any); onDirtyChange?.(true); }}>
          <FormControlLabel value="flat" control={<Radio />} label={t('capex.budget.flatTotals')} />
          <FormControlLabel value="manual" control={<Radio />} label={t('capex.budget.manualByMonth')} />
        </RadioGroup>
      </Box>

      {mode === 'flat' ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormattedNumberField label={`${t('capex.budget.budgetLabel')}${budgetFrozen ? ` – ${t('capex.budget.frozen')}` : ''}`} value={flatBudget} onChange={handleFlatChange(setFlatBudget)} fullWidth disabled={budgetFrozen} InputProps={budgetFrozen ? { readOnly: true } : undefined} />
          <FormattedNumberField label={`${t('capex.budget.revisionLabel')}${revisionFrozen ? ` – ${t('capex.budget.frozen')}` : ''}`} value={flatRevision} onChange={handleFlatChange(setFlatRevision)} fullWidth disabled={revisionFrozen} InputProps={revisionFrozen ? { readOnly: true } : undefined} />
          <FormattedNumberField label={`${t('capex.budget.followUpLabel')}${actualFrozen ? ` – ${t('capex.budget.frozen')}` : ''}`} value={flatFollowUp} onChange={handleFlatChange(setFlatFollowUp)} fullWidth disabled={actualFrozen} InputProps={actualFrozen ? { readOnly: true } : undefined} />
          <FormattedNumberField label={`${t('capex.budget.landingLabel')}${landingFrozen ? ` – ${t('capex.budget.frozen')}` : ''}`} value={flatLanding} onChange={handleFlatChange(setFlatLanding)} fullWidth disabled={landingFrozen} InputProps={landingFrozen ? { readOnly: true } : undefined} />
        </Stack>
      ) : (
        <Box>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={1}>
            {months.map((m, i) => (
              <Stack key={m.period} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                <Box sx={{ width: 72 }}>{monthLabel(i + 1, locale)}</Box>
                <FormattedNumberField label={`${t('capex.budget.budgetLabel')}${budgetFrozen ? ` – ${t('capex.budget.frozen')}` : ''}`} value={m.planned} onChange={handleMonthChange(i, 'planned')} disabled={budgetFrozen} InputProps={budgetFrozen ? { readOnly: true } : undefined} />
                <FormattedNumberField label={`${t('capex.budget.revisionLabel')}${revisionFrozen ? ` – ${t('capex.budget.frozen')}` : ''}`} value={m.committed} onChange={handleMonthChange(i, 'committed')} disabled={revisionFrozen} InputProps={revisionFrozen ? { readOnly: true } : undefined} />
                <FormattedNumberField label={`${t('capex.budget.followUpLabel')}${actualFrozen ? ` – ${t('capex.budget.frozen')}` : ''}`} value={m.actual} onChange={handleMonthChange(i, 'actual')} disabled={actualFrozen} InputProps={actualFrozen ? { readOnly: true } : undefined} />
                <FormattedNumberField label={`${t('capex.budget.landingLabel')}${landingFrozen ? ` – ${t('capex.budget.frozen')}` : ''}`} value={m.expected_landing} onChange={handleMonthChange(i, 'expected_landing')} disabled={landingFrozen} InputProps={landingFrozen ? { readOnly: true } : undefined} />
                <IconButton size="small" onClick={handleDeleteAndRedistribute(i, 'planned')} title={t('capex.budget.deleteRedistribute')} disabled={budgetFrozen}><DeleteIcon fontSize="small" /></IconButton>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      <TextField label="Notes" value={notes} onChange={(e) => { setNotes(e.target.value); onDirtyChange?.(true); }} fullWidth multiline minRows={2} InputLabelProps={{ shrink: true }} />
      <Typography variant="caption" color="text.secondary">{saveEnabled ? '' : t('capex.budget.enterBudgetHint')}</Typography>
    </Stack>
  );
});
