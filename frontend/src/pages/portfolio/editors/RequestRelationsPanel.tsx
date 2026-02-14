import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, IconButton, LinearProgress,
  Stack, TextField, Typography, InputAdornment,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';

export type RequestRelationsPanelHandle = {
  save: () => Promise<void>;
  reset: () => void;
  isDirty: () => boolean;
};

type Props = {
  id: string;
  onDirtyChange?: (dirty: boolean) => void;
};

export default forwardRef<RequestRelationsPanelHandle, Props>(function RequestRelationsPanel({ id, onDirtyChange }, ref) {
  const { hasLevel } = useAuth();
  const readOnly = !hasLevel('portfolio_requests', 'manager');

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // OPEX items
  const [linkedOpex, setLinkedOpex] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [baselineOpex, setBaselineOpex] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [opexOptions, setOpexOptions] = React.useState<Array<{ id: string; product_name: string }>>([]);

  // CAPEX items
  const [linkedCapex, setLinkedCapex] = React.useState<Array<{ id: string; description: string }>>([]);
  const [baselineCapex, setBaselineCapex] = React.useState<Array<{ id: string; description: string }>>([]);
  const [capexOptions, setCapexOptions] = React.useState<Array<{ id: string; description: string }>>([]);

  // URLs
  const [urls, setUrls] = React.useState<Array<{ id?: string; label?: string; url: string }>>([]);
  const [baselineUrls, setBaselineUrls] = React.useState<Array<{ id?: string; label?: string; url: string }>>([]);
  const urlsEditedRef = React.useRef(false);

  // Attachments
  const [attachments, setAttachments] = React.useState<Array<{ id: string; original_filename: string }>>([]);
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadCount, setUploadCount] = React.useState(0);

  const dirty = React.useMemo(() => {
    const a = JSON.stringify(linkedOpex.map(x => x.id)) !== JSON.stringify(baselineOpex.map(x => x.id));
    const b = JSON.stringify(linkedCapex.map(x => x.id)) !== JSON.stringify(baselineCapex.map(x => x.id));
    const c = JSON.stringify(urls) !== JSON.stringify(baselineUrls);
    return a || b || c;
  }, [linkedOpex, baselineOpex, linkedCapex, baselineCapex, urls, baselineUrls]);

  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load linked OPEX items
      try {
        const res = await api.get(`/portfolio/requests/${id}`, { params: { include: 'opex' } });
        const items = (res.data?.opex_items || []).map((x: any) => ({ id: x.id, product_name: x.product_name }));
        setLinkedOpex(items);
        setBaselineOpex(items);
      } catch {
        setLinkedOpex([]);
        setBaselineOpex([]);
      }

      // Load linked CAPEX items
      try {
        const res = await api.get(`/portfolio/requests/${id}`, { params: { include: 'capex' } });
        const items = (res.data?.capex_items || []).map((x: any) => ({ id: x.id, description: x.description }));
        setLinkedCapex(items);
        setBaselineCapex(items);
      } catch {
        setLinkedCapex([]);
        setBaselineCapex([]);
      }

      // Load URLs
      try {
        const res = await api.get(`/portfolio/requests/${id}`, { params: { include: 'urls' } });
        const urlItems = (res.data?.urls || []).map((x: any) => ({ id: x.id, label: x.label, url: x.url }));
        setBaselineUrls(urlItems);
        if (!urlsEditedRef.current) setUrls(urlItems);
      } catch {
        if (!urlsEditedRef.current) setUrls([]);
        setBaselineUrls([]);
      }

      // Load Attachments
      try {
        const res = await api.get(`/portfolio/requests/${id}`, { params: { include: 'attachments' } });
        setAttachments(res.data?.attachments || []);
      } catch {
        setAttachments([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load relations');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  // Preload all selectable options
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
        const [allSpend, allCapex] = await Promise.all([
          fetchAllPaged('/spend-items', 'product_name'),
          fetchAllPaged('/capex-items', 'description'),
        ]);
        if (!alive) return;
        const dedupById = <T extends { id: string }>(arr: T[]) =>
          Array.from(new Map(arr.map(i => [i.id, i])).values());
        const opex = dedupById(allSpend.map((x: any) => ({ id: x.id, product_name: x.product_name })));
        const capex = dedupById(allCapex.map((x: any) => ({ id: x.id, description: x.description })));
        setOpexOptions(opex.sort((a, b) => a.product_name.localeCompare(b.product_name)));
        setCapexOptions(capex.sort((a, b) => a.description.localeCompare(b.description)));
      } catch {
        if (!alive) return;
        setOpexOptions([]);
        setCapexOptions([]);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      // Save OPEX
      await api.post(`/portfolio/requests/${id}/opex/bulk-replace`, {
        opex_ids: linkedOpex.map(x => x.id),
      });
      setBaselineOpex(linkedOpex);

      // Save CAPEX
      await api.post(`/portfolio/requests/${id}/capex/bulk-replace`, {
        capex_ids: linkedCapex.map(x => x.id),
      });
      setBaselineCapex(linkedCapex);

      // Save URLs
      const existing = baselineUrls;
      const existingIds = new Set(existing.filter(x => x.id).map(x => x.id as string));
      const currentIds = new Set(urls.filter(x => x.id).map(x => x.id as string));
      // Delete removed URLs
      for (const ex of existing) {
        if (ex.id && !currentIds.has(ex.id)) {
          await api.delete(`/portfolio/requests/${id}/urls/${ex.id}`);
        }
      }
      // Add or update URLs
      for (const u of urls) {
        if (!u.url) continue;
        if (u.id && existingIds.has(u.id)) {
          await api.patch(`/portfolio/requests/${id}/urls/${u.id}`, { label: u.label ?? null, url: u.url });
        } else {
          await api.post(`/portfolio/requests/${id}/urls`, { label: u.label ?? null, url: u.url });
        }
      }
      setBaselineUrls(urls);
      urlsEditedRef.current = false;
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save relations');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save,
    reset: () => {
      urlsEditedRef.current = false;
      void load();
    },
    isDirty: () => dirty,
  }), [save, load, dirty]);

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Stack spacing={3}>
      {!!error && <Alert severity="error">{error}</Alert>}

      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Budget Items</Typography>

      <Autocomplete
        multiple
        options={opexOptions}
        value={linkedOpex}
        getOptionLabel={(o) => o.product_name}
        onChange={(_, v) => setLinkedOpex(v as any)}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>{option.product_name}</li>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip {...getTagProps({ index })} key={option.id} label={option.product_name} size="small" />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="OPEX Items"
            placeholder="Select OPEX items"
          />
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
        renderOption={(props, option) => (
          <li {...props} key={option.id}>{option.description}</li>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip {...getTagProps({ index })} key={option.id} label={option.description} size="small" />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="CAPEX Items"
            placeholder="Select CAPEX items"
          />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === (val as any).id}
        filterSelectedOptions
        disabled={saving || readOnly}
        fullWidth
      />

      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Related URLs</Typography>
      <Stack spacing={1}>
        {urls.map((l, idx) => (
          <Stack key={l.id || idx} direction="row" spacing={1} alignItems="center">
            <TextField
              label="Label"
              value={l.label || ''}
              onChange={(e) => {
                urlsEditedRef.current = true;
                setUrls(prev => prev.map((x, i) => i === idx ? { ...x, label: e.target.value } : x));
              }}
              sx={{ flex: 1 }}
              disabled={readOnly}
            />
            <TextField
              label="URL"
              value={l.url}
              onChange={(e) => {
                urlsEditedRef.current = true;
                setUrls(prev => prev.map((x, i) => i === idx ? { ...x, url: e.target.value } : x));
              }}
              sx={{ flex: 2 }}
              disabled={readOnly}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="open-link"
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
              <IconButton
                aria-label="delete"
                onClick={() => {
                  urlsEditedRef.current = true;
                  setUrls(prev => prev.filter((_, i) => i !== idx));
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ))}
        {!readOnly && (
          <Button
            size="small"
            onClick={() => {
              urlsEditedRef.current = true;
              setUrls(prev => [...prev, { url: '' }]);
            }}
          >
            Add URL
          </Button>
        )}
      </Stack>

      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Attachments</Typography>
      <Stack spacing={1}>
        <Box
          onDragOver={(e) => { e.preventDefault(); setHover(true); }}
          onDragLeave={() => setHover(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setHover(false);
            if (readOnly) return;
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length === 0) return;
            setUploading(true);
            setUploadCount(files.length);
            try {
              for (const f of files) {
                const fd = new FormData();
                fd.append('file', f);
                await api.post(`/portfolio/requests/${id}/attachments`, fd);
              }
              const res = await api.get(`/portfolio/requests/${id}`, { params: { include: 'attachments' } });
              setAttachments(res.data?.attachments || []);
            } finally {
              setUploading(false);
              setUploadCount(0);
            }
          }}
          sx={{
            border: '2px dashed',
            borderColor: hover ? 'primary.main' : 'divider',
            borderRadius: 1,
            p: 2,
            textAlign: 'center',
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Drag & drop files here, or use the button to select
          </Typography>
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
                      await api.post(`/portfolio/requests/${id}/attachments`, fd);
                    }
                    const res = await api.get(`/portfolio/requests/${id}`, { params: { include: 'attachments' } });
                    setAttachments(res.data?.attachments || []);
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
            const canDelete = hasLevel('portfolio_requests', 'manager') && !readOnly;
            const onDelete = async () => {
              if (!canDelete) return;
              const ok = window.confirm(`Delete attachment "${a.original_filename}"?`);
              if (!ok) return;
              try {
                await api.delete(`/portfolio/requests/${id}/attachments/${a.id}`);
                const res = await api.get(`/portfolio/requests/${id}`, { params: { include: 'attachments' } });
                setAttachments(res.data?.attachments || []);
              } catch {}
            };
            return (
              <Chip
                key={a.id}
                label={a.original_filename}
                onClick={async () => {
                  const res = await api.get(`/portfolio/requests/attachments/${a.id}`, { responseType: 'blob' });
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
