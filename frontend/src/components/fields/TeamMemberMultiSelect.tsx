import { Fragment, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Autocomplete, CircularProgress, Divider, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';

interface TeamMember {
  user_id: string;
  user_display_name?: string;
  user_email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface User {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}

interface TeamMemberMultiSelectProps {
  label: string;
  value: TeamMember[];
  onChange: (userIds: string[]) => Promise<void>;
  disabled?: boolean;
}

export default function TeamMemberMultiSelect({
  label,
  value,
  onChange,
  disabled,
}: TeamMemberMultiSelectProps) {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const myId = profile?.id ?? null;

  // Fetch all users
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-for-team-select'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { status: 'enabled', limit: 1000 } });
      return (res.data?.items || []) as User[];
    },
  });

  // Users that are not yet selected
  const selectedUserIds = useMemo(() => {
    return new Set(value.map((m) => m.user_id));
  }, [value]);

  const availableUsers = useMemo(() => {
    if (!users) return [];
    const list = users.filter((u) => !selectedUserIds.has(u.id));
    const sortKey = (u: User) => {
      const ln = (u.last_name || '').trim().toLowerCase();
      const fn = (u.first_name || '').trim().toLowerCase();
      return ln ? `${ln}\0${fn}` : (fn || u.email.toLowerCase());
    };
    list.sort((a, b) => sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: 'base' }));
    // Pin current user first
    if (myId) {
      const idx = list.findIndex((u) => u.id === myId);
      if (idx > 0) list.unshift(...list.splice(idx, 1));
    }
    return list;
  }, [users, selectedUserIds, myId]);

  // Get display name for a team member
  const getDisplayName = useCallback((m: TeamMember) => {
    if (m.user_display_name) return m.user_display_name;
    if (m.display_name) return m.display_name;
    if (m.first_name || m.last_name) return `${m.first_name || ''} ${m.last_name || ''}`.trim();
    return m.user_email || m.email || m.user_id;
  }, []);

  // Format user name from first_name/last_name
  const formatUserName = useCallback((u: User) => {
    const fn = (u.first_name || '').trim();
    const ln = (u.last_name || '').trim();
    const name = [fn, ln].filter(Boolean).join(' ');
    return name || u.email;
  }, []);

  const handleAdd = useCallback(async (user: User | null) => {
    if (!user) {
      return;
    }
    setLoading(true);
    try {
      const existingIds = (value || []).map((m) => m.user_id).filter(Boolean);
      const newUserIds = [...existingIds, user.id];
      await onChange(newUserIds);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [value, onChange]);

  const handleRemove = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const newUserIds = (value || [])
        .filter((m) => m.user_id !== userId)
        .map((m) => m.user_id)
        .filter(Boolean);
      await onChange(newUserIds);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [value, onChange]);

  const isLoading = loadingUsers || loading;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>

      <Autocomplete
        options={availableUsers}
        getOptionLabel={(option) => formatUserName(option)}
        value={null}
        onChange={(_, v) => {
          void handleAdd(v);
        }}
        renderOption={(props, option) => {
          const { key, ...other } = props as any;
          return (
            <Fragment key={option.id}>
              <li {...other}>
                <Typography variant="body2" fontWeight={500}>
                  {formatUserName(option)}{option.id === myId ? ' (me)' : ''}
                </Typography>
              </li>
              {option.id === myId && <Divider />}
            </Fragment>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Add team member..."
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        disabled={disabled || isLoading}
        loading={isLoading}
        size="small"
      />

      {value.length > 0 ? (
        <Stack spacing={0.5}>
          {value.map((m) => (
            <Stack
              key={m.user_id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ p: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}
            >
              <Typography variant="body2" sx={{ flex: 1 }}>
                {getDisplayName(m)}
              </Typography>
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => handleRemove(m.user_id)}
                  disabled={loading}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No team members assigned.
        </Typography>
      )}
    </Stack>
  );
}
