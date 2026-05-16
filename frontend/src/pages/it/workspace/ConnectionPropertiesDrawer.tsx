import React from 'react';
import { Box, MenuItem, Switch, TextField, Typography } from '@mui/material';
import { PropertyGroup, PropertyRow } from '../../../components/design/PropertyRow';
import { drawerSelectSx, drawerMenuItemSx } from '../../../theme/formSx';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';

const CRITICALITIES = [
  { code: 'low', label: 'Low' },
  { code: 'medium', label: 'Medium' },
  { code: 'high', label: 'High' },
  { code: 'business_critical', label: 'Business critical' },
];

type Props = {
  lifecycle: string;
  topology: 'server_to_server' | 'multi_server';
  topologyDisabled: boolean;
  riskMode: 'manual' | 'derived';
  criticality: string;
  dataClass: string;
  containsPii: boolean;
  effectiveCriticality: string;
  effectiveDataClass: string;
  effectiveContainsPii: boolean;
  derivedInterfaceCount: number;
  derivedAvailable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  disabled?: boolean;
  onLifecycleChange: (next: string) => void;
  onTopologyChange: (next: 'server_to_server' | 'multi_server') => void;
  onRiskModeChange: (next: 'manual' | 'derived') => void;
  onCriticalityChange: (next: string) => void;
  onDataClassChange: (next: string) => void;
  onContainsPiiChange: (next: boolean) => void;
};

function formatShortDate(value: string | null): string {
  if (!value) return 'Not set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not set';
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export default function ConnectionPropertiesDrawer({
  lifecycle,
  topology,
  topologyDisabled,
  riskMode,
  criticality,
  dataClass,
  containsPii,
  effectiveCriticality,
  effectiveDataClass,
  effectiveContainsPii,
  derivedInterfaceCount,
  derivedAvailable,
  createdAt,
  updatedAt,
  disabled = false,
  onLifecycleChange,
  onTopologyChange,
  onRiskModeChange,
  onCriticalityChange,
  onDataClassChange,
  onContainsPiiChange,
}: Props) {
  const { byField, labelFor } = useItOpsEnumOptions();
  const lifecycleOptions = byField.lifecycleStatus || [];
  const dataClassOptions = byField.dataClass || [];

  const isDerived = riskMode === 'derived';

  return (
    <>
      <PropertyGroup>
        <PropertyRow label="Lifecycle">
          <TextField
            select
            value={lifecycle || ''}
            onChange={(e) => onLifecycleChange(e.target.value)}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={drawerSelectSx}
            disabled={disabled}
          >
            {lifecycleOptions.map((opt) => (
              <MenuItem key={opt.code} value={opt.code} sx={drawerMenuItemSx}>
                {opt.deprecated ? `${opt.label} (deprecated)` : opt.label}
              </MenuItem>
            ))}
          </TextField>
        </PropertyRow>
        <PropertyRow label="Topology">
          <TextField
            select
            value={topology}
            onChange={(e) => onTopologyChange(e.target.value as 'server_to_server' | 'multi_server')}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={drawerSelectSx}
            disabled={disabled || topologyDisabled}
            helperText={topologyDisabled ? 'Remove all hops to change topology' : undefined}
            FormHelperTextProps={{ sx: { fontSize: 11, mt: 0.5 } }}
          >
            <MenuItem value="server_to_server" sx={drawerMenuItemSx}>Server to server</MenuItem>
            <MenuItem value="multi_server" sx={drawerMenuItemSx}>Multi-server</MenuItem>
          </TextField>
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup>
        <PropertyRow label="Risk mode">
          <TextField
            select
            value={riskMode}
            onChange={(e) => {
              const next = e.target.value as 'manual' | 'derived';
              if (next === 'derived' && !derivedAvailable) return;
              onRiskModeChange(next);
            }}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={drawerSelectSx}
            disabled={disabled}
          >
            <MenuItem value="manual" sx={drawerMenuItemSx}>Manual</MenuItem>
            <MenuItem
              value="derived"
              disabled={!derivedAvailable && riskMode !== 'derived'}
              sx={drawerMenuItemSx}
            >
              Derived from interfaces
            </MenuItem>
          </TextField>
          {!derivedAvailable && riskMode === 'manual' && (
            <Typography sx={{ fontSize: 11, color: 'kanap.text.tertiary', mt: 0.25 }}>
              Link an interface binding to enable derived risk
            </Typography>
          )}
        </PropertyRow>
        <PropertyRow label="Criticality">
          {isDerived ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13, color: 'kanap.text.primary' }}>
              {CRITICALITIES.find((c) => c.code === effectiveCriticality)?.label || effectiveCriticality}
              <Typography component="span" sx={{ fontSize: 11, color: 'kanap.text.tertiary' }}>
                (derived from {derivedInterfaceCount})
              </Typography>
            </Box>
          ) : (
            <TextField
              select
              value={criticality}
              onChange={(e) => onCriticalityChange(e.target.value)}
              variant="standard"
              InputProps={{ disableUnderline: true }}
              sx={drawerSelectSx}
              disabled={disabled}
            >
              {CRITICALITIES.map((opt) => (
                <MenuItem key={opt.code} value={opt.code} sx={drawerMenuItemSx}>{opt.label}</MenuItem>
              ))}
            </TextField>
          )}
        </PropertyRow>
        <PropertyRow label="Data class">
          {isDerived ? (
            <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>
              {labelFor('dataClass', effectiveDataClass) || effectiveDataClass || 'Not set'}
            </Typography>
          ) : (
            <TextField
              select
              value={dataClass || ''}
              onChange={(e) => onDataClassChange(e.target.value)}
              variant="standard"
              InputProps={{ disableUnderline: true }}
              sx={drawerSelectSx}
              disabled={disabled}
            >
              {dataClassOptions.map((opt) => (
                <MenuItem key={opt.code} value={opt.code} sx={drawerMenuItemSx}>{opt.label}</MenuItem>
              ))}
            </TextField>
          )}
        </PropertyRow>
        <PropertyRow label="Contains PII">
          {isDerived ? (
            <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>
              {effectiveContainsPii ? 'Yes' : 'No'}
            </Typography>
          ) : (
            <Switch
              size="small"
              checked={containsPii}
              onChange={(e) => onContainsPiiChange(e.target.checked)}
              disabled={disabled}
            />
          )}
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup>
        <PropertyRow label="Created">
          <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>{formatShortDate(createdAt)}</Typography>
        </PropertyRow>
        <PropertyRow label="Updated">
          <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>{formatShortDate(updatedAt)}</Typography>
        </PropertyRow>
      </PropertyGroup>
    </>
  );
}
