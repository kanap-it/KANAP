import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

turndown.addRule('taskListItem', {
  filter: (node: Node) => {
    return (
      node.nodeName === 'LI'
      && (node as HTMLElement).getAttribute('data-type') === 'taskItem'
    );
  },
  replacement: (content: string, node: Node) => {
    const checked = (node as HTMLElement).getAttribute('data-checked') === 'true';
    const normalized = content.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return `\n- [${checked ? 'x' : ' '}]\n`;
    }
    return `\n- [${checked ? 'x' : ' '}] ${normalized}\n`;
  },
});

turndown.addRule('dropMark', {
  filter: 'mark',
  replacement: (content: string) => content,
});

turndown.addRule('dropUnderline', {
  filter: 'u',
  replacement: (content: string) => content,
});

turndown.addRule('imageWithSrc', {
  filter: 'img',
  replacement: (_content: string, node: Node) => {
    const element = node as HTMLElement;
    const src = element.getAttribute('src') || '';
    if (!src) return '';
    const alt = (element.getAttribute('alt') || '').replace(/\]/g, '\\]');
    return `![${alt}](${src})`;
  },
});

export function isHtml(content: string): boolean {
  const text = String(content || '').trim();
  if (!text) return false;
  if (/^<https?:\/\/[^>\s]+>$/i.test(text)) return false;
  return /<\/?(p|h[1-6]|ul|ol|li|blockquote|pre|code|strong|em|a|img|table|thead|tbody|tr|td|th|div|span|br|hr)\b[^>]*>/i.test(text);
}

export function htmlToMarkdown(content: string): string {
  if (!content) return '';
  return turndown.turndown(content).trim();
}
