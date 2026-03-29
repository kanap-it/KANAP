type FenceState = {
  marker: '`' | '~';
  length: number;
};

const BLOCK_FENCE_OPEN_REGEX = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const CONTAINER_PREFIX_REGEX = /^\s*(?:>|\d+[.)]\s|[-+*]\s)/;

function isFenceClose(line: string, fence: FenceState): boolean {
  const escapedMarker = fence.marker === '`' ? '\\`' : '~';
  return new RegExp(`^ {0,3}${escapedMarker}{${fence.length},}\\s*$`).test(line);
}

function getInlineFenceMatch(line: string): RegExpExecArray | null {
  if (CONTAINER_PREFIX_REGEX.test(line)) return null;
  return /(`{3,}|~{3,})[^\n]*$/.exec(line);
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

    const blockFenceMatch = line.match(BLOCK_FENCE_OPEN_REGEX);
    if (blockFenceMatch) {
      normalized.push(line);
      activeFence = {
        marker: blockFenceMatch[1][0] as '`' | '~',
        length: blockFenceMatch[1].length,
      };
      continue;
    }

    const inlineFenceMatch = getInlineFenceMatch(line);
    const leadingWhitespaceLength = line.match(/^\s*/)?.[0].length ?? 0;
    if (!inlineFenceMatch || inlineFenceMatch.index <= leadingWhitespaceLength) {
      normalized.push(line);
      continue;
    }

    const beforeFence = line.slice(0, inlineFenceMatch.index).replace(/\s+$/, '');
    if (!/\S/.test(beforeFence)) {
      normalized.push(line);
      continue;
    }

    const openerLine = line.slice(inlineFenceMatch.index).trimStart();
    const openingMarker = openerLine.match(/^(`{3,}|~{3,})/);
    if (!openingMarker) {
      normalized.push(line);
      continue;
    }

    normalized.push(beforeFence);
    normalized.push(openerLine);
    activeFence = {
      marker: openingMarker[1][0] as '`' | '~',
      length: openingMarker[1].length,
    };
    changed = true;
  }

  return changed ? normalized.join('\n') : value;
}

export function normalizeMarkdownForRichTextEditor(markdown: string): string {
  return normalizeInlineFencedCodeBlocks(markdown);
}
