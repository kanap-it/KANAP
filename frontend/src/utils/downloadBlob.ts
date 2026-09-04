export function extractFilenameFromDisposition(contentDisposition: string | undefined): string | null {
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

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
