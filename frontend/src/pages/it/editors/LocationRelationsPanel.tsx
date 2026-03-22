import React from 'react';
import {
  Alert,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Link as MuiLink,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';

type ServerRow = {
  id: string;
  name: string;
  kind: string;
  provider: string;
  environment: string;
  region: string | null;
  zone: string | null;
  status: string;
  sub_location_id?: string | null;
  sub_location_name?: string | null;
};

type ApplicationRow = {
  id: string;
  name: string;
  environments: string[];
};

type Props = {
  id: string;
};

export default function LocationRelationsPanel({ id }: Props) {
  const navigate = useNavigate();
  const [servers, setServers] = React.useState<ServerRow[]>([]);
  const [applications, setApplications] = React.useState<ApplicationRow[]>([]);
  const [hasSubLocations, setHasSubLocations] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [serversRes, appsRes, subItemsRes] = await Promise.all([
        api.get(`/locations/${id}/servers`),
        api.get(`/locations/${id}/applications`),
        api.get(`/locations/${id}/sub-items`),
      ]);
      setServers(serversRes.data || []);
      setHasSubLocations(Array.isArray(subItemsRes.data) && subItemsRes.data.length > 0);
      setApplications(
        (appsRes.data || []).map((app: any) => ({
          id: app.id,
          name: app.name,
          environments: Array.isArray(app.environments) ? app.environments : [],
        })),
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load relations';
      setError(msg);
      setServers([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  return (
    <Stack spacing={2}>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Assets</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              {hasSubLocations && <TableCell>Sub-location</TableCell>}
              <TableCell>Environment</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Region / Zone</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {servers.length === 0 && (
              <TableRow>
                <TableCell colSpan={hasSubLocations ? 7 : 6}>
                  <Typography variant="body2" color="text.secondary">No assets linked to this location.</Typography>
                </TableCell>
              </TableRow>
            )}
            {servers.map((server) => (
              <TableRow key={server.id}>
                <TableCell>
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={() => navigate(`/it/assets/${server.id}/overview`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {server.name}
                  </MuiLink>
                </TableCell>
                {hasSubLocations && <TableCell>{server.sub_location_name || '—'}</TableCell>}
                <TableCell>{server.environment}</TableCell>
                <TableCell>{server.kind}</TableCell>
                <TableCell>{server.provider}</TableCell>
                <TableCell>{[server.region, server.zone].filter(Boolean).join(' / ')}</TableCell>
                <TableCell>{server.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Applications</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Environments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary">No applications detected for this location.</Typography>
                </TableCell>
              </TableRow>
            )}
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={() => navigate(`/it/applications/${app.id}/overview`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {app.name}
                  </MuiLink>
                </TableCell>
                <TableCell>{app.environments.filter(Boolean).join(', ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
