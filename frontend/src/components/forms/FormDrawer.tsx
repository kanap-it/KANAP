import React from 'react';
import { Drawer, Box, Stack, Typography, Divider, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type FormDrawerProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  formId?: string;
  disableSave?: boolean;
  saving?: boolean;
};

export default function FormDrawer({
  title,
  open,
  onClose,
  children,
  width = 520,
  formId,
  disableSave,
  saving,
}: FormDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width } }}>
      <Box role="presentation" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1 }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton aria-label="Close" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider />
        <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>{children}</Box>
        <Divider />
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button type="submit" form={formId} variant="contained" disabled={!!disableSave || !!saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}

