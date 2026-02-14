import React, { useCallback, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { EnhancedColDef, StatusScope } from '../components/ServerDataGrid';
import { Box, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import { useAuth } from '../auth/AuthContext';
import { STATUS_VALUES } from '../constants/status';
import BusinessProcessCategoryManagerDialog from './business-processes/BusinessProcessCategoryManagerDialog';
import ForbiddenPage from './ForbiddenPage';

type BusinessProcessRow = {
  id: string;
  name: string;
  description?: string | null;
  owner_user_id?: string | null;
  it_owner_user_id?: string | null;
  owner_name?: string | null;
  notes?: string | null;
  status: string;
  disabled_at?: string | null;
  updated_at?: string;
  categories?: Array<{ id: string; name: string; is_active: boolean }>;
  primary_category_name?: string | null;
};

export default function BusinessProcessesPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();

  if (!hasLevel('business_processes', 'reader')) {
    return <ForbiddenPage />;
  }

  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<BusinessProcessRow[]>([]);
  const gridApiRef = useRef<any>(null);

  const lastQueryRef = useRef<{ sort: string; q: string; filters: any; statusScope?: StatusScope } | null>(null);
  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'primary_category_name:ASC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    return sp;
  }, []);

  const ClickableCell: React.FC<{ value: any; data: BusinessProcessRow }> = ({ value, data }) => (
    <Box
      component="span"
      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
      onClick={() => {
        const sp = buildWorkspaceSearch();
        navigate(`/master-data/business-processes/${data.id}/overview?${sp.toString()}`);
      }}
    >
      {value}
    </Box>
  );

  const ClickableCellFormatted: React.FC<{ value: any; valueFormatted?: any; data: BusinessProcessRow }> = ({
    value,
    valueFormatted,
    data,
  }) => (
    <Box
      component="span"
      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
      onClick={() => {
        const sp = buildWorkspaceSearch();
        navigate(`/master-data/business-processes/${data.id}/overview?${sp.toString()}`);
      }}
    >
      {valueFormatted ?? value}
    </Box>
  );

  const columns: EnhancedColDef<BusinessProcessRow>[] = useMemo(
    () => [
      { field: 'name', headerName: 'Name', flex: 1, required: true, cellRenderer: ClickableCell },
      {
        field: 'primary_category_name',
        headerName: 'Categories',
        flex: 1,
        valueFormatter: (p: any) => {
          const cats: Array<{ name: string }> = Array.isArray(p.data?.categories) ? p.data.categories : [];
          if (!cats.length) return '';
          const names = cats.map((c) => c.name);
          return names.join(', ');
        },
        cellRenderer: (params: any) =>
          ClickableCellFormatted({
            value: params.value,
            valueFormatted: params.valueFormatted,
            data: params.data as BusinessProcessRow,
          }),
      },
      {
        field: 'owner_name',
        headerName: 'Process Owner',
        width: 220,
        valueGetter: (p: any) => p.data?.owner_name || '',
        cellRenderer: (params: any) =>
          ClickableCellFormatted({
            value: params.value,
            valueFormatted: params.valueFormatted,
            data: params.data as BusinessProcessRow,
          }),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        filter: 'agSetColumnFilter',
        filterParams: { values: STATUS_VALUES, suppressMiniFilter: true },
        defaultHidden: true,
        cellRenderer: (params: any) =>
          ClickableCellFormatted({
            value: params.value,
            valueFormatted: params.valueFormatted,
            data: params.data as BusinessProcessRow,
          }),
      },
      {
        field: 'updated_at',
        headerName: 'Updated',
        width: 200,
        valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString() : ''),
        cellRenderer: (params: any) =>
          ClickableCellFormatted({
            value: params.value,
            valueFormatted: params.valueFormatted,
            data: params.data as BusinessProcessRow,
          }),
        defaultHidden: true,
      },
    ],
    [ClickableCell, ClickableCellFormatted],
  );

  const canCreate = hasLevel('business_processes', 'manager');
  const canAdmin = hasLevel('business_processes', 'admin');
  const canManageCategories = hasLevel('business_processes', 'manager');

  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const sp = buildWorkspaceSearch();
            navigate(`/master-data/business-processes/new/overview?${sp.toString()}`);
          }}
        >
          New
        </Button>
      )}
      {canManageCategories && (
        <Button onClick={() => setCategoryManagerOpen(true)}>
          Manage Categories
        </Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>Export CSV</Button>}
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/business-processes/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.name}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Business Processes" actions={actions} />
      <ServerDataGrid<BusinessProcessRow>
        columns={columns}
        endpoint="/business-processes"
        queryKey="business-processes"
        getRowId={(row) => row.id}
        enableSearch
        defaultSort={{ field: 'primary_category_name', direction: 'ASC' }}
        refreshKey={refreshKey}
        columnPreferencesKey="business-processes"
        enableColumnChooser
        statusScopeConfig={{ defaultScope: 'enabled' }}
        requiredColumns={['name']}
        defaultHiddenColumns={['updated_at']}
        enableRowSelection={canAdmin}
        onSelectionChanged={setSelectedRows}
        onGridApiReady={(api) => {
          gridApiRef.current = api;
        }}
        onQueryStateChange={(state) => {
          const scope = state.statusScope ?? 'enabled';
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {}, statusScope: scope };
        }}
      />
      <CsvExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        endpoint="/business-processes"
        title="Export Business Processes"
      />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/business-processes"
        title="Import Business Processes"
        onImported={() => setRefreshKey((k) => k + 1)}
      />
      <BusinessProcessCategoryManagerDialog
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        onUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
