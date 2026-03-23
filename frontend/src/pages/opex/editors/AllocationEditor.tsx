import React, { forwardRef, useImperativeHandle } from 'react';
import { Stack, Alert, Typography, Divider, Box, TextField, IconButton, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import YearTabs from '../../../components/navigation/YearTabs';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import CompanySelect from '../../../components/fields/CompanySelect';
import DepartmentSelect from '../../../components/fields/DepartmentSelect';
import api from '../../../api';

export type AllocationEditorHandle = {
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
  budget_year?: number;
  allocation_method?: 'default' | 'headcount' | 'it_users' | 'turnover' | 'manual_company' | 'manual_department';
  allocation_driver?: 'headcount' | 'it_users' | 'turnover';
};

type AllocationRow = {
  company_id: string | null;
  department_id: string | null;
  allocation_pct: number | '';
};

function withinTolerance(total: number) { return total >= 99.99 && total <= 100.01; }

export default forwardRef<AllocationEditorHandle, Props>(function AllocationEditor({ id, year, availableYears, onYearChange, onDirtyChange }, ref) {
  const { t } = useTranslation(['ops', 'common']);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [version, setVersion] = React.useState<Version | null>(null);
  const [rows, setRows] = React.useState<AllocationRow[]>([{ company_id: null, department_id: null, allocation_pct: 0 }]);
  const rowsRef = React.useRef(rows);
  React.useEffect(() => { rowsRef.current = rows; }, [rows]);
  const [method, setMethod] = React.useState<NonNullable<Version['allocation_method']>>('default');
  const [allocationDriver, setAllocationDriver] = React.useState<'headcount' | 'it_users' | 'turnover'>('headcount');
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  React.useEffect(() => { onDirtyChange?.(hasUnsavedChanges); }, [hasUnsavedChanges, onDirtyChange]);

  const companiesCacheRef = React.useRef<any[] | null>(null);
  const manualCompanyPrefilledRef = React.useRef(false);

  React.useEffect(() => {
    companiesCacheRef.current = null;
    manualCompanyPrefilledRef.current = false;
  }, [year]);

  const totalPct = React.useMemo(() => {
    const relevant = (method === 'manual_department')
      ? rows.filter(r => !!r.company_id && !!r.department_id)
      : (method === 'manual_company')
      ? rows.filter(r => !!r.company_id)
      : rows;
    return relevant.reduce((acc, r) => acc + parsePct(r.allocation_pct), 0);
  }, [rows, method]);
  const isManualDept = method === 'manual_department';
  const isManualCompany = method === 'manual_company';
  const isAuto = !isManualDept && !isManualCompany;

  const fetchCompanies = React.useCallback(async () => {
    if (companiesCacheRef.current) return companiesCacheRef.current;
    const res = await api.get<{ items: any[] }>('/companies', { params: { year, page: 1, limit: 1000, sort: 'name:ASC' } });
    const items = res.data?.items || [];
    companiesCacheRef.current = items;
    return items;
  }, [year]);

  // Define helpers before load() to avoid TDZ issues in dependency arrays
  const computeManualCompanyAllocations = React.useCallback(
    async (inputRows: AllocationRow[], driver: 'headcount' | 'it_users' | 'turnover') => {
      const companies = await fetchCompanies();
      const weightsMap: Record<string, number> = {};
      companies.forEach((c: any) => {
        const val = driver === 'headcount' ? Number(c.headcount_year || 0) : driver === 'it_users' ? Number(c.it_users_year || 0) : Number(c.turnover_year || 0);
        weightsMap[c.id] = Number(val) || 0;
      });
      const nextRows = inputRows.map((row) => ({ ...row }));
      const selected = nextRows
        .map((row, idx) => (row.company_id ? { idx, id: row.company_id, weight: Number(weightsMap[row.company_id] || 0) } : null))
        .filter((entry): entry is { idx: number; id: string; weight: number } => entry != null);
      if (selected.length === 0) { return { rows: nextRows.map((row) => ({ ...row, allocation_pct: row.company_id ? Number(row.allocation_pct || 0) : 0 })), weightsMap }; }
      const sum = selected.reduce((acc, entry) => acc + entry.weight, 0);
      if (sum <= 0) { throw new Error(t('opex.allocations.provideDriverForCompanies', { driver: driver.replace('_', ' ') })); }
      let accPct = 0;
      selected.forEach((entry, i) => {
        let pct = (100 * entry.weight) / sum;
        pct = Math.round(pct * 100) / 100;
        if (i === selected.length - 1) { pct = Math.round((100 - accPct) * 100) / 100; } else { accPct += pct; }
        nextRows[entry.idx] = { ...nextRows[entry.idx], allocation_pct: pct };
      });
      return { rows: nextRows, weightsMap };
    },
    [fetchCompanies]
  );

  const recalcDeptAlloc = React.useCallback(async (baseline: AllocationRow[]) => {
    try {
      const selected = baseline.filter(r => r.department_id);
      if (selected.length === 0) { setRows(baseline); return; }
      const res = await api.get<{ items: any[] }>(`/departments`, { params: { year, page: 1, limit: 1000, sort: 'name:ASC' } });
      const items = res.data?.items || [];
      const hcByDept: Record<string, number> = {};
      items.forEach((d: any) => { if (d?.id) hcByDept[d.id] = Number(d.headcount_year ?? 0); });
      let missing = false;
      const weights = selected.map(r => {
        const id = r.department_id as string;
        const w = Number(hcByDept[id] || 0);
        if (!Number.isFinite(w) || w <= 0) missing = true;
        return { id, w };
      });
      if (missing) { setError(t('opex.allocations.provideHeadcountForDept')); setRows(baseline); return; }
      const sum = weights.reduce((acc, it) => acc + it.w, 0);
      if (sum <= 0) { setError(t('opex.allocations.headcountSumZero')); setRows(baseline); return; }
      const recalced = baseline.map((r) => {
        if (!r.department_id) return { ...r };
        const w = weights.find(w => w.id === r.department_id);
        let pct = (100 * (Number(w?.w || 0))) / sum;
        pct = Math.round(pct * 100) / 100;
        return { ...r, allocation_pct: pct } as typeof r;
      });
      const total = recalced.reduce((a, r) => a + Number(r.allocation_pct || 0), 0);
      const diff = Math.round((100 - total) * 100) / 100;
      const idxs = recalced.map((r, i) => ({ r, i })).filter(x => x.r.department_id);
      if (idxs.length > 0 && Math.abs(diff) >= 0.01) {
        const lastI = idxs[idxs.length - 1].i;
        recalced[lastI] = { ...recalced[lastI], allocation_pct: Math.round((Number(recalced[lastI].allocation_pct || 0) + diff) * 100) / 100 } as any;
      }
      setError(null);
      setRows(recalced);
    } catch (e) {
      setRows(baseline);
    }
  }, [year]);

  const ensureVersion = React.useCallback(async (): Promise<Version> => {
    const res = await api.get<Version[]>(`/spend-items/${id}/versions`);
    const byYear = (res.data || []).find((v: any) => Number((v as any).budget_year) === year);
    if (byYear) return byYear as Version;
    const body = { version_name: `Y${year}`, budget_year: year, as_of_date: `${year}-01-01`, input_grain: 'annual', is_approved: false, notes: null };
    const created = await api.post<Version>(`/spend-items/${id}/versions`, body);
    return created.data as Version;
  }, [id, year]);

  // Track prefill context to enable auto-recalc on removal
  const [, setPrefillWeights] = React.useState<Record<string, number> | null>(null);

  const recalcForRemaining = async (remaining: AllocationRow[], driver: 'headcount' | 'it_users' | 'turnover') => {
    try {
      const { rows: recalced, weightsMap } = await computeManualCompanyAllocations(remaining, driver);
      setRows(recalced);
      setPrefillWeights(weightsMap);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('opex.allocations.failedToRecompute'));
      setRows(remaining);
    }
  };

  type ManualPayloadRow = { company_id: string; department_id: string | null; allocation_pct: number };

  const verifyManualSave = React.useCallback(
    async (versionId: string, expectedRows: ManualPayloadRow[]) => {
      const normalize = (rows: ManualPayloadRow[]) =>
        rows
          .map((row) => ({
            company_id: row.company_id,
            department_id: row.department_id ?? null,
            allocation_pct: Math.round(Number(row.allocation_pct || 0) * 1000) / 1000,
          }))
          .sort((a, b) => {
            const keyA = `${a.company_id ?? ''}|${a.department_id ?? ''}`;
            const keyB = `${b.company_id ?? ''}|${b.department_id ?? ''}`;
            return keyA.localeCompare(keyB);
          });

      try {
        const [versionsRes, allocRes] = await Promise.all([
          api.get<Version[]>(`/spend-items/${id}/versions`),
          api.get<{ items: any[]; resolved_method?: string }>(`/spend-versions/${versionId}/allocations`),
        ]);
        const refreshed = (versionsRes.data || []).find(
          (vv: any) => Number((vv as any).budget_year) === year,
        ) as Version | undefined;
        if (refreshed) setVersion(refreshed);
        const backendMethod = (refreshed as any)?.allocation_method ?? null;
        const resolvedMethod = (allocRes.data as any)?.resolved_method ?? null;
        const actual = normalize(
          (allocRes.data?.items || []).map((row: any) => ({
            company_id: row.company_id ?? null,
            department_id: row.department_id ?? null,
            allocation_pct: Number(row.allocation_pct ?? 0),
          })),
        );
        const expected = normalize(expectedRows);
        const mismatch =
          expected.length !== actual.length ||
          expected.some((row, idx) => {
            const other = actual[idx];
            if (!other) return true;
            if (row.company_id !== other.company_id) return true;
            if ((row.department_id ?? null) !== (other.department_id ?? null)) return true;
            return false;
          });

        const debugPayload = { backendMethod, resolvedMethod, expected, actual };
        if (mismatch || (backendMethod && backendMethod !== method) || (resolvedMethod && resolvedMethod !== method)) {
          console.error('[AllocationEditor] Save verification mismatch', debugPayload);
          return { ok: false, ...debugPayload };
        }
        console.debug('[AllocationEditor] Save verification ok', debugPayload);
        return { ok: true, ...debugPayload };
      } catch (err) {
        console.error('[AllocationEditor] Save verification failed', err);
        return { ok: false, error: err as Error };
      }
    },
    [id, year, method],
  );

  const load = React.useCallback(async () => {
    manualCompanyPrefilledRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Version[]>(`/spend-items/${id}/versions`);
      const v = (res.data || []).find((vv: any) => Number((vv as any).budget_year) === year) as Version | undefined;
      setVersion(v ?? null);
      if (v) {
        const alloc = await api.get<{ items: any[]; total_pct: number }>(`/spend-versions/${v.id}/allocations`);
        const items = (alloc.data?.items || []).map((a: any) => ({ company_id: a.company_id ?? null, department_id: a.department_id ?? null, allocation_pct: Number(a.allocation_pct || 0) })) as AllocationRow[];
        const rowsFromApi = items.length > 0 ? items : [{ company_id: null, department_id: null, allocation_pct: 0 }];
        const loadedMethod = ((v as any).allocation_method ?? 'default') as NonNullable<Version['allocation_method']>;
        setMethod(loadedMethod === 'headcount' ? 'default' : loadedMethod);
        const resolvedDriver = ((v as any).allocation_driver ?? 'headcount') as 'headcount' | 'it_users' | 'turnover';
        setAllocationDriver(resolvedDriver);

        if (loadedMethod === 'manual_company') {
          try {
            const { rows: recalced, weightsMap } = await computeManualCompanyAllocations(rowsFromApi, resolvedDriver);
            setRows(recalced);
            setPrefillWeights(weightsMap);
            setError(null);
          } catch (err: any) {
            setRows(rowsFromApi);
            setError(err?.message || t('opex.allocations.failedToCompute'));
          }
          manualCompanyPrefilledRef.current = true;
        } else if (loadedMethod === 'manual_department') {
          setRows(rowsFromApi);
          await recalcDeptAlloc(rowsFromApi);
          manualCompanyPrefilledRef.current = true;
        } else {
          setRows(rowsFromApi);
        }
      } else {
        setRows([{ company_id: null, department_id: null, allocation_pct: 0 }]);
        setMethod('default');
        manualCompanyPrefilledRef.current = false;
      }
      setHasUnsavedChanges(false);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('opex.allocations.failedToLoad')));
    } finally {
      setLoading(false);
    }
  }, [id, year, computeManualCompanyAllocations, recalcDeptAlloc]);

  React.useEffect(() => { void load(); }, [load]);


const fullPrefill = async (driver: 'headcount' | 'it_users' | 'turnover') => {
  try {
    const items = await fetchCompanies();
    const weights = items.map((c: any) => ({ id: c.id, w: driver === 'headcount' ? Number(c.headcount_year || 0) : driver === 'it_users' ? Number(c.it_users_year || 0) : Number(c.turnover_year || 0) }));
    const sum = weights.reduce((acc: number, it: any) => acc + (Number(it.w) || 0), 0);
    if (sum <= 0) { setError(t('opex.allocations.provideDriverSumZero', { driver })); return; }
    let accPct = 0;
    const newRows = weights.map((w: any, i: number) => {
      let pct = (100 * (Number(w.w) || 0)) / sum;
      pct = Math.round(pct * 100) / 100;
      if (i === weights.length - 1) pct = Math.round((100 - accPct) * 100) / 100; else accPct += pct;
      return { company_id: w.id, department_id: null, allocation_pct: pct } as any;
    });
    newRows.sort((a: any, b: any) => Number(b.allocation_pct || 0) - Number(a.allocation_pct || 0));
    setRows(newRows);
    setError(null);
    setHasUnsavedChanges(true);
  } catch (e: any) {
    setError(getApiErrorMessage(e, t, t('opex.allocations.failedToCompute')));
  }
};

  const prefillManualCompanyRows = React.useCallback(async () => {
    if (manualCompanyPrefilledRef.current) return;
    if (!isManualCompany) return;
    const hasCompany = rows.some((r) => !!r.company_id);
    if (hasCompany) { manualCompanyPrefilledRef.current = true; return; }
    try {
      const companies = await fetchCompanies();
      if (companies.length === 0) { manualCompanyPrefilledRef.current = true; return; }
      const sorted = [...companies].sort((a, b) => Number(b.headcount_year || 0) - Number(a.headcount_year || 0));
      setRows(sorted.map((c: any) => ({ company_id: c.id, department_id: null, allocation_pct: 0 } as AllocationRow)));
      setHasUnsavedChanges(true);
    } finally {
      manualCompanyPrefilledRef.current = true;
    }
  }, [fetchCompanies, isManualCompany, rows]);

  React.useEffect(() => {
    if (isManualCompany && !loading) {
      void prefillManualCompanyRows();
    }
  }, [isManualCompany, prefillManualCompanyRows, loading]);


  const handleCompanyChange = (idx: number, companyId: string | null) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, company_id: companyId, department_id: isManualDept ? null : r.department_id } : r));
    console.debug('[AllocationEditor] company change', idx, companyId, next);
    setRows(next);
    setHasUnsavedChanges(true);
    if (isManualCompany) {
      void recalcForRemaining(next, allocationDriver);
    } else if (isManualDept) {
      void recalcDeptAlloc(next);
    }
  };
  const handleDepartmentChange = (idx: number, deptId: string | null) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, department_id: deptId } : r));
    console.debug('[AllocationEditor] department change', idx, deptId, next);
    setRows(next);
    setHasUnsavedChanges(true);
    if (isManualDept) void recalcDeptAlloc(next);
  };
  function parsePct(raw: any): number {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
    if (typeof raw === 'string') {
      const s = raw.replace(/\s/g, '').replace(',', '.');
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  const handlePctChange = (idx: number, value: string) => {
    const n = value === '' ? '' : parsePct(value);
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, allocation_pct: (typeof n === 'number' && Number.isFinite(n) ? n : 0) as any } : r)));
    setHasUnsavedChanges(true);
  };
  const addRow = () => { setRows(prev => [...prev, { company_id: null, department_id: null, allocation_pct: 0 }]); setHasUnsavedChanges(true); };
  const removeRow = (idx: number) => {
    const remaining = rows.filter((_, i) => i !== idx);
    if (isManualCompany) {
      void recalcForRemaining(remaining, allocationDriver);
    } else {
      setRows(remaining);
      if (isManualDept) void recalcDeptAlloc(remaining);
    }
    setHasUnsavedChanges(true);
  };

  const handleMethodChange = (next: NonNullable<Version['allocation_method']>) => {
    setMethod(next);
    manualCompanyPrefilledRef.current = false;
    setRows([{ company_id: null, department_id: null, allocation_pct: 0 }]);
    if (next === 'it_users') setAllocationDriver('it_users');
    else if (next === 'turnover') setAllocationDriver('turnover');
    else if (next !== 'manual_company') setAllocationDriver('headcount');
    setHasUnsavedChanges(true);
  };

  const handleDriverChange = (driver: 'headcount' | 'it_users' | 'turnover') => {
    setAllocationDriver(driver);
    if (isManualCompany) void recalcForRemaining(rows, driver);
    setHasUnsavedChanges(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const v = version ?? (await ensureVersion());
      setVersion(v);
      const driverForSave: 'headcount' | 'it_users' | 'turnover' = isManualCompany
        ? allocationDriver
        : method === 'it_users'
        ? 'it_users'
        : method === 'turnover'
        ? 'turnover'
        : 'headcount';

      if (!v.allocation_method || v.allocation_method !== method || (v as any).allocation_driver !== driverForSave) {
        await api.patch(`/spend-items/${id}/versions`, { id: v.id, allocation_method: method, allocation_driver: driverForSave });
      }

      const currentRows = rowsRef.current;
      const payload = isAuto
        ? []
        : currentRows
            .filter((r) => r.company_id && (!isManualDept || r.department_id))
            .map((r) => ({
              company_id: r.company_id!,
              department_id: (isManualDept ? r.department_id! : null),
              allocation_pct: Number(r.allocation_pct || 0),
            })) as ManualPayloadRow[];

      if (!isAuto) {
        console.debug('[AllocationEditor] rows for save', currentRows, 'payload', payload);
      }

      if (!isAuto) {
        if (payload.length === 0) {
          throw new Error(isManualDept ? t('opex.allocations.selectAtLeastOneDept') : t('opex.allocations.selectAtLeastOneCompany'));
        }
        for (const row of payload) {
          if (!row.company_id) throw new Error(t('opex.allocations.companyRequired'));
          if (isManualDept && !row.department_id) throw new Error(t('opex.allocations.deptRequiredForManual'));
        }
      }
      console.debug('[AllocationEditor] Saving allocations', { method, isAuto, versionId: v.id, payload, driver: driverForSave });
      await api.post(`/spend-versions/${v.id}/allocations/bulk-upsert`, payload);
      if (!isAuto) {
        const verification = await verifyManualSave(v.id, payload);
        if (!verification.ok) {
          const reason = verification.error?.message
            ? verification.error.message
            : t('opex.allocations.verificationMismatch');
          throw new Error(t('opex.allocations.verificationFailed', { reason }));
        }
      }
      setHasUnsavedChanges(false);
      await load();
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('opex.allocations.failedToSave')));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ isDirty: () => hasUnsavedChanges, save, reset: () => { void load(); } }), [hasUnsavedChanges, save, load]);

  const onYearChangeGuard = (newYear: number) => {
    if (newYear === year) return;
    if (hasUnsavedChanges) {
      const proceed = window.confirm(t('confirmations.unsavedSwitchYear'));
      if (proceed) { void save().then(() => onYearChange(newYear)).catch(() => {}); return; }
    }
    onYearChange(newYear);
  };

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      <Typography variant="subtitle2">{t('opex.allocations.title')}</Typography>
      <YearTabs currentYear={year} availableYears={availableYears} onYearChange={onYearChangeGuard} disabled={saving || loading} />
      <Divider />
      <Stack direction="row" spacing={2} alignItems="center">
        <EnumAutocomplete
          label={t('opex.allocations.method')}
          value={method}
          onChange={(v) => handleMethodChange(v as any)}
          options={[
            { value: 'default', label: t('opex.allocations.headcountDefault') },
            { value: 'it_users', label: t('opex.allocations.itUsers') },
            { value: 'turnover', label: t('opex.allocations.turnover') },
            { value: 'manual_company', label: t('opex.allocations.manualByCompany') },
            { value: 'manual_department', label: t('opex.allocations.manualByDepartment') },
          ]}
          size="small"
          required
        />
        <Typography variant="body2" sx={{ color: (isAuto ? (totalPct <= 100.01) : rows.some(r => r.company_id && (!isManualDept || r.department_id))) ? 'success.main' : 'warning.main' }}>
          Total: {totalPct.toFixed(2)}% {isAuto ? t('opex.allocations.totalAutoHint') : '(preview only – saved totals use live metrics)'}
        </Typography>
      </Stack>
      {isAuto && (
        <Alert severity="info">{t('opex.allocations.autoDistributeInfo')}</Alert>
      )}
      <Divider />
      {!isAuto && (
        <Stack spacing={1}>
          {isManualCompany && (
            <>
              <Stack direction="row" spacing={1} alignItems="center">
                <EnumAutocomplete
                  label={t('opex.allocations.allocateBy')}
                  value={allocationDriver}
                  onChange={(v) => { const d = v as any; handleDriverChange(d); }}
                  options={[
                    { value: 'headcount', label: t('opex.allocations.headcount') },
                    { value: 'it_users', label: t('opex.allocations.itUsers') },
                    { value: 'turnover', label: t('opex.allocations.turnover') },
                  ]}
                  size="small"
                />
                <Button size="small" variant="outlined" onClick={() => void fullPrefill(allocationDriver)}>Reset</Button>
              </Stack>
              <Divider sx={{ my: 0.5 }} />
            </>
          )}
          {rows.map((row, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: isManualDept ? '1.3fr 1.3fr 0.9fr auto' : '1.3fr 0.9fr auto', gap: 1, alignItems: 'center' }}>
              <CompanySelect value={row.company_id} onChange={(v) => handleCompanyChange(idx, v)} error={!row.company_id} required size="small" />
              {isManualDept && (
                <DepartmentSelect companyId={row.company_id || undefined} value={row.department_id} onChange={(v) => handleDepartmentChange(idx, v)} error={!row.department_id} required size="small" year={year} />
              )}
              <TextField label={t('opex.allocations.allocationPct')} type="number" value={row.allocation_pct} onChange={(e) => handlePctChange(idx, e.target.value)} inputProps={{ step: 0.01 }} size="small" required />
              <IconButton aria-label="Remove" onClick={() => removeRow(idx)} disabled={rows.length <= 1} size="small"><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button startIcon={<AddIcon />} onClick={addRow} size="small">{t('opex.allocations.addRow')}</Button>
          </Box>
        </Stack>
      )}
    </Stack>
  );
});
