import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../../../api';
import { MarkdownContent } from '../../../components/MarkdownContent';

interface ConvertToRequestDialogProps {
  open: boolean;
  onClose: () => void;
  task: {
    id: string;
    item_number: number | null;
    title: string | null;
    description: string | null;
  };
  onSuccess: (requestId: string) => void;
}

export default function ConvertToRequestDialog({
  open,
  onClose,
  task,
  onSuccess,
}: ConvertToRequestDialogProps) {
  const [name, setName] = React.useState(task.title || '');
  const [closeTask, setCloseTask] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(task.title || '');
    setCloseTask(false);
    setError(null);
  }, [open, task.title]);

  const handleSubmit = React.useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const taskLinkId = task.item_number ? `T-${task.item_number}` : task.id;
      const body: Record<string, unknown> = {
        name: name.trim(),
        close_task: closeTask,
        origin_task_url: `${window.location.origin}/portfolio/tasks/${taskLinkId}/overview`,
      };
      const res = await api.post(`/portfolio/requests/from-task/${task.id}`, body);
      onSuccess(res.data?.id);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to convert task to request');
    } finally {
      setSaving(false);
    }
  }, [name, closeTask, task.id, task.item_number, onSuccess]);

  const taskRef = task.item_number ? `T-${task.item_number}` : task.id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Convert to Request</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Converting {taskRef}: {task.title || '(untitled task)'} into a portfolio request
          </Typography>

          <TextField
            label="Request Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Purpose Preview
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                minHeight: 90,
                bgcolor: 'action.hover',
              }}
            >
              <MarkdownContent content={task.description || '(No description)'} variant="compact" />
            </Box>
          </Box>

          <FormControlLabel
            control={(
              <Checkbox
                checked={closeTask}
                onChange={(e) => setCloseTask(e.target.checked)}
              />
            )}
            label="Close the original task after conversion"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
        >
          {saving ? 'Converting...' : 'Convert to Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
