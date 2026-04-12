import { describe, expect, it } from 'vitest';
import { getMarkdownEditorToolbarConfig } from './markdownEditorToolbarConfig';

describe('markdownEditorToolbarConfig', () => {
  it('returns the simplified toolbar outside Knowledge', () => {
    expect(getMarkdownEditorToolbarConfig(false)).toEqual({
      allowedHeadingLevels: [1, 2, 3],
      strikeThroughOptions: ['Strikethrough'],
      showHighlight: false,
      showEmoji: false,
      showTable: false,
      showAdmonition: false,
      showThematicBreak: false,
    });
  });

  it('returns the full Knowledge toolbar when requested', () => {
    expect(getMarkdownEditorToolbarConfig(true)).toEqual({
      allowedHeadingLevels: [1, 2, 3, 4, 5, 6],
      strikeThroughOptions: ['Strikethrough', 'Sub', 'Sup'],
      showHighlight: true,
      showEmoji: true,
      showTable: true,
      showAdmonition: true,
      showThematicBreak: true,
    });
  });
});
