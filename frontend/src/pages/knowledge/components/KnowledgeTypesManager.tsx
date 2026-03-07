import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';

type DocumentTypeItem = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  is_default: boolean;
  display_order: number;
};

export default function KnowledgeTypesManager() {
  const qc = useQueryClient();
  const [newName, setNewName] = React.useState('');
  const [newDescription, setNewDescription] = React.useState('');
  const [draftById, setDraftById] = React.useState<Record<string, DocumentTypeItem>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge-types'],
    queryFn: async () => (await api.get('/knowledge-types')).data as DocumentTypeItem[],
  });

  React.useEffect(() => {
    if (!data) return;
    setDraftById(Object.fromEntries(data.map((item) => [item.id, { ...item }])));
  }, [data]);

  const invalidateAll = React.useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['knowledge-types'] }),
      qc.invalidateQueries({ queryKey: ['knowledge'] }),
    ]);
  }, [qc]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/knowledge-types', {
        name: newName.trim(),
        description: newDescription.trim() || null,
      });
    },
    onSuccess: async () => {
      setNewName('');
      setNewDescription('');
      await invalidateAll();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const draft = draftById[id];
      if (!draft) return;
      await api.patch(`/knowledge-types/${id}`, {
        name: draft.name,
        description: draft.description,
        is_active: draft.is_active,
        display_order: Number.isFinite(Number(draft.display_order)) ? Number(draft.display_order) : 0,
      });
    },
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/knowledge-types/${id}`);
    },
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const setDraftField = React.useCallback(
    function setDraftField<K extends keyof DocumentTypeItem>(id: string, field: K, value: DocumentTypeItem[K]) {
      setDraftById((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || ({} as DocumentTypeItem)),
          [field]: value,
        },
      }));
    },
    [],
  );

  const isRowChanged = React.useCallback((row: DocumentTypeItem) => {
    const original = (data || []).find((item) => item.id === row.id);
    if (!original) return false;
    return (
      original.name !== row.name ||
      (original.description || '') !== (row.description || '') ||
      !!original.is_active !== !!row.is_active ||
      Number(original.display_order || 0) !== Number(row.display_order || 0)
    );
  }, [data]);

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Types classify documents. Templates define structure and content. The built-in <strong>Document</strong> type is the fallback for blank documents.
      </Alert>

      <Box sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1.5, p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Create type</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              size="small"
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <TextField
              size="small"
              label="Description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              Create
            </Button>
          </Stack>
          {createMutation.isError && (
            <Alert severity="error">
              {(createMutation.error as any)?.response?.data?.message || 'Failed to create document type.'}
            </Alert>
          )}
        </Stack>
      </Box>

      <Box sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1.5, overflow: 'auto' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!!error && !isLoading && <Alert severity="error" sx={{ m: 2 }}>Failed to load document types.</Alert>}

        {!isLoading && !error && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell width={110}>Order</TableCell>
                <TableCell width={90}>Active</TableCell>
                <TableCell width={180}>Flags</TableCell>
                <TableCell align="right" width={180}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data || []).map((item) => {
                const draft = draftById[item.id] || item;
                const changed = isRowChanged(draft);
                const locked = !!item.is_system;
                return (
                  <TableRow key={item.id}>
                    <TableCell sx={{ minWidth: 220 }}>
                      <TextField
                        size="small"
                        value={draft.name}
                        onChange={(e) => setDraftField(item.id, 'name', e.target.value)}
                        fullWidth
                        disabled={locked}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 260 }}>
                      <TextField
                        size="small"
                        value={draft.description || ''}
                        onChange={(e) => setDraftField(item.id, 'description', e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={draft.display_order ?? 0}
                        onChange={(e) => setDraftField(item.id, 'display_order', Number(e.target.value || 0))}
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={!!draft.is_active}
                        onChange={(e) => setDraftField(item.id, 'is_active', e.target.checked)}
                        disabled={!!item.is_default}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {item.is_default && <Chip size="small" color="success" variant="outlined" label="Default" />}
                        {item.is_system && <Chip size="small" variant="outlined" label="Built-in" />}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SaveIcon />}
                          onClick={() => updateMutation.mutate(item.id)}
                          disabled={!changed || updateMutation.isPending}
                        >
                          Save
                        </Button>
                        {!item.is_system && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => {
                              if (!window.confirm(`Delete document type "${item.name}"?`)) return;
                              deleteMutation.mutate(item.id);
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            Delete
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!data?.length && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No document types yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Box>

      {(updateMutation.isError || deleteMutation.isError) && (
        <Alert severity="error">
          {(updateMutation.error as any)?.response?.data?.message
            || (deleteMutation.error as any)?.response?.data?.message
            || 'Failed to update document types.'}
        </Alert>
      )}
    </Stack>
  );
}
