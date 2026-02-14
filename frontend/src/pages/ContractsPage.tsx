import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../components/ServerDataGrid';
import { Box, Button, Stack } from '@mui/material';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import { useAuth } from '../auth/AuthContext';
import ForbiddenPage from './ForbiddenPage';

type ContractRow = {
  id: string;
  name: string;
  status: string;
  disabled_at?: string | null;
  company?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  owner_user_id?: string | null;
  start_date: string;
  duration_months: number;
  auto_renewal: boolean;
  notice_period_months: number;
  yearly_amount_at_signature: number;
  currency: string;
  billing_frequency: 'monthly' | 'quarterly' | 'annual' | 'other';
  notes?: string | null;
  end_date?: string;
  cancellation_deadline?: string;
  linked_opex_count?: number;
  latest_task?: { id: string; description?: string; status?: string; created_at?: string } | null;
};

function formatNumber(v: any) {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return '';
  const i = Math.round(n);
  return i.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function ContractsPage() {
  const { hasLevel } = useAuth();

  if (!hasLevel('contracts', 'reader')) {
    return <ForbiddenPage />;
  }

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openEdit = (row: ContractRow) => {
    const sp = new URLSearchParams(searchParams);
    navigate(`/ops/contracts/${row.id}/overview?${sp.toString()}`);
  };

  const handleNew = () => {
    const sp = new URLSearchParams(searchParams);
    navigate(`/ops/contracts/new/overview?${sp.toString()}`);
  };

  const columns: EnhancedColDef<ContractRow>[] = useMemo(() => [
    { field: 'name', headerName: 'Contract', flex: 1, minWidth: 220, required: true, cellRenderer: (p: any) => (
      <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => openEdit(p.data)}>{p.value}</Box>
    )},
    { colId: 'supplier_name', headerName: 'Supplier', width: 180, valueGetter: (p) => p.data?.supplier?.name || '', cellRenderer: (p: any) => (
      <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => openEdit(p.data)}>{p.value}</Box>
    ) },
    { colId: 'company_name', headerName: 'Company', width: 180, valueGetter: (p) => p.data?.company?.name || '', cellRenderer: (p: any) => (
      <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => openEdit(p.data)}>{p.value}</Box>
    ) },
    { field: 'start_date', headerName: 'Start', width: 120 },
    { field: 'duration_months', headerName: 'Duration (m)', width: 130, type: 'rightAligned' },
    { field: 'auto_renewal', headerName: 'Auto-renewal', width: 130, valueFormatter: (p) => p.value ? 'yes' : 'no' },
    { field: 'notice_period_months', headerName: 'Notice (m)', width: 120, type: 'rightAligned' },
    { field: 'end_date', headerName: 'End', width: 120 },
    { field: 'cancellation_deadline', headerName: 'Cancel by', width: 140 },
    { field: 'yearly_amount_at_signature', headerName: 'Yearly amount', width: 150, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'currency', headerName: 'Curr', width: 90 },
    { field: 'billing_frequency', headerName: 'Billing', width: 120 },
    { colId: 'linked_opex_count', headerName: 'Linked OPEX', width: 140, valueGetter: (p) => p.data?.linked_opex_count ?? 0, cellRenderer: (p: any) => (
      <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => openEdit(p.data)}>{p.value}</Box>
    )},
    { colId: 'latest_task_text', headerName: 'Task', flex: 1, minWidth: 200, defaultHidden: true, valueGetter: (p) => {
      const t = p.data?.latest_task; if (!t) return ''; const s = t.status || ''; const d = (t.description || '').toString(); const short = d.length > 40 ? `${d.slice(0,40)}…` : d; return s ? `${s}: ${short}` : short;
    } },
    // Keep status filter values list if needed later
    // { field: 'status', headerName: 'Status', width: 120, defaultHidden: true, filter: 'agSetColumnFilter', filterParams: { values: STATUS_VALUES, suppressMiniFilter: true } },
  ], []);

  const canCreate = hasLevel('contracts','manager');
  const canAdmin = hasLevel('contracts','admin');
  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && <Button variant="contained" onClick={handleNew}>New</Button>}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>Export CSV</Button>}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Contracts" actions={actions} />
      <ServerDataGrid<ContractRow>
        columns={columns}
        endpoint="/contracts"
        queryKey="contracts"
        getRowId={(r) => r.id}
        enableSearch={true}
        defaultSort={{ field: 'cancellation_deadline', direction: 'ASC' }}
        refreshKey={refreshKey}
        columnPreferencesKey="contracts-grid"
      />

      <CsvExportDialog open={exportOpen} onClose={() => setExportOpen(false)} endpoint="/contracts" title="Export Contracts" />
      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} endpoint="/contracts" title="Import Contracts" onImported={() => setRefreshKey(k => k + 1)} />
    </>
  );
}

