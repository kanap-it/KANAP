import React, { useEffect, useMemo } from 'react';
import { Stack, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import useZodForm from '../../hooks/useZodForm';
import FormErrorAlert from '../../components/forms/FormErrorAlert';
import CompanySelect from '../../components/fields/CompanySelect';
import StatusLifecycleField from '../../components/fields/StatusLifecycleField';
import { STATUS_DISABLED, STATUS_ENABLED, STATUS_VALUES, StatusValue, deriveStatusFromDisabledAt, normalizeDisabledAtInput } from '../../constants/status';

const optStr = (schema = z.string()) =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null;
    const result = schema.safeParse(v);
    return result.success ? result.data : null;
  }, z.string().nullable());

const optDateTime = () =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null;
    return typeof v === 'string' ? v : null;
  }, z.string().datetime().nullable());

export const departmentFormSchema = z.object({
  company_id: z.string().uuid({ message: 'Company is required' }),
  name: z.string().min(1, 'Name is required'),
  description: optStr(),
  status: z.enum(STATUS_VALUES).default(STATUS_ENABLED),
  disabled_at: optDateTime(),
});

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;
export type DepartmentInput = {
  company_id: string;
  name: string;
  description?: string | null;
  status: StatusValue;
  disabled_at?: string | null;
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

export default function DepartmentForm({
  defaultValues,
  onSubmit,
  serverError,
  formId,
  onStateChange,
}: {
  defaultValues?: Partial<DepartmentInput> | Partial<DepartmentFormValues>;
  onSubmit: (data: DepartmentInput) => void | Promise<void>;
  serverError?: unknown;
  formId: string;
  onStateChange?: (s: { isDirty: boolean; isValid: boolean; isSubmitting: boolean }) => void;
}) {
  const resolvedDefaults = useMemo(() => {
    const d: any = { ...(defaultValues ?? {}) };
    if (typeof d.status === 'boolean') {
      d.status = d.status ? STATUS_ENABLED : STATUS_DISABLED;
    } else if (typeof d.status === 'string') {
      const lowered = d.status.toLowerCase();
      d.status = STATUS_VALUES.includes(lowered as StatusValue) ? (lowered as StatusValue) : STATUS_ENABLED;
    } else {
      d.status = STATUS_ENABLED;
    }
    d.disabled_at = normalizeDisabledAtInput(d.disabled_at);
    d.status = deriveStatusFromDisabledAt(d.disabled_at);
    return d;
  }, [defaultValues]);
  const methods = useZodForm<DepartmentFormValues>({ schema: departmentFormSchema, defaultValues: resolvedDefaults as DepartmentFormValues });
  const { register, handleSubmit, formState, watch, control, setValue } = methods;

  useEffect(() => {
    onStateChange?.({ isDirty: formState.isDirty, isValid: formState.isValid, isSubmitting: formState.isSubmitting });
  }, [formState.isDirty, formState.isValid, formState.isSubmitting, onStateChange]);

  const submit = useMemo(() => handleSubmit((values) => {
    const disabled_at = values.disabled_at ?? null;
    const payload = normalizeEmptyToNull({
      ...values,
      status: deriveStatusFromDisabledAt(disabled_at),
      disabled_at,
    });
    return onSubmit(payload);
  }), [handleSubmit, onSubmit]);

  const statusValue = watch('status');
  const disabledAtValue = watch('disabled_at');
  const err = formState.errors as any;

  return (
    <form id={formId} onSubmit={submit} noValidate>
      <FormErrorAlert error={serverError} />
      <Stack spacing={2}>
        <Controller
          control={control}
          name="company_id"
          render={({ field }) => (
            <CompanySelect
              label="Company"
              value={field.value as any}
              onChange={(v) => field.onChange(v)}
              error={!!err.company_id}
              helperText={err.company_id?.message as string}
            />
          )}
        />
        <TextField label="Name" required {...register('name')} error={!!err.name} helperText={err.name?.message as string} />
        <TextField label="Description" {...register('description')} />
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
    </form>
  );
}
