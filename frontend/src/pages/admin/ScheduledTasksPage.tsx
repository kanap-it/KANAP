import React, { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Pagination,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../auth/AuthContext';
import { useFeatures } from '../../config/FeaturesContext';
import ForbiddenPage from '../ForbiddenPage';
import {
  fetchScheduledTasks,
  updateScheduledTask,
  triggerTask,
  fetchTaskRuns,
  type ScheduledTask,
  type ScheduledTaskRun,
} from '../../services/adminScheduledTasks';

// Human-readable cron descriptions for common patterns
const CRON_LABELS: Record<string, string> = {
  '0 * * * *': 'Every hour',
  '*/5 * * * *': 'Every 5 minutes',
  '*/15 * * * *': 'Every 15 minutes',
  '*/30 * * * *': 'Every 30 minutes',
  '0 0 * * *': 'Daily at midnight',
  '0 3 * * *': 'Daily at 3 AM',
  '0 8 * * *': 'Daily at 8 AM',
  '0 4 * * 0': 'Sundays at 4 AM',
  '0 0 * * 0': 'Sundays at midnight',
  '0 0 1 * *': '1st of month at midnight',
};

function humanCron(expr: string): string {
  return CRON_LABELS[expr] || expr;
}

function statusChip(status: string | null) {
  if (!status) return <Chip label="Never run" size="small" variant="outlined" />;
  switch (status) {
    case 'success':
      return <Chip label="Success" size="small" color="success" />;
    case 'failure':
      return <Chip label="Failed" size="small" color="error" />;
    case 'running':
      return <Chip label="Running" size="small" color="info" />;
    default:
      return <Chip label={status} size="small" />;
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString();
}

export default function ScheduledTasksPage() {
  const { claims } = useAuth();
  const { config } = useFeatures();
  const isSingleTenant = config.deploymentMode === 'single-tenant';
  const queryClient = useQueryClient();

  const canAccess = claims?.isPlatformAdmin || (isSingleTenant && claims?.isGlobalAdmin);
  if (!canAccess) return <ForbiddenPage />;

  return <ScheduledTasksContent />;
}

function ScheduledTasksContent() {
  const queryClient = useQueryClient();
  const [snack, setSnack] = useState<string | null>(null);
  const [editingCron, setEditingCron] = useState<string | null>(null);
  const [cronDraft, setCronDraft] = useState('');
  const [drawerTask, setDrawerTask] = useState<string | null>(null);
  const [runsPage, setRunsPage] = useState(1);

  const tasksQuery = useQuery({ queryKey: ['scheduled-tasks'], queryFn: fetchScheduledTasks, refetchInterval: 15_000 });

  const runsQuery = useQuery({
    queryKey: ['scheduled-task-runs', drawerTask, runsPage],
    queryFn: () => fetchTaskRuns(drawerTask!, runsPage),
    enabled: !!drawerTask,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) => updateScheduledTask(name, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] }),
  });

  const cronMutation = useMutation({
    mutationFn: ({ name, cron_expression }: { name: string; cron_expression: string }) =>
      updateScheduledTask(name, { cron_expression }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      setEditingCron(null);
      setSnack('Schedule updated');
    },
    onError: (err: any) => setSnack(err?.response?.data?.message || 'Invalid cron expression'),
  });

  const triggerMutation = useMutation({
    mutationFn: (name: string) => triggerTask(name),
    onSuccess: (_, name) => {
      setSnack(`Task '${name}' triggered`);
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
    },
  });

  if (tasksQuery.isLoading) {
    return (
      <Box>
        <PageHeader title="Scheduled Tasks" />
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      </Box>
    );
  }

  if (tasksQuery.isError) {
    return (
      <Box>
        <PageHeader title="Scheduled Tasks" />
        <Alert severity="error" sx={{ m: 2 }}>Failed to load scheduled tasks</Alert>
      </Box>
    );
  }

  const tasks = tasksQuery.data ?? [];

  return (
    <Box>
      <PageHeader title="Scheduled Tasks" />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell align="center">Enabled</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task: ScheduledTask) => (
              <TableRow key={task.name}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{task.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                    {task.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {editingCron === task.name ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <TextField
                        size="small"
                        value={cronDraft}
                        onChange={(e) => setCronDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') cronMutation.mutate({ name: task.name, cron_expression: cronDraft });
                          if (e.key === 'Escape') setEditingCron(null);
                        }}
                        sx={{ width: 150 }}
                        autoFocus
                      />
                      <IconButton
                        size="small"
                        onClick={() => cronMutation.mutate({ name: task.name, cron_expression: cronDraft })}
                        disabled={cronMutation.isPending}
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setEditingCron(null)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title={task.cron_expression}>
                        <Typography variant="body2">{humanCron(task.cron_expression)}</Typography>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() => { setEditingCron(task.name); setCronDraft(task.cron_expression); }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={task.enabled}
                    size="small"
                    onChange={() => toggleMutation.mutate({ name: task.name, enabled: !task.enabled })}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(task.last_run_at)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDuration(task.last_duration_ms)}</Typography>
                </TableCell>
                <TableCell>{statusChip(task.last_status)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Run now">
                      <IconButton
                        size="small"
                        onClick={() => triggerMutation.mutate(task.name)}
                        disabled={triggerMutation.isPending}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View history">
                      <IconButton
                        size="small"
                        onClick={() => { setDrawerTask(task.name); setRunsPage(1); }}
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={4}>No scheduled tasks registered</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Run History Drawer */}
      <Drawer anchor="right" open={!!drawerTask} onClose={() => setDrawerTask(null)} PaperProps={{ sx: { width: 600, maxWidth: '90vw' } }}>
        <Box p={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Run History: {drawerTask}</Typography>
            <IconButton onClick={() => setDrawerTask(null)}><CloseIcon /></IconButton>
          </Stack>

          {runsQuery.isLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : runsQuery.isError ? (
            <Alert severity="error">Failed to load runs</Alert>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Started</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(runsQuery.data?.runs ?? []).map((run: ScheduledTaskRun) => (
                    <TableRow key={run.id}>
                      <TableCell><Typography variant="body2">{formatDate(run.started_at)}</Typography></TableCell>
                      <TableCell>{statusChip(run.status)}</TableCell>
                      <TableCell><Typography variant="body2">{formatDuration(run.duration_ms)}</Typography></TableCell>
                      <TableCell>
                        {run.error ? (
                          <Typography variant="body2" color="error.main" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {run.error}
                          </Typography>
                        ) : run.summary ? (
                          <Stack spacing={0.25}>
                            {Object.entries(run.summary).map(([k, v]) => (
                              <Typography key={k} variant="caption" color="text.secondary">
                                {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </Typography>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(runsQuery.data?.runs ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" py={2}>No runs yet</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {(runsQuery.data?.total ?? 0) > 20 && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination
                    count={Math.ceil((runsQuery.data?.total ?? 0) / 20)}
                    page={runsPage}
                    onChange={(_, p) => setRunsPage(p)}
                    size="small"
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Drawer>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack}
      />
    </Box>
  );
}
