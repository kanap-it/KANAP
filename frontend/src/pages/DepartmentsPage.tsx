import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { EnhancedColDef, StatusScope } from '../components/ServerDataGrid';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import { useAuth } from '../auth/AuthContext';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import { STATUS_VALUES } from '../constants/status';
import ForbiddenPage from './ForbiddenPage';

export default function DepartmentsPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();

  if (!hasLevel('departments', 'reader')) {
    return <ForbiddenPage />;
  }

  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const gridApiRef = useRef<any>(null);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const lastQueryRef = useRef<{ sort: string; q: string; filters: any; statusScope?: StatusScope } | null>(null);

  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'headcount_year:DESC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    sp.set('year', String(year));
    return sp;
  }, [year]);

  const openWorkspace = useCallback((row: any, tab: 'overview' | 'details') => {
    if (!row?.id) return;
    const sp = buildWorkspaceSearch();
    navigate(`/master-data/departments/${row.id}/${tab}?${sp.toString()}`);
  }, [buildWorkspaceSearch, navigate]);

  const ClickableCell: React.FC<ICellRendererParams<any, any>> = (params) => (
    <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => openWorkspace(params.data, 'overview')}>
      {params.value}
    </Box>
  );

  const ClickableCellGeneric: React.FC<ICellRendererParams<any, any>> = (params) => (
    <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => openWorkspace(params.data, 'overview')}>
      {params.valueFormatted ?? params.value}
    </Box>
  );

  const columns: EnhancedColDef<any>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', flex: 1, required: true, cellRenderer: ClickableCell },
    { field: 'company_name', headerName: 'Company', width: 280, filter: 'agTextColumnFilter', filterParams: { suppressAndOrCondition: true }, cellRenderer: ClickableCellGeneric },
    { field: 'headcount_year', headerName: `Headcount (${year})`, width: 180, filter: 'agNumberColumnFilter', filterParams: { suppressAndOrCondition: true }, cellRenderer: (p: any) => (
      <Box sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }} onClick={() => openWorkspace(p.data, 'details')}>{(p.value ?? 0)}</Box>
    ) },
    { field: 'status', headerName: 'Status', width: 140, filter: 'agSetColumnFilter', filterParams: { values: STATUS_VALUES, suppressMiniFilter: true }, cellRenderer: ClickableCellGeneric, defaultHidden: true },
    { field: 'created_at', headerName: 'Created', width: 200, valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString() : ''), defaultHidden: true, cellRenderer: ClickableCellGeneric },
  ], [ClickableCell, ClickableCellGeneric, openWorkspace, year]);

  const canCreate = hasLevel('departments','manager');
  const canAdmin = hasLevel('departments','admin');
  const actions = (
    <Stack direction="row" spacing={1}>
      <TextField size="small" label="Year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || currentYear)} sx={{ width: 120 }} />
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const sp = buildWorkspaceSearch();
            navigate(`/master-data/departments/new/overview?${sp.toString()}`);
          }}
        >
          New
        </Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>Export CSV</Button>}
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/departments/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.name}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => { setRefreshKey((k) => k + 1); }}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Departments" actions={actions} />
      <ServerDataGrid<any>
        columns={columns}
        endpoint="/departments"
        queryKey="departments"
        getRowId={(r) => r.id}
        enableSearch
        defaultSort={{ field: 'headcount_year', direction: 'DESC' }}
        refreshKey={refreshKey + ":" + year}
        extraParams={{ year }}
        columnPreferencesKey="departments"
        enableColumnChooser={true}
        statusScopeConfig={{ defaultScope: 'enabled' }}
        requiredColumns={['name']}
        defaultHiddenColumns={['created_at']}
        enableRowSelection={canAdmin}
        onSelectionChanged={setSelectedRows}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        onCellClicked={(e: any) => {
          const f = e?.colDef?.field;
          if (['headcount_year'].includes(f)) openWorkspace(e.data, 'details');
          else openWorkspace(e.data, 'overview');
        }}
        onQueryStateChange={(state) => {
          const scope = state.statusScope ?? 'enabled';
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {}, statusScope: scope };
        }}
      />
      <CsvExportDialog open={exportOpen} onClose={() => setExportOpen(false)} endpoint="/departments" title="Export Departments" />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/departments"
        title="Import Departments"
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
