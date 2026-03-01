import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider,
  IconButton, Snackbar, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import TransformIcon from '@mui/icons-material/Transform';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../../api';
import { useRequestNav } from '../../hooks/useRequestNav';
import { useClassificationDefaults } from '../../hooks/useClassificationDefaults';
import { useAuth } from '../../auth/AuthContext';
import UserSelect from '../../components/fields/UserSelect';
import CompanySelect from '../../components/fields/CompanySelect';
import DepartmentSelect from '../../components/fields/DepartmentSelect';
import DateEUField from '../../components/fields/DateEUField';
import EnumAutocomplete from '../../components/fields/EnumAutocomplete';
import ExportButton from '../../components/ExportButton';
import { MarkdownContent } from '../../components/MarkdownContent';
import ConvertToProjectDialog from './components/ConvertToProjectDialog';
import StatusChangeDialog from './components/StatusChangeDialog';
import PortfolioActivity from './components/PortfolioActivity';
import RecommendationDialog from './components/RecommendationDialog';
import RequestScoringEditor, { RequestScoringEditorHandle } from './editors/RequestScoringEditor';
import RequestRelationsPanel, { RequestRelationsPanelHandle } from './editors/RequestRelationsPanel';
import FeasibilityReview from './editors/FeasibilityReview';
import DependencySelector from './components/DependencySelector';
import TeamMemberMultiSelect from '../../components/fields/TeamMemberMultiSelect';
import BusinessProcessMultiSelect from '../../components/fields/BusinessProcessMultiSelect';
import { useRecentlyViewed } from '../workspace/hooks/useRecentlyViewed';
import { buildInlineImageUrl, getTenantSlugFromHostname } from '../../utils/inlineImageUrls';
import ShareDialog from '../../components/ShareDialog';
import { formatItemRef } from '../../utils/item-ref';

type TabKey = 'overview' | 'analysis' | 'scoring' | 'team' | 'relations' | 'activity';

const MarkdownEditor = React.lazy(() => import('../../components/MarkdownEditor'));

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'team', label: 'Team' },
  { key: 'relations', label: 'Relations' },
];

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_review: ['candidate', 'approved', 'rejected', 'on_hold'],
  candidate: ['approved', 'rejected', 'on_hold'],
  approved: ['converted'],
  on_hold: ['pending_review', 'candidate', 'rejected'],
  rejected: ['pending_review'],
  converted: [],
};

const STATUS_OPTIONS = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'approved', label: 'Approved' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'rejected', label: 'Rejected' },
];

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

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  pending_review: 'default',
  candidate: 'info',
  approved: 'primary',
  on_hold: 'warning',
  rejected: 'error',
  converted: 'success',
};

const ANALYSIS_RECOMMENDATION_CONTEXT = 'analysis recommendation';

const DECISION_OUTCOME_LABELS: Record<string, string> = {
  go: 'Go',
  no_go: 'No-Go',
  defer: 'Defer',
  need_info: 'Need Info',
  analysis_complete: 'Analysis Complete',
};

const DECISION_OUTCOME_COLORS: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  go: 'success',
  no_go: 'error',
  defer: 'warning',
  need_info: 'info',
  analysis_complete: 'info',
};

const hasRichTextContent = (value: unknown): boolean => {
  if (value == null) return false;
  const text = String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_~`>\-\[\]()!|]/g, '')
    .trim();
  return text.length > 0;
};

export default function RequestWorkspacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasLevel, profile } = useAuth();
  const { addToRecent } = useRecentlyViewed();

  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const id = idParam;
  const routeTab = (params.tab as TabKey) || 'overview';

  // Fetch request data
  const { data, error, refetch } = useQuery({
    queryKey: ['portfolio-request', id],
    queryFn: async () => {
      const include = 'team,sponsors,contacts,urls,attachments,activities,company,department,financials,projects,dependencies,business_processes,origin_task';
      const res = await api.get(`/portfolio/requests/${id}`, { params: { include } });
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
      document.title = `REQ-${data.item_number} — ${data.name} | KANAP`;
    }
    return () => { document.title = 'KANAP'; };
  }, [data?.item_number, data?.name]);

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
  const [dirty, setDirty] = React.useState(false);
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
  const relationsPanelRef = React.useRef<RequestRelationsPanelHandle>(null);
  const savedScoreRef = React.useRef<number | null>(null);
  const canManage = hasLevel('portfolio_requests', 'manager');
  const canAdmin = hasLevel('portfolio_requests', 'admin');
  const [scoringDirty, setScoringDirty] = React.useState(false);
  const [relationsDirty, setRelationsDirty] = React.useState(false);
  const saveDisabled = (!dirty && !scoringDirty && !relationsDirty) || !canManage;
  const classificationTouchedRef = React.useRef({
    source_id: false,
    category_id: false,
    stream_id: false,
    company_id: false,
  });
  const defaultsAppliedRef = React.useRef(false);
  const { data: classificationDefaults, isLoading: classificationDefaultsLoading } = useClassificationDefaults();

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
        setForm({ ...data, priority_score: savedScoreRef.current });
        savedScoreRef.current = null;
      } else {
        setForm({ ...data });
      }
    }
  }, [data, isCreate]);

  React.useEffect(() => {
    if (isCreate || routeTab !== 'activity') return;
    void refetch();
  }, [isCreate, routeTab, refetch]);

  React.useEffect(() => {
    if (!highlightLatestRecommendation) return;
    const timer = window.setTimeout(() => setHighlightLatestRecommendation(false), 4500);
    return () => window.clearTimeout(timer);
  }, [highlightLatestRecommendation]);

  const update = React.useCallback((patch: any) => {
    setDirty(true);
    setForm((prev: any) => ({ ...prev, ...patch }));
  }, []);

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
          setDirty(false);
          navigate(`/portfolio/requests/${newId}/overview?${searchParams.toString()}`);
          return true;
        }
        return false;
      } else {
        // Only send the actual request fields, not loaded relations
        const requestPayload: Record<string, any> = {};
        const editableFields = [
          'name', 'purpose', 'source_id', 'category_id', 'stream_id', 'requestor_id', 'company_id', 'department_id',
          'target_delivery_date', 'status', 'feasibility_review', 'risks',
          // Note: sponsor/lead fields are saved immediately on change, not with the main form
        ];
        for (const field of editableFields) {
          if (Object.prototype.hasOwnProperty.call(form, field)) {
            requestPayload[field] = form[field];
          }
        }
        await api.patch(`/portfolio/requests/${id}`, requestPayload);

        // Save scoring data if the editor is dirty and store the score for the useEffect
        if (scoringEditorRef.current?.isDirty()) {
          savedScoreRef.current = await scoringEditorRef.current.save();
        }

        // Save relations panel data if dirty
        if (relationsPanelRef.current?.isDirty()) {
          await relationsPanelRef.current.save();
        }

        setDirty(false);
        setScoringDirty(false);
        setRelationsDirty(false);
        await refetch();

        queryClient.invalidateQueries({ queryKey: ['portfolio-requests'] });
        return true;
      }
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || e?.message || 'Failed to save');
      return false;
    }
  };

  const handleReset = () => {
    if (data) {
      setForm({ ...data });
    } else {
      setForm({});
    }
    setDirty(false);
    setScoringDirty(false);
    setRelationsDirty(false);
    setSaveError(null);
    scoringEditorRef.current?.reset?.();
    relationsPanelRef.current?.reset();
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
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || e?.message || 'Failed to update status');
    } finally {
      setPendingStatus(null);
    }
  }, [id, pendingStatus, refetch, queryClient]);

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
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || e?.message || 'Failed to delete');
    }
  }, [id, queryClient, navigate]);

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
    if (dirty || scoringDirty || relationsDirty) {
      const proceed = window.confirm('You have unsaved changes. Save before submitting an analysis recommendation?');
      if (!proceed) return;
      const ok = await handleSave();
      if (!ok) return;
    }
    setRecommendationDialogOpen(true);
  }, [dirty, scoringDirty, relationsDirty, handleSave]);

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
      ? (DECISION_OUTCOME_LABELS[payload.decision_outcome] || payload.decision_outcome)
      : 'Submitted';
    setRecommendationToast(`Recommendation submitted: ${outcomeLabel}`);
    setHighlightLatestRecommendation(true);
  }, [handleAddComment]);

  // Handle inline image upload for rich text fields
  const handleImageUpload = React.useCallback(async (file: File, sourceField: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_field', sourceField);
    const res = await api.post<{ id: string }>(`/portfolio/requests/${id}/attachments/inline`, formData);
    const tenantSlug = getTenantSlugFromHostname(window.location.hostname);
    return buildInlineImageUrl(`/portfolio/requests/inline/${tenantSlug}/${res.data.id}`);
  }, [id]);

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return;
    if (dirty || scoringDirty || relationsDirty) {
      const proceed = window.confirm('You have unsaved changes. Save before switching tabs?');
      if (proceed) {
        void handleSave().then((ok) => {
          if (ok) navigate(`/portfolio/requests/${id}/${nextValue}?${searchParams.toString()}`);
        });
        return;
      } else {
        handleReset();
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
    if (dirty || scoringDirty || relationsDirty) {
      const proceed = window.confirm('You have unsaved changes. Save before navigating?');
      if (proceed) {
        const ok = await handleSave();
        if (!ok) return;
      } else {
        handleReset();
      }
    }
    const qs = listContextParams.toString();
    navigate(`/portfolio/requests/${targetId}/${routeTab}${qs ? `?${qs}` : ''}`);
  }, [dirty, scoringDirty, relationsDirty, handleSave, handleReset, listContextParams, navigate, routeTab]);

  const statusLabel = STATUS_OPTIONS.find((s) => s.value === form?.status)?.label || form?.status || '';
  const statusColor = STATUS_COLORS[form?.status] || 'default';
  const categoryName = classificationData?.categories?.find((c) => c.id === form?.category_id)?.name;
  const streamName = classificationData?.streams?.find((s) => s.id === form?.stream_id)?.name;
  const hasLegacyAnalysis = hasRichTextContent(form?.current_situation) || hasRichTextContent(form?.expected_benefits);
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
    ? 'Submit New Recommendation'
    : 'Submit Recommendation';
  const latestRecommendationOutcome = latestAnalysisRecommendation?.decision_outcome
    ? (DECISION_OUTCOME_LABELS[latestAnalysisRecommendation.decision_outcome] || latestAnalysisRecommendation.decision_outcome)
    : null;
  const latestRecommendationOutcomeColor = latestAnalysisRecommendation?.decision_outcome
    ? (DECISION_OUTCOME_COLORS[latestAnalysisRecommendation.decision_outcome] || 'default')
    : 'default';
  const latestRecommendationAuthor = [latestAnalysisRecommendation?.first_name, latestAnalysisRecommendation?.last_name]
    .filter(Boolean)
    .join(' ')
    || 'Unknown';
  const latestRecommendationCreatedAt = latestAnalysisRecommendation?.created_at
    ? new Date(latestAnalysisRecommendation.created_at).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '';
  const latestRecommendationStatusChange = latestAnalysisRecommendation?.changed_fields?.status;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
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
              title={form.priority_override ? 'Overridden priority score' : 'Priority score'}
            >
              {Math.round(form.priority_score)}
            </Box>
          )}
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center">
              {data?.item_number && (
                <Chip
                  label={`REQ-${data.item_number}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', mr: 1 }}
                  onClick={() => navigator.clipboard.writeText(`REQ-${data.item_number}`)}
                  title="Click to copy reference"
                />
              )}
              <Typography variant="h6">
                {isCreate ? 'New Request' : (form?.name || 'Request')}
              </Typography>
            </Stack>
            {!isCreate && (
              <Stack direction="row" spacing={1} alignItems="center">
                {form?.status && (
                  <Chip label={statusLabel} color={statusColor} size="small" />
                )}
                {form?.origin_task?.id && (
                  <Chip
                    label={
                      form.origin_task.item_number
                        ? `Origin: T-${form.origin_task.item_number}`
                        : 'Origin: Task'
                    }
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/portfolio/tasks/${form.origin_task.id}/overview`)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    title={`Created from task: ${form.origin_task.title || form.origin_task.id}`}
                  />
                )}
                {total > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {index + 1} of {total}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {!isCreate && (
            <Button
              startIcon={<ShareIcon />}
              onClick={() => setShareDialogOpen(true)}
              size="small"
            >
              Send link
            </Button>
          )}
          {!isCreate && canAdmin && form?.status !== 'converted' && (
            <Button
              startIcon={<DeleteIcon />}
              color="error"
              onClick={() => setDeleteConfirmOpen(true)}
              size="small"
            >
              Delete
            </Button>
          )}
          <IconButton
            aria-label="Previous"
            title="Previous"
            onClick={() => confirmAndNavigate(prevId)}
            disabled={!hasPrev}
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <IconButton
            aria-label="Next"
            title="Next"
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
            >
              Convert to Project
            </Button>
          )}
          <Button onClick={handleReset} disabled={!dirty}>Reset</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled}>Save</Button>
          <IconButton
            aria-label="Close"
            title="Close"
            onClick={() => {
              const qs = listContextParams.toString();
              navigate(`/portfolio/requests${qs ? `?${qs}` : ''}`);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">Failed to load request.</Alert>}
      {!!saveError && <Alert severity="error" sx={{ mb: 1 }}>{saveError}</Alert>}

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', minHeight: 480 }}>
        <Tabs
          orientation="vertical"
          value={routeTab}
          onChange={(_, value) => onTabChange(null as any, value as TabKey)}
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 160 }}
        >
          {tabs.map((t) => (
            <Tab
              key={t.key}
              label={t.label}
              value={t.key}
              disabled={isCreate && t.key !== 'overview'}
            />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, pl: 3 }}>
          {routeTab === 'overview' && (
            <Stack spacing={2}>
              <TextField
                label="Request Name"
                value={form?.name || ''}
                onChange={(e) => update({ name: e.target.value })}
                required
                fullWidth
              />
              {!isCreate && (
                <EnumAutocomplete
                  label="Status"
                  value={form?.status || 'pending_review'}
                  onChange={(v) => handleStatusChange(v)}
                  options={STATUS_OPTIONS}
                />
              )}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Purpose
                  </Typography>
                  <ExportButton
                    content={form?.purpose || ''}
                    title={form?.name || 'request-purpose'}
                    disabled={!String(form?.purpose || '').trim()}
                  />
                </Stack>
                <React.Suspense fallback={<Box sx={{ minHeight: 12 * 24, border: 1, borderColor: 'divider', borderRadius: 1 }} />}>
                  <MarkdownEditor
                    value={form?.purpose || ''}
                    onChange={(v) => update({ purpose: v })}
                    placeholder="Describe the purpose of this request..."
                    minRows={12}
                    maxRows={24}
                    onImageUpload={!isCreate ? (file) => handleImageUpload(file, 'purpose') : undefined}
                  />
                </React.Suspense>
              </Box>
              <EnumAutocomplete
                label="Source"
                value={form?.source_id || ''}
                onChange={(v) => {
                  classificationTouchedRef.current.source_id = true;
                  update({ source_id: v });
                }}
                options={sources.map((t) => ({ value: t.id, label: t.name }))}
              />
              <EnumAutocomplete
                label="Category"
                value={form?.category_id || ''}
                onChange={(v) => {
                  classificationTouchedRef.current.category_id = true;
                  classificationTouchedRef.current.stream_id = true;
                  update({ category_id: v, stream_id: null });
                }}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <EnumAutocomplete
                label="Stream"
                value={form?.stream_id || ''}
                onChange={(v) => {
                  classificationTouchedRef.current.stream_id = true;
                  update({ stream_id: v });
                }}
                options={streams
                  .filter((s) => s.category_id === form?.category_id)
                  .map((s) => ({ value: s.id, label: s.name }))}
                disabled={!form?.category_id}
              />
              <UserSelect
                label="Requestor"
                value={form?.requestor_id || null}
                onChange={(v) => update({ requestor_id: v })}
              />
              <CompanySelect
                label="Company"
                value={form?.company_id || null}
                onChange={(v) => {
                  classificationTouchedRef.current.company_id = true;
                  update({ company_id: v });
                }}
              />
              <DepartmentSelect
                label="Department"
                companyId={form?.company_id || undefined}
                value={form?.department_id || null}
                onChange={(v) => update({ department_id: v })}
              />
              <DateEUField
                label="Target Delivery Date"
                valueYmd={form?.target_delivery_date || ''}
                onChangeYmd={(v) => update({ target_delivery_date: v })}
              />
            </Stack>
          )}

          {routeTab === 'analysis' && !isCreate && (
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Impacted Business Processes</Typography>
              <BusinessProcessMultiSelect
                label="Business Processes"
                value={(form?.business_processes || []).map((bp: any) => bp.id)}
                onChange={async (ids) => {
                  await api.post(`/portfolio/requests/${form.id}/business-processes/bulk-replace`, {
                    business_process_ids: ids,
                  });
                  await refetch();
                }}
                disabled={!canManage}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>Feasibility Review</Typography>
              <FeasibilityReview
                value={form?.feasibility_review}
                onChange={(v) => update({ feasibility_review: v })}
                disabled={!canManage}
                categoryName={categoryName}
                streamName={streamName}
              />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Risks & Mitigations
                </Typography>
                <React.Suspense fallback={<Box sx={{ minHeight: 10 * 24, border: 1, borderColor: 'divider', borderRadius: 1 }} />}>
                  <MarkdownEditor
                    value={form?.risks || ''}
                    onChange={(v) => update({ risks: v })}
                    placeholder="List key residual risks, mitigation actions, and responsible owners..."
                    minRows={10}
                    maxRows={22}
                    disabled={!canManage}
                    onImageUpload={!isCreate ? (file) => handleImageUpload(file, 'risks') : undefined}
                  />
                </React.Suspense>
              </Box>

              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Analysis Recommendation
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Publish a formal decision to Activity with context "Analysis Recommendation".
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {latestAnalysisRecommendation && (
                        <Button
                          variant="outlined"
                          onClick={() => onTabChange(null as any, 'activity')}
                        >
                          View in Activity
                        </Button>
                      )}
                      <Button
                        variant="contained"
                        color="warning"
                        disabled={!canManage || form?.status === 'converted'}
                        onClick={() => void handleOpenRecommendationDialog()}
                      >
                        {recommendationButtonLabel}
                      </Button>
                    </Stack>
                  </Stack>

                  {latestAnalysisRecommendation ? (
                    <Box
                      sx={{
                        p: 1.5,
                        border: 1,
                        borderColor: highlightLatestRecommendation ? 'success.main' : 'divider',
                        borderRadius: 1,
                        bgcolor: highlightLatestRecommendation ? 'success.light' : 'action.hover',
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Latest recommendation
                        </Typography>
                        {latestRecommendationOutcome && (
                          <Chip
                            size="small"
                            color={latestRecommendationOutcomeColor}
                            label={latestRecommendationOutcome}
                          />
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {latestRecommendationAuthor} • {latestRecommendationCreatedAt}
                        </Typography>
                      </Stack>
                      {Array.isArray(latestRecommendationStatusChange) && latestRecommendationStatusChange.length === 2 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Status changed: {String(latestRecommendationStatusChange[0] || '')} → {String(latestRecommendationStatusChange[1] || '')}
                        </Typography>
                      )}
                      {hasRichTextContent(latestAnalysisRecommendation.content) && (
                        <Box sx={{ mt: 1, maxHeight: 140, overflow: 'hidden' }}>
                          <MarkdownContent content={latestAnalysisRecommendation.content} variant="compact" />
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      No recommendation submitted yet.
                    </Alert>
                  )}
                </Stack>
              </Box>

              {hasLegacyAnalysis && (
                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Previous Analysis (Legacy)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {hasRichTextContent(form?.current_situation) && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Current Situation
                          </Typography>
                          <MarkdownContent content={form?.current_situation} />
                        </Box>
                      )}
                      {hasRichTextContent(form?.expected_benefits) && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Expected Benefits
                          </Typography>
                          <MarkdownContent content={form?.expected_benefits} />
                        </Box>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}
            </Stack>
          )}

          {routeTab === 'scoring' && !isCreate && (
            <Stack spacing={3}>
              {form?.status === 'converted' && (
                <Alert severity="info">
                  Scoring is frozen. This request has been converted to a project.
                </Alert>
              )}
              <RequestScoringEditor
                ref={scoringEditorRef}
                requestId={form?.id}
                criteriaValues={form?.criteria_values || {}}
                priorityScore={form?.priority_score}
                priorityOverride={form?.priority_override || false}
                overrideValue={form?.override_value}
                overrideJustification={form?.override_justification}
                mandatoryBypassEnabled={portfolioSettings?.mandatory_bypass_enabled ?? false}
                readOnly={!canManage || form?.status === 'converted'}
                onScoreChange={(newScore) => {
                  setForm((prev: any) => ({ ...prev, priority_score: newScore }));
                }}
                onDirtyChange={setScoringDirty}
              />
            </Stack>
          )}

          {routeTab === 'team' && !isCreate && (
            <Stack spacing={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Sponsors & Leads</Typography>
              <Stack spacing={2}>
                <UserSelect
                  label="Business Sponsor"
                  value={form?.business_sponsor_id || null}
                  onChange={async (v) => {
                    await api.patch(`/portfolio/requests/${form.id}`, { business_sponsor_id: v });
                    await refetch();
                  }}
                  disabled={!canManage}
                />
                <UserSelect
                  label="Business Lead"
                  value={form?.business_lead_id || null}
                  onChange={async (v) => {
                    await api.patch(`/portfolio/requests/${form.id}`, { business_lead_id: v });
                    await refetch();
                  }}
                  disabled={!canManage}
                />
                <UserSelect
                  label="IT Sponsor"
                  value={form?.it_sponsor_id || null}
                  onChange={async (v) => {
                    await api.patch(`/portfolio/requests/${form.id}`, { it_sponsor_id: v });
                    await refetch();
                  }}
                  disabled={!canManage}
                />
                <UserSelect
                  label="IT Lead"
                  value={form?.it_lead_id || null}
                  onChange={async (v) => {
                    await api.patch(`/portfolio/requests/${form.id}`, { it_lead_id: v });
                    await refetch();
                  }}
                  disabled={!canManage}
                />
              </Stack>

              <Divider />

              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Contributors</Typography>

              <TeamMemberMultiSelect
                label="Business Contributors"
                value={form?.business_team || []}
                onChange={async (userIds) => {
                  await api.post(`/portfolio/requests/${form.id}/business-team/bulk-replace`, {
                    user_ids: userIds,
                  });
                  await refetch();
                }}
                disabled={!canManage}
              />

              <TeamMemberMultiSelect
                label="IT Contributors"
                value={form?.it_team || []}
                onChange={async (userIds) => {
                  await api.post(`/portfolio/requests/${form.id}/it-team/bulk-replace`, {
                    user_ids: userIds,
                  });
                  await refetch();
                }}
                disabled={!canManage}
              />
            </Stack>
          )}

          {routeTab === 'relations' && !isCreate && form?.id && (
            <Stack spacing={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Dependencies</Typography>
              <DependencySelector
                entityType="request"
                entityId={form?.id}
                dependencies={form?.dependencies || []}
                onAdd={async (targetType, targetId) => {
                  await api.post(`/portfolio/requests/${form.id}/dependencies`, {
                    target_type: targetType,
                    target_id: targetId,
                  });
                  await refetch();
                }}
                onRemove={async (targetType, targetId) => {
                  await api.delete(`/portfolio/requests/${form.id}/dependencies/${targetType}/${targetId}`);
                  await refetch();
                }}
                disabled={!canManage}
              />

              <Divider />

              <RequestRelationsPanel
                ref={relationsPanelRef}
                id={form?.id}
                onDirtyChange={setRelationsDirty}
              />

              <Divider />

              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Resulting Projects</Typography>
              {form?.resulting_projects && form.resulting_projects.length > 0 ? (
                <Stack spacing={1}>
                  {form.resulting_projects.map((p: any) => (
                    <Box
                      key={p.id}
                      component="span"
                      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                      onClick={() => navigate(`/portfolio/projects/${p.id}/overview`)}
                    >
                      <Typography variant="body2">
                        {p.name} ({p.status})
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No resulting projects yet.</Typography>
              )}
            </Stack>
          )}

          {routeTab === 'activity' && !isCreate && (
            <PortfolioActivity
              entityType="request"
              entityId={form?.id || ''}
              activities={form?.activities || []}
              currentStatus={form?.status || ''}
              allowedTransitions={ALLOWED_TRANSITIONS[form?.status] || []}
              statusOptions={STATUS_OPTIONS}
              onAddComment={handleAddComment}
              onUpdateComment={handleUpdateComment}
              currentUserId={profile?.id}
              readOnly={!canManage}
              onImageUpload={handleImageUpload}
            />
          )}
        </Box>
      </Box>

      {!isCreate && form && (
        <ConvertToProjectDialog
          open={convertDialogOpen}
          onClose={() => setConvertDialogOpen(false)}
          request={{
            id: form.id,
            name: form.name || '',
            purpose: form.purpose,
            target_delivery_date: form.target_delivery_date,
          }}
          onSuccess={(projectId) => {
            setConvertDialogOpen(false);
            navigate(`/portfolio/projects/${projectId}/overview`);
          }}
        />
      )}

      <RecommendationDialog
        open={recommendationDialogOpen}
        currentStatus={form?.status || ''}
        allowedTransitions={ALLOWED_TRANSITIONS[form?.status] || []}
        statusOptions={STATUS_OPTIONS}
        priorityScore={form?.priority_score}
        onClose={() => setRecommendationDialogOpen(false)}
        onSubmit={handleSubmitRecommendation}
        onImageUpload={handleImageUpload}
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
        itemName={form?.name || 'Request'}
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
        <DialogTitle>Delete Request</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete "{form?.name}"? This will remove all
            attachments, comments, and activity history. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
