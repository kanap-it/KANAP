import { AiEntitySummaryDto } from '../ai.types';

export type AiFilterFieldType = 'set' | 'text' | 'number' | 'date';
export type AiQueryEntityType =
  | 'applications'
  | 'assets'
  | 'projects'
  | 'requests'
  | 'tasks'
  | 'documents';

export type AiSetFilterValue = Array<string | null>;
export type AiTextFilterValue = string;
export type AiNumberFilterValue = {
  op: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: number;
  valueTo?: number;
};
export type AiDateFilterValue = {
  op: 'eq' | 'before' | 'after' | 'between';
  value: string;
  valueTo?: string;
};
export type AiFilterValue =
  | AiSetFilterValue
  | AiTextFilterValue
  | AiNumberFilterValue
  | AiDateFilterValue;

export type AiFilterFieldDef = {
  ai: string;
  grid: string;
  type: AiFilterFieldType;
  description: string;
  values?: Array<string | null>;
  dynamic?: boolean;
  discoverable?: boolean;
  sortable?: boolean;
  groupable?: boolean;
};

export type AiAggregateGroupDef = {
  expression: string;
  joins?: string[];
};

export type AiAggregateConfig = {
  baseTable: string;
  alias: string;
  idColumn?: string;
  groupFields: Record<string, AiAggregateGroupDef>;
};

export type AiEntityFilterRegistry = {
  entityType: AiQueryEntityType;
  fields: Record<string, AiFilterFieldDef>;
  sortFields: Record<string, string>;
  defaultSort: {
    field: string;
    direction: 'asc' | 'desc';
  };
  aggregate: AiAggregateConfig;
};

export type AiAdaptedFilters = {
  filters: Record<string, any>;
  applied: string[];
  ignored: string[];
};

export type AiQueryResult = {
  items: AiEntitySummaryDto[];
  total: number;
  filters_applied: string[];
  filters_ignored: string[];
};

export type AiAggregateResult = {
  group_by: string;
  groups: Array<{ key: string | null; count: number }>;
  total: number;
  filters_applied: string[];
  filters_ignored: string[];
};

export type AiFilterValuesResult = {
  values: Record<string, Array<string | boolean | null>>;
  fields_ignored: string[];
};
