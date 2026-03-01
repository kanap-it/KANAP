import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { MarkdownContent } from '../../../components/MarkdownContent';

const MarkdownEditor = React.lazy(() => import('../../../components/MarkdownEditor'));

const DECISION_OUTCOME_LABELS: Record<string, string> = {
  go: 'Go',
  no_go: 'No-Go',
  defer: 'Defer',
  need_info: 'Need Info',
  analysis_complete: 'Analysis Complete',
};

const DECISION_OUTCOME_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  go: 'success',
  no_go: 'error',
  defer: 'warning',
  need_info: 'info',
  analysis_complete: 'info',
};

const DECISION_OUTCOMES = [
  { value: 'go', label: 'Go' },
  { value: 'no_go', label: 'No-Go' },
  { value: 'defer', label: 'Defer' },
  { value: 'need_info', label: 'Need Info' },
  { value: 'analysis_complete', label: 'Analysis Complete' },
];

interface Activity {
  id: string;
  type: 'comment' | 'change' | 'decision';
  content: string | null;
  context: string | null;
  decision_outcome: string | null;
  changed_fields?: Record<string, [unknown, unknown]>;
  author_id: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface PortfolioCommentsProps {
  entityType: 'request' | 'project';
  entityId: string;
  activities: Activity[];
  currentStatus: string;
  allowedTransitions: string[];
  statusOptions: Array<{ value: string; label: string }>;
  onAddComment: (data: {
    content: string;
    context: string | null;
    is_decision: boolean;
    decision_outcome?: string;
    new_status?: string;
  }) => Promise<void>;
  onUpdateComment?: (activityId: string, content: string) => Promise<void>;
  currentUserId?: string | null;
  readOnly?: boolean;
  onImageUpload?: (file: File, sourceField: string) => Promise<string>;
}

export default function PortfolioComments({
  entityType,
  entityId,
  activities,
  currentStatus,
  allowedTransitions,
  statusOptions,
  onAddComment,
  onUpdateComment,
  currentUserId,
  readOnly = false,
  onImageUpload,
}: PortfolioCommentsProps) {
  const [commentContent, setCommentContent] = React.useState('');
  const [commentContext, setCommentContext] = React.useState('');
  const [isDecision, setIsDecision] = React.useState(false);
  const [decisionOutcome, setDecisionOutcome] = React.useState('');
  const [newStatus, setNewStatus] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editorKey, setEditorKey] = React.useState(0);

  // Editing state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  // Filter to only show comments and decisions
  const discussions = activities.filter(
    (a) => a.type === 'comment' || a.type === 'decision'
  );

  const handleSubmit = async () => {
    // Validation
    if (isDecision) {
      if (!commentContext.trim()) return;
      if (!decisionOutcome) return;
    } else {
      if (!commentContent.trim()) return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onAddComment({
        content: commentContent.trim(),
        context: commentContext.trim() || null,
        is_decision: isDecision,
        decision_outcome: isDecision ? decisionOutcome : undefined,
        new_status: isDecision && newStatus ? newStatus : undefined,
      });
      // Reset form
      setCommentContent('');
      setCommentContext('');
      setIsDecision(false);
      setDecisionOutcome('');
      setNewStatus('');
      setEditorKey((k) => k + 1); // Force editor remount with empty content
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    if (!onImageUpload) {
      throw new Error('Image upload not configured');
    }
    return onImageUpload(file, 'content');
  };

  const handleStartEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setEditContent(activity.content || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !onUpdateComment) return;
    if (!editContent.trim()) return;

    setEditSubmitting(true);
    setError(null);
    try {
      await onUpdateComment(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update comment');
    } finally {
      setEditSubmitting(false);
    }
  };

  const canEditComment = (activity: Activity) => {
    return (
      activity.type === 'comment' &&
      currentUserId &&
      activity.author_id === currentUserId &&
      onUpdateComment
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
    <Stack spacing={3}>
      {/* Add Comment / Decision Form */}
      {!readOnly && (
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: isDecision ? 'warning.main' : 'divider',
            borderRadius: 1,
          }}
        >
          <Stack spacing={2}>
            {/* Row 1: Formal decision checkbox + Context field */}
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isDecision}
                    onChange={(e) => {
                      setIsDecision(e.target.checked);
                      if (!e.target.checked) {
                        setDecisionOutcome('');
                        setNewStatus('');
                      }
                    }}
                  />
                }
                label="Formal decision"
                sx={{ mr: 0, flexShrink: 0 }}
              />
              <TextField
                label={isDecision ? 'Context / Meeting' : 'Context (optional)'}
                value={commentContext}
                onChange={(e) => setCommentContext(e.target.value)}
                fullWidth
                size="small"
                required={isDecision}
                placeholder={
                  isDecision
                    ? 'e.g., CAB Meeting 2025-01-03'
                    : 'e.g., Weekly Review, Stakeholder Meeting'
                }
              />
            </Stack>

            {/* Row 2: Decision fields (only when Formal decision is checked) */}
            {isDecision && (
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Decision Outcome</InputLabel>
                  <Select
                    value={decisionOutcome}
                    label="Decision Outcome"
                    onChange={(e) => setDecisionOutcome(e.target.value)}
                  >
                    {DECISION_OUTCOMES.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Change Status to...</InputLabel>
                  <Select
                    value={newStatus}
                    label="Change Status to..."
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <MenuItem value="">(No change)</MenuItem>
                    {allowedTransitions.map((status) => {
                      const opt = statusOptions.find((s) => s.value === status);
                      return (
                        <MenuItem key={status} value={status}>
                          {opt?.label || status}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Stack>
            )}

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {isDecision ? 'Rationale / Notes' : 'Add a comment'}
              </Typography>
              <React.Suspense fallback={<Box sx={{ minHeight: 6 * 24, border: 1, borderColor: 'divider', borderRadius: 1 }} />}>
                <MarkdownEditor
                  key={editorKey}
                  value={commentContent}
                  onChange={setCommentContent}
                  placeholder={
                    isDecision
                      ? 'Explain the decision rationale...'
                      : 'Share your thoughts, updates, or questions...'
                  }
                  minRows={6}
                  maxRows={12}
                  disabled={submitting}
                  onImageUpload={onImageUpload ? handleImageUpload : undefined}
                />
              </React.Suspense>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color={isDecision ? 'warning' : 'primary'}
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  (isDecision
                    ? !commentContext.trim() || !decisionOutcome
                    : !commentContent.trim())
                }
              >
                {submitting
                  ? 'Adding...'
                  : isDecision
                  ? 'Add Decision'
                  : 'Add Comment'}
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Comments and Decisions List */}
      {discussions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No comments or decisions yet.
          {!readOnly && ' Be the first to add one!'}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {discussions.map((a) => (
            <Box
              key={a.id}
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                borderLeft: 4,
                borderColor:
                  a.type === 'decision' ? 'warning.main' : 'primary.main',
                boxShadow: 1,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '0.875rem',
                    bgcolor:
                      a.type === 'decision' ? 'warning.main' : 'primary.main',
                  }}
                >
                  {getInitials(a.first_name, a.last_name)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Chip
                      label={a.type === 'decision' ? 'Decision' : 'Comment'}
                      size="small"
                      color={a.type === 'decision' ? 'warning' : 'primary'}
                    />
                    {a.type === 'decision' && a.decision_outcome && (
                      <Chip
                        label={
                          DECISION_OUTCOME_LABELS[a.decision_outcome] ||
                          a.decision_outcome
                        }
                        size="small"
                        color={
                          DECISION_OUTCOME_COLORS[a.decision_outcome] ||
                          'default'
                        }
                        variant="outlined"
                      />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {a.first_name || ''} {a.last_name || ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(a.created_at)}
                    </Typography>
                    {a.updated_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        (edited)
                      </Typography>
                    )}
                    <Box sx={{ flex: 1 }} />
                    {canEditComment(a) && editingId !== a.id && (
                      <Tooltip title="Edit comment">
                        <IconButton
                          size="small"
                          onClick={() => handleStartEdit(a)}
                          sx={{ ml: 'auto' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  {a.context && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color:
                          a.type === 'decision'
                            ? 'warning.dark'
                            : 'primary.dark',
                        mb: 0.5,
                      }}
                    >
                      {a.context}
                    </Typography>
                  )}
                  {editingId === a.id ? (
                    <Box sx={{ mt: 1 }}>
                      <React.Suspense fallback={<Box sx={{ minHeight: 4 * 24, border: 1, borderColor: 'divider', borderRadius: 1 }} />}>
                        <MarkdownEditor
                          value={editContent}
                          onChange={setEditContent}
                          placeholder="Edit your comment..."
                          minRows={4}
                          maxRows={10}
                          disabled={editSubmitting}
                          onImageUpload={onImageUpload ? handleImageUpload : undefined}
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
                  ) : a.content ? (
                    <Box sx={{ mt: 0.5 }}>
                      <MarkdownContent content={a.content} variant="compact" />
                    </Box>
                  ) : null}
                  {a.type === 'decision' && a.changed_fields?.status && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Status: {String(a.changed_fields.status[0])} &rarr;{' '}
                      {String(a.changed_fields.status[1])}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
