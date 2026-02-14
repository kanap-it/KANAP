import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import api from '../../../api';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import StatusSwitch from '../../../components/fields/StatusSwitch';
import { STATUS_ENABLED, STATUS_DISABLED, StatusValue, deriveStatusFromDisabledAt, normalizeStatus } from '../../../constants/status';
import BusinessProcessCategoryMultiSelect from '../../../components/fields/BusinessProcessCategoryMultiSelect';
import UserSelect from '../../../components/fields/UserSelect';

export type BusinessProcessCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string | null>;
  reset: () => void;
};

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
  onManageCategoriesClick?: () => void;
};

type FormValues = {
  name: string;
  description: string;
  notes: string;
  status: StatusValue;
  category_ids: string[];
  owner_user_id: string | null;
  it_owner_user_id: string | null;
};

export default forwardRef<BusinessProcessCreateEditorHandle, Props>(function BusinessProcessCreateEditor(
  { onDirtyChange, onManageCategoriesClick },
  ref,
) {
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      notes: '',
      status: STATUS_ENABLED,
      category_ids: [],
      owner_user_id: null,
      it_owner_user_id: null,
    },
  });
  const { control, watch, formState, handleSubmit, reset } = form;

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  const statusValue = watch('status');

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setServerError(null);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() ? values.description.trim() : null,
        notes: values.notes.trim() ? values.notes.trim() : null,
        status: normalizeStatus(values.status),
        disabled_at: normalizeStatus(values.status) === STATUS_ENABLED ? null : new Date().toISOString(),
        category_ids: values.category_ids || [],
        owner_user_id: values.owner_user_id || null,
        it_owner_user_id: values.it_owner_user_id || null,
      };
      const res = await api.post('/business-processes', payload);
      onDirtyChange?.(false);
      return String(res.data?.id ?? res.data?.uuid ?? null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create business process';
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
      reset: () => {
        reset(
          {
            name: '',
            description: '',
            notes: '',
            status: STATUS_ENABLED,
            category_ids: [],
            owner_user_id: null,
            it_owner_user_id: null,
          },
          { keepDirty: false, keepTouched: false },
        );
        onDirtyChange?.(false);
        setServerError(null);
      },
    }),
    [formState.isDirty, onSubmit, reset, onDirtyChange],
  );

  const disabled = saving;

  return (
    <Stack spacing={2}>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}

      <Typography variant="subtitle2">Basic info</Typography>
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
            helperText={fieldState.error?.message || 'Use a clear name including the code, e.g. Order-to-Cash (O2C)'}
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
            placeholder="Short description of the process"
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <StatusSwitch
            label="Enabled"
            value={normalizeStatus(statusValue ?? STATUS_ENABLED) === STATUS_ENABLED}
            onChange={(checked) => field.onChange(checked ? STATUS_ENABLED : STATUS_DISABLED)}
            disabled={disabled}
            helperText="Toggle off to disable this process"
          />
        )}
      />

      <Typography variant="subtitle2">Classification</Typography>
      <Controller
        name="category_ids"
        control={control}
        render={({ field }) => (
          <BusinessProcessCategoryMultiSelect
            value={field.value || []}
            onChange={(ids) => field.onChange(ids)}
            label="Categories"
            helperText="Assign one or more categories"
            disabled={disabled}
            onManageCategoriesClick={onManageCategoriesClick}
          />
        )}
      />
      <Controller
        name="owner_user_id"
        control={control}
        render={({ field }) => (
          <UserSelect
            label="Process Owner"
            value={field.value}
            onChange={(v) => field.onChange(v)}
            disabled={disabled}
            helperText="User ultimately responsible for the process"
          />
        )}
      />
      <Controller
        name="it_owner_user_id"
        control={control}
        render={({ field }) => (
          <UserSelect
            label="IT Owner"
            value={field.value}
            onChange={(v) => field.onChange(v)}
            disabled={disabled}
            helperText="IT contact responsible for tools / systems supporting this process"
          />
        )}
      />

      <Typography variant="subtitle2">Details</Typography>
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Notes"
            multiline
            minRows={3}
            placeholder="Internal notes, links to SOPs or process maps"
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
    </Stack>
  );
});
