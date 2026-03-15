import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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

type IpAddressEntry = { type: string; ip: string; subnet_cidr: string | null };

type AssetRecord = {
  id: string;
  name: string;
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

type TabKey = 'overview' | 'technical' | 'hardware' | 'support' | 'relations' | 'knowledge' | 'assignments' | 'connections';

const ENV_OPTIONS = [
  { value: 'prod', label: 'Prod' },
  { value: 'pre_prod', label: 'Pre-prod' },
  { value: 'qa', label: 'QA' },
  { value: 'test', label: 'Test' },
  { value: 'dev', label: 'Dev' },
  { value: 'sandbox', label: 'Sandbox' },
] as const;

export default function AssetWorkspacePage() {
  const { hasLevel } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = String(params.id || '');
  const tab = (params.tab as TabKey) || 'overview';
  const isCreate = id === 'new';

  // Refs for panel components
  const hardwareRef = React.useRef<HardwareInfoPanelHandle>(null);
  const supportRef = React.useRef<SupportInfoPanelHandle>(null);
  const relationsRef = React.useRef<AssetRelationsPanelHandle>(null);

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
  const { byField, labelFor, settings } = useItOpsEnumOptions();
  const topologyLabel = React.useCallback((v?: string) => {
    if (v === 'server_to_server') return 'Server to Server';
    if (v === 'multi_server') return 'Multi-server';
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
      setError(e?.response?.data?.message || e?.message || 'Failed to load asset');
    }
  }, [id, isCreate]);

  React.useEffect(() => { void load(); }, [load]);

  const refreshAssignments = React.useCallback(async () => {
    if (isCreate) return;
    setAssignmentsError(null);
    try {
      const res = await api.get<AssignmentRow[]>(`/assets/${id}/assignments`);
      setAssignments(res.data as any);
    } catch (e: any) {
      setAssignmentsError(e?.response?.data?.message || e?.message || 'Failed to load assignments');
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
      setClusterError(e?.response?.data?.message || e?.message || 'Failed to load cluster members');
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
      setClustersError(e?.response?.data?.message || e?.message || 'Failed to load clusters');
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
    if (!kind) return false;
    const assetType = (settings?.serverKinds || []).find((o) => o.code === kind);
    return assetType?.is_physical ?? false;
  }, [kind, settings?.serverKinds]);

  // Redirect to valid tab if current tab is not available for this asset type
  React.useEffect(() => {
    if (isCreate) return;
    if (!data) return; // Wait for data to load
    const physicalOnlyTabs = ['hardware', 'support'];
    if (physicalOnlyTabs.includes(tab) && !isPhysicalAsset) {
      navigate(`/it/assets/${id}/overview`, { replace: true });
    }
  }, [tab, isPhysicalAsset, id, isCreate, data, navigate]);

  // Compute valid tab value for Tabs component (prevents MUI warning)
  const validTab = React.useMemo(() => {
    const physicalOnlyTabs = ['hardware', 'support'];
    if (physicalOnlyTabs.includes(tab) && !isPhysicalAsset) {
      return 'overview'; // Fallback while redirect happens
    }
    return tab;
  }, [tab, isPhysicalAsset]);

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
    setOperatingSystem(data.operating_system || '');
    setNotes(data.notes || '');
    setDirty(false);
  }, [data]);

  React.useEffect(() => {
    let cancelled = false;
    if (isCreate || tab !== 'connections') {
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
        setConnectionsError(e?.response?.data?.message || e?.message || 'Failed to load connections');
        setConnections([]);
      } finally {
        if (!cancelled) setConnectionsLoading(false);
      }
    };
    void loadConnections();
    return () => { cancelled = true; };
  }, [id, tab, isCreate]);

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
        setLocationInfoError(err?.response?.data?.message || err?.message || 'Failed to load location details');
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
      setError(e?.response?.data?.message || e?.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (assignment: AssignmentRow) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await api.delete(`/app-instances/${assignment.app_instance_id}/assets/${assignment.id}`);
      await refreshAssignments();
    } catch (e: any) {
      setAssignmentsError(e?.response?.data?.message || e?.message || 'Failed to remove assignment');
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
      setAssignError(e?.response?.data?.message || e?.message || 'Failed to load application instances');
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
      setAssignError(e?.response?.data?.message || e?.message || 'Failed to add assignment');
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
      setMemberSaveError(e?.response?.data?.message || e?.message || 'Failed to save members');
    } finally {
      setMemberSaving(false);
    }
  };

  const saveDisabled =
    saving ||
    locationInfoLoading ||
    !dirty ||
    !name.trim() ||
    !locationId ||
    !kind ||
    !provider;
  const locationCategory = locationDetails ? getHostingCategory(locationDetails.hosting_type) : null;
  const loadingPlaceholder = locationInfoLoading && locationId ? 'Loading...' : '—';
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
        : '—'
      : locationCompanyName || '—'
    : loadingPlaceholder;
  const countryDisplay = locationDetails && locationDetails.country_iso
    ? (() => {
        const code = (locationDetails.country_iso || '').toUpperCase();
        const name = countryNameMap.get(code) || code;
        return `${name} (${code})`;
      })()
    : locationDetails
      ? '—'
      : loadingPlaceholder;
  const cityDisplay = locationDetails
    ? locationDetails.city || '—'
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

  const handleReset = () => {
    setName(data?.name || '');
    setDirty(false);
    load();
  };

  const confirmAndNavigate = React.useCallback(async (targetId: string | null) => {
    if (!targetId) return;
    if (dirty) {
      const proceed = window.confirm('You have unsaved changes. Save before navigating?');
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        handleReset();
      }
    }
    const qs = listContextParams.toString();
    navigate(`/it/assets/${targetId}/${tab}${qs ? `?${qs}` : ''}`);
  }, [dirty, handleSave, handleReset, listContextParams, navigate, tab]);

  const handleClose = () => {
    const qs = listContextParams.toString();
    navigate(`/it/assets${qs ? `?${qs}` : ''}`);
  };

  const actions = (
    <Stack direction="row" spacing={1} alignItems="center">
      <IconButton
        aria-label="Previous"
        title="Previous"
        onClick={() => confirmAndNavigate(prevId)}
        disabled={!hasPrev}
        size="small"
      >
        <ArrowBackIcon />
      </IconButton>
      <IconButton
        aria-label="Next"
        title="Next"
        onClick={() => confirmAndNavigate(nextId)}
        disabled={!hasNext}
        size="small"
      >
        <ArrowForwardIcon />
      </IconButton>
      <Button onClick={handleReset}>Reset</Button>
      <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled}>
        Save
      </Button>
      <IconButton onClick={handleClose} title="Close">
        <CloseIcon />
      </IconButton>
    </Stack>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6">{isCreate ? 'New Server' : data?.name || 'Server'}</Typography>
          {isCluster && <Chip size="small" color="primary" label="Cluster" />}
          {!isCreate && total > 0 && (
            <Typography variant="body2" color="text.secondary">
              ({index + 1} of {total})
            </Typography>
          )}
        </Stack>
        {actions}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', minHeight: 360 }}>
        <Tabs
          orientation="vertical"
          value={validTab}
          onChange={(_, v) => navigate(`/it/assets/${id}/${v}`)}
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 160 }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Technical" value="technical" />
          {isPhysicalAsset && <Tab label="Hardware" value="hardware" disabled={isCreate} />}
          {isPhysicalAsset && <Tab label="Support" value="support" disabled={isCreate} />}
          <Tab label="Relations" value="relations" disabled={isCreate} />
          <Tab label="Knowledge" value="knowledge" disabled={isCreate} />
          <Tab label="Assignments" value="assignments" disabled={isCreate} />
          <Tab label="Connections" value="connections" disabled={isCreate} />
        </Tabs>
        <Box sx={{ flex: 1, pl: 3 }}>
          {tab === 'overview' && (
            <Stack spacing={2} maxWidth={520}>
              <TextField label="Name" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} required />
              <Autocomplete
                options={kindOptions.filter((opt) => !opt.deprecated || opt.value === kind)}
                value={
                  kind
                    ? kindOptions.find((opt) => opt.value === kind) || { value: kind, label: kind, deprecated: false }
                    : null
                }
                onChange={(_, val) => { setKind(val?.value || ''); setDirty(true); }}
                getOptionLabel={(opt) => opt.label}
                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                openOnFocus
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Asset type"
                    required
                    placeholder="Start typing to search"
                  />
                )}
              />
              <FormControlLabel
                control={(
                  <Switch
                    checked={isCluster}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setIsCluster(next);
                      if (next) setOperatingSystem('');
                      setDirty(true);
                    }}
                    color="primary"
                  />
                )}
                label="This server represents a cluster"
              />
              {isCluster && (
                <Alert severity="info">
                  Cluster servers can be endpoints in connections. Assign application instances to member hosts, not to the cluster itself.
                </Alert>
              )}
              <LocationSelect
                value={locationId}
                onChange={(val) => { setLocationId(val); setDirty(true); }}
                label="Location"
                required
              />
              {locationInfoError && <Alert severity="warning">{locationInfoError}</Alert>}
              <Stack spacing={2}>
                <TextField
                  label="Hosting type"
                  value={hostingTypeDisplay}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label={providerOrCompanyLabel}
                  value={providerOrCompanyDisplay}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Country"
                  value={countryDisplay}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="City"
                  value={cityDisplay}
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
              <TextField select label="Lifecycle" value={status} onChange={(e) => { setStatus(e.target.value as any); setDirty(true); }}>
                {lifecycleOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
              <DateEUField
                label="Go-live date"
                valueYmd={goLiveDate}
                onChangeYmd={(val) => { setGoLiveDate(val); setDirty(true); }}
              />
              <DateEUField
                label="End-of-life date"
                valueYmd={endOfLifeDate}
                onChangeYmd={(val) => { setEndOfLifeDate(val); setDirty(true); }}
              />
              <TextField
                label="Notes"
                multiline
                minRows={3}
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                InputLabelProps={{ shrink: true }}
              />

            </Stack>
          )}
          {tab === 'technical' && (
            <Stack spacing={3} maxWidth={520}>
              {/* ENVIRONMENT SECTION */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Environment
                </Typography>
                <TextField
                  select
                  label="Environment"
                  value={environment}
                  onChange={(e) => { setEnvironment(e.target.value); setDirty(true); }}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                >
                  {ENV_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </TextField>
              </Box>

              {/* CLUSTER SECTIONS */}
              {isCluster && (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1">Members</Typography>
                    <Button
                      variant="outlined"
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
                  {!isCreate && clusterLoading && (
                    <Typography variant="body2" color="text.secondary">Loading members…</Typography>
                  )}
                  {!isCreate && !clusterLoading && clusterMembers.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No members added yet.</Typography>
                  )}
                  {!isCreate && !clusterLoading && clusterMembers.length > 0 && (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Environment</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Operating System</TableCell>
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
                            <TableCell>{member.environment?.toUpperCase()}</TableCell>
                            <TableCell>{labelFor('lifecycleStatus', member.status) || member.status}</TableCell>
                            <TableCell>
                              {labelFor('operatingSystem', member.operating_system || '') ||
                                member.operating_system ||
                                '—'}
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
                  <Typography variant="subtitle1">Cluster membership</Typography>
                  {clustersError && <Alert severity="error" sx={{ mb: 1 }}>{clustersError}</Alert>}
                  {clustersLoading ? (
                    <Typography variant="body2" color="text.secondary">Loading clusters…</Typography>
                  ) : clustersForServer.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Not part of any cluster.</Typography>
                  ) : (
                    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                      {clustersForServer.map((c) => (
                        <Stack key={c.id} direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Button size="small" onClick={() => navigate(`/it/assets/${c.id}/overview`)}>{c.name}</Button>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {c.environment?.toUpperCase()} · {labelFor('lifecycleStatus', c.status) || c.status}
                            </Typography>
                          </Box>
                          <Chip size="small" label="Cluster" />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {/* IDENTITY SECTION */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Identity
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Hostname"
                    value={hostname}
                    onChange={(e) => { setHostname(e.target.value); setHostnameManuallyEdited(true); setDirty(true); }}
                    InputLabelProps={{ shrink: true }}
                    error={!!hostnameRequired && !hostname}
                    helperText={hostnameRequired && !hostname ? 'Hostname is required when a domain is selected' : undefined}
                  />
                  <TextField
                    select
                    label="Domain"
                    value={domain}
                    onChange={(e) => { setDomain(e.target.value); setDirty(true); }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">—</MenuItem>
                    {domainOptions
                      .filter((opt) => !opt.deprecated || opt.value === domain)
                      .map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                  </TextField>
                  <TextField
                    label="FQDN"
                    value={computedFqdn}
                    InputProps={{
                      readOnly: true,
                      sx: { color: 'text.secondary', '& input': { cursor: 'default' } },
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={aliases}
                    onChange={(_, newValue) => {
                      setAliases(newValue.map((v) => String(v).trim().toLowerCase()).filter(Boolean));
                      setDirty(true);
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip size="small" label={option} {...getTagProps({ index })} key={index} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Aliases"
                        placeholder={aliases.length === 0 ? 'Type and press Enter' : ''}
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                  <TextField
                    select
                    label="Operating System"
                    value={operatingSystem}
                    onChange={(e) => { setOperatingSystem(e.target.value); setDirty(true); }}
                    disabled={isCluster}
                    helperText={(() => {
                      if (isCluster) return 'Operating system is defined by cluster member servers.';
                      const sel = operatingSystemOptions.find((opt) => opt.value === operatingSystem);
                      if (!sel) return 'Choose from the Operating Systems list in Settings.';
                      const ss = sel.standardSupportEnd ? `Standard support ends ${ymdToEu(sel.standardSupportEnd)}` : '';
                      const es = sel.extendedSupportEnd ? `Extended support ends ${ymdToEu(sel.extendedSupportEnd)}` : '';
                      return [ss, es].filter(Boolean).join(' · ');
                    })()}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">—</MenuItem>
                    {operatingSystemOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Box>

              {/* NETWORK INFORMATION SECTION */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  IP Addresses
                </Typography>
                <Stack spacing={2}>
                  {/* Add IP Address button at TOP */}
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const defaultType = ipAddressTypeOptions[0]?.value || 'host';
                      setIpAddresses((prev) => [...prev, { type: defaultType, ip: '', subnet_cidr: null }]);
                      setDirty(true);
                    }}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add IP Address
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
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'background.paper',
                        }}
                      >
                        {/* Row 1: Type + IP + Delete */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                          <TextField
                            select
                            label="Type"
                            value={entry.type}
                            onChange={(e) => {
                              setIpAddresses((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, type: e.target.value } : x))
                              );
                              setDirty(true);
                            }}
                            size="small"
                            sx={{ minWidth: 130 }}
                            InputLabelProps={{ shrink: true }}
                          >
                            {ipAddressTypeOptions.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            label="IP Address"
                            value={entry.ip}
                            onChange={(e) => {
                              setIpAddresses((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, ip: e.target.value } : x))
                              );
                              setDirty(true);
                            }}
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                          />
                          <IconButton
                            onClick={() => {
                              setIpAddresses((prev) => prev.filter((_, i) => i !== idx));
                              setDirty(true);
                            }}
                            size="small"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        {/* Row 2: Subnet + Network Zone + VLAN */}
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            select
                            label="Subnet"
                            value={entry.subnet_cidr || ''}
                            onChange={(e) => {
                              setIpAddresses((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, subnet_cidr: e.target.value || null } : x))
                              );
                              setDirty(true);
                            }}
                            size="small"
                            sx={{ minWidth: 180 }}
                            InputLabelProps={{ shrink: true }}
                            helperText={subnetOptions.length === 0 ? 'Define subnets in Settings.' : undefined}
                          >
                            <MenuItem value="">—</MenuItem>
                            {subnetOptions.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                                {opt.description && ` - ${opt.description}`}
                              </MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            label="Network Zone"
                            value={selectedSubnet ? (labelFor('networkSegment', selectedSubnet.network_zone) || selectedSubnet.network_zone || '—') : '—'}
                            size="small"
                            sx={{ minWidth: 120 }}
                            InputProps={{ readOnly: true }}
                            InputLabelProps={{ shrink: true }}
                          />
                          <TextField
                            label="VLAN"
                            value={selectedSubnet?.vlan_number ?? '—'}
                            size="small"
                            sx={{ minWidth: 80 }}
                            InputProps={{ readOnly: true }}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          )}
          {tab === 'assignments' && !isCreate && (
            <Box>
              {assignmentsError && <Alert severity="error" sx={{ mb: 2 }}>{assignmentsError}</Alert>}
              {assignMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAssignMessage(null)}>{assignMessage}</Alert>}
              {isCluster && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Cluster servers cannot host application assignments. Assign member hosts instead.
                </Alert>
              )}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">Assignments</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={openAssignDialog}
                  disabled={serverRoleOptions.length === 0 || isCluster}
                >
                  Add assignment
                </Button>
              </Stack>
              <Table size="small">
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
                        <Button size="small" onClick={() => navigate(`/it/applications/${assignment.application.id}/assets`)}>{assignment.application.name}</Button>
                      </TableCell>
                      <TableCell>{assignment.environment?.toUpperCase()}</TableCell>
                      <TableCell>{assignment.role}</TableCell>
                      <TableCell>{assignment.since_date || '—'}</TableCell>
                      <TableCell>{assignment.notes || '—'}</TableCell>
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
          )}
          {tab === 'connections' && !isCreate && (
            <Box>
              {connectionsError && <Alert severity="error" sx={{ mb: 2 }}>{connectionsError}</Alert>}
              {connectionsLoading ? (
                <Typography variant="body2" color="text.secondary">Loading connections…</Typography>
              ) : connections.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No connections found.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Connection ID</TableCell>
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
                              <Chip key={p} size="small" label={p} />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>{conn.source_label || '—'}</TableCell>
                        <TableCell>{conn.destination_label || '—'}</TableCell>
                        <TableCell>{labelFor('lifecycleStatus', conn.lifecycle) || conn.lifecycle}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
          {tab === 'hardware' && isPhysicalAsset && !isCreate && (
            <HardwareInfoPanel
              ref={hardwareRef}
              assetId={id}
              onDirtyChange={(d) => d && setDirty(true)}
            />
          )}
          {tab === 'support' && isPhysicalAsset && !isCreate && (
            <SupportInfoPanel
              ref={supportRef}
              assetId={id}
              onDirtyChange={(d) => d && setDirty(true)}
            />
          )}
          {tab === 'relations' && !isCreate && (
            <AssetRelationsPanel
              ref={relationsRef}
              assetId={id}
              onDirtyChange={(d) => d && setDirty(true)}
            />
          )}
          {tab === 'knowledge' && !isCreate && (
            <EntityKnowledgePanel entityType="assets" entityId={id} canCreate={canCreateKnowledge} />
          )}
        </Box>
      </Box>
      <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit members</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
                    <div style={{ fontWeight: 600 }}>{option.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {option.environment?.toUpperCase()} · {option.kind}
                      {option.is_cluster ? ' · cluster' : ''}
                      {' · '}
                      {option.provider}
                    </div>
                  </div>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Member servers"
                  placeholder="Search servers"
                  helperText="Members must be non-cluster servers."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {memberOptionsLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            {memberSaveError && <Alert severity="error">{memberSaveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveMembers()} disabled={memberSaving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add assignment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ApplicationSelect
              label="Application"
              value={selectedAppId}
              onChange={(appId) => { void onSelectApplication(appId); }}
              required
            />
            <TextField
              select
              label="Environment"
              value={instanceId || ''}
              onChange={(e) => setInstanceId(e.target.value)}
              disabled={!selectedAppId}
              required
              helperText={!selectedAppId ? 'Select an application to choose an environment.' : undefined}
            >
              {(selectedAppId ? appInstances[selectedAppId] || [] : []).map((inst) => (
                <MenuItem key={inst.id} value={inst.id}>{inst.environment.toUpperCase()}</MenuItem>
              ))}
              {selectedAppId && (appInstances[selectedAppId] || []).length === 0 && (
                <MenuItem value="" disabled>No instances for this application</MenuItem>
              )}
            </TextField>
            <TextField
              select
              label="Role"
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value)}
              required
              helperText={serverRoleOptions.length === 0 ? 'No server roles configured; update IT Ops settings.' : undefined}
            >
              {serverRoleOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
            <DateEUField
              label="Since date"
              valueYmd={assignSince}
              onChangeYmd={setAssignSince}
            />
            <TextField
              label="Notes"
              multiline
              minRows={3}
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
            />
            {assignError && <Alert severity="error">{assignError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleAssignSave()}
            disabled={assigning || serverRoleOptions.length === 0}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
