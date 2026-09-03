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
  ListSubheader,
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

interface IncidentOption {
  id: string;
  item_number: number;
  title: string;
}

// The "Link to" select holds one value of the form "<type>:<id>" so projects and incidents share a single control.
type RelatedValue = '' | `project:${string}` | `incident:${string}`;

export default function QuickCreateTaskModal({
  open,
  onClose,
}: QuickCreateTaskModalProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const [title, setTitle] = useState('');
  const [related, setRelated] = useState<RelatedValue>('');
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

  // Open incidents only: a quick task is work on something still in progress
  const { data: incidentsData } = useQuery({
    queryKey: ['incidents', 'list-simple', 'open'],
    queryFn: async () => {
      const res = await api.get('/incidents', {
        params: {
          limit: 100,
          sort: 'detected_at:DESC',
          filters: JSON.stringify({ status: { filterType: 'set', values: ['open', 'in_progress'] } }),
        },
      });
      return res.data.items as IncidentOption[];
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

      if (related) {
        const [type, id] = related.split(':');
        payload.related_object_type = type;
        payload.related_object_id = id;
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
    setRelated('');
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
            <InputLabel>{t('dashboard.quickCreate.linkToOptional')}</InputLabel>
            <Select
              value={related}
              onChange={(e) => setRelated(e.target.value as RelatedValue)}
              label={t('dashboard.quickCreate.linkToOptional')}
            >
              <MenuItem value="">
                <em>{t('labels.none')}</em>
              </MenuItem>
              {projectsData?.length ? <ListSubheader>{t('dashboard.quickCreate.projects')}</ListSubheader> : null}
              {projectsData?.map((project) => (
                <MenuItem key={project.id} value={`project:${project.id}`}>
                  {project.name}
                </MenuItem>
              ))}
              {incidentsData?.length ? <ListSubheader>{t('dashboard.quickCreate.incidents')}</ListSubheader> : null}
              {incidentsData?.map((incident) => (
                <MenuItem key={incident.id} value={`incident:${incident.id}`}>
                  {`INC-${incident.item_number} · ${incident.title}`}
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
