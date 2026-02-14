import React, { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../components/ServerDataGrid';
import { Box, Button, Stack } from '@mui/material';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import { useAuth } from '../auth/AuthContext';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import { useNavigate } from 'react-router-dom';
import ForbiddenPage from './ForbiddenPage';

export default function ContactsPage() {
  const { hasLevel } = useAuth();
  const navigate = useNavigate();

  if (!hasLevel('contacts', 'reader')) {
    return <ForbiddenPage />;
  }

  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const gridApiRef = useRef<any>(null);
  const lastQueryRef = useRef<{ sort: string; q: string; filters: any } | null>(null);
  const buildWorkspaceSearch = () => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'last_name:ASC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    return sp;
  };
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const ClickableCell: React.FC<any> = (params) => (
    <Box
      component="span"
      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
      onClick={() => {
        const sp = buildWorkspaceSearch();
        navigate(`/master-data/contacts/${params.data?.id}/overview?${sp.toString()}`);
      }}
    >
      {params.valueFormatted ?? (params.value != null ? String(params.value) : '')}
    </Box>
  );

  const columns: EnhancedColDef<any>[] = useMemo(() => [
    { field: 'last_name', headerName: 'Last Name', width: 160, cellRenderer: ClickableCell },
    { field: 'first_name', headerName: 'First Name', width: 160, cellRenderer: ClickableCell },
    { field: 'supplier_name', headerName: 'Supplier', width: 200, cellRenderer: ClickableCell },
    { field: 'job_title', headerName: 'Job Title', width: 200, defaultHidden: true, cellRenderer: ClickableCell },
    { field: 'email', headerName: 'Email', flex: 1, cellRenderer: ClickableCell },
    { field: 'phone', headerName: 'Phone', width: 140, defaultHidden: true, cellRenderer: ClickableCell },
    { field: 'mobile', headerName: 'Mobile', width: 140, defaultHidden: true, cellRenderer: ClickableCell },
    { field: 'country', headerName: 'Country', width: 120, defaultHidden: true, cellRenderer: ClickableCell },
    { field: 'active', headerName: 'Active', width: 120, valueFormatter: (p: any) => (p.value ? 'Yes' : 'No'), cellRenderer: ClickableCell },
    { field: 'created_at', headerName: 'Created', width: 200, valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString() : ''), defaultHidden: true, cellRenderer: ClickableCell },
  ], []);

  const canCreate = hasLevel('contacts','manager');
  const canAdmin = hasLevel('contacts','admin');
  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && (
        <Button variant="contained" onClick={() => {
          const sp = buildWorkspaceSearch();
          navigate(`/master-data/contacts/new/overview?${sp.toString()}`);
        }}>New</Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>Export CSV</Button>}
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/contacts/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => (row.first_name || row.last_name) ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : row.email}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Contacts" actions={actions} />
      <ServerDataGrid<any>
        columns={columns}
        endpoint="/contacts"
        queryKey="contacts"
        getRowId={(r) => r.id}
        enableSearch
        defaultSort={{ field: 'last_name', direction: 'ASC' }}
        refreshKey={refreshKey}
        columnPreferencesKey="contacts"
        enableColumnChooser={true}
        requiredColumns={['email']}
        defaultHiddenColumns={['job_title','phone','mobile','country','created_at']}
        enableRowSelection={canAdmin}
        onSelectionChanged={setSelectedRows}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        onQueryStateChange={(state) => {
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {} };
        }}
      />
      <CsvExportDialog open={exportOpen} onClose={() => setExportOpen(false)} endpoint="/contacts" title="Export Contacts" />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/contacts"
        title="Import Contacts"
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
