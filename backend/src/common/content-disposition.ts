/** Build an RFC 5987-compliant Content-Disposition header value. */
export function contentDisposition(filename: string, type: 'attachment' | 'inline' = 'attachment'): string {
  if (!filename) return type;
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"');
  const encoded = encodeURIComponent(filename).replace(/'/g, '%27');
  if (ascii === filename && !filename.includes('"')) {
    return `${type}; filename="${filename}"`;
  }
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
