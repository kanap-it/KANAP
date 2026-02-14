import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Autocomplete, Box, Chip, IconButton, Stack, TextField, Typography, CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../api';

interface Dependency {
  id: string;
  target_type: 'request' | 'project';
  target_id: string;
  target_name: string;
  target_status: string;
}

interface DependencySelectorProps {
  entityType: 'request' | 'project';
  entityId: string;
  dependencies: Dependency[];
  onAdd: (targetType: 'request' | 'project', targetId: string) => Promise<void>;
  onRemove: (targetType: 'request' | 'project', targetId: string) => Promise<void>;
  disabled?: boolean;
}

interface TargetOption {
  type: 'request' | 'project';
  id: string;
  name: string;
  status: string;
}

export default function DependencySelector({
  entityType,
  entityId,
  dependencies,
  onAdd,
  onRemove,
  disabled,
}: DependencySelectorProps) {
  const [loading, setLoading] = useState(false);

  // Fetch available requests and projects
  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['portfolio-requests', 'list-for-deps'],
    queryFn: async () => {
      const res = await api.get('/portfolio/requests', { params: { limit: 500, status: 'all' } });
      return res.data.items || [];
    },
  });

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['portfolio-projects', 'list-for-deps'],
    queryFn: async () => {
      const res = await api.get('/portfolio/projects', { params: { limit: 500 } });
      return res.data.items || [];
    },
  });

  // Build options list excluding self and already linked
  const options: TargetOption[] = [];
  const linkedIds = new Set(dependencies.map((d) => `${d.target_type}:${d.target_id}`));
  const selfKey = `${entityType}:${entityId}`;

  if (requests) {
    for (const r of requests) {
      const key = `request:${r.id}`;
      // Filter out converted requests - use the resulting project instead
      if (key !== selfKey && !linkedIds.has(key) && r.status !== 'converted') {
        options.push({ type: 'request', id: r.id, name: r.name, status: r.status });
      }
    }
  }

  if (projects) {
    for (const p of projects) {
      const key = `project:${p.id}`;
      if (key !== selfKey && !linkedIds.has(key)) {
        options.push({ type: 'project', id: p.id, name: p.name, status: p.status });
      }
    }
  }

  const handleAdd = useCallback(async (option: TargetOption | null) => {
    if (!option) return;
    setLoading(true);
    try {
      await onAdd(option.type, option.id);
    } finally {
      setLoading(false);
    }
  }, [onAdd]);

  const handleRemove = useCallback(async (dep: Dependency) => {
    setLoading(true);
    try {
      await onRemove(dep.target_type, dep.target_id);
    } finally {
      setLoading(false);
    }
  }, [onRemove]);

  const isLoading = loadingRequests || loadingProjects || loading;

  return (
    <Stack spacing={2}>
      <Autocomplete
        options={options}
        groupBy={(option) => option.type === 'request' ? 'Requests' : 'Projects'}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.type === value.type && option.id === value.id}
        onChange={(_, value) => handleAdd(value)}
        value={null}
        renderOption={(props, option) => (
          <li {...props} key={`${option.type}:${option.id}`}>
            <Box>
              <Typography variant="body2">{option.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {option.status.replace(/_/g, ' ')}
              </Typography>
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Add Dependency"
            placeholder="Search requests or projects..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        disabled={disabled || isLoading}
        loading={isLoading}
        fullWidth
      />

      {dependencies.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Current Dependencies:
          </Typography>
          {dependencies.map((dep) => (
            <Stack
              key={dep.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}
            >
              <Chip
                label={dep.target_type === 'request' ? 'Request' : 'Project'}
                size="small"
                color={dep.target_type === 'request' ? 'info' : 'success'}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {dep.target_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dep.target_status?.replace(/_/g, ' ')}
              </Typography>
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => handleRemove(dep)}
                  disabled={loading}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {dependencies.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No dependencies defined.
        </Typography>
      )}
    </Stack>
  );
}
