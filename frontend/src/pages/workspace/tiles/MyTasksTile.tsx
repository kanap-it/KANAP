import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Typography,
  Box,
  Divider,
  Button,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import DashboardTile, { TileEmptyState } from './DashboardTile';
import { ACTIVE_TASK_STATUSES } from '../../tasks/task.constants';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  priority_level: string;
  related_object_type: string | null;
  related_object_id: string | null;
  project_name?: string;
}

interface MyTasksTileProps {
  config: Record<string, unknown>;
}

function getPriorityColor(level: string): 'error' | 'warning' | 'default' | 'info' {
  switch (level) {
    case 'blocker':
      return 'error';
    case 'high':
      return 'warning';
    case 'low':
    case 'optional':
      return 'info';
    default:
      return 'default';
  }
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function isDueThisWeek(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  return due >= now && due <= weekFromNow;
}

export default function MyTasksTile({ config }: MyTasksTileProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const limit = (config.limit as number) || 5;
  const showOverdue = config.showOverdue !== false;

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'my-tasks', profile?.id, limit],
    queryFn: async () => {
      const res = await api.get('/tasks', {
        params: {
          assigneeUserId: profile?.id,
          limit: limit * 3, // Fetch more to allow grouping
          sort: 'due_date:ASC',
          include: 'project',
          filters: JSON.stringify({
            status: { filterType: 'set', values: ACTIVE_TASK_STATUSES },
          }),
        },
      });
      return res.data.items as Task[];
    },
    enabled: !!profile?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  const tasks = data || [];

  // Group tasks
  const overdueTasks = showOverdue ? tasks.filter((t) => isOverdue(t.due_date)).slice(0, limit) : [];
  const dueThisWeek = tasks.filter((t) => !isOverdue(t.due_date) && isDueThisWeek(t.due_date)).slice(0, limit);
  const laterTasks = tasks.filter((t) => !isOverdue(t.due_date) && !isDueThisWeek(t.due_date)).slice(0, limit);

  const formatDueDate = (date: string | null) => {
    if (!date) return 'No due date';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderTaskList = (items: Task[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1, pl: 2 }}>
          {emptyMessage}
        </Typography>
      );
    }
    return (
      <List dense disablePadding>
        {items.map((task) => (
          <ListItemButton
            key={task.id}
            onClick={() => navigate(`/portfolio/tasks/${task.id}`)}
            sx={{ py: 0.5 }}
          >
            <ListItemText
              primary={task.title}
              secondary={
                <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {task.project_name && (
                    <Typography variant="caption" color="text.secondary">
                      {task.project_name}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {formatDueDate(task.due_date)}
                  </Typography>
                </Box>
              }
              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
              secondaryTypographyProps={{ component: 'div' }}
            />
            {task.priority_level !== 'normal' && (
              <Chip
                label={task.priority_level}
                size="small"
                color={getPriorityColor(task.priority_level)}
                sx={{ ml: 1 }}
              />
            )}
          </ListItemButton>
        ))}
      </List>
    );
  };

  return (
    <DashboardTile
      title="My Tasks"
      icon="Task"
      isLoading={isLoading}
      action={
        <Button size="small" onClick={() => navigate('/portfolio/tasks')}>
          View All
        </Button>
      }
    >
      {tasks.length === 0 ? (
        <TileEmptyState
          message="No tasks assigned to you"
          action={
            <Button size="small" onClick={() => navigate('/portfolio/tasks')}>
              Browse Tasks
            </Button>
          }
        />
      ) : (
        <Box>
          {showOverdue && overdueTasks.length > 0 && (
            <>
              <Typography variant="caption" color="error" fontWeight={600} sx={{ pl: 2 }}>
                Overdue
              </Typography>
              {renderTaskList(overdueTasks, '')}
              <Divider sx={{ my: 1 }} />
            </>
          )}
          {dueThisWeek.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ pl: 2 }}>
                Due This Week
              </Typography>
              {renderTaskList(dueThisWeek, '')}
              {laterTasks.length > 0 && <Divider sx={{ my: 1 }} />}
            </>
          )}
          {laterTasks.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ pl: 2 }}>
                Later
              </Typography>
              {renderTaskList(laterTasks, '')}
            </>
          )}
        </Box>
      )}
    </DashboardTile>
  );
}
