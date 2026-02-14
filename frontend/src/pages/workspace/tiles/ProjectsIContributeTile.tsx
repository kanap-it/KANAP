import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Typography,
  Box,
  Button,
  Badge,
} from '@mui/material';
import TaskIcon from '@mui/icons-material/Task';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api';
import DashboardTile, { TileEmptyState } from './DashboardTile';

interface MyContributionProject {
  id: string;
  name: string;
  status: string;
  team: 'it_team' | 'business_team';
  my_tasks_count: number;
}

interface ProjectsIContributeTileProps {
  config: Record<string, unknown>;
}

const TEAM_LABELS: Record<string, string> = {
  it_team: 'IT Team',
  business_team: 'Business Team',
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  waiting_list: 'default',
  planned: 'info',
  in_progress: 'primary',
  in_testing: 'secondary',
  on_hold: 'warning',
  done: 'success',
  cancelled: 'error',
};

export default function ProjectsIContributeTile({ config }: ProjectsIContributeTileProps) {
  const navigate = useNavigate();
  const limit = (config.limit as number) || 5;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'my-contribution-projects', limit],
    queryFn: async () => {
      const res = await api.get<MyContributionProject[]>('/dashboard/my-contribution-projects', {
        params: { limit },
      });
      return res.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const projects = data || [];

  return (
    <DashboardTile
      title="Projects I Contribute To"
      icon="Groups"
      isLoading={isLoading}
      action={
        <Button size="small" onClick={() => navigate('/portfolio/projects')}>
          View All
        </Button>
      }
    >
      {projects.length === 0 ? (
        <TileEmptyState
          message="You're not a team member on any projects"
          action={
            <Button size="small" onClick={() => navigate('/portfolio/projects')}>
              Browse Projects
            </Button>
          }
        />
      ) : (
        <List dense disablePadding>
          {projects.map((project) => (
            <ListItemButton
              key={project.id}
              onClick={() => navigate(`/portfolio/projects/${project.id}`)}
              sx={{ py: 0.5 }}
            >
              <ListItemText
                primary={project.name}
                secondary={
                  <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={TEAM_LABELS[project.team] || project.team}
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
                }
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ component: 'div' }}
              />
              {project.my_tasks_count > 0 && (
                <Badge badgeContent={project.my_tasks_count} color="primary" sx={{ ml: 1 }}>
                  <TaskIcon fontSize="small" color="action" />
                </Badge>
              )}
            </ListItemButton>
          ))}
        </List>
      )}
    </DashboardTile>
  );
}
