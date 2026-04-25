import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { drawerAutocompleteListboxSx } from '../../theme/formSx';

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  email: string;
  active: boolean;
  supplier_id: string | null;
  supplier_name: string | null;
};

type ContactSelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  onContactChange?: (contact: Contact | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  query?: string; // initial query
  showEmail?: boolean;
  compactOptions?: boolean;
  groupByCompany?: boolean;
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
};

function formatLabel(c: Contact, showEmail: boolean, compactOptions = false): string {
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  const name = fullName || c.email;
  const supplier = c.supplier_name ? ` — ${c.supplier_name}` : '';
  if (compactOptions) return `${name}${supplier}`;
  if (!showEmail) return name;
  return fullName ? `${fullName}${supplier} (${c.email})` : c.email;
}

const ContactSelect = React.forwardRef<HTMLInputElement, ContactSelectProps>(function ContactSelect(
  {
    label: labelProp,
    value,
    onChange,
    onContactChange,
    disabled,
    error,
    helperText,
    required = false,
    query = '',
    showEmail = true,
    compactOptions = false,
    groupByCompany = true,
    hideLabel = false,
    textFieldSx,
  },
  ref,
) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.contact');
  const [input, setInput] = React.useState(query);
  const { data: items, isFetching } = useQuery({
    queryKey: ['contacts', 'typeahead', input],
    queryFn: async () => {
      const res = await api.get<{ items: Contact[] }>('/contacts', { params: { limit: 20, q: input } });
      return res.data.items;
    },
    placeholderData: (prev) => prev, // keep previous results while fetching new ones
  });

  // Ensure selected contact is visible even if not in the current typeahead results
  const needSelectedFetch = !!value && !(items || []).some((c) => c.id === value);
  const { data: selectedById, isLoading: isLoadingSelected } = useQuery({
    queryKey: ['contacts', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      const res = await api.get<Contact>(`/contacts/${value}`);
      return res.data as unknown as Contact;
    },
  });

  const mergedOptions = React.useMemo(() => {
    const base = items ? [...items] : [];
    if (selectedById && !base.some((c) => c.id === selectedById.id)) base.unshift(selectedById);
    // Sort by supplier name for grouping
    base.sort((a, b) => {
      const sa = a.supplier_name || '';
      const sb = b.supplier_name || '';
      return sa.localeCompare(sb);
    });
    return base;
  }, [items, selectedById]);

  const selected = mergedOptions.find((c) => c.id === value) || null;

  return (
    <Autocomplete
      options={mergedOptions}
      value={selected}
      onChange={(_, newValue) => {
        const nextContact = (newValue as Contact | null) || null;
        onChange(nextContact?.id || null);
        onContactChange?.(nextContact);
      }}
      onInputChange={(_, newValue, reason) => {
        if (reason === 'input') setInput(newValue);
        else if (reason === 'clear') setInput('');
      }}
      getOptionLabel={(option) => formatLabel(option as Contact, showEmail, compactOptions)}
      groupBy={groupByCompany ? (option) => (option as Contact).supplier_name || t('selects.noSupplier') : undefined}
      ListboxProps={hideLabel ? { sx: drawerAutocompleteListboxSx } : undefined}
      renderOption={(props, option) => (
        <li {...props}>
          <span className="kanap-autocomplete-option-primary">
            {formatLabel(option as Contact, showEmail, compactOptions)}
          </span>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={hideLabel ? undefined : label}
          required={required}
          inputRef={ref}
          error={error}
          helperText={helperText}
          variant={hideLabel ? 'standard' : undefined}
          sx={textFieldSx}
          InputProps={{
            ...params.InputProps,
            ...(hideLabel ? { disableUnderline: true } : {}),
            endAdornment: (
              <>
                {(isFetching || isLoadingSelected) ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      disabled={disabled}
      loading={isFetching || isLoadingSelected}
      filterOptions={(x) => x}
      noOptionsText={isFetching ? t('selects.loadingEllipsis') : t('selects.noContactsFound')}
      fullWidth
    />
  );
});

export default ContactSelect;
