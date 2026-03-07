import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api';

type DocumentLibrary = {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
  display_order: number;
};

type DocumentSelectionRow = {
  id: string;
  item_ref: string;
  title: string;
  library_id: string | null;
  library_name: string | null;
  folder_id: string | null;
};

type FolderNode = {
  id: string;
  name: string;
  children?: FolderNode[];
};

type FlatFolder = {
  id: string;
  name: string;
  depth: number;
};

const UNFILED_OPTION_VALUE = '__unfiled__';

export type KnowledgeMoveRequest = {
  target_library_id: string;
  target_folder_id: string | null;
};

interface KnowledgeMoveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: KnowledgeMoveRequest) => void;
  pending?: boolean;
  selectedRows: DocumentSelectionRow[];
  libraries: DocumentLibrary[];
  activeLibraryId: string | null;
  canChangeLibrary: boolean;
  initialTargetLibraryId?: string | null;
  templateLibraryId?: string | null;
}

function flattenFolders(nodes: FolderNode[], depth = 0): FlatFolder[] {
  const out: FlatFolder[] = [];
  nodes.forEach((node) => {
    out.push({ id: node.id, name: node.name, depth });
    if (Array.isArray(node.children) && node.children.length > 0) {
      out.push(...flattenFolders(node.children, depth + 1));
    }
  });
  return out;
}

function getSharedFolderId(rows: DocumentSelectionRow[]): string | null {
  if (!rows.length) return null;
  const values = Array.from(new Set(rows.map((row) => row.folder_id || UNFILED_OPTION_VALUE)));
  if (values.length !== 1) return null;
  return values[0] === UNFILED_OPTION_VALUE ? null : values[0];
}

export default function KnowledgeMoveDialog({
  open,
  onClose,
  onConfirm,
  pending = false,
  selectedRows,
  libraries,
  activeLibraryId,
  canChangeLibrary,
  initialTargetLibraryId = null,
  templateLibraryId = null,
}: KnowledgeMoveDialogProps) {
  const selectedLibraryIds = React.useMemo(
    () => Array.from(new Set(selectedRows.map((row) => row.library_id).filter(Boolean))),
    [selectedRows],
  );
  const selectedLibraryNames = React.useMemo(
    () => Array.from(new Set(selectedRows.map((row) => row.library_name || 'Unknown'))),
    [selectedRows],
  );
  const selectionIsMixedLibraries = selectedLibraryIds.length > 1;
  const selectionIncludesTemplateLibrary = !!templateLibraryId && selectedLibraryIds.includes(templateLibraryId);
  const commonLibraryId = selectedLibraryIds.length === 1 ? selectedLibraryIds[0] : null;
  const selectableLibraries = React.useMemo(
    () => libraries.filter((library) => library.id === commonLibraryId || library.id !== templateLibraryId),
    [commonLibraryId, libraries, templateLibraryId],
  );
  const defaultLibraryId = React.useMemo(() => {
    if (commonLibraryId) return commonLibraryId;
    if (activeLibraryId) return activeLibraryId;
    return selectableLibraries[0]?.id || '';
  }, [activeLibraryId, commonLibraryId, selectableLibraries]);
  const canChangeLibraryForSelection = canChangeLibrary && !selectionIncludesTemplateLibrary;
  const preferredLibraryId = React.useMemo(() => {
    if (initialTargetLibraryId && selectableLibraries.some((library) => library.id === initialTargetLibraryId)) {
      return initialTargetLibraryId;
    }
    return defaultLibraryId;
  }, [defaultLibraryId, initialTargetLibraryId, selectableLibraries]);

  const [targetLibraryId, setTargetLibraryId] = React.useState('');
  const [targetFolderId, setTargetFolderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const nextLibraryId = canChangeLibraryForSelection
      ? preferredLibraryId
      : (commonLibraryId || preferredLibraryId);
    setTargetLibraryId(nextLibraryId);
    setTargetFolderId(
      !selectionIsMixedLibraries && nextLibraryId && nextLibraryId === commonLibraryId
        ? getSharedFolderId(selectedRows)
        : null,
    );
  }, [open, canChangeLibraryForSelection, commonLibraryId, preferredLibraryId, selectedRows, selectionIsMixedLibraries]);

  const { data: folderTree } = useQuery({
    queryKey: ['knowledge-folders-tree', targetLibraryId],
    queryFn: async () => (await api.get('/knowledge-folders/tree', { params: { library_id: targetLibraryId } })).data as { items: FolderNode[] },
    enabled: open && !!targetLibraryId,
  });

  const flatFolders = React.useMemo(
    () => flattenFolders(folderTree?.items || []),
    [folderTree?.items],
  );

  const libraryChangeBlocked =
    (!canChangeLibrary && selectionIsMixedLibraries)
    || (selectionIncludesTemplateLibrary && selectionIsMixedLibraries);
  const disableSubmit = pending || !selectedRows.length || !targetLibraryId || libraryChangeBlocked;
  const selectionSummary = selectedRows.length === 1
    ? `${selectedRows[0].item_ref} - ${selectedRows[0].title}`
    : `${selectedRows.length} documents selected`;

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Move Documents</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {selectionSummary}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {selectedLibraryNames.length === 1 ? 'Current library' : 'Current libraries'}: {selectedLibraryNames.join(', ')}
          </Typography>

          {!canChangeLibrary && !selectionIncludesTemplateLibrary && (
            <Alert severity="info">
              Cross-library moves are admin-only. You can move the selected documents within their current library.
            </Alert>
          )}

          {selectionIncludesTemplateLibrary && (
            <Alert severity={selectionIsMixedLibraries ? 'error' : 'info'}>
              {selectionIsMixedLibraries
                ? 'Template documents must be moved separately from documents in other libraries.'
                : 'Documents in the Templates library can only be reorganized within Templates.'}
            </Alert>
          )}

          {libraryChangeBlocked && (
            <Alert severity="error">
              {selectionIncludesTemplateLibrary && selectionIsMixedLibraries
                ? 'Template documents cannot be moved together with documents from other libraries.'
                : 'Select documents from a single library to move them, or use an admin account for a cross-library move.'}
            </Alert>
          )}

          <TextField
            select
            label="Target library"
            fullWidth
            value={targetLibraryId}
            onChange={(e) => {
              const nextLibraryId = e.target.value;
              setTargetLibraryId(nextLibraryId);
              setTargetFolderId(null);
            }}
            disabled={!canChangeLibraryForSelection || libraryChangeBlocked}
          >
            {selectableLibraries.map((library) => (
              <MenuItem key={library.id} value={library.id}>
                {library.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Target folder"
            fullWidth
            value={targetFolderId ?? UNFILED_OPTION_VALUE}
            onChange={(e) => setTargetFolderId(e.target.value === UNFILED_OPTION_VALUE ? null : e.target.value)}
            disabled={!targetLibraryId || libraryChangeBlocked}
          >
            <MenuItem value={UNFILED_OPTION_VALUE}>Unfiled</MenuItem>
            {flatFolders.map((folder) => (
              <MenuItem key={folder.id} value={folder.id}>
                <Box component="span" sx={{ pl: folder.depth * 2 }}>
                  {folder.name}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onConfirm({ target_library_id: targetLibraryId, target_folder_id: targetFolderId })}
          disabled={disableSubmit}
        >
          Move
        </Button>
      </DialogActions>
    </Dialog>
  );
}
