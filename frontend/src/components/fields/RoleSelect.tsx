import React from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type Role = { id: string; role_name: string; role_description: string };

export default function RoleSelect({
  label = 'Role',
  value,
  onChange,
  disabled,
  error,
  helperText,
  required,
}: {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get<{ items: Role[] }>('/roles');
      return res.data.items;
    },
  });

  const options: Role[] = React.useMemo(() => {
    const list = data ? [...data] : [];
    return list.sort((a, b) => a.role_name.localeCompare(b.role_name, undefined, { sensitivity: 'base' }));
  }, [data]);
  const selected = options.find((o) => o.id === value) || null;

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(o: Role) => o.role_name}
      value={selected as any}
      onChange={(_, opt) => onChange((opt as Role | null)?.id ?? null)}
      disabled={disabled}
      isOptionEqualToValue={(a, b) => (a as Role).id === (b as Role).id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <li key={key} {...rest}>
            <div>
              <strong>{option.role_name}</strong>
              <br />
              <small style={{ color: 'gray' }}>{option.role_description}</small>
            </div>
          </li>
        );
      }}
    />
  );
}
