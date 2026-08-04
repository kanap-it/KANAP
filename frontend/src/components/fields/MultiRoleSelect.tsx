import React from 'react';
import { Autocomplete, Box, CircularProgress, TextField, Chip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { FieldLabel, mergeSx } from '../design';
import { drawerAutocompleteListboxSx, nakedControlHoverSx, nakedFieldPlaceholderSx } from '../../theme/formSx';

type Role = { id: string; role_name: string; role_description: string };

export default function MultiRoleSelect({
  label: labelProp,
  value,
  onChange,
  disabled,
  error,
  helperText,
  required,
  hideLabel = false,
  textFieldSx,
}: {
  label?: string;
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
}) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.roles');
  const naked = hideLabel || label === '';
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

  const control = (
    <Autocomplete
      multiple
      options={options}
      getOptionLabel={(o: Role) => o.role_name}
      value={selectedRoles}
      onChange={handleRoleChange}
      disabled={disabled}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      ListboxProps={naked ? { sx: drawerAutocompleteListboxSx } : undefined}
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          variant="standard"
          sx={naked ? mergeSx(nakedControlHoverSx, nakedFieldPlaceholderSx, textFieldSx) : textFieldSx}
          placeholder={naked && selectedRoles.length === 0 ? t('selects.notSet') : undefined}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            ...(naked ? { disableUnderline: true } : {}),
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

  if (naked || !label) return control;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {control}
    </Box>
  );
}
