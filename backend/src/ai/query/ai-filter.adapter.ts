import {
  AiAdaptedFilters,
  AiDateFilterValue,
  AiEntityFilterRegistry,
  AiFilterValue,
  AiNumberFilterValue,
} from './ai-filter.types';

function isNumberFilterValue(value: AiFilterValue): value is AiNumberFilterValue {
  return !!value && typeof value === 'object' && !Array.isArray(value) && typeof (value as any).op === 'string' && typeof (value as any).value === 'number';
}

function isDateFilterValue(value: AiFilterValue): value is AiDateFilterValue {
  return !!value && typeof value === 'object' && !Array.isArray(value) && typeof (value as any).op === 'string' && typeof (value as any).value === 'string';
}

function adaptNumberFilter(raw: AiNumberFilterValue) {
  switch (raw.op) {
    case 'eq':
      return { filterType: 'number', type: 'equals', filter: raw.value };
    case 'gt':
      return { filterType: 'number', type: 'greaterThan', filter: raw.value };
    case 'gte':
      return { filterType: 'number', type: 'greaterThanOrEqual', filter: raw.value };
    case 'lt':
      return { filterType: 'number', type: 'lessThan', filter: raw.value };
    case 'lte':
      return { filterType: 'number', type: 'lessThanOrEqual', filter: raw.value };
    case 'between':
      if (typeof raw.valueTo !== 'number') return null;
      return {
        filterType: 'number',
        type: 'inRange',
        filter: raw.value,
        filterTo: raw.valueTo,
      };
    default:
      return null;
  }
}

function adaptDateFilter(raw: AiDateFilterValue) {
  switch (raw.op) {
    case 'eq':
      return { filterType: 'date', type: 'equals', dateFrom: raw.value };
    case 'before':
      return { filterType: 'date', type: 'lessThan', dateFrom: raw.value };
    case 'after':
      return { filterType: 'date', type: 'greaterThan', dateFrom: raw.value };
    case 'between':
      if (!raw.valueTo) return null;
      return {
        filterType: 'date',
        type: 'inRange',
        dateFrom: raw.value,
        dateTo: raw.valueTo,
      };
    default:
      return null;
  }
}

export function adaptFilters(
  registry: AiEntityFilterRegistry,
  aiFilters?: Record<string, AiFilterValue>,
): AiAdaptedFilters {
  const filters: Record<string, any> = {};
  const applied = new Set<string>();
  const ignored = new Set<string>();

  if (!aiFilters || typeof aiFilters !== 'object') {
    return { filters, applied: [], ignored: [] };
  }

  for (const [fieldName, rawValue] of Object.entries(aiFilters)) {
    const field = registry.fields[fieldName];
    if (!field) {
      ignored.add(fieldName);
      continue;
    }

    let adapted: any = null;
    if (field.type === 'set') {
      const values = Array.isArray(rawValue)
        ? rawValue.filter((value) => value === null || typeof value === 'string')
        : typeof rawValue === 'string'
          ? [rawValue]
          : [];
      if (values.length > 0) {
        const allowed = Array.isArray(field.values) ? new Set(field.values) : null;
        const filteredValues = allowed
          ? values.filter((value) => allowed.has(value))
          : values;
        if (filteredValues.length > 0) {
          adapted = { filterType: 'set', values: filteredValues };
        }
      }
    } else if (field.type === 'text') {
      if (typeof rawValue === 'string' && rawValue.trim()) {
        adapted = { filterType: 'text', type: 'contains', filter: rawValue.trim() };
      }
    } else if (field.type === 'number') {
      if (isNumberFilterValue(rawValue)) {
        adapted = adaptNumberFilter(rawValue);
      }
    } else if (field.type === 'date') {
      if (isDateFilterValue(rawValue)) {
        adapted = adaptDateFilter(rawValue);
      }
    }

    if (!adapted) {
      ignored.add(fieldName);
      continue;
    }

    filters[field.grid] = adapted;
    applied.add(fieldName);
  }

  return {
    filters,
    applied: Array.from(applied),
    ignored: Array.from(ignored),
  };
}

export function getAppliedFilterNames(
  registry: AiEntityFilterRegistry,
  aiFilters?: Record<string, AiFilterValue>,
): string[] {
  return adaptFilters(registry, aiFilters).applied;
}
