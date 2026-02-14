import { useCallback, useState } from 'react';
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem,
  Select, Stack, TextField,
} from '@mui/material';

const DECISION_OUTCOMES = [
  { value: '', label: '— Select outcome —' },
  { value: 'go', label: 'Go' },
  { value: 'no_go', label: 'No-Go' },
  { value: 'defer', label: 'Defer' },
  { value: 'need_info', label: 'Need Info' },
  { value: 'analysis_complete', label: 'Analysis Complete' },
];

interface StatusChangeDialogProps {
  open: boolean;
  currentStatus: string;
  newStatus: string;
  onConfirm: (options: {
    isDecision: boolean;
    outcome?: string;
    context?: string;
    rationale?: string;
  }) => void;
  onCancel: () => void;
}

const formatStatus = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function StatusChangeDialog({
  open,
  currentStatus,
  newStatus,
  onConfirm,
  onCancel,
}: StatusChangeDialogProps) {
  const [isDecision, setIsDecision] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [context, setContext] = useState('');
  const [rationale, setRationale] = useState('');

  const handleConfirm = useCallback(() => {
    onConfirm({
      isDecision,
      outcome: isDecision && outcome ? outcome : undefined,
      context: isDecision ? context : undefined,
      rationale: isDecision ? rationale : undefined,
    });
    // Reset state after confirm
    setIsDecision(false);
    setOutcome('');
    setContext('');
    setRationale('');
  }, [isDecision, outcome, context, rationale, onConfirm]);

  const handleCancel = useCallback(() => {
    // Reset state on cancel
    setIsDecision(false);
    setOutcome('');
    setContext('');
    setRationale('');
    onCancel();
  }, [onCancel]);

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Change Status</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Status will change from <strong>{formatStatus(currentStatus)}</strong> to{' '}
            <strong>{formatStatus(newStatus)}</strong>
          </Alert>

          <FormControlLabel
            control={
              <Checkbox
                checked={isDecision}
                onChange={(e) => setIsDecision(e.target.checked)}
              />
            }
            label="Log as formal decision (e.g., CAB decision)"
          />

          {isDecision && (
            <>
              <FormControl fullWidth required>
                <InputLabel id="decision-outcome-label">Decision Outcome</InputLabel>
                <Select
                  labelId="decision-outcome-label"
                  value={outcome}
                  label="Decision Outcome"
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  {DECISION_OUTCOMES.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} disabled={opt.value === ''}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Meeting / Context"
                placeholder="e.g., CAB Meeting 2024-12-15"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                fullWidth
              />
              <TextField
                label="Rationale / Notes"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
