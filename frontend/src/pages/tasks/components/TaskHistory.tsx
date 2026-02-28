import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import api from '../../../api';
import { TASK_STATUS_LABELS } from '../task.constants';
import type { TaskStatus } from '../task.constants';

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

const PRIORITY_LABELS: Record<string, string> = {
  blocker: 'Blocker',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
  optional: 'Optional',
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  status: 'Status',
  task_type_id: 'Task Type',
  priority_level: 'Priority',
  creator_id: 'Requestor',
  assignee_user_id: 'Assignee',
  due_date: 'Due Date',
  start_date: 'Start Date',
  labels: 'Labels',
  phase_id: 'Phase',
  source_id: 'Source',
  category_id: 'Category',
  stream_id: 'Stream',
  company_id: 'Company',
  related_to: 'Related To',
  converted_to_request: 'Converted To Request',
  time_hours: 'Time Logged',
};

const humanize = (field: string) =>
  field
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());

const toPlainText = (value: string): string => {
  if (!value) return '';
  const doc = new DOMParser().parseFromString(value, 'text/html');
  return (doc.body.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const toCommentPreview = (value: string, maxLen = 150): string => {
  const text = toPlainText(value);
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.substring(0, maxLen)}...`;
};

export default function TaskHistory({ taskId, projectId }: TaskHistoryProps) {
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
    if (value === null || value === undefined) return '(empty)';
    if (field === 'status') return TASK_STATUS_LABELS[String(value) as TaskStatus] || String(value);
    if (field === 'priority_level') return PRIORITY_LABELS[String(value)] || String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return '(empty)';
      return value.map((entry) => String(entry)).join(', ');
    }
    if (field === 'due_date' || field === 'start_date') {
      return value ? new Date(String(value)).toLocaleDateString('en-GB') : '(none)';
    }
    return String(value);
  };

  const formatFieldLabel = (field: string): string => {
    return FIELD_LABELS[field] || humanize(field);
  };

  const getActivityDescription = (activity: Activity): string => {
    if (activity.type === 'comment') {
      return 'Added a comment';
    }
    if (activity.type === 'change' && activity.changed_fields) {
      const entries = Object.entries(activity.changed_fields);
      if (entries.length === 1) {
        const [field, [oldVal, newVal]] = entries[0];
        return `Changed ${formatFieldLabel(field)}: ${formatFieldValue(field, oldVal)} → ${formatFieldValue(field, newVal)}`;
      }
      return `Changed ${entries
        .map(([field, [oldVal, newVal]]) =>
          `${formatFieldLabel(field)}: ${formatFieldValue(field, oldVal)} → ${formatFieldValue(field, newVal)}`
        )
        .join(' | ')}`;
    }
    return 'Activity recorded';
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
    return <Typography color="text.secondary">Loading history...</Typography>;
  }

  if (activities.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        No history recorded yet.
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
              label={activity.type === 'comment' ? 'Comment' : activity.type === 'change' ? 'Change' : 'Decision'}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {getActivityDescription(activity)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {activity.first_name || ''} {activity.last_name || ''} • {formatTime(activity.created_at)}
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
