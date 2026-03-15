import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Snackbar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Typography,
  CircularProgress,
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ICellRendererParams } from 'ag-grid-community';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageHeader from '../../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../../components/ServerDataGrid';
import { LinkCellRenderer } from '../../components/grid/renderers';
import { useAuth } from '../../auth/AuthContext';
import ForbiddenPage from '../ForbiddenPage';
import useItOpsEnumOptions from '../../hooks/useItOpsEnumOptions';
import DeleteSelectedButton from '../../components/DeleteSelectedButton';
import api from '../../api';

type InterfaceRow = {
  id: string;
  interface_id: string;
  name: string;
  business_process_id?: string | null;
  business_process_name?: string | null;
  source_application_name: string;
  target_application_name: string;
  lifecycle: string;
  criticality: string;
  data_category: string;
  contains_pii: boolean;
  bindings_count?: number;
  environment_coverage?: number;
  binding_environments?: string[];
  created_at: string;
};

export default function InterfacesPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const { labelFor } = useItOpsEnumOptions();
  const gridApiRef = useRef<any>(null);
  const [selectedRows, setSelectedRows] = useState<InterfaceRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterParams, setFilterParams] = useState<Record<string, any>>({});
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [copyBindings, setCopyBindings] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const canCreate = hasLevel('applications', 'manager');
  const canAdmin = hasLevel('applications', 'admin');

  const isPlainLeftClick = useCallback((event: React.MouseEvent) => {
    return (
      event.button === 0
      && !event.metaKey
      && !event.ctrlKey
      && !event.shiftKey
      && !event.altKey
    );
  }, []);

  const getInterfaceHref = useCallback((row: InterfaceRow | null | undefined) => {
    if (!row?.id) return undefined;
    return `/it/interfaces/${row.id}/overview`;
  }, []);

  const handleInternalNavigate = useCallback((event: React.MouseEvent, href: string | undefined) => {
    if (!href) return;
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    navigate(href);
  }, [isPlainLeftClick, navigate]);

  const handleOpenDuplicateDialog = () => {
    if (selectedRows.length !== 1) return;
    setCopyBindings(false);
    setDuplicateDialogOpen(true);
  };

  const handleCloseDuplicateDialog = () => {
    if (duplicating) return;
    setDuplicateDialogOpen(false);
  };

  const handleConfirmDuplicate = async () => {
    if (selectedRows.length !== 1) return;
    const row = selectedRows[0];
    setDuplicating(true);
    try {
      const response = await api.post<InterfaceRow>(`/interfaces/${row.id}/duplicate`, {
        copyBindings,
      });
      const newInterface = response.data;
      setSnackbar({
        open: true,
        message: `Interface duplicated as "${newInterface.name}"`,
        severity: 'success',
      });
      setRefreshKey((k) => k + 1);
      gridApiRef.current?.deselectAll?.();
      setDuplicateDialogOpen(false);
    } catch (error: any) {
      console.error('Duplicate error:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Failed to duplicate interface',
        severity: 'error',
      });
    } finally {
      setDuplicating(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const ClickToWorkspace = useMemo(() => {
    const Cell: React.FC<ICellRendererParams<InterfaceRow, any>> = (params) => (
      <LinkCellRenderer
        {...params}
        linkType="internal"
        getHref={getInterfaceHref}
        onNavigate={(href) => navigate(href)}
      />
    );
    return Cell;
  }, [getInterfaceHref, navigate]);

  const EnvPills = useMemo(() => {
    const Cell: React.FC<ICellRendererParams<InterfaceRow, any>> = (params) => {
      const envs = (params.data?.binding_environments || []) as string[];
      if (!envs || envs.length === 0) return null;
      return (
        <Link
          href={getInterfaceHref(params.data as InterfaceRow)}
          onClick={(event) => handleInternalNavigate(event, getInterfaceHref(params.data as InterfaceRow))}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            cursor: 'pointer',
            alignItems: 'center',
            height: '100%',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          {envs.map((env) => (
            <Chip
              key={env}
              size="small"
              variant="filled"
              color="primary"
              label={env.toUpperCase()}
            />
          ))}
        </Link>
      );
    };
    return Cell;
  }, [getInterfaceHref, handleInternalNavigate]);

  if (!hasLevel('applications', 'reader')) {
    return <ForbiddenPage />;
  }

  const columns: EnhancedColDef<InterfaceRow>[] = [
    {
      headerName: 'Interface ID',
      field: 'interface_id',
      width: 150,
      cellRenderer: ClickToWorkspace,
    },
    {
      headerName: 'Name',
      field: 'name',
      minWidth: 220,
      cellRenderer: ClickToWorkspace,
    },
    {
      headerName: 'Environments',
      field: 'binding_environments',
      width: 200,
      sortable: false,
      cellRenderer: EnvPills,
    },
    { headerName: 'Source App', field: 'source_application_name', width: 200, cellRenderer: ClickToWorkspace },
    {
      headerName: 'Target App',
      field: 'target_application_name',
      width: 200,
      cellRenderer: ClickToWorkspace,
    },
    {
      headerName: 'Lifecycle',
      field: 'lifecycle',
      width: 140,
       valueFormatter: (p) => labelFor('lifecycleStatus', p.value) || p.value || '',
      cellRenderer: ClickToWorkspace,
    },
    {
      headerName: 'Criticality',
      field: 'criticality',
      width: 140,
      cellRenderer: ClickToWorkspace,
    },
    { headerName: 'Created', field: 'created_at', width: 180, cellRenderer: ClickToWorkspace },
    {
      headerName: 'Business Process',
      field: 'business_process_id',
      width: 200,
      valueFormatter: (p) => p.data?.business_process_name || '',
      filter: 'agSetColumnFilter',
      cellRenderer: ClickToWorkspace,
      defaultHidden: true,
    },
    {
      headerName: 'Data Category',
      field: 'data_category',
      width: 120,
      filter: 'agSetColumnFilter',
      valueFormatter: (p) => labelFor('interfaceDataCategory', p.value) || p.value || '',
      cellRenderer: ClickToWorkspace,
      defaultHidden: true,
    },
    {
      headerName: 'Contains PII',
      field: 'contains_pii',
      width: 130,
      filter: 'agSetColumnFilter',
      valueFormatter: (p) => (p.value ? 'Yes' : 'No'),
      cellRenderer: ClickToWorkspace,
      defaultHidden: true,
    },
    {
      headerName: 'Env Coverage',
      field: 'environment_coverage',
      width: 140,
      sortable: false,
      filter: false,
      valueFormatter: (p) => p.value ?? 0,
      cellRenderer: ClickToWorkspace,
      defaultHidden: true,
    },
    {
      headerName: 'Bindings',
      field: 'bindings_count',
      width: 120,
      sortable: false,
      filter: false,
      valueFormatter: (p) => p.value ?? 0,
      cellRenderer: ClickToWorkspace,
      defaultHidden: true,
    },
  ];

  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && (
        <Button variant="contained" onClick={() => navigate('/it/interfaces/new/overview')}>
          Add interface
        </Button>
      )}
      {canCreate && (
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={handleOpenDuplicateDialog}
          disabled={selectedRows.length !== 1 || duplicating}
          size="small"
        >
          Duplicate interface
        </Button>
      )}
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/interfaces/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.name}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
          label="Delete interface"
          cascadeOption={{
            label: 'Also delete related bindings',
            description: 'If unchecked, interfaces with bindings will not be deleted.',
            apiKey: 'deleteRelatedBindings',
          }}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Interfaces" actions={actions} />
      <ServerDataGrid<InterfaceRow>
        columns={columns}
        endpoint="/interfaces"
        showRowCount
        queryKey="interfaces"
        extraParams={filterParams}
        enableColumnChooser
        enableSearch
        defaultSort={{ field: 'created_at', direction: 'DESC' }}
        columnPreferencesKey="it-interfaces"
        refreshKey={refreshKey}
        enableRowSelection={canAdmin}
        onSelectionChanged={setSelectedRows}
        onGridApiReady={(api) => {
          gridApiRef.current = api;
        }}
        onQueryStateChange={(state) => {
          const fm = state.filterModel || {};
          const extractFilterValue = (model: any): string | null => {
            if (!model) return null;
            if (Array.isArray(model.conditions) && model.conditions.length > 0) {
              return extractFilterValue(model.conditions[0]);
            }
            if (model.filter != null) return String(model.filter);
            if (Array.isArray(model.values) && model.values.length > 0) {
              return String(model.values[0]);
            }
            if (model.value != null) return String(model.value);
            return null;
          };

          const next: Record<string, any> = {};

          const lifecycleVal = extractFilterValue(fm.lifecycle);
          if (lifecycleVal) next.lifecycle = lifecycleVal;

          const criticalityVal = extractFilterValue(fm.criticality);
          if (criticalityVal) next.criticality = criticalityVal;

          const dataCategoryVal = extractFilterValue(fm.data_category);
          if (dataCategoryVal) next.data_category = dataCategoryVal;

          const dataClassVal = extractFilterValue(fm.data_class);
          if (dataClassVal) next.data_class = dataClassVal;

          const routeVal = extractFilterValue(fm.integration_route_type);
          if (routeVal) next.integration_route_type = routeVal;

          const bpVal = extractFilterValue(fm.business_process_id);
          if (bpVal) next.business_process_id = bpVal;

          const piiVal = extractFilterValue(fm.contains_pii);
          if (piiVal != null) next.contains_pii = piiVal;

          const prevKey = JSON.stringify(filterParams || {});
          const nextKey = JSON.stringify(next);
          if (prevKey !== nextKey) {
            setFilterParams(next);
          }
        }}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Duplicate Interface Dialog */}
      <Dialog open={duplicateDialogOpen} onClose={handleCloseDuplicateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Duplicate Interface</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a copy of "{selectedRows[0]?.name || 'this interface'}".
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={copyBindings}
                onChange={(e) => setCopyBindings(e.target.checked)}
                disabled={duplicating}
              />
            }
            label="Copy environment bindings"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
            Instance connections will be preserved, but environment-specific details (endpoints, authentication, job names) will be cleared.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDuplicateDialog} disabled={duplicating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDuplicate}
            variant="contained"
            disabled={duplicating}
            startIcon={duplicating ? <CircularProgress size={16} /> : undefined}
          >
            {duplicating ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
