import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../pages/tasks/task.constants';
import type { TaskStatus } from '../pages/tasks/task.constants';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  start_date: string | null;
  priority_level: string;
  assignee_user_id: string | null;
  phase_id: string | null;
};

export type EntityType = 'project' | 'spend_item' | 'capex_item' | 'contract';

type Props = {
  entityType: EntityType;
  entityId: string;
  phases?: Array<{ id: string; name: string }>; // Only used for projects
  disabled?: boolean;
};

const STATUS_LABELS = TASK_STATUS_LABELS as Record<string, string>;
const STATUS_COLORS = TASK_STATUS_COLORS as Record<string, 'default' | 'warning' | 'info' | 'secondary' | 'success' | 'error'>;

const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'default' | 'info' | 'success'> = {
  blocker: 'error',
  high: 'warning',
  normal: 'default',
  low: 'info',
  optional: 'success',
};

const PRIORITY_LABELS: Record<string, string> = {
  blocker: 'Blocker',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
  optional: 'Optional',
};

// API endpoint for fetching tasks by entity type
const ENDPOINTS: Record<EntityType, (id: string) => string> = {
  project: (id) => `/portfolio/projects/${id}/tasks`,
  spend_item: (id) => `/spend-items/${id}/tasks`,
  capex_item: (id) => `/capex-items/${id}/tasks`,
  contract: (id) => `/contracts/${id}/tasks`,
};

// URL param name for task creation navigation
const PARAM_NAMES: Record<EntityType, string> = {
  project: 'projectId',
  spend_item: 'spendItemId',
  capex_item: 'capexItemId',
  contract: 'contractId',
};

export default function EntityTasksPanel({ entityType, entityId, phases = [], disabled = false }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation(['portfolio', 'common', 'errors']);
  const isProject = entityType === 'project';
  const projectWorkspaceContextQuery = React.useMemo(() => {
    if (!isProject) return '';

    const current = new URLSearchParams(location.search);
    const sp = new URLSearchParams();
    const sort = current.get('sort');
    const q = current.get('q');
    const filters = current.get('filters');
    const projectScope = current.get('projectScope');
    const involvedUserId = current.get('involvedUserId');
    const involvedTeamId = current.get('involvedTeamId');
    const tabMatch = location.pathname.match(/^\/portfolio\/projects\/[^/]+\/([^/?#]+)/);
    const projectTab = tabMatch?.[1] || 'tasks';

    if (sort) sp.set('projectSort', sort);
    if (q) sp.set('projectQ', q);
    if (filters) sp.set('projectFilters', filters);
    if (projectScope) sp.set('projectScope', projectScope);
    if (involvedUserId) sp.set('projectInvolvedUserId', involvedUserId);
    if (involvedTeamId) sp.set('projectInvolvedTeamId', involvedTeamId);
    if (projectTab) sp.set('projectTab', projectTab);
    return sp.toString();
  }, [isProject, location.pathname, location.search]);
  const taskWorkspaceContextQuery = React.useMemo(() => {
    if (!isProject) return '';
    const sp = new URLSearchParams();
    sp.set('projectId', entityId);
    if (projectWorkspaceContextQuery) {
      const ctx = new URLSearchParams(projectWorkspaceContextQuery);
      ctx.forEach((value, key) => sp.set(key, value));
    }
    return sp.toString();
  }, [isProject, entityId, projectWorkspaceContextQuery]);
  const buildTaskWorkspacePath = React.useCallback(
    (taskId: string) => `/portfolio/tasks/${taskId}${taskWorkspaceContextQuery ? `?${taskWorkspaceContextQuery}` : ''}`,
    [taskWorkspaceContextQuery],
  );

  // Filter state
  const [filterStatus, setFilterStatus] = React.useState<string>('active');
  const [filterPhase, setFilterPhase] = React.useState<string>('all');
  const [showFilters, setShowFilters] = React.useState(false);

  const handleCreateTask = (phaseId?: string) => {
    const params = new URLSearchParams();
    params.set(PARAM_NAMES[entityType], entityId);
    if (phaseId && isProject) {
      params.set('phaseId', phaseId);
    }
    if (isProject && projectWorkspaceContextQuery) {
      const ctx = new URLSearchParams(projectWorkspaceContextQuery);
      ctx.forEach((value, key) => params.set(key, value));
    }
    navigate(`/portfolio/tasks/new/overview?${params.toString()}`);
  };

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: [`${entityType}-tasks`, entityId],
    queryFn: async () => {
      const res = await api.get<Task[]>(ENDPOINTS[entityType](entityId));
      return res.data;
    },
    enabled: !!entityId,
  });

  const handleDelete = async (taskId: string) => {
    if (!window.confirm(t('portfolio:shared.entityTasksPanel.messages.confirmDelete'))) return;
    try {
      await api.delete(`/tasks/bulk`, { data: { ids: [taskId] } });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (e: any) {
      alert(getApiErrorMessage(e, t, t('portfolio:shared.entityTasksPanel.messages.deleteFailed')));
    }
  };

  const getPhaseLabel = (phaseId: string | null) => {
    if (!phaseId) return t('portfolio:shared.entityTasksPanel.phase.projectLevel');
    const phase = phases.find(p => p.id === phaseId);
    return phase?.name || t('portfolio:shared.entityTasksPanel.phase.unknown');
  };

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (filterStatus === 'active') {
        if (task.status === 'done' || task.status === 'cancelled') return false;
      } else if (filterStatus !== 'all') {
        if (task.status !== filterStatus) return false;
      }

      // Phase filter (only for projects)
      if (isProject) {
        if (filterPhase === 'project-level') {
          if (task.phase_id !== null) return false;
        } else if (filterPhase !== 'all') {
          if (task.phase_id !== filterPhase) return false;
        }
      }

      return true;
    });
  }, [tasks, filterStatus, filterPhase, isProject]);

  const hasActiveFilters = filterStatus !== 'active' || (isProject && filterPhase !== 'all');

  const clearFilters = () => {
    setFilterStatus('active');
    setFilterPhase('all');
  };

  const title = filteredTasks.length !== tasks.length
    ? t('portfolio:shared.entityTasksPanel.titleFiltered', { count: filteredTasks.length, total: tasks.length })
    : t('portfolio:shared.entityTasksPanel.title', { count: filteredTasks.length });

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowFilters(!showFilters)}
            color={hasActiveFilters ? 'primary' : 'default'}
            title={t('portfolio:shared.entityTasksPanel.toggleFilters')}
          >
            <FilterListIcon fontSize="small" />
          </IconButton>
          {hasActiveFilters && (
            <IconButton size="small" onClick={clearFilters} title={t('portfolio:shared.entityTasksPanel.clearFilters')}>
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
        {!disabled && (
          <Button startIcon={<AddIcon />} size="small" onClick={() => handleCreateTask()}>
            {t('portfolio:shared.entityTasksPanel.addTask')}
          </Button>
        )}
      </Stack>

      {showFilters && (
        <Stack direction="row" spacing={2} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>{t('portfolio:shared.entityTasksPanel.filters.status')}</InputLabel>
            <Select
              value={filterStatus}
              label={t('portfolio:shared.entityTasksPanel.filters.status')}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">{t('portfolio:shared.entityTasksPanel.filters.all')}</MenuItem>
              <MenuItem value="active">{t('portfolio:shared.entityTasksPanel.filters.activeNotDone')}</MenuItem>
              <MenuItem value="open">{t('portfolio:statuses.task.open')}</MenuItem>
              <MenuItem value="in_progress">{t('portfolio:statuses.task.in_progress')}</MenuItem>
              <MenuItem value="pending">{t('portfolio:statuses.task.pending')}</MenuItem>
              <MenuItem value="in_testing">{t('portfolio:statuses.task.in_testing')}</MenuItem>
              <MenuItem value="done">{t('portfolio:statuses.task.done')}</MenuItem>
              <MenuItem value="cancelled">{t('portfolio:statuses.task.cancelled')}</MenuItem>
            </Select>
          </FormControl>
          {isProject && phases.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{t('portfolio:shared.entityTasksPanel.filters.phase')}</InputLabel>
              <Select
                value={filterPhase}
                label={t('portfolio:shared.entityTasksPanel.filters.phase')}
                onChange={(e) => setFilterPhase(e.target.value)}
              >
                <MenuItem value="all">{t('portfolio:shared.entityTasksPanel.filters.allPhases')}</MenuItem>
                <MenuItem value="project-level">{t('portfolio:shared.entityTasksPanel.filters.projectLevel')}</MenuItem>
                {phases.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      )}

      {isLoading && <Typography color="text.secondary">{t('portfolio:shared.entityTasksPanel.states.loading')}</Typography>}

      {!isLoading && tasks.length === 0 && (
        <Typography color="text.secondary">{t('portfolio:shared.entityTasksPanel.states.empty')}</Typography>
      )}

      {!isLoading && tasks.length > 0 && filteredTasks.length === 0 && (
        <Typography color="text.secondary">{t('portfolio:shared.entityTasksPanel.states.noMatches')}</Typography>
      )}

      {filteredTasks.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('portfolio:shared.entityTasksPanel.table.title')}</TableCell>
              <TableCell>{t('portfolio:shared.entityTasksPanel.table.status')}</TableCell>
              <TableCell>{t('portfolio:shared.entityTasksPanel.table.priority')}</TableCell>
              {isProject && <TableCell>{t('portfolio:shared.entityTasksPanel.table.phase')}</TableCell>}
              <TableCell>{t('portfolio:shared.entityTasksPanel.table.dueDate')}</TableCell>
              <TableCell align="right">{t('portfolio:shared.entityTasksPanel.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task.id} hover>
                <TableCell>
                  <Typography
                    variant="body2"
                    component="a"
                    onClick={() => navigate(buildTaskWorkspacePath(task.id))}
                    sx={{
                      cursor: 'pointer',
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {task.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={t(`portfolio:statuses.task.${task.status}`, { defaultValue: STATUS_LABELS[task.status] || task.status })}
                    color={STATUS_COLORS[task.status] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={t(`portfolio:priority.${task.priority_level}`, { defaultValue: PRIORITY_LABELS[task.priority_level] || task.priority_level })}
                    color={PRIORITY_COLORS[task.priority_level] || 'default'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                {isProject && (
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {getPhaseLabel(task.phase_id)}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString(i18n.language) : '-'}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    title={t('portfolio:shared.entityTasksPanel.actions.openTask')}
                    onClick={() => navigate(buildTaskWorkspacePath(task.id))}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                  {!disabled && (
                    <IconButton
                      size="small"
                      title={t('portfolio:shared.entityTasksPanel.actions.deleteTask')}
                      onClick={() => handleDelete(task.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
