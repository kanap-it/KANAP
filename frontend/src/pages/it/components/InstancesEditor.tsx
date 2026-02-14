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
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import api from '../../../api';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';

const ENV_OPTIONS = [
  { value: 'prod', label: 'Prod' },
  { value: 'pre_prod', label: 'Pre-prod' },
  { value: 'qa', label: 'QA' },
  { value: 'test', label: 'Test' },
  { value: 'dev', label: 'Dev' },
  { value: 'sandbox', label: 'Sandbox' },
] as const;

export type AppInstanceRecord = {
  id: string;
  application_id: string;
  environment: string;
  lifecycle: string;
  base_url: string | null;
  sso_enabled: boolean;
  mfa_supported: boolean;
  status: 'enabled' | 'disabled';
  notes: string | null;
};

type InstancesEditorProps = {
  applicationId: string;
  instances: AppInstanceRecord[];
  onRefresh: () => Promise<void>;
  readOnly?: boolean;
};

type InstanceDraft = {
  id?: string;
  environment: string;
  lifecycle: string;
  base_url: string;
  sso_enabled: boolean;
  mfa_supported: boolean;
  notes: string;
};

function createDraft(instance?: AppInstanceRecord): InstanceDraft {
  return {
    id: instance?.id,
    environment: instance?.environment || 'prod',
    lifecycle: instance?.lifecycle || 'active',
    base_url: instance?.base_url || '',
    sso_enabled: !!instance?.sso_enabled,
    mfa_supported: !!instance?.mfa_supported,
    notes: instance?.notes || '',
  };
}

type InstanceDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (draft: InstanceDraft) => Promise<void>;
  draft: InstanceDraft;
  setDraft: React.Dispatch<React.SetStateAction<InstanceDraft>>;
  mode: 'create' | 'edit';
  instances: AppInstanceRecord[];
};

function InstanceDialog({ open, onClose, onSave, draft, setDraft, mode, instances }: InstanceDialogProps) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { byField } = useItOpsEnumOptions();
  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    const current = draft.lifecycle;
    const opts = list.map((item) => ({
      value: item.code,
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
      deprecated: !!item.deprecated,
    }));
    if (current && !opts.some((opt) => opt.value === current)) {
      opts.push({ value: current, label: current, deprecated: false });
    }
    return opts.filter((opt) => !opt.deprecated || opt.value === current);
  }, [byField.lifecycleStatus, draft.lifecycle]);

  const duplicateEnv =
    mode === 'create' &&
    instances.some((inst) => inst.environment === draft.environment);

  const handleCopyProd = React.useCallback(() => {
    const prod = instances.find((inst) => inst.environment === 'prod');
    if (!prod) return;
    setDraft((prev) => ({
      ...prev,
      base_url: prod.base_url || '',
      sso_enabled: prod.sso_enabled,
      mfa_supported: prod.mfa_supported,
    }));
  }, [instances, setDraft]);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save instance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'Add Environment' : 'Edit Environment'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField
            select
            label="Environment"
            value={draft.environment}
            onChange={(e) => setDraft((prev) => ({ ...prev, environment: e.target.value }))}
            disabled={mode === 'edit'}
            error={duplicateEnv}
            helperText={duplicateEnv ? 'Environment already exists' : undefined}
            required
          >
            {ENV_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Lifecycle"
            value={draft.lifecycle}
            onChange={(e) => setDraft((prev) => ({ ...prev, lifecycle: e.target.value as string }))}
            required
          >
            {lifecycleOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Base URL" value={draft.base_url} onChange={(e) => setDraft((prev) => ({ ...prev, base_url: e.target.value }))} />
          <FormControlLabel
            control={<Checkbox checked={draft.sso_enabled} onChange={(e) => setDraft((prev) => ({ ...prev, sso_enabled: e.target.checked }))} />}
            label="SSO enabled"
          />
          <FormControlLabel
            control={<Checkbox checked={draft.mfa_supported} onChange={(e) => setDraft((prev) => ({ ...prev, mfa_supported: e.target.checked }))} />}
            label="MFA supported"
          />
          <TextField
            label="Notes"
            multiline
            minRows={3}
            value={draft.notes}
            onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <Button
            startIcon={<CloudUploadIcon />}
            variant="text"
            onClick={handleCopyProd}
            disabled={!instances.some((inst) => inst.environment === 'prod')}
          >
            Copy from Prod
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={saving || duplicateEnv}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function InstancesEditor({ applicationId, instances, onRefresh, readOnly }: InstancesEditorProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>('create');
  const [draft, setDraft] = React.useState<InstanceDraft>(() => createDraft(undefined));
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { labelFor } = useItOpsEnumOptions();

  const openCreate = () => {
    setDraft(createDraft(undefined));
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEdit = (instance: AppInstanceRecord) => {
    setDraft(createDraft(instance));
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveInstance = async (payload: InstanceDraft) => {
    setError(null);
    try {
      if (payload.id) {
        await api.patch(`/app-instances/${payload.id}`, {
          lifecycle: payload.lifecycle,
          base_url: payload.base_url || null,
          sso_enabled: payload.sso_enabled,
          mfa_supported: payload.mfa_supported,
          notes: payload.notes.trim() ? payload.notes.trim() : null,
        });
      } else {
        await api.post(`/applications/${applicationId}/instances`, {
          environment: payload.environment,
          lifecycle: payload.lifecycle,
          base_url: payload.base_url || null,
          sso_enabled: payload.sso_enabled,
          mfa_supported: payload.mfa_supported,
          notes: payload.notes.trim() ? payload.notes.trim() : null,
        });
      }
      setMessage('Instance saved');
      await onRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save instance');
      throw e;
    }
  };

  const handleDelete = async (instance: AppInstanceRecord) => {
    if (!window.confirm(`Delete ${instance.environment.toUpperCase()} instance?`)) return;
    setError(null);
    try {
      await api.delete(`/app-instances/${instance.id}`);
      setMessage('Instance removed');
      await onRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete instance');
    }
  };

  const handleBulkApply = async (patch: Partial<InstanceDraft>) => {
    if (selected.size === 0) return;
    setError(null);
    try {
      const ids = Array.from(selected);
      await Promise.all(
        ids.map((id) =>
          api.patch(`/app-instances/${id}`, {
            sso_enabled: patch.sso_enabled,
            mfa_supported: patch.mfa_supported,
          }),
        ),
      );
      setMessage('Bulk update applied');
      setSelected(new Set());
      await onRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Bulk update failed');
    }
  };

  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [bulkDraft, setBulkDraft] = React.useState<{ sso_enabled: boolean; mfa_supported: boolean }>({
    sso_enabled: true,
    mfa_supported: true,
  });

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="h6">Instances</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage deployment environments and access details.
          </Typography>
        </Stack>
        {!readOnly && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" disabled={selected.size === 0} onClick={() => setBulkDialogOpen(true)}>
              Bulk apply ({selected.size})
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add environment
            </Button>
          </Stack>
        )}
      </Stack>
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Table size="small">
      <TableHead>
        <TableRow>
          {!readOnly && <TableCell padding="checkbox" />}
          <TableCell>Environment</TableCell>
          <TableCell>Base URL</TableCell>
          <TableCell>Lifecycle</TableCell>
          <TableCell>Notes</TableCell>
          <TableCell>SSO</TableCell>
          <TableCell>MFA</TableCell>
          {!readOnly && <TableCell />}
        </TableRow>
      </TableHead>
      <TableBody>
        {instances.length === 0 && (
          <TableRow>
            <TableCell colSpan={readOnly ? 6 : 8}>
              <Typography variant="body2" color="text.secondary">
                No environments yet. Add the first instance to get started.
              </Typography>
            </TableCell>
          </TableRow>
          )}
          {instances.map((instance) => (
            <TableRow key={instance.id}>
              {!readOnly && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.has(instance.id)}
                    onChange={() => toggleSelected(instance.id)}
                    inputProps={{ 'aria-label': `Select ${instance.environment}` }}
                  />
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 500 }}>{instance.environment.toUpperCase()}</TableCell>
              <TableCell>
                {instance.base_url ? (
                  <a href={instance.base_url} target="_blank" rel="noopener noreferrer">
                    {instance.base_url}
                  </a>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>{labelFor('lifecycleStatus', instance.lifecycle) || (instance.lifecycle || '—')}</TableCell>
              <TableCell sx={{ whiteSpace: 'pre-line' }}>{instance.notes?.trim() ? instance.notes : '—'}</TableCell>
              <TableCell>{instance.sso_enabled ? 'Yes' : 'No'}</TableCell>
              <TableCell>{instance.mfa_supported ? 'Yes' : 'No'}</TableCell>
              {!readOnly && (
                <TableCell align="right">
                  <Tooltip title="Edit environment">
                    <span>
                      <IconButton size="small" onClick={() => openEdit(instance)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete environment">
                    <span>
                      <IconButton size="small" onClick={() => void handleDelete(instance)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <InstanceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveInstance}
        draft={draft}
        setDraft={setDraft}
        mode={dialogMode}
        instances={instances}
      />

      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)}>
        <DialogTitle>Apply settings to selected environments</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={bulkDraft.sso_enabled} onChange={(e) => setBulkDraft((prev) => ({ ...prev, sso_enabled: e.target.checked }))} />}
              label="SSO enabled"
            />
            <FormControlLabel
              control={<Checkbox checked={bulkDraft.mfa_supported} onChange={(e) => setBulkDraft((prev) => ({ ...prev, mfa_supported: e.target.checked }))} />}
              label="MFA supported"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setBulkDialogOpen(false);
              void handleBulkApply(bulkDraft);
            }}
            disabled={selected.size === 0}
          >
            Apply to {selected.size}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
