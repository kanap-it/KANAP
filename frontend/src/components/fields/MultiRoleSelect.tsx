import React from 'react';
import { Autocomplete, CircularProgress, TextField, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type Role = { id: string; role_name: string; role_description: string };

export default function MultiRoleSelect({
  label = 'Roles',
  value,
  onChange,
  disabled,
  error,
  helperText,
  required,
}: {
  label?: string;
  value: string[];
  onChange: (v: string[]) => void;
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

  const selectedRoles = React.useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value]
  );

  const handleRoleChange = (_: any, newRoles: Role[]) => {
    onChange(newRoles.map((r) => r.id));
  };

  return (
    <Autocomplete
      multiple
      options={options}
      getOptionLabel={(o: Role) => o.role_name}
      value={selectedRoles}
      onChange={handleRoleChange}
      disabled={disabled}
      isOptionEqualToValue={(a, b) => a.id === b.id}
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
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...chipProps } = getTagProps({ index });
          return (
            <Chip
              key={key}
              label={option.role_name}
              {...chipProps}
            />
          );
        })
      }
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
