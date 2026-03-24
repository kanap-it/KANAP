import React from 'react';
import { Autocomplete, Divider, TextField, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';

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
    label: labelProp,
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
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.user');
  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'enabled', 'select'],
    queryFn: async () => {
      const res = await api.get<{ items: User[] }>('/users', {
        params: { status: 'enabled', limit: 1000 },
      });
      return res.data.items;
    },
  });

  const { profile } = useAuth();
  const myId = profile?.id ?? null;

  const sortedUsers = React.useMemo(() => {
    const list = users ? [...users] : [];
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
  }, [users, myId]);

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
        <React.Fragment key={option.id}>
          <li {...props}>
            <div style={{ fontWeight: 500 }}>
              {formatName(option)}{option.id === myId ? ` ${t('selects.meSuffix')}` : ''}
            </div>
          </li>
          {option.id === myId && <Divider />}
        </React.Fragment>
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
      noOptionsText={isLoading ? t('selects.loading') : t('selects.noUsersFound')}
      fullWidth
    />
  );
});

export default UserSelect;
