import { marked } from 'marked';

const HTML_TAG_REGEX = /<\/?(p|h[1-6]|ul|ol|li|blockquote|pre|code|strong|em|a|img|table|thead|tbody|tr|td|th|div|span|br|hr)\b[^>]*>/i;
const MARKDOWN_AUTOLINK_REGEX = /^<https?:\/\/[^>\s]+>$/i;

function isHtmlContent(content: string): boolean {
  const text = String(content || '').trim();
  if (!text) return false;
  if (MARKDOWN_AUTOLINK_REGEX.test(text)) return false;
  return HTML_TAG_REGEX.test(text);
}

export function renderMarkdownToHtml(content: string): string {
  const text = String(content || '').trim();
  if (!text) return '';
  if (isHtmlContent(text)) return text;
  return String(marked.parse(text, { async: false, gfm: true, breaks: true }));
}
