import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import DateEUField from '../../components/fields/DateEUField';
import { SettingsSection, SettingsControls, SettingsGroup } from '../../components/settings';
import { EnumEditor, HostingTypeEditor, AssetKindEditor, ServerRoleEditor, EntityEditor } from '../../components/settings';
import type {
  HostingTypeItem,
  AssetKindItem,
  ServerRoleItem,
  EntityItem,
} from '../../components/settings';
import useItOpsSettings from '../../hooks/useItOpsSettings';
import { useVirtualRows } from '../../hooks/useVirtualRows';
import api from '../../api';
import {
  ConnectionTypeOption,
  DomainOption,
  ItOpsEnumOption,
  ItOpsSettings,
  OperatingSystemOption,
  SubnetOption,
  updateItOpsSettings,
} from '../../services/itOpsSettings';
import { useTranslation } from 'react-i18next';

type LocationOption = { id: string; code: string; name: string };

// ============================================================================
// Utility Functions
// ============================================================================

const makeLocalId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;

// Returns same reference if no changes needed to avoid triggering re-renders
const withLocalIds = <T extends { localId?: string }>(list: T[], prefix: string): (T & { localId: string })[] => {
  const allHaveIds = list.every((row) => row.localId);
  if (allHaveIds) return list as (T & { localId: string })[];
  return list.map((row) => (row.localId ? row : { ...(row as any), localId: makeLocalId(prefix) }));
};

const stripLocalIds = <T extends { localId?: string }>(list: T[]): Omit<T, 'localId'>[] =>
  list.map(({ localId, ...rest }) => rest as Omit<T, 'localId'>);

const sortEnum = (list: ItOpsEnumOption[]) =>
  [...list].sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }));

const sortOperatingSystems = (list: OperatingSystemOption[]) =>
  [...list].sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }));

const sortConnectionTypes = (list: ConnectionTypeOption[]) =>
  [...list].sort((a, b) => {
    const catA = (a.category || '').toLowerCase();
    const catB = (b.category || '').toLowerCase();
    if (catA !== catB) return catA.localeCompare(catB);
    return (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' });
  });

const sortSubnets = (list: SubnetOption[]) =>
  [...list].sort((a, b) => {
    const locCmp = (a.location_id || '').localeCompare(b.location_id || '');
    if (locCmp !== 0) return locCmp;
    return (a.cidr || '').localeCompare(b.cidr || '');
  });

const sortDomains = (list: DomainOption[]) =>
  [...list].sort((a, b) => {
    if (a.system && !b.system) return -1;
    if (!a.system && b.system) return 1;
    return (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' });
  });

const listsEqual = (a: ItOpsEnumOption[], b: ItOpsEnumOption[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (left.code !== right.code || left.label !== right.label) return false;
    if (!!left.deprecated !== !!right.deprecated) return false;
    if ((left.category || undefined) !== (right.category || undefined)) return false;
    if (((left as any).graph_tier || undefined) !== ((right as any).graph_tier || undefined)) return false;
    if (((left as any).typicalPorts || undefined) !== ((right as any).typicalPorts || undefined)) return false;
  }
  return true;
};

const osListsEqual = (a: OperatingSystemOption[], b: OperatingSystemOption[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (left.code !== right.code || left.label !== right.label) return false;
    if (!!left.deprecated !== !!right.deprecated) return false;
    if ((left.standardSupportEnd || '') !== (right.standardSupportEnd || '')) return false;
    if ((left.extendedSupportEnd || '') !== (right.extendedSupportEnd || '')) return false;
  }
  return true;
};

// ============================================================================
// Type Definitions
// ============================================================================

type EnumListId =
  | 'applicationCategories'
  | 'dataClasses'
  | 'networkSegments'
  | 'entities'
  | 'serverKinds'
  | 'serverProviders'
  | 'serverRoles'
  | 'hostingTypes'
  | 'lifecycleStates'
  | 'interfaceProtocols'
  | 'interfaceDataCategories'
  | 'interfaceTriggerTypes'
  | 'interfacePatterns'
  | 'interfaceFormats'
  | 'interfaceAuthModes'
  | 'ipAddressTypes'
  | 'accessMethods';

type ListId = EnumListId | 'operatingSystems' | 'connectionTypes' | 'subnets' | 'domains';
type GroupId = 'locations' | 'serversConnections' | 'appsInterfaces';

// ============================================================================
// Constants
// ============================================================================

const enumListIds: EnumListId[] = [
  'applicationCategories', 'dataClasses', 'networkSegments', 'entities', 'serverKinds',
  'serverProviders', 'serverRoles', 'hostingTypes', 'lifecycleStates', 'interfaceProtocols',
  'interfaceDataCategories', 'interfaceTriggerTypes', 'interfacePatterns', 'interfaceFormats',
  'interfaceAuthModes', 'ipAddressTypes', 'accessMethods',
];

const listGroups: { id: GroupId; title: string; subtitle: string }[] = [
  { id: 'locations', title: 'Locations', subtitle: 'Lists used when creating or editing Locations.' },
  { id: 'serversConnections', title: 'Servers & Connections', subtitle: 'Lists used for Servers, Connections, and related risk/endpoint data.' },
  { id: 'appsInterfaces', title: 'Apps, Services & Interfaces', subtitle: 'Lists used across applications, app instances, interfaces, and bindings.' },
];

const listUsage: Record<ListId, string> = {
  hostingTypes: 'Locations / Create & Edit',
  serverProviders: 'Locations / Create & Edit',
  serverKinds: 'Servers / Overview & Create',
  serverRoles: 'Servers / App Link',
  operatingSystems: 'Servers / Technical tab',
  subnets: 'Assets / Network information',
  domains: 'Assets / Identity section',
  connectionTypes: 'Connections / Protocol selector',
  networkSegments: 'Subnets / Network zone selector',
  entities: 'Connections / Endpoints',
  applicationCategories: 'Applications / Category selector',
  dataClasses: 'Connections / Risk defaults',
  lifecycleStates: 'Apps, Interfaces & Servers / Status',
  interfaceProtocols: 'Interface Bindings / Transport',
  interfaceDataCategories: 'Interfaces / Data profile',
  interfaceTriggerTypes: 'Interface Legs / Trigger',
  interfacePatterns: 'Interface Legs / Pattern',
  interfaceFormats: 'Interface Legs / Payload format',
  interfaceAuthModes: 'Interface Bindings / Auth',
  ipAddressTypes: 'Assets / IP Addresses',
  accessMethods: 'Applications / Access method selector',
};

type EnumSectionConfig = {
  id: EnumListId;
  title: string;
  description: string;
  group: GroupId;
  lockedCodes?: string[];
  kind?: 'enum' | 'hosting' | 'serverKind' | 'serverRole' | 'entity';
};

const enumSections: EnumSectionConfig[] = [
  { id: 'accessMethods', title: 'Access Methods', description: 'Methods by which users access applications (e.g., Web, Mobile, VDI).', group: 'appsInterfaces' },
  { id: 'applicationCategories', title: 'Application Categories', description: 'Categories that describe the primary purpose of each application or service.', group: 'appsInterfaces' },
  { id: 'dataClasses', title: 'Data Classes', description: 'Tenant-wide data classification levels used by Applications and Interfaces.', group: 'appsInterfaces' },
  { id: 'networkSegments', title: 'Network Zones', description: 'Network zones used to categorize subnets and describe connectivity.', group: 'serversConnections' },
  { id: 'entities', title: 'Entities', description: 'Source/target entities for flows or access.', group: 'serversConnections', kind: 'entity' },
  { id: 'ipAddressTypes', title: 'IP Address Types', description: 'Types of IP addresses for assets.', group: 'serversConnections' },
  { id: 'serverKinds', title: 'Asset Types', description: 'Logical types for servers and infrastructure assets.', group: 'serversConnections', kind: 'serverKind' },
  { id: 'serverRoles', title: 'Server Roles', description: 'Roles you can assign to servers when linking them to application instances.', group: 'serversConnections', kind: 'serverRole' },
  { id: 'hostingTypes', title: 'Hosting Types', description: 'Location hosting models available when creating Locations.', group: 'locations', kind: 'hosting' },
  { id: 'serverProviders', title: 'Cloud Providers', description: 'Cloud providers used by Servers and Locations.', group: 'locations' },
  { id: 'lifecycleStates', title: 'Lifecycle statuses', description: 'Shared lifecycle options for applications, app instances, interfaces, interface bindings, and servers.', group: 'appsInterfaces', lockedCodes: ['proposed', 'active', 'deprecated', 'retired'] },
  { id: 'interfaceProtocols', title: 'Interface Protocols', description: 'Supported protocols for interface bindings between applications.', group: 'appsInterfaces' },
  { id: 'interfaceDataCategories', title: 'Interface Data Categories', description: 'Business data categories for Interfaces.', group: 'appsInterfaces' },
  { id: 'interfaceTriggerTypes', title: 'Interface Trigger Types', description: 'Trigger types for Interface legs.', group: 'appsInterfaces' },
  { id: 'interfacePatterns', title: 'Integration Patterns', description: 'Integration patterns used by Interface legs.', group: 'appsInterfaces' },
  { id: 'interfaceFormats', title: 'Interface Data Formats', description: 'Data formats for Interface legs.', group: 'appsInterfaces' },
  { id: 'interfaceAuthModes', title: 'Interface Authentication Modes', description: 'Authentication modes for Interface legs/bindings.', group: 'appsInterfaces' },
];

// ============================================================================
// Specialized Editors
// ============================================================================

interface OperatingSystemsEditorProps {
  items: OperatingSystemOption[];
  onChange: (items: OperatingSystemOption[]) => void;
  hideAddButton?: boolean;
}

const OperatingSystemsEditor = React.memo(function OperatingSystemsEditor({
  items,
  onChange,
  hideAddButton,
}: OperatingSystemsEditorProps) {
  const itemsWithIds = React.useMemo(() => withLocalIds(items, 'os'), [items]);
  const [localItems, setLocalItems] = React.useState(itemsWithIds);
  const pendingCommitRef = React.useRef(false);
  const { containerRef, onScroll, useVirtual, visibleItems, paddingTop, paddingBottom, maxHeight } =
    useVirtualRows({ items: localItems, rowHeight: 64 });

  // Sync down from parent - skip if we just committed to avoid loops
  React.useEffect(() => {
    if (pendingCommitRef.current) {
      pendingCommitRef.current = false;
      return;
    }
    setLocalItems(itemsWithIds);
  }, [itemsWithIds]);

  const commitToParent = React.useCallback(
    (next: OperatingSystemOption[]) => {
      pendingCommitRef.current = true;
      React.startTransition(() => onChange(next));
    },
    [onChange]
  );

  const handleUpdate = (localId: string, patch: Partial<OperatingSystemOption>) => {
    setLocalItems((prev) => {
      const next = prev.map((item) => ((item as any).localId === localId ? { ...item, ...patch } : item));
      commitToParent(next);
      return next;
    });
  };

  const handleRemove = (localId: string) => {
    setLocalItems((prev) => {
      const next = prev.filter((row) => (row as any).localId !== localId);
      commitToParent(next);
      return next;
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Operating Systems</Typography>
        <Typography variant="body2" color="text.secondary">
          Catalog of operating systems available for Servers, with standard and extended support end dates.
        </Typography>
      </Stack>
      <TableContainer ref={containerRef as any} onScroll={onScroll} sx={{ maxHeight }}>
        <Table size="small" stickyHeader={useVirtual}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '22%' }}>Name</TableCell>
              <TableCell sx={{ width: '18%' }}>Code</TableCell>
              <TableCell sx={{ width: '20%' }}>Standard Support</TableCell>
              <TableCell sx={{ width: '20%' }}>Extended Support</TableCell>
              <TableCell sx={{ width: '10%' }}>Deprecated</TableCell>
              <TableCell align="right" sx={{ width: '10%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {useVirtual && paddingTop > 0 && (
              <TableRow><TableCell colSpan={6} sx={{ p: 0, height: paddingTop, border: 0 }} /></TableRow>
            )}
            {localItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">No operating systems configured yet.</Typography>
                </TableCell>
              </TableRow>
            )}
            {visibleItems.map((item: any) => (
              <TableRow key={item.localId}>
                <TableCell>
                  <TextField value={item.label} onChange={(e) => handleUpdate(item.localId, { label: e.target.value })} size="small" fullWidth placeholder="Display name" />
                </TableCell>
                <TableCell>
                  <TextField value={item.code} onChange={(e) => handleUpdate(item.localId, { code: e.target.value })} size="small" fullWidth placeholder="slug_code" />
                </TableCell>
                <TableCell>
                  <DateEUField label="Standard Support" valueYmd={item.standardSupportEnd || ''} onChangeYmd={(next) => handleUpdate(item.localId, { standardSupportEnd: next })} />
                </TableCell>
                <TableCell>
                  <DateEUField label="Extended Support" valueYmd={item.extendedSupportEnd || ''} onChangeYmd={(next) => handleUpdate(item.localId, { extendedSupportEnd: next })} />
                </TableCell>
                <TableCell>
                  <FormControlLabel control={<Checkbox size="small" checked={!!item.deprecated} onChange={(e) => handleUpdate(item.localId, { deprecated: e.target.checked })} />} label="Deprecated" />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" color="error" onClick={() => handleRemove(item.localId)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
            {useVirtual && paddingBottom > 0 && (
              <TableRow><TableCell colSpan={6} sx={{ p: 0, height: paddingBottom, border: 0 }} /></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
});

interface ConnectionTypesEditorProps {
  items: ConnectionTypeOption[];
  onChange: (items: ConnectionTypeOption[]) => void;
}

const ConnectionTypesEditor = React.memo(function ConnectionTypesEditor({
  items,
  onChange,
}: ConnectionTypesEditorProps) {
  const itemsWithIds = React.useMemo(() => withLocalIds(items, 'ct'), [items]);
  const [localItems, setLocalItems] = React.useState(itemsWithIds);
  const pendingCommitRef = React.useRef(false);
  const { containerRef, onScroll, useVirtual, visibleItems, paddingTop, paddingBottom, maxHeight } =
    useVirtualRows({ items: localItems, rowHeight: 60 });

  // Sync down from parent - skip if we just committed to avoid loops
  React.useEffect(() => {
    if (pendingCommitRef.current) {
      pendingCommitRef.current = false;
      return;
    }
    setLocalItems(itemsWithIds);
  }, [itemsWithIds]);

  const commitToParent = React.useCallback(
    (next: ConnectionTypeOption[]) => {
      pendingCommitRef.current = true;
      React.startTransition(() => onChange(next));
    },
    [onChange]
  );

  const handleUpdate = React.useCallback(
    (localId: string, patch: Partial<ConnectionTypeOption>) => {
      setLocalItems((prev) => {
        const next = prev.map((row: any) => (row.localId === localId ? { ...row, ...patch } : row));
        commitToParent(next);
        return next;
      });
    },
    [commitToParent]
  );

  const handleRemove = React.useCallback(
    (localId: string) => {
      setLocalItems((prev) => {
        const next = prev.filter((row: any) => row.localId !== localId);
        commitToParent(next);
        return next;
      });
    },
    [commitToParent]
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Connection Types</Typography>
        <Typography variant="body2" color="text.secondary">
          Two-level catalog (category + entry) with typical ports.
        </Typography>
      </Stack>
      <TableContainer ref={containerRef as any} onScroll={onScroll} sx={{ maxHeight }}>
        <Table size="small" stickyHeader={useVirtual}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '20%' }}>Category</TableCell>
              <TableCell sx={{ width: '20%' }}>Label</TableCell>
              <TableCell sx={{ width: '15%' }}>Code</TableCell>
              <TableCell sx={{ width: '25%' }}>Typical ports</TableCell>
              <TableCell sx={{ width: '10%' }}>Deprecated</TableCell>
              <TableCell align="right" sx={{ width: '10%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {useVirtual && paddingTop > 0 && (
              <TableRow><TableCell colSpan={6} sx={{ p: 0, height: paddingTop, border: 0 }} /></TableRow>
            )}
            {localItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">No connection types defined.</Typography>
                </TableCell>
              </TableRow>
            )}
            {visibleItems.map((item: any) => (
              <TableRow key={item.localId}>
                <TableCell><TextField value={item.category || ''} onChange={(e) => handleUpdate(item.localId, { category: e.target.value })} size="small" fullWidth placeholder="Category" /></TableCell>
                <TableCell><TextField value={item.label} onChange={(e) => handleUpdate(item.localId, { label: e.target.value })} size="small" fullWidth placeholder="Label" /></TableCell>
                <TableCell><TextField value={item.code} onChange={(e) => handleUpdate(item.localId, { code: e.target.value })} size="small" fullWidth placeholder="code" /></TableCell>
                <TableCell><TextField value={item.typicalPorts || ''} onChange={(e) => handleUpdate(item.localId, { typicalPorts: e.target.value })} size="small" fullWidth placeholder="e.g., 80, 443" /></TableCell>
                <TableCell><FormControlLabel control={<Checkbox size="small" checked={!!item.deprecated} onChange={(e) => handleUpdate(item.localId, { deprecated: e.target.checked })} />} label="Deprecated" /></TableCell>
                <TableCell align="right"><Button size="small" color="error" onClick={() => handleRemove(item.localId)}>Remove</Button></TableCell>
              </TableRow>
            ))}
            {useVirtual && paddingBottom > 0 && (
              <TableRow><TableCell colSpan={6} sx={{ p: 0, height: paddingBottom, border: 0 }} /></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
});

interface SubnetsEditorProps {
  items: SubnetOption[];
  networkZones: ItOpsEnumOption[];
  locations: LocationOption[];
  onChange: (items: SubnetOption[]) => void;
}

const SubnetsEditor = React.memo(function SubnetsEditor({
  items,
  networkZones,
  locations,
  onChange,
}: SubnetsEditorProps) {
  const itemsWithIds = React.useMemo(() => withLocalIds(items, 'subnet'), [items]);
  const [localItems, setLocalItems] = React.useState(itemsWithIds);
  const pendingCommitRef = React.useRef(false);
  const { containerRef, onScroll, useVirtual, visibleItems, paddingTop, paddingBottom, maxHeight } =
    useVirtualRows({ items: localItems, rowHeight: 60 });

  // Sync down from parent - skip if we just committed to avoid loops
  React.useEffect(() => {
    if (pendingCommitRef.current) {
      pendingCommitRef.current = false;
      return;
    }
    setLocalItems(itemsWithIds);
  }, [itemsWithIds]);

  const commitToParent = React.useCallback(
    (next: SubnetOption[]) => {
      pendingCommitRef.current = true;
      React.startTransition(() => onChange(next));
    },
    [onChange]
  );

  const handleUpdate = React.useCallback(
    (localId: string, patch: Partial<SubnetOption>) => {
      setLocalItems((prev) => {
        const next = prev.map((row: any) => (row.localId === localId ? { ...row, ...patch } : row));
        commitToParent(next);
        return next;
      });
    },
    [commitToParent]
  );

  const handleRemove = React.useCallback(
    (localId: string) => {
      setLocalItems((prev) => {
        const next = prev.filter((row: any) => row.localId !== localId);
        commitToParent(next);
        return next;
      });
    },
    [commitToParent]
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Subnets</Typography>
        <Typography variant="body2" color="text.secondary">
          Define network subnets with VLAN assignments. Each subnet belongs to a network zone.
        </Typography>
      </Stack>
      <TableContainer ref={containerRef as any} onScroll={onScroll} sx={{ maxHeight }}>
        <Table size="small" stickyHeader={useVirtual}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '18%' }}>Location</TableCell>
              <TableCell sx={{ width: '18%' }}>CIDR</TableCell>
              <TableCell sx={{ width: '10%' }}>VLAN</TableCell>
              <TableCell sx={{ width: '16%' }}>Network Zone</TableCell>
              <TableCell sx={{ width: '20%' }}>Description</TableCell>
              <TableCell sx={{ width: '8%' }}>Deprecated</TableCell>
              <TableCell align="right" sx={{ width: '10%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {useVirtual && paddingTop > 0 && (
              <TableRow><TableCell colSpan={7} sx={{ p: 0, height: paddingTop, border: 0 }} /></TableRow>
            )}
            {localItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">No subnets defined.</Typography>
                </TableCell>
              </TableRow>
            )}
            {visibleItems.map((item: any) => (
              <TableRow key={item.localId}>
                <TableCell>
                  <TextField select value={item.location_id || ''} onChange={(e) => handleUpdate(item.localId, { location_id: e.target.value })} size="small" fullWidth SelectProps={{ native: true }}>
                    <option value="">Select...</option>
                    {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.code}</option>)}
                  </TextField>
                </TableCell>
                <TableCell><TextField value={item.cidr || ''} onChange={(e) => handleUpdate(item.localId, { cidr: e.target.value })} size="small" fullWidth placeholder="e.g., 192.168.1.0/24" /></TableCell>
                <TableCell>
                  <TextField value={item.vlan_number ?? ''} onChange={(e) => handleUpdate(item.localId, { vlan_number: e.target.value.trim() === '' ? undefined : parseInt(e.target.value, 10) || undefined })} size="small" fullWidth placeholder="1-4094" type="number" inputProps={{ min: 1, max: 4094 }} sx={{ '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }} />
                </TableCell>
                <TableCell>
                  <TextField select value={item.network_zone || ''} onChange={(e) => handleUpdate(item.localId, { network_zone: e.target.value })} size="small" fullWidth SelectProps={{ native: true }}>
                    <option value="">Select...</option>
                    {networkZones.filter((zone) => !zone.deprecated || zone.code === item.network_zone).map((zone) => <option key={zone.code} value={zone.code}>{zone.label}</option>)}
                  </TextField>
                </TableCell>
                <TableCell><TextField value={item.description || ''} onChange={(e) => handleUpdate(item.localId, { description: e.target.value })} size="small" fullWidth placeholder="Description" /></TableCell>
                <TableCell><FormControlLabel control={<Checkbox size="small" checked={!!item.deprecated} onChange={(e) => handleUpdate(item.localId, { deprecated: e.target.checked })} />} label="" /></TableCell>
                <TableCell align="right"><Button size="small" color="error" onClick={() => handleRemove(item.localId)}>Remove</Button></TableCell>
              </TableRow>
            ))}
            {useVirtual && paddingBottom > 0 && (
              <TableRow><TableCell colSpan={7} sx={{ p: 0, height: paddingBottom, border: 0 }} /></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
});

interface DomainsEditorProps {
  items: DomainOption[];
  onChange: (items: DomainOption[]) => void;
}

const DomainsEditor = React.memo(function DomainsEditor({ items, onChange }: DomainsEditorProps) {
  const itemsWithIds = React.useMemo(() => withLocalIds(items, 'domain'), [items]);
  const [localItems, setLocalItems] = React.useState(itemsWithIds);
  const pendingCommitRef = React.useRef(false);
  const { containerRef, onScroll, useVirtual, visibleItems, paddingTop, paddingBottom, maxHeight } =
    useVirtualRows({ items: localItems, rowHeight: 52 });

  // Sync down from parent - skip if we just committed to avoid loops
  React.useEffect(() => {
    if (pendingCommitRef.current) {
      pendingCommitRef.current = false;
      return;
    }
    setLocalItems(itemsWithIds);
  }, [itemsWithIds]);

  const commitToParent = React.useCallback(
    (next: DomainOption[]) => {
      pendingCommitRef.current = true;
      React.startTransition(() => onChange(next));
    },
    [onChange]
  );

  const handleUpdate = React.useCallback(
    (localId: string, patch: Partial<DomainOption>) => {
      setLocalItems((prev) => {
        const next = prev.map((row: any) => (row.localId === localId ? { ...row, ...patch } : row));
        commitToParent(next);
        return next;
      });
    },
    [commitToParent]
  );

  const handleRemove = React.useCallback(
    (localId: string) => {
      setLocalItems((prev) => {
        const next = prev.filter((row: any) => row.localId !== localId);
        commitToParent(next);
        return next;
      });
    },
    [commitToParent]
  );

  const handleLabelChange = React.useCallback(
    (localId: string, newLabel: string, currentCode: string, currentDnsSuffix: string, prevLabel: string) => {
      const updates: Partial<DomainOption> = { label: newLabel };
      const autoCodeFromPrev = (prevLabel || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const autoSuffixFromPrev = (prevLabel || '').toLowerCase().replace(/\s+/g, '');
      const autoCodeFromNew = newLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const autoSuffixFromNew = newLabel.toLowerCase().replace(/\s+/g, '');
      if (!currentCode || currentCode === autoCodeFromPrev) updates.code = autoCodeFromNew;
      if (!currentDnsSuffix || currentDnsSuffix === autoSuffixFromPrev) updates.dns_suffix = autoSuffixFromNew;
      handleUpdate(localId, updates);
    },
    [handleUpdate]
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Domains</Typography>
        <Typography variant="body2" color="text.secondary">
          Define Active Directory or DNS domains for assets. System entries cannot be modified.
        </Typography>
      </Stack>
      <TableContainer ref={containerRef as any} onScroll={onScroll} sx={{ maxHeight }}>
        <Table size="small" stickyHeader={useVirtual}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '25%' }}>Name</TableCell>
              <TableCell sx={{ width: '20%' }}>Code</TableCell>
              <TableCell sx={{ width: '30%' }}>DNS Suffix</TableCell>
              <TableCell sx={{ width: '10%' }}>Deprecated</TableCell>
              <TableCell align="right" sx={{ width: '15%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {useVirtual && paddingTop > 0 && (
              <TableRow><TableCell colSpan={5} sx={{ p: 0, height: paddingTop, border: 0 }} /></TableRow>
            )}
            {localItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">No domains defined.</Typography>
                </TableCell>
              </TableRow>
            )}
            {visibleItems.map((item: any) => {
              const isSystem = !!item.system;
              return (
                <TableRow key={item.localId}>
                  <TableCell><TextField value={item.label || ''} onChange={(e) => handleLabelChange(item.localId, e.target.value, item.code || '', item.dns_suffix || '', item.label || '')} size="small" fullWidth placeholder="Display name" disabled={isSystem} InputProps={{ readOnly: isSystem }} /></TableCell>
                  <TableCell><TextField value={item.code || ''} onChange={(e) => handleUpdate(item.localId, { code: e.target.value.toLowerCase().replace(/\s+/g, '-') })} size="small" fullWidth placeholder="code" disabled={isSystem} InputProps={{ readOnly: isSystem }} /></TableCell>
                  <TableCell><TextField value={item.dns_suffix || ''} onChange={(e) => handleUpdate(item.localId, { dns_suffix: e.target.value.toLowerCase() })} size="small" fullWidth placeholder="e.g., corp.example.com" disabled={isSystem} InputProps={{ readOnly: isSystem }} /></TableCell>
                  <TableCell><FormControlLabel control={<Checkbox size="small" checked={!!item.deprecated} onChange={(e) => handleUpdate(item.localId, { deprecated: e.target.checked })} disabled={isSystem} />} label="" /></TableCell>
                  <TableCell align="right">
                    {isSystem ? (
                      <Typography variant="caption" color="text.secondary">System</Typography>
                    ) : (
                      <Button size="small" color="error" onClick={() => handleRemove(item.localId)}>Remove</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {useVirtual && paddingBottom > 0 && (
              <TableRow><TableCell colSpan={5} sx={{ p: 0, height: paddingBottom, border: 0 }} /></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
});

// ============================================================================
// State Management
// ============================================================================

const emptyEnums = enumListIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {} as Record<EnumListId, ItOpsEnumOption[]>);

type SettingsState = {
  enums: Record<EnumListId, ItOpsEnumOption[]>;
  operatingSystems: OperatingSystemOption[];
  connectionTypes: ConnectionTypeOption[];
  subnets: SubnetOption[];
  domains: DomainOption[];
  baseline: ItOpsSettings | null;
  dirty: Partial<Record<ListId, boolean>>;
  pending: ListId | null;
  successMessage: string;
  errorMessage: string | null;
};

const initialState: SettingsState = {
  enums: emptyEnums,
  operatingSystems: [],
  connectionTypes: [],
  subnets: [],
  domains: [],
  baseline: null,
  dirty: {},
  pending: null,
  successMessage: '',
  errorMessage: null,
};

type Action =
  | { type: 'hydrate'; payload: ItOpsSettings }
  | { type: 'setEnum'; id: EnumListId; items: ItOpsEnumOption[] }
  | { type: 'setOperatingSystems'; items: OperatingSystemOption[] }
  | { type: 'setConnectionTypes'; items: ConnectionTypeOption[] }
  | { type: 'setSubnets'; items: SubnetOption[] }
  | { type: 'setDomains'; items: DomainOption[] }
  | { type: 'resetEnum'; id: EnumListId }
  | { type: 'resetOperatingSystems' }
  | { type: 'resetConnectionTypes' }
  | { type: 'resetSubnets' }
  | { type: 'resetDomains' }
  | { type: 'setPending'; id: ListId | null }
  | { type: 'setSuccess'; message: string }
  | { type: 'setError'; message: string | null };

function hydrateFromSettings(settings: ItOpsSettings) {
  const enums = { ...emptyEnums };
  enumListIds.forEach((id) => {
    const list = ((settings as any)[id] as ItOpsEnumOption[] | undefined) || [];
    enums[id] = withLocalIds(sortEnum(list), id);
  });
  return {
    enums,
    operatingSystems: withLocalIds(sortOperatingSystems(settings.operatingSystems || []), 'os'),
    connectionTypes: withLocalIds(sortConnectionTypes(settings.connectionTypes || []), 'ct'),
    subnets: withLocalIds(sortSubnets(settings.subnets || []), 'subnet'),
    domains: withLocalIds(sortDomains(settings.domains || []), 'domain'),
    baseline: settings,
  };
}

function reducer(state: SettingsState, action: Action): SettingsState {
  switch (action.type) {
    case 'hydrate': {
      const next = hydrateFromSettings(action.payload);
      return { ...state, ...next, dirty: {}, pending: null, successMessage: '', errorMessage: null };
    }
    case 'setEnum': {
      const enums = { ...state.enums, [action.id]: action.items };
      const baselineList = state.baseline ? (state.baseline as any)[action.id] || [] : [];
      const dirtyFlag = !listsEqual(stripLocalIds(action.items), baselineList);
      return { ...state, enums, dirty: { ...state.dirty, [action.id]: dirtyFlag } };
    }
    case 'setOperatingSystems': {
      const baselineList = state.baseline?.operatingSystems || [];
      const dirtyFlag = !osListsEqual(stripLocalIds(action.items), baselineList);
      return { ...state, operatingSystems: action.items, dirty: { ...state.dirty, operatingSystems: dirtyFlag } };
    }
    case 'setConnectionTypes': {
      const baselineList = state.baseline?.connectionTypes || [];
      const dirtyFlag = !listsEqual(stripLocalIds(action.items), baselineList as ItOpsEnumOption[]);
      return { ...state, connectionTypes: action.items, dirty: { ...state.dirty, connectionTypes: dirtyFlag } };
    }
    case 'setSubnets': {
      const baselineList = state.baseline?.subnets || [];
      const dirtyFlag = JSON.stringify(stripLocalIds(action.items)) !== JSON.stringify(baselineList);
      return { ...state, subnets: action.items, dirty: { ...state.dirty, subnets: dirtyFlag } };
    }
    case 'setDomains': {
      const baselineList = state.baseline?.domains || [];
      const dirtyFlag = JSON.stringify(stripLocalIds(action.items)) !== JSON.stringify(baselineList);
      return { ...state, domains: action.items, dirty: { ...state.dirty, domains: dirtyFlag } };
    }
    case 'resetEnum': {
      if (!state.baseline) return state;
      const baselineList = withLocalIds(sortEnum((state.baseline as any)[action.id] || []), action.id);
      return { ...state, enums: { ...state.enums, [action.id]: baselineList }, dirty: { ...state.dirty, [action.id]: false } };
    }
    case 'resetOperatingSystems': {
      if (!state.baseline) return state;
      const os = withLocalIds(sortOperatingSystems(state.baseline.operatingSystems || []), 'os');
      return { ...state, operatingSystems: os, dirty: { ...state.dirty, operatingSystems: false } };
    }
    case 'resetConnectionTypes': {
      if (!state.baseline) return state;
      const conn = withLocalIds(sortConnectionTypes(state.baseline.connectionTypes || []), 'ct');
      return { ...state, connectionTypes: conn, dirty: { ...state.dirty, connectionTypes: false } };
    }
    case 'resetSubnets': {
      if (!state.baseline) return state;
      const sn = withLocalIds(sortSubnets(state.baseline.subnets || []), 'subnet');
      return { ...state, subnets: sn, dirty: { ...state.dirty, subnets: false } };
    }
    case 'resetDomains': {
      if (!state.baseline) return state;
      const dom = withLocalIds(sortDomains(state.baseline.domains || []), 'domain');
      return { ...state, domains: dom, dirty: { ...state.dirty, domains: false } };
    }
    case 'setPending':
      return { ...state, pending: action.id || null };
    case 'setSuccess':
      return { ...state, successMessage: action.message, errorMessage: null };
    case 'setError':
      return { ...state, errorMessage: action.message || null };
    default:
      return state;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export default function ItOperationsSettingsPage() {
  const { t } = useTranslation(['it', 'common']);
  const queryClient = useQueryClient();
  const { data, isError } = useItOpsSettings();
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const { data: locations } = useQuery({
    queryKey: ['locations', 'options'],
    queryFn: async () => {
      const res = await api.get<{ items: LocationOption[] }>('/locations', { params: { limit: 500, sort: 'code:ASC' } });
      return (res.data?.items || []) as LocationOption[];
    },
  });

  React.useEffect(() => {
    if (data) dispatch({ type: 'hydrate', payload: data });
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<ItOpsSettings>) => updateItOpsSettings(payload),
    onSuccess: (next: ItOpsSettings) => {
      queryClient.invalidateQueries({ queryKey: ['it-ops-settings'] });
      dispatch({ type: 'hydrate', payload: next });
      dispatch({ type: 'setSuccess', message: 'IT Landscape settings updated successfully' });
    },
    onError: (error) => {
      dispatch({ type: 'setError', message: error instanceof Error ? error.message : 'Failed to update settings' });
    },
    onSettled: () => dispatch({ type: 'setPending', id: null }),
  });

  const submitting = mutation.isPending;
  const errorMessage = state.errorMessage || (mutation.error ? 'Failed to update settings' : null);

  const handleSaveEnum = (id: EnumListId) => {
    const current = state.enums[id] || [];
    const sorted = withLocalIds(sortEnum(current), id);
    dispatch({ type: 'setEnum', id, items: sorted });
    dispatch({ type: 'setPending', id });
    mutation.mutate({ [id]: stripLocalIds(sorted) });
  };

  const handleSaveOperatingSystems = () => {
    const sorted = withLocalIds(sortOperatingSystems(state.operatingSystems), 'os');
    dispatch({ type: 'setOperatingSystems', items: sorted });
    dispatch({ type: 'setPending', id: 'operatingSystems' });
    mutation.mutate({ operatingSystems: stripLocalIds(sorted) });
  };

  const handleSaveConnections = () => {
    const sorted = withLocalIds(sortConnectionTypes(state.connectionTypes), 'ct');
    dispatch({ type: 'setConnectionTypes', items: sorted });
    dispatch({ type: 'setPending', id: 'connectionTypes' });
    mutation.mutate({ connectionTypes: stripLocalIds(sorted) });
  };

  const handleSaveSubnets = () => {
    const sorted = withLocalIds(sortSubnets(state.subnets), 'subnet');
    dispatch({ type: 'setSubnets', items: sorted });
    dispatch({ type: 'setPending', id: 'subnets' });
    mutation.mutate({ subnets: stripLocalIds(sorted) });
  };

  const handleSaveDomains = () => {
    const sorted = withLocalIds(sortDomains(state.domains), 'domain');
    dispatch({ type: 'setDomains', items: sorted });
    dispatch({ type: 'setPending', id: 'domains' });
    mutation.mutate({ domains: stripLocalIds(sorted) });
  };

  const makeEmptyEnumRow = (id: EnumListId): ItOpsEnumOption => {
    if (id === 'hostingTypes') return { code: '', label: '', category: 'cloud', deprecated: false };
    if (id === 'serverKinds') return { code: '', label: '', is_physical: false, deprecated: false } as any;
    if (id === 'serverRoles') return { code: '', label: '', graph_tier: 'center', deprecated: false } as any;
    if (id === 'entities') return { code: '', label: '', graph_tier: 'top', deprecated: false } as any;
    return { code: '', label: '', deprecated: false };
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ pt: 1, pb: 1 }}>
        <PageHeader title={t('pages.settings.title')} />
      </Box>
      <Typography variant="body1" color="text.secondary">
        Configure reusable lists for data classification, server catalog, and interface protocols used across the IT Landscape workspace.
      </Typography>
      {isError && <Alert severity="error">Failed to load IT Landscape settings.</Alert>}
      {state.successMessage && <Alert severity="success">{state.successMessage}</Alert>}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      <Stack spacing={3}>
        {listGroups.map((group, groupIndex) => {
          const groupEnumSections = enumSections.filter((section) => section.group === group.id);
          const extraSections = group.id === 'serversConnections'
            ? [
              { id: 'connectionTypes' as const, title: 'Connection Types' },
              { id: 'domains' as const, title: 'Domains' },
              { id: 'operatingSystems' as const, title: 'Operating Systems' },
              { id: 'subnets' as const, title: 'Subnets' },
            ]
            : [];

          const groupSections = [...groupEnumSections, ...extraSections].sort((a, b) =>
            a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
          );

          return (
            <SettingsGroup key={group.id} title={group.title} subtitle={group.subtitle} showDivider={groupIndex > 0}>
              {groupSections.map((section) => {
                if (section.id === 'operatingSystems') {
                  return (
                    <SettingsSection key={section.id} title="Operating Systems" description={listUsage.operatingSystems}>
                      <SettingsControls
                        onAdd={() => dispatch({ type: 'setOperatingSystems', items: [{ code: '', label: '', standardSupportEnd: '', extendedSupportEnd: '', deprecated: false, localId: makeLocalId('os') }, ...state.operatingSystems] })}
                        onSave={handleSaveOperatingSystems}
                        onReset={() => dispatch({ type: 'resetOperatingSystems' })}
                        saving={state.pending === 'operatingSystems' && submitting}
                        dirty={!!state.dirty.operatingSystems}
                      />
                      <OperatingSystemsEditor items={state.operatingSystems} onChange={(next) => dispatch({ type: 'setOperatingSystems', items: withLocalIds(next, 'os') })} hideAddButton />
                    </SettingsSection>
                  );
                }
                if (section.id === 'connectionTypes') {
                  return (
                    <SettingsSection key={section.id} title="Connection Types" description={listUsage.connectionTypes}>
                      <SettingsControls
                        onAdd={() => dispatch({ type: 'setConnectionTypes', items: [{ category: '', label: '', code: '', typicalPorts: '', deprecated: false, localId: makeLocalId('ct') }, ...state.connectionTypes] })}
                        onSave={handleSaveConnections}
                        onReset={() => dispatch({ type: 'resetConnectionTypes' })}
                        saving={state.pending === 'connectionTypes' && submitting}
                        dirty={!!state.dirty.connectionTypes}
                      />
                      <ConnectionTypesEditor items={state.connectionTypes} onChange={(next) => dispatch({ type: 'setConnectionTypes', items: withLocalIds(next, 'ct') })} />
                    </SettingsSection>
                  );
                }
                if (section.id === 'subnets') {
                  const defaultLocationId = locations?.[0]?.id || '';
                  return (
                    <SettingsSection key={section.id} title="Subnets" description={listUsage.subnets}>
                      <SettingsControls
                        onAdd={() => dispatch({ type: 'setSubnets', items: [{ location_id: defaultLocationId, cidr: '', vlan_number: undefined, network_zone: 'lan', description: '', deprecated: false, localId: makeLocalId('subnet') }, ...state.subnets] })}
                        onSave={handleSaveSubnets}
                        onReset={() => dispatch({ type: 'resetSubnets' })}
                        saving={state.pending === 'subnets' && submitting}
                        dirty={!!state.dirty.subnets}
                      />
                      <SubnetsEditor items={state.subnets} networkZones={state.enums.networkSegments || []} locations={locations || []} onChange={(next) => dispatch({ type: 'setSubnets', items: withLocalIds(next, 'subnet') })} />
                    </SettingsSection>
                  );
                }
                if (section.id === 'domains') {
                  return (
                    <SettingsSection key={section.id} title="Domains" description={listUsage.domains}>
                      <SettingsControls
                        onAdd={() => dispatch({ type: 'setDomains', items: [{ code: '', label: '', dns_suffix: '', deprecated: false, system: false, localId: makeLocalId('domain') }, ...state.domains] })}
                        onSave={handleSaveDomains}
                        onReset={() => dispatch({ type: 'resetDomains' })}
                        saving={state.pending === 'domains' && submitting}
                        dirty={!!state.dirty.domains}
                      />
                      <DomainsEditor items={state.domains} onChange={(next) => dispatch({ type: 'setDomains', items: withLocalIds(next, 'domain') })} />
                    </SettingsSection>
                  );
                }

                const enumSection = section as EnumSectionConfig;
                const items = state.enums[enumSection.id] || [];
                const dirty = !!state.dirty[enumSection.id];
                const saving = state.pending === enumSection.id && submitting;

                return (
                  <SettingsSection key={enumSection.id} title={enumSection.title} description={listUsage[enumSection.id]}>
                    <SettingsControls
                      onAdd={() => dispatch({ type: 'setEnum', id: enumSection.id, items: [{ ...makeEmptyEnumRow(enumSection.id), localId: makeLocalId(enumSection.id) }, ...items] })}
                      onSave={() => handleSaveEnum(enumSection.id)}
                      onReset={() => dispatch({ type: 'resetEnum', id: enumSection.id })}
                      saving={saving}
                      dirty={dirty}
                    />
                    {enumSection.kind === 'hosting' ? (
                      <HostingTypeEditor items={items as HostingTypeItem[]} onChange={(next) => dispatch({ type: 'setEnum', id: enumSection.id, items: withLocalIds(next, enumSection.id) })} hideAddButton />
                    ) : enumSection.kind === 'serverKind' ? (
                      <AssetKindEditor items={items as AssetKindItem[]} onChange={(next) => dispatch({ type: 'setEnum', id: enumSection.id, items: withLocalIds(next, enumSection.id) })} hideAddButton />
                    ) : enumSection.kind === 'serverRole' ? (
                      <ServerRoleEditor items={items as ServerRoleItem[]} onChange={(next) => dispatch({ type: 'setEnum', id: enumSection.id, items: withLocalIds(next, enumSection.id) })} hideAddButton />
                    ) : enumSection.kind === 'entity' ? (
                      <EntityEditor items={items as EntityItem[]} onChange={(next) => dispatch({ type: 'setEnum', id: enumSection.id, items: withLocalIds(next, enumSection.id) })} hideAddButton />
                    ) : (
                      <EnumEditor title={enumSection.title} description={enumSection.description} items={items} onChange={(next) => dispatch({ type: 'setEnum', id: enumSection.id, items: withLocalIds(next, enumSection.id) })} lockedCodes={enumSection.lockedCodes} hideAddButton />
                    )}
                  </SettingsSection>
                );
              })}
            </SettingsGroup>
          );
        })}
      </Stack>
    </Box>
  );
}
