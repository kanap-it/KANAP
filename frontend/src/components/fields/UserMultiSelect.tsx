import React from 'react';
import { Autocomplete, Box, Divider, TextField, CircularProgress, Chip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { FieldLabel, mergeSx } from '../design';
import { drawerAutocompleteListboxSx, nakedControlHoverSx, nakedFieldPlaceholderSx } from '../../theme/formSx';

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
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
};

export default function UserMultiSelect({
  label: labelProp,
  value,
  onChange,
  disabled,
  error,
  helperText,
  placeholder,
  required,
  size,
  hideLabel = false,
  textFieldSx,
}: UserMultiSelectProps) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.users');
  const naked = hideLabel || label === '';
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

  const control = (
    <Autocomplete
      multiple
      options={mergedOptions}
      value={selected}
      onChange={(_, newValue) => onChange(newValue.map(u => u.id))}
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
      ListboxProps={naked ? { sx: drawerAutocompleteListboxSx } : undefined}
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          size={size}
          variant="standard"
          sx={naked ? mergeSx(nakedControlHoverSx, nakedFieldPlaceholderSx, textFieldSx) : textFieldSx}
          placeholder={placeholder ?? (naked && selected.length === 0 ? t('selects.notSet') : undefined)}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            ...(naked ? { disableUnderline: true } : {}),
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
      noOptionsText={isLoading ? t('selects.loading') : t('selects.noUsersFound')}
      fullWidth
    />
  );

  if (naked || !label) return control;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {control}
    </Box>
  );
}
