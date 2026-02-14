import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { RichTextEditor } from '../../../components/RichTextEditor';

const ANALYSIS_RECOMMENDATION_CONTEXT = 'Analysis Recommendation';

const DECISION_OUTCOMES = [
  { value: 'go', label: 'Go' },
  { value: 'no_go', label: 'No-Go' },
  { value: 'defer', label: 'Defer' },
  { value: 'need_info', label: 'Need Info' },
  { value: 'analysis_complete', label: 'Analysis Complete' },
];

interface RecommendationDialogProps {
  open: boolean;
  currentStatus: string;
  allowedTransitions: string[];
  statusOptions: Array<{ value: string; label: string }>;
  priorityScore?: number | null;
  onClose: () => void;
  onSubmit: (data: {
    content: string;
    context: string | null;
    is_decision: boolean;
    decision_outcome?: string;
    new_status?: string;
  }) => Promise<void>;
  onImageUpload?: (file: File, sourceField: string) => Promise<string>;
}

export default function RecommendationDialog({
  open,
  currentStatus,
  allowedTransitions,
  statusOptions,
  priorityScore = null,
  onClose,
  onSubmit,
  onImageUpload,
}: RecommendationDialogProps) {
  const [decisionOutcome, setDecisionOutcome] = React.useState('');
  const [newStatus, setNewStatus] = React.useState('');
  const [rationale, setRationale] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editorKey, setEditorKey] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setDecisionOutcome('');
    setNewStatus('');
    setRationale('');
    setError(null);
    setEditorKey((k) => k + 1);
  }, [open]);

  const handleImageUpload = async (file: File): Promise<string> => {
    if (!onImageUpload) {
      throw new Error('Image upload not configured');
    }
    return onImageUpload(file, 'content');
  };

  const handleSubmit = async () => {
    if (!decisionOutcome) {
      setError('Decision outcome is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        content: rationale.trim(),
        context: ANALYSIS_RECOMMENDATION_CONTEXT,
        is_decision: true,
        decision_outcome: decisionOutcome,
        new_status: newStatus || undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to submit recommendation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Submit Analysis Recommendation</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {priorityScore != null && (
            <Alert severity="info">
              Current priority score snapshot: <strong>{Math.round(priorityScore)}</strong>
            </Alert>
          )}

          {!!error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Context"
            value={ANALYSIS_RECOMMENDATION_CONTEXT}
            fullWidth
            size="small"
            disabled
          />

          <Stack direction="row" spacing={2}>
            <FormControl size="small" fullWidth required>
              <InputLabel>Decision Outcome</InputLabel>
              <Select
                value={decisionOutcome}
                label="Decision Outcome"
                onChange={(e) => setDecisionOutcome(e.target.value)}
                disabled={submitting}
              >
                {DECISION_OUTCOMES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Change Status to...</InputLabel>
              <Select
                value={newStatus}
                label="Change Status to..."
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={submitting}
              >
                <MenuItem value="">(No change)</MenuItem>
                {allowedTransitions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {statusOptions.find((s) => s.value === status)?.label || status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Rationale
            </Typography>
            <RichTextEditor
              key={editorKey}
              value={rationale}
              onChange={setRationale}
              placeholder="Summarize the recommendation, conditions, and key constraints..."
              minRows={8}
              maxRows={16}
              disabled={submitting}
              onImageUpload={onImageUpload ? handleImageUpload : undefined}
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Current request status: {statusOptions.find((s) => s.value === currentStatus)?.label || currentStatus}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting || !decisionOutcome}>
          Submit Recommendation
        </Button>
      </DialogActions>
    </Dialog>
  );
}
