import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, IconButton, LinearProgress, Stack, TextField, Typography, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';

import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import { KanapDialog, PropertyRow } from '../../../components/design';
import { dialogBorderedFieldSx, drawerAutocompleteListboxSx, drawerFieldValueSx } from '../../../theme/formSx';
export type ApplicationRelationsPanelHandle = {
  save: () => Promise<void>;
  reset: () => void;
};

type Props = { id: string; isSuite?: boolean; onDirtyChange?: (dirty: boolean) => void };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="h2"
      sx={(theme) => ({
        m: 0,
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.4,
        color: theme.palette.kanap.text.primary,
      })}
    >
      {children}
    </Typography>
  );
}

function normalizeUrl(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export default forwardRef<ApplicationRelationsPanelHandle, Props>(function ApplicationRelationsPanel({ id, isSuite = false, onDirtyChange }, ref) {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel } = useAuth();
  const readOnly = !hasLevel('applications', 'manager');

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [linkedOpex, setLinkedOpex] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [baselineOpex, setBaselineOpex] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [opexOptions, setOpexOptions] = React.useState<Array<{ id: string; product_name: string }>>([]);

  const [linkedCapex, setLinkedCapex] = React.useState<Array<{ id: string; description: string }>>([]);
  const [baselineCapex, setBaselineCapex] = React.useState<Array<{ id: string; description: string }>>([]);
  const [capexOptions, setCapexOptions] = React.useState<Array<{ id: string; description: string }>>([]);

  const [linkedContracts, setLinkedContracts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [baselineContracts, setBaselineContracts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [contractOptions, setContractOptions] = React.useState<Array<{ id: string; name: string }>>([]);

  const [linkedProjects, setLinkedProjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [baselineProjects, setBaselineProjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [projectOptions, setProjectOptions] = React.useState<Array<{ id: string; name: string }>>([]);

  const [urls, setUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);
  const [baselineUrls, setBaselineUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkDraft, setLinkDraft] = React.useState<{ description: string; url: string }>({ description: '', url: '' });
  const urlsEditedRef = React.useRef(false);

  const [attachments, setAttachments] = React.useState<Array<{ id: string; original_filename: string }>>([]);
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadCount, setUploadCount] = React.useState(0);

  // Structure: reverse components when this app is a suite
  const [components, setComponents] = React.useState<Array<{ id: string; name: string; lifecycle: string; criticality: string }>>([]);

  const dirty = React.useMemo(() => {
    const a = JSON.stringify(linkedOpex.map(x => x.id)) !== JSON.stringify(baselineOpex.map(x => x.id));
    const b = JSON.stringify(linkedCapex.map(x => x.id)) !== JSON.stringify(baselineCapex.map(x => x.id));
    const c = JSON.stringify(linkedContracts.map(x => x.id)) !== JSON.stringify(baselineContracts.map(x => x.id));
    const d = JSON.stringify(linkedProjects.map(x => x.id)) !== JSON.stringify(baselineProjects.map(x => x.id));
    const e = JSON.stringify(urls) !== JSON.stringify(baselineUrls);
    return a || b || c || d || e;
  }, [linkedOpex, baselineOpex, linkedCapex, baselineCapex, linkedContracts, baselineContracts, linkedProjects, baselineProjects, urls, baselineUrls]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Linked relations
      try {
        const res = await api.get(`/applications/${id}/spend-items`);
        const items = (res.data?.items || []) as Array<{ id: string; product_name: string }>;
        setLinkedOpex(items); setBaselineOpex(items);
      } catch { setLinkedOpex([]); setBaselineOpex([]); }
      try {
        const res = await api.get(`/applications/${id}/capex-items`);
        const items = (res.data?.items || []) as Array<{ id: string; description: string }>;
        setLinkedCapex(items); setBaselineCapex(items);
      } catch { setLinkedCapex([]); setBaselineCapex([]); }
      try {
        const res = await api.get(`/applications/${id}/contracts`);
        const items = (res.data?.items || []) as Array<{ id: string; name: string }>;
        setLinkedContracts(items); setBaselineContracts(items);
      } catch { setLinkedContracts([]); setBaselineContracts([]); }

      // Projects
      try {
        const res = await api.get(`/applications/${id}/projects`);
        const items = (res.data?.items || []) as Array<{ id: string; name: string }>;
        setLinkedProjects(items); setBaselineProjects(items);
      } catch { setLinkedProjects([]); setBaselineProjects([]); }

      // URLs
      try {
        const resUrls = await api.get(`/applications/${id}/links`);
        const urlItems = (resUrls.data || []).map((x: any) => ({ id: x.id, description: x.description, url: x.url }));
        setBaselineUrls(urlItems);
        if (!urlsEditedRef.current) setUrls(urlItems);
      } catch { if (!urlsEditedRef.current) setUrls([]); setBaselineUrls([]); }

      // Attachments
      try {
        const resAtt = await api.get(`/applications/${id}/attachments`);
        setAttachments(resAtt.data || []);
      } catch { setAttachments([]); }
      // Components (children) — only relevant when this app can have children (isSuite=true)
      if (isSuite) {
        try {
          const resComps = await api.get(`/applications/${id}/components`);
          const items = (resComps.data?.items || []) as Array<{ id: string; name: string; lifecycle: string; criticality: string }>;
          setComponents(items);
        } catch { setComponents([]); }
      } else {
        setComponents([]);
      }
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.loadRelationsFailed')));
    } finally { setLoading(false); }
  }, [id, isSuite]);
  React.useEffect(() => { void load(); }, [load]);

  // Preload all selectable options (paged, alphabetical)
  React.useEffect(() => {
    let alive = true;
    const fetchAllPaged = async (endpoint: string, sortField: string) => {
      const all: any[] = [];
      let page = 1; const limit = 100; let total = Infinity;
      while ((page - 1) * limit < total) {
        const res = await api.get(endpoint, { params: { page, limit, sort: `${sortField}:ASC` } });
        const items = (res.data?.items || []) as any[];
        total = Number(res.data?.total || items.length);
        all.push(...items);
        if (items.length < limit) break;
        page += 1;
      }
      return all;
    };
    (async () => {
      try {
        const [allSpend, allCapex, allContracts, allProjects] = await Promise.all([
          fetchAllPaged('/spend-items', 'product_name'),
          fetchAllPaged('/capex-items', 'description'),
          fetchAllPaged('/contracts', 'name'),
          fetchAllPaged('/portfolio/projects', 'name'),
        ]);
        if (!alive) return;
        const dedupById = <T extends { id: string }>(arr: T[]) => Array.from(new Map(arr.map(i => [i.id, i])).values());
        const opex = dedupById(allSpend.map((x: any) => ({ id: x.id, product_name: x.product_name })));
        const capex = dedupById(allCapex.map((x: any) => ({ id: x.id, description: x.description })));
        const contracts = dedupById(allContracts.map((x: any) => ({ id: x.id, name: x.name })));
        const projects = dedupById(allProjects.map((x: any) => ({ id: x.id, name: x.name })));
        setOpexOptions(opex.sort((a, b) => a.product_name.localeCompare(b.product_name)));
        setCapexOptions(capex.sort((a, b) => a.description.localeCompare(b.description)));
        setContractOptions(contracts.sort((a, b) => a.name.localeCompare(b.name)));
        setProjectOptions(projects.sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        if (!alive) return;
        setOpexOptions([]); setCapexOptions([]); setContractOptions([]); setProjectOptions([]);
      }
    })();
    return () => { alive = false; };
  }, [isSuite, id]);

  const save = async () => {
    if (readOnly) return;
    setSaving(true); setError(null);
    try {
      await api.post(`/applications/${id}/spend-items/bulk-replace`, { spend_item_ids: linkedOpex.map(x => x.id) });
      setBaselineOpex(linkedOpex);
      await api.post(`/applications/${id}/capex-items/bulk-replace`, { capex_item_ids: linkedCapex.map(x => x.id) });
      setBaselineCapex(linkedCapex);
      await api.post(`/applications/${id}/contracts/bulk-replace`, { contract_ids: linkedContracts.map(x => x.id) });
      setBaselineContracts(linkedContracts);
      // Save projects
      await api.post(`/applications/${id}/projects/bulk-replace`, { project_ids: linkedProjects.map(x => x.id) });
      setBaselineProjects(linkedProjects);
      // URLs sync
      const existing = baselineUrls;
      const existingIds = new Set(existing.filter(x => x.id).map(x => x.id as string));
      const currentIds = new Set(urls.filter(x => x.id).map(x => x.id as string));
      for (const ex of existing) { if (ex.id && !currentIds.has(ex.id)) await api.delete(`/applications/${id}/links/${ex.id}`); }
      for (const u of urls) { if (!u.url) continue; if (u.id && existingIds.has(u.id)) await api.patch(`/applications/${id}/links/${u.id}`, { description: u.description ?? null, url: u.url }); else await api.post(`/applications/${id}/links`, { description: u.description ?? null, url: u.url }); }
      setBaselineUrls(urls);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveRelationsFailed')));
      throw e;
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ save, reset: () => { urlsEditedRef.current = false; void load(); } }), [save, load]);

  const relationTagSx = {
    height: 22,
    borderRadius: '4px',
    fontSize: 12,
    '& .MuiChip-label': { px: '7px' },
  } as const;
  const relationControlSx = { maxWidth: 420 } as const;
  const relationWideControlSx = { maxWidth: 640 } as const;
  const relationAutocompleteSx = [drawerFieldValueSx, { width: '100%' }] as const;

  const replaceOpexRelations = React.useCallback(async (next: Array<{ id: string; product_name: string }>) => {
    setLinkedOpex(next);
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/applications/${id}/spend-items/bulk-replace`, { spend_item_ids: next.map((item) => item.id) });
      setBaselineOpex(next);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveRelationsFailed')));
    } finally {
      setSaving(false);
    }
  }, [id, readOnly, t]);

  const replaceCapexRelations = React.useCallback(async (next: Array<{ id: string; description: string }>) => {
    setLinkedCapex(next);
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/applications/${id}/capex-items/bulk-replace`, { capex_item_ids: next.map((item) => item.id) });
      setBaselineCapex(next);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveRelationsFailed')));
    } finally {
      setSaving(false);
    }
  }, [id, readOnly, t]);

  const replaceContractRelations = React.useCallback(async (next: Array<{ id: string; name: string }>) => {
    setLinkedContracts(next);
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/applications/${id}/contracts/bulk-replace`, { contract_ids: next.map((item) => item.id) });
      setBaselineContracts(next);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveRelationsFailed')));
    } finally {
      setSaving(false);
    }
  }, [id, readOnly, t]);

  const replaceProjectRelations = React.useCallback(async (next: Array<{ id: string; name: string }>) => {
    setLinkedProjects(next);
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/applications/${id}/projects/bulk-replace`, { project_ids: next.map((item) => item.id) });
      setBaselineProjects(next);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveRelationsFailed')));
    } finally {
      setSaving(false);
    }
  }, [id, readOnly, t]);

  const syncUrls = React.useCallback(async (nextUrls: Array<{ id?: string; description?: string; url: string }>) => {
    setUrls(nextUrls);
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const existingIds = new Set(baselineUrls.filter((item) => item.id).map((item) => item.id as string));
      const currentIds = new Set(nextUrls.filter((item) => item.id).map((item) => item.id as string));
      for (const existing of baselineUrls) {
        if (existing.id && !currentIds.has(existing.id)) {
          await api.delete(`/applications/${id}/links/${existing.id}`);
        }
      }
      for (const link of nextUrls) {
        const url = String(link.url || '').trim();
        if (!url) continue;
        const body = { description: link.description ?? null, url };
        if (link.id && existingIds.has(link.id)) {
          await api.patch(`/applications/${id}/links/${link.id}`, body);
        } else {
          await api.post(`/applications/${id}/links`, body);
        }
      }
      const resUrls = await api.get(`/applications/${id}/links`);
      const urlItems = ((resUrls.data || []) as Array<{ id?: string; description?: string | null; url?: string }>).map((item) => ({ id: item.id, description: item.description || undefined, url: item.url || '' }));
      urlsEditedRef.current = false;
      setBaselineUrls(urlItems);
      setUrls(urlItems);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveRelationsFailed')));
    } finally {
      setSaving(false);
    }
  }, [baselineUrls, id, readOnly, t]);

  const addLink = React.useCallback(async () => {
    const url = String(linkDraft.url || '').trim();
    if (!url) return;
    const nextUrls = [
      ...urls,
      {
        description: String(linkDraft.description || '').trim() || undefined,
        url,
      },
    ];
    await syncUrls(nextUrls);
    setLinkDraft({ description: '', url: '' });
    setLinkDialogOpen(false);
  }, [linkDraft.description, linkDraft.url, syncUrls, urls]);

  return (
    <>
      <Stack spacing={2}>
        {!!error && <Alert severity="error">{error}</Alert>}

      {isSuite && (
        <>
          <SectionTitle>Components</SectionTitle>
          {components.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No child applications linked yet.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" sx={{ '& tbody td': { py: 0.75 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Application</TableCell>
                    <TableCell>Lifecycle</TableCell>
                    <TableCell>Criticality</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {components.map((c) => (
                    <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => window.open(`/it/applications/${c.id}/overview`, '_self')}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{(() => { switch (String(c.lifecycle || '')) { case 'proposed': return 'Proposed'; case 'active': return 'Active'; case 'deprecated': return 'Deprecated'; case 'retired': return 'Retired'; default: return String(c.lifecycle || ''); } })()}</TableCell>
                      <TableCell>{(() => { switch (String(c.criticality || '')) { case 'business_critical': return t('enums.criticality.businessCritical'); case 'high': return t('enums.criticality.high'); case 'medium': return t('enums.criticality.medium'); case 'low': return t('enums.criticality.low'); default: return String(c.criticality || ''); } })()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <PropertyRow label="OPEX items" valueSx={relationControlSx}>
        <Autocomplete
          multiple
          options={opexOptions}
          value={linkedOpex}
          getOptionLabel={(o) => o.product_name}
          onChange={(_, v) => { void replaceOpexRelations(v); }}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>{option.product_name}</li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option.id} label={option.product_name} sx={relationTagSx} />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select OPEX items"
              variant="standard"
              InputProps={{ ...params.InputProps, disableUnderline: true }}
              sx={drawerFieldValueSx}
            />
          )}
          ListboxProps={{ sx: drawerAutocompleteListboxSx }}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          filterSelectedOptions
          disabled={saving || readOnly}
          fullWidth
          sx={relationAutocompleteSx}
        />
      </PropertyRow>

      <PropertyRow label="CAPEX items" valueSx={relationControlSx}>
        <Autocomplete
          multiple
          options={capexOptions}
          value={linkedCapex}
          getOptionLabel={(o) => o.description}
          onChange={(_, v) => { void replaceCapexRelations(v); }}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>{option.description}</li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option.id} label={option.description} sx={relationTagSx} />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select CAPEX items"
              variant="standard"
              InputProps={{ ...params.InputProps, disableUnderline: true }}
              sx={drawerFieldValueSx}
            />
          )}
          ListboxProps={{ sx: drawerAutocompleteListboxSx }}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          filterSelectedOptions
          disabled={saving || readOnly}
          fullWidth
          sx={relationAutocompleteSx}
        />
      </PropertyRow>

      <PropertyRow label="Contracts" valueSx={relationControlSx}>
        <Autocomplete
          multiple
          options={contractOptions}
          value={linkedContracts}
          getOptionLabel={(o) => o.name}
          onChange={(_, v) => { void replaceContractRelations(v); }}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>{option.name}</li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option.id} label={option.name} sx={relationTagSx} />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select contracts"
              variant="standard"
              InputProps={{ ...params.InputProps, disableUnderline: true }}
              sx={drawerFieldValueSx}
            />
          )}
          ListboxProps={{ sx: drawerAutocompleteListboxSx }}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          filterSelectedOptions
          disabled={saving || readOnly}
          fullWidth
          sx={relationAutocompleteSx}
        />
      </PropertyRow>

      <PropertyRow label="Projects" valueSx={relationControlSx}>
        <Autocomplete
          multiple
          options={projectOptions}
          value={linkedProjects}
          getOptionLabel={(o) => o.name}
          onChange={(_, v) => { void replaceProjectRelations(v); }}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>{option.name}</li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option.id} label={option.name} sx={relationTagSx} />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select projects"
              variant="standard"
              InputProps={{ ...params.InputProps, disableUnderline: true }}
              sx={drawerFieldValueSx}
            />
          )}
          ListboxProps={{ sx: drawerAutocompleteListboxSx }}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          filterSelectedOptions
          disabled={saving || readOnly}
          fullWidth
          sx={relationAutocompleteSx}
        />
      </PropertyRow>

        <SectionTitle>Relevant websites</SectionTitle>
        <Stack spacing={1} sx={relationWideControlSx}>
          {urls.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No URLs linked.
            </Typography>
          )}
          {urls.map((link, index) => {
            const label = String(link.description || '').trim() || link.url;
            const href = normalizeUrl(link.url);
            return (
              <Stack
                key={link.id || `${link.url}:${index}`}
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={(theme) => ({
                  minHeight: 30,
                  px: 1,
                  borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
                  '& .hover-actions': { opacity: 0, transition: 'opacity 120ms' },
                  '&:hover': { bgcolor: theme.palette.kanap.bg.hover },
                  '&:hover .hover-actions': { opacity: 1 },
                })}
              >
                <Typography
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={(theme) => ({
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    color: theme.palette.kanap.text.primary,
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      color: theme.palette.kanap.teal,
                      textDecoration: 'underline',
                    },
                  })}
                  title={link.url}
                >
                  {label}
                </Typography>
                <Box className="hover-actions">
                  <IconButton
                    aria-label="Open URL"
                    size="small"
                    onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
                    disabled={!href}
                  >
                    <OpenInNewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  {!readOnly && (
                    <IconButton
                      aria-label="Delete URL"
                      size="small"
                      onClick={() => {
                        urlsEditedRef.current = true;
                        void syncUrls(urls.filter((_, currentIndex) => currentIndex !== index));
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
              </Stack>
            );
          })}
          {!readOnly && (
            <Box>
              <Button
                variant="action"
                size="small"
                onClick={() => {
                  setLinkDraft({ description: '', url: '' });
                  setLinkDialogOpen(true);
                }}
              >
                Add URL
              </Button>
            </Box>
          )}
        </Stack>

      <SectionTitle>Attachments</SectionTitle>
      <Stack spacing={1} sx={relationWideControlSx}>
        <Box
          onDragOver={(e) => { e.preventDefault(); setHover(true); }}
          onDragLeave={() => setHover(false)}
          onDrop={async (e) => {
            e.preventDefault(); setHover(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length === 0) return;
            setUploading(true); setUploadCount(files.length);
            try {
              for (const f of files) { const fd = new FormData(); fd.append('file', f); await api.post(`/applications/${id}/attachments`, fd); }
              const resAtt = await api.get(`/applications/${id}/attachments`);
              setAttachments(resAtt.data || []);
            } finally { setUploading(false); setUploadCount(0); }
          }}
          sx={{ border: '2px dashed', borderColor: hover ? 'primary.main' : 'divider', borderRadius: 1, p: 2, textAlign: 'center', cursor: 'pointer' }}
        >
          <Typography variant="body2" color="text.secondary">Drag & drop files here, or use the button to select</Typography>
          <Box sx={{ mt: 1 }}>
            <Button component="label" size="small" variant="outlined" disabled={uploading || readOnly}>
              Select files
              <input type="file" hidden multiple onChange={async (e) => {
                const input = e.currentTarget as HTMLInputElement | null;
                const files = Array.from((e.target as HTMLInputElement)?.files || []);
                if (files.length === 0) return;
                setUploading(true); setUploadCount(files.length);
                try {
                  for (const f of files) { const fd = new FormData(); fd.append('file', f); await api.post(`/applications/${id}/attachments`, fd); }
                  const resAtt = await api.get(`/applications/${id}/attachments`);
                  setAttachments(resAtt.data || []);
                } finally { setUploading(false); setUploadCount(0); if (input) input.value = ''; }
              }} />
            </Button>
          </Box>
        </Box>
        {uploading && <LinearProgress sx={{ mt: 1 }} />}
        {uploading && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Uploading {uploadCount} file{uploadCount === 1 ? '' : 's'}…
          </Typography>
        )}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {attachments.map((a) => {
            const canDelete = hasLevel('applications','manager') && !readOnly;
            const onDelete = async () => {
              if (!canDelete) return;
              const ok = window.confirm(`Delete attachment \"${a.original_filename}\"?`);
              if (!ok) return;
              try { await api.patch(`/applications/attachments/${a.id}/delete`, {}); const res = await api.get(`/applications/${id}/attachments`); setAttachments(res.data || []); } catch {}
            };
            return (
              <Chip
                key={a.id}
                label={a.original_filename}
                onClick={async () => {
                  const res = await api.get(`/applications/attachments/${a.id}`, { responseType: 'blob' });
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

      <KanapDialog
        open={linkDialogOpen}
        title="New URL"
        onClose={() => setLinkDialogOpen(false)}
        onSave={addLink}
        saveLabel="Add"
        saveDisabled={!String(linkDraft.url || '').trim()}
        saveLoading={saving}
      >
        <Stack spacing={1.25}>
          <PropertyRow label="Label">
            <TextField
              value={linkDraft.description}
              onChange={(event) => setLinkDraft((prev) => ({ ...prev, description: event.target.value }))}
              variant="standard"
              fullWidth
              InputProps={{ disableUnderline: true }}
              sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
            />
          </PropertyRow>
          <PropertyRow label="URL" required>
            <TextField
              value={linkDraft.url}
              onChange={(event) => setLinkDraft((prev) => ({ ...prev, url: event.target.value }))}
              variant="standard"
              fullWidth
              InputProps={{ disableUnderline: true }}
              sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
            />
          </PropertyRow>
        </Stack>
      </KanapDialog>
    </>
  );
});
