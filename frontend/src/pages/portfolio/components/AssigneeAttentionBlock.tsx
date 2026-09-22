import React, { useCallback, useMemo, useState } from 'react';
import { Box, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import { textTabSx, textTabsSx } from '../../../theme/formSx';
import { BLANK, FilterModel, tasksPath } from './portfolioListLinks';

export type AttentionCounts = { open: number; overdue: number; stale: number };

export type AssigneeRow = AttentionCounts & {
  userId: string;
  name: string;
  contributorRef: string | null;
};

export type TeamGroup = AttentionCounts & {
  teamId: string | null;
  teamName: string | null;
  members: AssigneeRow[];
};

export type AssigneeAttention = {
  staleDays: number;
  asOf: string;
  staleBefore: string;
  teams: TeamGroup[];
  unassigned: AttentionCounts;
  totals: AttentionCounts;
};

export const STALE_WINDOWS = [7, 14, 30];
export const STALE_DAYS_STORAGE_KEY = 'kanap.portfolioReports.staleDays';
export const COLLAPSED_TEAMS_STORAGE_KEY = 'kanap.portfolioReports.assigneeCollapsedTeams';

/** The key a group is remembered under; the people without a team have no id of their own. */
const teamKey = (team: TeamGroup) => team.teamId ?? 'no-team';

const readStoredDays = (): number => {
  try {
    const stored = Number(window.localStorage.getItem(STALE_DAYS_STORAGE_KEY));
    if (STALE_WINDOWS.includes(stored)) return stored;
  } catch {
    // A browser that refuses storage still gets the default window.
  }
  return 14;
};

const storeDays = (days: number) => {
  try {
    window.localStorage.setItem(STALE_DAYS_STORAGE_KEY, String(days));
  } catch {
    // Remembering the window is a convenience, never a requirement.
  }
};

const readCollapsed = (): string[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COLLAPSED_TEAMS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch {
    return [];
  }
};

const storeCollapsed = (keys: string[]) => {
  try {
    window.localStorage.setItem(COLLAPSED_TEAMS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Folded groups are a reading convenience; losing them is harmless.
  }
};

const viewerTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const cellSx = {
  fontSize: 13,
  fontWeight: 400,
  color: 'kanap.text.primary',
  borderBottom: '1px solid',
  borderColor: 'kanap.border.soft',
  py: 0.5,
} as const;

const headCellSx = {
  fontSize: 11,
  fontWeight: 500,
  color: 'kanap.text.secondary',
  borderBottom: '1px solid',
  borderColor: 'kanap.border.default',
  py: 0.5,
  whiteSpace: 'nowrap',
} as const;

const linkSx = {
  textDecoration: 'none',
  color: 'inherit',
  '&:hover': { textDecoration: 'underline' },
} as const;

/**
 * One figure of the table. It opens the task list only when that list shows exactly the
 * population it counts, and a zero never opens anything: there would be nothing to read.
 * Overdue and still tasks are what needs a decision, so they carry the attention colour.
 */
function CountCell({ value, to, tone }: { value: number; to: string; tone: 'neutral' | 'attention' }) {
  const color = value > 0 && tone === 'attention' ? 'warning.main' : value > 0 ? 'kanap.text.primary' : 'kanap.text.secondary';
  return (
    <TableCell align="right" sx={{ ...cellSx, width: 128, fontVariantNumeric: 'tabular-nums' }}>
      {value > 0 ? (
        <Typography component={RouterLink} to={to} sx={{ ...linkSx, fontSize: 13, fontWeight: 400, color }}>
          {value}
        </Typography>
      ) : (
        <Typography component="span" sx={{ fontSize: 13, fontWeight: 400, color }}>
          {value}
        </Typography>
      )}
    </TableCell>
  );
}

/**
 * Where the open work sits: by team, then by person, with what is open, what is late and what
 * has not moved for the chosen window. It reads a workload, never a ranking, so the rows stay
 * in alphabetical order and carry no rank, no medal and no default sort on the figures.
 */
export default function AssigneeAttentionBlock() {
  const { t } = useTranslation('portfolio');
  const { hasLevel } = useAuth();
  const [staleDays, setStaleDays] = useState<number>(readStoredDays);
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);
  const canOpenContributor = hasLevel('portfolio_settings', 'reader');

  const { data, isError } = useQuery({
    queryKey: ['portfolio-assignee-attention', staleDays],
    queryFn: async () =>
      (
        await api.get<AssigneeAttention>('/portfolio/reports/attention-by-assignee', {
          params: { staleDays, tz: viewerTimeZone() },
        })
      ).data,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  const toggleTeam = useCallback((key: string) => {
    setCollapsed((previous) => {
      const next = previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key];
      storeCollapsed(next);
      return next;
    });
  }, []);

  const changeWindow = (next: number) => {
    setStaleDays(next);
    storeDays(next);
  };

  const links = useMemo(() => {
    if (!data) return null;
    const assignee = (values: Array<string | null>): FilterModel => ({
      assignee_user_id: { filterType: 'set', values },
    });
    const build = (base: FilterModel) => ({
      open: tasksPath(base),
      overdue: tasksPath({ ...base, due_date: { filterType: 'date', type: 'lessThan', dateFrom: data.asOf } }),
      stale: tasksPath({ ...base, updated_at: { filterType: 'date', type: 'lessThan', dateFrom: data.staleBefore } }),
    });
    return {
      forValues: (values: Array<string | null>) => build(assignee(values)),
      unassigned: build({ assignee_user_id: BLANK }),
      total: build({}),
    };
  }, [data]);

  if (isError || !data || !links) return null;

  const summary: Array<{ key: string; label: string; to: string; count: number; tone: 'neutral' | 'attention' }> = [
    { key: 'open', label: t('reports.byAssignee.summary.open', { count: data.totals.open }), to: links.total.open, count: data.totals.open, tone: 'neutral' },
    { key: 'overdue', label: t('reports.byAssignee.summary.overdue', { count: data.totals.overdue }), to: links.total.overdue, count: data.totals.overdue, tone: 'attention' },
    { key: 'stale', label: t('reports.byAssignee.summary.stale', { count: data.totals.stale }), to: links.total.stale, count: data.totals.stale, tone: 'attention' },
    { key: 'unassigned', label: t('reports.byAssignee.summary.unassigned', { count: data.unassigned.open }), to: links.unassigned.open, count: data.unassigned.open, tone: 'attention' },
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
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.tertiary' }}>
            {t('reports.byAssignee.title')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1, rowGap: 0.25, mt: 0.25 }}>
            {summary.map((figure, index) => (
              <Box key={figure.key} sx={{ display: 'contents' }}>
                {index > 0 ? (
                  <Typography aria-hidden sx={{ fontSize: 13, color: 'kanap.text.tertiary' }}>
                    ·
                  </Typography>
                ) : null}
                {figure.count > 0 ? (
                  <Typography
                    component={RouterLink}
                    to={figure.to}
                    sx={{
                      ...linkSx,
                      fontSize: 13,
                      fontWeight: 400,
                      color: figure.tone === 'attention' ? 'warning.main' : 'kanap.text.primary',
                    }}
                  >
                    {figure.label}
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary' }}>
                    {figure.label}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 400, color: 'kanap.text.tertiary' }}>
            {t('reports.byAssignee.staleLabel')}
          </Typography>
          <Tabs
            value={staleDays}
            onChange={(_event, next: number) => changeWindow(next)}
            aria-label={t('reports.byAssignee.staleLabel')}
            sx={textTabsSx}
          >
            {STALE_WINDOWS.map((option) => (
              <Tab
                key={option}
                value={option}
                label={t('reports.byAssignee.staleOption', { count: option })}
                sx={{ ...textTabSx(option === staleDays), mr: 0, ml: 2 }}
              />
            ))}
          </Tabs>
        </Stack>
      </Stack>

      {data.totals.open === 0 ? (
        <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary', mt: 0.75 }}>
          {t('reports.byAssignee.empty')}
        </Typography>
      ) : (
        <Table size="small" sx={{ mt: 0.75 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={headCellSx}>{t('reports.byAssignee.columns.assignee')}</TableCell>
              <TableCell align="right" sx={{ ...headCellSx, width: 128 }}>{t('reports.byAssignee.columns.open')}</TableCell>
              <TableCell align="right" sx={{ ...headCellSx, width: 128 }}>{t('reports.byAssignee.columns.overdue')}</TableCell>
              <TableCell align="right" sx={{ ...headCellSx, width: 128 }}>{t('reports.byAssignee.columns.stale')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.teams.map((team) => {
              const key = teamKey(team);
              const isCollapsed = collapsed.includes(key);
              const teamLinks = links.forValues(team.members.map((member) => member.userId));
              return (
                <React.Fragment key={key}>
                  <TableRow>
                    <TableCell sx={cellSx}>
                      <Box
                        component="button"
                        type="button"
                        aria-expanded={!isCollapsed}
                        onClick={() => toggleTeam(key)}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          p: 0,
                          border: 0,
                          bgcolor: 'transparent',
                          color: 'kanap.text.primary',
                          font: 'inherit',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <ExpandMoreIcon
                          sx={{
                            fontSize: 18,
                            color: 'kanap.text.secondary',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                            transition: 'transform 160ms ease',
                          }}
                        />
                        {team.teamName ?? t('reports.byAssignee.noTeam')}
                      </Box>
                    </TableCell>
                    <CountCell value={team.open} to={teamLinks.open} tone="neutral" />
                    <CountCell value={team.overdue} to={teamLinks.overdue} tone="attention" />
                    <CountCell value={team.stale} to={teamLinks.stale} tone="attention" />
                  </TableRow>
                  {isCollapsed
                    ? null
                    : team.members.map((member) => {
                        const memberLinks = links.forValues([member.userId]);
                        return (
                          <TableRow key={member.userId} sx={{ '&:hover': { bgcolor: 'kanap.bg.hover' } }}>
                            <TableCell sx={{ ...cellSx, pl: 4 }}>
                              <Stack direction="row" spacing={1} alignItems="baseline">
                                <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.primary' }}>
                                  {member.name}
                                </Typography>
                                {member.contributorRef && canOpenContributor ? (
                                  <Typography
                                    component={RouterLink}
                                    to={`/portfolio/contributors/${member.contributorRef}`}
                                    sx={{
                                      ...linkSx,
                                      fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
                                      fontSize: 11,
                                      fontWeight: 400,
                                      color: 'kanap.text.tertiary',
                                      fontVariantNumeric: 'tabular-nums',
                                    }}
                                  >
                                    {member.contributorRef}
                                  </Typography>
                                ) : null}
                              </Stack>
                            </TableCell>
                            <CountCell value={member.open} to={memberLinks.open} tone="neutral" />
                            <CountCell value={member.overdue} to={memberLinks.overdue} tone="attention" />
                            <CountCell value={member.stale} to={memberLinks.stale} tone="attention" />
                          </TableRow>
                        );
                      })}
                </React.Fragment>
              );
            })}

            <TableRow>
              <TableCell sx={cellSx}>{t('reports.byAssignee.unassigned')}</TableCell>
              <CountCell value={data.unassigned.open} to={links.unassigned.open} tone="attention" />
              <CountCell value={data.unassigned.overdue} to={links.unassigned.overdue} tone="attention" />
              <CountCell value={data.unassigned.stale} to={links.unassigned.stale} tone="attention" />
            </TableRow>

            <TableRow>
              <TableCell sx={{ ...cellSx, fontWeight: 500, borderColor: 'kanap.border.default' }}>
                {t('reports.byAssignee.total')}
              </TableCell>
              <CountCell value={data.totals.open} to={links.total.open} tone="neutral" />
              <CountCell value={data.totals.overdue} to={links.total.overdue} tone="attention" />
              <CountCell value={data.totals.stale} to={links.total.stale} tone="attention" />
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
