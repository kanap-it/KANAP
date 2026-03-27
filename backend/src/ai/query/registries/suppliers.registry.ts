import { AiEntityFilterRegistry } from '../ai-filter.types';

export const suppliersRegistry: AiEntityFilterRegistry = {
  entityType: 'suppliers',
  fields: {
    status: {
      ai: 'status',
      grid: 'status',
      type: 'set',
      description: 'Supplier lifecycle status.',
      values: ['enabled', 'disabled'],
      discoverable: true,
      sortable: true,
      groupable: true,
    },
  },
  sortFields: {
    label: 'name',
    status: 'status',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  aggregate: {
    baseTable: 'suppliers',
    alias: 's',
    groupFields: {
      status: { expression: 's.status' },
    },
  },
};
