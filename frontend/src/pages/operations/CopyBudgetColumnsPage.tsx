import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  MenuItem,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  useTheme,
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import ReportLayout from '../../components/reports/ReportLayout';
import { useTranslation } from 'react-i18next';
import AgGridBox from '../../components/AgGridBox';
import { useOpexSummaryAll, SummaryRow, pickYearSlot } from '../reports/useOpexSummary';
import { useQueryClient } from '@tanstack/react-query';
import { copyBudgetColumn, BudgetColumn, BudgetOperationResult } from '../../services/budgetOperations';
import { useFreezeState } from '../../hooks/useFreezeState';
import { FreezeColumn } from '../../services/freeze';
import { useLocale } from '../../i18n/useLocale';

type ProcessedRow = {
  id: string;
  product_name: string;
  sourceValue: number;
  destinationValue: number;
  previewValue?: number;
  willBeSkipped?: boolean;
};

function formatNumber(v: any, locale: string) {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return '';
  return Math.round(n).toLocaleString(locale);
}



const budgetToFreezeColumn: Record<BudgetColumn, FreezeColumn> = {
  budget: 'budget',
  revision: 'revision',
  follow_up: 'actual',
  landing: 'landing',
};

export default function CopyBudgetColumnsPage() {
  const { t } = useTranslation(['ops']);

  const BUDGET_COLUMNS: { value: BudgetColumn; label: string }[] = [
    { value: 'budget', label: t('operations.budgetColumns.budget') },
    { value: 'revision', label: t('operations.budgetColumns.revision') },
    { value: 'follow_up', label: t('operations.budgetColumns.followUp') },
    { value: 'landing', label: t('operations.budgetColumns.landing') },
  ];
  const locale = useLocale();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const now = new Date();
  const Y = now.getFullYear();

  // Generate years from Y-1 to Y+5
  const years = Array.from({ length: 7 }, (_, i) => Y - 1 + i);

  const [sourceYear, setSourceYear] = useState<number>(Y);
  const [sourceColumn, setSourceColumn] = useState<BudgetColumn>('budget');
  const [destinationYear, setDestinationYear] = useState<number>(Y + 1);
  const [destinationColumn, setDestinationColumn] = useState<BudgetColumn>('budget');
  const [percentageIncrease, setPercentageIncrease] = useState<number>(0);
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ProcessedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const { data: freezeData, isLoading: freezeLoading } = useFreezeState(destinationYear);

  // Fetch data for both source and destination years
  const requiredYears = useMemo(() => {
    const yearsSet = new Set([sourceYear, destinationYear]);
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [sourceYear, destinationYear]);

  const { data: rows, isLoading } = useOpexSummaryAll(requiredYears);

  const freezeKey = budgetToFreezeColumn[destinationColumn];
  const destinationFrozen = freezeData?.summary?.scopes.opex[freezeKey]?.frozen ?? false;

  const processedData = useMemo(() => {
    if (!rows) return [];

    return rows.map((r: SummaryRow) => {
      const sourceSlot = pickYearSlot(r, sourceYear);
      const destinationSlot = pickYearSlot(r, destinationYear);

      const sourceValue = Number(sourceSlot?.totals?.[sourceColumn] || 0);
      const destinationValue = Number(destinationSlot?.totals?.[destinationColumn] || 0);

      return {
        id: r.id,
        product_name: r.product_name,
        sourceValue,
        destinationValue,
      };
    }); // Show ALL items in preview, not just ones with non-zero source values
  }, [rows, sourceYear, sourceColumn, destinationYear, destinationColumn]);

  const calculatePreview = (data: ProcessedRow[]): ProcessedRow[] => {
    return data.map(row => {
      let previewValue = row.sourceValue;

      // Apply percentage increase
      if (percentageIncrease !== 0) {
        previewValue = previewValue * (1 + percentageIncrease / 100);
      }

      // Round to nearest integer
      previewValue = Math.round(previewValue);

      // Check overwrite logic
      if (!overwrite && row.destinationValue !== 0) {
        previewValue = row.destinationValue; // Don't overwrite existing data
      }

      return {
        ...row,
        previewValue,
      };
    });
  };

  const handleDryRun = async () => {
    setIsProcessing(true);
    try {
      const result = await copyBudgetColumn({
        sourceYear,
        sourceColumn,
        destinationYear,
        destinationColumn,
        percentageIncrease,
        overwrite,
        dryRun: true,
      });

      // Convert API result to our display format, preserving original frontend data
      const preview = result.results.map((apiRow: BudgetOperationResult) => {
        const matchingRow = processedData.find((row: ProcessedRow) => row.id === apiRow.itemId);
        const willBeSkipped = apiRow.sourceValue === 0 || (!overwrite && apiRow.currentDestinationValue !== 0);
        return {
          id: apiRow.itemId,
          product_name: apiRow.itemName,
          sourceValue: matchingRow?.sourceValue || apiRow.sourceValue, // Use frontend value
          destinationValue: matchingRow?.destinationValue || apiRow.currentDestinationValue, // Use frontend value
          previewValue: apiRow.newValue,
          willBeSkipped,
        };
      });

      setPreviewData(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Dry run failed:', error);
      alert(t('operations.copyBudgetColumns.dryRunFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyData = async () => {
    setIsProcessing(true);
    try {
      const result = await copyBudgetColumn({
        sourceYear,
        sourceColumn,
        destinationYear,
        destinationColumn,
        percentageIncrease,
        overwrite,
        dryRun: false,
      });

      alert(`Copy operation completed successfully!
Processed: ${result.summary.processed} items
Skipped: ${result.summary.skipped} items
Errors: ${result.summary.errors} items`);

      // Invalidate and refetch the summary data to show updated values
      await queryClient.invalidateQueries({ queryKey: ['spend-items-summary'] });

      // Clear the preview state so user can see the updated source data
      setPreviewData([]);
      setShowPreview(false);
    } catch (error) {
      console.error('Copy data failed:', error);
      alert(t('operations.copyBudgetColumns.copyFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = useMemo<ColDef[]>(() => {
    const baseColumns: ColDef[] = [
      {
        field: 'product_name',
        headerName: t('operations.copyBudgetColumns.product'),
        flex: 1,
        minWidth: 220,
        cellRenderer: (params: any) => {
          const willBeSkipped = params.data?.willBeSkipped;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showPreview && willBeSkipped && (
                <span style={{ fontSize: '12px', color: theme.palette.warning.dark, fontWeight: 'bold' }}>
                  {t('operations.copyBudgetColumns.skip')}
                </span>
              )}
              <span>{params.value}</span>
            </div>
          );
        }
      },
      {
        field: 'sourceValue',
        headerName: `${sourceColumn} (${sourceYear})`,
        width: 160,
        type: 'rightAligned',
        valueFormatter: (p) => formatNumber(p.value, locale),
      },
      {
        field: 'destinationValue',
        headerName: `${destinationColumn} (${destinationYear}) - Current`,
        width: 180,
        type: 'rightAligned',
        valueFormatter: (p) => formatNumber(p.value, locale),
      },
    ];

    if (showPreview) {
      baseColumns.push({
        field: 'previewValue',
        headerName: `${destinationColumn} (${destinationYear}) - Preview`,
        width: 180,
        type: 'rightAligned',
        valueFormatter: (p) => formatNumber(p.value, locale),
        cellStyle: (params) => {
          const willBeSkipped = params.data?.willBeSkipped;
          return {
            backgroundColor: willBeSkipped
              ? (theme.palette.warning[50] || theme.palette.action.hover)
              : theme.palette.mode === 'dark'
                ? 'rgba(25, 118, 210, 0.12)'
                : '#e3f2fd',
            fontWeight: 'bold',
            color: willBeSkipped ? theme.palette.warning.dark : 'inherit',
          };
        },
      });
    }

    return baseColumns;
  }, [destinationColumn, destinationYear, locale, showPreview, sourceColumn, sourceYear, theme]);

  const gridApiRef = useRef<any>(null);

  // Always show original data, but merge in preview values when available
  const displayData = useMemo(() => {
    if (!showPreview || previewData.length === 0) {
      return processedData;
    }

    // Create a map of preview data by id for quick lookup
    const previewMap = new Map(previewData.map(p => [p.id, p]));

    return processedData.map((row: ProcessedRow) => {
      const preview = previewMap.get(row.id);
      return {
        ...row,
        previewValue: preview?.previewValue,
        willBeSkipped: preview?.willBeSkipped,
      };
    });
  }, [processedData, previewData, showPreview]);

  const stats = useMemo(() => {
    const totalItems = displayData.length;
    const totalSource = displayData.reduce((sum: number, row: ProcessedRow) => sum + row.sourceValue, 0);
    const totalDestinationCurrent = displayData.reduce((sum: number, row: ProcessedRow) => sum + row.destinationValue, 0);
    const totalPreview = showPreview
      ? displayData.reduce((sum: number, row: ProcessedRow) => sum + (row.previewValue || 0), 0)
      : 0;
    const itemsWithExistingData = displayData.filter((row: ProcessedRow) => row.destinationValue !== 0).length;
    const itemsToBeProcessed = showPreview
      ? displayData.filter((row: ProcessedRow) => !row.willBeSkipped).length
      : displayData.filter((row: ProcessedRow) => row.sourceValue !== 0 && (overwrite || row.destinationValue === 0)).length;

    return {
      totalItems,
      totalSource,
      totalDestinationCurrent,
      totalPreview,
      itemsWithExistingData,
      itemsToBeProcessed,
    };
  }, [displayData, showPreview]);

  return (
    <ReportLayout
      title={t('operations.copyBudgetColumns.title')}
      subtitle={t('operations.copyBudgetColumns.subtitle')}
      filters={
        <>
          <TextField
            select
            size="small"
            label={t("operations.copyBudgetColumns.sourceYear")}
            value={sourceYear}
            onChange={(e) => setSourceYear(parseInt(e.target.value, 10))}
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
            label={t("operations.copyBudgetColumns.sourceColumn")}
            value={sourceColumn}
            onChange={(e) => setSourceColumn(e.target.value as BudgetColumn)}
          >
            {BUDGET_COLUMNS.map((col) => (
              <MenuItem key={col.value} value={col.value}>
                {col.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t("operations.copyBudgetColumns.destinationYear")}
            value={destinationYear}
            onChange={(e) => setDestinationYear(parseInt(e.target.value, 10))}
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
            label={t("operations.copyBudgetColumns.destinationColumn")}
            value={destinationColumn}
            onChange={(e) => setDestinationColumn(e.target.value as BudgetColumn)}
          >
            {BUDGET_COLUMNS.map((col) => (
              <MenuItem key={col.value} value={col.value}>
                {col.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label={t("operations.copyBudgetColumns.percentageIncrease")}
            value={percentageIncrease}
            onChange={(e) => setPercentageIncrease(parseFloat(e.target.value) || 0)}
            inputProps={{ step: 0.1 }}
            sx={{ width: 160 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                size="small"
              />
            }
            label={t('operations.copyBudgetColumns.overwriteExisting')}
            sx={{ ml: 1 }}
          />
        </>
      }
      actions={
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleDryRun}
            disabled={isProcessing || processedData.length === 0 || freezeLoading || destinationFrozen}
          >
            {isProcessing ? t('operations.copyBudgetColumns.processing') : t('operations.copyBudgetColumns.dryRun')}
          </Button>
          <Button
            variant="contained"
            onClick={handleCopyData}
            disabled={isProcessing || processedData.length === 0 || !showPreview || freezeLoading || destinationFrozen}
            color="primary"
          >
            {isProcessing ? t('operations.copyBudgetColumns.processing') : t('operations.copyBudgetColumns.copyData')}
          </Button>
        </Stack>
      }
      onExportTableCsv={() => gridApiRef.current?.exportDataAsCsv?.()}
    >
      <Stack direction="column" spacing={2} alignItems="stretch">
        {destinationFrozen && (
          <Alert severity="error">
            {t('operations.copyBudgetColumns.frozenError', { year: destinationYear, column: BUDGET_COLUMNS.find((c) => c.value === destinationColumn)?.label ?? destinationColumn })}
          </Alert>
        )}

        {stats.itemsWithExistingData > 0 && !overwrite && (
          <Alert severity="warning">
            {t('operations.copyBudgetColumns.existingDataWarning', { count: stats.itemsWithExistingData })}
          </Alert>
        )}

        {showPreview && (
          <Alert severity="info">
            {t('operations.copyBudgetColumns.previewInfo', { total: stats.totalItems, toProcess: stats.itemsToBeProcessed, skipped: stats.totalItems - stats.itemsToBeProcessed })}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            {t('operations.copyBudgetColumns.dataPreview')}
          </Typography>
          <Box component={AgGridBox}>
            <AgGridReact
              rowData={displayData}
              columnDefs={columns}
              defaultColDef={{ sortable: true, resizable: true }}
              initialState={{
                sort: {
                  sortModel: [{ colId: 'sourceValue', sort: 'desc' }],
                },
              }}
              onGridReady={(e) => { gridApiRef.current = e.api; }}
              domLayout="autoHeight"
            />
          </Box>

          <Box sx={{ mt: 2, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{t('operations.copyBudgetColumns.totalItems')}</Typography>
              <Typography variant="subtitle2">{stats.totalItems.toLocaleString(locale)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{t('operations.copyBudgetColumns.itemsToProcess')}</Typography>
              <Typography variant="subtitle2" sx={{ color: 'success.main' }}>{stats.itemsToBeProcessed.toLocaleString(locale)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{t('operations.copyBudgetColumns.sourceTotal')}</Typography>
              <Typography variant="subtitle2">{formatNumber(stats.totalSource, locale)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{t('operations.copyBudgetColumns.currentDestTotal')}</Typography>
              <Typography variant="subtitle2">{formatNumber(stats.totalDestinationCurrent, locale)}</Typography>
            </Box>
            {showPreview && (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" color="text.secondary">{t('operations.copyBudgetColumns.previewTotal')}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                  {formatNumber(stats.totalPreview, locale)}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Stack>
      {isLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('operations.copyBudgetColumns.loadingData')}</Typography>
      )}
    </ReportLayout>
  );
}
