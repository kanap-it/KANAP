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
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import UserSelect from '../../../components/fields/UserSelect';
import DateEUField from '../../../components/fields/DateEUField';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';

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
  const { profile, hasLevel } = useAuth();
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const isEdit = !!editEntry;
  const canAssignUser = projectId
    ? hasLevel('portfolio_projects', 'admin')
    : hasLevel('tasks', 'admin');

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
        setUserId(canAssignUser ? editEntry.user_id : (profile?.id || null));
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
  }, [open, editEntry, profile?.id, canAssignUser]);

  const totalHours = daysNum * 8 + hoursNum;

  const handleSubmit = async () => {
    if (totalHours < 1) {
      setError(t('portfolio:dialogs.logTime.validation.minimumOneHour'));
      return;
    }
    const effectiveUserId = canAssignUser ? userId : (profile?.id || null);

    if (!effectiveUserId) {
      setError(t('portfolio:dialogs.logTime.validation.personRequired'));
      return;
    }
    if (!loggedAt) {
      setError(t('portfolio:dialogs.logTime.validation.dateRequired'));
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
          user_id: effectiveUserId,
          hours: totalHours,
          notes: notes.trim() || null,
          logged_at: loggedAt,
        });
      } else {
        await api.post(endpoint, {
          category,
          user_id: effectiveUserId,
          hours: totalHours,
          notes: notes.trim() || null,
          logged_at: loggedAt,
        });
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(getApiErrorMessage(
        e,
        t,
        t('portfolio:dialogs.logTime.messages.saveFailed'),
      ));
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
      <DialogTitle>
        {isEdit
          ? t('portfolio:dialogs.logTime.title.edit')
          : t('portfolio:dialogs.logTime.title.create')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl component="fieldset">
            <FormLabel component="legend">{t('portfolio:dialogs.logTime.fields.category')}</FormLabel>
            <RadioGroup
              row
              value={category}
              onChange={(e) => setCategory(e.target.value as TimeEntryCategory)}
            >
              <FormControlLabel
                value="it"
                control={<Radio />}
                label={t('portfolio:dialogs.logTime.categories.it')}
              />
              <FormControlLabel
                value="business"
                control={<Radio />}
                label={t('portfolio:dialogs.logTime.categories.business')}
              />
            </RadioGroup>
          </FormControl>

          <UserSelect
            label={t('portfolio:dialogs.logTime.fields.person')}
            value={userId}
            onChange={setUserId}
            placeholder={t('portfolio:dialogs.logTime.placeholders.searchUsers')}
            required
            disabled={!canAssignUser}
          />

          <DateEUField
            label={t('portfolio:dialogs.logTime.fields.date')}
            valueYmd={loggedAt}
            onChangeYmd={setLoggedAt}
            required
          />

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TextField
              label={t('portfolio:dialogs.logTime.fields.hours')}
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
              helperText={t('portfolio:dialogs.logTime.helper.hoursRange')}
            />
            <TextField
              label={t('portfolio:dialogs.logTime.fields.days')}
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
              helperText={t('portfolio:dialogs.logTime.helper.dayLength')}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {t('portfolio:dialogs.logTime.helper.total', {
              hours: totalHours,
              md: (totalHours / 8).toFixed(2),
            })}
          </Typography>

          <TextField
            label={t('portfolio:dialogs.logTime.fields.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            placeholder={t('portfolio:dialogs.logTime.placeholders.notes')}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {t('common:buttons.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || totalHours < 1 || !(canAssignUser ? userId : profile?.id) || !loggedAt}
        >
          {saving
            ? t('common:status.saving')
            : isEdit
            ? t('common:buttons.saveChanges')
            : t('portfolio:dialogs.logTime.actions.logTime')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
