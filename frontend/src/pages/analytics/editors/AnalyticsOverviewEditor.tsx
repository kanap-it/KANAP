import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import { STATUS_ENABLED, StatusValue, deriveStatusFromDisabledAt, normalizeDisabledAtInput, normalizeStatus } from '../../../constants/status';

export type AnalyticsOverviewEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
};

type FormValues = {
  name: string;
  description: string;
  status: StatusValue;
  disabled_at: string | null;
};

export default forwardRef<AnalyticsOverviewEditorHandle, Props>(function AnalyticsOverviewEditor(
  { id, onDirtyChange, readOnly = false },
  ref,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['master-data', 'common']);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      status: STATUS_ENABLED,
      disabled_at: null,
    },
  });
  const { control, watch, reset, formState, handleSubmit } = form;

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setServerError(null);
      try {
        const res = await api.get(`/analytics-categories/${id}`);
        if (!active) return;
        const d = res.data;
        reset({
          name: d?.name ?? '',
          description: d?.description ?? '',
          status: deriveStatusFromDisabledAt(normalizeDisabledAtInput(d?.disabled_at)),
          disabled_at: normalizeDisabledAtInput(d?.disabled_at),
        }, { keepDirty: false, keepTouched: false });
        onDirtyChange?.(false);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToLoad', { entity: t('analytics.entity') });
        setServerError(msg);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id, onDirtyChange, reset]);

  const disabled = loading || saving || readOnly;
  const disabledAtValue = watch('disabled_at');

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setSaving(true);
    setServerError(null);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() ? values.description.trim() : null,
        status: deriveStatusFromDisabledAt(values.disabled_at ?? null),
        disabled_at: values.disabled_at ?? null,
      };
      await api.patch(`/analytics-categories/${id}`, payload);
      onDirtyChange?.(false);
      queryClient.invalidateQueries({ queryKey: ['analytics-categories'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-categories', id] });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('shared.messages.failedToSave', { entity: t('analytics.entity') });
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
      reset: () => { form.reset(undefined, { keepDirty: false, keepTouched: false }); onDirtyChange?.(false); setServerError(null); },
    }),
    [formState.isDirty, onSubmit, form, onDirtyChange],
  );

  return (
    <Stack spacing={2}>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}
      {readOnly && (
        <Alert severity="info">{t('shared.messages.readOnlyAccess', { entity: t('analytics.title').toLowerCase() })}</Alert>
      )}
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
            helperText={fieldState.error?.message || t('analytics.fields.nameHelper')}
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
          />
        )}
      />
    </Stack>
  );
});
