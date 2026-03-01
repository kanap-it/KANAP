export function extractInlineImageUrls(content: string | null): string[] {
  if (!content) return [];

  const urls: string[] = [];

  // Markdown may include raw <img ...> tags (e.g., resized images in MDXEditor).
  const htmlRe = /\bsrc\s*=\s*["']([^"']*\/inline(?:\/[^"']*)?)["']/gi;
  let htmlMatch: RegExpExecArray | null;
  while ((htmlMatch = htmlRe.exec(content)) !== null) {
    const raw = (htmlMatch[1] || '').trim();
    if (!raw) continue;
    urls.push(raw);
  }

  // Markdown images: ![alt](url) or ![alt](<url>)
  const mdRe = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdRe.exec(content)) !== null) {
    const raw = (mdMatch[1] || '').trim();
    if (!raw || !raw.includes('/inline')) continue;
    urls.push(raw);
  }

  return [...new Set(urls)];
}
