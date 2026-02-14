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
import ForbiddenPage from './ForbiddenPage';
import { STATUS_VALUES } from '../constants/status';

export default function AccountsPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();

  if (!hasLevel('accounts', 'reader')) {
    return <ForbiddenPage />;
  }

  const location = window.location;
  const url = new URL(location.href);
  const coaIdParam = url.searchParams.get('coaId') || undefined;
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const gridApiRef = useRef<any>(null);

  // Preserve list query context for workspace
  const lastQueryRef = useRef<{ sort: string; q: string; filters: any; statusScope?: StatusScope } | null>(null);
  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'account_number:ASC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    if (coaIdParam) sp.set('coaId', coaIdParam);
    return sp;
  }, []);

  const ClickableCell: React.FC<ICellRendererParams<any, any>> = (params) => {
    const nativeName = params.data?.native_name;
    const showTooltip = nativeName && nativeName !== params.value;
    return (
      <Box
        component="span"
        title={showTooltip ? nativeName : undefined}
        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
        onClick={() => {
          const sp = buildWorkspaceSearch();
          navigate(`/master-data/accounts/${params.data?.id}/overview?${sp.toString()}`);
        }}
      >
        {params.value}
      </Box>
    );
  };
  const ClickableCellGeneric: React.FC<ICellRendererParams<any, any>> = (params) => (
    <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => {
      const sp = buildWorkspaceSearch();
      navigate(`/master-data/accounts/${params.data?.id}/overview?${sp.toString()}`);
    }}>
      {params.valueFormatted ?? params.value}
    </Box>
  );

  const columns: EnhancedColDef<any>[] = useMemo(() => [
    { field: 'account_number', headerName: 'Account #', width: 160, required: true, cellRenderer: ClickableCell },
    { field: 'account_name', headerName: 'Name', flex: 1, required: true, cellRenderer: ClickableCell },
    { field: 'native_name', headerName: 'Native Name', width: 220, defaultHidden: true, cellRenderer: ClickableCellGeneric },
    { field: 'coa_code', headerName: 'CoA', width: 160, cellRenderer: ClickableCellGeneric },
    { field: 'description', headerName: 'Description', width: 250, defaultHidden: true, cellRenderer: ClickableCellGeneric },
    { field: 'consolidation_account_number', headerName: 'Consol. Account #', width: 180, cellRenderer: ClickableCellGeneric },
    { field: 'consolidation_account_name', headerName: 'Consol. Name', width: 250, cellRenderer: ClickableCellGeneric },
    { field: 'consolidation_account_description', headerName: 'Consol. Description', width: 300, defaultHidden: true, cellRenderer: ClickableCellGeneric },
    { field: 'status', headerName: 'Status', width: 140, filter: 'agSetColumnFilter', filterParams: { values: STATUS_VALUES, suppressMiniFilter: true }, cellRenderer: ClickableCellGeneric, defaultHidden: true },
    { field: 'created_at', headerName: 'Created', width: 200, valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString() : ''), defaultHidden: true, cellRenderer: ClickableCellGeneric },
  ], [ClickableCell]);

  const canCreate = hasLevel('accounts','manager');
  const canAdmin = hasLevel('accounts','admin');
  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const sp = buildWorkspaceSearch();
            navigate(`/master-data/accounts/new/overview?${sp.toString()}`);
          }}
        >
          New
        </Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>{coaIdParam ? 'Import CSV (CoA)' : 'Import CSV'}</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>{coaIdParam ? 'Export CSV (CoA)' : 'Export CSV'}</Button>}
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/accounts/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.account_name}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => { setRefreshKey((k) => k + 1); }}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Accounts" actions={actions} />
      <ServerDataGrid<any>
        columns={columns}
        endpoint="/accounts"
        queryKey="accounts"
        extraParams={coaIdParam ? { coaId: coaIdParam } : {}}
        getRowId={(r) => r.id}
        enableSearch
        defaultSort={{ field: 'account_number', direction: 'ASC' }}
        refreshKey={refreshKey}
        columnPreferencesKey="accounts"
        enableColumnChooser={true}
        statusScopeConfig={{ defaultScope: 'enabled' }}
        requiredColumns={['account_number', 'account_name']}
        defaultHiddenColumns={['description', 'consolidation_account_description', 'created_at']}
        enableRowSelection={canAdmin}
        onSelectionChanged={setSelectedRows}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        onQueryStateChange={(state) => {
          const scope = state.statusScope ?? 'enabled';
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {}, statusScope: scope };
        }}
      />
      <CsvExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        endpoint={coaIdParam ? `/chart-of-accounts/${coaIdParam}/accounts` : '/accounts'}
        title="Export Accounts"
        params={coaIdParam ? undefined : { coaId: undefined }}
      />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint={coaIdParam ? `/chart-of-accounts/${coaIdParam}/accounts` : '/accounts'}
        title={coaIdParam ? 'Import Accounts into selected CoA' : 'Import Accounts (global — include coa_code or provide ?coaId)'}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
