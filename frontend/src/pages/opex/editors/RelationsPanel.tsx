import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Stack, Typography, TextField, Button, CircularProgress, Autocomplete, IconButton, LinearProgress, Chip, Box } from '@mui/material';
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
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [linkedContracts, setLinkedContracts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [baselineContracts, setBaselineContracts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [linkedApps, setLinkedApps] = React.useState<Array<{ id: string; name: string }>>([]);
  const [baselineApps, setBaselineApps] = React.useState<Array<{ id: string; name: string }>>([]);
  const [linkedProjects, setLinkedProjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [baselineProjects, setBaselineProjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [projectOptions, setProjectOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);
  const [contractSearch, setContractSearch] = React.useState('');
  const [contractOptions, setContractOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingContracts, setLoadingContracts] = React.useState(false);
  const [appOptions, setAppOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingApps, setLoadingApps] = React.useState(false);
  const [urls, setUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);
  const [baselineUrls, setBaselineUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);
  const [attachments, setAttachments] = React.useState<Array<{ id: string; original_filename: string; stored_filename: string }>>([]);
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadCount, setUploadCount] = React.useState(0);

  const dirty = React.useMemo(() => {
    const contractsChanged = JSON.stringify(linkedContracts.map(x => x.id)) !== JSON.stringify(baselineContracts.map(x => x.id));
    const appsChanged = JSON.stringify(linkedApps.map(x => x.id)) !== JSON.stringify(baselineApps.map(x => x.id));
    const projectsChanged = JSON.stringify(linkedProjects.map(x => x.id)) !== JSON.stringify(baselineProjects.map(x => x.id));
    const urlsChanged = JSON.stringify(urls) !== JSON.stringify(baselineUrls);
    return contractsChanged || appsChanged || projectsChanged || urlsChanged;
  }, [linkedContracts, baselineContracts, linkedApps, baselineApps, linkedProjects, baselineProjects, urls, baselineUrls]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Projects
      const resProjects = await api.get(`/spend-items/${id}/projects`);
      const projects = (resProjects.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
      setLinkedProjects(projects);
      setBaselineProjects(projects);
      const resApps = await api.get(`/spend-items/${id}/applications`);
      const apps = (resApps.data?.items || []) as Array<{ id: string; name: string }>;
      setLinkedApps(apps);
      setBaselineApps(apps);
      const resLinks = await api.get(`/spend-items/${id}/contracts`);
      const items = resLinks.data?.items || [];
      const mapped = items.map((x: any) => ({ id: x.id, name: x.name }));
      setLinkedContracts(mapped);
      setBaselineContracts(mapped);
      const resUrls = await api.get(`/spend-items/${id}/links`);
      const urlItems = (resUrls.data || []).map((x: any) => ({ id: x.id, description: x.description, url: x.url }));
      setUrls(urlItems); setBaselineUrls(urlItems);
      const resAtt = await api.get(`/spend-items/${id}/attachments`);
      setAttachments(resAtt.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load relations');
      setLinkedProjects([]); setBaselineProjects([]);
      setLinkedContracts([]);
      setBaselineContracts([]);
      setLinkedApps([]);
      setBaselineApps([]);
      setUrls([]); setBaselineUrls([]);
      setAttachments([]);
    } finally { setLoading(false); }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  // Preload Contracts options so the dropdown isn't empty
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingContracts(true);
      try {
        const all: Array<{ id: string; name: string }> = [];
        let page = 1; const limit = 100; let total = Infinity;
        while ((page - 1) * limit < total) {
          const res = await api.get(`/contracts`, { params: { page, limit, sort: 'name:ASC' } });
          const items = (res.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
          total = Number(res.data?.total || items.length);
          all.push(...items);
          if (items.length < limit) break;
          page += 1;
        }
        if (!alive) return;
        setContractOptions(all);
      } catch { if (alive) setContractOptions([]); }
      finally { if (alive) setLoadingContracts(false); }
    })();
    return () => { alive = false; };
  }, []);

  // Preload Applications options
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingApps(true);
      try {
        const all: Array<{ id: string; name: string }> = [];
        let page = 1; const limit = 100; let total = Infinity;
        while ((page - 1) * limit < total) {
          const res = await api.get(`/applications`, { params: { page, limit, sort: 'name:ASC' } });
          const items = (res.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
          total = Number(res.data?.total || items.length);
          all.push(...items);
          if (items.length < limit) break;
          page += 1;
        }
        if (!alive) return;
        setAppOptions(all);
      } catch { if (alive) setAppOptions([]); }
      finally { if (alive) setLoadingApps(false); }
    })();
    return () => { alive = false; };
  }, []);

  // Preload Projects options
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
      const res = await api.get(`/spend-items/${id}/attachments`);
      setAttachments(res.data || []);
    } catch {}
  }, [id]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      // Save projects (bulk-replace)
      await api.post(`/spend-items/${id}/projects/bulk-replace`, { project_ids: linkedProjects.map(p => p.id) });
      setBaselineProjects(linkedProjects);
      // Save linked applications
      await api.post(`/spend-items/${id}/applications/bulk-replace`, { application_ids: linkedApps.map(a => a.id) });
      setBaselineApps(linkedApps);
      // Save contracts
      await api.post(`/spend-items/${id}/contracts/bulk-replace`, { contract_ids: linkedContracts.map(c => c.id) });
      setBaselineContracts(linkedContracts);
      // Save URLs (sync)
      const existing = baselineUrls;
      const existingIds = new Set(existing.filter(x => x.id).map(x => x.id as string));
      const currentIds = new Set(urls.filter(x => x.id).map(x => x.id as string));
      for (const ex of existing) { if (ex.id && !currentIds.has(ex.id)) await api.delete(`/spend-items/${id}/links/${ex.id}`); }
      for (const u of urls) { if (!u.url) continue; if (u.id) await api.patch(`/spend-items/${id}/links/${u.id}`, { description: u.description, url: u.url }); else await api.post(`/spend-items/${id}/links`, { description: u.description, url: u.url }); }
      setBaselineUrls(urls);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save relations');
      throw e;
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ isDirty: () => dirty, save, reset: () => { void load(); } }), [dirty, save, load]);
  const readOnly = !hasLevel('opex','manager');

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}
      <Typography variant="subtitle2">Projects</Typography>
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
            label="Projects"
            placeholder="Select projects"
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

      <Typography variant="subtitle2">Applications</Typography>
      <Autocomplete
        multiple
        options={appOptions}
        value={linkedApps}
        getOptionLabel={(option) => option.name}
        onChange={(_, newValue) => setLinkedApps(newValue as any)}
        onOpen={async () => {
          if (appOptions.length === 0 && !loadingApps) {
            try {
              const res = await api.get(`/applications`, { params: { page: 1, limit: 100, sort: 'name:ASC' } });
              const items = (res.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
              setAppOptions(items);
            } catch { setAppOptions([]); }
          }
        }}
        onInputChange={async (_, newInputValue) => {
          setLoadingApps(true);
          try {
            const params: any = { limit: 50 };
            if (newInputValue && newInputValue.length >= 1) params.q = newInputValue;
            const res = await api.get(`/applications`, { params });
            const items = (res.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
            setAppOptions(items);
          } catch {
            setAppOptions([]);
          } finally {
            setLoadingApps(false);
          }
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={option.name}
              onClick={() => window.open(`/it/applications/${option.id}/overview`, '_self')}
              clickable
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Applications"
            placeholder="Select applications/services"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingApps ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        disabled={loading || saving || readOnly}
        fullWidth
      />

      <Typography variant="subtitle2">Contracts</Typography>
      <Autocomplete
        multiple
        options={contractOptions}
        value={linkedContracts}
        getOptionLabel={(option) => option.name}
        onChange={(_, newValue) => setLinkedContracts(newValue as any)}
        onOpen={async () => {
          if (contractOptions.length === 0 && !loadingContracts) {
            try {
              const res = await api.get(`/contracts`, { params: { page: 1, limit: 100, sort: 'name:ASC' } });
              const items = (res.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
              setContractOptions(items);
            } catch { setContractOptions([]); }
          }
        }}
        onInputChange={async (_, newInputValue) => {
          setContractSearch(newInputValue);
          setLoadingContracts(true);
          try {
            const params: any = { limit: 50 };
            if (newInputValue && newInputValue.length >= 1) params.q = newInputValue;
            const res = await api.get(`/contracts`, { params });
            const items = (res.data?.items || []).map((x: any) => ({ id: x.id, name: x.name }));
            setContractOptions(items);
          } catch {
            setContractOptions([]);
          } finally {
            setLoadingContracts(false);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Contracts"
            placeholder="Select contracts"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingContracts ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        disabled={loading || saving || readOnly}
        fullWidth
      />

      <ItemContactsSection itemType="spend-items" itemId={id} canManage={!readOnly} />

      <Typography variant="subtitle2">Relevant websites</Typography>
      <Stack spacing={1}>
        {urls.map((l, idx) => (
          <Stack key={l.id || idx} direction="row" spacing={1} alignItems="center">
            <TextField label="Description" value={l.description || ''} onChange={(e) => setUrls(prev => prev.map((x, i) => i===idx? { ...x, description: e.target.value }: x))} fullWidth InputLabelProps={{ shrink: true }} disabled={readOnly} />
            <TextField label="URL" value={l.url} onChange={(e) => setUrls(prev => prev.map((x, i) => i===idx? { ...x, url: e.target.value }: x))} fullWidth InputLabelProps={{ shrink: true }} disabled={readOnly} />
            {!readOnly && <IconButton aria-label="delete" onClick={() => setUrls(prev => prev.filter((_, i) => i!==idx))}><DeleteIcon fontSize="small"/></IconButton>}
          </Stack>
        ))}
        {!readOnly && <Button size="small" onClick={() => setUrls(prev => [...prev, { url: '' }])}>Add URL</Button>}
      </Stack>

      <Typography variant="subtitle2">Attachments</Typography>
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
              for (const f of files) { const fd = new FormData(); fd.append('file', f); await api.post(`/spend-items/${id}/attachments`, fd); }
              await loadAttachments();
            } finally { setUploading(false); setUploadCount(0); }
          }}
          sx={{ border: '2px dashed', borderColor: hover ? 'primary.main' : 'divider', borderRadius: 1, p: 2, textAlign: 'center', cursor: readOnly ? 'default' : 'pointer', opacity: readOnly ? 0.6 : 1 }}
        >
          <Typography variant="body2" color="text.secondary">{readOnly ? 'You do not have permission to upload attachments.' : 'Drag & drop files here, or use the button to select'}</Typography>
          <Box sx={{ mt: 1 }}>
            <Button component="label" size="small" variant="outlined" disabled={readOnly || uploading}>
              Select files
              <input type="file" hidden multiple onChange={async (e) => {
                const input = e.currentTarget as HTMLInputElement | null;
                const files = Array.from((e.target as HTMLInputElement)?.files || []);
                if (files.length === 0) return;
                setUploading(true); setUploadCount(files.length);
                try {
                  for (const f of files) { const fd = new FormData(); fd.append('file', f); await api.post(`/spend-items/${id}/attachments`, fd); }
                  await loadAttachments();
                } finally { setUploading(false); setUploadCount(0); if (input) input.value = ''; }
              }} />
            </Button>
          </Box>
          {uploading && <LinearProgress sx={{ mt: 1 }} />}
          {uploading && (<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Uploading {uploadCount} file{uploadCount === 1 ? '' : 's'}…</Typography>)}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {attachments.map((a) => {
            const canDelete = hasLevel('opex','manager') && !readOnly;
            const onDelete = async () => {
              if (!canDelete) return;
              const ok = window.confirm(`Delete attachment \"${a.original_filename}\"?`);
              if (!ok) return;
              try { await api.patch(`/spend-items/attachments/${a.id}/delete`, {}); await loadAttachments(); } catch {}
            };
            return (
              <Chip
                key={a.id}
                label={a.original_filename}
                onClick={async () => {
                  const res = await api.get(`/spend-items/attachments/${a.id}`, { responseType: 'blob' });
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
