import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Divider, Grid,
  IconButton, LinearProgress, MenuItem, Select, Slider, Stack,
  Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../api';
import { useProjectNav } from '../../hooks/useProjectNav';
import { useAuth } from '../../auth/AuthContext';
import UserSelect from '../../components/fields/UserSelect';
import CompanySelect from '../../components/fields/CompanySelect';
import DepartmentSelect from '../../components/fields/DepartmentSelect';
import DateEUField from '../../components/fields/DateEUField';
import EnumAutocomplete from '../../components/fields/EnumAutocomplete';
import { RichTextEditor } from '../../components/RichTextEditor';
import StatusChangeDialog from './components/StatusChangeDialog';
import PortfolioActivity from './components/PortfolioActivity';
import DependencySelector from './components/DependencySelector';
import TeamMemberMultiSelect from '../../components/fields/TeamMemberMultiSelect';
import ProjectRelationsPanel, { ProjectRelationsPanelHandle } from './editors/ProjectRelationsPanel';
import ProjectScoringEditor, { ProjectScoringEditorHandle } from './editors/ProjectScoringEditor';
import LogTimeDialog, { TimeEntryData } from './components/LogTimeDialog';
import ProjectTasksPanel from './editors/ProjectTasksPanel';
import { ProjectTimeline } from './components/ProjectTimeline';
import EffortAllocationTable, { EffortAllocationData, AllocationUser } from './components/EffortAllocationTable';
import EffortAllocationDialog, { EligibleUser } from './components/EffortAllocationDialog';
import EffortConsumptionBar from './components/EffortConsumptionBar';
import { useRecentlyViewed } from '../workspace/hooks/useRecentlyViewed';
import { buildInlineImageUrl, getTenantSlugFromHostname } from '../../utils/inlineImageUrls';
import { formatItemRef } from '../../utils/item-ref';
import ShareDialog from '../../components/ShareDialog';

type TabKey = 'overview' | 'scoring' | 'timeline' | 'effort' | 'tasks' | 'team' | 'relations' | 'activity';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'team', label: 'Team' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'effort', label: 'Progress' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'relations', label: 'Relations' },
];

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  waiting_list: ['planned', 'on_hold', 'cancelled'],
  planned: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['in_testing', 'done', 'on_hold', 'cancelled'],
  in_testing: ['in_progress', 'done', 'on_hold', 'cancelled'],
  on_hold: ['waiting_list', 'planned', 'in_progress', 'cancelled'],
  done: [],
  cancelled: [],
};

const STATUS_OPTIONS = [
  { value: 'waiting_list', label: 'Waiting List' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_testing', label: 'In Testing' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ORIGIN_OPTIONS = [
  { value: 'fast_track', label: 'Fast-track' },
  { value: 'legacy', label: 'Legacy' },
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
  waiting_list: 'default',
  planned: 'info',
  in_progress: 'primary',
  in_testing: 'info',
  on_hold: 'warning',
  done: 'success',
  cancelled: 'error',
};

const ORIGIN_LABELS: Record<string, string> = {
  standard: 'Origin: Request',
  fast_track: 'Origin: Fast-track',
  legacy: 'Origin: Legacy',
};

// Sortable phase row for drag-and-drop reordering
interface SortablePhaseRowProps {
  phase: any;
  index: number;
  canManage: boolean;
  form: any;
  setForm: (form: any) => void;
  projectId: string;
  milestones: any[];
  onRefetch: () => void;
  onError: (msg: string) => void;
  onNavigate: (path: string) => void;
}

function SortablePhaseRow({
  phase,
  index,
  canManage,
  form,
  setForm,
  projectId,
  milestones,
  onRefetch,
  onError,
  onNavigate,
}: SortablePhaseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id, disabled: !canManage });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'rgba(25, 118, 210, 0.08)' : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell sx={{ width: 56, cursor: canManage ? 'grab' : 'default', px: 1 }} {...attributes} {...listeners}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {canManage && <DragIndicatorIcon fontSize="small" sx={{ color: 'action.active' }} />}
          <span>{index + 1}</span>
        </Box>
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          value={phase.name}
          fullWidth
          disabled={!canManage}
          onChange={(e) => {
            const newPhases = form.phases.map((p: any) =>
              p.id === phase.id ? { ...p, name: e.target.value } : p
            );
            setForm({ ...form, phases: newPhases });
          }}
          onBlur={async () => {
            try {
              await api.patch(`/portfolio/projects/${projectId}/phases/${phase.id}`, { name: phase.name });
            } catch {}
          }}
        />
      </TableCell>
      <TableCell>
        <DateEUField
          valueYmd={phase.planned_start || ''}
          label=""
          disabled={!canManage}
          onChangeYmd={async (v) => {
            const newPhases = form.phases.map((p: any) =>
              p.id === phase.id ? { ...p, planned_start: v } : p
            );
            setForm({ ...form, phases: newPhases });
            try {
              await api.patch(`/portfolio/projects/${projectId}/phases/${phase.id}`, { planned_start: v || null });
            } catch {}
          }}
        />
      </TableCell>
      <TableCell>
        <DateEUField
          valueYmd={phase.planned_end || ''}
          label=""
          disabled={!canManage}
          onChangeYmd={async (v) => {
            const newPhases = form.phases.map((p: any) =>
              p.id === phase.id ? { ...p, planned_end: v } : p
            );
            setForm({ ...form, phases: newPhases });
            try {
              await api.patch(`/portfolio/projects/${projectId}/phases/${phase.id}`, { planned_end: v || null });
              await onRefetch();
            } catch {}
          }}
        />
      </TableCell>
      <TableCell>
        <Select
          size="small"
          value={phase.status || 'pending'}
          fullWidth
          disabled={!canManage}
          onChange={async (e) => {
            const newPhases = form.phases.map((p: any) =>
              p.id === phase.id ? { ...p, status: e.target.value } : p
            );
            setForm({ ...form, phases: newPhases });
            try {
              await api.patch(`/portfolio/projects/${projectId}/phases/${phase.id}`, { status: e.target.value });
            } catch {}
          }}
        >
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="in_progress">In Progress</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
        </Select>
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        <Checkbox
          size="small"
          checked={!!milestones.find((m: any) => m.phase_id === phase.id)}
          disabled={!canManage}
          onChange={async (e) => {
            try {
              await api.post(`/portfolio/projects/${projectId}/phases/${phase.id}/toggle-milestone`, {
                enabled: e.target.checked,
                milestone_name: `${phase.name} Complete`,
              });
              await onRefetch();
            } catch (err: any) {
              onError(err?.response?.data?.message || 'Failed to toggle milestone');
            }
          }}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0}>
          <IconButton
            size="small"
            disabled={!canManage}
            title="Add task to phase"
            onClick={() => {
              onNavigate(`/portfolio/tasks/new/overview?projectId=${projectId}&phaseId=${phase.id}`);
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            disabled={!canManage}
            title="Delete phase"
            onClick={async () => {
              try {
                await api.delete(`/portfolio/projects/${projectId}/phases/${phase.id}`);
                await onRefetch();
              } catch {}
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default function ProjectWorkspacePage() {
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

  // Fetch project data
  const { data, error, refetch } = useQuery({
    queryKey: ['portfolio-project', id],
    queryFn: async () => {
      const include = 'team,sponsors,contacts,source_requests,urls,attachments,activities,company,department,dependencies,phases,milestones,time_entries,opex,capex';
      const res = await api.get(`/portfolio/projects/${id}`, { params: { include } });
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
      document.title = `PRJ-${data.item_number} — ${data.name} | KANAP`;
    }
    return () => { document.title = 'KANAP'; };
  }, [data?.item_number, data?.name]);

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
  const [relationsDirty, setRelationsDirty] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
  const relationsPanelRef = React.useRef<ProjectRelationsPanelHandle>(null);
  const scoringEditorRef = React.useRef<ProjectScoringEditorHandle>(null);
  const [scoringDirty, setScoringDirty] = React.useState(false);

  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);

  // Phase templates for timeline
  const [phaseTemplates, setPhaseTemplates] = React.useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [replaceConfirmOpen, setReplaceConfirmOpen] = React.useState(false);

  // Time logging dialog state
  const [logTimeDialogOpen, setLogTimeDialogOpen] = React.useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = React.useState<TimeEntryData | undefined>(undefined);

  // Effort allocation dialog state
  const [itAllocationDialogOpen, setItAllocationDialogOpen] = React.useState(false);
  const [businessAllocationDialogOpen, setBusinessAllocationDialogOpen] = React.useState(false);

  // Fetch phase templates
  React.useEffect(() => {
    if (!isCreate && routeTab === 'timeline') {
      api.get('/portfolio/phase-templates').then((res) => {
        setPhaseTemplates(Array.isArray(res.data) ? res.data : []);
      }).catch(() => {});
    }
  }, [isCreate, routeTab]);

  // Sync form with loaded data
  React.useEffect(() => {
    if (data && !isCreate) {
      setForm({ ...data });
    }
  }, [data, isCreate]);

  const update = React.useCallback((patch: any) => {
    setDirty(true);
    setForm((prev: any) => ({ ...prev, ...patch }));
  }, []);

  const handleSave = async () => {
    setSaveError(null);
    try {
      if (isCreate) {
        const res = await api.post('/portfolio/projects', form);
        const newId = res.data?.id;
        if (newId) {
          setDirty(false);
          navigate(`/portfolio/projects/${newId}/overview?${searchParams.toString()}`);
        }
      } else {
        await api.patch(`/portfolio/projects/${id}`, form);

        // Save scoring editor data if dirty
        if (scoringEditorRef.current?.isDirty()) {
          await scoringEditorRef.current.save();
        }

        // Save relations panel data if dirty
        if (relationsPanelRef.current?.isDirty()) {
          await relationsPanelRef.current.save();
        }

        setDirty(false);
        setScoringDirty(false);
        setRelationsDirty(false);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
      }
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || e?.message || 'Failed to save');
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
    const tenantSlug = getTenantSlugFromHostname(window.location.hostname);
    return buildInlineImageUrl(`/portfolio/projects/inline/${tenantSlug}/${res.data.id}`);
  }, [id]);

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return;
    if (dirty) {
      const proceed = window.confirm('You have unsaved changes. Save before switching tabs?');
      if (proceed) {
        void handleSave().then(() => navigate(`/portfolio/projects/${id}/${nextValue}?${searchParams.toString()}`));
        return;
      } else {
        handleReset();
      }
    }
    navigate(`/portfolio/projects/${id}/${nextValue}?${searchParams.toString()}`);
  };

  const canManage = hasLevel('portfolio_projects', 'manager');
  const saveDisabled = (!dirty && !scoringDirty && !relationsDirty) || !canManage;

  // Drag-and-drop sensors for phase reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle phase drag end - reorder phases
  const handlePhaseDragEnd = React.useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sortedPhases = [...(form?.phases || [])].sort((a: any, b: any) => a.sequence - b.sequence);
    const oldIndex = sortedPhases.findIndex((p: any) => p.id === active.id);
    const newIndex = sortedPhases.findIndex((p: any) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically update local state
    const reordered = arrayMove(sortedPhases, oldIndex, newIndex).map((p: any, i: number) => ({
      ...p,
      sequence: i,
    }));
    setForm({ ...form, phases: reordered });

    // Persist to backend
    try {
      const phaseIds = reordered.map((p: any) => p.id);
      await api.post(`/portfolio/projects/${id}/phases/reorder`, { phase_ids: phaseIds });
    } catch (e: any) {
      // Revert on error
      await refetch();
      setSaveError(e?.response?.data?.message || 'Failed to reorder phases');
    }
  }, [form, id, refetch]);

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
    if (dirty || scoringDirty || relationsDirty) {
      const proceed = window.confirm('You have unsaved changes. Save before navigating?');
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        handleReset();
      }
    }
    const qs = listContextParams.toString();
    navigate(`/portfolio/projects/${targetId}/${routeTab}${qs ? `?${qs}` : ''}`);
  }, [dirty, scoringDirty, relationsDirty, handleSave, handleReset, listContextParams, navigate, routeTab]);

  const statusLabel = STATUS_OPTIONS.find((s) => s.value === form?.status)?.label || form?.status || '';
  const statusColor = STATUS_COLORS[form?.status] || 'default';
  const originLabel = ORIGIN_LABELS[form?.origin] || form?.origin || '';

  // Calculate variance for baseline display
  const getDateVariance = (planned: string | null, baseline: string | null): string | null => {
    if (!planned || !baseline) return null;
    const p = new Date(planned).getTime();
    const b = new Date(baseline).getTime();
    const diff = Math.round((p - b) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'On Track';
    if (diff > 0) return `+${diff} days`;
    return `${diff} days`;
  };

  const getEffortVariance = (estimated: number | null, baseline: number | null): string | null => {
    if (estimated == null || baseline == null) return null;
    const diff = estimated - baseline;
    if (diff === 0) return 'On Track';
    if (diff > 0) return `+${diff} MD`;
    return `${diff} MD`;
  };

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
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 700,
                fontSize: '1.25rem',
                boxShadow: 2,
              }}
              title="Priority score"
            >
              {Math.round(form.priority_score)}
            </Box>
          )}
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center">
              {!isCreate && data?.item_number && (
                <Chip
                  label={`PRJ-${data.item_number}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', mr: 1 }}
                  onClick={() => navigator.clipboard.writeText(`PRJ-${data.item_number}`)}
                  title="Click to copy reference"
                />
              )}
              <Typography variant="h6">
                {isCreate ? 'New Project' : (form?.name || 'Project')}
              </Typography>
            </Stack>
            {!isCreate && (
              <Stack direction="row" spacing={1} alignItems="center">
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
                        ? () => navigate(`/portfolio/requests/${form.source_requests[0].id}/overview`)
                        : undefined
                    }
                    sx={
                      form.origin === 'standard' && form.source_requests?.[0]
                        ? { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }
                        : undefined
                    }
                    title={
                      form.origin === 'standard' && form.source_requests?.[0]
                        ? `View source request: ${form.source_requests[0].name}`
                        : undefined
                    }
                  />
                )}
                {form?.execution_progress != null && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.round(Number(form.execution_progress))}
                      sx={{ width: 100, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">{Math.round(Number(form.execution_progress))}%</Typography>
                  </Stack>
                )}
                {total > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
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
          <Button onClick={handleReset} disabled={!dirty}>Reset</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled}>Save</Button>
          <IconButton
            aria-label="Close"
            title="Close"
            onClick={() => {
              const qs = listContextParams.toString();
              navigate(`/portfolio/projects${qs ? `?${qs}` : ''}`);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">Failed to load project.</Alert>}
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
                label="Project Name"
                value={form?.name || ''}
                onChange={(e) => update({ name: e.target.value })}
                required
                fullWidth
              />
              {!isCreate && (
                <EnumAutocomplete
                  label="Status"
                  value={form?.status || 'waiting_list'}
                  onChange={(v) => handleStatusChange(v)}
                  options={STATUS_OPTIONS}
                />
              )}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Purpose
                </Typography>
                <RichTextEditor
                  value={form?.purpose || ''}
                  onChange={(v) => update({ purpose: v })}
                  placeholder="Describe the purpose of this project..."
                  minRows={12}
                  maxRows={24}
                  onImageUpload={!isCreate ? (file) => handleImageUpload(file, 'purpose') : undefined}
                />
              </Box>
              {isCreate && (
                <EnumAutocomplete
                  label="Origin"
                  value={form?.origin || 'fast_track'}
                  onChange={(v) => update({ origin: v })}
                  options={ORIGIN_OPTIONS}
                />
              )}
              {!isCreate && form?.origin && (
                <TextField
                  label="Origin"
                  value={ORIGIN_LABELS[form.origin] || form.origin}
                  disabled
                  fullWidth
                />
              )}
              <EnumAutocomplete
                label="Source"
                value={form?.source_id || ''}
                onChange={(v) => update({ source_id: v })}
                options={sources.map((t) => ({ value: t.id, label: t.name }))}
              />
              <EnumAutocomplete
                label="Category"
                value={form?.category_id || ''}
                onChange={(v) => update({ category_id: v, stream_id: null })}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <EnumAutocomplete
                label="Stream"
                value={form?.stream_id || ''}
                onChange={(v) => update({ stream_id: v })}
                options={streams
                  .filter((s) => s.category_id === form?.category_id)
                  .map((s) => ({ value: s.id, label: s.name }))}
                disabled={!form?.category_id}
              />
              <CompanySelect
                label="Company"
                value={form?.company_id || null}
                onChange={(v) => update({ company_id: v })}
              />
              <DepartmentSelect
                label="Department"
                companyId={form?.company_id || undefined}
                value={form?.department_id || null}
                onChange={(v) => update({ department_id: v })}
              />
            </Stack>
          )}

          {routeTab === 'scoring' && !isCreate && (
            <Stack spacing={3}>
              <ProjectScoringEditor
                ref={scoringEditorRef}
                projectId={form?.id}
                criteriaValues={form?.criteria_values || {}}
                priorityScore={form?.priority_score}
                priorityOverride={form?.priority_override || false}
                overrideValue={form?.override_value}
                overrideJustification={form?.override_justification}
                sourceRequestId={form?.origin === 'standard' ? form?.source_requests?.[0]?.id : null}
                sourceRequestName={form?.origin === 'standard' ? form?.source_requests?.[0]?.name : null}
                mandatoryBypassEnabled={portfolioSettings?.mandatory_bypass_enabled ?? false}
                readOnly={!canManage}
                onScoreChange={(newScore) => setForm((prev: any) => ({ ...prev, priority_score: newScore }))}
                onDirtyChange={setScoringDirty}
              />
            </Stack>
          )}

          {routeTab === 'timeline' && !isCreate && (
            <Stack spacing={3}>
              {/* Project Dates */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Project Dates</Typography>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <DateEUField
                      label="Planned Start"
                      valueYmd={form?.planned_start || ''}
                      onChangeYmd={(v) => update({ planned_start: v })}
                    />
                    <DateEUField
                      label="Planned End"
                      valueYmd={form?.planned_end || ''}
                      onChangeYmd={(v) => update({ planned_end: v })}
                    />
                  </Stack>
                  {(form?.actual_start || form?.actual_end) && (
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Actual Start"
                        value={form?.actual_start ? new Date(form.actual_start).toLocaleDateString() : '-'}
                        disabled
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Actual End"
                        value={form?.actual_end ? new Date(form.actual_end).toLocaleDateString() : '-'}
                        disabled
                        sx={{ flex: 1 }}
                      />
                    </Stack>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Apply Template or Replace Template */}
              {(form?.phases?.length || 0) === 0 ? (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Apply Phase Template</Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      displayEmpty
                      size="small"
                      sx={{ minWidth: 250 }}
                    >
                      <MenuItem value="" disabled>Select a template...</MenuItem>
                      {phaseTemplates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                      ))}
                    </Select>
                    <Button
                      variant="contained"
                      disabled={!selectedTemplateId || !canManage}
                      onClick={async () => {
                        if (!selectedTemplateId) return;
                        try {
                          await api.post(`/portfolio/projects/${id}/apply-template`, { template_id: selectedTemplateId });
                          await refetch();
                          setSelectedTemplateId('');
                        } catch (e: any) {
                          setSaveError(e?.response?.data?.message || 'Failed to apply template');
                        }
                      }}
                    >
                      Apply Template
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Phases</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        disabled={!canManage}
                        onClick={async () => {
                          try {
                            await api.post(`/portfolio/projects/${id}/phases`, { name: 'New Phase' });
                            await refetch();
                          } catch (e: any) {
                            setSaveError(e?.response?.data?.message || 'Failed to add phase');
                          }
                        }}
                      >
                        Add Phase
                      </Button>
                      <Button
                        size="small"
                        color="warning"
                        disabled={!canManage}
                        onClick={() => setReplaceConfirmOpen(true)}
                      >
                        Replace with Template
                      </Button>
                    </Stack>
                  </Stack>
                  <ProjectTimeline
                    projectId={id!}
                    phases={(form?.phases || []).map((p: any) => ({
                      id: p.id,
                      name: p.name,
                      planned_start: p.planned_start,
                      planned_end: p.planned_end,
                      status: p.status || 'pending',
                      sequence: p.sequence,
                    }))}
                    onUpdate={refetch}
                    canManage={canManage}
                    tableView={
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handlePhaseDragEnd}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ width: 56 }}>#</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell sx={{ width: 140 }}>Start</TableCell>
                              <TableCell sx={{ width: 140 }}>End</TableCell>
                              <TableCell sx={{ width: 130 }}>Status</TableCell>
                              <TableCell sx={{ width: 80, textAlign: 'center' }}>Milestone</TableCell>
                              <TableCell sx={{ width: 50 }}></TableCell>
                            </TableRow>
                          </TableHead>
                          <SortableContext
                            items={(form?.phases || []).sort((a: any, b: any) => a.sequence - b.sequence).map((p: any) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <TableBody>
                              {(form?.phases || []).sort((a: any, b: any) => a.sequence - b.sequence).map((phase: any, idx: number) => (
                                <SortablePhaseRow
                                  key={phase.id}
                                  phase={phase}
                                  index={idx}
                                  canManage={canManage}
                                  form={form}
                                  setForm={setForm}
                                  projectId={id!}
                                  milestones={form?.milestones || []}
                                  onRefetch={refetch}
                                  onError={setSaveError}
                                  onNavigate={navigate}
                                />
                              ))}
                            </TableBody>
                          </SortableContext>
                        </Table>
                      </DndContext>
                    }
                  />
                </Box>
              )}

              {/* Milestones Section */}
              <Divider />
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Milestones</Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={!canManage}
                    onClick={async () => {
                      try {
                        await api.post(`/portfolio/projects/${id}/milestones`, { name: 'New Milestone' });
                        await refetch();
                      } catch (e: any) {
                        setSaveError(e?.response?.data?.message || 'Failed to add milestone');
                      }
                    }}
                  >
                    Add Milestone
                  </Button>
                </Stack>
                {(form?.milestones?.length || 0) === 0 ? (
                  <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No milestones defined. Add milestones manually or enable phase milestones above.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell sx={{ width: 180 }}>Phase</TableCell>
                        <TableCell sx={{ width: 140 }}>Target Date</TableCell>
                        <TableCell sx={{ width: 130 }}>Status</TableCell>
                        <TableCell sx={{ width: 50 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(form?.milestones || []).map((ms: any) => {
                        const linkedPhase = (form?.phases || []).find((p: any) => p.id === ms.phase_id);
                        return (
                          <TableRow key={ms.id}>
                            <TableCell>
                              <TextField
                                size="small"
                                value={ms.name}
                                fullWidth
                                disabled={!canManage}
                                onChange={(e) => {
                                  const newMilestones = form.milestones.map((m: any) =>
                                    m.id === ms.id ? { ...m, name: e.target.value } : m
                                  );
                                  setForm({ ...form, milestones: newMilestones });
                                }}
                                onBlur={async () => {
                                  try {
                                    await api.patch(`/portfolio/projects/${id}/milestones/${ms.id}`, { name: ms.name });
                                  } catch {}
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color={linkedPhase ? 'text.primary' : 'text.secondary'}>
                                {linkedPhase ? linkedPhase.name : '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <DateEUField
                                valueYmd={ms.target_date || ''}
                                label=""
                                disabled={!canManage || !!linkedPhase}
                                onChangeYmd={async (v) => {
                                  const newMilestones = form.milestones.map((m: any) =>
                                    m.id === ms.id ? { ...m, target_date: v } : m
                                  );
                                  setForm({ ...form, milestones: newMilestones });
                                  try {
                                    await api.patch(`/portfolio/projects/${id}/milestones/${ms.id}`, { target_date: v || null });
                                  } catch {}
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={ms.status || 'pending'}
                                fullWidth
                                disabled={!canManage}
                                onChange={async (e) => {
                                  const newMilestones = form.milestones.map((m: any) =>
                                    m.id === ms.id ? { ...m, status: e.target.value } : m
                                  );
                                  setForm({ ...form, milestones: newMilestones });
                                  try {
                                    await api.patch(`/portfolio/projects/${id}/milestones/${ms.id}`, { status: e.target.value });
                                  } catch {}
                                }}
                              >
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="achieved">Achieved</MenuItem>
                                <MenuItem value="missed">Missed</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                disabled={!canManage || !!linkedPhase}
                                title={linkedPhase ? 'Uncheck phase milestone to delete' : undefined}
                                onClick={async () => {
                                  try {
                                    await api.delete(`/portfolio/projects/${id}/milestones/${ms.id}`);
                                    await refetch();
                                  } catch {}
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Box>

              {(form?.baseline_start_date || form?.baseline_end_date) && (
                <>
                  <Divider />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Baseline (captured at In Progress)</Typography>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary">Baseline Start</Typography>
                      <Typography>{form?.baseline_start_date ? new Date(form.baseline_start_date).toLocaleDateString() : '-'}</Typography>
                      {getDateVariance(form?.planned_start, form?.baseline_start_date) && (
                        <Typography variant="caption" color={getDateVariance(form?.planned_start, form?.baseline_start_date)?.startsWith('+') ? 'error.main' : 'success.main'}>
                          {getDateVariance(form?.planned_start, form?.baseline_start_date)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary">Baseline End</Typography>
                      <Typography>{form?.baseline_end_date ? new Date(form.baseline_end_date).toLocaleDateString() : '-'}</Typography>
                      {getDateVariance(form?.planned_end, form?.baseline_end_date) && (
                        <Typography variant="caption" color={getDateVariance(form?.planned_end, form?.baseline_end_date)?.startsWith('+') ? 'error.main' : 'success.main'}>
                          {getDateVariance(form?.planned_end, form?.baseline_end_date)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </>
              )}

              {/* Replace Template Confirmation Dialog */}
              <Dialog open={replaceConfirmOpen} onClose={() => setReplaceConfirmOpen(false)}>
                <DialogTitle>Replace All Phases?</DialogTitle>
                <DialogContent>
                  <DialogContentText sx={{ mb: 2 }}>
                    This will delete all existing phases and milestones, then apply the selected template.
                  </DialogContentText>
                  <Select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    displayEmpty
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="" disabled>Select a template...</MenuItem>
                    {phaseTemplates.map((t) => (
                      <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                    ))}
                  </Select>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setReplaceConfirmOpen(false)}>Cancel</Button>
                  <Button
                    color="warning"
                    variant="contained"
                    disabled={!selectedTemplateId}
                    onClick={async () => {
                      if (!selectedTemplateId) return;
                      try {
                        await api.post(`/portfolio/projects/${id}/apply-template`, {
                          template_id: selectedTemplateId,
                          replace: true,
                        });
                        await refetch();
                        setSelectedTemplateId('');
                        setReplaceConfirmOpen(false);
                      } catch (e: any) {
                        setSaveError(e?.response?.data?.message || 'Failed to apply template');
                      }
                    }}
                  >
                    Replace All
                  </Button>
                </DialogActions>
              </Dialog>
            </Stack>
          )}

          {routeTab === 'effort' && !isCreate && (
            <Stack spacing={3}>
              {/* Progress & Effort Consumption Section */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Progress & Effort Consumption</Typography>
              {(() => {
                const progress = Number(form?.execution_progress) || 0;
                const estIt = Number(form?.estimated_effort_it) || 0;
                const estBiz = Number(form?.estimated_effort_business) || 0;
                const actIt = Number(form?.actual_effort_it) || 0;
                const actBiz = Number(form?.actual_effort_business) || 0;
                const totalEst = estIt + estBiz;
                const totalAct = actIt + actBiz;

                return (
                  <Grid container spacing={3}>
                    {/* LEFT COLUMN: Execution Progress */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ width: '80%' }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Execution Progress: {progress}%
                          </Typography>
                          <Slider
                            value={progress}
                            onChange={(_, v) => update({ execution_progress: v })}
                            min={0}
                            max={100}
                            step={5}
                            marks={[{ value: 0, label: '0%' }, { value: 50, label: '50%' }, { value: 100, label: '100%' }]}
                            disabled={!canManage}
                            sx={{
                              '& .MuiSlider-rail': { height: 4 },
                              '& .MuiSlider-track': { height: 4 },
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>

                    {/* RIGHT COLUMN: Effort Consumption */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ width: '80%' }}>
                          {/* Label */}
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Workload consumption: {Math.round(totalAct)} / {Math.round(totalEst)} MD
                          </Typography>

                          {/* Stacked Progress Bar with scale and legend */}
                          <EffortConsumptionBar
                            itConsumed={actIt}
                            bizConsumed={actBiz}
                            totalPlanned={totalEst}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                );
              })()}

              <Divider />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Estimated Effort</Typography>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="IT Effort (MD)"
                    type="number"
                    value={form?.estimated_effort_it != null ? Math.round(Number(form.estimated_effort_it)) : ''}
                    onChange={(e) => update({ estimated_effort_it: e.target.value === '' ? null : Number(e.target.value) })}
                    inputProps={{ step: 1, min: 0 }}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <EffortAllocationTable
                    data={itAllocationData ?? null}
                    effortType="it"
                    estimatedEffort={Number(form?.estimated_effort_it) || 0}
                    canManage={canManage}
                    onEdit={() => setItAllocationDialogOpen(true)}
                    onReset={async () => {
                      try {
                        await api.delete(`/portfolio/projects/${id}/effort-allocations/it`);
                        refetchItAlloc();
                      } catch (e: any) {
                        setSaveError(e?.response?.data?.message || 'Failed to reset allocations');
                      }
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="Business Effort (MD)"
                    type="number"
                    value={form?.estimated_effort_business != null ? Math.round(Number(form.estimated_effort_business)) : ''}
                    onChange={(e) => update({ estimated_effort_business: e.target.value === '' ? null : Number(e.target.value) })}
                    inputProps={{ step: 1, min: 0 }}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <EffortAllocationTable
                    data={businessAllocationData ?? null}
                    effortType="business"
                    estimatedEffort={Number(form?.estimated_effort_business) || 0}
                    canManage={canManage}
                    onEdit={() => setBusinessAllocationDialogOpen(true)}
                    onReset={async () => {
                      try {
                        await api.delete(`/portfolio/projects/${id}/effort-allocations/business`);
                        refetchBusinessAlloc();
                      } catch (e: any) {
                        setSaveError(e?.response?.data?.message || 'Failed to reset allocations');
                      }
                    }}
                  />
                </Box>
              </Stack>

              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Actual Effort</Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingTimeEntry(undefined);
                    setLogTimeDialogOpen(true);
                  }}
                  disabled={!canManage}
                >
                  Log Time
                </Button>
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="IT Effort (MD)"
                  value={form?.actual_effort_it != null ? Math.round(Number(form.actual_effort_it)) : '-'}
                  disabled
                  sx={{ flex: 1 }}
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label="Business Effort (MD)"
                  value={form?.actual_effort_business != null ? Math.round(Number(form.actual_effort_business)) : '-'}
                  disabled
                  sx={{ flex: 1 }}
                  InputProps={{ readOnly: true }}
                />
              </Stack>

              {/* Time Breakdown: Project Overhead vs Task Time */}
              {(() => {
                const taskTimeHours = taskTimeSummary?.total_hours || 0;
                const projectTimeHours = (form?.time_entries || []).reduce(
                  (sum: number, e: any) => sum + (Number(e.hours) || 0),
                  0
                );
                const totalTimeHours = taskTimeHours + projectTimeHours;

                if (totalTimeHours === 0) return null;

                const taskTimeMD = taskTimeHours / 8;
                const projectTimeMD = projectTimeHours / 8;
                const totalTimeMD = totalTimeHours / 8;
                const taskPercent = totalTimeHours > 0 ? Math.round((taskTimeHours / totalTimeHours) * 100) : 0;
                const projectPercent = 100 - taskPercent;

                return (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Time Breakdown</Typography>
                    <Stack direction="row" spacing={4}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Project Overhead</Typography>
                        <Typography variant="h6">{Math.round(projectTimeMD * 10) / 10} MD</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {projectPercent}% of total ({Math.round(projectTimeHours)}h)
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Task Time</Typography>
                        <Typography variant="h6">{Math.round(taskTimeMD * 10) / 10} MD</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {taskPercent}% of total ({Math.round(taskTimeHours)}h)
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Total Logged</Typography>
                        <Typography variant="h6">{Math.round(totalTimeMD * 10) / 10} MD</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({Math.round(totalTimeHours)}h)
                        </Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={projectPercent}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'secondary.light',
                          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                        }}
                      />
                      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="primary.main">Project Overhead</Typography>
                        <Typography variant="caption" color="secondary.main">Task Time</Typography>
                      </Stack>
                    </Box>
                  </Box>
                );
              })()}

              <Divider />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Time Log</Typography>
              {(() => {
                // Merge project overhead entries and task time entries
                const projectEntries = (form?.time_entries || []).map((e: any) => ({
                  ...e,
                  source: 'project' as const,
                  source_label: 'Project Overhead',
                }));
                const taskEntries = (taskTimeEntries || []).map((e: any) => ({
                  ...e,
                  source: 'task' as const,
                  source_label: e.task_title || 'Task',
                }));
                const allEntries = [...projectEntries, ...taskEntries].sort((a, b) => {
                  const dateA = a.logged_at ? new Date(a.logged_at).getTime() : 0;
                  const dateB = b.logged_at ? new Date(b.logged_at).getTime() : 0;
                  return dateB - dateA; // Sort descending (newest first)
                });

                if (allEntries.length === 0) {
                  return (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No time logged yet. Click "Log Time" to add entries.
                    </Typography>
                  );
                }
                return (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Person</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Hours</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell sx={{ width: 80 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allEntries.map((entry: any) => {
                        const canEditEntry = entry.source === 'project' && (canManage || entry.logged_by_id === profile?.id);
                        const personName = [entry.user_first_name, entry.user_last_name].filter(Boolean).join(' ') || entry.user_email || '-';
                        return (
                          <TableRow key={`${entry.source}-${entry.id}`}>
                            <TableCell>
                              {entry.logged_at ? new Date(entry.logged_at).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 150,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: entry.source === 'task' ? 'info.main' : 'text.secondary',
                                }}
                                title={entry.source_label}
                              >
                                {entry.source_label}
                              </Typography>
                            </TableCell>
                            <TableCell>{personName}</TableCell>
                            <TableCell>
                              <Chip
                                label={entry.category === 'it' ? 'IT' : 'Business'}
                                size="small"
                                color={entry.category === 'it' ? 'primary' : 'secondary'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">{entry.hours}h</TableCell>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {entry.notes || '-'}
                            </TableCell>
                            <TableCell>
                              {canEditEntry && (
                                <Stack direction="row" spacing={0}>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setEditingTimeEntry({
                                        id: entry.id,
                                        category: entry.category,
                                        user_id: entry.user_id,
                                        hours: entry.hours,
                                        notes: entry.notes,
                                      });
                                      setLogTimeDialogOpen(true);
                                    }}
                                    title="Edit"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={async () => {
                                      if (!window.confirm('Delete this time entry?')) return;
                                      try {
                                        await api.delete(`/portfolio/projects/${id}/time-entries/${entry.id}`);
                                        await refetch();
                                      } catch (e: any) {
                                        setSaveError(e?.response?.data?.message || 'Failed to delete time entry');
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}

              {(form?.baseline_effort_it != null || form?.baseline_effort_business != null) && (
                <>
                  <Divider />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Baseline (captured at In Progress)</Typography>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary">Baseline IT Effort</Typography>
                      <Typography>{form?.baseline_effort_it != null ? Math.round(Number(form.baseline_effort_it)) : '-'} MD</Typography>
                      {getEffortVariance(form?.estimated_effort_it, form?.baseline_effort_it) && (
                        <Typography variant="caption" color={getEffortVariance(form?.estimated_effort_it, form?.baseline_effort_it)?.startsWith('+') ? 'error.main' : 'success.main'}>
                          {getEffortVariance(form?.estimated_effort_it, form?.baseline_effort_it)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary">Baseline Business Effort</Typography>
                      <Typography>{form?.baseline_effort_business != null ? Math.round(Number(form.baseline_effort_business)) : '-'} MD</Typography>
                      {getEffortVariance(form?.estimated_effort_business, form?.baseline_effort_business) && (
                        <Typography variant="caption" color={getEffortVariance(form?.estimated_effort_business, form?.baseline_effort_business)?.startsWith('+') ? 'error.main' : 'success.main'}>
                          {getEffortVariance(form?.estimated_effort_business, form?.baseline_effort_business)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </>
              )}
            </Stack>
          )}

          {routeTab === 'tasks' && !isCreate && (
            <ProjectTasksPanel
              projectId={id}
              phases={form?.phases || []}
              disabled={!canManage}
            />
          )}

          {routeTab === 'team' && !isCreate && (
            <Stack spacing={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Sponsors & Leads</Typography>
              <Stack spacing={2}>
                <UserSelect
                  label="Business Sponsor"
                  value={form?.business_sponsor_id || null}
                  onChange={async (v) => {
                    await api.patch(`/portfolio/projects/${form.id}`, { business_sponsor_id: v });
                    await refetch();
                  }}
                  disabled={!canManage}
                />
                <UserSelect
                  label="Business Lead"
                  value={form?.business_lead_id || null}
                  onChange={async (v) => {
                    await api.patch(`/portfolio/projects/${form.id}`, { business_lead_id: v });
                    await refetch();
                    queryClient.invalidateQueries({ queryKey: ['project-effort-allocations', id, 'business'] });
                  }}
                  disabled={!canManage}
                />
                <UserSelect
                  label="IT Sponsor"
                  value={form?.it_sponsor_id || null}
                  onChange={async (v) => {
                    await api.patch(`/portfolio/projects/${form.id}`, { it_sponsor_id: v });
                    await refetch();
                  }}
                  disabled={!canManage}
                />
                <UserSelect
                  label="IT Lead"
                  value={form?.it_lead_id || null}
                  onChange={async (v) => {
                    await api.patch(`/portfolio/projects/${form.id}`, { it_lead_id: v });
                    await refetch();
                    queryClient.invalidateQueries({ queryKey: ['project-effort-allocations', id, 'it'] });
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
                  await api.post(`/portfolio/projects/${form.id}/business-team/bulk-replace`, {
                    user_ids: userIds,
                  });
                  await refetch();
                  queryClient.invalidateQueries({ queryKey: ['project-effort-allocations', id, 'business'] });
                }}
                disabled={!canManage}
              />

              <TeamMemberMultiSelect
                label="IT Contributors"
                value={form?.it_team || []}
                onChange={async (userIds) => {
                  await api.post(`/portfolio/projects/${form.id}/it-team/bulk-replace`, {
                    user_ids: userIds,
                  });
                  await refetch();
                  queryClient.invalidateQueries({ queryKey: ['project-effort-allocations', id, 'it'] });
                }}
                disabled={!canManage}
              />
            </Stack>
          )}

          {routeTab === 'relations' && !isCreate && form?.id && (
            <Stack spacing={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Dependencies</Typography>
              <DependencySelector
                entityType="project"
                entityId={form.id}
                dependencies={form?.dependencies || []}
                onAdd={async (targetType, targetId) => {
                  await api.post(`/portfolio/projects/${form.id}/dependencies`, {
                    target_type: targetType,
                    target_id: targetId,
                  });
                  await refetch();
                }}
                onRemove={async (targetType, targetId) => {
                  await api.delete(`/portfolio/projects/${form.id}/dependencies/${targetType}/${targetId}`);
                  await refetch();
                }}
                disabled={!canManage}
              />

              <Divider />

              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Source Requests</Typography>
              {form?.source_requests && form.source_requests.length > 0 ? (
                <Stack spacing={1}>
                  {form.source_requests.map((r: any) => (
                    <Box
                      key={r.id}
                      component="span"
                      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                      onClick={() => navigate(`/portfolio/requests/${r.id}/overview`)}
                    >
                      <Typography variant="body2">
                        {r.name} ({r.status})
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No source requests linked.</Typography>
              )}

              <Divider />

              <ProjectRelationsPanel
                ref={relationsPanelRef}
                id={form.id}
                onDirtyChange={setRelationsDirty}
              />
            </Stack>
          )}

          {routeTab === 'activity' && !isCreate && (
            <PortfolioActivity
              entityType="project"
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

      <StatusChangeDialog
        open={statusDialogOpen}
        currentStatus={form?.status || ''}
        newStatus={pendingStatus || ''}
        onConfirm={handleStatusDialogConfirm}
        onCancel={handleStatusDialogCancel}
      />

      <LogTimeDialog
        open={logTimeDialogOpen}
        onClose={() => {
          setLogTimeDialogOpen(false);
          setEditingTimeEntry(undefined);
        }}
        projectId={id}
        onSuccess={() => {
          refetch();
        }}
        editEntry={editingTimeEntry}
      />

      <EffortAllocationDialog
        open={itAllocationDialogOpen}
        onClose={() => setItAllocationDialogOpen(false)}
        projectId={id}
        effortType="it"
        eligibleUsers={(() => {
          const users: EligibleUser[] = [];
          const seen = new Set<string>();
          // Add IT lead
          if (form?.it_lead_id && form?.it_lead) {
            users.push({
              user_id: form.it_lead_id,
              email: form.it_lead.email,
              first_name: form.it_lead.first_name,
              last_name: form.it_lead.last_name,
              is_lead: true,
              allocation_pct: itAllocationData?.allocations.find(a => a.user_id === form.it_lead_id)?.allocation_pct,
            });
            seen.add(form.it_lead_id);
          }
          // Add IT team members
          for (const member of (form?.it_team || [])) {
            if (!seen.has(member.user_id)) {
              users.push({
                user_id: member.user_id,
                email: member.email,
                first_name: member.first_name,
                last_name: member.last_name,
                is_lead: false,
                allocation_pct: itAllocationData?.allocations.find(a => a.user_id === member.user_id)?.allocation_pct,
              });
              seen.add(member.user_id);
            }
          }
          return users;
        })()}
        estimatedEffort={Number(form?.estimated_effort_it) || 0}
        onSuccess={() => refetchItAlloc()}
      />

      <EffortAllocationDialog
        open={businessAllocationDialogOpen}
        onClose={() => setBusinessAllocationDialogOpen(false)}
        projectId={id}
        effortType="business"
        eligibleUsers={(() => {
          const users: EligibleUser[] = [];
          const seen = new Set<string>();
          // Add Business lead
          if (form?.business_lead_id && form?.business_lead) {
            users.push({
              user_id: form.business_lead_id,
              email: form.business_lead.email,
              first_name: form.business_lead.first_name,
              last_name: form.business_lead.last_name,
              is_lead: true,
              allocation_pct: businessAllocationData?.allocations.find(a => a.user_id === form.business_lead_id)?.allocation_pct,
            });
            seen.add(form.business_lead_id);
          }
          // Add Business team members
          for (const member of (form?.business_team || [])) {
            if (!seen.has(member.user_id)) {
              users.push({
                user_id: member.user_id,
                email: member.email,
                first_name: member.first_name,
                last_name: member.last_name,
                is_lead: false,
                allocation_pct: businessAllocationData?.allocations.find(a => a.user_id === member.user_id)?.allocation_pct,
              });
              seen.add(member.user_id);
            }
          }
          return users;
        })()}
        estimatedEffort={Number(form?.estimated_effort_business) || 0}
        onSuccess={() => refetchBusinessAlloc()}
      />

      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        itemType="project"
        itemId={form?.id || id}
        itemName={form?.name || 'Project'}
        itemNumber={data?.item_number}
      />
    </Box>
  );
}
