import { useState } from 'react';
import { Box, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../../api';
import KanapDialog from '../../../components/design/KanapDialog';
import { formatShortDate } from '../../../lib/dateFormat';
import { getProjectStatusLabel } from '../../../utils/portfolioI18n';
import { getDotColor, PROJECT_STATUS_COLORS } from '../../../utils/statusColors';
import { textTabSx, textTabsSx } from '../../../theme/formSx';
import { projectsPath, requestsPath, tasksPath } from './portfolioListLinks';

export type SteeringFlow = {
  created: number;
  closed: number;
  reopened: number;
  openNow: number;
  netChange: number;
};

export type SteeringStaleProject = {
  id: string;
  ref: string;
  name: string;
  status: string;
  lastActivityAt: string | null;
};

export type SteeringSummary = {
  days: number;
  startDate: string;
  endDate: string;
  tasks: SteeringFlow;
  requests: SteeringFlow;
  projects: SteeringFlow;
  attention: {
    overdueTasks: number;
    unassignedTasks: number;
    staleProjects: SteeringStaleProject[];
  };
};

export const STEERING_PERIODS = [7, 30, 90];
export const STEERING_DAYS_STORAGE_KEY = 'kanap.portfolioReports.steeringDays';

/** The window after which a running project is reported as forgotten. Mirrors the backend. */
const STALE_DAYS = 30;

const readStoredDays = (): number => {
  try {
    const stored = Number(window.localStorage.getItem(STEERING_DAYS_STORAGE_KEY));
    if (STEERING_PERIODS.includes(stored)) return stored;
  } catch {
    // A browser that refuses storage still gets the default period.
  }
  return 30;
};

const storeDays = (days: number) => {
  try {
    window.localStorage.setItem(STEERING_DAYS_STORAGE_KEY, String(days));
  } catch {
    // Remembering the period is a convenience, never a requirement.
  }
};

const viewerTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const figureSx = { fontSize: 13, fontWeight: 400 } as const;
const linkSx = { ...figureSx, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } } as const;

/**
 * `neutral` for the flow figures, `attention` (orange) for what needs a decision, `muted` for
 * an attention figure that sits at zero: it stays for context but has nothing to say.
 */
type Tone = 'neutral' | 'attention' | 'muted';

type Figure = { key: string; label: string; to: string | null; tone?: Tone };

const TONE_COLOR: Record<Tone, string> = {
  neutral: 'kanap.text.primary',
  attention: 'warning.main',
  muted: 'kanap.text.tertiary',
};

/** A figure opens a list only when that list can show exactly the population it counts. */
function FigureText({ figure }: { figure: Figure }) {
  const color = TONE_COLOR[figure.tone ?? 'neutral'];
  if (!figure.to) {
    return <Typography sx={{ ...figureSx, color }}>{figure.label}</Typography>;
  }
  return (
    <Typography component={RouterLink} to={figure.to} sx={{ ...linkSx, color }}>
      {figure.label}
    </Typography>
  );
}

function FigureRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="baseline" flexWrap="wrap">
      <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary', minWidth: 96 }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1, rowGap: 0.25 }}>{children}</Box>
    </Stack>
  );
}

function Separator() {
  return (
    <Typography aria-hidden sx={{ fontSize: 13, color: 'kanap.text.tertiary' }}>
      ·
    </Typography>
  );
}

/** Interleaves the figures with the middle dot that separates them. */
function Figures({ figures }: { figures: Figure[] }) {
  return (
    <>
      {figures.map((figure, index) => (
        <Box key={figure.key} sx={{ display: 'contents' }}>
          {index > 0 ? <Separator /> : null}
          <FigureText figure={figure} />
        </Box>
      ))}
    </>
  );
}

function StaleProjectsDialog({
  open,
  projects,
  onClose,
}: {
  open: boolean;
  projects: SteeringStaleProject[];
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('portfolio');
  return (
    <KanapDialog
      open={open}
      title={t('reports.steering.stale.dialogTitle')}
      onClose={onClose}
      onSave={onClose}
      showCancel={false}
      saveVariant="action"
      saveLabel={t('reports.steering.stale.close')}
    >
      <Stack spacing={1.25}>
        {projects.map((project) => (
          <Stack key={project.id} direction="row" spacing={1.25} alignItems="baseline">
            <Typography
              sx={{
                fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
                fontSize: 12,
                fontWeight: 400,
                color: 'kanap.text.secondary',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 56,
              }}
            >
              {project.ref}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component={RouterLink}
                to={`/portfolio/projects/${project.ref}/summary`}
                onClick={onClose}
                sx={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'kanap.text.primary',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {project.name}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 400, color: 'kanap.text.tertiary' }}>
                {project.lastActivityAt
                  ? t('reports.steering.stale.lastActivity', {
                      date: formatShortDate(project.lastActivityAt, i18n.language),
                    })
                  : t('reports.steering.stale.never')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box
                sx={(theme) => ({
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: getDotColor(PROJECT_STATUS_COLORS[project.status], theme.palette.mode),
                })}
              />
              <Typography
                sx={(theme) => ({
                  fontSize: 12,
                  fontWeight: 500,
                  color: getDotColor(PROJECT_STATUS_COLORS[project.status], theme.palette.mode),
                })}
              >
                {getProjectStatusLabel(t, project.status)}
              </Typography>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </KanapDialog>
  );
}

/**
 * The daily steering view above the report cards: what moved over the chosen period, and what
 * is waiting for someone. Flow figures stay neutral; only what needs a decision is orange.
 *
 * A figure is a link only when the matching list can show exactly the same population. The
 * counts come from the audit trail, which no list filter reproduces, so "created" and "closed"
 * are plain text, and so is the unassigned figure, which the task list cannot filter on.
 */
export default function SteeringStrip() {
  const { t } = useTranslation('portfolio');
  const [days, setDays] = useState<number>(readStoredDays);
  const [staleOpen, setStaleOpen] = useState(false);

  const { data, isError } = useQuery({
    queryKey: ['portfolio-steering-summary', days],
    queryFn: async () =>
      (
        await api.get<SteeringSummary>('/portfolio/reports/steering-summary', {
          params: { days, tz: viewerTimeZone() },
        })
      ).data,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  if (isError || !data) return null;

  const changePeriod = (next: number) => {
    setDays(next);
    storeDays(next);
  };

  const flowFigures = (key: 'tasks' | 'requests' | 'projects', to: string): Figure[] => {
    const flow = data[key];
    return [
      { key: 'created', label: t('reports.steering.flow.created', { count: flow.created }), to: null },
      { key: 'closed', label: t('reports.steering.flow.closed', { count: flow.closed }), to: null },
      { key: 'open', label: t('reports.steering.flow.open', { count: flow.openNow }), to },
    ];
  };

  const netChange = (key: 'tasks' | 'requests' | 'projects') => {
    const { netChange: net } = data[key];
    if (net === 0) return null;
    return (
      <Tooltip title={t('reports.steering.flow.netTooltip')}>
        <Typography component="span" sx={{ ...figureSx, color: 'kanap.text.tertiary' }}>
          ({net > 0 ? '+' : ''}
          {net})
        </Typography>
      </Tooltip>
    );
  };

  const { overdueTasks, unassignedTasks, staleProjects } = data.attention;
  const staleCount = staleProjects.length;
  const showAttention = overdueTasks > 0 || unassignedTasks > 0 || staleCount > 0;

  const rows: Array<{ key: 'tasks' | 'requests' | 'projects'; to: string }> = [
    { key: 'tasks', to: tasksPath() },
    { key: 'requests', to: requestsPath() },
    { key: 'projects', to: projectsPath() },
  ];

  return (
    <Box
      sx={{
        bgcolor: 'kanap.bg.drawer',
        border: '1px solid',
        borderColor: 'kanap.border.soft',
        borderRadius: '8px',
        px: 2,
        py: 1.25,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.tertiary' }}>
          {t('reports.steering.period', { count: data.days })}
        </Typography>
        <Tabs
          value={days}
          onChange={(_event, next: number) => changePeriod(next)}
          aria-label={t('reports.steering.periodLabel')}
          sx={textTabsSx}
        >
          {STEERING_PERIODS.map((option) => (
            <Tab
              key={option}
              value={option}
              label={t('reports.steering.periodOption', { count: option })}
              sx={{ ...textTabSx(option === days), mr: 0, ml: 2 }}
            />
          ))}
        </Tabs>
      </Stack>

      <Stack spacing={0.5}>
        {rows.map((row) => (
          <FigureRow key={row.key} label={t(`reports.steering.entities.${row.key}`)}>
            <Figures figures={flowFigures(row.key, row.to)} />
            {netChange(row.key)}
          </FigureRow>
        ))}

        {showAttention ? (
          <FigureRow label={t('reports.steering.attention.title')}>
            <Figures
              figures={[
                {
                  key: 'overdue',
                  label: t('reports.steering.attention.overdue', { count: overdueTasks }),
                  to: overdueTasks > 0 ? tasksPath({ due_date: { filterType: 'date', type: 'lessThan', dateFrom: data.endDate } }) : null,
                  tone: overdueTasks > 0 ? 'attention' : 'muted',
                },
                {
                  key: 'unassigned',
                  label: t('reports.steering.attention.unassigned', { count: unassignedTasks }),
                  to: null,
                  tone: unassignedTasks > 0 ? 'attention' : 'muted',
                },
              ]}
            />
            <Separator />
            {staleCount > 0 ? (
              <Typography
                component="button"
                type="button"
                onClick={() => setStaleOpen(true)}
                sx={{
                  ...linkSx,
                  color: TONE_COLOR.attention,
                  border: 0,
                  p: 0,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('reports.steering.attention.stale', { count: staleCount, days: STALE_DAYS })}
              </Typography>
            ) : (
              <Typography sx={{ ...figureSx, color: TONE_COLOR.muted }}>
                {t('reports.steering.attention.stale', { count: 0, days: STALE_DAYS })}
              </Typography>
            )}
          </FigureRow>
        ) : null}
      </Stack>

      <StaleProjectsDialog open={staleOpen} projects={staleProjects} onClose={() => setStaleOpen(false)} />
    </Box>
  );
}
