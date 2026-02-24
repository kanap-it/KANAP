import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useVirtualRows } from '../../hooks/useVirtualRows';

// Base type for all enum items
export interface EnumItem {
  code: string;
  label: string;
  deprecated?: boolean;
  localId?: string;
}

// Column definition for the editor
export interface EnumEditorColumn<T extends EnumItem> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, onChange: (patch: Partial<T>) => void, isLocked: boolean, isFocused: boolean, focusRef: React.RefCallback<HTMLInputElement>) => React.ReactNode;
}

export interface EnumEditorProps<T extends EnumItem> {
  title: string;
  description: string;
  items: T[];
  onChange: (items: T[]) => void;
  columns?: EnumEditorColumn<T>[];
  lockedCodes?: string[];
  hideAddButton?: boolean;
  addButtonLabel?: string;
  onAddRequest?: () => void;
  addRequestToken?: number;
  rowHeight?: number;
  emptyMessage?: string;
}

// Helper to generate local IDs
const makeLocalId = (prefix = 'enum') =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;

// Ensure items have localIds - returns same reference if no changes needed
const withLocalIds = <T extends EnumItem>(items: T[], prefix = 'enum'): (T & { localId: string })[] => {
  const allHaveIds = items.every((item) => item.localId);
  if (allHaveIds) return items as (T & { localId: string })[];
  return items.map((item) => (item.localId ? item : { ...item, localId: makeLocalId(prefix) })) as (T & { localId: string })[];
};

// Default columns for basic enum editing
const defaultColumns: EnumEditorColumn<EnumItem>[] = [
  {
    key: 'label',
    header: 'Label',
    width: '30%',
    render: (item, onChange, isLocked, isFocused, focusRef) => (
      <TextField
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value } as Partial<EnumItem>)}
        size="small"
        fullWidth
        placeholder="Display label"
        disabled={isLocked}
        inputRef={isFocused ? focusRef : undefined}
      />
    ),
  },
  {
    key: 'code',
    header: 'Code',
    width: '30%',
    render: (item, onChange, isLocked) => (
      <TextField
        value={item.code}
        onChange={(e) => onChange({ code: e.target.value } as Partial<EnumItem>)}
        size="small"
        fullWidth
        placeholder="internal_code"
        disabled={isLocked}
      />
    ),
  },
  {
    key: 'deprecated',
    header: 'Flags',
    width: '20%',
    render: (item, onChange, isLocked) => (
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={!!item.deprecated}
            onChange={(e) => onChange({ deprecated: e.target.checked } as Partial<EnumItem>)}
            disabled={isLocked}
          />
        }
        label="Deprecated"
      />
    ),
  },
];

/**
 * Generic editor component for enum/lookup tables.
 * Supports virtual scrolling for large lists and customizable columns.
 */
export function EnumEditor<T extends EnumItem>({
  title,
  description,
  items,
  onChange,
  columns,
  lockedCodes,
  hideAddButton,
  addButtonLabel = 'Add value',
  onAddRequest,
  addRequestToken,
  rowHeight = 52,
  emptyMessage = 'No values configured yet.',
}: EnumEditorProps<T>) {
  const lockedSet = React.useMemo(
    () => new Set((lockedCodes || []).map((code) => code.toLowerCase())),
    [lockedCodes]
  );

  const itemsWithIds = React.useMemo(
    () => withLocalIds(items, 'enum'),
    [items]
  );

  const [localItems, setLocalItems] = React.useState<T[]>(itemsWithIds);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const firstFieldRef = React.useRef<HTMLInputElement | null>(null);
  const lastAddToken = React.useRef<number | undefined>(undefined);
  const pendingCommitRef = React.useRef(false);

  const { containerRef, onScroll, useVirtual, visibleItems, paddingTop, paddingBottom, maxHeight } =
    useVirtualRows({
      items: localItems,
      rowHeight,
    });

  // Sync down from parent - skip if we just committed to avoid loops
  React.useEffect(() => {
    if (pendingCommitRef.current) {
      pendingCommitRef.current = false;
      return;
    }
    setLocalItems(itemsWithIds);
  }, [itemsWithIds]);

  const commitToParent = React.useCallback(
    (next: T[]) => {
      pendingCommitRef.current = true;
      React.startTransition(() => onChange(next));
    },
    [onChange]
  );

  React.useEffect(() => {
    if (focusId && firstFieldRef.current) {
      firstFieldRef.current.focus();
      firstFieldRef.current.select();
      setFocusId(null);
    }
  }, [focusId]);

  const handleUpdate = React.useCallback(
    (localId: string, patch: Partial<T>) => {
      setLocalItems((prev) => {
        const next = prev.map((item) =>
          (item as any).localId === localId ? { ...item, ...patch } : item
        );
        commitToParent(next);
        return next;
      });
    },
    [commitToParent]
  );

  const handleAdd = React.useCallback(() => {
    const newRow = { code: '', label: '', deprecated: false, localId: makeLocalId('enum') } as T;
    setLocalItems((prev) => {
      const next = [newRow, ...prev];
      commitToParent(next);
      return next;
    });
    setFocusId((newRow as any).localId);
  }, [commitToParent]);

  React.useEffect(() => {
    if (addRequestToken === undefined) return;
    if (addRequestToken === lastAddToken.current) return;
    lastAddToken.current = addRequestToken;
    handleAdd();
  }, [addRequestToken, handleAdd]);

  const handleRemove = React.useCallback(
    (localId: string) => {
      setLocalItems((prev) => {
        const next = prev.filter((row) => (row as any).localId !== localId);
        commitToParent(next);
        return next;
      });
    },
    [commitToParent]
  );

  const effectiveColumns = columns || (defaultColumns as EnumEditorColumn<T>[]);
  const totalColumns = effectiveColumns.length + 1; // +1 for actions column

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
      <TableContainer ref={containerRef as any} onScroll={onScroll} sx={{ maxHeight }}>
        <Table size="small" stickyHeader={useVirtual}>
          <TableHead>
            <TableRow>
              {effectiveColumns.map((col) => (
                <TableCell
                  key={String(col.key)}
                  sx={{ width: col.width }}
                  align={col.align || 'left'}
                >
                  {col.header}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ width: '20%' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {useVirtual && paddingTop > 0 && (
              <TableRow>
                <TableCell colSpan={totalColumns} sx={{ p: 0, height: paddingTop, border: 0 }} />
              </TableRow>
            )}
            {localItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={totalColumns}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {visibleItems.map((item, index) => {
              const typedItem = item as T & { localId: string };
              const isLocked = lockedSet.has(String(typedItem.code || '').toLowerCase());
              const isFocused = typedItem.localId === focusId;

              return (
                <TableRow key={typedItem.localId || index}>
                  {effectiveColumns.map((col, colIndex) => (
                    <TableCell key={String(col.key)} align={col.align || 'left'}>
                      {col.render ? (
                        col.render(
                          typedItem,
                          (patch) => handleUpdate(typedItem.localId, patch),
                          isLocked,
                          isFocused && colIndex === 0,
                          (el) => {
                            if (isFocused && colIndex === 0) {
                              firstFieldRef.current = el;
                            }
                          }
                        )
                      ) : (
                        String((typedItem as any)[col.key] || '')
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    {!isLocked && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemove(typedItem.localId)}
                      >
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {useVirtual && paddingBottom > 0 && (
              <TableRow>
                <TableCell colSpan={totalColumns} sx={{ p: 0, height: paddingBottom, border: 0 }} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {!hideAddButton && (
        <Box sx={{ mt: 1 }}>
          <Button size="small" onClick={onAddRequest || handleAdd}>
            {addButtonLabel}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

// Type-specific editors built on EnumEditor

export interface HostingTypeItem extends EnumItem {
  category?: 'on_prem' | 'cloud';
}

export interface HostingTypeEditorProps {
  items: HostingTypeItem[];
  onChange: (items: HostingTypeItem[]) => void;
  hideAddButton?: boolean;
  onAddRequest?: () => void;
  addRequestToken?: number;
}

const hostingTypeColumns: EnumEditorColumn<HostingTypeItem>[] = [
  {
    key: 'label',
    header: 'Label',
    width: '25%',
    render: (item, onChange, isLocked, isFocused, focusRef) => (
      <TextField
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value })}
        size="small"
        fullWidth
        placeholder="Display label"
        inputRef={isFocused ? focusRef : undefined}
      />
    ),
  },
  {
    key: 'code',
    header: 'Code',
    width: '20%',
    render: (item, onChange) => (
      <TextField
        value={item.code}
        onChange={(e) => onChange({ code: e.target.value })}
        size="small"
        fullWidth
        placeholder="code"
      />
    ),
  },
  {
    key: 'category',
    header: 'Category',
    width: '30%',
    render: (item, onChange) => (
      <RadioGroup
        row
        value={item.category === 'on_prem' ? 'on_prem' : 'cloud'}
        onChange={(e) => onChange({ category: e.target.value as 'on_prem' | 'cloud' })}
      >
        <FormControlLabel value="on_prem" control={<Radio size="small" />} label="On-prem / Colocation" />
        <FormControlLabel value="cloud" control={<Radio size="small" />} label="Cloud / SaaS" />
      </RadioGroup>
    ),
  },
  {
    key: 'deprecated',
    header: 'Deprecated',
    width: '15%',
    render: (item, onChange) => (
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={!!item.deprecated}
            onChange={(e) => onChange({ deprecated: e.target.checked })}
          />
        }
        label="Deprecated"
      />
    ),
  },
];

export function HostingTypeEditor({
  items,
  onChange,
  hideAddButton,
  onAddRequest,
  addRequestToken,
}: HostingTypeEditorProps) {
  return (
    <EnumEditor<HostingTypeItem>
      title="Hosting Types"
      description="Location hosting models available when creating Locations (e.g., On-prem, Colocation, Public Cloud, SaaS)."
      items={items}
      onChange={onChange}
      columns={hostingTypeColumns}
      hideAddButton={hideAddButton}
      addButtonLabel="Add hosting type"
      onAddRequest={onAddRequest}
      addRequestToken={addRequestToken}
      emptyMessage="No hosting types defined."
    />
  );
}

export interface AssetKindItem extends EnumItem {
  is_physical?: boolean;
}

export interface AssetKindEditorProps {
  items: AssetKindItem[];
  onChange: (items: AssetKindItem[]) => void;
  hideAddButton?: boolean;
  onAddRequest?: () => void;
  addRequestToken?: number;
}

const assetKindColumns: EnumEditorColumn<AssetKindItem>[] = [
  {
    key: 'label',
    header: 'Label',
    width: '30%',
    render: (item, onChange, isLocked, isFocused, focusRef) => (
      <TextField
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value })}
        size="small"
        fullWidth
        placeholder="Display label"
        inputRef={isFocused ? focusRef : undefined}
      />
    ),
  },
  {
    key: 'code',
    header: 'Code',
    width: '25%',
    render: (item, onChange) => (
      <TextField
        value={item.code}
        onChange={(e) => onChange({ code: e.target.value })}
        size="small"
        fullWidth
        placeholder="code"
      />
    ),
  },
  {
    key: 'is_physical',
    header: 'Physical',
    width: '15%',
    render: (item, onChange) => (
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={!!item.is_physical}
            onChange={(e) => onChange({ is_physical: e.target.checked })}
          />
        }
        label="Physical"
      />
    ),
  },
  {
    key: 'deprecated',
    header: 'Deprecated',
    width: '15%',
    render: (item, onChange) => (
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={!!item.deprecated}
            onChange={(e) => onChange({ deprecated: e.target.checked })}
          />
        }
        label="Deprecated"
      />
    ),
  },
];

export function AssetKindEditor({
  items,
  onChange,
  hideAddButton,
  onAddRequest,
  addRequestToken,
}: AssetKindEditorProps) {
  return (
    <EnumEditor<AssetKindItem>
      title="Asset Types"
      description="Logical types for servers and infrastructure assets. Physical assets can track hardware and support information."
      items={items}
      onChange={onChange}
      columns={assetKindColumns}
      hideAddButton={hideAddButton}
      addButtonLabel="Add asset type"
      onAddRequest={onAddRequest}
      addRequestToken={addRequestToken}
      emptyMessage="No asset types defined."
    />
  );
}

type GraphTier = 'top' | 'upper' | 'center' | 'lower' | 'bottom';

const GRAPH_TIER_OPTIONS: Array<{ value: GraphTier; label: string }> = [
  { value: 'top', label: 'Top' },
  { value: 'upper', label: 'Upper' },
  { value: 'center', label: 'Center' },
  { value: 'lower', label: 'Lower' },
  { value: 'bottom', label: 'Bottom' },
];

export interface ServerRoleItem extends EnumItem {
  graph_tier?: GraphTier;
}

export interface EntityItem extends EnumItem {
  graph_tier?: GraphTier;
}

const buildTieredColumns = <T extends EnumItem & { graph_tier?: GraphTier }>(
  defaultTier: GraphTier,
): EnumEditorColumn<T>[] => [
  {
    key: 'label',
    header: 'Label',
    width: '30%',
    render: (item, onChange, isLocked, isFocused, focusRef) => (
      <TextField
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value } as Partial<T>)}
        size="small"
        fullWidth
        placeholder="Display label"
        disabled={isLocked}
        inputRef={isFocused ? focusRef : undefined}
      />
    ),
  },
  {
    key: 'code',
    header: 'Code',
    width: '24%',
    render: (item, onChange, isLocked) => (
      <TextField
        value={item.code}
        onChange={(e) => onChange({ code: e.target.value } as Partial<T>)}
        size="small"
        fullWidth
        placeholder="code"
        disabled={isLocked}
      />
    ),
  },
  {
    key: 'graph_tier',
    header: 'Graph tier',
    width: '22%',
    render: (item, onChange, isLocked) => (
      <TextField
        select
        value={item.graph_tier || defaultTier}
        onChange={(e) => onChange({ graph_tier: e.target.value as GraphTier } as Partial<T>)}
        size="small"
        fullWidth
        disabled={isLocked}
      >
        {GRAPH_TIER_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    ),
  },
  {
    key: 'deprecated',
    header: 'Deprecated',
    width: '14%',
    render: (item, onChange, isLocked) => (
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={!!item.deprecated}
            onChange={(e) => onChange({ deprecated: e.target.checked } as Partial<T>)}
            disabled={isLocked}
          />
        }
        label="Deprecated"
      />
    ),
  },
];

const serverRoleColumns = buildTieredColumns<ServerRoleItem>('center');
const entityColumns = buildTieredColumns<EntityItem>('top');

export interface ServerRoleEditorProps {
  items: ServerRoleItem[];
  onChange: (items: ServerRoleItem[]) => void;
  hideAddButton?: boolean;
  onAddRequest?: () => void;
  addRequestToken?: number;
}

export function ServerRoleEditor({
  items,
  onChange,
  hideAddButton,
  onAddRequest,
  addRequestToken,
}: ServerRoleEditorProps) {
  return (
    <EnumEditor<ServerRoleItem>
      title="Server Roles"
      description="Roles assigned to servers when linking app instances. Graph tier influences connection map placement."
      items={items}
      onChange={onChange}
      columns={serverRoleColumns}
      hideAddButton={hideAddButton}
      addButtonLabel="Add server role"
      onAddRequest={onAddRequest}
      addRequestToken={addRequestToken}
      emptyMessage="No server roles defined."
    />
  );
}

export interface EntityEditorProps {
  items: EntityItem[];
  onChange: (items: EntityItem[]) => void;
  hideAddButton?: boolean;
  onAddRequest?: () => void;
  addRequestToken?: number;
}

export function EntityEditor({
  items,
  onChange,
  hideAddButton,
  onAddRequest,
  addRequestToken,
}: EntityEditorProps) {
  return (
    <EnumEditor<EntityItem>
      title="Entities"
      description="Endpoints used in connections and maps. Graph tier influences default map placement."
      items={items}
      onChange={onChange}
      columns={entityColumns}
      hideAddButton={hideAddButton}
      addButtonLabel="Add entity"
      onAddRequest={onAddRequest}
      addRequestToken={addRequestToken}
      emptyMessage="No entities defined."
    />
  );
}

export default EnumEditor;
