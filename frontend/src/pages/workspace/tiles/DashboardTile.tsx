import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Skeleton,
  Box,
} from '@mui/material';
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
};

interface DashboardTileProps {
  title: string;
  icon: string;
  isLoading?: boolean;
  children: ReactNode;
  action?: ReactNode;
  minHeight?: number;
}

export default function DashboardTile({
  title,
  icon,
  isLoading = false,
  children,
  action,
  minHeight = 200,
}: DashboardTileProps) {
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
