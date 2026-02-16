import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DeleteSelectedButton from '../../components/DeleteSelectedButton';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api';
import CreateCoADialog from './CreateCoADialog';
import { CoaListItem, useCoaList } from './useCoaList';

export default function ManageCoAsDialog({
  open,
  onClose,
  onCoaCreated,
  onCoaDeleted,
  onCoaUpdated,
}: {
  open: boolean;
  onClose: () => void;
  onCoaCreated?: (newId: string) => void;
  onCoaDeleted?: (coaId: string) => void;
  onCoaUpdated?: () => void;
}) {
  const { hasLevel } = useAuth();
  const canManage = hasLevel('accounts', 'manager');
  const canAdmin = hasLevel('accounts', 'admin');
  const { coas, isLoading, isError, refetch } = useCoaList();

  const [selectedCoaId, setSelectedCoaId] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (coas.length === 0) {
      setSelectedCoaId('');
      return;
    }
    if (!selectedCoaId || !coas.some((item) => item.id === selectedCoaId)) {
      setSelectedCoaId(coas[0].id);
    }
  }, [open, coas, selectedCoaId]);

  const selectedCoa = useMemo(
    () => coas.find((item) => item.id === selectedCoaId),
    [coas, selectedCoaId],
  );

  const refresh = useCallback(async () => {
    await refetch();
    onCoaUpdated?.();
  }, [onCoaUpdated, refetch]);

  const handleSetDefault = useCallback(async () => {
    if (!selectedCoa) return;
    setActionError(null);
    try {
      await api.patch(`/chart-of-accounts/${selectedCoa.id}`, { is_default: true });
      await refresh();
    } catch (e: any) {
      setActionError(e?.response?.data?.message || 'Failed to set default Chart of Accounts');
    }
  }, [selectedCoa, refresh]);

  const handleSetGlobalDefault = useCallback(async () => {
    if (!selectedCoa) return;
    setActionError(null);
    try {
      await api.patch(`/chart-of-accounts/${selectedCoa.id}/global-default`, {});
      await refresh();
    } catch (e: any) {
      setActionError(e?.response?.data?.message || 'Failed to set global default Chart of Accounts');
    }
  }, [selectedCoa, refresh]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Manage Charts of Accounts</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          )}

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {canManage && (
              <Button variant="contained" onClick={() => setCreateOpen(true)}>
                New
              </Button>
            )}
            {canManage && (
              <Button
                disabled={!selectedCoa || selectedCoa.scope !== 'COUNTRY'}
                onClick={handleSetDefault}
              >
                Set Country Default
              </Button>
            )}
            {canManage && (
              <Button
                disabled={!selectedCoa || selectedCoa.scope !== 'GLOBAL'}
                onClick={handleSetGlobalDefault}
              >
                Set Global Default
              </Button>
            )}
            {canAdmin && (
              <DeleteSelectedButton
                selectedRows={selectedCoa ? [selectedCoa] : []}
                endpoint="/chart-of-accounts/bulk"
                getItemId={(row) => row.id}
                getItemName={(row) => `${row.code} - ${row.name}`}
                onDeleteSuccess={async () => {
                  if (selectedCoa) onCoaDeleted?.(selectedCoa.id);
                  await refresh();
                  setSelectedCoaId('');
                }}
              />
            )}
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 360 }}>
            <Paper variant="outlined" sx={{ width: { xs: '100%', md: 320 }, maxHeight: 380, overflow: 'auto' }}>
              <List dense disablePadding>
                {isLoading && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    Loading charts of accounts…
                  </Typography>
                )}
                {isError && (
                  <Typography variant="body2" color="error" sx={{ p: 2 }}>
                    Failed to load charts of accounts.
                  </Typography>
                )}
                {!isLoading && !isError && coas.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    No charts of accounts found.
                  </Typography>
                )}
                {coas.map((coa) => (
                  <ListItemButton
                    key={coa.id}
                    selected={coa.id === selectedCoaId}
                    onClick={() => setSelectedCoaId(coa.id)}
                  >
                    <ListItemText
                      primary={`${coa.code}${coa.is_default ? ' ★' : ''}${coa.is_global_default ? ' ⊕' : ''}`}
                      secondary={coa.name}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>

            <Paper variant="outlined" sx={{ flex: 1, p: 2 }}>
              {!selectedCoa ? (
                <Typography variant="body2" color="text.secondary">
                  Select a Chart of Accounts to view details.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  <Typography variant="h6">{selectedCoa.code}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedCoa.name}</Typography>
                  <Divider />
                  <Typography variant="body2">
                    Scope: <strong>{selectedCoa.scope}</strong>
                  </Typography>
                  {selectedCoa.scope === 'COUNTRY' && (
                    <Typography variant="body2">
                      Country: <strong>{selectedCoa.country_iso || '-'}</strong>
                    </Typography>
                  )}
                  <Typography variant="body2">
                    Country Default: <strong>{selectedCoa.is_default ? 'Yes' : 'No'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Global Default: <strong>{selectedCoa.is_global_default ? 'Yes' : 'No'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Linked Companies: <strong>{selectedCoa.companies_count ?? 0}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Accounts: <strong>{selectedCoa.accounts_count ?? 0}</strong>
                  </Typography>
                </Stack>
              )}
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <CreateCoADialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (newId) => {
          setCreateOpen(false);
          await refresh();
          setSelectedCoaId(newId);
          onCoaCreated?.(newId);
        }}
      />
    </>
  );
}
