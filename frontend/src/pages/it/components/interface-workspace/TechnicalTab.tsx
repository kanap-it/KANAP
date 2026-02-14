import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
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
import AddIcon from '@mui/icons-material/Add';
import api from '../../../../api';
import useItOpsEnumOptions from '../../../../hooks/useItOpsEnumOptions';
import type {
  InterfaceDetail,
  InterfaceLink,
  InterfaceAttachment,
  InterfaceLeg,
  InterfaceTabProps,
} from './types';

export default function TechnicalTab({ data, update, markDirty }: InterfaceTabProps) {
  const { byField, labelFor } = useItOpsEnumOptions();
  const links = (data?.links || []) as InterfaceLink[];
  const attachments = (data?.attachments || []) as InterfaceAttachment[];
  const technicalLinks = links.filter((l) => (l.kind || 'technical') === 'technical');
  const technicalAttachments = attachments.filter((a) => (a.kind || 'technical') === 'technical');
  const legs = (data?.legs || []) as InterfaceLeg[];

  const [newLinkUrl, setNewLinkUrl] = React.useState('');
  const [newLinkDesc, setNewLinkDesc] = React.useState('');

  const handleCreateTechnicalLink = async (interfaceId: string) => {
    const url = newLinkUrl.trim();
    if (!url) return;
    try {
      const res = await api.post<InterfaceLink>(`/interfaces/${interfaceId}/links`, {
        kind: 'technical',
        url,
        description: newLinkDesc.trim() || null,
      });
      const created = res.data;
      const next = [...links, created];
      update({ links: next });
      markDirty();
      setNewLinkUrl('');
      setNewLinkDesc('');
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const handleDeleteTechnicalLink = async (interfaceId: string, linkId: string) => {
    if (!window.confirm('Remove this technical documentation link?')) return;
    try {
      await api.delete(`/interfaces/${interfaceId}/links/${linkId}`);
      const next = links.filter((l) => l.id !== linkId);
      update({ links: next });
      markDirty();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const handleUploadAttachment = async (interfaceId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const form = new FormData();
    form.append('file', file);
    form.append('kind', 'technical');
    try {
      const res = await api.post<InterfaceAttachment>(`/interfaces/${interfaceId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = res.data;
      const next = [...attachments, created];
      update({ attachments: next });
      markDirty();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await api.patch(`/interfaces/attachments/${attachmentId}/delete`);
      const next = attachments.filter((a) => a.id !== attachmentId);
      update({ attachments: next });
      markDirty();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const triggerTypeOptions = React.useMemo(() => {
    const list = byField.interfaceTriggerType || [];
    const base = list.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }));
    const usedCodes = new Set<string>((legs || []).map((l) => l.trigger_type).filter(Boolean) as string[]);
    const existing = new Set(base.map((o) => o.value));
    const extras: { label: string; value: string }[] = [];
    for (const code of usedCodes) {
      if (!existing.has(code)) {
        const ref = list.find((o) => o.code === code);
        extras.push({ label: ref?.label || code, value: code });
      }
    }
    return [...base, ...extras];
  }, [byField.interfaceTriggerType, JSON.stringify(legs)]);

  const patternOptions = React.useMemo(() => {
    const list = byField.interfacePattern || [];
    const base = list.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }));
    const usedCodes = new Set<string>((legs || []).map((l) => l.integration_pattern).filter(Boolean) as string[]);
    const existing = new Set(base.map((o) => o.value));
    const extras: { label: string; value: string }[] = [];
    for (const code of usedCodes) {
      if (!existing.has(code)) {
        const ref = list.find((o) => o.code === code);
        extras.push({ label: ref?.label || code, value: code });
      }
    }
    return [...base, ...extras];
  }, [byField.interfacePattern, JSON.stringify(legs)]);

  const formatOptions = React.useMemo(() => {
    const list = byField.interfaceFormat || [];
    const base = list.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }));
    const usedCodes = new Set<string>((legs || []).map((l) => l.data_format).filter(Boolean) as string[]);
    const existing = new Set(base.map((o) => o.value));
    const extras: { label: string; value: string }[] = [];
    for (const code of usedCodes) {
      if (!existing.has(code)) {
        const ref = list.find((o) => o.code === code);
        extras.push({ label: ref?.label || code, value: code });
      }
    }
    return [...base, ...extras];
  }, [byField.interfaceFormat, JSON.stringify(legs)]);

  const getRoleLabel = (role: string) => {
    const r = String(role || '').toLowerCase();
    if (r === 'source') return data?.source_application_name || 'Source';
    if (r === 'target') return data?.target_application_name || 'Target';
    if (r === 'middleware') return 'Middleware';
    return role || '';
  };

  const handleLegChange = (legId: string, patch: Partial<InterfaceLeg>) => {
    if (!legs || legs.length === 0) return;
    const next = legs.map((leg) => (leg.id === legId ? { ...leg, ...patch } : leg));
    markDirty();
    update({ legs: next });
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">Technical overview (legs template)</Typography>
        <Typography variant="body2" color="text.secondary">
          Define the template legs used by all environments. Trigger, pattern, format, and job name are shared across environments.
        </Typography>
        {legs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No legs defined for this interface yet. Select source/target applications and an integration route type on the Overview tab.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Leg</TableCell>
                <TableCell>From → To</TableCell>
                <TableCell>Trigger type</TableCell>
                <TableCell>Pattern</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Job name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {legs.map((leg) => (
                <TableRow key={leg.id}>
                  <TableCell sx={{ fontWeight: 500 }}>{String(leg.leg_type || '').toUpperCase()}</TableCell>
                  <TableCell>
                    {getRoleLabel(leg.from_role)} → {getRoleLabel(leg.to_role)}
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      label="Trigger"
                      value={leg.trigger_type || ''}
                      onChange={(e) => handleLegChange(leg.id, { trigger_type: e.target.value })}
                      fullWidth
                    >
                      {triggerTypeOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      label="Pattern"
                      value={leg.integration_pattern || ''}
                      onChange={(e) => handleLegChange(leg.id, { integration_pattern: e.target.value })}
                      fullWidth
                    >
                      {patternOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      label="Format"
                      value={leg.data_format || ''}
                      onChange={(e) => handleLegChange(leg.id, { data_format: e.target.value })}
                      fullWidth
                    >
                      {formatOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      label="Job name"
                      value={leg.job_name || ''}
                      onChange={(e) => handleLegChange(leg.id, { job_name: e.target.value })}
                      fullWidth
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>

      <Divider />
      <TextField
        label="Core transformations (summary)"
        value={data?.core_transformations_summary || ''}
        onChange={(e) => {
          markDirty();
          update({ core_transformations_summary: e.target.value });
        }}
        multiline
        minRows={3}
      />
      <TextField
        label="Error handling (summary)"
        value={data?.error_handling_summary || ''}
        onChange={(e) => {
          markDirty();
          update({ error_handling_summary: e.target.value });
        }}
        multiline
        minRows={3}
      />

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Technical documentation links</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <TextField
            label="Description"
            value={newLinkDesc}
            onChange={(e) => setNewLinkDesc(e.target.value)}
            fullWidth
          />
          <TextField
            label="URL"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => data?.id && void handleCreateTechnicalLink(data.id)}
            disabled={!data?.id || !newLinkUrl.trim()}
          >
            Add
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {technicalLinks.map((link) => (
            <Chip
              key={link.id}
              label={link.description || link.url}
              onDelete={() => data?.id && void handleDeleteTechnicalLink(data.id, link.id)}
              component="a"
              href={link.url}
              target="_blank"
              clickable
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
          {technicalLinks.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No technical documentation links yet.
            </Typography>
          )}
        </Stack>
      </Stack>

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Technical attachments</Typography>
        <Button
          variant="outlined"
          component="label"
          disabled={!data?.id}
        >
          Upload file
          <input
            type="file"
            hidden
            onChange={(e) => data?.id && void handleUploadAttachment(data.id, e.target.files)}
          />
        </Button>
        <Stack spacing={0.5}>
          {technicalAttachments.map((att) => (
            <Stack key={att.id} direction="row" spacing={1} alignItems="center">
              <Button
                component="a"
                href={`/api/interfaces/attachments/${att.id}`}
                target="_blank"
                size="small"
              >
                {att.original_filename}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {(att.size || 0) > 0 ? `${Math.round(att.size / 1024)} kB` : ''}
              </Typography>
              <IconButton aria-label="Delete" size="small" onClick={() => void handleDeleteAttachment(att.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {technicalAttachments.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No technical attachments yet.
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
