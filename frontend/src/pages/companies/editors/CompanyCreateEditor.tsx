import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import useZodForm from '../../../hooks/useZodForm';
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, CountryOption, CurrencyOption } from '../../../constants/isoOptions';
import { companyFormSchema, CompanyFormValues, normalizeEmptyToNull } from '../companyFormSchema';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import { STATUS_ENABLED, deriveStatusFromDisabledAt } from '../../../constants/status';

export type CompanyCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string | null>;
  reset: () => void;
};

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

const DEFAULT_VALUES: CompanyFormValues = {
  name: '',
  coa_id: null,
  country_iso: '',
  city: '',
  postal_code: null,
  address1: null,
  address2: null,
  reg_number: null,
  vat_number: null,
  state: null,
  base_currency: '',
  status: STATUS_ENABLED,
  disabled_at: null,
  notes: null,
};

const toPayload = (values: CompanyFormValues) => {
  const disabled_at = values.disabled_at ?? null;
  const base = {
    ...values,
    status: deriveStatusFromDisabledAt(disabled_at),
    disabled_at,
    country_iso: values.country_iso.toUpperCase(),
    base_currency: values.base_currency.toUpperCase(),
  };
  return normalizeEmptyToNull(base);
};

export default forwardRef<CompanyCreateEditorHandle, Props>(function CompanyCreateEditor(
  { onDirtyChange },
  ref,
) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useZodForm<CompanyFormValues>({
    schema: companyFormSchema,
    defaultValues: DEFAULT_VALUES,
  });
  const { register, control, formState, handleSubmit, reset, setValue, watch } = form;

  React.useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  const disabled = saving;
  const statusValue = watch('status');
  const disabledAtValue = watch('disabled_at');
  const err = formState.errors as any;

  const save = React.useCallback(async () => {
    if (disabled) return null;
    setSaving(true);
    setServerError(null);
    let createdId: string | null = null;
    const submit = handleSubmit(
      async (values) => {
        const payload = toPayload(values);
        try {
          const res = await api.post('/companies', payload);
          createdId = res.data?.id ?? null;
          onDirtyChange?.(false);
          queryClient.invalidateQueries({ queryKey: ['companies'] });
        } catch (e: any) {
          const msg = e?.response?.data?.message || e?.message || 'Failed to create company';
          setServerError(msg);
          throw e;
        }
      },
      async (errors) => {
        setServerError('Please fix validation errors before saving.');
        throw errors;
      },
    );
    try {
      await submit();
      return createdId;
    } finally {
      setSaving(false);
    }
  }, [disabled, handleSubmit, onDirtyChange, queryClient]);

  const resetEditor = React.useCallback(() => {
    reset({ ...DEFAULT_VALUES }, { keepDirty: false, keepTouched: false });
    setServerError(null);
    onDirtyChange?.(false);
  }, [onDirtyChange, reset]);

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => formState.isDirty,
      save,
      reset: () => { resetEditor(); },
    }),
    [formState.isDirty, resetEditor, save],
  );

  // Load CoA list, filter by selected country and include global default; preselect per defaulting rules
  const country = watch('country_iso');
  const [allCoas, setAllCoas] = React.useState<Array<{ id: string; code: string; name: string; country_iso: string | null; scope: 'GLOBAL' | 'COUNTRY'; is_default: boolean; is_global_default: boolean }>>([]);
  const [coaOptions, setCoaOptions] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/chart-of-accounts', { params: { page: 1, limit: 1000 } });
        if (!alive) return;
        const items = (res.data?.items || []) as any[];
        const mapped = items.map((i) => ({ id: i.id, code: i.code, name: i.name, country_iso: i.country_iso ?? null, scope: i.scope as 'GLOBAL'|'COUNTRY', is_default: !!i.is_default, is_global_default: !!i.is_global_default }));
        setAllCoas(mapped);
      } catch {
        if (!alive) return;
        setAllCoas([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Filter options when country changes and preselect
  React.useEffect(() => {
    const options = allCoas
      .filter((i) => (country ? (i.scope === 'COUNTRY' && i.country_iso === country) : true) || i.is_global_default || i.scope === 'GLOBAL')
      .filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx)
      .map((i) => ({ id: i.id, code: i.code, name: i.name }));
    setCoaOptions(options);
    // Preselect: country default if available else global default else any GLOBAL
    const current = watch('coa_id');
    if (!current && country) {
      const preferred = allCoas.find((i) => i.scope === 'COUNTRY' && country && i.country_iso === country && i.is_default);
      const global = allCoas.find((i) => i.is_global_default) || allCoas.find((i) => i.scope === 'GLOBAL');
      const next = preferred?.id || global?.id || null;
      if (next) setValue('coa_id', next, { shouldDirty: true, shouldValidate: true });
    }
  }, [country, allCoas, setValue, watch]);

  const renderCountryField = useMemo(() => (
    <Controller
      control={control}
      name="country_iso"
      render={({ field }) => {
        const value = typeof field.value === 'string' ? field.value.toUpperCase() : '';
        const selected: CountryOption | null =
          COUNTRY_OPTIONS.find((option) => option.code === value) ??
          (value ? { code: value, name: 'Unknown country code' } : null);
        return (
          <Autocomplete<CountryOption, false, false, false>
            options={COUNTRY_OPTIONS}
            value={selected}
            disabled={disabled}
            onChange={(_event, option) => field.onChange(option?.code ?? '')}
            onBlur={field.onBlur}
            getOptionLabel={(option) => `${option.code} — ${option.name}`}
            isOptionEqualToValue={(option, val) => option.code === val.code}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Country"
                placeholder="Search by name or code"
                required
                error={!!err.country_iso}
                helperText={err.country_iso?.message as string}
              />
            )}
          />
        );
      }}
    />
  ), [control, disabled, err.country_iso]);

  const renderCoaField = useMemo(() => (
    <Controller
      control={control}
      name="coa_id"
      render={({ field }) => {
        const selected = coaOptions.find((o) => o.id === field.value) || null;
        return (
          <Autocomplete<{ id: string; code: string; name: string }, false, false, false>
            options={coaOptions}
            value={selected}
            disabled={disabled}
            onChange={(_event, option) => field.onChange(option?.id ?? null)}
            onBlur={field.onBlur}
            getOptionLabel={(option) => `${option.code} — ${option.name}`}
            isOptionEqualToValue={(option, val) => option.id === val.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Chart of Accounts"
                placeholder="Search CoA"
                error={!!err.coa_id}
                helperText={err.coa_id?.message as string}
              />
            )}
          />
        );
      }}
    />
  ), [control, disabled, err.coa_id, coaOptions]);

  const renderCurrencyField = useMemo(() => (
    <Controller
      control={control}
      name="base_currency"
      render={({ field }) => {
        const value = typeof field.value === 'string' ? field.value.toUpperCase() : '';
        const selected: CurrencyOption | null =
          CURRENCY_OPTIONS.find((option) => option.code === value) ??
          (value ? { code: value, name: 'Unknown currency code' } : null);
        return (
          <Autocomplete<CurrencyOption, false, false, false>
            options={CURRENCY_OPTIONS}
            value={selected}
            disabled={disabled}
            onChange={(_event, option) => field.onChange(option?.code ?? '')}
            onBlur={field.onBlur}
            getOptionLabel={(option) => `${option.code} — ${option.name}`}
            isOptionEqualToValue={(option, val) => option.code === val.code}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Base Currency"
                placeholder="Search by name or code"
                required
                error={!!err.base_currency}
                helperText={err.base_currency?.message as string}
              />
            )}
          />
        );
      }}
    />
  ), [control, disabled, err.base_currency]);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Company Information</Typography>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}
      <TextField
        label="Name"
        required
        fullWidth
        disabled={disabled}
        error={!!err.name}
        helperText={err.name?.message as string}
        InputLabelProps={{ shrink: true }}
        {...register('name')}
      />
      {renderCountryField}
      {renderCoaField}
      <TextField
        label="Address 1"
        disabled={disabled}
        error={!!err.address1}
        helperText={err.address1?.message as string}
        InputLabelProps={{ shrink: true }}
        {...register('address1')}
      />
      <TextField
        label="Address 2"
        disabled={disabled}
        error={!!err.address2}
        helperText={err.address2?.message as string}
        InputLabelProps={{ shrink: true }}
        {...register('address2')}
      />
      <TextField
        label="Postal Code"
        disabled={disabled}
        error={!!err.postal_code}
        helperText={err.postal_code?.message as string}
        InputLabelProps={{ shrink: true }}
        {...register('postal_code')}
      />
      <TextField
        label="City"
        required
        disabled={disabled}
        error={!!err.city}
        helperText={err.city?.message as string}
        InputLabelProps={{ shrink: true }}
        {...register('city')}
      />
      <TextField
        label="State"
        disabled={disabled}
        error={!!err.state}
        helperText={err.state?.message as string}
        InputLabelProps={{ shrink: true }}
        {...register('state')}
      />
      <TextField
        label="Registration #"
        disabled={disabled}
        error={!!err.reg_number}
        helperText={err.reg_number?.message as string}
        InputLabelProps={{ shrink: true }}
        {...register('reg_number')}
      />
      <TextField
        label="VAT #"
        disabled={disabled}
        error={!!err.vat_number}
        helperText={err.vat_number?.message as string}
        InputLabelProps={{ shrink: true }}
        {...register('vat_number')}
      />
      {renderCurrencyField}
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <StatusLifecycleField
            status={field.value ?? STATUS_ENABLED}
            onStatusChange={(next) => field.onChange(next)}
            disabledAt={disabledAtValue ?? null}
            onDisabledAtChange={(next) => setValue('disabled_at', next, {
              shouldDirty: true,
              shouldValidate: true,
            })}
            disabled={disabled}
            statusLabel="Enabled"
            statusName={field.name}
            statusError={!!err.status}
            statusHelperText={err.status?.message as string}
            disabledAtName="disabled_at"
            disabledAtError={!!err.disabled_at}
            disabledAtHelperText={err.disabled_at?.message as string}
          />
        )}
      />
      <TextField
        label="Notes"
        disabled={disabled}
        error={!!err.notes}
        helperText={err.notes?.message as string}
        InputLabelProps={{ shrink: true }}
        multiline
        minRows={3}
        {...register('notes')}
      />
    </Stack>
  );
});
