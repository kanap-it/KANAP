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
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../../api';
import UserSelect from '../../../../components/fields/UserSelect';
import CompanySelect from '../../../../components/fields/CompanySelect';
import DepartmentSelect from '../../../../components/fields/DepartmentSelect';
import DateEUField from '../../../../components/fields/DateEUField';
import EnumAutocomplete from '../../../../components/fields/EnumAutocomplete';
import TeamMemberMultiSelect from '../../../../components/fields/TeamMemberMultiSelect';
import DependencySelector from '../../components/DependencySelector';
import ProjectRelationsPanel from '../../editors/ProjectRelationsPanel';

type PanelSection = 'core' | 'team' | 'relations';

type ProjectPropertyPanelProps = {
  canManage: boolean;
  categories: Array<{ id: string; name: string }>;
  form: any;
  focusSection?: Exclude<PanelSection, 'core'> | null;
  isCreate: boolean;
  onCategoryChange: (value: string) => void;
  onCompanyChange: (value: string | null) => void;
  onNameChange: (value: string) => void;
  onOriginChange: (value: string) => void;
  onPlannedEndChange: (value: string) => void;
  onPlannedStartChange: (value: string) => void;
  onRefetch: () => Promise<unknown>;
  onSourceChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onStreamChange: (value: string) => void;
  onUpdate: (patch: any) => void;
  originOptions: Array<{ value: string; label: string }>;
  originLabels: Record<string, string>;
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

export default function ProjectPropertyPanel({
  canManage,
  categories,
  form,
  focusSection = null,
  isCreate,
  onCategoryChange,
  onCompanyChange,
  onNameChange,
  onOriginChange,
  onPlannedEndChange,
  onPlannedStartChange,
  onRefetch,
  onSourceChange,
  onStatusChange,
  onStreamChange,
  onUpdate,
  originOptions,
  originLabels,
  sources,
  statusOptions,
  streams,
}: ProjectPropertyPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nameDraft, setNameDraft] = React.useState(form?.name || '');
  const [expanded, setExpanded] = React.useState<PanelSection[]>(() => (
    focusSection === 'relations'
      ? ['core', 'relations']
      : focusSection === 'team'
        ? ['core', 'team']
        : ['core']
  ));
  const [panelError, setPanelError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!focusSection) return;
    setExpanded((prev) => (prev.includes(focusSection) ? prev : [...prev, focusSection]));
  }, [focusSection]);

  React.useEffect(() => {
    setNameDraft(form?.name || '');
  }, [form?.id, form?.name]);

  const handleAccordionChange = (section: PanelSection) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded((prev) => (
      isExpanded ? [...prev, section] : prev.filter((entry) => entry !== section)
    ));
  };

  const handleImmediateSave = React.useCallback(async (action: () => Promise<void>) => {
    setPanelError(null);
    try {
      await action();
      await onRefetch();
    } catch (error: any) {
      setPanelError(error?.response?.data?.message || error?.message || 'Failed to update project details');
    }
  }, [onRefetch]);

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
          <SectionHeading title="Core Properties" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5} sx={compactFieldSx}>
            <TextField
              label="Project Name"
              value={nameDraft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setNameDraft(nextValue);
                if (isCreate) {
                  onNameChange(nextValue);
                }
              }}
              onBlur={() => {
                if (!isCreate && nameDraft !== (form?.name || '')) {
                  onNameChange(nameDraft);
                }
              }}
              required
              size="small"
              fullWidth
            />

            {!isCreate && (
              <EnumAutocomplete
                label="Status"
                value={form?.status || 'waiting_list'}
                onChange={onStatusChange}
                options={statusOptions}
                size="small"
              />
            )}

            {isCreate ? (
              <EnumAutocomplete
                label="Origin"
                value={form?.origin || 'fast_track'}
                onChange={onOriginChange}
                options={originOptions}
                size="small"
              />
            ) : (
              <TextField
                label="Origin"
                value={originLabels[form?.origin] || form?.origin || ''}
                size="small"
                disabled
                fullWidth
              />
            )}

            <EnumAutocomplete
              label="Source"
              value={form?.source_id || ''}
              onChange={onSourceChange}
              options={sources.map((source) => ({ value: source.id, label: source.name }))}
              size="small"
            />

            <EnumAutocomplete
              label="Category"
              value={form?.category_id || ''}
              onChange={onCategoryChange}
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
              size="small"
            />

            <EnumAutocomplete
              label="Stream"
              value={form?.stream_id || ''}
              onChange={onStreamChange}
              options={filteredStreams.map((stream) => ({ value: stream.id, label: stream.name }))}
              disabled={!form?.category_id}
              size="small"
            />

            <CompanySelect
              label="Company"
              value={form?.company_id || null}
              onChange={onCompanyChange}
              size="small"
            />

            <DepartmentSelect
              label="Department"
              companyId={form?.company_id || undefined}
              value={form?.department_id || null}
              onChange={(value) => onUpdate({ department_id: value })}
              size="small"
            />

            <DateEUField
              label="Planned Start"
              valueYmd={form?.planned_start || ''}
              onChangeYmd={onPlannedStartChange}
              size="small"
            />

            <DateEUField
              label="Planned End"
              valueYmd={form?.planned_end || ''}
              onChangeYmd={onPlannedEndChange}
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
              <SectionHeading title="Team" />
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5} sx={compactFieldSx}>
                <UserSelect
                  label="Business Sponsor"
                  value={form?.business_sponsor_id || null}
                  onChange={(value) => handleImmediateSave(() => api.patch(`/portfolio/projects/${form.id}`, { business_sponsor_id: value }))}
                  disabled={!canManage}
                  size="small"
                />

                <UserSelect
                  label="Business Lead"
                  value={form?.business_lead_id || null}
                  onChange={(value) => handleImmediateSave(async () => {
                    await api.patch(`/portfolio/projects/${form.id}`, { business_lead_id: value });
                    await queryClient.invalidateQueries({ queryKey: ['project-effort-allocations', form.id, 'business'] });
                  })}
                  disabled={!canManage}
                  size="small"
                />

                <UserSelect
                  label="IT Sponsor"
                  value={form?.it_sponsor_id || null}
                  onChange={(value) => handleImmediateSave(() => api.patch(`/portfolio/projects/${form.id}`, { it_sponsor_id: value }))}
                  disabled={!canManage}
                  size="small"
                />

                <UserSelect
                  label="IT Lead"
                  value={form?.it_lead_id || null}
                  onChange={(value) => handleImmediateSave(async () => {
                    await api.patch(`/portfolio/projects/${form.id}`, { it_lead_id: value });
                    await queryClient.invalidateQueries({ queryKey: ['project-effort-allocations', form.id, 'it'] });
                  })}
                  disabled={!canManage}
                  size="small"
                />

                <Divider />

                <TeamMemberMultiSelect
                  label="Business Contributors"
                  value={form?.business_team || []}
                  onChange={(userIds) => handleImmediateSave(async () => {
                    await api.post(`/portfolio/projects/${form.id}/business-team/bulk-replace`, {
                      user_ids: userIds,
                    });
                    await queryClient.invalidateQueries({ queryKey: ['project-effort-allocations', form.id, 'business'] });
                  })}
                  disabled={!canManage}
                />

                <TeamMemberMultiSelect
                  label="IT Contributors"
                  value={form?.it_team || []}
                  onChange={(userIds) => handleImmediateSave(async () => {
                    await api.post(`/portfolio/projects/${form.id}/it-team/bulk-replace`, {
                      user_ids: userIds,
                    });
                    await queryClient.invalidateQueries({ queryKey: ['project-effort-allocations', form.id, 'it'] });
                  })}
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
              <SectionHeading title="Relations" />
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5} sx={compactFieldSx}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Dependencies
                  </Typography>
                  <DependencySelector
                    entityType="project"
                    entityId={form.id}
                    dependencies={form?.dependencies || []}
                    onAdd={(targetType, targetId) => handleImmediateSave(() => api.post(`/portfolio/projects/${form.id}/dependencies`, {
                      target_type: targetType,
                      target_id: targetId,
                    }))}
                    onRemove={(targetType, targetId) => handleImmediateSave(() => api.delete(`/portfolio/projects/${form.id}/dependencies/${targetType}/${targetId}`))}
                    disabled={!canManage}
                  />
                </Box>

                <Divider />

                <ProjectRelationsPanel
                  id={form.id}
                  autoSave
                />

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Source Requests
                  </Typography>
                  {form?.source_requests?.length > 0 ? (
                    <Stack spacing={1}>
                      {form.source_requests.map((request: any) => (
                        <Box
                          key={request.id}
                          component="button"
                          type="button"
                          onClick={() => navigate(`/portfolio/requests/${request.id}/summary`)}
                          sx={{
                            border: 0,
                            background: 'transparent',
                            p: 0,
                            textAlign: 'left',
                            color: 'primary.main',
                            cursor: 'pointer',
                            font: 'inherit',
                          }}
                        >
                          <Typography variant="body2">
                            {request.name} ({request.status})
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No source requests linked.
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
