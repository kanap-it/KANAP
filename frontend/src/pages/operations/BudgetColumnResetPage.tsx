import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  MenuItem,
  Paper,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useTheme,
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import ReportLayout from '../../components/reports/ReportLayout';
import { useTranslation } from 'react-i18next';
import AgGridBox from '../../components/AgGridBox';
import { useOpexSummaryAll, SummaryRow, pickYearSlot } from '../reports/useOpexSummary';
import { useQueryClient } from '@tanstack/react-query';
import { clearBudgetColumn, BudgetColumn } from '../../services/budgetOperations';
import { useFreezeState } from '../../hooks/useFreezeState';
import { FreezeColumn } from '../../services/freeze';
import { useLocale } from '../../i18n/useLocale';

type ProcessedRow = {
  id: string;
  product_name: string;
  currentValue: number;
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

export default function BudgetColumnResetPage() {
  const { t } = useTranslation(['ops', 'common']);

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

  const [year, setYear] = useState<number>(Y);
  const [column, setColumn] = useState<BudgetColumn>('budget');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const { data: freezeData, isLoading: freezeLoading } = useFreezeState(year);
  const freezeKey = budgetToFreezeColumn[column];
  const columnFrozen = freezeData?.summary?.scopes.opex[freezeKey]?.frozen ?? false;

  // Fetch data for the selected year
  const { data: rows, isLoading } = useOpexSummaryAll([year]);

  const processedData = useMemo(() => {
    if (!rows) return [];

    return rows.map((r: SummaryRow) => {
      const slot = pickYearSlot(r, year);
      const currentValue = Number(slot?.totals?.[column] || 0);

      return {
        id: r.id,
        product_name: r.product_name,
        currentValue,
      };
    });
  }, [rows, year, column]);

  const stats = useMemo(() => {
    const totalItems = processedData.length;
    const itemsWithData = processedData.filter((row: ProcessedRow) => row.currentValue !== 0).length;
    const totalValue = processedData.reduce((sum: number, row: ProcessedRow) => sum + row.currentValue, 0);

    return {
      totalItems,
      itemsWithData,
      totalValue,
    };
  }, [processedData]);

  const columns = useMemo<ColDef[]>(() => {
    const columnLabel = BUDGET_COLUMNS.find(c => c.value === column)?.label || column;

    return [
      {
        field: 'product_name',
        headerName: t('operations.columnReset.product'),
        flex: 1,
        minWidth: 220,
      },
      {
        field: 'currentValue',
        headerName: `${columnLabel} (${year}) - Current`,
        width: 180,
        type: 'rightAligned',
        valueFormatter: (p) => formatNumber(p.value, locale),
        cellStyle: (params) => {
          const hasData = params.value !== 0;
          return {
            backgroundColor: hasData ? (theme.palette.error[50] || theme.palette.action.hover) : 'inherit',
            fontWeight: hasData ? 'bold' : 'normal',
            color: hasData ? theme.palette.error.dark : 'inherit',
          };
        },
      },
    ];
  }, [year, column, locale, theme]);

  const gridApiRef = useRef<any>(null);

  const handleClearClick = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmClear = async () => {
    setConfirmDialogOpen(false);
    setIsProcessing(true);
    setClearResult(null);

    try {
      const result = await clearBudgetColumn({
        year,
        column,
      });

      setClearResult(`Column cleared successfully!
Cleared: ${result.summary.cleared} items
Skipped: ${result.summary.skipped} items
Errors: ${result.summary.errors} items`);

      // Invalidate and refetch the summary data to show updated values
      await queryClient.invalidateQueries({ queryKey: ['spend-items-summary'] });
    } catch (error) {
      console.error('Clear operation failed:', error);
      setClearResult(t('operations.columnReset.clearFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelClear = () => {
    setConfirmDialogOpen(false);
  };

  const columnLabel = BUDGET_COLUMNS.find(c => c.value === column)?.label || column;

  return (
    <ReportLayout
      title={t('operations.columnReset.title')}
      subtitle={t('operations.columnReset.subtitle')}
      filters={
        <>
          <TextField
            select
            size="small"
            label={t("operations.columnReset.year")}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t("operations.columnReset.budgetColumn")}
            value={column}
            onChange={(e) => setColumn(e.target.value as BudgetColumn)}
          >
            {BUDGET_COLUMNS.map((col) => (
              <MenuItem key={col.value} value={col.value}>
                {col.label}
              </MenuItem>
            ))}
          </TextField>
        </>
      }
      actions={
        <Button
          variant="contained"
          onClick={handleClearClick}
          disabled={isProcessing || stats.itemsWithData === 0 || freezeLoading || columnFrozen}
          color="error"
        >
          {isProcessing ? t('operations.columnReset.processing') : t('operations.columnReset.clearColumn')}
        </Button>
      }
      onExportTableCsv={() => gridApiRef.current?.exportDataAsCsv?.()}
    >
      <Stack direction="column" spacing={2} alignItems="stretch">
        {columnFrozen && (
          <Alert severity="error">
            {t("operations.columnReset.columnFrozenError", { year, column: columnLabel })}
          </Alert>
        )}

        {stats.itemsWithData === 0 && !isLoading && (
          <Alert severity="info">
            {t("operations.columnReset.noDataInfo", { column: columnLabel, year })}
          </Alert>
        )}

        {stats.itemsWithData > 0 && (
          <Alert severity="warning">
            {t("operations.columnReset.clearWarning", { column: columnLabel, year, count: stats.itemsWithData })}
          </Alert>
        )}

        {clearResult && (
          <Alert severity={clearResult.includes('failed') ? 'error' : 'success'}>
            {clearResult}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            {t('operations.columnReset.dataPreview')}
          </Typography>
          <Box component={AgGridBox}>
            <AgGridReact
              rowData={processedData}
              columnDefs={columns}
              defaultColDef={{ sortable: true, resizable: true }}
              initialState={{
                sort: {
                  sortModel: [{ colId: 'currentValue', sort: 'desc' }],
                },
              }}
              onGridReady={(e) => { gridApiRef.current = e.api; }}
              domLayout="autoHeight"
            />
          </Box>

          <Box sx={{ mt: 2, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{t('operations.columnReset.totalItems')}</Typography>
              <Typography variant="subtitle2">{stats.totalItems.toLocaleString(locale)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{t('operations.columnReset.itemsWithData')}</Typography>
              <Typography variant="subtitle2" sx={{ color: stats.itemsWithData > 0 ? 'error.main' : 'inherit' }}>
                {stats.itemsWithData.toLocaleString(locale)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{t('operations.columnReset.currentTotalValue')}</Typography>
              <Typography variant="subtitle2" sx={{ color: stats.itemsWithData > 0 ? 'error.main' : 'inherit' }}>
                {formatNumber(stats.totalValue, locale)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Stack>

      {isLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t("operations.columnReset.loadingData")}</Typography>
      )}

      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelClear}
      >
        <DialogTitle>{t('operations.columnReset.confirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("operations.columnReset.confirmMessage", { column: columnLabel, year })}
            <br /><br />
            {t("operations.columnReset.confirmAffected", { count: stats.itemsWithData, value: formatNumber(stats.totalValue, locale) })}
            <br /><br />
            {t("operations.columnReset.confirmUndoWarning")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClear} color="primary">
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleConfirmClear} color="error" variant="contained" autoFocus>
            {t('operations.columnReset.clearColumn')}
          </Button>
        </DialogActions>
      </Dialog>
    </ReportLayout>
  );
}
