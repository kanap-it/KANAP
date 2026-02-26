import React, { useCallback, useMemo, useRef } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import AgGridBox from '../../../components/AgGridBox';

type ProjectBreakdownRow = {
  projectId: string;
  projectName: string;
  status: string;
  estimatedEffort: number;
  executionProgress: number;
  remainingEffort: number;
  allocationPct: number;
  contributorDays: number;
};

const STATUS_LABELS: Record<string, string> = {
  waiting_list: 'Waiting List',
  planned: 'Planned',
  in_progress: 'In Progress',
  in_testing: 'In Testing',
  on_hold: 'On Hold',
  done: 'Done',
  cancelled: 'Cancelled',
};

const formatNumber = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
};

const formatPercent = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
};

type ContributorDrilldownDialogProps = {
  open: boolean;
  contributorId: string | null;
  contributorName?: string | null;
  statuses: string[];
  onClose: () => void;
};

export default function ContributorDrilldownDialog({
  open,
  contributorId,
  contributorName,
  statuses,
  onClose,
}: ContributorDrilldownDialogProps) {
  const gridApiRef = useRef<any>(null);
  const navigate = useNavigate();
  const queryKey = ['portfolio-capacity-drilldown', contributorId, statuses];
  const { data, isLoading } = useQuery<{ projects: ProjectBreakdownRow[] }>({
    queryKey,
    enabled: open && Boolean(contributorId),
    queryFn: async () => {
      if (!contributorId) return { projects: [] };
      const params: any = {};
      if (statuses?.length) params.statuses = statuses.join(',');
      const res = await api.get(`/portfolio/reports/capacity-heatmap/contributor/${contributorId}`, { params });
      return res.data;
    },
  });

  const rows = data?.projects ?? [];

  const openProject = useCallback((projectId?: string) => {
    if (!projectId) return;
    onClose();
    navigate(`/portfolio/projects/${projectId}/effort`);
  }, [navigate, onClose]);

  const columns = useMemo<ColDef[]>(() => ([
    {
      field: 'projectName',
      headerName: 'Project',
      flex: 1,
      minWidth: 220,
      cellRenderer: (p: any) => (
        <Box
          component="span"
          sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
          onClick={() => openProject(p.data?.projectId)}
        >
          {p.value}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      valueFormatter: (p) => STATUS_LABELS[p.value] || p.value,
    },
    { field: 'estimatedEffort', headerName: 'Est. Effort', width: 130, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'executionProgress', headerName: 'Progress', width: 120, type: 'rightAligned', valueFormatter: (p) => formatPercent(p.value) },
    { field: 'remainingEffort', headerName: 'Remaining', width: 130, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'allocationPct', headerName: 'Allocation %', width: 130, type: 'rightAligned', valueFormatter: (p) => formatPercent(p.value) },
    { field: 'contributorDays', headerName: 'Your Days', width: 120, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
  ]), []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {contributorName ? `${contributorName} - Project Breakdown` : 'Project Breakdown'}
        <IconButton
          aria-label="Close"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Box component={AgGridBox} sx={{ height: 360, width: '100%' }}>
          <AgGridReact
            rowData={rows}
            columnDefs={columns}
            defaultColDef={{ sortable: true, resizable: true }}
            onGridReady={(e) => { gridApiRef.current = e.api; }}
            suppressNoRowsOverlay={false}
          />
        </Box>
        {isLoading && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading project breakdown...</Typography>
        )}
        {!isLoading && rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No matching projects for this contributor.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
