import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellStyle } from 'ag-grid-community';
import ReportLayout from '../../../components/reports/ReportLayout';
import {
  copyMasterData,
  MasterDataCopyError,
  MasterDataCopyRequest,
  MasterDataCopyResponse,
  MasterDataCopyResultItem,
  MasterDataMetric,
} from '../../../services/masterDataOperations';
import { useFreezeState } from '../../../hooks/useFreezeState';
import { useAuth } from '../../../auth/AuthContext';

const YEARS_SPAN = 7;
const COMPANY_METRIC_OPTIONS: { value: MasterDataMetric; label: string }[] = [
  { value: 'headcount', label: 'Headcount' },
  { value: 'it_users', label: 'IT Users' },
  { value: 'turnover', label: 'Turnover' },
];

type ScopeOption = 'companies' | 'departments';

type GridRow = MasterDataCopyResultItem;

function useYearOptions() {
  const currentYear = new Date().getFullYear();
  return React.useMemo(() => Array.from({ length: YEARS_SPAN }, (_, idx) => currentYear - 1 + idx), [currentYear]);
}

function metricLabel(metric: MasterDataMetric) {
  const entry = COMPANY_METRIC_OPTIONS.find((m) => m.value === metric);
  return entry ? entry.label : metric;
}

function formatValue(value: number | null, metric: MasterDataMetric) {
  if (value == null) return '—';
  const options = metric === 'turnover'
    ? { minimumFractionDigits: 0, maximumFractionDigits: 3 }
    : { minimumFractionDigits: 0, maximumFractionDigits: 0 };
  return Number(value).toLocaleString(undefined, options);
}

export default function MasterDataCopyPage() {
  const years = useYearOptions();
  const { hasLevel } = useAuth();
  const canManageCompanies = hasLevel('companies', 'admin') || hasLevel('budget_ops', 'admin');
  const canManageDepartments = hasLevel('departments', 'admin') || hasLevel('budget_ops', 'admin');

  const [sourceYear, setSourceYear] = React.useState<number>(years[0] ?? new Date().getFullYear());
  const [destinationYear, setDestinationYear] = React.useState<number>(years[1] ?? years[0] ?? new Date().getFullYear());
  const [selectedScopes, setSelectedScopes] = React.useState<ScopeOption[]>(['companies']);
  const [companyMetrics, setCompanyMetrics] = React.useState<MasterDataMetric[]>(['headcount', 'it_users', 'turnover']);
  const [previewData, setPreviewData] = React.useState<GridRow[]>([]);
  const [summary, setSummary] = React.useState<MasterDataCopyResponse['summary'] | null>(null);
  const [errors, setErrors] = React.useState<MasterDataCopyError[]>([]);
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [hasPreview, setHasPreview] = React.useState<boolean>(false);

  React.useEffect(() => {
    setSelectedScopes((prev) => {
      const allowed = prev.filter((scope) => (scope === 'companies' ? canManageCompanies : canManageDepartments));
      if (allowed.length > 0) return allowed;
      if (canManageCompanies) return ['companies'];
      if (canManageDepartments) return ['departments'];
      return [];
    });
  }, [canManageCompanies, canManageDepartments]);

  React.useEffect(() => {
    setPreviewData([]);
    setSummary(null);
    setErrors([]);
    setHasPreview(false);
    setFeedback(null);
  }, [sourceYear, destinationYear, selectedScopes, companyMetrics]);

  const includeCompanies = selectedScopes.includes('companies') && canManageCompanies;
  const includeDepartments = selectedScopes.includes('departments') && canManageDepartments;

  const { data: freezeData, isLoading: freezeLoading } = useFreezeState(destinationYear);
  const companiesFrozen = freezeData?.summary?.scopes.companies.frozen ?? false;
  const departmentsFrozen = freezeData?.summary?.scopes.departments.frozen ?? false;
  const blockedScopes: ScopeOption[] = [];
  if (includeCompanies && companiesFrozen) blockedScopes.push('companies');
  if (includeDepartments && departmentsFrozen) blockedScopes.push('departments');
  const hasFrozenBlocking = blockedScopes.length > 0;

  const gridApiRef = React.useRef<any>(null);

  const columns = React.useMemo<ColDef[]>(() => [
    {
      field: 'entityType',
      headerName: 'Type',
      width: 120,
      valueFormatter: (params) => (params.value === 'company' ? 'Company' : 'Department'),
      cellStyle: (params) => params.data?.skipped ? { color: '#e65100' } : undefined,
    },
    {
      field: 'entityName',
      headerName: 'Name',
      flex: 1,
      minWidth: 220,
      cellStyle: (params) => params.data?.skipped ? { color: '#e65100' } : undefined,
    },
    {
      field: 'metric',
      headerName: 'Metric',
      width: 160,
      valueFormatter: (params) => metricLabel(params.value as MasterDataMetric),
      cellStyle: (params) => params.data?.skipped ? { color: '#e65100' } : undefined,
    },
    {
      field: 'sourceValue',
      headerName: 'Source Value',
      width: 160,
      type: 'rightAligned',
      valueFormatter: (params) => formatValue(params.value ?? null, params.data.metric),
      cellStyle: (params) => params.data?.skipped ? { color: '#e65100' } : undefined,
    },
    {
      field: 'destinationValue',
      headerName: 'Current Destination',
      width: 180,
      type: 'rightAligned',
      valueFormatter: (params) => formatValue(params.value ?? null, params.data.metric),
      cellStyle: (params) => params.data?.skipped ? { color: '#e65100' } : undefined,
    },
    {
      field: 'newValue',
      headerName: 'New Value',
      width: 160,
      type: 'rightAligned',
      valueFormatter: (params) => formatValue(params.value ?? null, params.data.metric),
      cellStyle: (params): CellStyle => {
        if (params.data?.skipped) {
          return { color: '#e65100', backgroundColor: '#fff3e0', fontWeight: '600' };
        }
        return { fontWeight: '600' };
      },
    },
    {
      field: 'reason',
      headerName: 'Status',
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => {
        if (params.data?.skipped) {
          return params.data.reason ?? 'Skipped';
        }
        return 'Ready to copy';
      },
      cellStyle: (params) => params.data?.skipped ? { color: '#e65100' } : { color: '#1b5e20' },
    },
  ], []);

  const disabledScopes: Record<ScopeOption, boolean> = React.useMemo(() => ({
    companies: !canManageCompanies,
    departments: !canManageDepartments,
  }), [canManageCompanies, canManageDepartments]);

  const handleScopeChange = (event: SelectChangeEvent<string[]>) => {
    const values = event.target.value as string[];
    setSelectedScopes(values.filter((v): v is ScopeOption => v === 'companies' || v === 'departments'));
  };

  const handleMetricChange = (event: SelectChangeEvent<string[]>) => {
    const values = (event.target.value as string[]).filter((v) => v === 'headcount' || v === 'it_users' || v === 'turnover');
    setCompanyMetrics(values as MasterDataMetric[]);
  };

  const buildPayload = React.useCallback((dryRun: boolean): MasterDataCopyRequest => ({
    sourceYear,
    destinationYear,
    includeCompanies,
    includeDepartments,
    companyMetrics: includeCompanies ? companyMetrics : [],
    dryRun,
  }), [sourceYear, destinationYear, includeCompanies, includeDepartments, companyMetrics]);

  const runOperation = async (dryRun: boolean) => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const response = await copyMasterData(buildPayload(dryRun));
      setPreviewData(response.results);
      setSummary(response.summary);
      setErrors(response.errors ?? []);
      setHasPreview(true);
      if (!response.success && response.errors.length > 0) {
        setFeedback({ type: 'error', message: 'Copy operation encountered errors. Review the details below.' });
      } else {
        setFeedback({ type: dryRun ? 'success' : 'success', message: dryRun ? 'Dry run completed.' : 'Copy completed successfully.' });
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Operation failed.';
      setFeedback({ type: 'error', message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDryRun = () => runOperation(true);
  const handleCopy = () => runOperation(false);

  const disableActions =
    isProcessing ||
    selectedScopes.length === 0 ||
    (!includeCompanies && !includeDepartments) ||
    (includeCompanies && companyMetrics.length === 0) ||
    hasFrozenBlocking ||
    freezeLoading;

  const disableCopy = disableActions || !hasPreview;

  const summaryCards = (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="body2" color="text.secondary">Total rows</Typography>
        <Typography variant="subtitle2">{summary?.totalItems.toLocaleString() ?? '0'}</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="body2" color="text.secondary">Ready to copy</Typography>
        <Typography variant="subtitle2" sx={{ color: 'success.main' }}>{summary?.processed.toLocaleString() ?? '0'}</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="body2" color="text.secondary">Skipped</Typography>
        <Typography variant="subtitle2" sx={{ color: 'warning.main' }}>{summary?.skipped.toLocaleString() ?? '0'}</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="body2" color="text.secondary">Errors</Typography>
        <Typography variant="subtitle2" sx={{ color: 'error.main' }}>{summary?.errors.toLocaleString() ?? '0'}</Typography>
      </Box>
    </Box>
  );

  return (
    <ReportLayout
      title="Master Data Copy"
      subtitle="Copy company and department metrics between years with a dry run preview"
      filters={
        <>
          <TextField
            select
            size="small"
            label="Source Year"
            value={sourceYear}
            onChange={(e) => setSourceYear(Number(e.target.value))}
            sx={{ width: 150 }}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </TextField>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="master-data-scope-label">Data Sources</InputLabel>
            <Select
              labelId="master-data-scope-label"
              multiple
              value={selectedScopes}
              onChange={handleScopeChange}
              label="Data Sources"
              renderValue={(selected) => (
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {selected.map((value) => (
                    <Chip key={value} size="small" label={value === 'companies' ? 'Companies' : 'Departments'} sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Stack>
              )}
            >
              <MenuItem value="companies" disabled={disabledScopes.companies}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label="Companies" />
                  {disabledScopes.companies && <Typography variant="caption" color="text.secondary">No admin access</Typography>}
                </Stack>
              </MenuItem>
              <MenuItem value="departments" disabled={disabledScopes.departments}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label="Departments" />
                  {disabledScopes.departments && <Typography variant="caption" color="text.secondary">No admin access</Typography>}
                </Stack>
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            select
            size="small"
            label="Destination Year"
            value={destinationYear}
            onChange={(e) => setDestinationYear(Number(e.target.value))}
            sx={{ width: 170 }}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </TextField>
          {includeCompanies && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="company-metrics-label">Company Metrics</InputLabel>
              <Select
                labelId="company-metrics-label"
                multiple
                value={companyMetrics}
                onChange={handleMetricChange}
                label="Company Metrics"
                renderValue={(selected) => selected.map(metricLabel).join(', ')}
              >
                {COMPANY_METRIC_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Chip size="small" label={option.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </>
      }
      actions={
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleDryRun}
            disabled={disableActions}
            startIcon={isProcessing ? <CircularProgress size={16} /> : undefined}
          >
            {isProcessing && !hasPreview ? 'Processing…' : 'Dry Run'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCopy}
            disabled={disableCopy}
            startIcon={isProcessing && hasPreview ? <CircularProgress size={16} /> : undefined}
          >
            {isProcessing && hasPreview ? 'Copying…' : 'Copy Data'}
          </Button>
        </Stack>
      }
      onExportTableCsv={() => gridApiRef.current?.exportDataAsCsv?.()}
    >
      <Stack spacing={2}>
        {hasFrozenBlocking && (
          <Alert severity="error">
            {blockedScopes.map((scope) => scope === 'companies'
              ? `Company metrics for ${destinationYear} are frozen. Unfreeze them before copying.`
              : `Department metrics for ${destinationYear} are frozen. Unfreeze them before copying.`
            ).join(' ')}
          </Alert>
        )}
        {includeCompanies && companyMetrics.length === 0 && (
          <Alert severity="warning">Select at least one company metric to copy.</Alert>
        )}
        {feedback && (
          <Alert severity={feedback.type} onClose={() => setFeedback(null)}>{feedback.message}</Alert>
        )}
        {errors.length > 0 && (
          <Alert severity="error">
            {errors.length === 1 ? 'One item failed to copy.' : `${errors.length} items failed to copy.`}
            Review the table for details.
          </Alert>
        )}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Data Preview</Typography>
          <Box className="ag-theme-quartz">
            <AgGridReact
              rowData={previewData}
              columnDefs={columns}
              defaultColDef={{ sortable: true, resizable: true }}
              onGridReady={(event) => { gridApiRef.current = event.api; }}
              domLayout="autoHeight"
              suppressRowClickSelection
            />
          </Box>
          {summaryCards}
        </Paper>
        {previewData.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Run a dry run to preview the data that will be copied.
          </Typography>
        )}
        {isProcessing && (
          <Typography variant="body2" color="text.secondary">Processing…</Typography>
        )}
      </Stack>
    </ReportLayout>
  );
}
