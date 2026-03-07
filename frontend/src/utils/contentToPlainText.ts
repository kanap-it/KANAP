const MARKDOWN_IMAGE_REGEX = /!\[[^\]]*]\((?:[^()\n]|\([^)\n]*\))*\)/;
const HTML_IMAGE_REGEX = /<img\b[^>]*\bsrc\s*=\s*(['"]?)[^'">\s]+\1[^>]*>/i;

export function contentToPlainText(value: string): string {
  if (!value) return '';

  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^[-+*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasRenderableContent(value: string): boolean {
  if (!value) return false;
  if (contentToPlainText(value).length > 0) return true;
  return MARKDOWN_IMAGE_REGEX.test(value) || HTML_IMAGE_REGEX.test(value);
}
