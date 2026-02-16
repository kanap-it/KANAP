import { useEffect, useState, useMemo } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import AuthFrame from '../components/AuthFrame';
import { useTenant } from '../tenant/TenantContext';
import { useFeatures } from '../config/FeaturesContext';

const marketingUrl = import.meta.env.VITE_MARKETING_URL ?? 'https://kanap.net';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('sessionExpired') === 'true';
  const [infoMessage, setInfoMessage] = useState<string | null>(() => {
    const state = location.state as any;
    if (state?.passwordResetSuccess) {
      return 'Your password has been updated. Please sign in with your new credentials.';
    }
    if (state?.passwordResetEmailSent) {
      return 'If an account matches that email, you will receive password reset instructions shortly.';
    }
    if (state?.inviteAccepted) {
      return 'Your account is ready. Sign in with the password you just set.';
    }
    return null;
  });
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(() =>
    sessionExpired ? 'Your session has expired. Please sign in again.' : null
  );
  const { login } = useAuth();
  const { isPlatformHost } = useTenant();
  const { config } = useFeatures();

  useEffect(() => {
    const state = location.state as any;
    if (state?.passwordResetSuccess || state?.passwordResetEmailSent || state?.inviteAccepted) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSessionExpiredMessage(null);
    try {
      const res = await api.post('/auth/login', { email: username, password });
      // New response format: { access_token, refresh_token, expires_in }
      login(res.data as { access_token: string; refresh_token: string; expires_in: number });
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  };

  const onMicrosoftSignIn = () => {
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
    const base = apiBase.replace(/\/$/, '');
    const url = `${base}/auth/entra/login?redirectTo=${encodeURIComponent('/')}`;
    window.location.href = url;
  };

  return (
    <AuthFrame>
      <Paper
        component="form"
        onSubmit={onSubmit}
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, md: 4 },
          borderRadius: 3,
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Sign in to your account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your credentials to access your tenant workspace.
            </Typography>
          </Box>

          <Stack spacing={3}>
            {!isPlatformHost && config.features.sso && (
              <Button
                type="button"
                variant="contained"
                color="primary"
                fullWidth
                onClick={onMicrosoftSignIn}
              >
                Sign in with Microsoft
              </Button>
            )}

            <Stack spacing={2}>
              <TextField
                label="Username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                fullWidth
                autoComplete="username"
                autoFocus
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                fullWidth
                autoComplete="current-password"
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {sessionExpiredMessage && (
              <Alert severity="warning" role="status">
                {sessionExpiredMessage}
              </Alert>
            )}

            {infoMessage && (
              <Alert severity="success" role="status">
                {infoMessage}
              </Alert>
            )}

            {error && (
              <Alert severity="error" role="alert">
                {String(error)}
              </Alert>
            )}

            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  type="button"
                  variant="outlined"
                  color="inherit"
                  fullWidth
                  onClick={() => {
                    window.location.href = marketingUrl;
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="outlined" fullWidth>
                  Sign in with email
                </Button>
              </Stack>
              {config.features.email && (
                <Button
                  type="button"
                  variant="text"
                  color="primary"
                  fullWidth
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </AuthFrame>
  );
}
