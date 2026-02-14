import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  business_phone: string | null;
  mobile_phone: string | null;
}

interface ContributorConfig {
  id: string;
  user_id: string;
}

export default function ProfileTab() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch current user profile from /auth/me
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-profile-me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.profile as UserProfile | undefined;
    },
  });

  // Check if user is a contributor
  const { data: contributorData } = useQuery({
    queryKey: ['contributor-check', profile?.id],
    queryFn: async () => {
      const res = await api.get('/portfolio/team-members', {
        params: { user_id: profile?.id },
      });
      const items = res.data?.items || [];
      // Find the contributor config for the current user
      return items.find((c: ContributorConfig) => c.user_id === profile?.id) as ContributorConfig | undefined;
    },
    enabled: !!profile?.id,
  });

  // Initialize form from user data
  useEffect(() => {
    if (userData) {
      setFirstName(userData.first_name || '');
      setLastName(userData.last_name || '');
      setJobTitle(userData.job_title || '');
      setBusinessPhone(userData.business_phone || '');
      setMobilePhone(userData.mobile_phone || '');
    }
  }, [userData]);

  const handleSave = useCallback(async () => {
    if (!userData?.id) return;
    setSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      await api.patch(`/users/${userData.id}`, {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        job_title: jobTitle.trim() || null,
        business_phone: businessPhone.trim() || null,
        mobile_phone: mobilePhone.trim() || null,
      });
      setSuccessMessage('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-profile-me'] });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [userData?.id, firstName, lastName, jobTitle, businessPhone, mobilePhone, queryClient]);

  const handleReset = useCallback(() => {
    if (userData) {
      setFirstName(userData.first_name || '');
      setLastName(userData.last_name || '');
      setJobTitle(userData.job_title || '');
      setBusinessPhone(userData.business_phone || '');
      setMobilePhone(userData.mobile_phone || '');
    }
    setSuccessMessage('');
    setError(null);
  }, [userData]);

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Account Information
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Email: {userData?.email}
          </Typography>

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
              />
            </Stack>

            <TextField
              label="Job Title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Business Phone"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                fullWidth
                placeholder="+1 (555) 123-4567"
              />
              <TextField
                label="Mobile Phone"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
                fullWidth
                placeholder="+1 (555) 987-6543"
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outlined" onClick={handleReset} disabled={saving}>
          Reset
        </Button>
      </Stack>

      {contributorData && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Portfolio Contributor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You are registered as a contributor in the portfolio management system.
              View your contributor profile to manage your skills and availability.
            </Typography>
            <Box>
              <Link
                component={RouterLink}
                to={`/portfolio/contributors/${contributorData.id}`}
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                View Contributor Profile
                <ArrowForwardIcon fontSize="small" />
              </Link>
            </Box>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
