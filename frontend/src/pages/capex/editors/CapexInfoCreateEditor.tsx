import React, { forwardRef, useImperativeHandle } from 'react';
import { Stack, TextField, Alert, Typography, Autocomplete } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import CompanySelect from '../../../components/fields/CompanySelect';
import AccountSelect from '../../../components/fields/AccountSelect';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import api from '../../../api';
import { CURRENCY_OPTIONS, CurrencyOption } from '../../../constants/isoOptions';
import useCurrencySettings from '../../../hooks/useCurrencySettings';
import { STATUS_ENABLED, StatusValue, deriveStatusFromDisabledAt, normalizeDisabledAtInput } from '../../../constants/status';
import DateEUField from '../../../components/fields/DateEUField';
import { deepEqual } from '../../../lib/deepEqual';

export type CapexInfoCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string>; // returns new id
  reset: () => void;
};

type Props = { onDirtyChange?: (dirty: boolean) => void };

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

export default forwardRef<CapexInfoCreateEditorHandle, Props>(function CapexInfoCreateEditor({ onDirtyChange }, ref) {
  const { t } = useTranslation(['ops', 'common']);
  const [description, setDescription] = React.useState('');
  const [ppeType, setPpeType] = React.useState<'hardware' | 'software'>('hardware');
  const [investmentType, setInvestmentType] = React.useState<(typeof INVESTMENT_OPTIONS)[number]['value']>('replacement');
  const [priority, setPriority] = React.useState<(typeof PRIORITY_OPTIONS)[number]['value']>('medium');
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
  const [effectiveStart, setEffectiveStart] = React.useState<string>(() => new Date().toISOString().slice(0,10));
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
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    if (!currencyTouched) {
      setCurrency(defaultCurrency);
    }
  }, [defaultCurrency, currencyTouched]);

  const baseline = React.useMemo(() => ({
    description: '', ppe_type: 'hardware', investment_type: 'replacement', priority: 'medium', currency: defaultCurrency,
    effective_start: effectiveStart, effective_end: '', status: STATUS_ENABLED, disabled_at: null, notes: '', company_id: null, account_id: '',
  }), [defaultCurrency, effectiveStart]);

  const current = { description, ppe_type: ppeType, investment_type: investmentType, priority, currency, effective_start: effectiveStart, effective_end: effectiveEnd, status, disabled_at: disabledAt, notes, company_id: companyId, account_id: accountId };
  const dirty = React.useMemo(() => !deepEqual(current, baseline), [current, baseline]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    save: async () => {
      setSaving(true);
      setError(null);
      try {
        // allow any pending field selection to flush into state
        await new Promise((r) => setTimeout(r, 0));
        if (!description.trim()) throw new Error(t('capex.editor.descriptionRequired'));
        if ((currency || '').trim().length !== 3) throw new Error(t('capex.editor.currencyMust3'));
        if (!effectiveStart) throw new Error(t('capex.editor.effectiveStartRequired'));

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
        };
        console.log('[CAPEX][create] payload', payload);
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
      setPpeType('hardware');
      setInvestmentType('replacement');
      setPriority('medium');
      setCurrency(defaultCurrency);
      setCurrencyTouched(false);
      setEffectiveStart(new Date().toISOString().slice(0,10));
      setEffectiveEnd('');
      setStatus(STATUS_ENABLED);
      setDisabledAt(null);
      setNotes('');
      setCompanyId(null);
      setAccountId('');
      onDirtyChange?.(false);
    },
  }), [dirty, description, ppeType, investmentType, priority, currency, effectiveStart, effectiveEnd, status, disabledAt, notes, companyId, accountId, onDirtyChange, defaultCurrency]);

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      {hasObsoleteAccount && (
        <Alert severity="warning">
          {t('capex.editor.obsoleteAccount')}
        </Alert>
      )}
      <Typography variant="subtitle2">{t('capex.editor.generalInfo')}</Typography>
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} required fullWidth multiline minRows={2} InputLabelProps={{ shrink: true }} />
      <CompanySelect value={companyId} onChange={setCompanyId} />
      <AccountSelect value={accountId} onChange={(v) => setAccountId(v ?? '')} companyId={companyId || undefined} disabled={!companyId || saving} />
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
        onChange={(_event, option) => {
          setCurrencyTouched(true);
          setCurrency(option?.code ?? fallbackCurrencyOption.code);
        }}
        disabled={saving}
        getOptionLabel={(option) => `${option.code} — ${option.name}`}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Currency"
            required
            helperText={t('capex.editor.defaultCurrency', { currency: defaultCurrency })}
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <DateEUField label="Effective Start" valueYmd={effectiveStart || ''} onChangeYmd={setEffectiveStart} disabled={saving} required />
      <DateEUField label="Effective End" valueYmd={effectiveEnd || ''} onChangeYmd={setEffectiveEnd} disabled={saving} />
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
