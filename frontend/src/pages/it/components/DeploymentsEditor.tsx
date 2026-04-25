import React from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import api from '../../../api';
import { KanapDialog, PropertyRow } from '../../../components/design';
import ServerSelect from '../../../components/fields/ServerSelect';
import DateEUField from '../../../components/fields/DateEUField';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';
import { MONO_FONT_FAMILY } from '../../../config/ThemeContext';
import { dialogBorderedFieldSx, drawerFieldValueSx, drawerMenuItemSx, drawerSelectSx } from '../../../theme/formSx';
import { getDotColor, LIFECYCLE_COLORS } from '../../../utils/statusColors';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import { useTranslation } from 'react-i18next';

const ENV_OPTIONS = [
  { value: 'prod', label: 'PROD' },
  { value: 'pre_prod', label: 'PRE-PROD' },
  { value: 'qa', label: 'QA' },
  { value: 'test', label: 'TEST' },
  { value: 'dev', label: 'DEV' },
  { value: 'sandbox', label: 'SANDBOX' },
] as const;

export type DeploymentRecord = {
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

type Assignment = {
  id: string;
  app_instance_id: string;
  server_id: string;
  role: string;
  since_date: string | null;
  notes: string | null;
  hosting?: { code: string | null; label: string | null };
  server: {
    id: string;
    name: string;
    provider: string;
    environment: string;
  };
};

type DeploymentDraft = {
  id?: string;
  environment: string;
  lifecycle: string;
  base_url: string;
  sso_enabled: boolean;
  mfa_supported: boolean;
  notes: string;
};

type AssignmentDraft = {
  deploymentId: string;
  assignmentId?: string | null;
  server_id: string | null;
  role: string;
  since_date: string;
  notes: string;
};

type DeploymentsEditorProps = {
  applicationId: string;
  deployments: DeploymentRecord[];
  onRefresh: () => Promise<void>;
  readOnly?: boolean;
};

function envLabel(value: string) {
  return ENV_OPTIONS.find((item) => item.value === value)?.label || value.toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(String(value).includes('T') ? String(value) : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function createDeploymentDraft(deployment?: DeploymentRecord): DeploymentDraft {
  return {
    id: deployment?.id,
    environment: deployment?.environment || 'prod',
    lifecycle: deployment?.lifecycle || 'active',
    base_url: deployment?.base_url || '',
    sso_enabled: !!deployment?.sso_enabled,
    mfa_supported: !!deployment?.mfa_supported,
    notes: deployment?.notes || '',
  };
}

export default function DeploymentsEditor({
  applicationId,
  deployments,
  onRefresh,
  readOnly = false,
}: DeploymentsEditorProps) {
  const theme = useTheme();
  const { t } = useTranslation(['it', 'common', 'errors']);
  const { byField, labelFor } = useItOpsEnumOptions();
  const [assignments, setAssignments] = React.useState<Record<string, Assignment[]>>({});
  const [deploymentDialogOpen, setDeploymentDialogOpen] = React.useState(false);
  const [deploymentDraft, setDeploymentDraft] = React.useState<DeploymentDraft>(() => createDeploymentDraft());
  const [assignmentDialogOpen, setAssignmentDialogOpen] = React.useState(false);
  const [assignmentDraft, setAssignmentDraft] = React.useState<AssignmentDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [lifecycleAnchor, setLifecycleAnchor] = React.useState<{ id: string; element: HTMLElement } | null>(null);

  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    return list.map((item) => ({
      value: item.code,
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
    }));
  }, [byField.lifecycleStatus]);

  const serverRoleOptions = React.useMemo(() => {
    const list = byField.serverRole || [];
    return list.map((item) => ({
      value: item.code,
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
    }));
  }, [byField.serverRole]);

  const usedEnvironments = React.useMemo(() => new Set(deployments.map((deployment) => deployment.environment)), [deployments]);
  const duplicateEnvironment = !deploymentDraft.id && usedEnvironments.has(deploymentDraft.environment);

  const loadAssignments = React.useCallback(async (deploymentId: string) => {
    try {
      const res = await api.get<{ items: Assignment[] }>(`/app-deployments/${deploymentId}/servers`);
      setAssignments((prev) => ({ ...prev, [deploymentId]: res.data.items || [] }));
    } catch (err: any) {
      setError(getApiErrorMessage(err, t, 'Failed to load server assignments'));
    }
  }, []);

  React.useEffect(() => {
    deployments.forEach((deployment) => {
      void loadAssignments(deployment.id);
    });
  }, [deployments, loadAssignments]);

  const patchDeployment = React.useCallback(async (deploymentId: string, patch: Partial<DeploymentDraft>) => {
    setError(null);
    try {
      await api.patch(`/app-deployments/${deploymentId}`, patch);
      await onRefresh();
    } catch (err: any) {
      setError(getApiErrorMessage(err, t, 'Failed to update deployment'));
    }
  }, [onRefresh]);

  const openCreateDeployment = React.useCallback(() => {
    const firstAvailable = ENV_OPTIONS.find((env) => !usedEnvironments.has(env.value));
    setDeploymentDraft(createDeploymentDraft({
      id: '',
      application_id: applicationId,
      environment: firstAvailable?.value || ENV_OPTIONS[0].value,
      lifecycle: 'active',
      base_url: null,
      sso_enabled: false,
      mfa_supported: false,
      status: 'enabled',
      notes: null,
    }));
    setDeploymentDialogOpen(true);
  }, [applicationId, usedEnvironments]);

  const openEditDeployment = React.useCallback((deployment: DeploymentRecord) => {
    setDeploymentDraft(createDeploymentDraft(deployment));
    setDeploymentDialogOpen(true);
  }, []);

  const saveDeployment = React.useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        environment: deploymentDraft.environment,
        lifecycle: deploymentDraft.lifecycle,
        base_url: deploymentDraft.base_url || null,
        sso_enabled: deploymentDraft.sso_enabled,
        mfa_supported: deploymentDraft.mfa_supported,
        notes: deploymentDraft.notes.trim() ? deploymentDraft.notes.trim() : null,
      };
      if (deploymentDraft.id) {
        await api.patch(`/app-deployments/${deploymentDraft.id}`, payload);
        setMessage('Deployment updated');
      } else {
        await api.post(`/applications/${applicationId}/deployments`, payload);
        setMessage('Deployment created');
      }
      setDeploymentDialogOpen(false);
      await onRefresh();
    } catch (err: any) {
      setError(getApiErrorMessage(err, t, 'Failed to save deployment'));
    } finally {
      setSaving(false);
    }
  }, [applicationId, deploymentDraft, onRefresh]);

  const deleteDeployment = React.useCallback(async (deployment: DeploymentRecord) => {
    if (!window.confirm(`Delete ${envLabel(deployment.environment)} deployment?`)) return;
    setError(null);
    try {
      await api.delete(`/app-deployments/${deployment.id}`);
      setMessage('Deployment removed');
      await onRefresh();
    } catch (err: any) {
      setError(getApiErrorMessage(err, t, 'Failed to remove deployment'));
    }
  }, [onRefresh]);

  const openAssignmentDialog = React.useCallback((deploymentId: string, assignment?: Assignment) => {
    setAssignmentDraft({
      deploymentId,
      assignmentId: assignment?.id || null,
      server_id: assignment?.server_id || null,
      role: assignment?.role || serverRoleOptions[0]?.value || '',
      since_date: assignment?.since_date ? String(assignment.since_date).slice(0, 10) : '',
      notes: assignment?.notes || '',
    });
    setAssignmentDialogOpen(true);
  }, [serverRoleOptions]);

  const saveAssignment = React.useCallback(async () => {
    if (!assignmentDraft) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        server_id: assignmentDraft.server_id,
        role: assignmentDraft.role,
        since_date: assignmentDraft.since_date || null,
        notes: assignmentDraft.notes.trim() ? assignmentDraft.notes.trim() : null,
      };
      if (assignmentDraft.assignmentId) {
        await api.patch(`/app-deployments/${assignmentDraft.deploymentId}/servers/${assignmentDraft.assignmentId}`, payload);
        setMessage('Server assignment updated');
      } else {
        await api.post(`/app-deployments/${assignmentDraft.deploymentId}/servers`, payload);
        setMessage('Server assigned');
      }
      setAssignmentDialogOpen(false);
      await loadAssignments(assignmentDraft.deploymentId);
      await onRefresh();
    } catch (err: any) {
      setError(getApiErrorMessage(err, t, 'Failed to save server assignment'));
    } finally {
      setSaving(false);
    }
  }, [assignmentDraft, loadAssignments, onRefresh]);

  const deleteAssignment = React.useCallback(async (deploymentId: string, assignmentId: string) => {
    if (!window.confirm('Remove this server assignment?')) return;
    setError(null);
    try {
      await api.delete(`/app-deployments/${deploymentId}/servers/${assignmentId}`);
      setMessage('Server assignment removed');
      await loadAssignments(deploymentId);
      await onRefresh();
    } catch (err: any) {
      setError(getApiErrorMessage(err, t, 'Failed to remove server assignment'));
    }
  }, [loadAssignments, onRefresh]);

  return (
    <Stack spacing={2.75}>
      {message && <Alert severity="success" onClose={() => setMessage(null)}>{message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {!readOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button variant="action" startIcon={<AddIcon sx={{ fontSize: '14px !important' }} />} onClick={openCreateDeployment}>
            Add deployment
          </Button>
        </Box>
      )}

      {deployments.map((deployment) => {
        const rows = assignments[deployment.id] || [];
        const lifecycleColor = getDotColor(LIFECYCLE_COLORS[deployment.lifecycle] || 'default', theme.palette.mode);
        return (
          <Box key={deployment.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '18px', mb: 1.25, minWidth: 0 }}>
              <Box sx={{ fontFamily: MONO_FONT_FAMILY, fontSize: 14, fontWeight: 500, minWidth: 76 }}>
                {envLabel(deployment.environment)}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={(event) => !readOnly && setLifecycleAnchor({ id: deployment.id, element: event.currentTarget })}
                sx={(muiTheme) => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  border: 0,
                  p: 0,
                  bgcolor: 'transparent',
                  font: 'inherit',
                  fontSize: 12,
                  color: muiTheme.palette.kanap.text.primary,
                  cursor: readOnly ? 'default' : 'pointer',
                })}
              >
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: lifecycleColor }} />
                {labelFor('lifecycleStatus', deployment.lifecycle) || deployment.lifecycle}
              </Box>
              <Box sx={{ display: 'inline-flex', gap: '6px', fontSize: 12, minWidth: 0 }}>
                <Box component="span" sx={(muiTheme) => ({ color: muiTheme.palette.kanap.text.tertiary })}>Base URL</Box>
                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {deployment.base_url || '—'}
                </Box>
              </Box>
              <Box sx={{ fontSize: 12 }}>
                <Box component="span" sx={(muiTheme) => ({ color: muiTheme.palette.kanap.text.tertiary, mr: '6px' })}>SSO</Box>
                {deployment.sso_enabled ? 'Yes' : 'No'}
              </Box>
              <Box sx={{ fontSize: 12 }}>
                <Box component="span" sx={(muiTheme) => ({ color: muiTheme.palette.kanap.text.tertiary, mr: '6px' })}>MFA</Box>
                {deployment.mfa_supported ? 'Yes' : 'No'}
              </Box>
              <Box sx={{ flex: 1 }} />
              {!readOnly && (
                <>
                  <Button variant="action" size="small" onClick={() => openAssignmentDialog(deployment.id)} disabled={serverRoleOptions.length === 0}>
                    Add server
                  </Button>
                  <IconButton aria-label={`Edit ${envLabel(deployment.environment)} deployment`} size="small" onClick={() => openEditDeployment(deployment)}>
                    <EditOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton aria-label={`Delete ${envLabel(deployment.environment)} deployment`} size="small" onClick={() => void deleteDeployment(deployment)}>
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </>
              )}
            </Box>

            <Table size="small" sx={(muiTheme) => ({
              '& th': { fontSize: 11, fontWeight: 500, color: muiTheme.palette.kanap.text.tertiary, borderBottom: `1px solid ${muiTheme.palette.kanap.border.default}` },
              '& td': { fontSize: 13, color: muiTheme.palette.kanap.text.primary, borderBottom: `1px solid ${muiTheme.palette.kanap.border.soft}` },
              '& tbody tr:hover': { bgcolor: muiTheme.palette.kanap.bg.hover },
              '& .hover-actions': { opacity: 0, transition: 'opacity 120ms' },
              '& tbody tr:hover .hover-actions': { opacity: 1 },
            })}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 170 }}>Server</TableCell>
                  <TableCell sx={{ width: 200 }}>Role</TableCell>
                  <TableCell sx={{ width: 120 }}>Hosting</TableCell>
                  <TableCell>Since</TableCell>
                  {!readOnly && <TableCell align="right" sx={{ width: 72 }} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 4 : 5} sx={(muiTheme) => ({ color: `${muiTheme.palette.kanap.text.tertiary} !important` })}>
                      No servers assigned.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={(muiTheme) => ({ fontFamily: MONO_FONT_FAMILY, fontSize: '12px !important', color: `${muiTheme.palette.kanap.text.secondary} !important` })}>
                      {row.server?.name || '—'}
                    </TableCell>
                    <TableCell>{labelFor('serverRole', row.role) || row.role || '—'}</TableCell>
                    <TableCell>{row.hosting?.label || (row.hosting?.code ? labelFor('hostingType', row.hosting.code) : '—')}</TableCell>
                    <TableCell>{formatDate(row.since_date)}</TableCell>
                    {!readOnly && (
                      <TableCell align="right">
                        <Box className="hover-actions" sx={{ display: 'inline-flex', gap: '2px' }}>
                          <IconButton aria-label={`Edit ${row.server?.name || 'server'} assignment`} size="small" onClick={() => openAssignmentDialog(deployment.id, row)}>
                            <EditOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton aria-label={`Remove ${row.server?.name || 'server'} assignment`} size="small" onClick={() => void deleteAssignment(deployment.id, row.id)}>
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        );
      })}

      {deployments.length === 0 && (
        <Typography sx={(muiTheme) => ({ fontSize: 13, color: muiTheme.palette.kanap.text.tertiary })}>
          No deployments yet.
        </Typography>
      )}

      <Menu anchorEl={lifecycleAnchor?.element || null} open={!!lifecycleAnchor} onClose={() => setLifecycleAnchor(null)}>
        {lifecycleOptions.map((option) => (
          <MenuItem
            key={option.value}
            sx={drawerMenuItemSx}
            onClick={() => {
              if (lifecycleAnchor) void patchDeployment(lifecycleAnchor.id, { lifecycle: option.value });
              setLifecycleAnchor(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>

      <KanapDialog
        open={deploymentDialogOpen}
        title={deploymentDraft.id ? 'Edit deployment' : 'New deployment'}
        onClose={() => setDeploymentDialogOpen(false)}
        onSave={saveDeployment}
        saveDisabled={duplicateEnvironment || !deploymentDraft.environment || !deploymentDraft.lifecycle}
        saveLoading={saving}
      >
        <Stack spacing={1.25}>
          {error && <Alert severity="error">{error}</Alert>}
          <PropertyRow label="Environment" required>
            <Select
              value={deploymentDraft.environment}
              onChange={(event) => setDeploymentDraft((prev) => ({ ...prev, environment: event.target.value }))}
              variant="standard"
              disableUnderline
              disabled={!!deploymentDraft.id}
              sx={drawerSelectSx}
            >
              {ENV_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={!deploymentDraft.id && usedEnvironments.has(option.value)} sx={drawerMenuItemSx}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow label="Lifecycle" required>
            <Select
              value={deploymentDraft.lifecycle}
              onChange={(event) => setDeploymentDraft((prev) => ({ ...prev, lifecycle: event.target.value }))}
              variant="standard"
              disableUnderline
              sx={drawerSelectSx}
            >
              {lifecycleOptions.map((option) => (
                <MenuItem key={option.value} value={option.value} sx={drawerMenuItemSx}>{option.label}</MenuItem>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow label="Base URL">
            <TextField
              value={deploymentDraft.base_url}
              onChange={(event) => setDeploymentDraft((prev) => ({ ...prev, base_url: event.target.value }))}
              variant="standard"
              fullWidth
              InputProps={{ disableUnderline: true }}
              sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
            />
          </PropertyRow>
          <PropertyRow
            label="SSO enabled"
            sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
            valueSx={{ flex: 0, minHeight: 'auto', display: 'flex', alignItems: 'center' }}
          >
            <input type="checkbox" checked={deploymentDraft.sso_enabled} onChange={(event) => setDeploymentDraft((prev) => ({ ...prev, sso_enabled: event.target.checked }))} style={{ accentColor: 'var(--kanap-teal)' }} />
          </PropertyRow>
          <PropertyRow
            label="MFA supported"
            sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
            valueSx={{ flex: 0, minHeight: 'auto', display: 'flex', alignItems: 'center' }}
          >
            <input type="checkbox" checked={deploymentDraft.mfa_supported} onChange={(event) => setDeploymentDraft((prev) => ({ ...prev, mfa_supported: event.target.checked }))} style={{ accentColor: 'var(--kanap-teal)' }} />
          </PropertyRow>
          <PropertyRow label="Notes">
            <TextField
              value={deploymentDraft.notes}
              onChange={(event) => setDeploymentDraft((prev) => ({ ...prev, notes: event.target.value }))}
              variant="standard"
              fullWidth
              multiline
              minRows={3}
              InputProps={{ disableUnderline: true }}
              sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
            />
          </PropertyRow>
        </Stack>
      </KanapDialog>

      <KanapDialog
        open={assignmentDialogOpen}
        title={assignmentDraft?.assignmentId ? 'Edit server assignment' : 'New server assignment'}
        onClose={() => setAssignmentDialogOpen(false)}
        onSave={saveAssignment}
        saveDisabled={!assignmentDraft?.server_id || !assignmentDraft?.role}
        saveLoading={saving}
      >
        {assignmentDraft && (
          <Stack spacing={1.25}>
            <PropertyRow label="Server" required>
              <ServerSelect
                value={assignmentDraft.server_id}
                onChange={(value) => setAssignmentDraft((prev) => (prev ? { ...prev, server_id: value } : prev))}
                allowClusters={false}
                hideLabel
                textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            <PropertyRow label="Role" required>
              <Select
                value={assignmentDraft.role}
                onChange={(event) => setAssignmentDraft((prev) => (prev ? { ...prev, role: event.target.value } : prev))}
                variant="standard"
                disableUnderline
                sx={drawerSelectSx}
              >
                {serverRoleOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={drawerMenuItemSx}>{option.label}</MenuItem>
                ))}
              </Select>
            </PropertyRow>
            <PropertyRow label="Since">
              <DateEUField
                label=""
                valueYmd={assignmentDraft.since_date}
                onChangeYmd={(value) => setAssignmentDraft((prev) => (prev ? { ...prev, since_date: value } : prev))}
                size="small"
                hideLabel
                textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            <PropertyRow label="Notes">
              <TextField
                value={assignmentDraft.notes}
                onChange={(event) => setAssignmentDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                variant="standard"
                fullWidth
                multiline
                minRows={3}
                InputProps={{ disableUnderline: true }}
                sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
          </Stack>
        )}
      </KanapDialog>
    </Stack>
  );
}
