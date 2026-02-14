import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import api from '../../../api';

export interface EligibleUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_lead: boolean;
  allocation_pct?: number;
}

interface EffortAllocationDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  effortType: 'it' | 'business';
  eligibleUsers: EligibleUser[];
  estimatedEffort: number;
  onSuccess: () => void;
}

export default function EffortAllocationDialog({
  open,
  onClose,
  projectId,
  effortType,
  eligibleUsers,
  estimatedEffort,
  onSuccess,
}: EffortAllocationDialogProps) {
  const [allocations, setAllocations] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sort users: lead first, then alphabetically
  const sortedUsers = React.useMemo(() => {
    return [...eligibleUsers].sort((a, b) => {
      if (a.is_lead && !b.is_lead) return -1;
      if (!a.is_lead && b.is_lead) return 1;
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [eligibleUsers]);

  // Initialize allocations when dialog opens
  React.useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      for (const user of eligibleUsers) {
        initial[user.user_id] = user.allocation_pct ?? 0;
      }
      setAllocations(initial);
      setError(null);
    }
  }, [open, eligibleUsers]);

  const total = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  const isValid = total === 100;

  const handleChange = (userId: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;
    setAllocations((prev) => ({ ...prev, [userId]: numValue }));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Allocations must sum to exactly 100%');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const allocationsList = Object.entries(allocations)
        .filter(([, pct]) => pct > 0)
        .map(([user_id, allocation_pct]) => ({ user_id, allocation_pct }));

      await api.post(`/portfolio/projects/${projectId}/effort-allocations/${effortType}`, {
        allocations: allocationsList,
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save allocations');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const title = effortType === 'it' ? 'IT Effort Allocation' : 'Business Effort Allocation';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Set the percentage allocation for each contributor. Must sum to exactly 100%.
          </Typography>

          {sortedUsers.length === 0 ? (
            <Alert severity="info">
              No eligible users. Assign a {effortType === 'it' ? 'IT' : 'Business'} lead or team members first.
            </Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Contributor</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: 100 }}>%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: 80 }}>MD</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedUsers.map((user) => {
                  const pct = allocations[user.user_id] || 0;
                  const md = estimatedEffort > 0
                    ? Math.round((pct / 100) * estimatedEffort * 10) / 10
                    : 0;
                  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">{displayName}</Typography>
                          {user.is_lead && (
                            <Chip label="Lead" size="small" color="primary" variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={pct}
                          onChange={(e) => handleChange(user.user_id, e.target.value)}
                          inputProps={{ min: 0, max: 100, step: 1, style: { textAlign: 'right' } }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">{md}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: isValid ? 'success.main' : 'error.main',
              }}
            >
              Total: {total}%
            </Typography>
            {!isValid && (
              <Typography variant="caption" color="error.main">
                Must equal 100%
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !isValid || sortedUsers.length === 0}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
