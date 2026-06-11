import React, { forwardRef, useImperativeHandle } from 'react';
import { Stack, TextField, Alert, Typography, Autocomplete } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import SupplierSelect from '../../../components/fields/SupplierSelect';
import CompanySelect from '../../../components/fields/CompanySelect';
import AccountSelect from '../../../components/fields/AccountSelect';
import api from '../../../api';
import { CURRENCY_OPTIONS, CurrencyOption } from '../../../constants/isoOptions';
import useCurrencySettings from '../../../hooks/useCurrencySettings';
import DateEUField from '../../../components/fields/DateEUField';
import { deepEqual } from '../../../lib/deepEqual';
import type { CapexInvestmentType, CapexPpeType } from '../workspace/CapexPropertiesDrawer';
import type { CapexPriority } from '../workspace/CapexMetadataBar';

export type CapexInfoCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string>;
  reset: () => void;
};

type Props = { onDirtyChange?: (dirty: boolean) => void };

export default forwardRef<CapexInfoCreateEditorHandle, Props>(function CapexInfoCreateEditor({ onDirtyChange }, ref) {
  const { t } = useTranslation(['ops', 'common']);
  const [description, setDescription] = React.useState('');
  const [supplierId, setSupplierId] = React.useState<string>('');
  const [ppeType, setPpeType] = React.useState<CapexPpeType>('hardware');
  const [investmentType, setInvestmentType] = React.useState<CapexInvestmentType>('replacement');
  const [priority, setPriority] = React.useState<CapexPriority>('medium');
  const { data: currencySettings } = useCurrencySettings();
  const defaultCurrency = React.useMemo(
    () => currencySettings?.defaultCapexCurrency?.toUpperCase() ?? 'EUR',
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
  const [effectiveStart, setEffectiveStart] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [effectiveEnd, setEffectiveEnd] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');
  const [payingCompanyId, setPayingCompanyId] = React.useState<string>('');
  const [accountId, setAccountId] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!currencyTouched) setCurrency(defaultCurrency);
  }, [defaultCurrency, currencyTouched]);

  // Check for obsolete account (account from a different CoA than the paying company's CoA)
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

  const ppeOptions = React.useMemo(() => [
    { value: 'hardware', label: t('capex.ppeTypes.hardware') },
    { value: 'software', label: t('capex.ppeTypes.software') },
  ], [t]);
  const investmentOptions = React.useMemo(() => [
    { value: 'replacement', label: t('capex.investmentTypes.replacement') },
    { value: 'capacity', label: t('capex.investmentTypes.capacity') },
    { value: 'productivity', label: t('capex.investmentTypes.productivity') },
    { value: 'security', label: t('capex.investmentTypes.security') },
    { value: 'conformity', label: t('capex.investmentTypes.conformity') },
    { value: 'business_growth', label: t('capex.investmentTypes.business_growth') },
    { value: 'other', label: t('capex.investmentTypes.other') },
  ], [t]);
  const priorityOptions = React.useMemo(() => [
    { value: 'mandatory', label: t('capex.priorityTypes.mandatory') },
    { value: 'high', label: t('capex.priorityTypes.high') },
    { value: 'medium', label: t('capex.priorityTypes.medium') },
    { value: 'low', label: t('capex.priorityTypes.low') },
  ], [t]);

  const baseline = React.useMemo(() => ({
    description: '',
    supplier_id: '',
    ppe_type: 'hardware',
    investment_type: 'replacement',
    priority: 'medium',
    currency: defaultCurrency,
    effective_start: effectiveStart,
    effective_end: '',
    notes: '',
    paying_company_id: '',
    account_id: '',
  }), [defaultCurrency, effectiveStart]);

  const current = {
    description,
    supplier_id: supplierId,
    ppe_type: ppeType,
    investment_type: investmentType,
    priority,
    currency,
    effective_start: effectiveStart,
    effective_end: effectiveEnd,
    notes,
    paying_company_id: payingCompanyId,
    account_id: accountId,
  };
  const dirty = React.useMemo(() => !deepEqual(current, baseline), [current, baseline]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    save: async () => {
      setSaving(true);
      setError(null);
      try {
        if (!description.trim()) throw new Error(t('capex.editor.descriptionRequired'));
        if ((currency || '').trim().length !== 3) throw new Error(t('capex.editor.currencyMust3'));
        if (!effectiveStart) throw new Error(t('capex.editor.effectiveStartRequired'));
        if (!payingCompanyId) throw new Error(t('capex.editor.payingCompanyRequired'));

        const toNull = (v: unknown) => (v === '' || v === undefined ? null : v);
        const payload = {
          description: description.trim(),
          supplier_id: toNull(supplierId),
          ppe_type: ppeType,
          investment_type: investmentType,
          priority,
          currency: currency.toUpperCase(),
          effective_start: effectiveStart,
          effective_end: toNull(effectiveEnd),
          notes: toNull(notes),
          paying_company_id: toNull(payingCompanyId),
          account_id: toNull(accountId),
        };
        const res = await api.post('/capex-items', payload);
        const id = res.data?.id as string;
        if (!id) throw new Error(t('capex.editor.failedToCreate'));
        return id;
      } catch (e: any) {
        setError(getApiErrorMessage(e, t, t('capex.editor.failedToCreate')));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    reset: () => {
      setDescription('');
      setSupplierId('');
      setPpeType('hardware');
      setInvestmentType('replacement');
      setPriority('medium');
      setCurrency(defaultCurrency);
      setCurrencyTouched(false);
      setEffectiveStart(new Date().toISOString().slice(0, 10));
      setEffectiveEnd('');
      setNotes('');
      setPayingCompanyId('');
      setAccountId('');
      onDirtyChange?.(false);
    },
  }), [dirty, description, supplierId, ppeType, investmentType, priority, currency, effectiveStart, effectiveEnd, notes, payingCompanyId, accountId, onDirtyChange, defaultCurrency, t]);

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      {hasObsoleteAccount && (
        <Alert severity="warning">
          {t('capex.editor.obsoleteAccount')}
        </Alert>
      )}
      <Typography variant="subtitle2">{t('capex.editor.generalInfo')}</Typography>
      {/* Single-line: the description is the workspace title (edited via the shell's
          single-line title editor) — multiline input here would get flattened later. */}
      <TextField
        label={t('capex.fields.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={saving}
        required
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
      <SupplierSelect label={t('capex.fields.supplier')} value={supplierId} onChange={(v) => setSupplierId(v ?? '')} disabled={saving} />
      <CompanySelect label={t('capex.fields.payingCompany')} value={payingCompanyId || null} onChange={(v) => setPayingCompanyId(v ?? '')} disabled={saving} required />
      <AccountSelect label={t('capex.fields.account')} value={accountId} onChange={(v) => setAccountId(v ?? '')} companyId={payingCompanyId || undefined} disabled={!payingCompanyId || saving} />
      <EnumAutocomplete label={t('capex.fields.ppeType')} value={ppeType} onChange={(v) => setPpeType(v as CapexPpeType)} options={ppeOptions} required />
      <EnumAutocomplete label={t('capex.fields.investmentType')} value={investmentType} onChange={(v) => setInvestmentType(v as CapexInvestmentType)} options={investmentOptions} required />
      <EnumAutocomplete label={t('capex.fields.priority')} value={priority} onChange={(v) => setPriority(v as CapexPriority)} options={priorityOptions} required />
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
        disabled={saving}
        getOptionLabel={(option) => `${option.code} - ${option.name}`}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('capex.fields.currency')}
            required
            helperText={t('capex.editor.defaultCurrency', { currency: defaultCurrency })}
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <DateEUField label={t('capex.fields.effectiveStart')} valueYmd={effectiveStart || ''} onChangeYmd={setEffectiveStart} disabled={saving} required />
      <DateEUField label={t('capex.fields.effectiveEnd')} valueYmd={effectiveEnd || ''} onChangeYmd={setEffectiveEnd} disabled={saving} />
      <TextField label={t('capex.fields.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth InputLabelProps={{ shrink: true }} />
    </Stack>
  );
});
