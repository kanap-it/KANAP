import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import { contentToPlainText } from '../../../utils/contentToPlainText';
import { getPriorityLabel, getTaskStatusLabel } from '../../../utils/portfolioI18n';

interface Activity {
  id: string;
  type: 'comment' | 'change' | 'decision';
  content: string | null;
  context: string | null;
  author_id: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  changed_fields?: Record<string, [unknown, unknown]>;
}

interface TaskHistoryProps {
  taskId: string;
  projectId?: string;
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  title: 'title',
  description: 'description',
  status: 'status',
  task_type_id: 'taskType',
  priority_level: 'priority',
  creator_id: 'requestor',
  assignee_user_id: 'assignee',
  due_date: 'dueDate',
  start_date: 'startDate',
  labels: 'labels',
  phase_id: 'phase',
  source_id: 'source',
  category_id: 'category',
  stream_id: 'stream',
  company_id: 'company',
  related_to: 'relatedTo',
  converted_to_request: 'convertedToRequest',
  time_hours: 'timeLogged',
};

const humanize = (field: string) =>
  field
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());

const toCommentPreview = (value: string, maxLen = 150): string => {
  const text = contentToPlainText(value);
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.substring(0, maxLen)}...`;
};

export default function TaskHistory({ taskId, projectId }: TaskHistoryProps) {
  const { t } = useTranslation('portfolio');
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: async () => {
      try {
        const endpoint = projectId
          ? `/portfolio/projects/${projectId}/tasks/${taskId}/activities`
          : `/tasks/${taskId}/activities`;
        const res = await api.get<Activity[]>(endpoint);
        return res.data;
      } catch {
        return [];
      }
    },
    enabled: !!taskId,
  });

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFieldValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined) return t('workspace.task.history.values.empty');
    if (field === 'status') return getTaskStatusLabel(t, String(value));
    if (field === 'priority_level') return getPriorityLabel(t, String(value));
    if (Array.isArray(value)) {
      if (value.length === 0) return t('workspace.task.history.values.empty');
      return value.map((entry) => String(entry)).join(', ');
    }
    if (field === 'due_date' || field === 'start_date') {
      return value ? new Date(String(value)).toLocaleDateString('en-GB') : t('workspace.task.history.values.none');
    }
    return String(value);
  };

  const formatFieldLabel = (field: string): string => {
    const key = FIELD_LABEL_KEYS[field];
    return key ? t(`workspace.task.history.fields.${key}`) : humanize(field);
  };

  const getActivityDescription = (activity: Activity): string => {
    if (activity.type === 'comment') {
      return t('activity.history.actions.addedComment');
    }
    if (activity.type === 'change' && activity.changed_fields) {
      const entries = Object.entries(activity.changed_fields);
      if (entries.length === 1) {
        const [field, [oldVal, newVal]] = entries[0];
        return t('workspace.task.history.actions.changedField', {
          field: formatFieldLabel(field),
          from: formatFieldValue(field, oldVal),
          to: formatFieldValue(field, newVal),
        });
      }
      return t('workspace.task.history.actions.changedMultiple', {
        changes: entries
          .map(([field, [oldVal, newVal]]) =>
            t('workspace.task.history.actions.changedField', {
              field: formatFieldLabel(field),
              from: formatFieldValue(field, oldVal),
              to: formatFieldValue(field, newVal),
            })
          )
          .join(' | '),
      });
    }
    return t('activity.history.actions.recorded');
  };

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'comment':
        return 'primary.main';
      case 'change':
        return 'grey.400';
      case 'decision':
        return 'warning.main';
      default:
        return 'grey.400';
    }
  };

  if (isLoading) {
    return <Typography color="text.secondary">{t('portfolio:activity.messages.loadingHistory')}</Typography>;
  }

  if (activities.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        {t('portfolio:activity.messages.noHistory')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {activities.map((activity) => (
        <Box
          key={activity.id}
          sx={{
            p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 1,
            borderLeft: 3,
            borderColor: getActivityColor(activity.type),
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              label={activity.type === 'comment'
                ? t('activity.labels.comment')
                : activity.type === 'change'
                ? t('activity.labels.change')
                : t('activity.labels.decision')}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {getActivityDescription(activity)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {`${activity.first_name || ''} ${activity.last_name || ''}`.trim() || t('activity.authorUnknown')} • {formatTime(activity.created_at)}
            </Typography>
          </Stack>
          {activity.type === 'comment' && activity.content && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                pl: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {toCommentPreview(activity.content, 180)}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}
