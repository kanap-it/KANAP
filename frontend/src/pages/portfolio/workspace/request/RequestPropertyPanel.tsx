import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../../../api';
import UserSelect from '../../../../components/fields/UserSelect';
import CompanySelect from '../../../../components/fields/CompanySelect';
import DepartmentSelect from '../../../../components/fields/DepartmentSelect';
import DateEUField from '../../../../components/fields/DateEUField';
import EnumAutocomplete from '../../../../components/fields/EnumAutocomplete';
import TeamMemberMultiSelect from '../../../../components/fields/TeamMemberMultiSelect';
import { getApiErrorMessage } from '../../../../utils/apiErrorMessage';
import { getProjectStatusLabel } from '../../../../utils/portfolioI18n';
import DependencySelector from '../../components/DependencySelector';
import RequestRelationsPanel from '../../editors/RequestRelationsPanel';

type PanelSection = 'core' | 'team' | 'relations';

type RequestPropertyPanelProps = {
  canManage: boolean;
  categories: Array<{ id: string; name: string }>;
  form: any;
  focusSection?: Exclude<PanelSection, 'core'> | null;
  isCreate: boolean;
  onCategoryChange: (value: string) => void;
  onCompanyChange: (value: string | null) => void;
  onLocalUpdate: (updater: (prev: any) => any) => void;
  onNameChange: (value: string) => void;
  onRefetch: () => Promise<unknown>;
  onRequestorChange: (value: string | null) => void;
  onSourceChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onStreamChange: (value: string) => void;
  onUpdate: (patch: any) => void;
  sources: Array<{ id: string; name: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  streams: Array<{ id: string; name: string; category_id: string }>;
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

export default function RequestPropertyPanel({
  canManage,
  categories,
  form,
  focusSection = null,
  isCreate,
  onCategoryChange,
  onCompanyChange,
  onLocalUpdate,
  onNameChange,
  onRefetch,
  onRequestorChange,
  onSourceChange,
  onStatusChange,
  onStreamChange,
  onUpdate,
  sources,
  statusOptions,
  streams,
}: RequestPropertyPanelProps) {
  const { t } = useTranslation(['portfolio', 'errors']);
  const navigate = useNavigate();
  const [nameDraft, setNameDraft] = React.useState(form?.name || '');
  const coreFieldsDisabled = !isCreate && !canManage;
  const [expanded, setExpanded] = React.useState<PanelSection[]>(() => (
    focusSection === 'relations'
      ? ['core', 'relations']
      : focusSection === 'team'
        ? ['core', 'team']
        : ['core']
  ));
  const [relationsActivated, setRelationsActivated] = React.useState(() => focusSection === 'relations');
  const [panelError, setPanelError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!focusSection) return;
    setExpanded((prev) => (prev.includes(focusSection) ? prev : [...prev, focusSection]));
  }, [focusSection]);

  React.useEffect(() => {
    if (expanded.includes('relations')) {
      setRelationsActivated(true);
    }
  }, [expanded]);

  React.useEffect(() => {
    setNameDraft(form?.name || '');
  }, [form?.id, form?.name]);

  const handleAccordionChange = (section: PanelSection) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded((prev) => (
      isExpanded ? [...prev, section] : prev.filter((entry) => entry !== section)
    ));
  };

  const handleImmediateSave = React.useCallback(async (
    action: () => Promise<void>,
    optimisticUpdate?: (prev: any) => any,
    refetchOnSuccess = false,
  ) => {
    setPanelError(null);
    if (optimisticUpdate) {
      onLocalUpdate(optimisticUpdate);
    }
    try {
      await action();
      if (refetchOnSuccess) {
        await onRefetch();
      }
    } catch (error: any) {
      setPanelError(
        getApiErrorMessage(error, t, t('workspace.request.messages.savePanelFailed')),
      );
      await onRefetch();
    }
  }, [onLocalUpdate, onRefetch, t]);

  const filteredStreams = React.useMemo(() => {
    if (!form?.category_id) return [];
    return streams.filter((stream) => stream.category_id === form.category_id);
  }, [form?.category_id, streams]);

  return (
    <Stack spacing={1.5}>
      {!!panelError && <Alert severity="error">{panelError}</Alert>}

      <Accordion
        disableGutters
        expanded={expanded.includes('core')}
        onChange={handleAccordionChange('core')}
        elevation={0}
        sx={accordionSx}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeading title={t('workspace.request.sections.core')} />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5} sx={compactFieldSx}>
            <TextField
              label={t('workspace.request.fields.requestName')}
              value={nameDraft}
              disabled={coreFieldsDisabled}
              onChange={(event) => {
                const nextValue = event.target.value;
                setNameDraft(nextValue);
                if (isCreate) {
                  onNameChange(nextValue);
                }
              }}
              onBlur={() => {
                if (!coreFieldsDisabled && !isCreate && nameDraft !== (form?.name || '')) {
                  onNameChange(nameDraft);
                }
              }}
              required
              size="small"
              fullWidth
            />

            {!isCreate && (
              <EnumAutocomplete
                label={t('workspace.request.fields.status')}
                value={form?.status || 'pending_review'}
                onChange={onStatusChange}
                options={statusOptions}
                disabled={coreFieldsDisabled}
                size="small"
              />
            )}

            <EnumAutocomplete
              label={t('workspace.request.fields.source')}
              value={form?.source_id || ''}
              onChange={onSourceChange}
              options={sources.map((source) => ({ value: source.id, label: source.name }))}
              disabled={coreFieldsDisabled}
              size="small"
            />

            <EnumAutocomplete
              label={t('workspace.request.fields.category')}
              value={form?.category_id || ''}
              onChange={onCategoryChange}
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
              disabled={coreFieldsDisabled}
              size="small"
            />

            <EnumAutocomplete
              label={t('workspace.request.fields.stream')}
              value={form?.stream_id || ''}
              onChange={onStreamChange}
              options={filteredStreams.map((stream) => ({ value: stream.id, label: stream.name }))}
              disabled={coreFieldsDisabled || !form?.category_id}
              size="small"
            />

            <UserSelect
              label={t('workspace.request.fields.requestor')}
              value={form?.requestor_id || null}
              onChange={onRequestorChange}
              disabled={coreFieldsDisabled}
              size="small"
            />

            <CompanySelect
              label={t('workspace.request.fields.company')}
              value={form?.company_id || null}
              onChange={onCompanyChange}
              disabled={coreFieldsDisabled}
              size="small"
            />

            <DepartmentSelect
              label={t('workspace.request.fields.department')}
              companyId={form?.company_id || undefined}
              value={form?.department_id || null}
              onChange={(value) => onUpdate({ department_id: value })}
              disabled={coreFieldsDisabled}
              size="small"
            />

            <DateEUField
              label={t('workspace.request.fields.targetDeliveryDate')}
              valueYmd={form?.target_delivery_date || ''}
              onChangeYmd={(value) => onUpdate({ target_delivery_date: value })}
              disabled={coreFieldsDisabled}
              size="small"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {!isCreate && (
        <>
          <Divider />
          <Accordion
            disableGutters
            expanded={expanded.includes('team')}
            onChange={handleAccordionChange('team')}
            elevation={0}
            sx={accordionSx}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <SectionHeading title={t('workspace.request.sections.team')} />
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5} sx={compactFieldSx}>
                <UserSelect
                  label={t('workspace.request.fields.businessSponsor')}
                  value={form?.business_sponsor_id || null}
                  onChange={(value) => handleImmediateSave(
                    () => api.patch(`/portfolio/requests/${form.id}`, { business_sponsor_id: value }),
                    (prev) => ({ ...prev, business_sponsor_id: value }),
                  )}
                  disabled={!canManage}
                  size="small"
                />

                <UserSelect
                  label={t('workspace.request.fields.businessLead')}
                  value={form?.business_lead_id || null}
                  onChange={(value) => handleImmediateSave(
                    () => api.patch(`/portfolio/requests/${form.id}`, { business_lead_id: value }),
                    (prev) => ({ ...prev, business_lead_id: value }),
                  )}
                  disabled={!canManage}
                  size="small"
                />

                <UserSelect
                  label={t('workspace.request.fields.itSponsor')}
                  value={form?.it_sponsor_id || null}
                  onChange={(value) => handleImmediateSave(
                    () => api.patch(`/portfolio/requests/${form.id}`, { it_sponsor_id: value }),
                    (prev) => ({ ...prev, it_sponsor_id: value }),
                  )}
                  disabled={!canManage}
                  size="small"
                />

                <UserSelect
                  label={t('workspace.request.fields.itLead')}
                  value={form?.it_lead_id || null}
                  onChange={(value) => handleImmediateSave(
                    () => api.patch(`/portfolio/requests/${form.id}`, { it_lead_id: value }),
                    (prev) => ({ ...prev, it_lead_id: value }),
                  )}
                  disabled={!canManage}
                  size="small"
                />

                <Divider />

                <TeamMemberMultiSelect
                  label={t('workspace.request.fields.businessContributors')}
                  value={form?.business_team || []}
                  onChange={(userIds) => handleImmediateSave(
                    () => api.post(`/portfolio/requests/${form.id}/business-team/bulk-replace`, {
                      user_ids: userIds,
                    }),
                    undefined,
                    true,
                  )}
                  disabled={!canManage}
                />

                <TeamMemberMultiSelect
                  label={t('workspace.request.fields.itContributors')}
                  value={form?.it_team || []}
                  onChange={(userIds) => handleImmediateSave(
                    () => api.post(`/portfolio/requests/${form.id}/it-team/bulk-replace`, {
                      user_ids: userIds,
                    }),
                    undefined,
                    true,
                  )}
                  disabled={!canManage}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {!isCreate && form?.id && (
        <>
          <Divider />
          <Accordion
            disableGutters
            expanded={expanded.includes('relations')}
            onChange={handleAccordionChange('relations')}
            elevation={0}
            sx={accordionSx}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <SectionHeading title={t('workspace.request.sections.relations')} />
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5} sx={compactFieldSx}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    {t('workspace.request.sections.dependencies')}
                  </Typography>
                  <DependencySelector
                    entityType="request"
                    entityId={form.id}
                    dependencies={form?.dependencies || []}
                    onAdd={(target) => handleImmediateSave(
                      () => api.post(`/portfolio/requests/${form.id}/dependencies`, {
                        target_type: target.type,
                        target_id: target.id,
                      }),
                      (prev) => ({
                        ...prev,
                        dependencies: [
                          ...(Array.isArray(prev?.dependencies) ? prev.dependencies : []),
                          {
                            id: `optimistic:${target.type}:${target.id}`,
                            target_type: target.type,
                            target_id: target.id,
                            target_name: target.name,
                            target_status: '',
                          },
                        ],
                      }),
                    )}
                    onRemove={(targetType, targetId) => handleImmediateSave(
                      () => api.delete(`/portfolio/requests/${form.id}/dependencies/${targetType}/${targetId}`),
                      (prev) => ({
                        ...prev,
                        dependencies: (Array.isArray(prev?.dependencies) ? prev.dependencies : []).filter(
                          (dep: any) => !(dep?.target_type === targetType && dep?.target_id === targetId),
                        ),
                      }),
                    )}
                    disabled={!canManage}
                  />
                </Box>

                <Divider />

                {relationsActivated ? (
                  <RequestRelationsPanel
                    id={form.id}
                    autoSave
                  />
                ) : null}

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    {t('workspace.request.sections.resultingProjects')}
                  </Typography>
                  {form?.resulting_projects?.length > 0 ? (
                    <Stack spacing={1}>
                      {form.resulting_projects.map((project: any) => (
                        <Box
                          key={project.id}
                          component="button"
                          type="button"
                          onClick={() => navigate(`/portfolio/projects/${project.id}/summary`)}
                          sx={{
                            border: 0,
                            background: 'transparent',
                            p: 0,
                            textAlign: 'left',
                            color: 'text.primary',
                            cursor: 'pointer',
                            font: 'inherit',
                          }}
                        >
                          <Typography variant="body2">
                            {project.name} ({getProjectStatusLabel(t, project.status)})
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('workspace.request.messages.noResultingProjects')}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Stack>
  );
}
