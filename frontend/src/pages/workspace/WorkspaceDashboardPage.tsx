import { useState, useMemo, Suspense, lazy } from 'react';
import {
  Box,
  Grid,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Skeleton,
  Card,
  Paper,
  Typography,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import AddTaskIcon from '@mui/icons-material/AddTask';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InboxIcon from '@mui/icons-material/Inbox';
import DnsIcon from '@mui/icons-material/Dns';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useDashboardConfig } from './hooks/useDashboardConfig';
import { useTilePermissions } from './hooks/useTilePermissions';
import { TILE_REGISTRY, TILE_LOADERS } from './tiles/TileRegistry';
import DashboardTile from './tiles/DashboardTile';
import DashboardSettingsModal from './settings/DashboardSettingsModal';
import QuickLogTimeModal from './actions/QuickLogTimeModal';

// Create lazy-loaded tile components
const tileComponents: Record<string, ReturnType<typeof lazy>> = {};
Object.entries(TILE_LOADERS).forEach(([id, loader]) => {
  tileComponents[id] = lazy(async () => {
    const component = await loader();
    return { default: component };
  });
});

function TileLoader() {
  return (
    <Card sx={{ height: '100%', p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} />
    </Card>
  );
}

export default function WorkspaceDashboardPage() {
  const navigate = useNavigate();
  const { hasLevel, profile } = useAuth();
  const { config, isLoading: configLoading } = useDashboardConfig();
  const { filterVisibleTiles, canViewTile } = useTilePermissions();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);

  // Quick actions visibility
  const canCreateTask = hasLevel('tasks', 'member');
  const canLogTime = hasLevel('portfolio_projects', 'member') || hasLevel('tasks', 'member');
  const canCreateRequest = hasLevel('portfolio_requests', 'member');
  const canCreateAsset = hasLevel('infrastructure', 'member');
  const canCreateApp = hasLevel('applications', 'member');

  // Filter tiles by permission AND enabled status
  const visibleTiles = useMemo(() => {
    return filterVisibleTiles(config.tiles)
      .filter((t) => t.enabled)
      .sort((a, b) => a.order - b.order);
  }, [config.tiles, filterVisibleTiles]);

  const userName = profile?.first_name || 'there';

  return (
    <Box sx={{ p: 3 }}>
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 2,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(25,34,49,0.95) 0%, rgba(34,47,66,0.92) 100%)'
            : 'linear-gradient(135deg, #f7f9fc 0%, #eef3fa 100%)',
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
            Welcome back, {userName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Here's an overview of your work
          </Typography>
        </Box>

        {/* Quick Actions */}
        <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
          {canCreateTask && (
            <Button
              variant="outlined"
              startIcon={<AddTaskIcon />}
              onClick={() => navigate('/portfolio/tasks/new/overview')}
              size="small"
            >
              Create Task
            </Button>
          )}
          {canLogTime && (
            <Button
              variant="outlined"
              startIcon={<AccessTimeIcon />}
              onClick={() => setLogTimeOpen(true)}
              size="small"
            >
              Log Time
            </Button>
          )}
          {canCreateRequest && (
            <Button
              variant="outlined"
              startIcon={<InboxIcon />}
              onClick={() => navigate('/portfolio/requests/new/overview')}
              size="small"
            >
              New Request
            </Button>
          )}
          {canCreateApp && (
            <Button
              variant="outlined"
              startIcon={<WorkOutlineIcon />}
              onClick={() => navigate('/it/applications/new/overview')}
              size="small"
            >
              New Application
            </Button>
          )}
          {canCreateAsset && (
            <Button
              variant="outlined"
              startIcon={<DnsIcon />}
              onClick={() => navigate('/it/assets/new/overview')}
              size="small"
            >
              New Asset
            </Button>
          )}
          <Box flex={1} />
          <Tooltip title="Dashboard Settings">
            <IconButton onClick={() => setSettingsOpen(true)} size="small">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Tile Grid */}
      {configLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <TileLoader />
            </Grid>
          ))}
        </Grid>
      ) : visibleTiles.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No tiles enabled. Click the settings icon to configure your dashboard.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {visibleTiles.map((tile) => {
            const TileComponent = tileComponents[tile.id];
            const tileInfo = TILE_REGISTRY[tile.id];

            if (!TileComponent || !tileInfo) return null;

            return (
              <Grid item xs={12} md={6} lg={4} key={tile.id}>
                <Suspense
                  fallback={
                    <DashboardTile
                      title={tileInfo.title}
                      icon={tileInfo.icon}
                      isLoading
                    >
                      <div />
                    </DashboardTile>
                  }
                >
                  <TileComponent config={tile.config} />
                </Suspense>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Modals */}
      <DashboardSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        canViewTile={canViewTile}
      />
      <QuickLogTimeModal open={logTimeOpen} onClose={() => setLogTimeOpen(false)} />
    </Box>
  );
}
