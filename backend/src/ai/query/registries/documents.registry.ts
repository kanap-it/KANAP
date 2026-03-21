import { AiEntityFilterRegistry } from '../ai-filter.types';

export const documentsRegistry: AiEntityFilterRegistry = {
  entityType: 'documents',
  fields: {
    status: {
      ai: 'status',
      grid: 'status',
      type: 'set',
      description: 'Document status.',
      values: ['draft', 'in_review', 'published', 'archived', 'obsolete'],
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    library: {
      ai: 'library',
      grid: 'library_name',
      type: 'set',
      description: 'Library name.',
      dynamic: true,
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    folder: {
      ai: 'folder',
      grid: 'folder_name',
      type: 'set',
      description: 'Folder name.',
      dynamic: true,
      discoverable: true,
      sortable: false,
      groupable: true,
    },
    type: {
      ai: 'type',
      grid: 'document_type_name',
      type: 'set',
      description: 'Document type name.',
      dynamic: true,
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    owner: {
      ai: 'owner',
      grid: 'primary_owner_name',
      type: 'set',
      description: 'Primary owner display name.',
      dynamic: true,
      discoverable: true,
      sortable: true,
      groupable: true,
    },
    review_due: {
      ai: 'review_due',
      grid: 'review_due_at',
      type: 'date',
      description: 'Review due date.',
      sortable: true,
      groupable: false,
    },
  },
  sortFields: {
    label: 'title',
    status: 'status',
    library: 'library_name',
    type: 'document_type_name',
    owner: 'primary_owner_name',
    review_due: 'review_due_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  defaultSort: {
    field: 'updated_at',
    direction: 'desc',
  },
  aggregate: {
    baseTable: 'documents',
    alias: 'd',
    groupFields: {
      status: { expression: 'd.status' },
      library: {
        expression: 'dl.name',
        joins: [
          `LEFT JOIN document_libraries dl ON dl.id = d.library_id AND dl.tenant_id = d.tenant_id`,
        ],
      },
      folder: {
        expression: 'f.name',
        joins: [
          `LEFT JOIN document_folders f ON f.id = d.folder_id AND f.tenant_id = d.tenant_id`,
        ],
      },
      type: {
        expression: 'dtype.name',
        joins: [
          `LEFT JOIN document_types dtype ON dtype.id = d.document_type_id AND dtype.tenant_id = d.tenant_id`,
        ],
      },
      owner: {
        expression: `(SELECT COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email, c.user_id::text)
          FROM document_contributors c
          LEFT JOIN users u ON u.id = c.user_id AND u.tenant_id = d.tenant_id
          WHERE c.document_id = d.id AND c.role = 'owner' AND c.is_primary = true
          LIMIT 1)`,
      },
    },
  },
};
