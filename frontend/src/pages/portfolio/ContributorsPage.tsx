import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Stack, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PageHeader from '../../components/PageHeader';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { MONO_FONT_FAMILY } from '../../config/ThemeContext';
import {
  compactSelectMenuProps, drawerAutocompleteListboxSx, drawerFieldValueSx, drawerMenuItemSx, pageSelectSx,
} from '../../theme/formSx';
import { groupContributorsByTeam, sortGroupIds, UNASSIGNED_GROUP } from './contributorsOrdering';
import { buildItemPath, formatItemRef } from '../../utils/item-ref';

interface Contributor {
  id: string;
  item_number: number;
  user_id: string;
  user_display_name: string;
  user_email: string;
  areas_of_expertise: string[];
  skills: { skill_id: string; proficiency: number }[];
  project_availability: number;
  notes?: string;
  team_id?: string | null;
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

const contributorPath = (contributor: Contributor) => (
  buildItemPath('contributor', formatItemRef('contributor', contributor.item_number))
);

const statSx = {
  fontFamily: MONO_FONT_FAMILY,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
} as const;

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
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['portfolio-contributors'],
    queryFn: async () => {
      const res = await api.get('/portfolio/team-members');
      return (res.data?.items || []) as Contributor[];
    },
  });

  const { data: teamsData } = useQuery({
    queryKey: ['portfolio-teams'],
    queryFn: async () => {
      const res = await api.get('/portfolio/teams');
      return (res.data || []) as Team[];
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
      return (res.data?.items || []) as User[];
    },
    enabled: addDialogOpen,
  });

  const contributors = data || [];
  const teams = teamsData || [];

  const getTeamName = useCallback((groupId: string) => {
    if (groupId === UNASSIGNED_GROUP) return t('contributors.filters.unassigned');
    return teams.find((team) => team.id === groupId)?.name || t('contributors.teams.unknown');
  }, [t, teams]);

  const groups = useMemo(() => {
    const grouped = groupContributorsByTeam(contributors, teams);
    const visibleIds = filterTeamId === 'all'
      ? Object.keys(grouped)
      : [filterTeamId].filter((id) => grouped[id]);
    return sortGroupIds(visibleIds, getTeamName)
      .map((groupId) => ({ groupId, members: grouped[groupId] || [] }))
      // Filtering to one team shows it even when empty; "All teams" hides empty ones.
      .filter(({ members }) => filterTeamId !== 'all' || members.length > 0);
  }, [contributors, filterTeamId, getTeamName, teams]);

  // Users without a config yet, sorted by name (email only as a degraded fallback).
  const availableUsers = useMemo(() => {
    if (!allUsers || !data) return [];
    const existingUserIds = new Set(data.map((m) => m.user_id));
    return allUsers
      .filter((u) => !existingUserIds.has(u.id))
      .sort((a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email));
  }, [allUsers, data]);

  const toggleTeam = useCallback((groupId: string) => {
    setCollapsedTeams((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const handleAdd = useCallback(async () => {
    if (!selectedUser) return;
    setAdding(true);
    setError(null);
    try {
      const res = await api.post('/portfolio/team-members', { user_id: selectedUser.id });
      setAddDialogOpen(false);
      setSelectedUser(null);
      refetch();
      navigate(buildItemPath('contributor', formatItemRef('contributor', res.data.item_number)));
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('contributors.messages.addFailed')));
    } finally {
      setAdding(false);
    }
  }, [navigate, refetch, selectedUser, t]);

  const actions = canEdit ? (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
      {t('contributors.actions.addContributor')}
    </Button>
  ) : null;

  return (
    <>
      <PageHeader title={t('contributors.title')} actions={actions} />

      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 3 }}>
          <TextField
            select
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
            variant="standard"
            size="small"
            aria-label={t('contributors.filters.team')}
            sx={{ ...pageSelectSx, width: 260 }}
            SelectProps={{ MenuProps: compactSelectMenuProps }}
          >
            <MenuItem value="all" sx={drawerMenuItemSx}>{t('contributors.filters.allTeams')}</MenuItem>
            {teams
              .filter((team) => team.is_active)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) => (
                <MenuItem key={team.id} value={team.id} sx={drawerMenuItemSx}>
                  {team.name}
                </MenuItem>
              ))}
            <MenuItem value={UNASSIGNED_GROUP} sx={drawerMenuItemSx}>{t('contributors.filters.unassigned')}</MenuItem>
          </TextField>
        </Box>

        {!isLoading && contributors.length === 0 && (
          <Box sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.tertiary })}>
            {t('contributors.states.empty')}
          </Box>
        )}

        <Stack spacing={2.5} sx={{ maxWidth: 900 }}>
          {groups.map(({ groupId, members }) => {
            const isExpanded = !collapsedTeams[groupId];
            return (
              <Box key={groupId}>
                <Box
                  onClick={() => toggleTeam(groupId)}
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    pb: '4px',
                    borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
                  })}
                >
                  <IconButton size="small" sx={{ p: '2px', ml: '-4px' }} aria-label={isExpanded ? t('contributors.actions.collapseTeam') : t('contributors.actions.expandTeam')}>
                    {isExpanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                  <Box component="span" sx={(theme) => ({ flex: 1, fontSize: 13, fontWeight: 500, color: theme.palette.kanap.text.primary })}>
                    {getTeamName(groupId)}
                  </Box>
                  <Box component="span" sx={(theme) => ({ ...statSx, color: theme.palette.kanap.text.tertiary })}>
                    {members.length}
                  </Box>
                </Box>

                {isExpanded && members.map((contributor) => (
                  <Box
                    key={contributor.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(contributorPath(contributor))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(contributorPath(contributor));
                      }
                    }}
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      minHeight: 36,
                      px: '8px',
                      mx: '-8px',
                      borderRadius: '5px',
                      borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
                      cursor: 'pointer',
                      '&:hover, &:focus-visible': { bgcolor: theme.palette.kanap.bg.hover, outline: 'none' },
                    })}
                  >
                    <Box component="span" sx={(theme) => ({ flex: 1, minWidth: 0, fontSize: 13, color: theme.palette.kanap.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                      {contributor.user_display_name || contributor.user_email}
                    </Box>
                    <Box component="span" sx={(theme) => ({ fontSize: 12, color: theme.palette.kanap.text.secondary, whiteSpace: 'nowrap' })}>
                      {t('contributors.cards.skillCount', { count: contributor.skills?.length || 0 })}
                    </Box>
                    <Box component="span" sx={(theme) => ({ ...statSx, color: theme.palette.kanap.text.secondary, minWidth: 64, textAlign: 'right' })}>
                      {t('contributors.cards.daysPerMonth', { count: Number(contributor.project_availability ?? 5) })}
                    </Box>
                    <Box component="span" sx={(theme) => ({ ...statSx, color: theme.palette.kanap.text.tertiary, minWidth: 90, textAlign: 'right' })}>
                      {timeStatsData?.[contributor.id]
                        ? t('contributors.cards.avgDaysPerMonth', { count: timeStatsData[contributor.id].avgProjectDays })
                        : ''}
                    </Box>
                  </Box>
                ))}
              </Box>
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
              ListboxProps={{ sx: drawerAutocompleteListboxSx }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>{option.display_name || option.email}</li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  label={t('contributors.dialog.selectUser')}
                  placeholder={t('contributors.dialog.searchUsers')}
                  sx={drawerFieldValueSx}
                />
              )}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t('common:buttons.cancel')}</Button>
          <Button variant="contained" onClick={handleAdd} disabled={adding || !selectedUser}>
            {adding ? t('contributors.dialog.adding') : t('common:buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
