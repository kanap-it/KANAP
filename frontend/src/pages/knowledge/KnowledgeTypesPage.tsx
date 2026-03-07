import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import PageHeader from '../../components/PageHeader';

type DocumentTypeItem = {
  id: string;
  name: string;
  description: string | null;
  template_content: string | null;
  is_active: boolean;
  display_order: number;
};

export default function KnowledgeTypesPage() {
  const qc = useQueryClient();
  const [newName, setNewName] = React.useState('');
  const [newTemplate, setNewTemplate] = React.useState('');
  const [draftById, setDraftById] = React.useState<Record<string, DocumentTypeItem>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge-types'],
    queryFn: async () => (await api.get('/knowledge-types')).data as DocumentTypeItem[],
  });

  React.useEffect(() => {
    if (!data) return;
    const next = Object.fromEntries(data.map((item) => [item.id, { ...item }]));
    setDraftById(next);
  }, [data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/knowledge-types', {
        name: newName.trim(),
        template_content: newTemplate || null,
      });
    },
    onSuccess: async () => {
      setNewName('');
      setNewTemplate('');
      await qc.invalidateQueries({ queryKey: ['knowledge-types'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const draft = draftById[id];
      if (!draft) return;
      await api.patch(`/knowledge-types/${id}`, {
        name: draft.name,
        description: draft.description,
        template_content: draft.template_content,
        is_active: draft.is_active,
        display_order: Number.isFinite(Number(draft.display_order)) ? Number(draft.display_order) : 0,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['knowledge-types'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/knowledge-types/${id}`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['knowledge-types'] });
    },
  });

  const setDraftField = <K extends keyof DocumentTypeItem>(id: string, field: K, value: DocumentTypeItem[K]) => {
    setDraftById((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || ({} as DocumentTypeItem)),
        [field]: value,
      },
    }));
  };

  const isRowChanged = (row: DocumentTypeItem): boolean => {
    const original = (data || []).find((item) => item.id === row.id);
    if (!original) return false;
    return (
      original.name !== row.name ||
      (original.description || '') !== (row.description || '') ||
      (original.template_content || '') !== (row.template_content || '') ||
      !!original.is_active !== !!row.is_active ||
      Number(original.display_order || 0) !== Number(row.display_order || 0)
    );
  };

  return (
    <>
      <PageHeader title="Knowledge Types" />

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Create type</Typography>
          <TextField
            size="small"
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ maxWidth: 360 }}
          />
          <TextField
            multiline
            minRows={4}
            label="Template content (Markdown)"
            value={newTemplate}
            onChange={(e) => setNewTemplate(e.target.value)}
          />
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              Create Type
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!!error && !isLoading && <Alert severity="error">Failed to load knowledge types.</Alert>}

        {!isLoading && !error && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data || []).map((item) => {
                const draft = draftById[item.id] || item;
                const changed = isRowChanged(draft);
                return (
                <TableRow key={item.id}>
                  <TableCell sx={{ minWidth: 220 }}>
                    <TextField
                      size="small"
                      value={draft.name}
                      onChange={(e) => setDraftField(item.id, 'name', e.target.value)}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell sx={{ width: 110 }}>
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
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 360 }}>
                    <TextField
                      size="small"
                      multiline
                      minRows={3}
                      maxRows={8}
                      value={draft.template_content || ''}
                      onChange={(e) => setDraftField(item.id, 'template_content', e.target.value)}
                      fullWidth
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
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
                );
              })}
              {(data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      No document types yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </>
  );
}
