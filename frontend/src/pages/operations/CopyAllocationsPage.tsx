import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import { useQueryClient } from '@tanstack/react-query';
import ReportLayout from '../../components/reports/ReportLayout';
import {
  AllocationCopyOperation,
  AllocationCopyResult,
  AllocationCopyResponse,
  copyAllocations,
} from '../../services/budgetOperations';

function formatActionLabel(action: AllocationCopyResult['action']) {
  switch (action) {
    case 'copy':
      return 'Will copy';
    case 'skip_missing_source_version':
      return 'Skip – no source year';
    case 'skip_no_source_allocations':
      return 'Skip – no allocations in source';
    case 'skip_destination_has_data':
      return 'Skip – destination has data';
    case 'error':
      return 'Error';
    default:
      return action;
  }
}

export default function CopyAllocationsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = useMemo(() => Array.from({ length: 7 }, (_, i) => currentYear - 1 + i), [currentYear]);

  const [sourceYear, setSourceYear] = useState<number>(currentYear);
  const [destinationYear, setDestinationYear] = useState<number>(currentYear + 1);
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<AllocationCopyResult[]>([]);
  const [summary, setSummary] = useState<AllocationCopyResponse['summary'] | null>(null);

  const queryClient = useQueryClient();
  const gridApiRef = useRef<any>(null);

  const isSameYear = sourceYear === destinationYear;

  const stats = useMemo(() => {
    if (previewData.length === 0) {
      return {
        total: 0,
        toCopy: 0,
        skipped: 0,
        errors: 0,
        skippedDueToDestination: 0,
      };
    }
    let toCopy = 0;
    let skipped = 0;
    let errors = 0;
    let skippedDestination = 0;
    for (const row of previewData) {
      if (row.action === 'copy') toCopy += 1;
      else if (row.action === 'error') errors += 1;
      else {
        skipped += 1;
        if (row.action === 'skip_destination_has_data') skippedDestination += 1;
      }
    }
    return {
      total: previewData.length,
      toCopy,
      skipped,
      errors,
      skippedDueToDestination: skippedDestination,
    };
  }, [previewData]);

  const columns = useMemo<ColDef[]>(() => [
    {
      field: 'itemName',
      headerName: 'Product',
      flex: 1.2,
      minWidth: 220,
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 180,
      valueFormatter: (params) => formatActionLabel(params.value),
      cellStyle: (params) => {
        const action = params.data?.action as AllocationCopyResult['action'];
        if (action === 'copy') {
          return { color: '#2e7d32', fontWeight: '600' };
        }
        if (action === 'error') {
          return { color: '#c62828', fontWeight: '600' };
        }
        return { color: '#6d4c41', fontWeight: '500' };
      },
    },
    {
      field: 'sourceMethodLabel',
      headerName: `Source (${sourceYear})`,
      width: 180,
      valueGetter: (params) => params.data?.sourceMethodLabel || '—',
    },
    {
      field: 'destinationMethodLabel',
      headerName: `Destination (${destinationYear})`,
      width: 200,
      valueGetter: (params) => params.data?.destinationMethodLabel || '—',
    },
    {
      field: 'resultMethodLabel',
      headerName: 'Result after copy',
      width: 200,
      valueGetter: (params) => params.data?.resultMethodLabel || '—',
    },
  ], [destinationYear, sourceYear]);

  const handleDryRun = async () => {
    const payload: AllocationCopyOperation = {
      sourceYear,
      destinationYear,
      overwrite,
      dryRun: true,
    };
    setIsProcessing(true);
    try {
      const response = await copyAllocations(payload);
      setPreviewData(response.results);
      setSummary(response.summary);
    } catch (error) {
      console.error('Dry run failed', error);
      alert('Dry run failed. Check the console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    const payload: AllocationCopyOperation = {
      sourceYear,
      destinationYear,
      overwrite,
      dryRun: false,
    };
    setIsProcessing(true);
    try {
      const response = await copyAllocations(payload);
      alert(`Copy completed.\nProcessed: ${response.summary.processed}\nSkipped: ${response.summary.skipped}\nErrors: ${response.summary.errors}`);
      await queryClient.invalidateQueries({ queryKey: ['spend-items-summary'] });
      setPreviewData([]);
      setSummary(null);
    } catch (error) {
      console.error('Copy failed', error);
      alert('Copy failed. Check the console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ReportLayout
      title="Copy Allocations"
      subtitle="Copy allocation methods and percentages from one year to another for all OPEX items"
      filters={
        <>
          <TextField
            select
            size="small"
            label="Source Year"
            value={sourceYear}
            onChange={(e) => {
              setSourceYear(parseInt(e.target.value, 10));
              setPreviewData([]);
              setSummary(null);
            }}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Destination Year"
            value={destinationYear}
            onChange={(e) => {
              setDestinationYear(parseInt(e.target.value, 10));
              setPreviewData([]);
              setSummary(null);
            }}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={overwrite}
                onChange={(e) => {
                  setOverwrite(e.target.checked);
                  setPreviewData([]);
                  setSummary(null);
                }}
                size="small"
              />
            }
            label="Overwrite existing data"
          />
        </>
      }
      actions={
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleDryRun}
            disabled={isProcessing || isSameYear}
          >
            {isProcessing ? 'Processing...' : 'Dry Run'}
          </Button>
          <Button
            variant="contained"
            onClick={handleCopy}
            disabled={isProcessing || previewData.length === 0 || isSameYear}
          >
            {isProcessing ? 'Processing...' : 'Copy Data'}
          </Button>
        </Stack>
      }
      onExportTableCsv={() => gridApiRef.current?.exportDataAsCsv?.()}
    >
      <Stack direction="column" spacing={2} alignItems="stretch">
        {isSameYear && (
          <Alert severity="warning">Source and destination years must be different.</Alert>
        )}

        {summary && (
          <Alert severity={summary.errors > 0 ? 'error' : summary.skipped > 0 ? 'info' : 'success'}>
            {summary.processed} items ready to copy, {summary.skipped} skipped, {summary.errors} errors.
          </Alert>
        )}

        {stats.skippedDueToDestination > 0 && !overwrite && (
          <Alert severity="warning">
            {stats.skippedDueToDestination} items already have allocations in {destinationYear}. Enable overwrite to replace them.
          </Alert>
        )}

        {previewData.length > 0 ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Showing {stats.total.toLocaleString()} items. {stats.toCopy.toLocaleString()} will be copied, {stats.skipped.toLocaleString()} skipped, {stats.errors.toLocaleString()} errors.
            </Typography>
            <Box className="ag-theme-quartz">
              <AgGridReact
                rowData={previewData}
                columnDefs={columns}
                defaultColDef={{ sortable: true, resizable: true }}
                domLayout="autoHeight"
                onGridReady={(event) => { gridApiRef.current = event.api; }}
              />
            </Box>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Run a dry run to preview how allocation methods will be copied.
            </Typography>
          </Paper>
        )}
      </Stack>
    </ReportLayout>
  );
}
