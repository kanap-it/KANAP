import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ImageIcon from '@mui/icons-material/Image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../../api';
import { PortfolioGantt } from './PortfolioGantt';

type RoadmapTab = 'schedule' | 'bottlenecks' | 'occupation';
type OccupationView = 'contributor' | 'team';

type ScheduledProject = {
  projectId: string;
  projectName: string;
  status: string;
  categoryId: string | null;
  executionProgress: number;
  priorityScore: number | null;
  plannedStart: string;
  historicalStart: string | null;
  plannedEnd: string;
  durationWeeks: number;
  remainingEffortDays: number;
  blockerProjectIds: string[];
  contributorLoads: Array<{
    contributorId: string;
    contributorName: string;
    days: number;
  }>;
};

type ReservationReason = 'not_recalculated' | 'external_blocker';

type ReservationProject = {
  projectId: string;
  projectName: string;
  status: string;
  categoryId: string | null;
  executionProgress: number;
  plannedStart: string;
  plannedEnd: string;
  reason: ReservationReason;
  contributorLoads: Array<{
    contributorId: string;
    contributorName: string;
    days: number;
  }>;
};

type UnschedulableProject = {
  projectId: string;
  projectName: string;
  status: string;
  reason: string;
  details?: string;
};

type BottleneckEntry = {
  contributorId: string;
  contributorName: string;
  impactDays: number;
};

type BottleneckProjectContribution = {
  projectId: string;
  projectName: string;
  plannedStart: string;
  plannedEnd: string;
  totalContributionDays: number;
  spentDays: number;
};

type OccupationEntry = {
  contributorId: string;
  contributorName: string;
  teamId: string | null;
  teamName: string | null;
  week: string;
  effortDays: number;
  capacityDays: number | null;
  occupationPct: number | null;
  projects: Array<{ projectId: string; projectName: string; days: number }>;
};

type TeamOccupationEntry = {
  teamId: string | null;
  teamName: string | null;
  week: string;
  effortDays: number;
  capacityDays: number | null;
  occupationPct: number | null;
};

type ContributorOccupationRow = {
  contributorId: string;
  contributorName: string;
  teamId: string | null;
  teamName: string;
  weekOccupation: Map<string, number | null>;
};

type ContributorOccupationGroup = {
  teamId: string | null;
  teamName: string;
  rows: ContributorOccupationRow[];
};

type TeamOccupationRow = {
  teamId: string | null;
  teamName: string;
  weekOccupation: Map<string, number | null>;
};

type Category = {
  id: string;
  name: string;
};

type RoadmapResponse = {
  schedule: ScheduledProject[];
  reservations: ReservationProject[];
  unschedulable: UnschedulableProject[];
  bottlenecks: BottleneckEntry[];
  occupation: OccupationEntry[];
  teamOccupation: TeamOccupationEntry[];
  roadmapEndDate: string | null;
  diagnostics: {
    modeLabel: string;
    runDurationMs: number;
    candidateProjects: number;
    scheduledProjects: number;
    reservationProjects: number;
    reservationByReason: {
      not_recalculated: number;
      external_blocker: number;
    };
    hiddenCapacityProjects: number;
    frozenProjects: number;
    unschedulableProjects: number;
    sensitivityReruns: number;
    sensitivityTruncated: boolean;
  };
};

const STATUS_OPTIONS = [
  { value: 'waiting_list', label: 'Waiting List' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_testing', label: 'In Testing' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'done', label: 'Done' },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]));

const REASON_LABELS: Record<string, string> = {
  zero_remaining_effort: 'No Remaining Effort',
  no_assigned_contributors: 'No Contributors',
  missing_blocker_date: 'Missing Blocker Date',
  cyclic_dependency: 'Cyclic Dependency',
  insufficient_capacity: 'Insufficient Capacity',
  missing_contributor_capacity: 'Missing Contributor Capacity',
};

const RESERVATION_REASON_LABELS: Record<ReservationReason, string> = {
  not_recalculated: 'Not Recalculated',
  external_blocker: 'External Blocker',
};

const GANTT_STATUS_COLORS: Record<string, string> = {
  waiting_list: '#ffa726',
  planned: '#66bb6a',
  in_progress: '#42a5f5',
  in_testing: '#29b6f6',
  on_hold: '#ef5350',
  done: '#9e9e9e',
};

const getTodayYmd = (): string => {
  return new Date().toISOString().slice(0, 10);
};

const getIsoWeekParts = (weekStartYmd: string): { week: number; year: number } => {
  const base = new Date(`${weekStartYmd}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return { week: 0, year: 0 };
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year };
};

const getOccupationCellBackground = (
  occupationPct: number | null | undefined,
  tone: 'contributor' | 'team',
): string | undefined => {
  if (occupationPct == null || !Number.isFinite(occupationPct)) return undefined;
  const intensity = Math.min(1, Math.max(0, occupationPct) / 120);
  if (tone === 'contributor') {
    return `rgba(255, 152, 0, ${0.08 + intensity * 0.22})`;
  }
  return `rgba(33, 150, 243, ${0.08 + intensity * 0.22})`;
};

const calcMonthsSpan = (schedule: Array<{ plannedEnd: string }>): number => {
  const now = new Date();
  if (schedule.length === 0) return 6;

  const endDates = schedule.map((p) => new Date(`${p.plannedEnd}T00:00:00`));
  const latestEnd = new Date(Math.max(...endDates.map((d) => d.getTime())));

  // Keep the same 25/75 past-future behavior as the main planning page (monthOffset=0),
  // while extending the visible window enough to include the latest scheduled completion.
  let months = 3;
  for (let i = 0; i < 240; i += 1) {
    const pastMonths = Math.max(0, Math.round(months * 0.25));
    const start = new Date(now);
    start.setMonth(start.getMonth() - pastMonths);
    start.setDate(1);

    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    end.setDate(0);
    if (end.getTime() >= latestEnd.getTime()) {
      return Math.max(3, months);
    }
    months += 1;
  }

  return 240;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseYmdUtc = (value: string): Date => {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
};

const dayDiffUtc = (start: Date, end: Date): number => {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
};

const getMonthLabel = (date: Date): string => {
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} ${date.getUTCFullYear()}`;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

type GanttRoadmapItem = {
  projectId: string;
  projectName: string;
  status: string;
  executionProgress: number;
  plannedStart: string;
  plannedEnd: string;
  historicalStart?: string | null;
  isReservation?: boolean;
  reservationReason?: ReservationReason;
};

const exportRoadmapGanttAsPng = async (
  projects: GanttRoadmapItem[],
  months: number,
  monthOffset: number,
  fileName: string,
): Promise<void> => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const pastMonths = Math.max(0, Math.round(months * 0.25));
  const rangeStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset - pastMonths, 1));
  const rangeEnd = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth() + months, 0));
  const totalDays = Math.max(1, dayDiffUtc(rangeStart, rangeEnd) + 1);

  const rows = Math.max(1, projects.length);
  const headerHeight = 40;
  const rowHeight = 34;
  const leftWidth = 360;
  const chartWidthTarget = Math.min(2600, Math.max(900, totalDays * 3));
  const pxPerDay = chartWidthTarget / totalDays;
  const chartWidth = Math.round(totalDays * pxPerDay);
  const canvasWidth = leftWidth + chartWidth;
  const canvasHeight = headerHeight + (rows * rowHeight) + 1;

  const scale = Math.max(1, Math.ceil(window.devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#f7f8fb';
  ctx.fillRect(0, 0, leftWidth, canvasHeight);
  ctx.fillStyle = '#fafbff';
  ctx.fillRect(leftWidth, 0, chartWidth, headerHeight);

  ctx.strokeStyle = '#dfe3eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftWidth + 0.5, 0);
  ctx.lineTo(leftWidth + 0.5, canvasHeight);
  ctx.stroke();

  // Month header.
  ctx.font = '600 12px Arial, sans-serif';
  ctx.fillStyle = '#334155';
  for (let cursor = new Date(rangeStart); cursor.getTime() <= rangeEnd.getTime();) {
    const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const monthEnd = new Date(Math.min(nextMonth.getTime() - MS_PER_DAY, rangeEnd.getTime()));

    const startOffset = dayDiffUtc(rangeStart, monthStart);
    const endOffset = dayDiffUtc(rangeStart, monthEnd) + 1;
    const startX = leftWidth + (Math.max(0, startOffset) * pxPerDay);
    const endX = leftWidth + (Math.min(totalDays, endOffset) * pxPerDay);
    if (endX > startX) {
      ctx.beginPath();
      ctx.moveTo(Math.round(startX) + 0.5, 0);
      ctx.lineTo(Math.round(startX) + 0.5, canvasHeight);
      ctx.strokeStyle = '#e6e9ef';
      ctx.stroke();

      const label = getMonthLabel(monthStart);
      const textWidth = ctx.measureText(label).width;
      const centerX = startX + ((endX - startX) / 2);
      ctx.fillText(label, Math.round(centerX - (textWidth / 2)), 24);
    }

    cursor = nextMonth;
  }

  ctx.strokeStyle = '#dfe3eb';
  ctx.beginPath();
  ctx.moveTo(0, headerHeight + 0.5);
  ctx.lineTo(canvasWidth, headerHeight + 0.5);
  ctx.stroke();

  ctx.font = '600 12px Arial, sans-serif';
  ctx.fillStyle = '#1f2937';
  ctx.fillText('Project', 12, 24);

  // Rows + bars.
  projects.forEach((project, index) => {
    const rowY = headerHeight + (index * rowHeight);
    const isOdd = index % 2 === 1;
    if (isOdd) {
      ctx.fillStyle = '#fcfdff';
      ctx.fillRect(leftWidth, rowY, chartWidth, rowHeight);
    }

    ctx.strokeStyle = '#edf0f4';
    ctx.beginPath();
    ctx.moveTo(0, rowY + rowHeight + 0.5);
    ctx.lineTo(canvasWidth, rowY + rowHeight + 0.5);
    ctx.stroke();

    // Project name cell text with simple clipping.
    ctx.save();
    ctx.beginPath();
    ctx.rect(10, rowY + 4, leftWidth - 20, rowHeight - 8);
    ctx.clip();
    ctx.font = '500 12px Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(project.projectName, 12, rowY + 21);
    ctx.restore();

    const start = parseYmdUtc(project.plannedStart);
    const end = parseYmdUtc(project.plannedEnd);
    const startDayRaw = dayDiffUtc(rangeStart, start);
    const startDay = Math.max(0, startDayRaw);
    const endDay = Math.min(totalDays - 1, dayDiffUtc(rangeStart, end));
    if (endDay < 0 || startDay >= totalDays || endDay < startDay) return;

    const barX = leftWidth + (startDay * pxPerDay) + 1;
    const barWidth = Math.max(3, ((endDay - startDay + 1) * pxPerDay) - 2);
    const barY = rowY + 7;
    const barHeight = rowHeight - 14;
    const isReservation = !!project.isReservation;
    const color = isReservation ? '#607d8b' : (GANTT_STATUS_COLORS[project.status] || GANTT_STATUS_COLORS.planned);
    const progressRatio = Math.max(0, Math.min(1, project.executionProgress / 100));
    const historicalStart = project.historicalStart ? parseYmdUtc(project.historicalStart) : null;
    const hasHistoricalLead = !isReservation && !!historicalStart && historicalStart.getTime() < start.getTime();

    if (hasHistoricalLead) {
      const historicalDayRaw = dayDiffUtc(rangeStart, historicalStart!);
      const leadStartX = leftWidth + (Math.max(0, Math.min(totalDays, historicalDayRaw)) * pxPerDay);
      const leadEndX = leftWidth + (Math.max(0, Math.min(totalDays, startDayRaw)) * pxPerDay);
      if (leadEndX > leadStartX + 0.5) {
        const leadY = rowY + (rowHeight / 2) + 0.5;
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(leadStartX, leadY);
        ctx.lineTo(leadEndX, leadY);
        ctx.stroke();
        ctx.setLineDash([]);
        if (historicalDayRaw >= 0 && historicalDayRaw < totalDays) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(leadStartX, leadY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    if (isReservation) {
      ctx.fillStyle = '#eceff1';
      drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.fill();
      ctx.save();
      drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.clip();
      ctx.strokeStyle = '#cfd8dc';
      ctx.lineWidth = 1;
      for (let x = barX - barHeight; x < barX + barWidth + barHeight; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, barY + barHeight);
        ctx.lineTo(x + barHeight, barY);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#90a4ae';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.stroke();
    } else {
      ctx.fillStyle = `${color}55`;
      drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.stroke();

      if (progressRatio > 0) {
        ctx.fillStyle = color;
        drawRoundedRect(ctx, barX, barY, barWidth * progressRatio, barHeight, 4);
        ctx.fill();
      }
    }

    if (barWidth > 26) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(barX + 4, barY + 2, Math.max(0, barWidth - 8), barHeight - 4);
      ctx.clip();
      ctx.font = '500 11px Arial, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(project.projectName, barX + 6, barY + barHeight - 6);
      ctx.restore();
    }
  });

  // Today line (limited to task rows area).
  const todayOffset = dayDiffUtc(rangeStart, today);
  if (todayOffset >= 0 && todayOffset < totalDays) {
    const x = leftWidth + (todayOffset * pxPerDay) + 0.5;
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, headerHeight);
    ctx.lineTo(x, headerHeight + (rows * rowHeight));
    ctx.stroke();
  }

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG generation failed'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
};

type Props = {
  onApplied?: () => void;
};

export default function RoadmapGenerator({ onApplied }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<RoadmapTab>('schedule');
  const [occupationView, setOccupationView] = useState<OccupationView>('contributor');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [startDate, setStartDate] = useState<string>(getTodayYmd());
  const [statuses, setStatuses] = useState<string[]>(['waiting_list', 'planned', 'in_progress', 'in_testing']);
  const [capacityMode, setCapacityMode] = useState<'theoretical' | 'historical'>('theoretical');
  const [parallelizationLimit, setParallelizationLimit] = useState<number>(1);
  const [optimizationMode, setOptimizationMode] = useState<'priority_focused' | 'completion_focused'>('priority_focused');
  const [includeAlreadyScheduled, setIncludeAlreadyScheduled] = useState(true);
  const [contextSwitchPenaltyPct, setContextSwitchPenaltyPct] = useState<number>(0.1);
  const [contextSwitchGrace, setContextSwitchGrace] = useState<number>(1);
  const [collaborativeScheduling, setCollaborativeScheduling] = useState(false);
  const [ganttCategoryId, setGanttCategoryId] = useState<string>('');
  const [showReservations, setShowReservations] = useState(true);
  const [expandedBottleneckIds, setExpandedBottleneckIds] = useState<Set<string>>(new Set());

  const [response, setResponse] = useState<RoadmapResponse | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [scheduleSelectionPool, setScheduleSelectionPool] = useState<ScheduledProject[]>([]);

  const { data: categories } = useQuery({
    queryKey: ['portfolio-categories'],
    queryFn: async () => {
      const res = await api.get('/portfolio/classification/categories');
      return (res.data || []) as Category[];
    },
  });

  const scheduledProjects = response?.schedule ?? [];
  const reservationProjects = response?.reservations ?? [];
  const filteredScheduledProjects = useMemo(
    () => (ganttCategoryId
      ? scheduledProjects.filter((project) => project.categoryId === ganttCategoryId)
      : scheduledProjects),
    [scheduledProjects, ganttCategoryId],
  );
  const filteredReservationProjects = useMemo(
    () => (ganttCategoryId
      ? reservationProjects.filter((project) => project.categoryId === ganttCategoryId)
      : reservationProjects),
    [reservationProjects, ganttCategoryId],
  );
  const scheduleRows = scheduleSelectionPool.length > 0 ? scheduleSelectionPool : scheduledProjects;
  const filteredProjectIds = useMemo(
    () => filteredScheduledProjects.map((project) => project.projectId),
    [filteredScheduledProjects],
  );
  const selectedVisibleScheduledProjects = useMemo(
    () => filteredScheduledProjects.filter((project) => selectedProjectIds.has(project.projectId)),
    [filteredScheduledProjects, selectedProjectIds],
  );
  const selectedSchedulableCount = selectedVisibleScheduledProjects.length;
  const scheduleRowsById = useMemo(
    () => new Map(scheduledProjects.map((project) => [project.projectId, project])),
    [scheduledProjects],
  );
  const allRowsSelected = filteredProjectIds.length > 0
    && filteredProjectIds.every((projectId) => selectedProjectIds.has(projectId));

  const ganttCategoryOptions = useMemo(() => {
    const categoryNameById = new Map((categories ?? []).map((category) => [category.id, category.name]));
    const options = Array.from(
      new Set(
        scheduledProjects
          .map((project) => project.categoryId)
          .concat(reservationProjects.map((project) => project.categoryId))
          .filter((categoryId): categoryId is string => !!categoryId),
      ),
    )
      .sort((left, right) => {
        const leftLabel = categoryNameById.get(left) || left;
        const rightLabel = categoryNameById.get(right) || right;
        return leftLabel.localeCompare(rightLabel);
      })
      .map((categoryId) => ({
        id: categoryId,
        name: categoryNameById.get(categoryId) || categoryId,
      }));
    if (ganttCategoryId && !options.some((option) => option.id === ganttCategoryId)) {
      options.unshift({
        id: ganttCategoryId,
        name: categoryNameById.get(ganttCategoryId) || ganttCategoryId,
      });
    }
    return options;
  }, [categories, ganttCategoryId, reservationProjects, scheduledProjects]);

  const ganttProjects = useMemo(() => {
    const scheduledRows = filteredScheduledProjects.map((project) => ({
      id: project.projectId,
      name: project.projectName,
      status: project.status,
      category_id: project.categoryId,
      planned_start: project.plannedStart,
      historical_start: project.historicalStart,
      planned_end: project.plannedEnd,
      execution_progress: project.executionProgress || 0,
    }));
    if (!showReservations) return scheduledRows;

    const reservationRows = filteredReservationProjects.map((project) => ({
      id: project.projectId,
      name: project.projectName,
      status: project.status,
      category_id: project.categoryId,
      planned_start: project.plannedStart,
      historical_start: null,
      planned_end: project.plannedEnd,
      execution_progress: project.executionProgress || 0,
      is_reservation: true,
      reservation_reason: project.reason,
    }));

    return [...scheduledRows, ...reservationRows];
  }, [filteredReservationProjects, filteredScheduledProjects, showReservations]);

  const ganttExportRows = useMemo<GanttRoadmapItem[]>(() => {
    const scheduledRows = filteredScheduledProjects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      status: project.status,
      executionProgress: project.executionProgress || 0,
      plannedStart: project.plannedStart,
      plannedEnd: project.plannedEnd,
      historicalStart: project.historicalStart,
      isReservation: false,
    }));
    if (!showReservations) return scheduledRows;
    const reservationRows = filteredReservationProjects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      status: project.status,
      executionProgress: project.executionProgress || 0,
      plannedStart: project.plannedStart,
      plannedEnd: project.plannedEnd,
      historicalStart: null,
      isReservation: true,
      reservationReason: project.reason,
    }));
    return [...scheduledRows, ...reservationRows];
  }, [filteredReservationProjects, filteredScheduledProjects, showReservations]);

  const ganttDependencies = useMemo(() => {
    const visibleIds = new Set<string>([
      ...filteredScheduledProjects.map((p) => p.projectId),
      ...(showReservations ? filteredReservationProjects.map((p) => p.projectId) : []),
    ]);
    const links: Array<{
      id: string;
      project_id: string;
      depends_on_project_id: string;
      dependency_type: string;
    }> = [];
    for (const project of scheduledProjects) {
      if (!visibleIds.has(project.projectId)) continue;
      for (const blockerId of project.blockerProjectIds) {
        if (!visibleIds.has(blockerId)) continue;
        links.push({
          id: `${blockerId}:${project.projectId}`,
          project_id: project.projectId,
          depends_on_project_id: blockerId,
          dependency_type: 'blocks',
        });
      }
    }
    return links;
  }, [filteredReservationProjects, filteredScheduledProjects, scheduledProjects, showReservations]);

  const monthsForGantt = useMemo(() => {
    const allRows = [
      ...filteredScheduledProjects.map((item) => ({ plannedEnd: item.plannedEnd })),
      ...(showReservations
        ? filteredReservationProjects.map((item) => ({ plannedEnd: item.plannedEnd }))
        : []),
    ];
    return calcMonthsSpan(allRows);
  }, [filteredReservationProjects, filteredScheduledProjects, showReservations]);
  const monthOffsetForGantt = 0;
  const ganttHeight = useMemo(
    () => Math.max(420, (ganttProjects.length * 38) + 180),
    [ganttProjects.length],
  );

  const bottleneckMaxImpact = useMemo(() => {
    const impacts = (response?.bottlenecks ?? []).map((item) => item.impactDays);
    return impacts.length ? Math.max(...impacts) : 0;
  }, [response?.bottlenecks]);

  const bottleneckProjectsByContributor = useMemo(() => {
    const rowsByContributor = new Map<string, BottleneckProjectContribution[]>();

    for (const project of scheduledProjects) {
      const progress = Math.max(0, Math.min(100, project.executionProgress || 0));
      const progressRatio = progress / 100;

      for (const load of project.contributorLoads) {
        const remainingDays = Math.max(0, load.days || 0);
        const divisor = 1 - progressRatio;
        const totalContributionDays = divisor > 0.0001
          ? remainingDays / divisor
          : remainingDays;
        const spentDays = Math.max(0, totalContributionDays - remainingDays);

        const rows = rowsByContributor.get(load.contributorId) ?? [];
        rows.push({
          projectId: project.projectId,
          projectName: project.projectName,
          plannedStart: project.plannedStart,
          plannedEnd: project.plannedEnd,
          totalContributionDays,
          spentDays,
        });
        rowsByContributor.set(load.contributorId, rows);
      }
    }

    for (const [contributorId, rows] of rowsByContributor.entries()) {
      rows.sort((a, b) =>
        a.plannedStart.localeCompare(b.plannedStart)
        || a.projectName.localeCompare(b.projectName)
        || a.projectId.localeCompare(b.projectId));
      rowsByContributor.set(contributorId, rows);
    }

    return rowsByContributor;
  }, [scheduledProjects]);

  const occupationWeekKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of response?.occupation ?? []) keys.add(entry.week);
    for (const entry of response?.teamOccupation ?? []) keys.add(entry.week);
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [response?.occupation, response?.teamOccupation]);

  const contributorOccupationGroups = useMemo(() => {
    const rowsByContributor = new Map<string, ContributorOccupationRow>();
    for (const entry of response?.occupation ?? []) {
      const existing = rowsByContributor.get(entry.contributorId) ?? {
        contributorId: entry.contributorId,
        contributorName: entry.contributorName,
        teamId: entry.teamId,
        teamName: entry.teamName || 'No team',
        weekOccupation: new Map<string, number | null>(),
      };
      existing.weekOccupation.set(
        entry.week,
        entry.occupationPct == null ? null : Math.round(entry.occupationPct),
      );
      rowsByContributor.set(entry.contributorId, existing);
    }

    const groupsByTeam = new Map<string, ContributorOccupationGroup>();
    for (const row of rowsByContributor.values()) {
      const teamKey = row.teamId || 'no-team';
      const existing = groupsByTeam.get(teamKey) ?? {
        teamId: row.teamId,
        teamName: row.teamName || 'No team',
        rows: [],
      };
      existing.rows.push(row);
      groupsByTeam.set(teamKey, existing);
    }

    const groups = Array.from(groupsByTeam.values());
    groups.sort((a, b) =>
      a.teamName.localeCompare(b.teamName)
      || (a.teamId || '').localeCompare(b.teamId || ''));
    for (const group of groups) {
      group.rows.sort((a, b) =>
        a.contributorName.localeCompare(b.contributorName)
        || a.contributorId.localeCompare(b.contributorId));
    }
    return groups;
  }, [response?.occupation]);

  const teamOccupationRows = useMemo(() => {
    const rowsByTeam = new Map<string, TeamOccupationRow>();
    for (const entry of response?.teamOccupation ?? []) {
      const teamKey = entry.teamId || 'no-team';
      const existing = rowsByTeam.get(teamKey) ?? {
        teamId: entry.teamId,
        teamName: entry.teamName || 'No team',
        weekOccupation: new Map<string, number | null>(),
      };
      existing.weekOccupation.set(
        entry.week,
        entry.occupationPct == null ? null : Math.round(entry.occupationPct),
      );
      rowsByTeam.set(teamKey, existing);
    }

    return Array.from(rowsByTeam.values())
      .sort((a, b) =>
        a.teamName.localeCompare(b.teamName)
        || (a.teamId || '').localeCompare(b.teamId || ''));
  }, [response?.teamOccupation]);

  const toggleBottleneckExpansion = (contributorId: string) => {
    setExpandedBottleneckIds((prev) => {
      const next = new Set(prev);
      if (next.has(contributorId)) next.delete(contributorId);
      else next.add(contributorId);
      return next;
    });
  };

  const runGenerate = async (
    excludedProjectIds: string[],
    options?: { resetSelectionPool?: boolean },
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setApplyError(null);
    try {
      const payload = {
        startDate,
        statuses,
        capacityMode,
        parallelizationLimit,
        optimizationMode,
        includeAlreadyScheduled,
        excludedProjectIds,
        contextSwitchPenaltyPct,
        contextSwitchGrace,
        collaborativeScheduling,
      };
      const res = await api.post('/portfolio/reports/roadmap/generate', payload);
      const nextResponse = res.data as RoadmapResponse;
      setResponse(nextResponse);

      if (options?.resetSelectionPool) {
        setScheduleSelectionPool(nextResponse.schedule);
        setSelectedProjectIds(new Set(nextResponse.schedule.map((project) => project.projectId)));
      }

      setTab('schedule');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to generate roadmap');
    } finally {
      setLoading(false);
    }
  };

  const recalculateForSelection = async (nextSelection: Set<string>) => {
    if (scheduleRows.length === 0) return;
    setSelectedProjectIds(nextSelection);
    const excludedProjectIds = scheduleRows
      .map((project) => project.projectId)
      .filter((projectId) => !nextSelection.has(projectId));
    await runGenerate(excludedProjectIds);
  };

  const toggleProjectSelection = (projectId: string) => {
    const next = new Set(selectedProjectIds);
    if (next.has(projectId)) next.delete(projectId);
    else next.add(projectId);
    void recalculateForSelection(next);
  };

  const toggleSelectAll = () => {
    const next = new Set(selectedProjectIds);
    if (allRowsSelected) {
      filteredProjectIds.forEach((projectId) => next.delete(projectId));
    } else {
      filteredProjectIds.forEach((projectId) => next.add(projectId));
    }
    void recalculateForSelection(next);
  };

  const handleGenerate = async () => {
    await runGenerate([], { resetSelectionPool: true });
  };

  const handleApply = async () => {
    if (!response) return;
    const selectedProjects = selectedVisibleScheduledProjects
      .map((project) => ({
        projectId: project.projectId,
        plannedStart: project.plannedStart,
        plannedEnd: project.plannedEnd,
      }));

    if (selectedProjects.length === 0) {
      setConfirmOpen(false);
      return;
    }

    setApplying(true);
    setApplyError(null);
    setSuccess(null);

    try {
      await api.post('/portfolio/projects/planning/roadmap/apply', {
        projects: selectedProjects,
      });
      setConfirmOpen(false);
      setSuccess(`Applied roadmap dates to ${selectedProjects.length} project(s).`);
      await queryClient.invalidateQueries({ queryKey: ['portfolio-timeline'] });
      onApplied?.();
    } catch (e: any) {
      const details = e?.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        const first = details[0];
        setApplyError(`${first?.projectId || 'Project'}: ${first?.error || 'Failed to apply roadmap dates'}`);
      } else {
        setApplyError(e?.response?.data?.message || 'Failed to apply roadmap dates');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleStatusChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const next = typeof value === 'string' ? value.split(',') : value;
    setStatuses(next);
  };

  const handleExportGanttPng = async () => {
    try {
      await exportRoadmapGanttAsPng(
        ganttExportRows,
        monthsForGantt,
        monthOffsetForGantt,
        `roadmap-gantt-${getTodayYmd()}`,
      );
    } catch (error: any) {
      setError(error?.message ? `Failed to export Gantt as PNG: ${error.message}` : 'Failed to export Gantt as PNG');
    }
  };

  const hasResponse = !!response;

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Roadmap Generator
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Statuses</InputLabel>
              <Select
                multiple
                value={statuses}
                label="Statuses"
                onChange={handleStatusChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((status) => (
                      <Chip key={status} size="small" label={STATUS_LABELS[status] || status} />
                    ))}
                  </Box>
                )}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Capacity Mode</InputLabel>
              <Select
                value={capacityMode}
                label="Capacity Mode"
                onChange={(e) => setCapacityMode(e.target.value as 'theoretical' | 'historical')}
              >
                <MenuItem value="theoretical">Theoretical</MenuItem>
                <MenuItem value="historical">Historical</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Parallel Limit</InputLabel>
              <Select
                value={String(parallelizationLimit)}
                label="Parallel Limit"
                onChange={(e) => setParallelizationLimit(Number(e.target.value))}
              >
                <MenuItem value="1">1</MenuItem>
                <MenuItem value="2">2</MenuItem>
                <MenuItem value="3">3</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <ToggleButtonGroup
              size="small"
              value={optimizationMode}
              exclusive
              onChange={(_, value) => {
                if (value) setOptimizationMode(value);
              }}
            >
              <ToggleButton value="priority_focused">Priority Focused</ToggleButton>
              <ToggleButton value="completion_focused">Completion Focused</ToggleButton>
            </ToggleButtonGroup>

            <FormControlLabel
              control={
                <Checkbox
                  checked={includeAlreadyScheduled}
                  onChange={(e) => setIncludeAlreadyScheduled(e.target.checked)}
                />
              }
              label="Recalculate already scheduled projects"
            />

            <Tooltip title="When enabled, all contributors must be available for a project to progress (synchronized). When disabled, contributors work independently and projects can start as soon as any contributor is free.">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={collaborativeScheduling}
                    onChange={(e) => setCollaborativeScheduling(e.target.checked)}
                  />
                }
                label="Collaborative scheduling"
              />
            </Tooltip>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            When enabled, projects that already have planned dates are recalculated and may move.
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Box sx={{ minWidth: 280 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Context-switch penalty: {(contextSwitchPenaltyPct * 100).toFixed(0)}%
              </Typography>
              <Slider
                min={0}
                max={0.5}
                step={0.05}
                value={contextSwitchPenaltyPct}
                onChange={(_, value) => setContextSwitchPenaltyPct(value as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              />
            </Box>

            <TextField
              label="Context-switch grace"
              type="number"
              size="small"
              value={contextSwitchGrace}
              onChange={(e) => setContextSwitchGrace(Math.max(0, Number(e.target.value || '0')))}
              inputProps={{ min: 0, max: 10 }}
              sx={{ width: 180 }}
            />

            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={loading || statuses.length === 0 || !startDate}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {applyError && <Alert severity="error">{applyError}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      {!hasResponse && !loading && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Generate a roadmap to preview proposed dates, bottlenecks, and contributor occupation.
          </Typography>
        </Paper>
      )}

      {hasResponse && response && (
        <>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
              <Chip label={`Scheduled: ${response.schedule.length}`} />
              <Chip label={`Reservations: ${response.reservations.length}`} />
              <Chip label={`External blockers: ${response.diagnostics.reservationByReason?.external_blocker ?? 0}`} />
              <Chip label={`Unschedulable: ${response.unschedulable.length}`} />
              <Chip label={`Roadmap end: ${response.roadmapEndDate || 'N/A'}`} />
              <Chip label={`Run: ${response.diagnostics.runDurationMs} ms`} />
              <Chip label={`Sensitivity reruns: ${response.diagnostics.sensitivityReruns}`} />
              {response.diagnostics.sensitivityTruncated && (
                <Chip color="warning" label="Sensitivity sampled (truncated)" />
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 0 }}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab value="schedule" label="Schedule" />
              <Tab value="bottlenecks" label="Bottlenecks" />
              <Tab value="occupation" label="Occupation" />
            </Tabs>

            <Box sx={{ p: 2 }}>
              {tab === 'schedule' && (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      onClick={toggleSelectAll}
                      disabled={filteredProjectIds.length === 0}
                    >
                      {allRowsSelected ? 'Clear Visible Selection' : 'Select Visible'}
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {selectedSchedulableCount} selected in Gantt preview
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Unchecked projects are excluded from the scenario and do not consume capacity.
                  </Typography>

                  <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" />
                          <TableCell>Project</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Start</TableCell>
                          <TableCell>End</TableCell>
                          <TableCell>Weeks</TableCell>
                          <TableCell align="right">Priority</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {scheduleRows.map((project) => {
                          const scenarioProject = scheduleRowsById.get(project.projectId);
                          const isExcluded = !selectedProjectIds.has(project.projectId);
                          const status = scenarioProject?.status || project.status;
                          const priority = scenarioProject?.priorityScore ?? project.priorityScore;
                          return (
                            <TableRow key={project.projectId} hover sx={isExcluded ? { opacity: 0.55 } : undefined}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedProjectIds.has(project.projectId)}
                                  onChange={() => toggleProjectSelection(project.projectId)}
                                />
                              </TableCell>
                              <TableCell>
                                <Link
                                  component={RouterLink}
                                  to={`/portfolio/projects/${project.projectId}/effort`}
                                  underline="hover"
                                  color="primary"
                                >
                                  {scenarioProject?.projectName || project.projectName}
                                </Link>
                              </TableCell>
                              <TableCell>{STATUS_LABELS[status] || status}</TableCell>
                              <TableCell>{scenarioProject?.plannedStart || 'Excluded'}</TableCell>
                              <TableCell>{scenarioProject?.plannedEnd || 'Excluded'}</TableCell>
                              <TableCell>{scenarioProject?.durationWeeks ?? 'Excluded'}</TableCell>
                              <TableCell align="right">
                                {priority != null ? priority.toFixed(1) : 'N/A'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Paper>

                  {response.unschedulable.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Unschedulable Projects
                      </Typography>
                      <Stack spacing={0.75}>
                        {response.unschedulable.map((item) => (
                          <Tooltip key={item.projectId} title={item.details || ''} placement="top-start">
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {item.projectName}: {REASON_LABELS[item.reason] || item.reason}
                            </Typography>
                          </Tooltip>
                        ))}
                      </Stack>
                    </Paper>
                  )}

                  {filteredReservationProjects.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Capacity Reservations
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        These projects are not recalculated but still reserve contributor capacity.
                      </Typography>
                      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Project</TableCell>
                              <TableCell>Reason</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Start</TableCell>
                              <TableCell>End</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredReservationProjects.map((project) => (
                              <TableRow key={`reservation:${project.projectId}`} hover>
                                <TableCell>
                                  <Link
                                    component={RouterLink}
                                    to={`/portfolio/projects/${project.projectId}/effort`}
                                    underline="hover"
                                    color="primary"
                                  >
                                    {project.projectName}
                                  </Link>
                                </TableCell>
                                <TableCell>{RESERVATION_REASON_LABELS[project.reason]}</TableCell>
                                <TableCell>{STATUS_LABELS[project.status] || project.status}</TableCell>
                                <TableCell>{project.plannedStart}</TableCell>
                                <TableCell>{project.plannedEnd}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Paper>
                    </Paper>
                  )}

                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      sx={{ px: 1, py: 0.5 }}
                    >
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        Read-only Gantt
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 260 } }}>
                          <InputLabel>Category</InputLabel>
                          <Select
                            value={ganttCategoryId}
                            label="Category"
                            onChange={(event) => setGanttCategoryId(event.target.value)}
                          >
                            <MenuItem value="">All Categories</MenuItem>
                            {ganttCategoryOptions.map((category) => (
                              <MenuItem key={category.id} value={category.id}>
                                {category.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={showReservations}
                              onChange={(event) => setShowReservations(event.target.checked)}
                            />
                          }
                          label="Show reservations"
                        />
                        <Tooltip title="Export Gantt as PNG">
                          <span>
                            <IconButton
                              size="small"
                              onClick={handleExportGanttPng}
                              disabled={ganttProjects.length === 0}
                              aria-label="Export Gantt as PNG"
                            >
                              <ImageIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1, pb: 0.5, display: 'block' }}>
                      Solid bar shows active scheduled work. Dashed lead-in marks earlier historical start with pause before resumed work. Hatched bars are capacity reservations.
                    </Typography>
                    <Box sx={{ height: `${ganttHeight}px` }}>
                      <PortfolioGantt
                        projects={ganttProjects}
                        dependencies={ganttDependencies}
                        milestones={[]}
                        readOnly
                        months={monthsForGantt}
                        monthOffset={monthOffsetForGantt}
                      />
                    </Box>
                  </Paper>
                </Stack>
              )}

              {tab === 'bottlenecks' && (
                <Stack spacing={1.5}>
                  {response.bottlenecks.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No bottleneck data available.
                    </Typography>
                  )}
                  {response.bottlenecks.map((item) => {
                    const widthPct = bottleneckMaxImpact > 0 ? (item.impactDays / bottleneckMaxImpact) * 100 : 0;
                    const isExpanded = expandedBottleneckIds.has(item.contributorId);
                    const contributorRows = bottleneckProjectsByContributor.get(item.contributorId) ?? [];
                    return (
                      <Paper key={item.contributorId} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton
                              size="small"
                              onClick={() => toggleBottleneckExpansion(item.contributorId)}
                              aria-label={isExpanded ? 'Collapse contributor projects' : 'Expand contributor projects'}
                            >
                              {isExpanded ? (
                                <KeyboardArrowUpIcon fontSize="small" />
                              ) : (
                                <KeyboardArrowDownIcon fontSize="small" />
                              )}
                            </IconButton>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.contributorName}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {item.impactDays} day(s)
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={widthPct}
                          sx={{ height: 8, borderRadius: 5 }}
                        />
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Paper variant="outlined" sx={{ mt: 1.5, overflowX: 'auto' }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Project name</TableCell>
                                  <TableCell>Project start date</TableCell>
                                  <TableCell>Project end date</TableCell>
                                  <TableCell align="right">Total Contribution (days)</TableCell>
                                  <TableCell align="right">Time already spent (days)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {contributorRows.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={5}>
                                      <Typography variant="body2" color="text.secondary">
                                        No scheduled projects for this contributor in the current scenario.
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {contributorRows.map((row) => (
                                  <TableRow key={`${item.contributorId}:${row.projectId}`} hover>
                                    <TableCell>
                                      <Link
                                        component={RouterLink}
                                        to={`/portfolio/projects/${row.projectId}/effort`}
                                        underline="hover"
                                        color="primary"
                                      >
                                        {row.projectName}
                                      </Link>
                                    </TableCell>
                                    <TableCell>{row.plannedStart}</TableCell>
                                    <TableCell>{row.plannedEnd}</TableCell>
                                    <TableCell align="right">{row.totalContributionDays.toFixed(1)}</TableCell>
                                    <TableCell align="right">{row.spentDays.toFixed(1)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Paper>
                        </Collapse>
                      </Paper>
                    );
                  })}
                </Stack>
              )}

              {tab === 'occupation' && (
                <Stack spacing={2}>
                  <ToggleButtonGroup
                    size="small"
                    value={occupationView}
                    exclusive
                    onChange={(_, value) => {
                      if (value) setOccupationView(value);
                    }}
                  >
                    <ToggleButton value="contributor">Contributors</ToggleButton>
                    <ToggleButton value="team">Teams</ToggleButton>
                  </ToggleButtonGroup>

                  {occupationView === 'contributor' && (
                    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                      {contributorOccupationGroups.length === 0 || occupationWeekKeys.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                          No contributor occupation data available.
                        </Typography>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ minWidth: 160 }}>Team</TableCell>
                              <TableCell sx={{ minWidth: 220 }}>Contributor</TableCell>
                              {occupationWeekKeys.map((weekKey) => {
                                const isoWeek = getIsoWeekParts(weekKey);
                                return (
                                  <TableCell key={`contributor-week:${weekKey}`} align="center" sx={{ minWidth: 74 }}>
                                    <Stack spacing={0} alignItems="center">
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        W{String(isoWeek.week).padStart(2, '0')}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {isoWeek.year}
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {contributorOccupationGroups.map((group) => (
                              group.rows.map((row, rowIndex) => (
                                <TableRow key={`${group.teamId || 'no-team'}:${row.contributorId}`} hover>
                                  {rowIndex === 0 && (
                                    <TableCell
                                      rowSpan={group.rows.length}
                                      sx={{ fontWeight: 600, verticalAlign: 'top', backgroundColor: 'action.hover' }}
                                    >
                                      {group.teamName}
                                    </TableCell>
                                  )}
                                  <TableCell>{row.contributorName}</TableCell>
                                  {occupationWeekKeys.map((weekKey) => {
                                    const occupationPct = row.weekOccupation.get(weekKey) ?? null;
                                    return (
                                      <TableCell
                                        key={`${row.contributorId}:${weekKey}`}
                                        align="center"
                                        sx={{ backgroundColor: getOccupationCellBackground(occupationPct, 'contributor') }}
                                      >
                                        {occupationPct != null ? `${occupationPct}%` : '-'}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Paper>
                  )}

                  {occupationView === 'team' && (
                    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                      {teamOccupationRows.length === 0 || occupationWeekKeys.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                          No team occupation data available.
                        </Typography>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ minWidth: 220 }}>Team</TableCell>
                              {occupationWeekKeys.map((weekKey) => {
                                const isoWeek = getIsoWeekParts(weekKey);
                                return (
                                  <TableCell key={`team-week:${weekKey}`} align="center" sx={{ minWidth: 74 }}>
                                    <Stack spacing={0} alignItems="center">
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        W{String(isoWeek.week).padStart(2, '0')}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {isoWeek.year}
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {teamOccupationRows.map((row) => (
                              <TableRow key={row.teamId || 'no-team'} hover>
                                <TableCell sx={{ fontWeight: 600 }}>{row.teamName}</TableCell>
                                {occupationWeekKeys.map((weekKey) => {
                                  const occupationPct = row.weekOccupation.get(weekKey) ?? null;
                                  return (
                                    <TableCell
                                      key={`${row.teamId || 'no-team'}:${weekKey}`}
                                      align="center"
                                      sx={{ backgroundColor: getOccupationCellBackground(occupationPct, 'team') }}
                                    >
                                      {occupationPct != null ? `${occupationPct}%` : '-'}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Paper>
                  )}
                </Stack>
              )}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Apply dates to {selectedSchedulableCount} selected visible project(s)
              </Typography>
              <Button
                variant="contained"
                color="primary"
                disabled={selectedSchedulableCount === 0 || applying}
                onClick={() => setConfirmOpen(true)}
                startIcon={applying ? <CircularProgress size={16} /> : undefined}
              >
                {applying ? 'Applying...' : 'Apply Dates'}
              </Button>
            </Stack>
          </Paper>
        </>
      )}

      <Dialog open={confirmOpen} onClose={() => !applying && setConfirmOpen(false)}>
        <DialogTitle>Apply Roadmap Dates</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will update planned start/end dates for {selectedSchedulableCount} selected visible project(s). The change is transactional:
            if one project fails validation, no dates will be applied.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} variant="contained" disabled={applying || selectedSchedulableCount === 0}>
            {applying ? 'Applying...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
