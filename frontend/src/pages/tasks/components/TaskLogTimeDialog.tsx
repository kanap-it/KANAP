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
import DateEUField from '../../../components/fields/DateEUField';

type TimeEntryCategory = 'it' | 'business';

export interface TaskTimeEntryData {
  id: string;
  user_id: string | null;
  hours: number;
  notes: string | null;
  logged_at: string;
  category: TimeEntryCategory;
}

interface TaskLogTimeDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  projectId?: string;
  onSuccess: () => void;
  editEntry?: TaskTimeEntryData;
}

export default function TaskLogTimeDialog({
  open,
  onClose,
  taskId,
  projectId,
  onSuccess,
  editEntry,
}: TaskLogTimeDialogProps) {
  const { profile } = useAuth();
  const isEdit = !!editEntry;

  const [category, setCategory] = React.useState<TimeEntryCategory>('it');
  const [userId, setUserId] = React.useState<string | null>(null);
  const [days, setDays] = React.useState<string>('');
  const [hours, setHours] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');
  const [loggedAt, setLoggedAt] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Parse string values to numbers, treating empty as 0
  const daysNum = parseInt(days, 10) || 0;
  const hoursNum = parseInt(hours, 10) || 0;

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      if (editEntry) {
        setCategory(editEntry.category || 'it');
        setUserId(editEntry.user_id);
        const total = editEntry.hours;
        const d = Math.floor(total / 8);
        const h = Math.round(total % 8);
        setDays(d > 0 ? String(d) : '');
        setHours(h > 0 ? String(h) : '');
        setNotes(editEntry.notes || '');
        setLoggedAt(editEntry.logged_at ? editEntry.logged_at.split('T')[0] : '');
      } else {
        setCategory('it');
        setUserId(profile?.id || null);
        setDays('');
        setHours('');
        setNotes('');
        setLoggedAt(new Date().toISOString().split('T')[0]);
      }
      setError(null);
    }
  }, [open, editEntry, profile?.id]);

  const totalHours = daysNum * 8 + hoursNum;

  const handleSubmit = async () => {
    if (totalHours < 1) {
      setError('Minimum loggable time is 1 hour');
      return;
    }
    if (!userId) {
      setError('Please select a person');
      return;
    }
    if (!loggedAt) {
      setError('Please select a date');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const endpoint = projectId
        ? `/portfolio/projects/${projectId}/tasks/${taskId}/time-entries`
        : `/tasks/${taskId}/time-entries`;

      if (isEdit && editEntry) {
        await api.patch(`${endpoint}/${editEntry.id}`, {
          category,
          user_id: userId,
          hours: totalHours,
          notes: notes.trim() || null,
          logged_at: loggedAt,
        });
      } else {
        await api.post(endpoint, {
          category,
          user_id: userId,
          hours: totalHours,
          notes: notes.trim() || null,
          logged_at: loggedAt,
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

          <DateEUField
            label="Date"
            valueYmd={loggedAt}
            onChangeYmd={setLoggedAt}
            required
          />

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              label="Hours"
              type="text"
              inputMode="numeric"
              value={hours}
              onChange={(e) => {
                const raw = e.target.value;
                // Allow empty or digits only
                if (raw === '' || /^\d+$/.test(raw)) {
                  const num = parseInt(raw, 10);
                  if (raw === '' || (num >= 0 && num <= 7)) {
                    setHours(raw);
                  }
                }
              }}
              sx={{
                flex: 1,
              }}
              helperText="0-7 hours"
            />
            <TextField
              label="Days"
              type="text"
              inputMode="numeric"
              value={days}
              onChange={(e) => {
                const raw = e.target.value;
                // Allow empty or digits only
                if (raw === '' || /^\d+$/.test(raw)) {
                  setDays(raw);
                }
              }}
              sx={{
                flex: 1,
              }}
              helperText="8 hours/day"
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Total: <strong>{totalHours} hour{totalHours !== 1 ? 's' : ''}</strong>
            {totalHours > 0 && ` (${(totalHours / 8).toFixed(2)} MD)`}
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
          disabled={saving || totalHours < 1 || !userId || !loggedAt}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Log Time'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
