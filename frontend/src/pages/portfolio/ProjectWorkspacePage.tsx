import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, IconButton, LinearProgress, Stack, Typography,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import api from '../../api';
import { useProjectNav } from '../../hooks/useProjectNav';
import { useClassificationDefaults } from '../../hooks/useClassificationDefaults';
import { useAuth } from '../../auth/AuthContext';
import StatusChangeDialog from './components/StatusChangeDialog';
import { type ProjectScoringEditorHandle } from './editors/ProjectScoringEditor';
import { type EffortAllocationData } from './components/EffortAllocationTable';
import { useRecentlyViewed } from '../workspace/hooks/useRecentlyViewed';
import { buildInlineImageUrl, resolveInlineImageTenantSlug } from '../../utils/inlineImageUrls';
import { formatItemRef } from '../../utils/item-ref';
import ShareDialog from '../../components/ShareDialog';
import { type IntegratedDocumentEditorHandle } from '../../components/IntegratedDocumentEditor';
import PortfolioWorkspaceShell from './workspace/PortfolioWorkspaceShell';
import ProjectPropertyPanel from './workspace/project/ProjectPropertyPanel';
import ProjectSummaryTab from './workspace/project/ProjectSummaryTab';
import WorkspaceTabLoadingFallback from './workspace/WorkspaceTabLoadingFallback';
import { getProjectWorkspaceInclude } from './workspace/workspace-detail-includes';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import {
  getProjectStatusLabel,
  getProjectStatusOptions,
} from '../../utils/portfolioI18n';
import { useTenant } from '../../tenant/TenantContext';

type TabKey = 'summary' | 'scoring' | 'timeline' | 'effort' | 'tasks' | 'knowledge' | 'activity';
type LegacyPanelRoute = 'overview' | 'team' | 'relations';
type RouteTabKey = TabKey | LegacyPanelRoute;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  waiting_list: ['planned', 'on_hold', 'cancelled'],
  planned: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['in_testing', 'done', 'on_hold', 'cancelled'],
  in_testing: ['in_progress', 'done', 'on_hold', 'cancelled'],
  on_hold: ['waiting_list', 'planned', 'in_progress', 'cancelled'],
  done: [],
  cancelled: [],
};

// Classification interfaces (from API)
interface ClassificationType {
  id: string;
  name: string;
  is_active: boolean;
}
interface ClassificationCategory {
  id: string;
  name: string;
  is_active: boolean;
}
interface ClassificationStream {
  id: string;
  name: string;
  category_id: string;
  is_active: boolean;
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'> = {
  waiting_list: 'default',
  planned: 'info',
  in_progress: 'primary',
  in_testing: 'secondary',
  on_hold: 'warning',
  done: 'success',
  cancelled: 'error',
};

const ProjectTimelineTab = React.lazy(() => import('./workspace/project/ProjectTimelineTab'));
const ProjectScoringTab = React.lazy(() => import('./workspace/project/ProjectScoringTab'));
const ProjectEffortTab = React.lazy(() => import('./workspace/project/ProjectEffortTab'));
const ProjectTasksPanel = React.lazy(() => import('./editors/ProjectTasksPanel'));
const ProjectActivityTab = React.lazy(() => import('./workspace/project/ProjectActivityTab'));
const ProjectKnowledgeTab = React.lazy(() => import('./workspace/project/ProjectKnowledgeTab'));

export default function ProjectWorkspacePage() {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasLevel, profile } = useAuth();
  const { tenantSlug } = useTenant();
  const { addToRecent } = useRecentlyViewed();
  const inlineImageTenantSlug = resolveInlineImageTenantSlug(tenantSlug, window.location.hostname);

  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const id = idParam;
  const rawRouteTab = (params.tab as RouteTabKey | undefined) || 'summary';
  const routeTab: TabKey = rawRouteTab === 'overview' || rawRouteTab === 'team' || rawRouteTab === 'relations'
    ? 'summary'
    : rawRouteTab;
  const propertyPanelFocusSection = rawRouteTab === 'team' || rawRouteTab === 'relations'
    ? rawRouteTab
    : null;
  const projectInclude = React.useMemo(() => getProjectWorkspaceInclude(routeTab), [routeTab]);
  const tabs = React.useMemo<Array<{ key: TabKey; label: string }>>(() => [
    { key: 'summary', label: t('portfolio:labels.summary') },
    { key: 'activity', label: t('portfolio:labels.activity') },
    { key: 'timeline', label: t('portfolio:labels.timeline') },
    { key: 'effort', label: t('portfolio:labels.progress') },
    { key: 'tasks', label: t('portfolio:labels.tasks') },
    { key: 'scoring', label: t('portfolio:labels.scoring') },
    { key: 'knowledge', label: t('portfolio:labels.knowledge') },
  ], [t]);
  const statusOptions = React.useMemo(() => getProjectStatusOptions(t), [t]);
  const originOptions = React.useMemo(() => [
    { value: 'fast_track', label: t('portfolio:origin.fast_track') },
    { value: 'legacy', label: t('portfolio:origin.legacy') },
  ], [t]);
  const originLabels = React.useMemo<Record<string, string>>(() => ({
    standard: t('portfolio:workspace.project.origin.standard'),
    fast_track: t('portfolio:workspace.project.origin.fastTrack'),
    legacy: t('portfolio:workspace.project.origin.legacy'),
  }), [t]);

  React.useEffect(() => {
    if (rawRouteTab === 'overview') {
      navigate(`/portfolio/projects/${id}/summary${location.search}`, { replace: true });
      return;
    }
    if (isCreate && rawRouteTab !== 'summary') {
      navigate(`/portfolio/projects/${id}/summary${location.search}`, { replace: true });
    }
  }, [id, isCreate, location.search, navigate, rawRouteTab]);

  // Fetch project data
  const { data, error, isFetching, isLoading, isPlaceholderData, refetch } = useQuery({
    queryKey: ['portfolio-project', id, projectInclude],
    queryFn: async () => {
      const res = await api.get(`/portfolio/projects/${id}`, { params: { include: projectInclude } });
      return res.data;
    },
    enabled: !isCreate,
  });

  // Track recently viewed
  React.useEffect(() => {
    if (data?.id && data?.name) {
      addToRecent('project', data.id, data.name);
    }
  }, [data?.id, data?.name, addToRecent]);

  // Browser tab title
  React.useEffect(() => {
    if (data?.item_number && data?.name) {
      document.title = t('portfolio:workspace.project.browserTitle', {
        ref: `PRJ-${data.item_number}`,
        name: data.name,
      });
    }
    return () => { document.title = 'KANAP'; };
  }, [data?.item_number, data?.name, t]);

  // URL replaceState: swap UUID for human-readable ref
  React.useEffect(() => {
    if (!data?.item_number) return;
    const currentParam = params.id || '';
    const isUuid = /^[0-9a-f]{8}-/.test(currentParam);
    if (isUuid) {
      const ref = formatItemRef('project', data.item_number);
      const newPath = location.pathname.replace(currentParam, ref);
      window.history.replaceState(null, '', newPath + location.search);
    }
  }, [data?.item_number, params.id, location.pathname, location.search]);

  // Fetch classification data (types, categories, streams)
  const { data: classificationData } = useQuery({
    queryKey: ['portfolio-classification'],
    queryFn: async () => {
      const res = await api.get('/portfolio/classification/all');
      return res.data as {
        sources: ClassificationType[];
        categories: ClassificationCategory[];
        streams: ClassificationStream[];
      };
    },
  });

  // Fetch portfolio settings for mandatory bypass
  const { data: portfolioSettings } = useQuery({
    queryKey: ['portfolio-settings'],
    queryFn: async () => {
      const res = await api.get('/portfolio/settings');
      return res.data as { mandatory_bypass_enabled: boolean };
    },
  });

  // Fetch task time summary for progress breakdown
  const { data: taskTimeSummary } = useQuery({
    queryKey: ['portfolio-project-task-time', id],
    queryFn: async () => {
      const res = await api.get(`/portfolio/projects/${id}/tasks/time-summary`);
      return res.data as { it_hours: number; business_hours: number; total_hours: number };
    },
    enabled: !isCreate && routeTab === 'effort',
  });

  // Fetch task time entries for Time Log display
  const { data: taskTimeEntries = [] } = useQuery({
    queryKey: ['portfolio-project-task-time-entries', id],
    queryFn: async () => {
      const res = await api.get(`/portfolio/projects/${id}/tasks/time-entries`);
      return res.data as any[];
    },
    enabled: !isCreate && routeTab === 'effort',
  });

  // Fetch effort allocations for IT
  const { data: itAllocationData, refetch: refetchItAlloc } = useQuery({
    queryKey: ['project-effort-allocations', id, 'it'],
    queryFn: async () => {
      const res = await api.get(`/portfolio/projects/${id}/effort-allocations/it`);
      return res.data as EffortAllocationData;
    },
    enabled: !!id && !isCreate && routeTab === 'effort',
  });

  // Fetch effort allocations for Business
  const { data: businessAllocationData, refetch: refetchBusinessAlloc } = useQuery({
    queryKey: ['project-effort-allocations', id, 'business'],
    queryFn: async () => {
      const res = await api.get(`/portfolio/projects/${id}/effort-allocations/business`);
      return res.data as EffortAllocationData;
    },
    enabled: !!id && !isCreate && routeTab === 'effort',
  });

  const sources = classificationData?.sources?.filter((t) => t.is_active) || [];
  const categories = classificationData?.categories?.filter((c) => c.is_active) || [];
  const streams = classificationData?.streams?.filter((s) => s.is_active) || [];

  const [form, setForm] = React.useState<any>(isCreate ? { origin: 'fast_track' } : {});
  const [dirty, setDirty] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
  const scoringEditorRef = React.useRef<ProjectScoringEditorHandle>(null);
  const [scoringDirty, setScoringDirty] = React.useState(false);
  const purposeEditorRef = React.useRef<IntegratedDocumentEditorHandle>(null);
  const [purposeDirty, setPurposeDirty] = React.useState(false);
  const classificationTouchedRef = React.useRef({
    source_id: false,
    category_id: false,
    stream_id: false,
    company_id: false,
  });
  const defaultsAppliedRef = React.useRef(false);
  const { data: classificationDefaults, isLoading: classificationDefaultsLoading } = useClassificationDefaults();

  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const canManage = hasLevel('portfolio_projects', 'manager');
  const canContributeToProject = hasLevel('portfolio_projects', 'contributor');
  const canProjectAdmin = hasLevel('portfolio_projects', 'admin');

  React.useEffect(() => {
    setForm(isCreate ? { origin: 'fast_track' } : {});
    setDirty(false);
    setScoringDirty(false);
    setPurposeDirty(false);
    setSaveError(null);
    scoringEditorRef.current?.reset?.();
    void purposeEditorRef.current?.reset?.();
  }, [id, isCreate]);

  // Sync form with loaded data
  React.useEffect(() => {
    if (data && !isCreate) {
      setForm({ ...data });
    }
  }, [data, isCreate]);

  React.useEffect(() => {
    if (!isCreate) return;
    classificationTouchedRef.current = {
      source_id: false,
      category_id: false,
      stream_id: false,
      company_id: false,
    };
    defaultsAppliedRef.current = false;
  }, [isCreate, id]);

  const update = React.useCallback((patch: any) => {
    setDirty(true);
    setForm((prev: any) => ({ ...prev, ...patch }));
  }, []);

  const updateManagedDocDraft = React.useCallback((patch: any) => {
    if (isCreate) {
      setDirty(true);
    }
    setForm((prev: any) => ({ ...prev, ...patch }));
  }, [isCreate]);

  const applyPanelLocalUpdate = React.useCallback((updater: (prev: any) => any) => {
    setForm((prev: any) => updater(prev || {}));
  }, []);

  const persistPanelPatch = React.useCallback(async (patch: Record<string, any>) => {
    if (!isCreate && !canManage) {
      setSaveError(t('portfolio:workspace.project.messages.permissionSavePanel'));
      await refetch();
      return;
    }

    setForm((prev: any) => ({ ...prev, ...patch }));

    if (isCreate) {
      setDirty(true);
      return;
    }

    setSaveError(null);
    try {
      await api.patch(`/portfolio/projects/${id}`, patch);
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
    } catch (error) {
      setSaveError(getApiErrorMessage(error, t, t('portfolio:workspace.project.messages.savePanelFailed')));
      await refetch();
    }
  }, [canManage, id, isCreate, queryClient, refetch, t]);

  React.useEffect(() => {
    if (!isCreate || defaultsAppliedRef.current || classificationDefaultsLoading) return;
    if (!classificationData) return;

    setForm((prev: any) => {
      const next = { ...(prev || {}) } as any;
      const isUnset = (value: any) => value === undefined || value === null || value === '';
      let changed = false;

      const applyField = (
        field: 'source_id' | 'category_id' | 'company_id',
        value: string | null,
      ) => {
        if (!value) return;
        if (classificationTouchedRef.current[field]) return;
        if (!isUnset(next[field])) return;
        next[field] = value;
        changed = true;
      };

      applyField('source_id', classificationDefaults?.source_id ?? null);
      applyField('category_id', classificationDefaults?.category_id ?? null);
      applyField('company_id', classificationDefaults?.company_id ?? null);

      const defaultStreamId = classificationDefaults?.stream_id ?? null;
      if (
        defaultStreamId &&
        !classificationTouchedRef.current.stream_id &&
        isUnset(next.stream_id)
      ) {
        const effectiveCategory = isUnset(next.category_id) ? null : next.category_id;
        const stream = streams.find((s) => s.id === defaultStreamId);
        const matchesCategory = !stream || !effectiveCategory || stream.category_id === effectiveCategory;
        if (matchesCategory) {
          next.stream_id = defaultStreamId;
          changed = true;
        }
      }

      return changed ? next : prev;
    });

    defaultsAppliedRef.current = true;
  }, [
    isCreate,
    classificationDefaultsLoading,
    classificationDefaults,
    classificationData,
    streams,
  ]);

  const handleSave = async (): Promise<boolean> => {
    setSaveError(null);
    try {
      if (isCreate) {
        const res = await api.post('/portfolio/projects', form);
        const newId = res.data?.id;
        if (newId) {
          setDirty(false);
          navigate(`/portfolio/projects/${newId}/summary?${searchParams.toString()}`);
          return true;
        }
        return false;
      } else {
        if (!canManage && (dirty || scoringDirty)) {
          setSaveError(t('portfolio:workspace.project.messages.permissionSaveWorkspace'));
          return false;
        }

        if (canManage) {
          const projectPayload = { ...form };
          delete projectPayload.purpose;
          await api.patch(`/portfolio/projects/${id}`, projectPayload);

          // Save scoring editor data if dirty.
          if (scoringEditorRef.current?.isDirty()) {
            await scoringEditorRef.current.save();
          }
        }

        if (purposeEditorRef.current?.isDirty()) {
          const ok = await purposeEditorRef.current.save();
          if (!ok) return false;
        }

        setDirty(false);
        setScoringDirty(false);
        setPurposeDirty(false);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
        return true;
      }
    } catch (error) {
      setSaveError(getApiErrorMessage(error, t, t('portfolio:workspace.project.messages.saveFailed')));
      return false;
    }
  };

  const handleReset = async () => {
    if (data) {
      setForm({ ...data });
    } else {
      setForm(isCreate ? { origin: 'fast_track' } : {});
    }
    setDirty(false);
    setScoringDirty(false);
    setPurposeDirty(false);
    setSaveError(null);
    scoringEditorRef.current?.reset?.();
    await purposeEditorRef.current?.reset?.();
    classificationTouchedRef.current = {
      source_id: false,
      category_id: false,
      stream_id: false,
      company_id: false,
    };
    defaultsAppliedRef.current = false;
  };

  // Handle status change - show dialog for decision logging
  const handleStatusChange = React.useCallback((newStatus: string) => {
    if (newStatus === form?.status) return;
    setPendingStatus(newStatus);
    setStatusDialogOpen(true);
  }, [form?.status]);

  const handleStatusDialogConfirm = React.useCallback(async (options: {
    isDecision: boolean;
    outcome?: string;
    context?: string;
    rationale?: string;
  }) => {
    if (!pendingStatus) return;

    setStatusDialogOpen(false);
    setSaveError(null);

    try {
      await api.patch(`/portfolio/projects/${id}`, {
        status: pendingStatus,
        is_decision: options.isDecision,
        decision_outcome: options.outcome,
        decision_context: options.context,
        decision_rationale: options.rationale,
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
    } catch (error) {
      setSaveError(getApiErrorMessage(error, t, t('portfolio:workspace.project.messages.updateStatusFailed')));
    } finally {
      setPendingStatus(null);
    }
  }, [id, pendingStatus, refetch, queryClient, t]);

  const handleStatusDialogCancel = React.useCallback(() => {
    setStatusDialogOpen(false);
    setPendingStatus(null);
  }, []);

  const handleAddComment = React.useCallback(async (data: {
    content: string;
    context: string | null;
    is_decision: boolean;
    decision_outcome?: string;
    new_status?: string;
  }) => {
    await api.post(`/portfolio/projects/${id}/comments`, data);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
  }, [id, refetch, queryClient]);

  const handleUpdateComment = React.useCallback(async (activityId: string, content: string) => {
    await api.patch(`/portfolio/projects/${id}/comments/${activityId}`, { content });
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
  }, [id, refetch, queryClient]);

  // Handle inline image upload for rich text fields
  const handleImageUpload = React.useCallback(async (file: File, sourceField: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_field', sourceField);
    const res = await api.post<{ id: string }>(`/portfolio/projects/${id}/attachments/inline`, formData);
    return buildInlineImageUrl(`/portfolio/projects/inline/${inlineImageTenantSlug}/${res.data.id}`);
  }, [id, inlineImageTenantSlug]);

  const handleImageUrlImport = React.useCallback(async (sourceUrl: string, sourceField: string): Promise<string> => {
    const res = await api.post<{ id: string }>(`/portfolio/projects/${id}/attachments/inline/import`, {
      source_field: sourceField,
      source_url: sourceUrl,
    });
    return buildInlineImageUrl(`/portfolio/projects/inline/${inlineImageTenantSlug}/${res.data.id}`);
  }, [id, inlineImageTenantSlug]);

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'summary') return;
    if (hasUnsavedChanges) {
      const proceed = window.confirm(t('portfolio:workspace.project.confirmations.unsavedSwitchTabs'));
      if (proceed) {
        void handleSave().then((ok) => {
          if (ok) navigate(`/portfolio/projects/${id}/${nextValue}?${searchParams.toString()}`);
        });
        return;
      } else {
        void handleReset();
      }
    }
    navigate(`/portfolio/projects/${id}/${nextValue}?${searchParams.toString()}`);
  };

  const hasPageDirtyChanges = dirty || scoringDirty;
  const hasUnsavedChanges = hasPageDirtyChanges || purposeDirty;
  const canSaveManagedDocsOnly = !hasPageDirtyChanges && purposeDirty && canContributeToProject;
  const saveDisabled = !hasUnsavedChanges || (!canManage && !canSaveManagedDocsOnly);

  const listContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    const sort = searchParams.get('sort');
    const q = searchParams.get('q');
    const filters = searchParams.get('filters');
    const projectScope = searchParams.get('projectScope');
    const involvedUserId = searchParams.get('involvedUserId');
    const involvedTeamId = searchParams.get('involvedTeamId');
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters) sp.set('filters', filters);
    if (projectScope) sp.set('projectScope', projectScope);
    if (involvedUserId) sp.set('involvedUserId', involvedUserId);
    if (involvedTeamId) sp.set('involvedTeamId', involvedTeamId);
    return sp;
  }, [searchParams]);

  const taskWorkspaceContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    const sort = searchParams.get('sort');
    const q = searchParams.get('q');
    const filters = searchParams.get('filters');
    const projectScope = searchParams.get('projectScope');
    const involvedUserId = searchParams.get('involvedUserId');
    const involvedTeamId = searchParams.get('involvedTeamId');
    sp.set('projectId', id);
    if (sort) sp.set('projectSort', sort);
    if (q) sp.set('projectQ', q);
    if (filters) sp.set('projectFilters', filters);
    if (projectScope) sp.set('projectScope', projectScope);
    if (involvedUserId) sp.set('projectInvolvedUserId', involvedUserId);
    if (involvedTeamId) sp.set('projectInvolvedTeamId', involvedTeamId);
    sp.set('projectTab', routeTab || 'tasks');
    return sp;
  }, [id, routeTab, searchParams]);

  const navigateWithTaskWorkspaceContext = React.useCallback((path: string) => {
    if (!path.startsWith('/portfolio/tasks/')) {
      navigate(path);
      return;
    }
    const [pathname, search = ''] = path.split('?');
    const sp = new URLSearchParams(search);
    taskWorkspaceContextParams.forEach((value, key) => {
      if (!sp.has(key)) sp.set(key, value);
    });
    const qs = sp.toString();
    navigate(`${pathname}${qs ? `?${qs}` : ''}`);
  }, [navigate, taskWorkspaceContextParams]);

  // Navigation for prev/next
  const sort = searchParams.get('sort') || 'priority_score:DESC';
  const q = searchParams.get('q') || '';
  const filters = searchParams.get('filters') || '';
  const involvedUserId = searchParams.get('involvedUserId') || undefined;
  const involvedTeamId = searchParams.get('involvedTeamId') || undefined;
  const navExtraParams = React.useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (involvedUserId) params.involvedUserId = involvedUserId;
    if (involvedTeamId) params.involvedTeamId = involvedTeamId;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [involvedUserId, involvedTeamId]);
  const nav = useProjectNav({ id, sort, q, filters, extraParams: navExtraParams });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null as any, nextId: null as any }
    : nav;

  const confirmAndNavigate = React.useCallback(async (targetId: string | null) => {
    if (!targetId) return;
    if (hasUnsavedChanges) {
      const proceed = window.confirm(t('portfolio:workspace.project.confirmations.unsavedNavigate'));
      if (proceed) {
        const ok = await handleSave();
        if (!ok) return;
      } else {
        await handleReset();
      }
    }
    const qs = listContextParams.toString();
    navigate(`/portfolio/projects/${targetId}/${routeTab}${qs ? `?${qs}` : ''}`);
  }, [handleSave, handleReset, hasUnsavedChanges, listContextParams, navigate, routeTab, t]);

  const statusLabel = form?.status ? getProjectStatusLabel(t, form.status) : '';
  const statusColor = STATUS_COLORS[form?.status] || 'default';
  const originLabel = originLabels[form?.origin] || form?.origin || '';
  const showRefreshState = !isCreate && !!data && isFetching;

  if (!isCreate && isLoading && !data) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {t('portfolio:workspace.project.messages.loading')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {!!error && <Alert severity="error" sx={{ mb: 1 }}>{t('portfolio:workspace.project.messages.loadFailed')}</Alert>}
      {!!saveError && <Alert severity="error" sx={{ mb: 1 }}>{saveError}</Alert>}

      <PortfolioWorkspaceShell
        activeTab={routeTab}
        tabs={tabs.map((tab) => ({
          ...tab,
          disabled: isCreate && tab.key !== 'summary',
        }))}
        onTabChange={(nextTab) => onTabChange(null as any, nextTab as TabKey)}
        sidebarStorageKey="portfolioProjectWorkspaceSidebarWidth"
        sidebarTitle={isCreate ? t('portfolio:workspace.project.sidebar.createTitle') : t('portfolio:workspace.project.sidebar.editTitle')}
        headerContent={(
          <Stack direction="row" alignItems="center" spacing={2}>
            {!isCreate && form?.priority_score != null && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: form.priority_override ? 'warning.main' : 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  boxShadow: 2,
                }}
                title={form.priority_override ? t('portfolio:workspace.project.priority.overriddenTitle') : t('portfolio:workspace.project.priority.title')}
              >
                {Math.round(form.priority_score)}
              </Box>
            )}
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {data?.item_number && (
                  <Chip
                    label={`PRJ-${data.item_number}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace' }}
                    onClick={() => navigator.clipboard.writeText(`PRJ-${data.item_number}`)}
                    title={t('portfolio:workspace.project.actions.copyReference')}
                  />
                )}
                <Typography variant="h6" sx={{ minWidth: 0 }}>
                  {isCreate ? t('portfolio:workspace.project.title.new') : (form?.name || t('portfolio:workspace.project.title.fallback'))}
                </Typography>
              </Stack>
              {!isCreate && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {form?.status && (
                    <Chip label={statusLabel} color={statusColor} size="small" />
                  )}
                  {form?.origin && (
                    <Chip
                      label={originLabel}
                      size="small"
                      variant="outlined"
                      onClick={
                        form.origin === 'standard' && form.source_requests?.[0]
                          ? () => navigate(`/portfolio/requests/${form.source_requests[0].id}/summary`)
                          : undefined
                      }
                      sx={
                        form.origin === 'standard' && form.source_requests?.[0]
                          ? { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }
                          : undefined
                      }
                      title={
                        form.origin === 'standard' && form.source_requests?.[0]
                          ? t('portfolio:workspace.project.origin.viewSourceRequest', { name: form.source_requests[0].name })
                          : undefined
                      }
                    />
                  )}
                  {form?.execution_progress != null && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.round(Number(form.execution_progress))}
                        sx={{ width: 100, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption">{Math.round(Number(form.execution_progress))}%</Typography>
                    </Stack>
                  )}
                  {total > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {t('portfolio:workspace.project.navigation.position', { index: index + 1, total })}
                    </Typography>
                  )}
                </Stack>
              )}
            </Stack>
          </Stack>
        )}
        headerActions={(
          <>
            {!isCreate && showRefreshState && (
              <Chip
                label={isPlaceholderData ? t('portfolio:workspace.project.messages.loadingTabData') : t('portfolio:workspace.project.messages.refreshing')}
                size="small"
                variant="outlined"
              />
            )}
            {!isCreate && (
              <Button
                startIcon={<ShareIcon />}
                onClick={() => setShareDialogOpen(true)}
                size="small"
              >
                {t('portfolio:actions.sendLink')}
              </Button>
            )}
            <IconButton
              aria-label={t('portfolio:actions.previous')}
              title={t('portfolio:actions.previous')}
              onClick={() => confirmAndNavigate(prevId)}
              disabled={!hasPrev}
              size="small"
            >
              <ArrowBackIcon />
            </IconButton>
            <IconButton
              aria-label={t('portfolio:actions.next')}
              title={t('portfolio:actions.next')}
              onClick={() => confirmAndNavigate(nextId)}
              disabled={!hasNext}
              size="small"
            >
              <ArrowForwardIcon />
            </IconButton>
            <Button onClick={() => { void handleReset(); }} disabled={!hasUnsavedChanges} size="small">
              {t('common:buttons.reset')}
            </Button>
            <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled} size="small">
              {t('common:buttons.save')}
            </Button>
            <IconButton
              aria-label={t('common:buttons.close')}
              title={t('common:buttons.close')}
              onClick={() => {
                const qs = listContextParams.toString();
                navigate(`/portfolio/projects${qs ? `?${qs}` : ''}`);
              }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </>
        )}
        sidebar={(
          <ProjectPropertyPanel
            canManage={canManage}
            categories={categories}
            form={form}
            focusSection={propertyPanelFocusSection}
            isCreate={isCreate}
            onCategoryChange={(value) => {
              classificationTouchedRef.current.category_id = true;
              classificationTouchedRef.current.stream_id = true;
              void persistPanelPatch({ category_id: value, stream_id: null });
            }}
            onCompanyChange={(value) => {
              classificationTouchedRef.current.company_id = true;
              void persistPanelPatch({ company_id: value });
            }}
            onLocalUpdate={applyPanelLocalUpdate}
            onNameChange={(value) => { void persistPanelPatch({ name: value }); }}
            onOriginChange={(value) => { void persistPanelPatch({ origin: value }); }}
            onPlannedEndChange={(value) => { void persistPanelPatch({ planned_end: value }); }}
            onPlannedStartChange={(value) => { void persistPanelPatch({ planned_start: value }); }}
            onRefetch={refetch}
            onSourceChange={(value) => {
              classificationTouchedRef.current.source_id = true;
              void persistPanelPatch({ source_id: value });
            }}
            onStatusChange={handleStatusChange}
            onStreamChange={(value) => {
              classificationTouchedRef.current.stream_id = true;
              void persistPanelPatch({ stream_id: value });
            }}
            onUpdate={(patch) => { void persistPanelPatch(patch); }}
            originOptions={originOptions}
            originLabels={originLabels}
            sources={sources}
            statusOptions={statusOptions}
            streams={streams}
          />
        )}
      >
        {showRefreshState && (
          <LinearProgress sx={{ mb: 2 }} />
        )}
        {routeTab === 'summary' && (
          <ProjectSummaryTab
            canEditManagedDocs={canContributeToProject}
            form={form}
            id={id}
            isCreate={isCreate}
            onOpenTab={(tab) => onTabChange(null as any, tab)}
            onPurposeDirtyChange={setPurposeDirty}
            onPurposeDraftChange={(value) => updateManagedDocDraft({ purpose: value })}
            purposeEditorRef={purposeEditorRef}
            statusColor={statusColor}
            statusLabel={statusLabel}
          />
        )}

        {routeTab === 'scoring' && !isCreate && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.project.loadingTabs.scoring')} />}>
            <ProjectScoringTab
              form={form}
              mandatoryBypassEnabled={portfolioSettings?.mandatory_bypass_enabled ?? false}
              onDirtyChange={setScoringDirty}
              onScoreChange={(newScore) => setForm((prev: any) => ({ ...prev, priority_score: newScore }))}
              readOnly={!canManage}
              scoringEditorRef={scoringEditorRef}
            />
          </React.Suspense>
        )}

        {routeTab === 'timeline' && !isCreate && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.project.loadingTabs.timeline')} />}>
            <ProjectTimelineTab
              canManage={canManage}
              form={form}
              projectId={id}
              onError={setSaveError}
              onNavigateToTask={navigateWithTaskWorkspaceContext}
              onRefetch={refetch}
              onSetForm={setForm}
              onUpdate={update}
            />
          </React.Suspense>
        )}

        {routeTab === 'effort' && !isCreate && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.project.loadingTabs.progress')} />}>
            <ProjectEffortTab
              businessAllocationData={businessAllocationData}
              canContributeToProject={canContributeToProject}
              canManage={canManage}
              canProjectAdmin={canProjectAdmin}
              form={form}
              itAllocationData={itAllocationData}
              onError={setSaveError}
              onRefetch={refetch}
              onRefetchBusinessAlloc={refetchBusinessAlloc}
              onRefetchItAlloc={refetchItAlloc}
              onUpdate={update}
              profileId={profile?.id}
              projectId={id}
              taskTimeEntries={taskTimeEntries}
              taskTimeSummary={taskTimeSummary}
            />
          </React.Suspense>
        )}

        {routeTab === 'tasks' && !isCreate && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.project.loadingTabs.tasks')} />}>
            <ProjectTasksPanel
              projectId={id}
              phases={form?.phases || []}
              disabled={!canManage}
            />
          </React.Suspense>
        )}

        {routeTab === 'knowledge' && !isCreate && form?.id && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.project.loadingTabs.knowledge')} />}>
            <ProjectKnowledgeTab
              entityId={form.id}
              canCreate={hasLevel('knowledge', 'member')}
            />
          </React.Suspense>
        )}

        {routeTab === 'activity' && !isCreate && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.project.loadingTabs.activity')} />}>
            <ProjectActivityTab
              entityId={form?.id || ''}
              activities={form?.activities || []}
              currentStatus={form?.status || ''}
              allowedTransitions={ALLOWED_TRANSITIONS[form?.status] || []}
              statusOptions={statusOptions}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              currentUserId={profile?.id}
              readOnly={!canManage}
              onImageUpload={handleImageUpload}
              onImageUrlImport={handleImageUrlImport}
            />
          </React.Suspense>
        )}
      </PortfolioWorkspaceShell>

      <StatusChangeDialog
        open={statusDialogOpen}
        currentStatus={form?.status || ''}
        newStatus={pendingStatus || ''}
        onConfirm={handleStatusDialogConfirm}
        onCancel={handleStatusDialogCancel}
      />

      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        itemType="project"
        itemId={form?.id || id}
        itemName={form?.name || t('portfolio:workspace.project.title.fallback')}
        itemNumber={data?.item_number}
      />
    </Box>
  );
}
