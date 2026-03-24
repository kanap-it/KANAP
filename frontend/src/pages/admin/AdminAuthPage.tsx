import React from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useTenant } from '../../tenant/TenantContext';
import ForbiddenPage from '../ForbiddenPage';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

type AuthSettings = {
  sso_provider: 'none' | 'entra' | string;
  entra_tenant_id: string | null;
  sso_enabled: boolean;
  entra_metadata: Record<string, any> | null;
};

export default function AdminAuthPage() {
  const { t } = useTranslation(['admin', 'common']);
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
        setActionError(t('auth.messages.connectStartFailed'));
      }
    } catch (e: any) {
      setActionError(getApiErrorMessage(e, t, t('auth.messages.connectStartFailed')));
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
      setActionError(getApiErrorMessage(e, t, t('auth.messages.disconnectFailed')));
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <PageHeader title={t('auth.title')} />
      <Box maxWidth={600}>
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        )}
        {isError && (
          <Alert severity="error">
            {getApiErrorMessage(error, t, t('auth.messages.loadFailed'))}
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
                <Typography variant="h6">{t('auth.entra.title')}</Typography>
                {!connected && (
                  <Typography variant="body2" color="text.secondary">
                    {t('auth.entra.disconnectedDescription')}
                  </Typography>
                )}
                {connected && (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      {t('auth.entra.connected')}
                    </Typography>
                    <Typography variant="body2">
                      <strong>{t('auth.entra.tenantId')}:</strong> {data.entra_tenant_id}
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
                      ? t('auth.actions.connecting')
                      : connected
                      ? t('auth.actions.reconnect')
                      : t('auth.actions.connect')}
                  </Button>
                  {connected && (
                    <>
                      <Button variant="outlined" onClick={handleTestSignIn} disabled={disconnecting}>
                        {t('auth.actions.testSignIn')}
                      </Button>
                      <Button
                        variant="text"
                        color="error"
                        onClick={handleDisconnect}
                        disabled={disconnecting || connecting}
                      >
                        {disconnecting ? t('auth.actions.disconnecting') : t('auth.actions.disconnect')}
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
