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
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import ExportButton from '../../components/ExportButton';
import ImportButton from '../../components/ImportButton';
import { importDocument as importMarkdownDocument, type ImportDocumentResult } from '../../api/endpoints/import';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/useLocale';
import { buildInlineImageUrl, resolveInlineImageTenantSlug } from '../../utils/inlineImageUrls';
import { useTenant } from '../../tenant/TenantContext';
import { useRecentKnowledgeDocuments } from '../workspace/hooks/useRecentKnowledgeDocuments';
import KnowledgeSidebar from './components/KnowledgeSidebar';
import FolderTreePanel from './components/FolderTreePanel';
import ValidatedBadge from './components/ValidatedBadge';
import { CircularProgress } from '@mui/material';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { normalizeMarkdownForRichTextEditor } from '../../lib/markdownEditorNormalization';

const MarkdownEditor = React.lazy(() => import('../../components/MarkdownEditor'));

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

function buildCreateRelationSelections(searchParams: URLSearchParams): Record<RelationKey, RelationOption[]> {
  const relationParamMap: Array<[RelationKey, string]> = [
    ['applications', 'application_id'],
    ['assets', 'asset_id'],
    ['projects', 'project_id'],
    ['requests', 'request_id'],
    ['tasks', 'task_id'],
  ];

  const next = { ...EMPTY_RELATIONS };
  for (const [key, param] of relationParamMap) {
    const value = String(searchParams.get(param) || '').trim();
    if (!value) continue;
    next[key] = [{ id: value, label: value }];
  }
  return next;
}

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

const EMPTY_RELATION_OPTIONS: RelationOption[] = [];
const EMPTY_CONTRIBUTOR_OPTIONS: KnowledgeContributorOption[] = [];
const EMPTY_VERSION_LIST: any[] = [];
const EMPTY_ACTIVITY_LIST: any[] = [];

type EditLockInfo = {
  holder_user_id: string;
  holder_name: string;
  acquired_at?: string | null;
  heartbeat_at?: string | null;
  expires_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
  archived: 'Archived',
  obsolete: 'Obsolete',
};

const STATUS_CHIP_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'secondary'> = {
  draft: 'default',
  in_review: 'warning',
  published: 'success',
  archived: 'secondary',
  obsolete: 'default',
};

function MarkdownEditorLoadingFallback({ minRows }: { minRows: number }) {
  return (
    <Box
      sx={{
        minHeight: minRows * 24,
        height: '100%',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <CircularProgress size={24} />
    </Box>
  );
}

export default function KnowledgeWorkspacePage() {
  const theme = useTheme();
  const { t } = useTranslation(['knowledge', 'common']);
  const locale = useLocale();
  const { profile, hasLevel } = useAuth();
  const { tenantSlug } = useTenant();
  const { addDocument } = useRecentKnowledgeDocuments();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const inlineImageTenantSlug = resolveInlineImageTenantSlug(tenantSlug, window.location.hostname);
  const isCreate = location.pathname === '/knowledge/new' || location.pathname.startsWith('/knowledge/new/');
  const id = isCreate ? 'new' : String(params.id || '');
  const searchParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedLibrarySlug = searchParams.get('library') || '';
  const templateDocumentIdParam = searchParams.get('template_document_id') || null;
  const createRelationSelections = React.useMemo(
    () => buildCreateRelationSelections(searchParams),
    [searchParams],
  );

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
  const [relationSelections, setRelationSelections] = React.useState<Record<RelationKey, RelationOption[]>>(
    () => (isCreate ? createRelationSelections : EMPTY_RELATIONS),
  );
  const [classificationRows, setClassificationRows] = React.useState<ClassificationRow[]>([]);
  const [relationsError, setRelationsError] = React.useState<string | null>(null);
  const [relationsDirty, setRelationsDirty] = React.useState(false);
  const [classificationError, setClassificationError] = React.useState<string | null>(null);
  const [classificationsDirty, setClassificationsDirty] = React.useState(false);
  const [contributorAssignments, setContributorAssignments] = React.useState<ContributorAssignments>(EMPTY_CONTRIBUTOR_ASSIGNMENTS);
  const [contributorsDirty, setContributorsDirty] = React.useState(false);
  const [contributorsError, setContributorsError] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const canManageDocument = hasLevel('knowledge', 'member');
  const [contentFocusNonce, setContentFocusNonce] = React.useState(0);
  const [contentResetNonce, setContentResetNonce] = React.useState(0);
  const [contentHasText, setContentHasText] = React.useState(false);
  const [editorRows, setEditorRows] = React.useState(30);
  const contentDraftRef = React.useRef('');
  const hydratedDocumentIdRef = React.useRef<string | null>(null);
  const hasLocalWorkspaceChangesRef = React.useRef(false);
  const trackedRecentDocumentIdRef = React.useRef<string | null>(null);

  hasLocalWorkspaceChangesRef.current = dirty || relationsDirty || classificationsDirty || contributorsDirty;

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [id, isCreate]);

  React.useEffect(() => {
    if (!isCreate) return;
    setRelationSelections(createRelationSelections);
    setRelationsDirty(false);
  }, [createRelationSelections, isCreate]);

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
    let nextTemplateContent: string | null = null;
    setForm((prev: any) => {
      const next = { ...prev };
      if (!prev.content_markdown) {
        next.content_markdown = templateDoc.content_markdown || '';
        nextTemplateContent = next.content_markdown;
      }
      next.template_document_id = templateDoc.id || templateDocumentIdParam || null;
      next.template_document_title = templateDoc.title || '';
      next.template_document_type_id = templateDoc.template_document_type_id || templateDoc.document_type_id || null;
      next.template_document_type_name = templateDoc.template_document_type_name || templateDoc.document_type_name || '';
      next.document_type_id = templateDoc.document_type_id || next.document_type_id || null;
      return next;
    });
    if (nextTemplateContent != null) {
      contentDraftRef.current = nextTemplateContent;
      setContentHasText(!!String(nextTemplateContent || '').trim());
    }
  }, [isCreate, templateDoc, templateDocumentIdParam]);

  // Data queries
  const { data: doc, isLoading, refetch } = useQuery({
    queryKey: ['knowledge', id],
    queryFn: async () => (await api.get(`/knowledge/${id}`)).data,
    enabled: !isCreate,
  });

  React.useEffect(() => {
    if (isCreate || !doc?.id) return;
    if (trackedRecentDocumentIdRef.current === doc.id) return;
    trackedRecentDocumentIdRef.current = doc.id;
    const itemNumber = doc?.item_number ? `DOC-${doc.item_number}` : t('shared.document');
    const title = String(doc?.title || '').trim();
    addDocument(doc.id, title ? `${itemNumber} - ${title}` : itemNumber);
  }, [addDocument, doc?.id, doc?.item_number, doc?.title, isCreate, t]);

  const { data: versions } = useQuery({
    queryKey: ['knowledge-versions', id],
    queryFn: async () => (await api.get(`/knowledge/${id}/versions`)).data,
    enabled: !isCreate && sidebarOpen,
  });

  const { data: activities } = useQuery({
    queryKey: ['knowledge-activities', id],
    queryFn: async () => (await api.get(`/knowledge/${id}/activities`)).data,
    enabled: !isCreate && sidebarOpen,
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
    enabled: !isCreate && sidebarOpen && canManageDocument,
    staleTime: 5 * 60 * 1000,
  });

  const { data: contributorOptions = EMPTY_CONTRIBUTOR_OPTIONS } = useQuery({
    queryKey: ['knowledge-contributor-options'],
    queryFn: async () => (await api.get('/knowledge/contributor-options')).data as KnowledgeContributorOption[],
    enabled: !isCreate && sidebarOpen && canManageDocument,
    staleTime: 5 * 60 * 1000,
  });

  // Relation search queries
  const { data: applicationOptions = EMPTY_RELATION_OPTIONS } = useQuery({
    queryKey: ['knowledge-relation-options', 'applications', relationSearch.applications],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/applications', {
        params: { q: relationSearch.applications || undefined, limit: 50, sort: 'name:ASC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && sidebarOpen && canManageDocument,
    staleTime: 60_000,
  });

  const { data: assetOptions = EMPTY_RELATION_OPTIONS } = useQuery({
    queryKey: ['knowledge-relation-options', 'assets', relationSearch.assets],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/assets', {
        params: { q: relationSearch.assets || undefined, limit: 50, sort: 'name:ASC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && sidebarOpen && canManageDocument,
    staleTime: 60_000,
  });

  const { data: projectOptions = EMPTY_RELATION_OPTIONS } = useQuery({
    queryKey: ['knowledge-relation-options', 'projects', relationSearch.projects],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/projects', {
        params: { q: relationSearch.projects || undefined, limit: 50, sort: 'name:ASC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && sidebarOpen && canManageDocument,
    staleTime: 60_000,
  });

  const { data: requestOptions = EMPTY_RELATION_OPTIONS } = useQuery({
    queryKey: ['knowledge-relation-options', 'requests', relationSearch.requests],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/requests', {
        params: { q: relationSearch.requests || undefined, limit: 50, sort: 'name:ASC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && sidebarOpen && canManageDocument,
    staleTime: 60_000,
  });

  const { data: taskOptions = EMPTY_RELATION_OPTIONS } = useQuery({
    queryKey: ['knowledge-relation-options', 'tasks', relationSearch.tasks],
    queryFn: async () => {
      const res = await api.get<{ items: Array<{ id: string; label: string }> }>('/knowledge/relation-options/tasks', {
        params: { q: relationSearch.tasks || undefined, limit: 50, sort: 'created_at:DESC' },
      });
      return (res.data.items || []).map((row) => ({ id: row.id, label: row.label || row.id }));
    },
    enabled: !isCreate && sidebarOpen && canManageDocument,
    staleTime: 60_000,
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

  const applyDocumentState = React.useCallback((nextDoc: any) => {
    if (!nextDoc) return;
    const incomingRelations = nextDoc.relations || {};
    const mapRelation = (item: any) => ({
      id: item?.id || item,
      label: item?.label || item?.name || item?.title || item?.id || item,
    });
    const incomingContributors = Array.isArray(nextDoc.contributors) ? nextDoc.contributors : [];
    const nextRelations: Record<RelationKey, RelationOption[]> = {
      applications: (incomingRelations.applications || []).map(mapRelation),
      assets: (incomingRelations.assets || []).map(mapRelation),
      projects: (incomingRelations.projects || []).map(mapRelation),
      requests: (incomingRelations.requests || []).map(mapRelation),
      tasks: (incomingRelations.tasks || []).map(mapRelation),
    };

    const nextClassifications: ClassificationRow[] = Array.isArray(nextDoc.classifications)
      ? nextDoc.classifications
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

    const nextContentMarkdown = nextDoc.content_markdown || '';
    contentDraftRef.current = nextContentMarkdown;
    setContentHasText(!!String(nextContentMarkdown || '').trim());

    setForm({
      title: nextDoc.title || '',
      summary: nextDoc.summary || '',
      content_markdown: nextContentMarkdown,
      status: nextDoc.status || 'draft',
      folder_id: nextDoc.folder_id || null,
      document_type_id: nextDoc.document_type_id || null,
      template_document_id: nextDoc.template_document_id || null,
      template_document_title: nextDoc.template_document_title || '',
      template_document_type_id: nextDoc.template_document_type_id || null,
      template_document_type_name: nextDoc.template_document_type_name || '',
      revision: Number(nextDoc.revision || 1),
      relations: incomingRelations,
      contributors: incomingContributors,
      classifications: nextDoc.classifications || [],
    });
    setRelationSelections(nextRelations);
    setRelationsDirty(false);
    setClassificationRows(nextClassifications);
    setClassificationsDirty(false);
    setContributorAssignments(nextContributorAssignments);
    setContributorsDirty(false);
    setDirty(false);
  }, []);

  const updateDocumentCache = React.useCallback((updater: (current: any) => any) => {
    if (isCreate) return;
    qc.setQueryData(['knowledge', id], (current: any) => {
      if (!current) return current;
      return updater(current);
    });
  }, [id, isCreate, qc]);

  const buildRelationPayload = React.useCallback(
    (selections: Record<RelationKey, RelationOption[]>) => ({
      applications: Array.from(new Set((selections.applications || []).map((option) => option.id).filter(Boolean))),
      assets: Array.from(new Set((selections.assets || []).map((option) => option.id).filter(Boolean))),
      projects: Array.from(new Set((selections.projects || []).map((option) => option.id).filter(Boolean))),
      requests: Array.from(new Set((selections.requests || []).map((option) => option.id).filter(Boolean))),
      tasks: Array.from(new Set((selections.tasks || []).map((option) => option.id).filter(Boolean))),
    }),
    [],
  );

  const buildRelationCacheValue = React.useCallback(
    (selections: Record<RelationKey, RelationOption[]>) => ({
      applications: (selections.applications || []).map((option) => ({ id: option.id, name: option.label || option.id })),
      assets: (selections.assets || []).map((option) => ({ id: option.id, name: option.label || option.id })),
      projects: (selections.projects || []).map((option) => ({ id: option.id, name: option.label || option.id })),
      requests: (selections.requests || []).map((option) => ({ id: option.id, name: option.label || option.id })),
      tasks: (selections.tasks || []).map((option) => ({ id: option.id, name: option.label || option.id })),
    }),
    [],
  );

  const buildContributorCacheValue = React.useCallback((assignments: ContributorAssignments) => {
    const contributorById = new Map<string, KnowledgeContributorOption>();
    for (const option of contributorOptions) contributorById.set(option.id, option);

    const toCacheRow = (userId: string, role: 'owner' | 'author' | 'reviewer' | 'validator', isPrimary: boolean) => {
      const option = contributorById.get(userId);
      const firstName = String(option?.first_name || '').trim();
      const lastName = String(option?.last_name || '').trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      return {
        user_id: userId,
        role,
        is_primary: isPrimary,
        user_name: fullName || option?.label || option?.email || userId,
        email: option?.email || null,
      };
    };

    const ownerUserId = assignments.owner_user_id || profile?.id || null;
    return [
      ...(ownerUserId ? [toCacheRow(ownerUserId, 'owner', true)] : []),
      ...Array.from(new Set(assignments.author_user_ids.filter(Boolean)))
        .map((userId) => toCacheRow(userId, 'author', false)),
      ...Array.from(new Set(assignments.reviewer_user_ids.filter(Boolean)))
        .map((userId) => toCacheRow(userId, 'reviewer', false)),
      ...Array.from(new Set(assignments.approver_user_ids.filter(Boolean)))
        .map((userId) => toCacheRow(userId, 'validator', false)),
    ];
  }, [contributorOptions, profile?.id]);

  // Sync doc data to form state
  React.useEffect(() => {
    if (!doc || isCreate) return;
    const nextDocId = String(doc.id || id);
    if (hydratedDocumentIdRef.current !== nextDocId) {
      hydratedDocumentIdRef.current = nextDocId;
      applyDocumentState(doc);
      return;
    }
    if (!hasLocalWorkspaceChangesRef.current) {
      applyDocumentState(doc);
    }
  }, [applyDocumentState, doc, id, isCreate]);

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
          throw new Error(t('workspace.messages.noDestinationLibrary'));
        }
        const createRelationPayload = buildRelationPayload(relationSelections);
        const contentMarkdown = normalizeMarkdownForRichTextEditor(contentDraftRef.current);
        const payload = {
          title: form.title,
          summary: form.summary,
          content_markdown: contentMarkdown,
          status: form.status,
          folder_id: form.folder_id || null,
          library_id: workspaceLibraryId,
          document_type_id: form.document_type_id || null,
          template_document_id: form.template_document_id || null,
          relations: createRelationPayload,
          ...(profile?.id ? { owner_user_id: profile.id } : {}),
        };
        const res = await api.post('/knowledge', payload);
        return { mode, data: res.data, created: true };
      }

      const contentMarkdown = normalizeMarkdownForRichTextEditor(contentDraftRef.current);
      const payload = {
        title: form.title,
        summary: form.summary,
        content_markdown: contentMarkdown,
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
      const savedContentMarkdown = String(result.data?.content_markdown ?? contentDraftRef.current ?? '');
      contentDraftRef.current = savedContentMarkdown;
      setContentHasText(!!savedContentMarkdown.trim());
      setForm((prev: any) => ({
        ...prev,
        content_markdown: savedContentMarkdown,
        revision: Number(result.data?.revision || prev.revision + 1),
      }));
      updateDocumentCache((current) => result.data || current);
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
        setError(t('workspace.messages.lockExpired'));
        return;
      }
      setError(getApiErrorMessage(e, t, t('workspace.messages.saveFailed')));
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
      const result = await refetch();
      applyDocumentState(result.data || doc);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['knowledge-versions', id] }),
        qc.invalidateQueries({ queryKey: ['knowledge-activities', id] }),
      ]);
    },
  });

  const uploadInlineImage = React.useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ id: string }>(`/knowledge/${id}/attachments/inline`, formData);
    return buildInlineImageUrl(`/knowledge/inline/${inlineImageTenantSlug}/${res.data.id}`);
  }, [id, inlineImageTenantSlug]);

  const importInlineImageUrl = React.useCallback(async (sourceUrl: string): Promise<string> => {
    const res = await api.post<{ id: string }>(`/knowledge/${id}/attachments/inline/import`, {
      source_url: sourceUrl,
    });
    return buildInlineImageUrl(`/knowledge/inline/${inlineImageTenantSlug}/${res.data.id}`);
  }, [id, inlineImageTenantSlug]);

  // Edit mode transitions
  const startEdit = React.useCallback(async (opts?: { silentConflict?: boolean }) => {
    try {
      if (!isCreate && doc) {
        hydratedDocumentIdRef.current = String(doc.id || id);
        applyDocumentState(doc);
      }
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
        setError(getApiErrorMessage(e, t, t('workspace.messages.acquireLockFailed')));
      }
    }
  }, [acquireLock, applyDocumentState, doc, doc?.edit_lock, id, isCreate, parseLockInfo, parseLockInfoFromError, t]);

  const discardChanges = async () => {
    const hasUnsavedChanges = dirty || relationsDirty || classificationsDirty || contributorsDirty;
    if (!hasUnsavedChanges) {
      setEditMode(false);
      await releaseLock();
      setError(null);
      return;
    }
    const confirmed = confirm(t('confirmations.discardChanges'));
    if (!confirmed) return;
    const result = await refetch();
    applyDocumentState(result.data || doc);
    setEditMode(false);
    await releaseLock();
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

  const contributorLabelById = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const option of contributorOptions) {
      const firstName = String(option.first_name || '').trim();
      const lastName = String(option.last_name || '').trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      const label = fullName || option.label || option.email || option.id;
      if (label) byId.set(option.id, label);
    }
    for (const row of Array.isArray(doc?.contributors) ? doc.contributors : []) {
      const id = String(row?.user_id || '').trim();
      if (!id || byId.has(id)) continue;
      const label = String(row?.user_name || row?.email || row?.user_id || '').trim();
      if (label) byId.set(id, label);
    }
    return byId;
  }, [contributorOptions, doc?.contributors]);

  const ownerContributor = React.useMemo(() => {
    const contributors = Array.isArray(doc?.contributors) ? doc.contributors : [];
    return contributors.find((row: any) => row?.role === 'owner' && row?.is_primary)
      || contributors.find((row: any) => row?.role === 'owner')
      || null;
  }, [doc?.contributors]);

  const currentStatusLabel = React.useMemo(
    () => t(`statuses.${String(form.status || '').toLowerCase()}`, {
      defaultValue: STATUS_LABELS[String(form.status || '').toLowerCase()] || String(form.status || t('statuses.draft')),
    }),
    [form.status, t],
  );

  const currentStatusColor = React.useMemo(
    () => STATUS_CHIP_COLORS[String(form.status || '').toLowerCase()] || 'default',
    [form.status],
  );

  const currentDocumentTypeLabel = React.useMemo(() => {
    const explicitType = documentTypes.find((row) => row.id === form.document_type_id);
    return explicitType?.name || doc?.document_type_name || t('shared.document');
  }, [doc?.document_type_name, documentTypes, form.document_type_id, t]);

  const currentOwnerLabel = React.useMemo(() => {
    const ownerUserId = contributorAssignments.owner_user_id;
    if (ownerUserId && contributorLabelById.has(ownerUserId)) {
      return contributorLabelById.get(ownerUserId) || t('workspace.values.unassigned');
    }
    const fallbackLabel = String(ownerContributor?.user_name || ownerContributor?.email || ownerContributor?.user_id || '').trim();
    return fallbackLabel || t('workspace.values.unassigned');
  }, [contributorAssignments.owner_user_id, contributorLabelById, ownerContributor, t]);

  const activeEditorDocumentId = React.useMemo(
    () => (!isCreate && doc ? String(doc.id || id) : id),
    [doc, id, isCreate],
  );

  const isPendingCurrentDocumentHydration = React.useMemo(
    () => !isCreate && !!doc && hydratedDocumentIdRef.current !== activeEditorDocumentId,
    [activeEditorDocumentId, doc, isCreate],
  );

  const displayTitle = isPendingCurrentDocumentHydration
    ? String(doc?.title || '')
    : String(form.title || '');

  const displayContentMarkdown = isPendingCurrentDocumentHydration
    ? String(doc?.content_markdown || '')
    : String(form.content_markdown || '');

  const sidebarForm = React.useMemo(
    () => ({
      summary: form.summary,
      status: form.status,
      folder_id: form.folder_id,
      document_type_id: form.document_type_id,
      template_document_id: form.template_document_id,
      template_document_title: form.template_document_title,
      template_document_type_id: form.template_document_type_id,
      template_document_type_name: form.template_document_type_name,
      revision: form.revision,
    }),
    [
      form.document_type_id,
      form.folder_id,
      form.revision,
      form.status,
      form.summary,
      form.template_document_id,
      form.template_document_title,
      form.template_document_type_id,
      form.template_document_type_name,
    ],
  );

  const versionList = React.useMemo(() => versions || EMPTY_VERSION_LIST, [versions]);
  const activityList = React.useMemo(() => activities || EMPTY_ACTIVITY_LIST, [activities]);

  // Enrich relation labels from fetched options
  React.useEffect(() => {
    setRelationSelections((prev) => {
      let changed = false;
      const next = {} as Record<RelationKey, RelationOption[]>;
      (Object.keys(prev) as RelationKey[]).forEach((key) => {
        const byId = new Map(allRelationOptions[key].map((option) => [option.id, option.label]));
        next[key] = prev[key].map((entry) => {
          const nextLabel = byId.get(entry.id) || entry.label || entry.id;
          if (nextLabel !== entry.label) {
            changed = true;
            return {
              ...entry,
              label: nextLabel,
            };
          }
          return entry;
        });
      });
      return changed ? next : prev;
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

  const handleTitleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('title', e.target.value),
    [handleFormChange],
  );

  const handleContentMarkdownChange = React.useCallback(
    (value: string) => {
      contentDraftRef.current = value;
      setDirty(true);
      const nextHasText = !!String(value || '').trim();
      setContentHasText((prev) => (prev === nextHasText ? prev : nextHasText));
    },
    [],
  );

  const getCurrentContentMarkdown = React.useCallback(
    () => normalizeMarkdownForRichTextEditor(contentDraftRef.current),
    [],
  );

  const handleSelectFolder = React.useCallback((folderId: string | null) => {
    const sp = new URLSearchParams();
    if (workspaceLibrarySlug) sp.set('library', workspaceLibrarySlug);
    sp.set('allLibraries', '0');
    if (folderId) sp.set('folder_id', folderId);
    const qs = sp.toString();
    navigate(`/knowledge${qs ? `?${qs}` : ''}`);
  }, [navigate, workspaceLibrarySlug]);

  const handleContributorAssignmentsChange = React.useCallback((next: ContributorAssignments) => {
    setContributorAssignments(next);
    setContributorsError(null);
    setContributorsDirty(true);
  }, []);

  const handleClassificationRowsChange = React.useCallback((rows: ClassificationRow[]) => {
    setClassificationRows(rows);
    setClassificationsDirty(true);
  }, []);

  const handleRelationSelectionsChange = React.useCallback((key: RelationKey, values: RelationOption[]) => {
    setRelationSelections((prev) => ({ ...prev, [key]: values }));
    setRelationsDirty(true);
  }, []);

  const handleRelationSearchChange = React.useCallback((key: RelationKey, value: string) => {
    setRelationSearch((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDocumentImportError = React.useCallback((e: unknown) => {
    const status = Number((e as any)?.response?.status || 0);
    const lockInfo = parseLockInfoFromError(e) || parseLockInfo(doc?.edit_lock);
    if (status === 423) {
      setEditMode(false);
      setLockToken(null);
      setLockExpiresAt(null);
      setActiveLockInfo(lockInfo);
      setError(null);
      return;
    }
    if (status === 410) {
      setEditMode(false);
      setLockToken(null);
      setLockExpiresAt(null);
      setError(t('workspace.messages.lockExpired'));
      return;
    }
    setError(getApiErrorMessage(e, t, t('workspace.messages.importFailed')));
  }, [doc?.edit_lock, parseLockInfo, parseLockInfoFromError, t]);

  const handleDocumentImport = React.useCallback(async (selectedFile: File): Promise<ImportDocumentResult> => {
    if (isCreate) {
      throw new Error(t('workspace.messages.importAvailableAfterCreate'));
    }
    if (!lockToken) {
      throw new Error(t('workspace.messages.acquireLockBeforeImport'));
    }
    return importMarkdownDocument(`/knowledge/${id}/import`, selectedFile, {
      headers: { 'X-Lock-Token': lockToken },
    });
  }, [id, isCreate, lockToken, t]);

  const handleDocumentImported = React.useCallback((result: ImportDocumentResult) => {
    setError(null);
    contentDraftRef.current = result.markdown;
    setContentHasText(!!String(result.markdown || '').trim());
    setForm((prev: any) => ({ ...prev, content_markdown: result.markdown }));
    setDirty(true);
    setContentResetNonce((prev) => prev + 1);
    window.setTimeout(() => {
      setContentFocusNonce((prev) => prev + 1);
    }, 0);
  }, []);

  // Save relations
  const saveRelationsMutation = useMutation({
    mutationFn: async () => {
      if (isCreate) return;
      const nextSelections: Record<RelationKey, RelationOption[]> = {
        applications: [...relationSelections.applications],
        assets: [...relationSelections.assets],
        projects: [...relationSelections.projects],
        requests: [...relationSelections.requests],
        tasks: [...relationSelections.tasks],
      };
      const payload = buildRelationPayload(nextSelections);
      await Promise.all(
        (Object.keys(payload) as RelationKey[]).map((key) => api.post(
          `/knowledge/${id}/relations/${key}/bulk-replace`,
          { [RELATION_BODY_KEYS[key]]: payload[key] },
        )),
      );
      return buildRelationCacheValue(nextSelections);
    },
    onSuccess: async (nextRelations) => {
      setRelationsError(null);
      setRelationsDirty(false);
      updateDocumentCache((current) => ({
        ...current,
        relations: nextRelations || current?.relations || {},
      }));
    },
    onError: (e: any) => {
      setRelationsError(getApiErrorMessage(e, t, t('workspace.messages.saveRelationsFailed')));
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
      return rows;
    },
    onSuccess: async (rows) => {
      setClassificationError(null);
      setClassificationsDirty(false);
      updateDocumentCache((current) => ({
        ...current,
        classifications: rows || [],
      }));
    },
    onError: (e: any) => {
      setClassificationError(getApiErrorMessage(e, t, t('workspace.messages.saveClassificationsFailed')));
    },
  });

  const saveContributorsMutation = useMutation({
    mutationFn: async () => {
      if (isCreate) return;
      const ownerUserId = contributorAssignments.owner_user_id || profile?.id || null;
      if (!ownerUserId) {
        throw new Error(t('workspace.messages.selectOwnerBeforeSaving'));
      }
      const rows = [
        { user_id: ownerUserId, role: 'owner', is_primary: true },
        ...Array.from(new Set(contributorAssignments.author_user_ids.filter(Boolean)))
          .map((user_id) => ({ user_id, role: 'author', is_primary: false })),
        ...Array.from(new Set(contributorAssignments.reviewer_user_ids.filter(Boolean)))
          .map((user_id) => ({ user_id, role: 'reviewer', is_primary: false })),
        ...Array.from(new Set(contributorAssignments.approver_user_ids.filter(Boolean)))
          .map((user_id) => ({ user_id, role: 'validator', is_primary: false })),
      ];
      const nextContributors = buildContributorCacheValue(contributorAssignments);
      await api.post(`/knowledge/${id}/contributors/bulk-replace`, { contributors: rows });
      return nextContributors;
    },
    onSuccess: async (nextContributors) => {
      setContributorsError(null);
      setContributorsDirty(false);
      updateDocumentCache((current) => ({
        ...current,
        contributors: nextContributors || current?.contributors || [],
      }));
    },
    onError: (e: any) => {
      setContributorsError(getApiErrorMessage(e, t, t('workspace.messages.saveContributorsFailed')));
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
      const result = await refetch();
      applyDocumentState(result.data || doc);
      await qc.invalidateQueries({ queryKey: ['knowledge-activities', id] });
    },
    onError: (e: any) => {
      setError(getApiErrorMessage(e, t, t('workspace.messages.requestReviewFailed')));
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
      const result = await refetch();
      applyDocumentState(result.data || doc);
      await qc.invalidateQueries({ queryKey: ['knowledge-activities', id] });
    },
    onError: (e: any) => {
      setError(getApiErrorMessage(e, t, t('workspace.messages.approveWorkflowFailed')));
    },
  });

  const requestChangesWorkflowMutation = useMutation({
    mutationFn: async (comment: string) => {
      await api.post(`/knowledge/${id}/workflow/request-changes`, { comment });
    },
    onSuccess: async () => {
      setError(null);
      const result = await refetch();
      applyDocumentState(result.data || doc);
      await qc.invalidateQueries({ queryKey: ['knowledge-activities', id] });
    },
    onError: (e: any) => {
      setError(getApiErrorMessage(e, t, t('workspace.messages.requestChangesFailed')));
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
      const result = await refetch();
      applyDocumentState(result.data || doc);
      await qc.invalidateQueries({ queryKey: ['knowledge-activities', id] });
      await startEdit({ silentConflict: true });
    },
    onError: (e: any) => {
      setError(getApiErrorMessage(e, t, t('workspace.messages.cancelReviewFailed')));
    },
  });

  const handlePostComment = React.useCallback(() => {
    commentMutation.mutate();
  }, [commentMutation.mutate]);

  const handleSaveRelations = React.useCallback(() => {
    saveRelationsMutation.mutate();
  }, [saveRelationsMutation.mutate]);

  const handleSaveClassifications = React.useCallback(() => {
    saveClassificationsMutation.mutate();
  }, [saveClassificationsMutation.mutate]);

  const handleSaveContributors = React.useCallback(() => {
    saveContributorsMutation.mutate();
  }, [saveContributorsMutation.mutate]);

  const handleRevertVersion = React.useCallback((versionNumber: number) => {
    revertMutation.mutate(versionNumber);
  }, [revertMutation.mutate]);

  const handleApproveWorkflow = React.useCallback((comment: string) => (
    approveWorkflowMutation.mutateAsync(comment)
  ), [approveWorkflowMutation.mutateAsync]);

  const handleRequestWorkflowChanges = React.useCallback((comment: string) => (
    requestChangesWorkflowMutation.mutateAsync(comment)
  ), [requestChangesWorkflowMutation.mutateAsync]);

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
  const validatedAtLabel = doc?.validated_at ? new Date(doc.validated_at).toLocaleString(locale) : null;
  const isManagedIntegratedDocument = !isCreate && !!doc?.is_managed_integrated_document;
  const showTitleMeta = (!isCreate && !!doc?.item_number) || isManagedIntegratedDocument;
  const hasWorkflowAssignments = contributorAssignments.reviewer_user_ids.length > 0 || contributorAssignments.approver_user_ids.length > 0;
  const hasPendingWorkflowChanges = dirty || relationsDirty || classificationsDirty || contributorsDirty;
  const isLockedByAnotherUser = !!activeLockInfo?.holder_user_id && activeLockInfo.holder_user_id !== profile?.id;
  const workspaceReadOnly = !isCreate && isLockedByAnotherUser;
  const canEditContent = isCreate || (!workflowActive && editMode && !!lockToken);
  const canManageDocumentState = isCreate || (canManageDocument && !workflowActive && editMode && !!lockToken);
  const lockHolderLabel = activeLockInfo?.holder_name || t('workspace.values.anotherUser');
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
    return dt.toLocaleString(locale);
  })();

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <MLink component={Link} underline="hover" color="inherit" to="/knowledge">{t('workspace.breadcrumbs.knowledge')}</MLink>
          {libraryName && (
            <MLink component={Link} underline="hover" color="inherit" to={libraryListUrl}>{libraryName}</MLink>
          )}
          <Typography color="text.primary">
            {isCreate ? t('workspace.breadcrumbs.newDocument') : (doc?.item_ref || id)}
          </Typography>
        </Breadcrumbs>
        <Stack direction="row" alignItems="center" spacing={1}>
          {!isCreate && !workflowActive && canManageDocument && !isManagedIntegratedDocument && (
            <Button
              variant="outlined"
              size="small"
              disabled={!canRequestReview || requestReviewMutation.isPending}
              onClick={() => requestReviewMutation.mutate()}
            >
              {t('workspace.actions.requestReview')}
            </Button>
          )}
          {!isCreate && !workflowActive && !editMode && canManageDocument && (
            <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => { void startEdit(); }}>
              {isLockedByAnotherUser ? t('workspace.actions.retryLock') : t('workspace.actions.edit')}
            </Button>
          )}
          {!isCreate && workflowActive && canManageDocument && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => cancelWorkflowMutation.mutate()}
              disabled={cancelWorkflowMutation.isPending}
            >
              {t('workspace.actions.cancelReviewAndEdit')}
            </Button>
          )}
          {!isCreate && !workflowActive && editMode && canManageDocument && (
            <Button variant="outlined" size="small" onClick={discardChanges}>
              {t('workspace.actions.discard')}
            </Button>
          )}
          {!isCreate && canEditContent && (
            <ImportButton
              onImportFile={handleDocumentImport}
              onImported={handleDocumentImported}
              onError={handleDocumentImportError}
              hasContent={contentHasText}
              size="small"
            />
          )}
          <ExportButton
            content={form.content_markdown || ''}
            title={String(form.title || (!isCreate ? doc?.item_ref : '') || 'knowledge-document')}
            disabled={!contentHasText}
            getContent={getCurrentContentMarkdown}
          />
          {canManageDocument && !workflowActive && (isCreate || editMode) && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              disabled={workspaceReadOnly || saveMutation.isPending || (!dirty && !isCreate)}
              onClick={() => saveMutation.mutate('manual')}
            >
              {t('common:buttons.save')}
            </Button>
          )}
          <IconButton
            size="small"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? t('workspace.actions.hideSidebar') : t('workspace.actions.showSidebar')}
          >
            {sidebarOpen ? <ChevronRightIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!canManageDocument && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('workspace.messages.readOnlyAccess')}
        </Alert>
      )}

      {workflowActive && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('workspace.messages.inReview')}
        </Alert>
      )}

      {isLockedByAnotherUser && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={canManageDocument && !workflowActive ? (
            <Button size="small" onClick={() => { void startEdit(); }}>
              {t('workspace.actions.retryLock')}
            </Button>
          ) : undefined}
        >
          {t('workspace.messages.lockedByUser', {
            user: lockHolderLabel,
            until: lockExpiryLabel ? t('workspace.messages.lockUntil', { value: lockExpiryLabel }) : '',
          })}
        </Alert>
      )}

      <Stack direction="row" spacing={0} sx={{ height: 'calc(100vh - 130px)' }}>
        {/* Folder tree */}
        {!!workspaceLibraryId && (
          <FolderTreePanel
            libraryId={workspaceLibraryId}
            selectedFolderId={form.folder_id || null}
            onSelectFolder={handleSelectFolder}
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
              <Stack spacing={1} sx={{ mb: 2, flexShrink: 0 }}>
                <Box sx={{ ...titleBarSx, minWidth: 0 }}>
                  {canEditContent && !isManagedIntegratedDocument ? (
                    <TextField
                      value={String(form.title || '')}
                      onChange={handleTitleChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          setContentFocusNonce((n) => n + 1);
                        }
                      }}
                      variant="standard"
                      fullWidth
                      autoFocus={isCreate}
                      placeholder={t('workspace.fields.titlePlaceholder')}
                      InputProps={{
                        disableUnderline: true,
                        sx: { fontSize: '1.5rem', fontWeight: 600 },
                      }}
                    />
                  ) : (
                    <Typography variant="h5" sx={{ fontWeight: 600, py: 0.4 }}>
                      {displayTitle || t('workspace.values.untitled')}
                    </Typography>
                  )}
                </Box>
                {showTitleMeta && (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {!isCreate && doc?.item_number && (
                      <Chip
                        label={`DOC-${doc.item_number}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace' }}
                        onClick={() => navigator.clipboard.writeText(`DOC-${doc.item_number}`)}
                        title={t('workspace.messages.clickToCopyReference')}
                      />
                    )}
                    {isManagedIntegratedDocument && (
                      <Chip
                        label={t('workspace.values.integrated')}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    )}
                    {!isCreate && isValidatedCurrentRevision && (
                      <ValidatedBadge size="small" validatedAtLabel={validatedAtLabel} />
                    )}
                    {!isCreate && (
                      <>
                        <Chip
                          label={currentStatusLabel}
                          size="small"
                          color={currentStatusColor}
                        />
                        <Chip
                          label={t('workspace.values.typeLabel', { value: currentDocumentTypeLabel })}
                          size="small"
                          variant="outlined"
                          title={currentDocumentTypeLabel}
                        />
                        <Chip
                          label={t('workspace.values.ownerLabel', { value: currentOwnerLabel })}
                          size="small"
                          variant="outlined"
                          title={currentOwnerLabel}
                          sx={{ maxWidth: 280 }}
                        />
                      </>
                    )}
                  </Stack>
                )}
              </Stack>

              <Box ref={editorHostRef} sx={{ flex: 1, minHeight: 0 }}>
                <React.Suspense fallback={<MarkdownEditorLoadingFallback minRows={editorRows} />}>
                  <MarkdownEditor
                    key={`${activeEditorDocumentId}:${contentResetNonce}`}
                    value={displayContentMarkdown}
                    onChange={handleContentMarkdownChange}
                    disabled={!canEditContent}
                    focusNonce={contentFocusNonce}
                    refreshNonce={contentResetNonce}
                    onImageUpload={!isCreate ? uploadInlineImage : undefined}
                    onImageUrlImport={!isCreate ? importInlineImageUrl : undefined}
                    minRows={editorRows}
                    maxRows={editorRows}
                    fillHeight
                    fullToolbar
                  />
                </React.Suspense>
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
              form={sidebarForm}
              onChange={handleFormChange}
              isCreate={isCreate}
              editMode={canEditContent}
              canManage={canManageDocumentState && !workspaceReadOnly}
              canComment={canManageDocument && !workspaceReadOnly}
              contributorOptions={contributorOptions}
              contributorAssignments={contributorAssignments}
              onContributorAssignmentsChange={handleContributorAssignmentsChange}
              onSaveContributors={handleSaveContributors}
              savingContributors={saveContributorsMutation.isPending}
              contributorsDirty={contributorsDirty}
              contributorsError={contributorsError}
              documentTypeOptions={documentTypeOptionsForForm}
              folderOptions={folderOptions}
              classificationCategories={classificationCategories}
              classificationStreams={classificationStreams}
              classificationRows={classificationRows}
              onClassificationRowsChange={handleClassificationRowsChange}
              onSaveClassifications={handleSaveClassifications}
              savingClassifications={saveClassificationsMutation.isPending}
              classificationsDirty={classificationsDirty}
              classificationError={classificationError}
              relationSelections={relationSelections}
              onRelationSelectionsChange={handleRelationSelectionsChange}
              relationSearch={relationSearch}
              onRelationSearchChange={handleRelationSearchChange}
              relationOptions={allRelationOptions}
              onSaveRelations={handleSaveRelations}
              savingRelations={saveRelationsMutation.isPending}
              relationsDirty={relationsDirty}
              relationsError={relationsError}
              versions={versionList}
              onRevertVersion={handleRevertVersion}
              revertingVersion={revertMutation.isPending}
              lockToken={lockToken}
              workflow={workflow}
              latestApprovedWorkflow={doc?.latest_approved_workflow || null}
              currentUserId={profile?.id || null}
              canApproveWorkflow={canApproveWorkflow}
              onApproveWorkflow={handleApproveWorkflow}
              approvingWorkflow={approveWorkflowMutation.isPending}
              onRequestWorkflowChanges={handleRequestWorkflowChanges}
              requestingWorkflowChanges={requestChangesWorkflowMutation.isPending}
              activities={activityList}
              commentText={commentText}
              onCommentTextChange={setCommentText}
              onPostComment={handlePostComment}
              postingComment={commentMutation.isPending}
            />
          </Box>
        )}
      </Stack>
    </>
  );
}
