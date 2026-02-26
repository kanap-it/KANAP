import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  ButtonBase,
  Collapse,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Checkbox,
  ListItemText,
  Autocomplete,
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellStyle } from 'ag-grid-community';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import ReportLayout from '../../components/reports/ReportLayout';
import AgGridBox from '../../components/AgGridBox';
import api from '../../api';
import ContributorDrilldownDialog from './components/ContributorDrilldownDialog';

type CapacityColorBand = 'green' | 'yellow' | 'orange' | 'red' | 'violet' | 'na';

type ContributorCapacityRow = {
  contributorId: string;
  contributorName: string;
  teamId: string | null;
  teamName: string | null;
  remainingDays: number;
  capacityDaysPerMonth: number | null;
  capacitySource: 'historical' | 'theoretical' | null;
  monthsOfWork: number | null;
  colorBand: CapacityColorBand;
};

type TeamCapacityRow = {
  teamId: string;
  teamName: string;
  memberCount: number;
  remainingDays: number;
  capacityDaysPerMonth: number | null;
  monthsOfWork: number | null;
  colorBand: CapacityColorBand;
};

type UnassignedProjectRow = {
  projectId: string;
  projectName: string;
  status: string;
  estimatedEffort: number;
  remainingEffort: number;
  unallocatedPct: number;
  unallocatedDays: number;
};

type CapacityHeatmapResponse = {
  contributors: ContributorCapacityRow[];
  teams: TeamCapacityRow[];
  unassignedSummary: { totalProjects: number; totalUnallocatedDays: number };
  unassignedProjects: UnassignedProjectRow[];
  filters: { teamIds: string[]; statuses: string[]; capacityMode: string; groupBy: string };
};

type TeamOption = { id: string; name: string };

const NO_TEAM_ID = 'no-team';
const STATUS_OPTIONS = [
  { value: 'waiting_list', label: 'Waiting List' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_testing', label: 'In Testing' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DEFAULT_STATUSES = ['waiting_list', 'planned', 'in_progress', 'in_testing', 'on_hold'];

const STATUS_LABELS: Record<string, string> = STATUS_OPTIONS.reduce((acc, curr) => {
  acc[curr.value] = curr.label;
  return acc;
}, {} as Record<string, string>);

const HEATMAP_COLORS: Record<CapacityColorBand, string> = {
  green: '#C8E6C9',
  yellow: '#FFF9C4',
  orange: '#FFE0B2',
  red: '#FFCDD2',
  violet: '#E1BEE7',
  na: '#E0E0E0',
};

const formatNumber = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
};

const formatPercent = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
};

const formatSource = (value: ContributorCapacityRow['capacitySource']) => {
  if (value === 'historical') return 'Historical';
  if (value === 'theoretical') return 'Theoretical';
  return 'N/A';
};

const exportElementAsPng = async (node: HTMLElement, fileName: string) => {
  const width = node.scrollWidth;
  const height = node.scrollHeight;
  if (!width || !height) return;

  let cssText = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        cssText += rule.cssText;
      }
    } catch {
      // Ignore cross-origin stylesheets
    }
  }

  const serializer = new XMLSerializer();
  const cloned = node.cloneNode(true) as HTMLElement;
  cloned.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  if (cloned.classList.contains('ag-theme-quartz-dark')) {
    cloned.classList.remove('ag-theme-quartz-dark');
    cloned.classList.add('ag-theme-quartz');
  }
  cloned.querySelectorAll('.ag-theme-quartz-dark').forEach((gridNode) => {
    gridNode.classList.remove('ag-theme-quartz-dark');
    gridNode.classList.add('ag-theme-quartz');
  });
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>${cssText}</style>
      <foreignObject width="100%" height="100%">${serializer.serializeToString(cloned)}</foreignObject>
    </svg>
  `;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = url;
};

export default function CapacityHeatmapReport() {
  const [capacityMode, setCapacityMode] = useState<'historical' | 'theoretical'>('historical');
  const [groupBy, setGroupBy] = useState<'contributor' | 'team'>('contributor');
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const [drilldownContributor, setDrilldownContributor] = useState<{ id: string; name: string } | null>(null);

  const heatmapGridRef = useRef<any>(null);
  const unassignedGridRef = useRef<any>(null);
  const heatmapExportRef = useRef<HTMLDivElement | null>(null);
  const initialTeamsSet = useRef(false);

  const { data: teamsData, isLoading: isLoadingTeams } = useQuery<TeamOption[]>({
    queryKey: ['portfolio-teams'],
    queryFn: async () => {
      const res = await api.get('/portfolio/teams');
      return (res.data || []) as TeamOption[];
    },
  });

  const teamOptions = useMemo<TeamOption[]>(() => {
    const teams = (teamsData || []).map((t) => ({ id: t.id, name: t.name }));
    return [...teams, { id: NO_TEAM_ID, name: 'No team' }];
  }, [teamsData]);

  useEffect(() => {
    if (initialTeamsSet.current) return;
    if (isLoadingTeams) return;
    if (teamOptions.length === 0) return;
    setSelectedTeamIds(teamOptions.map((t) => t.id));
    initialTeamsSet.current = true;
  }, [teamOptions, isLoadingTeams]);

  const allTeamIds = teamOptions.map((t) => t.id);
  const selectedTeams = teamOptions.filter((t) => selectedTeamIds.includes(t.id));
  const teamParam = selectedTeamIds.length === 0 || selectedTeamIds.length === allTeamIds.length
    ? undefined
    : selectedTeamIds.join(',');

  const queryKey = ['portfolio-capacity-heatmap', teamParam, statuses, capacityMode, groupBy];
  const { data, isLoading, isFetching } = useQuery<CapacityHeatmapResponse>({
    queryKey,
    queryFn: async () => {
      const params: any = { capacityMode, groupBy };
      if (teamParam) params.teamIds = teamParam;
      if (statuses.length) params.statuses = statuses.join(',');
      const res = await api.get('/portfolio/reports/capacity-heatmap', { params });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const rows = groupBy === 'team' ? (data?.teams ?? []) : (data?.contributors ?? []);
  const unassigned = data?.unassignedProjects ?? [];
  const unassignedSummary = data?.unassignedSummary ?? { totalProjects: 0, totalUnallocatedDays: 0 };

  const avgMonths = useMemo(() => {
    const values = (data?.contributors ?? []).map((c) => c.monthsOfWork).filter((v) => v != null) as number[];
    if (!values.length) return null;
    const total = values.reduce((s, v) => s + v, 0);
    return total / values.length;
  }, [data?.contributors]);

  const heatmapCellStyle = useCallback((params: any): CellStyle => {
    const band: CapacityColorBand = params.data?.colorBand ?? 'na';
    return { backgroundColor: HEATMAP_COLORS[band], fontWeight: 600 };
  }, []);

  const contributorColumns = useMemo<ColDef[]>(() => ([
    { field: 'contributorName', headerName: 'Contributor', flex: 1, minWidth: 200 },
    { field: 'teamName', headerName: 'Team', width: 160, valueGetter: (p) => p.data?.teamName || 'No team' },
    { field: 'remainingDays', headerName: 'Remaining days', width: 150, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'capacityDaysPerMonth', headerName: 'Capacity / mo', width: 150, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'capacitySource', headerName: 'Source', width: 120, valueFormatter: (p) => formatSource(p.value) },
    { field: 'monthsOfWork', headerName: 'Months of work', width: 150, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value), cellStyle: heatmapCellStyle },
  ]), [heatmapCellStyle]);

  const teamColumns = useMemo<ColDef[]>(() => ([
    { field: 'teamName', headerName: 'Team', flex: 1, minWidth: 200 },
    { field: 'memberCount', headerName: 'Members', width: 120, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'remainingDays', headerName: 'Remaining days', width: 150, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'capacityDaysPerMonth', headerName: 'Capacity / mo', width: 150, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'monthsOfWork', headerName: 'Months of work', width: 150, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value), cellStyle: heatmapCellStyle },
  ]), [heatmapCellStyle]);

  const unassignedColumns = useMemo<ColDef[]>(() => ([
    { field: 'projectName', headerName: 'Project', flex: 1, minWidth: 220 },
    { field: 'status', headerName: 'Status', width: 140, valueFormatter: (p) => STATUS_LABELS[p.value] || p.value },
    { field: 'estimatedEffort', headerName: 'Est. Effort', width: 130, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'remainingEffort', headerName: 'Remaining', width: 130, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'unallocatedPct', headerName: 'Unallocated %', width: 140, type: 'rightAligned', valueFormatter: (p) => formatPercent(p.value) },
    { field: 'unallocatedDays', headerName: 'Unallocated Days', width: 150, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
  ]), []);

  const handleExportCsv = () => {
    heatmapGridRef.current?.exportDataAsCsv?.({ fileName: `capacity-heatmap-${groupBy}` });
  };

  const handleExportPng = () => {
    if (!heatmapExportRef.current) return;
    exportElementAsPng(heatmapExportRef.current, `capacity-heatmap-${groupBy}`);
  };

  return (
    <ReportLayout
      title="Capacity Heatmap"
      subtitle="Expected workload vs capacity for contributors and teams"
      rootTo="/portfolio/reports"
      rootLabel="Portfolio Reporting"
      filters={(
        <>
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            options={teamOptions}
            value={selectedTeams}
            onChange={(_, next) => {
              const ids = next.map((t) => t.id);
              if (ids.length === 0 && allTeamIds.length > 0) {
                setSelectedTeamIds(allTeamIds);
                return;
              }
              setSelectedTeamIds(ids);
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                <ListItemText primary={option.name} />
              </li>
            )}
            renderTags={() => []}
            renderInput={(params) => {
              const count = selectedTeamIds.length;
              const label = count === 0 || count === allTeamIds.length
                ? 'All teams'
                : count === 1
                  ? '1 team selected'
                  : `${count} teams selected`;
              return (
                <TextField
                  {...params}
                  label="Teams"
                  placeholder={label}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 220 }}
                />
              );
            }}
            sx={{ minWidth: 240 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statuses}
            SelectProps={{
              multiple: true,
              renderValue: (sel: any) => (sel as string[]).map((s) => STATUS_LABELS[s] || s).join(', '),
            }}
            onChange={(e) => {
              const value = e.target.value as unknown as string[];
              const arr = Array.isArray(value) ? value : [value];
              if (arr.length === 0) setStatuses(DEFAULT_STATUSES);
              else setStatuses(arr);
            }}
            sx={{ minWidth: 240 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                <Checkbox checked={statuses.includes(s.value)} />
                <ListItemText primary={s.label} />
              </MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup
            size="small"
            color="primary"
            exclusive
            value={capacityMode}
            onChange={(_, v) => { if (v) setCapacityMode(v); }}
          >
            <ToggleButton value="historical">Historical</ToggleButton>
            <ToggleButton value="theoretical">Theoretical</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            size="small"
            color="primary"
            exclusive
            value={groupBy}
            onChange={(_, v) => { if (v) setGroupBy(v); }}
          >
            <ToggleButton value="contributor">Contributors</ToggleButton>
            <ToggleButton value="team">Teams</ToggleButton>
          </ToggleButtonGroup>
        </>
      )}
      onExportTableCsv={handleExportCsv}
      onExportChartPng={handleExportPng}
    >
      <Box className="capacity-heatmap-print">
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <SummaryCard
              label="Total contributors"
              value={formatNumber((data?.contributors ?? []).length)}
              helper={groupBy === 'team' ? `${(data?.teams ?? []).length} team(s)` : undefined}
            />
            <SummaryCard
              label="Avg months of work"
              value={avgMonths != null ? formatNumber(avgMonths) : 'N/A'}
              helper="Based on contributors with capacity"
            />
            <SummaryCard
              label="Unassigned work"
              value={`${formatNumber(unassignedSummary.totalUnallocatedDays)} days`}
              helper={`${unassignedSummary.totalProjects} project(s)`}
              onClick={() => setUnassignedOpen((v) => !v)}
            />
          </Stack>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              {groupBy === 'team' ? 'Team Capacity' : 'Contributor Capacity'}
            </Typography>
            <Box ref={heatmapExportRef} sx={{ width: '100%' }}>
              <Box component={AgGridBox} sx={{ height: 420 }}>
                <AgGridReact
                  rowData={rows}
                  columnDefs={groupBy === 'team' ? teamColumns : contributorColumns}
                  defaultColDef={{ sortable: true, resizable: true }}
                  onGridReady={(e) => { heatmapGridRef.current = e.api; }}
                  onRowClicked={(e) => {
                    if (groupBy !== 'contributor') return;
                    const id = e.data?.contributorId;
                    if (!id) return;
                    setDrilldownContributor({ id, name: e.data?.contributorName || 'Contributor' });
                  }}
                />
              </Box>
            </Box>
            {(isLoading || isFetching) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Loading capacity data...
              </Typography>
            )}
            {!isLoading && rows.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No capacity data for the selected filters.
              </Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Unassigned Work</Typography>
              <ButtonBase onClick={() => setUnassignedOpen((v) => !v)} sx={{ px: 1, py: 0.5, borderRadius: 1 }}>
                <Typography variant="body2" color="primary">
                  {unassignedOpen ? 'Hide details' : 'Show details'}
                </Typography>
              </ButtonBase>
            </Stack>
            <Collapse in={unassignedOpen}>
              <Box sx={{ mt: 2 }}>
                <Box component={AgGridBox} sx={{ height: 300 }}>
                  <AgGridReact
                    rowData={unassigned}
                    columnDefs={unassignedColumns}
                    defaultColDef={{ sortable: true, resizable: true }}
                    onGridReady={(e) => { unassignedGridRef.current = e.api; }}
                  />
                </Box>
                {!isLoading && unassigned.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No unassigned work for the selected filters.
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Paper>
        </Stack>
      </Box>

      <ContributorDrilldownDialog
        open={Boolean(drilldownContributor)}
        contributorId={drilldownContributor?.id ?? null}
        contributorName={drilldownContributor?.name ?? null}
        statuses={statuses}
        onClose={() => setDrilldownContributor(null)}
      />
    </ReportLayout>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  onClick,
}: {
  label: string;
  value: string;
  helper?: string;
  onClick?: () => void;
}) {
  const content = (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6">{value}</Typography>
      {helper && (
        <Typography variant="body2" color="text.secondary">{helper}</Typography>
      )}
    </Stack>
  );
  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 200 }}>
      {onClick ? (
        <ButtonBase
          onClick={onClick}
          sx={{ width: '100%', textAlign: 'left', p: 2, alignItems: 'flex-start' }}
        >
          {content}
        </ButtonBase>
      ) : (
        <Box sx={{ p: 2 }}>
          {content}
        </Box>
      )}
    </Paper>
  );
}
