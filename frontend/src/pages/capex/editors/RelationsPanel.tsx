import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Autocomplete, Box, Button, CircularProgress, IconButton, LinearProgress, Stack, TextField, Typography, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import ItemContactsSection from '../../../components/contacts/ItemContactsSection';

export type RelationsPanelHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
  reset: () => void;
};

type Props = { id: string; onDirtyChange?: (dirty: boolean) => void };

export default forwardRef<RelationsPanelHandle, Props>(function RelationsPanel({ id, onDirtyChange }, ref) {
  const { hasLevel } = useAuth();
  const { t } = useTranslation(['ops', 'common']);

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [linkedProjects, setLinkedProjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [baselineProjects, setBaselineProjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [projectOptions, setProjectOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);

  const [linkedContracts, setLinkedContracts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [baselineContracts, setBaselineContracts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [contractOptions, setContractOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingContracts, setLoadingContracts] = React.useState(false);

  const fetchContracts = React.useCallback(async (q: string) => {
    setLoadingContracts(true);
    try {
      const params: any = { limit: 50 };
      if (q && q.length >= 1) params.q = q;
      const res = await api.get(`/contracts`, { params });
      const items = (res.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
      setContractOptions(items);
    } catch { setContractOptions([]); }
    finally { setLoadingContracts(false); }
  }, []);

  const [urls, setUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);
  const [baselineUrls, setBaselineUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);

  const [attachments, setAttachments] = React.useState<Array<{ id: string; original_filename: string; stored_filename: string }>>([]);
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadCount, setUploadCount] = React.useState(0);

  const dirty = React.useMemo(() => {
    const a = JSON.stringify(linkedProjects.map(x => x.id)) !== JSON.stringify(baselineProjects.map(x => x.id));
    const b = JSON.stringify(linkedContracts.map(x => x.id)) !== JSON.stringify(baselineContracts.map(x => x.id));
    const c = JSON.stringify(urls) !== JSON.stringify(baselineUrls);
    return a || b || c;
  }, [linkedProjects, baselineProjects, linkedContracts, baselineContracts, urls, baselineUrls]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Projects
      const resProjects = await api.get(`/capex-items/${id}/projects`);
      const projects = (resProjects.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
      setLinkedProjects(projects);
      setBaselineProjects(projects);
      // Contracts
      const resLinks = await api.get(`/capex-items/${id}/contracts`);
      const items = resLinks.data?.items || [];
      const mapped = items.map((x: any) => ({ id: x.id, name: x.name }));
      setLinkedContracts(mapped);
      setBaselineContracts(mapped);
      // URLs
      const resUrls = await api.get(`/capex-items/${id}/links`);
      const urlItems = (resUrls.data || []).map((x: any) => ({ id: x.id, description: x.description, url: x.url }));
      setUrls(urlItems); setBaselineUrls(urlItems);
      // Attachments
      const resAtt = await api.get(`/capex-items/${id}/attachments`);
      setAttachments(resAtt.data || []);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('capex.relations.failedToLoad')));
      setLinkedProjects([]); setBaselineProjects([]);
      setLinkedContracts([]); setBaselineContracts([]);
      setUrls([]); setBaselineUrls([]);
      setAttachments([]);
    } finally { setLoading(false); }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  // Preload project options
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingProjects(true);
      try {
        const all: Array<{ id: string; name: string }> = [];
        let page = 1; const limit = 100; let total = Infinity;
        while ((page - 1) * limit < total) {
          const res = await api.get(`/portfolio/projects`, { params: { page, limit, sort: 'name:ASC' } });
          const items = (res.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
          total = Number(res.data?.total || items.length);
          all.push(...items);
          if (items.length < limit) break;
          page += 1;
        }
        if (!alive) return;
        setProjectOptions(all);
      } catch { if (alive) setProjectOptions([]); }
      finally { if (alive) setLoadingProjects(false); }
    })();
    return () => { alive = false; };
  }, []);

  const loadAttachments = React.useCallback(async () => {
    try {
      const res = await api.get(`/capex-items/${id}/attachments`);
      setAttachments(res.data || []);
    } catch { /* ignore */ }
  }, [id]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true); setError(null);
    try {
      // Save projects (bulk-replace)
      await api.post(`/capex-items/${id}/projects/bulk-replace`, { project_ids: linkedProjects.map(p => p.id) });
      setBaselineProjects(linkedProjects);
      // Save contracts (bulk-replace)
      await api.post(`/capex-items/${id}/contracts/bulk-replace`, { contract_ids: linkedContracts.map(c => c.id) });
      setBaselineContracts(linkedContracts);
      // Save URLs (sync by upserting and deleting missing)
      const existing = baselineUrls;
      const existingIds = new Set(existing.filter(x => x.id).map(x => x.id as string));
      const currentIds = new Set(urls.filter(x => x.id).map(x => x.id as string));
      for (const ex of existing) { if (ex.id && !currentIds.has(ex.id)) await api.delete(`/capex-items/${id}/links/${ex.id}`); }
      for (const u of urls) {
        if (u.id) await api.patch(`/capex-items/${id}/links/${u.id}`, { description: u.description, url: u.url });
        else await api.post(`/capex-items/${id}/links`, { description: u.description, url: u.url });
      }
      setBaselineUrls(urls);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('capex.relations.failedToSave')));
      throw e;
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ isDirty: () => dirty, save, reset: () => { void load(); } }), [dirty, save, load]);

  const readOnly = !hasLevel('capex','manager');

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}

      <Typography variant="subtitle2">{t('capex.relations.projects')}</Typography>
      <Autocomplete
        multiple
        options={projectOptions}
        value={linkedProjects}
        getOptionLabel={(o) => o.name}
        onChange={(_, v) => setLinkedProjects(v as any)}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>{option.name}</li>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip {...getTagProps({ index })} key={option.id} label={option.name} />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('capex.relations.projects')}
            placeholder={t('capex.relations.selectProjects')}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (<>{loadingProjects ? <CircularProgress color="inherit" size={18} /> : null}{params.InputProps.endAdornment}</>)
            }}
          />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        filterSelectedOptions
        disabled={loading || saving || readOnly}
        fullWidth
      />

      <Typography variant="subtitle2">{t('capex.relations.contracts')}</Typography>
      <Autocomplete
        multiple
        options={contractOptions}
        value={linkedContracts}
        getOptionLabel={(o) => o.name}
        onChange={(_, v) => setLinkedContracts(v as any)}
        onInputChange={(_, newInputValue) => { void fetchContracts(newInputValue || ''); }}
        onOpen={() => { if (contractOptions.length === 0) { void fetchContracts(''); } }}
        openOnFocus
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('capex.relations.contracts')}
            placeholder={t('capex.relations.selectContracts')}
            InputProps={{
              ...params.InputProps,
              endAdornment: (<>{loadingContracts ? <CircularProgress color="inherit" size={18} /> : null}{params.InputProps.endAdornment}</>)
            }}
          />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        disabled={loading || saving || readOnly}
        fullWidth
      />

      <ItemContactsSection itemType="capex-items" itemId={id} canManage={!readOnly} />

      <Typography variant="subtitle2">{t('capex.relations.relevantWebsites')}</Typography>
      <Stack spacing={1}>
        {urls.map((l, idx) => (
          <Stack key={l.id || idx} direction="row" spacing={1} alignItems="center">
            <TextField label="Description" value={l.description || ''} onChange={(e) => setUrls(prev => prev.map((x, i) => i===idx? { ...x, description: e.target.value }: x))} fullWidth InputLabelProps={{ shrink: true }} disabled={readOnly} />
            <TextField label="URL" value={l.url} onChange={(e) => setUrls(prev => prev.map((x, i) => i===idx? { ...x, url: e.target.value }: x))} fullWidth InputLabelProps={{ shrink: true }} disabled={readOnly} />
            {!readOnly && (<IconButton aria-label="delete" onClick={() => setUrls(prev => prev.filter((_, i) => i!==idx))}><DeleteIcon fontSize="small"/></IconButton>)}
          </Stack>
        ))}
        {!readOnly && <Button size="small" onClick={() => setUrls(prev => [...prev, { url: '' }])}>{t('capex.relations.addUrl')}</Button>}
      </Stack>

      <Typography variant="subtitle2">{t('capex.relations.attachments')}</Typography>
      <Stack spacing={1}>
        <Box
          onDragOver={(e) => { if (!readOnly) { e.preventDefault(); setHover(true); } }}
          onDragLeave={() => setHover(false)}
          onDrop={async (e) => {
            if (readOnly) return;
            e.preventDefault(); setHover(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length === 0) return;
            setUploading(true); setUploadCount(files.length);
            try {
              for (const f of files) {
                const fd = new FormData(); fd.append('file', f);
                await api.post(`/capex-items/${id}/attachments`, fd);
              }
              await loadAttachments();
            } finally { setUploading(false); setUploadCount(0); }
          }}
          sx={{ border: '2px dashed', borderColor: hover ? 'primary.main' : 'divider', borderRadius: 1, p: 2, textAlign: 'center', cursor: readOnly ? 'default' : 'pointer', opacity: readOnly ? 0.6 : 1 }}
        >
          <Typography variant="body2" color="text.secondary">{readOnly ? t('capex.relations.noUploadPermission') : t('capex.relations.dragDrop')}</Typography>
          <Box sx={{ mt: 1 }}>
            <Button component="label" size="small" variant="outlined" disabled={readOnly || uploading}>
              {t('capex.relations.selectFiles')}
              <input type="file" hidden multiple onChange={async (e) => {
                const input = e.currentTarget as HTMLInputElement | null;
                const files = Array.from((e.target as HTMLInputElement)?.files || []);
                if (files.length === 0) return;
                setUploading(true); setUploadCount(files.length);
                try {
                  for (const f of files) { const fd = new FormData(); fd.append('file', f); await api.post(`/capex-items/${id}/attachments`, fd); }
                  await loadAttachments();
                } finally { setUploading(false); setUploadCount(0); if (input) input.value = ''; }
              }} />
            </Button>
          </Box>
          {uploading && <LinearProgress sx={{ mt: 1 }} />}
          {uploading && (<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{t('capex.relations.uploadingFiles', { count: uploadCount })}…</Typography>)}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {attachments.map((a) => {
            const canDelete = hasLevel('capex','manager') && !readOnly;
            const onDelete = async () => {
              if (!canDelete) return;
              const ok = window.confirm(t('confirmations.deleteAttachment', { name: a.original_filename }));
              if (!ok) return;
              try { await api.patch(`/capex-items/attachments/${a.id}/delete`, {}); await loadAttachments(); } catch {}
            };
            return (
              <Chip
                key={a.id}
                label={a.original_filename}
                onClick={async () => {
                  const res = await api.get(`/capex-items/attachments/${a.id}`, { responseType: 'blob' });
                  const blob = new Blob([res.data]);
                  const url = window.URL.createObjectURL(blob);
                  const el = document.createElement('a'); el.href = url; el.download = a.original_filename; el.click(); window.URL.revokeObjectURL(url);
                }}
                onDelete={canDelete ? onDelete : undefined}
                deleteIcon={canDelete ? <DeleteIcon fontSize="small" /> : undefined}
              />
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
});
