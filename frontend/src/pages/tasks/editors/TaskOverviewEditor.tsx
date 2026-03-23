import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import DateEUField from '../../../components/fields/DateEUField';
import UserSelect from '../../../components/fields/UserSelect';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import {
  getPriorityLabel,
  getTaskStatusOptions,
} from '../../../utils/portfolioI18n';
import type { TaskStatus } from '../task.constants';

export type TaskOverviewEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
};

type TaskData = {
  id: string;
  title: string | null;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  start_date: string | null;
  assignee_user_id: string | null;
  assignee_name: string | null;
  related_object_type: 'spend_item' | 'contract' | 'capex_item' | 'project';
  related_object_id: string;
  related_object_name: string;
  // Project-specific fields
  phase_id: string | null;
  phase_name: string | null;
  priority_level: 'blocker' | 'high' | 'normal' | 'low' | 'optional';
  labels: string[];
  category_id: string | null;
  stream_id: string | null;
  creator_id: string | null;
  owner_ids: string[];
  viewer_ids: string[];
};

export default forwardRef<TaskOverviewEditorHandle, Props>(function TaskOverviewEditor({ id, onDirtyChange, readOnly = false }, ref) {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const queryClient = useQueryClient();
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>('open');
  const [dueDate, setDueDate] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null);
  const [priorityLevel, setPriorityLevel] = React.useState<'blocker' | 'high' | 'normal' | 'low' | 'optional'>('normal');
  const [relatedSearch, setRelatedSearch] = React.useState('');
  const [selectedRelated, setSelectedRelated] = React.useState<{ id: string; label: string; type: 'spend_item' | 'contract' | 'capex_item' | 'project' } | null>(null);

  const baselineRef = React.useRef<{
    title: string;
    description: string;
    status: string;
    due_date: string;
    start_date: string;
    assignee_user_id: string | null;
    priority_level: string;
    related_type?: 'spend_item' | 'contract' | 'capex_item' | 'project';
    related_id?: string;
  }>({ title: '', description: '', status: 'open', due_date: '', start_date: '', assignee_user_id: null, priority_level: 'normal', related_type: undefined, related_id: undefined });

  const { data, error, isLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const res = await api.get<TaskData>(`/tasks/${id}`);
      return res.data as any as TaskData;
    },
    enabled: !!id,
  });

  // Related item unified search to allow changing the target
  const { data: opexItems } = useQuery({
    queryKey: ['task-related-search', 'spend_item', relatedSearch],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; product_name: string }> }>('/spend-items', { params: { limit: 50, q: relatedSearch || undefined } });
      return res.data?.items || [];
    },
  });
  const { data: contracts } = useQuery({
    queryKey: ['task-related-search', 'contract', relatedSearch],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; name: string }> }>('/contracts', { params: { limit: 50, q: relatedSearch || undefined } });
      return res.data?.items || [];
    },
  });
  const { data: projects } = useQuery({
    queryKey: ['task-related-search', 'project', relatedSearch],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; name: string }> }>('/portfolio/projects', { params: { limit: 50, q: relatedSearch || undefined } });
      return res.data?.items || [];
    },
  });
  const relatedOptions = React.useMemo(() => {
    const opexOpts = (opexItems || []).map((i) => ({ id: i.id, label: i.product_name, type: 'spend_item' as const }));
    const contractOpts = (contracts || []).map((c) => ({ id: c.id, label: c.name, type: 'contract' as const }));
    const projectOpts = (projects || []).map((p) => ({ id: p.id, label: p.name, type: 'project' as const }));
    return [...projectOpts, ...opexOpts, ...contractOpts];
  }, [opexItems, contracts, projects]);

  useEffect(() => {
    if (!data) return;
    const due = data.due_date ? String(data.due_date).split('T')[0] : '';
    const start = data.start_date ? String(data.start_date).split('T')[0] : '';
    setTitle(data.title || '');
    setDescription(data.description || '');
    setStatus((data.status as any) || 'open');
    setDueDate(due);
    setStartDate(start);
    setAssigneeId(data.assignee_user_id || null);
    setPriorityLevel(data.priority_level || 'normal');
    setSelectedRelated({ id: data.related_object_id, label: data.related_object_name, type: data.related_object_type });
    baselineRef.current = {
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'open',
      due_date: due,
      start_date: start,
      assignee_user_id: data.assignee_user_id || null,
      priority_level: data.priority_level || 'normal',
      related_type: data.related_object_type,
      related_id: data.related_object_id,
    };
    onDirtyChange?.(false);
  }, [data, onDirtyChange]);

  useEffect(() => {
    const dirty =
      title !== baselineRef.current.title ||
      description !== baselineRef.current.description ||
      status !== baselineRef.current.status ||
      dueDate !== baselineRef.current.due_date ||
      startDate !== baselineRef.current.start_date ||
      assigneeId !== baselineRef.current.assignee_user_id ||
      priorityLevel !== baselineRef.current.priority_level ||
      (!!selectedRelated && (selectedRelated.type !== baselineRef.current.related_type || selectedRelated.id !== baselineRef.current.related_id));
    onDirtyChange?.(dirty);
  }, [title, description, status, dueDate, startDate, assigneeId, priorityLevel, selectedRelated, onDirtyChange]);

  const onSave = async () => {
    if (!data || saving || readOnly) return;
    setSaving(true);
    setServerError(null);
    try {
      const relationChanged = !!selectedRelated && (selectedRelated.id !== data.related_object_id || selectedRelated.type !== data.related_object_type);
      if (relationChanged) {
        await api.patch(`/tasks/${data.id}/move`, { related_object_type: selectedRelated!.type, related_object_id: selectedRelated!.id });
      }
      const payload = {
        id: data.id,
        title: title.trim(),
        description: description.trim() || null,
        status,
        due_date: dueDate || null,
        start_date: startDate || null,
        assignee_user_id: assigneeId || null,
        priority_level: priorityLevel,
      };
      const baseType = relationChanged ? selectedRelated!.type : data.related_object_type;
      const baseId = relationChanged ? selectedRelated!.id : data.related_object_id;
      // Determine the correct endpoint based on type
      let endpoint: string;
      if (baseType === 'spend_item') {
        endpoint = `/spend-items/${baseId}/tasks`;
      } else if (baseType === 'contract') {
        endpoint = `/contracts/${baseId}/tasks`;
      } else if (baseType === 'capex_item') {
        endpoint = `/capex-items/${baseId}/tasks`;
      } else if (baseType === 'project') {
        endpoint = `/portfolio/projects/${baseId}/tasks/${data.id}`;
      } else {
        throw new Error(t('portfolio:workspace.task.messages.invalidRelationType'));
      }
      await api.patch(endpoint, payload);
      baselineRef.current = {
        title: payload.title,
        description: payload.description || '',
        status: payload.status,
        due_date: payload.due_date || '',
        start_date: payload.start_date || '',
        assignee_user_id: payload.assignee_user_id,
        priority_level: payload.priority_level,
        related_type: relationChanged ? selectedRelated!.type : data.related_object_type,
        related_id: relationChanged ? selectedRelated!.id : data.related_object_id,
      };
      onDirtyChange?.(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', id] });
    } catch (e: any) {
      setServerError(getApiErrorMessage(
        e,
        t,
        t('portfolio:workspace.task.messages.saveFailed'),
      ));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (!data) return;
    setTitle(baselineRef.current.title);
    setDescription(baselineRef.current.description);
    setStatus(baselineRef.current.status as any);
    setDueDate(baselineRef.current.due_date);
    setStartDate(baselineRef.current.start_date);
    setAssigneeId(baselineRef.current.assignee_user_id);
    setPriorityLevel(baselineRef.current.priority_level as any);
    if (baselineRef.current.related_id && baselineRef.current.related_type) {
      setSelectedRelated((prev) => ({ id: baselineRef.current.related_id!, label: prev?.label || (data.related_object_name || ''), type: baselineRef.current.related_type! }));
    }
    setServerError(null);
    onDirtyChange?.(false);
  };

  useImperativeHandle(ref, () => ({
    isDirty: () => true,
    save: onSave,
    reset: onReset,
  }));

  const disabled = isLoading || saving || readOnly;

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{t('portfolio:workspace.task.messages.loadFailed')}</Alert>}
      {!!serverError && <Alert severity="error">{serverError}</Alert>}

      <TextField
        label={t('portfolio:workspace.task.title.label')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        disabled={disabled}
        InputLabelProps={{ shrink: true }}
      />

      {/* Related item - single autocomplete, editable, not persisted until save */}
      <Autocomplete
        options={relatedOptions}
        value={selectedRelated}
        onChange={(_, opt) => setSelectedRelated(opt as any)}
        inputValue={relatedSearch}
        onInputChange={(_, val) => setRelatedSearch(val)}
        getOptionLabel={(opt) => (opt as any)?.label || ''}
        isOptionEqualToValue={(a, b) => (a as any)?.id === (b as any)?.id && (a as any)?.type === (b as any)?.type}
        groupBy={(opt) => {
          const type = (opt as any).type;
          if (type === 'project') return t('portfolio:context.project');
          if (type === 'spend_item') return t('portfolio:context.spend_item');
          if (type === 'contract') return t('portfolio:context.contract');
          if (type === 'capex_item') return t('portfolio:context.capex_item');
          return t('portfolio:workspace.task.values.other');
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('portfolio:workspace.task.fields.relatedItem')}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {(opexItems === undefined || contracts === undefined) ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
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
        label={t('portfolio:workspace.task.description.label')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        minRows={3}
        disabled={disabled}
        InputLabelProps={{ shrink: true }}
      />

      <EnumAutocomplete
        label={t('portfolio:workspace.task.sidebar.fields.status')}
        value={status}
        onChange={(v) => setStatus(v as any)}
        options={getTaskStatusOptions(t)}
      />

      <EnumAutocomplete
        label={t('portfolio:workspace.task.sidebar.fields.priority')}
        value={priorityLevel}
        onChange={(v) => setPriorityLevel(v as any)}
        options={[
          { label: getPriorityLabel(t, 'blocker'), value: 'blocker' },
          { label: getPriorityLabel(t, 'high'), value: 'high' },
          { label: getPriorityLabel(t, 'normal'), value: 'normal' },
          { label: getPriorityLabel(t, 'low'), value: 'low' },
          { label: getPriorityLabel(t, 'optional'), value: 'optional' },
        ]}
      />

      <DateEUField
        label={t('portfolio:workspace.task.sidebar.fields.startDate')}
        valueYmd={startDate}
        onChangeYmd={setStartDate}
      />
      <DateEUField
        label={t('portfolio:workspace.task.sidebar.fields.dueDate')}
        valueYmd={dueDate}
        onChangeYmd={setDueDate}
      />

      <UserSelect
        label={t('portfolio:workspace.task.sidebar.fields.assignee')}
        value={assigneeId}
        onChange={setAssigneeId}
      />
    </Stack>
  );
});
