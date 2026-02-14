import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Stack, TextField, FormControlLabel, Checkbox, Divider, Typography } from '@mui/material';
import SupplierSelect from '../../../components/fields/SupplierSelect';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import DateEUField from '../../../components/fields/DateEUField';
import api from '../../../api';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';

export type ApplicationCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string | null>;
  reset: () => void;
};

type Props = { onDirtyChange?: (dirty: boolean) => void };

export default forwardRef<ApplicationCreateEditorHandle, Props>(function ApplicationCreateEditor({ onDirtyChange }, ref) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const [name, setName] = React.useState('');
  const [supplierId, setSupplierId] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState<string>('line_of_business');
  const [editor, setEditor] = React.useState('');
  const [retiredDate, setRetiredDate] = React.useState('');
  const [lifecycle, setLifecycle] = React.useState<string>('active');
  const [criticality, setCriticality] = React.useState<'business_critical' | 'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = React.useState('');
  const [licensing, setLicensing] = React.useState('');
  const [isSuite, setIsSuite] = React.useState(false);
  const [version, setVersion] = React.useState('');
  const [goLiveDate, setGoLiveDate] = React.useState('');
  const [endOfSupportDate, setEndOfSupportDate] = React.useState('');
  const { byField } = useItOpsEnumOptions();
  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    const options = list.map((item) => ({
      value: item.code,
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
      deprecated: !!item.deprecated,
    }));
    if (lifecycle && !options.some((opt) => opt.value === lifecycle)) {
      options.push({ value: lifecycle, label: lifecycle, deprecated: false });
    }
    return options.filter((opt) => !opt.deprecated || opt.value === lifecycle);
  }, [byField.lifecycleStatus, lifecycle]);

  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const markDirty = React.useCallback(() => setDirty(true), []);

  const reset = React.useCallback(() => {
    setName('');
    setSupplierId(null);
    setDescription('');
    setCategory('line_of_business');
    setEditor('');
    setRetiredDate('');
    setLifecycle('active');
    setCriticality('medium');
    setLicensing('');
    setNotes('');
    setIsSuite(false);
    setVersion('');
    setGoLiveDate('');
    setEndOfSupportDate('');
    setServerError(null);
    setDirty(false);
  }, []);

  const save = React.useCallback(async () => {
    if (saving) return null;
    setSaving(true); setServerError(null);
    try {
      if (!String(name || '').trim()) {
        setServerError('Name is required');
        return null;
      }
      const payload = {
        name: name.trim(),
        supplier_id: supplierId,
        category,
        description: description || null,
        editor: editor || null,
        retired_date: retiredDate || null,
        lifecycle,
        criticality,
        external_facing: false,
        is_suite: isSuite,
        last_dr_test: null,
        etl_enabled: false,
        contains_pii: false,
        data_class: 'internal' as const,
        licensing: licensing || null,
        notes: notes || null,
        version: version || null,
        go_live_date: goLiveDate || null,
        end_of_support_date: endOfSupportDate || null,
        users_mode: 'it_users' as const,
        users_year: new Date().getFullYear(),
        users_override: null,
      };
      const res = await api.post('/applications', payload);
      setDirty(false);
      return (res.data?.id as string) || null;
    } catch (e: any) {
      setServerError(e?.response?.data?.message || e?.message || 'Failed to create application');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [saving, name, supplierId, description, category, editor, retiredDate, lifecycle, criticality, licensing, notes, version, goLiveDate, endOfSupportDate, isSuite]);

  useImperativeHandle(ref, () => ({ isDirty: () => dirty, save, reset }), [dirty, save, reset]);

  return (
    <Stack spacing={2}>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}
      <TextField label="Name" value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} required fullWidth />
      <TextField label="Description" value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} fullWidth />
      <SupplierSelect label="Supplier" value={supplierId} onChange={(v) => { setSupplierId(v); markDirty(); }} />
      <EnumAutocomplete
        label="Category"
        value={category}
        onChange={(v) => { setCategory(v); markDirty(); }}
        options={byField.applicationCategory.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }))}
        required
      />
      <TextField label="Publisher" value={editor} onChange={(e) => { setEditor(e.target.value); markDirty(); }} fullWidth />
      <EnumAutocomplete label="Criticality" value={criticality} onChange={(v) => { setCriticality(v as any); markDirty(); }} options={[{ label: 'Business critical', value: 'business_critical' }, { label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }]} required />
      <EnumAutocomplete label="Lifecycle" value={lifecycle} onChange={(v) => { setLifecycle(v as any); markDirty(); }} options={lifecycleOptions} required />
      <FormControlLabel control={<Checkbox checked={isSuite} onChange={(e) => { setIsSuite(e.target.checked); markDirty(); }} />} label="Can have child apps" />
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Version Information</Typography>
      <TextField
        label="Version"
        value={version}
        onChange={(e) => { setVersion(e.target.value); markDirty(); }}
        fullWidth
        placeholder="e.g., 4.2.1, 2023, Q1 2024"
        size="small"
      />
      <DateEUField label="Go Live Date" valueYmd={goLiveDate} onChangeYmd={(v) => { setGoLiveDate(v); markDirty(); }} />
      <DateEUField label="End of Support" valueYmd={endOfSupportDate} onChangeYmd={(v) => { setEndOfSupportDate(v); markDirty(); }} />
      <Divider sx={{ my: 1 }} />
      <DateEUField label="Retired Date" valueYmd={retiredDate} onChangeYmd={(v) => { setRetiredDate(v); markDirty(); }} />
      <TextField label="Licensing" value={licensing} onChange={(e) => { setLicensing(e.target.value); markDirty(); }} fullWidth multiline minRows={3} />
      <TextField label="Notes" value={notes} onChange={(e) => { setNotes(e.target.value); markDirty(); }} multiline minRows={3} fullWidth />
    </Stack>
  );
});
