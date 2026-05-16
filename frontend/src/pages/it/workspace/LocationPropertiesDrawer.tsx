import React from 'react';
import { Autocomplete, MenuItem, TextField } from '@mui/material';
import { PropertyGroup, PropertyRow } from '../../../components/design/PropertyRow';
import { drawerSelectSx, drawerMenuItemSx, drawerFieldValueSx } from '../../../theme/formSx';
import CompanySelect from '../../../components/fields/CompanySelect';
import { COUNTRY_OPTIONS, CountryOption } from '../../../constants/isoOptions';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';

export type LocationDrawerData = {
  hosting_type: string;
  operating_company_id: string | null;
  provider: string | null;
  region: string | null;
  country_iso: string | null;
  city: string | null;
};

type Props = {
  data: LocationDrawerData;
  category: 'on_prem' | 'cloud';
  disabled?: boolean;
  onHostingTypeChange: (next: string) => void;
  onOperatingCompanyChange: (companyId: string | null) => void;
  onProviderChange: (next: string) => void;
  onRegionChange: (next: string) => void;
  onCountryChange: (iso: string) => void;
  onCityChange: (next: string) => void;
};

export default function LocationPropertiesDrawer({
  data,
  category,
  disabled = false,
  onHostingTypeChange,
  onOperatingCompanyChange,
  onProviderChange,
  onRegionChange,
  onCountryChange,
  onCityChange,
}: Props) {
  const { byField } = useItOpsEnumOptions();
  const hostingOptions = byField.hostingType || [];
  const providerOptions = byField.serverProvider || [];

  const countryValue: CountryOption | null =
    COUNTRY_OPTIONS.find((opt) => opt.code === (data.country_iso || '').toUpperCase()) ??
    (data.country_iso
      ? { code: data.country_iso.toUpperCase(), name: `Unknown (${data.country_iso.toUpperCase()})` }
      : null);

  return (
    <>
      <PropertyGroup>
        <PropertyRow label="Hosting type" required>
          <TextField
            select
            value={data.hosting_type || ''}
            onChange={(e) => onHostingTypeChange(e.target.value)}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={drawerSelectSx}
            disabled={disabled}
          >
            {hostingOptions.map((opt) => (
              <MenuItem key={opt.code} value={opt.code} sx={drawerMenuItemSx}>
                {opt.deprecated ? `${opt.label} (deprecated)` : opt.label}
              </MenuItem>
            ))}
          </TextField>
        </PropertyRow>
        {category === 'on_prem' && (
          <PropertyRow label="Operating company">
            <CompanySelect
              value={data.operating_company_id}
              onChange={onOperatingCompanyChange}
              disabled={disabled}
              hideLabel
              textFieldSx={drawerFieldValueSx}
            />
          </PropertyRow>
        )}
        {category === 'cloud' && (
          <>
            <PropertyRow label="Cloud provider">
              <TextField
                select
                value={data.provider || ''}
                onChange={(e) => onProviderChange(e.target.value)}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={drawerSelectSx}
                disabled={disabled}
              >
                <MenuItem value="" sx={drawerMenuItemSx}>—</MenuItem>
                {providerOptions.map((opt) => (
                  <MenuItem key={opt.code} value={opt.code} sx={drawerMenuItemSx}>
                    {opt.deprecated ? `${opt.label} (deprecated)` : opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </PropertyRow>
            <PropertyRow label="Region">
              <TextField
                value={data.region || ''}
                onChange={(e) => onRegionChange(e.target.value)}
                onBlur={(e) => onRegionChange(e.target.value)}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={drawerFieldValueSx}
                placeholder="e.g., eu-west-1"
                disabled={disabled}
              />
            </PropertyRow>
          </>
        )}
      </PropertyGroup>

      <PropertyGroup>
        <PropertyRow label="Country">
          <Autocomplete
            value={countryValue}
            options={COUNTRY_OPTIONS}
            disabled={disabled}
            onChange={(_, option) => onCountryChange(option?.code ?? '')}
            getOptionLabel={(opt) => `${opt.name} (${opt.code})`}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                InputProps={{ ...params.InputProps, disableUnderline: true }}
                sx={drawerFieldValueSx}
                placeholder="Search countries"
              />
            )}
          />
        </PropertyRow>
        <PropertyRow label="City">
          <TextField
            value={data.city || ''}
            onChange={(e) => onCityChange(e.target.value)}
            onBlur={(e) => onCityChange(e.target.value)}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={drawerFieldValueSx}
            placeholder="e.g., Paris"
            disabled={disabled}
          />
        </PropertyRow>
      </PropertyGroup>
    </>
  );
}
