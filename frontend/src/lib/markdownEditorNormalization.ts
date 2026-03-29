type FenceState = {
  marker: '`' | '~';
  length: number;
  blockquotePrefix: string;
};

const BLOCK_FENCE_OPEN_REGEX = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const BLOCKQUOTE_PREFIX_REGEX = /^(\s*(?:>\s*)+)/;
const LIST_CONTAINER_PREFIX_REGEX = /^\s*(?:\d+[.)]\s|[-+*]\s)/;

function splitBlockquotePrefix(line: string): { blockquotePrefix: string; content: string } {
  const match = line.match(BLOCKQUOTE_PREFIX_REGEX);
  if (!match) {
    return { blockquotePrefix: '', content: line };
  }

  return {
    blockquotePrefix: match[1],
    content: line.slice(match[1].length),
  };
}

function composeLine(blockquotePrefix: string, content: string): string {
  return `${blockquotePrefix}${content}`;
}

function isFenceClose(line: string, fence: FenceState): boolean {
  const { blockquotePrefix, content } = splitBlockquotePrefix(line);
  const candidate = fence.blockquotePrefix && blockquotePrefix === fence.blockquotePrefix
    ? content
    : line;
  const escapedMarker = fence.marker === '`' ? '\\`' : '~';
  return new RegExp(`^ {0,3}${escapedMarker}{${fence.length},}\\s*$`).test(candidate);
}

function getInlineFenceMatch(content: string): RegExpExecArray | null {
  if (LIST_CONTAINER_PREFIX_REGEX.test(content)) return null;
  return /(`{3,}|~{3,})[^\n]*$/.exec(content);
}

export function normalizeInlineFencedCodeBlocks(markdown: string): string {
  const value = String(markdown || '');
  if (!value.includes('```') && !value.includes('~~~')) {
    return value;
  }

  const lines = value.split(/\r?\n/);
  const normalized: string[] = [];
  let activeFence: FenceState | null = null;
  let changed = false;

  for (const line of lines) {
    if (activeFence) {
      normalized.push(line);
      if (isFenceClose(line, activeFence)) {
        activeFence = null;
      }
      continue;
    }

    const { blockquotePrefix, content } = splitBlockquotePrefix(line);
    const blockFenceMatch = content.match(BLOCK_FENCE_OPEN_REGEX);
    if (blockFenceMatch) {
      normalized.push(line);
      activeFence = {
        marker: blockFenceMatch[1][0] as '`' | '~',
        length: blockFenceMatch[1].length,
        blockquotePrefix,
      };
      continue;
    }

    const inlineFenceMatch = getInlineFenceMatch(content);
    const leadingWhitespaceLength = content.match(/^\s*/)?.[0].length ?? 0;
    if (!inlineFenceMatch || inlineFenceMatch.index <= leadingWhitespaceLength) {
      normalized.push(line);
      continue;
    }

    const beforeFence = content.slice(0, inlineFenceMatch.index).replace(/\s+$/, '');
    if (!/\S/.test(beforeFence)) {
      normalized.push(line);
      continue;
    }

    const openerLine = content.slice(inlineFenceMatch.index).trimStart();
    const openingMarker = openerLine.match(/^(`{3,}|~{3,})/);
    if (!openingMarker) {
      normalized.push(line);
      continue;
    }

    normalized.push(composeLine(blockquotePrefix, beforeFence));
    normalized.push(composeLine(blockquotePrefix, openerLine));
    activeFence = {
      marker: openingMarker[1][0] as '`' | '~',
      length: openingMarker[1].length,
      blockquotePrefix,
    };
    changed = true;
  }

  return changed ? normalized.join('\n') : value;
}

export function normalizeMarkdownForRichTextEditor(markdown: string): string {
  return normalizeInlineFencedCodeBlocks(markdown);
}
