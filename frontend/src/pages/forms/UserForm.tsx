import React, { useEffect, useMemo, useRef } from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import useZodForm from '../../hooks/useZodForm';
import FormErrorAlert from '../../components/forms/FormErrorAlert';
import CompanySelect from '../../components/fields/CompanySelect';
import DepartmentSelect from '../../components/fields/DepartmentSelect';
import MultiRoleSelect from '../../components/fields/MultiRoleSelect';
import StatusSwitch from '../../components/fields/StatusSwitch';

const optStr = (schema = z.string()) =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null;
    const result = schema.safeParse(v);
    return result.success ? result.data : null;
  }, z.string().nullable());

const emailSchema = z
  .string()
  .trim()
  .regex(/^[^@\s]+@[^@\s]+$/, 'Enter a valid email')
  .or(z.string().email('Enter a valid email'));

export const userFormSchema = z.object({
  email: emailSchema,
  first_name: optStr(),
  last_name: optStr(),
  job_title: optStr(z.string().max(200)),
  business_phone: optStr(z.string().max(50)),
  mobile_phone: optStr(z.string().max(50)),
  role_ids: z.array(z.string().uuid()).default([]),
  company_id: optStr(z.string().uuid()),
  department_id: optStr(z.string().uuid()),
  status: z.boolean().default(true),
});

export const userFormSchemaCreate = userFormSchema;

export const userFormSchemaEdit = userFormSchema;

export type UserFormValues = z.infer<typeof userFormSchema>;
export type UserInput = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  business_phone?: string | null;
  mobile_phone?: string | null;
  role_ids: string[];
  company_id?: string | null;
  department_id?: string | null;
  status: string;
  external_auth_provider?: string | null;
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

export default function UserForm({
  defaultValues,
  onSubmit,
  serverError,
  formId,
  onStateChange,
  managedByEntra = false,
}: {
  defaultValues?: Partial<UserInput> | Partial<UserFormValues>;
  onSubmit: (data: UserInput) => void | Promise<void>;
  serverError?: unknown;
  formId: string;
  onStateChange?: (s: { isDirty: boolean; isValid: boolean; isSubmitting: boolean }) => void;
  managedByEntra?: boolean;
}) {
  const resolvedDefaults = useMemo(() => {
    const d: any = { ...(defaultValues ?? {}) };
    if (typeof d.status === 'string') d.status = d.status === 'enabled';
    if (typeof d.status !== 'boolean') d.status = true;
    // Handle multi-role: convert from roles array or legacy role_id
    if (!d.role_ids || !Array.isArray(d.role_ids) || d.role_ids.length === 0) {
      // Try to get from roles array (from API)
      if (Array.isArray(d.roles) && d.roles.length > 0) {
        d.role_ids = d.roles.map((r: any) => r.id);
      } else if (d.role_id || d.role?.id) {
        // Legacy single role
        const roleId = d.role_id || d.role?.id;
        d.role_ids = roleId ? [roleId] : [];
      } else {
        d.role_ids = [];
      }
    }
    return d;
  }, [defaultValues]);
  const methods = useZodForm<UserFormValues>({ schema: userFormSchema, defaultValues: resolvedDefaults as any });
  const { register, handleSubmit, formState, watch, control, reset, trigger } = methods;
  const emailRef = useRef<HTMLInputElement>(null);

  // Reset form when defaults change (e.g., when selecting another user)
  useEffect(() => {
    reset(resolvedDefaults as any);
    void trigger();
  }, [reset, resolvedDefaults, trigger]);

  // Focus email field after modal opens (delay to allow Dialog focus trap to settle)
  useEffect(() => {
    const timer = setTimeout(() => {
      emailRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    onStateChange?.({ isDirty: formState.isDirty, isValid: formState.isValid, isSubmitting: formState.isSubmitting });
  }, [formState.isDirty, formState.isValid, formState.isSubmitting, onStateChange]);

  const submit = useMemo(
    () =>
      handleSubmit((values) => {
        const payload = normalizeEmptyToNull({
          ...values,
          status: values.status ? 'enabled' : 'disabled',
        });
        return onSubmit(payload as UserInput);
      }),
    [handleSubmit, onSubmit]
  );

  const err = formState.errors as any;
  const selectedCompanyId = watch('company_id') as string | null | undefined;

  return (
    <form id={formId} onSubmit={submit} noValidate autoComplete="off">
      <FormErrorAlert error={serverError} />
      <Stack spacing={2}>
        {managedByEntra && (
          <Typography variant="caption" color="text.secondary">
            These fields are synced from Microsoft Entra on login and can’t be edited here while SSO is enabled.
          </Typography>
        )}
        <TextField label="Email" required {...register('email')} error={!!err.email} helperText={err.email?.message as string} autoComplete="email" InputLabelProps={{ shrink: true }} inputRef={emailRef} />
        <TextField label="First Name" {...register('first_name')} autoComplete="off" disabled={managedByEntra} />
        <TextField label="Last Name" {...register('last_name')} autoComplete="off" disabled={managedByEntra} />
        <TextField label="Job Title" {...register('job_title')} autoComplete="organization-title" InputLabelProps={{ shrink: true }} disabled={managedByEntra} />
        <TextField label="Business Phone" {...register('business_phone')} autoComplete="tel" InputLabelProps={{ shrink: true }} disabled={managedByEntra} />
        <TextField label="Mobile Phone" {...register('mobile_phone')} autoComplete="tel-national" InputLabelProps={{ shrink: true }} disabled={managedByEntra} />
        <Controller
          control={control}
          name="role_ids"
          render={({ field }) => (
            <MultiRoleSelect
              label="Roles"
              value={field.value ?? []}
              onChange={(v) => field.onChange(v)}
              error={!!err.role_ids}
              helperText={err.role_ids?.message as string}
            />
          )}
        />
        <Controller
          control={control}
          name="company_id"
          render={({ field }) => (
            <CompanySelect
              label="Company (optional)"
              value={field.value as any}
              onChange={(v) => field.onChange(v)}
              helperText=""
            />
          )}
        />
        <Controller
          control={control}
          name="department_id"
          render={({ field }) => (
            <DepartmentSelect
              label="Department (optional)"
              companyId={selectedCompanyId || undefined}
              value={field.value as any}
              onChange={(v) => field.onChange(v)}
              helperText=""
            />
          )}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <StatusSwitch
              label="Enabled"
              value={!!field.value}
              onChange={(v) => field.onChange(v)}
              error={!!err.status}
              helperText={err.status?.message as string}
              name={field.name}
            />
          )}
        />
      </Stack>
    </form>
  );
}
