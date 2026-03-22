import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Alert,
  Box,
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
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../../api';
import UserSelect from '../../../components/fields/UserSelect';
import ContactSelect from '../../../components/fields/ContactSelect';
import { useAuth } from '../../../auth/AuthContext';

export type LocationContactsPanelHandle = {
  save: () => Promise<void>;
  reset: () => void;
};

type InternalContactRow = {
  id?: string;
  user_id: string | null;
  user?: { id: string; first_name?: string | null; last_name?: string | null; email: string };
  role: string;
};

type ExternalContactRow = {
  id?: string;
  contact_id: string | null;
  contact?: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; job_title?: string | null };
  role: string;
};

type LinkRow = { id?: string; description?: string | null; url: string };

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
};

function normalizeInternal(list: InternalContactRow[]) {
  return list.map((row) => ({
    id: row.id || null,
    user_id: row.user_id || null,
    role: row.role || '',
  }));
}

function normalizeExternal(list: ExternalContactRow[]) {
  return list.map((row) => ({
    id: row.id || null,
    contact_id: row.contact_id || null,
    role: row.role || '',
  }));
}

function normalizeLinks(list: LinkRow[]) {
  return list.map((row) => ({
    id: row.id || null,
    description: row.description || '',
    url: row.url || '',
  }));
}

export default forwardRef<LocationContactsPanelHandle, Props>(function LocationContactsPanel({ id, onDirtyChange }, ref) {
  const { hasLevel } = useAuth();
  const readOnly = !hasLevel('locations', 'member');

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [internalContacts, setInternalContacts] = React.useState<InternalContactRow[]>([]);
  const [externalContacts, setExternalContacts] = React.useState<ExternalContactRow[]>([]);
  const [links, setLinks] = React.useState<LinkRow[]>([]);

  const [baselineInternal, setBaselineInternal] = React.useState<InternalContactRow[]>([]);
  const [baselineExternal, setBaselineExternal] = React.useState<ExternalContactRow[]>([]);
  const [baselineLinks, setBaselineLinks] = React.useState<LinkRow[]>([]);

  const dirty = React.useMemo(() => {
    if (JSON.stringify(normalizeInternal(internalContacts)) !== JSON.stringify(normalizeInternal(baselineInternal))) return true;
    if (JSON.stringify(normalizeExternal(externalContacts)) !== JSON.stringify(normalizeExternal(baselineExternal))) return true;
    if (JSON.stringify(normalizeLinks(links)) !== JSON.stringify(normalizeLinks(baselineLinks))) return true;
    return false;
  }, [internalContacts, baselineInternal, externalContacts, baselineExternal, links, baselineLinks]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [internalRes, externalRes, linksRes] = await Promise.all([
        api.get(`/locations/${id}/internal-contacts`),
        api.get(`/locations/${id}/external-contacts`),
        api.get(`/locations/${id}/links`),
      ]);
      const internalItems = (internalRes.data || []) as InternalContactRow[];
      const externalItems = (externalRes.data || []) as ExternalContactRow[];
      const linkItems = (linksRes.data || []) as LinkRow[];
      setInternalContacts(internalItems);
      setExternalContacts(externalItems);
      setLinks(linkItems);
      setBaselineInternal(internalItems);
      setBaselineExternal(externalItems);
      setBaselineLinks(linkItems);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load contacts';
      setError(msg);
      setInternalContacts([]);
      setExternalContacts([]);
      setLinks([]);
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
        await saveInternal();
        await saveExternal();
        await saveLinks();
        await load();
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to save contacts';
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    reset: () => {
      setInternalContacts(baselineInternal);
      setExternalContacts(baselineExternal);
      setLinks(baselineLinks);
      setError(null);
    },
  }));

  const saveInternal = async () => {
    const baselineMap = new Map((baselineInternal || []).map((row) => [row.id, row]));
    const currentMap = new Map((internalContacts || []).map((row) => [row.id, row]));
    for (const row of internalContacts) {
      if (!row.user_id) {
        throw new Error('Internal contacts require a user.');
      }
      if (!row.id) {
        await api.post(`/locations/${id}/internal-contacts`, { user_id: row.user_id, role: row.role?.trim() || null });
      } else {
        const baselineRow = baselineMap.get(row.id);
        if (!baselineRow || baselineRow.user_id !== row.user_id || baselineRow.role !== row.role) {
          await api.patch(`/locations/${id}/internal-contacts/${row.id}`, {
            user_id: row.user_id,
            role: row.role?.trim() || null,
          });
        }
      }
    }
    for (const baselineRow of baselineInternal) {
      if (baselineRow.id && !currentMap.has(baselineRow.id)) {
        await api.delete(`/locations/${id}/internal-contacts/${baselineRow.id}`);
      }
    }
  };

  const saveExternal = async () => {
    const baselineMap = new Map((baselineExternal || []).map((row) => [row.id, row]));
    const currentMap = new Map((externalContacts || []).map((row) => [row.id, row]));
    for (const row of externalContacts) {
      if (!row.contact_id) {
        throw new Error('External contacts require a contact.');
      }
      if (!row.id) {
        await api.post(`/locations/${id}/external-contacts`, { contact_id: row.contact_id, role: row.role?.trim() || null });
      } else {
        const baselineRow = baselineMap.get(row.id);
        if (!baselineRow || baselineRow.contact_id !== row.contact_id || baselineRow.role !== row.role) {
          await api.patch(`/locations/${id}/external-contacts/${row.id}`, {
            contact_id: row.contact_id,
            role: row.role?.trim() || null,
          });
        }
      }
    }
    for (const baselineRow of baselineExternal) {
      if (baselineRow.id && !currentMap.has(baselineRow.id)) {
        await api.delete(`/locations/${id}/external-contacts/${baselineRow.id}`);
      }
    }
  };

  const saveLinks = async () => {
    const baselineMap = new Map((baselineLinks || []).map((row) => [row.id, row]));
    const currentMap = new Map((links || []).map((row) => [row.id, row]));
    for (const row of links) {
      if (!row.url?.trim()) {
        throw new Error('Links require a URL.');
      }
      if (!row.id) {
        await api.post(`/locations/${id}/links`, { description: row.description ?? null, url: row.url.trim() });
      } else {
        const baselineRow = baselineMap.get(row.id);
        if (!baselineRow || baselineRow.description !== row.description || baselineRow.url !== row.url) {
          await api.patch(`/locations/${id}/links/${row.id}`, { description: row.description ?? null, url: row.url.trim() });
        }
      }
    }
    for (const baselineRow of baselineLinks) {
      if (baselineRow.id && !currentMap.has(baselineRow.id)) {
        await api.delete(`/locations/${id}/links/${baselineRow.id}`);
      }
    }
  };

  const addInternalRow = () => {
    setInternalContacts((rows) => [...rows, { user_id: null, role: '' }]);
  };

  const addExternalRow = () => {
    setExternalContacts((rows) => [...rows, { contact_id: null, role: '' }]);
  };

  const addLinkRow = () => {
    setLinks((rows) => [...rows, { description: '', url: '' }]);
  };

  const updateInternalRow = (index: number, patch: Partial<InternalContactRow>) => {
    setInternalContacts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateExternalRow = (index: number, patch: Partial<ExternalContactRow>) => {
    setExternalContacts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateLinkRow = (index: number, patch: Partial<LinkRow>) => {
    setLinks((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeInternalRow = (index: number) => {
    setInternalContacts((rows) => rows.filter((_, i) => i !== index));
  };

  const removeExternalRow = (index: number) => {
    setExternalContacts((rows) => rows.filter((_, i) => i !== index));
  };

  const removeLinkRow = (index: number) => {
    setLinks((rows) => rows.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={2}>
      {(loading || saving) && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Internal contacts</Typography>
          {!readOnly && (
            <Button onClick={addInternalRow} size="small">
              Add internal contact
            </Button>
          )}
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {internalContacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">No internal contacts yet.</Typography>
                </TableCell>
              </TableRow>
            )}
            {internalContacts.map((row, index) => (
              <TableRow key={row.id || index}>
                <TableCell sx={{ minWidth: 220 }}>
                  <UserSelect
                    value={row.user_id}
                    onChange={(val) => updateInternalRow(index, { user_id: val })}
                    disabled={readOnly}
                    required
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                  <TextField
                    value={row.role || ''}
                    onChange={(e) => updateInternalRow(index, { role: e.target.value })}
                    disabled={readOnly}
                    size="small"
                    fullWidth
                    placeholder="e.g. Ops lead"
                  />
                </TableCell>
                <TableCell align="right">
                  {!readOnly && (
                    <IconButton size="small" onClick={() => removeInternalRow(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>External contacts</Typography>
          {!readOnly && (
            <Button onClick={addExternalRow} size="small">
              Add external contact
            </Button>
          )}
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Contact</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {externalContacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">No external contacts yet.</Typography>
                </TableCell>
              </TableRow>
            )}
            {externalContacts.map((row, index) => (
              <TableRow key={row.id || index}>
                <TableCell sx={{ minWidth: 220 }}>
                  <ContactSelect
                    value={row.contact_id}
                    onChange={(val) => updateExternalRow(index, { contact_id: val })}
                    disabled={readOnly}
                    required
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                  <TextField
                    value={row.role || ''}
                    onChange={(e) => updateExternalRow(index, { role: e.target.value })}
                    disabled={readOnly}
                    size="small"
                    fullWidth
                    placeholder="e.g. Account manager"
                  />
                </TableCell>
                <TableCell align="right">
                  {!readOnly && (
                    <IconButton size="small" onClick={() => removeExternalRow(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Relevant websites</Typography>
          {!readOnly && (
            <Button onClick={addLinkRow} size="small">
              Add website
            </Button>
          )}
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>URL</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {links.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">No links yet.</Typography>
                </TableCell>
              </TableRow>
            )}
            {links.map((row, index) => (
              <TableRow key={row.id || index}>
                <TableCell sx={{ minWidth: 200 }}>
                  <TextField
                    value={row.description || ''}
                    onChange={(e) => updateLinkRow(index, { description: e.target.value })}
                    disabled={readOnly}
                    size="small"
                    fullWidth
                    placeholder="Description"
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  <TextField
                    value={row.url}
                    onChange={(e) => updateLinkRow(index, { url: e.target.value })}
                    disabled={readOnly}
                    size="small"
                    fullWidth
                    placeholder="https://..."
                    required
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => row.url && window.open(row.url, '_blank', 'noopener,noreferrer')}
                    disabled={!row.url}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                  {!readOnly && (
                    <IconButton size="small" onClick={() => removeLinkRow(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
});
