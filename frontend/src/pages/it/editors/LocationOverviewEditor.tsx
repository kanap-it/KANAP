import React from 'react';
import { Alert, Stack, TextField, Typography, MenuItem } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import api from '../../../api';
import CompanySelect from '../../../components/fields/CompanySelect';
import { COUNTRY_OPTIONS, CountryOption } from '../../../constants/isoOptions';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';

export type LocationFormState = {
  code: string;
  name: string;
  hosting_type: string;
  operating_company_id: string | null;
  country_iso: string;
  city: string;
  datacenter: string;
  provider: string;
  region: string;
  additional_info: string;
};

type Props = {
  data: LocationFormState;
  onChange: (patch: Partial<LocationFormState>) => void;
  readOnly?: boolean;
  disabled?: boolean;
};

export default function LocationOverviewEditor({ data, onChange, readOnly = false, disabled = false }: Props) {
  const { byField, settings } = useItOpsEnumOptions();
  const hostingOptions = byField.hostingType || [];
  const providerOptions = byField.serverProvider || [];
  const [companyError, setCompanyError] = React.useState<string | null>(null);

  const getHostingCategory = React.useCallback(
    (code?: string) => {
      if (!code) return 'cloud';
      const opt = settings?.hostingTypes?.find((item) => item.code === code);
      return opt?.category === 'on_prem' ? 'on_prem' : 'cloud';
    },
    [settings?.hostingTypes],
  );

  React.useEffect(() => {
    if (!data.hosting_type && hostingOptions.length > 0) {
      onChange({ hosting_type: hostingOptions[0].code });
    }
  }, [data.hosting_type, hostingOptions, onChange]);

  const handleHostingTypeChange = (nextType: string) => {
    if (readOnly || disabled) return;
    const prevCategory = getHostingCategory(data.hosting_type);
    const nextCategory = getHostingCategory(nextType);
    if (prevCategory !== nextCategory) {
      const confirmMsg =
        nextCategory === 'on_prem'
          ? 'Switching to an on-prem hosting type will clear cloud provider fields. Continue?'
          : 'Switching to a cloud hosting type will clear operating company fields. Continue?';
      const confirmed = window.confirm(confirmMsg);
      if (!confirmed) return;
      if (nextCategory === 'on_prem') {
        onChange({
          hosting_type: nextType,
          provider: '',
          region: '',
        });
      } else {
        onChange({
          hosting_type: nextType,
          operating_company_id: null,
          datacenter: '',
        });
      }
      return;
    }
    onChange({ hosting_type: nextType });
  };

  const handleCompanyChange = async (companyId: string | null) => {
    if (readOnly || disabled) return;
    setCompanyError(null);
    onChange({ operating_company_id: companyId });
    if (companyId) {
      try {
        const res = await api.get(`/companies/${companyId}`);
        const company = res.data as any;
        if (!data.country_iso && company?.country_iso) {
          onChange({ country_iso: String(company.country_iso || '').toUpperCase() });
        }
        if (!data.city && company?.city) {
          onChange({ city: company.city || '' });
        }
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to load company details';
        setCompanyError(msg);
      }
    }
  };

  const category = getHostingCategory(data.hosting_type);
  const countryValue: CountryOption | null =
    COUNTRY_OPTIONS.find((opt) => opt.code === (data.country_iso || '').toUpperCase()) ??
    (data.country_iso
      ? { code: data.country_iso.toUpperCase(), name: `Unknown (${data.country_iso.toUpperCase()})` }
      : null);

  return (
    <Stack spacing={2}>
      {companyError && <Alert severity="error">{companyError}</Alert>}
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Basic information</Typography>
      <Stack spacing={2}>
        <TextField
          label="Code"
          value={data.code}
          onChange={(e) => onChange({ code: e.target.value })}
          disabled={readOnly || disabled}
          required
        />
        <TextField
          label="Name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          disabled={readOnly || disabled}
          required
        />
        <TextField
          select
          label="Hosting type"
          value={data.hosting_type}
          onChange={(e) => handleHostingTypeChange(e.target.value)}
          disabled={readOnly || disabled || hostingOptions.length === 0}
          required
        >
          {hostingOptions.map((opt) => (
            <MenuItem key={opt.code} value={opt.code}>
              {opt.deprecated ? `${opt.label} (deprecated)` : opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Location details</Typography>
      <Stack spacing={2}>
        {category === 'on_prem' && (
          <CompanySelect
            label="Operating company"
            value={data.operating_company_id}
            onChange={handleCompanyChange}
            disabled={readOnly || disabled}
          />
        )}
        {category === 'cloud' && (
          <>
            <TextField
              select
              label="Cloud provider"
              value={data.provider}
              onChange={(e) => onChange({ provider: e.target.value })}
              disabled={readOnly || disabled}
            >
              {providerOptions.map((opt) => (
                <MenuItem key={opt.code} value={opt.code}>
                  {opt.deprecated ? `${opt.label} (deprecated)` : opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Region"
              value={data.region}
              onChange={(e) => onChange({ region: e.target.value })}
              disabled={readOnly || disabled}
            />
          </>
        )}
        <Autocomplete
          value={countryValue}
          options={COUNTRY_OPTIONS}
          disabled={readOnly || disabled}
          onChange={(_, option) => onChange({ country_iso: option?.code ?? '' })}
          getOptionLabel={(opt) => `${opt.name} (${opt.code})`}
          renderInput={(params) => (
            <TextField {...params} label="Country" InputLabelProps={{ shrink: true }} />
          )}
        />
        <TextField
          label="City"
          value={data.city}
          onChange={(e) => onChange({ city: e.target.value })}
          disabled={readOnly || disabled}
        />
        <TextField
          label="Additional info"
          value={data.additional_info}
          onChange={(e) => onChange({ additional_info: e.target.value })}
          disabled={readOnly || disabled}
          multiline
          minRows={3}
        />
      </Stack>
    </Stack>
  );
}
