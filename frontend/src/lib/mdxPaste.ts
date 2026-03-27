const FENCED_CODE_BLOCK_REGEX = /^(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\1\s*$/gm;
const URI_AUTOLINK_REGEX = /^<([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s>]+)>/;
const EMAIL_AUTOLINK_REGEX = /^<([^\s>@]+@[^\s>]+\.[^\s>]+)>/;

function isEscaped(text: string, index: number): boolean {
  let backslashCount = 0;
  for (let current = index - 1; current >= 0 && text[current] === '\\'; current -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function stashInlineCodeSpans(text: string): { text: string; spans: string[] } {
  const spans: string[] = [];
  let result = '';

  for (let index = 0; index < text.length;) {
    if (text[index] !== '`') {
      result += text[index];
      index += 1;
      continue;
    }

    let fenceEnd = index;
    while (text[fenceEnd] === '`') {
      fenceEnd += 1;
    }
    const fence = text.slice(index, fenceEnd);
    const closingIndex = text.indexOf(fence, fenceEnd);

    if (closingIndex < 0) {
      result += text[index];
      index += 1;
      continue;
    }

    const token = `\x00IC${spans.length}\x00`;
    spans.push(text.slice(index, closingIndex + fence.length));
    result += token;
    index = closingIndex + fence.length;
  }

  return { text: result, spans };
}

function restorePlaceholders(text: string, tokens: string[], prefix: 'CB' | 'IC'): string {
  return text.replace(new RegExp(`\\x00${prefix}(\\d+)\\x00`, 'g'), (_match, index) => {
    return tokens[Number(index)] || '';
  });
}

function shouldSkipAngleBracketSanitization(text: string, index: number): boolean {
  if (isEscaped(text, index)) {
    return true;
  }

  return index > 0 && text[index - 1] === '(';
}

export function hasPotentiallyUnsafeMdxPaste(text: string): boolean {
  return /<\S/.test(String(text || ''));
}

export function sanitizeMarkdownForMdxPaste(markdown: string): string {
  const fencedCodeBlocks: string[] = [];
  const withoutFences = String(markdown || '').replace(FENCED_CODE_BLOCK_REGEX, (match) => {
    const token = `\x00CB${fencedCodeBlocks.length}\x00`;
    fencedCodeBlocks.push(match);
    return token;
  });
  const { text: sanitizedBase, spans: inlineCodeSpans } = stashInlineCodeSpans(withoutFences);

  let result = '';
  for (let index = 0; index < sanitizedBase.length;) {
    const current = sanitizedBase[index];
    if (current !== '<' || shouldSkipAngleBracketSanitization(sanitizedBase, index)) {
      result += current;
      index += 1;
      continue;
    }

    const remaining = sanitizedBase.slice(index);
    const uriMatch = remaining.match(URI_AUTOLINK_REGEX);
    if (uriMatch) {
      const target = uriMatch[1];
      result += `[${target}](${target})`;
      index += uriMatch[0].length;
      continue;
    }

    const emailMatch = remaining.match(EMAIL_AUTOLINK_REGEX);
    if (emailMatch) {
      const email = emailMatch[1];
      result += `[${email}](mailto:${email})`;
      index += emailMatch[0].length;
      continue;
    }

    if (sanitizedBase[index + 1] && !/\s/.test(sanitizedBase[index + 1])) {
      result += '\\<';
      index += 1;
      continue;
    }

    result += current;
    index += 1;
  }

  return restorePlaceholders(restorePlaceholders(result, inlineCodeSpans, 'IC'), fencedCodeBlocks, 'CB');
}
