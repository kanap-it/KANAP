import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import api from '../../api';

interface WorkspaceSettings {
  portfolio: {
    enabled: boolean;
    status_changes: boolean;
    team_additions: boolean;
    team_changes_as_lead: boolean;
    comments: boolean;
  };
  tasks: {
    enabled: boolean;
    as_assignee: boolean;
    as_requestor: boolean;
    as_viewer: boolean;
    status_changes: boolean;
    comments: boolean;
  };
  budget: {
    enabled: boolean;
    expiration_warnings: boolean;
    status_changes: boolean;
    comments: boolean;
  };
}

interface NotificationPreferencesData {
  emails_enabled: boolean;
  workspace_settings: WorkspaceSettings;
  weekly_review_enabled: boolean;
  weekly_review_day: number;
  weekly_review_hour: number;
  timezone: string;
}

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

const COMMON_TIMEZONES = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Zurich',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

export default function NotificationsTab() {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPreferencesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTestEmail = useCallback(async () => {
    setSendingTest(true);
    setError(null);
    try {
      const res = await api.post('/users/me/notification-preferences/test-weekly-review');
      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Test email sent!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(res.data?.message || 'Failed to send test email');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  }, []);

  // Fetch current preferences
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await api.get('/users/me/notification-preferences');
      return res.data as NotificationPreferencesData;
    },
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (data) {
      setPrefs(data);
    }
  }, [data]);

  // Debounced save function
  const debouncedSave = useCallback(
    (updates: Partial<NotificationPreferencesData>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        setError(null);
        try {
          await api.patch('/users/me/notification-preferences', updates);
          queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
        } catch (e: any) {
          setError(e?.response?.data?.message || 'Failed to save preferences');
        }
      }, 500);
    },
    [queryClient]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const updatePrefs = useCallback(
    (updates: Partial<NotificationPreferencesData>) => {
      setPrefs((prev) => {
        if (!prev) return prev;
        const newPrefs = { ...prev, ...updates };
        debouncedSave(updates);
        return newPrefs;
      });
    },
    [debouncedSave]
  );

  const updateWorkspaceSettings = useCallback(
    (
      workspace: keyof WorkspaceSettings,
      field: string,
      value: boolean
    ) => {
      setPrefs((prev) => {
        if (!prev) return prev;
        const newWorkspaceSettings = {
          ...prev.workspace_settings,
          [workspace]: {
            ...prev.workspace_settings[workspace],
            [field]: value,
          },
        };
        const updates = { workspace_settings: newWorkspaceSettings };
        debouncedSave(updates);
        return { ...prev, workspace_settings: newWorkspaceSettings };
      });
    },
    [debouncedSave]
  );

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (isError || !prefs) {
    return (
      <Alert severity="error">
        Failed to load notification preferences. Please refresh the page.
      </Alert>
    );
  }

  const emailsEnabled = prefs.emails_enabled;

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ opacity: 0.9 }}>
          {successMessage}
        </Alert>
      )}

      {/* Master Toggle */}
      <Card>
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={prefs.emails_enabled}
                onChange={(e) => updatePrefs({ emails_enabled: e.target.checked })}
              />
            }
            label={
              <Box>
                <Typography variant="subtitle1">Email Notifications</Typography>
                <Typography variant="body2" color="text.secondary">
                  Receive email notifications for updates and activity
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* Workspace Notifications */}
      <Collapse in={emailsEnabled}>
        <Stack spacing={2}>
          {/* Portfolio Section */}
          <Card>
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.workspace_settings.portfolio.enabled}
                    onChange={(e) =>
                      updateWorkspaceSettings('portfolio', 'enabled', e.target.checked)
                    }
                  />
                }
                label={
                  <Typography variant="subtitle1">Portfolio Notifications</Typography>
                }
              />
              <Collapse in={prefs.workspace_settings.portfolio.enabled}>
                <Stack spacing={1} sx={{ ml: 4, mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.portfolio.status_changes}
                        onChange={(e) =>
                          updateWorkspaceSettings('portfolio', 'status_changes', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Status changes</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.portfolio.team_additions}
                        onChange={(e) =>
                          updateWorkspaceSettings('portfolio', 'team_additions', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">When I'm added to a team</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.portfolio.team_changes_as_lead ?? true}
                        onChange={(e) =>
                          updateWorkspaceSettings('portfolio', 'team_changes_as_lead', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Team changes on items I lead</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.portfolio.comments}
                        onChange={(e) =>
                          updateWorkspaceSettings('portfolio', 'comments', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Comments</Typography>
                    }
                  />
                </Stack>
              </Collapse>
            </CardContent>
          </Card>

          {/* Tasks Section */}
          <Card>
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.workspace_settings.tasks.enabled}
                    onChange={(e) =>
                      updateWorkspaceSettings('tasks', 'enabled', e.target.checked)
                    }
                  />
                }
                label={
                  <Typography variant="subtitle1">Task Notifications</Typography>
                }
              />
              <Collapse in={prefs.workspace_settings.tasks.enabled}>
                <Stack spacing={1} sx={{ ml: 4, mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Notify me when I am:
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.tasks.as_assignee}
                        onChange={(e) =>
                          updateWorkspaceSettings('tasks', 'as_assignee', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Assigned to a task</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.tasks.as_requestor}
                        onChange={(e) =>
                          updateWorkspaceSettings('tasks', 'as_requestor', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Requestor of a task</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.tasks.as_viewer}
                        onChange={(e) =>
                          updateWorkspaceSettings('tasks', 'as_viewer', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Stack>
                        <Typography variant="body2">Viewer of a task</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Can be noisy - off by default
                        </Typography>
                      </Stack>
                    }
                  />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Event types:
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.tasks.status_changes}
                        onChange={(e) =>
                          updateWorkspaceSettings('tasks', 'status_changes', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Status changes</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.tasks.comments}
                        onChange={(e) =>
                          updateWorkspaceSettings('tasks', 'comments', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Comments</Typography>
                    }
                  />
                </Stack>
              </Collapse>
            </CardContent>
          </Card>

          {/* Budget Section */}
          <Card>
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.workspace_settings.budget.enabled}
                    onChange={(e) =>
                      updateWorkspaceSettings('budget', 'enabled', e.target.checked)
                    }
                  />
                }
                label={
                  <Typography variant="subtitle1">Budget Notifications</Typography>
                }
              />
              <Collapse in={prefs.workspace_settings.budget.enabled}>
                <Stack spacing={1} sx={{ ml: 4, mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.budget.expiration_warnings}
                        onChange={(e) =>
                          updateWorkspaceSettings('budget', 'expiration_warnings', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Expiration warnings</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.budget.status_changes}
                        onChange={(e) =>
                          updateWorkspaceSettings('budget', 'status_changes', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Status changes</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={prefs.workspace_settings.budget.comments}
                        onChange={(e) =>
                          updateWorkspaceSettings('budget', 'comments', e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">Comments</Typography>
                    }
                  />
                </Stack>
              </Collapse>
            </CardContent>
          </Card>

          {/* Weekly Review Section */}
          <Card>
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.weekly_review_enabled}
                    onChange={(e) => updatePrefs({ weekly_review_enabled: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1">Weekly Review Email</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive a summary of your activity and upcoming items
                    </Typography>
                  </Box>
                }
              />
              <Collapse in={prefs.weekly_review_enabled}>
                <Stack spacing={2} sx={{ ml: 4, mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Day</InputLabel>
                      <Select
                        value={prefs.weekly_review_day}
                        label="Day"
                        onChange={(e) =>
                          updatePrefs({ weekly_review_day: e.target.value as number })
                        }
                      >
                        {DAY_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Time</InputLabel>
                      <Select
                        value={prefs.weekly_review_hour}
                        label="Time"
                        onChange={(e) =>
                          updatePrefs({ weekly_review_hour: e.target.value as number })
                        }
                      >
                        {HOUR_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <FormControl size="small" sx={{ maxWidth: 240 }}>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={prefs.timezone}
                      label="Timezone"
                      onChange={(e) => updatePrefs({ timezone: e.target.value })}
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <MenuItem key={tz} value={tz}>
                          {tz.replace(/_/g, ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SendIcon />}
                    onClick={sendTestEmail}
                    disabled={sendingTest}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {sendingTest ? 'Sending...' : 'Preview email'}
                  </Button>
                </Stack>
              </Collapse>
            </CardContent>
          </Card>
        </Stack>
      </Collapse>
    </Stack>
  );
}
