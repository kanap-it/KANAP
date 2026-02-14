import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import StatusLifecycleField from '../../../components/fields/StatusLifecycleField';
import {
  STATUS_ENABLED,
  STATUS_DISABLED,
  StatusValue,
  normalizeStatus,
} from '../../../constants/status';
import BusinessProcessCategoryMultiSelect from '../../../components/fields/BusinessProcessCategoryMultiSelect';
import UserSelect from '../../../components/fields/UserSelect';
import StatusSwitch from '../../../components/fields/StatusSwitch';

export type BusinessProcessOverviewEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
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

export default forwardRef<BusinessProcessOverviewEditorHandle, Props>(function BusinessProcessOverviewEditor(
  { id, onDirtyChange, readOnly = false, onManageCategoriesClick },
  ref,
) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = React.useState(false);
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
        const res = await api.get(`/business-processes/${id}`);
        if (!active) return;
        const d = res.data;
        reset(
          {
            name: d?.name ?? '',
            description: d?.description ?? '',
            notes: d?.notes ?? '',
            status: normalizeStatus(d?.status),
            category_ids: Array.isArray(d?.categories) ? d.categories.map((c: any) => c.id) : [],
            owner_user_id: d?.owner_user_id ?? null,
            it_owner_user_id: d?.it_owner_user_id ?? null,
          },
          { keepDirty: false, keepTouched: false },
        );
        onDirtyChange?.(false);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.response?.data?.message || e?.message || 'Failed to load business process';
        setServerError(msg);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id, onDirtyChange, reset]);

  const disabled = loading || saving || readOnly;
  const statusValue = watch('status');

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
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
      await api.patch(`/business-processes/${id}`, payload);
      onDirtyChange?.(false);
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      queryClient.invalidateQueries({ queryKey: ['business-processes', id] });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to save business process';
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
      save: async () => {
        await onSubmit();
      },
      reset: () => {
        form.reset(undefined, { keepDirty: false, keepTouched: false });
        onDirtyChange?.(false);
        setServerError(null);
      },
    }),
    [form, formState.isDirty, onSubmit, onDirtyChange],
  );

  return (
    <Stack spacing={2}>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}
      {readOnly && (
        <Alert severity="info">You need manager access to edit business processes.</Alert>
      )}

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
