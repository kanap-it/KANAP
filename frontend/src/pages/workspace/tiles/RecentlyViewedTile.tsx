import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InboxIcon from '@mui/icons-material/Inbox';
import AppsIcon from '@mui/icons-material/Apps';
import StorageIcon from '@mui/icons-material/Storage';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CableIcon from '@mui/icons-material/Cable';
import DescriptionIcon from '@mui/icons-material/Description';
import TaskIcon from '@mui/icons-material/Task';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useRecentlyViewed, ENTITY_TYPE_CONFIG, RecentEntityType } from '../hooks/useRecentlyViewed';
import { useAuth } from '../../../auth/AuthContext';
import DashboardTile, { TileEmptyState } from './DashboardTile';

interface RecentlyViewedTileProps {
  config: Record<string, unknown>;
}

const ICON_COMPONENTS: Record<string, typeof FolderOpenIcon> = {
  FolderOpen: FolderOpenIcon,
  Inbox: InboxIcon,
  Apps: AppsIcon,
  Storage: StorageIcon,
  SwapHoriz: SwapHorizIcon,
  Cable: CableIcon,
  Description: DescriptionIcon,
  Task: TaskIcon,
  Receipt: ReceiptIcon,
  AccountBalance: AccountBalanceIcon,
};

export default function RecentlyViewedTile({ config }: RecentlyViewedTileProps) {
  const navigate = useNavigate();
  const { items, clearRecent } = useRecentlyViewed();
  const { hasLevel } = useAuth();
  const limit = Math.min((config.limit as number) || 5, 5);

  // Filter items by permission
  const visibleItems = items
    .filter((item) => {
      const entityConfig = ENTITY_TYPE_CONFIG[item.type];
      if (!entityConfig) return false;
      return hasLevel(entityConfig.resource, 'reader');
    })
    .slice(0, limit);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleNavigate = (type: RecentEntityType, id: string) => {
    const entityConfig = ENTITY_TYPE_CONFIG[type];
    if (entityConfig) {
      navigate(entityConfig.route(id));
    }
  };

  return (
    <DashboardTile
      title="Recently Viewed"
      icon="History"
      action={
        visibleItems.length > 0 ? (
          <Button size="small" onClick={clearRecent}>
            Clear
          </Button>
        ) : undefined
      }
    >
      {visibleItems.length === 0 ? (
        <TileEmptyState message="No recently viewed items" />
      ) : (
        <List dense disablePadding>
          {visibleItems.map((item, index) => {
            const entityConfig = ENTITY_TYPE_CONFIG[item.type];
            const IconComponent = entityConfig
              ? ICON_COMPONENTS[entityConfig.icon] || FolderOpenIcon
              : FolderOpenIcon;

            return (
              <ListItemButton
                key={`${item.type}-${item.id}-${index}`}
                onClick={() => handleNavigate(item.type, item.id)}
                sx={{ py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <IconComponent fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {entityConfig?.label} - {formatTime(item.viewedAt)}
                    </Typography>
                  }
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </DashboardTile>
  );
}
