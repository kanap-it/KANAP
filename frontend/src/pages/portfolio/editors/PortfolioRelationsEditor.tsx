import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';

export type PortfolioRelationsEditorHandle = {
  save: () => Promise<void>;
  reset: () => void;
  isDirty: () => boolean;
};

type EntityType = 'request' | 'project';

type LinkItem = {
  id?: string;
  label?: string;
  url: string;
};

type NamedItem = {
  id: string;
  name: string;
  summary?: string | null;
};

type AttachmentItem = {
  id: string;
  original_filename: string;
};

type Props = {
  autoSave?: boolean;
  entityId: string;
  entityType: EntityType;
  onDirtyChange?: (dirty: boolean) => void;
};

const compactFieldSx = {
  '& .MuiFormLabel-root': {
    fontSize: '0.9rem',
  },
  '& .MuiInputBase-root': {
    fontSize: '0.9rem',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.9rem',
  },
  '& .MuiChip-root': {
    fontSize: '0.78rem',
    height: 24,
  },
};

const endpointBaseByType: Record<EntityType, string> = {
  request: '/portfolio/requests',
  project: '/portfolio/projects',
};

const permissionByType: Record<EntityType, 'portfolio_requests' | 'portfolio_projects'> = {
  request: 'portfolio_requests',
  project: 'portfolio_projects',
};

function normalizeUrl(raw: string) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function sortByName<T extends NamedItem>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeSummary(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function sameIdList(a: Array<{ id: string }>, b: Array<{ id: string }>) {
  const left = [...a].map((item) => item.id).sort();
  const right = [...b].map((item) => item.id).sort();
  return JSON.stringify(left) === JSON.stringify(right);
}

export default forwardRef<PortfolioRelationsEditorHandle, Props>(function PortfolioRelationsEditor({
  autoSave = false,
  entityId,
  entityType,
  onDirtyChange,
}, ref) {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const { hasLevel } = useAuth();
  const readOnly = !hasLevel(permissionByType[entityType], 'manager');
  const endpointBase = `${endpointBaseByType[entityType]}/${entityId}`;
  const attachmentDownloadBase = `${endpointBaseByType[entityType]}/attachments`;

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [linkedOpex, setLinkedOpex] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [baselineOpex, setBaselineOpex] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [opexOptions, setOpexOptions] = React.useState<Array<{ id: string; product_name: string }>>([]);
  const [loadingOpexOptions, setLoadingOpexOptions] = React.useState(false);

  const [linkedCapex, setLinkedCapex] = React.useState<Array<{ id: string; description: string }>>([]);
  const [baselineCapex, setBaselineCapex] = React.useState<Array<{ id: string; description: string }>>([]);
  const [capexOptions, setCapexOptions] = React.useState<Array<{ id: string; description: string }>>([]);
  const [loadingCapexOptions, setLoadingCapexOptions] = React.useState(false);

  const [linkedApplications, setLinkedApplications] = React.useState<NamedItem[]>([]);
  const [baselineApplications, setBaselineApplications] = React.useState<NamedItem[]>([]);
  const [applicationOptions, setApplicationOptions] = React.useState<NamedItem[]>([]);
  const [loadingApplications, setLoadingApplications] = React.useState(false);

  const [linkedAssets, setLinkedAssets] = React.useState<NamedItem[]>([]);
  const [baselineAssets, setBaselineAssets] = React.useState<NamedItem[]>([]);
  const [assetOptions, setAssetOptions] = React.useState<NamedItem[]>([]);
  const [loadingAssets, setLoadingAssets] = React.useState(false);

  const [links, setLinks] = React.useState<LinkItem[]>([]);
  const [baselineLinks, setBaselineLinks] = React.useState<LinkItem[]>([]);
  const [attachments, setAttachments] = React.useState<AttachmentItem[]>([]);
  const [hover, setHover] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadCount, setUploadCount] = React.useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkDraft, setLinkDraft] = React.useState<{ label: string; url: string }>({ label: '', url: '' });

  const dirty = React.useMemo(() => (
    !sameIdList(linkedOpex, baselineOpex)
    || !sameIdList(linkedCapex, baselineCapex)
    || !sameIdList(linkedApplications, baselineApplications)
    || !sameIdList(linkedAssets, baselineAssets)
    || JSON.stringify(links) !== JSON.stringify(baselineLinks)
  ), [
    baselineApplications,
    baselineAssets,
    baselineCapex,
    baselineLinks,
    baselineOpex,
    linkedApplications,
    linkedAssets,
    linkedCapex,
    linkedOpex,
    links,
  ]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const fetchAllPaged = React.useCallback(async (endpoint: string, sortField: string) => {
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
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entityRes, appsRes, assetsRes] = await Promise.allSettled([
        api.get(endpointBase, { params: { include: 'opex,capex,urls,attachments' } }),
        api.get(`${endpointBase}/applications`),
        api.get(`${endpointBase}/assets`),
      ]);

      if (entityRes.status === 'fulfilled') {
        const data = entityRes.value.data || {};
        const opexItems = (data?.opex_items || []).map((item: any) => ({ id: item.id, product_name: item.product_name }));
        const capexItems = (data?.capex_items || []).map((item: any) => ({ id: item.id, description: item.description }));
        const linkItems = (data?.urls || []).map((item: any) => ({ id: item.id, label: item.label, url: item.url }));
        setLinkedOpex(opexItems);
        setBaselineOpex(opexItems);
        setLinkedCapex(capexItems);
        setBaselineCapex(capexItems);
        setLinks(linkItems);
        setBaselineLinks(linkItems);
        setAttachments(data?.attachments || []);
      } else {
        setLinkedOpex([]);
        setBaselineOpex([]);
        setLinkedCapex([]);
        setBaselineCapex([]);
        setLinks([]);
        setBaselineLinks([]);
        setAttachments([]);
      }

      if (appsRes.status === 'fulfilled') {
        const items = sortByName((appsRes.value.data?.items || []).map((item: any) => ({
          id: item.id,
          name: item.name || item.id,
          summary: normalizeSummary(item.description ?? item.summary),
        })));
        setLinkedApplications(items);
        setBaselineApplications(items);
      } else {
        setLinkedApplications([]);
        setBaselineApplications([]);
      }

      if (assetsRes.status === 'fulfilled') {
        const items = sortByName((assetsRes.value.data?.items || []).map((item: any) => ({
          id: item.id,
          name: item.name || item.id,
        })));
        setLinkedAssets(items);
        setBaselineAssets(items);
      } else {
        setLinkedAssets([]);
        setBaselineAssets([]);
      }
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('editors.relations.messages.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [endpointBase, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadOpexOptions = React.useCallback(async () => {
    setLoadingOpexOptions(true);
    try {
      const allSpend = await fetchAllPaged('/spend-items', 'product_name');
      const opexMap = new Map<string, { id: string; product_name: string }>();
      for (const item of allSpend) {
        opexMap.set(item.id, { id: item.id, product_name: item.product_name || item.id });
      }
      setOpexOptions([...opexMap.values()].sort((a, b) => a.product_name.localeCompare(b.product_name)));
    } catch {
      setOpexOptions([]);
    } finally {
      setLoadingOpexOptions(false);
    }
  }, [fetchAllPaged]);

  const loadCapexOptions = React.useCallback(async () => {
    setLoadingCapexOptions(true);
    try {
      const allCapex = await fetchAllPaged('/capex-items', 'description');
      const capexMap = new Map<string, { id: string; description: string }>();
      for (const item of allCapex) {
        capexMap.set(item.id, { id: item.id, description: item.description || item.id });
      }
      setCapexOptions([...capexMap.values()].sort((a, b) => a.description.localeCompare(b.description)));
    } catch {
      setCapexOptions([]);
    } finally {
      setLoadingCapexOptions(false);
    }
  }, [fetchAllPaged]);

  const loadNamedOptions = React.useCallback(async (
    endpoint: '/applications' | '/assets',
    query: string,
    setter: React.Dispatch<React.SetStateAction<NamedItem[]>>,
    loadingSetter: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    loadingSetter(true);
    try {
      const params: Record<string, any> = { limit: 50, sort: 'name:ASC' };
      if (query.trim()) params.q = query.trim();
      const res = await api.get(endpoint, { params });
      setter(sortByName((res.data?.items || []).map((item: any) => ({
        id: item.id,
        name: item.name || item.id,
        summary: endpoint === '/applications' ? normalizeSummary(item.description ?? item.summary) : null,
      }))));
    } catch {
      setter([]);
    } finally {
      loadingSetter(false);
    }
  }, []);

  const save = React.useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`${endpointBase}/opex/bulk-replace`, {
        opex_ids: linkedOpex.map((item) => item.id),
      });
      setBaselineOpex(linkedOpex);

      await api.post(`${endpointBase}/capex/bulk-replace`, {
        capex_ids: linkedCapex.map((item) => item.id),
      });
      setBaselineCapex(linkedCapex);

      await api.post(`${endpointBase}/applications/bulk-replace`, {
        application_ids: linkedApplications.map((item) => item.id),
      });
      setBaselineApplications(linkedApplications);

      await api.post(`${endpointBase}/assets/bulk-replace`, {
        asset_ids: linkedAssets.map((item) => item.id),
      });
      setBaselineAssets(linkedAssets);

      await api.post(`${endpointBase}/urls`, {
        urls: links
          .filter((item) => String(item.url || '').trim())
          .map((item) => ({
            url: String(item.url || '').trim(),
            label: item.label ? String(item.label).trim() : null,
          })),
      });
      setBaselineLinks(links);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('editors.relations.messages.saveFailed')));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [endpointBase, linkedApplications, linkedAssets, linkedCapex, linkedOpex, links, readOnly, t]);

  React.useEffect(() => {
    if (!autoSave || !dirty || saving || loading || readOnly) return undefined;
    const timer = window.setTimeout(() => {
      void save();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [autoSave, dirty, loading, readOnly, save, saving]);

  useImperativeHandle(ref, () => ({
    save,
    reset: () => {
      void load();
    },
    isDirty: () => dirty,
  }), [dirty, load, save]);

  const addLink = () => {
    const url = String(linkDraft.url || '').trim();
    if (!url) return;
    setLinks((prev) => [...prev, {
      label: String(linkDraft.label || '').trim() || undefined,
      url,
    }]);
    setLinkDraft({ label: '', url: '' });
    setLinkDialogOpen(false);
  };

  const handleLinkDialogSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addLink();
  };

  const handleAttachmentUpload = async (files: File[]) => {
    if (files.length === 0 || readOnly) return;
    setUploading(true);
    setUploadCount(files.length);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`${endpointBase}/attachments`, formData);
      }
      await load();
    } finally {
      setUploading(false);
      setUploadCount(0);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <>
      <Stack spacing={3} sx={compactFieldSx}>
        {!!error && <Alert severity="error">{error}</Alert>}

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {t('editors.relations.sections.budgetItems')}
          </Typography>
          <Stack spacing={1.25}>
            <Autocomplete
              multiple
              size="small"
              options={opexOptions}
              value={linkedOpex}
              getOptionLabel={(option) => option.product_name}
              onChange={(_, value) => setLinkedOpex(value as any)}
              onOpen={() => {
                if (opexOptions.length === 0 && !loadingOpexOptions) {
                  void loadOpexOptions();
                }
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>{option.product_name}</li>
              )}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option.id} label={option.product_name} size="small" />
              ))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('editors.relations.fields.opexItems')}
                  placeholder={t('editors.relations.placeholders.opexItems')}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingOpexOptions ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === (value as any).id}
              filterSelectedOptions
              disabled={saving || readOnly}
              fullWidth
            />

            <Autocomplete
              multiple
              size="small"
              options={capexOptions}
              value={linkedCapex}
              getOptionLabel={(option) => option.description}
              onChange={(_, value) => setLinkedCapex(value as any)}
              onOpen={() => {
                if (capexOptions.length === 0 && !loadingCapexOptions) {
                  void loadCapexOptions();
                }
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>{option.description}</li>
              )}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option.id} label={option.description} size="small" />
              ))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('editors.relations.fields.capexItems')}
                  placeholder={t('editors.relations.placeholders.capexItems')}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCapexOptions ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === (value as any).id}
              filterSelectedOptions
              disabled={saving || readOnly}
              fullWidth
            />
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {t('editors.relations.sections.appsAndAssets')}
          </Typography>
          <Stack spacing={1.25}>
            <Autocomplete
              multiple
              size="small"
              options={applicationOptions}
              value={linkedApplications}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => setLinkedApplications(sortByName(value as NamedItem[]))}
              onOpen={() => {
                if (applicationOptions.length === 0 && !loadingApplications) {
                  void loadNamedOptions('/applications', '', setApplicationOptions, setLoadingApplications);
                }
              }}
              onInputChange={(_, value, reason) => {
                if (reason !== 'reset') {
                  void loadNamedOptions('/applications', value, setApplicationOptions, setLoadingApplications);
                }
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ minWidth: 0, py: 0.25 }}>
                    <Typography variant="body2">{option.name}</Typography>
                  </Box>
                </li>
              )}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.name}
                  size="small"
                  title={option.name}
                  onClick={() => window.open(`/it/applications/${option.id}/overview`, '_self')}
                  clickable
                />
              ))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('activity.history.fields.applications')}
                  placeholder={t('editors.relations.placeholders.applications')}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingApplications ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterSelectedOptions
              disabled={saving || readOnly}
              fullWidth
            />

            <Autocomplete
              multiple
              size="small"
              options={assetOptions}
              value={linkedAssets}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => setLinkedAssets(sortByName(value as NamedItem[]))}
              onOpen={() => {
                if (assetOptions.length === 0 && !loadingAssets) {
                  void loadNamedOptions('/assets', '', setAssetOptions, setLoadingAssets);
                }
              }}
              onInputChange={(_, value, reason) => {
                if (reason !== 'reset') {
                  void loadNamedOptions('/assets', value, setAssetOptions, setLoadingAssets);
                }
              }}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.name}
                  size="small"
                  onClick={() => window.open(`/it/assets/${option.id}/overview`, '_self')}
                  clickable
                />
              ))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('activity.history.fields.assets')}
                  placeholder={t('editors.relations.placeholders.assets')}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingAssets ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterSelectedOptions
              disabled={saving || readOnly}
              fullWidth
            />
          </Stack>
        </Box>

        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('editors.relations.sections.externalLinks')}
            </Typography>
            {!readOnly && (
              <Button size="small" startIcon={<AddIcon />} onClick={() => setLinkDialogOpen(true)}>
                {t('editors.relations.actions.addUrl')}
              </Button>
            )}
          </Stack>
          {links.length > 0 ? (
            <Stack spacing={0.75}>
              {links.map((item, index) => {
                const href = normalizeUrl(item.url);
                const label = String(item.label || '').trim() || item.url;
                return (
                  <Stack
                    key={`${item.id || 'new'}-${index}`}
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ px: 1, py: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}
                  >
                    <Typography
                      component="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{
                        flex: 1,
                        color: 'text.primary',
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      title={item.url}
                    >
                      {label}
                    </Typography>
                    {!readOnly && (
                      <IconButton
                        size="small"
                        aria-label={t('editors.relations.actions.deleteLink')}
                        onClick={() => setLinks((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('editors.relations.states.noExternalLinks')}
            </Typography>
          )}
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {t('editors.relations.sections.attachments')}
          </Typography>
          <Stack spacing={1}>
            <Box
              onDragOver={(event) => {
                event.preventDefault();
                setHover(true);
              }}
              onDragLeave={() => setHover(false)}
              onDrop={(event) => {
                event.preventDefault();
                setHover(false);
                void handleAttachmentUpload(Array.from(event.dataTransfer.files || []));
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
                {t('editors.relations.messages.dragDropFiles')}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button component="label" size="small" variant="outlined" disabled={uploading || readOnly}>
                  {t('editors.relations.actions.selectFiles')}
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={async (event) => {
                      const input = event.currentTarget as HTMLInputElement | null;
                      const files = Array.from(event.target.files || []);
                      await handleAttachmentUpload(files);
                      if (input) input.value = '';
                    }}
                  />
                </Button>
              </Box>
            </Box>

            {uploading && <LinearProgress sx={{ mt: 1 }} />}
            {uploading && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {t('editors.relations.messages.uploadingFiles', { count: uploadCount })}
              </Typography>
            )}

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {attachments.map((attachment) => (
                <Chip
                  key={attachment.id}
                  label={attachment.original_filename}
                  size="small"
                  onClick={async () => {
                    const res = await api.get(`${attachmentDownloadBase}/${attachment.id}`, { responseType: 'blob' });
                    const blob = new Blob([res.data]);
                    const url = window.URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = attachment.original_filename;
                    anchor.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  onDelete={!readOnly ? async () => {
                    const confirmed = window.confirm(
                      t('editors.relations.confirmations.deleteAttachment', {
                        name: attachment.original_filename,
                      }),
                    );
                    if (!confirmed) return;
                    try {
                      await api.delete(`${endpointBase}/attachments/${attachment.id}`);
                      await load();
                    } catch {
                      // best effort
                    }
                  } : undefined}
                  deleteIcon={!readOnly ? <DeleteIcon fontSize="small" /> : undefined}
                />
              ))}
            </Stack>
          </Stack>
        </Box>
      </Stack>

      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleLinkDialogSubmit}>
          <DialogTitle>{t('editors.relations.dialogs.addExternalLink.title')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                size="small"
                label={t('editors.relations.fields.linkDescription')}
                placeholder={t('editors.relations.placeholders.linkDescription')}
                value={linkDraft.label}
                onChange={(event) => setLinkDraft((prev) => ({ ...prev, label: event.target.value }))}
              />
              <TextField
                size="small"
                label={t('editors.relations.fields.url')}
                placeholder={t('editors.relations.placeholders.url')}
                value={linkDraft.url}
                onChange={(event) => setLinkDraft((prev) => ({ ...prev, url: event.target.value }))}
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLinkDialogOpen(false)}>{t('common:buttons.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={!String(linkDraft.url || '').trim()}>
              {t('common:buttons.add')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
});
