import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
      <Paper sx={{ p: 4, maxWidth: 520 }} elevation={2}>
        <Stack spacing={2}>
          <Typography variant="h5">Access denied</Typography>
          <Typography color="text.secondary">
            You don’t have permission to view this page. If you believe this is a mistake, contact an administrator.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/" variant="contained">Go to Dashboard</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

