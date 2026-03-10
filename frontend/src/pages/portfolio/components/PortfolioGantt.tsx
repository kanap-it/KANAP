import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gantt } from '@svar-ui/react-gantt';
import type { ITask, IApi } from '@svar-ui/react-gantt';
import { Box, Typography } from '@mui/material';
import '@svar-ui/react-gantt/style.css';
import api from '../../../api';
import { computeInactiveSegments, formatInactiveTooltip } from './roadmap-inactive-segments';
import type { InactiveSegment } from './roadmap-inactive-segments';

interface GanttProject {
  id: string;
  name: string;
  status: string;
  category_id: string | null;
  historical_start?: string | null;
  is_reservation?: boolean;
  reservation_reason?: 'not_recalculated' | 'external_blocker';
  planned_start: string | null;
  planned_end: string | null;
  execution_progress: number;
  active_week_starts?: string[];
  on_hold_ranges?: Array<{ from: string; to: string }>;
}

interface ProjectDependency {
  id: string;
  project_id: string;
  depends_on_project_id: string;
  dependency_type: string;
}

interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  target_date: string;
  status: string;
  project_name: string;
}

interface Props {
  projects: GanttProject[];
  dependencies: ProjectDependency[];
  milestones?: ProjectMilestone[];
  onUpdate?: () => void;
  onProjectClick?: (projectId: string) => void;
  months?: number;
  monthOffset?: number; // How many months to offset from current month (negative = past, positive = future)
  readOnly?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  waiting_list: '#ffa726',
  planned: '#66bb6a',
  in_progress: '#42a5f5',
  in_testing: '#29b6f6',
  on_hold: '#ef5350',
  done: '#9e9e9e',
};

const STATUS_LABELS: Record<string, string> = {
  waiting_list: 'Waiting List',
  planned: 'Planned',
  in_progress: 'In Progress',
  in_testing: 'In Testing',
  on_hold: 'On Hold',
  done: 'Done',
};

const RESERVATION_REASON_LABELS: Record<'not_recalculated' | 'external_blocker', string> = {
  not_recalculated: 'Not Recalculated',
  external_blocker: 'External Blocker',
};

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: '#ffa726',
  achieved: '#66bb6a',
  missed: '#ef5350',
};

// SVAR link types: e2s = end-to-start (finish-to-start)
const DEPENDENCY_TYPE_MAP: Record<string, 'e2s' | 's2s' | 'e2e' | 's2e'> = {
  blocks: 'e2s',
};

// Date formatting helpers
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMonthYear = (date: Date): string => {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

const formatMonthShort = (date: Date): string => {
  return MONTH_NAMES[date.getMonth()];
};

const formatQuarterYear = (date: Date): string => {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
};

const formatYearOnly = (date: Date): string => {
  return String(date.getFullYear());
};

const formatWeekNumber = (date: Date): string => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNum = Math.ceil((diff / oneWeek) + 1);
  return `W${weekNum}`;
};

const formatDayNumber = (date: Date): string => {
  return String(date.getDate());
};

const formatDateShort = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

// CSS class for weekends and today
const dayStyle = (date: Date): string => {
  const today = new Date();
  const isToday = date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) return 'today-cell';

  const day = date.getDay();
  return day === 0 || day === 6 ? 'weekend-day' : '';
};

// Timezone-safe date formatting
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function PortfolioGantt({
  projects,
  dependencies,
  milestones = [],
  onUpdate,
  onProjectClick,
  months = 3,
  monthOffset = 0,
  readOnly = false,
}: Props) {
  const navigate = useNavigate();
  const apiRef = useRef<IApi | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate date range based on months and offset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const pastMonths = Math.max(0, Math.round(months * 0.25));
    const start = new Date(now);
    // Keep roughly 25% of the range in the past around "today" when offset is 0.
    start.setMonth(start.getMonth() + monthOffset - pastMonths);
    start.setDate(1); // Start of month

    const end = new Date(start);
    // Exact window length: selected number of months
    end.setMonth(end.getMonth() + months);
    end.setDate(0); // End of previous month = last day of target month

    return { startDate: start, endDate: end };
  }, [months, monthOffset]);

  // Transform projects to SVAR Gantt format
  const tasks = useMemo(() => {
    const projectIds = new Set(projects.filter((p) => p.planned_start && p.planned_end).map(p => p.id));

    // Build set of project IDs that actually have milestones
    const projectsWithMilestones = new Set(
      milestones
        .filter((m) => projectIds.has(m.project_id))
        .map((m) => m.project_id)
    );

    const projectTasks = projects
      .filter((p) => p.planned_start && p.planned_end)
      .map((p) => {
        const start = new Date(p.planned_start!);
        const end = new Date(p.planned_end!);
        const isReservation = !!p.is_reservation;
        const historicalStart = p.historical_start ? new Date(p.historical_start) : null;
        const hasSleepLead = !isReservation && !!historicalStart && historicalStart.getTime() < start.getTime();
        const sleepLeadDays = hasSleepLead
          ? Math.max(0, Math.round((start.getTime() - historicalStart!.getTime()) / MS_PER_DAY))
          : 0;
        const activeSpanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);

        const inactiveSegments = !isReservation && p.active_week_starts?.length
          ? computeInactiveSegments(
            p.planned_start!,
            p.planned_end!,
            p.active_week_starts,
            p.on_hold_ranges,
            p.historical_start,
          )
          : [];

        return {
          id: p.id,
          text: p.name,
          start,
          end,
          progress: (p.execution_progress || 0) / 100,
          type: 'task' as const,
          // Only expand projects that actually have milestones as children
          open: projectsWithMilestones.has(p.id),
          _status: p.status,
          _statusLabel: STATUS_LABELS[p.status] || p.status,
          _progress: p.execution_progress || 0,
          _isProject: true,
          _isReservation: isReservation,
          _reservationReason: p.reservation_reason || null,
          _historicalStart: p.historical_start,
          _sleepLeadDays: sleepLeadDays,
          _activeSpanDays: activeSpanDays,
          _inactiveSegments: inactiveSegments,
        };
      });

    // Only add milestones if there are any (to avoid SVAR tree parsing issues)
    if (milestones.length === 0) {
      return projectTasks;
    }

    // Add milestones as milestone-type tasks, grouped under their parent projects
    const milestoneTasks = milestones
      .filter((m) => projectIds.has(m.project_id)) // Only include milestones for visible projects
      .map((m) => ({
        id: `milestone-${m.id}`,
        text: m.name,
        start: new Date(m.target_date),
        end: new Date(m.target_date),
        progress: m.status === 'achieved' ? 1 : 0,
        type: 'milestone' as const,
        parent: m.project_id, // Group under parent project
        _status: m.status,
        _statusLabel: m.status.charAt(0).toUpperCase() + m.status.slice(1),
        _progress: m.status === 'achieved' ? 100 : 0,
        _isProject: false,
        _projectId: m.project_id,
        _projectName: m.project_name,
      }));

    return [...projectTasks, ...milestoneTasks];
  }, [projects, milestones]);

  // Transform dependencies to SVAR Gantt links format
  const links = useMemo(() => {
    const taskIds = new Set(tasks.filter(t => t._isProject).map(t => t.id));
    return dependencies
      .filter(d => taskIds.has(d.project_id) && taskIds.has(d.depends_on_project_id))
      .map((d) => ({
        id: d.id,
        source: d.depends_on_project_id,
        target: d.project_id,
        type: DEPENDENCY_TYPE_MAP[d.dependency_type] ?? 'e2s',
      }));
  }, [dependencies, tasks]);

  // Dynamic scales based on time range
  const scales = useMemo(() => {
    if (months <= 1) {
      return [
        { unit: 'week', step: 1, format: formatWeekNumber },
        { unit: 'day', step: 1, format: formatDayNumber, css: dayStyle },
      ];
    }

    if (months <= 3) {
      return [
        { unit: 'month', step: 1, format: formatMonthYear },
        { unit: 'week', step: 1, format: formatWeekNumber },
      ];
    }

    if (months <= 6) {
      return [
        { unit: 'quarter', step: 1, format: formatQuarterYear },
        { unit: 'month', step: 1, format: formatMonthShort },
      ];
    }

    return [
      { unit: 'year', step: 1, format: formatYearOnly },
      { unit: 'month', step: 1, format: formatMonthShort },
    ];
  }, [months]);

  // Use wider month cells at 6 months and denser month cells at 12 months.
  const cellWidth = useMemo(() => {
    if (months <= 1) return 30;
    if (months <= 3) return 40;
    if (months <= 6) return 84;
    return 56;
  }, [months]);

  // Columns configuration
  const columns = useMemo(() => [
    { id: 'text', header: 'Project', width: 320, resize: true, sort: true },
  ], []);

  // Compute today's pixel position on the chart timeline.
  // This is independent from SVAR markers so it works in week-scale mode too.
  const getTodayChartPosition = useCallback(() => {
    const root = containerRef.current;
    const chart = root?.querySelector('.wx-chart') as HTMLDivElement | null;
    const area = root?.querySelector('.wx-area') as HTMLDivElement | null;
    if (!chart || !area) return null;

    // Use selected range props as source of truth for ratio when time range changes.
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const totalMs = endMs - startMs;
    if (!Number.isFinite(totalMs) || totalMs <= 0) return null;

    const state = apiRef.current?.getState();
    const totalWidth = area.scrollWidth || chart.scrollWidth || state?._scales?.width || 0;
    if (!Number.isFinite(totalWidth) || totalWidth <= 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rawRatio = (today.getTime() - startMs) / totalMs;
    const ratio = Math.min(1, Math.max(0, rawRatio));

    return {
      chart,
      area,
      x: ratio * totalWidth,
      totalWidth,
      inRange: rawRatio >= 0 && rawRatio <= 1,
    };
  }, [startDate, endDate]);

  // Render/update a custom "today" line overlay in the chart DOM.
  const syncTodayLine = useCallback(() => {
    const root = containerRef.current;
    const chart = root?.querySelector('.wx-chart') as HTMLDivElement | null;
    const area = root?.querySelector('.wx-area') as HTMLDivElement | null;
    if (!chart || !area) return;

    // Cleanup stale line that may have been attached to the chart in older renders.
    const staleLine = chart.querySelector('.portfolio-today-line');
    if (staleLine) staleLine.remove();

    let line = area.querySelector('.portfolio-today-line') as HTMLDivElement | null;
    if (!line) {
      line = document.createElement('div');
      line.className = 'portfolio-today-line';
      area.appendChild(line);
    }

    // Remove legacy label if present to avoid overlapping scale headers.
    const label = chart.querySelector('.portfolio-today-label') as HTMLDivElement | null;
    if (label) label.remove();

    const position = getTodayChartPosition();
    if (!position || !position.inRange) {
      line.style.display = 'none';
      return;
    }

    const x = Math.round(position.x);
    line.style.display = 'block';
    line.style.left = `${x}px`;
  }, [getTodayChartPosition]);

  // Place today marker around 25% from the left side of the visible chart area
  const scrollTodayIntoView = useCallback(() => {
    const ganttApi = apiRef.current;
    if (!ganttApi) return;

    const position = getTodayChartPosition();
    if (!position) return;

    const { chart, x, totalWidth } = position;
    const viewportWidth = chart.clientWidth || 0;
    if (totalWidth <= 0 || viewportWidth <= 0) return;

    const targetLeft = Math.min(
      Math.max(0, x - viewportWidth * 0.25),
      Math.max(0, totalWidth - viewportWidth)
    );

    chart.scrollLeft = targetLeft;
    void ganttApi.exec('scroll-chart', { left: targetLeft });
    syncTodayLine();
  }, [getTodayChartPosition, syncTodayLine]);

  // Highlight today in scale cells
  const highlightTime = useCallback((date: Date, unit: 'day' | 'hour') => {
    if (unit !== 'day') return '';
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    return isToday ? 'today-highlight' : '';
  }, []);

  // Ref for storing onUpdate callback (to avoid stale closure in init)
  const onUpdateRef = useRef(onUpdate || (() => {}));
  onUpdateRef.current = onUpdate || (() => {});

  // Init callback to set up all event handlers
  const handleInit = useCallback((ganttApi: IApi) => {
    apiRef.current = ganttApi;

    // Intercept show-editor (double-click). In read-only mode this is disabled.
    ganttApi.intercept('show-editor', (ev: { id: string | number }) => {
      if (readOnly) return false;
      if (ev?.id) {
        const taskId = String(ev.id);
        // Check if it's a milestone or project
        if (taskId.startsWith('milestone-')) {
          const task = tasks.find(t => t.id === taskId) as any;
          if (task && task._projectId) {
            navigate(`/portfolio/projects/${task._projectId}/timeline`);
          }
        } else {
          navigate(`/portfolio/projects/${taskId}/summary`);
        }
      }
      return false; // Prevent default editor
    });

    if (!readOnly) {
      // Handle task update (after drag) - use api.on for reliable event handling
      ganttApi.on('update-task', async (ev: { id: string | number; task: Partial<ITask>; inProgress?: boolean }) => {
        // Only process when drag is complete
        if (ev.inProgress) return;

        const taskId = String(ev.id);
        // Don't allow milestone editing
        if (taskId.startsWith('milestone-')) return;

        const { task } = ev;
        if (!task.start || !task.end) return;

        // Validate end >= start
        if (new Date(task.end) < new Date(task.start)) {
          alert('End date cannot be before start date');
          onUpdateRef.current?.();
          return;
        }

        try {
          await api.patch(`/portfolio/projects/${taskId}`, {
            planned_start: formatLocalDate(new Date(task.start)),
            planned_end: formatLocalDate(new Date(task.end)),
          });
          onUpdateRef.current?.();
        } catch (e: any) {
          alert(e?.response?.data?.message || 'Failed to update dates');
          onUpdateRef.current?.();
        }
      });
    }
    // Ensure line is drawn after chart mounts.
    window.setTimeout(syncTodayLine, 0);
    window.setTimeout(syncTodayLine, 140);

    // Initial positioning: keep today visible by default when monthOffset points to current period
    if (monthOffset === 0) {
      window.setTimeout(scrollTodayIntoView, 0);
      window.setTimeout(scrollTodayIntoView, 140);
    }
  }, [navigate, tasks, monthOffset, readOnly, scrollTodayIntoView, syncTodayLine]);

  // Keep line synchronized when the chart reflows (resize / range changes / data changes).
  useEffect(() => {
    const timers: number[] = [];
    const passes = [80, 220, 420];
    passes.forEach((delay) => {
      timers.push(window.setTimeout(syncTodayLine, delay));
      if (monthOffset === 0 && apiRef.current) {
        timers.push(window.setTimeout(scrollTodayIntoView, delay + 30));
      }
    });

    const root = containerRef.current;
    const chart = root?.querySelector('.wx-chart') as HTMLDivElement | null;
    const area = root?.querySelector('.wx-area') as HTMLDivElement | null;
    const observer = typeof ResizeObserver !== 'undefined' && chart && area
      ? new ResizeObserver(() => syncTodayLine())
      : null;

    if (observer && chart && area) {
      observer.observe(chart);
      observer.observe(area);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      observer?.disconnect();
    };
  }, [monthOffset, months, tasks.length, scrollTodayIntoView, syncTodayLine]);

  // Custom task template with progress bar and status colors
  const taskTemplate = useCallback(({ data }: { data: any }) => {
    if (!data) return null;

    const status = data._status || 'planned';
    const isReservationTask = !!data._isReservation;
    const color = data.type === 'milestone'
      ? MILESTONE_STATUS_COLORS[status] || MILESTONE_STATUS_COLORS.pending
      : (isReservationTask ? '#607d8b' : (STATUS_COLORS[status] || STATUS_COLORS.planned));
    const progress = Math.round((data.progress || 0) * 100);

    if (data.type === 'milestone') {
      const tooltip = `${data.text}\nProject: ${data._projectName || 'N/A'}\nStatus: ${data._statusLabel || data._status}\nDate: ${data.start ? formatDateShort(new Date(data.start)) : 'N/A'}`;
      return (
        <div
          title={tooltip}
          style={{
            width: '16px',
            height: '16px',
            backgroundColor: color,
            transform: 'rotate(45deg)',
            margin: '0 auto',
          }}
        />
      );
    }

    const startStr = data.start ? formatDateShort(new Date(data.start)) : 'N/A';
    const endStr = data.end ? formatDateShort(new Date(data.end)) : 'N/A';
    const isReservation = !!data._isReservation;
    const sleepLeadDays = Number(data._sleepLeadDays || 0);
    const activeSpanDays = Math.max(1, Number(data._activeSpanDays || 1));
    const hasSleepLead = !isReservation && sleepLeadDays > 0;
    const leadRatio = hasSleepLead ? Math.min(3, sleepLeadDays / activeSpanDays) : 0;
    const leadPct = hasSleepLead ? Math.max(8, leadRatio * 100) : 0;
    const historicalStartStr = data._historicalStart
      ? formatDateShort(new Date(data._historicalStart))
      : null;
    const reservationReason = data._reservationReason
      ? RESERVATION_REASON_LABELS[data._reservationReason as 'not_recalculated' | 'external_blocker']
      : null;
    const sleepWeeks = hasSleepLead ? Math.max(1, Math.round(sleepLeadDays / 7)) : 0;
    const inactiveSegments: InactiveSegment[] = data._inactiveSegments || [];
    const inactiveTooltipPart = inactiveSegments.length > 0 ? `\n${formatInactiveTooltip(inactiveSegments)}` : '';
    const tooltip = `${data.text}\nStatus: ${data._statusLabel || data._status}\nProgress: ${progress}%\nStart: ${startStr}\nEnd: ${endStr}${isReservation ? `\nType: Capacity Reservation${reservationReason ? `\nReason: ${reservationReason}` : ''}` : ''}${hasSleepLead && historicalStartStr ? `\nHistorical Start: ${historicalStartStr}\nPaused: ~${sleepWeeks} week(s)` : ''}${inactiveTooltipPart}`;

    // Compute overlay positions for inactive segments as percentages of the bar
    const barStartMs = data.start ? new Date(data.start).getTime() : 0;
    const barEndMs = data.end ? new Date(data.end).getTime() : 0;
    const barSpanMs = barEndMs - barStartMs;
    const segmentOverlays = !isReservation && barSpanMs > 0 ? inactiveSegments.map((seg, idx) => {
      const segStart = new Date(`${seg.from}T00:00:00Z`).getTime();
      const segEnd = new Date(`${seg.to}T00:00:00Z`).getTime();
      const clippedStart = Math.max(segStart, barStartMs);
      const clippedEnd = Math.min(segEnd, barEndMs);
      if (clippedEnd < clippedStart) return null;
      const leftPct = ((clippedStart - barStartMs) / barSpanMs) * 100;
      const widthPct = ((clippedEnd - clippedStart) / barSpanMs) * 100;
      return { type: seg.type, leftPct, widthPct, key: idx };
    }).filter(Boolean) as Array<{ type: 'gap' | 'on_hold'; leftPct: number; widthPct: number; key: number }> : [];

    return (
      <div
        title={tooltip}
        onClick={(event) => {
          if (!data._isProject || isReservation || !onProjectClick) return;
          event.stopPropagation();
          onProjectClick(String(data.id));
        }}
        style={{
          position: 'relative',
          height: '100%',
          overflow: 'visible',
          cursor: data._isProject && onProjectClick ? 'pointer' : 'default',
        }}
      >
        {hasSleepLead && (
          <>
            <div
              style={{
                position: 'absolute',
                left: `-${leadPct}%`,
                top: '50%',
                width: `${leadPct}%`,
                borderTop: `1px dashed ${color}`,
                opacity: 0.45,
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `-${leadPct}%`,
                top: '50%',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: color,
                opacity: 0.55,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
          </>
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '4px',
            background: isReservation
              ? 'repeating-linear-gradient(135deg, rgba(96, 125, 139, 0.18) 0, rgba(96, 125, 139, 0.18) 6px, rgba(96, 125, 139, 0.08) 6px, rgba(96, 125, 139, 0.08) 12px)'
              : `${color}40`,
            overflow: 'hidden',
            border: isReservation ? '1px dashed #78909c' : `1px solid ${color}`,
          }}
        >
          {!isReservation && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress}%`,
                backgroundColor: color,
              }}
            />
          )}
          {/* Inactive segment overlays */}
          {segmentOverlays.map((overlay) => (
            <div
              key={overlay.key}
              style={{
                position: 'absolute',
                left: `${overlay.leftPct}%`,
                top: 0,
                bottom: 0,
                width: `${overlay.widthPct}%`,
                background: overlay.type === 'gap'
                  ? `repeating-linear-gradient(90deg, rgba(200,200,200,0.35) 0, rgba(200,200,200,0.35) 3px, transparent 3px, transparent 6px)`
                  : `repeating-linear-gradient(135deg, rgba(158,158,158,0.4) 0, rgba(158,158,158,0.4) 4px, rgba(158,158,158,0.15) 4px, rgba(158,158,158,0.15) 8px)`,
                pointerEvents: 'none',
              }}
            />
          ))}
          {/* Text overlay */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              paddingLeft: '8px',
              color: '#333',
              fontSize: '11px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 0 3px #fff, 0 0 3px #fff',
            }}
          >
            {data.text}
          </div>
        </div>
      </div>
    );
  }, [onProjectClick]);

  // Empty state
  if (tasks.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="h6">No projects with planned dates</Typography>
        <Typography variant="body2">
          Set planned start and end dates on projects to see them on the timeline.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        '& .wx-gantt, & [class*="gantt"]': { height: '100%' },
        '& .wx-table .wx-grid .wx-body .wx-cell': {
          fontSize: '12px',
        },
        '& .wx-table .wx-grid .wx-header .wx-cell': {
          fontSize: '11px',
        },
        '& .wx-table .wx-grid .wx-header .wx-cell:first-child': {
          fontSize: '12px',
          fontWeight: 700,
        },
        '& .wx-scale .wx-cell': {
          fontSize: '12px',
        },
        // Weekend day styling
        '& .weekend-day': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
        // Today cell styling (for day view)
        '& .today-cell': {
          backgroundColor: 'rgba(66, 165, 245, 0.15)',
          borderLeft: '2px solid #42a5f5',
        },
        // Today highlight styling (from highlightTime)
        '& .today-highlight': {
          backgroundColor: 'rgba(66, 165, 245, 0.15)',
        },
        '& .portfolio-today-line': {
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: '#1976d2',
          zIndex: 8,
          pointerEvents: 'none',
        },
        // Hide SVAR's default progress tooltip (shows "0", "0.5", etc.)
        '& .wx-gantt-tooltip': {
          display: 'none !important',
        },
      }}
    >
      <Gantt
        tasks={tasks}
        links={links}
        readonly={readOnly}
        scales={scales}
        start={startDate}
        end={endDate}
        cellWidth={cellWidth}
        cellHeight={38}
        columns={columns}
        autoScale={false}
        highlightTime={highlightTime}
        taskTemplate={taskTemplate}
        init={handleInit}
      />
    </Box>
  );
}
