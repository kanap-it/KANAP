import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import api from '../../../api';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import { STATUS_ENABLED, StatusValue, deriveStatusFromDisabledAt, normalizeStatus } from '../../../constants/status';

export type AnalyticsCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string | null>;
  reset: () => void;
};

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

type FormValues = {
  name: string;
  description: string;
  status: StatusValue;
  disabled_at: string | null;
};

export default forwardRef<AnalyticsCreateEditorHandle, Props>(function AnalyticsCreateEditor(
  { onDirtyChange },
  ref,
) {
  const [saving, setSaving] = React.useState(false);
  const { t } = useTranslation(['master-data', 'common']);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      status: STATUS_ENABLED,
      disabled_at: null,
    },
  });
  const { control, watch, formState, handleSubmit, reset } = form;

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  const disabledAtValue = watch('disabled_at');

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setServerError(null);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() ? values.description.trim() : null,
        status: deriveStatusFromDisabledAt(values.disabled_at ?? null),
        disabled_at: values.disabled_at ?? null,
      };
      const res = await api.post('/analytics-categories', payload);
      onDirtyChange?.(false);
      return String(res.data?.id ?? res.data?.uuid ?? null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToCreate', { entity: t('analytics.entity') });
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
      save: async () => (await onSubmit()) as any,
      reset: () => { reset({ name: '', description: '', status: STATUS_ENABLED, disabled_at: null }, { keepDirty: false, keepTouched: false }); onDirtyChange?.(false); setServerError(null); },
    }),
    [formState.isDirty, onSubmit, reset, onDirtyChange],
  );

  return (
    <Stack spacing={2}>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}
      <Controller
        name="name"
        control={control}
        rules={{ required: 'Name is required' }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Name"
            required
            error={!!fieldState.error}
            helperText={fieldState.error?.message || 'Enter a unique analytics category name'}
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Description"
            multiline
            minRows={2}
            placeholder="Optional description"
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <StatusLifecycleField
            status={normalizeStatus(field.value ?? STATUS_ENABLED)}
            onStatusChange={(next) => field.onChange(next)}
            disabledAt={disabledAtValue}
            onDisabledAtChange={(next) => form.setValue('disabled_at', next, {
              shouldDirty: true,
              shouldValidate: true,
            })}
            statusLabel="Enabled"
            statusHelperText="Toggle off to disable this category"
            disabledAtName="disabled_at"
          />
        )}
      />
    </Stack>
  );
});

