import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import {
  interfacesApi,
  type CreateInterfaceMappingGroupInput,
  type CreateInterfaceMappingRuleInput,
  type InterfaceMappingGroup,
  type InterfaceMappingRule,
  type InterfaceMappingSet,
} from '../../../api/endpoints/interfaces';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
import type { InterfaceDetail, InterfaceLeg } from '../components/interface-workspace/types';

export type InterfaceMappingTabHandle = {
  save: () => Promise<boolean>;
  reset: () => Promise<void>;
  isDirty: () => boolean;
};

type Props = {
  canManage: boolean;
  interfaceId: string;
  data: InterfaceDetail | null;
  onDirtyChange?: (dirty: boolean) => void;
};

type GroupFilterKey = typeof ALL_GROUPS_KEY | typeof UNGROUPED_GROUP_KEY | string;

type GroupFormState = {
  id: string;
  title: string;
  description: string;
  order_index: string;
};

type BindingFormState = {
  id: string;
  path: string;
  data_type: string;
  extras: Record<string, unknown>;
};

type BindingCollectionKey = 'source_bindings' | 'target_bindings';

type RuleFormState = {
  id: string;
  title: string;
  rule_key: string;
  group_id: string;
  order_index: string;
  applies_to_leg_id: string;
  operation_kind_choice: string;
  operation_kind_other: string;
  source_bindings: BindingFormState[];
  target_bindings: BindingFormState[];
  condition_text: string;
  business_rule_text: string;
  middleware_rule_text: string;
  remarks: string;
};

type GroupEditorState = {
  open: boolean;
  mode: 'create' | 'edit';
  baseline: GroupFormState;
  form: GroupFormState;
  error: string | null;
};

type RuleEditorState = {
  open: boolean;
  mode: 'create' | 'edit';
  baseline: RuleFormState;
  form: RuleFormState;
  error: string | null;
};

const ALL_GROUPS_KEY = '__all__';
const UNGROUPED_GROUP_KEY = '__ungrouped__';
const OTHER_OPERATION_KIND = '__other__';
const BINDING_KEYS = ['path', 'field', 'name', 'key', 'label', 'source', 'target'];
const BINDING_TYPE_KEYS = ['type', 'data_type', 'datatype'];
const DEFAULT_ITEM_GROUP_TITLE = 'Item';
const RESERVED_GROUP_TITLE_KEYS = new Set(['head', 'item']);

const OPERATION_KIND_OPTIONS = [
  { value: 'direct', label: 'Direct copy' },
  { value: 'transform', label: 'Transform' },
  { value: 'lookup', label: 'Lookup' },
  { value: 'split', label: 'Split' },
  { value: 'merge', label: 'Merge' },
  { value: 'filter', label: 'Filter' },
  { value: 'default', label: 'Default value' },
];

const BINDING_TYPE_OPTIONS = [
  'string',
  'number',
  'integer',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'time',
  'object',
  'array',
  'identifier',
  'code',
  'amount',
];

class MappingValidationError extends Error {
  target: 'group' | 'rule';

  constructor(target: 'group' | 'rule', message: string) {
    super(message);
    this.target = target;
  }
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeGroupTitleKey(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeOptionalText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function normalizeOptionalId(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function makeTempId(prefix: string) {
  return `tmp:${prefix}:${Math.random().toString(36).slice(2, 10)}`;
}

function isTempId(value: string | null | undefined) {
  return typeof value === 'string' && value.startsWith('tmp:');
}

function parsePositiveInteger(value: string, label: string, target: 'group' | 'rule') {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    throw new MappingValidationError(target, `${label} is required.`);
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new MappingValidationError(target, `${label} must be 1 or greater.`);
  }
  return parsed;
}

function sortMappingSets(sets: InterfaceMappingSet[]) {
  return [...sets].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function sortGroups(groups: InterfaceMappingGroup[]) {
  return [...groups].sort((a, b) => {
    if (a.order_index !== b.order_index) return a.order_index - b.order_index;
    const titleCompare = (a.title || '').localeCompare(b.title || '');
    if (titleCompare !== 0) return titleCompare;
    return (a.id || '').localeCompare(b.id || '');
  });
}

function isReservedGroup(group: InterfaceMappingGroup | null | undefined) {
  return RESERVED_GROUP_TITLE_KEYS.has(normalizeGroupTitleKey(group?.title));
}

function findGroupByTitle(groups: InterfaceMappingGroup[], title: string) {
  const target = normalizeGroupTitleKey(title);
  return groups.find((group) => normalizeGroupTitleKey(group.title) === target) || null;
}

function sortRules(rules: InterfaceMappingRule[], groups: InterfaceMappingGroup[]) {
  const groupOrder = new Map(groups.map((group) => [group.id, group.order_index]));
  return [...rules].sort((a, b) => {
    const aGroupOrder = a.group_id ? groupOrder.get(a.group_id) ?? Number.MAX_SAFE_INTEGER - 1 : Number.MAX_SAFE_INTEGER;
    const bGroupOrder = b.group_id ? groupOrder.get(b.group_id) ?? Number.MAX_SAFE_INTEGER - 1 : Number.MAX_SAFE_INTEGER;
    if (aGroupOrder !== bGroupOrder) return aGroupOrder - bGroupOrder;
    if (a.order_index !== b.order_index) return a.order_index - b.order_index;
    const titleCompare = (a.title || '').localeCompare(b.title || '');
    if (titleCompare !== 0) return titleCompare;
    return (a.id || '').localeCompare(b.id || '');
  });
}

function normalizeLoadedGroups(groups: InterfaceMappingGroup[]) {
  return sortGroups(groups).map((group, index) => ({
    ...group,
    order_index: Number(group.order_index || 0) > 0 ? Number(group.order_index) : index + 1,
  }));
}

function normalizeLoadedRules(rules: InterfaceMappingRule[], groups: InterfaceMappingGroup[]) {
  const sorted = sortRules(rules, groups);
  const counters = new Map<string, number>();
  return sorted.map((rule) => {
    const bucket = rule.group_id || UNGROUPED_GROUP_KEY;
    const current = Number(rule.order_index || 0);
    if (current > 0) {
      counters.set(bucket, Math.max(counters.get(bucket) || 0, current));
      return { ...rule, order_index: current };
    }
    const next = (counters.get(bucket) || 0) + 1;
    counters.set(bucket, next);
    return { ...rule, order_index: next };
  });
}

function nextGroupOrderIndex(groups: InterfaceMappingGroup[]) {
  return groups.reduce((max, item) => Math.max(max, Number(item.order_index || 0)), 0) + 1;
}

function nextRuleOrderIndex(rules: InterfaceMappingRule[], groupId: string | null) {
  return rules
    .filter((item) => (item.group_id || null) === (groupId || null))
    .reduce((max, item) => Math.max(max, Number(item.order_index || 0)), 0) + 1;
}

function bindingTextFromItem(item: Record<string, unknown>) {
  let bindingText = '';
  let bindingType = '';

  for (const key of BINDING_KEYS) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      bindingText = value.trim();
      break;
    }
  }

  for (const key of BINDING_TYPE_KEYS) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      bindingType = value.trim();
      break;
    }
  }

  if (bindingText && bindingType) {
    return `${bindingText} (${bindingType})`;
  }
  if (bindingText) {
    return bindingText;
  }
  const entries = Object.entries(item).slice(0, 2);
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `${key}: ${String(value ?? '')}`).join(', ');
}

function createEmptyBindingRow(): BindingFormState {
  return {
    id: makeTempId('binding'),
    path: '',
    data_type: '',
    extras: {},
  };
}

function bindingFormFromEntity(item: unknown): BindingFormState {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return createEmptyBindingRow();
  }

  const record = item as Record<string, unknown>;
  let path = '';
  let dataType = '';
  const extras: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (!path && BINDING_KEYS.includes(key) && typeof value === 'string' && value.trim()) {
      path = value.trim();
      continue;
    }
    if (!dataType && BINDING_TYPE_KEYS.includes(key) && typeof value === 'string' && value.trim()) {
      dataType = value.trim();
      continue;
    }
    if (BINDING_KEYS.includes(key) || BINDING_TYPE_KEYS.includes(key)) {
      continue;
    }
    extras[key] = cloneValue(value);
  }

  return {
    id: makeTempId('binding'),
    path,
    data_type: dataType,
    extras,
  };
}

function bindingsFormFromEntity(bindings: Array<Record<string, unknown>> | null | undefined) {
  if (!Array.isArray(bindings) || bindings.length === 0) {
    return [createEmptyBindingRow()];
  }
  const rows = bindings.map((item) => bindingFormFromEntity(item));
  return rows.length > 0 ? rows : [createEmptyBindingRow()];
}

function bindingPayloadFromForm(row: BindingFormState): Record<string, unknown> | null {
  const path = String(row.path || '').trim();
  if (!path) {
    return null;
  }
  const dataType = String(row.data_type || '').trim();
  return {
    ...cloneValue(row.extras),
    path,
    ...(dataType ? { type: dataType } : {}),
  };
}

function bindingsPayloadFromForm(rows: BindingFormState[]) {
  return rows
    .map((row) => bindingPayloadFromForm(row))
    .filter((row): row is Record<string, unknown> => !!row);
}

function bindingsSummary(bindings: Array<Record<string, unknown>> | null | undefined) {
  const lines = Array.isArray(bindings)
    ? bindings
      .map((item) => bindingTextFromItem(item))
      .filter(Boolean)
    : [];
  if (lines.length === 0) return 'Not set';
  if (lines.length === 1) return lines[0];
  return `${lines[0]} (+${lines.length - 1})`;
}

function resolveOperationKindChoice(value: string | null | undefined) {
  const normalized = String(value || '').trim() || 'direct';
  const isCommon = OPERATION_KIND_OPTIONS.some((option) => option.value === normalized);
  return {
    choice: isCommon ? normalized : OTHER_OPERATION_KIND,
    other: isCommon ? '' : normalized,
  };
}

function formatOperationKind(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  const option = OPERATION_KIND_OPTIONS.find((item) => item.value === normalized);
  return option?.label || normalized || 'Direct copy';
}

function groupFormFromEntity(group: InterfaceMappingGroup): GroupFormState {
  return {
    id: group.id,
    title: group.title || '',
    description: group.description || '',
    order_index: String(group.order_index || 1),
  };
}

function ruleFormFromEntity(rule: InterfaceMappingRule): RuleFormState {
  const operation = resolveOperationKindChoice(rule.operation_kind);
  return {
    id: rule.id,
    title: rule.title || '',
    rule_key: rule.rule_key || '',
    group_id: rule.group_id || '',
    order_index: String(rule.order_index || 1),
    applies_to_leg_id: rule.applies_to_leg_id || '',
    operation_kind_choice: operation.choice,
    operation_kind_other: operation.other,
    source_bindings: bindingsFormFromEntity(rule.source_bindings),
    target_bindings: bindingsFormFromEntity(rule.target_bindings),
    condition_text: rule.condition_text || '',
    business_rule_text: rule.business_rule_text || '',
    middleware_rule_text: rule.middleware_rule_text || '',
    remarks: rule.remarks || '',
  };
}

function createClosedGroupEditor(): GroupEditorState {
  const emptyForm: GroupFormState = { id: '', title: '', description: '', order_index: '1' };
  return {
    open: false,
    mode: 'create',
    baseline: emptyForm,
    form: emptyForm,
    error: null,
  };
}

function createClosedRuleEditor(): RuleEditorState {
  const emptyForm: RuleFormState = {
    id: '',
    title: '',
    rule_key: '',
    group_id: '',
    order_index: '1',
    applies_to_leg_id: '',
    operation_kind_choice: 'direct',
    operation_kind_other: '',
    source_bindings: [createEmptyBindingRow()],
    target_bindings: [createEmptyBindingRow()],
    condition_text: '',
    business_rule_text: '',
    middleware_rule_text: '',
    remarks: '',
  };
  return {
    open: false,
    mode: 'create',
    baseline: emptyForm,
    form: emptyForm,
    error: null,
  };
}

function groupPayloadFromEntity(group: InterfaceMappingGroup): CreateInterfaceMappingGroupInput {
  return {
    title: String(group.title || '').trim(),
    description: normalizeOptionalText(group.description),
    order_index: Number(group.order_index || 1),
  };
}

function rulePayloadFromEntity(
  rule: InterfaceMappingRule,
  resolveGroupId: (groupId: string | null | undefined) => string | null,
): CreateInterfaceMappingRuleInput {
  return {
    group_id: resolveGroupId(rule.group_id),
    rule_key: normalizeOptionalText(rule.rule_key),
    title: String(rule.title || '').trim(),
    order_index: Number(rule.order_index || 1),
    applies_to_leg_id: normalizeOptionalId(rule.applies_to_leg_id),
    operation_kind: normalizeOptionalText(rule.operation_kind) || 'direct',
    source_bindings: cloneValue(Array.isArray(rule.source_bindings) ? rule.source_bindings : []),
    target_bindings: cloneValue(Array.isArray(rule.target_bindings) ? rule.target_bindings : []),
    condition_text: normalizeOptionalText(rule.condition_text),
    business_rule_text: normalizeOptionalText(rule.business_rule_text),
    middleware_rule_text: normalizeOptionalText(rule.middleware_rule_text),
    remarks: normalizeOptionalText(rule.remarks),
    example_input: normalizeOptionalText(rule.example_input),
    example_output: normalizeOptionalText(rule.example_output),
    implementation_status: normalizeOptionalText(rule.implementation_status),
    test_status: normalizeOptionalText(rule.test_status),
  };
}

function serializeGroups(groups: InterfaceMappingGroup[]) {
  return JSON.stringify(
    sortGroups(groups).map((group) => ({
      id: group.id,
      title: String(group.title || '').trim(),
      description: normalizeOptionalText(group.description),
      order_index: Number(group.order_index || 1),
    })),
  );
}

function serializeRules(rules: InterfaceMappingRule[], groups: InterfaceMappingGroup[]) {
  return JSON.stringify(
    sortRules(rules, groups).map((rule) => ({
      id: rule.id,
      payload: rulePayloadFromEntity(rule, (groupId) => groupId || null),
    })),
  );
}

export default forwardRef<InterfaceMappingTabHandle, Props>(function InterfaceMappingTab({
  canManage,
  interfaceId,
  data,
  onDirtyChange,
}, ref) {
  const { t } = useTranslation(['it', 'common']);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mappingSets, setMappingSets] = React.useState<InterfaceMappingSet[]>([]);
  const [mappingSet, setMappingSet] = React.useState<InterfaceMappingSet | null>(null);
  const [baselineGroups, setBaselineGroups] = React.useState<InterfaceMappingGroup[]>([]);
  const [draftGroups, setDraftGroups] = React.useState<InterfaceMappingGroup[]>([]);
  const [baselineRules, setBaselineRules] = React.useState<InterfaceMappingRule[]>([]);
  const [draftRules, setDraftRules] = React.useState<InterfaceMappingRule[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<GroupFilterKey>(ALL_GROUPS_KEY);
  const [groupManagerOpen, setGroupManagerOpen] = React.useState(false);
  const [groupEditor, setGroupEditor] = React.useState<GroupEditorState>(() => createClosedGroupEditor());
  const [ruleEditor, setRuleEditor] = React.useState<RuleEditorState>(() => createClosedRuleEditor());

  const legs = React.useMemo(() => (data?.legs || []) as InterfaceLeg[], [data?.legs]);

  const getRoleLabel = React.useCallback((role: string) => {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'source') return data?.source_application_name || 'Source';
    if (normalized === 'target') return data?.target_application_name || 'Target';
    if (normalized === 'middleware') return 'Middleware';
    return role || '';
  }, [data?.source_application_name, data?.target_application_name]);

  const legLabel = React.useCallback((leg: InterfaceLeg) => (
    `${String(leg.leg_type || '').toUpperCase()} • ${getRoleLabel(leg.from_role)} -> ${getRoleLabel(leg.to_role)}`
  ), [getRoleLabel]);

  const load = React.useCallback(async () => {
    if (!interfaceId) return;
    setLoading(true);
    setError(null);
    try {
      const setsResponse = await interfacesApi.listMappingSets(interfaceId);
      const nextSets = sortMappingSets(setsResponse.items || []);
      const defaultSet = nextSets.find((item) => item.is_default) || nextSets[0] || null;
      setMappingSets(nextSets);

      if (!defaultSet) {
        setMappingSet(null);
        setBaselineGroups([]);
        setDraftGroups([]);
        setBaselineRules([]);
        setDraftRules([]);
        setGroupEditor(createClosedGroupEditor());
        setRuleEditor(createClosedRuleEditor());
        setSelectedGroupId(ALL_GROUPS_KEY);
        return;
      }

      const [groupsResponse, rulesResponse] = await Promise.all([
        interfacesApi.listMappingGroups(defaultSet.id),
        interfacesApi.listMappingRules(defaultSet.id),
      ]);

      const nextGroups = normalizeLoadedGroups(cloneValue(groupsResponse.items || []));
      const nextRules = normalizeLoadedRules(cloneValue(rulesResponse.items || []), nextGroups);

      setMappingSet(defaultSet);
      setBaselineGroups(nextGroups);
      setDraftGroups(cloneValue(nextGroups));
      setBaselineRules(nextRules);
      setDraftRules(cloneValue(nextRules));
      setGroupManagerOpen(false);
      setGroupEditor(createClosedGroupEditor());
      setRuleEditor(createClosedRuleEditor());
      setSelectedGroupId((current) => {
        if (current === ALL_GROUPS_KEY || current === UNGROUPED_GROUP_KEY) return current;
        return nextGroups.some((group) => group.id === current) ? current : ALL_GROUPS_KEY;
      });
    } catch (loadError: any) {
      setError(getApiErrorMessage(loadError, t, 'Failed to load interface mappings.'));
      setMappingSet(null);
      setMappingSets([]);
      setBaselineGroups([]);
      setDraftGroups([]);
      setBaselineRules([]);
      setDraftRules([]);
    } finally {
      setLoading(false);
    }
  }, [interfaceId, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (selectedGroupId === ALL_GROUPS_KEY || selectedGroupId === UNGROUPED_GROUP_KEY) return;
    if (!draftGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(ALL_GROUPS_KEY);
    }
  }, [draftGroups, selectedGroupId]);

  const groupEditorDirty = React.useMemo(() => (
    groupEditor.open && JSON.stringify(groupEditor.form) !== JSON.stringify(groupEditor.baseline)
  ), [groupEditor]);

  const ruleEditorDirty = React.useMemo(() => (
    ruleEditor.open && JSON.stringify(ruleEditor.form) !== JSON.stringify(ruleEditor.baseline)
  ), [ruleEditor]);

  const draftDirty = React.useMemo(() => (
    serializeGroups(draftGroups) !== serializeGroups(baselineGroups)
    || serializeRules(draftRules, draftGroups) !== serializeRules(baselineRules, baselineGroups)
  ), [baselineGroups, baselineRules, draftGroups, draftRules]);

  const dirty = draftDirty || groupEditorDirty || ruleEditorDirty;

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const setValidationError = React.useCallback((validationError: MappingValidationError) => {
    if (validationError.target === 'group') {
      setGroupEditor((current) => ({ ...current, error: validationError.message }));
    } else {
      setRuleEditor((current) => ({ ...current, error: validationError.message }));
    }
  }, []);

  const normalizeGroupFromForm = React.useCallback((form: GroupFormState, existing?: InterfaceMappingGroup | null) => {
    if (!mappingSet) {
      throw new MappingValidationError('group', 'Default mapping set is not available for this interface.');
    }
    const title = String(form.title || '').trim();
    if (!title) {
      throw new MappingValidationError('group', 'Group title is required.');
    }
    const now = new Date().toISOString();
    return {
      id: existing?.id || form.id || makeTempId('group'),
      tenant_id: existing?.tenant_id || mappingSet.tenant_id,
      interface_id: existing?.interface_id || interfaceId,
      mapping_set_id: existing?.mapping_set_id || mappingSet.id,
      title,
      description: normalizeOptionalText(form.description),
      order_index: parsePositiveInteger(form.order_index, 'Group order', 'group'),
      created_at: existing?.created_at || now,
      updated_at: now,
    } satisfies InterfaceMappingGroup;
  }, [interfaceId, mappingSet]);

  const normalizeRuleFromForm = React.useCallback((
    form: RuleFormState,
    groups: InterfaceMappingGroup[],
    existing?: InterfaceMappingRule | null,
  ) => {
    if (!mappingSet) {
      throw new MappingValidationError('rule', 'Default mapping set is not available for this interface.');
    }
    const title = String(form.title || '').trim();
    if (!title) {
      throw new MappingValidationError('rule', 'Rule title is required.');
    }

    const groupId = normalizeOptionalId(form.group_id);
    if (groupId && !groups.some((group) => group.id === groupId)) {
      throw new MappingValidationError('rule', 'Select a valid group for this rule.');
    }

    const operationKind = form.operation_kind_choice === OTHER_OPERATION_KIND
      ? normalizeOptionalText(form.operation_kind_other)
      : normalizeOptionalText(form.operation_kind_choice);
    if (!operationKind) {
      throw new MappingValidationError('rule', 'Select an operation.');
    }

    const now = new Date().toISOString();
    return {
      id: existing?.id || form.id || makeTempId('rule'),
      tenant_id: existing?.tenant_id || mappingSet.tenant_id,
      interface_id: existing?.interface_id || interfaceId,
      mapping_set_id: existing?.mapping_set_id || mappingSet.id,
      group_id: groupId,
      rule_key: normalizeOptionalText(form.rule_key),
      title,
      order_index: parsePositiveInteger(form.order_index, 'Rule order', 'rule'),
      applies_to_leg_id: normalizeOptionalId(form.applies_to_leg_id),
      operation_kind: operationKind,
      source_bindings: bindingsPayloadFromForm(form.source_bindings),
      target_bindings: bindingsPayloadFromForm(form.target_bindings),
      condition_text: normalizeOptionalText(form.condition_text),
      business_rule_text: normalizeOptionalText(form.business_rule_text),
      middleware_rule_text: normalizeOptionalText(form.middleware_rule_text),
      remarks: normalizeOptionalText(form.remarks),
      example_input: existing?.example_input ?? null,
      example_output: existing?.example_output ?? null,
      implementation_status: existing?.implementation_status ?? null,
      test_status: existing?.test_status ?? null,
      created_at: existing?.created_at || now,
      updated_at: now,
    } satisfies InterfaceMappingRule;
  }, [interfaceId, mappingSet]);

  const buildCommittedSnapshot = React.useCallback(() => {
    let nextGroups = draftGroups;
    if (groupEditorDirty && groupEditor.open) {
      const existingGroup = draftGroups.find((group) => group.id === groupEditor.form.id) || null;
      const normalizedGroup = normalizeGroupFromForm(groupEditor.form, existingGroup);
      nextGroups = sortGroups([
        ...draftGroups.filter((group) => group.id !== normalizedGroup.id),
        normalizedGroup,
      ]);
    }

    let nextRules = draftRules;
    if (ruleEditorDirty && ruleEditor.open) {
      const existingRule = draftRules.find((rule) => rule.id === ruleEditor.form.id) || null;
      const normalizedRule = normalizeRuleFromForm(ruleEditor.form, nextGroups, existingRule);
      nextRules = sortRules([
        ...draftRules.filter((rule) => rule.id !== normalizedRule.id),
        normalizedRule,
      ], nextGroups);
    }

    return { groups: nextGroups, rules: nextRules };
  }, [
    draftGroups,
    draftRules,
    groupEditor,
    groupEditorDirty,
    normalizeGroupFromForm,
    normalizeRuleFromForm,
    ruleEditor,
    ruleEditorDirty,
  ]);

  const commitGroupEditor = React.useCallback(() => {
    try {
      const existingGroup = draftGroups.find((group) => group.id === groupEditor.form.id) || null;
      const normalizedGroup = normalizeGroupFromForm(groupEditor.form, existingGroup);
      const nextGroups = sortGroups([
        ...draftGroups.filter((group) => group.id !== normalizedGroup.id),
        normalizedGroup,
      ]);
      setDraftGroups(nextGroups);
      setSelectedGroupId(normalizedGroup.id);
      setGroupEditor(createClosedGroupEditor());
      return true;
    } catch (validationError: any) {
      if (validationError instanceof MappingValidationError) {
        setValidationError(validationError);
        return false;
      }
      throw validationError;
    }
  }, [draftGroups, groupEditor.form, normalizeGroupFromForm, setValidationError]);

  const persistSnapshot = React.useCallback(async (
    snapshot: { groups: InterfaceMappingGroup[]; rules: InterfaceMappingRule[] },
  ) => {
    if (!mappingSet) return { ok: true, message: null as string | null };
    if (!canManage) {
      const message = 'You do not have permission to edit mappings.';
      setError(message);
      return { ok: false, message };
    }

    setSaving(true);
    setError(null);
    let wroteToServer = false;

    try {
      const baselineGroupMap = new Map(baselineGroups.map((group) => [group.id, group]));
      const baselineRuleMap = new Map(baselineRules.map((rule) => [rule.id, rule]));
      const nextExistingGroupIds = new Set(snapshot.groups.filter((group) => !isTempId(group.id)).map((group) => group.id));
      const nextExistingRuleIds = new Set(snapshot.rules.filter((rule) => !isTempId(rule.id)).map((rule) => rule.id));

      const deletedRules = baselineRules.filter((rule) => !nextExistingRuleIds.has(rule.id));
      for (const rule of deletedRules) {
        await interfacesApi.deleteMappingRule(rule.id);
        wroteToServer = true;
      }

      const createdGroupIdMap = new Map<string, string>();
      const createdGroups = snapshot.groups.filter((group) => isTempId(group.id));
      for (const group of createdGroups) {
        const savedGroup = await interfacesApi.createMappingGroup(mappingSet.id, groupPayloadFromEntity(group));
        createdGroupIdMap.set(group.id, savedGroup.id);
        wroteToServer = true;
      }

      const updatedGroups = snapshot.groups.filter((group) => (
        !isTempId(group.id)
        && baselineGroupMap.has(group.id)
        && JSON.stringify(groupPayloadFromEntity(group)) !== JSON.stringify(groupPayloadFromEntity(baselineGroupMap.get(group.id)!))
      ));
      for (const group of updatedGroups) {
        await interfacesApi.updateMappingGroup(group.id, groupPayloadFromEntity(group));
        wroteToServer = true;
      }

      const deletedGroups = baselineGroups.filter((group) => !nextExistingGroupIds.has(group.id));
      for (const group of deletedGroups) {
        await interfacesApi.deleteMappingGroup(group.id);
        wroteToServer = true;
      }

      const resolveGroupId = (groupId: string | null | undefined) => {
        if (!groupId) return null;
        if (!isTempId(groupId)) return groupId;
        return createdGroupIdMap.get(groupId) || null;
      };

      const createdRules = snapshot.rules.filter((rule) => isTempId(rule.id));
      for (const rule of createdRules) {
        await interfacesApi.createMappingRule(mappingSet.id, rulePayloadFromEntity(rule, resolveGroupId));
        wroteToServer = true;
      }

      const updatedRules = snapshot.rules.filter((rule) => {
        if (isTempId(rule.id) || !baselineRuleMap.has(rule.id)) return false;
        const baselineRule = baselineRuleMap.get(rule.id)!;
        return JSON.stringify(rulePayloadFromEntity(rule, resolveGroupId))
          !== JSON.stringify(rulePayloadFromEntity(baselineRule, (groupId) => groupId || null));
      });
      for (const rule of updatedRules) {
        await interfacesApi.updateMappingRule(rule.id, rulePayloadFromEntity(rule, resolveGroupId));
        wroteToServer = true;
      }

      setGroupManagerOpen(false);
      setGroupEditor(createClosedGroupEditor());
      setRuleEditor(createClosedRuleEditor());
      await load();
      return { ok: true, message: null as string | null };
    } catch (saveError: any) {
      const message = getApiErrorMessage(saveError, t, 'Failed to save interface mappings.');
      setError(message);
      if (wroteToServer) {
        setGroupManagerOpen(false);
        setGroupEditor(createClosedGroupEditor());
        setRuleEditor(createClosedRuleEditor());
        await load();
      }
      return { ok: false, message };
    } finally {
      setSaving(false);
    }
  }, [
    baselineGroups,
    baselineRules,
    canManage,
    load,
    mappingSet,
    t,
  ]);

  const save = React.useCallback(async () => {
    let snapshot: { groups: InterfaceMappingGroup[]; rules: InterfaceMappingRule[] };
    try {
      snapshot = buildCommittedSnapshot();
    } catch (validationError: any) {
      if (validationError instanceof MappingValidationError) {
        setValidationError(validationError);
        return false;
      }
      throw validationError;
    }

    const result = await persistSnapshot(snapshot);
    return result.ok;
  }, [buildCommittedSnapshot, persistSnapshot, setValidationError]);

  const replaceRuleBindingRows = React.useCallback((
    form: RuleFormState,
    key: BindingCollectionKey,
    rows: BindingFormState[],
  ): RuleFormState => {
    if (key === 'source_bindings') {
      return { ...form, source_bindings: rows };
    }
    return { ...form, target_bindings: rows };
  }, []);

  const addRuleBindingRow = React.useCallback((key: BindingCollectionKey) => {
    setRuleEditor((current) => ({
      ...current,
      error: null,
      form: replaceRuleBindingRows(current.form, key, [
        ...current.form[key],
        createEmptyBindingRow(),
      ]),
    }));
  }, [replaceRuleBindingRows]);

  const updateRuleBindingRow = React.useCallback((
    key: BindingCollectionKey,
    rowId: string,
    patch: Partial<BindingFormState>,
  ) => {
    setRuleEditor((current) => ({
      ...current,
      error: null,
      form: replaceRuleBindingRows(
        current.form,
        key,
        current.form[key].map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      ),
    }));
  }, [replaceRuleBindingRows]);

  const removeRuleBindingRow = React.useCallback((key: BindingCollectionKey, rowId: string) => {
    setRuleEditor((current) => {
      const nextRows = current.form[key].filter((row) => row.id !== rowId);
      return {
        ...current,
        error: null,
        form: replaceRuleBindingRows(
          current.form,
          key,
          nextRows.length > 0 ? nextRows : [createEmptyBindingRow()],
        ),
      };
    });
  }, [replaceRuleBindingRows]);

  const saveRuleEditor = React.useCallback(async () => {
    let snapshot: { groups: InterfaceMappingGroup[]; rules: InterfaceMappingRule[] };
    try {
      const existingRule = draftRules.find((rule) => rule.id === ruleEditor.form.id) || null;
      const normalizedRule = normalizeRuleFromForm(ruleEditor.form, draftGroups, existingRule);
      snapshot = {
        groups: draftGroups,
        rules: sortRules([
          ...draftRules.filter((rule) => rule.id !== normalizedRule.id),
          normalizedRule,
        ], draftGroups),
      };
    } catch (validationError: any) {
      if (validationError instanceof MappingValidationError) {
        setValidationError(validationError);
        return false;
      }
      throw validationError;
    }

    const result = await persistSnapshot(snapshot);
    if (!result.ok && result.message) {
      setRuleEditor((current) => (
        current.open ? { ...current, error: result.message } : current
      ));
    }
    return result.ok;
  }, [
    draftGroups,
    draftRules,
    normalizeRuleFromForm,
    persistSnapshot,
    ruleEditor.form,
    setValidationError,
  ]);

  const reset = React.useCallback(async () => {
    setError(null);
    setGroupManagerOpen(false);
    setGroupEditor(createClosedGroupEditor());
    setRuleEditor(createClosedRuleEditor());
    await load();
  }, [load]);

  useImperativeHandle(ref, () => ({
    save,
    reset,
    isDirty: () => dirty,
  }), [dirty, reset, save]);

  const ruleCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    let ungrouped = 0;
    for (const rule of draftRules) {
      if (rule.group_id) {
        counts.set(rule.group_id, (counts.get(rule.group_id) || 0) + 1);
      } else {
        ungrouped += 1;
      }
    }
    return { counts, ungrouped };
  }, [draftRules]);

  const visibleRules = React.useMemo(() => {
    const sorted = sortRules(draftRules, draftGroups);
    if (selectedGroupId === ALL_GROUPS_KEY) return sorted;
    if (selectedGroupId === UNGROUPED_GROUP_KEY) {
      return sorted.filter((rule) => !rule.group_id);
    }
    return sorted.filter((rule) => rule.group_id === selectedGroupId);
  }, [draftGroups, draftRules, selectedGroupId]);

  const selectedGroup = React.useMemo(() => (
    selectedGroupId === ALL_GROUPS_KEY || selectedGroupId === UNGROUPED_GROUP_KEY
      ? null
      : draftGroups.find((group) => group.id === selectedGroupId) || null
  ), [draftGroups, selectedGroupId]);

  const defaultItemGroup = React.useMemo(
    () => findGroupByTitle(draftGroups, DEFAULT_ITEM_GROUP_TITLE),
    [draftGroups],
  );

  const openCreateGroup = React.useCallback(() => {
    const form: GroupFormState = {
      id: makeTempId('group'),
      title: '',
      description: '',
      order_index: String(nextGroupOrderIndex(draftGroups)),
    };
    setGroupEditor({
      open: true,
      mode: 'create',
      baseline: form,
      form,
      error: null,
    });
  }, [draftGroups]);

  const openEditGroup = React.useCallback((group: InterfaceMappingGroup) => {
    if (isReservedGroup(group)) {
      return;
    }
    const form = groupFormFromEntity(group);
    setGroupEditor({
      open: true,
      mode: 'edit',
      baseline: form,
      form,
      error: null,
    });
  }, []);

  const openCreateRule = React.useCallback(() => {
    const preferredGroupId = selectedGroupId !== ALL_GROUPS_KEY && selectedGroupId !== UNGROUPED_GROUP_KEY
      ? selectedGroupId
      : defaultItemGroup?.id || '';
    const form: RuleFormState = {
      id: makeTempId('rule'),
      title: '',
      rule_key: '',
      group_id: preferredGroupId,
      order_index: String(nextRuleOrderIndex(draftRules, preferredGroupId || null)),
      applies_to_leg_id: '',
      operation_kind_choice: 'direct',
      operation_kind_other: '',
      source_bindings: [createEmptyBindingRow()],
      target_bindings: [createEmptyBindingRow()],
      condition_text: '',
      business_rule_text: '',
      middleware_rule_text: '',
      remarks: '',
    };
    setRuleEditor({
      open: true,
      mode: 'create',
      baseline: form,
      form,
      error: null,
    });
  }, [defaultItemGroup?.id, draftRules, selectedGroupId]);

  const openEditRule = React.useCallback((rule: InterfaceMappingRule) => {
    const form = ruleFormFromEntity(rule);
    setRuleEditor({
      open: true,
      mode: 'edit',
      baseline: form,
      form,
      error: null,
    });
  }, []);

  const deleteGroup = React.useCallback((group: InterfaceMappingGroup) => {
    if (isReservedGroup(group)) {
      return;
    }
    const proceed = window.confirm('Delete this mapping group? Rules assigned to it will move to Ungrouped.');
    if (!proceed) return;

    const nextGroups = draftGroups.filter((item) => item.id !== group.id);
    const nextRules = sortRules(
      draftRules.map((rule) => (
        rule.group_id === group.id ? { ...rule, group_id: null, updated_at: new Date().toISOString() } : rule
      )),
      nextGroups,
    );

    setDraftGroups(nextGroups);
    setDraftRules(nextRules);
    if (selectedGroupId === group.id) {
      setSelectedGroupId(ALL_GROUPS_KEY);
    }
    if (groupEditor.open && groupEditor.form.id === group.id) {
      setGroupEditor(createClosedGroupEditor());
    }
    if (ruleEditor.open && ruleEditor.form.group_id === group.id) {
      setRuleEditor((current) => ({
        ...current,
        form: { ...current.form, group_id: '' },
      }));
    }
  }, [draftGroups, draftRules, groupEditor.form.id, groupEditor.open, ruleEditor.form.group_id, ruleEditor.open, selectedGroupId]);

  const deleteRule = React.useCallback((rule: InterfaceMappingRule) => {
    const proceed = window.confirm(`Delete mapping rule "${rule.title}"?`);
    if (!proceed) return;
    setDraftRules((current) => current.filter((item) => item.id !== rule.id));
    if (ruleEditor.open && ruleEditor.form.id === rule.id) {
      setRuleEditor(createClosedRuleEditor());
    }
  }, [ruleEditor.form.id, ruleEditor.open]);

  const groupActionsDisabled = !canManage || loading || saving || groupEditor.open || ruleEditor.open;
  const ruleActionsDisabled = !canManage || loading || saving || groupEditor.open || ruleEditor.open;

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      {!!error && <Alert severity="error">{error}</Alert>}

      {loading ? <LinearProgress /> : null}

      {!mappingSet && !loading ? (
        <Alert severity="warning">
          No default mapping set is available for this interface yet.
        </Alert>
      ) : null}

      {mappingSet ? (
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="subtitle2">Mapping workspace</Typography>
              <Chip label={`Set: ${mappingSet.name}`} size="small" />
              <Chip label={`Revision ${mappingSet.revision_number || 1}`} size="small" variant="outlined" />
              <Chip label={`${draftRules.length} rules`} size="small" variant="outlined" />
              <Chip label={`${draftGroups.length} groups`} size="small" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              This view is simplified for editors: each source and target binding gets its own row, optional type descriptions stay lightweight, and saving a rule from the drawer persists it immediately.
            </Typography>
            {mappingSets.length > 1 ? (
              <Alert severity="info">
                This slice still opens the default mapping set only. {mappingSets.length - 1} additional set{mappingSets.length - 1 === 1 ? '' : 's'} exist but stay outside the active UX for now.
              </Alert>
            ) : null}
          </Stack>

          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', lg: 'center' }}
              justifyContent="space-between"
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <TextField
                  select
                  size="small"
                  label="Group view"
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 280 } }}
                >
                  <MenuItem value={ALL_GROUPS_KEY}>All rules</MenuItem>
                  <MenuItem value={UNGROUPED_GROUP_KEY}>Ungrouped ({ruleCounts.ungrouped})</MenuItem>
                  {sortGroups(draftGroups).map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.order_index}. {group.title} ({ruleCounts.counts.get(group.id) || 0})
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setGroupManagerOpen(true)}
                  disabled={groupActionsDisabled}
                >
                  Manage groups
                </Button>
              </Stack>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateRule}
                disabled={ruleActionsDisabled || !mappingSet}
              >
                Add rule
              </Button>
            </Stack>
          </Paper>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2">
              {selectedGroupId === ALL_GROUPS_KEY
                ? 'Mapping rules'
                : selectedGroupId === UNGROUPED_GROUP_KEY
                  ? 'Ungrouped rules'
                  : selectedGroup?.title || 'Mapping rules'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedGroupId === ALL_GROUPS_KEY
                ? 'Review and edit the mappings in the default set.'
                : selectedGroupId === UNGROUPED_GROUP_KEY
                  ? 'Rules without a group assignment.'
                  : selectedGroup?.description || 'Rules assigned to this group.'}
            </Typography>
          </Stack>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 80 }}>Order</TableCell>
                  <TableCell>Mapping</TableCell>
                  <TableCell sx={{ width: 180 }}>Operation</TableCell>
                  <TableCell sx={{ width: 180 }}>Group</TableCell>
                  <TableCell sx={{ width: 240 }}>Leg scope</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        No mapping rules in this view yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRules.map((rule) => {
                    const ruleGroup = rule.group_id
                      ? draftGroups.find((group) => group.id === rule.group_id) || null
                      : null;
                    const ruleLeg = rule.applies_to_leg_id
                      ? legs.find((leg) => leg.id === rule.applies_to_leg_id) || null
                      : null;
                    return (
                      <TableRow
                        key={rule.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => openEditRule(rule)}
                      >
                        <TableCell>{rule.order_index}</TableCell>
                        <TableCell>
                          <Stack spacing={0.35}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {rule.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {bindingsSummary(rule.source_bindings)} {'->'} {bindingsSummary(rule.target_bindings)}
                            </Typography>
                            {rule.condition_text ? (
                              <Typography variant="caption" color="text.secondary">
                                Condition: {rule.condition_text}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>{formatOperationKind(rule.operation_kind)}</TableCell>
                        <TableCell>{ruleGroup?.title || 'Ungrouped'}</TableCell>
                        <TableCell>{ruleLeg ? legLabel(ruleLeg) : 'All legs'}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditRule(rule);
                              }}
                              disabled={ruleActionsDisabled}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteRule(rule);
                              }}
                              disabled={ruleActionsDisabled}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      ) : null}

      <Dialog
        open={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manage mapping groups</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Head and Item stay available as baseline groups. Additional groups are managed here so the rules grid can use the available space.
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={openCreateGroup}
                disabled={groupActionsDisabled}
              >
                Add group
              </Button>
            </Stack>
            <Paper variant="outlined">
              <List dense disablePadding>
                <ListItem disablePadding>
                  <ListItemButton
                    selected={selectedGroupId === UNGROUPED_GROUP_KEY}
                    onClick={() => {
                      setSelectedGroupId(UNGROUPED_GROUP_KEY);
                      setGroupManagerOpen(false);
                    }}
                  >
                    <ListItemText
                      primary="Ungrouped"
                      secondary={`${ruleCounts.ungrouped} rules`}
                    />
                  </ListItemButton>
                </ListItem>
                {sortGroups(draftGroups).map((group) => (
                  <ListItem
                    key={group.id}
                    disablePadding
                    secondaryAction={isReservedGroup(group) ? (
                      <Chip label="Default" size="small" variant="outlined" />
                    ) : canManage ? (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditGroup(group);
                          }}
                          disabled={groupActionsDisabled}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteGroup(group);
                          }}
                          disabled={groupActionsDisabled}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : undefined}
                  >
                    <ListItemButton
                      selected={selectedGroupId === group.id}
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setGroupManagerOpen(false);
                      }}
                    >
                      <ListItemText
                        primary={`${group.order_index}. ${group.title}`}
                        secondary={group.description || `${ruleCounts.counts.get(group.id) || 0} rules`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupManagerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={groupEditor.open}
        onClose={() => setGroupEditor(createClosedGroupEditor())}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {groupEditor.mode === 'create' ? 'Create mapping group' : 'Edit mapping group'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {groupEditor.error ? <Alert severity="error">{groupEditor.error}</Alert> : null}
            <TextField
              label="Group title"
              value={groupEditor.form.title}
              onChange={(event) => setGroupEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, title: event.target.value },
              }))}
              autoFocus
              fullWidth
            />
            <TextField
              label="Description"
              value={groupEditor.form.description}
              onChange={(event) => setGroupEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, description: event.target.value },
              }))}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label="Order"
              value={groupEditor.form.order_index}
              onChange={(event) => setGroupEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, order_index: event.target.value },
              }))}
              type="number"
              inputProps={{ min: 1, step: 1 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupEditor(createClosedGroupEditor())}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={commitGroupEditor}
            disabled={!canManage}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={ruleEditor.open}
        onClose={() => setRuleEditor(createClosedRuleEditor())}
      >
        <Box sx={{ width: { xs: '100vw', sm: 560 }, p: 2, pt: 4 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">
                {ruleEditor.mode === 'create' ? 'Create mapping rule' : 'Edit mapping rule'}
              </Typography>
              <IconButton onClick={() => setRuleEditor(createClosedRuleEditor())}>
                <CloseIcon />
              </IconButton>
            </Stack>

            {ruleEditor.error ? <Alert severity="error">{ruleEditor.error}</Alert> : null}

            <TextField
              label="Rule title"
              value={ruleEditor.form.title}
              onChange={(event) => setRuleEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, title: event.target.value },
              }))}
              autoFocus
              fullWidth
            />

            <TextField
              label="Rule key"
              value={ruleEditor.form.rule_key}
              onChange={(event) => setRuleEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, rule_key: event.target.value },
              }))}
              fullWidth
              InputProps={{
                endAdornment: (
                  <Tooltip title="Optional stable technical identifier if another system or export process needs a fixed key.">
                    <InfoOutlinedIcon fontSize="small" color="action" />
                  </Tooltip>
                ),
              }}
            />

            <TextField
              select
              label="Group"
              value={ruleEditor.form.group_id}
              onChange={(event) => setRuleEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, group_id: event.target.value },
              }))}
              fullWidth
            >
              <MenuItem value="">Ungrouped</MenuItem>
              {sortGroups(draftGroups).map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.order_index}. {group.title}
                </MenuItem>
              ))}
            </TextField>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="subtitle2">Source field(s)</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use one row per source binding. This makes 1:1, 1:N, and N:1 mappings explicit. Type is optional descriptive metadata.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => addRuleBindingRow('source_bindings')}
                    disabled={!canManage || saving}
                  >
                    Add source
                  </Button>
                </Stack>
                {ruleEditor.form.source_bindings.map((binding, index) => (
                  <Stack
                    key={binding.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                  >
                    <TextField
                      label={`Source ${index + 1}`}
                      value={binding.path}
                      onChange={(event) => updateRuleBindingRow('source_bindings', binding.id, { path: event.target.value })}
                      placeholder="origin.customerId"
                      fullWidth
                    />
                    <Autocomplete
                      freeSolo
                      options={BINDING_TYPE_OPTIONS}
                      value={binding.data_type}
                      onChange={(_, value) => updateRuleBindingRow('source_bindings', binding.id, { data_type: value || '' })}
                      onInputChange={(_, value) => updateRuleBindingRow('source_bindings', binding.id, { data_type: value || '' })}
                      sx={{ minWidth: { sm: 220 } }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Type"
                          placeholder="Select or enter a type"
                        />
                      )}
                    />
                    <IconButton
                      aria-label={`Remove source ${index + 1}`}
                      onClick={() => removeRuleBindingRow('source_bindings', binding.id)}
                      disabled={!canManage || saving}
                      sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="subtitle2">Target field(s)</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use one row per destination binding. Leave Type empty if it does not add useful context.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => addRuleBindingRow('target_bindings')}
                    disabled={!canManage || saving}
                  >
                    Add target
                  </Button>
                </Stack>
                {ruleEditor.form.target_bindings.map((binding, index) => (
                  <Stack
                    key={binding.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                  >
                    <TextField
                      label={`Target ${index + 1}`}
                      value={binding.path}
                      onChange={(event) => updateRuleBindingRow('target_bindings', binding.id, { path: event.target.value })}
                      placeholder="destination.customerId"
                      fullWidth
                    />
                    <Autocomplete
                      freeSolo
                      options={BINDING_TYPE_OPTIONS}
                      value={binding.data_type}
                      onChange={(_, value) => updateRuleBindingRow('target_bindings', binding.id, { data_type: value || '' })}
                      onInputChange={(_, value) => updateRuleBindingRow('target_bindings', binding.id, { data_type: value || '' })}
                      sx={{ minWidth: { sm: 220 } }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Type"
                          placeholder="Select or enter a type"
                        />
                      )}
                    />
                    <IconButton
                      aria-label={`Remove target ${index + 1}`}
                      onClick={() => removeRuleBindingRow('target_bindings', binding.id)}
                      disabled={!canManage || saving}
                      sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <TextField
              select
              label="Operation"
              value={ruleEditor.form.operation_kind_choice}
              onChange={(event) => setRuleEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, operation_kind_choice: event.target.value },
              }))}
              fullWidth
            >
              {OPERATION_KIND_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
              <MenuItem value={OTHER_OPERATION_KIND}>Other</MenuItem>
            </TextField>

            {ruleEditor.form.operation_kind_choice === OTHER_OPERATION_KIND ? (
              <TextField
                label="Other operation"
                value={ruleEditor.form.operation_kind_other}
                onChange={(event) => setRuleEditor((current) => ({
                  ...current,
                  error: null,
                  form: { ...current.form, operation_kind_other: event.target.value },
                }))}
                fullWidth
              />
            ) : null}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Applies to leg"
                value={ruleEditor.form.applies_to_leg_id}
                onChange={(event) => setRuleEditor((current) => ({
                  ...current,
                  error: null,
                  form: { ...current.form, applies_to_leg_id: event.target.value },
                }))}
                fullWidth
              >
                <MenuItem value="">All legs</MenuItem>
                {legs.map((leg) => (
                  <MenuItem key={leg.id} value={leg.id}>
                    {legLabel(leg)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Order"
                value={ruleEditor.form.order_index}
                onChange={(event) => setRuleEditor((current) => ({
                  ...current,
                  error: null,
                  form: { ...current.form, order_index: event.target.value },
                }))}
                type="number"
                inputProps={{ min: 1, step: 1 }}
                fullWidth
              />
            </Stack>

            <TextField
              label="Condition"
              value={ruleEditor.form.condition_text}
              onChange={(event) => setRuleEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, condition_text: event.target.value },
              }))}
              multiline
              minRows={2}
              fullWidth
            />

            <TextField
              label="Business rule"
              value={ruleEditor.form.business_rule_text}
              onChange={(event) => setRuleEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, business_rule_text: event.target.value },
              }))}
              multiline
              minRows={3}
              fullWidth
            />

            <TextField
              label="Middleware / transformation note"
              value={ruleEditor.form.middleware_rule_text}
              onChange={(event) => setRuleEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, middleware_rule_text: event.target.value },
              }))}
              multiline
              minRows={3}
              fullWidth
            />

            <TextField
              label="Remarks"
              value={ruleEditor.form.remarks}
              onChange={(event) => setRuleEditor((current) => ({
                ...current,
                error: null,
                form: { ...current.form, remarks: event.target.value },
              }))}
              multiline
              minRows={3}
              fullWidth
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setRuleEditor(createClosedRuleEditor())}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={() => { void saveRuleEditor(); }}
                disabled={!canManage || saving}
              >
                Save rule
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>
    </Stack>
  );
});
