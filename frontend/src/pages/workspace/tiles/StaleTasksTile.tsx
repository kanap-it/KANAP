import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../../i18n/useLocale';
import DashboardTile, { TileEmptyState } from './DashboardTile';
import { getDotColor, getPillBg, TASK_STATUS_COLORS } from '../../../utils/statusColors';

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

function formatDate(dateStr: string, loc?: string): string {
  return new Date(dateStr).toLocaleDateString(loc || 'en-US', { month: 'short', day: 'numeric' });
}

export default function StaleTasksTile({ config }: StaleTasksTileProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const locale = useLocale();
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
      title={t('dashboard.tiles.staleTasks')}
      icon="Warning"
      isLoading={isLoading}
      action={(
        <Button size="small" onClick={() => navigate('/portfolio/tasks')}>
          {t('buttons.viewAll')}
        </Button>
      )}
    >
      {items.length === 0 ? (
        <TileEmptyState message={t('dashboard.tiles.noStaleTasks', { scope })} />
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
                      <Box component="span" sx={(theme) => {
                        const muiColor = item.staleDays >= thresholdDays * 2 ? 'error' : 'warning';
                        const textColor = getDotColor(muiColor, theme.palette.mode);
                        const bgColor = getPillBg(muiColor, theme.palette.mode);
                        return { display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25, borderRadius: 9999, fontSize: '0.75rem', fontWeight: 500, color: textColor, bgcolor: bgColor };
                      }}>
                        {t('dashboard.tiles.daysStale', { count: item.staleDays })}
                      </Box>
                      <Box component="span" sx={(theme) => {
                        const muiColor = TASK_STATUS_COLORS[item.status] || 'default';
                        const textColor = getDotColor(muiColor, theme.palette.mode);
                        const bgColor = getPillBg(muiColor, theme.palette.mode);
                        return { display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25, borderRadius: 9999, fontSize: '0.75rem', fontWeight: 500, color: textColor, bgcolor: bgColor };
                      }}>
                        {item.status.replace(/_/g, ' ')}
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.relatedObjectName || t('dashboard.tiles.standaloneTask')} {String.fromCharCode(8226)} {t('dashboard.tiles.updated', { date: formatDate(item.updatedAt, locale) })}
                    </Typography>
                    {scope !== 'my' && item.assigneeName && (
                      <Typography variant="caption" color="text.secondary">
                        {t('dashboard.tiles.assignee', { name: item.assigneeName })}
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
