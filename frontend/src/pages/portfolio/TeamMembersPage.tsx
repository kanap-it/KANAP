import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardActionArea, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Autocomplete, TextField, Stack, Alert, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../../components/PageHeader';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';

interface TeamMember {
  id: string;
  user_id: string;
  user_display_name: string;
  user_email: string;
  areas_of_expertise: string[];
  skills: { skill_id: string; proficiency: number }[];
  project_availability: number;
  notes?: string;
}

interface User {
  id: string;
  display_name: string;
  email: string;
}

export default function TeamMembersPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const canEdit = hasLevel('portfolio_settings', 'admin');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['portfolio-team-members'],
    queryFn: async () => {
      const res = await api.get('/portfolio/team-members');
      return res.data?.items || [];
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users-for-team-member-select'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { limit: 1000 } });
      return res.data?.items || [];
    },
    enabled: addDialogOpen,
  });

  // Filter out users that already have a config
  const availableUsers = useMemo(() => {
    if (!allUsers || !data) return [];
    const existingUserIds = new Set((data as TeamMember[]).map((m) => m.user_id));
    return (allUsers as User[]).filter((u) => !existingUserIds.has(u.id));
  }, [allUsers, data]);

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
      navigate(`/portfolio/team-members/${res.data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to add team member');
    } finally {
      setAdding(false);
    }
  }, [selectedUser, refetch, navigate]);

  const handleRowClick = useCallback((member: TeamMember) => {
    navigate(`/portfolio/team-members/${member.id}`);
  }, [navigate]);

  const teamMembers = (data || []) as TeamMember[];

  const actions = canEdit ? (
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
      Add Team Member
    </Button>
  ) : null;

  return (
    <>
      <PageHeader title="Team Members" actions={actions} />

      <Box sx={{ p: 2 }}>
        {isLoading && <Typography>Loading...</Typography>}

        {!isLoading && teamMembers.length === 0 && (
          <Alert severity="info">
            No team members configured yet. Add team members to define their skills and availability.
          </Alert>
        )}

        <Stack spacing={2} sx={{ maxWidth: 800 }}>
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardActionArea onClick={() => handleRowClick(member)}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">
                        {member.user_display_name || member.user_email}
                      </Typography>
                      {member.user_display_name && (
                        <Typography variant="body2" color="text.secondary">
                          {member.user_email}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={`${member.skills?.length || 0} skill(s)`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${member.project_availability ?? 5} days/mo`}
                      size="small"
                      color="primary"
                    />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Box>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
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
                  label="Select User"
                  placeholder="Search users..."
                />
              )}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={adding || !selectedUser}
          >
            {adding ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
