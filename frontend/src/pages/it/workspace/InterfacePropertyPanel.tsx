import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import BusinessProcessSelect from '../../../components/fields/BusinessProcessSelect';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import TeamMemberMultiSelect from '../../../components/fields/TeamMemberMultiSelect';
import { PropertyGroup, PropertyRow } from '../../../components/design';
import { COUNTRY_OPTIONS, type CountryOption } from '../../../constants/isoOptions';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';
import { drawerFieldValueSx } from '../../../theme/formSx';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import type {
  InterfaceCompany,
  InterfaceDataResidency,
  InterfaceDetail,
  InterfaceOwner,
} from '../components/interface-workspace/types';

type CompanyOption = {
  id: string;
  name: string;
};

type TeamMemberValue = {
  user_id: string;
  user_display_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type Props = {
  canManage: boolean;
  data: InterfaceDetail | null;
  isCreate: boolean;
  onPatch: (patch: Partial<InterfaceDetail>) => Promise<void>;
  onReplaceCompanies: (companyIds: string[]) => Promise<void>;
  onReplaceDataResidency: (codes: string[]) => Promise<void>;
  onReplaceOwners: (ownerType: 'business' | 'it', userIds: string[]) => Promise<void>;
};

function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return 'Not set';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 13, color: 'kanap.text.primary', minHeight: 26, display: 'flex', alignItems: 'center' }}>
      {children}
    </Typography>
  );
}

export default function InterfacePropertyPanel({
  canManage,
  data,
  isCreate,
  onPatch,
  onReplaceCompanies,
  onReplaceDataResidency,
  onReplaceOwners,
}: Props) {
  const { t } = useTranslation(['it', 'common']);
  const { byField } = useItOpsEnumOptions();
  const [panelError, setPanelError] = React.useState<string | null>(null);
  const [interfaceIdDraft, setInterfaceIdDraft] = React.useState(data?.interface_id || '');
  const [piiDescriptionDraft, setPiiDescriptionDraft] = React.useState(data?.pii_description || '');
  const owners = (data?.owners || []) as InterfaceOwner[];
  const companies = (data?.companies || []) as InterfaceCompany[];
  const residency = (data?.data_residency || []) as InterfaceDataResidency[];
  const disabled = !canManage;

  const { data: users } = useQuery({
    queryKey: ['users-for-team-select'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { status: 'enabled', limit: 1000 } });
      return (res.data?.items || []) as Array<{
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email: string;
      }>;
    },
    enabled: !isCreate,
  });

  const { data: companyOptionsData = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies', 'active'],
    queryFn: async () => {
      const res = await api.get<{ items: CompanyOption[] }>('/companies', { params: { limit: 1000 } });
      return res.data.items || [];
    },
    enabled: !isCreate,
  });

  React.useEffect(() => {
    setInterfaceIdDraft(data?.interface_id || '');
  }, [data?.id, data?.interface_id]);

  React.useEffect(() => {
    setPiiDescriptionDraft(data?.pii_description || '');
  }, [data?.id, data?.pii_description]);

  const runPersist = React.useCallback(async (action: () => Promise<void>) => {
    setPanelError(null);
    try {
      await action();
    } catch (panelSaveError: any) {
      setPanelError(getApiErrorMessage(panelSaveError, t, t('messages.saveInterfaceFailed')));
    }
  }, [t]);

  const companyOptions = React.useMemo(() => (
    [...companyOptionsData].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  ), [companyOptionsData]);

  const userById = React.useMemo(() => {
    const map = new Map<string, { first_name?: string | null; last_name?: string | null; email: string }>();
    for (const user of users || []) {
      map.set(user.id, user);
    }
    return map;
  }, [users]);

  const enrichOwners = React.useCallback((ownerType: 'business' | 'it'): TeamMemberValue[] => {
    return owners
      .filter((owner) => owner.owner_type === ownerType)
      .map((owner) => {
        const user = userById.get(owner.user_id);
        const firstName = user?.first_name || '';
        const lastName = user?.last_name || '';
        const displayName = [firstName, lastName].filter(Boolean).join(' ');
        return {
          user_id: owner.user_id,
          user_display_name: displayName || user?.email || owner.user_id,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          email: user?.email,
        };
      });
  }, [owners, userById]);

  const dataClassOptions = React.useMemo(() => {
    const list = byField.dataClass || [];
    const base = list.filter((item) => !item.deprecated).map((item) => ({ label: item.label, value: item.code }));
    const current = data?.data_class || 'internal';
    return list.some((item) => item.code === current) || !current
      ? base
      : [...base, { label: current, value: current }];
  }, [byField.dataClass, data?.data_class]);

  const dataCategoryOptions = React.useMemo(() => {
    const list = byField.interfaceDataCategory || [];
    const base = list.filter((item) => !item.deprecated).map((item) => ({ label: item.label, value: item.code }));
    const current = data?.data_category || '';
    return list.some((item) => item.code === current) || !current
      ? base
      : [...base, { label: current, value: current }];
  }, [byField.interfaceDataCategory, data?.data_category]);

  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    const current = data?.lifecycle;
    const options = list.map((item) => ({
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
      value: item.code,
      deprecated: !!item.deprecated,
    }));
    if (current && !options.some((item) => item.value === current)) {
      options.push({ label: current, value: current, deprecated: false });
    }
    return options.filter((item) => !item.deprecated || item.value === current);
  }, [byField.lifecycleStatus, data?.lifecycle]);

  const criticalityOptions = React.useMemo(() => [
    { label: t('enums.criticality.businessCritical'), value: 'business_critical' },
    { label: t('enums.criticality.high'), value: 'high' },
    { label: t('enums.criticality.medium'), value: 'medium' },
    { label: t('enums.criticality.low'), value: 'low' },
  ], [t]);

  const residencyCodes = React.useMemo(
    () => residency.map((item) => String(item.country_iso || '').toUpperCase()).filter((item) => item.length === 2),
    [residency],
  );

  const residencyOptions = React.useMemo<CountryOption[]>(() => {
    const extras = residencyCodes
      .filter((code) => !COUNTRY_OPTIONS.some((option) => option.code === code))
      .map((code) => ({ code, name: `Unknown (${code})` }));
    return [...COUNTRY_OPTIONS, ...extras];
  }, [residencyCodes]);

  const selectedCompanies = React.useMemo(() => {
    const companyIds = companies.map((row) => row.company_id).filter(Boolean);
    return companyIds
      .map((id) => companyOptions.find((company) => company.id === id) || { id, name: id })
      .filter(Boolean);
  }, [companies, companyOptions]);

  return (
    <>
      {!!panelError && (
        <PropertyGroup>
          <Alert severity="error">{panelError}</Alert>
        </PropertyGroup>
      )}

      <PropertyGroup>
        {!isCreate && (
          <PropertyRow label="Reference">
            <ReadOnlyValue>{data?.interface_reference || 'Assigned on create'}</ReadOnlyValue>
          </PropertyRow>
        )}
        <PropertyRow label="Interface code">
          <TextField
            value={interfaceIdDraft}
            onChange={(event) => {
              const nextValue = event.target.value;
              setInterfaceIdDraft(nextValue);
              if (isCreate) {
                void onPatch({ interface_id: nextValue });
              }
            }}
            onBlur={() => {
              if (!disabled && !isCreate && interfaceIdDraft !== (data?.interface_id || '')) {
                void runPersist(() => onPatch({ interface_id: interfaceIdDraft }));
              }
            }}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={drawerFieldValueSx}
            placeholder="e.g., ERP-ORDERS-SYNC"
            disabled={disabled}
          />
        </PropertyRow>
        <PropertyRow label="Business process">
          <BusinessProcessSelect
            value={data?.business_process_id || null}
            onChange={(value) => {
              void runPersist(() => onPatch({ business_process_id: value || null }));
            }}
            disabled={disabled}
            hideLabel
            textFieldSx={drawerFieldValueSx}
            placeholder="Select process"
          />
        </PropertyRow>
        <PropertyRow label="Lifecycle">
          <EnumAutocomplete
            label="Lifecycle"
            value={data?.lifecycle || 'active'}
            onChange={(value) => {
              void runPersist(() => onPatch({ lifecycle: value }));
            }}
            options={lifecycleOptions}
            size="small"
            hideLabel
            textFieldSx={drawerFieldValueSx}
            disabled={disabled}
          />
        </PropertyRow>
        {!isCreate && (
          <>
            <PropertyRow label="Created">
              <ReadOnlyValue>{formatShortDate(data?.created_at)}</ReadOnlyValue>
            </PropertyRow>
            <PropertyRow label="Updated">
              <ReadOnlyValue>{formatShortDate(data?.updated_at)}</ReadOnlyValue>
            </PropertyRow>
          </>
        )}
      </PropertyGroup>

      {!isCreate && (
        <PropertyGroup>
          <PropertyRow label="Business owners">
            <TeamMemberMultiSelect
              label="Business owners"
              value={enrichOwners('business')}
              onChange={async (userIds) => runPersist(() => onReplaceOwners('business', userIds))}
              disabled={!canManage}
              hideLabel
              textFieldSx={drawerFieldValueSx}
            />
          </PropertyRow>
          <PropertyRow label="IT owners">
            <TeamMemberMultiSelect
              label="IT owners"
              value={enrichOwners('it')}
              onChange={async (userIds) => runPersist(() => onReplaceOwners('it', userIds))}
              disabled={!canManage}
              hideLabel
              textFieldSx={drawerFieldValueSx}
            />
          </PropertyRow>
          <PropertyRow label="Impacted companies">
            <Autocomplete
              multiple
              size="small"
              options={companyOptions}
              loading={loadingCompanies}
              value={selectedCompanies}
              onChange={(_, value) => {
                void runPersist(() => onReplaceCompanies(value.map((item) => item.id)));
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.name}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  InputProps={{ ...params.InputProps, disableUnderline: true }}
                  sx={drawerFieldValueSx}
                  placeholder="Add companies"
                />
              )}
              disabled={!canManage || loadingCompanies}
            />
          </PropertyRow>
        </PropertyGroup>
      )}

      <PropertyGroup>
        <PropertyRow label="Criticality">
          <EnumAutocomplete
            label="Criticality"
            value={data?.criticality || 'medium'}
            onChange={(value) => {
              void runPersist(() => onPatch({ criticality: value as InterfaceDetail['criticality'] }));
            }}
            options={criticalityOptions}
            size="small"
            hideLabel
            textFieldSx={drawerFieldValueSx}
            disabled={disabled}
          />
        </PropertyRow>
        <PropertyRow label="Data category" required>
          <EnumAutocomplete
            label="Data category"
            value={data?.data_category || ''}
            onChange={(value) => {
              void runPersist(() => onPatch({ data_category: value }));
            }}
            options={dataCategoryOptions}
            size="small"
            hideLabel
            textFieldSx={drawerFieldValueSx}
            disabled={disabled}
          />
        </PropertyRow>
        <PropertyRow label="Data class">
          <EnumAutocomplete
            label="Data class"
            value={data?.data_class || 'internal'}
            onChange={(value) => {
              void runPersist(() => onPatch({ data_class: value }));
            }}
            options={dataClassOptions}
            size="small"
            hideLabel
            textFieldSx={drawerFieldValueSx}
            disabled={disabled}
          />
        </PropertyRow>
        <PropertyRow label="Contains PII">
          <Box sx={{ minHeight: 26, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              size="small"
              checked={!!data?.contains_pii}
              onChange={(event) => {
                void runPersist(() => onPatch({ contains_pii: event.target.checked }));
              }}
              disabled={disabled}
            />
            <Typography sx={{ fontSize: 13, color: 'kanap.text.secondary' }}>
              {data?.contains_pii ? 'Yes' : 'No'}
            </Typography>
          </Box>
        </PropertyRow>
        {data?.contains_pii && (
          <PropertyRow label="PII description">
            <TextField
              value={piiDescriptionDraft}
              onChange={(event) => {
                const next = event.target.value;
                setPiiDescriptionDraft(next);
                if (isCreate) {
                  void onPatch({ pii_description: next });
                }
              }}
              onBlur={() => {
                if (!disabled && !isCreate && piiDescriptionDraft !== (data?.pii_description || '')) {
                  void runPersist(() => onPatch({ pii_description: piiDescriptionDraft || null }));
                }
              }}
              variant="standard"
              InputProps={{ disableUnderline: true }}
              sx={drawerFieldValueSx}
              placeholder="e.g., customer contact data"
              disabled={disabled}
              multiline
              minRows={2}
            />
          </PropertyRow>
        )}
        <PropertyRow label="Data residency">
          <Autocomplete
            multiple
            size="small"
            options={residencyOptions}
            value={residencyOptions.filter((option) => residencyCodes.includes(option.code))}
            onChange={(_, value) => {
              void runPersist(() => onReplaceDataResidency(value.map((item) => item.code)));
            }}
            getOptionLabel={(option) => `${option.name} (${option.code})`}
            isOptionEqualToValue={(option, value) => option.code === value.code}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                InputProps={{ ...params.InputProps, disableUnderline: true }}
                sx={drawerFieldValueSx}
                placeholder="Add countries"
              />
            )}
            renderOption={(props, option, state) => (
              <li {...props} key={option.code}>
                <Checkbox checked={state.selected} size="small" sx={{ mr: 1, p: 0.25 }} />
                {option.name} ({option.code})
              </li>
            )}
            fullWidth
            disabled={disabled}
          />
        </PropertyRow>
      </PropertyGroup>
    </>
  );
}
