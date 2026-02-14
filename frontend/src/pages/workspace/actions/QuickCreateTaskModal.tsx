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
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';

interface QuickCreateTaskModalProps {
  open: boolean;
  onClose: () => void;
}

interface Project {
  id: string;
  name: string;
}

export default function QuickCreateTaskModal({
  open,
  onClose,
}: QuickCreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['portfolio', 'projects', 'list-simple'],
    queryFn: async () => {
      const res = await api.get('/portfolio/projects', {
        params: { limit: 100, sort: 'name:ASC', status: 'all' },
      });
      return res.data.items as Project[];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title,
        status: 'open',
      };

      if (projectId) {
        payload.related_object_type = 'project';
        payload.related_object_id = projectId;
      }

      const res = await api.post('/tasks', payload);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create task');
    },
  });

  const handleClose = () => {
    setTitle('');
    setProjectId('');
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Task</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            autoFocus
            placeholder="What needs to be done?"
          />

          <FormControl fullWidth>
            <InputLabel>Project (optional)</InputLabel>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              label="Project (optional)"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {projectsData?.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
