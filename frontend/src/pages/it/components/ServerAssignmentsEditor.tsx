import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import api from '../../../api';
import ServerSelect from '../../../components/fields/ServerSelect';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';
import DateEUField from '../../../components/fields/DateEUField';

import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
type Assignment = {
  id: string;
  app_instance_id: string;
  server_id: string;
  role: string;
  since_date: string | null;
  notes: string | null;
  hosting?: { code: string | null; label: string | null; source?: string | null };
  server: {
    id: string;
    name: string;
    kind: string;
    provider: string;
    environment: string;
    region: string | null;
    zone: string | null;
    status: string;
  };
};

type AppInstanceRecord = {
  id: string;
  environment: string;
};

type ServerAssignmentsEditorProps = {
  applicationId: string;
  instances: AppInstanceRecord[];
  onRefreshInstances: () => Promise<void>;
  readOnly?: boolean;
};

type AssignmentDialogState = {
  instanceId: string;
  server_id: string | null;
  role: string;
  since_date: string;
  notes: string;
  assignmentId?: string | null;
};

function AssignmentDialog({
  open,
  onClose,
  onSave,
  state,
  setState,
  envLabel,
  hostingText,
  roleOptions,
  isEditing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  state: AssignmentDialogState | null;
  setState: React.Dispatch<React.SetStateAction<AssignmentDialogState | null>>;
  envLabel: string;
  hostingText?: string;
  roleOptions: { value: string; label: string }[];
  isEditing: boolean;
}) {
  const { t } = useTranslation(['it', 'common']);
  if (!state) return null;
  const hasRoleOptions = roleOptions.length > 0;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? `Edit server assignment (${envLabel})` : `Add server to ${envLabel}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Environment" value={envLabel} InputProps={{ readOnly: true }} />
          <ServerSelect
            value={state.server_id}
            onChange={(v) => setState((prev) => prev ? { ...prev, server_id: v } : prev)}
            allowClusters={false}
            required
          />
          {hasRoleOptions ? (
            <TextField
              select
              label="Role"
              required
              value={state.role}
              onChange={(e) => setState((prev) => prev ? { ...prev, role: e.target.value } : prev)}
            >
              {roleOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Role"
              value=""
              disabled
              helperText="No server roles configured. Update IT Ops settings to add roles."
            />
          )}
          <TextField
            label="Hosting"
            value={hostingText || '—'}
            InputProps={{ readOnly: true }}
            helperText="Derived from server/location"
          />
          <DateEUField
            label="Since date"
            valueYmd={state.since_date}
            onChangeYmd={(value) => setState((prev) => (prev ? { ...prev, since_date: value } : prev))}
          />
          <TextField
            label="Notes"
            multiline
            minRows={3}
            value={state.notes}
            onChange={(e) => setState((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:buttons.cancel')}</Button>
        <Button variant="contained" onClick={() => void onSave()} disabled={!state.server_id || !hasRoleOptions || !state.role}>
          {isEditing ? 'Save' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ServerAssignmentsEditor({ applicationId, instances, onRefreshInstances, readOnly }: ServerAssignmentsEditorProps) {
  const { t } = useTranslation(['it', 'common']);
  const [assignments, setAssignments] = React.useState<Record<string, Assignment[]>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [dialogState, setDialogState] = React.useState<AssignmentDialogState | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<Assignment | null>(null);
  const [dialogHostingLabel, setDialogHostingLabel] = React.useState<string>('—');
  const { byField, settings, labelFor } = useItOpsEnumOptions();
  const serverRoleOptions = React.useMemo(() => {
    const list = (byField.serverRole || []).map((opt) => ({
      value: opt.code,
      label: opt.deprecated ? `${opt.label} (deprecated)` : opt.label,
    }));
    return list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [byField.serverRole]);
  const rolesAvailable = serverRoleOptions.length > 0;
  const showRoleWarning = !!settings && !rolesAvailable;
  const roleLabelMap = React.useMemo(() => new Map(serverRoleOptions.map((opt) => [opt.value, opt.label])), [serverRoleOptions]);
  const formatDate = React.useCallback((iso?: string | null) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const hostingLabel = React.useCallback(
    (row: Assignment) => {
      if (row.hosting?.label) return row.hosting.label;
      if (row.hosting?.code) {
        const label = labelFor('hostingType', row.hosting.code);
        return label || row.hosting.code;
      }
      return '—';
    },
    [labelFor],
  );

  const computeHostingLabel = React.useCallback(
    (locationHostingType?: string | null) => {
      if (locationHostingType) {
        return labelFor('hostingType', locationHostingType) || locationHostingType;
      }
      const hostingTypes = settings?.hostingTypes || [];
      const fallback =
        hostingTypes.find((h) => h.code === 'public_cloud') ||
        hostingTypes.find((h) => h.category === 'cloud') ||
        hostingTypes[0];
      if (fallback) {
        return labelFor('hostingType', fallback.code) || fallback.code;
      }
      return '—';
    },
    [labelFor, settings?.hostingTypes],
  );

  const loadAssignments = React.useCallback(async (instanceId: string) => {
    try {
      const res = await api.get<{ items: Assignment[] }>(`/app-instances/${instanceId}/servers`);
      setAssignments((prev) => ({ ...prev, [instanceId]: res.data.items || [] }));
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.loadAssignmentsFailed')));
    }
  }, []);

  React.useEffect(() => {
    instances.forEach((instance) => {
      void loadAssignments(instance.id);
    });
  }, [instances, loadAssignments]);

  React.useEffect(() => {
    if (!dialogOpen) return;
    const serverId = dialogState?.server_id;
    if (!serverId) {
      setDialogHostingLabel(editingAssignment ? hostingLabel(editingAssignment) : '—');
      return;
    }
    let cancelled = false;
    const fetchHosting = async () => {
      try {
        const serverRes = await api.get<{ location_id?: string | null }>(`/assets/${serverId}`);
        const locationId = (serverRes.data as any).location_id || null;
        let hostingType: string | null = null;
        if (locationId) {
          try {
            const locationRes = await api.get<{ hosting_type?: string | null }>(`/locations/${locationId}`);
            hostingType = (locationRes.data as any).hosting_type || null;
          } catch {
            hostingType = null;
          }
        }
        const label = computeHostingLabel(hostingType);
        if (!cancelled) setDialogHostingLabel(label);
      } catch {
        if (!cancelled) setDialogHostingLabel(computeHostingLabel(null));
      }
    };
    void fetchHosting();
    return () => { cancelled = true; };
  }, [dialogOpen, dialogState?.server_id, editingAssignment, computeHostingLabel, hostingLabel]);

  const openDialog = (instanceId: string) => {
    setDialogState({
      instanceId,
      server_id: null,
      role: serverRoleOptions[0]?.value || '',
      since_date: '',
      notes: '',
      assignmentId: null,
    });
    setEditingAssignment(null);
    setDialogHostingLabel('—');
    setDialogOpen(true);
  };

  const toYmd = (value: string | null | undefined) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const openEditDialog = (instanceId: string, assignment: Assignment) => {
    setDialogState({
      instanceId,
      server_id: assignment.server_id,
      role: assignment.role,
      since_date: toYmd(assignment.since_date),
      notes: assignment.notes || '',
      assignmentId: assignment.id,
    });
    setEditingAssignment(assignment);
    setDialogHostingLabel(hostingLabel(assignment));
    setDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!dialogState) return;
    if (!dialogState.role) {
      setError('Role is required.');
      return;
    }
    setError(null);
    try {
      if (dialogState.assignmentId) {
        await api.patch(`/app-instances/${dialogState.instanceId}/servers/${dialogState.assignmentId}`, {
          server_id: dialogState.server_id,
          role: dialogState.role,
          since_date: dialogState.since_date || null,
          notes: dialogState.notes || null,
        });
        setMessage('Assignment updated');
      } else {
        await api.post(`/app-instances/${dialogState.instanceId}/servers`, {
          server_id: dialogState.server_id,
          role: dialogState.role,
          since_date: dialogState.since_date || null,
          notes: dialogState.notes || null,
        });
        setMessage('Server assigned');
      }
      setDialogOpen(false);
      setEditingAssignment(null);
      await loadAssignments(dialogState.instanceId);
      await onRefreshInstances();
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.assignServerFailed')));
    }
  };

  const handleRemove = async (instanceId: string, assignmentId: string) => {
    if (!window.confirm(t('confirmations.removeAssignment'))) return;
    setError(null);
    try {
      await api.delete(`/app-instances/${instanceId}/servers/${assignmentId}`);
      setMessage('Assignment removed');
      await loadAssignments(instanceId);
      await onRefreshInstances();
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.removeServerFailed')));
    }
  };

  return (
    <Box>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h6">Server assignments</Typography>
        <Typography variant="body2" color="text.secondary">
          Track which servers host each application instance.
        </Typography>
      </Stack>
      {showRoleWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No server roles configured. Update IT Landscape settings before creating new assignments.
        </Alert>
      )}
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Stack spacing={2}>
        {instances.map((instance) => {
          const envLabel = instance.environment.toUpperCase();
          const rows = assignments[instance.id] || [];
          return (
            <Box key={instance.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1} sx={{ mb: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">{envLabel}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {rows.length} assignment{rows.length === 1 ? '' : 's'}
                  </Typography>
                </Stack>
                {!readOnly && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => openDialog(instance.id)}
                    disabled={!rolesAvailable}
                  >
                    Add assignment
                  </Button>
                )}
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Server</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Hosting</TableCell>
                    <TableCell>Since</TableCell>
                    {!readOnly && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={readOnly ? 5 : 6}>
                        <Typography variant="body2" color="text.secondary">No servers assigned.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={500}>{row.server.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.server.environment?.toUpperCase()}</TableCell>
                      <TableCell>{roleLabelMap.get(row.role) || row.role}</TableCell>
                      <TableCell>{hostingLabel(row)}</TableCell>
                      <TableCell>{formatDate(row.since_date)}</TableCell>
                      {!readOnly && (
                        <TableCell align="right">
                          <Tooltip title="Edit assignment">
                            <span>
                              <IconButton size="small" onClick={() => openEditDialog(row.app_instance_id, row)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remove assignment">
                            <span>
                              <IconButton size="small" color="error" onClick={() => void handleRemove(row.app_instance_id, row.id)}>
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
            </Box>
          );
        })}
        {instances.length === 0 && (
          <Alert severity="info">Add an instance first to manage server assignments.</Alert>
        )}
      </Stack>
      <AssignmentDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingAssignment(null); setDialogHostingLabel('—'); }}
        onSave={handleAssign}
        state={dialogState}
        setState={setDialogState}
        envLabel={dialogState ? instances.find((inst) => inst.id === dialogState.instanceId)?.environment.toUpperCase() || '' : ''}
        hostingText={dialogHostingLabel}
        roleOptions={serverRoleOptions}
        isEditing={!!editingAssignment}
      />
    </Box>
  );
}
