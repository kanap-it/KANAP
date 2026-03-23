import React from 'react';
import { Box, Tabs, Tab, Stack, Typography, Divider, Button, TextField, Checkbox, FormControlLabel, Alert, IconButton, Autocomplete, Table, TableBody, TableCell, TableHead, TableRow, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApplicationNav } from '../../hooks/useApplicationNav';
import api from '../../api';
import SupplierSelect from '../../components/fields/SupplierSelect';
import EnumAutocomplete from '../../components/fields/EnumAutocomplete';
import DateEUField from '../../components/fields/DateEUField';
import UserSelect from '../../components/fields/UserSelect';
import CompanySelect from '../../components/fields/CompanySelect';
import DepartmentSelect from '../../components/fields/DepartmentSelect';
import AddIcon from '@mui/icons-material/Add';
import InstancesEditor from './components/InstancesEditor';
import ServerAssignmentsEditor from './components/ServerAssignmentsEditor';
import VersionTimeline from './components/VersionTimeline';
import CreateVersionDialog from './components/CreateVersionDialog';
import useItOpsEnumOptions from '../../hooks/useItOpsEnumOptions';
import ContactSelect from '../../components/fields/ContactSelect';
import EntityKnowledgePanel from '../../components/EntityKnowledgePanel';
import { useAuth } from '../../auth/AuthContext';

type TabKey = 'overview' | 'instances' | 'servers' | 'interfaces' | 'ownership' | 'technical' | 'relations' | 'compliance' | 'knowledge';
type ApplicationRelationsHandle = { save: () => Promise<void>; reset: () => void };
type ApplicationComplianceHandle = { save: () => Promise<void>; reset: () => void };
import { COUNTRY_OPTIONS, CountryOption } from '../../constants/isoOptions';
import ApplicationRelationsPanel, { ApplicationRelationsPanelHandle } from './editors/ApplicationRelationsPanel';
import ApplicationCreateEditor, { ApplicationCreateEditorHandle } from './editors/ApplicationCreateEditor';

import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
type SupportContactRow = {
  id?: string;
  contact_id: string | null;
  role: string;
  contact?: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null; mobile?: string | null } | null;
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
  via_middleware: boolean;
};

const ENV_ORDER = ['prod', 'pre_prod', 'qa', 'test', 'dev', 'sandbox'] as const;

// Stable id helper for client-side-only rows/entries
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function useAppData(id: string, enabled: boolean) {
  const [data, setData] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const load = React.useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/applications/${id}`, { params: { include: 'instances,support' } });
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load application');
      setData(null);
    } finally { setLoading(false); }
  }, [id, enabled]);
  React.useEffect(() => { void load(); }, [load]);
  return { data, setData, error, loading, reload: load };
}

function OwnersAudienceEditor({ data, update, markDirty }: { data: any; update: (patch: any) => void; markDirty: () => void }) {
  const { t } = useTranslation(['it', 'common']);
  const [rows, setRows] = React.useState<Array<{ __id: string; company_id: string | null; department_id: string | null }>>([{ __id: uid(), company_id: null, department_id: null }]);
  const rowsEditedRef = React.useRef(false);

  const owners = (data?.owners || []) as Array<{ id?: string; __tid?: string; user_id: string; owner_type: 'business' | 'it' }>;
  const companies = (data?.companies || []) as Array<{ company_id: string }>;
  const departments = (data?.departments || []) as Array<{ department_id: string }>;

  const bizOwners = owners.map((o, i) => ({ ...o, __idx: i })).filter((o) => o.owner_type === 'business');
  const itOwners = owners.map((o, i) => ({ ...o, __idx: i })).filter((o) => o.owner_type === 'it');

  const [userById, setUserById] = React.useState<Record<string, any>>({});
  const [deptById, setDeptById] = React.useState<Record<string, any>>({});
  React.useEffect(() => {
    const ids = Array.from(new Set(owners.map((o) => o.user_id).filter(Boolean)));
    const missing = ids.filter((id) => !userById[id]); if (missing.length === 0) return;
    (async () => {
      const entries = await Promise.all(missing.map(async (id) => { try { const res = await api.get(`/users/${id}`); return [id, res.data]; } catch { return [id, null]; } }));
      setUserById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [owners, userById]);
  React.useEffect(() => {
    const ids = Array.from(new Set(departments.map((d) => d.department_id).filter(Boolean)));
    const missing = ids.filter((id) => !deptById[id]); if (missing.length === 0) return;
    (async () => {
      const entries = await Promise.all(missing.map(async (id) => { try { const res = await api.get(`/departments/${id}`); return [id, res.data]; } catch { return [id, null]; } }));
      setDeptById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [departments, deptById]);

  React.useEffect(() => {
    if (rowsEditedRef.current) return;
    const next: Array<{ __id: string; company_id: string | null; department_id: string | null }> = [];
    for (const c of companies) next.push({ __id: uid(), company_id: c.company_id, department_id: null });
    for (const d of departments) next.push({ __id: uid(), company_id: deptById[d.department_id]?.company_id || null, department_id: d.department_id });
    setRows(next.length > 0 ? next : [{ __id: uid(), company_id: null, department_id: null }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(companies), JSON.stringify(departments), JSON.stringify(deptById)]);

  const syncFromRows = React.useCallback((nextRows: Array<{ __id: string; company_id: string | null; department_id: string | null }>) => {
    const compArr: Array<{ company_id: string }> = [];
    const deptArr: Array<{ department_id: string }> = [];
    const compSeen = new Set<string>();
    const deptSeen = new Set<string>();
    for (const r of nextRows) {
      if (r.department_id) { if (!deptSeen.has(r.department_id)) { deptSeen.add(r.department_id); deptArr.push({ department_id: r.department_id }); } }
      else if (r.company_id) { if (!compSeen.has(r.company_id)) { compSeen.add(r.company_id); compArr.push({ company_id: r.company_id }); } }
    }
    rowsEditedRef.current = true;
    update({ companies: compArr, departments: deptArr });
  }, [update]);

  const addRow = () => { rowsEditedRef.current = true; markDirty(); setRows((prev) => [...prev, { __id: uid(), company_id: null, department_id: null }]); };
  const removeRow = (idx: number) => setRows((prev) => { const next = prev.filter((_, i) => i !== idx); const normalized = next.length > 0 ? next : [{ __id: uid(), company_id: null, department_id: null }]; syncFromRows(normalized); return normalized; });
  const setRowCompany = (idx: number, companyId: string | null) => setRows((prev) => { const next = prev.map((r, i) => (i === idx ? { ...r, company_id: companyId, department_id: null } : r)); syncFromRows(next); return next; });
  const setRowDepartment = (idx: number, departmentId: string | null) => setRows((prev) => { const next = prev.map((r, i) => (i === idx ? { ...r, department_id: departmentId } : r)); syncFromRows(next); return next; });

  const mode = data?.users_mode === 'manual' ? 'manual' : 'derived';
  const year = new Date().getFullYear();
  const [companyMetricCache, setCompanyMetricCache] = React.useState<Record<string, { users: number; fallback: boolean }>>({});
  const [deptMetricCache, setDeptMetricCache] = React.useState<Record<string, { users: number; fallback: boolean }>>({});
  React.useEffect(() => {
    const companiesToFetch = Array.from(new Set(rows.filter(r => r.company_id && !r.department_id).map(r => r.company_id as string).filter((id) => !(id in companyMetricCache))));
    const deptsToFetch = Array.from(new Set(rows.filter(r => r.department_id).map(r => r.department_id as string).filter((id) => !(id in deptMetricCache))));
    (async () => {
      if (companiesToFetch.length > 0) {
        const entries = await Promise.all(companiesToFetch.map(async (cid) => {
          try { const res = await api.get(`/company-metrics/${cid}`, { params: { year } }); const m = res.data || null; const iu = m?.it_users != null ? Number(m.it_users) : null; const hc = m?.headcount != null ? Number(m.headcount) : 0; return [cid, { users: iu != null ? iu : hc, fallback: iu == null }]; } catch { return [cid, { users: 0, fallback: true }]; }
        }));
        setCompanyMetricCache((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
      if (deptsToFetch.length > 0) {
        const entries = await Promise.all(deptsToFetch.map(async (did) => {
          try { const res = await api.get(`/department-metrics/${did}`, { params: { year } }); const m = res.data || null; const hc = m?.headcount != null ? Number(m.headcount) : 0; return [did, { users: hc, fallback: true }]; } catch { return [did, { users: 0, fallback: true }]; }
        }));
        setDeptMetricCache((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rows), year]);

  const rowUsers = (row: { company_id: string | null; department_id: string | null }) => {
    if (row.department_id) { const meta = deptMetricCache[row.department_id]; return { users: meta?.users ?? null, fallback: true }; }
    if (row.company_id) { const meta = companyMetricCache[row.company_id]; return { users: meta?.users ?? null, fallback: meta?.fallback ?? false }; }
    return { users: null, fallback: true };
  };
  const derivedTotal = rows.reduce((sum, r) => { const u = rowUsers(r).users; return sum + (u != null ? Number(u) : 0); }, 0);

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">Business Owners</Typography>
        <Stack spacing={1}>
          {(bizOwners.length > 0 ? bizOwners : ([{ user_id: '' as any, owner_type: 'business' as const, __idx: -1 }] as any)).map((o: any, idx: number) => {
            const u = o.user_id ? userById[o.user_id] : null;
            return (
              <Box key={`biz-row-${o.id || o.__tid || o.__idx || idx}`} sx={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 1.6fr auto', gap: 1, alignItems: 'center' }}>
                <UserSelect label="User" value={o.user_id || null} onChange={(v) => {
                  if (!v) return;
                  const exists = owners.some((x, i) => x.owner_type === 'business' && x.user_id === v && i !== (o.__idx ?? -2));
                  if (exists) return;
                  if ((o.__idx ?? -1) >= 0) { const next = owners.map((x, i) => (i === o.__idx ? { ...x, user_id: v } : x)); update({ owners: next }); }
                  else { update({ owners: [...owners, { owner_type: 'business' as const, user_id: v, __tid: uid() }] }); }
                }} />
                <TextField label="Last Name" value={u?.last_name || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <TextField label="First Name" value={u?.first_name || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <TextField label="Job Title" value={u?.job_title || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                {(o.__idx ?? -1) >= 0 ? (<IconButton aria-label={t('common.remove')} onClick={() => update({ owners: owners.filter((_, i) => i !== o.__idx) })} size="small"><DeleteIcon fontSize="small" /></IconButton>) : <span />}
              </Box>
            );
          })}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button startIcon={<AddIcon />} onClick={() => update({ owners: [...owners, { user_id: '' as any, owner_type: 'business' as const, __tid: uid() }] })} size="small">Add row</Button>
          </Box>
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">IT Owners</Typography>
        <Stack spacing={1}>
          {(itOwners.length > 0 ? itOwners : ([{ user_id: '' as any, owner_type: 'it' as const, __idx: -1 }] as any)).map((o: any, idx: number) => {
            const u = o.user_id ? userById[o.user_id] : null;
            return (
              <Box key={`it-row-${o.id || o.__tid || o.__idx || idx}`} sx={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 1.6fr auto', gap: 1, alignItems: 'center' }}>
                <UserSelect label="User" value={o.user_id || null} onChange={(v) => {
                  if (!v) return;
                  const exists = owners.some((x, i) => x.owner_type === 'it' && x.user_id === v && i !== (o.__idx ?? -2));
                  if (exists) return;
                  if ((o.__idx ?? -1) >= 0) { const next = owners.map((x, i) => (i === o.__idx ? { ...x, user_id: v } : x)); update({ owners: next }); }
                  else { update({ owners: [...owners, { owner_type: 'it' as const, user_id: v, __tid: uid() }] }); }
                }} />
                <TextField label="Last Name" value={u?.last_name || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <TextField label="First Name" value={u?.first_name || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <TextField label="Job Title" value={u?.job_title || ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                {(o.__idx ?? -1) >= 0 ? (<IconButton aria-label={t('common.remove')} onClick={() => update({ owners: owners.filter((_, i) => i !== o.__idx) })} size="small"><DeleteIcon fontSize="small" /></IconButton>) : <span />}
              </Box>
            );
          })}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button startIcon={<AddIcon />} onClick={() => update({ owners: [...owners, { user_id: '' as any, owner_type: 'it' as const, __tid: uid() }] })} size="small">Add row</Button>
          </Box>
        </Stack>
      </Stack>

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Audience</Typography>
        <Typography variant="body2" color="text.secondary">Select company and optionally a department (leave empty to select the full company).</Typography>
        <Stack spacing={1}>
          {rows.map((r, idx) => {
            const meta = rowUsers(r);
            const usersText = meta.users != null ? String(meta.users) : '';
            const warn = meta.fallback;
            const deptCompanyId = r.company_id || (r.department_id ? (deptById[r.department_id!]?.company_id || null) : null);
            return (
              <Box key={r.__id} sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1.3fr 0.9fr auto', gap: 1, alignItems: 'center' }}>
                <CompanySelect value={r.company_id} onChange={(v) => setRowCompany(idx, v)} size="small" />
                <DepartmentSelect companyId={deptCompanyId || undefined} value={r.department_id} onChange={(v) => setRowDepartment(idx, v)} size="small" />
                <TextField label="Users" value={usersText ? `${usersText} ${warn ? '(headcount)' : '(IT users)'}` : ''} size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                <IconButton aria-label={t('common.remove')} onClick={() => removeRow(idx)} size="small"><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            );
          })}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button startIcon={<AddIcon />} onClick={addRow} size="small">Add row</Button>
          </Box>
        </Stack>
      </Stack>

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Number of users</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <EnumAutocomplete label="Calculation method" value={mode} onChange={(v) => update({ users_mode: v === 'manual' ? 'manual' : 'it_users', users_year: year })} options={[{ label: 'Derived', value: 'derived' }, { label: 'Manual', value: 'manual' }]} />
          {mode === 'manual' ? (
            <TextField type="number" label="Manual users" value={data?.users_override ?? ''} onChange={(e) => update({ users_override: e.target.value === '' ? null : parseInt(e.target.value, 10) })} />
          ) : (
            <Typography variant="body2">Derived users: <strong>{derivedTotal}</strong> <Typography component="span" variant="caption" color="text.secondary">(based on Audience)</Typography></Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

export default function ApplicationWorkspacePage() {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const id = idParam;
  const tab = (params.tab as TabKey) || 'overview';

  // Navigation for prev/next
  const sort = searchParams.get('sort') || 'name:ASC';
  const q = searchParams.get('q') || '';
  const filters = searchParams.get('filters') || '';
  const ownerUserId = searchParams.get('ownerUserId') || undefined;
  const ownerTeamId = searchParams.get('ownerTeamId') || undefined;
  const navExtraParams = React.useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (ownerUserId) params.ownerUserId = ownerUserId;
    if (ownerTeamId) params.ownerTeamId = ownerTeamId;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [ownerUserId, ownerTeamId]);
  const nav = useApplicationNav({ id, sort, q, filters, extraParams: navExtraParams });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null as any, nextId: null as any }
    : nav;

  const { data, setData, error, reload } = useAppData(id, !isCreate);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const dataRef = React.useRef<any>(null);
  React.useEffect(() => { dataRef.current = data; }, [data]);
  const [dirty, setDirty] = React.useState(false);
  const [hasParentSuite, setHasParentSuite] = React.useState<boolean>(false);
  const [interfacesByEnv, setInterfacesByEnv] = React.useState<Record<string, InterfaceMiniRow[]>>({});
  const [interfacesLoading, setInterfacesLoading] = React.useState<boolean>(false);
  const [interfacesError, setInterfacesError] = React.useState<string | null>(null);
  // Suites selection (parent suites)
  const [suites, setSuites] = React.useState<Array<{ id: string; name: string }>>([]);
  const [baselineSuites, setBaselineSuites] = React.useState<Array<{ id: string; name: string }>>([]);
  const canCreateKnowledge = hasLevel('knowledge', 'member');
  const [suiteOptions, setSuiteOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  // Support contacts
  const [supportContacts, setSupportContacts] = React.useState<SupportContactRow[]>([]);
  const [supportBaseline, setSupportBaseline] = React.useState<SupportContactRow[]>([]);
  // Version management
  const [versionDialogOpen, setVersionDialogOpen] = React.useState(false);
  const [lineage, setLineage] = React.useState<{
    predecessors: Array<{ id: string; name: string; version?: string | null; lifecycle?: string }>;
    current: { id: string; name: string; version?: string | null; lifecycle?: string };
    successors: Array<{ id: string; name: string; version?: string | null; lifecycle?: string }>;
  } | null>(null);
  const relationsRef = React.useRef<ApplicationRelationsPanelHandle>(null);
  const complianceRef = React.useRef<ApplicationComplianceHandle>(null);
  const createRef = React.useRef<ApplicationCreateEditorHandle>(null);
  const update = React.useCallback((patch: any) => {
    setDirty(true);
    // Update ref synchronously to avoid stale reads on immediate save
    const base = dataRef.current ?? null;
    const next = { ...(base || {}), ...patch };
    dataRef.current = next;
    setData((d: any) => ({ ...(d || {}), ...patch }));
  }, [setData]);
  const { byField } = useItOpsEnumOptions();
  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    const current = data?.lifecycle;
    const opts = list.map((item) => ({
      value: item.code,
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
      deprecated: !!item.deprecated,
    }));
    if (current && !opts.some((opt) => opt.value === current)) {
      opts.push({ value: current, label: current, deprecated: false });
    }
    return opts.filter((opt) => !opt.deprecated || opt.value === current);
  }, [byField.lifecycleStatus, data?.lifecycle]);

  // Clear dirty when transitioning from 'new' to a persisted id
  const prevIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const prev = prevIdRef.current;
    prevIdRef.current = id;
    if (prev === 'new' && id !== 'new') {
      setDirty(false);
    }
  }, [id]);

  // Load whether this app has any parent suites to control the Overview toggle availability
  const loadSuites = React.useCallback(async () => {
    if (isCreate) return;
    try {
      const res = await api.get(`/applications/${id}/suites`);
      const items = (res.data?.items || []) as Array<{ id: string; name: string }>;
      setSuites(items);
      setBaselineSuites(items);
      setHasParentSuite((items?.length || 0) > 0);
    } catch {
      setSuites([]);
      setBaselineSuites([]);
      setHasParentSuite(false);
    }
  }, [id, isCreate]);
  React.useEffect(() => { void loadSuites(); }, [loadSuites]);

  // Load version lineage
  React.useEffect(() => {
    if (isCreate || !id) {
      setLineage(null);
      return;
    }
    api.get(`/applications/${id}/version-lineage`)
      .then(res => setLineage(res.data))
      .catch(() => setLineage(null));
  }, [id, isCreate]);

  // Load Interfaces tab data (grouped per environment)
  React.useEffect(() => {
    let cancelled = false;
    if (isCreate || tab !== 'interfaces') {
      return () => { cancelled = true; };
    }
    const fetchInterfaces = async () => {
      setInterfacesLoading(true);
      setInterfacesError(null);
      try {
        const res = await api.get<{ items: InterfaceMiniRow[] }>(`/interfaces/by-application/${id}`);
        if (cancelled) return;
        const grouped: Record<string, InterfaceMiniRow[]> = {};
        (res.data?.items || []).forEach((item) => {
          const env = (item.environment || '').toLowerCase() || 'prod';
          const row = { ...item, environment: env };
          grouped[env] = grouped[env] ? [...grouped[env], row] : [row];
        });
        const sortRank = (row: InterfaceMiniRow) => {
          if (row.source_application_id === id) return 0;
          if (row.target_application_id === id) return 1;
          return 2;
        };
        const sortedGrouped = Object.fromEntries(
          Object.entries(grouped).map(([env, rows]) => {
            const sorted = rows.slice().sort((a, b) => {
              const ra = sortRank(a);
              const rb = sortRank(b);
              if (ra !== rb) return ra - rb;
              const sa = (a.source_application_name || a.source_application_id || '').toLowerCase();
              const sb = (b.source_application_name || b.source_application_id || '').toLowerCase();
              if (sa !== sb) return sa.localeCompare(sb);
              const ta = (a.target_application_name || a.target_application_id || '').toLowerCase();
              const tb = (b.target_application_name || b.target_application_id || '').toLowerCase();
              if (ta !== tb) return ta.localeCompare(tb);
              return (a.name || '').localeCompare(b.name || '');
            });
            return [env, sorted];
          }),
        );
        setInterfacesByEnv(sortedGrouped);
      } catch (e: any) {
        if (cancelled) return;
        setInterfacesError(getApiErrorMessage(e, t, t('messages.loadInterfacesFailed')));
        setInterfacesByEnv({});
      } finally {
        if (!cancelled) setInterfacesLoading(false);
      }
    };
    void fetchInterfaces();
    return () => { cancelled = true; };
  }, [id, isCreate, tab]);

  // Sync support contacts from API payload
  React.useEffect(() => {
    if (!data || isCreate) return;
    const items = ((data as any).support_contacts || []) as any[];
    const mapped: SupportContactRow[] = items.map((row) => ({
      id: row.id,
      contact_id: row.contact_id || null,
      role: row.role || '',
      contact: row.contact || null,
    }));
    setSupportContacts(mapped.length > 0 ? mapped : [{ contact_id: null, role: '', contact: null }]);
    setSupportBaseline(mapped);
  }, [isCreate, JSON.stringify(data?.support_contacts)]);

  const normalizeSupport = React.useCallback((rows: SupportContactRow[]) => rows.map((r) => ({ contact_id: r.contact_id, role: (r.role || '').trim() })), []);

  const addSupportRow = () => { setDirty(true); setSupportContacts((rows) => [...rows, { contact_id: null, role: '', contact: null }]); };
  const removeSupportRow = (idx: number) => {
    setDirty(true);
    setSupportContacts((rows) => {
      const next = rows.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [{ contact_id: null, role: '', contact: null }];
    });
  };
  const setSupportRowContact = async (idx: number, contactId: string | null) => {
    setDirty(true);
    setSupportContacts((rows) => {
      if (rows.length === 0) return [{ contact_id: contactId, role: '', contact: null }];
      return rows.map((row, i) => (i === idx ? { ...row, contact_id: contactId, contact: contactId ? row.contact : null } : row));
    });
    if (contactId) {
      try {
        const res = await api.get(`/contacts/${contactId}`);
        const details = res.data;
        setSupportContacts((rows) => rows.map((row, i) => (i === idx ? { ...row, contact: details } : row)));
      } catch { /* ignore */ }
    }
  };
  const setSupportRowRole = (idx: number, role: string) => { setDirty(true); setSupportContacts((rows) => rows.map((row, i) => (i === idx ? { ...row, role } : row))); };

  // Preload suite options (applications that are suites, excluding self)
  React.useEffect(() => {
    let alive = true;
    if (isCreate) { setSuiteOptions([]); return () => { alive = false; }; }
    (async () => {
      try {
        const options: Array<{ id: string; name: string }> = [];
        const filters = JSON.stringify({ is_suite: { type: 'equals', filter: true } });
        let page = 1; const limit = 100; let total = Infinity;
        while ((page - 1) * limit < total) {
          const res = await api.get('/applications', { params: { page, limit, sort: 'name:ASC', filters } });
          const items = (res.data?.items || []) as Array<{ id: string; name: string }>;
          total = Number(res.data?.total || items.length);
          for (const a of items) { if (a.id !== id) options.push({ id: a.id, name: (a as any).name }); }
          if (items.length < limit) break;
          page += 1;
        }
        if (!alive) return;
        setSuiteOptions(options);
      } catch {
        if (!alive) return;
        setSuiteOptions([]);
      }
    })();
    return () => { alive = false; };
  }, [id, isCreate]);

  const handleSave = async () => {
    setSaveError(null);
    // Read the freshest values from the ref to avoid race conditions when clicking save immediately after typing
    const current = (dataRef.current || data || {}) as any;
    if (isCreate) {
      const newId = await createRef.current?.save();
      // Reset dirty to avoid a second-save impression after navigation
      setDirty(false);
      if (newId) {
        const qs = searchParams.toString();
        navigate(`/it/applications/${newId}/overview${qs ? `?${qs}` : ''}`);
      }
      return;
    }
    // Save overview + technical + compliance simple fields at once
    const body: any = {
      name: current?.name,
      supplier_id: current?.supplier_id ?? null,
      description: current?.description ?? null,
      editor: current?.editor ?? null,
      category: current?.category || 'line_of_business',
      retired_date: current?.retired_date || null,
      version: current?.version || null,
      end_of_support_date: current?.end_of_support_date || null,
      go_live_date: current?.go_live_date || null,
      lifecycle: current?.lifecycle,
      criticality: current?.criticality,
      external_facing: !!current?.external_facing,
      is_suite: !!current?.is_suite,
      last_dr_test: current?.last_dr_test || null,
      etl_enabled: !!current?.etl_enabled,
      contains_pii: !!current?.contains_pii,
      data_class: current?.data_class,
      licensing: current?.licensing ?? null,
      notes: current?.notes ?? null,
      support_notes: current?.support_notes ?? null,
      access_methods: current?.access_methods || [],
      users_mode: current?.users_mode,
      users_year: current?.users_year,
      users_override: current?.users_override ?? null,
    };
    await api.patch(`/applications/${id}`, body);
    // Save suites (parent membership)
    try {
      await api.post(`/applications/${id}/suites/bulk-replace`, { suite_ids: suites.map((s) => s.id) });
      setBaselineSuites(suites);
      setHasParentSuite((suites?.length || 0) > 0);
    } catch (e: any) {
      const msg = getApiErrorMessage(e, t, t('messages.saveSuitesFailed'));
      setSaveError(msg);
      throw e;
    }
    // Save support contacts + notes
    try {
      const payload = normalizeSupport(supportContacts).filter((r) => r.contact_id);
      await api.post(`/applications/${id}/support-contacts/bulk-replace`, { contacts: payload });
      setSupportBaseline(supportContacts);
    } catch (e: any) {
      const msg = getApiErrorMessage(e, t, t('messages.saveSupportContactsFailed'));
      setSaveError(msg);
      throw e;
    }
    // Save Relations (linked OPEX/CAPEX/Contracts and URLs) if the panel is mounted
    try { await relationsRef.current?.save(); } catch { /* child handles error */ }
    // Refresh parent-suite info in case it changed
    try { await loadSuites(); } catch {}
    // Save Compliance residency via panel
    try { await complianceRef.current?.save(); } catch { /* child handles error */ }
    // Persist owners and audience in the same Save action
    try {
      const ownersRaw = (data?.owners || []) as Array<{ user_id: any; owner_type: 'business' | 'it' }>;
      const seen = new Set<string>();
      const ownersPayload = ownersRaw
        .filter((o) => typeof o.user_id === 'string' && o.user_id.trim() !== '')
        .filter((o) => {
          const k = `${o.owner_type}:${o.user_id}`;
          if (seen.has(k)) return false; seen.add(k); return true;
        })
        .map((o) => ({ user_id: o.user_id, owner_type: o.owner_type }));
      const companies = (data?.companies || []) as Array<{ company_id: string }>;
      const departments = (data?.departments || []) as Array<{ department_id: string }>;
      await Promise.all([
        api.post(`/applications/${id}/owners/bulk-replace`, { owners: ownersPayload }),
        api.post(`/applications/${id}/companies/bulk-replace`, { company_ids: companies.map((c) => c.company_id) }),
        api.post(`/applications/${id}/departments/bulk-replace`, { department_ids: departments.map((d) => d.department_id) }),
      ]);
    } catch {}
    setDirty(false);
    await reload();
  };

  const handleReset = () => {
    relationsRef.current?.reset();
    complianceRef.current?.reset();
    setSuites(baselineSuites);
    setSupportContacts(supportBaseline.length > 0 ? supportBaseline : [{ contact_id: null, role: '', contact: null }]);
    void reload();
    void loadSuites();
    setDirty(false);
  };

  const confirmAndNavigate = React.useCallback(async (targetId: string | null) => {
    if (!targetId) return;
    if (dirty) {
      const proceed = window.confirm(t('confirmations.unsavedSaveBeforeNav'));
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        handleReset();
      }
    }
    const qs = searchParams.toString();
    navigate(`/it/applications/${targetId}/${tab}${qs ? `?${qs}` : ''}`);
  }, [dirty, handleSave, handleReset, searchParams, navigate, tab]);

  // Note: OwnersAudienceEditor is hoisted at module scope to keep its state stable

  const ComplianceEditor = React.forwardRef<ApplicationComplianceHandle, { onDirtyChange?: (dirty: boolean) => void }>((props, ref) => {
    const { onDirtyChange } = props;
    const { byField } = useItOpsEnumOptions();
    const residency = (data?.data_residency || []) as Array<{ id?: string; country_iso: string }>;
    const [baselineCodes, setBaselineCodes] = React.useState<string[]>(() => (residency || []).map((r) => (r.country_iso || '').toUpperCase()));
    const currentCodes = React.useMemo(() => (residency || []).map((r) => (r.country_iso || '').toUpperCase()), [residency]);
    const dirtyLocal = React.useMemo(() => JSON.stringify(currentCodes) !== JSON.stringify(baselineCodes), [currentCodes, baselineCodes]);
    React.useEffect(() => { onDirtyChange?.(dirtyLocal); }, [dirtyLocal, onDirtyChange]);

    const save = React.useCallback(async () => {
      if (isCreate) return;
      const codes = (data?.data_residency || []).map((r: any) => (r.country_iso || '').toUpperCase());
      await api.post(`/applications/${id}/data-residency/bulk-replace`, { countries: codes });
      setBaselineCodes(codes);
      await reload();
    }, [data?.data_residency, id, isCreate, reload]);

    React.useImperativeHandle(ref, () => ({ save, reset: () => { setBaselineCodes((data?.data_residency || []).map((r: any) => (r.country_iso || '').toUpperCase())); } }), [save, data?.data_residency]);

    // Keep baseline in sync when server data changes
    React.useEffect(() => {
      setBaselineCodes((data?.data_residency || []).map((r: any) => (r.country_iso || '').toUpperCase()));
    }, [JSON.stringify(data?.data_residency)]);

    const valueOptions: CountryOption[] = React.useMemo(() => {
      const set = new Set(currentCodes);
      return COUNTRY_OPTIONS.filter((o) => set.has(o.code));
    }, [currentCodes]);

    const dataClassOptions = React.useMemo(() => {
      const list = byField.dataClass || [];
      const base = list.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }));
      const current = (data?.data_class || 'internal') as string;
      const hasCurrent = list.some((o) => o.code === current);
      if (!hasCurrent && current) {
        return [...base, { label: current, value: current }];
      }
      return base;
    }, [byField.dataClass, data?.data_class]);

    return (
      <Stack spacing={2}>
        <EnumAutocomplete
          label="Data Class"
          value={data?.data_class || 'internal'}
          onChange={(v) => update({ data_class: v })}
          options={dataClassOptions as any}
        />
        <DateEUField label="Last DR Test" valueYmd={data?.last_dr_test || ''} onChangeYmd={(v) => update({ last_dr_test: v })} />
        <FormControlLabel control={<Checkbox checked={!!data?.contains_pii} onChange={(e) => update({ contains_pii: e.target.checked })} />} label="Contains PII" />
        <Autocomplete<CountryOption, true, false, false>
          multiple
          options={COUNTRY_OPTIONS}
          value={valueOptions}
          onChange={(_: any, v: CountryOption[]) => {
            const codes = v.map((o) => o.code);
            update({ data_residency: codes.map((c) => ({ country_iso: c })) });
          }}
          getOptionLabel={(o: CountryOption) => `${o.code} — ${o.name}`}
          isOptionEqualToValue={(opt: CountryOption, val: CountryOption) => opt.code === val.code}
          renderInput={(params: any) => (
            <TextField {...params} label="Data Residency (countries)" placeholder="Add countries" />
          )}
          fullWidth
        />
      </Stack>
    );
  });

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6">{isCreate ? 'New App / Service' : (data?.name || 'App / Service')}</Typography>
            {!isCreate && total > 0 && (
              <Typography variant="body2" color="text.secondary">
                ({index + 1} of {total})
              </Typography>
            )}
          </Stack>
          {!isCreate && data?.category && (
            <Typography variant="body2" color="text.secondary">
              {byField.applicationCategory.find((c) => c.code === data?.category)?.label || data?.category}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            aria-label={t('common.previous')}
            title={t('common.previous')}
            onClick={() => confirmAndNavigate(prevId)}
            disabled={!hasPrev}
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <IconButton
            aria-label={t('common.next')}
            title={t('common.next')}
            onClick={() => confirmAndNavigate(nextId)}
            disabled={!hasNext}
            size="small"
          >
            <ArrowForwardIcon />
          </IconButton>
          <Button onClick={handleReset} disabled={!dirty}>{t('common:buttons.reset')}</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={!dirty}>{t('common:buttons.save')}</Button>
          {!isCreate && (
            <Button
              variant="outlined"
              onClick={() => setVersionDialogOpen(true)}
              disabled={dirty}
              title={dirty ? 'Save changes before creating a new version' : undefined}
            >
              Create New Version
            </Button>
          )}
          <IconButton onClick={async () => {
            if (dirty) {
              const save = window.confirm(t('confirmations.unsavedSave'));
              if (save) { try { await handleSave(); } catch {} }
            }
            const qs = searchParams.toString();
            navigate(`/it/applications${qs ? `?${qs}` : ''}`);
          }} title={t('common.close')}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">{error}</Alert>}
      {!!saveError && <Alert severity="error" sx={{ mt: 1 }}>{saveError}</Alert>}
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', minHeight: 420 }}>
        <Tabs orientation="vertical" value={tab} onChange={async (_, v) => {
          if (dirty) {
            const save = window.confirm(t('confirmations.unsavedSave'));
            if (save) { try { await handleSave(); } catch {} }
          }
          const qs = searchParams.toString();
          navigate(`/it/applications/${id}/${v}${qs ? `?${qs}` : ''}`);
        }} sx={{ borderRight: 1, borderColor: 'divider', minWidth: 180 }}>
          <Tab label="Overview" value="overview" />
          <Tab label="Instances" value="instances" disabled={isCreate} />
          <Tab label="Servers" value="servers" disabled={isCreate} />
          <Tab label="Interfaces" value="interfaces" disabled={isCreate} />
          <Tab label="Ownership & Audience" value="ownership" disabled={isCreate} />
          <Tab label="Technical & Support" value="technical" disabled={isCreate} />
          <Tab label="Relations" value="relations" disabled={isCreate} />
          <Tab label="Knowledge" value="knowledge" disabled={isCreate} />
          <Tab label="Compliance" value="compliance" disabled={isCreate} />
        </Tabs>

        <Box sx={{ flex: 1, pl: 3 }}>
          {tab === 'overview' && (
            isCreate ? (
              <ApplicationCreateEditor ref={createRef} onDirtyChange={setDirty} />
            ) : (
              <Stack spacing={2}>
                {lineage && (lineage.predecessors.length > 0 || lineage.successors.length > 0) && (
                  <VersionTimeline
                    predecessors={lineage.predecessors}
                    current={lineage.current}
                    successors={lineage.successors}
                  />
                )}
                <TextField label="Name" value={data?.name || ''} onChange={(e) => update({ name: e.target.value })} required fullWidth />
                <TextField label="Description" value={data?.description || ''} onChange={(e) => update({ description: e.target.value })} fullWidth />
                <EnumAutocomplete
                  label="Category"
                  value={data?.category || 'line_of_business'}
                  onChange={(v) => update({ category: v })}
                  options={byField.applicationCategory.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }))}
                  required
                />
                <SupplierSelect label="Supplier" value={data?.supplier_id || null} onChange={(v) => update({ supplier_id: v })} />
                <TextField label="Publisher" value={data?.editor || ''} onChange={(e) => update({ editor: e.target.value })} fullWidth />
                <EnumAutocomplete
                  label="Criticality"
                  value={data?.criticality || 'medium'}
                  onChange={(v) => update({ criticality: v })}
                  options={[
                    { label: 'Business critical', value: 'business_critical' },
                    { label: 'High', value: 'high' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Low', value: 'low' },
                  ]}
                  required
                />
                <EnumAutocomplete
                  label="Lifecycle"
                  value={data?.lifecycle || 'active'}
                  onChange={(v) => update({ lifecycle: v })}
                  options={lifecycleOptions}
                  required
                />
                <FormControlLabel control={<Checkbox checked={!!data?.is_suite} onChange={(e) => update({ is_suite: e.target.checked })} disabled={hasParentSuite} />} label="Can have child apps" />
                {hasParentSuite && (
                  <Typography variant="caption" color="text.secondary">
                    This setting is disabled because the application belongs to a suite. Remove the parent suite under the Relations tab to re‑enable it.
                  </Typography>
                )}

                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Version Information</Typography>
                <TextField
                  label="Version"
                  value={data?.version || ''}
                  onChange={(e) => update({ version: e.target.value })}
                  fullWidth
                  placeholder="e.g., 4.2.1, 2023, Q1 2024"
                  size="small"
                />
                <DateEUField label="Go Live Date" valueYmd={data?.go_live_date || ''} onChangeYmd={(v) => update({ go_live_date: v })} />
                <DateEUField label="End of Support" valueYmd={data?.end_of_support_date || ''} onChangeYmd={(v) => update({ end_of_support_date: v })} />
                <DateEUField label="Retired Date" valueYmd={data?.retired_date || ''} onChangeYmd={(v) => update({ retired_date: v })} />
                <Divider sx={{ my: 1 }} />

                <TextField label="Licensing" value={data?.licensing || ''} onChange={(e) => update({ licensing: e.target.value })} fullWidth multiline minRows={3} />
                <TextField label="Notes" value={data?.notes || ''} onChange={(e) => update({ notes: e.target.value })} multiline minRows={3} fullWidth />
              </Stack>
            )
          )}
          {tab === 'ownership' && !isCreate && (
            <OwnersAudienceEditor data={data} update={update} markDirty={() => setDirty(true)} />
          )}
          {tab === 'technical' && !isCreate && (
            <Stack spacing={3}>
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Technical information</Typography>
                <Autocomplete
                  multiple
                  options={suiteOptions}
                  value={suites}
                  getOptionLabel={(o) => o.name}
                  onChange={(_, v) => { setSuites(v as any); setDirty(true); }}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>{option.name}</li>
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip {...getTagProps({ index })} key={option.id} label={option.name} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Suites"
                      placeholder="Select suites this application belongs to"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                  isOptionEqualToValue={(opt, val) => opt.id === (val as any).id}
                  filterSelectedOptions
                  fullWidth
                />
                <Autocomplete
                  multiple
                  options={(() => {
                    const list = byField.accessMethod || [];
                    const currentCodes = data?.access_methods || [];
                    // Include non-deprecated options and any deprecated options that are currently selected
                    return list
                      .filter((o) => !o.deprecated || currentCodes.includes(o.code))
                      .map((o) => ({
                        value: o.code,
                        label: o.deprecated ? `${o.label} (deprecated)` : o.label,
                      }));
                  })()}
                  value={(() => {
                    const list = byField.accessMethod || [];
                    const currentCodes = data?.access_methods || [];
                    return currentCodes.map((code: string) => {
                      const found = list.find((o) => o.code === code);
                      return {
                        value: code,
                        label: found ? (found.deprecated ? `${found.label} (deprecated)` : found.label) : code,
                      };
                    });
                  })()}
                  getOptionLabel={(o) => o.label}
                  onChange={(_, v) => { update({ access_methods: v.map((opt) => opt.value) }); }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip {...getTagProps({ index })} key={option.value} label={option.label} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Access Methods"
                      placeholder="Select how this application is accessed"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                  isOptionEqualToValue={(opt, val) => opt.value === val.value}
                  filterSelectedOptions
                  fullWidth
                />
                <FormControlLabel control={<Checkbox checked={!!data?.external_facing} onChange={(e) => update({ external_facing: e.target.checked })} />} label="External Facing" />
                <FormControlLabel control={<Checkbox checked={!!data?.etl_enabled} onChange={(e) => update({ etl_enabled: e.target.checked })} />} label="Data Integration / ETL" />
              </Stack>

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Support Information</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button startIcon={<AddIcon />} onClick={addSupportRow} size="small">Add contact</Button>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Contact</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {supportContacts.map((row, idx) => (
                      <TableRow key={row.id || idx}>
                        <TableCell sx={{ minWidth: 260 }}>
                          <ContactSelect value={row.contact_id} onChange={(v) => void setSupportRowContact(idx, v)} showEmail={false} />
                        </TableCell>
                        <TableCell>{row.contact?.email || '—'}</TableCell>
                        <TableCell>{row.contact?.phone || '—'}</TableCell>
                        <TableCell>{row.contact?.mobile || '—'}</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <TextField value={row.role} onChange={(e) => setSupportRowRole(idx, e.target.value)} size="small" placeholder="Role" fullWidth />
                        </TableCell>
                        <TableCell width={48}>
                          {supportContacts.length > 0 && (
                            <IconButton aria-label={t('common.remove')} size="small" onClick={() => removeSupportRow(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Box sx={{ height: 16 }} />

                <TextField
                  label="Support notes"
                  value={data?.support_notes || ''}
                  onChange={(e) => update({ support_notes: e.target.value })}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </Stack>
          )}
          {tab === 'instances' && !isCreate && (
            <InstancesEditor
              applicationId={id}
              instances={(data?.instances || []) as any}
              onRefresh={reload}
            />
          )}
          {tab === 'servers' && !isCreate && (
            <ServerAssignmentsEditor
              applicationId={id}
              instances={(data?.instances || []) as any}
              onRefreshInstances={reload}
            />
          )}
          {tab === 'interfaces' && !isCreate && (
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Interfaces
              </Typography>
              {interfacesLoading && (
                <Typography variant="body2" color="text.secondary">
                  Loading interfaces…
                </Typography>
              )}
              {interfacesError && (
                <Alert severity="error">{interfacesError}</Alert>
              )}
              {!interfacesLoading && !interfacesError && Object.keys(interfacesByEnv).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No interfaces found for this application.
                </Typography>
              )}
              {!interfacesLoading && !interfacesError && Object.keys(interfacesByEnv).length > 0 && (
                <Stack spacing={2}>
                  {ENV_ORDER.filter((env) => interfacesByEnv[env]?.length > 0).map((env) => (
                    <Box key={env}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>{env.toUpperCase()}</Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell width="34%" align="left">Interface Name</TableCell>
                            <TableCell width="28%" align="left">Source Application</TableCell>
                            <TableCell width="28%" align="left">Target Application</TableCell>
                            <TableCell width="10%" align="left">Via middleware</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {interfacesByEnv[env].map((row) => (
                            <TableRow key={`${row.id}-${env}`} hover>
                              <TableCell align="left">
                                <Button
                                  size="small"
                                  onClick={() => navigate(`/it/interfaces/${row.id}/overview`)}
                                  sx={{ justifyContent: 'flex-start', textAlign: 'left', padding: 0, minWidth: 0, textTransform: 'none' }}
                                >
                                  {row.name || '—'}
                                </Button>
                              </TableCell>
                              <TableCell align="left">
                                {row.source_application_id ? (
                                  <Button
                                    size="small"
                                    onClick={() => navigate(`/it/applications/${row.source_application_id}/overview`)}
                                    sx={{ justifyContent: 'flex-start', textAlign: 'left', padding: 0, minWidth: 0, textTransform: 'none' }}
                                  >
                                    {row.source_application_name || row.source_application_id}
                                  </Button>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">—</Typography>
                                )}
                              </TableCell>
                              <TableCell align="left">
                                {row.target_application_id ? (
                                  <Button
                                    size="small"
                                    onClick={() => navigate(`/it/applications/${row.target_application_id}/overview`)}
                                    sx={{ justifyContent: 'flex-start', textAlign: 'left', padding: 0, minWidth: 0, textTransform: 'none' }}
                                  >
                                    {row.target_application_name || row.target_application_id}
                                  </Button>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">—</Typography>
                                )}
                              </TableCell>
                              <TableCell align="left">
                                <Typography variant="body2">{row.via_middleware ? t('enums.yesNo.yes') : t('enums.yesNo.no')}</Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
          {tab === 'relations' && !isCreate && (
            <ApplicationRelationsPanel ref={relationsRef} id={id} isSuite={!!data?.is_suite} onDirtyChange={(dirty) => dirty && setDirty(true)} />
          )}
          {tab === 'knowledge' && !isCreate && (
            <EntityKnowledgePanel entityType="applications" entityId={id} canCreate={canCreateKnowledge} />
          )}
          {tab === 'compliance' && !isCreate && (
            <ComplianceEditor ref={complianceRef} onDirtyChange={(dirty) => dirty && setDirty(true)} />
          )}
        </Box>
      </Box>

      {/* Create Version Dialog */}
      {data && (
        <CreateVersionDialog
          open={versionDialogOpen}
          onClose={() => setVersionDialogOpen(false)}
          sourceApp={{ id, name: data.name, version: data.version }}
          onSuccess={(newApp) => {
            setVersionDialogOpen(false);
            navigate(`/it/applications/${newApp.id}`);
          }}
        />
      )}
    </Box>
  );
}
