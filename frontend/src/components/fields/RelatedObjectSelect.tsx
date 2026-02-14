import React from 'react';
import { Autocomplete, TextField, CircularProgress, Stack, Box, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import EnumAutocomplete from './EnumAutocomplete';

export type RelatedObjectType = 'project' | 'spend_item' | 'contract' | 'capex_item' | null;

interface RelatedObjectSelectProps {
  relationType: RelatedObjectType;
  relationId: string | null;
  onChangeType: (type: RelatedObjectType) => void;
  onChangeId: (id: string | null, name: string | null) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

interface RelatedOption {
  id: string;
  name: string;
}

const TYPE_OPTIONS = [
  { label: 'Project', value: 'project' },
  { label: 'Budget (OPEX)', value: 'spend_item' },
  { label: 'Contract', value: 'contract' },
  { label: 'CAPEX', value: 'capex_item' },
];

export default function RelatedObjectSelect({
  relationType,
  relationId,
  onChangeType,
  onChangeId,
  disabled = false,
  size = 'small',
}: RelatedObjectSelectProps) {
  const [inputValue, setInputValue] = React.useState('');

  // Fetch items based on selected type
  const { data: items, isLoading } = useQuery({
    queryKey: ['related-object-search', relationType, inputValue],
    queryFn: async (): Promise<RelatedOption[]> => {
      if (!relationType) return [];

      const params = { limit: 50, q: inputValue || undefined };

      switch (relationType) {
        case 'project': {
          const res = await api.get<{ items: Array<{ id: string; name: string }> }>(
            '/portfolio/projects',
            { params }
          );
          return (res.data?.items || []).map((p) => ({ id: p.id, name: p.name }));
        }
        case 'spend_item': {
          const res = await api.get<{ items: Array<{ id: string; product_name: string }> }>(
            '/spend-items',
            { params }
          );
          return (res.data?.items || []).map((s) => ({ id: s.id, name: s.product_name }));
        }
        case 'contract': {
          const res = await api.get<{ items: Array<{ id: string; name: string }> }>(
            '/contracts',
            { params }
          );
          return (res.data?.items || []).map((c) => ({ id: c.id, name: c.name }));
        }
        case 'capex_item': {
          const res = await api.get<{ items: Array<{ id: string; description: string }> }>(
            '/capex-items',
            { params }
          );
          return (res.data?.items || []).map((c) => ({ id: c.id, name: c.description }));
        }
        default:
          return [];
      }
    },
    enabled: !!relationType,
  });

  // Find selected item from items list
  const selectedItem = React.useMemo(() => {
    if (!relationId || !items) return null;
    return items.find((i) => i.id === relationId) || null;
  }, [relationId, items]);

  const handleTypeChange = (value: string) => {
    const newType = value ? (value as RelatedObjectType) : null;
    // onChangeType already passes id: null, name: null to clear the selection
    // Do NOT call onChangeId here - it would use stale task.related_object_type from closure
    onChangeType(newType);
    setInputValue('');
  };

  const handleItemChange = (_: any, option: RelatedOption | null) => {
    onChangeId(option?.id || null, option?.name || null);
  };

  return (
    <Stack spacing={1.5}>
      <EnumAutocomplete
        label="Related To"
        value={relationType || ''}
        onChange={handleTypeChange}
        options={[{ label: 'Select type...', value: '' }, ...TYPE_OPTIONS]}
        size={size}
        disabled={disabled}
      />

      {relationType && (
        <Autocomplete
          options={items || []}
          value={selectedItem}
          onChange={handleItemChange}
          inputValue={inputValue}
          onInputChange={(_, val) => setInputValue(val)}
          getOptionLabel={(option) => option?.name || ''}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box>
                <Typography variant="body2">{option.name}</Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={TYPE_OPTIONS.find((t) => t.value === relationType)?.label || 'Item'}
              placeholder="Search..."
              size={size}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          disabled={disabled}
          loading={isLoading}
          fullWidth
          size={size}
        />
      )}
    </Stack>
  );
}
