import React, { forwardRef, useImperativeHandle } from 'react';
import { Alert, Autocomplete, Box, Button, CircularProgress, Stack, TextField, Typography, IconButton, Chip, LinearProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import api from '../../../api';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../../auth/AuthContext';
import ItemContactsSection from '../../../components/contacts/ItemContactsSection';

export type ContractRelationsEditorHandle = {
  save: () => Promise<void>;
  reset: () => void;
};

type Props = {
  id: string;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export default forwardRef<ContractRelationsEditorHandle, Props>(function ContractRelationsEditor({ id, readOnly, onDirtyChange }, ref) {
  const { t } = useTranslation(['ops', 'common']);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { hasLevel } = useAuth();

  const [linkedOpex, setLinkedOpex] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [baselineLinkedOpex, setBaselineLinkedOpex] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [opexOptions, setOpexOptions] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [loadingOpex, setLoadingOpex] = React.useState(false);

  const [urls, setUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);
  const [baselineUrls, setBaselineUrls] = React.useState<Array<{ id?: string; description?: string; url: string }>>([]);

  const [attachments, setAttachments] = React.useState<Array<{ id: string; original_filename: string; stored_filename: string }>>([]);
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadCount, setUploadCount] = React.useState(0);


  const [linkedCapex, setLinkedCapex] = React.useState<Array<{ id: string; description: string }>>([]);
  const [baselineLinkedCapex, setBaselineLinkedCapex] = React.useState<Array<{ id: string; description: string }>>([]);
  const [capexOptions, setCapexOptions] = React.useState<Array<{ id: string; description: string }>>([]);
  const [loadingCapex, setLoadingCapex] = React.useState(false);

  const dirty = React.useMemo(() => {
    const a = JSON.stringify(linkedOpex.map(x => x.id)) !== JSON.stringify(baselineLinkedOpex.map(x => x.id));
    const a2 = JSON.stringify(linkedCapex.map(x => x.id)) !== JSON.stringify(baselineLinkedCapex.map(x => x.id));
    const b = JSON.stringify(urls) !== JSON.stringify(baselineUrls);
    return a || a2 || b;
  }, [linkedOpex, baselineLinkedOpex, linkedCapex, baselineLinkedCapex, urls, baselineUrls]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/contracts/${id}`);
      const d = res.data;
      setAttachments(d.attachments || []);
      setUrls((d.links || []).map((x: any) => ({ id: x.id, description: x.description, url: x.url })));
      setBaselineUrls((d.links || []).map((x: any) => ({ id: x.id, description: x.description, url: x.url })));
      setLinkedOpex((d.linked_spend_items || []).map((x: any) => ({ id: x.id, product_name: x.product_name })));
      setBaselineLinkedOpex((d.linked_spend_items || []).map((x: any) => ({ id: x.id, product_name: x.product_name })));
      try {
        const resCapex = await api.get(`/contracts/${id}/capex-items`);
        const items = (resCapex.data?.items || []).map((x: any) => ({ id: x.id, description: x.description }));
        setLinkedCapex(items);
        setBaselineLinkedCapex(items);
      } catch {}
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('contracts.relations.failedToLoad')));
      setLinkedOpex([]); setBaselineLinkedOpex([]); setUrls([]); setBaselineUrls([]);
    } finally { setLoading(false); }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  // Preload OPEX and CAPEX options so dropdowns are not empty
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingOpex(true);
      setLoadingCapex(true);
      try {
        // OPEX
        const allOpex: Array<{ id: string; product_name: string }> = [];
        let pageO = 1; const limit = 100; let totalO = Infinity;
        while ((pageO - 1) * limit < totalO) {
          const res = await api.get(`/spend-items`, { params: { page: pageO, limit, sort: 'product_name:ASC' } });
          const items = (res.data?.items || []).map((x: any) => ({ id: x.id, product_name: x.product_name }));
          totalO = Number(res.data?.total || items.length);
          allOpex.push(...items);
          if (items.length < limit) break;
          pageO += 1;
        }
        if (alive) setOpexOptions(allOpex);
      } catch { if (alive) setOpexOptions([]); }
      finally { if (alive) setLoadingOpex(false); }

      try {
        // CAPEX
        const allCapex: Array<{ id: string; description: string }> = [];
        let pageC = 1; const limit = 100; let totalC = Infinity;
        while ((pageC - 1) * limit < totalC) {
          const res = await api.get(`/capex-items`, { params: { page: pageC, limit, sort: 'description:ASC' } });
          const items = (res.data?.items || []).map((x: any) => ({ id: x.id, description: x.description }));
          totalC = Number(res.data?.total || items.length);
          allCapex.push(...items);
          if (items.length < limit) break;
          pageC += 1;
        }
        if (alive) setCapexOptions(allCapex);
      } catch { if (alive) setCapexOptions([]); }
      finally { if (alive) setLoadingCapex(false); }
    })();
    return () => { alive = false; };
  }, []);

  const loadAttachments = React.useCallback(async () => {
    try {
      const res = await api.get(`/contracts/${id}/attachments`);
      setAttachments(res.data || []);
    } catch {
      // ignore attachment refresh errors here
    }
  }, [id]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true); setError(null);
    try {
      // Save linked OPEX
      await api.post(`/contracts/${id}/spend-items/bulk-replace`, { spend_item_ids: linkedOpex.map(x => x.id) });
      setBaselineLinkedOpex(linkedOpex);

      // Save linked CAPEX
      await api.post(`/contracts/${id}/capex-items/bulk-replace`, { capex_item_ids: linkedCapex.map(x => x.id) });
      setBaselineLinkedCapex(linkedCapex);

      // Save URLs (sync by upserting and deleting missing)
      const existing = baselineUrls;
      const existingIds = new Set(existing.filter(x => x.id).map(x => x.id as string));
      const currentIds = new Set(urls.filter(x => x.id).map(x => x.id as string));
      // Delete removed
      for (const ex of existing) {
        if (ex.id && !currentIds.has(ex.id)) await api.delete(`/contracts/${id}/links/${ex.id}`);
      }
      // Upsert current
      for (const u of urls) {
        if (u.id) await api.patch(`/contracts/${id}/links/${u.id}`, { description: u.description, url: u.url });
        else await api.post(`/contracts/${id}/links`, { description: u.description, url: u.url });
      }
      setBaselineUrls(urls);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('contracts.relations.failedToSave')));
      throw e;
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ save, reset: () => { void load(); } }), [save, load]);

  return (
    <Stack spacing={2}>
      {!!error && <Alert severity="error">{error}</Alert>}

      <Typography variant="subtitle2">{t('contracts.relations.linkedOpex')}</Typography>
      <Autocomplete
        multiple
        options={opexOptions}
        value={linkedOpex}
        getOptionLabel={(option) => option.product_name}
        onChange={(_, newValue) => setLinkedOpex(newValue as any)}
        onOpen={async () => {
          if (opexOptions.length === 0 && !loadingOpex) {
            try {
              const res = await api.get(`/spend-items`, { params: { page: 1, limit: 100, sort: 'product_name:ASC' } });
              const items = (res.data?.items || []).map((x: any) => ({ id: x.id, product_name: x.product_name }));
              setOpexOptions(items);
            } catch { setOpexOptions([]); }
          }
        }}
        onInputChange={async (_, newInputValue) => {
          setLoadingOpex(true);
          try {
            const params: any = { limit: 50 };
            if (newInputValue && newInputValue.length >= 1) params.q = newInputValue;
            const res = await api.get(`/spend-items`, { params });
            const items = (res.data?.items || []).map((x: any) => ({ id: x.id, product_name: x.product_name }));
            setOpexOptions(items);
          } catch {
            setOpexOptions([]);
          } finally {
            setLoadingOpex(false);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('contracts.relations.opexItems')}
            placeholder={t('contracts.relations.selectOpexItems')}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingOpex ? <CircularProgress color="inherit" size={18} /> : null}
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

      <Typography variant="subtitle2">{t('contracts.relations.linkedCapex')}</Typography>
      <Autocomplete
        multiple
        options={capexOptions}
        value={linkedCapex}
        getOptionLabel={(option) => option.description}
        onChange={(_, newValue) => setLinkedCapex(newValue as any)}
        onOpen={async () => {
          if (capexOptions.length === 0 && !loadingCapex) {
            try {
              const res = await api.get(`/capex-items`, { params: { page: 1, limit: 100, sort: 'description:ASC' } });
              const items = (res.data?.items || []).map((x: any) => ({ id: x.id, description: x.description }));
              setCapexOptions(items);
            } catch { setCapexOptions([]); }
          }
        }}
        onInputChange={async (_, newInputValue) => {
          setLoadingCapex(true);
          try {
            const params: any = { limit: 50 };
            if (newInputValue && newInputValue.length >= 1) params.q = newInputValue;
            const res = await api.get(`/capex-items`, { params });
            const items = (res.data?.items || []).map((x: any) => ({ id: x.id, description: x.description }));
            setCapexOptions(items);
          } catch { setCapexOptions([]); } finally { setLoadingCapex(false); }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('contracts.relations.capexItems')}
            placeholder={t('contracts.relations.selectCapexItems')}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingCapex ? <CircularProgress color="inherit" size={18} /> : null}
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

      {/* Link Manager removed in favor of searchable multi-select */}

      <ItemContactsSection itemType="contracts" itemId={id} canManage={!readOnly} />

      <Typography variant="subtitle2">{t('contracts.relations.relevantWebsites')}</Typography>
      <Stack spacing={1}>
        {urls.map((l, idx) => (
          <Stack key={l.id || idx} direction="row" spacing={1} alignItems="center">
            <TextField label="Description" value={l.description || ''} onChange={(e) => setUrls(prev => prev.map((x, i) => i===idx? { ...x, description: e.target.value }: x))} fullWidth InputLabelProps={{ shrink: true }} disabled={readOnly} />
            <TextField label="URL" value={l.url} onChange={(e) => setUrls(prev => prev.map((x, i) => i===idx? { ...x, url: e.target.value }: x))} fullWidth InputLabelProps={{ shrink: true }} disabled={readOnly} />
            {!readOnly && (
              <IconButton aria-label="delete" onClick={() => setUrls(prev => prev.filter((_, i) => i!==idx))}><DeleteIcon fontSize="small"/></IconButton>
            )}
          </Stack>
        ))}
        {!readOnly && <Button size="small" onClick={() => setUrls(prev => [...prev, { url: '' }])}>{t('contracts.relations.addUrl')}</Button>}
      </Stack>

      <Typography variant="subtitle2">{t('contracts.relations.attachments')}</Typography>
      <Stack spacing={1}>
        <Box
          onDragOver={(e) => { if (!readOnly) { e.preventDefault(); setHover(true); } }}
          onDragLeave={() => setHover(false)}
          onDrop={async (e) => {
            if (readOnly) return;
            e.preventDefault();
            setHover(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length === 0) return;
            setUploading(true); setUploadCount(files.length);
            try {
              for (const f of files) {
                const fd = new FormData(); fd.append('file', f);
                await api.post(`/contracts/${id}/attachments`, fd);
              }
              await loadAttachments();
            } finally { setUploading(false); setUploadCount(0); }
          }}
          sx={{
            border: '2px dashed',
            borderColor: hover ? 'primary.main' : 'divider',
            borderRadius: 1,
            p: 2,
            textAlign: 'center',
            cursor: readOnly ? 'default' : 'pointer',
            opacity: readOnly ? 0.6 : 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {readOnly ? t('contracts.relations.noUploadPermission') : t('contracts.relations.dragDrop')}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Button component="label" size="small" variant="outlined" disabled={readOnly || uploading}>
              {t('contracts.relations.selectFiles')}
              <input
                type="file"
                hidden
                multiple
                onChange={async (e) => {
                  const input = e.currentTarget as HTMLInputElement | null;
                  const files = Array.from((e.target as HTMLInputElement)?.files || []);
                  if (files.length === 0) return;
                  setUploading(true); setUploadCount(files.length);
                  try {
                    for (const f of files) {
                      const fd = new FormData(); fd.append('file', f);
                      await api.post(`/contracts/${id}/attachments`, fd);
                    }
                    await loadAttachments();
                  } finally {
                    setUploading(false); setUploadCount(0);
                    if (input) input.value = '';
                  }
                }}
              />
            </Button>
          </Box>
          {uploading && <LinearProgress sx={{ mt: 1 }} />}
          {uploading && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {t('contracts.relations.uploadingFiles', { count: uploadCount })}…
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {attachments.map((a) => {
            const canDelete = hasLevel('contracts','manager') && !readOnly;
            const onDelete = async () => {
              if (!canDelete) return;
              const ok = window.confirm(t('confirmations.deleteAttachment', { name: a.original_filename }));
              if (!ok) return;
              try {
                await api.patch(`/contracts/attachments/${a.id}/delete`, {});
                await loadAttachments();
              } catch {
                // ignore, error handling minimal here
              }
            };
            return (
              <Chip
                key={a.id}
                label={a.original_filename}
                onClick={async () => {
                  const res = await api.get(`/contracts/attachments/${a.id}`, { responseType: 'blob' });
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

      {/* no modal */}
    </Stack>
  );
});
