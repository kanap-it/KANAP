import React from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  IconButton,
  Link as MLink,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import ExportButton from '../../components/ExportButton';
import MarkdownEditor from '../../components/MarkdownEditor';
import { useAuth } from '../../auth/AuthContext';
import { buildInlineImageUrl, getTenantSlugFromHostname } from '../../utils/inlineImageUrls';
import KnowledgeSidebar from './components/KnowledgeSidebar';
import FolderTreePanel from './components/FolderTreePanel';
import ValidatedBadge from './components/ValidatedBadge';
import { CircularProgress } from '@mui/material';

type RelationKey = 'applications' | 'assets' | 'projects' | 'requests' | 'tasks';
type RelationOption = { id: string; label: string };
type ContributorAssignments = {
  owner_user_id: string | null;
  author_user_ids: string[];
  reviewer_user_ids: string[];
  approver_user_ids: string[];
};
type KnowledgeContributorOption = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  label: string;
};
type KnowledgeDocumentTypeOption = {
  id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  is_system: boolean;
};

const RELATION_BODY_KEYS: Record<RelationKey, string> = {
  applications: 'application_ids',
  assets: 'asset_ids',
  projects: 'project_ids',
  requests: 'request_ids',
  tasks: 'task_ids',
};

const EMPTY_RELATIONS: Record<RelationKey, RelationOption[]> = {
  applications: [],
  assets: [],
  projects: [],
  requests: [],
  tasks: [],
};

const EMPTY_CONTRIBUTOR_ASSIGNMENTS: ContributorAssignments = {
  owner_user_id: null,
  author_user_ids: [],
  reviewer_user_ids: [],
  approver_user_ids: [],
};

type ClassificationRow = {
  category_id: string;
  stream_id: string | null;
};

type ClassificationResponse = {
  categories: Array<{ id: string; name: string; is_active?: boolean }>;
  streams: Array<{ id: string; name: string; category_id: string; is_active?: boolean }>;
};

type DocumentLibrary = {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
  display_order: number;
};

type EditLockInfo = {
  holder_user_id: string;
  holder_name: string;
  acquired_at?: string | null;
  heartbeat_at?: string | null;
  expires_at: string;
};

const SIDEBAR_STORAGE_KEY = 'doc-sidebar-open';

export default function KnowledgeWorkspacePage() {
  const theme = useTheme();
  const { profile, hasLevel } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const isCreate = location.pathname === '/knowledge/new' || location.pathname.startsWith('/knowledge/new/');
  const id = isCreate ? 'new' : String(params.id || '');
  const searchParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedLibrarySlug = searchParams.get('library') || '';
  const templateDocumentIdParam = searchParams.get('template_document_id') || null;

  const [form, setForm] = React.useState<any>({
    title: '',
    summary: '',
    content_markdown: '',
    status: 'draft',
    folder_id: null,
    document_type_id: null,
    template_document_id: templateDocumentIdParam || null,
    template_document_title: '',
    template_document_type_id: null,
    template_document_type_name: '',
    revision: 1,
  });
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editMode, setEditMode] = React.useState(isCreate);
  const [lockToken, setLockToken] = React.useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = React.useState<string | null>(null);
  const [activeLockInfo, setActiveLockInfo] = React.useState<EditLockInfo | null>(null);
  const [commentText, setCommentText] = React.useState('');
  const [relationSearch, setRelationSearch] = React.useState<Record<RelationKey, string>>({
    applications: '',
    assets: '',
    projects: '',
    requests: '',
    tasks: '',
  });
  const [relationSelections, setRelationSelections] = React.useState<Record<RelationKey, RelationOption[]>>(EMPTY_RELATIONS);
  const [classificationRows, setClassificationRows] = React.useState<ClassificationRow[]>([]);
  const [relationsError, setRelationsError] = React.useState<string | null>(null);
  const [relationsDirty, setRelationsDirty] = React.useState(false);
  const [classificationError, setClassificationError] = React.useState<string | null>(null);
  const [classificationsDirty, setClassificationsDirty] = React.useState(false);
  const [contributorAssignments, setContributorAssignments] = React.useState<ContributorAssignments>(EMPTY_CONTRIBUTOR_ASSIGNMENTS);
  const [contributorsDirty, setContributorsDirty] = React.useState(false);
  const [contributorsError, setContributorsError] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored !== 'false';
    } catch { return true; }
  });
  const canManageDocument = hasLevel('knowledge', 'member');
  const [contentFocusNonce, setContentFocusNonce] = React.useState(0);
  const [editorRows, setEditorRows] = React.useState(30);

  React.useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen)); } catch { /* ignore */ }
  }, [sidebarOpen]);

  const updateEditorRows = React.useCallback((height: number) => {
    const safeHeight = Math.max(240, Math.floor(height || 0));
    const chromeHeight = 52; // editor border + toolbar chrome
    const contentHeight = Math.max(160, safeHeight - chromeHeight);
    const nextRows = Math.max(8, Math.floor((contentHeight + 24) / 24));
    setEditorRows((prev) => (prev === nextRows ? prev : nextRows));
  }, []);

  // Callback ref: re-attaches ResizeObserver whenever the host element
  // mounts (e.g. after the loading-spinner early-return unmounts it).
  const roRef = React.useRef<ResizeObserver | null>(null);
  const resizeListenerRef = React.useRef<(() => void) | null>(null);
  const editorHostRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      // Cleanup previous observer / listener
      if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
      if (resizeListenerRef.current) {
        window.removeEventListener('resize', resizeListenerRef.current);
        resizeListenerRef.current = null;
      }

      if (!node) return;

      // Measure immediately
      updateEditorRows(node.getBoundingClientRect().height);

      // Window resize listener
      const onResize = () => updateEditorRows(node.getBoundingClientRect().height);
      window.addEventListener('resize', onResize);
      resizeListenerRef.current = onResize;

      // ResizeObserver
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (entry) updateEditorRows(entry.contentRect.height);
        });
        ro.observe(node);
        roRef.current = ro;
      }
    },
    [updateEditorRows],
  );

  // Fetch template document content when creating from a template
  const { data: templateDoc } = useQuery({
    queryKey: ['knowledge', templateDocumentIdParam],
    queryFn: async () => (await api.get(`/knowledge/${templateDocumentIdParam}`)).data,
    enabled: isCreate && !!templateDocumentIdParam,
  });

  React.useEffect(() => {
    if (!isCreate || !templateDoc) return;
    setForm((prev: any) => {
      const next = { ...prev };
      if (!prev.content_markdown) {
        next.content_markdown = templateDoc.content_markdown || '';
      }
      next.template_document_id = templateDoc.id || templateDocumentIdParam || null;
      next.template_document_title = templateDoc.title || '';
      next.template_document_type_id = templateDoc.template_document_type_id || templateDoc.document_type_id || null;
      next.template_document_type_name = templateDoc.template_document_type_name || templateDoc.document_type_name || '';
      next.document_type_id = templateDoc.document_type_id || next.document_type_id || null;
      return next;
    });
  }, [isCreate, templateDoc, templateDocumentIdParam]);

  // Data queries
  const { data: doc, isLoading, refetch } = useQuery({
    queryKey: ['knowledge', id],
    queryFn: async () => (await api.get(`/knowledge/${id}`)).data,
    enabled: !isCreate,
  });

  const { data: versions } = useQuery({
    queryKey: ['knowledge-versions', id],
    queryFn: async () => (await api.get(`/knowledge/${id}/versions`)).data,
    enabled: !isCreate,
  });

  const { data: activities } = useQuery({
    queryKey: ['knowledge-activities', id],
    queryFn: async () => (await api.get(`/knowledge/${id}/activities`)).data,
    enabled: !isCreate,
  });

  const { data: files, refetch: refetchFiles } = useQuery({
    queryKey: ['knowledge-files', id],
    queryFn: async () => (await api.get(`/knowledge/${id}/attachments`)).data,
    enabled: !isCreate,
  });

  const { data: libraries = [] } = useQuery({
    queryKey: ['knowledge-libraries'],
    queryFn: async () => (await api.get('/knowledge-libraries')).data as DocumentLibrary[],
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['knowledge-types'],
    queryFn: async () => (await api.get('/knowledge-types')).data as KnowledgeDocumentTypeOption[],
  });

  const activeCreateLibrary = React.useMemo(() => {
    if (!libraries.length) return null;
    if (requestedLibrarySlug) {
      const requested = libraries.find((row) => row.slug === requestedLibrarySlug);
      if (requested) return requested;
    }
    return libraries.find((row) => !row.is_system) || libraries[0];
  }, [libraries, requestedLibrarySlug]);

  const defaultDocumentTypeId = React.useMemo(
    () => documentTypes.find((row) => row.is_default)?.id || null,
    [documentTypes],
  );

  React.useEffect(() => {
    if (!isCreate || !defaultDocumentTypeId) return;
    setForm((prev: any) => {
      if (prev.document_type_id) return prev;
      return { ...prev, document_type_id: defaultDocumentTypeId };
    });
  }, [defaultDocumentTypeId, isCreate]);

  React.useEffect(() => {
    if (!isCreate || !activeCreateLibrary?.slug) return;
    if (requestedLibrarySlug === activeCreateLibrary.slug) return;
    const sp = new URLSearchParams(location.search);
    sp.set('library', activeCreateLibrary.slug);
    const qs = sp.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true });
  }, [isCreate, activeCreateLibrary?.slug, requestedLibrarySlug, location.pathname, location.search, navigate]);

  const workspaceLibraryId = React.useMemo(
    () => (isCreate ? activeCreateLibrary?.id || null : (doc?.library_id || null)),
    [isCreate, activeCreateLibrary?.id, doc?.library_id],
  );

  const workspaceLibrarySlug = React.useMemo(
    () => (isCreate ? activeCreateLibrary?.slug || null : (doc?.library_slug || null)),
    [isCreate, activeCreateLibrary?.slug, doc?.library_slug],
  );

  const { data: folderTree } = useQuery({
    queryKey: ['knowledge-folders-tree', workspaceLibraryId],
    queryFn: async () => (
      await api.get('/knowledge-folders/tree', { params: { library_id: workspaceLibraryId } })
    ).data as { items?: Array<any> },
    enabled: !!workspaceLibraryId,
  });

  const { data: classificationData } = useQuery({
    queryKey: ['knowledge-classification-options'],
    queryFn: async () => (await api.get('/knowledge/classification-options')).data as ClassificationResponse,
    enabled: !isCreate && canManageDocument,
  });

  const { data: contributorOptions = [] } = useQuery({
    queryKey: ['knowledge-contributor-options'],
    queryFn: async () => (await api.get('/knowledge/contributor-options')).data as KnowledgeContributorOption[],
    enabled: !isCreate && canManageDocument,
  });

  // Relation search queries
  const { data: applicationOptions = [] } = useQuery({
    queryKey: ['knowledge-relation-options', 'applications', relationSearch.applications],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/applications', {
        params: { q: relationSearch.applications || undefined, limit: 50, sort: 'name:ASC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && canManageDocument,
  });

  const { data: assetOptions = [] } = useQuery({
    queryKey: ['knowledge-relation-options', 'assets', relationSearch.assets],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/assets', {
        params: { q: relationSearch.assets || undefined, limit: 50, sort: 'name:ASC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && canManageDocument,
  });

  const { data: projectOptions = [] } = useQuery({
    queryKey: ['knowledge-relation-options', 'projects', relationSearch.projects],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/projects', {
        params: { q: relationSearch.projects || undefined, limit: 50, sort: 'name:ASC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && canManageDocument,
  });

  const { data: requestOptions = [] } = useQuery({
    queryKey: ['knowledge-relation-options', 'requests', relationSearch.requests],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/requests', {
        params: { q: relationSearch.requests || undefined, limit: 50, sort: 'name:ASC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && canManageDocument,
  });

  const { data: taskOptions = [] } = useQuery({
    queryKey: ['knowledge-relation-options', 'tasks', relationSearch.tasks],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/tasks', {
        params: { q: relationSearch.tasks || undefined, limit: 50, sort: 'created_at:DESC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && canManageDocument,
  });

  const parseLockInfo = React.useCallback((raw: any): EditLockInfo | null => {
    if (!raw || typeof raw !== 'object') return null;
    const holderUserId = String(raw.holder_user_id || '').trim();
    const expiresAt = String(raw.expires_at || '').trim();
    if (!holderUserId || !expiresAt) return null;
    return {
      holder_user_id: holderUserId,
      holder_name: String(raw.holder_name || holderUserId).trim() || holderUserId,
      acquired_at: raw.acquired_at ? String(raw.acquired_at) : null,
      heartbeat_at: raw.heartbeat_at ? String(raw.heartbeat_at) : null,
      expires_at: expiresAt,
    };
  }, []);

  const parseLockInfoFromError = React.useCallback(
    (e: any) => parseLockInfo(e?.response?.data?.lock),
    [parseLockInfo],
  );

  // Sync doc data to form state
  React.useEffect(() => {
    if (!doc || isCreate) return;
    const incomingRelations = doc.relations || {};
    const mapRelation = (item: any) => ({ id: item?.id || item, label: item?.name || item?.id || item });
    const incomingContributors = Array.isArray(doc.contributors) ? doc.contributors : [];
    const nextRelations: Record<RelationKey, RelationOption[]> = {
      applications: (incomingRelations.applications || []).map(mapRelation),
      assets: (incomingRelations.assets || []).map(mapRelation),
      projects: (incomingRelations.projects || []).map(mapRelation),
      requests: (incomingRelations.requests || []).map(mapRelation),
      tasks: (incomingRelations.tasks || []).map(mapRelation),
    };

    const nextClassifications: ClassificationRow[] = Array.isArray(doc.classifications)
      ? doc.classifications
          .map((row: any) => ({
            category_id: String(row?.category_id || ''),
            stream_id: row?.stream_id ? String(row.stream_id) : null,
          }))
          .filter((row: ClassificationRow) => !!row.category_id)
      : [];
    const ownerContributor = incomingContributors.find((row: any) => row?.role === 'owner' && row?.is_primary)
      || incomingContributors.find((row: any) => row?.role === 'owner')
      || incomingContributors[0]
      || null;
    const nextContributorAssignments: ContributorAssignments = {
      owner_user_id: ownerContributor?.user_id ? String(ownerContributor.user_id) : null,
      author_user_ids: Array.from(new Set(incomingContributors
        .filter((row: any) => row?.role === 'author' && row?.user_id)
        .map((row: any) => String(row.user_id)))),
      reviewer_user_ids: Array.from(new Set(incomingContributors
        .filter((row: any) => row?.role === 'reviewer' && row?.user_id)
        .map((row: any) => String(row.user_id)))),
      approver_user_ids: Array.from(new Set(incomingContributors
        .filter((row: any) => row?.role === 'validator' && row?.user_id)
        .map((row: any) => String(row.user_id)))),
    };

    setForm({
      title: doc.title || '',
      summary: doc.summary || '',
      content_markdown: doc.content_markdown || '',
      status: doc.status || 'draft',
      folder_id: doc.folder_id || null,
      document_type_id: doc.document_type_id || null,
      template_document_id: doc.template_document_id || null,
      template_document_title: doc.template_document_title || '',
      template_document_type_id: doc.template_document_type_id || null,
      template_document_type_name: doc.template_document_type_name || '',
      revision: Number(doc.revision || 1),
      relations: incomingRelations,
      contributors: incomingContributors,
      classifications: doc.classifications || [],
    });
    setRelationSelections(nextRelations);
    setRelationsDirty(false);
    setClassificationRows(nextClassifications);
    setClassificationsDirty(false);
    setContributorAssignments(nextContributorAssignments);
    setContributorsDirty(false);
    setDirty(false);
  }, [doc, isCreate]);

  // Replace UUID in URL with item_ref
  React.useEffect(() => {
    if (isCreate) return;
    if (!doc?.item_number) return;
    const isUuid = /^[0-9a-f]{8}-/i.test(id);
    if (!isUuid) return;
    const search = location.search || '';
    const next = `/knowledge/DOC-${doc.item_number}${search}`;
    window.history.replaceState(null, '', next);
  }, [doc?.item_number, id, isCreate, location.search]);

  // Lock management
  const acquireLock = React.useCallback(async () => {
    if (isCreate || lockToken) return;
    const res = await api.post(`/knowledge/${id}/locks`);
    setLockToken(res.data?.lock_token || null);
    setLockExpiresAt(res.data?.expires_at || null);
    setActiveLockInfo(null);
  }, [id, isCreate, lockToken]);

  const releaseLock = React.useCallback(async () => {
    if (isCreate || !lockToken) return;
    try {
      await api.delete(`/knowledge/${id}/locks`, {
        headers: { 'X-Lock-Token': lockToken },
      });
    } catch { /* best effort */ }
    setLockToken(null);
    setLockExpiresAt(null);
  }, [id, isCreate, lockToken]);

  React.useEffect(() => {
    if (isCreate || lockToken) {
      setActiveLockInfo(null);
      return;
    }
    setActiveLockInfo(parseLockInfo(doc?.edit_lock));
  }, [doc?.edit_lock, isCreate, lockToken, parseLockInfo]);

  // Lock heartbeat
  React.useEffect(() => {
    if (!editMode || isCreate || !lockToken) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await api.post(`/knowledge/${id}/locks/heartbeat`, null, {
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
  }, [editMode, id, isCreate, lockToken, parseLockInfoFromError]);

  // Release lock on unmount
  React.useEffect(() => {
    return () => { void releaseLock(); };
  }, [releaseLock]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (mode: 'manual' | 'autosave') => {
      if (isCreate) {
        if (!workspaceLibraryId) {
          throw new Error('No destination library available');
        }
        const payload = {
          title: form.title,
          summary: form.summary,
          content_markdown: form.content_markdown,
          status: form.status,
          folder_id: form.folder_id || null,
          library_id: workspaceLibraryId,
          document_type_id: form.document_type_id || null,
          template_document_id: form.template_document_id || null,
          ...(profile?.id ? { owner_user_id: profile.id } : {}),
        };
        const res = await api.post('/knowledge', payload);
        return { mode, data: res.data, created: true };
      }

      const payload = {
        title: form.title,
        summary: form.summary,
        content_markdown: form.content_markdown,
        status: form.status,
        folder_id: form.folder_id || null,
        document_type_id: form.document_type_id || null,
        template_document_id: form.template_document_id || null,
        revision: form.revision,
        save_mode: mode,
      };
      const res = await api.patch(`/knowledge/${id}`, payload, {
        headers: lockToken ? { 'X-Lock-Token': lockToken } : undefined,
      });
      return { mode, data: res.data, created: false };
    },
    onSuccess: async (result) => {
      setError(null);
      setDirty(false);
      if (result.created) {
        const newId = result.data?.id;
        const itemRef = result.data?.item_ref || `DOC-${result.data?.item_number}`;

        // Acquire lock on the newly-created document so the user stays in
        // edit mode with a valid lock (the component instance is reused by
        // React Router, so editMode=true persists across the navigation).
        if (newId) {
          try {
            const lockRes = await api.post(`/knowledge/${newId}/locks`);
            setLockToken(lockRes.data?.lock_token || null);
            setLockExpiresAt(lockRes.data?.expires_at || null);
          } catch {
            // Lock failed — user can re-enter edit mode manually
          }
        }

        const sp = new URLSearchParams();
        if (workspaceLibrarySlug) sp.set('library', workspaceLibrarySlug);
        sp.set('allLibraries', '0');
        const qs = sp.toString();
        navigate(`/knowledge/${itemRef}${qs ? `?${qs}` : ''}`, { replace: true });
        return;
      }
      setForm((prev: any) => ({ ...prev, revision: Number(result.data?.revision || prev.revision + 1) }));
      await qc.invalidateQueries({ queryKey: ['knowledge', id] });
      await qc.invalidateQueries({ queryKey: ['knowledge-versions', id] });
      await qc.invalidateQueries({ queryKey: ['knowledge-activities', id] });
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

  // Autosave
  React.useEffect(() => {
    if (!editMode || !dirty || isCreate) return;
    if (!lockToken) return;
    const timer = window.setInterval(() => {
      void saveMutation.mutate('autosave');
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [dirty, editMode, isCreate, lockToken, saveMutation]);

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/knowledge/${id}/activities`, {
        type: 'comment',
        content: commentText,
      });
    },
    onSuccess: async () => {
      setCommentText('');
      await qc.invalidateQueries({ queryKey: ['knowledge-activities', id] });
    },
  });

  // Revert mutation
  const revertMutation = useMutation({
    mutationFn: async (versionNumber: number) => {
      await api.post(`/knowledge/${id}/revert/${versionNumber}`, null, {
        headers: lockToken ? { 'X-Lock-Token': lockToken } : undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['knowledge', id] }),
        qc.invalidateQueries({ queryKey: ['knowledge-versions', id] }),
        qc.invalidateQueries({ queryKey: ['knowledge-activities', id] }),
      ]);
      await refetch();
    },
  });

  // File operations
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/knowledge/${id}/attachments`, formData);
    await refetchFiles();
  };

  const uploadInlineImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ id: string }>(`/knowledge/${id}/attachments/inline`, formData);
    const tenantSlug = getTenantSlugFromHostname(window.location.hostname);
    return buildInlineImageUrl(`/knowledge/inline/${tenantSlug}/${res.data.id}`);
  };

  const deleteFile = async (attachmentId: string) => {
    await api.delete(`/knowledge/${id}/attachments/${attachmentId}`);
    await refetchFiles();
  };

  // Edit mode transitions
  const startEdit = React.useCallback(async (opts?: { silentConflict?: boolean }) => {
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
  }, [acquireLock, doc?.edit_lock, parseLockInfo, parseLockInfoFromError]);

  const discardChanges = async () => {
    if (!dirty) return;
    const confirmed = window.confirm('Discard unsaved changes and revert to the last saved version?');
    if (!confirmed) return;
    // Refetch the document to get the last saved state
    const result = await refetch();
    if (result.data) {
      const d = result.data;
      setForm({
        title: d.title || '',
        summary: d.summary || '',
        content_markdown: d.content_markdown || '',
        status: d.status || 'draft',
        folder_id: d.folder_id || null,
        document_type_id: d.document_type_id || null,
        template_document_id: d.template_document_id || null,
        template_document_title: d.template_document_title || '',
        template_document_type_id: d.template_document_type_id || null,
        template_document_type_name: d.template_document_type_name || '',
        revision: Number(d.revision || 1),
        relations: d.relations || {},
        contributors: d.contributors || [],
        classifications: d.classifications || [],
      });
    }
    setDirty(false);
    setError(null);
  };

  // Derived data
  const folderOptions = React.useMemo(() => {
    const out: Array<{ id: string; label: string }> = [];
    const walk = (nodes: Array<any>, depth: number) => {
      nodes.forEach((node) => {
        out.push({ id: node.id, label: `${'  '.repeat(depth)}${node.name}` });
        if (Array.isArray(node.children) && node.children.length > 0) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(folderTree?.items || [], 0);
    return out;
  }, [folderTree?.items]);

  const allRelationOptions = React.useMemo<Record<RelationKey, RelationOption[]>>(
    () => ({
      applications: applicationOptions,
      assets: assetOptions,
      projects: projectOptions,
      requests: requestOptions,
      tasks: taskOptions,
    }),
    [applicationOptions, assetOptions, projectOptions, requestOptions, taskOptions],
  );

  const documentTypeOptionsForForm = React.useMemo(
    () => documentTypes.filter((row) => row.is_active || row.id === form.document_type_id),
    [documentTypes, form.document_type_id],
  );

  // Enrich relation labels from fetched options
  React.useEffect(() => {
    setRelationSelections((prev) => {
      const next: Record<RelationKey, RelationOption[]> = { ...prev };
      (Object.keys(next) as RelationKey[]).forEach((key) => {
        const byId = new Map(allRelationOptions[key].map((option) => [option.id, option.label]));
        next[key] = next[key].map((entry) => ({
          ...entry,
          label: byId.get(entry.id) || entry.label || entry.id,
        }));
      });
      return next;
    });
  }, [allRelationOptions]);

  const handleFormChange = React.useCallback((field: string, value: any) => {
    setForm((prev: any) => {
      const next = { ...prev, [field]: value };
      if (
        field === 'document_type_id'
        && prev.template_document_id
        && prev.template_document_type_id
        && value
        && value !== prev.template_document_type_id
      ) {
        next.template_document_id = null;
        next.template_document_title = '';
        next.template_document_type_id = null;
        next.template_document_type_name = '';
      }
      return next;
    });
    setDirty(true);
  }, []);

  // Save relations
  const saveRelationsMutation = useMutation({
    mutationFn: async () => {
      if (isCreate) return;
      const relationKeys: RelationKey[] = ['applications', 'assets', 'projects', 'requests', 'tasks'];
      for (const key of relationKeys) {
        const ids = Array.from(new Set((relationSelections[key] || []).map((option) => option.id).filter(Boolean)));
        await api.post(`/knowledge/${id}/relations/${key}/bulk-replace`, {
          [RELATION_BODY_KEYS[key]]: ids,
        });
      }
    },
    onSuccess: async () => {
      setRelationsError(null);
      setRelationsDirty(false);
      await qc.invalidateQueries({ queryKey: ['knowledge', id] });
    },
    onError: (e: any) => {
      setRelationsError(e?.response?.data?.message || e?.message || 'Failed to save relations');
    },
  });

  // Save classifications
  const saveClassificationsMutation = useMutation({
    mutationFn: async () => {
      if (isCreate) return;
      const rows = classificationRows
        .filter((row) => !!row.category_id)
        .map((row) => ({ category_id: row.category_id, stream_id: row.stream_id || null }));
      await api.post(`/knowledge/${id}/classifications/bulk-replace`, { classifications: rows });
    },
    onSuccess: async () => {
      setClassificationError(null);
      setClassificationsDirty(false);
      await qc.invalidateQueries({ queryKey: ['knowledge', id] });
    },
    onError: (e: any) => {
      setClassificationError(e?.response?.data?.message || e?.message || 'Failed to save classifications');
    },
  });

  const saveContributorsMutation = useMutation({
    mutationFn: async () => {
      if (isCreate) return;
      const ownerUserId = contributorAssignments.owner_user_id || profile?.id || null;
      if (!ownerUserId) {
        throw new Error('Select an owner before saving contributors');
      }
      const rows = [
        { user_id: ownerUserId, role: 'owner', is_primary: true },
        ...Array.from(new Set(contributorAssignments.author_user_ids.filter((entry) => entry && entry !== ownerUserId)))
          .map((user_id) => ({ user_id, role: 'author', is_primary: false })),
        ...Array.from(new Set(contributorAssignments.reviewer_user_ids.filter(Boolean)))
          .map((user_id) => ({ user_id, role: 'reviewer', is_primary: false })),
        ...Array.from(new Set(contributorAssignments.approver_user_ids.filter(Boolean)))
          .map((user_id) => ({ user_id, role: 'validator', is_primary: false })),
      ];
      await api.post(`/knowledge/${id}/contributors/bulk-replace`, { contributors: rows });
    },
    onSuccess: async () => {
      setContributorsError(null);
      setContributorsDirty(false);
      await qc.invalidateQueries({ queryKey: ['knowledge', id] });
    },
    onError: (e: any) => {
      setContributorsError(e?.response?.data?.message || e?.message || 'Failed to save contributors');
    },
  });

  const requestReviewMutation = useMutation({
    mutationFn: async () => {
      if (isCreate) return;
      await api.post(`/knowledge/${id}/workflow/request`, {
        revision: Number(form.revision || 0),
      });
    },
    onSuccess: async () => {
      setError(null);
      setEditMode(false);
      setLockToken(null);
      setLockExpiresAt(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['knowledge', id] }),
        qc.invalidateQueries({ queryKey: ['knowledge-activities', id] }),
      ]);
      await refetch();
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message || e?.message || 'Failed to request review');
    },
  });

  const approveWorkflowMutation = useMutation({
    mutationFn: async (comment: string) => {
      await api.post(`/knowledge/${id}/workflow/approve`, {
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['knowledge', id] }),
        qc.invalidateQueries({ queryKey: ['knowledge-activities', id] }),
      ]);
      await refetch();
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message || e?.message || 'Failed to approve workflow');
    },
  });

  const requestChangesWorkflowMutation = useMutation({
    mutationFn: async (comment: string) => {
      await api.post(`/knowledge/${id}/workflow/request-changes`, { comment });
    },
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['knowledge', id] }),
        qc.invalidateQueries({ queryKey: ['knowledge-activities', id] }),
      ]);
      await refetch();
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message || e?.message || 'Failed to request changes');
    },
  });

  const cancelWorkflowMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/knowledge/${id}/workflow/cancel`);
    },
    onSuccess: async () => {
      setError(null);
      setEditMode(false);
      setLockToken(null);
      setLockExpiresAt(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['knowledge', id] }),
        qc.invalidateQueries({ queryKey: ['knowledge-activities', id] }),
      ]);
      await refetch();
      await startEdit({ silentConflict: true });
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message || e?.message || 'Failed to cancel review');
    },
  });

  const classificationCategories = React.useMemo(
    () => (classificationData?.categories || []).filter((row) => row?.is_active !== false),
    [classificationData?.categories],
  );

  const classificationStreams = React.useMemo(
    () => (classificationData?.streams || []).filter((row) => row?.is_active !== false),
    [classificationData?.streams],
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  const isTitleMissing = !form.title?.trim();
  const titleBarSx = {
    px: 1.5,
    py: 0.75,
    borderRadius: 1.5,
    border: 1,
    borderColor: isTitleMissing
      ? alpha(theme.palette.info.main, 0.25)
      : 'divider',
    bgcolor: isTitleMissing
      ? alpha(theme.palette.info.main, 0.08)
      : 'background.paper',
    transition: 'border-color 120ms ease, background-color 120ms ease',
  } as const;

  const libraryName = isCreate ? activeCreateLibrary?.name : doc?.library_name;
  const libraryListUrl = `/knowledge?library=${encodeURIComponent(workspaceLibrarySlug || '')}&allLibraries=0`;
  const workflow = doc?.workflow || null;
  const workflowActive = !!workflow?.is_active;
  const isValidatedCurrentRevision = !!doc?.is_validated_current_revision;
  const validatedAtLabel = doc?.validated_at ? new Date(doc.validated_at).toLocaleString() : null;
  const isManagedIntegratedDocument = !isCreate && !!doc?.is_managed_integrated_document;
  const managedIntegratedBinding = isManagedIntegratedDocument ? doc?.integrated_binding || null : null;
  const managedSlotLabel = managedIntegratedBinding?.slot_key === 'risks_mitigations'
    ? 'Risks & Mitigations'
    : managedIntegratedBinding?.slot_key === 'purpose'
      ? 'Purpose'
      : null;
  const managedSourceTypeLabel = managedIntegratedBinding?.source_entity_type === 'requests'
    ? 'Request'
    : managedIntegratedBinding?.source_entity_type === 'projects'
      ? 'Project'
      : managedIntegratedBinding?.source_entity_type === 'applications'
        ? 'Application'
        : managedIntegratedBinding?.source_entity_type === 'assets'
          ? 'Asset'
          : null;
  const managedSourceLabel = managedSourceTypeLabel && managedSlotLabel
    ? `${managedSourceTypeLabel} ${managedSlotLabel}`
    : managedSourceTypeLabel;
  const hasWorkflowAssignments = contributorAssignments.reviewer_user_ids.length > 0 || contributorAssignments.approver_user_ids.length > 0;
  const hasPendingWorkflowChanges = dirty || relationsDirty || classificationsDirty || contributorsDirty;
  const isLockedByAnotherUser = !!activeLockInfo?.holder_user_id && activeLockInfo.holder_user_id !== profile?.id;
  const workspaceReadOnly = !isCreate && isLockedByAnotherUser;
  const canEditContent = isCreate || (!workflowActive && editMode && !!lockToken);
  const canManageDocumentState = isCreate || (canManageDocument && !workflowActive && editMode && !!lockToken);
  const lockHolderLabel = activeLockInfo?.holder_name || 'another user';
  const currentWorkflowStage = workflow?.current_stage || null;
  const currentWorkflowParticipant = Array.isArray(workflow?.participants)
    ? workflow.participants.find((row: any) => row?.user_id === profile?.id && row?.stage === currentWorkflowStage)
    : null;
  const canApproveWorkflow = !!currentWorkflowParticipant && currentWorkflowParticipant.decision === 'pending';
  const canRequestReview = !isCreate
    && canManageDocument
    && !isManagedIntegratedDocument
    && !workflowActive
    && !isLockedByAnotherUser
    && !hasPendingWorkflowChanges
    && hasWorkflowAssignments
    && !['archived', 'obsolete'].includes(String(form.status || '').toLowerCase());
  const lockExpiryLabel = (() => {
    if (!activeLockInfo?.expires_at) return null;
    const dt = new Date(activeLockInfo.expires_at);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleString();
  })();

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <MLink component={Link} underline="hover" color="inherit" to="/knowledge">Knowledge</MLink>
          {libraryName && (
            <MLink component={Link} underline="hover" color="inherit" to={libraryListUrl}>{libraryName}</MLink>
          )}
          <Typography color="text.primary">
            {isCreate ? 'New Document' : (doc?.item_ref || id)}
          </Typography>
        </Breadcrumbs>
        <Stack direction="row" alignItems="center" spacing={1}>
          {!isCreate && isValidatedCurrentRevision && (
            <ValidatedBadge size="small" validatedAtLabel={validatedAtLabel} />
          )}
          {!isCreate && !workflowActive && !editMode && canManageDocument && (
            <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => { void startEdit(); }}>
              {isLockedByAnotherUser ? 'Retry lock' : 'Edit'}
            </Button>
          )}
          {!isCreate && workflowActive && canManageDocument && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => cancelWorkflowMutation.mutate()}
              disabled={cancelWorkflowMutation.isPending}
            >
              Cancel Review and Edit
            </Button>
          )}
          {!isCreate && !workflowActive && canManageDocument && !isManagedIntegratedDocument && (
            <Button
              variant="outlined"
              size="small"
              disabled={!canRequestReview || requestReviewMutation.isPending}
              onClick={() => requestReviewMutation.mutate()}
            >
              Request Review
            </Button>
          )}
          {!isCreate && !workflowActive && editMode && dirty && canManageDocument && (
            <Button variant="outlined" size="small" onClick={discardChanges}>
              Discard
            </Button>
          )}
          <ExportButton
            content={form.content_markdown || ''}
            title={String(form.title || (!isCreate ? doc?.item_ref : '') || 'knowledge-document')}
          />
          {canManageDocument && !workflowActive && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              disabled={workspaceReadOnly || saveMutation.isPending || (!dirty && !isCreate)}
              onClick={() => saveMutation.mutate('manual')}
            >
              Save
            </Button>
          )}
          <IconButton
            size="small"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? <ChevronRightIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!canManageDocument && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have read-only access to this knowledge article.
        </Alert>
      )}

      {workflowActive && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This document is in review. Editing is disabled until the workflow is approved, changes are requested, or the review is cancelled.
        </Alert>
      )}

      {isLockedByAnotherUser && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={canManageDocument && !workflowActive ? (
            <Button size="small" onClick={() => { void startEdit(); }}>
              Retry lock
            </Button>
          ) : undefined}
        >
          This knowledge article is locked by {lockHolderLabel}
          {lockExpiryLabel ? ` until ${lockExpiryLabel}` : ''}. You can read it while the lock is active.
        </Alert>
      )}

      {isManagedIntegratedDocument && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This is a managed integrated document. Body content stays editable here, but title, folder, type, template, and source relations are controlled by the source workspace.
        </Alert>
      )}

      <Stack direction="row" spacing={0} sx={{ height: 'calc(100vh - 130px)' }}>
        {/* Folder tree */}
        {!!workspaceLibraryId && (
          <FolderTreePanel
            libraryId={workspaceLibraryId}
            selectedFolderId={form.folder_id || null}
            onSelectFolder={(folderId) => {
              const sp = new URLSearchParams();
              if (workspaceLibrarySlug) sp.set('library', workspaceLibrarySlug);
              sp.set('allLibraries', '0');
              if (folderId) sp.set('folder_id', folderId);
              const qs = sp.toString();
              navigate(`/knowledge${qs ? `?${qs}` : ''}`);
            }}
            canManage={false}
          />
        )}

        {/* Main content area */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', ml: 2 }}>
          <Paper
            variant="outlined"
            sx={{ p: 2, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Inline title bar — Task pattern */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexShrink: 0 }}>
                {!isCreate && doc?.item_number && (
                  <Chip
                    label={`DOC-${doc.item_number}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', flexShrink: 0 }}
                    onClick={() => navigator.clipboard.writeText(`DOC-${doc.item_number}`)}
                    title="Click to copy reference"
                  />
                )}
                {isManagedIntegratedDocument && (
                  <Chip
                    label="Integrated"
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
                {isManagedIntegratedDocument && managedSourceLabel && (
                  <Chip
                    label={managedSourceLabel}
                    size="small"
                    variant="outlined"
                  />
                )}
                <Box sx={{ ...titleBarSx, flex: 1 }}>
                  {canEditContent && !isManagedIntegratedDocument ? (
                    <TextField
                      value={form.title || ''}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          setContentFocusNonce((n) => n + 1);
                        }
                      }}
                      variant="standard"
                      fullWidth
                      autoFocus={isCreate}
                      placeholder="Knowledge title"
                      InputProps={{
                        disableUnderline: true,
                        sx: { fontSize: '1.5rem', fontWeight: 600 },
                      }}
                    />
                  ) : (
                    <Typography variant="h5" sx={{ fontWeight: 600, py: 0.4 }}>
                      {form.title || 'Untitled Knowledge'}
                    </Typography>
                  )}
                </Box>
              </Stack>

              <Box ref={editorHostRef} sx={{ flex: 1, minHeight: 0 }}>
                <MarkdownEditor
                  value={form.content_markdown || ''}
                  onChange={(value) => handleFormChange('content_markdown', value)}
                  disabled={!canEditContent}
                  focusNonce={contentFocusNonce}
                  onImageUpload={!isCreate ? uploadInlineImage : undefined}
                  minRows={editorRows}
                  maxRows={editorRows}
                />
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Sidebar */}
        {sidebarOpen && (
          <Box
            sx={{
              width: 340,
              minWidth: 340,
              borderLeft: 1,
              borderColor: 'divider',
              overflow: 'hidden',
              ml: 0,
            }}
          >
            <KnowledgeSidebar
              doc={doc}
              form={form}
              onChange={handleFormChange}
              isCreate={isCreate}
              editMode={canEditContent}
              canManage={canManageDocumentState && !workspaceReadOnly}
              canComment={canManageDocument && !workspaceReadOnly}
              contributorOptions={contributorOptions}
              contributorAssignments={contributorAssignments}
              onContributorAssignmentsChange={(next) => {
                setContributorAssignments(next);
                setContributorsError(null);
                setContributorsDirty(true);
              }}
              onSaveContributors={() => saveContributorsMutation.mutate()}
              savingContributors={saveContributorsMutation.isPending}
              contributorsDirty={contributorsDirty}
              contributorsError={contributorsError}
              documentTypeOptions={documentTypeOptionsForForm}
              folderOptions={folderOptions}
              classificationCategories={classificationCategories}
              classificationStreams={classificationStreams}
              classificationRows={classificationRows}
              onClassificationRowsChange={(rows) => { setClassificationRows(rows); setClassificationsDirty(true); }}
              onSaveClassifications={() => saveClassificationsMutation.mutate()}
              savingClassifications={saveClassificationsMutation.isPending}
              classificationsDirty={classificationsDirty}
              classificationError={classificationError}
              relationSelections={relationSelections}
              onRelationSelectionsChange={(key, values) => {
                setRelationSelections((prev) => ({ ...prev, [key]: values }));
                setRelationsDirty(true);
              }}
              relationSearch={relationSearch}
              onRelationSearchChange={(key, value) => {
                setRelationSearch((prev) => ({ ...prev, [key]: value }));
              }}
              relationOptions={allRelationOptions}
              onSaveRelations={() => saveRelationsMutation.mutate()}
              savingRelations={saveRelationsMutation.isPending}
              relationsDirty={relationsDirty}
              relationsError={relationsError}
              files={files || []}
              onUploadFile={uploadFile}
              onDeleteFile={deleteFile}
              versions={versions || []}
              onRevertVersion={(vn) => revertMutation.mutate(vn)}
              revertingVersion={revertMutation.isPending}
              lockToken={lockToken}
              workflow={workflow}
              latestApprovedWorkflow={doc?.latest_approved_workflow || null}
              currentUserId={profile?.id || null}
              canApproveWorkflow={canApproveWorkflow}
              onApproveWorkflow={(comment) => approveWorkflowMutation.mutateAsync(comment)}
              approvingWorkflow={approveWorkflowMutation.isPending}
              onRequestWorkflowChanges={(comment) => requestChangesWorkflowMutation.mutateAsync(comment)}
              requestingWorkflowChanges={requestChangesWorkflowMutation.isPending}
              activities={activities || []}
              commentText={commentText}
              onCommentTextChange={setCommentText}
              onPostComment={() => commentMutation.mutate()}
              postingComment={commentMutation.isPending}
            />
          </Box>
        )}
      </Stack>
    </>
  );
}
