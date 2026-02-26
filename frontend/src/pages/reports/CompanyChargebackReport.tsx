import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import ReportLayout from '../../components/reports/ReportLayout';
import AgGridBox from '../../components/AgGridBox';
import ChartCard, { ChartCardHandle } from '../../components/reports/ChartCard';
import CompanySelect from '../../components/fields/CompanySelect';
import api from '../../api';
import { metricLabels, MetricKey } from './reportMetrics';

function formatNumber(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '';
  const fixed = Math.round(n);
  return fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatCurrency(value: number | null | undefined, withDecimals = false): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '—';
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  });
  return formatter.format(n).replace(/,/g, ' ');
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}%`;
}

function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatNumber(value);
}

type CompanyChargebackDepartmentRow = {
  departmentId: string | null;
  departmentName: string;
  amount: number;
  amountRaw: number;
  sharePct: number | null;
  headcount: number | null;
  costPerUser: number | null;
};

type CompanyChargebackItemRow = {
  versionId: string;
  itemId: string | null;
  itemName: string;
  allocationMethod: string;
  allocationMethodLabel: string;
  amount: number;
  amountRaw: number;
  sharePct: number | null;
};

type CompanyChargebackSummary = {
  id: string;
  name: string;
  total: number;
  totalRaw: number;
  paid?: number;
  paidRaw?: number;
  net?: number;
  netRaw?: number;
  headcount: number | null;
  itUsers: number | null;
  turnover: number | null;
  turnoverRaw: number | null;
  costPerUser: number | null;
  costPerUserRaw: number | null;
  costPerItUser: number | null;
  costPerItUserRaw: number | null;
  costVsTurnoverPct: number | null;
};

type CompanyChargebackReportResponse = {
  year: number;
  metric: MetricKey;
  total: number;
  totalRaw: number;
  company: CompanyChargebackSummary;
  departments: CompanyChargebackDepartmentRow[];
  items: CompanyChargebackItemRow[];
  itemsTotal: number;
  itemsTotalRaw: number;
  kpis: Array<{
    companyId: string;
    companyName: string;
    amount: number;
    amountRaw: number;
    headcount: number | null;
    itUsers: number | null;
    turnover: number | null;
    turnoverRaw: number | null;
    costPerUser: number | null;
    costPerItUser: number | null;
    costVsTurnoverPct: number | null;
  }>;
  globalKpi: {
    amount: number;
    amountRaw: number;
    headcount: number | null;
    itUsers: number | null;
    turnover: number | null;
    turnoverRaw: number | null;
    costPerUser: number | null;
    costPerItUser: number | null;
    costVsTurnoverPct: number | null;
  };
  intercompany?: {
    receivables: Array<{ consumerId: string; consumerName: string; amount: number; amountRaw: number }>;
    payables: Array<{ payerId: string; payerName: string; amount: number; amountRaw: number }>;
  };
  reportingCurrency?: string;
  warnings?: string[];
};

type CompanyChargebackKpiRow = CompanyChargebackReportResponse['kpis'][number];

export default function CompanyChargebackReport() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const allowedYears = [currentYear - 1, currentYear, currentYear + 1];

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [year, setYear] = useState<number>(currentYear);
  const [metric, setMetric] = useState<MetricKey>('budget');
  const [showDepartments, setShowDepartments] = useState(true);
  const [showItems, setShowItems] = useState(true);
  const [showKpis, setShowKpis] = useState(true);
  const [showIntercompany, setShowIntercompany] = useState(true);

  const departmentGridRef = useRef<any>(null);
  const chartRef = useRef<ChartCardHandle>(null);
  const intercompanyGridRef = useRef<any>(null);

  const queryKey = ['company-chargeback-report', companyId, year, metric];
  const { data, isLoading, isFetching, refetch } = useQuery<CompanyChargebackReportResponse>({
    queryKey,
    enabled: Boolean(companyId),
    queryFn: async () => {
      const response = await api.get<CompanyChargebackReportResponse>('/reports/chargeback/company', {
        params: { companyId, year, metric },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const metricLabel = metricLabels[metric];
  const reportingCurrency = (data?.reportingCurrency || 'EUR').toUpperCase();
  const departments = data?.departments ?? [];
  const items = data?.items ?? [];
  const kpiRows = data?.kpis ?? [];
  const globalKpi = data?.globalKpi;
  const warnings = data?.warnings ?? [];

  // Intercompany rows (partner, receivables, payables, net)
  const intercompanyColumns = useMemo<ColDef[]>(() => [
    { field: 'partnerName', headerName: 'Company', flex: 1, minWidth: 220 },
    { field: 'receivables', headerName: 'Receivables', width: 160, type: 'rightAligned', valueFormatter: (p: any) => formatNumber(p.value) },
    { field: 'payables', headerName: 'Payables', width: 160, type: 'rightAligned', valueFormatter: (p: any) => formatNumber(p.value) },
    { field: 'net', headerName: 'Net', width: 160, type: 'rightAligned', valueFormatter: (p: any) => formatNumber(p.value) },
  ], []);

  const intercompanyRows = useMemo(() => {
    const receivables = data?.intercompany?.receivables ?? [];
    const payables = data?.intercompany?.payables ?? [];
    type Row = { partnerId: string; partnerName: string; receivables: number; payables: number; net: number };
    const map = new Map<string, Row>();
    for (const r of receivables) {
      const id = r.consumerId;
      const name = r.consumerName || 'Unknown company';
      const row = map.get(id) ?? { partnerId: id, partnerName: name, receivables: 0, payables: 0, net: 0 };
      row.partnerName = name;
      row.receivables += Number(r.amount || 0);
      map.set(id, row);
    }
    for (const p of payables) {
      const id = p.payerId;
      const name = p.payerName || 'Unknown company';
      const row = map.get(id) ?? { partnerId: id, partnerName: name, receivables: 0, payables: 0, net: 0 };
      row.partnerName = name;
      row.payables += Number(p.amount || 0);
      map.set(id, row);
    }
    const rows = Array.from(map.values()).map((r) => ({ ...r, net: Number((r.receivables - r.payables) || 0) }));
    rows.sort((a, b) => (b.net !== a.net ? b.net - a.net : a.partnerName.localeCompare(b.partnerName)));
    return rows;
  }, [data?.intercompany]);

  const intercompanyPinnedBottom = useMemo(() => {
    if (!intercompanyRows.length) return [];
    const tRec = intercompanyRows.reduce((s, r) => s + (r.receivables || 0), 0);
    const tPay = intercompanyRows.reduce((s, r) => s + (r.payables || 0), 0);
    const tNet = tRec - tPay;
    return [{ partnerName: 'Total', receivables: tRec, payables: tPay, net: tNet } as Partial<any>];
  }, [intercompanyRows]);

  const exportIntercompanyCsv = () => {
    if (!companyId) return;
    intercompanyGridRef.current?.exportDataAsCsv?.({ fileName: `company-chargeback-flows-${companyId}-${year}-${metric}.csv` });
  };

  const departmentColumns = useMemo<ColDef[]>(() => [
    { field: 'departmentName', headerName: 'Department', flex: 1, minWidth: 200 },
    {
      field: 'amount',
      headerName: `${metricLabel} amount`,
      width: 160,
      type: 'rightAligned',
      valueFormatter: (params) => formatNumber(params.value),
    },
    {
      field: 'sharePct',
      headerName: 'Share of total',
      width: 150,
      type: 'rightAligned',
      valueFormatter: (params) => (params.value != null ? `${Number(params.value).toFixed(2)}%` : ''),
    },
    {
      field: 'headcount',
      headerName: 'Headcount',
      width: 130,
      type: 'rightAligned',
      valueFormatter: (params) => formatCount(params.value),
    },
    {
      field: 'costPerUser',
      headerName: 'Cost per user',
      width: 160,
      type: 'rightAligned',
      valueFormatter: (params) => formatNumber(params.value),
    },
  ], [metricLabel]);

  const itemColumns = useMemo<ColDef[]>(() => [
    { field: 'itemName', headerName: 'Item', flex: 1, minWidth: 220 },
    { field: 'allocationMethodLabel', headerName: 'Allocation method', minWidth: 180 },
    {
      field: 'amount',
      headerName: `${metricLabel} amount`,
      width: 160,
      type: 'rightAligned',
      valueFormatter: (params) => formatNumber(params.value),
    },
    {
      field: 'sharePct',
      headerName: 'Share of total',
      width: 150,
      type: 'rightAligned',
      valueFormatter: (params) => (params.value != null ? `${Number(params.value).toFixed(2)}%` : ''),
    },
  ], [metricLabel]);

  const chartData = useMemo(() => {
    return departments.map((row: CompanyChargebackDepartmentRow) => ({ label: row.departmentName, value: row.amount }));
  }, [departments]);

  const itemsPinnedBottom = useMemo(() => {
    if (!data) return [];
    const total = data.total ?? 0;
    const share = total > 0 ? (data.itemsTotal / total) * 100 : null;
    return [{
      itemName: 'Total',
      allocationMethod: '',
      allocationMethodLabel: '',
      amount: data.itemsTotal,
      amountRaw: data.itemsTotalRaw,
      sharePct: share != null ? Math.round(share * 100) / 100 : null,
    } as Partial<CompanyChargebackItemRow>];
  }, [data]);

  const chartOptions = useMemo(() => {
    if (!data?.company) {
      return null;
    }
    return {
      title: { text: `Chargeback by department — ${data.company.name}` },
      subtitle: { text: `${metricLabel} totals` },
      footnote: { text: `Overall ${metricLabel}: ${formatCurrency(data.total)}` },
      data: chartData,
      axes: [
        { type: 'category', position: 'left', label: { padding: 8 } },
        {
          type: 'number',
          position: 'bottom',
          label: {
            formatter: ({ value }: { value: number }) => formatNumber(value),
          },
        },
      ],
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'label',
          yKey: 'value',
          strokeWidth: 0,
          label: {
            formatter: ({ value }: { value: number }) => formatNumber(value),
          },
          tooltip: {
            enabled: true,
            renderer: ({ datum }: any) => {
              const value = Number(datum.value || 0);
              const total = data?.total ?? 0;
              const pct = total > 0 ? (value / total) * 100 : 0;
              return {
                title: datum.label,
                data: [
                  { label: metricLabel, value: formatNumber(value) },
                  { label: 'Share', value: `${pct.toFixed(2)}%` },
                ],
              };
            },
          },
        },
      ],
      legend: { enabled: false },
      animation: { enabled: true, duration: 700 },
    };
  }, [chartData, data?.company, data?.total, metricLabel]);

  const exportDepartmentsCsv = () => {
    if (!companyId) return;
    departmentGridRef.current?.exportDataAsCsv?.({
      fileName: `company-chargeback-departments-${companyId}-${year}-${metric}.csv`,
    });
  };

  const exportChart = () => {
    if (!companyId) return;
    chartRef.current?.download(`company-chargeback-departments-${companyId}-${year}-${metric}`);
  };

  const companySummary = data?.company;

  const isReady = Boolean(companyId);

  return (
    <ReportLayout
      title="Company Chargeback"
      subtitle="Detailed chargeback allocation per company across departments, items, and KPIs"
      filters={(
        <>
          <Box sx={{ minWidth: 240 }}>
            <CompanySelect
              label="Company"
              value={companyId}
              onChange={setCompanyId}
              size="small"
            />
          </Box>
          <TextField
            select
            size="small"
            label="Year"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            sx={{ minWidth: 120 }}
          >
            {allowedYears.map((yr) => (
              <MenuItem key={yr} value={yr}>{yr}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Column"
            value={metric}
            onChange={(event) => setMetric(event.target.value as MetricKey)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="budget">Budget</MenuItem>
            <MenuItem value="landing">Landing</MenuItem>
            <MenuItem value="follow_up">Follow-up</MenuItem>
            <MenuItem value="revision">Revision</MenuItem>
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={showDepartments} onChange={(_, checked) => setShowDepartments(checked)} />}
            label="Department totals"
          />
          <FormControlLabel
            control={<Checkbox checked={showItems} onChange={(_, checked) => setShowItems(checked)} />}
            label="Chargeback items"
          />
          <FormControlLabel
            control={<Checkbox checked={showKpis} onChange={(_, checked) => setShowKpis(checked)} />}
            label="Chargeback KPIs"
          />
          <FormControlLabel
            control={<Checkbox checked={showIntercompany} onChange={(_, checked) => setShowIntercompany(checked)} />}
            label="Intercompany flows"
          />
        </>
      )}
      actions={(
        <Button
          variant="contained"
          size="small"
          onClick={() => refetch()}
          disabled={!companyId || isFetching}
        >
          {!companyId ? 'Select a company' : isFetching ? 'Refreshing…' : 'Run'}
        </Button>
      )}
      onExportTableCsv={isReady ? exportDepartmentsCsv : undefined}
      onExportChartPng={isReady ? exportChart : undefined}
    >
      <Stack spacing={2}>
        {!isReady && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Select a company to explore chargeback details</Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a company, year, and budget column to generate the detailed chargeback view. Department totals,
              itemised allocations, and KPIs will appear once the report runs.
            </Typography>
          </Paper>
        )}

        {isReady && companySummary && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{companySummary.name}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{formatCurrency(companySummary.total)}</Typography>
                <Typography variant="body2" color="text.secondary">{`${metricLabel} • ${year} • ${reportingCurrency}`}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' } }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Headcount</Typography>
                  <Typography variant="subtitle2">{formatCount(companySummary.headcount)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">IT users</Typography>
                  <Typography variant="subtitle2">{formatCount(companySummary.itUsers)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Cost per user</Typography>
                  <Typography variant="subtitle2">{companySummary.costPerUser != null ? formatCurrency(companySummary.costPerUser) : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Cost per IT user</Typography>
                  <Typography variant="subtitle2">{companySummary.costPerItUser != null ? formatCurrency(companySummary.costPerItUser) : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">IT costs vs turnover</Typography>
                  <Typography variant="subtitle2">{companySummary.costVsTurnoverPct != null ? formatPercent(companySummary.costVsTurnoverPct) : '—'}</Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>
        )}

        {isReady && warnings.length > 0 && (
          <Alert severity="warning" sx={{ whiteSpace: 'pre-wrap' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Some allocations were skipped</Typography>
            <Box component="ul" sx={{ pl: 3, my: 0 }}>
              {warnings.map((warning: string, index: number) => (
                <Typography component="li" variant="body2" key={`${warning}-${index}`}>
                  {warning}
                </Typography>
              ))}
            </Box>
          </Alert>
        )}

        {isReady && showDepartments && departments.length > 0 && (
          <Stack spacing={2} direction={{ xs: 'column', xl: 'row' }} alignItems={{ xs: 'stretch', xl: 'flex-start' }}>
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Department totals</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Consolidated chargeback per department. "Common Costs" aggregates allocations without a specific department.
              </Typography>
              <Box component={AgGridBox}>
                <AgGridReact
                  rowData={departments}
                  columnDefs={departmentColumns}
                  defaultColDef={{ sortable: true, resizable: true }}
                  onGridReady={(event) => {
                    departmentGridRef.current = event.api;
                  }}
                  domLayout="autoHeight"
                />
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Department distribution</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Horizontal bar chart mirroring the table totals.
              </Typography>
              {chartOptions ? (
                <ChartCard ref={chartRef} title="Chart" options={chartOptions} height={480} />
              ) : (
                <Typography variant="body2" color="text.secondary">Chart unavailable.</Typography>
              )}
            </Paper>
          </Stack>
        )}

        {isReady && showDepartments && departments.length === 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Department totals</Typography>
            <Typography variant="body2" color="text.secondary">No department-level allocations for the selected configuration.</Typography>
          </Paper>
        )}

        {isReady && showItems && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Chargeback items</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Itemised spend contributing to the company chargeback, including the allocation method and share of the total amount.
            </Typography>
            {items.length > 0 ? (
              <Box component={AgGridBox}>
                <AgGridReact
                  rowData={items}
                  columnDefs={itemColumns}
                  defaultColDef={{ sortable: true, resizable: true }}
                  pinnedBottomRowData={itemsPinnedBottom}
                  domLayout="autoHeight"
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No chargeback items for the selected configuration.</Typography>
            )}
          </Paper>
        )}

        {isReady && showIntercompany && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Intercompany flows</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Partner companies with receivables (you paid for them), payables (they paid for you), and the net total. Self-consumption excluded.
            </Typography>
            {intercompanyRows.length > 0 ? (
              <Box component={AgGridBox}>
                <AgGridReact
                  rowData={intercompanyRows}
                  columnDefs={intercompanyColumns}
                  defaultColDef={{ sortable: true, resizable: true }}
                  pinnedBottomRowData={intercompanyPinnedBottom}
                  onGridReady={(e) => { intercompanyGridRef.current = e.api; }}
                  domLayout="autoHeight"
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No intercompany flows for the selected configuration.</Typography>
            )}
            <Divider sx={{ my: 2 }} />
            <Button variant="outlined" size="small" onClick={exportIntercompanyCsv}>Export flows CSV</Button>
          </Paper>
        )}

        {isReady && showKpis && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Chargeback KPIs</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Headcount, IT users, and turnover sourced from company metrics for the selected year.
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell align="right">{metricLabel}</TableCell>
                    <TableCell align="right">Headcount</TableCell>
                    <TableCell align="right">IT users</TableCell>
                    <TableCell align="right">Turnover</TableCell>
                    <TableCell align="right">IT costs vs turnover</TableCell>
                    <TableCell align="right">IT costs per user</TableCell>
                    <TableCell align="right">IT costs per IT user</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kpiRows.map((row: CompanyChargebackKpiRow) => (
                    <TableRow key={row.companyId} hover>
                      <TableCell>{row.companyName}</TableCell>
                      <TableCell align="right">{formatCurrency(row.amount)}</TableCell>
                      <TableCell align="right">{formatCount(row.headcount)}</TableCell>
                      <TableCell align="right">{formatCount(row.itUsers)}</TableCell>
                      <TableCell align="right">{row.turnover != null ? formatCurrency(row.turnover, true) : '—'}</TableCell>
                      <TableCell align="right">{row.costVsTurnoverPct != null ? formatPercent(row.costVsTurnoverPct) : '—'}</TableCell>
                      <TableCell align="right">{row.costPerUser != null ? formatCount(Math.round(row.costPerUser)) : '—'}</TableCell>
                      <TableCell align="right">{row.costPerItUser != null ? formatCount(Math.round(row.costPerItUser)) : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {kpiRows.length === 0 && (
                    <TableRow>
                      <TableCell align="center" colSpan={8} sx={{ color: 'text.secondary' }}>
                        No KPI data available for the selected year.
                      </TableCell>
                    </TableRow>
                  )}
                  {kpiRows.length > 0 && globalKpi && (
                    <TableRow sx={{ '& > *': { fontWeight: 600 } }}>
                      <TableCell>Global totals</TableCell>
                      <TableCell align="right">{formatCurrency(globalKpi.amount)}</TableCell>
                      <TableCell align="right">{formatCount(globalKpi.headcount)}</TableCell>
                      <TableCell align="right">{formatCount(globalKpi.itUsers)}</TableCell>
                      <TableCell align="right">{globalKpi.turnover != null ? formatCurrency(globalKpi.turnover, true) : '—'}</TableCell>
                      <TableCell align="right">{globalKpi.costVsTurnoverPct != null ? formatPercent(globalKpi.costVsTurnoverPct) : '—'}</TableCell>
                      <TableCell align="right">{globalKpi.costPerUser != null ? formatCount(Math.round(globalKpi.costPerUser)) : '—'}</TableCell>
                      <TableCell align="right">{globalKpi.costPerItUser != null ? formatCount(Math.round(globalKpi.costPerItUser)) : '—'}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        )}

        {isReady && isLoading && (
          <Typography variant="body2" color="text.secondary">Loading report…</Typography>
        )}
      </Stack>
    </ReportLayout>
  );
}
