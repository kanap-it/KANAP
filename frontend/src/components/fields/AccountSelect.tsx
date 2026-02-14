import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type Account = {
  id: string;
  account_number: number;
  account_name: string;
  description?: string | null;
};

type AccountSelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  companyId?: string | null | undefined;
};

function assignRef<T>(target: React.Ref<T | null> | undefined, value: T | null) {
  if (!target) return;
  if (typeof target === 'function') {
    target(value);
  } else {
    (target as React.MutableRefObject<T | null>).current = value;
  }
}

const AccountSelect = React.forwardRef<HTMLInputElement, AccountSelectProps>(function AccountSelect(
  {
    label = 'Account',
    value,
    onChange,
    disabled,
    error,
    helperText,
    required = false,
    companyId,
  },
  ref,
) {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts', 'active', companyId || 'all'],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 1000 };
      if (companyId) params.companyId = companyId;
      const res = await api.get<{ items: Account[] }>('/accounts', { params });
      return res.data.items;
    },
    enabled: !!companyId, // Only fetch when company is selected
  });

  // Ensure currently selected account is ALWAYS present in options, even if from different CoA
  const [extraOption, setExtraOption] = React.useState<Account | null>(null);
  const [isFetchingExtra, setIsFetchingExtra] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!value) {
        setExtraOption(null);
        setIsFetchingExtra(false);
        return;
      }
      const exists = (accounts || []).some((a) => a.id === value);
      if (!exists) {
        setIsFetchingExtra(true);
        try {
          const res = await api.get<Account>(`/accounts/${value}`);
          if (!alive) return;
          const acc = res.data as any;
          if (acc && acc.id) {
            setExtraOption({
              id: acc.id,
              account_number: Number(acc.account_number || 0),
              account_name: acc.account_name,
              description: acc.description || null
            });
          }
        } catch {
          if (!alive) return;
          setExtraOption(null);
        } finally {
          if (alive) setIsFetchingExtra(false);
        }
      } else {
        setExtraOption(null);
        setIsFetchingExtra(false);
      }
    })();
    return () => { alive = false; };
  }, [value, accounts]);

  const sortedAccounts = React.useMemo(() => {
    const list = accounts ? [...accounts] : [];
    if (extraOption && !list.find((a) => a.id === extraOption.id)) list.unshift(extraOption);
    return list.sort((a, b) => {
      const aNum = Number(a.account_number ?? 0);
      const bNum = Number(b.account_number ?? 0);
      return aNum - bNum;
    });
  }, [accounts, extraOption]);

  const selectedAccount: Account | null = sortedAccounts.find((account: Account) => account.id === value) || null;

  return (
    <Autocomplete
      options={sortedAccounts}
      value={selectedAccount}
      onChange={(_, newValue) => onChange(newValue?.id || null)}
      getOptionLabel={(option) => `[${option.account_number}] ${option.account_name}`}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      blurOnSelect
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <div>
            <div style={{ fontWeight: 500 }}>
              [{option.account_number}] {option.account_name}
            </div>
            {option.description && (
              <div style={{ fontSize: '0.875rem', color: 'text.secondary', opacity: 0.7 }}>
                {option.description}
              </div>
            )}
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          inputRef={(node) => {
            assignRef((params.inputProps as any)?.ref, node);
            assignRef(ref, node ?? null);
          }}
          error={error}
          helperText={helperText}
          InputLabelProps={{ shrink: true }}
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
      disabled={disabled || isLoading}
      loading={isLoading || isFetchingExtra}
      filterOptions={(options, { inputValue }) => {
        const searchTerm = inputValue.toLowerCase();
        return options.filter(option => 
          option.account_number.toString().includes(searchTerm) ||
          option.account_name.toLowerCase().includes(searchTerm) ||
          (option.description && option.description.toLowerCase().includes(searchTerm))
        );
      }}
      noOptionsText={isLoading ? "Loading..." : "No accounts found"}
      fullWidth
    />
  );
});

export default AccountSelect;
