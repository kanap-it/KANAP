import React from 'react';
import { Autocomplete, TextField, CircularProgress, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type User = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  status: string;
};

type UserMultiSelectProps = {
  label?: string;
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  size?: 'small' | 'medium';
};

export default function UserMultiSelect({
  label = 'Users',
  value,
  onChange,
  disabled,
  error,
  helperText,
  placeholder,
  required,
  size,
}: UserMultiSelectProps) {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'enabled', 'select'],
    queryFn: async () => {
      const res = await api.get<{ items: User[] }>('/users', {
        params: { status: 'enabled', limit: 1000 },
      });
      return res.data.items;
    },
  });

  const sortedUsers = React.useMemo(() => {
    const list = users ? [...users] : [];
    const getName = (u: User) => {
      const fn = (u.first_name || '').trim();
      const ln = (u.last_name || '').trim();
      const name = [fn, ln].filter(Boolean).join(' ');
      return (name || u.email).toLowerCase();
    };
    return list.sort((a, b) => getName(a).localeCompare(getName(b), undefined, { sensitivity: 'base' }));
  }, [users]);

  // Fetch any selected users not in the list
  const missingIds = value.filter(id => !sortedUsers.some(u => u.id === id));
  const { data: missingUsers = [], isLoading: isLoadingMissing } = useQuery({
    queryKey: ['users', 'by-ids', missingIds],
    enabled: missingIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        missingIds.map(id => api.get<User>(`/users/${id}`).then(r => r.data).catch(() => null))
      );
      return results.filter((u): u is User => u !== null);
    },
  });

  const mergedOptions = React.useMemo(() => {
    const base = [...sortedUsers];
    for (const u of missingUsers) {
      if (!base.some(b => b.id === u.id)) base.unshift(u);
    }
    return base;
  }, [sortedUsers, missingUsers]);

  const selected = mergedOptions.filter(u => value.includes(u.id));

  const formatName = (u: User) => {
    const fn = (u.first_name || '').trim();
    const ln = (u.last_name || '').trim();
    const name = [fn, ln].filter(Boolean).join(' ');
    return name || u.email;
  };

  return (
    <Autocomplete
      multiple
      options={mergedOptions}
      value={selected}
      onChange={(_, newValue) => onChange(newValue.map(u => u.id))}
      getOptionLabel={(option) => formatName(option)}
      size={size}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <div>
            <div style={{ fontWeight: 500 }}>{formatName(option)}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>{option.email}</div>
          </div>
        </li>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            label={formatName(option)}
            size="small"
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          size={size}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {(isLoading || isLoadingMissing) ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      disabled={disabled || isLoading}
      loading={isLoading || isLoadingMissing}
      filterOptions={(options, { inputValue }) => {
        const s = inputValue.toLowerCase();
        return options.filter((o) =>
          (o.first_name || '').toLowerCase().includes(s) ||
          (o.last_name || '').toLowerCase().includes(s) ||
          o.email.toLowerCase().includes(s)
        );
      }}
      noOptionsText={isLoading ? 'Loading...' : 'No users found'}
      fullWidth
    />
  );
}
