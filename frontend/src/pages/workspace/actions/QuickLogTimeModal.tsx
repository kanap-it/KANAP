import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Snackbar,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { useAuth } from '../../../auth/AuthContext';

interface QuickLogTimeModalProps {
  open: boolean;
  onClose: () => void;
}

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  related_object_type: string | null;
  related_object_id: string | null;
  related_object_name: string | null;
}

type LogTarget = 'project' | 'task';

export default function QuickLogTimeModal({
  open,
  onClose,
}: QuickLogTimeModalProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [target, setTarget] = useState<LogTarget>('project');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [hours, setHours] = useState('');
  const [category, setCategory] = useState<'it' | 'business'>('it');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);

  // Fetch projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['portfolio', 'projects', 'list-simple'],
    queryFn: async () => {
      const res = await api.get('/portfolio/projects', {
        params: { limit: 100, sort: 'name:ASC', status: 'all' },
      });
      return res.data.items as Project[];
    },
    enabled: open && target === 'project',
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's active tasks for dropdown
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', 'list-simple', profile?.id],
    queryFn: async () => {
      const res = await api.get('/tasks', {
        params: {
          limit: 200,
          sort: 'title:ASC',
          assigneeUserId: profile?.id,
          filters: JSON.stringify({ status: { filterType: 'set', values: ['open', 'in_progress'] } }),
        },
      });
      const items = res.data.items as Task[];
      // Only show project and standalone tasks (exclude OPEX, CAPEX, Contract tasks)
      return items.filter((t) => !t.related_object_type || t.related_object_type === 'project');
    },
    enabled: open && target === 'task' && !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });

  const selectedTask = tasksData?.find((t) => t.id === taskId);

  const logTimeMutation = useMutation({
    mutationFn: async () => {
      const hoursNum = parseFloat(hours);
      if (target === 'project') {
        await api.post(`/portfolio/projects/${projectId}/time-entries`, {
          category,
          hours: hoursNum,
          notes: notes || undefined,
        });
      } else {
        const projectIdForTask = selectedTask?.related_object_type === 'project' ? selectedTask.related_object_id : null;
        const endpoint = projectIdForTask
          ? `/portfolio/projects/${projectIdForTask}/tasks/${taskId}/time-entries`
          : `/tasks/${taskId}/time-entries`;
        await api.post(endpoint, {
          category,
          user_id: profile?.id,
          hours: hoursNum,
          notes: notes.trim() || null,
          logged_at: new Date().toISOString().split('T')[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'time-summary'] });
      if (target === 'project') {
        queryClient.invalidateQueries({ queryKey: ['portfolio', 'projects', projectId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
      handleClose();
      setSnackOpen(true);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err.message || 'Failed to log time');
    },
  });

  const handleClose = () => {
    setTarget('project');
    setProjectId('');
    setTaskId('');
    setHours('');
    setCategory('it');
    setNotes('');
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (target === 'project' && !projectId) {
      setError('Project is required');
      return;
    }
    if (target === 'task' && !taskId) {
      setError('Task is required');
      return;
    }
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setError('Please enter valid hours');
      return;
    }
    logTimeMutation.mutate();
  };

  const formatTaskLabel = (task: Task) => {
    if (task.related_object_name) return `${task.title} (${task.related_object_name})`;
    return task.title;
  };

  return (
    <>
    <Snackbar
      open={snackOpen}
      onClose={() => setSnackOpen(false)}
      autoHideDuration={2000}
      message="Time logged successfully"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    />
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Log Time</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Log on
            </Typography>
            <ToggleButtonGroup
              value={target}
              exclusive
              onChange={(_, val) => {
                if (val) {
                  setTarget(val);
                  setProjectId('');
                  setTaskId('');
                  setError(null);
                }
              }}
              size="small"
              fullWidth
            >
              <ToggleButton value="project">Project</ToggleButton>
              <ToggleButton value="task">Task</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {target === 'project' ? (
            <FormControl fullWidth required>
              <InputLabel>Project</InputLabel>
              <Select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                label="Project"
              >
                {projectsData?.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FormControl fullWidth required>
              <InputLabel>Task</InputLabel>
              <Select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                label="Task"
              >
                {tasksData?.map((task) => (
                  <MenuItem key={task.id} value={task.id}>
                    {formatTaskLabel(task)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Hours"
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            fullWidth
            required
            inputProps={{ min: 0.25, step: 0.25 }}
            placeholder="e.g., 2.5"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Category
            </Typography>
            <ToggleButtonGroup
              value={category}
              exclusive
              onChange={(_, val) => val && setCategory(val)}
              size="small"
              fullWidth
            >
              <ToggleButton value="it">IT</ToggleButton>
              <ToggleButton value="business">Business</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="What did you work on?"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={logTimeMutation.isPending}
        >
          Log Time
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
