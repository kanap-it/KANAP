import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Collapse, FormControl, IconButton,
  InputLabel, MenuItem, Select, Slider, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import ChartCard from '../../components/reports/ChartCard';
import EnumAutocomplete from '../../components/fields/EnumAutocomplete';
import CompanySelect from '../../components/fields/CompanySelect';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import ContributorTimeLog from './components/ContributorTimeLog';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

interface SkillProficiency {
  skill_id: string;
  proficiency: number;
}

interface Skill {
  id: string;
  category: string;
  name: string;
  enabled: boolean;
}

interface Team {
  id: string;
  name: string;
  is_active: boolean;
}

interface ContributorConfig {
  id: string;
  user_id: string;
  user_display_name: string;
  user_email: string;
  areas_of_expertise: string[];
  skills: SkillProficiency[];
  project_availability: number;
  notes?: string;
  team_id?: string;
  team_name?: string;
  default_source_id?: string | null;
  default_category_id?: string | null;
  default_stream_id?: string | null;
  default_company_id?: string | null;
}

interface ClassificationType {
  id: string;
  name: string;
  is_active: boolean;
}

interface ClassificationCategory {
  id: string;
  name: string;
  is_active: boolean;
}

interface ClassificationStream {
  id: string;
  name: string;
  category_id: string;
  is_active: boolean;
}

interface TimeStats {
  userId: string;
  averageProjectDays: number;
  monthly: Array<{
    yearMonth: string;
    projectDays: number;
    otherDays: number;
    totalDays: number;
  }>;
}

const PROFICIENCY_MARKS = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
];

const formatMonth = (yearMonth: string) => {
  const date = new Date(`${yearMonth}T00:00:00Z`);
  return date.toLocaleString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

type ContributorTabKey = 'general' | 'skills' | 'time-logged' | 'defaults';

const isContributorTab = (value: string | undefined): value is ContributorTabKey =>
  value === 'general' || value === 'skills' || value === 'time-logged' || value === 'defaults';

export default function ContributorWorkspacePage() {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const location = useLocation();
  const { id: idParam, tab } = useParams<{ id?: string; tab?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasLevel, profile } = useAuth();
  const contributorIdFromPath = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    return segments[2] || undefined;
  }, [location.pathname]);
  const contributorId = idParam ?? contributorIdFromPath;
  const isSelfRoute = contributorId === 'me';
  const contributorRouteId = contributorId || 'me';
  const hasAnyPortfolioReader = (
    hasLevel('tasks', 'reader') ||
    hasLevel('portfolio_requests', 'reader') ||
    hasLevel('portfolio_projects', 'reader') ||
    hasLevel('portfolio_planning', 'reader') ||
    hasLevel('portfolio_reports', 'reader') ||
    hasLevel('portfolio_settings', 'reader')
  );
  const canEdit = isSelfRoute ? hasAnyPortfolioReader : hasLevel('portfolio_settings', 'member');
  const canDelete = !isSelfRoute && hasLevel('portfolio_settings', 'admin');
  const canManageTeams = !isSelfRoute && hasLevel('portfolio_settings', 'member');
  const canViewTime = hasLevel('portfolio_settings', 'reader');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [projectAvailability, setProjectAvailability] = useState(5);
  const [notes, setNotes] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<SkillProficiency[]>([]);
  const [defaultSourceId, setDefaultSourceId] = useState('');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [defaultStreamId, setDefaultStreamId] = useState('');
  const [defaultCompanyId, setDefaultCompanyId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const proficiencyLabels = useMemo<Record<number, string>>(() => ({
    0: t('portfolio:workspace.contributor.proficiency.0'),
    1: t('portfolio:workspace.contributor.proficiency.1'),
    2: t('portfolio:workspace.contributor.proficiency.2'),
    3: t('portfolio:workspace.contributor.proficiency.3'),
    4: t('portfolio:workspace.contributor.proficiency.4'),
  }), [t]);
  const contributorTabs = useMemo<Array<{ key: ContributorTabKey; label: string }>>(() => ([
    { key: 'general', label: t('portfolio:workspace.contributor.tabs.general') },
    { key: 'skills', label: t('portfolio:workspace.contributor.tabs.skills') },
    { key: 'time-logged', label: t('portfolio:workspace.contributor.tabs.timeLogged') },
    { key: 'defaults', label: t('portfolio:workspace.contributor.tabs.defaults') },
  ]), [t]);
  const availableTabs = useMemo(
    () => contributorTabs.filter((tabDef) => (tabDef.key === 'time-logged' ? canViewTime : true)),
    [canViewTime, contributorTabs],
  );
  const activeTab: ContributorTabKey = (
    isContributorTab(tab) && availableTabs.some((tabDef) => tabDef.key === tab)
  ) ? tab : 'general';

  const handleTabChange = useCallback((_: React.SyntheticEvent, nextValue: ContributorTabKey) => {
    navigate(`/portfolio/contributors/${contributorRouteId}/${nextValue}`);
  }, [contributorRouteId, navigate]);

  // Fetch contributor
  const { data: member, isLoading } = useQuery({
    queryKey: ['portfolio-contributor', contributorRouteId],
    queryFn: async () => {
      try {
        const endpoint = isSelfRoute
          ? '/portfolio/team-members/me'
          : `/portfolio/team-members/${contributorId}`;
        const res = await api.get(endpoint);
        return (res.data as ContributorConfig) || null;
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

  // Fetch teams
  const { data: teamsData } = useQuery({
    queryKey: ['portfolio-teams'],
    queryFn: async () => {
      const res = await api.get('/portfolio/teams');
      return res.data as Team[];
    },
    enabled: canManageTeams,
  });

  const teams = teamsData || [];

  // Fetch all skills
  const { data: skillsData } = useQuery({
    queryKey: ['portfolio-skills'],
    queryFn: async () => {
      const res = await api.get('/portfolio/skills');
      return res.data as { items: Skill[]; grouped: Record<string, Skill[]> };
    },
    enabled: isSelfRoute ? hasAnyPortfolioReader : hasLevel('portfolio_settings', 'reader'),
  });

  const { data: classificationData } = useQuery({
    queryKey: ['portfolio-classification'],
    queryFn: async () => {
      const res = await api.get('/portfolio/classification/all');
      return res.data as {
        sources: ClassificationType[];
        categories: ClassificationCategory[];
        streams: ClassificationStream[];
      };
    },
    enabled: activeTab === 'defaults',
  });

  const allSkills = skillsData?.items || [];
  const sources = classificationData?.sources?.filter((t) => t.is_active) || [];
  const categories = classificationData?.categories?.filter((c) => c.is_active) || [];
  const streams = classificationData?.streams?.filter((s) => s.is_active) || [];
  const filteredDefaultStreams = useMemo(() => {
    if (!defaultCategoryId) return [];
    return streams.filter((s) => s.category_id === defaultCategoryId);
  }, [streams, defaultCategoryId]);

  // Initialize form from member data
  useEffect(() => {
    if (member) {
      // project_availability comes as string from DB numeric column - convert to number
      setProjectAvailability(Number(member.project_availability) || 5);
      setNotes(member.notes || '');
      setTeamId(member.team_id || '');
      setSelectedSkills(member.skills || []);
      setDefaultSourceId(member.default_source_id || '');
      setDefaultCategoryId(member.default_category_id || '');
      setDefaultStreamId(member.default_stream_id || '');
      setDefaultCompanyId(member.default_company_id || null);
    } else if (isSelfRoute) {
      setProjectAvailability(5);
      setNotes('');
      setTeamId('');
      setSelectedSkills([]);
      setDefaultSourceId('');
      setDefaultCategoryId('');
      setDefaultStreamId('');
      setDefaultCompanyId(null);
    }
  }, [member, isSelfRoute]);

  // Skills that are not yet selected
  const availableSkills = useMemo(() => {
    const selectedIds = new Set(selectedSkills.map((s) => s.skill_id));
    return allSkills.filter((s) => s.enabled && !selectedIds.has(s.id));
  }, [allSkills, selectedSkills]);

  // Get skill details by ID
  const getSkillById = useCallback((skillId: string) => {
    return allSkills.find((s) => s.id === skillId);
  }, [allSkills]);

  // Handle adding a skill
  const handleAddSkill = useCallback((skill: Skill | null) => {
    if (!skill) return;
    setSelectedSkills((prev) => [...prev, { skill_id: skill.id, proficiency: 2 }]);
  }, []);

  // Handle removing a skill
  const handleRemoveSkill = useCallback((skillId: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
  }, []);

  // Handle proficiency change
  const handleProficiencyChange = useCallback((skillId: string, proficiency: number) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.skill_id === skillId ? { ...s, proficiency } : s))
    );
  }, []);

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleDefaultCategoryChange = useCallback((nextCategoryId: string) => {
    setDefaultCategoryId(nextCategoryId);
    if (!defaultStreamId) return;
    const streamBelongsToCategory = streams.some(
      (stream) => stream.id === defaultStreamId && stream.category_id === nextCategoryId,
    );
    if (!streamBelongsToCategory) {
      setDefaultStreamId('');
    }
  }, [defaultStreamId, streams]);

  // Auto-expand all categories when skills are loaded
  useEffect(() => {
    if (selectedSkills.length > 0 && allSkills.length > 0) {
      const categories = new Set<string>();
      for (const sp of selectedSkills) {
        const skill = allSkills.find((s) => s.id === sp.skill_id);
        if (skill) categories.add(skill.category);
      }
      setExpandedCategories(categories);
    }
  }, [selectedSkills, allSkills]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!isSelfRoute && !contributorId) return;
    setSaving(true);
    setError(null);

    try {
      const endpoint = isSelfRoute
        ? '/portfolio/team-members/me'
        : `/portfolio/team-members/${contributorId}`;
      const payload: Record<string, unknown> = {
        project_availability: projectAvailability,
        notes: notes || null,
        skills: selectedSkills,
        default_source_id: defaultSourceId || null,
        default_category_id: defaultCategoryId || null,
        default_stream_id: defaultStreamId || null,
        default_company_id: defaultCompanyId || null,
      };
      if (!isSelfRoute) {
        payload.team_id = teamId || null;
      }

      await api.patch(endpoint, payload);
      queryClient.invalidateQueries({ queryKey: ['portfolio-contributor', contributorRouteId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-contributor', 'me'] });
      if (!isSelfRoute) {
        queryClient.invalidateQueries({ queryKey: ['portfolio-contributors'] });
        queryClient.invalidateQueries({ queryKey: ['portfolio-teams'] });
      }
      if (profile?.id) {
        queryClient.invalidateQueries({ queryKey: ['classification-defaults', profile.id] });
      }
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('portfolio:workspace.contributor.messages.saveFailed')));
    } finally {
      setSaving(false);
    }
  }, [
    contributorId,
    isSelfRoute,
    contributorRouteId,
    projectAvailability,
    notes,
    teamId,
    selectedSkills,
    defaultSourceId,
    defaultCategoryId,
    defaultStreamId,
    defaultCompanyId,
    profile?.id,
    queryClient,
    t,
  ]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!contributorId || isSelfRoute) return;
    if (!confirm(t('portfolio:workspace.contributor.confirmations.remove'))) return;

    try {
      await api.delete(`/portfolio/team-members/${contributorId}`);
      queryClient.invalidateQueries({ queryKey: ['portfolio-contributors'] });
      navigate('/portfolio/contributors');
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('portfolio:workspace.contributor.messages.deleteFailed')));
    }
  }, [contributorId, isSelfRoute, navigate, queryClient, t]);

  // Group selected skills by category
  const selectedSkillsByCategory = useMemo(() => {
    const grouped: Record<string, SkillProficiency[]> = {};
    for (const sp of selectedSkills) {
      const skill = getSkillById(sp.skill_id);
      if (skill) {
        if (!grouped[skill.category]) grouped[skill.category] = [];
        grouped[skill.category].push(sp);
      }
    }
    return grouped;
  }, [selectedSkills, getSkillById]);

  if (isLoading) {
    return <Typography>{t('common:status.loading')}</Typography>;
  }

  if (!member && !isSelfRoute) {
    return <Typography>{t('portfolio:workspace.contributor.states.notFound')}</Typography>;
  }

  const contributorTitle = (
    member?.user_display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    member?.user_email ||
    profile?.email ||
    t('portfolio:workspace.contributor.titleFallback')
  );
  const backPath = isSelfRoute ? '/settings/profile' : '/portfolio/contributors';

  const actions = (
    <Stack direction="row" spacing={1}>
      <IconButton
        onClick={() => navigate(backPath)}
        title={isSelfRoute
          ? t('portfolio:workspace.contributor.actions.backToSettings')
          : t('portfolio:workspace.contributor.actions.backToList')}
      >
        <ArrowBackIcon />
      </IconButton>
      {canEdit && (
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('common:status.saving') : t('common:buttons.save')}
        </Button>
      )}
      {canDelete && (
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
        >
          {t('common:buttons.delete')}
        </Button>
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader
        title={contributorTitle}
        breadcrumbTitle={contributorTitle}
        actions={actions}
      />

      <Box sx={{ p: 3, maxWidth: 1000 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          {availableTabs.map((tabDef) => (
            <Tab key={tabDef.key} value={tabDef.key} label={tabDef.label} />
          ))}
        </Tabs>

        {/* General Tab */}
        {activeTab === 'general' && (
          <Stack spacing={3}>
            {!isSelfRoute && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('portfolio:workspace.contributor.sections.team')}
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ maxWidth: 400 }}>
                    <InputLabel>{t('portfolio:workspace.contributor.fields.assignTeam')}</InputLabel>
                    <Select
                      value={teamId}
                      label={t('portfolio:workspace.contributor.fields.assignTeam')}
                      onChange={(e) => setTeamId(e.target.value)}
                      disabled={!canManageTeams}
                    >
                      <MenuItem value="">
                        <em>{t('portfolio:workspace.contributor.values.unassigned')}</em>
                      </MenuItem>
                      {teams
                        .filter((t) => t.is_active)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((team) => (
                          <MenuItem key={team.id} value={team.id}>
                            {team.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {t('portfolio:workspace.contributor.sections.projectAvailability')}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Slider
                    value={projectAvailability}
                    onChange={(_, v) => setProjectAvailability(v as number)}
                    min={0}
                    max={20}
                    step={0.5}
                    valueLabelDisplay="on"
                    disabled={!canEdit}
                    sx={{ flex: 1, maxWidth: 400 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                    {t('portfolio:workspace.contributor.values.daysPerMonth', {
                      count: projectAvailability,
                    })}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {canViewTime && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('portfolio:workspace.contributor.sections.timeStatistics')}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {t('portfolio:workspace.contributor.values.averageMonthlyProjectEffort', {
                      value: timeStats?.averageProjectDays ?? 0,
                    })}
                  </Typography>
                  {timeStats ? (
                    timeStats.monthly.length ? (
                      <ChartCard
                        title={t('portfolio:workspace.contributor.sections.monthlyEffort')}
                        height={280}
                        options={{
                          data: timeStats.monthly.map((m) => ({
                            month: formatMonth(m.yearMonth),
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
                      <Typography variant="body2" color="text.secondary">
                        {t('portfolio:workspace.contributor.states.noTimeData')}
                      </Typography>
                    )
                  ) : null}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {t('portfolio:workspace.contributor.sections.notes')}
                </Typography>
                <TextField
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  disabled={!canEdit}
                  placeholder={t('portfolio:workspace.contributor.placeholders.notes')}
                />
              </CardContent>
            </Card>
          </Stack>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {t('portfolio:workspace.contributor.sections.addSkill')}
                </Typography>
                <Autocomplete
                  options={availableSkills}
                  groupBy={(option) => option.category}
                  getOptionLabel={(option) => option.name}
                  value={null}
                  onChange={(_, v) => handleAddSkill(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={t('portfolio:workspace.contributor.placeholders.searchSkills')}
                    />
                  )}
                  disabled={!canEdit}
                  fullWidth
                />
              </CardContent>
            </Card>

            {selectedSkills.length === 0 && (
              <Alert severity="info">
                {t('portfolio:workspace.contributor.states.noSkills')}
              </Alert>
            )}

            {Object.keys(selectedSkillsByCategory).sort().map((category) => {
              const isExpanded = expandedCategories.has(category);
              const skillCount = selectedSkillsByCategory[category].length;

              return (
                <Card key={category}>
                  <Box
                    onClick={() => toggleCategory(category)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography variant="subtitle1">
                      {category}
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        {t('portfolio:workspace.contributor.values.skillCount', { count: skillCount })}
                      </Typography>
                    </Typography>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>

                  <Collapse in={isExpanded}>
                    <Stack spacing={2} sx={{ px: 2, pb: 2 }}>
                      {selectedSkillsByCategory[category].map((sp) => {
                        const skill = getSkillById(sp.skill_id);
                        if (!skill) return null;

                        return (
                          <Stack
                            key={sp.skill_id}
                            direction="row"
                            alignItems="center"
                            sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}
                          >
                            <Typography variant="body2" sx={{ width: 200, flexShrink: 0 }}>
                              {skill.name}
                            </Typography>

                            <Tooltip title={proficiencyLabels[sp.proficiency]} placement="top">
                              <Box sx={{ width: 300, flexShrink: 0, mx: 2 }}>
                                <Slider
                                  value={sp.proficiency}
                                  onChange={(_, v) => handleProficiencyChange(sp.skill_id, v as number)}
                                  min={0}
                                  max={4}
                                  step={1}
                                  marks={PROFICIENCY_MARKS}
                                  valueLabelDisplay="auto"
                                  valueLabelFormat={(v) => proficiencyLabels[v]}
                                  disabled={!canEdit}
                                />
                              </Box>
                            </Tooltip>

                            <Box sx={{ flex: 1 }} />

                            {canEdit && (
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveSkill(sp.skill_id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Collapse>
                </Card>
              );
            })}
          </Stack>
        )}

        {activeTab === 'defaults' && (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {t('portfolio:workspace.contributor.sections.classificationDefaults')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('portfolio:workspace.contributor.sections.classificationDefaultsHelp')}
                </Typography>
                <Stack spacing={2} sx={{ maxWidth: 480 }}>
                  <EnumAutocomplete
                    label={t('portfolio:workspace.contributor.fields.source')}
                    value={defaultSourceId}
                    onChange={(value) => setDefaultSourceId(value)}
                    options={sources.map((source) => ({ value: source.id, label: source.name }))}
                    disabled={!canEdit}
                  />
                  <EnumAutocomplete
                    label={t('portfolio:workspace.contributor.fields.category')}
                    value={defaultCategoryId}
                    onChange={handleDefaultCategoryChange}
                    options={categories.map((category) => ({ value: category.id, label: category.name }))}
                    disabled={!canEdit}
                  />
                  <EnumAutocomplete
                    label={t('portfolio:workspace.contributor.fields.stream')}
                    value={defaultStreamId}
                    onChange={(value) => setDefaultStreamId(value)}
                    options={filteredDefaultStreams.map((stream) => ({ value: stream.id, label: stream.name }))}
                    disabled={!canEdit || !defaultCategoryId}
                  />
                  <CompanySelect
                    label={t('portfolio:workspace.contributor.fields.company')}
                    value={defaultCompanyId}
                    onChange={(value) => setDefaultCompanyId(value)}
                    disabled={!canEdit}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}

        {activeTab === 'time-logged' && member?.id && <ContributorTimeLog contributorId={member.id} />}
      </Box>
    </>
  );
}
