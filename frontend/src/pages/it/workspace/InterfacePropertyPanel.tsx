import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import ApplicationSelect from '../../../components/fields/ApplicationSelect';
import BusinessProcessSelect from '../../../components/fields/BusinessProcessSelect';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import TeamMemberMultiSelect from '../../../components/fields/TeamMemberMultiSelect';
import { COUNTRY_OPTIONS, type CountryOption } from '../../../constants/isoOptions';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import type {
  ApplicationOption,
  InterfaceDataResidency,
  InterfaceDetail,
  InterfaceOwner,
} from '../components/interface-workspace/types';

export type InterfacePropertyPanelSection = 'core' | 'team' | 'data-compliance';

type Props = {
  canManage: boolean;
  data: InterfaceDetail | null;
  focusSection?: InterfacePropertyPanelSection | null;
  isCreate: boolean;
  onPatch: (patch: Partial<InterfaceDetail>) => Promise<void>;
  onReplaceDataResidency: (codes: string[]) => Promise<void>;
  onReplaceOwners: (ownerType: 'business' | 'it', userIds: string[]) => Promise<void>;
};

const compactFieldSx = {
  '& .MuiFormLabel-root': {
    fontSize: '0.9rem',
  },
  '& .MuiInputBase-root': {
    fontSize: '0.9rem',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.9rem',
  },
  '& .MuiChip-root': {
    fontSize: '0.78rem',
    height: 24,
  },
};

const accordionSx = {
  '&:before': { display: 'none' },
  bgcolor: 'transparent',
};

function SectionHeading({ title }: { title: string }) {
  return (
    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
  );
}

type TeamMemberValue = {
  user_id: string;
  user_display_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

export default function InterfacePropertyPanel({
  canManage,
  data,
  focusSection = null,
  isCreate,
  onPatch,
  onReplaceDataResidency,
  onReplaceOwners,
}: Props) {
  const { t } = useTranslation(['it', 'common']);
  const { byField } = useItOpsEnumOptions();
  const [panelError, setPanelError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<InterfacePropertyPanelSection[]>(() => (
    focusSection ? ['core', focusSection] : ['core']
  ));
  const [interfaceIdDraft, setInterfaceIdDraft] = React.useState(data?.interface_id || '');
  const [nameDraft, setNameDraft] = React.useState(data?.name || '');
  const [businessPurposeDraft, setBusinessPurposeDraft] = React.useState(data?.business_purpose || '');
  const owners = (data?.owners || []) as InterfaceOwner[];
  const residency = (data?.data_residency || []) as InterfaceDataResidency[];

  const coreFieldsDisabled = !isCreate && !canManage;

  const { data: etlAppsData, isLoading: loadingEtlApps } = useQuery({
    queryKey: ['applications', 'select', 'etl-middleware'],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 500, sort: 'name:ASC' };
      params.filters = JSON.stringify({ etl_enabled: { type: 'equals', filter: true } });
      const res = await api.get<{ items: ApplicationOption[] }>('/applications', { params });
      return res.data.items || [];
    },
  });

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

  React.useEffect(() => {
    if (!focusSection) return;
    setExpanded((prev) => (prev.includes(focusSection) ? prev : [...prev, focusSection]));
  }, [focusSection]);

  React.useEffect(() => {
    setInterfaceIdDraft(data?.interface_id || '');
  }, [data?.id, data?.interface_id]);

  React.useEffect(() => {
    setNameDraft(data?.name || '');
  }, [data?.id, data?.name]);

  React.useEffect(() => {
    setBusinessPurposeDraft(data?.business_purpose || '');
  }, [data?.id, data?.business_purpose]);

  const etlApps = React.useMemo(() => (etlAppsData || []) as ApplicationOption[], [etlAppsData]);
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

  const routeOptions = React.useMemo(() => [
    { label: 'Direct', value: 'direct' },
    { label: 'Via middleware', value: 'via_middleware' },
  ], []);

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

  const runPersist = React.useCallback(async (action: () => Promise<void>) => {
    setPanelError(null);
    try {
      await action();
    } catch (panelSaveError: any) {
      setPanelError(getApiErrorMessage(panelSaveError, t, t('messages.saveInterfaceFailed')));
    }
  }, [t]);

  const handleAccordionChange = (section: InterfacePropertyPanelSection) => (
    _: React.SyntheticEvent,
    isExpanded: boolean,
  ) => {
    setExpanded((prev) => (
      isExpanded ? [...prev, section] : prev.filter((entry) => entry !== section)
    ));
  };

  return (
    <Stack spacing={1.5} sx={compactFieldSx}>
      {!!panelError && <Alert severity="error">{panelError}</Alert>}

      <Accordion
        disableGutters
        expanded={expanded.includes('core')}
        onChange={handleAccordionChange('core')}
        elevation={0}
        sx={accordionSx}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeading title="Core properties" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <TextField
              label="Interface ID"
              value={interfaceIdDraft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setInterfaceIdDraft(nextValue);
                if (isCreate) {
                  void onPatch({ interface_id: nextValue });
                }
              }}
              onBlur={() => {
                if (!coreFieldsDisabled && !isCreate && interfaceIdDraft !== (data?.interface_id || '')) {
                  void runPersist(() => onPatch({ interface_id: interfaceIdDraft }));
                }
              }}
              size="small"
              required
              fullWidth
              disabled={coreFieldsDisabled}
            />

            <TextField
              label="Name"
              value={nameDraft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setNameDraft(nextValue);
                if (isCreate) {
                  void onPatch({ name: nextValue });
                }
              }}
              onBlur={() => {
                if (!coreFieldsDisabled && !isCreate && nameDraft !== (data?.name || '')) {
                  void runPersist(() => onPatch({ name: nameDraft }));
                }
              }}
              size="small"
              required
              fullWidth
              disabled={coreFieldsDisabled}
            />

            <TextField
              label="Business purpose"
              helperText="Short searchable summary kept on the interface row."
              value={businessPurposeDraft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setBusinessPurposeDraft(nextValue);
                if (isCreate) {
                  void onPatch({ business_purpose: nextValue });
                }
              }}
              onBlur={() => {
                if (!coreFieldsDisabled && !isCreate && businessPurposeDraft !== (data?.business_purpose || '')) {
                  void runPersist(() => onPatch({ business_purpose: businessPurposeDraft }));
                }
              }}
              size="small"
              required
              multiline
              minRows={2}
              fullWidth
              disabled={coreFieldsDisabled}
            />

            <BusinessProcessSelect
              label="Business process"
              value={data?.business_process_id || null}
              onChange={(value) => {
                void runPersist(() => onPatch({ business_process_id: value || null }));
              }}
              disabled={coreFieldsDisabled}
            />

            <EnumAutocomplete
              label="Lifecycle"
              value={data?.lifecycle || 'active'}
              onChange={(value) => {
                void runPersist(() => onPatch({ lifecycle: value }));
              }}
              options={lifecycleOptions}
              size="small"
              disabled={coreFieldsDisabled}
            />

            <EnumAutocomplete
              label="Criticality"
              value={data?.criticality || 'medium'}
              onChange={(value) => {
                void runPersist(() => onPatch({ criticality: value }));
              }}
              options={criticalityOptions}
              size="small"
              disabled={coreFieldsDisabled}
            />

            <ApplicationSelect
              label="Source application"
              value={data?.source_application_id || null}
              onChange={(value) => {
                void runPersist(() => onPatch({ source_application_id: value || '' }));
              }}
              required
              disabled={coreFieldsDisabled}
            />

            <ApplicationSelect
              label="Target application"
              value={data?.target_application_id || null}
              onChange={(value) => {
                void runPersist(() => onPatch({ target_application_id: value || '' }));
              }}
              required
              disabled={coreFieldsDisabled}
            />

            <EnumAutocomplete
              label="Integration route type"
              value={data?.integration_route_type || 'direct'}
              onChange={(value) => {
                void runPersist(() => onPatch({
                  integration_route_type: value as 'direct' | 'via_middleware',
                  ...(value === 'direct' ? { middleware_application_ids: [] } : {}),
                }));
              }}
              options={routeOptions}
              size="small"
              disabled={coreFieldsDisabled}
            />

            {data?.integration_route_type === 'via_middleware' && (
              <Autocomplete
                multiple
                size="small"
                options={etlApps}
                value={etlApps.filter((app) => (data?.middleware_application_ids || []).includes(app.id))}
                onChange={(_, value) => {
                  void runPersist(() => onPatch({
                    middleware_application_ids: value.map((item) => item.id),
                  }));
                }}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Middleware applications"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingEtlApps ? <CircularProgress color="inherit" size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                fullWidth
                disabled={coreFieldsDisabled}
              />
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {!isCreate && (
        <Accordion
          disableGutters
          expanded={expanded.includes('team')}
          onChange={handleAccordionChange('team')}
          elevation={0}
          sx={accordionSx}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SectionHeading title="Team" />
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <TeamMemberMultiSelect
                label="Business owners"
                value={enrichOwners('business')}
                onChange={async (userIds) => runPersist(() => onReplaceOwners('business', userIds))}
                disabled={!canManage}
              />

              <Divider />

              <TeamMemberMultiSelect
                label="IT owners"
                value={enrichOwners('it')}
                onChange={async (userIds) => runPersist(() => onReplaceOwners('it', userIds))}
                disabled={!canManage}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      <Accordion
        disableGutters
        expanded={expanded.includes('data-compliance')}
        onChange={handleAccordionChange('data-compliance')}
        elevation={0}
        sx={accordionSx}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeading title="Data & Compliance" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <EnumAutocomplete
              label="Data category"
              value={data?.data_category || ''}
              onChange={(value) => {
                void runPersist(() => onPatch({ data_category: value }));
              }}
              options={dataCategoryOptions}
              size="small"
              disabled={coreFieldsDisabled}
            />

            <EnumAutocomplete
              label="Data classification"
              value={data?.data_class || 'internal'}
              onChange={(value) => {
                void runPersist(() => onPatch({ data_class: value }));
              }}
              options={dataClassOptions}
              size="small"
              disabled={coreFieldsDisabled}
            />

            <FormControlLabel
              control={(
                <Checkbox
                  checked={!!data?.contains_pii}
                  onChange={(event) => {
                    void runPersist(() => onPatch({ contains_pii: event.target.checked }));
                  }}
                  disabled={coreFieldsDisabled}
                />
              )}
              label="Contains PII"
            />

            {data?.contains_pii && (
              <TextField
                label="PII description"
                value={data?.pii_description || ''}
                onChange={(event) => {
                  if (isCreate) {
                    void onPatch({ pii_description: event.target.value });
                  }
                }}
                onBlur={(event) => {
                  if (!coreFieldsDisabled && !isCreate) {
                    void runPersist(() => onPatch({ pii_description: event.target.value }));
                  }
                }}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={coreFieldsDisabled}
              />
            )}

            <Autocomplete
              multiple
              size="small"
              options={residencyOptions}
              value={residencyOptions.filter((option) => residencyCodes.includes(option.code))}
              onChange={(_, value) => {
                void runPersist(() => onReplaceDataResidency(value.map((item) => item.code)));
              }}
              getOptionLabel={(option) => `${option.name} (${option.code})`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Data residency"
                  placeholder="Add countries"
                />
              )}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              fullWidth
              disabled={coreFieldsDisabled}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
