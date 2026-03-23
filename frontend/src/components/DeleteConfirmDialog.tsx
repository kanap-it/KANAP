import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { useTranslation } from 'react-i18next';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (options?: { deleteRelated?: boolean }) => void;
  title?: string;
  message?: string;
  itemCount: number;
  items?: Array<{ id: string; name: string }>;
  loading?: boolean;
  maxDisplayItems?: number;
  /** Optional checkbox for cascade deletion of related data */
  cascadeOption?: {
    label: string;
    description?: string;
  };
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  itemCount,
  items = [],
  loading = false,
  maxDisplayItems = 10,
  cascadeOption,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation('common');
  const [deleteRelated, setDeleteRelated] = React.useState(false);
  const displayItems = items.slice(0, maxDisplayItems);
  const hasMore = items.length > maxDisplayItems;

  // Reset checkbox when dialog closes
  React.useEffect(() => {
    if (!open) setDeleteRelated(false);
  }, [open]);

  const handleConfirm = () => {
    onConfirm(cascadeOption ? { deleteRelated } : undefined);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          {title || t('delete.confirmTitle')}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('delete.warningMessage')}
        </Alert>

        {message && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            {message}
          </Typography>
        )}

        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          {itemCount === 1
            ? t('delete.singleItem')
            : t('delete.multipleItems', { count: itemCount })}
        </Typography>

        {displayItems.length > 0 && (
          <Box
            sx={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <List dense disablePadding>
              {displayItems.map((item) => (
                <ListItem key={item.id} divider>
                  <ListItemText
                    primary={item.name}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {hasMore && (
          <Typography variant="caption" color="text.secondary">
            {t('delete.andMore', { count: items.length - maxDisplayItems })}
          </Typography>
        )}

        {cascadeOption && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteRelated}
                  onChange={(e) => setDeleteRelated(e.target.checked)}
                  disabled={loading}
                />
              }
              label={cascadeOption.label}
            />
            {cascadeOption.description && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                {cascadeOption.description}
              </Typography>
            )}
          </Box>
        )}

        <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
          {t('delete.confirmPrompt')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('buttons.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? t('status.deleting') : t('buttons.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
