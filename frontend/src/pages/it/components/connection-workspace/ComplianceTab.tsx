import React from 'react';
import {
  Box,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import EnumAutocomplete from '../../../../components/fields/EnumAutocomplete';
import useItOpsEnumOptions from '../../../../hooks/useItOpsEnumOptions';
import type { ConnectionDetail, ConnectionTabProps } from './types';

import { useTranslation } from 'react-i18next';
export default function ComplianceTab({ data, update }: ConnectionTabProps) {
  const { t } = useTranslation(['it', 'common']);
  const { byField } = useItOpsEnumOptions();

  const dataClassLabel = React.useCallback(
    (code?: string | null) => {
      if (!code) return '';
      const item = (byField.dataClass || []).find((o) => o.code === code);
      return item?.label || code;
    },
    [byField.dataClass],
  );

  const criticalityOptions = React.useMemo(
    () => [
      { label: 'Business critical', value: 'business_critical' },
      { label: 'High', value: 'high' },
      { label: 'Medium', value: 'medium' },
      { label: 'Low', value: 'low' },
    ],
    [],
  );

  const dataClassOptions = React.useMemo(
    () =>
      (byField.dataClass || []).map((o) => ({
        label: o.label,
        value: o.code,
      })),
    [byField.dataClass],
  );

  return (
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      {data && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Risk summary
          </Typography>
          {data.risk_mode === 'derived' ? (
            <Typography variant="body2" color="text.secondary">
              {data.derived_interface_count && data.derived_interface_count > 0
                ? `Risk is derived from ${data.derived_interface_count} interface bindings.`
                : 'Risk is set to Derived, but no interface bindings are linked to this connection.'}
              {' '}
              Effective: criticality&nbsp;
              {data.effective_criticality || data.criticality || '-'}
              , data class&nbsp;
              {dataClassLabel(data.effective_data_class || data.data_class || 'internal') || '-'}
              , PII&nbsp;
              {(typeof data.effective_contains_pii === 'boolean'
              ? data.effective_contains_pii
              : data.contains_pii)
                ? 'Yes'
                : 'No'}
              .
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Risk origin: Manual. Effective risk matches the fields below.
            </Typography>
          )}
        </Box>
      )}
      <EnumAutocomplete
        label="Risk mode"
        value={data?.risk_mode || 'manual'}
        onChange={(v) => update({ risk_mode: v as any })}
        options={[
          { label: 'Manual', value: 'manual' },
          { label: 'Derived', value: 'derived' },
        ] as any}
        helperText="Manual: risk uses the fields below. Derived: risk is aggregated from linked interfaces."
      />
      <EnumAutocomplete
        label="Criticality"
        value={
          data?.risk_mode === 'derived'
            ? (data.effective_criticality || data.criticality || 'medium')
            : (data?.criticality || 'medium')
        }
        onChange={(v) => update({ criticality: v as any })}
        options={criticalityOptions as any}
        disabled={data?.risk_mode === 'derived'}
      />
      <EnumAutocomplete
        label="Data class"
        value={
          data?.risk_mode === 'derived'
            ? (data.effective_data_class || data.data_class || 'internal')
            : (data?.data_class || 'internal')
        }
        onChange={(v) => update({ data_class: v as any })}
        options={dataClassOptions as any}
        disabled={data?.risk_mode === 'derived'}
      />
      <FormControlLabel
        control={(
          <Switch
            checked={
              data?.risk_mode === 'derived'
                ? !!(typeof data.effective_contains_pii === 'boolean'
                  ? data.effective_contains_pii
                  : data.contains_pii)
                : !!data?.contains_pii
            }
            onChange={(e) => update({ contains_pii: e.target.checked })}
            disabled={data?.risk_mode === 'derived'}
          />
        )}
        label="Contains PII"
      />
    </Stack>
  );
}
