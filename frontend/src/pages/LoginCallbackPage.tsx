import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../api';

export default function LoginCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const completeLogin = async () => {
      const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);
      const token = hashParams.get('token');
      const refreshToken = hashParams.get('refreshToken');
      const expiresInStr = hashParams.get('expiresIn');
      const refreshExpiresInStr = hashParams.get('refreshExpiresIn');
      const redirectTo = hashParams.get('redirectTo') || '/';

      if (!token || !expiresInStr || !Number.isFinite(parseInt(expiresInStr, 10))) {
        if (!cancelled) {
          navigate('/login', { replace: true, state: { ssoError: 'Sign-in failed. Please try again.' } });
        }
        return;
      }

      if (location.hash || location.search) {
        window.history.replaceState(null, '', location.pathname);
      }

      let accessToken = token;
      let expiresIn = parseInt(expiresInStr, 10);
      let refreshExpiresIn = refreshExpiresInStr ? parseInt(refreshExpiresInStr, 10) : undefined;

      // Entra callback happens on the shared host; refresh cookie must be minted on tenant host.
      if (refreshToken) {
        try {
          const refreshed = await api.post('/auth/refresh', { refresh_token: refreshToken });
          if (refreshed?.data?.access_token && Number.isFinite(refreshed?.data?.expires_in)) {
            accessToken = String(refreshed.data.access_token);
            expiresIn = Number(refreshed.data.expires_in);
            if (Number.isFinite(refreshed.data.refresh_expires_in)) {
              refreshExpiresIn = Number(refreshed.data.refresh_expires_in);
            }
          }
        } catch {
          // If this exchange fails, continue with the callback access token.
        }
      }

      if (cancelled) return;
      login({
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
        expires_in: expiresIn,
        refresh_expires_in: refreshExpiresIn,
      });
      navigate(redirectTo || '/', { replace: true });
    };

    void completeLogin();
    return () => {
      cancelled = true;
    };
  }, [location.hash, location.pathname, location.search, login, navigate]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Box textAlign="center">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Signing you in…
        </Typography>
      </Box>
    </Box>
  );
}
