import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { KanapDialog, PropertyGroup, PropertyRow } from '../../components/design';
import IntegratedDocumentEditor, { type IntegratedDocumentEditorHandle } from '../../components/IntegratedDocumentEditor';
import DateEUField from '../../components/fields/DateEUField';
import EntityKnowledgePanel from '../../components/EntityKnowledgePanel';
import SupplierSelect from '../../components/fields/SupplierSelect';
import ContactSelect from '../../components/fields/ContactSelect';
import CompanySelect from '../../components/fields/CompanySelect';
import DepartmentMultiSelect from '../../components/fields/DepartmentMultiSelect';
import TeamMemberMultiSelect from '../../components/fields/TeamMemberMultiSelect';
import useItOpsEnumOptions from '../../hooks/useItOpsEnumOptions';
import { useApplicationNav } from '../../hooks/useApplicationNav';
import { MONO_FONT_FAMILY } from '../../config/ThemeContext';
import { dialogBorderedFieldSx, drawerAutocompleteListboxSx, drawerFieldValueSx, drawerMenuItemSx, drawerSelectSx } from '../../theme/formSx';
import { CRITICALITY_COLORS, getDotColor, LIFECYCLE_COLORS } from '../../utils/statusColors';
import { COUNTRY_OPTIONS } from '../../constants/isoOptions';
import PortfolioDetailWorkspaceShell from '../portfolio/workspace/PortfolioDetailWorkspaceShell';
import { PortfolioMetadataItem, PortfolioStatusMetadata } from '../portfolio/workspace/PortfolioMetadataBar';
import DeploymentsEditor from './components/DeploymentsEditor';
import ApplicationRelationsPanel from './editors/ApplicationRelationsPanel';
import ApplicationCreateEditor, { type ApplicationCreateEditorHandle } from './editors/ApplicationCreateEditor';
import CreateVersionDialog from './components/CreateVersionDialog';

type TabKey = 'overview' | 'deployments' | 'interfaces' | 'operations' | 'compliance' | 'relations';

type ApplicationDetail = {
  id: string;
  sequential_id?: string | null;
  name: string;
  category: string;
  supplier_id: string | null;
  editor: string | null;
  lifecycle: string;
  criticality: 'business_critical' | 'high' | 'medium' | 'low' | string;
  version: string | null;
  go_live_date: string | null;
  end_of_support_date: string | null;
  retired_date: string | null;
  external_facing: boolean;
  is_suite: boolean;
  etl_enabled: boolean;
  contains_pii: boolean;
  data_class: string | null;
  last_dr_test: string | null;
  support_notes: string | null;
  access_methods: string[];
  users_mode: string | null;
  users_year?: number | null;
  users_override: number | null;
  derived_total_users?: number | null;
  owners: Array<{
    id?: string;
    user_id: string;
    owner_type: 'business' | 'it';
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }>;
  companies: Array<{ company_id: string }>;
  departments: Array<{ department_id: string }>;
  data_residency: Array<{ country_iso: string }>;
  support_contacts?: any[];
  instances?: Array<{
    id: string;
    application_id: string;
    environment: string;
    lifecycle: string;
    base_url: string | null;
    sso_enabled: boolean;
    mfa_supported: boolean;
    status: 'enabled' | 'disabled';
    notes: string | null;
  }>;
  deployments?: Array<{
    id: string;
    application_id: string;
    environment: string;
    lifecycle: string;
    base_url: string | null;
    sso_enabled: boolean;
    mfa_supported: boolean;
    status: 'enabled' | 'disabled';
    notes: string | null;
  }>;
};

type InterfaceMiniRow = {
  id: string;
  interface_id: string;
  name: string;
  environment: string;
  source_application_id?: string | null;
  source_application_name?: string | null;
  target_application_id?: string | null;
  target_application_name?: string | null;
  middleware_application_ids?: string[];
  middleware_application_names?: string[];
  via_middleware: boolean;
};

type ConnectionsResult =
  | { type: 'none' }
  | { type: 'directed'; receivesFrom: Array<{ id: string; name: string }>; sendsTo: Array<{ id: string; name: string }> }
  | { type: 'undirected'; connected: Array<{ id: string; name: string }> };

type SupportContactRow = {
  id?: string;
  contact_id: string | null;
  role?: string | null;
  contact?: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
  } | null;
};

const VALID_TABS = new Set<TabKey>(['overview', 'deployments', 'interfaces', 'operations', 'compliance', 'relations']);

function slugify(value: string) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

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

function contactName(row: SupportContactRow) {
  const contact = row.contact || {};
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
  return name || contact.email || 'Unnamed contact';
}

function contactPhone(row: SupportContactRow) {
  return row.contact?.phone || row.contact?.mobile || null;
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

function addUniqueApp(target: Map<string, { id: string; name: string }>, id: string | null | undefined, name: string | null | undefined) {
  if (!id || target.has(id)) return;
  target.set(id, { id, name: name || 'Untitled application' });
}

function computeConnections(app: ApplicationDetail, interfaces: InterfaceMiniRow[]): ConnectionsResult {
  const isMiddleware = app.etl_enabled === true;
  if (isMiddleware) {
    const connected = new Map<string, { id: string; name: string }>();
    interfaces.forEach((row) => {
      addUniqueApp(connected, row.source_application_id === app.id ? null : row.source_application_id, row.source_application_name);
      addUniqueApp(connected, row.target_application_id === app.id ? null : row.target_application_id, row.target_application_name);
    });
    if (connected.size === 0) return { type: 'none' };
    return { type: 'undirected', connected: Array.from(connected.values()) };
  }

  const receivesFrom = new Map<string, { id: string; name: string }>();
  const sendsTo = new Map<string, { id: string; name: string }>();
  interfaces.forEach((row) => {
    if (row.target_application_id === app.id && row.source_application_id !== app.id) {
      addUniqueApp(receivesFrom, row.source_application_id, row.source_application_name);
    }
    if (row.source_application_id === app.id && row.target_application_id !== app.id) {
      addUniqueApp(sendsTo, row.target_application_id, row.target_application_name);
    }
  });

  if (receivesFrom.size === 0 && sendsTo.size === 0) return { type: 'none' };
  return {
    type: 'directed',
    receivesFrom: Array.from(receivesFrom.values()),
    sendsTo: Array.from(sendsTo.values()),
  };
}

function useAppData(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['application-workspace', id],
    queryFn: async () => {
      const res = await api.get<ApplicationDetail>(`/applications/${id}`, { params: { include: 'deployments,support' } });
      return res.data;
    },
    enabled,
  });
}

function ApplicationProperties({
  app,
  canManage,
  onPatch,
  onLocalUpdate,
}: {
  app: ApplicationDetail;
  canManage: boolean;
  onPatch: (patch: Partial<ApplicationDetail>) => void;
  onLocalUpdate: (updater: (prev: ApplicationDetail) => ApplicationDetail) => void;
}) {
  const { byField } = useItOpsEnumOptions();
  const categoryOptions = byField.applicationCategory || [];
  const [savingOwners, setSavingOwners] = React.useState(false);
  const [savingAudience, setSavingAudience] = React.useState(false);
  const [audienceRows, setAudienceRows] = React.useState<Array<{ key: string; company_id: string | null; department_ids: string[] }>>([]);

  const selectedDepartmentIds = React.useMemo(
    () => (app.departments || []).map((row) => row.department_id).filter(Boolean),
    [app.departments],
  );

  const departmentDetailsQuery = useQuery({
    queryKey: ['application-audience-departments', app.id, selectedDepartmentIds],
    queryFn: async () => {
      const entries = await Promise.all(selectedDepartmentIds.map(async (departmentId) => {
        const res = await api.get<{ id: string; company_id: string; name: string }>(`/departments/${departmentId}`);
        return [departmentId, res.data] as const;
      }));
      return Object.fromEntries(entries) as Record<string, { id: string; company_id: string; name: string }>;
    },
    enabled: selectedDepartmentIds.length > 0,
  });

  React.useEffect(() => {
    const departmentDetails = departmentDetailsQuery.data || {};
    const companyRows = (app.companies || []).map((row) => ({
      key: `company:${row.company_id}`,
      company_id: row.company_id,
      department_ids: [],
    }));
    const wholeCompanyIds = new Set(companyRows.map((row) => row.company_id).filter(Boolean));
    const departmentsByCompany = new Map<string, string[]>();
    for (const row of app.departments || []) {
      const companyId = departmentDetails[row.department_id]?.company_id || null;
      if (!companyId || wholeCompanyIds.has(companyId)) continue;
      departmentsByCompany.set(companyId, [...(departmentsByCompany.get(companyId) || []), row.department_id]);
    }
    const departmentRows = Array.from(departmentsByCompany.entries()).map(([companyId, departmentIds]) => ({
      key: `company-departments:${companyId}`,
      company_id: companyId,
      department_ids: departmentIds,
    }));
    const nextRows = [...companyRows, ...departmentRows];
    setAudienceRows(nextRows.length ? nextRows : []);
  }, [app.companies, app.departments, departmentDetailsQuery.data]);

  const replaceOwners = React.useCallback(async (owners: ApplicationDetail['owners']) => {
    setSavingOwners(true);
    try {
      const res = await api.post<ApplicationDetail['owners']>(`/applications/${app.id}/owners/bulk-replace`, {
        owners: owners.map((owner) => ({ user_id: owner.user_id, owner_type: owner.owner_type })),
      });
      onLocalUpdate((prev) => ({ ...prev, owners: res.data || [] }));
    } finally {
      setSavingOwners(false);
    }
  }, [app.id, onLocalUpdate]);

  const replaceOwnersByType = React.useCallback(async (ownerType: 'business' | 'it', userIds: string[]) => {
    const keep = (app.owners || []).filter((owner) => owner.owner_type !== ownerType);
    const next = [
      ...keep,
      ...Array.from(new Set(userIds)).map((user_id) => ({ user_id, owner_type: ownerType })),
    ];
    await replaceOwners(next as ApplicationDetail['owners']);
  }, [app.owners, replaceOwners]);

  const saveAudienceRows = React.useCallback(async (rows: Array<{ company_id: string | null; department_ids: string[] }>) => {
    setSavingAudience(true);
    try {
      const companyIds = Array.from(new Set(rows
        .filter((row) => row.company_id && row.department_ids.length === 0)
        .map((row) => row.company_id as string)));
      const allCompanyIds = new Set(companyIds);
      const departmentIds = Array.from(new Set(rows
        .filter((row) => row.company_id && !allCompanyIds.has(row.company_id))
        .flatMap((row) => row.department_ids)));
      const [companiesRes, departmentsRes] = await Promise.all([
        api.post<ApplicationDetail['companies']>(`/applications/${app.id}/companies/bulk-replace`, { company_ids: companyIds }),
        api.post<ApplicationDetail['departments']>(`/applications/${app.id}/departments/bulk-replace`, { department_ids: departmentIds }),
      ]);
      onLocalUpdate((prev) => ({
        ...prev,
        companies: companiesRes.data || [],
        departments: departmentsRes.data || [],
      }));
      const refreshed = await api.get<ApplicationDetail>(`/applications/${app.id}`, { params: { include: 'deployments,support' } });
      onLocalUpdate(() => refreshed.data);
    } finally {
      setSavingAudience(false);
    }
  }, [app.id, onLocalUpdate]);

  return (
    <>
      <PropertyGroup>
        <PropertyRow label="Category">
          <Select
            value={app.category || 'line_of_business'}
            onChange={(event) => onPatch({ category: event.target.value })}
            variant="standard"
            disableUnderline
            disabled={!canManage}
            sx={drawerSelectSx}
          >
            {categoryOptions.map((option) => (
              <MenuItem key={option.code} value={option.code} sx={drawerMenuItemSx}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </PropertyRow>
        <PropertyRow label="Supplier">
          <SupplierSelect
            value={app.supplier_id || null}
            onChange={(value) => onPatch({ supplier_id: value })}
            disabled={!canManage}
            hideLabel
            textFieldSx={drawerFieldValueSx}
          />
        </PropertyRow>
        <PropertyRow label="Publisher">
          <TextField
            value={app.editor || ''}
            onChange={(event) => onPatch({ editor: event.target.value })}
            variant="standard"
            size="small"
            fullWidth
            disabled={!canManage}
            InputProps={{ disableUnderline: true }}
            sx={drawerFieldValueSx}
          />
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup>
        <PropertyRow label="Go live">
          <DateEUField label="" valueYmd={app.go_live_date || ''} onChangeYmd={(value) => onPatch({ go_live_date: value || null })} disabled={!canManage} size="small" hideLabel textFieldSx={drawerFieldValueSx} />
        </PropertyRow>
        <PropertyRow label="End of support">
          <DateEUField label="" valueYmd={app.end_of_support_date || ''} onChangeYmd={(value) => onPatch({ end_of_support_date: value || null })} disabled={!canManage} size="small" hideLabel textFieldSx={drawerFieldValueSx} />
        </PropertyRow>
        <PropertyRow label="Retired date">
          <DateEUField label="" valueYmd={app.retired_date || ''} onChangeYmd={(value) => onPatch({ retired_date: value || null })} disabled={!canManage} size="small" hideLabel textFieldSx={drawerFieldValueSx} />
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup>
        <PropertyRow label="Business owners">
          <TeamMemberMultiSelect
            label="Business owners"
            value={(app.owners || []).filter((owner) => owner.owner_type === 'business').map((owner) => ({
              user_id: owner.user_id,
              user_display_name: owner.full_name || [owner.first_name, owner.last_name].filter(Boolean).join(' ') || owner.email || owner.user_id,
              user_email: owner.email || undefined,
            }))}
            onChange={(userIds) => replaceOwnersByType('business', userIds)}
            disabled={!canManage || savingOwners}
            hideLabel
            textFieldSx={drawerFieldValueSx}
          />
        </PropertyRow>
        <PropertyRow label="IT owners">
          <TeamMemberMultiSelect
            label="IT owners"
            value={(app.owners || []).filter((owner) => owner.owner_type === 'it').map((owner) => ({
              user_id: owner.user_id,
              user_display_name: owner.full_name || [owner.first_name, owner.last_name].filter(Boolean).join(' ') || owner.email || owner.user_id,
              user_email: owner.email || undefined,
            }))}
            onChange={(userIds) => replaceOwnersByType('it', userIds)}
            disabled={!canManage || savingOwners}
            hideLabel
            textFieldSx={drawerFieldValueSx}
          />
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup>
        <Stack spacing={0.75}>
          {audienceRows.length === 0 && (
            <Typography sx={(theme) => ({ fontSize: 12, color: theme.palette.kanap.text.tertiary })}>
              No audience defined.
            </Typography>
          )}
          {audienceRows.map((row, index) => (
            <Box
              key={row.key}
              sx={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: '4px',
                pr: canManage ? '28px' : 0,
                py: 0.25,
              }}
            >
              <CompanySelect
                value={row.company_id}
                onChange={(value) => {
                  const nextRows = audienceRows.map((item, itemIndex) => (
                    itemIndex === index ? { ...item, company_id: value, department_ids: [] } : item
                  ));
                  setAudienceRows(nextRows);
                  void saveAudienceRows(nextRows);
                }}
                disabled={!canManage || savingAudience}
                size="small"
                label="Company"
                hideLabel
                textFieldSx={drawerFieldValueSx}
              />
              <Box>
                <DepartmentMultiSelect
                  value={row.department_ids}
                  companyId={row.company_id}
                  onChange={(value) => {
                    const nextRows = audienceRows.map((item, itemIndex) => (
                      itemIndex === index ? { ...item, department_ids: value } : item
                    ));
                    setAudienceRows(nextRows);
                    if (row.company_id) void saveAudienceRows(nextRows);
                  }}
                  disabled={!canManage || savingAudience || !row.company_id}
                  size="small"
                  label="Departments"
                  hideLabel
                  textFieldSx={drawerFieldValueSx}
                />
              </Box>
              {canManage && (
                <IconButton
                  aria-label="Remove audience row"
                  size="small"
                  disabled={savingAudience}
                  onClick={() => {
                    const nextRows = audienceRows.filter((_, itemIndex) => itemIndex !== index);
                    setAudienceRows(nextRows);
                    void saveAudienceRows(nextRows);
                  }}
                  sx={{ position: 'absolute', top: 2, right: 0, width: 22, height: 22 }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
          ))}
          {canManage && (
            <Box
              component="button"
              type="button"
              disabled={savingAudience}
              onClick={() => setAudienceRows((rows) => [...rows, { key: `draft:${Date.now()}`, company_id: null, department_ids: [] }])}
              sx={(theme) => ({
                alignSelf: 'flex-start',
                border: 0,
                p: 0,
                bgcolor: 'transparent',
                color: theme.palette.kanap.teal,
                fontSize: 12,
                cursor: savingAudience ? 'default' : 'pointer',
              })}
            >
              + Add audience
            </Box>
          )}
        </Stack>
        <Box sx={(theme) => ({ mt: 1, fontSize: 12, color: theme.palette.kanap.text.secondary, lineHeight: 1.5 })}>
          Users: {app.users_mode === 'manual' ? Number(app.users_override || 0).toLocaleString() : Number(app.derived_total_users || 0).toLocaleString()}
        </Box>
        <PropertyRow label="Calculation method">
          <Select
            value={app.users_mode === 'manual' ? 'manual' : 'it_users'}
            onChange={(event) => onPatch({ users_mode: event.target.value })}
            variant="standard"
            disableUnderline
            disabled={!canManage}
            sx={drawerSelectSx}
          >
            <MenuItem value="it_users" sx={drawerMenuItemSx}>Derived</MenuItem>
            <MenuItem value="manual" sx={drawerMenuItemSx}>Manual</MenuItem>
          </Select>
        </PropertyRow>
        {app.users_mode === 'manual' && (
          <PropertyRow label="Manual users">
            <TextField
              value={app.users_override ?? ''}
              onChange={(event) => onPatch({ users_override: event.target.value === '' ? null : Number(event.target.value) })}
              type="number"
              variant="standard"
              size="small"
              fullWidth
              disabled={!canManage}
              InputProps={{ disableUnderline: true }}
              sx={drawerFieldValueSx}
            />
          </PropertyRow>
        )}
      </PropertyGroup>
    </>
  );
}

function OverviewTab({
  app,
  canEditManagedDocs,
  canCreateKnowledge,
  editorRef,
  connections,
  onOpenApplication,
  onShowInterfaces,
}: {
  app: ApplicationDetail;
  canEditManagedDocs: boolean;
  canCreateKnowledge: boolean;
  editorRef: React.RefObject<IntegratedDocumentEditorHandle | null>;
  connections: ConnectionsResult;
  onOpenApplication: (appId: string) => void;
  onShowInterfaces: () => void;
}) {
  const renderConnectionRow = (label: string, items: Array<{ id: string; name: string }>) => {
    if (items.length === 0) return null;
    const visible = items.slice(0, 8);
    const overflow = items.length - visible.length;
    return (
      <Box sx={{ display: 'flex', gap: '12px', alignItems: 'center', minHeight: 26 }}>
        <Box sx={(theme) => ({ width: 90, flexShrink: 0, fontSize: 12, color: theme.palette.kanap.text.tertiary })}>
          {label}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minWidth: 0 }}>
          {visible.map((item) => (
            <Box
              key={item.id}
              component="button"
              type="button"
              onClick={() => onOpenApplication(item.id)}
              sx={(theme) => ({
                border: `1px solid ${theme.palette.kanap.pill.border}`,
                borderRadius: '999px',
                bgcolor: theme.palette.kanap.pill.bg,
                color: theme.palette.kanap.text.primary,
                px: '8px',
                py: '2px',
                font: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
                '&:hover': { bgcolor: theme.palette.kanap.pill.hoverBg },
              })}
            >
              {item.name}
            </Box>
          ))}
          {overflow > 0 && (
            <Box
              component="button"
              type="button"
              onClick={onShowInterfaces}
              sx={(theme) => ({
                border: 0,
                bgcolor: 'transparent',
                color: theme.palette.kanap.teal,
                p: 0,
                font: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
              })}
            >
              + {overflow} more in Interfaces
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Stack spacing={3.5}>
      <Box>
        <Box sx={{ mb: 1 }}>
          <SectionLabel>Description</SectionLabel>
        </Box>
        <IntegratedDocumentEditor
          ref={editorRef as React.Ref<IntegratedDocumentEditorHandle>}
          entityType="applications"
          entityId={app.id}
          slotKey="overview"
          label="Description"
          hideHeaderLabel
          placeholder="Add a description for this application..."
          minRows={10}
          maxRows={24}
          disabled={!canEditManagedDocs}
          showManagedDocChip={false}
          showDocumentControls={false}
          editModeBehavior="auto"
          autosaveEnabled
          autosaveDelayMs={2000}
        />
      </Box>
      {connections.type !== 'none' && (
        <Box>
          <Box sx={{ mb: 1 }}>
            <SectionLabel>Connections</SectionLabel>
          </Box>
          <Stack spacing={0.75}>
            {connections.type === 'undirected'
              ? renderConnectionRow('Connected to', connections.connected)
              : (
                <>
                  {renderConnectionRow('Receives from', connections.receivesFrom)}
                  {renderConnectionRow('Sends to', connections.sendsTo)}
                </>
              )}
          </Stack>
        </Box>
      )}
      <Box>
        <Box sx={{ mb: 1 }}>
          <SectionLabel>Knowledge</SectionLabel>
        </Box>
        <EntityKnowledgePanel entityType="applications" entityId={app.id} canCreate={canCreateKnowledge} />
      </Box>
    </Stack>
  );
}

function viaMiddlewareLabel(row: InterfaceMiniRow) {
  if (!row.via_middleware) return '—';
  const names = (row.middleware_application_names || []).filter(Boolean);
  return names.length > 0 ? `via ${names.join(', ')}` : 'via middleware';
}

function InterfaceRowsTable({
  app,
  rows,
  direction,
  onOpenInterface,
  onOpenApplication,
}: {
  app: ApplicationDetail;
  rows: InterfaceMiniRow[];
  direction: 'inbound' | 'outbound' | 'routed';
  onOpenInterface: (id: string) => void;
  onOpenApplication: (id: string) => void;
}) {
  const counterpartHeader = direction === 'inbound' ? 'Source' : direction === 'outbound' ? 'Target' : 'Endpoints';

  return (
    <Table
      size="small"
      sx={(theme) => ({
        '& th': {
          fontSize: 11,
          fontWeight: 500,
          color: theme.palette.kanap.text.tertiary,
          borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
          py: '5px',
        },
        '& td': {
          fontSize: 13,
          color: theme.palette.kanap.text.primary,
          borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
          py: '6px',
        },
        '& tbody tr': { cursor: 'pointer' },
        '& tbody tr:hover': { bgcolor: theme.palette.kanap.bg.hover },
      })}
    >
      <TableHead>
        <TableRow>
          <TableCell>Interface name</TableCell>
          <TableCell sx={{ width: direction === 'routed' ? 260 : 180 }}>{counterpartHeader}</TableCell>
          <TableCell sx={{ width: 190 }}>Via middleware</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} sx={(theme) => ({ color: `${theme.palette.kanap.text.tertiary} !important`, cursor: 'default' })}>
              No interfaces.
            </TableCell>
          </TableRow>
        )}
        {rows.map((row) => {
          const counterpartId = direction === 'inbound' ? row.source_application_id : direction === 'outbound' ? row.target_application_id : null;
          const counterpartName = direction === 'inbound'
            ? row.source_application_name
            : direction === 'outbound'
              ? row.target_application_name
              : `${row.source_application_name || '—'} → ${row.target_application_name || '—'}`;
          return (
            <TableRow key={`${direction}:${row.id}:${row.environment}`} onClick={() => onOpenInterface(row.id)}>
              <TableCell>{row.name}</TableCell>
              <TableCell
                onClick={(event) => {
                  if (!counterpartId || counterpartId === app.id) return;
                  event.stopPropagation();
                  onOpenApplication(counterpartId);
                }}
              >
                {counterpartName || '—'}
              </TableCell>
              <TableCell>
                {row.via_middleware ? (
                  <Box sx={(theme) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', color: theme.palette.kanap.text.primary })}>
                    <Box component="span" sx={(theme) => ({ width: 6, height: 6, borderRadius: '50%', bgcolor: theme.palette.kanap.text.secondary, flexShrink: 0 })} />
                    {viaMiddlewareLabel(row)}
                  </Box>
                ) : '—'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function InterfacesTab({
  app,
  rows,
  loading,
  onOpenInterface,
  onOpenApplication,
}: {
  app: ApplicationDetail;
  rows: InterfaceMiniRow[];
  loading: boolean;
  onOpenInterface: (id: string) => void;
  onOpenApplication: (id: string) => void;
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, { inbound: InterfaceMiniRow[]; outbound: InterfaceMiniRow[]; routed: InterfaceMiniRow[] }>();
    rows.forEach((row) => {
      const env = row.environment || 'unknown';
      const bucket = map.get(env) || { inbound: [], outbound: [], routed: [] };
      if (row.target_application_id === app.id) bucket.inbound.push(row);
      else if (row.source_application_id === app.id) bucket.outbound.push(row);
      else bucket.routed.push(row);
      map.set(env, bucket);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [app.id, rows]);

  if (loading) return <LinearProgress />;
  if (rows.length === 0) {
    return (
      <Typography sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.tertiary })}>
        No interfaces found for this application.
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      {grouped.map(([environment, groups]) => (
        <Box key={environment}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <Box sx={{ fontFamily: MONO_FONT_FAMILY, fontSize: 14, fontWeight: 500 }}>
              {environment.toUpperCase()}
            </Box>
          </Box>
          <Stack spacing={2}>
            {groups.inbound.length > 0 && (
              <Box>
                <Box sx={{ mb: 0.75 }}>
                  <SectionLabel>Inbound ({groups.inbound.length})</SectionLabel>
                </Box>
                <InterfaceRowsTable app={app} rows={groups.inbound} direction="inbound" onOpenInterface={onOpenInterface} onOpenApplication={onOpenApplication} />
              </Box>
            )}
            {groups.outbound.length > 0 && (
              <Box>
                <Box sx={{ mb: 0.75 }}>
                  <SectionLabel>Outbound ({groups.outbound.length})</SectionLabel>
                </Box>
                <InterfaceRowsTable app={app} rows={groups.outbound} direction="outbound" onOpenInterface={onOpenInterface} onOpenApplication={onOpenApplication} />
              </Box>
            )}
            {groups.routed.length > 0 && (
              <Box>
                <Box sx={{ mb: 0.75 }}>
                  <SectionLabel>Routed ({groups.routed.length})</SectionLabel>
                </Box>
                <InterfaceRowsTable app={app} rows={groups.routed} direction="routed" onOpenInterface={onOpenInterface} onOpenApplication={onOpenApplication} />
              </Box>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function OperationsTab({
  app,
  canManage,
  onPatch,
  onRefresh,
}: {
  app: ApplicationDetail;
  canManage: boolean;
  onPatch: (patch: Partial<ApplicationDetail>) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const { byField, labelFor } = useItOpsEnumOptions();
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false);
  const [contactDraft, setContactDraft] = React.useState<{ contact_id: string | null; role: string }>({ contact_id: null, role: '' });
  const [savingContact, setSavingContact] = React.useState(false);
  const contacts = (app.support_contacts || []) as SupportContactRow[];
  const accessOptions = byField.accessMethod || [];
  const horizontalRowSx = { display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', columnGap: '18px', alignItems: 'center' } as const;
  const horizontalLabelSx = { pt: '3px' } as const;

  const replaceContacts = React.useCallback(async (nextContacts: SupportContactRow[]) => {
    await api.post(`/applications/${app.id}/support-contacts/bulk-replace`, {
      contacts: nextContacts
        .filter((item) => item.contact_id)
        .map((item) => ({ contact_id: item.contact_id, role: item.role || null })),
    });
    await onRefresh();
  }, [app.id, onRefresh]);

  const addContact = React.useCallback(async () => {
    if (!contactDraft.contact_id) return;
    setSavingContact(true);
    try {
      await replaceContacts([...contacts, { contact_id: contactDraft.contact_id, role: contactDraft.role || null }]);
      setContactDialogOpen(false);
      setContactDraft({ contact_id: null, role: '' });
    } finally {
      setSavingContact(false);
    }
  }, [contactDraft, contacts, replaceContacts]);

  const removeContact = React.useCallback(async (row: SupportContactRow) => {
    await replaceContacts(contacts.filter((item) => item !== row));
  }, [contacts, replaceContacts]);

  return (
    <Stack spacing={3.75}>
      <Box>
        <SectionLabel>Technical</SectionLabel>
        <Stack spacing={1.5} sx={{ mt: 1.25 }}>
          <PropertyRow label="Access methods" sx={horizontalRowSx} labelSx={horizontalLabelSx} valueSx={{ maxWidth: 360 }}>
            <Autocomplete
              multiple
              options={accessOptions}
              value={accessOptions.filter((option) => (app.access_methods || []).includes(option.code))}
              onChange={(_, value) => { void onPatch({ access_methods: value.map((item) => item.code) } as Partial<ApplicationDetail>); }}
              getOptionLabel={(option) => option.label}
              disabled={!canManage}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  placeholder={(app.access_methods || []).length === 0 ? 'Not assigned' : undefined}
                  InputProps={{ ...params.InputProps, disableUnderline: true }}
                  sx={drawerFieldValueSx}
                />
              )}
              ListboxProps={{ sx: drawerAutocompleteListboxSx }}
              sx={[drawerFieldValueSx, { width: '100%' }]}
            />
          </PropertyRow>

          <Stack spacing={0.9} sx={{ pt: 0.5 }}>
            {[
              ['external_facing', 'External facing'],
              ['etl_enabled', 'Data integration / ETL'],
              ['is_suite', 'Can have child apps'],
            ].map(([field, label]) => (
              <Box component="label" key={field} sx={(theme) => ({ display: 'flex', gap: '8px', alignItems: 'center', fontSize: 13, color: theme.palette.kanap.text.primary })}>
                <input
                  type="checkbox"
                  checked={!!(app as any)[field]}
                  disabled={!canManage}
                  onChange={(event) => { void onPatch({ [field]: event.target.checked } as Partial<ApplicationDetail>); }}
                  style={{ accentColor: 'var(--kanap-teal)' }}
                />
                {label}
              </Box>
            ))}
          </Stack>
        </Stack>
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SectionLabel>Support</SectionLabel>
          <Box sx={{ flex: 1 }} />
          {canManage && (
            <Button variant="action" size="small" onClick={() => setContactDialogOpen(true)}>
              Add contact
            </Button>
          )}
        </Box>
        <Table size="small" sx={(theme) => ({
          '& th': { fontSize: 11, fontWeight: 500, color: theme.palette.kanap.text.tertiary, borderBottom: `1px solid ${theme.palette.kanap.border.default}` },
          '& td': { fontSize: 13, color: theme.palette.kanap.text.primary, borderBottom: `1px solid ${theme.palette.kanap.border.soft}` },
          '& tbody tr:hover': { bgcolor: theme.palette.kanap.bg.hover },
          '& .hover-actions': { opacity: 0, transition: 'opacity 120ms' },
          '& tbody tr:hover .hover-actions': { opacity: 1 },
        })}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 140 }}>Contact</TableCell>
              <TableCell sx={{ width: 180 }}>Email</TableCell>
              <TableCell sx={{ width: 130 }}>Phone</TableCell>
              <TableCell>Role</TableCell>
              {canManage && <TableCell align="right" sx={{ width: 52 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} sx={(theme) => ({ color: `${theme.palette.kanap.text.tertiary} !important` })}>
                  No support contacts.
                </TableCell>
              </TableRow>
            )}
            {contacts.map((row, index) => (
              <TableRow key={row.id || `${row.contact_id}:${index}`}>
                <TableCell>{contactName(row)}</TableCell>
                <TableCell>{row.contact?.email || '—'}</TableCell>
                <TableCell sx={{ fontFamily: MONO_FONT_FAMILY, fontSize: '12px !important' }}>{contactPhone(row) || '—'}</TableCell>
                <TableCell sx={!row.role ? (theme) => ({ color: `${theme.palette.kanap.text.tertiary} !important` }) : undefined}>{row.role || '—'}</TableCell>
                {canManage && (
                  <TableCell align="right">
                    <Box className="hover-actions">
                      <IconButton aria-label={`Remove ${contactName(row)}`} size="small" onClick={() => { void removeContact(row); }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ mt: 2.25 }}>
          <SectionLabel>Support notes</SectionLabel>
          <TextField
            value={app.support_notes || ''}
            onChange={(event) => { void onPatch({ support_notes: event.target.value || null }); }}
            variant="standard"
            fullWidth
            multiline
            minRows={5}
            disabled={!canManage}
            InputProps={{ disableUnderline: true }}
            placeholder="Add support notes..."
            sx={(theme) => ({
              ...drawerFieldValueSx,
              mt: 1,
              border: `1px solid ${theme.palette.kanap.border.soft}`,
              borderRadius: '6px',
              px: 1.25,
              py: 1,
              '&:focus-within': { borderColor: theme.palette.kanap.border.default },
            })}
          />
        </Box>
      </Box>

      <KanapDialog
        open={contactDialogOpen}
        title="New support contact"
        onClose={() => setContactDialogOpen(false)}
        onSave={addContact}
        saveDisabled={!contactDraft.contact_id}
        saveLoading={savingContact}
      >
        <Stack spacing={1.25}>
          <PropertyRow label="Contact" required>
            <ContactSelect
              value={contactDraft.contact_id}
              onChange={(value) => setContactDraft((prev) => ({ ...prev, contact_id: value }))}
              onContactChange={(contact) => setContactDraft({
                contact_id: contact?.id || null,
                role: contact?.job_title || '',
              })}
              compactOptions
              groupByCompany={false}
              hideLabel
              textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
            />
          </PropertyRow>
          <PropertyRow label="Role">
            <TextField
              value={contactDraft.role}
              onChange={(event) => setContactDraft((prev) => ({ ...prev, role: event.target.value }))}
              variant="standard"
              fullWidth
              InputProps={{ disableUnderline: true }}
              sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
            />
          </PropertyRow>
        </Stack>
      </KanapDialog>
    </Stack>
  );
}

function ComplianceTab({
  app,
  canManage,
  onPatch,
  onRefresh,
}: {
  app: ApplicationDetail;
  canManage: boolean;
  onPatch: (patch: Partial<ApplicationDetail>) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const { byField } = useItOpsEnumOptions();
  const residencyCodes = (app.data_residency || []).map((row) => row.country_iso);
  const selectedCountries = COUNTRY_OPTIONS.filter((option) => residencyCodes.includes(option.code));
  const horizontalRowSx = { display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr)', columnGap: '18px', alignItems: 'center' } as const;
  const horizontalLabelSx = { pt: '3px' } as const;
  const compactValueSx = { maxWidth: 360 } as const;

  return (
    <Box>
      <Stack spacing={1.35}>
        <PropertyRow label="Data class" required sx={horizontalRowSx} labelSx={horizontalLabelSx} valueSx={compactValueSx}>
          <Select
            value={app.data_class || 'internal'}
            onChange={(event) => { void onPatch({ data_class: event.target.value }); }}
            variant="standard"
            disableUnderline
            disabled={!canManage}
            sx={drawerSelectSx}
          >
            {(byField.dataClass || []).map((option) => (
              <MenuItem key={option.code} value={option.code} sx={drawerMenuItemSx}>{option.label}</MenuItem>
            ))}
          </Select>
        </PropertyRow>
        <PropertyRow label="Last DR test" sx={horizontalRowSx} labelSx={horizontalLabelSx} valueSx={compactValueSx}>
          <DateEUField label="" valueYmd={app.last_dr_test || ''} onChangeYmd={(value) => { void onPatch({ last_dr_test: value || null }); }} size="small" disabled={!canManage} hideLabel textFieldSx={drawerFieldValueSx} />
        </PropertyRow>
        <PropertyRow label="Contains PII" sx={horizontalRowSx} labelSx={horizontalLabelSx} valueSx={compactValueSx}>
          <Box component="label" sx={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>
            <input
              type="checkbox"
              checked={!!app.contains_pii}
              disabled={!canManage}
              onChange={(event) => { void onPatch({ contains_pii: event.target.checked }); }}
              style={{ accentColor: 'var(--kanap-teal)' }}
            />
          </Box>
        </PropertyRow>
        <PropertyRow label="Data residency" sx={horizontalRowSx} labelSx={horizontalLabelSx} valueSx={compactValueSx}>
          <Autocomplete
            multiple
            options={COUNTRY_OPTIONS}
            value={selectedCountries}
            onChange={(_, value) => {
              void (async () => {
                await api.post(`/applications/${app.id}/data-residency/bulk-replace`, { countries: value.map((item) => item.code) });
                await onRefresh();
              })();
            }}
            getOptionLabel={(option) => `${option.code} — ${option.name}`}
            disabled={!canManage}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                placeholder={selectedCountries.length === 0 ? 'Not set' : undefined}
                InputProps={{ ...params.InputProps, disableUnderline: true }}
                sx={drawerFieldValueSx}
              />
            )}
            ListboxProps={{ sx: drawerAutocompleteListboxSx }}
            sx={[drawerFieldValueSx, { width: '100%' }]}
          />
        </PropertyRow>
      </Stack>
      {/*
        TODO(NIS2): extend this tab with:
          - Risk register (collection of related Risks)
          - Audit log (last 5 audit events with date + actor + outcome)
          - Certifications (chips: ISO 27001, SOC 2, HDS, etc. with expiry date)
          - Exemption documentation (rich text + linked managed docs)
          - DPIA reference (link to managed doc)
          - Last NIS2 self-assessment date
        Keep the section structure flat — divider-separated sub-sections, no accordions.
      */}
    </Box>
  );
}

export default function ApplicationWorkspacePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasLevel } = useAuth();
  const { byField } = useItOpsEnumOptions();

  const routeId = String(params.id || '');
  const isCreate = routeId === 'new';
  const routeTab = React.useMemo<TabKey>(() => {
    const rawTab = params.tab as string | undefined;
    if (VALID_TABS.has(rawTab as TabKey)) return rawTab as TabKey;
    if (rawTab === 'instances' || rawTab === 'servers') return 'deployments';
    if (rawTab === 'technical') return 'operations';
    if (rawTab === 'business' || rawTab === 'knowledge') return 'relations';
    return 'overview';
  }, [params.tab]);
  const canManage = hasLevel('applications', 'member');
  const canDelete = hasLevel('applications', 'admin');
  const canCreateKnowledge = hasLevel('knowledge', 'member');
  const overviewEditorRef = React.useRef<IntegratedDocumentEditorHandle>(null);
  const createRef = React.useRef<ApplicationCreateEditorHandle>(null);
  const [versionDialogOpen, setVersionDialogOpen] = React.useState(false);
  const [savingCreate, setSavingCreate] = React.useState(false);
  const [createDirty, setCreateDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const listContextParams = React.useMemo(() => new URLSearchParams(searchParams), [searchParams]);
  const sort = searchParams.get('sort') || 'name:ASC';
  const q = searchParams.get('q') || '';
  const filters = searchParams.get('filters') || '';

  const appQuery = useAppData(routeId, !isCreate && !!routeId);
  const app = appQuery.data || null;
  const nav = useApplicationNav({ id: app?.id || routeId, sort, q, filters });

  const interfacesQuery = useQuery({
    queryKey: ['application-workspace-interfaces', app?.id],
    queryFn: async () => {
      const res = await api.get<{ items: InterfaceMiniRow[] }>(`/interfaces/by-application/${app?.id}`);
      return res.data.items || [];
    },
    enabled: !!app?.id,
  });

  const connections = React.useMemo(
    () => app ? computeConnections(app, interfacesQuery.data || []) : { type: 'none' } as ConnectionsResult,
    [app, interfacesQuery.data],
  );

  React.useEffect(() => {
    if (!app?.sequential_id || isCreate) return;
    const canonicalBase = `${app.sequential_id}-${slugify(app.name)}`;
    if (routeId === canonicalBase || routeId === app.sequential_id) return;
    const qs = searchParams.toString();
    navigate(`/it/applications/${canonicalBase}/${routeTab}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [app?.name, app?.sequential_id, isCreate, navigate, routeId, routeTab, searchParams]);

  const closeWorkspace = React.useCallback(() => {
    const qs = listContextParams.toString();
    navigate(`/it/applications${qs ? `?${qs}` : ''}`);
  }, [listContextParams, navigate]);

  const canonicalPathFor = React.useCallback((targetId: string, tab: TabKey = routeTab) => {
    const qs = listContextParams.toString();
    return `/it/applications/${targetId}/${tab}${qs ? `?${qs}` : ''}`;
  }, [listContextParams, routeTab]);

  const handleTabChange = React.useCallback((nextTab: string) => {
    const canonical = app?.sequential_id ? `${app.sequential_id}-${slugify(app.name)}` : routeId;
    navigate(canonicalPathFor(canonical, nextTab as TabKey));
  }, [app?.name, app?.sequential_id, canonicalPathFor, navigate, routeId]);

  const updateApplicationCache = React.useCallback((updater: (prev: ApplicationDetail) => ApplicationDetail) => {
    const keys = new Set<string>([routeId]);
    if (app?.id) keys.add(app.id);
    if (app?.sequential_id) {
      keys.add(app.sequential_id);
      keys.add(`${app.sequential_id}-${slugify(app.name)}`);
    }
    keys.forEach((key) => {
      queryClient.setQueryData<ApplicationDetail>(['application-workspace', key], (prev) => (prev ? updater(prev) : prev));
    });
  }, [app?.id, app?.name, app?.sequential_id, queryClient, routeId]);

  const patchApplication = React.useCallback(async (patch: Partial<ApplicationDetail>) => {
    if (!app) return;
    updateApplicationCache((prev) => ({ ...prev, ...patch }));
    try {
      const res = await api.patch<Partial<ApplicationDetail>>(`/applications/${app.id}`, patch);
      updateApplicationCache((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      const res = await api.get<ApplicationDetail>(`/applications/${app.id}`, { params: { include: 'deployments,support' } });
      updateApplicationCache(() => res.data);
      throw err;
    }
  }, [app, updateApplicationCache]);

  const handleCreate = React.useCallback(async () => {
    setSavingCreate(true);
    setError(null);
    try {
      const newId = await createRef.current?.save();
      if (newId) {
        navigate(`/it/applications/${newId}/overview${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create application');
    } finally {
      setSavingCreate(false);
    }
  }, [navigate, searchParams]);

  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    return list.map((option) => ({
      value: option.code,
      label: option.label,
      color: getDotColor(LIFECYCLE_COLORS[option.code] || 'default', theme.palette.mode),
    }));
  }, [byField.lifecycleStatus, theme.palette.mode]);

  const criticalityOptions = React.useMemo(() => [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'business_critical', label: 'Business critical' },
  ].map((option) => ({
    ...option,
    color: getDotColor(CRITICALITY_COLORS[option.value] || 'default', theme.palette.mode),
  })), [theme.palette.mode]);

  if (!isCreate && appQuery.isLoading && !app) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">Loading application...</Typography>
      </Box>
    );
  }

  if (!isCreate && (appQuery.error || !app)) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">Application not found.</Alert>
      </Box>
    );
  }

  const appReference = app?.sequential_id || null;
  const deployments = app?.deployments || app?.instances || [];
  const deploymentCount = deployments.length;
  const interfaceCount = interfacesQuery.data?.length || 0;
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'deployments', label: 'Deployments', badge: deploymentCount, disabled: isCreate },
    { key: 'interfaces', label: 'Interfaces', badge: interfaceCount, disabled: isCreate },
    { key: 'operations', label: 'Operations', disabled: isCreate },
    { key: 'compliance', label: 'Compliance', disabled: isCreate },
    { key: 'relations', label: 'Relations', disabled: isCreate },
  ];

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {!!error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{error}</Alert>}
      {!!appQuery.error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>Failed to load application.</Alert>}

      <PortfolioDetailWorkspaceShell
        activeTab={routeTab}
        tabs={tabs}
        onTabChange={handleTabChange}
        drawerStorageKey="kanap.applications.drawerOpen"
        backLabel="Applications"
        onBack={closeWorkspace}
        itemReference={appReference}
        onCopyReference={appReference ? () => { void navigator.clipboard?.writeText(appReference); } : undefined}
        title={isCreate ? '' : app?.name || ''}
        titleFallback={isCreate ? 'New application' : 'Untitled application'}
        canEditTitle={isCreate || canManage}
        onTitleSave={(value) => { void patchApplication({ name: value }); }}
        nav={!isCreate && nav.total > 0 ? {
          currentIndex: nav.index + 1,
          totalCount: nav.total,
          hasPrev: nav.hasPrev,
          hasNext: nav.hasNext,
          onPrev: () => { if (nav.prevId) navigate(canonicalPathFor(nav.prevId)); },
          onNext: () => { if (nav.nextId) navigate(canonicalPathFor(nav.nextId)); },
          previousLabel: 'Previous application',
          nextLabel: 'Next application',
        } : undefined}
        onSaveShortcut={() => { void overviewEditorRef.current?.save(); }}
        metadata={!isCreate && app ? (
          <>
            <PortfolioStatusMetadata
              value={app.lifecycle || 'active'}
              label={humanize(app.lifecycle)}
              color={getDotColor(LIFECYCLE_COLORS[app.lifecycle] || 'default', theme.palette.mode)}
              options={lifecycleOptions}
              onChange={(value) => { void patchApplication({ lifecycle: value }); }}
              disabled={!canManage}
            />
            <PortfolioStatusMetadata
              value={app.criticality || 'medium'}
              label={humanize(app.criticality)}
              color={getDotColor(CRITICALITY_COLORS[app.criticality] || 'default', theme.palette.mode)}
              options={criticalityOptions}
              onChange={(value) => { void patchApplication({ criticality: value }); }}
              disabled={!canManage}
            />
            {app.version && (
              <PortfolioMetadataItem mono onClick={() => { void navigator.clipboard?.writeText(app.version || ''); }}>
                v{app.version}
              </PortfolioMetadataItem>
            )}
            <PortfolioMetadataItem label="Go live">
              {formatShortDate(app.go_live_date)}
            </PortfolioMetadataItem>
          </>
        ) : undefined}
        actions={(
          <>
            {!isCreate && (
              <Button variant="action" onClick={() => setVersionDialogOpen(true)} size="small">
                Create new version
              </Button>
            )}
            {isCreate && (
              <Button variant="contained" onClick={() => void handleCreate()} disabled={!createDirty || savingCreate} size="small">
                Create
              </Button>
            )}
            {!isCreate && canDelete && (
              <Button variant="action-danger" startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />} size="small">
                Delete
              </Button>
            )}
            <IconButton aria-label="Close" title="Close" onClick={closeWorkspace} size="small">
              <CloseIcon />
            </IconButton>
          </>
        )}
        properties={app ? (
          <ApplicationProperties
            app={app}
            canManage={canManage}
            onPatch={(patch) => { void patchApplication(patch); }}
            onLocalUpdate={updateApplicationCache}
          />
        ) : <Box />}
      >
        {appQuery.isFetching && !isCreate && <LinearProgress sx={{ mb: 2 }} />}

        {isCreate && routeTab === 'overview' && (
          <ApplicationCreateEditor ref={createRef} onDirtyChange={setCreateDirty} />
        )}

        {!isCreate && app && routeTab === 'overview' && (
          <OverviewTab
            app={app}
            canEditManagedDocs={canManage}
            canCreateKnowledge={canCreateKnowledge}
            editorRef={overviewEditorRef}
            connections={connections}
            onOpenApplication={(appId) => navigate(canonicalPathFor(appId, 'overview'))}
            onShowInterfaces={() => handleTabChange('interfaces')}
          />
        )}

        {!isCreate && app && routeTab === 'deployments' && (
          <DeploymentsEditor applicationId={app.id} deployments={deployments as any} onRefresh={async () => { await appQuery.refetch(); }} readOnly={!canManage} />
        )}

        {!isCreate && app && routeTab === 'interfaces' && (
          <InterfacesTab
            app={app}
            rows={interfacesQuery.data || []}
            loading={interfacesQuery.isLoading}
            onOpenInterface={(id) => navigate(`/it/interfaces/${id}/specification`)}
            onOpenApplication={(id) => navigate(canonicalPathFor(id, 'overview'))}
          />
        )}

        {!isCreate && app && routeTab === 'operations' && (
          <OperationsTab
            app={app}
            canManage={canManage}
            onPatch={patchApplication}
            onRefresh={async () => { await appQuery.refetch(); }}
          />
        )}

        {!isCreate && app && routeTab === 'compliance' && (
          <ComplianceTab
            app={app}
            canManage={canManage}
            onPatch={patchApplication}
            onRefresh={async () => { await appQuery.refetch(); }}
          />
        )}

        {!isCreate && app && routeTab === 'relations' && (
          <ApplicationRelationsPanel id={app.id} isSuite={!!app.is_suite} />
        )}
      </PortfolioDetailWorkspaceShell>

      {app && (
        <CreateVersionDialog
          open={versionDialogOpen}
          onClose={() => setVersionDialogOpen(false)}
          sourceApp={{ id: app.id, name: app.name, version: app.version }}
          onSuccess={(newApp) => {
            setVersionDialogOpen(false);
            navigate(`/it/applications/${newApp.id}/overview`);
          }}
        />
      )}
    </Box>
  );
}
