import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../api';
import type {
  InterfaceDetail,
  InterfaceKeyIdentifier,
  InterfaceDependency,
  InterfaceLink,
  InterfaceAttachment,
  InterfaceOption,
  InterfaceTabProps,
} from './types';
import { useTranslation } from 'react-i18next';

export default function FunctionalTab({ data, update, markDirty }: InterfaceTabProps) {
  const { t } = useTranslation(['it', 'common']);
  const keyIdentifiers = (data?.key_identifiers || []) as InterfaceKeyIdentifier[];
  const dependencies = (data?.dependencies || []) as InterfaceDependency[];
  const links = (data?.links || []) as InterfaceLink[];
  const attachments = (data?.attachments || []) as InterfaceAttachment[];
  const functionalLinks = links.filter((l) => (l.kind || 'functional') === 'functional');
  const functionalAttachments = attachments.filter((a) => (a.kind || 'functional') === 'functional');

  const [localKeyIds, setLocalKeyIds] = React.useState<InterfaceKeyIdentifier[]>(keyIdentifiers);
  const [localDepsUp, setLocalDepsUp] = React.useState<string[]>([]);
  const [localDepsDown, setLocalDepsDown] = React.useState<string[]>([]);
  const [newLinkUrl, setNewLinkUrl] = React.useState('');
  const [newLinkDesc, setNewLinkDesc] = React.useState('');

  const { data: interfacesData } = useQuery({
    queryKey: ['interfaces', 'select', 'all'],
    queryFn: async () => {
      const res = await api.get<{ items: InterfaceOption[] }>('/interfaces', {
        params: { limit: 500, sort: 'name:ASC' },
      });
      return res.data.items || [];
    },
  });

  const interfaceOptions = React.useMemo(() => {
    const list = (interfacesData || []) as InterfaceOption[];
    const filtered = data?.id ? list.filter((i) => i.id !== data.id) : list;
    return filtered;
  }, [interfacesData, data?.id]);

  React.useEffect(() => {
    setLocalKeyIds(keyIdentifiers);
  }, [JSON.stringify(keyIdentifiers)]);

  React.useEffect(() => {
    const ups = dependencies.filter((d) => d.direction === 'upstream').map((d) => d.related_interface_id);
    const downs = dependencies.filter((d) => d.direction === 'downstream').map((d) => d.related_interface_id);
    setLocalDepsUp(ups);
    setLocalDepsDown(downs);
  }, [JSON.stringify(dependencies)]);

  const syncKeyIdentifiers = (rows: InterfaceKeyIdentifier[]) => {
    markDirty();
    update({ key_identifiers: rows });
  };

  const syncDependencies = (up: string[], down: string[]) => {
    markDirty();
    const rows: InterfaceDependency[] = [];
    up.forEach((id) => rows.push({ related_interface_id: id, direction: 'upstream' }));
    down.forEach((id) => rows.push({ related_interface_id: id, direction: 'downstream' }));
    update({ dependencies: rows });
  };

  const handleAddKeyId = () => {
    const next = [
      ...localKeyIds,
      { source_identifier: '', destination_identifier: '', identifier_notes: '' },
    ];
    setLocalKeyIds(next);
    syncKeyIdentifiers(next);
  };

  const handleUpdateKeyId = (index: number, patch: Partial<InterfaceKeyIdentifier>) => {
    const next = localKeyIds.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setLocalKeyIds(next);
    syncKeyIdentifiers(next);
  };

  const handleRemoveKeyId = (index: number) => {
    const next = localKeyIds.filter((_, i) => i !== index);
    setLocalKeyIds(next);
    syncKeyIdentifiers(next);
  };

  const handleCreateFunctionalLink = async (interfaceId: string) => {
    const url = newLinkUrl.trim();
    if (!url) return;
    try {
      const res = await api.post<InterfaceLink>(`/interfaces/${interfaceId}/links`, {
        kind: 'functional',
        url,
        description: newLinkDesc.trim() || null,
      });
      const created = res.data;
      const next = [...links, created];
      update({ links: next });
      setNewLinkUrl('');
      setNewLinkDesc('');
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
    form.append('kind', 'functional');
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
    if (!window.confirm(t('confirmations.deleteAttachment'))) return;
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

  const handleDeleteFunctionalLink = async (interfaceId: string, linkId: string) => {
    if (!window.confirm(t('confirmations.removeFunctionalDocLink'))) return;
    try {
      await api.delete(`/interfaces/${interfaceId}/links/${linkId}`);
      const next = links.filter((l) => l.id !== linkId);
      update({ links: next });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">Business objects</Typography>
        <TextField
          label="Business objects"
          value={
            Array.isArray(data?.business_objects)
              ? (data?.business_objects || []).join('\n')
              : (data?.business_objects || '')
          }
          onChange={(e) => {
            markDirty();
            update({ business_objects: e.target.value });
          }}
          multiline
          minRows={2}
        />
      </Stack>

      <TextField
        label="Main use cases"
        value={data?.main_use_cases || ''}
        onChange={(e) => {
          markDirty();
          update({ main_use_cases: e.target.value });
        }}
        multiline
        minRows={3}
      />

      <TextField
        label="Functional rules (high-level)"
        value={data?.functional_rules || ''}
        onChange={(e) => {
          markDirty();
          update({ functional_rules: e.target.value });
        }}
        multiline
        minRows={3}
      />

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Key identifiers / cross-system IDs</Typography>
        <Stack spacing={1}>
          {localKeyIds.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No key identifiers defined yet.
            </Typography>
          )}
          {localKeyIds.map((row, idx) => (
            <Box
              key={row.id || idx}
              sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 2fr auto', gap: 1, alignItems: 'center' }}
            >
              <TextField
                label="Source identifier"
                value={row.source_identifier || ''}
                onChange={(e) => handleUpdateKeyId(idx, { source_identifier: e.target.value })}
              />
              <TextField
                label="Destination identifier"
                value={row.destination_identifier || ''}
                onChange={(e) => handleUpdateKeyId(idx, { destination_identifier: e.target.value })}
              />
              <TextField
                label="Notes"
                value={row.identifier_notes || ''}
                onChange={(e) => handleUpdateKeyId(idx, { identifier_notes: e.target.value })}
              />
              <IconButton aria-label={t('common.remove')} onClick={() => handleRemoveKeyId(idx)} size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button startIcon={<AddIcon />} onClick={handleAddKeyId} size="small">
              Add row
            </Button>
          </Box>
        </Stack>
      </Stack>

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Dependencies</Typography>
        <Typography variant="body2" color="text.secondary">
          Track upstream and downstream interfaces that this flow depends on.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Autocomplete
            multiple
            options={interfaceOptions}
            value={interfaceOptions.filter((i) => localDepsUp.includes(i.id))}
            onChange={(_, value) => {
              const ids = (value || []).map((v) => v.id);
              setLocalDepsUp(ids);
              syncDependencies(ids, localDepsDown);
            }}
            getOptionLabel={(o) => o.name || o.interface_id || ''}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Upstream interfaces"
                placeholder="Select upstream interfaces"
              />
            )}
            fullWidth
          />
          <Autocomplete
            multiple
            options={interfaceOptions}
            value={interfaceOptions.filter((i) => localDepsDown.includes(i.id))}
            onChange={(_, value) => {
              const ids = (value || []).map((v) => v.id);
              setLocalDepsDown(ids);
              syncDependencies(localDepsUp, ids);
            }}
            getOptionLabel={(o) => o.name || o.interface_id || ''}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Downstream interfaces"
                placeholder="Select downstream interfaces"
              />
            )}
            fullWidth
          />
        </Stack>
      </Stack>

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Functional documentation links</Typography>
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
            onClick={() => data?.id && void handleCreateFunctionalLink(data.id)}
            disabled={!data?.id || !newLinkUrl.trim()}
          >
            Add
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {functionalLinks.map((link) => (
            <Chip
              key={link.id || link.url}
              label={link.description || link.url}
              onDelete={link.id ? () => data?.id && void handleDeleteFunctionalLink(data.id, link.id!) : undefined}
              component="a"
              href={link.url}
              target="_blank"
              clickable
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
          {functionalLinks.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No functional documentation links yet.
            </Typography>
          )}
        </Stack>
      </Stack>

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Functional attachments</Typography>
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
          {functionalAttachments.map((att) => (
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
          {functionalAttachments.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No functional attachments yet.
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
