import React from 'react';
import { Autocomplete, Box, Chip, CircularProgress, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { FieldLabel, mergeSx } from '../design';
import { drawerAutocompleteListboxSx, nakedControlHoverSx, nakedFieldPlaceholderSx } from '../../theme/formSx';

type BusinessProcess = {
  id: string;
  name: string;
  status: string;
};

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  helperText?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
};

export default function BusinessProcessMultiSelect({
  value,
  onChange,
  label: labelProp,
  helperText,
  error,
  disabled,
  hideLabel = false,
  textFieldSx,
}: Props) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.businessProcesses');
  const naked = hideLabel || label === '';
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['business-processes', 'enabled'],
    queryFn: async () => {
      const res = await api.get<{ items: BusinessProcess[] }>('/business-processes', {
        params: { limit: 1000, sort: 'name:ASC', status: 'enabled' },
      });
      return res.data?.items || [];
    },
  });

  const options = data || [];

  const selectedOptions = React.useMemo(() => {
    if (!options.length) return [] as BusinessProcess[];
    return options.filter((opt) => value.includes(opt.id));
  }, [options, value]);

  const control = (
    <Autocomplete<BusinessProcess, true, false, false>
      multiple
      options={options}
      value={selectedOptions}
      disabled={disabled || isLoading}
      onChange={(_, newValue) => {
        const ids = newValue.map((opt) => opt.id);
        onChange(ids);
      }}
      getOptionLabel={(option) => option.name}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            label={option.name}
            size="small"
          />
        ))
      }
      ListboxProps={naked ? { sx: drawerAutocompleteListboxSx } : undefined}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          sx={naked ? mergeSx(nakedControlHoverSx, nakedFieldPlaceholderSx, textFieldSx) : textFieldSx}
          placeholder={t('selects.selectBusinessProcesses')}
          helperText={helperText}
          error={error}
          InputProps={{
            ...params.InputProps,
            ...(naked ? { disableUnderline: true } : {}),
            endAdornment: (
              <>
                {(isLoading || isFetching) ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      loading={isLoading || isFetching}
      noOptionsText={isLoading ? t('selects.loading') : t('selects.noBusinessProcessesFound')}
      fullWidth
    />
  );

  if (naked || !label) return control;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
      <FieldLabel>{label}</FieldLabel>
      {control}
    </Box>
  );
}
