import type { AxiosRequestConfig } from '../client';
import { api } from '../client';

export interface ImportDocumentResult {
  markdown: string;
  warnings: string[];
}

export async function importDocument(
  endpoint: string,
  file: File,
  config?: AxiosRequestConfig,
): Promise<ImportDocumentResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.getAxiosInstance().post<ImportDocumentResult>(endpoint, formData, config);
  return response.data;
}
