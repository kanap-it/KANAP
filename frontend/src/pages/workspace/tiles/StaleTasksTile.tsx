import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api';
import DashboardTile, { TileEmptyState } from './DashboardTile';

interface StaleTaskItem {
  id: string;
  itemNumber: number;
  title: string;
  status: string;
  updatedAt: string;
  staleDays: number;
  assigneeName: string | null;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  relatedObjectName: string | null;
}

interface StaleTasksTileProps {
  config: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  open: 'default',
  in_progress: 'primary',
  pending: 'warning',
  in_testing: 'secondary',
  done: 'success',
  cancelled: 'error',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function StaleTasksTile({ config }: StaleTasksTileProps) {
  const navigate = useNavigate();
  const scope = config.scope === 'team' || config.scope === 'all' ? config.scope : 'my';
  const thresholdDays = Math.max(30, Math.min((config.thresholdDays as number) || 90, 365));

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'stale-tasks', scope, thresholdDays],
    queryFn: async () => {
      const res = await api.get<StaleTaskItem[]>('/dashboard/stale-tasks', {
        params: {
          scope,
          thresholdDays,
          limit: 5,
        },
      });
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const items = data || [];

  return (
    <DashboardTile
      title="Stale Tasks"
      icon="Warning"
      isLoading={isLoading}
      action={(
        <Button size="small" onClick={() => navigate('/portfolio/tasks')}>
          View All
        </Button>
      )}
    >
      {items.length === 0 ? (
        <TileEmptyState message={`No stale tasks in ${scope} scope`} />
      ) : (
        <List dense disablePadding>
          {items.map((item) => (
            <ListItemButton
              key={item.id}
              onClick={() => navigate(`/portfolio/tasks/${item.id}`)}
              sx={{ py: 0.5, alignItems: 'flex-start' }}
            >
              <ListItemText
                primary={item.title}
                secondary={(
                  <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip
                        label={`${item.staleDays}d stale`}
                        size="small"
                        color={item.staleDays >= thresholdDays * 2 ? 'error' : 'warning'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={item.status.replace(/_/g, ' ')}
                        size="small"
                        color={STATUS_COLORS[item.status] || 'default'}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.relatedObjectName || 'Standalone task'} • Updated {formatDate(item.updatedAt)}
                    </Typography>
                    {scope !== 'my' && item.assigneeName && (
                      <Typography variant="caption" color="text.secondary">
                        Assignee: {item.assigneeName}
                      </Typography>
                    )}
                  </Box>
                )}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500, noWrap: true }}
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </DashboardTile>
  );
}
