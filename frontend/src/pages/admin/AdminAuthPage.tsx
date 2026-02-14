import React from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useTenant } from '../../tenant/TenantContext';
import ForbiddenPage from '../ForbiddenPage';

type AuthSettings = {
  sso_provider: 'none' | 'entra' | string;
  entra_tenant_id: string | null;
  sso_enabled: boolean;
  entra_metadata: Record<string, any> | null;
};

export default function AdminAuthPage() {
  const { hasLevel } = useAuth();
  const { isPlatformHost } = useTenant();

  const [actionError, setActionError] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  if (isPlatformHost || !hasLevel('users', 'admin')) {
    return <ForbiddenPage />;
  }

  const { data, isLoading, isError, error } = useQuery<AuthSettings, any>({
    queryKey: ['admin-auth-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/auth/settings');
      return res.data;
    },
  });

  const handleConnect = async () => {
    setActionError(null);
    setConnecting(true);
    try {
      const res = await api.post('/auth/entra/setup/start');
      const url = res.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setActionError('Failed to start Microsoft Entra setup.');
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.message || e?.message || 'Failed to start Microsoft Entra setup.');
    } finally {
      setConnecting(false);
    }
  };

  const handleTestSignIn = () => {
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
    const base = apiBase.replace(/\/$/, '');
    const url = `${base}/auth/entra/login?redirectTo=${encodeURIComponent('/admin/auth')}`;
    window.location.href = url;
  };

  const connected = data?.sso_provider === 'entra' && !!data.entra_tenant_id;

  const handleDisconnect = async () => {
    if (!connected || !data) return;
    setActionError(null);
    setDisconnecting(true);
    try {
      await api.post('/admin/auth/disconnect', {});
      // Refetch settings to reflect disconnected state
      await (async () => {
        const res = await api.get('/admin/auth/settings');
        // This relies on react-query's automatic refetch when key is invalidated;
        // simplest dev UX is to reload the page.
        window.location.reload();
        return res.data;
      })();
    } catch (e: any) {
      setActionError(e?.response?.data?.message || e?.message || 'Failed to disconnect Microsoft Entra.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <PageHeader title="Authentication" />
      <Box maxWidth={600}>
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        )}
        {isError && (
          <Alert severity="error">
            {error?.response?.data?.message || error?.message || 'Failed to load authentication settings.'}
          </Alert>
        )}
        {!!actionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {actionError}
          </Alert>
        )}
        {data && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Microsoft Entra SSO</Typography>
                {!connected && (
                  <Typography variant="body2" color="text.secondary">
                    Microsoft Entra is not connected for this tenant. Connect your organization&apos;s Entra tenant to
                    allow users to sign in with their Microsoft accounts.
                  </Typography>
                )}
                {connected && (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Connected to Microsoft Entra.
                    </Typography>
                    <Typography variant="body2">
                      <strong>Entra tenant ID:</strong> {data.entra_tenant_id}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={2} mt={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleConnect}
                    disabled={connecting || disconnecting}
                  >
                    {connecting
                      ? 'Connecting…'
                      : connected
                      ? 'Reconnect Microsoft Entra'
                      : 'Connect Microsoft Entra'}
                  </Button>
                  {connected && (
                    <>
                      <Button variant="outlined" onClick={handleTestSignIn} disabled={disconnecting}>
                        Test Microsoft sign-in
                      </Button>
                      <Button
                        variant="text"
                        color="error"
                        onClick={handleDisconnect}
                        disabled={disconnecting || connecting}
                      >
                        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </>
  );
}
