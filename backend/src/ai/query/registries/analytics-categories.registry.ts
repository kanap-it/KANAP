import { AiEntityFilterRegistry } from '../ai-filter.types';

export const analyticsCategoriesRegistry: AiEntityFilterRegistry = {
  entityType: 'analytics_categories',
  fields: {
    status: {
      ai: 'status',
      grid: 'status',
      type: 'set',
      description: 'Analytics category lifecycle status.',
      values: ['enabled', 'disabled'],
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    name: {
      ai: 'name',
      grid: 'name',
      type: 'text',
      description: 'Analytics category name.',
      sortable: true,
      groupable: true,
    },
  },
  sortFields: {
    label: 'name',
    name: 'name',
    status: 'status',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  aggregate: {
    baseTable: 'analytics_categories',
    alias: 'ac',
    groupFields: {
      status: { expression: 'ac.status' },
      name: { expression: 'ac.name' },
    },
  },
};
