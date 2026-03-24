import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import TaskIcon from '@mui/icons-material/Task';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InboxIcon from '@mui/icons-material/Inbox';
import UpdateIcon from '@mui/icons-material/Update';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';
import { useTranslation } from 'react-i18next';
import { useDashboardConfig, DashboardTileConfig } from '../hooks/useDashboardConfig';
import { TILE_REGISTRY } from '../tiles/TileRegistry';

const ICON_MAP: Record<string, typeof TaskIcon> = {
  Task: TaskIcon,
  Leaderboard: LeaderboardIcon,
  Groups: GroupsIcon,
  History: HistoryIcon,
  AccessTime: AccessTimeIcon,
  Inbox: InboxIcon,
  Update: UpdateIcon,
  SwapHoriz: SwapHorizIcon,
  Warning: WarningIcon,
  Description: DescriptionIcon,
};

interface DashboardSettingsModalProps {
  open: boolean;
  onClose: () => void;
  canViewTile: (tileId: string) => boolean;
}

export default function DashboardSettingsModal({
  open,
  onClose,
  canViewTile,
}: DashboardSettingsModalProps) {
  const { config, updateConfig, resetConfig, isUpdating, isResetting } =
    useDashboardConfig();
  const { t } = useTranslation('common');
  const [localTiles, setLocalTiles] = useState<DashboardTileConfig[]>([]);

  // Initialize local state when modal opens or config changes
  useEffect(() => {
    if (open) {
      // Build complete tile list: existing config + any missing tiles with defaults
      const existingIds = new Set(config.tiles.map((t) => t.id));
      const allTiles = [...config.tiles];

      // Add any tiles from registry that aren't in config
      Object.entries(TILE_REGISTRY).forEach(([id, def]) => {
        if (!existingIds.has(id)) {
          allTiles.push({
            id,
            enabled: false,
            order: allTiles.length + 1,
            config: def.defaultConfig,
          });
        }
      });

      // Sort by order
      allTiles.sort((a, b) => a.order - b.order);
      setLocalTiles(allTiles);
    }
  }, [open, config.tiles]);

  // Filter to only show tiles the user has permission to view
  const visibleTiles = localTiles.filter((t) => canViewTile(t.id));

  const handleToggle = (tileId: string) => {
    setLocalTiles((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const handleSave = async () => {
    // Preserve tiles user can't see (don't drop them from config)
    const hiddenTiles = localTiles.filter((t) => !canViewTile(t.id));
    const updatedTiles = [...visibleTiles, ...hiddenTiles];

    // Re-assign order based on position
    const tilesWithOrder = updatedTiles.map((t, i) => ({ ...t, order: i + 1 }));

    await updateConfig({ tiles: tilesWithOrder });
    onClose();
  };

  const handleReset = async () => {
    await resetConfig();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('dashboard.settings.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dashboard.settings.description')}
        </Typography>

        <List dense>
          {visibleTiles.map((tile) => {
            const def = TILE_REGISTRY[tile.id];
            if (!def) return null;

            const IconComponent = ICON_MAP[def.icon] || TaskIcon;

            return (
              <ListItem
                key={tile.id}
                secondaryAction={
                  <IconButton edge="end" disabled size="small">
                    <DragIndicatorIcon />
                  </IconButton>
                }
                sx={{
                  bgcolor: tile.enabled ? 'action.selected' : 'transparent',
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Checkbox
                    edge="start"
                    checked={tile.enabled}
                    onChange={() => handleToggle(tile.id)}
                  />
                </ListItemIcon>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <IconComponent fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={def.title}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Button
            variant="text"
            color="error"
            onClick={handleReset}
            disabled={isResetting}
            size="small"
          >
            {t('dashboard.settings.resetToDefaults')}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('buttons.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isUpdating}
        >
          {t('buttons.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
