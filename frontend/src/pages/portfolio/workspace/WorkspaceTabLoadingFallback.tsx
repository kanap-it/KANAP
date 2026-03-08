import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

type WorkspaceTabLoadingFallbackProps = {
  label?: string;
};

export default function WorkspaceTabLoadingFallback({
  label = 'Loading tab...',
}: WorkspaceTabLoadingFallbackProps) {
  return (
    <Box sx={{ py: 1 }}>
      <LinearProgress sx={{ mb: 1.5 }} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
