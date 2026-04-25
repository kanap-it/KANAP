import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
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
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export type EntityKnowledgeType = 'applications' | 'assets' | 'projects' | 'requests' | 'tasks';

type EntityKnowledgePanelProps = {
  entityType: EntityKnowledgeType;
  entityId: string;
  canCreate?: boolean;
  variant?: 'default' | 'sidebar';
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

type DocumentLibrary = {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
  display_order: number;
};

type TemplateListItem = {
  id: string;
  item_number: number;
  title: string;
  document_type_id: string | null;
  document_type_name: string | null;
};

type DocumentDetailsResponse = {
  id: string;
  item_number: number;
  item_ref?: string;
  relations?: Partial<Record<EntityKnowledgeType, Array<string | { id?: string | null }>>>;
};

type KnowledgeContextSource = {
  entity_type: EntityKnowledgeType;
  entity_id: string;
  item_number: number | null;
  name: string;
  status: string | null;
};

type KnowledgeContextItem = {
  id: string;
  item_number: number;
  title: string;
  summary: string | null;
  status: string;
  updated_at: string | null;
  created_at: string | null;
  provenance: KnowledgeContextSource[];
};

type KnowledgeContextGroup = {
  key:
    | 'direct'
    | 'resulting_projects'
    | 'source_requests'
    | 'dependencies'
    | 'linked_requests'
    | 'linked_projects'
    | 'linked_applications'
    | 'linked_assets';
  label: string;
  linked_via_label: string;
  total: number;
  items: KnowledgeContextItem[];
};

type DisplayKnowledgeContextItem = KnowledgeContextItem & {
  linked_via_label: string;
};

type DisplayKnowledgeContextGroup = {
  key: 'direct' | 'related_documents';
  label: string;
  total: number;
  items: DisplayKnowledgeContextItem[];
};

type KnowledgeContextResponse = {
  access: 'granted' | 'restricted';
  total: number;
  groups: KnowledgeContextGroup[];
};

const ENTITY_ENDPOINTS: Record<EntityKnowledgeType, string> = {
  applications: '/applications',
  assets: '/assets',
  projects: '/portfolio/projects',
  requests: '/portfolio/requests',
  tasks: '/tasks',
};

const ENTITY_REF_PREFIXES: Partial<Record<EntityKnowledgeType, string>> = {
  projects: 'PRJ',
  requests: 'REQ',
  tasks: 'TSK',
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

const TEMPLATE_LIBRARY_SLUG = 'templates';

function uniqueIds(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatDocumentOptionLabel(option: Pick<DocumentListItem, 'title' | 'item_ref' | 'item_number'>): string {
  const ref = option.item_ref || `DOC-${option.item_number}`;
  const title = String(option.title || '').trim();
  return title ? `${title} (${ref})` : ref;
}

function mergeProvenance(
  current: KnowledgeContextSource[],
  next: KnowledgeContextSource[],
): KnowledgeContextSource[] {
  const byKey = new Map<string, KnowledgeContextSource>();
  for (const source of [...current, ...next]) {
    byKey.set(`${source.entity_type}:${source.entity_id}`, source);
  }
  return Array.from(byKey.values());
}

function dedupeKnowledgeItems(
  items: DisplayKnowledgeContextItem[],
): DisplayKnowledgeContextItem[] {
  const byId = new Map<string, DisplayKnowledgeContextItem>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }

    const linkedViaLabels = uniqueIds([
      existing.linked_via_label,
      item.linked_via_label,
    ]);
    byId.set(item.id, {
      ...existing,
      linked_via_label: linkedViaLabels.join(' · '),
      provenance: mergeProvenance(existing.provenance, item.provenance),
    });
  }
  return Array.from(byId.values());
}

function formatDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSourceLabel(source: KnowledgeContextSource): string {
  const prefix = ENTITY_REF_PREFIXES[source.entity_type];
  const ref = prefix && source.item_number != null ? `${prefix}-${source.item_number}` : null;
  const name = String(source.name || '').trim();
  if (ref && name) return `${ref} ${name}`;
  return ref || name || source.entity_id;
}

function KnowledgeGroupTable({
  canCreate,
  group,
  onUnlink,
  unlinkPending,
}: {
  canCreate: boolean;
  group: DisplayKnowledgeContextGroup;
  onUnlink: (documentId: string) => void;
  unlinkPending: boolean;
}) {
  const { t } = useTranslation('common');
  const showUnlink = canCreate && group.key === 'direct';

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {group.label}
          </Typography>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('knowledgePanel.ref')}</TableCell>
              <TableCell>{t('knowledgePanel.titleColumn')}</TableCell>
              <TableCell>{t('knowledgePanel.statusColumn')}</TableCell>
              <TableCell>{t('knowledgePanel.linkedVia')}</TableCell>
              <TableCell>{t('knowledgePanel.sourceObject')}</TableCell>
              <TableCell>{t('knowledgePanel.updatedColumn')}</TableCell>
              <TableCell align="right">{t('knowledgePanel.openColumn')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {group.items.map((item) => (
              <TableRow key={`${group.key}:${item.id}:${item.linked_via_label}`} hover>
                <TableCell>{`DOC-${item.item_number}`}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.linked_via_label}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    {item.provenance.map((source) => (
                      <Box key={`${item.id}:${source.entity_type}:${source.entity_id}`}>
                        <Typography variant="body2">{formatSourceLabel(source)}</Typography>
                        {source.status && (
                          <Typography variant="caption" color="text.secondary">
                            {source.status}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>{formatDateTime(item.updated_at || item.created_at)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNewIcon fontSize="small" />}
                      component="a"
                      href={`/knowledge/DOC-${item.item_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('buttons.open')}
                    </Button>
                    {showUnlink && (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={t('knowledgePanel.unlinkDocument')}
                        onClick={() => onUnlink(item.id)}
                        disabled={unlinkPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
    </Paper>
  );
}

function formatProvenanceSummary(provenance: KnowledgeContextSource[]): string {
  if (!Array.isArray(provenance) || provenance.length === 0) return '';
  const first = formatSourceLabel(provenance[0]);
  if (provenance.length === 1) return first;
  return `${first} +${provenance.length - 1} more`;
}

function SidebarKnowledgeGroupList({
  canCreate,
  group,
  onUnlink,
  unlinkPending,
}: {
  canCreate: boolean;
  group: DisplayKnowledgeContextGroup;
  onUnlink: (documentId: string) => void;
  unlinkPending: boolean;
}) {
  const { t } = useTranslation('common');
  const showUnlink = canCreate && group.key === 'direct';

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {group.label}
      </Typography>
      {group.items.map((item) => (
        <Paper key={`${group.key}:${item.id}:${item.linked_via_label}`} variant="outlined" sx={{ p: 1.25 }}>
          <Stack spacing={0.75}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', fontFamily: 'monospace', lineHeight: 1.2 }}
                >
                  {`DOC-${item.item_number}`}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={item.title}>
                  {item.title}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                <IconButton
                  size="small"
                  component="a"
                  href={`/knowledge/DOC-${item.item_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('knowledgePanel.openKnowledge')}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
                {showUnlink && (
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Unlink knowledge document"
                    title={t('knowledgePanel.unlinkDocument')}
                    onClick={() => onUnlink(item.id)}
                    disabled={unlinkPending}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary" noWrap>
                {item.status}
              </Typography>
              {group.key !== 'direct' && (
                <Typography variant="caption" color="text.secondary" noWrap title={item.linked_via_label}>
                  {item.linked_via_label}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" noWrap title={formatDateTime(item.updated_at || item.created_at)}>
                {formatDateTime(item.updated_at || item.created_at)}
              </Typography>
            </Stack>

            {item.provenance.length > 0 && (
              <Typography variant="caption" color="text.secondary" noWrap title={item.provenance.map(formatSourceLabel).join(', ')}>
                {formatProvenanceSummary(item.provenance)}
              </Typography>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default function EntityKnowledgePanel({
  entityType,
  entityId,
  canCreate = false,
  variant = 'default',
}: EntityKnowledgePanelProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [selectedDoc, setSelectedDoc] = React.useState<DocumentListItem | null>(null);
  const [linkOptionsOpen, setLinkOptionsOpen] = React.useState(false);
  const [newDocAnchorEl, setNewDocAnchorEl] = React.useState<null | HTMLElement>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = React.useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const deferredSearch = React.useDeferredValue(search.trim());

  const endpoint = ENTITY_ENDPOINTS[entityType];

  const invalidateKnowledgeQueries = React.useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['entity-knowledge-context', entityType, entityId] }),
      qc.invalidateQueries({ queryKey: ['entity-knowledge', entityType, entityId] }),
      entityType === 'projects'
        ? qc.invalidateQueries({ queryKey: ['project-summary-knowledge-context', entityId] })
        : Promise.resolve(),
      entityType === 'requests'
        ? qc.invalidateQueries({ queryKey: ['request-summary-knowledge-context', entityId] })
        : Promise.resolve(),
    ]);
  }, [entityId, entityType, qc]);

  const { data: contextData, isLoading, error } = useQuery({
    queryKey: ['entity-knowledge-context', entityType, entityId],
    queryFn: async () => {
      const res = await api.get<KnowledgeContextResponse>(`${endpoint}/${entityId}/knowledge-context`);
      return res.data;
    },
    enabled: !!entityId,
  });

  const { data: libraries = [] } = useQuery({
    queryKey: ['knowledge-libraries'],
    queryFn: async () => (await api.get('/knowledge-libraries')).data as DocumentLibrary[],
    enabled: canCreate,
    staleTime: 5 * 60_000,
  });

  const { data: docsList, isFetching: isSearchingDocs } = useQuery({
    queryKey: ['knowledge-link-options', entityType, entityId, deferredSearch],
    queryFn: async () => {
      const params = {
        limit: 50,
        sort: 'title:ASC',
      };
      const res = deferredSearch
        ? await api.get<DocumentsListResponse>('/knowledge/search', {
            params: {
              ...params,
              q: deferredSearch,
            },
          })
        : await api.get<DocumentsListResponse>('/knowledge', { params });
      return res.data;
    },
    enabled: canCreate && !!entityId && (linkOptionsOpen || deferredSearch.length > 0),
    staleTime: 30_000,
  });

  const templatesLibrary = React.useMemo(
    () => libraries.find((row) => row.slug === TEMPLATE_LIBRARY_SLUG) || null,
    [libraries],
  );

  const { data: templatesData } = useQuery({
    queryKey: ['knowledge', 'templates-library', templatesLibrary?.id],
    queryFn: async () => {
      const res = await api.get('/knowledge', {
        params: {
          library_id: templatesLibrary?.id,
          status: 'published',
          limit: 200,
          sort: 'updated_at:DESC',
        },
      });
      return res.data as { items: TemplateListItem[] };
    },
    enabled: canCreate && templatePickerOpen && !!templatesLibrary?.id,
  });

  const groupedTemplates = React.useMemo(() => {
    const groups: Array<{ typeName: string; items: TemplateListItem[] }> = [];
    const byType = new Map<string, TemplateListItem[]>();
    for (const item of templatesData?.items || []) {
      const typeName = String(item.document_type_name || 'Document').trim() || 'Document';
      if (!byType.has(typeName)) byType.set(typeName, []);
      byType.get(typeName)!.push(item);
    }
    Array.from(byType.keys())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .forEach((typeName) => {
        groups.push({
          typeName,
          items: (byType.get(typeName) || []).sort((a, b) => {
            if (a.title === b.title) return Number(b.item_number || 0) - Number(a.item_number || 0);
            return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
          }),
        });
      });
    return groups;
  }, [templatesData?.items]);

  const groups = contextData?.groups || [];
  const directGroup = React.useMemo(
    () => groups.find((group) => group.key === 'direct') || null,
    [groups],
  );
  const displayGroups = React.useMemo<DisplayKnowledgeContextGroup[]>(() => {
    const directItems = directGroup
      ? dedupeKnowledgeItems(directGroup.items.map((item) => ({
          ...item,
          linked_via_label: directGroup.linked_via_label,
        })))
      : [];
    const directDocumentIds = new Set(directItems.map((item) => item.id));
    const directDisplayGroup = directGroup
      ? {
          key: 'direct' as const,
          label: 'Linked documents',
          total: directItems.length,
          items: directItems,
        }
      : null;
    const relatedItems = dedupeKnowledgeItems(
      groups
        .filter((group) => group.key !== 'direct')
        .flatMap((group) => group.items.map((item) => ({
          ...item,
          linked_via_label: group.linked_via_label,
        }))),
    )
      .filter((item) => !directDocumentIds.has(item.id));
    const relatedDisplayGroup = relatedItems.length > 0
      ? {
          key: 'related_documents' as const,
          label: 'Related documents',
          total: relatedItems.length,
          items: relatedItems,
        }
      : null;

    return [directDisplayGroup, relatedDisplayGroup].filter((group): group is DisplayKnowledgeContextGroup => !!group);
  }, [directGroup, groups]);
  const linkedDocIds = React.useMemo(
    () => new Set((directGroup?.items || []).map((item) => item.id)),
    [directGroup],
  );
  const availableDocs = React.useMemo(
    () => (docsList?.items || []).filter((item) => !linkedDocIds.has(item.id)),
    [docsList?.items, linkedDocIds],
  );

  const isRestricted = contextData?.access === 'restricted';
  const restrictedCount = Number(contextData?.total || 0);
  const isSidebar = variant === 'sidebar';
  const openCreatedDocument = React.useCallback((created: any) => {
    const ref = created?.item_ref || `DOC-${created?.item_number}`;
    const opened = window.open(`/knowledge/${ref}`, '_blank', 'noopener,noreferrer');
    if (!opened) {
      navigate(`/knowledge/${ref}`);
    }
  }, [navigate]);

  const openTemplatePicker = React.useCallback(() => {
    setTemplatePickerOpen(true);
    setSelectedTemplateId('');
  }, []);

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
    mutationFn: async (params?: { templateDocumentId?: string | null; templateTitle?: string | null }) => {
      const templateTitle = String(params?.templateTitle || '').trim();
      const body = {
        title: templateTitle || `New linked knowledge (${entityType.slice(0, -1)})`,
        content_markdown: '',
        status: 'draft',
        relations: {
          [RELATION_KEYS[entityType]]: [entityId],
        },
        ...(params?.templateDocumentId ? { template_document_id: params.templateDocumentId } : {}),
      };
      const res = await api.post('/knowledge', body);
      return res.data;
    },
    onSuccess: async (created) => {
      await invalidateKnowledgeQueries();
      openCreatedDocument(created);
    },
  });

  const linkExistingMutation = useMutation({
    mutationFn: async (document: DocumentListItem) => {
      await updateEntityRelationOnDocument(document.id, 'link');
      return document;
    },
    onSuccess: async () => {
      setSelectedDoc(null);
      setSearch('');
      await invalidateKnowledgeQueries();
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await updateEntityRelationOnDocument(documentId, 'unlink');
      return documentId;
    },
    onSuccess: async () => {
      await invalidateKnowledgeQueries();
    },
  });

  const handleCreateBlank = React.useCallback(() => {
    setNewDocAnchorEl(null);
    createLinkedMutation.mutate({});
  }, [createLinkedMutation]);

  const handleCreateFromTemplate = React.useCallback(() => {
    const template = (templatesData?.items || []).find((item) => item.id === selectedTemplateId) || null;
    if (!template) return;
    const sp = new URLSearchParams();
    sp.set(`${entityType.slice(0, -1)}_id`, entityId);
    sp.set('template_document_id', template.id);
    navigate(`/knowledge/new?${sp.toString()}`);
    setTemplatePickerOpen(false);
    setSelectedTemplateId('');
  }, [entityId, entityType, navigate, selectedTemplateId, templatesData?.items]);

  const handleExistingKnowledgeSelected = React.useCallback((document: DocumentListItem | null) => {
    setSelectedDoc(document);
    if (!document) return;
    linkExistingMutation.mutate(document);
  }, [linkExistingMutation]);

  const headerActions = canCreate ? (
    isSidebar ? (
      <Stack spacing={1}>
        <ButtonGroup variant="contained" size="small" fullWidth>
          <Button
            startIcon={<AddIcon />}
            onClick={handleCreateBlank}
            disabled={createLinkedMutation.isPending}
          >
            {t('knowledgePanel.newDocumentLower')}
          </Button>
          <Button
            onClick={(event) => setNewDocAnchorEl(event.currentTarget)}
            disabled={createLinkedMutation.isPending}
            sx={{ px: 0.5, minWidth: 'auto' }}
          >
            <ArrowDropDownIcon />
          </Button>
        </ButtonGroup>
        <Autocomplete<DocumentListItem, false, false, false>
          size="small"
          options={availableDocs}
          open={linkOptionsOpen}
          onOpen={() => setLinkOptionsOpen(true)}
          onClose={() => setLinkOptionsOpen(false)}
          value={selectedDoc}
          onChange={(_, value) => handleExistingKnowledgeSelected(value)}
          inputValue={search}
          onInputChange={(_, value) => setSearch(value)}
          loading={canCreate && !!entityId && isSearchingDocs}
          getOptionLabel={formatDocumentOptionLabel}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText={deferredSearch ? t('knowledgePanel.noMatchingKnowledge') : t('knowledgePanel.noAvailableKnowledge')}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ minHeight: 36, py: 0.5 }}>
              <Typography variant="body2" noWrap title={formatDocumentOptionLabel(option)}>
                {formatDocumentOptionLabel(option)}
              </Typography>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('knowledgePanel.linkExisting')}
              placeholder={t('knowledgePanel.searchByNameOrRef')}
              InputLabelProps={{ shrink: true }}
            />
          )}
          ListboxProps={{
            sx: {
              '& .MuiAutocomplete-option': {
                fontSize: '0.85rem',
              },
            },
          }}
          sx={{
            width: '100%',
            '& .MuiFormLabel-root': { fontSize: '0.9rem' },
            '& .MuiInputBase-root': { fontSize: '0.9rem' },
            '& .MuiInputBase-input': { fontSize: '0.9rem' },
          }}
          disabled={linkExistingMutation.isPending}
        />
      </Stack>
    ) : (
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack spacing={0.75}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('knowledgePanel.title')}
            </Typography>
          </Stack>

          <ButtonGroup variant="contained" size="small">
            <Button
              startIcon={<AddIcon />}
              onClick={handleCreateBlank}
              disabled={createLinkedMutation.isPending}
            >
              {t('knowledgePanel.newDocument')}
            </Button>
            <Button
              onClick={(event) => setNewDocAnchorEl(event.currentTarget)}
              disabled={createLinkedMutation.isPending}
              sx={{ px: 0.5, minWidth: 'auto' }}
            >
              <ArrowDropDownIcon />
            </Button>
          </ButtonGroup>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Autocomplete<DocumentListItem, false, false, false>
            size="small"
            options={availableDocs}
            open={linkOptionsOpen}
            onOpen={() => setLinkOptionsOpen(true)}
            onClose={() => setLinkOptionsOpen(false)}
            value={selectedDoc}
            onChange={(_, value) => handleExistingKnowledgeSelected(value)}
            inputValue={search}
            onInputChange={(_, value) => setSearch(value)}
            loading={canCreate && !!entityId && isSearchingDocs}
            getOptionLabel={formatDocumentOptionLabel}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText={deferredSearch ? 'No matching knowledge' : 'No available knowledge'}
            renderInput={(params) => (
              <TextField {...params} label={t('knowledgePanel.linkExistingKnowledge')} placeholder="Search by name or ref" />
            )}
            sx={{ minWidth: 320, flex: 1 }}
            disabled={linkExistingMutation.isPending}
          />
        </Stack>
      </Stack>
    )
  ) : (!isSidebar ? (
    <Stack spacing={0.75}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Knowledge
      </Typography>
    </Stack>
  ) : null);

  return (
    <Stack spacing={isSidebar ? 1.5 : 2}>
      {headerActions && (
        isSidebar ? (
          <Stack spacing={1.25}>
            {headerActions}
            {(linkExistingMutation.isError || unlinkMutation.isError || createLinkedMutation.isError) && (
              <Alert severity="error">
                {t('knowledgePanel.failedToUpdateLinks')}
              </Alert>
            )}
          </Stack>
        ) : (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              {headerActions}
              {(linkExistingMutation.isError || unlinkMutation.isError || createLinkedMutation.isError) && (
                <Alert severity="error">
                  Failed to update knowledge links.
                </Alert>
              )}
            </Stack>
          </Paper>
        )
      )}

      <Menu
        anchorEl={newDocAnchorEl}
        open={Boolean(newDocAnchorEl)}
        onClose={() => setNewDocAnchorEl(null)}
      >
        <MenuItem onClick={handleCreateBlank}>
          {t('knowledgePanel.blankDocument')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setNewDocAnchorEl(null);
            openTemplatePicker();
          }}
          disabled={!templatesLibrary}
        >
          {t('knowledgePanel.fromTemplate')}
        </MenuItem>
      </Menu>

      <Dialog open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('knowledgePanel.selectTemplate')}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            margin="dense"
            label={t('labels.template')}
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            {groupedTemplates.map((group) => ([
              <ListSubheader key={`${group.typeName}-header`} disableSticky>
                {group.typeName}
              </ListSubheader>,
              ...group.items.map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {`DOC-${row.item_number} - ${row.title}`}
                </MenuItem>
              )),
            ]))}
          </TextField>
          {!templatesData?.items?.length && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('knowledgePanel.noTemplatesAvailable')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplatePickerOpen(false)}>{t('buttons.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCreateFromTemplate}
            disabled={!selectedTemplateId || createLinkedMutation.isPending}
          >
            {t('knowledgePanel.useTemplate')}
          </Button>
        </DialogActions>
      </Dialog>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: isSidebar ? 3 : 6 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!!error && !isLoading && (
        <Alert severity="error">{t('knowledgePanel.failedToLoadContext')}</Alert>
      )}

      {!isLoading && !error && isRestricted && restrictedCount > 0 && (
        <Alert severity="info">
          {restrictedCount} standalone knowledge {restrictedCount === 1 ? 'document is' : 'documents are'} available for this item.
          You need the Knowledge Reader role to view them.
        </Alert>
      )}

      {!isLoading && !error && isRestricted && restrictedCount === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('knowledgePanel.noStandaloneDocuments')}
        </Typography>
      )}

      {!isLoading && !error && !isRestricted && displayGroups.map((group) => (
        isSidebar ? (
          <SidebarKnowledgeGroupList
            key={group.key}
            canCreate={canCreate}
            group={group}
            onUnlink={(documentId) => unlinkMutation.mutate(documentId)}
            unlinkPending={unlinkMutation.isPending}
          />
        ) : (
          <KnowledgeGroupTable
            key={group.key}
            canCreate={canCreate}
            group={group}
            onUnlink={(documentId) => unlinkMutation.mutate(documentId)}
            unlinkPending={unlinkMutation.isPending}
          />
        )
      ))}

      {!isLoading && !error && !isRestricted && displayGroups.length === 0 && (
        isSidebar ? (
          <Typography variant="body2" color="text.secondary">
            No standalone knowledge documents.
          </Typography>
        ) : (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No standalone knowledge documents.
            </Typography>
          </Paper>
        )
      )}
    </Stack>
  );
}
