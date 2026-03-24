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
import { useTranslation } from 'react-i18next';
import DashboardTile, { TileEmptyState } from './DashboardTile';

interface TeamActivityItem {
  id: string;
  projectId: string;
  projectName: string;
  type: 'change' | 'comment' | 'decision';
  content: string | null;
  authorName: string;
  createdAt: string;
  changedFields: Record<string, [unknown, unknown]> | null;
}

interface TeamActivityTileProps {
  config: Record<string, unknown>;
}

function formatTime(dateStr: string): string {
  const value = new Date(dateStr);
  const diffMs = Date.now() - value.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildSummary(item: TeamActivityItem): string {
  if (item.type === 'comment') return `${item.authorName} added a comment`;
  if (item.type === 'decision') return `${item.authorName} recorded a decision`;
  if (item.changedFields?.status) return `${item.authorName} changed the project status`;
  if (item.changedFields?.task_created) return `${item.authorName} created a project task`;
  if (item.changedFields?.execution_progress) return `${item.authorName} updated execution progress`;
  if (item.changedFields?.phase_id) return `${item.authorName} updated the project phase`;
  return `${item.authorName} updated the project`;
}

export default function TeamActivityTile({ config }: TeamActivityTileProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const limit = Math.min((config.limit as number) || 5, 5);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'team-activity', limit],
    queryFn: async () => {
      const res = await api.get<TeamActivityItem[]>('/dashboard/team-activity', {
        params: { limit },
      });
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const items = data || [];

  return (
    <DashboardTile
      title={t('dashboard.tiles.teamActivity')}
      icon="Update"
      isLoading={isLoading}
      action={(
        <Button size="small" onClick={() => navigate('/portfolio/projects')}>
          {t('buttons.viewAll')}
        </Button>
      )}
    >
      {items.length === 0 ? (
        <TileEmptyState message={t('dashboard.tiles.noRecentTeamActivity')} />
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={item.type === 'comment' ? t('dashboard.tiles.comment') : item.type === 'decision' ? t('dashboard.tiles.decision') : t('dashboard.tiles.change')}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(item.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {buildSummary(item)}
                    </Typography>
                    {item.type === 'comment' && item.content && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {item.content.replace(/\s+/g, ' ').trim()}
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
