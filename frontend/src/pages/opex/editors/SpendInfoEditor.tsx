import React, { forwardRef, useImperativeHandle } from 'react';
import { Stack, TextField, Alert, Typography, Autocomplete } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import SupplierSelect from '../../../components/fields/SupplierSelect';
import CompanySelect from '../../../components/fields/CompanySelect';
import AccountSelect from '../../../components/fields/AccountSelect';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import UserSelect from '../../../components/fields/UserSelect';
import AnalyticsCategorySelect from '../../../components/fields/AnalyticsCategorySelect';
import { CURRENCY_OPTIONS, CurrencyOption } from '../../../constants/isoOptions';
import useCurrencySettings from '../../../hooks/useCurrencySettings';
import { STATUS_ENABLED, StatusValue, deriveStatusFromDisabledAt, normalizeDisabledAtInput } from '../../../constants/status';
import { deepEqual } from '../../../lib/deepEqual';
import DateEUField from '../../../components/fields/DateEUField';

export type SpendInfoEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
};

export default forwardRef<SpendInfoEditorHandle, Props>(function SpendInfoEditor({ id, onDirtyChange }, ref) {
  const { t } = useTranslation(['ops', 'common']);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['spend', id],
    queryFn: async () => {
      const res = await api.get(`/spend-items/${id}`);
      return res.data;
    },
  });

  const [productName, setProductName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [supplierId, setSupplierId] = React.useState<string>('');
  const { data: currencySettings } = useCurrencySettings();
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
    const defaultCode = currencySettings?.defaultSpendCurrency?.toUpperCase() ?? 'EUR';
    return currencyOptions.find((opt) => opt.code === defaultCode)
      ?? currencyOptions[0]
      ?? ({ code: defaultCode, name: 'Unknown currency code' } as CurrencyOption);
  }, [currencyOptions, currencySettings]);

  const [currency, setCurrency] = React.useState('EUR');
  const [accountId, setAccountId] = React.useState<string>('');
  const [payingCompanyId, setPayingCompanyId] = React.useState<string>('');
  const [effectiveStart, setEffectiveStart] = React.useState<string>('');
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

  const [baseline, setBaseline] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

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
    if (!isLoading && data) {
      // Keep property order consistent with `current` to ensure
      // JSON.stringify(baseline) === JSON.stringify(current) when unchanged.
      const normalizedDisabledAt = data.disabled_at ? new Date(data.disabled_at).toISOString() : null;
      const b = {
        product_name: data.product_name || '',
        description: data.description || '',
        supplier_id: data.supplier_id || '',
        currency: (data.currency || 'EUR').toUpperCase(),
        account_id: data.account_id || '',
        paying_company_id: data.paying_company_id || '',
        effective_start: data.effective_start ? String(data.effective_start).slice(0, 10) : new Date().toISOString().slice(0, 10),
        effective_end: data.effective_end ? String(data.effective_end).slice(0, 10) : '',
        status: deriveStatusFromDisabledAt(normalizedDisabledAt),
        disabled_at: normalizedDisabledAt,
        owner_it_id: data.owner_it_id || '',
        owner_business_id: data.owner_business_id || '',
        analytics_category_id: data.analytics_category_id || '',
        notes: data.notes || '',
      };
      setProductName(b.product_name);
      setDescription(b.description);
      setSupplierId(b.supplier_id);
      setCurrency(b.currency);
      setAccountId(b.account_id);
      setPayingCompanyId(b.paying_company_id);
      setEffectiveStart(b.effective_start);
      setEffectiveEnd(b.effective_end);
      setStatus(deriveStatusFromDisabledAt(b.disabled_at));
      setDisabledAt(b.disabled_at);
      setOwnerItId(b.owner_it_id);
      setOwnerBizId(b.owner_business_id);
      setAnalyticsCategoryId(b.analytics_category_id);
      setNotes(b.notes);
      setBaseline(b);
      onDirtyChange?.(false);
    }
  }, [isLoading, data, onDirtyChange]);

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
  const dirty = baseline ? !deepEqual(current, baseline) : false;
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    save: async () => {
      if (!dirty) return;
      setSaving(true);
      setSaveError(null);
      try {
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
        await api.patch(`/spend-items/${id}`, payload);
        await queryClient.invalidateQueries({ queryKey: ['spend', id] });
        const newBaseline = { ...current };
        setBaseline(newBaseline);
        onDirtyChange?.(false);
      } catch (e: any) {
        setSaveError(getApiErrorMessage(e, t, t('opex.editor.failedToSave')));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    reset: () => {
      if (!baseline) return;
      setProductName(baseline.product_name || '');
      setDescription(baseline.description || '');
      setSupplierId(baseline.supplier_id || '');
      setCurrency(baseline.currency || 'EUR');
      setAccountId(baseline.account_id || '');
      setEffectiveStart(baseline.effective_start || '');
      setEffectiveEnd(baseline.effective_end || '');
      setStatus(deriveStatusFromDisabledAt(baseline.disabled_at));
      setDisabledAt(baseline.disabled_at || null);
      setOwnerItId(baseline.owner_it_id || '');
      setOwnerBizId(baseline.owner_business_id || '');
      setAnalyticsCategoryId(baseline.analytics_category_id || '');
      setNotes(baseline.notes || '');
      onDirtyChange?.(false);
    },
  }), [dirty, id, productName, description, supplierId, currency, accountId, effectiveStart, effectiveEnd, status, disabledAt, ownerItId, ownerBizId, analyticsCategoryId, notes, onDirtyChange, queryClient]);

  if (error) return <Alert severity="error">{t('opex.editor.failedToLoad')}</Alert>;

  return (
    <Stack spacing={2}>
      {saveError && <Alert severity="error">{saveError}</Alert>}
      {hasObsoleteAccount && (
        <Alert severity="warning">
          {t('opex.editor.obsoleteAccount')}
        </Alert>
      )}
      <Typography variant="subtitle2">{t('opex.editor.generalInfo')}</Typography>
      <TextField label="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} disabled={isLoading || saving} required fullWidth InputLabelProps={{ shrink: true }} />
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} disabled={isLoading || saving} fullWidth InputLabelProps={{ shrink: true }} />
      <SupplierSelect value={supplierId} onChange={(v) => setSupplierId(v ?? '')} disabled={isLoading || saving} required />
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
        getOptionLabel={(option) => `${option.code} — ${option.name}`}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        disabled={isLoading || saving}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Currency"
            required
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <CompanySelect label="Paying Company" value={payingCompanyId || null} onChange={(v) => setPayingCompanyId(v ?? '')} required />
      <AccountSelect value={accountId} onChange={(v) => setAccountId(v ?? '')} disabled={isLoading || saving} companyId={payingCompanyId || undefined} required />
      <DateEUField label="Effective Start" valueYmd={effectiveStart || ''} onChangeYmd={setEffectiveStart} disabled={isLoading || saving} required />
      <DateEUField label="Effective End" valueYmd={effectiveEnd || ''} onChangeYmd={setEffectiveEnd} disabled={isLoading || saving} />
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
