import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Collapse, FormControl, IconButton,
  InputLabel, MenuItem, Select, Slider, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PageHeader from '../../components/PageHeader';
import ChartCard from '../../components/reports/ChartCard';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';

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

const PROFICIENCY_LABELS: Record<number, string> = {
  0: 'No knowledge',
  1: 'Basic / Theoretical',
  2: 'Can execute with support',
  3: 'Autonomous',
  4: 'Expert',
};

const PROFICIENCY_MARKS = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
];

const formatMonth = (yearMonth: string) => {
  const date = new Date(`${yearMonth}T00:00:00Z`);
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export default function ContributorWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasLevel } = useAuth();
  const canEdit = hasLevel('portfolio_settings', 'member');
  const canDelete = hasLevel('portfolio_settings', 'admin');

  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [projectAvailability, setProjectAvailability] = useState(5);
  const [notes, setNotes] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<SkillProficiency[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch contributor
  const { data: member, isLoading } = useQuery({
    queryKey: ['portfolio-contributor', id],
    queryFn: async () => {
      const res = await api.get(`/portfolio/team-members/${id}`);
      return res.data as ContributorConfig;
    },
    enabled: !!id,
  });

  const { data: timeStats } = useQuery({
    queryKey: ['contributor-time-stats', id],
    queryFn: async () => {
      const res = await api.get(`/portfolio/team-members/${id}/time-stats`);
      return res.data as TimeStats;
    },
    enabled: !!id,
  });

  // Fetch teams
  const { data: teamsData } = useQuery({
    queryKey: ['portfolio-teams'],
    queryFn: async () => {
      const res = await api.get('/portfolio/teams');
      return res.data as Team[];
    },
  });

  const teams = teamsData || [];

  // Fetch all skills
  const { data: skillsData } = useQuery({
    queryKey: ['portfolio-skills'],
    queryFn: async () => {
      const res = await api.get('/portfolio/skills');
      return res.data as { items: Skill[]; grouped: Record<string, Skill[]> };
    },
  });

  const allSkills = skillsData?.items || [];

  // Initialize form from member data
  useEffect(() => {
    if (member) {
      // project_availability comes as string from DB numeric column - convert to number
      setProjectAvailability(Number(member.project_availability) || 5);
      setNotes(member.notes || '');
      setTeamId(member.team_id || '');
      setSelectedSkills(member.skills || []);
    }
  }, [member]);

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
    if (!id) return;
    setSaving(true);
    setError(null);

    try {
      await api.patch(`/portfolio/team-members/${id}`, {
        project_availability: projectAvailability,
        notes: notes || null,
        team_id: teamId || null,
        skills: selectedSkills,
      });
      queryClient.invalidateQueries({ queryKey: ['portfolio-contributor', id] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-contributors'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-teams'] });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [id, projectAvailability, notes, teamId, selectedSkills, queryClient]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!confirm('Remove this contributor configuration?')) return;

    try {
      await api.delete(`/portfolio/team-members/${id}`);
      queryClient.invalidateQueries({ queryKey: ['portfolio-contributors'] });
      navigate('/portfolio/contributors');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete');
    }
  }, [id, navigate, queryClient]);

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
    return <Typography>Loading...</Typography>;
  }

  if (!member) {
    return <Typography>Contributor not found</Typography>;
  }

  const actions = (
    <Stack direction="row" spacing={1}>
      <IconButton onClick={() => navigate('/portfolio/contributors')} title="Back to list">
        <ArrowBackIcon />
      </IconButton>
      {canEdit && (
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      )}
      {canDelete && (
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
        >
          Delete
        </Button>
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader
        title={member.user_display_name || member.user_email}
        breadcrumbTitle={member.user_display_name || member.user_email}
        actions={actions}
      />

      <Box sx={{ p: 3, maxWidth: 1000 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab label="General" />
          <Tab label="Skills" />
        </Tabs>

        {/* General Tab */}
        {activeTab === 0 && (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Team</Typography>
                <FormControl fullWidth size="small" sx={{ maxWidth: 400 }}>
                  <InputLabel>Assign to Team</InputLabel>
                  <Select
                    value={teamId}
                    label="Assign to Team"
                    onChange={(e) => setTeamId(e.target.value)}
                    disabled={!canEdit}
                  >
                    <MenuItem value="">
                      <em>Unassigned</em>
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

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Project Availability (days per month)
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
                    {projectAvailability} days/month
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Time Statistics
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Average monthly project effort (last 6 months):{' '}
                  <strong>{timeStats?.averageProjectDays ?? 0} d/mo</strong>
                </Typography>
                {timeStats ? (
                  timeStats.monthly.length ? (
                    <ChartCard
                      title="Monthly Effort (12 months)"
                      height={280}
                      options={{
                        data: timeStats.monthly.map((m) => ({
                          month: formatMonth(m.yearMonth),
                          project: m.projectDays,
                          other: m.otherDays,
                          total: m.totalDays,
                        })),
                        series: [
                          { type: 'line', xKey: 'month', yKey: 'total', yName: 'Total' },
                          { type: 'line', xKey: 'month', yKey: 'project', yName: 'Project' },
                          { type: 'line', xKey: 'month', yKey: 'other', yName: 'Other' },
                        ],
                        axes: [
                          { type: 'category', position: 'bottom' },
                          { type: 'number', position: 'left', title: { text: 'Man-days' } },
                        ],
                        legend: { enabled: true, position: 'bottom' },
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No time data available yet.
                    </Typography>
                  )
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Notes</Typography>
                <TextField
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  disabled={!canEdit}
                  placeholder="Additional notes about this contributor..."
                />
              </CardContent>
            </Card>
          </Stack>
        )}

        {/* Skills Tab */}
        {activeTab === 1 && (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Add Skill</Typography>
                <Autocomplete
                  options={availableSkills}
                  groupBy={(option) => option.category}
                  getOptionLabel={(option) => option.name}
                  value={null}
                  onChange={(_, v) => handleAddSkill(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search skills..."
                    />
                  )}
                  disabled={!canEdit}
                  fullWidth
                />
              </CardContent>
            </Card>

            {selectedSkills.length === 0 && (
              <Alert severity="info">
                No skills selected. Use the field above to add skills.
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
                        ({skillCount} skill{skillCount !== 1 ? 's' : ''})
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

                            <Tooltip title={PROFICIENCY_LABELS[sp.proficiency]} placement="top">
                              <Box sx={{ width: 300, flexShrink: 0, mx: 2 }}>
                                <Slider
                                  value={sp.proficiency}
                                  onChange={(_, v) => handleProficiencyChange(sp.skill_id, v as number)}
                                  min={0}
                                  max={4}
                                  step={1}
                                  marks={PROFICIENCY_MARKS}
                                  valueLabelDisplay="auto"
                                  valueLabelFormat={(v) => PROFICIENCY_LABELS[v]}
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
      </Box>
    </>
  );
}
