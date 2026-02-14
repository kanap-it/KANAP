import React, { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import api from '../api';

export interface DeleteSelectedButtonProps<T> {
  selectedRows: T[];
  endpoint: string; // e.g., '/spend-items/bulk'
  getItemId: (row: T) => string;
  getItemName: (row: T) => string;
  onDeleteSuccess: () => void;
  gridApi?: any; // AG Grid API to clear selection
  disabled?: boolean;
  label?: string;
  /** Optional cascade delete option for related data */
  cascadeOption?: {
    label: string;
    description?: string;
    /** The key to send in the API body when cascade is enabled */
    apiKey: string;
  };
}

export default function DeleteSelectedButton<T>({
  selectedRows,
  endpoint,
  getItemId,
  getItemName,
  onDeleteSuccess,
  gridApi,
  disabled = false,
  label = 'Delete Selected',
  cascadeOption,
}: DeleteSelectedButtonProps<T>) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning';
  }>({ open: false, message: '', severity: 'success' });

  const handleOpenConfirm = () => {
    if (selectedRows.length === 0) return;
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    if (loading) return;
    setConfirmOpen(false);
  };

  const handleConfirmDelete = async (options?: { deleteRelated?: boolean }) => {
    setLoading(true);
    try {
      const ids = selectedRows.map(getItemId);
      const data: Record<string, any> = { ids };
      if (options?.deleteRelated && cascadeOption) {
        data[cascadeOption.apiKey] = true;
      }
      const response = await api.delete(endpoint, { data });

      const { deleted = [], failed = [] } = response.data;

      if (failed.length === 0) {
        // All deleted successfully
        setSnackbar({
          open: true,
          message: `Successfully deleted ${deleted.length} item(s)`,
          severity: 'success',
        });
      } else if (deleted.length === 0) {
        // All failed
        const reasons = failed.map((f: any) => `${f.productName || f.name || f.description || 'Item'}: ${f.reason}`).join('; ');
        setSnackbar({
          open: true,
          message: `Failed to delete items: ${reasons}`,
          severity: 'error',
        });
      } else {
        // Partial success
        setSnackbar({
          open: true,
          message: `Deleted ${deleted.length} item(s). Failed to delete ${failed.length} item(s).`,
          severity: 'warning',
        });
      }

      setConfirmOpen(false);

      // Clear grid selection
      if (gridApi) {
        try {
          gridApi.deselectAll?.();
        } catch (e) {
          console.warn('Failed to clear grid selection:', e);
        }
      }

      onDeleteSuccess();
    } catch (error: any) {
      console.error('Delete error:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Failed to delete items',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const items = selectedRows.map((row) => ({
    id: getItemId(row),
    name: getItemName(row),
  }));

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        startIcon={<DeleteIcon />}
        onClick={handleOpenConfirm}
        disabled={disabled || selectedRows.length === 0}
        size="small"
      >
        {label} ({selectedRows.length})
      </Button>

      <DeleteConfirmDialog
        open={confirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Selected Items"
        itemCount={selectedRows.length}
        items={items}
        loading={loading}
        cascadeOption={cascadeOption ? { label: cascadeOption.label, description: cascadeOption.description } : undefined}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
