export type IntegratedDocumentSourceEntityType =
  | 'requests'
  | 'projects'
  | 'interfaces'
  | 'applications'
  | 'assets';

export type ManagedDocsFolderSystemKey =
  | 'integrated_requests'
  | 'integrated_projects'
  | 'integrated_interfaces'
  | 'integrated_applications'
  | 'integrated_assets';

export type IntegratedDocumentSlotKey = 'purpose' | 'risks_mitigations' | 'specification';

export const MANAGED_DOCS_LIBRARY_NAME = 'Managed Docs';
export const MANAGED_DOCS_LIBRARY_SLUG = 'managed-docs';
export const MANAGED_DOCS_LIBRARY_DISPLAY_ORDER = 2;

export const MANAGED_DOCS_FOLDER_DEFINITIONS: Array<{
  sourceEntityType: IntegratedDocumentSourceEntityType;
  systemKey: ManagedDocsFolderSystemKey;
  name: string;
  displayOrder: number;
}> = [
  { sourceEntityType: 'requests', systemKey: 'integrated_requests', name: 'Requests', displayOrder: 0 },
  { sourceEntityType: 'projects', systemKey: 'integrated_projects', name: 'Projects', displayOrder: 1 },
  { sourceEntityType: 'interfaces', systemKey: 'integrated_interfaces', name: 'Interfaces', displayOrder: 2 },
  { sourceEntityType: 'applications', systemKey: 'integrated_applications', name: 'Applications', displayOrder: 3 },
  { sourceEntityType: 'assets', systemKey: 'integrated_assets', name: 'Assets', displayOrder: 4 },
];

export const INTEGRATED_DOCUMENT_SLOT_DEFINITIONS: Array<{
  sourceEntityType: Extract<IntegratedDocumentSourceEntityType, 'requests' | 'projects' | 'interfaces'>;
  slotKey: IntegratedDocumentSlotKey;
  displayName: string;
  folderSystemKey: ManagedDocsFolderSystemKey;
  documentTypeName: string;
  documentTypeSystemKey: string;
  documentTypeDescription: string;
  templateTitle: string;
  templateSummary: string;
  templateContentMarkdown?: string;
}> = [
  {
    sourceEntityType: 'requests',
    slotKey: 'purpose',
    displayName: 'Purpose',
    folderSystemKey: 'integrated_requests',
    documentTypeName: 'Request Purpose',
    documentTypeSystemKey: 'integrated_request_purpose',
    documentTypeDescription: 'Managed document type for request purpose integrated docs',
    templateTitle: 'Request Purpose Template',
    templateSummary: 'Managed template for request purpose integrated documents',
  },
  {
    sourceEntityType: 'requests',
    slotKey: 'risks_mitigations',
    displayName: 'Risks & Mitigations',
    folderSystemKey: 'integrated_requests',
    documentTypeName: 'Request Risks & Mitigations',
    documentTypeSystemKey: 'integrated_request_risks_mitigations',
    documentTypeDescription: 'Managed document type for request risks and mitigations integrated docs',
    templateTitle: 'Request Risks & Mitigations Template',
    templateSummary: 'Managed template for request risks and mitigations integrated documents',
  },
  {
    sourceEntityType: 'projects',
    slotKey: 'purpose',
    displayName: 'Purpose',
    folderSystemKey: 'integrated_projects',
    documentTypeName: 'Project Purpose',
    documentTypeSystemKey: 'integrated_project_purpose',
    documentTypeDescription: 'Managed document type for project purpose integrated docs',
    templateTitle: 'Project Purpose Template',
    templateSummary: 'Managed template for project purpose integrated documents',
  },
  {
    sourceEntityType: 'interfaces',
    slotKey: 'specification',
    displayName: 'Specification',
    folderSystemKey: 'integrated_interfaces',
    documentTypeName: 'Interface Specification',
    documentTypeSystemKey: 'integrated_interface_specification',
    documentTypeDescription: 'Managed document type for interface specification integrated docs',
    templateTitle: 'Interface Specification Template',
    templateSummary: 'Managed template for interface specification integrated documents',
    templateContentMarkdown: [
      '## Business Purpose & Overview',
      '',
      '## Business Objects',
      '',
      '## Use Cases',
      '',
      '## Business Rules',
      '',
      '## Impact of Failure',
      '',
      '## Transformations Overview',
      '',
      '## Error Handling',
      '',
      '## Data & Compliance Notes',
      '',
    ].join('\n'),
  },
];

export function getIntegratedDocumentSlotKey(
  sourceEntityType: Extract<IntegratedDocumentSourceEntityType, 'requests' | 'projects' | 'interfaces'>,
  slotKey: IntegratedDocumentSlotKey,
): string {
  return `${sourceEntityType}:${slotKey}`;
}
