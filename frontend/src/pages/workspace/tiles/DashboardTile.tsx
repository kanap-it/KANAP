import { ReactNode } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Skeleton,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import TaskIcon from '@mui/icons-material/Task';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InboxIcon from '@mui/icons-material/Inbox';
import UpdateIcon from '@mui/icons-material/Update';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WarningIcon from '@mui/icons-material/Warning';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PlaceIcon from '@mui/icons-material/Place';
import ArticleIcon from '@mui/icons-material/Article';

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
  AccountBalanceWallet: AccountBalanceWalletIcon,
  AccountBalance: AccountBalanceIcon,
  Assignment: AssignmentIcon,
  EventAvailable: EventAvailableIcon,
  ReportProblemOutlined: ReportProblemOutlinedIcon,
  TrendingUp: TrendingUpIcon,
  VerifiedUser: VerifiedUserIcon,
  Place: PlaceIcon,
  Article: ArticleIcon,
};

interface DashboardTileProps {
  title: string;
  icon: string;
  isLoading?: boolean;
  /** Query failed: the tile shows a retry prompt instead of an empty state that would read as "nothing to do". */
  isError?: boolean;
  onRetry?: () => void;
  children: ReactNode;
  action?: ReactNode;
  minHeight?: number;
}

export default function DashboardTile({
  title,
  icon,
  isLoading = false,
  isError = false,
  onRetry,
  children,
  action,
  minHeight = 200,
}: DashboardTileProps) {
  const { t } = useTranslation('common');
  const IconComponent = ICON_MAP[icon] || TaskIcon;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardHeader
        avatar={<IconComponent sx={{ color: 'text.secondary' }} />}
        title={
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
        }
        action={action}
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ flex: 1, pt: 1, minHeight }}>
        {isLoading ? (
          <Box>
            <Skeleton variant="rectangular" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={24} sx={{ mb: 1 }} />
          </Box>
        ) : isError ? (
          <TileEmptyState
            message={t('dashboard.tiles.loadError')}
            action={onRetry ? (
              <Button size="small" onClick={onRetry}>{t('buttons.retry')}</Button>
            ) : undefined}
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

export function TileEmptyState({ message, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        color: 'text.secondary',
      }}
    >
      <Typography variant="body2" sx={{ mb: action ? 2 : 0 }}>
        {message}
      </Typography>
      {action}
    </Box>
  );
}
