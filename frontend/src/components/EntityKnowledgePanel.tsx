import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
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
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export type EntityKnowledgeType = 'applications' | 'assets' | 'projects' | 'requests' | 'tasks';

type EntityKnowledgePanelProps = {
  entityType: EntityKnowledgeType;
  entityId: string;
  canCreate?: boolean;
};

type LinkedDocument = {
  id: string;
  item_number: number;
  title: string;
  summary: string | null;
  status: string;
  updated_at: string | null;
  created_at: string | null;
};

type DocumentListItem = {
  id: string;
  item_number: number;
  item_ref?: string;
  title: string;
  status: string;
  updated_at?: string | null;
};

type DocumentsListResponse = {
  items: DocumentListItem[];
  total: number;
};

type LinkedDocumentsResponse = {
  access: 'granted' | 'restricted';
  items: LinkedDocument[];
  total: number;
};

type DocumentDetailsResponse = {
  id: string;
  item_number: number;
  item_ref?: string;
  relations?: Partial<Record<EntityKnowledgeType, Array<string | { id?: string | null }>>>;
};

const ENTITY_ENDPOINTS: Record<EntityKnowledgeType, string> = {
  applications: '/applications',
  assets: '/assets',
  projects: '/portfolio/projects',
  requests: '/portfolio/requests',
  tasks: '/tasks',
};

const RELATION_KEYS: Record<EntityKnowledgeType, string> = {
  applications: 'applications',
  assets: 'assets',
  projects: 'projects',
  requests: 'requests',
  tasks: 'tasks',
};

const RELATION_BODY_KEYS: Record<EntityKnowledgeType, string> = {
  applications: 'application_ids',
  assets: 'asset_ids',
  projects: 'project_ids',
  requests: 'request_ids',
  tasks: 'task_ids',
};

function uniqueIds(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export default function EntityKnowledgePanel({ entityType, entityId, canCreate = false }: EntityKnowledgePanelProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [selectedDoc, setSelectedDoc] = React.useState<DocumentListItem | null>(null);

  const endpoint = ENTITY_ENDPOINTS[entityType];

  const { data, isLoading, error } = useQuery({
    queryKey: ['entity-knowledge', entityType, entityId],
    queryFn: async () => {
      const res = await api.get<LinkedDocumentsResponse>(`${endpoint}/${entityId}/knowledge`);
      return res.data;
    },
    enabled: !!entityId,
  });

  const { data: docsList } = useQuery({
    queryKey: ['knowledge-link-options', entityType, entityId, search],
    queryFn: async () => {
      const res = await api.get<DocumentsListResponse>('/knowledge', {
        params: {
          q: search.trim() || undefined,
          limit: 50,
          sort: 'updated_at:DESC',
        },
      });
      return res.data;
    },
    enabled: canCreate && !!entityId,
  });

  const linkedDocIds = React.useMemo(
    () => new Set((data?.items || []).map((item) => item.id)),
    [data],
  );

  const availableDocs = React.useMemo(
    () => (docsList?.items || []).filter((item) => !linkedDocIds.has(item.id)),
    [docsList?.items, linkedDocIds],
  );

  const linkedItems = data?.items || [];
  const isRestricted = data?.access === 'restricted';
  const restrictedCount = Number(data?.total || 0);

  const updateEntityRelationOnDocument = React.useCallback(
    async (documentId: string, mode: 'link' | 'unlink') => {
      const details = await api.get<DocumentDetailsResponse>(`/knowledge/${documentId}`);
      const relationKey = RELATION_KEYS[entityType] as EntityKnowledgeType;
      const relationBodyKey = RELATION_BODY_KEYS[entityType];
      const current = Array.isArray(details.data?.relations?.[relationKey])
        ? (details.data.relations?.[relationKey] || [])
            .map((entry) => typeof entry === 'string' ? entry : String(entry?.id || '').trim())
            .filter(Boolean)
        : [];
      const next = mode === 'link'
        ? uniqueIds([...current, entityId])
        : current.filter((id) => id !== entityId);

      await api.post(`/knowledge/${documentId}/relations/${entityType}/bulk-replace`, {
        [relationBodyKey]: next,
      });
    },
    [entityId, entityType],
  );

  const createLinkedMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: `New linked knowledge (${entityType.slice(0, -1)})`,
        content_markdown: '',
        status: 'draft',
        relations: {
          [RELATION_KEYS[entityType]]: [entityId],
        },
      };
      const res = await api.post('/knowledge', body);
      return res.data;
    },
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ['entity-knowledge', entityType, entityId] });
      const ref = created?.item_ref || `DOC-${created?.item_number}`;
      navigate(`/knowledge/${ref}`);
    },
  });

  const linkExistingMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await updateEntityRelationOnDocument(documentId, 'link');
    },
    onSuccess: async () => {
      setSelectedDoc(null);
      await qc.invalidateQueries({ queryKey: ['entity-knowledge', entityType, entityId] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await updateEntityRelationOnDocument(documentId, 'unlink');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['entity-knowledge', entityType, entityId] });
    },
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2">Linked Knowledge</Typography>
          {canCreate && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => createLinkedMutation.mutate()}
                disabled={createLinkedMutation.isPending}
              >
                Create Linked
              </Button>
            </Stack>
          )}
        </Stack>

        {canCreate && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Autocomplete<DocumentListItem, false, false, false>
              size="small"
              options={availableDocs}
              value={selectedDoc}
              onChange={(_, value) => setSelectedDoc(value)}
              inputValue={search}
              onInputChange={(_, value) => setSearch(value)}
              getOptionLabel={(option) => option.item_ref || `DOC-${option.item_number} - ${option.title}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Link existing knowledge" placeholder="Search by title or ref" />
              )}
              sx={{ minWidth: 320, flex: 1 }}
            />
            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={() => {
                if (!selectedDoc) return;
                linkExistingMutation.mutate(selectedDoc.id);
              }}
              disabled={!selectedDoc || linkExistingMutation.isPending}
            >
              Link
            </Button>
          </Stack>
        )}

        {(linkExistingMutation.isError || unlinkMutation.isError || createLinkedMutation.isError) && (
          <Alert severity="error">
            Failed to update knowledge links.
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!!error && !isLoading && (
          <Alert severity="error">Failed to load linked knowledge.</Alert>
        )}

        {!isLoading && !error && isRestricted && restrictedCount > 0 && (
          <Alert severity="info">
            {restrictedCount} linked knowledge {restrictedCount === 1 ? 'document is' : 'documents are'} available for this item.
            You need the Knowledge Reader role to view them.
          </Alert>
        )}

        {!isLoading && !error && !isRestricted && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ref</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Open</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {linkedItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{`DOC-${item.item_number}`}</TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell>{item.updated_at ? new Date(item.updated_at).toLocaleString() : ''}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        endIcon={<OpenInNewIcon fontSize="small" />}
                        onClick={() => navigate(`/knowledge/DOC-${item.item_number}`)}
                      >
                        Open
                      </Button>
                      {canCreate && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => unlinkMutation.mutate(item.id)}
                          disabled={unlinkMutation.isPending}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {linkedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">No linked knowledge.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {!isLoading && !error && isRestricted && restrictedCount === 0 && (
          <Typography variant="body2" color="text.secondary">No linked knowledge.</Typography>
        )}
      </Stack>
    </Paper>
  );
}
