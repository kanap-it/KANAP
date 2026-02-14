import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import api from '../../../api';

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

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

const PRIORITY_LABELS: Record<string, string> = {
  blocker: 'Blocker',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
  optional: 'Optional',
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
    if (field === 'status') return STATUS_LABELS[String(value)] || String(value);
    if (field === 'priority_level') return PRIORITY_LABELS[String(value)] || String(value);
    if (field === 'due_date' || field === 'start_date') {
      return value ? new Date(String(value)).toLocaleDateString('en-GB') : '(none)';
    }
    return String(value);
  };

  const getActivityDescription = (activity: Activity): string => {
    if (activity.type === 'comment') {
      return 'Added a comment';
    }
    if (activity.type === 'change' && activity.changed_fields) {
      const fields = Object.keys(activity.changed_fields);
      if (fields.length === 1) {
        const field = fields[0];
        const [oldVal, newVal] = activity.changed_fields[field];
        return `Changed ${field.replace(/_/g, ' ')}: ${formatFieldValue(field, oldVal)} → ${formatFieldValue(field, newVal)}`;
      }
      return `Updated: ${fields.join(', ')}`;
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
                whiteSpace: 'pre-wrap',
                maxHeight: 60,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activity.content.substring(0, 150)}{activity.content.length > 150 ? '...' : ''}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}
