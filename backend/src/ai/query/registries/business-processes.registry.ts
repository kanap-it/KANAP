import { AiEntityFilterRegistry } from '../ai-filter.types';

export const businessProcessesRegistry: AiEntityFilterRegistry = {
  entityType: 'business_processes',
  fields: {
    status: {
      ai: 'status',
      grid: 'status',
      type: 'set',
      description: 'Business process lifecycle status.',
      values: ['enabled', 'disabled'],
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    name: {
      ai: 'name',
      grid: 'name',
      type: 'text',
      description: 'Business process name.',
      sortable: true,
      groupable: true,
    },
    primary_category: {
      ai: 'primary_category',
      grid: 'primary_category_name',
      type: 'set',
      description: 'Primary business process category.',
      dynamic: true,
      discoverable: true,
      sortable: true,
      groupable: true,
    },
  },
  sortFields: {
    label: 'name',
    name: 'name',
    status: 'status',
    primary_category: 'primary_category_name',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  aggregate: {
    baseTable: 'business_processes',
    alias: 'bp',
    groupFields: {
      status: { expression: 'bp.status' },
      name: { expression: 'bp.name' },
      primary_category: {
        expression: 'bpc.name',
        joins: [
          `LEFT JOIN LATERAL (
             SELECT c.name
             FROM business_process_category_links l
             JOIN business_process_categories c ON c.id = l.category_id AND c.tenant_id = bp.tenant_id
             WHERE l.process_id = bp.id AND l.tenant_id = bp.tenant_id
             ORDER BY c.name ASC
             LIMIT 1
           ) bpc ON TRUE`,
        ],
      },
    },
  },
};
