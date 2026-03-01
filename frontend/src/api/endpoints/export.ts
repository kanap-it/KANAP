import { api } from '../client';

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

function extractFilenameFromDisposition(contentDisposition: string | undefined): string | null {
  const raw = String(contentDisposition || '');
  if (!raw) return null;

  const utf8Match = raw.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // fall through to filename=
    }
  }

  const asciiMatch = raw.match(/filename="([^"]+)"/i) || raw.match(/filename=([^;]+)/i);
  if (!asciiMatch) return null;
  return asciiMatch[1].trim().replace(/^"|"$/g, '');
}
