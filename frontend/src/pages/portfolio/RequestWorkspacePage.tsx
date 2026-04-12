import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  IconButton, LinearProgress, Snackbar, Stack, Typography, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import TransformIcon from '@mui/icons-material/Transform';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import api from '../../api';
import { useRequestNav } from '../../hooks/useRequestNav';
import { useClassificationDefaults } from '../../hooks/useClassificationDefaults';
import { useAuth } from '../../auth/AuthContext';
import ConvertToProjectDialog from './components/ConvertToProjectDialog';
import StatusChangeDialog from './components/StatusChangeDialog';
import RecommendationDialog from './components/RecommendationDialog';
import { type RequestScoringEditorHandle } from './editors/RequestScoringEditor';
import { useRecentlyViewed } from '../workspace/hooks/useRecentlyViewed';
import { buildInlineImageUrl, resolveInlineImageTenantSlug } from '../../utils/inlineImageUrls';
import ShareDialog from '../../components/ShareDialog';
import { formatItemRef } from '../../utils/item-ref';
import { type IntegratedDocumentEditorHandle } from '../../components/IntegratedDocumentEditor';
import PortfolioWorkspaceShell from './workspace/PortfolioWorkspaceShell';
import RequestPropertyPanel from './workspace/request/RequestPropertyPanel';
import RequestSummaryTab from './workspace/request/RequestSummaryTab';
import WorkspaceTabLoadingFallback from './workspace/WorkspaceTabLoadingFallback';
import { getRequestWorkspaceInclude } from './workspace/workspace-detail-includes';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { getDotColor, REQUEST_STATUS_COLORS } from '../../utils/statusColors';
import {
  getDecisionOutcomeLabel,
  getRequestStatusLabel,
  getRequestStatusOptions,
} from '../../utils/portfolioI18n';
import { useLocale } from '../../i18n/useLocale';
import { useTenant } from '../../tenant/TenantContext';

type TabKey = 'summary' | 'analysis' | 'scoring' | 'knowledge' | 'activity';
type LegacyPanelRoute = 'overview' | 'team' | 'relations';
type RouteTabKey = TabKey | LegacyPanelRoute;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_review: ['candidate', 'approved', 'rejected', 'on_hold'],
  candidate: ['approved', 'rejected', 'on_hold'],
  approved: ['converted'],
  on_hold: ['pending_review', 'candidate', 'rejected'],
  rejected: ['pending_review'],
  converted: [],
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

const ANALYSIS_RECOMMENDATION_CONTEXT = 'analysis recommendation';

const DECISION_OUTCOME_COLORS: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  go: 'success',
  no_go: 'error',
  defer: 'warning',
  need_info: 'info',
  analysis_complete: 'info',
};

const RequestAnalysisTab = React.lazy(() => import('./workspace/request/RequestAnalysisTab'));
const RequestActivityTab = React.lazy(() => import('./workspace/request/RequestActivityTab'));
const RequestScoringTab = React.lazy(() => import('./workspace/request/RequestScoringTab'));
const RequestKnowledgeTab = React.lazy(() => import('./workspace/request/RequestKnowledgeTab'));

export default function RequestWorkspacePage() {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const locale = useLocale();
  const theme = useTheme();
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
  const requestInclude = React.useMemo(() => getRequestWorkspaceInclude(routeTab), [routeTab]);
  const tabs = React.useMemo<Array<{ key: TabKey; label: string }>>(() => [
    { key: 'summary', label: t('portfolio:labels.summary') },
    { key: 'activity', label: t('portfolio:labels.activity') },
    { key: 'analysis', label: t('portfolio:labels.analysis') },
    { key: 'scoring', label: t('portfolio:labels.scoring') },
    { key: 'knowledge', label: t('portfolio:labels.knowledge') },
  ], [t]);
  const statusOptions = React.useMemo(() => getRequestStatusOptions(t), [t]);

  React.useEffect(() => {
    if (rawRouteTab === 'overview') {
      navigate(`/portfolio/requests/${id}/summary${location.search}`, { replace: true });
      return;
    }
    if (isCreate && rawRouteTab !== 'summary') {
      navigate(`/portfolio/requests/${id}/summary${location.search}`, { replace: true });
    }
  }, [id, isCreate, location.search, navigate, rawRouteTab]);

  // Fetch request data
  const { data, error, isFetching, isLoading, isPlaceholderData, refetch } = useQuery({
    queryKey: ['portfolio-request', id, requestInclude],
    queryFn: async () => {
      const res = await api.get(`/portfolio/requests/${id}`, { params: { include: requestInclude } });
      return res.data;
    },
    enabled: !isCreate,
  });

  // Track recently viewed
  React.useEffect(() => {
    if (data?.id && data?.name) {
      addToRecent('request', data.id, data.name);
    }
  }, [data?.id, data?.name, addToRecent]);

  // Browser tab title
  React.useEffect(() => {
    if (data?.item_number && data?.name) {
      document.title = t('portfolio:workspace.request.browserTitle', {
        ref: `REQ-${data.item_number}`,
        name: data.name,
      });
    }
    return () => { document.title = 'KANAP'; };
  }, [data?.item_number, data?.name, t]);

  // Replace UUID in URL with human-readable ref
  React.useEffect(() => {
    if (!data?.item_number) return;
    const currentParam = params.id || '';
    const isUuid = /^[0-9a-f]{8}-/.test(currentParam);
    if (isUuid) {
      const ref = formatItemRef('request', data.item_number);
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

  const sources = classificationData?.sources?.filter((t) => t.is_active) || [];
  const categories = classificationData?.categories?.filter((c) => c.is_active) || [];
  const streams = classificationData?.streams?.filter((s) => s.is_active) || [];

  const [form, setForm] = React.useState<any>({});
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [recommendationDialogOpen, setRecommendationDialogOpen] = React.useState(false);
  const [recommendationToast, setRecommendationToast] = React.useState<string | null>(null);
  const [highlightLatestRecommendation, setHighlightLatestRecommendation] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
  const scoringEditorRef = React.useRef<RequestScoringEditorHandle>(null);
  const purposeEditorRef = React.useRef<IntegratedDocumentEditorHandle>(null);
  const risksEditorRef = React.useRef<IntegratedDocumentEditorHandle>(null);
  const savedScoreRef = React.useRef<number | null>(null);
  const canManage = hasLevel('portfolio_requests', 'manager');
  const canEditManagedDocs = hasLevel('portfolio_requests', 'member');
  const canAdmin = hasLevel('portfolio_requests', 'admin');
  const [tabDirty, setTabDirty] = React.useState(false);
  const [scoringDirty, setScoringDirty] = React.useState(false);
  const [purposeDirty, setPurposeDirty] = React.useState(false);
  const [risksDirty, setRisksDirty] = React.useState(false);
  const hasTabDirtyChanges = tabDirty || scoringDirty;
  const hasManagedDocumentChanges = purposeDirty || risksDirty;
  const hasUnsavedChanges = hasTabDirtyChanges || hasManagedDocumentChanges;
  const canSaveManagedDocsOnly = !hasTabDirtyChanges && hasManagedDocumentChanges && canEditManagedDocs;
  const saveDisabled = !hasUnsavedChanges || (!canManage && !canSaveManagedDocsOnly);
  const classificationTouchedRef = React.useRef({
    source_id: false,
    category_id: false,
    stream_id: false,
    company_id: false,
  });
  const defaultsAppliedRef = React.useRef(false);
  const { data: classificationDefaults, isLoading: classificationDefaultsLoading } = useClassificationDefaults();

  React.useEffect(() => {
    setForm(isCreate ? {} : {});
    setTabDirty(false);
    setScoringDirty(false);
    setPurposeDirty(false);
    setRisksDirty(false);
    setSaveError(null);
    savedScoreRef.current = null;
    scoringEditorRef.current?.reset?.();
    void Promise.all([
      purposeEditorRef.current?.reset?.(),
      risksEditorRef.current?.reset?.(),
    ]);
  }, [id, isCreate]);

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

  // Sync form with loaded data
  React.useEffect(() => {
    if (data && !isCreate) {
      // If we just saved a score, use that instead of potentially stale data
      if (savedScoreRef.current !== null) {
        setForm({
          ...data,
          priority_score: savedScoreRef.current,
        });
        savedScoreRef.current = null;
      } else {
        setForm({ ...data });
      }
    }
  }, [data, isCreate]);

  React.useEffect(() => {
    if (!highlightLatestRecommendation) return;
    const timer = window.setTimeout(() => setHighlightLatestRecommendation(false), 4500);
    return () => window.clearTimeout(timer);
  }, [highlightLatestRecommendation]);

  const update = React.useCallback((patch: any) => {
    setTabDirty(true);
    setForm((prev: any) => ({ ...prev, ...patch }));
  }, []);

  const updateManagedDocDraft = React.useCallback((patch: any) => {
    if (isCreate) {
      setTabDirty(true);
    }
    setForm((prev: any) => ({ ...prev, ...patch }));
  }, [isCreate]);

  const applyPanelLocalUpdate = React.useCallback((updater: (prev: any) => any) => {
    setForm((prev: any) => updater(prev || {}));
  }, []);

  const persistPanelPatch = React.useCallback(async (patch: Record<string, any>) => {
    if (!isCreate && !canManage) {
      setSaveError(t('portfolio:workspace.request.messages.permissionSavePanel'));
      await refetch();
      return;
    }

    setForm((prev: any) => ({ ...prev, ...patch }));

    if (isCreate) {
      setTabDirty(true);
      return;
    }

    setSaveError(null);
    try {
      await api.patch(`/portfolio/requests/${id}`, patch);
      queryClient.invalidateQueries({ queryKey: ['portfolio-requests'] });
    } catch (error) {
      setSaveError(getApiErrorMessage(error, t, t('portfolio:workspace.request.messages.savePanelFailed')));
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
        const res = await api.post('/portfolio/requests', form);
        const newId = res.data?.id;
        if (newId) {
          setTabDirty(false);
          navigate(`/portfolio/requests/${newId}/summary?${searchParams.toString()}`);
          return true;
        }
        return false;
      } else {
        if (!canManage && hasTabDirtyChanges) {
          setSaveError(t('portfolio:workspace.request.messages.permissionSaveWorkspace'));
          return false;
        }

        if (canManage) {
          const requestPayload: Record<string, any> = {};
          const editableFields = ['feasibility_review'];
          for (const field of editableFields) {
            if (Object.prototype.hasOwnProperty.call(form, field)) {
              requestPayload[field] = form[field];
            }
          }
          if (Object.keys(requestPayload).length > 0) {
            await api.patch(`/portfolio/requests/${id}`, requestPayload);
          }

          // Save scoring data if the editor is dirty and store the score for the useEffect.
          if (scoringEditorRef.current?.isDirty()) {
            savedScoreRef.current = await scoringEditorRef.current.save();
          }
        }

        if (purposeEditorRef.current?.isDirty()) {
          const ok = await purposeEditorRef.current.save();
          if (!ok) return false;
        }
        if (risksEditorRef.current?.isDirty()) {
          const ok = await risksEditorRef.current.save();
          if (!ok) return false;
        }

        setTabDirty(false);
        setScoringDirty(false);
        setPurposeDirty(false);
        setRisksDirty(false);
        await refetch();

        queryClient.invalidateQueries({ queryKey: ['portfolio-requests'] });
        return true;
      }
    } catch (error) {
      setSaveError(getApiErrorMessage(error, t, t('portfolio:workspace.request.messages.saveFailed')));
      return false;
    }
  };

  const handleReset = async () => {
    if (data) {
      setForm({ ...data });
    } else {
      setForm({});
    }
    setTabDirty(false);
    setScoringDirty(false);
    setPurposeDirty(false);
    setRisksDirty(false);
    setSaveError(null);
    scoringEditorRef.current?.reset?.();
    await Promise.all([
      purposeEditorRef.current?.reset?.(),
      risksEditorRef.current?.reset?.(),
    ]);
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
      await api.patch(`/portfolio/requests/${id}`, {
        status: pendingStatus,
        is_decision: options.isDecision,
        decision_outcome: options.outcome,
        decision_context: options.context,
        decision_rationale: options.rationale,
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['portfolio-requests'] });
    } catch (error) {
      setSaveError(getApiErrorMessage(error, t, t('portfolio:workspace.request.messages.updateStatusFailed')));
    } finally {
      setPendingStatus(null);
    }
  }, [id, pendingStatus, refetch, queryClient, t]);

  const handleStatusDialogCancel = React.useCallback(() => {
    setStatusDialogOpen(false);
    setPendingStatus(null);
  }, []);

  const handleDelete = React.useCallback(async () => {
    setDeleteConfirmOpen(false);
    try {
      await api.delete(`/portfolio/requests/${id}`);
      queryClient.invalidateQueries({ queryKey: ['portfolio-requests'] });
      navigate('/portfolio/requests');
    } catch (error) {
      setSaveError(getApiErrorMessage(error, t, t('portfolio:workspace.request.messages.deleteFailed')));
    }
  }, [id, queryClient, navigate, t]);

  const handleAddComment = React.useCallback(async (data: {
    content: string;
    context: string | null;
    is_decision: boolean;
    decision_outcome?: string;
    new_status?: string;
  }) => {
    await api.post(`/portfolio/requests/${id}/comments`, data);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['portfolio-requests'] });
  }, [id, refetch, queryClient]);

  const handleUpdateComment = React.useCallback(async (activityId: string, content: string) => {
    await api.patch(`/portfolio/requests/${id}/comments/${activityId}`, { content });
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['portfolio-requests'] });
  }, [id, refetch, queryClient]);

  const handleOpenRecommendationDialog = React.useCallback(async () => {
    if (hasUnsavedChanges) {
      const proceed = window.confirm(t('portfolio:workspace.request.confirmations.unsavedRecommendation'));
      if (!proceed) return;
      const ok = await handleSave();
      if (!ok) return;
    }
    setRecommendationDialogOpen(true);
  }, [handleSave, hasUnsavedChanges, t]);

  const handleSubmitRecommendation = React.useCallback(async (payload: {
    content: string;
    context: string | null;
    is_decision: boolean;
    decision_outcome?: string;
    new_status?: string;
  }) => {
    await handleAddComment(payload);
    setRecommendationDialogOpen(false);
    const outcomeLabel = payload.decision_outcome
      ? getDecisionOutcomeLabel(t, payload.decision_outcome)
      : t('portfolio:workspace.request.messages.recommendationSubmittedFallback');
    setRecommendationToast(t('portfolio:workspace.request.messages.recommendationSubmitted', { outcome: outcomeLabel }));
    setHighlightLatestRecommendation(true);
  }, [handleAddComment, t]);

  // Handle inline image upload for rich text fields
  const handleImageUpload = React.useCallback(async (file: File, sourceField: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_field', sourceField);
    const res = await api.post<{ id: string }>(`/portfolio/requests/${id}/attachments/inline`, formData);
    return buildInlineImageUrl(`/portfolio/requests/inline/${inlineImageTenantSlug}/${res.data.id}`);
  }, [id, inlineImageTenantSlug]);

  const handleImageUrlImport = React.useCallback(async (sourceUrl: string, sourceField: string): Promise<string> => {
    const res = await api.post<{ id: string }>(`/portfolio/requests/${id}/attachments/inline/import`, {
      source_field: sourceField,
      source_url: sourceUrl,
    });
    return buildInlineImageUrl(`/portfolio/requests/inline/${inlineImageTenantSlug}/${res.data.id}`);
  }, [id, inlineImageTenantSlug]);

  const onTabChange = (_: React.SyntheticEvent | null, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'summary') return;
    if (hasUnsavedChanges) {
      const proceed = window.confirm(t('portfolio:workspace.request.confirmations.unsavedSwitchTabs'));
      if (proceed) {
        void handleSave().then((ok) => {
          if (ok) navigate(`/portfolio/requests/${id}/${nextValue}?${searchParams.toString()}`);
        });
        return;
      } else {
        void handleReset();
      }
    }
    navigate(`/portfolio/requests/${id}/${nextValue}?${searchParams.toString()}`);
  };

  const listContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    const sort = searchParams.get('sort');
    const q = searchParams.get('q');
    const filters = searchParams.get('filters');
    const requestScope = searchParams.get('requestScope');
    const involvedUserId = searchParams.get('involvedUserId');
    const involvedTeamId = searchParams.get('involvedTeamId');
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters) sp.set('filters', filters);
    if (requestScope) sp.set('requestScope', requestScope);
    if (involvedUserId) sp.set('involvedUserId', involvedUserId);
    if (involvedTeamId) sp.set('involvedTeamId', involvedTeamId);
    return sp;
  }, [searchParams]);

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
  const nav = useRequestNav({ id, sort, q, filters, extraParams: navExtraParams });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null as any, nextId: null as any }
    : nav;

  const confirmAndNavigate = React.useCallback(async (targetId: string | null) => {
    if (!targetId) return;
    if (hasUnsavedChanges) {
      const proceed = window.confirm(t('portfolio:workspace.request.confirmations.unsavedNavigate'));
      if (proceed) {
        const ok = await handleSave();
        if (!ok) return;
      } else {
        await handleReset();
      }
    }
    const qs = listContextParams.toString();
    navigate(`/portfolio/requests/${targetId}/${routeTab}${qs ? `?${qs}` : ''}`);
  }, [handleSave, handleReset, hasUnsavedChanges, listContextParams, navigate, routeTab, t]);

  const statusLabel = form?.status ? getRequestStatusLabel(t, form.status) : '';
  const statusColor = (REQUEST_STATUS_COLORS[form?.status] || 'default') as 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info';
  const categoryName = classificationData?.categories?.find((c) => c.id === form?.category_id)?.name;
  const streamName = classificationData?.streams?.find((s) => s.id === form?.stream_id)?.name;
  const analysisRecommendations = React.useMemo(() => {
    const activities = Array.isArray(form?.activities) ? form.activities : [];
    return activities
      .filter((a: any) => (
        a?.type === 'decision' &&
        String(a?.context || '').trim().toLowerCase() === ANALYSIS_RECOMMENDATION_CONTEXT
      ))
      .sort((a: any, b: any) => {
        const aTime = new Date(a?.created_at || 0).getTime();
        const bTime = new Date(b?.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [form?.activities]);
  const latestAnalysisRecommendation = analysisRecommendations[0] || null;
  const recommendationButtonLabel = latestAnalysisRecommendation
    ? t('portfolio:workspace.request.actions.submitNewRecommendation')
    : t('portfolio:workspace.request.actions.submitRecommendation');
  const latestRecommendationOutcome = latestAnalysisRecommendation?.decision_outcome
    ? getDecisionOutcomeLabel(t, latestAnalysisRecommendation.decision_outcome)
    : null;
  const latestRecommendationOutcomeColor = latestAnalysisRecommendation?.decision_outcome
    ? (DECISION_OUTCOME_COLORS[latestAnalysisRecommendation.decision_outcome] || 'default')
    : 'default';
  const latestRecommendationAuthor = [latestAnalysisRecommendation?.first_name, latestAnalysisRecommendation?.last_name]
    .filter(Boolean)
    .join(' ')
    || t('portfolio:activity.authorUnknown');
  const latestRecommendationCreatedAt = latestAnalysisRecommendation?.created_at
    ? new Date(latestAnalysisRecommendation.created_at).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '';
  const latestRecommendationStatusChange = latestAnalysisRecommendation?.changed_fields?.status;
  const showRefreshState = !isCreate && !!data && isFetching;

  if (!isCreate && isLoading && !data) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {t('portfolio:workspace.request.messages.loading')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {!!error && <Alert severity="error" sx={{ mb: 1 }}>{t('portfolio:workspace.request.messages.loadFailed')}</Alert>}
      {!!saveError && <Alert severity="error" sx={{ mb: 1 }}>{saveError}</Alert>}

      <PortfolioWorkspaceShell
        activeTab={routeTab}
        tabs={tabs.map((tab) => ({
          ...tab,
          disabled: isCreate && tab.key !== 'summary',
        }))}
        onTabChange={(nextTab) => onTabChange(null, nextTab as TabKey)}
        sidebarStorageKey="portfolioRequestWorkspaceSidebarWidth"
        sidebarTitle={isCreate ? t('portfolio:workspace.request.sidebar.createTitle') : t('portfolio:workspace.request.sidebar.editTitle')}
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
                title={form.priority_override ? t('portfolio:workspace.request.priority.overriddenTitle') : t('portfolio:workspace.request.priority.title')}
              >
                {Math.round(form.priority_score)}
              </Box>
            )}
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {data?.item_number && (
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ fontFamily: 'monospace', color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
                    onClick={() => navigator.clipboard.writeText(`REQ-${data.item_number}`)}
                    title={t('portfolio:workspace.request.actions.copyReference')}
                  >
                    {`REQ-${data.item_number}`}
                  </Typography>
                )}
                <Typography variant="h6" sx={{ minWidth: 0 }}>
                  {isCreate ? t('portfolio:workspace.request.title.new') : (form?.name || t('portfolio:workspace.request.title.fallback'))}
                </Typography>
              </Stack>
              {!isCreate && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {form?.status && (
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 500, color: getDotColor(statusColor, theme.palette.mode), lineHeight: 1 }}>
                      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, bgcolor: getDotColor(statusColor, theme.palette.mode) }} />
                      {statusLabel}
                    </Box>
                  )}
                  {form?.origin_task?.id && (
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
                      onClick={() => navigate(`/portfolio/tasks/${form.origin_task.id}/overview`)}
                      title={t('portfolio:workspace.request.originTask.title', { name: form.origin_task.title || form.origin_task.id })}
                    >
                      {form.origin_task.item_number
                        ? t('portfolio:workspace.request.originTask.withReference', { ref: `T-${form.origin_task.item_number}` })
                        : t('portfolio:workspace.request.originTask.fallback')}
                    </Typography>
                  )}
                  {total > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {t('portfolio:workspace.request.navigation.position', { index: index + 1, total })}
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
              <Typography variant="caption" color="text.secondary">
                {isPlaceholderData ? t('portfolio:workspace.request.messages.loadingTabData') : t('portfolio:workspace.request.messages.refreshing')}
              </Typography>
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
            {!isCreate && (form?.status === 'approved' || form?.status === 'converted') && (
              <Button
                variant="outlined"
                startIcon={<TransformIcon />}
                onClick={() => setConvertDialogOpen(true)}
                size="small"
              >
                {t('portfolio:actions.convertToProject')}
              </Button>
            )}
            <Button onClick={() => { void handleReset(); }} disabled={!hasUnsavedChanges} size="small">
              {t('common:buttons.reset')}
            </Button>
            {!isCreate && canAdmin && form?.status !== 'converted' && (
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                onClick={() => setDeleteConfirmOpen(true)}
                size="small"
              >
                {t('common:buttons.delete')}
              </Button>
            )}
            <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled} size="small">
              {t('common:buttons.save')}
            </Button>
            <IconButton
              aria-label={t('common:buttons.close')}
              title={t('common:buttons.close')}
              onClick={() => {
                const qs = listContextParams.toString();
                navigate(`/portfolio/requests${qs ? `?${qs}` : ''}`);
              }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </>
        )}
        sidebar={(
          <RequestPropertyPanel
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
            onRefetch={refetch}
            onRequestorChange={(value) => { void persistPanelPatch({ requestor_id: value }); }}
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
          <RequestSummaryTab
            canEditManagedDocs={canEditManagedDocs}
            form={form}
            id={id}
            isCreate={isCreate}
            latestAnalysisRecommendation={latestAnalysisRecommendation}
            latestRecommendationAuthor={latestRecommendationAuthor}
            latestRecommendationCreatedAt={latestRecommendationCreatedAt}
            latestRecommendationOutcome={latestRecommendationOutcome}
            latestRecommendationOutcomeColor={latestRecommendationOutcomeColor}
            latestRecommendationStatusChange={latestRecommendationStatusChange}
            onOpenTab={(tab) => onTabChange(null, tab)}
            onPurposeDirtyChange={setPurposeDirty}
            onPurposeDraftChange={(value) => updateManagedDocDraft({ purpose: value })}
            purposeEditorRef={purposeEditorRef}
            statusColor={statusColor}
            statusLabel={statusLabel}
          />
        )}

        {routeTab === 'analysis' && !isCreate && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.request.loadingTabs.analysis')} />}>
            <RequestAnalysisTab
              canEditManagedDocs={canEditManagedDocs}
              canManage={canManage}
              categoryName={categoryName}
              form={form}
              highlightLatestRecommendation={highlightLatestRecommendation}
              id={id}
              latestAnalysisRecommendation={latestAnalysisRecommendation}
              latestRecommendationAuthor={latestRecommendationAuthor}
              latestRecommendationCreatedAt={latestRecommendationCreatedAt}
              latestRecommendationOutcome={latestRecommendationOutcome}
              latestRecommendationOutcomeColor={latestRecommendationOutcomeColor}
              latestRecommendationStatusChange={latestRecommendationStatusChange}
              onBusinessProcessesChange={async (ids) => {
                await api.post(`/portfolio/requests/${form.id}/business-processes/bulk-replace`, {
                  business_process_ids: ids,
                });
                await refetch();
              }}
              onOpenActivity={() => onTabChange(null, 'activity')}
              onOpenRecommendationDialog={() => { void handleOpenRecommendationDialog(); }}
              onRisksDraftChange={(value) => updateManagedDocDraft({ risks: value })}
              onRisksDirtyChange={setRisksDirty}
              onUpdateFeasibilityReview={(value) => update({ feasibility_review: value })}
              recommendationButtonLabel={recommendationButtonLabel}
              risksEditorRef={risksEditorRef}
              streamName={streamName}
            />
          </React.Suspense>
        )}

        {routeTab === 'scoring' && !isCreate && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.request.loadingTabs.scoring')} />}>
            <RequestScoringTab
              form={form}
              mandatoryBypassEnabled={portfolioSettings?.mandatory_bypass_enabled ?? false}
              onDirtyChange={setScoringDirty}
              onScoreChange={(newScore) => {
                setForm((prev: any) => ({ ...prev, priority_score: newScore }));
              }}
              readOnly={!canManage || form?.status === 'converted'}
              scoringEditorRef={scoringEditorRef}
            />
          </React.Suspense>
        )}

        {routeTab === 'knowledge' && !isCreate && form?.id && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.request.loadingTabs.knowledge')} />}>
            <RequestKnowledgeTab
              entityId={form.id}
              canCreate={hasLevel('knowledge', 'member')}
            />
          </React.Suspense>
        )}

        {routeTab === 'activity' && !isCreate && (
          <React.Suspense fallback={<WorkspaceTabLoadingFallback label={t('portfolio:workspace.request.loadingTabs.activity')} />}>
            <RequestActivityTab
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

      {!isCreate && form && (
        <ConvertToProjectDialog
          open={convertDialogOpen}
          onClose={() => setConvertDialogOpen(false)}
          request={{
            id: form.id,
            name: form.name || '',
            target_delivery_date: form.target_delivery_date,
          }}
          onSuccess={(projectId) => {
            setConvertDialogOpen(false);
            navigate(`/portfolio/projects/${projectId}/summary`);
          }}
        />
      )}

      <RecommendationDialog
        open={recommendationDialogOpen}
        currentStatus={form?.status || ''}
        allowedTransitions={ALLOWED_TRANSITIONS[form?.status] || []}
        statusOptions={statusOptions}
        priorityScore={form?.priority_score}
        onClose={() => setRecommendationDialogOpen(false)}
        onSubmit={handleSubmitRecommendation}
        onImageUpload={handleImageUpload}
        onImageUrlImport={handleImageUrlImport}
      />

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
        itemType="request"
        itemId={form?.id || id}
        itemName={form?.name || t('portfolio:workspace.request.title.fallback')}
        itemNumber={data?.item_number}
      />

      <Snackbar
        open={!!recommendationToast}
        autoHideDuration={4500}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setRecommendationToast(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setRecommendationToast(null)}
          sx={{ width: '100%' }}
        >
          {recommendationToast}
        </Alert>
      </Snackbar>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>{t('portfolio:workspace.request.deleteDialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('portfolio:workspace.request.deleteDialog.message', { name: form?.name || t('portfolio:workspace.request.title.fallback') })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>{t('common:buttons.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()}>
            {t('common:buttons.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
