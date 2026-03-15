export const IMPORTABLE_FORMATS = ['docx'] as const;

export type ImportableFormat = (typeof IMPORTABLE_FORMATS)[number];

export const IMPORTABLE_MIME_TYPES: Record<string, ImportableFormat> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
