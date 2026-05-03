import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Autocomplete, Box, IconButton, Stack, TextField, Typography, CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import { drawerAutocompleteListboxSx, editableFieldValueSx } from '../../../theme/formSx';

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
  onAdd: (target: TargetOption) => Promise<void>;
  onRemove: (targetType: 'request' | 'project', targetId: string) => Promise<void>;
  disabled?: boolean;
}

interface TargetOption {
  type: 'request' | 'project';
  id: string;
  name: string;
}

const relationControlSx = { maxWidth: 420 } as const;
const relationWideControlSx = { maxWidth: 640 } as const;
const relationAutocompleteSx = [editableFieldValueSx, { width: '100%' }, relationControlSx] as const;

export default function DependencySelector({
  entityType,
  entityId,
  dependencies,
  onAdd,
  onRemove,
  disabled,
}: DependencySelectorProps) {
  const { t } = useTranslation('portfolio');
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
        options.push({ type: 'request', id: r.id, name: r.name });
      }
    }
  }

  if (projects) {
    for (const p of projects) {
      const key = `project:${p.id}`;
      if (key !== selfKey && !linkedIds.has(key)) {
        options.push({ type: 'project', id: p.id, name: p.name });
      }
    }
  }

  const handleAdd = useCallback(async (option: TargetOption | null) => {
    if (!option) return;
    setLoading(true);
    try {
      await onAdd(option);
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
    <Stack spacing={1.25}>
      <Autocomplete
        options={options}
        groupBy={(option) => (
          option.type === 'request'
            ? t('activity.dependencies.groups.requests')
            : t('activity.dependencies.groups.projects')
        )}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.type === value.type && option.id === value.id}
        onChange={(_, value) => handleAdd(value)}
        value={null}
        renderOption={(props, option) => (
          <li {...props} key={`${option.type}:${option.id}`}>
            <Box sx={{ py: 0.25 }}>
              <Typography variant="body2">{option.name}</Typography>
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={t('activity.dependencies.placeholders.search')}
            variant="standard"
            inputProps={{
              ...params.inputProps,
              'aria-label': t('activity.dependencies.fields.addDependency'),
            }}
            InputProps={{
              ...params.InputProps,
              disableUnderline: true,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={editableFieldValueSx}
          />
        )}
        ListboxProps={{ sx: drawerAutocompleteListboxSx }}
        disabled={disabled || isLoading}
        loading={isLoading}
        sx={relationAutocompleteSx}
      />

      {dependencies.length > 0 && (
        <Stack spacing={0} sx={relationWideControlSx}>
          {dependencies.map((dep) => (
            <Stack
              key={dep.id}
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={(theme) => ({
                minHeight: 30,
                px: 1,
                borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
                '&:hover': { bgcolor: theme.palette.kanap.bg.hover },
              })}
            >
              <Box
                component="span"
                sx={(theme) => ({
                  width: 56,
                  flexShrink: 0,
                  color: theme.palette.kanap.text.secondary,
                  fontSize: 12,
                })}
              >
                {dep.target_type === 'request'
                  ? t('activity.dependencies.types.request')
                  : t('activity.dependencies.types.project')}
              </Box>
              <Typography
                variant="body2"
                sx={(theme) => ({
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  color: theme.palette.kanap.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                })}
              >
                {dep.target_name}
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
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
          {t('activity.dependencies.states.empty')}
        </Typography>
      )}
    </Stack>
  );
}
