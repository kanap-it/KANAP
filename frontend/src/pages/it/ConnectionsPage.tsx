import React, { useMemo, useRef, useState } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../../components/ServerDataGrid';
import { LinkCellRenderer } from '../../components/grid/renderers';
import { useAuth } from '../../auth/AuthContext';
import ForbiddenPage from '../ForbiddenPage';
import useItOpsEnumOptions from '../../hooks/useItOpsEnumOptions';
import DeleteSelectedButton from '../../components/DeleteSelectedButton';

type ConnectionRow = {
  id: string;
  connection_id: string;
  name: string;
  topology: 'server_to_server' | 'multi_server';
  lifecycle: string;
  criticality: string;
  data_class: string;
  contains_pii: boolean;
  risk_mode: 'manual' | 'derived';
  effective_criticality?: string;
  effective_data_class?: string;
  effective_contains_pii?: boolean;
  derived_interface_count?: number;
  source_label?: string | null;
  destination_label?: string | null;
  protocol_labels?: string[];
  multi_server_count?: number;
  created_at: string;
};

const topologyLabel = (v?: string) => {
  if (v === 'server_to_server') return 'Server to Server';
  if (v === 'multi_server') return 'Multi-server';
  return v || '';
};

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const { labelFor } = useItOpsEnumOptions();
  const gridApiRef = useRef<any>(null);
  const [selectedRows, setSelectedRows] = useState<ConnectionRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterParams, setFilterParams] = useState<Record<string, any>>({});

  const getConnectionHref = (row: ConnectionRow) => `/it/connections/${row.id}/overview`;

  const ClickToWorkspace = useMemo(() => {
    const Cell: React.FC<ICellRendererParams<ConnectionRow, any>> = (params) => (
      <LinkCellRenderer
        {...params}
        linkType="internal"
        getHref={getConnectionHref}
        onNavigate={(href) => navigate(href)}
      />
    );
    return Cell;
  }, [navigate]);

  const ProtocolPills = useMemo(() => {
    const Cell: React.FC<ICellRendererParams<ConnectionRow, any>> = (params) => {
      const list = params.data?.protocol_labels || [];
      if (!list.length) return null;
      return (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {list.slice(0, 4).map((label) => (
            <Chip key={label} size="small" label={label} />
          ))}
          {list.length > 4 && (
            <Typography variant="body2" color="text.secondary">
              +{list.length - 4}
            </Typography>
          )}
        </Stack>
      );
    };
    return Cell;
  }, []);

  if (!hasLevel('infrastructure', 'reader')) {
    return <ForbiddenPage />;
  }

  const columns: EnhancedColDef<ConnectionRow>[] = [
    { headerName: 'Connection ID', field: 'connection_id', width: 160, cellRenderer: ClickToWorkspace },
    { headerName: 'Name', field: 'name', minWidth: 200, cellRenderer: ClickToWorkspace },
    {
      headerName: 'Topology',
      field: 'topology',
      width: 150,
      valueFormatter: (p) => topologyLabel(p.value),
      cellRenderer: ClickToWorkspace,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Source',
      field: 'source_label',
      minWidth: 180,
      cellRenderer: ClickToWorkspace,
      sortable: false,
      filter: false,
    },
    {
      headerName: 'Destination',
      field: 'destination_label',
      minWidth: 180,
      cellRenderer: ClickToWorkspace,
      sortable: false,
      filter: false,
    },
    {
      headerName: 'Servers',
      field: 'multi_server_count',
      width: 110,
      valueFormatter: (p) => p.value ?? 0,
      cellRenderer: ClickToWorkspace,
      sortable: false,
      filter: false,
      defaultHidden: true,
    },
    {
      headerName: 'Protocols',
      field: 'protocol_labels',
      minWidth: 220,
      cellRenderer: ProtocolPills,
      sortable: false,
      filter: false,
    },
    {
      headerName: 'Criticality',
      field: 'criticality',
      width: 150,
      valueFormatter: (p) => {
        const row = p.data as ConnectionRow | undefined;
        const value = row?.effective_criticality || p.value;
        switch (String(value || '')) {
          case 'business_critical': return 'Business critical';
          case 'high': return 'High';
          case 'medium': return 'Medium';
          case 'low': return 'Low';
          default: return value || '';
        }
      },
      cellRenderer: ClickToWorkspace,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Data class',
      field: 'data_class',
      width: 140,
      valueFormatter: (p) => {
        const row = p.data as ConnectionRow | undefined;
        const value = row?.effective_data_class || p.value;
        return labelFor('dataClass', value) || (value || '');
      },
      cellRenderer: ClickToWorkspace,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'PII',
      field: 'contains_pii',
      width: 110,
      valueFormatter: (p) => {
        const row = p.data as ConnectionRow | undefined;
        const value = typeof row?.effective_contains_pii === 'boolean' ? row.effective_contains_pii : p.value;
        return value ? 'Yes' : 'No';
      },
      cellRenderer: ClickToWorkspace,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Risk',
      field: 'risk_mode',
      width: 180,
      valueFormatter: (p) => {
        const row = p.data as ConnectionRow | undefined;
        if (!row) return p.value || '';
        if (row.risk_mode === 'derived') {
          const n = row.derived_interface_count || 0;
          return n > 0 ? `Derived from ${n} interfaces` : 'Derived (no interfaces linked)';
        }
        return 'Manual';
      },
      cellRenderer: ClickToWorkspace,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Lifecycle',
      field: 'lifecycle',
      width: 140,
      valueFormatter: (p) => labelFor('lifecycleStatus', p.value) || (p.value || ''),
      cellRenderer: ClickToWorkspace,
      filter: 'agSetColumnFilter',
    },
    { headerName: 'Created', field: 'created_at', width: 180, cellRenderer: ClickToWorkspace },
  ];

  const actions = (
    <Stack direction="row" spacing={1}>
      {hasLevel('infrastructure', 'member') && (
        <Button variant="contained" onClick={() => navigate('/it/connections/new/overview')}>
          Add connection
        </Button>
      )}
      {hasLevel('infrastructure', 'admin') && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/connections/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.name}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => setRefreshKey((k) => k + 1)}
          label="Delete connection"
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Connections" actions={actions} />
      <ServerDataGrid<ConnectionRow>
        columns={columns}
        endpoint="/connections"
        queryKey="connections"
        extraParams={filterParams}
        enableSearch
        enableColumnChooser
        defaultSort={{ field: 'created_at', direction: 'DESC' }}
        columnPreferencesKey="it-connections"
        refreshKey={refreshKey}
        enableRowSelection={hasLevel('infrastructure', 'admin')}
        onSelectionChanged={setSelectedRows}
        onGridApiReady={(api) => {
          gridApiRef.current = api;
        }}
        onQueryStateChange={(state) => {
          const fm = state.filterModel || {};
          const extractSetValue = (model: any): string | null => {
            if (!model) return null;
            if (Array.isArray(model.values) && model.values.length > 0) return String(model.values[0]);
            if (Array.isArray(model.conditions) && model.conditions.length > 0) {
              return extractSetValue(model.conditions[0]);
            }
            if (model.value != null) return String(model.value);
            return null;
          };
          const next: Record<string, any> = {};
          const topo = extractSetValue(fm.topology);
          if (topo) next.topology = topo;
          const lifecycle = extractSetValue(fm.lifecycle);
          if (lifecycle) next.lifecycle = lifecycle;
          const criticality = extractSetValue(fm.criticality);
          if (criticality) next.criticality = criticality;
          const dataClass = extractSetValue(fm.data_class);
          if (dataClass) next.data_class = dataClass;
          if (fm.contains_pii && Array.isArray(fm.contains_pii.values) && fm.contains_pii.values.length > 0) {
            next.contains_pii = fm.contains_pii.values[0];
          }
          if (JSON.stringify(next) !== JSON.stringify(filterParams)) {
            setFilterParams(next);
          }
        }}
      />
    </>
  );
}
