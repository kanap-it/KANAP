import React from 'react';
import {
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import IntegratedDocumentEditor, { type IntegratedDocumentEditorHandle } from '../../../components/IntegratedDocumentEditor';
import ApplicationSelect from '../../../components/fields/ApplicationSelect';
import BusinessProcessSelect from '../../../components/fields/BusinessProcessSelect';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import { PropertyRow } from '../../../components/design';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';
import {
  dialogBorderedFieldSx,
  drawerFieldValueSx,
  drawerMenuItemSx,
  drawerSelectSx,
} from '../../../theme/formSx';
import type { InterfaceDetail } from '../components/interface-workspace/types';

type Props = {
  canManage: boolean;
  data: InterfaceDetail | null;
  isCreate: boolean;
  specificationEditorRef: React.RefObject<IntegratedDocumentEditorHandle | null>;
  onPatch: (patch: Partial<InterfaceDetail>) => Promise<void>;
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="h2"
      sx={(theme) => ({
        m: 0,
        mb: 1,
        fontSize: 14,
        fontWeight: 500,
        color: theme.palette.kanap.text.primary,
      })}
    >
      {children}
    </Typography>
  );
}

export default function InterfaceOverviewTab({
  canManage,
  data,
  isCreate,
  specificationEditorRef,
  onPatch,
}: Props) {
  const { byField } = useItOpsEnumOptions();

  const dataCategoryOptions = React.useMemo(() => {
    const list = byField.interfaceDataCategory || [];
    const base = list.filter((item) => !item.deprecated).map((item) => ({ label: item.label, value: item.code }));
    const current = data?.data_category || '';
    return list.some((item) => item.code === current) || !current
      ? base
      : [...base, { label: current, value: current }];
  }, [byField.interfaceDataCategory, data?.data_category]);

  const routeOptions = React.useMemo(() => [
    { label: 'Direct', value: 'direct' },
    { label: 'Via middleware', value: 'via_middleware' },
  ], []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {isCreate && (
        <Box sx={{ maxWidth: 720 }}>
          <SectionHeader>Create interface</SectionHeader>
          <Stack spacing={1.25}>
            <PropertyRow label="Name" required valueSx={{ maxWidth: 560 }}>
              <TextField
                value={data?.name || ''}
                onChange={(event) => void onPatch({ name: event.target.value })}
                placeholder="e.g., PLM to ERP item master sync"
                required
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            <PropertyRow label="Interface code" valueSx={{ maxWidth: 360 }}>
              <TextField
                value={data?.interface_id || ''}
                onChange={(event) => void onPatch({ interface_id: event.target.value })}
                placeholder="e.g., ERP-ORDERS-SYNC"
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            <PropertyRow label="Business process" valueSx={{ maxWidth: 560 }}>
              <BusinessProcessSelect
                value={data?.business_process_id || null}
                onChange={(value) => void onPatch({ business_process_id: value || null })}
                hideLabel
                textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
                placeholder="Select process"
              />
            </PropertyRow>
            <PropertyRow label="Source application" required valueSx={{ maxWidth: 560 }}>
              <ApplicationSelect
                value={data?.source_application_id || null}
                onChange={(value) => void onPatch({ source_application_id: value || '' })}
                hideLabel
                textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
                placeholder="Select source"
              />
            </PropertyRow>
            <PropertyRow label="Target application" required valueSx={{ maxWidth: 560 }}>
              <ApplicationSelect
                value={data?.target_application_id || null}
                onChange={(value) => void onPatch({ target_application_id: value || '' })}
                hideLabel
                textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
                placeholder="Select target"
              />
            </PropertyRow>
            <PropertyRow label="Data category" required valueSx={{ maxWidth: 360 }}>
              <EnumAutocomplete
                label="Data category"
                value={data?.data_category || ''}
                onChange={(value) => void onPatch({ data_category: value })}
                options={dataCategoryOptions}
                hideLabel
                textFieldSx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            <PropertyRow label="Route type" valueSx={{ maxWidth: 280 }}>
              <TextField
                select
                value={data?.integration_route_type || 'direct'}
                onChange={(event) => {
                  const value = event.target.value as 'direct' | 'via_middleware';
                  void onPatch({
                    integration_route_type: value,
                    ...(value === 'direct' ? { middleware_application_ids: [] } : {}),
                  });
                }}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerSelectSx, dialogBorderedFieldSx]}
              >
                {routeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={drawerMenuItemSx}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </PropertyRow>
          </Stack>
        </Box>
      )}

      <Box>
        <SectionHeader>Specification</SectionHeader>
        <IntegratedDocumentEditor
          ref={specificationEditorRef as React.Ref<IntegratedDocumentEditorHandle>}
          entityType="interfaces"
          entityId={isCreate ? null : (data?.id || null)}
          slotKey="specification"
          label="Specification document"
          disabled={!canManage}
          draftValue={data?.specification_markdown || ''}
          onDraftChange={(value) => {
            void onPatch({ specification_markdown: value });
          }}
          editModeBehavior="auto"
          showDocumentControls={false}
          autosaveEnabled
          minRows={12}
          maxRows={34}
          surface
          placeholder="Capture the managed interface specification here."
        />
      </Box>
    </Box>
  );
}
