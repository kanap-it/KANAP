import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import AuthFrame from '../components/AuthFrame';
import { useFeatures } from '../config/FeaturesContext';

export default function ForgotPasswordPage() {
  const { config } = useFeatures();

  if (!config.features.email) {
    return (
      <AuthFrame heading="Reset your password">
        <Paper
          elevation={4}
          sx={{
            width: '100%',
            maxWidth: 420,
            p: { xs: 3, md: 4 },
            borderRadius: 3,
          }}
        >
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Password reset unavailable
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Password reset requires email to be configured. Contact your administrator.
            </Typography>
            <Button
              variant="text"
              color="primary"
              fullWidth
              onClick={() => window.location.href = '/login'}
            >
              Back to login
            </Button>
          </Stack>
        </Paper>
      </AuthFrame>
    );
  }

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const navigate = useNavigate();

  const isSubmitting = status === 'submitting';
  const isSuccess = status === 'success';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter the email associated with your account.');
      return;
    }
    setError(null);
    setStatus('submitting');
    try {
      await api.post('/auth/password-reset/request', { email });
      setStatus('success');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to send reset instructions. Please try again.';
      setError(message);
      setStatus('idle');
    }
  };

  return (
    <AuthFrame heading="Reset your password">
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
              Forgot your password?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter the email you use to sign in. We will send a link so you can set a new password.
            </Typography>
          </Stack>

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            autoComplete="email"
            disabled={isSubmitting || isSuccess}
            required
            InputLabelProps={{ shrink: true }}
          />

          {isSuccess && (
            <Alert severity="success" role="status">
              If an account matches that email, reset instructions are on their way.
            </Alert>
          )}

          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}

          <Stack spacing={1.5}>
            <Button type="submit" variant="contained" fullWidth disabled={isSubmitting || isSuccess}>
              {isSubmitting ? 'Sending…' : isSuccess ? 'Email sent' : 'Send reset email'}
            </Button>
            <Button
              type="button"
              variant="text"
              color="primary"
              fullWidth
              onClick={() => navigate('/login', { replace: true, state: isSuccess ? { passwordResetEmailSent: true } : undefined })}
            >
              Back to login
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </AuthFrame>
  );
}
