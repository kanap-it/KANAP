import { api } from '../client';
import { extractFilenameFromDisposition } from '../../utils/downloadBlob';

export type DocumentExportFormat = 'pdf' | 'docx' | 'odt';

export interface ExportDocumentInput {
  content: string;
  format: DocumentExportFormat;
  title?: string;
}

export interface ExportDocumentResult {
  blob: Blob;
  filename: string | null;
}

export async function exportDocument(input: ExportDocumentInput): Promise<ExportDocumentResult> {
  const response = await api.getAxiosInstance().post<Blob>('/export', input, {
    responseType: 'blob',
  });

  return {
    blob: response.data,
    filename: extractFilenameFromDisposition(response.headers?.['content-disposition']),
  };
}
