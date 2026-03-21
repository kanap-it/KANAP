import { AiEntityFilterRegistry } from '../ai-filter.types';

export const requestsRegistry: AiEntityFilterRegistry = {
  entityType: 'requests',
  fields: {
    status: {
      ai: 'status',
      grid: 'status',
      type: 'set',
      description: 'Request status.',
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
    requestor: {
      ai: 'requestor',
      grid: 'requestor_name',
      type: 'set',
      description: 'Requestor display name.',
      dynamic: true,
      discoverable: true,
      sortable: false,
      groupable: true,
    },
    target_date: {
      ai: 'target_date',
      grid: 'target_delivery_date',
      type: 'date',
      description: 'Target delivery date.',
      sortable: true,
      groupable: false,
    },
  },
  sortFields: {
    label: 'name',
    status: 'status',
    target_date: 'target_delivery_date',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  defaultSort: {
    field: 'created_at',
    direction: 'desc',
  },
  aggregate: {
    baseTable: 'portfolio_requests',
    alias: 'r',
    groupFields: {
      status: { expression: 'r.status' },
      category: {
        expression: 'c.name',
        joins: [
          `LEFT JOIN portfolio_categories c ON c.id = r.category_id AND c.tenant_id = r.tenant_id`,
        ],
      },
      stream: {
        expression: 's.name',
        joins: [
          `LEFT JOIN portfolio_streams s ON s.id = r.stream_id AND s.tenant_id = r.tenant_id`,
        ],
      },
      company: {
        expression: 'co.name',
        joins: [
          `LEFT JOIN companies co ON co.id = r.company_id AND co.tenant_id = r.tenant_id`,
        ],
      },
      requestor: {
        expression: `COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email)`,
        joins: [
          `LEFT JOIN users u ON u.id = r.requestor_id AND u.tenant_id = r.tenant_id`,
        ],
      },
    },
  },
};
