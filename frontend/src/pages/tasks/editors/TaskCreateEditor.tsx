/**
 * @deprecated This component is no longer used.
 * Task creation now uses the full TaskWorkspacePage with RelatedObjectSelect in the sidebar.
 * See TaskWorkspacePage.tsx for the new create mode implementation.
 * Kept for potential future reference.
 */
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import DateEUField from '../../../components/fields/DateEUField';
import UserSelect from '../../../components/fields/UserSelect';

export type TaskCreateEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<string | null>; // returns new id
  reset: () => void;
};

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

type RelatedType = 'spend_item' | 'contract';
type RelatedOption = { id: string; label: string; type: RelatedType };

const DEFAULTS = {
  title: '',
  description: '',
  status: 'open' as 'open' | 'in_progress' | 'done' | 'cancelled',
  due_date: '' as string,
  assignee_user_id: null as string | null,
};

export default forwardRef<TaskCreateEditorHandle, Props>(function TaskCreateEditor({ onDirtyChange }, ref) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState('');
  const [relatedSearch, setRelatedSearch] = React.useState('');
  const [selectedRelated, setSelectedRelated] = React.useState<RelatedOption | null>(null);
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<'open' | 'in_progress' | 'done' | 'cancelled'>('open');
  const [dueDate, setDueDate] = React.useState('');
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null);

  const baselineRef = React.useRef({ ...DEFAULTS, selectedRelated: null as RelatedOption | null });

  useEffect(() => {
    const dirty =
      title !== baselineRef.current.title ||
      description !== baselineRef.current.description ||
      status !== baselineRef.current.status ||
      dueDate !== baselineRef.current.due_date ||
      assigneeId !== baselineRef.current.assignee_user_id ||
      selectedRelated?.id !== baselineRef.current.selectedRelated?.id ||
      selectedRelated?.type !== baselineRef.current.selectedRelated?.type;
    onDirtyChange?.(dirty);
  }, [title, description, status, dueDate, assigneeId, selectedRelated, onDirtyChange]);

  // Related item unified search: fetch both OPEX and Contracts and merge
  const { data: opexItems, isLoading: loadingOpex } = useQuery({
    queryKey: ['task-related-search', 'spend_item', relatedSearch],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; product_name: string }> }>('/spend-items', { params: { limit: 50, q: relatedSearch || undefined } });
      return res.data?.items || [];
    },
  });
  const { data: contracts, isLoading: loadingContracts } = useQuery({
    queryKey: ['task-related-search', 'contract', relatedSearch],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; name: string }> }>('/contracts', { params: { limit: 50, q: relatedSearch || undefined } });
      return res.data?.items || [];
    },
  });

  const relatedOptions: RelatedOption[] = React.useMemo(() => {
    const opexOpts: RelatedOption[] = (opexItems || []).map((i) => ({ id: i.id, label: i.product_name, type: 'spend_item' }));
    const contractOpts: RelatedOption[] = (contracts || []).map((c) => ({ id: c.id, label: c.name, type: 'contract' }));
    return [...opexOpts, ...contractOpts];
  }, [opexItems, contracts]);

  const onSave = async (): Promise<string | null> => {
    if (saving) return null;
    setSaving(true);
    setServerError(null);
    try {
      if (!selectedRelated) throw new Error('Please select a related item');
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        due_date: dueDate || null,
        assignee_user_id: assigneeId || null,
      };
      if (!payload.title) throw new Error('Title is required');
      const base = selectedRelated.type === 'spend_item' ? '/spend-items' : '/contracts';
      const res = await api.post(`${base}/${selectedRelated.id}/tasks`, payload);
      const created = res.data || {};
      // invalidate generic tasks lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      return created?.id ?? null;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create task';
      setServerError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setTitle('');
    setRelatedSearch('');
    setSelectedRelated(null);
    setDescription('');
    setStatus('open');
    setDueDate('');
    setAssigneeId(null);
    setServerError(null);
    baselineRef.current = { ...DEFAULTS, selectedRelated: null };
    onDirtyChange?.(false);
  };

  useImperativeHandle(ref, () => ({
    isDirty: () => true, // creation is considered dirty until saved
    save: onSave,
    reset: onReset,
  }));

  const disabled = saving;
  const loading = loadingOpex || loadingContracts;

  return (
    <Stack spacing={2}>
      {!!serverError && <Alert severity="error">{serverError}</Alert>}

      <TextField
        label="Task Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        disabled={disabled}
        InputLabelProps={{ shrink: true }}
      />

      <Autocomplete
        options={relatedOptions}
        value={selectedRelated}
        onChange={(_, opt) => setSelectedRelated(opt as any)}
        inputValue={relatedSearch}
        onInputChange={(_, val) => setRelatedSearch(val)}
        getOptionLabel={(opt) => (opt as any)?.label || ''}
        isOptionEqualToValue={(a, b) => (a as any)?.id === (b as any)?.id && (a as any)?.type === (b as any)?.type}
        groupBy={(opt) => ((opt as any).type === 'spend_item' ? 'OPEX' : 'Contract')}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Related item"
            required
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        disabled={disabled}
        fullWidth
      />

      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        minRows={3}
        disabled={disabled}
        InputLabelProps={{ shrink: true }}
      />

      <EnumAutocomplete
        label="Status"
        value={status}
        onChange={(v) => setStatus(v as any)}
        options={[
          { label: 'Open', value: 'open' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Done', value: 'done' },
          { label: 'Cancelled', value: 'cancelled' },
        ]}
      />

      <DateEUField label="Due Date" valueYmd={dueDate} onChangeYmd={setDueDate} />

      <UserSelect label="Responsible" value={assigneeId} onChange={setAssigneeId} />
    </Stack>
  );
});
