import React, { useCallback, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { EnhancedColDef, StatusScope } from '../components/ServerDataGrid';
import { ICellRendererParams } from 'ag-grid-community';
import { Box, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import { useAuth } from '../auth/AuthContext';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import { STATUS_VALUES } from '../constants/status';
import ForbiddenPage from './ForbiddenPage';

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();

  if (!hasLevel('suppliers', 'reader')) {
    return <ForbiddenPage />;
  }

  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const gridApiRef = useRef<any>(null);

  // Track last query to preserve list context when opening workspace
  const lastQueryRef = useRef<{ sort: string; q: string; filters: any; statusScope?: StatusScope } | null>(null);
  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'name:ASC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    return sp;
  }, []);

  const ClickableCell: React.FC<ICellRendererParams<any, any>> = (params) => (
    <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => {
      const sp = buildWorkspaceSearch();
      navigate(`/master-data/suppliers/${params.data?.id}/overview?${sp.toString()}`);
    }}>
      {params.value}
    </Box>
  );
  const ClickableCellGeneric: React.FC<ICellRendererParams<any, any>> = (params) => (
    <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => {
      const sp = buildWorkspaceSearch();
      navigate(`/master-data/suppliers/${params.data?.id}/overview?${sp.toString()}`);
    }}>
      {params.valueFormatted ?? params.value}
    </Box>
  );

  const columns: EnhancedColDef<any>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', flex: 1, required: true, cellRenderer: ClickableCell },
    { field: 'erp_supplier_id', headerName: 'ERP Supplier ID', width: 200, cellRenderer: ClickableCellGeneric },
    { field: 'notes', headerName: 'Notes', width: 250, defaultHidden: true, cellRenderer: ClickableCellGeneric },
    { field: 'status', headerName: 'Status', width: 140, filter: 'agSetColumnFilter', filterParams: { values: STATUS_VALUES, suppressMiniFilter: true }, cellRenderer: ClickableCellGeneric, defaultHidden: true },
    { field: 'created_at', headerName: 'Created', width: 200, valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString() : ''), defaultHidden: true, cellRenderer: ClickableCellGeneric },
  ], [ClickableCell]);

  const canCreate = hasLevel('suppliers','manager');
  const canAdmin = hasLevel('suppliers','admin');
  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const sp = buildWorkspaceSearch();
            navigate(`/master-data/suppliers/new/overview?${sp.toString()}`);
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
          endpoint="/suppliers/bulk"
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
      <PageHeader title="Suppliers" actions={actions} />
      <ServerDataGrid<any>
        columns={columns}
        endpoint="/suppliers"
        queryKey="suppliers"
        getRowId={(r) => r.id}
        enableSearch
        defaultSort={{ field: 'name', direction: 'ASC' }}
        refreshKey={refreshKey}
        columnPreferencesKey="suppliers"
        enableColumnChooser={true}
        statusScopeConfig={{ defaultScope: 'enabled' }}
        requiredColumns={['name']}
        defaultHiddenColumns={['notes', 'created_at']}
        enableRowSelection={canAdmin}
        onSelectionChanged={setSelectedRows}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        onQueryStateChange={(state) => {
          const scope = state.statusScope ?? 'enabled';
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {}, statusScope: scope };
        }}
      />
      <CsvExportDialog open={exportOpen} onClose={() => setExportOpen(false)} endpoint="/suppliers" title="Export Suppliers" />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/suppliers"
        title="Import Suppliers"
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
