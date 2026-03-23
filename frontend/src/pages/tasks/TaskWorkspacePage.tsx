import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import { useTaskNav } from '../../hooks/useTaskNav';
import { useClassificationDefaults } from '../../hooks/useClassificationDefaults';
import { useAuth } from '../../auth/AuthContext';
import ExportButton from '../../components/ExportButton';
import ImportButton from '../../components/ImportButton';
import { importDocument as importMarkdownDocument, type ImportDocumentResult } from '../../api/endpoints/import';
import TaskSidebar from './components/TaskSidebar';
import TaskActivity from './components/TaskActivity';
import TaskAttachments, { TaskAttachment } from './components/TaskAttachments';
import { RelatedObjectType } from '../../components/fields/RelatedObjectSelect';
import { useRecentlyViewed } from '../workspace/hooks/useRecentlyViewed';
import ShareDialog from '../../components/ShareDialog';
import { formatItemRef } from '../../utils/item-ref';
import { buildInlineImageUrl, getTenantSlugFromHostname } from '../../utils/inlineImageUrls';
import ConvertToRequestDialog from './components/ConvertToRequestDialog';
import {
  TASK_STATUS_COLORS,
  TASK_STATUS_OPTIONS,
} from './task.constants';
import type { TaskStatus } from './task.constants';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import {
  getPriorityLabel,
  getTaskStatusLabel,
} from '../../utils/portfolioI18n';

const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'default' | 'info' | 'success'> = {
  blocker: 'error',
  high: 'warning',
  normal: 'default',
  low: 'info',
  optional: 'success',
};

const PROJECT_WORKSPACE_TABS = new Set([
  'summary',
  'overview',
  'activity',
  'team',
  'timeline',
  'effort',
  'tasks',
  'scoring',
  'relations',
  'knowledge',
]);

interface TaskData {
  id: string;
  item_number: number | null;
  title: string | null;
  description: string | null;
  status: TaskStatus;
  task_type_id: string | null;
  task_type_name: string | null;
  priority_level: 'blocker' | 'high' | 'normal' | 'low' | 'optional';
  priority_score: number;
  start_date: string | null;
  due_date: string | null;
  assignee_user_id: string | null;
  assignee_name: string | null;
  creator_id: string | null;
  creator_name: string | null;
  owner_ids: string[];
  viewer_ids: string[];
  labels: string[];
  related_object_type: 'spend_item' | 'contract' | 'capex_item' | 'project' | null;
  related_object_id: string | null;
  related_object_name: string | null;
  phase_id: string | null;
  phase_name: string | null;
  // Classification fields
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  company_id: string | null;
  company_name: string | null;
  converted_request_id?: string | null;
  converted_request_item_number?: number | null;
  created_at: string;
  updated_at: string;
}

const MarkdownEditor = React.lazy(() => import('../../components/MarkdownEditor'));

export default function TaskWorkspacePage() {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const cleanedSearchParams = React.useMemo(() => {
    const next = new URLSearchParams(location.search);
    next.delete('action');
    next.delete('status');
    return next;
  }, [location.search]);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasLevel, profile } = useAuth();
  const { addToRecent } = useRecentlyViewed();

  const id = String(params.id || '');
  const isCreate = id === 'new';
  const canManage = hasLevel('tasks', 'member');
  const canDelete = hasLevel('tasks', 'admin');
  const canCreateRequest = hasLevel('portfolio_requests', 'member');
  const originProjectId = cleanedSearchParams.get('projectId');
  const originProjectTab = React.useMemo(() => {
    const tab = (cleanedSearchParams.get('projectTab') || '').trim();
    if (!tab || !PROJECT_WORKSPACE_TABS.has(tab)) return 'tasks';
    return tab;
  }, [cleanedSearchParams]);
  const projectListContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    const projectSort = cleanedSearchParams.get('projectSort');
    const projectQ = cleanedSearchParams.get('projectQ');
    const projectFilters = cleanedSearchParams.get('projectFilters');
    const projectScope = cleanedSearchParams.get('projectScope');
    const projectInvolvedUserId = cleanedSearchParams.get('projectInvolvedUserId');
    const projectInvolvedTeamId = cleanedSearchParams.get('projectInvolvedTeamId');
    if (projectSort) sp.set('sort', projectSort);
    if (projectQ) sp.set('q', projectQ);
    if (projectFilters) sp.set('filters', projectFilters);
    if (projectScope) sp.set('projectScope', projectScope);
    if (projectInvolvedUserId) sp.set('involvedUserId', projectInvolvedUserId);
    if (projectInvolvedTeamId) sp.set('involvedTeamId', projectInvolvedTeamId);
    return sp;
  }, [cleanedSearchParams]);
  const buildProjectWorkspacePath = React.useCallback((projectId: string, tab?: string) => {
    const requestedTab = (tab || '').trim();
    const effectiveTab = requestedTab && PROJECT_WORKSPACE_TABS.has(requestedTab) ? requestedTab : originProjectTab;
    const qs = projectListContextParams.toString();
    return `/portfolio/projects/${projectId}/${effectiveTab}${qs ? `?${qs}` : ''}`;
  }, [originProjectTab, projectListContextParams]);
  const originProjectPath = originProjectId ? buildProjectWorkspacePath(originProjectId) : null;
  const validTaskStatuses = React.useMemo(
    () => new Set<TaskStatus>(TASK_STATUS_OPTIONS.map((option) => option.value)),
    [],
  );
  const [deepLinkStatus, setDeepLinkStatus] = React.useState<TaskStatus | null>(() => {
    const actionParam = searchParams.get('action');
    const statusParam = searchParams.get('status');
    if (actionParam !== 'set_status' || !statusParam) return null;
    return statusParam as TaskStatus;
  });

  React.useEffect(() => {
    const actionParam = searchParams.get('action');
    const statusParam = searchParams.get('status');
    if (actionParam === 'set_status' && statusParam) {
      setDeepLinkStatus(statusParam as TaskStatus);
      return;
    }
    setDeepLinkStatus(null);
  }, [id]);

  // Create mode state for relation (type can be null for standalone tasks)
  const [createRelation, setCreateRelation] = React.useState<{
    type: RelatedObjectType | null;
    id: string | null;
    name: string | null;
  }>({ type: null, id: null, name: null });
  const [createSaving, setCreateSaving] = React.useState(false);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [form, setForm] = React.useState<Partial<TaskData>>({});
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [initialized, setInitialized] = React.useState(false);
  const classificationTouchedRef = React.useRef({
    source_id: false,
    category_id: false,
    stream_id: false,
    company_id: false,
  });
  const [descriptionFocusNonce, setDescriptionFocusNonce] = React.useState(0);
  const [commentFocusNonce, setCommentFocusNonce] = React.useState(0);
  const pendingDescriptionFocusRef = React.useRef(false);
  const autoCommentFocusTaskRef = React.useRef<string | null>(null);
  const [isContentScrolled, setIsContentScrolled] = React.useState(false);
  const priorityLabels = React.useMemo<Record<string, string>>(() => ({
    blocker: getPriorityLabel(t, 'blocker'),
    high: getPriorityLabel(t, 'high'),
    normal: getPriorityLabel(t, 'normal'),
    low: getPriorityLabel(t, 'low'),
    optional: getPriorityLabel(t, 'optional'),
  }), [t]);

  // Sidebar width state with localStorage persistence
  const SIDEBAR_STORAGE_KEY = 'taskSidebarWidth';
  const SIDEBAR_MIN = 240;
  const SIDEBAR_MAX = 400;
  const SIDEBAR_DEFAULT = 300;
  const [sidebarWidth, setSidebarWidth] = React.useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= SIDEBAR_MIN && parsed <= SIDEBAR_MAX) return parsed;
    }
    return SIDEBAR_DEFAULT;
  });
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const { data: classificationDefaults, isLoading: classificationDefaultsLoading } = useClassificationDefaults();

  // Handle sidebar resize
  React.useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;
      const containerLeft = sidebarRef.current.getBoundingClientRect().left;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX - containerLeft));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  const { data: task, isLoading, refetch } = useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const res = await api.get<TaskData>(`/tasks/${id}`);
      return res.data;
    },
    enabled: !!id && !isCreate,
  });

  // Track recently viewed
  React.useEffect(() => {
    if (task?.id && task?.title) {
      addToRecent('task', task.id, task.title);
    }
  }, [task?.id, task?.title, addToRecent]);

  // Browser tab title
  React.useEffect(() => {
    if (task?.item_number && task?.title) {
      document.title = t('portfolio:workspace.task.browserTitle', {
        ref: `T-${task.item_number}`,
        name: task.title,
      });
    }
    return () => { document.title = 'KANAP'; };
  }, [task?.item_number, task?.title, t]);

  // Swap UUID with item ref in URL bar
  React.useEffect(() => {
    if (!task?.item_number) return;
    const currentParam = params.id || '';
    const isUuid = /^[0-9a-f]{8}-/.test(currentParam);
    if (isUuid) {
      const ref = formatItemRef('task', task.item_number);
      const newPath = location.pathname.replace(currentParam, ref);
      window.history.replaceState(null, '', newPath + location.search);
    }
  }, [task?.item_number, params.id, location.pathname, location.search]);

  const { data: totalTimeHours = 0, refetch: refetchTime } = useQuery({
    queryKey: ['task-time-entries-sum', id],
    queryFn: async () => {
      try {
        const isProject = task?.related_object_type === 'project';
        const endpoint = isProject
          ? `/portfolio/projects/${task?.related_object_id}/tasks/${task?.id}/time-entries/sum`
          : `/tasks/${task?.id}/time-entries/sum`;
        const res = await api.get<{ total: number }>(endpoint);
        return res.data.total;
      } catch {
        return 0;
      }
    },
    enabled: !!id && !isCreate && !!task,
  });

  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [convertToRequestOpen, setConvertToRequestOpen] = React.useState(false);
  const [descriptionResetNonce, setDescriptionResetNonce] = React.useState(0);

  // Attachments
  const [showUploadArea, setShowUploadArea] = React.useState(false);
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['task-attachments', id],
    queryFn: async () => {
      const res = await api.get<TaskAttachment[]>(`/tasks/${id}/attachments`);
      return res.data;
    },
    enabled: !!id && !isCreate,
  });

  React.useEffect(() => {
    if (!location.search.includes('action=') && !location.search.includes('status=')) return;
    const next = new URLSearchParams(location.search);
    next.delete('action');
    next.delete('status');
    const qs = next.toString();
    window.history.replaceState({}, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash || ''}`);
  }, [location.pathname, location.search, location.hash]);

  const initialStatus = React.useMemo<TaskStatus | null>(() => {
    if (!task || !deepLinkStatus) return null;
    if (!validTaskStatuses.has(deepLinkStatus)) return null;
    if (deepLinkStatus === task.status) return null;
    return deepLinkStatus;
  }, [task, deepLinkStatus, validTaskStatuses]);

  const handleUploadAttachment = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/tasks/${id}/attachments`, formData);
    refetchAttachments();
  };

  // Upload image for rich text editor, returns the URL to embed
  const handleUploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_field', 'description');
    const res = await api.post<{ id: string }>(`/tasks/${id}/attachments`, formData);
    refetchAttachments();
    const tenantSlug = getTenantSlugFromHostname(window.location.hostname);
    return buildInlineImageUrl(`/tasks/attachments/${tenantSlug}/${res.data.id}/inline`);
  };

  const handleImportImageUrl = async (sourceUrl: string): Promise<string> => {
    const res = await api.post<{ id: string }>(`/tasks/${id}/attachments/inline/import`, {
      source_field: 'description',
      source_url: sourceUrl,
    });
    refetchAttachments();
    const tenantSlug = getTenantSlugFromHostname(window.location.hostname);
    return buildInlineImageUrl(`/tasks/attachments/${tenantSlug}/${res.data.id}/inline`);
  };

  const handleDescriptionImport = React.useCallback(async (selectedFile: File): Promise<ImportDocumentResult> => {
    if (isCreate || !task?.id) {
      throw new Error(t('portfolio:workspace.task.messages.documentImportAfterCreate'));
    }
    return importMarkdownDocument(`/tasks/${task.id}/import`, selectedFile);
  }, [isCreate, task?.id, t]);

  const handleDescriptionImported = React.useCallback((result: ImportDocumentResult) => {
    setError(null);
    setDescription(result.markdown);
    setDirty(true);
    setDescriptionResetNonce((prev) => prev + 1);
    window.setTimeout(() => {
      setDescriptionFocusNonce((prev) => prev + 1);
    }, 0);
  }, []);

  const handleDescriptionImportError = React.useCallback((error: unknown) => {
    setError(getApiErrorMessage(error, t, t('portfolio:workspace.task.messages.documentImportFailed')));
  }, [t]);

  const handleDeleteAttachment = async (attachmentId: string) => {
    await api.patch(`/tasks/attachments/${attachmentId}/delete`);
    refetchAttachments();
  };

  // Convert base64 data URL to File object
  const base64ToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Process description to convert base64 markdown images to S3 attachments
  const convertBase64ImagesToS3 = async (taskId: string, markdown: string): Promise<string> => {
    const base64Regex = /!\[[^\]]*\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    const matches = [...markdown.matchAll(base64Regex)];
    if (matches.length === 0) return markdown;

    const tenantSlug = getTenantSlugFromHostname(window.location.hostname);
    let updatedMarkdown = markdown;

    for (let i = 0; i < matches.length; i++) {
      const base64Src = matches[i][1];
      try {
        const file = base64ToFile(base64Src, `image-${Date.now()}-${i + 1}.png`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source_field', 'description');
        const res = await api.post<{ id: string }>(`/tasks/${taskId}/attachments`, formData);
        const s3Url = buildInlineImageUrl(`/tasks/attachments/${tenantSlug}/${res.data.id}/inline`);
        updatedMarkdown = updatedMarkdown.replace(base64Src, s3Url);
      } catch (err) {
        console.error('Failed to upload image to S3:', err);
      }
    }

    return updatedMarkdown;
  };

  // Initialize form from task data
  React.useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setForm({
        status: task.status,
        task_type_id: task.task_type_id,
        task_type_name: task.task_type_name,
        priority_level: task.priority_level,
        start_date: task.start_date,
        due_date: task.due_date,
        assignee_user_id: task.assignee_user_id,
        creator_id: task.creator_id,
        phase_id: task.phase_id,
        labels: task.labels,
        viewer_ids: task.viewer_ids,
        related_object_type: task.related_object_type,
        related_object_id: task.related_object_id,
        related_object_name: task.related_object_name,
        // Classification fields (for standalone tasks)
        source_id: task.source_id,
        category_id: task.category_id,
        stream_id: task.stream_id,
        company_id: task.company_id,
      });
      setDirty(false);
      setInitialized(true);
      classificationTouchedRef.current = {
        source_id: false,
        category_id: false,
        stream_id: false,
        company_id: false,
      };
    }
  }, [task]);

  // Fetch task types for default task type
  const { data: taskTypesData } = useQuery({
    queryKey: ['portfolio-task-types'],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; name: string; is_active: boolean }>>('/portfolio/classification/task-types');
      return res.data;
    },
    enabled: isCreate,
  });

  // Find the default "Task" type ID
  const defaultTaskTypeId = React.useMemo(() => {
    if (!taskTypesData) return null;
    const taskType = taskTypesData.find(t => t.name === 'Task' && t.is_active);
    return taskType?.id || null;
  }, [taskTypesData]);

  // Initialize defaults for create mode (including pre-filled entity from URL params)
  React.useEffect(() => {
    if (isCreate && profile?.id) {
      const projectId = cleanedSearchParams.get('projectId');
      const spendItemId = cleanedSearchParams.get('spendItemId');
      const capexItemId = cleanedSearchParams.get('capexItemId');
      const contractId = cleanedSearchParams.get('contractId');
      const phaseId = cleanedSearchParams.get('phaseId');

      setForm({
        status: 'open',
        task_type_id: null,
        priority_level: 'normal',
        assignee_user_id: profile.id,
        creator_id: profile.id,
        start_date: null,
        due_date: null,
        phase_id: phaseId || null,
        labels: [],
        viewer_ids: [],
      });
      setTitle('');
      setDescription('');
      classificationTouchedRef.current = {
        source_id: false,
        category_id: false,
        stream_id: false,
        company_id: false,
      };

      // Pre-fill relation based on URL params
      if (projectId) {
        api.get<{ id: string; name: string }>(`/portfolio/projects/${projectId}`)
          .then((res) => {
            setCreateRelation({
              type: 'project',
              id: res.data.id || projectId,
              name: res.data.name || t('portfolio:context.project'),
            });
            setInitialized(true);
          })
          .catch(() => {
            setInitialized(true);
          });
      } else if (spendItemId) {
        api.get<{ id: string; product_name: string }>(`/spend-items/${spendItemId}`)
          .then((res) => {
            setCreateRelation({
              type: 'spend_item',
              id: res.data.id || spendItemId,
              name: res.data.product_name || t('portfolio:context.spend_item'),
            });
            setInitialized(true);
          })
          .catch(() => {
            setInitialized(true);
          });
      } else if (capexItemId) {
        api.get<{ id: string; description: string }>(`/capex-items/${capexItemId}`)
          .then((res) => {
            setCreateRelation({
              type: 'capex_item',
              id: res.data.id || capexItemId,
              name: res.data.description || t('portfolio:context.capex_item'),
            });
            setInitialized(true);
          })
          .catch(() => {
            setInitialized(true);
          });
      } else if (contractId) {
        api.get<{ id: string; name: string }>(`/contracts/${contractId}`)
          .then((res) => {
            setCreateRelation({
              type: 'contract',
              id: res.data.id || contractId,
              name: res.data.name || t('portfolio:context.contract'),
            });
            setInitialized(true);
          })
          .catch(() => {
            setInitialized(true);
          });
      } else {
        setInitialized(true);
      }
    }
  }, [isCreate, profile?.id, cleanedSearchParams, t]);

  React.useEffect(() => {
    if (!isCreate || !initialized || !pendingDescriptionFocusRef.current) return;
    pendingDescriptionFocusRef.current = false;
    setDescriptionFocusNonce((prev) => prev + 1);
  }, [isCreate, initialized]);

  React.useEffect(() => {
    if (isCreate || !initialized) return;
    if (autoCommentFocusTaskRef.current === id) return;
    autoCommentFocusTaskRef.current = id;
    setCommentFocusNonce((prev) => prev + 1);
  }, [id, isCreate, initialized]);

  React.useEffect(() => {
    setIsContentScrolled(false);
  }, [id, isCreate]);

  // Set default task type when task types data loads (separate effect to avoid resetting form)
  React.useEffect(() => {
    if (isCreate && defaultTaskTypeId && !form.task_type_id) {
      setForm(prev => ({ ...prev, task_type_id: defaultTaskTypeId }));
    }
  }, [isCreate, defaultTaskTypeId, form.task_type_id]);

  // Pre-fill classification when a project is selected in create mode
  React.useEffect(() => {
    if (isCreate && createRelation.type === 'project' && createRelation.id) {
      api.get(`/portfolio/projects/${createRelation.id}`)
        .then((res) => {
          setForm(prev => ({
            ...prev,
            source_id: res.data.source_id ?? null,
            category_id: res.data.category_id ?? null,
            stream_id: res.data.stream_id ?? null,
            company_id: res.data.company_id ?? null,
          }));
        })
        .catch(() => {});
    }
  }, [isCreate, createRelation.type, createRelation.id]);

  React.useEffect(() => {
    if (!isCreate || classificationDefaultsLoading) return;
    const canEditClassification = !createRelation.type || createRelation.type === 'project';
    if (!canEditClassification) return;

    setForm((prev) => {
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
        const currentCategory = isUnset(next.category_id) ? null : next.category_id;
        const defaultCategory = classificationDefaults?.category_id ?? null;
        const categoryMismatch = !!currentCategory && !!defaultCategory && currentCategory !== defaultCategory;
        if (!categoryMismatch) {
          next.stream_id = defaultStreamId;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    isCreate,
    classificationDefaultsLoading,
    classificationDefaults,
    createRelation.type,
    createRelation.id,
    form.source_id,
    form.category_id,
    form.stream_id,
    form.company_id,
  ]);

  const handleFieldChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'source_id' || field === 'category_id' || field === 'stream_id' || field === 'company_id') {
      const key = field as 'source_id' | 'category_id' | 'stream_id' | 'company_id';
      classificationTouchedRef.current = {
        ...classificationTouchedRef.current,
        [key]: true,
      };
    }
    setDirty(true);
  };

  const handleRelationChange = React.useCallback((params: { type: RelatedObjectType; id: string | null; name: string | null }) => {
    setForm(prev => {
      const relationChanged = prev.related_object_type !== params.type || prev.related_object_id !== params.id;
      return {
        ...prev,
        related_object_type: params.type,
        related_object_id: params.id,
        related_object_name: params.name,
        ...(params.type !== 'project' || relationChanged ? { phase_id: null } : {}),
      };
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!task || saving) return;
    setSaving(true);
    setError(null);

    try {
      const currentType = task.related_object_type;
      const currentId = task.related_object_id;
      const nextType = (form.related_object_type !== undefined ? form.related_object_type : currentType) as RelatedObjectType;
      const nextId = (form.related_object_id !== undefined ? form.related_object_id : currentId) as string | null;
      const relationChanged = nextType !== currentType || nextId !== currentId;

      if (nextType === null && nextId !== null) {
        throw new Error(t('portfolio:workspace.task.messages.invalidStandaloneRelation'));
      }
      if (nextType !== null && !nextId) {
        throw new Error(t('portfolio:workspace.task.messages.relatedItemRequired'));
      }

      const endpoint = nextType === 'project'
        ? `/portfolio/projects/${nextId}/tasks/${task.id}`
        : `/tasks/${task.id}`;

      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
      };

      const editableFields = [
        'status',
        'task_type_id',
        'priority_level',
        'start_date',
        'due_date',
        'assignee_user_id',
        'creator_id',
        'phase_id',
        'labels',
        'viewer_ids',
      ] as const;
      for (const field of editableFields) {
        if ((form as any)[field] !== undefined) {
          payload[field] = (form as any)[field];
        }
      }

      if (relationChanged) {
        payload.related_object_type = nextType;
        payload.related_object_id = nextId;
      }

      const canEditClassification = nextType === null || nextType === 'project';
      if (canEditClassification) {
        const classificationFields = ['source_id', 'category_id', 'stream_id', 'company_id'] as const;
        for (const field of classificationFields) {
          if ((form as any)[field] === undefined) continue;
          if (relationChanged && nextType === 'project' && !classificationTouchedRef.current[field]) continue;
          payload[field] = (form as any)[field];
        }
      }

      await api.patch(endpoint, payload);
      setDirty(false);
      classificationTouchedRef.current = {
        source_id: false,
        category_id: false,
        stream_id: false,
        company_id: false,
      };
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', task.id] });
    } catch (error) {
      setError(getApiErrorMessage(error, t, t('portfolio:workspace.task.messages.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !window.confirm(t('portfolio:workspace.task.confirmations.deleteTask'))) return;
    try {
      await api.delete('/tasks/bulk', { data: { ids: [task.id] } });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/portfolio/tasks');
    } catch (error) {
      setError(getApiErrorMessage(error, t, t('portfolio:workspace.task.messages.deleteFailed')));
    }
  };

  const handleBack = () => {
    if (originProjectPath) {
      navigate(originProjectPath);
      return;
    }
    const qs = cleanedSearchParams.toString();
    navigate(`/portfolio/tasks${qs ? `?${qs}` : ''}`);
  };

  // Navigation for prev/next
  const sort = cleanedSearchParams.get('sort') || 'created_at:DESC';
  const q = cleanedSearchParams.get('q') || '';
  const filters = cleanedSearchParams.get('filters') || '';
  // Read scope params for filtered navigation
  const assigneeUserId = cleanedSearchParams.get('assigneeUserId') || undefined;
  const teamId = cleanedSearchParams.get('teamId') || undefined;
  const navExtraParams = React.useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (assigneeUserId) params.assigneeUserId = assigneeUserId;
    if (teamId) params.teamId = teamId;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [assigneeUserId, teamId]);
  const nav = useTaskNav({ id, sort, q, filters, extraParams: navExtraParams });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null as any, nextId: null as any }
    : nav;

  const confirmAndNavigate = React.useCallback(async (targetId: string | null) => {
    if (!targetId) return;
    if (dirty) {
      const proceed = window.confirm(t('portfolio:workspace.task.confirmations.unsavedNavigate'));
      if (proceed) {
        setSaving(true);
        try { await handleSave(); } catch { setSaving(false); return; }
        setSaving(false);
      } else {
        // Reset form to task data
        if (task) {
          setTitle(task.title || '');
          setDescription(task.description || '');
          setForm({ ...task });
        }
        classificationTouchedRef.current = {
          source_id: false,
          category_id: false,
          stream_id: false,
          company_id: false,
        };
        setDirty(false);
      }
    }
    const qs = cleanedSearchParams.toString();
    navigate(`/portfolio/tasks/${targetId}${qs ? `?${qs}` : ''}`);
  }, [dirty, task, cleanedSearchParams, navigate, handleSave, t]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCreateSave = async () => {
    if (createSaving) return;

    // Validation
    if (!title.trim()) {
      setError(t('portfolio:workspace.task.messages.titleRequired'));
      return;
    }
    // Related item is optional - standalone tasks are allowed
    const isStandaloneCreate = !createRelation.type;

    setCreateSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        status: form.status || 'open',
        priority_level: form.priority_level || 'normal',
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        assignee_user_id: form.assignee_user_id || null,
        creator_id: form.creator_id || null,
        phase_id: form.phase_id || null,
        viewer_ids: form.viewer_ids || [],
        task_type_id: (form as any).task_type_id || null,
        // Classification fields (for standalone and project tasks)
        // Only include fields the user has touched (incl. explicit null); omitted fields let backend default from project
        ...((isStandaloneCreate || createRelation.type === 'project') && (form as any).source_id !== undefined ? { source_id: (form as any).source_id } : {}),
        ...((isStandaloneCreate || createRelation.type === 'project') && (form as any).category_id !== undefined ? { category_id: (form as any).category_id } : {}),
        ...((isStandaloneCreate || createRelation.type === 'project') && (form as any).stream_id !== undefined ? { stream_id: (form as any).stream_id } : {}),
        ...((isStandaloneCreate || createRelation.type === 'project') && (form as any).company_id !== undefined ? { company_id: (form as any).company_id } : {}),
      };

      // Determine endpoint based on relation type
      let endpoint: string;
      if (isStandaloneCreate) {
        // Create standalone task
        endpoint = '/tasks/standalone';
      } else if (createRelation.type && createRelation.id) {
        switch (createRelation.type) {
          case 'project':
            endpoint = `/portfolio/projects/${createRelation.id}/tasks`;
            break;
          case 'spend_item':
            endpoint = `/spend-items/${createRelation.id}/tasks`;
            break;
          case 'contract':
            endpoint = `/contracts/${createRelation.id}/tasks`;
            break;
          case 'capex_item':
            endpoint = `/capex-items/${createRelation.id}/tasks`;
            break;
          default:
            throw new Error(t('portfolio:workspace.task.messages.invalidRelationType'));
        }
      } else {
        throw new Error(t('portfolio:workspace.task.messages.invalidRelationConfiguration'));
      }

      const res = await api.post<{ id: string }>(endpoint, payload);
      const newId = res.data?.id;
      if (newId) {
        // Convert any base64 images in description to S3 attachments
        if (description && description.includes('data:image/')) {
          try {
            const updatedDescription = await convertBase64ImagesToS3(newId, description);
            if (updatedDescription !== description) {
              // Update task with S3 URLs
              const isProject = createRelation.type === 'project';
              const updateEndpoint = isProject
                ? `/portfolio/projects/${createRelation.id}/tasks/${newId}`
                : `/tasks/${newId}`;
              await api.patch(updateEndpoint, { description: updatedDescription });
            }
          } catch (err) {
            console.error('Failed to convert base64 images:', err);
            // Continue anyway - base64 images will still work
          }
        }

        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        if (originProjectId) {
          queryClient.invalidateQueries({ queryKey: ['project-tasks', originProjectId] });
          if (originProjectPath) {
            navigate(originProjectPath, { replace: true });
          } else {
            navigate(`/portfolio/projects/${originProjectId}/tasks`, { replace: true });
          }
          return;
        }
        const qs = cleanedSearchParams.toString();
        navigate(`/portfolio/tasks/${newId}/overview${qs ? `?${qs}` : ''}`, { replace: true });
      }
    } catch (error) {
      setError(getApiErrorMessage(error, t, t('portfolio:workspace.task.messages.createFailed')));
    } finally {
      setCreateSaving(false);
    }
  };

  // Check if create form is valid for enabling save button
  // Title is required. Relation is optional (standalone tasks are allowed).
  const isCreateValid = Boolean(title.trim());
  const taskImportDisabled = isCreate || !canManage;
  const taskImportDisabledTitle = isCreate
    ? t('portfolio:workspace.task.messages.importSaveFirst')
    : (!canManage ? t('portfolio:workspace.task.messages.importPermissionRequired') : undefined);
  const contentSpacing = {
    section: 3,
    sectionLarge: 4,
  } as const;
  const headerShadow = isContentScrolled
    ? `0 4px 12px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.35 : 0.08)}`
    : 'none';
  const isTitleMissing = !title.trim();
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
  const handleMainContentScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const nextScrolled = event.currentTarget.scrollTop > 4;
    setIsContentScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (!canManage) return;

      if (isCreate) {
        if (!isCreateValid || createSaving) return;
        void handleCreateSave();
        return;
      }

      if (!dirty || saving) return;
      void handleSave();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canManage, isCreate, isCreateValid, createSaving, dirty, saving, handleCreateSave, handleSave]);

  // Create mode UI - full workspace layout
  if (isCreate) {
    const isProjectCreate = createRelation.type === 'project';

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            boxShadow: headerShadow,
            transition: 'box-shadow 140ms ease',
            zIndex: 2,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton onClick={handleBack} size="small">
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {t('portfolio:actions.backToTasks')}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button onClick={handleBack} size="small">
                {t('common:buttons.cancel')}
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateSave}
                disabled={!isCreateValid || createSaving || !canManage}
                size="small"
              >
                {createSaving ? t('portfolio:workspace.task.messages.creating') : t('common:buttons.create')}
              </Button>
            </Stack>
          </Stack>

          {/* Title input */}
          <Stack spacing={0.5} sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {t('portfolio:workspace.task.title.label')}
            </Typography>
            <Box sx={titleBarSx}>
              <TextField
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Tab' && !event.shiftKey) {
                    event.preventDefault();
                    if (initialized) {
                      setDescriptionFocusNonce((prev) => prev + 1);
                    } else {
                      pendingDescriptionFocusRef.current = true;
                    }
                  }
                }}
                variant="standard"
                fullWidth
                autoFocus
                placeholder={t('portfolio:workspace.task.title.placeholder')}
                InputProps={{
                  disableUnderline: true,
                  sx: { fontSize: '1.5rem', fontWeight: 600 },
                }}
              />
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={getTaskStatusLabel(t, (form.status as TaskStatus) || 'open')}
                color={TASK_STATUS_COLORS[(form.status as TaskStatus) || 'open'] || 'default'}
                size="small"
              />
              <Chip
                label={priorityLabels[form.priority_level as string] || getPriorityLabel(t, 'normal')}
                color={PRIORITY_COLORS[form.priority_level as string] || 'default'}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar */}
          <Box
            ref={sidebarRef}
            sx={{
              width: isMobile ? '100%' : sidebarWidth,
              flexShrink: 0,
              borderRight: isMobile ? 0 : 1,
              borderBottom: isMobile ? 1 : 0,
              borderColor: 'divider',
              overflow: 'auto',
              p: 2,
              position: 'relative',
            }}
          >
            {/* Resize handle */}
            {!isMobile && (
              <Box
                onMouseDown={() => setIsResizing(true)}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 4,
                  height: '100%',
                  cursor: 'col-resize',
                  '&:hover': { bgcolor: 'primary.main', opacity: 0.3 },
                  ...(isResizing && { bgcolor: 'primary.main', opacity: 0.5 }),
                }}
              />
            )}
            <TaskSidebar
              task={{
                id: '',
                status: (form.status as string) || 'open',
                task_type_id: (form as any).task_type_id || null,
                task_type_name: null,
                priority_level: (form.priority_level as string) || 'normal',
                start_date: form.start_date ?? null,
                due_date: form.due_date ?? null,
                assignee_user_id: form.assignee_user_id ?? null,
                assignee_name: null,
                creator_id: form.creator_id ?? null,
                creator_name: null,
                owner_ids: [],
                viewer_ids: form.viewer_ids || [],
                labels: form.labels || [],
                related_object_type: createRelation.type as string | null,
                related_object_id: createRelation.id || null,
                related_object_name: createRelation.name || null,
                phase_id: form.phase_id ?? null,
                phase_name: null,
                source_id: (form as any).source_id ?? null,
                source_name: null,
                category_id: (form as any).category_id ?? null,
                category_name: null,
                stream_id: (form as any).stream_id ?? null,
                stream_name: null,
                company_id: (form as any).company_id ?? null,
                company_name: null,
              }}
              onChange={handleFieldChange}
              readOnly={false}
              totalTimeHours={0}
              isCreate={true}
              onRelationChange={(params) => setCreateRelation(params)}
            />
          </Box>

          {/* Main content area */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }} onScroll={handleMainContentScroll}>
            {/* Description */}
            <Box sx={{ mb: contentSpacing.sectionLarge }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {t('portfolio:labels.description')}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ImportButton
                    onImportFile={handleDescriptionImport}
                    onImported={handleDescriptionImported}
                    onError={handleDescriptionImportError}
                    hasContent={!!description.trim()}
                    disabled={taskImportDisabled}
                    disabledTitle={taskImportDisabledTitle}
                    size="small"
                  />
                  <ExportButton
                    content={description}
                    title={title || 'task-description'}
                    disabled={!description.trim()}
                  />
                </Stack>
              </Stack>
              {initialized ? (
                <React.Suspense fallback={<Box sx={{ minHeight: 10 * 24, border: 1, borderColor: 'divider', borderRadius: 1 }} />}>
                  <MarkdownEditor
                    key={`task-description:${id || 'create'}:${descriptionResetNonce}`}
                    value={description}
                    onChange={(val) => setDescription(val)}
                    placeholder={t('portfolio:workspace.task.description.placeholder')}
                    minRows={10}
                    maxRows={26}
                    focusNonce={descriptionFocusNonce}
                    refreshNonce={descriptionResetNonce}
                  />
                </React.Suspense>
              ) : (
                <Box sx={{ minHeight: 10 * 24, border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Typography color="text.secondary">{t('common:status.loading')}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">{t('portfolio:workspace.task.messages.loading')}</Typography>
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{t('portfolio:workspace.task.messages.notFound')}</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>{t('portfolio:actions.backToTasks')}</Button>
      </Box>
    );
  }

  const isProjectTask = task.related_object_type === 'project';
  const hasConvertedRequest = Boolean(task.converted_request_id);
  const canConvertToRequest = canManage && canCreateRequest;
  const headerRelatedType = (form.related_object_type ?? task.related_object_type) as TaskData['related_object_type'];
  const headerRelatedId = (form.related_object_id ?? task.related_object_id) as string | null;
  const headerRelatedName = (form.related_object_name ?? task.related_object_name ?? '').trim();
  const sidebarProjectWorkspaceLink = (
    headerRelatedType === 'project' && headerRelatedId
      ? buildProjectWorkspacePath(headerRelatedId, 'overview')
      : null
  );
  const projectHeaderChip = (
    headerRelatedType === 'project' && headerRelatedId && headerRelatedName
      ? { id: headerRelatedId, name: headerRelatedName }
      : null
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: headerShadow,
          transition: 'box-shadow 140ms ease',
          zIndex: 2,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={handleBack} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {t('portfolio:actions.backToTasks')}
            </Typography>
            {total > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                ({t('portfolio:workspace.task.navigation.position', { index: index + 1, total })})
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              startIcon={<ShareIcon />}
              onClick={() => setShareDialogOpen(true)}
              size="small"
            >
              {t('portfolio:actions.sendLink')}
            </Button>
            <Button
              onClick={() => setConvertToRequestOpen(true)}
              disabled={!canConvertToRequest || hasConvertedRequest}
              size="small"
              title={
                hasConvertedRequest
                  ? (task.converted_request_item_number
                    ? t('portfolio:workspace.task.actions.alreadyConvertedWithReference', { ref: `REQ-${task.converted_request_item_number}` })
                    : t('portfolio:workspace.task.actions.alreadyConverted'))
                  : (!canCreateRequest ? t('portfolio:workspace.task.actions.convertRequiresPermission') : undefined)
              }
            >
              {t('portfolio:actions.convertToRequest')}
            </Button>
            <IconButton
              aria-label={t('portfolio:actions.previous')}
              title={t('portfolio:actions.previous')}
              onClick={() => confirmAndNavigate(prevId)}
              disabled={!hasPrev}
              size="small"
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label={t('portfolio:actions.next')}
              title={t('portfolio:actions.next')}
              onClick={() => confirmAndNavigate(nextId)}
              disabled={!hasNext}
              size="small"
            >
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
            {canDelete && (
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                size="small"
              >
                {t('common:buttons.delete')}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!dirty || saving || !canManage}
              size="small"
            >
              {saving ? t('common:status.saving') : t('common:buttons.save')}
            </Button>
            <IconButton onClick={handleBack} size="small" title={t('common:buttons.close')}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>

        {/* Title with priority score and chips */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 2 }}>
          {task.related_object_type === 'project' && task.priority_score != null && (
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
                flexShrink: 0,
              }}
              title={t('portfolio:workspace.task.priority.title')}
            >
              {Math.round(task.priority_score)}
            </Box>
          )}
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {task?.item_number && (
                <Chip
                  label={`T-${task.item_number}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                  onClick={() => navigator.clipboard.writeText(`T-${task.item_number}`)}
                  title={t('portfolio:workspace.task.actions.copyReference')}
                />
              )}
              <Box sx={{ ...titleBarSx, flex: 1 }}>
                {canManage ? (
                  <TextField
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                    onKeyDown={(event) => {
                      if (event.key === 'Tab' && !event.shiftKey) {
                        event.preventDefault();
                        setCommentFocusNonce((prev) => prev + 1);
                      }
                    }}
                    variant="standard"
                    fullWidth
                    placeholder={t('portfolio:workspace.task.title.placeholder')}
                    InputProps={{
                      disableUnderline: true,
                      sx: { fontSize: '1.5rem', fontWeight: 600 },
                    }}
                  />
                ) : (
                  <Typography variant="h5" sx={{ fontWeight: 600, py: 0.4 }}>
                    {title || t('portfolio:workspace.task.title.untitled')}
                  </Typography>
                )}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={getTaskStatusLabel(t, (form.status || task.status) as TaskStatus)}
                color={TASK_STATUS_COLORS[(form.status || task.status) as TaskStatus] || 'default'}
                size="small"
              />
              {projectHeaderChip && (
                <Chip
                  label={projectHeaderChip.name}
                  size="small"
                  variant="outlined"
                  onClick={() => navigate(buildProjectWorkspacePath(projectHeaderChip.id, 'activity'))}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  title={t('portfolio:workspace.task.actions.openProjectActivity', { name: projectHeaderChip.name })}
                />
              )}
              <Chip
                label={priorityLabels[form.priority_level || task.priority_level] || getPriorityLabel(t, form.priority_level || task.priority_level)}
                color={PRIORITY_COLORS[form.priority_level || task.priority_level] || 'default'}
                size="small"
                variant="outlined"
              />
              <Button
                size="small"
                startIcon={<AttachFileIcon />}
                onClick={() => setShowUploadArea(!showUploadArea)}
                disabled={!canManage}
                variant={showUploadArea ? 'contained' : 'text'}
              >
                {t('portfolio:workspace.task.actions.attachFiles')}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 1 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <Box
          ref={sidebarRef}
          sx={{
            width: isMobile ? '100%' : sidebarWidth,
            flexShrink: 0,
            borderRight: isMobile ? 0 : 1,
            borderBottom: isMobile ? 1 : 0,
            borderColor: 'divider',
            overflow: 'auto',
            p: 2,
            position: 'relative',
          }}
        >
          {/* Resize handle */}
          {!isMobile && (
            <Box
              onMouseDown={() => setIsResizing(true)}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 4,
                height: '100%',
                cursor: 'col-resize',
                '&:hover': { bgcolor: 'primary.main', opacity: 0.3 },
                ...(isResizing && { bgcolor: 'primary.main', opacity: 0.5 }),
              }}
            />
          )}
          <TaskSidebar
            task={{
              id: task.id,
              status: form.status || task.status,
              task_type_id: (form as any).task_type_id !== undefined ? (form as any).task_type_id : task.task_type_id,
              task_type_name: task.task_type_name,
              priority_level: form.priority_level || task.priority_level,
              start_date: form.start_date !== undefined ? form.start_date : task.start_date,
              due_date: form.due_date !== undefined ? form.due_date : task.due_date,
              assignee_user_id: form.assignee_user_id !== undefined ? form.assignee_user_id : task.assignee_user_id,
              assignee_name: task.assignee_name,
              creator_id: form.creator_id !== undefined ? form.creator_id : task.creator_id,
              creator_name: task.creator_name,
              owner_ids: task.owner_ids || [],
              viewer_ids: form.viewer_ids !== undefined ? form.viewer_ids : (task.viewer_ids || []),
              labels: form.labels || task.labels || [],
              related_object_type: form.related_object_type !== undefined ? form.related_object_type : task.related_object_type,
              related_object_id: form.related_object_id !== undefined ? form.related_object_id : task.related_object_id,
              related_object_name: form.related_object_name !== undefined ? form.related_object_name : task.related_object_name,
              phase_id: form.phase_id !== undefined ? form.phase_id : task.phase_id,
              phase_name: task.phase_name,
              source_id: form.source_id !== undefined ? form.source_id : task.source_id,
              source_name: task.source_name,
              category_id: form.category_id !== undefined ? form.category_id : task.category_id,
              category_name: task.category_name,
              stream_id: form.stream_id !== undefined ? form.stream_id : task.stream_id,
              stream_name: task.stream_name,
              company_id: form.company_id !== undefined ? form.company_id : task.company_id,
              company_name: task.company_name,
            }}
              onChange={handleFieldChange}
              readOnly={!canManage}
              totalTimeHours={totalTimeHours}
              onRelationChange={handleRelationChange}
              projectWorkspaceLink={sidebarProjectWorkspaceLink}
            />
        </Box>

        {/* Main content area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }} onScroll={handleMainContentScroll}>
          {/* Description */}
          <Box sx={{ mb: contentSpacing.sectionLarge }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {t('portfolio:labels.description')}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <ImportButton
                  onImportFile={handleDescriptionImport}
                  onImported={handleDescriptionImported}
                  onError={handleDescriptionImportError}
                  hasContent={!!description.trim()}
                  disabled={taskImportDisabled}
                  disabledTitle={taskImportDisabledTitle}
                  size="small"
                />
                <ExportButton
                  content={description}
                  title={title || task.title || 'task-description'}
                  disabled={!description.trim()}
                />
              </Stack>
            </Stack>
            {initialized ? (
              <React.Suspense fallback={<Box sx={{ minHeight: 10 * 24, border: 1, borderColor: 'divider', borderRadius: 1 }} />}>
                  <MarkdownEditor
                    key={`task-description:${id || 'create'}:${descriptionResetNonce}`}
                    value={description}
                    onChange={(val) => { setDescription(val); setDirty(true); }}
                    placeholder={t('portfolio:workspace.task.description.placeholder')}
                    minRows={10}
                    maxRows={26}
                    disabled={!canManage}
                  onImageUpload={handleUploadImage}
                  onImageUrlImport={handleImportImageUrl}
                  focusNonce={descriptionFocusNonce}
                  refreshNonce={descriptionResetNonce}
                />
              </React.Suspense>
            ) : (
              <Box sx={{ minHeight: 10 * 24, border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                <Typography color="text.secondary">{t('common:status.loading')}</Typography>
              </Box>
            )}
          </Box>

          {/* Attachments */}
          <Box sx={{ mb: contentSpacing.section }}>
            <TaskAttachments
              taskId={task.id}
              attachments={attachments}
              onUpload={handleUploadAttachment}
              onDelete={handleDeleteAttachment}
              canManage={canManage}
              showUploadArea={showUploadArea}
            />
          </Box>

          <Divider sx={{ my: contentSpacing.section }} />

          {/* Activity Section */}
          <TaskActivity
            taskId={task.id}
            projectId={isProjectTask && task.related_object_id ? task.related_object_id : undefined}
            readOnly={!canManage}
            relatedObjectType={task.related_object_type ?? undefined}
            currentStatus={task.status}
            totalTimeHours={totalTimeHours}
            initialStatus={initialStatus}
            commentFocusNonce={commentFocusNonce}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary">
          {t('portfolio:workspace.task.footer.created', { date: formatDate(task.created_at) })}
          {task.updated_at && ` • ${t('portfolio:workspace.task.footer.updated', { date: formatDate(task.updated_at) })}`}
        </Typography>
      </Box>

      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        itemType="task"
        itemId={id}
        itemName={title || t('portfolio:workspace.task.title.untitled')}
        itemNumber={task?.item_number}
      />
      <ConvertToRequestDialog
        open={convertToRequestOpen}
        onClose={() => setConvertToRequestOpen(false)}
        task={{
          id: task.id,
          item_number: task.item_number,
          title: task.title,
          description: task.description,
        }}
        onSuccess={(requestId) => {
          setConvertToRequestOpen(false);
          queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          if (requestId) {
            navigate(`/portfolio/requests/${requestId}/summary`);
            return;
          }
          void refetch();
        }}
      />
    </Box>
  );
}
