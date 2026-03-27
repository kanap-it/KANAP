import { AiEntityFilterRegistry } from '../ai-filter.types';

export const departmentsRegistry: AiEntityFilterRegistry = {
  entityType: 'departments',
  fields: {
    status: {
      ai: 'status',
      grid: 'status',
      type: 'set',
      description: 'Department lifecycle status.',
      values: ['enabled', 'disabled'],
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    company: {
      ai: 'company',
      grid: 'company_name',
      type: 'set',
      description: 'Parent company name.',
      dynamic: true,
      discoverable: true,
      sortable: true,
      groupable: true,
    },
  },
  sortFields: {
    label: 'name',
    status: 'status',
    company: 'company_name',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  aggregate: {
    baseTable: 'departments',
    alias: 'd',
    groupFields: {
      status: { expression: 'd.status' },
      company: {
        expression: 'c.name',
        joins: [
          `LEFT JOIN companies c ON c.id = d.company_id AND c.tenant_id = d.tenant_id`,
        ],
      },
    },
  },
};
