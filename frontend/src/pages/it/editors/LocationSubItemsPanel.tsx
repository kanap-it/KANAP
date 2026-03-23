import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Alert,
  Button,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';

import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
export type LocationSubItemsPanelHandle = {
  save: () => Promise<void>;
  reset: () => void;
};

type SubItemRow = {
  id?: string;
  name: string;
  description: string;
};

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
};

function normalize(list: SubItemRow[]) {
  return list.map((row) => ({
    id: row.id || null,
    name: (row.name || '').trim(),
    description: (row.description || '').trim(),
  }));
}

export default forwardRef<LocationSubItemsPanelHandle, Props>(function LocationSubItemsPanel({ id, onDirtyChange }, ref) {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel } = useAuth();
  const readOnly = !hasLevel('locations', 'member');

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [items, setItems] = React.useState<SubItemRow[]>([]);
  const [baseline, setBaseline] = React.useState<SubItemRow[]>([]);

  const dirty = React.useMemo(() => {
    return JSON.stringify(normalize(items)) !== JSON.stringify(normalize(baseline));
  }, [items, baseline]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/locations/${id}/sub-items`);
      const data = ((res.data || []) as any[]).map((r) => ({
        id: r.id,
        name: r.name || '',
        description: r.description || '',
      }));
      setItems(data);
      setBaseline(data);
    } catch (e: any) {
      const msg = getApiErrorMessage(e, t, t('messages.loadSubLocationsFailed'));
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (readOnly) return;
      setSaving(true);
      setError(null);
      try {
        const baselineMap = new Map((baseline || []).map((row) => [row.id, row]));
        const currentMap = new Map((items || []).filter((r) => r.id).map((row) => [row.id, row]));

        // Create new items and update changed ones
        for (const row of items) {
          if (!row.name?.trim()) throw new Error('Sub-location name is required.');
          if (!row.id) {
            await api.post(`/locations/${id}/sub-items`, {
              name: row.name.trim(),
              description: row.description?.trim() || null,
            });
          } else {
            const baselineRow = baselineMap.get(row.id);
            if (baselineRow && (baselineRow.name !== row.name.trim() || (baselineRow.description || '') !== (row.description || '').trim())) {
              await api.patch(`/locations/${id}/sub-items/${row.id}`, {
                name: row.name.trim(),
                description: row.description?.trim() || null,
              });
            }
          }
        }

        // Delete removed items
        for (const baselineRow of baseline) {
          if (baselineRow.id && !currentMap.has(baselineRow.id)) {
            await api.delete(`/locations/${id}/sub-items/${baselineRow.id}`);
          }
        }

        await load();
      } catch (e: any) {
        const msg = getApiErrorMessage(e, t, t('messages.saveSubLocationsFailed'));
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    reset: () => {
      setItems(baseline);
      setError(null);
    },
  }));

  const addRow = () => {
    setItems((rows) => [...rows, { name: '', description: '' }]);
  };

  const updateRow = (index: number, patch: Partial<SubItemRow>) => {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    setItems((rows) => rows.filter((_, i) => i !== index));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Sub-locations</Typography>
        {!readOnly && (
          <Button onClick={addRow} size="small">
            Add sub-location
          </Button>
        )}
      </Stack>
      {(loading || saving) && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            {!readOnly && <TableCell align="right" sx={{ width: 50 }}>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={readOnly ? 2 : 3}>
                <Typography variant="body2" color="text.secondary">
                  No sub-locations defined. Add buildings, rooms, racks, or other physical areas.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {items.map((row, index) => (
            <TableRow key={row.id || `new-${index}`}>
              <TableCell sx={{ minWidth: 200 }}>
                <TextField
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  disabled={readOnly}
                  size="small"
                  fullWidth
                  placeholder="e.g. Building A - Room 1 - Rack 5"
                />
              </TableCell>
              <TableCell sx={{ minWidth: 250 }}>
                <TextField
                  value={row.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  disabled={readOnly}
                  size="small"
                  fullWidth
                  placeholder="Optional description"
                />
              </TableCell>
              {!readOnly && (
                <TableCell align="right">
                  <IconButton size="small" onClick={() => removeRow(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
});
