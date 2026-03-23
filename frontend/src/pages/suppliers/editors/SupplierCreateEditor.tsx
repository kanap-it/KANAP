import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Stack, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';
import api from '../../../api';
import useZodForm from '../../../hooks/useZodForm';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import { supplierFormSchema, SupplierFormValues } from '../../forms/SupplierForm';
import { STATUS_ENABLED, deriveStatusFromDisabledAt } from '../../../constants/status';

export type SupplierCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string | null>;
  reset: () => void;
};

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

const DEFAULT_VALUES: SupplierFormValues = {
  name: '',
  erp_supplier_id: null,
  notes: null,
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

const toPayload = (values: SupplierFormValues) => {
  const disabled_at = values.disabled_at ?? null;
  const base = {
    ...values,
    status: deriveStatusFromDisabledAt(disabled_at),
    disabled_at,
  };
  return normalizeEmptyToNull(base);
};

export default forwardRef<SupplierCreateEditorHandle, Props>(function SupplierCreateEditor(
  { onDirtyChange },
  ref,
) {
  const [saving, setSaving] = React.useState(false);
  const { t } = useTranslation(['master-data', 'common']);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useZodForm<SupplierFormValues>({
    schema: supplierFormSchema,
    defaultValues: DEFAULT_VALUES,
  });
  const { register, control, formState, handleSubmit, setValue, watch, reset } = form;

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  const statusValue = watch('status');
  const disabledAtValue = watch('disabled_at');
  const err = formState.errors as any;

  const save = React.useCallback(async (): Promise<string | null> => {
    if (saving) return null;
    setSaving(true);
    setServerError(null);
    let createdId: string | null = null;
    const submit = handleSubmit(
      async (values) => {
        try {
          const res = await api.post('/suppliers', toPayload(values));
          createdId = String(res.data?.id ?? res.data?.uuid ?? '');
          if (!createdId) createdId = null;
          onDirtyChange?.(false);
        } catch (e: any) {
          const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToCreate', { entity: t('suppliers.entity') });
          setServerError(msg);
          throw e;
        }
      },
      async (errors) => {
        setServerError(t('shared.messages.fixValidationErrors'));
        throw errors;
      },
    );
    try {
      await submit();
      return createdId;
    } finally {
      setSaving(false);
    }
  }, [handleSubmit, onDirtyChange, saving]);

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
      />
      <TextField
        label="ERP Supplier ID"
        {...register('erp_supplier_id')}
        error={!!err.erp_supplier_id}
        helperText={err.erp_supplier_id?.message as string}
        InputLabelProps={{ shrink: true }}
      />
      {/* Legacy free-text contacts removed. Link contacts after creation. */}
      <TextField
        label="Notes"
        multiline
        minRows={2}
        {...register('notes')}
        error={!!err.notes}
        helperText={err.notes?.message as string}
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
