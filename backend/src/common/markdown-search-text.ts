export function markdownToSearchText(value: string | null | undefined): string {
  const text = String(value || '');

  return text
    .replace(/```[^\n`]*\n?([\s\S]*?)```/g, (_match, code: string) => ` ${code || ''} `)
    .replace(/`([^`]*)`/g, (_match, code: string) => ` ${code || ''} `)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, alt: string) => ` ${alt || ''} `)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, (_match, label: string) => ` ${label || ''} `)
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[*_~]+/g, '')
    .replace(/[>#|]+/g, ' ')
    .replace(/-+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
