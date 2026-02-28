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
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../pages/tasks/task.constants';
import type { TaskStatus } from '../pages/tasks/task.constants';

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
  const queryClient = useQueryClient();
  const isProject = entityType === 'project';
  const taskWorkspaceContextQuery = React.useMemo(() => {
    if (!isProject) return '';
    const sp = new URLSearchParams();
    sp.set('projectId', entityId);
    return sp.toString();
  }, [isProject, entityId]);
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
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/bulk`, { data: { ids: [taskId] } });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete task');
    }
  };

  const getPhaseLabel = (phaseId: string | null) => {
    if (!phaseId) return 'Project-level';
    const phase = phases.find(p => p.id === phaseId);
    return phase?.name || 'Unknown Phase';
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

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Tasks ({filteredTasks.length}{filteredTasks.length !== tasks.length ? ` / ${tasks.length}` : ''})
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowFilters(!showFilters)}
            color={hasActiveFilters ? 'primary' : 'default'}
            title="Toggle filters"
          >
            <FilterListIcon fontSize="small" />
          </IconButton>
          {hasActiveFilters && (
            <IconButton size="small" onClick={clearFilters} title="Clear filters">
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
        {!disabled && (
          <Button startIcon={<AddIcon />} size="small" onClick={() => handleCreateTask()}>
            Add Task
          </Button>
        )}
      </Stack>

      {showFilters && (
        <Stack direction="row" spacing={2} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active (not done)</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_testing">In Testing</MenuItem>
              <MenuItem value="done">Done</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          {isProject && phases.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Phase</InputLabel>
              <Select
                value={filterPhase}
                label="Phase"
                onChange={(e) => setFilterPhase(e.target.value)}
              >
                <MenuItem value="all">All Phases</MenuItem>
                <MenuItem value="project-level">Project-level</MenuItem>
                {phases.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      )}

      {isLoading && <Typography color="text.secondary">Loading tasks...</Typography>}

      {!isLoading && tasks.length === 0 && (
        <Typography color="text.secondary">No tasks yet.</Typography>
      )}

      {!isLoading && tasks.length > 0 && filteredTasks.length === 0 && (
        <Typography color="text.secondary">No tasks match the current filters.</Typography>
      )}

      {filteredTasks.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              {isProject && <TableCell>Phase</TableCell>}
              <TableCell>Due Date</TableCell>
              <TableCell align="right">Actions</TableCell>
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
                    label={STATUS_LABELS[task.status] || task.status}
                    color={STATUS_COLORS[task.status] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={task.priority_level}
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
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB') : '-'}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    title="Open task"
                    onClick={() => navigate(buildTaskWorkspacePath(task.id))}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                  {!disabled && (
                    <IconButton
                      size="small"
                      title="Delete task"
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
