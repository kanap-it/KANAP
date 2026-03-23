import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import AuthFrame from '../components/AuthFrame';
import { useFeatures } from '../config/FeaturesContext';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

export default function ForgotPasswordPage() {
  const { config } = useFeatures();
  const { t } = useTranslation(['auth', 'validation']);

  if (!config.features.email) {
    return (
      <AuthFrame>
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
              {t('auth:forgot.unavailableTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('auth:forgot.unavailableMessage')}
            </Typography>
            <Button
              variant="text"
              color="primary"
              fullWidth
              onClick={() => window.location.href = '/login'}
            >
              {t('auth:forgot.backToLogin')}
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
      setError(t('validation:emailRequired'));
      return;
    }
    setError(null);
    setStatus('submitting');
    try {
      await api.post('/auth/password-reset/request', { email });
      setStatus('success');
    } catch (err: any) {
      const message = getApiErrorMessage(err, t, 'Unable to send reset instructions. Please try again.');
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
              {t('auth:forgot.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('auth:forgot.subtitle')}
            </Typography>
          </Stack>

          <TextField
            label={t('auth:forgot.emailLabel')}
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
              {t('auth:forgot.successMessage')}
            </Alert>
          )}

          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}

          <Stack spacing={1.5}>
            <Button type="submit" variant="contained" fullWidth disabled={isSubmitting || isSuccess}>
              {isSubmitting ? t('auth:forgot.submitting') : isSuccess ? t('auth:forgot.submitted') : t('auth:forgot.submit')}
            </Button>
            <Button
              type="button"
              variant="text"
              color="primary"
              fullWidth
              onClick={() => navigate('/login', { replace: true, state: isSuccess ? { passwordResetEmailSent: true } : undefined })}
            >
              {t('auth:forgot.backToLogin')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </AuthFrame>
  );
}
