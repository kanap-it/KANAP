import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Card, CardActionArea, CardContent, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Autocomplete, TextField, Stack, Alert, Typography,
  IconButton, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PageHeader from '../../components/PageHeader';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

interface Contributor {
  id: string;
  user_id: string;
  user_display_name: string;
  user_email: string;
  areas_of_expertise: string[];
  skills: { skill_id: string; proficiency: number }[];
  project_availability: number;
  notes?: string;
  team_id?: string;
  team_name?: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  member_count: number;
}

interface User {
  id: string;
  display_name: string;
  email: string;
}

interface ContributorTimeStats {
  avgProjectDays: number;
  avgTotalDays: number;
}

export default function ContributorsPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const canEdit = hasLevel('portfolio_settings', 'member');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['portfolio-contributors'],
    queryFn: async () => {
      const res = await api.get('/portfolio/team-members');
      return res.data?.items || [];
    },
  });

  const { data: teamsData } = useQuery({
    queryKey: ['portfolio-teams'],
    queryFn: async () => {
      const res = await api.get('/portfolio/teams');
      return res.data || [];
    },
  });

  const { data: timeStatsData } = useQuery({
    queryKey: ['portfolio-contributors-time-stats'],
    queryFn: async () => {
      const res = await api.get('/portfolio/team-members/time-stats');
      return (res.data?.stats || {}) as Record<string, ContributorTimeStats>;
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users-for-contributor-select'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { limit: 1000 } });
      return res.data?.items || [];
    },
    enabled: addDialogOpen,
  });

  const contributors = (data || []) as Contributor[];
  const teams = (teamsData || []) as Team[];

  // Group contributors by team
  const groupedContributors = useMemo(() => {
    const groups: Record<string, Contributor[]> = {};

    // Initialize groups with team IDs
    for (const team of teams) {
      groups[team.id] = [];
    }
    groups['unassigned'] = [];

    for (const c of contributors) {
      if (c.team_id && groups[c.team_id]) {
        groups[c.team_id].push(c);
      } else {
        groups['unassigned'].push(c);
      }
    }

    return groups;
  }, [contributors, teams]);

  // Filter based on selected team
  const filteredGroups = useMemo(() => {
    if (filterTeamId === 'all') {
      return groupedContributors;
    }
    if (filterTeamId === 'unassigned') {
      return { unassigned: groupedContributors['unassigned'] };
    }
    return { [filterTeamId]: groupedContributors[filterTeamId] || [] };
  }, [groupedContributors, filterTeamId]);

  // Filter out users that already have a config, sorted alphabetically
  const availableUsers = useMemo(() => {
    if (!allUsers || !data) return [];
    const existingUserIds = new Set((data as Contributor[]).map((m) => m.user_id));
    return (allUsers as User[])
      .filter((u) => !existingUserIds.has(u.id))
      .sort((a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email));
  }, [allUsers, data]);

  const toggleTeam = useCallback((teamId: string) => {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  }, []);

  const handleAdd = useCallback(async () => {
    if (!selectedUser) return;
    setAdding(true);
    setError(null);

    try {
      const res = await api.post('/portfolio/team-members', {
        user_id: selectedUser.id,
      });
      setAddDialogOpen(false);
      setSelectedUser(null);
      refetch();
      navigate(`/portfolio/contributors/${res.data.id}`);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('contributors.messages.addFailed')));
    } finally {
      setAdding(false);
    }
  }, [navigate, refetch, selectedUser, t]);

  const handleRowClick = useCallback((contributor: Contributor) => {
    navigate(`/portfolio/contributors/${contributor.id}`);
  }, [navigate]);

  const actions = canEdit ? (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
      {t('contributors.actions.addContributor')}
    </Button>
  ) : null;

  const getTeamName = (teamId: string) => {
    if (teamId === 'unassigned') return t('contributors.filters.unassigned');
    return teams.find((team) => team.id === teamId)?.name || t('contributors.teams.unknown');
  };

  return (
    <>
      <PageHeader title={t('contributors.title')} actions={actions} />

      <Box sx={{ p: 2 }}>
        {/* Filter */}
        <Box sx={{ mb: 3, maxWidth: 300 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('contributors.filters.team')}</InputLabel>
            <Select
              value={filterTeamId}
              label={t('contributors.filters.team')}
              onChange={(e) => setFilterTeamId(e.target.value)}
            >
              <MenuItem value="all">{t('contributors.filters.allTeams')}</MenuItem>
              {teams
                .filter((t) => t.is_active)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              <MenuItem value="unassigned">{t('contributors.filters.unassigned')}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {isLoading && <Typography>{t('common:status.loading')}</Typography>}

        {!isLoading && contributors.length === 0 && (
          <Alert severity="info">
            {t('contributors.states.empty')}
          </Alert>
        )}

        <Stack spacing={2} sx={{ maxWidth: 900 }}>
          {Object.entries(filteredGroups)
            .sort(([aId], [bId]) => {
              // Unassigned always goes last
              if (aId === 'unassigned') return 1;
              if (bId === 'unassigned') return -1;
              // Sort alphabetically by team name
              return getTeamName(aId).localeCompare(getTeamName(bId));
            })
            .map(([teamId, members]) => {
            // Skip empty groups when filtering
            if (filterTeamId !== 'all' && members.length === 0) return null;

            const isExpanded = expandedTeams[teamId] !== false; // Default to expanded
            const teamName = getTeamName(teamId);

            return (
              <Card key={teamId}>
                <CardContent sx={{ pb: isExpanded ? 2 : '16px !important' }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => toggleTeam(teamId)}
                  >
                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                    <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: 0.5 }}>
                      {teamName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {members.length}
                    </Typography>
                  </Stack>

                  <Collapse in={isExpanded}>
                    <Stack spacing={1} sx={{ mt: members.length > 0 ? 2 : 0 }}>
                      {members.map((contributor) => (
                        <Card
                          key={contributor.id}
                          variant="outlined"
                          sx={{ ml: 4 }}
                        >
                          <CardActionArea onClick={() => handleRowClick(contributor)}>
                            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Typography variant="body2" sx={{ flex: 1 }}>
                                  {contributor.user_display_name || contributor.user_email}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {t('contributors.cards.skillCount', { count: contributor.skills?.length || 0 })}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {t('contributors.cards.daysPerMonth', { count: contributor.project_availability ?? 5 })}
                                </Typography>
                                {timeStatsData?.[contributor.id] && (
                                  <Typography variant="body2" color="text.secondary">
                                    {t('contributors.cards.avgDaysPerMonth', { count: timeStatsData[contributor.id].avgProjectDays })}
                                  </Typography>
                                )}
                              </Stack>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      ))}
                    </Stack>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Box>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('contributors.dialog.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Autocomplete
              options={availableUsers}
              getOptionLabel={(option: User) => option.display_name || option.email}
              value={selectedUser}
              onChange={(_, v) => setSelectedUser(v)}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    {option.display_name || option.email}
                    {option.display_name && (
                      <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                        ({option.email})
                      </Box>
                    )}
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('contributors.dialog.selectUser')}
                  placeholder={t('contributors.dialog.searchUsers')}
                />
              )}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t('common:buttons.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={adding || !selectedUser}
          >
            {adding ? t('contributors.dialog.adding') : t('common:buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
