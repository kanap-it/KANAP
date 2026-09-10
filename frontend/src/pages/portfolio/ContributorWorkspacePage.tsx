import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Menu, MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ChartCard from '../../components/reports/ChartCard';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/useLocale';
import useAutosave from '../../hooks/useAutosave';
import { MONO_FONT_FAMILY } from '../../config/ThemeContext';
import { drawerMenuItemSx, longFormSurfaceFieldSx } from '../../theme/formSx';
import { useKanapDialogs } from '../../components/design';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { taskDetailTypography } from '../tasks/theme/taskDetailTokens';
import PortfolioDetailWorkspaceShell, {
  type PortfolioDetailWorkspaceTab,
} from './workspace/PortfolioDetailWorkspaceShell';
import { PortfolioMetadataItem } from './workspace/PortfolioMetadataBar';
import ContributorTimeLog from './components/ContributorTimeLog';
import ContributorSkillsTab, { type SkillOption, type SkillProficiency } from './components/ContributorSkillsTab';
import ContributorPropertiesDrawer, {
  type ContributorDrawerOption,
  type ContributorDrawerStream,
  type ContributorDrawerTeam,
  type ContributorDrawerValues,
} from './components/ContributorPropertiesDrawer';
import { orderContributors } from './contributorsOrdering';

interface ContributorConfig {
  id: string | null;
  user_id: string;
  user_display_name: string;
  user_email: string;
  areas_of_expertise: string[];
  skills: SkillProficiency[];
  project_availability: number;
  notes: string | null;
  team_id: string | null;
  team_name?: string | null;
  default_source_id: string | null;
  default_category_id: string | null;
  default_stream_id: string | null;
  default_company_id: string | null;
}

/** Fields the workspace can PATCH; the contributor cache is the source of truth for all of them. */
type ContributorPatch = Partial<Pick<ContributorConfig,
  'skills' | 'project_availability' | 'notes' | 'team_id'
  | 'default_source_id' | 'default_category_id' | 'default_stream_id' | 'default_company_id'
>>;

interface TimeStats {
  userId: string;
  averageProjectDays: number;
  monthly: Array<{ yearMonth: string; projectDays: number; otherDays: number; totalDays: number }>;
}

type ContributorTabKey = 'general' | 'skills' | 'time-logged';
const LEGACY_DEFAULTS_TAB = 'defaults';

const isContributorTab = (value: string | undefined): value is ContributorTabKey =>
  value === 'general' || value === 'skills' || value === 'time-logged';

const DEFAULT_AVAILABILITY = 5;

/** The numeric column arrives as a string; a stored 0 is a valid value and must survive. */
function normalizeAvailability(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : DEFAULT_AVAILABILITY;
}

function normalizeConfig(raw: any): ContributorConfig {
  return {
    id: raw?.id ?? null,
    user_id: raw?.user_id ?? '',
    user_display_name: raw?.user_display_name ?? '',
    user_email: raw?.user_email ?? '',
    areas_of_expertise: raw?.areas_of_expertise ?? [],
    skills: raw?.skills ?? [],
    project_availability: normalizeAvailability(raw?.project_availability),
    notes: raw?.notes ?? null,
    team_id: raw?.team_id ?? null,
    team_name: raw?.team_name ?? null,
    default_source_id: raw?.default_source_id ?? null,
    default_category_id: raw?.default_category_id ?? null,
    default_stream_id: raw?.default_stream_id ?? null,
    default_company_id: raw?.default_company_id ?? null,
  };
}

const formatMonth = (yearMonth: string, locale: string) => {
  const date = new Date(`${yearMonth}T00:00:00Z`);
  return date.toLocaleString(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export default function ContributorWorkspacePage() {
  const { t } = useTranslation(['portfolio', 'common', 'nav', 'errors']);
  const dialogs = useKanapDialogs();
  const locale = useLocale();
  const { id: idParam, tab } = useParams<{ id?: string; tab?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasLevel, profile } = useAuth();

  // Both `/contributors/me` and `/contributors/:id` render this page; on the
  // self route there is no `:id` param.
  const isSelfRoute = !idParam;
  const contributorId = idParam;
  const contributorRouteId = contributorId || 'me';
  const basePath = `/portfolio/contributors/${contributorRouteId}`;
  const endpoint = isSelfRoute ? '/portfolio/team-members/me' : `/portfolio/team-members/${contributorId}`;

  const hasAnyPortfolioReader = (
    hasLevel('tasks', 'reader')
    || hasLevel('portfolio_requests', 'reader')
    || hasLevel('portfolio_projects', 'reader')
    || hasLevel('portfolio_planning', 'reader')
    || hasLevel('portfolio_reports', 'reader')
    || hasLevel('portfolio_settings', 'reader')
  );
  const canEdit = isSelfRoute ? hasAnyPortfolioReader : hasLevel('portfolio_settings', 'member');
  const canDelete = !isSelfRoute && hasLevel('portfolio_settings', 'admin');
  const canManageTeams = !isSelfRoute && hasLevel('portfolio_settings', 'member');
  const canViewTime = hasLevel('portfolio_settings', 'reader');
  const canListContributors = !isSelfRoute && hasLevel('portfolio_settings', 'reader');

  const [error, setError] = useState<string | null>(null);
  const [teamAnchor, setTeamAnchor] = useState<HTMLElement | null>(null);

  // Legacy deep links (`/…/defaults`, Settings → Profile) land on General with
  // the properties drawer open, where the defaults now live.
  const legacyDefaultsLink = tab === LEGACY_DEFAULTS_TAB;
  const initialDrawerOpenRef = useRef<boolean | undefined>(legacyDefaultsLink ? true : undefined);
  useEffect(() => {
    if (legacyDefaultsLink) navigate(basePath, { replace: true });
  }, [basePath, legacyDefaultsLink, navigate]);

  const tabs = useMemo<PortfolioDetailWorkspaceTab[]>(() => [
    { key: 'general', label: t('portfolio:workspace.contributor.tabs.general') },
    { key: 'skills', label: t('portfolio:workspace.contributor.tabs.skills') },
    ...(canViewTime ? [{ key: 'time-logged', label: t('portfolio:workspace.contributor.tabs.timeLogged') }] : []),
  ], [canViewTime, t]);
  const activeTab: ContributorTabKey = (
    isContributorTab(tab) && tabs.some((tabDef) => tabDef.key === tab)
  ) ? tab : 'general';

  // ---- Data -----------------------------------------------------------------

  const queryKey = useMemo(() => ['portfolio-contributor', contributorRouteId] as const, [contributorRouteId]);
  const { data: member, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const res = await api.get(endpoint);
        return res.data ? normalizeConfig(res.data) : null;
      } catch (e: any) {
        if (isSelfRoute && e?.response?.status === 404) return null;
        throw e;
      }
    },
    enabled: isSelfRoute ? hasAnyPortfolioReader : !!contributorId,
  });

  const { data: timeStats } = useQuery({
    queryKey: ['contributor-time-stats', member?.id],
    queryFn: async () => {
      const res = await api.get(`/portfolio/team-members/${member?.id}/time-stats`);
      return res.data as TimeStats;
    },
    enabled: canViewTime && !!member?.id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['portfolio-teams'],
    queryFn: async () => (await api.get('/portfolio/teams')).data as ContributorDrawerTeam[],
    enabled: canManageTeams || canListContributors,
  });

  const { data: contributorsList } = useQuery({
    queryKey: ['portfolio-contributors'],
    queryFn: async () => ((await api.get('/portfolio/team-members')).data?.items || []) as Array<{ id: string; team_id?: string | null }>,
    enabled: canListContributors,
  });

  const { data: skillsData } = useQuery({
    queryKey: ['portfolio-skills'],
    queryFn: async () => (await api.get('/portfolio/skills')).data as { items: SkillOption[] },
    enabled: isSelfRoute ? hasAnyPortfolioReader : hasLevel('portfolio_settings', 'reader'),
  });

  const { data: classificationData } = useQuery({
    queryKey: ['portfolio-classification'],
    queryFn: async () => (await api.get('/portfolio/classification/all')).data as {
      sources: ContributorDrawerOption[];
      categories: ContributorDrawerOption[];
      streams: ContributorDrawerStream[];
    },
    enabled: canEdit,
  });

  // ---- Autosave -------------------------------------------------------------
  // The contributor query cache is the single source of truth: every edit is
  // written to it optimistically, buffered in `pendingPatchRef`, and flushed
  // by one debounced controller so PATCHes never overlap.

  const pendingPatchRef = useRef<ContributorPatch>({});
  const saveTargetRef = useRef<{ endpoint: string; queryKey: readonly unknown[]; isSelf: boolean } | null>(null);
  const deletedRef = useRef(false);

  const handleAutosaveError = useCallback((e: unknown) => {
    // Drop the buffer and roll the cache back to the server state; the user
    // sees the error and re-applies the edit. No silent retry storm.
    pendingPatchRef.current = {};
    setError(getApiErrorMessage(e, t, t('portfolio:workspace.contributor.messages.saveFailed')));
    const target = saveTargetRef.current;
    if (target) void queryClient.invalidateQueries({ queryKey: target.queryKey });
  }, [queryClient, t]);

  const { schedule: scheduleSave, flush: flushSave, status: autosaveStatus } = useAutosave({
    onError: handleAutosaveError,
  });

  const flushPending = useCallback(async () => {
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    const target = saveTargetRef.current;
    if (deletedRef.current || !target || Object.keys(patch).length === 0) return;
    const res = await api.patch(target.endpoint, patch);
    const savedId: string | undefined = res.data?.id;
    // Keep the optimistic values (an edit made during the request must win);
    // only the id is taken from the response, which matters for the first
    // self-service save that creates the config.
    if (savedId) {
      queryClient.setQueryData<ContributorConfig | null>(target.queryKey, (previous) => (
        previous && !previous.id ? { ...previous, id: savedId } : previous
      ));
    }
    if (!target.isSelf) {
      void queryClient.invalidateQueries({ queryKey: ['portfolio-contributors'] });
      void queryClient.invalidateQueries({ queryKey: ['portfolio-teams'] });
    }
    void queryClient.invalidateQueries({ queryKey: ['portfolio-contributor', 'me'], exact: true, refetchType: 'none' });
    if (profile?.id) {
      void queryClient.invalidateQueries({ queryKey: ['classification-defaults', profile.id] });
    }
  }, [profile?.id, queryClient]);

  const patch = useCallback((partial: ContributorPatch) => {
    if (!canEdit) return;
    queryClient.setQueryData<ContributorConfig | null>(queryKey, (previous) => ({
      ...(previous ?? normalizeConfig({ user_id: profile?.id })),
      ...partial,
    }));
    pendingPatchRef.current = { ...pendingPatchRef.current, ...partial };
    saveTargetRef.current = { endpoint, queryKey, isSelf: isSelfRoute };
    scheduleSave(flushPending);
  }, [canEdit, endpoint, flushPending, isSelfRoute, profile?.id, queryClient, queryKey, scheduleSave]);

  // ---- Navigation (all controlled transitions drain the autosave first) -----

  const handleTabChange = useCallback(async (nextTab: string) => {
    if (nextTab === activeTab) return;
    if (!(await flushSave())) return;
    navigate(nextTab === 'general' ? basePath : `${basePath}/${nextTab}`);
  }, [activeTab, basePath, flushSave, navigate]);

  const backPath = isSelfRoute ? '/settings/profile' : '/portfolio/contributors';
  const handleBack = useCallback(async () => {
    if (!(await flushSave())) return;
    navigate(backPath);
  }, [backPath, flushSave, navigate]);

  const orderedIds = useMemo(() => (
    contributorsList
      ? orderContributors(contributorsList, teams, t('portfolio:contributors.filters.unassigned')).map((c) => c.id)
      : []
  ), [contributorsList, t, teams]);
  const navIndex = contributorId ? orderedIds.indexOf(contributorId) : -1;
  const goToContributor = useCallback(async (targetId: string | undefined) => {
    if (!targetId || !(await flushSave())) return;
    navigate(activeTab === 'general'
      ? `/portfolio/contributors/${targetId}`
      : `/portfolio/contributors/${targetId}/${activeTab}`);
  }, [activeTab, flushSave, navigate]);
  const nav = navIndex >= 0 ? {
    currentIndex: navIndex + 1,
    totalCount: orderedIds.length,
    hasPrev: navIndex > 0,
    hasNext: navIndex < orderedIds.length - 1,
    onPrev: () => { void goToContributor(orderedIds[navIndex - 1]); },
    onNext: () => { void goToContributor(orderedIds[navIndex + 1]); },
    previousLabel: t('portfolio:workspace.contributor.nav.previous'),
    nextLabel: t('portfolio:workspace.contributor.nav.next'),
  } : undefined;

  // ---- Delete ---------------------------------------------------------------

  const handleDelete = useCallback(async () => {
    if (!contributorId || isSelfRoute) return;
    if (!(await dialogs.confirm({
      message: t('portfolio:workspace.contributor.confirmations.remove'),
      confirmLabel: t('common:buttons.remove'),
      intent: 'danger',
    }))) return;
    // Nothing pending may reach the server after the row is gone.
    pendingPatchRef.current = {};
    await flushSave();
    try {
      await api.delete(`/portfolio/team-members/${contributorId}`);
      deletedRef.current = true;
      queryClient.removeQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ['portfolio-contributors'] });
      navigate('/portfolio/contributors');
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('portfolio:workspace.contributor.messages.deleteFailed')));
    }
  }, [contributorId, dialogs, flushSave, isSelfRoute, navigate, queryClient, queryKey, t]);

  // ---- Skills handlers ------------------------------------------------------

  const skills = member?.skills ?? [];
  const handleAddSkill = useCallback((skillId: string) => {
    if (skills.some((s) => s.skill_id === skillId)) return;
    patch({ skills: [...skills, { skill_id: skillId, proficiency: 2 }] });
  }, [patch, skills]);
  const handleRemoveSkill = useCallback((skillId: string) => {
    patch({ skills: skills.filter((s) => s.skill_id !== skillId) });
  }, [patch, skills]);
  const handleLevelChange = useCallback((skillId: string, level: number) => {
    patch({ skills: skills.map((s) => (s.skill_id === skillId ? { ...s, proficiency: level } : s)) });
  }, [patch, skills]);

  // ---- Render ---------------------------------------------------------------

  const contributorTitle = (
    member?.user_display_name
    || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
    || member?.user_email
    || profile?.email
    || ''
  );
  const notFound = !isLoading && !isError && !member && !isSelfRoute;
  const view = member ?? normalizeConfig({ user_id: profile?.id });
  const teamName = view.team_id
    ? (teams.find((team) => team.id === view.team_id)?.name || view.team_name || '')
    : '';

  const savingHint = autosaveStatus === 'saving' || autosaveStatus === 'pending'
    ? t('common:status.saving')
    : autosaveStatus === 'saved'
      ? t('common:status.saved')
      : null;

  const drawerValues: ContributorDrawerValues = {
    team_id: view.team_id,
    project_availability: view.project_availability,
    default_source_id: view.default_source_id,
    default_category_id: view.default_category_id,
    default_stream_id: view.default_stream_id,
    default_company_id: view.default_company_id,
  };

  const metadata = (
    <>
      {!isSelfRoute && (
        <>
          <PortfolioMetadataItem
            label={t('portfolio:workspace.contributor.metadata.team')}
            onClick={canManageTeams ? (event) => setTeamAnchor(event.currentTarget) : undefined}
            title={canManageTeams ? t('portfolio:workspace.contributor.metadata.editTeam') : undefined}
          >
            {teamName || t('portfolio:workspace.contributor.metadata.noTeam')}
          </PortfolioMetadataItem>
          <Menu anchorEl={teamAnchor} open={!!teamAnchor} onClose={() => setTeamAnchor(null)}>
            {view.team_id && (
              <MenuItem
                onClick={() => { patch({ team_id: null }); setTeamAnchor(null); }}
                sx={drawerMenuItemSx}
              >
                — {t('common:buttons.clear')} —
              </MenuItem>
            )}
            {teams
              .filter((team) => team.is_active || team.id === view.team_id)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) => (
                <MenuItem
                  key={team.id}
                  selected={team.id === view.team_id}
                  onClick={() => { patch({ team_id: team.id }); setTeamAnchor(null); }}
                  sx={drawerMenuItemSx}
                >
                  {team.name}
                </MenuItem>
              ))}
          </Menu>
        </>
      )}
      <PortfolioMetadataItem label={t('portfolio:workspace.contributor.metadata.availability')} mono>
        {t('portfolio:workspace.contributor.values.daysPerMonthShort', { count: view.project_availability })}
      </PortfolioMetadataItem>
      <PortfolioMetadataItem>
        {t('portfolio:workspace.contributor.values.skillCount', { count: skills.length })}
      </PortfolioMetadataItem>
      {savingHint && (
        <Box component="span" sx={(theme) => ({ ...taskDetailTypography.metaLabel, color: theme.palette.kanap.text.tertiary })}>
          {savingHint}
        </Box>
      )}
    </>
  );

  const actions = canDelete ? (
    <Button variant="action-danger" onClick={handleDelete}>
      {t('common:buttons.delete')}
    </Button>
  ) : undefined;

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError(null)}>{error}</Alert>
      )}
      <PortfolioDetailWorkspaceShell
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={(next) => { void handleTabChange(next); }}
        drawerStorageKey="kanap.contributors.drawerOpen"
        initialDrawerOpen={initialDrawerOpenRef.current}
        backLabel={isSelfRoute ? t('nav:breadcrumbs.settings') : t('nav:breadcrumbs.contributors')}
        onBack={() => { void handleBack(); }}
        title={contributorTitle}
        titleFallback={t('portfolio:workspace.contributor.titleFallback')}
        nav={nav}
        metadata={isLoading || notFound ? undefined : metadata}
        actions={actions}
        properties={isLoading || notFound ? null : (
          <ContributorPropertiesDrawer
            values={drawerValues}
            teams={teams}
            sources={classificationData?.sources ?? []}
            categories={classificationData?.categories ?? []}
            streams={classificationData?.streams ?? []}
            showTeam={!isSelfRoute}
            canEdit={canEdit}
            canManageTeams={canManageTeams}
            onChange={(partial) => patch(partial)}
          />
        )}
      >
        {notFound && (
          <Box sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.tertiary })}>
            {t('portfolio:workspace.contributor.states.notFound')}
          </Box>
        )}

        {!isLoading && !notFound && activeTab === 'general' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 900 }}>
            <Box>
              <Box sx={(theme) => ({ ...taskDetailTypography.sectionLabel, color: theme.palette.kanap.text.tertiary, mb: '6px' })}>
                {t('portfolio:workspace.contributor.sections.notes')}
              </Box>
              <TextField
                value={view.notes ?? ''}
                onChange={(e) => patch({ notes: e.target.value })}
                multiline
                minRows={4}
                maxRows={12}
                fullWidth
                variant="standard"
                InputProps={{ readOnly: !canEdit }}
                placeholder={t('portfolio:workspace.contributor.placeholders.notes')}
                sx={longFormSurfaceFieldSx}
              />
            </Box>

            {canViewTime && (
              <Box>
                <Box sx={(theme) => ({ ...taskDetailTypography.sectionLabel, color: theme.palette.kanap.text.tertiary, mb: '6px' })}>
                  {t('portfolio:workspace.contributor.sections.timeStatistics')}
                </Box>
                <Box sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.primary, mb: '12px' })}>
                  {t('portfolio:workspace.contributor.values.averageMonthlyProjectEffort', {
                    value: timeStats?.averageProjectDays ?? 0,
                  })}
                </Box>
                {timeStats && (timeStats.monthly.length ? (
                  <ChartCard
                    title={t('portfolio:workspace.contributor.sections.monthlyEffort')}
                    height={280}
                    options={{
                      data: timeStats.monthly.map((m) => ({
                        month: formatMonth(m.yearMonth, locale),
                        project: m.projectDays,
                        other: m.otherDays,
                        total: m.totalDays,
                      })),
                      series: [
                        { type: 'line', xKey: 'month', yKey: 'total', yName: t('portfolio:workspace.contributor.chart.total') },
                        { type: 'line', xKey: 'month', yKey: 'project', yName: t('portfolio:workspace.contributor.chart.project') },
                        { type: 'line', xKey: 'month', yKey: 'other', yName: t('portfolio:workspace.contributor.chart.other') },
                      ],
                      axes: [
                        { type: 'category', position: 'bottom' },
                        { type: 'number', position: 'left', title: { text: t('portfolio:workspace.contributor.chart.manDays') } },
                      ],
                      legend: { enabled: true, position: 'bottom' },
                    }}
                  />
                ) : (
                  <Box sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.tertiary })}>
                    {t('portfolio:workspace.contributor.states.noTimeData')}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {!isLoading && !notFound && activeTab === 'skills' && (
          <ContributorSkillsTab
            allSkills={skillsData?.items ?? []}
            selectedSkills={skills}
            canEdit={canEdit}
            onAdd={handleAddSkill}
            onRemove={handleRemoveSkill}
            onLevelChange={handleLevelChange}
          />
        )}

        {activeTab === 'time-logged' && member?.id && <ContributorTimeLog contributorId={member.id} />}
      </PortfolioDetailWorkspaceShell>
    </Box>
  );
}
