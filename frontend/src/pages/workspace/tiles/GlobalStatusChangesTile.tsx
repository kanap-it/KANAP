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

interface ProjectStatusChangeItem {
  id: string;
  projectId: string;
  projectName: string;
  previousStatus: string | null;
  nextStatus: string | null;
  authorName: string;
  createdAt: string;
}

interface GlobalStatusChangesTileProps {
  config: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  waiting_list: 'default',
  planned: 'info',
  in_progress: 'primary',
  in_testing: 'secondary',
  on_hold: 'warning',
  done: 'success',
  cancelled: 'error',
};

function formatStatus(status: string | null): string {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GlobalStatusChangesTile({ config }: GlobalStatusChangesTileProps) {
  const navigate = useNavigate();
  const days = Math.max(1, Math.min((config.days as number) || 5, 14));

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'project-status-changes', days],
    queryFn: async () => {
      const res = await api.get<ProjectStatusChangeItem[]>('/dashboard/project-status-changes', {
        params: { days, limit: 5 },
      });
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const items = data || [];

  return (
    <DashboardTile
      title={`Project Status Changes (${days}d)`}
      icon="SwapHoriz"
      isLoading={isLoading}
      action={(
        <Button size="small" onClick={() => navigate('/portfolio/projects')}>
          View All
        </Button>
      )}
    >
      {items.length === 0 ? (
        <TileEmptyState message="No recent project status changes" />
      ) : (
        <List dense disablePadding>
          {items.map((item) => (
            <ListItemButton
              key={item.id}
              onClick={() => navigate(`/portfolio/projects/${item.projectId}/activity`)}
              sx={{ py: 0.5, alignItems: 'flex-start' }}
            >
              <ListItemText
                primary={item.projectName}
                secondary={(
                  <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip
                        label={formatStatus(item.previousStatus)}
                        size="small"
                        color={STATUS_COLORS[item.previousStatus || ''] || 'default'}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        to
                      </Typography>
                      <Chip
                        label={formatStatus(item.nextStatus)}
                        size="small"
                        color={STATUS_COLORS[item.nextStatus || ''] || 'default'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.authorName} on {formatDate(item.createdAt)}
                    </Typography>
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
