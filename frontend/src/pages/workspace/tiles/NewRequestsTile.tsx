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
import DashboardTile, { TileEmptyState } from './DashboardTile';

interface PortfolioRequest {
  id: string;
  name: string;
  requester_name?: string;
  created_at: string;
  priority_score: number | null;
}

interface NewRequestsTileProps {
  config: Record<string, unknown>;
}

export default function NewRequestsTile({ config }: NewRequestsTileProps) {
  const navigate = useNavigate();
  const limit = Math.min((config.limit as number) || 5, 5);
  const days = (config.days as number) || 7;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio', 'requests', 'recent', limit, days],
    queryFn: async () => {
      const res = await api.get('/portfolio/requests', {
        params: {
          limit,
          sort: 'created_at:DESC',
          created_after: cutoffDate.toISOString().split('T')[0],
        },
      });
      return res.data.items as PortfolioRequest[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const requests = data || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardTile
      title={`New Requests (Last ${days} Days)`}
      icon="Inbox"
      isLoading={isLoading}
      action={
        <Button size="small" onClick={() => navigate('/portfolio/requests')}>
          View All
        </Button>
      }
    >
      {requests.length === 0 ? (
        <TileEmptyState
          message="No new requests in this period"
          action={
            <Button size="small" onClick={() => navigate('/portfolio/requests')}>
              Browse Requests
            </Button>
          }
        />
      ) : (
        <List dense disablePadding>
          {requests.map((request) => (
            <ListItemButton
              key={request.id}
              onClick={() => navigate(`/portfolio/requests/${request.id}`)}
              sx={{ py: 0.5 }}
            >
              <ListItemText
                primary={request.name}
                secondary={
                  <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {request.requester_name && (
                      <Typography variant="caption" color="text.secondary">
                        {request.requester_name}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(request.created_at)}
                    </Typography>
                  </Box>
                }
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ component: 'div' }}
              />
              {request.priority_score != null && request.priority_score > 80 && (
                <Chip
                  label="High"
                  size="small"
                  color="warning"
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                />
              )}
            </ListItemButton>
          ))}
        </List>
      )}
    </DashboardTile>
  );
}
