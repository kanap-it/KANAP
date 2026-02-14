import React, { forwardRef, useImperativeHandle } from 'react';
import { Stack, TextField, Alert, Typography, Autocomplete } from '@mui/material';
import SupplierSelect from '../../../components/fields/SupplierSelect';
import AccountSelect from '../../../components/fields/AccountSelect';
import CompanySelect from '../../../components/fields/CompanySelect';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import UserSelect from '../../../components/fields/UserSelect';
import AnalyticsCategorySelect from '../../../components/fields/AnalyticsCategorySelect';
import api from '../../../api';
import { CURRENCY_OPTIONS, CurrencyOption } from '../../../constants/isoOptions';
import useCurrencySettings from '../../../hooks/useCurrencySettings';
import { STATUS_ENABLED, StatusValue, deriveStatusFromDisabledAt, normalizeDisabledAtInput } from '../../../constants/status';
import DateEUField from '../../../components/fields/DateEUField';
import { deepEqual } from '../../../lib/deepEqual';

export type SpendInfoCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string>; // returns new id
  reset: () => void;
};

type Props = { onDirtyChange?: (dirty: boolean) => void };

export default forwardRef<SpendInfoCreateEditorHandle, Props>(function SpendInfoCreateEditor({ onDirtyChange }, ref) {
  const [productName, setProductName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [supplierId, setSupplierId] = React.useState<string>('');
  const { data: currencySettings } = useCurrencySettings();
  const defaultCurrency = React.useMemo(
    () => currencySettings?.defaultSpendCurrency?.toUpperCase() ?? 'EUR',
    [currencySettings],
  );
  const allowedCurrencyCodes = React.useMemo(() => {
    const allowed = currencySettings?.allowedCurrencies;
    if (allowed && allowed.length > 0) {
      return new Set(allowed.map((code: string) => code.toUpperCase()));
    }
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
    const preferred = currencyOptions.find((opt) => opt.code === defaultCurrency);
    return preferred ?? currencyOptions[0] ?? ({ code: defaultCurrency, name: 'Unknown currency code' } as CurrencyOption);
  }, [currencyOptions, defaultCurrency]);

  const [currency, setCurrency] = React.useState(defaultCurrency);
  const [currencyTouched, setCurrencyTouched] = React.useState(false);
  const [accountId, setAccountId] = React.useState<string>('');
  const [payingCompanyId, setPayingCompanyId] = React.useState<string>('');
  const [effectiveStart, setEffectiveStart] = React.useState<string>(() => new Date().toISOString().slice(0,10));
  const [effectiveEnd, setEffectiveEnd] = React.useState<string>('');
  const [status, setStatus] = React.useState<StatusValue>(STATUS_ENABLED);
  const [disabledAt, setDisabledAtState] = React.useState<string | null>(null);
  const setDisabledAt = React.useCallback((next: string | null) => {
    const normalized = normalizeDisabledAtInput(next);
    setDisabledAtState(normalized);
    setStatus(deriveStatusFromDisabledAt(normalized));
  }, []);
  const [ownerItId, setOwnerItId] = React.useState<string>('');
  const [ownerBizId, setOwnerBizId] = React.useState<string>('');
  const [analyticsCategoryId, setAnalyticsCategoryId] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check for obsolete account (account from different CoA than company's CoA)
  const [accountCoaId, setAccountCoaId] = React.useState<string | null>(null);
  const [companyCoaId, setCompanyCoaId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!payingCompanyId) {
        setCompanyCoaId(null);
        return;
      }
      try {
        const res = await api.get(`/companies/${payingCompanyId}`);
        if (alive) setCompanyCoaId(res.data?.coa_id || null);
      } catch {
        if (alive) setCompanyCoaId(null);
      }
    })();
    return () => { alive = false; };
  }, [payingCompanyId]);

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
    if (!accountId || !payingCompanyId) return false;
    if (!accountCoaId || !companyCoaId) return false;
    return accountCoaId !== companyCoaId;
  }, [accountId, payingCompanyId, accountCoaId, companyCoaId]);

  React.useEffect(() => {
    if (!currencyTouched) {
      setCurrency(defaultCurrency);
    }
  }, [defaultCurrency, currencyTouched]);

  const baseline = React.useMemo(() => ({
    product_name: '', description: '', supplier_id: '', currency: defaultCurrency, account_id: '', paying_company_id: '',
    effective_start: effectiveStart, effective_end: '', status: STATUS_ENABLED, disabled_at: null,
    owner_it_id: '', owner_business_id: '', analytics_category_id: '', notes: ''
  }), [defaultCurrency, effectiveStart]);

  const current = {
    product_name: productName,
    description,
    supplier_id: supplierId,
    currency,
    account_id: accountId,
    paying_company_id: payingCompanyId,
    effective_start: effectiveStart,
    effective_end: effectiveEnd,
    status,
    disabled_at: disabledAt,
    owner_it_id: ownerItId,
    owner_business_id: ownerBizId,
    analytics_category_id: analyticsCategoryId,
    notes,
  };

  const dirty = React.useMemo(() => !deepEqual(current, baseline), [current, baseline]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    save: async () => {
      setSaving(true);
      setError(null);
      try {
        // Minimal validation modeled after existing create flow
        if (productName.trim().length === 0) throw new Error('Product name is required');
        if (!supplierId) throw new Error('Supplier is required');
        if ((currency || '').trim().length !== 3) throw new Error('Currency must be 3 letters');
        if (!payingCompanyId) throw new Error('Paying company is required');
        if (!accountId) throw new Error('Account is required');
        if (!effectiveStart) throw new Error('Effective start is required');

        const toNull = (v: any) => (v === '' || v === undefined ? null : v);
        const disabled_at = disabledAt ?? null;
        const statusValue = deriveStatusFromDisabledAt(disabled_at);
        const payload = {
          product_name: productName,
          description: toNull(description),
          supplier_id: supplierId,
          currency: currency.toUpperCase(),
          account_id: accountId,
          paying_company_id: toNull(payingCompanyId),
          effective_start: effectiveStart,
          effective_end: toNull(effectiveEnd),
          status: statusValue,
          disabled_at,
          owner_it_id: toNull(ownerItId),
          owner_business_id: toNull(ownerBizId),
          analytics_category_id: toNull(analyticsCategoryId),
          notes: toNull(notes),
        };
        const res = await api.post('/spend-items', payload);
        const id = res.data?.id as string;
        if (!id) throw new Error('Failed to create item');
        return id;
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to create item');
        throw e;
      } finally { setSaving(false); }
    },
    reset: () => {
      setProductName('');
      setDescription('');
      setSupplierId('');
      setCurrency(defaultCurrency);
      setCurrencyTouched(false);
      setAccountId('');
      setEffectiveStart(new Date().toISOString().slice(0,10));
      setEffectiveEnd('');
      setStatus(STATUS_ENABLED);
      setDisabledAt(null);
      setOwnerItId('');
      setOwnerBizId('');
      setAnalyticsCategoryId('');
      setNotes('');
      onDirtyChange?.(false);
    },
  }), [dirty, productName, description, supplierId, currency, accountId, effectiveStart, effectiveEnd, status, disabledAt, ownerItId, ownerBizId, analyticsCategoryId, notes, onDirtyChange, defaultCurrency]);

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      {hasObsoleteAccount && (
        <Alert severity="warning">
          Obsolete account detected. The selected account does not belong to the company's Chart of Accounts. Please update the account.
        </Alert>
      )}
      <Typography variant="subtitle2">General Information</Typography>
      <TextField label="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} disabled={saving} required fullWidth InputLabelProps={{ shrink: true }} />
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} disabled={saving} fullWidth InputLabelProps={{ shrink: true }} />
      <SupplierSelect value={supplierId} onChange={(v) => setSupplierId(v ?? '')} disabled={saving} required />
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
        onChange={(_event, option) => {
          setCurrencyTouched(true);
          setCurrency(option?.code ?? fallbackCurrencyOption.code);
        }}
        getOptionLabel={(option) => `${option.code} — ${option.name}`}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        disabled={saving}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Currency"
            required
            helperText={`Default ${defaultCurrency}`}
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <CompanySelect label="Paying Company" value={payingCompanyId || null} onChange={(v) => setPayingCompanyId(v ?? '')} required />
      <AccountSelect value={accountId} onChange={(v) => setAccountId(v ?? '')} disabled={saving} required companyId={payingCompanyId || undefined} />
      <DateEUField label="Effective Start" valueYmd={effectiveStart || ''} onChangeYmd={setEffectiveStart} disabled={saving} required />
      <DateEUField label="Effective End" valueYmd={effectiveEnd || ''} onChangeYmd={setEffectiveEnd} disabled={saving} />
      <UserSelect label="IT Owner" value={ownerItId} onChange={(v) => setOwnerItId(v ?? '')} />
      <UserSelect label="Business Owner" value={ownerBizId} onChange={(v) => setOwnerBizId(v ?? '')} />
      <AnalyticsCategorySelect value={analyticsCategoryId || null} onChange={(val) => setAnalyticsCategoryId(val ?? '')} />
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
