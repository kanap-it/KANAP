import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../../i18n/useLocale';
import DashboardTile, { TileEmptyState } from './DashboardTile';

interface MyLeadershipProject {
  id: string;
  name: string;
  status: string;
  role: 'it_lead' | 'business_lead' | 'it_sponsor' | 'business_sponsor';
  planned_end: string | null;
  next_milestone: {
    id: string;
    name: string;
    target_date: string | null;
  } | null;
}

interface ProjectsILeadTileProps {
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

export default function ProjectsILeadTile({ config }: ProjectsILeadTileProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const locale = useLocale();
  const limit = Math.min((config.limit as number) || 5, 5);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'my-leadership-projects', limit],
    queryFn: async () => {
      const res = await api.get<MyLeadershipProject[]>('/dashboard/my-leadership-projects', {
        params: { limit },
      });
      return res.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const projects = data || [];

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardTile
      title={t('dashboard.tiles.projectsILead')}
      icon="Leaderboard"
      isLoading={isLoading}
      action={
        <Button size="small" onClick={() => navigate('/portfolio/projects')}>
          {t('buttons.viewAll')}
        </Button>
      }
    >
      {projects.length === 0 ? (
        <TileEmptyState
          message={t('dashboard.tiles.notLeading')}
          action={
            <Button size="small" onClick={() => navigate('/portfolio/projects')}>
              {t('dashboard.tiles.browseProjects')}
            </Button>
          }
        />
      ) : (
        <List dense disablePadding>
          {projects.map((project) => (
            <ListItemButton
              key={project.id}
              onClick={() => navigate(`/portfolio/projects/${project.id}`)}
              sx={{ py: 0.5, alignItems: 'flex-start' }}
            >
              <ListItemText
                primary={project.name}
                secondary={
                  <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={({'it_lead': t('dashboard.tiles.itLead'), 'business_lead': t('dashboard.tiles.businessLead'), 'it_sponsor': t('dashboard.tiles.itSponsor'), 'business_sponsor': t('dashboard.tiles.businessSponsor')} as Record<string, string>)[project.role] || project.role}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={project.status.replace('_', ' ')}
                        size="small"
                        color={STATUS_COLORS[project.status] || 'default'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                    {project.next_milestone && (
                      <Typography variant="caption" color="text.secondary">
                        {project.next_milestone.target_date
                          ? t('dashboard.tiles.nextMilestoneWithDate', { name: project.next_milestone.name, date: formatDate(project.next_milestone.target_date) })
                          : t('dashboard.tiles.nextMilestone', { name: project.next_milestone.name })
                        }{project.next_milestone.target_date && false && (
                          <></>
                        )}
                      </Typography>
                    )}
                  </Box>
                }
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </DashboardTile>
  );
}
