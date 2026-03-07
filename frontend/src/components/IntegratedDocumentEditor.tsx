import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveIcon from '@mui/icons-material/Save';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import { buildInlineImageUrl, getTenantSlugFromHostname } from '../utils/inlineImageUrls';
import ExportButton from './ExportButton';
import MarkdownEditor from './MarkdownEditor';

type SourceEntityType = 'requests' | 'projects';
type SlotKey = 'purpose' | 'risks_mitigations';

type EditLockInfo = {
  holder_user_id: string;
  holder_name: string;
  acquired_at?: string | null;
  heartbeat_at?: string | null;
  expires_at?: string | null;
};

type IntegratedDocumentDetails = {
  id: string;
  item_number: number | null;
  item_ref?: string | null;
  content_markdown: string;
  revision: number;
  edit_lock?: EditLockInfo | null;
};

type IntegratedDocumentVersion = {
  id: string;
  version_number: number;
  created_at: string;
  change_note?: string | null;
  created_by_name?: string | null;
  created_by_email?: string | null;
};

export type IntegratedDocumentEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
  reset: () => Promise<void>;
};

type IntegratedDocumentEditorProps = {
  entityType: SourceEntityType;
  entityId?: string | null;
  slotKey: SlotKey;
  label: string;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  draftValue?: string;
  onDraftChange?: (value: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const ENTITY_ENDPOINTS: Record<SourceEntityType, string> = {
  requests: '/portfolio/requests',
  projects: '/portfolio/projects',
};

export const IntegratedDocumentEditor = React.forwardRef<
  IntegratedDocumentEditorHandle,
  IntegratedDocumentEditorProps
>(function IntegratedDocumentEditor(
  {
    entityType,
    entityId,
    slotKey,
    label,
    placeholder,
    minRows = 12,
    maxRows = 24,
    disabled = false,
    draftValue = '',
    onDraftChange,
    onDirtyChange,
  },
  ref,
) {
  const { hasLevel, profile } = useAuth();
  const qc = useQueryClient();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [form, setForm] = React.useState<{ content_markdown: string; revision: number }>({
    content_markdown: '',
    revision: 1,
  });
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [lockToken, setLockToken] = React.useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = React.useState<string | null>(null);
  const [activeLockInfo, setActiveLockInfo] = React.useState<EditLockInfo | null>(null);
  const [showVersions, setShowVersions] = React.useState(false);

  const isDraftMode = !entityId;
  const canEdit = !disabled;
  const canOpenKnowledge = hasLevel('knowledge', 'reader');
  const docQueryKey = React.useMemo(
    () => ['integrated-document', entityType, entityId, slotKey],
    [entityId, entityType, slotKey],
  );
  const versionsQueryKey = React.useMemo(
    () => ['integrated-document-versions', entityType, entityId, slotKey],
    [entityId, entityType, slotKey],
  );
  const endpointBase = entityId ? `${ENTITY_ENDPOINTS[entityType]}/${entityId}/integrated-documents/${slotKey}` : '';

  const parseLockInfo = React.useCallback((raw: any): EditLockInfo | null => {
    if (!raw || typeof raw !== 'object') return null;
    const holderUserId = String(raw.holder_user_id || '').trim();
    const holderName = String(raw.holder_name || '').trim();
    if (!holderUserId && !holderName) return null;
    return {
      holder_user_id: holderUserId,
      holder_name: holderName || holderUserId || 'another user',
      acquired_at: raw.acquired_at || null,
      heartbeat_at: raw.heartbeat_at || null,
      expires_at: raw.expires_at || null,
    };
  }, []);

  const parseLockInfoFromError = React.useCallback(
    (e: any) => parseLockInfo(e?.response?.data?.lock),
    [parseLockInfo],
  );

  const { data: doc, error: loadError, isLoading, refetch } = useQuery({
    queryKey: docQueryKey,
    queryFn: async () => (await api.get(endpointBase)).data as IntegratedDocumentDetails,
    enabled: !isDraftMode,
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: versionsQueryKey,
    queryFn: async () => (await api.get(`${endpointBase}/versions`)).data as IntegratedDocumentVersion[],
    enabled: !isDraftMode && showVersions,
  });

  React.useEffect(() => {
    if (isDraftMode || !doc || dirty) return;
    setForm({
      content_markdown: doc.content_markdown || '',
      revision: Number(doc.revision || 1),
    });
  }, [dirty, doc, isDraftMode]);

  React.useEffect(() => {
    if (isDraftMode || lockToken) {
      setActiveLockInfo(null);
      return;
    }
    setActiveLockInfo(parseLockInfo(doc?.edit_lock));
  }, [doc?.edit_lock, isDraftMode, lockToken, parseLockInfo]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const acquireLock = React.useCallback(async () => {
    if (isDraftMode || !entityId || lockToken) return;
    const res = await api.post(`${endpointBase}/locks`);
    setLockToken(res.data?.lock_token || null);
    setLockExpiresAt(res.data?.expires_at || null);
    setActiveLockInfo(null);
  }, [endpointBase, entityId, isDraftMode, lockToken]);

  const releaseLock = React.useCallback(async () => {
    if (isDraftMode || !entityId || !lockToken) return;
    try {
      await api.delete(`${endpointBase}/locks`, {
        headers: { 'X-Lock-Token': lockToken },
      });
    } catch {
      // Best effort.
    }
    setLockToken(null);
    setLockExpiresAt(null);
  }, [endpointBase, entityId, isDraftMode, lockToken]);

  const startEdit = React.useCallback(async (opts?: {
    silentConflict?: boolean;
  }) => {
    if (!canEdit || isDraftMode) return;
    try {
      setError(null);
      await acquireLock();
      setActiveLockInfo(null);
      setEditMode(true);
    } catch (e: any) {
      const status = Number(e?.response?.status || 0);
      const lockInfo = parseLockInfoFromError(e) || parseLockInfo(doc?.edit_lock);
      if (status === 423 && lockInfo) {
        setEditMode(false);
        setActiveLockInfo(lockInfo);
        if (!opts?.silentConflict) setError(null);
        return;
      }
      if (!opts?.silentConflict) {
        setError(e?.response?.data?.message || e?.message || 'Unable to acquire lock');
      }
    }
  }, [acquireLock, canEdit, doc?.edit_lock, isDraftMode, parseLockInfo, parseLockInfoFromError]);

  const saveMutation = useMutation({
    mutationFn: async (mode: 'manual' | 'autosave') => {
      if (isDraftMode || !entityId) {
        throw new Error('Managed document is not available until the source item is created');
      }
      const res = await api.patch(
        endpointBase,
        {
          content_markdown: form.content_markdown,
          revision: form.revision,
          save_mode: mode,
        },
        {
          headers: lockToken ? { 'X-Lock-Token': lockToken } : undefined,
        },
      );
      return { mode, data: res.data as IntegratedDocumentDetails };
    },
    onSuccess: async (result) => {
      setError(null);
      setDirty(false);
      setForm({
        content_markdown: result.data?.content_markdown || '',
        revision: Number(result.data?.revision || form.revision + 1),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: docQueryKey }),
        qc.invalidateQueries({ queryKey: versionsQueryKey }),
      ]);
    },
    onError: (e: any, mode: 'manual' | 'autosave') => {
      const status = Number(e?.response?.status || 0);
      const lockInfo = parseLockInfoFromError(e);
      if ((status === 410 || status === 423) && mode === 'autosave') {
        setEditMode(false);
        setLockToken(null);
        setLockExpiresAt(null);
        if (lockInfo) setActiveLockInfo(lockInfo);
        return;
      }
      if (status === 423) {
        setEditMode(false);
        setLockToken(null);
        setLockExpiresAt(null);
        setActiveLockInfo(lockInfo || parseLockInfo(doc?.edit_lock));
        setError(null);
        return;
      }
      if (status === 410) {
        setEditMode(false);
        setLockToken(null);
        setLockExpiresAt(null);
        setError('Editing lock expired. Re-enter edit mode to continue.');
        return;
      }
      setError(e?.response?.data?.message || e?.message || 'Failed to save document');
    },
  });

  React.useEffect(() => {
    if (isDraftMode || !editMode || !lockToken) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await api.post(`${endpointBase}/locks/heartbeat`, null, {
          headers: { 'X-Lock-Token': lockToken },
        });
        setLockExpiresAt(res.data?.expires_at || null);
      } catch (e: any) {
        setEditMode(false);
        setLockToken(null);
        setLockExpiresAt(null);
        const lockInfo = parseLockInfoFromError(e);
        if (lockInfo) setActiveLockInfo(lockInfo);
      }
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [editMode, endpointBase, isDraftMode, lockToken, parseLockInfoFromError]);

  React.useEffect(() => {
    if (isDraftMode || !editMode || !dirty || !lockToken) return;
    const timer = window.setInterval(() => {
      void saveMutation.mutateAsync('autosave').catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [dirty, editMode, isDraftMode, lockToken, saveMutation]);

  React.useEffect(() => {
    return () => {
      void releaseLock();
    };
  }, [releaseLock]);

  const save = React.useCallback(async (): Promise<boolean> => {
    if (isDraftMode || !dirty) return true;
    if (!lockToken) {
      try {
        await startEdit();
      } catch {
        return false;
      }
    }
    try {
      await saveMutation.mutateAsync('manual');
      return true;
    } catch {
      return false;
    }
  }, [dirty, isDraftMode, lockToken, saveMutation, startEdit]);

  const reset = React.useCallback(async () => {
    if (isDraftMode) return;
    const result = await refetch();
    const latest = result.data || doc;
    if (latest) {
      setForm({
        content_markdown: latest.content_markdown || '',
        revision: Number(latest.revision || 1),
      });
    }
    setDirty(false);
    setError(null);
    setEditMode(false);
    await releaseLock();
  }, [doc, isDraftMode, refetch, releaseLock]);

  React.useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    save,
    reset,
  }), [dirty, reset, save]);

  const discardChanges = React.useCallback(async () => {
    await reset();
  }, [reset]);

  const revertMutation = useMutation({
    mutationFn: async (versionNumber: number) => {
      if (isDraftMode || !entityId) {
        throw new Error('Managed document is not available until the source item is created');
      }
      await api.post(`${endpointBase}/revert/${versionNumber}`, null, {
        headers: lockToken ? { 'X-Lock-Token': lockToken } : undefined,
      });
    },
    onSuccess: async () => {
      setDirty(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: docQueryKey }),
        qc.invalidateQueries({ queryKey: versionsQueryKey }),
      ]);
      await refetch();
    },
    onError: (e: any) => {
      const status = Number(e?.response?.status || 0);
      const lockInfo = parseLockInfoFromError(e) || parseLockInfo(doc?.edit_lock);
      if (status === 423 && lockInfo) {
        setActiveLockInfo(lockInfo);
        setEditMode(false);
        setLockToken(null);
        setLockExpiresAt(null);
        return;
      }
      if (status === 410) {
        setEditMode(false);
        setLockToken(null);
        setLockExpiresAt(null);
        setError('Editing lock expired. Re-enter edit mode to continue.');
        return;
      }
      setError(e?.response?.data?.message || e?.message || 'Failed to restore version');
    },
  });

  const handleInlineImageUpload = React.useCallback(async (file: File): Promise<string> => {
    if (isDraftMode || !entityId) {
      throw new Error('Inline image upload is available after the source item is created');
    }
    if (!lockToken) {
      throw new Error('Acquire an editing lock before uploading inline images');
    }
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ id: string }>(`${endpointBase}/attachments/inline`, formData, {
      headers: { 'X-Lock-Token': lockToken },
    });
    const tenantSlug = getTenantSlugFromHostname(window.location.hostname);
    return buildInlineImageUrl(`/knowledge/inline/${tenantSlug}/${res.data.id}`);
  }, [endpointBase, entityId, isDraftMode, lockToken]);

  const handleBlurCapture = React.useCallback(() => {
    if (isDraftMode || !editMode || dirty) return;
    window.setTimeout(() => {
      const active = document.activeElement;
      if (containerRef.current && active instanceof Node && containerRef.current.contains(active)) {
        return;
      }
      setEditMode(false);
      void releaseLock();
    }, 0);
  }, [dirty, editMode, isDraftMode, releaseLock]);

  const lockHolderLabel = activeLockInfo?.holder_name || 'another user';
  const loadErrorMessage = React.useMemo(() => {
    if (!loadError) return null;
    return (
      (loadError as any)?.response?.data?.message
      || (loadError as any)?.message
      || 'Failed to load the managed document'
    );
  }, [loadError]);
  const lockExpiryLabel = React.useMemo(() => {
    const raw = activeLockInfo?.expires_at || lockExpiresAt || null;
    if (!raw) return null;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleString();
  }, [activeLockInfo?.expires_at, lockExpiresAt]);
  const isLockedByAnotherUser = !!activeLockInfo?.holder_user_id && activeLockInfo.holder_user_id !== profile?.id;
  const canEditContent = isDraftMode ? canEdit : (canEdit && editMode && !!lockToken && !isLockedByAnotherUser);
  const exportTitle = label.toLowerCase().replace(/\s+/g, '-');
  const deepLinkRef = doc?.item_ref || (doc?.item_number ? `DOC-${doc.item_number}` : null);

  if (isDraftMode) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <ExportButton
            content={draftValue || ''}
            title={exportTitle}
            disabled={!String(draftValue || '').trim()}
          />
        </Stack>
        <MarkdownEditor
          value={draftValue || ''}
          onChange={(value) => onDraftChange?.(value)}
          placeholder={placeholder}
          minRows={minRows}
          maxRows={maxRows}
          disabled={disabled}
        />
      </Box>
    );
  }

  return (
    <Box ref={containerRef} onBlurCapture={handleBlurCapture}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip label="Managed Doc" size="small" variant="outlined" />
          {canOpenKnowledge && deepLinkRef && (
            <Button
              size="small"
              href={`/knowledge/${deepLinkRef}`}
              target="_blank"
              rel="noreferrer"
              startIcon={<OpenInNewIcon fontSize="small" />}
            >
              Open full document
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryIcon fontSize="small" />}
            onClick={() => setShowVersions((prev) => !prev)}
          >
            {showVersions ? 'Hide history' : 'Version history'}
          </Button>
          {!editMode && canEdit && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => { void startEdit(); }}
            >
              {isLockedByAnotherUser ? 'Retry lock' : 'Edit'}
            </Button>
          )}
          {editMode && canEdit && dirty && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => { void discardChanges(); }}
            >
              Discard
            </Button>
          )}
          {editMode && canEdit && (
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveIcon fontSize="small" />}
              disabled={!dirty || saveMutation.isPending}
              onClick={() => { void save(); }}
            >
              Save
            </Button>
          )}
          <ExportButton
            content={form.content_markdown || ''}
            title={deepLinkRef || exportTitle}
            disabled={!String(form.content_markdown || '').trim()}
          />
        </Stack>
      </Stack>

      {!!loadErrorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 1 }}
          action={(
            <Button size="small" onClick={() => { void refetch(); }}>
              Retry
            </Button>
          )}
        >
          {loadErrorMessage}
        </Alert>
      )}
      {!!error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {isLockedByAnotherUser && (
        <Alert
          severity="info"
          sx={{ mb: 1 }}
          action={canEdit ? (
            <Button size="small" onClick={() => { void startEdit(); }}>
              Retry lock
            </Button>
          ) : undefined}
        >
          This managed document is locked by {lockHolderLabel}
          {lockExpiryLabel ? ` until ${lockExpiryLabel}` : ''}. You can read it while the lock is active.
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ minHeight: minRows * 24, border: 1, borderColor: 'divider', borderRadius: 1, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : loadErrorMessage ? (
        <Box sx={{ minHeight: minRows * 24, border: 1, borderColor: 'divider', borderRadius: 1, display: 'grid', placeItems: 'center', px: 2 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Managed document content is unavailable until the load error is resolved.
          </Typography>
        </Box>
      ) : (
        <MarkdownEditor
          value={form.content_markdown || ''}
          onChange={(value) => {
            setForm((prev) => ({ ...prev, content_markdown: value }));
            setDirty(true);
          }}
          placeholder={placeholder}
          minRows={minRows}
          maxRows={maxRows}
          disabled={!canEditContent}
          onImageUpload={canEditContent ? handleInlineImageUpload : undefined}
        />
      )}

      <Collapse in={showVersions}>
        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={1}>
          {versionsLoading && (
            <Typography variant="body2" color="text.secondary">
              Loading version history…
            </Typography>
          )}
          {!versionsLoading && versions.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No version history yet.
            </Typography>
          )}
          {!versionsLoading && versions.map((version) => {
            const createdAt = version.created_at
              ? new Date(version.created_at).toLocaleString()
              : 'Unknown date';
            const createdBy = version.created_by_name || version.created_by_email || 'Unknown';
            return (
              <Box
                key={version.id}
                sx={{
                  p: 1.25,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box>
                    <Typography variant="subtitle2">
                      Version {version.version_number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {createdAt} by {createdBy}
                    </Typography>
                    {version.change_note && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {version.change_note}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RestoreIcon fontSize="small" />}
                    disabled={!canEditContent || revertMutation.isPending}
                    onClick={() => revertMutation.mutate(version.version_number)}
                  >
                    Restore
                  </Button>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
});

export default IntegratedDocumentEditor;
