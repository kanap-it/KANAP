import { marked } from 'marked';

export function renderMarkdownToHtml(content: string): string {
  const text = String(content || '').trim();
  if (!text) return '';
  return String(marked.parse(text, { async: false, gfm: true, breaks: true }));
}
