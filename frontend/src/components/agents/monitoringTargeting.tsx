import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  IconButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { aiAgentControlApi } from '../../ai/aiApi';
import type { AiAgentControlRefItem, AiMonitoringTargetingModel, AiMonitoringTargetingPredicate } from '../../ai/aiApi';
import { drawerMenuItemSx, drawerSelectSx, editableFieldValueSx } from '../../theme/formSx';
import { MONO_FONT_FAMILY } from '../../config/ThemeContext';
import { getDotColor } from '../../utils/statusColors';
import { actionLinkButtonSx } from './helpdeskTargeting';

// ---------------------------------------------------------------------------
// Monitoring flavor of the 13.6 targeting filter builder (plan 37 §4.2 / WS-A5).
//
// Vocabularies: keep in sync with backend/src/ai/control-plane/providers/
// provider-constants.ts (MONITORING_ALERT_STATUS_VALUES, MONITORING_SEVERITY_VALUES,
// MONITORING_ACK_STATES). Status/severity/acknowledgement render these normalized
// values with i18n labels. Group/device/check type are opaque provider reference
// ids (13.7: picker-only, never free text): with an agentId they resolve through
// the kind-aware targeting-options endpoint (monitoring binding on the backend);
// without one, or when the lookup errors, the row degrades to a read-only display
// of the stored ids plus a hint.
// ---------------------------------------------------------------------------

export const MONITORING_ALERT_STATUS_VALUES = ['down', 'down_partial', 'warning', 'unusual', 'paused', 'up', 'unknown'] as const;
export const MONITORING_SEVERITY_VALUES = ['very_low', 'low', 'medium', 'high', 'critical'] as const;

// Default status selection for a fresh status row: every state that represents
// an active alert condition (mirror of DEFAULT_MONITORING_ALERT_STATUS_VALUES in
// backend/src/ai/control-plane/agent/monitoring-targeting.ts).
const DEFAULT_STATUS_ROW_VALUES = ['down', 'down_partial', 'warning', 'unusual'];

// UI row fields. `severity_floor`/`severity_values` both persist as the backend
// field `severity` — floor uses operator gte, values uses operator in.
export type MonitoringTargetingField =
  | 'status'
  | 'severity_floor'
  | 'severity_values'
  | 'ack_state'
  | 'group'
  | 'device'
  | 'check_type'
  | 'age_minutes'
  | 'touched_by';

export type MonitoringTargetingFilter = {
  id: string;
  field: MonitoringTargetingField;
  // Multi-value rows (status, severity_values, group/device/check_type) carry a
  // string array; single-value rows carry a string. age_minutes uses `amount`.
  value: string | string[];
  amount: string;
};

const AVAILABLE_MONITORING_FIELDS: MonitoringTargetingField[] = [
  'status',
  'severity_floor',
  'severity_values',
  'ack_state',
  'group',
  'device',
  'check_type',
  'age_minutes',
  'touched_by',
];

// Fields whose values are opaque provider reference ids (13.7: picker-only, no
// free text). With an agentId they get a provider-sourced autocomplete; the
// read-only display + hint remains the fallback.
const PROVIDER_REF_FIELDS = new Set<MonitoringTargetingField>(['group', 'device', 'check_type']);
type MonitoringProviderRefField = 'group' | 'device' | 'check_type';

// Same lookup ergonomics as the helpdesk ReferenceCatalogAutocomplete (those
// constants are module-private in helpdeskTargeting.tsx).
const MONITORING_LOOKUP_DEBOUNCE_MS = 300;
const MONITORING_OPTIONS_STALE_TIME_MS = 30_000;
const MONITORING_CATALOG_OPTIONS_LIMIT = 50;

function monitoringFilterId(field: string): string {
  return `${field}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildMonitoringFilter(
  field: MonitoringTargetingField,
  value: string | string[] = '',
  amount = '10',
): MonitoringTargetingFilter {
  return { id: monitoringFilterId(field), field, value, amount };
}

function stringValues(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  return Array.from(new Set(rawValues.map((entry) => String(entry ?? '').trim()).filter(Boolean)));
}

function positiveMinutes(value: string): number | null {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Presets — author predicates exactly like MONITORING_TARGETING_PRESETS in
// backend/src/ai/control-plane/agent/monitoring-targeting.ts (keep in sync).
// ---------------------------------------------------------------------------

export type MonitoringTargetingPresetKey = 'unacknowledged_down' | 'critical_and_high' | 'stable_down_10min';

export const MONITORING_TARGETING_PRESET_KEYS: MonitoringTargetingPresetKey[] = [
  'unacknowledged_down',
  'critical_and_high',
  'stable_down_10min',
];

export function monitoringTargetingPresetFilters(preset: MonitoringTargetingPresetKey): MonitoringTargetingFilter[] {
  if (preset === 'unacknowledged_down') {
    return [
      buildMonitoringFilter('status', ['down', 'down_partial']),
      buildMonitoringFilter('ack_state', 'unacknowledged'),
    ];
  }
  if (preset === 'critical_and_high') {
    return [buildMonitoringFilter('severity_floor', 'high')];
  }
  return [
    buildMonitoringFilter('status', ['down', 'down_partial']),
    buildMonitoringFilter('age_minutes', '', '10'),
  ];
}

// ---------------------------------------------------------------------------
// Filters -> predicates (the shape normalizeMonitoringTargeting expects).
// Operators per field exactly as the backend supports: status in, severity
// gte|in, ack_state eq, group/device/check_type in, age_minutes gte,
// touched_by eq 'self'. No lte anywhere.
// ---------------------------------------------------------------------------

export function monitoringTargetingPredicatesFromFilters(
  filters: MonitoringTargetingFilter[],
): AiMonitoringTargetingPredicate[] {
  const predicates: AiMonitoringTargetingPredicate[] = [];
  for (const filter of filters) {
    if (filter.field === 'status') {
      const values = stringValues(filter.value);
      if (values.length > 0) predicates.push({ field: 'status', operator: 'in', value: values });
      continue;
    }
    if (filter.field === 'severity_floor') {
      const value = typeof filter.value === 'string' ? filter.value.trim() : '';
      if (value) predicates.push({ field: 'severity', operator: 'gte', value });
      continue;
    }
    if (filter.field === 'severity_values') {
      const values = stringValues(filter.value);
      if (values.length > 0) predicates.push({ field: 'severity', operator: 'in', value: values });
      continue;
    }
    if (filter.field === 'ack_state') {
      // 'any' means no acknowledgement constraint — no predicate.
      if (filter.value === 'unacknowledged') {
        predicates.push({ field: 'ack_state', operator: 'eq', value: 'unacknowledged' });
      }
      continue;
    }
    if (PROVIDER_REF_FIELDS.has(filter.field)) {
      const values = stringValues(filter.value);
      if (values.length > 0) predicates.push({ field: filter.field, operator: 'in', value: values });
      continue;
    }
    if (filter.field === 'age_minutes') {
      const minutes = positiveMinutes(filter.amount);
      if (minutes != null) predicates.push({ field: 'age_minutes', operator: 'gte', value: minutes });
      continue;
    }
    if (filter.field === 'touched_by') {
      predicates.push({ field: 'touched_by', operator: 'eq', value: 'self' });
    }
  }
  const seen = new Set<string>();
  return predicates.filter((predicate) => {
    const key = JSON.stringify(predicate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// The exact scope_policy_json.targeting block to persist.
export function monitoringTargetingModelFromFilters(filters: MonitoringTargetingFilter[]): AiMonitoringTargetingModel {
  return {
    schema_version: 1,
    combinator: 'and',
    predicates: monitoringTargetingPredicatesFromFilters(filters),
  };
}

// ---------------------------------------------------------------------------
// Predicates -> filters (hydration from a stored scope_policy_json). The UI
// only re-materializes the rows it can author; `not` predicates and other
// backend-accepted-but-UI-unauthored shapes are dropped (same round-trip
// contract as the helpdesk builder).
// ---------------------------------------------------------------------------

export function monitoringFiltersFromScope(scope: Record<string, unknown>): MonitoringTargetingFilter[] {
  const filters: MonitoringTargetingFilter[] = [];
  const targeting = isRecord(scope.targeting) ? scope.targeting : {};
  const predicates = Array.isArray(targeting.predicates) ? targeting.predicates.filter(isRecord) : [];
  for (const predicate of predicates) {
    const field = typeof predicate.field === 'string' ? predicate.field : '';
    const operator = typeof predicate.operator === 'string' ? predicate.operator : '';
    if (field === 'status' && (operator === 'in' || operator === 'eq')) {
      const values = stringValues(predicate.value);
      if (values.length > 0) filters.push(buildMonitoringFilter('status', values));
      continue;
    }
    if (field === 'severity' && operator === 'gte') {
      const value = typeof predicate.value === 'string' ? predicate.value : '';
      if (value) filters.push(buildMonitoringFilter('severity_floor', value));
      continue;
    }
    if (field === 'severity' && (operator === 'in' || operator === 'eq')) {
      const values = stringValues(predicate.value);
      if (values.length > 0) filters.push(buildMonitoringFilter('severity_values', values));
      continue;
    }
    if (field === 'ack_state' && operator === 'eq') {
      const value = typeof predicate.value === 'string' ? predicate.value : '';
      if (value) filters.push(buildMonitoringFilter('ack_state', value));
      continue;
    }
    if ((field === 'group' || field === 'device' || field === 'check_type') && (operator === 'in' || operator === 'eq')) {
      const values = stringValues(predicate.value);
      if (values.length > 0) filters.push(buildMonitoringFilter(field, values));
      continue;
    }
    if (field === 'age_minutes' && operator === 'gte') {
      const minutes = typeof predicate.value === 'number'
        ? predicate.value
        : positiveMinutes(String(predicate.value ?? ''));
      if (minutes != null && minutes > 0) filters.push(buildMonitoringFilter('age_minutes', '', String(minutes)));
      continue;
    }
    if (field === 'touched_by' && operator === 'eq' && predicate.value === 'self') {
      filters.push(buildMonitoringFilter('touched_by', 'self'));
    }
  }
  return filters;
}

// ---------------------------------------------------------------------------
// Semantic dot colors (status colors charter: grey passive, orange attention,
// green ok, red failed). Normalized values only — no provider metadata here.
// ---------------------------------------------------------------------------

export function monitoringStatusSemanticColor(status: string): string {
  if (status === 'down' || status === 'down_partial') return 'error';
  if (status === 'warning' || status === 'unusual') return 'warning';
  if (status === 'up') return 'success';
  return 'default';
}

export function monitoringSeveritySemanticColor(severity: string): string {
  if (severity === 'critical') return 'error';
  if (severity === 'high') return 'warning';
  if (severity === 'medium') return 'info';
  return 'default';
}

// Mirrored from helpdeskTargeting.tsx (DotOptionLabel is not exported there).
function DotOptionLabel({ color, label }: { color: string; label: React.ReactNode }) {
  const theme = useTheme();
  const dotColor = getDotColor(color, theme.palette.mode);
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dotColor, flex: '0 0 auto' }} />
      <Typography variant="body2" sx={{ color: dotColor, minWidth: 0 }}>{label}</Typography>
    </Stack>
  );
}

// Read-only fallback for provider-ref rows: stored ids + a plain-language hint.
// Used when no agentId is available (no picker possible) and when the
// provider-sourced lookup errors (static degradation, selections kept).
function MonitoringProviderRefDisplay({ values, hint }: { values: string[]; hint: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      {values.length > 0 ? (
        <Typography
          variant="body2"
          sx={(theme) => ({
            fontFamily: MONO_FONT_FAMILY,
            fontSize: 12,
            color: theme.palette.kanap.text.secondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {values.join(', ')}
        </Typography>
      ) : null}
      <Typography sx={(theme) => ({ fontSize: 11, color: theme.palette.kanap.text.tertiary, lineHeight: 1.3 })}>
        {hint}
      </Typography>
    </Box>
  );
}

// Provider-sourced multi-value picker for group/device/check_type reference ids
// (mirror of the helpdesk ReferenceCatalogAutocomplete: debounced server-side
// lookup, no free text — only offered options can be added).
function MonitoringReferenceAutocomplete({
  agentId,
  field,
  values,
  onChange,
}: {
  agentId: string;
  field: MonitoringProviderRefField;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const { t } = useTranslation(['agents']);
  const [inputValue, setInputValue] = React.useState('');
  const [debouncedInput, setDebouncedInput] = React.useState('');
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedInput(inputValue), MONITORING_LOOKUP_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [inputValue]);
  const lookupQuery = debouncedInput.trim();
  const optionsQuery = useQuery({
    queryKey: ['ai-agent-targeting-options', agentId, field, lookupQuery],
    queryFn: () => aiAgentControlApi.getAgentTargetingOptions(agentId, field, {
      query: lookupQuery || undefined,
      limit: MONITORING_CATALOG_OPTIONS_LIMIT,
    }),
    enabled: !!agentId,
    staleTime: MONITORING_OPTIONS_STALE_TIME_MS,
  });
  if (optionsQuery.isError) {
    return <MonitoringProviderRefDisplay values={values} hint={t('settings.monitoringBuilder.valuesUnavailable')} />;
  }
  const options = optionsQuery.data?.options ?? [];
  const selected = values.map((value) => options.find((option) => option.value === value) ?? { value, label: value });
  return (
    <Autocomplete<AiAgentControlRefItem, true, false, false>
      multiple
      size="small"
      options={options}
      value={selected}
      inputValue={inputValue}
      loading={optionsQuery.isFetching}
      filterOptions={(items) => items.filter((item) => !values.includes(item.value))}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, candidate) => option.value === candidate.value}
      noOptionsText={t('settings.targetingBuilder.noOptions')}
      onInputChange={(_event, next) => setInputValue(next)}
      onChange={(_event, nextOptions) => {
        onChange(Array.from(new Set(nextOptions.map((option) => option.value))));
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          variant="standard"
          placeholder={values.length === 0 ? t(`settings.monitoringTargetingFields.${field}`) : undefined}
          InputProps={{ ...params.InputProps, disableUnderline: true }}
          sx={editableFieldValueSx}
        />
      )}
    />
  );
}

function defaultMonitoringFilterForField(field: MonitoringTargetingField): MonitoringTargetingFilter {
  if (field === 'status') return buildMonitoringFilter('status', DEFAULT_STATUS_ROW_VALUES);
  if (field === 'severity_floor') return buildMonitoringFilter('severity_floor', 'high');
  if (field === 'severity_values') return buildMonitoringFilter('severity_values', ['high', 'critical']);
  if (field === 'ack_state') return buildMonitoringFilter('ack_state', 'unacknowledged');
  if (field === 'age_minutes') return buildMonitoringFilter('age_minutes', '', '10');
  if (field === 'touched_by') return buildMonitoringFilter('touched_by', 'self');
  return buildMonitoringFilter(field, []);
}

// Preset row: three starter recipes matching the backend presets one-to-one.
// The parent owns confirm-overwrite behavior (same split as the helpdesk page).
export function MonitoringTargetingPresetButtons({
  onApply,
  disabled = false,
}: {
  onApply: (preset: MonitoringTargetingPresetKey, filters: MonitoringTargetingFilter[]) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation(['agents']);
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {MONITORING_TARGETING_PRESET_KEYS.map((preset) => (
        <Button
          key={preset}
          type="button"
          size="small"
          variant="text"
          disabled={disabled}
          onClick={() => onApply(preset, monitoringTargetingPresetFilters(preset))}
          sx={actionLinkButtonSx}
        >
          {t(`settings.monitoringPresets.${preset}`)}
        </Button>
      ))}
    </Stack>
  );
}

export function MonitoringTargetingFilterBuilder({
  agentId,
  filters,
  onChange,
}: {
  // Enables the provider-sourced group/device/check type pickers; without it
  // those rows stay read-only (e.g. no saved agent yet).
  agentId?: string | null;
  filters: MonitoringTargetingFilter[];
  onChange: (filters: MonitoringTargetingFilter[]) => void;
}) {
  const { t } = useTranslation(['agents']);
  const updateFilter = (id: string, patch: Partial<MonitoringTargetingFilter>) => {
    onChange(filters.map((filter) => (filter.id === id ? { ...filter, ...patch } : filter)));
  };
  const replaceField = (id: string, field: MonitoringTargetingField) => {
    onChange(filters.map((filter) => (filter.id === id ? defaultMonitoringFilterForField(field) : filter)));
  };
  const removeFilter = (id: string) => onChange(filters.filter((filter) => filter.id !== id));
  const addFilter = () => onChange([...filters, defaultMonitoringFilterForField('status')]);

  return (
    <Stack spacing={1}>
      {filters.map((filter) => (
        <Box
          key={filter.id}
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '220px minmax(0, 1fr) auto' },
            gap: 1,
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
            pb: 1,
          })}
        >
          <Select
            variant="standard"
            value={filter.field}
            onChange={(event) => replaceField(filter.id, event.target.value as MonitoringTargetingField)}
            sx={drawerSelectSx}
          >
            {AVAILABLE_MONITORING_FIELDS.map((field) => (
              <MenuItem key={field} value={field} sx={drawerMenuItemSx}>
                {t(`settings.monitoringTargetingFields.${field}`)}
              </MenuItem>
            ))}
          </Select>

          {filter.field === 'status' && (
            <Select
              multiple
              variant="standard"
              value={Array.isArray(filter.value) ? filter.value : []}
              renderValue={(selected) => (selected as string[])
                .map((value) => t(`settings.monitoringStatuses.${value}`, { defaultValue: value }))
                .join(', ')}
              onChange={(event) => {
                const value = event.target.value;
                updateFilter(filter.id, { value: typeof value === 'string' ? value.split(',') : value as string[] });
              }}
              sx={drawerSelectSx}
            >
              {MONITORING_ALERT_STATUS_VALUES.map((status) => (
                <MenuItem key={status} value={status} sx={drawerMenuItemSx}>
                  <Checkbox size="small" checked={Array.isArray(filter.value) && filter.value.includes(status)} />
                  <ListItemText
                    primary={(
                      <DotOptionLabel
                        color={monitoringStatusSemanticColor(status)}
                        label={t(`settings.monitoringStatuses.${status}`)}
                      />
                    )}
                  />
                </MenuItem>
              ))}
            </Select>
          )}

          {filter.field === 'severity_floor' && (
            <Select
              variant="standard"
              value={typeof filter.value === 'string' ? filter.value : ''}
              onChange={(event) => updateFilter(filter.id, { value: event.target.value })}
              sx={drawerSelectSx}
            >
              {MONITORING_SEVERITY_VALUES.map((severity) => (
                <MenuItem key={severity} value={severity} sx={drawerMenuItemSx}>
                  <DotOptionLabel
                    color={monitoringSeveritySemanticColor(severity)}
                    label={t(`settings.monitoringSeverities.${severity}`)}
                  />
                </MenuItem>
              ))}
            </Select>
          )}

          {filter.field === 'severity_values' && (
            <Select
              multiple
              variant="standard"
              value={Array.isArray(filter.value) ? filter.value : []}
              renderValue={(selected) => (selected as string[])
                .map((value) => t(`settings.monitoringSeverities.${value}`, { defaultValue: value }))
                .join(', ')}
              onChange={(event) => {
                const value = event.target.value;
                updateFilter(filter.id, { value: typeof value === 'string' ? value.split(',') : value as string[] });
              }}
              sx={drawerSelectSx}
            >
              {MONITORING_SEVERITY_VALUES.map((severity) => (
                <MenuItem key={severity} value={severity} sx={drawerMenuItemSx}>
                  <Checkbox size="small" checked={Array.isArray(filter.value) && filter.value.includes(severity)} />
                  <ListItemText
                    primary={(
                      <DotOptionLabel
                        color={monitoringSeveritySemanticColor(severity)}
                        label={t(`settings.monitoringSeverities.${severity}`)}
                      />
                    )}
                  />
                </MenuItem>
              ))}
            </Select>
          )}

          {filter.field === 'ack_state' && (
            <Select
              variant="standard"
              value={typeof filter.value === 'string' && filter.value ? filter.value : 'unacknowledged'}
              onChange={(event) => updateFilter(filter.id, { value: event.target.value })}
              sx={drawerSelectSx}
            >
              <MenuItem value="unacknowledged" sx={drawerMenuItemSx}>{t('settings.monitoringAck.unacknowledged')}</MenuItem>
              <MenuItem value="any" sx={drawerMenuItemSx}>{t('settings.monitoringAck.any')}</MenuItem>
            </Select>
          )}

          {PROVIDER_REF_FIELDS.has(filter.field) && (
            agentId ? (
              <MonitoringReferenceAutocomplete
                agentId={agentId}
                field={filter.field as MonitoringProviderRefField}
                values={stringValues(filter.value)}
                onChange={(values) => updateFilter(filter.id, { value: values })}
              />
            ) : (
              <MonitoringProviderRefDisplay
                values={stringValues(filter.value)}
                hint={t('settings.monitoringBuilder.valuesUnavailable')}
              />
            )
          )}

          {filter.field === 'age_minutes' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                variant="standard"
                type="number"
                value={filter.amount}
                InputProps={{ disableUnderline: true, inputProps: { min: 1 } }}
                sx={[editableFieldValueSx, { maxWidth: 92 }]}
                onChange={(event) => updateFilter(filter.id, { amount: event.target.value })}
              />
              <Typography variant="body2" color="text.secondary">
                {t('settings.monitoringBuilder.minutes')}
              </Typography>
            </Stack>
          )}

          {filter.field === 'touched_by' && (
            <Typography variant="body2" color="text.secondary">{t('settings.targetingBuilder.thisAgent')}</Typography>
          )}

          <Tooltip title={t('settings.targetingBuilder.remove')}>
            <IconButton size="small" onClick={() => removeFilter(filter.id)} aria-label={t('settings.targetingBuilder.remove')}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
      <Button size="small" variant="text" startIcon={<AddIcon />} onClick={addFilter} sx={[actionLinkButtonSx, { alignSelf: 'flex-start' }]}>
        {t('settings.targetingBuilder.add')}
      </Button>
    </Stack>
  );
}
