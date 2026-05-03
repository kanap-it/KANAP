import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Switch,
  useTheme,
} from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import useItOpsEnumOptions from '../../hooks/useItOpsEnumOptions';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationSelect from '../../components/fields/LocationSelect';
import { COUNTRY_OPTIONS } from '../../constants/isoOptions';
import { ymdToEu } from '../../lib/date-eu';
import AddIcon from '@mui/icons-material/Add';
import ApplicationSelect from '../../components/fields/ApplicationSelect';
import DateEUField from '../../components/fields/DateEUField';
import { ServerOption } from '../../components/fields/ServerSelect';
import HardwareInfoPanel, { HardwareInfoPanelHandle } from './editors/HardwareInfoPanel';
import SupportInfoPanel, { SupportInfoPanelHandle } from './editors/SupportInfoPanel';
import AssetRelationsPanel, { AssetRelationsPanelHandle } from './editors/AssetRelationsPanel';
import { useAssetNav } from '../../hooks/useAssetNav';
import EntityKnowledgePanel from '../../components/EntityKnowledgePanel';
import { useAuth } from '../../auth/AuthContext';

import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { KanapDialog, PropertyGroup, PropertyRow } from '../../components/design';
import { MONO_FONT_FAMILY } from '../../config/ThemeContext';
import { dialogBorderedFieldSx, drawerAutocompleteListboxSx, drawerFieldValueSx, drawerMenuItemSx, drawerSelectSx, editableFieldValueSx, longFormSurfaceFieldSx, nakedInputHoverSx } from '../../theme/formSx';
import { getEnvDotColor } from '../../components/grid/renderers/StatusCellRenderer';
import { getDotColor, LIFECYCLE_COLORS } from '../../utils/statusColors';
import PortfolioDetailWorkspaceShell from '../portfolio/workspace/PortfolioDetailWorkspaceShell';
import { PortfolioMetadataItem, PortfolioStatusMetadata } from '../portfolio/workspace/PortfolioMetadataBar';
type IpAddressEntry = { type: string; ip: string; subnet_cidr: string | null };

type AssetRecord = {
  id: string;
  name: string;
  asset_reference?: string | null;
  kind: string;
  provider: string;
  environment: string;
  hostname: string | null;
  domain: string | null;
  fqdn: string | null;
  aliases: string[] | null;
  ip_addresses: IpAddressEntry[] | null;
  cluster: string | null;
  is_cluster: boolean;
  status: string;
  go_live_date: string | null;
  end_of_life_date: string | null;
  location_id: string | null;
  sub_location_id?: string | null;
  operating_system: string | null;
  notes: string | null;
};

type AssignmentRow = {
  id: string;
  app_instance_id: string;
  role: string;
  since_date: string | null;
  notes: string | null;
  application: { id: string; name: string };
  environment: string;
};

type ApplicationInstance = {
  id: string;
  environment: string;
};

type LocationDetails = {
  id: string;
  code: string;
  name: string;
  hosting_type: string;
  operating_company_id: string | null;
  provider: string | null;
  country_iso: string | null;
  city: string | null;
};

type ClusterMember = {
  id: string;
  name: string;
  environment: string;
  status: string;
  kind: string;
  provider: string;
  location?: string | null;
  location_id?: string | null;
  operating_system?: string | null;
};

type LocationOption = { id: string; code: string; name: string };

type ClusterSummary = {
  id: string;
  name: string;
  environment: string;
  status: string;
};

type ServerConnectionRow = {
  id: string;
  connection_id: string;
  name: string;
  topology: 'server_to_server' | 'multi_server';
  lifecycle: string;
  protocol_labels?: string[];
  source_label?: string | null;
  destination_label?: string | null;
};

type TabKey = 'overview' | 'technical' | 'hardware' | 'support' | 'relations';

const VALID_ASSET_TABS = new Set<TabKey>(['overview', 'technical', 'hardware', 'support', 'relations']);
const OVERVIEW_LEGACY_TABS = new Set(['knowledge', 'assignments', 'connections']);

const ENV_OPTIONS = [
  { value: 'prod', label: 'Prod' },
  { value: 'pre_prod', label: 'Pre-prod' },
  { value: 'qa', label: 'QA' },
  { value: 'test', label: 'Test' },
  { value: 'dev', label: 'Dev' },
  { value: 'sandbox', label: 'Sandbox' },
] as const;

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(String(value).includes('T') ? String(value) : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function humanize(value: string | null | undefined) {
  const text = String(value || '').trim();
  if (!text) return 'Not set';
  return text.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function environmentLabel(value: string | null | undefined) {
  return ENV_OPTIONS.find((option) => option.value === value)?.label || value || 'Not set';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="h2"
      sx={(theme) => ({
        m: 0,
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.4,
        color: theme.palette.kanap.text.primary,
      })}
    >
      {children}
    </Typography>
  );
}

const contentFieldSx = {
  width: '100%',
  maxWidth: 520,
  ...nakedInputHoverSx,
  '& .MuiInputBase-root': {
    fontSize: 13,
  },
  '& .MuiInput-underline:before': { display: 'none' },
  '& .MuiInput-underline:after': { display: 'none' },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': { display: 'none' },
} as const;

const denseTableSx = {
  '& th': {
    fontSize: 12,
    fontWeight: 500,
    borderBottom: '1px solid',
    borderColor: 'kanap.border.default',
    color: 'kanap.text.tertiary',
    py: 0.75,
  },
  '& td': {
    fontSize: 13,
    borderBottom: '1px solid',
    borderColor: 'kanap.border.soft',
    color: 'kanap.text.primary',
    py: 0.75,
  },
  '& tbody tr:hover': {
    bgcolor: 'kanap.bg.hover',
  },
  '& .MuiButton-root': {
    minWidth: 0,
    p: 0,
    height: 'auto',
    color: 'kanap.text.primary',
    fontSize: 13,
    fontWeight: 400,
    justifyContent: 'flex-start',
    textTransform: 'none',
    '&:hover': {
      bgcolor: 'transparent',
      color: 'kanap.teal',
      textDecoration: 'underline',
    },
  },
} as const;

export default function AssetWorkspacePage() {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel } = useAuth();
  const theme = useTheme();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = String(params.id || '');
  const rawTab = params.tab as string | undefined;
  const tab = React.useMemo<TabKey>(() => {
    if (VALID_ASSET_TABS.has(rawTab as TabKey)) return rawTab as TabKey;
    if (rawTab && OVERVIEW_LEGACY_TABS.has(rawTab)) return 'overview';
    return 'overview';
  }, [rawTab]);
  const isCreate = id === 'new';
  const canManage = hasLevel('infrastructure', 'member');
  const canDelete = hasLevel('infrastructure', 'admin');

  // Refs for panel components
  const hardwareRef = React.useRef<HardwareInfoPanelHandle>(null);
  const supportRef = React.useRef<SupportInfoPanelHandle>(null);
  const relationsRef = React.useRef<AssetRelationsPanelHandle>(null);
  const goLiveNativeRef = React.useRef<HTMLInputElement | null>(null);

  const [data, setData] = React.useState<AssetRecord | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [assignments, setAssignments] = React.useState<AssignmentRow[]>([]);
  const [assignmentsError, setAssignmentsError] = React.useState<string | null>(null);
  const [clusterMembers, setClusterMembers] = React.useState<ClusterMember[]>([]);
  const [clusterError, setClusterError] = React.useState<string | null>(null);
  const [clusterLoading, setClusterLoading] = React.useState(false);
  const [clustersForServer, setClustersForServer] = React.useState<ClusterSummary[]>([]);
  const [clustersError, setClustersError] = React.useState<string | null>(null);
  const [clustersLoading, setClustersLoading] = React.useState(false);
  const canCreateKnowledge = hasLevel('knowledge', 'member');
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [memberSelection, setMemberSelection] = React.useState<ServerOption[]>([]);
  const [memberOptions, setMemberOptions] = React.useState<ServerOption[]>([]);
  const [memberSearch, setMemberSearch] = React.useState('');
  const [memberOptionsLoading, setMemberOptionsLoading] = React.useState(false);
  const [memberSaving, setMemberSaving] = React.useState(false);
  const [memberSaveError, setMemberSaveError] = React.useState<string | null>(null);
  const [connections, setConnections] = React.useState<ServerConnectionRow[]>([]);
  const [connectionsError, setConnectionsError] = React.useState<string | null>(null);
  const [connectionsLoading, setConnectionsLoading] = React.useState(false);
  const [assetTypeAnchorEl, setAssetTypeAnchorEl] = React.useState<HTMLElement | null>(null);
  const [locationAnchorEl, setLocationAnchorEl] = React.useState<HTMLElement | null>(null);
  const [locationOptions, setLocationOptions] = React.useState<LocationOption[]>([]);
  const { byField, labelFor, settings } = useItOpsEnumOptions();
  const topologyLabel = React.useCallback((v?: string) => {
    if (v === 'server_to_server') return t('enums.topology.serverToServer');
    if (v === 'multi_server') return t('enums.topology.multiServer');
    return v || '';
  }, []);
  const serverRoleOptions = React.useMemo(
    () => (byField.serverRole || []).map((o) => ({
      value: o.code,
      label: o.deprecated ? `${o.label} (deprecated)` : o.label,
      deprecated: !!o.deprecated,
    })),
    [byField.serverRole],
  );

  const load = React.useCallback(async () => {
    if (isCreate) return;
    setError(null);
    try {
      const res = await api.get<AssetRecord>(`/assets/${id}`);
      setData(res.data as any);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.loadAssetFailed')));
    }
  }, [id, isCreate]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    let cancelled = false;
    const loadLocations = async () => {
      try {
        const res = await api.get<{ items: LocationOption[] }>('/locations', {
          params: { limit: 500, sort: 'code:ASC' },
        });
        if (cancelled) return;
        const items = [...(res.data?.items || [])].sort((a, b) => (
          a.code.localeCompare(b.code, undefined, { sensitivity: 'base' })
        ));
        setLocationOptions(items);
      } catch {
        if (!cancelled) setLocationOptions([]);
      }
    };
    void loadLocations();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAssignments = React.useCallback(async () => {
    if (isCreate) return;
    setAssignmentsError(null);
    try {
      const res = await api.get<AssignmentRow[]>(`/assets/${id}/assignments`);
      setAssignments(res.data as any);
    } catch (e: any) {
      setAssignmentsError(getApiErrorMessage(e, t, t('messages.loadAssignmentsFailed')));
    }
  }, [id, isCreate]);

  React.useEffect(() => { void refreshAssignments(); }, [refreshAssignments]);

  const [name, setName] = React.useState('');
  const [kind, setKind] = React.useState('');
  const [provider, setProvider] = React.useState('on_prem');
  const [environment, setEnvironment] = React.useState('prod');
  const [hostname, setHostname] = React.useState('');
  const [ipAddresses, setIpAddresses] = React.useState<IpAddressEntry[]>([]);
  const [isCluster, setIsCluster] = React.useState(false);
  const [status, setStatus] = React.useState<string>('active');
  const [goLiveDate, setGoLiveDate] = React.useState<string>('');
  const [endOfLifeDate, setEndOfLifeDate] = React.useState<string>('');
  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [subLocationId, setSubLocationId] = React.useState<string | null>(null);
  const [subLocationOptions, setSubLocationOptions] = React.useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  const [subLocationLoading, setSubLocationLoading] = React.useState(false);
  const [operatingSystem, setOperatingSystem] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');
  const [domain, setDomain] = React.useState<string>('');
  const [aliases, setAliases] = React.useState<string[]>([]);
  const [locationDetails, setLocationDetails] = React.useState<LocationDetails | null>(null);
  const [locationCompanyName, setLocationCompanyName] = React.useState<string | null>(null);
  const [locationInfoLoading, setLocationInfoLoading] = React.useState(false);
  const [locationInfoError, setLocationInfoError] = React.useState<string | null>(null);
  const countryNameMap = React.useMemo(() => {
    return new Map(COUNTRY_OPTIONS.map((c) => [c.code.toUpperCase(), c.name]));
  }, []);
  const getHostingCategory = React.useCallback(
    (code?: string | null) => {
      if (!code) return 'cloud' as const;
      const opt = settings?.hostingTypes?.find((item) => item.code === code);
      return opt?.category === 'on_prem' ? 'on_prem' : 'cloud';
    },
    [settings?.hostingTypes],
  );
  const fallbackProviderCode = React.useMemo(() => {
    const providers = byField.serverProvider || [];
    const other = providers.find((opt) => opt.code === 'other');
    return other?.code || providers[0]?.code || '';
  }, [byField.serverProvider]);

  const loadClusterMembers = React.useCallback(async () => {
    if (isCreate || !isCluster) {
      setClusterMembers([]);
      setClusterError(null);
      setClusterLoading(false);
      return;
    }
    setClusterLoading(true);
    setClusterError(null);
    try {
      const res = await api.get<{ items: ClusterMember[] }>(`/assets/${id}/members`);
      setClusterMembers((res.data?.items || []) as ClusterMember[]);
    } catch (e: any) {
      setClusterError(getApiErrorMessage(e, t, t('messages.loadClusterMembersFailed')));
      setClusterMembers([]);
    } finally {
      setClusterLoading(false);
    }
  }, [id, isCluster, isCreate]);

  const loadClustersForServer = React.useCallback(async () => {
    if (isCreate || isCluster) {
      setClustersForServer([]);
      setClustersError(null);
      setClustersLoading(false);
      return;
    }
    setClustersLoading(true);
    setClustersError(null);
    try {
      const res = await api.get<{ items: ClusterSummary[] }>(`/assets/${id}/clusters`);
      setClustersForServer((res.data?.items || []) as ClusterSummary[]);
    } catch (e: any) {
      setClustersError(getApiErrorMessage(e, t, t('messages.loadClustersFailed')));
      setClustersForServer([]);
    } finally {
      setClustersLoading(false);
    }
  }, [id, isCluster, isCreate]);

  React.useEffect(() => { void loadClusterMembers(); }, [loadClusterMembers]);
  React.useEffect(() => { void loadClustersForServer(); }, [loadClustersForServer]);

  React.useEffect(() => {
    if (!memberDialogOpen) return;
    let cancelled = false;
    setMemberOptionsLoading(true);
    const loadOptions = async () => {
      try {
        const res = await api.get<{ items: ServerOption[] }>('/assets', {
          params: { q: memberSearch || undefined, limit: 50, sort: 'name:ASC', is_cluster: false },
        });
        if (cancelled) return;
        setMemberOptions(res.data.items || []);
      } catch {
        if (!cancelled) setMemberOptions([]);
      } finally {
        if (!cancelled) setMemberOptionsLoading(false);
      }
    };
    void loadOptions();
    return () => { cancelled = true; };
  }, [memberDialogOpen, memberSearch]);
  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    const current = status;
    const opts = list.map((item) => ({
      value: item.code,
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
      deprecated: !!item.deprecated,
    }));
    if (current && !opts.some((opt) => opt.value === current)) {
      opts.push({ value: current, label: current, deprecated: false });
    }
    return opts.filter((opt) => !opt.deprecated || opt.value === current);
  }, [byField.lifecycleStatus, status]);

  const kindOptions = React.useMemo(
    () => (byField.serverKind || [])
      .map((o) => ({
        value: o.code,
        label: o.deprecated ? `${o.label} (deprecated)` : o.label,
        deprecated: !!o.deprecated,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [byField.serverKind],
  );

  // Determine if the current asset type is physical (shows Hardware/Support tabs)
  const isPhysicalAsset = React.useMemo(() => {
    const assetKind = kind || data?.kind || '';
    if (!assetKind) return false;
    const assetType = (settings?.serverKinds || []).find((o) => o.code === assetKind);
    return assetType?.is_physical ?? false;
  }, [data?.kind, kind, settings?.serverKinds]);

  // Redirect to valid tab if current tab is not available for this asset type
  React.useEffect(() => {
    if (isCreate) return;
    if (!data) return; // Wait for data to load
    if (!settings) return; // Wait for asset type metadata before deciding physical-only tabs
    const physicalOnlyTabs = ['hardware', 'support'];
    if (physicalOnlyTabs.includes(tab) && !isPhysicalAsset) {
      navigate(`/it/assets/${id}/overview`, { replace: true });
    }
  }, [tab, isPhysicalAsset, id, isCreate, data, navigate, settings]);

  // Compute valid tab value for Tabs component (prevents MUI warning)
  const validTab = React.useMemo(() => {
    if (!settings) return tab;
    const physicalOnlyTabs = ['hardware', 'support'];
    if (physicalOnlyTabs.includes(tab) && !isPhysicalAsset) {
      return 'overview'; // Fallback while redirect happens
    }
    return tab;
  }, [tab, isPhysicalAsset, settings]);

  const operatingSystemOptions = React.useMemo(
    () => (settings?.operatingSystems || []).map((o) => ({
      value: o.code,
      label: o.deprecated ? `${o.label} (deprecated)` : o.label,
      standardSupportEnd: o.standardSupportEnd,
      extendedSupportEnd: o.extendedSupportEnd,
    })),
    [settings?.operatingSystems],
  );

  const domainOptions = React.useMemo(
    () => (settings?.domains || []).map((d) => ({
      value: d.code,
      label: d.deprecated ? `${d.label} (deprecated)` : d.label,
      dns_suffix: d.dns_suffix,
      system: d.system,
      deprecated: !!d.deprecated,
    })),
    [settings?.domains],
  );

  // Compute FQDN from hostname and domain
  const computedFqdn = React.useMemo(() => {
    if (!hostname) return '';
    const cleanHostname = hostname.trim().toLowerCase();
    if (!domain || domain === 'workgroup' || domain === 'n-a') {
      return cleanHostname;
    }
    const domainOpt = domainOptions.find((d) => d.value === domain);
    if (domainOpt?.dns_suffix) {
      return `${cleanHostname}.${domainOpt.dns_suffix}`;
    }
    return cleanHostname;
  }, [hostname, domain, domainOptions]);

  // Hostname sanitization function
  const sanitizeHostname = React.useCallback((value: string): string => {
    let result = value.toLowerCase();
    result = result.replace(/[\s_]+/g, '-');
    result = result.replace(/[^a-z0-9-]/g, '');
    result = result.replace(/-+/g, '-');
    result = result.replace(/^-+|-+$/g, '');
    return result.slice(0, 63);
  }, []);

  // Prefill hostname from sanitized name on create (keep syncing until user manually edits hostname)
  const [hostnameManuallyEdited, setHostnameManuallyEdited] = React.useState(false);
  React.useEffect(() => {
    if (!isCreate) return;
    if (hostnameManuallyEdited) return;
    if (!name) return;
    const sanitized = sanitizeHostname(name);
    setHostname(sanitized);
  }, [isCreate, name, sanitizeHostname, hostnameManuallyEdited]);

  // Check if hostname is required (domain is a "real" domain)
  const hostnameRequired = domain && domain !== 'workgroup' && domain !== 'n-a';

  const networkSegmentOptions = React.useMemo(
    () => (byField.networkSegment || []).map((o) => ({
      value: o.code,
      label: o.deprecated ? `${o.label} (deprecated)` : o.label,
      deprecated: !!o.deprecated,
    })),
    [byField.networkSegment],
  );

  const subnetOptions = React.useMemo(
    () => (settings?.subnets || [])
      .filter((s) => s.location_id === locationId && !s.deprecated)
      .map((s) => ({
        value: s.cidr,
        label: s.cidr,
        vlan_number: s.vlan_number,
        network_zone: s.network_zone,
        description: s.description,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [settings?.subnets, locationId],
  );

  // IP address type options
  const ipAddressTypeOptions = React.useMemo(
    () => (byField.ipAddressType || []).map((o) => ({
      value: o.code,
      label: o.label,
    })),
    [byField.ipAddressType],
  );

  React.useEffect(() => {
    if (!isCreate) return;
    if (kind) return;
    const defaults = byField.serverKind || [];
    if (defaults.length > 0) {
      setKind(defaults[0].code);
    }
  }, [isCreate, kind, byField.serverKind]);

  React.useEffect(() => {
    if (!isCreate) return;
    if (provider) return;
    if (!fallbackProviderCode) return;
    setProvider(fallbackProviderCode);
  }, [isCreate, provider, fallbackProviderCode]);

  React.useEffect(() => {
    if (!data) return;
    setName(data.name);
    setKind(data.kind);
    setProvider(data.provider);
    setEnvironment(data.environment);
    setHostname(data.hostname || '');
    setDomain(data.domain || '');
    setAliases(data.aliases || []);
    setIpAddresses(data.ip_addresses || []);
    setIsCluster(!!data.is_cluster);
    setStatus((data.status as 'enabled' | 'disabled') || 'enabled');
    setGoLiveDate(data.go_live_date || '');
    setEndOfLifeDate(data.end_of_life_date || '');
    setLocationId(data.location_id || null);
    setSubLocationId((data as any).sub_location_id || null);
    setOperatingSystem(data.operating_system || '');
    setNotes(data.notes || '');
    setDirty(false);
  }, [data]);

  React.useEffect(() => {
    let cancelled = false;
    if (isCreate) {
      setConnections([]);
      setConnectionsError(null);
      setConnectionsLoading(false);
      return () => { cancelled = true; };
    }
    const loadConnections = async () => {
      setConnectionsLoading(true);
      setConnectionsError(null);
      try {
        const res = await api.get<{ items: ServerConnectionRow[] }>(`/connections/by-server/${id}`);
        if (cancelled) return;
        setConnections(res.data?.items || []);
      } catch (e: any) {
        if (cancelled) return;
        setConnectionsError(getApiErrorMessage(e, t, t('messages.loadConnectionsFailed')));
        setConnections([]);
      } finally {
        if (!cancelled) setConnectionsLoading(false);
      }
    };
    void loadConnections();
    return () => { cancelled = true; };
  }, [id, isCreate, t]);

  React.useEffect(() => {
    let cancelled = false;
    if (!locationId) {
      setLocationDetails(null);
      setLocationCompanyName(null);
      setLocationInfoError(null);
      setLocationInfoLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLocationInfoLoading(true);
    setLocationInfoError(null);
    setLocationDetails(null);
    setLocationCompanyName(null);
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/locations/${locationId}`);
        if (cancelled) return;
        const payload = res.data as any;
        const details: LocationDetails = {
          id: payload.id,
          code: payload.code,
          name: payload.name,
          hosting_type: payload.hosting_type,
          operating_company_id: payload.operating_company_id || null,
          provider: payload.provider || null,
          country_iso: payload.country_iso || null,
          city: payload.city || null,
        };
        setLocationDetails(details);
        if (details.operating_company_id) {
          try {
            const companyRes = await api.get(`/companies/${details.operating_company_id}`);
            if (cancelled) return;
            const company = companyRes.data as any;
            setLocationCompanyName(company?.name || '');
          } catch (companyError: any) {
            if (cancelled) return;
            setLocationCompanyName(null);
            setLocationInfoError(
              companyError?.response?.data?.message ||
                companyError?.message ||
                'Failed to load operating company details',
            );
          }
        } else {
          setLocationCompanyName(null);
        }
        const category = getHostingCategory(details.hosting_type);
        if (category === 'cloud') {
          const nextProvider = details.provider || fallbackProviderCode;
          if (nextProvider) setProvider(nextProvider);
        } else if (fallbackProviderCode) {
          setProvider(fallbackProviderCode);
        }
      } catch (err: any) {
        if (cancelled) return;
        setLocationDetails(null);
        setLocationCompanyName(null);
        setLocationInfoError(getApiErrorMessage(err, t, t('messages.loadLocationDetailsFailed')));
      } finally {
        if (!cancelled) {
          setLocationInfoLoading(false);
        }
      }
    };
    void fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [locationId, getHostingCategory, fallbackProviderCode]);

  // Fetch sub-location options when locationId changes
  React.useEffect(() => {
    let cancelled = false;
    if (!locationId) {
      setSubLocationOptions([]);
      setSubLocationLoading(false);
      return () => { cancelled = true; };
    }
    setSubLocationLoading(true);
    const fetchSubLocations = async () => {
      try {
        const res = await api.get(`/locations/${locationId}/sub-items`);
        if (cancelled) return;
        setSubLocationOptions((res.data || []) as Array<{ id: string; name: string; description?: string | null }>);
      } catch {
        if (cancelled) return;
        setSubLocationOptions([]);
      } finally {
        if (!cancelled) setSubLocationLoading(false);
      }
    };
    void fetchSubLocations();
    return () => { cancelled = true; };
  }, [locationId]);

  const handleSave = async () => {
    if (!locationId) {
      setError('Location is required.');
      return;
    }
    if (!kind) {
      setError('Asset type is required.');
      return;
    }
    if (!provider) {
      setError('Provider is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
    const payload = {
      name: name.trim(),
      kind,
      provider,
      environment,
      hostname: hostname || null,
      domain: domain || null,
      aliases: aliases.length > 0 ? aliases : null,
      ip_addresses: ipAddresses.filter((e) => e.ip.trim()).length > 0 ? ipAddresses.filter((e) => e.ip.trim()) : null,
      is_cluster: isCluster,
      operating_system: isCluster ? null : operatingSystem || null,
      status,
      go_live_date: goLiveDate || null,
      end_of_life_date: endOfLifeDate || null,
      location_id: locationId || null,
      sub_location_id: subLocationId || null,
      notes: notes || null,
    };
      if (isCreate) {
      const res = await api.post('/assets', payload);
      const newId = res.data?.id as string;
      setDirty(false);
      navigate(`/it/assets/${newId}/overview`);
    } else {
        await api.patch(`/assets/${id}`, payload);
        // Save panel data if they have changes
        try { await hardwareRef.current?.save(); } catch { /* panel handles error */ }
        try { await supportRef.current?.save(); } catch { /* panel handles error */ }
        try { await relationsRef.current?.save(); } catch { /* panel handles error */ }
        setDirty(false);
        await load();
      }
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveAssetFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (assignment: AssignmentRow) => {
    if (!window.confirm(t('confirmations.removeAssignment'))) return;
    try {
      await api.delete(`/app-instances/${assignment.app_instance_id}/assets/${assignment.id}`);
      await refreshAssignments();
    } catch (e: any) {
      setAssignmentsError(getApiErrorMessage(e, t, t('messages.removeServerFailed')));
    }
  };

  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null);
  const [appInstances, setAppInstances] = React.useState<Record<string, ApplicationInstance[]>>({});
  const [instanceId, setInstanceId] = React.useState<string | null>(null);
  const [assignRole, setAssignRole] = React.useState<string>('');
  const [assignSince, setAssignSince] = React.useState<string>('');
  const [assignNotes, setAssignNotes] = React.useState<string>('');
  const [assignError, setAssignError] = React.useState<string | null>(null);
  const [assignMessage, setAssignMessage] = React.useState<string | null>(null);

  const loadAppInstances = React.useCallback(async (appId: string) => {
    if (appInstances[appId]) return;
    try {
      const res = await api.get(`/applications/${appId}`, { params: { include: 'instances' } });
      const instances: ApplicationInstance[] = (res.data?.instances || []).map((i: any) => ({
        id: i.id,
        environment: i.environment,
      }));
      setAppInstances((prev) => ({ ...prev, [appId]: instances }));
    } catch (e: any) {
      setAssignError(getApiErrorMessage(e, t, t('messages.loadAppInstancesFailed')));
      setAppInstances((prev) => ({ ...prev, [appId]: [] }));
    }
  }, [appInstances]);

  const openAssignDialog = () => {
    setAssignDialogOpen(true);
    setAssignError(null);
    setAssignMessage(null);
    const defaultRole = serverRoleOptions[0]?.value || '';
    setAssignRole(defaultRole);
    setAssignSince('');
    setAssignNotes('');
    setSelectedAppId(null);
    setInstanceId(null);
  };

  const onSelectApplication = async (appId: string | null) => {
    setSelectedAppId(appId);
    setInstanceId(null);
    if (appId) {
      await loadAppInstances(appId);
      const list = appInstances[appId] || [];
      if (list.length === 1) setInstanceId(list[0].id);
    }
  };

  const handleAssignSave = async () => {
    if (!selectedAppId) {
      setAssignError('Application is required');
      return;
    }
    const instances = appInstances[selectedAppId] || [];
    if (!instanceId || !instances.some((i) => i.id === instanceId)) {
      setAssignError('Environment (instance) is required');
      return;
    }
    if (!assignRole) {
      setAssignError('Role is required');
      return;
    }
    setAssigning(true);
    setAssignError(null);
    try {
      await api.post(`/app-instances/${instanceId}/assets`, {
        server_id: id,
        role: assignRole,
        since_date: assignSince || null,
        notes: assignNotes || null,
      });
      setAssignMessage('Assignment added');
      setAssignDialogOpen(false);
      await refreshAssignments();
    } catch (e: any) {
      setAssignError(getApiErrorMessage(e, t, t('messages.addAssignmentFailed')));
    } finally {
      setAssigning(false);
    }
  };

  const memberOptionsCombined = React.useMemo(() => {
    const map = new Map(memberOptions.map((o) => [o.id, o]));
    memberSelection.forEach((sel) => {
      if (!map.has(sel.id)) map.set(sel.id, sel);
    });
    return Array.from(map.values());
  }, [memberOptions, memberSelection]);

  const openMemberDialog = () => {
    setMemberDialogOpen(true);
    setMemberSaveError(null);
    setMemberSearch('');
    setMemberSelection(
      clusterMembers.map((m) => ({
        id: m.id,
        name: m.name,
        environment: m.environment,
        kind: m.kind,
        provider: m.provider,
        is_cluster: false,
      })),
    );
  };

  const handleSaveMembers = async () => {
    if (isCreate) return;
    setMemberSaving(true);
    setMemberSaveError(null);
    try {
      const ids = memberSelection.map((m) => m.id);
      await api.post(`/assets/${id}/members`, { server_ids: ids });
      setMemberDialogOpen(false);
      await loadClusterMembers();
    } catch (e: any) {
      setMemberSaveError(getApiErrorMessage(e, t, t('messages.saveMembersFailed')));
    } finally {
      setMemberSaving(false);
    }
  };

  const createDisabled =
    saving ||
    locationInfoLoading ||
    !name.trim() ||
    !locationId ||
    !kind ||
    !provider;
  const locationCategory = locationDetails ? getHostingCategory(locationDetails.hosting_type) : null;
  const loadingPlaceholder = '-';
  const hostingTypeDisplay = locationDetails
    ? labelFor('hostingType', locationDetails.hosting_type) || locationDetails.hosting_type
    : loadingPlaceholder;
  const providerOrCompanyLabel = locationCategory === 'cloud'
    ? 'Cloud provider'
    : locationCategory === 'on_prem'
      ? 'Operating company'
      : 'Operating company / Cloud provider';
  const providerOrCompanyDisplay = locationDetails
    ? locationCategory === 'cloud'
      ? locationDetails.provider
        ? labelFor('serverProvider', locationDetails.provider) || locationDetails.provider
        : '-'
      : locationCompanyName || '-'
    : loadingPlaceholder;
  const countryDisplay = locationDetails && locationDetails.country_iso
    ? (() => {
        const code = (locationDetails.country_iso || '').toUpperCase();
        const name = countryNameMap.get(code) || code;
        return `${name} (${code})`;
      })()
    : locationDetails
      ? '-'
      : loadingPlaceholder;
  const cityDisplay = locationDetails
    ? locationDetails.city || '-'
    : loadingPlaceholder;

  // Navigation for prev/next
  const sort = searchParams.get('sort') || 'created_at:DESC';
  const q = searchParams.get('q') || '';
  const filters = searchParams.get('filters') || '';
  const nav = useAssetNav({ id, sort, q, filters });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null as any, nextId: null as any }
    : nav;

  const listContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    const sortVal = searchParams.get('sort');
    const qVal = searchParams.get('q');
    const filtersVal = searchParams.get('filters');
    if (sortVal) sp.set('sort', sortVal);
    if (qVal) sp.set('q', qVal);
    if (filtersVal) sp.set('filters', filtersVal);
    return sp;
  }, [searchParams]);

  React.useEffect(() => {
    if (!rawTab || VALID_ASSET_TABS.has(rawTab as TabKey)) return;
    const qs = listContextParams.toString();
    navigate(`/it/assets/${id}/overview${qs ? `?${qs}` : ''}`, { replace: true });
  }, [id, listContextParams, navigate, rawTab]);

  const handleReset = () => {
    setName(data?.name || '');
    setDirty(false);
    load();
  };

  const patchAsset = React.useCallback(async (patch: Partial<AssetRecord> & { sub_location_id?: string | null }) => {
    if (isCreate) {
      setDirty(true);
      return;
    }
    setSaving(true);
    setError(null);
    setData((prev) => (prev ? ({ ...prev, ...patch } as AssetRecord) : prev));
    try {
      const res = await api.patch(`/assets/${id}`, patch);
      setData(res.data as AssetRecord);
      setDirty(false);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveAssetFailed')));
      await load();
      throw e;
    } finally {
      setSaving(false);
    }
  }, [id, isCreate, load, t]);

  const confirmAndNavigate = React.useCallback(async (targetId: string | null) => {
    if (!targetId) return;
    if (isCreate && dirty) {
      const proceed = window.confirm(t('confirmations.unsavedSaveBeforeNav'));
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        handleReset();
      }
    }
    const qs = listContextParams.toString();
    navigate(`/it/assets/${targetId}/${tab}${qs ? `?${qs}` : ''}`);
  }, [dirty, handleSave, handleReset, isCreate, listContextParams, navigate, tab, t]);

  const handleClose = () => {
    if (isCreate && dirty && !window.confirm(t('confirmations.unsavedSaveBeforeNav'))) return;
    const qs = listContextParams.toString();
    navigate(`/it/assets${qs ? `?${qs}` : ''}`);
  };

  const physicalOnlyTabs = ['hardware', 'support'];
  const showPhysicalTabs = isPhysicalAsset || (!settings && physicalOnlyTabs.includes(tab));

  const workspaceTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'technical', label: 'Technical' },
    ...(showPhysicalTabs ? [
      { key: 'hardware', label: 'Hardware', disabled: isCreate },
      { key: 'support', label: 'Support', disabled: isCreate },
    ] : []),
    { key: 'relations', label: 'Relations', disabled: isCreate },
  ];

  const canonicalPathFor = (targetId: string, nextTab: TabKey = validTab) => {
    const qs = listContextParams.toString();
    return `/it/assets/${targetId}/${nextTab}${qs ? `?${qs}` : ''}`;
  };

  const handleTabChange = (nextTab: string) => {
    navigate(canonicalPathFor(id, nextTab as TabKey));
  };

  const updateAssetType = (nextValue: string) => {
    setKind(nextValue);
    if (isCreate) {
      setDirty(true);
    } else if (nextValue) {
      void patchAsset({ kind: nextValue });
    }
  };

  const updateLocation = (nextValue: string | null) => {
    if (!nextValue && !isCreate) {
      setError('Location is required.');
      return;
    }
    if (nextValue !== locationId) {
      setSubLocationId(null);
    }
    setLocationId(nextValue);
    if (isCreate) {
      setDirty(true);
    } else {
      void patchAsset({ location_id: nextValue, sub_location_id: null });
    }
  };

  const updateScalar = <K extends keyof AssetRecord>(key: K, value: AssetRecord[K]) => {
    if (isCreate) {
      setDirty(true);
      return;
    }
    void patchAsset({ [key]: value } as Partial<AssetRecord>);
  };

  const persistIpAddresses = (nextEntries: IpAddressEntry[]) => {
    const clean = nextEntries.filter((entry) => entry.ip.trim());
    if (isCreate) {
      setDirty(true);
    } else {
      void patchAsset({ ip_addresses: clean.length > 0 ? clean : null });
    }
  };

  const lifecycleMetadataOptions = lifecycleOptions.map((option) => ({
    value: option.value,
    label: option.label,
    color: getDotColor(LIFECYCLE_COLORS[option.value] || 'default', theme.palette.mode),
  }));

  const environmentMetadataOptions = ENV_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    color: getEnvDotColor(option.value, theme.palette.mode),
  }));

  const assetTypeLabel = labelFor('serverKind', kind) || kind || 'Not set';
  const locationLabel = locationDetails?.code || (locationId ? 'Loading...' : 'Not set');

  const actions = (
    <>
      {isCreate && (
        <Button variant="contained" onClick={() => void handleSave()} disabled={createDisabled} size="small">
          Create
        </Button>
      )}
      {!isCreate && canDelete && (
        <Button
          variant="action-danger"
          startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
          size="small"
          onClick={async () => {
            if (!window.confirm(`Delete asset "${data?.name || name}"?`)) return;
            await api.delete(`/assets/${id}`);
            handleClose();
          }}
        >
          Delete
        </Button>
      )}
      <IconButton onClick={handleClose} title={t('common.close')} aria-label={t('common.close')} size="small">
        <CloseIcon />
      </IconButton>
    </>
  );

  const properties = (
    <>
      <PropertyGroup>
        <PropertyRow label="Asset type" required>
          <Autocomplete
            options={kindOptions.filter((opt) => !opt.deprecated || opt.value === kind)}
            value={kind ? kindOptions.find((opt) => opt.value === kind) || { value: kind, label: kind, deprecated: false } : null}
            onChange={(_, val) => updateAssetType(val?.value || '')}
            getOptionLabel={(opt) => opt.label}
            isOptionEqualToValue={(opt, val) => opt.value === val.value}
            disabled={!canManage || saving}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                placeholder="Search asset types"
                InputProps={{ ...params.InputProps, disableUnderline: true }}
                sx={editableFieldValueSx}
              />
            )}
            ListboxProps={{ sx: drawerAutocompleteListboxSx }}
            fullWidth
          />
        </PropertyRow>
        <PropertyRow label="Location" required>
          <Box sx={drawerFieldValueSx}>
            <LocationSelect
              value={locationId}
              onChange={updateLocation}
              label="Location"
              required
              size="small"
              hideLabel
              textFieldSx={editableFieldValueSx}
              disabled={!canManage || saving}
            />
          </Box>
        </PropertyRow>
        {subLocationOptions.length > 0 && (
          <PropertyRow label="Sub-location">
            <Autocomplete
              options={subLocationOptions}
              getOptionLabel={(option) => option.name}
              value={subLocationOptions.find((o) => o.id === subLocationId) || null}
              onChange={(_, val) => {
                const next = val?.id || null;
                setSubLocationId(next);
                if (isCreate) setDirty(true);
                else void patchAsset({ sub_location_id: next });
              }}
              loading={subLocationLoading}
              disabled={!canManage || saving || !locationId}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  placeholder="Search sub-locations"
                  InputProps={{ ...params.InputProps, disableUnderline: true }}
                  sx={editableFieldValueSx}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography className="kanap-autocomplete-option-primary">{option.name}</Typography>
                    {option.description && (
                      <Typography className="kanap-autocomplete-option-secondary">{option.description}</Typography>
                    )}
                  </Box>
                </li>
              )}
              ListboxProps={{ sx: drawerAutocompleteListboxSx }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              fullWidth
            />
          </PropertyRow>
        )}
        {(locationId || !isCreate) && (
          <>
            {locationInfoError && (
              <PropertyRow label="Location context">
                <Typography sx={(muiTheme) => ({ fontSize: 13, color: muiTheme.palette.kanap.text.secondary })}>
                  {locationInfoError}
                </Typography>
              </PropertyRow>
            )}
            <PropertyRow label="Hosting type">{hostingTypeDisplay}</PropertyRow>
            <PropertyRow label={providerOrCompanyLabel}>{providerOrCompanyDisplay}</PropertyRow>
            <PropertyRow label="Country">{countryDisplay}</PropertyRow>
            <PropertyRow label="City">{cityDisplay}</PropertyRow>
          </>
        )}
      </PropertyGroup>

      <PropertyGroup>
        <PropertyRow label="Environment">
          <Select
            value={environment}
            onChange={(e) => {
              const next = e.target.value;
              setEnvironment(next);
              updateScalar('environment', next as AssetRecord['environment']);
            }}
            variant="standard"
            disableUnderline
            disabled={!canManage || saving}
            sx={drawerSelectSx}
          >
            {ENV_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value} sx={drawerMenuItemSx}>{opt.label}</MenuItem>)}
          </Select>
        </PropertyRow>
        <PropertyRow label="Lifecycle">
          <Select
            value={status}
            onChange={(e) => {
              const next = e.target.value;
              setStatus(next);
              updateScalar('status', next as AssetRecord['status']);
            }}
            variant="standard"
            disableUnderline
            disabled={!canManage || saving}
            sx={drawerSelectSx}
          >
            {lifecycleOptions.map((opt) => <MenuItem key={opt.value} value={opt.value} sx={drawerMenuItemSx}>{opt.label}</MenuItem>)}
          </Select>
        </PropertyRow>
        <PropertyRow label="Go live">
          <DateEUField label="" valueYmd={goLiveDate} onChangeYmd={(val) => { setGoLiveDate(val); updateScalar('go_live_date', (val || null) as AssetRecord['go_live_date']); }} disabled={!canManage || saving} size="small" hideLabel textFieldSx={editableFieldValueSx} />
        </PropertyRow>
        <PropertyRow label="End of life">
          <DateEUField label="" valueYmd={endOfLifeDate} onChangeYmd={(val) => { setEndOfLifeDate(val); updateScalar('end_of_life_date', (val || null) as AssetRecord['end_of_life_date']); }} disabled={!canManage || saving} size="small" hideLabel textFieldSx={editableFieldValueSx} />
        </PropertyRow>
      </PropertyGroup>
    </>
  );

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{error}</Alert>}
      <PortfolioDetailWorkspaceShell
        activeTab={validTab}
        tabs={workspaceTabs}
        onTabChange={handleTabChange}
        drawerStorageKey="kanap.assets.drawerOpen"
        backLabel="Assets"
        onBack={handleClose}
        itemReference={!isCreate ? data?.asset_reference || data?.id?.slice(0, 8) || null : null}
        onCopyReference={!isCreate && (data?.asset_reference || data?.id) ? () => { void navigator.clipboard?.writeText(data?.asset_reference || data?.id || ''); } : undefined}
        title={isCreate ? name : data?.name || name || ''}
        titleFallback={isCreate ? 'New asset' : 'Untitled asset'}
        canEditTitle={canManage}
        onTitleSave={(value) => {
          const next = value.trim();
          if (!next) return;
          setName(next);
          if (isCreate) setDirty(true);
          else void patchAsset({ name: next });
        }}
        isCreate={isCreate}
        nav={!isCreate && total > 0 ? {
          currentIndex: index + 1,
          totalCount: total,
          hasPrev,
          hasNext,
          onPrev: () => { void confirmAndNavigate(prevId); },
          onNext: () => { void confirmAndNavigate(nextId); },
          previousLabel: 'Previous asset',
          nextLabel: 'Next asset',
        } : undefined}
        onSaveShortcut={isCreate ? () => { void handleSave(); } : undefined}
        metadata={!isCreate ? (
          <>
            <PortfolioStatusMetadata
              value={status || 'active'}
              label={humanize(labelFor('lifecycleStatus', status) || status)}
              color={getDotColor(LIFECYCLE_COLORS[status] || 'default', theme.palette.mode)}
              options={lifecycleMetadataOptions}
              onChange={(value) => {
                setStatus(value);
                void patchAsset({ status: value });
              }}
              disabled={!canManage}
            />
            <PortfolioStatusMetadata
              value={environment}
              label={ENV_OPTIONS.find((option) => option.value === environment)?.label || environment}
              color={getEnvDotColor(environment, theme.palette.mode)}
              options={environmentMetadataOptions}
              onChange={(value) => {
                setEnvironment(value);
                void patchAsset({ environment: value });
              }}
              disabled={!canManage}
            />
            <PortfolioMetadataItem
              onClick={(event) => setAssetTypeAnchorEl(event.currentTarget)}
              disabled={!canManage || saving}
              title="Edit asset type"
            >
              {assetTypeLabel}
            </PortfolioMetadataItem>
            <Menu
              anchorEl={assetTypeAnchorEl}
              open={!!assetTypeAnchorEl}
              onClose={() => setAssetTypeAnchorEl(null)}
            >
              {kindOptions.filter((option) => !option.deprecated || option.value === kind).map((option) => (
                <MenuItem
                  key={option.value}
                  selected={option.value === kind}
                  onClick={() => {
                    updateAssetType(option.value);
                    setAssetTypeAnchorEl(null);
                  }}
                  sx={drawerMenuItemSx}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
            {isCluster && <PortfolioMetadataItem>Cluster</PortfolioMetadataItem>}
            <PortfolioMetadataItem
              label="Location"
              onClick={(event) => setLocationAnchorEl(event.currentTarget)}
              disabled={!canManage || saving}
              title="Edit location"
            >
              {locationLabel}
            </PortfolioMetadataItem>
            <Menu
              anchorEl={locationAnchorEl}
              open={!!locationAnchorEl}
              onClose={() => setLocationAnchorEl(null)}
            >
              {locationOptions.map((option) => (
                <MenuItem
                  key={option.id}
                  selected={option.id === locationId}
                  onClick={() => {
                    updateLocation(option.id);
                    setLocationAnchorEl(null);
                  }}
                  sx={drawerMenuItemSx}
                >
                  {option.code}
                </MenuItem>
              ))}
            </Menu>
            {computedFqdn && <PortfolioMetadataItem mono>{computedFqdn}</PortfolioMetadataItem>}
            <PortfolioMetadataItem
              label="Go live"
              onClick={(event) => {
                const picker = goLiveNativeRef.current;
                if (!picker) return;
                const anchorX = event.clientX + 8;
                const anchorY = event.clientY + 8;
                picker.style.left = `${Math.min(anchorX, window.innerWidth - 24)}px`;
                picker.style.top = `${Math.min(anchorY, window.innerHeight - 24)}px`;
                picker.getBoundingClientRect();
                try {
                  picker.showPicker?.();
                } catch {
                  picker.click();
                }
                if (!picker.showPicker) picker.click();
              }}
              disabled={!canManage || saving}
              title="Edit go live"
            >
              {formatShortDate(goLiveDate)}
            </PortfolioMetadataItem>
            <Box
              component="input"
              ref={goLiveNativeRef}
              data-testid="asset-metadata-go-live-date-input"
              type="date"
              value={goLiveDate || ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const next = event.target.value || '';
                setGoLiveDate(next);
                updateScalar('go_live_date', (next || null) as AssetRecord['go_live_date']);
              }}
              aria-hidden="true"
              disabled={!canManage || saving}
              tabIndex={-1}
              sx={{
                position: 'fixed',
                left: 0,
                top: 0,
                opacity: 0,
                width: 18,
                height: 18,
                pointerEvents: 'none',
                zIndex: (theme) => theme.zIndex.tooltip,
              }}
            />
          </>
        ) : undefined}
        actions={actions}
        properties={properties}
      >
          {tab === 'overview' && (
            <Stack spacing={3.5}>
              {isCreate ? (
                <Stack spacing={1.5} sx={{ maxWidth: 560 }}>
                  <Box>
                    <SectionLabel>Basics</SectionLabel>
                  </Box>
                  <PropertyRow label="Name" required valueSx={{ maxWidth: 520 }}>
                    <TextField
                      value={name}
                      onChange={(e) => { setName(e.target.value); setDirty(true); }}
                      placeholder="Asset name"
                      required
                      size="small"
                      variant="standard"
                      InputProps={{ disableUnderline: true }}
                      sx={contentFieldSx}
                    />
                  </PropertyRow>
                  <Autocomplete
                    options={kindOptions.filter((opt) => !opt.deprecated || opt.value === kind)}
                    value={kind ? kindOptions.find((opt) => opt.value === kind) || { value: kind, label: kind, deprecated: false } : null}
                    onChange={(_, val) => updateAssetType(val?.value || '')}
                    getOptionLabel={(opt) => opt.label}
                    isOptionEqualToValue={(opt, val) => opt.value === val.value}
                    openOnFocus
                    renderInput={(params) => (
                      <PropertyRow label="Asset type" required valueSx={{ maxWidth: 520 }}>
                        <TextField
                          {...params}
                          required
                          placeholder="Search asset types"
                          size="small"
                          variant="standard"
                          InputProps={{ ...params.InputProps, disableUnderline: true }}
                          sx={contentFieldSx}
                        />
                      </PropertyRow>
                    )}
                  />
                  <PropertyRow label="Location" required valueSx={{ maxWidth: 520 }}>
                    <LocationSelect
                      value={locationId}
                      onChange={updateLocation}
                      label="Location"
                      required
                      size="small"
                      hideLabel
                      textFieldSx={contentFieldSx}
                    />
                  </PropertyRow>
                  <PropertyRow label="Environment" valueSx={{ maxWidth: 260 }}>
                    <TextField
                      select
                      value={environment}
                      onChange={(e) => { setEnvironment(e.target.value); setDirty(true); }}
                      size="small"
                      variant="standard"
                      InputProps={{ disableUnderline: true }}
                      sx={contentFieldSx}
                    >
                      {ENV_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value} sx={drawerMenuItemSx}>{opt.label}</MenuItem>)}
                    </TextField>
                  </PropertyRow>
                </Stack>
              ) : null}
              <Box>
                <Box sx={{ mb: 1 }}>
                  <SectionLabel>Description</SectionLabel>
                </Box>
                <TextField
                  multiline
                  minRows={4}
                  maxRows={12}
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); if (isCreate) setDirty(true); }}
                  onBlur={(e) => {
                    const next = e.currentTarget.value;
                    setNotes(next);
                    if (!isCreate && (next || '') !== (data?.notes || '')) void patchAsset({ notes: next || null });
                  }}
                  placeholder="Describe the asset"
                  variant="standard"
                  InputProps={{ disableUnderline: true }}
                  sx={longFormSurfaceFieldSx}
                  disabled={!canManage}
                />
              </Box>
              {!isCreate && (
                <>
                  <Box>
                    {assignmentsError && <Alert severity="error" sx={{ mb: 2 }}>{assignmentsError}</Alert>}
                    {assignMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAssignMessage(null)}>{assignMessage}</Alert>}
                    {isCluster && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Cluster servers cannot host application assignments. Assign member hosts instead.
                      </Alert>
                    )}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <SectionLabel>Assignments</SectionLabel>
                      <Button
                        variant="action"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={openAssignDialog}
                        disabled={serverRoleOptions.length === 0 || isCluster}
                      >
                        Add assignment
                      </Button>
                    </Stack>
                    <Table size="small" sx={denseTableSx}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Application</TableCell>
                          <TableCell>Environment</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Since</TableCell>
                          <TableCell>Notes</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {assignments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <Typography variant="body2" color="text.secondary">No assignments yet.</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <Button size="small" onClick={() => navigate(`/it/applications/${assignment.application.id}/assets`)}>
                                {assignment.application.name}
                              </Button>
                            </TableCell>
                            <TableCell>{environmentLabel(assignment.environment)}</TableCell>
                            <TableCell>{labelFor('serverRole', assignment.role) || assignment.role}</TableCell>
                            <TableCell>{assignment.since_date ? ymdToEu(assignment.since_date) : '-'}</TableCell>
                            <TableCell>{assignment.notes || '-'}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit assignment">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => navigate(`/it/applications/${assignment.application.id}/assets`)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Remove assignment">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => void handleRemoveAssignment(assignment)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>

                  <Box>
                    <Box sx={{ mb: 1 }}>
                      <SectionLabel>Connections</SectionLabel>
                    </Box>
                    {connectionsError && <Alert severity="error" sx={{ mb: 2 }}>{connectionsError}</Alert>}
                    {!connectionsLoading && (
                      connections.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No connections found.</Typography>
                      ) : (
                        <Table size="small" sx={denseTableSx}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Connection id</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Topology</TableCell>
                              <TableCell>Protocols</TableCell>
                              <TableCell>Source</TableCell>
                              <TableCell>Destination</TableCell>
                              <TableCell>Lifecycle</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {connections.map((conn) => (
                              <TableRow key={conn.id} hover>
                                <TableCell>
                                  <Button size="small" onClick={() => navigate(`/it/connections/${conn.id}/overview`)}>
                                    {conn.connection_id}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <Button size="small" onClick={() => navigate(`/it/connections/${conn.id}/overview`)}>
                                    {conn.name}
                                  </Button>
                                </TableCell>
                                <TableCell>{topologyLabel(conn.topology)}</TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    {(conn.protocol_labels || []).map((p) => (
                                      <Box key={p} component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{p}</Box>
                                    ))}
                                  </Stack>
                                </TableCell>
                                <TableCell>{conn.source_label || '-'}</TableCell>
                                <TableCell>{conn.destination_label || '-'}</TableCell>
                                <TableCell>{labelFor('lifecycleStatus', conn.lifecycle) || conn.lifecycle}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )
                    )}
                  </Box>

                  <Box>
                    <Box sx={{ mb: 1 }}>
                      <SectionLabel>Knowledge</SectionLabel>
                    </Box>
                    <EntityKnowledgePanel
                      entityType="assets"
                      entityId={id}
                      canCreate={canCreateKnowledge}
                      controlsMaxWidth={560}
                    />
                  </Box>
                </>
              )}
            </Stack>
          )}
          {tab === 'technical' && (
            <Stack spacing={3.5} sx={{ maxWidth: 900 }}>
              <Box>
                <Box sx={{ mb: 1 }}>
                  <SectionLabel>Cluster management</SectionLabel>
                </Box>
                <Stack spacing={1.25} sx={{ maxWidth: 560 }}>
                  <Box
                    component="label"
                    sx={(muiTheme) => ({
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      width: 'fit-content',
                      color: muiTheme.palette.kanap.text.tertiary,
                      fontSize: 13,
                      lineHeight: 1.4,
                    })}
                  >
                    Cluster
                    <Switch
                      checked={isCluster}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setIsCluster(next);
                        if (next) setOperatingSystem('');
                        if (isCreate) setDirty(true);
                        else void patchAsset({ is_cluster: next, operating_system: next ? null : operatingSystem || null });
                      }}
                      disabled={!canManage || saving}
                      color="primary"
                      size="small"
                      inputProps={{ 'aria-label': 'Cluster' }}
                    />
                  </Box>
                  {isCluster && (
                    <Alert
                      severity="info"
                      sx={(muiTheme) => ({
                        bgcolor: muiTheme.palette.kanap.bg.composer,
                        border: `1px solid ${muiTheme.palette.kanap.border.default}`,
                        borderRadius: 1,
                        color: muiTheme.palette.kanap.text.secondary,
                        fontSize: 13,
                        '& .MuiAlert-icon': {
                          color: muiTheme.palette.kanap.text.tertiary,
                        },
                      })}
                    >
                      Cluster servers can be endpoints in connections. Assign application instances to member hosts, not to the cluster itself.
                    </Alert>
                  )}
                </Stack>
              </Box>
              {/* CLUSTER SECTIONS */}
              {isCluster && (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <SectionLabel>Members</SectionLabel>
                    <Button
                      variant="action"
                      size="small"
                      onClick={openMemberDialog}
                      disabled={isCreate}
                    >
                      Edit members
                    </Button>
                  </Stack>
                  {isCreate && (
                    <Alert severity="info">Save this cluster before managing members.</Alert>
                  )}
                  {!isCreate && clusterError && <Alert severity="error" sx={{ mb: 1 }}>{clusterError}</Alert>}
                  {!isCreate && !clusterLoading && clusterMembers.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No members added yet.</Typography>
                  )}
                  {!isCreate && !clusterLoading && clusterMembers.length > 0 && (
                    <Table size="small" sx={denseTableSx}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Environment</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Operating system</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {clusterMembers.map((member) => (
                          <TableRow key={member.id} hover>
                            <TableCell>
                              <Button size="small" onClick={() => navigate(`/it/assets/${member.id}/overview`)}>
                                {member.name}
                              </Button>
                            </TableCell>
                            <TableCell>{environmentLabel(member.environment)}</TableCell>
                            <TableCell>{labelFor('lifecycleStatus', member.status) || member.status}</TableCell>
                            <TableCell>
                              {labelFor('operatingSystem', member.operating_system || '') ||
                                member.operating_system ||
                                '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}
              {!isCluster && !isCreate && (
                <Box>
                  <Box sx={{ mb: 1 }}>
                    <SectionLabel>Cluster membership</SectionLabel>
                  </Box>
                  {clustersError && <Alert severity="error" sx={{ mb: 1 }}>{clustersError}</Alert>}
                  {!clustersLoading && (
                    clustersForServer.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Not part of any cluster.</Typography>
                    ) : (
                      <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                        {clustersForServer.map((c) => (
                          <Stack key={c.id} direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Button size="small" onClick={() => navigate(`/it/assets/${c.id}/overview`)}>{c.name}</Button>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {environmentLabel(c.environment)} / {labelFor('lifecycleStatus', c.status) || c.status}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">Cluster</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )
                  )}
                </Box>
              )}

              {/* IDENTITY SECTION */}
              <Box>
                <Box sx={{ mb: 1.5 }}>
                  <SectionLabel>Identity</SectionLabel>
                </Box>
                <Stack spacing={1.5} sx={{ maxWidth: 560 }}>
                  <PropertyRow label="Hostname" valueSx={{ maxWidth: 520 }}>
                    <TextField
                      value={hostname}
                      onChange={(e) => { setHostname(e.target.value); setHostnameManuallyEdited(true); if (isCreate) setDirty(true); }}
                      onBlur={(e) => {
                        const next = e.currentTarget.value;
                        const cleanHostname = next.trim().toLowerCase();
                        const domainOpt = domainOptions.find((domainOption) => domainOption.value === domain);
                        const nextFqdn = cleanHostname
                          ? (!domain || domain === 'workgroup' || domain === 'n-a' || !domainOpt?.dns_suffix
                              ? cleanHostname
                              : `${cleanHostname}.${domainOpt.dns_suffix}`)
                          : null;
                        setHostname(next);
                        if (!isCreate && (next || '') !== (data?.hostname || '')) void patchAsset({ hostname: next || null, fqdn: nextFqdn });
                      }}
                      error={!!hostnameRequired && !hostname}
                      helperText={hostnameRequired && !hostname ? 'Hostname is required when a domain is selected' : undefined}
                      placeholder="Hostname"
                      size="small"
                      variant="standard"
                      InputProps={{ disableUnderline: true }}
                      sx={contentFieldSx}
                      disabled={!canManage}
                    />
                  </PropertyRow>
                  <PropertyRow label="Domain" valueSx={{ maxWidth: 520 }}>
                    <TextField
                      select
                      value={domain}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDomain(next);
                        if (isCreate) setDirty(true);
                        else void patchAsset({ domain: next || null });
                      }}
                      size="small"
                      variant="standard"
                      InputProps={{ disableUnderline: true }}
                      sx={contentFieldSx}
                      disabled={!canManage}
                    >
                      <MenuItem value="" sx={drawerMenuItemSx}>None</MenuItem>
                      {domainOptions
                        .filter((opt) => !opt.deprecated || opt.value === domain)
                        .map((opt) => (
                          <MenuItem key={opt.value} value={opt.value} sx={drawerMenuItemSx}>{opt.label}</MenuItem>
                        ))}
                    </TextField>
                  </PropertyRow>
                  <PropertyRow label="FQDN" valueSx={{ maxWidth: 520 }}>
                    <TextField
                      value={computedFqdn}
                      InputProps={{
                        readOnly: true,
                        disableUnderline: true,
                        sx: { color: 'text.secondary', '& input': { cursor: 'default' } },
                      }}
                      size="small"
                      variant="standard"
                      sx={contentFieldSx}
                    />
                  </PropertyRow>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={aliases}
                    onChange={(_, newValue) => {
                      const next = newValue.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
                      setAliases(next);
                      if (isCreate) setDirty(true);
                      else void patchAsset({ aliases: next.length > 0 ? next : null });
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip size="small" label={option} {...getTagProps({ index })} key={index} />
                      ))
                    }
                    renderInput={(params) => (
                      <PropertyRow label="Aliases" valueSx={{ maxWidth: 520 }}>
                        <TextField
                          {...params}
                          placeholder={aliases.length === 0 ? 'Alias names' : ''}
                          size="small"
                          variant="standard"
                          InputProps={{ ...params.InputProps, disableUnderline: true }}
                          sx={contentFieldSx}
                        />
                      </PropertyRow>
                    )}
                    disabled={!canManage}
                  />
                  <PropertyRow label="Operating system" valueSx={{ maxWidth: 520 }}>
                    <TextField
                      select
                      value={operatingSystem}
                      onChange={(e) => {
                        const next = e.target.value;
                        setOperatingSystem(next);
                        if (isCreate) setDirty(true);
                        else void patchAsset({ operating_system: next || null });
                      }}
                      disabled={isCluster || !canManage}
                      helperText={(() => {
                        if (isCluster) return 'Operating system is defined by cluster member assets.';
                        const sel = operatingSystemOptions.find((opt) => opt.value === operatingSystem);
                        if (!sel) return 'Choose from the operating systems list in settings.';
                        const ss = sel.standardSupportEnd ? `Standard support ends ${ymdToEu(sel.standardSupportEnd)}` : '';
                        const es = sel.extendedSupportEnd ? `Extended support ends ${ymdToEu(sel.extendedSupportEnd)}` : '';
                        return [ss, es].filter(Boolean).join(' / ');
                      })()}
                      size="small"
                      variant="standard"
                      InputProps={{ disableUnderline: true }}
                      sx={contentFieldSx}
                    >
                      <MenuItem value="" sx={drawerMenuItemSx}>None</MenuItem>
                      {operatingSystemOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value} sx={drawerMenuItemSx}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </PropertyRow>
                </Stack>
              </Box>

              {/* NETWORK INFORMATION SECTION */}
              <Box>
                <Box sx={{ mb: 1.5 }}>
                  <SectionLabel>IP addresses</SectionLabel>
                </Box>
                <Stack spacing={2}>
                  {/* Keep the network block in the main work area; it is too wide for the properties drawer. */}
                  <Button
                    size="small"
                    variant="action"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const defaultType = ipAddressTypeOptions[0]?.value || 'host';
                      setIpAddresses((prev) => [...prev, { type: defaultType, ip: '', subnet_cidr: null }]);
                      if (isCreate) setDirty(true);
                    }}
                    disabled={!canManage}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add IP address
                  </Button>
                  {ipAddresses.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No IP addresses configured.
                    </Typography>
                  )}
                  {ipAddresses.map((entry, idx) => {
                    const selectedSubnet = subnetOptions.find((s) => s.value === entry.subnet_cidr);
                    return (
                      <Box
                        key={idx}
                        sx={(muiTheme) => ({
                          p: 1.5,
                          border: `1px solid ${muiTheme.palette.kanap.border.default}`,
                          borderRadius: '8px',
                          bgcolor: muiTheme.palette.kanap.bg.primary,
                          maxWidth: 760,
                        })}
                      >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'flex-end' }} sx={{ mb: 1.5 }}>
                          <PropertyRow label="Type" valueSx={{ minWidth: { xs: '100%', sm: 130 } }}>
                            <TextField
                              select
                              value={entry.type}
                              onChange={(e) => {
                                const next = ipAddresses.map((x, i) => (i === idx ? { ...x, type: e.target.value } : x));
                                setIpAddresses(next);
                                persistIpAddresses(next);
                              }}
                              size="small"
                              variant="standard"
                              InputProps={{ disableUnderline: true }}
                              sx={contentFieldSx}
                              disabled={!canManage}
                            >
                              {ipAddressTypeOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value} sx={drawerMenuItemSx}>{opt.label}</MenuItem>
                              ))}
                            </TextField>
                          </PropertyRow>
                          <PropertyRow label="IP address" valueSx={{ flex: 1, minWidth: { xs: '100%', sm: 220 } }}>
                            <TextField
                              value={entry.ip}
                              onChange={(e) => {
                                const next = ipAddresses.map((x, i) => (i === idx ? { ...x, ip: e.target.value } : x));
                                setIpAddresses(next);
                                if (isCreate) setDirty(true);
                              }}
                              onBlur={(e) => {
                                const next = ipAddresses.map((x, i) => (i === idx ? { ...x, ip: e.currentTarget.value } : x));
                                setIpAddresses(next);
                                persistIpAddresses(next);
                              }}
                              placeholder="IP address"
                              fullWidth
                              size="small"
                              variant="standard"
                              InputProps={{ disableUnderline: true }}
                              sx={contentFieldSx}
                              disabled={!canManage}
                            />
                          </PropertyRow>
                          <IconButton
                            aria-label="Remove IP address"
                            onClick={() => {
                              const next = ipAddresses.filter((_, i) => i !== idx);
                              setIpAddresses(next);
                              persistIpAddresses(next);
                            }}
                            size="small"
                            disabled={!canManage}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
                          <PropertyRow label="Subnet" valueSx={{ minWidth: { xs: '100%', sm: 220 } }}>
                            <TextField
                              select
                              value={entry.subnet_cidr || ''}
                              onChange={(e) => {
                                const next = ipAddresses.map((x, i) => (i === idx ? { ...x, subnet_cidr: e.target.value || null } : x));
                                setIpAddresses(next);
                                persistIpAddresses(next);
                              }}
                              size="small"
                              variant="standard"
                              InputProps={{ disableUnderline: true }}
                              sx={contentFieldSx}
                              helperText={subnetOptions.length === 0 ? 'Define subnets in settings.' : undefined}
                              disabled={!canManage}
                            >
                              <MenuItem value="" sx={drawerMenuItemSx}>None</MenuItem>
                              {subnetOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value} sx={drawerMenuItemSx}>
                                  {opt.label}
                                  {opt.description && ` / ${opt.description}`}
                                </MenuItem>
                              ))}
                            </TextField>
                          </PropertyRow>
                          <PropertyRow label="Network zone" valueSx={{ minWidth: { xs: '100%', sm: 150 } }}>
                            <TextField
                              value={selectedSubnet ? (labelFor('networkSegment', selectedSubnet.network_zone) || selectedSubnet.network_zone || '-') : '-'}
                              size="small"
                              variant="standard"
                              sx={contentFieldSx}
                              InputProps={{ readOnly: true, disableUnderline: true }}
                            />
                          </PropertyRow>
                          <PropertyRow label="VLAN" valueSx={{ minWidth: { xs: '100%', sm: 90 } }}>
                            <TextField
                              value={selectedSubnet?.vlan_number ?? '-'}
                              size="small"
                              variant="standard"
                              sx={contentFieldSx}
                              InputProps={{ readOnly: true, disableUnderline: true }}
                            />
                          </PropertyRow>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          )}
          {tab === 'hardware' && isPhysicalAsset && !isCreate && (
            <HardwareInfoPanel
              ref={hardwareRef}
              assetId={id}
            />
          )}
          {tab === 'support' && isPhysicalAsset && !isCreate && (
            <SupportInfoPanel
              ref={supportRef}
              assetId={id}
            />
          )}
          {tab === 'relations' && !isCreate && (
            <AssetRelationsPanel
              ref={relationsRef}
              assetId={id}
            />
          )}
      </PortfolioDetailWorkspaceShell>
      <KanapDialog
        open={memberDialogOpen}
        title="Edit members"
        onClose={() => setMemberDialogOpen(false)}
        onSave={handleSaveMembers}
        saveLabel="Save"
        saveDisabled={memberSaving}
        saveLoading={memberSaving}
        sx={{ maxWidth: 560 }}
      >
          <Stack spacing={1.5}>
            <Autocomplete
              multiple
              options={memberOptionsCombined}
              loading={memberOptionsLoading}
              value={memberSelection}
              inputValue={memberSearch}
              onInputChange={(_, v) => setMemberSearch(v)}
              onChange={(_, vals) => setMemberSelection(vals as ServerOption[])}
              filterSelectedOptions
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              getOptionLabel={(opt) => (opt.is_cluster ? `Cluster: ${opt.name}` : opt.name)}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{option.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {environmentLabel(option.environment)} / {option.kind}
                      {option.is_cluster ? ' / cluster' : ''}
                      {' / '}
                      {option.provider}
                    </div>
                  </div>
                </li>
              )}
              renderInput={(params) => (
                <PropertyRow label="Member servers" valueSx={{ width: '100%' }}>
                  <TextField
                    {...params}
                    placeholder="Search member servers"
                    helperText="Members must be non-cluster servers."
                    variant="standard"
                    sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      endAdornment: (
                        <>
                          {memberOptionsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                </PropertyRow>
              )}
            />
            {memberSaveError && <Alert severity="error">{memberSaveError}</Alert>}
          </Stack>
      </KanapDialog>

      <KanapDialog
        open={assignDialogOpen}
        title="Add assignment"
        onClose={() => setAssignDialogOpen(false)}
        onSave={handleAssignSave}
        saveLabel="Assign"
        saveDisabled={assigning || serverRoleOptions.length === 0}
        saveLoading={assigning}
        sx={{ maxWidth: 560 }}
      >
          <Stack spacing={1.5}>
            <PropertyRow label="Application" required>
              <ApplicationSelect
                label="Application"
                value={selectedAppId}
                onChange={(appId) => { void onSelectApplication(appId); }}
                required
                hideLabel
                textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            <PropertyRow label="Environment" required>
              <TextField
                select
                value={instanceId || ''}
                onChange={(e) => setInstanceId(e.target.value)}
                disabled={!selectedAppId}
                required
                helperText={!selectedAppId ? 'Select an application to choose an environment.' : undefined}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              >
                {(selectedAppId ? appInstances[selectedAppId] || [] : []).map((inst) => (
                  <MenuItem key={inst.id} value={inst.id} sx={drawerMenuItemSx}>{environmentLabel(inst.environment)}</MenuItem>
                ))}
                {selectedAppId && (appInstances[selectedAppId] || []).length === 0 && (
                  <MenuItem value="" disabled sx={drawerMenuItemSx}>No instances for this application</MenuItem>
                )}
              </TextField>
            </PropertyRow>
            <PropertyRow label="Role" required>
              <TextField
                select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                required
                helperText={serverRoleOptions.length === 0 ? 'No server roles configured; update IT ops settings.' : undefined}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              >
                {serverRoleOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={drawerMenuItemSx}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </PropertyRow>
            <PropertyRow label="Since date">
              <DateEUField
                label=""
                hideLabel
                valueYmd={assignSince}
                onChangeYmd={setAssignSince}
                textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            <PropertyRow label="Notes">
              <TextField
                multiline
                minRows={3}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            {assignError && <Alert severity="error">{assignError}</Alert>}
          </Stack>
      </KanapDialog>
    </Box>
  );
}
