import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Collapse, IconButton,
  Slider, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
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

interface TeamMemberConfig {
  id: string;
  user_id: string;
  user_display_name: string;
  user_email: string;
  areas_of_expertise: string[];
  skills: SkillProficiency[];
  project_availability: number;
  notes?: string;
}

const PROFICIENCY_MARKS = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
];

export default function TeamMemberWorkspacePage() {
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasLevel } = useAuth();
  const canEdit = hasLevel('portfolio_settings', 'admin');

  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [projectAvailability, setProjectAvailability] = useState(5);
  const [notes, setNotes] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<SkillProficiency[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const proficiencyLabels = useMemo<Record<number, string>>(() => ({
    0: t('portfolio:workspace.teamMember.proficiency.0'),
    1: t('portfolio:workspace.teamMember.proficiency.1'),
    2: t('portfolio:workspace.teamMember.proficiency.2'),
    3: t('portfolio:workspace.teamMember.proficiency.3'),
    4: t('portfolio:workspace.teamMember.proficiency.4'),
  }), [t]);

  // Fetch team member
  const { data: member, isLoading } = useQuery({
    queryKey: ['portfolio-team-member', id],
    queryFn: async () => {
      const res = await api.get(`/portfolio/team-members/${id}`);
      return res.data as TeamMemberConfig;
    },
    enabled: !!id,
  });

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
        skills: selectedSkills,
      });
      queryClient.invalidateQueries({ queryKey: ['portfolio-team-member', id] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-team-members'] });
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('portfolio:workspace.teamMember.messages.saveFailed')));
    } finally {
      setSaving(false);
    }
  }, [id, projectAvailability, notes, selectedSkills, queryClient, t]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!confirm(t('portfolio:workspace.teamMember.confirmations.remove'))) return;

    try {
      await api.delete(`/portfolio/team-members/${id}`);
      queryClient.invalidateQueries({ queryKey: ['portfolio-team-members'] });
      navigate('/portfolio/team-members');
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('portfolio:workspace.teamMember.messages.deleteFailed')));
    }
  }, [id, navigate, queryClient, t]);

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

  if (!member) {
    return <Typography>{t('portfolio:workspace.teamMember.states.notFound')}</Typography>;
  }

  const actions = (
    <Stack direction="row" spacing={1}>
      <IconButton
        onClick={() => navigate('/portfolio/team-members')}
        title={t('portfolio:workspace.teamMember.actions.backToList')}
      >
        <ArrowBackIcon />
      </IconButton>
      {canEdit && (
        <>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t('common:status.saving') : t('common:buttons.save')}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleDelete}
          >
            {t('common:buttons.delete')}
          </Button>
        </>
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
          <Tab label={t('portfolio:workspace.teamMember.tabs.general')} />
          <Tab label={t('portfolio:workspace.teamMember.tabs.skills')} />
        </Tabs>

        {/* General Tab */}
        {activeTab === 0 && (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {t('portfolio:workspace.teamMember.sections.projectAvailability')}
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
                    {t('portfolio:workspace.teamMember.values.daysPerMonth', {
                      count: projectAvailability,
                    })}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {t('portfolio:workspace.teamMember.sections.notes')}
                </Typography>
                <TextField
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  disabled={!canEdit}
                  placeholder={t('portfolio:workspace.teamMember.placeholders.notes')}
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
                <Typography variant="subtitle2" gutterBottom>
                  {t('portfolio:workspace.teamMember.sections.addSkill')}
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
                      placeholder={t('portfolio:workspace.teamMember.placeholders.searchSkills')}
                    />
                  )}
                  disabled={!canEdit}
                  fullWidth
                />
              </CardContent>
            </Card>

            {selectedSkills.length === 0 && (
              <Alert severity="info">
                {t('portfolio:workspace.teamMember.states.noSkills')}
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
                        {t('portfolio:workspace.teamMember.values.skillCount', { count: skillCount })}
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
      </Box>
    </>
  );
}
