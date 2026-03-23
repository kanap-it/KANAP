import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Stack, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import useZodForm from '../../../hooks/useZodForm';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import { supplierFormSchema, SupplierFormValues } from '../../forms/SupplierForm';
import { STATUS_ENABLED, deriveStatusFromDisabledAt, normalizeDisabledAtInput } from '../../../constants/status';

export type SupplierOverviewEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
};

const DEFAULT_VALUES: SupplierFormValues = {
  name: '',
  erp_supplier_id: null,
  notes: null,
  status: STATUS_ENABLED,
  disabled_at: null,
};

function toFormValues(data: any): SupplierFormValues {
  const disabledAt = normalizeDisabledAtInput(data?.disabled_at);
  const status = deriveStatusFromDisabledAt(disabledAt);
  return {
    name: data?.name ?? '',
    erp_supplier_id: data?.erp_supplier_id ?? null,
    notes: data?.notes ?? null,
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

const toPayload = (values: SupplierFormValues) => {
  const disabled_at = values.disabled_at ?? null;
  const base = {
    ...values,
    status: deriveStatusFromDisabledAt(disabled_at),
    disabled_at,
  };
  return normalizeEmptyToNull(base);
};

export default forwardRef<SupplierOverviewEditorHandle, Props>(function SupplierOverviewEditor(
  { id, onDirtyChange, readOnly = false },
  ref,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['master-data', 'common']);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useZodForm<SupplierFormValues>({
    schema: supplierFormSchema,
    defaultValues: DEFAULT_VALUES,
  });
  const { register, control, formState, reset, handleSubmit, setValue, watch } = form;

  const baselineRef = React.useRef<SupplierFormValues>({ ...DEFAULT_VALUES });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setServerError(null);
      try {
        const res = await api.get(`/suppliers/${id}`);
        if (!active) return;
        const values = toFormValues(res.data);
        baselineRef.current = { ...values };
        reset(values, { keepDirty: false, keepTouched: false });
        onDirtyChange?.(false);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToLoad', { entity: t('suppliers.entity') });
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
  const err = formState.errors as any;

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setSaving(true);
    setServerError(null);
    try {
      await api.patch(`/suppliers/${id}`, toPayload(values));
      baselineRef.current = { ...values };
      onDirtyChange?.(false);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', id] });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToSave', { entity: t('suppliers.entity') });
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
      {readOnly && (
        <Alert severity="info">{t('shared.messages.readOnlyAccess', { entity: t('suppliers.title').toLowerCase() })}</Alert>
      )}
      <TextField
        label="Name"
        required
        {...register('name')}
        error={!!err.name}
        helperText={err.name?.message as string}
        disabled={disabled}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="ERP Supplier ID"
        {...register('erp_supplier_id')}
        error={!!err.erp_supplier_id}
        helperText={err.erp_supplier_id?.message as string}
        disabled={disabled}
        InputLabelProps={{ shrink: true }}
      />
      {/* Contacts are managed in the Contacts tab. */}
      <TextField
        label="Notes"
        multiline
        minRows={2}
        {...register('notes')}
        error={!!err.notes}
        helperText={err.notes?.message as string}
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
