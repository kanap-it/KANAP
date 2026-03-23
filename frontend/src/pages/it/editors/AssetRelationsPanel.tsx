import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';

import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
export type AssetRelationsPanelHandle = {
  save: () => Promise<void>;
  reset: () => void;
  isDirty: () => boolean;
};

type AssetOption = { id: string; name: string; kind: string; environment: string };

type OutgoingRelation = {
  id: string;
  related_asset_id: string;
  relation_type: 'contains' | 'depends_on';
  notes: string | null;
  related_name: string;
};

type IncomingRelation = {
  id: string;
  asset_id: string;
  relation_type: 'contains' | 'depends_on';
  notes: string | null;
  source_name: string;
};

type Props = {
  assetId: string;
  onDirtyChange?: (dirty: boolean) => void;
};

export default forwardRef<AssetRelationsPanelHandle, Props>(function AssetRelationsPanel(
  { assetId, onDirtyChange },
  ref
) {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel } = useAuth();
  const readOnly = !hasLevel('infrastructure', 'member');

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Asset relations (contains/depends_on)
  const [containsAssets, setContainsAssets] = React.useState<AssetOption[]>([]);
  const [baselineContains, setBaselineContains] = React.useState<AssetOption[]>([]);
  const [dependsOnAssets, setDependsOnAssets] = React.useState<AssetOption[]>([]);
  const [baselineDependsOn, setBaselineDependsOn] = React.useState<AssetOption[]>([]);
  const [containedBy, setContainedBy] = React.useState<Array<{ id: string; name: string }>>([]);
  const [dependedOnBy, setDependedOnBy] = React.useState<Array<{ id: string; name: string }>>([]);

  // Asset search for autocomplete
  const [assetOptions, setAssetOptions] = React.useState<AssetOption[]>([]);
  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [assetSearch, setAssetSearch] = React.useState('');

  // Financial links
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

  // URLs
  const [urls, setUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);
  const [baselineUrls, setBaselineUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);
  const urlsEditedRef = React.useRef(false);

  // Attachments
  const [attachments, setAttachments] = React.useState<Array<{ id: string; original_filename: string }>>([]);
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadCount, setUploadCount] = React.useState(0);

  // Dirty tracking
  const dirty = React.useMemo(() => {
    const containsIds = containsAssets.map((a) => a.id).sort().join(',');
    const baselineContainsIds = baselineContains.map((a) => a.id).sort().join(',');
    const dependsOnIds = dependsOnAssets.map((a) => a.id).sort().join(',');
    const baselineDependsOnIds = baselineDependsOn.map((a) => a.id).sort().join(',');
    const a = containsIds !== baselineContainsIds || dependsOnIds !== baselineDependsOnIds;
    const b = JSON.stringify(linkedOpex.map((x) => x.id)) !== JSON.stringify(baselineOpex.map((x) => x.id));
    const c = JSON.stringify(linkedCapex.map((x) => x.id)) !== JSON.stringify(baselineCapex.map((x) => x.id));
    const d = JSON.stringify(linkedContracts.map((x) => x.id)) !== JSON.stringify(baselineContracts.map((x) => x.id));
    const e = JSON.stringify(linkedProjects.map((x) => x.id)) !== JSON.stringify(baselineProjects.map((x) => x.id));
    const f = JSON.stringify(urls) !== JSON.stringify(baselineUrls);
    return a || b || c || d || e || f;
  }, [containsAssets, baselineContains, dependsOnAssets, baselineDependsOn, linkedOpex, baselineOpex, linkedCapex, baselineCapex, linkedContracts, baselineContracts, linkedProjects, baselineProjects, urls, baselineUrls]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Combine current selections with search options for autocomplete
  const allContainsOptions = React.useMemo(() => {
    const byId = new Map(assetOptions.map((o) => [o.id, o]));
    for (const a of containsAssets) {
      if (!byId.has(a.id)) byId.set(a.id, a);
    }
    return Array.from(byId.values());
  }, [assetOptions, containsAssets]);

  const allDependsOnOptions = React.useMemo(() => {
    const byId = new Map(assetOptions.map((o) => [o.id, o]));
    for (const a of dependsOnAssets) {
      if (!byId.has(a.id)) byId.set(a.id, a);
    }
    return Array.from(byId.values());
  }, [assetOptions, dependsOnAssets]);

  // Load data
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Asset relations
      try {
        const res = await api.get(`/assets/${assetId}/relations`);
        const outgoing = (res.data?.outgoing || []) as OutgoingRelation[];
        const incoming = (res.data?.incoming || []) as IncomingRelation[];

        const contains: AssetOption[] = [];
        const dependsOn: AssetOption[] = [];
        for (const rel of outgoing) {
          const opt = { id: rel.related_asset_id, name: rel.related_name, kind: '', environment: '' };
          if (rel.relation_type === 'contains') contains.push(opt);
          else if (rel.relation_type === 'depends_on') dependsOn.push(opt);
        }
        setContainsAssets(contains);
        setBaselineContains(contains);
        setDependsOnAssets(dependsOn);
        setBaselineDependsOn(dependsOn);

        const containedByList: Array<{ id: string; name: string }> = [];
        const dependedOnByList: Array<{ id: string; name: string }> = [];
        for (const rel of incoming) {
          if (rel.relation_type === 'contains') containedByList.push({ id: rel.asset_id, name: rel.source_name });
          else if (rel.relation_type === 'depends_on') dependedOnByList.push({ id: rel.asset_id, name: rel.source_name });
        }
        setContainedBy(containedByList);
        setDependedOnBy(dependedOnByList);
      } catch { /* ignore */ }

      // OPEX items
      try {
        const res = await api.get(`/assets/${assetId}/spend-items`);
        const items = (res.data?.items || []) as Array<{ id: string; product_name: string }>;
        setLinkedOpex(items);
        setBaselineOpex(items);
      } catch { setLinkedOpex([]); setBaselineOpex([]); }

      // CAPEX items
      try {
        const res = await api.get(`/assets/${assetId}/capex-items`);
        const items = (res.data?.items || []) as Array<{ id: string; description: string }>;
        setLinkedCapex(items);
        setBaselineCapex(items);
      } catch { setLinkedCapex([]); setBaselineCapex([]); }

      // Contracts
      try {
        const res = await api.get(`/assets/${assetId}/contracts`);
        const items = (res.data?.items || []) as Array<{ id: string; name: string }>;
        setLinkedContracts(items);
        setBaselineContracts(items);
      } catch { setLinkedContracts([]); setBaselineContracts([]); }

      // Projects
      try {
        const res = await api.get(`/assets/${assetId}/projects`);
        const items = (res.data?.items || []) as Array<{ id: string; name: string }>;
        setLinkedProjects(items);
        setBaselineProjects(items);
      } catch { setLinkedProjects([]); setBaselineProjects([]); }

      // URLs
      try {
        const res = await api.get(`/assets/${assetId}/links`);
        const urlItems = (res.data || []).map((x: any) => ({ id: x.id, description: x.description, url: x.url }));
        setBaselineUrls(urlItems);
        if (!urlsEditedRef.current) setUrls(urlItems);
      } catch { if (!urlsEditedRef.current) setUrls([]); setBaselineUrls([]); }

      // Attachments
      try {
        const res = await api.get(`/assets/${assetId}/attachments`);
        setAttachments(res.data || []);
      } catch { setAttachments([]); }
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.loadRelationsFailed')));
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Load dropdown options
  React.useEffect(() => {
    let alive = true;
    const fetchAllPaged = async (endpoint: string, sortField: string) => {
      const all: any[] = [];
      let page = 1;
      const limit = 100;
      let total = Infinity;
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
        const dedupById = <T extends { id: string }>(arr: T[]) =>
          Array.from(new Map(arr.map((i) => [i.id, i])).values());
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
        setOpexOptions([]);
        setCapexOptions([]);
        setContractOptions([]);
        setProjectOptions([]);
      }
    })();
    return () => { alive = false; };
  }, [assetId]);

  // Asset search for contains/depends_on
  React.useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      if (!assetSearch || assetSearch.length < 2) {
        setAssetOptions([]);
        return;
      }
      setOptionsLoading(true);
      try {
        const res = await api.get('/assets', { params: { q: assetSearch, limit: 50, sort: 'name:ASC' } });
        if (!alive) return;
        const items = (res.data?.items || [])
          .filter((a: any) => a.id !== assetId)
          .map((a: any) => ({ id: a.id, name: a.name, kind: a.kind || '', environment: a.environment || '' }));
        setAssetOptions(items);
      } catch {
        if (!alive) return;
        setAssetOptions([]);
      } finally {
        setOptionsLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [assetSearch, assetId]);

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      // Save asset relations
      const relations = [
        ...containsAssets.map((a) => ({ related_asset_id: a.id, relation_type: 'contains' })),
        ...dependsOnAssets.map((a) => ({ related_asset_id: a.id, relation_type: 'depends_on' })),
      ];
      await api.post(`/assets/${assetId}/relations`, { relations });
      setBaselineContains(containsAssets);
      setBaselineDependsOn(dependsOnAssets);

      // Save OPEX
      await api.post(`/assets/${assetId}/spend-items`, { spend_item_ids: linkedOpex.map((x) => x.id) });
      setBaselineOpex(linkedOpex);

      // Save CAPEX
      await api.post(`/assets/${assetId}/capex-items`, { capex_item_ids: linkedCapex.map((x) => x.id) });
      setBaselineCapex(linkedCapex);

      // Save Contracts
      await api.post(`/assets/${assetId}/contracts`, { contract_ids: linkedContracts.map((x) => x.id) });
      setBaselineContracts(linkedContracts);

      // Save Projects
      await api.post(`/assets/${assetId}/projects/bulk-replace`, { project_ids: linkedProjects.map((x) => x.id) });
      setBaselineProjects(linkedProjects);

      // Save URLs
      const existing = baselineUrls;
      const existingIds = new Set(existing.filter((x) => x.id).map((x) => x.id as string));
      const currentIds = new Set(urls.filter((x) => x.id).map((x) => x.id as string));
      for (const ex of existing) {
        if (ex.id && !currentIds.has(ex.id)) await api.delete(`/assets/${assetId}/links/${ex.id}`);
      }
      for (const u of urls) {
        if (!u.url) continue;
        if (u.id && existingIds.has(u.id)) {
          await api.patch(`/assets/${assetId}/links/${u.id}`, { description: u.description ?? null, url: u.url });
        } else {
          await api.post(`/assets/${assetId}/links`, { description: u.description ?? null, url: u.url });
        }
      }
      setBaselineUrls(urls);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveRelationsFailed')));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    urlsEditedRef.current = false;
    void load();
  };

  useImperativeHandle(ref, () => ({ save, reset, isDirty: () => dirty }), [save, dirty]);

  if (loading) {
    return <Alert severity="info">Loading relations...</Alert>;
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Dependencies section */}
      <Typography variant="subtitle2">Depends on (this asset depends on...)</Typography>
      <Autocomplete
        multiple
        options={allDependsOnOptions}
        value={dependsOnAssets}
        getOptionLabel={(o) => o.name}
        onChange={(_, v) => setDependsOnAssets(v as AssetOption[])}
        inputValue={assetSearch}
        onInputChange={(_, v) => setAssetSearch(v)}
        loading={optionsLoading}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <div>
              <div style={{ fontWeight: 600 }}>{option.name}</div>
              {(option.kind || option.environment) && (
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  {[option.kind, option.environment?.toUpperCase()].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </li>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => <Chip {...getTagProps({ index })} key={option.id} label={option.name} />)
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Dependencies"
            placeholder="Search assets to add"
            helperText="e.g., database servers this app server depends on"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {optionsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        filterSelectedOptions
        disabled={saving || readOnly}
        fullWidth
      />

      <Typography variant="subtitle2">Contains (this asset contains...)</Typography>
      <Autocomplete
        multiple
        options={allContainsOptions}
        value={containsAssets}
        getOptionLabel={(o) => o.name}
        onChange={(_, v) => setContainsAssets(v as AssetOption[])}
        inputValue={assetSearch}
        onInputChange={(_, v) => setAssetSearch(v)}
        loading={optionsLoading}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <div>
              <div style={{ fontWeight: 600 }}>{option.name}</div>
              {(option.kind || option.environment) && (
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  {[option.kind, option.environment?.toUpperCase()].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </li>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => <Chip {...getTagProps({ index })} key={option.id} label={option.name} />)
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Contained assets"
            placeholder="Search assets to add"
            helperText="e.g., servers contained in a rack"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {optionsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        filterSelectedOptions
        disabled={saving || readOnly}
        fullWidth
      />

      {/* Reverse relations (read-only) */}
      {containedBy.length > 0 && (
        <>
          <Typography variant="subtitle2">Contained by</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {containedBy.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => window.open(`/it/assets/${r.id}/relations`, '_self')}>
                    <TableCell>{r.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {dependedOnBy.length > 0 && (
        <>
          <Typography variant="subtitle2">Depended on by</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dependedOnBy.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => window.open(`/it/assets/${r.id}/relations`, '_self')}>
                    <TableCell>{r.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Financial relations */}
      <Typography variant="subtitle2">Financials</Typography>
      <Autocomplete
        multiple
        options={opexOptions}
        value={linkedOpex}
        getOptionLabel={(o) => o.product_name}
        onChange={(_, v) => setLinkedOpex(v as any)}
        renderOption={(props, option) => <li {...props} key={option.id}>{option.product_name}</li>}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => <Chip {...getTagProps({ index })} key={option.id} label={option.product_name} />)
        }
        renderInput={(params) => (
          <TextField {...params} label="OPEX items" placeholder="Select OPEX items" InputLabelProps={{ shrink: true }} />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === (val as any).id}
        filterSelectedOptions
        disabled={saving || readOnly}
        fullWidth
      />

      <Autocomplete
        multiple
        options={capexOptions}
        value={linkedCapex}
        getOptionLabel={(o) => o.description}
        onChange={(_, v) => setLinkedCapex(v as any)}
        renderOption={(props, option) => <li {...props} key={option.id}>{option.description}</li>}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => <Chip {...getTagProps({ index })} key={option.id} label={option.description} />)
        }
        renderInput={(params) => (
          <TextField {...params} label="CAPEX items" placeholder="Select CAPEX items" InputLabelProps={{ shrink: true }} />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === (val as any).id}
        filterSelectedOptions
        disabled={saving || readOnly}
        fullWidth
      />

      <Autocomplete
        multiple
        options={contractOptions}
        value={linkedContracts}
        getOptionLabel={(o) => o.name}
        onChange={(_, v) => setLinkedContracts(v as any)}
        renderOption={(props, option) => <li {...props} key={option.id}>{option.name}</li>}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => <Chip {...getTagProps({ index })} key={option.id} label={option.name} />)
        }
        renderInput={(params) => (
          <TextField {...params} label="Contracts" placeholder="Select contracts" InputLabelProps={{ shrink: true }} />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === (val as any).id}
        filterSelectedOptions
        disabled={saving || readOnly}
        fullWidth
      />

      {/* Projects */}
      <Typography variant="subtitle2">Projects</Typography>
      <Autocomplete
        multiple
        options={projectOptions}
        value={linkedProjects}
        getOptionLabel={(o) => o.name}
        onChange={(_, v) => setLinkedProjects(v as any)}
        renderOption={(props, option) => <li {...props} key={option.id}>{option.name}</li>}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => <Chip {...getTagProps({ index })} key={option.id} label={option.name} />)
        }
        renderInput={(params) => (
          <TextField {...params} label="Projects" placeholder="Select projects" InputLabelProps={{ shrink: true }} />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === (val as any).id}
        filterSelectedOptions
        disabled={saving || readOnly}
        fullWidth
      />

      {/* URLs */}
      <Typography variant="subtitle2">Relevant websites</Typography>
      <Stack spacing={1}>
        {urls.map((l, idx) => (
          <Stack key={l.id || idx} direction="row" spacing={1} alignItems="center">
            <TextField
              label="Description"
              value={l.description || ''}
              onChange={(e) => { urlsEditedRef.current = true; setUrls((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))); }}
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={readOnly}
            />
            <TextField
              label="URL"
              value={l.url}
              onChange={(e) => { urlsEditedRef.current = true; setUrls((prev) => prev.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x))); }}
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{
                readOnly: readOnly,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const raw = String(l.url || '').trim();
                        if (!raw) return;
                        const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                        window.open(href, '_blank', 'noopener,noreferrer');
                      }}
                      disabled={!String(l.url || '').trim()}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {!readOnly && (
              <IconButton onClick={() => { urlsEditedRef.current = true; setUrls((prev) => prev.filter((_, i) => i !== idx)); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ))}
        {!readOnly && (
          <Button size="small" onClick={() => { urlsEditedRef.current = true; setUrls((prev) => [...prev, { url: '' }]); }}>
            Add URL
          </Button>
        )}
      </Stack>

      {/* Attachments */}
      <Typography variant="subtitle2">Attachments</Typography>
      <Stack spacing={1}>
        <Box
          onDragOver={(e) => { e.preventDefault(); setHover(true); }}
          onDragLeave={() => setHover(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setHover(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length === 0) return;
            setUploading(true);
            setUploadCount(files.length);
            try {
              for (const f of files) {
                const fd = new FormData();
                fd.append('file', f);
                await api.post(`/assets/${assetId}/attachments`, fd);
              }
              const res = await api.get(`/assets/${assetId}/attachments`);
              setAttachments(res.data || []);
            } finally {
              setUploading(false);
              setUploadCount(0);
            }
          }}
          sx={{ border: '2px dashed', borderColor: hover ? 'primary.main' : 'divider', borderRadius: 1, p: 2, textAlign: 'center', cursor: 'pointer' }}
        >
          <Typography variant="body2" color="text.secondary">Drag & drop files here, or use the button to select</Typography>
          <Box sx={{ mt: 1 }}>
            <Button
              component="label"
              size="small"
              variant="outlined"
              disabled={uploading || readOnly}
            >
              Select files
              <input
                type="file"
                hidden
                multiple
                onChange={async (e) => {
                  const input = e.currentTarget as HTMLInputElement | null;
                  const files = Array.from((e.target as HTMLInputElement)?.files || []);
                  if (files.length === 0) return;
                  setUploading(true);
                  setUploadCount(files.length);
                  try {
                    for (const f of files) {
                      const fd = new FormData();
                      fd.append('file', f);
                      await api.post(`/assets/${assetId}/attachments`, fd);
                    }
                    const res = await api.get(`/assets/${assetId}/attachments`);
                    setAttachments(res.data || []);
                  } finally {
                    setUploading(false);
                    setUploadCount(0);
                    if (input) input.value = '';
                  }
                }}
              />
            </Button>
          </Box>
        </Box>
        {uploading && <LinearProgress sx={{ mt: 1 }} />}
        {uploading && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Uploading {uploadCount} file{uploadCount === 1 ? '' : 's'}...
          </Typography>
        )}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {attachments.map((a) => {
            const canDelete = hasLevel('infrastructure', 'member') && !readOnly;
            const onDelete = async () => {
              if (!canDelete) return;
              const ok = window.confirm(`Delete attachment "${a.original_filename}"?`);
              if (!ok) return;
              try {
                await api.patch(`/assets/attachments/${a.id}/delete`, {});
                const res = await api.get(`/assets/${assetId}/attachments`);
                setAttachments(res.data || []);
              } catch { /* ignore */ }
            };
            return (
              <Chip
                key={a.id}
                label={a.original_filename}
                onClick={async () => {
                  const res = await api.get(`/assets/attachments/${a.id}`, { responseType: 'blob' });
                  const blob = new Blob([res.data]);
                  const url = window.URL.createObjectURL(blob);
                  const el = document.createElement('a');
                  el.href = url;
                  el.download = a.original_filename;
                  el.click();
                  window.URL.revokeObjectURL(url);
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
