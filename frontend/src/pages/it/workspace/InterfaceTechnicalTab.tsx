import React from 'react';
import {
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';
import type {
  InterfaceLeg,
  InterfaceTabProps,
} from '../components/interface-workspace/types';

export default function InterfaceTechnicalTab({ data, update, markDirty }: InterfaceTabProps) {
  const { byField } = useItOpsEnumOptions();
  const legs = (data?.legs || []) as InterfaceLeg[];

  const triggerTypeOptions = React.useMemo(() => {
    const list = byField.interfaceTriggerType || [];
    const base = list.filter((item) => !item.deprecated).map((item) => ({ label: item.label, value: item.code }));
    const usedCodes = new Set<string>(legs.map((leg) => leg.trigger_type).filter(Boolean) as string[]);
    const existing = new Set(base.map((item) => item.value));
    const extras: Array<{ label: string; value: string }> = [];
    for (const code of usedCodes) {
      if (!existing.has(code)) {
        const ref = list.find((item) => item.code === code);
        extras.push({ label: ref?.label || code, value: code });
      }
    }
    return [...base, ...extras];
  }, [byField.interfaceTriggerType, legs]);

  const patternOptions = React.useMemo(() => {
    const list = byField.interfacePattern || [];
    const base = list.filter((item) => !item.deprecated).map((item) => ({ label: item.label, value: item.code }));
    const usedCodes = new Set<string>(legs.map((leg) => leg.integration_pattern).filter(Boolean) as string[]);
    const existing = new Set(base.map((item) => item.value));
    const extras: Array<{ label: string; value: string }> = [];
    for (const code of usedCodes) {
      if (!existing.has(code)) {
        const ref = list.find((item) => item.code === code);
        extras.push({ label: ref?.label || code, value: code });
      }
    }
    return [...base, ...extras];
  }, [byField.interfacePattern, legs]);

  const formatOptions = React.useMemo(() => {
    const list = byField.interfaceFormat || [];
    const base = list.filter((item) => !item.deprecated).map((item) => ({ label: item.label, value: item.code }));
    const usedCodes = new Set<string>(legs.map((leg) => leg.data_format).filter(Boolean) as string[]);
    const existing = new Set(base.map((item) => item.value));
    const extras: Array<{ label: string; value: string }> = [];
    for (const code of usedCodes) {
      if (!existing.has(code)) {
        const ref = list.find((item) => item.code === code);
        extras.push({ label: ref?.label || code, value: code });
      }
    }
    return [...base, ...extras];
  }, [byField.interfaceFormat, legs]);

  const getRoleLabel = (role: string) => {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'source') return data?.source_application_name || 'Source';
    if (normalized === 'target') return data?.target_application_name || 'Target';
    if (normalized === 'middleware') return 'Middleware';
    return role || '';
  };

  const handleLegChange = (legId: string, patch: Partial<InterfaceLeg>) => {
    const next = legs.map((leg) => (leg.id === legId ? { ...leg, ...patch } : leg));
    markDirty();
    update({ legs: next });
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">Technical overview</Typography>
        <Typography variant="body2" color="text.secondary">
          Define the shared leg template used by the interface across environments.
        </Typography>
        {legs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No legs defined for this interface yet. Save the core interface metadata first so the default leg model can be generated.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Leg</TableCell>
                <TableCell>From {'->'} To</TableCell>
                <TableCell>Trigger type</TableCell>
                <TableCell>Pattern</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Job name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {legs.map((leg) => (
                <TableRow key={leg.id}>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {String(leg.leg_type || '').toUpperCase()}
                  </TableCell>
                  <TableCell>
                    {getRoleLabel(leg.from_role)} {'->'} {getRoleLabel(leg.to_role)}
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      label="Trigger"
                      value={leg.trigger_type || ''}
                      onChange={(event) => handleLegChange(leg.id, { trigger_type: event.target.value })}
                      fullWidth
                    >
                      {triggerTypeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      label="Pattern"
                      value={leg.integration_pattern || ''}
                      onChange={(event) => handleLegChange(leg.id, { integration_pattern: event.target.value })}
                      fullWidth
                    >
                      {patternOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      label="Format"
                      value={leg.data_format || ''}
                      onChange={(event) => handleLegChange(leg.id, { data_format: event.target.value })}
                      fullWidth
                    >
                      {formatOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      label="Job name"
                      value={leg.job_name || ''}
                      onChange={(event) => handleLegChange(leg.id, { job_name: event.target.value })}
                      fullWidth
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>
    </Stack>
  );
}
