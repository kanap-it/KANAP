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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
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
      setError(err.message || t('messages.failedToCreateTask'));
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
      setError(t('messages.titleRequired'));
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('dashboard.quickCreate.createTask')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label={t('dashboard.quickCreate.taskTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            autoFocus
            placeholder={t('dashboard.quickCreate.whatNeedsToBeDone')}
          />

          <FormControl fullWidth>
            <InputLabel>{t('dashboard.quickCreate.projectOptional')}</InputLabel>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              label={t('dashboard.quickCreate.projectOptional')}
            >
              <MenuItem value="">
                <em>{t('labels.none')}</em>
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
        <Button onClick={handleClose}>{t('buttons.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {t('buttons.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
