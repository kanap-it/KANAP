import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';
import api from '../../../api';
import useZodForm from '../../../hooks/useZodForm';
import CompanySelect from '../../../components/fields/CompanySelect';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import { departmentFormSchema, DepartmentFormValues } from '../../forms/DepartmentForm';
import { STATUS_ENABLED, deriveStatusFromDisabledAt } from '../../../constants/status';
import useDebouncedValue from '../../../hooks/useDebouncedValue';

export type DepartmentCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string | null>; // returns new ID
  reset: () => void;
};

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

const DEFAULT_VALUES: DepartmentFormValues = {
  company_id: '',
  name: '',
  description: null,
  status: STATUS_ENABLED,
  disabled_at: null,
};

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

export default forwardRef<DepartmentCreateEditorHandle, Props>(function DepartmentCreateEditor(
  { onDirtyChange },
  ref,
) {
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useZodForm<DepartmentFormValues>({
    schema: departmentFormSchema,
    defaultValues: DEFAULT_VALUES,
  });
  const { register, control, formState, handleSubmit, setValue, watch, reset } = form;

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  const statusValue = watch('status');
  const disabledAtValue = watch('disabled_at');
  const nameValueRaw = watch('name');
  const nameValue = useDebouncedValue((nameValueRaw || '').trim(), 300);
  const err = formState.errors as any;

  // Load existing departments with the same name (active ones), to filter company options
  const { data: conflictingCompanies } = useQuery({
    queryKey: ['departments', 'existing-by-name', (nameValue || '').toLowerCase()],
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
      const ids = Array.from(new Set(all.map((it) => it.company_id).filter(Boolean)));
      return ids as string[];
    },
  });

  const save = React.useCallback(async (): Promise<string | null> => {
    if (saving) return null;
    setSaving(true);
    setServerError(null);
    let createdId: string | null = null;
    const submit = handleSubmit(
      async (values) => {
        try {
          const res = await api.post('/departments', toPayload(values));
          createdId = String(res.data?.id ?? res.data?.uuid ?? res.data?.id ?? '');
          if (!createdId) createdId = null;
          onDirtyChange?.(false);
          queryClient.invalidateQueries({ queryKey: ['departments'] });
        } catch (e: any) {
          const msg = e?.response?.data?.message || e?.message || 'Failed to create department';
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
  }, [handleSubmit, onDirtyChange, queryClient, saving]);

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => formState.isDirty,
      save,
      reset: () => { reset(DEFAULT_VALUES, { keepDirty: false, keepTouched: false }); onDirtyChange?.(false); setServerError(null); },
    }),
    [formState.isDirty, save, reset, onDirtyChange],
  );

  return (
    <Stack spacing={2}>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}
      <TextField 
        label="Name" 
        required 
        {...register('name')} 
        error={!!err.name} 
        helperText={err.name?.message as string}
        InputLabelProps={{ shrink: true }}
        inputProps={{ autoComplete: 'off', spellCheck: 'false' as any }}
        variant="outlined"
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
            error={!!(err.company_id)}
            helperText={err.company_id?.message as string}
            required
          />
        )}
      />
      <TextField 
        label="Description" 
        {...register('description')} 
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
          />
        )}
      />
    </Stack>
  );
});
