import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import { useRecentKnowledgeDocuments } from '../hooks/useRecentKnowledgeDocuments';
import DashboardTile, { TileEmptyState } from './DashboardTile';

interface KnowledgeReviewItem {
  id: string;
  itemNumber: number;
  title: string;
  status: string;
  stage: 'reviewer' | 'approver';
  requestedAt: string;
  requestedByName: string | null;
}

interface KnowledgeOverviewTileProps {
  config: Record<string, unknown>;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function KnowledgeOverviewTile({ config: _config }: KnowledgeOverviewTileProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { items: recentDocuments } = useRecentKnowledgeDocuments();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'knowledge-review-items'],
    queryFn: async () => {
      const res = await api.get<KnowledgeReviewItem[]>('/dashboard/knowledge-review-items', {
        params: { limit: 5 },
      });
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const reviewItems = data || [];

  return (
    <DashboardTile
      title={t('dashboard.tiles.knowledge')}
      icon="Description"
      isLoading={isLoading}
      action={(
        <Button size="small" onClick={() => navigate('/knowledge')}>
          {t('buttons.open')}
        </Button>
      )}
    >
      {reviewItems.length === 0 && recentDocuments.length === 0 ? (
        <TileEmptyState message={t('dashboard.tiles.noReviewOrRecent')} />
      ) : (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ px: 2 }}>
            {t('dashboard.tiles.toReview')}
          </Typography>
          {reviewItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 2 }}>
              {t('dashboard.tiles.noActiveReviews')}
            </Typography>
          ) : (
            <List dense disablePadding>
              {reviewItems.map((item) => (
                <ListItemButton
                  key={item.id}
                  onClick={() => navigate(`/knowledge/${item.id}`)}
                  sx={{ py: 0.5, alignItems: 'flex-start' }}
                >
                  <ListItemText
                    primary={`DOC-${item.itemNumber} - ${item.title}`}
                    secondary={(
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Chip
                            label={item.stage === 'approver' ? t('dashboard.tiles.approval') : t('dashboard.tiles.review')}
                            size="small"
                            color={item.stage === 'approver' ? 'secondary' : 'warning'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.tiles.requestedAgo', { time: formatTime(item.requestedAt) })}
                          </Typography>
                        </Box>
                        {item.requestedByName && (
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.tiles.requestedBy', { name: item.requestedByName })}
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

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ px: 2 }}>
            {t('dashboard.tiles.last5Accessed')}
          </Typography>
          {recentDocuments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 2 }}>
              {t('dashboard.tiles.noRecentDocuments')}
            </Typography>
          ) : (
            <List dense disablePadding>
              {recentDocuments.slice(0, 5).map((item) => (
                <ListItemButton
                  key={item.id}
                  onClick={() => navigate(`/knowledge/${item.id}`)}
                  sx={{ py: 0.5 }}
                >
                  <ListItemText
                    primary={item.label}
                    secondary={(
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(new Date(item.viewedAt).toISOString())}
                      </Typography>
                    )}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      )}
    </DashboardTile>
  );
}
