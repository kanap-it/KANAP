import React from 'react';
import { Alert, Box, Button, Slider, Stack } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import { hasRenderableContent } from '../../../utils/contentToPlainText';
import { getTaskStatusLabel, getTaskStatusOptions } from '../../../utils/portfolioI18n';
import { TASK_STATUS_OPTIONS } from '../task.constants';
import type { TaskStatus } from '../task.constants';

const MarkdownEditor = React.lazy(() => import('../../../components/MarkdownEditor'));

const TIME_LOGGING_EXCLUDED_TYPES = ['contract', 'spend_item', 'capex_item'];

interface UnifiedActivityFormProps {
  taskId: string;
  projectId?: string;
  currentStatus: TaskStatus;
  readOnly?: boolean;
  relatedObjectType?: string;
  totalTimeHours?: number;
  onSuccess: () => void | Promise<void>;
  initialStatus?: TaskStatus | null;
  focusNonce?: number;
  onImageUpload?: (file: File) => Promise<string>;
  onImageUrlImport?: (sourceUrl: string) => Promise<string>;
}

export default function UnifiedActivityForm({
  taskId,
  projectId,
  currentStatus,
  readOnly = false,
  relatedObjectType,
  totalTimeHours = 0,
  onSuccess,
  initialStatus = null,
  focusNonce,
  onImageUpload,
  onImageUrlImport,
}: UnifiedActivityFormProps) {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const queryClient = useQueryClient();
  const [comment, setComment] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [timeHours, setTimeHours] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initialAppliedRef = React.useRef<string | null>(null);

  const supportsTimeLogging = !TIME_LOGGING_EXCLUDED_TYPES.includes(relatedObjectType || '');
  const isProjectTask = relatedObjectType === 'project';
  const statusOptions = React.useMemo(
    () => [
      { label: t('portfolio:activity.form.noChange'), value: '' },
      ...getTaskStatusOptions(t)
        .filter((option) => option.value !== currentStatus)
        .map((option) => ({ label: option.label, value: option.value })),
    ],
    [currentStatus, t],
  );

  React.useEffect(() => {
    if (!initialStatus) return;
    if (initialStatus === currentStatus) return;
    if (!TASK_STATUS_OPTIONS.some((option) => option.value === initialStatus)) return;
    if (initialAppliedRef.current === initialStatus) return;
    setStatus(initialStatus);
    initialAppliedRef.current = initialStatus;
  }, [initialStatus, currentStatus]);

  const hasComment = hasRenderableContent(comment);
  const hasStatusChange = !!status && status !== currentStatus;
  const hasTime = supportsTimeLogging && timeHours > 0;
  const hasAnyAction = hasComment || hasStatusChange || hasTime;

  const submitLabel = React.useMemo(() => {
    if (!hasAnyAction) return t('portfolio:workspace.task.activity.actions.submit');
    const actions: string[] = [];
    if (hasComment) actions.push(t('portfolio:workspace.task.activity.actions.comment'));
    if (hasStatusChange) {
      actions.push(t('portfolio:workspace.task.activity.actions.setStatus', {
        status: getTaskStatusLabel(t, status),
      }));
    }
    if (hasTime) actions.push(t('portfolio:workspace.task.activity.actions.logHours', { hours: timeHours }));
    if (actions.length === 1) return actions[0];
    if (actions.length === 2) {
      return t('portfolio:workspace.task.activity.actions.combineTwo', {
        first: actions[0],
        second: actions[1],
      });
    }
    return t('portfolio:workspace.task.activity.actions.combineThree', {
      first: actions[0],
      second: actions[1],
      third: actions[2],
    });
  }, [hasAnyAction, hasComment, hasStatusChange, hasTime, status, t, timeHours]);

  const handleSubmit = async () => {
    if (readOnly || submitting) return;
    setError(null);

    if (!hasAnyAction) {
      setError(t('portfolio:workspace.task.activity.messages.emptySubmission'));
      return;
    }

    if (isProjectTask && status === 'done' && totalTimeHours + timeHours <= 0) {
      setError(t('portfolio:workspace.task.activity.messages.doneRequiresTime'));
      return;
    }

    const payload: Record<string, unknown> = { type: 'unified' };
    if (hasComment) payload.content = comment.trim();
    if (hasStatusChange) payload.status = status;
    if (hasTime) {
      payload.time_hours = timeHours;
      payload.time_category = 'it';
    }

    const endpoint = projectId
      ? `/portfolio/projects/${projectId}/tasks/${taskId}/activities`
      : `/tasks/${taskId}/activities`;

    setSubmitting(true);
    try {
      await api.post(endpoint, payload);
      setComment('');
      setStatus('');
      setTimeHours(0);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-activities', taskId] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', taskId] }),
        queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] }),
        queryClient.invalidateQueries({ queryKey: ['task-time-entries-sum', taskId] }),
        ...(projectId
          ? [
            queryClient.invalidateQueries({ queryKey: ['project-tasks-time-summary', projectId] }),
            queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
          ]
          : []),
      ]);
      await onSuccess();
    } catch (e: any) {
      setError(getApiErrorMessage(
        e,
        t,
        t('portfolio:workspace.task.activity.messages.submitFailed'),
      ));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <React.Suspense fallback={<Box sx={{ minHeight: 8 * 24, border: 1, borderColor: 'divider', borderRadius: 1 }} />}>
        <MarkdownEditor
          value={comment}
          onChange={setComment}
          placeholder={t('portfolio:workspace.task.comments.placeholders.writeComment')}
          minRows={8}
          maxRows={20}
          disabled={submitting || readOnly}
          focusNonce={focusNonce}
          onImageUpload={onImageUpload}
          onImageUrlImport={onImageUrlImport}
        />
      </React.Suspense>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: supportsTimeLogging ? '1fr 1fr' : '1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box>
          <EnumAutocomplete
            label={t('portfolio:workspace.task.sidebar.fields.status')}
            value={status}
            onChange={setStatus}
            options={statusOptions}
            size="small"
            disabled={submitting || readOnly}
          />
        </Box>
        {supportsTimeLogging && (
          <Box sx={{ px: 0.5 }}>
            <Slider
              min={0}
              max={8}
              step={1}
              marks={Array.from({ length: 9 }, (_, value) => ({ value, label: String(value) }))}
              value={timeHours}
              onChange={(_, value) => setTimeHours(Array.isArray(value) ? value[0] : value)}
              disabled={submitting || readOnly}
            />
          </Box>
        )}
      </Box>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || readOnly || !hasAnyAction}
          sx={{ minWidth: { xs: '100%', sm: 220 }, height: 40 }}
        >
          {submitting ? t('portfolio:workspace.task.activity.actions.submitting') : submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
