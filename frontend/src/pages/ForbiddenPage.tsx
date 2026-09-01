import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ForbiddenPage() {
  const { t } = useTranslation('common');
  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
      <Paper sx={{ p: 4, maxWidth: 520 }} elevation={2}>
        <Stack spacing={2}>
          <Typography variant="h5">{t('forbidden.title')}</Typography>
          <Typography color="text.secondary">{t('forbidden.message')}</Typography>
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/" variant="contained">{t('forbidden.cta')}</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
