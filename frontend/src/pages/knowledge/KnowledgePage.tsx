import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  ListSubheader,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import type { ICellRendererParams } from 'ag-grid-community';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import DeleteSelectedButton from '../../components/DeleteSelectedButton';
import ServerDataGrid from '../../components/ServerDataGrid';
import type { EnhancedColDef } from '../../components/ServerDataGrid';
import CheckboxSetFilter from '../../components/CheckboxSetFilter';
import CheckboxSetFloatingFilter from '../../components/CheckboxSetFloatingFilter';
import { useAuth } from '../../auth/AuthContext';
import { useGridScopePreference } from '../../hooks/useGridScopePreference';
import FolderTreePanel, { type DraggedFolderState as FolderTreeDraggedFolderState } from './components/FolderTreePanel';
import KnowledgeFolderMoveDialog from './components/KnowledgeFolderMoveDialog';
import KnowledgeMoveDialog from './components/KnowledgeMoveDialog';
import ValidatedBadge from './components/ValidatedBadge';
import KnowledgeTypesManager from './components/KnowledgeTypesManager';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
  archived: 'Archived',
  obsolete: 'Obsolete',
};

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'secondary'> = {
  draft: 'default',
  in_review: 'warning',
  published: 'success',
  archived: 'secondary',
  obsolete: 'default',
};

const TEMPLATE_LIBRARY_SLUG = 'templates';

type DocumentRow = {
  id: string;
  item_number: number;
  item_ref: string;
  title: string;
  status: string;
  revision: number | null;
  current_version_number: number | null;
  document_type_name: string | null;
  primary_owner_name: string | null;
  classification_summary: string | null;
  application_names: string | null;
  asset_names: string | null;
  folder_id: string | null;
  library_id: string | null;
  folder_name: string | null;
  template_name: string | null;
  library_name: string | null;
  validated_revision: number | null;
  validated_at: string | null;
  is_validated_current_revision: boolean;
  is_managed_integrated_document?: boolean;
  updated_at: string | null;
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

type DraggedDocumentState = {
  ids: string[];
  rows: DocumentRow[];
  libraryId: string;
  librarySlug: string;
  count: number;
};

type DraggedFolderState = FolderTreeDraggedFolderState & {
  librarySlug: string;
  libraryName: string | null;
};

function StatusCellRenderer(props: any) {
  const status = props.value;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
      <Chip
        label={STATUS_LABELS[status] || status}
        color={STATUS_COLORS[status] || 'default'}
        size="small"
      />
      {props.data?.is_validated_current_revision && (
        <ValidatedBadge size="small" iconOnly />
      )}
    </Stack>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export default function KnowledgePage() {
  const { hasLevel, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const canManageDocuments = hasLevel('knowledge', 'member');
  const canManageLibraries = hasLevel('knowledge', 'admin');
  const canMoveAcrossLibraries = canManageLibraries;

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlScope = useMemo(() => {
    const scope = queryParams.get('docScope');
    if (scope === 'my' || scope === 'team' || scope === 'all') return scope;
    return null;
  }, [queryParams]);

  const [docScope, setDocScope] = useGridScopePreference('knowledge', urlScope);

  const searchAllLibraries = queryParams.get('allLibraries') === '1';
  const librarySlugFromUrl = queryParams.get('library') || '';
  const selectedFolderId = searchAllLibraries ? null : (queryParams.get('folder_id') || null);

  const updateQuery = useCallback((patch: Record<string, string | null>, replace = false) => {
    const sp = new URLSearchParams(location.search);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) sp.delete(key);
      else sp.set(key, value);
    });
    const next = sp.toString();
    navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace });
  }, [location.pathname, location.search, navigate]);

  const { data: libraries = [] } = useQuery({
    queryKey: ['knowledge-libraries'],
    queryFn: async () => (await api.get('/knowledge-libraries')).data as DocumentLibrary[],
  });

  const sortedLibraries = useMemo(() => {
    const normal = libraries.filter((l) => l.slug !== 'templates');
    const templates = libraries.filter((l) => l.slug === 'templates');
    return [...normal, ...templates];
  }, [libraries]);

  const activeLibrary = useMemo(() => {
    if (!libraries.length) return null;
    if (librarySlugFromUrl) {
      const match = libraries.find((row) => row.slug === librarySlugFromUrl);
      if (match) return match;
    }
    return libraries.find((row) => !row.is_system) || libraries[0];
  }, [libraries, librarySlugFromUrl]);

  React.useEffect(() => {
    if (!activeLibrary) return;
    const currentSlug = queryParams.get('library');
    if (currentSlug === activeLibrary.slug) return;

    const sp = new URLSearchParams(location.search);
    sp.set('library', activeLibrary.slug);
    const next = sp.toString();
    navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
  }, [activeLibrary, location.pathname, location.search, navigate, queryParams]);

  const { data: myTeamConfig, isFetched: isTeamConfigFetched } = useQuery({
    queryKey: ['my-team-config', profile?.id],
    queryFn: async () => {
      const res = await api.get<{ id: string; team_id?: string | null }>(`/portfolio/team-members/by-user/${profile?.id}`);
      return res.data;
    },
    enabled: !!profile?.id,
  });

  const hasTeam = !!myTeamConfig?.team_id;

  React.useEffect(() => {
    if (docScope === 'team' && isTeamConfigFetched && !hasTeam) {
      setDocScope('my');
    }
  }, [docScope, isTeamConfigFetched, hasTeam, setDocScope]);

  const extraParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (docScope === 'my') params.ownerUserId = profile?.id;
    else if (docScope === 'team' && hasTeam) params.teamId = myTeamConfig?.team_id;
    if (!searchAllLibraries && activeLibrary?.id) params.library_id = activeLibrary.id;
    if (!searchAllLibraries && selectedFolderId) params.folder_id = selectedFolderId;
    return params;
  }, [docScope, profile?.id, hasTeam, myTeamConfig?.team_id, searchAllLibraries, activeLibrary?.id, selectedFolderId]);

  const lastQueryRef = useRef<{ sort: string; q: string; filters: any } | null>(null);
  const gridApiRef = useRef<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState<DocumentRow[]>([]);
  const [draggedDocuments, setDraggedDocuments] = useState<DraggedDocumentState | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<DraggedFolderState | null>(null);
  const [dragHoveredFolderId, setDragHoveredFolderId] = useState<string | null>(null);
  const [dragHoveredLibraryId, setDragHoveredLibraryId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogRowsOverride, setMoveDialogRowsOverride] = useState<DocumentRow[] | null>(null);
  const [moveDialogTargetLibraryId, setMoveDialogTargetLibraryId] = useState<string | null>(null);
  const [folderMoveDialogOpen, setFolderMoveDialogOpen] = useState(false);
  const [folderMoveDialogFolder, setFolderMoveDialogFolder] = useState<DraggedFolderState | null>(null);
  const [folderMoveDialogTargetLibraryId, setFolderMoveDialogTargetLibraryId] = useState<string | null>(null);
  const [moveSnackbar, setMoveSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'updated_at:DESC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    sp.set('docScope', docScope);
    if (activeLibrary?.slug) sp.set('library', activeLibrary.slug);
    sp.set('allLibraries', searchAllLibraries ? '1' : '0');
    if (!searchAllLibraries && selectedFolderId) sp.set('folder_id', selectedFolderId);
    if (docScope === 'my' && profile?.id) {
      sp.set('ownerUserId', profile.id);
    } else if (docScope === 'team' && myTeamConfig?.team_id) {
      sp.set('teamId', myTeamConfig.team_id);
    }
    return sp;
  }, [docScope, activeLibrary?.slug, searchAllLibraries, selectedFolderId, profile?.id, myTeamConfig?.team_id]);

  const clearSelection = useCallback(() => {
    setSelectedRows([]);
    try {
      gridApiRef.current?.deselectAll?.();
    } catch {
      // Ignore grid deselection errors during dataset changes.
    }
  }, []);

  const clearDocumentDragState = useCallback(() => {
    setDraggedDocuments(null);
    setDragHoveredFolderId(null);
    setDragHoveredLibraryId(null);
  }, []);

  const clearFolderDragState = useCallback(() => {
    setDraggedFolder(null);
    setDragHoveredLibraryId(null);
  }, []);

  const resetMoveDialogState = useCallback(() => {
    setMoveDialogRowsOverride(null);
    setMoveDialogTargetLibraryId(null);
  }, []);

  const resetFolderMoveDialogState = useCallback(() => {
    setFolderMoveDialogFolder(null);
    setFolderMoveDialogTargetLibraryId(null);
  }, []);

  const dragToFolderEnabled = canManageDocuments && !searchAllLibraries && !!activeLibrary?.id;

  const getDocFilterValues = useCallback((field: string, opts?: { labelMap?: Record<string, string>; order?: Array<string | null>; emptyLabel?: string }) => {
    const labelMap = opts?.labelMap;
    const order = opts?.order;
    const emptyLabel = opts?.emptyLabel ?? '(Blank)';
    return async ({ context }: any) => {
      const queryState = context?.getQueryState?.() ?? {};
      const filters = { ...(queryState.filters || {}) };
      delete filters[field];
      const params: Record<string, any> = {
        fields: field,
        ...(queryState.extraParams || {}),
      };
      if (queryState.q) params.q = queryState.q;
      if (Object.keys(filters).length > 0) {
        params.filters = JSON.stringify(filters);
      }
      const res = await api.get('/knowledge/filter-values', { params });
      const values = (res.data?.[field] || []) as Array<string | null>;
      let options = values.map((value) => {
        if (value == null) return { value, label: emptyLabel };
        const key = String(value);
        const label = labelMap && Object.prototype.hasOwnProperty.call(labelMap, key) ? labelMap[key] : key;
        return { value, label };
      });
      if (order && order.length > 0) {
        const orderMap = new Map(order.map((val, index) => [val, index]));
        options.sort((a, b) => {
          const aIndex = orderMap.has(a.value) ? (orderMap.get(a.value) as number) : Number.MAX_SAFE_INTEGER;
          const bIndex = orderMap.has(b.value) ? (orderMap.get(b.value) as number) : Number.MAX_SAFE_INTEGER;
          if (aIndex !== bIndex) return aIndex - bIndex;
          return (a.label || '').localeCompare(b.label || '');
        });
      } else {
        options.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      }
      return options;
    };
  }, []);

  const ClickableCell: React.FC<ICellRendererParams<DocumentRow, any>> = (params) => (
    <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => {
      const sp = buildWorkspaceSearch();
      const ref = params.data?.item_ref || params.data?.id;
      navigate(`/knowledge/${ref}?${sp.toString()}`);
    }}>
      {params.valueFormatted ?? params.value ?? ''}
    </Box>
  );

  const DragHandleCell: React.FC<ICellRendererParams<DocumentRow, any>> = (params) => {
    const row = params.data;
    const disabled = !dragToFolderEnabled
      || !row?.id
      || !!row?.is_managed_integrated_document
      || moveDocumentsMutation.isPending;
    const disabledReason = row?.is_managed_integrated_document
      ? 'Managed docs cannot be moved from Knowledge'
      : 'Drag is available only in a single-library view';
    return (
      <Tooltip title={disabled ? disabledReason : 'Drag to a folder or another library'}>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            color: disabled ? 'text.disabled' : 'text.secondary',
            cursor: disabled ? 'not-allowed' : 'grab',
          }}
          draggable={!disabled}
          onClick={(event) => event.stopPropagation()}
          onDragStart={(event: React.DragEvent<HTMLSpanElement>) => handleDocumentDragStart(event, row)}
          onDragEnd={handleDocumentDragEnd}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      </Tooltip>
    );
  };

  const columns: EnhancedColDef<DocumentRow>[] = useMemo(() => {
    const nextColumns: EnhancedColDef<DocumentRow>[] = [];

    if (dragToFolderEnabled) {
      nextColumns.push({
        colId: '__drag__',
        headerName: '',
        width: 42,
        maxWidth: 42,
        minWidth: 42,
        pinned: 'left',
        lockPinned: true,
        lockPosition: 'left',
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        suppressColumnsToolPanel: true,
        cellRenderer: DragHandleCell,
      });
    }

    nextColumns.push({
      field: 'item_ref',
      headerName: 'Ref',
      width: 100,
      cellRenderer: ClickableCell,
    });
    nextColumns.push({
      field: 'title',
      headerName: 'Title',
      flex: 1.5,
      minWidth: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: ClickableCell,
    });
    nextColumns.push({
      field: 'status',
      headerName: 'Status',
      width: 190,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getDocFilterValues('status', {
          labelMap: STATUS_LABELS,
          order: ['draft', 'in_review', 'published', 'archived', 'obsolete'],
        }),
        searchable: false,
      },
      cellRenderer: StatusCellRenderer,
    });
    nextColumns.push({
      field: 'document_type_name',
      headerName: 'Type',
      width: 160,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getDocFilterValues('document_type_name', { emptyLabel: 'None' }),
      },
      cellRenderer: ClickableCell,
      valueFormatter: (p: any) => p.value || 'Document',
    });
    nextColumns.push({
      field: 'current_version_number',
      headerName: 'Version',
      width: 90,
      cellRenderer: ClickableCell,
      valueFormatter: (p: any) => p.value != null ? `v${p.value}` : '',
    });
    nextColumns.push({
      field: 'primary_owner_name',
      headerName: 'Owner',
      flex: 1,
      minWidth: 140,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getDocFilterValues('primary_owner_name'),
      },
      cellRenderer: ClickableCell,
    });
    nextColumns.push({
      field: 'folder_name',
      headerName: 'Folder',
      width: 150,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getDocFilterValues('folder_name', { emptyLabel: 'Unfiled' }),
      },
      cellRenderer: ClickableCell,
      valueFormatter: (p: any) => p.value || 'Unfiled',
    });
    nextColumns.push({
      field: 'template_name',
      headerName: 'Template',
      width: 180,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getDocFilterValues('template_name', { emptyLabel: 'None' }),
      },
      cellRenderer: ClickableCell,
      hide: true,
    });
    nextColumns.push({
      field: 'library_name',
      headerName: 'Library',
      width: 160,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getDocFilterValues('library_name', { emptyLabel: 'Unknown' }),
      },
      cellRenderer: ClickableCell,
      hide: !searchAllLibraries,
    });
    nextColumns.push({
      field: 'updated_at',
      headerName: 'Updated',
      width: 120,
      cellRenderer: ClickableCell,
      valueFormatter: (params) => formatDate(params.value),
    });

    return nextColumns;
  }, [ClickableCell, DragHandleCell, dragToFolderEnabled, getDocFilterValues, searchAllLibraries]);

  const [createLibraryOpen, setCreateLibraryOpen] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [editingLibrary, setEditingLibrary] = useState<DocumentLibrary | null>(null);
  const [renamedLibrary, setRenamedLibrary] = useState('');

  const createLibraryMutation = useMutation({
    mutationFn: async () => {
      return (await api.post('/knowledge-libraries', { name: newLibraryName.trim() })).data as DocumentLibrary;
    },
    onSuccess: async (created) => {
      setCreateLibraryOpen(false);
      setNewLibraryName('');
      await qc.invalidateQueries({ queryKey: ['knowledge-libraries'] });
      updateQuery({ library: created.slug, allLibraries: '0', folder_id: null });
    },
  });

  const renameLibraryMutation = useMutation({
    mutationFn: async () => {
      if (!editingLibrary) return null;
      return (await api.patch(`/knowledge-libraries/${editingLibrary.id}`, { name: renamedLibrary.trim() })).data as DocumentLibrary;
    },
    onSuccess: async (updated) => {
      if (!updated) return;
      setEditingLibrary(null);
      setRenamedLibrary('');
      await qc.invalidateQueries({ queryKey: ['knowledge-libraries'] });
      if (activeLibrary?.id === updated.id) {
        updateQuery({ library: updated.slug });
      }
    },
  });

  const deleteLibraryMutation = useMutation({
    mutationFn: async () => {
      if (!editingLibrary) return;
      await api.delete(`/knowledge-libraries/${editingLibrary.id}`);
    },
    onSuccess: async () => {
      setEditingLibrary(null);
      setRenamedLibrary('');
      await qc.invalidateQueries({ queryKey: ['knowledge-libraries'] });
      updateQuery({ folder_id: null, allLibraries: '0' });
    },
  });

  const openLibraryEdit = (library: DocumentLibrary) => {
    setEditingLibrary(library);
    setRenamedLibrary(library.name);
  };

  const [newDocAnchorEl, setNewDocAnchorEl] = useState<null | HTMLElement>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [typesManagerOpen, setTypesManagerOpen] = useState(false);

  React.useEffect(() => {
    clearSelection();
    clearDocumentDragState();
    clearFolderDragState();
    resetMoveDialogState();
    resetFolderMoveDialogState();
  }, [
    activeLibrary?.id,
    clearDocumentDragState,
    clearFolderDragState,
    clearSelection,
    docScope,
    resetFolderMoveDialogState,
    resetMoveDialogState,
    searchAllLibraries,
    selectedFolderId,
  ]);

  const templatesLibrary = useMemo(
    () => libraries.find((row) => row.slug === TEMPLATE_LIBRARY_SLUG) || null,
    [libraries],
  );

  const moveDialogRows = moveDialogRowsOverride ?? selectedRows;
  const templateLibraryId = templatesLibrary?.id || null;
  const folderMoveTarget = folderMoveDialogFolder
    ? {
      id: folderMoveDialogFolder.id,
      name: folderMoveDialogFolder.name,
      library_id: folderMoveDialogFolder.libraryId,
      library_name: folderMoveDialogFolder.libraryName,
    }
    : null;

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
    enabled: templatePickerOpen && !!templatesLibrary?.id,
  });

  const groupedTemplates = useMemo(() => {
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

  const goToBlankDocument = () => {
    if (!activeLibrary) return;
    navigate(`/knowledge/new?library=${encodeURIComponent(activeLibrary.slug)}`);
  };

  const selectionLibraryIds = useMemo(
    () => Array.from(new Set(selectedRows.map((row) => row.library_id).filter((value): value is string => !!value))),
    [selectedRows],
  );
  const selectionIncludesTemplateLibrary = useMemo(
    () => !!templateLibraryId && selectionLibraryIds.includes(templateLibraryId),
    [selectionLibraryIds, templateLibraryId],
  );
  const selectionIncludesManagedIntegratedDocs = useMemo(
    () => selectedRows.some((row) => !!row.is_managed_integrated_document),
    [selectedRows],
  );

  const moveDisabledReason = useMemo(() => {
    if (selectedRows.length === 0) return 'Select at least one document';
    if (!canManageDocuments) return 'You do not have permission to move documents';
    if (selectionIncludesManagedIntegratedDocs) return 'Managed docs cannot be moved from Knowledge';
    if (selectionIncludesTemplateLibrary && selectionLibraryIds.length > 1) {
      return 'Move template documents separately from other libraries';
    }
    if (!canMoveAcrossLibraries && selectionLibraryIds.length > 1) {
      return 'Select documents from a single library to move them';
    }
    return '';
  }, [
    canManageDocuments,
    canMoveAcrossLibraries,
    selectedRows.length,
    selectionIncludesManagedIntegratedDocs,
    selectionIncludesTemplateLibrary,
    selectionLibraryIds.length,
  ]);
  const deleteDisabledReason = useMemo(() => {
    if (selectedRows.length === 0) return 'Select at least one document';
    if (selectionIncludesManagedIntegratedDocs) return 'Managed docs cannot be deleted from Knowledge';
    return '';
  }, [selectedRows.length, selectionIncludesManagedIntegratedDocs]);

  const moveDocumentsMutation = useMutation({
    mutationFn: async ({
      ids,
      target_library_id,
      target_folder_id,
    }: {
      ids: string[];
      target_library_id: string;
      target_folder_id: string | null;
    }) => {
      await api.post('/knowledge/bulk-move', {
        ids,
        target_library_id,
        target_folder_id,
      });
    },
    onSuccess: (_data, variables) => {
      const movedCount = variables.ids.length;
      setMoveDialogOpen(false);
      clearSelection();
      clearDocumentDragState();
      resetMoveDialogState();
      setRefreshKey((prev) => prev + 1);
      setMoveSnackbar({
        open: true,
        message: movedCount === 1 ? 'Document moved.' : `Moved ${movedCount} documents.`,
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setMoveSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Unable to move documents.',
        severity: 'error',
      });
      clearDocumentDragState();
    },
  });

  const moveFolderMutation = useMutation({
    mutationFn: async ({
      id,
      target_library_id,
      target_folder_id,
    }: {
      id: string;
      target_library_id: string;
      target_folder_id: string | null;
    }) => {
      const res = await api.post(`/knowledge-folders/${id}/move`, {
        target_library_id,
        target_folder_id,
      });
      return res.data as { ok: true; id: string; library_id: string; parent_id: string | null };
    },
    onSuccess: async (_data, variables) => {
      const targetLibrary = libraries.find((library) => library.id === variables.target_library_id) || null;
      setFolderMoveDialogOpen(false);
      resetFolderMoveDialogState();
      clearFolderDragState();
      setRefreshKey((prev) => prev + 1);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['knowledge-folders-tree', activeLibrary?.id] }),
        qc.invalidateQueries({ queryKey: ['knowledge-folders-tree', variables.target_library_id] }),
      ]);
      if (targetLibrary) {
        updateQuery({
          library: targetLibrary.slug,
          allLibraries: '0',
          folder_id: variables.id,
        });
      }
      setMoveSnackbar({
        open: true,
        message: 'Folder moved.',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setMoveSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Unable to move folder.',
        severity: 'error',
      });
      clearFolderDragState();
    },
  });

  const handleDocumentDragStart = useCallback((event: React.DragEvent<HTMLSpanElement>, row: DocumentRow | undefined) => {
    if (!dragToFolderEnabled || !row?.id || !activeLibrary?.id || moveDocumentsMutation.isPending) {
      event.preventDefault();
      return;
    }

    const selectedIds = new Set(selectedRows.map((selectedRow) => selectedRow.id));
    const dragRows = selectedIds.has(row.id) && selectedRows.length > 0 ? selectedRows : [row];
    if (dragRows.some((dragRow) => !!dragRow.is_managed_integrated_document)) {
      event.preventDefault();
      return;
    }

    const payload: DraggedDocumentState = {
      ids: dragRows.map((dragRow) => dragRow.id),
      rows: dragRows,
      libraryId: activeLibrary.id,
      librarySlug: activeLibrary.slug,
      count: dragRows.length,
    };

    setDraggedDocuments(payload);
    setDragHoveredFolderId(null);
    setDragHoveredLibraryId(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'knowledge-documents',
      ids: payload.ids,
      count: payload.count,
    }));
  }, [activeLibrary?.id, dragToFolderEnabled, moveDocumentsMutation.isPending, selectedRows]);

  const handleDocumentDragEnd = useCallback(() => {
    clearDocumentDragState();
  }, [clearDocumentDragState]);

  const handleFolderExternalDragStart = useCallback((folder: FolderTreeDraggedFolderState) => {
    if (!activeLibrary) return;
    setDraggedFolder({
      ...folder,
      librarySlug: activeLibrary.slug,
      libraryName: activeLibrary.name,
    });
    setDragHoveredLibraryId(null);
  }, [activeLibrary]);

  const handleFolderExternalDragEnd = useCallback(() => {
    clearFolderDragState();
  }, [clearFolderDragState]);

  const canDropDraggedDocumentsOnFolder = useCallback((folderId: string) => {
    if (!draggedDocuments || !activeLibrary?.id) return false;
    if (draggedDocuments.libraryId !== activeLibrary.id) return false;
    if (draggedDocuments.rows.some((row) => !!row.is_managed_integrated_document)) return false;
    return draggedDocuments.rows.some((row) => (row.folder_id || null) !== folderId);
  }, [activeLibrary?.id, draggedDocuments]);

  const handleFolderDragOver = useCallback((folderId: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!canDropDraggedDocumentsOnFolder(folderId)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragHoveredLibraryId !== null) {
      setDragHoveredLibraryId(null);
    }
    if (dragHoveredFolderId !== folderId) {
      setDragHoveredFolderId(folderId);
    }
  }, [canDropDraggedDocumentsOnFolder, dragHoveredFolderId, dragHoveredLibraryId]);

  const handleFolderDrop = useCallback((folderId: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!draggedDocuments || !activeLibrary?.id || !canDropDraggedDocumentsOnFolder(folderId)) return;
    event.preventDefault();
    setDragHoveredFolderId(null);
    moveDocumentsMutation.mutate({
      ids: draggedDocuments.ids,
      target_library_id: activeLibrary.id,
      target_folder_id: folderId,
    });
  }, [activeLibrary?.id, canDropDraggedDocumentsOnFolder, draggedDocuments, moveDocumentsMutation]);

  const canDropDraggedDocumentsOnLibrary = useCallback((library: DocumentLibrary) => {
    if (!draggedDocuments || !canMoveAcrossLibraries || moveDocumentsMutation.isPending) return false;
    if (!library.id || library.id === draggedDocuments.libraryId) return false;
    if (draggedDocuments.librarySlug === TEMPLATE_LIBRARY_SLUG) return false;
    if (draggedDocuments.rows.some((row) => !!row.is_managed_integrated_document)) return false;
    if (library.slug === TEMPLATE_LIBRARY_SLUG) return false;
    return true;
  }, [canMoveAcrossLibraries, draggedDocuments, moveDocumentsMutation.isPending]);

  const canDropDraggedFolderOnLibrary = useCallback((library: DocumentLibrary) => {
    if (!draggedFolder || !canMoveAcrossLibraries || moveFolderMutation.isPending) return false;
    if (!library.id || library.id === draggedFolder.libraryId) return false;
    if (draggedFolder.librarySlug === TEMPLATE_LIBRARY_SLUG) return false;
    if (library.slug === TEMPLATE_LIBRARY_SLUG) return false;
    return true;
  }, [canMoveAcrossLibraries, draggedFolder, moveFolderMutation.isPending]);

  const handleLibraryTabDragOver = useCallback((library: DocumentLibrary, event: React.DragEvent<HTMLDivElement>) => {
    const canDropDocument = canDropDraggedDocumentsOnLibrary(library);
    const canDropFolder = canDropDraggedFolderOnLibrary(library);
    if (!canDropDocument && !canDropFolder) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragHoveredFolderId !== null) {
      setDragHoveredFolderId(null);
    }
    setDragHoveredLibraryId(library.id);
  }, [canDropDraggedDocumentsOnLibrary, canDropDraggedFolderOnLibrary, dragHoveredFolderId]);

  const handleLibraryTabDrop = useCallback((library: DocumentLibrary, event: React.DragEvent<HTMLDivElement>) => {
    if (draggedDocuments && canDropDraggedDocumentsOnLibrary(library)) {
      event.preventDefault();
      setDragHoveredLibraryId(null);
      setMoveDialogRowsOverride(draggedDocuments.rows);
      setMoveDialogTargetLibraryId(library.id);
      setMoveDialogOpen(true);
      return;
    }
    if (draggedFolder && canDropDraggedFolderOnLibrary(library)) {
      event.preventDefault();
      setDragHoveredLibraryId(null);
      setFolderMoveDialogFolder(draggedFolder);
      setFolderMoveDialogTargetLibraryId(library.id);
      setFolderMoveDialogOpen(true);
    }
  }, [canDropDraggedDocumentsOnLibrary, canDropDraggedFolderOnLibrary, draggedDocuments, draggedFolder]);

  const openTemplatePicker = () => {
    setTemplatePickerOpen(true);
    setSelectedTemplateId('');
  };

  const createFromTemplate = () => {
    if (!activeLibrary || !selectedTemplateId) return;
    navigate(
      `/knowledge/new?library=${encodeURIComponent(activeLibrary.slug)}&template_document_id=${encodeURIComponent(selectedTemplateId)}`,
    );
    setTemplatePickerOpen(false);
    setSelectedTemplateId('');
  };

  const scopeToolbar = (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', flex: 1, justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={searchAllLibraries}
              onChange={(_, checked) => {
                if (checked) {
                  updateQuery({ allLibraries: '1', folder_id: null });
                } else {
                  updateQuery({ allLibraries: '0' });
                }
              }}
            />
          )}
          label={<Typography variant="body2">All libraries</Typography>}
        />
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2">Show:</Typography>
          <RadioGroup
            row
            value={docScope}
            onChange={(e) => setDocScope(e.target.value as 'my' | 'team' | 'all')}
            sx={{ '& .MuiFormControlLabel-root': { mr: 1 } }}
          >
            <FormControlLabel value="my" control={<Radio size="small" />} label="My docs" />
            <Tooltip title={hasTeam ? '' : 'You are not assigned to a team'}>
              <span>
                <FormControlLabel
                  value="team"
                  control={<Radio size="small" />}
                  label="My teams's Docs"
                  disabled={!hasTeam}
                />
              </span>
            </Tooltip>
            <FormControlLabel value="all" control={<Radio size="small" />} label="All Docs" />
          </RadioGroup>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        {activeLibrary?.slug === 'templates' && canManageLibraries && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => setTypesManagerOpen(true)}
          >
            Manage Types
          </Button>
        )}
        <ButtonGroup variant="contained" size="small">
          <Button startIcon={<AddIcon />} onClick={goToBlankDocument} disabled={!canManageDocuments || !activeLibrary}>
            New
          </Button>
          <Button
            onClick={(e) => setNewDocAnchorEl(e.currentTarget)}
            disabled={!canManageDocuments || !activeLibrary}
            sx={{ px: 0.5, minWidth: 'auto' }}
          >
            <ArrowDropDownIcon />
          </Button>
        </ButtonGroup>
        <Tooltip title={moveDisabledReason}>
          <span>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                resetMoveDialogState();
                setMoveDialogOpen(true);
              }}
              disabled={!!moveDisabledReason || moveDocumentsMutation.isPending}
            >
              Move ({selectedRows.length})
            </Button>
          </span>
        </Tooltip>
        {canManageLibraries && (
          <Tooltip title={deleteDisabledReason}>
            <span>
              <DeleteSelectedButton<DocumentRow>
                selectedRows={selectedRows}
                endpoint="/knowledge/bulk"
                getItemId={(row) => row.id}
                getItemName={(row) => `${row.item_ref}${row.title ? ` - ${row.title}` : ''}`}
                gridApi={gridApiRef.current}
                onDeleteSuccess={() => {
                  clearSelection();
                  setRefreshKey((prev) => prev + 1);
                }}
                disabled={!!deleteDisabledReason}
                label="Delete"
              />
            </span>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );

  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
          <Tabs
            value={activeLibrary?.slug || false}
            onChange={(_, value) => updateQuery({ library: String(value), folder_id: null })}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {sortedLibraries.map((library) => (
              <Tab
                key={library.id}
                value={library.slug}
                onDragOver={(event) => handleLibraryTabDragOver(library, event)}
                onDragLeave={() => {
                  if (dragHoveredLibraryId === library.id) {
                    setDragHoveredLibraryId(null);
                  }
                }}
                onDrop={(event) => handleLibraryTabDrop(library, event)}
                sx={{
                  borderRadius: 1,
                  bgcolor: dragHoveredLibraryId === library.id ? 'action.hover' : 'transparent',
                }}
                label={(
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', '&:hover .lib-edit': { opacity: 1 } }}>
                    <span>{library.name}</span>
                    {!library.is_system && canManageLibraries && (
                      <Box
                        component="span"
                        className="lib-edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLibraryEdit(library);
                        }}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          ml: 0.5,
                          opacity: 0,
                          transition: 'opacity 0.15s',
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 14 }} />
                      </Box>
                    )}
                  </Box>
                )}
              />
            ))}
          </Tabs>
          {canManageLibraries && (
            <IconButton size="small" onClick={() => setCreateLibraryOpen(true)} sx={{ ml: 1 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        {!searchAllLibraries && !!activeLibrary?.id && (
          <FolderTreePanel
            libraryId={activeLibrary.id}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(folderId) => {
              updateQuery({ folder_id: folderId || null, allLibraries: '0' });
            }}
            canManage={canManageDocuments}
            folderExternalDragAndDrop={{
              onDragStart: handleFolderExternalDragStart,
              onDragEnd: handleFolderExternalDragEnd,
            }}
            documentDragAndDrop={{
              active: !!draggedDocuments,
              hoverFolderId: dragHoveredFolderId,
              canDropOnFolder: canDropDraggedDocumentsOnFolder,
              onFolderDragOver: handleFolderDragOver,
              onFolderDrop: handleFolderDrop,
            }}
          />
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ServerDataGrid<DocumentRow>
            columns={columns}
            endpoint="/knowledge"
            queryKey="knowledge"
            getRowId={(r) => r.id}
            enableSearch
            defaultSort={{ field: 'updated_at', direction: 'DESC' }}
            columnPreferencesKey="knowledge"
            extraParams={extraParams}
            refreshKey={refreshKey}
            enableRowSelection={canManageDocuments}
            onSelectionChanged={(rows) => setSelectedRows(rows)}
            onGridApiReady={(api) => { gridApiRef.current = api; }}
            toolbarExtras={scopeToolbar}
            onQueryStateChange={(state) => {
              lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {} };
            }}
          />
        </Box>
      </Stack>

      <Menu
        anchorEl={newDocAnchorEl}
        open={Boolean(newDocAnchorEl)}
        onClose={() => setNewDocAnchorEl(null)}
      >
        <MenuItem onClick={() => { setNewDocAnchorEl(null); goToBlankDocument(); }}>
          Blank Document
        </MenuItem>
        <MenuItem onClick={() => { setNewDocAnchorEl(null); openTemplatePicker(); }} disabled={!templatesLibrary}>
          From template...
        </MenuItem>
      </Menu>

      <Dialog open={createLibraryOpen} onClose={() => setCreateLibraryOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create Library</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Library name"
            fullWidth
            value={newLibraryName}
            onChange={(e) => setNewLibraryName(e.target.value)}
          />
          {createLibraryMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>Unable to create library.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateLibraryOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => createLibraryMutation.mutate()}
            disabled={!newLibraryName.trim() || createLibraryMutation.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingLibrary} onClose={() => setEditingLibrary(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit Library</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Library name"
            fullWidth
            value={renamedLibrary}
            onChange={(e) => setRenamedLibrary(e.target.value)}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Renaming this library also changes its URL slug.
          </Typography>
          {(renameLibraryMutation.isError || deleteLibraryMutation.isError) && (
            <Alert severity="error" sx={{ mt: 2 }}>Unable to update library.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingLibrary(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (!editingLibrary) return;
              const confirmed = window.confirm('Delete this library? Knowledge items and folders will be moved to the fallback library.');
              if (!confirmed) return;
              deleteLibraryMutation.mutate();
            }}
            disabled={!editingLibrary || deleteLibraryMutation.isPending}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            onClick={() => renameLibraryMutation.mutate()}
            disabled={!renamedLibrary.trim() || renameLibraryMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={typesManagerOpen} onClose={() => setTypesManagerOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Manage Document Types</DialogTitle>
        <DialogContent>
          <KnowledgeTypesManager />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypesManagerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Select Template</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            margin="dense"
            label="Template"
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
              No published templates are available.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplatePickerOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createFromTemplate} disabled={!selectedTemplateId || !activeLibrary}>
            Use Template
          </Button>
        </DialogActions>
      </Dialog>

      <KnowledgeMoveDialog
        open={moveDialogOpen}
        selectedRows={moveDialogRows}
        libraries={sortedLibraries}
        activeLibraryId={activeLibrary?.id || null}
        canChangeLibrary={canMoveAcrossLibraries}
        initialTargetLibraryId={moveDialogTargetLibraryId}
        templateLibraryId={templateLibraryId}
        pending={moveDocumentsMutation.isPending}
        onClose={() => {
          if (!moveDocumentsMutation.isPending) {
            setMoveDialogOpen(false);
            resetMoveDialogState();
          }
        }}
        onConfirm={(value) => moveDocumentsMutation.mutate({ ids: moveDialogRows.map((row) => row.id), ...value })}
      />

      <KnowledgeFolderMoveDialog
        open={folderMoveDialogOpen}
        folder={folderMoveTarget}
        libraries={sortedLibraries}
        activeLibraryId={activeLibrary?.id || null}
        canChangeLibrary={canMoveAcrossLibraries}
        initialTargetLibraryId={folderMoveDialogTargetLibraryId}
        templateLibraryId={templateLibraryId}
        pending={moveFolderMutation.isPending}
        onClose={() => {
          if (!moveFolderMutation.isPending) {
            setFolderMoveDialogOpen(false);
            resetFolderMoveDialogState();
          }
        }}
        onConfirm={(value) => {
          if (!folderMoveTarget) return;
          moveFolderMutation.mutate({ id: folderMoveTarget.id, ...value });
        }}
      />

      <Snackbar
        open={moveSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setMoveSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMoveSnackbar((prev) => ({ ...prev, open: false }))}
          severity={moveSnackbar.severity}
          variant="filled"
        >
          {moveSnackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
