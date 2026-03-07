export const DOCUMENT_STATUSES = [
  'draft',
  'in_review',
  'published',
  'archived',
  'obsolete',
] as const;

export type DocumentStatus = typeof DOCUMENT_STATUSES[number];

export function isDocumentStatus(value: unknown): value is DocumentStatus {
  return typeof value === 'string' && (DOCUMENT_STATUSES as readonly string[]).includes(value);
}
