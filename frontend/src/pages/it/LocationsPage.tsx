import React, { useCallback, useMemo, useRef } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../../components/ServerDataGrid';
import { useAuth } from '../../auth/AuthContext';
import ForbiddenPage from '../ForbiddenPage';
import { COUNTRY_OPTIONS } from '../../constants/isoOptions';
import useItOpsEnumOptions from '../../hooks/useItOpsEnumOptions';

type LocationRow = {
  id: string;
  code: string;
  name: string;
  hosting_type: string;
  provider: string | null;
  operating_company_name?: string | null;
  country_iso: string | null;
  city: string | null;
  servers_count?: number;
  created_at: string;
};

export default function LocationsPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const { labelFor, settings } = useItOpsEnumOptions();

  if (!hasLevel('locations', 'reader')) {
    return <ForbiddenPage />;
  }
  const hostingTypeCategory = useCallback(
    (code?: string) => {
      if (!code) return 'cloud';
      const opt = settings?.hostingTypes?.find((item) => item.code === code);
      return opt?.category === 'on_prem' ? 'on_prem' : 'cloud';
    },
    [settings?.hostingTypes],
  );

  const countryNameMap = useMemo(() => {
    return new Map(COUNTRY_OPTIONS.map((c) => [c.code.toUpperCase(), c.name]));
  }, []);

  const lastQueryRef = useRef<{ sort: string; q: string; filters: any } | null>(null);
  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const state = lastQueryRef.current;
    if (state?.sort) sp.set('sort', state.sort);
    if (state?.q) sp.set('q', state.q);
    if (state?.filters && Object.keys(state.filters || {}).length > 0) {
      sp.set('filters', JSON.stringify(state.filters));
    }
    return sp;
  }, []);

  const ClickableCell = useMemo(() => {
    const Cell: React.FC<ICellRendererParams<LocationRow, any>> = (params) => (
      <Box
        component="span"
        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
        title={params.valueFormatted ?? params.value}
        onClick={() => {
          const id = params.data?.id;
          if (!id) return;
          const sp = buildWorkspaceSearch();
          const qs = sp.toString();
          navigate(`/it/locations/${id}/overview${qs ? `?${qs}` : ''}`);
        }}
      >
        {params.valueFormatted ?? params.value}
      </Box>
    );
    return Cell;
  }, [buildWorkspaceSearch, navigate]);

  const columns: EnhancedColDef<LocationRow>[] = [
    { headerName: 'Code', field: 'code', minWidth: 140, filter: 'agTextColumnFilter', cellRenderer: ClickableCell },
    { headerName: 'Name', field: 'name', minWidth: 200, filter: 'agTextColumnFilter', cellRenderer: ClickableCell },
    {
      headerName: 'Hosting type',
      field: 'hosting_type',
      width: 160,
      filter: 'agSetColumnFilter',
      valueFormatter: (p) => labelFor('hostingType', p.value) || p.value || '',
      cellRenderer: ClickableCell,
    },
    {
      headerName: 'Provider / Company',
      field: 'provider',
      minWidth: 200,
      valueGetter: (params) => {
        const row = params.data as LocationRow | undefined;
        if (!row) return '';
        const category = hostingTypeCategory(row.hosting_type);
        if (category === 'on_prem') {
          return row.operating_company_name || '—';
        }
        if (row.provider) {
          return labelFor('serverProvider', row.provider) || row.provider;
        }
        return '—';
      },
      cellRenderer: ClickableCell,
    },
    {
      headerName: 'Country',
      field: 'country_iso',
      width: 180,
      valueFormatter: (p) => {
        const raw = (p.value || '').toString().toUpperCase();
        if (!raw) return '';
        const name = countryNameMap.get(raw) || raw;
        return `${name} (${raw})`;
      },
      cellRenderer: ClickableCell,
    },
    { headerName: 'City', field: 'city', width: 160, filter: 'agTextColumnFilter', cellRenderer: ClickableCell },
    {
      headerName: 'Assets',
      field: 'servers_count',
      width: 120,
      filter: false,
      valueFormatter: (p) => (p.value == null ? '0' : String(p.value)),
      cellRenderer: ClickableCell,
    },
    { headerName: 'Created', field: 'created_at', width: 180, cellRenderer: ClickableCell },
  ];

  const actions = (
    <Stack direction="row" spacing={1}>
      {hasLevel('locations', 'manager') && (
        <Button variant="contained" onClick={() => navigate('/it/locations/new/overview')}>
          Add Location
        </Button>
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Locations" actions={actions} />
      <ServerDataGrid<LocationRow>
        columns={columns}
        endpoint="/locations"
        queryKey="locations"
        defaultSort={{ field: 'created_at', direction: 'DESC' }}
        enableSearch
        enableColumnChooser
        columnPreferencesKey="it-locations"
        onQueryStateChange={(state) => {
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {} };
        }}
      />
    </>
  );
}
