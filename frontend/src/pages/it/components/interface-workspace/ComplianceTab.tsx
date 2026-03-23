import React from 'react';
import {
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EnumAutocomplete from '../../../../components/fields/EnumAutocomplete';
import useItOpsEnumOptions from '../../../../hooks/useItOpsEnumOptions';
import type { InterfaceDetail, InterfaceDataResidency, InterfaceTabProps } from './types';

import { useTranslation } from 'react-i18next';
export default function ComplianceTab({ data, update, markDirty }: InterfaceTabProps) {
  const { t } = useTranslation(['it', 'common']);
  const residency = (data?.data_residency || []) as InterfaceDataResidency[];
  const { byField } = useItOpsEnumOptions();
  const dataClassOptions = React.useMemo(() => {
    const list = byField.dataClass || [];
    const base = list.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }));
    const current = data?.data_class || 'internal';
    const hasCurrent = list.some((o) => o.code === current);
    if (!hasCurrent && current) {
      return [...base, { label: current, value: current }];
    }
    return base;
  }, [byField.dataClass, data?.data_class]);
  const [baselineCodes, setBaselineCodes] = React.useState<string[]>(() =>
    (residency || []).map((r) => (r.country_iso || '').toUpperCase()),
  );
  const [codes, setCodes] = React.useState<string[]>(baselineCodes);

  React.useEffect(() => {
    const current = (residency || []).map((r) => (r.country_iso || '').toUpperCase());
    setBaselineCodes(current);
    setCodes(current);
  }, [JSON.stringify(residency)]);

  const dirty = React.useMemo(() => JSON.stringify(codes) !== JSON.stringify(baselineCodes), [codes, baselineCodes]);

  React.useEffect(() => {
    if (dirty) {
      markDirty();
      const rows: InterfaceDataResidency[] = codes.map((iso) => ({ country_iso: iso }));
      update({ data_residency: rows });
    }
  }, [codes, dirty, markDirty, update]);

  return (
    <Stack spacing={3}>
      <EnumAutocomplete
        label="Data classification"
        value={data?.data_class || 'internal'}
        onChange={(v) => {
          markDirty();
          update({ data_class: v });
        }}
        options={dataClassOptions as any}
      />
      <FormControlLabel
        control={(
          <Checkbox
            checked={!!data?.contains_pii}
            onChange={(e) => {
              markDirty();
              update({ contains_pii: e.target.checked });
            }}
          />
        )}
        label="Contains PII"
      />
      {data?.contains_pii && (
        <TextField
          label="PII description"
          value={data?.pii_description || ''}
          onChange={(e) => {
            markDirty();
            update({ pii_description: e.target.value });
          }}
          multiline
          minRows={2}
        />
      )}
      <TextField
        label="Typical data"
        value={data?.typical_data || ''}
        onChange={(e) => {
          markDirty();
          update({ typical_data: e.target.value });
        }}
        multiline
        minRows={2}
      />
      <TextField
        label="Audit & logging"
        value={data?.audit_logging || ''}
        onChange={(e) => {
          markDirty();
          update({ audit_logging: e.target.value });
        }}
        multiline
        minRows={3}
      />
      <TextField
        label="Security controls (summary)"
        value={data?.security_controls_summary || ''}
        onChange={(e) => {
          markDirty();
          update({ security_controls_summary: e.target.value });
        }}
        multiline
        minRows={3}
      />

      <Divider />
      <Stack spacing={1}>
        <Typography variant="subtitle2">Data residency</Typography>
        <TextField
          label="Country codes (comma-separated, ISO 2-letter)"
          value={codes.join(', ')}
          onChange={(e) => {
            const parts = e.target.value
              .split(',')
              .map((p) => p.trim().toUpperCase())
              .filter((p) => p.length === 2);
            setCodes(Array.from(new Set(parts)));
          }}
          helperText="Example: FR, DE, US"
        />
      </Stack>
    </Stack>
  );
}
