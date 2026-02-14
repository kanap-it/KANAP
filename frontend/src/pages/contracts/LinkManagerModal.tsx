import React from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import api from '../../api';

type Props = {
  open: boolean;
  contractId: string;
  contractName: string;
  onClose: () => void;
  onSaved: () => void;
};

type SpendItem = { id: string; product_name: string };

export default function LinkManagerModal({ open, contractId, contractName, onClose, onSaved }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [options, setOptions] = React.useState<SpendItem[]>([]);
  const [selected, setSelected] = React.useState<SpendItem[]>([]);

  const loadCurrent = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/contracts/${contractId}/spend-items`);
      setSelected(res.data?.items || []);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  React.useEffect(() => { if (open) { setQuery(''); setOptions([]); void loadCurrent(); } }, [open]);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      if (!query || query.trim().length < 2) { setOptions([]); return; }
      try {
        const res = await api.get<{ items: any[] }>(`/spend-items`, { params: { q: query, limit: 20 } });
        if (!cancel) setOptions((res.data?.items || []).map((r: any) => ({ id: r.id, product_name: r.product_name })));
      } catch {
        if (!cancel) setOptions([]);
      }
    })();
    return () => { cancel = true; };
  }, [query]);

  const addItem = (item: SpendItem) => { if (!selected.find(x => x.id === item.id)) setSelected(prev => [...prev, item]); };
  const removeItem = (id: string) => setSelected(prev => prev.filter(x => x.id !== id));

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/contracts/${contractId}/spend-items/bulk-replace`, { spend_item_ids: selected.map(s => s.id) });
      onSaved(); onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Linked OPEX — {contractName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <TextField placeholder="Search OPEX by product name" value={query} onChange={(e) => setQuery(e.target.value)} fullWidth />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Results</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {options.map((o) => (
                <Chip key={o.id} label={o.product_name} onClick={() => addItem(o)} />
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {selected.map((s) => (
                <Chip key={s.id} label={s.product_name} onDelete={() => removeItem(s.id)} />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
