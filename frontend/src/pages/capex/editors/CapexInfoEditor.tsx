import React, { forwardRef, useImperativeHandle } from 'react';
import { Stack, TextField, Alert, Typography, Autocomplete } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import CompanySelect from '../../../components/fields/CompanySelect';
import AccountSelect from '../../../components/fields/AccountSelect';
import SupplierSelect from '../../../components/fields/SupplierSelect';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import api from '../../../api';
import { CURRENCY_OPTIONS, CurrencyOption } from '../../../constants/isoOptions';
import useCurrencySettings from '../../../hooks/useCurrencySettings';
import { STATUS_ENABLED, StatusValue, deriveStatusFromDisabledAt, normalizeDisabledAtInput } from '../../../constants/status';
import { deepEqual } from '../../../lib/deepEqual';
import DateEUField from '../../../components/fields/DateEUField';

export type CapexInfoEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = { id: string; onDirtyChange?: (dirty: boolean) => void };

const PPE_OPTIONS = [
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
] as const;

const INVESTMENT_OPTIONS = [
  { value: 'replacement', label: 'Replacement' },
  { value: 'capacity', label: 'Capacity' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'security', label: 'Security' },
  { value: 'conformity', label: 'Conformity' },
  { value: 'business_growth', label: 'Business Growth' },
  { value: 'other', label: 'Other' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'mandatory', label: 'Mandatory' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

export default forwardRef<CapexInfoEditorHandle, Props>(function CapexInfoEditor({ id, onDirtyChange }, ref) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [description, setDescription] = React.useState('');
  const [ppeType, setPpeType] = React.useState<'hardware' | 'software'>('hardware');
  const [investmentType, setInvestmentType] = React.useState<(typeof INVESTMENT_OPTIONS)[number]['value']>('replacement');
  const [priority, setPriority] = React.useState<(typeof PRIORITY_OPTIONS)[number]['value']>('medium');
  const { data: currencySettings } = useCurrencySettings();
  const allowedCurrencyCodes = React.useMemo(() => {
    const allowed = currencySettings?.allowedCurrencies;
    if (allowed && allowed.length > 0) return new Set(allowed.map((code: string) => code.toUpperCase()));
    return null;
  }, [currencySettings]);
  const currencyOptions = React.useMemo<CurrencyOption[]>(() => {
    if (allowedCurrencyCodes && allowedCurrencyCodes.size > 0) {
      const filtered = CURRENCY_OPTIONS.filter((opt) => allowedCurrencyCodes.has(opt.code));
      return filtered.length ? filtered : CURRENCY_OPTIONS;
    }
    return CURRENCY_OPTIONS;
  }, [allowedCurrencyCodes]);

  const fallbackCurrencyOption = React.useMemo<CurrencyOption>(() => {
    const defaultCode = currencySettings?.defaultCapexCurrency?.toUpperCase() ?? 'EUR';
    return currencyOptions.find((opt) => opt.code === defaultCode)
      ?? currencyOptions[0]
      ?? ({ code: defaultCode, name: 'Unknown currency code' } as CurrencyOption);
  }, [currencyOptions, currencySettings]);
  const [currency, setCurrency] = React.useState('EUR');
  const [effectiveStart, setEffectiveStart] = React.useState<string>('');
  const [effectiveEnd, setEffectiveEnd] = React.useState<string>('');
  const [status, setStatus] = React.useState<StatusValue>(STATUS_ENABLED);
  const [disabledAt, setDisabledAtState] = React.useState<string | null>(null);
  const setDisabledAt = React.useCallback((next: string | null) => {
    const normalized = normalizeDisabledAtInput(next);
    setDisabledAtState(normalized);
    setStatus(deriveStatusFromDisabledAt(normalized));
  }, []);
  const [notes, setNotes] = React.useState<string>('');
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [accountId, setAccountId] = React.useState<string>('');
  const [supplierId, setSupplierId] = React.useState<string>('');

  const [baseline, setBaseline] = React.useState<any>(null);
  const isLoadingRef = React.useRef(false);

  // Check for obsolete account (account from different CoA than company's CoA)
  const [accountCoaId, setAccountCoaId] = React.useState<string | null>(null);
  const [companyCoaId, setCompanyCoaId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!companyId) {
        setCompanyCoaId(null);
        return;
      }
      try {
        const res = await api.get(`/companies/${companyId}`);
        if (alive) setCompanyCoaId(res.data?.coa_id || null);
      } catch {
        if (alive) setCompanyCoaId(null);
      }
    })();
    return () => { alive = false; };
  }, [companyId]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!accountId) {
        setAccountCoaId(null);
        return;
      }
      try {
        const res = await api.get(`/accounts/${accountId}`);
        if (alive) setAccountCoaId(res.data?.coa_id || null);
      } catch {
        if (alive) setAccountCoaId(null);
      }
    })();
    return () => { alive = false; };
  }, [accountId]);

  const hasObsoleteAccount = React.useMemo(() => {
    if (!accountId || !companyId) return false;
    if (!accountCoaId || !companyCoaId) return false;
    return accountCoaId !== companyCoaId;
  }, [accountId, companyId, accountCoaId, companyCoaId]);

  const loadData = React.useCallback(async () => {
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/capex-items/${id}`);
      const d = res.data || {};
      const disabledValue = d.disabled_at ? new Date(d.disabled_at).toISOString() : null;
      const statusValue = deriveStatusFromDisabledAt(disabledValue ?? d.status);
      const b = {
        description: d.description || '',
        ppe_type: (d.ppe_type || 'hardware') as 'hardware' | 'software',
        investment_type: (d.investment_type || 'replacement') as any,
        priority: (d.priority || 'medium') as any,
        currency: (d.currency || 'EUR').toUpperCase(),
        effective_start: d.effective_start ? String(d.effective_start).slice(0, 10) : new Date().toISOString().slice(0, 10),
        effective_end: d.effective_end ? String(d.effective_end).slice(0, 10) : '',
        status: statusValue,
        disabled_at: disabledValue,
        notes: d.notes || '',
        company_id: d.paying_company_id || null,
        account_id: d.account_id || '',
        supplier_id: d.supplier_id || '',
      };
      setDescription(b.description);
      setPpeType(b.ppe_type);
      setInvestmentType(b.investment_type);
      setPriority(b.priority);
      setCurrency(b.currency);
      setEffectiveStart(b.effective_start);
      setEffectiveEnd(b.effective_end);
      setStatus(b.status);
      setDisabledAt(b.disabled_at);
      setNotes(b.notes);
      setCompanyId(b.company_id);
      setAccountId(b.account_id || '');
      setSupplierId(b.supplier_id || '');
      setBaseline(b);
      onDirtyChange?.(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load item');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [id, onDirtyChange]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const current = {
    description,
    ppe_type: ppeType,
    investment_type: investmentType,
    priority,
    currency,
    effective_start: effectiveStart,
    effective_end: effectiveEnd,
    status,
    disabled_at: disabledAt,
    notes,
    company_id: companyId,
    account_id: accountId,
    supplier_id: supplierId,
  };
  const dirty = baseline ? !deepEqual(current, baseline) : false;
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    save: async () => {
      if (!dirty) return;
      setSaving(true); setError(null);
      try {
        // allow pending selection events to commit to state before reading
        await new Promise((r) => setTimeout(r, 0));
        const toNull = (v: any) => (v === '' || v === undefined ? null : v);
        const disabled_at = disabledAt ?? null;
        const statusValue = deriveStatusFromDisabledAt(disabled_at);
        const payload = {
          description,
          ppe_type: ppeType,
          investment_type: investmentType,
          priority,
          currency: currency.toUpperCase(),
          effective_start: effectiveStart,
          effective_end: toNull(effectiveEnd),
          status: statusValue,
          disabled_at,
          notes: toNull(notes),
          paying_company_id: toNull(companyId),
          account_id: toNull(accountId),
          supplier_id: toNull(supplierId),
        };
        console.log('[CAPEX][update] payload', payload);
        await api.patch(`/capex-items/${id}`, payload);
        await queryClient.invalidateQueries({ queryKey: ['capex', id] });

        // Refetch to update UI with saved data
        await loadData();
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to save');
        throw e;
      } finally { setSaving(false); }
    },
    reset: () => {
      if (!baseline) return;
      setDescription(baseline.description || '');
      setPpeType(baseline.ppe_type || 'hardware');
      setInvestmentType(baseline.investment_type || 'replacement');
      setPriority(baseline.priority || 'medium');
      setCurrency(baseline.currency || 'EUR');
      setEffectiveStart(baseline.effective_start || '');
      setEffectiveEnd(baseline.effective_end || '');
      setStatus(baseline.status || STATUS_ENABLED);
      setDisabledAt(baseline.disabled_at || null);
      setNotes(baseline.notes || '');
      setCompanyId(baseline.company_id || null);
      setAccountId(baseline.account_id || '');
      setSupplierId(baseline.supplier_id || '');
      onDirtyChange?.(false);
    },
  }), [dirty, id, description, ppeType, investmentType, priority, currency, effectiveStart, effectiveEnd, status, disabledAt, notes, companyId, accountId, supplierId, baseline, onDirtyChange, loadData]);

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      {hasObsoleteAccount && (
        <Alert severity="warning">
          Obsolete account detected. The selected account does not belong to the company's Chart of Accounts. Please update the account.
        </Alert>
      )}
      <Typography variant="subtitle2">General Information</Typography>
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading || saving} required fullWidth multiline minRows={2} InputLabelProps={{ shrink: true }} />
      <CompanySelect value={companyId} onChange={setCompanyId} />
      <AccountSelect value={accountId} onChange={(v) => setAccountId(v ?? '')} companyId={companyId || undefined} disabled={!companyId || loading || saving} />
      <SupplierSelect value={supplierId} onChange={(v) => setSupplierId(v ?? '')} disabled={loading || saving} />
      <EnumAutocomplete label="PP&E Type" value={ppeType} onChange={(v) => setPpeType(v as any)} options={PPE_OPTIONS as any} required />
      <EnumAutocomplete label="Investment Type" value={investmentType} onChange={(v) => setInvestmentType(v as any)} options={INVESTMENT_OPTIONS as any} required />
      <EnumAutocomplete label="Priority" value={priority} onChange={(v) => setPriority(v as any)} options={PRIORITY_OPTIONS as any} required />
      <Autocomplete<CurrencyOption, false, true, false>
        options={currencyOptions}
        disableClearable
        value={(() => {
          const code = (currency || '').toUpperCase();
          return (
            currencyOptions.find((opt) => opt.code === code)
            ?? (code ? ({ code, name: 'Unknown currency code' } as CurrencyOption) : fallbackCurrencyOption)
          );
        })()}
        onChange={(_event, option) => setCurrency(option?.code ?? fallbackCurrencyOption.code)}
        disabled={loading || saving}
        getOptionLabel={(option) => `${option.code} — ${option.name}`}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Currency"
            required
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <DateEUField label="Effective Start" valueYmd={effectiveStart || ''} onChangeYmd={setEffectiveStart} disabled={loading || saving} required />
      <DateEUField label="Effective End" valueYmd={effectiveEnd || ''} onChangeYmd={setEffectiveEnd} disabled={loading || saving} />
      <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth InputLabelProps={{ shrink: true }} />
      <StatusLifecycleField
        status={status}
        onStatusChange={(next) => setStatus(next)}
        disabledAt={disabledAt}
        onDisabledAtChange={(next) => setDisabledAt(next)}
        statusLabel="Enabled"
      />
    </Stack>
  );
});
