import { AiEntityFilterRegistry } from '../ai-filter.types';

export const projectsRegistry: AiEntityFilterRegistry = {
  entityType: 'projects',
  fields: {
    status: {
      ai: 'status',
      grid: 'status',
      type: 'set',
      description: 'Project status.',
      dynamic: true,
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    category: {
      ai: 'category',
      grid: 'category_name',
      type: 'set',
      description: 'Category name.',
      dynamic: true,
      discoverable: true,
      sortable: false,
      groupable: true,
    },
    stream: {
      ai: 'stream',
      grid: 'stream_name',
      type: 'set',
      description: 'Stream name.',
      dynamic: true,
      discoverable: true,
      sortable: false,
      groupable: true,
    },
    company: {
      ai: 'company',
      grid: 'company_name',
      type: 'set',
      description: 'Company name.',
      dynamic: true,
      discoverable: true,
      sortable: false,
      groupable: true,
    },
    origin: {
      ai: 'origin',
      grid: 'origin',
      type: 'set',
      description: 'Project origin.',
      dynamic: true,
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    planned_start: {
      ai: 'planned_start',
      grid: 'planned_start',
      type: 'date',
      description: 'Planned start date.',
      sortable: true,
      groupable: false,
    },
    planned_end: {
      ai: 'planned_end',
      grid: 'planned_end',
      type: 'date',
      description: 'Planned end date.',
      sortable: true,
      groupable: false,
    },
  },
  sortFields: {
    label: 'name',
    status: 'status',
    origin: 'origin',
    planned_start: 'planned_start',
    planned_end: 'planned_end',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  defaultSort: {
    field: 'created_at',
    direction: 'desc',
  },
  aggregate: {
    baseTable: 'portfolio_projects',
    alias: 'p',
    groupFields: {
      status: { expression: 'p.status' },
      category: {
        expression: 'cat.name',
        joins: [
          `LEFT JOIN portfolio_categories cat ON cat.id = p.category_id AND cat.tenant_id = p.tenant_id`,
        ],
      },
      stream: {
        expression: 's.name',
        joins: [
          `LEFT JOIN portfolio_streams s ON s.id = p.stream_id AND s.tenant_id = p.tenant_id`,
        ],
      },
      company: {
        expression: 'c.name',
        joins: [
          `LEFT JOIN companies c ON c.id = p.company_id AND c.tenant_id = p.tenant_id`,
        ],
      },
      origin: { expression: 'p.origin' },
    },
  },
};
