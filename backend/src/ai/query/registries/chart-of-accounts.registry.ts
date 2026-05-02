import { AiEntityFilterRegistry } from '../ai-filter.types';

export const chartOfAccountsRegistry: AiEntityFilterRegistry = {
  entityType: 'chart_of_accounts',
  fields: {
    code: {
      ai: 'code',
      grid: 'code',
      type: 'text',
      description: 'Chart of accounts code.',
      sortable: true,
      groupable: true,
    },
    country_iso: {
      ai: 'country_iso',
      grid: 'country_iso',
      type: 'set',
      description: 'Country code for country-scoped charts of accounts.',
      dynamic: true,
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    scope: {
      ai: 'scope',
      grid: 'scope',
      type: 'set',
      description: 'Chart of accounts scope.',
      values: ['GLOBAL', 'COUNTRY'],
      discoverable: true,
      sortable: true,
      groupable: true,
    },
  },
  sortFields: {
    label: 'name',
    code: 'code',
    country_iso: 'country_iso',
    scope: 'scope',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  defaultSort: {
    field: 'code',
    direction: 'asc',
  },
  aggregate: {
    baseTable: 'chart_of_accounts',
    alias: 'coa',
    groupFields: {
      code: { expression: 'coa.code' },
      country_iso: { expression: 'coa.country_iso' },
      scope: { expression: 'coa.scope' },
    },
  },
};
