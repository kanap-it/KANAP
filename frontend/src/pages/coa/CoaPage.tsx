import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import ServerDataGrid, { EnhancedColDef, StatusScope } from '../../components/ServerDataGrid';
import CsvExportDialog from '../../components/csv/CsvExportDialog';
import CsvImportDialog from '../../components/csv/CsvImportDialog';
import DeleteSelectedButton from '../../components/DeleteSelectedButton';
import ForbiddenPage from '../ForbiddenPage';
import { STATUS_VALUES } from '../../constants/status';
import { useAuth } from '../../auth/AuthContext';
import CoaChipBar from './CoaChipBar';
import CreateCoADialog from './CreateCoADialog';
import ManageCoAsDialog from './ManageCoAsDialog';
import { CoaListItem, useCoaList } from './useCoaList';

type AccountRow = {
  id: string;
  account_number: number | string;
  account_name: string;
  native_name?: string | null;
  description?: string | null;
  consolidation_account_number?: number | null;
  consolidation_account_name?: string | null;
  consolidation_account_description?: string | null;
  created_at?: string;
  status?: string;
};

function pickFallbackCoaId(coas: CoaListItem[]): string | undefined {
  return (
    coas.find((item) => item.is_default)?.id ||
    coas.find((item) => item.is_global_default)?.id ||
    coas[0]?.id
  );
}

export default function CoaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasLevel } = useAuth();
  const { coas, isLoading, refetch, isError } = useCoaList();

  if (!hasLevel('accounts', 'reader')) {
    return <ForbiddenPage />;
  }

  const canManage = hasLevel('accounts', 'manager');
  const canAdmin = hasLevel('accounts', 'admin');
  const canCreateAccount = hasLevel('accounts', 'manager');

  const selectedFromUrl = searchParams.get('selected') || searchParams.get('coaId') || '';
  const selectedCoaId = useMemo(() => {
    if (!selectedFromUrl) return undefined;
    return coas.some((item) => item.id === selectedFromUrl) ? selectedFromUrl : undefined;
  }, [coas, selectedFromUrl]);
  const selectedCoa = useMemo(
    () => coas.find((item) => item.id === selectedCoaId),
    [coas, selectedCoaId],
  );

  useEffect(() => {
    if (coas.length === 0) return;
    const currentSelected = searchParams.get('selected');
    const hasLegacyParam = searchParams.has('coaId');

    if (selectedCoaId) {
      if (hasLegacyParam) {
        const next = new URLSearchParams(searchParams);
        next.set('selected', selectedCoaId);
        next.delete('coaId');
        setSearchParams(next, { replace: true });
      }
      return;
    }

    const fallbackCoaId = pickFallbackCoaId(coas);
    if (!fallbackCoaId) return;
    if (currentSelected === fallbackCoaId && !hasLegacyParam) return;
    const next = new URLSearchParams(searchParams);
    next.set('selected', fallbackCoaId);
    next.delete('coaId');
    setSearchParams(next, { replace: true });
  }, [coas, searchParams, selectedCoaId, setSearchParams]);

  const [accountsRefreshKey, setAccountsRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createCoaOpen, setCreateCoaOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<AccountRow[]>([]);
  const gridApiRef = useRef<any>(null);

  useEffect(() => {
    setSelectedRows([]);
    setAccountsRefreshKey((key) => key + 1);
  }, [selectedCoaId]);

  const lastQueryRef = useRef<{ sort: string; q: string; filters: any; statusScope?: StatusScope } | null>(null);
  const buildWorkspaceSearch = useCallback(() => {
    const params = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'account_number:ASC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) params.set('sort', sort);
    if (q) params.set('q', q);
    if (filters && Object.keys(filters).length > 0) params.set('filters', JSON.stringify(filters));
    if (selectedCoaId) {
      params.set('selected', selectedCoaId);
      params.set('coaId', selectedCoaId);
    }
    return params;
  }, [selectedCoaId]);

  const navigateToAccount = useCallback((accountId: string) => {
    const params = buildWorkspaceSearch();
    navigate(`/master-data/accounts/${accountId}/overview?${params.toString()}`);
  }, [buildWorkspaceSearch, navigate]);

  const ClickableCell: React.FC<ICellRendererParams<any, any>> = (params) => {
    const nativeName = params.data?.native_name;
    const showTooltip = nativeName && nativeName !== params.value;
    return (
      <Box
        component="span"
        title={showTooltip ? nativeName : undefined}
        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
        onClick={() => navigateToAccount(String(params.data?.id))}
      >
        {params.value}
      </Box>
    );
  };

  const ClickableCellGeneric: React.FC<ICellRendererParams<any, any>> = (params) => (
    <Box
      component="span"
      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
      onClick={() => navigateToAccount(String(params.data?.id))}
    >
      {params.valueFormatted ?? params.value}
    </Box>
  );

  const columns: EnhancedColDef<AccountRow>[] = useMemo(() => [
    { field: 'account_number', headerName: 'Account #', width: 160, required: true, cellRenderer: ClickableCell },
    { field: 'account_name', headerName: 'Name', flex: 1, required: true, cellRenderer: ClickableCell },
    { field: 'native_name', headerName: 'Native Name', width: 220, defaultHidden: true, cellRenderer: ClickableCellGeneric },
    { field: 'description', headerName: 'Description', width: 250, defaultHidden: true, cellRenderer: ClickableCellGeneric },
    { field: 'consolidation_account_number', headerName: 'Consol. Account #', width: 180, cellRenderer: ClickableCellGeneric },
    { field: 'consolidation_account_name', headerName: 'Consol. Name', width: 250, cellRenderer: ClickableCellGeneric },
    { field: 'consolidation_account_description', headerName: 'Consol. Description', width: 300, defaultHidden: true, cellRenderer: ClickableCellGeneric },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      filter: 'agSetColumnFilter',
      filterParams: { values: STATUS_VALUES, suppressMiniFilter: true },
      cellRenderer: ClickableCellGeneric,
      defaultHidden: true,
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 200,
      valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString() : ''),
      defaultHidden: true,
      cellRenderer: ClickableCellGeneric,
    },
  ], [ClickableCell]);

  const updateSelectedCoa = useCallback((coaId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('selected', coaId);
    next.delete('coaId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreateAccount && (
        <Button
          variant="contained"
          onClick={() => {
            const params = buildWorkspaceSearch();
            navigate(`/master-data/accounts/new/overview?${params.toString()}`);
          }}
          disabled={!selectedCoaId}
        >
          New Account
        </Button>
      )}
      {canAdmin && (
        <Button onClick={() => setImportOpen(true)} disabled={!selectedCoaId}>
          Import CSV
        </Button>
      )}
      {canAdmin && (
        <Button onClick={() => setExportOpen(true)} disabled={!selectedCoaId}>
          Export CSV
        </Button>
      )}
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/accounts/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.account_name}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => setAccountsRefreshKey((key) => key + 1)}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Charts of Accounts" actions={actions} />
      <Stack spacing={2}>
        {isError && (
          <Alert severity="error">
            Failed to load charts of accounts.
          </Alert>
        )}

        {!isLoading && (
          <CoaChipBar
            coas={coas}
            selectedCoaId={selectedCoaId}
            onSelect={updateSelectedCoa}
            onCreate={() => setCreateCoaOpen(true)}
            onManage={() => setManageOpen(true)}
            canManage={canManage}
          />
        )}

        {!!selectedCoa && (
          <Stack spacing={0.5}>
            <Typography variant="h6">
              {selectedCoa.code} · {selectedCoa.accounts_count ?? 0} accounts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedCoa.name}
              {selectedCoa.scope === 'COUNTRY' && selectedCoa.country_iso ? ` · ${selectedCoa.country_iso}` : ''}
            </Typography>
          </Stack>
        )}

        {isLoading && <Alert severity="info">Loading Charts of Accounts…</Alert>}

        {coas.length > 0 && selectedCoaId && (
          <ServerDataGrid<AccountRow>
            columns={columns}
            endpoint="/accounts"
            queryKey="accounts"
            extraParams={{ coaId: selectedCoaId }}
            getRowId={(row) => row.id}
            enableSearch
            defaultSort={{ field: 'account_number', direction: 'ASC' }}
            refreshKey={accountsRefreshKey}
            columnPreferencesKey="accounts"
            enableColumnChooser={true}
            statusScopeConfig={{ defaultScope: 'enabled' }}
            requiredColumns={['account_number', 'account_name']}
            defaultHiddenColumns={['description', 'consolidation_account_description', 'created_at']}
            enableRowSelection={canAdmin}
            onSelectionChanged={setSelectedRows}
            onGridApiReady={(apiInstance) => {
              gridApiRef.current = apiInstance;
            }}
            onQueryStateChange={(state) => {
              lastQueryRef.current = {
                sort: state.sort,
                q: state.q || '',
                filters: state.filterModel || {},
                statusScope: state.statusScope,
              };
            }}
          />
        )}
      </Stack>

      <CreateCoADialog
        open={createCoaOpen}
        onClose={() => setCreateCoaOpen(false)}
        onCreated={(newId) => {
          setCreateCoaOpen(false);
          updateSelectedCoa(newId);
          void refetch();
        }}
      />

      <ManageCoAsDialog
        open={manageOpen}
        onClose={() => {
          setManageOpen(false);
          void refetch();
        }}
        onCoaCreated={(newId) => {
          updateSelectedCoa(newId);
          void refetch();
        }}
        onCoaDeleted={() => {
          void refetch();
        }}
        onCoaUpdated={() => {
          void refetch();
        }}
      />

      <CsvExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        endpoint={selectedCoaId ? `/chart-of-accounts/${selectedCoaId}/accounts` : '/accounts'}
        title="Export Accounts"
      />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint={selectedCoaId ? `/chart-of-accounts/${selectedCoaId}/accounts` : '/accounts'}
        title="Import Accounts into selected CoA"
        onImported={() => setAccountsRefreshKey((key) => key + 1)}
      />
    </>
  );
}
