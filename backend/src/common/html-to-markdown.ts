import TurndownService = require('turndown');

const HTML_TAG_REGEX = /<\/?(p|h[1-6]|ul|ol|li|blockquote|pre|code|strong|em|a|img|table|thead|tbody|tr|td|th|div|span|br|hr|mark|u)\b[^>]*>/i;
const MARKDOWN_AUTOLINK_REGEX = /^<https?:\/\/[^>\s]+>$/i;

export function isHtmlContent(content: string): boolean {
  const text = String(content || '').trim();
  if (!text) return false;
  if (MARKDOWN_AUTOLINK_REGEX.test(text)) return false;
  return HTML_TAG_REGEX.test(text);
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

turndown.addRule('taskListItem', {
  filter: (node: any) => node?.nodeName === 'LI' && node?.getAttribute?.('data-type') === 'taskItem',
  replacement: (content: string, node: any) => {
    const checked = node?.getAttribute?.('data-checked') === 'true';
    const text = String(content || '').trim();
    return `- [${checked ? 'x' : ' '}] ${text}\n`;
  },
});

// Markdown has no native underline/highlight syntax in our target format.
turndown.addRule('dropMarkFormatting', {
  filter: 'mark',
  replacement: (content: string) => content,
});

turndown.addRule('dropUnderlineFormatting', {
  filter: 'u',
  replacement: (content: string) => content,
});

export function htmlToMarkdown(content: string): string {
  const text = String(content || '').trim();
  if (!text) return '';
  if (!isHtmlContent(text)) return text;
  return turndown.turndown(text);
}
