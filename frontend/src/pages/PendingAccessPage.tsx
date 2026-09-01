import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AuthFrame from '../components/AuthFrame';
import { useAuth } from '../auth/AuthContext';

/**
 * Shown instead of the app shell to authenticated users whose roles grant no
 * permissions at all — typically an SSO user auto-provisioned on first login
 * and still waiting for an administrator to grant access.
 */
export default function PendingAccessPage() {
  const { t } = useTranslation('auth');
  const { profile, logout } = useAuth();

  return (
    <AuthFrame>
      <Paper variant="outlined" elevation={0} sx={{ p: 4, width: '100%', maxWidth: 440 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={500}>
            {t('pendingAccess.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('pendingAccess.message')}
          </Typography>
          {profile?.email && (
            <Typography variant="body2" color="text.secondary">
              {t('pendingAccess.signedInAs', { email: profile.email })}
            </Typography>
          )}
          <Box>
            <Button variant="contained" onClick={() => void logout()}>
              {t('pendingAccess.signOut')}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </AuthFrame>
  );
}
