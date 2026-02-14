import React from 'react';
import { Autocomplete, Chip, CircularProgress, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

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
};

export default function BusinessProcessMultiSelect({
  value,
  onChange,
  label = 'Business Processes',
  helperText,
  error,
  disabled,
}: Props) {
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

  return (
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
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Select business processes"
          helperText={helperText}
          error={error}
          InputProps={{
            ...params.InputProps,
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
      noOptionsText={isLoading ? 'Loading...' : 'No business processes found'}
      fullWidth
    />
  );
}
