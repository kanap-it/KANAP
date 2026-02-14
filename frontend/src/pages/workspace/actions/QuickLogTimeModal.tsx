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
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';

interface QuickLogTimeModalProps {
  open: boolean;
  onClose: () => void;
}

interface Project {
  id: string;
  name: string;
}

export default function QuickLogTimeModal({
  open,
  onClose,
}: QuickLogTimeModalProps) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState('');
  const [category, setCategory] = useState<'it' | 'business'>('it');
  const [notes, setNotes] = useState('');
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

  const logTimeMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category,
        hours: parseFloat(hours),
        notes: notes || undefined,
      };

      const res = await api.post(`/portfolio/projects/${projectId}/time-entries`, payload);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'time-summary'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'projects', projectId] });
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to log time');
    },
  });

  const handleClose = () => {
    setProjectId('');
    setHours('');
    setCategory('it');
    setNotes('');
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!projectId) {
      setError('Project is required');
      return;
    }
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setError('Please enter valid hours');
      return;
    }
    logTimeMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Log Time</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

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
  );
}
