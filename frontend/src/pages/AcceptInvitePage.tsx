import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import AuthFrame from '../components/AuthFrame';

export default function AcceptInvitePage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const location = useLocation();
  const navigate = useNavigate();

  const token = useMemo(() => {
    const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);
    const hashToken = hashParams.get('token');
    if (hashToken && hashToken.trim() !== '') return hashToken;
    return null;
  }, [location.hash]);
  const isSubmitting = status === 'submitting';
  const isSuccess = status === 'success';

  useEffect(() => {
    if (token && (location.hash || location.search)) {
      window.history.replaceState(null, '', location.pathname);
    }
  }, [token, location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!token || token.trim() === '') {
      setError('This invite link is invalid or has already been used. Please request a new one.');
    }
  }, [token]);

  useEffect(() => {
    if (isSuccess) {
      const timeout = window.setTimeout(() => {
        navigate('/login', { replace: true, state: { inviteAccepted: true } });
      }, 1800);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [isSuccess, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('This invite link is invalid or has already been used. Please request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setStatus('submitting');
    try {
      await api.post('/auth/password-reset/complete', { token, password });
      setStatus('success');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'We could not complete your invite. Please try again or request a new link.';
      setError(message);
      setStatus('idle');
    }
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
          <Stack spacing={1}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Set your password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a secure password to activate your access. After this step you can sign in with your email address.
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoComplete="new-password"
              required
              disabled={isSubmitting || isSuccess || !token}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              autoComplete="new-password"
              required
              disabled={isSubmitting || isSuccess || !token}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          {isSuccess && (
            <Alert severity="success" role="status">
              Password saved. Redirecting you to the sign-in page…
            </Alert>
          )}

          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}

          <Stack spacing={1.5}>
            <Button type="submit" variant="contained" fullWidth disabled={isSubmitting || isSuccess || !token}>
              {isSubmitting ? 'Saving…' : 'Save password'}
            </Button>
            <Button
              type="button"
              variant="text"
              color="primary"
              fullWidth
              onClick={() => navigate('/forgot-password')}
            >
              Request a new link
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </AuthFrame>
  );
}
