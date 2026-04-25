import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export type KanapDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  onSave: () => void | Promise<void>;
  saveLabel?: string;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  sx?: SxProps<Theme>;
};

function isMultilineTarget(target: EventTarget | null) {
  return target instanceof HTMLTextAreaElement;
}

export default function KanapDialog({
  open,
  title,
  onClose,
  children,
  footerLeft,
  onSave,
  saveLabel = 'Save',
  saveDisabled = false,
  saveLoading = false,
  sx,
}: KanapDialogProps) {
  const handleSubmit = React.useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saveDisabled || saveLoading) return;
    void onSave();
  }, [onSave, saveDisabled, saveLoading]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      BackdropProps={{
        sx: (theme: Theme) => ({
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(15, 17, 23, 0.45)',
        }),
      }}
      PaperProps={{
        sx: [
          (theme: Theme) => ({
            width: '100%',
            maxWidth: 480,
            m: 2,
            bgcolor: theme.palette.kanap.bg.primary,
            borderRadius: '8px',
            border: `0.5px solid ${theme.palette.kanap.border.default}`,
            boxShadow: 'none',
            backgroundImage: 'none',
          }),
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ],
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        onKeyDown={(event: React.KeyboardEvent<HTMLFormElement>) => {
          if (event.key === 'Enter' && !event.shiftKey && !isMultilineTarget(event.target)) {
            event.preventDefault();
            if (!saveDisabled && !saveLoading) void onSave();
          }
        }}
      >
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: '20px',
            py: '16px',
            borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
          })}
        >
          <Typography
            component="h2"
            sx={(theme) => ({
              flex: 1,
              minWidth: 0,
              fontSize: 16,
              fontWeight: 500,
              color: theme.palette.kanap.text.primary,
              m: 0,
            })}
          >
            {title}
          </Typography>
          <IconButton aria-label="Close dialog" onClick={onClose} size="small">
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box sx={{ px: '20px', py: '18px' }}>
          {children}
        </Box>

        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: '20px',
            py: '14px',
            borderTop: `1px solid ${theme.palette.kanap.border.soft}`,
          })}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {footerLeft}
          </Box>
          <Button variant="action" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={saveDisabled || saveLoading}
            startIcon={saveLoading ? <CircularProgress color="inherit" size={14} /> : undefined}
            sx={{ boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
          >
            {saveLabel}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
