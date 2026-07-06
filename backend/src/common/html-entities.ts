export function decodeNumericHtmlEntities(value: string): string {
  return String(value ?? '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (match, entity) => {
      const raw = String(entity || '');
      const codePoint = raw.toLowerCase().startsWith('x')
        ? Number.parseInt(raw.slice(1), 16)
        : Number.parseInt(raw, 10);
      if (
        !Number.isFinite(codePoint)
        || codePoint === 0
        || codePoint > 0x10FFFF
        || (codePoint >= 0xD800 && codePoint <= 0xDFFF)
      ) {
        return match;
      }
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    })
    .replace(/\u00a0/g, ' ');
}
