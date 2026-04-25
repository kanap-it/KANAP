import React from 'react';
import {
  Alert,
  Box,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../../../api';
import UserSelect from '../../../../components/fields/UserSelect';
import CompanySelect from '../../../../components/fields/CompanySelect';
import DepartmentSelect from '../../../../components/fields/DepartmentSelect';
import DateEUField from '../../../../components/fields/DateEUField';
import TeamMemberMultiSelect from '../../../../components/fields/TeamMemberMultiSelect';
import { PropertyGroup, PropertyRow } from '../../../../components/design';
import { drawerMenuItemSx, drawerSelectSx } from '../../../../theme/formSx';
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

const standardInputProps = { disableUnderline: true } as const;

export default function RequestPropertyPanel({
  canManage,
  categories,
  form,
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
  const { t } = useTranslation(['portfolio', 'common', 'errors']);
  const navigate = useNavigate();
  const [nameDraft, setNameDraft] = React.useState(form?.name || '');
  const coreFieldsDisabled = !isCreate && !canManage;
  const [panelError, setPanelError] = React.useState<string | null>(null);
  const noneLabel = t('common:labels.none');

  React.useEffect(() => {
    setNameDraft(form?.name || '');
  }, [form?.id, form?.name]);

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
    <Stack spacing={0}>
      {!!panelError && (
        <Box sx={{ px: '18px', pb: 1 }}>
          <Alert severity="error">{panelError}</Alert>
        </Box>
      )}

      <PropertyGroup>
        <PropertyRow label={t('workspace.request.fields.requestName')} required>
          <TextField
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
            variant="standard"
            InputProps={standardInputProps}
            required
            fullWidth
          />
        </PropertyRow>

        {!isCreate && (
          <PropertyRow label={t('workspace.request.fields.status')}>
            <Select
              value={form?.status || 'pending_review'}
              onChange={(event) => onStatusChange(String(event.target.value))}
              disabled={coreFieldsDisabled}
              variant="standard"
              disableUnderline
              sx={drawerSelectSx}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value} sx={drawerMenuItemSx}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </PropertyRow>
        )}

        <PropertyRow label={t('workspace.request.fields.source')}>
          <Select
            value={form?.source_id || ''}
            onChange={(event) => onSourceChange(String(event.target.value))}
            disabled={coreFieldsDisabled}
            variant="standard"
            disableUnderline
            displayEmpty
            sx={drawerSelectSx}
          >
            <MenuItem value="" sx={drawerMenuItemSx}>{noneLabel}</MenuItem>
            {sources.map((source) => (
              <MenuItem key={source.id} value={source.id} sx={drawerMenuItemSx}>
                {source.name}
              </MenuItem>
            ))}
          </Select>
        </PropertyRow>

        <PropertyRow label={t('workspace.request.fields.category')}>
          <Select
            value={form?.category_id || ''}
            onChange={(event) => onCategoryChange(String(event.target.value))}
            disabled={coreFieldsDisabled}
            variant="standard"
            disableUnderline
            displayEmpty
            sx={drawerSelectSx}
          >
            <MenuItem value="" sx={drawerMenuItemSx}>{noneLabel}</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id} sx={drawerMenuItemSx}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </PropertyRow>

        <PropertyRow label={t('workspace.request.fields.stream')}>
          <Select
            value={form?.stream_id || ''}
            onChange={(event) => onStreamChange(String(event.target.value))}
            disabled={coreFieldsDisabled || !form?.category_id}
            variant="standard"
            disableUnderline
            displayEmpty
            sx={drawerSelectSx}
          >
            <MenuItem value="" sx={drawerMenuItemSx}>{noneLabel}</MenuItem>
            {filteredStreams.map((stream) => (
              <MenuItem key={stream.id} value={stream.id} sx={drawerMenuItemSx}>
                {stream.name}
              </MenuItem>
            ))}
          </Select>
        </PropertyRow>

        <PropertyRow label={t('workspace.request.fields.requestor')}>
          <UserSelect
            label={t('workspace.request.fields.requestor')}
            value={form?.requestor_id || null}
            onChange={onRequestorChange}
            disabled={coreFieldsDisabled}
            size="small"
          />
        </PropertyRow>

        <PropertyRow label={t('workspace.request.fields.company')}>
          <CompanySelect
            label={t('workspace.request.fields.company')}
            value={form?.company_id || null}
            onChange={onCompanyChange}
            disabled={coreFieldsDisabled}
            size="small"
          />
        </PropertyRow>

        <PropertyRow label={t('workspace.request.fields.department')}>
          <DepartmentSelect
            label={t('workspace.request.fields.department')}
            companyId={form?.company_id || undefined}
            value={form?.department_id || null}
            onChange={(value) => onUpdate({ department_id: value })}
            disabled={coreFieldsDisabled}
            size="small"
          />
        </PropertyRow>

        <PropertyRow label={t('workspace.request.fields.targetDeliveryDate')}>
          <DateEUField
            label={t('workspace.request.fields.targetDeliveryDate')}
            valueYmd={form?.target_delivery_date || ''}
            onChangeYmd={(value) => onUpdate({ target_delivery_date: value })}
            disabled={coreFieldsDisabled}
            size="small"
          />
        </PropertyRow>
      </PropertyGroup>

      {!isCreate && (
        <PropertyGroup>
          <PropertyRow label={t('workspace.request.fields.businessSponsor')}>
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
          </PropertyRow>

          <PropertyRow label={t('workspace.request.fields.businessLead')}>
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
          </PropertyRow>

          <PropertyRow label={t('workspace.request.fields.itSponsor')}>
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
          </PropertyRow>

          <PropertyRow label={t('workspace.request.fields.itLead')}>
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
          </PropertyRow>

          <PropertyRow label={t('workspace.request.fields.businessContributors')}>
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
          </PropertyRow>

          <PropertyRow label={t('workspace.request.fields.itContributors')}>
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
          </PropertyRow>
        </PropertyGroup>
      )}

      {!isCreate && form?.id && (
        <PropertyGroup>
          <PropertyRow label={t('workspace.request.sections.dependencies')} valueSx={{ minHeight: 0 }}>
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
          </PropertyRow>

          <PropertyRow label={t('workspace.request.sections.relations')} valueSx={{ minHeight: 0 }}>
            <RequestRelationsPanel id={form.id} autoSave />
          </PropertyRow>

          <PropertyRow label={t('workspace.request.sections.resultingProjects')} valueSx={{ minHeight: 0 }}>
            {form?.resulting_projects?.length > 0 ? (
              <Stack spacing={1}>
                {form.resulting_projects.map((project: any) => (
                  <Box
                    key={project.id}
                    component="button"
                    type="button"
                    onClick={() => navigate(`/portfolio/projects/${project.id}/summary`)}
                    sx={(theme) => ({
                      border: 0,
                      background: 'transparent',
                      p: 0,
                      textAlign: 'left',
                      color: theme.palette.kanap.text.primary,
                      cursor: 'pointer',
                      font: 'inherit',
                    })}
                  >
                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                      {project.name} ({getProjectStatusLabel(t, project.status)})
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                {t('workspace.request.messages.noResultingProjects')}
              </Typography>
            )}
          </PropertyRow>
        </PropertyGroup>
      )}
    </Stack>
  );
}
