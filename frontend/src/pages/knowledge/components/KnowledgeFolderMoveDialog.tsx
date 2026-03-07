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

export type KnowledgeFolderMoveRequest = {
  target_library_id: string;
  target_folder_id: string | null;
};

export type FolderMoveTarget = {
  id: string;
  name: string;
  library_id: string;
  library_name: string | null;
};

interface KnowledgeFolderMoveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: KnowledgeFolderMoveRequest) => void;
  pending?: boolean;
  folder: FolderMoveTarget | null;
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

function collectNodeIds(node: FolderNode, out: Set<string> = new Set<string>()): Set<string> {
  out.add(node.id);
  (node.children || []).forEach((child) => collectNodeIds(child, out));
  return out;
}

function collectSubtreeIds(nodes: FolderNode[], targetId: string): Set<string> {
  for (const node of nodes) {
    if (node.id === targetId) return collectNodeIds(node);
    const nested = collectSubtreeIds(node.children || [], targetId);
    if (nested.size > 0) return nested;
  }
  return new Set<string>();
}

export default function KnowledgeFolderMoveDialog({
  open,
  onClose,
  onConfirm,
  pending = false,
  folder,
  libraries,
  activeLibraryId,
  canChangeLibrary,
  initialTargetLibraryId = null,
  templateLibraryId = null,
}: KnowledgeFolderMoveDialogProps) {
  const sourceLibraryId = folder?.library_id || '';
  const sourceLibraryName = folder?.library_name || 'Unknown';
  const folderInTemplates = !!templateLibraryId && sourceLibraryId === templateLibraryId;
  const selectableLibraries = React.useMemo(() => {
    if (!folder) return libraries.filter((library) => library.id !== templateLibraryId);
    if (folderInTemplates) {
      return libraries.filter((library) => library.id === sourceLibraryId);
    }
    return libraries.filter((library) => library.id === sourceLibraryId || library.id !== templateLibraryId);
  }, [folder, folderInTemplates, libraries, sourceLibraryId, templateLibraryId]);
  const defaultLibraryId = React.useMemo(() => {
    if (initialTargetLibraryId && selectableLibraries.some((library) => library.id === initialTargetLibraryId)) {
      return initialTargetLibraryId;
    }
    if (sourceLibraryId && selectableLibraries.some((library) => library.id === sourceLibraryId)) {
      return sourceLibraryId;
    }
    if (activeLibraryId && selectableLibraries.some((library) => library.id === activeLibraryId)) {
      return activeLibraryId;
    }
    return selectableLibraries[0]?.id || '';
  }, [activeLibraryId, initialTargetLibraryId, selectableLibraries, sourceLibraryId]);

  const [targetLibraryId, setTargetLibraryId] = React.useState('');
  const [targetFolderId, setTargetFolderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTargetLibraryId(defaultLibraryId);
    setTargetFolderId(null);
  }, [defaultLibraryId, open]);

  const { data: folderTree } = useQuery({
    queryKey: ['knowledge-folders-tree', targetLibraryId],
    queryFn: async () => (await api.get('/knowledge-folders/tree', { params: { library_id: targetLibraryId } })).data as { items: FolderNode[] },
    enabled: open && !!targetLibraryId,
  });

  const excludedFolderIds = React.useMemo(() => {
    if (!folder || !targetLibraryId || targetLibraryId !== sourceLibraryId) return new Set<string>();
    return collectSubtreeIds(folderTree?.items || [], folder.id);
  }, [folder, folderTree?.items, sourceLibraryId, targetLibraryId]);

  const flatFolders = React.useMemo(
    () => flattenFolders(folderTree?.items || []).filter((item) => !excludedFolderIds.has(item.id)),
    [excludedFolderIds, folderTree?.items],
  );

  const disableSubmit = pending || !folder || !targetLibraryId;

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Move Folder</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Folder: {folder?.name || ''}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Current library: {sourceLibraryName}
          </Typography>

          {!canChangeLibrary && !folderInTemplates && (
            <Alert severity="info">
              Cross-library folder moves are admin-only. You can only reparent within the current library.
            </Alert>
          )}

          {folderInTemplates && (
            <Alert severity="info">
              Folders in the Templates library can only be reorganized within Templates.
            </Alert>
          )}

          <TextField
            select
            label="Target library"
            fullWidth
            value={targetLibraryId}
            onChange={(e) => {
              setTargetLibraryId(e.target.value);
              setTargetFolderId(null);
            }}
            disabled={!canChangeLibrary || folderInTemplates}
          >
            {selectableLibraries.map((library) => (
              <MenuItem key={library.id} value={library.id}>
                {library.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Destination parent"
            fullWidth
            value={targetFolderId || ''}
            onChange={(e) => setTargetFolderId(e.target.value || null)}
            disabled={!targetLibraryId}
          >
            <MenuItem value="">Top level</MenuItem>
            {flatFolders.map((folderOption) => (
              <MenuItem key={folderOption.id} value={folderOption.id}>
                <Box component="span" sx={{ pl: folderOption.depth * 2 }}>
                  {folderOption.name}
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
