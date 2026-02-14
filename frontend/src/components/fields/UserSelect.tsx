import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type User = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  status: string;
};

type UserSelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  size?: 'small' | 'medium';
};

function assignRef<T>(target: React.Ref<T | null> | undefined, value: T | null) {
  if (!target) return;
  if (typeof target === 'function') {
    target(value);
  } else {
    (target as React.MutableRefObject<T | null>).current = value;
  }
}

const UserSelect = React.forwardRef<HTMLInputElement, UserSelectProps>(function UserSelect(
  {
    label = 'User',
    value,
    onChange,
    disabled,
    error,
    helperText,
    placeholder,
    required,
    size,
  },
  ref,
) {
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
    const label = (u: User) => {
      const fn = (u.first_name || '').trim();
      const ln = (u.last_name || '').trim();
      const name = [fn, ln].filter(Boolean).join(' ');
      return (name || u.email).toLowerCase();
    };
    return list.sort((a, b) => label(a).localeCompare(label(b), undefined, { sensitivity: 'base' }));
  }, [users]);

  // Fetch selected user if not present (e.g., disabled or off-page)
  const needSelectedFetch = !!value && !sortedUsers.some((u) => u.id === value);
  const { data: selectedById, isLoading: isLoadingSelected } = useQuery({
    queryKey: ['users', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      const res = await api.get<User>(`/users/${value}`);
      return res.data as unknown as User;
    },
  });

  const mergedOptions = React.useMemo(() => {
    const base = [...sortedUsers];
    if (selectedById && !base.some((u) => u.id === selectedById.id)) base.unshift(selectedById);
    return base;
  }, [sortedUsers, selectedById]);

  const selected = mergedOptions.find((u) => u.id === value) || null;

  const formatName = (u: User) => {
    const fn = (u.first_name || '').trim();
    const ln = (u.last_name || '').trim();
    const name = [fn, ln].filter(Boolean).join(' ');
    return name || u.email;
  };

  return (
    <Autocomplete
      options={mergedOptions}
      value={selected}
      onChange={(_, newValue) => onChange(newValue?.id || null)}
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
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          size={size}
          inputRef={(node) => {
            assignRef((params.inputProps as any)?.ref, node);
            assignRef(ref, node ?? null);
          }}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {(isLoading || isLoadingSelected) ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      disabled={disabled || isLoading}
      loading={isLoading || isLoadingSelected}
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
});

export default UserSelect;
