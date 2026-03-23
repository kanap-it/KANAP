import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

type WorkspaceTabLoadingFallbackProps = {
  label?: string;
};

export default function WorkspaceTabLoadingFallback({
  label,
}: WorkspaceTabLoadingFallbackProps) {
  const { t } = useTranslation('portfolio');
  return (
    <Box sx={{ py: 1 }}>
      <LinearProgress sx={{ mb: 1.5 }} />
      <Typography variant="body2" color="text.secondary">
        {label ?? t('workspace.loadingTab')}
      </Typography>
    </Box>
  );
}
