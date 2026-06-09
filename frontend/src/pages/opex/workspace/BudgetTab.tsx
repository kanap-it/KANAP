import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Box, Button, IconButton, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import { useLocale } from '../../../i18n/useLocale';
import { formatAmount } from '../../../i18n/formatters';
import { useFreezeState } from '../../../hooks/useFreezeState';
import useAutosave from '../../../hooks/useAutosave';
import YearTabs from '../../../components/navigation/YearTabs';
import FormattedNumberField from '../../../components/inputs/FormattedNumberField';
import BudgetTrendChart from './BudgetTrendChart';

export type BudgetTabHandle = {
  flush: () => Promise<boolean>;
  isDirty: () => boolean;
};

type Props = {
  id: string; // resolved spend item UUID
  year: number;
  currency?: string;
  availableYears?: number[];
  onYearChange: (y: number) => void;
};

type Version = { id: string; input_grain: 'annual' | 'quarterly' | 'monthly'; budget_year?: number };

type MeasureKey = 'planned' | 'committed' | 'actual' | 'expected_landing';
type AmountCol = MeasureKey | 'forecast';

type AmountRow = Record<AmountCol, number> & { period: string };

type YearAmounts = {
  items: Array<Partial<Record<AmountCol, number | string>> & { period: string }>;
  totals: Record<MeasureKey | 'forecast', number>;
  year: number;
};

const MEASURES: Array<{ key: MeasureKey; labelKey: string; freezeKey: 'budget' | 'revision' | 'actual' | 'landing' }> = [
  { key: 'planned', labelKey: 'operations.budgetColumns.budget', freezeKey: 'budget' },
  { key: 'committed', labelKey: 'operations.budgetColumns.revision', freezeKey: 'revision' },
  { key: 'actual', labelKey: 'operations.budgetColumns.followUp', freezeKey: 'actual' },
  { key: 'expected_landing', labelKey: 'operations.budgetColumns.landing', freezeKey: 'landing' },
];

const ALL_COLS: AmountCol[] = ['planned', 'committed', 'actual', 'expected_landing', 'forecast'];

function monthPeriod(year: number, m: number) { return `${year}-${String(m).padStart(2, '0')}-01`; }
function emptyMonths(year: number): AmountRow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    period: monthPeriod(year, i + 1), planned: 0, committed: 0, actual: 0, expected_landing: 0, forecast: 0,
  }));
}
const QUARTERS = [
  { label: 'Q1', months: [0, 1, 2] },
  { label: 'Q2', months: [3, 4, 5] },
  { label: 'Q3', months: [6, 7, 8] },
  { label: 'Q4', months: [9, 10, 11] },
];

export default forwardRef<BudgetTabHandle, Props>(function BudgetTab({ id, year, currency, availableYears, onYearChange }, ref) {
  const { t } = useTranslation(['ops', 'common']);
  const locale = useLocale();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState<Version | null>(null);
  const [mode, setMode] = React.useState<'flat' | 'monthly'>('flat');
  const [flat, setFlat] = React.useState<Record<MeasureKey, number | ''>>({ planned: '', committed: '', actual: '', expected_landing: '' });
  const [months, setMonths] = React.useState<AmountRow[]>(() => emptyMonths(year));

  // Spread-from-annual helper state.
  const [spreadMeasure, setSpreadMeasure] = React.useState<MeasureKey>('planned');
  const [spreadAmount, setSpreadAmount] = React.useState<number | ''>('');
  const [spreadProfile, setSpreadProfile] = React.useState<'flat' | '4-4-5'>('flat');

  const { data: freezeData } = useFreezeState(year);
  const frozen = React.useMemo(() => {
    const s = freezeData?.summary?.scopes.opex;
    return {
      budget: s?.budget?.frozen ?? false,
      revision: s?.revision?.frozen ?? false,
      actual: s?.actual?.frozen ?? false,
      landing: s?.landing?.frozen ?? false,
    };
  }, [freezeData]);
  const anyFrozen = frozen.budget || frozen.revision || frozen.actual || frozen.landing;

  const autosave = useAutosave({ onError: (e) => setError(getApiErrorMessage(e, t, t('opex.budget.failedToSave'))) });

  // Latest-value refs so the debounced persist never reads stale state.
  const modeRef = React.useRef(mode); modeRef.current = mode;
  const flatRef = React.useRef(flat); flatRef.current = flat;
  const monthsRef = React.useRef(months); monthsRef.current = months;
  const versionRef = React.useRef(version); versionRef.current = version;
  const frozenRef = React.useRef(frozen); frozenRef.current = frozen;

  const ensureVersion = React.useCallback(async (): Promise<Version> => {
    if (versionRef.current) return versionRef.current;
    const res = await api.get<Version[]>(`/spend-items/${id}/versions`);
    const existing = (res.data || []).find((v) => Number(v.budget_year) === year);
    if (existing) { versionRef.current = existing; setVersion(existing); return existing; }
    const created = await api.post<Version>(`/spend-items/${id}/versions`, {
      version_name: `Y${year}`, budget_year: year, as_of_date: `${year}-01-01`,
      input_grain: modeRef.current === 'flat' ? 'annual' : 'monthly', notes: null,
    });
    // Update the ref imperatively too: callers (e.g. onModeChange) read versionRef
    // right after a flush that may have just created the version, before re-render.
    versionRef.current = created.data;
    setVersion(created.data);
    return created.data;
  }, [id, year]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Version[]>(`/spend-items/${id}/versions`);
      const v = (res.data || []).find((vv) => Number(vv.budget_year) === year);
      if (!v) {
        setVersion(null);
        setMode('flat');
        setFlat({ planned: '', committed: '', actual: '', expected_landing: '' });
        setMonths(emptyMonths(year));
        return;
      }
      setVersion(v);
      setMode(v.input_grain === 'annual' ? 'flat' : 'monthly');
      const amt = await api.get<YearAmounts>(`/spend-versions/${v.id}/amounts`, { params: { year } });
      const totals = amt.data?.totals;
      setFlat({
        planned: Number(totals?.planned || 0),
        committed: Number(totals?.committed || 0),
        actual: Number(totals?.actual || 0),
        expected_landing: Number(totals?.expected_landing || 0),
      });
      const byPeriod = new Map((amt.data?.items || []).map((r) => [r.period, r]));
      setMonths(Array.from({ length: 12 }, (_, i) => {
        const p = monthPeriod(year, i + 1);
        const found = byPeriod.get(p);
        const num = (k: AmountCol) => Number((found?.[k] as any) || 0);
        return found
          ? { period: p, planned: num('planned'), committed: num('committed'), actual: num('actual'), expected_landing: num('expected_landing'), forecast: num('forecast') }
          : { period: p, planned: 0, committed: 0, actual: 0, expected_landing: 0, forecast: 0 };
      }));
    } catch (e) {
      setError(getApiErrorMessage(e, t, t('opex.budget.failedToLoad')));
    } finally {
      setLoading(false);
    }
  }, [id, year, t]);

  React.useEffect(() => { void load(); }, [load]);

  // Persist current state (flat or monthly), creating the version on first edit.
  const persist = React.useCallback(async () => {
    const v = await ensureVersion();
    const fr = frozenRef.current;
    const nextGrain = modeRef.current === 'flat' ? 'annual' : 'monthly';
    if (v.input_grain !== nextGrain) {
      await api.patch(`/spend-items/${id}/versions`, { id: v.id, input_grain: nextGrain });
      setVersion((prev) => (prev ? { ...prev, input_grain: nextGrain } : prev));
    }
    if (modeRef.current === 'flat') {
      const f = flatRef.current;
      const totals: Partial<Record<MeasureKey, number>> = {};
      if (!fr.budget) totals.planned = Number(f.planned || 0);
      if (!fr.revision) totals.committed = Number(f.committed || 0);
      if (!fr.actual) totals.actual = Number(f.actual || 0);
      if (!fr.landing) totals.expected_landing = Number(f.expected_landing || 0);
      await api.post(`/spend-versions/${v.id}/amounts/bulk-upsert`, { kind: 'annual', year, totals });
    } else {
      await api.post(`/spend-versions/${v.id}/amounts/bulk-upsert`, {
        kind: 'monthly', year,
        months: monthsRef.current.map((m) => ({
          period: m.period,
          ...(fr.budget ? {} : { planned: Number(m.planned || 0) }),
          ...(fr.revision ? {} : { committed: Number(m.committed || 0) }),
          ...(fr.actual ? {} : { actual: Number(m.actual || 0) }),
          ...(fr.landing ? {} : { expected_landing: Number(m.expected_landing || 0) }),
          forecast: Number(m.forecast || 0),
        })),
      });
    }
  }, [ensureVersion, id, year]);

  const scheduleSave = React.useCallback(() => { autosave.schedule(persist); }, [autosave, persist]);

  // Flush pending edits before switching year so nothing is lost on reload.
  const handleYearChange = React.useCallback(async (y: number) => {
    await autosave.flush();
    onYearChange(y);
  }, [autosave, onYearChange]);

  useImperativeHandle(ref, () => ({
    flush: () => autosave.flush(),
    isDirty: () => autosave.isBusy(),
  }), [autosave]);

  const onFlatChange = (key: MeasureKey, value: number | '') => {
    setFlat((prev) => ({ ...prev, [key]: value }));
    scheduleSave();
  };
  const onMonthChange = (idx: number, key: AmountCol, value: number | '') => {
    setMonths((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [key]: Number(value || 0) }; return next; });
    scheduleSave();
  };
  // Clear every month for a column — convenient when entering a cash-out plan manually
  // (e.g. the whole amount in a single month).
  const clearColumn = (key: AmountCol) => {
    setMonths((prev) => prev.map((m) => ({ ...m, [key]: 0 })));
    scheduleSave();
  };
  const onModeChange = React.useCallback(async (next: 'flat' | 'monthly') => {
    if (next === modeRef.current) return;
    // Persist any pending edits in the current mode first, then switch the grain and
    // resync from the backend so the new view reflects stored data (no stale overwrite).
    await autosave.flush();
    setMode(next);
    const v = versionRef.current;
    if (!v) return; // no version yet — grain persists on first edit
    try {
      await api.patch(`/spend-items/${id}/versions`, { id: v.id, input_grain: next === 'flat' ? 'annual' : 'monthly' });
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, t, t('opex.budget.failedToSave')));
    }
  }, [autosave, id, load, t]);

  const applySpread = async () => {
    const amount = Number(spreadAmount || 0);
    if (!amount) return;
    setError(null);
    try {
      const v = await ensureVersion();
      await api.post(`/spend-versions/${v.id}/amounts/bulk-upsert`, {
        kind: 'annual', year, totals: { [spreadMeasure]: amount }, spread_profile_name: spreadProfile,
      });
      if (v.input_grain !== 'monthly') {
        await api.patch(`/spend-items/${id}/versions`, { id: v.id, input_grain: 'monthly' });
      }
      setMode('monthly');
      setSpreadAmount('');
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, t, t('opex.budget.failedToSave')));
    }
  };

  // Totals: flat values in flat mode, live column sums in monthly mode.
  const totals = React.useMemo<Record<AmountCol, number>>(() => {
    if (mode === 'flat') {
      return {
        planned: Number(flat.planned || 0), committed: Number(flat.committed || 0),
        actual: Number(flat.actual || 0), expected_landing: Number(flat.expected_landing || 0), forecast: 0,
      };
    }
    return months.reduce((acc, m) => {
      ALL_COLS.forEach((c) => { acc[c] += Number(m[c] || 0); });
      return acc;
    }, { planned: 0, committed: 0, actual: 0, expected_landing: 0, forecast: 0 } as Record<AmountCol, number>);
  }, [mode, flat, months]);

  const fmt = (n: number) => formatAmount(n);

  const labelFor = (m: typeof MEASURES[number]) => t(m.labelKey);
  const isFrozen = (m: typeof MEASURES[number]) => frozen[m.freezeKey];

  const savingHint = autosave.status === 'saving' || autosave.status === 'pending'
    ? t('common:status.saving', 'Saving…')
    : autosave.status === 'saved' ? t('common:status.saved', 'Saved') : null;

  const numCellSx = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'kanap.text.primary', px: 1, py: 0 } as const;
  const headCellSx = { textAlign: 'right', fontSize: 11, fontWeight: 500, color: 'kanap.text.secondary', px: 1, py: 0.75, whiteSpace: 'nowrap' } as const;

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      {!!error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Saving hint is absolutely positioned so it never reflows the year selector / table. */}
      <Box sx={{ position: 'relative' }}>
        <YearTabs currentYear={year} availableYears={availableYears} onYearChange={(y) => void handleYearChange(y)} disabled={loading} />
        {savingHint && (
          <Typography sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'kanap.text.tertiary', pointerEvents: 'none' }}>
            {savingHint}
          </Typography>
        )}
      </Box>

      <Tabs value={mode} onChange={(_, v) => void onModeChange(v)}>
        <Tab value="flat" label={t('opex.budget.flat')} />
        <Tab value="monthly" label={t('opex.budget.monthly')} />
      </Tabs>

      {mode === 'flat' ? (
        <Stack spacing={5}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2.5 }}>
            {MEASURES.map((m) => (
              <Box key={m.key} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {labelFor(m)}
                  {isFrozen(m) && <LockOutlinedIcon sx={{ fontSize: 12 }} />}
                </Typography>
                <FormattedNumberField
                  value={flat[m.key]}
                  onChange={(e) => onFlatChange(m.key, (e.target.value as unknown as number | ''))}
                  variant="standard"
                  disabled={loading || isFrozen(m)}
                  InputProps={{ disableUnderline: true, readOnly: isFrozen(m) }}
                  sx={{ '& input': { fontSize: 15, fontWeight: 500, py: '4px' } }}
                />
              </Box>
            ))}
          </Box>
          <BudgetTrendChart id={id} currency={currency} />
        </Stack>
      ) : (
        <Stack spacing={2}>
          {/* Spread-from-annual helper */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1.5, bgcolor: 'kanap.bg.drawer', border: '1px solid', borderColor: 'kanap.border.soft', borderRadius: '8px', p: 1.5 }}>
            <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary', alignSelf: 'center' }}>{t('opex.budget.spreadHelper')}</Typography>
            <TextField select size="small" variant="standard" value={spreadMeasure} onChange={(e) => setSpreadMeasure(e.target.value as MeasureKey)} InputProps={{ disableUnderline: true }} sx={{ minWidth: 120 }}>
              {MEASURES.map((m) => <MenuItem key={m.key} value={m.key}>{labelFor(m)}</MenuItem>)}
            </TextField>
            <FormattedNumberField value={spreadAmount} onChange={(e) => setSpreadAmount(e.target.value as unknown as number | '')} variant="standard" size="small" placeholder="e.g., 120000" InputProps={{ disableUnderline: true }} sx={{ width: 120 }} />
            <TextField select size="small" variant="standard" value={spreadProfile} onChange={(e) => setSpreadProfile(e.target.value as 'flat' | '4-4-5')} InputProps={{ disableUnderline: true }} sx={{ minWidth: 90 }}>
              <MenuItem value="flat">{t('opex.budget.profileFlat')}</MenuItem>
              <MenuItem value="4-4-5">{t('opex.budget.profile445')}</MenuItem>
            </TextField>
            <Button size="small" variant="contained" onClick={() => void applySpread()} disabled={!spreadAmount}>{t('opex.budget.spreadApply')}</Button>
          </Box>

          {/* Dense monthly table */}
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { borderBottom: '1px solid', borderColor: 'kanap.border.soft' } }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ ...headCellSx, textAlign: 'left' }}>{t('opex.budget.month')}</Box>
                {MEASURES.map((m) => (
                  <Box component="th" key={m.key} sx={headCellSx}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, justifyContent: 'flex-end' }}>
                      {labelFor(m)}
                      {isFrozen(m) ? (
                        <LockOutlinedIcon sx={{ fontSize: 12, color: 'kanap.text.tertiary' }} />
                      ) : (
                        <Tooltip title={t('opex.budget.clearColumn')}>
                          <IconButton size="small" aria-label={t('opex.budget.clearColumn')} onClick={() => clearColumn(m.key)} sx={{ p: '2px' }}>
                            <BackspaceOutlinedIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                ))}
                <Box component="th" sx={headCellSx}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, justifyContent: 'flex-end' }}>
                    {t('opex.budget.forecast')}
                    <Tooltip title={t('opex.budget.clearColumn')}>
                      <IconButton size="small" aria-label={t('opex.budget.clearColumn')} onClick={() => clearColumn('forecast')} sx={{ p: '2px' }}>
                        <BackspaceOutlinedIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box component="tbody">
              {QUARTERS.map((q) => {
                const qTotals = ALL_COLS.reduce((acc, c) => {
                  acc[c] = q.months.reduce((s, mi) => s + Number(months[mi]?.[c] || 0), 0);
                  return acc;
                }, {} as Record<AmountCol, number>);
                return (
                  <React.Fragment key={q.label}>
                    {q.months.map((mi) => (
                      <Box component="tr" key={mi} sx={{ '&:hover': { bgcolor: 'kanap.bg.hover' } }}>
                        <Box component="td" sx={{ fontSize: 13, color: 'kanap.text.primary', px: 1, py: 0.25 }}>
                          {new Date(year, mi, 1).toLocaleString(locale, { month: 'short' })}
                        </Box>
                        {([...MEASURES.map((m) => ({ col: m.key as AmountCol, fr: frozen[m.freezeKey] })), { col: 'forecast' as AmountCol, fr: false }]).map(({ col, fr }) => (
                          <Box component="td" key={col} sx={{ px: 0.5, py: 0.25 }}>
                            <FormattedNumberField
                              value={months[mi]?.[col] ?? 0}
                              onChange={(e) => onMonthChange(mi, col, e.target.value as unknown as number | '')}
                              variant="standard" size="small"
                              disabled={loading || fr}
                              InputProps={{ disableUnderline: true, readOnly: fr }}
                              inputProps={{ style: { textAlign: 'right', padding: '2px 0' } }}
                            />
                          </Box>
                        ))}
                      </Box>
                    ))}
                    <Box component="tr" sx={{ bgcolor: 'kanap.bg.drawer' }}>
                      <Box component="td" sx={{ fontSize: 11, fontWeight: 500, color: 'kanap.text.tertiary', px: 1, py: 0.5 }}>{q.label}</Box>
                      {ALL_COLS.map((c) => (
                        <Box component="td" key={c} sx={{ ...numCellSx, fontWeight: 500, color: 'kanap.text.secondary', py: 0.5 }}>{fmt(qTotals[c])}</Box>
                      ))}
                    </Box>
                  </React.Fragment>
                );
              })}
            </Box>
            <Box component="tfoot">
              <Box component="tr">
                <Box component="td" sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.primary', px: 1, py: 0.75 }}>{t('opex.budget.total')}</Box>
                {ALL_COLS.map((c) => (
                  <Box component="td" key={c} sx={{ ...numCellSx, fontWeight: 500, py: 0.75 }}>{fmt(totals[c])}</Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Stack>
      )}

      {anyFrozen && (
        <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary' }}>{t('opex.budget.someColumnsFrozen')}</Typography>
      )}
    </Stack>
  );
});
