import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Stack, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import useZodForm from '../../../hooks/useZodForm';
import CompanySelect from '../../../components/fields/CompanySelect';
import { useQuery } from '@tanstack/react-query';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import { departmentFormSchema, DepartmentFormValues } from '../../forms/DepartmentForm';
import { STATUS_ENABLED, deriveStatusFromDisabledAt, normalizeDisabledAtInput } from '../../../constants/status';
import useDebouncedValue from '../../../hooks/useDebouncedValue';

export type DepartmentOverviewEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
};

const DEFAULT_VALUES: DepartmentFormValues = {
  company_id: '',
  name: '',
  description: null,
  status: STATUS_ENABLED,
  disabled_at: null,
};

function toFormValues(data: any): DepartmentFormValues {
  const disabledAt = normalizeDisabledAtInput(data?.disabled_at);
  const status = deriveStatusFromDisabledAt(disabledAt);
  return {
    company_id: data?.company_id ?? '',
    name: data?.name ?? '',
    description: data?.description ?? null,
    status,
    disabled_at: disabledAt,
  };
}

function normalizeEmptyToNull<T extends Record<string, any>>(obj: T): T {
  const out: any = Array.isArray(obj) ? [] : {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === '') out[k] = null;
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = normalizeEmptyToNull(v as any);
    else out[k] = v;
  });
  return out;
}

const toPayload = (values: DepartmentFormValues) => {
  const disabled_at = values.disabled_at ?? null;
  const base = {
    ...values,
    status: deriveStatusFromDisabledAt(disabled_at),
    disabled_at,
  };
  return normalizeEmptyToNull(base);
};

export default forwardRef<DepartmentOverviewEditorHandle, Props>(function DepartmentOverviewEditor(
  { id, onDirtyChange, readOnly = false },
  ref,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['master-data', 'common']);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useZodForm<DepartmentFormValues>({
    schema: departmentFormSchema,
    defaultValues: DEFAULT_VALUES,
  });
  const { register, control, formState, reset, handleSubmit, setValue, watch } = form;

  const baselineRef = React.useRef<DepartmentFormValues>({ ...DEFAULT_VALUES });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setServerError(null);
      try {
        const res = await api.get(`/departments/${id}`);
        if (!active) return;
        const values = toFormValues(res.data);
        baselineRef.current = { ...values };
        reset(values, { keepDirty: false, keepTouched: false });
        onDirtyChange?.(false);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToLoad', { entity: t('departments.entity') });
        setServerError(msg);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id, onDirtyChange, reset]);

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  const disabled = loading || saving || readOnly;
  const statusValue = watch('status');
  const disabledAtValue = watch('disabled_at');
  const nameValueRaw = watch('name');
  const nameValue = useDebouncedValue((nameValueRaw || '').trim(), 300);
  const err = formState.errors as any;

  // Load existing departments with the same name (active), to filter company options (exclude current company if same)
  const { data: conflictingCompanies } = useQuery({
    queryKey: ['departments', 'existing-by-name', id, (nameValue || '').toLowerCase()],
    enabled: !!(nameValue && nameValue.length > 0),
    queryFn: async () => {
      const filterModel = { name: { filterType: 'text', type: 'equals', filter: nameValue } };
      const fetchByStatus = async (status: 'enabled' | 'disabled') => {
        const res = await api.get<{ items: Array<{ id: string; company_id: string }> }>(
          '/departments',
          { params: { limit: 1000, status, filters: JSON.stringify(filterModel) } }
        );
        return Array.isArray(res.data?.items) ? res.data.items : [];
      };
      const [enabledItems, disabledItems] = await Promise.all([
        fetchByStatus('enabled'),
        fetchByStatus('disabled'),
      ]);
      const all = [...enabledItems, ...disabledItems];
      const ids = Array.from(new Set(all
        .filter((it) => String(it.id) !== String(id))
        .map((it) => it.company_id)
        .filter(Boolean)));
      return ids as string[];
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setSaving(true);
    setServerError(null);
    try {
      await api.patch(`/departments/${id}`, toPayload(values));
      baselineRef.current = { ...values };
      onDirtyChange?.(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments', id] });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToSave', { entity: t('departments.entity') });
      setServerError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => formState.isDirty,
      save: async () => { await onSubmit(); },
      reset: () => { reset(baselineRef.current, { keepDirty: false, keepTouched: false }); onDirtyChange?.(false); setServerError(null); },
    }),
    [formState.isDirty, onSubmit, reset, onDirtyChange],
  );

  return (
    <Stack spacing={2}>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}
      {!readOnly ? null : (
        <Alert severity="info">{t('shared.messages.readOnlyAccess', { entity: t('departments.title').toLowerCase() })}</Alert>
      )}
      <TextField 
        label="Name" 
        required 
        {...register('name')} 
        disabled={disabled} 
        error={!!err.name} 
        helperText={err.name?.message as string}
        InputLabelProps={{ shrink: true }}
        inputProps={{ autoComplete: 'off', spellCheck: 'false' as any }}
      />
      <Controller
        control={control}
        name="company_id"
        render={({ field }) => (
          <CompanySelect
            label="Company"
            value={field.value as any}
            onChange={(v) => field.onChange(v)}
            excludeCompanyIds={conflictingCompanies}
            disabled={disabled}
            error={!!(err.company_id)}
            helperText={err.company_id?.message as string}
            required
          />
        )}
      />
      <TextField 
        label="Description" 
        {...register('description')} 
        disabled={disabled}
        InputLabelProps={{ shrink: true }}
      />
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
            statusLabel="Enabled"
            statusName={field.name}
            statusError={!!err.status}
            statusHelperText={err.status?.message as string}
            disabledAtName="disabled_at"
            disabledAtError={!!err.disabled_at}
            disabledAtHelperText={err.disabled_at?.message as string}
            disabled={disabled}
          />
        )}
      />
    </Stack>
  );
});
