import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../components/ServerDataGrid';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography, Alert, FormLabel, FormControl, RadioGroup, Radio, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../auth/AuthContext';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import ForbiddenPage from './ForbiddenPage';
import { COUNTRY_OPTIONS } from '../constants/isoOptions';
import api from '../api';
import { useNavigate } from 'react-router-dom';

type CoA = {
  id: string;
  code: string;
  name: string;
  country_iso: string | null;
  is_default: boolean;
  is_global_default?: boolean;
  scope: 'GLOBAL' | 'COUNTRY';
  companies_count?: number;
  accounts_count?: number;
  created_at: string;
  updated_at: string;
};

function CreateCoADialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (newId?: string) => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'scratch' | 'template'>('scratch');
  const [scope, setScope] = useState<'GLOBAL' | 'COUNTRY'>('COUNTRY');
  const [templates, setTemplates] = useState<Array<{ id: string; country_iso: string | null; template_code: string; template_name: string; version: string; is_global?: boolean; loaded_by_default?: boolean }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [preflight, setPreflight] = useState<any | null>(null);
  const [preflighting, setPreflighting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || mode !== 'template') return;
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/chart-of-accounts/templates');
        if (!alive) return;
        setTemplates(res.data?.items || []);
      } catch {
        if (!alive) return;
        setTemplates([]);
      }
    })();
    return () => { alive = false; };
  }, [open, mode]);

  // When a template is selected, prefill Name and Country (editable). If global, country is not required.
  useEffect(() => {
    if (!open || mode !== 'template') return;
    if (!selectedTemplate) return;
    const t = templates.find((x) => x.id === selectedTemplate);
    if (t) {
      if (!name) setName(t.template_name);
      if (t.is_global) {
        setScope('GLOBAL');
        setCountry('');
        setIsDefault(false);
      } else {
        setScope('COUNTRY');
        if (!country) setCountry(t.country_iso || '');
      }
      if (!code) setCode(t.template_name);
    }
  }, [selectedTemplate, templates, open, mode, name, country, code]);

  const runPreflight = async () => {
    if (mode !== 'template' || !selectedTemplate) return;
    setPreflighting(true);
    setError(null);
    try {
      const res = await api.post('/chart-of-accounts/import-template/preflight', { template_id: selectedTemplate });
      setPreflight(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Preflight failed');
      setPreflight(null);
    } finally {
      setPreflighting(false);
    }
  };

  const resetForm = () => {
    setCode(''); setName(''); setCountry(''); setScope('COUNTRY'); setIsDefault(false);
    setSelectedTemplate(''); setPreflight(null);
    setMode('scratch');
  };

  const handleSubmit = async () => {
    const selected = templates.find((x) => x.id === selectedTemplate);
    const isGlobal = scope === 'GLOBAL' || !!selected?.is_global;
    if (!code || !name) {
      setError('Code and Name are required');
      return;
    }
    if (scope === 'COUNTRY' && !(mode === 'template' && isGlobal) && !country) {
      setError('Country is required');
      return;
    }
    if (mode === 'template' && !selectedTemplate) {
      setError('Please select a template');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = { code, name, scope };
      if (scope === 'COUNTRY') payload.country_iso = country;
      payload.is_default = scope === 'COUNTRY' ? isDefault : false;
      const createRes = await api.post('/chart-of-accounts', payload);
      const created = createRes.data;
      if (mode === 'template' && selectedTemplate) {
        await api.post(`/chart-of-accounts/${created.id}/load-template`, { template_id: selectedTemplate, dryRun: false, overwrite: true });
      }
      onCreated(created?.id);
      onClose();
      resetForm();
      // Navigate to Accounts filtered by this CoA after import-from-template
      if (mode === 'template' && created?.id) {
        const sp = new URLSearchParams();
        sp.set('coaId', created.id);
        navigate(`/master-data/accounts?${sp.toString()}`);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Chart of Accounts</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl>
            <FormLabel id="coa-create-mode">Mode</FormLabel>
            <RadioGroup
              row
              aria-labelledby="coa-create-mode"
              value={mode}
              onChange={(e) => { setMode(e.target.value as any); setPreflight(null); }}
            >
              <FormControlLabel value="scratch" control={<Radio />} label="Create from scratch" />
              <FormControlLabel value="template" control={<Radio />} label="Copy from template" />
            </RadioGroup>
          </FormControl>
          {mode === 'template' && (
            <TextField
              select
              label="Template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              required
              size="small"
            >
              {templates.map((t: any) => {
                const scope = t?.country_iso ? t.country_iso : 'ALL';
                return (
                  <MenuItem key={t.id} value={t.id}>{scope} — {t.template_code} {t.version} · {t.template_name}</MenuItem>
                );
              })}
            </TextField>
          )}
          <TextField
            label={<>
              Code
              <Tooltip title="A stable identifier used in exports/imports (coa_code) and deep links." placement="top">
                <InfoOutlinedIcon fontSize="small" style={{ marginLeft: 6, verticalAlign: 'middle' }} />
              </Tooltip>
            </>}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            size="small"
            autoFocus
          />
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required size="small" />
          <FormControl>
            <FormLabel id="coa-scope">Scope</FormLabel>
            <RadioGroup row aria-labelledby="coa-scope" value={scope} onChange={(e) => setScope(e.target.value as any)}>
              <FormControlLabel value="COUNTRY" control={<Radio />} label="Country" />
              <FormControlLabel value="GLOBAL" control={<Radio />} label="Global" />
            </RadioGroup>
          </FormControl>
          {scope === 'COUNTRY' && (
            <TextField select label="Country" value={country} onChange={(e) => setCountry(e.target.value)} required size="small">
              {COUNTRY_OPTIONS.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.code} — {c.name}</MenuItem>
              ))}
            </TextField>
          )}
          {scope === 'COUNTRY' && (
            <FormControlLabel control={<Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />} label="Set as default for this country" />
          )}
          {mode === 'template' && preflight && (
            <Alert severity="success">Preflight OK — total {preflight.total}, inserts {preflight.inserted}, updates {preflight.updated}.</Alert>
          )}
          {error && <Box sx={{ color: 'error.main', fontSize: 14 }}>{error}</Box>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting || preflighting}>Cancel</Button>
        {mode === 'template' && (
          <Button onClick={runPreflight} disabled={!selectedTemplate || preflighting || submitting}>Preflight</Button>
        )}
        <Button onClick={handleSubmit} variant="contained" disabled={submitting || (mode === 'template' && !selectedTemplate)}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ChartsOfAccountsPage() {
  const { hasLevel } = useAuth();

  if (!hasLevel('accounts', 'reader')) {
    return <ForbiddenPage />;
  }

  const canManage = hasLevel('accounts', 'manager');
  const canAdmin = hasLevel('accounts', 'admin');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState<CoA[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const gridApiRef = useRef<any>(null);
  const navigate = useNavigate();

  const columns: EnhancedColDef<CoA>[] = useMemo(() => [
    { field: 'code', headerName: 'Code', width: 160, required: true },
    { field: 'name', headerName: 'Name', flex: 1, required: true },
    { field: 'scope', headerName: 'Scope', width: 120 },
    { field: 'country_iso', headerName: 'Country', width: 140, valueFormatter: (p: any) => (p?.data?.scope === 'GLOBAL' ? '' : (p.value || '')) },
    { field: 'is_default', headerName: 'Default', width: 120, valueFormatter: (p: any) => (p.value ? 'Yes' : 'No') },
    { field: 'is_global_default', headerName: 'Global Default', width: 160, valueFormatter: (p: any) => (p.value ? 'Yes' : 'No') },
    { field: 'companies_count', headerName: 'Companies', width: 140, defaultHidden: false },
    { field: 'accounts_count', headerName: 'Accounts', width: 140, defaultHidden: false },
    { field: 'created_at', headerName: 'Created', width: 200, valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString() : '') },
  ], []);

  const handleSetDefault = useCallback(async () => {
    const row = selectedRows[0];
    if (!row) return;
    await api.patch(`/chart-of-accounts/${row.id}`, { is_default: true });
    setRefreshKey((k) => k + 1);
  }, [selectedRows]);

  const handleOpenAccounts = useCallback(() => {
    const row = selectedRows[0];
    if (!row) return;
    const filterModel = { coa_id: { filterType: 'text', type: 'equals', filter: row.id } };
    const sp = new URLSearchParams();
    sp.set('filters', JSON.stringify(filterModel));
    sp.set('coaId', row.id); // include for explicit deep link context
    navigate(`/master-data/accounts?${sp.toString()}`);
  }, [selectedRows, navigate]);

  const handleSetGlobalDefault = useCallback(async () => {
    const row = selectedRows[0];
    if (!row) return;
    await api.patch(`/chart-of-accounts/${row.id}/global-default`, {});
    setRefreshKey((k) => k + 1);
  }, [selectedRows]);

  const actions = (
    <Stack direction="row" spacing={1}>
      {canManage && (
        <Button variant="contained" onClick={() => setCreateOpen(true)}>New</Button>
      )}
      {canManage && (
        <Button disabled={selectedRows.length !== 1 || selectedRows[0]?.scope !== 'COUNTRY'} onClick={handleSetDefault}>Set Default</Button>
      )}
      {canManage && (
        <Button disabled={selectedRows.length !== 1 || selectedRows[0]?.scope !== 'GLOBAL'} onClick={handleSetGlobalDefault}>Set Global Default</Button>
      )}
      <Button disabled={selectedRows.length !== 1} onClick={handleOpenAccounts}>Open Accounts in this CoA</Button>
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/chart-of-accounts/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => `${row.code} - ${row.name}`}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Charts of Accounts" actions={actions} />
      <ServerDataGrid<CoA>
        columns={columns}
        endpoint="/chart-of-accounts"
        queryKey="chart-of-accounts"
        defaultSort={{ field: 'created_at', direction: 'DESC' }}
        refreshKey={refreshKey}
        columnPreferencesKey="chart-of-accounts"
        enableColumnChooser={true}
        enableRowSelection={canAdmin}
        onSelectionChanged={(rows) => setSelectedRows(rows as CoA[])}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
      />
      <CreateCoADialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
// removed LoadTemplateDialog; "Copy from template" lives under New dialog
