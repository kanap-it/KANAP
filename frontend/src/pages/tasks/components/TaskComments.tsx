import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import { MarkdownContent } from '../../../components/MarkdownContent';
import { buildInlineImageUrl, getTenantSlugFromHostname } from '../../../utils/inlineImageUrls';
import UnifiedActivityForm from './UnifiedActivityForm';
import type { TaskStatus } from '../task.constants';

const MarkdownEditor = React.lazy(() => import('../../../components/MarkdownEditor'));

interface Activity {
  id: string;
  type: 'comment' | 'change' | 'decision';
  content: string | null;
  context: string | null;
  author_id: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at?: string | null;
  changed_fields?: Record<string, [unknown, unknown]>;
}

interface TaskCommentsProps {
  taskId: string;
  projectId?: string;
  readOnly?: boolean;
  currentStatus: TaskStatus;
  relatedObjectType?: string;
  totalTimeHours?: number;
  initialStatus?: TaskStatus | null;
  commentFocusNonce?: number;
}

export default function TaskComments({
  taskId,
  projectId,
  readOnly = false,
  currentStatus,
  relatedObjectType,
  totalTimeHours = 0,
  initialStatus = null,
  commentFocusNonce = 0,
}: TaskCommentsProps) {
  const queryClient = useQueryClient();
  const { hasLevel, profile } = useAuth();
  const canComment = hasLevel('tasks', 'member');

  const [error, setError] = React.useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  // Upload image for rich text editor, returns the URL to embed
  const handleUploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_field', 'content');
    const res = await api.post<{ id: string }>(`/tasks/${taskId}/attachments`, formData);
    const tenantSlug = getTenantSlugFromHostname(window.location.hostname);
    return buildInlineImageUrl(`/tasks/attachments/${tenantSlug}/${res.data.id}/inline`);
  };

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: async () => {
      try {
        const endpoint = projectId
          ? `/portfolio/projects/${projectId}/tasks/${taskId}/activities`
          : `/tasks/${taskId}/activities`;
        const res = await api.get<Activity[]>(endpoint);
        return res.data;
      } catch {
        // Endpoint may not exist yet - return empty array
        return [];
      }
    },
    enabled: !!taskId,
  });

  const comments = activities.filter(a => a.type === 'comment');

  const handleStartEdit = (comment: Activity) => {
    setEditingId(comment.id);
    setEditContent(comment.content || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    setEditSubmitting(true);
    setError(null);
    try {
      const endpoint = projectId
        ? `/portfolio/projects/${projectId}/tasks/${taskId}/activities/${editingId}`
        : `/tasks/${taskId}/activities/${editingId}`;
      await api.patch(endpoint, { content: editContent.trim() });
      setEditingId(null);
      setEditContent('');
      await refetch();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update comment');
    } finally {
      setEditSubmitting(false);
    }
  };

  const canEditComment = (comment: Activity) => {
    return (
      comment.type === 'comment' &&
      profile?.id &&
      comment.author_id === profile.id &&
      canComment &&
      !readOnly
    );
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const f = firstName?.[0]?.toUpperCase() || '';
    const l = lastName?.[0]?.toUpperCase() || '';
    return f + l || '?';
  };

  return (
    <Stack spacing={2}>
      {/* Comment Input */}
      {canComment && !readOnly && (
        <UnifiedActivityForm
          taskId={taskId}
          projectId={projectId}
          currentStatus={currentStatus}
          readOnly={readOnly}
          relatedObjectType={relatedObjectType}
          totalTimeHours={totalTimeHours}
          initialStatus={initialStatus}
          focusNonce={commentFocusNonce}
          onSuccess={async () => {
            await refetch();
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
          }}
          onImageUpload={handleUploadImage}
        />
      )}

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {isLoading && <Typography color="text.secondary">Loading comments...</Typography>}

      {!isLoading && comments.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          No comments yet.
        </Typography>
      )}

      {/* Comments List */}
      <Stack spacing={2}>
        {comments.map((comment) => (
          <Box
            key={comment.id}
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              borderLeft: 3,
              borderColor: 'primary.main',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem', bgcolor: 'primary.main' }}>
                {getInitials(comment.first_name, comment.last_name)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {comment.first_name || ''} {comment.last_name || ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(comment.created_at)}
                  </Typography>
                  {comment.updated_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      (edited)
                    </Typography>
                  )}
                  <Box sx={{ flex: 1 }} />
                  {canEditComment(comment) && editingId !== comment.id && (
                    <Tooltip title="Edit comment">
                      <IconButton
                        size="small"
                        onClick={() => handleStartEdit(comment)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                {editingId === comment.id ? (
                  <Box sx={{ mt: 1 }}>
                    <React.Suspense fallback={<Box sx={{ minHeight: 6 * 24, border: 1, borderColor: 'divider', borderRadius: 1 }} />}>
                      <MarkdownEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="Edit your comment..."
                        minRows={6}
                        maxRows={12}
                        disabled={editSubmitting}
                        onImageUpload={handleUploadImage}
                      />
                    </React.Suspense>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        onClick={handleCancelEdit}
                        disabled={editSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleSaveEdit}
                        disabled={editSubmitting || !editContent.trim()}
                      >
                        {editSubmitting ? 'Saving...' : 'Save'}
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Box sx={{ mt: 0.5 }}>
                    <MarkdownContent content={comment.content || ''} variant="compact" />
                  </Box>
                )}
              </Box>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
