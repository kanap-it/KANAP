import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import UserSelect from '../../../components/fields/UserSelect';

type TimeEntryCategory = 'it' | 'business';

export interface TimeEntryData {
  id: string;
  category: TimeEntryCategory;
  user_id: string | null;
  hours: number;
  notes: string | null;
}

interface LogTimeDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
  editEntry?: TimeEntryData;
}

export default function LogTimeDialog({
  open,
  onClose,
  projectId,
  onSuccess,
  editEntry,
}: LogTimeDialogProps) {
  const { profile } = useAuth();
  const isEdit = !!editEntry;

  const [category, setCategory] = React.useState<TimeEntryCategory>('it');
  const [userId, setUserId] = React.useState<string | null>(null);
  const [days, setDays] = React.useState<number>(0);
  const [hours, setHours] = React.useState<number>(0);
  const [notes, setNotes] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      if (editEntry) {
        setCategory(editEntry.category);
        setUserId(editEntry.user_id);
        // Convert total hours back to days and hours
        const totalHours = editEntry.hours;
        setDays(Math.floor(totalHours / 8));
        setHours(totalHours % 8);
        setNotes(editEntry.notes || '');
      } else {
        setCategory('it');
        setUserId(profile?.id || null);
        setDays(0);
        setHours(0);
        setNotes('');
      }
      setError(null);
    }
  }, [open, editEntry, profile?.id]);

  const totalHours = days * 8 + hours;

  const handleSubmit = async () => {
    if (totalHours <= 0) {
      setError('Total time must be greater than 0');
      return;
    }
    if (!userId) {
      setError('Please select a person');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEdit && editEntry) {
        await api.patch(`/portfolio/projects/${projectId}/time-entries/${editEntry.id}`, {
          category,
          user_id: userId,
          hours: totalHours,
          notes: notes.trim() || null,
        });
      } else {
        await api.post(`/portfolio/projects/${projectId}/time-entries`, {
          category,
          user_id: userId,
          hours: totalHours,
          notes: notes.trim() || null,
        });
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save time entry');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Time Entry' : 'Log Time'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl component="fieldset">
            <FormLabel component="legend">Category *</FormLabel>
            <RadioGroup
              row
              value={category}
              onChange={(e) => setCategory(e.target.value as TimeEntryCategory)}
            >
              <FormControlLabel value="it" control={<Radio />} label="IT" />
              <FormControlLabel value="business" control={<Radio />} label="Business" />
            </RadioGroup>
          </FormControl>

          <UserSelect
            label="Person"
            value={userId}
            onChange={setUserId}
            placeholder="Search users..."
            required
          />

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              label="Hours"
              type="number"
              value={hours}
              onChange={(e) => {
                const val = Math.max(0, Math.min(7, Math.floor(Number(e.target.value) || 0)));
                setHours(val);
              }}
              inputProps={{ min: 0, max: 7, step: 1 }}
              sx={{ flex: 1 }}
              helperText="0-7 hours"
            />
            <TextField
              label="Days"
              type="number"
              value={days}
              onChange={(e) => {
                const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                setDays(val);
              }}
              inputProps={{ min: 0, step: 1 }}
              sx={{ flex: 1 }}
              helperText="8 hours/day"
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Total: <strong>{totalHours} hour{totalHours !== 1 ? 's' : ''}</strong>
            {totalHours > 0 && ` (${(totalHours / 8).toFixed(1)} MD)`}
          </Typography>

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            placeholder="Optional description of work done..."
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || totalHours <= 0 || !userId}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Log Time'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
